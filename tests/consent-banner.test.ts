/**
 * The consent banner uploaded to Login with Amazon (contracts/provider-setup.md P4): a transparent PNG twice the
 * 50 px Amazon shows, served at a public address like any other asset.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { startTestContext, type TestContext } from "./helpers/setup.js";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});

describe("GET /consent-banner.png", () => {
  it("serves a 100 px high PNG with an alpha channel", async () => {
    const res = await request(ctx.app).get("/consent-banner.png").buffer(true).parse((r, done) => {
      const chunks: Buffer[] = [];
      r.on("data", (chunk: Buffer) => chunks.push(chunk));
      r.on("end", () => done(null, Buffer.concat(chunks)));
    });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
    const png = res.body as Buffer;
    expect(png.subarray(1, 4).toString("latin1")).toBe("PNG");
    expect(png.readUInt32BE(20)).toBe(100);
    expect(png.readUInt32BE(16)).toBeGreaterThan(png.readUInt32BE(20));
    expect(png[25]).toBe(6);
  });
});
