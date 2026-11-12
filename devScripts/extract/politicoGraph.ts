import type { GraphFile } from "./extractLineGraph.js";
import type { AxisTick, PoliticoChart, TrendLine } from "./politicoChart.js";

type DataPoint = GraphFile["data_points"][number];

export interface PoliticoGraph {
  graph: GraphFile;
  warnings: string[];
}

const MAX_LINES = 26;
const MIN_POINTS = 2;
const DAY_MS = 86_400_000;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const FOCUS_DATE = /^([A-Za-z]{3,})\.?\s+(\d{1,2}),\s*(\d{4})$/;

function letterOf(index: number): string {
  return String.fromCharCode(97 + index);
}

function monthIndexOf(label: string): number {
  return MONTHS.indexOf(label.slice(0, 3).toLowerCase());
}

function dayOf(year: number, month: number, day: number): number {
  return Date.UTC(year, month, day) / DAY_MS;
}

function dateOf(day: number): string {
  const date = new Date(day * DAY_MS);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getUTCMonth() + 1)}/${pad(date.getUTCDate())}/${pad(date.getUTCFullYear() % 100)}`;
}

function parseFocusDay(focusDate: string): number {
  if (focusDate === "") throw new Error("the chart has no focus date");
  const match = FOCUS_DATE.exec(focusDate);
  const month = match ? monthIndexOf(match[1]!) : -1;
  if (!match || month < 0) throw new Error(`the chart's focus date ${JSON.stringify(focusDate)} is not a date`);
  return dayOf(Number(match[3]), month, Number(match[2]));
}

// Dates the ticks right to left: a 4-digit label is that year's January 1st; a month-name label is
// the most recent 1st of that month on or before the bound (the focus date for the last tick, the
// day before the following tick's date for the others). Month labels carry no year, so the focus
// date is what fixes the calendar.
function dateTicks(xTicks: AxisTick[], focusDay: number): { offset: number; day: number }[] {
  if (xTicks.length < 2) throw new Error(`the chart has ${xTicks.length} date axis tick(s); at least 2 are needed`);
  const dated: { offset: number; day: number }[] = new Array(xTicks.length);
  let bound = focusDay;
  for (let index = xTicks.length - 1; index >= 0; index--) {
    const { offset, label } = xTicks[index]!;
    if (/^\d{4}$/.test(label)) {
      dated[index] = { offset, day: dayOf(Number(label), 0, 1) };
    } else {
      const month = monthIndexOf(label);
      if (month < 0 || !/^[A-Za-z]{3,}$/.test(label)) {
        throw new Error(`date axis label ${JSON.stringify(label)} is not a month or a year`);
      }
      const start = new Date(bound * DAY_MS);
      const year = month > start.getUTCMonth() ? start.getUTCFullYear() - 1 : start.getUTCFullYear();
      dated[index] = { offset, day: dayOf(year, month, 1) };
    }
    bound = dated[index]!.day - 1;
  }
  return dated;
}

function dateScaleOf(xTicks: AxisTick[], focusDate: string): (x: number) => number {
  const ticks = dateTicks(xTicks, parseFocusDay(focusDate));
  const first = ticks[0]!;
  const last = ticks[ticks.length - 1]!;
  if (first.offset === last.offset) throw new Error("the date axis ticks share one position");
  const slope = (last.day - first.day) / (last.offset - first.offset);
  return (x) => Math.round(first.day + (x - first.offset) * slope);
}

function percentScaleOf(yTicks: AxisTick[]): (y: number) => number {
  if (yTicks.length < 2) throw new Error(`the chart has ${yTicks.length} percent axis tick(s); at least 2 are needed`);
  const values = yTicks.map(({ label }) => {
    const match = /^(-?\d+(?:\.\d+)?)\s*%?$/.exec(label);
    if (!match) throw new Error(`percent axis label ${JSON.stringify(label)} is not a number`);
    return Number(match[1]);
  });
  const first = { offset: yTicks[0]!.offset, value: values[0]! };
  const last = { offset: yTicks[yTicks.length - 1]!.offset, value: values[values.length - 1]! };
  if (first.offset === last.offset) throw new Error("the percent axis ticks share one position");
  const slope = (last.value - first.value) / (last.offset - first.offset);
  return (y) => Math.round(Number(((first.value + (y - first.offset) * slope) * 10).toPrecision(12))) / 10;
}

function valuesByDay(line: TrendLine, dayOf: (x: number) => number, valueOf: (y: number) => number): Map<number, number> {
  const byDay = new Map<number, number>();
  for (const point of line.points) {
    const day = dayOf(point.x);
    if (byDay.has(day)) continue;
    const value = valueOf(point.y);
    if (value < 0 || value > 100) throw new Error(`line ${JSON.stringify(line.label)} has a value (${value}) outside 0 to 100`);
    byDay.set(day, value);
  }
  return byDay;
}

export function buildPoliticoGraph(chart: PoliticoChart, graphTitle: string): PoliticoGraph {
  const included = chart.lines.filter((line) => line.points.length >= MIN_POINTS);
  const warnings = [
    ...chart.undrawnLegends.map((label) => `legend ${JSON.stringify(label)} has no drawn line; left out`),
    ...chart.lines
      .filter((line) => line.points.length < MIN_POINTS)
      .map((line) => `line ${JSON.stringify(line.label)} has ${line.points.length} point(s); left out`),
  ];
  if (included.length > MAX_LINES) throw new Error(`has more than ${MAX_LINES} lines`);
  if (included.length === 0) throw new Error("has no data points");

  const dayOf = dateScaleOf(chart.xTicks, chart.focusDate);
  const valueOf = percentScaleOf(chart.yTicks);
  const lines = included.map((line) => valuesByDay(line, dayOf, valueOf));

  // The union of the lines' dates: lines come and go (Spain's parties span disjoint eras),
  // so a data point carries only the lines that have a value on its date.
  const days = [...new Set(lines.flatMap((line) => [...line.keys()]))].sort((a, b) => a - b);

  const dataPoints: DataPoint[] = days.map((day) => {
    const dataPoint: DataPoint = { date: dateOf(day) };
    lines.forEach((line, index) => {
      const value = line.get(day);
      if (value !== undefined) dataPoint[letterOf(index)] = value;
    });
    return dataPoint;
  });

  const graph: Record<string, unknown> = { graph_title: graphTitle };
  included.forEach((line, index) => {
    graph[`label_${letterOf(index)}`] = line.label;
  });
  graph.data_points = dataPoints;
  return { graph: graph as GraphFile, warnings };
}
