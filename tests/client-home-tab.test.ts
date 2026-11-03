/**
 * The Home tab in a browser: the landing tab of a signed-in visitor, hidden from guests, its reason lines,
 * and `keepOrder`, which holds Home's list while the user acts on its cards until Home is next opened.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage, ON_TRENDING } from "./helpers/browser.js";
import { trendingSweep } from "../src/polls/sweeps.js";
import { insertPoll } from "../src/polls/store.js";
import { addBookmark } from "../src/polls/bookmarks.js";

let ctx: TestContext;
let page: BrowserPage | null = null;
let visitors = 0;

const SCRIPTS = ["app.js", "pollCard.js", "voteClient.js", "deltaClient.js", "tabs.js", "trending.js", "newest.js", "searchTab.js", "liveResults.js", "tabBarScroll.js"];

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1" });
});
afterAll(async () => {
  await ctx.stop();
});
beforeEach(async () => {
  await polls(ctx).deleteMany({});
  for (const pattern of ["floor:*", "home:*", "listing:*"]) {
    for (const key of await ctx.cache.scan(pattern)) await ctx.cache.del(key);
  }
});
afterEach(() => {
  page?.close();
  page = null;
});

type Visitor = { email: string; userId: string; options: { cookie?: string; url?: string; scripts: string[] } };

async function visitor(): Promise<Visitor> {
  const email = `home-browser${visitors++}@example.com`;
  const { cookie, userId } = await forgeSession(ctx, email);
  return { email, userId, options: { cookie, scripts: SCRIPTS } };
}

async function open(options: Visitor["options"] | { scripts: string[]; url?: string }): Promise<BrowserPage> {
  const opened = await openPage(ctx, "index.html", options);
  await opened.settle(100);
  return opened;
}

const activeTab = (p: BrowserPage) => p.document.querySelector("#tabBar .tab.is-active")!.getAttribute("data-tab");
const homeTab = (p: BrowserPage) => p.document.getElementById("tab-home") as HTMLButtonElement;
const homeRequests = (p: BrowserPage) => p.requests.filter((r) => r.url === "/api/tabs/home/refresh");
const lastHomeBody = (p: BrowserPage) => homeRequests(p).at(-1)!.body as { keepOrder?: boolean };

function homeCard(p: BrowserPage, title: string): Element {
  return Array.from(p.document.querySelectorAll('.tab-panel[data-panel="home"] .card-viewport')).find(
    (el) => el.querySelector(".card-front .question")!.textContent === title
  )!;
}
const reasonOf = (card: Element) => {
  const el = card.querySelector(".card-front .poll-listed-because") as HTMLElement;
  return el.hidden ? "" : el.textContent;
};
const votedOf = (card: Element) => {
  const el = card.querySelector(".card-front .poll-voted") as HTMLElement;
  return el.hidden ? "" : el.textContent;
};

describe("landing", () => {
  it("lands a signed-in visitor on Home, first in the bar, with why each poll is listed", async () => {
    const me = await visitor();
    const shared = makePoll({ title: "Shared and watched", pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: [me.email] });
    await insertPoll(ctx, shared, { id: "someone", name: "Someone", email: "someone@example.com" });
    await addBookmark(ctx, me.email, shared._id, 200);
    await insertPoll(ctx, makePoll({ title: "My own" }), { id: me.userId, name: "Me", email: me.email });
    await insertPoll(ctx, makePoll({ title: "Popular" }));
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);

    page = await open(me.options);
    expect(activeTab(page)).toBe("home");
    expect(homeTab(page).hidden).toBe(false);
    expect(page.document.querySelector("#tabBar .tab")!.getAttribute("data-tab")).toBe("home");
    expect(page.cardTitles("home")).toEqual(["Shared and watched", "My own", "Popular"]);
    expect(reasonOf(homeCard(page, "Shared and watched"))).toBe("You were invited · You are watching");
    expect(reasonOf(homeCard(page, "My own"))).toBe("Your poll");
    expect(reasonOf(homeCard(page, "Popular"))).toBe("Trending");

    await page.click('.tab[data-tab="your-polls"]');
    const own = page.document.querySelector('.tab-panel[data-panel="your-polls"] .card-front .poll-listed-because') as HTMLElement;
    expect(own.hidden).toBe(true);
  });

  it("lands a guest on Trending, with no Home tab and none in the All tabs menu", async () => {
    page = await open({ scripts: SCRIPTS });
    expect(activeTab(page)).toBe("trending");
    expect(homeTab(page).hidden).toBe(true);
    expect(homeRequests(page)).toHaveLength(0);
    (page.document.getElementById("tabMenuBtn") as HTMLButtonElement).click();
    const items = Array.from(page.document.querySelectorAll<HTMLElement>("#tabMenu .tab-menu-item")).map((item) => item.dataset.tab);
    expect(items).not.toContain("home");
    expect(items).toContain("trending");
  });

  it("lets a link's landing tab win over Home", async () => {
    const me = await visitor();
    page = await open({ ...me.options, url: ON_TRENDING });
    expect(activeTab(page)).toBe("trending");
    expect(homeRequests(page)).toHaveLength(0);
  });

  it("sends a guest who follows /?tab=home to Trending", async () => {
    page = await open({ scripts: SCRIPTS, url: "http://localhost/?tab=home" });
    expect(activeTab(page)).toBe("trending");
    await (page.window as unknown as { Tabs: { select(name: string): Promise<void> } }).Tabs.select("home");
    expect(activeTab(page)).toBe("trending");
    expect(page.navigations).toEqual([]);
  });

  it("says what Home will hold when it holds nothing", async () => {
    const me = await visitor();
    page = await open(me.options);
    const empty = page.document.querySelector('.tab-panel[data-panel="home"] .tab-empty') as HTMLElement;
    expect(empty.hidden).toBe(false);
    expect(empty.textContent).toBe(
      "Nothing here yet. Polls shared with you, your polls, your votes, the polls you watch and what's trending will appear here."
    );
  });
});

describe("guests", () => {
  it("skips the hidden Home tab with the arrow keys", async () => {
    page = await open({ scripts: SCRIPTS });
    const press = (key: string) =>
      page!.document.activeElement!.dispatchEvent(new page!.window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    (page.document.getElementById("tab-your-polls") as HTMLElement).focus();
    press("ArrowLeft");
    expect(page.document.activeElement!.id).toBe("tab-search");
    press("Home");
    expect(page.document.activeElement!.id).toBe("tab-your-polls");
  });

  it("hides Home and opens Trending on sign-out, and shows it again on sign-in without leaving the tab", async () => {
    const me = await visitor();
    page = await open(me.options);
    expect(activeTab(page)).toBe("home");
    const session = (page.window as unknown as { Session: { refresh(): Promise<boolean> } }).Session;

    delete me.options.cookie;
    await session.refresh();
    await page.settle(50);
    expect(homeTab(page).hidden).toBe(true);
    expect(activeTab(page)).toBe("trending");

    me.options.cookie = (await forgeSession(ctx, `home-again${visitors++}@example.com`)).cookie;
    await session.refresh();
    await page.settle(50);
    expect(homeTab(page).hidden).toBe(false);
    expect(activeTab(page)).toBe("trending");
  });
});

describe("keeping Home's order while the user acts on it", () => {
  type Tabs = {
    select(name: string): Promise<void>;
    applyVote(name: string, pid: string, outcome: Record<string, unknown>): void;
    applyAddedChoices(name: string, pid: string, answer: Record<string, unknown>): void;
    controller(name: string): { refresh(): Promise<void>; markDue(): void };
  };
  const tabsOf = (p: BrowserPage) => (p.window as unknown as { Tabs: Tabs }).Tabs;

  async function homeWithPolls(): Promise<{ me: Visitor; pid: string }> {
    const me = await visitor();
    const poll = makePoll({ title: "Watch me" });
    await insertPoll(ctx, poll);
    await insertPoll(ctx, makePoll({ title: "Another" }));
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await open(me.options);
    expect(page.cardTitles("home")).toHaveLength(2);
    return { me, pid: poll._id };
  }

  it("sends keepOrder after a vote on a Home card, until Home is opened again from another tab", async () => {
    const { pid } = await homeWithPolls();
    expect(lastHomeBody(page!).keepOrder).toBeUndefined();
    tabsOf(page!).applyVote("home", pid, { voteCount: 1, choiceCounts: { c1: 1 }, countsVersion: 9, myChoiceIds: ["c1"] });
    expect(votedOf(homeCard(page!, "Watch me"))).toBe("You voted");

    await tabsOf(page!).controller("home").refresh();
    expect(lastHomeBody(page!).keepOrder).toBe(true);

    // Choosing Home again while it is showing keeps the order.
    await tabsOf(page!).select("home");
    await page!.settle(20);
    expect(lastHomeBody(page!).keepOrder).toBe(true);

    await page!.click('.tab[data-tab="trending"]');
    await page!.settle(20);
    await page!.click('.tab[data-tab="home"]');
    await page!.settle(20);
    expect(lastHomeBody(page!).keepOrder).toBeUndefined();
  });

  it("sends keepOrder after a watch on a Home card, whose reason line says so at once", async () => {
    await homeWithPolls();
    const before = page!.cardTitles("home");
    const card = homeCard(page!, "Watch me");
    (card.querySelector(".card-front .bookmark-btn") as HTMLButtonElement).click();
    await page!.settle(50);
    expect(reasonOf(card)).toBe("Trending · You are watching");
    expect(lastHomeBody(page!).keepOrder).toBe(true);
    expect(page!.cardTitles("home")).toEqual(before);
  });

  it("sends keepOrder after a choice added on a Home card", async () => {
    const { pid } = await homeWithPolls();
    tabsOf(page!).applyAddedChoices("home", pid, {
      choices: [{ id: "c1", label: "Yes" }, { id: "c2", label: "No" }, { id: "c9", label: "Maybe" }],
      contentVersion: 99
    });
    await tabsOf(page!).controller("home").refresh();
    expect(lastHomeBody(page!).keepOrder).toBe(true);
  });

  it("sends keepOrder after an unwatch on a Home card, keeping the card where it was", async () => {
    const me = await visitor();
    const watched = makePoll({ title: "Watched" });
    await insertPoll(ctx, watched, { id: "someone", name: "Someone", email: "someone@example.com" });
    await addBookmark(ctx, me.email, watched._id, 200);
    await insertPoll(ctx, makePoll({ title: "Popular" }));
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await open(me.options);
    const before = page.cardTitles("home");
    expect(before).toContain("Watched");
    const card = homeCard(page, "Watched");
    (card.querySelector(".card-front .bookmark-btn") as HTMLButtonElement).click();
    await page.settle(50);
    expect(reasonOf(card)).not.toContain("You are watching");
    expect(lastHomeBody(page).keepOrder).toBe(true);
    expect(page.cardTitles("home")).toEqual(before);
  });

  it("starts a fresh page load without keepOrder", async () => {
    const { me } = await homeWithPolls();
    page!.close();
    page = await open(me.options);
    expect(homeRequests(page)).toHaveLength(1);
    expect(lastHomeBody(page).keepOrder).toBeUndefined();
  });

  it("marks Home due after a vote or a watch on another tab's card", async () => {
    const { pid } = await homeWithPolls();
    await page!.click('.tab[data-tab="trending"]');
    const home = tabsOf(page!).controller("home");
    let due = 0;
    home.markDue = () => {
      due += 1;
    };
    tabsOf(page!).applyVote("trending", pid, { voteCount: 1, choiceCounts: { c1: 1 }, countsVersion: 9, myChoiceIds: ["c1"] });
    expect(due).toBe(1);
    const trendingCard = Array.from(page!.document.querySelectorAll('.tab-panel[data-panel="trending"] .card-viewport')).find(
      (el) => el.querySelector(".card-front .question")!.textContent === "Another"
    )!;
    (trendingCard.querySelector(".card-front .bookmark-btn") as HTMLButtonElement).click();
    await page!.settle(50);
    expect(due).toBe(2);
  });
});
