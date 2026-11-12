import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readPolymarketChart } from "../../../devScripts/extract/polymarketChart.js";

const fixturePath = fileURLToPath(new URL("../fixtures/polymarket-chart.html", import.meta.url));
const FIXTURE = fs.readFileSync(fixturePath, "utf8");

describe("readPolymarketChart", () => {
  it("reads the title from the first h1", () => {
    expect(readPolymarketChart(FIXTURE).title).toBe("AI race");
  });

  it("pairs the legend labels with the line paths in order", () => {
    expect(readPolymarketChart(FIXTURE).lines).toEqual([
      { label: "Alpha", tokenId: "111" },
      { label: "Beta", tokenId: "222" },
      { label: "Gamma", tokenId: "333" },
    ]);
  });

  it("ignores the lines and outcome labels of other, smaller charts on the page", () => {
    const otherChart =
      "<div><div aria-hidden=\"true\"><p class=\"uppercase\" style=\"--legend-color-light: #87BFFF; --legend-color-dark: #87BFFF;\"></p></div>" +
      "<svg width=\"50\" height=\"20\"><path id=\"444-path\" stroke=\"#87BFFF\" d=\"M0,10C1,11,2,12,3,13\"></path><path id=\"444-path-shimmer\" stroke=\"#87BFFF\"></path></svg></div>";
    const page = FIXTURE.replace("</body>", `${otherChart}\n${otherChart.replaceAll("444", "555")}\n</body>`);
    expect(readPolymarketChart(page)).toEqual(readPolymarketChart(FIXTURE));
  });
});

describe("readPolymarketChart errors", () => {
  function chartPage(count: number): string {
    const legend = Array.from({ length: count }, (_, index) =>
      `<div><div style="--legend-color-light: #87BFFF;"></div><p>Line ${index + 1}<span>&nbsp;1%</span></p></div>`,
    ).join("");
    const paths = Array.from({ length: count }, (_, index) => `<path id="${index + 1}-path" stroke="#87BFFF"></path>`).join("");
    return `<h1>Many</h1>${legend}<svg>${paths}</svg>`;
  }

  it("reports a page without line paths", () => {
    expect(() => readPolymarketChart(FIXTURE.replaceAll("-path\"", "-line\""))).toThrow("no Polymarket chart found");
  });

  it("reports a page without an h1", () => {
    const page = FIXTURE.replaceAll("<h1", "<h2").replaceAll("</h1>", "</h2>");
    expect(() => readPolymarketChart(page)).toThrow("no Polymarket chart found");
  });

  it("reports more than 26 lines", () => {
    expect(readPolymarketChart(chartPage(26)).lines).toHaveLength(26);
    expect(() => readPolymarketChart(chartPage(27))).toThrow("has more than 26 lines");
  });

  it("reports a legend that does not match the lines", () => {
    const page = FIXTURE.split("\n").filter((line) => !line.includes(">Gamma<")).join("\n");
    expect(() => readPolymarketChart(page)).toThrow("legend has 2 labels but the chart has 3 lines");
  });

  it("reports a line whose color differs from its legend item", () => {
    const page = FIXTURE.replace("id=\"222-path\" stroke=\"#4378FF\"", "id=\"222-path\" stroke=\"#000000\"");
    expect(() => readPolymarketChart(page)).toThrow("line 2 color #000000 does not match legend \"Beta\" color #4378FF");
  });

  it("reports a legend item without a label", () => {
    expect(() => readPolymarketChart(FIXTURE.replace(">Alpha<span", "><span"))).toThrow("legend item 1 has no label");
  });
});
