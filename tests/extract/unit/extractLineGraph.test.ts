import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { extractLineGraph } from "../../../devScripts/extract/extractLineGraph.js";
import { readHtmlFile } from "../../../devScripts/extract/readHtmlFile.js";

const fixturePath = fileURLToPath(new URL("../fixtures/line-graphs.html", import.meta.url));

const APPROVAL_GRAPH = {
  graph_title: "Approval over time",
  label_a: "Approve",
  label_b: "Disapprove",
  data_points: [
    { date: "02/07/25", a: 48, b: 49 },
    { date: "04/21/26", a: 37, b: 62 },
    { date: "10/21/26", a: 33, b: 65 },
  ],
};

type Question = { label: string; value: unknown };

function point(timestamp: unknown, questions: Question[]): Record<string, unknown> {
  return { timestamp, questions };
}

function approval(approve: unknown, disapprove: unknown): Question[] {
  return [
    { label: "Approve", value: approve },
    { label: "Disapprove", value: disapprove },
  ];
}

function chart(title: string, data: unknown = [point(1738904400, approval(48, 49))]): Record<string, unknown> {
  return { title, data };
}

function chartDiv(value: unknown): string {
  return `<div data-state="${JSON.stringify(value).replaceAll("&", "&amp;").replaceAll("\"", "&quot;")}"></div>`;
}

function page(...charts: unknown[]): string {
  return `<html><body>${charts.map(chartDiv).join("")}</body></html>`;
}

function extractFrom(data: unknown): () => unknown {
  return () => extractLineGraph(page(chart("G", data)), "G");
}

let html: string;

beforeAll(async () => {
  html = await readHtmlFile(fixturePath);
});

describe("extractLineGraph", () => {
  it("writes one point per date, matching values by label, with US Eastern dates", () => {
    expect(extractLineGraph(html, "Approval over time")).toEqual(APPROVAL_GRAPH);
  });

  it("orders the keys as graph_title, labels, data_points, and date before the values", () => {
    const graph = extractLineGraph(html, "Approval over time");
    expect(Object.keys(graph)).toEqual(["graph_title", "label_a", "label_b", "data_points"]);
    for (const point of graph.data_points) expect(Object.keys(point)).toEqual(["date", "a", "b"]);
  });

  it("gives a three-line graph three labels and converts text values to numbers", () => {
    expect(extractLineGraph(html, "Ballot over time")).toEqual({
      graph_title: "Ballot over time",
      label_a: "Democrats",
      label_b: "Republicans",
      label_c: "Undecided",
      data_points: [
        { date: "08/15/26", a: 50, b: 43, c: 7 },
        { date: "08/22/26", a: 51, b: 42, c: 7 },
      ],
    });
  });

  it("ignores data-state values that are not JSON or have no title", () => {
    const page = `<div data-state="{oops"></div><div data-state="[1,2]"></div>${chartDiv(chart("Only"))}`;
    expect(extractLineGraph(page, "Only").label_a).toBe("Approve");
  });

  it("writes every value as a number", () => {
    for (const title of ["Approval over time", "Ballot over time"]) {
      for (const { date, ...values } of extractLineGraph(html, title).data_points) {
        for (const value of Object.values(values)) expect(typeof value).toBe("number");
      }
    }
  });
});

describe("extractLineGraph errors", () => {
  it("names every title found when the graph is not on the page", () => {
    expect(() => extractLineGraph(html, "Nope")).toThrow(
      "not found; graphs found: \"Latest approval rating\", \"Approval over time\", \"Ballot over time\"",
    );
    expect(() => extractLineGraph("<p>no charts</p>", "Nope")).toThrow("not found; graphs found: none");
  });

  it("rejects a title shared by two graphs", () => {
    expect(() => extractLineGraph(page(chart("Twice"), chart("Twice")), "Twice")).toThrow(
      "is ambiguous: 2 graphs have this title",
    );
  });

  it("rejects a graph with no data points", () => {
    expect(() => extractLineGraph(html, "Latest approval rating")).toThrow("has no data points");
    expect(extractFrom([])).toThrow("has no data points");
  });

  it("rejects more than 26 lines", () => {
    const questions = Array.from({ length: 27 }, (_, index) => ({ label: `L${index}`, value: index }));
    expect(extractFrom([point(1738904400, questions)])).toThrow("has more than 26 lines");
  });

  it("rejects a point without a numeric timestamp", () => {
    for (const timestamp of [undefined, "x"]) {
      expect(extractFrom([point(1738904400, approval(1, 2)), point(timestamp, approval(1, 2))])).toThrow(
        "point 2 has no timestamp",
      );
    }
  });

  it("rejects a point missing one of the first point's labels", () => {
    const missing = [point(1738904400, approval(1, 2)), point(1776744000, [{ label: "Approve", value: 1 }])];
    expect(extractFrom(missing)).toThrow("point 2 is missing label \"Disapprove\"");
  });

  it("rejects a point with a label the first point does not have", () => {
    const extra = [point(1738904400, approval(1, 2)), point(1776744000, [...approval(1, 2), { label: "Undecided", value: 3 }])];
    expect(extractFrom(extra)).toThrow("point 2 has label \"Undecided\" that the first point does not have");
  });

  it("rejects a repeated label", () => {
    const repeated = [point(1738904400, [{ label: "Approve", value: 1 }, { label: "Approve", value: 2 }])];
    expect(extractFrom(repeated)).toThrow("point 1 repeats label \"Approve\"");
  });

  it("rejects values that are not numbers", () => {
    for (const value of ["abc", null, true, "%"]) {
      expect(extractFrom([point(1738904400, approval(value, 2))])).toThrow("point 1 value for \"Approve\" is not a number");
    }
  });

  it("checks points that are dropped as repeated dates", () => {
    const data = [
      point(1738904400, approval(1, 2)),
      point(1776744000, approval(3, 4)),
      point(1776808800, [{ label: "Approve", value: 5 }]),
    ];
    expect(extractFrom(data)).toThrow("point 3 is missing label \"Disapprove\"");
  });
});

describe("extractLineGraph title matching", () => {
  it("finds a title that differs only in apostrophes, quotes, dashes or spacing", () => {
    const html = page(chart("Trump’s “approval” – latest"));
    for (const typed of ["Trump's \"approval\" - latest", "Trump’s  “approval” –  latest", " Trump's \"approval\" — latest "]) {
      expect(extractLineGraph(html, typed).graph_title).toBe("Trump’s “approval” – latest");
    }
  });

  it("rejects two charts whose titles normalize alike as ambiguous", () => {
    expect(() => extractLineGraph(page(chart("Biden’s approval"), chart("Biden's approval")), "Biden's approval")).toThrow(
      "is ambiguous: 2 graphs have this title",
    );
  });
});
