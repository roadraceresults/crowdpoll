import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { insertPoll } from "../src/polls/store.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import { trendingSweep } from "../src/polls/sweeps.js";

let ctx: TestContext;
let page: BrowserPage | null = null;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1200" });
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
const maximized = (p: BrowserPage, tab: string) => p.document.querySelector(`.tab-panel[data-panel="${tab}"] .maximized-card-grid`) as HTMLElement | null;

describe("a landing for a poll no list holds", () => {
  it("fetches the poll, shows it maximized, and closing removes it without adding it to the list", async () => {
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

    await page.click('.tab[data-tab="trending"]');
    expect(maximized(page, "trending")!.hidden).toBe(true);
    expect(page.cardTitles("trending")).toEqual(["Already listed"]);
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
    await escape(page);
    expect(maximized(page, "shared-with-you")!.hidden).toBe(true);
    expect(page.cardTitles("shared-with-you")).toContain("Shared already");
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
  it("ignores them, stays on Trending, shows nothing and tidies the address", async () => {
    const { cookie } = await forgeSession(ctx, "landing-unknown@example.com");
    page = await arrive("?open=not-an-id&tab=admin&notice=constructor&q=", cookie);
    await page.settle(200);
    expect(activeTab(page)).toBe("trending");
    expect(page.document.getElementById("tabNotice")!.hidden).toBe(true);
    expect(page.window.location.search).not.toMatch(/open|tab=|notice/);
  });
});
