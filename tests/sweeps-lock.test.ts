import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { createDb } from "../src/db/client.js";
import { countVote } from "../src/polls/counters.js";
import { SWEEP_LOCKS, counterFlushSweep, guardTick, withAdvisoryLock, type SweepDeps } from "../src/polls/sweeps.js";

let ctx: TestContext;
let second: SweepDeps;

beforeAll(async () => {
  ctx = await startTestContext();
  second = { db: createDb(ctx.config.databaseUrl, { max: 4 }), cache: ctx.cache, config: ctx.config };
});

afterAll(async () => {
  await second.db.destroy();
  await ctx.stop();
});

describe("sweeps under advisory locks", () => {
  it("two instances firing the same tick at once run it exactly once, the loser logging the skip", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    await countVote(ctx.cache, poll._id, ["c1"], [], true);

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const ran: string[] = [];
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tick = (name: string) => async (deps: SweepDeps) => {
      ran.push(name);
      await gate;
      return counterFlushSweep(deps);
    };
    const guardedA = guardTick("counterFlushSweep", SWEEP_LOCKS.counterFlush, tick("A"));
    const guardedB = guardTick("counterFlushSweep", SWEEP_LOCKS.counterFlush, tick("B"));

    const a = guardedA(ctx);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const b = guardedB(second);
    await new Promise((resolve) => setTimeout(resolve, 50));
    release();
    await Promise.all([a, b]);

    expect(ran).toHaveLength(1);
    const skipped = log.mock.calls.map((c) => String(c[0])).filter((line) => line.includes("another instance holds lock 3"));
    expect(skipped).toHaveLength(1);
    log.mockRestore();

    const row = await ctx.db.selectFrom("polls").select("vote_count").where("id", "=", poll._id).executeTakeFirstOrThrow();
    expect(row.vote_count).toBe(1);
  });

  it("withAdvisoryLock returns null at once while the lock is held elsewhere and works again after", async () => {
    let releaseHeld: () => void = () => {};
    const heldUntil = new Promise<void>((resolve) => {
      releaseHeld = resolve;
    });
    const holder = withAdvisoryLock(ctx.db, SWEEP_LOCKS.trending, async () => {
      await heldUntil;
      return "held";
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(await withAdvisoryLock(second.db, SWEEP_LOCKS.trending, async () => "second")).toBeNull();
    releaseHeld();
    expect(await holder).toBe("held");
    expect(await withAdvisoryLock(second.db, SWEEP_LOCKS.trending, async () => "second")).toBe("second");
  });
});

describe("the vote consumer is not a sweep", () => {
  it("two instances' consumers each take their own share of one stream", async () => {
    const { createConsumer } = await import("../src/votes/consumer.js");
    const { castVote } = await import("../src/votes/votePath.js");
    const { VOTE_GROUP, VOTE_STREAM } = await import("../src/votes/queue.js");
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    for (const who of ["a", "b", "c", "d"]) {
      await castVote(ctx, { sessionId: `s-${who}`, email: `${who}@example.com`, userName: who, ip: `10.7.0.${who.charCodeAt(0)}`, pid: poll._id, choiceIds: ["c1"] });
    }
    const one = createConsumer({ db: ctx.db, cache: ctx.cache, config: { ...ctx.config, voteBatchSize: 2 }, consumerName: "one" });
    const two = createConsumer({ db: second.db, cache: ctx.cache, config: { ...ctx.config, voteBatchSize: 2 }, consumerName: "two" });
    const [a, b] = await Promise.all([one.runOnce(), two.runOnce()]);
    expect(a + b).toBe(4);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(0);
    expect(await ctx.cache.xpendingCount(VOTE_STREAM, VOTE_GROUP)).toBe(0);
    expect(await ctx.db.selectFrom("votes").selectAll().where("poll_id", "=", poll._id).execute()).toHaveLength(4);
  });
});

describe("a failed sweep tick", () => {
  it("logs a missed cache deadline as a one-line warning, and anything else as an error with its stack", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await guardTick("budgetController", SWEEP_LOCKS.controller, async () => {
      throw new Error("Command timed out");
    })(ctx);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toBe(
      "[sweeps] budgetController: the cache did not answer in time; retrying next tick"
    );
    expect(error).not.toHaveBeenCalled();

    const boom = new Error("boom");
    await guardTick("budgetController", SWEEP_LOCKS.controller, async () => {
      throw boom;
    })(ctx);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]![1]).toBe(boom);

    warn.mockRestore();
    error.mockRestore();
  });
});
