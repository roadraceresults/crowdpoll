/**
 * Pure units over src/polls/lineGraph.ts: the cumulative bucket replay, the
 * scale table and availability rules, UTC bucket alignment, and the threshold
 * filter. Percentage parity is asserted against computeResults itself, so the
 * line graph can never round differently from the bar graph.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { availableScales, bucketTimes, buildSeries, type ReplayEvent } from "../src/polls/lineGraph.js";
import { computeResults } from "../src/polls/service.js";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = new Date("2026-10-27T15:30:00Z");

const choicesOf = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `c${i + 1}`, label: `Choice ${i + 1}`, position: i }));
const singlePoll = (n = 2) => ({ choices: choicesOf(n), choice_mode: "Single-Choice Poll" });
const multiPoll = (n = 3) => ({ choices: choicesOf(n), choice_mode: "Multiple-Choice Poll" });

const event = (email: string, choiceIds: string[], votedAt: Date): ReplayEvent => ({ email, choice_ids: choiceIds, voted_at: votedAt });
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * HOUR);

/** The bar graph's own percentages for a set of current selections. */
function barGraph(poll: { choices: { id: string; label: string; position: number }[]; choice_mode: string }, selections: string[][]) {
  return computeResults({
    choices: poll.choices,
    currentVotes: selections.map((choiceIds, i) => ({ emailAddress: `v${i}@example.com`, userName: "", choiceIds, votedAt: NOW })),
    choiceMode: poll.choice_mode as "Single-Choice Poll" | "Multiple-Choice Poll"
  });
}

const lastPoints = (series: { id: string; points: number[] }[]) =>
  Object.fromEntries(series.map((s) => [s.id, s.points[s.points.length - 1]]));

describe("cumulative replay", () => {
  it("keeps each email's latest selection, so a changed vote never double-counts", () => {
    const poll = singlePoll();
    const events = [
      event("a@example.com", ["c1"], hoursAgo(3)),
      event("a@example.com", ["c2"], hoursAgo(2)),
      event("b@example.com", ["c1"], hoursAgo(1))
    ];
    const buckets = [hoursAgo(2.5).getTime(), hoursAgo(1.5).getTime(), NOW.getTime()];
    const { totalVoted, series } = buildSeries(poll, events, buckets, 0);
    const [c1, c2] = series;
    expect(totalVoted).toBe(2);
    expect(c1!.points).toEqual([100, 0, 50]);
    expect(c2!.points).toEqual([0, 100, 50]);
  });

  it("matches computeResults exactly on a single-choice poll", () => {
    const poll = singlePoll(3);
    const events = [
      event("a@example.com", ["c1"], hoursAgo(5)),
      event("b@example.com", ["c1"], hoursAgo(4)),
      event("c@example.com", ["c2"], hoursAgo(3))
    ];
    const { totalVoted, series } = buildSeries(poll, events, [NOW.getTime()], 0);
    const bars = barGraph(poll, [["c1"], ["c1"], ["c2"]]);
    expect(totalVoted).toBe(bars.totalVoted);
    expect(lastPoints(series)).toEqual(Object.fromEntries(bars.choices.map((c) => [c.id, c.pct])));
  });

  it("matches computeResults exactly on a multiple-choice poll — the denominator is total selections", () => {
    const poll = multiPoll(3);
    const events = [
      event("a@example.com", ["c1", "c2"], hoursAgo(5)),
      event("b@example.com", ["c1"], hoursAgo(4))
    ];
    const { totalVoted, series } = buildSeries(poll, events, [NOW.getTime()], 0);
    const bars = barGraph(poll, [["c1", "c2"], ["c1"]]);
    expect(totalVoted).toBe(bars.totalVoted);
    expect(lastPoints(series)).toEqual(Object.fromEntries(bars.choices.map((c) => [c.id, c.pct])));
    expect(lastPoints(series)).toEqual({ c1: 67, c2: 33, c3: 0 });
  });

  it("drops events whose choice ids no longer exist, while their voter still counts", () => {
    const poll = singlePoll(2);
    const events = [
      event("a@example.com", ["deleted-choice"], hoursAgo(2)),
      event("b@example.com", ["c1"], hoursAgo(1))
    ];
    const { totalVoted, series } = buildSeries(poll, events, [NOW.getTime()], 0);
    const bars = barGraph(poll, [["deleted-choice"], ["c1"]]);
    expect(totalVoted).toBe(bars.totalVoted);
    expect(lastPoints(series)).toEqual(Object.fromEntries(bars.choices.map((c) => [c.id, c.pct])));
  });

  it("counts an anonymized deleted-account voter exactly once, as deleteAccount rewrites vote_history", () => {
    const poll = singlePoll(2);
    const placeholder = `deleted-${randomUUID()}@deleted.invalid`;
    const events = [
      event(placeholder, ["c1"], hoursAgo(3)),
      event(placeholder, ["c2"], hoursAgo(2)),
      event("kept@example.com", ["c1"], hoursAgo(1))
    ];
    const { totalVoted, series } = buildSeries(poll, events, [NOW.getTime()], 0);
    const bars = barGraph(poll, [["c2"], ["c1"]]);
    expect(totalVoted).toBe(2);
    expect(lastPoints(series)).toEqual(Object.fromEntries(bars.choices.map((c) => [c.id, c.pct])));
  });
});

describe("UTC buckets", () => {
  it("aligns hourly buckets to UTC hour boundaries with a final now point", () => {
    const buckets = bucketTimes("1d", hoursAgo(30), NOW);
    expect(buckets[buckets.length - 1]).toBe(NOW.getTime());
    for (const t of buckets.slice(0, -1)) expect(t % HOUR).toBe(0);
    expect(buckets).toEqual([...buckets].sort((a, b) => a - b));
    expect(buckets.length).toBe(25);
    expect(buckets[0]).toBeGreaterThanOrEqual(NOW.getTime() - DAY);
  });

  it("aligns daily buckets to UTC day boundaries with a final now point", () => {
    const buckets = bucketTimes("1m", new Date(NOW.getTime() - 40 * DAY), NOW);
    expect(buckets[buckets.length - 1]).toBe(NOW.getTime());
    for (const t of buckets.slice(0, -1)) expect(t % DAY).toBe(0);
    expect(buckets.length).toBe(32);
  });

  it("starts at the first vote when the poll is younger than the window", () => {
    const first = hoursAgo(2.5); // 13:00Z exactly, so the first boundary is the vote's own hour
    const buckets = bucketTimes("1d", first, NOW);
    expect(buckets[0]).toBe(first.getTime());
    expect(buckets.length).toBe(4);
    const offHour = bucketTimes("1d", new Date(first.getTime() + 60_000), NOW);
    expect(offHour[0]).toBe(first.getTime() + HOUR);
    expect(offHour.length).toBe(3);
  });

  it("yields a single now point when the poll has no votes, or votes inside the current hour only", () => {
    expect(bucketTimes("1d", undefined, NOW)).toEqual([NOW.getTime()]);
    expect(bucketTimes("1d", new Date(NOW.getTime() - 20 * 60_000), NOW)).toEqual([NOW.getTime()]);
  });
});

describe("scale availability", () => {
  it("offers scales by data span: 1d always; 1w at a day; 1m at a week; 1y at a month", () => {
    expect(availableScales(0)).toEqual(["1d"]);
    expect(availableScales(DAY - 1)).toEqual(["1d"]);
    expect(availableScales(DAY)).toEqual(["1d", "1w"]);
    expect(availableScales(7 * DAY - 1)).toEqual(["1d", "1w"]);
    expect(availableScales(7 * DAY)).toEqual(["1d", "1w", "1m"]);
    expect(availableScales(31 * DAY - 1)).toEqual(["1d", "1w", "1m"]);
    expect(availableScales(31 * DAY)).toEqual(["1d", "1w", "1m", "1y"]);
  });
});

describe("threshold filter", () => {
  const poll = singlePoll(3);
  const events = [
    event("a@example.com", ["c1"], hoursAgo(3)),
    event("b@example.com", ["c1"], hoursAgo(2)),
    event("c@example.com", ["c2"], hoursAgo(1))
  ];
  const buckets = [hoursAgo(1.5).getTime(), NOW.getTime()];

  it("draws only choices whose current share exceeds the threshold, judged at the newest point", () => {
    // c2 holds 33% now but 0% at the earlier bucket: current standing decides.
    const { series } = buildSeries(poll, events, buckets, 30);
    expect(series.map((s) => s.id)).toEqual(["c1", "c2"]);
    const { series: strict } = buildSeries(poll, events, buckets, 40);
    expect(strict.map((s) => s.id)).toEqual(["c1"]);
  });

  it("draws a qualifying choice across the whole window, even where it held nothing", () => {
    const { series } = buildSeries(poll, events, buckets, 30);
    expect(series.find((s) => s.id === "c2")!.points).toEqual([0, 33]);
  });

  it("disables the filter at 0: every current choice is drawn, 0% lines included", () => {
    const { series } = buildSeries(poll, events, buckets, 0);
    expect(series.map((s) => s.id)).toEqual(["c1", "c2", "c3"]);
  });

  it("keeps the poll's choice order and carries the manual colour, else null", () => {
    const coloured = {
      choices: [
        { id: "c1", label: "Choice 1", position: 0 },
        { id: "c2", label: "Choice 2", position: 1, color: "#0808FD" }
      ],
      choice_mode: "Single-Choice Poll"
    };
    const { series } = buildSeries(coloured, [event("a@example.com", ["c2"], hoursAgo(1))], [NOW.getTime()], 0);
    expect(series.map((s) => ({ id: s.id, label: s.label, color: s.color }))).toEqual([
      { id: "c1", label: "Choice 1", color: null },
      { id: "c2", label: "Choice 2", color: "#0808FD" }
    ]);
  });
});
