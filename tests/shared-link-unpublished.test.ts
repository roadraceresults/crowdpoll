import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { updatePoll } from "../src/polls/store.js";

let ctx: TestContext;
let owner: { cookie: string; userId: string };
let viewer: { cookie: string; userId: string };
const viewerEmail = "draft-viewer@example.com";

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1" });
  owner = await forgeSession(ctx, "draft-owner@example.com");
  viewer = await forgeSession(ctx, viewerEmail);
  await ctx.db.updateTable("user").set({ userName: "Dana Draft" }).where("id", "=", owner.userId).execute();
});
afterAll(async () => {
  await ctx.stop();
});
beforeEach(async () => {
  await polls(ctx).deleteMany({});
});

const open = (pid: string, cookie = viewer.cookie) => request(ctx.app).get(`/?PID=${pid}`).set("Cookie", cookie).redirects(0);
const shared = async () => {
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
  return request(ctx.app).post("/api/tabs/shared-with-you/refresh").set("Cookie", viewer.cookie).send({});
};
const linkRows = (pid: string) =>
  ctx.db.selectFrom("user_polls").selectAll().where("email", "=", viewerEmail).where("poll_id", "=", pid).where("relation", "=", "linked").execute();

async function seedDraft(overrides: Parameters<typeof makePoll>[0] = {}, creatorName = "Dana Draft") {
  const poll = makePoll({
    _id: randomUUID(),
    title: "Secret draft title",
    subtitle: "Secret draft subtitle",
    pollVisibility: "Private Poll",
    pollSharingMode: "Anyone With The Link",
    pollState: "INITIALIZED",
    choices: [
      { id: "c1", label: "Secret choice one", position: 0 },
      { id: "c2", label: "Secret choice two", position: 1 }
    ],
    ...overrides
  });
  await polls(ctx).insertOne(poll);
  await ctx.db.updateTable("polls").set({ created_by_id: owner.userId, created_by_name: creatorName }).where("id", "=", poll._id).execute();
  return poll;
}

describe("the link of a poll that is not published yet", () => {
  it("lands a non-creator on Shared With You with the not-published notice and records the view", async () => {
    const poll = await seedDraft();
    const res = await open(poll._id);
    expect(res.headers.location).toBe("/?tab=shared-with-you&notice=unpublished");
    expect(await linkRows(poll._id)).toHaveLength(1);
  });

  it("gives an invited user of an unpublished Invitation Only poll the same landing and no new view", async () => {
    const poll = await seedDraft({ pollSharingMode: "Invitation Only", invitedVoterList: [viewerEmail] });
    const res = await open(poll._id);
    expect(res.headers.location).toBe("/?tab=shared-with-you&notice=unpublished");
    expect(await linkRows(poll._id)).toEqual([]);
  });

  it("records nothing for an Archived poll", async () => {
    const poll = await seedDraft({ pollState: "ARCHIVED" });
    expect((await open(poll._id)).headers.location).toBe("/?notice=unavailable");
    expect(await linkRows(poll._id)).toEqual([]);
  });

  it("lists the poll in Shared With You as a placeholder that carries none of its content", async () => {
    const poll = await seedDraft();
    await open(poll._id);
    const res = await shared();
    expect(res.status).toBe(200);
    expect(res.body.order).toEqual([poll._id]);
    expect(res.body.cards[poll._id]).toEqual({ pid: poll._id, notPublished: true, createdByName: "Dana Draft", contentVersion: 0 });
    expect(res.body.counters[poll._id]).toBeUndefined();
    const wire = JSON.stringify(res.body);
    for (const secret of ["Secret draft title", "Secret draft subtitle", "Secret choice one", "Secret choice two"]) {
      expect(wire).not.toContain(secret);
    }
    expect(wire).not.toContain("draft-owner@example.com");
  });

  it("sends an empty name, never an email address, when the creator has none", async () => {
    const poll = await seedDraft({}, "");
    await open(poll._id);
    expect((await shared()).body.cards[poll._id].createdByName).toBe("");
  });

  it("refuses a vote on it", async () => {
    const poll = await seedDraft();
    await open(poll._id);
    const res = await request(ctx.app).post(`/api/polls/${poll._id}/vote`).set("Cookie", viewer.cookie).send({ choiceIds: ["c1"] });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("becomes the ordinary card on the next refresh once the poll is published", async () => {
    const poll = await seedDraft();
    await open(poll._id);
    const before = await shared();
    expect(before.body.cards[poll._id].notPublished).toBe(true);
    await updatePoll(ctx, poll._id, { pollState: "OPEN" });
    const after = await request(ctx.app)
      .post("/api/tabs/shared-with-you/refresh")
      .set("Cookie", viewer.cookie)
      .send({ membershipVersion: before.body.membershipVersion, versions: { [poll._id]: [0, 0] } });
    expect(after.status).toBe(200);
    expect(after.body.cards[poll._id].title).toBe("Secret draft title");
    expect(after.body.cards[poll._id].notPublished).toBeUndefined();
  });

  it("leaves Shared With You when the creator makes the poll public before publishing", async () => {
    const poll = await seedDraft();
    await open(poll._id);
    await updatePoll(ctx, poll._id, { pollVisibility: "Public Poll" });
    expect((await shared()).body.order ?? []).toEqual([]);
  });
});
