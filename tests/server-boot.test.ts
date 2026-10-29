import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { inject } from "vitest";
import pg from "pg";
import { createDb, closeDb } from "../src/db/client.js";
import { migrateToLatest, MigrationError } from "../src/db/migrator.js";
import { migrations } from "../src/db/migrations/index.js";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { castVote } from "../src/votes/votePath.js";
import { createConsumer } from "../src/votes/consumer.js";
import { VOTE_GROUP, VOTE_STREAM } from "../src/votes/queue.js";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestContext();
});

afterAll(async () => {
  await ctx.stop();
});

async function freshDatabase(name: string): Promise<{ url: string; drop: () => Promise<void> }> {
  const adminUrl = inject("pgAdminUrl");
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`create database "${name}"`);
  await admin.end();
  return {
    url: adminUrl.replace(/\/postgres$/, `/${name}`),
    drop: async () => {
      const client = new pg.Client({ connectionString: adminUrl });
      await client.connect();
      await client.query(`drop database "${name}" with (force)`);
      await client.end();
    }
  };
}

describe("connection loss", () => {
  it("an idle pooled connection killed by the server is logged and replaced; the process stays up", async () => {
    const db = createDb(ctx.config.databaseUrl, { max: 2 });
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { pid } = await db.selectNoFrom((eb) => eb.fn<number>("pg_backend_pid", []).as("pid")).executeTakeFirstOrThrow();
      await ctx.db.selectNoFrom((eb) => eb.fn<boolean>("pg_terminate_backend", [eb.val(pid)]).as("ok")).executeTakeFirstOrThrow();
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(errors.mock.calls.some(([message]) => String(message).startsWith("[db] An idle connection was dropped"))).toBe(true);
      const again = await db.selectNoFrom((eb) => eb.fn<number>("pg_backend_pid", []).as("pid")).executeTakeFirstOrThrow();
      expect(again.pid).not.toBe(pid);
    } finally {
      errors.mockRestore();
      await closeDb(db);
    }
  });
});

describe("start-up", () => {
  it("migrates a fresh database to the latest schema, and a second run applies nothing", async () => {
    const database = await freshDatabase(`boot_${Date.now().toString(36)}`);
    const db = createDb(database.url, { max: 2 });
    try {
      const applied = await migrateToLatest(db);
      expect(applied).toEqual(Object.keys(migrations));
      expect(await migrateToLatest(db)).toEqual([]);
      const tables = await db.introspection.getTables();
      const names = tables.map((t) => t.name);
      for (const table of ["user", "session", "polls", "votes", "vote_history", "poll_invitations", "poll_bans", "bookmarks", "user_polls", "search_outbox"]) {
        expect(names, table).toContain(table);
      }
    } finally {
      await closeDb(db);
      await database.drop();
    }
  });

  it("a failing migration rejects, naming itself, so the server refuses to start", async () => {
    const database = await freshDatabase(`broken_${Date.now().toString(36)}`);
    const db = createDb(database.url, { max: 2 });
    const broken = migrations["005-broken"];
    migrations["005-broken"] = {
      up: async () => {
        throw new Error("simulated failure");
      }
    };
    try {
      await expect(migrateToLatest(db)).rejects.toBeInstanceOf(MigrationError);
      await expect(migrateToLatest(db)).rejects.toThrow(/005-broken.*simulated failure/);
    } finally {
      if (broken) migrations["005-broken"] = broken;
      else delete migrations["005-broken"];
      await closeDb(db);
      await database.drop();
    }
  });

  it("a recorded migration the code does not have rejects with the check's message and names the repair script", async () => {
    const database = await freshDatabase(`unknown_${Date.now().toString(36)}`);
    const db = createDb(database.url, { max: 2 });
    try {
      await migrateToLatest(db);
      await db.insertInto("kysely_migration" as never).values({ name: "099-not-in-code", timestamp: new Date().toISOString() } as never).execute();
      const failure = await migrateToLatest(db).catch((err: unknown) => err);
      expect(failure).toBeInstanceOf(MigrationError);
      const message = (failure as Error).message;
      expect(message.startsWith("Migration check failed: corrupted migrations: previously executed migration 099-not-in-code is missing")).toBe(true);
      expect(message).toContain("npm run fix-migrations");
    } finally {
      await closeDb(db);
      await database.drop();
    }
  });

  it("the shutdown order lets the consumer finish and acknowledge its batch within the grace period", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const consumer = createConsumer({ db: ctx.db, cache: ctx.cache, config: ctx.config, consumerName: "graceful" });
    consumer.start();
    for (const who of ["a", "b", "c"]) {
      await castVote(ctx, { sessionId: `s-${who}`, email: `${who}@boot.example`, userName: who, ip: `10.8.0.${who.charCodeAt(0)}`, pid: poll._id, choiceIds: ["c1"] });
    }
    const started = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await consumer.stop();
    expect(Date.now() - started).toBeLessThan(30_000);
    expect(await ctx.cache.xpendingCount(VOTE_STREAM, VOTE_GROUP)).toBe(0);
    expect(await ctx.db.selectFrom("votes").selectAll().where("poll_id", "=", poll._id).execute()).toHaveLength(3);
  });
});
