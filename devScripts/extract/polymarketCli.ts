import fs from "node:fs/promises";
import path from "node:path";
import { OUTPUT_KEYS, parseSettings } from "./graphConfig.js";
import { ExtractError, type GraphInput, type GraphResult, messageOf, writeGraph } from "./graphExtraction.js";
import { checkOwnType } from "./graphTypeNames.js";
import { type PricePoint, readPriceHistories } from "./harPriceHistory.js";
import { normalizeTitle } from "./normalizeTitle.js";
import { isSamePath } from "./outputPath.js";
import { type PolymarketChart, readPolymarketChart } from "./polymarketChart.js";
import { buildPolymarketGraph } from "./polymarketGraph.js";
import { readHtmlFile } from "./readHtmlFile.js";

const USAGE = "Usage: npm run extract-polymarket <config.yaml>";
const KEYS = ["graph_title", "input_html", "input_history", "output_json", ...OUTPUT_KEYS];

interface PolymarketConfig {
  type?: string;
  graphTitle: string;
  title?: string;
  subtitle?: string;
  inputHtml: string;
  inputHistory: string;
  outputJson: string;
}

function parsePolymarketConfig(text: string, configPath: string): PolymarketConfig {
  const record = parseSettings(text, KEYS, OUTPUT_KEYS);
  const folder = path.dirname(configPath);
  return {
    type: record.type,
    graphTitle: record.graph_title!,
    title: record.title,
    subtitle: record.subtitle,
    inputHtml: path.resolve(folder, record.input_html!),
    inputHistory: path.resolve(folder, record.input_history!),
    outputJson: path.resolve(folder, record.output_json!),
  };
}

export async function extractPolymarket(input: GraphInput): Promise<GraphResult> {
  const { graphTitle, inputHtml, html } = input;
  const inputHistory = input.inputHistory ?? "";

  let harText: string;
  try {
    harText = await fs.readFile(inputHistory, "utf8");
  } catch (error) {
    throw new ExtractError(`cannot read ${inputHistory}: ${messageOf(error)}`);
  }
  console.log(`Read price history ${inputHistory}`);

  let chart: PolymarketChart;
  try {
    chart = readPolymarketChart(html);
  } catch (error) {
    throw new ExtractError(`page ${inputHtml}: ${messageOf(error)}`);
  }
  if (normalizeTitle(chart.title) !== normalizeTitle(graphTitle)) {
    throw new ExtractError(`graph ${JSON.stringify(graphTitle)} not found in ${inputHtml}; the page's graph is ${JSON.stringify(chart.title)}`);
  }

  let histories: Map<string, PricePoint[]>;
  try {
    histories = readPriceHistories(harText, chart.lines);
  } catch (error) {
    throw new ExtractError(`price history ${inputHistory}: ${messageOf(error)}`);
  }
  return { graph: buildPolymarketGraph(chart, histories), warnings: [] };
}

export async function runExtractPolymarket(args: string[]): Promise<number> {
  if (args.length !== 1) {
    console.error(USAGE);
    return 1;
  }
  const configPath = path.resolve(args[0]!);

  let text: string;
  try {
    text = await fs.readFile(configPath, "utf8");
  } catch (error) {
    console.error(`Error: cannot read config ${configPath}: ${messageOf(error)}`);
    return 1;
  }
  let config: PolymarketConfig;
  try {
    config = parsePolymarketConfig(text, configPath);
  } catch (error) {
    console.error(`Error: invalid config ${configPath}: ${messageOf(error)}`);
    return 1;
  }
  try {
    checkOwnType(config.type, "extract-polymarket", "polymarket line graph");
  } catch (error) {
    console.error(`Error: ${messageOf(error)}`);
    return 1;
  }
  const { graphTitle, title, subtitle, inputHtml, inputHistory, outputJson } = config;
  if (isSamePath(outputJson, inputHtml)) {
    console.error(`Error: output would overwrite the input file ${inputHtml}`);
    return 1;
  }
  if (isSamePath(outputJson, inputHistory)) {
    console.error(`Error: output would overwrite the price history file ${inputHistory}`);
    return 1;
  }
  if (isSamePath(outputJson, configPath)) {
    console.error(`Error: output would overwrite the config file ${configPath}`);
    return 1;
  }
  console.log(`Read config ${configPath}`);

  let html: string;
  try {
    html = await readHtmlFile(inputHtml);
  } catch (error) {
    console.error(`Error: cannot read ${inputHtml}: ${messageOf(error)}`);
    return 1;
  }
  console.log(`Read page ${inputHtml}`);

  let result: GraphResult;
  try {
    result = await extractPolymarket({ graphTitle, inputHtml, inputHistory, html });
  } catch (error) {
    console.error(`Error: ${messageOf(error)}`);
    return 1;
  }
  return (await writeGraph(result, { title: title ?? graphTitle, subtitle }, outputJson)) ? 0 : 1;
}
