/**
 * 011-SIMPLIFY-POLL-STATES — the editing lock (US5).
 *
 * Staleness is exercised by writing an old heartbeat and calling one sweep tick.
 * No test sleeps.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { startTestContext, forgeSession, type TestContext } from "./helpers/setup.js";
import { makePoll } from "./helpers/poll-fixtures.js";
import { polls, publicDetail, publicListing, voteHistory } from "./helpers/poll-fixtures.js";
import { staleEditUpdateSweep } from "../src/polls/sweeps.js";
import { addBookmark } from "../src/polls/bookmarks.js";

const HEARTBEAT_MS = 10_000;

describe("Editing lock (011 FR-017..FR-023)", () => {
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
  });

  const open = (pid: string, clientGuid: string) =>
    request(ctx.app).post(`/api/admin/polls/${pid}/edit-session`).set("Cookie", cookie).send({ clientGuid });
  const beat = (pid: string, clientGuid: string) =>
    request(ctx.app)
      .post(`/api/admin/polls/${pid}/edit-session/heartbeat`)
      .set("Cookie", cookie)
      .send({ clientGuid });
  const release = (pid: string, clientGuid: string) =>
    request(ctx.app).delete(`/api/admin/polls/${pid}/edit-session`).set("Cookie", cookie).send({ clientGuid });
  const reload = async (pid: string) => (await polls(ctx).findOne({ _id: pid }))!;

  async function seed(pollState = "OPEN" as const) {
    const poll = makePoll({ pollState });
    await polls(ctx).insertOne(poll);
    return poll;
  }

  it("takes the lock, stashing the previous state (FR-017)", async () => {
    const poll = await seed("CLOSED");
    const res = await open(poll._id, "tab-A");
    expect(res.status).toBe(200);
    expect(res.body.granted).toBe(true);

    const after = await reload(poll._id);
    expect(after.pollState).toBe("EDITING");
    expect(after.pollStateBeforeEditUpdate).toBe("CLOSED");
    expect(after.pollEditUpdateClientGUID).toBe("tab-A");
    expect(after.pollEditUpdateHeartbeatTimestamp).toBeInstanceOf(Date);
  });

  /*
    012 FR-046 supersedes 011 FR-003 for this one case, and it is the conflict the
    architecture pass raised before the requirements settled it.

    011 withheld every EDITING poll. But 012 needs the card to stay on the grid
    carrying "This poll is momentarily unavailable…" — a card that simply vanishes
    mid-edit tells the voter nothing. The line moved from "is it EDITING?" to "had
    the public already seen it?", which preserves what 011 was actually protecting:
    a poll nobody has seen still stays unseen.
  */
  it("012 FR-046: keeps an EDITING poll listed if the public had already seen it", async () => {
    const poll = makePoll({ pollVisibility: "Public Poll", pollState: "OPEN" });
    await polls(ctx).insertOne(poll);
    await open(poll._id, "tab-A");
    expect(await publicListing(ctx)).toContain(poll._id);
    // EDITING-POLL-AVAILABLE R1: the card now carries the stashed state, so the
    // poll looks simply OPEN to a voter while the creator edits.
    expect((await publicDetail(ctx, poll._id))!.pollState).toBe("OPEN");
  });

  it("012 FR-046: still hides an EDITING poll the public had never seen", async () => {
    const poll = makePoll({ pollVisibility: "Public Poll", pollState: "INITIALIZED" });
    await polls(ctx).insertOne(poll);
    await open(poll._id, "tab-A");
    expect(await publicListing(ctx)).not.toContain(poll._id);
  });

  it("refuses a second session with the documented message (FR-018)", async () => {
    const poll = await seed();
    await open(poll._id, "tab-A");
    const second = await open(poll._id, "tab-B");
    expect(second.status).toBe(409);
    expect(second.body.reason).toBe("LOCKED");
    expect(second.body.message).toMatch(/currently being edited.*try again shortly/i);
  });

  it("is deliberately not re-entrant: a refresh gets a new identifier and is refused (FR-023)", async () => {
    const poll = await seed();
    await open(poll._id, "tab-A");
    // Same admin, same browser, but a page reload means a fresh identifier.
    const refreshed = await open(poll._id, "tab-A-reloaded");
    expect(refreshed.status).toBe(409);
    expect(refreshed.body.reason).toBe("LOCKED");
  });

  it("accepts a heartbeat from the holder and refuses one from anyone else", async () => {
    const poll = await seed();
    await open(poll._id, "tab-A");
    expect((await beat(poll._id, "tab-A")).body.alive).toBe(true);

    const impostor = await beat(poll._id, "tab-B");
    expect(impostor.status).toBe(409);
    expect(impostor.body.alive).toBe(false);
  });

  it("refreshes the heartbeat timestamp on each beat", async () => {
    const poll = await seed();
    await open(poll._id, "tab-A");
    const first = (await reload(poll._id)).pollEditUpdateHeartbeatTimestamp!;
    await polls(ctx).updateOne(
      { _id: poll._id },
      { $set: { pollEditUpdateHeartbeatTimestamp: new Date(first.getTime() - 5_000) } }
    );
    await beat(poll._id, "tab-A");
    const second = (await reload(poll._id)).pollEditUpdateHeartbeatTimestamp!;
    expect(second.getTime()).toBeGreaterThan(first.getTime() - 5_000);
  });

  it("releases cleanly to the stashed state, and only for the holder (FR-023)", async () => {
    const poll = await seed("WAITING TO OPEN");
    await open(poll._id, "tab-A");

    expect((await release(poll._id, "tab-B")).status).toBe(409);
    expect((await reload(poll._id)).pollState).toBe("EDITING");

    const ok = await release(poll._id, "tab-A");
    expect(ok.status).toBe(200);
    expect(ok.body.pollState).toBe("WAITING TO OPEN");

    const after = await reload(poll._id);
    expect(after.pollState).toBe("WAITING TO OPEN");
    expect(after.pollStateBeforeEditUpdate).toBeNull();
    expect(after.pollEditUpdateClientGUID).toBeNull();
    expect(after.pollEditUpdateHeartbeatTimestamp).toBeNull();
  });

  it("recovers a stale session, restoring the state and clearing all three fields (FR-021)", async () => {
    const poll = await seed("OPEN");
    await open(poll._id, "tab-A");

    // The browser vanished: no heartbeat since more than twice the interval.
    const now = new Date();
    await polls(ctx).updateOne(
      { _id: poll._id },
      { $set: { pollEditUpdateHeartbeatTimestamp: new Date(now.getTime() - HEARTBEAT_MS * 2 - 1) } }
    );
    expect(await staleEditUpdateSweep(ctx, HEARTBEAT_MS, now)).toBe(1);

    const after = await reload(poll._id);
    expect(after.pollState).toBe("OPEN");
    expect(after.pollStateBeforeEditUpdate).toBeNull();
    expect(after.pollEditUpdateHeartbeatTimestamp).toBeNull();
    expect(after.pollEditUpdateClientGUID).toBeNull();
  });

  it("leaves a session alone while its heartbeat is fresh (FR-022)", async () => {
    const poll = await seed();
    await open(poll._id, "tab-A");
    const now = new Date();
    await polls(ctx).updateOne(
      { _id: poll._id },
      { $set: { pollEditUpdateHeartbeatTimestamp: new Date(now.getTime() - HEARTBEAT_MS * 2 + 500) } }
    );
    expect(await staleEditUpdateSweep(ctx, HEARTBEAT_MS, now)).toBe(0);
    expect((await reload(poll._id)).pollState).toBe("EDITING");
  });

  it("a stale client cannot clear the lock another admin has since taken (SC-006)", async () => {
    const poll = await seed("OPEN");
    await open(poll._id, "tab-A");

    // A goes stale and is recovered...
    const now = new Date();
    await polls(ctx).updateOne(
      { _id: poll._id },
      { $set: { pollEditUpdateHeartbeatTimestamp: new Date(now.getTime() - HEARTBEAT_MS * 2 - 1) } }
    );
    await staleEditUpdateSweep(ctx, HEARTBEAT_MS, now);

    // ...B takes the lock...
    expect((await open(poll._id, "tab-B")).status).toBe(200);

    // ...and A, returning from a network partition, releases into the void.
    const late = await release(poll._id, "tab-A");
    expect(late.status).toBe(409);
    expect(late.body.released).toBe(false);

    const after = await reload(poll._id);
    expect(after.pollState).toBe("EDITING");
    expect(after.pollEditUpdateClientGUID).toBe("tab-B");
  });

  it("a stale client's heartbeat cannot revive a lock B now holds", async () => {
    const poll = await seed("OPEN");
    await open(poll._id, "tab-A");
    const now = new Date();
    await polls(ctx).updateOne(
      { _id: poll._id },
      { $set: { pollEditUpdateHeartbeatTimestamp: new Date(now.getTime() - HEARTBEAT_MS * 2 - 1) } }
    );
    await staleEditUpdateSweep(ctx, HEARTBEAT_MS, now);
    await open(poll._id, "tab-B");

    expect((await beat(poll._id, "tab-A")).body.alive).toBe(false);
    expect((await reload(poll._id)).pollEditUpdateClientGUID).toBe("tab-B");
  });

  it("recovers only the sessions that are stale, leaving fresh ones running", async () => {
    const stale = await seed("OPEN");
    const fresh = await seed("CLOSED");
    await open(stale._id, "tab-A");
    await open(fresh._id, "tab-B");
    const now = new Date();
    await polls(ctx).updateOne(
      { _id: stale._id },
      { $set: { pollEditUpdateHeartbeatTimestamp: new Date(now.getTime() - HEARTBEAT_MS * 2 - 1) } }
    );
    expect(await staleEditUpdateSweep(ctx, HEARTBEAT_MS, now)).toBe(1);
    expect((await reload(stale._id)).pollState).toBe("OPEN");
    expect((await reload(fresh._id)).pollState).toBe("EDITING");
  });
});

describe("Abandoning an edit changes nothing (011 FR-015, T066)", () => {
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
  });

  const reload = async (pid: string) => (await polls(ctx).findOne({ _id: pid }))!;

  it("restores the pre-edit state and leaves every field untouched", async () => {
    const startAt = new Date("2026-05-01T00:00:00Z");
    const endAt = new Date("2026-06-01T00:00:00Z");
    const poll = makePoll({
      pollState: "WAITING TO OPEN",
      title: "Original title",
      subtitle: "Original subtitle",
      startAt,
      endAt,
      pollVisibility: "Private Poll", pollSharingMode: "Invitation Only",
      voterCountLimit: 42
    });
    await polls(ctx).insertOne(poll);
    const before = await reload(poll._id);

    await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/edit-session`)
      .set("Cookie", cookie)
      .send({ clientGuid: "tab-A" });
    expect((await reload(poll._id)).pollState).toBe("EDITING");

    // The admin types, thinks better of it, and leaves. The draft was never sent,
    // so the release is the whole of the rollback.
    const released = await request(ctx.app)
      .delete(`/api/admin/polls/${poll._id}/edit-session`)
      .set("Cookie", cookie)
      .send({ clientGuid: "tab-A" });
    expect(released.status).toBe(200);

    const after = await reload(poll._id);
    expect(after.pollState).toBe("WAITING TO OPEN");
    expect(after.title).toBe(before.title);
    expect(after.subtitle).toBe(before.subtitle);
    expect(after.startAt!.getTime()).toBe(startAt.getTime());
    expect(after.endAt!.getTime()).toBe(endAt.getTime());
    expect(after.pollVisibility).toBe(before.pollVisibility);
    expect(after.voterCountLimit).toBe(before.voterCountLimit);
    expect(after.choices.map((c) => c.label)).toEqual(before.choices.map((c) => c.label));
    expect(after.pollStateBeforeEditUpdate).toBeNull();
    expect(after.pollEditUpdateClientGUID).toBeNull();
    expect(after.pollEditUpdateHeartbeatTimestamp).toBeNull();
  });

  it("restores the pre-edit state whichever state that was", async () => {
    for (const pollState of ["INITIALIZED", "REJECTED", "OPEN", "CLOSED"] as const) {
      await polls(ctx).deleteMany({});
      const poll = makePoll({ pollState });
      await polls(ctx).insertOne(poll);
      await request(ctx.app)
        .post(`/api/admin/polls/${poll._id}/edit-session`)
        .set("Cookie", cookie)
        .send({ clientGuid: "tab-A" });
      await request(ctx.app)
        .delete(`/api/admin/polls/${poll._id}/edit-session`)
        .set("Cookie", cookie)
        .send({ clientGuid: "tab-A" });
      expect((await reload(poll._id)).pollState).toBe(pollState);
    }
  });
});

describe("Writing from inside a session (011 regression guard)", () => {
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
  });

  /**
   * Publish and the choices save are reached *from* an open session, so the poll
   * is EDITING when they arrive. Judging them against EDITING refuses every real
   * publish — a bug that unit tests publishing a poll directly cannot see.
   */
  async function openSession(pollState: "INITIALIZED" | "OPEN" | "CLOSED", guid: string) {
    const poll = makePoll({ pollState });
    await polls(ctx).insertOne(poll);
    const s = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/edit-session`)
      .set("Cookie", cookie)
      .send({ clientGuid: guid });
    expect(s.status).toBe(200);
    return poll;
  }

  it("the lock holder can publish, from every editable state", async () => {
    for (const st of ["INITIALIZED", "OPEN", "CLOSED"] as const) {
      await polls(ctx).deleteMany({});
      const poll = await openSession(st, "tab-A");
      const res = await request(ctx.app)
        .post(`/api/admin/polls/${poll._id}/publish`)
        .set("Cookie", cookie)
        .send({ clientGuid: "tab-A", title: "Real title" });
      expect(res.status, st).toBe(200);
    }
  });

  it("the lock holder can save choices", async () => {
    const poll = await openSession("INITIALIZED", "tab-A");
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ clientGuid: "tab-A", labels: ["Tea", "Coffee"] });
    expect(res.status).toBe(200);
  });

  it("a different tab cannot publish or save choices over the holder's session", async () => {
    const poll = await openSession("INITIALIZED", "tab-A");

    const hijackPublish = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ clientGuid: "tab-B", title: "Hijack" });
    expect(hijackPublish.status).toBe(409);

    const hijackChoices = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ clientGuid: "tab-B", labels: ["X", "Y"] });
    expect(hijackChoices.status).toBe(409);

    // The holder's session is intact.
    const after = (await polls(ctx).findOne({ _id: poll._id }))!;
    expect(after.pollState).toBe("EDITING");
    expect(after.pollEditUpdateClientGUID).toBe("tab-A");
    expect(after.title).not.toBe("Hijack");
  });

  it("choices submitted inside a session on a voted poll go to review by the merge, not into the poll", async () => {
    // EDITING-POLL-AVAILABLE US2 reverses 012 T050: the update surface accepts
    // `labels` and routes them through the by-id merge into pending_update.
    const poll = makePoll({ pollState: "OPEN" });
    await polls(ctx).insertOne(poll);
    await voteHistory(ctx).insertOne({
      pid: poll._id, emailAddress: "v@x.com", userName: "v", choiceIds: ["c1"], votedAt: new Date()
    });
    await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/edit-session`)
      .set("Cookie", cookie)
      .send({ clientGuid: "tab-A" });

    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ clientGuid: "tab-A", labels: ["Choice 1", "Y"] });
    expect(res.status).toBe(200);
    expect(res.body.pending).toBe(true);

    const after = (await polls(ctx).findOne({ _id: poll._id }))!;
    // The served list is unchanged until the review approves it...
    expect(after.choices.map((c) => c.label)).toEqual(["Choice 1", "Choice 2"]);
    // ...and the survivor keeps its id in the waiting list, so its votes follow it.
    expect(after.pendingUpdate!.choices!.map((c) => ({ id: c.id, label: c.label }))).toEqual([
      { id: "c1", label: "Choice 1" },
      { id: after.pendingUpdate!.choices![1]!.id, label: "Y" }
    ]);
    expect(after.pendingUpdate!.choices![1]!.id).not.toBe("c2");
  });
});

describe("Voting stays available while the creator edits (EDITING-POLL-AVAILABLE US1)", () => {
  let ctx: TestContext;
  let cookie: string;
  let users = 0;
  beforeAll(async () => {
    ctx = await startTestContext();
    ({ cookie } = await forgeSession(ctx, ctx.config.admins[0]!));
  });
  afterAll(async () => {
    await ctx.stop();
  });
  beforeEach(async () => {
    await polls(ctx).deleteMany({});
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
  });

  const open = (pid: string, clientGuid: string) =>
    request(ctx.app).post(`/api/admin/polls/${pid}/edit-session`).set("Cookie", cookie).send({ clientGuid });
  const reload = async (pid: string) => (await polls(ctx).findOne({ _id: pid }))!;
  const vote = async (pid: string, choiceIds: string[]) => {
    users += 1;
    const voter = await forgeSession(ctx, `avail-voter-${users}@example.com`);
    return request(ctx.app)
      .post(`/api/polls/${pid}/vote`)
      .set("Cookie", voter.cookie)
      .set("X-Forwarded-For", `10.9.0.${users}`)
      .send({ choiceIds });
  };

  it("an EDITING poll stashed from OPEN serves OPEN and accepts a counted vote (FR-001)", async () => {
    const poll = makePoll({ pollVisibility: "Public Poll", pollState: "OPEN" });
    await polls(ctx).insertOne(poll);
    await open(poll._id, "tab-A");

    // The projection and the listing treat the poll as OPEN...
    expect((await publicDetail(ctx, poll._id))!.pollState).toBe("OPEN");
    expect(await publicListing(ctx)).toContain(poll._id);

    // ...and a vote is accepted and counted while the editor is open.
    const res = await vote(poll._id, ["c1"]);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "recorded", voteCount: 1, choiceCounts: { c1: 1 } });
    expect(await ctx.consumer.runOnce()).toBe(1);
    const rows = await ctx.db.selectFrom("votes").selectAll().where("poll_id", "=", poll._id).execute();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.choice_ids).toEqual(["c1"]);

    // The raw state stays EDITING for the session, its heartbeat and the admin views.
    expect((await reload(poll._id)).pollState).toBe("EDITING");
  });

  it("the per-viewer overlay reports no vote block while the creator edits", async () => {
    const poll = makePoll({ pollVisibility: "Public Poll", pollState: "OPEN" });
    await polls(ctx).insertOne(poll);
    await open(poll._id, "tab-A");

    const viewer = await forgeSession(ctx, "overlay-viewer@example.com");
    await addBookmark(ctx, "overlay-viewer@example.com", poll._id, 200);
    const res = await request(ctx.app).post("/api/tabs/watching/refresh").set("Cookie", viewer.cookie).send({});
    expect(res.status).toBe(200);
    expect(res.body.cards[poll._id].overlay.voteBlockedReason ?? null).toBeNull();
  });

  it("a poll stashed from CLOSED still refuses a vote", async () => {
    const poll = makePoll({ pollState: "CLOSED" });
    await polls(ctx).insertOne(poll);
    await open(poll._id, "tab-A");
    expect((await publicDetail(ctx, poll._id))!.pollState).toBe("CLOSED");
    const res = await vote(poll._id, ["c1"]);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/not open for voting/i);
  });

  it("the grant carries the live per-choice counts at session start (A1)", async () => {
    const when = new Date();
    const poll = makePoll({
      pollState: "OPEN",
      currentVotes: [
        { emailAddress: "v1@example.com", userName: "v1", choiceIds: ["c1"], votedAt: when },
        { emailAddress: "v2@example.com", userName: "v2", choiceIds: ["c1"], votedAt: when }
      ]
    });
    await polls(ctx).insertOne(poll);
    const res = await open(poll._id, "tab-A");
    expect(res.status).toBe(200);
    expect(res.body.choiceCounts).toEqual({ c1: 2, c2: 0 });
  });

  it("the session stays exclusive and still expires to the stashed state (FR-002)", async () => {
    const poll = makePoll({ pollState: "OPEN" });
    await polls(ctx).insertOne(poll);
    await open(poll._id, "tab-A");

    const second = await open(poll._id, "tab-B");
    expect(second.status).toBe(409);
    expect(second.body.reason).toBe("LOCKED");

    const now = new Date();
    await polls(ctx).updateOne(
      { _id: poll._id },
      { $set: { pollEditUpdateHeartbeatTimestamp: new Date(now.getTime() - HEARTBEAT_MS * 2 - 1) } }
    );
    expect(await staleEditUpdateSweep(ctx, HEARTBEAT_MS, now)).toBe(1);
    const after = await reload(poll._id);
    expect(after.pollState).toBe("OPEN");
    expect(after.pollEditUpdateClientGUID).toBeNull();
  });
});
