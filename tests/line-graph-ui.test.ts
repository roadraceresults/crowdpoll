/**
 * lineGraph.js in jsdom (opt-in script list, as the tooltip tests do): mount on
 * maximize renders title, subtitle, legend and the SVG; line colours come from
 * the response's manual hex or the card's own resultColors(); the placeholders
 * (sparse data, 404, failed first load) and unmount empty-column behaviour per
 * contracts/ui-contracts.md C1, C2, C4–C6, C9 and spec FR-018.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls, voteHistory } from "./helpers/poll-fixtures.js";
import request from "supertest";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import { newestSweep, trendingSweep } from "../src/polls/sweeps.js";
import type { Poll } from "../src/polls/store.js";

const SCRIPTS = ["app.js", "pollCard.js", "voteClient.js", "deltaClient.js", "lineGraph.js", "tabs.js", "trending.js", "newest.js", "searchTab.js", "liveResults.js"];

const HOUR = 3_600_000;

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
  for (const key of await ctx.cache.scan("line-graph:*")) await ctx.cache.del(key);
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
});

async function seedPoll(title: string, overrides: Partial<Poll> = {}): Promise<Poll> {
  const poll = makePoll({
    _id: randomUUID(),
    title,
    subtitle: `${title} subtitle`,
    choices: [
      { id: "c1", label: "Yes", position: 0 },
      { id: "c2", label: "No", position: 1 },
      { id: "c3", label: "Maybe", position: 2, color: "#0808FD" }
    ],
    ...overrides
  });
  await polls(ctx).insertOne(poll);
  return poll;
}

async function seedHistory(pid: string): Promise<void> {
  const rows = [
    { email: "a@example.com", choiceIds: ["c1"], agoMs: 3 * HOUR },
    { email: "b@example.com", choiceIds: ["c1"], agoMs: 2 * HOUR },
    { email: "c@example.com", choiceIds: ["c2"], agoMs: 1.5 * HOUR },
    { email: "d@example.com", choiceIds: ["c3"], agoMs: HOUR }
  ];
  for (const row of rows) {
    await voteHistory(ctx).insertOne({ pid, emailAddress: row.email, userName: "", choiceIds: row.choiceIds, votedAt: new Date(Date.now() - row.agoMs) });
  }
}

const sweeps = async () => {
  await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
  await newestSweep(ctx, ctx.config, ctx.newestPublisher);
};

async function open(): Promise<BrowserPage> {
  const opened = await openPage(ctx, "index.html", {
    scripts: SCRIPTS,
    beforeScripts: (window) => {
      Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
      window.scrollTo = (() => {}) as typeof window.scrollTo;
    }
  });
  await opened.settle(50);
  return opened;
}

function cardByTitle(p: BrowserPage, title: string): HTMLElement {
  const card = Array.from(p.document.querySelectorAll(".card-viewport")).find(
    (viewport) => viewport.querySelector(".card-front .question")!.textContent === title
  );
  if (!card) throw new Error(`No card titled ${title}`);
  return card as HTMLElement;
}

async function maximize(p: BrowserPage, title: string): Promise<HTMLElement> {
  (cardByTitle(p, title).querySelector(".maximize-btn") as HTMLElement).click();
  await p.settle(50);
  return p.document.querySelector(".maximized-card-grid:not([hidden]) .maximized-space-right") as HTMLElement;
}

/** Makes every line-graph fetch answer as told; other requests pass through. */
function stubLineGraph(p: BrowserPage, answer: "404" | "fail"): void {
  const real = p.window.fetch;
  p.window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).includes("/line-graph")) {
      if (answer === "fail") return Promise.reject(new TypeError("Failed to fetch"));
      return Promise.resolve({ ok: false, status: 404, json: async () => ({ error: "Not found" }) } as unknown as Response);
    }
    return real(input, init);
  }) as typeof fetch;
}

const noteText = (side: HTMLElement) => side.querySelector(".line-graph-note")?.textContent ?? null;

type ServedScale = { buckets: number[]; series: { label: string; points: number[] }[] };

/** One scale of the body the route serves for a poll; its default scale when none is named. */
async function servedScale(pid: string, scale?: string): Promise<ServedScale> {
  const body = (await request(ctx.app).get(`/api/polls/${pid}/line-graph`)).body;
  return body.scales[scale ?? body.defaultScale];
}

describe("mount (C1, C2, C4, C5, FR-018)", () => {
  it("renders title, subtitle, legend and the SVG in the right column", async () => {
    const poll = await seedPoll("Graphed");
    await seedHistory(poll._id);
    await sweeps();
    page = await open();
    const side = await maximize(page, "Graphed");

    expect(side.querySelector(".line-graph-title")!.textContent).toBe("Graphed");
    expect(side.querySelector(".line-graph-subtitle")!.textContent).toBe("Graphed subtitle");

    const svg = side.querySelector("svg.line-graph-svg")!;
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toContain("Graphed");

    const entries = side.querySelectorAll(".line-graph-legend-entry");
    expect(entries.length).toBe(3);
    for (const entry of entries) {
      expect(entry.closest("svg")).toBeNull();
      expect(entry.textContent!.trim().length).toBeGreaterThan(0);
    }
  });

  it("shows each drawn line's current percentage and the total vote count in the legend", async () => {
    const poll = await seedPoll("Counted");
    await seedHistory(poll._id);
    await sweeps();
    page = await open();
    const side = await maximize(page, "Counted");

    const byLabel = Object.fromEntries(
      Array.from(side.querySelectorAll(".line-graph-legend-entry")).map((entry) => [
        entry.querySelector(".line-graph-legend-label")!.textContent,
        entry.querySelector(".line-graph-legend-pct")!.textContent
      ])
    );
    expect(byLabel).toEqual({ Yes: "50%", No: "25%", Maybe: "25%" });
    expect(side.querySelector(".line-graph-total")!.textContent).toBe("4 votes");
  });

  it("strokes each polyline with the manual hex when present, else the card's own colour", async () => {
    const poll = await seedPoll("Coloured");
    await seedHistory(poll._id);
    await sweeps();
    page = await open();
    const side = await maximize(page, "Coloured");

    const strokes = Object.fromEntries(
      Array.from(side.querySelectorAll("polyline.line-graph-line")).map((line) => [line.getAttribute("data-choice-id"), line.getAttribute("stroke")])
    );
    // Yes/No take the card's fixed semantic colours; Maybe carries its manual hex.
    expect(strokes).toEqual({ c1: "#006120", c2: "#F91010", c3: "#0808FD" });
  });
});

describe("placeholders and unmount (C6, C9, C1)", () => {
  it("renders the sparse-data placeholder for a poll with fewer than two buckets", async () => {
    await seedPoll("Sparse");
    await sweeps();
    page = await open();
    const side = await maximize(page, "Sparse");
    expect(noteText(side)).toBe("Not enough voting data to graph yet");
    expect(side.querySelector("svg.line-graph-svg")).toBeNull();
    expect(side.querySelector(".line-graph-title")!.textContent).toBe("Sparse");
  });

  it("renders the results-unavailable note on a 404", async () => {
    await seedPoll("Hidden");
    await sweeps();
    page = await open();
    stubLineGraph(page, "404");
    const side = await maximize(page, "Hidden");
    expect(noteText(side)).toBe("Results are not available yet");
    expect(side.querySelector("svg.line-graph-svg")).toBeNull();
  });

  it("renders the quiet unavailable placeholder on a failed first load", async () => {
    await seedPoll("Flaky");
    await sweeps();
    page = await open();
    stubLineGraph(page, "fail");
    const side = await maximize(page, "Flaky");
    expect(noteText(side)).toBe("Graph unavailable right now");
    expect(side.querySelector("svg.line-graph-svg")).toBeNull();
  });

  it("empties the column on unmount", async () => {
    const poll = await seedPoll("Closable");
    await seedHistory(poll._id);
    await sweeps();
    page = await open();
    const side = await maximize(page, "Closable");
    expect(side.childElementCount).toBeGreaterThan(0);
    (cardByTitle(page, "Closable").querySelector(".maximize-btn") as HTMLElement).click();
    await page.settle(50);
    expect(side.childElementCount).toBe(0);
    expect(side.textContent!.trim()).toBe("");
  });
});

describe("scale selector (C3, C5)", () => {
  const scaleButtons = (side: HTMLElement) => Array.from(side.querySelectorAll(".line-graph-scales .line-graph-scale")) as HTMLButtonElement[];
  const selected = (side: HTMLElement) => scaleButtons(side).filter((b) => b.getAttribute("aria-pressed") === "true");
  const xLabels = (side: HTMLElement) =>
    Array.from(side.querySelectorAll("svg.line-graph-svg text"))
      .map((t) => t.textContent!)
      .filter((text) => !text.endsWith("%"));

  /** The labels the renderer should draw for a served series. */
  function expectedLabels(buckets: number[], hourly: boolean): string[] {
    const format = new Intl.DateTimeFormat(undefined, hourly ? { hour: "numeric" } : { month: "short", day: "numeric" });
    const step = Math.max(1, Math.round(buckets.length / 6));
    const out: string[] = [];
    for (let i = 0; i < buckets.length - 1; i += step) out.push(format.format(new Date(buckets[i]!)));
    return out;
  }

  it("renders only the available scales, with the served one selected", async () => {
    const young = await seedPoll("Young");
    await voteHistory(ctx).insertOne({ pid: young._id, emailAddress: "a@example.com", userName: "", choiceIds: ["c1"], votedAt: new Date(Date.now() - 2 * HOUR) });
    await voteHistory(ctx).insertOne({ pid: young._id, emailAddress: "b@example.com", userName: "", choiceIds: ["c2"], votedAt: new Date(Date.now() - HOUR) });
    await sweeps();
    page = await open();
    const side = await maximize(page, "Young");
    expect(scaleButtons(side).map((b) => b.textContent)).toEqual(["1 Day"]);
    expect(selected(side).map((b) => b.textContent)).toEqual(["1 Day"]);
  });

  it("offers all four on an old poll, selects the served default, and redraws on a click without a request", async () => {
    const old = await seedPoll("Spanning");
    await voteHistory(ctx).insertOne({ pid: old._id, emailAddress: "a@example.com", userName: "", choiceIds: ["c1"], votedAt: new Date(Date.now() - 32 * 24 * HOUR) });
    await voteHistory(ctx).insertOne({ pid: old._id, emailAddress: "b@example.com", userName: "", choiceIds: ["c2"], votedAt: new Date(Date.now() - 2 * HOUR) });
    await sweeps();
    page = await open();
    const side = await maximize(page, "Spanning");

    expect(scaleButtons(side).map((b) => b.textContent)).toEqual(["1 Day", "1 Week", "1 Month", "1 Year"]);
    expect(selected(side).map((b) => b.textContent)).toEqual(["1 Year"]);
    expect(selected(side)[0]!.classList.contains("is-selected")).toBe(true);

    const yearly = await servedScale(old._id, "1y");
    expect(xLabels(side)).toEqual(expectedLabels(yearly.buckets, false));
    const fetchedBefore = page.requests.filter((r) => r.url.includes("/line-graph")).length;

    scaleButtons(side).find((b) => b.textContent === "1 Day")!.click();
    await page.settle(50);
    expect(page.requests.filter((r) => r.url.includes("/line-graph")).length).toBe(fetchedBefore);
    expect(selected(side).map((b) => b.textContent)).toEqual(["1 Day"]);

    const daily = await servedScale(old._id, "1d");
    expect(xLabels(side)).toEqual(expectedLabels(daily.buckets, true));
  });
});

describe("crosshair (C7)", () => {
  const tooltip = (side: HTMLElement) => side.querySelector(".line-graph-tooltip");
  const crosshair = (side: HTMLElement) => side.querySelector("svg.line-graph-svg .line-graph-crosshair");

  /** jsdom gives the SVG a zero-size rect, so the renderer reads clientX as a viewBox coordinate: 0 is the oldest bucket, 320 the newest. */
  function pointer(p: BrowserPage, side: HTMLElement, type: string, clientX: number): void {
    side.querySelector("svg.line-graph-svg")!.dispatchEvent(new p.window.MouseEvent(type, { clientX, bubbles: true }));
  }

  /** The tooltip's time line: date and hour on hourly scales, date (with year) on daily ones. */
  function timeText(bucketMs: number, hourly: boolean): string {
    const options: Intl.DateTimeFormatOptions = hourly ? { month: "short", day: "numeric", hour: "numeric" } : { year: "numeric", month: "short", day: "numeric" };
    return new Intl.DateTimeFormat(undefined, options).format(new Date(bucketMs));
  }


  it("shows every drawn choice and the time once at the nearest bucket on pointermove", async () => {
    const poll = await seedPoll("Hover");
    await seedHistory(poll._id);
    await sweeps();
    page = await open();
    const side = await maximize(page, "Hover");
    const served = await servedScale(poll._id);
    const last = served.buckets.length - 1;

    pointer(page, side, "pointermove", 320);
    expect(crosshair(side)).not.toBeNull();
    const tip = tooltip(side)!;
    expect(tip.querySelectorAll(".line-graph-tooltip-time").length).toBe(1);
    expect(tip.querySelector(".line-graph-tooltip-time")!.textContent).toBe(timeText(served.buckets[last]!, true));
    const entries = Array.from(tip.querySelectorAll(".line-graph-tooltip-entry"));
    expect(entries.map((entry) => entry.querySelector(".line-graph-tooltip-label")!.textContent)).toEqual(served.series.map((s) => s.label));
    expect(entries.map((entry) => entry.querySelector(".line-graph-tooltip-pct")!.textContent)).toEqual(served.series.map((s) => `${s.points[last]}%`));

    pointer(page, side, "pointermove", 0);
    const moved = tooltip(side)!;
    expect(moved.querySelector(".line-graph-tooltip-time")!.textContent).toBe(timeText(served.buckets[0]!, true));
    expect(Array.from(moved.querySelectorAll(".line-graph-tooltip-pct")).map((pct) => pct.textContent)).toEqual(served.series.map((s) => `${s.points[0]}%`));
  });

  it("omits the hour from the time on daily scales", async () => {
    const old = await seedPoll("Daily");
    await voteHistory(ctx).insertOne({ pid: old._id, emailAddress: "a@example.com", userName: "", choiceIds: ["c1"], votedAt: new Date(Date.now() - 32 * 24 * HOUR) });
    await voteHistory(ctx).insertOne({ pid: old._id, emailAddress: "b@example.com", userName: "", choiceIds: ["c2"], votedAt: new Date(Date.now() - 2 * HOUR) });
    await sweeps();
    page = await open();
    const side = await maximize(page, "Daily");
    const served = await servedScale(old._id);

    pointer(page, side, "pointermove", 320);
    expect(tooltip(side)!.querySelector(".line-graph-tooltip-time")!.textContent).toBe(timeText(served.buckets[served.buckets.length - 1]!, false));
  });

  it("removes the crosshair on pointerleave", async () => {
    const poll = await seedPoll("Leave");
    await seedHistory(poll._id);
    await sweeps();
    page = await open();
    const side = await maximize(page, "Leave");

    pointer(page, side, "pointermove", 160);
    expect(crosshair(side)).not.toBeNull();
    expect(tooltip(side)).not.toBeNull();
    pointer(page, side, "pointerleave", 160);
    expect(crosshair(side)).toBeNull();
    expect(tooltip(side)).toBeNull();
  });

  it("places the crosshair on pointerdown (touch)", async () => {
    const poll = await seedPoll("Touch");
    await seedHistory(poll._id);
    await sweeps();
    page = await open();
    const side = await maximize(page, "Touch");
    const served = await servedScale(poll._id);

    pointer(page, side, "pointerdown", 0);
    expect(crosshair(side)).not.toBeNull();
    expect(tooltip(side)!.querySelector(".line-graph-tooltip-time")!.textContent).toBe(timeText(served.buckets[0]!, true));
  });
});

describe("auto refresh (C8, C9)", () => {
  const INTERVAL = 40;

  /** The module reads the interval from window.SiteConfig at mount, so a stub set before maximize drives the timer. */
  function stubInterval(p: BrowserPage): void {
    (p.window as unknown as { SiteConfig: Promise<{ lineGraphRefreshIntervalMs: number }> }).SiteConfig = Promise.resolve({ lineGraphRefreshIntervalMs: INTERVAL });
  }

  /** Counts line-graph fetches, answering them as told; everything else passes through. */
  function countLineGraph(p: BrowserPage, answer?: "404" | "fail"): { calls: () => number } {
    const real = p.window.fetch;
    let calls = 0;
    p.window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/line-graph")) {
        calls += 1;
        if (answer === "fail") return Promise.reject(new TypeError("Failed to fetch"));
        if (answer === "404") return Promise.resolve({ ok: false, status: 404, json: async () => ({ error: "Not found" }) } as unknown as Response);
      }
      return real(input, init);
    }) as typeof fetch;
    return { calls: () => calls };
  }

  it("keeps the scale the viewer chose across a tick", async () => {
    const old = await seedPoll("Chosen");
    await voteHistory(ctx).insertOne({ pid: old._id, emailAddress: "a@example.com", userName: "", choiceIds: ["c1"], votedAt: new Date(Date.now() - 32 * 24 * HOUR) });
    await voteHistory(ctx).insertOne({ pid: old._id, emailAddress: "b@example.com", userName: "", choiceIds: ["c2"], votedAt: new Date(Date.now() - 2 * HOUR) });
    await sweeps();
    page = await open();
    stubInterval(page);
    const side = await maximize(page, "Chosen");
    const pressed = () =>
      Array.from(side.querySelectorAll(".line-graph-scales .line-graph-scale"))
        .filter((b) => b.getAttribute("aria-pressed") === "true")
        .map((b) => b.textContent);

    (Array.from(side.querySelectorAll(".line-graph-scales .line-graph-scale")).find((b) => b.textContent === "1 Week") as HTMLElement).click();
    const before = page.requests.filter((r) => r.url.includes("/line-graph")).length;
    await page.settle(4 * INTERVAL);
    expect(page.requests.filter((r) => r.url.includes("/line-graph")).length).toBeGreaterThan(before);
    expect(pressed()).toEqual(["1 Week"]);
  });

  it("refetches on each tick and redraws the legend from the new series", async () => {
    const poll = await seedPoll("Ticking");
    await seedHistory(poll._id);
    await sweeps();
    page = await open();
    stubInterval(page);
    const side = await maximize(page, "Ticking");

    const before = page.requests.filter((r) => r.url.includes("/line-graph")).length;
    await page.settle(4 * INTERVAL);
    const ticks = page.requests.filter((r) => r.url.includes("/line-graph"));
    expect(ticks.length).toBeGreaterThan(before);
    expect(ticks[ticks.length - 1]!.url).toBe(`/api/polls/${poll._id}/line-graph`);

    // A fifth voter lands and the cache expires: the next tick redraws the legend.
    await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "e@example.com", userName: "", choiceIds: ["c2"], votedAt: new Date() });
    for (const key of await ctx.cache.scan("line-graph:*")) await ctx.cache.del(key);
    await page.settle(4 * INTERVAL);
    expect(side.querySelector(".line-graph-total")!.textContent).toBe("5 votes");
    const byLabel = Object.fromEntries(
      Array.from(side.querySelectorAll(".line-graph-legend-entry")).map((entry) => [
        entry.querySelector(".line-graph-legend-label")!.textContent,
        entry.querySelector(".line-graph-legend-pct")!.textContent
      ])
    );
    expect(byLabel).toEqual({ Yes: "40%", No: "40%", Maybe: "20%" });
  });

  it("keeps the last drawn graph through a failed tick", async () => {
    const poll = await seedPoll("Steady");
    await seedHistory(poll._id);
    await sweeps();
    page = await open();
    stubInterval(page);
    const side = await maximize(page, "Steady");
    expect(side.querySelector("svg.line-graph-svg")).not.toBeNull();

    const counter = countLineGraph(page, "fail");
    await page.settle(4 * INTERVAL);
    expect(counter.calls()).toBeGreaterThan(0);
    expect(side.querySelector("svg.line-graph-svg")).not.toBeNull();
    expect((side.querySelector(".line-graph-note") as HTMLElement).hidden).toBe(true);
    expect(side.querySelector(".line-graph-total")!.textContent).toBe("4 votes");
  });

  it("stops the timer after a 404 tick and shows the results-unavailable note", async () => {
    const poll = await seedPoll("Gone");
    await seedHistory(poll._id);
    await sweeps();
    page = await open();
    stubInterval(page);
    const side = await maximize(page, "Gone");

    const counter = countLineGraph(page, "404");
    await page.settle(4 * INTERVAL);
    expect(noteText(side)).toBe("Results are not available yet");
    expect(side.querySelector("svg.line-graph-svg")).toBeNull();
    const after = counter.calls();
    await page.settle(4 * INTERVAL);
    expect(counter.calls()).toBe(after);
  });

  it("clears the timer on unmount", async () => {
    const poll = await seedPoll("Stopped");
    await seedHistory(poll._id);
    await sweeps();
    page = await open();
    stubInterval(page);
    await maximize(page, "Stopped");

    const counter = countLineGraph(page);
    (cardByTitle(page, "Stopped").querySelector(".maximize-btn") as HTMLElement).click();
    await page.settle(50);
    const after = counter.calls();
    await page.settle(4 * INTERVAL);
    expect(counter.calls()).toBe(after);
  });
});

