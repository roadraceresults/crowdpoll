import { existsSync } from "node:fs";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { startTestContext, forgeSession, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";

const ADMIN_EMAIL = "admin@example.com";

describe("Poll Results and the exports are removed", () => {
  let ctx: TestContext;
  let ownerCookie: string;
  let adminCookie: string;
  let pid: string;

  beforeAll(async () => {
    ctx = await startTestContext({ ENV_ADMINS: ADMIN_EMAIL });
    const owner = await forgeSession(ctx, "results-owner@example.com");
    ownerCookie = owner.cookie;
    adminCookie = (await forgeSession(ctx, ADMIN_EMAIL)).cookie;
    const poll = makePoll({
      currentVotes: [{ emailAddress: "v1@example.com", userName: "v1", choiceIds: ["c1"], votedAt: new Date() }]
    });
    await polls(ctx).insertOne(poll);
    await ctx.db.updateTable("polls").set({ created_by_id: owner.userId }).where("id", "=", poll._id).execute();
    pid = poll._id;
  });
  afterAll(async () => {
    await ctx.stop();
  });

  const removed = () => [
    `/admin/poll/results?PID=${pid}`,
    `/api/admin/polls/${pid}/results`,
    `/api/admin/polls/${pid}/export.json`,
    `/api/admin/polls/${pid}/export.md`
  ];

  it("still serves the owner and the administrator the poll's admin detail", async () => {
    for (const cookie of [ownerCookie, adminCookie]) {
      expect((await request(ctx.app).get(`/api/admin/polls/${pid}`).set("Cookie", cookie)).status).toBe(200);
    }
  });

  it("answers 404 to the poll's owner on each removed address", async () => {
    for (const url of removed()) {
      expect((await request(ctx.app).get(url).set("Cookie", ownerCookie)).status, url).toBe(404);
    }
  });

  it("answers 404 to an administrator on each removed address", async () => {
    for (const url of removed()) {
      expect((await request(ctx.app).get(url).set("Cookie", adminCookie)).status, url).toBe(404);
    }
  });

  it("has neither the page nor its script", () => {
    expect(existsSync("src/public/admin-results.html")).toBe(false);
    expect(existsSync("src/public/adminResults.js")).toBe(false);
  });
});
