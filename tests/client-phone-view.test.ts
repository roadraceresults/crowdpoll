/**
 * The maximized view in the phone layout, on the home page against the app (contracts/poll-card.md C3 to C5):
 * Vote on a long poll, the Submit bar, and the extras tab bar.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { polls } from "./helpers/poll-fixtures.js";
import { LISTING_MAX_AGE_1S, type BrowserPage } from "./helpers/browser.js";
import { cardByTitle, clickIn, isOpen, maximizedGrid, openHome, seedPoll } from "./helpers/phone-page.js";
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

const voteBar = (p: BrowserPage) => p.document.getElementById("voteBar") as HTMLElement;
const barSubmit = (p: BrowserPage) => voteBar(p).querySelector(".vote-bar-submit") as HTMLButtonElement;
const barCount = (p: BrowserPage) => voteBar(p).querySelector(".vote-bar-count")!.textContent;
const flipOf = (card: HTMLElement) => card.querySelector(".card-flip")!;
const rootHas = (p: BrowserPage, name: string) => p.document.documentElement.classList.contains(name);
const extraTab = (p: BrowserPage, extra: string) => maximizedGrid(p, activePanel(p))!.querySelector<HTMLElement>(`.extras-tab[data-extra="${extra}"]`)!;
const greyed = (p: BrowserPage, extra: string) => extraTab(p, extra).getAttribute("aria-disabled") === "true";
const selected = (p: BrowserPage, extra: string) => extraTab(p, extra).getAttribute("aria-selected") === "true";
const shownExtra = (p: BrowserPage) => maximizedGrid(p, activePanel(p))!.querySelector<HTMLElement>(".maximized-space-right")!.dataset.shown;
const activePanel = (p: BrowserPage) => p.document.querySelector(".tab.is-active")!.getAttribute("data-tab")!;
const votersRequests = (p: BrowserPage) => p.requests.filter((r) => r.url.endsWith("/voters")).length;

describe("Vote on a long poll in the phone layout", () => {
  it("opens the maximized view on its voting side, with the Submit bar following the card", async () => {
    const { cookie } = await forgeSession(ctx, "phone-voter@example.com");
    await seedPoll(ctx, "Long", 12);
    await sweeps();
    page = await openHome(ctx, { phoneLayout: true, cookie });
    const card = cardByTitle(page, "Long");
    expect(voteBar(page).hidden).toBe(true);

    await clickIn(page, card.querySelector(".vote-btn"));
    expect(isOpen(page)).toBe(true);
    expect(flipOf(card).classList.contains("maximized-card-flip")).toBe(true);
    expect(flipOf(card).classList.contains("is-flipped")).toBe(true);
    expect(card.querySelectorAll(".voting-list > .vote-row")).toHaveLength(12);
    expect(voteBar(page).hidden).toBe(false);
    expect(rootHas(page, "vote-bar-shown")).toBe(true);
    expect(barSubmit(page).textContent).toBe("Submit vote");
    expect(barSubmit(page).disabled).toBe(true);
    expect(barCount(page)).toBe("0 selected");

    await clickIn(page, card.querySelector(".voting-list > .vote-row:nth-child(12)"));
    expect(barCount(page)).toBe("1 selected");
    expect(barSubmit(page).disabled).toBe(false);

    await clickIn(page, voteBar(page).querySelector(".vote-bar-back"));
    expect(flipOf(card).classList.contains("is-flipped")).toBe(false);
    expect(voteBar(page).hidden).toBe(true);
    expect(rootHas(page, "vote-bar-shown")).toBe(false);
    expect(isOpen(page)).toBe(true);
  });

  it("submits from the bar exactly as the card's own button does", async () => {
    const { cookie } = await forgeSession(ctx, "phone-submit@example.com");
    await seedPoll(ctx, "Submitted", 12);
    await sweeps();
    page = await openHome(ctx, { phoneLayout: true, cookie });
    const card = cardByTitle(page, "Submitted");
    await clickIn(page, card.querySelector(".vote-btn"));
    await clickIn(page, card.querySelector(".voting-list > .vote-row:nth-child(12)"));
    await clickIn(page, barSubmit(page));
    await page.settle(50);
    expect(flipOf(card).classList.contains("is-flipped")).toBe(false);
    expect(voteBar(page).hidden).toBe(true);
    expect(card.querySelector(".card-front .poll-totals")!.textContent).toContain("1 vote");
    expect(page.requests.filter((r) => r.method === "POST" && r.url.endsWith("/vote"))).toHaveLength(1);
  });

  it("hides the bar when the view closes on its voting side", async () => {
    const { cookie } = await forgeSession(ctx, "phone-closer@example.com");
    await seedPoll(ctx, "Closing", 12);
    await sweeps();
    page = await openHome(ctx, { phoneLayout: true, cookie });
    await clickIn(page, cardByTitle(page, "Closing").querySelector(".vote-btn"));
    expect(voteBar(page).hidden).toBe(false);
    page.window.history.back();
    await page.settle(30);
    expect(isOpen(page)).toBe(false);
    expect(voteBar(page).hidden).toBe(true);
    expect(rootHas(page, "vote-bar-shown")).toBe(false);
  });

  it("still sends a guest to log in", async () => {
    await seedPoll(ctx, "Guest", 12);
    await sweeps();
    page = await openHome(ctx, { phoneLayout: true });
    await clickIn(page, cardByTitle(page, "Guest").querySelector(".vote-btn"));
    expect(page.navigations).toHaveLength(1);
    expect(isOpen(page)).toBe(false);
  });

  it("flips in place and shows no bar outside the phone layout", async () => {
    const { cookie } = await forgeSession(ctx, "wide-voter@example.com");
    await seedPoll(ctx, "Wide", 12);
    await sweeps();
    page = await openHome(ctx, { phoneLayout: false, cookie });
    const card = cardByTitle(page, "Wide");
    await clickIn(page, card.querySelector(".vote-btn"));
    expect(isOpen(page)).toBe(false);
    expect(flipOf(card).classList.contains("is-flipped")).toBe(true);
    expect(voteBar(page).hidden).toBe(true);

    await clickIn(page, card.querySelector(".card-back .maximize-btn"));
    expect(isOpen(page)).toBe(true);
    expect(voteBar(page).hidden).toBe(true);
  });
});

describe("the extras tab bar of the maximized view", () => {
  let me = "";
  let cookie = "";
  let visitor = 0;
  beforeEach(async () => {
    visitor += 1;
    me = `phone-extras-${visitor}@example.com`;
    cookie = (await forgeSession(ctx, me)).cookie;
  });
  const openShared = async (phoneLayout: boolean, cookie: string) => {
    const opened = await openHome(ctx, { phoneLayout, cookie });
    await opened.settle(1250);
    await opened.click('.tab[data-tab="shared-with-you"]');
    return opened;
  };
  const seedPrivate = (title: string, notes: string) =>
    seedPoll(ctx, title, 3, { pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: [me], voteAnonymity: "No", notes });

  it("greys out every tab and shows no section for a poll with none of them", async () => {
    await seedPoll(ctx, "Bare", 3);
    await sweeps();
    page = await openHome(ctx, { phoneLayout: true });
    await clickIn(page, cardByTitle(page, "Bare").querySelector(".maximize-btn"));
    for (const extra of ["notes", "graph", "voters"]) {
      expect(greyed(page, extra), extra).toBe(true);
      expect(selected(page, extra), extra).toBe(false);
    }
    expect(shownExtra(page)).toBe("");

    await clickIn(page, extraTab(page, "voters"));
    expect(shownExtra(page)).toBe("");
    expect(votersRequests(page)).toBe(0);
  });

  it("shows the leftmost available section, one at a time, and asks for the voters only when their tab is shown", async () => {
    await seedPrivate("Extras", "Bring your own notes.");
    page = await openShared(true, cookie);
    await clickIn(page, cardByTitle(page, "Extras").querySelector(".maximize-btn"));
    await page.settle(50);

    const view = maximizedGrid(page, "shared-with-you")!;
    const tabs = Array.from(view.querySelectorAll<HTMLElement>(".extras-tab"));
    expect(tabs.map((tab) => tab.dataset.extra)).toEqual(["notes", "graph", "voters"]);
    expect(tabs.map((tab) => tab.getAttribute("aria-label"))).toEqual(["Read More", "Polling History", "Who Voted"]);
    for (const tab of tabs) expect(view.querySelector("#" + tab.getAttribute("aria-controls"))!.className).toBe("maximized-" + tab.dataset.extra);
    expect([greyed(page, "notes"), greyed(page, "graph"), greyed(page, "voters")]).toEqual([false, true, false]);
    expect(selected(page, "notes")).toBe(true);
    expect(extraTab(page, "notes").classList.contains("is-active")).toBe(true);
    expect(selected(page, "voters")).toBe(false);
    expect(shownExtra(page)).toBe("notes");
    expect(view.querySelector(".maximized-notes")!.textContent).toContain("Bring your own notes.");
    expect(votersRequests(page)).toBe(0);

    await clickIn(page, extraTab(page, "graph"));
    expect(shownExtra(page)).toBe("notes");

    await clickIn(page, extraTab(page, "voters"));
    await page.settle(50);
    expect(selected(page, "voters")).toBe(true);
    expect(selected(page, "notes")).toBe(false);
    expect(extraTab(page, "notes").classList.contains("is-active")).toBe(false);
    expect(shownExtra(page)).toBe("voters");
    expect(votersRequests(page)).toBe(1);

    await clickIn(page, extraTab(page, "voters"));
    expect(shownExtra(page)).toBe("voters");
    await clickIn(page, extraTab(page, "notes"));
    expect(shownExtra(page)).toBe("notes");
    expect(selected(page, "voters")).toBe(false);
    expect(votersRequests(page)).toBe(1);
  });

  it("shows Who Voted by default when it is the only section the poll has", async () => {
    await seedPrivate("Voters only", "");
    page = await openShared(true, cookie);
    await clickIn(page, cardByTitle(page, "Voters only").querySelector(".maximize-btn"));
    await page.settle(50);
    expect([greyed(page, "notes"), greyed(page, "graph"), greyed(page, "voters")]).toEqual([true, true, false]);
    expect(selected(page, "voters")).toBe(true);
    expect(shownExtra(page)).toBe("voters");
    expect(votersRequests(page)).toBe(1);
  });

  it("shows Notes when the view is opened from the card's notes line", async () => {
    await seedPrivate("Noted", "Read me first.");
    page = await openShared(true, cookie);
    const card = cardByTitle(page, "Noted");
    await clickIn(page, card.querySelector(".card-front .poll-notes-text"));
    expect(isOpen(page)).toBe(true);
    expect(selected(page, "notes")).toBe(true);
    expect(selected(page, "voters")).toBe(false);
    expect(shownExtra(page)).toBe("notes");
  });

  const placedAt = (opened: BrowserPage, extrasTop: number, actionsTop: number, extras = "extras-tabs") => {
    const scrolls: number[] = [];
    opened.window.HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      const top = this.classList.contains(extras) ? extrasTop : this.classList.contains("actions") ? actionsTop : 0;
      return { top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) };
    };
    opened.window.scrollTo = ((_x: number, y: number) => scrolls.push(y)) as typeof opened.window.scrollTo;
    return scrolls;
  };

  it("scrolls a long card opened from its notes line until its action row is under the header", async () => {
    await seedPrivate("Long noted", "Read me first.");
    page = await openShared(true, cookie);
    const scrolls = placedAt(page, 900, 700);
    await clickIn(page, cardByTitle(page, "Long noted").querySelector(".card-front .poll-notes-text"));
    expect(scrolls[0]).toBe(684);
  });

  it("does not scroll a card whose extras already start in the upper half of the screen", async () => {
    await seedPrivate("Short noted", "Read me first.");
    page = await openShared(true, cookie);
    const scrolls = placedAt(page, 300, 200);
    await clickIn(page, cardByTitle(page, "Short noted").querySelector(".card-front .poll-notes-text"));
    await page.settle(50);
    expect(scrolls).toEqual([]);
  });

  it("does not scroll a long card opened by its Maximize button", async () => {
    await seedPrivate("Long plain", "Read me first.");
    page = await openShared(true, cookie);
    const scrolls = placedAt(page, 900, 700);
    await clickIn(page, cardByTitle(page, "Long plain").querySelector(".maximize-btn"));
    await page.settle(50);
    expect(scrolls).toEqual([]);
  });

  it("above the phone layout, scrolls a card opened from Show more until its action row is under the header, by where the notes are", async () => {
    await seedPrivate("Wide noted", "Read me first.");
    page = await openShared(false, cookie);
    const scrolls = placedAt(page, 900, 700, "maximized-notes");
    await clickIn(page, cardByTitle(page, "Wide noted").querySelector(".card-front .poll-notes-more"));
    await page.settle(50);
    expect(isOpen(page)).toBe(true);
    expect(maximizedGrid(page, "shared-with-you")!.querySelector<HTMLElement>(".maximized-notes")!.hidden).toBe(false);
    expect(scrolls.length).toBeGreaterThan(0);
    for (const y of scrolls) expect(y).toBe(684);
  });

  it("above the phone layout, does not scroll when the notes start in the upper half of the screen", async () => {
    await seedPrivate("Wide beside", "Read me first.");
    page = await openShared(false, cookie);
    const scrolls = placedAt(page, 300, 200, "maximized-notes");
    await clickIn(page, cardByTitle(page, "Wide beside").querySelector(".card-front .poll-notes-more"));
    await page.settle(50);
    expect(scrolls).toEqual([]);
  });

  it("above the phone layout, does not go by where the extras tab bar is", async () => {
    await seedPrivate("Wide tabs", "Read me first.");
    page = await openShared(false, cookie);
    const scrolls = placedAt(page, 900, 700);
    await clickIn(page, cardByTitle(page, "Wide tabs").querySelector(".card-front .poll-notes-more"));
    await page.settle(50);
    expect(scrolls).toEqual([]);
  });

  it("asks for the voters at once outside the phone layout, as before", async () => {
    await seedPrivate("Wide extras", "Notes.");
    page = await openShared(false, cookie);
    await clickIn(page, cardByTitle(page, "Wide extras").querySelector(".maximize-btn"));
    await page.settle(50);
    expect(votersRequests(page)).toBe(1);
  });
});
