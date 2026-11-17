/**
 * The poll card above the phone layout (contracts/ui.md W1 to W5), on a card mounted by hand:
 * `matchMedia("(max-width: 640px)")` does not match, the two bar areas are given a height
 * (jsdom lays nothing out), and no server is involved.
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
}

interface Card {
  applyPoll(detail: Detail): void;
  render(): void;
  setMaximized(on: boolean, how?: { choices?: string }): void;
  showVoteFace(): void;
  element: HTMLElement;
}

interface Fitting {
  shown: Choice[];
  hiddenCount: number;
  hiddenShare: number;
}

interface PollCardApi {
  mount(el: Element, pid: string, opts: object): Card;
  fittingChoices(sorted: Choice[], ownIds: string[], places: number): Fitting;
}

type MaximizeCall = [string, unknown?];

interface Heights {
  results: number;
  voting: number;
}

/** A bar area 259 px tall holds ten bars at 25 px, 1 px apart. */
const TEN_BARS = 259;

let home: StubbedHome | null = null;

afterEach(() => {
  home?.close();
  home = null;
});

/** `count` choices whose shares fall from the first to the last, so the poll's own order is the share order. */
function poll(count: number, overrides: Partial<Detail> = {}): Detail {
  return {
    title: `Poll of ${count}`,
    subtitle: "A subtitle",
    notesPreviewHtml: "",
    choiceMode: "Single-Choice Poll",
    voteMutability: "Final-Vote Poll",
    pollVisibility: "Public Poll",
    pollState: "OPEN",
    totalVoted: 100,
    myChoiceIds: [],
    choices: Array.from({ length: count }, (_, i) => ({ id: `c${i + 1}`, label: `Choice ${i + 1}`, position: i, pct: Math.max(0, 30 - 2 * i), count: Math.max(0, 30 - 2 * i) })),
    contentVersion: 1,
    countsVersion: 1,
    ...overrides
  };
}

const api = () => (home!.window as unknown as { PollCard: PollCardApi }).PollCard;

async function mount(detail: Detail, options: { heights?: Heights; signedIn?: boolean } = {}) {
  home = await openStubbedHome({ scripts: ["pollCard.js"], phone: false, phoneLayout: false });
  const maximizeCalls: MaximizeCall[] = [];
  const grid = home.document.querySelector('.tab-panel[data-panel="trending"] .card-grid')!;
  const card = api().mount(grid, "pid-1", {
    isSignedIn: () => options.signedIn ?? true,
    choiceBounds: { minChoices: 2, maxChoices: 50, choiceLabelMax: 35 },
    onMaximize: (pid: string, how?: unknown) => maximizeCalls.push(how === undefined ? [pid] : [pid, how])
  });
  const el = card.element;
  const heights = options.heights;
  if (heights) {
    Object.defineProperty(el.querySelector(".results-scroll-wrap")!, "clientHeight", { configurable: true, get: () => heights.results });
    Object.defineProperty(el.querySelector(".voting-scroll-wrap")!, "clientHeight", { configurable: true, get: () => heights.voting });
  }
  card.applyPoll(detail);
  return {
    card,
    el,
    maximizeCalls,
    resultRows: () => Array.from(el.querySelectorAll<HTMLElement>(".results-list > .result-row")),
    resultLabels: () => Array.from(el.querySelectorAll(".results-list > .result-row > .result-label")).map((label) => label.textContent),
    voteRows: () => Array.from(el.querySelectorAll<HTMLElement>(".voting-list > .vote-row")),
    moreRow: () => el.querySelector<HTMLButtonElement>(".results-list .more-row"),
    showAllRow: () => el.querySelector<HTMLButtonElement>(".results-list .show-all-row"),
    isFlipped: () => el.querySelector(".card-flip")!.classList.contains("is-flipped"),
    click: async (selector: string) => {
      const target = el.querySelector<HTMLElement>(selector);
      if (!target) throw new Error(`Nothing matches ${selector}`);
      target.click();
      await home!.settle();
    }
  };
}

const fits: Heights = { results: TEN_BARS, voting: TEN_BARS };

describe("the wide-card test scaffold", () => {
  it("shows every bar of a twelve-choice poll when the wraps have no height", async () => {
    const view = await mount(poll(12));
    expect(view.resultRows()).toHaveLength(12);
    expect(view.moreRow()).toBeNull();
  });
});

describe("fittingChoices", () => {
  const sorted = poll(12).choices;
  const ids = (fitting: Fitting) => fitting.shown.map((choice) => choice.id);
  const fitting = async (ownIds: string[], places: number) => {
    home = await openStubbedHome({ scripts: ["pollCard.js"], phone: false, phoneLayout: false });
    return api().fittingChoices(sorted, ownIds, places);
  };

  it("gives the leaders the places when the viewer has no choice", async () => {
    const result = await fitting([], 4);
    expect(ids(result)).toEqual(["c1", "c2", "c3", "c4"]);
    expect(result.hiddenCount).toBe(8);
    expect(result.hiddenShare).toBe(sorted.slice(4).reduce((sum, choice) => sum + choice.pct, 0));
  });

  it("gives the leaders the places when the viewer's choices are among them", async () => {
    expect(ids(await fitting(["c2", "c4"], 4))).toEqual(["c1", "c2", "c3", "c4"]);
  });

  it("gives the last place to an own choice outside the leaders, in share order", async () => {
    const result = await fitting(["c9"], 4);
    expect(ids(result)).toEqual(["c1", "c2", "c3", "c9"]);
    expect(result.hiddenCount).toBe(8);
  });

  it("shows only the own choices with the highest share when they outnumber the places", async () => {
    const result = await fitting(["c12", "c3", "c7", "c5", "c10"], 3);
    expect(ids(result)).toEqual(["c3", "c5", "c7"]);
    expect(result.hiddenCount).toBe(9);
  });

  it("shows none when there is no place", async () => {
    const result = await fitting(["c1"], 0);
    expect(result.shown).toEqual([]);
    expect(result.hiddenCount).toBe(12);
    expect(result.hiddenShare).toBe(sorted.reduce((sum, choice) => sum + choice.pct, 0));
  });
});

describe("the wide card", () => {
  it("shows every bar of a poll that fits, and no more-choices row", async () => {
    const view = await mount(poll(10), { heights: fits });
    expect(view.resultRows()).toHaveLength(10);
    expect(view.moreRow()).toBeNull();
  });

  for (const [count, hiddenShare] of [
    [11, 22],
    [37, 42]
  ] as const) {
    it(`shows nine bars of a ${count}-choice poll, then the share left out`, async () => {
      const view = await mount(poll(count), { heights: fits });
      expect(view.resultLabels()).toEqual(Array.from({ length: 9 }, (_, i) => `Choice ${i + 1}`));
      const list = view.el.querySelector(".results-list")!;
      expect(list.lastElementChild!.firstElementChild).toBe(view.moreRow());
      expect(view.moreRow()!.textContent).toBe(`More choices · ${hiddenShare}%`);
    });
  }

  it("gives no share on a multiple-choice poll", async () => {
    const view = await mount(poll(37, { choiceMode: "Multiple-Choice Poll" }), { heights: fits });
    expect(view.moreRow()!.textContent).toBe("More choices");
  });

  it("sizes the row as one more bar", async () => {
    const view = await mount(poll(37), { heights: fits });
    const bar = view.resultRows()[0]!;
    expect(bar.style.height).toBe("25px");
    expect(view.moreRow()!.parentElement!.style.height).toBe(bar.style.height);
    const labelSize = bar.querySelector<HTMLElement>(".result-label")!.style.fontSize;
    expect(labelSize).not.toBe("");
    expect(view.moreRow()!.style.fontSize).toBe(labelSize);
    expect(bar.classList.contains("is-phone")).toBe(false);
  });

  it("gives the last place to the viewer's own choice outside the leaders", async () => {
    const view = await mount(poll(37, { myChoiceIds: ["c20"] }), { heights: fits });
    expect(view.resultLabels()).toEqual([...Array.from({ length: 8 }, (_, i) => `Choice ${i + 1}`), "Choice 20"]);
  });

  it("shows only the nine own choices with the highest share when the viewer has twelve", async () => {
    const own = Array.from({ length: 12 }, (_, i) => `c${i + 5}`);
    const view = await mount(poll(37, { choiceMode: "Multiple-Choice Poll", myChoiceIds: own }), { heights: fits });
    expect(view.resultLabels()).toEqual(Array.from({ length: 9 }, (_, i) => `Choice ${i + 5}`));
  });

  it("opens the maximized view on the choices with votes from the more-choices row", async () => {
    const view = await mount(poll(37), { heights: fits });
    await view.click(".results-list .more-row");
    expect(view.maximizeCalls).toEqual([["pid-1", { choices: "voted" }]]);
  });

  it("makes the row a button the keyboard reaches", async () => {
    const view = await mount(poll(37), { heights: fits });
    const row = view.moreRow()!;
    expect(row.tagName).toBe("BUTTON");
    expect(row.type).toBe("button");
    expect(row.disabled).toBe(false);
    expect(row.getAttribute("tabindex")).toBeNull();
  });

  it("opens the maximized view at the notes from Show more", async () => {
    const view = await mount(poll(37, { notesPreviewHtml: "<p>Some notes</p>" }), { heights: fits });
    await view.click(".card-front .poll-notes-more");
    expect(view.maximizeCalls).toEqual([["pid-1", { open: "notes" }]]);
  });

  it("opens nothing from a bar or from the notes outside Show more", async () => {
    const view = await mount(poll(37, { notesPreviewHtml: "<p>Some notes</p>" }), { heights: fits });
    await view.click(".results-list > .result-row");
    await view.click(".card-front .poll-notes-text");
    expect(view.maximizeCalls).toEqual([]);
  });

  it("follows the room it is given", async () => {
    const heights = { ...fits };
    const view = await mount(poll(12), { heights });
    expect(view.resultRows()).toHaveLength(9);
    heights.results = 400;
    view.card.render();
    expect(view.resultRows()).toHaveLength(12);
    expect(view.moreRow()).toBeNull();
    heights.results = 129;
    view.card.render();
    expect(view.resultRows()).toHaveLength(4);
    expect(view.moreRow()).not.toBeNull();
  });

  for (const height of [25, 10]) {
    it(`shows the row alone in a bar area ${height} px tall`, async () => {
      const view = await mount(poll(12), { heights: { results: height, voting: TEN_BARS } });
      expect(view.resultRows()).toHaveLength(0);
      expect(view.el.querySelector(".results-list")!.children).toHaveLength(1);
      expect(view.moreRow()).not.toBeNull();
    });
  }
});

describe("voting from the wide card", () => {
  it("flips a card whose ballot fits", async () => {
    const view = await mount(poll(10), { heights: fits });
    await view.click(".vote-btn");
    expect(view.isFlipped()).toBe(true);
    expect(view.voteRows()).toHaveLength(10);
    expect(view.maximizeCalls).toEqual([]);
  });

  it("opens the maximized view on its voting side when the ballot does not fit, and builds no ballot behind the card", async () => {
    const view = await mount(poll(37), { heights: fits });
    expect(view.voteRows()).toHaveLength(0);
    await view.click(".vote-btn");
    expect(view.isFlipped()).toBe(false);
    expect(view.voteRows()).toHaveLength(0);
    expect(view.maximizeCalls).toEqual([["pid-1", { face: "vote" }]]);
  });

  it("flips in place when only the bars do not fit", async () => {
    const view = await mount(poll(37), { heights: { results: TEN_BARS, voting: 1000 } });
    expect(view.moreRow()).not.toBeNull();
    await view.click(".vote-btn");
    expect(view.isFlipped()).toBe(true);
    expect(view.voteRows()).toHaveLength(37);
    expect(view.maximizeCalls).toEqual([]);
  });

  it("opens the maximized view when only the ballot does not fit", async () => {
    const view = await mount(poll(37), { heights: { results: 1000, voting: TEN_BARS } });
    expect(view.resultRows()).toHaveLength(37);
    expect(view.moreRow()).toBeNull();
    await view.click(".vote-btn");
    expect(view.isFlipped()).toBe(false);
    expect(view.maximizeCalls).toEqual([["pid-1", { face: "vote" }]]);
  });

  it("opens nothing for a guest", async () => {
    const view = await mount(poll(37), { heights: fits, signedIn: false });
    await view.click(".vote-btn");
    expect(view.isFlipped()).toBe(false);
    expect(view.maximizeCalls).toEqual([]);
  });

  it("returns to the results side when the ballot stops fitting, and keeps the selection for the maximized view", async () => {
    const view = await mount(poll(10), { heights: fits });
    await view.click(".vote-btn");
    await view.click(".voting-list > .vote-row:nth-child(3)");
    view.card.applyPoll(poll(11, { contentVersion: 2 }));
    await home!.settle();
    expect(view.isFlipped()).toBe(false);
    expect(view.voteRows()).toHaveLength(0);
    view.card.setMaximized(true);
    view.card.showVoteFace();
    await home!.settle();
    expect(view.voteRows()).toHaveLength(11);
    const selected = view.el.querySelectorAll(".voting-list > .vote-row.is-selected");
    expect(selected).toHaveLength(1);
    expect(selected[0]!.querySelector(".vote-label")!.textContent).toBe("Choice 3");
  });
});

describe("the maximized view at wide widths", () => {
  it("shows every bar of a twelve-choice poll and no show-all row", async () => {
    const view = await mount(poll(12), { heights: fits });
    view.card.setMaximized(true);
    expect(view.resultRows()).toHaveLength(12);
    expect(view.showAllRow()).toBeNull();
    expect(view.moreRow()).toBeNull();
  });

  it("shows ten bars of a 37-choice poll, all of them on request, and ten again", async () => {
    const view = await mount(poll(37), { heights: fits });
    view.card.setMaximized(true);
    expect(view.resultRows()).toHaveLength(10);
    expect(view.showAllRow()!.textContent).toBe("Show all 37 choices · 30%");
    expect(view.showAllRow()!.getAttribute("aria-expanded")).toBe("false");
    await view.click(".results-list .show-all-row");
    expect(view.resultRows()).toHaveLength(37);
    expect(view.showAllRow()!.textContent).toBe("Show fewer choices");
    expect(view.showAllRow()!.getAttribute("aria-expanded")).toBe("true");
    expect(home!.document.activeElement).toBe(view.showAllRow());
    await view.click(".results-list .show-all-row");
    expect(view.resultRows()).toHaveLength(10);
    expect(view.maximizeCalls).toEqual([]);
  });

  it("sizes the show-all row as one more bar", async () => {
    const view = await mount(poll(37), { heights: fits });
    view.card.setMaximized(true);
    const bar = view.resultRows()[0]!;
    expect(view.showAllRow()!.parentElement!.style.height).toBe(bar.style.height);
    expect(view.showAllRow()!.style.fontSize).toBe(bar.querySelector<HTMLElement>(".result-label")!.style.fontSize);
  });

  it("keeps every bar and the row when the shares change while all are shown", async () => {
    const view = await mount(poll(37), { heights: fits });
    view.card.setMaximized(true);
    await view.click(".results-list .show-all-row");
    const next = poll(37, { countsVersion: 2 });
    next.choices[36]!.pct = 90;
    view.card.applyPoll(next);
    await home!.settle();
    expect(view.resultRows()).toHaveLength(37);
    expect(view.resultLabels()[0]).toBe("Choice 37");
    expect(view.showAllRow()!.textContent).toBe("Show fewer choices");
  });

  it("leaves out a twelve-choice poll's choices at 0% until asked for all", async () => {
    const detail = poll(12);
    detail.choices.forEach((choice, i) => {
      choice.pct = [70, 29, 1][i] ?? 0;
    });
    const view = await mount(detail, { heights: fits });
    view.card.setMaximized(true);
    expect(view.resultLabels()).toEqual(["Choice 1", "Choice 2", "Choice 3"]);
    expect(view.showAllRow()!.textContent).toBe("Show all 12 choices · 0%");
    await view.click(".results-list .show-all-row");
    expect(view.resultRows()).toHaveLength(12);
  });

  it("leaves out the leaders that read 2% or less", async () => {
    const detail = poll(37);
    detail.choices.forEach((choice, i) => {
      choice.pct = [60, 30, 4, 3, 2, 1][i] ?? 0;
    });
    const view = await mount(detail, { heights: fits });
    view.card.setMaximized(true);
    expect(view.resultLabels()).toEqual(["Choice 1", "Choice 2", "Choice 3", "Choice 4"]);
    expect(view.showAllRow()!.textContent).toBe("Show all 37 choices · 3%");
  });

  it("gives no share on a multiple-choice poll's show-all row", async () => {
    const view = await mount(poll(37, { choiceMode: "Multiple-Choice Poll" }), { heights: fits });
    view.card.setMaximized(true);
    expect(view.showAllRow()!.textContent).toBe("Show all 37 choices");
  });

  it("opened from the more-choices row, shows every choice at 1% or more, then the rest, then the default again", async () => {
    const view = await mount(poll(37, { myChoiceIds: ["c27"] }), { heights: fits });
    view.card.setMaximized(true, { choices: "voted" });
    expect(view.resultRows()).toHaveLength(16);
    expect(view.resultLabels()[15]).toBe("Choice 27");
    expect(view.showAllRow()!.textContent).toBe("Remaining choices · 0%");
    await view.click(".results-list .show-all-row");
    expect(view.resultRows()).toHaveLength(37);
    expect(view.showAllRow()!.textContent).toBe("Show fewer choices");
    await view.click(".results-list .show-all-row");
    expect(view.resultRows()).toHaveLength(11);
    expect(view.showAllRow()!.textContent).toBe("Show all 37 choices · 30%");
  });

  it("adds the viewer's own choice to the ten", async () => {
    const view = await mount(poll(37, { myChoiceIds: ["c27"] }), { heights: fits });
    view.card.setMaximized(true);
    expect(view.resultRows()).toHaveLength(11);
    expect(view.resultLabels()[10]).toBe("Choice 27");
  });

  it("starts at ten again when the view is reopened, and the card returns to what fits", async () => {
    const view = await mount(poll(37), { heights: fits });
    view.card.setMaximized(true);
    await view.click(".results-list .show-all-row");
    view.card.setMaximized(false);
    expect(view.resultRows()).toHaveLength(9);
    expect(view.moreRow()).not.toBeNull();
    view.card.setMaximized(true);
    expect(view.resultRows()).toHaveLength(10);
  });

  it("lists every choice on its voting side", async () => {
    const view = await mount(poll(37), { heights: fits });
    view.card.setMaximized(true);
    view.card.showVoteFace();
    await home!.settle();
    expect(view.isFlipped()).toBe(true);
    expect(view.voteRows()).toHaveLength(37);
  });
});
