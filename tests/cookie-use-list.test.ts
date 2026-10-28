import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AGREED, extractLinkPath, followSignInLink, startTestContext, type TestContext } from "./helpers/setup.js";

let ctx: TestContext;
const publicDir = path.resolve("src/public");

beforeAll(async () => {
  // both mode, so the email flows and a provider sign-in each set their cookies.
  ctx = await startTestContext({
    ENV_SIGNIN_METHOD: "both",
    ENV_OAUTH_GOOGLE_CLIENT_ID: "google-client",
    ENV_OAUTH_GOOGLE_CLIENT_SECRET: "google-secret"
  });
});
afterAll(async () => {
  await ctx.stop();
});

function listed(storage: string): string[] {
  const html = readFileSync(path.join(publicDir, "privacy.html"), "utf8");
  return [...html.matchAll(/<tr data-storage="([a-z]+)" data-name="([^"]+)">/g)].filter((m) => m[1] === storage).map((m) => m[2]!).sort();
}

function cookieNames(res: request.Response): string[] {
  const set = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  return set.map((c) => c.split("=")[0]!);
}

function storageKeys(kind: "localStorage" | "sessionStorage"): string[] {
  const keys = new Set<string>();
  for (const name of readdirSync(publicDir).filter((n) => n.endsWith(".js"))) {
    const js = readFileSync(path.join(publicDir, name), "utf8");
    const constants = new Map([...js.matchAll(/const ([A-Z_]+) = "([^"]+)";/g)].map((m) => [m[1]!, m[2]!]));
    for (const m of js.matchAll(new RegExp(`${kind}\\.(?:getItem|setItem|removeItem)\\(\\s*(?:"([^"]+)"|([A-Z_]+))`, "g"))) {
      keys.add(m[1] ?? constants.get(m[2]!) ?? `unresolved:${m[2]}`);
    }
  }
  return [...keys].sort();
}

describe("the Cookie Use list matches what the site stores (FR-024, R13)", () => {
  it("lists exactly the cookies the server sets", async () => {
    const seen = new Set<string>();
    const created = await request(ctx.app).post("/api/auth/create-account").set("x-forwarded-for", "10.50.0.1").send({ ...AGREED, email: "cookies@example.org" });
    cookieNames(created).forEach((n) => seen.add(n));
    const verified = await followSignInLink(ctx, extractLinkPath(ctx.sent.at(-1)!));
    cookieNames(verified).forEach((n) => seen.add(n));
    const started = await request(ctx.app).post("/api/auth/sign-in/social").send({ provider: "google", callbackURL: "/" });
    cookieNames(started).forEach((n) => seen.add(n));
    expect([...seen].sort()).toEqual(listed("cookie"));
  });

  it("lists exactly the local and session storage keys the pages use", () => {
    expect(storageKeys("localStorage")).toEqual(listed("local"));
    expect(storageKeys("sessionStorage")).toEqual(listed("session"));
  });
});
