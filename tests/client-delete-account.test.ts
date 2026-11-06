import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearPolls, forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import { makePoll } from "./helpers/poll-fixtures.js";
import { insertPoll, recordVote } from "../src/polls/store.js";

let ctx: TestContext;
let page: BrowserPage | null = null;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_ADMINS: "admin@example.org" });
});
afterAll(async () => {
  await ctx.stop();
});
afterEach(() => {
  page?.close();
  page = null;
});

async function profile(email: string, hash = ""): Promise<BrowserPage> {
  const { cookie } = await forgeSession(ctx, email);
  const opened = await openPage(ctx, "profile.html", {
    cookie,
    url: `http://localhost/profile${hash}`,
    scripts: ["app.js", "cardShell.js", "profileCard.js"],
    beforeScripts: (window) => {
      const sameOrigin = window.fetch;
      window.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
        sameOrigin(input, { ...init, headers: { ...(init?.headers as Record<string, string>), Host: "127.0.0.1", Origin: "http://127.0.0.1" } })) as typeof window.fetch;
    }
  });
  await opened.settle();
  return opened;
}

function button(p: BrowserPage, label: string, within: ParentNode = p.document): HTMLButtonElement {
  return [...within.querySelectorAll("button")].find((b) => b.textContent === label) as HTMLButtonElement;
}

function type(p: BrowserPage, field: HTMLInputElement, value: string): void {
  field.value = value;
  field.dispatchEvent(new p.window.Event("input", { bubbles: true }));
}

describe("reaching the delete dialog", () => {
  it("has no Your Data section on the Profile card, and no dialog until it is asked for", async () => {
    page = await profile("your-data@example.org");
    expect(page.document.querySelector(".profile-your-data")).toBeNull();
    expect(page.document.body.textContent).not.toContain("Your Data");
    expect(button(page, "Delete Account")).toBeUndefined();
    expect(page.document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("opens from the Privacy Policy's link, and a reload does not open it again", async () => {
    page = await profile("from-policy@example.org", "#delete-account");
    expect(page.document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(page.window.location.hash).toBe("");
    expect(page.window.location.pathname).toBe("/profile");
  });

  it("opens from the footer's link while already on the Profile page", async () => {
    page = await profile("from-footer@example.org");
    expect(page.document.querySelector('[role="dialog"]')).toBeNull();
    page.window.location.hash = "#delete-account";
    await page.settle();
    expect(page.document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(page.window.location.hash).toBe("");
  });

  it("is linked from the Privacy Policy's Delete your account", () => {
    const html = readFileSync("src/public/privacy.html", "utf8");
    expect(html).toContain('<strong><a href="/profile#delete-account">Delete your account</a></strong>: This deletes');
    expect(html).not.toContain("under Your Data");
    const unlinked = html.replace(/<a href="\/profile#delete-account">delete your account<\/a>/gi, "");
    expect(unlinked).not.toMatch(/delete your account/i);
  });
});

describe("the delete dialog (C7)", () => {
  it("is modal, enables Delete only for DELETE, and closes on Escape", async () => {
    page = await profile("dialog@example.org", "#delete-account");
    const dialog = page.document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.textContent).toContain("This cannot be undone.");
    const field = dialog.querySelector("input") as HTMLInputElement;
    const confirm = button(page, "Delete Account", dialog);
    expect(confirm.disabled).toBe(true);
    type(page, field, "delete");
    expect(confirm.disabled).toBe(true);
    type(page, field, "DELETE");
    expect(confirm.disabled).toBe(false);
    page.document.dispatchEvent(new page.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(page.document.querySelector('[role="dialog"]')).toBeNull();
    expect(page.document.activeElement?.tagName).toBe("INPUT");
  });

  it("deletes the account and goes home", async () => {
    page = await profile("goodbye@example.org", "#delete-account");
    const dialog = page.document.querySelector('[role="dialog"]') as HTMLElement;
    type(page, dialog.querySelector("input") as HTMLInputElement, "DELETE");
    button(page, "Delete Account", dialog).click();
    await page.settle(100);
    expect(page.requests.some((r) => r.method === "DELETE" && r.url === "/api/me")).toBe(true);
    expect(await ctx.db.selectFrom("user").select("id").where("email", "=", "goodbye@example.org").executeTakeFirst()).toBeUndefined();
  });
});

describe("anonymized voters on the results page (C9)", () => {
  it("shows Deleted user and never the placeholder address", async () => {
    await clearPolls(ctx);
    const admin = await forgeSession(ctx, "admin@example.org");
    const poll = makePoll();
    await insertPoll(ctx, poll, { id: admin.userId, name: "admin", email: "admin@example.org" });
    await recordVote(ctx, poll._id, { emailAddress: "deleted-0f0f@deleted.invalid", userName: "Deleted user", choiceIds: ["c1"], votedAt: new Date() });
    page = await openPage(ctx, "admin-results.html", {
      cookie: admin.cookie,
      url: `http://localhost/admin/poll/results?PID=${poll._id}`,
      scripts: ["app.js", "adminResults.js"]
    });
    await page.settle(100);
    const list = page.document.getElementById("votedList")!;
    expect(list.textContent).toBe("Deleted user");
    expect(list.textContent).not.toContain("deleted.invalid");
  });
});
