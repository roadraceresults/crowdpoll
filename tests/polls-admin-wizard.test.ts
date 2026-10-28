/**
 * The server side of the admin card's wizard: keywords as a stored poll setting,
 * the two admin list row fields the card reads, and saving a new poll without
 * publishing it.
 */
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls, voteHistory } from "./helpers/poll-fixtures.js";

const ADMIN = "admin-wizard@example.com";
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
  await polls(ctx).deleteMany({});
  await voteHistory(ctx).deleteMany({});
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
  for (const key of await ctx.cache.scan("search:*")) await ctx.cache.del(key);
});

const publish = (pid: string, body: Record<string, unknown>) =>
  request(ctx.app).post(`/api/admin/polls/${pid}/publish`).set("Cookie", cookie).send(body);
const detail = (pid: string) => request(ctx.app).get(`/api/admin/polls/${pid}`).set("Cookie", cookie);
const editSession = (pid: string, clientGuid: string) =>
  request(ctx.app).post(`/api/admin/polls/${pid}/edit-session`).set("Cookie", cookie).send({ clientGuid });

async function addVote(pid: string) {
  await voteHistory(ctx).insertOne({
    pid, emailAddress: "v@example.com", userName: "v", choiceIds: ["c1"], votedAt: new Date()
  });
}

describe("keywords on publish", () => {
  it("stores a public poll's keywords exactly as sent", async () => {
    const poll = makePoll({ pollState: "INITIALIZED" });
    await polls(ctx).insertOne(poll);
    const res = await publish(poll._id, { pollVisibility: "Public Poll", keywords: "bake sale,school" });
    expect(res.status).toBe(200);
    expect((await detail(poll._id)).body.keywords).toBe("bake sale,school");
  });

  it("stores an empty value", async () => {
    const poll = makePoll({ pollState: "INITIALIZED", keywords: "old" });
    await polls(ctx).insertOne(poll);
    expect((await publish(poll._id, { keywords: "" })).status).toBe(200);
    expect((await detail(poll._id)).body.keywords).toBe("");
  });

  for (const bad of ["Bake", "bake,,sale", "bake  sale", " bake", "bake,bake", "café", `${"a".repeat(201)}`]) {
    it(`refuses ${JSON.stringify(bad.length > 20 ? `${bad.length} characters` : bad)} and changes nothing`, async () => {
      const poll = makePoll({ pollState: "INITIALIZED", keywords: "kept" });
      await polls(ctx).insertOne(poll);
      const res = await publish(poll._id, { keywords: bad });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/keywords/i);
      const after = (await detail(poll._id)).body;
      expect(after.keywords).toBe("kept");
      expect(after.pollState).toBe("INITIALIZED");
    });
  }

  it("accepts exactly 200 characters", async () => {
    const value = Array.from({ length: 40 }, (_, i) => `k${String(i).padStart(3, "0")}`).join(",");
    expect(value.length).toBe(199);
    const poll = makePoll({ pollState: "INITIALIZED" });
    await polls(ctx).insertOne(poll);
    expect((await publish(poll._id, { keywords: `${value}x` })).status).toBe(200);
  });

  it("clears the keywords of a poll that becomes private, even when none are sent", async () => {
    const poll = makePoll({ pollState: "INITIALIZED", keywords: "bake sale" });
    await polls(ctx).insertOne(poll);
    const res = await publish(poll._id, { pollVisibility: "Private Poll" });
    expect(res.status).toBe(200);
    expect((await detail(poll._id)).body.keywords).toBe("");
  });

  it("never stores keywords sent with a private poll", async () => {
    const poll = makePoll({ pollState: "INITIALIZED", pollVisibility: "Private Poll" });
    await polls(ctx).insertOne(poll);
    expect((await publish(poll._id, { keywords: "bake sale" })).status).toBe(200);
    expect((await detail(poll._id)).body.keywords).toBe("");
  });

  it("refuses a keyword change once the poll has a vote", async () => {
    const poll = makePoll({ pollState: "OPEN", keywords: "kept" });
    await polls(ctx).insertOne(poll);
    await addVote(poll._id);
    const res = await publish(poll._id, { keywords: "new" });
    expect(res.status).toBe(400);
    expect((await detail(poll._id)).body.keywords).toBe("kept");
  });

  it("duplicates a poll with its keywords", async () => {
    const poll = makePoll({ pollState: "OPEN", keywords: "bake sale" });
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app).post(`/api/admin/polls/${poll._id}/duplicate`).set("Cookie", cookie);
    expect(res.status).toBe(201);
    expect((await detail(res.body.pid)).body.keywords).toBe("bake sale");
  });
});

describe("keywords in home search", () => {
  it("finds a listable public poll by its keyword", async () => {
    const tagged = makePoll({ title: "Fundraiser ideas", keywords: "bake sale,school" });
    const untagged = makePoll({ title: "Fundraiser plans" });
    for (const p of [tagged, untagged]) await polls(ctx).insertOne(p);
    const res = await request(ctx.app).post("/api/search").set("X-Forwarded-For", "198.51.100.9").send({ q: "bake" });
    expect(res.status).toBe(200);
    expect(res.body.results.map((r: { pid: string }) => r.pid)).toEqual([tagged._id]);
  });
});

describe("the admin list row", () => {
  type Row = { pid: string; keywords: string; pollStateBeforeEditUpdate: string | null };
  const rowOf = (res: request.Response, pid: string): Row =>
    res.body.polls.find((p: Row) => p.pid === pid);

  it("carries keywords and pollStateBeforeEditUpdate on the list and the search", async () => {
    const plain = makePoll({ title: "Plain", keywords: "bake sale" });
    const draft = makePoll({ title: "Draft", pollState: "INITIALIZED" });
    for (const p of [plain, draft]) await polls(ctx).insertOne(p);
    expect((await editSession(draft._id, "tab-1")).status).toBe(200);

    const list = await request(ctx.app).get("/api/admin/polls").set("Cookie", cookie);
    expect(rowOf(list, plain._id)).toMatchObject({ keywords: "bake sale", pollStateBeforeEditUpdate: null });
    expect(rowOf(list, draft._id)).toMatchObject({ keywords: "", pollStateBeforeEditUpdate: "INITIALIZED" });

    const search = await request(ctx.app).get("/api/admin/polls/search").query({ state: "EDITING" }).set("Cookie", cookie);
    expect(search.status).toBe(200);
    expect(rowOf(search, draft._id)).toMatchObject({ pollStateBeforeEditUpdate: "INITIALIZED" });
  });
});

describe("POST /api/admin/polls/:pid/save", () => {
  const save = (pid: string, body: Record<string, unknown>) =>
    request(ctx.app).post(`/api/admin/polls/${pid}/save`).set("Cookie", cookie).send(body);

  async function draft(overrides: Parameters<typeof makePoll>[0] = {}) {
    const poll = makePoll({ pollState: "INITIALIZED", ...overrides });
    await polls(ctx).insertOne(poll);
    expect((await editSession(poll._id, "tab-1")).status).toBe(200);
    return poll;
  }

  it("stores the fields, keeps the poll unpublished and ends the session", async () => {
    const poll = await draft();
    const res = await save(poll._id, {
      clientGuid: "tab-1",
      title: "Bake sale",
      subtitle: "Saturday",
      pollVisibility: "Public Poll",
      keywords: "bake sale",
      labels: ["Cakes", "Cookies"],
      voteMutability: "Final-Vote Poll"
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Saved: you can finish later.");
    expect(res.body.pollState).toBe("INITIALIZED");
    const stored = await polls(ctx).findOne({ _id: poll._id });
    expect(stored).toMatchObject({
      title: "Bake sale",
      subtitle: "Saturday",
      keywords: "bake sale",
      voteMutability: "Final-Vote Poll",
      pollState: "INITIALIZED",
      pollStateBeforeEditUpdate: null,
      pollEditUpdateClientGUID: null,
      pollApprovalTimestamp: null
    });
    expect(stored!.choices.map((c) => c.label)).toEqual(["Cakes", "Cookies"]);
  });

  it("keeps the stored title when the title is empty, and the stored choices when there are none", async () => {
    const poll = await draft({ title: "Kept title" });
    expect((await save(poll._id, { clientGuid: "tab-1", title: "  ", labels: [" ", ""] })).status).toBe(200);
    const stored = await polls(ctx).findOne({ _id: poll._id });
    expect(stored!.title).toBe("Kept title");
    expect(stored!.choices.map((c) => c.label)).toEqual(["Choice 1", "Choice 2"]);
  });

  it("stores fewer choices than a poll needs to publish", async () => {
    const poll = await draft();
    expect((await save(poll._id, { clientGuid: "tab-1", labels: ["Only"] })).status).toBe(200);
    expect((await polls(ctx).findOne({ _id: poll._id }))!.choices.map((c) => c.label)).toEqual(["Only"]);
  });

  it("saves a poll that still holds its defaults", async () => {
    const poll = await draft({ title: "New Poll 2026-10-03 09:00:00" });
    const res = await save(poll._id, { clientGuid: "tab-1" });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Saved: you can finish later.");
    expect((await polls(ctx).findOne({ _id: poll._id }))!.pollState).toBe("INITIALIZED");
  });

  it("saves a poll that is not being edited, as /publish allows", async () => {
    const poll = makePoll({ pollState: "INITIALIZED" });
    await polls(ctx).insertOne(poll);
    expect((await save(poll._id, { subtitle: "No session" })).status).toBe(200);
    expect((await polls(ctx).findOne({ _id: poll._id }))!.subtitle).toBe("No session");
  });

  it("refuses a poll that has been published", async () => {
    for (const pollState of ["AWAITING APPROVAL", "OPEN"] as const) {
      const poll = makePoll({ pollState });
      await polls(ctx).insertOne(poll);
      const res = await save(poll._id, { subtitle: "x" });
      expect(res.status, pollState).toBe(409);
      expect((await polls(ctx).findOne({ _id: poll._id }))!.subtitle).toBe("");
    }
  });

  it("refuses a published poll that is being edited", async () => {
    const poll = makePoll({ pollState: "OPEN" });
    await polls(ctx).insertOne(poll);
    expect((await editSession(poll._id, "tab-1")).status).toBe(200);
    const res = await save(poll._id, { clientGuid: "tab-1", subtitle: "x" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/not been published/);
  });

  it("refuses a poll locked by another tab", async () => {
    const poll = await draft();
    const res = await save(poll._id, { clientGuid: "tab-2", subtitle: "x" });
    expect(res.status).toBe(409);
    expect((await polls(ctx).findOne({ _id: poll._id }))!.pollEditUpdateClientGUID).toBe("tab-1");
  });

  it("refuses invalid fields", async () => {
    const poll = await draft();
    expect((await save(poll._id, { clientGuid: "tab-1", labels: ["Same", "Same"] })).status).toBe(409);
    expect((await save(poll._id, {
      clientGuid: "tab-1",
      startAt: "2030-01-02T00:00:00.000Z",
      endAt: "2030-01-01T00:00:00.000Z"
    })).status).toBe(400);
    expect((await save(poll._id, { clientGuid: "tab-1", keywords: "Bake" })).status).toBe(400);
    expect((await polls(ctx).findOne({ _id: poll._id }))!.pollState).toBe("EDITING");
  });

  it("answers 404 for an unknown poll", async () => {
    expect((await save("no-such-poll", { subtitle: "x" })).status).toBe(404);
  });
});

describe("the starter-choices hold", () => {
  // makePoll's choices are the starter "Choice 1 / Choice 2".
  it("sends a published poll that still has the starter choices to review", async () => {
    const poll = makePoll({ pollState: "OPEN" });
    await polls(ctx).insertOne(poll);
    const res = await publish(poll._id, { subtitle: "x" });
    expect(res.status).toBe(200);
    expect(res.body.message).toBeUndefined();
    expect((await polls(ctx).findOne({ _id: poll._id }))!.pollState).toBe("AWAITING APPROVAL");
  });

  it("does the same when the poll has votes", async () => {
    const poll = makePoll({ pollState: "OPEN" });
    await polls(ctx).insertOne(poll);
    await addVote(poll._id);
    expect((await publish(poll._id, { subtitle: "x" })).status).toBe(200);
    expect((await polls(ctx).findOne({ _id: poll._id }))!.pollState).toBe("AWAITING APPROVAL");
  });

  it("still holds back an unpublished poll", async () => {
    const poll = makePoll({ pollState: "INITIALIZED" });
    await polls(ctx).insertOne(poll);
    const res = await publish(poll._id, { subtitle: "x" });
    expect(res.body.message).toBe("This poll still has its default values and cannot be published.");
    expect((await polls(ctx).findOne({ _id: poll._id }))!.pollState).toBe("INITIALIZED");
  });

  it("still holds back an unpublished poll under its own edit session", async () => {
    const poll = makePoll({ pollState: "INITIALIZED" });
    await polls(ctx).insertOne(poll);
    expect((await editSession(poll._id, "tab-1")).status).toBe(200);
    const res = await publish(poll._id, { clientGuid: "tab-1", subtitle: "x" });
    expect(res.body.message).toBe("This poll still has its default values and cannot be published.");
    const stored = await polls(ctx).findOne({ _id: poll._id });
    expect(stored!.pollState).toBe("INITIALIZED");
    expect(stored!.pollEditUpdateClientGUID).toBeNull();
  });
});

describe("colors through the wizard's requests", () => {
  const save = (pid: string, body: Record<string, unknown>) =>
    request(ctx.app).post(`/api/admin/polls/${pid}/save`).set("Cookie", cookie).send(body);

  it("returns a saved draft's colors in the poll detail, and keeps them in the stored choices", async () => {
    const poll = makePoll({ pollState: "INITIALIZED" });
    await polls(ctx).insertOne(poll);
    expect((await editSession(poll._id, "tab-1")).status).toBe(200);
    expect((await save(poll._id, { clientGuid: "tab-1", labels: ["Cakes", "Cookies"], colors: ["#F91010", null] })).status).toBe(200);
    const body = (await detail(poll._id)).body;
    expect(body.choices.map((c: { label: string; color?: string }) => [c.label, c.color])).toEqual([["Cakes", "#F91010"], ["Cookies", undefined]]);
  });

  it("sends a published poll without votes for review when only its colors change, as it does for a title", async () => {
    const poll = makePoll({ pollState: "OPEN", choices: [{ id: "a", label: "Left", position: 0 }, { id: "b", label: "Right", position: 1 }] });
    await polls(ctx).insertOne(poll);
    expect((await editSession(poll._id, "tab-1")).body.mode).toBe("EDIT");
    const res = await publish(poll._id, { clientGuid: "tab-1", colors: [null, "#0808FD"] });
    expect(res.status).toBe(200);
    expect(res.body.pollState).toBe("AWAITING APPROVAL");
    expect((await polls(ctx).findOne({ _id: poll._id }))!.choices.map((c) => [c.id, c.color])).toEqual([["a", undefined], ["b", "#0808FD"]]);
  });

  it("changes only the colors of a poll that has votes when publish carries colors with the allowed fields", async () => {
    const poll = makePoll({ pollState: "OPEN", choices: [{ id: "a", label: "Left", position: 0 }, { id: "b", label: "Right", position: 1 }] });
    await polls(ctx).insertOne(poll);
    await addVote(poll._id);
    expect((await editSession(poll._id, "tab-1")).body.mode).toBe("UPDATE");
    const res = await publish(poll._id, { clientGuid: "tab-1", subtitle: "Now with colors", colors: ["#FF91CB", null] });
    expect(res.status).toBe(200);
    const stored = (await polls(ctx).findOne({ _id: poll._id }))!;
    expect(stored.subtitle).toBe("Now with colors");
    expect(stored.choices.map((c) => [c.id, c.label, c.color])).toEqual([["a", "Left", "#FF91CB"], ["b", "Right", undefined]]);
  });
});
