import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDefaultPoll } from "../src/polls/service.js";
import { insertPoll } from "../src/polls/store.js";
import { writeBatch } from "../src/votes/consumer.js";
import { clearPolls, startTestContext, type TestContext } from "./helpers/setup.js";
import {
  InputError,
  parsePollData,
  populatePoll,
  readArguments,
  shiftDates,
  splitByShares,
  voteCountFor,
  voteTimesFor
} from "../devScripts/populate/populate-poll.js";

const fixture = JSON.parse(readFileSync(path.join(__dirname, "fixtures", "populate-poll.json"), "utf8")) as Record<string, unknown>;
const bounds = { minChoices: 2, maxChoices: 50 };

function seeded(seed = 42): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

describe("parsePollData", () => {
  it("reads the fixture: choices in key order, sorted data points, a missing choice as 0", () => {
    const data = parsePollData(fixture, bounds);
    expect(data.creatorEmail).toBe("creator@example.com");
    expect(data.title).toBe("Fixture Approval");
    expect(data.subtitle).toBe("Fixture subtitle");
    expect(data.choices.map((c) => c.label)).toEqual(["Approve", "Disapprove", "Unsure"]);
    expect(data.voteCount).toBe(100);
    expect(data.dataPoints.map((p) => p.date)).toEqual([
      new Date(2026, 9, 1),
      new Date(2026, 9, 3),
      new Date(2026, 9, 5)
    ]);
    expect(data.dataPoints[1]!.percentages).toEqual([40, 50, 0]);
  });

  it("parses an empty subtitle as an empty subtitle", () => {
    expect(parsePollData({ ...fixture, subtitle: "" }, bounds).subtitle).toBe("");
  });

  it("refuses a file with no subtitle, even with a graph_subtitle", () => {
    const without: Record<string, unknown> = { ...fixture, graph_subtitle: "Old key" };
    delete without.subtitle;
    expect(() => parsePollData(without, bounds)).toThrow(/"subtitle" is missing/);
  });

  it("accepts a 30-character subtitle unchanged", () => {
    const value = "x".repeat(30);
    expect(parsePollData({ ...fixture, subtitle: value }, bounds).subtitle).toBe(value);
  });

  it("orders choice keys by length, then alphabetically", () => {
    const data = parsePollData(
      {
        "poll_creator_email": "creator@example.com",
        title: "Order",
        choice_b: "B",
        choice_a: "A",
        choice_aa: "AA",
        choice_z: "Z",
        vote_count: 10,
        data_points: [{ date: "10/01/26", choice_a: 1 }]
      },
      bounds
    );
    expect(data.choices.map((c) => c.key)).toEqual(["choice_a", "choice_b", "choice_z", "choice_aa"]);
  });
});

describe("shiftDates", () => {
  it("moves the latest date to today and keeps the intervals", () => {
    const { dataPoints } = parsePollData(fixture, bounds);
    const moved = shiftDates(dataPoints, new Date(2026, 9, 26, 15, 30));
    expect(moved.map((p) => p.date)).toEqual([new Date(2026, 9, 22), new Date(2026, 9, 24), new Date(2026, 9, 26)]);
    expect(moved.map((p) => p.percentages)).toEqual(dataPoints.map((p) => p.percentages));
  });

  it("lands on local midnights across a daylight-saving change", () => {
    const points = [
      { date: new Date(2026, 0, 10), percentages: [1] },
      { date: new Date(2026, 5, 10), percentages: [1] }
    ];
    const moved = shiftDates(points, new Date(2026, 10, 20, 8));
    expect(moved[1]!.date).toEqual(new Date(2026, 10, 20));
    expect(moved[0]!.date).toEqual(new Date(2026, 5, 22));
    for (const p of moved) expect([p.date.getHours(), p.date.getMinutes()]).toEqual([0, 0]);
  });
});

describe("voteCountFor", () => {
  it("spreads the count by ±15%", () => {
    expect(voteCountFor(100, () => 0)).toBe(85);
    expect(voteCountFor(100, () => 1)).toBe(115);
    expect(voteCountFor(100, () => 0.5)).toBe(100);
  });
});

describe("splitByShares", () => {
  it("scales the percentages to their sum and rounds by largest remainder", () => {
    expect(splitByShares(100, [48, 49, 0])).toEqual([49, 51, 0]);
    expect(splitByShares(7, [1, 1, 1])).toEqual([3, 2, 2]);
  });

  it("always sums to the count", () => {
    const random = seeded(7);
    for (let i = 0; i < 200; i++) {
      const count = Math.floor(random() * 1000);
      const shares = [random() * 60, random() * 40, random() * 5];
      const split = splitByShares(count, shares);
      expect(split.reduce((a, b) => a + b, 0)).toBe(count);
      for (const n of split) expect(n).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("voteTimesFor", () => {
  it("returns times within the day", () => {
    const day = new Date(2026, 9, 22);
    const next = voteTimesFor(day, new Date(2026, 9, 26, 12), seeded());
    for (let i = 0; i < 100; i++) {
      const t = next();
      expect(t >= day && t < new Date(2026, 9, 23)).toBe(true);
    }
  });

  it("never after now when now is within the day", () => {
    const day = new Date(2026, 9, 26);
    const now = new Date(2026, 9, 26, 12);
    const next = voteTimesFor(day, now, seeded());
    for (let i = 0; i < 100; i++) {
      const t = next();
      expect(t >= day && t < now).toBe(true);
    }
  });
});

const SIMULATED = /^test_(\d+)@crowdpolltest\.test$/;
const localDay = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

async function insertCreator(ctx: TestContext): Promise<void> {
  const now = new Date();
  await ctx.db
    .insertInto("user")
    .values({ id: "creator-1", name: "Creator One", userName: "Creator One", email: "creator@example.com", emailVerified: true, createdAt: now, updatedAt: now })
    .execute();
}

function runOptions(now: Date, lines: string[], seed = 42) {
  return { now, random: seeded(seed), log: (line: string) => void lines.push(line) };
}

describe("populatePoll — create", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await startTestContext();
    await insertCreator(ctx);
  });
  afterAll(async () => ctx.stop());
  beforeEach(async () => clearPolls(ctx));

  it("creates one OPEN poll whose votes replay the moved data points", async () => {
    const data = parsePollData(fixture, ctx.config);
    const now = new Date(2026, 9, 26, 12);
    const lines: string[] = [];
    const summary = await populatePoll({ db: ctx.db, cache: ctx.cache, config: ctx.config }, data, runOptions(now, lines));
    expect(summary.outcome).toBe("created");

    const polls = await ctx.db.selectFrom("polls").selectAll().execute();
    expect(polls).toHaveLength(1);
    const poll = polls[0]!;
    expect(poll.title).toBe("Fixture Approval");
    const choices = [...poll.choices].sort((a, b) => a.position - b.position);
    expect(choices.map((c) => [c.label, c.position])).toEqual([["Approve", 0], ["Disapprove", 1], ["Unsure", 2]]);
    expect(poll).toMatchObject({
      poll_state: "OPEN",
      poll_visibility: "Public Poll",
      poll_sharing_mode: "Anyone With The Link",
      vote_anonymity: "Yes",
      choice_mode: "Single-Choice Poll",
      vote_mutability: "Dynamic-Vote Poll",
      voter_count_limit: null,
      keywords: "",
      subtitle: "Fixture subtitle",
      end_at: null,
      created_by_id: "creator-1",
      created_by_name: "Creator One"
    });
    const firstDay = new Date(2026, 9, 22);
    for (const column of [poll.created_at, poll.start_at, poll.launched_at]) expect(new Date(column as Date)).toEqual(firstDay);

    const history = await ctx.db.selectFrom("vote_history").selectAll().where("poll_id", "=", poll.id).execute();
    const days = new Map<string, typeof history>();
    for (const row of history) {
      const at = new Date(row.voted_at);
      expect(at <= now).toBe(true);
      const key = localDay(at);
      days.set(key, [...(days.get(key) ?? []), row]);
    }
    const moved = shiftDates(data.dataPoints, now);
    expect([...days.keys()].sort()).toEqual(moved.map((p) => localDay(p.date)).sort());
    for (const point of moved) {
      const rows = days.get(localDay(point.date))!;
      expect(rows.length).toBeGreaterThanOrEqual(85);
      expect(rows.length).toBeLessThanOrEqual(115);
      const perChoice = choices.map((c) => rows.filter((r) => r.choice_ids[0] === c.id).length);
      expect(perChoice).toEqual(splitByShares(rows.length, point.percentages));
      const numbers = rows.map((r) => Number(SIMULATED.exec(r.email)![1])).sort((a, b) => a - b);
      expect(numbers).toEqual(Array.from({ length: rows.length }, (_, i) => i + 1));
    }

    const votes = await ctx.db.selectFrom("votes").selectAll().where("poll_id", "=", poll.id).execute();
    for (const vote of votes) {
      const n = Number(SIMULATED.exec(vote.email)?.[1]);
      expect(n >= 1 && n <= 115).toBe(true);
      const latest = history
        .filter((r) => r.email === vote.email)
        .reduce((a, b) => (new Date(b.voted_at) > new Date(a.voted_at) ? b : a));
      expect(vote.choice_ids).toEqual(latest.choice_ids);
      expect(new Date(vote.voted_at as Date)).toEqual(new Date(latest.voted_at));
    }
    expect(votes.some((v) => v.choice_ids[0] === choices[2]!.id)).toBe(false);

    const relations = await ctx.db.selectFrom("user_polls").selectAll().where("poll_id", "=", poll.id).execute();
    expect(relations.filter((r) => r.relation === "created").map((r) => r.email)).toEqual(["creator@example.com"]);
    expect(new Set(relations.filter((r) => r.relation === "voted").map((r) => r.email))).toEqual(new Set(votes.map((v) => v.email)));

    const after = await ctx.db.selectFrom("polls").selectAll().where("id", "=", poll.id).executeTakeFirstOrThrow();
    expect(after.vote_count).toBe(votes.length);
    const expected: Record<string, number> = {};
    for (const v of votes) expected[v.choice_ids[0]!] = (expected[v.choice_ids[0]!] ?? 0) + 1;
    expect(after.choice_counts).toEqual(expected);
    expect((await ctx.cache.hgetall(`cnt:${poll.id}`)).total).toBe(String(votes.length));
    expect(await ctx.db.selectFrom("search_outbox").select("poll_id").where("poll_id", "=", poll.id).execute()).not.toHaveLength(0);

    expect(summary.votesWritten).toBe(history.length);
    expect(summary.final.reduce((a, f) => a + f.percent, 0)).toBeCloseTo(100, 0);
  });
});

describe("populatePoll — rerun", () => {
  let ctx: TestContext;
  const deps = () => ({ db: ctx.db, cache: ctx.cache, config: ctx.config });
  const firstNow = new Date(2026, 9, 26, 12);
  const secondNow = new Date(2026, 9, 27, 12);
  beforeAll(async () => {
    ctx = await startTestContext();
    await insertCreator(ctx);
  });
  afterAll(async () => ctx.stop());
  beforeEach(async () => clearPolls(ctx));

  const choicesOf = async (pid: string) =>
    [...(await ctx.db.selectFrom("polls").select("choices").where("id", "=", pid).executeTakeFirstOrThrow()).choices].sort(
      (a, b) => a.position - b.position
    );

  it("keeps the poll id, replaces the simulated votes, keeps real votes and matches choices by label", async () => {
    const first = await populatePoll(deps(), parsePollData(fixture, ctx.config), runOptions(firstNow, []));
    const [approve, disapprove] = await choicesOf(first.pollId);
    await writeBatch(ctx.db, [
      { pid: first.pollId, email: "real@example.com", userName: "Real", choiceIds: [approve!.id], votedAt: new Date(2026, 9, 25, 9), voteMutability: "Dynamic-Vote Poll" }
    ]);

    const lines: string[] = [];
    const second = await populatePoll(
      deps(),
      parsePollData({ ...fixture, choice_b: "Against", subtitle: "Updated subtitle" }, ctx.config),
      runOptions(secondNow, lines, 7)
    );
    expect(second.pollId).toBe(first.pollId);
    expect(second.outcome).toBe("refreshed");
    expect(second.votesDeleted).toBeGreaterThan(0);
    expect(lines).toContain(`[populate] Removed ${second.votesDeleted} earlier test vote(s)`);

    const polls = await ctx.db.selectFrom("polls").selectAll().execute();
    expect(polls).toHaveLength(1);
    expect(polls[0]!.subtitle).toBe("Updated subtitle");
    expect(new Date(polls[0]!.created_at)).toEqual(new Date(2026, 9, 22));
    expect(new Date(polls[0]!.start_at as Date)).toEqual(new Date(2026, 9, 23));
    expect(new Date(polls[0]!.launched_at as Date)).toEqual(new Date(2026, 9, 23));

    const history = await ctx.db.selectFrom("vote_history").selectAll().where("poll_id", "=", first.pollId).execute();
    expect(history.filter((r) => SIMULATED.test(r.email))).toHaveLength(second.votesWritten);
    expect(history.filter((r) => r.email === "real@example.com")).toHaveLength(1);
    const real = await ctx.db.selectFrom("votes").selectAll().where("email", "=", "real@example.com").execute();
    expect(real.map((v) => v.choice_ids)).toEqual([[approve!.id]]);
    expect(
      await ctx.db.selectFrom("user_polls").select("relation").where("email", "=", "real@example.com").execute()
    ).toEqual([{ relation: "voted" }]);

    const choices = await choicesOf(first.pollId);
    expect(choices.map((c) => c.label)).toEqual(["Approve", "Against", "Unsure"]);
    expect(choices[0]!.id).toBe(approve!.id);
    expect(choices[1]!.id).not.toBe(disapprove!.id);
    const votes = await ctx.db.selectFrom("votes").select("choice_ids").where("poll_id", "=", first.pollId).execute();
    expect(votes.some((v) => v.choice_ids.includes(disapprove!.id))).toBe(false);
    const row = await ctx.db.selectFrom("polls").select("vote_count").where("id", "=", first.pollId).executeTakeFirstOrThrow();
    expect(row.vote_count).toBe(votes.length);
  });

  it("clears the subtitle when the data's subtitle is empty", async () => {
    const first = await populatePoll(deps(), parsePollData(fixture, ctx.config), runOptions(firstNow, []));
    await populatePoll(deps(), parsePollData({ ...fixture, subtitle: "" }, ctx.config), runOptions(secondNow, []));
    const row = await ctx.db.selectFrom("polls").select("subtitle").where("id", "=", first.pollId).executeTakeFirstOrThrow();
    expect(row.subtitle).toBe("");
  });

  it("reopens a CLOSED poll with a warning", async () => {
    const first = await populatePoll(deps(), parsePollData(fixture, ctx.config), runOptions(firstNow, []));
    await ctx.db.updateTable("polls").set({ poll_state: "CLOSED", closed_at: new Date() }).where("id", "=", first.pollId).execute();
    const lines: string[] = [];
    await populatePoll(deps(), parsePollData(fixture, ctx.config), runOptions(secondNow, lines));
    const row = await ctx.db.selectFrom("polls").select("poll_state").where("id", "=", first.pollId).executeTakeFirstOrThrow();
    expect(row.poll_state).toBe("OPEN");
    expect(lines).toContain(`[populate] Warning: poll ${first.pollId} was CLOSED; it is OPEN again`);
  });

  it("ends an editing session and reopens the poll", async () => {
    const first = await populatePoll(deps(), parsePollData(fixture, ctx.config), runOptions(firstNow, []));
    await ctx.db
      .updateTable("polls")
      .set({ poll_state: "EDITING", poll_state_before_edit_update: "OPEN", poll_edit_update_client_guid: "tab-1", poll_edit_update_heartbeat_timestamp: new Date() })
      .where("id", "=", first.pollId)
      .execute();
    const lines: string[] = [];
    await populatePoll(deps(), parsePollData(fixture, ctx.config), runOptions(secondNow, lines));
    const row = await ctx.db.selectFrom("polls").selectAll().where("id", "=", first.pollId).executeTakeFirstOrThrow();
    expect(row).toMatchObject({
      poll_state: "OPEN",
      poll_state_before_edit_update: null,
      poll_edit_update_client_guid: null,
      poll_edit_update_heartbeat_timestamp: null
    });
    expect(lines.some((l) => l.startsWith(`[populate] Warning: poll ${first.pollId} was EDITING`))).toBe(true);
  });

  it("uses the newest of several matching polls and warns", async () => {
    const first = await populatePoll(deps(), parsePollData(fixture, ctx.config), runOptions(firstNow, []));
    const newer = createDefaultPoll(new Date(2026, 9, 26, 10));
    newer.title = "Fixture Approval";
    await insertPoll({ db: ctx.db, cache: ctx.cache }, newer, { id: "creator-1", name: "Creator One", email: "creator@example.com" });
    const lines: string[] = [];
    const summary = await populatePoll(deps(), parsePollData(fixture, ctx.config), runOptions(secondNow, lines));
    expect(summary.pollId).toBe(newer._id);
    expect(summary.pollId).not.toBe(first.pollId);
    expect(lines.some((l) => l.startsWith('[populate] Warning: 2 polls match "Fixture Approval"') && l.includes(newer._id))).toBe(true);
  });
});

describe("parsePollData — input errors", () => {
  const valid = () => JSON.parse(JSON.stringify(fixture)) as Record<string, unknown>;
  const withPoints = (points: unknown[]) => ({ ...valid(), data_points: points });
  const cases: [string, Record<string, unknown>, RegExp][] = [
    ["missing creator email", { ...valid(), "poll_creator_email": undefined }, /poll_creator_email/],
    ["empty creator email", { ...valid(), "poll_creator_email": "" }, /poll_creator_email/],
    ["the old poll creator email key", { ...valid(), "poll_creator_email": undefined, "poll creator email": "creator@example.com" }, /"poll_creator_email" is missing or empty/],
    ["missing title", { ...valid(), title: undefined }, /title/],
    ["empty title", { ...valid(), title: "" }, /title/],
    ["a 51-character title", { ...valid(), title: "x".repeat(51) }, /50/],
    ["missing subtitle", { ...valid(), subtitle: undefined }, /"subtitle" is missing/],
    ["a numeric subtitle", { ...valid(), subtitle: 7 }, /"subtitle" must be text/],
    ["a 31-character subtitle", { ...valid(), subtitle: "x".repeat(31) }, /"subtitle" is longer than 30 characters/],
    ["an empty label", { ...valid(), choice_b: "" }, /choice_b/],
    ["a 101-character label", { ...valid(), choice_b: "x".repeat(101) }, /choice_b/],
    ["two equal labels", { ...valid(), choice_c: "Approve" }, /choice_a.*choice_c/],
    ["too few choices", { ...valid(), choice_b: undefined, choice_c: undefined }, /1.*2/],
    ["too many choices", { ...valid(), choice_d: "D" }, /4.*3/],
    ["vote_count 0", { ...valid(), vote_count: 0 }, /vote_count.*0/],
    ["vote_count 2.5", { ...valid(), vote_count: 2.5 }, /2\.5/],
    ["vote_count as a string", { ...valid(), vote_count: "100" }, /"100"/],
    ["missing vote_count", { ...valid(), vote_count: undefined }, /vote_count/],
    ["missing data_points", { ...valid(), data_points: undefined }, /data_points/],
    ["empty data_points", withPoints([]), /data_points/],
    ["an ISO date", withPoints([{ date: "2026-10-01", choice_a: 1 }]), /0.*2026-10-01/],
    ["a non-calendar date", withPoints([{ date: "02/30/25", choice_a: 1 }]), /0.*02\/30\/25/],
    ["a repeated date", withPoints([{ date: "10/01/26", choice_a: 1 }, { date: "10/01/26", choice_a: 2 }]), /10\/01\/26/],
    ["an unknown key", withPoints([{ date: "10/01/26", choice_a: 1, choice_d: 2 }]), /0.*choice_d/],
    ["a string percentage", withPoints([{ date: "10/01/26", choice_a: "40" }]), /0.*choice_a/],
    ["a negative percentage", withPoints([{ date: "10/01/26", choice_a: -1, choice_b: 5 }]), /0.*choice_a/],
    ["percentages adding up to 0", withPoints([{ date: "10/01/26", choice_a: 0 }]), /0.*10\/01\/26/]
  ];
  const present = (json: Record<string, unknown>) => Object.fromEntries(Object.entries(json).filter(([, v]) => v !== undefined));
  for (const [name, json, message] of cases) {
    it(`refuses ${name}`, () => {
      const bounds3 = name === "too many choices" ? { minChoices: 2, maxChoices: 3 } : bounds;
      expect(() => parsePollData(present(json), bounds3)).toThrow(InputError);
      expect(() => parsePollData(present(json), bounds3)).toThrow(message);
    });
  }
});

describe("readArguments", () => {
  it("takes exactly one path", () => {
    expect(readArguments(["a.json"])).toBe("a.json");
    expect(() => readArguments([])).toThrow(/Usage: npx tsx devScripts\/populate\/populate-poll\.ts <poll-data\.json>/);
    expect(() => readArguments(["a.json", "b.json"])).toThrow(InputError);
  });
});

describe("populatePoll — errors and output", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await startTestContext();
    await insertCreator(ctx);
  });
  afterAll(async () => ctx.stop());
  beforeEach(async () => clearPolls(ctx));

  it("refuses an unknown creator without writing anything", async () => {
    const data = parsePollData({ ...fixture, "poll_creator_email": "nobody@example.com" }, ctx.config);
    const lines: string[] = [];
    await expect(
      populatePoll({ db: ctx.db, cache: ctx.cache, config: ctx.config }, data, runOptions(new Date(2026, 9, 26, 12), lines))
    ).rejects.toThrow(/nobody@example\.com/);
    expect(lines).toHaveLength(1);
    expect(await ctx.db.selectFrom("polls").select("id").execute()).toHaveLength(0);
    expect(await ctx.db.selectFrom("votes").select("poll_id").execute()).toHaveLength(0);
    expect(await ctx.db.selectFrom("vote_history").select("poll_id").execute()).toHaveLength(0);
  });

  it("logs the target first, a line per data point and the summary in order", async () => {
    const config = { ...ctx.config, databaseUrl: "postgres://someone:secret@db.example.com:25060/app01" };
    const lines: string[] = [];
    await populatePoll({ db: ctx.db, cache: ctx.cache, config }, parsePollData(fixture, ctx.config), runOptions(new Date(2026, 9, 26, 12), lines));
    expect(lines[0]).toBe("[populate] Target: http://localhost:8080 (database db.example.com:25060)");
    expect(lines.join("\n")).not.toMatch(/someone|secret/);
    expect(lines.slice(1, 4).map((l) => l.slice(0, 22))).toEqual([
      "[populate] 2026-10-22 ",
      "[populate] 2026-10-24 ",
      "[populate] 2026-10-26 "
    ]);
    expect(lines[4]).toMatch(/^\[populate\] Done: poll [0-9a-f-]+ created$/);
    expect(lines[5]).toMatch(/^\[populate\] {3}Votes deleted: 0 {3}Votes written: [\d,]+$/);
    expect(lines.slice(6, 9).map((l) => l.split(":")[0])).toEqual(["[populate]   Approve", "[populate]   Disapprove", "[populate]   Unsure"]);
    expect(lines[9]).toMatch(/^\[populate\] {3}Elapsed: \d+m \d+s$/);
    expect(lines[10]).toMatch(/^\[populate\] Note: no shared cache/);
  });
});
