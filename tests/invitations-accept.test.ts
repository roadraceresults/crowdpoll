import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearPolls, forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import type { Poll } from "../src/polls/store.js";

const ADMIN = "admin-accept@example.com";
const INVITEE = "invitee-accept@example.com";
let ctx: TestContext;
let adminCookie = "";
let inviteeCookie = "";

beforeAll(async () => {
  ctx = await startTestContext({ ENV_ADMINS: ADMIN });
  adminCookie = (await forgeSession(ctx, ADMIN)).cookie;
  inviteeCookie = (await forgeSession(ctx, INVITEE)).cookie;
});

afterAll(async () => {
  await ctx.stop();
});

beforeEach(async () => {
  await clearPolls(ctx);
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
});

async function seed(overrides: Partial<Poll> = {}): Promise<Poll> {
  const poll = makePoll({
    _id: randomUUID(),
    pollState: "OPEN",
    pollVisibility: "Private Poll",
    pollSharingMode: "Invitation Only",
    invitedVoterList: [INVITEE],
    ...overrides
  });
  await polls(ctx).insertOne(poll);
  return poll;
}

const acceptedAt = async (pid: string, email = INVITEE) =>
  (await ctx.db
    .selectFrom("poll_invitations")
    .select("accepted_at")
    .where("poll_id", "=", pid)
    .where("email", "=", email)
    .executeTakeFirstOrThrow()).accepted_at;

const statusOf = async (pid: string) => {
  const res = await request(ctx.app).get(`/api/admin/polls/${pid}/invitees`).set("Cookie", adminCookie);
  return { status: res.body.invitees.find((i: { email: string }) => i.email === INVITEE).status, acceptedCount: res.body.acceptedCount };
};

describe("acceptance", () => {
  it("is written once when the invitee follows the poll link", async () => {
    const poll = await seed();
    const res = await request(ctx.app).get(`/?PID=${poll._id}`).set("Cookie", inviteeCookie);
    expect(res.status).toBe(302);
    const first = await acceptedAt(poll._id);
    expect(first).not.toBeNull();
    await request(ctx.app).get(`/?PID=${poll._id}`).set("Cookie", inviteeCookie);
    expect(new Date((await acceptedAt(poll._id))!).getTime()).toBe(new Date(first!).getTime());
    expect(await statusOf(poll._id)).toEqual({ status: "Accepted", acceptedCount: 1 });
  });

  it("is not written while the poll is not yet shown", async () => {
    const poll = await seed({ pollState: "AWAITING APPROVAL" });
    await request(ctx.app).get(`/?PID=${poll._id}`).set("Cookie", inviteeCookie);
    expect(await acceptedAt(poll._id)).toBeNull();
  });

  it("is written by the Shared With You tab for each invited poll it returns", async () => {
    const a = await seed();
    const b = await seed();
    const res = await request(ctx.app).post("/api/tabs/shared-with-you/refresh").set("Cookie", inviteeCookie).send({});
    expect(res.status).toBe(200);
    expect(await acceptedAt(a._id)).not.toBeNull();
    expect(await acceptedAt(b._id)).not.toBeNull();
  });

  it("is not written for a visitor who is not invited", async () => {
    const poll = await seed({ invitedVoterList: [INVITEE, "other@example.com"] });
    const stranger = await forgeSession(ctx, "stranger-accept@example.com");
    await request(ctx.app).get(`/?PID=${poll._id}`).set("Cookie", stranger.cookie);
    expect(await acceptedAt(poll._id)).toBeNull();
    expect(await acceptedAt(poll._id, "other@example.com")).toBeNull();
  });

  it("counts a vote as acceptance without writing accepted_at", async () => {
    const poll = await seed({
      currentVotes: [{ emailAddress: INVITEE, userName: "Inv", choiceIds: ["c1"], votedAt: new Date() }]
    });
    expect(await statusOf(poll._id)).toEqual({ status: "Voted", acceptedCount: 1 });
    expect(await acceptedAt(poll._id)).toBeNull();
  });
});

describe("admin list rows", () => {
  it("carry acceptedCount, 0 for a poll that is not Invitation Only", async () => {
    const invited = await seed({ invitedVoterList: [INVITEE, "b@example.com"] });
    await ctx.db.updateTable("poll_invitations").set({ accepted_at: new Date() }).where("email", "=", INVITEE).execute();
    await polls(ctx).insertOne(makePoll({ _id: randomUUID(), title: "Public" }));
    const res = await request(ctx.app).get("/api/admin/polls").set("Cookie", adminCookie);
    const rows = Object.fromEntries(res.body.polls.map((p: { pid: string; acceptedCount: number; title: string }) => [p.title === "Public" ? "public" : p.pid, p.acceptedCount]));
    expect(rows[invited._id]).toBe(1);
    expect(rows.public).toBe(0);
  });
});
