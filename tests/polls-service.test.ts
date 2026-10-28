import { describe, it, expect } from "vitest";
import {
  evaluateSchedule,
  correctInvertedSchedule,
  computeResults,
  createDefaultPoll,
  nextAvailableCopyTitle,
  replaceChoices,
  AdminError,
  capabilitiesFor,
  validatePollFields
} from "../src/polls/service.js";
import type { Poll, VoteEntry } from "../src/polls/store.js";
import { makePoll } from "./helpers/poll-fixtures.js";

function expectAdminError(fn: () => unknown, status: number): void {
  try {
    fn();
    expect.fail("expected an AdminError to be thrown");
  } catch (err) {
    expect(err).toBeInstanceOf(AdminError);
    expect((err as AdminError).status).toBe(status);
  }
}

function voteEntry(overrides: Partial<VoteEntry>): VoteEntry {
  return {
    emailAddress: "a@example.com",
    userName: "a",
    choiceIds: [],
    votedAt: null,
    ...overrides
  };
}

describe("evaluateSchedule (011 FR-041..FR-045)", () => {
  const base = { startAt: null, endAt: null };

  it("is OPEN with no dates — an absent start means already started", () => {
    expect(evaluateSchedule(base)).toBe("OPEN");
  });

  it("is WAITING TO OPEN when startAt is in the future", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(evaluateSchedule({ ...base, startAt: new Date("2026-06-01T00:00:00Z") }, now)).toBe(
      "WAITING TO OPEN"
    );
  });

  it("is CLOSED once endAt has passed", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    expect(evaluateSchedule({ ...base, endAt: new Date("2026-01-01T00:00:00Z") }, now)).toBe(
      "CLOSED"
    );
  });

  it("treats both bounds as inclusive", () => {
    const at = new Date("2026-03-01T00:00:00Z");
    expect(evaluateSchedule({ startAt: at, endAt: null }, at)).toBe("OPEN");
    expect(evaluateSchedule({ startAt: null, endAt: at }, at)).toBe("OPEN");
  });

  it("never closes on its own when endAt is absent", () => {
    const far = new Date("2099-01-01T00:00:00Z");
    expect(evaluateSchedule({ startAt: null, endAt: null }, far)).toBe("OPEN");
  });
});

describe("correctInvertedSchedule (011 FR-046 fail-safe)", () => {
  it("returns null for a normal schedule", () => {
    expect(
      correctInvertedSchedule({ startAt: new Date("2026-01-01"), endAt: new Date("2026-02-01") })
    ).toBeNull();
    expect(correctInvertedSchedule({ startAt: null, endAt: null })).toBeNull();
  });

  it("pulls startAt to one second before endAt and closes the poll", () => {
    const endAt = new Date("2026-02-01T00:00:00Z");
    const fix = correctInvertedSchedule({ startAt: new Date("2026-03-01T00:00:00Z"), endAt });
    expect(fix).not.toBeNull();
    expect(fix!.pollState).toBe("CLOSED");
    expect(fix!.startAt.getTime()).toBe(endAt.getTime() - 1000);
  });
});

describe("computeResults (FR-020/021)", () => {
  const choices = [
    { id: "c1", label: "Choice 1", position: 0 },
    { id: "c2", label: "Choice 2", position: 1 }
  ];

  it("computes single-choice percentages against distinct participants", () => {
    const currentVotes = [
      voteEntry({ emailAddress: "a@x.com", choiceIds: ["c1"], votedAt: new Date() }),
      voteEntry({ emailAddress: "b@x.com", choiceIds: ["c1"], votedAt: new Date() }),
      voteEntry({ emailAddress: "c@x.com", choiceIds: ["c2"], votedAt: new Date() })
    ];
    const results = computeResults({ choices, currentVotes });
    expect(results.totalVoted).toBe(3);
    expect(results.choices.find((c) => c.id === "c1")?.pct).toBe(67);
    expect(results.choices.find((c) => c.id === "c2")?.pct).toBe(33);
  });

  it("multi-choice percentage denominator is selections, not participants", () => {
    const currentVotes = [
      voteEntry({ emailAddress: "a@x.com", choiceIds: ["c1", "c2"], votedAt: new Date() }),
      voteEntry({ emailAddress: "b@x.com", choiceIds: ["c1"], votedAt: new Date() })
    ];
    const results = computeResults({ choices, currentVotes, choiceMode: "Multiple-Choice Poll" });
    expect(results.totalVoted).toBe(2);
    expect(results.choices.find((c) => c.id === "c1")?.count).toBe(2);
    expect(results.choices.find((c) => c.id === "c2")?.count).toBe(1);
    expect(results.choices.find((c) => c.id === "c1")?.pct).toBe(67);
    expect(results.choices.find((c) => c.id === "c2")?.pct).toBe(33);
  });

  it("multi-choice percentages are 0 while nobody has picked anything", () => {
    const results = computeResults({ choices, currentVotes: [], choiceMode: "Multiple-Choice Poll" });
    expect(results.choices.map((c) => c.pct)).toEqual([0, 0]);
  });

  it("single-choice percentages keep participants as the denominator", () => {
    const currentVotes = [voteEntry({ emailAddress: "a@x.com", choiceIds: ["c1"], votedAt: new Date() })];
    const results = computeResults({ choices, currentVotes, choiceMode: "Single-Choice Poll" });
    expect(results.choices.find((c) => c.id === "c1")?.pct).toBe(100);
  });

  it("counts every stored choice and separates not-yet-voted (011: no removed markers)", () => {
    const currentVotes = [
      voteEntry({ emailAddress: "a@x.com", choiceIds: ["c1"], votedAt: new Date() }),
      voteEntry({ emailAddress: "b@x.com", choiceIds: [], votedAt: null }) // pre-seeded, no vote
    ];
    const results = computeResults({ choices, currentVotes });
    expect(results.choices.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(results.totalVoted).toBe(1);
    expect(results.totalNotYetVoted).toBe(1);
  });
});

describe("replaceChoices (006-poll-choices-editor FR-004-008)", () => {
  // 014: the bounds come from ENV_MIN_CHOICES / ENV_MAX_CHOICES; these are their defaults.
  const CHOICE_BOUNDS = { minChoices: 2, maxChoices: 50 };

  it("rejects a non-array labels payload", () => {
    const poll = makePoll();
    expectAdminError(() => replaceChoices(poll, "not an array", CHOICE_BOUNDS), 400);
  });

  it("trims each label and drops blank lines", () => {
    const poll = makePoll({ choices: [], currentVotes: [] });
    const result = replaceChoices(poll, ["  Coffee  ", "", "   ", "Tea"], CHOICE_BOUNDS);
    expect(result.map((c) => c.label)).toEqual(["Coffee", "Tea"]);
  });

  it("rejects fewer than 2 non-blank labels", () => {
    const poll = makePoll();
    expectAdminError(() => replaceChoices(poll, ["Only one"], CHOICE_BOUNDS), 400);
  });

  it("rejects more than 50 non-blank labels", () => {
    const poll = makePoll();
    const labels = Array.from({ length: 51 }, (_, i) => `Choice ${i}`);
    expectAdminError(() => replaceChoices(poll, labels, CHOICE_BOUNDS), 400);
  });

  it("rejects a label over 100 characters", () => {
    const poll = makePoll();
    expectAdminError(() => replaceChoices(poll, ["A", "x".repeat(101)], CHOICE_BOUNDS), 400);
  });

  it("rejects two identical labels after trimming", () => {
    const poll = makePoll();
    expectAdminError(() => replaceChoices(poll, ["Same", " Same "], CHOICE_BOUNDS), 409);
  });

  it("assigns a fresh id to every choice, even when its label is unchanged", () => {
    const poll = makePoll({
      choices: [
        { id: "c1", label: "Coffee", position: 0 },
        { id: "c2", label: "Tea", position: 1 }
      ]
    });
    const result = replaceChoices(poll, ["Coffee", "Tea"], CHOICE_BOUNDS);
    expect(result.map((c) => c.label)).toEqual(["Coffee", "Tea"]);
    expect(result[0]!.id).not.toBe("c1");
    expect(result[1]!.id).not.toBe("c2");
  });

  it("assigns position sequentially, matching the saved line order", () => {
    const poll = makePoll();
    const result = replaceChoices(poll, ["First", "Second", "Third"], CHOICE_BOUNDS);
    expect(result.map((c) => c.position)).toEqual([0, 1, 2]);
  });

  it("replaces the stored list wholesale, retaining no record of the previous choices (011 FR-010)", () => {
    const poll = makePoll({
      choices: [
        { id: "c1", label: "Coffee", position: 0 },
        { id: "c2", label: "Cocoa", position: 1 }
      ]
    });
    const result = replaceChoices(poll, ["Tea", "Juice"], CHOICE_BOUNDS);
    expect(result.map((c) => c.label)).toEqual(["Tea", "Juice"]);
    expect(poll.choices.map((c) => c.label)).toEqual(["Tea", "Juice"]);
    expect(poll.choices).toHaveLength(2);
  });

  it("leaves existing votes untouched (011: only ever runs for a poll with no votes)", () => {
    const poll = makePoll({
      choices: [
        { id: "c1", label: "Coffee", position: 0 },
        { id: "c2", label: "Tea", position: 1 }
      ],
      currentVotes: [
        { emailAddress: "c@x.com", userName: "c", choiceIds: [], votedAt: null }
      ]
    });
    replaceChoices(poll, ["Coffee", "Tea"], CHOICE_BOUNDS);
    expect(poll.currentVotes.map((v) => v.choiceIds)).toEqual([[]]);
  });
});

describe("createDefaultPoll (FR-036 AC1)", () => {
  it("matches the documented defaults", () => {
    const poll = createDefaultPoll(new Date("2026-01-01T00:00:00Z"));
    expect(poll.title).toBe("New Poll 2026-01-01 00:00:00");
    expect(poll.subtitle).toBe("");
    expect(poll.choiceMode).toBe("Single-Choice Poll");
    expect(poll.voteMutability).toBe("Dynamic-Vote Poll");
    expect(poll.keywords).toBe("");
    expect(poll.pollVisibility).toBe("Public Poll");
    expect(poll.voterCountLimit).toBeNull();
    expect(poll.pollState).toBe("INITIALIZED");
    expect(poll.startAt).toBeNull();
    expect(poll.endAt).toBeNull();
    expect(poll.choices.map((c) => c.label)).toEqual(["Choice 1", "Choice 2"]);
  });
});

describe("nextAvailableCopyTitle (FR-001/002)", () => {
  it("appends ' Copy' when unused", () => {
    expect(nextAvailableCopyTitle("Customer Satisfaction", [])).toBe("Customer Satisfaction Copy");
  });

  it("appends ' Copy 1' when 'X Copy' is already used", () => {
    expect(nextAvailableCopyTitle("Customer Satisfaction", ["Customer Satisfaction Copy"])).toBe(
      "Customer Satisfaction Copy 1"
    );
  });

  it("appends ' Copy 2' when 'X Copy' and 'X Copy 1' are already used", () => {
    expect(
      nextAvailableCopyTitle("Customer Satisfaction", ["Customer Satisfaction Copy", "Customer Satisfaction Copy 1"])
    ).toBe("Customer Satisfaction Copy 2");
  });

  it("handles a source title that already ends in 'Copy'", () => {
    expect(nextAvailableCopyTitle("Team Offsite Copy", [])).toBe("Team Offsite Copy Copy");
  });

  it("returns the first free slot rather than max + 1 when there's a gap", () => {
    expect(
      nextAvailableCopyTitle("X", ["X Copy", "X Copy 1", "X Copy 2", "X Copy 4"])
    ).toBe("X Copy 3");
  });
});

// 012 T012 (FR-030/FR-031): one predicate decides every row action. Asserted for all
// eight states so a greyed button and a refused request can never disagree.
describe("capabilitiesFor (012 FR-030/FR-031)", () => {
  const base = { pollAcceptabilityScreeningAttempts: 0 };
  const caps = (pollState: string, voted = false, attempts = 0) =>
    capabilitiesFor(
      { pollState, pollAcceptabilityScreeningAttempts: attempts } as never,
      voted,
      10
    );

  it("offers Open only from WAITING TO OPEN and CLOSED", () => {
    expect(caps("WAITING TO OPEN").canOpen).toBe(true);
    expect(caps("CLOSED").canOpen).toBe(true);
    for (const st of ["INITIALIZED", "EDITING", "AWAITING APPROVAL", "REJECTED", "OPEN", "ARCHIVED"]) {
      expect(caps(st).canOpen, st).toBe(false);
    }
  });

  it("offers Close only from WAITING TO OPEN and OPEN", () => {
    expect(caps("WAITING TO OPEN").canClose).toBe(true);
    expect(caps("OPEN").canClose).toBe(true);
    for (const st of ["INITIALIZED", "EDITING", "AWAITING APPROVAL", "REJECTED", "CLOSED", "ARCHIVED"]) {
      expect(caps(st).canClose, st).toBe(false);
    }
  });

  it("offers Archive only from CLOSED", () => {
    expect(caps("CLOSED").canArchive).toBe(true);
    for (const st of ["INITIALIZED", "EDITING", "AWAITING APPROVAL", "REJECTED", "WAITING TO OPEN", "OPEN", "ARCHIVED"]) {
      expect(caps(st).canArchive, st).toBe(false);
    }
  });

  it("offers Delete only from INITIALIZED, REJECTED and ARCHIVED", () => {
    for (const st of ["INITIALIZED", "REJECTED", "ARCHIVED"]) {
      expect(caps(st).canDelete, st).toBe(true);
    }
    for (const st of ["EDITING", "AWAITING APPROVAL", "WAITING TO OPEN", "OPEN", "CLOSED"]) {
      expect(caps(st).canDelete, st).toBe(false);
    }
  });

  it("offers exactly one of Edit or Update, and neither when a session cannot begin", () => {
    expect(caps("OPEN", false).canEdit).toBe(true);
    expect(caps("OPEN", false).canUpdate).toBe(false);
    expect(caps("OPEN", true).canUpdate).toBe(true);
    expect(caps("OPEN", true).canEdit).toBe(false);
    for (const st of ["EDITING", "AWAITING APPROVAL", "ARCHIVED"]) {
      expect(caps(st).canEdit, st).toBe(false);
      expect(caps(st).canUpdate, st).toBe(false);
    }
  });

  it("offers Re-attempt Screening only once the attempt budget is spent", () => {
    expect(caps("REJECTED", false, 9).canRescreen).toBe(false);
    expect(caps("REJECTED", false, 10).canRescreen).toBe(true);
    expect(caps("OPEN", false, 10).canRescreen).toBe(false);
  });

  it("WAITING TO OPEN deliberately offers both Open and Close", () => {
    const c = caps("WAITING TO OPEN");
    expect(c.canOpen && c.canClose).toBe(true);
    expect(base.pollAcceptabilityScreeningAttempts).toBe(0);
  });
});

describe("validatePollFields freezes the three visibility settings once voted on", () => {
  const voted = makePoll({ pollVisibility: "Private Poll" });

  it("refuses each setting with a 409 naming it", () => {
    for (const [body, message] of [
      [{ pollVisibility: "Public Poll" }, "pollVisibility cannot be changed after the poll has received a vote."],
      [{ pollSharingMode: "Invitation Only" }, "pollSharingMode cannot be changed after the poll has received a vote."],
      [{ voteAnonymity: "No" }, "voteAnonymity cannot be changed after the poll has received a vote."]
    ] as const) {
      let caught: unknown;
      try {
        validatePollFields(voted, body, true);
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(AdminError);
      expect((caught as AdminError).status).toBe(409);
      expect((caught as AdminError).message).toBe(message);
    }
  });

  it("accepts all three on a poll that has never been voted on", () => {
    const $set = validatePollFields(
      makePoll(),
      { pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", voteAnonymity: "No" },
      false
    );
    expect($set.pollVisibility).toBe("Private Poll");
    expect($set.pollSharingMode).toBe("Invitation Only");
    expect($set.voteAnonymity).toBe("No");
  });

  it("refuses an unknown value with a 400 naming the setting", () => {
    for (const [body, message] of [
      [{ pollSharingMode: "Everyone" }, "Invalid pollSharingMode."],
      [{ voteAnonymity: "Maybe" }, "Invalid voteAnonymity."]
    ] as const) {
      expect(() => validatePollFields(makePoll(), body, false)).toThrow(message);
    }
  });
});
