/**
 * USER-ADD-CHOICES US4: a creator's save names the choices it started from
 * (`baseChoiceIds`), so a choice a voter added meanwhile survives the save.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { startTestContext, forgeSession, type TestContext } from "./helpers/setup.js";
import { makePoll, polls, voteHistory } from "./helpers/poll-fixtures.js";
import type { Choice, Poll } from "../src/polls/store.js";

let ctx: TestContext;
let cookie = "";

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MAX_CHOICES: "4" });
  ({ cookie } = await forgeSession(ctx, ctx.config.admins[0]!));
});

afterAll(async () => {
  await ctx.stop();
});

beforeEach(async () => {
  await polls(ctx).deleteMany({});
  await voteHistory(ctx).deleteMany({});
});

const STORED: Choice[] = [
  { id: "x", label: "X", position: 0 },
  { id: "y", label: "Y", position: 1 },
  { id: "z", label: "Z", position: 2, color: "#FFE5AD" }
];

async function seed(overrides: Partial<Poll>, withVotes: boolean) {
  const poll = makePoll({ pollState: "OPEN", pollVisibility: "Private Poll", choices: STORED, ...overrides });
  await polls(ctx).insertOne(poll);
  if (withVotes) {
    await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "v@example.com", userName: "v", choiceIds: ["z"], votedAt: new Date() });
  }
  return poll;
}

const post = (pid: string, route: "publish" | "save", body: Record<string, unknown>) =>
  request(ctx.app).post(`/api/admin/polls/${pid}/${route}`).set("Cookie", cookie).send(body);

const reload = async (pid: string) => (await polls(ctx).findOne({ _id: pid }))!;

describe("an ever-voted poll (mergeChoices)", () => {
  it("keeps a choice added since the card opened, with its id and colour, beside the creator's addition", async () => {
    const poll = await seed({}, true);
    const res = await post(poll._id, "publish", { labels: ["X", "Y", "W"], colors: [null, null, null], baseChoiceIds: ["x", "y"] });
    expect(res.status).toBe(200);
    const pending = (await reload(poll._id)).pendingUpdate!.choices!;
    expect(pending.map((c) => c.label).sort()).toEqual(["W", "X", "Y", "Z"]);
    const z = pending.find((c) => c.label === "Z")!;
    expect(z.id).toBe("z");
    expect(z.color).toBe("#FFE5AD");
  });

  it("still deletes what the creator removed", async () => {
    const poll = await seed({}, true);
    await post(poll._id, "publish", { labels: ["X"], colors: [null], baseChoiceIds: ["x", "y"] });
    expect((await reload(poll._id)).pendingUpdate!.choices!.map((c) => c.label)).toEqual(["X", "Z"]);
  });

  it("behaves as before without baseChoiceIds", async () => {
    const poll = await seed({}, true);
    await post(poll._id, "publish", { labels: ["X", "Y", "W"], colors: [null, null, null] });
    expect((await reload(poll._id)).pendingUpdate!.choices!.map((c) => c.label)).toEqual(["X", "Y", "W"]);
  });

  it("refuses a combined list above the most choices allowed", async () => {
    const poll = await seed({ choices: [...STORED, { id: "v", label: "V", position: 3 }] }, true);
    const res = await post(poll._id, "publish", { labels: ["X", "Y", "W"], colors: [null, null, null], baseChoiceIds: ["x", "y"] });
    expect(res.status).toBe(400);
    expect((await reload(poll._id)).pendingUpdate).toBeNull();
  });
});

describe("a never-voted poll (replaceChoices)", () => {
  it("keeps the added choice and its colour on /publish", async () => {
    const poll = await seed({}, false);
    const res = await post(poll._id, "publish", { labels: ["X", "Y", "W"], colors: [null, null, null], baseChoiceIds: ["x", "y"] });
    expect(res.status).toBe(200);
    const choices = (await reload(poll._id)).choices;
    // The added choice follows the submitted labels (R10).
    expect(choices.map((c) => c.label)).toEqual(["X", "Y", "W", "Z"]);
    expect(choices.find((c) => c.label === "Z")!.color).toBe("#FFE5AD");
  });

  it("keeps the added choice on /save, and drops what the creator removed", async () => {
    const poll = await seed({ pollState: "INITIALIZED" }, false);
    const res = await post(poll._id, "save", { labels: ["Y"], colors: [null], baseChoiceIds: ["x", "y"] });
    expect(res.status).toBe(200);
    expect((await reload(poll._id)).choices.map((c) => c.label)).toEqual(["Y", "Z"]);
  });
});
