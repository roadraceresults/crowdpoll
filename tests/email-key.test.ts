import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { sql } from "kysely";
import { emailKey, emailKeyOf } from "../src/auth/emailKey.js";
import { AGREED, extractLinkPath, forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";

let ctx: TestContext;
let next = 1;
const freshIp = () => `10.8.0.${next++}`;

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});

async function userEmails(): Promise<string[]> {
  const rows = await ctx.db.selectFrom("user").select("email").execute();
  return rows.map((row) => row.email);
}

function createAccount(email: string) {
  return request(ctx.app).post("/api/auth/create-account").set("x-forwarded-for", freshIp()).send({ ...AGREED, email });
}

describe("one mailbox, one account (FR-024–FR-028)", () => {
  it("a Gmail plus-tag and dot variant creates no account and signs in the existing one", async () => {
    await forgeSession(ctx, "jsmith@gmail.com");
    const before = ctx.sent.length;
    const res = await createAccount("j.smith+polls@googlemail.com");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Check your inbox" });
    expect(await userEmails()).not.toContain("j.smith+polls@googlemail.com");
    expect(ctx.sent.length).toBe(before + 1);
    expect(ctx.sent.at(-1)!.to).toBe("jsmith@gmail.com");
    expect(ctx.sent.at(-1)!.subject).toBe("Your CrowdPoll sign-in link");
  });

  it("drops plus-tags on every domain but keeps dots outside Gmail", async () => {
    await forgeSession(ctx, "ann@example.org");
    await createAccount("ann+x@example.org");
    expect(await userEmails()).not.toContain("ann+x@example.org");
    expect(ctx.sent.at(-1)!.to).toBe("ann@example.org");

    await createAccount("a.nn@example.org");
    expect(await userEmails()).toContain("a.nn@example.org");
  });

  it("refuses an email change to a variant of another account's address", async () => {
    await forgeSession(ctx, "taken@gmail.com");
    const { cookie } = await forgeSession(ctx, "changer@example.org");
    const res = await request(ctx.app)
      .post("/api/me/email-change")
      .set("Cookie", cookie)
      .set("x-forwarded-for", freshIp())
      .send({ newEmail: "t.a.k.e.n+x@gmail.com" });
    expect(res.status).toBe(409);
  });

  it("refuses at verification when the variant was taken after the request", async () => {
    const { cookie } = await forgeSession(ctx, "racer@example.org");
    const res = await request(ctx.app)
      .post("/api/me/email-change")
      .set("Cookie", cookie)
      .set("x-forwarded-for", freshIp())
      .send({ newEmail: "late.comer+r@gmail.com" });
    expect(res.status).toBe(202);
    const link = extractLinkPath(ctx.sent.at(-1)!);
    await forgeSession(ctx, "latecomer@gmail.com");
    const verify = await request(ctx.app).get(link).redirects(0);
    expect(verify.headers.location).toBe("/profile?error=invalid-link");
    expect(await userEmails()).toContain("racer@example.org");
  });

  it("lets a user change to a plus-tag variant of their own address", async () => {
    const { cookie } = await forgeSession(ctx, "self@example.org");
    const res = await request(ctx.app)
      .post("/api/me/email-change")
      .set("Cookie", cookie)
      .set("x-forwarded-for", freshIp())
      .send({ newEmail: "self+polls@example.org" });
    expect(res.status).toBe(202);
  });

  it("leaves existing accounts that already share a key working", async () => {
    await forgeSession(ctx, "twin@gmail.com");
    await forgeSession(ctx, "t.win@gmail.com");
    for (const email of ["twin@gmail.com", "t.win@gmail.com"]) {
      const res = await request(ctx.app)
        .post("/api/auth/request-login-link")
        .set("x-forwarded-for", freshIp())
        .send({ email, staySignedIn: false });
      expect(res.status).toBe(200);
      expect(ctx.sent.at(-1)!.to).toBe(email);
      expect(ctx.sent.at(-1)!.subject).toBe("Your CrowdPoll sign-in link");
    }
  });
});

describe("emailKeyOf, the TypeScript twin of emailKey", () => {
  it("agrees with the SQL expression", async () => {
    for (const address of ["a.b+c@gmail.com", "a.b@googlemail.com", "x+y@example.org", "plain@example.org", "dots.stay@example.org"]) {
      const { rows } = await sql<{ key: string }>`select ${emailKey(address)} as key`.execute(ctx.db);
      expect(emailKeyOf(address)).toBe(rows[0]!.key);
    }
  });
});
