/**
 * POLL-ADMIN-IMPROVEMENTS A5: each admin list item says whether the caller can open the poll from its link, by the
 * existing rule for watching a poll.
 */
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearPolls, forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import type { Poll } from "../src/polls/store.js";

let ctx: TestContext;
let admin: { cookie: string; userId: string };
let adminEmail: string;

beforeAll(async () => {
  ctx = await startTestContext();
  adminEmail = ctx.config.admins[0]!.toLowerCase();
  admin = await forgeSession(ctx, adminEmail);
});
afterAll(async () => {
  await ctx.stop();
});
beforeEach(async () => {
  await clearPolls(ctx);
});

type Row = { pid: string; canWatch: boolean };

async function seed(title: string, overrides: Partial<Poll> = {}, createdById = "someone-else") {
  const poll = makePoll({ title, ...overrides });
  await polls(ctx).insertOne(poll);
  await ctx.db.updateTable("polls").set({ created_by_id: createdById }).where("id", "=", poll._id).execute();
  return poll._id;
}

async function lists(cookie: string, search = true): Promise<Map<string, boolean>[]> {
  const listed = await request(ctx.app).get("/api/admin/polls").set("Cookie", cookie);
  expect(listed.status).toBe(200);
  const result = [new Map<string, boolean>(listed.body.polls.map((p: Row) => [p.pid, p.canWatch]))];
  if (search) {
    const searched = await request(ctx.app).get("/api/admin/polls/search").set("Cookie", cookie);
    expect(searched.status).toBe(200);
    result.push(new Map<string, boolean>(searched.body.polls.map((p: Row) => [p.pid, p.canWatch])));
  }
  return result;
}

const PRIVATE_LINK = { pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link" } as const;
const INVITE_ONLY = { pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" } as const;

describe("canWatch on the admin lists", () => {
  it("is false for every poll that is not published, whoever created it", async () => {
    const ids = [
      await seed("Draft", { pollState: "INITIALIZED" }, admin.userId),
      await seed("Awaiting", { pollState: "AWAITING APPROVAL" }),
      await seed("Rejected", { pollState: "REJECTED" }, admin.userId),
      await seed("Archived", { pollState: "ARCHIVED" }),
      await seed("Editing a draft", { pollState: "EDITING", pollStateBeforeEditUpdate: "INITIALIZED" }, admin.userId)
    ];
    for (const list of await lists(admin.cookie)) {
      for (const id of ids) expect(list.get(id)).toBe(false);
    }
  });

  it("is true for a published public poll, an edit of one counting by its state before the edit", async () => {
    const ids = [
      await seed("Waiting", { pollState: "WAITING TO OPEN" }),
      await seed("Open", { pollState: "OPEN" }),
      await seed("Closed", { pollState: "CLOSED" }),
      await seed("Editing an open poll", { pollState: "EDITING", pollStateBeforeEditUpdate: "OPEN" })
    ];
    for (const list of await lists(admin.cookie)) {
      for (const id of ids) expect(list.get(id)).toBe(true);
    }
  });

  it("is false for a public poll the caller is banned from", async () => {
    const id = await seed("Banned", { pollState: "OPEN" });
    await ctx.db.insertInto("poll_bans").values({ poll_id: id, email: adminEmail }).execute();
    for (const list of await lists(admin.cookie)) expect(list.get(id)).toBe(false);
  });

  it("follows the caller's reach on a private poll", async () => {
    const mine = await seed("Mine", { pollState: "OPEN", ...PRIVATE_LINK }, admin.userId);
    const unreached = await seed("Unreached", { pollState: "OPEN", ...PRIVATE_LINK });
    const linked = await seed("Linked", { pollState: "OPEN", ...PRIVATE_LINK });
    const votedIn = await seed("Voted", { pollState: "OPEN", ...PRIVATE_LINK });
    const invited = await seed("Invited", { pollState: "OPEN", ...INVITE_ONLY });
    const notInvited = await seed("Not invited", { pollState: "OPEN", ...INVITE_ONLY });
    const now = new Date();
    await ctx.db
      .insertInto("user_polls")
      .values([
        { email: adminEmail, poll_id: linked, relation: "linked", updated_at: now },
        { email: adminEmail, poll_id: votedIn, relation: "voted", updated_at: now }
      ])
      .execute();
    await ctx.db.insertInto("poll_invitations").values({ poll_id: invited, email: adminEmail, token_hash: null }).execute();

    for (const list of await lists(admin.cookie)) {
      expect(list.get(mine)).toBe(true);
      expect(list.get(unreached)).toBe(false);
      expect(list.get(linked)).toBe(true);
      expect(list.get(votedIn)).toBe(true);
      expect(list.get(invited)).toBe(true);
      expect(list.get(notInvited)).toBe(false);
    }
  });

  it("answers for a poll creator's own list too", async () => {
    const creator = await forgeSession(ctx, "creator-can-open@example.com");
    await ctx.db.updateTable("user").set({ permissions: ["Create Poll", "View Polls"] }).where("id", "=", creator.userId).execute();
    const open = await seed("Creator open", { pollState: "OPEN", ...PRIVATE_LINK }, creator.userId);
    const draft = await seed("Creator draft", { pollState: "INITIALIZED" }, creator.userId);
    const [list] = await lists(creator.cookie, false);
    expect(list!.get(open)).toBe(true);
    expect(list!.get(draft)).toBe(false);
  });

  it("changes no other field, order or truncation of the lists", async () => {
    await seed("First", { pollState: "OPEN", createdAt: new Date("2026-01-01") });
    await seed("Second", { pollState: "INITIALIZED", createdAt: new Date("2026-02-01") });
    const listed = await request(ctx.app).get("/api/admin/polls").set("Cookie", admin.cookie);
    expect(listed.body.truncated).toBe(false);
    expect(listed.body.polls.map((p: { title: string }) => p.title)).toEqual(["Second", "First"]);
    for (const item of listed.body.polls) expect(typeof item.canWatch).toBe("boolean");
  });
});
