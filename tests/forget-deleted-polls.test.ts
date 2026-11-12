import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { POLL_PROJECTION_KEY } from "../src/polls/versions.js";
import { forgetDeletedPolls } from "../devScripts/forget-deleted-polls.js";

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

describe("forgetDeletedPolls", () => {
  it("forgets only the projection of a poll deleted in SQL", async () => {
    const kept = makePoll();
    const deleted = makePoll();
    await polls(ctx).insertMany([kept, deleted]);
    await ctx.db.deleteFrom("polls").where("id", "=", deleted._id).execute();
    expect(await ctx.cache.get(POLL_PROJECTION_KEY(deleted._id))).not.toBeNull();

    expect(await forgetDeletedPolls(ctx.db, ctx.cache)).toEqual([deleted._id]);

    expect(await ctx.cache.get(POLL_PROJECTION_KEY(deleted._id))).toBeNull();
    expect(await ctx.cache.get(POLL_PROJECTION_KEY(kept._id))).not.toBeNull();
    expect(await ctx.db.selectFrom("polls").select("id").execute()).toEqual([{ id: kept._id }]);
  });

  it("forgets nothing when every cached poll exists", async () => {
    await polls(ctx).insertOne(makePoll());
    expect(await forgetDeletedPolls(ctx.db, ctx.cache)).toEqual([]);
  });
});
