/**
 * Removing a vote from the card: on a Dynamic-Vote poll a voter who holds a vote
 * un-sets every choice, the button reads "Remove vote", and one click removes the
 * vote on the card at once (specs/20261112-173151-REMOVE-VOTE/contracts/ui-contracts.md).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage, ON_TRENDING } from "./helpers/browser.js";
import { upsertRelation } from "../src/polls/userPolls.js";
import { castVote } from "../src/votes/votePath.js";
import type { Poll } from "../src/polls/store.js";

let ctx: TestContext;
let page: BrowserPage | null = null;
let users = 0;

const SCRIPTS = ["app.js", "addChoiceDialog.js", "pollCard.js", "voteClient.js", "deltaClient.js", "tabs.js", "trending.js", "newest.js", "searchTab.js", "liveResults.js"];
const HOLD_MS = 300;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_VOTE_REFRESH_INTERVAL: String(HOLD_MS), ENV_MIN_MANUAL_REFRESH_INTERVAL: "1" });
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

async function person() {
  const email = `remover${users++}@example.com`;
  const forged = await forgeSession(ctx, email);
  return { ...forged, email };
}

async function seed(viewer: { email: string }, overrides: Partial<Poll> = {}): Promise<Poll> {
  const poll = makePoll({
    _id: randomUUID(),
    title: "Lunch",
    pollVisibility: "Private Poll",
    pollSharingMode: "Anyone With The Link",
    voteMutability: "Dynamic-Vote Poll",
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

async function voteFor(viewer: { email: string }, poll: Poll, choiceIds: string[]) {
  await castVote(ctx, { sessionId: `seed-${viewer.email}`, email: viewer.email, userName: "", ip: `10.6.0.${users}`, pid: poll._id, choiceIds });
  await ctx.consumer.runOnce();
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
}

async function openShared(cookie: string): Promise<BrowserPage> {
  const opened = await openPage(ctx, "index.html", { cookie, url: ON_TRENDING, scripts: SCRIPTS });
  await opened.click('.tab[data-tab="shared-with-you"]');
  await opened.settle(50);
  return opened;
}

const card = (p: BrowserPage) => p.document.querySelector('.tab-panel[data-panel="shared-with-you"] .card-viewport') as HTMLElement;
const voteBtn = (p: BrowserPage) => card(p).querySelector(".vote-btn") as HTMLButtonElement;
const submitBtn = (p: BrowserPage) => card(p).querySelector(".submit-vote-btn") as HTMLButtonElement;
const submitLabel = (p: BrowserPage) => submitBtn(p).querySelector(".btn-vote-label")!.textContent;
const flipped = (p: BrowserPage) => card(p).querySelector(".card-flip")!.classList.contains("is-flipped");
const rows = (p: BrowserPage) => Array.from(card(p).querySelectorAll(".voting-list .vote-row")) as HTMLElement[];
const rowOf = (p: BrowserPage, label: string) => rows(p).find((row) => row.textContent?.trim() === label)!;
const selectedLabels = (p: BrowserPage) => rows(p).filter((row) => row.classList.contains("is-selected")).map((row) => row.textContent?.trim());
const totals = (p: BrowserPage) => card(p).querySelector(".card-front .poll-totals")!.textContent;
const notice = (p: BrowserPage) => card(p).querySelector(".card-front .poll-vote-notice") as HTMLElement;
const votedLine = (p: BrowserPage) => card(p).querySelector(".poll-voted") as HTMLElement;

async function flip(p: BrowserPage) {
  voteBtn(p).click();
  await p.settle();
}

describe("the ballot of a voter who holds a vote on a Dynamic-Vote poll", () => {
  it("reads Remove vote while the selection is empty, Submit vote while it holds a choice", async () => {
    const voter = await person();
    const poll = await seed(voter);
    await voteFor(voter, poll, ["c1"]);
    page = await openShared(voter.cookie);
    await flip(page);
    expect(selectedLabels(page)).toEqual(["Pizza"]);
    expect(submitLabel(page)).toBe("Submit vote");
    expect(submitBtn(page).disabled).toBe(false);

    rowOf(page, "Pizza").click();
    expect(selectedLabels(page)).toEqual([]);
    expect(submitBtn(page).disabled).toBe(false);
    expect(submitLabel(page)).toBe("Remove vote");

    rowOf(page, "Sushi").click();
    expect(submitLabel(page)).toBe("Submit vote");
    expect(submitBtn(page).disabled).toBe(false);

    rowOf(page, "Sushi").click();
    expect(submitLabel(page)).toBe("Remove vote");
    expect(submitBtn(page).disabled).toBe(false);
  });

  it("removes the vote on one click: the card flips to its results with the lower count, the notice, no You voted, and a held Vote button", async () => {
    const voter = await person();
    const poll = await seed(voter);
    await voteFor(voter, poll, ["c1"]);
    page = await openShared(voter.cookie);
    expect(totals(page)).toBe("1 vote");
    expect(votedLine(page).hidden).toBe(false);
    await flip(page);
    rowOf(page, "Pizza").click();
    expect(submitLabel(page)).toBe("Remove vote");
    submitBtn(page).click();
    await page.settle(100);

    expect(flipped(page)).toBe(false);
    expect(notice(page).hidden).toBe(false);
    expect(notice(page).textContent).toBe("Your vote was removed.");
    expect(notice(page).closest(".card-foot-row")).not.toBeNull();
    expect(Array.from(card(page).querySelectorAll(".card-front .actions > *:not([hidden])")).map((el) => el.className)).toEqual(["live-link", "btn-primary btn-vote vote-btn"]);
    expect(votedLine(page).hidden).toBe(true);
    expect(totals(page)).toBe("0 votes");
    const front = card(page).querySelector(".card-front")!.textContent!.replace(/\s+/g, " ");
    expect(front).toContain("Pizza0%");
    expect(voteBtn(page).disabled).toBe(true);
    await page.settle(HOLD_MS);
    expect(voteBtn(page).disabled).toBe(false);

    await ctx.consumer.runOnce();
    const row = await ctx.db.selectFrom("votes").select("choice_ids").where("poll_id", "=", poll._id).executeTakeFirstOrThrow();
    expect(row.choice_ids).toEqual([]);

    await flip(page);
    expect(selectedLabels(page)).toEqual([]);
    expect(submitBtn(page).disabled).toBe(true);
    expect(submitLabel(page)).toBe("Submit vote");
  });

  it("on a multiple-choice poll still submits while one of two choices is set, and removes only when both are un-set", async () => {
    const voter = await person();
    const poll = await seed(voter, { choiceMode: "Multiple-Choice Poll" });
    await voteFor(voter, poll, ["c1", "c2"]);
    page = await openShared(voter.cookie);
    await flip(page);
    expect(selectedLabels(page).sort()).toEqual(["Pizza", "Sushi"]);
    rowOf(page, "Pizza").click();
    expect(submitLabel(page)).toBe("Submit votes");
    expect(submitBtn(page).disabled).toBe(false);
    rowOf(page, "Sushi").click();
    expect(submitLabel(page)).toBe("Remove vote");
    expect(submitBtn(page).disabled).toBe(false);
  });
});

describe("the ballot where there is nothing to remove", () => {
  it("stays disabled and reads Submit vote for a viewer who never voted, whatever they un-set", async () => {
    const viewer = await person();
    await seed(viewer);
    page = await openShared(viewer.cookie);
    await flip(page);
    expect(selectedLabels(page)).toEqual([]);
    expect(submitBtn(page).disabled).toBe(true);
    expect(submitLabel(page)).toBe("Submit vote");
    rowOf(page, "Pizza").click();
    expect(submitBtn(page).disabled).toBe(false);
    expect(submitLabel(page)).toBe("Submit vote");
    rowOf(page, "Pizza").click();
    expect(submitBtn(page).disabled).toBe(true);
    expect(submitLabel(page)).toBe("Submit vote");
  });

  it("never reads Remove vote on a Final-Vote poll, even for a voter who holds a vote", async () => {
    const voter = await person();
    const poll = await seed(voter, { voteMutability: "Final-Vote Poll" });
    await voteFor(voter, poll, ["c1"]);
    page = await openShared(voter.cookie);
    await flip(page);
    expect(selectedLabels(page)).toEqual(["Pizza"]);
    expect(submitLabel(page)).toBe("Submit vote");
    rowOf(page, "Pizza").click();
    expect(selectedLabels(page)).toEqual([]);
    expect(submitBtn(page).disabled).toBe(true);
    expect(submitLabel(page)).toBe("Submit vote");
    expect(Array.from(submitBtn(page).querySelectorAll(".btn-vote-sizer")).map((el) => el.textContent)).toEqual(["Submit vote", ""]);
  });
});

describe("a removal refused because the poll is being edited", () => {
  it("flips the card to the front with the editing message, keeps the empty selection, and offers Remove vote once the poll reopens", async () => {
    const voter = await person();
    const poll = await seed(voter);
    await voteFor(voter, poll, ["c1"]);
    page = await openShared(voter.cookie);
    await flip(page);
    rowOf(page, "Pizza").click();
    expect(submitLabel(page)).toBe("Remove vote");
    // The route serves a poll under edit as it was before the edit, so the answer is
    // staged here: the card's handling of it is what this test pins.
    const client = page.window.VoteClient as { submit: (pid: string, ids: string[]) => Promise<unknown> };
    const realSubmit = client.submit;
    let sent: string[] | null = null;
    client.submit = async (_pid: string, ids: string[]) => {
      sent = ids;
      return { ok: false, code: "POLL_EDITING", error: "This poll is momentarily unavailable to cast a vote. Please try again shortly." };
    };
    submitBtn(page).click();
    await page.settle(100);
    client.submit = realSubmit;
    expect(sent).toEqual([]);

    expect(flipped(page)).toBe(false);
    const editingMessage = card(page).querySelector(".card-front .poll-editing-message") as HTMLElement;
    expect(editingMessage.hidden).toBe(false);
    expect(editingMessage.textContent).not.toBe("");
    expect(notice(page).hidden).toBe(true);
    expect(totals(page)).toBe("1 vote");

    // The creator publishes the edit: the changed poll reaches the card on the next refresh.
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { subtitle: "Edited" } });
    await page.click("#refreshBtn");
    await page.settle(100);
    expect(editingMessage.hidden).toBe(true);
    await flip(page);
    expect(selectedLabels(page)).toEqual([]);
    expect(submitBtn(page).disabled).toBe(false);
    expect(submitLabel(page)).toBe("Remove vote");
  });
});
