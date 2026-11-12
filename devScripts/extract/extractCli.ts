import fs from "node:fs/promises";
import path from "node:path";
import { extractLineGraph, GraphError } from "./extractLineGraph.js";
import { type GraphConfig, parseGraphConfig } from "./graphConfig.js";
import { ExtractError, type GraphInput, type GraphResult, messageOf, writeGraph } from "./graphExtraction.js";
import { checkOwnType } from "./graphTypeNames.js";
import { isSamePath } from "./outputPath.js";
import { readHtmlFile } from "./readHtmlFile.js";

const USAGE = "Usage: npm run extract-cnn <config.yaml>";

function graphErrorMessage(error: unknown, graphTitle: string, inputHtml: string): string {
  const graph = `graph ${JSON.stringify(graphTitle)}`;
  if (!(error instanceof GraphError)) return `${graph} in ${inputHtml}: ${messageOf(error)}`;
  if (error.problem === "not-found") return `${graph} not found in ${inputHtml}; graphs found: ${error.detail}`;
  if (error.problem === "ambiguous") return `${graph} is ambiguous in ${inputHtml}: ${error.detail}`;
  return `${graph} in ${inputHtml}: ${error.detail}`;
}

export async function extractCnn(input: GraphInput): Promise<GraphResult> {
  const { graphTitle, inputHtml, html } = input;
  try {
    return { graph: extractLineGraph(html, graphTitle), warnings: [] };
  } catch (error) {
    throw new ExtractError(graphErrorMessage(error, graphTitle, inputHtml));
  }
}

export async function runExtract(args: string[]): Promise<number> {
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
  let config: GraphConfig;
  try {
    config = parseGraphConfig(text, configPath);
  } catch (error) {
    console.error(`Error: invalid config ${configPath}: ${messageOf(error)}`);
    return 1;
  }
  try {
    checkOwnType(config.type, "extract-cnn", "cnn line graph");
  } catch (error) {
    console.error(`Error: ${messageOf(error)}`);
    return 1;
  }
  const { graphTitle, title, subtitle, inputHtml, outputJson } = config;
  if (isSamePath(outputJson, inputHtml)) {
    console.error(`Error: output would overwrite the input file ${inputHtml}`);
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
    result = await extractCnn({ graphTitle, inputHtml, html });
  } catch (error) {
    console.error(`Error: ${messageOf(error)}`);
    return 1;
  }
  return (await writeGraph(result, { title: title ?? graphTitle, subtitle }, outputJson)) ? 0 : 1;
}
