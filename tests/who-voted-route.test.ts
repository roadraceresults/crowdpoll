/**
 * GET /api/me/polls/:pid/voters — who may read it, what it lists, what it never
 * carries, and its own floor bucket (specs/20261110-123524-WHO-VOTED-REPORT/contracts/api.md A1).
 */
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, withoutAgreement, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { COUNTS_KEY } from "../src/polls/counters.js";
import type { Poll, VoteEntry } from "../src/polls/store.js";

let ctx: TestContext;
let viewer: { cookie: string; userId: string };
let admin: { cookie: string; userId: string };
const viewerEmail = "who-voted-viewer@example.com";

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_LIVE_REFRESH_INTERVAL: "1" });
  viewer = await forgeSession(ctx, viewerEmail);
  admin = await forgeSession(ctx, ctx.config.admins[0]!);
});
afterAll(async () => {
  await ctx.stop();
});
beforeEach(async () => {
  await polls(ctx).deleteMany({});
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
  for (const key of await ctx.cache.scan("cnt:*")) await ctx.cache.del(key);
});

const voters = (pid: string, cookie?: string) => {
  const req = request(ctx.app).get(`/api/me/polls/${pid}/voters`);
  return cookie ? req.set("Cookie", cookie) : req;
};

const vote = (emailAddress: string, userName: string, choiceIds: string[], votedAt: Date | null = new Date()): VoteEntry => ({
  emailAddress,
  userName,
  choiceIds,
  votedAt
});

async function seed(overrides: Partial<Poll> = {}): Promise<Poll> {
  const poll = makePoll({
    _id: randomUUID(),
    pollVisibility: "Private Poll",
    pollSharingMode: "Invitation Only",
    voteAnonymity: "No",
    invitedVoterList: [viewerEmail],
    ...overrides
  });
  await polls(ctx).insertOne(poll);
  return poll;
}

describe("access", () => {
  it("answers 401 without a session", async () => {
    const poll = await seed();
    expect((await voters(poll._id)).status).toBe(401);
  });

  it("serves an invitee, the creator, a link-related user and an unrelated administrator", async () => {
    const invited = await seed();
    expect((await voters(invited._id, viewer.cookie)).status).toBe(200);

    const own = await seed({ invitedVoterList: [] });
    await ctx.db.updateTable("polls").set({ created_by_id: viewer.userId }).where("id", "=", own._id).execute();
    expect((await voters(own._id, viewer.cookie)).status).toBe(200);

    const linked = await seed({ pollSharingMode: "Anyone With The Link", invitedVoterList: [] });
    await ctx.db.insertInto("user_polls").values({ email: viewerEmail, poll_id: linked._id, relation: "linked", updated_at: new Date() }).execute();
    expect((await voters(linked._id, viewer.cookie)).status).toBe(200);

    const unrelated = await seed({ invitedVoterList: [] });
    expect((await voters(unrelated._id, admin.cookie)).status).toBe(200);
  });

  it("answers every refusal with the same 404 body and no-store", async () => {
    const pub = await seed({ pollVisibility: "Public Poll" });
    const anonymous = await seed({ voteAnonymity: "Yes" });
    const draft = await seed({ pollState: "INITIALIZED" });
    const uninvited = await seed({ invitedVoterList: ["someone@example.com"] });
    const refusals = [
      voters(pub._id, viewer.cookie),
      voters(anonymous._id, viewer.cookie),
      voters(draft._id, viewer.cookie),
      voters(draft._id, admin.cookie),
      voters(uninvited._id, viewer.cookie),
      voters(randomUUID(), viewer.cookie),
      voters("not-a-pid", viewer.cookie)
    ];
    for (const pending of refusals) {
      const res = await pending;
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Not found" });
      expect(res.headers["cache-control"]).toBe("private, no-store");
    }
  });

  it("is refused by the terms gate before acceptance", async () => {
    const poll = await seed({ invitedVoterList: ["late@example.com"] });
    const late = await forgeSession(ctx, "late@example.com");
    await withoutAgreement(ctx, late.userId);
    const res = await voters(poll._id, late.cookie);
    expect(res.status).not.toBe(200);
    expect(res.body.voters).toBeUndefined();
  });
});

describe("what it lists", () => {
  it("lists current votes by name with ISO dates, names only, never an address", async () => {
    const at = new Date("2026-11-10T17:04:12.000Z");
    const poll = await seed({
      choiceMode: "Multiple-Choice Poll",
      choices: [
        { id: "c1", label: "One", position: 0 },
        { id: "c2", label: "Two", position: 1 },
        { id: "c3", label: "Three", position: 2 }
      ],
      currentVotes: [
        vote("bob@example.com", "Bob", ["c2", "c3"], at),
        vote("alice@example.com", "Alice", ["c1"], at),
        vote("invited@example.com", "", [], null)
      ]
    });
    const res = await voters(poll._id, viewer.cookie);
    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("private, no-store");
    expect(res.body).toEqual({
      voters: [
        { name: "Alice", choiceIds: ["c1"], votedAt: at.toISOString() },
        { name: "Bob", choiceIds: ["c2", "c3"], votedAt: at.toISOString() }
      ]
    });
    expect(JSON.stringify(res.body)).not.toMatch(/@|example\.com/);
  });

  it("leaves out choices no longer on the poll, and a vote left with none", async () => {
    const poll = await seed({
      currentVotes: [vote("a@example.com", "Ann", ["c1", "gone"]), vote("b@example.com", "Ben", ["gone"])]
    });
    const res = await voters(poll._id, viewer.cookie);
    expect(res.body.voters).toEqual([expect.objectContaining({ name: "Ann", choiceIds: ["c1"] })]);
  });

  it("lists a deleted account's vote under its placeholder name", async () => {
    const poll = await seed({ currentVotes: [vote("deleted-1@deleted.invalid", "Deleted user", ["c2"])] });
    const res = await voters(poll._id, viewer.cookie);
    expect(res.body.voters).toEqual([expect.objectContaining({ name: "Deleted user", choiceIds: ["c2"] })]);
  });

  it("no longer lists a voter who removed their vote, who is then among those not yet voted", async () => {
    const poll = await seed({ voteMutability: "Dynamic-Vote Poll", invitedVoterList: [viewerEmail, "gone@example.com"] });
    const gone = await forgeSession(ctx, "gone@example.com");
    const cast = async (choiceIds: string[], ip: string) => {
      for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
      const res = await request(ctx.app).post(`/api/polls/${poll._id}/vote`).set("Cookie", gone.cookie).set("X-Forwarded-For", ip).send({ choiceIds });
      expect(res.status).toBe(200);
      await ctx.consumer.runOnce();
    };
    await cast(["c1"], "10.8.0.1");
    expect((await voters(poll._id, viewer.cookie)).body.voters).toEqual([expect.objectContaining({ choiceIds: ["c1"] })]);
    await cast([], "10.8.0.2");
    expect((await voters(poll._id, viewer.cookie)).body.voters).toEqual([]);
    const results = await request(ctx.app).get(`/api/admin/polls/${poll._id}/results`).set("Cookie", admin.cookie);
    expect(results.status).toBe(200);
    expect(results.body.notYetVoted.map((v: { emailAddress: string }) => v.emailAddress)).toContain("gone@example.com");
  });

  it("sends settleMs only while the live counters count a vote not yet written", async () => {
    const poll = await seed({ currentVotes: [vote("a@example.com", "Ann", ["c1"])] });
    await ctx.cache.hset(COUNTS_KEY(poll._id), { c1: "1", total: "1", seq: "1" });
    expect((await voters(poll._id, viewer.cookie)).body.settleMs).toBeUndefined();

    await ctx.cache.hset(COUNTS_KEY(poll._id), { c1: "2", total: "2", seq: "2" });
    expect((await voters(poll._id, viewer.cookie)).body.settleMs).toBe(ctx.config.voteQueueLagNoticeMs);
  });
});

describe("floor", () => {
  it("answers 429 within its own bucket without taking the Live Results token", async () => {
    const poll = await seed();
    const live = ctx.config.floors.live;
    ctx.config.floors.live = 60_000;
    try {
      expect((await voters(poll._id, viewer.cookie)).status).toBe(200);
      const refused = await voters(poll._id, viewer.cookie);
      expect(refused.status).toBe(429);
      expect(refused.body.error).toBe("too-soon");
      const liveRefresh = await request(ctx.app).post("/api/live/refresh").set("Cookie", viewer.cookie).send({});
      expect(liveRefresh.status).not.toBe(429);
    } finally {
      ctx.config.floors.live = live;
    }
  });
});
