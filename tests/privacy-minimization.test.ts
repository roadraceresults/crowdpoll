import { readFileSync } from "node:fs";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AGREED, clearPolls, extractLinkPath, followSignInLink, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll } from "./helpers/poll-fixtures.js";
import { insertPoll } from "../src/polls/store.js";
import { castVote } from "../src/votes/votePath.js";
import { maskIp } from "../src/auth/maskIp.js";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MAX_VOTES_PER_IP_PER_MINUTE: "1" });
});
afterAll(async () => {
  await ctx.stop();
});

describe("maskIp (R10)", () => {
  it("keeps the network part only", () => {
    expect(maskIp("203.0.113.42")).toBe("203.0.113.x");
    expect(maskIp("::ffff:203.0.113.42")).toBe("203.0.113.x");
    expect(maskIp("2001:db8:85a3:8d3:1319:8a2e:370:7348")).toBe("2001:db8:85a3::x");
    expect(maskIp("")).toBe("unknown");
  });
});

describe("sessions keep no IP address or user agent (FR-021)", () => {
  it("stores neither when a sign-in link is followed", async () => {
    await request(ctx.app).post("/api/auth/create-account").set("x-forwarded-for", "198.51.100.7").set("User-Agent", "Test/1.0").send({ ...AGREED, email: "no-ip@example.org" });
    const res = await followSignInLink(ctx, extractLinkPath(ctx.sent.at(-1)!)).set("x-forwarded-for", "198.51.100.7").set("User-Agent", "Test/1.0");
    expect(res.status).toBe(302);
    const user = await ctx.db.selectFrom("user").select("id").where("email", "=", "no-ip@example.org").executeTakeFirstOrThrow();
    const session = await ctx.db.selectFrom("session").select(["ipAddress", "userAgent"]).where("userId", "=", user.id).executeTakeFirstOrThrow();
    expect(session).toEqual({ ipAddress: null, userAgent: null });
  });
});

describe("log lines never carry a full address (FR-022)", () => {
  it("masks IPs and email addresses across sign-up, sign-in, limits, votes and deletion", async () => {
    await clearPolls(ctx);
    const ip = "203.0.113.77";
    const email = "logged-person@example.org";
    const log = vi.spyOn(console, "log");
    const error = vi.spyOn(console, "error");
    try {
      for (let i = 0; i < 3; i++) {
        await request(ctx.app).post("/api/auth/create-account").set("x-forwarded-for", ip).send({ ...AGREED, email });
      }
      for (let i = 0; i < 3; i++) {
        await request(ctx.app).post("/api/auth/request-login-link").set("x-forwarded-for", ip).send({ email, staySignedIn: false });
      }
      const link = ctx.sent.filter((m) => m.to === email).at(0)!;
      const signedIn = await followSignInLink(ctx, extractLinkPath(link));
      const cookie = String(signedIn.headers["set-cookie"]).split(";")[0]!;
      const user = await ctx.db.selectFrom("user").select("id").where("email", "=", email).executeTakeFirstOrThrow();
      const poll = makePoll();
      await insertPoll(ctx, poll, { id: user.id, name: "p", email });
      for (const choice of ["c1", "c2"]) {
        await castVote(ctx, { sessionId: `s-${choice}`, email: `${choice}-${email}`, userName: "v", ip, pid: poll._id, choiceIds: [choice] }).catch(() => undefined);
      }
      await request(ctx.app).post("/api/me/email-change").set("x-forwarded-for", ip).set("Cookie", cookie).send({ newEmail: "new-logged@example.org" });
      await request(ctx.app).delete("/api/me").set("Host", "127.0.0.1").set("Origin", "http://127.0.0.1").set("Cookie", cookie).send({ confirm: "DELETE" });
      const lines = [...log.mock.calls, ...error.mock.calls].map((c) => c.map(String).join(" "));
      const all = lines.join("\n");
      expect(all).toContain("203.0.113.x");
      expect(all).not.toContain(ip);
      expect(all).not.toContain(email);
      expect(all).not.toContain("new-logged@example.org");
    } finally {
      log.mockRestore();
      error.mockRestore();
    }
  });
});

describe("the Privacy Policy on invitations (C7, R12)", () => {
  it("has the #invitations paragraph naming the one reminder", () => {
    const html = readFileSync("src/public/privacy.html", "utf8");
    const paragraph = /<p id="invitations">([\s\S]*?)<\/p>/.exec(html)?.[1] ?? "";
    expect(paragraph).toContain("at most one reminder");
    expect(paragraph).toContain("only for that poll");
    expect(paragraph).toContain("privacy@crowdpoll.vote");
  });
});
