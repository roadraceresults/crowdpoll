/**
 * A voter adds a choice to a Private poll: who may, when, what is refused, and what
 * every other reader then sees.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { startTestContext, forgeSession, type TestContext } from "./helpers/setup.js";
import { makePoll, polls, voteHistory } from "./helpers/poll-fixtures.js";
import { upsertRelation } from "../src/polls/userPolls.js";
import { POLL_PROJECTION_KEY } from "../src/polls/versions.js";
import type { Poll } from "../src/polls/store.js";

const screening = vi.hoisted(() => ({ fail: false }));
vi.mock("../src/polls/screening.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/polls/screening.js")>();
  return {
    ...actual,
    screenWithTimeout: (...args: Parameters<typeof actual.screenWithTimeout>) =>
      screening.fail ? Promise.reject(new actual.ScreeningTimeoutError("too slow")) : actual.screenWithTimeout(...args)
  };
});

let ctx: TestContext;
let users = 0;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_VOTE_REFRESH_INTERVAL: "1000", ENV_MAX_CHOICES: "4", ENV_MAX_PRIVATE_POLL_VOTERS: "3" });
});

afterAll(async () => {
  await ctx.stop();
});

beforeEach(async () => {
  screening.fail = false;
  await polls(ctx).deleteMany({});
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
  for (const key of await ctx.cache.scan("votes-ip:*")) await ctx.cache.del(key);
});

async function person(permissions?: string[]) {
  const email = `adder${users++}@example.com`;
  const forged = await forgeSession(ctx, email);
  if (permissions) await ctx.db.updateTable("user").set({ permissions }).where("id", "=", forged.userId).execute();
  return { ...forged, email };
}

const privatePoll = (overrides: Partial<Poll> = {}) =>
  makePoll({
    pollVisibility: "Private Poll",
    pollSharingMode: "Anyone With The Link",
    voteMutability: "Dynamic-Vote Poll",
    votersAddChoices: true,
    ...overrides
  });

async function seed(poll: Poll, ...linked: { email: string }[]) {
  await polls(ctx).insertOne(poll);
  for (const who of linked) await upsertRelation(ctx.db, who.email, poll._id, "linked");
  return poll;
}

const add = (pid: string, cookie: string | null, label: unknown) => {
  let req = request(ctx.app).post(`/api/polls/${pid}/choices`).set("X-Forwarded-For", `10.1.0.${users}`);
  if (cookie) req = req.set("Cookie", cookie);
  return req.send({ label });
};

const stored = async (pid: string) =>
  ctx.db.selectFrom("polls").select(["choices", "content_version"]).where("id", "=", pid).executeTakeFirstOrThrow();

describe("POST /api/polls/:pid/choices", () => {
  it("appends the choice last, with no colour and no adder in the answer, and bumps the content version", async () => {
    const voter = await person();
    const poll = await seed(privatePoll({ choices: [{ id: "c1", label: "Pizza", position: 0, color: "#FFE5AD" }, { id: "c2", label: "Sushi", position: 1 }] }), voter);
    const before = await stored(poll._id);
    const res = await add(poll._id, voter.cookie, "  Tacos ");
    expect(res.status).toBe(200);
    expect(res.body.choices.map((c: { label: string }) => c.label)).toEqual(["Pizza", "Sushi", "Tacos"]);
    const added = res.body.choices[2];
    expect(added).toEqual({ id: expect.any(String), label: "Tacos", position: 2 });
    expect(JSON.stringify(res.body)).not.toContain("addedBy");
    expect(res.body.contentVersion).toBe(before.content_version + 1);
    const projection = JSON.parse((await ctx.cache.get(POLL_PROJECTION_KEY(poll._id)))!);
    expect(projection.choices.map((c: { label: string }) => c.label)).toContain("Tacos");
  });

  it("refuses a guest, a voter without the vote grant, and a voter without the view grant", async () => {
    const noVote = await person(["View Polls"]);
    const noView = await person(["Vote on Polls"]);
    const poll = await seed(privatePoll(), noVote, noView);
    expect((await add(poll._id, null, "Tacos")).status).toBe(401);
    const refused = await add(poll._id, noVote.cookie, "Tacos");
    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe("no-vote-permission");
    expect((await add(poll._id, noView.cookie, "Tacos")).status).toBe(404);
  });

  it("refuses a poll whose setting is off, and a Public poll", async () => {
    const voter = await person();
    const off = await seed(privatePoll({ votersAddChoices: false }), voter);
    const pub = await seed(makePoll({ votersAddChoices: false }), voter);
    await ctx.db.updateTable("polls").set({ voters_add_choices: true }).where("id", "=", pub._id).execute();
    for (const pid of [off._id, pub._id]) {
      for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
      const res = await add(pid, voter.cookie, "Tacos");
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "This poll doesn't take new choices.", code: "ADD_CHOICES_OFF" });
    }
  });

  it("refuses a banned voter, an uninvited caller and a new voter over the voter limit, and admits the creator", async () => {
    const banned = await person();
    const outsider = await person();
    const late = await person();
    const creator = await person();
    const bannedPoll = await seed(privatePoll({ bannedVoterList: [banned.email] }), banned);
    expect((await add(bannedPoll._id, banned.cookie, "Tacos")).body.error).toMatch(/removed from this poll/);

    const invited = await seed(privatePoll({ pollSharingMode: "Invitation Only", invitedVoterList: ["someone@example.com"] }));
    expect((await add(invited._id, outsider.cookie, "Tacos")).status).toBe(404);

    const full = await seed(privatePoll({ voterCountLimit: 1 }), late);
    await ctx.db.updateTable("polls").set({ created_by_id: creator.userId }).where("id", "=", full._id).execute();
    const first = await person();
    await upsertRelation(ctx.db, first.email, full._id, "linked");
    expect((await request(ctx.app).post(`/api/polls/${full._id}/vote`).set("Cookie", first.cookie).send({ choiceIds: ["c1"] })).status).toBe(200);
    const res = await add(full._id, late.cookie, "Tacos");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("This poll has reached its maximum number of votes.");
    expect((await add(full._id, creator.cookie, "Tacos")).status).toBe(200);
  });

  it("refuses a voter who cast their final vote, but not the creator", async () => {
    const voter = await person();
    const creator = await person();
    const poll = await seed(privatePoll({ voteMutability: "Final-Vote Poll" }), voter);
    await ctx.db.updateTable("polls").set({ created_by_id: creator.userId }).where("id", "=", poll._id).execute();
    for (const who of [voter, creator]) {
      expect((await request(ctx.app).post(`/api/polls/${poll._id}/vote`).set("Cookie", who.cookie).send({ choiceIds: ["c1"] })).status).toBe(200);
    }
    const res = await add(poll._id, voter.cookie, "Tacos");
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("FINAL_VOTE_CAST");
    expect((await add(poll._id, creator.cookie, "Tacos")).status).toBe(200);
  });

  it("refuses while editing, while an update is reviewed, and before or after the poll is open, before any validation", async () => {
    const voter = await person();
    const editing = await seed(privatePoll(), voter);
    await ctx.db.updateTable("polls").set({ poll_state: "EDITING", poll_state_before_edit_update: "OPEN" }).where("id", "=", editing._id).execute();
    const reviewed = await seed(privatePoll(), voter);
    await ctx.db.updateTable("polls").set({ pending_update: JSON.stringify({ title: "New" }) }).where("id", "=", reviewed._id).execute();
    const waiting = await seed(privatePoll({ pollState: "WAITING TO OPEN" }), voter);
    const closed = await seed(privatePoll({ pollState: "CLOSED" }), voter);
    const cases: [string, string, string][] = [
      [editing._id, "POLL_EDITING", "The poll's choices are being edited. Try again shortly."],
      [reviewed._id, "PENDING_REVIEW", "Changes are being reviewed. Try again shortly."],
      [waiting._id, "NOT_OPEN", "This poll has not started yet."],
      [closed._id, "NOT_OPEN", "This poll is not open for voting."]
    ];
    for (const [pid, code, error] of cases) {
      for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
      const res = await add(pid, voter.cookie, "");
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error, code });
    }
  });

  it("reaches a second voter's tab refresh, which was holding the older version", async () => {
    const adder = await person();
    const reader = await person();
    const poll = await seed(privatePoll({ pollSharingMode: "Invitation Only", invitedVoterList: [adder.email, reader.email] }));
    const refresh = (body: object) => request(ctx.app).post("/api/tabs/shared-with-you/refresh").set("Cookie", reader.cookie).send(body);
    const first = await refresh({});
    const held = {
      membershipVersion: first.body.membershipVersion,
      versions: { [poll._id]: [first.body.cards[poll._id].contentVersion, first.body.counters[poll._id]?.countsVersion ?? 0] }
    };
    expect((await add(poll._id, adder.cookie, "Tacos")).status).toBe(200);
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    const next = await refresh(held);
    expect(next.status).toBe(200);
    expect(next.body.cards[poll._id].choices.map((c: { label: string }) => c.label)).toContain("Tacos");
  });

  it("refuses an empty choice and a full poll", async () => {
    const voter = await person();
    const poll = await seed(privatePoll(), voter);
    expect((await add(poll._id, voter.cookie, "   ")).body).toEqual({ error: "Enter a choice.", code: "EMPTY_CHOICE" });
    const full = await seed(
      privatePoll({ choices: ["A", "B", "C", "D"].map((label, position) => ({ id: `c${position}`, label, position })) }),
      voter
    );
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    expect((await add(full._id, voter.cookie, "E")).body).toEqual({
      error: "This poll already has the most choices allowed (4).",
      code: "CHOICES_FULL"
    });
  });

  it("keeps the ceiling when two voters add at once to a poll one short of it", async () => {
    const a = await person();
    const b = await person();
    const poll = await seed(privatePoll({ choices: ["A", "B", "C"].map((label, position) => ({ id: `c${position}`, label, position })) }), a, b);
    const results = await Promise.all([add(poll._id, a.cookie, "D"), add(poll._id, b.cookie, "E")]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await stored(poll._id)).choices).toHaveLength(4);
  });

  it("has its own allowance: a vote straight after an addition goes through, a second addition is too soon", async () => {
    const voter = await person();
    const poll = await seed(privatePoll(), voter);
    expect((await add(poll._id, voter.cookie, "Tacos")).status).toBe(200);
    expect((await request(ctx.app).post(`/api/polls/${poll._id}/vote`).set("Cookie", voter.cookie).send({ choiceIds: ["c1"] })).status).toBe(200);
    const again = await add(poll._id, voter.cookie, "Curry");
    expect(again.status).toBe(429);
    expect(again.body.error).toBe("too-soon");
  });
});

describe("refused choices", () => {
  const refusedWith = async (label: string, choices?: Poll["choices"]) => {
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    const voter = await person();
    const poll = await seed(privatePoll(choices ? { choices } : {}), voter);
    const before = await stored(poll._id);
    const res = await add(poll._id, voter.cookie, label);
    const after = await stored(poll._id);
    if (res.status !== 200) {
      expect(after.choices).toEqual(before.choices);
      expect(after.content_version).toBe(before.content_version);
    }
    return res;
  };

  it("accepts 40 characters and refuses 41", async () => {
    expect((await refusedWith("x".repeat(40))).status).toBe(200);
    expect((await refusedWith("x".repeat(41))).body).toEqual({ error: "A choice can be at most 40 characters.", code: "CHOICE_TOO_LONG" });
  });

  it("refuses line breaks, tabs and invisible characters, and accepts emoji and other scripts", async () => {
    for (const bad of ["a\nb", "a\tb", "a\u0007b", "a​b", "a‮b", "a⁦b"]) {
      expect((await refusedWith(bad)).body.code).toBe("CHOICE_CHARACTERS");
    }
    for (const good of ["🍕 Pizza", "寿司", "Café"]) expect((await refusedWith(good)).status).toBe(200);
  });

  it("refuses a duplicate ignoring case and spacing", async () => {
    const choices = [{ id: "c1", label: "Pizza", position: 0 }, { id: "c2", label: "Deep dish", position: 1 }];
    for (const dup of ["pizza", "  Pizza  ", "Deep  dish"]) {
      expect((await refusedWith(dup, choices)).body).toEqual({ error: "This poll already has that choice.", code: "DUPLICATE_CHOICE" });
    }
  });

  it("refuses a duplicate that arrives under the lock", async () => {
    const a = await person();
    const b = await person();
    const poll = await seed(privatePoll(), a, b);
    const results = await Promise.all([add(poll._id, a.cookie, "Tacos"), add(poll._id, b.cookie, "tacos")]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(results.find((r) => r.status === 409)!.body.code).toBe("DUPLICATE_CHOICE");
  });

  it("refuses unacceptable language, and says so when screening cannot answer", async () => {
    expect((await refusedWith("shit")).body).toEqual({ error: "This choice uses language that isn't allowed.", code: "UNACCEPTABLE_LANGUAGE" });
    screening.fail = true;
    expect((await refusedWith("Tacos")).body).toEqual({ error: "Couldn't check this choice. Try again.", code: "SCREENING_UNAVAILABLE" });
  });
});

describe("who added a choice", () => {
  it("is recorded on a poll without anonymous voting only, and never reaches a voter", async () => {
    const voter = await person();
    const named = await seed(privatePoll({ _id: randomUUID(), voteAnonymity: "No" }), voter);
    const anonymous = await seed(privatePoll({ voteAnonymity: "Yes" }), voter);
    expect((await add(named._id, voter.cookie, "Tacos")).status).toBe(200);
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    expect((await add(anonymous._id, voter.cookie, "Tacos")).status).toBe(200);
    expect((await stored(named._id)).choices.find((c) => c.label === "Tacos")!.addedBy).toBe(voter.userId);
    expect((await stored(anonymous._id)).choices.find((c) => c.label === "Tacos")!.addedBy).toBeUndefined();

    const linked = await request(ctx.app).get(`/api/me/polls/${named._id}`).set("Cookie", voter.cookie);
    expect(linked.status).toBe(200);
    expect(JSON.stringify(linked.body)).not.toContain("addedBy");
    for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
    const tab = await request(ctx.app).post("/api/tabs/shared-with-you/refresh").set("Cookie", voter.cookie).send({});
    expect(JSON.stringify(tab.body)).not.toContain("addedBy");
    expect(await ctx.cache.get(POLL_PROJECTION_KEY(named._id))).not.toContain("addedBy");
  });

  it("names the adder in the creator's admin list and detail, and only there", async () => {
    const creator = await person();
    const voter = await person();
    await ctx.db.updateTable("user").set({ name: "Ada" }).where("id", "=", voter.userId).execute();
    const poll = await seed(privatePoll({ _id: randomUUID(), voteAnonymity: "No" }), voter);
    await ctx.db.updateTable("polls").set({ created_by_id: creator.userId }).where("id", "=", poll._id).execute();
    expect((await add(poll._id, voter.cookie, "Tacos")).status).toBe(200);

    const list = await request(ctx.app).get("/api/admin/polls").set("Cookie", creator.cookie);
    expect(list.status).toBe(200);
    const row = list.body.polls.find((p: { pid: string }) => p.pid === poll._id);
    expect(row.choices.find((c: { label: string }) => c.label === "Tacos").addedByName).toBe("Ada");
    expect(row.choices.find((c: { label: string }) => c.label !== "Tacos").addedByName).toBeUndefined();

    const detail = await request(ctx.app).get(`/api/admin/polls/${poll._id}`).set("Cookie", creator.cookie);
    expect(detail.status).toBe(200);
    expect(detail.body.choices.find((c: { label: string }) => c.label === "Tacos").addedByName).toBe("Ada");
  });

  it("survives a creator save of a surviving label, merged or replaced, and goes when the poll turns anonymous", async () => {
    const admin = await forgeSession(ctx, ctx.config.admins[0]!);
    const voter = await person();
    const choices = [
      { id: "c1", label: "Pizza", position: 0 },
      { id: "c2", label: "Sushi", position: 1 },
      { id: "c3", label: "Tacos", position: 2, addedBy: voter.userId }
    ];
    const publish = (pid: string, body: Record<string, unknown>) =>
      request(ctx.app).post(`/api/admin/polls/${pid}/publish`).set("Cookie", admin.cookie).send(body);

    const voted = await seed(privatePoll({ voteAnonymity: "No", choices }));
    await voteHistory(ctx).insertOne({ pid: voted._id, emailAddress: "v@example.com", userName: "v", choiceIds: ["c1"], votedAt: new Date() });
    expect((await publish(voted._id, { labels: ["Pizza", "Tacos", "Ramen"], colors: [null, null, null] })).status).toBe(200);
    const merged = (await polls(ctx).findOne({ _id: voted._id }))!.pendingUpdate!.choices!;
    expect(merged.find((c) => c.label === "Tacos")!.addedBy).toBe(voter.userId);

    const fresh = await seed(privatePoll({ _id: randomUUID(), voteAnonymity: "No", choices }));
    expect((await publish(fresh._id, { labels: ["Tacos", "Pizza"], colors: [null, null] })).status).toBe(200);
    expect((await stored(fresh._id)).choices.find((c) => c.label === "Tacos")!.addedBy).toBe(voter.userId);

    const turning = await seed(privatePoll({ _id: randomUUID(), voteAnonymity: "No", choices }));
    expect((await publish(turning._id, { voteAnonymity: "Yes" })).status).toBe(200);
    expect((await stored(turning._id)).choices.some((c) => c.addedBy)).toBe(false);
  });
});
