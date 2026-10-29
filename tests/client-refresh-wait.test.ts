import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { addBookmark } from "../src/polls/bookmarks.js";

let ctx: TestContext;
let page: BrowserPage | null = null;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "5000", ENV_MANUAL_REFRESH_BURST: "1" });
});

afterAll(async () => {
  page?.close();
  await ctx.stop();
});

const SCRIPTS = ["app.js", "pollCard.js", "voteClient.js", "deltaClient.js", "tabs.js", "trending.js", "newest.js", "searchTab.js", "liveResults.js", "tooltip-m3.js"];
const requestsTo = (p: BrowserPage, path: string) => p.requests.filter((r) => r.url === path);

describe("the Refresh button while it waits (R8)", () => {
  it("stays focusable and hoverable, counts its wait down in the tooltip and sends nothing until it ends", async () => {
    const me = "refresh-wait@example.com";
    const { cookie } = await forgeSession(ctx, me);
    const poll = makePoll({ title: "Watched" });
    await polls(ctx).insertOne(poll);
    await addBookmark(ctx, me, poll._id, 200);
    page = await openPage(ctx, "index.html", { cookie, scripts: SCRIPTS });
    await page.settle(5100);

    await page.click('.tab[data-tab="watching"]');
    expect(requestsTo(page, "/api/tabs/watching/refresh").length).toBe(1);
    const refresh = page.document.getElementById("refreshBtn") as HTMLButtonElement;
    expect(refresh.getAttribute("aria-disabled")).toBe("true");
    expect(refresh.disabled).toBe(false);
    expect(refresh.dataset.tooltip).toBe("Refresh available in 5 s");

    await page.settle(1000);
    expect(refresh.dataset.tooltip).toBe("Refresh available in 4 s");
    await page.click("#refreshBtn");
    expect(requestsTo(page, "/api/tabs/watching/refresh").length).toBe(1);

    await page.settle(4000);
    expect(refresh.getAttribute("aria-disabled")).toBeNull();
    expect(refresh.dataset.tooltip).toBe("Refresh");
    await page.click("#refreshBtn");
    expect(requestsTo(page, "/api/tabs/watching/refresh").length).toBe(2);
  });
});
