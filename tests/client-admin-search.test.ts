import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";

const ADMIN = "admin-search-ui@example.com";
let ctx: TestContext;
let cookie: string;
let adminId: string;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_ADMINS: ADMIN, ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL: "60000" });
  const admin = await forgeSession(ctx, ADMIN);
  cookie = admin.cookie;
  adminId = admin.userId;
});
afterAll(async () => {
  await ctx.stop();
});

const SCRIPTS = ["app.js", "adminCard.js", "adminList.js"];

async function openAdmin(
  options: { as?: string; storage?: Record<string, string>; beforeScripts?: (window: BrowserPage["window"]) => void } = {}
): Promise<BrowserPage> {
  const session = options.as ?? cookie;
  const page = await openPage(ctx, "admin.html", { cookie: session, scripts: SCRIPTS, sessionStorage: options.storage, beforeScripts: options.beforeScripts });
  await page.settle(100);
  return page;
}

const form = (p: BrowserPage) => p.document.getElementById("adminSearchForm") as HTMLFormElement;
const field = (p: BrowserPage, name: string) => form(p).querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement;
const searchTab = '#adminTabBar .tab[data-tab="search"]';

const ORDER = [
  "q", "state", "visibility", "choiceMode", "voteMutability", "createdBy",
  "createdAtOp", "createdAt", "startAtOp", "startAt", "endAtOp", "endAt",
  "voteCountOp", "voteCount", "invitedVoterCountOp", "invitedVoterCount", "bannedVoterCountOp", "bannedVoterCount"
];
const PAIRS = ["createdAt", "startAt", "endAt", "voteCount", "invitedVoterCount", "bannedVoterCount"];

describe("the admin search panel's structure", () => {
  it("gives every control a visible label", async () => {
    const page = await openAdmin();
    for (const control of Array.from(form(page).querySelectorAll("input, select")) as HTMLInputElement[]) {
      const name = control.getAttribute("name") ?? "";
      const label = (control.type === "radio" ? control.closest("label") : form(page).querySelector(`label[for="${control.id}"]`)) as HTMLElement | null;
      expect(label, `${name} ${control.value}`).not.toBeNull();
      expect(label!.textContent!.trim(), `${name} ${control.value}`).not.toBe("");
      expect(label!.hidden, `${name} ${control.value}`).toBe(false);
    }
  });

  it("labels the fields in full", async () => {
    const page = await openAdmin();
    const labelOf = (name: string) => form(page).querySelector(`label[for="${field(page, name).id}"]`)!.textContent!.trim();
    expect({
      q: labelOf("q"),
      state: labelOf("state"),
      createdBy: labelOf("createdBy"),
      createdAtOp: labelOf("createdAtOp"),
      startAtOp: labelOf("startAtOp"),
      endAtOp: labelOf("endAtOp"),
      voteCountOp: labelOf("voteCountOp"),
      invitedVoterCountOp: labelOf("invitedVoterCountOp"),
      bannedVoterCountOp: labelOf("bannedVoterCountOp")
    }).toEqual({
      q: "Words in the title, subtitle or choices",
      state: "State (Initialized, Open, Closed, etc.)",
      createdBy: "Created by user name (contains)",
      createdAtOp: "Created on",
      startAtOp: "Starts on",
      endAtOp: "Ends on",
      voteCountOp: "Vote count",
      invitedVoterCountOp: "Invitee count",
      bannedVoterCountOp: "Banned users count"
    });
  });

  it("keeps the controls in the specified order", async () => {
    const page = await openAdmin();
    const names = (Array.from(form(page).querySelectorAll("[name]")) as HTMLElement[]).map((el) => el.getAttribute("name"));
    expect(names.filter((name, i) => names.indexOf(name) === i)).toEqual(ORDER);
  });

  it("keeps the identifiers and classes the page and its tests rely on", async () => {
    const page = await openAdmin();
    expect(form(page).classList.contains("admin-search")).toBe(true);
    expect(page.document.getElementById("adminSearchClear")!.classList.contains("admin-search-clear")).toBe(true);
    expect(form(page).querySelector(".admin-search-btn")!.getAttribute("type")).toBe("submit");
    expect(page.document.getElementById("adminSearchNotice")!.classList.contains("admin-search-notice")).toBe(true);
    expect(form(page).querySelector(".admin-search-text")).toBe(field(page, "q"));
  });

  it("puts each operator beside its value", async () => {
    const page = await openAdmin();
    for (const name of PAIRS) {
      const operator = field(page, `${name}Op`);
      const pair = operator.closest(".admin-field-pair")!;
      expect(pair, name).not.toBeNull();
      expect(pair.children[0]!.contains(operator), name).toBe(true);
      expect(pair.children[1]!.contains(field(page, name)), name).toBe(true);
    }
  });

  it("offers visibility, choice mode and vote mutability as radio groups of Any and the two choices", async () => {
    const page = await openAdmin();
    const expected = {
      visibility: ["", "Public Poll", "Private Poll"],
      choiceMode: ["", "Single-Choice Poll", "Multiple-Choice Poll"],
      voteMutability: ["", "Dynamic-Vote Poll", "Final-Vote Poll"]
    };
    for (const [name, values] of Object.entries(expected)) {
      const radios = Array.from(form(page).querySelectorAll(`input[type="radio"][name="${name}"]`)) as HTMLInputElement[];
      expect(radios.map((r) => r.value), name).toEqual(values);
      expect(radios[0]!.checked, name).toBe(true);
      const group = radios[0]!.closest('[role="radiogroup"]')!;
      expect(group.getAttribute("aria-label"), name).not.toBeNull();
      expect(group.querySelectorAll("input").length, name).toBe(3);
    }
    expect(form(page).querySelector('select[name="visibility"], select[name="choiceMode"], select[name="voteMutability"]')).toBeNull();
  });

  it("holds no text outside a label, an option, a radio's text or a button", async () => {
    const page = await openAdmin();
    const walker = page.document.createTreeWalker(form(page), page.window.NodeFilter.SHOW_TEXT);
    const stray: string[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent!.trim();
      const parent = node.parentElement!.tagName;
      if (text && !["LABEL", "OPTION", "SPAN", "BUTTON"].includes(parent)) stray.push(`${parent}: ${text}`);
    }
    expect(stray).toEqual([]);
  });

  it("shows every field at once, with no disclosure", async () => {
    const page = await openAdmin();
    expect(page.document.getElementById("adminMoreToggle")).toBeNull();
    expect(form(page).querySelector("[inert]")).toBeNull();
  });

  it("shows the panel only in the Search view", async () => {
    const page = await openAdmin();
    expect(form(page).hidden).toBe(true);
    await page.click(searchTab);
    expect(form(page).hidden).toBe(false);
    await page.click('#adminTabBar .tab[data-tab="newest"]');
    expect(form(page).hidden).toBe(true);
  });
});

describe("the admin search request", () => {
  it("sends the same query, and finds the same polls, as before the panel was redesigned", async () => {
    await polls(ctx).insertMany([makePoll({ title: "Kettle poll", pollState: "OPEN" }), makePoll({ title: "Teapot poll", pollState: "CLOSED" })]);
    const page = await openAdmin();
    await page.click(searchTab);
    (field(page, "q") as HTMLInputElement).value = "kettle";
    (field(page, "state") as HTMLSelectElement).value = "OPEN";
    (field(page, "createdAtOp") as HTMLSelectElement).value = "gte";
    (field(page, "createdAt") as HTMLInputElement).value = "2020-01-02";
    (field(page, "voteCountOp") as HTMLSelectElement).value = "gte";
    (field(page, "voteCount") as HTMLInputElement).value = "0";
    (form(page).querySelector('input[name="visibility"][value="Public Poll"]') as HTMLInputElement).checked = true;
    (form(page).querySelector('input[name="choiceMode"][value="Single-Choice Poll"]') as HTMLInputElement).checked = true;
    (form(page).querySelector('input[name="voteMutability"][value="Final-Vote Poll"]') as HTMLInputElement).checked = true;
    await page.submitForm("#adminSearchForm", {});
    await page.settle(200);
    const search = page.requests.filter((r) => r.url.startsWith("/api/admin/polls/search?")).at(-1)!;
    const params = new URL(search.url, "http://localhost").searchParams;
    params.delete("tz");
    expect(Object.fromEntries(params)).toEqual({
      q: "kettle",
      state: "OPEN",
      visibility: "Public Poll",
      choiceMode: "Single-Choice Poll",
      voteMutability: "Final-Vote Poll",
      createdAt: "gte:2020-01-02",
      voteCount: "gte:0"
    });
    expect(Array.from(page.document.querySelectorAll("#pollList .poll-admin-card"))).toHaveLength(1);
  });

  it("sends nothing for the radio groups left on Any, and Clear puts them back there", async () => {
    const page = await openAdmin();
    await page.click(searchTab);
    type(page, "q", "kettle");
    await page.submitForm("#adminSearchForm", {});
    await page.settle(200);
    const search = page.requests.filter((r) => r.url.startsWith("/api/admin/polls/search?")).at(-1)!;
    const params = new URL(search.url, "http://localhost").searchParams;
    for (const name of ["visibility", "choiceMode", "voteMutability"]) expect(params.has(name), name).toBe(false);
    (form(page).querySelector('input[name="visibility"][value="Private Poll"]') as HTMLInputElement).checked = true;
    await page.click("#adminSearchClear");
    expect((form(page).querySelector('input[name="visibility"][value=""]') as HTMLInputElement).checked).toBe(true);
  });
});

function type(p: BrowserPage, name: string, value: string) {
  const control = field(p, name);
  control.value = value;
  control.dispatchEvent(new p.window.Event(control.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
}

describe("the creator-only page", () => {
  it("loads without the search panel or its controls and still lists the creator's polls", async () => {
    const creator = await forgeSession(ctx, "search-ui-creator@example.com");
    const poll = makePoll({ title: "Creator's own", pollState: "OPEN" });
    await polls(ctx).insertOne(poll);
    await ctx.db.updateTable("polls").set({ created_by_id: creator.userId }).where("id", "=", poll._id).execute();
    const page = await openAdmin({ as: creator.cookie });
    expect(form(page)).toBeNull();
    expect(page.document.getElementById("adminSearchToggle")).toBeNull();
    expect(page.document.querySelectorAll("#pollList .poll-admin-card").length).toBe(1);
  });
});

describe("the status line", () => {
  const notice = (p: BrowserPage) => p.document.getElementById("adminSearchNotice") as HTMLElement;

  it("is a live region outside the panel, in every view", async () => {
    const page = await openAdmin();
    expect(notice(page).getAttribute("role")).toBe("status");
    expect(form(page).contains(notice(page))).toBe(false);
  });

  it("keeps its messages: the empty view and no matches, and says nothing before a search", async () => {
    await polls(ctx).deleteMany({});
    const page = await openAdmin();
    expect(notice(page).textContent).toBe("No polls yet.");
    await page.click(searchTab);
    expect(notice(page).textContent).toBe("");
    expect(notice(page).hidden).toBe(true);
    type(page, "q", "zzzz-no-such-poll");
    await page.submitForm("#adminSearchForm", {});
    await page.settle(200);
    expect(notice(page).textContent).toBe("No polls match.");
  });
});

describe("the read-only card's Created By field", () => {
  const dateLabels = (p: BrowserPage, card: Element) => Array.from(card.querySelectorAll(".card-dates-panel .card-field-label")).map((el) => el.textContent!.trim());
  const dateValues = (p: BrowserPage, card: Element) => Array.from(card.querySelectorAll(".card-dates-panel .card-field-value")).map((el) => el.textContent!.trim());

  it("shows the creator above Created and Launched as <username> (<email>)", async () => {
    await polls(ctx).deleteMany({});
    const owner = await forgeSession(ctx, "card-owner@example.com");
    const poll = makePoll({ title: "Owned card", pollState: "OPEN" });
    await polls(ctx).insertOne(poll);
    await ctx.db.updateTable("polls").set({ created_by_id: owner.userId, created_by_name: "Olive Owner" }).where("id", "=", poll._id).execute();
    const page = await openAdmin();
    const card = page.document.querySelector("#pollList .poll-admin-card")!;
    expect(dateLabels(page, card)).toEqual(["Created By", "Created", "Launched"]);
    expect(dateValues(page, card)[0]).toBe("Olive Owner (card-owner@example.com)");
  });

  it("marks another creator's poll Not your poll, and leaves the signed-in administrator's own poll unmarked", async () => {
    await polls(ctx).deleteMany({});
    const owner = await forgeSession(ctx, "card-other@example.com");
    const theirs = makePoll({ title: "Their card", pollState: "OPEN" });
    const mine = makePoll({ title: "My card", pollState: "OPEN" });
    await polls(ctx).insertMany([theirs, mine]);
    await ctx.db.updateTable("polls").set({ created_by_id: owner.userId, created_by_name: "Otto Other" }).where("id", "=", theirs._id).execute();
    await ctx.db.updateTable("polls").set({ created_by_id: adminId, created_by_name: "Ada Admin" }).where("id", "=", mine._id).execute();
    const page = await openAdmin();
    const chip = (pid: string) => page.document.querySelector(`#pollList .poll-admin-card[data-pid="${pid}"] .card-dates-panel .not-your-poll-chip`);
    expect(chip(theirs._id)?.textContent).toBe("Not your poll");
    expect(chip(mine._id)).toBeNull();
  });

  it("leaves the field out for a poll with no recorded creator", async () => {
    await polls(ctx).deleteMany({});
    await polls(ctx).insertOne(makePoll({ title: "Ownerless card", pollState: "OPEN" }));
    const page = await openAdmin();
    const card = page.document.querySelector("#pollList .poll-admin-card")!;
    expect(dateLabels(page, card)).toEqual(["Created", "Launched"]);
  });
});

describe("collapsing the search panel", () => {
  const toggleButton = (p: BrowserPage) => p.document.getElementById("adminSearchToggle") as HTMLButtonElement;
  const collapsed = (p: BrowserPage) => form(p).hasAttribute("data-collapsed");
  const cards = (p: BrowserPage) => p.document.querySelectorAll("#pollList .poll-admin-card").length;

  async function seedTwo() {
    await polls(ctx).deleteMany({});
    await polls(ctx).insertMany([makePoll({ title: "Kettle poll", pollState: "OPEN" }), makePoll({ title: "Teapot poll", pollState: "CLOSED" })]);
  }

  it("shows the toggle only in the Search view, open, with the right label and relationship", async () => {
    const page = await openAdmin();
    expect(toggleButton(page).parentElement!.hidden).toBe(true);
    await page.click(searchTab);
    expect(toggleButton(page).parentElement!.hidden).toBe(false);
    expect(toggleButton(page).textContent!.trim()).toBe("Collapse Search");
    expect(toggleButton(page).getAttribute("aria-expanded")).toBe("true");
    expect(toggleButton(page).getAttribute("aria-controls")).toBe("adminSearchForm");
    expect(form(page).contains(toggleButton(page))).toBe(false);
  });

  it("collapses and expands the panel by hand, keeping what was typed", async () => {
    const page = await openAdmin();
    await page.click(searchTab);
    type(page, "q", "kettle");
    await page.click("#adminSearchToggle");
    expect(collapsed(page)).toBe(true);
    expect(toggleButton(page).textContent!.trim()).toBe("Expand Search");
    expect(toggleButton(page).getAttribute("aria-expanded")).toBe("false");
    expect(field(page, "q").value).toBe("kettle");
    await page.click("#adminSearchToggle");
    expect(collapsed(page)).toBe(false);
    expect(toggleButton(page).textContent!.trim()).toBe("Collapse Search");
  });

  it("collapses by itself after a search that put results on screen, and expands again with the toggle", async () => {
    await seedTwo();
    const page = await openAdmin();
    await page.click(searchTab);
    type(page, "q", "kettle");
    await page.submitForm("#adminSearchForm", {});
    await page.settle(300);
    expect(cards(page)).toBe(1);
    expect(collapsed(page)).toBe(true);
    await page.click("#adminSearchToggle");
    expect(collapsed(page)).toBe(false);
  });

  it("is expanded by a click on the Search view tab, from another view or from the Search view itself", async () => {
    await seedTwo();
    const page = await openAdmin();
    await page.click(searchTab);
    type(page, "q", "kettle");
    await page.submitForm("#adminSearchForm", {});
    await page.settle(300);
    expect(collapsed(page)).toBe(true);
    await page.click('#adminTabBar .tab[data-tab="newest"]');
    expect(collapsed(page)).toBe(true);
    await page.click(searchTab);
    expect(collapsed(page)).toBe(false);
    await page.click("#adminSearchToggle");
    expect(collapsed(page)).toBe(true);
    await page.click(searchTab);
    expect(collapsed(page)).toBe(false);
  });

  it("still collapses after a search that follows a click on the Search view tab", async () => {
    await seedTwo();
    const page = await openAdmin();
    await page.click(searchTab);
    type(page, "q", "kettle");
    await page.submitForm("#adminSearchForm", {});
    await page.settle(300);
    expect(collapsed(page)).toBe(true);
    await page.click(searchTab);
    expect(collapsed(page)).toBe(false);
    await page.submitForm("#adminSearchForm", {});
    await page.settle(300);
    expect(collapsed(page)).toBe(true);
  });

  it("stays open when nothing matched", async () => {
    await seedTwo();
    const page = await openAdmin();
    await page.click(searchTab);
    type(page, "q", "zzzz-no-such-poll");
    await page.submitForm("#adminSearchForm", {});
    await page.settle(300);
    expect(cards(page)).toBe(0);
    expect(collapsed(page)).toBe(false);
  });

  it("stays open through Clear, which empties the fields and the results", async () => {
    await seedTwo();
    const page = await openAdmin();
    await page.click(searchTab);
    type(page, "q", "kettle");
    await page.submitForm("#adminSearchForm", {});
    await page.settle(300);
    expect(collapsed(page)).toBe(true);
    await page.click("#adminSearchToggle");
    await page.click("#adminSearchClear");
    expect(collapsed(page)).toBe(false);
    expect(field(page, "q").value).toBe("");
    expect(cards(page)).toBe(0);
  });

  it("is not collapsed again by the list's own refresh once it has been expanded", async () => {
    await seedTwo();
    const fast = await startTestContext({ ENV_ADMINS: ADMIN, ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL: "300" });
    try {
      const adminCookie = (await forgeSession(fast, ADMIN)).cookie;
      await polls(fast).insertMany([makePoll({ title: "Kettle poll", pollState: "OPEN" })]);
      const page = await openPage(fast, "admin.html", { cookie: adminCookie, scripts: SCRIPTS });
      await page.settle(100);
      await page.click(searchTab);
      type(page, "q", "kettle");
      await page.submitForm("#adminSearchForm", {});
      await page.settle(200);
      expect(collapsed(page)).toBe(true);
      await page.click("#adminSearchToggle");
      await page.settle(800);
      expect(collapsed(page)).toBe(false);
      page.close();
    } finally {
      await fast.stop();
    }
  });
});
