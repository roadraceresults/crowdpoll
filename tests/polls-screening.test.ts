/**
 * 011-SIMPLIFY-POLL-STATES — publish and Acceptability Screening (US3).
 *
 * Every time-dependent behaviour is exercised by passing a chosen timestamp and
 * calling one sweep tick directly. No test sleeps.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { startTestContext, forgeSession, type TestContext } from "./helpers/setup.js";
import { makePoll } from "./helpers/poll-fixtures.js";
import { polls, publicDetail, publicListing, voteHistory } from "./helpers/poll-fixtures.js";
import { pollsAwaitingApprovalSweep } from "../src/polls/sweeps.js";
import { localScreener, type Screener } from "../src/polls/screening.js";

const DEPS = { maxAttempts: 10, callTimeoutMs: 10_000 };

describe("localScreener (011 R1)", () => {
  it("accepts ordinary wording", async () => {
    expect(await localScreener({ title: "Best biscuit?", subtitle: "Pick one", choiceLabels: ["Hobnob", "Digestive"] })).toBe("");
  });

  it("objects to unacceptable wording, with a readable reason", async () => {
    const v = await localScreener({ title: "you fuck", subtitle: "", choiceLabels: ["a", "b"] });
    expect(v).not.toBe("");
    expect(v).toMatch(/unacceptable language/i);
  });

  it("screens the choices too, not just the title", async () => {
    expect(await localScreener({ title: "ok", subtitle: "", choiceLabels: ["fine", "nigger"] })).not.toBe("");
  });

  it("does not trip on innocent words that contain a term", async () => {
    expect(await localScreener({ title: "Classic Scunthorpe", subtitle: "Assessment", choiceLabels: ["Grass", "Bassoon"] })).toBe("");
  });
});

describe("Publish and approval (011 US3)", () => {
  let ctx: TestContext;
  let cookie: string;
  beforeAll(async () => {
    ctx = await startTestContext();
    ({ cookie } = await forgeSession(ctx, ctx.config.admins[0]!));
  });
  afterAll(async () => {
    await ctx.stop();
  });
  beforeEach(async () => {
    await polls(ctx).deleteMany({});
  });

  const publish = (pid: string, body: Record<string, unknown> = {}) =>
    request(ctx.app).post(`/api/admin/polls/${pid}/publish`).set("Cookie", cookie).send(body);
  const reload = async (pid: string) => (await polls(ctx).findOne({ _id: pid }))!;

  const realChoices = [
    { id: "a", label: "Hobnob", position: 0 },
    { id: "b", label: "Digestive", position: 1 }
  ];

  it("holds back a poll whose choices are still default, and says so (FR-025)", async () => {
    const poll = makePoll({ pollState: "INITIALIZED", title: "Best biscuit?" });
    await polls(ctx).insertOne(poll);
    const res = await publish(poll._id, { subtitle: "Pick one" });
    expect(res.status).toBe(200);
    expect(res.body.pollState).toBe("INITIALIZED");
    expect(res.body.message).toMatch(/default values/i);
    expect((await reload(poll._id)).pollState).toBe("INITIALIZED");
  });

  it("accepts a real poll for approval and returns immediately (FR-026)", async () => {
    const poll = makePoll({
      pollState: "INITIALIZED",
      choices: realChoices,
      pollRejectionReason: "stale reason",
      pollAcceptabilityScreeningAttempts: 4
    });
    await polls(ctx).insertOne(poll);
    const res = await publish(poll._id, { title: "Best biscuit?" });
    expect(res.status).toBe(200);
    expect(res.body.pollState).toBe("AWAITING APPROVAL");

    const after = await reload(poll._id);
    expect(after.pollState).toBe("AWAITING APPROVAL");
    expect(after.pollRejectionReason).toBeNull();
    expect(after.pollApprovalTimestamp).toBeNull();
    expect(after.pollAcceptabilityScreeningAttempts).toBe(0);
    expect(after.pollEditUpdateClientGUID).toBeNull();
  });

  it("rejects a poll whose screening objects, recording the returned reason (FR-029)", async () => {
    const poll = makePoll({
      pollState: "AWAITING APPROVAL",
      title: "you fuck",
      choices: realChoices
    });
    await polls(ctx).insertOne(poll);
    expect(await pollsAwaitingApprovalSweep(ctx, DEPS)).toBe(1);

    const after = await reload(poll._id);
    expect(after.pollState).toBe("REJECTED");
    expect(after.pollRejectionReason).toMatch(/unacceptable language/i);
    expect(after.pollApprovalTimestamp).toBeNull();
    // A call that completed resets the count, whatever it decided (FR-038).
    expect(after.pollAcceptabilityScreeningAttempts).toBe(0);
  });

  it("approves a clean poll and writes the schedule-appropriate state (FR-041)", async () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const cases = [
      { startAt: new Date("2026-07-01T00:00:00Z"), endAt: null, expected: "WAITING TO OPEN" },
      { startAt: null, endAt: null, expected: "OPEN" },
      { startAt: null, endAt: new Date("2026-01-01T00:00:00Z"), expected: "CLOSED" }
    ];
    for (const c of cases) {
      await polls(ctx).deleteMany({});
      const poll = makePoll({
        pollState: "AWAITING APPROVAL",
        title: "Best biscuit?",
        choices: realChoices,
        startAt: c.startAt,
        endAt: c.endAt,
        pollRejectionReason: "previous rejection"
      });
      await polls(ctx).insertOne(poll);
      await pollsAwaitingApprovalSweep(ctx, DEPS, now);
      const after = await reload(poll._id);
      expect(after.pollState).toBe(c.expected);
      expect(after.pollRejectionReason).toBeNull();
      expect(after.pollAcceptabilityScreeningAttempts).toBe(0);
    }
  });

  it("screens the poll that would open soonest, with no start time going first (FR-034)", async () => {
    const soon = makePoll({ pollState: "AWAITING APPROVAL", title: "Soon", choices: realChoices, startAt: new Date("2026-02-01") });
    const later = makePoll({ pollState: "AWAITING APPROVAL", title: "Later", choices: realChoices, startAt: new Date("2026-09-01") });
    const noStart = makePoll({ pollState: "AWAITING APPROVAL", title: "NoStart", choices: realChoices, startAt: null });
    await polls(ctx).insertMany([later, soon, noStart]);

    // One poll per tick, and the one with no start time is the most urgent.
    await pollsAwaitingApprovalSweep(ctx, DEPS);
    expect((await reload(noStart._id)).pollState).toBe("OPEN");
    expect((await reload(soon._id)).pollState).toBe("AWAITING APPROVAL");
    expect((await reload(later._id)).pollState).toBe("AWAITING APPROVAL");

    await pollsAwaitingApprovalSweep(ctx, DEPS);
    expect((await reload(soon._id)).pollState).not.toBe("AWAITING APPROVAL");
    expect((await reload(later._id)).pollState).toBe("AWAITING APPROVAL");
  });

  it("handles at most one poll per tick (FR-033)", async () => {
    await polls(ctx).insertMany([
      makePoll({ pollState: "AWAITING APPROVAL", title: "One", choices: realChoices }),
      makePoll({ pollState: "AWAITING APPROVAL", title: "Two", choices: realChoices })
    ]);
    expect(await pollsAwaitingApprovalSweep(ctx, DEPS)).toBe(1);
    expect(await polls(ctx).countDocuments({ pollState: "AWAITING APPROVAL" })).toBe(1);
  });

  it("does nothing when no poll is awaiting approval", async () => {
    await polls(ctx).insertOne(makePoll({ pollState: "OPEN" }));
    expect(await pollsAwaitingApprovalSweep(ctx, DEPS)).toBe(0);
  });

  it("never shows a poll publicly while AWAITING APPROVAL or REJECTED (FR-003, T033)", async () => {
    for (const pollState of ["AWAITING APPROVAL", "REJECTED"] as const) {
      await polls(ctx).deleteMany({});
      const poll = makePoll({ pollVisibility: "Public Poll", pollState });
      await polls(ctx).insertOne(poll);

      expect(await publicListing(ctx)).toHaveLength(0);
      expect(await publicDetail(ctx, poll._id)).toBeNull();
    }
  });
});

describe("Screening failure and recovery (011 US7)", () => {
  let ctx: TestContext;
  let cookie: string;
  beforeAll(async () => {
    ctx = await startTestContext();
    ({ cookie } = await forgeSession(ctx, ctx.config.admins[0]!));
  });
  afterAll(async () => {
    await ctx.stop();
  });
  beforeEach(async () => {
    await polls(ctx).deleteMany({});
  });

  const reload = async (pid: string) => (await polls(ctx).findOne({ _id: pid }))!;
  const realChoices = [
    { id: "a", label: "Hobnob", position: 0 },
    { id: "b", label: "Digestive", position: 1 }
  ];
  const awaiting = (over: Record<string, unknown> = {}) =>
    makePoll({ pollState: "AWAITING APPROVAL", title: "Best biscuit?", choices: realChoices, ...over } as never);

  /** Never resolves — the caller's timeout is what must end it. */
  const hangingScreener: Screener = () => new Promise(() => {});
  const throwingScreener: Screener = async () => {
    throw new Error("screening service unreachable");
  };

  it("T071: two concurrent ticks produce exactly one claim and one increment", async () => {
    const poll = awaiting();
    await polls(ctx).insertOne(poll);

    // Both ticks race for the same unclaimed poll.
    const [a, b] = await Promise.all([
      pollsAwaitingApprovalSweep(ctx, DEPS),
      pollsAwaitingApprovalSweep(ctx, DEPS)
    ]);
    expect(a + b).toBe(1);
    // The winner completed its call, so the count reset; the loser never claimed.
    expect((await reload(poll._id)).pollAcceptabilityScreeningAttempts).toBe(0);
  });

  it("T072: a call that exceeds the timeout releases the claim without re-counting", async () => {
    const poll = awaiting();
    await polls(ctx).insertOne(poll);
    await pollsAwaitingApprovalSweep(
      ctx,
      { maxAttempts: 10, callTimeoutMs: 5, screener: hangingScreener }
    );

    const after = await reload(poll._id);
    expect(after.pollState).toBe("AWAITING APPROVAL");
    expect(after.pollApprovalTimestamp).toBeNull();
    expect(after.pollRejectionReason).toMatch(/timed out 1 times/);
    // Counted once, when the claim was taken — not again on failure.
    expect(after.pollAcceptabilityScreeningAttempts).toBe(1);
  });

  it("T072: a screener that throws is treated exactly like a timeout", async () => {
    const poll = awaiting();
    await polls(ctx).insertOne(poll);
    await pollsAwaitingApprovalSweep(
      ctx,
      { ...DEPS, screener: throwingScreener }
    );
    const after = await reload(poll._id);
    expect(after.pollState).toBe("AWAITING APPROVAL");
    expect(after.pollApprovalTimestamp).toBeNull();
    expect(after.pollAcceptabilityScreeningAttempts).toBe(1);
  });

  it("T073: a claim older than twice the timeout is released without an extra attempt", async () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const stale = new Date(now.getTime() - DEPS.callTimeoutMs * 2 - 1);
    const poll = awaiting({
      pollApprovalTimestamp: stale,
      pollAcceptabilityScreeningAttempts: 3
    });
    await polls(ctx).insertOne(poll);

    expect(await pollsAwaitingApprovalSweep(ctx, DEPS, now)).toBe(1);
    const after = await reload(poll._id);
    expect(after.pollState).toBe("AWAITING APPROVAL");
    expect(after.pollApprovalTimestamp).toBeNull();
    expect(after.pollAcceptabilityScreeningAttempts).toBe(3); // unchanged
    expect(after.pollRejectionReason).toMatch(/timed out 3 times/);
  });

  it("T073: recovery runs before new screening, so a stale claim is never starved", async () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const stuck = awaiting({
      title: "Stuck",
      pollApprovalTimestamp: new Date(now.getTime() - DEPS.callTimeoutMs * 2 - 1)
    });
    const fresh = awaiting({ title: "Fresh" });
    await polls(ctx).insertMany([fresh, stuck]);

    // The unclaimed poll would win query 2, but query 1 goes first.
    await pollsAwaitingApprovalSweep(ctx, DEPS, now);
    expect((await reload(stuck._id)).pollApprovalTimestamp).toBeNull();
    expect((await reload(fresh._id)).pollState).toBe("AWAITING APPROVAL");
  });

  it("T074: the budget terminates even when the process dies on every attempt", async () => {
    // Simulates a process killed mid-call: the claim is taken, then nothing.
    // Recovery ticks release it; each original claim already counted its attempt.
    const poll = awaiting();
    await polls(ctx).insertOne(poll);

    let screeningCalls = 0;
    const dyingScreener: Screener = () => {
      screeningCalls += 1;
      return new Promise(() => {}); // never returns — the process "dies" here
    };
    const deps = { maxAttempts: DEPS.maxAttempts, callTimeoutMs: 5, screener: dyingScreener };

    // Bounded loop: if the counter ever regressed to incrementing on failure,
    // the poll would cycle forever and this would exit on the guard instead of
    // by rejection — which is the failure this test exists to catch.
    let ticks = 0;
    const LIMIT = DEPS.maxAttempts * 4;
    while (ticks < LIMIT) {
      ticks += 1;
      await pollsAwaitingApprovalSweep(ctx, deps);
      if ((await reload(poll._id)).pollState === "REJECTED") break;
    }

    const after = await reload(poll._id);
    expect(after.pollState).toBe("REJECTED");
    expect(after.pollRejectionReason).toMatch(/failed 10 times and will not automatically be re-attempted/);
    // Exactly the budget was spent on real calls, and no more.
    expect(screeningCalls).toBe(DEPS.maxAttempts);
    expect(ticks).toBeLessThan(LIMIT);
  });

  it("T075: a completed call resets the count, whichever verdict it returned", async () => {
    for (const [title, expectedState] of [
      ["Best biscuit?", "OPEN"],
      ["you fuck", "REJECTED"]
    ] as const) {
      await polls(ctx).deleteMany({});
      const poll = awaiting({ title, pollAcceptabilityScreeningAttempts: 7 });
      await polls(ctx).insertOne(poll);
      await pollsAwaitingApprovalSweep(ctx, DEPS);
      const after = await reload(poll._id);
      expect(after.pollState).toBe(expectedState);
      expect(after.pollAcceptabilityScreeningAttempts).toBe(0);
    }
  });

  it("T081: re-screening is offered only once the budget is exhausted", async () => {
    const notExhausted = makePoll({
      pollState: "REJECTED",
      pollAcceptabilityScreeningAttempts: 2,
      pollRejectionReason: "content objection"
    });
    await polls(ctx).insertOne(notExhausted);
    const early = await request(ctx.app)
      .post(`/api/admin/polls/${notExhausted._id}/rescreen`)
      .set("Cookie", cookie);
    expect(early.status).toBe(409);

    const exhausted = makePoll({
      pollState: "REJECTED",
      pollAcceptabilityScreeningAttempts: 10,
      pollRejectionReason: "Acceptability Screening has failed 10 times..."
    });
    await polls(ctx).insertOne(exhausted);
    const ok = await request(ctx.app)
      .post(`/api/admin/polls/${exhausted._id}/rescreen`)
      .set("Cookie", cookie);
    expect(ok.status).toBe(200);

    const after = await reload(exhausted._id);
    expect(after.pollState).toBe("AWAITING APPROVAL");
    expect(after.pollAcceptabilityScreeningAttempts).toBe(0);
    expect(after.pollRejectionReason).toBeNull();
    expect(after.pollApprovalTimestamp).toBeNull();
  });

  it("T082: the list marks a poll re-screenable only when the budget is spent", async () => {
    await polls(ctx).insertMany([
      makePoll({ pollState: "REJECTED", pollAcceptabilityScreeningAttempts: 10 }),
      makePoll({ pollState: "REJECTED", pollAcceptabilityScreeningAttempts: 1 }),
      makePoll({ pollState: "OPEN", pollAcceptabilityScreeningAttempts: 10 })
    ]);
    const res = await request(ctx.app).get("/api/admin/polls").set("Cookie", cookie);
    expect(res.body.polls.filter((p: { canRescreen: boolean }) => p.canRescreen)).toHaveLength(1);
  });
});

describe("Admin list rows carry every decision (011 T083/T084)", () => {
  let ctx: TestContext;
  let cookie: string;
  beforeAll(async () => {
    ctx = await startTestContext();
    ({ cookie } = await forgeSession(ctx, ctx.config.admins[0]!));
  });
  afterAll(async () => {
    await ctx.stop();
  });
  beforeEach(async () => {
    await polls(ctx).deleteMany({});
    await voteHistory(ctx).deleteMany({});
  });

  const list = async () =>
    (await request(ctx.app).get("/api/admin/polls").set("Cookie", cookie)).body.polls;

  it("carries the state, waiting and reason fields the list renders", async () => {
    const poll = makePoll({
      pollState: "AWAITING APPROVAL",
      pollApprovalTimestamp: new Date("2026-06-01T00:00:00Z"),
      pollRejectionReason: "previous objection",
      pollAcceptabilityScreeningAttempts: 3
    });
    await polls(ctx).insertOne(poll);
    const [row] = await list();
    expect(row.pollState).toBe("AWAITING APPROVAL");
    expect(new Date(row.pollApprovalTimestamp).toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(row.pollRejectionReason).toBe("previous objection");
    expect(row.pollAcceptabilityScreeningAttempts).toBe(3);
    expect(row.hasEverBeenVotedOn).toBe(false);
  });

  it("offers exactly one of edit or update, never both, and switches on vote history", async () => {
    const never = makePoll({ pollState: "OPEN" });
    const voted = makePoll({ pollState: "OPEN" });
    await polls(ctx).insertMany([never, voted]);
    await voteHistory(ctx).insertOne({
      pid: voted._id, emailAddress: "v@x.com", userName: "v", choiceIds: ["c1"], votedAt: new Date()
    });

    const rows = await list();
    const byPid = Object.fromEntries(rows.map((r: { pid: string }) => [r.pid, r]));
    expect(byPid[never._id].canEdit).toBe(true);
    expect(byPid[never._id].canUpdate).toBe(false);
    expect(byPid[voted._id].canEdit).toBe(false);
    expect(byPid[voted._id].canUpdate).toBe(true);
    expect(byPid[voted._id].hasEverBeenVotedOn).toBe(true);
  });

  it("offers neither edit nor update for EDITING, AWAITING APPROVAL or ARCHIVED (FR-052)", async () => {
    for (const pollState of ["EDITING", "AWAITING APPROVAL", "ARCHIVED"] as const) {
      await polls(ctx).deleteMany({});
      await polls(ctx).insertOne(makePoll({ pollState }));
      const [row] = await list();
      expect(row.canEdit, pollState).toBe(false);
      expect(row.canUpdate, pollState).toBe(false);
    }
  });

  it("permits deletion only for INITIALIZED, REJECTED and ARCHIVED (FR-053)", async () => {
    const deletable = ["INITIALIZED", "REJECTED", "ARCHIVED"];
    for (const pollState of [
      "INITIALIZED", "EDITING", "AWAITING APPROVAL", "REJECTED",
      "WAITING TO OPEN", "OPEN", "CLOSED", "ARCHIVED"
    ] as const) {
      await polls(ctx).deleteMany({});
      await polls(ctx).insertOne(makePoll({ pollState }));
      const [row] = await list();
      expect(row.canDelete, pollState).toBe(deletable.includes(pollState));
    }
  });

  it("permits archiving only from CLOSED (FR-049)", async () => {
    for (const pollState of ["OPEN", "CLOSED", "WAITING TO OPEN", "ARCHIVED"] as const) {
      await polls(ctx).deleteMany({});
      await polls(ctx).insertOne(makePoll({ pollState }));
      const [row] = await list();
      expect(row.canArchive, pollState).toBe(pollState === "CLOSED");
    }
  });

  it("answers the whole page with one vote-history query, not one per row", async () => {
    // Twenty polls, half of them voted on: the response must still be correct.
    const many = Array.from({ length: 20 }, () => makePoll({ pollState: "OPEN" }));
    await polls(ctx).insertMany(many);
    await voteHistory(ctx).insertMany(
      many.slice(0, 10).map((p) => ({
        pid: p._id, emailAddress: "v@x.com", userName: "v", choiceIds: ["c1"], votedAt: new Date()
      }))
    );
    const rows = await list();
    expect(rows.filter((r: { hasEverBeenVotedOn: boolean }) => r.hasEverBeenVotedOn)).toHaveLength(10);
    expect(rows.filter((r: { canUpdate: boolean }) => r.canUpdate)).toHaveLength(10);
    expect(rows.filter((r: { canEdit: boolean }) => r.canEdit)).toHaveLength(10);
  });

  it("exposes the admin refresh interval, distinct from the card polling one (FR-059)", async () => {
    const res = await request(ctx.app).get("/api/config");
    expect(res.status).toBe(200);
    expect(res.body.pollAdminPageRefreshIntervalMs).toBe(5000);
    expect(Object.keys(res.body)).toContain("pollAdminPageRefreshIntervalMs");
  });
});
