import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AGREED, startTestContext, type TestContext } from "./helpers/setup.js";
import { TERMS_VERSION } from "../src/legal/version.js";

let ctx: TestContext;
let nextIp = 1;
const freshIp = () => `10.31.0.${nextIp++}`;

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});

const createAccount = (body: Record<string, unknown>, ip = freshIp()) =>
  request(ctx.app).post("/api/auth/create-account").set("x-forwarded-for", ip).send(body);

const userRow = (email: string) =>
  ctx.db.selectFrom("user").select(["id", "terms_version", "terms_accepted_at"]).where("email", "=", email).executeTakeFirst();

describe("create-account requires the Terms (A3, R4)", () => {
  it("refuses a request without the agreement, creating nothing and sending nothing", async () => {
    const before = ctx.sent.length;
    const res = await createAccount({ email: "no-terms@example.org" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Please accept the Terms of Service to create an account.", code: "terms-required" });
    expect(await userRow("no-terms@example.org")).toBeUndefined();
    expect(ctx.sent.length).toBe(before);
  });

  it("refuses an agreement to another version, asking for a reload", async () => {
    const res = await createAccount({ email: "old-terms@example.org", acceptedTerms: true, termsVersion: "2000-01-01" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "The Terms of Service have changed. Reload the page and accept them again.",
      code: "terms-required"
    });
    expect(await userRow("old-terms@example.org")).toBeUndefined();
  });

  it("consumes no rate-limit slot when it refuses", async () => {
    const ip = freshIp();
    for (let i = 0; i < 3; i++) expect((await createAccount({ email: `slot${i}@example.org` }, ip)).status).toBe(400);
    expect((await createAccount({ ...AGREED, email: "slot-ok@example.org" }, ip)).status).toBe(200);
  });

  it("records the version and the time on a new account", async () => {
    const res = await createAccount({ ...AGREED, email: "agreed@example.org" });
    expect(res.status).toBe(200);
    const user = await userRow("agreed@example.org");
    expect(user?.terms_version).toBe(TERMS_VERSION);
    expect(user?.terms_accepted_at).toBeInstanceOf(Date);
  });

  it("stamps an existing account submitted with the agreement", async () => {
    await createAccount({ ...AGREED, email: "again@example.org" });
    const first = await userRow("again@example.org");
    await ctx.db.updateTable("user").set({ terms_version: null, terms_accepted_at: null }).where("id", "=", first!.id).execute();
    expect((await createAccount({ ...AGREED, email: "again@example.org" })).status).toBe(200);
    const second = await userRow("again@example.org");
    expect(second?.terms_version).toBe(TERMS_VERSION);
    expect(second?.terms_accepted_at).toBeInstanceOf(Date);
  });
});
