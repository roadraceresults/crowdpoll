import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import { newestSweep, trendingSweep } from "../src/polls/sweeps.js";
import { updatePoll, type Poll } from "../src/polls/store.js";
import { renderNotesHtml, renderNotesPreview } from "../src/polls/notes.js";

let ctx: TestContext;
let page: BrowserPage | null = null;

beforeAll(async () => {
  ctx = await startTestContext({
    ENV_MIN_MANUAL_REFRESH_INTERVAL: "1",
    ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL: "1000"
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
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
  for (const key of await ctx.cache.scan("pageload:*")) await ctx.cache.del(key);
});

type Observed = { callback: () => void; targets: Element[] };
type CardApi = { applyPoll(detail: Record<string, unknown>): void; setMaximized(on: boolean): void };
type CardWindow = BrowserPage["window"] & {
  observed: Observed[];
  PollCard: { mount(container: Element, pid: string, opts: Record<string, unknown>): CardApi };
};

describe("notes on the poll card", () => {
  async function openCardPage(): Promise<BrowserPage> {
    const opened = await openPage(ctx, "index.html", {
      scripts: ["pollCard.js"],
      beforeScripts: (window) => {
        const observed: Observed[] = [];
        (window as unknown as CardWindow).observed = observed;
        (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
          entry: Observed;
          constructor(callback: () => void) {
            this.entry = { callback, targets: [] };
            observed.push(this.entry);
          }
          observe(target: Element) { this.entry.targets.push(target); }
          unobserve() {}
          disconnect() {}
        };
      }
    });
    page = opened;
    return opened;
  }

  function detail(overrides: Record<string, unknown> = {}) {
    return {
      pid: "p1", title: "Picnic", subtitle: "Saturday", notesPreviewHtml: "", hasMoreNotes: false,
      choiceMode: "Single-Choice Poll", voteMutability: "Final-Vote Poll", pollState: "OPEN",
      choices: [{ id: "c1", label: "Yes", position: 0, count: 0, pct: 0 }, { id: "c2", label: "No", position: 1, count: 0, pct: 0 }],
      totalVoted: 0, myChoiceIds: [], bookmarked: false, canVote: true, contentVersion: 1, countsVersion: 1,
      ...overrides
    };
  }

  function mount(p: BrowserPage, onMaximize: (pid: string) => void = () => {}) {
    const host = p.document.createElement("div");
    p.document.body.appendChild(host);
    const card = (p.window as CardWindow).PollCard.mount(host, "p1", { onMaximize });
    return { card, viewport: host.lastElementChild as HTMLElement };
  }

  const notes = (viewport: HTMLElement) => viewport.querySelector<HTMLElement>(".poll-notes")!;
  const more = (viewport: HTMLElement) => viewport.querySelector<HTMLElement>(".poll-notes-more")!;

  it("puts the notes between the title row and the choices, on the front only", async () => {
    const p = await openCardPage();
    const { card, viewport } = mount(p);
    card.applyPoll(detail({ notesPreviewHtml: "<strong>Bring</strong> a plate" }));
    expect(viewport.querySelectorAll(".poll-notes")).toHaveLength(1);
    expect(viewport.querySelector(".card-back .poll-notes")).toBeNull();
    const box = notes(viewport);
    const row = viewport.querySelector(".card-front .question-row")!;
    const choices = viewport.querySelector(".card-front .results-scroll-wrap")!;
    expect(row.compareDocumentPosition(box) & p.window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(box.compareDocumentPosition(choices) & p.window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(box.hidden).toBe(false);
    expect(box.querySelector(".poll-notes-text")!.innerHTML).toBe("<strong>Bring</strong> a plate");
    expect(more(viewport).textContent).toBe("Show more");
    expect(more(viewport).querySelector("svg.poll-notes-more-chevron path")!.getAttribute("d")).toBe("m6 9 6 6 6-6");
  });

  it("hides the notes without any, and on a placeholder", async () => {
    const p = await openCardPage();
    const { card, viewport } = mount(p);
    card.applyPoll(detail());
    expect(notes(viewport).hidden).toBe(true);
    card.applyPoll(detail({ notesPreviewHtml: "Some notes" }));
    expect(notes(viewport).hidden).toBe(false);
    card.applyPoll({ pid: "p1", notPublished: true, createdByName: "Sam", notesPreviewHtml: "", hasMoreNotes: false });
    expect(notes(viewport).hidden).toBe(true);
  });

  it("shows Show more when there is more, or when the two lines overflow, and it maximizes the card", async () => {
    const p = await openCardPage();
    const asked: string[] = [];
    const { card, viewport } = mount(p, (pid) => asked.push(pid));
    card.applyPoll(detail({ notesPreviewHtml: "Short", hasMoreNotes: false }));
    expect(more(viewport).hidden).toBe(true);
    card.applyPoll(detail({ notesPreviewHtml: "Long…", hasMoreNotes: true }));
    expect(more(viewport).hidden).toBe(false);
    more(viewport).click();
    expect(asked).toEqual(["p1"]);
  });

  it("shows Show more once a card drawn while hidden is shown and its notes overflow", async () => {
    const p = await openCardPage();
    const { card, viewport } = mount(p);
    card.applyPoll(detail({ notesPreviewHtml: "A line that wraps in a narrow card", hasMoreNotes: false }));
    expect(more(viewport).hidden).toBe(true);
    const text = viewport.querySelector<HTMLElement>(".poll-notes-text")!;
    Object.defineProperty(text, "scrollHeight", { configurable: true, value: 72 });
    Object.defineProperty(text, "clientHeight", { configurable: true, value: 40 });
    const observer = (p.window as CardWindow).observed.find((o) => o.targets.includes(text))!;
    observer.callback();
    expect(more(viewport).hidden).toBe(false);
  });

  it("maps the preview fields in toPollDetail, empty for a placeholder", async () => {
    const p = await openPage(ctx, "index.html", { scripts: ["deltaClient.js"] });
    page = p;
    const client = (p.window as unknown as { DeltaClient: {
      createTabState(): { cards: Map<string, unknown>; counts: Map<string, unknown> };
      toPollDetail(state: unknown, pid: string): Record<string, unknown>;
    } }).DeltaClient;
    const state = client.createTabState();
    state.cards.set("p1", { ...detail({ notesPreviewHtml: "<em>x</em>", hasMoreNotes: true }), choices: [] });
    state.cards.set("p2", { pid: "p2", notPublished: true, createdByName: "", contentVersion: 0 });
    expect(client.toPollDetail(state, "p1")).toMatchObject({ notesPreviewHtml: "<em>x</em>", hasMoreNotes: true });
    expect(client.toPollDetail(state, "p2")).toMatchObject({ notesPreviewHtml: "", hasMoreNotes: false });
  });
});

describe("notes in the Maximized view", () => {
  const SCRIPTS = ["app.js", "pollCard.js", "voteClient.js", "deltaClient.js", "lineGraph.js", "tabs.js", "trending.js", "newest.js", "searchTab.js", "liveResults.js"];
  const long = "**Bring** " + Array.from({ length: 80 }, (_, i) => `word${i}`).join(" ");

  async function seed(title: string, overrides: Partial<Poll> = {}) {
    const poll = makePoll({ _id: randomUUID(), title, subtitle: `${title} subtitle`, ...overrides });
    await polls(ctx).insertOne(poll);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    await newestSweep(ctx, ctx.config, ctx.newestPublisher);
    return poll;
  }

  async function open(fail = false): Promise<BrowserPage> {
    const opened = await openPage(ctx, "index.html", {
      scripts: SCRIPTS,
      beforeScripts: (window) => {
        Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
        window.scrollTo = (() => {}) as typeof window.scrollTo;
        if (!fail) return;
        const send = window.fetch;
        window.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
          String(input).endsWith("/card") ? Promise.reject(new TypeError("offline")) : send(input, init)) as typeof fetch;
      }
    });
    await opened.settle(50);
    page = opened;
    return opened;
  }

  function cardOf(p: BrowserPage, title: string): HTMLElement {
    return Array.from(p.document.querySelectorAll<HTMLElement>(".card-viewport"))
      .find((v) => v.querySelector(".card-front .question")!.textContent === title)!;
  }

  async function maximize(p: BrowserPage, title: string) {
    (cardOf(p, title).querySelector(".maximize-btn") as HTMLElement).click();
    await p.settle(50);
    return p.document.querySelector<HTMLElement>(".maximized-card-grid:not([hidden]) .maximized-space-right")!;
  }

  const cardFetches = (p: BrowserPage, pid: string) => p.requests.filter((r) => r.url === `/api/polls/${pid}/card`).length;

  it("fetches the card once and shows the whole notes above the graph, from Show more as from Maximize", async () => {
    const poll = await seed("Noted", { notes: long });
    const p = await open();
    (cardOf(p, "Noted").querySelector(".poll-notes-more") as HTMLElement).click();
    await p.settle(50);
    const side = p.document.querySelector<HTMLElement>(".maximized-card-grid:not([hidden]) .maximized-space-right")!;
    const area = side.querySelector<HTMLElement>(".maximized-notes")!;
    expect(cardFetches(p, poll._id)).toBe(1);
    expect(area.hidden).toBe(false);
    expect(area.innerHTML).toBe(renderNotesHtml(long));
    expect(area.nextElementSibling!.classList.contains("maximized-graph")).toBe(true);
    expect(cardOf(p, "Noted").querySelector(".poll-notes-text")!.innerHTML).toBe(renderNotesPreview(long).html);
  });

  it("makes no fetch for a poll without notes", async () => {
    const poll = await seed("Plain");
    const p = await open();
    const side = await maximize(p, "Plain");
    expect(cardFetches(p, poll._id)).toBe(0);
    expect(side.querySelector<HTMLElement>(".maximized-notes")!.hidden).toBe(true);
  });

  it("fetches again when a refresh brings a new content version", async () => {
    const poll = await seed("Changing", { notes: "First" });
    const p = await open();
    const side = await maximize(p, "Changing");
    expect(side.querySelector(".maximized-notes")!.innerHTML).toBe("First");
    await updatePoll({ db: ctx.db, cache: ctx.cache }, poll._id, { notes: "**Second**" });
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    await p.settle(1250);
    await p.click("#refreshBtn");
    await p.settle(50);
    expect(cardFetches(p, poll._id)).toBe(2);
    expect(side.querySelector(".maximized-notes")!.innerHTML).toBe("<strong>Second</strong>");
  });

  it("leaves the area hidden when the fetch fails", async () => {
    await seed("Offline", { notes: "Unreachable" });
    const p = await open(true);
    const side = await maximize(p, "Offline");
    expect(side.querySelector<HTMLElement>(".maximized-notes")!.hidden).toBe(true);
    expect(p.document.querySelector(".maximized-card-grid:not([hidden])")).not.toBeNull();
  });

  it("empties the area on close, and mounts the line graph into .maximized-graph", async () => {
    await seed("Graphed", { notes: "Some notes", lineGraphEnabled: true });
    const p = await open();
    const side = await maximize(p, "Graphed");
    expect(side.querySelector(".maximized-graph .line-graph")).not.toBeNull();
    expect(side.querySelector(".maximized-notes .line-graph")).toBeNull();
    (cardOf(p, "Graphed").querySelector(".maximize-btn") as HTMLElement).click();
    await p.settle(50);
    const area = side.querySelector<HTMLElement>(".maximized-notes")!;
    expect(area.hidden).toBe(true);
    expect(area.innerHTML).toBe("");
  });
});
