/**
 * The poll wizard in `src/public/adminCard.js` carries its own copies of the
 * server's length limits, so the two are compared here.
 */
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as service from "../src/polls/service.js";
import { INVITATION_MESSAGE_MAX, NOTES_MAX } from "../src/polls/notes.js";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";

const adminCard = readFileSync("src/public/adminCard.js", "utf8");

function browserCopy(name: string): number {
  const match = new RegExp(`const ${name} = (\\d+);`).exec(adminCard);
  if (!match) throw new Error(`adminCard.js has no ${name}`);
  return Number(match[1]);
}

describe("field length limits", () => {
  it.each([
    ["TITLE_MAX", service.TITLE_MAX, 60],
    ["SUBTITLE_MAX", service.SUBTITLE_MAX, 40],
    ["CHOICE_LABEL_MAX", service.CHOICE_LABEL_MAX, 35]
  ])("%s is the same in the browser as on the server", (name, serverValue, expected) => {
    expect(serverValue).toBe(expected);
    expect(browserCopy(name)).toBe(serverValue);
  });

  it("NOTES_MAX is the same in the notes editor as on the server", () => {
    expect(NOTES_MAX).toBe(6000);
    const match = /const NOTES_MAX = (\d+);/.exec(readFileSync("src/public/notesEditor.js", "utf8"));
    expect(Number(match?.[1])).toBe(NOTES_MAX);
  });

  it("has one choice-label limit", () => {
    expect(service).not.toHaveProperty("WIZARD_CHOICE_MAX");
  });
});

describe("custom email message limit", () => {
  const CREATOR = "field-limits-creator@example.com";
  let ctx: TestContext;
  let cookie = "";

  beforeAll(async () => {
    ctx = await startTestContext({ ENV_ADMINS: CREATOR });
    cookie = (await forgeSession(ctx, CREATOR)).cookie;
  });

  afterAll(async () => {
    await ctx.stop();
  });

  beforeEach(async () => {
    await polls(ctx).deleteMany({});
  });

  const save = (pid: string, body: Record<string, unknown>) =>
    request(ctx.app).post(`/api/admin/polls/${pid}/save`).set("Cookie", cookie).send({ clientGuid: "tab-1", ...body });
  const publish = (pid: string, body: Record<string, unknown>) =>
    request(ctx.app).post(`/api/admin/polls/${pid}/publish`).set("Cookie", cookie).send(body);
  const stored = async (pid: string) => (await polls(ctx).findOne({ _id: pid }))!.invitationMessage;

  async function draft() {
    const poll = makePoll({ pollState: "INITIALIZED" });
    await polls(ctx).insertOne(poll);
    expect((await request(ctx.app).post(`/api/admin/polls/${poll._id}/edit-session`).set("Cookie", cookie)
      .send({ clientGuid: "tab-1" })).status).toBe(200);
    return poll;
  }

  it("is 1000", () => {
    expect(INVITATION_MESSAGE_MAX).toBe(1000);
  });

  it("save accepts 1000 characters and refuses 1001 or a value that is not text", async () => {
    const poll = await draft();
    expect((await save(poll._id, { invitationMessage: "x".repeat(1000) })).status).toBe(200);
    expect(await stored(poll._id)).toBe("x".repeat(1000));
    const tooLong = await save(poll._id, { invitationMessage: "x".repeat(1001) });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error ?? tooLong.body.message).toBe("Custom email message must be at most 1000 characters.");
    expect((await save(poll._id, { invitationMessage: 12 })).status).toBe(400);
  });

  it("publish accepts 1000 characters and refuses 1001", async () => {
    const accepted = makePoll({ pollState: "INITIALIZED" });
    await polls(ctx).insertOne(accepted);
    expect((await publish(accepted._id, { invitationMessage: "y".repeat(1000) })).status).toBe(200);
    expect(await stored(accepted._id)).toBe("y".repeat(1000));
    const refused = makePoll({ pollState: "INITIALIZED" });
    await polls(ctx).insertOne(refused);
    const tooLong = await publish(refused._id, { invitationMessage: "y".repeat(1001) });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error ?? tooLong.body.message).toBe("Custom email message must be at most 1000 characters.");
  });

  it("stores a message with no visible text as empty", async () => {
    const poll = await draft();
    expect((await save(poll._id, { invitationMessage: "  \n ** ** " })).status).toBe(200);
    expect(await stored(poll._id)).toBe("");
  });
});
