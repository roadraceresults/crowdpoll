// Brings the development database's migration record in line with this folder's migrations; usage in devScripts/MIGRATIONS-HOWTO.md.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { sql } from "kysely";
import type { Migration } from "kysely/migration";
import { createDb, closeDb, type Db } from "../src/db/client.js";
import { migrations } from "../src/db/migrations/index.js";

export interface MigrationRecord {
  name: string;
  timestamp: string;
}

export interface ForeignMigration {
  name: string;
  file: string;
  folders: string[];
}

export type Action =
  | { kind: "rename"; from: string; to: string }
  | { kind: "rollback"; name: string; file: string }
  | { kind: "apply"; name: string; timestamp: string; before: string };

export interface Problem {
  name: string;
  reason: string;
}

export interface Plan {
  actions: Action[];
  problems: Problem[];
}

const MIGRATION_LOCK_ID = "3853314791062309107";
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
const BUSY = "the database is being migrated by another process";

export class RepairError extends Error {}

function suffixOf(name: string): string {
  return /^\d{3}-(.+)$/.exec(name)?.[1] ?? name;
}

function isProblem(found: ForeignMigration | Problem): found is Problem {
  return "reason" in found;
}

export function sortRecords(records: MigrationRecord[]): MigrationRecord[] {
  return [...records].sort((a, b) =>
    a.timestamp === b.timestamp ? a.name.localeCompare(b.name) : new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export function planRepair(
  recordsInTimeOrder: MigrationRecord[],
  folderNames: string[],
  findForeign: (name: string) => ForeignMigration | Problem
): Plan {
  const folder = [...folderNames].sort();
  const recorded = new Set(recordsInTimeOrder.map((r) => r.name));
  const problems: Problem[] = [];
  const renames: Action[] = [];
  const rollbacks: Action[] = [];
  const seen = new Set<string>();
  const kept: MigrationRecord[] = [];

  for (const record of recordsInTimeOrder) {
    if (seen.has(record.name)) {
      problems.push({ name: record.name, reason: "duplicate record" });
      continue;
    }
    seen.add(record.name);
    if (folder.includes(record.name)) {
      kept.push(record);
      continue;
    }
    const suffix = suffixOf(record.name);
    const matches = folder.filter((name) => !recorded.has(name) && suffixOf(name) === suffix);
    if (matches.length === 1) {
      renames.push({ kind: "rename", from: record.name, to: matches[0]! });
      kept.push({ name: matches[0]!, timestamp: record.timestamp });
    } else if (matches.length > 1) {
      problems.push({ name: record.name, reason: `${matches.length} folder migrations end in -${suffix}` });
    } else {
      const found = findForeign(record.name);
      if (isProblem(found)) problems.push(found);
      else rollbacks.unshift({ kind: "rollback", name: record.name, file: found.file });
    }
  }

  const keptNames = new Set(kept.map((r) => r.name));
  const greatest = [...keptNames].sort().at(-1);
  const applies: Action[] = [];
  if (greatest !== undefined) {
    for (const name of folder) {
      if (keptNames.has(name) || name >= greatest) continue;
      const after = kept.find((r) => r.name > name)!;
      applies.push({ kind: "apply", name, timestamp: after.timestamp, before: after.name });
    }
  }
  return { actions: [...renames, ...rollbacks, ...applies], problems };
}

export function findForeignIn(siblingsRoot: string, ownFolder: string): (name: string) => Promise<ForeignMigration | Problem> {
  const root = resolve(siblingsRoot);
  return async (name) => {
    const copies = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== ownFolder)
      .map((entry) => ({ folder: join(root, entry.name), file: join(root, entry.name, "src", "db", "migrations", `${name}.ts`) }))
      .filter((copy) => existsSync(copy.file))
      .sort((a, b) => a.folder.localeCompare(b.folder));
    if (copies.length === 0) return { name, reason: `no folder beside this one has ${name}.ts` };
    const first = readFileSync(copies[0]!.file);
    if (copies.some((copy) => !readFileSync(copy.file).equals(first))) {
      return { name, reason: `the folders beside this one disagree on ${name}.ts (${copies.map((c) => c.folder).join(", ")})` };
    }
    const loaded = (await import(pathToFileURL(copies[0]!.file).href)) as Partial<Migration>;
    if (typeof loaded.down !== "function") return { name, reason: `${name}.ts has no down()` };
    return { name, file: copies[0]!.file, folders: copies.map((c) => c.folder) };
  };
}

function folderOf(file: string): string {
  return resolve(dirname(file), "..", "..", "..");
}

export function describeAction(action: Action): string {
  switch (action.kind) {
    case "rename":
      return `Rename ${action.from} → ${action.to}`;
    case "rollback":
      return `Roll back ${action.name} (down() from ${folderOf(action.file)}); its data is lost and that folder applies it again on its next start`;
    case "apply":
      return `Apply ${action.name} (recorded before ${action.before})`;
  }
}

function labelOf(action: Action): string {
  switch (action.kind) {
    case "rename":
      return `Rename ${action.from} → ${action.to}`;
    case "rollback":
      return `Roll back ${action.name}`;
    case "apply":
      return `Apply ${action.name}`;
  }
}

class StepError extends Error {}

async function step<T>(label: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    throw new StepError(`${label}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function checkRecord(records: MigrationRecord[], folderMigrations: Record<string, Migration>): void {
  const folder = Object.keys(folderMigrations).sort();
  const executed = sortRecords(records).map((r) => r.name);
  for (const name of executed) {
    if (!folder.includes(name)) throw new Error(`previously executed migration ${name} is missing`);
  }
  executed.forEach((name, i) => {
    if (folder[i] !== name) throw new Error(`expected previously executed migration ${name} to be at index ${i} but ${folder[i]} was found in its place`);
  });
}

export async function applyRepair(db: Db, plan: Plan, folderMigrations: Record<string, Migration>): Promise<number> {
  try {
    await db.transaction().execute(async (trx) => {
      await sql`select set_config('lock_timeout', '10000', true)`.execute(trx);
      await sql`select pg_advisory_xact_lock(${sql.raw(MIGRATION_LOCK_ID)})`.execute(trx);
      for (const action of plan.actions) {
        await step(labelOf(action), async () => {
          if (action.kind === "rename") {
            await trx.updateTable("kysely_migration" as never).set({ name: action.to } as never).where("name" as never, "=", action.from as never).execute();
          } else if (action.kind === "rollback") {
            const foreign = (await import(pathToFileURL(action.file).href)) as Migration;
            await foreign.down!(trx);
            await trx.deleteFrom("kysely_migration" as never).where("name" as never, "=", action.name as never).execute();
          } else {
            await folderMigrations[action.name]!.up(trx);
            await trx.insertInto("kysely_migration" as never).values({ name: action.name, timestamp: action.timestamp } as never).execute();
          }
        });
      }
      await step("final check", async () => {
        const { rows } = await sql<MigrationRecord>`select name, timestamp from kysely_migration`.execute(trx);
        checkRecord(rows, folderMigrations);
      });
    });
  } catch (err) {
    if (err instanceof StepError) {
      throw new RepairError(`${err.message}; every change was rolled back`);
    }
    if ((err as { code?: string }).code === "55P03") throw new RepairError(BUSY);
    throw err;
  }
  return plan.actions.length;
}

async function readRecords(db: Db): Promise<MigrationRecord[]> {
  try {
    const { rows } = await sql<MigrationRecord>`select name, timestamp from kysely_migration`.execute(db);
    return sortRecords(rows);
  } catch (err) {
    if ((err as { code?: string }).code === "42P01") return [];
    throw err;
  }
}

const scriptFile = fileURLToPath(import.meta.url);
const repositoryRoot = dirname(dirname(scriptFile));

export async function main(
  argv: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env,
  log: (line: string) => void = console.log,
  siblingsRoot: string = dirname(repositoryRoot)
): Promise<number> {
  const say = (line: string): void => log(`[migrations] ${line}`);
  const fail = (message: string): number => {
    say(`Error: ${message}`);
    return 1;
  };

  let apply = false;
  for (const arg of argv) {
    if (arg === "--apply") apply = true;
    else return fail(`unknown argument ${arg}; usage: npm run fix-migrations [-- --apply]`);
  }

  let url: URL;
  try {
    url = new URL(env.ENV_DATABASE_URL ?? "");
  } catch {
    return fail("ENV_DATABASE_URL is not set to a PostgreSQL URL");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) return fail("ENV_DATABASE_URL is not set to a PostgreSQL URL");
  if (!LOCAL_HOSTS.includes(url.hostname)) {
    return fail(`${url.hostname} is not a database on this machine; only localhost, 127.0.0.1 and ::1 are repaired`);
  }

  const db = createDb(url.toString(), { max: 1 });
  try {
    try {
      await sql`select 1`.execute(db);
    } catch (err) {
      return fail(`cannot reach the database: ${(err as Error).message}`);
    }
    const records = await readRecords(db);
    const folderNames = Object.keys(migrations).sort();
    say(`Database ${decodeURIComponent(url.pathname.slice(1))} on ${url.hostname}`);
    say(`Folder: ${repositoryRoot} (${folderNames.length} migrations); database: ${records.length} records`);

    const find = findForeignIn(siblingsRoot, basename(repositoryRoot));
    const resolved = new Map<string, ForeignMigration | Problem>();
    for (const record of records) {
      if (!folderNames.includes(record.name) && !resolved.has(record.name)) resolved.set(record.name, await find(record.name));
    }
    const plan = planRepair(records, folderNames, (name) => resolved.get(name)!);

    if (plan.problems.length > 0) {
      for (const problem of plan.problems) say(`Problem: ${problem.name}: ${problem.reason}`);
      return fail(`${plan.problems.length} problem(s); nothing written`);
    }
    if (plan.actions.length === 0) {
      say("Nothing to fix");
      return 0;
    }
    for (const action of plan.actions) say(describeAction(action));
    say("Stop the servers that use this database before applying.");
    if (!apply) {
      say("Dry run: nothing written. Run npm run fix-migrations -- --apply to apply.");
      return 0;
    }
    try {
      const count = await applyRepair(db, plan, migrations);
      say(`Done: ${count} change(s) applied`);
      return 0;
    } catch (err) {
      return fail((err as Error).message);
    }
  } finally {
    await closeDb(db);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => {
    process.exitCode = code;
  });
}
