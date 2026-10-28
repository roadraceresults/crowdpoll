import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { sessionKey, sessionTokenOf } from "../src/auth/sessionCache.js";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_SESSION_CACHE_TTL: "300000" });
});

afterAll(async () => {
  await ctx.stop();
});

function tokenOfCookie(cookie: string): string {
  return sessionTokenOf({ headers: { cookie } } as never)!;
}

function countSessionQueries(): number {
  return ctx.queries.filter((q) => /from "session"/.test(q)).length;
}

describe("session cache-aside", () => {
  it("answers the second lookup from the cache without touching the session table", async () => {
    const { cookie } = await forgeSession(ctx, "cached@example.com");
    const first = await request(ctx.app).get("/api/me").set("Cookie", cookie);
    expect(first.status).toBe(200);
    const key = sessionKey(tokenOfCookie(cookie));
    expect(await ctx.cache.get(key)).not.toBeNull();

    const before = countSessionQueries();
    const second = await request(ctx.app).get("/api/me").set("Cookie", cookie);
    expect(second.status).toBe(200);
    expect(second.body.emailAddress).toBe("cached@example.com");
    expect(countSessionQueries()).toBe(before);
  });

  it("caches the user's permissions and terms version with the session and reads them once per miss", async () => {
    const { cookie, userId } = await forgeSession(ctx, "grants@example.com");
    await ctx.db.updateTable("user").set({ terms_version: "2001-01-01" }).where("id", "=", userId).execute();
    const permissionReads = () => ctx.queries.filter((q) => /select "permissions", "terms_version" from "user"/.test(q)).length;

    const before = permissionReads();
    await request(ctx.app).get("/api/me").set("Cookie", cookie);
    expect(permissionReads()).toBe(before + 1);
    const cached = JSON.parse((await ctx.cache.get(sessionKey(tokenOfCookie(cookie))))!);
    expect(cached.user.permissions).toEqual(["View Polls", "Vote on Polls", "Create Poll"]);
    expect(cached.user.termsVersion).toBe("2001-01-01");

    await request(ctx.app).get("/api/me").set("Cookie", cookie);
    expect(permissionReads()).toBe(before + 1);
  });

  it("bounds the entry's ttl by the configured ttl", async () => {
    const { cookie } = await forgeSession(ctx, "ttl@example.com");
    await request(ctx.app).get("/api/me").set("Cookie", cookie);
    const ttl = await ctx.cache.pttl(sessionKey(tokenOfCookie(cookie)));
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(300_000);
  });

  it("never serves an entry past the session's own expiry", async () => {
    const { cookie } = await forgeSession(ctx, "expiring@example.com");
    await request(ctx.app).get("/api/me").set("Cookie", cookie);
    const key = sessionKey(tokenOfCookie(cookie));
    const cached = JSON.parse((await ctx.cache.get(key))!);
    cached.session.expiresAt = new Date(Date.now() - 1000).toISOString();
    await ctx.cache.set(key, JSON.stringify(cached), 300_000);
    await ctx.db
      .updateTable("session")
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where("token", "=", tokenOfCookie(cookie))
      .execute();
    const res = await request(ctx.app).get("/api/me").set("Cookie", cookie);
    expect(res.status).toBe(401);
    expect(await ctx.cache.get(key)).toBeNull();
  });

  it("logout deletes the cached entry and the session is gone at once", async () => {
    const { cookie } = await forgeSession(ctx, "logout@example.com");
    await request(ctx.app).get("/api/me").set("Cookie", cookie);
    const key = sessionKey(tokenOfCookie(cookie));
    expect(await ctx.cache.get(key)).not.toBeNull();
    const out = await request(ctx.app).post("/api/auth/logout").set("Cookie", cookie);
    expect(out.status).toBe(204);
    expect(await ctx.cache.get(key)).toBeNull();
    expect((await request(ctx.app).get("/api/me").set("Cookie", cookie)).status).toBe(401);
  });

  it("a profile rename drops the cached copy so the new name is served", async () => {
    const { cookie } = await forgeSession(ctx, "rename@example.com");
    await request(ctx.app).get("/api/me").set("Cookie", cookie);
    const renamed = await request(ctx.app).patch("/api/me").set("Cookie", cookie).send({ userName: "renamed-user" });
    expect(renamed.status).toBe(200);
    const me = await request(ctx.app).get("/api/me").set("Cookie", cookie);
    expect(me.body.userName).toBe("renamed-user");
  });

  it("endSession is the only caller of sign-out anywhere in src/", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (full.endsWith(".ts")) files.push(full);
      }
    };
    walk(path.resolve("src"));
    const callers = files.filter((f) => /api\.signOut\(/.test(readFileSync(f, "utf8")));
    expect(callers.map((f) => path.relative(path.resolve("src"), f).split(path.sep).join("/"))).toEqual(["auth/sessionCache.ts"]);
  });
});
