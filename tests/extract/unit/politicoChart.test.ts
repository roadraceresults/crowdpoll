import { describe, expect, it } from "vitest";
import { readPoliticoChart } from "../../../devScripts/extract/politicoChart.js";
import { MACRON_HEADING, MACRON_TITLE_TYPED, macronChart, politicoPage } from "../politicoFixture.js";

describe("readPoliticoChart: selection", () => {
  it("selects the chart whose heading matches after punctuation normalization", () => {
    const page = politicoPage([
      { heading: "France — National parliament voting intention", lines: [{ key: "rn", label: "RN", points: [[0, 70], [10, 69]] }] },
      macronChart(),
    ]);
    const chart = readPoliticoChart(page, MACRON_TITLE_TYPED);
    expect(chart.heading).toBe(MACRON_HEADING);
    expect(chart.lines.map((line) => line.key)).toEqual(["macron_approve", "macron_disapprove", "macron_noop"]);
  });

  it("returns the heading as the page writes it", () => {
    const chart = readPoliticoChart(politicoPage([macronChart()]), MACRON_TITLE_TYPED);
    expect(chart.heading).toContain("’");
  });

  it("matches titles that differ in quote style, dash style or whitespace runs", () => {
    const page = politicoPage([macronChart({ heading: "France — “Les Bleus”  approval" })]);
    for (const title of [
      "France - \"Les Bleus\" approval",
      "France – “Les Bleus” approval",
      "  France — \"Les Bleus\"\tapproval ",
    ]) {
      expect(readPoliticoChart(page, title).lines).toHaveLength(3);
    }
  });

  it("fails a title matching no heading, naming the title and every chart heading found", () => {
    const page = politicoPage([
      macronChart({ heading: "France — National parliament voting intention" }),
      macronChart(),
    ]);
    expect(() => readPoliticoChart(page, "No Such Chart")).toThrowError(
      "graph \"No Such Chart\" not found; chart headings found: " +
        `"France — National parliament voting intention", ${JSON.stringify(MACRON_HEADING)}`,
    );
  });

  it("names \"none\" when the page has no chart headings at all", () => {
    expect(() => readPoliticoChart("<html><body><p>empty</p></body></html>", "X")).toThrowError(
      "graph \"X\" not found; chart headings found: none",
    );
  });

  it("fails when two headings match after normalization, naming both", () => {
    const page = politicoPage([macronChart(), macronChart({ heading: MACRON_TITLE_TYPED })]);
    expect(() => readPoliticoChart(page, MACRON_TITLE_TYPED)).toThrowError(
      `graph ${JSON.stringify(MACRON_TITLE_TYPED)} is ambiguous; matching headings: ` +
        `${JSON.stringify(MACRON_HEADING)}, ${JSON.stringify(MACRON_TITLE_TYPED)}`,
    );
  });
});

describe("readPoliticoChart: chart contents", () => {
  it("pairs legend labels to trend paths by key, in path order", () => {
    const chart = readPoliticoChart(politicoPage([macronChart()]), MACRON_TITLE_TYPED);
    expect(chart.lines.map((line) => line.label)).toEqual(["Approve", "Disapprove", "No Opinion"]);
    expect(chart.undrawnLegends).toEqual([]);
  });

  it("collects a legend text that has no drawn line instead of failing", () => {
    const page = politicoPage([macronChart()]).replace(
      "</svg>",
      "<text class=\"trend-ov-name-ghost fill-FR-presidential-approval-ghost\">Ghost</text></svg>",
    );
    const chart = readPoliticoChart(page, MACRON_TITLE_TYPED);
    expect(chart.undrawnLegends).toEqual(["Ghost"]);
    expect(chart.lines).toHaveLength(3);
  });

  it("parses path points, including negative coordinates and a one-point path ending in Z", () => {
    const chart = readPoliticoChart(
      politicoPage([macronChart({
        lines: [
          { key: "a", label: "A", points: [[-21406.209, 203.133], [10.5, 82]] },
          { key: "b", label: "B", points: [[0, 50]] },
        ],
      })]),
      MACRON_TITLE_TYPED,
    );
    expect(chart.lines[0]!.points).toEqual([{ x: -21406.209, y: 203.133 }, { x: 10.5, y: 82 }]);
    expect(chart.lines[1]!.points).toEqual([{ x: 0, y: 50 }]);
  });

  it("reads the axis ticks and the focus date", () => {
    const chart = readPoliticoChart(politicoPage([macronChart()]), MACRON_TITLE_TYPED);
    expect(chart.xTicks).toEqual([{ offset: 0, label: "Sep" }, { offset: 300, label: "Oct" }]);
    expect(chart.yTicks).toEqual([{ offset: 100, label: "0 %" }, { offset: 0, label: "100 %" }]);
    expect(chart.focusDate).toBe("Oct 22, 2026");
  });

  it("returns an empty focus date when the chart has none", () => {
    const chart = readPoliticoChart(politicoPage([macronChart({ focusDate: "" })]), MACRON_TITLE_TYPED);
    expect(chart.focusDate).toBe("");
  });

  it("ignores an event annotation whose text shares the date class", () => {
    const page = politicoPage([macronChart({ eventDate: "Andy Burnham new PM" })]);
    expect(readPoliticoChart(page, MACRON_TITLE_TYPED).focusDate).toBe("Oct 22, 2026");
    const dateless = politicoPage([macronChart({ focusDate: "", eventDate: "Andy Burnham new PM" })]);
    expect(readPoliticoChart(dateless, MACRON_TITLE_TYPED).focusDate).toBe("");
  });
});

describe("readPoliticoChart: errors", () => {
  it("reports a matched block without an svg", () => {
    const page = politicoPage([macronChart({ svg: false })]);
    expect(() => readPoliticoChart(page, MACRON_TITLE_TYPED)).toThrowError(/has no drawing/);
  });

  it("reports a chart without trend lines", () => {
    const page = politicoPage([macronChart({ lines: [] })]);
    expect(() => readPoliticoChart(page, MACRON_TITLE_TYPED)).toThrowError(/holds no trend lines/);
  });

  it("reports an unparseable path", () => {
    const page = politicoPage([macronChart({
      lines: [{ key: "macron_approve", label: "Approve", points: [], rawPath: "M1,2C3,4 5,6 7,8" }],
    })]);
    expect(() => readPoliticoChart(page, MACRON_TITLE_TYPED)).toThrowError(/macron_approve.*unparseable path/);
  });

  it("reports a path key that has no legend text", () => {
    const page = politicoPage([macronChart({
      lines: [
        { key: "macron_approve", label: "Approve", points: [[0, 83], [10, 82]] },
        { key: "macron_disapprove", points: [[0, 20], [10, 21]] },
      ],
    })]);
    expect(() => readPoliticoChart(page, MACRON_TITLE_TYPED)).toThrowError(/macron_disapprove.*no legend text/);
  });

});
