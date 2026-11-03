/**
 * Search engines: robots.txt, the sitemap, a crawlable page per public open or closed poll, head tags on the
 * other pages, and the guest card route the poll page mounts.
 */
import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearPolls, forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import type { Poll } from "../src/polls/store.js";
import { COUNTS_KEY } from "../src/polls/counters.js";
import { createSeoRouter, SITEMAP_CACHE_KEY } from "../src/routes/seo.js";

const ORIGIN = "http://localhost:8080";
let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});

async function clearSitemap() {
  for (const key of await ctx.cache.scan(`${SITEMAP_CACHE_KEY}*`)) await ctx.cache.del(key);
}

async function seed(overrides: Partial<Poll> = {}): Promise<string> {
  const id = randomUUID();
  await polls(ctx).insertOne(makePoll({ _id: id, ...overrides }));
  return id;
}

describe("robots.txt", () => {
  it("allows the public pages, keeps crawlers off the rest, and names the sitemap", async () => {
    const res = await request(ctx.app).get("/robots.txt");
    expect(res.status).toBe(200);
    expect(res.type).toBe("text/plain");
    expect(res.text.trim().split("\n")).toEqual([
      "User-agent: *",
      "Allow: /",
      "Allow: /poll/",
      "Allow: /privacy",
      "Allow: /terms",
      "Disallow: /api/",
      "Disallow: /admin",
      "Disallow: /profile",
      "Disallow: /login",
      "Disallow: /create-account",
      "Disallow: /invite",
      "Disallow: /confirm-signin",
      "Disallow: /accept-terms",
      `Sitemap: ${ORIGIN}/sitemap.xml`
    ]);
  });
});

describe("the sitemap", () => {
  const ids: Record<string, string> = {};
  beforeAll(async () => {
    await clearPolls(ctx);
    await clearSitemap();
    const closedAt = new Date("2026-10-01T12:00:00Z");
    ids.open = await seed({ pollState: "OPEN", startAt: new Date("2026-09-01T00:00:00Z") });
    ids.closed = await seed({ pollState: "CLOSED", endAt: closedAt });
    ids.editingOpen = await seed({ pollState: "EDITING", pollStateBeforeEditUpdate: "OPEN" });
    ids.private = await seed({ pollState: "OPEN", pollVisibility: "Private Poll" });
    ids.waiting = await seed({ pollState: "WAITING TO OPEN" });
    ids.awaiting = await seed({ pollState: "AWAITING APPROVAL" });
    ids.rejected = await seed({ pollState: "REJECTED" });
    ids.archived = await seed({ pollState: "ARCHIVED" });
    ids.initialized = await seed({ pollState: "INITIALIZED" });
    ids.editingWaiting = await seed({ pollState: "EDITING", pollStateBeforeEditUpdate: "WAITING TO OPEN" });
  });

  it("lists the home page and every public open or closed poll, with when it last changed", async () => {
    const res = await request(ctx.app).get("/sitemap.xml");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/xml/);
    expect(res.headers["cache-control"]).toBe("public, max-age=300");
    expect(res.text).toContain(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`);
    expect(res.text).toContain(`<url><loc>${ORIGIN}/</loc></url>`);
    expect(res.text).toContain(`<url><loc>${ORIGIN}/poll/${ids.open}</loc><lastmod>2026-09-01T00:00:00.000Z</lastmod></url>`);
    expect(res.text).toContain(`<url><loc>${ORIGIN}/poll/${ids.closed}</loc><lastmod>2026-10-01T12:00:00.000Z</lastmod></url>`);
    expect(res.text).toContain(`${ORIGIN}/poll/${ids.editingOpen}<`);
    for (const key of ["private", "waiting", "awaiting", "rejected", "archived", "initialized", "editingWaiting"]) {
      expect(res.text, key).not.toContain(ids[key]);
    }
  });

  it("is answered from the cache for five minutes", async () => {
    await clearSitemap();
    await request(ctx.app).get("/sitemap.xml");
    const later = await seed({ pollState: "OPEN" });
    expect((await request(ctx.app).get("/sitemap.xml")).text).not.toContain(later);
    await clearSitemap();
    expect((await request(ctx.app).get("/sitemap.xml")).text).toContain(later);
  });

  it("splits into parts above the per-file limit", async () => {
    await clearSitemap();
    const app = express().use(createSeoRouter(ctx, { partSize: 2 }));
    const index = await request(app).get("/sitemap.xml");
    expect(index.text).toContain(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`);
    expect(index.text).toContain(`<sitemap><loc>${ORIGIN}/sitemap-1.xml</loc></sitemap>`);
    const first = await request(app).get("/sitemap-1.xml");
    expect(first.text).toContain(`<url><loc>${ORIGIN}/</loc></url>`);
    const second = await request(app).get("/sitemap-2.xml");
    expect(second.status).toBe(200);
    expect(second.text).toContain("<urlset");
    expect((await request(app).get("/sitemap-99.xml")).status).toBe(404);
    await clearSitemap();
  });

  it("has no parts while it fits in one file", async () => {
    await clearSitemap();
    expect((await request(ctx.app).get("/sitemap-1.xml")).status).toBe(404);
  });
});

describe("a poll's own page", () => {
  let open: string;
  beforeEach(async () => {
    await clearPolls(ctx);
    open = await seed({
      title: "Best <script>alert(1)</script> \"pizza\"",
      subtitle: "Pick one </script><b>now</b>",
      choices: [
        { id: "c1", label: "Margherita </script>", position: 0 },
        { id: "c2", label: "Hawaiian", position: 1 }
      ]
    });
    await ctx.cache.hset(COUNTS_KEY(open), { c1: "3", c2: "1", total: "4", seq: "1" });
  });

  it("gives a guest the poll's head tags, structured data and a readable summary", async () => {
    const res = await request(ctx.app).get(`/poll/${open}`);
    expect(res.status).toBe(200);
    const html = res.text;
    expect(html).toContain("<title>Best &lt;script&gt;alert(1)&lt;/script&gt; &quot;pizza&quot; · CrowdPoll</title>");
    expect(html).toContain('<meta name="description" content="Pick one &lt;/script&gt;&lt;b&gt;now&lt;/b&gt;">');
    expect(html.match(/<meta name="description"/g)).toHaveLength(1);
    expect(html).toContain(`<link rel="canonical" href="${ORIGIN}/poll/${open}">`);
    expect(html).toContain('<meta property="og:type" content="website">');
    expect(html).toContain('<meta property="og:site_name" content="CrowdPoll">');
    expect(html).toContain(`<meta property="og:url" content="${ORIGIN}/poll/${open}">`);
    expect(html).toContain('<meta name="twitter:card" content="summary">');
    expect(html).toContain(`data-poll-page="${open}"`);

    const ld = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)![1]!;
    expect(ld).not.toContain("<");
    const question = JSON.parse(ld);
    expect(question["@type"]).toBe("Question");
    expect(question.name).toBe('Best <script>alert(1)</script> "pizza"');
    expect(question.suggestedAnswer.map((a: { text: string }) => a.text)).toEqual(["Margherita </script>", "Hawaiian"]);
    expect(question.answerCount).toBe(2);

    const summary = /<article id="poll-summary">([\s\S]*?)<\/article>/.exec(html)![1]!;
    expect(summary).toContain("<h1>Best &lt;script&gt;alert(1)&lt;/script&gt; &quot;pizza&quot;</h1>");
    expect(summary).toContain("Margherita &lt;/script&gt;</span> <span class=\"poll-summary-share\">75%");
    expect(summary).toContain("Hawaiian</span> <span class=\"poll-summary-share\">25%");
    expect(summary).toContain("4 votes");
    expect(html.indexOf('<main class="all-markets">')).toBeLessThan(html.indexOf('<article id="poll-summary">'));
  });

  it("says who made the poll nowhere", async () => {
    await ctx.db.updateTable("polls").set({ created_by_id: "maker-id", created_by_name: "Maker Name" }).where("id", "=", open).execute();
    const html = (await request(ctx.app).get(`/poll/${open}`)).text;
    expect(html).not.toContain("maker-id");
    expect(html).not.toContain("Maker Name");
    expect(html).not.toContain("addedBy");
  });

  it("is Not found for a private, rejected, deleted or malformed poll, alike", async () => {
    const hidden = await seed({ pollVisibility: "Private Poll" });
    const rejected = await seed({ pollState: "REJECTED" });
    const answers = await Promise.all(
      [`/poll/${hidden}`, `/poll/${rejected}`, `/poll/${randomUUID()}`, "/poll/zzz"].map((path) => request(ctx.app).get(path))
    );
    for (const res of answers) {
      expect(res.status).toBe(404);
      expect(res.text).toBe("Not found");
    }
  });

  it("sends a signed-in visitor to the poll on the home page", async () => {
    const { cookie } = await forgeSession(ctx, `reader-${randomUUID()}@example.com`);
    const res = await request(ctx.app).get(`/poll/${open}`).set("Cookie", cookie);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/?PID=${open}`);
  });
});

describe("the guest card route", () => {
  it("answers an indexable poll with the card's shape and a guest overlay", async () => {
    await clearPolls(ctx);
    const pid = await seed();
    const res = await request(ctx.app).get(`/api/polls/${pid}/card`);
    expect(res.status).toBe(200);
    expect(res.body.poll.pid).toBe(pid);
    expect(res.body.counts).toMatchObject({ voteCount: 0 });
    expect(res.body.overlay).toEqual({ voted: false, bookmarked: false, mayWatch: false, voteBlockedReason: null });
  });

  it("is Not found for anything else", async () => {
    const hidden = await seed({ pollVisibility: "Private Poll" });
    const waiting = await seed({ pollState: "WAITING TO OPEN" });
    for (const path of [`/api/polls/${hidden}/card`, `/api/polls/${waiting}/card`, "/api/polls/zzz/card"]) {
      const res = await request(ctx.app).get(path);
      expect(res.status, path).toBe(404);
      expect(res.body).toEqual({ error: "Not found" });
    }
  });
});

describe("a shared link opened by a guest", () => {
  it("goes to the poll's page when it may be indexed, and to sign-in otherwise", async () => {
    const open = await seed();
    const hidden = await seed({ pollVisibility: "Private Poll" });
    expect((await request(ctx.app).get(`/?PID=${open}`)).headers.location).toBe(`/poll/${open}`);
    expect((await request(ctx.app).get(`/?PID=${hidden}`)).headers.location).toBe(`/login?PID=${hidden}`);
  });

  it("is unchanged for a signed-in visitor", async () => {
    const open = await seed();
    const { cookie } = await forgeSession(ctx, `linked-${randomUUID()}@example.com`);
    const res = await request(ctx.app).get(`/?PID=${open}`).set("Cookie", cookie);
    expect(res.headers.location).not.toBe(`/poll/${open}`);
  });
});

describe("head tags of the other pages", () => {
  it("gives the public pages canonical links", async () => {
    for (const [path, canonical] of [["/", `${ORIGIN}/`], ["/privacy", `${ORIGIN}/privacy`], ["/terms", `${ORIGIN}/terms`]]) {
      const html = (await request(ctx.app).get(path!)).text;
      expect(html, path).toContain(`<link rel="canonical" href="${canonical}">`);
      expect(html, path).toMatch(/<meta name="description" content="[^"]+">/);
    }
    expect((await request(ctx.app).get("/")).text).toContain("<title>CrowdPoll — live opinion polls</title>");
  });

  it("keeps the sign-in and account pages out of search results", async () => {
    for (const path of ["/login", "/create-account"]) {
      expect((await request(ctx.app).get(path)).text, path).toContain('<meta name="robots" content="noindex">');
    }
    const { cookie } = await forgeSession(ctx, `profile-${randomUUID()}@example.com`);
    expect((await request(ctx.app).get("/profile").set("Cookie", cookie)).text).toContain('<meta name="robots" content="noindex">');
  });

  it("tells a visitor without scripts that signing in needs them", async () => {
    for (const path of ["/login", "/create-account"]) {
      expect((await request(ctx.app).get(path)).text, path).toContain(
        '<main id="card-root"><noscript><p class="card-shell-status">Signing in needs JavaScript.</p></noscript></main>'
      );
    }
    const { readFileSync } = await import("node:fs");
    expect(readFileSync("src/public/invite.html", "utf8")).toContain("<noscript><p class=\"card-shell-status\">Signing in needs JavaScript.</p></noscript>");
  });
});
