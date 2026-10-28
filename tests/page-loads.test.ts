import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import { trendingSweep } from "../src/polls/sweeps.js";
import { createAssetServing, IMMUTABLE_CACHE } from "../src/routes/assets.js";
import { PAGE_LOAD_KEY } from "../src/load/pageLoads.js";

let ctx: TestContext;
let page: BrowserPage | null = null;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_PAGE_LOADS_PER_MINUTE: "3" });
});

afterAll(async () => {
  page?.close();
  await ctx.stop();
});

describe("the page-load bucket", () => {
  it("keys guests by address and signed-in visitors by session, answering 429 past the limit", async () => {
    const guest = (ip: string) => request(ctx.app).get("/api/me").set("X-Forwarded-For", ip);
    for (let i = 0; i < 3; i++) expect((await guest("198.51.100.50")).status).toBe(401);
    const limited = await guest("198.51.100.50");
    expect(limited.status).toBe(429);
    expect(limited.body.error).toBe("too-many-loads");
    expect(limited.body.retryAfterMs).toBeGreaterThan(0);
    expect(limited.headers["retry-after"]).toBeTruthy();
    expect((await guest("198.51.100.51")).status).toBe(401);
    expect(await ctx.cache.pttl(PAGE_LOAD_KEY("ip:198.51.100.50"))).toBeGreaterThan(0);

    const { cookie } = await forgeSession(ctx, "loads@example.com");
    const signedIn = () => request(ctx.app).get("/api/me").set("X-Forwarded-For", "198.51.100.50").set("Cookie", cookie);
    for (let i = 0; i < 3; i++) expect((await signedIn()).status).toBe(200);
    expect((await signedIn()).status).toBe(429);
    expect((await ctx.cache.scan("pageload:s:*")).length).toBe(1);
  });

  it("applies to the instance-served TRENDING objects", async () => {
    await polls(ctx).insertOne(makePoll());
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    const get = () => request(ctx.app).get("/api/trending/counts").set("X-Forwarded-For", "198.51.100.60");
    for (let i = 0; i < 3; i++) expect((await get()).status).toBe(200);
    expect((await get()).status).toBe(429);
  });

  it("the configuration call is cacheable for five minutes", async () => {
    const res = await request(ctx.app).get("/api/config");
    expect(res.headers["cache-control"]).toBe("public, max-age=300");
    expect(res.body.assetsBaseUrl).toBe("/assets");
  });
});

describe("fingerprinted assets", () => {
  it("rewrites page references to the fingerprinted copies, serves them immutable, and validates the HTML with an ETag", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "assets-"));
    mkdirSync(path.join(dir, "assets", "abc123"), { recursive: true });
    writeFileSync(path.join(dir, "assets", "abc123", "tabs.js"), "console.log(1);");
    writeFileSync(path.join(dir, "asset-manifest.json"), JSON.stringify({ "/tabs.js": "abc123/tabs.js" }));
    writeFileSync(path.join(dir, "index.html"), '<html><head><link rel="stylesheet" href="/tabs.css"></head><body><script src="/tabs.js"></script></body></html>');

    const local = createAssetServing(dir, { spaces: undefined });
    const app = express();
    app.use("/assets", local.fingerprinted);
    app.get("/", local.sendPage("index.html"));
    const html = await request(app).get("/");
    expect(html.status).toBe(200);
    expect(html.text).toContain('src="/assets/abc123/tabs.js"');
    expect(html.text).toContain('href="/tabs.css"');
    expect(html.headers.etag).toBeTruthy();
    expect((await request(app).get("/").set("If-None-Match", html.headers.etag!)).status).toBe(304);
    const asset = await request(app).get("/assets/abc123/tabs.js");
    expect(asset.status).toBe(200);
    expect(asset.headers["cache-control"]).toBe(IMMUTABLE_CACHE);

    const cdn = createAssetServing(dir, { spaces: { bucket: "b", region: "nyc3", key: "k", secret: "s", cdnUrl: "https://cdn.example.com/" } });
    expect(cdn.assetUrl("/tabs.js")).toBe("https://cdn.example.com/assets/abc123/tabs.js");
    expect(cdn.assetsBaseUrl).toBe("https://cdn.example.com/assets");
  });
});

describe("a page load in a browser", () => {
  it("costs one instance request for a guest and, past the bucket, renders the stored copy with the notice", async () => {
    await polls(ctx).deleteMany({});
    await polls(ctx).insertOne(makePoll({ title: "Stored copy" }));
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html");
    expect(page.requests.filter((r) => r.url === "/api/me").length).toBe(1);
    const copy = page.window.sessionStorage.getItem("trending:copy")!;
    page.close();

    for (const key of await ctx.cache.scan("pageload:ip:*")) await ctx.cache.set(key, "99", 60000);
    page = await openPage(ctx, "index.html", { sessionStorage: { "trending:copy": copy } });
    expect(page.cardTitles("trending")).toEqual(["Stored copy"]);
    const notice = page.document.getElementById("tabNotice")!;
    expect(notice.hasAttribute("hidden")).toBe(false);
    expect(notice.textContent).toBe("You are refreshing too quickly.");
    expect(page.requests.filter((r) => r.url.startsWith("/api/trending")).length).toBe(0);
  });
});
