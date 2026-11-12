import path from "node:path";
import { parse } from "yaml";

export interface GraphConfig {
  type?: string;
  graphTitle: string;
  title?: string;
  subtitle?: string;
  inputHtml: string;
  outputJson: string;
}

const KEYS = ["graph_title", "input_html", "output_json"];
export const OUTPUT_KEYS = ["type", "title", "subtitle"];

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeSettings(entries: unknown[]): Record<string, unknown> {
  const settings: Record<string, unknown> = {};
  entries.forEach((entry, index) => {
    if (!isMapping(entry) || Object.keys(entry).length !== 1) {
      throw new Error(`list entry ${index + 1} must be a single "key: value" setting`);
    }
    const [key, value] = Object.entries(entry)[0]!;
    if (key in settings) throw new Error(`repeated key "${key}"`);
    settings[key] = value;
  });
  return settings;
}

function listOf(keys: string[]): string {
  const quoted = keys.map((key) => `"${key}"`);
  return `${quoted.slice(0, -1).join(", ")} and ${quoted[quoted.length - 1]}`;
}

function readSettings(value: unknown, keys: string[]): Record<string, unknown> {
  if (Array.isArray(value)) return mergeSettings(value);
  if (!isMapping(value)) throw new Error(`expected a mapping with the keys ${listOf(keys)}`);
  return value;
}

export function parseSettings(text: string, keys: string[], optional: string[] = []): Record<string, string> {
  // https://eemeli.org/yaml/#parse-amp-stringify
  const record = readSettings(parse(text), keys);
  const unknownKey = Object.keys(record).find((key) => !keys.includes(key));
  if (unknownKey !== undefined) throw new Error(`unknown key "${unknownKey}"`);
  for (const key of keys) {
    if (!(key in record)) {
      if (optional.includes(key)) continue;
      throw new Error(`missing key "${key}"`);
    }
    const value = record[key];
    if (typeof value !== "string" || value === "") throw new Error(`"${key}" must be a non-empty string`);
  }
  return record as Record<string, string>;
}

export function parseGraphConfig(text: string, configPath: string): GraphConfig {
  const record = parseSettings(text, [...KEYS, ...OUTPUT_KEYS], OUTPUT_KEYS);
  const folder = path.dirname(configPath);
  return {
    type: record.type,
    graphTitle: record.graph_title!,
    title: record.title,
    subtitle: record.subtitle,
    inputHtml: path.resolve(folder, record.input_html!),
    outputJson: path.resolve(folder, record.output_json!),
  };
}
