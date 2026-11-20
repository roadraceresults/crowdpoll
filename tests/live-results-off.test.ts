/**
 * ENV_LIVE_RESULTS: Live Results is off unless the setting is 1. Off, the page shows no Live Results
 * tab or card control, reads `?tab=live` as no tab at all, and the /api/live routes answer 404.
 * (The harness turns it on for every other suite.)
 */
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import { trendingSweep } from "../src/polls/sweeps.js";

let ctx: TestContext;
let page: BrowserPage | null = null;
let visitors = 0;

const SCRIPTS = ["app.js", "pollCard.js", "voteClient.js", "deltaClient.js", "tabs.js", "trending.js", "newest.js", "searchTab.js", "liveResults.js", "tabBarScroll.js"];

beforeAll(async () => {
  ctx = await startTestContext({ ENV_LIVE_RESULTS: "0", ENV_MIN_MANUAL_REFRESH_INTERVAL: "1" });
});
afterAll(async () => {
  await ctx.stop();
});
beforeEach(async () => {
  await polls(ctx).deleteMany({});
  for (const pattern of ["floor:*", "home:*", "listing:*", "live:*"]) {
    for (const key of await ctx.cache.scan(pattern)) await ctx.cache.del(key);
  }
});
afterEach(() => {
  page?.close();
  page = null;
});

async function login(): Promise<string> {
  const { cookie } = await forgeSession(ctx, `live-off${visitors++}@example.com`);
  return cookie;
}

async function open(search: string, cookie?: string): Promise<BrowserPage> {
  page = await openPage(ctx, "index.html", { cookie, scripts: SCRIPTS, url: `http://localhost/${search}` });
  await page.settle(150);
  return page;
}

const activeTab = (p: BrowserPage) => p.document.querySelector("#tabBar .tab.is-active")!.getAttribute("data-tab");
const liveTab = (p: BrowserPage) => p.document.querySelector<HTMLButtonElement>('#tabBar .tab[data-tab="live"]')!;

describe("ENV_LIVE_RESULTS off: the server", () => {
  it("tells the page Live Results is off", async () => {
    expect((await request(ctx.app).get("/api/config")).body.liveResultsEnabled).toBe(false);
  });

  it("answers 404 on every /api/live route, as for an unknown address", async () => {
    const cookie = await login();
    const poll = makePoll({ title: "Public" });
    await polls(ctx).insertOne(poll);
    expect((await request(ctx.app).post(`/api/live/${poll._id}`).set("Cookie", cookie).send()).status).toBe(404);
    expect((await request(ctx.app).delete(`/api/live/${poll._id}`).set("Cookie", cookie).send()).status).toBe(404);
    expect((await request(ctx.app).post("/api/live/refresh").set("Cookie", cookie).send({})).status).toBe(404);
  });
});

describe("ENV_LIVE_RESULTS off: the home page", () => {
  it("shows no Live Results tab", async () => {
    const p = await open("", await login());
    expect(liveTab(p).hidden).toBe(true);
    expect(activeTab(p)).toBe("home");
  });

  it("reads ?tab=live as no tab: a logged-in visitor lands on Home, a guest on Trending", async () => {
    const p = await open("?tab=live", await login());
    expect(activeTab(p)).toBe("home");
    expect(p.window.location.search).toBe("?tab=home");
    p.close();
    page = null;
    const guest = await open("?tab=live");
    expect(activeTab(guest)).toBe("trending");
    expect(guest.window.location.search).toBe("?tab=trending");
  });

  it("gives the cards no Live Results control", async () => {
    const poll = makePoll({ _id: randomUUID(), title: "No live control" });
    await polls(ctx).insertOne(poll);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    const p = await open("?tab=trending", await login());
    const links = Array.from(p.document.querySelectorAll<HTMLElement>('.tab-panel[data-panel="trending"] .live-link'));
    expect(links.length).toBeGreaterThan(0);
    expect(links.every((link) => link.hidden)).toBe(true);
  });
});

describe("ENV_LIVE_RESULTS on (the harness default)", () => {
  it("shows the tab and lands on it from ?tab=live", async () => {
    const on = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1" });
    try {
      const { cookie } = await forgeSession(on, "live-on@example.com");
      const p = await openPage(on, "index.html", { cookie, scripts: SCRIPTS, url: "http://localhost/?tab=live" });
      page = p;
      await p.settle(150);
      expect(liveTab(p).hidden).toBe(false);
      expect(activeTab(p)).toBe("live");
    } finally {
      page?.close();
      page = null;
      await on.stop();
    }
  });
});
