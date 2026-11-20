/**
 * POLL-ADMIN-IMPROVEMENTS A1–A4: the "Display Choices in the order above" setting is stored, saved, read and copied
 * like the poll's other content.
 */
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearPolls, forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls, voteHistory } from "./helpers/poll-fixtures.js";
import type { Poll } from "../src/polls/store.js";

let ctx: TestContext;
let cookie: string;

beforeAll(async () => {
  ctx = await startTestContext();
  ({ cookie } = await forgeSession(ctx, ctx.config.admins[0]!));
});
afterAll(async () => {
  await ctx.stop();
});
beforeEach(async () => {
  await clearPolls(ctx);
});

const publish = (pid: string, body: Record<string, unknown>) =>
  request(ctx.app).post(`/api/admin/polls/${pid}/publish`).set("Cookie", cookie).send(body);
const row = (pid: string) =>
  ctx.db
    .selectFrom("polls")
    .select(["choices_in_entered_order", "content_version", "pending_update"])
    .where("id", "=", pid)
    .executeTakeFirstOrThrow();

async function seed(overrides: Partial<Poll> = {}) {
  const poll = makePoll({ _id: randomUUID(), ...overrides });
  await polls(ctx).insertOne(poll);
  return poll;
}

async function voted(overrides: Partial<Poll> = {}) {
  const poll = await seed({ pollState: "OPEN", ...overrides });
  await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "v@example.com", userName: "v", choiceIds: ["c1"], votedAt: new Date() });
  return poll;
}

describe("A1: stored, off by default", () => {
  it("creates a poll with the setting off", async () => {
    const created = await request(ctx.app).post("/api/admin/polls").set("Cookie", cookie);
    expect(created.status).toBe(201);
    expect((await row(created.body.pid)).choices_in_entered_order).toBe(false);
    const detail = await request(ctx.app).get(`/api/admin/polls/${created.body.pid}`).set("Cookie", cookie);
    expect(detail.body.choicesInEnteredOrder).toBe(false);
  });

  it("reads a row written without the column as off", async () => {
    const poll = await seed();
    await ctx.db.updateTable("polls").set({ choices_in_entered_order: false }).where("id", "=", poll._id).execute();
    expect((await polls(ctx).findOne({ _id: poll._id }))!.choicesInEnteredOrder).toBe(false);
  });
});

describe("A2: saving it", () => {
  it("saves true and false on a public and a private poll without votes", async () => {
    for (const pollVisibility of ["Public Poll", "Private Poll"] as const) {
      const poll = await seed({ pollState: "INITIALIZED", pollVisibility, title: "Stars" });
      const on = await request(ctx.app).post(`/api/admin/polls/${poll._id}/save`).set("Cookie", cookie).send({ choicesInEnteredOrder: true });
      expect(on.status).toBe(200);
      expect(on.body.choicesInEnteredOrder).toBe(true);
      expect((await row(poll._id)).choices_in_entered_order).toBe(true);
      const off = await request(ctx.app).post(`/api/admin/polls/${poll._id}/save`).set("Cookie", cookie).send({ choicesInEnteredOrder: false });
      expect(off.status).toBe(200);
      expect((await row(poll._id)).choices_in_entered_order).toBe(false);
    }
  });

  it("saves it on a voted poll at once, alone and with a title, with no review of the setting", async () => {
    const poll = await voted();
    const before = await row(poll._id);
    const alone = await publish(poll._id, { choicesInEnteredOrder: true });
    expect(alone.status).toBe(200);
    const after = await row(poll._id);
    expect(after.choices_in_entered_order).toBe(true);
    expect(after.pending_update).toBeNull();
    expect(Number(after.content_version)).toBeGreaterThan(Number(before.content_version));

    const withTitle = await publish(poll._id, { choicesInEnteredOrder: false, title: "Renamed" });
    expect(withTitle.status).toBe(200);
    const last = await row(poll._id);
    expect(last.choices_in_entered_order).toBe(false);
    expect(last.pending_update).toMatchObject({ title: "Renamed" });
  });

  it("refuses a value that is not true or false, and saves nothing", async () => {
    const poll = await voted();
    for (const value of ["yes", 1, null]) {
      const res = await publish(poll._id, { choicesInEnteredOrder: value });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("choicesInEnteredOrder must be true or false.");
    }
    expect((await row(poll._id)).choices_in_entered_order).toBe(false);
  });

  it("keeps the stored value when the field is absent, and when the poll becomes public", async () => {
    const poll = await seed({ pollState: "INITIALIZED", pollVisibility: "Private Poll", choicesInEnteredOrder: true, title: "Kept" });
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/save`)
      .set("Cookie", cookie)
      .send({ pollVisibility: "Public Poll" });
    expect(res.status).toBe(200);
    expect((await row(poll._id)).choices_in_entered_order).toBe(true);
  });
});

describe("A3: reading it", () => {
  it("carries it on both admin lists, the admin detail and the card", async () => {
    const poll = await seed({ choicesInEnteredOrder: true });
    type Row = { pid: string; choicesInEnteredOrder: boolean };
    const listed = await request(ctx.app).get("/api/admin/polls").set("Cookie", cookie);
    expect(listed.body.polls.find((p: Row) => p.pid === poll._id).choicesInEnteredOrder).toBe(true);
    const searched = await request(ctx.app).get("/api/admin/polls/search?state=OPEN").set("Cookie", cookie);
    expect(searched.body.polls.find((p: Row) => p.pid === poll._id).choicesInEnteredOrder).toBe(true);
    const detail = await request(ctx.app).get(`/api/admin/polls/${poll._id}`).set("Cookie", cookie);
    expect(detail.body.choicesInEnteredOrder).toBe(true);
    const card = await request(ctx.app).get(`/api/polls/${poll._id}/card`).set("Cookie", cookie);
    expect(card.status).toBe(200);
    expect(card.body.poll.choicesInEnteredOrder).toBe(true);
  });

  it("serves the stored value while the poll is being edited", async () => {
    const poll = await seed({
      choicesInEnteredOrder: true,
      pollState: "EDITING",
      pollStateBeforeEditUpdate: "OPEN",
      pollEditUpdateHeartbeatTimestamp: new Date(),
      pollEditUpdateClientGUID: "guid-1"
    });
    const card = await request(ctx.app).get(`/api/polls/${poll._id}/card`).set("Cookie", cookie);
    expect(card.status).toBe(200);
    expect(card.body.poll.choicesInEnteredOrder).toBe(true);
  });

  it("leaves the poll's own page unchanged", async () => {
    const off = await seed({ choicesInEnteredOrder: false });
    const html = (on: string) => request(ctx.app).get(`/poll/${on}`).then((res) => res.text.replaceAll(on, "PID"));
    const offPage = await html(off._id);
    await ctx.db.updateTable("polls").set({ choices_in_entered_order: true }).where("id", "=", off._id).execute();
    await ctx.cache.del(`poll:${off._id}`);
    expect(await html(off._id)).toBe(offPage);
  });
});

describe("A4: duplicate", () => {
  it("copies the setting, and still resets the line graph", async () => {
    const poll = await seed({ choicesInEnteredOrder: true, lineGraphEnabled: true, pollState: "CLOSED" });
    const dup = await request(ctx.app).post(`/api/admin/polls/${poll._id}/duplicate`).set("Cookie", cookie);
    expect(dup.status).toBe(201);
    const copy = (await polls(ctx).findOne({ _id: dup.body.pid }))!;
    expect(copy.choicesInEnteredOrder).toBe(true);
    expect(copy.lineGraphEnabled).toBe(false);
  });
});
