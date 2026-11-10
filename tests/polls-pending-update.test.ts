/**
 * EDITING-POLL-AVAILABLE US2 — the choice merge on an ever-voted poll and the
 * approved deletion's apply: votes rewritten, tally rebuilt, counters reconciled,
 * the emptied voter free to vote again.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { startTestContext, forgeSession, type TestContext } from "./helpers/setup.js";
import { makePoll, polls, voteHistory } from "./helpers/poll-fixtures.js";
import { pollsAwaitingApprovalSweep } from "../src/polls/sweeps.js";
import { computeResults, mergeChoices } from "../src/polls/service.js";
import { readLiveCounts } from "../src/polls/counters.js";
import { readProjection } from "../src/polls/versions.js";

const DEPS = { maxAttempts: 10, callTimeoutMs: 10_000 };
const BOUNDS = { minChoices: 2, maxChoices: 5 };

describe("mergeChoices (R3)", () => {
  const stored = () =>
    makePoll({
      choices: [
        { id: "a", label: "Tea", position: 0 },
        { id: "b", label: "Coffee", position: 1 }
      ]
    });

  it("keeps a survivor's id, label and position by exact trimmed-label match", () => {
    const { choices, deletedIds } = mergeChoices(stored(), ["  Tea  ", "Coffee"], BOUNDS);
    expect(choices).toEqual([
      { id: "a", label: "Tea", position: 0 },
      { id: "b", label: "Coffee", position: 1 }
    ]);
    expect(deletedIds).toEqual([]);
  });

  it("appends an addition with a minted id and the next position", () => {
    const { choices, deletedIds } = mergeChoices(stored(), ["Tea", "Coffee", "Milk"], BOUNDS);
    expect(deletedIds).toEqual([]);
    expect(choices.slice(0, 2).map((c) => c.id)).toEqual(["a", "b"]);
    const added = choices[2]!;
    expect(added.label).toBe("Milk");
    expect(added.position).toBe(2);
    expect(["a", "b"]).not.toContain(added.id);
  });

  it("treats a rename as a deletion plus an addition", () => {
    const { choices, deletedIds } = mergeChoices(stored(), ["Tea", "Cocoa"], BOUNDS);
    expect(deletedIds).toEqual(["b"]);
    const added = choices.find((c) => c.label === "Cocoa")!;
    expect(["a", "b"]).not.toContain(added.id);
    expect(added.position).toBe(2);
  });

  it("keeps a stored label over 35 characters by its text, and refuses it once changed", () => {
    const long = "L".repeat(72);
    const withLong = () =>
      makePoll({ choices: [{ id: "a", label: long, position: 0 }, { id: "b", label: "Coffee", position: 1 }] });
    const { choices, deletedIds } = mergeChoices(withLong(), [long, "Coffee", "Milk"], BOUNDS);
    expect(deletedIds).toEqual([]);
    expect(choices[0]).toEqual({ id: "a", label: long, position: 0 });
    expect(() => mergeChoices(withLong(), [long + "!", "Coffee"], BOUNDS)).toThrowError(/at most 35/);
  });

  it("refuses too few, too many, over-long and duplicate labels", () => {
    expect(() => mergeChoices(stored(), ["Tea"], BOUNDS)).toThrowError(/between 2 and 5/);
    expect(() => mergeChoices(stored(), ["1", "2", "3", "4", "5", "6"], BOUNDS)).toThrowError(/between 2 and 5/);
    expect(() => mergeChoices(stored(), ["Tea", "x".repeat(36)], BOUNDS)).toThrowError(/at most 35/);
    expect(() => mergeChoices(stored(), ["Tea", " Tea "], BOUNDS)).toThrowError(/unique/);
  });
});

describe("Applying a pending choice deletion (R4)", () => {
  let ctx: TestContext;
  let cookie: string;
  beforeAll(async () => {
    ctx = await startTestContext();
    ({ cookie } = await forgeSession(ctx, ctx.config.admins[0]!));
  });
  afterAll(async () => {
    await ctx.stop();
  });
  beforeEach(async () => {
    await polls(ctx).deleteMany({});
    await voteHistory(ctx).deleteMany({});
    for (const key of await ctx.cache.scan("cnt:*")) await ctx.cache.del(key);
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
  });

  const publish = (pid: string, body: Record<string, unknown> = {}) =>
    request(ctx.app).post(`/api/admin/polls/${pid}/publish`).set("Cookie", cookie).send(body);
  const reload = async (pid: string) => (await polls(ctx).findOne({ _id: pid }))!;

  const CHOICES = [
    { id: "a", label: "Tea", position: 0 },
    { id: "b", label: "Coffee", position: 1 },
    { id: "c", label: "Milk", position: 2 }
  ];

  /** A Final-Vote poll where two voters chose Tea and one chose Coffee. */
  async function votedPoll() {
    const when = new Date();
    const poll = makePoll({
      pollState: "OPEN",
      title: "Drinks",
      voteMutability: "Final-Vote Poll",
      voterCountLimit: null,
      choices: CHOICES,
      currentVotes: [
        { emailAddress: "v1@example.com", userName: "v1", choiceIds: ["a"], votedAt: when },
        { emailAddress: "v2@example.com", userName: "v2", choiceIds: ["b"], votedAt: when },
        { emailAddress: "v3@example.com", userName: "v3", choiceIds: ["a"], votedAt: when }
      ]
    });
    await polls(ctx).insertOne(poll);
    for (const v of ["v1", "v2", "v3"]) {
      await voteHistory(ctx).insertOne({
        pid: poll._id,
        emailAddress: `${v}@example.com`,
        userName: v,
        choiceIds: v === "v2" ? ["b"] : ["a"],
        votedAt: when
      });
    }
    return poll;
  }

  it("stores the merged list as pending and leaves the votes alone until approval", async () => {
    const poll = await votedPoll();
    const res = await publish(poll._id, { labels: ["Coffee", "Milk"] });
    expect(res.status).toBe(200);
    expect(res.body.pending).toBe(true);

    const after = await reload(poll._id);
    expect(after.choices.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(after.pendingUpdate!.choices!.map((c) => ({ id: c.id, label: c.label }))).toEqual([
      { id: "b", label: "Coffee" },
      { id: "c", label: "Milk" }
    ]);
    expect(after.currentVotes.find((v) => v.emailAddress === "v1@example.com")!.choiceIds).toEqual(["a"]);
  });

  it("applies the deletion: votes rewritten, history kept, tally rebuilt, counters reconciled", async () => {
    const poll = await votedPoll();
    await publish(poll._id, { labels: ["Coffee", "Milk"] });
    expect(await pollsAwaitingApprovalSweep(ctx, DEPS)).toBe(1);

    const after = await reload(poll._id);
    expect(after.pendingUpdate).toBeNull();
    expect(after.choices.map((c) => c.label)).toEqual(["Coffee", "Milk"]);

    // The emptied voters read as "not voted"; the kept vote is untouched.
    const votesOf = Object.fromEntries(after.currentVotes.map((v) => [v.emailAddress, v.choiceIds]));
    expect(votesOf["v1@example.com"]).toEqual([]);
    expect(votesOf["v3@example.com"]).toEqual([]);
    expect(votesOf["v2@example.com"]).toEqual(["b"]);

    // The append-only history keeps the deleted ids.
    expect(await voteHistory(ctx).countDocuments({ pid: poll._id })).toBe(3);

    // The line-graph records were rebuilt inside the apply.
    const selections = await ctx.db
      .selectFrom("line_graph_selection").selectAll().where("poll_id", "=", poll._id).execute();
    expect(selections).toHaveLength(3);
    const tally = await ctx.db
      .selectFrom("line_graph_tally").selectAll().where("poll_id", "=", poll._id).execute();
    expect(tally.length).toBeGreaterThan(0);

    // The live counters were reconciled from the rewritten votes.
    const counts = (await readLiveCounts(ctx.cache, [poll._id])).get(poll._id)!;
    expect(counts.voteCount).toBe(1);
    expect(counts.choiceCounts.b).toBe(1);
    expect(counts.choiceCounts.a ?? 0).toBe(0);

    // Single-choice percentages still sum to 100 over the survivors.
    const results = computeResults(after);
    expect(results.totalVoted).toBe(1);
    expect(results.choices.reduce((sum, c) => sum + c.pct, 0)).toBe(100);
  });

  it("refuses a vote naming a deleted choice with a fresh-pick message, and an empty vote as before (T035)", async () => {
    const poll = await votedPoll();
    await publish(poll._id, { labels: ["Coffee", "Milk"] });
    await pollsAwaitingApprovalSweep(ctx, DEPS);

    const voter = await forgeSession(ctx, "stale-card@example.com");
    const stale = await request(ctx.app)
      .post(`/api/polls/${poll._id}/vote`)
      .set("Cookie", voter.cookie)
      .set("X-Forwarded-For", "10.8.1.1")
      .send({ choiceIds: ["a"] });
    expect(stale.status).toBe(400);
    expect(stale.body.error).toBe("That choice is no longer available — please choose again.");

    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    const empty = await request(ctx.app)
      .post(`/api/polls/${poll._id}/vote`)
      .set("Cookie", voter.cookie)
      .set("X-Forwarded-For", "10.8.1.2")
      .send({ choiceIds: [] });
    expect(empty.status).toBe(400);
    expect(empty.body.error).toBe("Select at least one choice.");
  });

  it("lets an emptied voter vote again, even on a Final-Vote poll", async () => {
    const poll = await votedPoll();
    await publish(poll._id, { labels: ["Coffee", "Milk"] });
    await pollsAwaitingApprovalSweep(ctx, DEPS);

    const emptied = await forgeSession(ctx, "v1@example.com");
    const revote = await request(ctx.app)
      .post(`/api/polls/${poll._id}/vote`)
      .set("Cookie", emptied.cookie)
      .set("X-Forwarded-For", "10.8.0.1")
      .send({ choiceIds: ["b"] });
    expect(revote.status).toBe(200);

    // A voter whose choice survived is still bound by Final-Vote.
    const bound = await forgeSession(ctx, "v2@example.com");
    const again = await request(ctx.app)
      .post(`/api/polls/${poll._id}/vote`)
      .set("Cookie", bound.cookie)
      .set("X-Forwarded-For", "10.8.0.2")
      .send({ choiceIds: ["c"] });
    expect(again.status).toBe(409);
    expect(again.body.error).toMatch(/already voted/);
  });

  it("applies a zero-vote deletion without rewriting any vote", async () => {
    const poll = await votedPoll();
    await publish(poll._id, { labels: ["Tea", "Coffee"] }); // Milk ("c") has no votes
    await pollsAwaitingApprovalSweep(ctx, DEPS);

    const after = await reload(poll._id);
    expect(after.choices.map((c) => c.id)).toEqual(["a", "b"]);
    const votesOf = Object.fromEntries(after.currentVotes.map((v) => [v.emailAddress, v.choiceIds]));
    expect(votesOf["v1@example.com"]).toEqual(["a"]);
    expect(votesOf["v2@example.com"]).toEqual(["b"]);
  });

  it("refuses a merge outside the configured bounds through the route too", async () => {
    const poll = await votedPoll();
    const res = await publish(poll._id, { labels: ["Tea"] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/between/);
    expect((await reload(poll._id)).pendingUpdate).toBeNull();
  });

  describe("Sharing mode on an ever-voted Private poll (US3)", () => {
    const when = new Date();

    /** A Private, ever-voted poll where v1 voted Tea; inv@ holds an invitation and has not voted. */
    async function privateVotedPoll(sharingMode: "Anyone With The Link" | "Invitation Only" = "Anyone With The Link") {
      const poll = makePoll({
        // The shared-link reader behind GET /api/me/polls/:pid accepts UUID ids only.
        _id: crypto.randomUUID(),
        pollState: "OPEN",
        title: "Team lunch",
        pollVisibility: "Private Poll",
        pollSharingMode: sharingMode,
        voteMutability: "Dynamic-Vote Poll",
        voterCountLimit: null,
        choices: [
          { id: "a", label: "Tea", position: 0 },
          { id: "b", label: "Coffee", position: 1 }
        ],
        invitedVoterList: ["inv@example.com"],
        currentVotes: [
          { emailAddress: "pv1@example.com", userName: "pv1", choiceIds: ["a"], votedAt: when },
          ...(sharingMode === "Invitation Only"
            ? [{ emailAddress: "inv@example.com", userName: "", choiceIds: [], votedAt: null }]
            : [])
        ]
      });
      await polls(ctx).insertOne(poll);
      await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "pv1@example.com", userName: "pv1", choiceIds: ["a"], votedAt: when });
      return poll;
    }

    it("accepts the switch both ways, applied at save with no state change and no pending update", async () => {
      const poll = await privateVotedPoll();
      const toInvite = await publish(poll._id, { pollSharingMode: "Invitation Only" });
      expect(toInvite.status).toBe(200);
      expect(toInvite.body.pending).toBe(false);
      let after = await reload(poll._id);
      expect(after.pollSharingMode).toBe("Invitation Only");
      expect(after.pollState).toBe("OPEN");
      expect(after.pendingUpdate).toBeNull();

      const back = await publish(poll._id, { pollSharingMode: "Anyone With The Link" });
      expect(back.status).toBe(200);
      after = await reload(poll._id);
      expect(after.pollSharingMode).toBe("Anyone With The Link");
      expect(after.pollState).toBe("OPEN");
    });

    it("keeps an uninvited past voter's vote counted while refusing their vote and view, until an invitation restores them", async () => {
      const poll = await privateVotedPoll();
      await publish(poll._id, { pollSharingMode: "Invitation Only" });

      // The vote still counts in the results.
      const after = await reload(poll._id);
      expect(after.currentVotes.find((v) => v.emailAddress === "pv1@example.com")!.choiceIds).toEqual(["a"]);
      expect(computeResults(after).totalVoted).toBe(1);

      // But the uninvited voter can neither see the poll nor vote in it.
      const voter = await forgeSession(ctx, "pv1@example.com");
      const view = await request(ctx.app).get(`/api/me/polls/${poll._id}`).set("Cookie", voter.cookie);
      expect(view.status).toBe(404);
      const vote = await request(ctx.app)
        .post(`/api/polls/${poll._id}/vote`)
        .set("Cookie", voter.cookie)
        .set("X-Forwarded-For", "10.9.0.1")
        .send({ choiceIds: ["b"] });
      expect(vote.status).toBe(403);
      expect(vote.body.error).toMatch(/not invited/);

      // Inviting the voter restores access; their kept vote survives the roster save.
      const invite = await publish(poll._id, { invitedVoterList: ["inv@example.com", "pv1@example.com"] });
      expect(invite.status).toBe(200);
      const restored = await reload(poll._id);
      expect(restored.currentVotes.find((v) => v.emailAddress === "pv1@example.com")!.choiceIds).toEqual(["a"]);
      const viewBack = await request(ctx.app).get(`/api/me/polls/${poll._id}`).set("Cookie", voter.cookie);
      expect(viewBack.status).toBe(200);
      for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
      const voteBack = await request(ctx.app)
        .post(`/api/polls/${poll._id}/vote`)
        .set("Cookie", voter.cookie)
        .set("X-Forwarded-For", "10.9.0.2")
        .send({ choiceIds: ["b"] });
      expect(voteBack.status).toBe(200);
    });

    it("still refuses visibility, anonymity and a public poll's sharing mode with 409", async () => {
      const poll = await privateVotedPoll();
      expect((await publish(poll._id, { pollVisibility: "Public Poll" })).status).toBe(409);
      expect((await publish(poll._id, { voteAnonymity: "No" })).status).toBe(409);

      const publicPoll = await votedPoll();
      expect((await publish(publicPoll._id, { pollSharingMode: "Invitation Only" })).status).toBe(409);
    });

    it("the switch alone rewrites no vote and leaves the invitation records untouched", async () => {
      const poll = await privateVotedPoll("Invitation Only");
      const accepted = new Date("2026-10-01T12:00:00Z");
      await ctx.db
        .updateTable("poll_invitations")
        .set({ sent_at: when, accepted_at: accepted })
        .where("poll_id", "=", poll._id)
        .execute();
      const rowsBefore = await ctx.db
        .selectFrom("poll_invitations").selectAll().where("poll_id", "=", poll._id).orderBy("email").execute();
      const votesBefore = (await reload(poll._id)).currentVotes;

      const res = await publish(poll._id, { pollSharingMode: "Anyone With The Link" });
      expect(res.status).toBe(200);

      const after = await reload(poll._id);
      expect(after.pollSharingMode).toBe("Anyone With The Link");
      expect(after.currentVotes).toEqual(votesBefore);
      const rowsAfter = await ctx.db
        .selectFrom("poll_invitations").selectAll().where("poll_id", "=", poll._id).orderBy("email").execute();
      expect(rowsAfter).toEqual(rowsBefore);
    });
  });

  describe("Choice mode on an ever-voted poll (US4)", () => {
    it("accepts Single → Multiple applied at save, after which a multi-choice vote counts", async () => {
      const poll = await votedPoll();
      const res = await publish(poll._id, { choiceMode: "Multiple-Choice Poll" });
      expect(res.status).toBe(200);
      expect(res.body.pending).toBe(false);

      const after = await reload(poll._id);
      expect(after.choiceMode).toBe("Multiple-Choice Poll");
      expect(after.pollState).toBe("OPEN");
      expect(after.pendingUpdate).toBeNull();
      expect(after.currentVotes).toEqual(poll.currentVotes);

      const voter = await forgeSession(ctx, "mc1@example.com");
      const vote = await request(ctx.app)
        .post(`/api/polls/${poll._id}/vote`)
        .set("Cookie", voter.cookie)
        .set("X-Forwarded-For", "10.9.1.1")
        .send({ choiceIds: ["b", "c"] });
      expect(vote.status).toBe(200);
      await ctx.consumer.runOnce();
      expect((await reload(poll._id)).currentVotes.find((v) => v.emailAddress === "mc1@example.com")!.choiceIds).toEqual(["b", "c"]);
    });

    it("refuses Multiple → Single with 409", async () => {
      const poll = await votedPoll();
      await polls(ctx).updateOne({ _id: poll._id }, { $set: { choiceMode: "Multiple-Choice Poll" } });
      const res = await publish(poll._id, { choiceMode: "Single-Choice Poll" });
      expect(res.status).toBe(409);
      expect((await reload(poll._id)).choiceMode).toBe("Multiple-Choice Poll");
    });
  });

  describe("Vote mutability on an ever-voted poll (US5)", () => {
    const when = new Date();

    async function mutableVotedPoll(voteMutability: "Dynamic-Vote Poll" | "Final-Vote Poll", voter: string) {
      const poll = makePoll({
        pollState: "OPEN",
        title: "Mutability",
        voteMutability,
        voterCountLimit: null,
        currentVotes: [{ emailAddress: voter, userName: voter.split("@")[0]!, choiceIds: ["c1"], votedAt: when }]
      });
      await polls(ctx).insertOne(poll);
      await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: voter, userName: voter.split("@")[0]!, choiceIds: ["c1"], votedAt: when });
      return poll;
    }

    it("switches Dynamic → Final at save, binding an existing voter at once", async () => {
      const poll = await mutableVotedPoll("Dynamic-Vote Poll", "mv1@example.com");
      const res = await publish(poll._id, { voteMutability: "Final-Vote Poll" });
      expect(res.status).toBe(200);
      expect(res.body.pending).toBe(false);

      const after = await reload(poll._id);
      expect(after.voteMutability).toBe("Final-Vote Poll");
      expect(after.pollState).toBe("OPEN");
      expect(after.pendingUpdate).toBeNull();

      const voter = await forgeSession(ctx, "mv1@example.com");
      const revote = await request(ctx.app)
        .post(`/api/polls/${poll._id}/vote`)
        .set("Cookie", voter.cookie)
        .set("X-Forwarded-For", "10.9.2.1")
        .send({ choiceIds: ["c2"] });
      expect(revote.status).toBe(409);
      expect(revote.body.error).toMatch(/already voted/);
    });

    it("switches Final → Dynamic at save, freeing a past voter to change their vote", async () => {
      const poll = await mutableVotedPoll("Final-Vote Poll", "mv2@example.com");
      const res = await publish(poll._id, { voteMutability: "Dynamic-Vote Poll" });
      expect(res.status).toBe(200);

      const after = await reload(poll._id);
      expect(after.voteMutability).toBe("Dynamic-Vote Poll");

      const voter = await forgeSession(ctx, "mv2@example.com");
      const changed = await request(ctx.app)
        .post(`/api/polls/${poll._id}/vote`)
        .set("Cookie", voter.cookie)
        .set("X-Forwarded-For", "10.9.2.2")
        .send({ choiceIds: ["c2"] });
      expect(changed.status).toBe(200);
      await ctx.consumer.runOnce();
      expect((await reload(poll._id)).currentVotes.find((v) => v.emailAddress === "mv2@example.com")!.choiceIds).toEqual(["c2"]);
    });
  });
});

describe("votersAddChoices through /publish (USER-ADD-CHOICES A5)", () => {
  let ctx: TestContext;
  let cookie: string;
  beforeAll(async () => {
    ctx = await startTestContext();
    ({ cookie } = await forgeSession(ctx, ctx.config.admins[0]!));
  });
  afterAll(async () => {
    await ctx.stop();
  });
  beforeEach(async () => {
    await polls(ctx).deleteMany({});
    await voteHistory(ctx).deleteMany({});
  });

  const publish = (pid: string, body: Record<string, unknown>) =>
    request(ctx.app).post(`/api/admin/polls/${pid}/publish`).set("Cookie", cookie).send(body);
  const row = (pid: string) =>
    ctx.db.selectFrom("polls").select(["voters_add_choices", "content_version", "pending_update"]).where("id", "=", pid).executeTakeFirstOrThrow();

  async function voted(overrides: Parameters<typeof makePoll>[0] = {}) {
    const poll = makePoll({ pollState: "OPEN", pollVisibility: "Private Poll", ...overrides });
    await polls(ctx).insertOne(poll);
    await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "v@example.com", userName: "v", choiceIds: ["c1"], votedAt: new Date() });
    return poll;
  }

  it("saves on a voted Private poll at once, with no review, and bumps content_version", async () => {
    const poll = await voted();
    const before = await row(poll._id);
    const res = await publish(poll._id, { votersAddChoices: true });
    expect(res.status).toBe(200);
    const after = await row(poll._id);
    expect(after.voters_add_choices).toBe(true);
    expect(after.pending_update).toBeNull();
    expect(Number(after.content_version)).toBeGreaterThan(Number(before.content_version));
  });

  it("refuses true on a Public poll, and a value that is not true or false", async () => {
    const pub = await voted({ pollVisibility: "Public Poll" });
    const refused = await publish(pub._id, { votersAddChoices: true });
    expect(refused.status).toBe(400);
    expect(refused.body.error).toBe("Only a private poll can let voters add choices.");
    const priv = await voted();
    const bad = await publish(priv._id, { votersAddChoices: "yes" });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe("votersAddChoices must be true or false.");
    expect((await row(priv._id)).voters_add_choices).toBe(false);
  });
});

describe("notes on an ever-voted poll", () => {
  let ctx: TestContext;
  let cookie: string;
  beforeAll(async () => {
    ctx = await startTestContext();
    ({ cookie } = await forgeSession(ctx, ctx.config.admins[0]!));
  });
  afterAll(async () => {
    await ctx.stop();
  });
  beforeEach(async () => {
    await polls(ctx).deleteMany({});
    await voteHistory(ctx).deleteMany({});
  });

  const row = (pid: string) =>
    ctx.db.selectFrom("polls").select(["notes", "content_version", "pending_update"]).where("id", "=", pid).executeTakeFirstOrThrow();

  it("waits in the pending update with the old preview served, and applying it bumps content_version", async () => {
    const poll = makePoll({ pollState: "OPEN", notes: "**Old** notes", voterCountLimit: null } as never);
    await polls(ctx).insertOne(poll);
    await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "v@example.com", userName: "v", choiceIds: ["c1"], votedAt: new Date() });
    const before = await row(poll._id);

    const res = await request(ctx.app).post(`/api/admin/polls/${poll._id}/publish`).set("Cookie", cookie).send({ notes: "**New** notes" });
    expect(res.status).toBe(200);
    expect(res.body.pending).toBe(true);
    const pending = await row(poll._id);
    expect(pending.notes).toBe("**Old** notes");
    expect(pending.pending_update).toEqual({ notes: "**New** notes" });
    expect(Number(pending.content_version)).toBe(Number(before.content_version));
    expect((await readProjection(ctx.cache, ctx.db, poll._id))!.notesPreviewHtml).toBe("<strong>Old</strong> notes");

    expect(await pollsAwaitingApprovalSweep(ctx, DEPS)).toBe(1);
    const applied = await row(poll._id);
    expect(applied.notes).toBe("**New** notes");
    expect(applied.pending_update).toBeNull();
    expect(Number(applied.content_version)).toBeGreaterThan(Number(before.content_version));
    expect((await readProjection(ctx.cache, ctx.db, poll._id))!.notesPreviewHtml).toBe("<strong>New</strong> notes");
  });
});
