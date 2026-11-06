import request from "supertest";
import { sql } from "kysely";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AGREED, clearPolls, extractLinkPath, followSignInLink, forgeSession, startTestContext, withoutAgreement, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { ensureDeviceEventsPartition } from "../src/db/partitions.js";
import { retentionSweep, scheduleSweep } from "../src/polls/sweeps.js";
import { deletePoll } from "../src/polls/store.js";
import { DEVICE_FINGERPRINT_VERSION, keyedDeviceHashes, parseFingerprintHeader } from "../src/votes/deviceEvents.js";
import { castVote } from "../src/votes/votePath.js";

const BROWSER = "a".repeat(32);
const HARDWARE = "0123456789abcdef".repeat(2);
const VALID = `${BROWSER}.${HARDWARE}`;
const KEY = "k".repeat(32);

describe("parseFingerprintHeader (A1)", () => {
  it("returns the two parts of a valid value", () => {
    expect(parseFingerprintHeader(VALID)).toEqual({ browser: BROWSER, hardware: HARDWARE });
  });

  it.each([
    ["absent", undefined],
    ["empty", ""],
    ["wrong length", `${BROWSER}.${HARDWARE}0`],
    ["upper case", `${"A".repeat(32)}.${HARDWARE}`],
    ["oversized", `${VALID}${"f".repeat(100_000)}`],
    ["one part only", BROWSER],
    ["a trailing line", `${VALID}\n`]
  ])("treats %s as missing", (_name, value) => {
    expect(parseFingerprintHeader(value)).toBeNull();
  });
});

describe("keyedDeviceHashes (R5)", () => {
  it("gives equal output for equal input", () => {
    expect(keyedDeviceHashes(VALID, KEY)).toEqual(keyedDeviceHashes(VALID, KEY));
  });

  it("gives different output for a different key, and for each part", () => {
    const one = keyedDeviceHashes(VALID, KEY);
    const other = keyedDeviceHashes(VALID, "o".repeat(32));
    expect(one.browserHash).not.toBe(other.browserHash);
    expect(one.hardwareHash).not.toBe(other.hardwareHash);
    expect(one.browserHash).not.toBe(one.hardwareHash);
  });

  it("never contains the input", () => {
    const { browserHash, hardwareHash } = keyedDeviceHashes(VALID, KEY);
    for (const hash of [browserHash!, hardwareHash!]) {
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(hash).not.toContain(BROWSER);
      expect(hash).not.toContain(HARDWARE);
    }
  });

  it("gives null hashes when the header is missing or malformed", () => {
    expect(keyedDeviceHashes(undefined, KEY)).toEqual({ browserHash: null, hardwareHash: null });
    expect(keyedDeviceHashes("nonsense", KEY)).toEqual({ browserHash: null, hardwareHash: null });
  });
});

const ON = { ENV_DEVICE_EVENTS_ENABLED: "true", ENV_DEVICE_EVENTS_KEY: KEY };
let users = 0;

async function resetFloors(ctx: TestContext): Promise<void> {
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
  for (const key of await ctx.cache.scan("votes-ip:*")) await ctx.cache.del(key);
}

function castThroughRoute(ctx: TestContext, pid: string, cookie: string, choiceIds: string[], header?: string) {
  let req = request(ctx.app).post(`/api/polls/${pid}/vote`).set("Cookie", cookie);
  if (header !== undefined) req = req.set("X-Device-Fingerprint", header);
  return req.send({ choiceIds });
}

const rows = (ctx: TestContext) => ctx.db.selectFrom("device_events").selectAll().orderBy("at").orderBy("id").execute();

describe("vote events with collection on (A2, R6)", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await startTestContext(ON);
  });
  afterAll(async () => {
    await ctx.stop();
  });
  beforeEach(async () => {
    await clearPolls(ctx);
    await resetFloors(ctx);
  });

  async function voter() {
    return forgeSession(ctx, `voter${users++}@example.com`);
  }

  async function openPoll(mutability: "Final-Vote Poll" | "Dynamic-Vote Poll" = "Dynamic-Vote Poll") {
    const poll = makePoll({ voteMutability: mutability });
    await polls(ctx).insertOne(poll);
    return poll._id;
  }

  it("writes one row for an accepted vote, with account, poll, time, keyed hashes and version, and no choice", async () => {
    const { cookie, userId } = await voter();
    const pid = await openPoll();
    expect((await castThroughRoute(ctx, pid, cookie, ["c1"], VALID)).status).toBe(200);
    await ctx.consumer.runOnce();

    const [row, ...others] = await rows(ctx);
    expect(others).toEqual([]);
    const { browserHash, hardwareHash } = keyedDeviceHashes(VALID, KEY);
    expect(row).toMatchObject({
      account_id: userId,
      event: "vote",
      poll_id: pid,
      browser_hash: browserHash,
      hardware_hash: hardwareHash,
      fingerprint_version: DEVICE_FINGERPRINT_VERSION
    });
    expect(row!.at).toBeInstanceOf(Date);
    expect(Object.keys(row!).sort()).toEqual(["account_id", "at", "browser_hash", "event", "fingerprint_version", "hardware_hash", "id", "poll_id"]);
  });

  it("writes a row for each vote and change, keeping two votes of one batch while votes holds one", async () => {
    const { cookie } = await voter();
    const pid = await openPoll();
    expect((await castThroughRoute(ctx, pid, cookie, ["c1"], VALID)).status).toBe(200);
    await resetFloors(ctx);
    expect((await castThroughRoute(ctx, pid, cookie, ["c2"], VALID)).status).toBe(200);
    await ctx.consumer.runOnce();
    expect((await rows(ctx)).length).toBe(2);
    expect((await ctx.db.selectFrom("votes").selectAll().where("poll_id", "=", pid).execute()).length).toBe(1);
  });

  it("writes no row for a refused vote, or an empty one, which is refused too", async () => {
    const { cookie } = await voter();
    const poll = makePoll({ pollState: "CLOSED" });
    await polls(ctx).insertOne(poll);
    expect((await castThroughRoute(ctx, poll._id, cookie, ["c1"], VALID)).status).toBeGreaterThanOrEqual(400);
    expect((await castThroughRoute(ctx, await openPoll(), cookie, [], VALID)).status).toBe(400);
    await ctx.consumer.runOnce();
    expect(await rows(ctx)).toEqual([]);
  });

  it.each([["missing", undefined], ["malformed", "not-a-fingerprint"]])("takes a vote with a %s header, with null hashes", async (_name, header) => {
    const { cookie } = await voter();
    const pid = await openPoll();
    expect((await castThroughRoute(ctx, pid, cookie, ["c1"], header)).status).toBe(200);
    await ctx.consumer.runOnce();
    expect(await rows(ctx)).toEqual([expect.objectContaining({ event: "vote", browser_hash: null, hardware_hash: null })]);
  });

  it("answers the same with and without the header", async () => {
    const withHeader = await castThroughRoute(ctx, await openPoll(), (await voter()).cookie, ["c1"], VALID);
    const without = await castThroughRoute(ctx, await openPoll(), (await voter()).cookie, ["c1"]);
    expect(withHeader.status).toBe(without.status);
    expect(withHeader.body).toEqual(without.body);
  });

  it("saves a stream entry with no account as a vote and no row", async () => {
    const pid = await openPoll();
    await castVote(
      { db: ctx.db, cache: ctx.cache, config: ctx.config, rosters: ctx.rosters, abuse: ctx.abuse },
      { sessionId: "script", email: "script@example.com", userName: "", ip: "10.1.1.1", pid, choiceIds: ["c1"] }
    );
    await ctx.consumer.runOnce();
    expect((await ctx.db.selectFrom("votes").selectAll().where("poll_id", "=", pid).execute()).length).toBe(1);
    expect(await rows(ctx)).toEqual([]);
  });

  it("writes no row for a queued vote whose poll was deleted", async () => {
    const { cookie } = await voter();
    const pid = await openPoll();
    expect((await castThroughRoute(ctx, pid, cookie, ["c1"], VALID)).status).toBe(200);
    await deletePoll(ctx, pid);
    await ctx.consumer.runOnce();
    expect(await rows(ctx)).toEqual([]);
  });

  it("writes no row for a queued vote whose account was deleted", async () => {
    const { cookie } = await voter();
    const pid = await openPoll();
    expect((await castThroughRoute(ctx, pid, cookie, ["c1"], VALID)).status).toBe(200);
    const removed = await request(ctx.app).delete("/api/me").set("Host", "127.0.0.1").set("Origin", "http://127.0.0.1").set("Cookie", cookie).send({ confirm: "DELETE" });
    expect(removed.status).toBe(200);
    await ctx.consumer.runOnce();
    expect(await rows(ctx)).toEqual([]);
  });

  it("answers SC-009: which accounts voted on one poll from one browser value within a time", async () => {
    const at = (minutes: number) => new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1, 0, minutes));
    const event = (account_id: string, poll_id: string, browser_hash: string, minutes: number) => ({
      account_id,
      event: "vote" as const,
      poll_id,
      browser_hash,
      hardware_hash: "h",
      fingerprint_version: 1,
      at: at(minutes)
    });
    await ctx.db
      .insertInto("device_events")
      .values([event("one", "p", "shared", 0), event("two", "p", "shared", 5), event("late", "p", "shared", 500), event("other-device", "p", "alone", 1), event("other-poll", "q", "shared", 1)])
      .execute();
    const found = await ctx.db
      .selectFrom("device_events")
      .select("account_id")
      .distinct()
      .where("event", "=", "vote")
      .where("poll_id", "=", "p")
      .where("browser_hash", "=", "shared")
      .where("at", ">=", at(0))
      .where("at", "<", at(60))
      .orderBy("account_id")
      .execute();
    expect(found.map((r) => r.account_id)).toEqual(["one", "two"]);
  });
});

describe("vote events with collection off", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await startTestContext();
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("writes none, and ignores the header", async () => {
    const { cookie } = await forgeSession(ctx, "off@example.com");
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    expect((await castThroughRoute(ctx, poll._id, cookie, ["c1"], VALID)).status).toBe(200);
    await ctx.consumer.runOnce();
    expect((await ctx.db.selectFrom("votes").selectAll().where("poll_id", "=", poll._id).execute()).length).toBe(1);
    expect(await rows(ctx)).toEqual([]);
  });
});

describe("the terms gate stops collection (R10)", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await startTestContext(ON);
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("refuses a vote and a sign-in report from an account on the old Terms, and writes no row", async () => {
    const { cookie, userId } = await forgeSession(ctx, "old-terms@example.com");
    await withoutAgreement(ctx, userId);
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const voted = await castThroughRoute(ctx, poll._id, cookie, ["c1"], VALID);
    expect(voted.status).toBe(403);
    expect(voted.body.code).toBe("terms-required");
    expect((await request(ctx.app).post("/api/me/device-sign-in").set("Cookie", cookie).set("X-Device-Fingerprint", VALID)).status).toBe(403);
    expect((await request(ctx.app).get("/api/me").set("Cookie", cookie)).headers["x-device-sign-in-due"]).toBeUndefined();
    await ctx.consumer.runOnce();
    expect(await rows(ctx)).toEqual([]);
  });
});

describe("sign-in events (A3, A4, R7)", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await startTestContext(ON);
  });
  afterAll(async () => {
    await ctx.stop();
  });
  beforeEach(async () => {
    await clearPolls(ctx);
  });

  const me = (cookie: string) => request(ctx.app).get("/api/me").set("Cookie", cookie);
  const report = (cookie: string, header?: string) => {
    const req = request(ctx.app).post("/api/me/device-sign-in").set("Cookie", cookie);
    return header === undefined ? req : req.set("X-Device-Fingerprint", header);
  };
  const session = () => forgeSession(ctx, `signin${users++}@example.com`);

  it("marks an unreported session due in a header, leaving the body as it was, and stops once reported", async () => {
    const { cookie } = await session();
    const due = await me(cookie);
    expect(due.headers["x-device-sign-in-due"]).toBe("1");
    expect(Object.keys(due.body)).not.toContain("deviceSignInDue");
    expect((await report(cookie, VALID)).status).toBe(204);
    const reported = await me(cookie);
    expect(reported.headers["x-device-sign-in-due"]).toBeUndefined();
    expect(reported.body).toEqual(due.body);
  });

  it("is not answered from a browser's stored copy, which would keep the header after the report", async () => {
    const { cookie } = await session();
    expect((await me(cookie)).headers["cache-control"]).toBe("no-store");
  });

  it("answers 401 without a session", async () => {
    const res = await request(ctx.app).post("/api/me/device-sign-in");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Not signed in" });
  });

  it("writes one row with the keyed hashes on the first report, and none on the next", async () => {
    const { cookie, userId } = await session();
    expect((await report(cookie, VALID)).status).toBe(204);
    expect((await report(cookie, VALID)).status).toBe(204);
    const { browserHash, hardwareHash } = keyedDeviceHashes(VALID, KEY);
    expect(await rows(ctx)).toEqual([
      expect.objectContaining({ account_id: userId, event: "sign-in", poll_id: null, browser_hash: browserHash, hardware_hash: hardwareHash, fingerprint_version: DEVICE_FINGERPRINT_VERSION })
    ]);
  });

  it.each([["missing", undefined], ["malformed", "nonsense"]])("writes one row with null hashes for a %s header", async (_name, header) => {
    const { cookie } = await session();
    expect((await report(cookie, header)).status).toBe(204);
    expect(await rows(ctx)).toEqual([expect.objectContaining({ event: "sign-in", browser_hash: null, hardware_hash: null })]);
  });

  it("writes one row for two reports at once", async () => {
    const { cookie } = await session();
    const answers = await Promise.all([report(cookie, VALID), report(cookie, VALID)]);
    expect(answers.map((a) => a.status)).toEqual([204, 204]);
    expect((await rows(ctx)).length).toBe(1);
  });

  it("releases the session's key when the insert fails, so a later page can report", async () => {
    const { cookie } = await session();
    await sql`alter table device_events rename to device_events_hidden`.execute(ctx.db);
    const silenced = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failed = await report(cookie, VALID);
    silenced.mockRestore();
    await sql`alter table device_events_hidden rename to device_events`.execute(ctx.db);
    expect(failed.status).toBe(500);
    expect((await me(cookie)).headers["x-device-sign-in-due"]).toBe("1");
    expect((await report(cookie, VALID)).status).toBe(204);
    expect((await rows(ctx)).length).toBe(1);
  });

  it("marks a session from an email link due", async () => {
    const email = `link${users++}@example.org`;
    await request(ctx.app).post("/api/auth/create-account").set("x-forwarded-for", "198.51.100.8").send({ ...AGREED, email });
    const followed = await followSignInLink(ctx, extractLinkPath(ctx.sent.at(-1)!));
    const cookie = [followed.headers["set-cookie"]].flat().map(String).find((c) => c.startsWith("session_token="))!.split(";")[0]!;
    expect((await me(cookie)).headers["x-device-sign-in-due"]).toBe("1");
  });

  it("gives each session of one account its own event", async () => {
    const first = await session();
    expect((await report(first.cookie, VALID)).status).toBe(204);
    expect((await me(first.cookie)).headers["x-device-sign-in-due"]).toBeUndefined();
    const other = await session();
    expect((await me(other.cookie)).headers["x-device-sign-in-due"]).toBe("1");
  });
});

describe("deletions and retention (R9, R10)", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await startTestContext(ON);
  });
  afterAll(async () => {
    await ctx.stop();
  });
  beforeEach(async () => {
    await clearPolls(ctx);
    await resetFloors(ctx);
  });

  const children = async () =>
    (
      await sql<{ name: string }>`
        select c.relname as name from pg_inherits i
        join pg_class c on c.oid = i.inhrelid
        join pg_class p on p.oid = i.inhparent
        where p.relname = 'device_events'`.execute(ctx.db)
    ).rows.map((r) => r.name);

  it("deletePoll removes its vote events and keeps sign-in events and other polls' events", async () => {
    const { cookie } = await forgeSession(ctx, `del${users++}@example.com`);
    const gone = makePoll();
    const kept = makePoll();
    await polls(ctx).insertMany([gone, kept]);
    expect((await castThroughRoute(ctx, gone._id, cookie, ["c1"], VALID)).status).toBe(200);
    await resetFloors(ctx);
    expect((await castThroughRoute(ctx, kept._id, cookie, ["c1"], VALID)).status).toBe(200);
    expect((await request(ctx.app).post("/api/me/device-sign-in").set("Cookie", cookie).set("X-Device-Fingerprint", VALID)).status).toBe(204);
    await ctx.consumer.runOnce();
    expect((await rows(ctx)).length).toBe(3);

    await deletePoll(ctx, gone._id);
    const left = await rows(ctx);
    expect(left.map((r) => r.poll_id).sort()).toEqual([kept._id, null].sort());
  });

  it("keeps a vote's event when the voter is banned or the vote is reset", async () => {
    const { cookie, userId } = await forgeSession(ctx, `banned${users++}@example.com`);
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    expect((await castThroughRoute(ctx, poll._id, cookie, ["c1"], VALID)).status).toBe(200);
    await ctx.consumer.runOnce();
    await ctx.db.deleteFrom("votes").where("poll_id", "=", poll._id).execute();
    await ctx.db.deleteFrom("vote_history").where("poll_id", "=", poll._id).execute();
    expect(await rows(ctx)).toEqual([expect.objectContaining({ account_id: userId, poll_id: poll._id })]);
  });

  it("retentionSweep drops a partition whose month ended over 3 months ago and keeps the rest", async () => {
    const now = new Date(Date.UTC(2031, 5, 15));
    const month = (m: number) => new Date(Date.UTC(2031, m, 1));
    // February ended on 1 March, over 3 months before 15 June; March ended on 1 April, under.
    await ensureDeviceEventsPartition(ctx.db, month(1));
    await ensureDeviceEventsPartition(ctx.db, month(2));
    await retentionSweep(ctx, ctx.config, now);
    const names = await children();
    expect(names).not.toContain("device_events_2031_02");
    expect(names).toContain("device_events_2031_03");
  });

  it("scheduleSweep creates next month's partition", async () => {
    const now = new Date(Date.UTC(2032, 2, 10));
    await scheduleSweep(ctx, now);
    expect(await children()).toContain("device_events_2032_04");
  });
});

describe("the coverage line (R12)", () => {
  const coverageLines = async (ctx: TestContext) => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await retentionSweep(ctx, ctx.config);
    const lines = log.mock.calls.map((c) => c.map(String).join(" ")).filter((line) => line.includes("[device-events]"));
    log.mockRestore();
    return lines;
  };

  it("holds counts split by event, and no identifying value, with collection on", async () => {
    const ctx = await startTestContext(ON);
    try {
      const now = new Date();
      const event = (event: "sign-in" | "vote", browser_hash: string | null, at = now) => ({
        account_id: "someone",
        event,
        poll_id: event === "vote" ? "some-poll" : null,
        browser_hash,
        hardware_hash: browser_hash,
        fingerprint_version: 1,
        at
      });
      const hash = "f".repeat(64);
      await ctx.db
        .insertInto("device_events")
        .values([event("sign-in", hash), event("sign-in", null), event("vote", hash), event("vote", hash), event("vote", null), event("vote", null), event("vote", null)])
        .execute();
      const lines = await coverageLines(ctx);
      expect(lines).toEqual(["[device-events] last 24h: sign-in 1 with a fingerprint, 1 without; vote 2 with a fingerprint, 3 without"]);
      expect(lines[0]).not.toContain(hash);
      expect(lines[0]).not.toContain("someone");
      expect(lines[0]).not.toContain("some-poll");
    } finally {
      await ctx.stop();
    }
  });

  it("is absent, and nothing is written or due, with collection off", async () => {
    const ctx = await startTestContext();
    try {
      const { cookie } = await forgeSession(ctx, "off-coverage@example.com");
      const res = await request(ctx.app).get("/api/me").set("Cookie", cookie);
      expect(res.headers["x-device-sign-in-due"]).toBeUndefined();
      expect(res.headers["cache-control"]).not.toBe("no-store");
      expect((await request(ctx.app).post("/api/me/device-sign-in").set("Cookie", cookie).set("X-Device-Fingerprint", VALID)).status).toBe(204);
      expect(await rows(ctx)).toEqual([]);
      expect(await coverageLines(ctx)).toEqual([]);
    } finally {
      await ctx.stop();
    }
  });
});
