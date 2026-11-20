/**
 * POLL-ADMIN-IMPROVEMENTS U15: a poll set to display its choices in the order entered draws its results and ballot
 * by position; which choices are drawn, and the last row, stay those of the share ranking.
 */
import { afterEach, describe, expect, it } from "vitest";
import { openStubbedHome, type StubbedHome } from "./helpers/single-column-page.js";

interface Choice {
  id: string;
  label: string;
  position: number;
  pct: number;
  count: number;
}

interface Detail {
  title: string;
  subtitle: string;
  notesPreviewHtml: string;
  choiceMode: string;
  voteMutability: string;
  pollVisibility: string;
  pollState: string;
  totalVoted: number;
  myChoiceIds: string[];
  choices: Choice[];
  contentVersion: number;
  countsVersion: number;
  choicesInEnteredOrder?: boolean;
}

interface Card {
  applyPoll(detail: Detail): void;
  setMaximized(on: boolean, how?: { choices?: string }): void;
  showVoteFace(): void;
  element: HTMLElement;
}

interface Layout {
  name: string;
  phoneLayout: boolean;
  heights?: number;
}

/** A bar area 259 px tall holds ten bars at 25 px, 1 px apart. */
const TEN_BARS = 259;
const LAYOUTS: Layout[] = [
  { name: "phone", phoneLayout: true },
  { name: "wide", phoneLayout: false, heights: TEN_BARS }
];

let home: StubbedHome | null = null;

afterEach(() => {
  home?.close();
  home = null;
});

function detail(choices: Choice[], overrides: Partial<Detail> = {}): Detail {
  return {
    title: "Ordered",
    subtitle: "",
    notesPreviewHtml: "",
    choiceMode: "Single-Choice Poll",
    voteMutability: "Final-Vote Poll",
    pollVisibility: "Public Poll",
    pollState: "OPEN",
    totalVoted: 100,
    myChoiceIds: [],
    choices,
    contentVersion: 1,
    countsVersion: 1,
    ...overrides
  };
}

/** A, B, C at positions 0, 1, 2 with shares 10, 30, 60. */
const ABC = (): Choice[] => [
  { id: "a", label: "A", position: 0, pct: 10, count: 10 },
  { id: "b", label: "B", position: 1, pct: 30, count: 30 },
  { id: "c", label: "C", position: 2, pct: 60, count: 60 }
];

/** `count` choices whose shares rise with their position, so position order and share order are opposite. */
function rising(count: number): Choice[] {
  return Array.from({ length: count }, (_, i) => ({ id: `c${i + 1}`, label: `Choice ${i + 1}`, position: i, pct: i, count: i }));
}

async function mount(poll: Detail, layout: Layout, scripts: string[] = ["pollCard.js"]) {
  home = await openStubbedHome({ scripts, phone: false, phoneLayout: layout.phoneLayout });
  const grid = home.document.querySelector('.tab-panel[data-panel="trending"] .card-grid')!;
  const card = (home.window as unknown as { PollCard: { mount(el: Element, pid: string, opts: object): Card } }).PollCard.mount(grid, "pid-1", {
    isSignedIn: () => true,
    choiceBounds: { minChoices: 2, maxChoices: 50, choiceLabelMax: 35 },
    onMaximize: () => {}
  });
  const el = card.element;
  if (layout.heights) {
    for (const wrap of [".results-scroll-wrap", ".voting-scroll-wrap"]) {
      Object.defineProperty(el.querySelector(wrap)!, "clientHeight", { configurable: true, get: () => layout.heights });
    }
  }
  card.applyPoll(poll);
  const lastRow = () => el.querySelector<HTMLElement>(".results-list .more-row, .results-list .show-all-row");
  return {
    card,
    el,
    results: () => Array.from(el.querySelectorAll(".results-list > .result-row > .result-label")).map((label) => label.textContent),
    ballot: () => Array.from(el.querySelectorAll(".voting-list > .vote-row .vote-label")).map((label) => label.textContent),
    last: () => {
      const row = lastRow();
      return row ? [row.className.split(" ").find((name) => name.endsWith("-row")), row.textContent] : null;
    },
    lastRow,
    settle: () => home!.settle()
  };
}

const byPosition = (labels: (string | null)[], choices: Choice[]) =>
  [...labels].sort((x, y) => choices.find((c) => c.label === x)!.position - choices.find((c) => c.label === y)!.position);

describe("three choices", () => {
  for (const layout of LAYOUTS) {
    for (const [setting, expected] of [
      [undefined, ["C", "B", "A"]],
      [false, ["C", "B", "A"]],
      [true, ["A", "B", "C"]]
    ] as const) {
      it(`draws ${expected.join(", ")} in the ${layout.name} layout with the setting ${String(setting)}, on the card and maximized`, async () => {
        const view = await mount(detail(ABC(), setting === undefined ? {} : { choicesInEnteredOrder: setting }), layout);
        expect(view.results()).toEqual(expected);
        view.card.showVoteFace();
        await view.settle();
        if (setting === true) expect(view.ballot()).toEqual(["A", "B", "C"]);
        else expect(view.ballot()).toEqual(["C", "B", "A"]);

        const maximized = await mount(detail(ABC(), setting === undefined ? {} : { choicesInEnteredOrder: setting }), layout);
        maximized.card.setMaximized(true);
        await maximized.settle();
        expect(maximized.results()).toEqual(expected);
      });
    }
  }
});

describe("a pick on the ballot in the entered order", () => {
  for (const layout of LAYOUTS) {
    it(`selects the choice of the row clicked, not the one in its place by share, in the ${layout.name} layout`, async () => {
      const view = await mount(detail(ABC(), { choiceMode: "Multiple-Choice Poll", choicesInEnteredOrder: true }), layout);
      view.card.showVoteFace();
      await view.settle();
      const selected = () => Array.from(view.el.querySelectorAll(".voting-list > .vote-row.is-selected .vote-label")).map((l) => l.textContent);
      const rowOf = (label: string) =>
        Array.from(view.el.querySelectorAll<HTMLElement>(".voting-list > .vote-row")).find((r) => r.querySelector(".vote-label")!.textContent === label)!;
      rowOf("A").click();
      await view.settle();
      expect(selected()).toEqual(["A"]);
      rowOf("C").click();
      await view.settle();
      expect(selected()).toEqual(["A", "C"]);
      rowOf("A").click();
      await view.settle();
      expect(selected()).toEqual(["C"]);
    });
  }
});

describe("a poll too long to draw whole", () => {
  for (const layout of LAYOUTS) {
    it(`draws the same choices and last row with the setting on and off on the ${layout.name} card, by position when on`, async () => {
      const choices = rising(30);
      const off = await mount(detail(choices), layout);
      const offLabels = off.results();
      const offLast = off.last();
      expect(offLast).not.toBeNull();
      const on = await mount(detail(choices, { choicesInEnteredOrder: true }), layout);
      expect([...on.results()].sort()).toEqual([...offLabels].sort());
      expect(on.results()).toEqual(byPosition(offLabels, choices));
      expect(on.last()).toEqual(offLast);
    });

    it(`keeps the maximized view's choices, Show all and Show fewer by the ranking, drawn by position, in the ${layout.name} layout`, async () => {
      const choices = rising(30);
      const off = await mount(detail(choices), layout);
      off.card.setMaximized(true);
      await off.settle();
      const offLabels = off.results();
      const offLast = off.last();

      const on = await mount(detail(choices, { choicesInEnteredOrder: true }), layout);
      on.card.setMaximized(true);
      await on.settle();
      expect(on.results()).toEqual(byPosition(offLabels, choices));
      expect(on.last()).toEqual(offLast);
      expect(on.last()![1]).toMatch(/^Show all 30 choices/);

      on.lastRow()!.click();
      await on.settle();
      expect(on.results()).toEqual(choices.map((choice) => choice.label));
      expect(on.last()).toEqual(["show-all-row", "Show fewer choices"]);

      on.lastRow()!.click();
      await on.settle();
      expect(on.results()).toEqual(byPosition(offLabels, choices));
      expect(on.last()).toEqual(offLast);
    });
  }
});

describe("a choice added to the poll", () => {
  it("is drawn last when the setting is on", async () => {
    const choices = ABC();
    const view = await mount(detail(choices, { choicesInEnteredOrder: true }), LAYOUTS[0]!);
    view.card.applyPoll(detail([...choices, { id: "d", label: "D", position: 3, pct: 0, count: 0 }], { choicesInEnteredOrder: true, contentVersion: 2 }));
    await view.settle();
    expect(view.results()).toEqual(["A", "B", "C", "D"]);
  });
});

describe("the bar colors", () => {
  it("keep each choice's color when the setting moves the bars", async () => {
    const colors = async (on: boolean) => {
      const view = await mount(detail(ABC(), { choicesInEnteredOrder: on }), LAYOUTS[0]!);
      const rows = Array.from(view.el.querySelectorAll<HTMLElement>(".results-list > .result-row"));
      return Object.fromEntries(rows.map((row) => [row.querySelector(".result-label")!.textContent, row.getAttribute("style")]));
    };
    expect(await colors(true)).toEqual(await colors(false));
  });
});

describe("a delta that turns the setting on", () => {
  it("redraws the bars in position order", async () => {
    const view = await mount(detail(ABC()), LAYOUTS[0]!, ["deltaClient.js", "pollCard.js"]);
    expect(view.results()).toEqual(["C", "B", "A"]);
    const delta = (home!.window as unknown as {
      DeltaClient: { createTabState(): unknown; apply(state: unknown, body: object): void; toPollDetail(state: unknown, pid: string): Detail };
    }).DeltaClient;
    const state = delta.createTabState();
    delta.apply(state, {
      cards: {
        "pid-1": {
          pid: "pid-1", title: "Ordered", subtitle: "", choiceMode: "Single-Choice Poll", voteMutability: "Final-Vote Poll",
          pollVisibility: "Public Poll", pollState: "OPEN", contentVersion: 2, choicesInEnteredOrder: true,
          choices: ABC().map(({ id, label, position }) => ({ id, label, position }))
        }
      },
      counters: { "pid-1": { voteCount: 100, choiceCounts: { a: 10, b: 30, c: 60 }, countsVersion: 2 } },
      order: ["pid-1"]
    });
    view.card.applyPoll(delta.toPollDetail(state, "pid-1"));
    await view.settle();
    expect(view.results()).toEqual(["A", "B", "C"]);
  });
});
