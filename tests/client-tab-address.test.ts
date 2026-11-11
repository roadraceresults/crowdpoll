/**
 * The home page keeps the tab it shows in its address (`/?tab=<name>`), written without a new
 * history entry, and shows the named tab on a fresh load, a reload, a bookmark or a return.
 */
import { randomUUID } from "node:crypto";
import type { JSDOM } from "jsdom";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import { trendingSweep } from "../src/polls/sweeps.js";

let ctx: TestContext;
let page: BrowserPage | null = null;
let visitors = 0;

const SCRIPTS = ["app.js", "pollCard.js", "voteClient.js", "deltaClient.js", "tabs.js", "trending.js", "newest.js", "searchTab.js", "liveResults.js", "tabBarScroll.js"];
const TAB_NAMES = ["home", "your-polls", "shared-with-you", "your-votes", "trending", "newest", "watching", "live", "search"];

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1" });
});
afterAll(async () => {
  await ctx.stop();
});
beforeEach(async () => {
  await polls(ctx).deleteMany({});
  for (const pattern of ["floor:*", "home:*", "listing:*"]) {
    for (const key of await ctx.cache.scan(pattern)) await ctx.cache.del(key);
  }
});
afterEach(() => {
  page?.close();
  page = null;
});

type Measured = JSDOM["window"] & { entriesBefore: number };

async function login(): Promise<string> {
  const { cookie } = await forgeSession(ctx, `tab-address${visitors++}@example.com`);
  return cookie;
}

async function open(search: string, options: { cookie?: string; state?: Record<string, unknown> } = {}): Promise<BrowserPage> {
  page = await openPage(ctx, "index.html", {
    cookie: options.cookie,
    scripts: SCRIPTS,
    url: `http://localhost/${search}`,
    beforeScripts: (window) => {
      if (options.state) window.history.replaceState(options.state, "");
      (window as Measured).entriesBefore = window.history.length;
    }
  });
  await page.settle(150);
  return page;
}

const activeTab = (p: BrowserPage) => p.document.querySelector("#tabBar .tab.is-active")!.getAttribute("data-tab");
const search = (p: BrowserPage) => p.window.location.search;
const entries = (p: BrowserPage) => p.window.history.length;
const entriesBefore = (p: BrowserPage) => (p.window as Measured).entriesBefore;
const maximized = (p: BrowserPage, tab: string) => p.document.querySelector(`.tab-panel[data-panel="${tab}"] .maximized-card-grid`) as HTMLElement | null;

async function trendingPoll(title: string): Promise<string> {
  const poll = makePoll({ _id: randomUUID(), title });
  await polls(ctx).insertOne(poll);
  await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
  return poll._id;
}

describe("the home page's address names the tab shown (C2)", () => {
  it("reads /?tab=home as soon as a logged-in visitor's default tab shows, with no new history entry", async () => {
    const p = await open("", { cookie: await login() });
    expect(activeTab(p)).toBe("home");
    expect(search(p)).toBe("?tab=home");
    expect(entries(p)).toBe(entriesBefore(p));
  });

  it("reads /?tab=trending for a guest", async () => {
    const p = await open("");
    expect(activeTab(p)).toBe("trending");
    expect(search(p)).toBe("?tab=trending");
    expect(entries(p)).toBe(entriesBefore(p));
  });

  it("follows a tab click without adding a history entry", async () => {
    const p = await open("", { cookie: await login() });
    const before = entries(p);
    await p.click('.tab[data-tab="your-votes"]');
    await p.settle(100);
    expect(activeTab(p)).toBe("your-votes");
    expect(search(p)).toBe("?tab=your-votes");
    expect(entries(p)).toBe(before);
  });

  it("keeps the history entry's own state and the other parameters", async () => {
    const p = await open("?PID=abc", { cookie: await login(), state: { kept: 1 } });
    expect(search(p)).toBe("?PID=abc&tab=home");
    expect(p.window.history.state).toEqual({ kept: 1 });
  });
});

describe("a tab named in the address is shown on load", () => {
  for (const name of TAB_NAMES) {
    it(`shows ${name} to a logged-in visitor`, async () => {
      const p = await open(`?tab=${name}`, { cookie: await login() });
      expect(activeTab(p)).toBe(name);
      expect(search(p)).toBe(`?tab=${name}`);
      expect(p.navigations).toEqual([]);
    });
  }

  it("shows Trending to a guest whose address names a logged-in tab, and never the login page", async () => {
    const p = await open("?tab=your-votes");
    expect(activeTab(p)).toBe("trending");
    expect(search(p)).toBe("?tab=trending");
    expect(p.navigations).toEqual([]);
  });

  it("shows the default tab for a name that is not a tab, and writes the default's name", async () => {
    const guest = await open("?tab=nonsense");
    expect(activeTab(guest)).toBe("trending");
    expect(search(guest)).toBe("?tab=trending");
    guest.close();
    const p = await open("?tab=nonsense", { cookie: await login() });
    expect(activeTab(p)).toBe("home");
    expect(search(p)).toBe("?tab=home");
  });

  it("keeps the tab after a poll link's landing, with the card maximized", async () => {
    const pid = await trendingPoll("Linked");
    const p = await open(`?open=${pid}&tab=trending`, { cookie: await login() });
    await p.settle(300);
    expect(activeTab(p)).toBe("trending");
    expect(maximized(p, "trending")!.hidden).toBe(false);
    expect(search(p)).toBe("?tab=trending");
  });

  it("restores the tab only: a fresh load after a maximized card shows the list", async () => {
    const pid = await trendingPoll("Was maximized");
    const first = await open(`?open=${pid}&tab=trending`, { cookie: await login() });
    await first.settle(300);
    expect(maximized(first, "trending")!.hidden).toBe(false);
    const address = first.window.location.pathname + search(first);
    first.close();
    const p = await open(address.slice(1), { cookie: await login() });
    await p.settle(300);
    expect(activeTab(p)).toBe("trending");
    expect(p.cardTitles("trending")).toEqual(["Was maximized"]);
    expect(maximized(p, "trending")?.hidden ?? true).toBe(true);
  });
});

describe("search terms in the address", () => {
  const searchRequests = (p: BrowserPage) => p.requests.filter((r) => r.url === "/api/search");

  it("run the search, and leave the address with the Search tab", async () => {
    const p = await open("?q=senate", { cookie: await login() });
    await p.settle(300);
    expect(activeTab(p)).toBe("search");
    expect(searchRequests(p)).toHaveLength(1);
    expect(search(p)).toBe("?q=senate&tab=search");
    await p.click('.tab[data-tab="trending"]');
    await p.settle(100);
    expect(activeTab(p)).toBe("trending");
    expect(search(p)).toBe("?tab=trending");
  });

  it("give way to another tab named in the address, with no search run", async () => {
    const p = await open("?q=senate&tab=trending", { cookie: await login() });
    await p.settle(300);
    expect(activeTab(p)).toBe("trending");
    expect(searchRequests(p)).toHaveLength(0);
    expect(search(p)).toBe("?tab=trending");
  });

  it("run the search when the Search tab is named with them", async () => {
    const p = await open("?q=senate&tab=search", { cookie: await login() });
    await p.settle(300);
    expect(activeTab(p)).toBe("search");
    expect(searchRequests(p)).toHaveLength(1);
    expect(search(p)).toBe("?q=senate&tab=search");
  });
});
