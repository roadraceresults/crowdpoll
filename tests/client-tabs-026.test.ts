import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import { updatePoll } from "../src/polls/store.js";
import { upsertRelation } from "../src/polls/userPolls.js";
import { recordVote } from "../src/polls/store.js";
import { addBookmark } from "../src/polls/bookmarks.js";

let ctx: TestContext;
let fast: TestContext;
let page: BrowserPage | null = null;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1200" });
  fast = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1" });
});
afterAll(async () => {
  await ctx.stop();
  await fast.stop();
});
beforeEach(async () => {
  await polls(ctx).deleteMany({});
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
});
afterEach(() => {
  page?.close();
  page = null;
});

async function signedIn(email: string): Promise<BrowserPage> {
  const { cookie } = await forgeSession(ctx, email);
  const opened = await openPage(ctx, "index.html", { cookie });
  await opened.settle(1250);
  return opened;
}

describe("Shared With You cards", () => {
  it("offer no way to remove, hide or dismiss the poll", async () => {
    const me = "tabs026-shared@example.com";
    const poll = makePoll({ _id: randomUUID(), title: "Sent to me", pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: [me] });
    await polls(ctx).insertOne(poll);
    page = await signedIn(me);
    await page.click('.tab[data-tab="shared-with-you"]');
    await page.settle(1400);
    expect(page.cardTitles("shared-with-you")).toEqual(["Sent to me"]);
    const card = page.document.querySelector('.tab-panel[data-panel="shared-with-you"] .card-viewport')!;
    const labelled = Array.from(card.querySelectorAll("[aria-label], [title]")).filter((el) => !el.classList.contains("bookmark-btn"));
    for (const el of labelled) {
      expect(`${el.getAttribute("aria-label") ?? ""} ${el.getAttribute("title") ?? ""}`, el.className).not.toMatch(/\b(remove|hide|dismiss)\b/i);
    }
    expect(card.querySelector(".live-link[data-mode='remove'], .card-close-btn")).toBeNull();
  });
});

const PERSONAL = ["your-polls", "shared-with-you", "your-votes", "watching"];

async function open(context: TestContext, email?: string, permissions?: string[]): Promise<BrowserPage> {
  let cookie: string | undefined;
  if (email) {
    const forged = await forgeSession(context, email);
    cookie = forged.cookie;
    if (permissions) await context.db.updateTable("user").set({ permissions }).where("id", "=", forged.userId).execute();
  }
  const opened = await openPage(context, "index.html", { cookie });
  await opened.settle(100);
  return opened;
}

describe("the tab bar", () => {
  it("shows the eight tabs in order with Trending active", async () => {
    page = await open(fast, "tabs026-order@example.com");
    const tabs = Array.from(page.document.querySelectorAll("#tabBar .tab"));
    expect(tabs.map((t) => t.getAttribute("data-tab"))).toEqual(["your-polls", "shared-with-you", "your-votes", "trending", "newest", "watching", "live", "search"]);
    expect(tabs.filter((t) => t.classList.contains("is-active")).map((t) => t.getAttribute("data-tab"))).toEqual(["trending"]);
  });

  it("asks a guest to sign in on every personal tab", async () => {
    page = await open(fast);
    for (const name of PERSONAL) {
      const tab = page.document.querySelector(`.tab[data-tab="${name}"]`) as HTMLButtonElement;
      expect(tab.getAttribute("aria-disabled"), name).toBe("true");
    }
    await page.click('.tab[data-tab="your-votes"]');
    expect(page.navigations.length).toBeGreaterThan(0);
  });

  it("keeps all four personal tabs for a user without the view, vote or create grants", async () => {
    page = await open(fast, "tabs026-nogrants@example.com", []);
    for (const name of PERSONAL) {
      const tab = page.document.querySelector(`.tab[data-tab="${name}"]`) as HTMLButtonElement;
      expect(tab.hidden, name).toBe(false);
      expect(tab.getAttribute("aria-disabled"), name).toBeNull();
    }
  });

  it("stays one row that scrolls sideways", async () => {
    const css = readFileSync(path.resolve("src/public/tabs.css"), "utf8");
    expect(css).toMatch(/\.tab-bar\s*\{[^}]*overflow-x:\s*auto/);
  });
});

describe("empty tabs", () => {
  const LINES: Record<string, string> = {
    "your-polls": "You haven't created any polls yet.",
    "shared-with-you": "Nothing has been shared with you yet.",
    "your-votes": "You haven't voted in any polls yet.",
    watching: "You aren't watching any polls yet."
  };

  it("say so to the user, mention neither email nor notifications, and offer Create Poll only to those who can create", async () => {
    page = await open(fast, "tabs026-empty@example.com");
    for (const name of PERSONAL) {
      await page.click(`.tab[data-tab="${name}"]`);
      await page.settle(150);
      const empty = page.document.querySelector(`.tab-panel[data-panel="${name}"] .tab-empty`) as HTMLElement;
      expect(empty.hidden, name).toBe(false);
      expect(empty.textContent, name).toContain(LINES[name]);
      expect(empty.textContent, name).not.toMatch(/e-?mail|notif/i);
    }
    const link = page.document.querySelector('.tab-panel[data-panel="your-polls"] .tab-empty a') as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/admin");
    expect(page.document.querySelector('.tab-panel[data-panel="watching"] .tab-empty a')).toBeNull();
  });

  it("offers no Create Poll to a user who cannot create polls", async () => {
    page = await open(fast, "tabs026-nocreate@example.com", ["View Polls", "Vote on Polls"]);
    await page.click('.tab[data-tab="your-polls"]');
    await page.settle(150);
    expect(page.document.querySelector('.tab-panel[data-panel="your-polls"] .tab-empty a')).toBeNull();
  });
});

describe("the placeholder for a poll not published yet", () => {
  async function seedDraft(creatorName: string, me: string) {
    const owner = await forgeSession(fast, `tabs026-owner-${Math.random()}@example.com`);
    const poll = makePoll({
      _id: randomUUID(),
      title: "Hidden until published",
      subtitle: "Hidden subtitle",
      pollVisibility: "Private Poll",
      pollSharingMode: "Anyone With The Link",
      pollState: "INITIALIZED"
    });
    await polls(fast).insertOne(poll);
    await fast.db.updateTable("polls").set({ created_by_id: owner.userId, created_by_name: creatorName }).where("id", "=", poll._id).execute();
    await upsertRelation(fast.db, me, poll._id, "linked");
    return poll;
  }

  const cardText = (p: BrowserPage) => p.document.querySelector('.tab-panel[data-panel="shared-with-you"] .card-viewport')!;

  it("says who shared it, carries no title or choices, and becomes the ordinary card once published", async () => {
    const me = "tabs026-placeholder@example.com";
    const poll = await seedDraft("Dana Draft", me);
    page = await open(fast, me);
    await page.click('.tab[data-tab="shared-with-you"]');
    await page.settle(200);
    const card = cardText(page);
    expect(card.classList.contains("is-placeholder")).toBe(true);
    expect(card.querySelector(".card-front .question")!.textContent).toBe("Shared by Dana Draft");
    expect(card.textContent).not.toContain("Hidden until published");
    expect(card.querySelectorAll(".results-list li").length).toBe(0);

    await updatePoll(fast, poll._id, { pollState: "OPEN" });
    await page.settle(1300);
    await page.click("#refreshBtn");
    await page.settle(300);
    expect(page.cardTitles("shared-with-you")).toEqual(["Hidden until published"]);
    expect(cardText(page).classList.contains("is-placeholder")).toBe(false);
  });

  it("reads Shared with you when the creator has no name, and never shows an address", async () => {
    const me = "tabs026-unnamed@example.com";
    await seedDraft("", me);
    page = await open(fast, me);
    await page.click('.tab[data-tab="shared-with-you"]');
    await page.settle(200);
    const card = cardText(page);
    expect(card.querySelector(".card-front .question")!.textContent).toBe("Shared with you");
    expect(card.textContent).not.toMatch(/@/);
  });

  it("hides every control through the card stylesheet", () => {
    const css = readFileSync(path.resolve("src/public/pollCard.css"), "utf8");
    for (const part of [".actions", ".bookmark-btn", ".results-scroll-wrap", ".card-foot"]) {
      expect(css).toMatch(new RegExp(`\\.is-placeholder ${part.replace(".", "\\.")}`));
    }
  });
});

describe("Your Polls cards", () => {
  async function ownPoll(who: { userId: string }, email: string, overrides: Parameters<typeof makePoll>[0]) {
    const poll = makePoll({ _id: randomUUID(), ...overrides });
    await polls(fast).insertOne(poll);
    await fast.db.updateTable("polls").set({ created_by_id: who.userId }).where("id", "=", poll._id).execute();
    await upsertRelation(fast.db, email, poll._id, "created");
    return poll;
  }

  const cardOf = (p: BrowserPage, title: string) =>
    Array.from(p.document.querySelectorAll('.tab-panel[data-panel="your-polls"] .card-viewport')).find(
      (card) => card.querySelector(".card-front .question")!.textContent === title
    ) as HTMLElement;

  it("show the state of a poll that has not launched, and the reason it was rejected, and offer no voting", async () => {
    const me = "tabs026-creator@example.com";
    const forged = await forgeSession(fast, me);
    await ownPoll(forged, me, { title: "Waiting one", pollState: "AWAITING APPROVAL" });
    await ownPoll(forged, me, { title: "Rejected one", pollState: "REJECTED", pollRejectionReason: "Not acceptable" });
    const opened = await openPage(fast, "index.html", { cookie: forged.cookie });
    page = opened;
    await page.settle(100);
    await page.click('.tab[data-tab="your-polls"]');
    await page.settle(200);
    const waiting = cardOf(page, "Waiting one");
    const rejected = cardOf(page, "Rejected one");
    expect(waiting.querySelector(".poll-state-message")!.textContent).toBe("Awaiting Approval");
    expect(rejected.querySelector(".poll-state-message")!.textContent).toBe("Rejected — Not acceptable");
    for (const card of [waiting, rejected]) {
      expect((card.querySelector(".vote-btn") as HTMLElement).hidden).toBe(true);
      expect((card.querySelector(".live-link") as HTMLElement).hidden).toBe(true);
      expect((card.querySelector(".bookmark-btn") as HTMLElement).hidden).toBe(true);
    }
  });

  it("show an archived poll read-only with its state, and never say why a poll is listed", async () => {
    const me = "tabs026-archiver@example.com";
    const forged = await forgeSession(fast, me);
    const poll = await ownPoll(forged, me, { title: "Archived one", pollState: "ARCHIVED" });
    await recordVote(fast, poll._id, { emailAddress: me, userName: "", choiceIds: ["c1"], votedAt: new Date() });
    page = await openPage(fast, "index.html", { cookie: forged.cookie });
    await page.settle(100);
    await page.click('.tab[data-tab="your-polls"]');
    await page.settle(200);
    const card = cardOf(page, "Archived one");
    expect(card.querySelector(".poll-state-message")!.textContent).toBe("Archived");
    expect((card.querySelector(".vote-btn") as HTMLElement).hidden).toBe(true);
    expect((card.querySelector(".poll-listed-because") as HTMLElement).hidden).toBe(true);
  });
});

describe("the Watch control", () => {
  const cardOf = (p: BrowserPage, tab: string, title: string) =>
    Array.from(p.document.querySelectorAll(`.tab-panel[data-panel="${tab}"] .card-viewport`)).find(
      (card) => card.querySelector(".card-front .question")!.textContent === title
    ) as HTMLElement;
  const button = (card: HTMLElement) => card.querySelector(".bookmark-btn") as HTMLButtonElement;

  it("shows on Shared With You cards and toggles Watch and Watching, with the tooltip", async () => {
    const me = "tabs026-watch@example.com";
    const poll = makePoll({ _id: randomUUID(), title: "Sent to me", pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: [me] });
    await polls(fast).insertOne(poll);
    page = await open(fast, me);
    await page.click('.tab[data-tab="shared-with-you"]');
    await page.settle(200);
    const card = cardOf(page, "shared-with-you", "Sent to me");
    expect(button(card).hidden).toBe(false);
    expect(button(card).getAttribute("aria-label")).toBe("Watch");
    expect(button(card).title).toBe("Watch this poll");
    await page.settle(100);
    await page.click('.tab-panel[data-panel="shared-with-you"] .bookmark-btn');
    expect(button(card).getAttribute("aria-label")).toBe("Watching");
    expect(button(card).getAttribute("aria-pressed")).toBe("true");
    expect(button(card).title).toBe("Stop watching this poll");
    expect(button(card).querySelector("use")).not.toBeNull();
  });

  it("puts a poll watched from Shared With You first in Watching, and leaves it in Shared With You when watching stops", async () => {
    const me = "tabs026-watch-order@example.com";
    const earlier = makePoll({ _id: randomUUID(), title: "Watched earlier" });
    const shared = makePoll({ _id: randomUUID(), title: "Sent to me", pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: [me] });
    await polls(fast).insertMany([earlier, shared]);
    await addBookmark(fast, me, earlier._id, 200);
    page = await open(fast, me);
    await page.click('.tab[data-tab="watching"]');
    await page.settle(200);
    expect(page.cardTitles("watching")).toEqual(["Watched earlier"]);
    await page.click('.tab[data-tab="shared-with-you"]');
    await page.settle(200);
    await page.settle(100);
    await page.click('.tab-panel[data-panel="shared-with-you"] .bookmark-btn');
    await page.settle(100);
    await page.click('.tab[data-tab="watching"]');
    expect(page.cardTitles("watching")).toEqual(["Sent to me", "Watched earlier"]);

    await page.settle(100);
    await page.click('.tab-panel[data-panel="watching"] .card-viewport:first-child .bookmark-btn');
    await page.settle(100);
    expect(page.cardTitles("watching")).toEqual(["Watched earlier"]);
    await page.click('.tab[data-tab="shared-with-you"]');
    expect(page.cardTitles("shared-with-you")).toEqual(["Sent to me"]);
  });

  it("is hidden, not disabled, where the server says the user may not watch the poll", async () => {
    const me = "tabs026-watch-banned@example.com";
    const poll = makePoll({ _id: randomUUID(), title: "Banned here", pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link", bannedVoterList: [me] });
    await polls(fast).insertOne(poll);
    await upsertRelation(fast.db, me, poll._id, "linked");
    page = await open(fast, me);
    await page.click('.tab[data-tab="shared-with-you"]');
    await page.settle(200);
    expect(button(cardOf(page, "shared-with-you", "Banned here")).hidden).toBe(true);
  });
});

describe("the tab bar as M3 scrollable tabs", () => {
  const tabs = (p: BrowserPage) => Array.from(p.document.querySelectorAll("#tabBar .tab")) as HTMLButtonElement[];
  const press = (p: BrowserPage, key: string) =>
    p.document.activeElement!.dispatchEvent(new p.window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));

  it("is a tablist of tabs, each tied to its panel, with one selected", async () => {
    page = await open(fast, "tabs026-aria@example.com");
    const bar = page.document.getElementById("tabBar")!;
    expect(bar.getAttribute("role")).toBe("tablist");
    for (const tab of tabs(page)) {
      const name = tab.dataset.tab!;
      expect(tab.getAttribute("role")).toBe("tab");
      expect(tab.getAttribute("aria-controls")).toBe(`panel-${name}`);
      const panel = page.document.getElementById(`panel-${name}`)!;
      expect(panel.getAttribute("role")).toBe("tabpanel");
      expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
    }
    expect(tabs(page).filter((t) => t.getAttribute("aria-selected") === "true").map((t) => t.dataset.tab)).toEqual(["trending"]);
    expect(tabs(page).filter((t) => t.tabIndex === 0).map((t) => t.dataset.tab)).toEqual(["trending"]);
  });

  it("moves the selection with a click", async () => {
    page = await open(fast, "tabs026-aria-click@example.com");
    await page.click('.tab[data-tab="newest"]');
    expect(tabs(page).filter((t) => t.getAttribute("aria-selected") === "true").map((t) => t.dataset.tab)).toEqual(["newest"]);
    expect(page.document.getElementById("tab-newest")!.tabIndex).toBe(0);
    expect(page.document.getElementById("tab-trending")!.tabIndex).toBe(-1);
  });

  it("moves focus with the arrow keys, Home and End without activating a tab", async () => {
    page = await open(fast, "tabs026-keys@example.com");
    const requestsBefore = page.requests.length;
    const scrolled: Array<{ id: string; options: unknown }> = [];
    for (const tab of tabs(page)) tab.scrollIntoView = (options?: unknown) => scrolled.push({ id: tab.id, options });
    const newest = page.document.getElementById("tab-newest") as HTMLElement;
    const focusOptions: unknown[] = [];
    const focusNewest = newest.focus.bind(newest);
    newest.focus = (options?: FocusOptions) => {
      focusOptions.push(options);
      focusNewest(options);
    };
    (page.document.getElementById("tab-trending") as HTMLElement).focus();
    press(page, "ArrowRight");
    expect(page.document.activeElement!.id).toBe("tab-newest");
    expect(focusOptions).toEqual([{ preventScroll: true }]);
    expect(scrolled).toEqual([{ id: "tab-newest", options: { inline: "nearest", block: "nearest" } }]);
    press(page, "End");
    expect(page.document.activeElement!.id).toBe("tab-search");
    press(page, "ArrowRight");
    expect(page.document.activeElement!.id).toBe("tab-your-polls");
    press(page, "ArrowLeft");
    expect(page.document.activeElement!.id).toBe("tab-search");
    press(page, "Home");
    expect(page.document.activeElement!.id).toBe("tab-your-polls");
    expect(tabs(page).filter((t) => t.getAttribute("aria-selected") === "true").map((t) => t.dataset.tab)).toEqual(["trending"]);
    expect(scrolled).toHaveLength(5);
    expect(page.requests.length).toBe(requestsBefore);
    expect(page.navigations).toEqual([]);
  });

  it("stacks the icon over the label in a 64px tab at least 90px wide, on the home bar only", () => {
    const css = readFileSync(path.resolve("src/public/header-tab-bar-m3.css"), "utf8");
    expect(css).toMatch(/#tabBar \.tab\{[^}]*flex-direction:column[^}]*min-width:90px[^}]*height:64px/);
    expect(css).toMatch(/#tabBar \.tab \.tab-icon\{ width:24px; height:24px; \}/);
    expect(css).not.toMatch(/\.tab-bar \.tab\{[^}]*flex-direction:column/);
  });

  it("pulls the bar left by the tab's padding, so the first tab's icon starts under the logo", () => {
    const css = readFileSync(path.resolve("src/public/header-tab-bar-m3.css"), "utf8");
    expect(css).toMatch(/\.tab-bar \.tab\{[^}]*padding:0 16px;/);
    expect(css).toMatch(/#tabBar\{\s*margin-left:-16px;\s*scroll-padding:0 16px;/);
  });

  it("reads the width of the edge fades from --tab-fade, 24px unless a later layer says otherwise", () => {
    const css = readFileSync(path.resolve("src/public/header-tab-bar-m3.css"), "utf8");
    const from = css.indexOf(".tab-bar-wrap.has-tabs-before #tabBar{");
    const both = css.indexOf(".tab-bar-wrap.has-tabs-before.has-tabs-after #tabBar{");
    const masks = css.slice(from, css.indexOf("}", both) + 1);
    expect(masks.match(/mask-image:/g)).toHaveLength(6);
    expect(masks.match(/var\(--tab-fade, 24px\)/g)).toHaveLength(8);
    expect(masks).toContain("calc(100% - var(--tab-fade, 24px))");
    expect(masks.split("var(--tab-fade, 24px)").join("")).not.toContain("24px");
  });

  it("centres the admin notice line in the same column", () => {
    const css = readFileSync(path.resolve("src/public/admin.css"), "utf8");
    expect(css).toMatch(/\.admin-search-notice\{[^}]*width:min\(420px,100%\)[^}]*margin:0 auto 14px[^}]*text-align:center/);
  });

  it("centres the admin view tabs in the cards' 420px column", () => {
    const css = readFileSync(path.resolve("src/public/admin.css"), "utf8");
    expect(css).toMatch(/\.admin-tab-bar\{[^}]*width:min\(420px,100%\)[^}]*margin:0 auto 16px[^}]*justify-content:center/);
  });
});
