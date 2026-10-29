import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { newestSweep, trendingSweep } from "../src/polls/sweeps.js";

let ctx: TestContext;
let page: BrowserPage | null = null;

beforeAll(async () => {
  // A 2 s recompute interval is also the published max-age (below the 10 s cap).
  ctx = await startTestContext({
    ENV_MIN_MANUAL_REFRESH_INTERVAL: "1",
    ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL: "2000",
    ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL: "2000"
  });
  await polls(ctx).insertOne(makePoll({ title: "Listed" }));
  await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
  await newestSweep(ctx, ctx.config, ctx.newestPublisher);
});

afterAll(async () => {
  page?.close();
  await ctx.stop();
});

const objectRequests = (p: BrowserPage, tab: string) => p.requests.filter((r) => r.url.startsWith(`/api/trending/${tab}`)).length;

describe("Refresh on Trending and Newest (R7)", () => {
  for (const [tab, object] of [
    ["trending", "trending-counts.json"],
    ["newest", "newest-counts.json"]
  ] as const) {
    it(`on ${tab}, waits until the copy is as old as the published max-age`, async () => {
      page?.close();
      page = await openPage(ctx, "index.html");
      if (tab === "newest") await page.click('.tab[data-tab="newest"]');
      await page.settle();
      expect(page.cardTitles(tab)).toEqual(["Listed"]);
      const refresh = page.document.getElementById("refreshBtn") as HTMLButtonElement;
      expect(refresh.getAttribute("aria-disabled")).toBe("true");
      expect(refresh.title).toBe("Refresh available in 2 s");
      const fetched = objectRequests(page, object);
      await page.click("#refreshBtn");
      expect(objectRequests(page, object)).toBe(fetched);

      await page.settle(2000);
      expect(refresh.getAttribute("aria-disabled")).toBeNull();
      expect(refresh.title).toBe("Refresh");
      await page.click("#refreshBtn");
      expect(objectRequests(page, object)).toBe(fetched + 1);
    });
  }
});
