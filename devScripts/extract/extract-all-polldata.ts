// Extracts every new or changed configuration of a folder through extract-all; usage in README.md.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { format } from "node:util";
import { parse } from "yaml";
import { runExtractAll } from "./extractAllCli.js";
import { messageOf } from "./graphExtraction.js";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const HISTORY_FILE = path.join(SCRIPT_DIR, "extract-all-polldata-history.json");
export const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..", "..");
const PREFIX = "[extract-all-polldata]";

export interface HistoryEntry {
  directory: string;
  file: string;
  sha256: string;
  outputJson: string;
  extractedAt: string;
}

export interface History {
  entries: HistoryEntry[];
}

export interface RunOptions {
  argv: string[];
  env: NodeJS.ProcessEnv;
  historyPath: string;
  projectRoot: string;
  runExtract: (configPath: string) => Promise<number>;
  log: (line: string) => void;
  logError: (line: string) => void;
}

export interface ConfigInputs {
  inputHtml: string;
  inputHistory?: string | undefined;
  outputJson: string;
}

class RunError extends Error {}

export function listConfigFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "en"));
}

export function readHistory(historyPath: string): History {
  let text: string;
  try {
    text = readFileSync(historyPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { entries: [] };
    throw new RunError(`cannot read ${historyPath}: ${messageOf(error)}`);
  }
  let history: unknown;
  try {
    history = JSON.parse(text);
  } catch (error) {
    throw new RunError(`cannot read ${historyPath}: ${messageOf(error)}`);
  }
  if (typeof history !== "object" || history === null || !Array.isArray((history as History).entries)) {
    throw new RunError(`cannot read ${historyPath}: it does not hold an "entries" list`);
  }
  return history as History;
}

export function writeHistory(historyPath: string, history: History): void {
  const temporary = `${historyPath}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(history, null, 2)}\n`);
  renameSync(temporary, historyPath);
}

function settingsOf(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) {
    const settings: Record<string, unknown> = {};
    for (const entry of value) {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return undefined;
      Object.assign(settings, entry);
    }
    return settings;
  }
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
}

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value !== "";

export function configInputs(configPath: string): ConfigInputs | undefined {
  let settings: Record<string, unknown> | undefined;
  try {
    settings = settingsOf(parse(readFileSync(configPath, "utf8")));
  } catch {
    return undefined;
  }
  if (settings === undefined) return undefined;
  const { input_html: inputHtml, input_history: inputHistory, output_json: outputJson } = settings;
  if (!isNonEmptyString(inputHtml) || !isNonEmptyString(outputJson)) return undefined;
  if (inputHistory !== undefined && !isNonEmptyString(inputHistory)) return undefined;
  const folder = path.dirname(configPath);
  return {
    inputHtml: path.resolve(folder, inputHtml),
    inputHistory: inputHistory === undefined ? undefined : path.resolve(folder, inputHistory),
    outputJson: path.resolve(folder, outputJson),
  };
}

export function fingerprintOf(configPath: string, inputs: ConfigInputs | undefined = configInputs(configPath)): string | undefined {
  if (inputs === undefined) return undefined;
  const parts: [string, string][] = [["config", configPath], ["html", inputs.inputHtml]];
  if (inputs.inputHistory !== undefined) parts.push(["history", inputs.inputHistory]);
  const hash = createHash("sha256");
  try {
    for (const [role, file] of parts) {
      const bytes = readFileSync(file);
      hash.update(`${role}:${bytes.length}\0`).update(bytes);
    }
  } catch {
    return undefined;
  }
  return hash.digest("hex");
}

async function extractOne(runExtract: RunOptions["runExtract"], configPath: string): Promise<string | undefined> {
  const originalError = console.error;
  let lastError: string | undefined;
  console.error = (...args: unknown[]) => {
    const line = format(...args);
    if (line.startsWith("Error: ")) lastError = line.slice("Error: ".length);
    originalError(...args);
  };
  try {
    const status = await runExtract(configPath);
    return status === 0 ? undefined : (lastError ?? `exited with status ${status}`);
  } catch (error) {
    return messageOf(error);
  } finally {
    console.error = originalError;
  }
}

function readConfigFiles(dir: string): string[] {
  try {
    return listConfigFiles(dir);
  } catch (error) {
    throw new RunError(`cannot read the directory ${dir}: ${messageOf(error)}`);
  }
}

async function extractEach(options: RunOptions, directory: string, files: string[], history: History): Promise<number> {
  const { historyPath, runExtract, log, logError } = options;
  let extracted = 0;
  let skipped = 0;
  const failures: { file: string; message: string }[] = [];

  for (const file of files) {
    const configPath = path.join(directory, file);
    const inputs = configInputs(configPath);
    const sha256 = fingerprintOf(configPath, inputs);
    const recorded = history.entries.find((entry) => entry.directory === directory && entry.file === file);
    if (sha256 !== undefined && recorded?.sha256 === sha256) {
      log(`${PREFIX} Skipped ${file} (extracted ${recorded.extractedAt})`);
      skipped++;
      continue;
    }

    log(`${PREFIX} ${file}: extracting`);
    const failure = await extractOne(runExtract, configPath);
    if (failure !== undefined) {
      logError(`${PREFIX} Error: ${file}: ${failure}`);
      failures.push({ file, message: failure });
      continue;
    }
    extracted++;
    if (sha256 === undefined || inputs === undefined) continue;
    history.entries = history.entries.filter((entry) => !(entry.directory === directory && entry.file === file));
    history.entries.push({ directory, file, sha256, outputJson: inputs.outputJson, extractedAt: new Date().toISOString() });
    writeHistory(historyPath, history);
  }

  log(`${PREFIX} Done: ${extracted} extracted, ${skipped} skipped, ${failures.length} failed`);
  if (failures.length === 0) return 0;
  logError(`${PREFIX} Failed files:`);
  for (const { file, message } of failures) logError(`${PREFIX}   ${file}: ${message}`);
  return 1;
}

export async function extractAllPolldata(options: RunOptions): Promise<number> {
  const { argv, env, historyPath, projectRoot, log, logError } = options;
  try {
    if (argv.length > 1) throw new RunError("Usage: npm run extract-all-polldata [<directory>]");
    const dir = argv[0] === undefined ? path.join(projectRoot, "polldata") : path.resolve(env.INIT_CWD ?? process.cwd(), argv[0]);
    const files = readConfigFiles(dir);
    const directory = realpathSync.native(dir);
    const history = readHistory(historyPath);

    if (files.length === 0) {
      log(`${PREFIX} No .yaml or .yml files in ${dir}`);
      return 0;
    }
    return await extractEach(options, directory, files, history);
  } catch (error) {
    if (!(error instanceof RunError)) throw error;
    logError(`${PREFIX} Error: ${error.message}`);
    return 1;
  }
}

async function main(): Promise<void> {
  try {
    process.exitCode = await extractAllPolldata({
      argv: process.argv.slice(2),
      env: process.env,
      historyPath: HISTORY_FILE,
      projectRoot: PROJECT_ROOT,
      runExtract: (configPath) => runExtractAll([configPath]),
      log: console.log,
      logError: console.error,
    });
  } catch (error) {
    console.error(`${PREFIX} failed: ${messageOf(error)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
