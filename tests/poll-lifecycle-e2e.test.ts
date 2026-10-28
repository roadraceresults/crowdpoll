/**
 * 011 quickstart Part 2, as an executable walkthrough: one poll driven through
 * the whole lifecycle over the real HTTP API and the real sweeps.
 *
 * The browser-only steps (the confirm dialogs, the tab-close prompt) are not
 * reachable from here and stay manual; everything else is asserted.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { startTestContext, forgeSession, type TestContext } from "./helpers/setup.js";
import { polls, publicListing, voteHistory } from "./helpers/poll-fixtures.js";
import { pollsAwaitingApprovalSweep, pollDateCheckSweep, staleEditUpdateSweep } from "../src/polls/sweeps.js";

const DEPS = { maxAttempts: 10, callTimeoutMs: 10_000 };

describe("A poll's whole life (011 quickstart Part 2)", () => {
  let ctx: TestContext;
  let cookie: string;
  let pid: string;

  beforeAll(async () => {
    ctx = await startTestContext();
    ({ cookie } = await forgeSession(ctx, ctx.config.admins[0]!));
    await polls(ctx).deleteMany({});
    await voteHistory(ctx).deleteMany({});
  });
  afterAll(async () => {
    await ctx.stop();
  });

  const admin = (m: "get" | "post" | "patch" | "delete", path: string) =>
    request(ctx.app)[m](path).set("Cookie", cookie);
  const state = async () => (await polls(ctx).findOne({ _id: pid }))!.pollState;
  const publicList = () => publicListing(ctx);

  it("A1: a new poll is INITIALIZED and invisible to the public", async () => {
    const created = await admin("post", "/api/admin/polls");
    expect(created.status).toBe(201);
    pid = created.body.pid;
    expect(await state()).toBe("INITIALIZED");
    expect(await publicList()).not.toContain(pid);
  });

  it("A2: the edit surface grants EDIT and takes the lock", async () => {
    const session = await admin("post", `/api/admin/polls/${pid}/edit-session`).send({ clientGuid: "tab-1" });
    expect(session.status).toBe(200);
    expect(session.body.mode).toBe("EDIT");
    expect(await state()).toBe("EDITING");
    expect(await publicList()).not.toContain(pid);
  });

  it("A3: publishing with the starter choices is held back", async () => {
    const held = await admin("post", `/api/admin/polls/${pid}/publish`).send({
      clientGuid: "tab-1",
      title: "Best biscuit?",
      subtitle: "Pick one"
    });
    expect(held.status).toBe(200);
    expect(held.body.message).toMatch(/default values/i);
    expect(await state()).toBe("INITIALIZED");
  });

  it("A4: with real choices it reaches AWAITING APPROVAL, still not public", async () => {
    await admin("post", `/api/admin/polls/${pid}/edit-session`).send({ clientGuid: "tab-2" });
    // 012 US4: one save covers the whole poll. This used to be two calls — the choice
    // list to its own route, then everything else to publish — which is precisely the
    // partial-save window the consolidation removes.
    const published = await admin("post", `/api/admin/polls/${pid}/publish`).send({
      clientGuid: "tab-2",
      title: "Best biscuit?",
      labels: ["Hobnob", "Digestive", "Bourbon"]
    });
    expect(published.status).toBe(200);
    expect(await state()).toBe("AWAITING APPROVAL");
    expect(await publicList()).not.toContain(pid);
  });

  it("A5: screening approves it and the schedule opens it", async () => {
    expect(await pollsAwaitingApprovalSweep(ctx, DEPS)).toBe(1);
    expect(await state()).toBe("OPEN");
    expect(await publicList()).toContain(pid);
  });

  it("E: a vote is accepted while OPEN", async () => {
    const poll = (await polls(ctx).findOne({ _id: pid }))!;
    const { cookie: voter } = await forgeSession(ctx, "voter@example.com");
    const res = await request(ctx.app)
      .post(`/api/polls/${pid}/vote`)
      .set("Cookie", voter)
      .send({ choiceIds: [poll.choices[0]!.id] });
    expect(res.status).toBe(200);
    await ctx.consumer.runOnce();
    expect(await voteHistory(ctx).countDocuments({ pid })).toBe(1);
  });

  it("F: now that it has a vote, only the update surface is offered", async () => {
    const session = await admin("post", `/api/admin/polls/${pid}/edit-session`).send({ clientGuid: "tab-3" });
    expect(session.body.mode).toBe("UPDATE");
    // ...and choices are immutable.
    // Sends the lock holder's guid so the refusal comes from the field check rather
    // than from the lock — the point being that holding the lock does not make
    // choices editable once a poll has been voted on.
    const refused = await admin("post", `/api/admin/polls/${pid}/publish`).send({
      clientGuid: "tab-3",
      labels: ["A", "B"]
    });
    // 012 T050: refused by publish's UPDATE-mode field check (400) now that the
    // dedicated choices route is gone.
    expect(refused.status).toBe(400);
    await admin("delete", `/api/admin/polls/${pid}/edit-session`).send({ clientGuid: "tab-3" });
  });

  it("C: an abandoned session frees itself within the bounded time", async () => {
    await admin("post", `/api/admin/polls/${pid}/edit-session`).send({ clientGuid: "tab-gone" });
    expect(await state()).toBe("EDITING");

    const now = new Date();
    await polls(ctx).updateOne(
      { _id: pid },
      { $set: { pollEditUpdateHeartbeatTimestamp: new Date(now.getTime() - 20_001) } }
    );
    expect(await staleEditUpdateSweep(ctx, 10_000, now)).toBe(1);
    expect(await state()).toBe("OPEN");
  });

  it("B: the schedule closes it, and the vote survives", async () => {
    await admin("post", `/api/admin/polls/${pid}/edit-session`).send({ clientGuid: "tab-4" });
    const past = new Date(Date.now() - 60_000);
    const pub = await admin("post", `/api/admin/polls/${pid}/publish`).send({
      clientGuid: "tab-4",
      endAt: past.toISOString()
    });
    expect(pub.status).toBe(200);
    await pollsAwaitingApprovalSweep(ctx, DEPS);
    await pollDateCheckSweep(ctx);
    expect(await state()).toBe("CLOSED");
    expect((await polls(ctx).findOne({ _id: pid }))!.currentVotes).toHaveLength(1);
  });

  it("E2: a vote from a stale page is refused once closed", async () => {
    const poll = (await polls(ctx).findOne({ _id: pid }))!;
    const { cookie: voter } = await forgeSession(ctx, "late@example.com");
    const res = await request(ctx.app)
      .post(`/api/polls/${pid}/vote`)
      .set("Cookie", voter)
      .send({ choiceIds: [poll.choices[0]!.id] });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/not open for voting/i);
  });

  it("G: archiving is offered only from CLOSED, and is terminal", async () => {
    const archived = await admin("patch", `/api/admin/polls/${pid}`).send({ pollState: "ARCHIVED" });
    expect(archived.status).toBe(200);
    expect(await state()).toBe("ARCHIVED");
    expect(await publicList()).not.toContain(pid);
    expect((await polls(ctx).findOne({ _id: pid }))!.currentVotes).toHaveLength(1);

    const again = await admin("patch", `/api/admin/polls/${pid}`).send({ pollState: "CLOSED" });
    expect(again.status).toBe(409);
  });

  it("G2: an archived poll offers neither edit nor update, but can be deleted", async () => {
    const [row] = (await admin("get", "/api/admin/polls")).body.polls;
    expect(row.canEdit).toBe(false);
    expect(row.canUpdate).toBe(false);
    expect(row.canDelete).toBe(true);

    expect((await admin("delete", `/api/admin/polls/${pid}`)).status).toBe(204);
    expect(await polls(ctx).findOne({ _id: pid })).toBeNull();
  });

  it("Part 4: the stored shape carries no reconciliation field (SC-014)", async () => {
    const fresh = await admin("post", "/api/admin/polls");
    const doc = (await polls(ctx).findOne({ _id: fresh.body.pid }))!;
    const json = JSON.stringify(doc);
    expect(json).not.toContain('"removed"');
    expect(doc.pollState).toBe("INITIALIZED");
    for (const field of [
      "pollStateBeforeEditUpdate",
      "pollEditUpdateHeartbeatTimestamp",
      "pollEditUpdateClientGUID",
      "pollApprovalTimestamp",
      "pollRejectionReason"
    ]) {
      expect(doc, field).toHaveProperty(field, null);
    }
    expect(doc.pollAcceptabilityScreeningAttempts).toBe(0);
  });
});
