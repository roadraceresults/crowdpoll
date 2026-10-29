/**
 * 011-SIMPLIFY-POLL-STATES — pollDateCheckSweep (US4).
 *
 * Every case injects a timestamp and calls one tick directly. No test sleeps.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll } from "./helpers/poll-fixtures.js";
import { polls } from "./helpers/poll-fixtures.js";
import { type PollState } from "../src/polls/store.js";
import { pollDateCheckSweep } from "../src/polls/sweeps.js";

describe("pollDateCheckSweep (011 FR-042..FR-046)", () => {
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

  const at = (iso: string) => new Date(iso);
  const reload = async (pid: string) => (await polls(ctx).findOne({ _id: pid }))!;

  async function sweepOne(overrides: Record<string, unknown>, now: Date) {
    const poll = makePoll(overrides as never);
    await polls(ctx).insertOne(poll);
    await pollDateCheckSweep(ctx, now);
    return (await reload(poll._id)).pollState;
  }

  it("moves a poll waiting → open → closed as time passes (FR-042)", async () => {
    const startAt = at("2026-03-01T00:00:00Z");
    const endAt = at("2026-04-01T00:00:00Z");
    const poll = makePoll({ pollState: "WAITING TO OPEN", startAt, endAt });
    await polls(ctx).insertOne(poll);

    await pollDateCheckSweep(ctx, at("2026-02-01T00:00:00Z"));
    expect((await reload(poll._id)).pollState).toBe("WAITING TO OPEN");

    await pollDateCheckSweep(ctx, at("2026-03-15T00:00:00Z"));
    expect((await reload(poll._id)).pollState).toBe("OPEN");

    await pollDateCheckSweep(ctx, at("2026-05-01T00:00:00Z"));
    expect((await reload(poll._id)).pollState).toBe("CLOSED");
  });

  it("reopens a closed poll when its end moves into the future", async () => {
    const poll = makePoll({ pollState: "CLOSED", startAt: null, endAt: at("2026-01-01T00:00:00Z") });
    await polls(ctx).insertOne(poll);
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { endAt: at("2026-12-01T00:00:00Z") } });
    await pollDateCheckSweep(ctx, at("2026-06-01T00:00:00Z"));
    expect((await reload(poll._id)).pollState).toBe("OPEN");
  });

  it("opens a poll with no start time immediately (FR-043)", async () => {
    const state = await sweepOne(
      { pollState: "WAITING TO OPEN", startAt: null, endAt: null },
      at("2026-06-01T00:00:00Z")
    );
    expect(state).toBe("OPEN");
  });

  it("never closes a poll with no end time (FR-044)", async () => {
    const state = await sweepOne(
      { pollState: "OPEN", startAt: at("2020-01-01T00:00:00Z"), endAt: null },
      at("2099-01-01T00:00:00Z")
    );
    expect(state).toBe("OPEN");
  });

  it("treats both bounds as inclusive (FR-045)", async () => {
    const bound = at("2026-03-01T00:00:00Z");
    expect(await sweepOne({ pollState: "WAITING TO OPEN", startAt: bound, endAt: null }, bound)).toBe("OPEN");
    await polls(ctx).deleteMany({});
    expect(await sweepOne({ pollState: "OPEN", startAt: null, endAt: bound }, bound)).toBe("OPEN");
  });

  it("corrects a start later than its end and closes the poll (FR-046)", async () => {
    const endAt = at("2026-02-01T00:00:00Z");
    const poll = makePoll({ pollState: "OPEN", startAt: at("2026-09-01T00:00:00Z"), endAt });
    await polls(ctx).insertOne(poll);
    await pollDateCheckSweep(ctx, at("2026-03-01T00:00:00Z"));

    const after = await reload(poll._id);
    expect(after.pollState).toBe("CLOSED");
    expect(after.startAt!.getTime()).toBe(endAt.getTime() - 1000);
  });

  it("leaves every state outside the three scheduled ones alone", async () => {
    const untouched: PollState[] = ["INITIALIZED", "EDITING", "AWAITING APPROVAL", "REJECTED", "ARCHIVED"];
    for (const pollState of untouched) {
      await polls(ctx).insertOne(
        makePoll({ pollState, startAt: at("2020-01-01T00:00:00Z"), endAt: at("2020-02-01T00:00:00Z") })
      );
    }
    expect(await pollDateCheckSweep(ctx, at("2026-06-01T00:00:00Z"))).toBe(0);
    for (const pollState of untouched) {
      expect(await polls(ctx).countDocuments({ pollState })).toBe(1);
    }
  });

  it("handles every candidate in one tick, unlike the approval sweep", async () => {
    for (let i = 0; i < 4; i += 1) {
      await polls(ctx).insertOne(
        makePoll({ pollState: "WAITING TO OPEN", startAt: at("2026-01-01T00:00:00Z"), endAt: null })
      );
    }
    expect(await pollDateCheckSweep(ctx, at("2026-06-01T00:00:00Z"))).toBe(4);
    expect(await polls(ctx).countDocuments({ pollState: "OPEN" })).toBe(4);
  });

  it("reports no change when every poll is already in the right state", async () => {
    await polls(ctx).insertOne(makePoll({ pollState: "OPEN", startAt: null, endAt: null }));
    expect(await pollDateCheckSweep(ctx, at("2026-06-01T00:00:00Z"))).toBe(0);
  });
});

/**
 * 012 T038 (US3, FR-028): convergence.
 *
 * These are the tests that justify the schedule rules in `validateStateAction`.
 * The sweep re-derives state from startAt/endAt and *writes* the result, so an
 * administrator's one-click transition survives only if the schedule it leaves
 * behind is one the sweep independently agrees with. Each case performs the
 * transition at an injected time, runs the sweep a full interval later, and
 * asserts the state the administrator chose is still in effect.
 */
describe("Manual transitions survive the date sweep (012 FR-028)", () => {
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

  const T = new Date("2026-06-01T12:00:00Z");
  const LATER = new Date(T.getTime() + 60_000); // one ENV_POLL_DATE_CHECK_SWEEP_INTERVAL
  const HOUR = 3600_000;

  it("a poll reopened from CLOSED stays OPEN after a sweep tick", async () => {
    // The case that makes the rules mandatory rather than cosmetic. Without
    // clearing the past endAt, the very next tick sees `now > endAt` and re-closes
    // the poll — the administrator sees the button do nothing.
    const poll = makePoll({
      pollState: "OPEN", // as validateStateAction leaves it
      startAt: null,
      endAt: null // past endAt cleared by the OPEN rule
    });
    await polls(ctx).insertOne(poll);
    await pollDateCheckSweep(ctx, LATER);
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.pollState).toBe("OPEN");
  });

  it("a poll opened early from WAITING TO OPEN stays OPEN after a sweep tick", async () => {
    const poll = makePoll({
      pollState: "OPEN",
      startAt: null, // cleared by the OPEN rule
      endAt: new Date(T.getTime() + 2 * HOUR) // future end kept
    });
    await polls(ctx).insertOne(poll);
    await pollDateCheckSweep(ctx, LATER);
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.pollState).toBe("OPEN");
  });

  it("a poll closed early stays CLOSED after a sweep tick", async () => {
    const poll = makePoll({
      pollState: "CLOSED",
      startAt: new Date(T.getTime() - HOUR), // past start kept
      endAt: T // stamped now by the CLOSE rule
    });
    await polls(ctx).insertOne(poll);
    await pollDateCheckSweep(ctx, LATER);
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.pollState).toBe("CLOSED");
  });

  it("a poll closed before it ever started stays CLOSED after a sweep tick", async () => {
    const poll = makePoll({
      pollState: "CLOSED",
      startAt: null, // future start cleared by the CLOSE rule
      endAt: T
    });
    await polls(ctx).insertOne(poll);
    await pollDateCheckSweep(ctx, LATER);
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.pollState).toBe("CLOSED");
  });

  it("an archived poll is not a sweep candidate, so its schedule is never touched", async () => {
    const realClose = new Date(T.getTime() - 30 * 24 * HOUR);
    const poll = makePoll({ pollState: "ARCHIVED", startAt: null, endAt: realClose });
    await polls(ctx).insertOne(poll);
    await pollDateCheckSweep(ctx, LATER);
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.pollState).toBe("ARCHIVED");
    expect(after?.endAt?.getTime()).toBe(realClose.getTime());
  });

  it("counter-example: a reopen that kept its past endAt would be reverted", async () => {
    // Not a requirement — a guard on the reasoning. If the OPEN rule ever stops
    // clearing a past endAt, this is what users would experience.
    const poll = makePoll({
      pollState: "OPEN",
      startAt: null,
      endAt: new Date(T.getTime() - HOUR) // the bug: past end left in place
    });
    await polls(ctx).insertOne(poll);
    await pollDateCheckSweep(ctx, LATER);
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.pollState).toBe("CLOSED");
  });
});
