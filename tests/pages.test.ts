/**
 * GET /login page-route guard (FR-008/FR-009; contracts/page-routes.md):
 * a signed-in user is redirected to / before login.html is ever sent; a
 * guest still gets the login form unchanged.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { startTestContext, forgeSession, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";

let ctx: TestContext;
let nextUser = 1;
const freshEmail = () => `pages${nextUser++}@example.com`;

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});

describe("GET /login (FR-008/FR-009)", () => {
  it("redirects a signed-in user to / without sending the login form", async () => {
    const { cookie } = await forgeSession(ctx, freshEmail());
    const res = await request(ctx.app).get("/login").set("Cookie", cookie);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/");
  });

  it("serves the login page to a guest", async () => {
    const res = await request(ctx.app).get("/login");
    expect(res.status).toBe(200);
    // 013 US4: the form is built by loginCard.js rather than shipped as static
    // markup, so the served HTML carries the script that mounts it rather than
    // the form's own id. What this guards is unchanged: a guest is not
    // redirected away from the sign-in page.
    expect(res.text).toContain("/loginCard.js");
  });
});

/**
 * 012 T079 (US7, FR-053): `isAdmin` changes what the header draws and nothing else.
 * A user who forges the flag in devtools reveals a menu entry whose target still
 * refuses them — the page route never consults the flag, only the allow-list.
 */
async function forgeWithPermissions(permissions?: string[]) {
  const forged = await forgeSession(ctx, freshEmail());
  if (permissions) {
    await ctx.db.updateTable("user").set({ permissions }).where("id", "=", forged.userId).execute();
  }
  return forged;
}

describe("Admin pages ignore the isAdmin hint (012 FR-053)", () => {
  it("refuses a signed-in user without Create Poll", async () => {
    const { cookie } = await forgeWithPermissions(["View Polls", "Vote on Polls"]);
    const res = await request(ctx.app).get("/admin").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });

  it("refuses a signed-in user with Create Poll but not View Polls", async () => {
    const { cookie } = await forgeWithPermissions(["Create Poll"]);
    const res = await request(ctx.app).get("/admin").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });

  it("refuses a guest", async () => {
    const res = await request(ctx.app).get("/admin");
    expect(res.status).toBe(403);
  });

  it("serves the page to a creator holding Create Poll and View Polls", async () => {
    const { cookie } = await forgeWithPermissions();
    const res = await request(ctx.app).get("/admin").set("Cookie", cookie);
    expect(res.status).toBe(200);
  });
});

describe("A creator's results page (025)", () => {
  it("serves the creator's own poll and answers 404 for another user's", async () => {
    const creator = await forgeWithPermissions();
    const other = await forgeWithPermissions();
    const mine = makePoll();
    const theirs = makePoll();
    await polls(ctx).insertMany([mine, theirs]);
    await ctx.db.updateTable("polls").set({ created_by_id: creator.userId }).where("id", "=", mine._id).execute();
    await ctx.db.updateTable("polls").set({ created_by_id: other.userId }).where("id", "=", theirs._id).execute();

    const own = await request(ctx.app).get(`/admin/poll/results?PID=${mine._id}`).set("Cookie", creator.cookie);
    expect(own.status).toBe(200);
    const foreign = await request(ctx.app).get(`/admin/poll/results?PID=${theirs._id}`).set("Cookie", creator.cookie);
    expect(foreign.status).toBe(404);
  });
});

/**
 * 013 FR-042/FR-044 (contracts/page-routes.md): the refusal becomes a page
 * rather than a JSON fragment. The status stays 403 -- the request is still
 * refused, and a 200 would tell caches, crawlers and monitoring the page
 * loaded normally. One card serves a guest and a signed-in non-administrator
 * alike, revealing neither which they are nor whether signing in would help.
 */
describe("Unauthorized access to an admin page (013 FR-042/FR-044)", () => {
  // 014 FR-004: /admin/poll and /admin/poll/update are removed; editing is on the card.
const ADMIN_PAGES = ["/admin", "/admin/poll/results"];

  it("answers every admin page route with the card, at 403", async () => {
    for (const page of ADMIN_PAGES) {
      const res = await request(ctx.app).get(page);
      expect(res.status).toBe(403);
      expect(res.headers["content-type"]).toMatch(/html/);
      expect(res.text).toContain("/notAuthorizedCard.js");
    }
  });

  it("shows a signed-in user without the creator grants the same page as a guest", async () => {
    const { cookie } = await forgeWithPermissions([]);
    const signedIn = await request(ctx.app).get("/admin").set("Cookie", cookie);
    const guest = await request(ctx.app).get("/admin");
    expect(signedIn.status).toBe(403);
    expect(signedIn.text).toBe(guest.text);
  });

  /**
   * createRequireAdmin is a single factory with two instances (pages.ts and
   * pollsApi.ts). Editing the factory is the obvious way to implement the
   * refusal page and the wrong one -- it would turn every admin API refusal
   * into HTML, which no caller expects (research R10).
   */
  it("leaves the admin API refusing in JSON", async () => {
    const res = await request(ctx.app).get("/api/admin/polls");
    expect(res.status).toBe(403);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toEqual({ error: "Not authorized" });
  });
});

/**
 * 012 T082 (FR-052): the header renders the entry from the server's hint, in the
 * documented position. Guarded against the served asset, because a menu item that
 * silently stops rendering is not something any server-side test would catch.
 */
describe("Avatar menu carries Poll Administration (012 FR-052)", () => {
  it("renders it only when isAdmin is true, between Edit Profile and Logout", async () => {
    const res = await request(ctx.app).get("/app.js");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Poll Administration");
    expect(res.text).toMatch(/if \(canCreatePolls\(me\)\)/);

    // Position is part of the requirement, so it is asserted rather than assumed.
    const edit = res.text.indexOf('"Edit Profile"');
    const admin = res.text.indexOf('"Poll Administration"');
    const logout = res.text.indexOf('"Logout"');
    expect(edit).toBeGreaterThan(-1);
    expect(admin).toBeGreaterThan(edit);
    expect(logout).toBeGreaterThan(admin);
  });

  it("is absent rather than disabled when the flag is false", async () => {
    const res = await request(ctx.app).get("/app.js");
    // No disabled variant exists — the element is only ever created inside the guard.
    expect(res.text).not.toMatch(/adminLink\.(disabled|hidden)/);
  });
});

describe("The tabbed home page (017)", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await startTestContext();
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("serves the eight tabs in order and the Refresh control, with TRENDING selected and no search box of its own (FIX013)", async () => {
    const res = await request(ctx.app).get("/");
    expect(res.status).toBe(200);
    const order = ["your-polls", "shared-with-you", "your-votes", "trending", "newest", "watching", "live", "search"];
    const positions = order.map((tab) => res.text.indexOf(`<button class="tab`) >= 0 ? res.text.indexOf(`data-tab="${tab}"`) : -1);
    expect(positions.every((p) => p > 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(res.text).toMatch(/class="tab is-active" type="button" data-tab="trending"/);
    expect(res.text).not.toContain('id="searchBox"');
    expect(res.text).toContain('id="refreshBtn"');
    expect(res.text).not.toContain("pollGrid");
    for (const asset of ["/tabs.css", "/deltaClient.js", "/tabs.js", "/trending.js", "/searchTab.js", "/liveResults.js", "/voteClient.js", "/pollCard.js", "/header-single-column-m3.css", "/header-single-row-m3.css", "/single-column-m3.css", "/headerFit.js", "/fixedChrome.js", "/tabBarScroll.js", "/floatingActions.js", "/back-to-top-m3.css", "/backToTopFab.js"]) {
      expect(res.text).toContain(asset);
    }
  });

  it("links the single-row header sheet and script on every page that has the header and is served to a guest", async () => {
    for (const page of ["/", "/login", "/create-account", "/admin"]) {
      const res = await request(ctx.app).get(page);
      expect(res.text, page).toContain("/header-single-row-m3.css");
      expect(res.text, page).toContain("/headerFit.js");
    }
  });

  it("links the fixed-chrome sheet and script on every page that has the header and is served to a guest", async () => {
    for (const page of ["/", "/login", "/create-account", "/admin"]) {
      const res = await request(ctx.app).get(page);
      expect(res.text, page).toContain("/header-fixed-m3.css");
      expect(res.text, page).toContain("/fixedChrome.js");
    }
  });

  it("links the Back to Top sheet and script on every page that has the header and is served to a guest", async () => {
    for (const page of ["/", "/login", "/create-account", "/admin"]) {
      const res = await request(ctx.app).get(page);
      expect(res.text, page).toContain("/back-to-top-m3.css");
      expect(res.text, page).toContain("/backToTopFab.js");
    }
  });

  it("serves the home page when the poll id in a link is not a poll id", async () => {
    const res = await request(ctx.app).get("/?PID=anything");
    expect(res.status).toBe(200);
    expect(res.text).toContain("/tabs.js");
  });

  it("sends a guest holding a poll link to sign in, whatever the poll", async () => {
    const pid = "123e4567-e89b-42d3-a456-426614174000";
    const res = await request(ctx.app).get(`/?PID=${pid}`).redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/login?PID=${pid}`);
  });

  it("ships the card without a polling loop or a fetch of its own", async () => {
    const card = await request(ctx.app).get("/pollCard.js");
    expect(card.text).not.toContain("startPolling");
    expect(card.text).not.toContain("/api/polls/' + encodeURIComponent(opts.pid))");
    expect(card.text).toContain("bookmark-btn");
    expect(card.text).toContain("live-link");
  });
});

describe("The site favicon (FR-010)", () => {
  const ICON_LINKS =
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '  <link rel="icon" href="/favicon.svg" type="image/svg+xml">\n' +
    '  <link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">';
  const icoOnDisk = () => readFileSync(path.resolve("src/public/favicon.ico"));

  it("every page links both icons right after the viewport meta", async () => {
    const signedIn = await forgeSession(ctx, freshEmail());
    const creator = await forgeWithPermissions();
    const poll = makePoll();
    await polls(ctx).insertMany([poll]);
    await ctx.db.updateTable("polls").set({ created_by_id: creator.userId }).where("id", "=", poll._id).execute();

    const pages: Array<[string, string | undefined, number]> = [
      ["/", undefined, 200],
      ["/login", undefined, 200],
      ["/create-account", undefined, 200],
      ["/profile", signedIn.cookie, 200],
      ["/admin", creator.cookie, 200],
      [`/admin/poll/results?PID=${poll._id}`, creator.cookie, 200],
      ["/admin", undefined, 403],
    ];
    for (const [url, cookie, status] of pages) {
      const req = request(ctx.app).get(url);
      const res = cookie ? await req.set("Cookie", cookie) : await req;
      expect(res.status, url).toBe(status);
      expect(res.text, url).toContain(ICON_LINKS);
    }
    const notAuthorized = await request(ctx.app).get("/admin");
    expect(notAuthorized.text).toContain("/notAuthorizedCard.js");
  });

  it("favicon.ico holds 16, 32 and 48 px PNG images", () => {
    const ico = icoOnDisk();
    expect([ico.readUInt16LE(0), ico.readUInt16LE(2), ico.readUInt16LE(4)]).toEqual([0, 1, 3]);
    [16, 32, 48].forEach((size, i) => {
      const entry = 6 + i * 16;
      expect(ico[entry]).toBe(size);
      expect(ico[entry + 1]).toBe(size);
      const offset = ico.readUInt32LE(entry + 12);
      expect([...ico.subarray(offset, offset + 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    });
  });

  it("GET /favicon.ico answers with the icon", async () => {
    const res = await request(ctx.app)
      .get("/favicon.ico")
      .buffer(true)
      .parse((stream, done) => {
        const chunks: Buffer[] = [];
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", () => done(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/^image\/(x-icon|vnd\.microsoft\.icon)/);
    expect(Buffer.compare(res.body as Buffer, icoOnDisk())).toBe(0);
  });

  it("GET /confirm-signin serves the confirmation page", async () => {
    const res = await request(ctx.app).get("/confirm-signin?token=t&stay=0");
    expect(res.status).toBe(200);
    expect(res.text).toContain("/confirmSigninCard.js");
    expect(res.text).toContain(ICON_LINKS);
  });

  it("the cookie banner names the session cookie and the sign-in security cookie", () => {
    const app = readFileSync(path.resolve("src/public/app.js"), "utf8");
    expect(app).toContain("strictly necessary session cookie");
    expect(app).toContain("short-lived security cookie while a sign-in link is waiting to be used");
  });

  it("GET /email-logo.png answers with the email logo", async () => {
    const res = await request(ctx.app).get("/email-logo.png");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/^image\/png/);
  });
});
