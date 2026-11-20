import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { insertPoll } from "../src/polls/store.js";
import { LISTING_MAX_AGE_1S, openPage, type BrowserPage } from "./helpers/browser.js";
import { newestSweep, trendingSweep } from "../src/polls/sweeps.js";

let ctx: TestContext;
let page: BrowserPage | null = null;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1200", ...LISTING_MAX_AGE_1S });
});
afterAll(async () => {
  await ctx.stop();
});
beforeEach(async () => {
  await polls(ctx).deleteMany({});
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
});
afterEach(() => {
  page?.close();
  page = null;
});

const arrive = (search: string, cookie: string) => openPage(ctx, "index.html", { cookie, url: `http://localhost/${search}` });
const activeTab = (p: BrowserPage) => p.document.querySelector("#tabBar .tab.is-active")!.getAttribute("data-tab");
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const maximizeButtonOf = (p: BrowserPage, title: string) =>
  Array.from(p.document.querySelectorAll(".card-viewport")).find((card) => card.querySelector(".card-front .question")?.textContent === title)!
    .querySelector(".card-front .maximize-btn");
const maximized = (p: BrowserPage, tab: string) => p.document.querySelector(`.tab-panel[data-panel="${tab}"] .maximized-card-grid`) as HTMLElement | null;

describe("a landing for a poll no list holds", () => {
  it("fetches the poll, shows it maximized, and closing keeps its card first until the tab's next server answer", async () => {
    await polls(ctx).insertOne(makePoll({ _id: randomUUID(), title: "Already listed" }));
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    const unlisted = makePoll({ _id: randomUUID(), title: "Not in Trending" });
    await polls(ctx).insertOne(unlisted);
    const { cookie } = await forgeSession(ctx, "landing-retained@example.com");
    page = await arrive(`?open=${unlisted._id}&tab=trending`, cookie);
    await page.settle(400);

    expect(page.requests.some((r) => r.url === `/api/me/polls/${unlisted._id}`)).toBe(true);
    expect(maximized(page, "trending")!.hidden).toBe(false);
    expect(page.cardTitles("trending")).toContain("Not in Trending");

    expect(page.window.location.search).toBe(`?tab=trending&PID=${unlisted._id}`);

    await page.click('.tab[data-tab="trending"]');
    expect(maximized(page, "trending")!.hidden).toBe(true);
    expect(page.cardTitles("trending")).toEqual(["Not in Trending", "Already listed"]);
    expect(page.window.location.search).toBe("?tab=trending");
    await page.settle(20);
    expect(page.document.activeElement).toBe(maximizeButtonOf(page, "Not in Trending"));

    await page.click('.tab[data-tab="newest"]');
    await page.click('.tab[data-tab="trending"]');
    expect(page.cardTitles("trending")).toEqual(["Not in Trending", "Already listed"]);

    await pause(1100);
    await page.click("#refreshBtn");
    await page.settle(200);
    expect(page.cardTitles("trending")).toEqual(["Already listed"]);
  });

  it("keeps the closed card through a Watch and a return to the tab, and drops it on the next refresh", async () => {
    const owner = await forgeSession(ctx, `landing-kept-owner-${randomUUID().slice(0, 8)}@example.com`);
    const listed = makePoll({ _id: randomUUID(), title: "Listed shared", pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link" });
    await insertPoll(ctx, listed, { id: owner.userId, name: "Owner", email: "owner@example.com" });
    const who = `landing-kept-${randomUUID().slice(0, 8)}@example.com`;
    const { cookie } = await forgeSession(ctx, who);
    await ctx.db.insertInto("user_polls").values({ email: who, poll_id: listed._id, relation: "linked", updated_at: new Date() }).execute();
    const unlisted = makePoll({ _id: randomUUID(), title: "Kept after closing" });
    await polls(ctx).insertOne(unlisted);
    page = await arrive(`?open=${unlisted._id}&tab=shared-with-you`, cookie);
    await page.settle(400);
    page.document.dispatchEvent(new page.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await page.settle(20);
    expect(page.cardTitles("shared-with-you")).toEqual(["Kept after closing", "Listed shared"]);
    expect(page.document.activeElement).toBe(maximizeButtonOf(page, "Kept after closing"));

    (maximizeButtonOf(page, "Listed shared")!.closest(".card-viewport")!.querySelector(".bookmark-btn") as HTMLElement).click();
    await page.settle(200);
    await page.click('.tab[data-tab="watching"]');
    await page.click('.tab[data-tab="shared-with-you"]');
    expect(page.cardTitles("shared-with-you")[0]).toBe("Kept after closing");

    await pause(1300);
    await page.click("#refreshBtn");
    await page.settle(200);
    expect(page.cardTitles("shared-with-you")).toEqual(["Listed shared"]);
  });

  it("removes the card at once when the visitor leaves the tab while it is shown", async () => {
    const unlisted = makePoll({ _id: randomUUID(), title: "Left behind" });
    await polls(ctx).insertOne(unlisted);
    const { cookie } = await forgeSession(ctx, "landing-left@example.com");
    page = await arrive(`?open=${unlisted._id}&tab=shared-with-you`, cookie);
    await page.settle(400);
    await page.click('.tab[data-tab="your-votes"]');
    await page.click('.tab[data-tab="shared-with-you"]');
    expect(page.cardTitles("shared-with-you")).not.toContain("Left behind");
    expect(page.window.location.search).toBe("?tab=shared-with-you");
  });

  it("says the poll is not available when the server refuses it", async () => {
    const { cookie } = await forgeSession(ctx, "landing-refused@example.com");
    page = await arrive(`?open=${randomUUID()}&tab=trending`, cookie);
    await page.settle(400);
    expect(page.document.getElementById("tabNotice")!.textContent).toBe("That poll isn't available.");
    expect(maximized(page, "trending")?.hidden ?? true).toBe(true);
  });
});

describe("a landing that names a poll always shows it maximized (C2)", () => {
  const escape = async (p: BrowserPage) => {
    p.document.dispatchEvent(new p.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await p.settle();
  };

  it("maximizes a poll the tab already holds, and Escape restores the tab with the card in it", async () => {
    const owner = await forgeSession(ctx, `landing-owner-${randomUUID().slice(0, 8)}@example.com`);
    const poll = makePoll({ _id: randomUUID(), title: "Shared already", pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link" });
    await insertPoll(ctx, poll, { id: owner.userId, name: "Owner", email: "owner@example.com" });
    const who = "landing-shared@example.com";
    const { cookie } = await forgeSession(ctx, who);
    await ctx.db.insertInto("user_polls").values({ email: who, poll_id: poll._id, relation: "linked", updated_at: new Date() }).execute();
    page = await arrive(`?open=${poll._id}&tab=shared-with-you`, cookie);
    await page.settle(400);
    expect(activeTab(page)).toBe("shared-with-you");
    expect(maximized(page, "shared-with-you")!.hidden).toBe(false);
    expect(page.window.location.search).toBe(`?tab=shared-with-you&PID=${poll._id}`);
    expect(page.window.history.length).toBe(1);
    await escape(page);
    expect(maximized(page, "shared-with-you")!.hidden).toBe(true);
    expect(page.cardTitles("shared-with-you")).toContain("Shared already");
    expect(page.window.location.search).toBe("?tab=shared-with-you");
  });

  it("puts a listed poll's card first when it closes, through a Watch, until the tab's next server answer", async () => {
    const older = makePoll({ _id: randomUUID(), title: "Linked older", createdAt: new Date(Date.now() - 120_000) });
    const newer = makePoll({ _id: randomUUID(), title: "Listed newer", createdAt: new Date(Date.now() - 60_000) });
    await polls(ctx).insertMany([older, newer]);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    await newestSweep(ctx, ctx.config, ctx.newestPublisher);
    const { cookie } = await forgeSession(ctx, "landing-listed-first@example.com");
    page = await arrive(`?open=${older._id}&tab=newest`, cookie);
    await page.settle(400);
    expect(maximized(page, "newest")!.hidden).toBe(false);

    await escape(page);
    expect(page.cardTitles("newest")).toEqual(["Linked older", "Listed newer"]);
    expect(page.document.activeElement).toBe(maximizeButtonOf(page, "Linked older"));

    (maximizeButtonOf(page, "Listed newer")!.closest(".card-viewport")!.querySelector(".bookmark-btn") as HTMLElement).click();
    await page.settle(200);
    expect(page.cardTitles("newest")).toEqual(["Linked older", "Listed newer"]);

    await pause(1300);
    await page.click("#refreshBtn");
    await page.settle(200);
    expect(page.cardTitles("newest")).toEqual(["Listed newer", "Linked older"]);
  });

  it("returns a card maximized from the grid to its own place", async () => {
    const older = makePoll({ _id: randomUUID(), title: "Grid older", createdAt: new Date(Date.now() - 120_000) });
    const newer = makePoll({ _id: randomUUID(), title: "Grid newer", createdAt: new Date(Date.now() - 60_000) });
    await polls(ctx).insertMany([older, newer]);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    await newestSweep(ctx, ctx.config, ctx.newestPublisher);
    const { cookie } = await forgeSession(ctx, "landing-grid-place@example.com");
    page = await arrive("?tab=newest", cookie);
    await page.settle(400);
    (maximizeButtonOf(page, "Grid older") as HTMLElement).click();
    await page.settle(50);
    await escape(page);
    expect(page.cardTitles("newest")).toEqual(["Grid newer", "Grid older"]);
  });

  it("maximizes a poll it had to fetch, and Escape restores the tab", async () => {
    const unlisted = makePoll({ _id: randomUUID(), title: "Fetched fresh" });
    await polls(ctx).insertOne(unlisted);
    const { cookie } = await forgeSession(ctx, "landing-fetched@example.com");
    page = await arrive(`?open=${unlisted._id}&tab=shared-with-you`, cookie);
    await page.settle(400);
    expect(page.requests.some((r) => r.url === `/api/me/polls/${unlisted._id}`)).toBe(true);
    expect(maximized(page, "shared-with-you")!.hidden).toBe(false);
    expect(page.cardTitles("shared-with-you")).toContain("Fetched fresh");
    await escape(page);
    expect(maximized(page, "shared-with-you")!.hidden).toBe(true);
  });
});

describe("a landing with values the page does not know", () => {
  it("ignores them, lands a logged-in visitor on Home, shows nothing and tidies the address", async () => {
    const { cookie } = await forgeSession(ctx, "landing-unknown@example.com");
    page = await arrive("?open=not-an-id&tab=admin&notice=constructor&q=", cookie);
    await page.settle(200);
    expect(activeTab(page)).toBe("home");
    expect(page.document.getElementById("tabNotice")!.hidden).toBe(true);
    expect(page.window.location.search).toBe("?tab=home");
  });
});
