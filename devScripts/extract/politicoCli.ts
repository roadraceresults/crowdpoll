import fs from "node:fs/promises";
import path from "node:path";
import { OUTPUT_KEYS, parseSettings } from "./graphConfig.js";
import { ExtractError, type GraphInput, type GraphResult, messageOf, writeGraph } from "./graphExtraction.js";
import { checkOwnType } from "./graphTypeNames.js";
import { isSamePath } from "./outputPath.js";
import { readPoliticoChart } from "./politicoChart.js";
import { buildPoliticoGraph } from "./politicoGraph.js";
import { readHtmlFile } from "./readHtmlFile.js";

const USAGE = "Usage: npm run extract-politico <config.yaml>";
const KEYS = ["url", "graph_title", "input_html", "input_history", "output_json", ...OUTPUT_KEYS];

interface PoliticoConfig {
  url: string;
  type?: string;
  graphTitle: string;
  title?: string;
  subtitle?: string;
  inputHtml: string;
  inputHistory: string;
  outputJson: string;
}

function parsePoliticoConfig(text: string, configPath: string): PoliticoConfig {
  const record = parseSettings(text, KEYS, OUTPUT_KEYS);
  const folder = path.dirname(configPath);
  return {
    url: record.url!,
    type: record.type,
    graphTitle: record.graph_title!,
    title: record.title,
    subtitle: record.subtitle,
    inputHtml: path.resolve(folder, record.input_html!),
    inputHistory: path.resolve(folder, record.input_history!),
    outputJson: path.resolve(folder, record.output_json!),
  };
}

export async function extractPolitico(input: GraphInput): Promise<GraphResult> {
  const { graphTitle, inputHtml, html } = input;
  try {
    return buildPoliticoGraph(readPoliticoChart(html, graphTitle), graphTitle);
  } catch (error) {
    throw new ExtractError(`page ${inputHtml}: ${messageOf(error)}`);
  }
}

export async function runExtractPolitico(args: string[]): Promise<number> {
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
  let config: PoliticoConfig;
  try {
    config = parsePoliticoConfig(text, configPath);
  } catch (error) {
    console.error(`Error: invalid config ${configPath}: ${messageOf(error)}`);
    return 1;
  }
  try {
    checkOwnType(config.type, "extract-politico", "politico line graph");
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
    console.error(`Error: output would overwrite the recorded traffic file ${inputHistory}`);
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

  // The file named by input_history is catalogued in the config but never opened.
  let result: GraphResult;
  try {
    result = await extractPolitico({ graphTitle, inputHtml, html });
  } catch (error) {
    console.error(`Error: ${messageOf(error)}`);
    return 1;
  }
  return (await writeGraph(result, { title: title ?? graphTitle, subtitle }, outputJson)) ? 0 : 1;
}
