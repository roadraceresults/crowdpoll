import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearPolls, forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import type { Poll } from "../src/polls/store.js";
import { INVITE_KEY } from "../src/votes/rosterCache.js";

const ADMIN = "admin-adopt@example.com";
const INVITED = "j.doe@gmail.com";
let ctx: TestContext;
let adminCookie = "";
let accounts = 0;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_ADMINS: ADMIN });
  adminCookie = (await forgeSession(ctx, ADMIN)).cookie;
});

afterAll(async () => {
  await ctx.stop();
});

beforeEach(async () => {
  await clearPolls(ctx);
  await ctx.db.deleteFrom("session").where("userId", "in", ctx.db.selectFrom("user").select("id").where("email", "like", "%@gmail.com")).execute();
  await ctx.db.deleteFrom("user").where("email", "like", "%@gmail.com").execute();
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
  accounts += 1;
});

async function seed(overrides: Partial<Poll> = {}): Promise<Poll> {
  const poll = makePoll({
    _id: randomUUID(),
    pollState: "OPEN",
    pollVisibility: "Private Poll",
    pollSharingMode: "Invitation Only",
    invitedVoterList: [INVITED],
    ...overrides
  });
  await polls(ctx).insertOne(poll);
  // The placeholder vote an add writes (A2); a seeded roster has none of its own.
  await ctx.db
    .insertInto("votes")
    .values({ poll_id: poll._id, email: INVITED, user_name: "", choice_ids: [], voted_at: null })
    .onConflict((oc) => oc.columns(["poll_id", "email"]).doNothing())
    .execute();
  return poll;
}

async function where(pid: string) {
  const invitation = await ctx.db.selectFrom("poll_invitations").select("email").where("poll_id", "=", pid).execute();
  const invited = await ctx.db.selectFrom("user_polls").select("email").where("poll_id", "=", pid).where("relation", "=", "invited").execute();
  const votes = await ctx.db.selectFrom("votes").select("email").where("poll_id", "=", pid).execute();
  return { invitation: invitation.map((r) => r.email), invited: invited.map((r) => r.email), votes: votes.map((r) => r.email) };
}

const adopted = { invitation: ["jdoe@gmail.com"], invited: ["jdoe@gmail.com"], votes: ["jdoe@gmail.com"] };

describe("adoption by email key", () => {
  it("happens at sign-in, and invalidates the roster cache", async () => {
    const poll = await seed();
    await ctx.cache.set(INVITE_KEY(poll._id), "stale");
    await forgeSession(ctx, "jdoe@gmail.com");
    expect(await where(poll._id)).toEqual(adopted);
    expect(await ctx.cache.get(INVITE_KEY(poll._id))).toBeNull();
  });

  it("happens at the poll link, before the invitation check", async () => {
    const poll = await seed();
    const { cookie } = await forgeSession(ctx, "jdoe@gmail.com");
    await ctx.db.updateTable("poll_invitations").set({ email: INVITED }).execute();
    await ctx.db.updateTable("user_polls").set({ email: INVITED }).where("relation", "=", "invited").execute();
    await ctx.db.updateTable("votes").set({ email: INVITED }).execute();
    const res = await request(ctx.app).get(`/?PID=${poll._id}`).set("Cookie", cookie);
    expect(res.headers.location).toBe(`/?open=${poll._id}&tab=shared-with-you`);
    expect(await where(poll._id)).toEqual(adopted);
  });

  it("happens at the Shared With You tab, and the poll is listed", async () => {
    const poll = await seed();
    const { cookie } = await forgeSession(ctx, "jdoe@gmail.com");
    await ctx.db.updateTable("poll_invitations").set({ email: INVITED }).execute();
    await ctx.db.updateTable("user_polls").set({ email: INVITED }).where("relation", "=", "invited").execute();
    const res = await request(ctx.app).post("/api/tabs/shared-with-you/refresh").set("Cookie", cookie).send({});
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).toContain(poll._id);
    expect((await where(poll._id)).invitation).toEqual(["jdoe@gmail.com"]);
  });

  it("lets the account vote, and its status becomes Accepted then Voted", async () => {
    const poll = await seed();
    const { cookie } = await forgeSession(ctx, "jdoe@gmail.com");
    await request(ctx.app).get(`/?PID=${poll._id}`).set("Cookie", cookie);
    const status = async () =>
      (await request(ctx.app).get(`/api/admin/polls/${poll._id}/invitees`).set("Cookie", adminCookie)).body.invitees[0];
    expect(await status()).toEqual(expect.objectContaining({ email: "jdoe@gmail.com", status: "Accepted" }));
    const vote = await request(ctx.app).post(`/api/polls/${poll._id}/vote`).set("Cookie", cookie).send({ choiceIds: ["c1"] });
    expect(vote.status).toBe(200);
    await ctx.db.updateTable("votes").set({ choice_ids: ["c1"], voted_at: new Date() }).where("email", "=", "jdoe@gmail.com").execute();
    expect((await status()).status).toBe("Voted");
  });

  it("keeps the account's own invitation when both spellings are listed", async () => {
    const poll = await seed({ invitedVoterList: [INVITED, "jdoe@gmail.com"] });
    await forgeSession(ctx, "jdoe@gmail.com");
    expect((await where(poll._id)).invitation).toEqual(["jdoe@gmail.com"]);
  });

  it("changes nothing for an account whose key matches nothing", async () => {
    const poll = await seed();
    await forgeSession(ctx, `someone${accounts}@gmail.com`);
    expect(await where(poll._id)).toEqual({ invitation: [INVITED], invited: [INVITED], votes: [INVITED] });
  });

  it("sends a signed-out visitor to sign in with the poll", async () => {
    const poll = await seed();
    const res = await request(ctx.app).get(`/?PID=${poll._id}`);
    expect(res.headers.location).toBe(`/login?PID=${poll._id}`);
  });

  it("still refuses a person who is not invited", async () => {
    const poll = await seed();
    const { cookie } = await forgeSession(ctx, `outsider${accounts}@gmail.com`);
    const vote = await request(ctx.app).post(`/api/polls/${poll._id}/vote`).set("Cookie", cookie).send({ choiceIds: ["c1"] });
    expect(vote.status).not.toBe(200);
  });
});
