/**
 * lineGraph.js in jsdom with many lines: the legend and the lines in order of
 * current share, the ten leading lines with the show-all button, the highlight
 * of one line from its legend button, and what keeps or clears a selected time
 * (contracts/ui.md U2, U4, U5, U6).
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls, voteHistory } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import { newestSweep, trendingSweep } from "../src/polls/sweeps.js";
import type { Poll } from "../src/polls/store.js";

const SCRIPTS = ["app.js", "pollCard.js", "voteClient.js", "deltaClient.js", "lineGraph.js", "tabs.js", "trending.js", "newest.js", "searchTab.js", "liveResults.js"];

const HOUR = 3_600_000;
const INTERVAL = 40;

let ctx: TestContext;
let page: BrowserPage | null = null;

beforeAll(async () => {
  // No vote threshold, so a choice with a single vote among many is still graphed.
  ctx = await startTestContext({
    ENV_MIN_MANUAL_REFRESH_INTERVAL: "1",
    ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL: "1000",
    ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE: "0"
  });
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
  for (const key of await ctx.cache.scan("pageload:*")) await ctx.cache.del(key);
});

/** A graphed poll with one choice per entry (c1 "Choice 1", …), choice i holding votesPerChoice[i] votes cast 3 hours ago. */
async function seedRanked(title: string, votesPerChoice: number[]): Promise<Poll> {
  const poll = makePoll({
    _id: randomUUID(),
    title,
    subtitle: `${title} subtitle`,
    lineGraphEnabled: true,
    choices: votesPerChoice.map((_, i) => ({ id: `c${i + 1}`, label: `Choice ${i + 1}`, position: i }))
  });
  await polls(ctx).insertOne(poll);
  const votedAt = new Date(Date.now() - 3 * HOUR);
  for (const [i, votes] of votesPerChoice.entries()) {
    for (let v = 0; v < votes; v++) {
      await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: `${randomUUID()}@example.com`, userName: "", choiceIds: [`c${i + 1}`], votedAt });
    }
  }
  await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
  await newestSweep(ctx, ctx.config, ctx.newestPublisher);
  return poll;
}

const CROWDED = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

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

async function toggleMaximized(p: BrowserPage, title: string): Promise<void> {
  (cardByTitle(p, title).querySelector(".maximize-btn") as HTMLElement).click();
  await p.settle(50);
}

async function maximize(p: BrowserPage, title: string): Promise<HTMLElement> {
  await toggleMaximized(p, title);
  return p.document.querySelector(".maximized-card-grid:not([hidden]) .maximized-graph") as HTMLElement;
}

/** The module reads the interval from window.SiteConfig at mount, so a stub set before maximize drives the timer. */
function stubInterval(p: BrowserPage): void {
  (p.window as unknown as { SiteConfig: Promise<{ lineGraphRefreshIntervalMs: number }> }).SiteConfig = Promise.resolve({ lineGraphRefreshIntervalMs: INTERVAL });
}

/** Makes every later line-graph response leave out the named choices. */
function dropSeries(p: BrowserPage, choiceIds: string[]): void {
  const real = p.window.fetch;
  p.window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await real(input, init);
    if (!String(input).includes("/line-graph")) return res;
    const body = await res.json();
    for (const scale of Object.values(body.scales) as { series: { id: string }[] }[]) {
      scale.series = scale.series.filter((series) => !choiceIds.includes(series.id));
    }
    return { ok: true, status: 200, json: async () => body } as unknown as Response;
  }) as typeof fetch;
}

const svgOf = (side: HTMLElement) => side.querySelector("svg.line-graph-svg")!;
const graphOf = (side: HTMLElement) => side.querySelector(".line-graph") as HTMLElement;
const plotOf = (side: HTMLElement) => side.querySelector(".line-graph-plot") as HTMLElement;
const legendEntries = (side: HTMLElement) => Array.from(side.querySelectorAll(".line-graph-legend-entry")) as HTMLButtonElement[];
const legendLabels = (side: HTMLElement) => legendEntries(side).map((entry) => entry.querySelector(".line-graph-legend-label")!.textContent);
const entryOf = (side: HTMLElement, choice: number) => side.querySelector(`.line-graph-legend-entry[data-choice-id="c${choice}"]`) as HTMLButtonElement;
const pressedIds = (side: HTMLElement) => legendEntries(side).filter((entry) => entry.getAttribute("aria-pressed") === "true").map((entry) => entry.dataset.choiceId);
const lines = (side: HTMLElement) => Array.from(side.querySelectorAll("polyline.line-graph-line"));
const lineIds = (side: HTMLElement) => lines(side).map((line) => line.getAttribute("data-choice-id"));
const markers = (side: HTMLElement) => Array.from(side.querySelectorAll("circle.line-graph-marker"));
const crosshair = (side: HTMLElement) => side.querySelector("svg.line-graph-svg .line-graph-crosshair");
const readoutTime = (side: HTMLElement) => side.querySelector(".line-graph-readout-time")!.textContent;
const showAllButton = (side: HTMLElement) => side.querySelector("button.line-graph-show-all") as HTMLButtonElement;
const segments = (side: HTMLElement) => Array.from(side.querySelectorAll(".line-graph-segment")) as HTMLButtonElement[];
const stored = (p: BrowserPage) => ({ local: p.window.localStorage.length, session: p.window.sessionStorage.length, cookie: p.document.cookie });

/** jsdom gives the SVG a zero-size rect, so clientX is read as a viewBox coordinate: 0 is the oldest bucket, 320 the newest. */
function pointer(p: BrowserPage, target: Element, type: string, clientX = 0): void {
  target.dispatchEvent(new p.window.MouseEvent(type, { clientX, bubbles: true }));
}

function press(p: BrowserPage, target: Element, key: string): KeyboardEvent {
  const event = new p.window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe("order (U2)", () => {
  it("orders the legend and the lines by current share, ties in choice order", async () => {
    await seedRanked("Ordered", [1, 3, 2, 3]);
    page = await open();
    const side = await maximize(page, "Ordered");

    expect(legendLabels(side)).toEqual(["Choice 2", "Choice 4", "Choice 3", "Choice 1"]);
    expect(lineIds(side)).toEqual(["c2", "c4", "c3", "c1"]);
  });
});

describe("highlight (U4, U5)", () => {
  async function picked(refreshing = false): Promise<HTMLElement> {
    await seedRanked("Picked", [5, 4, 3, 2]);
    page = await open();
    if (refreshing) stubInterval(page);
    return maximize(page, "Picked");
  }

  it("presses one entry, marks the graph and draws that line last and alone as highlighted", async () => {
    const side = await picked();
    entryOf(side, 3).click();

    expect(pressedIds(side)).toEqual(["c3"]);
    expect(legendEntries(side).every((entry) => entry.hasAttribute("aria-pressed"))).toBe(true);
    expect(graphOf(side).classList.contains("has-highlight")).toBe(true);
    expect(lineIds(side)).toEqual(["c1", "c2", "c4", "c3"]);
    expect(lines(side).filter((line) => line.classList.contains("is-highlighted")).map((line) => line.getAttribute("data-choice-id"))).toEqual(["c3"]);
    expect(lines(side).some((line) => line.hasAttribute("stroke-width"))).toBe(false);
  });

  it("clears the highlight when the same entry is activated again", async () => {
    const side = await picked();
    entryOf(side, 3).click();
    entryOf(side, 3).click();

    expect(pressedIds(side)).toEqual([]);
    expect(graphOf(side).classList.contains("has-highlight")).toBe(false);
    expect(side.querySelector(".is-highlighted")).toBeNull();
    expect(lineIds(side)).toEqual(["c1", "c2", "c3", "c4"]);
  });

  it("moves the highlight to another entry, one at a time", async () => {
    const side = await picked();
    entryOf(side, 1).click();
    entryOf(side, 2).click();

    expect(pressedIds(side)).toEqual(["c2"]);
    expect(side.querySelectorAll("polyline.is-highlighted").length).toBe(1);
  });

  it("clears the highlight on Escape on its entry and leaves Escape alone elsewhere", async () => {
    const side = await picked();
    entryOf(side, 3).click();
    expect(press(page!, entryOf(side, 3), "Escape").defaultPrevented).toBe(true);
    expect(pressedIds(side)).toEqual([]);
    expect(page!.document.querySelector(".maximized-card-grid:not([hidden]) .line-graph")).not.toBeNull();

    // An unhandled Escape is the page's: it closes the maximized view.
    entryOf(side, 3).click();
    expect(press(page!, entryOf(side, 1), "Escape").defaultPrevented).toBe(false);
  });

  it("leaves Escape alone while nothing is highlighted", async () => {
    const side = await picked();
    expect(press(page!, entryOf(side, 3), "Escape").defaultPrevented).toBe(false);
  });

  it("keeps a selected time when an entry is activated and draws that line's marker last", async () => {
    const side = await picked();
    pointer(page!, svgOf(side), "pointerdown", 0);
    const placed = readoutTime(side);
    expect(placed).not.toBe("Latest");

    pointer(page!, entryOf(side, 3), "pointerdown");
    entryOf(side, 3).click();
    expect(crosshair(side)).not.toBeNull();
    expect(readoutTime(side)).toBe(placed);
    const drawn = markers(side);
    expect(drawn.length).toBe(4);
    expect(drawn.filter((marker) => marker.classList.contains("is-highlighted"))).toEqual([drawn[3]]);
    expect(drawn[3]!.getAttribute("fill")).toBe(side.querySelector('polyline[data-choice-id="c3"]')!.getAttribute("stroke"));
  });

  it("keeps the highlight and the focused entry across a refresh", async () => {
    const side = await picked(true);
    entryOf(side, 3).click();
    entryOf(side, 3).focus();
    const before = entryOf(side, 3);
    const fetched = page!.requests.filter((r) => r.url.includes("/line-graph")).length;

    await page!.settle(4 * INTERVAL);
    expect(page!.requests.filter((r) => r.url.includes("/line-graph")).length).toBeGreaterThan(fetched);
    expect(entryOf(side, 3)).not.toBe(before);
    expect(pressedIds(side)).toEqual(["c3"]);
    expect(lineIds(side)[3]).toBe("c3");
    expect((page!.document.activeElement as HTMLElement).dataset.choiceId).toBe("c3");
  });

  it("highlights nothing on hover", async () => {
    const side = await picked();
    pointer(page!, entryOf(side, 2), "pointerenter");
    pointer(page!, entryOf(side, 2), "mouseover");

    expect(pressedIds(side)).toEqual([]);
    expect(graphOf(side).classList.contains("has-highlight")).toBe(false);
  });

  it("starts with no highlight when the view is opened again", async () => {
    const side = await picked();
    entryOf(side, 3).click();
    await toggleMaximized(page!, "Picked");
    const again = await maximize(page!, "Picked");

    expect(pressedIds(again)).toEqual([]);
    expect(graphOf(again).classList.contains("has-highlight")).toBe(false);
  });

  it("keeps the selected time when focus moves to the legend and clears it when focus moves elsewhere", async () => {
    const side = await picked();
    plotOf(side).focus();
    expect(crosshair(side)).not.toBeNull();

    entryOf(side, 2).focus();
    expect(crosshair(side)).not.toBeNull();
    expect(readoutTime(side)).not.toBe("Latest");

    segments(side)[0]!.focus();
    expect(crosshair(side)).toBeNull();
    expect(readoutTime(side)).toBe("Latest");
  });

  it("keeps the selected time when a pressed entry takes no focus and the plot only blurs", async () => {
    const side = await picked();
    plotOf(side).focus();
    pointer(page!, entryOf(side, 2), "pointerdown");
    plotOf(side).blur();

    expect(crosshair(side)).not.toBeNull();
    expect(readoutTime(side)).not.toBe("Latest");
  });

  it("stores nothing", async () => {
    const side = await picked();
    const before = stored(page!);
    entryOf(side, 3).click();

    expect(pressedIds(side)).toEqual(["c3"]);
    expect(stored(page!)).toEqual(before);
  });
});

describe("leading lines (U2, U6)", () => {
  // Shares of 15, 14, 13, 12, 10, 9, 8, 6, 5, 4, 3 and 1 percent: the first seven reach 80% of them.
  const LEADING = ["Choice 12", "Choice 11", "Choice 10", "Choice 9", "Choice 8", "Choice 7", "Choice 6"];

  async function crowded(refreshing = false): Promise<HTMLElement> {
    await seedRanked("Crowded", CROWDED);
    page = await open();
    if (refreshing) stubInterval(page);
    return maximize(page, "Crowded");
  }

  it("draws and lists the lines that reach 80% of the shares and offers the rest", async () => {
    const side = await crowded();

    expect(legendLabels(side)).toEqual(LEADING);
    expect(lines(side).length).toBe(7);
    expect(showAllButton(side).hidden).toBe(false);
    expect(showAllButton(side).type).toBe("button");
    expect(showAllButton(side).textContent).toBe("Show all 12 choices");
  });

  it("places the show-all button before the scale buttons, in their row under the plot, in both states", async () => {
    const side = await crowded();
    const placed = () => {
      const start = showAllButton(side).parentElement!;
      const row = start.parentElement!;
      expect(row.className).toBe("line-graph-controls");
      expect(row.previousElementSibling!.className).toBe("line-graph-plot");
      expect(Array.from(row.children).map((child) => child.className)).toEqual(["line-graph-controls-start", "line-graph-scales"]);
    };
    placed();
    showAllButton(side).click();
    placed();
  });

  it("shows every line on a press and the leading ones on the next", async () => {
    const side = await crowded();
    showAllButton(side).click();
    expect(legendEntries(side).length).toBe(12);
    expect(lines(side).length).toBe(12);
    expect(showAllButton(side).textContent).toBe("Show top 7 choices");

    showAllButton(side).click();
    expect(legendLabels(side)).toEqual(LEADING);
    expect(lines(side).length).toBe(7);
    expect(showAllButton(side).textContent).toBe("Show all 12 choices");
  });

  it("lays the legend out in the fewest rows whose columns fit its width", async () => {
    const side = await crowded();
    const legend = side.querySelector(".line-graph-legend") as HTMLElement;
    const rows = () => legend.style.getPropertyValue("--line-graph-legend-rows");
    // jsdom lays nothing out: one entry per row.
    expect(rows()).toBe("7");

    // "Choice 12", "Choice 11" and "Choice 10" are 100 wide, the four others 80; the legend is as wide as the test says.
    let legendWidth = 0;
    const measuredWhileMeasuring: boolean[] = [];
    page!.window.HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      let width = 0;
      if (this === legend) width = legendWidth;
      else if (this.classList.contains("line-graph-legend-entry")) {
        measuredWhileMeasuring.push(legend.classList.contains("is-measuring"));
        width = /1\d$/.test(this.querySelector(".line-graph-legend-label")!.textContent!) ? 100 : 80;
      }
      return { x: 0, y: 0, left: 0, top: 0, right: width, bottom: 0, width, height: 0, toJSON: () => ({}) } as DOMRect;
    };
    const rowsAt = (width: number) => {
      legendWidth = width;
      showAllButton(side).click();
      showAllButton(side).click();
      expect(legendLabels(side)).toEqual(LEADING);
      return rows();
    };

    expect(rowsAt(1000)).toBe("1");
    // Two rows: columns of 100, 100, 80 and 80.
    expect(rowsAt(400)).toBe("2");
    // Three rows need 100 + 80 + 80; four need 100 + 80.
    expect(rowsAt(250)).toBe("4");
    expect(rowsAt(90)).toBe("7");
    expect(measuredWhileMeasuring.length).toBeGreaterThan(0);
    expect(measuredWhileMeasuring.every(Boolean)).toBe(true);
    expect(legend.classList.contains("is-measuring")).toBe(false);
  });

  it("never draws more than ten lines at first", async () => {
    await seedRanked("Even", new Array(14).fill(1));
    page = await open();
    const side = await maximize(page, "Even");

    expect(legendLabels(side)).toEqual(["Choice 1", "Choice 2", "Choice 3", "Choice 4", "Choice 5", "Choice 6", "Choice 7", "Choice 8", "Choice 9", "Choice 10"]);
    expect(showAllButton(side).textContent).toBe("Show all 14 choices");
    showAllButton(side).click();
    expect(lines(side).length).toBe(14);
    expect(showAllButton(side).textContent).toBe("Show top 10 choices");
  });

  it("includes the lines tied with the last leading one", async () => {
    await seedRanked("Level", [10, 10, 10, 10, 10, 10, 10, 1, 1, 1, 1]);
    page = await open();
    const side = await maximize(page, "Level");

    expect(legendLabels(side)).toEqual(["Choice 1", "Choice 2", "Choice 3", "Choice 4", "Choice 5", "Choice 6", "Choice 7"]);
    expect(showAllButton(side).textContent).toBe("Show all 11 choices");
  });

  it("hides the button and draws every line of a poll with ten lines", async () => {
    await seedRanked("Ten", CROWDED.slice(0, 10));
    page = await open();
    const side = await maximize(page, "Ten");

    expect(lines(side).length).toBe(10);
    expect(showAllButton(side).hidden).toBe(true);
  });

  it("keeps all lines shown across a refresh and a scale change, and starts at the leading lines when opened again", async () => {
    const poll = await seedRanked("Spanning", CROWDED);
    await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "old@example.com", userName: "", choiceIds: ["c12"], votedAt: new Date(Date.now() - 32 * 24 * HOUR) });
    page = await open();
    stubInterval(page);
    const side = await maximize(page, "Spanning");
    showAllButton(side).click();

    const fetched = page.requests.filter((r) => r.url.includes("/line-graph")).length;
    await page.settle(4 * INTERVAL);
    expect(page.requests.filter((r) => r.url.includes("/line-graph")).length).toBeGreaterThan(fetched);
    expect(lines(side).length).toBe(12);

    segments(side).find((button) => button.textContent === "1 Day")!.click();
    expect(lines(side).length).toBe(12);
    expect(showAllButton(side).textContent).toBe("Show top 7 choices");

    await toggleMaximized(page, "Spanning");
    const again = await maximize(page, "Spanning");
    expect(lines(again).length).toBe(7);
    expect(showAllButton(again).textContent).toBe("Show all 12 choices");
  });

  it("keeps a selected time when the button is pressed, with a marker per drawn line", async () => {
    const side = await crowded();
    pointer(page!, svgOf(side), "pointerdown", 0);
    const placed = readoutTime(side);
    expect(markers(side).length).toBe(7);

    pointer(page!, showAllButton(side), "pointerdown");
    showAllButton(side).click();
    expect(crosshair(side)).not.toBeNull();
    expect(readoutTime(side)).toBe(placed);
    expect(markers(side).length).toBe(12);
    expect(lines(side).length).toBe(12);
  });

  it("clears the highlight of a line that leaves the leading ones", async () => {
    const side = await crowded();
    showAllButton(side).click();
    entryOf(side, 1).click();
    expect(pressedIds(side)).toEqual(["c1"]);

    showAllButton(side).click();
    expect(pressedIds(side)).toEqual([]);
    expect(graphOf(side).classList.contains("has-highlight")).toBe(false);
    expect(lines(side).length).toBe(7);
    expect(side.querySelector(".is-highlighted")).toBeNull();
  });

  it("announces the drawn lines only", async () => {
    const side = await crowded();
    const live = side.querySelector(".line-graph-live") as HTMLElement;
    const named = () => live.textContent!.split(", ").filter((part) => part.startsWith("Choice ")).length;

    plotOf(side).focus();
    expect(named()).toBe(7);

    pointer(page!, showAllButton(side), "pointerdown");
    showAllButton(side).click();
    press(page!, plotOf(side), "Home");
    expect(named()).toBe(12);
  });

  it("keeps the choice order among lines with the same share", async () => {
    await seedRanked("Tied", [2, 2, 2, 2]);
    page = await open();
    const side = await maximize(page, "Tied");

    expect(legendLabels(side)).toEqual(["Choice 1", "Choice 2", "Choice 3", "Choice 4"]);
  });

  it("follows a refresh that brings ten lines: no button, and no highlight of a line that is gone", async () => {
    const side = await crowded(true);
    showAllButton(side).click();
    entryOf(side, 1).click();
    expect(pressedIds(side)).toEqual(["c1"]);

    dropSeries(page!, ["c1", "c2"]);
    await page!.settle(4 * INTERVAL);
    expect(lines(side).length).toBe(10);
    expect(showAllButton(side).hidden).toBe(true);
    expect(pressedIds(side)).toEqual([]);
    expect(graphOf(side).classList.contains("has-highlight")).toBe(false);
  });

  it("stores nothing", async () => {
    const side = await crowded();
    const before = stored(page!);
    showAllButton(side).click();

    expect(lines(side).length).toBe(12);
    expect(stored(page!)).toEqual(before);
  });
});
