import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearPolls, startTestContext, type TestContext } from "./helpers/setup.js";
import {
  InputError,
  parseTestPoll,
  pickChoices,
  populateTestPoll,
  resolveFile,
  voterEmail
} from "../devScripts/populate/populate-test-poll.js";

const example = JSON.parse(readFileSync(path.join(__dirname, "fixtures", "populate-test-poll.json"), "utf8")) as {
  poll: Record<string, unknown>;
} & Record<string, unknown>;
const bounds = { minChoices: 2, maxChoices: 50 };
const withPoll = (changes: Record<string, unknown>) => ({ ...example, poll: { ...example.poll, ...changes } });

function seeded(seed = 42): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

describe("parseTestPoll", () => {
  it("reads the example file as a private multiple-choice poll that shows who voted", () => {
    const poll = parseTestPoll(example, bounds);
    expect(poll.creatorEmail).toBe("devadmin01@crowdpoll.vote");
    expect(poll.voters).toHaveLength(10);
    expect(poll.title).toBe("Test Poll 01");
    expect(poll.choices).toHaveLength(10);
    expect(poll).toMatchObject({ choiceMode: "Multiple-Choice Poll", pollVisibility: "Private Poll", voteAnonymity: "No" });
  });

  it("keeps a public poll anonymous whatever showVoterChoices says", () => {
    expect(parseTestPoll(withPoll({ visibility: "public" }), bounds).voteAnonymity).toBe("Yes");
    expect(parseTestPoll(withPoll({ showVoterChoices: false }), bounds).voteAnonymity).toBe("Yes");
  });

  it("reads single-choice", () => {
    expect(parseTestPoll(withPoll({ type: "single-choice" }), bounds).choiceMode).toBe("Single-Choice Poll");
  });

  for (const [what, file, message] of [
    ["a creator without @", { ...example, creator: "devadmin012crowdpoll.vote" }, /"creator" must be an email address/],
    ["no voters", { ...example, voters: [] }, /"voters" must be a list/],
    ["a voter name with a space", { ...example, voters: ["test user"] }, /must be 1 to 64 letters/],
    ["a voter listed twice", { ...example, voters: ["a", "A"] }, /listed twice/],
    ["a long title", withPoll({ title: "x".repeat(61) }), /"title" is longer than 60/],
    ["a long subtitle", withPoll({ subtitle: "x".repeat(41) }), /"subtitle" is longer than 40/],
    ["one choice", withPoll({ choices: ["Only"] }), /1 choice\(s\); 2 to 50/],
    ["a repeated choice", withPoll({ choices: ["A", "A"] }), /choice "A" is listed twice/],
    ["a long choice", withPoll({ choices: ["A", "x".repeat(36)] }), /1 to 35 characters/],
    ["an unknown type", withPoll({ type: "ranked" }), /"poll.type"/],
    ["an unknown visibility", withPoll({ visibility: "secret" }), /"poll.visibility"/],
    ["a showVoterChoices that is not a boolean", withPoll({ showVoterChoices: "yes" }), /"poll.showVoterChoices"/]
  ] as const) {
    it(`refuses ${what}`, () => {
      expect(() => parseTestPoll(file, bounds)).toThrow(InputError);
      expect(() => parseTestPoll(file, bounds)).toThrow(message);
    });
  }
});

describe("pickChoices", () => {
  const ids = ["a", "b", "c", "d"];

  it("picks 0 to all choices with about equal chances, never the same choice twice", () => {
    const random = seeded();
    const counts = [0, 0, 0, 0, 0];
    for (let i = 0; i < 5000; i++) {
      const picked = pickChoices(ids, true, random);
      expect(new Set(picked).size).toBe(picked.length);
      picked.forEach((id) => expect(ids).toContain(id));
      counts[picked.length]!++;
    }
    counts.forEach((count) => expect(count).toBeGreaterThan(900));
    counts.forEach((count) => expect(count).toBeLessThan(1100));
  });

  it("votes for one choice about 80% of the time on a single-choice poll", () => {
    const random = seeded(7);
    let voted = 0;
    for (let i = 0; i < 5000; i++) {
      const picked = pickChoices(ids, false, random);
      expect(picked.length).toBeLessThanOrEqual(1);
      voted += picked.length;
    }
    expect(voted / 5000).toBeGreaterThan(0.77);
    expect(voted / 5000).toBeLessThan(0.83);
  });
});

describe("resolveFile", () => {
  it("defaults to test-poll.json beside the script and reads a given path from the folder typed in", () => {
    expect(resolveFile([], "/anywhere")).toBe(path.resolve("devScripts/populate/test-poll.json"));
    expect(resolveFile(["mine.json"], path.resolve("tests"))).toBe(path.resolve("tests/mine.json"));
    expect(() => resolveFile(["a.json", "b.json"], ".")).toThrow(/Usage/);
  });
});

describe("populateTestPoll", () => {
  let ctx: TestContext;
  const creatorEmail = "devadmin01@crowdpoll.vote";
  const run = (random = seeded()) =>
    populateTestPoll({ db: ctx.db, cache: ctx.cache, config: ctx.config }, parseTestPoll(example, ctx.config), {
      random,
      log: () => {}
    });

  beforeAll(async () => {
    ctx = await startTestContext();
    const now = new Date();
    await ctx.db
      .insertInto("user")
      .values({ id: "dev-admin-1", name: "Dev Admin", userName: "Dev Admin", email: creatorEmail, emailVerified: true, createdAt: now, updatedAt: now })
      .execute();
  });
  afterAll(async () => ctx.stop());
  beforeEach(async () => clearPolls(ctx));

  it("creates the voters' accounts and an open private link poll whose votes match the picks", async () => {
    const summary = await run();
    expect(summary.outcome).toBe("created");

    const accounts = await ctx.db.selectFrom("user").select(["email", "name"]).where("email", "like", "%@crowdpolltest.test").execute();
    expect(accounts.map((a) => a.email).sort()).toEqual((example.voters as string[]).map(voterEmail).sort());
    expect(accounts.find((a) => a.email === "testuser01@crowdpolltest.test")!.name).toBe("testuser01");

    const poll = await ctx.db.selectFrom("polls").selectAll().where("id", "=", summary.pollId).executeTakeFirstOrThrow();
    expect(poll).toMatchObject({
      poll_state: "OPEN",
      poll_visibility: "Private Poll",
      poll_sharing_mode: "Anyone With The Link",
      vote_anonymity: "No",
      choice_mode: "Multiple-Choice Poll",
      created_by_id: "dev-admin-1"
    });
    expect(poll.launched_at).not.toBeNull();

    const votes = await ctx.db.selectFrom("votes").select(["user_name", "choice_ids"]).where("poll_id", "=", summary.pollId).execute();
    const voted = summary.picks.filter((pick) => pick.labels.length > 0);
    expect(votes.map((v) => v.user_name).sort()).toEqual(voted.map((pick) => pick.voter).sort());
    const labelOf = new Map(poll.choices.map((c) => [c.id, c.label]));
    for (const vote of votes) {
      expect(vote.choice_ids.map((id) => labelOf.get(id)).sort()).toEqual(
        summary.picks.find((pick) => pick.voter === vote.user_name)!.labels.slice().sort()
      );
    }
    expect(poll.vote_count).toBe(votes.length);

    const linked = await ctx.db.selectFrom("user_polls").select("email").where("poll_id", "=", summary.pollId).where("relation", "=", "linked").execute();
    expect(linked.map((row) => row.email).sort()).toEqual(
      summary.picks.filter((pick) => pick.labels.length === 0).map((pick) => voterEmail(pick.voter)).sort()
    );
  });

  it("reuses the poll and the accounts on a second run, replacing the votes", async () => {
    const first = await run(seeded(1));
    const second = await run(seeded(2));
    expect(second.outcome).toBe("refreshed");
    expect(second.pollId).toBe(first.pollId);
    expect(await ctx.db.selectFrom("polls").select("id").execute()).toHaveLength(1);
    expect(await ctx.db.selectFrom("user").select("id").where("email", "like", "%@crowdpolltest.test").execute()).toHaveLength(10);

    const votes = await ctx.db.selectFrom("votes").select("user_name").where("poll_id", "=", second.pollId).execute();
    expect(votes.map((v) => v.user_name).sort()).toEqual(second.picks.filter((p) => p.labels.length > 0).map((p) => p.voter).sort());
    const linked = await ctx.db.selectFrom("user_polls").select("email").where("poll_id", "=", second.pollId).where("relation", "=", "linked").execute();
    expect(linked).toHaveLength(second.picks.filter((p) => p.labels.length === 0).length);
  });

  it("stops when no account has the creator's address", async () => {
    const file = parseTestPoll({ ...example, creator: "nobody@crowdpoll.vote" }, ctx.config);
    await expect(populateTestPoll({ db: ctx.db, cache: ctx.cache, config: ctx.config }, file, { log: () => {} })).rejects.toThrow(
      /no user with the email n•••@crowdpoll\.vote/
    );
  });
});
