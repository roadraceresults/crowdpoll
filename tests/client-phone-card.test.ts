/**
 * The poll card in the phone layout (contracts/poll-card.md C2 to C4), on a card mounted by hand:
 * `matchMedia("(max-width: 640px)")` is stubbed, and no server is involved.
 */
import { afterEach, describe, expect, it } from "vitest";
import { openStubbedHome, type StubbedHome } from "./helpers/single-column-page.js";

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
  choices: Array<{ id: string; label: string; position: number; pct: number; count: number }>;
  contentVersion: number;
  countsVersion: number;
}

interface Card {
  applyPoll(detail: Detail): void;
  setMaximized(on: boolean, how?: { choices?: string }): void;
  showVoteFace(): void;
  element: HTMLElement;
}

type MaximizeCall = [string, unknown?];

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

async function mount(detail: Detail, options: { phoneLayout?: boolean; signedIn?: boolean } = {}) {
  home = await openStubbedHome({ scripts: ["pollCard.js"], phone: false, phoneLayout: options.phoneLayout ?? true });
  const maximizeCalls: MaximizeCall[] = [];
  const faces: string[] = [];
  const selections: number[] = [];
  const grid = home.document.querySelector('.tab-panel[data-panel="trending"] .card-grid')!;
  const card = (home.window as unknown as { PollCard: { mount(el: Element, pid: string, opts: object): Card } }).PollCard.mount(grid, "pid-1", {
    isSignedIn: () => options.signedIn ?? true,
    choiceBounds: { minChoices: 2, maxChoices: 50, choiceLabelMax: 35 },
    onMaximize: (pid: string, how?: unknown) => maximizeCalls.push(how === undefined ? [pid] : [pid, how]),
    onFace: (_pid: string, face: string) => faces.push(face),
    onSelection: (_pid: string, count: number) => selections.push(count)
  });
  card.applyPoll(detail);
  const el = card.element;
  return {
    card,
    el,
    maximizeCalls,
    faces,
    selections,
    resultRows: () => Array.from(el.querySelectorAll<HTMLElement>(".results-list > .result-row")),
    resultLabels: () => Array.from(el.querySelectorAll(".results-list > .result-row > .result-label")).map((label) => label.textContent),
    voteRows: () => Array.from(el.querySelectorAll<HTMLElement>(".voting-list > .vote-row")),
    moreRow: () => el.querySelector<HTMLElement>(".results-list .more-row"),
    showAllRow: () => el.querySelector<HTMLElement>(".results-list .show-all-row"),
    isFlipped: () => el.querySelector(".card-flip")!.classList.contains("is-flipped"),
    click: async (selector: string) => {
      const target = el.querySelector<HTMLElement>(selector);
      if (!target) throw new Error(`Nothing matches ${selector}`);
      target.click();
      await home!.settle();
    }
  };
}

describe("the compact card in the phone layout", () => {
  it("shows every bar of a four-choice poll and no more-choices row", async () => {
    const view = await mount(poll(4));
    expect(view.resultRows()).toHaveLength(4);
    expect(view.moreRow()).toBeNull();
  });

  it("shows four bars of a twelve-choice single-choice poll, then the share left out", async () => {
    const detail = poll(12);
    const view = await mount(detail);
    expect(view.resultLabels()).toEqual(["Choice 1", "Choice 2", "Choice 3", "Choice 4"]);
    const hiddenShare = detail.choices.slice(4).reduce((sum, choice) => sum + choice.pct, 0);
    expect(view.moreRow()!.textContent).toBe(`More choices · ${hiddenShare}%`);
    expect(view.moreRow()!.tagName).toBe("BUTTON");
    expect(view.moreRow()!.parentElement!.parentElement).toBe(view.el.querySelector(".results-list"));
  });

  it("gives no share on a multiple-choice poll", async () => {
    const view = await mount(poll(12, { choiceMode: "Multiple-Choice Poll" }));
    expect(view.moreRow()!.textContent).toBe("More choices");
  });

  it("adds the viewer's own choice after the leaders and counts it out of the rest", async () => {
    const view = await mount(poll(12, { myChoiceIds: ["c7"] }));
    expect(view.resultLabels()).toEqual(["Choice 1", "Choice 2", "Choice 3", "Choice 4", "Choice 7"]);
    expect(view.moreRow()!.textContent).toBe("More choices · 102%");
  });

  it("draws 30px bars 8px apart, with the label and percentage in the label-large size", async () => {
    const view = await mount(poll(12));
    const list = view.el.querySelector<HTMLElement>(".results-list")!;
    expect(list.style.rowGap).toBe("8px");
    for (const row of view.resultRows()) {
      expect(row.style.height).toBe("30px");
      expect(row.classList.contains("is-phone")).toBe(true);
      expect(row.querySelector<HTMLElement>(".result-label")!.style.fontSize).toBe("");
      expect(row.querySelector<HTMLElement>(".result-pct")!.style.fontSize).toBe("");
    }
  });

  for (const [what, selector] of [
    ["the title", ".card-front .question"],
    ["the subtitle", ".card-front .subtitle"],
    ["a bar", ".results-list > .result-row"],
    ["Maximize", ".card-front .maximize-btn"]
  ] as const) {
    it(`opens the maximized view from ${what}`, async () => {
      const view = await mount(poll(12));
      await view.click(selector);
      expect(view.maximizeCalls).toEqual([["pid-1"]]);
    });
  }

  it("opens the maximized view on the choices with votes from the more-choices row", async () => {
    const view = await mount(poll(12));
    await view.click(".results-list .more-row");
    expect(view.maximizeCalls).toEqual([["pid-1", { choices: "voted" }]]);
  });

  it("opens the maximized view with the notes open from the notes line", async () => {
    const view = await mount(poll(12, { notesPreviewHtml: "<p>Some notes</p>" }));
    await view.click(".card-front .poll-notes-text");
    expect(view.maximizeCalls).toEqual([["pid-1", { open: "notes" }]]);
  });

  it("keeps a 35-character label whole in the row's name", async () => {
    const detail = poll(4);
    detail.choices[0]!.label = "A label of exactly thirty-five char";
    expect(detail.choices[0]!.label).toHaveLength(35);
    const view = await mount(detail);
    expect(view.resultRows()[0]!.title).toContain("A label of exactly thirty-five char");
  });

  it("stays on its voting side when a sixth choice arrives", async () => {
    const view = await mount(poll(5));
    await view.click(".vote-btn");
    expect(view.isFlipped()).toBe(true);
    view.card.applyPoll(poll(6, { contentVersion: 2 }));
    await home!.settle();
    expect(view.isFlipped()).toBe(true);
    expect(view.voteRows()).toHaveLength(6);
    expect(view.maximizeCalls).toEqual([]);
  });

  it("follows the leaders as the shares change", async () => {
    const view = await mount(poll(6));
    const next = poll(6, { countsVersion: 2 });
    next.choices[5]!.pct = 90;
    view.card.applyPoll(next);
    await home!.settle();
    expect(view.resultLabels()).toEqual(["Choice 6", "Choice 1", "Choice 2", "Choice 3"]);
    expect(view.moreRow()!.textContent).toMatch(/^More choices · /);
  });

  it("changes nothing outside the phone layout", async () => {
    const view = await mount(poll(12), { phoneLayout: false });
    expect(view.resultRows()).toHaveLength(12);
    expect(view.moreRow()).toBeNull();
    expect(view.resultRows()[0]!.classList.contains("is-phone")).toBe(false);
    await view.click(".results-list > .result-row");
    expect(view.maximizeCalls).toEqual([]);
  });
});

describe("voting in the phone layout", () => {
  it("flips a card that shows every choice, with 52px rows on its back", async () => {
    const view = await mount(poll(4));
    await view.click(".vote-btn");
    expect(view.isFlipped()).toBe(true);
    expect(view.maximizeCalls).toEqual([]);
    expect(view.voteRows()).toHaveLength(4);
    for (const row of view.voteRows()) expect(row.style.height).toBe("52px");
    expect(view.el.querySelector<HTMLElement>(".voting-list")!.style.rowGap).toBe("0px");
    expect(view.faces).toEqual(["vote"]);
  });

  it("opens the maximized view on its voting side when choices are left out", async () => {
    const view = await mount(poll(12));
    await view.click(".vote-btn");
    expect(view.isFlipped()).toBe(false);
    expect(view.maximizeCalls).toEqual([["pid-1", { face: "vote" }]]);
  });

  it("builds no ballot behind a card that will not flip", async () => {
    const view = await mount(poll(12));
    expect(view.voteRows()).toHaveLength(0);
  });

  it("turns to the voting side with every choice when asked to", async () => {
    const view = await mount(poll(12));
    view.card.setMaximized(true);
    view.card.showVoteFace();
    await home!.settle();
    expect(view.isFlipped()).toBe(true);
    expect(view.voteRows()).toHaveLength(12);
    expect(view.faces).toEqual(["vote"]);
  });

  it("returns to the results side, with no ballot behind it, when the view closes on its voting side", async () => {
    const view = await mount(poll(12));
    view.card.setMaximized(true);
    view.card.showVoteFace();
    await home!.settle();
    view.card.setMaximized(false);
    await home!.settle();
    expect(view.isFlipped()).toBe(false);
    expect(view.voteRows()).toHaveLength(0);
    expect(view.resultRows()).toHaveLength(4);
    expect(view.faces).toEqual(["vote", "results"]);
  });

  it("keeps the selection made before the view closed on its voting side", async () => {
    const view = await mount(poll(12, { choiceMode: "Multiple-Choice Poll" }));
    view.card.setMaximized(true);
    view.card.showVoteFace();
    await view.click(".voting-list > .vote-row:nth-child(3)");
    view.card.setMaximized(false);
    view.card.setMaximized(true);
    view.card.showVoteFace();
    await home!.settle();
    expect(view.el.querySelectorAll(".voting-list > .vote-row.is-selected")).toHaveLength(1);
  });

  it("leaves no ballot behind when Back is pressed on a card that came to hide choices", async () => {
    const view = await mount(poll(4));
    await view.click(".vote-btn");
    view.card.applyPoll(poll(12));
    await view.click(".back-btn");
    expect(view.isFlipped()).toBe(false);
    expect(view.voteRows()).toHaveLength(0);
  });

  it("reports the number selected, and the face when Back is pressed", async () => {
    const view = await mount(poll(4, { choiceMode: "Multiple-Choice Poll" }));
    await view.click(".vote-btn");
    await view.click(".voting-list > .vote-row");
    expect(view.selections[view.selections.length - 1]).toBe(1);
    await view.click(".voting-list > .vote-row:nth-child(2)");
    expect(view.selections[view.selections.length - 1]).toBe(2);
    await view.click(".back-btn");
    expect(view.faces).toEqual(["vote", "results"]);
  });

  it("flips a twelve-choice card in place outside the phone layout", async () => {
    const view = await mount(poll(12), { phoneLayout: false });
    await view.click(".vote-btn");
    expect(view.isFlipped()).toBe(true);
    expect(view.maximizeCalls).toEqual([]);
    expect(view.voteRows()).toHaveLength(12);
  });
});

describe("the maximized card in the phone layout", () => {
  it("shows every bar of a twelve-choice poll and no show-all row", async () => {
    const view = await mount(poll(12));
    view.card.setMaximized(true);
    expect(view.resultRows()).toHaveLength(12);
    expect(view.showAllRow()).toBeNull();
    expect(view.moreRow()).toBeNull();
  });

  it("shows ten bars of a 37-choice poll, all of them on request, and ten again", async () => {
    const view = await mount(poll(37));
    view.card.setMaximized(true);
    expect(view.resultRows()).toHaveLength(10);
    expect(view.showAllRow()!.textContent).toBe("Show all 37 choices · 30%");
    expect(view.showAllRow()!.getAttribute("aria-expanded")).toBe("false");
    await view.click(".results-list .show-all-row");
    expect(view.resultRows()).toHaveLength(37);
    expect(view.showAllRow()!.textContent).toBe("Show fewer choices");
    expect(view.showAllRow()!.getAttribute("aria-expanded")).toBe("true");
    await view.click(".results-list .show-all-row");
    expect(view.resultRows()).toHaveLength(10);
    expect(view.maximizeCalls).toEqual([]);
  });

  it("opens the ballot at the card's top on Vote, and goes back to the maximized card's top when the flip button turns it back", async () => {
    const view = await mount(poll(37));
    const win = view.el.ownerDocument.defaultView as unknown as Window;
    const scrolls: number[] = [];
    win.scrollTo = ((_x: number, y: number) => { scrolls.push(y); }) as typeof win.scrollTo;
    view.el.getBoundingClientRect = () => ({ top: -900 } as DOMRect);
    const top = win.scrollY - 900 - 16;
    // Vote: the ballot starts at the card's top, in the grid and maximized alike.
    view.card.showVoteFace();
    expect(scrolls).toEqual([top]);
    await view.click(".card-back .back-btn");
    expect(scrolls).toEqual([top]);
    view.card.setMaximized(true);
    view.card.showVoteFace();
    expect(scrolls).toEqual([top, top]);
    await view.click(".card-back .back-btn");
    expect(view.el.querySelector(".card-flip")!.classList.contains("is-flipped")).toBe(false);
    expect(scrolls).toEqual([top, top, top]);
  });

  it("goes back to the card's top once a vote is recorded", async () => {
    const view = await mount(poll(37));
    const win = view.el.ownerDocument.defaultView as unknown as Window & { VoteClient: unknown };
    win.VoteClient = {
      canVote: () => true,
      QUEUED_NOTICE: "Queued",
      submit: async () => ({ ok: true, outcome: { status: "recorded", nextRefreshMs: 0 } })
    };
    view.card.setMaximized(true);
    view.card.showVoteFace();
    const scrolls: number[] = [];
    win.scrollTo = ((_x: number, y: number) => { scrolls.push(y); }) as typeof win.scrollTo;
    // Scrolled down the long ballot, the card's top is far above the window.
    view.el.getBoundingClientRect = () => ({ top: -900 } as DOMRect);
    await view.click(".voting-list > .vote-row:last-child");
    await view.click(".card-back .submit-vote-btn");
    expect(view.isFlipped()).toBe(false);
    expect(scrolls).toEqual([win.scrollY - 900 - 16]);
  });

  it("marks the title row while the Watch button shows, so the title leaves room for two icons", async () => {
    const view = await mount(poll(4));
    const row = view.el.querySelector<HTMLElement>(".card-front .question-row")!;
    const watch = row.querySelector<HTMLElement>(".bookmark-btn")!;
    expect(watch.hidden).toBe(false);
    expect(row.classList.contains("has-bookmark")).toBe(true);
    view.card.applyPoll(poll(4, { mayWatch: false } as Partial<Detail>));
    expect(watch.hidden).toBe(true);
    expect(row.classList.contains("has-bookmark")).toBe(false);
  });

  it("does not scroll on Vote when the card's top is already in view", async () => {
    const view = await mount(poll(5));
    const win = view.el.ownerDocument.defaultView as unknown as Window;
    const scrolls: number[] = [];
    win.scrollTo = ((_x: number, y: number) => { scrolls.push(y); }) as typeof win.scrollTo;
    view.el.getBoundingClientRect = () => ({ top: 120 } as DOMRect);
    view.card.showVoteFace();
    expect(view.el.querySelector(".card-flip")!.classList.contains("is-flipped")).toBe(true);
    expect(scrolls).toEqual([]);
  });

  it("keeps focus on the show-all row without scrolling to it, and goes back to the card's top on Show fewer choices", async () => {
    const view = await mount(poll(37));
    view.card.setMaximized(true);
    const win = view.el.ownerDocument.defaultView as unknown as Window & { HTMLElement: typeof HTMLElement };
    const scrolls: number[] = [];
    win.scrollTo = ((_x: number, y: number) => { scrolls.push(y); }) as typeof win.scrollTo;
    const cardTop = { top: 0 };
    view.el.getBoundingClientRect = () => ({ top: cardTop.top } as DOMRect);
    const focusOptions: unknown[] = [];
    const proto = win.HTMLElement.prototype;
    const focus = proto.focus;
    proto.focus = function (this: HTMLElement, options?: FocusOptions) {
      if (this.classList.contains("show-all-row")) focusOptions.push(options);
      return focus.call(this, options);
    };
    try {
      await view.click(".results-list .show-all-row");
      expect(view.el.ownerDocument.activeElement).toBe(view.showAllRow());
      expect(scrolls).toEqual([]);
      // Scrolled down the long list, the card's top is far above the window.
      cardTop.top = -900;
      await view.click(".results-list .show-all-row");
    } finally {
      proto.focus = focus;
    }
    expect(focusOptions).toEqual([{ preventScroll: true }, { preventScroll: true }]);
    expect(scrolls).toEqual([win.scrollY - 900 - 16]);
  });

  it("leaves out a twelve-choice poll's choices at 0% until asked for all", async () => {
    const detail = poll(12);
    detail.choices.forEach((choice, i) => {
      choice.pct = [70, 29, 1][i] ?? 0;
    });
    const view = await mount(detail);
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
    const view = await mount(detail);
    view.card.setMaximized(true);
    expect(view.resultLabels()).toEqual(["Choice 1", "Choice 2", "Choice 3", "Choice 4"]);
    expect(view.showAllRow()!.textContent).toBe("Show all 37 choices · 3%");
    await view.click(".results-list .show-all-row");
    expect(view.resultRows()).toHaveLength(37);
  });

  it("gives no share on a multiple-choice poll's show-all row", async () => {
    const view = await mount(poll(37, { choiceMode: "Multiple-Choice Poll" }));
    view.card.setMaximized(true);
    expect(view.showAllRow()!.textContent).toBe("Show all 37 choices");
  });

  it("opened from the more-choices row, shows every choice at 1% or more, then the rest, then the default again", async () => {
    const view = await mount(poll(37, { myChoiceIds: ["c27"] }));
    view.card.setMaximized(true, { choices: "voted" });
    expect(view.resultRows()).toHaveLength(16);
    expect(view.resultLabels()[15]).toBe("Choice 27");
    expect(view.showAllRow()!.textContent).toBe("Show all 37 choices · 0%");
    expect(view.showAllRow()!.getAttribute("aria-expanded")).toBe("false");
    await view.click(".results-list .show-all-row");
    expect(view.resultRows()).toHaveLength(37);
    expect(view.showAllRow()!.textContent).toBe("Show fewer choices");
    await view.click(".results-list .show-all-row");
    expect(view.resultRows()).toHaveLength(11);
    expect(view.showAllRow()!.textContent).toBe("Show all 37 choices · 30%");
  });

  it("opened from the more-choices row with every choice at 1% or more, shows them all and no row", async () => {
    const view = await mount(poll(12));
    view.card.setMaximized(true, { choices: "voted" });
    expect(view.resultRows()).toHaveLength(12);
    expect(view.showAllRow()).toBeNull();
  });

  it("opened from the more-choices row before any vote, shows every choice", async () => {
    const detail = poll(8);
    detail.choices.forEach((choice) => {
      choice.pct = 0;
    });
    const view = await mount(detail);
    view.card.setMaximized(true, { choices: "voted" });
    expect(view.resultRows()).toHaveLength(8);
    expect(view.showAllRow()).toBeNull();
  });

  it("opened from the more-choices row, starts at the default when reopened another way", async () => {
    const view = await mount(poll(37));
    view.card.setMaximized(true, { choices: "voted" });
    view.card.setMaximized(false);
    view.card.setMaximized(true);
    expect(view.resultRows()).toHaveLength(10);
  });

  it("adds the viewer's own choice to the ten", async () => {
    const view = await mount(poll(37, { myChoiceIds: ["c27"] }));
    view.card.setMaximized(true);
    expect(view.resultRows()).toHaveLength(11);
    expect(view.resultLabels()[10]).toBe("Choice 27");
  });

  it("starts at ten again when the view is reopened", async () => {
    const view = await mount(poll(37));
    view.card.setMaximized(true);
    await view.click(".results-list .show-all-row");
    view.card.setMaximized(false);
    expect(view.resultRows()).toHaveLength(4);
    view.card.setMaximized(true);
    expect(view.resultRows()).toHaveLength(10);
  });

  it("draws 30px bars 8px apart", async () => {
    const view = await mount(poll(37));
    view.card.setMaximized(true);
    expect(view.el.querySelector<HTMLElement>(".results-list")!.style.rowGap).toBe("8px");
    expect(view.resultRows()[0]!.style.height).toBe("30px");
  });

  it("shows the same ten bars and show-all row outside the phone layout", async () => {
    const view = await mount(poll(37), { phoneLayout: false });
    view.card.setMaximized(true);
    expect(view.resultRows()).toHaveLength(10);
    expect(view.showAllRow()!.textContent).toBe("Show all 37 choices · 30%");
  });
});
