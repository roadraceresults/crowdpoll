import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { mayWatch } from "../src/polls/access.js";
import { recordVote } from "../src/polls/store.js";
import { upsertRelation } from "../src/polls/userPolls.js";

let ctx: TestContext;
let me: { cookie: string; userId: string };
const meEmail = "may-watch@example.com";
const caller = () => ({ id: me.userId, email: meEmail, permissions: ["View Polls", "Vote on Polls", "Create Poll"] });

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MAX_BOOKMARKS_PER_USER: "2", ENV_MIN_MANUAL_REFRESH_INTERVAL: "1" });
  me = await forgeSession(ctx, meEmail);
});
afterAll(async () => {
  await ctx.stop();
});
beforeEach(async () => {
  await polls(ctx).deleteMany({});
});

const watch = (pid: string, cookie = me.cookie) => request(ctx.app).post(`/api/polls/${pid}/bookmark`).set("Cookie", cookie).send();
const unwatch = (pid: string, cookie = me.cookie) => request(ctx.app).delete(`/api/polls/${pid}/bookmark`).set("Cookie", cookie).send();
const seed = async (overrides: Parameters<typeof makePoll>[0] = {}) => {
  const poll = makePoll({ _id: randomUUID(), ...overrides });
  await polls(ctx).insertOne(poll);
  return poll;
};
const privateLink = (overrides: Parameters<typeof makePoll>[0] = {}) => seed({ pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link", ...overrides });
const privateInvited = (overrides: Parameters<typeof makePoll>[0] = {}) =>
  seed({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", ...overrides });

describe("mayWatch", () => {
  it("allows a published public poll", async () => {
    const poll = await seed();
    expect(await mayWatch({ db: ctx.db, config: ctx.config }, caller(), poll._id)).toBe(true);
    expect((await watch(poll._id)).status).toBe(200);
  });

  it("allows an Invitation Only poll the user is invited to, or created", async () => {
    const invited = await privateInvited({ invitedVoterList: [meEmail] });
    const own = await privateInvited();
    await ctx.db.updateTable("polls").set({ created_by_id: me.userId }).where("id", "=", own._id).execute();
    expect((await watch(invited._id)).status).toBe(200);
    expect((await watch(own._id)).status).toBe(200);
  });

  it("allows an Anyone With The Link poll the user created, viewed, voted in or was invited to", async () => {
    const viewed = await privateLink();
    await upsertRelation(ctx.db, meEmail, viewed._id, "linked");
    expect(await mayWatch({ db: ctx.db, config: ctx.config }, caller(), viewed._id)).toBe(true);
    const voted = await privateLink();
    await recordVote(ctx, voted._id, { emailAddress: meEmail, userName: "", choiceIds: ["c1"], votedAt: new Date() });
    expect(await mayWatch({ db: ctx.db, config: ctx.config }, caller(), voted._id)).toBe(true);
    const invited = await privateLink();
    await upsertRelation(ctx.db, meEmail, invited._id, "invited");
    expect(await mayWatch({ db: ctx.db, config: ctx.config }, caller(), invited._id)).toBe(true);
    const own = await privateLink();
    await ctx.db.updateTable("polls").set({ created_by_id: me.userId }).where("id", "=", own._id).execute();
    expect(await mayWatch({ db: ctx.db, config: ctx.config }, caller(), own._id)).toBe(true);
  });

  it("refuses with 404, as for an unknown poll, an uninvited Invitation Only poll, an unreached link poll, a banned user and an unpublished poll", async () => {
    const uninvited = await privateInvited({ invitedVoterList: ["x@example.com"] });
    const unreached = await privateLink();
    const banned = await seed({ bannedVoterList: [meEmail] });
    const draft = await seed({ pollState: "INITIALIZED" });
    const archived = await seed({ pollState: "ARCHIVED" });
    const unknown = randomUUID();
    for (const pid of [uninvited._id, unreached._id, banned._id, draft._id, archived._id, unknown]) {
      const res = await watch(pid);
      expect(res.status, pid).toBe(404);
      expect(res.body, pid).toEqual({ error: "Not found" });
    }
    expect(await ctx.db.selectFrom("bookmarks").selectAll().execute()).toEqual([]);
  });

  it("refuses a user without the View Polls grant", async () => {
    const poll = await seed();
    expect(await mayWatch({ db: ctx.db, config: ctx.config }, { ...caller(), permissions: ["Vote on Polls"] }, poll._id)).toBe(false);
  });

  it("answers the cap with 409 and always lets the user stop watching", async () => {
    const [a, b, c] = [await seed(), await seed(), await seed()];
    expect((await watch(a._id)).status).toBe(200);
    expect((await watch(b._id)).status).toBe(200);
    const capped = await watch(c._id);
    expect(capped.status).toBe(409);
    expect(capped.body).toMatchObject({ error: "bookmark-cap", limit: 2 });
    const hidden = await privateInvited({ invitedVoterList: [meEmail] });
    await ctx.db.insertInto("bookmarks").values({ email: meEmail, poll_id: hidden._id }).execute();
    await ctx.db.updateTable("polls").set({ poll_state: "INITIALIZED" }).where("id", "=", hidden._id).execute();
    expect((await unwatch(hidden._id)).status).toBe(200);
    expect((await unwatch(a._id)).status).toBe(200);
  });

  it("reports mayWatch for each poll in the overlay call", async () => {
    const open = await seed();
    const unreached = await privateLink();
    const res = await request(ctx.app).get(`/api/me/polls?pids=${open._id},${unreached._id}`).set("Cookie", me.cookie);
    expect(res.body.overlay[open._id].mayWatch).toBe(true);
    expect(res.body.overlay[unreached._id].mayWatch).toBe(false);
  });
});
