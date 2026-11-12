import * as cheerio from "cheerio";
import { normalizeTitle } from "./normalizeTitle.js";

export interface PixelPoint {
  x: number;
  y: number;
}

export interface AxisTick {
  offset: number;
  label: string;
}

export interface TrendLine {
  key: string;
  label: string;
  points: PixelPoint[];
}

export interface PoliticoChart {
  heading: string;
  lines: TrendLine[];
  undrawnLegends: string[];
  xTicks: AxisTick[];
  yTicks: AxisTick[];
  focusDate: string;
}

const TREND_PREFIX = "trend-";
const LEGEND_PREFIX = "trend-ov-name-";
const SEGMENT = /^[ML]\s*(-?[\d.]+),(-?[\d.]+)\s*$/;
const TRANSLATE = /translate\(\s*(-?[\d.e]+)\s*,\s*(-?[\d.e]+)\s*\)/;

function classKeyOf(classes: string | undefined, prefix: string, exclude = ""): string | undefined {
  const token = (classes ?? "")
    .split(/\s+/)
    .find((name) => name.startsWith(prefix) && (exclude === "" || !name.startsWith(exclude)));
  return token?.slice(prefix.length);
}

function parsePathPoints(d: string, key: string): PixelPoint[] {
  const points: PixelPoint[] = [];
  for (const segment of d.trim().split(/(?=[MLZz])/)) {
    const text = segment.trim();
    if (text === "" || text === "Z" || text === "z") continue;
    const match = SEGMENT.exec(text);
    if (!match) throw new Error(`line "${TREND_PREFIX}${key}" has an unparseable path near "${text.slice(0, 20)}"`);
    points.push({ x: Number(match[1]), y: Number(match[2]) });
  }
  return points;
}

export function readPoliticoChart(html: string, graphTitle: string): PoliticoChart {
  // https://cheerio.js.org/docs/basics/selecting
  const $ = cheerio.load(html);

  // Chart blocks paired with the nearest preceding h2 in document order.
  const elements = $("h2, div.plot-trend.pop-d3").toArray();
  const blocks: { heading: string; element: (typeof elements)[number] }[] = [];
  let lastHeading = "";
  for (const element of elements) {
    if ($(element).is("h2")) lastHeading = $(element).text().trim();
    else blocks.push({ heading: lastHeading, element });
  }

  const wanted = normalizeTitle(graphTitle);
  const matches = blocks.filter((block) => normalizeTitle(block.heading) === wanted);
  if (matches.length === 0) {
    const headings = blocks.map((block) => JSON.stringify(block.heading)).join(", ");
    throw new Error(`graph ${JSON.stringify(graphTitle)} not found; chart headings found: ${headings === "" ? "none" : headings}`);
  }
  if (matches.length > 1) {
    const headings = matches.map((block) => JSON.stringify(block.heading)).join(", ");
    throw new Error(`graph ${JSON.stringify(graphTitle)} is ambiguous; matching headings: ${headings}`);
  }
  const { heading } = matches[0]!;
  const block = $(matches[0]!.element);
  if (block.find("svg").length === 0) throw new Error(`chart ${JSON.stringify(heading)} has no drawing (svg)`);

  const legendLabels = new Map<string, string>();
  for (const text of block.find("text").toArray()) {
    const key = classKeyOf($(text).attr("class"), LEGEND_PREFIX);
    if (key !== undefined) legendLabels.set(key, $(text).text().trim());
  }

  const lines: TrendLine[] = [];
  for (const path of block.find("path.line").toArray()) {
    const key = classKeyOf($(path).attr("class"), TREND_PREFIX, LEGEND_PREFIX);
    if (key === undefined) continue;
    const label = legendLabels.get(key);
    if (label === undefined) throw new Error(`line "${TREND_PREFIX}${key}" has no legend text`);
    legendLabels.delete(key);
    lines.push({ key, label, points: parsePathPoints($(path).attr("d") ?? "", key) });
  }
  if (lines.length === 0) throw new Error(`chart ${JSON.stringify(heading)} holds no trend lines`);
  // Legend texts left over name series the chart never drew (Spain's "AR"): left out with a warning.
  const undrawnLegends = [...legendLabels.values()];

  // Ticks are grouped by their parent axis element; the axis runs along whichever
  // coordinate its ticks vary in (the other one is always zero).
  const axes = new Map<unknown, { x: number; y: number; label: string }[]>();
  for (const tick of block.find("g.tick").toArray()) {
    const match = TRANSLATE.exec($(tick).attr("transform") ?? "");
    if (!match) continue;
    const parent = $(tick).parent()[0];
    const ticks = axes.get(parent) ?? [];
    if (ticks.length === 0) axes.set(parent, ticks);
    ticks.push({ x: Number(match[1]), y: Number(match[2]), label: $(tick).find("text").text().trim() });
  }
  const xTicks: AxisTick[] = [];
  const yTicks: AxisTick[] = [];
  for (const ticks of axes.values()) {
    if (ticks.every((tick) => tick.y === 0) && ticks.some((tick) => tick.x !== 0)) {
      xTicks.push(...ticks.map((tick) => ({ offset: tick.x, label: tick.label })));
    } else if (ticks.every((tick) => tick.x === 0) && ticks.some((tick) => tick.y !== 0)) {
      yTicks.push(...ticks.map((tick) => ({ offset: tick.y, label: tick.label })));
    }
  }

  // The focus date lives in the focus overlay; event annotations ("Andy Burnham new PM" on the
  // UK page) also carry the date class, so the selector is scoped to the focus group.
  return { heading, lines, undrawnLegends, xTicks, yTicks, focusDate: block.find("g.focus text.date").first().text().trim() };
}
