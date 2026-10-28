/**
 * The admin card's Invitees panel in a browser (C2–C5, C8).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls, voteHistory } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import type { Poll } from "../src/polls/store.js";

const ADMIN = "admin-invitees-client@example.com";
const REFRESH_MS = 1000;
let ctx: TestContext;
let cookie = "";
let page: BrowserPage | null = null;
let bodies: { method: string; url: string; body: Record<string, unknown> | null }[] = [];

beforeAll(async () => {
  ctx = await startTestContext({
    ENV_ADMINS: ADMIN,
    ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL: String(REFRESH_MS),
    ENV_PARTICIPANTS_VIEWPORT_SIZE: "5",
    ENV_MAX_INVITATIONS_PER_DAY: "1"
  });
  cookie = (await forgeSession(ctx, ADMIN)).cookie;
});

afterAll(async () => {
  page?.close();
  await ctx.stop();
});

beforeEach(async () => {
  page?.close();
  page = null;
  bodies = [];
  await polls(ctx).deleteMany({});
  await voteHistory(ctx).deleteMany({});
});

async function open(): Promise<BrowserPage> {
  const p = await openPage(ctx, "admin.html", {
    cookie,
    url: "http://localhost/admin",
    scripts: ["m3-ripple.js", "app.js", "adminCard.js", "adminList.js"]
  });
  p.window.HTMLElement.prototype.scrollIntoView = () => {};
  const send = p.window.fetch;
  p.window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
    bodies.push({ method: (init?.method ?? "GET").toUpperCase(), url, body });
    return send(input, init);
  }) as typeof fetch;
  page = p;
  await p.settle();
  return p;
}

function invitationPoll(overrides: Partial<Poll> = {}): Poll {
  return makePoll({
    pollState: "WAITING TO OPEN",
    pollVisibility: "Private Poll",
    pollSharingMode: "Invitation Only",
    voterCountLimit: 20,
    ...overrides
  });
}

const panelOf = (p: BrowserPage) => p.document.querySelector<HTMLElement>(".card-invitees-panel");
const rows = (p: BrowserPage) =>
  Array.from(p.document.querySelectorAll<HTMLElement>(".invitee-row")).map((row) => [
    row.querySelector(".invitee-email")!.textContent,
    row.querySelector(".invitee-name")?.textContent ?? "",
    row.querySelector(".invitee-chip")!.textContent
  ]);
const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

async function invite(p: BrowserPage, text: string): Promise<void> {
  const input = p.document.querySelector<HTMLTextAreaElement>(".invitees-input")!;
  input.value = text;
  await p.click(".invitees-invite-btn");
  await p.settle();
}

describe("where the panel shows", () => {
  it("sits below the counts panel of an Invitation Only poll, with the four counts", async () => {
    await polls(ctx).insertOne(invitationPoll({ invitedVoterList: ["a@example.com"] }));
    const p = await open();
    const panel = panelOf(p)!;
    expect(panel).not.toBeNull();
    expect(panel.previousElementSibling!.classList.contains("card-counts-panel")).toBe(true);
    expect(panel.parentElement!.firstElementChild!.classList.contains("wizard-summary")).toBe(true);
    expect(panel.nextElementSibling).toBeNull();
    const labels = Array.from(p.document.querySelectorAll(".card-counts-panel .card-field-label")).map((n) => n.textContent);
    expect(labels).toEqual(["Vote Count", "Invitation Count", "Accepted Count", "Banned Voter Count"]);
    expect(panel.querySelector(".invitees-title")!.textContent).toBe("Invitees");
    expect(panel.querySelector(".invitees-capacity")!.textContent).toBe("1 of 20");
    for (const cls of ["invitees-input", "invitees-invite-btn", "invitees-results", "invitee-list"]) {
      expect(panel.querySelector("." + cls), cls).not.toBeNull();
    }
    expect(panel.querySelector(".invitees-field-label")!.textContent).toBe("Invite by email");
    expect(rows(p)).toEqual([["a@example.com", "", "Not sent yet"]]);
  });

  it("is absent for any other poll", async () => {
    await polls(ctx).insertOne(makePoll({ pollState: "WAITING TO OPEN" }));
    await polls(ctx).insertOne(makePoll({ pollState: "WAITING TO OPEN", pollVisibility: "Private Poll" }));
    const p = await open();
    expect(panelOf(p)).toBeNull();
    const labels = Array.from(p.document.querySelectorAll(".card-counts-panel .card-field-label")).map((n) => n.textContent);
    expect(labels).not.toContain("Accepted Count");
  });

  it("sits below the wizard of a saved Invitation Only poll, and not of another one", async () => {
    await polls(ctx).insertOne(invitationPoll({ pollState: "INITIALIZED", title: "Saved invite" }));
    const p = await open();
    p.document.querySelector<HTMLElement>(".wizard-summary-link")!.click();
    await p.settle();
    const wizard = p.document.querySelector<HTMLElement>(".poll-admin-card--new")!;
    expect(wizard).not.toBeNull();
    expect(wizard.lastElementChild!.classList.contains("card-invitees-panel")).toBe(true);
    expect(wizard.querySelector(".wizard-footer")!.nextElementSibling).toBe(wizard.lastElementChild);
  });
});

describe("adding", () => {
  it("posts add with the text and the time zone, keeps only refusals and summarises", async () => {
    await polls(ctx).insertOne(invitationPoll({ invitedVoterList: ["dup@example.com"], bannedVoterList: ["eve@example.com"] }));
    const p = await open();
    await invite(p, "ann@example.com, bob@example.com\nbad@ dup@example.com eve@example.com");
    const post = bodies.find((b) => b.method === "POST" && b.url.endsWith("/invitees"))!;
    expect(post.body).toEqual({ add: "ann@example.com, bob@example.com\nbad@ dup@example.com eve@example.com", timeZone: zone() });
    expect(p.document.querySelector<HTMLTextAreaElement>(".invitees-input")!.value).toBe("bad@\ndup@example.com\neve@example.com");
    const summary = p.document.querySelector(".invitees-summary")!;
    expect(summary.getAttribute("role")).toBe("status");
    expect(summary.textContent).toBe("Invited Emails: 2.\nEmails that could not be added: 3");
    const lines = Array.from(p.document.querySelectorAll(".invitees-refusals li")).map((n) => n.textContent);
    expect(lines).toEqual([
      "bad@ — Not a valid email address.",
      "dup@example.com — Already invited.",
      "eve@example.com — Banned from this poll."
    ]);
    expect(rows(p).map((r) => r[0])).toEqual(["dup@example.com", "ann@example.com", "bob@example.com"]);
    expect(p.document.querySelector<HTMLTextAreaElement>(".invitees-input")!.disabled).toBe(false);
  });

  it("invites on Ctrl+Enter", async () => {
    await polls(ctx).insertOne(invitationPoll());
    const p = await open();
    const input = p.document.querySelector<HTMLTextAreaElement>(".invitees-input")!;
    input.value = "ann@example.com";
    input.dispatchEvent(new p.window.KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));
    await p.settle();
    expect(rows(p).map((r) => r[0])).toEqual(["ann@example.com"]);
  });

  it("adds past the daily limit and says they will be sent as it frees up", async () => {
    await polls(ctx).insertOne(invitationPoll({ pollState: "OPEN" }));
    const p = await open();
    await invite(p, "ann@example.com bob@example.com");
    expect(p.document.querySelector(".invitees-summary")!.textContent).toBe("Invited Emails: 2.\n1 Email will be sent when your daily limit allows.\nDaily Limit: 1 Email");
    expect(p.document.querySelectorAll(".invitees-refusals li")).toHaveLength(0);
    expect(p.document.querySelector<HTMLTextAreaElement>(".invitees-input")!.value).toBe("");
    expect(rows(p).map((r) => r[0])).toEqual(["ann@example.com", "bob@example.com"]);

    await ctx.db.updateTable("poll_invitations").set({ sent_at: new Date() }).where("email", "=", "bob@example.com").execute();
    await p.settle(REFRESH_MS + 200);
    expect(p.document.querySelector(".invitees-summary")!.textContent).toBe("Invited Emails: 2.");
  });

  it("moves the pager to the page the added rows land on", async () => {
    await polls(ctx).insertOne(invitationPoll({ invitedVoterList: ["a@x.com", "b@x.com", "c@x.com", "d@x.com"] }));
    const p = await open();
    expect(p.document.querySelector<HTMLElement>(".invitees-pager")!.hidden).toBe(true);
    await invite(p, "e@x.com f@x.com g@x.com");
    expect(p.document.querySelector(".invitees-pager-range")!.textContent).toBe("6–7 of 7");
    expect(rows(p).map((r) => r[0])).toEqual(["f@x.com", "g@x.com"]);
    await p.click('.invitees-page-btn[data-step="-1"]');
    expect(p.document.querySelector(".invitees-pager-range")!.textContent).toBe("1–5 of 7");
  });
});

describe("rows", () => {
  it("shows each status as a chip, and the user name when known", async () => {
    const poll = invitationPoll({
      pollState: "OPEN",
      invitedVoterList: ["voted@x.com", "accepted@x.com", "failed@x.com", "invited@x.com", "pending@x.com"],
      currentVotes: [{ emailAddress: "voted@x.com", userName: "Vee", choiceIds: ["c1"], votedAt: new Date() }]
    });
    await polls(ctx).insertOne(poll);
    await forgeSession(ctx, "accepted@x.com");
    await ctx.db.updateTable("user").set({ userName: "Acey" }).where("email", "=", "accepted@x.com").execute();
    const now = new Date();
    const set = (email: string, values: Record<string, Date>) =>
      ctx.db.updateTable("poll_invitations").set(values).where("email", "=", email).execute();
    await set("voted@x.com", { sent_at: now });
    await set("accepted@x.com", { sent_at: now, accepted_at: now });
    await set("failed@x.com", { sent_at: now, send_failed_at: now });
    await set("invited@x.com", { sent_at: now });
    const p = await open();
    expect(rows(p)).toEqual([
      ["voted@x.com", "", "Voted"],
      ["accepted@x.com", "Acey", "Accepted"],
      ["failed@x.com", "", "Not delivered"],
      ["invited@x.com", "", "Invited"],
      ["pending@x.com", "", "Not sent yet"]
    ]);
    const chips = Array.from(p.document.querySelectorAll<HTMLElement>(".invitee-chip")).map((c) => c.dataset.status);
    expect(chips).toEqual(["Voted", "Accepted", "Not delivered", "Invited", "Not sent yet"]);
    expect(p.document.querySelector('[data-count="accepted"]')!.textContent).toBe("2");
  });

  it("offers Resend and Remove, Resend disabled with its reason", async () => {
    await polls(ctx).insertOne(invitationPoll({ invitedVoterList: ["ann@example.com"] }));
    const p = await open();
    p.document.querySelector<HTMLElement>(".invitee-row .actions-menu-trigger")!.click();
    await p.settle();
    const items = Array.from(p.document.querySelectorAll<HTMLButtonElement>(".invitee-row .actions-menu [role=menuitem]"));
    expect(items.map((i) => i.firstChild!.textContent)).toEqual(["Resend invitation", "Remove"]);
    expect(items[0]!.disabled).toBe(true);
    expect(items[0]!.querySelector(".invitee-menu-reason")!.textContent).toBe("The poll is not open.");
  });

  it("confirms before removing a voter and posts confirmVoted only on Remove", async () => {
    await polls(ctx).insertOne(invitationPoll({
      pollState: "OPEN",
      invitedVoterList: ["vee@example.com"],
      currentVotes: [{ emailAddress: "vee@example.com", userName: "Vee", choiceIds: ["c1"], votedAt: new Date() }]
    }));
    const p = await open();
    p.document.querySelector<HTMLElement>(".invitee-row .actions-menu-trigger")!.click();
    await p.settle();
    p.document.querySelectorAll<HTMLElement>(".invitee-row .actions-menu [role=menuitem]")[1]!.click();
    await p.settle();
    const confirm = p.document.querySelector(".invitee-confirm")!;
    expect(confirm.querySelector(".invitee-confirm-text")!.textContent).toBe("Remove vee@example.com? Their vote will be removed too.");
    expect(bodies.some((b) => b.method === "POST" && b.url.endsWith("/invitees"))).toBe(false);
    confirm.querySelector<HTMLElement>(".invitee-confirm-remove")!.click();
    await p.settle();
    const post = bodies.find((b) => b.method === "POST" && b.url.endsWith("/invitees"))!;
    expect(post.body).toEqual({ remove: ["vee@example.com"], confirmVoted: true, timeZone: zone() });
    expect(rows(p)).toEqual([]);
  });

  it("opens the confirmation when a plain remove finds the invitee has voted", async () => {
    const poll = invitationPoll({ pollState: "OPEN", invitedVoterList: ["vee@example.com"] });
    await polls(ctx).insertOne(poll);
    const p = await open();
    await ctx.db.insertInto("votes").values({ poll_id: poll._id, email: "vee@example.com", user_name: "Vee", choice_ids: ["c1"], voted_at: new Date() }).onConflict((oc) => oc.columns(["poll_id", "email"]).doUpdateSet({ choice_ids: ["c1"], voted_at: new Date() })).execute();
    p.document.querySelector<HTMLElement>(".invitee-row .actions-menu-trigger")!.click();
    await p.settle();
    p.document.querySelectorAll<HTMLElement>(".invitee-row .actions-menu [role=menuitem]")[1]!.click();
    await p.settle();
    expect(p.document.querySelector(".invitee-confirm")).not.toBeNull();
    expect(rows(p).map((r) => r[0])).toEqual(["vee@example.com"]);
  });

  it("writes a resend's daily limit from retryAt", async () => {
    await polls(ctx).insertOne(invitationPoll({ pollState: "OPEN", invitedVoterList: ["ann@example.com"] }));
    await ctx.db.updateTable("poll_invitations").set({ sent_at: new Date(Date.now() - 25 * 3_600_000) }).execute();
    await ctx.db.insertInto("invitation_emails").values({ creator_id: "", sent_at: new Date() }).execute();
    const p = await open();
    p.document.querySelector<HTMLElement>(".invitee-row .actions-menu-trigger")!.click();
    await p.settle();
    p.document.querySelector<HTMLElement>(".invitee-row .actions-menu [role=menuitem]")!.click();
    await p.settle();
    expect(p.document.querySelector(".invitees-summary")!.textContent).toMatch(
      /^Your daily invitation limit is reached until \d{1,2}:\d{2}\s?\S+\.$/
    );
  });

  it("is read-only on a CLOSED or ARCHIVED poll", async () => {
    await polls(ctx).insertOne(invitationPoll({ pollState: "CLOSED", invitedVoterList: ["ann@example.com"] }));
    const p = await open();
    const panel = panelOf(p)!;
    expect(panel.hasAttribute("data-readonly")).toBe(true);
    expect(panel.querySelector<HTMLElement>(".invitees-add")!.hidden).toBe(true);
    expect(panel.querySelector(".invitee-row .actions-menu-trigger")).toBeNull();
  });
});

describe("refresh", () => {
  it("refetches the list without clearing a draft or closing an open menu", async () => {
    await polls(ctx).insertOne(invitationPoll({ invitedVoterList: ["ann@example.com", "bob@example.com"] }));
    const p = await open();
    const input = p.document.querySelector<HTMLTextAreaElement>(".invitees-input")!;
    input.value = "draft@example.com";
    await ctx.db.updateTable("poll_invitations").set({ sent_at: new Date() }).where("email", "=", "bob@example.com").execute();
    const before = bodies.filter((b) => b.url.endsWith("/invitees")).length;
    await p.settle(REFRESH_MS + 200);
    expect(bodies.filter((b) => b.url.endsWith("/invitees")).length).toBeGreaterThan(before);
    expect(p.document.querySelector<HTMLTextAreaElement>(".invitees-input")!.value).toBe("draft@example.com");
    expect(rows(p)[1]).toEqual(["bob@example.com", "", "Invited"]);

    const trigger = p.document.querySelector<HTMLElement>(".invitee-row .actions-menu-trigger")!;
    trigger.click();
    await p.settle();
    await p.settle(REFRESH_MS + 200);
    expect(trigger.isConnected).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("the time zone on every write", () => {
  it("rides on PATCH, /save and /invitees", async () => {
    await polls(ctx).insertOne(invitationPoll({ pollState: "INITIALIZED", title: "Draft one" }));
    await polls(ctx).insertOne(invitationPoll({ pollState: "OPEN", title: "Open one" }));
    const p = await open();
    await invite(p, "ann@example.com");
    const closeBtn = Array.from(p.document.querySelectorAll<HTMLButtonElement>(".admin-state-btn")).find(
      (b) => b.textContent === "Close" && !b.disabled
    )!;
    closeBtn.click();
    await p.settle();
    Array.from(p.document.querySelectorAll<HTMLElement>(".poll-admin-card"))
      .find((c) => c.textContent!.includes("Draft one"))!
      .querySelector<HTMLElement>(".wizard-summary-link")!
      .click();
    await p.settle();
    Array.from(p.document.querySelectorAll<HTMLElement>(".poll-admin-card--new .btn-header-ghost"))
      .find((b) => b.textContent === "Save")!
      .click();
    await p.settle();
    const writes = bodies.filter((b) => ["POST", "PATCH"].includes(b.method) && !/edit-session/.test(b.url));
    expect(writes.map((w) => [w.method, w.url.replace(/.*\/polls\/[^/]+/, "")])).toEqual(
      expect.arrayContaining([["POST", "/invitees"], ["PATCH", ""], ["POST", "/save"]])
    );
    for (const write of writes) expect(write.body!.timeZone, write.url).toBe(zone());
  });
});
