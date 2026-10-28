/**
 * Apple's domain-association file (research R10, contracts/api.md A5): served as text to anyone, never
 * gated, and 404 while it has not been committed.
 */
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { forgeSession, startTestContext, withoutAgreement, type TestContext } from "./helpers/setup.js";

const ROUTE = "/.well-known/apple-developer-domain-association.txt";
const dir = path.resolve("src/public/.well-known");
const file = path.join(dir, "apple-developer-domain-association.txt");
const kept = `${file}.kept-by-test`;
const hadDir = existsSync(dir);

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestContext();
  if (existsSync(file)) renameSync(file, kept);
});
afterAll(async () => {
  rmSync(file, { force: true });
  if (existsSync(kept)) renameSync(kept, file);
  if (!hadDir) rmSync(dir, { recursive: true, force: true });
  await ctx.stop();
});

describe("GET /.well-known/apple-developer-domain-association.txt", () => {
  it("answers 404 while the file is absent", async () => {
    expect((await request(ctx.app).get(ROUTE)).status).toBe(404);
  });

  it("serves the file as text to a guest and to a user who has not accepted the Terms", async () => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, "apple-association-test-content");

    const guest = await request(ctx.app).get(ROUTE);
    expect(guest.status).toBe(200);
    expect(guest.headers["content-type"]).toMatch(/^text\/plain/);
    expect(guest.text).toBe("apple-association-test-content");

    const { cookie, userId } = await forgeSession(ctx, "not-agreed@example.com");
    await withoutAgreement(ctx, userId);
    const member = await request(ctx.app).get(ROUTE).set("Cookie", cookie).redirects(0);
    expect(member.status).toBe(200);
    expect(member.text).toBe("apple-association-test-content");
  });
});
