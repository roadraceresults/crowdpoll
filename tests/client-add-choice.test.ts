import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage, ON_TRENDING } from "./helpers/browser.js";
import { upsertRelation } from "../src/polls/userPolls.js";
import { countVote, flushDirty } from "../src/polls/counters.js";
import request from "supertest";
import type { Poll } from "../src/polls/store.js";

let ctx: TestContext;
let page: BrowserPage | null = null;
let users = 0;

const MAX_CHOICES = 12;
const SCRIPTS = ["app.js", "sharePoll.js", "pollCard.js", "voteClient.js", "deltaClient.js", "tabs.js", "trending.js", "newest.js", "searchTab.js", "liveResults.js"];

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MAX_CHOICES: String(MAX_CHOICES), ENV_MIN_VOTE_REFRESH_INTERVAL: "5000", ENV_MIN_MANUAL_REFRESH_INTERVAL: "100" });
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

const LUNCH = [
  { id: "c1", label: "Pizza", position: 0 },
  { id: "c2", label: "Sushi", position: 1 }
];

const many = (count: number) => Array.from({ length: count }, (_, i) => ({ id: `m${i + 1}`, label: `Choice ${i + 1}`, position: i }));

async function seed(viewer: { email: string }, overrides: Partial<Poll> = {}): Promise<Poll> {
  const poll = makePoll({
    _id: randomUUID(),
    title: "Lunch",
    pollVisibility: "Private Poll",
    pollSharingMode: "Anyone With The Link",
    voteMutability: "Dynamic-Vote Poll",
    votersAddChoices: true,
    choices: LUNCH,
    ...overrides
  });
  await polls(ctx).insertOne(poll);
  await upsertRelation(ctx.db, viewer.email, poll._id, "linked");
  return poll;
}

let shownTab = "shared-with-you";

async function openShared(cookie: string, tab = "shared-with-you", beforeScripts?: (window: BrowserPage["window"]) => void): Promise<BrowserPage> {
  shownTab = tab;
  const opened = await openPage(ctx, "index.html", { cookie, url: ON_TRENDING, scripts: SCRIPTS, beforeScripts });
  await opened.click(`.tab[data-tab="${tab}"]`);
  await opened.settle(50);
  return opened;
}

const card = (p: BrowserPage) => p.document.querySelector(`.tab-panel[data-panel="${shownTab}"] .card-viewport`) as HTMLElement;
const flipped = (p: BrowserPage) => card(p).querySelector(".card-flip")!.classList.contains("is-flipped");
const voteRow = (p: BrowserPage) => card(p).querySelector(".voting-list > .add-own-item") as HTMLLIElement | null;
const field = (p: BrowserPage) => voteRow(p)!.querySelector(".add-own-input") as HTMLInputElement;
const counter = (p: BrowserPage) => voteRow(p)!.querySelector(".add-own-counter")!.textContent;
const support = (p: BrowserPage) => p.document.getElementById(field(p).getAttribute("aria-describedby")!) as HTMLElement;
const rowShown = (p: BrowserPage) => Boolean(voteRow(p) && !voteRow(p)!.hidden);
const ballot = (p: BrowserPage) => Array.from(card(p).querySelectorAll(".voting-list > .vote-row")) as HTMLElement[];
const ballotLabels = (p: BrowserPage) => ballot(p).map((row) => row.textContent?.trim() ?? "");
const ticked = (p: BrowserPage) => ballot(p).filter((row) => row.classList.contains("is-selected")).map((row) => row.textContent?.trim());
const choicePosts = (p: BrowserPage) => p.requests.filter((r) => r.method === "POST" && r.url.endsWith("/choices"));
const snackbar = (p: BrowserPage) => p.document.querySelector(".m3-snackbar")?.textContent ?? "";

async function flip(p: BrowserPage) {
  (card(p).querySelector(".vote-btn") as HTMLButtonElement).click();
  await p.settle();
}

function type(p: BrowserPage, text: string, input: HTMLInputElement = field(p)) {
  input.focus();
  input.value = text;
  input.dispatchEvent(new p.window.Event("input", { bubbles: true }));
}

function key(p: BrowserPage, name: string, target: Element = field(p)) {
  target.dispatchEvent(new p.window.KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }));
}

async function enter(p: BrowserPage, input: HTMLInputElement = field(p)) {
  key(p, "Enter", input);
  await p.settle();
}

function touchOnly(window: BrowserPage["window"]) {
  window.matchMedia = ((query: string) => ({
    matches: query === "(pointer: coarse)",
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {}
  })) as unknown as typeof window.matchMedia;
}

describe("the add-your-own row on the voting face", () => {
  it("is the ballot's last row on a Private poll that takes new choices, compact and maximized, with no Add Choice button or dialog", async () => {
    const voter = await person();
    await seed(voter);
    page = await openShared(voter.cookie);
    await flip(page);
    expect(rowShown(page)).toBe(true);
    const row = voteRow(page)!;
    expect(card(page).querySelector(".voting-list")!.lastElementChild).toBe(row);
    expect(page.document.querySelector(".add-choice-btn")).toBeNull();
    expect((page.window as unknown as { AddChoiceDialog?: unknown }).AddChoiceDialog).toBeUndefined();

    (card(page).querySelector(".card-back .maximize-btn") as HTMLButtonElement).click();
    await page.settle();
    expect(card(page).classList.contains("maximized-card-viewport")).toBe(true);
    expect(voteRow(page)).toBe(row);
    expect(card(page).querySelector(".voting-list")!.lastElementChild).toBe(row);
    expect(row.hidden).toBe(false);
  });

  it("is hidden when the setting is off, the poll is not open, the vote is final, a grant is missing or the poll is full", async () => {
    const offVoter = await person();
    await seed(offVoter, { votersAddChoices: false });
    page = await openShared(offVoter.cookie);
    expect(rowShown(page)).toBe(false);
    page.close();

    const closedVoter = await person();
    await seed(closedVoter, { pollState: "CLOSED", endAt: new Date() });
    page = await openShared(closedVoter.cookie);
    expect(rowShown(page)).toBe(false);
    page.close();

    const finalVoter = await person();
    const finalPoll = await seed(finalVoter, { voteMutability: "Final-Vote Poll" });
    await ctx.db.insertInto("votes").values({ poll_id: finalPoll._id, email: finalVoter.email, user_name: "", choice_ids: ["c1"], voted_at: new Date() }).execute();
    await countVote(ctx.cache, finalPoll._id, ["c1"], [], true, new Date());
    page = await openShared(finalVoter.cookie);
    expect(rowShown(page)).toBe(false);
    page.close();

    const noVote = await person(["View Polls"]);
    await seed(noVote);
    page = await openShared(noVote.cookie);
    expect(page.document.querySelector(".add-own-item:not([hidden])")).toBeNull();
    page.close();

    const noView = await person(["Vote on Polls"]);
    await seed(noView);
    page = await openShared(noView.cookie);
    expect(page.document.querySelector(".add-own-item:not([hidden])")).toBeNull();
    page.close();

    const fullVoter = await person();
    await seed(fullVoter, { choices: many(MAX_CHOICES) });
    page = await openShared(fullVoter.cookie);
    await flip(page);
    expect(rowShown(page)).toBe(false);
  });

  it("stays for the creator after their final vote", async () => {
    const creator = await person();
    const poll = await seed(creator, { voteMutability: "Final-Vote Poll" });
    await ctx.db.updateTable("polls").set({ created_by_id: creator.userId }).where("id", "=", poll._id).execute();
    await upsertRelation(ctx.db, creator.email, poll._id, "created");
    await ctx.db.insertInto("votes").values({ poll_id: poll._id, email: creator.email, user_name: "", choice_ids: ["c1"], voted_at: new Date() }).execute();
    await countVote(ctx.cache, poll._id, ["c1"], [], true, new Date());
    page = await openShared(creator.cookie, "your-polls");
    await flip(page);
    expect(rowShown(page)).toBe(true);
  });

  it("is never offered to a guest", async () => {
    const someone = await person();
    await seed(someone);
    page = await openPage(ctx, "index.html", { scripts: SCRIPTS });
    expect(page.document.querySelector(".add-own-item:not([hidden])")).toBeNull();
  });

  it("is a single-line text field with a counter and a support line after the ballot", async () => {
    const voter = await person();
    await seed(voter);
    page = await openShared(voter.cookie);
    await flip(page);
    const input = field(page);
    expect(input.type).toBe("text");
    expect(input.getAttribute("autocomplete")).toBe("off");
    expect(input.getAttribute("enterkeyhint")).toBe("enter");
    expect(input.maxLength).toBe(35);
    expect(input.getAttribute("aria-label")).toBe("Add your own choice");
    expect(input.placeholder).toBe("Enter your own choice, then press Enter.");
    expect(support(page).classList.contains("add-own-support")).toBe(true);
    expect(support(page).getAttribute("aria-live")).toBe("polite");
    expect(support(page).hidden).toBe(true);
    expect(support(page).previousElementSibling!.classList.contains("voting-scroll-wrap")).toBe(true);
    expect(counter(page)).toBe("");
  });

  it("asks for the return key where the only pointer is a touch screen", async () => {
    const voter = await person();
    await seed(voter);
    page = await openShared(voter.cookie, "shared-with-you", touchOnly);
    await flip(page);
    expect(field(page).placeholder).toBe("Enter your own choice, then press ↵.");
  });
});

describe("Enter in the add-your-own row", () => {
  it("adds the trimmed choice once, unticked and last, keeping the ticks, the text field and its focus", async () => {
    const voter = await person();
    const poll = await seed(voter);
    page = await openShared(voter.cookie);
    await flip(page);
    ballot(page)[0]!.click();
    const before = ticked(page);
    type(page, "  Tacos ");
    await enter(page);
    expect(choicePosts(page)).toHaveLength(1);
    expect(choicePosts(page)[0]!.url).toBe(`/api/polls/${poll._id}/choices`);
    expect(choicePosts(page)[0]!.body).toEqual({ label: "Tacos" });
    expect(ballotLabels(page).at(-1)).toBe("Tacos");
    expect(ticked(page)).toEqual(before);
    expect(field(page).value).toBe("");
    expect(page.document.activeElement).toBe(field(page));
    expect(flipped(page)).toBe(true);
    expect(snackbar(page)).toBe("Choice added");
  });

  it("keeps an added choice through a vote for it, on the card and in the creator's voter count", async () => {
    const voter = await person();
    const poll = await seed(voter);
    await ctx.db.updateTable("polls").set({ created_by_id: voter.userId }).where("id", "=", poll._id).execute();
    await upsertRelation(ctx.db, voter.email, poll._id, "created");
    page = await openShared(voter.cookie, "your-polls");
    await flip(page);
    type(page, "Tacos");
    await enter(page);
    ballot(page).at(-1)!.click();
    (card(page).querySelector(".submit-vote-btn") as HTMLButtonElement).click();
    await page.settle(300);
    expect(flipped(page)).toBe(false);
    const front = card(page).querySelector(".card-front")!.textContent!.replace(/\s+/g, " ");
    expect(front).toContain("Tacos100%");
    expect(front).toContain("1 vote");
    expect([...ballotLabels(page)].sort()).toEqual(["Pizza", "Sushi", "Tacos"]);
    await flushDirty({ db: ctx.db, cache: ctx.cache });
    const list = await request(ctx.app).get("/api/admin/polls").set("Cookie", voter.cookie);
    expect(list.body.polls.find((p: { pid: string }) => p.pid === poll._id).voteCount).toBe(1);
  });

  it("sends nothing while the field is empty or holds a listed choice, which it names as you type, ignoring case and spacing", async () => {
    const voter = await person();
    await seed(voter);
    page = await openShared(voter.cookie);
    await flip(page);
    type(page, "   ");
    await enter(page);
    type(page, "  pizza ");
    expect(support(page).hidden).toBe(false);
    expect(support(page).textContent).toBe("This poll already has that choice.");
    expect(field(page).getAttribute("aria-invalid")).toBe("true");
    await enter(page);
    expect(choicePosts(page)).toHaveLength(0);
    type(page, "Pizza place");
    expect(support(page).hidden).toBe(true);
    expect(field(page).hasAttribute("aria-invalid")).toBe(false);
    expect(counter(page)).toBe("11 / 35");
  });

  it("cuts a paste to fit, with line breaks made spaces, and Escape empties the field", async () => {
    const voter = await person();
    await seed(voter);
    page = await openShared(voter.cookie);
    await flip(page);
    const paste = new page.window.Event("paste", { bubbles: true, cancelable: true }) as Event & { clipboardData: unknown };
    paste.clipboardData = { getData: () => "first line\nsecond line " + "x".repeat(35) };
    field(page).dispatchEvent(paste);
    expect(field(page).value).toBe(("first line second line " + "x".repeat(35)).slice(0, 35));
    expect(counter(page)).toBe("35 / 35");
    key(page, "Escape");
    expect(field(page).value).toBe("");
    expect(counter(page)).toBe("");
  });

  it("shows a refusal under the row, keeping the text and focus: the server's words, a wait, or a failure", async () => {
    const voter = await person();
    await seed(voter);
    page = await openShared(voter.cookie);
    await flip(page);
    type(page, "shit");
    await enter(page);
    expect(support(page).textContent).toBe("This choice uses language that isn't allowed.");
    expect(field(page).value).toBe("shit");
    expect(field(page).getAttribute("aria-invalid")).toBe("true");
    expect(page.document.activeElement).toBe(field(page));

    for (const k of await ctx.cache.scan("floor:*")) await ctx.cache.del(k);
    type(page, "Tacos");
    await enter(page);
    expect(support(page).hidden).toBe(true);
    type(page, "Curry");
    await enter(page);
    expect(support(page).textContent).toBe("Please wait a moment and try again.");
    expect(field(page).value).toBe("Curry");

    const served = page.window.fetch;
    page.window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") throw new TypeError("offline");
      return served(input, init);
    }) as typeof fetch;
    type(page, "Ramen");
    await enter(page);
    expect(support(page).textContent).toBe("Your choice could not be added. Please try again.");
    expect(field(page).value).toBe("Ramen");
  });

  it("logs nothing to the console", async () => {
    const voter = await person();
    await seed(voter);
    page = await openShared(voter.cookie);
    const logged: unknown[] = [];
    for (const method of ["log", "warn", "error"] as const) page.window.console[method] = (...args: unknown[]) => void logged.push(args);
    await flip(page);
    type(page, "Tacos");
    await enter(page);
    expect(logged).toEqual([]);
  });
});

describe("a row in use through live updates", () => {
  it("keeps the same field, its text, caret and focus when the poll is applied again", async () => {
    const voter = await person();
    const poll = await seed(voter);
    page = await openShared(voter.cookie);
    await flip(page);
    const input = field(page);
    type(page, "Tacos");
    input.setSelectionRange(1, 3);
    const tabs = (page.window as unknown as { Tabs: { applyAddedChoices(tab: string, pid: string, answer: object): void } }).Tabs;
    tabs.applyAddedChoices(shownTab, poll._id, { contentVersion: 99, choices: [...LUNCH, { id: "c3", label: "Curry", position: 2 }] });
    await page.settle();
    expect(ballotLabels(page)).toContain("Curry");
    expect(field(page)).toBe(input);
    expect(input.value).toBe("Tacos");
    expect([input.selectionStart, input.selectionEnd]).toEqual([1, 3]);
    expect(page.document.activeElement).toBe(input);
  });

  it("keeps focus and caret when the grid moves the card", async () => {
    const voter = await person();
    const first = await seed(voter, { title: "First" });
    const second = await seed(voter, { title: "Second" });
    page = await openShared(voter.cookie);
    const w = page.window as unknown as {
      Tabs: { createGrid(el: Element, opts: object): { render(state: object): void } };
      DeltaClient: { createTabState(): { order: string[]; cards: Map<string, unknown>; counts: Map<string, unknown>; overlay: Map<string, unknown> } };
    };
    const gridEl = page.document.createElement("div");
    page.document.body.appendChild(gridEl);
    const grid = w.Tabs.createGrid(gridEl, { tab: "shared-with-you" });
    const state = w.DeltaClient.createTabState();
    for (const pid of [first._id, second._id]) {
      const body = (await request(ctx.app).get(`/api/me/polls/${pid}`).set("Cookie", voter.cookie)).body;
      state.cards.set(pid, body.poll);
      state.counts.set(pid, body.counts);
      state.overlay.set(pid, body.overlay);
    }
    state.order = [first._id, second._id];
    grid.render(state);
    const moved = gridEl.children[1] as HTMLElement;
    (moved.querySelector(".vote-btn") as HTMLButtonElement).click();
    await page.settle();
    const input = moved.querySelector(".voting-list .add-own-input") as HTMLInputElement;
    type(page, "Tacos", input);
    input.setSelectionRange(2, 2);
    state.order = [second._id, first._id];
    grid.render(state);
    expect(gridEl.firstElementChild).toBe(moved);
    expect(page.document.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([2, 2]);
    expect(input.value).toBe("Tacos");
  });

  it("counts as a bar: a ballot that fits only without it opens maximized", async () => {
    const voter = await person();
    await seed(voter, { choices: many(10) });
    page = await openShared(voter.cookie);
    Object.defineProperty(card(page).querySelector(".voting-scroll-wrap")!, "clientHeight", { configurable: true, get: () => 259 });
    await flip(page);
    expect(card(page).classList.contains("maximized-card-viewport")).toBe(true);
    expect(flipped(page)).toBe(true);
  });

  it("holds a compact Voting Center open while its row has focus or text, and turns it at the next update after", async () => {
    const voter = await person();
    const poll = await seed(voter, { choices: [...LUNCH, { id: "c3", label: "Curry", position: 2 }] });
    page = await openShared(voter.cookie);
    await flip(page);
    type(page, "Tac");
    Object.defineProperty(card(page).querySelector(".voting-scroll-wrap")!, "clientHeight", { configurable: true, get: () => 51 });
    const tabs = (page.window as unknown as { Tabs: { applyAddedChoices(tab: string, pid: string, answer: object): void } }).Tabs;
    const again = () => tabs.applyAddedChoices(shownTab, poll._id, { contentVersion: 1, choices: poll.choices });
    again();
    await page.settle();
    expect(flipped(page)).toBe(true);
    expect(field(page).value).toBe("Tac");

    field(page).value = "";
    field(page).dispatchEvent(new page.window.Event("input", { bubbles: true }));
    again();
    await page.settle();
    expect(flipped(page)).toBe(true);

    field(page).blur();
    again();
    await page.settle();
    expect(flipped(page)).toBe(false);
  });
});

describe("filling the poll from the row", () => {
  it("hides the row and moves focus to the enabled Cast button", async () => {
    const voter = await person();
    await seed(voter, { choices: many(MAX_CHOICES - 1) });
    page = await openShared(voter.cookie);
    await flip(page);
    ballot(page)[0]!.click();
    type(page, "Last one");
    await enter(page);
    expect(rowShown(page)).toBe(false);
    expect(field(page).value).toBe("");
    expect(page.document.activeElement).toBe(card(page).querySelector(".submit-vote-btn"));
  });

  it("moves focus to Maximize when Cast is disabled", async () => {
    const voter = await person();
    await seed(voter, { choices: many(MAX_CHOICES - 1) });
    page = await openShared(voter.cookie);
    await flip(page);
    type(page, "Last one");
    await enter(page);
    expect(rowShown(page)).toBe(false);
    expect(page.document.activeElement).toBe(card(page).querySelector(".card-back .maximize-btn"));
  });
});

describe("the add-your-own row on the results face", () => {
  const resultsRow = (p: BrowserPage) => card(p).querySelector(".results-list > .add-own-item") as HTMLLIElement | null;
  const resultsField = (p: BrowserPage) => resultsRow(p)!.querySelector(".add-own-input") as HTMLInputElement;
  const bars = (p: BrowserPage) => Array.from(card(p).querySelectorAll(".results-list > .result-row")) as HTMLElement[];
  const roomForTen = (p: BrowserPage) =>
    Object.defineProperty(card(p).querySelector(".results-scroll-wrap")!, "clientHeight", { configurable: true, get: () => 259 });
  const redraw = async (p: BrowserPage) => {
    p.window.dispatchEvent(new p.window.Event("resize"));
    await p.settle(150);
  };

  it("is the last row, after More choices on a compact card and after every bar maximized", async () => {
    const voter = await person();
    await seed(voter, { choices: many(11) });
    page = await openShared(voter.cookie);
    roomForTen(page);
    await redraw(page);
    const row = resultsRow(page)!;
    expect(row.hidden).toBe(false);
    expect(card(page).querySelector(".results-list")!.lastElementChild).toBe(row);
    expect(row.previousElementSibling!.classList.contains("more-item")).toBe(true);

    (card(page).querySelector(".card-front .maximize-btn") as HTMLButtonElement).click();
    await page.settle();
    expect(resultsRow(page)).toBe(row);
    expect(card(page).querySelector(".results-list")!.lastElementChild).toBe(row);
    expect(row.hidden).toBe(false);
  });

  it("takes one bar's place on a full compact card; a viewer who may not add sees today's bars", async () => {
    const voter = await person();
    await seed(voter, { choices: many(11) });
    page = await openShared(voter.cookie);
    roomForTen(page);
    await redraw(page);
    expect(bars(page)).toHaveLength(8);
    page.close();

    const other = await person();
    await seed(other, { choices: many(11), votersAddChoices: false });
    page = await openShared(other.cookie);
    roomForTen(page);
    await redraw(page);
    expect(resultsRow(page)?.hidden ?? true).toBe(true);
    expect(bars(page)).toHaveLength(9);
    expect(card(page).querySelector(".results-list .more-row")).not.toBeNull();
  });

  it("neither turns nor maximizes the card when clicked", async () => {
    const voter = await person();
    await seed(voter);
    page = await openShared(voter.cookie);
    resultsField(page).click();
    resultsRow(page)!.click();
    await page.settle();
    expect(flipped(page)).toBe(false);
    expect(card(page).classList.contains("maximized-card-viewport")).toBe(false);
  });

  it("adds a choice that shows at 0% on the results, here and on the poll's other cards", async () => {
    const voter = await person();
    await seed(voter);
    page = await openShared(voter.cookie);
    await page.click('.tab[data-tab="home"]');
    await page.settle(400);
    shownTab = "home";
    type(page, "Tacos", resultsField(page));
    await enter(page, resultsField(page));
    expect(flipped(page)).toBe(false);
    expect(card(page).querySelector(".card-front")!.textContent!.replace(/\s+/g, " ")).toContain("Tacos0%");
    expect(page.document.activeElement).toBe(resultsField(page));
    const shared = page.document.querySelector('.tab-panel[data-panel="shared-with-you"] .card-viewport .card-front')!;
    expect(shared.textContent).toContain("Tacos");
  });

  it("moves focus to Voting Center once the poll is full", async () => {
    const voter = await person();
    await seed(voter, { choices: many(MAX_CHOICES - 1) });
    page = await openShared(voter.cookie);
    type(page, "Last one", resultsField(page));
    await enter(page, resultsField(page));
    expect(resultsRow(page)!.hidden).toBe(true);
    expect(page.document.activeElement).toBe(card(page).querySelector(".vote-btn"));
  });
});
