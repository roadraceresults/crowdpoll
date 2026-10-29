import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { recordVote, updatePoll } from "../src/polls/store.js";
import { addBookmark } from "../src/polls/bookmarks.js";
import { upsertRelation } from "../src/polls/userPolls.js";

let ctx: TestContext;
let cookie: string;
const me = "votes-reader@example.com";

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MAX_POLLS_SEARCH_RESULTS: "5", ENV_MAX_NEWEST_POLLS: "5", ENV_MIN_MANUAL_REFRESH_INTERVAL: "1" });
  cookie = (await forgeSession(ctx, me)).cookie;
});
afterAll(async () => {
  await ctx.stop();
});
beforeEach(async () => {
  await polls(ctx).deleteMany({});
});

const tab = async (name: string) => {
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
  return request(ctx.app).post(`/api/tabs/${name}/refresh`).set("Cookie", cookie).send({});
};
const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000);
const seed = async (overrides: Parameters<typeof makePoll>[0] = {}) => {
  const poll = makePoll({ _id: randomUUID(), ...overrides });
  await polls(ctx).insertOne(poll);
  return poll;
};
const vote = (pid: string, ageMinutes = 0) => recordVote(ctx, pid, { emailAddress: me, userName: "", choiceIds: ["c1"], votedAt: minutesAgo(ageMinutes) });
const invitationOnly = (overrides: Parameters<typeof makePoll>[0] = {}) =>
  seed({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: [me], ...overrides });

describe("Your Votes", () => {
  it("lists every poll the user voted in, public and private, newest vote first", async () => {
    const [older, newer, other] = [await seed(), await invitationOnly(), await seed()];
    await vote(older._id, 20);
    await vote(newer._id, 5);
    expect((await tab("your-votes")).body.order).toEqual([newer._id, older._id]);
    expect((await tab("your-votes")).body.order).not.toContain(other._id);
  });

  it("hides a private poll the user can no longer reach, and brings it back with access", async () => {
    const poll = await invitationOnly();
    await vote(poll._id);
    expect((await tab("your-votes")).body.order).toEqual([poll._id]);
    await updatePoll(ctx, poll._id, { invitedVoterList: ["someone@example.com"] });
    expect((await tab("your-votes")).status).toBe(200);
    expect((await tab("your-votes")).body.order ?? []).toEqual([]);
    await updatePoll(ctx, poll._id, { invitedVoterList: [me] });
    expect((await tab("your-votes")).body.order).toEqual([poll._id]);
  });

  it("keeps a banned user's poll, with the ban message and no Watch", async () => {
    const poll = await invitationOnly({ bannedVoterList: [me] });
    await upsertRelation(ctx.db, me, poll._id, "voted");
    const res = await tab("your-votes");
    expect(res.body.order).toEqual([poll._id]);
    expect(res.body.cards[poll._id].overlay.voteBlockedReason).toMatch(/removed from this poll/);
    expect(res.body.cards[poll._id].overlay.mayWatch).toBe(false);
  });
});

describe("Watching", () => {
  it("lists only deliberate watches, never a poll the user only voted in", async () => {
    const [watched, voted] = [await seed(), await seed()];
    await vote(voted._id);
    await addBookmark(ctx, me, watched._id, 200);
    expect((await tab("watching")).body.order).toEqual([watched._id]);
  });

  it("drops a watched private poll the user can no longer reach, sends no card for it, and brings it back on re-invitation", async () => {
    const poll = await invitationOnly({ title: "Private watch" });
    await addBookmark(ctx, me, poll._id, 200);
    expect((await tab("watching")).body.order).toEqual([poll._id]);

    await updatePoll(ctx, poll._id, { invitedVoterList: ["someone@example.com"] });
    const hidden = await tab("watching");
    expect(JSON.stringify(hidden.body)).not.toContain("Private watch");
    expect(await ctx.db.selectFrom("bookmarks").select("poll_id").where("email", "=", me).execute()).toHaveLength(1);

    await updatePoll(ctx, poll._id, { invitedVoterList: [me] });
    expect((await tab("watching")).body.order).toEqual([poll._id]);
  });

  it("drops a watched poll when the user is banned from it", async () => {
    const poll = await seed();
    await addBookmark(ctx, me, poll._id, 200);
    await updatePoll(ctx, poll._id, { bannedVoterList: [me] });
    expect((await tab("watching")).body.order ?? []).toEqual([]);
  });

  it("counts private watches toward the limit", async () => {
    const capped = await startTestContext({ ENV_MAX_BOOKMARKS_PER_USER: "1", ENV_MIN_MANUAL_REFRESH_INTERVAL: "1" });
    try {
      const user = await forgeSession(capped, "cap-private@example.com");
      const first = makePoll({ _id: randomUUID(), pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: ["cap-private@example.com"] });
      const second = makePoll({ _id: randomUUID() });
      await polls(capped).insertMany([first, second]);
      const post = (pid: string) => request(capped.app).post(`/api/polls/${pid}/bookmark`).set("Cookie", user.cookie).send();
      expect((await post(first._id)).status).toBe(200);
      expect((await post(second._id)).status).toBe(409);
    } finally {
      await capped.stop();
    }
  });
});
