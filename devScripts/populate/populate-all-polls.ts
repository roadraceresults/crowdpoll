// Populates every new or changed poll data file of a folder through populate-poll.ts; usage in devScripts/populate/README.md.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const POPULATE_POLL_SCRIPT = path.join(SCRIPT_DIR, "populate-poll.ts");
export const HISTORY_FILE = path.join(SCRIPT_DIR, "populate-all-polls-history.json");
export const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..", "..");

export interface HistoryEntry {
  database: string;
  file: string;
  sha256: string;
  pollId: string;
  outcome: "created" | "refreshed";
  votesWritten: number;
  populatedAt: string;
}

export interface History {
  entries: HistoryEntry[];
}

export interface ChildResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

export type PopulateResult =
  | { ok: true; pollId: string; outcome: HistoryEntry["outcome"]; votesWritten: number }
  | { ok: false; message: string };

export interface RunOptions {
  argv: string[];
  env: NodeJS.ProcessEnv;
  historyPath: string;
  projectRoot: string;
  runPopulate: (file: string) => Promise<ChildResult>;
  log: (line: string) => void;
  logError: (line: string) => void;
}

class RunError extends Error {}

const DONE_LINE = /^\[populate\] Done: poll (\S+) (created|refreshed)\r?$/m;
const VOTES_LINE = /^\[populate\]\s+Votes deleted: [\d,]+\s+Votes written: ([\d,]+)\r?$/m;
const ERROR_LINE = /^\[populate\] (?:Error|failed): (.*?)\r?$/gm;

export function databaseIdentity(databaseUrl: string): string {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new RunError("ENV_DATABASE_URL is not set to a PostgreSQL URL");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new RunError("ENV_DATABASE_URL is not set to a PostgreSQL URL");
  url.password = "";
  return url.toString();
}

export function readPopulateResult(child: ChildResult): PopulateResult {
  if (child.signal) return { ok: false, message: `stopped by ${child.signal}` };
  if (child.exitCode !== 0) {
    const lastError = [...child.stderr.matchAll(ERROR_LINE)].at(-1);
    return { ok: false, message: lastError ? lastError[1]! : `exited with code ${child.exitCode}` };
  }
  const done = DONE_LINE.exec(child.stdout);
  const votes = VOTES_LINE.exec(child.stdout);
  if (!done || !votes) return { ok: false, message: "populated, but its summary could not be read" };
  return { ok: true, pollId: done[1]!, outcome: done[2] as HistoryEntry["outcome"], votesWritten: Number(votes[1]!.replaceAll(",", "")) };
}

export function listDataFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.json$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "en"));
}

export function readHistory(historyPath: string): History {
  let text: string;
  try {
    text = readFileSync(historyPath, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return { entries: [] };
    throw new RunError(`cannot read ${historyPath}: ${(err as Error).message}`);
  }
  let history: unknown;
  try {
    history = JSON.parse(text);
  } catch (err) {
    throw new RunError(`cannot read ${historyPath}: ${(err as Error).message}`);
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

const sha256Of = (file: string): string => createHash("sha256").update(readFileSync(file)).digest("hex");

export function runPopulateChild(file: string, env: NodeJS.ProcessEnv = process.env): Promise<ChildResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", POPULATE_POLL_SCRIPT, file], {
      cwd: PROJECT_ROOT,
      env,
      stdio: ["inherit", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      process.stdout.write(chunk);
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      process.stderr.write(chunk);
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (exitCode, signal) => resolve({ exitCode, signal, stdout, stderr }));
  });
}

function readDataFiles(dir: string): string[] {
  try {
    return listDataFiles(dir);
  } catch (err) {
    throw new RunError(`cannot read the directory ${dir}: ${(err as Error).message}`);
  }
}

async function populateEach(options: RunOptions, database: string, dir: string, files: string[], history: History): Promise<number> {
  const { historyPath, runPopulate, log, logError } = options;
  let populated = 0;
  let skipped = 0;
  const failures: { file: string; message: string }[] = [];

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const sha256 = sha256Of(fullPath);
    const recorded = history.entries.find((e) => e.database === database && e.file === file);
    if (recorded?.sha256 === sha256) {
      log(`[populate-all] Skipped ${file} (populated ${recorded.populatedAt})`);
      skipped++;
      continue;
    }

    log(`[populate-all] ${file}: populating`);
    const result = readPopulateResult(await runPopulate(fullPath));
    if (!result.ok) {
      logError(`[populate-all] Error: ${file}: ${result.message}`);
      failures.push({ file, message: result.message });
      continue;
    }
    history.entries = history.entries.filter((e) => !(e.database === database && e.file === file));
    history.entries.push({
      database,
      file,
      sha256,
      pollId: result.pollId,
      outcome: result.outcome,
      votesWritten: result.votesWritten,
      populatedAt: new Date().toISOString()
    });
    writeHistory(historyPath, history);
    populated++;
  }

  log(`[populate-all] Done: ${populated} populated, ${skipped} skipped, ${failures.length} failed`);
  if (failures.length === 0) return 0;
  logError("[populate-all] Failed files:");
  for (const { file, message } of failures) logError(`[populate-all]   ${file}: ${message}`);
  return 1;
}

export async function populateAllPolls(options: RunOptions): Promise<number> {
  const { argv, env, historyPath, projectRoot, log, logError } = options;
  try {
    if (argv.length > 1) throw new RunError("Usage: npm run populate-all-polls [<directory>]");
    const database = databaseIdentity(env.ENV_DATABASE_URL ?? "");
    const dir = argv[0] === undefined ? path.join(projectRoot, "polldata") : path.resolve(env.INIT_CWD ?? process.cwd(), argv[0]);
    const files = readDataFiles(dir);
    const history = readHistory(historyPath);

    log(`[populate-all] Target: ${database}`);
    if (files.length === 0) {
      log(`[populate-all] No .json files in ${dir}`);
      return 0;
    }
    return await populateEach(options, database, dir, files, history);
  } catch (err) {
    if (!(err instanceof RunError)) throw err;
    logError(`[populate-all] Error: ${err.message}`);
    return 1;
  }
}

async function main(): Promise<void> {
  try {
    process.exitCode = await populateAllPolls({
      argv: process.argv.slice(2),
      env: process.env,
      historyPath: HISTORY_FILE,
      projectRoot: PROJECT_ROOT,
      runPopulate: (file) => runPopulateChild(file),
      log: console.log,
      logError: console.error
    });
  } catch (err) {
    console.error(`[populate-all] failed: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
