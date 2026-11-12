import * as cheerio from "cheerio";
import { normalizeTitle } from "./normalizeTitle.js";

type DataPoint = { date: string } & Record<string, string | number>;

export type GraphFile = { graph_title: string; data_points: DataPoint[] } & Record<string, unknown>;

type GraphProblem = "not-found" | "ambiguous" | "data";

export class GraphError extends Error {
  constructor(
    readonly problem: GraphProblem,
    readonly detail: string,
  ) {
    super(problem === "not-found" ? `not found; graphs found: ${detail}` : problem === "ambiguous" ? `is ambiguous: ${detail}` : detail);
  }
}

interface Chart {
  title: string;
  data?: unknown;
}

const MAX_LINES = 26;

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat
export const EASTERN_DATE = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
});

function letterOf(index: number): string {
  return String.fromCharCode(97 + index);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isChart(value: unknown): value is Chart {
  return typeof value === "object" && value !== null && typeof (value as Chart).title === "string";
}

function readCharts(html: string): Chart[] {
  const $ = cheerio.load(html);
  return $("[data-state]")
    .toArray()
    // https://cheerio.js.org/docs/api/classes/Cheerio#attr
    .map((element) => parseJson($(element).attr("data-state") ?? ""))
    .filter(isChart);
}

function findChart(charts: Chart[], graphTitle: string): Chart {
  const wanted = normalizeTitle(graphTitle);
  const matches = charts.filter((chart) => normalizeTitle(chart.title) === wanted);
  if (matches.length === 0) {
    const titles = charts.map((chart) => JSON.stringify(chart.title)).join(", ");
    throw new GraphError("not-found", titles === "" ? "none" : titles);
  }
  if (matches.length > 1) throw new GraphError("ambiguous", `${matches.length} graphs have this title`);
  return matches[0]!;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim().replace(/%$/, "") !== "") return Number(value.replace(/%$/, ""));
  return Number.NaN;
}

function readValues(point: unknown, position: number): Map<string, number> {
  const questions = (point as { questions?: unknown } | null)?.questions;
  const values = new Map<string, number>();
  for (const question of Array.isArray(questions) ? questions : []) {
    const { label, value } = (question ?? {}) as { label?: unknown; value?: unknown };
    if (typeof label !== "string" || label === "") throw new GraphError("data", `point ${position} has a label that is not text`);
    if (values.has(label)) throw new GraphError("data", `point ${position} repeats label ${JSON.stringify(label)}`);
    const number = toNumber(value);
    if (!Number.isFinite(number)) {
      throw new GraphError("data", `point ${position} value for ${JSON.stringify(label)} is not a number`);
    }
    values.set(label, number);
  }
  return values;
}

function readDate(point: unknown, position: number): string {
  const timestamp = (point as { timestamp?: unknown } | null)?.timestamp;
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    throw new GraphError("data", `point ${position} has no timestamp`);
  }
  return EASTERN_DATE.format(new Date(timestamp * 1000));
}

function checkLabels(values: Map<string, number>, labels: string[], position: number): void {
  const missing = labels.find((label) => !values.has(label));
  if (missing !== undefined) throw new GraphError("data", `point ${position} is missing label ${JSON.stringify(missing)}`);
  const extra = [...values.keys()].find((label) => !labels.includes(label));
  if (extra !== undefined) {
    throw new GraphError("data", `point ${position} has label ${JSON.stringify(extra)} that the first point does not have`);
  }
}

export function extractLineGraph(html: string, graphTitle: string): GraphFile {
  const chart = findChart(readCharts(html), graphTitle);
  const points = Array.isArray(chart.data) ? chart.data : [];
  if (points.length === 0) throw new GraphError("data", "has no data points");

  const labels = [...readValues(points[0], 1).keys()];
  if (labels.length > MAX_LINES) throw new GraphError("data", `has more than ${MAX_LINES} lines`);

  const dataPoints: DataPoint[] = [];
  const writtenDates = new Set<string>();
  points.forEach((point, index) => {
    const position = index + 1;
    const date = readDate(point, position);
    const values = readValues(point, position);
    checkLabels(values, labels, position);
    if (writtenDates.has(date)) return;
    writtenDates.add(date);
    const dataPoint: DataPoint = { date };
    labels.forEach((label, labelIndex) => {
      dataPoint[letterOf(labelIndex)] = values.get(label) as number;
    });
    dataPoints.push(dataPoint);
  });

  const graph: Record<string, unknown> = { graph_title: chart.title };
  labels.forEach((label, index) => {
    graph[`label_${letterOf(index)}`] = label;
  });
  graph.data_points = dataPoints;
  return graph as GraphFile;
}
