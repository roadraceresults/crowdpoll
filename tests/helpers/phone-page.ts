import { randomUUID } from "node:crypto";
import type { TestContext } from "./setup.js";
import { makePoll, polls } from "./poll-fixtures.js";
import { openPage, type BrowserPage, ON_TRENDING } from "./browser.js";
import type { Poll } from "../../src/polls/store.js";

export const PHONE_LAYOUT_QUERY = "(max-width: 640px)";

type ScrollWindow = BrowserPage["window"] & { scrollCalls: number[] };

export interface HomeOptions {
  cookie?: string;
  /** Whether `matchMedia("(max-width: 640px)")` matches. */
  phoneLayout: boolean;
  url?: string;
  scripts?: string[];
  beforeScripts?: (window: BrowserPage["window"]) => void;
}

const HOME_SCRIPTS = ["app.js", "sharePoll.js", "pollCard.js", "voteClient.js", "deltaClient.js", "whoVoted.js", "tabs.js", "trending.js", "newest.js", "searchTab.js", "liveResults.js"];

/** The home page against the app under test, with the phone query, `scrollTo` and `scrollY` stubbed. */
export async function openHome(ctx: TestContext, options: HomeOptions): Promise<BrowserPage> {
  const page = await openPage(ctx, "index.html", {
    cookie: options.cookie,
    url: options.url ?? ON_TRENDING,
    scripts: options.scripts ?? HOME_SCRIPTS,
    beforeScripts: (window) => {
      window.matchMedia = ((query: string) => ({
        matches: query === PHONE_LAYOUT_QUERY && options.phoneLayout,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {}
      })) as unknown as typeof window.matchMedia;
      const scrollable = window as unknown as ScrollWindow;
      scrollable.scrollCalls = [];
      Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
      window.scrollTo = ((_x: number, y: number) => {
        scrollable.scrollCalls.push(y);
        (window as unknown as { scrollY: number }).scrollY = y;
      }) as typeof window.scrollTo;
      options.beforeScripts?.(window);
    }
  });
  await page.settle(50);
  return page;
}

export const scrollCalls = (page: BrowserPage) => (page.window as unknown as ScrollWindow).scrollCalls;

export function setScrollY(page: BrowserPage, y: number) {
  (page.window as unknown as { scrollY: number }).scrollY = y;
}

/** A public poll of `choiceCount` choices, with an id a poll link accepts. */
export async function seedPoll(ctx: TestContext, title: string, choiceCount: number, overrides: Partial<Poll> = {}): Promise<Poll> {
  const choices = Array.from({ length: choiceCount }, (_, i) => ({ id: `c${i + 1}`, label: `${title} choice ${i + 1}`, position: i }));
  const poll = makePoll({ _id: randomUUID(), title, subtitle: `${title} subtitle`, choices, ...overrides });
  await polls(ctx).insertOne(poll);
  return poll;
}

export const panel = (page: BrowserPage, tab: string) => page.document.querySelector(`.tab-panel[data-panel="${tab}"]`)!;
export const cardGrid = (page: BrowserPage, tab: string) => panel(page, tab).querySelector(".card-grid") as HTMLElement;
export const maximizedGrid = (page: BrowserPage, tab: string) => panel(page, tab).querySelector(".maximized-card-grid") as HTMLElement | null;
export const isOpen = (page: BrowserPage) => page.document.querySelector(".maximized-card-grid:not([hidden])") !== null;

export function cardByTitle(page: BrowserPage, title: string): HTMLElement {
  const card = Array.from(page.document.querySelectorAll(".card-viewport")).find(
    (viewport) => viewport.querySelector(".card-front .question")!.textContent === title
  );
  if (!card) throw new Error(`No card titled ${title}`);
  return card as HTMLElement;
}

export async function clickIn(page: BrowserPage, element: Element | null) {
  if (!element) throw new Error("Nothing to click");
  (element as HTMLElement).click();
  await page.settle();
}
