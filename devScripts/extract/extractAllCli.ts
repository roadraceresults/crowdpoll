import fs from "node:fs/promises";
import path from "node:path";
import { detectPage, typeOfHost } from "./detectGraphType.js";
import { OUTPUT_KEYS, parseSettings } from "./graphConfig.js";
import { type GraphResult, messageOf, writeGraph } from "./graphExtraction.js";
import { ownTypeError, typeNamed } from "./graphTypeNames.js";
import { GRAPH_TYPES, type GraphType } from "./graphTypes.js";
import { isSamePath } from "./outputPath.js";
import type { Heading } from "./pollGraphFile.js";
import { readHtmlFile } from "./readHtmlFile.js";

const KEYS = ["url", "graph_title", "input_html", "input_history", "output_json", ...OUTPUT_KEYS];
const OPTIONAL_KEYS = ["url", "input_history", ...OUTPUT_KEYS];
const OLDEST_AGE_IN_DAYS = 365;

interface PipelineMode {
  usage: string;
  command: string;
  ownType?: GraphType;
  announceType: boolean;
}

interface ExtractAllConfig {
  url?: string;
  urlHost?: string;
  type?: string;
  graphTitle: string;
  heading: Heading;
  inputHtml: string;
  inputHistory?: string;
  outputJson: string;
}

function hostOfUrl(text: string): string {
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error("\"url\" must be an absolute http or https address");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("\"url\" must be an absolute http or https address");
  return url.hostname;
}

function parseExtractAllConfig(text: string, configPath: string): ExtractAllConfig {
  const record = parseSettings(text, KEYS, OPTIONAL_KEYS);
  const folder = path.dirname(configPath);
  return {
    url: record.url,
    urlHost: record.url === undefined ? undefined : hostOfUrl(record.url),
    type: record.type,
    graphTitle: record.graph_title!,
    heading: { title: record.title ?? record.graph_title!, subtitle: record.subtitle },
    inputHtml: path.resolve(folder, record.input_html!),
    inputHistory: record.input_history === undefined ? undefined : path.resolve(folder, record.input_history),
    outputJson: path.resolve(folder, record.output_json!),
  };
}

function givenType(config: ExtractAllConfig, mode: PipelineMode, types: GraphType[]): GraphType | undefined {
  if (config.type === undefined) return mode.ownType;
  const name = typeNamed(config.type);
  if (mode.ownType !== undefined && name !== mode.ownType.id) throw new Error(ownTypeError(config.type, mode.command, mode.ownType.id));
  const type = types.find((candidate) => candidate.id === name);
  if (type === undefined) throw new Error(`unsupported type ${JSON.stringify(config.type)}; supported: ${types.map((candidate) => candidate.id).join(", ")}`);
  return type;
}

function overwriteError(config: ExtractAllConfig, configPath: string): string | undefined {
  const { inputHtml, inputHistory, outputJson } = config;
  if (isSamePath(outputJson, inputHtml)) return `output would overwrite the input file ${inputHtml}`;
  if (inputHistory !== undefined && isSamePath(outputJson, inputHistory)) return `output would overwrite the history file ${inputHistory}`;
  if (isSamePath(outputJson, configPath)) return `output would overwrite the config file ${configPath}`;
  return undefined;
}

function hostError(host: string, type: GraphType | undefined, detectable: GraphType[]): string | undefined {
  if (type !== undefined) {
    return typeOfHost(host, [type]) === undefined ? `url host ${host} does not match type "${type.id}"; expected ${type.hosts.join(", ")}` : undefined;
  }
  if (typeOfHost(host, detectable) !== undefined) return undefined;
  return `unsupported url host ${host}; supported: ${[...new Set(detectable.flatMap((candidate) => candidate.hosts))].join(", ")}`;
}

function settleType(html: string, config: ExtractAllConfig, types: GraphType[]): GraphType {
  const { type, markers } = detectPage(html, types);
  if (config.urlHost === undefined) {
    if (type === undefined) {
      throw new Error(`cannot detect the graph type of ${config.inputHtml}; markers found: ${markers.length === 0 ? "none" : markers.join(", ")}`);
    }
    return type;
  }
  const host = config.urlHost;
  const urlType = typeOfHost(host, types) as GraphType;
  if (type !== urlType) {
    const looksLike = type === undefined ? "no known page type" : `a ${type.name} page`;
    throw new Error(`page ${config.inputHtml} does not match url ${host}: it looks like ${looksLike}`);
  }
  return urlType;
}

async function runGraphPipeline(args: string[], mode: PipelineMode, types: GraphType[]): Promise<number> {
  if (args.length !== 1) {
    console.error(mode.usage);
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
  let config: ExtractAllConfig;
  try {
    config = parseExtractAllConfig(text, configPath);
  } catch (error) {
    console.error(`Error: invalid config ${configPath}: ${messageOf(error)}`);
    return 1;
  }
  let given: GraphType | undefined;
  try {
    given = givenType(config, mode, types);
  } catch (error) {
    console.error(`Error: ${messageOf(error)}`);
    return 1;
  }
  const overwrite = overwriteError(config, configPath);
  if (overwrite !== undefined) {
    console.error(`Error: ${overwrite}`);
    return 1;
  }
  const detectable = types.filter((type) => type.detected);
  const hostProblem = config.urlHost === undefined ? undefined : hostError(config.urlHost, given, detectable);
  if (hostProblem !== undefined) {
    console.error(`Error: ${hostProblem}`);
    return 1;
  }
  console.log(`Read config ${configPath}`);

  const { url, graphTitle, heading, inputHtml, inputHistory, outputJson } = config;
  let html: string;
  try {
    html = await readHtmlFile(inputHtml);
  } catch (error) {
    console.error(`Error: cannot read ${inputHtml}: ${messageOf(error)}`);
    return 1;
  }
  console.log(`Read page ${inputHtml}`);

  let type: GraphType;
  if (given !== undefined) {
    type = given;
    if (mode.announceType) console.log(`Using type ${type.id}`);
  } else {
    try {
      type = settleType(html, config, detectable);
    } catch (error) {
      console.error(`Error: ${messageOf(error)}`);
      return 1;
    }
    console.log(`Detected ${type.name} page`);
  }
  if (type.needsHistory && inputHistory === undefined) {
    console.error(`Error: invalid config ${configPath}: missing key "input_history"`);
    return 1;
  }

  let result: GraphResult;
  try {
    result = await type.extract({ graphTitle, inputHtml, inputHistory, html });
  } catch (error) {
    console.error(`Error: ${messageOf(error)}`);
    return 1;
  }
  return (await writeGraph(result, heading, outputJson, { type: type.id, url, oldestAgeInDays: OLDEST_AGE_IN_DAYS })) ? 0 : 1;
}

export function runExtractAll(args: string[], types: GraphType[] = GRAPH_TYPES): Promise<number> {
  return runGraphPipeline(args, { usage: "Usage: npm run extract-all <config.yaml>", command: "extract-all", announceType: true }, types);
}

export function runExtractYesNo(args: string[], types: GraphType[] = GRAPH_TYPES): Promise<number> {
  const ownType = types.find((type) => type.id === "polymarket yes no");
  return runGraphPipeline(args, { usage: "Usage: npm run extract-polymarket-yes-no <config.yaml>", command: "extract-polymarket-yes-no", ownType, announceType: false }, types);
}
