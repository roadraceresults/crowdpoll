import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { startTestContext, forgeSession, type TestContext } from "./helpers/setup.js";
import { polls, voteHistory } from "./helpers/poll-fixtures.js";
import { POLL_VISIBILITIES } from "../src/polls/store.js";
import { makePoll } from "./helpers/poll-fixtures.js";
import { effectiveVoterLimit } from "../src/polls/service.js";

const ADMIN_EMAIL = "admin@example.com";

describe("Admin poll CRUD (US4)", () => {
  let ctx: TestContext;
  let adminCookieValue: string;
  async function adminCookie() {
    return adminCookieValue;
  }
  beforeAll(async () => {
    ctx = await startTestContext({ ENV_ADMINS: ADMIN_EMAIL });
    adminCookieValue = (await forgeSession(ctx, ADMIN_EMAIL)).cookie;
  });
  afterAll(async () => {
    await ctx.stop();
  });

  async function forgeWithPermissions(email: string, permissions?: string[]) {
    const forged = await forgeSession(ctx, email);
    if (permissions) {
      await ctx.db.updateTable("user").set({ permissions }).where("id", "=", forged.userId).execute();
    }
    return forged;
  }

  async function ownedBy(userId: string, overrides: Parameters<typeof makePoll>[0] = {}) {
    const poll = makePoll(overrides);
    await polls(ctx).insertOne(poll);
    await ctx.db.updateTable("polls").set({ created_by_id: userId }).where("id", "=", poll._id).execute();
    return poll;
  }

  it("refuses a guest and a signed-in user without both Create Poll and View Polls, and scopes a creator to their own polls", async () => {
    const guestRes = await request(ctx.app).get("/api/admin/polls");
    expect([401, 403]).toContain(guestRes.status);

    const noGrants = await forgeWithPermissions("nogrants@example.com", []);
    expect((await request(ctx.app).get("/api/admin/polls").set("Cookie", noGrants.cookie)).status).toBe(403);

    const createOnly = await forgeWithPermissions("createonly@example.com", ["Create Poll"]);
    expect((await request(ctx.app).get("/api/admin/polls").set("Cookie", createOnly.cookie)).status).toBe(403);
    expect((await request(ctx.app).post("/api/admin/polls").set("Cookie", createOnly.cookie)).status).toBe(403);

    const creator = await forgeWithPermissions("scoped-creator@example.com");
    const mine = await ownedBy(creator.userId, { title: "Scoped mine", pollState: "REJECTED" });
    await polls(ctx).insertOne(makePoll({ title: "Scoped someone else's" }));
    const res = await request(ctx.app).get("/api/admin/polls").set("Cookie", creator.cookie);
    expect(res.status).toBe(200);
    expect(res.body.polls.map((p: { pid: string }) => p.pid)).toEqual([mine._id]);
    expect(res.body.polls[0].canRescreen).toBe(false);
  });

  it("names the creator on each admin row, with their email address, and leaves both empty for a poll with no recorded creator", async () => {
    const creator = await forgeWithPermissions("row-creator@example.com");
    const created = await request(ctx.app).post("/api/admin/polls").set("Cookie", creator.cookie);
    const unowned = makePoll({ title: "No creator recorded" });
    await polls(ctx).insertOne(unowned);
    const user = await ctx.db.selectFrom("user").select("userName").where("id", "=", creator.userId).executeTakeFirstOrThrow();
    type Row = { pid: string; createdByName: string; createdByEmail: string };
    const expected = { createdByName: user.userName ?? "", createdByEmail: "row-creator@example.com" };

    const listed = await request(ctx.app).get("/api/admin/polls").set("Cookie", await adminCookie());
    expect(listed.body.polls.find((p: Row) => p.pid === created.body.pid)).toMatchObject(expected);
    expect(listed.body.polls.find((p: Row) => p.pid === unowned._id)).toMatchObject({ createdByName: "", createdByEmail: "" });

    const searched = await request(ctx.app).get("/api/admin/polls/search?state=INITIALIZED").set("Cookie", await adminCookie());
    expect(searched.body.polls.find((p: Row) => p.pid === created.body.pid)).toMatchObject(expected);
  });

  it("says on each admin row whether the poll is the caller's own", async () => {
    const creator = await forgeWithPermissions("own-flag@example.com");
    const created = await request(ctx.app).post("/api/admin/polls").set("Cookie", creator.cookie);
    type Row = { pid: string; ownPoll: boolean };
    const own = await request(ctx.app).get("/api/admin/polls").set("Cookie", creator.cookie);
    expect(own.body.polls.find((p: Row) => p.pid === created.body.pid).ownPoll).toBe(true);
    const listed = await request(ctx.app).get("/api/admin/polls").set("Cookie", await adminCookie());
    expect(listed.body.polls.find((p: Row) => p.pid === created.body.pid).ownPoll).toBe(false);
    const searched = await request(ctx.app).get("/api/admin/polls/search?state=INITIALIZED").set("Cookie", await adminCookie());
    expect(searched.body.polls.find((p: Row) => p.pid === created.body.pid).ownPoll).toBe(false);
  });

  it("lets a creator create, publish, open, close, archive, duplicate, delete and export their own polls", async () => {
    const creator = await forgeWithPermissions("own-crud@example.com");
    const cookie = creator.cookie;

    const created = await request(ctx.app).post("/api/admin/polls").set("Cookie", cookie);
    expect(created.status).toBe(201);
    const listed = await request(ctx.app).get("/api/admin/polls").set("Cookie", cookie);
    expect(listed.body.polls.map((p: { pid: string }) => p.pid)).toContain(created.body.pid);

    const draft = await ownedBy(creator.userId, { pollState: "INITIALIZED" });
    const published = await request(ctx.app)
      .post(`/api/admin/polls/${draft._id}/publish`)
      .set("Cookie", cookie)
      .send({ title: "Creator renamed" });
    expect(published.status).toBe(200);
    expect(published.body.title).toBe("Creator renamed");
    expect((await request(ctx.app).delete(`/api/admin/polls/${draft._id}`).set("Cookie", cookie)).status).toBe(204);

    const live = await ownedBy(creator.userId);
    const closed = await request(ctx.app).patch(`/api/admin/polls/${live._id}`).set("Cookie", cookie).send({ pollState: "CLOSED" });
    expect(closed.status).toBe(200);
    const archived = await request(ctx.app).patch(`/api/admin/polls/${live._id}`).set("Cookie", cookie).send({ pollState: "ARCHIVED" });
    expect(archived.body.pollState).toBe("ARCHIVED");

    for (const path of ["", "/results", "/export.json", "/export.md"]) {
      expect((await request(ctx.app).get(`/api/admin/polls/${live._id}${path}`).set("Cookie", cookie)).status).toBe(200);
    }
    const dup = await request(ctx.app).post(`/api/admin/polls/${live._id}/duplicate`).set("Cookie", cookie);
    expect(dup.status).toBe(201);
    const copyOwner = await ctx.db.selectFrom("polls").select("created_by_id").where("id", "=", dup.body.pid).executeTakeFirst();
    expect(copyOwner?.created_by_id).toBe(creator.userId);
  });

  it("answers 404 on every per-poll route for another user's poll, and keeps search and rescreen for administrators", async () => {
    const creator = await forgeWithPermissions("nosy-creator@example.com");
    const other = await forgeWithPermissions("other-creator@example.com");
    const theirs = await ownedBy(other.userId, { pollState: "REJECTED" });
    const mine = await ownedBy(creator.userId, { pollState: "REJECTED" });
    const cookie = creator.cookie;
    const base = `/api/admin/polls/${theirs._id}`;

    const attempts = [
      request(ctx.app).get(base),
      request(ctx.app).patch(base).send({ pollState: "CLOSED" }),
      request(ctx.app).delete(base),
      request(ctx.app).post(`${base}/edit-session`).send({ clientGuid: "g" }),
      request(ctx.app).post(`${base}/edit-session/heartbeat`).send({ clientGuid: "g" }),
      request(ctx.app).delete(`${base}/edit-session`).send({ clientGuid: "g" }),
      request(ctx.app).post(`${base}/publish`).send({ title: "x" }),
      request(ctx.app).post(`${base}/save`).send({ title: "x" }),
      request(ctx.app).post(`${base}/duplicate`),
      request(ctx.app).get(`${base}/results`),
      request(ctx.app).get(`${base}/export.json`),
      request(ctx.app).get(`${base}/export.md`)
    ];
    for (const attempt of attempts) {
      const res = await attempt.set("Cookie", cookie);
      expect(res.status).toBe(404);
    }

    expect((await request(ctx.app).get("/api/admin/polls/search").set("Cookie", cookie)).status).toBe(403);
    expect((await request(ctx.app).post(`/api/admin/polls/${mine._id}/rescreen`).set("Cookie", cookie)).status).toBe(403);
  });

  it("caps a creator's own list and flags the cut-off", async () => {
    const capped = await startTestContext({ ENV_ADMINS: ADMIN_EMAIL, ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS: "2" });
    try {
      const creator = await forgeSession(capped, "capped-creator@example.com");
      const own = [1, 2, 3].map((n) => makePoll({ title: `Own ${n}`, createdAt: new Date(2025, 0, n) }));
      await polls(capped).insertMany([...own, makePoll({ title: "Not mine", createdAt: new Date(2025, 0, 9) })]);
      await capped.db
        .updateTable("polls")
        .set({ created_by_id: creator.userId })
        .where("id", "in", own.map((p) => p._id))
        .execute();
      const res = await request(capped.app).get("/api/admin/polls").set("Cookie", creator.cookie);
      expect(res.body.polls.map((p: { title: string }) => p.title)).toEqual(["Own 3", "Own 2"]);
      expect(res.body.truncated).toBe(true);
    } finally {
      await capped.stop();
    }
  });

  it("POST /api/admin/polls creates a poll with the documented defaults (FR-036 AC1)", async () => {
    const cookie = await adminCookie();
    const created = await request(ctx.app).post("/api/admin/polls").set("Cookie", cookie);
    expect(created.status).toBe(201);
    const detail = await request(ctx.app).get(`/api/admin/polls/${created.body.pid}`).set("Cookie", cookie);
    expect(detail.body.title).toMatch(/^New Poll \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(detail.body.subtitle).toBe("");
    expect(detail.body.choiceMode).toBe("Single-Choice Poll");
    expect(detail.body.voteMutability).toBe("Dynamic-Vote Poll");
    expect(detail.body.pollVisibility).toBe("Public Poll");
    expect(detail.body.pollSharingMode).toBe("Anyone With The Link");
    expect(detail.body.voteAnonymity).toBe("Yes");
    expect(detail.body.pollState).toBe("INITIALIZED");
    expect(detail.body.startAt).toBeNull();
    expect(detail.body.endAt).toBeNull();
    expect(detail.body.choices.map((c: { label: string }) => c.label)).toEqual(["Choice 1", "Choice 2"]);
  });

  it("GET /api/admin/polls lists sorted by createdAt descending (FR-037)", async () => {
    const cookie = await adminCookie();
    const older = makePoll({ title: "Older", createdAt: new Date("2020-01-01") });
    const newer = makePoll({ title: "Newer", createdAt: new Date("2025-01-01") });
    await polls(ctx).insertMany([older, newer]);
    const res = await request(ctx.app).get("/api/admin/polls").set("Cookie", cookie);
    const titles = res.body.polls.map((p: { title: string }) => p.title);
    expect(titles.indexOf("Newer")).toBeLessThan(titles.indexOf("Older"));
  });

  it("GET /api/admin/polls shows the newest polls up to the admin cap with a cut-off flag (FIX009)", async () => {
    const capped = await startTestContext({ ENV_ADMINS: ADMIN_EMAIL, ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS: "3" });
    try {
      const { cookie } = await forgeSession(capped, ADMIN_EMAIL);
      await polls(capped).insertMany(
        [1, 2, 3, 4, 5].map((n) => makePoll({ title: `Poll ${n}`, createdAt: new Date(2025, 0, n) }))
      );
      const res = await request(capped.app).get("/api/admin/polls").set("Cookie", cookie);
      expect(res.status).toBe(200);
      expect(res.body.polls.map((p: { title: string }) => p.title)).toEqual(["Poll 5", "Poll 4", "Poll 3"]);
      expect(res.body.truncated).toBe(true);
      await polls(capped).deleteMany({});
      await polls(capped).insertOne(makePoll({ title: "Only one" }));
      const few = await request(capped.app).get("/api/admin/polls").set("Cookie", cookie);
      expect(few.body.polls).toHaveLength(1);
      expect(few.body.truncated).toBe(false);
    } finally {
      await capped.stop();
    }
  });

  it("GET /api/admin/polls carries the settings a read-only card renders", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({
      title: "Settings carrier",
      choiceMode: "Multiple-Choice Poll",
      voteMutability: "Dynamic-Vote Poll",
      pollVisibility: "Private Poll",
      voterCountLimit: 42,
      choices: [
        { id: "x1", label: "Alpha", position: 0 },
        { id: "x2", label: "Beta", position: 1 }
      ]
    });
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app).get("/api/admin/polls").set("Cookie", cookie);
    const row = res.body.polls.find((p: { pid: string }) => p.pid === poll._id);
    expect(row.choiceMode).toBe("Multiple-Choice Poll");
    expect(row.voteMutability).toBe("Dynamic-Vote Poll");
    expect(row.voterCountLimit).toBe(42);
    expect(row.choices.map((c: { label: string }) => c.label)).toEqual(["Alpha", "Beta"]);
  });

  it("GET /api/admin/polls counts only participants who actually voted", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({
      title: "Counts carrier",
      pollVisibility: "Private Poll", pollSharingMode: "Invitation Only",
      invitedVoterList: ["a@example.com", "b@example.com", "c@example.com"],
      bannedVoterList: ["z@example.com"],
      currentVotes: [
        { emailAddress: "a@example.com", userName: "A", choiceIds: ["c1"], votedAt: new Date() },
        { emailAddress: "b@example.com", userName: "B", choiceIds: [], votedAt: null }
      ]
    });
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app).get("/api/admin/polls").set("Cookie", cookie);
    const row = res.body.polls.find((p: { pid: string }) => p.pid === poll._id);
    // b@ holds a participant record with no choices - an unused invitation, not a vote.
    expect(row.voteCount).toBe(1);
    expect(row.invitationCount).toBe(3);
    expect(row.bannedVoterCount).toBe(1);
  });

  it("GET /api/admin/polls withholds the rosters themselves", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({
      invitedVoterList: ["secret@example.com"],
      bannedVoterList: ["banned@example.com"]
    });
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app).get("/api/admin/polls").set("Cookie", cookie);
    const row = res.body.polls.find((p: { pid: string }) => p.pid === poll._id);
    expect(row.invitedVoterList).toBeUndefined();
    expect(row.bannedVoterList).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain("secret@example.com");
  });

  it("PATCH title/subtitle saves the field and rejects a title over 50 or a subtitle over 30 characters (FR-002/003, FIX07)", async () => {
    const cookie = await adminCookie();
    // Unpublished, so each publish holds it back (starter choices) and it stays editable.
    const poll = makePoll({ pollState: "INITIALIZED" });
    await polls(ctx).insertOne(poll);
    const ok = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ title: "Renamed" });
    expect(ok.status).toBe(200);
    expect(ok.body.title).toBe("Renamed");

    const tooLong = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ title: "x".repeat(51) });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error).toContain("at most 50");

    const atLimit = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ title: "x".repeat(50), subtitle: "s".repeat(30) });
    expect(atLimit.status).toBe(200);
    expect(atLimit.body.subtitle).toBe("s".repeat(30));

    const subtitleTooLong = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ subtitle: "s".repeat(31) });
    expect(subtitleTooLong.status).toBe(400);
    expect(subtitleTooLong.body.error).toContain("at most 30");
  });

  it("012: publish carries the choice list — replaces the active list with fresh ids in save order (FR-001/002/006)", async () => {
    const cookie = await adminCookie();
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ labels: ["  Coffee  ", "", "Tea", "Juice"] });
    expect(res.status).toBe(200);
    expect(res.body.choices.map((c: { label: string }) => c.label)).toEqual(["Coffee", "Tea", "Juice"]);
    expect(res.body.choices.map((c: { position: number }) => c.position)).toEqual([0, 1, 2]);
    expect(res.body.choices.every((c: { id: string }) => !["c1", "c2"].includes(c.id))).toBe(true);
  });

  it("012: publish carries the choice list — rejects fewer than 2 or more than 50 non-blank labels (FR-004)", async () => {
    const cookie = await adminCookie();
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const tooFew = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ labels: ["Only one"] });
    expect(tooFew.status).toBe(400);
    const tooMany = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ labels: Array.from({ length: 51 }, (_, i) => `Choice ${i}`) });
    expect(tooMany.status).toBe(400);
  });

  it("012: publish carries the choice list — rejects a label over 100 characters and duplicate labels after trimming (FR-004/005)", async () => {
    const cookie = await adminCookie();
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const tooLong = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ labels: ["A", "x".repeat(101)] });
    expect(tooLong.status).toBe(400);
    const dup = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ labels: ["Same", " Same "] });
    expect(dup.status).toBe(409);
  });

  it("012: publish carries the choice list — 404s an unknown PID", async () => {
    const cookie = await adminCookie();
    const res = await request(ctx.app)
      .post("/api/admin/polls/does-not-exist/publish")
      .set("Cookie", cookie)
      .send({ labels: ["A", "B"] });
    expect(res.status).toBe(404);
  });

  it("012: publish carries the choice list — replaces the list wholesale for a poll that has never been voted on (011 FR-010)", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({
      choices: [
        { id: "c1", label: "Choice 1", position: 0},
        { id: "c2", label: "Choice 2", position: 1}
      ]
    });
    await polls(ctx).insertOne(poll);

    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ labels: ["Tea", "Coffee", "Juice"] });
    expect(res.status).toBe(200);

    const detail = await request(ctx.app).get(`/api/admin/polls/${poll._id}`).set("Cookie", cookie);
    expect(detail.body.choices.map((c: { label: string }) => c.label)).toEqual(["Tea", "Coffee", "Juice"]);
    // No tombstone of the previous list survives.
    expect(detail.body.choices).toHaveLength(3);
  });

  it("duplicates a poll with a new PID, no votes, and starts it INITIALIZED (FR-044; 011)", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({
      title: "Original",
      choices: [
        { id: "c1", label: "Choice 1", position: 0},
        { id: "c2", label: "Choice 2", position: 1},
        { id: "c3", label: "Choice 3", position: 2}
      ],
      currentVotes: [
        { emailAddress: "voter@example.com", userName: "voter", choiceIds: ["c2"], votedAt: new Date()}
      ],
      startAt: new Date("2026-01-01"),
      pollState: "CLOSED"
    });
    await polls(ctx).insertOne(poll);
    const dup = await request(ctx.app).post(`/api/admin/polls/${poll._id}/duplicate`).set("Cookie", cookie);
    expect(dup.status).toBe(201);
    expect(dup.body.pid).not.toBe(poll._id);

    const detail = await request(ctx.app).get(`/api/admin/polls/${dup.body.pid}`).set("Cookie", cookie);
    expect(detail.body.title).toBe("Original Copy");
    expect(detail.body.choices.map((c: { label: string }) => c.label)).toEqual([
      "Choice 1",
      "Choice 2",
      "Choice 3"
    ]);
    // The copy carries the source's wording, so it must be screened before it can
    // reach the public — it starts at the beginning of the lifecycle.
    expect(detail.body.pollState).toBe("INITIALIZED");
    expect(detail.body.startAt).toBeNull();
  });

  it("gives repeated duplicates of the same poll unique, incrementing titles (FR-001/002)", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({ title: "Customer Satisfaction" });
    await polls(ctx).insertOne(poll);

    const first = await request(ctx.app).post(`/api/admin/polls/${poll._id}/duplicate`).set("Cookie", cookie);
    const firstDetail = await request(ctx.app).get(`/api/admin/polls/${first.body.pid}`).set("Cookie", cookie);
    expect(firstDetail.body.title).toBe("Customer Satisfaction Copy");

    const second = await request(ctx.app).post(`/api/admin/polls/${poll._id}/duplicate`).set("Cookie", cookie);
    const secondDetail = await request(ctx.app).get(`/api/admin/polls/${second.body.pid}`).set("Cookie", cookie);
    expect(secondDetail.body.title).toBe("Customer Satisfaction Copy 1");

    const third = await request(ctx.app).post(`/api/admin/polls/${poll._id}/duplicate`).set("Cookie", cookie);
    const thirdDetail = await request(ctx.app).get(`/api/admin/polls/${third.body.pid}`).set("Cookie", cookie);
    expect(thirdDetail.body.title).toBe("Customer Satisfaction Copy 2");
  });

  it("counts archived and closed polls' titles toward the duplicate-title collision check (FR-003, US2 AC4)", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({ title: "Quarterly Review" });
    const archivedCopy = makePoll({ title: "Quarterly Review Copy", pollState: "ARCHIVED" });
    const closedCopy = makePoll({ title: "Quarterly Review Copy 1", pollState: "CLOSED" });
    await polls(ctx).insertMany([poll, archivedCopy, closedCopy]);

    const dup = await request(ctx.app).post(`/api/admin/polls/${poll._id}/duplicate`).set("Cookie", cookie);
    const detail = await request(ctx.app).get(`/api/admin/polls/${dup.body.pid}`).set("Cookie", cookie);
    expect(detail.body.title).toBe("Quarterly Review Copy 2");
  });

  it("copies InvitedVoterList/BannedVoterList only for PRIVATE_POLL_INVITATION_ONLY", async () => {
    const cookie = await adminCookie();
    const invitePoll = makePoll({
      pollVisibility: "Private Poll", pollSharingMode: "Invitation Only",
      invitedVoterList: ["a@example.com", "b@example.com"],
      bannedVoterList: ["c@example.com"]
    });
    await polls(ctx).insertOne(invitePoll);
    const dup = await request(ctx.app).post(`/api/admin/polls/${invitePoll._id}/duplicate`).set("Cookie", cookie);
    const detail = await request(ctx.app).get(`/api/admin/polls/${dup.body.pid}`).set("Cookie", cookie);
    expect(detail.body.invitedVoterList).toEqual(["a@example.com", "b@example.com"]);
    expect(detail.body.bannedVoterList).toEqual(["c@example.com"]);
    expect(detail.body.pollVisibility).toBe("Private Poll");
    expect(detail.body.pollSharingMode).toBe("Invitation Only");
    expect(detail.body.voteAnonymity).toBe(invitePoll.voteAnonymity);

    const linkPoll = makePoll({
      pollVisibility: "Private Poll",
      pollSharingMode: "Anyone With The Link",
      voteAnonymity: "No",
      invitedVoterList: ["stale@example.com"],
      bannedVoterList: ["stale-ban@example.com"]
    });
    await polls(ctx).insertOne(linkPoll);
    const dupLink = await request(ctx.app).post(`/api/admin/polls/${linkPoll._id}/duplicate`).set("Cookie", cookie);
    const detailLink = await request(ctx.app).get(`/api/admin/polls/${dupLink.body.pid}`).set("Cookie", cookie);
    expect(detailLink.body.pollSharingMode).toBe("Anyone With The Link");
    expect(detailLink.body.voteAnonymity).toBe("No");
    expect(detailLink.body.invitedVoterList).toEqual([]);
    expect(detailLink.body.bannedVoterList).toEqual([]);

    const publicPoll = makePoll({ pollVisibility: "Public Poll" });
    await polls(ctx).insertOne(publicPoll);
    const dup2 = await request(ctx.app).post(`/api/admin/polls/${publicPoll._id}/duplicate`).set("Cookie", cookie);
    const detail2 = await request(ctx.app).get(`/api/admin/polls/${dup2.body.pid}`).set("Cookie", cookie);
    expect(detail2.body.invitedVoterList).toEqual([]);
  });

  it("tells a voter a poll is waiting to open or closed, from its stored state (011 FR-004)", async () => {
    const pending = makePoll({ pollState: "WAITING TO OPEN", startAt: new Date(Date.now() + 60_000) });
    const closed = makePoll({ pollState: "CLOSED", endAt: new Date(Date.now() - 60_000) });
    await polls(ctx).insertMany([pending, closed]);
    const { cookie } = await forgeSession(ctx, "schedvoter@example.com");

    const pendingRes = await request(ctx.app)
      .post(`/api/polls/${pending._id}/vote`)
      .set("Cookie", cookie)
      .send({ choiceIds: ["c1"] });
    expect(pendingRes.status).toBe(409);
    expect(pendingRes.body.error).toMatch(/not started/i);

    const closedRes = await request(ctx.app)
      .post(`/api/polls/${closed._id}/vote`)
      .set("Cookie", cookie)
      .send({ choiceIds: ["c1"] });
    expect(closedRes.status).toBe(409);
    expect(closedRes.body.error).toMatch(/not open for voting/i);
  });

  it("PATCH pollState=CLOSED sets endAt=now and blocks further votes (FR-045)", async () => {
    const cookie = await adminCookie();
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const patch = await request(ctx.app)
      .patch(`/api/admin/polls/${poll._id}`)
      .set("Cookie", cookie)
      .send({ pollState: "CLOSED" });
    expect(patch.status).toBe(200);
    expect(patch.body.pollState).toBe("CLOSED");
    expect(new Date(patch.body.endAt).getTime()).toBeGreaterThan(Date.now() - 5000);

    const { cookie: voterCookie } = await forgeSession(ctx, "closedvoter@example.com");
    const voteRes = await request(ctx.app)
      .post(`/api/polls/${poll._id}/vote`)
      .set("Cookie", voterCookie)
      .send({ choiceIds: ["c1"] });
    expect(voteRes.status).toBe(409);
  });

  it("PATCH pollState=ARCHIVED hides the poll from voters but not admins (FR-045; 011 FR-049 requires CLOSED first)", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({ pollState: "CLOSED" });
    await polls(ctx).insertOne(poll);
    await request(ctx.app)
      .patch(`/api/admin/polls/${poll._id}`)
      .set("Cookie", cookie)
      .send({ pollState: "ARCHIVED" });

    const voterRes = await request(ctx.app).get(`/api/polls/${poll._id}`);
    expect(voterRes.status).toBe(404);
    const adminRes = await request(ctx.app).get(`/api/admin/polls/${poll._id}`).set("Cookie", cookie);
    expect(adminRes.status).toBe(200);
  });

  it("rejects startAt >= endAt (FR-046)", async () => {
    const cookie = await adminCookie();
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ startAt: "2026-06-02T00:00:00.000Z", endAt: "2026-06-01T00:00:00.000Z" });
    expect(res.status).toBe(400);
  });

  it("blocks moving an already-passed startAt into the future once the poll has a vote (FR-046)", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({
      startAt: new Date(Date.now() - 60_000),
      currentVotes: [
        { emailAddress: "voted@example.com", userName: "voted", choiceIds: ["c1"], votedAt: new Date()}
      ]
    });
    await polls(ctx).insertOne(poll);
    await voteHistory(ctx).insertOne({
      pid: poll._id,
      emailAddress: "voted@example.com",
      userName: "voted",
      choiceIds: ["c1"],
      votedAt: new Date()
    });
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ startAt: new Date(Date.now() + 60_000).toISOString() });
    expect(res.status).toBe(409);
  });

  it("blocks switching to Single-Choice Poll once a choice has more than one vote (FR-047)", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({
      choiceMode: "Multiple-Choice Poll",
      currentVotes: [
        { emailAddress: "a@example.com", userName: "a", choiceIds: ["c1"], votedAt: new Date()},
        { emailAddress: "b@example.com", userName: "b", choiceIds: ["c1"], votedAt: new Date()}
      ]
    });
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ choiceMode: "Single-Choice Poll" });
    expect(res.status).toBe(409);
  });

  it("refuses pollVisibility on the update surface once the poll has ever had a vote (011 FR-009)", async () => {
    const cookie = await adminCookie();
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    await voteHistory(ctx).insertOne({
      pid: poll._id,
      emailAddress: "voted@example.com",
      userName: "voted",
      choiceIds: ["c1"],
      votedAt: new Date()
    });
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ pollVisibility: "Private Poll" });
    expect(res.status).toBe(400);
  });

  // 012 T025 (FR-001/FR-002): all five values are stored and returned byte-for-byte.
  // There is deliberately no code-to-label map anywhere, so a round-trip is the whole
  // contract — if the stored form ever diverges from the displayed form, this fails.
  it("012 FR-002: every visibility value round-trips verbatim", async () => {
    const cookie = await adminCookie();
    for (const value of POLL_VISIBILITIES) {
      const poll = makePoll();
      await polls(ctx).insertOne(poll);
      const res = await request(ctx.app)
        .post(`/api/admin/polls/${poll._id}/publish`)
        .set("Cookie", cookie)
        .send({ pollVisibility: value });
      expect(res.status, value).toBe(200);
      expect(res.body.pollVisibility, value).toBe(value);
      const stored = await polls(ctx).findOne({ _id: poll._id });
      expect(stored?.pollVisibility, value).toBe(value);
    }
  });

  it("rejects a visibility value outside the two, including every retired five-word value", async () => {
    const cookie = await adminCookie();
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    for (const bad of [
      "PUBLIC_POLL",
      "public poll",
      "PRIVATE POLL",
      "",
      "Private Poll - Anyone With The Link - Do Not Show Who Voted",
      "Private Poll - Invitation Only - Show Who Voted"
    ]) {
      const res = await request(ctx.app)
        .post(`/api/admin/polls/${poll._id}/publish`)
        .set("Cookie", cookie)
        .send({ pollVisibility: bad });
      expect(res.status, JSON.stringify(bad)).toBe(400);
    }
  });

  // 012 T026 (FR-006): a public poll never carries a limit, whatever the caller sends.
  it("012 FR-006: forces voterCountLimit to null for Public Poll", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({
      pollVisibility: "Private Poll",
      voterCountLimit: 42
    });
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ pollVisibility: "Public Poll", voterCountLimit: 42 });
    expect(res.status).toBe(200);
    expect(res.body.voterCountLimit).toBeNull();
  });

  // 012 T028 (FR-004): all three mechanics fields freeze together once a vote exists.
  it("012 FR-004: refuses choiceMode, voteMutability, pollVisibility, pollSharingMode and voteAnonymity once voted on", async () => {
    const cookie = await adminCookie();
    for (const [field, value] of [
      ["choiceMode", "Multiple-Choice Poll"],
      ["voteMutability", "Dynamic-Vote Poll"],
      ["pollVisibility", "Public Poll"],
      ["pollSharingMode", "Invitation Only"],
      ["voteAnonymity", "No"]
    ] as const) {
      const poll = makePoll({ pollState: "OPEN" });
      await polls(ctx).insertOne(poll);
      await voteHistory(ctx).insertOne({
        pid: poll._id,
        emailAddress: "v@example.com",
        userName: "v",
        choiceIds: ["c1"],
        votedAt: new Date()
      });
      const res = await request(ctx.app)
        .post(`/api/admin/polls/${poll._id}/publish`)
        .set("Cookie", cookie)
        .send({ [field]: value });
      // UPDATE mode rejects the field before the freeze is reached; either refusal
      // is correct, and both leave the poll unchanged.
      expect([400, 409], field).toContain(res.status);
      const after = await polls(ctx).findOne({ _id: poll._id });
      expect(after?.[field], field).toBe(poll[field]);
    }
  });

  // ── 012 US4 (T046-T048): one save action ────────────────────────────────────
  // The choices used to have their own button and their own route, so a rejected
  // publish could leave choices already persisted — a partial save the administrator
  // had no way to detect. One route, one validation pass, one $set removes that.

  it("012 T046: publish carries labels, replacing the choice list in the same write", async () => {
    const cookie = await adminCookie();
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ title: "Venue for the meet-up", labels: ["Alpha", "Beta", "Gamma"] });
    expect(res.status).toBe(200);
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.choices.map((c) => c.label)).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(after?.title).toBe("Venue for the meet-up");
  });

  it("012 T047 (FR-013): a rejected publish persists nothing — choices included", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({ title: "Original title" });
    const originalLabels = poll.choices.map((c) => c.label);
    await polls(ctx).insertOne(poll);

    // A title over the limit fails validation *after* the labels would have been
    // applied under the old two-route flow.
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ title: "x".repeat(300), labels: ["Should", "Not", "Persist"] });
    expect(res.status).toBe(400);

    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.title).toBe("Original title");
    expect(after?.choices.map((c) => c.label)).toEqual(originalLabels);
  });

  it("012 T047: an invalid label list rejects the whole save, leaving the title alone", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({ title: "Original title" });
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ title: "A perfectly fine title", labels: ["OnlyOne"] }); // below MIN_CHOICES
    expect(res.status).toBe(400);
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.title).toBe("Original title");
  });

  it("012 T048 (FR-014): labels are refused on the update surface", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({ pollState: "OPEN" });
    await polls(ctx).insertOne(poll);
    await voteHistory(ctx).insertOne({
      pid: poll._id, emailAddress: "v@example.com", userName: "v",
      choiceIds: ["c1"], votedAt: new Date()
    });
    const originalLabels = poll.choices.map((c) => c.label);
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ labels: ["New", "Choices"] });
    expect(res.status).toBe(400);
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.choices.map((c) => c.label)).toEqual(originalLabels);
  });

  it("012 T048: the dedicated choices route is gone", async () => {
    const cookie = await adminCookie();
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app)
      .put(`/api/admin/polls/${poll._id}/choices`)
      .set("Cookie", cookie)
      .send({ labels: ["A", "B"] });
    expect(res.status).toBe(404);
  });

  // 012 FR-023: a visibility change never clears either participant list. This is a
  // regression guard, not a driver of new code — nothing clears them today, and
  // FR-023 exists to keep it that way.
  it("012 FR-023: retains the invited and banned lists across a visibility change", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({
      pollVisibility: "Private Poll", pollSharingMode: "Invitation Only",
      invitedVoterList: ["kept@example.com"],
      bannedVoterList: ["blocked@example.com"]
    });
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ pollVisibility: "Public Poll" });
    expect(res.status).toBe(200);
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.invitedVoterList).toEqual(["kept@example.com"]);
    expect(after?.bannedVoterList).toEqual(["blocked@example.com"]);
  });

  it("carries pollSharingMode and voteAnonymity on every administrator response", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", voteAnonymity: "No" });
    await polls(ctx).insertOne(poll);
    const expectFields = (body: Record<string, unknown>, where: string) => {
      expect(body.pollVisibility, where).toBe("Private Poll");
      expect(body.pollSharingMode, where).toBe("Invitation Only");
      expect(body.voteAnonymity, where).toBe("No");
    };
    const list = await request(ctx.app).get("/api/admin/polls").set("Cookie", cookie);
    expectFields(list.body.polls.find((p: { pid: string }) => p.pid === poll._id), "list row");
    const detail = await request(ctx.app).get(`/api/admin/polls/${poll._id}`).set("Cookie", cookie);
    expectFields(detail.body, "detail");
    const session = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/edit-session`)
      .set("Cookie", cookie)
      .send({ clientGuid: "guid-fields" });
    expectFields(session.body.poll, "edit-session");
    const published = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ clientGuid: "guid-fields", subtitle: "s" });
    expectFields(published.body, "publish");
    const dup = await request(ctx.app).post(`/api/admin/polls/${poll._id}/duplicate`).set("Cookie", cookie);
    const dupDetail = await request(ctx.app).get(`/api/admin/polls/${dup.body.pid}`).set("Cookie", cookie);
    expectFields(dupDetail.body, "duplicate");
  });

  it("stores pollSharingMode and voteAnonymity and echoes them", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({ pollVisibility: "Private Poll" });
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ pollSharingMode: "Invitation Only", voteAnonymity: "No" });
    expect(res.status).toBe(200);
    expect(res.body.pollSharingMode).toBe("Invitation Only");
    expect(res.body.voteAnonymity).toBe("No");
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.pollSharingMode).toBe("Invitation Only");
    expect(after?.voteAnonymity).toBe("No");
  });

  it("leaves pollSharingMode and voteAnonymity as stored when a poll goes public", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({
      pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", voteAnonymity: "No"
    });
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ pollVisibility: "Public Poll" });
    expect(res.status).toBe(200);
    expect(res.body.pollSharingMode).toBe("Invitation Only");
    expect(res.body.voteAnonymity).toBe("No");
  });

  it("changing the sharing mode alone leaves every roster exactly as stored", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({
      pollVisibility: "Private Poll",
      pollSharingMode: "Invitation Only",
      invitedVoterList: ["kept@example.com", "voted@example.com"],
      bannedVoterList: ["blocked@example.com"],
      currentVotes: [
        { emailAddress: "kept@example.com", userName: "", choiceIds: [], votedAt: null },
        { emailAddress: "voted@example.com", userName: "v", choiceIds: ["c1"], votedAt: new Date() }
      ]
    });
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ pollSharingMode: "Anyone With The Link" });
    expect(res.status).toBe(200);
    expect(res.body.pollSharingMode).toBe("Anyone With The Link");
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.invitedVoterList).toEqual(poll.invitedVoterList);
    expect(after?.bannedVoterList).toEqual(poll.bannedVoterList);
    expect(after?.currentVotes).toEqual(poll.currentVotes);
  });

  it("keeps pollSharingMode and voteAnonymity frozen after the only vote is deleted", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({ pollVisibility: "Private Poll", pollState: "OPEN", currentVotes: [] });
    await polls(ctx).insertOne(poll);
    await voteHistory(ctx).insertOne({
      pid: poll._id,
      emailAddress: "gone@example.com",
      userName: "gone",
      choiceIds: ["c1"],
      votedAt: new Date()
    });
    for (const body of [{ pollSharingMode: "Invitation Only" }, { voteAnonymity: "No" }]) {
      const res = await request(ctx.app)
        .post(`/api/admin/polls/${poll._id}/publish`)
        .set("Cookie", cookie)
        .send(body);
      expect([400, 409], JSON.stringify(body)).toContain(res.status);
    }
    const unrelated = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ subtitle: "still editable" });
    expect(unrelated.status).toBe(200);
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.pollSharingMode).toBe("Anyone With The Link");
    expect(after?.voteAnonymity).toBe("Yes");
    expect(after?.subtitle).toBe("still editable");
  });

  it("refuses an unknown pollSharingMode or voteAnonymity with the exact message and saves nothing", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({ pollVisibility: "Private Poll" });
    await polls(ctx).insertOne(poll);
    const bad = [
      { body: { pollSharingMode: "Everyone" }, error: "Invalid pollSharingMode." },
      { body: { pollSharingMode: "" }, error: "Invalid pollSharingMode." },
      { body: { voteAnonymity: "Maybe" }, error: "Invalid voteAnonymity." },
      { body: { voteAnonymity: "yes" }, error: "Invalid voteAnonymity." }
    ];
    for (const { body, error } of bad) {
      const res = await request(ctx.app)
        .post(`/api/admin/polls/${poll._id}/publish`)
        .set("Cookie", cookie)
        .send({ ...body, title: "Should not be saved" });
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error).toBe(error);
    }
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.title).toBe(poll.title);
    expect(after?.pollSharingMode).toBe("Anyone With The Link");
    expect(after?.voteAnonymity).toBe("Yes");
  });

  // 012 FR-003: the access/visibility auto-switch is deleted along with the pair it
  // reconciled. Setting one field must never rewrite another.
  it("012 FR-003: setting pollVisibility changes no other field", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({ pollVisibility: "Public Poll", voterCountLimit: null });
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" });
    expect(res.status).toBe(200);
    expect(res.body.pollVisibility).toBe("Private Poll");
    expect(res.body.pollSharingMode).toBe("Invitation Only");
    expect(res.body.choiceMode).toBe(poll.choiceMode);
    expect(res.body.voteMutability).toBe(poll.voteMutability);
  });

  // 012 FR-007: the public->private auto-fill of 500 is deleted. The field stays blank.
  it("012 FR-007: a public->private change leaves voterCountLimit blank, and public clears it", async () => {
    const cookie = await adminCookie();
    // Unpublished, so each publish holds it back (starter choices) and it stays editable.
    const poll = makePoll({ pollState: "INITIALIZED", pollVisibility: "Public Poll", voterCountLimit: null });
    await polls(ctx).insertOne(poll);

    const toPrivate = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ pollVisibility: "Private Poll" });
    expect(toPrivate.status).toBe(200);
    expect(toPrivate.body.voterCountLimit).toBeNull();

    const back = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ pollVisibility: "Public Poll", voterCountLimit: 25 });
    expect(back.status).toBe(200);
    expect(back.body.voterCountLimit).toBeNull();
  });

  /**
   * 012 FR-066: the ceiling is configurable, and BOTH halves of it move together —
   * the maximum an administrator may enter, and the limit a blank field means. A
   * setting that only moved one of them would let a poll accept a value it then
   * refused to honour.
   */
  it("012 FR-066: a configured ceiling governs both the maximum and the blank default", async () => {
    const small = await startTestContext({ ENV_MAX_PRIVATE_POLL_VOTERS: "10" });
    try {
      const { cookie } = await forgeSession(small, small.config.admins[0]!);
      const poll = makePoll({
        pollVisibility: "Private Poll"
      });
      await polls(small).insertOne(poll);

      // The maximum moved: 11 is refused where 500 would once have been accepted.
      const tooHigh = await request(small.app)
        .post(`/api/admin/polls/${poll._id}/publish`)
        .set("Cookie", cookie)
        .send({ voterCountLimit: 11 });
      expect(tooHigh.status).toBe(400);
      expect(tooHigh.body.error).toMatch(/between 1 and 10/);

      const ok = await request(small.app)
        .post(`/api/admin/polls/${poll._id}/publish`)
        .set("Cookie", cookie)
        .send({ voterCountLimit: 10 });
      expect(ok.status).toBe(200);

      // ...and the blank default moved with it.
      const stored = (await polls(small).findOne({ _id: poll._id }))!;
      expect(effectiveVoterLimit({ ...stored, voterCountLimit: null }, small.config)).toBe(10);
    } finally {
      await small.stop();
    }
  });

  /**
   * 012 FR-064: the voter count limit stays editable once a poll has votes.
   *
   * It was frozen only by omission — 011 FR-009's reduced update surface never listed
   * it — rather than by any rule. Unlike choice mode, vote mutability and visibility,
   * it changes the poll's capacity and not the meaning of any vote already cast, so
   * raising it invalidates nothing. A poll filling up is precisely when it matters.
   */
  it("012 FR-064: the limit can be raised on a poll that already has votes", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({
      pollState: "OPEN",
      pollVisibility: "Private Poll",
      voterCountLimit: 2,
      currentVotes: [
        { emailAddress: "a@example.com", userName: "A", choiceIds: ["c1"], votedAt: new Date() },
        { emailAddress: "b@example.com", userName: "B", choiceIds: ["c1"], votedAt: new Date() }
      ]
    });
    await polls(ctx).insertOne(poll);
    await voteHistory(ctx).insertOne({
      pid: poll._id, emailAddress: "a@example.com", userName: "A",
      choiceIds: ["c1"], votedAt: new Date()
    });

    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ voterCountLimit: 10 });
    expect(res.status).toBe(200);
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.voterCountLimit).toBe(10);
    // The votes already cast are untouched — capacity, not meaning.
    expect(after?.currentVotes).toHaveLength(2);
  });

  it("012 FR-064: the same validation applies on the update surface", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({
      pollState: "OPEN",
      pollVisibility: "Private Poll",
      voterCountLimit: 5
    });
    await polls(ctx).insertOne(poll);
    await voteHistory(ctx).insertOne({
      pid: poll._id, emailAddress: "v@example.com", userName: "V",
      choiceIds: ["c1"], votedAt: new Date()
    });
    for (const bad of [501, 0, "abc"]) {
      const res = await request(ctx.app)
        .post(`/api/admin/polls/${poll._id}/publish`)
        .set("Cookie", cookie)
        .send({ voterCountLimit: bad });
      expect(res.status, String(bad)).toBe(400);
    }
    // ...and clearing it still clears it, binding at 500 rather than erroring.
    const cleared = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ voterCountLimit: "" });
    expect(cleared.status).toBe(200);
    expect((await polls(ctx).findOne({ _id: poll._id }))?.voterCountLimit).toBeNull();
  });

  it("012 FR-064: a public poll still carries no limit, whatever the surface", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({ pollState: "OPEN", pollVisibility: "Public Poll" });
    await polls(ctx).insertOne(poll);
    await voteHistory(ctx).insertOne({
      pid: poll._id, emailAddress: "pub@example.com", userName: "P",
      choiceIds: ["c1"], votedAt: new Date()
    });
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ voterCountLimit: 25 });
    expect(res.status).toBe(200);
    expect((await polls(ctx).findOne({ _id: poll._id }))?.voterCountLimit).toBeNull();
  });

  /**
   * 012 FR-061: clearing the field. A number input yields "" when emptied, and
   * `Number("")` is 0 — which failed the range check and told the administrator their
   * empty box "must be a whole number between 1 and 500". Blank of any shape means
   * cleared, whatever the form sends.
   */
  it("012 FR-061: clearing the voter count limit clears it, rather than erroring", async () => {
    const cookie = await adminCookie();
    for (const blank of ["", "   ", null]) {
      await polls(ctx).deleteMany({});
      const poll = makePoll({
        pollVisibility: "Private Poll",
        voterCountLimit: 2
      });
      await polls(ctx).insertOne(poll);
      const res = await request(ctx.app)
        .post(`/api/admin/polls/${poll._id}/publish`)
        .set("Cookie", cookie)
        .send({ voterCountLimit: blank });
      expect(res.status, JSON.stringify(blank)).toBe(200);
      const after = await polls(ctx).findOne({ _id: poll._id });
      expect(after?.voterCountLimit, JSON.stringify(blank)).toBeNull();
    }
  });

  it("012 FR-061: a cleared private limit still binds at the default of 100, not at unlimited", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({
      pollVisibility: "Private Poll",
      voterCountLimit: 2
    });
    await polls(ctx).insertOne(poll);
    await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ voterCountLimit: "" });
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after?.voterCountLimit).toBeNull();
    // FR-008: null on a private poll is the default, not "no limit at all".
    // No config passed: falls back to the built-in 100 (FR-066).
    expect(effectiveVoterLimit(after!)).toBe(100);
  });

  it("012 FR-061: a genuinely invalid value is still rejected", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({
      pollVisibility: "Private Poll"
    });
    await polls(ctx).insertOne(poll);
    for (const bad of ["abc", "2.5", "0", "-1", "101"]) {
      const res = await request(ctx.app)
        .post(`/api/admin/polls/${poll._id}/publish`)
        .set("Cookie", cookie)
        .send({ voterCountLimit: bad });
      expect(res.status, bad).toBe(400);
    }
  });

  // 012 FR-009: the ceiling (100 by default) is enforced server-side, not only in the browser.
  it("012 FR-009: rejects a voterCountLimit above the default of 100 or below 1", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({
      pollVisibility: "Private Poll"
    });
    await polls(ctx).insertOne(poll);
    for (const bad of [101, 0, -1, 1.5]) {
      const res = await request(ctx.app)
        .post(`/api/admin/polls/${poll._id}/publish`)
        .set("Cookie", cookie)
        .send({ voterCountLimit: bad });
      expect(res.status, `voterCountLimit=${bad}`).toBe(400);
    }
  });

  it("clears voterCountLimit to blank when explicitly PATCHed as null", async () => {
    const cookie = await adminCookie();
    const poll = makePoll({ pollVisibility: "Private Poll", voterCountLimit: 500 });
    await polls(ctx).insertOne(poll);
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ voterCountLimit: null });
    expect(res.status).toBe(200);
    expect(res.body.voterCountLimit).toBeNull();
  });

});
