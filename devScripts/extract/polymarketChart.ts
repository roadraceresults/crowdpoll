import * as cheerio from "cheerio";

export interface ChartLine {
  label: string;
  tokenId: string;
}

export interface PolymarketChart {
  title: string;
  lines: ChartLine[];
}

const MAX_LINES = 26;
const PATH_SUFFIX = "-path";
const LEGEND_COLOR = "--legend-color-light:";

interface LegendItem {
  label: string;
  color: string;
}

function legendColorOf(style: string): string {
  const start = style.indexOf(LEGEND_COLOR) + LEGEND_COLOR.length;
  return style.slice(start).split(";")[0]!.trim();
}

export function readPolymarketChart(html: string): PolymarketChart {
  // https://cheerio.js.org/docs/basics/selecting
  const $ = cheerio.load(html);
  const heading = $("h1").first();
  const firstPath = $(`path[id$="${PATH_SUFFIX}"]`).first();
  if (heading.length === 0 || firstPath.length === 0) throw new Error("no Polymarket chart found");
  const paths = firstPath.closest("svg").find(`path[id$="${PATH_SUFFIX}"]`).toArray();
  if (paths.length > MAX_LINES) throw new Error(`has more than ${MAX_LINES} lines`);

  const legend: LegendItem[] = $(`[style*="${LEGEND_COLOR.slice(0, -1)}"]`)
    .toArray()
    .filter((item) => $(item).next("p").length > 0)
    .map((item) => {
      const paragraph = $(item).next("p").clone();
      paragraph.children("span").remove();
      return { label: paragraph.text().trim(), color: legendColorOf($(item).attr("style") as string) };
    });
  if (legend.length !== paths.length) {
    throw new Error(`legend has ${legend.length} labels but the chart has ${paths.length} lines`);
  }

  const lines = paths.map((line, index) => {
    const { label, color } = legend[index]!;
    if (label === "") throw new Error(`legend item ${index + 1} has no label`);
    const stroke = $(line).attr("stroke") ?? "";
    if (stroke.toLowerCase() !== color.toLowerCase()) {
      throw new Error(`line ${index + 1} color ${stroke} does not match legend "${label}" color ${color}`);
    }
    return { label, tokenId: ($(line).attr("id") as string).slice(0, -PATH_SUFFIX.length) };
  });
  return { title: heading.text().trim(), lines };
}
