import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { AGREED, forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";

let ctx: TestContext;
let next = 1;
const freshIp = () => `10.9.0.${next}`;
const freshEmail = () => `honeypot${next++}@example.com`;

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});

async function userCount(email: string): Promise<number> {
  const rows = await ctx.db.selectFrom("user").select("id").where("email", "=", email).execute();
  return rows.length;
}

describe("the hidden homepage field (FR-013–FR-015)", () => {
  it("create-account with the field filled replies as on success and sends nothing", async () => {
    const email = freshEmail();
    const before = ctx.sent.length;
    const res = await request(ctx.app)
      .post("/api/auth/create-account")
      .set("x-forwarded-for", freshIp())
      .send({ ...AGREED, email, homepage: "https://spam.example" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Check your inbox" });
    expect(ctx.sent.length).toBe(before);
    expect(await userCount(email)).toBe(0);
  });

  it("request-login-link with the field filled replies as on success and sends nothing", async () => {
    const before = ctx.sent.length;
    const res = await request(ctx.app)
      .post("/api/auth/request-login-link")
      .set("x-forwarded-for", freshIp())
      .send({ email: freshEmail(), staySignedIn: false, homepage: "x" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Check your inbox" });
    expect(ctx.sent.length).toBe(before);
  });

  it("email-change with the field filled replies as on success and sends nothing", async () => {
    const { cookie } = await forgeSession(ctx, freshEmail());
    const before = ctx.sent.length;
    const res = await request(ctx.app)
      .post("/api/me/email-change")
      .set("Cookie", cookie)
      .set("x-forwarded-for", freshIp())
      .send({ newEmail: freshEmail(), homepage: "x" });
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ message: "Verification sent to new address" });
    expect(ctx.sent.length).toBe(before);
  });

  it("does not use up the per-client rate limit", async () => {
    const ip = freshIp();
    const email = freshEmail();
    for (let i = 0; i < 3; i++) {
      await request(ctx.app).post("/api/auth/request-login-link").set("x-forwarded-for", ip).send({ email, homepage: "x" });
    }
    const before = ctx.sent.length;
    const res = await request(ctx.app)
      .post("/api/auth/request-login-link")
      .set("x-forwarded-for", ip)
      .send({ email, staySignedIn: false });
    expect(res.status).toBe(200);
    expect(ctx.sent.length).toBe(before + 1);
  });

  it("treats a missing or empty field as a normal request", async () => {
    const ip = freshIp();
    const before = ctx.sent.length;
    await request(ctx.app).post("/api/auth/request-login-link").set("x-forwarded-for", ip).send({ email: freshEmail() });
    await request(ctx.app)
      .post("/api/auth/request-login-link")
      .set("x-forwarded-for", ip)
      .send({ email: freshEmail(), homepage: "" });
    expect(ctx.sent.length).toBe(before + 2);
  });
});
