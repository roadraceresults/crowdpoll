import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { LISTING_MAX_AGE_1S, openPage, type BrowserPage } from "./helpers/browser.js";
import { trendingSweep } from "../src/polls/sweeps.js";
import { countVote } from "../src/polls/counters.js";
import { BAR_PALETTE } from "../src/polls/barPalette.js";

let ctx: TestContext;
let page: BrowserPage | null = null;
let base: string[] = [];
let palette: string[] = [];

const YES = "#006120";
const NO = "#F91010";

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1200", ...LISTING_MAX_AGE_1S });
  const script = (await request(ctx.app).get("/pollCard.js")).text;
  const block = script.slice(script.indexOf("RESULTS_PALETTE_ENTRIES = ["));
  base = (block.slice(0, block.indexOf("];")).match(/#[0-9A-Fa-f]{6}/g) ?? []).map((hex) => hex.toUpperCase());
  palette = expandedPalette(base, ctx.config.maxChoices);
});

// An independent reference for expandPalette (FIX03): the base list repeated to
// `count` entries, with one more when the last would equal the first.
function expandedPalette(list: string[], count: number): string[] {
  const out: string[] = [];
  while (out.length < Math.max(count, list.length)) out.push(list[out.length % list.length]!);
  if (out.length > 1 && out[out.length - 1] === out[0]) out.push(list[out.length % list.length]!);
  return out;
}

afterAll(async () => {
  page?.close();
  await ctx.stop();
});

beforeEach(async () => {
  page?.close();
  page = null;
  await polls(ctx).deleteMany({});
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
});

function toHex(color: string): string {
  if (color.startsWith("#")) return color.toUpperCase();
  const [r, g, b] = color.match(/\d+/g)!.map(Number);
  return "#" + [r, g, b].map((v) => v!.toString(16).padStart(2, "0")).join("").toUpperCase();
}

// Relative luminance and contrast ratio as WCAG defines them: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
function luminance(hex: string): number {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

// The text on a fill, as the page should pick it: the listed color, else white or black by contrast.
const BLACK_TEXT_ON = new Set(["#E0E0E0", "#E3E335", "#FFFF00", "#06D400"]);
const LISTED_WHITE_TEXT_ON = new Set(["#7D7D7D", "#F91010", "#0695F5", "#399FA2", "#C8468B", "#FC8E45", "#FF6601", "#006120", "#9E9E9E", "#545454", "#000000", "#0808FD", "#007A7E", "#B045B0", "#800080", "#404040", "#1A539E", "#880015", "#FF91CB", "#784315"]);
function textOn(fill: string): string {
  const hex = fill.toUpperCase();
  if (BLACK_TEXT_ON.has(hex)) return "#000000";
  if (LISTED_WHITE_TEXT_ON.has(hex)) return "#FFFFFF";
  return contrast("#FFFFFF", hex) >= contrast("#000000", hex) ? "#FFFFFF" : "#000000";
}

function tintOf(hex: string, amount = 0.9): string {
  return "#" + [0, 1, 2].map((i) => Math.round((parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255 * (1 - amount) + amount) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

// FNV-1a: http://www.isthe.com/chongo/tech/comp/fnv/
function paletteStartOf(pid: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < pid.length; i++) {
    hash ^= pid.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % palette.length;
}

async function seed(title: string, labels: string[], votes: number[] = [], id?: string, colors: (string | undefined)[] = []) {
  const choices = labels.map((label, i) => ({ id: `c${i + 1}`, label, position: i, ...(colors[i] ? { color: colors[i] } : {}) }));
  const poll = makePoll(id ? { _id: id, title, choices } : { title, choices });
  await polls(ctx).insertOne(poll);
  await addVotes(poll._id, votes);
  return poll;
}

async function addVotes(pid: string, votes: number[]) {
  for (const [i, n] of votes.entries()) {
    for (let k = 0; k < n; k++) await countVote(ctx.cache, pid, [`c${i + 1}`], [], true);
  }
  await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
}

const rowsOf = (p: BrowserPage) => Array.from(p.document.querySelectorAll(".tab-panel[data-panel=\"trending\"] .results-list > .result-row")) as HTMLElement[];
const fillOf = (row: HTMLElement) => toHex((row.querySelector(".result-fill") as HTMLElement).style.background);
const barProperty = (row: HTMLElement, name: string) => toHex(row.style.getPropertyValue(name).trim());
const trackOf = (row: HTMLElement) => barProperty(row, "--bar-track");
const inkOf = (row: HTMLElement) => barProperty(row, "--bar-ink");
const textsOf = (row: HTMLElement) => Array.from(row.querySelectorAll(":scope > .result-label, :scope > .result-pct")) as HTMLElement[];
const cardTitled = (p: BrowserPage, title: string) =>
  Array.from(p.document.querySelectorAll(".tab-panel[data-panel=\"trending\"] .card-viewport"))
    .find((card) => card.querySelector(".question")?.textContent === title) as HTMLElement;
const fillsOf = (card: HTMLElement) => (Array.from(card.querySelectorAll(".results-list > .result-row")) as HTMLElement[]).map(fillOf);
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("bar colours and text on every card", () => {
  it("derives a stable start from the poll id", async () => {
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    const offsetFor = (page.window as unknown as { paletteOffsetFor: (pid: unknown) => number }).paletteOffsetFor;
    for (const pid of ["poll-fifty", "poll-agree", "poll-colours-a", "poll-colours-b", "poll-swap"]) {
      expect(offsetFor(pid)).toBe(paletteStartOf(pid));
    }
    const ids = Array.from({ length: 1000 }, (_, i) => `00000000-0000-4000-8000-${i.toString(16).padStart(12, "0")}`);
    const uses = new Array<number>(palette.length).fill(0);
    for (const pid of ids) {
      const start = offsetFor(pid);
      expect(start).toBe(paletteStartOf(pid));
      uses[start]!++;
    }
    expect(uses.every((n) => n > 0)).toBe(true);
    expect(Math.max(...uses)).toBeLessThanOrEqual(50);
    expect(new Set(ids.slice(0, 20).map((id) => offsetFor(id))).size).toBeGreaterThanOrEqual(10);
    for (const missing of [undefined, "", 42]) expect(offsetFor(missing)).toBe(0);
  });

  it("takes consecutive palette fills from the poll's own start, wrapping, on an 80% tint of itself, with dark text on the tint and a readable copy clipped to the fill", async () => {
    await seed("Fifty", Array.from({ length: 50 }, (_, i) => `Option ${i + 1}`), [], "poll-fifty");
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    const rows = rowsOf(page);
    expect(rows.length).toBe(50);
    expect(palette.length).toBeGreaterThanOrEqual(50);
    expect(palette.every((hex, i) => hex !== palette[(i + 1) % palette.length])).toBe(true);
    expect(new Set(palette).size).toBe(base.length);
    const start = paletteStartOf("poll-fifty");
    expect(new Set(rows.map(fillOf)).size).toBe(Math.min(rows.length, new Set(palette).size));
    expect(fillOf(rows[(palette.length - start) % palette.length]!)).toBe(palette[0]);
    rows.forEach((row, i) => {
      const fill = fillOf(row);
      const track = tintOf(fill);
      expect(fill).toBe(palette[(start + i) % palette.length]);
      expect(trackOf(row)).toBe(track);
      expect(contrast(inkOf(row), track)).toBeGreaterThanOrEqual(7);
      for (const text of textsOf(row)) expect(text.style.textShadow).toBe("none");
      const overlays = row.querySelectorAll(".result-ink-on-fill");
      expect(overlays.length).toBe(1);
      for (const copy of Array.from(overlays[0]!.children) as HTMLElement[]) {
        expect(toHex(copy.style.color)).toBe(textOn(fill));
      }
    });
  });

  it("starts different polls at different entries", async () => {
    await seed("First", ["Alpha", "Beta", "Gamma"], [], "poll-colours-a");
    await seed("Second", ["Alpha", "Beta", "Gamma"], [], "poll-colours-b");
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    const first = fillsOf(cardTitled(page, "First"));
    const second = fillsOf(cardTitled(page, "Second"));
    expect(first).toEqual([0, 1, 2].map((i) => palette[(paletteStartOf("poll-colours-a") + i) % palette.length]));
    expect(second).toEqual([0, 1, 2].map((i) => palette[(paletteStartOf("poll-colours-b") + i) % palette.length]));
    expect(first[0]).not.toBe(second[0]);
  });

  it("keeps a poll's colours when maximized and after a reload", async () => {
    await seed("Kept", ["Alpha", "Beta", "Gamma"], [], "poll-colours-a");
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    const card = cardTitled(page, "Kept");
    const fills = fillsOf(card);
    expect(fills).toEqual([0, 1, 2].map((i) => palette[(paletteStartOf("poll-colours-a") + i) % palette.length]));

    (card.querySelector(".maximize-btn") as HTMLElement).click();
    await page.settle();
    const maximized = page.document.querySelector(".tab-panel[data-panel=\"trending\"] .maximized-card-grid .card-viewport") as HTMLElement;
    expect(maximized).toBe(card);
    expect(fillsOf(maximized)).toEqual(fills);

    page.close();
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    expect(fillsOf(cardTitled(page, "Kept"))).toEqual(fills);
  });

  it("keeps the colour sequence when non-Yes/No choices swap", async () => {
    const poll = await seed("Order", ["Alpha", "Beta"], [3, 1], "poll-swap");
    page = await openPage(ctx, "index.html");
    await page.settle(1300);
    const card = cardTitled(page, "Order");
    const labels = () => Array.from(card.querySelectorAll(".results-list > .result-row > .result-label")).map((l) => l.textContent);
    const swapStart = paletteStartOf("poll-swap");
    const sequence = [palette[swapStart], palette[(swapStart + 1) % palette.length]];
    expect(labels()).toEqual(["Alpha", "Beta"]);
    expect(fillsOf(card)).toEqual(sequence);

    await addVotes(poll._id, [0, 4]);
    await page.click("#refreshBtn");
    await pause(120);

    expect(labels()).toEqual(["Beta", "Alpha"]);
    expect(fillsOf(card)).toEqual(sequence);
  });

  it("gives Yes and No their colours, derived exactly as for any other color, with copies of the text clipped to the fill", async () => {
    await seed("Agree", ["Yes", "No", "Maybe"], [3, 2, 1], "poll-agree");
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    await pause(120);
    const [yes, no, maybe] = rowsOf(page);

    for (const [row, fill, pct, label] of [[yes!, YES, 50, "Yes"], [no!, NO, 33, "No"]] as const) {
      expect(fillOf(row)).toBe(fill);
      expect(trackOf(row)).toBe(tintOf(fill));
      expect(contrast(inkOf(row), tintOf(fill))).toBeGreaterThanOrEqual(7);
      const overlays = row.querySelectorAll(".result-ink-on-fill");
      expect(overlays.length).toBe(1);
      const overlay = overlays[0] as HTMLElement;
      expect(overlay.getAttribute("aria-hidden")).toBe("true");
      expect((row.querySelector(".result-fill") as HTMLElement).style.width).toBe(`${pct}%`);
      expect(overlay.style.clipPath).toBe(`inset(0 calc(100% - ${pct}%) 0 0)`);
      const copies = Array.from(overlay.children) as HTMLElement[];
      expect(copies.map((c) => c.textContent)).toEqual([label, `${pct}%`]);
      for (const copy of copies) expect(toHex(copy.style.color)).toBe(textOn(fill));
    }
    const maybeFill = palette[paletteStartOf("poll-agree")]!;
    expect(fillOf(maybe!)).toBe(maybeFill);
    expect(trackOf(maybe!)).toBe(tintOf(maybeFill));
    const maybeCopies = Array.from(maybe!.querySelector(".result-ink-on-fill")!.children) as HTMLElement[];
    expect(maybeCopies.map((c) => c.textContent)).toEqual(["Maybe", "17%"]);
    expect(maybeCopies.length).toBe(2);
  });

  it("derives the track and every text color of Yes and No exactly as for a choice set by hand to the same color", async () => {
    await seed("Words", ["Yes", "No"], [3, 2], "poll-agree");
    await seed("Hand", ["Alpha", "Beta"], [3, 2], "poll-hand", [YES, NO]);
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    await pause(120);
    const colorsOfRows = (title: string) => (Array.from(cardTitled(page!, title).querySelectorAll(".results-list > .result-row")) as HTMLElement[]).map((row) => ({
      fill: fillOf(row),
      track: trackOf(row),
      ink: inkOf(row),
      copies: Array.from(row.querySelectorAll(".result-ink-on-fill > *")).map((c) => toHex((c as HTMLElement).style.color))
    }));
    expect(colorsOfRows("Words")).toEqual(colorsOfRows("Hand"));
    expect(colorsOfRows("Words").length).toBe(2);
  });

  it("swaps fills, tints and overlays correctly when No overtakes Yes on a refresh", async () => {
    const poll = await seed("Swap", ["Yes", "No"], [3, 1]);
    page = await openPage(ctx, "index.html");
    await page.settle(1300);
    const list = page.document.querySelector(".tab-panel[data-panel=\"trending\"] .results-list") as HTMLElement;
    const firstRow = rowsOf(page)[0]!;
    expect(firstRow.querySelector(".result-label")!.textContent).toBe("Yes");

    await addVotes(poll._id, [0, 4]);
    await page.click("#refreshBtn");
    await pause(120);

    const [top, second] = rowsOf(page);
    expect(top).toBe(firstRow);
    expect(list.children.length).toBe(2);
    expect(top!.querySelector(".result-label")!.textContent).toBe("No");
    expect(fillOf(top!)).toBe(NO);
    expect(trackOf(top!)).toBe(tintOf(NO));
    expect(fillOf(second!)).toBe(YES);
    expect(trackOf(second!)).toBe(tintOf(YES));
    for (const [row, label, pct] of [[top!, "No", 63], [second!, "Yes", 38]] as const) {
      const overlays = row.querySelectorAll(".result-ink-on-fill");
      expect(overlays.length).toBe(1);
      expect(Array.from(overlays[0]!.children).map((c) => c.textContent)).toEqual([label, `${pct}%`]);
      expect((overlays[0] as HTMLElement).style.clipPath).toBe(`inset(0 calc(100% - ${pct}%) 0 0)`);
    }
  });

  it("hands each row's light and dark track and ink to CSS, with no inline colours, and dark text at 7:1 or more", async () => {
    await seed("Fifty dark", Array.from({ length: 50 }, (_, i) => `Option ${i + 1}`), [], "poll-fifty");
    await seed("Agree dark", ["Yes", "No"], [2, 1], "poll-agree");
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    const rows = rowsOf(page);
    expect(rows.length).toBe(52);
    for (const row of rows) {
      expect(row.style.background).toBe("");
      for (const text of textsOf(row)) expect(text.style.color).toBe("");
      const darkTrack = barProperty(row, "--bar-track-dark");
      const darkInk = barProperty(row, "--bar-ink-dark");
      expect(darkTrack).toMatch(/^#[0-9A-F]{6}$/);
      expect(contrast(darkInk, darkTrack)).toBeGreaterThanOrEqual(7);
    }
  });

  it("marks only a multi-choice poll's vote list for checkboxes", async () => {
    await seed("Single", ["Alpha", "Beta"]);
    const multi = makePoll({ title: "Multi", choiceMode: "Multiple-Choice Poll" });
    await polls(ctx).insertOne(multi);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    const listOf = (title: string) => cardTitled(page!, title).querySelector(".voting-list") as HTMLElement;
    expect(listOf("Single").classList.contains("is-multi")).toBe(false);
    expect(listOf("Multi").classList.contains("is-multi")).toBe(true);
  });
});

describe("manual bar colours", () => {
  type Assign = (data: { label: string; color?: string }[], offset: number) => string[];
  const assignOn = (p: BrowserPage) => (p.window as unknown as { assignResultColors: Assign }).assignResultColors;
  const asData = (labels: string[], colors: Record<number, string> = {}) =>
    labels.map((label, i) => ({ label, ...(colors[i] ? { color: colors[i] } : {}) }));
  const isYesNo = (label: string) => label === "Yes" || label === "No";

  it("draws a color set by hand in preference to the Yes and No colors and to the automatic palette", async () => {
    await seed("Agree", ["Yes", "No", "Maybe"], [3, 2, 1], "poll-agree", ["#0000FF", undefined, "#FF0000"]);
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    await pause(120);
    const [yes, no, maybe] = rowsOf(page);
    expect(fillOf(yes!)).toBe("#0000FF");
    expect(trackOf(yes!)).toBe(tintOf("#0000FF"));
    expect(fillOf(no!)).toBe(NO);
    expect(trackOf(no!)).toBe(tintOf(NO));
    expect(fillOf(maybe!)).toBe("#FF0000");
  });

  it("changes no Automatic bar when one choice is colored, for 2 to 50 choices with and without Yes or No", async () => {
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    const assign = assignOn(page);
    for (const count of [2, 3, 10, 50]) {
      for (const withYesNo of [false, true]) {
        const labels = Array.from({ length: count }, (_, i) => (withYesNo && i < 2 ? ["Yes", "No"][i]! : `Option ${i + 1}`));
        const baseline = assign(asData(labels), 7);
        for (let colored = 0; colored < count; colored++) {
          const result = assign(asData(labels, { [colored]: "#7092BE" }), 7);
          expect(result[colored]).toBe("#7092BE");
          result.forEach((color, j) => {
            if (j !== colored) expect(color, `${count} choices, ${withYesNo ? "with" : "without"} Yes/No, choice ${colored} colored, bar ${j}`).toBe(baseline[j]);
          });
        }
      }
    }
  });

  it("lets a colored non-Yes/No choice use up its palette slot and a colored Yes or No choice use none", async () => {
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    const assign = assignOn(page);
    const plain = assign(asData(["Alpha", "Yes", "Beta"]), 5);
    const colored = assign(asData(["Alpha", "Yes", "Beta"], { 0: "#FF0000", 1: "#0000FF" }), 5);
    expect(plain[1]).toBe(YES);
    expect(colored).toEqual(["#FF0000", "#0000FF", plain[2]]);
    expect(plain[2]).toBe(palette[6]);
  });

  it("colors a poll with no colors exactly as before", async () => {
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    const labels = ["Alpha", "Yes", "Beta", "No", "Gamma"];
    const last = palette.length - 1;
    expect(assignOn(page)(asData(labels), last)).toEqual([palette[last], YES, palette[0], NO, palette[1]]);
  });

  it("draws two choices of one color in it", async () => {
    await seed("Twins", ["Alpha", "Beta", "Gamma"], [3, 2, 1], "poll-colours-a", ["#800080", "#800080", undefined]);
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    const fills = fillsOf(cardTitled(page, "Twins"));
    expect(fills.slice(0, 2)).toEqual(["#800080", "#800080"]);
    expect(fills[2]).toBe(palette[(paletteStartOf("poll-colours-a") + 2) % palette.length]);
  });

  it("draws a color outside the fifty automatic ones, without error, with all four bar properties set", async () => {
    await seed("Odd", ["Alpha", "Beta"], [2, 1], "poll-colours-b", ["#123456"]);
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    const [first, second] = rowsOf(page);
    expect(fillOf(first!)).toBe("#123456");
    for (const name of ["--bar-track", "--bar-ink", "--bar-track-dark", "--bar-ink-dark"]) {
      expect(first!.style.getPropertyValue(name)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
    expect(fillOf(second!)).toBe(palette[(paletteStartOf("poll-colours-b") + 1) % palette.length]);
  });

  it("draws a stored value that is not a six-digit hex as Automatic", async () => {
    await seed("Corrupt", ["Alpha", "Beta", "Gamma"], [3, 2, 1], "poll-colours-a", ["#12", "red", "#GGGGGG"]);
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    const start = paletteStartOf("poll-colours-a");
    expect(fillsOf(cardTitled(page, "Corrupt"))).toEqual([0, 1, 2].map((i) => palette[(start + i) % palette.length]));
  });

  it("keeps every palette color legible: 7:1 on the track in light and dark, the listed text color over the fill", async () => {
    const labels = BAR_PALETTE.map((c) => `Option ${c.name}`);
    await seed("Whole palette", labels, labels.map((_, i) => labels.length - i), "poll-colours-a", BAR_PALETTE.map((c) => c.hex));
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    const rows = rowsOf(page);
    expect(rows).toHaveLength(BAR_PALETTE.length);
    rows.forEach((row, i) => {
      const fill = fillOf(row);
      expect(fill).toBe(BAR_PALETTE[i]!.hex);
      expect(contrast(inkOf(row), trackOf(row)), BAR_PALETTE[i]!.name).toBeGreaterThanOrEqual(7);
      expect(contrast(barProperty(row, "--bar-ink-dark"), barProperty(row, "--bar-track-dark")), BAR_PALETTE[i]!.name).toBeGreaterThanOrEqual(7);
      const copies = Array.from(row.querySelector(".result-ink-on-fill")!.children) as HTMLElement[];
      for (const copy of copies) expect(toHex(copy.style.color), BAR_PALETTE[i]!.name).toBe(textOn(fill));
    });
  });

  it("repaints an already drawn bar in place when a content refresh brings a new color", async () => {
    const poll = await seed("Changing", ["Alpha", "Beta"], [2, 1], "poll-colours-a");
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    const card = cardTitled(page, "Changing");
    const rowsBefore = Array.from(card.querySelectorAll(".results-list > .result-row"));
    const start = paletteStartOf("poll-colours-a");
    expect(fillsOf(card)).toEqual([palette[start % palette.length], palette[(start + 1) % palette.length]]);

    type Held = { contentVersion: number; choices: { id: string; color?: string }[] };
    const w = page.window as unknown as {
      Tabs: { controller: (name: string) => { state: unknown; grid: { render: (state: unknown, changed: Set<string>) => void } } };
      DeltaClient: { apply: (state: unknown, body: unknown) => Set<string> };
    };
    const trending = w.Tabs.controller("trending");
    const held = (trending.state as { cards: Map<string, Held> }).cards.get(poll._id)!;
    const refreshed = {
      ...held,
      contentVersion: held.contentVersion + 1,
      choices: held.choices.map((c, i) => (i === 0 ? { ...c, color: "#FF91CB" } : c))
    };
    trending.grid.render(trending.state, w.DeltaClient.apply(trending.state, { cards: { [poll._id]: refreshed } }));
    await page.settle(100);

    expect(fillsOf(card)).toEqual(["#FF91CB", palette[(start + 1) % palette.length]]);
    expect(Array.from(card.querySelectorAll(".results-list > .result-row"))).toEqual(rowsBefore);
  });
});
