import { readFileSync } from "node:fs";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { TERMS_VERSION } from "../src/legal/version.js";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestContext();
});

afterAll(async () => {
  await ctx.stop();
});

const source = (name: string) => readFileSync(path.resolve("src/public", name), "utf8");

describe("the Privacy Policy and Terms of Service pages (A1, A2)", () => {
  for (const route of ["/privacy", "/terms"]) {
    it(`serves ${route} to a guest`, async () => {
      const res = await request(ctx.app).get(route);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/text\/html/);
    });

    it(`redirects ${route}.html to ${route}`, async () => {
      const res = await request(ctx.app).get(`${route}.html`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(route);
    });
  }

  it("prints the current version on both pages, and no other", () => {
    for (const name of ["privacy.html", "terms.html"]) {
      const versions = [...source(name).matchAll(/Version (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
      expect(versions.length, name).toBeGreaterThan(0);
      expect(new Set(versions), name).toEqual(new Set([TERMS_VERSION]));
    }
  });

  it("gives the Privacy Policy its summary and anchored sections", () => {
    const html = source("privacy.html");
    expect(html).toContain("In short");
    for (const id of ["cookies", "retention", "rights", "contact"]) expect(html).toContain(`id="${id}"`);
  });

  it("states every retention period, with nothing left to confirm", () => {
    const html = source("privacy.html");
    expect(html).not.toContain("[TO CONFIRM");
    expect(html).toContain("<td>Database backups</td><td>7 days,");
    expect(html).toMatch(/<tr><td>ImprovMX<\/td><td>[^<]*Gmail inbox<\/td><td>United States and Europe<\/td><\/tr>/);
  });

  it("tells the browser the current terms version", async () => {
    const res = await request(ctx.app).get("/api/config");
    expect(res.body.termsVersion).toBe(TERMS_VERSION);
  });
});
