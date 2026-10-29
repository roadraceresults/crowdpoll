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

async function open(beforeScripts?: (window: Window) => void): Promise<BrowserPage> {
  const opened = await openPage(ctx, "index.html", {
    scripts: SCRIPTS,
    beforeScripts: (window) => {
      Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
      window.scrollTo = (() => {}) as typeof window.scrollTo;
      beforeScripts?.(window as unknown as Window);
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
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.hasAttribute("role")).toBe(false);
    expect(svg.hasAttribute("aria-label")).toBe(false);
    const plot = side.querySelector(".line-graph-plot")!;
    expect(plot.getAttribute("role")).toBe("group");
    expect(plot.getAttribute("aria-label")).toContain("Graphed");

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

/** jsdom has no matchMedia: a stand-in that records the dark-scheme query's `change` listeners so a test can switch the scheme. */
function fakeColorScheme(): { install: (window: Window) => void; listeners: (() => void)[] } {
  const listeners: (() => void)[] = [];
  return {
    listeners,
    install: (window) => {
      window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (type: string, listener: () => void) => {
          if (type === "change" && query === "(prefers-color-scheme: dark)") listeners.push(listener);
        },
        removeEventListener: (type: string, listener: () => void) => {
          const at = listeners.indexOf(listener);
          if (type === "change" && at >= 0) listeners.splice(at, 1);
        }
      })) as unknown as typeof window.matchMedia;
    }
  };
}

/** The maximized panel is cloned from its template at the first maximize, so its first-draw surface is set there. */
function setPanelSurface(p: BrowserPage, color: string): void {
  const template = p.document.getElementById("maximizedCardGrid") as HTMLTemplateElement;
  (template.content.querySelector(".maximized-space-right") as HTMLElement).style.backgroundColor = color;
}

const lineStroke = (side: HTMLElement, choiceId: string) =>
  side.querySelector(`polyline.line-graph-line[data-choice-id="${choiceId}"]`)!.getAttribute("stroke")!.toUpperCase();
const legendDots = (side: HTMLElement) => Array.from(side.querySelectorAll(".line-graph-legend .line-graph-dot")) as HTMLElement[];

describe("line colours per theme (C2)", () => {
  it("draws a colour that already reaches 3:1 on the light surface unchanged", async () => {
    const poll = await seedPoll("Light");
    await seedHistory(poll._id);
    await sweeps();
    page = await open();
    setPanelSurface(page, "rgb(255, 255, 255)");
    const side = await maximize(page, "Light");

    expect(lineStroke(side, "c3")).toBe("#0808FD");
    expect(legendDots(side)[2]!.style.background).toBe("rgb(8, 8, 253)");
  });

  it("shades a colour under 3:1 on the dark surface, the same in the line, legend dot and tooltip dot", async () => {
    const poll = await seedPoll("Dark");
    await seedHistory(poll._id);
    await sweeps();
    const scheme = fakeColorScheme();
    page = await open(scheme.install);
    setPanelSurface(page, "rgb(15, 21, 17)");
    const side = await maximize(page, "Dark");

    expect(lineStroke(side, "c3")).toBe("#4444FD");
    expect(lineStroke(side, "c1")).toBe("#007527");
    expect(legendDots(side)[2]!.style.background).toBe("rgb(68, 68, 253)");
    side.querySelector("svg.line-graph-svg")!.dispatchEvent(new page.window.MouseEvent("pointermove", { clientX: 320, bubbles: true }));
    const tooltipDots = Array.from(side.querySelectorAll(".line-graph-tooltip .line-graph-dot")) as HTMLElement[];
    expect(tooltipDots[2]!.style.background).toBe("rgb(68, 68, 253)");
  });

  it("redraws for the new theme when the device's colour scheme changes, and stops listening on close", async () => {
    const poll = await seedPoll("Switch");
    await seedHistory(poll._id);
    await sweeps();
    const scheme = fakeColorScheme();
    page = await open(scheme.install);
    setPanelSurface(page, "rgb(15, 21, 17)");
    const side = await maximize(page, "Switch");
    expect(lineStroke(side, "c3")).toBe("#4444FD");
    const dotBefore = legendDots(side)[2];

    side.style.backgroundColor = "rgb(255, 255, 255)";
    for (const listener of [...scheme.listeners]) listener();
    await page.settle(10);
    expect(lineStroke(side, "c3")).toBe("#0808FD");
    expect(legendDots(side)[2]).not.toBe(dotBefore);
    expect(scheme.listeners.length).toBeGreaterThan(0);

    (cardByTitle(page, "Switch").querySelector(".maximize-btn") as HTMLElement).click();
    await page.settle(50);
    expect(scheme.listeners.length).toBe(0);
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
  const scaleButtons = (side: HTMLElement) => Array.from(side.querySelectorAll(".line-graph-scales .line-graph-segment")) as HTMLButtonElement[];
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
    expect((side.querySelector(".line-graph-scales") as HTMLElement).hidden).toBe(false);
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
    expect(selected(side)[0]!.querySelector("svg.line-graph-segment-icon")!.getAttribute("aria-hidden")).toBe("true");
    expect(scaleButtons(side).filter((b) => b.querySelector(".line-graph-segment-icon")).length).toBe(1);
    expect(side.querySelector(".line-graph-scale, .is-selected")).toBeNull();
    const group = side.querySelector(".line-graph-scales")!;
    expect(group.getAttribute("role")).toBe("group");
    expect(group.getAttribute("aria-label")).toBe("Time scale");

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

  /** jsdom lays nothing out: the plot and the tooltip are given widths, every other element keeps jsdom's 0. */
  function stubWidths(p: BrowserPage, plotWidth: number, tooltipWidth = 100): void {
    Object.defineProperty(p.window.HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get(this: HTMLElement) {
        return this.classList.contains("line-graph-plot") ? plotWidth : 0;
      }
    });
    Object.defineProperty(p.window.HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get(this: HTMLElement) {
        return this.classList.contains("line-graph-tooltip") ? tooltipWidth : 0;
      }
    });
  }

  /** The crosshair's x in plot pixels: the SVG is 320 viewBox units wide while the panel reports no width. */
  const crosshairPx = (side: HTMLElement, plotWidth: number) => (Number(crosshair(side)!.getAttribute("x1")) / 320) * plotWidth;

  it("opens the tooltip right of the crosshair, flips it left near the right edge, and keeps it inside the plot", async () => {
    const poll = await seedPoll("Placed");
    await seedHistory(poll._id);
    await sweeps();
    page = await open();
    const side = await maximize(page, "Placed");
    stubWidths(page, 400);

    pointer(page, side, "pointermove", 0);
    let tip = tooltip(side) as HTMLElement;
    expect(tip.style.left).toBe(`${crosshairPx(side, 400) + 12}px`);
    expect(tip.style.top).toBe("8px");
    expect(tip.style.transform).toBe("");

    pointer(page, side, "pointermove", 320);
    tip = tooltip(side) as HTMLElement;
    expect(tip.style.left).toBe(`${crosshairPx(side, 400) - 12 - 100}px`);
    expect(tip.style.transform).toBe("");

    stubWidths(page, 110);
    pointer(page, side, "pointermove", 0);
    expect((tooltip(side) as HTMLElement).style.left).toBe("0px");
    pointer(page, side, "pointermove", 320);
    expect((tooltip(side) as HTMLElement).style.left).toBe("0px");
  });

  it("rings a marker on every line at the crosshair, after the lines, and strengthens the 0% grid line", async () => {
    const poll = await seedPoll("Marked");
    await seedHistory(poll._id);
    await sweeps();
    page = await open();
    const side = await maximize(page, "Marked");
    const svg = side.querySelector("svg.line-graph-svg")!;

    const baselines = svg.querySelectorAll("line.line-graph-grid.line-graph-baseline");
    expect(baselines.length).toBe(1);
    const zeroLabel = Array.from(svg.querySelectorAll("text")).find((t) => t.textContent === "0%")!;
    expect(baselines[0]!.getAttribute("y1")).toBe(zeroLabel.getAttribute("y"));

    pointer(page, side, "pointermove", 160);
    const lines = Array.from(svg.querySelectorAll("polyline.line-graph-line"));
    const markers = Array.from(svg.querySelectorAll("circle.line-graph-marker"));
    expect(markers.length).toBe(lines.length);
    markers.forEach((marker, i) => {
      expect(marker.getAttribute("r")).toBe("4");
      expect(marker.getAttribute("fill")).toBe(lines[i]!.getAttribute("stroke"));
      expect(lines[lines.length - 1]!.compareDocumentPosition(marker) & page!.window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    pointer(page, side, "pointerleave", 160);
    expect(svg.querySelectorAll("circle.line-graph-marker").length).toBe(0);
  });

  /** A pointer event jsdom builds without a pointer type, given one. */
  function touch(p: BrowserPage, target: Element, type: string, clientX: number): void {
    const event = new p.window.MouseEvent(type, { clientX, bubbles: true });
    Object.defineProperty(event, "pointerType", { value: "touch" });
    target.dispatchEvent(event);
  }

  it("keeps a touch-placed crosshair after the finger lifts, until a press outside the plot", async () => {
    const poll = await seedPoll("Kept");
    await seedHistory(poll._id);
    await sweeps();
    page = await open();
    const side = await maximize(page, "Kept");
    const svg = side.querySelector("svg.line-graph-svg")!;

    touch(page, svg, "pointerdown", 160);
    touch(page, svg, "pointerleave", 160);
    expect(crosshair(side)).not.toBeNull();
    expect(tooltip(side)).not.toBeNull();

    touch(page, tooltip(side)!, "pointerdown", 160);
    expect(crosshair(side)).not.toBeNull();

    touch(page, page.document.body, "pointerdown", 0);
    expect(crosshair(side)).toBeNull();
    expect(tooltip(side)).toBeNull();
  });

  it("hides the crosshair when the scale changes", async () => {
    const old = await seedPoll("Rescaled");
    await voteHistory(ctx).insertOne({ pid: old._id, emailAddress: "a@example.com", userName: "", choiceIds: ["c1"], votedAt: new Date(Date.now() - 32 * 24 * HOUR) });
    await voteHistory(ctx).insertOne({ pid: old._id, emailAddress: "b@example.com", userName: "", choiceIds: ["c2"], votedAt: new Date(Date.now() - 2 * HOUR) });
    await sweeps();
    page = await open();
    const side = await maximize(page, "Rescaled");

    pointer(page, side, "pointermove", 160);
    expect(crosshair(side)).not.toBeNull();
    (Array.from(side.querySelectorAll(".line-graph-segment")).find((b) => b.textContent === "1 Day") as HTMLElement).click();
    await page.settle(10);
    expect(crosshair(side)).toBeNull();
    expect(tooltip(side)).toBeNull();
  });
});

describe("keyboard (C3, C4, FR-015–FR-018)", () => {
  const segments = (side: HTMLElement) => Array.from(side.querySelectorAll(".line-graph-segment")) as HTMLButtonElement[];
  const plotOf = (side: HTMLElement) => side.querySelector(".line-graph-plot") as HTMLElement;
  const tooltipTime = (side: HTMLElement) => side.querySelector(".line-graph-tooltip .line-graph-tooltip-time")?.textContent ?? null;
  const hourly = (bucketMs: number) => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric" }).format(new Date(bucketMs));

  function press(p: BrowserPage, key: string): KeyboardEvent {
    const event = new p.window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
    (p.document.activeElement ?? p.document.body).dispatchEvent(event);
    return event;
  }

  async function spanningPoll(title: string): Promise<void> {
    const old = await seedPoll(title);
    await voteHistory(ctx).insertOne({ pid: old._id, emailAddress: "a@example.com", userName: "", choiceIds: ["c1"], votedAt: new Date(Date.now() - 32 * 24 * HOUR) });
    await voteHistory(ctx).insertOne({ pid: old._id, emailAddress: "b@example.com", userName: "", choiceIds: ["c2"], votedAt: new Date(Date.now() - 2 * HOUR) });
    await sweeps();
  }

  it("moves focus between segments with Left and Right, wrapping, without selecting, as one Tab stop", async () => {
    await spanningPoll("Roving");
    page = await open();
    const side = await maximize(page, "Roving");
    const tabStops = () => segments(side).filter((b) => b.tabIndex === 0).map((b) => b.dataset.scale);
    const pressed = () => segments(side).filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.scale);
    expect(tabStops()).toEqual(["1y"]);

    segments(side).find((b) => b.dataset.scale === "1y")!.focus();
    expect(press(page, "ArrowRight").defaultPrevented).toBe(true);
    expect((page.document.activeElement as HTMLElement).dataset.scale).toBe("1d");
    expect(tabStops()).toEqual(["1d"]);
    press(page, "ArrowLeft");
    expect((page.document.activeElement as HTMLElement).dataset.scale).toBe("1y");
    press(page, "ArrowLeft");
    expect((page.document.activeElement as HTMLElement).dataset.scale).toBe("1m");
    expect(pressed()).toEqual(["1y"]);
  });

  it("makes the plot one labelled Tab stop and shows and announces the newest point on focus", async () => {
    const poll = await seedPoll("Focused");
    await seedHistory(poll._id);
    await sweeps();
    page = await open();
    const side = await maximize(page, "Focused");
    const served = await servedScale(poll._id);
    const plot = plotOf(side);
    const live = side.querySelector(".line-graph-live") as HTMLElement;

    expect(plot.getAttribute("tabindex")).toBe("0");
    expect(plot.getAttribute("role")).toBe("group");
    expect(plot.getAttribute("aria-label")).toBe("Vote share over time for Focused. Use the Left and Right arrow keys to read the values.");
    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(live.closest(".line-graph")).not.toBeNull();
    expect(plot.contains(live)).toBe(false);

    const last = served.buckets.length - 1;
    plot.focus();
    expect(tooltipTime(side)).toBe(hourly(served.buckets[last]!));
    const spoken = (i: number) => [hourly(served.buckets[i]!), ...served.series.map((s) => `${s.label} ${s.points[i]}%`)].join(", ");
    expect(live.textContent).toBe(spoken(last));

    expect(press(page, "ArrowLeft").defaultPrevented).toBe(true);
    expect(tooltipTime(side)).toBe(hourly(served.buckets[last - 1]!));
    expect(live.textContent).toBe(spoken(last - 1));
    expect(press(page, "Home").defaultPrevented).toBe(true);
    expect(tooltipTime(side)).toBe(hourly(served.buckets[0]!));
    press(page, "ArrowLeft");
    expect(tooltipTime(side)).toBe(hourly(served.buckets[0]!));
    expect(press(page, "End").defaultPrevented).toBe(true);
    expect(tooltipTime(side)).toBe(hourly(served.buckets[last]!));
    press(page, "ArrowRight");
    expect(tooltipTime(side)).toBe(hourly(served.buckets[last]!));

    expect(press(page, "Escape").defaultPrevented).toBe(true);
    expect(tooltipTime(side)).toBeNull();
    expect(page.document.querySelector(".maximized-card-grid:not([hidden]) .line-graph")).not.toBeNull();
    plot.blur();
    plot.focus();
    expect(tooltipTime(side)).not.toBeNull();
    plot.blur();
    expect(tooltipTime(side)).toBeNull();
    expect(side.querySelector(".line-graph-crosshair")).toBeNull();
  });

  it("keeps a pointer-pressed point on focus, and a later focus from the keyboard goes to the newest", async () => {
    const poll = await seedPoll("Pressed");
    await seedHistory(poll._id);
    await sweeps();
    page = await open();
    const side = await maximize(page, "Pressed");
    const served = await servedScale(poll._id);
    const plot = plotOf(side);
    const svg = side.querySelector("svg.line-graph-svg")!;
    const last = served.buckets.length - 1;

    svg.dispatchEvent(new page.window.MouseEvent("pointerdown", { clientX: 0, bubbles: true }));
    plot.focus();
    expect(tooltipTime(side)).toBe(hourly(served.buckets[0]!));
    plot.blur();
    plot.focus();
    expect(tooltipTime(side)).toBe(hourly(served.buckets[last]!));

    // A click on a plot that already has focus fires no focus event; the flag must not survive the blur.
    svg.dispatchEvent(new page.window.MouseEvent("pointerdown", { clientX: 0, bubbles: true }));
    plot.blur();
    plot.focus();
    expect(tooltipTime(side)).toBe(hourly(served.buckets[last]!));
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
      Array.from(side.querySelectorAll(".line-graph-scales .line-graph-segment"))
        .filter((b) => b.getAttribute("aria-pressed") === "true")
        .map((b) => b.textContent);

    (Array.from(side.querySelectorAll(".line-graph-scales .line-graph-segment")).find((b) => b.textContent === "1 Week") as HTMLElement).click();
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

  const tooltipTime = (side: HTMLElement) => side.querySelector(".line-graph-tooltip .line-graph-tooltip-time")?.textContent ?? null;
  const hover = (p: BrowserPage, side: HTMLElement, clientX: number) =>
    side.querySelector("svg.line-graph-svg")!.dispatchEvent(new p.window.MouseEvent("pointermove", { clientX, bubbles: true }));

  it("keeps the crosshair at the same point in time across a refresh", async () => {
    const poll = await seedPoll("Held");
    await seedHistory(poll._id);
    await sweeps();
    page = await open();
    stubInterval(page);
    const side = await maximize(page, "Held");

    hover(page, side, 0);
    const placed = tooltipTime(side);
    expect(placed).not.toBeNull();
    const before = page.requests.filter((r) => r.url.includes("/line-graph")).length;
    await page.settle(4 * INTERVAL);
    expect(page.requests.filter((r) => r.url.includes("/line-graph")).length).toBeGreaterThan(before);
    expect(tooltipTime(side)).toBe(placed);
  });

  it("moves the crosshair to the newest point when its time is gone after a refresh", async () => {
    const poll = await seedPoll("Shifted");
    await seedHistory(poll._id);
    await sweeps();
    page = await open();
    stubInterval(page);
    const side = await maximize(page, "Shifted");
    hover(page, side, 0);
    const placed = tooltipTime(side);

    // The next responses start one bucket later, so the crosshair's time no longer exists.
    const real = page.window.fetch;
    let newest: number | null = null;
    page.window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await real(input, init);
      if (!String(input).includes("/line-graph")) return res;
      const body = await res.json();
      for (const scale of Object.values(body.scales) as { buckets: number[]; series: { points: number[] }[] }[]) {
        scale.buckets = scale.buckets.slice(1);
        for (const series of scale.series) series.points = series.points.slice(1);
        if (scale === body.scales[body.defaultScale]) newest = scale.buckets[scale.buckets.length - 1]!;
      }
      return { ok: true, status: 200, json: async () => body } as unknown as Response;
    }) as typeof fetch;
    await page.settle(4 * INTERVAL);

    const format = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric" });
    expect(newest).not.toBeNull();
    expect(tooltipTime(side)).not.toBe(placed);
    expect(tooltipTime(side)).toBe(format.format(new Date(newest!)));
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

