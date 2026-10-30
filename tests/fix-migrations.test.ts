import { afterAll, describe, expect, it } from "vitest";
import { inject } from "vitest";
import { join, resolve } from "node:path";
import pg from "pg";
import { sql } from "kysely";
import { createDb, closeDb, type Db } from "../src/db/client.js";
import { migrateToLatest } from "../src/db/migrator.js";
import { migrations } from "../src/db/migrations/index.js";
import {
  applyRepair,
  findForeignIn,
  main,
  planRepair,
  sortRecords,
  type ForeignMigration,
  type MigrationRecord,
  type Problem
} from "../devScripts/fix-migrations.js";

const FIXTURES = resolve("tests/fixtures/fix-migrations");
const LOCK_ID = "3853314791062309107";

function record(name: string, timestamp: string): MigrationRecord {
  return { name, timestamp };
}

const T1 = "2026-10-01T00:00:00.000Z";
const T2 = "2026-10-02T00:00:00.000Z";
const T3 = "2026-10-03T00:00:00.000Z";
const T4 = "2026-10-04T00:00:00.000Z";

const notFound = (name: string): Problem => ({ name, reason: `no folder beside this one has ${name}.ts` });

describe("planRepair", () => {
  it("a consistent record needs no action", () => {
    const plan = planRepair([record("001-a", T1), record("002-b", T2)], ["001-a", "002-b"], notFound);
    expect(plan).toEqual({ actions: [], problems: [] });
  });

  it("a record renumbered at merge is renamed (F2)", () => {
    const plan = planRepair([record("001-a", T1), record("013-x", T2)], ["001-a", "014-x"], notFound);
    expect(plan).toEqual({ actions: [{ kind: "rename", from: "013-x", to: "014-x" }], problems: [] });
  });

  it("a record the folder does not have is rolled back with the file found beside it (F1)", () => {
    const found: ForeignMigration = { name: "013-y", file: "/x/sib/src/db/migrations/013-y.ts", folders: ["/x/sib"] };
    const plan = planRepair([record("001-a", T1), record("013-y", T2)], ["001-a"], () => found);
    expect(plan).toEqual({ actions: [{ kind: "rollback", name: "013-y", file: found.file }], problems: [] });
  });

  it("F1 with no file found is a problem", () => {
    const plan = planRepair([record("001-a", T1), record("013-y", T2)], ["001-a"], notFound);
    expect(plan).toEqual({ actions: [], problems: [notFound("013-y")] });
  });

  it("a skipped folder migration is applied with the timestamp of the record named after it (F3)", () => {
    const plan = planRepair([record("001-a", T1), record("014-b", T2)], ["001-a", "013-a", "014-b"], notFound);
    expect(plan).toEqual({ actions: [{ kind: "apply", name: "013-a", timestamp: T2, before: "014-b" }], problems: [] });
  });

  it("F2 then F3: the rename comes first, the apply takes the renamed record's timestamp", () => {
    const plan = planRepair([record("012-z", T1), record("013-b", T2)], ["012-z", "013-a", "014-b"], notFound);
    expect(plan).toEqual({
      actions: [
        { kind: "rename", from: "013-b", to: "014-b" },
        { kind: "apply", name: "013-a", timestamp: T2, before: "014-b" }
      ],
      problems: []
    });
  });

  it("a name recorded twice is a problem", () => {
    const plan = planRepair([record("001-a", T1), record("001-a", T2)], ["001-a"], notFound);
    expect(plan.problems).toEqual([{ name: "001-a", reason: "duplicate record" }]);
  });

  it("a suffix matching two folder migrations is a problem", () => {
    const plan = planRepair([record("001-a", T1), record("013-x", T2)], ["001-a", "014-x", "015-x"], notFound);
    expect(plan.problems).toEqual([{ name: "013-x", reason: "2 folder migrations end in -x" }]);
    expect(plan.actions).toEqual([]);
  });

  it("two rollbacks run newest record first", () => {
    const find = (name: string): ForeignMigration => ({ name, file: `/f/${name}.ts`, folders: ["/f"] });
    const plan = planRepair([record("001-a", T1), record("013-p", T2), record("013-q", T3)], ["001-a"], find);
    expect(plan.actions.map((a) => (a.kind === "rollback" ? a.name : a.kind))).toEqual(["013-q", "013-p"]);
  });

  it("a folder migration named after every record is left for the server", () => {
    const plan = planRepair([record("001-a", T1), record("002-b", T4)], ["001-a", "002-b", "003-c"], notFound);
    expect(plan).toEqual({ actions: [], problems: [] });
  });
});

describe("findForeignIn", () => {
  const siblingA = join(FIXTURES, "siblingA");
  const siblingB = join(FIXTURES, "siblingB");
  const siblingC = join(FIXTURES, "siblingC");

  it("finds a migration and names every folder holding an identical copy", async () => {
    const found = await findForeignIn(FIXTURES, "none")("013-fixture-foreign");
    expect(found).toEqual({
      name: "013-fixture-foreign",
      file: join(siblingA, "src", "db", "migrations", "013-fixture-foreign.ts"),
      folders: [siblingA, siblingB]
    });
  });

  it("copies that differ are a problem naming the folders", async () => {
    const found = (await findForeignIn(FIXTURES, "none")("013-fixture-disagree")) as Problem;
    expect(found.reason).toBe(`the folders beside this one disagree on 013-fixture-disagree.ts (${siblingA}, ${siblingC})`);
  });

  it("a migration no folder has is a problem", async () => {
    expect(await findForeignIn(FIXTURES, "none")("013-nowhere")).toEqual(notFound("013-nowhere"));
  });

  it("a file with no down() is a problem", async () => {
    expect(await findForeignIn(FIXTURES, "none")("013-fixture-no-down")).toEqual({
      name: "013-fixture-no-down",
      reason: "013-fixture-no-down.ts has no down()"
    });
  });

  it("skips its own folder", async () => {
    const find = findForeignIn(FIXTURES, "siblingA");
    expect(((await find("013-fixture-foreign")) as ForeignMigration).folders).toEqual([siblingB]);
    expect(await find("013-fixture-no-down")).toEqual(notFound("013-fixture-no-down"));
  });
});

const created: Array<() => Promise<void>> = [];

afterAll(async () => {
  for (const drop of created) await drop();
  const admin = new pg.Client({ connectionString: inject("pgAdminUrl") });
  await admin.connect();
  await admin.query("drop role if exists fixer");
  await admin.end();
});

async function freshDatabase(name: string): Promise<{ url: string; db: Db; drop: () => Promise<void> }> {
  const adminUrl = inject("pgAdminUrl");
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`create database "${name}"`);
  await admin.end();
  const url = adminUrl.replace(/\/postgres$/, `/${name}`);
  const db = createDb(url, { max: 2 });
  const drop = async (): Promise<void> => {
    await closeDb(db);
    const client = new pg.Client({ connectionString: adminUrl });
    await client.connect();
    await client.query(`drop database "${name}" with (force)`);
    await client.end();
  };
  return { url, db, drop };
}

let counter = 0;
async function migratedDatabase(): Promise<{ url: string; db: Db; drop: () => Promise<void> }> {
  const database = await freshDatabase(`fixmig_${Date.now().toString(36)}_${counter++}`);
  await migrateToLatest(database.db);
  return database;
}

async function records(db: Db): Promise<MigrationRecord[]> {
  const { rows } = await sql<MigrationRecord>`select name, timestamp from kysely_migration`.execute(db);
  return sortRecords(rows);
}

async function snapshot(db: Db): Promise<unknown> {
  const { rows: columns } = await sql`
    select table_name, column_name, data_type, is_nullable, column_default
    from information_schema.columns where table_schema = 'public'
    order by table_name, column_name`.execute(db);
  const { rows: recorded } = await sql`select name, timestamp from kysely_migration order by name`.execute(db);
  return { recorded, columns };
}

async function tableExists(db: Db, table: string): Promise<boolean> {
  const { rows } = await sql<{ found: string | null }>`select to_regclass(${table})::text as found`.execute(db);
  return rows[0]?.found != null;
}

async function withFolderMigrations<T>(added: Record<string, (typeof migrations)[string]>, run: () => Promise<T>): Promise<T> {
  Object.assign(migrations, added);
  try {
    return await run();
  } finally {
    for (const name of Object.keys(added)) delete migrations[name];
  }
}

async function resolvedLookup(recorded: MigrationRecord[]): Promise<(name: string) => ForeignMigration | Problem> {
  const find = findForeignIn(FIXTURES, "none");
  const resolved = new Map<string, ForeignMigration | Problem>();
  for (const r of recorded) if (!(r.name in migrations)) resolved.set(r.name, await find(r.name));
  return (name) => resolved.get(name)!;
}

async function recordForeign(db: Db): Promise<void> {
  await sql`create table "fixture_foreign" (id integer)`.execute(db);
  await sql`insert into kysely_migration (name, timestamp) values ('013-fixture-foreign', ${new Date().toISOString()})`.execute(db);
}

describe("applyRepair", () => {
  it("F1: rolls back a foreign migration with its own down() and deletes its record", async () => {
    const { db, drop } = await migratedDatabase();
    created.push(drop);
    await recordForeign(db);
    const recorded = await records(db);
    const plan = planRepair(recorded, Object.keys(migrations), await resolvedLookup(recorded));
    expect(plan.actions).toEqual([{ kind: "rollback", name: "013-fixture-foreign", file: join(FIXTURES, "siblingA", "src", "db", "migrations", "013-fixture-foreign.ts") }]);
    expect(await applyRepair(db, plan, migrations)).toBe(1);
    expect(await tableExists(db, "fixture_foreign")).toBe(false);
    expect((await records(db)).map((r) => r.name)).toEqual(Object.keys(migrations).sort());
    await expect(migrateToLatest(db)).resolves.toEqual([]);
  });

  it("F2: renames a record renumbered at merge, running no schema change", async () => {
    await withFolderMigrations({ "090-fixture-renamed": { up: async () => {} } }, async () => {
      const { db, drop } = await migratedDatabase();
      created.push(drop);
      await sql`update kysely_migration set name = '099-fixture-renamed' where name = '090-fixture-renamed'`.execute(db);
      const before = (await snapshot(db)) as { columns: unknown };
      const recorded = await records(db);
      const plan = planRepair(recorded, Object.keys(migrations), await resolvedLookup(recorded));
      expect(plan.actions).toEqual([{ kind: "rename", from: "099-fixture-renamed", to: "090-fixture-renamed" }]);
      await applyRepair(db, plan, migrations);
      expect((await records(db)).at(-1)?.name).toBe("090-fixture-renamed");
      expect(((await snapshot(db)) as { columns: unknown }).columns).toEqual(before.columns);
      await expect(migrateToLatest(db)).resolves.toEqual([]);
    });
  });

  it("F3: applies a skipped migration and records it just before the one named after it", async () => {
    await withFolderMigrations({ "091-fixture-late": { up: async () => {} } }, async () => {
      const { db, drop } = await migratedDatabase();
      created.push(drop);
      const late = (await records(db)).find((r) => r.name === "091-fixture-late")!;
      await withFolderMigrations(
        { "090-fixture-early": { up: async (trx) => void (await sql`create table "fixture_early" (id integer)`.execute(trx)) } },
        async () => {
          const recorded = await records(db);
          const plan = planRepair(recorded, Object.keys(migrations), await resolvedLookup(recorded));
          expect(plan.actions).toEqual([{ kind: "apply", name: "090-fixture-early", timestamp: late.timestamp, before: "091-fixture-late" }]);
          await applyRepair(db, plan, migrations);
          expect(await tableExists(db, "fixture_early")).toBe(true);
          expect((await records(db)).find((r) => r.name === "090-fixture-early")?.timestamp).toBe(late.timestamp);
          await expect(migrateToLatest(db)).resolves.toEqual([]);
        }
      );
    });
  });

  it("an action that fails rolls every change back and names the action", async () => {
    await withFolderMigrations({ "014-fixture-late": { up: async () => {} } }, async () => {
      const { db, drop } = await migratedDatabase();
      created.push(drop);
      await sql`update kysely_migration set name = '099-fixture-late' where name = '014-fixture-late'`.execute(db);
      await withFolderMigrations(
        {
          "013-fixture-throws": {
            up: async (trx) => {
              await sql`create table "fixture_throws" (id integer)`.execute(trx);
              throw new Error("boom");
            }
          }
        },
        async () => {
          const before = await snapshot(db);
          const recorded = await records(db);
          const plan = planRepair(recorded, Object.keys(migrations), await resolvedLookup(recorded));
          expect(plan.actions.map((a) => a.kind)).toEqual(["rename", "apply"]);
          await expect(applyRepair(db, plan, migrations)).rejects.toThrow("Apply 013-fixture-throws: boom; every change was rolled back");
          expect(await snapshot(db)).toEqual(before);
        }
      );
    });
  });

  it("waits at most about 10 s for another process's migration lock", async () => {
    const { url, db, drop } = await migratedDatabase();
    created.push(drop);
    await recordForeign(db);
    const recorded = await records(db);
    const plan = planRepair(recorded, Object.keys(migrations), await resolvedLookup(recorded));
    const before = await snapshot(db);
    const holder = new pg.Client({ connectionString: url });
    await holder.connect();
    try {
      await holder.query(`select pg_advisory_lock(${LOCK_ID})`);
      const started = Date.now();
      await expect(applyRepair(db, plan, migrations)).rejects.toThrow("the database is being migrated by another process");
      expect(Date.now() - started).toBeLessThan(15_000);
      expect(await snapshot(db)).toEqual(before);
    } finally {
      await holder.end();
    }
  });
});

describe("main", () => {
  const PASSWORD = "Sentinel-91";

  async function fixerUrl(url: string): Promise<string> {
    const admin = new pg.Client({ connectionString: inject("pgAdminUrl") });
    await admin.connect();
    await admin.query(`do $$ begin if not exists (select from pg_roles where rolname = 'fixer') then create role fixer login superuser password '${PASSWORD}'; end if; end $$`);
    await admin.end();
    const u = new URL(url);
    u.username = "fixer";
    u.password = PASSWORD;
    return u.toString();
  }

  async function run(argv: string[], env: Record<string, string>): Promise<{ code: number; lines: string[] }> {
    const lines: string[] = [];
    const code = await main(argv, env, (line) => lines.push(line), FIXTURES);
    for (const line of lines) expect(line).not.toContain(PASSWORD);
    return { code, lines };
  }

  it("refuses an empty database address", async () => {
    expect(await run([], { ENV_DATABASE_URL: "" })).toEqual({ code: 1, lines: ["[migrations] Error: ENV_DATABASE_URL is not set to a PostgreSQL URL"] });
  });

  it("refuses a database on another machine, naming only the host", async () => {
    expect(await run([], { ENV_DATABASE_URL: `postgres://fixer:${PASSWORD}@db.example.com:5432/app01` })).toEqual({
      code: 1,
      lines: ["[migrations] Error: db.example.com is not a database on this machine; only localhost, 127.0.0.1 and ::1 are repaired"]
    });
  });

  it("refuses an unknown argument", async () => {
    expect(await run(["--force"], { ENV_DATABASE_URL: "postgres://localhost/app01" })).toEqual({
      code: 1,
      lines: ["[migrations] Error: unknown argument --force; usage: npm run fix-migrations [-- --apply]"]
    });
  });

  it("a consistent database has nothing to fix", async () => {
    const { url, drop } = await migratedDatabase();
    created.push(drop);
    const { code, lines } = await run([], { ENV_DATABASE_URL: await fixerUrl(url) });
    expect(code).toBe(0);
    expect(lines[0]).toBe(`[migrations] Database ${new URL(url).pathname.slice(1)} on localhost`);
    expect(lines[1]).toMatch(/^\[migrations\] Folder: .+ \(\d+ migrations\); database: \d+ records$/);
    expect(lines.at(-1)).toBe("[migrations] Nothing to fix");
  });

  it("F1: a dry run writes nothing; --apply repairs it", async () => {
    const { url, db, drop } = await migratedDatabase();
    created.push(drop);
    await recordForeign(db);
    const env = { ENV_DATABASE_URL: await fixerUrl(url) };
    const before = await snapshot(db);

    const dry = await run([], env);
    expect(dry.code).toBe(0);
    expect(dry.lines.slice(2)).toEqual([
      `[migrations] Roll back 013-fixture-foreign (down() from ${join(FIXTURES, "siblingA")}); its data is lost and that folder applies it again on its next start`,
      "[migrations] Stop the servers that use this database before applying.",
      "[migrations] Dry run: nothing written. Run npm run fix-migrations -- --apply to apply."
    ]);
    expect(await snapshot(db)).toEqual(before);

    const applied = await run(["--apply"], env);
    expect(applied.code).toBe(0);
    expect(applied.lines.at(-1)).toBe("[migrations] Done: 1 change(s) applied");
    await expect(migrateToLatest(db)).resolves.toEqual([]);
  });

  it("a plan with a problem writes nothing", async () => {
    const { url, db, drop } = await migratedDatabase();
    created.push(drop);
    await sql`insert into kysely_migration (name, timestamp) values ('013-fixture-missing', ${new Date().toISOString()})`.execute(db);
    const before = await snapshot(db);
    const { code, lines } = await run(["--apply"], { ENV_DATABASE_URL: await fixerUrl(url) });
    expect(code).toBe(1);
    expect(lines.slice(2)).toEqual([
      "[migrations] Problem: 013-fixture-missing: no folder beside this one has 013-fixture-missing.ts",
      "[migrations] Error: 1 problem(s); nothing written"
    ]);
    expect(await snapshot(db)).toEqual(before);
  });
});
