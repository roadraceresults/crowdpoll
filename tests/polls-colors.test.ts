import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls, voteHistory } from "./helpers/poll-fixtures.js";
import { BAR_PALETTE } from "../src/polls/barPalette.js";

const ADMIN = "admin-colors@example.com";
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

const editSession = (pid: string, clientGuid: string) =>
  request(ctx.app).post(`/api/admin/polls/${pid}/edit-session`).set("Cookie", cookie).send({ clientGuid });
const save = (pid: string, body: Record<string, unknown>) =>
  request(ctx.app).post(`/api/admin/polls/${pid}/save`).set("Cookie", cookie).send(body);
const publish = (pid: string, body: Record<string, unknown>) =>
  request(ctx.app).post(`/api/admin/polls/${pid}/publish`).set("Cookie", cookie).send(body);

async function draft(overrides: Parameters<typeof makePoll>[0] = {}) {
  const poll = makePoll({ pollState: "INITIALIZED", ...overrides });
  await polls(ctx).insertOne(poll);
  expect((await editSession(poll._id, "tab-1")).status).toBe(200);
  return poll;
}

const storedChoices = async (pid: string) => (await polls(ctx).findOne({ _id: pid }))!.choices;

describe("save with colors", () => {
  it("stores each choice's color in order, in the palette's spelling", async () => {
    const poll = await draft();
    const res = await save(poll._id, { clientGuid: "tab-1", labels: ["Republican", "Democratic", "Other"], colors: ["#f91010", "#0808FD", null] });
    expect(res.status).toBe(200);
    const choices = await storedChoices(poll._id);
    expect(choices.map((c) => [c.label, c.color])).toEqual([
      ["Republican", "#F91010"],
      ["Democratic", "#0808FD"],
      ["Other", undefined]
    ]);
    expect(res.body.choices.map((c: { color?: string }) => c.color)).toEqual(["#F91010", "#0808FD", undefined]);
  });

  it("pairs each color with its label before an empty label is dropped", async () => {
    const poll = await draft();
    const res = await save(poll._id, { clientGuid: "tab-1", labels: ["A", "", "B"], colors: ["#F91010", "#06D400", "#0808FD"] });
    expect(res.status).toBe(200);
    expect((await storedChoices(poll._id)).map((c) => [c.label, c.color])).toEqual([
      ["A", "#F91010"],
      ["B", "#0808FD"]
    ]);
  });

  it("leaves every choice without a color when labels arrive without colors", async () => {
    const poll = await draft({ choices: [{ id: "c1", label: "Old 1", position: 0, color: "#F91010" }, { id: "c2", label: "Old 2", position: 1 }] });
    expect((await save(poll._id, { clientGuid: "tab-1", labels: ["New 1", "New 2"] })).status).toBe(200);
    expect((await storedChoices(poll._id)).map((c) => c.color)).toEqual([undefined, undefined]);
  });

  it("refuses a list of the wrong length and saves nothing", async () => {
    const poll = await draft();
    const res = await save(poll._id, { clientGuid: "tab-1", title: "Changed", labels: ["A", "B"], colors: ["#F91010"] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/one entry per choice/i);
    const stored = await polls(ctx).findOne({ _id: poll._id });
    expect(stored!.title).toBe("Test Poll");
    expect(stored!.choices.map((c) => c.label)).toEqual(["Choice 1", "Choice 2"]);
  });

  for (const bad of ["#123456", "red", "#FF000", 7]) {
    it(`refuses ${JSON.stringify(bad)} and saves nothing`, async () => {
      const poll = await draft();
      const res = await save(poll._id, { clientGuid: "tab-1", labels: ["A", "B"], colors: [bad, null] });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/palette/i);
      expect((await storedChoices(poll._id)).map((c) => c.label)).toEqual(["Choice 1", "Choice 2"]);
    });
  }

  it("ignores colors when no label is given, keeping the stored choices", async () => {
    const poll = await draft({ choices: [{ id: "c1", label: "Kept 1", position: 0, color: "#F91010" }, { id: "c2", label: "Kept 2", position: 1 }] });
    expect((await save(poll._id, { clientGuid: "tab-1", labels: [" ", ""], colors: ["#0808FD", "#0808FD"] })).status).toBe(200);
    expect((await storedChoices(poll._id)).map((c) => [c.id, c.color])).toEqual([["c1", "#F91010"], ["c2", undefined]]);
    const again = await draft({ choices: [{ id: "d1", label: "Kept 1", position: 0 }, { id: "d2", label: "Kept 2", position: 1 }] });
    expect((await save(again._id, { clientGuid: "tab-1", colors: ["#0808FD", "#0808FD"] })).status).toBe(200);
    expect((await storedChoices(again._id)).map((c) => c.color)).toEqual([undefined, undefined]);
  });
});

describe("publish with colors", () => {
  it("stores the colors beside the labels of a poll that has no votes", async () => {
    const poll = await draft();
    const res = await publish(poll._id, { clientGuid: "tab-1", title: "Parties", labels: ["Republican", "Democratic"], colors: ["#F91010", "#0808fd"] });
    expect(res.status).toBe(200);
    expect(res.body.pollState).toBe("AWAITING APPROVAL");
    expect((await storedChoices(poll._id)).map((c) => [c.label, c.color])).toEqual([
      ["Republican", "#F91010"],
      ["Democratic", "#0808FD"]
    ]);
  });

  it("sets the colors by position and keeps every choice id when no labels are sent", async () => {
    const poll = await draft({ choices: [{ id: "x1", label: "Left", position: 0 }, { id: "x2", label: "Right", position: 1 }] });
    const res = await publish(poll._id, { clientGuid: "tab-1", colors: ["#F91010", null] });
    expect(res.status).toBe(200);
    expect((await storedChoices(poll._id)).map((c) => [c.id, c.label, c.color])).toEqual([
      ["x1", "Left", "#F91010"],
      ["x2", "Right", undefined]
    ]);
  });

  it("refuses a colors list of the wrong length when no labels are sent", async () => {
    const poll = await draft({ choices: [{ id: "x1", label: "Left", position: 0 }, { id: "x2", label: "Right", position: 1 }] });
    const res = await publish(poll._id, { clientGuid: "tab-1", colors: ["#F91010"] });
    expect(res.status).toBe(400);
    expect((await storedChoices(poll._id)).map((c) => c.color)).toEqual([undefined, undefined]);
  });
});

describe("colors on a poll that has votes", () => {
  const colorsRoute = (pid: string, body: Record<string, unknown>) =>
    request(ctx.app).post(`/api/admin/polls/${pid}/colors`).set("Cookie", cookie).send(body);
  const choicesWithoutColor = [
    { id: "c1", label: "Left", position: 0 },
    { id: "c2", label: "Right", position: 1 }
  ];
  const contentVersionOf = async (pid: string) =>
    Number((await ctx.db.selectFrom("polls").select("content_version").where("id", "=", pid).executeTakeFirstOrThrow()).content_version);

  async function votedPoll(overrides: Parameters<typeof makePoll>[0] = {}) {
    const poll = makePoll({ pollState: "OPEN", choices: choicesWithoutColor, ...overrides });
    await polls(ctx).insertOne(poll);
    await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "v@example.com", userName: "v", choiceIds: ["c1"], votedAt: new Date() });
    const session = await editSession(poll._id, "tab-1");
    expect(session.status).toBe(200);
    expect(session.body.mode).toBe("UPDATE");
    return poll;
  }

  it("accepts colors in publish beside the other fields it allows, and still refuses labels", async () => {
    const poll = await votedPoll();
    const refused = await publish(poll._id, { clientGuid: "tab-1", labels: ["A", "B"], colors: ["#F91010", null] });
    expect(refused.status).toBe(400);
    const res = await publish(poll._id, { clientGuid: "tab-1", title: "Renamed", colors: ["#F91010", "#0808FD"] });
    expect(res.status).toBe(200);
    expect(res.body.pollState).toBe("AWAITING APPROVAL");
    const stored = await polls(ctx).findOne({ _id: poll._id });
    expect(stored!.title).toBe("Renamed");
    expect(stored!.choices.map((c) => [c.id, c.label, c.color])).toEqual([["c1", "Left", "#F91010"], ["c2", "Right", "#0808FD"]]);
  });

  for (const state of ["OPEN", "WAITING TO OPEN", "CLOSED", "REJECTED"] as const) {
    it(`sets the colors by position and puts a ${state} poll back as it was, with no review`, async () => {
      const poll = await votedPoll({ pollState: state, startAt: state === "WAITING TO OPEN" ? new Date(Date.now() + 86_400_000) : null });
      const versionBefore = await contentVersionOf(poll._id);
      const votesBefore = await voteHistory(ctx).countDocuments({});
      const res = await colorsRoute(poll._id, { clientGuid: "tab-1", colors: ["#880015", null] });
      expect(res.status).toBe(200);
      expect(res.body.pollState).toBe(state);
      expect(res.body.choices.map((c: { color?: string }) => c.color)).toEqual(["#880015", undefined]);
      const stored = (await polls(ctx).findOne({ _id: poll._id }))!;
      expect(stored.pollState).toBe(state);
      expect(stored.choices.map((c) => [c.id, c.label, c.position, c.color])).toEqual([
        ["c1", "Left", 0, "#880015"],
        ["c2", "Right", 1, undefined]
      ]);
      expect(stored).toMatchObject({
        pollStateBeforeEditUpdate: null,
        pollEditUpdateClientGUID: null,
        pollEditUpdateHeartbeatTimestamp: null,
        pollApprovalTimestamp: null,
        pollAcceptabilityScreeningAttempts: 0
      });
      expect(await voteHistory(ctx).countDocuments({})).toBe(votesBefore);
      expect(await contentVersionOf(poll._id)).toBeGreaterThan(versionBefore);
    });
  }

  it("answers 404 for a signed-in user who is neither the creator nor an administrator", async () => {
    const poll = await votedPoll();
    const { cookie: other } = await forgeSession(ctx, "someone-else@example.com");
    const res = await request(ctx.app).post(`/api/admin/polls/${poll._id}/colors`).set("Cookie", other).send({ clientGuid: "tab-1", colors: ["#F91010", null] });
    expect(res.status).toBe(404);
    expect((await polls(ctx).findOne({ _id: poll._id }))!.choices.every((c) => c.color === undefined)).toBe(true);
  });

  it("lets an administrator who did not create the poll change its colors", async () => {
    const poll = await votedPoll({ createdByEmail: "creator@example.com" } as Parameters<typeof makePoll>[0]);
    const res = await colorsRoute(poll._id, { clientGuid: "tab-1", colors: [null, "#0808FD"] });
    expect(res.status).toBe(200);
  });

  it("answers 409 without the session or with another guid, and changes nothing", async () => {
    const poll = await votedPoll();
    for (const clientGuid of ["tab-2", ""]) {
      const res = await colorsRoute(poll._id, { clientGuid, colors: ["#F91010", null] });
      expect(res.status).toBe(409);
    }
    const stored = (await polls(ctx).findOne({ _id: poll._id }))!;
    expect(stored.pollState).toBe("EDITING");
    expect(stored.choices.every((c) => c.color === undefined)).toBe(true);
  });

  it("answers 409 for a poll that has no votes", async () => {
    const poll = makePoll({ pollState: "OPEN", choices: choicesWithoutColor });
    await polls(ctx).insertOne(poll);
    expect((await editSession(poll._id, "tab-1")).body.mode).toBe("EDIT");
    const res = await colorsRoute(poll._id, { clientGuid: "tab-1", colors: ["#F91010", null] });
    expect(res.status).toBe(409);
    expect((await polls(ctx).findOne({ _id: poll._id }))!.pollState).toBe("EDITING");
  });

  it("answers 400 for a list of the wrong length or an entry outside the palette, and keeps the session", async () => {
    const poll = await votedPoll();
    expect((await colorsRoute(poll._id, { clientGuid: "tab-1", colors: ["#F91010"] })).status).toBe(400);
    expect((await colorsRoute(poll._id, { clientGuid: "tab-1" })).status).toBe(400);
    expect((await colorsRoute(poll._id, { clientGuid: "tab-1", colors: ["#123456", null] })).status).toBe(400);
    const stored = (await polls(ctx).findOne({ _id: poll._id }))!;
    expect(stored.pollState).toBe("EDITING");
    expect(stored.pollEditUpdateClientGUID).toBe("tab-1");
    expect(stored.choices.every((c) => c.color === undefined)).toBe(true);
  });
});

describe("a color the poll already stores", () => {
  const stored = [
    { id: "s1", label: "Left", position: 0, color: "#123456" },
    { id: "s2", label: "Right", position: 1 }
  ];
  const colorsRoute = (pid: string, body: Record<string, unknown>) =>
    request(ctx.app).post(`/api/admin/polls/${pid}/colors`).set("Cookie", cookie).send(body);

  it("is accepted and kept on save, on publish and on the colors route, in any letter case", async () => {
    const draftPoll = await draft({ choices: stored });
    expect((await save(draftPoll._id, { clientGuid: "tab-1", labels: ["Left", "Right"], colors: ["#123456", "#F91010"] })).status).toBe(200);
    expect((await storedChoices(draftPoll._id)).map((c) => c.color)).toEqual(["#123456", "#F91010"]);

    const publishedPoll = await draft({ choices: stored });
    expect((await publish(publishedPoll._id, { clientGuid: "tab-1", title: "Kept", colors: ["#123456", null] })).status).toBe(200);
    expect((await storedChoices(publishedPoll._id)).map((c) => c.color)).toEqual(["#123456", undefined]);

    const voted = makePoll({ pollState: "OPEN", choices: stored });
    await polls(ctx).insertOne(voted);
    await voteHistory(ctx).insertOne({ pid: voted._id, emailAddress: "v@example.com", userName: "v", choiceIds: ["s1"], votedAt: new Date() });
    expect((await editSession(voted._id, "tab-1")).status).toBe(200);
    expect((await colorsRoute(voted._id, { clientGuid: "tab-1", colors: ["#123456", "#0808FD"] })).status).toBe(200);
    expect((await storedChoices(voted._id)).map((c) => c.color)).toEqual(["#123456", "#0808FD"]);
  });

  it("is accepted when it arrives in lower case, and a different color outside the palette is refused", async () => {
    const poll = await draft({ choices: [{ id: "s1", label: "Left", position: 0, color: "#ABCDEF" }, { id: "s2", label: "Right", position: 1 }] });
    expect((await save(poll._id, { clientGuid: "tab-1", labels: ["Left", "Right"], colors: ["#abcdef", null] })).status).toBe(200);
    expect((await storedChoices(poll._id)).map((c) => c.color)).toEqual(["#ABCDEF", undefined]);
    const refused = await save(poll._id, { clientGuid: "tab-1", labels: ["Left", "Right"], colors: [null, "#654321"] });
    expect(refused.status).toBe(400);
    expect(refused.body.error).toMatch(/palette/i);
  });
});

describe("palette colors and duplication", () => {
  it("accepts every entry of the palette", async () => {
    const poll = await draft();
    const labels = BAR_PALETTE.map((c) => `Option ${c.name}`);
    const res = await save(poll._id, { clientGuid: "tab-1", labels, colors: BAR_PALETTE.map((c) => c.hex.toLowerCase()) });
    expect(res.status).toBe(200);
    expect((await storedChoices(poll._id)).map((c) => c.color)).toEqual(BAR_PALETTE.map((c) => c.hex));
  });

  it("copies the color of each choice when a poll is duplicated", async () => {
    const source = makePoll({
      pollState: "OPEN",
      choices: [{ id: "a", label: "Left", position: 0, color: "#F91010" }, { id: "b", label: "Right", position: 1 }, { id: "c", label: "Other", position: 2, color: "#0808FD" }]
    });
    await polls(ctx).insertOne(source);
    const res = await request(ctx.app).post(`/api/admin/polls/${source._id}/duplicate`).set("Cookie", cookie);
    expect(res.status).toBe(201);
    const copy = (await polls(ctx).findOne({ _id: res.body.pid }))!;
    expect(copy.choices.map((c) => [c.label, c.color])).toEqual([["Left", "#F91010"], ["Right", undefined], ["Other", "#0808FD"]]);
    expect(copy.choices.map((c) => c.id)).not.toContain("a");
  });
});
