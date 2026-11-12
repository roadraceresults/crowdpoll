import { EASTERN_DATE, type GraphFile } from "./extractLineGraph.js";
import type { PricePoint } from "./harPriceHistory.js";
import type { PolymarketChart } from "./polymarketChart.js";

type DataPoint = GraphFile["data_points"][number];

function letterOf(index: number): string {
  return String.fromCharCode(97 + index);
}

function dateOf(timestamp: number): string {
  return EASTERN_DATE.format(new Date(timestamp * 1000));
}

export function percentOf(price: number): number {
  return Math.round(Number((price * 1000).toPrecision(12))) / 10;
}

function earliestByDate(points: PricePoint[]): Map<string, number> {
  const byDate = new Map<string, number>();
  for (const { t, p } of [...points].sort((x, y) => x.t - y.t)) {
    const date = dateOf(t);
    if (!byDate.has(date)) byDate.set(date, percentOf(p));
  }
  return byDate;
}

export function buildPolymarketGraph(chart: PolymarketChart, histories: Map<string, PricePoint[]>): GraphFile {
  const lineHistories = chart.lines.map((line) => histories.get(line.tokenId) ?? []);
  const lines = lineHistories.map(earliestByDate);
  const times = lineHistories.flat().map((point) => point.t).sort((x, y) => x - y);
  const dates = [...new Set(times.map(dateOf))];

  const latest: (number | undefined)[] = lines.map(() => undefined);
  const dataPoints: DataPoint[] = [];
  for (const date of dates) {
    lines.forEach((line, index) => {
      latest[index] = line.get(date) ?? latest[index];
    });
    if (latest.includes(undefined)) continue;
    const dataPoint: DataPoint = { date };
    latest.forEach((value, index) => {
      dataPoint[letterOf(index)] = value as number;
    });
    dataPoints.push(dataPoint);
  }

  const graph: Record<string, unknown> = { graph_title: chart.title };
  chart.lines.forEach((line, index) => {
    graph[`label_${letterOf(index)}`] = line.label;
  });
  graph.data_points = dataPoints;
  return graph as GraphFile;
}
