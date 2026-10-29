import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { recordVote, updatePoll } from "../src/polls/store.js";
import { addBookmark } from "../src/polls/bookmarks.js";
import { upsertRelation } from "../src/polls/userPolls.js";

const ADMIN = "tabs-admin@example.com";
let ctx: TestContext;
let me: { cookie: string; userId: string };
let other: { cookie: string; userId: string };
let admin: { cookie: string; userId: string };
const meEmail = "your-polls@example.com";

beforeAll(async () => {
  ctx = await startTestContext({ ENV_ADMINS: ADMIN, ENV_MAX_POLLS_SEARCH_RESULTS: "3", ENV_MAX_NEWEST_POLLS: "3", ENV_MIN_MANUAL_REFRESH_INTERVAL: "1", ENV_MIN_SEARCH_INTERVAL: "1" });
  me = await forgeSession(ctx, meEmail);
  other = await forgeSession(ctx, "your-polls-other@example.com");
  admin = await forgeSession(ctx, ADMIN);
});
afterAll(async () => {
  await ctx.stop();
});
beforeEach(async () => {
  await polls(ctx).deleteMany({});
});

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000);

async function created(who: { userId: string }, email: string, overrides: Parameters<typeof makePoll>[0] = {}, ageMinutes = 0) {
  const poll = makePoll({ _id: randomUUID(), createdAt: minutesAgo(ageMinutes), ...overrides });
  await polls(ctx).insertOne(poll);
  await ctx.db.updateTable("polls").set({ created_by_id: who.userId, created_by_name: "Creator" }).where("id", "=", poll._id).execute();
  await upsertRelation(ctx.db, email, poll._id, "created", minutesAgo(ageMinutes));
  return poll;
}

const tab = async (name: string, who = me) => {
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
  return request(ctx.app).post(`/api/tabs/${name}/refresh`).set("Cookie", who.cookie).send({});
};

describe("Your Polls", () => {
  it("lists the user's private and public polls, newest created first, up to the cap", async () => {
    const [a, b, c, d] = [
      await created(me, meEmail, { title: "A" }, 40),
      await created(me, meEmail, { title: "B", pollVisibility: "Private Poll" }, 30),
      await created(me, meEmail, { title: "C" }, 20),
      await created(me, meEmail, { title: "D", pollVisibility: "Private Poll" }, 10)
    ];
    const res = await tab("your-polls");
    expect(res.body.order).toEqual([d._id, c._id, b._id]);
    expect(res.body.order).not.toContain(a._id);
  });

  it("leaves out polls the user only voted in, watched, was invited to or opened by link", async () => {
    const voted = makePoll({ _id: randomUUID() });
    const watched = makePoll({ _id: randomUUID() });
    const invited = makePoll({ _id: randomUUID(), pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: [meEmail] });
    const linked = makePoll({ _id: randomUUID(), pollVisibility: "Private Poll" });
    await polls(ctx).insertMany([voted, watched, invited, linked]);
    await recordVote(ctx, voted._id, { emailAddress: meEmail, userName: "", choiceIds: ["c1"], votedAt: new Date() });
    await addBookmark(ctx, meEmail, watched._id, 200);
    await upsertRelation(ctx.db, meEmail, linked._id, "linked");
    expect((await tab("your-polls")).status).toBe(304);
  });

  it("lists only the polls an administrator created themselves, and never another user's", async () => {
    const mine = await created(admin, ADMIN, { title: "Admin's own" });
    await created(me, meEmail, { title: "Someone else's" });
    expect((await tab("your-polls", admin)).body.order).toEqual([mine._id]);
  });

  it("lists the creator's unlaunched polls with their states, to the creator only", async () => {
    const draft = await created(me, meEmail, { title: "Draft title", pollState: "INITIALIZED" }, 3);
    const waiting = await created(me, meEmail, { title: "Waiting title", pollState: "AWAITING APPROVAL" }, 2);
    const rejected = await created(me, meEmail, { title: "Rejected title", pollState: "REJECTED", pollRejectionReason: "Not acceptable" }, 1);
    const res = await tab("your-polls");
    expect(res.body.order).toEqual([rejected._id, waiting._id, draft._id]);
    expect(res.body.cards[draft._id].title).toBe("Draft title");
    expect(res.body.cards[rejected._id].rejectionReason).toBe("Not acceptable");
    expect(res.body.cards[draft._id].rejectionReason).toBeUndefined();

    const search = await request(ctx.app).post("/api/search").set("Cookie", other.cookie).send({ q: "title" });
    expect(JSON.stringify(search.body)).not.toMatch(/Draft title|Waiting title|Rejected title/);
    for (const name of ["your-polls", "shared-with-you", "your-votes", "watching"]) {
      expect(JSON.stringify((await tab(name, other)).body)).not.toMatch(/Draft title|Waiting title|Rejected title|Not acceptable/);
    }
  });

  it("keeps a poll listed when its visibility, sharing mode or state changes, and drops it only when deleted", async () => {
    const poll = await created(me, meEmail, { title: "Changing" });
    await updatePoll(ctx, poll._id, { pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" });
    expect((await tab("your-polls")).body.order).toEqual([poll._id]);
    await updatePoll(ctx, poll._id, { pollState: "ARCHIVED" });
    expect((await tab("your-polls")).body.order).toEqual([poll._id]);
    await ctx.db.deleteFrom("polls").where("id", "=", poll._id).execute();
    expect((await tab("your-polls")).status).toBe(304);
  });
});
