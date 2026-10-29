import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { findPoll, insertPoll, recordVote, updatePoll } from "../src/polls/store.js";
import { addBookmark, removeBookmark, removeExpiredBookmarks } from "../src/polls/bookmarks.js";
import { castVote } from "../src/votes/votePath.js";
import { addInvitees, markAccepted, removeInvitees } from "../src/invitations/invitations.js";
import { resolveSharedLink } from "../src/polls/sharedLink.js";
import { sendPendingInvitations } from "../src/invitations/sender.js";
import { readVersion } from "../src/refresh/tabVersions.js";

let ctx: TestContext;
let cookie: string;
let userId: string;
const me = "signals-reader@example.com";
const creator = { id: "", email: "signals-creator@example.com", name: "Creator" };

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1" });
  const session = await forgeSession(ctx, me);
  cookie = session.cookie;
  userId = session.userId;
  creator.id = (await forgeSession(ctx, creator.email)).userId;
});
afterAll(async () => {
  await ctx.stop();
});
beforeEach(async () => {
  await polls(ctx).deleteMany({});
  await ctx.consumer.runOnce();
});

type Body = { membershipVersion: string | null; versions: Record<string, [number, number]> };

const refresh = async (name: string, body: Partial<Body> = {}) => {
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
  return request(ctx.app).post(`/api/tabs/${name}/refresh`).set("Cookie", cookie).send(body);
};

function held(previous: Body, res: request.Response): Body {
  if (res.status === 304) return previous;
  const versions: Record<string, [number, number]> = {};
  for (const pid of res.body.order ?? Object.keys(previous.versions)) {
    const card = res.body.cards?.[pid];
    const counter = res.body.counters?.[pid];
    const before = previous.versions[pid] ?? [0, 0];
    versions[pid] = [card ? card.contentVersion : before[0], counter ? counter.countsVersion : before[1]];
  }
  return { membershipVersion: res.body.membershipVersion, versions };
}

/** Refreshes until the tab is answered by the shortcut, so the next change must be signalled to be seen. */
async function settled(name: string): Promise<Body> {
  let state = held({ membershipVersion: null, versions: {} }, await refresh(name));
  const again = await refresh(name, state);
  state = held(state, again);
  expect((await refresh(name, state)).status).toBe(304);
  return state;
}

const seed = async (overrides: Parameters<typeof makePoll>[0] = {}, owner?: typeof creator) => {
  const poll = makePoll({ _id: randomUUID(), ...overrides });
  await insertPoll(ctx, poll, owner);
  return poll;
};
const invitationOnly = (overrides: Parameters<typeof makePoll>[0] = {}) =>
  seed({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", ...overrides }, creator);
const orderAfter = async (name: string, state: Body) => (await refresh(name, state)).body.order;

describe("every change to a user's list reaches the next refresh", () => {
  it("a vote written by the consumer (Your Votes)", async () => {
    const poll = await seed();
    const state = await settled("your-votes");
    await castVote(ctx, { sessionId: "s-me", email: me, userName: "", ip: "10.7.0.1", pid: poll._id, choiceIds: ["c1"] });
    await ctx.consumer.runOnce();
    expect(await orderAfter("your-votes", state)).toEqual([poll._id]);
  });

  it("a bookmark added, removed and removed by the expiry sweep (Watching)", async () => {
    const poll = await seed();
    let state = await settled("watching");
    await addBookmark(ctx, me, poll._id, 200);
    expect(await orderAfter("watching", state)).toEqual([poll._id]);
    state = await settled("watching");
    await removeBookmark(ctx, me, poll._id);
    expect(await orderAfter("watching", state)).toEqual([]);

    await addBookmark(ctx, me, poll._id, 200);
    state = await settled("watching");
    const later = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000);
    expect(await removeExpiredBookmarks(ctx, 6, later)).toBe(1);
    expect(await orderAfter("watching", state)).toEqual([]);
  });

  it("a poll created (Your Polls)", async () => {
    const state = await settled("your-polls");
    const poll = await seed({}, { id: userId, email: me, name: "Me" });
    expect(await orderAfter("your-polls", state)).toEqual([poll._id]);
  });

  it("an invitation added, adopted from a +tag address, and removed (Shared With You)", async () => {
    const poll = await invitationOnly();
    const fresh = async () => (await findPoll(ctx.db, poll._id))!;
    let state = await settled("shared-with-you");
    await addInvitees(ctx, await fresh(), "signals-reader+club@example.com", creator.id);
    expect(await orderAfter("shared-with-you", state)).toEqual([poll._id]);
    expect((await fresh()).invitedVoterList).toEqual([me]);

    state = await settled("shared-with-you");
    await removeInvitees(ctx, await fresh(), [me], true);
    expect(await orderAfter("shared-with-you", state)).toEqual([]);
  });

  it("a ban added and a ban removed (the card's vote-blocked reason)", async () => {
    const poll = await seed();
    await recordVote(ctx, poll._id, { emailAddress: me, userName: "", choiceIds: ["c1"], votedAt: new Date() });
    let state = await settled("your-votes");
    await updatePoll(ctx, poll._id, { bannedVoterList: [me] });
    let res = await refresh("your-votes", state);
    expect(res.body.cards[poll._id].overlay.voteBlockedReason).toMatch(/removed from this poll/);
    state = held(state, res);
    expect((await refresh("your-votes", state)).status).toBe(304);
    await updatePoll(ctx, poll._id, { bannedVoterList: [] });
    res = await refresh("your-votes", state);
    expect(res.body.cards[poll._id].overlay.voteBlockedReason).toBeNull();
  });

  it("a voted relation removed with the vote", async () => {
    const poll = await seed();
    await recordVote(ctx, poll._id, { emailAddress: me, userName: "", choiceIds: ["c1"], votedAt: new Date() });
    const state = await settled("your-votes");
    await updatePoll(ctx, poll._id, { currentVotes: [] });
    expect(await orderAfter("your-votes", state)).toEqual([]);
  });

  it("a poll opened by its shared link (Shared With You)", async () => {
    const poll = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link" }, creator);
    const state = await settled("shared-with-you");
    await resolveSharedLink(ctx, { id: userId, email: me, permissions: ["View Polls", "Vote on Polls"] }, poll._id);
    expect(await orderAfter("shared-with-you", state)).toEqual([poll._id]);
  });

  it("sending, reminding or marking an invitation accepted does not count as a change", async () => {
    const poll = await invitationOnly({ invitedVoterList: [me] });
    await settled("shared-with-you");
    expect(await readVersion(ctx.cache, me)).not.toBeNull();
    await sendPendingInvitations(ctx, poll._id);
    await ctx.db.updateTable("poll_invitations").set({ accepted_at: null }).where("poll_id", "=", poll._id).execute();
    await markAccepted(ctx.db, poll._id, me);
    expect(await readVersion(ctx.cache, me)).not.toBeNull();
  });
});
