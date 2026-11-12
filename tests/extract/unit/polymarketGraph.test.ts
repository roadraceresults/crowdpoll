import { describe, expect, it } from "vitest";
import type { PricePoint } from "../../../devScripts/extract/harPriceHistory.js";
import { buildPolymarketGraph, percentOf } from "../../../devScripts/extract/polymarketGraph.js";

const CHART = {
  title: "AI race",
  lines: [
    { label: "Alpha", tokenId: "111" },
    { label: "Beta", tokenId: "222" },
    { label: "Gamma", tokenId: "333" },
  ],
};

const HISTORIES = new Map<string, PricePoint[]>([
  [
    "111",
    [
      { t: 1780617600, p: 0.585 },
      { t: 1780660800, p: 0.6 },
      { t: 1780704000, p: 0.61 },
      { t: 1780833600, p: 0.62 },
    ],
  ],
  [
    "222",
    [
      { t: 1780617600, p: 0.11 },
      { t: 1780682400, p: 0.12 },
    ],
  ],
  [
    "333",
    [
      { t: 1780660800, p: 0.09 },
      { t: 1780833600, p: 0.0125 },
    ],
  ],
]);

const AI_RACE_GRAPH = {
  graph_title: "AI race",
  label_a: "Alpha",
  label_b: "Beta",
  label_c: "Gamma",
  data_points: [
    { date: "06/05/26", a: 60, b: 12, c: 9 },
    { date: "06/07/26", a: 62, b: 12, c: 1.3 },
  ],
};

function oneLine(points: PricePoint[]) {
  return buildPolymarketGraph(
    { title: "T", lines: [{ label: "Only", tokenId: "1" }] },
    new Map([["1", points]]),
  );
}

describe("buildPolymarketGraph", () => {
  it("writes one point per date once every line has started, carrying values forward", () => {
    const graph = buildPolymarketGraph(CHART, HISTORIES);
    expect(graph).toEqual(AI_RACE_GRAPH);
    expect(JSON.stringify(graph)).toBe(JSON.stringify(AI_RACE_GRAPH));
  });

  it("rounds price × 100 to one decimal", () => {
    const prices = [0.585, 0.09, 0.0125, 0, 1];
    const graph = oneLine(prices.map((p, index) => ({ t: 1780660800 + index * 86400, p })));
    expect(graph.data_points.map((point) => point.a)).toEqual([58.5, 9, 1.3, 0, 100]);
  });

  it("uses only the earliest point of a date", () => {
    const graph = oneLine([
      { t: 1780660800, p: 0.6 },
      { t: 1780704000, p: 0.7 },
    ]);
    expect(graph.data_points).toEqual([{ date: "06/05/26", a: 60 }]);
  });

  it("dates a point by the Eastern calendar", () => {
    expect(oneLine([{ t: 1780716600, p: 0.5 }]).data_points).toEqual([{ date: "06/05/26", a: 50 }]);
  });
});

describe("percentOf", () => {
  it("turns a price into cents rounded to one decimal", () => {
    expect(percentOf(0.63)).toBe(63);
    expect(percentOf(0.075)).toBe(7.5);
    expect(percentOf(0.001)).toBe(0.1);
  });
});
