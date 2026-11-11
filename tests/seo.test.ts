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
import { escapeHtml } from "../src/html.js";
import { notesPlainText } from "../src/polls/notes.js";
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

  it("shows the rendered notes after the subtitle, escaped, and leaves the description alone", async () => {
    await ctx.db.updateTable("polls").set({ notes: "**Bring** </script><img src=x> a *plate*\nline two" }).where("id", "=", open).execute();
    await ctx.cache.del(`poll:${open}`);
    const html = (await request(ctx.app).get(`/poll/${open}`)).text;
    const summary = /<article id="poll-summary">([\s\S]*?)<\/article>/.exec(html)![1]!;
    const notes = '<div class="poll-notes"><strong>Bring</strong> &lt;/script&gt;&lt;img src=x&gt; a <em>plate</em><br>line two</div>';
    expect(summary).toContain(`<p>Pick one &lt;/script&gt;&lt;b&gt;now&lt;/b&gt;</p>${notes}<ul>`);
    expect(html).toContain('<meta name="description" content="Pick one &lt;/script&gt;&lt;b&gt;now&lt;/b&gt;">');
    expect(html).not.toContain("</script><img");
  });

  it("has no notes block for a poll without notes", async () => {
    const html = (await request(ctx.app).get(`/poll/${open}`)).text;
    expect(html).not.toContain('class="poll-notes"');
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

  it("sends a logged-in visitor to the poll on the home page", async () => {
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
  it("goes to the poll's page when it may be indexed, and to login otherwise", async () => {
    const open = await seed();
    const hidden = await seed({ pollVisibility: "Private Poll" });
    expect((await request(ctx.app).get(`/?PID=${open}`)).headers.location).toBe(`/poll/${open}`);
    expect((await request(ctx.app).get(`/?PID=${hidden}`)).headers.location).toBe(`/login?PID=${hidden}`);
  });

  it("is unchanged for a logged-in visitor", async () => {
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

  it("keeps the login and account pages out of search results", async () => {
    for (const path of ["/login", "/create-account"]) {
      expect((await request(ctx.app).get(path)).text, path).toContain('<meta name="robots" content="noindex">');
    }
    const { cookie } = await forgeSession(ctx, `profile-${randomUUID()}@example.com`);
    expect((await request(ctx.app).get("/profile").set("Cookie", cookie)).text).toContain('<meta name="robots" content="noindex">');
  });

  it("tells a visitor without scripts that logging in needs them", async () => {
    for (const path of ["/login", "/create-account"]) {
      expect((await request(ctx.app).get(path)).text, path).toContain(
        '<main id="card-root"><noscript><p class="card-shell-status">Logging in needs JavaScript.</p></noscript></main>'
      );
    }
    const { readFileSync } = await import("node:fs");
    expect(readFileSync("src/public/invite.html", "utf8")).toContain("<noscript><p class=\"card-shell-status\">Logging in needs JavaScript.</p></noscript>");
  });
});

describe("the login page of a published poll", () => {
  const CHOICE = "Margherita-with-extra-basil";
  const NOTES = "Bring your own plate, secretly";

  /** A private poll a guest's shared link sends to the login page, with content the page must not show. */
  async function seedPublished(overrides: Partial<Poll> = {}): Promise<string> {
    const pid = await seed({
      pollState: "OPEN",
      pollVisibility: "Private Poll",
      pollSharingMode: "Anyone With The Link",
      title: "Pizza & <Pasta> night",
      subtitle: "Pick one </script><b>now</b>",
      notes: NOTES,
      choices: [
        { id: "c1", label: CHOICE, position: 0 },
        { id: "c2", label: "Hawaiian", position: 1 }
      ],
      ...overrides
    });
    await ctx.cache.hset(COUNTS_KEY(pid), { c1: "3", c2: "1", total: "4", seq: "1" });
    return pid;
  }

  const TITLE = "Pizza &amp; &lt;Pasta&gt; night";
  const SUBTITLE = "Pick one &lt;/script&gt;&lt;b&gt;now&lt;/b&gt;";

  function expectPollTags(html: string, pid: string, description: string) {
    expect(html).toContain(`<title>${TITLE} · CrowdPoll</title>`);
    expect(html).toContain(`<meta name="description" content="${description}">`);
    expect(html.match(/<meta name="description"/g)).toHaveLength(1);
    expect(html).toContain('<meta property="og:type" content="website">');
    expect(html).toContain('<meta property="og:site_name" content="CrowdPoll">');
    expect(html).toContain(`<meta property="og:title" content="${TITLE}">`);
    expect(html).toContain(`<meta property="og:description" content="${description}">`);
    expect(html).toContain(`<meta property="og:url" content="${ORIGIN}/?PID=${pid}">`);
    expect(html).toContain('<meta name="twitter:card" content="summary">');
  }

  beforeEach(async () => {
    await clearPolls(ctx);
  });

  it("carries the poll's title and subtitle for a guest, on the login page as it is", async () => {
    const pid = await seedPublished();
    const res = await request(ctx.app).get(`/login?PID=${pid}`);
    expect(res.status).toBe(200);
    expect(res.type).toBe("text/html");
    expect(res.headers["cache-control"]).toBe("no-cache");
    // Express's weak ETag on the sent body, as on /poll/:pid, so a revalidation can answer 304.
    expect(res.headers.etag).toMatch(/^W\//);
    const html = res.text;
    expectPollTags(html, pid, SUBTITLE);
    expect(html).not.toContain("<title>Login</title>");
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain("loginCard");
    expect(html).not.toContain('<link rel="canonical"');
    expect(html).not.toContain("og:image");
    expect(html).not.toContain("application/ld+json");
    // SC-005: nothing of the poll beyond title, subtitle and message.
    expect(html).not.toContain(CHOICE);
    expect(html).not.toContain("Hawaiian");
    expect(html).not.toContain(NOTES);
    expect(html).not.toContain("4 votes");
    expect(html).not.toContain("poll-summary");
  });

  it("leaves the shared link's redirects as they were", async () => {
    const pid = await seedPublished();
    const guest = await request(ctx.app).get(`/?PID=${pid}`);
    expect(guest.status).toBe(302);
    expect(guest.headers.location).toBe(`/login?PID=${pid}`);
    const { cookie } = await forgeSession(ctx, `preview-${randomUUID()}@example.com`);
    const signedIn = await request(ctx.app).get(`/login?PID=${pid}`).set("Cookie", cookie);
    expect(signedIn.status).toBe(302);
    expect(signedIn.headers.location).toBe(`/?PID=${pid}`);
  });

  it("falls back to the site's line when the poll has no subtitle", async () => {
    const pid = await seedPublished({ subtitle: "" });
    const html = (await request(ctx.app).get(`/login?PID=${pid}`)).text;
    expectPollTags(html, pid, `Vote and see live results: ${TITLE}`);
  });

  it("carries the same tags for a public poll, whose shared link still goes to its own page", async () => {
    const pid = await seedPublished({ pollVisibility: "Public Poll" });
    const html = (await request(ctx.app).get(`/login?PID=${pid}`)).text;
    expectPollTags(html, pid, SUBTITLE);
    expect((await request(ctx.app).get(`/?PID=${pid}`)).headers.location).toBe(`/poll/${pid}`);
  });

  describe("with a custom email message", () => {
    const MESSAGE = "Line **one**\nLine two";
    const invited = (overrides: Partial<Poll> = {}) =>
      seedPublished({ pollSharingMode: "Invitation Only", subtitle: "S", invitationMessage: MESSAGE, ...overrides });
    const descriptionOf = (html: string) => /<meta property="og:description" content="([^"]*)">/.exec(html)![1]!;

    it("puts the message's words after the subtitle and a blank line, as plain text", async () => {
      const pid = await invited();
      const html = (await request(ctx.app).get(`/login?PID=${pid}`)).text;
      const expected = escapeHtml("S\n\n" + notesPlainText(MESSAGE));
      expect(expected).not.toContain("**");
      expect(html).toContain(`<meta property="og:description" content="${expected}">`);
      expect(html).toContain(`<meta name="description" content="${expected}">`);
    });

    it("is the message alone without a subtitle", async () => {
      const pid = await invited({ subtitle: "" });
      expect(descriptionOf((await request(ctx.app).get(`/login?PID=${pid}`)).text)).toBe(escapeHtml(notesPlainText(MESSAGE)));
    });

    it("is cut to 300 characters, the ellipsis included", async () => {
      const pid = await invited({ subtitle: "a".repeat(100), invitationMessage: "b".repeat(248) });
      const description = descriptionOf((await request(ctx.app).get(`/login?PID=${pid}`)).text);
      expect(description).toHaveLength(300);
      expect(description.endsWith("…")).toBe(true);
      expect(description.startsWith("a".repeat(100) + "\n\nbbb")).toBe(true);
    });

    it("shows markup-like text as written and lets none of it into the page", async () => {
      const pid = await invited({ subtitle: "", invitationMessage: '<b>x</b> & "q"' });
      const html = (await request(ctx.app).get(`/login?PID=${pid}`)).text;
      expect(descriptionOf(html)).toBe("&lt;b&gt;x&lt;/b&gt; &amp; &quot;q&quot;");
      expect(html).not.toContain("<b>x</b>");
    });

    it("carries the approved message, never one awaiting review", async () => {
      const pid = await invited({ subtitle: "", invitationMessage: "**Old** words" });
      await ctx.db.updateTable("polls").set({ pending_update: JSON.stringify({ invitationMessage: "**New** words" }) }).where("id", "=", pid).execute();
      const description = descriptionOf((await request(ctx.app).get(`/login?PID=${pid}`)).text);
      expect(description).toBe("Old words");
      expect(description).not.toContain("New");
    });
  });

  describe("for every other PID", () => {
    it("is the plain login page, with its ETag and 304, for an unpublished poll, an unknown or malformed PID and none", async () => {
      const unpublished = await Promise.all(
        [
          { pollState: "INITIALIZED" as const },
          { pollState: "WAITING TO OPEN" as const },
          { pollState: "AWAITING APPROVAL" as const },
          { pollState: "REJECTED" as const },
          { pollState: "ARCHIVED" as const },
          { pollState: "EDITING" as const, pollStateBeforeEditUpdate: "AWAITING APPROVAL" as const }
        ].map((state) => seedPublished(state))
      );
      const queries = [...unpublished.map((pid) => `?PID=${pid}`), `?PID=${randomUUID()}`, "?PID=abc", ""];
      for (const query of queries) {
        const res = await request(ctx.app).get(`/login${query}`);
        expect(res.status, query).toBe(200);
        expect(res.text, query).toContain("<title>Login</title>");
        expect(res.text, query).not.toContain("og:title");
        expect(res.headers.etag, query).toBeDefined();
        expect((await request(ctx.app).get(`/login${query}`).set("If-None-Match", res.headers.etag!)).status, query).toBe(304);
      }
    });

    it("shows an open poll under edit by the title it published, and a closed poll by its own", async () => {
      const editing = await seedPublished({ pollState: "EDITING", pollStateBeforeEditUpdate: "OPEN" });
      await ctx.db.updateTable("polls").set({ title: "Pizza & <Pasta> night" }).where("id", "=", editing).execute();
      expectPollTags((await request(ctx.app).get(`/login?PID=${editing}`)).text, editing, SUBTITLE);
      const closed = await seedPublished({ pollState: "CLOSED" });
      expectPollTags((await request(ctx.app).get(`/login?PID=${closed}`)).text, closed, SUBTITLE);
    });

    it("lets the PID alone decide the head, whatever else the query carries", async () => {
      const pid = await seedPublished();
      expectPollTags((await request(ctx.app).get(`/login?PID=${pid}&error=invalid-link`)).text, pid, SUBTITLE);
    });
  });
});
