import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { chooseTab, LANDING_TABS, parseTab, sharedLinkQuery, type PollFacts, type TabName } from "../src/polls/sharedLink.js";
import { upsertRelation } from "../src/polls/userPolls.js";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";

describe("tab names", () => {
  it("are the browser's TAB_NAMES, in the same order", () => {
    const source = readFileSync("src/public/tabs.js", "utf8");
    const match = /const TAB_NAMES = (\[[^\]]*\]);/.exec(source);
    expect(match).not.toBeNull();
    expect(JSON.parse(match![1]!)).toEqual([...LANDING_TABS]);
  });

  it("parseTab accepts each name and nothing else", () => {
    for (const name of LANDING_TABS) expect(parseTab(name)).toBe(name);
    for (const value of ["", "Home", "x", " home", undefined, null, 3, ["home"]]) expect(parseTab(value)).toBeNull();
  });

  it("sharedLinkQuery carries a valid tab beside the poll and drops any other", () => {
    expect(sharedLinkQuery("p", "watching")).toBe("PID=p&tab=watching");
    expect(sharedLinkQuery("p", "bogus")).toBe("PID=p");
    expect(sharedLinkQuery("p", undefined)).toBe("PID=p");
  });
});

describe("chooseTab", () => {
  const none: PollFacts = { created: false, private: false, published: true, voted: false, watching: false };
  const visitors: Record<string, PollFacts> = {
    creatorPublic: { ...none, created: true },
    creatorPrivate: { ...none, created: true, private: true },
    sharedPrivate: { ...none, private: true },
    voter: { ...none, voted: true },
    watcher: { ...none, watching: true },
    stranger: none
  };
  const fallback: Record<string, TabName> = {
    creatorPublic: "your-polls",
    creatorPrivate: "your-polls",
    sharedPrivate: "shared-with-you",
    voter: "your-votes",
    watcher: "watching",
    stranger: "home"
  };
  const fits = (tab: TabName, facts: PollFacts, hasTerms: boolean): boolean =>
    ({
      "your-polls": facts.created,
      "shared-with-you": facts.private && !facts.created,
      "your-votes": facts.voted,
      watching: facts.watching,
      home: !facts.private && facts.published,
      trending: !facts.private && facts.published,
      newest: !facts.private && facts.published,
      search: hasTerms,
      live: false
    })[tab];

  for (const [kind, facts] of Object.entries(visitors)) {
    for (const hasTerms of [false, true]) {
      it(`keeps a fitting tab, else falls back, for a ${kind}${hasTerms ? " with terms" : ""}`, () => {
        expect(chooseTab(facts, { hasTerms })).toBe(fallback[kind]);
        for (const tab of LANDING_TABS) {
          const chosen = chooseTab(facts, { tab, hasTerms });
          expect(chosen, tab).toBe(fits(tab, facts, hasTerms) ? tab : fallback[kind]);
          if (facts.private) expect(["home", "trending", "newest"], tab).not.toContain(chosen);
        }
      });
    }
  }

  it("sends a creator asking for Shared With You to Your Polls", () => {
    expect(chooseTab(visitors.creatorPrivate!, { tab: "shared-with-you" })).toBe("your-polls");
  });

  it("keeps no public tab for an unpublished public poll", () => {
    expect(chooseTab({ ...none, created: true, published: false }, { tab: "trending" })).toBe("your-polls");
  });
});

let ctx: TestContext;
let owner: { cookie: string; userId: string };
let viewer: { cookie: string; userId: string };
const viewerEmail = "tab-viewer@example.com";

const open = (query: string, cookie: string | null = viewer.cookie) => {
  const req = request(ctx.app).get(`/?${query}`).redirects(0);
  return cookie ? req.set("Cookie", cookie) : req;
};

async function seed(overrides: Parameters<typeof makePoll>[0]) {
  const poll = makePoll({ _id: randomUUID(), ...overrides });
  await polls(ctx).insertOne(poll);
  await ctx.db.updateTable("polls").set({ created_by_id: owner.userId }).where("id", "=", poll._id).execute();
  return poll;
}

const rowsOf = (email: string, pid: string) =>
  ctx.db.selectFrom("user_polls").select("relation").where("email", "=", email).where("poll_id", "=", pid).execute();

describe("GET /?PID=&tab=", () => {
  beforeAll(async () => {
    ctx = await startTestContext();
    owner = await forgeSession(ctx, "tab-owner@example.com");
    viewer = await forgeSession(ctx, viewerEmail);
  });
  afterAll(async () => {
    await ctx.stop();
  });
  beforeEach(async () => {
    await polls(ctx).deleteMany({});
  });

  it("keeps a tab that fits each visitor and replaces one that does not", async () => {
    const pub = await seed({});
    const linked = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link" });
    const invited = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: [viewerEmail] });
    const cases: [string, string | null, string, string][] = [
      ["owner", owner.cookie, `PID=${pub._id}&tab=your-polls`, `/?open=${pub._id}&tab=your-polls`],
      ["owner", owner.cookie, `PID=${pub._id}&tab=trending`, `/?open=${pub._id}&tab=trending`],
      ["owner", owner.cookie, `PID=${linked._id}&tab=shared-with-you`, `/?open=${linked._id}&tab=your-polls`],
      ["viewer", viewer.cookie, `PID=${pub._id}&tab=your-polls`, `/?open=${pub._id}&tab=home`],
      ["viewer", viewer.cookie, `PID=${pub._id}&tab=newest`, `/?open=${pub._id}&tab=newest`],
      ["viewer", viewer.cookie, `PID=${pub._id}&tab=live`, `/?open=${pub._id}&tab=home`],
      ["viewer", viewer.cookie, `PID=${linked._id}&tab=trending`, `/?open=${linked._id}&tab=shared-with-you`],
      ["viewer", viewer.cookie, `PID=${invited._id}&tab=home`, `/?open=${invited._id}&tab=shared-with-you`],
      ["viewer", viewer.cookie, `PID=${pub._id}&tab=Home`, `/?open=${pub._id}&tab=home`]
    ];
    for (const [who, cookie, query, location] of cases) {
      const res = await open(query, cookie);
      expect(res.status, `${who} ${query}`).toBe(302);
      expect(res.headers.location, `${who} ${query}`).toBe(location);
    }
  });

  it("keeps Your Votes for a voter and Watching for a watcher", async () => {
    const pub = await seed({});
    await upsertRelation(ctx.db, viewerEmail, pub._id, "voted");
    expect((await open(`PID=${pub._id}&tab=your-votes`)).headers.location).toBe(`/?open=${pub._id}&tab=your-votes`);
    expect((await open(`PID=${pub._id}&tab=watching`)).headers.location).toBe(`/?open=${pub._id}&tab=your-votes`);
    await upsertRelation(ctx.db, viewerEmail, pub._id, "bookmarked");
    expect((await open(`PID=${pub._id}&tab=watching`)).headers.location).toBe(`/?open=${pub._id}&tab=watching`);
  });

  it("keeps the old answers for refused and unpublished polls", async () => {
    const uninvited = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: ["x@example.com"] });
    const waiting = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link", pollState: "INITIALIZED" });
    expect((await open(`PID=${uninvited._id}&tab=home`)).headers.location).toBe("/?notice=unavailable");
    expect((await open(`PID=${waiting._id}&tab=home`)).headers.location).toBe("/?tab=shared-with-you&notice=unpublished");
  });

  it("treats a link with no tab as before, except a public poll lands on Home", async () => {
    const pub = await seed({});
    const linked = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link" });
    expect((await open(`PID=${pub._id}`)).headers.location).toBe(`/?open=${pub._id}&tab=home`);
    expect((await open(`PID=${linked._id}`)).headers.location).toBe(`/?open=${linked._id}&tab=shared-with-you`);
    expect((await open(`PID=${pub._id}`, owner.cookie)).headers.location).toBe(`/?open=${pub._id}&tab=your-polls`);
  });

  it("keeps Search only with terms, and passes the terms on", async () => {
    const pub = await seed({});
    expect((await open(`PID=${pub._id}&tab=search&q=pizza%20night`)).headers.location).toBe(
      `/?open=${pub._id}&tab=search&q=pizza+night`
    );
    expect((await open(`PID=${pub._id}&tab=search&q=%20`)).headers.location).toBe(`/?open=${pub._id}&tab=home`);
    expect((await open(`PID=${pub._id}&tab=trending&q=pizza`)).headers.location).toBe(`/?open=${pub._id}&tab=trending`);
  });

  it("writes no Watching row, and only the usual view of a link poll", async () => {
    const pub = await seed({});
    const linked = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link" });
    await open(`PID=${pub._id}&tab=watching`);
    await open(`PID=${linked._id}&tab=watching`);
    expect(await rowsOf(viewerEmail, pub._id)).toEqual([]);
    expect(await rowsOf(viewerEmail, linked._id)).toEqual([{ relation: "linked" }]);
  });

  describe("for a guest", () => {
    it("sends a public poll to its own page whatever the tab", async () => {
      const pub = await seed({});
      expect((await open(`PID=${pub._id}&tab=your-votes`, null)).headers.location).toBe(`/poll/${pub._id}`);
    });

    it("carries a valid tab to the login page and drops another", async () => {
      const linked = await seed({ pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link" });
      expect((await open(`PID=${linked._id}&tab=shared-with-you`, null)).headers.location).toBe(
        `/login?PID=${linked._id}&tab=shared-with-you`
      );
      expect((await open(`PID=${linked._id}&tab=nope`, null)).headers.location).toBe(`/login?PID=${linked._id}`);
    });

    it("still shows the poll's preview on the login page when a tab rides along", async () => {
      const pub = await seed({ title: "Tabbed preview" });
      const res = await request(ctx.app).get(`/login?PID=${pub._id}&tab=trending`);
      expect(res.status).toBe(200);
      expect(res.text).toContain('<meta property="og:title" content="Tabbed preview">');
    });
  });

  it("sends a signed-in visitor of /login and /create-account on with the tab", async () => {
    const pub = await seed({});
    const login = await request(ctx.app).get(`/login?PID=${pub._id}&tab=newest`).set("Cookie", viewer.cookie).redirects(0);
    expect(login.headers.location).toBe(`/?PID=${pub._id}&tab=newest`);
    const create = await request(ctx.app).get(`/create-account?PID=${pub._id}&tab=newest`).set("Cookie", viewer.cookie).redirects(0);
    expect(create.status).toBe(302);
    expect(create.headers.location).toBe(`/?PID=${pub._id}&tab=newest`);
  });
});
