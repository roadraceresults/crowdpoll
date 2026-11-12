import { describe, expect, it } from "vitest";
import type { PoliticoChart, TrendLine } from "../../../devScripts/extract/politicoChart.js";
import { buildPoliticoGraph } from "../../../devScripts/extract/politicoGraph.js";

const TITLE = "France — President Emmanuel Macron's approval rating";

// Default scales: x = 0 is 09/01/26 and 10 px is one day; value = 100 - y.
function chartOf(lines: TrendLine[], overrides: Partial<PoliticoChart> = {}): PoliticoChart {
  return {
    heading: TITLE,
    lines,
    undrawnLegends: [],
    xTicks: [{ offset: 0, label: "Sep" }, { offset: 300, label: "Oct" }],
    yTicks: [{ offset: 100, label: "0 %" }, { offset: 0, label: "100 %" }],
    focusDate: "Oct 22, 2026",
    ...overrides,
  };
}

function lineOf(key: string, label: string, points: [number, number][]): TrendLine {
  return { key, label, points: points.map(([x, y]) => ({ x, y })) };
}

const APPROVE = lineOf("macron_approve", "Approve", [[0, 83], [10, 82], [20, 81]]);
const DISAPPROVE = lineOf("macron_disapprove", "Disapprove", [[0, 20], [10, 21], [20, 22]]);

describe("buildPoliticoGraph: dates", () => {
  it("dates points from the month ticks anchored by the focus date", () => {
    const { graph } = buildPoliticoGraph(chartOf([APPROVE, DISAPPROVE]), TITLE);
    expect(graph.data_points.map((point) => point.date)).toEqual(["09/01/26", "09/02/26", "09/03/26"]);
  });

  it("dates points left of the visible window by extrapolation", () => {
    const line = lineOf("a", "A", [[-3000, 50], [0, 40]]);
    const { graph } = buildPoliticoGraph(chartOf([line, lineOf("b", "B", [[-3000, 60], [0, 70]])]), TITLE);
    expect(graph.data_points[0]!.date).toBe("11/05/25");
  });

  it("anchors a year-labelled tick to that year's January", () => {
    const chart = chartOf([lineOf("a", "A", [[0, 50], [310, 40]])], {
      xTicks: [{ offset: 0, label: "2026" }, { offset: 310, label: "Feb" }],
    });
    const { graph } = buildPoliticoGraph(chart, TITLE);
    expect(graph.data_points.map((point) => point.date)).toEqual(["01/01/26", "02/01/26"]);
  });

  it("rounds each point to the nearest day and keeps the first point of a repeated date", () => {
    const line = lineOf("a", "A", [[0, 83], [4, 50], [10, 82]]);
    const { graph } = buildPoliticoGraph(chartOf([line]), TITLE);
    expect(graph.data_points).toEqual([
      { date: "09/01/26", a: 17 },
      { date: "09/02/26", a: 18 },
    ]);
  });

  it("writes every date any included line covers, each point carrying only the lines present", () => {
    const a = lineOf("a", "A", [[0, 80], [10, 80], [20, 80]]);
    const b = lineOf("b", "B", [[10, 60], [20, 60], [30, 60]]);
    const { graph } = buildPoliticoGraph(chartOf([a, b]), TITLE);
    expect(graph.data_points).toEqual([
      { date: "09/01/26", a: 20 },
      { date: "09/02/26", a: 20, b: 40 },
      { date: "09/03/26", a: 20, b: 40 },
      { date: "09/04/26", b: 40 },
    ]);
  });

  it("writes lines whose dates do not overlap one after the other", () => {
    const a = lineOf("a", "A", [[0, 80], [10, 80]]);
    const b = lineOf("b", "B", [[20, 60], [30, 60]]);
    const { graph } = buildPoliticoGraph(chartOf([a, b]), TITLE);
    expect(graph.data_points).toEqual([
      { date: "09/01/26", a: 20 },
      { date: "09/02/26", a: 20 },
      { date: "09/03/26", b: 40 },
      { date: "09/04/26", b: 40 },
    ]);
  });
});

describe("buildPoliticoGraph: values and labels", () => {
  it("converts y offsets with the percent ticks, rounded to one decimal", () => {
    const line = lineOf("a", "A", [[0, 82.55], [10, 16.44]]);
    const { graph } = buildPoliticoGraph(chartOf([line]), TITLE);
    expect(graph.data_points.map((point) => point.a)).toEqual([17.5, 83.6]);
  });

  it("labels included lines a, b, … in path order and writes the config title verbatim", () => {
    const { graph } = buildPoliticoGraph(chartOf([APPROVE, DISAPPROVE]), TITLE);
    expect(graph.graph_title).toBe(TITLE);
    expect(graph.label_a).toBe("Approve");
    expect(graph.label_b).toBe("Disapprove");
    expect(graph).not.toHaveProperty("label_c");
    expect(graph.data_points[0]).toEqual({ date: "09/01/26", a: 17, b: 80 });
  });

  it("leaves out lines with fewer than two points and reports them", () => {
    const noop = lineOf("macron_noop", "No Opinion", [[0, 50]]);
    const { graph, warnings } = buildPoliticoGraph(chartOf([APPROVE, DISAPPROVE, noop]), TITLE);
    expect(warnings).toEqual(["line \"No Opinion\" has 1 point(s); left out"]);
    expect(graph).not.toHaveProperty("label_c");
    expect(Object.keys(graph.data_points[0]!)).toEqual(["date", "a", "b"]);
  });

  it("reports a legend text without a drawn line ahead of the short-line warnings", () => {
    const noop = lineOf("macron_noop", "No Opinion", [[0, 50]]);
    const { graph, warnings } = buildPoliticoGraph(chartOf([APPROVE, noop], { undrawnLegends: ["AR"] }), TITLE);
    expect(warnings).toEqual([
      "legend \"AR\" has no drawn line; left out",
      "line \"No Opinion\" has 1 point(s); left out",
    ]);
    expect(graph.label_a).toBe("Approve");
    expect(graph).not.toHaveProperty("label_b");
  });
});

describe("buildPoliticoGraph: errors", () => {
  it("reports fewer than two date axis ticks", () => {
    const chart = chartOf([APPROVE], { xTicks: [{ offset: 0, label: "Sep" }] });
    expect(() => buildPoliticoGraph(chart, TITLE)).toThrowError(/1 date axis tick/);
  });

  it("reports fewer than two percent axis ticks", () => {
    const chart = chartOf([APPROVE], { yTicks: [] });
    expect(() => buildPoliticoGraph(chart, TITLE)).toThrowError(/0 percent axis tick/);
  });

  it("reports a missing focus date", () => {
    const chart = chartOf([APPROVE], { focusDate: "" });
    expect(() => buildPoliticoGraph(chart, TITLE)).toThrowError(/no focus date/);
  });

  it("reports an unparseable focus date", () => {
    const chart = chartOf([APPROVE], { focusDate: "whenever" });
    expect(() => buildPoliticoGraph(chart, TITLE)).toThrowError(/"whenever" is not a date/);
  });

  it("reports an unparseable date axis label", () => {
    const chart = chartOf([APPROVE], { xTicks: [{ offset: 0, label: "??" }, { offset: 300, label: "Oct" }] });
    expect(() => buildPoliticoGraph(chart, TITLE)).toThrowError(/"\?\?" is not a month or a year/);
  });

  it("reports a value outside 0 to 100, naming the line", () => {
    const line = lineOf("a", "A", [[0, -10], [10, 50]]);
    expect(() => buildPoliticoGraph(chartOf([line]), TITLE)).toThrowError(/"A".*outside 0 to 100/);
  });

  it("reports a chart whose every line is too short as having no data points", () => {
    const chart = chartOf([lineOf("a", "A", [[0, 50]])]);
    expect(() => buildPoliticoGraph(chart, TITLE)).toThrowError(/has no data points/);
  });

  it("reports more than 26 included lines", () => {
    const lines = Array.from({ length: 27 }, (_, index) => lineOf(`k${index}`, `L${index}`, [[0, 50], [10, 50]]));
    expect(() => buildPoliticoGraph(chartOf(lines), TITLE)).toThrowError(/more than 26 lines/);
  });
});
