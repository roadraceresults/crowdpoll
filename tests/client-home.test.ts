import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { LISTING_MAX_AGE_1S, openPage, type BrowserPage } from "./helpers/browser.js";
import { newestSweep, trendingSweep } from "../src/polls/sweeps.js";
import { countVote } from "../src/polls/counters.js";
import { addBookmark } from "../src/polls/bookmarks.js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { upsertRelation } from "../src/polls/userPolls.js";

let ctx: TestContext;
let page: BrowserPage | null = null;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1200", ENV_MIN_VOTE_REFRESH_INTERVAL: "2000", ...LISTING_MAX_AGE_1S });
});

afterAll(async () => {
  page?.close();
  await ctx.stop();
});

beforeEach(async () => {
  page?.close();
  page = null;
  await polls(ctx).deleteMany({});
  for (const key of await ctx.cache.scan("floor:*")) await ctx.cache.del(key);
});

const requestsTo = (p: BrowserPage, prefix: string) => p.requests.filter((r) => r.url.startsWith(prefix));

describe("the home page in a browser", () => {
  it("shows eight tabs in order with Title Case labels, Trending open and every other panel hidden", async () => {
    page = await openPage(ctx, "index.html");
    const tabs = Array.from(page.document.querySelectorAll("#tabBar .tab"));
    expect(tabs.map((t) => t.getAttribute("data-tab"))).toEqual(["your-polls", "shared-with-you", "your-votes", "trending", "newest", "watching", "live", "search"]);
    expect(tabs.map((t) => t.textContent!.replace(/\u00a0/g, " ").trim())).toEqual(["Your Polls", "Shared With You", "Your Votes", "Trending", "Newest", "Watching", "Live Results", "Search"]);
    expect(tabs[3]!.classList.contains("is-active")).toBe(true);
    const panels = Array.from(page.document.querySelectorAll(".tab-panel"));
    expect(panels.map((s) => s.getAttribute("data-panel"))).toEqual(["your-polls", "shared-with-you", "your-votes", "trending", "newest", "watching", "live", "search"]);
    expect(panels.map((s) => s.hasAttribute("hidden"))).toEqual([true, true, true, false, true, true, true, true]);
  });

  it("each tab's icon is decorative and the label alone is the accessible name", async () => {
    page = await openPage(ctx, "index.html");
    const labels = ["Your Polls", "Shared With You", "Your Votes", "Trending", "Newest", "Watching", "Live Results", "Search"];
    const tabs = Array.from(page.document.querySelectorAll("#tabBar .tab"));
    tabs.forEach((tab, i) => {
      const icon = tab.firstElementChild!;
      expect(icon.classList.contains("tab-icon"), labels[i]).toBe(true);
      expect(icon.getAttribute("aria-hidden"), labels[i]).toBe("true");
      if (icon.tagName.toLowerCase() === "svg") expect(icon.getAttribute("focusable"), labels[i]).toBe("false");
      expect(tab.textContent!.replace(/\u00a0/g, " ").trim(), labels[i]).toBe(labels[i]);
      expect(tab.querySelector("img")).toBeNull();
    });
    const live = page.document.querySelector('.tab[data-tab="live"] .live-bars')!;
    expect(live.querySelectorAll("i").length).toBe(3);
    expect(page.document.querySelector('.tab[data-tab="your-polls"] svg')!.getAttribute("viewBox")).toBe("0 0 64 64");
  });

  it("a guest's page load costs one instance request plus the cached configuration, and renders TRENDING", async () => {
    await polls(ctx).insertMany([makePoll({ title: "First" }), makePoll({ title: "Second" })]);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html");
    expect(page.cardTitles("trending").sort()).toEqual(["First", "Second"]);
    expect(requestsTo(page, "/api/me").length).toBe(1);
    expect(requestsTo(page, "/api/config").length).toBe(1);
    expect(requestsTo(page, "/api/trending/trending-counts.json").length).toBe(1);
    expect(requestsTo(page, "/api/trending/trending.json").length).toBe(1);
    expect(requestsTo(page, "/api/tabs").length).toBe(0);
    const personal = page.document.querySelector('.tab[data-tab="your-polls"]') as HTMLButtonElement;
    expect(personal.getAttribute("aria-disabled")).toBe("true");
    expect(personal.disabled).toBe(false);
    expect(page.document.querySelector('.tab[data-tab="trending"]')!.classList.contains("is-active")).toBe(true);
  });

  it("a signed-in visitor also fetches the overlay once and sees their own vote on the card", async () => {
    const me = "home@example.com";
    const { cookie } = await forgeSession(ctx, me);
    const poll = makePoll({
      title: "Voted",
      currentVotes: [{ emailAddress: me, userName: "", choiceIds: ["c2"], votedAt: new Date() }]
    });
    await polls(ctx).insertOne(poll);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html", { cookie });
    expect(page.cardTitles("trending")).toEqual(["Voted"]);
    expect(requestsTo(page, "/api/me/polls").length).toBe(1);
    expect(requestsTo(page, "/api/me").filter((r) => r.url === "/api/me").length).toBe(1);
    const personal = page.document.querySelector('.tab[data-tab="your-polls"]') as HTMLButtonElement;
    expect(personal.getAttribute("aria-disabled")).toBeNull();
    const totals = page.document.querySelector('.tab-panel[data-panel="trending"] .card-front .poll-totals')!.textContent;
    expect(totals).toContain("1 vote");
  });

  let visitors = 0;
  async function signedInWithTabs() {
    const me = `tabs${visitors++}@example.com`;
    const { cookie } = await forgeSession(ctx, me);
    await polls(ctx).insertOne(
      makePoll({ title: "Mine", pollVisibility: "Private Poll", currentVotes: [{ emailAddress: me, userName: "", choiceIds: ["c1"], votedAt: new Date() }] })
    );
    const favourite = makePoll({ title: "Fav" });
    await polls(ctx).insertOne(favourite);
    await addBookmark(ctx, me, favourite._id, 200);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    return openPage(ctx, "index.html", { cookie });
  }

  it("Refresh within the floor sends nothing; a switch back within the floor renders the copy and sends nothing", async () => {
    page = await signedInWithTabs();
    await page.settle(1250);

    await page.click('.tab[data-tab="watching"]');
    expect(page.cardTitles("watching")).toEqual(["Fav"]);
    expect(requestsTo(page, "/api/tabs/watching/refresh").length).toBe(1);
    const refresh = page.document.getElementById("refreshBtn") as HTMLButtonElement;
    expect(refresh.getAttribute("aria-disabled")).toBe("true");
    await page.click("#refreshBtn");
    expect(requestsTo(page, "/api/tabs/watching/refresh").length).toBe(1);

    // Another tab within the same floor: the browser knows the allowance is spent
    // (FIX008) and sends nothing yet; the request goes once the floor has passed.
    await page.click('.tab[data-tab="your-votes"]');
    expect(requestsTo(page, "/api/tabs/your-votes/refresh").length).toBe(0);
    expect(page.cardTitles("your-votes")).toEqual([]);

    // Back to a tab whose copy is younger than the floor: rendered from the copy, no request.
    await page.click('.tab[data-tab="watching"]');
    expect(requestsTo(page, "/api/tabs/watching/refresh").length).toBe(1);
    expect(page.cardTitles("watching")).toEqual(["Fav"]);
    expect(page.document.querySelector('.tab-panel[data-panel="watching"]')!.hasAttribute("hidden")).toBe(false);

    await page.settle(1300);
    await page.click("#refreshBtn");
    expect(requestsTo(page, "/api/tabs/watching/refresh").length).toBe(2);
  });

  it("a first request inside the floor is held by the page and sent once the wait has passed", async () => {
    page = await signedInWithTabs();
    // The overlay call on load spent this session's refresh allowance.
    await page.click('.tab[data-tab="watching"]');
    expect(requestsTo(page, "/api/tabs/watching/refresh").length).toBe(0);
    expect(page.cardTitles("watching")).toEqual([]);
    await page.settle(1400);
    expect(requestsTo(page, "/api/tabs/watching/refresh").length).toBe(1);
    expect(page.cardTitles("watching")).toEqual(["Fav"]);
  });

  it("a request the server refuses anyway is retried once the named wait has passed", async () => {
    page = await signedInWithTabs();
    await page.settle(1250);
    // Another window of the session took the floor without this page knowing.
    for (const key of await ctx.cache.scan("floor:refresh:s:*")) await ctx.cache.takeToken(key, 1, 1200);
    await page.click('.tab[data-tab="watching"]');
    expect(requestsTo(page, "/api/tabs/watching/refresh").length).toBe(1);
    expect(page.cardTitles("watching")).toEqual([]);
    await page.settle(1400);
    expect(requestsTo(page, "/api/tabs/watching/refresh").length).toBe(2);
    expect(page.cardTitles("watching")).toEqual(["Fav"]);
  });

  it("a browser refresh renders the stored TRENDING copy and validates with a conditional request", async () => {
    await polls(ctx).insertOne(makePoll({ title: "Stored" }));
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html");
    const copy = page.window.sessionStorage.getItem("trending:copy")!;
    expect(copy).toContain("Stored");
    page.close();

    page = await openPage(ctx, "index.html", { sessionStorage: { "trending:copy": copy } });
    expect(page.cardTitles("trending")).toEqual(["Stored"]);
    expect(requestsTo(page, "/api/trending/trending-counts.json").length).toBe(1);
    expect(requestsTo(page, "/api/trending/trending.json").length).toBe(0);
  });

  it("a later TRENDING refresh fetches the cards object only when the set of polls changed", async () => {
    const a = makePoll({ title: "A" });
    await polls(ctx).insertOne(a);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html");
    expect(page.cardTitles("trending")).toEqual(["A"]);

    await countVote(ctx.cache, a._id, ["c1"], [], true);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    await page.settle(1250);
    await page.click("#refreshBtn");
    expect(requestsTo(page, "/api/trending/trending-counts.json").length).toBe(2);
    expect(requestsTo(page, "/api/trending/trending.json").length).toBe(1);
    expect(page.document.querySelector(".card-front .poll-totals")!.textContent).toContain("1 vote");

    await polls(ctx).insertOne(makePoll({ title: "B" }));
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    await page.settle(1250);
    await page.click("#refreshBtn");
    expect(requestsTo(page, "/api/trending/trending.json").length).toBe(2);
    expect(page.cardTitles("trending").sort()).toEqual(["A", "B"]);
  });
});

describe("the Live Results bars and the guest (FR-011)", () => {
  it("a guest's page carries body.is-guest, a member's does not, and signing in removes it", async () => {
    const options: { cookie?: string } = {};
    page = await openPage(ctx, "index.html", options);
    await page.settle(50);
    expect(page.document.body.classList.contains("is-guest")).toBe(true);
    options.cookie = (await forgeSession(ctx, "guest-bars@example.com")).cookie;
    await (page.window as unknown as { Session: { refresh(): Promise<boolean> } }).Session.refresh();
    await page.settle(50);
    expect(page.document.body.classList.contains("is-guest")).toBe(false);

    const { cookie } = await forgeSession(ctx, "member-bars@example.com");
    const member = await openPage(ctx, "index.html", { cookie });
    try {
      await member.settle(50);
      expect(member.document.body.classList.contains("is-guest")).toBe(false);
    } finally {
      member.close();
    }
  });
});

describe("the Refresh control across the reordered bar (FR-003)", () => {
  it("is present on Trending, hidden on Live Results, and a ?q= arrival opens the last tab", async () => {
    await polls(ctx).insertOne(makePoll({ title: "Zeppelin" }));
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    const { cookie } = await forgeSession(ctx, "refresh-order@example.com");
    page = await openPage(ctx, "index.html", { cookie, beforeScripts: (w) => w.history.replaceState(null, "", "/?q=zeppelin") });
    await page.settle(100);
    const wrap = page.document.querySelector(".tab-bar-wrap")!;
    const tabs = Array.from(page.document.querySelectorAll("#tabBar .tab"));
    expect(tabs[7]!.getAttribute("data-tab")).toBe("search");
    expect(tabs[7]!.classList.contains("is-active")).toBe(true);
    expect(wrap.getAttribute("data-active")).toBe("search");
    expect(page.document.getElementById("refreshBtn")).not.toBeNull();

    await page.click('.tab[data-tab="trending"]');
    expect(wrap.getAttribute("data-active")).toBe("trending");
    expect(page.document.querySelector('.tab[data-tab="trending"]')!.classList.contains("is-active")).toBe(true);

    await page.click('.tab[data-tab="live"]');
    expect(tabs[6]!.getAttribute("data-tab")).toBe("live");
    expect(wrap.getAttribute("data-active")).toBe("live");
  });
});

describe("a bar's percentage", () => {
  const percentages = () =>
    Array.from(page!.document.querySelectorAll(".tab-panel[data-panel=\"trending\"] .result-pct"))
      .filter((el) => !el.closest(".result-ink-on-fill"))
      .map((el) => el.textContent);

  it("is the share of selections on a multiple-choice poll, so the bars add up to 100", async () => {
    const poll = makePoll({ title: "Pick any", choiceMode: "Multiple-Choice Poll" });
    await polls(ctx).insertOne(poll);
    await countVote(ctx.cache, poll._id, ["c1", "c2"], [], true);
    await countVote(ctx.cache, poll._id, ["c1"], [], true);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html");
    expect(percentages()).toEqual(["67%", "33%"]);
  });

  it("stays the share of voters on a single-choice poll", async () => {
    const poll = makePoll({ title: "Pick one" });
    await polls(ctx).insertOne(poll);
    await countVote(ctx.cache, poll._id, ["c1"], [], true);
    await countVote(ctx.cache, poll._id, ["c1"], [], true);
    await countVote(ctx.cache, poll._id, ["c2"], [], true);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html");
    expect(percentages()).toEqual(["67%", "33%"]);
  });
});

describe("a content change in a listed poll", () => {
  it("is fetched by the next TRENDING refresh although the set of polls is the same", async () => {
    const a = makePoll({ title: "Before" });
    await polls(ctx).insertOne(a);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html");
    expect(page.cardTitles("trending")).toEqual(["Before"]);
    expect(requestsTo(page, "/api/trending/trending.json").length).toBe(1);

    await polls(ctx).updateOne({ _id: a._id }, { $set: { title: "After" } });
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    await page.settle(1250);
    await page.click("#refreshBtn");
    expect(requestsTo(page, "/api/trending/trending.json").length).toBe(2);
    expect(page.cardTitles("trending")).toEqual(["After"]);
  });

  it("is fetched by the next Newest refresh although the set of polls is the same", async () => {
    const a = makePoll({ title: "Before", createdAt: new Date(Date.now() - 60_000) });
    await polls(ctx).insertOne(a);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    await newestSweep(ctx, ctx.config, ctx.newestPublisher);
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    await page.click('.tab[data-tab="newest"]');
    expect(page.cardTitles("newest")).toEqual(["Before"]);
    expect(requestsTo(page, "/api/trending/newest.json").length).toBe(1);

    await polls(ctx).updateOne({ _id: a._id }, { $set: { title: "After" } });
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    await newestSweep(ctx, ctx.config, ctx.newestPublisher);
    await page.settle(1250);
    await page.click("#refreshBtn");
    expect(requestsTo(page, "/api/trending/newest.json").length).toBe(2);
    expect(page.cardTitles("newest")).toEqual(["After"]);
  });
});

describe("the Newest tab in a browser", () => {
  const sweeps = async () => {
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    await newestSweep(ctx, ctx.config, ctx.newestPublisher);
  };
  const newestPanel = () => page!.document.querySelector('.tab-panel[data-panel="newest"]')!;
  const overlayCallsFor = (pids: string[]) =>
    requestsTo(page!, "/api/me/polls").filter((r) => {
      const asked = (new URL(r.url, "http://localhost/").searchParams.get("pids") ?? "").split(",").sort();
      return asked.join(",") === [...pids].sort().join(",");
    });
  const seedTwo = async () => {
    const first = makePoll({ title: "First", createdAt: new Date(Date.now() - 120_000) });
    const second = makePoll({ title: "Second", createdAt: new Date(Date.now() - 60_000) });
    await polls(ctx).insertMany([first, second]);
    await sweeps();
    return [first._id, second._id];
  };

  it("opens for a guest with no sign-in redirect and lists the newest polls first, from the two objects and nothing else", async () => {
    await seedTwo();
    page = await openPage(ctx, "index.html");
    await page.settle(50);
    await page.click('.tab[data-tab="newest"]');
    expect(page.window.location.pathname).toBe("/");
    expect(page.document.querySelector('.tab[data-tab="newest"]')!.classList.contains("is-active")).toBe(true);
    expect(newestPanel().hasAttribute("hidden")).toBe(false);
    expect(page.cardTitles("newest")).toEqual(["Second", "First"]);
    expect(requestsTo(page, "/api/trending/newest-counts.json").length).toBe(1);
    expect(requestsTo(page, "/api/trending/newest.json").length).toBe(1);
    expect(requestsTo(page, "/api/me/polls").length).toBe(0);
    expect(newestPanel().querySelector(".tab-empty")!.hasAttribute("hidden")).toBe(true);

    const refresh = page.document.getElementById("refreshBtn") as HTMLButtonElement;
    expect(refresh.getAttribute("aria-disabled")).toBe("true");
    await page.settle(1300);
    expect(refresh.getAttribute("aria-disabled")).toBeNull();
  });

  it("fetches a member's overlay for the listed polls, once, and shows it on the cards", async () => {
    const ids = await seedTwo();
    const { cookie } = await forgeSession(ctx, "newest-member@example.com");
    await countVote(ctx.cache, ids[1]!, ["c1"], [], true);
    await ctx.db.insertInto("votes").values({ poll_id: ids[1]!, email: "newest-member@example.com", user_name: "", choice_ids: ["c1"], voted_at: new Date() }).execute();
    page = await openPage(ctx, "index.html", { cookie });
    await page.settle(50);
    await page.click('.tab[data-tab="newest"]');
    expect(page.cardTitles("newest")).toEqual(["Second", "First"]);
    await page.settle(1300);
    expect(overlayCallsFor(ids).filter((r) => r.status === 200).length).toBe(1);
    const cards = Array.from(newestPanel().querySelectorAll(".card-grid > .card-viewport"));
    expect(cards.map((card) => card.querySelectorAll(".vote-row.is-selected").length)).toEqual([1, 0]);
  });

  it("shows the empty state when nothing has been launched", async () => {
    await sweeps();
    page = await openPage(ctx, "index.html");
    await page.click('.tab[data-tab="newest"]');
    expect(newestPanel().querySelector(".card-grid")!.children.length).toBe(0);
    const empty = newestPanel().querySelector(".tab-empty")!;
    expect(empty.hasAttribute("hidden")).toBe(false);
    expect(empty.textContent).toBe("No polls have been launched yet.");
  });

  it("renders a stored copy before validating, and skips the cards object when the set is unchanged", async () => {
    await seedTwo();
    page = await openPage(ctx, "index.html");
    await page.click('.tab[data-tab="newest"]');
    const copy = page.window.sessionStorage.getItem("newest:copy")!;
    expect(copy).toContain("Second");
    page.close();

    page = await openPage(ctx, "index.html", { sessionStorage: { "newest:copy": copy } });
    await page.click('.tab[data-tab="newest"]');
    expect(page.cardTitles("newest")).toEqual(["Second", "First"]);
    expect(requestsTo(page, "/api/trending/newest-counts.json").length).toBe(1);
    expect(requestsTo(page, "/api/trending/newest.json").length).toBe(0);
    page.close();

    const stale = JSON.stringify({ ...JSON.parse(copy), receivedAt: Date.now() - 120_000 });
    page = await openPage(ctx, "index.html", { sessionStorage: { "newest:copy": stale } });
    await page.click('.tab[data-tab="newest"]');
    expect(requestsTo(page, "/api/trending/newest-counts.json").length).toBe(1);
    expect(requestsTo(page, "/api/trending/newest.json").length).toBe(1);
  });

  it("a revisit within the floor sends nothing; Refresh is available after it and spends one token", async () => {
    await seedTwo();
    page = await openPage(ctx, "index.html");
    await page.click('.tab[data-tab="newest"]');
    expect(requestsTo(page, "/api/trending/newest-counts.json").length).toBe(1);
    await page.click('.tab[data-tab="trending"]');
    await page.click('.tab[data-tab="newest"]');
    expect(requestsTo(page, "/api/trending/newest-counts.json").length).toBe(1);

    const refresh = page.document.getElementById("refreshBtn") as HTMLButtonElement;
    await page.settle(1300);
    expect(refresh.getAttribute("aria-disabled")).toBeNull();
    await page.click("#refreshBtn");
    expect(requestsTo(page, "/api/trending/newest-counts.json").length).toBe(2);
    expect(refresh.getAttribute("aria-disabled")).toBe("true");
    await page.click("#refreshBtn");
    expect(requestsTo(page, "/api/trending/newest-counts.json").length).toBe(2);
    expect(page.document.querySelector(".tab-notice")?.textContent ?? "").not.toContain("Please wait");
    await page.settle(1300);
    expect(refresh.getAttribute("aria-disabled")).toBeNull();
  });

  it("a sign-in with Newest open refetches the overlay; a guest's visit reaches the application for nothing else", async () => {
    const ids = await seedTwo();
    const options: { cookie?: string } = {};
    page = await openPage(ctx, "index.html", options);
    await page.click('.tab[data-tab="newest"]');
    await page.settle(1300);
    const application = page.requests.filter((r) => r.url.startsWith("/api/") && !r.url.startsWith("/api/trending/") && !r.url.startsWith("/api/me") && !r.url.startsWith("/api/config"));
    expect(application).toEqual([]);
    expect(requestsTo(page, "/api/me/polls").length).toBe(0);

    options.cookie = (await forgeSession(ctx, "newest-signin@example.com")).cookie;
    await (page.window as unknown as { Session: { refresh(): Promise<boolean> } }).Session.refresh();
    await page.settle(1300);
    expect(overlayCallsFor(ids).filter((r) => r.status === 200).length).toBe(1);
    expect(page.document.querySelector('.tab[data-tab="newest"]')!.classList.contains("is-active")).toBe(true);
  });

  it("a vote cast from the Trending card is on the Newest card at once", async () => {
    const ids = await seedTwo();
    const { cookie } = await forgeSession(ctx, "cross-tab-voter@example.com");
    page = await openPage(ctx, "index.html", { cookie });
    await page.click('.tab[data-tab="newest"]');
    expect(page.cardTitles("newest")).toEqual(["Second", "First"]);
    await page.click('.tab[data-tab="trending"]');
    expect(page.cardTitles("trending")[0]).toBe("Second");
    const card = '.tab-panel[data-panel="trending"] .card-grid > .card-viewport:first-child';
    await page.click(`${card} .vote-btn`);
    await page.click(`${card} .vote-row`);
    await page.click(`${card} .submit-vote-btn`);
    expect(requestsTo(page, `/api/polls/${ids[1]}/vote`).length).toBe(1);

    await page.click('.tab[data-tab="newest"]');
    const newestCard = newestPanel().querySelector(".card-grid > .card-viewport:first-child")!;
    expect(newestCard.querySelector(".question")!.textContent).toBe("Second");
    expect(newestCard.querySelector(".poll-totals")!.textContent).toContain("1 vote");
    expect(newestCard.querySelectorAll(".vote-row.is-selected").length).toBe(1);
  });
});

describe("the Search tab in a browser", () => {
  it("Enter in the header's Search CrowdPoll box searches, selects the tab, keeps the words, renders cards without a Vote button, and Refresh re-runs the query", async () => {
    await polls(ctx).insertMany([makePoll({ title: "Quantum kettle" }), makePoll({ title: "Ordinary kettle" }), makePoll({ title: "Teapot" })]);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html");
    // FIX013: the Search tab, opened without terms, asks for them.
    await page.click('.tab[data-tab="search"]');
    expect(page.document.querySelector('.tab-panel[data-panel="search"] .tab-empty')!.textContent).toContain("Search CrowdPoll");
    await page.submitForm("#siteSearch", { siteSearchBox: "kettle" });
    expect(page.document.querySelector('.tab[data-tab="search"]')!.classList.contains("is-active")).toBe(true);
    // FIX012/FIX013: the words stay, the X shows, and pressing it clears the text only.
    const box = page.document.getElementById("siteSearchBox") as HTMLInputElement;
    const clear = page.document.getElementById("siteSearchClear") as HTMLButtonElement;
    expect(box.value).toBe("kettle");
    expect(clear.hidden).toBe(false);
    expect(clear.title).toBe("Clear Search Terms");
    expect(page.cardTitles("search").sort()).toEqual(["Ordinary kettle", "Quantum kettle"]);
    expect(requestsTo(page, "/api/search").filter((r) => r.url === "/api/search").length).toBe(1);
    const voteButtons = page.document.querySelectorAll('.tab-panel[data-panel="search"] .vote-btn:not([hidden])');
    expect(voteButtons.length).toBe(0);
    const liveLinks = page.document.querySelectorAll('.tab-panel[data-panel="search"] .live-link:not([hidden])');
    expect(liveLinks.length).toBe(2);

    // Refresh is a refresh-kind request with its own allowance, so it may follow
    // the search at once (FR-025); a second press inside its floor sends nothing.
    await page.click("#refreshBtn");
    expect(requestsTo(page, "/api/search/refresh").length).toBe(1);
    await page.click("#refreshBtn");
    expect(requestsTo(page, "/api/search/refresh").length).toBe(1);
    await page.settle(1300);
    await page.click("#refreshBtn");
    expect(requestsTo(page, "/api/search/refresh").length).toBe(2);
    expect(page.cardTitles("search").sort()).toEqual(["Ordinary kettle", "Quantum kettle"]);

    // FIX014: the X clears the terms and the results, and the tab asks for terms again;
    // Refresh then has nothing to re-run.
    await page.click('.tab[data-tab="trending"]');
    await page.click("#siteSearchClear");
    await page.settle(50);
    expect(box.value).toBe("");
    expect(clear.hidden).toBe(true);
    expect(page.document.querySelector('.tab[data-tab="search"]')!.classList.contains("is-active")).toBe(true);
    expect(page.cardTitles("search")).toEqual([]);
    expect(page.document.querySelector('.tab-panel[data-panel="search"] .tab-empty')!.textContent).toContain("Search CrowdPoll");
    await page.settle(1300);
    await page.click("#refreshBtn");
    expect(requestsTo(page, "/api/search/refresh").length).toBe(2);
  });
});

describe("voting from a card in a browser", () => {
  it("flips, submits, applies the live counts to the card and holds the Vote button for the floor", async () => {
    const { cookie } = await forgeSession(ctx, "browser-voter@example.com");
    const poll = makePoll({ title: "Vote here" });
    await polls(ctx).insertOne(poll);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html", { cookie });
    expect(page.cardTitles("trending")).toEqual(["Vote here"]);

    await page.click('.tab-panel[data-panel="trending"] .vote-btn');
    expect(page.document.querySelector('.tab-panel[data-panel="trending"] .card-flip')!.classList.contains("is-flipped")).toBe(true);
    await page.click('.tab-panel[data-panel="trending"] .vote-row');
    await page.click('.tab-panel[data-panel="trending"] .submit-vote-btn');
    expect(requestsTo(page, `/api/polls/${poll._id}/vote`).length).toBe(1);
    expect(page.document.querySelector('.tab-panel[data-panel="trending"] .card-flip')!.classList.contains("is-flipped")).toBe(false);
    expect(page.document.querySelector('.tab-panel[data-panel="trending"] .poll-totals')!.textContent).toContain("1 vote");
    const voteBtn = page.document.querySelector('.tab-panel[data-panel="trending"] .vote-btn') as HTMLButtonElement;
    expect(voteBtn.disabled).toBe(true);
    expect(page.window.VoteClient.canVote()).toBe(false);
    expect(page.document.querySelector(".poll-vote-notice")!.hasAttribute("hidden")).toBe(true);
  });

  it("shows the queued notice when the writers lag, and keeps a refused vote pending for one retry", async () => {
    const { cookie } = await forgeSession(ctx, "queued-voter@example.com");
    const poll = makePoll({ title: "Queued here" });
    await polls(ctx).insertOne(poll);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    await ctx.cache.set("queue:lag", "9000", 60_000);
    page = await openPage(ctx, "index.html", { cookie });
    await page.click('.tab-panel[data-panel="trending"] .vote-btn');
    await page.click('.tab-panel[data-panel="trending"] .vote-row');
    await page.click('.tab-panel[data-panel="trending"] .submit-vote-btn');
    expect(page.document.querySelector(".poll-vote-notice")!.textContent).toMatch(/queued/);
    await ctx.cache.del("queue:lag");
  });
});

describe("the Live Results tab in a browser", () => {
  it("the card's Live Results action adds the poll, switches tabs, and refreshes on the handed-back interval; a hidden page sends nothing", async () => {
    const live = await startTestContext({
      ENV_MIN_LIVE_REFRESH_INTERVAL: "300",
      ENV_MIN_MANUAL_REFRESH_INTERVAL: "1",
      ENV_LIVE_RESULTS_MAX_IDLE_TIME: "60000"
    });
    let livePage: BrowserPage | null = null;
    try {
      const { cookie } = await forgeSession(live, "live-browser@example.com");
      const poll = makePoll({ title: "Watch me" });
      await polls(live).insertOne(poll);
      await trendingSweep(live, live.config, live.trendingPublisher);
      livePage = await openPage(live, "index.html", { cookie });
      await livePage.click('.tab-panel[data-panel="trending"] .live-link');
      expect(livePage.document.querySelector('.tab[data-tab="live"]')!.classList.contains("is-active")).toBe(true);
      expect(livePage.cardTitles("live")).toEqual(["Watch me"]);
      expect(requestsTo(livePage, `/api/live/${poll._id}`).length).toBe(1);
      const refreshes = () => requestsTo(livePage!, "/api/live/refresh").length;
      expect(refreshes()).toBe(1);

      await countVote(live.cache, poll._id, ["c1"], [], true);
      await livePage.settle(700);
      expect(refreshes()).toBeGreaterThanOrEqual(2);
      expect(livePage.document.querySelector('.tab-panel[data-panel="live"] .poll-totals')!.textContent).toContain("1 vote");

      Object.defineProperty(livePage.document, "hidden", { value: true, configurable: true });
      livePage.document.dispatchEvent(new livePage.window.Event("visibilitychange"));
      const paused = refreshes();
      await livePage.settle(700);
      expect(refreshes()).toBe(paused);

      // 020: the tab's cards each carry the link in its remove form.
      const liveLinksInTab = livePage.document.querySelectorAll('.tab-panel[data-panel="live"] .live-link:not([hidden])');
      expect(liveLinksInTab.length).toBe(livePage.cardTitles("live").length);
      liveLinksInTab.forEach((link) => {
        expect((link.querySelector(".live-x") as HTMLElement).hidden).toBe(false);
        expect(link.getAttribute("aria-label")).toBe("Remove from Live Results");
      });
    } finally {
      livePage?.close();
      await live.stop();
    }
  });

  it("the card's X Live Results link removes the poll; every other tab shows the bars and adds", async () => {
    const live = await startTestContext({
      ENV_MIN_LIVE_REFRESH_INTERVAL: "300",
      ENV_MIN_MANUAL_REFRESH_INTERVAL: "1",
      ENV_LIVE_RESULTS_MAX_IDLE_TIME: "60000"
    });
    let livePage: BrowserPage | null = null;
    try {
      const { cookie, userId } = await forgeSession(live, "live-remove@example.com");
      const session = await live.db.selectFrom("session").select("id").where("userId", "=", userId).executeTakeFirstOrThrow();
      const first = makePoll({ title: "Keep watching" });
      const second = makePoll({ title: "Stop watching" });
      await polls(live).insertMany([first, second]);
      await trendingSweep(live, live.config, live.trendingPublisher);
      livePage = await openPage(live, "index.html", { cookie });
      const trendingLink = livePage.document.querySelector('.tab-panel[data-panel="trending"] .live-link') as HTMLAnchorElement;
      expect((trendingLink.querySelector(".live-bars") as HTMLElement).hidden).toBe(false);
      expect((trendingLink.querySelector(".live-x") as HTMLElement).hidden).toBe(true);
      expect(trendingLink.title).toBe("Add to Live Results");
      expect(trendingLink.hasAttribute("aria-label")).toBe(false);
      const addPoll = (livePage.window as unknown as { LiveResults: { addPoll(pid: string): Promise<void> } }).LiveResults.addPoll;
      await addPoll(first._id);
      await livePage.settle(300);
      await addPoll(second._id);
      await livePage.settle(300);
      expect(livePage.cardTitles("live")).toEqual(["Stop watching", "Keep watching"]);
      const linkOf = (title: string) => {
        const card = Array.from(livePage!.document.querySelectorAll('.tab-panel[data-panel="live"] .card-viewport')).find(
          (c) => c.querySelector(".card-front .question")!.textContent === title
        )!;
        return card.querySelector(".live-link") as HTMLAnchorElement;
      };
      const stop = linkOf("Stop watching");
      expect(stop.hasAttribute("hidden")).toBe(false);
      expect((stop.querySelector(".live-x") as HTMLElement).hidden).toBe(false);
      expect((stop.querySelector(".live-bars") as HTMLElement).hidden).toBe(true);
      expect(stop.getAttribute("aria-label")).toBe("Remove from Live Results");
      expect(stop.title).toBe("Remove from Live Results");
      expect(stop.querySelector(".live-link-label")!.textContent).toBe("Live Results");

      // The X never animates; the two rules that freeze the bars still name them alone.
      const cardCss = readFileSync("src/public/pollCard.css", "utf8");
      const reducedMotion = cardCss.slice(cardCss.indexOf("@media (prefers-reduced-motion"));
      expect(reducedMotion.slice(0, reducedMotion.indexOf("}"))).toContain(".live-bars i");
      expect(reducedMotion.slice(0, reducedMotion.indexOf("}"))).not.toContain(".live-x");
      expect(cardCss).toContain(".is-guest .live-bars i{ animation:none; }");
      expect(cardCss).not.toMatch(/is-guest[^\n]*live-x/);

      // T012: the corner control exists nowhere, on any tab, hidden or not.
      expect(livePage.document.querySelectorAll(".card-close-btn").length).toBe(0);

      stop.click();
      await livePage.settle(100);
      expect(livePage.requests.filter((r) => r.url === `/api/live/${second._id}` && r.method === "DELETE").length).toBe(1);
      expect(livePage.cardTitles("live")).toEqual(["Keep watching"]);
      expect(await live.live.polls(session.id)).toEqual([first._id]);
      expect(livePage.document.querySelector('.tab[data-tab="live"]')!.classList.contains("is-active")).toBe(true);

      // The last one: the tab stays, empty, with its prompt line and no timer.
      linkOf("Keep watching").click();
      await livePage.settle(100);
      expect(livePage.cardTitles("live")).toEqual([]);
      expect(livePage.document.querySelector('.tab-panel[data-panel="live"] .tab-empty')!.hasAttribute("hidden")).toBe(false);
      const refreshes = requestsTo(livePage, "/api/live/refresh").length;
      await livePage.settle(700);
      expect(requestsTo(livePage, "/api/live/refresh").length).toBe(refreshes);
    } finally {
      livePage?.close();
      await live.stop();
    }
  });

  it("a poll that closes while it is watched keeps its link, and can still be removed", async () => {
    const live = await startTestContext({
      ENV_MIN_LIVE_REFRESH_INTERVAL: "300",
      ENV_MIN_MANUAL_REFRESH_INTERVAL: "1",
      ENV_LIVE_RESULTS_MAX_IDLE_TIME: "60000"
    });
    let livePage: BrowserPage | null = null;
    try {
      const { cookie } = await forgeSession(live, "live-closes@example.com");
      const poll = makePoll({ title: "Closes while watched" });
      await polls(live).insertMany([poll]);
      await trendingSweep(live, live.config, live.trendingPublisher);
      livePage = await openPage(live, "index.html", { cookie });
      const addPoll = (livePage.window as unknown as { LiveResults: { addPoll(pid: string): Promise<void> } }).LiveResults.addPoll;
      await addPoll(poll._id);
      await livePage.settle(300);
      expect(livePage.cardTitles("live")).toEqual(["Closes while watched"]);

      await polls(live).updateOne({ _id: poll._id }, { $set: { pollState: "CLOSED", endAt: new Date() } });
      await livePage.settle(700);

      const card = livePage.document.querySelector('.tab-panel[data-panel="live"] .card-viewport')!;
      expect((card.querySelector(".card-front .poll-closed-message") as HTMLElement).hidden).toBe(false);
      expect((card.querySelector(".card-front .vote-btn") as HTMLElement).hidden).toBe(true);
      const link = card.querySelector(".live-link") as HTMLAnchorElement;
      expect(link.hasAttribute("hidden")).toBe(false);
      expect((link.querySelector(".live-x") as HTMLElement).hidden).toBe(false);

      link.click();
      await livePage.settle(100);
      expect(livePage.requests.filter((r) => r.url === `/api/live/${poll._id}` && r.method === "DELETE").length).toBe(1);
      expect(livePage.cardTitles("live")).toEqual([]);
    } finally {
      livePage?.close();
      await live.stop();
    }
  });

  it("a closed poll on another tab still offers no Live Results link", async () => {
    const live = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1", ENV_MIN_SEARCH_REFRESH_INTERVAL: "1" });
    let livePage: BrowserPage | null = null;
    try {
      const { cookie } = await forgeSession(live, "live-closed-elsewhere@example.com");
      await polls(live).insertMany([
        makePoll({ title: "Closed kettle", pollState: "CLOSED", endAt: new Date() }),
        makePoll({ title: "Open kettle" })
      ]);
      await trendingSweep(live, live.config, live.trendingPublisher);
      livePage = await openPage(live, "index.html", { cookie });
      await livePage.submitForm("#siteSearch", { siteSearchBox: "kettle" });
      expect(livePage.cardTitles("search").sort()).toEqual(["Closed kettle", "Open kettle"]);
      const linkOfSearch = (title: string) => {
        const card = Array.from(livePage!.document.querySelectorAll('.tab-panel[data-panel="search"] .card-viewport')).find(
          (c) => c.querySelector(".card-front .question")!.textContent === title
        )!;
        return card.querySelector(".live-link") as HTMLAnchorElement;
      };
      expect(linkOfSearch("Closed kettle").hidden).toBe(true);
      const open = linkOfSearch("Open kettle");
      expect(open.hidden).toBe(false);
      expect((open.querySelector(".live-bars") as HTMLElement).hidden).toBe(false);
      expect(open.title).toBe("Add to Live Results");
    } finally {
      livePage?.close();
      await live.stop();
    }
  });

  it("the link is worked from the keyboard, and a removal places the focus rather than losing it", async () => {
    const live = await startTestContext({
      ENV_MIN_LIVE_REFRESH_INTERVAL: "300",
      ENV_MIN_MANUAL_REFRESH_INTERVAL: "1",
      ENV_LIVE_RESULTS_MAX_IDLE_TIME: "60000"
    });
    let livePage: BrowserPage | null = null;
    try {
      const { cookie } = await forgeSession(live, "live-keyboard@example.com");
      const one = makePoll({ title: "First watched" });
      const two = makePoll({ title: "Second watched" });
      const three = makePoll({ title: "Third watched" });
      await polls(live).insertMany([one, two, three]);
      await trendingSweep(live, live.config, live.trendingPublisher);
      livePage = await openPage(live, "index.html", { cookie });
      const addPoll = (livePage.window as unknown as { LiveResults: { addPoll(pid: string): Promise<void> } }).LiveResults.addPoll;
      for (const poll of [one, two, three]) {
        await addPoll(poll._id);
        await livePage.settle(300);
      }
      expect(livePage.cardTitles("live")).toEqual(["Third watched", "Second watched", "First watched"]);

      const linksInTab = () =>
        Array.from(livePage!.document.querySelectorAll('.tab-panel[data-panel="live"] .live-link')) as HTMLAnchorElement[];
      const press = async (link: HTMLAnchorElement, key: string) => {
        link.dispatchEvent(new livePage!.window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
        await livePage!.settle(100);
      };

      // Space removes the poll and places focus on the card that takes its position.
      await press(linksInTab()[0]!, " ");
      expect(livePage.requests.filter((r) => r.url === `/api/live/${three._id}` && r.method === "DELETE").length).toBe(1);
      expect(livePage.cardTitles("live")).toEqual(["Second watched", "First watched"]);
      expect(livePage.document.activeElement).toBe(linksInTab()[0]);
      // The tab's own refresh must not take the focus away again.
      await livePage.settle(700);
      expect(livePage.document.activeElement).toBe(linksInTab()[0]);

      // Enter on the bottom card: no card takes its place, so focus goes to the one before.
      await press(linksInTab()[1]!, "Enter");
      expect(livePage.cardTitles("live")).toEqual(["Second watched"]);
      expect(livePage.document.activeElement).toBe(linksInTab()[0]);

      // The last one: the tab's empty-state line takes the focus.
      await press(linksInTab()[0]!, " ");
      expect(livePage.cardTitles("live")).toEqual([]);
      const line = livePage.document.querySelector('.tab-panel[data-panel="live"] .tab-empty')!;
      expect(line.hasAttribute("hidden")).toBe(false);
      expect(livePage.document.activeElement).toBe(line);
    } finally {
      livePage?.close();
      await live.stop();
    }
  });

  it("the add form answers Enter and Space too", async () => {
    const live = await startTestContext({ ENV_MIN_LIVE_REFRESH_INTERVAL: "300", ENV_MIN_MANUAL_REFRESH_INTERVAL: "1" });
    let livePage: BrowserPage | null = null;
    try {
      const { cookie } = await forgeSession(live, "live-add-keyboard@example.com");
      const poll = makePoll({ title: "Added by keyboard" });
      await polls(live).insertMany([poll]);
      await trendingSweep(live, live.config, live.trendingPublisher);
      livePage = await openPage(live, "index.html", { cookie });
      const link = livePage.document.querySelector('.tab-panel[data-panel="trending"] .live-link') as HTMLAnchorElement;
      link.dispatchEvent(new livePage.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
      await livePage.settle(300);
      expect(livePage.requests.filter((r) => r.url === `/api/live/${poll._id}` && r.method === "POST").length).toBe(1);
      expect(livePage.document.querySelector('.tab[data-tab="live"]')!.classList.contains("is-active")).toBe(true);
      expect(livePage.cardTitles("live")).toEqual(["Added by keyboard"]);
    } finally {
      livePage?.close();
      await live.stop();
    }
  });

  it("a full tab refuses another poll with a modal naming the limit (FIX028); the link carries its tooltip", async () => {
    const live = await startTestContext({
      ENV_MAX_LIVE_RESULTS_PER_USER: "1",
      ENV_MIN_LIVE_REFRESH_INTERVAL: "300",
      ENV_MIN_MANUAL_REFRESH_INTERVAL: "1",
      ENV_LIVE_RESULTS_MAX_IDLE_TIME: "60000"
    });
    let livePage: BrowserPage | null = null;
    try {
      const { cookie } = await forgeSession(live, "live-cap@example.com");
      const first = makePoll({ title: "Watched" });
      const second = makePoll({ title: "Refused" });
      await polls(live).insertMany([first, second]);
      await trendingSweep(live, live.config, live.trendingPublisher);
      livePage = await openPage(live, "index.html", { cookie });
      expect(livePage.document.querySelector('.tab-panel[data-panel="trending"] .live-link')!.getAttribute("title")).toBe("Add to Live Results");
      const addPoll = (livePage.window as unknown as { LiveResults: { addPoll(pid: string): Promise<void> } }).LiveResults.addPoll;
      await addPoll(first._id);
      await livePage.settle(300);
      expect(livePage.cardTitles("live")).toEqual(["Watched"]);

      await addPoll(second._id);
      await livePage.settle(100);
      const dialog = livePage.document.querySelector(".modal-backdrop .modal") as HTMLElement;
      expect(dialog).not.toBeNull();
      expect(dialog.querySelector(".modal-text")!.textContent).toBe(
        "You have reached the maximum number of polls that can be viewed on the Live Results tab. The limit is 1. Please remove a poll on the Live Results tab before adding another."
      );
      expect(livePage.cardTitles("live")).toEqual(["Watched"]);
      (dialog.querySelector(".modal-ok") as HTMLButtonElement).click();
      expect(livePage.document.querySelector(".modal-backdrop")).toBeNull();
    } finally {
      livePage?.close();
      await live.stop();
    }
  });

  it("the idle prompt appears after the idle time; Cancel removes the polls and closes the tab", async () => {
    const live = await startTestContext({
      ENV_MIN_LIVE_REFRESH_INTERVAL: "200",
      ENV_MIN_MANUAL_REFRESH_INTERVAL: "1",
      ENV_LIVE_RESULTS_MAX_IDLE_TIME: "400"
    });
    let livePage: BrowserPage | null = null;
    try {
      const { cookie } = await forgeSession(live, "idle-browser@example.com");
      const poll = makePoll({ title: "Idle me" });
      await polls(live).insertOne(poll);
      await trendingSweep(live, live.config, live.trendingPublisher);
      livePage = await openPage(live, "index.html", { cookie });
      await livePage.click('.tab-panel[data-panel="trending"] .live-link');
      await livePage.settle(900);
      const prompt = livePage.document.querySelector(".live-idle-prompt");
      expect(prompt).not.toBeNull();
      expect(prompt!.textContent).toBe("Do you want to continue to receive Live Results updates?CancelYes");
      await livePage.click(".live-idle-cancel");
      expect(requestsTo(livePage, `/api/live/${poll._id}`).some((r) => r.method === "DELETE")).toBe(true);
      expect(livePage.document.querySelector('.tab[data-tab="trending"]')!.classList.contains("is-active")).toBe(true);
      expect(livePage.cardTitles("live")).toEqual([]);
    } finally {
      livePage?.close();
      await live.stop();
    }
  });
});

describe("the date fields on an admin card", () => {
  it("shows Created and Launched in the dates panel; the start and end read in the Settings Summary", async () => {
    const admin = await startTestContext({ ENV_ADMINS: "admin-start@example.com", ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL: "60000" });
    let adminPage: BrowserPage | null = null;
    try {
      const { cookie } = await forgeSession(admin, "admin-start@example.com");
      const scheduled = new Date(Date.now() + 3_600_000);
      const launchedAt = new Date(Date.now() - 600_000);
      await polls(admin).insertMany([
        makePoll({ title: "Running", pollState: "OPEN", createdAt: launchedAt }),
        makePoll({ title: "Finished", pollState: "CLOSED", endAt: new Date() }),
        makePoll({ title: "Waiting", pollState: "WAITING TO OPEN", startAt: scheduled })
      ]);
      adminPage = await openPage(admin, "admin.html", { cookie, scripts: ["app.js", "adminCard.js", "adminList.js"] });
      const cardOf = (title: string) =>
        Array.from(adminPage!.document.querySelectorAll("#pollList .poll-admin-card")).find((el) =>
          (el.textContent ?? "").includes(title)
        )!;
      const fieldsOf = (title: string) =>
        Array.from(cardOf(title).querySelectorAll(".card-dates-panel .card-field")).map((el) => [
          el.querySelector(".card-field-label")!.textContent,
          el.querySelector(".card-field-value")!.textContent
        ]);
      expect(fieldsOf("Running").map((f) => f[0])).toEqual(["Created", "Launched"]);
      expect(fieldsOf("Running")[1]![1]).toBe(new Date(launchedAt).toLocaleString());
      expect(fieldsOf("Finished")[1]![1]).toBe("not launched");
      expect(fieldsOf("Waiting")[1]![1]).toBe("not launched");
      // The start and end are the Settings Summary's when-line now
      // (client-admin-wizard.test.ts covers its wording in each state).
      expect(cardOf("Running").querySelector(".wizard-summary-when")!.textContent).toContain("is open now");
      expect(cardOf("Waiting").querySelector(".wizard-summary-when")!.textContent).toMatch(/^Voting opens on /);
    } finally {
      adminPage?.close();
      await admin.stop();
    }
  });
});

describe("the admin search form in a browser", () => {
  it("narrows the list to the matching polls and the periodic refresh keeps the active search", async () => {
    const admin = await startTestContext({ ENV_ADMINS: "admin-search@example.com", ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL: "300" });
    let adminPage: BrowserPage | null = null;
    try {
      const { cookie } = await forgeSession(admin, "admin-search@example.com");
      await polls(admin).insertMany([makePoll({ title: "Kettle poll", pollState: "OPEN" }), makePoll({ title: "Teapot poll", pollState: "CLOSED" })]);
      adminPage = await openPage(admin, "admin.html", { cookie, scripts: ["app.js", "adminCard.js", "adminList.js"] });
      const titles = () => Array.from(adminPage!.document.querySelectorAll("#pollList .poll-admin-card")).map((el) => el.querySelector(".card-title, .poll-title, h2, h3")?.textContent ?? el.textContent ?? "");
      expect(adminPage.document.querySelectorAll("#pollList .poll-admin-card").length).toBe(2);
      await adminPage.submitForm("#adminSearchForm", {});
      (adminPage.document.querySelector('#adminSearchForm [name="state"]') as HTMLSelectElement).value = "OPEN";
      await adminPage.submitForm("#adminSearchForm", {});
      expect(adminPage.document.querySelectorAll("#pollList .poll-admin-card").length).toBe(1);
      expect(titles()[0]).toContain("Kettle");
      const searches = () => adminPage!.requests.filter((r) => r.url.startsWith("/api/admin/polls/search")).length;
      const before = searches();
      await adminPage.settle(400);
      expect(searches()).toBeGreaterThan(before);
      expect(adminPage.requests.filter((r) => r.url === "/api/admin/polls").length).toBeGreaterThanOrEqual(1);
      // FIX010: Clear empties the Search view and prompts; Newest is its own view.
      await adminPage.click("#adminSearchClear");
      expect(adminPage.document.querySelectorAll("#pollList .poll-admin-card").length).toBe(0);
      expect(adminPage.document.getElementById("adminSearchNotice")!.textContent).toBe("");
      await adminPage.click('#adminTabBar .tab[data-tab="newest"]');
      expect(adminPage.document.querySelectorAll("#pollList .poll-admin-card").length).toBe(2);
      expect(adminPage.document.getElementById("adminSearchForm")!.hidden).toBe(true);
    } finally {
      adminPage?.close();
      await admin.stop();
    }
  });

  it("the admin views are independent: state tabs list their polls, and Create New Poll opens the new poll on Newest from any view (FIX010)", async () => {
    const admin = await startTestContext({ ENV_ADMINS: "admin-views@example.com", ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL: "60000" });
    let adminPage: BrowserPage | null = null;
    try {
      const { cookie } = await forgeSession(admin, "admin-views@example.com");
      const seeded = [
        makePoll({ title: "Open one", pollState: "OPEN" }),
        makePoll({ title: "Waiting one", pollState: "AWAITING APPROVAL" }),
        makePoll({ title: "Rejected one", pollState: "REJECTED", pollRejectionReason: "no" })
      ];
      await polls(admin).insertMany(seeded);
      adminPage = await openPage(admin, "admin.html", { cookie, scripts: ["app.js", "adminCard.js", "adminList.js"] });
      adminPage.window.HTMLElement.prototype.scrollIntoView = () => {};
      const cards = () => adminPage!.document.querySelectorAll("#pollList .poll-admin-card").length;
      const active = () => (adminPage!.document.querySelector("#adminTabBar .tab.is-active") as HTMLElement).dataset.tab;
      expect(active()).toBe("newest");
      expect(cards()).toBe(3);

      await adminPage.click('#adminTabBar .tab[data-tab="awaiting"]');
      expect(active()).toBe("awaiting");
      expect(cards()).toBe(1);
      expect(adminPage.document.querySelector("#pollList .poll-admin-card")!.textContent).toContain("Waiting one");

      await adminPage.click('#adminTabBar .tab[data-tab="rejected"]');
      expect(cards()).toBe(1);
      expect(adminPage.document.querySelector("#pollList .poll-admin-card")!.textContent).toContain("Rejected one");

      // A search is in effect, as in the report; Create still shows its poll.
      await adminPage.click('#adminTabBar .tab[data-tab="search"]');
      expect(adminPage.document.getElementById("adminSearchForm")!.hidden).toBe(false);
      (adminPage.document.querySelector('#adminSearchForm [name="state"]') as HTMLSelectElement).value = "OPEN";
      await adminPage.submitForm("#adminSearchForm", {});
      expect(cards()).toBe(1);
      await adminPage.click("#createPollBtn");
      await adminPage.settle(100);
      expect(active()).toBe("newest");
      expect(cards()).toBe(4);
      // The new card opened its wizard: it is the one being edited.
      const created = await admin.db.selectFrom("polls").select("id").where("id", "not in", seeded.map((p) => p._id)).executeTakeFirstOrThrow();
      const newCard = adminPage.document.querySelector(`#pollList .poll-admin-card[data-pid="${created.id}"]`);
      expect(newCard).not.toBeNull();
      expect(adminPage.requests.some((r) => r.url === `/api/admin/polls/${created.id}/edit-session` && r.method === "POST")).toBe(true);
      expect(newCard!.querySelector(".wizard-panel-heading")!.textContent).toBe("Step 1 · Who can vote");
      // Back on Search, the search is still there.
      await adminPage.settle(200);
      const searchTab = adminPage.document.querySelector('#adminTabBar .tab[data-tab="search"]') as HTMLButtonElement;
      if (!searchTab.disabled) {
        await adminPage.click('#adminTabBar .tab[data-tab="search"]');
        expect((adminPage.document.querySelector('#adminSearchForm [name="state"]') as HTMLSelectElement).value).toBe("OPEN");
      }
    } finally {
      adminPage?.close();
      await admin.stop();
    }
  });
});

describe("bookmarking from a card in a browser", () => {
  it("toggles the button through the bookmark endpoints and updates the card locally without a refresh", async () => {
    const { cookie } = await forgeSession(ctx, "browser-marks@example.com");
    const poll = makePoll({ title: "Mark me" });
    await polls(ctx).insertOne(poll);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html", { cookie });
    const button = () => page!.document.querySelector('.tab-panel[data-panel="trending"] .bookmark-btn') as HTMLButtonElement;
    expect(button().getAttribute("aria-label")).toBe("Watch");
    await page.settle(1250);
    await page.click('.tab-panel[data-panel="trending"] .bookmark-btn');
    expect(page.requests.filter((r) => r.url === `/api/polls/${poll._id}/bookmark` && r.method === "POST").length).toBe(1);
    expect(button().getAttribute("aria-label")).toBe("Watching");
    expect(button().getAttribute("aria-pressed")).toBe("true");
    expect(await ctx.db.selectFrom("bookmarks").selectAll().where("poll_id", "=", poll._id).execute()).toHaveLength(1);
    await page.settle(1250);
    await page.click('.tab-panel[data-panel="trending"] .bookmark-btn');
    expect(page.requests.filter((r) => r.url === `/api/polls/${poll._id}/bookmark` && r.method === "DELETE").length).toBe(1);
    expect(button().getAttribute("aria-label")).toBe("Watch");
    expect(requestsTo(page, "/api/tabs").length).toBe(0);
  });
});

describe("the watch cap in a browser (FIX027)", () => {
  it("a refused Watch opens a modal naming the limit; OK closes it and the card stays unmarked", async () => {
    const capped = await startTestContext({ ENV_MAX_BOOKMARKS_PER_USER: "1", ENV_MIN_MANUAL_REFRESH_INTERVAL: "1" });
    let cappedPage: BrowserPage | null = null;
    try {
      const me = "browser-cap@example.com";
      const { cookie } = await forgeSession(capped, me);
      const held = makePoll({ title: "Already kept" });
      const more = makePoll({ title: "One too many" });
      await polls(capped).insertMany([held, more]);
      await addBookmark(capped, me, held._id, 1);
      await trendingSweep(capped, capped.config, capped.trendingPublisher);
      cappedPage = await openPage(capped, "index.html", { cookie });
      await cappedPage.settle(50);
      const card = Array.from(cappedPage.document.querySelectorAll('.tab-panel[data-panel="trending"] .card-viewport')).find(
        (c) => c.querySelector(".card-front .question")!.textContent === "One too many"
      )!;
      (card.querySelector(".bookmark-btn") as HTMLButtonElement).click();
      await cappedPage.settle(50);
      const dialog = cappedPage.document.querySelector(".modal-backdrop .modal") as HTMLElement;
      expect(dialog).not.toBeNull();
      expect(dialog.getAttribute("role")).toBe("dialog");
      expect(dialog.querySelector(".modal-text")!.textContent).toBe(
        "You have reached the maximum number of polls you can watch. The limit is 1. Please stop watching a poll on the Watching tab before watching another."
      );
      expect(card.querySelector(".bookmark-btn")!.getAttribute("aria-pressed")).toBe("false");
      (dialog.querySelector(".modal-ok") as HTMLButtonElement).click();
      expect(cappedPage.document.querySelector(".modal-backdrop")).toBeNull();
      expect(await capped.db.selectFrom("bookmarks").selectAll().where("email", "=", me).execute()).toHaveLength(1);
    } finally {
      cappedPage?.close();
      await capped.stop();
    }
  });
});

describe("a bookmark and the personal tabs in a browser", () => {
  it("a bookmarked public poll appears in Watching at once, and the tab confirms with the server after the floor", async () => {
    const { cookie } = await forgeSession(ctx, "browser-favs@example.com");
    const poll = makePoll({ title: "New favourite" });
    await polls(ctx).insertOne(poll);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html", { cookie });
    await page.settle(1250);
    await page.click('.tab[data-tab="watching"]');
    expect(requestsTo(page, "/api/tabs/watching/refresh").length).toBe(1);
    expect(page.cardTitles("watching")).toEqual([]);
    await page.settle(1250);

    await page.click('.tab[data-tab="trending"]');
    await page.click('.tab-panel[data-panel="trending"] .bookmark-btn');
    expect(await ctx.db.selectFrom("bookmarks").selectAll().where("poll_id", "=", poll._id).execute()).toHaveLength(1);

    // Straight back to Watching, inside the floor the bookmark just took: the poll is already there.
    await page.click('.tab[data-tab="watching"]');
    expect(page.cardTitles("watching")).toEqual(["New favourite"]);
    expect(page.document.querySelector('.tab-panel[data-panel="watching"] .bookmark-btn')!.getAttribute("aria-label")).toBe("Watching");
    expect(requestsTo(page, "/api/tabs/watching/refresh").length).toBe(1);

    // Once the floor passes the tab confirms its copy with one request and keeps the poll.
    await page.settle(1400);
    expect(requestsTo(page, "/api/tabs/watching/refresh").length).toBe(2);
    expect(page.cardTitles("watching")).toEqual(["New favourite"]);

    // Un-bookmark from Watching: the poll leaves at once, and the server confirms after the floor.
    await page.settle(1250);
    await page.click('.tab-panel[data-panel="watching"] .bookmark-btn');
    expect(await ctx.db.selectFrom("bookmarks").selectAll().where("poll_id", "=", poll._id).execute()).toHaveLength(0);
    expect(page.cardTitles("watching")).toEqual([]);
    expect(page.document.querySelector('.tab-panel[data-panel="watching"] .tab-empty')!.hasAttribute("hidden")).toBe(false);
    expect(requestsTo(page, "/api/tabs/watching/refresh").length).toBe(2);
    await page.settle(1400);
    expect(requestsTo(page, "/api/tabs/watching/refresh").length).toBe(3);
    expect(page.cardTitles("watching")).toEqual([]);
  });

  it("un-bookmarking a poll the visitor voted in removes it from Watching only", async () => {
    const me = "browser-voted-marks@example.com";
    const { cookie } = await forgeSession(ctx, me);
    const poll = makePoll({ title: "Voted and marked", currentVotes: [{ emailAddress: me, userName: "", choiceIds: ["c1"], votedAt: new Date() }] });
    await polls(ctx).insertOne(poll);
    await addBookmark(ctx, me, poll._id, 200);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html", { cookie });
    await page.settle(1250);
    await page.click('.tab[data-tab="watching"]');
    expect(page.cardTitles("watching")).toEqual(["Voted and marked"]);
    const button = () => page!.document.querySelector('.tab-panel[data-panel="watching"] .bookmark-btn') as HTMLButtonElement;
    expect(button().getAttribute("aria-label")).toBe("Watching");
    await page.settle(1250);
    await page.click('.tab-panel[data-panel="watching"] .bookmark-btn');
    expect(await ctx.db.selectFrom("bookmarks").selectAll().where("poll_id", "=", poll._id).execute()).toHaveLength(0);
    expect(page.cardTitles("watching")).toEqual([]);
    await page.settle(1400);
    expect(page.cardTitles("watching")).toEqual([]);
  });

  it("a bookmarked private poll lands in Watching, and Shared With You is unaffected", async () => {
    const me = "browser-private-marks@example.com";
    const { cookie, userId } = await forgeSession(ctx, me);
    const poll = makePoll({ title: "Private pick", pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link" });
    await polls(ctx).insertOne(poll);
    await ctx.db.updateTable("polls").set({ created_by_id: userId }).where("id", "=", poll._id).execute();
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html", { cookie });
    await page.settle(1250);
    await page.click('.tab[data-tab="shared-with-you"]');
    expect(page.cardTitles("shared-with-you")).toEqual([]);
    await page.settle(1250);
    await page.click('.tab[data-tab="watching"]');
    expect(page.cardTitles("watching")).toEqual([]);
    await page.settle(1250);

    // A private poll reaches the browser through Live Results; the bookmark is pressed there.
    (page.window as unknown as { LiveResults: { addPoll(pid: string): Promise<void> } }).LiveResults.addPoll(poll._id);
    await page.settle(300);
    expect(page.cardTitles("live")).toEqual(["Private pick"]);
    // The tab's overlay call (FIX011) waits out the floor the add took, then takes one itself.
    await page.settle(2600);
    await page.click('.tab-panel[data-panel="live"] .bookmark-btn');
    expect(await ctx.db.selectFrom("bookmarks").selectAll().where("poll_id", "=", poll._id).execute()).toHaveLength(1);

    await page.click('.tab[data-tab="watching"]');
    expect(page.cardTitles("watching")).toEqual(["Private pick"]);
    expect(page.document.querySelector('.tab-panel[data-panel="watching"] .bookmark-btn')!.hasAttribute("hidden")).toBe(false);
    await page.click('.tab[data-tab="shared-with-you"]');
    expect(page.cardTitles("shared-with-you")).toEqual([]);
  });
});

describe("a bookmark seen from another window (FIX04)", () => {
  /* jsdom has no BroadcastChannel; this stand-in links the windows of one test. */
  function fakeChannels() {
    const members: Record<string, { onmessage: ((event: { data: unknown }) => void) | null }[]> = {};
    return (window: BrowserPage["window"]) => {
      class FakeBroadcastChannel {
        onmessage: ((event: { data: unknown }) => void) | null = null;
        constructor(public name: string) {
          (members[name] ??= []).push(this);
        }
        postMessage(data: unknown) {
          for (const other of members[this.name] ?? []) if (other !== this) other.onmessage?.({ data });
        }
        close() {}
      }
      (window as unknown as { BroadcastChannel: unknown }).BroadcastChannel = FakeBroadcastChannel;
    };
  }

  let other: BrowserPage | null = null;
  afterAll(() => other?.close());

  it("a bookmark in one window shows in the other window's Watching at once and is confirmed after the floor", async () => {
    const me = "two-windows@example.com";
    const { cookie } = await forgeSession(ctx, me);
    const voted = makePoll({ title: "Voted one", currentVotes: [{ emailAddress: me, userName: "", choiceIds: ["c1"], votedAt: new Date() }] });
    const target = makePoll({ title: "Dogs markets" });
    await polls(ctx).insertMany([voted, target]);
    await addBookmark(ctx, me, voted._id, 200);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    const beforeScripts = fakeChannels();
    other = await openPage(ctx, "index.html", { cookie, beforeScripts });
    await other.settle(1250);
    await other.click('.tab[data-tab="watching"]');
    expect(other.cardTitles("watching")).toEqual(["Voted one"]);
    // The second window's overlay call meets the floor and is asked again (FIX06);
    // the bookmark below waits until that has settled too.
    page = await openPage(ctx, "index.html", { cookie, beforeScripts });
    await page.settle(2600);

    const card = Array.from(page.document.querySelectorAll('.tab-panel[data-panel="trending"] .card-front')).find(
      (el) => el.querySelector(".question")!.textContent === "Dogs markets"
    )!;
    (card.querySelector(".bookmark-btn") as HTMLButtonElement).click();
    await page.settle(100);
    expect(await ctx.db.selectFrom("bookmarks").selectAll().where("poll_id", "=", target._id).execute()).toHaveLength(1);

    // The other window, still inside the floor, already lists it and has sent nothing new.
    expect(other.cardTitles("watching")).toEqual(["Dogs markets", "Voted one"]);
    const otherTrending = Array.from(other.document.querySelectorAll('.tab-panel[data-panel="trending"] .card-front')).find(
      (el) => el.querySelector(".question")!.textContent === "Dogs markets"
    )!;
    expect(otherTrending.querySelector(".bookmark-btn")!.getAttribute("aria-pressed")).toBe("true");
    const favouritesRefreshes = () => requestsTo(other!, "/api/tabs/watching/refresh").length;
    expect(favouritesRefreshes()).toBe(1);

    // Once the floor passes it confirms with the server and keeps the poll.
    await other.settle(1400);
    expect(favouritesRefreshes()).toBe(2);
    expect(other.cardTitles("watching")).toEqual(["Dogs markets", "Voted one"]);
    other.close();
    other = null;
  });

  it("returning to a window whose Watching copy is older than the floor confirms it with the server", async () => {
    const me = "returning@example.com";
    const { cookie } = await forgeSession(ctx, me);
    const target = makePoll({ title: "Marked elsewhere" });
    await polls(ctx).insertOne(target);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html", { cookie });
    await page.settle(1250);
    await page.click('.tab[data-tab="watching"]');
    expect(page.cardTitles("watching")).toEqual([]);
    const favouritesRefreshes = () => requestsTo(page!, "/api/tabs/watching/refresh").length;
    expect(favouritesRefreshes()).toBe(1);

    // Bookmarked on another device.
    await addBookmark(ctx, me, target._id, 200);

    // Focus within the floor: the copy is fresh, nothing is sent.
    page.window.dispatchEvent(new page.window.Event("focus"));
    await page.settle(100);
    expect(favouritesRefreshes()).toBe(1);

    await page.settle(1250);
    page.window.dispatchEvent(new page.window.Event("focus"));
    await page.settle(200);
    expect(favouritesRefreshes()).toBe(2);
    expect(page.cardTitles("watching")).toEqual(["Marked elsewhere"]);
  });
});

describe("the signed-in overlay on a page load (FIX06)", () => {
  it("a reload inside the floor is refused the overlay once and asks again, so a bookmarked TRENDING card shows as bookmarked", async () => {
    const me = "reload-overlay@example.com";
    const { cookie } = await forgeSession(ctx, me);
    const target = makePoll({ title: "Dogs markets" });
    await polls(ctx).insertMany([makePoll({ title: "Other" }), target]);
    await addBookmark(ctx, me, target._id, 200);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    const marked = (p: BrowserPage) =>
      Array.from(p.document.querySelectorAll('.tab-panel[data-panel="trending"] .card-front'))
        .find((el) => el.querySelector(".question")!.textContent === "Dogs markets")!
        .querySelector(".bookmark-btn")!
        .getAttribute("aria-pressed");

    page = await openPage(ctx, "index.html", { cookie });
    expect(marked(page)).toBe("true");
    const copy = page.window.sessionStorage.getItem("trending:copy")!;
    page.close();

    // F5 straight away: the stored copy renders, but the overlay call meets the floor
    // the first load's call took.
    page = await openPage(ctx, "index.html", { cookie, sessionStorage: { "trending:copy": copy } });
    const overlayCalls = () => requestsTo(page!, "/api/me/polls").length;
    expect(overlayCalls()).toBe(1);
    expect(marked(page)).toBe("false");
    await page.settle(1400);
    expect(overlayCalls()).toBe(2);
    expect(marked(page)).toBe("true");
  });
});

describe("the burst allowance in a browser (FIX008)", () => {
  let burst: TestContext;
  let bp: BrowserPage | null = null;
  beforeAll(async () => {
    burst = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1200", ENV_MANUAL_REFRESH_BURST: "3" });
  });
  afterAll(async () => {
    bp?.close();
    await burst.stop();
  });

  it("a bookmark right after a tab refresh is sent and lands in Watching; the Refresh button stays enabled until the allowance is spent", async () => {
    const me = "burst@example.com";
    const { cookie } = await forgeSession(burst, me);
    const target = makePoll({ title: "Quick mark" });
    await polls(burst).insertMany([makePoll({ title: "Other" }), target]);
    await trendingSweep(burst, burst.config, burst.trendingPublisher);
    bp = await openPage(burst, "index.html", { cookie });
    // Load spent one token (the overlay call); two are left.
    await bp.click('.tab[data-tab="watching"]');
    expect(requestsTo(bp, "/api/tabs/watching/refresh").length).toBe(1);
    expect(bp.cardTitles("watching")).toEqual([]);

    // Bookmark straight away, inside what used to be the floor: sent and served.
    await bp.click('.tab[data-tab="trending"]');
    const card = Array.from(bp.document.querySelectorAll('.tab-panel[data-panel="trending"] .card-front')).find(
      (el) => el.querySelector(".question")!.textContent === "Quick mark"
    )!;
    (card.querySelector(".bookmark-btn") as HTMLButtonElement).click();
    await bp.settle(100);
    expect(bp.requests.filter((r) => r.url === `/api/polls/${target._id}/bookmark` && r.method === "POST").length).toBe(1);
    expect(await burst.db.selectFrom("bookmarks").selectAll().where("poll_id", "=", target._id).execute()).toHaveLength(1);
    expect(card.querySelector(".bookmark-btn")!.getAttribute("aria-pressed")).toBe("true");
    expect(bp.document.getElementById("tabNotice")!.hidden).toBe(true);

    // The allowance is now spent: a fourth request waits for the refill.
    await bp.click('.tab[data-tab="watching"]');
    expect(bp.cardTitles("watching")).toEqual(["Quick mark"]);
    const refresh = bp.document.getElementById("refreshBtn") as HTMLButtonElement;
    expect(refresh.getAttribute("aria-disabled")).toBe("true");
    await bp.click("#refreshBtn");
    expect(requestsTo(bp, "/api/tabs/watching/refresh").length).toBe(1);
    await bp.settle(1300);
    // One token back: the due confirmation used it.
    expect(requestsTo(bp, "/api/tabs/watching/refresh").length).toBe(2);
    expect(bp.cardTitles("watching")).toEqual(["Quick mark"]);
  });

  it("a click with no token left is not sent and says how long to wait", async () => {
    const { cookie } = await forgeSession(burst, "burst-wait@example.com");
    const target = makePoll({ title: "Patience" });
    await polls(burst).insertOne(target);
    await trendingSweep(burst, burst.config, burst.trendingPublisher);
    bp?.close();
    bp = await openPage(burst, "index.html", { cookie });
    const button = () => bp!.document.querySelector('.tab-panel[data-panel="trending"] .bookmark-btn') as HTMLButtonElement;
    const posts = () => bp!.requests.filter((r) => r.url === `/api/polls/${target._id}/bookmark`).length;
    await bp.click('.tab-panel[data-panel="trending"] .bookmark-btn');
    await bp.click('.tab-panel[data-panel="trending"] .bookmark-btn');
    expect(posts()).toBe(2);
    expect(button().getAttribute("aria-pressed")).toBe("false");
    await bp.click('.tab-panel[data-panel="trending"] .bookmark-btn');
    expect(posts()).toBe(2);
    const noticeEl = bp.document.getElementById("tabNotice")!;
    expect(noticeEl.hidden).toBe(false);
    expect(noticeEl.textContent).toMatch(/Please wait \d+ s/);
    await bp.settle(1300);
    await bp.click('.tab-panel[data-panel="trending"] .bookmark-btn');
    expect(posts()).toBe(3);
    expect(button().getAttribute("aria-pressed")).toBe("true");
  });
});

describe("the Live Results tab's overlay (FIX011)", () => {
  it("a bookmarked poll shows as bookmarked in Live Results, from the handing-over tab at once and from the server when no tab holds it", async () => {
    const live = await startTestContext({ ENV_MIN_LIVE_REFRESH_INTERVAL: "300", ENV_MIN_MANUAL_REFRESH_INTERVAL: "1", ENV_LIVE_RESULTS_MAX_IDLE_TIME: "60000" });
    let livePage: BrowserPage | null = null;
    try {
      const me = "live-marks@example.com";
      const { cookie } = await forgeSession(live, me);
      const poll = makePoll({ title: "Watch and keep" });
      await polls(live).insertOne(poll);
      await addBookmark(live, me, poll._id, 200);
      await trendingSweep(live, live.config, live.trendingPublisher);
      livePage = await openPage(live, "index.html", { cookie });
      const liveButton = () => livePage!.document.querySelector('.tab-panel[data-panel="live"] .bookmark-btn') as HTMLButtonElement;
      const trendingPressed = () => livePage!.document.querySelector('.tab-panel[data-panel="trending"] .bookmark-btn')?.getAttribute("aria-pressed");
      const deadline = Date.now() + 2000;
      while (Date.now() < deadline && trendingPressed() !== "true") await livePage.settle(100);
      expect(trendingPressed()).toBe("true");
      await livePage.click('.tab-panel[data-panel="trending"] .live-link');
      expect(livePage.cardTitles("live")).toEqual(["Watch and keep"]);
      // Copied from TRENDING's overlay: no second overlay call.
      expect(liveButton().getAttribute("aria-pressed")).toBe("true");
      expect(requestsTo(livePage, "/api/me/polls").map((r) => `${r.url} ${r.status}`)).toEqual([`/api/me/polls?pids=${poll._id} 200`]);

      // One click un-bookmarks, as the icon says it will.
      await livePage.click('.tab-panel[data-panel="live"] .bookmark-btn');
      expect(livePage.requests.filter((r) => r.url === `/api/polls/${poll._id}/bookmark` && r.method === "DELETE").length).toBe(1);
      expect(liveButton().getAttribute("aria-pressed")).toBe("false");
      await addBookmark(live, me, poll._id, 200);

      // A poll no other tab holds (private, so not in TRENDING): the tab asks
      // /api/me/polls for its overlay.
      const hidden = makePoll({ title: "Private and kept", pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link" });
      await polls(live).insertOne(hidden);
      await addBookmark(live, me, hidden._id, 200);
      (livePage.window as unknown as { LiveResults: { addPoll(pid: string): Promise<void> } }).LiveResults.addPoll(hidden._id);
      await livePage.settle(300);
      expect(livePage.cardTitles("live")).toEqual(["Private and kept", "Watch and keep"]);
      expect(requestsTo(livePage, "/api/me/polls").length).toBe(2);
      const buttons = Array.from(livePage.document.querySelectorAll('.tab-panel[data-panel="live"] .bookmark-btn'));
      expect(buttons.map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "false"]);
    } finally {
      livePage?.close();
      await live.stop();
    }
  });
});

describe("arriving with search terms on the URL (FIX013)", () => {
  it("runs the search, fills the header box and opens the Search tab instead of TRENDING", async () => {
    await polls(ctx).insertMany([makePoll({ title: "Quantum kettle" }), makePoll({ title: "Teapot" })]);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html", { beforeScripts: (w) => w.history.replaceState(null, "", "/?q=kettle") });
    await page.settle(100);
    expect(page.document.querySelector('.tab[data-tab="search"]')!.classList.contains("is-active")).toBe(true);
    expect((page.document.getElementById("siteSearchBox") as HTMLInputElement).value).toBe("kettle");
    expect(page.cardTitles("search")).toEqual(["Quantum kettle"]);
  });
});

describe("the Live Results tab in another window or after a reload (FIX018)", () => {
  it("a window that holds nothing asks the server for the session's registered polls when the tab is opened", async () => {
    const live = await startTestContext({ ENV_MIN_LIVE_REFRESH_INTERVAL: "300", ENV_MIN_MANUAL_REFRESH_INTERVAL: "1", ENV_LIVE_RESULTS_MAX_IDLE_TIME: "60000" });
    let first: BrowserPage | null = null;
    let second: BrowserPage | null = null;
    try {
      const { cookie } = await forgeSession(live, "live-two-windows@example.com");
      const poll = makePoll({ title: "Watched elsewhere" });
      await polls(live).insertOne(poll);
      await trendingSweep(live, live.config, live.trendingPublisher);

      // Nothing registered yet: opening the tab asks once and keeps the prompt.
      second = await openPage(live, "index.html", { cookie });
      await second.click('.tab[data-tab="live"]');
      expect(requestsTo(second, "/api/live/refresh").length).toBe(1);
      expect(second.cardTitles("live")).toEqual([]);
      expect(second.document.querySelector('.tab-panel[data-panel="live"] .tab-empty')!.hasAttribute("hidden")).toBe(false);
      expect(second.document.querySelector('.tab[data-tab="live"]')!.classList.contains("is-active")).toBe(true);

      first = await openPage(live, "index.html", { cookie });
      await first.click('.tab-panel[data-panel="trending"] .live-link');
      expect(first.cardTitles("live")).toEqual(["Watched elsewhere"]);
      // The first window goes to the background (its refreshes pause; the session's
      // live floor is free) — the way a second window is normally reached.
      Object.defineProperty(first.document, "hidden", { value: true, configurable: true });
      first.document.dispatchEvent(new first.window.Event("visibilitychange"));

      // The second window, back on the tab, now shows the poll and refreshes it.
      await second.settle(400);
      await second.click('.tab[data-tab="trending"]');
      await second.click('.tab[data-tab="live"]');
      await second.settle(100);
      expect(second.cardTitles("live")).toEqual(["Watched elsewhere"]);
      const refreshes = requestsTo(second, "/api/live/refresh").length;
      await second.settle(700);
      expect(requestsTo(second, "/api/live/refresh").length).toBeGreaterThan(refreshes);

      // A reload of the first window while the second is in the background: the tab
      // comes back with the poll.
      Object.defineProperty(second.document, "hidden", { value: true, configurable: true });
      second.document.dispatchEvent(new second.window.Event("visibilitychange"));
      first.close();
      await second.settle(400);
      first = await openPage(live, "index.html", { cookie });
      await first.click('.tab[data-tab="live"]');
      await first.settle(100);
      expect(first.cardTitles("live")).toEqual(["Watched elsewhere"]);
    } finally {
      first?.close();
      second?.close();
      await live.stop();
    }
  });
});

describe("two visible windows on Live Results (FIX019)", () => {
  it("share the session's live floor by turns, so both windows end up with the same polls; the Refresh control is hidden there", async () => {
    const live = await startTestContext({ ENV_MIN_LIVE_REFRESH_INTERVAL: "300", ENV_MIN_MANUAL_REFRESH_INTERVAL: "1", ENV_LIVE_RESULTS_MAX_IDLE_TIME: "60000" });
    let a: BrowserPage | null = null;
    let b: BrowserPage | null = null;
    try {
      const { cookie } = await forgeSession(live, "live-turns@example.com");
      const one = makePoll({ title: "First watched" });
      const two = makePoll({ title: "Second watched" });
      await polls(live).insertMany([one, two]);
      await trendingSweep(live, live.config, live.trendingPublisher);
      a = await openPage(live, "index.html", { cookie });
      b = await openPage(live, "index.html", { cookie });
      const addTo = (p: BrowserPage, pid: string) =>
        (p.window as unknown as { LiveResults: { addPoll(pid: string): Promise<void> } }).LiveResults.addPoll(pid);

      // Window A watches one poll and keeps refreshing in the foreground.
      await addTo(a, one._id);
      await a.settle(100);
      expect(a.cardTitles("live")).toEqual(["First watched"]);
      expect(a.document.querySelector(".tab-bar-wrap")!.getAttribute("data-active")).toBe("live");
      // Window B opens the tab, sees the same poll, then adds a second one.
      await b.click('.tab[data-tab="live"]');
      await b.settle(800);
      expect(b.cardTitles("live")).toEqual(["First watched"]);
      await b.settle(400);
      await addTo(b, two._id);
      // Both windows take turns on the floor: each sees the second poll within a few intervals.
      const until = async (p: BrowserPage, titles: string[], ms: number) => {
        const deadline = Date.now() + ms;
        while (Date.now() < deadline && JSON.stringify(p.cardTitles("live")) !== JSON.stringify(titles)) await p.settle(100);
        return p.cardTitles("live");
      };
      expect(await until(b, ["Second watched", "First watched"], 3000)).toEqual(["Second watched", "First watched"]);
      expect(await until(a, ["Second watched", "First watched"], 4000)).toEqual(["Second watched", "First watched"]);
      const served = (p: BrowserPage) => p.requests.filter((r) => r.url === "/api/live/refresh" && (r.status === 200 || r.status === 304)).length;
      expect(served(a)).toBeGreaterThan(1);
      expect(served(b)).toBeGreaterThan(1);
    } finally {
      a?.close();
      b?.close();
      await live.stop();
    }
  });
});

describe("why a poll is listed in a personal tab (FIX020)", () => {
  it("Watching cards say You are watching, and You voted when they did", async () => {
    const me = "why-listed@example.com";
    const { cookie } = await forgeSession(ctx, me);
    const voted = makePoll({ title: "Voted one", currentVotes: [{ emailAddress: me, userName: "", choiceIds: ["c1"], votedAt: new Date() }] });
    const marked = makePoll({ title: "Marked one" });
    await polls(ctx).insertMany([voted, marked]);
    await addBookmark(ctx, me, voted._id, 200);
    await addBookmark(ctx, me, marked._id, 200);
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await openPage(ctx, "index.html", { cookie });
    await page.settle(1250);
    await page.click('.tab[data-tab="watching"]');
    const cardOf = (title: string) =>
      Array.from(page!.document.querySelectorAll('.tab-panel[data-panel="watching"] .card-front')).find(
        (el) => el.querySelector(".question")!.textContent === title
      )!;
    const votedOf = (title: string) => cardOf(title).querySelector(".poll-voted") as HTMLElement;
    const lineOf = (title: string) => cardOf(title).querySelector(".poll-listed-because") as HTMLElement;
    expect(votedOf("Voted one").textContent).toBe("You voted");
    expect(votedOf("Voted one").hidden).toBe(false);
    expect(lineOf("Voted one").textContent).toBe("You are watching");
    expect(lineOf("Voted one").hidden).toBe(false);
    expect(votedOf("Marked one").hidden).toBe(true);
    expect(lineOf("Marked one").textContent).toBe("You are watching");
    // TRENDING cards carry no such line.
    expect(page.document.querySelector('.tab-panel[data-panel="trending"] .poll-voted')!.hasAttribute("hidden")).toBe(true);
    expect(page.document.querySelector('.tab-panel[data-panel="trending"] .poll-listed-because')!.hasAttribute("hidden")).toBe(true);

    // Stopping the watch removes the poll from Watching, whatever else the visitor did with it.
    await page.settle(1250);
    (cardOf("Voted one").querySelector(".bookmark-btn") as HTMLButtonElement).click();
    await page.settle(100);
    expect(page.cardTitles("watching")).toEqual(["Marked one"]);
  });
});

describe("the header's Create Poll link and the vote grant (025)", () => {
  async function signedInWith(email: string, permissions?: string[]) {
    const forged = await forgeSession(ctx, email);
    if (permissions) {
      await ctx.db.updateTable("user").set({ permissions }).where("id", "=", forged.userId).execute();
    }
    return openPage(ctx, "index.html", { cookie: forged.cookie });
  }

  const createPollLink = (p: BrowserPage) => p.document.querySelector(".header-nav-link") as HTMLAnchorElement | null;

  function expectLive(link: HTMLAnchorElement | null) {
    if (!link) throw new Error("no Create Poll link");
    expect(link.classList.contains("is-inert")).toBe(false);
    expect(link.hasAttribute("aria-disabled")).toBe(false);
    expect(link.getAttribute("href")).toBe("/admin");
  }

  it("is absent for a guest and for a user missing either creator grant", async () => {
    page = await openPage(ctx, "index.html");
    expect(createPollLink(page)).toBeNull();
    page.close();
    page = await signedInWith("link-none@example.com", ["View Polls", "Vote on Polls"]);
    expect(createPollLink(page)).toBeNull();
    page.close();
    page = await signedInWith("link-create-only@example.com", ["Create Poll"]);
    expect(createPollLink(page)).toBeNull();
  });

  it("goes to /admin for a creator and for an administrator", async () => {
    page = await signedInWith("link-creator@example.com");
    expectLive(createPollLink(page));
    page.close();
    page = await signedInWith(ctx.config.admins[0]!, []);
    expectLive(createPollLink(page));
  });

  it("lists Poll Administration under Edit Profile for a creator, and not for a user missing a creator grant", async () => {
    const menuLinks = (p: BrowserPage) =>
      Array.from(p.document.querySelectorAll(".avatar-menu a")).map((a) => [a.querySelector(".avatar-menu-label")!.firstChild!.textContent, a.getAttribute("href")]);
    page = await signedInWith("menu-creator@example.com");
    expect(menuLinks(page)).toEqual([
      ["Edit Profile", "/profile"],
      ["Create Poll", "/admin"],
      ["Poll Administration", "/admin"],
      ["Logout", "#"]
    ]);
    page.close();
    page = await signedInWith("menu-no-create@example.com", ["View Polls", "Vote on Polls"]);
    expect(menuLinks(page).map(([text]) => text)).toEqual(["Edit Profile", "Create Poll", "Logout"]);
    expect(page.document.querySelector(".avatar-menu-create-poll")!.getAttribute("aria-disabled")).toBe("true");
  });

  it("shows a user without View Polls no poll cards at all, only the reason", async () => {
    await polls(ctx).insertOne(makePoll({ title: "Hidden from the barred" }));
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await signedInWith("no-view-cards@example.com", ["Vote on Polls", "Create Poll"]);
    const panel = page.document.querySelector('.tab-panel[data-panel="trending"]')!;
    expect(panel.querySelectorAll(".card-viewport").length).toBe(0);
    const empty = panel.querySelector(".tab-empty") as HTMLElement;
    expect(empty.hidden).toBe(false);
    expect(empty.textContent).toBe("You do not have permission to view polls.");
  });

  it("withdraws the vote controls on every card for a user without Vote on Polls", async () => {
    await polls(ctx).insertOne(makePoll({ title: "Cannot vote here" }));
    await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
    page = await signedInWith("no-vote-card@example.com", ["View Polls", "Create Poll"]);
    const card = page.document.querySelector('.tab-panel[data-panel="trending"] .card-viewport')!;
    const message = card.querySelector(".card-front .poll-blocked-message") as HTMLElement;
    expect(message.hidden).toBe(false);
    expect(message.textContent).toBe("You do not have permission to vote.");
    expect((card.querySelector(".vote-btn") as HTMLElement).hidden).toBe(true);
  });
});

describe("where a poll link landed, in a browser", () => {
  async function sharedPoll(overrides: Parameters<typeof makePoll>[0] = {}) {
    const poll = makePoll({ _id: randomUUID(), title: "Shared with me", pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link", ...overrides });
    await polls(ctx).insertOne(poll);
    return poll;
  }

  const arrive = (search: string, cookie?: string) => openPage(ctx, "index.html", { cookie, url: `http://localhost/${search}` });
  const activeTab = (p: BrowserPage) => p.document.querySelector("#tabBar .tab.is-active")!.getAttribute("data-tab");

  it("opens Shared With You at the poll the server chose, maximized, and tidies the address", async () => {
    const poll = await sharedPoll();
    const { cookie } = await forgeSession(ctx, "landing-reader@example.com");
    await upsertRelation(ctx.db, "landing-reader@example.com", poll._id, "linked");
    page = await arrive(`?open=${poll._id}&tab=shared-with-you`, cookie);
    await page.settle(300);
    expect(activeTab(page)).toBe("shared-with-you");
    expect(page.cardTitles("shared-with-you")).toEqual(["Shared with me"]);
    expect(page.document.querySelector('.tab-panel[data-panel="shared-with-you"] .maximized-card-grid')!.hasAttribute("hidden")).toBe(false);
    expect(page.window.location.search).toBe("");
  });

  it("says the poll is not available and stays on Trending", async () => {
    const { cookie } = await forgeSession(ctx, "landing-unavailable@example.com");
    page = await arrive("?notice=unavailable", cookie);
    await page.settle(100);
    expect(page.document.getElementById("tabNotice")!.textContent).toBe("That poll isn't available.");
    expect(activeTab(page)).toBe("trending");
    expect(page.window.location.search).toBe("");
  });

  it("says the poll is not published yet and opens Shared With You", async () => {
    const { cookie } = await forgeSession(ctx, "landing-unpublished@example.com");
    page = await arrive("?tab=shared-with-you&notice=unpublished", cookie);
    await page.settle(100);
    expect(page.document.getElementById("tabNotice")!.textContent).toContain("hasn't been published yet");
    expect(activeTab(page)).toBe("shared-with-you");
  });
});
