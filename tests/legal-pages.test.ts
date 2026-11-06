import { readFileSync } from "node:fs";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { PRIVACY_UPDATED, TERMS_UPDATED, TERMS_VERSION } from "../src/legal/version.js";

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

  it("serves each page's date from version.ts, with no version line", async () => {
    for (const [route, date] of [["/privacy", PRIVACY_UPDATED], ["/terms", TERMS_UPDATED]] as const) {
      const { text } = await request(ctx.app).get(route);
      expect(text, route).toContain(`<p class="legal-version">Last Updated ${date}</p>`);
      expect(text, route).not.toContain("{{");
      expect(text, route).not.toMatch(/Version \d{4}/);
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
      "<strong>Why</strong>: to prevent bots and AI agents from creating accounts, sending login emails, and voting on polls.",
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
      '<li>Before you log in, a quick <a href="#bot-check">check</a> on our own servers detects bots and AI agents. It sets no cookie.</li>',
    );
    expect(html).toContain("<tr><td>Bot and AI agent detection measurements</td><td>in memory, one hour at most</td></tr>");
  });

  it("says one cookie lasts, marks the other two temporary, and states the other promises (TWEAK18)", () => {
    const html = source("privacy.html");
    expect(html).toContain("One cookie lasts: the one that keeps you logged in. Two temporary cookies exist only during login:");
    expect(html).toContain("<td><code>session_token</code></td><td>cookie</td>");
    expect(html).toContain("<td><code>signin_binding</code></td><td>temporary cookie</td>");
    expect(html).toContain("<td><code>oauth_state</code></td><td>temporary cookie</td>");
    expect(html).toContain("We send no poll update emails. If we offer them, they will go only to people who opt in.");
    expect(html).not.toContain('id="notifications"');
    expect(html).not.toContain("rely on consent");
    expect(html).toContain("We use your data, as described in section 2, to provide the services of CrowdPoll.vote and to keep them secure.");
    expect(html).toContain('<h2 id="no-advertisers">6. No advertisers, data brokers or analytics</h2>');
    expect(html).toContain("Our pages load nothing from anyone but the hosting provider listed above. Nothing follows you to other sites. We never sell your data.");
    const numbers = [...html.matchAll(/<h2 id="[^"]+">(\d+)\./g)].map((m) => Number(m[1]));
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("makes no liability cap or emailed-notice promise in the Terms (TWEAK19)", () => {
    const html = source("terms.html");
    expect(html).toContain("we are not liable for indirect or consequential losses.");
    expect(html).toContain("We may stop offering the services of CrowdPoll.");
    expect(html).toContain("The Last Updated date at the top changes when they do; you will then need to accept the new terms when you next visit.");
    expect(html).not.toContain("CAD");
    expect(html).not.toContain("30 days before");
  });

  it("versions both documents by the later of their dates", () => {
    expect(TERMS_VERSION).toBe([TERMS_UPDATED, PRIVACY_UPDATED].sort().at(-1));
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
    expect(html).toContain("<tr><td>ImprovMX</td><td>mail you send to our @crowdpoll.vote addresses</td><td>United States and Europe</td></tr>");
    expect(html).toContain("<td>Google (Gmail)</td><td>mail you send to us, forwarded by ImprovMX</td>");
  });

  it("says the Google picture is kept, where, and for how long, and leaves the avatar sentence as it was (C6)", () => {
    const html = source("privacy.html");
    expect(html).not.toContain("We keep no picture");
    expect(html).toContain("If you log in with Google, we keep a copy of the profile picture it shares, and show it to you where your avatar appears.");
    expect(html).toContain("We keep no contacts or anything else from your account there, and no picture from any other provider.");
    expect(html).toContain("at an address that cannot be guessed and that we give only to you, though anyone holding that address could load it.");
    expect(html).toContain("If you <a href=\"/profile#delete-account\">delete your account</a> it is removed within minutes, a cached copy can last up to a day, and the network may hold cached copies outside Canada.");
    expect(html).toContain("<td>Google (Sign in with Google)</td><td>the name, email address and profile picture you choose to share when you log in with it</td>");
    expect(html).toContain("<strong>Your user name and avatar</strong>: shown with your polls and, on polls that do not hide voters, with your votes.");
  });

  it("tells the browser the current terms version", async () => {
    const res = await request(ctx.app).get("/api/config");
    expect(res.body.termsVersion).toBe(TERMS_VERSION);
  });
});
