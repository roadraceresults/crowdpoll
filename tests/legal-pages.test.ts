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

  it("says what Bot and AI Agent Detection measures, why, where, and for how long", async () => {
    const html = (await request(ctx.app).get("/privacy")).text;
    const section = /<section id="bot-check"[\s\S]*?<\/section>/.exec(html)![0].replace(/\s+/g, " ");
    expect(section).toContain('<h3 id="bot-check-title">Bot and AI Agent Detection</h3>');
    expect(section).toContain("you tick a box that checks you are not a bot or an AI agent");
    expect(section).toContain(
      "<strong>Why</strong>: to prevent bots and AI agents from creating accounts, sending sign-in emails, and voting on polls.",
    );
    for (const measured of ["graphics", "audio", "fonts", "pointer", "typing", "connection"]) expect(section).toContain(measured);
    expect(section).toContain("at most one hour");
    expect(section).toContain("never sent to or shared with a third party");
    expect(section).toContain("sets no cookie");
  });

  it("names the check Bot and AI Agent Detection everywhere on the page", () => {
    const html = source("privacy.html");
    expect(html).not.toMatch(/bot check/i);
    expect(html.replace(/\s+/g, " ")).toContain(
      '<li>Before you sign in, a quick <a href="#bot-check">check</a> on our own servers detects bots and AI agents. It sets no cookie.</li>',
    );
    expect(html).toContain("<tr><td>Bot and AI agent detection measurements</td><td>in memory, one hour at most</td></tr>");
  });

  it("dates the Privacy Policy by the current version, and leaves the Terms' date", () => {
    const [year, month, day] = TERMS_VERSION.split("-").map(Number);
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    expect(source("privacy.html")).toContain(`Last updated ${day} ${months[month - 1]} ${year}`);
    expect(source("terms.html")).toContain("Last updated 22 October 2026");
  });

  it("lands a link to #bot-check with its title below the fixed header", () => {
    expect(source("legal-m3.css")).toContain(".legal-doc section[id]{ scroll-margin-top:calc(var(--fixed-chrome-height, 0px) + 16px); }");
    expect(source("privacy.html")).toContain('<section id="bot-check"');
  });

  it("keeps the text clear of the Back arrow on a narrow screen", () => {
    expect(source("legal-m3.css")).toContain(".legal-doc{ box-sizing:border-box; padding-inline-start:max(0px, calc(56px - (100% - 72ch) / 2)); }");
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
