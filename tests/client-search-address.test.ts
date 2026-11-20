/** Search terms in the home page's address (contract L9, with L1): written without a history entry, kept beside a maximized poll. */
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";

let ctx: TestContext;
let page: BrowserPage | null = null;
let visitors = 0;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1" });
});
afterAll(async () => {
  await ctx.stop();
});
beforeEach(async () => {
  await polls(ctx).deleteMany({});
});
afterEach(() => {
  page?.close();
  page = null;
});

async function arrive(search: string): Promise<BrowserPage> {
  const { cookie } = await forgeSession(ctx, `search-address${visitors++}@example.com`);
  page = await openPage(ctx, "index.html", { cookie, url: `http://localhost/${search}` });
  await page.settle(300);
  return page;
}

const address = (p: BrowserPage) => p.window.location.search;
const panel = (p: BrowserPage) => p.document.querySelector('.tab-panel[data-panel="search"]')!;
const maximizedShown = (p: BrowserPage) => !panel(p).querySelector(".maximized-card-grid")!.hasAttribute("hidden");
const cardTitled = (p: BrowserPage, title: string) =>
  Array.from(panel(p).querySelectorAll(".card-viewport")).find((card) => card.querySelector(".card-front .question")?.textContent === title)!;

// The answer to a query is cached across tests, so each test searches for its own words.
describe("search terms in the address", () => {
  it("are written on a search and removed by Clear, with no history entry added", async () => {
    await polls(ctx).insertMany([makePoll({ title: "Quantum kettle" }), makePoll({ title: "Teapot" })]);
    const p = await arrive("?tab=trending");
    const length = p.window.history.length;
    await p.submitForm("#siteSearch", { siteSearchBox: "kettle" });
    await p.settle(100);
    expect(address(p)).toBe("?tab=search&q=kettle");
    expect(p.cardTitles("search")).toEqual(["Quantum kettle"]);

    await p.click("#searchTabClear");
    await p.settle(50);
    expect(address(p)).toBe("?tab=search");
    expect(p.window.history.length).toBe(length);
  });

  it("stay beside the poll while a result is maximized, and remain when it closes", async () => {
    const poll = makePoll({ _id: randomUUID(), title: "Brass samovar" });
    await polls(ctx).insertOne(poll);
    const p = await arrive("?tab=trending");
    await p.submitForm("#siteSearch", { siteSearchBox: "samovar" });
    await p.settle(100);
    (cardTitled(p, "Brass samovar").querySelector(".card-front .maximize-btn") as HTMLElement).click();
    await p.settle(50);
    expect(maximizedShown(p)).toBe(true);
    expect(address(p)).toBe(`?tab=search&q=samovar&PID=${poll._id}`);

    p.window.history.back();
    await p.settle(50);
    expect(maximizedShown(p)).toBe(false);
    expect(address(p)).toBe("?tab=search&q=samovar");
  });

  it("run the search on a link's landing and show the poll maximized over the results", async () => {
    const poll = makePoll({ _id: randomUUID(), title: "Quantum teacup" });
    await polls(ctx).insertMany([poll, makePoll({ title: "Ordinary teacup" })]);
    const p = await arrive(`?open=${poll._id}&tab=search&q=teacup`);
    expect(p.document.querySelector("#tabBar .tab.is-active")!.getAttribute("data-tab")).toBe("search");
    expect(p.requests.filter((r) => r.url === "/api/search")).toHaveLength(1);
    expect(maximizedShown(p)).toBe(true);
    expect(address(p)).toBe(`?tab=search&q=teacup&PID=${poll._id}`);
  });

  it("show a poll the results lack, and keep it first when it closes", async () => {
    const poll = makePoll({ _id: randomUUID(), title: "Teapot" });
    await polls(ctx).insertMany([poll, makePoll({ title: "Quantum percolator" })]);
    const p = await arrive(`?open=${poll._id}&tab=search&q=percolator`);
    expect(maximizedShown(p)).toBe(true);
    expect(panel(p).querySelector(".maximized-card-grid .question")!.textContent).toBe("Teapot");

    p.document.dispatchEvent(new p.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await p.settle(50);
    expect(maximizedShown(p)).toBe(false);
    expect(p.cardTitles("search")).toEqual(["Teapot", "Quantum percolator"]);
    expect(address(p)).toBe("?tab=search&q=percolator");
  });
});
