/** Contract C1 (contracts/poll-card.md): which choices a phone card shows, and what it leaves out. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openStubbedHome, type StubbedHome } from "./helpers/single-column-page.js";

interface Choice {
  id: string;
  pct: number;
}
interface Limits {
  lead: number;
  allUpTo: number;
  abovePct?: number;
  allAbovePct?: number;
}
interface Essential {
  shown: Choice[];
  hiddenCount: number;
  hiddenShare: number;
}
interface PollCardApi {
  essentialChoices(sorted: Choice[], ownIds: string[], limits: Limits): Essential;
  COMPACT_LIMITS: Limits;
  MAXIMIZED_LIMITS: Limits;
}

let home: StubbedHome;
let card: PollCardApi;

beforeAll(async () => {
  home = await openStubbedHome({ scripts: ["pollCard.js"] });
  card = (home.window as unknown as { PollCard: PollCardApi }).PollCard;
});

afterAll(() => home.close());

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** `count` choices named A, B, C… already in share order, each with a share of `pct`. */
function choices(count: number, pct = 2): Choice[] {
  return Array.from({ length: count }, (_, i) => ({ id: LETTERS[i]!, pct }));
}

const ids = (list: Choice[]) => list.map((choice) => choice.id).join(" ");

describe("essentialChoices", () => {
  it("has the two limits of the phone layout", () => {
    expect(card.COMPACT_LIMITS).toEqual({ lead: 4, allUpTo: 5 });
    expect(card.MAXIMIZED_LIMITS).toEqual({ lead: 10, allUpTo: 12, abovePct: 2, allAbovePct: 0 });
  });

  const compact: Array<[number, string[], string, number]> = [
    [3, [], "A B C", 0],
    [5, [], "A B C D E", 0],
    [6, [], "A B C D", 2],
    [12, [], "A B C D", 8],
    [12, ["B"], "A B C D", 8],
    [12, ["G"], "A B C D G", 7],
    [12, ["K", "G"], "A B C D G K", 6],
    [50, [], "A B C D", 46]
  ];
  for (const [count, own, shown, hidden] of compact) {
    it(`compact card, ${count} choices, own ${own.join(", ") || "none"}: shows ${shown}, hides ${hidden}`, () => {
      const result = card.essentialChoices(choices(count), own, card.COMPACT_LIMITS);
      expect(ids(result.shown)).toBe(shown);
      expect(result.hiddenCount).toBe(hidden);
    });
  }

  it("maximized view, 12 choices: shows all twelve", () => {
    const result = card.essentialChoices(choices(12), [], card.MAXIMIZED_LIMITS);
    expect(result.shown).toHaveLength(12);
    expect(result.hiddenCount).toBe(0);
    expect(result.hiddenShare).toBe(0);
  });

  it("maximized view, 13 choices: shows the ten leaders", () => {
    const result = card.essentialChoices(choices(13), [], card.MAXIMIZED_LIMITS);
    expect(ids(result.shown)).toBe("A B C D E F G H I J");
    expect(result.hiddenCount).toBe(3);
  });

  it("maximized view, 37 choices, own the 27th: shows the ten leaders and it", () => {
    const result = card.essentialChoices(choices(37), ["a"], card.MAXIMIZED_LIMITS);
    expect(ids(result.shown)).toBe("A B C D E F G H I J a");
    expect(result.hiddenCount).toBe(26);
  });

  /** Fifty choices in share order: the given shares first, then 0% each. */
  const fifty = (...pcts: number[]): Choice[] => choices(50, 0).map((choice, i) => ({ ...choice, pct: pcts[i] ?? 0 }));

  it("maximized view, 12 choices, some at 0%: leaves those out", () => {
    const sorted = choices(12, 0).map((choice, i) => ({ ...choice, pct: [70, 28, 1, 1][i] ?? 0 }));
    const result = card.essentialChoices(sorted, [], card.MAXIMIZED_LIMITS);
    expect(ids(result.shown)).toBe("A B C D");
    expect(result.hiddenCount).toBe(8);
    expect(card.essentialChoices(sorted, ["H"], card.MAXIMIZED_LIMITS).shown.map((choice) => choice.id)).toEqual(["A", "B", "C", "D", "H"]);
  });

  it("maximized view, 12 choices, no votes yet: shows all twelve", () => {
    const result = card.essentialChoices(choices(12, 0), [], card.MAXIMIZED_LIMITS);
    expect(result.shown).toHaveLength(12);
    expect(result.hiddenCount).toBe(0);
  });

  it("maximized view, 50 choices, three above 2%: shows those three", () => {
    const result = card.essentialChoices(fifty(60, 28, 3, 2, 1, 1, 1, 1, 1, 1, 1), [], card.MAXIMIZED_LIMITS);
    expect(ids(result.shown)).toBe("A B C");
    expect(result.hiddenCount).toBe(47);
    expect(result.hiddenShare).toBe(9);
  });

  it("maximized view, 50 choices, every leader at 2%: shows the ten leaders", () => {
    const result = card.essentialChoices(choices(50, 2), [], card.MAXIMIZED_LIMITS);
    expect(ids(result.shown)).toBe("A B C D E F G H I J");
  });

  it("maximized view, 50 choices, fifteen above 2%: shows no more than ten", () => {
    const result = card.essentialChoices(fifty(...Array.from({ length: 15 }, () => 6)), [], card.MAXIMIZED_LIMITS);
    expect(ids(result.shown)).toBe("A B C D E F G H I J");
    expect(result.hiddenCount).toBe(40);
  });

  it("maximized view, 50 choices: keeps the viewer's own choice at 1%", () => {
    const result = card.essentialChoices(fifty(60, 30, 3, 1, 1), ["E"], card.MAXIMIZED_LIMITS);
    expect(ids(result.shown)).toBe("A B C E");
    expect(result.hiddenCount).toBe(46);
  });

  it("maximized view, 50 choices, no votes yet: shows the ten leaders", () => {
    const result = card.essentialChoices(choices(50, 0), [], card.MAXIMIZED_LIMITS);
    expect(ids(result.shown)).toBe("A B C D E F G H I J");
    expect(result.hiddenCount).toBe(40);
  });

  it("compact card: keeps its four leaders whatever their share", () => {
    const result = card.essentialChoices(fifty(98, 1, 1), [], card.COMPACT_LIMITS);
    expect(ids(result.shown)).toBe("A B C D");
  });

  it("keeps the poll's own order when there are no votes yet", () => {
    const result = card.essentialChoices(choices(6, 0), [], card.COMPACT_LIMITS);
    expect(ids(result.shown)).toBe("A B C D");
    expect(result.hiddenCount).toBe(2);
    expect(result.hiddenShare).toBe(0);
  });

  it("gives the hidden choices' combined share", () => {
    const sorted = [40, 20, 10, 9, 8, 7, 6].map((pct, i) => ({ id: LETTERS[i]!, pct }));
    expect(card.essentialChoices(sorted, [], card.COMPACT_LIMITS).hiddenShare).toBe(21);
    expect(card.essentialChoices(sorted, ["F"], card.COMPACT_LIMITS).hiddenShare).toBe(14);
  });

  it("changes neither the list nor its items", () => {
    const sorted = choices(8);
    const copy = JSON.stringify(sorted);
    const result = card.essentialChoices(sorted, ["H"], card.COMPACT_LIMITS);
    expect(JSON.stringify(sorted)).toBe(copy);
    expect(result.shown[4]).toBe(sorted[7]);
  });
});
