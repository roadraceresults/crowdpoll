import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearPolls, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { findPoll, updatePoll, type Poll } from "../src/polls/store.js";
import { listInvitees } from "../src/invitations/invitations.js";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestContext();
});

afterAll(async () => {
  await ctx.stop();
});

beforeEach(async () => {
  await clearPolls(ctx);
});

function invitationPoll(overrides: Partial<Poll> = {}): Poll {
  return makePoll({
    pollState: "OPEN",
    pollVisibility: "Private Poll",
    pollSharingMode: "Invitation Only",
    ...overrides
  });
}

async function rows(pid: string) {
  return ctx.db
    .selectFrom("poll_invitations")
    .select(["email", "position", "sent_at", "accepted_at"])
    .where("poll_id", "=", pid)
    .orderBy("position")
    .execute();
}

describe("writeRoster keeps invitation state", () => {
  it("keeps sent_at and accepted_at across a rewrite of the list, and keeps the order", async () => {
    const poll = invitationPoll({ invitedVoterList: ["a@example.org", "b@example.org"] });
    await polls(ctx).insertOne(poll);
    const sentAt = new Date("2026-10-20T10:00:00Z");
    const acceptedAt = new Date("2026-10-21T10:00:00Z");
    await ctx.db
      .updateTable("poll_invitations")
      .set({ sent_at: sentAt, accepted_at: acceptedAt })
      .where("poll_id", "=", poll._id)
      .where("email", "=", "a@example.org")
      .execute();

    await updatePoll(ctx, poll._id, { invitedVoterList: ["c@example.org", "a@example.org"] });

    const after = await rows(poll._id);
    expect(after.map((r) => [r.email, r.position])).toEqual([
      ["c@example.org", 0],
      ["a@example.org", 1]
    ]);
    const a = after.find((r) => r.email === "a@example.org")!;
    expect(new Date(a.sent_at!).getTime()).toBe(sentAt.getTime());
    expect(new Date(a.accepted_at!).getTime()).toBe(acceptedAt.getTime());
    const c = after.find((r) => r.email === "c@example.org")!;
    expect(c.sent_at).toBeNull();
    expect(c.accepted_at).toBeNull();
  });

  it("writes history for a removed invitation that had been emailed, and none for one that had not", async () => {
    const poll = invitationPoll({ invitedVoterList: ["sent@example.org", "pending@example.org"] });
    await polls(ctx).insertOne(poll);
    const sentAt = new Date("2026-10-20T10:00:00Z");
    await ctx.db.updateTable("poll_invitations").set({ sent_at: sentAt }).where("email", "=", "sent@example.org").execute();

    await updatePoll(ctx, poll._id, { invitedVoterList: [] });

    const history = await ctx.db.selectFrom("invitation_history").selectAll().execute();
    expect(history).toHaveLength(1);
    expect(history[0]!.email_key).toBe("sent@example.org");
    expect(new Date(history[0]!.sent_at!).getTime()).toBe(sentAt.getTime());
  });
});

describe("listInvitees", () => {
  it("derives each status in precedence order and counts accepted and voted", async () => {
    const poll = invitationPoll({
      invitedVoterList: ["voted@example.org", "accepted@example.org", "failed@example.org", "invited@example.org", "pending@example.org"],
      currentVotes: [
        { emailAddress: "voted@example.org", userName: "Vee", choiceIds: ["c1"], votedAt: new Date() },
        { emailAddress: "accepted@example.org", userName: "", choiceIds: [], votedAt: null }
      ]
    });
    await polls(ctx).insertOne(poll);
    const now = new Date();
    const set = (email: string, values: Record<string, Date>) =>
      ctx.db.updateTable("poll_invitations").set(values).where("poll_id", "=", poll._id).where("email", "=", email).execute();
    await set("voted@example.org", { sent_at: now });
    await set("accepted@example.org", { sent_at: now, accepted_at: now, send_failed_at: now });
    await set("failed@example.org", { sent_at: now, send_failed_at: now });
    await set("invited@example.org", { sent_at: now });

    const list = await listInvitees(ctx.db, (await findPoll(ctx.db, poll._id))!, ctx.config);

    expect(list.invitees.map((i) => [i.email, i.status])).toEqual([
      ["voted@example.org", "Voted"],
      ["accepted@example.org", "Accepted"],
      ["failed@example.org", "Not delivered"],
      ["invited@example.org", "Invited"],
      ["pending@example.org", "Not sent yet"]
    ]);
    expect(list.invitationCount).toBe(5);
    expect(list.acceptedCount).toBe(2);
    expect(list.voterLimit).toBe(poll.voterCountLimit ?? ctx.config.privateVoterLimitDefault);
    expect(list.editable).toBe(true);
  });

  it("gives the reminder rule's reasons in order", async () => {
    const poll = invitationPoll({ invitedVoterList: ["fresh@example.org", "old@example.org", "reminded@example.org", "failed@example.org"] });
    await polls(ctx).insertOne(poll);
    const now = new Date();
    const old = new Date(now.getTime() - 25 * 3_600_000);
    const set = (email: string, values: Record<string, Date>) =>
      ctx.db.updateTable("poll_invitations").set(values).where("poll_id", "=", poll._id).where("email", "=", email).execute();
    await set("fresh@example.org", { sent_at: now });
    await set("old@example.org", { sent_at: old });
    await set("reminded@example.org", { sent_at: old, reminded_at: old });
    await set("failed@example.org", { sent_at: now, send_failed_at: now });

    const open = await listInvitees(ctx.db, (await findPoll(ctx.db, poll._id))!, ctx.config, now);
    expect(Object.fromEntries(open.invitees.map((i) => [i.email, i.resendBlockedReason]))).toEqual({
      "fresh@example.org": "fresh@example.org was emailed less than 24 hours ago.",
      "old@example.org": null,
      "reminded@example.org": "Already reminded once.",
      "failed@example.org": null
    });

    const editing = await listInvitees(ctx.db, { ...(await findPoll(ctx.db, poll._id))!, pollState: "EDITING" }, ctx.config, now);
    expect(new Set(editing.invitees.map((i) => i.resendBlockedReason))).toEqual(new Set(["The poll is not open."]));

    const closed = await listInvitees(ctx.db, { ...(await findPoll(ctx.db, poll._id))!, pollState: "CLOSED" }, ctx.config, now);
    expect(new Set(closed.invitees.map((i) => i.resendBlockedReason))).toEqual(new Set(["The poll is closed."]));
    expect(closed.editable).toBe(false);
  });
});
