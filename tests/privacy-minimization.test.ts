import { readdirSync, readFileSync } from "node:fs";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AGREED, clearPolls, extractLinkPath, followSignInLink, forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
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

// Last: a second context takes over the mail transport from the suites above.
describe("device evidence stays out of reach and out of the log (R5, R11)", () => {
  const KEY = "device-evidence-test-key-0123456789";
  const FINGERPRINT = `${"a".repeat(32)}.${"b".repeat(32)}`;
  let collecting: TestContext;

  beforeAll(async () => {
    collecting = await startTestContext({ ENV_DEVICE_EVENTS_ENABLED: "true", ENV_DEVICE_EVENTS_KEY: KEY });
  });
  afterAll(async () => {
    await collecting.stop();
  });

  it("no route reads the table", () => {
    for (const name of readdirSync("src/routes")) {
      expect(readFileSync(`src/routes/${name}`, "utf8"), name).not.toContain("device_events");
    }
  });

  it("publishes the switch and never the key", async () => {
    const res = await request(collecting.app).get("/api/config");
    expect(res.body.deviceEventsEnabled).toBe(true);
    expect(res.text).not.toContain(KEY);
  });

  it("logs no raw value, hash or key for a session that signs in and votes", async () => {
    const lines: string[] = [];
    const capture = (...args: unknown[]) => void lines.push(args.map(String).join(" "));
    const spies = (["log", "info", "warn", "error"] as const).map((method) => vi.spyOn(console, method).mockImplementation(capture));
    const { cookie } = await forgeSession(collecting, "quiet@example.org");
    const poll = makePoll();
    await polls(collecting).insertOne(poll);
    expect((await request(collecting.app).post("/api/me/device-sign-in").set("Cookie", cookie).set("X-Device-Fingerprint", FINGERPRINT)).status).toBe(204);
    expect((await request(collecting.app).post(`/api/polls/${poll._id}/vote`).set("Cookie", cookie).set("X-Device-Fingerprint", FINGERPRINT).send({ choiceIds: ["c1"] })).status).toBe(200);
    await collecting.consumer.runOnce();
    for (const spy of spies) spy.mockRestore();

    const stored = await collecting.db.selectFrom("device_events").select(["browser_hash", "hardware_hash"]).execute();
    expect(stored.length).toBe(2);
    const log = lines.join("\n");
    for (const secret of [FINGERPRINT, "a".repeat(32), "b".repeat(32), KEY, ...stored.flatMap((r) => [r.browser_hash!, r.hardware_hash!])]) {
      expect(log).not.toContain(secret);
    }
  });
});
