import { describe, expect, it } from "vitest";
import { computeDelta, parseClientVersions, type CurrentListing } from "../src/refresh/deltas.js";
import type { PollProjection } from "../src/polls/versions.js";

function projection(pid: string, contentVersion: number): PollProjection {
  return {
    pid,
    title: `Poll ${pid}`,
    subtitle: "",
    choiceMode: "Single-Choice Poll",
    voteMutability: "Final-Vote Poll",
    pollVisibility: "Public Poll",
    pollSharingMode: "Anyone With The Link",
    pollState: "OPEN",
    startAt: null,
    endAt: null,
    choices: [{ id: "c1", label: "One", position: 0 }],
    contentVersion
  };
}

function listing(overrides: Partial<CurrentListing> = {}): CurrentListing {
  return {
    membershipVersion: "m1",
    order: ["p1", "p2"],
    projections: new Map([
      ["p1", projection("p1", 3)],
      ["p2", projection("p2", 1)]
    ]),
    counts: new Map([
      ["p1", { voteCount: 10, choiceCounts: { c1: 10 }, countsVersion: 10 }],
      ["p2", { voteCount: 2, choiceCounts: { c1: 2 }, countsVersion: 2 }]
    ]),
    ...overrides
  };
}

const upToDate = { membershipVersion: "m1", versions: { p1: [3, 10] as [number, number], p2: [1, 2] as [number, number] } };

describe("computeDelta", () => {
  it("answers 304 when every version the client holds is current", () => {
    expect(computeDelta(upToDate, listing())).toEqual({ status: 304 });
  });

  it("sends only counters when the live sequence moved", () => {
    const current = listing({ counts: new Map([["p1", { voteCount: 11, choiceCounts: { c1: 11 }, countsVersion: 11 }], ["p2", { voteCount: 2, choiceCounts: { c1: 2 }, countsVersion: 2 }]]) });
    const delta = computeDelta(upToDate, current);
    expect(delta.status).toBe(200);
    if (delta.status !== 200) return;
    expect(delta.body.order).toBeUndefined();
    expect(delta.body.cards).toEqual({});
    expect(delta.body.counters).toEqual({ p1: { voteCount: 11, choiceCounts: { c1: 11 }, countsVersion: 11 } });
  });

  it("carries a choice's new color to a client holding the older content version", () => {
    const recolored: PollProjection = {
      ...projection("p1", 4),
      choices: [{ id: "c1", label: "One", position: 0, color: "#F91010" }]
    };
    const delta = computeDelta(upToDate, listing({ projections: new Map([["p1", recolored], ["p2", projection("p2", 1)]]) }));
    expect(delta.status).toBe(200);
    if (delta.status !== 200) return;
    expect(delta.body.cards.p1!.choices).toEqual([{ id: "c1", label: "One", position: 0, color: "#F91010" }]);
  });

  it("sends the card (with its counters) when the content version moved", () => {
    const current = listing({ projections: new Map([["p1", projection("p1", 4)], ["p2", projection("p2", 1)]]) });
    const delta = computeDelta(upToDate, current);
    expect(delta.status).toBe(200);
    if (delta.status !== 200) return;
    expect(Object.keys(delta.body.cards)).toEqual(["p1"]);
    expect(delta.body.cards.p1!.contentVersion).toBe(4);
    expect(delta.body.counters.p1!.countsVersion).toBe(10);
    expect(delta.body.order).toBeUndefined();
  });

  it("sends the order plus the cards the client lacks when membership changed", () => {
    const current = listing({
      membershipVersion: "m2",
      order: ["p3", "p1"],
      projections: new Map([["p1", projection("p1", 3)], ["p3", projection("p3", 1)]]),
      counts: new Map([["p1", { voteCount: 10, choiceCounts: { c1: 10 }, countsVersion: 10 }]])
    });
    const delta = computeDelta(upToDate, current);
    expect(delta.status).toBe(200);
    if (delta.status !== 200) return;
    expect(delta.body.membershipVersion).toBe("m2");
    expect(delta.body.order).toEqual(["p3", "p1"]);
    expect(Object.keys(delta.body.cards)).toEqual(["p3"]);
    expect(delta.body.counters.p3).toEqual({ voteCount: 0, choiceCounts: {}, countsVersion: 0 });
    expect(delta.body.counters.p1).toBeUndefined();
  });

  it("never steps a count backwards: an older live sequence sends nothing", () => {
    const current = listing({ counts: new Map([["p1", { voteCount: 9, choiceCounts: { c1: 9 }, countsVersion: 9 }], ["p2", { voteCount: 2, choiceCounts: { c1: 2 }, countsVersion: 2 }]]) });
    expect(computeDelta(upToDate, current)).toEqual({ status: 304 });
  });

  it("attaches the overlay to the cards it sends", () => {
    const current = listing({ overlay: { p2: { voted: true, choiceIds: ["c1"], bookmarked: false } } });
    const delta = computeDelta({ membershipVersion: "m1", versions: { p1: [3, 10] } }, current);
    expect(delta.status).toBe(200);
    if (delta.status !== 200) return;
    expect(delta.body.order).toEqual(["p1", "p2"]);
    expect(delta.body.cards.p2!.overlay).toEqual({ voted: true, choiceIds: ["c1"], bookmarked: false });
    expect(delta.body.cards.p1).toBeUndefined();
  });

  it("parseClientVersions tolerates a missing or malformed body", () => {
    expect(parseClientVersions(undefined)).toEqual({ membershipVersion: null, versions: {} });
    expect(parseClientVersions({ membershipVersion: 5, versions: { p1: ["3", "x"], p2: "bad" } })).toEqual({
      membershipVersion: null,
      versions: { p1: [3, 0] }
    });
  });

  it("sends a placeholder once and no counters for it, then the whole card when the poll gains content", () => {
    const placeholder = { pid: "p3", notPublished: true as const, createdByName: "Dana", contentVersion: 0 };
    const withPlaceholder = listing({
      order: ["p1", "p2", "p3"],
      projections: new Map([
        ["p1", projection("p1", 3)],
        ["p2", projection("p2", 1)],
        ["p3", placeholder]
      ])
    });
    const first = computeDelta(upToDate, withPlaceholder);
    expect(first.status === 200 && first.body.cards.p3).toEqual(placeholder);
    expect(first.status === 200 && first.body.counters.p3).toBeUndefined();

    const held = { membershipVersion: "m1", versions: { ...upToDate.versions, p3: [0, 0] as [number, number] } };
    expect(computeDelta(held, withPlaceholder)).toEqual({ status: 304 });

    const published = listing({
      order: ["p1", "p2", "p3"],
      projections: new Map([
        ["p1", projection("p1", 3)],
        ["p2", projection("p2", 1)],
        ["p3", projection("p3", 1)]
      ])
    });
    const next = computeDelta(held, published);
    expect(next.status === 200 && next.body.cards.p3).toMatchObject({ pid: "p3", title: "Poll p3" });
  });
});
