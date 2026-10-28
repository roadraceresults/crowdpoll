import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, withoutAgreement, type TestContext } from "./helpers/setup.js";
import { TERMS_VERSION } from "../src/legal/version.js";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});

async function unaccepted(email: string) {
  const session = await forgeSession(ctx, email);
  await withoutAgreement(ctx, session.userId);
  return session;
}

const accept = (cookie: string | null, body: Record<string, unknown>, origin = "http://127.0.0.1") => {
  const req = request(ctx.app).post("/api/legal/accept-terms").set("Host", "127.0.0.1").set("Origin", origin);
  return (cookie ? req.set("Cookie", cookie) : req).send(body);
};

describe("POST /api/legal/accept-terms (A7, R6)", () => {
  it("refuses a foreign Origin", async () => {
    const { cookie } = await unaccepted("accept-origin@example.org");
    const res = await accept(cookie, { termsVersion: TERMS_VERSION }, "https://evil.example");
    expect(res.status).toBe(403);
  });

  it("refuses a guest", async () => {
    const res = await accept(null, { termsVersion: TERMS_VERSION });
    expect(res.status).toBe(401);
  });

  it("refuses another version", async () => {
    const { cookie } = await unaccepted("accept-old@example.org");
    const res = await accept(cookie, { termsVersion: "2000-01-01" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("terms-required");
  });

  it("records the agreement, returns a safe redirect, and opens the gate", async () => {
    const { cookie, userId } = await unaccepted("accept-ok@example.org");
    expect((await request(ctx.app).get("/api/me/polls?tab=your-polls").set("Cookie", cookie)).status).toBe(403);
    const res = await accept(cookie, { termsVersion: TERMS_VERSION, next: "/profile" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ redirect: "/profile" });
    const row = await ctx.db.selectFrom("user").select(["terms_version", "terms_accepted_at"]).where("id", "=", userId).executeTakeFirstOrThrow();
    expect(row.terms_version).toBe(TERMS_VERSION);
    expect(row.terms_accepted_at).toBeInstanceOf(Date);
    expect((await request(ctx.app).get("/api/me/polls?tab=your-polls").set("Cookie", cookie)).status).toBe(200);
  });

  it("never redirects off the site", async () => {
    for (const next of ["//evil.example", "https://evil.example", "javascript:alert(1)", "/\\evil.example"]) {
      const { cookie } = await unaccepted(`accept-next-${Math.random().toString(36).slice(2)}@example.org`);
      const res = await accept(cookie, { termsVersion: TERMS_VERSION, next });
      expect(res.body.redirect, next).toBe("/");
    }
  });
});

describe("GET /accept-terms (A6)", () => {
  it("shows the page to a signed-in user who has not accepted", async () => {
    const { cookie } = await unaccepted("accept-page@example.org");
    const res = await request(ctx.app).get("/accept-terms?next=%2Fprofile").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.text).toContain("acceptTermsCard.js");
  });

  it("sends a guest or an accepted user on to the page they asked for", async () => {
    expect((await request(ctx.app).get("/accept-terms?next=%2Fprivacy")).headers.location).toBe("/privacy");
    const { cookie } = await forgeSession(ctx, "accept-done@example.org");
    const res = await request(ctx.app).get("/accept-terms?next=%2F%2Fevil.example").set("Cookie", cookie);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/");
  });
});
