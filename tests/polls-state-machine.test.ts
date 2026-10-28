/**
 * 011-SIMPLIFY-POLL-STATES — the eight-state model.
 * US1: a new poll starts INITIALIZED, is not public, and offers only edit+delete.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll } from "./helpers/poll-fixtures.js";
import { forgeSession } from "./helpers/setup.js";
import { voteHistory } from "./helpers/poll-fixtures.js";
import { polls, publicListing } from "./helpers/poll-fixtures.js";
import { PUBLIC_STATES, POLL_STATES, createDefaultPoll } from "./helpers/state-helpers.js";
import { isAllDefaults, hasDefaultChoices } from "../src/polls/service.js";

describe("Poll states (011 FR-001, FR-002, FR-003)", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await startTestContext();
  });
  afterAll(async () => {
    await ctx.stop();
  });
  beforeEach(async () => {
    await polls(ctx).deleteMany({});
  });
  it("defines exactly the eight documented states", () => {
    expect([...POLL_STATES]).toEqual([
      "INITIALIZED",
      "EDITING",
      "AWAITING APPROVAL",
      "REJECTED",
      "WAITING TO OPEN",
      "OPEN",
      "CLOSED",
      "ARCHIVED"
    ]);
  });

  it("starts a new poll INITIALIZED with every field at its default (FR-002)", () => {
    const poll = createDefaultPoll(new Date("2026-01-01T00:00:00Z"));
    expect(poll.pollState).toBe("INITIALIZED");
    expect(poll.pollStateBeforeEditUpdate).toBeNull();
    expect(poll.pollEditUpdateHeartbeatTimestamp).toBeNull();
    expect(poll.pollEditUpdateClientGUID).toBeNull();
    expect(poll.pollApprovalTimestamp).toBeNull();
    expect(poll.pollAcceptabilityScreeningAttempts).toBe(0);
    expect(poll.pollRejectionReason).toBeNull();
  });

  it("shows only WAITING TO OPEN, OPEN and CLOSED to the public (FR-003)", () => {
    expect([...PUBLIC_STATES]).toEqual(["WAITING TO OPEN", "OPEN", "CLOSED"]);
  });

  it("withholds an INITIALIZED poll from the public listing (FR-003)", async () => {
    const poll = makePoll({ pollVisibility: "Public Poll", pollState: "INITIALIZED" });
    await polls(ctx).insertOne(poll);
    expect(await publicListing(ctx)).not.toContain(poll._id);
  });

  it("withholds every non-public state from the listing (FR-003)", async () => {
    const hidden = POLL_STATES.filter((s) => !PUBLIC_STATES.includes(s));
    for (const state of hidden) {
      await polls(ctx).insertOne(makePoll({ pollVisibility: "Public Poll", pollState: state }));
    }
    expect(await publicListing(ctx)).toHaveLength(0);
  });
});

describe("Publish guards (011 FR-024, FR-025)", () => {
  it("refuses a poll where every field is still default (FR-024)", () => {
    expect(isAllDefaults(createDefaultPoll(new Date("2026-01-01T00:00:00Z")))).toBe(true);
  });

  it("still refuses when the title and subtitle changed but the choices did not (FR-025)", () => {
    const poll = createDefaultPoll(new Date("2026-01-01T00:00:00Z"));
    poll.title = "Best biscuit?";
    poll.subtitle = "Pick one";
    expect(hasDefaultChoices(poll)).toBe(true);
    expect(isAllDefaults(poll)).toBe(true);
  });

  it("allows publishing once the choices are real, even with the generated title", () => {
    const poll = createDefaultPoll(new Date("2026-01-01T00:00:00Z"));
    poll.choices = [
      { id: "a", label: "Hobnob", position: 0 },
      { id: "b", label: "Digestive", position: 1 }
    ];
    expect(isAllDefaults(poll)).toBe(false);
  });

  it("treats a changed count or wording of choices as no longer default", () => {
    const base = createDefaultPoll(new Date("2026-01-01T00:00:00Z"));
    const threeDefaults = { ...base, choices: [...base.choices, { id: "c", label: "Choice 3", position: 2 }] };
    expect(hasDefaultChoices(threeDefaults)).toBe(false);
    const renamed = { ...base, choices: [{ id: "a", label: "Choice 1", position: 0 }, { id: "b", label: "Tea", position: 1 }] };
    expect(hasDefaultChoices(renamed)).toBe(false);
  });
});

describe("Archiving and deletion (011 US9, T088/T089/T090)", () => {
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

  const archive = (pid: string) =>
    request(ctx.app).patch(`/api/admin/polls/${pid}`).set("Cookie", cookie).send({ pollState: "ARCHIVED" });
  const del = (pid: string) =>
    request(ctx.app).delete(`/api/admin/polls/${pid}`).set("Cookie", cookie);
  const reload = async (pid: string) => await polls(ctx).findOne({ _id: pid });

  it("T088: archives only from CLOSED (FR-049)", async () => {
    for (const pollState of POLL_STATES) {
      await polls(ctx).deleteMany({});
      const poll = makePoll({ pollState });
      await polls(ctx).insertOne(poll);
      const res = await archive(poll._id);
      if (pollState === "CLOSED") {
        expect(res.status, pollState).toBe(200);
        expect((await reload(poll._id))!.pollState).toBe("ARCHIVED");
      } else {
        expect(res.status, pollState).not.toBe(200);
        expect((await reload(poll._id))!.pollState).toBe(pollState);
      }
    }
  });

  it("T088: archiving is terminal — every transition out is refused (FR-050)", async () => {
    const poll = makePoll({ pollState: "ARCHIVED" });
    await polls(ctx).insertOne(poll);
    for (const target of ["CLOSED", "ARCHIVED"] as const) {
      const res = await request(ctx.app)
        .patch(`/api/admin/polls/${poll._id}`)
        .set("Cookie", cookie)
        .send({ pollState: target });
      expect(res.status).toBe(409);
    }
    expect((await reload(poll._id))!.pollState).toBe("ARCHIVED");
  });

  it("T088: an archived poll keeps its votes and stays admin-visible, not public (FR-051)", async () => {
    const poll = makePoll({
      pollVisibility: "Public Poll",
      pollState: "ARCHIVED",
      currentVotes: [{ emailAddress: "a@x.com", userName: "a", choiceIds: ["c1"], votedAt: new Date() }]
    });
    await polls(ctx).insertOne(poll);

    expect(await publicListing(ctx)).toHaveLength(0);
    const admin = await request(ctx.app).get("/api/admin/polls").set("Cookie", cookie);
    expect(admin.body.polls.map((r: { pid: string }) => r.pid)).toContain(poll._id);
    expect((await reload(poll._id))!.currentVotes).toHaveLength(1);
  });

  it("T089: deletes only from INITIALIZED, REJECTED and ARCHIVED (FR-053)", async () => {
    const deletable = ["INITIALIZED", "REJECTED", "ARCHIVED"];
    for (const pollState of POLL_STATES) {
      await polls(ctx).deleteMany({});
      const poll = makePoll({ pollState });
      await polls(ctx).insertOne(poll);
      const res = await del(poll._id);
      if (deletable.includes(pollState)) {
        expect(res.status, pollState).toBe(204);
        expect(await reload(poll._id)).toBeNull();
      } else {
        expect(res.status, pollState).toBe(409);
        expect(await reload(poll._id)).not.toBeNull();
      }
    }
  });

  it("T089: a poll that has been voted on and is not archived can never be deleted (SC-012)", async () => {
    for (const pollState of ["OPEN", "CLOSED", "WAITING TO OPEN"] as const) {
      await polls(ctx).deleteMany({});
      const poll = makePoll({ pollState });
      await polls(ctx).insertOne(poll);
      await voteHistory(ctx).insertOne({
        pid: poll._id, emailAddress: "v@x.com", userName: "v", choiceIds: ["c1"], votedAt: new Date()
      });
      expect((await del(poll._id)).status, pollState).toBe(409);
      expect(await reload(poll._id)).not.toBeNull();
    }
  });

  it("T089: deleting a poll takes its history with it", async () => {
    const poll = makePoll({ pollState: "ARCHIVED" });
    await polls(ctx).insertOne(poll);
    await voteHistory(ctx).insertOne({
      pid: poll._id, emailAddress: "v@x.com", userName: "v", choiceIds: ["c1"], votedAt: new Date()
    });
    expect((await del(poll._id)).status).toBe(204);
    expect(await voteHistory(ctx).countDocuments({ pid: poll._id })).toBe(0);
  });

  it("T090: a duplicate starts INITIALIZED with no votes, schedule or bookkeeping", async () => {
    const source = makePoll({
      pollState: "OPEN",
      title: "Original",
      startAt: new Date("2026-01-01"),
      endAt: new Date("2026-02-01"),
      currentVotes: [{ emailAddress: "a@x.com", userName: "a", choiceIds: ["c1"], votedAt: new Date() }],
      pollRejectionReason: "an old objection",
      pollAcceptabilityScreeningAttempts: 6,
      pollApprovalTimestamp: new Date("2026-01-15")
    });
    await polls(ctx).insertOne(source);

    const dup = await request(ctx.app)
      .post(`/api/admin/polls/${source._id}/duplicate`)
      .set("Cookie", cookie);
    expect(dup.status).toBe(201);

    const copy = (await reload(dup.body.pid))!;
    // It carries the source's wording, so it must be screened before going public.
    expect(copy.pollState).toBe("INITIALIZED");
    expect(copy.currentVotes).toHaveLength(0);
    expect(copy.startAt).toBeNull();
    expect(copy.endAt).toBeNull();
    expect(copy.pollRejectionReason).toBeNull();
    expect(copy.pollAcceptabilityScreeningAttempts).toBe(0);
    expect(copy.pollApprovalTimestamp).toBeNull();
    expect(copy.pollEditUpdateClientGUID).toBeNull();

    // The source is untouched.
    const after = (await reload(source._id))!;
    expect(after.pollState).toBe("OPEN");
    expect(after.currentVotes).toHaveLength(1);
  });

  it("T090: an archived poll can be duplicated to re-run it, without changing the original", async () => {
    const source = makePoll({ pollState: "ARCHIVED", title: "Last year" });
    await polls(ctx).insertOne(source);
    const dup = await request(ctx.app)
      .post(`/api/admin/polls/${source._id}/duplicate`)
      .set("Cookie", cookie);
    expect(dup.status).toBe(201);
    expect((await reload(dup.body.pid))!.pollState).toBe("INITIALIZED");
    expect((await reload(source._id))!.pollState).toBe("ARCHIVED");
  });

  // 012 FR-059: the invited list is saved with the poll rather than through a route
  // of its own, so this refusal now comes from publish's own state gate. The rule is
  // unchanged: a poll that is locked, being screened, or archived cannot be changed.
  it("T097: the invited list is refused while locked, screening or archived", async () => {
    for (const pollState of ["EDITING", "AWAITING APPROVAL", "ARCHIVED"] as const) {
      await polls(ctx).deleteMany({});
      const poll = makePoll({ pollState, pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" });
      await polls(ctx).insertOne(poll);
      const res = await request(ctx.app)
        .post(`/api/admin/polls/${poll._id}/publish`)
        .set("Cookie", cookie)
        .send({ invitedVoterList: ["new@example.com"] });
      expect(res.status, pollState).toBe(409);
      expect((await polls(ctx).findOne({ _id: poll._id }))!.invitedVoterList).toEqual([]);
    }
  });
});

describe("Banning is moderation, not editing (011)", () => {
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

  async function votedPoll(pollState: "OPEN" | "CLOSED" | "WAITING TO OPEN") {
    const poll = makePoll({
      pollState,
      currentVotes: [{ emailAddress: "bad@x.com", userName: "bad", choiceIds: ["c1"], votedAt: new Date() }]
    });
    await polls(ctx).insertOne(poll);
    await voteHistory(ctx).insertOne({
      pid: poll._id, emailAddress: "bad@x.com", userName: "bad", choiceIds: ["c1"], votedAt: new Date()
    });
    return poll;
  }

  /** Bans by saving the poll with the address on its banned list (012 FR-059). */
  async function banViaPublish(pollId: string, email: string) {
    return request(ctx.app)
      .post(`/api/admin/polls/${pollId}/publish`)
      .set("Cookie", cookie)
      .send({ bannedVoterList: [email] });
  }

  it("bans a voter on a poll that has votes — the case that actually matters", async () => {
    const poll = await votedPoll("OPEN");
    const res = await banViaPublish(poll._id, "bad@x.com");
    expect(res.status).toBe(200);

    const after = (await polls(ctx).findOne({ _id: poll._id }))!;
    expect(after.currentVotes).toHaveLength(0);
    expect(after.bannedVoterList).toContain("bad@x.com");
    // FR-055: deleted outright, with no marker left behind...
    expect(JSON.stringify(after.currentVotes)).not.toContain("removed");
    // ...and the audit trail survives, so the poll stays on the update surface.
    expect(await voteHistory(ctx).countDocuments({ pid: poll._id })).toBe(1);
  });

  it("bans on any votable state, not just OPEN", async () => {
    for (const st of ["OPEN", "CLOSED", "WAITING TO OPEN"] as const) {
      await polls(ctx).deleteMany({});
      await voteHistory(ctx).deleteMany({});
      const poll = await votedPoll(st);
      const res = await banViaPublish(poll._id, "bad@x.com");
      expect(res.status, st).toBe(200);
      expect((await polls(ctx).findOne({ _id: poll._id }))!.currentVotes, st).toHaveLength(0);
    }
  });

  it("refuses moderation while locked, in screening, or archived", async () => {
    for (const pollState of ["EDITING", "AWAITING APPROVAL", "ARCHIVED"] as const) {
      await polls(ctx).deleteMany({});
      const poll = makePoll({
        pollState,
        currentVotes: [{ emailAddress: "bad@x.com", userName: "bad", choiceIds: ["c1"], votedAt: new Date() }]
      });
      await polls(ctx).insertOne(poll);
      const res = await banViaPublish(poll._id, "bad@x.com");
      expect(res.status, pollState).toBe(409);
      // An archived poll's history must not change.
      expect((await polls(ctx).findOne({ _id: poll._id }))!.currentVotes).toHaveLength(1);
    }
  });
});

/**
 * 012 US3 (FR-024..FR-029): one-click Open / Close / Archive from the poll list.
 *
 * The interesting part is not the transition itself but the *schedule* it writes.
 * The date sweep re-derives state from startAt/endAt every tick and writes the
 * result, so a manual state that contradicts the schedule is reverted within one
 * interval. Each transition therefore writes the schedule into a shape the sweep
 * then agrees with — which is why no override flag exists anywhere in the model.
 */
describe("Manual state transitions (012 US3)", () => {
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

  const HOUR = 3600_000;
  const patch = (pid: string, pollState: string) =>
    request(ctx.app).patch(`/api/admin/polls/${pid}`).set("Cookie", cookie).send({ pollState });

  // ── T036: from-state guards ────────────────────────────────────────────────
  it("T036 offers OPEN only from WAITING TO OPEN and CLOSED (FR-024)", async () => {
    for (const from of ["WAITING TO OPEN", "CLOSED"] as const) {
      const poll = makePoll({ pollState: from });
      await polls(ctx).insertOne(poll);
      expect((await patch(poll._id, "OPEN")).status, from).toBe(200);
    }
    for (const from of ["INITIALIZED", "EDITING", "AWAITING APPROVAL", "REJECTED", "OPEN", "ARCHIVED"] as const) {
      const poll = makePoll({ pollState: from });
      await polls(ctx).insertOne(poll);
      expect((await patch(poll._id, "OPEN")).status, from).toBe(409);
    }
  });

  it("T036 offers CLOSED only from WAITING TO OPEN and OPEN (FR-024)", async () => {
    for (const from of ["WAITING TO OPEN", "OPEN"] as const) {
      const poll = makePoll({ pollState: from });
      await polls(ctx).insertOne(poll);
      expect((await patch(poll._id, "CLOSED")).status, from).toBe(200);
    }
    for (const from of ["INITIALIZED", "EDITING", "AWAITING APPROVAL", "REJECTED", "CLOSED", "ARCHIVED"] as const) {
      const poll = makePoll({ pollState: from });
      await polls(ctx).insertOne(poll);
      expect((await patch(poll._id, "CLOSED")).status, from).toBe(409);
    }
  });

  it("T036 a refused transition leaves the poll completely unchanged (FR-029)", async () => {
    const startAt = new Date(Date.now() + HOUR);
    const endAt = new Date(Date.now() + 2 * HOUR);
    const poll = makePoll({ pollState: "ARCHIVED", startAt, endAt });
    await polls(ctx).insertOne(poll);
    expect((await patch(poll._id, "OPEN")).status).toBe(409);
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.pollState).toBe("ARCHIVED");
    expect(after?.startAt?.getTime()).toBe(startAt.getTime());
    expect(after?.endAt?.getTime()).toBe(endAt.getTime());
  });

  // ── T037: the schedule each transition writes ──────────────────────────────
  it("T037 OPEN clears startAt always, and endAt only when it is already past (FR-025)", async () => {
    const pastEnd = makePoll({
      pollState: "CLOSED",
      startAt: new Date(Date.now() - 2 * HOUR),
      endAt: new Date(Date.now() - HOUR)
    });
    await polls(ctx).insertOne(pastEnd);
    expect((await patch(pastEnd._id, "OPEN")).status).toBe(200);
    const a = await polls(ctx).findOne({ _id: pastEnd._id });
    expect(a?.pollState).toBe("OPEN");
    expect(a?.startAt).toBeNull();
    expect(a?.endAt).toBeNull(); // past end cleared, so the sweep cannot re-close it

    const futureEnd = new Date(Date.now() + 2 * HOUR);
    const scheduled = makePoll({
      pollState: "WAITING TO OPEN",
      startAt: new Date(Date.now() + HOUR),
      endAt: futureEnd
    });
    await polls(ctx).insertOne(scheduled);
    expect((await patch(scheduled._id, "OPEN")).status).toBe(200);
    const b = await polls(ctx).findOne({ _id: scheduled._id });
    expect(b?.startAt).toBeNull();
    expect(b?.endAt?.getTime()).toBe(futureEnd.getTime()); // a future end is kept
  });

  it("T037 CLOSED stamps endAt now, and clears startAt only when it is in the future (FR-026)", async () => {
    const pastStart = new Date(Date.now() - HOUR);
    const open = makePoll({ pollState: "OPEN", startAt: pastStart, endAt: null });
    await polls(ctx).insertOne(open);
    const before = Date.now();
    expect((await patch(open._id, "CLOSED")).status).toBe(200);
    const a = await polls(ctx).findOne({ _id: open._id });
    expect(a?.pollState).toBe("CLOSED");
    expect(a?.endAt!.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(a?.startAt?.getTime()).toBe(pastStart.getTime()); // a past start is kept

    const pending = makePoll({ pollState: "WAITING TO OPEN", startAt: new Date(Date.now() + HOUR) });
    await polls(ctx).insertOne(pending);
    expect((await patch(pending._id, "CLOSED")).status).toBe(200);
    const b = await polls(ctx).findOne({ _id: pending._id });
    expect(b?.startAt).toBeNull(); // a future start would leave it WAITING again
  });

  it("T037 ARCHIVED leaves the schedule exactly as it was (FR-027)", async () => {
    // The old blanket `endAt = now` rewrote a poll's real closing date on archive,
    // and the JSON and Markdown exports carried the wrong date forever after.
    const realClose = new Date(Date.now() - 30 * 24 * HOUR);
    const realStart = new Date(Date.now() - 60 * 24 * HOUR);
    const poll = makePoll({ pollState: "CLOSED", startAt: realStart, endAt: realClose });
    await polls(ctx).insertOne(poll);
    expect((await patch(poll._id, "ARCHIVED")).status).toBe(200);
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.pollState).toBe("ARCHIVED");
    expect(after?.endAt?.getTime()).toBe(realClose.getTime());
    expect(after?.startAt?.getTime()).toBe(realStart.getTime());
  });
});
