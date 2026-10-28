import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { startTestContext, forgeSession, type TestContext } from "./helpers/setup.js";
import { polls, publicDetail, publicListing, voteHistory } from "./helpers/poll-fixtures.js";
import { checkViewEligibility } from "../src/polls/service.js";
import { makePoll } from "./helpers/poll-fixtures.js";

const ADMIN_EMAIL = "admin2@example.com";

describe("Restricted-access polls (US7)", () => {
  let ctx: TestContext;
  let adminCookie: string;
  beforeAll(async () => {
    ctx = await startTestContext({ ENV_ADMINS: ADMIN_EMAIL });
    adminCookie = (await forgeSession(ctx, ADMIN_EMAIL)).cookie;
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("blocks a new voter once VoterCountLimit is reached, but not a re-vote (FR-029)", async () => {
    const poll = makePoll({
      pollVisibility: "Private Poll",
      voteMutability: "Dynamic-Vote Poll",
      voterCountLimit: 2,
      currentVotes: [
        { emailAddress: "v1@example.com", userName: "v1", choiceIds: ["c1"], votedAt: new Date()},
        { emailAddress: "v2@example.com", userName: "v2", choiceIds: ["c1"], votedAt: new Date()}
      ]
    });
    await polls(ctx).insertOne(poll);

    const v2 = await forgeSession(ctx, "v2@example.com");
    const revote = await request(ctx.app)
      .post(`/api/polls/${poll._id}/vote`)
      .set("Cookie", v2.cookie)
      .send({ choiceIds: ["c2"] });
    expect(revote.status).toBe(200);

    const v3 = await forgeSession(ctx, "v3@example.com");
    const blocked = await request(ctx.app)
      .post(`/api/polls/${poll._id}/vote`)
      .set("Cookie", v3.cookie)
      .send({ choiceIds: ["c1"] });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error).toMatch(/maximum/i);
  });

  it("does not cap voting when VoterCountLimit is blank/unlimited", async () => {
    const poll = makePoll({
      pollVisibility: "Private Poll",
      voteMutability: "Dynamic-Vote Poll",
      voterCountLimit: null,
      currentVotes: [
        { emailAddress: "v1@example.com", userName: "v1", choiceIds: ["c1"], votedAt: new Date()}
      ]
    });
    await polls(ctx).insertOne(poll);

    const v4 = await forgeSession(ctx, "v4@example.com");
    const res = await request(ctx.app)
      .post(`/api/polls/${poll._id}/vote`)
      .set("Cookie", v4.cookie)
      .send({ choiceIds: ["c1"] });
    expect(res.status).toBe(200);
  });

  it("hides results from a guest on a private-mode poll (FR-017)", async () => {
    const poll = makePoll({ pollVisibility: "Private Poll" });
    await polls(ctx).insertOne(poll);
    expect(checkViewEligibility(poll, undefined)?.status).toBe(403);
    expect(await publicDetail(ctx, poll._id)).toBeNull();
  });

  it("rejects a non-invited signed-in user on PRIVATE_POLL_INVITATION_ONLY (FR-030)", async () => {
    const poll = makePoll({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: ["invited@example.com"] });
    await polls(ctx).insertOne(poll);
    expect(checkViewEligibility(poll, "notinvited@example.com")?.status).toBe(403);
  });

  it("allows an invited signed-in user to view and vote (FR-030)", async () => {
    const poll = makePoll({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: ["invited2@example.com"] });
    await polls(ctx).insertOne(poll);
    const { cookie } = await forgeSession(ctx, "invited2@example.com");
    expect(checkViewEligibility(poll, "invited2@example.com")).toBeNull();
    const vote = await request(ctx.app)
      .post(`/api/polls/${poll._id}/vote`)
      .set("Cookie", cookie)
      .send({ choiceIds: ["c1"] });
    expect(vote.status).toBe(200);
  });

  // 012 FR-059: invitations save with the poll. The pre-seeded vote record and the
  // no-duplicates rule both survive — a repeated address is simply collapsed rather
  // than rejected, because the list arrives as a whole rather than one address at a time.
  it("an invitation pre-seeds an empty vote record, and duplicates collapse (FR-031/057)", async () => {
    const poll = makePoll({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" });
    await polls(ctx).insertOne(poll);
    const add = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", adminCookie)
      .send({ invitedVoterList: ["new@example.com", "NEW@example.com "] });
    expect(add.status).toBe(200);

    const detail = await request(ctx.app).get(`/api/admin/polls/${poll._id}`).set("Cookie", adminCookie);
    expect(detail.body.invitedVoterList).toEqual(["new@example.com"]);
    const stored = await polls(ctx).findOne({ _id: poll._id });
    expect(stored?.currentVotes).toEqual([
      { emailAddress: "new@example.com", userName: "", choiceIds: [], votedAt: null }
    ]);
  });

  it("private-mode polls never appear in the public listing (FR-033)", async () => {
    const poll = makePoll({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" });
    await polls(ctx).insertOne(poll);
    expect(await publicListing(ctx)).not.toContain(poll._id);
  });
});

describe("Participants, bans, and exports (US8)", () => {
  let ctx: TestContext;
  let adminCookie: string;
  beforeAll(async () => {
    ctx = await startTestContext({ ENV_ADMINS: ADMIN_EMAIL });
    adminCookie = (await forgeSession(ctx, ADMIN_EMAIL)).cookie;
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("GET results shows voted (with choices) and not-yet-voted (invitation-only), excluding banned (FR-054)", async () => {
    const poll = makePoll({
      pollVisibility: "Private Poll", pollSharingMode: "Invitation Only",
      invitedVoterList: ["voted@example.com", "pending@example.com", "banned@example.com"],
      bannedVoterList: ["banned@example.com"],
      currentVotes: [
        { emailAddress: "voted@example.com", userName: "voted", choiceIds: ["c1"], votedAt: new Date()},
        { emailAddress: "pending@example.com", userName: "pending", choiceIds: [], votedAt: null}
      ]
    });
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app).get(`/api/admin/polls/${poll._id}/results`).set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    const votedEmails = res.body.voted.map((v: { emailAddress: string }) => v.emailAddress);
    expect(votedEmails).toEqual(["voted@example.com"]);
    const notYetEmails = res.body.notYetVoted.map((v: { emailAddress: string }) => v.emailAddress);
    expect(notYetEmails).toEqual(["pending@example.com"]);
    expect(votedEmails).not.toContain("banned@example.com");
    expect(notYetEmails).not.toContain("banned@example.com");
  });

  it("carries notYetVoted only when the poll is private AND Invitation Only", async () => {
    const cases = [
      { settings: { pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" }, present: true },
      { settings: { pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link" }, present: false },
      { settings: { pollVisibility: "Public Poll", pollSharingMode: "Invitation Only" }, present: false }
    ] as const;
    for (const { settings, present } of cases) {
      const poll = makePoll({
        ...settings,
        invitedVoterList: ["pending@example.com"],
        currentVotes: [{ emailAddress: "pending@example.com", userName: "", choiceIds: [], votedAt: null }]
      });
      await polls(ctx).insertOne(poll);
      const res = await request(ctx.app).get(`/api/admin/polls/${poll._id}/results`).set("Cookie", adminCookie);
      expect(res.status).toBe(200);
      expect("notYetVoted" in res.body, JSON.stringify(settings)).toBe(present);
    }
  });

  it("returns identical results whatever voteAnonymity says — nothing reads it yet", async () => {
    const votes = [
      { emailAddress: "a@example.com", userName: "A", choiceIds: ["c1"], votedAt: new Date(0) },
      { emailAddress: "b@example.com", userName: "B", choiceIds: ["c2"], votedAt: new Date(0) }
    ];
    const shared = {
      pollVisibility: "Private Poll" as const,
      pollSharingMode: "Invitation Only" as const,
      invitedVoterList: ["a@example.com", "b@example.com", "c@example.com"],
      currentVotes: votes
    };
    const anonymous = makePoll({ ...shared, voteAnonymity: "Yes" });
    const named = makePoll({ ...shared, voteAnonymity: "No" });
    await polls(ctx).insertMany([anonymous, named]);
    const strip = (body: Record<string, unknown>) => {
      const { pid: _pid, ...rest } = body;
      return rest;
    };
    const resA = await request(ctx.app).get(`/api/admin/polls/${anonymous._id}/results`).set("Cookie", adminCookie);
    const resB = await request(ctx.app).get(`/api/admin/polls/${named._id}/results`).set("Cookie", adminCookie);
    expect(resA.status).toBe(200);
    expect(strip(resA.body)).toEqual(strip(resB.body));
  });

  it("removing a participant drops their vote and bans them; banned address rejected on vote (FR-050/051)", async () => {
    const poll = makePoll({
      currentVotes: [
        { emailAddress: "target@example.com", userName: "target", choiceIds: ["c1"], votedAt: new Date()}
      ]
    });
    await polls(ctx).insertOne(poll);
    const removeRes = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", adminCookie)
      .send({ bannedVoterList: ["target@example.com"] });
    expect(removeRes.status).toBe(200);

    const detail = await request(ctx.app).get(`/api/admin/polls/${poll._id}`).set("Cookie", adminCookie);
    expect(detail.body.bannedVoterList).toContain("target@example.com");
    // FIX020: the removed vote no longer lists the poll in the participant's personal tab.
    const relations = await ctx.db.selectFrom("user_polls").select("relation").where("poll_id", "=", poll._id).where("email", "=", "target@example.com").execute();
    expect(relations.map((r) => r.relation)).not.toContain("voted");

    const { cookie: targetCookie } = await forgeSession(ctx, "target@example.com");
    const voteRes = await request(ctx.app)
      .post(`/api/polls/${poll._id}/vote`)
      .set("Cookie", targetCookie)
      .send({ choiceIds: ["c1"] });
    expect(voteRes.status).toBe(403);
  });

  it("un-banning removes from BannedVoterList without restoring the vote (FR-052)", async () => {
    const poll = makePoll({ bannedVoterList: ["banned2@example.com"] });
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", adminCookie)
      .send({ bannedVoterList: [] });
    expect(res.status).toBe(200);
    const detail = await request(ctx.app).get(`/api/admin/polls/${poll._id}`).set("Cookie", adminCookie);
    expect(detail.body.bannedVoterList).not.toContain("banned2@example.com");
  });

  it("exports every stored choice and vote (011: no removed markers to exclude)", async () => {
    const poll = makePoll({
      choices: [
        { id: "c1", label: "Choice 1", position: 0},
        { id: "c2", label: "Choice 2", position: 1}
      ],
      currentVotes: [
        { emailAddress: "a@example.com", userName: "a", choiceIds: ["c2"], votedAt: new Date()}
      ]
    });
    await polls(ctx).insertOne(poll);

    const json = await request(ctx.app).get(`/api/admin/polls/${poll._id}/export.json`).set("Cookie", adminCookie);
    expect(json.status).toBe(200);
    expect(json.body.choices.map((c: { label: string }) => c.label)).toEqual(["Choice 1", "Choice 2"]);

    const md = await request(ctx.app).get(`/api/admin/polls/${poll._id}/export.md`).set("Cookie", adminCookie);
    expect(md.status).toBe(200);
    expect(md.text).toContain("Choice 1");
    expect(md.text).toContain("Choice 2");
  });
});

/**
 * 012 US1 (FR-017..FR-023): the invite and ban defects. Opening a poll's editing
 * page sets `pollState = EDITING`, and the three participant routes used to refuse
 * every request from that same page. These assert the lock-aware behaviour that
 * replaces it.
 */
describe("Participant changes save with the poll, not on click (012 US1/US10)", () => {
  let ctx: TestContext;
  let adminCookie: string;
  const GUID = "tab-holding-the-lock";

  beforeAll(async () => {
    ctx = await startTestContext({ ENV_ADMINS: ADMIN_EMAIL });
    adminCookie = (await forgeSession(ctx, ADMIN_EMAIL)).cookie;
  });
  afterAll(async () => {
    await ctx.stop();
  });

  /** A poll already locked by GUID, as the editing page leaves it on load. */
  async function lockedPoll(overrides = {}) {
    const poll = makePoll({
      pollState: "EDITING",
      pollStateBeforeEditUpdate: "OPEN",
      pollEditUpdateClientGUID: GUID,
      pollEditUpdateHeartbeatTimestamp: new Date(),
      ...overrides
    });
    await polls(ctx).insertOne(poll);
    return poll;
  }

  const save = (pid: string, body: Record<string, unknown>) =>
    request(ctx.app)
      .post(`/api/admin/polls/${pid}/publish`)
      .set("Cookie", adminCookie)
      .send({ clientGuid: GUID, ...body });

  it("adds an invited participant on save (FR-059)", async () => {
    const poll = await lockedPoll({
      pollVisibility: "Private Poll", pollSharingMode: "Invitation Only",
      invitedVoterList: ["already@example.com"]
    });
    const res = await save(poll._id, {
      invitedVoterList: ["already@example.com", "invitee@example.com"]
    });
    expect(res.status).toBe(200);
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.invitedVoterList).toEqual(["already@example.com", "invitee@example.com"]);
    // An invitation-only poll seeds a not-yet-voted placeholder for each invitee.
    expect(after?.currentVotes.map((v) => v.emailAddress).sort()).toEqual([
      "already@example.com",
      "invitee@example.com"
    ]);
  });

  it("bans on save: the address leaves the participant and invited lists, and its vote goes (FR-017a)", async () => {
    const poll = await lockedPoll({
      pollVisibility: "Private Poll", pollSharingMode: "Invitation Only",
      invitedVoterList: ["banned@example.com", "kept@example.com"],
      currentVotes: [
        { emailAddress: "banned@example.com", userName: "B", choiceIds: ["c1"], votedAt: new Date() },
        { emailAddress: "kept@example.com", userName: "K", choiceIds: ["c2"], votedAt: new Date() }
      ]
    });
    const res = await save(poll._id, {
      invitedVoterList: ["kept@example.com"],
      bannedVoterList: ["banned@example.com"]
    });
    expect(res.status).toBe(200);
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.invitedVoterList).toEqual(["kept@example.com"]);
    expect(after?.bannedVoterList).toEqual(["banned@example.com"]);
    expect(after?.currentVotes.map((v) => v.emailAddress)).toEqual(["kept@example.com"]);
  });

  it("un-bans on save, restoring neither the invitation nor the vote (FR-017a)", async () => {
    const poll = await lockedPoll({
      pollVisibility: "Private Poll", pollSharingMode: "Invitation Only",
      invitedVoterList: [],
      bannedVoterList: ["exiled@example.com"],
      currentVotes: []
    });
    const res = await save(poll._id, { bannedVoterList: [] });
    expect(res.status).toBe(200);
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.bannedVoterList).toEqual([]);
    expect(after?.invitedVoterList).toEqual([]);
    expect(after?.currentVotes).toEqual([]);
  });

  it("**nothing is written until the save** — this is what makes Cancel work (FR-060)", async () => {
    // The defect this replaces: the three participant routes wrote on click, so a ban
    // took effect before the administrator saved, Save and Publish stayed disabled
    // because nothing was pending, and Cancel could not undo it.
    const poll = await lockedPoll({
      currentVotes: [
        { emailAddress: "victim@example.com", userName: "V", choiceIds: ["c1"], votedAt: new Date() }
      ]
    });
    // Abandon the session the way Cancel does, without ever publishing.
    await request(ctx.app)
      .delete(`/api/admin/polls/${poll._id}/edit-session`)
      .set("Cookie", adminCookie)
      .send({ clientGuid: GUID });

    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.bannedVoterList).toEqual([]);
    expect(after?.currentVotes).toHaveLength(1);
  });

  it("bans on a poll that has votes, from the update surface (FR-019)", async () => {
    const poll = await lockedPoll({
      currentVotes: [
        { emailAddress: "hasvoted@example.com", userName: "H", choiceIds: ["c1"], votedAt: new Date() }
      ]
    });
    await voteHistory(ctx).insertOne({
      pid: poll._id,
      emailAddress: "hasvoted@example.com",
      userName: "H",
      choiceIds: ["c1"],
      votedAt: new Date()
    });
    const res = await save(poll._id, { bannedVoterList: ["hasvoted@example.com"] });
    expect(res.status).toBe(200);
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.currentVotes).toHaveLength(0);
  });

  it("refuses a stale page session that no longer holds the lock (FR-018)", async () => {
    const poll = await lockedPoll();
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", adminCookie)
      .send({ clientGuid: "a-different-tab", bannedVoterList: ["x@example.com"] });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/being edited/i);
    expect((await polls(ctx).findOne({ _id: poll._id }))!.bannedVoterList).toEqual([]);
  });

  it("rejects an invalid address, saving nothing at all (FR-013)", async () => {
    const poll = await lockedPoll({
      pollVisibility: "Private Poll", pollSharingMode: "Invitation Only",
      title: "Original title"
    });
    const res = await save(poll._id, {
      title: "A new title",
      invitedVoterList: ["not-an-email"]
    });
    expect(res.status).toBe(400);
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.title).toBe("Original title");
    expect(after?.invitedVoterList).toEqual([]);
  });

  it("the three per-action routes are gone", async () => {
    const poll = await lockedPoll();
    const gone = await Promise.all([
      request(ctx.app).post(`/api/admin/polls/${poll._id}/invited`).set("Cookie", adminCookie).send({}),
      request(ctx.app).delete(`/api/admin/polls/${poll._id}/participants/x@example.com`).set("Cookie", adminCookie).send({}),
      request(ctx.app).delete(`/api/admin/polls/${poll._id}/banned/x@example.com`).set("Cookie", adminCookie).send({})
    ]);
    for (const res of gone) expect(res.status).toBe(404);
  });

});

/**
 * 014 FR-034/FR-035: a roster longer than the display ceiling is withheld rather
 * than truncated, and the counts beside it stay true. The ceiling is the same
 * setting that limits a private poll's voters, so only a public poll can reach it.
 */
describe("Roster display ceiling (014 FR-034, FR-035, FR-044a)", () => {
  let ctx: TestContext;
  let adminCookie: string;
  const LIMIT = 5;

  beforeAll(async () => {
    ctx = await startTestContext({
      ENV_ADMINS: ADMIN_EMAIL,
      ENV_PRIVATE_VOTER_LIMIT_DEFAULT: String(LIMIT)
    });
    adminCookie = (await forgeSession(ctx, ADMIN_EMAIL)).cookie;
  });
  afterAll(async () => {
    await ctx.stop();
  });

  function voters(count: number) {
    return Array.from({ length: count }, (_unused, i) => ({
      emailAddress: `voter${i}@example.com`,
      userName: `Voter ${i}`,
      choiceIds: ["c1"],
      votedAt: new Date()
    }));
  }

  async function resultsFor(count: number) {
    const poll = makePoll({ currentVotes: voters(count) });
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app)
      .get(`/api/admin/polls/${poll._id}/results`)
      .set("Cookie", adminCookie);
    return { poll, res };
  }

  it("returns the whole roster at the ceiling", async () => {
    const { res } = await resultsFor(LIMIT);
    expect(res.status).toBe(200);
    expect(res.body.voted).toHaveLength(LIMIT);
  });

  it("returns the whole roster one below the ceiling", async () => {
    const { res } = await resultsFor(LIMIT - 1);
    expect(res.body.voted).toHaveLength(LIMIT - 1);
  });

  it("withholds the roster one above the ceiling, keeping the aggregate true", async () => {
    const { res } = await resultsFor(LIMIT + 1);
    expect(res.body.voted).toEqual([]);
    // totalVoted is computed from the poll, never from the array above it.
    expect(res.body.totalVoted).toBe(LIMIT + 1);
    expect(res.body.choices.reduce((sum: number, c: { count: number }) => sum + c.count, 0)).toBe(LIMIT + 1);
  });

  it("keeps the card's three counts accurate when a roster is withheld", async () => {
    const poll = makePoll({ currentVotes: voters(LIMIT + 3), bannedVoterList: ["b@example.com"] });
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app).get("/api/admin/polls").set("Cookie", adminCookie);
    const row = res.body.polls.find((p: { pid: string }) => p.pid === poll._id);
    expect(row.voteCount).toBe(LIMIT + 3);
    expect(row.bannedVoterCount).toBe(1);
  });

  it("withholds an over-sized invited list from the edit-session response", async () => {
    const invited = Array.from({ length: LIMIT + 1 }, (_u, i) => `inv${i}@example.com`);
    const poll = makePoll({
      pollState: "INITIALIZED",
      pollVisibility: "Private Poll", pollSharingMode: "Invitation Only",
      invitedVoterList: invited
    });
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/edit-session`)
      .set("Cookie", adminCookie)
      .send({ clientGuid: "ceiling-guard" });
    expect(res.status).toBe(200);
    expect(res.body.poll.invitedVoterList).toEqual([]);
  });

  it("exempts the JSON export, which exists to hand over what the screen withholds", async () => {
    const poll = makePoll({ currentVotes: voters(LIMIT + 2) });
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app)
      .get(`/api/admin/polls/${poll._id}/export.json`)
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.participants).toHaveLength(LIMIT + 2);
  });
});
