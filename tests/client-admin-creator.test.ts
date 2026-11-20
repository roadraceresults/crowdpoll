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
    scripts: ["m3-ripple.js", "app.js", "notesEditor.js", "adminCard.js", "adminList.js"]
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

  it("draws the creator's polls as rows with no card, and opens the only one by itself", async () => {
    const creator = await forgeSession(ctx, "creator-rows@example.com");
    await seedOwned(creator.userId, 2);
    const p = await openAdmin(creator.cookie);
    const list = p.document.getElementById("pollList")!;
    expect(Array.from(list.children).map((child) => child.className)).toEqual(["admin-result", "admin-result"]);
    expect(list.querySelector(".poll-admin-card")).toBeNull();

    const single = await forgeSession(ctx, "creator-single@example.com");
    await seedOwned(single.userId, 1);
    const q = await openAdmin(single.cookie);
    const open = q.document.querySelectorAll<HTMLElement>("#pollList .admin-result--open");
    expect(open.length).toBe(1);
    expect(open[0]!.querySelector(".admin-result-panel > .poll-admin-card")).not.toBeNull();
  });

  it("keeps a new poll's saved wizard progress when its row is closed and opened again", async () => {
    const creator = await forgeSession(ctx, "creator-progress@example.com");
    await seedOwned(creator.userId, 1);
    const p = await openAdmin(creator.cookie);
    await p.click("#createPollBtn");
    await p.settle(200);
    const card = p.document.querySelector<HTMLElement>(".poll-admin-card--new")!;
    const pid = card.dataset.pid!;
    const save = Array.from(card.querySelectorAll<HTMLButtonElement>(".wizard-footer button")).find((b) => b.textContent === "Save")!;
    save.click();
    await p.settle(300);
    const row = () => p.document.querySelector<HTMLButtonElement>(`#pollList .admin-result[data-pid="${pid}"] .admin-result-row`)!;
    if (row().getAttribute("aria-expanded") === "true") row().click();
    await p.settle(50);
    expect(p.document.querySelector(`#pollList .poll-admin-card[data-pid="${pid}"]`)).toBeNull();
    row().click();
    await p.settle(50);
    expect(p.document.querySelector(`#pollList .admin-result-panel > .poll-admin-card[data-pid="${pid}"]`)).toBe(card);
  });

  it("keeps the views and the search form for an administrator", async () => {
    const admin = await forgeSession(ctx, ADMIN);
    const p = await openAdmin(admin.cookie);
    expect(p.document.getElementById("adminTabBar")).not.toBeNull();
    expect(p.document.getElementById("adminSearchForm")).not.toBeNull();
  });
});
