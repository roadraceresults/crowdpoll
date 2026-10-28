/**
 * The admin page in a browser for a poll creator who is not an administrator:
 * one list of their own polls, no views and no search form.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";

const ADMIN = "admin-creator-client@example.com";
let ctx: TestContext;
let page: BrowserPage | null = null;

beforeAll(async () => {
  ctx = await startTestContext({
    ENV_ADMINS: ADMIN,
    ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS: "2",
    ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL: "60000"
  });
});

afterAll(async () => {
  page?.close();
  await ctx.stop();
});

beforeEach(async () => {
  page?.close();
  page = null;
  await polls(ctx).deleteMany({});
});

async function openAdmin(cookie: string): Promise<BrowserPage> {
  const p = await openPage(ctx, "admin.html", {
    cookie,
    url: "http://localhost/admin",
    scripts: ["m3-ripple.js", "app.js", "adminCard.js", "adminList.js"]
  });
  p.window.HTMLElement.prototype.scrollIntoView = () => {};
  page = p;
  return p;
}

async function seedOwned(userId: string, count: number) {
  const own = Array.from({ length: count }, (_, i) => makePoll({ title: `Own ${i + 1}`, createdAt: new Date(2025, 0, i + 1) }));
  await polls(ctx).insertMany(own);
  await ctx.db.updateTable("polls").set({ created_by_id: userId }).where("id", "in", own.map((p) => p._id)).execute();
}

const notice = (p: BrowserPage) => p.document.getElementById("adminSearchNotice") as HTMLElement;

describe("the admin page for a poll creator", () => {
  it("renders no views and no search form, and says when only the newest own polls are shown", async () => {
    const creator = await forgeSession(ctx, "creator-page@example.com");
    await seedOwned(creator.userId, 3);
    const p = await openAdmin(creator.cookie);
    expect(p.document.getElementById("adminTabBar")).toBeNull();
    expect(p.document.getElementById("adminSearchForm")).toBeNull();
    expect(notice(p).hidden).toBe(false);
    expect(notice(p).textContent).toBe("Only your newest 2 polls are shown.");
  });

  it("says so when the creator has no polls yet", async () => {
    const creator = await forgeSession(ctx, "creator-empty@example.com");
    const p = await openAdmin(creator.cookie);
    expect(notice(p).textContent).toBe("You haven't created any polls yet.");
  });

  it("keeps the views and the search form for an administrator", async () => {
    const admin = await forgeSession(ctx, ADMIN);
    const p = await openAdmin(admin.cookie);
    expect(p.document.getElementById("adminTabBar")).not.toBeNull();
    expect(p.document.getElementById("adminSearchForm")).not.toBeNull();
  });
});
