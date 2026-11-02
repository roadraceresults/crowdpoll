import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import { upsertRelation } from "../src/polls/userPolls.js";
import { countVote, flushDirty } from "../src/polls/counters.js";
import request from "supertest";
import type { Poll } from "../src/polls/store.js";

let ctx: TestContext;
let page: BrowserPage | null = null;
let users = 0;

const SCRIPTS = ["app.js", "addChoiceDialog.js", "pollCard.js", "voteClient.js", "deltaClient.js", "tabs.js", "trending.js", "newest.js", "searchTab.js", "liveResults.js"];

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MAX_CHOICES: "4", ENV_MIN_VOTE_REFRESH_INTERVAL: "5000" });
});

afterAll(async () => {
  page?.close();
  await ctx.stop();
});

beforeEach(async () => {
  page?.close();
  page = null;
  await polls(ctx).deleteMany({});
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
});

async function person(permissions?: string[]) {
  const email = `card-adder${users++}@example.com`;
  const forged = await forgeSession(ctx, email);
  if (permissions) await ctx.db.updateTable("user").set({ permissions }).where("id", "=", forged.userId).execute();
  return { ...forged, email };
}

async function seed(viewer: { email: string }, overrides: Partial<Poll> = {}): Promise<Poll> {
  const poll = makePoll({
    _id: randomUUID(),
    title: "Lunch",
    pollVisibility: "Private Poll",
    pollSharingMode: "Anyone With The Link",
    voteMutability: "Dynamic-Vote Poll",
    votersAddChoices: true,
    choices: [
      { id: "c1", label: "Pizza", position: 0 },
      { id: "c2", label: "Sushi", position: 1 }
    ],
    ...overrides
  });
  await polls(ctx).insertOne(poll);
  await upsertRelation(ctx.db, viewer.email, poll._id, "linked");
  return poll;
}

let shownTab = "shared-with-you";

async function openShared(cookie: string, tab = "shared-with-you"): Promise<BrowserPage> {
  shownTab = tab;
  const opened = await openPage(ctx, "index.html", { cookie, scripts: SCRIPTS });
  await opened.click(`.tab[data-tab="${tab}"]`);
  await opened.settle(50);
  return opened;
}

const card = (p: BrowserPage) => p.document.querySelector(`.tab-panel[data-panel="${shownTab}"] .card-viewport`) as HTMLElement | null;
const addButton = (p: BrowserPage) => card(p)?.querySelector(".add-choice-btn") as HTMLButtonElement | null;
const dialog = (p: BrowserPage) => p.document.querySelector(".add-choice-dialog") as HTMLElement | null;
const field = (p: BrowserPage) => dialog(p)!.querySelector(".add-choice-input") as HTMLInputElement;
const saveBtn = (p: BrowserPage) => dialog(p)!.querySelector(".add-choice-save") as HTMLButtonElement;
const errorLine = (p: BrowserPage) => card(p)!.querySelector(".poll-vote-error") as HTMLElement;
const votingLabels = (p: BrowserPage) =>
  Array.from(card(p)!.querySelectorAll(".voting-list .vote-row")).map((row) => row.textContent?.trim() ?? "");

async function flip(p: BrowserPage) {
  (card(p)!.querySelector(".vote-btn") as HTMLButtonElement).click();
  await p.settle();
}

function type(p: BrowserPage, text: string) {
  const input = field(p);
  input.value = text;
  input.dispatchEvent(new p.window.Event("input", { bubbles: true }));
}

function key(p: BrowserPage, name: string, target: Element = p.document.activeElement!) {
  target.dispatchEvent(new p.window.KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }));
}

async function openDialog(p: BrowserPage) {
  await flip(p);
  addButton(p)!.click();
  await p.settle();
}

describe("the Add Choice button", () => {
  it("shows on the voting face of a Private poll that takes new choices", async () => {
    const voter = await person();
    await seed(voter);
    page = await openShared(voter.cookie);
    await flip(page);
    expect(addButton(page)!.hidden).toBe(false);
    expect(addButton(page)!.textContent).toBe("Add Choice");
    const actions = Array.from(card(page)!.querySelector(".card-back .actions")!.children).map((el) => el.className);
    expect(actions[1]).toContain("add-choice-btn");
  });

  it("is hidden when the setting is off, the poll is not open, the vote is final, or a grant is missing", async () => {
    const offVoter = await person();
    await seed(offVoter, { votersAddChoices: false });
    page = await openShared(offVoter.cookie);
    expect(addButton(page)!.hidden).toBe(true);
    page.close();

    const closedVoter = await person();
    await seed(closedVoter, { pollState: "CLOSED", endAt: new Date() });
    page = await openShared(closedVoter.cookie);
    expect(addButton(page)!.hidden).toBe(true);
    page.close();

    const finalVoter = await person();
    const finalPoll = await seed(finalVoter, { voteMutability: "Final-Vote Poll" });
    await ctx.db.insertInto("votes").values({ poll_id: finalPoll._id, email: finalVoter.email, user_name: "", choice_ids: ["c1"], voted_at: new Date() }).execute();
    await countVote(ctx.cache, finalPoll._id, ["c1"], [], true, new Date());
    page = await openShared(finalVoter.cookie);
    expect(addButton(page)!.hidden).toBe(true);
    page.close();

    const noVote = await person(["View Polls"]);
    await seed(noVote);
    page = await openShared(noVote.cookie);
    expect(addButton(page)?.hidden ?? true).toBe(true);
    page.close();

    const noView = await person(["Vote on Polls"]);
    await seed(noView);
    page = await openShared(noView.cookie);
    expect(page.document.querySelector(".add-choice-btn:not([hidden])")).toBeNull();
  });

  it("stays for the creator after their final vote", async () => {
    const creator = await person();
    const poll = await seed(creator, { voteMutability: "Final-Vote Poll" });
    await ctx.db.updateTable("polls").set({ created_by_id: creator.userId }).where("id", "=", poll._id).execute();
    await upsertRelation(ctx.db, creator.email, poll._id, "created");
    await ctx.db.insertInto("votes").values({ poll_id: poll._id, email: creator.email, user_name: "", choice_ids: ["c1"], voted_at: new Date() }).execute();
    await countVote(ctx.cache, poll._id, ["c1"], [], true, new Date());
    page = await openShared(creator.cookie, "your-polls");
    expect(addButton(page)!.hidden).toBe(false);
  });

  it("is never offered to a guest", async () => {
    const someone = await person();
    await seed(someone);
    page = await openPage(ctx, "index.html", { scripts: SCRIPTS });
    expect(page.document.querySelector(".add-choice-btn:not([hidden])")).toBeNull();
  });
});

describe("pressing Add Choice", () => {
  it("loads the latest choices first, keeping the counts, and opens the dialog", async () => {
    const voter = await person();
    const poll = await seed(voter);
    await countVote(ctx.cache, poll._id, ["c1"], [], true, new Date());
    page = await openShared(voter.cookie);
    await ctx.db
      .updateTable("polls")
      .set({ choices: JSON.stringify([...poll.choices, { id: "c3", label: "Curry", position: 2 }]) })
      .where("id", "=", poll._id)
      .execute();
    await openDialog(page);
    expect(page.requests.some((r) => r.url === `/api/me/polls/${poll._id}`)).toBe(true);
    expect(votingLabels(page).join(" ")).toContain("Curry");
    expect(card(page)!.querySelector(".poll-totals")!.textContent).toBe("1 vote");
    expect(dialog(page)).not.toBeNull();
    expect(page.document.activeElement).toBe(field(page));
    expect(dialog(page)!.querySelector(".m3-field-counter")!.textContent).toBe("0 / 40");
  });

  it("says so, and opens nothing, when the choices cannot be loaded or the poll is full", async () => {
    const voter = await person();
    const poll = await seed(voter);
    page = await openShared(voter.cookie);
    await flip(page);
    await ctx.db.insertInto("poll_bans").values({ poll_id: poll._id, email: voter.email }).execute();
    addButton(page)!.click();
    await page.settle();
    expect(errorLine(page).hidden).toBe(false);
    expect(errorLine(page).textContent).toBe("Couldn't load the latest choices. Try again.");
    expect(dialog(page)).toBeNull();

    await ctx.db.deleteFrom("poll_bans").where("poll_id", "=", poll._id).execute();
    const four = ["A", "B", "C", "D"].map((label, position) => ({ id: `f${position}`, label, position }));
    await ctx.db.updateTable("polls").set({ choices: JSON.stringify(four) }).where("id", "=", poll._id).execute();
    addButton(page)!.click();
    await page.settle();
    expect(errorLine(page).textContent).toBe("This poll already has the most choices allowed (4).");
    expect(dialog(page)).toBeNull();
  });
});

describe("the dialog", () => {
  it("saves with Enter, and the new choice is last and unselected, the selection kept", async () => {
    const voter = await person();
    await seed(voter);
    page = await openShared(voter.cookie);
    await flip(page);
    (card(page)!.querySelector(".voting-list .vote-row") as HTMLElement).click();
    const selectedBefore = card(page)!.querySelectorAll(".voting-list .is-selected, .voting-list [aria-pressed='true'], .voting-list [aria-checked='true']").length;
    addButton(page)!.click();
    await page.settle();
    type(page, "Tacos");
    key(page, "Enter", field(page));
    await page.settle();
    expect(dialog(page)).toBeNull();
    expect(votingLabels(page)[votingLabels(page).length - 1]).toContain("Tacos");
    const rows = Array.from(card(page)!.querySelectorAll(".voting-list .vote-row"));
    const last = rows[rows.length - 1]!;
    expect(last.matches(".is-selected, [aria-pressed='true'], [aria-checked='true']")).toBe(false);
    expect(card(page)!.querySelectorAll(".voting-list .is-selected, .voting-list [aria-pressed='true'], .voting-list [aria-checked='true']").length).toBe(selectedBefore);
    expect(card(page)!.querySelector(".card-flip")!.classList.contains("is-flipped")).toBe(true);
  });

  it("keeps an added choice through a vote for it, on the card and in the creator's voter count (TWEAK01)", async () => {
    const voter = await person();
    const poll = await seed(voter);
    await ctx.db.updateTable("polls").set({ created_by_id: voter.userId }).where("id", "=", poll._id).execute();
    await upsertRelation(ctx.db, voter.email, poll._id, "created");
    page = await openShared(voter.cookie, "your-polls");
    await openDialog(page);
    type(page, "Tacos");
    key(page, "Enter", field(page));
    await page.settle();
    const rows = Array.from(card(page)!.querySelectorAll(".voting-list .vote-row")) as HTMLElement[];
    rows[rows.length - 1]!.click();
    (card(page)!.querySelector(".submit-vote-btn") as HTMLButtonElement).click();
    await page.settle(300);
    expect(card(page)!.querySelector(".card-flip")!.classList.contains("is-flipped")).toBe(false);
    const front = card(page)!.querySelector(".card-front")!.textContent!.replace(/\s+/g, " ");
    expect(front).toContain("Tacos100%");
    expect(front).toContain("1 vote");
    // TWEAK02: each voting row ends with its choice's vote count.
    expect([...votingLabels(page)].sort()).toEqual(["Pizza (0)", "Sushi (0)", "Tacos (1)"]);
    await flushDirty({ db: ctx.db, cache: ctx.cache });
    const list = await request(ctx.app).get("/api/admin/polls").set("Cookie", voter.cookie);
    expect(list.body.polls.find((p: { pid: string }) => p.pid === poll._id).voteCount).toBe(1);
  });

  it("closes with Escape and with Cancel, returning focus to the button", async () => {
    const voter = await person();
    await seed(voter);
    page = await openShared(voter.cookie);
    await openDialog(page);
    key(page, "Escape");
    expect(dialog(page)).toBeNull();
    expect(page.document.activeElement).toBe(addButton(page));
    addButton(page)!.click();
    await page.settle();
    (dialog(page)!.querySelector(".add-choice-cancel") as HTMLButtonElement).click();
    expect(dialog(page)).toBeNull();
    expect(page.document.activeElement).toBe(addButton(page));
  });

  it("logs nothing to the console", async () => {
    const voter = await person();
    await seed(voter);
    page = await openShared(voter.cookie);
    const logged: unknown[] = [];
    for (const method of ["log", "warn", "error"] as const) page.window.console[method] = (...args: unknown[]) => void logged.push(args);
    await openDialog(page);
    type(page, "Tacos");
    saveBtn(page).click();
    await page.settle();
    expect(logged).toEqual([]);
  });

  it("stops at 40 characters, and a paste is cut to fit with line breaks made spaces", async () => {
    const voter = await person();
    await seed(voter);
    page = await openShared(voter.cookie);
    await openDialog(page);
    expect(field(page).maxLength).toBe(40);
    const paste = new page.window.Event("paste", { bubbles: true, cancelable: true }) as Event & { clipboardData: unknown };
    paste.clipboardData = { getData: () => "first line\nsecond line " + "x".repeat(40) };
    field(page).dispatchEvent(paste);
    expect(field(page).value).toBe(("first line second line " + "x".repeat(40)).slice(0, 40));
    expect(dialog(page)!.querySelector(".m3-field-counter")!.textContent).toBe("40 / 40");
  });

  it("refuses a listed choice as you type, ignoring case and spacing", async () => {
    const voter = await person();
    await seed(voter);
    page = await openShared(voter.cookie);
    await openDialog(page);
    type(page, "  pizza ");
    expect(dialog(page)!.querySelector(".m3-field-support")!.textContent).toBe("This poll already has that choice.");
    expect(saveBtn(page).disabled).toBe(true);
    type(page, "Pizza place");
    expect(saveBtn(page).disabled).toBe(false);
  });

  it("shows the server's refusal under the field and keeps the text; too soon asks to wait", async () => {
    const voter = await person();
    await seed(voter);
    page = await openShared(voter.cookie);
    await openDialog(page);
    type(page, "shit");
    saveBtn(page).click();
    await page.settle();
    expect(dialog(page)!.querySelector(".m3-field-support")!.textContent).toBe("This choice uses language that isn't allowed.");
    expect(field(page).value).toBe("shit");
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    type(page, "Tacos");
    saveBtn(page).click();
    await page.settle();
    expect(dialog(page)).toBeNull();
    addButton(page)!.click();
    await page.settle();
    type(page, "Curry");
    saveBtn(page).click();
    await page.settle();
    expect(dialog(page)!.querySelector(".m3-field-support")!.textContent).toBe("Please wait a moment and try again.");
    expect(field(page).value).toBe("Curry");
  });
});
