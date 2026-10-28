import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearPolls, forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls, voteHistory } from "./helpers/poll-fixtures.js";
import type { Poll } from "../src/polls/store.js";
import { sendPendingInvitations } from "../src/invitations/sender.js";

const ADMIN = "admin-zone@example.com";
let ctx: TestContext;
let cookie = "";

beforeAll(async () => {
  ctx = await startTestContext({ ENV_ADMINS: ADMIN });
  cookie = (await forgeSession(ctx, ADMIN)).cookie;
});

afterAll(async () => {
  await ctx.stop();
});

beforeEach(async () => {
  await clearPolls(ctx);
  ctx.sent.length = 0;
});

const NY = "America/New_York";

async function seed(overrides: Partial<Poll> = {}): Promise<Poll> {
  const poll = makePoll({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", ...overrides });
  await polls(ctx).insertOne(poll);
  return poll;
}

async function stored(pid: string) {
  return ctx.db
    .selectFrom("polls")
    .select(["time_zone", "content_version", "poll_state", "poll_approval_timestamp", "poll_acceptability_screening_attempts"])
    .where("id", "=", pid)
    .executeTakeFirstOrThrow();
}

const editSession = (pid: string) =>
  request(ctx.app).post(`/api/admin/polls/${pid}/edit-session`).set("Cookie", cookie).send({ clientGuid: "tab-1" });

describe("timeZone on the admin card's writes", () => {
  it("PATCH stores a valid zone without changing the content version", async () => {
    const poll = await seed({ pollState: "OPEN" });
    const before = await stored(poll._id);
    const res = await request(ctx.app).patch(`/api/admin/polls/${poll._id}`).set("Cookie", cookie).send({ timeZone: NY });
    expect(res.status).toBe(200);
    const after = await stored(poll._id);
    expect(after.time_zone).toBe(NY);
    expect({ ...after, time_zone: null }).toEqual({ ...before, time_zone: null });
  });

  it("ignores an invalid zone and does not refuse the write", async () => {
    const poll = await seed({ pollState: "OPEN", timeZone: "Europe/Paris" });
    const res = await request(ctx.app).patch(`/api/admin/polls/${poll._id}`).set("Cookie", cookie).send({ timeZone: "Mars/Base", pollState: "CLOSED" });
    expect(res.status).toBe(200);
    const after = await stored(poll._id);
    expect(after.time_zone).toBe("Europe/Paris");
    expect(after.poll_state).toBe("CLOSED");
  });

  it("is read on /save and /publish", async () => {
    const draft = await seed({ pollState: "INITIALIZED" });
    expect((await editSession(draft._id)).status).toBe(200);
    const saved = await request(ctx.app).post(`/api/admin/polls/${draft._id}/save`).set("Cookie", cookie).send({ clientGuid: "tab-1", timeZone: NY });
    expect(saved.status).toBe(200);
    expect((await stored(draft._id)).time_zone).toBe(NY);

    const other = await seed({ pollState: "INITIALIZED" });
    expect((await editSession(other._id)).status).toBe(200);
    const published = await request(ctx.app)
      .post(`/api/admin/polls/${other._id}/publish`)
      .set("Cookie", cookie)
      .send({ clientGuid: "tab-1", labels: ["Yes", "No"], timeZone: "Asia/Tokyo" });
    expect(published.status).toBe(200);
    expect((await stored(other._id)).time_zone).toBe("Asia/Tokyo");
  });

  it("is read on /colors", async () => {
    const poll = await seed({
      pollState: "OPEN",
      currentVotes: [{ emailAddress: "v@example.com", userName: "V", choiceIds: ["c1"], votedAt: new Date() }]
    });
    await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "v@example.com", userName: "v", choiceIds: ["c1"], votedAt: new Date() });
    expect((await editSession(poll._id)).status).toBe(200);
    const res = await request(ctx.app).post(`/api/admin/polls/${poll._id}/colors`).set("Cookie", cookie).send({ clientGuid: "tab-1", colors: [null, null], timeZone: NY });
    expect(res.status).toBe(200);
    expect((await stored(poll._id)).time_zone).toBe(NY);
  });

  it("is read on /invitees, and the invitation's dates use it", async () => {
    const poll = await seed({ pollState: "WAITING TO OPEN" });
    const res = await request(ctx.app).post(`/api/admin/polls/${poll._id}/invitees`).set("Cookie", cookie).send({ add: "ann@example.com", timeZone: NY });
    expect(res.status).toBe(200);
    expect((await stored(poll._id)).time_zone).toBe(NY);
    await ctx.db
      .updateTable("polls")
      .set({ poll_state: "OPEN", launched_at: new Date("2026-10-26T16:59:00Z"), end_at: new Date("2026-11-02T22:00:00Z") })
      .where("id", "=", poll._id)
      .execute();
    await sendPendingInvitations({ db: ctx.db, config: ctx.config });
    expect(ctx.sent[0]!.text).toContain("Poll Started: Monday, October 26, 2026, 12:59 PM EDT");
    expect(ctx.sent[0]!.text).toContain("Poll Ends: Monday, November 2, 2026, 5:00 PM EST");
  });

  it("leaves the zone alone when none is sent", async () => {
    const poll = await seed({ pollState: "OPEN", timeZone: NY });
    await request(ctx.app).patch(`/api/admin/polls/${poll._id}`).set("Cookie", cookie).send({ pollState: "CLOSED" });
    expect((await stored(poll._id)).time_zone).toBe(NY);
  });
});
