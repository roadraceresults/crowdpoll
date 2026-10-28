import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import { newestSweep, trendingSweep } from "../src/polls/sweeps.js";
import type { Poll } from "../src/polls/store.js";
import { countVote } from "../src/polls/counters.js";
import { addBookmark } from "../src/polls/bookmarks.js";

let ctx: TestContext;
let page: BrowserPage | null = null;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1200", ENV_MIN_VOTE_INTERVAL: "2000", ENV_MAX_TRENDING_POLLS: "3" });
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

type ScrollWindow = BrowserPage["window"] & { scrollCalls: number[] };

const requestsTo = (p: BrowserPage, prefix: string) => p.requests.filter((r) => r.url.startsWith(prefix));

const sweeps = async () => {
  await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
  await newestSweep(ctx, ctx.config, ctx.newestPublisher);
};

async function seedPoll(title: string, choiceCount: number, overrides: Partial<Poll> = {}): Promise<Poll> {
  const choices = Array.from({ length: choiceCount }, (_, i) => ({ id: `c${i + 1}`, label: `${title} choice ${i + 1}`, position: i }));
  const poll = makePoll({ title, subtitle: `${title} subtitle`, choices, ...overrides });
  await polls(ctx).insertOne(poll);
  return poll;
}

const DEFAULT_SCRIPTS = ["app.js", "pollCard.js", "voteClient.js", "deltaClient.js", "tabs.js", "trending.js", "newest.js", "searchTab.js", "liveResults.js"];
const WITH_FIXED_CHROME = ["app.js", "fixedChrome.js", ...DEFAULT_SCRIPTS.slice(1)];

/** Opens the home page with window.scrollTo and scrollY stubbed; jsdom implements neither. */
async function open(cookie?: string, scripts: string[] = DEFAULT_SCRIPTS): Promise<BrowserPage> {
  const opened = await openPage(ctx, "index.html", {
    cookie,
    scripts,
    beforeScripts: (window) => {
      const scrollable = window as unknown as ScrollWindow;
      scrollable.scrollCalls = [];
      Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
      window.scrollTo = ((x: number, y: number) => {
        scrollable.scrollCalls.push(y);
        (window as unknown as { scrollY: number }).scrollY = y;
      }) as typeof window.scrollTo;
    }
  });
  await opened.settle(50);
  return opened;
}

const scrollCalls = (p: BrowserPage) => (p.window as unknown as ScrollWindow).scrollCalls;
const panel = (p: BrowserPage, tab: string) => p.document.querySelector(`.tab-panel[data-panel="${tab}"]`)!;
const cardGrid = (p: BrowserPage, tab: string) => panel(p, tab).querySelector(".card-grid") as HTMLElement;
const maximizedGrid = (p: BrowserPage, tab: string) => panel(p, tab).querySelector(".maximized-card-grid") as HTMLElement | null;

function cardByTitle(p: BrowserPage, title: string, tab?: string): HTMLElement {
  const scope = tab ? panel(p, tab) : p.document;
  const card = Array.from(scope.querySelectorAll(".card-viewport")).find(
    (viewport) => viewport.querySelector(".card-front .question")!.textContent === title
  );
  if (!card) throw new Error(`No card titled ${title}`);
  return card as HTMLElement;
}

async function clickIn(p: BrowserPage, element: Element | null) {
  if (!element) throw new Error("Nothing to click");
  (element as HTMLElement).click();
  await p.settle();
}

describe("the maximized-card test scaffold", () => {
  it("finds a seeded card on Trending", async () => {
    await seedPoll("Scaffold", 3);
    await sweeps();
    page = await open();
    expect(cardByTitle(page, "Scaffold").closest(".card-grid")).toBe(cardGrid(page, "trending"));
    expect(maximizedGrid(page, "trending")).toBeNull();
    expect(scrollCalls(page)).toEqual([]);
  });
});

describe("maximizing and restoring", () => {
  const seedThree = async () => {
    await seedPoll("Alpha", 3, { createdAt: new Date(Date.now() - 30_000) });
    await seedPoll("Bravo", 4, { createdAt: new Date(Date.now() - 20_000) });
    await seedPoll("Charlie", 5, { createdAt: new Date(Date.now() - 10_000) });
    await sweeps();
  };
  const gridOrder = (p: BrowserPage) =>
    Array.from(cardGrid(p, "trending").querySelectorAll(":scope > .card-viewport .card-front .question")).map((q) => q.textContent);

  for (const [how, selector] of [
    ["its title", ".card-front .question"],
    ["its subtitle", ".card-front .subtitle"],
    ["its Maximize icon", ".maximize-btn"]
  ] as const) {
    it(`opens a card in place by ${how}, with the tab bar still there`, async () => {
      await seedThree();
      page = await open();
      const before = gridOrder(page);
      const card = cardByTitle(page, "Bravo");
      await clickIn(page, card.querySelector(selector));

      const view = maximizedGrid(page, "trending")!;
      expect(cardGrid(page, "trending").hidden).toBe(true);
      expect(view.hidden).toBe(false);
      expect(page.document.querySelectorAll(".maximized-card-grid:not([hidden])").length).toBe(1);
      expect(view.querySelector(":scope > .card-viewport")).toBe(card);
      expect(card.classList.contains("maximized-card-viewport")).toBe(true);
      expect(card.querySelector(".card-flip")!.classList.contains("maximized-card-flip")).toBe(true);
      expect(view.querySelector(".maximized-card-close, .maximized-card-close-row")).toBeNull();
      expect(view.firstElementChild).toBe(card);
      const side = view.querySelector(".maximized-space-right")!;
      expect(side.childElementCount).toBe(0);
      expect(side.textContent!.trim()).toBe("");
      expect(page.document.getElementById("tabBar")).not.toBeNull();

      await clickIn(page, card.querySelector(".maximize-btn"));
      expect(cardGrid(page, "trending").hidden).toBe(false);
      expect(view.hidden).toBe(true);
      expect(card.classList.contains("maximized-card-viewport")).toBe(false);
      expect(gridOrder(page)).toEqual(before);
    });
  }

  it("puts the Maximize icon last in the title row, right after the Watch eye", async () => {
    await seedThree();
    page = await open();
    const row = cardByTitle(page, "Alpha").querySelector(".question-row")!;
    const buttons = Array.from(row.children).map((el) => el.className);
    expect(buttons).toEqual(["question", "bookmark-btn", "maximize-btn", "maximize-hint"]);
    const icon = row.querySelector(".maximize-btn")!;
    expect(icon.tagName).toBe("BUTTON");
    expect(icon.getAttribute("aria-label")).toBe("Maximize Poll Card");
    expect(icon.getAttribute("title")).toBe("Maximize Poll");
    expect(icon.querySelector("svg")!.getAttribute("stroke")).toBe("currentColor");
  });

  it("shows both the Maximize icon and the Watch control on a Shared With You card", async () => {
    const me = "maximize-private@example.com";
    const { cookie } = await forgeSession(ctx, me);
    await seedPoll("Mine", 2, {
      pollVisibility: "Private Poll",
      pollSharingMode: "Invitation Only",
      invitedVoterList: [me]
    });
    page = await open(cookie);
    await page.settle(1250);
    await page.click('.tab[data-tab="shared-with-you"]');
    const card = cardByTitle(page, "Mine");
    expect((card.querySelector(".bookmark-btn") as HTMLElement).hidden).toBe(false);
    expect((card.querySelector(".maximize-btn") as HTMLElement).hidden).toBe(false);
  });

  it("closes when the active tab is clicked, without asking the server for anything", async () => {
    await seedThree();
    page = await open();
    const before = gridOrder(page);
    await clickIn(page, cardByTitle(page, "Charlie").querySelector(".maximize-btn"));
    const sent = requestsTo(page, "/api/").length;
    await page.click('.tab[data-tab="trending"]');
    expect(maximizedGrid(page, "trending")!.hidden).toBe(true);
    expect(cardGrid(page, "trending").hidden).toBe(false);
    expect(gridOrder(page)).toEqual(before);
    expect(requestsTo(page, "/api/").length).toBe(sent);
  });

  it("returns the page to its scroll position when closed", async () => {
    await seedThree();
    page = await open();
    (page.window as unknown as { scrollY: number }).scrollY = 640;
    await clickIn(page, cardByTitle(page, "Alpha").querySelector(".maximize-btn"));
    await clickIn(page, maximizedGrid(page, "trending")!.querySelector(".maximize-btn"));
    expect(scrollCalls(page).at(-1)).toBe(640);
  });

  it("scrolls so the maximized grid lands just below the fixed chrome, not at the very top", async () => {
    await seedThree();
    page = await open(undefined, WITH_FIXED_CHROME);
    Object.defineProperty(page.document.getElementById("site-header") as HTMLElement, "offsetHeight", {
      configurable: true,
      get: () => 56
    });
    page.window.dispatchEvent(new page.window.Event("resize"));
    await page.settle(30);
    panel(page, "trending").getBoundingClientRect = () => ({ top: 20 }) as DOMRect;
    (page.window as unknown as { scrollY: number }).scrollY = 100;
    await clickIn(page, cardByTitle(page, "Alpha").querySelector(".maximize-btn"));
    expect(scrollCalls(page).at(-1)).toBe(64);
  });

  it("lets a guest maximize a card, while Vote inside it still asks them to sign in", async () => {
    await seedThree();
    page = await open();
    expect(page.document.body.classList.contains("is-guest")).toBe(true);
    const card = cardByTitle(page, "Alpha");
    await clickIn(page, card.querySelector(".card-front .question"));
    expect(maximizedGrid(page, "trending")!.hidden).toBe(false);
    await clickIn(page, card.querySelector(".vote-btn"));
    expect(card.querySelector(".card-flip")!.classList.contains("is-flipped")).toBe(false);
  });
});

describe("every choice at once", () => {
  const heights = (rows: NodeListOf<Element>) => Array.from(rows).map((row) => parseFloat((row as HTMLElement).style.height));

  for (const [choices, expected] of [
    [2, 50],
    [7, 50 - (5 / 48) * 25],
    [50, 25]
  ] as const) {
    it(`shows all ${choices} choices on both faces at ${expected.toFixed(2)} px with a 2 px gap and no scrolling`, async () => {
      await seedPoll("Many", choices);
      await sweeps();
      page = await open();
      const card = cardByTitle(page, "Many");
      await clickIn(page, card.querySelector(".maximize-btn"));

      const results = card.querySelectorAll(".results-list > .result-row");
      const votes = card.querySelectorAll(".voting-list > .vote-row");
      expect(results.length).toBe(choices);
      expect(votes.length).toBe(choices);
      for (const height of [...heights(results), ...heights(votes)]) expect(height).toBeCloseTo(expected, 2);
      expect((card.querySelector(".results-list") as HTMLElement).style.rowGap).toBe("2px");
      expect((card.querySelector(".voting-list") as HTMLElement).style.rowGap).toBe("2px");
      expect(card.querySelectorAll(".arrow-row.is-active").length).toBe(0);
    });
  }

  it("writes a 50 px bar's label, percentage and voting label at 13 px", async () => {
    await seedPoll("Big text", 2);
    await sweeps();
    page = await open();
    const card = cardByTitle(page, "Big text");
    await clickIn(page, card.querySelector(".maximize-btn"));

    const sizes = Array.from(card.querySelectorAll(".result-row > .result-label, .result-row > .result-pct, .vote-row > .vote-label"))
      .map((el) => (el as HTMLElement).style.fontSize);
    expect(sizes).toHaveLength(6);
    for (const size of sizes) expect(size).toBe("13px");
  });

  it("goes back to the grid's own sizing when closed", async () => {
    await seedPoll("Sized", 7);
    await sweeps();
    page = await open();
    const card = cardByTitle(page, "Sized");
    const list = card.querySelector(".results-list") as HTMLElement;
    const gridSignature = list.dataset.renderSignature;
    await clickIn(page, card.querySelector(".maximize-btn"));
    const maximizedSignature = list.dataset.renderSignature;
    expect(maximizedSignature).not.toBe(gridSignature);
    await clickIn(page, maximizedGrid(page, "trending")!.querySelector(".maximize-btn"));
    expect(list.dataset.renderSignature).toBe(gridSignature);
  });

  it("colours every bar and its text exactly as the grid card does", async () => {
    await seedPoll("Colours", 7, {
      choices: ["Yes", "No", "Maybe", "Later", "Never", "Often", "Rarely"].map((label, i) => ({ id: `c${i + 1}`, label, position: i }))
    });
    await sweeps();
    page = await open();
    const card = cardByTitle(page, "Colours");
    const look = () =>
      Array.from(card.querySelectorAll(".results-list > .result-row")).map((row) => {
        const label = row.querySelector(".result-label") as HTMLElement;
        const pct = row.querySelector(".result-pct") as HTMLElement;
        return [
          (row.querySelector(".result-fill") as HTMLElement).style.background,
          (row as HTMLElement).style.getPropertyValue("--bar-track"),
          (row as HTMLElement).style.getPropertyValue("--bar-ink"),
          (row as HTMLElement).style.getPropertyValue("--bar-track-dark"),
          (row as HTMLElement).style.getPropertyValue("--bar-ink-dark"),
          label.style.textShadow,
          pct.style.textShadow
        ].join("|");
      });
    const inGrid = look();
    await clickIn(page, card.querySelector(".maximize-btn"));
    expect(look()).toEqual(inGrid);
  });
});

describe("the maximized card stays in step", () => {
  const member = async (email: string) => (await forgeSession(ctx, email)).cookie;
  const totals = (card: Element) => card.querySelector(".card-front .poll-totals")!.textContent ?? "";
  const isOpen = (p: BrowserPage, tab: string) => Boolean(maximizedGrid(p, tab) && !maximizedGrid(p, tab)!.hidden);

  it("is the same card element before, while and after it is maximized", async () => {
    await seedPoll("Same", 3);
    await sweeps();
    page = await open();
    const card = cardByTitle(page, "Same");
    await clickIn(page, card.querySelector(".maximize-btn"));
    expect(maximizedGrid(page, "trending")!.contains(card)).toBe(true);
    await clickIn(page, maximizedGrid(page, "trending")!.querySelector(".maximize-btn"));
    expect(cardGrid(page, "trending").contains(card)).toBe(true);
    expect(page.document.querySelectorAll(".card-viewport").length).toBe(1);
  });

  it("carries the voting face and an unsubmitted selection in and out", async () => {
    await seedPoll("Pick two", 4, { choiceMode: "Multiple-Choice Poll" });
    await sweeps();
    page = await open(await member("pick-two@example.com"));
    const card = cardByTitle(page, "Pick two");
    await clickIn(page, card.querySelector(".vote-btn"));
    const rows = () => Array.from(card.querySelectorAll(".voting-list > .vote-row")) as HTMLElement[];
    await clickIn(page, rows()[0]!);
    await clickIn(page, rows()[2]!);
    await clickIn(page, card.querySelector(".card-back .question"));
    expect(isOpen(page, "trending")).toBe(true);
    expect(card.querySelector(".card-flip")!.classList.contains("is-flipped")).toBe(true);
    expect(card.querySelectorAll(".vote-row.is-selected").length).toBe(2);
    await clickIn(page, maximizedGrid(page, "trending")!.querySelector(".maximize-btn"));
    expect(card.querySelector(".card-flip")!.classList.contains("is-flipped")).toBe(true);
    expect(card.querySelectorAll(".vote-row.is-selected").length).toBe(2);
  });

  it("records a vote made in the maximized card, and the grid shows it after closing", async () => {
    await seedPoll("Vote here", 2);
    await sweeps();
    page = await open(await member("vote-here@example.com"));
    const card = cardByTitle(page, "Vote here");
    await clickIn(page, card.querySelector(".maximize-btn"));
    expect(totals(card)).toContain("0 votes");
    await clickIn(page, card.querySelector(".vote-btn"));
    await clickIn(page, card.querySelector(".voting-list > .vote-row"));
    await clickIn(page, card.querySelector(".submit-vote-btn"));
    await page.settle(50);
    expect(totals(card)).toContain("1 vote");
    await clickIn(page, maximizedGrid(page, "trending")!.querySelector(".maximize-btn"));
    expect(totals(cardByTitle(page, "Vote here"))).toContain("1 vote");
  });

  it("closes at once when the poll is un-watched on Watching", async () => {
    const email = "unfavourite@example.com";
    const poll = await seedPoll("Loved", 2);
    await addBookmark(ctx.db, email, poll._id, 200);
    page = await open(await member(email));
    await page.settle(1250);
    await page.click('.tab[data-tab="watching"]');
    const card = cardByTitle(page, "Loved");
    await clickIn(page, card.querySelector(".maximize-btn"));
    await page.settle(1250);
    await clickIn(page, card.querySelector(".bookmark-btn"));
    await page.settle(50);
    expect(isOpen(page, "watching")).toBe(false);
    expect(page.cardTitles("watching")).toEqual([]);
    expect(page.document.activeElement).toBe(panel(page, "watching").querySelector(".tab-empty"));
  });

  it("closes at once when the poll is removed from Live Results with its own link", async () => {
    await seedPoll("Watched", 2);
    await sweeps();
    page = await open(await member("watched@example.com"));
    await page.settle(1250);
    await page.click('.tab-panel[data-panel="trending"] .live-link');
    expect(page.cardTitles("live")).toEqual(["Watched"]);
    const card = cardByTitle(page, "Watched", "live");
    await clickIn(page, card.querySelector(".maximize-btn"));
    await page.settle(1250);
    await clickIn(page, card.querySelector(".live-link"));
    await page.settle(50);
    expect(isOpen(page, "live")).toBe(false);
    expect(page.cardTitles("live")).toEqual([]);
    expect(page.document.activeElement).toBe(panel(page, "live").querySelector(".tab-empty"));
  });

  it("stays open when a Trending recompute drops the poll, keeps voting, and removes it on close", async () => {
    await seedPoll("Oldest", 2, { createdAt: new Date(Date.now() - 40_000) });
    await seedPoll("Third", 2, { createdAt: new Date(Date.now() - 30_000) });
    await seedPoll("Second", 2, { createdAt: new Date(Date.now() - 20_000) });
    await seedPoll("First", 2, { createdAt: new Date(Date.now() - 10_000) });
    await sweeps();
    page = await open(await member("retained@example.com"));
    expect(page.cardTitles("trending")).toEqual(["First", "Second", "Third"]);
    const card = cardByTitle(page, "Third");
    await clickIn(page, card.querySelector(".maximize-btn"));

    const rows = await ctx.db.selectFrom("polls").select(["id", "title"]).execute();
    const oldestId = rows.find((r) => r.title === "Oldest")!.id;
    for (let i = 0; i < 3; i++) await countVote(ctx.cache, oldestId, ["c1"], [], true);
    await sweeps();
    await page.settle(1250);
    await page.click("#refreshBtn");
    await page.settle(50);

    expect(isOpen(page, "trending")).toBe(true);
    expect(maximizedGrid(page, "trending")!.contains(card)).toBe(true);
    await clickIn(page, card.querySelector(".vote-btn"));
    await clickIn(page, card.querySelector(".voting-list > .vote-row"));
    await clickIn(page, card.querySelector(".submit-vote-btn"));
    await page.settle(50);
    expect(totals(card)).toContain("1 vote");

    await clickIn(page, maximizedGrid(page, "trending")!.querySelector(".maximize-btn"));
    await page.settle(10);
    expect(page.cardTitles("trending")).not.toContain("Third");
    expect(page.document.activeElement).toBe(cardGrid(page, "trending").querySelector(".maximize-btn"));
  });

  it("closes when another tab is clicked or a search is submitted", async () => {
    await seedPoll("Leave", 2);
    await sweeps();
    page = await open();
    await clickIn(page, cardByTitle(page, "Leave").querySelector(".maximize-btn"));
    await page.click('.tab[data-tab="newest"]');
    expect(isOpen(page, "trending")).toBe(false);
    await page.settle(1250);
    await page.click('.tab[data-tab="trending"]');
    expect(cardGrid(page, "trending").hidden).toBe(false);

    await clickIn(page, cardByTitle(page, "Leave").querySelector(".maximize-btn"));
    await page.settle(2100);
    await (page.window as unknown as { SearchTab: { submit(q: string): Promise<void> } }).SearchTab.submit("Leave");
    await page.settle(50);
    expect(isOpen(page, "trending")).toBe(false);
    expect(cardGrid(page, "trending").hidden).toBe(false);
  });

  it("stays open through Refresh, and shows the refreshed counts", async () => {
    const poll = await seedPoll("Counted", 2);
    await sweeps();
    page = await open();
    const card = cardByTitle(page, "Counted");
    await clickIn(page, card.querySelector(".maximize-btn"));
    expect(totals(card)).toContain("0 votes");
    await countVote(ctx.cache, poll._id, ["c2"], [], true);
    await sweeps();
    await page.settle(1250);
    await page.click("#refreshBtn");
    await page.settle(50);
    expect(isOpen(page, "trending")).toBe(true);
    expect(totals(card)).toContain("1 vote");
    const pcts = Array.from(card.querySelectorAll(".result-pct")).map((el) => el.textContent);
    expect(pcts).toContain("100%");
  });

  it("gives the voting face its own Maximize button, which becomes Minimize inside the view", async () => {
    await seedPoll("Both faces", 2);
    await sweeps();
    page = await open(await member("both-faces@example.com"));
    const card = cardByTitle(page, "Both faces");
    const back = card.querySelector(".card-back .question-row .maximize-btn") as HTMLElement;
    expect(back).not.toBeNull();
    expect(back.getAttribute("aria-label")).toBe("Maximize Poll Card");
    expect(card.querySelector(".card-back .bookmark-btn")).toBeNull();

    await clickIn(page, card.querySelector(".vote-btn"));
    await clickIn(page, back);
    expect(isOpen(page, "trending")).toBe(true);
    expect(card.querySelector(".card-flip")!.classList.contains("is-flipped")).toBe(true);
    expect(page.document.activeElement).toBe(back);
    for (const button of card.querySelectorAll(".maximize-btn")) {
      expect(button.getAttribute("aria-label")).toBe("Minimize Poll Card");
      expect(button.querySelector(".minimize-icon")!.hasAttribute("hidden")).toBe(false);
    }

    await clickIn(page, back);
    expect(isOpen(page, "trending")).toBe(false);
    expect(page.document.activeElement).toBe(back);
    expect(back.getAttribute("aria-label")).toBe("Maximize Poll Card");
  });

  it("turns the Maximize icon into a Minimize icon inside the view, and leaves the title inert", async () => {
    await seedPoll("Inside", 2);
    await sweeps();
    page = await open();
    const card = cardByTitle(page, "Inside");
    const button = card.querySelector(".maximize-btn") as HTMLElement;
    expect(button.querySelector(".maximize-icon")!.hasAttribute("hidden")).toBe(false);
    expect(button.querySelector(".minimize-icon")!.hasAttribute("hidden")).toBe(true);
    await clickIn(page, button);
    expect(button.hidden).toBe(false);
    expect(button.getAttribute("aria-label")).toBe("Minimize Poll Card");
    expect(button.getAttribute("title")).toBe("Minimize Poll Card");
    expect(button.querySelector(".maximize-icon")!.hasAttribute("hidden")).toBe(true);
    expect(button.querySelector(".minimize-icon")!.hasAttribute("hidden")).toBe(false);

    await clickIn(page, card.querySelector(".card-front .question"));
    expect(isOpen(page, "trending")).toBe(true);
    expect(maximizedGrid(page, "trending")!.contains(card)).toBe(true);

    await clickIn(page, button);
    expect(isOpen(page, "trending")).toBe(false);
    expect(cardGrid(page, "trending").contains(card)).toBe(true);
    expect(page.document.activeElement).toBe(button);
    expect(button.getAttribute("aria-label")).toBe("Maximize Poll Card");
    expect(button.getAttribute("title")).toBe("Maximize Poll");
    expect(button.querySelector(".maximize-icon")!.hasAttribute("hidden")).toBe(false);
    expect(button.querySelector(".minimize-icon")!.hasAttribute("hidden")).toBe(true);
  });

  it("draws two arrows in a rounded box: out to the top right and bottom left corners to maximize, in from them to minimize", async () => {
    await seedPoll("Arrows", 2);
    await sweeps();
    page = await open();
    const card = cardByTitle(page, "Arrows");
    const buttons = card.querySelectorAll(".maximize-btn");
    expect(buttons.length).toBe(2);
    for (const button of buttons) {
      for (const cls of ["maximize-icon", "minimize-icon"]) {
        const svg = button.querySelector(`.${cls}`)!;
        expect(svg.getAttribute("stroke")).toBe("currentColor");
        expect(svg.getAttribute("fill")).toBe("none");
        expect(svg.getAttribute("stroke-width")).toBe("2.25");
        expect(svg.querySelector("rect")!.getAttribute("rx")).toBe("4.125");
        expect(svg.querySelectorAll("path").length).toBe(1);
      }
      const shafts = (cls: string) =>
        button.querySelector(`.${cls} path`)!.getAttribute("d")!.match(/M[\d.]+ [\d.]+L[\d.]+ [\d.]+/g);
      expect(shafts("maximize-icon")).toEqual(["M14 10L19 5", "M10 14L5 19"]);
      expect(shafts("minimize-icon")).toEqual(["M19.5 4.5L14 10", "M4.5 19.5L10 14"]);
    }
  });

  it("labels the front Maximize button until the first maximize on this page, and again after a reload", async () => {
    await seedPoll("Hinted", 2);
    await sweeps();
    page = await open();
    const card = cardByTitle(page, "Hinted", "trending");
    const hint = card.querySelector(".card-front .question-row .maximize-hint")!;
    expect(hint.textContent).toBe("Maximize Poll");
    expect(hint.getAttribute("aria-hidden")).toBe("true");
    expect(hint.previousElementSibling!.classList.contains("maximize-btn")).toBe(true);
    expect(card.querySelector(".card-back .maximize-hint")).toBeNull();
    expect(page.document.documentElement.classList.contains("maximize-hint-dismissed")).toBe(false);

    await clickIn(page, card.querySelector(".card-front .question"));
    expect(page.document.documentElement.classList.contains("maximize-hint-dismissed")).toBe(true);
    expect(isOpen(page, "trending")).toBe(true);
    expect(page.document.querySelectorAll(".maximize-hint").length).toBe(0);
    expect(page.window.localStorage.getItem("maximizeHintDismissed")).toBeNull();

    await clickIn(page, card.querySelector(".maximize-btn"));
    await page.click('.tab[data-tab="newest"]');
    expect(cardByTitle(page, "Hinted", "newest").querySelector(".maximize-hint")).toBeNull();

    page.close();
    page = await open();
    expect(cardByTitle(page, "Hinted", "trending").querySelector(".card-front .maximize-hint")).not.toBeNull();
    expect(page.document.documentElement.classList.contains("maximize-hint-dismissed")).toBe(false);
  });

  it("keeps a Search card's own controls when maximized: no Vote", async () => {
    await seedPoll("Findable", 2);
    await sweeps();
    page = await open();
    await page.settle(2100);
    await (page.window as unknown as { SearchTab: { submit(q: string): Promise<void> } }).SearchTab.submit("Findable");
    await page.settle(50);
    const card = cardByTitle(page, "Findable", "search");
    await clickIn(page, card.querySelector(".maximize-btn"));
    expect(isOpen(page, "search")).toBe(true);
    expect((card.querySelector(".vote-btn") as HTMLElement).hidden).toBe(true);
  });
});

describe("keyboard and focus", () => {
  const escape = async (p: BrowserPage, target: EventTarget = p.document) => {
    target.dispatchEvent(new p.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await p.settle();
  };
  const isOpen = (p: BrowserPage) => !maximizedGrid(p, "trending")!.hidden;

  it("makes the Maximize icon a button and leaves the title and subtitle out of the tab order", async () => {
    await seedPoll("Keys", 2);
    await sweeps();
    page = await open();
    const card = cardByTitle(page, "Keys");
    expect(card.querySelector(".maximize-btn")!.tagName).toBe("BUTTON");
    for (const text of card.querySelectorAll(".question, .subtitle")) expect(text.hasAttribute("tabindex")).toBe(false);
  });

  it("focuses the card's Minimize icon on opening, and leaves focus on it after Minimize, Escape or the active tab closes the view", async () => {
    await seedPoll("Focus", 2);
    await sweeps();
    page = await open();
    const card = cardByTitle(page, "Focus");
    const icon = card.querySelector(".maximize-btn") as HTMLElement;
    await clickIn(page, icon);
    expect(page.document.activeElement).toBe(icon);
    expect(icon.getAttribute("aria-label")).toBe("Minimize Poll Card");
    await clickIn(page, icon);
    expect(page.document.activeElement).toBe(icon);

    await clickIn(page, icon);
    await escape(page);
    expect(isOpen(page)).toBe(false);
    expect(page.document.activeElement).toBe(icon);

    await clickIn(page, icon);
    await page.click('.tab[data-tab="trending"]');
    expect(isOpen(page)).toBe(false);
    expect(page.document.activeElement).toBe(icon);
  });

  it("focuses by the face the card is on as it closes, whichever face it opened on", async () => {
    await seedPoll("Faces", 2);
    await sweeps();
    page = await open(await forgeSession(ctx, "faces@example.com").then((s) => s.cookie));
    const card = cardByTitle(page, "Faces");
    const escape = async () => {
      page!.document.dispatchEvent(new page!.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await page!.settle();
    };

    await clickIn(page, card.querySelector(".vote-btn"));
    await clickIn(page, card.querySelector(".card-back .question"));
    await escape();
    expect(page.document.activeElement).toBe(card.querySelector(".card-back .maximize-btn"));

    await clickIn(page, card.querySelector(".card-back .question"));
    await clickIn(page, card.querySelector(".back-btn"));
    await clickIn(page, card.querySelector(".maximize-btn"));
    expect(page.document.activeElement).toBe(card.querySelector(".maximize-btn"));
  });

  it("moves neither focus nor the scroll position when the visitor leaves the tab", async () => {
    await seedPoll("Away", 2);
    await sweeps();
    page = await open();
    await clickIn(page, cardByTitle(page, "Away").querySelector(".maximize-btn"));
    const calls = scrollCalls(page).length;
    const newest = page.document.querySelector('.tab[data-tab="newest"]') as HTMLElement;
    newest.focus();
    await clickIn(page, newest);
    expect(scrollCalls(page).length).toBe(calls);
    expect(page.document.activeElement).toBe(newest);
    expect(panel(page, "trending").contains(page.document.activeElement)).toBe(false);
  });

  it("ignores Escape while a dialog is open or while typing in a field", async () => {
    await seedPoll("Guarded", 2);
    await sweeps();
    page = await open();
    await clickIn(page, cardByTitle(page, "Guarded").querySelector(".maximize-btn"));

    (page.window as unknown as { Tabs: { modal(text: string): void } }).Tabs.modal("Hello");
    await page.settle();
    const dialog = page.document.querySelector('[aria-modal="true"]')!;
    dialog.querySelector(".modal-ok")!.dispatchEvent(new page.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await page.settle();
    expect(page.document.querySelector('[aria-modal="true"]')).toBeNull();
    expect(isOpen(page)).toBe(true);

    const box = page.document.getElementById("siteSearchBox")!;
    box.focus();
    await escape(page, box);
    expect(isOpen(page)).toBe(true);
  });

  it("changes neither the address nor the browser history", async () => {
    await seedPoll("Address", 2);
    await sweeps();
    page = await open();
    const href = page.window.location.href;
    const length = page.window.history.length;
    await clickIn(page, cardByTitle(page, "Address").querySelector(".maximize-btn"));
    expect(page.window.location.href).toBe(href);
    await clickIn(page, maximizedGrid(page, "trending")!.querySelector(".maximize-btn"));
    expect(page.window.location.href).toBe(href);
    expect(page.window.history.length).toBe(length);
  });
});
