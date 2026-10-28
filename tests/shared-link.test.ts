import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";

let ctx: TestContext;
let owner: { cookie: string; userId: string };
let viewer: { cookie: string; userId: string };
const viewerEmail = "link-viewer@example.com";

beforeAll(async () => {
  ctx = await startTestContext();
  owner = await forgeSession(ctx, "link-owner@example.com");
  viewer = await forgeSession(ctx, viewerEmail);
});
afterAll(async () => {
  await ctx.stop();
});
beforeEach(async () => {
  await polls(ctx).deleteMany({});
});

const open = (pid: string, cookie: string | null = viewer.cookie) => {
  const req = request(ctx.app).get(`/?PID=${pid}`).redirects(0);
  return cookie ? req.set("Cookie", cookie) : req;
};
const viewRows = (pid: string) =>
  ctx.db.selectFrom("user_polls").selectAll().where("email", "=", viewerEmail).where("poll_id", "=", pid).where("relation", "=", "linked").execute();

async function seed(overrides: Parameters<typeof makePoll>[0]) {
  const poll = makePoll({ _id: randomUUID(), ...overrides });
  await polls(ctx).insertOne(poll);
  await ctx.db.updateTable("polls").set({ created_by_id: owner.userId }).where("id", "=", poll._id).execute();
  return poll;
}

describe("GET /?PID= for a guest", () => {
  it("redirects to sign-in identically for an existing private poll, a public poll and an unknown id", async () => {
    const privatePoll = await seed({ pollVisibility: "Private Poll" });
    const publicPoll = await seed({});
    const unknown = randomUUID();
    const answers = [];
    for (const pid of [privatePoll._id, publicPoll._id, unknown]) {
      const res = await open(pid, null);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(`/login?PID=${pid}`);
      answers.push({ status: res.status, text: res.text.replaceAll(pid, "<pid>") });
    }
    expect(new Set(answers.map((a) => a.text)).size).toBe(1);
  });

  it("serves the home page when the id is not a UUID", async () => {
    const res = await open("not-a-uuid", null);
    expect(res.status).toBe(200);
    expect(res.text).toContain('id="tabBar"');
  });
});

describe("GET /?PID= for a signed-in visitor", () => {
  it("lands a non-creator on a published Anyone With The Link poll in Shared With You and records the view once", async () => {
    const poll = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link" });
    const res = await open(poll._id);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/?open=${poll._id}&tab=shared-with-you`);
    const [row] = await viewRows(poll._id);
    expect(row).toBeDefined();

    await open(poll._id);
    const [again] = await viewRows(poll._id);
    expect(new Date(again!.updated_at).getTime()).toBe(new Date(row!.updated_at).getTime());
  });

  it("refreshes the view's time when the stored one is older than a minute", async () => {
    const poll = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link" });
    await open(poll._id);
    const old = new Date(Date.now() - 5 * 60_000);
    await ctx.db.updateTable("user_polls").set({ updated_at: old }).where("poll_id", "=", poll._id).where("relation", "=", "linked").execute();
    await open(poll._id);
    const [row] = await viewRows(poll._id);
    expect(new Date(row!.updated_at).getTime()).toBeGreaterThan(old.getTime() + 60_000);
  });

  it("lands the creator on Your Polls and records nothing", async () => {
    const poll = await seed({ pollVisibility: "Private Poll", pollState: "ARCHIVED" });
    const res = await open(poll._id, owner.cookie);
    expect(res.headers.location).toBe(`/?open=${poll._id}&tab=your-polls`);
    expect(await ctx.db.selectFrom("user_polls").selectAll().where("poll_id", "=", poll._id).where("relation", "=", "linked").execute()).toEqual([]);
  });

  it("lands on Trending for a published public poll and records nothing", async () => {
    const poll = await seed({});
    const res = await open(poll._id);
    expect(res.headers.location).toBe(`/?open=${poll._id}&tab=trending`);
    expect(await viewRows(poll._id)).toEqual([]);
  });

  it("lands an invited visitor on a published Invitation Only poll in Shared With You with no new view", async () => {
    const poll = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: [viewerEmail] });
    const res = await open(poll._id);
    expect(res.headers.location).toBe(`/?open=${poll._id}&tab=shared-with-you`);
    expect(await viewRows(poll._id)).toEqual([]);
  });

  it("gives every not-shown case the same notice and records no view", async () => {
    const unknown = randomUUID();
    const archived = await seed({ pollVisibility: "Private Poll", pollState: "ARCHIVED" });
    const publicDraft = await seed({ pollState: "INITIALIZED" });
    const uninvited = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: ["someone@example.com"] });
    const banned = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link", bannedVoterList: [viewerEmail] });
    for (const pid of [unknown, archived._id, publicDraft._id, uninvited._id, banned._id]) {
      const res = await open(pid);
      expect(res.status, pid).toBe(302);
      expect(res.headers.location, pid).toBe("/?notice=unavailable");
      expect(await viewRows(pid), pid).toEqual([]);
    }
  });

  it("shows nothing and records nothing for a caller without the View Polls grant", async () => {
    const poll = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link" });
    const publicPoll = await seed({});
    const noView = await forgeSession(ctx, "no-view-link@example.com");
    await ctx.db.updateTable("user").set({ permissions: ["Vote on Polls"] }).where("id", "=", noView.userId).execute();
    for (const pid of [poll._id, publicPoll._id]) {
      const res = await open(pid, noView.cookie);
      expect(res.headers.location, pid).toBe("/?notice=unavailable");
    }
    expect(
      await ctx.db.selectFrom("user_polls").selectAll().where("email", "=", "no-view-link@example.com").execute()
    ).toEqual([]);
  });
});

describe("GET /api/me/polls/:pid", () => {
  const fetchPoll = (pid: string, cookie: string | null = viewer.cookie) => {
    const req = request(ctx.app).get(`/api/me/polls/${pid}`);
    return cookie ? req.set("Cookie", cookie) : req;
  };

  it("answers 401 to a guest", async () => {
    const poll = await seed({});
    expect((await fetchPoll(poll._id, null)).status).toBe(401);
  });

  it("returns the card for a poll the caller may be shown and never writes a view", async () => {
    const poll = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link" });
    const res = await fetchPoll(poll._id);
    expect(res.status).toBe(200);
    expect(res.body.poll.pid).toBe(poll._id);
    expect(res.body.counts).toBeDefined();
    expect(res.body.overlay).toBeDefined();
    expect(await viewRows(poll._id)).toEqual([]);
  });

  it("answers 404 for every case the link route does not show", async () => {
    const unknown = randomUUID();
    const archived = await seed({ pollVisibility: "Private Poll", pollState: "ARCHIVED" });
    const uninvited = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: ["x@example.com"] });
    for (const pid of [unknown, archived._id, uninvited._id]) {
      const res = await fetchPoll(pid);
      expect(res.status, pid).toBe(404);
      expect(res.body, pid).toEqual({ error: "Not found" });
    }
  });

  it("lets the creator fetch their own unpublished poll", async () => {
    const draft = await seed({ pollState: "INITIALIZED" });
    expect((await fetchPoll(draft._id, owner.cookie)).status).toBe(200);
  });
});
