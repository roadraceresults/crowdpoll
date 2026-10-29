import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { deletePoll, insertPoll, recordVote, updatePoll } from "../src/polls/store.js";
import { addBookmark } from "../src/polls/bookmarks.js";
import { castVote } from "../src/votes/votePath.js";
import { deleteAccount } from "../src/legal/deleteAccount.js";
import { POLL_PROJECTION_KEY } from "../src/polls/versions.js";
import { TAB_SEEN_KEY, TAB_VERSION_KEY, TABS_FAST_KEY, TABS_FULL_KEY } from "../src/refresh/tabVersions.js";

let ctx: TestContext;
let cookie: string;
let userId: string;
const me = "shortcut-reader@example.com";
const TABLES = /"(polls|user_polls|votes|bookmarks|poll_invitations|poll_bans)"/;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1" });
  const session = await forgeSession(ctx, me);
  cookie = session.cookie;
  userId = session.userId;
});
afterAll(async () => {
  await ctx.stop();
});
beforeEach(async () => {
  await polls(ctx).deleteMany({});
});
afterEach(() => {
  vi.restoreAllMocks();
});

type Body = { membershipVersion: string | null; versions: Record<string, [number, number]> };

const refresh = async (name: string, body: Partial<Body> = {}) => {
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
  return request(ctx.app).post(`/api/tabs/${name}/refresh`).set("Cookie", cookie).send(body);
};

/** What a browser holds after applying an answer to what it held before. */
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

const tableQueries = async (run: () => Promise<request.Response>) => {
  const before = ctx.queries.length;
  const res = await run();
  return { res, queries: ctx.queries.slice(before).filter((q) => TABLES.test(q)) };
};

const statOf = async (key: string) => Number((await ctx.cache.get(key)) ?? 0);

const seed = async (overrides: Parameters<typeof makePoll>[0] = {}, creator?: { id: string; email: string; name: string }) => {
  const poll = makePoll({ _id: randomUUID(), ...overrides });
  await insertPoll(ctx, poll, creator);
  return poll;
};

const tabs = {
  "your-polls": () => seed({}, { id: userId, email: me, name: "Me" }),
  "shared-with-you": () => seed({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: [me] }),
  "your-votes": async () => {
    const poll = await seed();
    await recordVote(ctx, poll._id, { emailAddress: me, userName: "", choiceIds: ["c1"], votedAt: new Date() });
    return poll;
  },
  watching: async () => {
    const poll = await seed();
    await addBookmark(ctx, me, poll._id, 200);
    return poll;
  }
} as const;

describe("the personal-tab shortcut", () => {
  for (const [name, list] of Object.entries(tabs)) {
    it(`answers an unchanged ${name} with 304 and no database query`, async () => {
      const poll = await list();
      const first = await refresh(name);
      expect(first.body.order).toEqual([poll._id]);
      const fast = await statOf(TABS_FAST_KEY);
      const { res, queries } = await tableQueries(() => refresh(name, held({ membershipVersion: null, versions: {} }, first)));
      expect(res.status).toBe(304);
      expect(queries).toEqual([]);
      expect(await statOf(TABS_FAST_KEY)).toBe(fast + 1);
    });
  }

  it("sends only the moved counters when someone else votes, still without the database", async () => {
    const poll = await tabs["your-votes"]();
    const first = await refresh("your-votes");
    const state = held({ membershipVersion: null, versions: {} }, first);
    await castVote(ctx, { sessionId: "s-other", email: "other@example.com", userName: "other", ip: "10.8.0.1", pid: poll._id, choiceIds: ["c2"] });
    const { res, queries } = await tableQueries(() => refresh("your-votes", state));
    expect(res.status).toBe(200);
    expect(res.body.cards).toEqual({});
    expect(res.body.order).toBeUndefined();
    expect(res.body.counters[poll._id].voteCount).toBe(first.body.counters[poll._id].voteCount + 1);
    expect(queries).toEqual([]);
  });

  it("builds a full answer when the list version or the record of the last answer is gone", async () => {
    await tabs["your-votes"]();
    const state = held({ membershipVersion: null, versions: {} }, await refresh("your-votes"));
    await ctx.cache.del(TAB_VERSION_KEY(me));
    const full = await statOf(TABS_FULL_KEY);
    const afterVersion = await tableQueries(() => refresh("your-votes", state));
    expect(afterVersion.queries.length).toBeGreaterThan(0);
    expect(await statOf(TABS_FULL_KEY)).toBe(full + 1);
    await ctx.cache.del(TAB_SEEN_KEY(me, "your-votes"));
    const afterSeen = await tableQueries(() => refresh("your-votes", state));
    expect(afterSeen.queries.length).toBeGreaterThan(0);
  });

  it("still answers empty without View Polls", async () => {
    await tabs["your-votes"]();
    const state = held({ membershipVersion: null, versions: {} }, await refresh("your-votes"));
    await ctx.db.updateTable("user").set({ permissions: ["Vote on Polls"] }).where("id", "=", userId).execute();
    await ctx.sessions.forgetUserSessions(userId);
    try {
      expect((await refresh("your-votes", state)).body.order).toEqual([]);
    } finally {
      await ctx.db.updateTable("user").set({ permissions: ["View Polls", "Vote on Polls", "Create Poll"] }).where("id", "=", userId).execute();
      await ctx.sessions.forgetUserSessions(userId);
    }
  });
});

describe("what the shortcut must still notice", () => {
  it("returns the edited card after the creator changes the title", async () => {
    const poll = await tabs["your-votes"]();
    const state = held({ membershipVersion: null, versions: {} }, await refresh("your-votes"));
    await updatePoll(ctx, poll._id, { title: "Edited title" });
    const res = await refresh("your-votes", state);
    expect(res.status).toBe(200);
    expect(res.body.cards[poll._id].title).toBe("Edited title");
  });

  it("brings back a watched poll that regains access through its own content change", async () => {
    const poll = await tabs.watching();
    let state = held({ membershipVersion: null, versions: {} }, await refresh("watching"));
    await updatePoll(ctx, poll._id, { pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" });
    let res = await refresh("watching", state);
    expect(res.body.order).toEqual([]);
    state = held(state, res);
    expect((await refresh("watching", state)).status).toBe(304);
    await updatePoll(ctx, poll._id, { pollVisibility: "Public Poll", pollSharingMode: "Anyone With The Link" });
    res = await refresh("watching", state);
    expect(res.body.order).toEqual([poll._id]);
  });

  it("drops a poll deleted by its creator or with its creator's account", async () => {
    const creator = await forgeSession(ctx, "shortcut-creator@example.com");
    const owner = { id: creator.userId, email: "shortcut-creator@example.com", name: "Creator" };
    const [deleted, withAccount] = [await seed({}, owner), await seed({}, owner)];
    for (const poll of [deleted, withAccount]) {
      await recordVote(ctx, poll._id, { emailAddress: me, userName: "", choiceIds: ["c1"], votedAt: new Date() });
    }
    let state = held({ membershipVersion: null, versions: {} }, await refresh("your-votes"));
    expect(Object.keys(state.versions).sort()).toEqual([deleted._id, withAccount._id].sort());

    await deletePoll(ctx, deleted._id);
    expect(await ctx.cache.get(POLL_PROJECTION_KEY(deleted._id))).toBeNull();
    let res = await refresh("your-votes", state);
    expect(res.body.order).toEqual([withAccount._id]);
    state = held(state, res);

    await deleteAccount(ctx, { id: creator.userId, email: owner.email });
    res = await refresh("your-votes", state);
    expect(res.body.order).toEqual([]);
  });

  it("neither adopts nor accepts invitations on a Shared With You shortcut", async () => {
    const poll = await tabs["shared-with-you"]();
    const state = held({ membershipVersion: null, versions: {} }, await refresh("shared-with-you"));
    await ctx.db.updateTable("poll_invitations").set({ accepted_at: null }).where("poll_id", "=", poll._id).execute();
    expect((await refresh("shared-with-you", state)).status).toBe(304);
    const row = await ctx.db.selectFrom("poll_invitations").select("accepted_at").where("poll_id", "=", poll._id).executeTakeFirstOrThrow();
    expect(row.accepted_at).toBeNull();
  });
});

describe("projection writes", () => {
  it("writes, in one call, only the projections missing or older than their row", async () => {
    const [kept, missing, stale] = [await tabs["your-votes"](), await tabs["your-votes"](), await tabs["your-votes"]()];
    await ctx.cache.del(POLL_PROJECTION_KEY(missing._id));
    const old = JSON.parse((await ctx.cache.get(POLL_PROJECTION_KEY(stale._id)))!);
    await ctx.cache.set(POLL_PROJECTION_KEY(stale._id), JSON.stringify({ ...old, contentVersion: 0 }));
    const setMany = vi.spyOn(ctx.cache, "setMany");
    const set = vi.spyOn(ctx.cache, "set");
    await refresh("your-votes");
    expect(setMany).toHaveBeenCalledTimes(1);
    expect(setMany.mock.calls[0]![0].map((e) => e.key).sort()).toEqual([POLL_PROJECTION_KEY(missing._id), POLL_PROJECTION_KEY(stale._id)].sort());
    expect(set.mock.calls.some(([key]) => key.startsWith("poll:"))).toBe(false);
    expect(await ctx.cache.get(POLL_PROJECTION_KEY(kept._id))).not.toBeNull();
  });

  it("does the same for a search", async () => {
    const [kept, missing] = [await seed({ title: "Lighthouse keepers" }), await seed({ title: "Lighthouse painters" })];
    await ctx.cache.del(POLL_PROJECTION_KEY(missing._id));
    const setMany = vi.spyOn(ctx.cache, "setMany");
    const res = await request(ctx.app).post("/api/search").send({ q: "lighthouse" });
    expect(res.body.results.map((r: { pid: string }) => r.pid).sort()).toEqual([kept._id, missing._id].sort());
    expect(setMany).toHaveBeenCalledTimes(1);
    expect(setMany.mock.calls[0]![0].map((e) => e.key)).toEqual([POLL_PROJECTION_KEY(missing._id)]);
  });
});

describe("SC-001", () => {
  it("answers 100 unchanged refreshes of a 200-poll tab without the database, each under 50 ms at the server", async () => {
    const owner = { id: userId, email: me, name: "Me" };
    for (let i = 0; i < 200; i++) await seed({ title: `Mine ${i}` }, owner);
    const first = await refresh("your-polls");
    expect(first.body.order).toHaveLength(200);
    const state = held({ membershipVersion: null, versions: {} }, first);
    const times: number[] = [];
    const before = ctx.queries.length;
    for (let i = 0; i < 100; i++) {
      const started = performance.now();
      const res = await refresh("your-polls", state);
      times.push(performance.now() - started);
      expect(res.status).toBe(304);
    }
    expect(ctx.queries.slice(before).filter((q) => TABLES.test(q))).toEqual([]);
    times.sort((a, b) => a - b);
    const median = times[49]!;
    const p95 = times[94]!;
    console.log(`[SC-001] 100 shortcut refreshes of 200 polls: median ${median.toFixed(1)} ms, p95 ${p95.toFixed(1)} ms`);
    expect(p95).toBeLessThan(50);
  }, 120_000);
});
