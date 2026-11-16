/** Contract H1 to H6 (contracts/poll-card.md): the browser's Back closes a maximized view, at every width. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { polls } from "./helpers/poll-fixtures.js";
import { LISTING_MAX_AGE_1S, type BrowserPage } from "./helpers/browser.js";
import { cardByTitle, cardGrid, clickIn, isOpen, maximizedGrid, openHome, scrollCalls, seedPoll, setScrollY } from "./helpers/phone-page.js";
import { newestSweep, trendingSweep } from "../src/polls/sweeps.js";

let ctx: TestContext;
let page: BrowserPage | null = null;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1200", ENV_MIN_VOTE_REFRESH_INTERVAL: "2000", ...LISTING_MAX_AGE_1S });
});

afterAll(async () => {
  page?.close();
  await ctx.stop();
});

beforeEach(async () => {
  page?.close();
  page = null;
  await polls(ctx).deleteMany({});
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
});

const sweeps = async () => {
  await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
  await newestSweep(ctx, ctx.config, ctx.newestPublisher);
};

const history = (p: BrowserPage) => p.window.history;
const stepPid = (p: BrowserPage) => (history(p).state as { maximizedPid?: string } | null)?.maximizedPid;

async function back(p: BrowserPage) {
  history(p).back();
  await p.settle(30);
}

async function escape(p: BrowserPage) {
  p.document.dispatchEvent(new p.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await p.settle(30);
}

for (const phoneLayout of [true, false]) {
  describe(`Back and the maximized view, ${phoneLayout ? "in" : "outside"} the phone layout`, () => {
    const open = async (cookie?: string, url?: string) => openHome(ctx, { phoneLayout, cookie, url });

    it("H1: maximizing a card adds one step and leaves the address alone", async () => {
      const poll = await seedPoll(ctx, "Stepped", 3);
      await sweeps();
      page = await open();
      const href = page.window.location.href;
      const length = history(page).length;
      await clickIn(page, cardByTitle(page, "Stepped").querySelector(".maximize-btn"));
      expect(isOpen(page)).toBe(true);
      expect(history(page).length).toBe(length + 1);
      expect(stepPid(page)).toBe(poll._id);
      expect(page.window.location.href).toBe(href);
    });

    it("H2: the browser's Back closes the view and returns the list to where it was", async () => {
      await seedPoll(ctx, "Returned", 3);
      await sweeps();
      page = await open();
      const href = page.window.location.href;
      setScrollY(page, 300);
      await clickIn(page, cardByTitle(page, "Returned").querySelector(".maximize-btn"));
      await back(page);
      expect(isOpen(page)).toBe(false);
      expect(cardGrid(page, "trending").hidden).toBe(false);
      expect(scrollCalls(page)[scrollCalls(page).length - 1]).toBe(300);
      expect(stepPid(page)).toBeUndefined();
      expect(page.window.location.href).toBe(href);
      expect(page.document.activeElement).toBe(cardByTitle(page, "Returned").querySelector(".card-front .maximize-btn"));
    });

    const closers: Array<[string, (p: BrowserPage) => Promise<void>]> = [
      ["the Back arrow", (p) => clickIn(p, p.document.querySelector("#maximizedBack .maximized-back"))],
      ["Minimize", (p) => clickIn(p, maximizedGrid(p, "trending")!.querySelector(".card-front .maximize-btn"))],
      ["Escape", escape],
      ["the active tab", (p) => p.click('.tab[data-tab="trending"]')]
    ];
    for (const [name, close] of closers) {
      it(`H3: ${name} closes the view and leaves no step behind`, async () => {
        await seedPoll(ctx, "Closed", 3);
        await sweeps();
        page = await open();
        const length = history(page).length;
        await clickIn(page, cardByTitle(page, "Closed").querySelector(".maximize-btn"));
        await close(page);
        await page.settle(30);
        expect(isOpen(page)).toBe(false);
        expect(cardGrid(page, "trending").hidden).toBe(false);
        expect(stepPid(page)).toBeUndefined();

        await back(page);
        expect(isOpen(page)).toBe(false);

        await clickIn(page, cardByTitle(page, "Closed").querySelector(".maximize-btn"));
        expect(history(page).length).toBe(length + 1);
      });
    }

    it("H4: choosing another tab closes the view, and Back neither reopens it nor loses the tab's address", async () => {
      await seedPoll(ctx, "Left", 3);
      await sweeps();
      page = await open();
      await clickIn(page, cardByTitle(page, "Left").querySelector(".maximize-btn"));
      await page.click('.tab[data-tab="newest"]');
      await page.settle(30);
      expect(isOpen(page)).toBe(false);
      expect(stepPid(page)).toBeUndefined();
      expect(page.window.location.search).toContain("tab=newest");

      await back(page);
      expect(isOpen(page)).toBe(false);
      expect(stepPid(page)).toBeUndefined();
      expect(page.document.querySelector(".tab.is-active")!.getAttribute("data-tab")).toBe("newest");
    });

    it("H5 and H6: a poll opened from a link adds no step, and its Back arrow closes to the list", async () => {
      const { cookie } = await forgeSession(ctx, `history-link-${phoneLayout}@example.com`);
      const poll = await seedPoll(ctx, "Linked", 3);
      await sweeps();
      page = await open(cookie, `http://localhost/?tab=trending&open=${poll._id}`);
      await page.settle(100);
      expect(isOpen(page)).toBe(true);
      expect(history(page).length).toBe(1);
      expect(stepPid(page)).toBeUndefined();

      await clickIn(page, page.document.querySelector("#maximizedBack .maximized-back"));
      expect(isOpen(page)).toBe(false);
      expect(cardGrid(page, "trending").hidden).toBe(false);
      expect(history(page).length).toBe(1);
    });

    it("clears a view's step that a reload left with no view", async () => {
      await seedPoll(ctx, "Reloaded", 3);
      await sweeps();
      page = await openHome(ctx, {
        phoneLayout,
        beforeScripts: (window) => window.history.replaceState({ maximizedPid: "gone", kept: 1 }, "")
      });
      expect(isOpen(page)).toBe(false);
      expect(history(page).state).toEqual({ kept: 1 });
    });
  });
}
