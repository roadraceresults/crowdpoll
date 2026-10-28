import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import { trendingSweep } from "../src/polls/sweeps.js";

let ctx: TestContext;
let page: BrowserPage | null = null;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1" });
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

type TabsApi = { notice(text: string, ms?: number): void; modal(text: string): void };
const tabsOf = (p: BrowserPage) => (p.window as unknown as { Tabs: TabsApi }).Tabs;

function keydown(p: BrowserPage, target: EventTarget, key: string, shiftKey = false): KeyboardEvent {
  const event = new p.window.KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

async function scrollableHome(context: TestContext, cookie?: string): Promise<BrowserPage> {
  const opened = await openPage(context, "index.html", {
    cookie,
    beforeScripts: (window) => {
      Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
      window.scrollTo = (() => {}) as typeof window.scrollTo;
    }
  });
  await opened.settle(50);
  return opened;
}

describe("tab notice", () => {
  it("is announced as a status, and only an untimed notice offers Close", async () => {
    page = await openPage(ctx, "index.html");
    const notice = page.document.getElementById("tabNotice")!;
    expect(notice.getAttribute("role")).toBe("status");

    tabsOf(page).notice("Timed", 3000);
    expect(notice.hidden).toBe(false);
    expect(notice.textContent).toBe("Timed");
    expect(notice.querySelector(".tab-notice-close")).toBeNull();

    tabsOf(page).notice("You are refreshing too quickly.");
    const close = notice.querySelector(".tab-notice-close") as HTMLButtonElement;
    expect(close.getAttribute("aria-label")).toBe("Close");
    expect(notice.textContent).toBe("You are refreshing too quickly.");
    close.click();
    expect(notice.hidden).toBe(true);
  });

  it("never moves focus when shown, and a new notice replaces the old one", async () => {
    page = await openPage(ctx, "index.html");
    const search = page.document.getElementById("siteSearchBox") as HTMLInputElement;
    search.focus();
    tabsOf(page).notice("First");
    tabsOf(page).notice("Second", 3000);
    const notice = page.document.getElementById("tabNotice")!;
    expect(notice.textContent).toBe("Second");
    expect(notice.querySelectorAll(".tab-notice-close").length).toBe(0);
    expect(page.document.activeElement).toBe(search);
  });

  it("moves focus to Refresh when it hides while Close has focus", async () => {
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    const refresh = page.document.getElementById("refreshBtn") as HTMLButtonElement;
    expect(refresh.disabled).toBe(false);
    tabsOf(page).notice("You are refreshing too quickly.");
    const close = page.document.querySelector(".tab-notice-close") as HTMLButtonElement;
    close.focus();
    expect(page.document.activeElement).toBe(close);
    close.click();
    expect(page.document.activeElement).toBe(refresh);
  });
});

describe("avatar", () => {
  it("is a menu button that opens by click and closes by Escape, returning focus", async () => {
    const { cookie } = await forgeSession(ctx, "avatar@example.com");
    page = await openPage(ctx, "index.html", { cookie });
    const button = page.document.querySelector(".header-user .avatar-btn") as HTMLButtonElement;
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("aria-haspopup")).toBe("menu");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.querySelector("img.avatar")!.getAttribute("alt")).toBe("Profile avatar — open menu");
    const menu = page.document.querySelector(".avatar-menu") as HTMLElement;

    button.click();
    expect(menu.hidden).toBe(false);
    expect(button.getAttribute("aria-expanded")).toBe("true");

    const firstItem = menu.querySelector("a") as HTMLAnchorElement;
    firstItem.focus();
    keydown(page, firstItem, "Escape");
    expect(menu.hidden).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(page.document.activeElement).toBe(button);

    button.click();
    page.document.body.click();
    expect(menu.hidden).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("guest tabs", () => {
  it("stay focusable with aria-disabled and send a click to sign-in without opening the tab", async () => {
    page = await openPage(ctx, "index.html");
    for (const name of ["your-polls", "shared-with-you", "your-votes", "watching", "live"]) {
      const tab = page.document.querySelector(`.tab[data-tab="${name}"]`) as HTMLButtonElement;
      expect(tab.getAttribute("aria-disabled"), name).toBe("true");
      expect(tab.disabled, name).toBe(false);
      expect(tab.getAttribute("title"), name).toBe("Sign in to use this tab");
    }
    const requestsBefore = page.requests.length;
    await page.click('.tab[data-tab="watching"]');
    expect(page.navigations.length).toBe(1);
    expect(page.document.querySelector('.tab[data-tab="watching"]')!.classList.contains("is-active")).toBe(false);
    expect(page.requests.slice(requestsBefore).filter((r) => r.url.startsWith("/api/tabs"))).toEqual([]);
  });
});

describe("Tabs.modal", () => {
  it("is named by its message and keeps Tab on OK", async () => {
    page = await openPage(ctx, "index.html");
    tabsOf(page).modal("Hello there");
    const dialog = page.document.querySelector(".modal")!;
    const labelId = dialog.getAttribute("aria-labelledby")!;
    expect(page.document.getElementById(labelId)!.textContent).toBe("Hello there");
    const ok = dialog.querySelector(".modal-ok") as HTMLButtonElement;
    expect(page.document.activeElement).toBe(ok);
    expect(keydown(page, ok, "Tab").defaultPrevented).toBe(true);
    expect(page.document.activeElement).toBe(ok);
    expect(keydown(page, ok, "Tab", true).defaultPrevented).toBe(true);
    expect(page.document.activeElement).toBe(ok);
  });
});

describe("Live Results idle prompt", () => {
  it("is named by its text, not modal, takes focus on Yes, and leaves Escape to the maximized view", async () => {
    const live = await startTestContext({
      ENV_MIN_LIVE_REFRESH_INTERVAL: "200",
      ENV_MIN_MANUAL_REFRESH_INTERVAL: "1",
      ENV_MAX_IDLE_TIME: "400"
    });
    let livePage: BrowserPage | null = null;
    try {
      const { cookie } = await forgeSession(live, "idle-m3@example.com");
      await polls(live).insertOne(makePoll({ title: "Idle M3" }));
      await trendingSweep(live, live.config, live.trendingPublisher);
      livePage = await scrollableHome(live, cookie);
      await livePage.click('.tab-panel[data-panel="trending"] .live-link');
      const search = livePage.document.getElementById("siteSearchBox") as HTMLInputElement;
      search.focus();
      await livePage.settle(900);

      const prompt = livePage.document.querySelector(".live-idle-prompt")!;
      expect(prompt.hasAttribute("aria-modal")).toBe(false);
      const labelId = prompt.getAttribute("aria-labelledby")!;
      expect(livePage.document.getElementById(labelId)!.textContent).toBe(
        "Do you want to continue to receive Live Results updates?"
      );
      expect(livePage.document.activeElement).toBe(prompt.querySelector(".live-idle-yes"));

      const maximizedOpen = () => {
        const grid = livePage!.document.querySelector('.tab-panel[data-panel="live"] .maximized-card-grid') as HTMLElement | null;
        return Boolean(grid && !grid.hidden);
      };
      await livePage.click('.tab-panel[data-panel="live"] .card-front .maximize-btn');
      expect(maximizedOpen()).toBe(true);
      expect(livePage.document.querySelector(".live-idle-prompt")).not.toBeNull();
      keydown(livePage, livePage.document.body, "Escape");
      await livePage.settle();
      expect(maximizedOpen()).toBe(false);
    } finally {
      livePage?.close();
      await live.stop();
    }
  });

  it("returns focus to where it was after Yes", async () => {
    const live = await startTestContext({
      ENV_MIN_LIVE_REFRESH_INTERVAL: "200",
      ENV_MIN_MANUAL_REFRESH_INTERVAL: "1",
      ENV_MAX_IDLE_TIME: "400"
    });
    let livePage: BrowserPage | null = null;
    try {
      const { cookie } = await forgeSession(live, "idle-yes@example.com");
      await polls(live).insertOne(makePoll({ title: "Idle Yes" }));
      await trendingSweep(live, live.config, live.trendingPublisher);
      livePage = await scrollableHome(live, cookie);
      await livePage.click('.tab-panel[data-panel="trending"] .live-link');
      const search = livePage.document.getElementById("siteSearchBox") as HTMLInputElement;
      search.focus();
      await livePage.settle(900);
      const yes = livePage.document.querySelector(".live-idle-yes") as HTMLButtonElement;
      expect(livePage.document.activeElement).toBe(yes);
      yes.click();
      expect(livePage.document.activeElement).toBe(search);
      expect(livePage.document.querySelector(".live-idle-prompt")).toBeNull();
    } finally {
      livePage?.close();
      await live.stop();
    }
  });
});
