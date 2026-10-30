/**
 * The per-poll line graph setting on a real database: the column's default for
 * existing and new polls, the Administrator-only write rule, and the rows and
 * projections that carry it.
 */
import { randomUUID } from "node:crypto";
import pg from "pg";
import { Migrator } from "kysely/migration";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";
import { createDb, closeDb } from "../src/db/client.js";
import { migrateToLatest } from "../src/db/migrator.js";
import { migrations } from "../src/db/migrations/index.js";
import { findPollRow, insertPoll, updatePoll } from "../src/polls/store.js";
import { projectPoll } from "../src/polls/versions.js";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls, voteHistory } from "./helpers/poll-fixtures.js";

const ADMIN = "line-graph-admin@example.com";
const SECOND_ADMIN = "line-graph-admin-two@example.com";
const CREATOR = "line-graph-creator@example.com";
const VOTER = "line-graph-voter@example.com";
const SECOND_VOTER = "line-graph-voter-two@example.com";

let ctx: TestContext;
let adminCookie = "";
let secondAdminCookie = "";
let creatorCookie = "";
let creatorId = "";
let voterCookie = "";
let secondVoterCookie = "";

const CHOICES = [
  { id: "c1", label: "Yes", position: 0 },
  { id: "c2", label: "No", position: 1 }
];

beforeAll(async () => {
  ctx = await startTestContext({ ENV_ADMINS: `${ADMIN},${SECOND_ADMIN}`, ENV_MIN_MANUAL_REFRESH_INTERVAL: "1" });
  adminCookie = (await forgeSession(ctx, ADMIN)).cookie;
  secondAdminCookie = (await forgeSession(ctx, SECOND_ADMIN)).cookie;
  const creator = await forgeSession(ctx, CREATOR);
  creatorCookie = creator.cookie;
  creatorId = creator.userId;
  voterCookie = (await forgeSession(ctx, VOTER)).cookie;
  secondVoterCookie = (await forgeSession(ctx, SECOND_VOTER)).cookie;
});
afterAll(async () => {
  await ctx.stop();
});
beforeEach(async () => {
  await polls(ctx).deleteMany({});
  await voteHistory(ctx).deleteMany({});
  for (const key of await ctx.cache.scan("line-graph:*")) await ctx.cache.del(key);
});

/** The cookie is read per request: the users are signed in by `beforeAll`, after this module loads. */
function asUser(cookie: () => string) {
  return {
    editSession: (pid: string) =>
      request(ctx.app).post(`/api/admin/polls/${pid}/edit-session`).set("Cookie", cookie()).send({ clientGuid: "tab-1" }),
    save: (pid: string, body: Record<string, unknown>) =>
      request(ctx.app).post(`/api/admin/polls/${pid}/save`).set("Cookie", cookie()).send({ clientGuid: "tab-1", ...body }),
    publish: (pid: string, body: Record<string, unknown>) =>
      request(ctx.app).post(`/api/admin/polls/${pid}/publish`).set("Cookie", cookie()).send({ clientGuid: "tab-1", ...body }),
    colors: (pid: string, body: Record<string, unknown>) =>
      request(ctx.app).post(`/api/admin/polls/${pid}/colors`).set("Cookie", cookie()).send({ clientGuid: "tab-1", ...body }),
    vote: (pid: string, choiceIds: string[]) =>
      request(ctx.app).post(`/api/polls/${pid}/vote`).set("Cookie", cookie()).send({ choiceIds })
  };
}
const admin = asUser(() => adminCookie);
const creatorApi = asUser(() => creatorCookie);

async function seed(overrides: Partial<Parameters<typeof makePoll>[0]> = {}) {
  const poll = makePoll({ _id: randomUUID(), choices: CHOICES, ...overrides });
  await polls(ctx).insertOne(poll);
  return poll;
}

/** A vote already in the history, written directly: the vote route queues its write, and the history check reads the table. */
async function seedVote(pid: string, email: string, choiceIds: string[]) {
  await voteHistory(ctx).insertOne({ pid, emailAddress: email, userName: "", choiceIds, votedAt: new Date() });
}

async function ownedBy(pid: string, userId: string) {
  await ctx.db.updateTable("polls").set({ created_by_id: userId }).where("id", "=", pid).execute();
}

const storedRow = (pid: string) => findPollRow(ctx.db, pid);
const storedSetting = async (pid: string) => (await storedRow(pid))!.line_graph_enabled;

const withLineGraph = (pid: string) => request(ctx.app).get(`/api/polls/${pid}/line-graph`);

describe("line_graph_enabled migration", () => {
  it("a poll that existed before the migration, and a new poll, both read the setting as false", async () => {
    const adminUrl = inject("pgAdminUrl");
    const name = `linegraph_${randomUUID().replace(/-/g, "")}`;
    const adminClient = new pg.Client({ connectionString: adminUrl });
    await adminClient.connect();
    await adminClient.query(`create database "${name}"`);
    await adminClient.end();
    const db = createDb(adminUrl.replace(/\/postgres$/, `/${name}`), { max: 2 });
    try {
      await migrateToLatest(db);

      const existing = makePoll({ _id: randomUUID() });
      await insertPoll({ db, cache: ctx.cache }, existing);

      const down = await new Migrator({ db, provider: { getMigrations: async () => migrations } }).migrateTo("012-line-graph-tally");
      expect(down.error).toBeUndefined();
      await migrateToLatest(db);

      const created = makePoll({ _id: randomUUID() });
      await insertPoll({ db, cache: ctx.cache }, created);

      const rows = await db
        .selectFrom("polls")
        .select(["id", "line_graph_enabled"])
        .where("id", "in", [existing._id, created._id])
        .execute();
      expect(rows).toHaveLength(2);
      for (const row of rows) expect(row.line_graph_enabled).toBe(false);
    } finally {
      await closeDb(db);
      const dropper = new pg.Client({ connectionString: adminUrl });
      await dropper.connect();
      await dropper.query(`drop database "${name}" with (force)`);
      await dropper.end();
    }
  });
});

describe("projection and version", () => {
  it("the projection carries the setting, and a change to it bumps content_version", async () => {
    const poll = await seed();
    const before = await storedRow(poll._id);
    expect(projectPoll(before!).lineGraphEnabled).toBe(false);

    await updatePoll({ db: ctx.db, cache: ctx.cache }, poll._id, { lineGraphEnabled: true });

    const after = await storedRow(poll._id);
    expect(projectPoll(after!).lineGraphEnabled).toBe(true);
    expect(after!.content_version).toBeGreaterThan(before!.content_version);
  });
});

describe("Administrator sets the setting", () => {
  it("a publish of a poll without votes stores the setting", async () => {
    const poll = await seed({ pollState: "INITIALIZED" });
    expect((await admin.editSession(poll._id)).status).toBe(200);

    const res = await admin.publish(poll._id, { lineGraphEnabled: true });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(await storedSetting(poll._id)).toBe(true);
  });

  it("a publish of a poll with votes stores the setting", async () => {
    const poll = await seed({ pollState: "OPEN" });
    await seedVote(poll._id, VOTER, ["c1"]);
    expect((await admin.editSession(poll._id)).status).toBe(200);

    const res = await admin.publish(poll._id, { lineGraphEnabled: true });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(await storedSetting(poll._id)).toBe(true);
  });

  it("a vote before and a vote after the setting changes on a poll with votes are both accepted", async () => {
    const poll = await seed({ pollState: "OPEN" });
    expect((await asUser(() => voterCookie).vote(poll._id, ["c1"])).status).toBe(200);
    await seedVote(poll._id, "line-graph-history@example.com", ["c1"]);
    expect((await admin.editSession(poll._id)).status).toBe(200);

    expect((await admin.colors(poll._id, { lineGraphEnabled: true })).status).toBe(200);
    expect(await storedSetting(poll._id)).toBe(true);
    expect((await storedRow(poll._id))!.poll_state).toBe("OPEN");

    expect((await asUser(() => secondVoterCookie).vote(poll._id, ["c2"])).status).toBe(200);
  });

  it("a setting-only colors save on a poll with votes stores the setting, leaves the choices and restores the state", async () => {
    const poll = await seed({ pollState: "OPEN" });
    await seedVote(poll._id, VOTER, ["c1"]);
    expect((await admin.editSession(poll._id)).status).toBe(200);

    const res = await admin.colors(poll._id, { lineGraphEnabled: true });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const row = await storedRow(poll._id);
    expect(row!.line_graph_enabled).toBe(true);
    expect(row!.choices).toEqual(poll.choices);
    expect(row!.poll_state).toBe("OPEN");
  });

  it("two Administrators saving in turn leave the later save's value, with no conflict", async () => {
    const poll = await seed({ pollState: "INITIALIZED" });
    expect((await admin.editSession(poll._id)).status).toBe(200);
    expect((await admin.save(poll._id, { lineGraphEnabled: true })).status).toBe(200);

    const second = asUser(() => secondAdminCookie);
    expect((await second.editSession(poll._id)).status).toBe(200);
    expect((await second.save(poll._id, { lineGraphEnabled: false })).status).toBe(200);

    expect(await storedSetting(poll._id)).toBe(false);
  });

  it("the setting is stored on a closed poll, and on a poll in review it is refused like any other field", async () => {
    const closed = await seed({ pollState: "CLOSED" });
    await seedVote(closed._id, VOTER, ["c1"]);
    expect((await admin.editSession(closed._id)).status).toBe(200);
    const stored = await admin.colors(closed._id, { lineGraphEnabled: true });
    expect(stored.status, JSON.stringify(stored.body)).toBe(200);
    expect(await storedSetting(closed._id)).toBe(true);
    expect((await storedRow(closed._id))!.poll_state).toBe("CLOSED");

    const inReview = await seed({ pollState: "AWAITING APPROVAL" });
    await seedVote(inReview._id, VOTER, ["c1"]);
    expect((await admin.editSession(inReview._id)).status).toBe(409);
    expect((await admin.colors(inReview._id, { lineGraphEnabled: true })).status).toBe(409);
    expect(await storedSetting(inReview._id)).toBe(false);
  });
});

describe("the setting after the Administrator is removed from the list", () => {
  it("a poll keeps its stored setting, and a non-Administrator's save without the field leaves it on", async () => {
    const poll = await seed({ pollState: "INITIALIZED", lineGraphEnabled: true });
    await ownedBy(poll._id, creatorId);
    expect((await creatorApi.editSession(poll._id)).status).toBe(200);

    expect((await creatorApi.save(poll._id, { title: "Still shown" })).status).toBe(200);
    expect(await storedSetting(poll._id)).toBe(true);

    const open = await seed({ pollState: "OPEN", lineGraphEnabled: true });
    expect((await withLineGraph(open._id)).status).toBe(200);
  });
});

describe("the graph route follows the setting", () => {
  it("answers 404 while the setting is off, and the graph when it is on", async () => {
    const off = await seed({ lineGraphEnabled: false });
    expect(await withLineGraph(off._id)).toMatchObject({ status: 404, body: { error: "Not found" } });

    const on = await seed({ lineGraphEnabled: true });
    const res = await withLineGraph(on._id);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.defaultScale).toBeDefined();
  });

  it("answers 404 after the setting is switched off, even when the series is still cached", async () => {
    const poll = await seed({ lineGraphEnabled: true });
    expect((await withLineGraph(poll._id)).status).toBe(200);
    expect(await ctx.cache.scan(`line-graph:${poll._id}`)).not.toEqual([]);

    await ctx.db.updateTable("polls").set({ line_graph_enabled: false }).where("id", "=", poll._id).execute();
    expect(await withLineGraph(poll._id)).toMatchObject({ status: 404, body: { error: "Not found" } });
  });
});

describe("a non-Administrator cannot change the setting", () => {
  it("a publish, save and colors request carrying the field answers 403 and writes nothing", async () => {
    const poll = await seed({ pollState: "INITIALIZED" });
    await ownedBy(poll._id, creatorId);
    expect((await creatorApi.editSession(poll._id)).status).toBe(200);

    for (const send of [
      () => creatorApi.publish(poll._id, { lineGraphEnabled: true }),
      () => creatorApi.save(poll._id, { lineGraphEnabled: true }),
      () => creatorApi.colors(poll._id, { lineGraphEnabled: true })
    ]) {
      const res = await send();
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Only an Administrator can change the line graph." });
    }
    expect(await storedSetting(poll._id)).toBe(false);
  });

  it("the same requests without the field leave a stored true as it is", async () => {
    const poll = await seed({ pollState: "INITIALIZED", lineGraphEnabled: true });
    await ownedBy(poll._id, creatorId);
    expect((await creatorApi.editSession(poll._id)).status).toBe(200);

    expect((await creatorApi.save(poll._id, { title: "Changed" })).status).toBe(200);
    expect(await storedSetting(poll._id)).toBe(true);
  });

  it("a creator's admin list row for their own poll carries the setting", async () => {
    const poll = await seed({ pollState: "OPEN", lineGraphEnabled: true });
    await ownedBy(poll._id, creatorId);

    const res = await request(ctx.app).get("/api/admin/polls").set("Cookie", creatorCookie);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const row = res.body.polls.find((p: { id?: string; pid?: string }) => (p.id ?? p.pid) === poll._id);
    expect(row).toBeDefined();
    expect(row.lineGraphEnabled).toBe(true);
  });
});

describe("the admin search rows carry the setting", () => {
  it("every row of the admin search answers lineGraphEnabled, true and false", async () => {
    const on = await seed({ title: "Search graph on", lineGraphEnabled: true });
    const off = await seed({ title: "Search graph off", lineGraphEnabled: false });
    const res = await request(ctx.app).get("/api/admin/polls/search").set("Cookie", adminCookie);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const rowFor = (pid: string) => res.body.polls.find((p: { pid: string }) => p.pid === pid);
    expect(rowFor(on._id).lineGraphEnabled).toBe(true);
    expect(rowFor(off._id).lineGraphEnabled).toBe(false);
  });
});
