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

const SCRIPTS = ["app.js", "notesEditor.js", "adminCard.js", "adminList.js"];

async function openAdmin(
  options: { as?: string; storage?: Record<string, string>; beforeScripts?: (window: BrowserPage["window"]) => void } = {}
): Promise<BrowserPage> {
  const session = options.as ?? cookie;
  const page = await openPage(ctx, "admin.html", {
    cookie: session,
    scripts: SCRIPTS,
    sessionStorage: options.storage,
    beforeScripts: (window) => {
      window.HTMLElement.prototype.scrollIntoView = () => {};
      options.beforeScripts?.(window);
    }
  });
  await page.settle(100);
  return page;
}

const form = (p: BrowserPage) => p.document.getElementById("adminSearchForm") as HTMLFormElement;
const field = (p: BrowserPage, name: string) => form(p).querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement;
const searchTab = '#adminTabBar .tab[data-tab="search"]';

const ORDER = [
  "q", "state", "visibility", "choiceMode", "voteMutability", "lineGraphEnabled", "customColors", "createdBy",
  "createdAtOp", "createdAt", "startAtOp", "startAt", "endAtOp", "endAt",
  "voteCountOp", "voteCount", "invitedVoterCountOp", "invitedVoterCount", "bannedVoterCountOp", "bannedVoterCount"
];
const PAIRS = ["createdAt", "startAt", "endAt", "voteCount", "invitedVoterCount", "bannedVoterCount"];

describe("the admin search panel's structure", () => {
  it("gives every control a visible label", async () => {
    const page = await openAdmin();
    for (const control of Array.from(form(page).querySelectorAll("input, select")) as HTMLInputElement[]) {
      const name = control.getAttribute("name") ?? "";
      const label = (control.type === "radio" || control.type === "checkbox" ? control.closest("label") : form(page).querySelector(`label[for="${control.id}"]`)) as HTMLElement | null;
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
      voteCountOp: "Voter count",
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

  it("offers Line graph enabled and Custom colors set as an unticked checkbox row under the vote mode group", async () => {
    const page = await openAdmin();
    const row = form(page).querySelector(".admin-checkbox-row")!;
    expect(row.getAttribute("role")).toBe("group");
    expect(row.getAttribute("aria-label")).toBe("Poll features");
    expect(row.previousElementSibling!.getAttribute("aria-label")).toBe("Vote mutability");
    const boxes = Array.from(row.querySelectorAll("input")) as HTMLInputElement[];
    expect(boxes.map((b) => [b.type, b.name, b.value, b.checked, b.closest("label")!.textContent!.trim()])).toEqual([
      ["checkbox", "lineGraphEnabled", "true", false, "Line graph enabled"],
      ["checkbox", "customColors", "true", false, "Custom colors set"]
    ]);
    for (const box of boxes) expect(box.closest("label")!.classList.contains("admin-checkbox")).toBe(true);
    for (const box of boxes) box.checked = true;
    await page.click("#adminSearchClear");
    expect(boxes.map((b) => b.checked)).toEqual([false, false]);
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

  it("sends lineGraphEnabled=true only while Line graph enabled is ticked", async () => {
    const page = await openAdmin();
    await page.click(searchTab);
    type(page, "q", "kettle");
    const lastParams = () => new URL(page.requests.filter((r) => r.url.startsWith("/api/admin/polls/search?")).at(-1)!.url, "http://localhost").searchParams;
    await page.submitForm("#adminSearchForm", {});
    await page.settle(200);
    expect(lastParams().has("lineGraphEnabled")).toBe(false);
    (field(page, "lineGraphEnabled") as HTMLInputElement).checked = true;
    await page.submitForm("#adminSearchForm", {});
    await page.settle(200);
    expect(lastParams().get("lineGraphEnabled")).toBe("true");
    expect(lastParams().has("customColors")).toBe(false);
  });

  it("sends both checkboxes when ticked, and the list's refresh keeps sending what was submitted", async () => {
    const fast = await startTestContext({ ENV_ADMINS: ADMIN, ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL: "300" });
    try {
      const adminCookie = (await forgeSession(fast, ADMIN)).cookie;
      const page = await openPage(fast, "admin.html", { cookie: adminCookie, scripts: SCRIPTS });
      await page.settle(100);
      await page.click(searchTab);
      const searches = () => page.requests.filter((r) => r.url.startsWith("/api/admin/polls/search?"));
      const paramsOf = (url: string) => new URL(url, "http://localhost").searchParams;
      (field(page, "lineGraphEnabled") as HTMLInputElement).checked = true;
      (field(page, "customColors") as HTMLInputElement).checked = true;
      await page.submitForm("#adminSearchForm", {});
      await page.settle(200);
      const submitted = paramsOf(searches().at(-1)!.url);
      expect([submitted.get("lineGraphEnabled"), submitted.get("customColors")]).toEqual(["true", "true"]);
      const before = searches().length;
      (field(page, "lineGraphEnabled") as HTMLInputElement).checked = false;
      (field(page, "customColors") as HTMLInputElement).checked = false;
      await page.settle(800);
      const refreshes = searches().slice(before);
      expect(refreshes.length).toBeGreaterThan(0);
      for (const r of refreshes) {
        expect([paramsOf(r.url).get("lineGraphEnabled"), paramsOf(r.url).get("customColors")]).toEqual(["true", "true"]);
      }
      page.close();
    } finally {
      await fast.stop();
    }
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

  it("marks another creator's poll Not your poll, and leaves the logged-in administrator's own poll unmarked", async () => {
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

const results = (p: BrowserPage) => Array.from(p.document.querySelectorAll<HTMLElement>("#pollList .admin-result"));
const openResults = (p: BrowserPage) => Array.from(p.document.querySelectorAll<HTMLElement>("#pollList .admin-result--open"));
const rowOf = (p: BrowserPage, title: string) =>
  Array.from(p.document.querySelectorAll<HTMLButtonElement>("#pollList .admin-result-row")).find(
    (row) => row.querySelector(".admin-result-title")!.textContent === title
  )!;
const resultOf = (p: BrowserPage, title: string) => rowOf(p, title).closest<HTMLElement>(".admin-result")!;
const cardIn = (result: HTMLElement) => result.querySelector<HTMLElement>(".admin-result-panel > .poll-admin-card");
const HELD = "Finish editing the open poll first";

async function search(p: BrowserPage, values: Record<string, string>) {
  await p.click(searchTab);
  for (const [name, value] of Object.entries(values)) type(p, name, value);
  await p.submitForm("#adminSearchForm", {});
  await p.settle(300);
}

async function clickRow(p: BrowserPage, title: string) {
  rowOf(p, title).click();
  await p.settle(100);
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function seedKettles() {
  await polls(ctx).deleteMany({});
  await polls(ctx).insertMany([
    makePoll({ title: "Kettle one", pollState: "OPEN", createdAt: daysAgo(1) }),
    makePoll({ title: "Kettle two", pollState: "CLOSED", createdAt: daysAgo(2) }),
    makePoll({ title: "Kettle three", pollState: "OPEN", createdAt: daysAgo(3) })
  ]);
}

describe("the search results list", () => {
  it("draws one compact row per poll, in the search's order, with the six facts and no card", async () => {
    await polls(ctx).deleteMany({});
    const owner = await forgeSession(ctx, "row-owner@example.com");
    const named = makePoll({ title: "Kettle with a name", pollState: "OPEN", createdAt: daysAgo(1) });
    const emailOnly = makePoll({ title: "", subtitle: "kettle spare", pollState: "CLOSED", pollVisibility: "Private Poll", createdAt: daysAgo(2) });
    const ownerless = makePoll({ title: "Kettle alone", pollState: "OPEN", createdAt: daysAgo(3) });
    await polls(ctx).insertMany([named, emailOnly, ownerless]);
    await ctx.db.updateTable("polls").set({ created_by_id: owner.userId, created_by_name: "Olive Owner", vote_count: 1204 }).where("id", "=", named._id).execute();
    await ctx.db.updateTable("polls").set({ created_by_id: owner.userId, vote_count: 1 }).where("id", "=", emailOnly._id).execute();
    const page = await openAdmin();
    await search(page, { q: "kettle" });

    const list = page.document.getElementById("pollList")!;
    expect(Array.from(list.children).map((child) => [child.tagName, child.className, (child as HTMLElement).dataset.pid])).toEqual([
      ["DIV", "admin-result", named._id],
      ["DIV", "admin-result", emailOnly._id],
      ["DIV", "admin-result", ownerless._id]
    ]);
    expect(list.querySelector(".poll-admin-card")).toBeNull();

    for (const result of results(page)) {
      const [row, panel] = Array.from(result.children) as [HTMLButtonElement, HTMLElement];
      expect([row.tagName, row.className, row.type, row.hasAttribute("tabindex")]).toEqual(["BUTTON", "admin-result-row", "button", false]);
      expect([panel.tagName, panel.className, panel.hidden, panel.children.length]).toEqual(["DIV", "admin-result-panel", true, 0]);
      expect(row.getAttribute("aria-controls")).toBe(panel.id);
      expect(row.getAttribute("aria-expanded")).toBe("false");
      const classes = (parent: Element) => Array.from(parent.children).map((child) => child.getAttribute("class"));
      expect(classes(row)).toEqual(["admin-result-main", "admin-result-chevron"]);
      expect(classes(row.firstElementChild!)).toEqual(["admin-result-heading", "admin-result-facts"]);
      expect(classes(row.querySelector(".admin-result-heading")!)).toEqual(["admin-result-title", "admin-result-subtitle"]);
      expect(classes(row.querySelector(".admin-result-facts")!)).toEqual([
        "admin-result-visibility", "admin-result-state", "admin-result-creator", "admin-result-voters"
      ]);
      expect(row.lastElementChild!.getAttribute("aria-hidden")).toBe("true");
    }

    const date = (poll: { createdAt: Date }) => poll.createdAt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    const cells = (result: HTMLElement) =>
      Array.from(result.querySelectorAll(".admin-result-heading > span, .admin-result-facts > span")).map((cell) => cell.textContent);
    expect(results(page).map(cells)).toEqual([
      ["Kettle with a name", "", "Public", "Poll state: OPEN", `Created by: Olive Owner on ${date(named)}`, (1204).toLocaleString() + " voters"],
      ["(untitled)", "kettle spare", "Private (shared link)", "Poll state: CLOSED", `Created by: row-owner@example.com on ${date(emailOnly)}`, "1 voter"],
      ["Kettle alone", "", "Public", "Poll state: OPEN", `Created on ${date(ownerless)}`, "0 voters"]
    ]);
    expect(results(page).map((result) => result.querySelector(".admin-result-row")!.getAttribute("title"))).toEqual(["Kettle with a name", "(untitled)", "Kettle alone"]);
  });

  it("keeps full cards, and no rows, in the Newest view", async () => {
    await seedKettles();
    const page = await openAdmin();
    const list = page.document.getElementById("pollList")!;
    expect(Array.from(list.children).every((child) => child.classList.contains("poll-admin-card"))).toBe(true);
    expect(list.children.length).toBe(3);
    expect(results(page)).toEqual([]);
  });

  it("opens a row's card under it, closes it on a second click, and keeps one card open at a time", async () => {
    await seedKettles();
    const page = await openAdmin();
    await search(page, { q: "kettle" });
    expect(openResults(page)).toEqual([]);

    rowOf(page, "Kettle two").focus();
    await clickRow(page, "Kettle two");
    const two = resultOf(page, "Kettle two");
    expect(openResults(page)).toEqual([two]);
    expect(rowOf(page, "Kettle two").getAttribute("aria-expanded")).toBe("true");
    expect(two.querySelector<HTMLElement>(".admin-result-panel")!.hidden).toBe(false);
    expect(two.querySelector(".admin-result-panel")!.children.length).toBe(1);
    expect(cardIn(two)!.dataset.pid).toBe(two.dataset.pid);
    expect(page.document.querySelectorAll("#pollList .poll-admin-card").length).toBe(1);
    expect(page.document.activeElement).toBe(rowOf(page, "Kettle two"));
    expect(two.firstElementChild).toBe(rowOf(page, "Kettle two"));

    await clickRow(page, "Kettle three");
    expect(openResults(page)).toEqual([resultOf(page, "Kettle three")]);
    expect(cardIn(two)).toBeNull();
    expect(two.querySelector<HTMLElement>(".admin-result-panel")!.hidden).toBe(true);
    expect(rowOf(page, "Kettle two").getAttribute("aria-expanded")).toBe("false");

    await clickRow(page, "Kettle three");
    expect(openResults(page)).toEqual([]);
    expect(page.document.querySelector("#pollList .poll-admin-card")).toBeNull();
    expect(results(page).length).toBe(3);
  });

  it("shows the same card as the other views: its read-only face, from which the wizard opens", async () => {
    await seedKettles();
    const page = await openAdmin();
    await search(page, { q: "kettle" });
    await clickRow(page, "Kettle one");
    const card = cardIn(resultOf(page, "Kettle one"))!;
    expect(card.querySelector(".card-readonly")).not.toBeNull();
    expect(card.querySelector(".card-state-buttons")).not.toBeNull();
    card.querySelector<HTMLElement>(".card-readonly .wizard-summary-link")!.click();
    await page.settle(100);
    expect(cardIn(resultOf(page, "Kettle one"))!.classList.contains("poll-admin-card--new")).toBe(true);
  });

  it("asks for a poll's invitees only when its row is opened", async () => {
    await polls(ctx).deleteMany({});
    const invited = makePoll({ title: "Kettle by invitation", pollState: "OPEN", pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" });
    await polls(ctx).insertMany([invited, makePoll({ title: "Kettle for all", pollState: "OPEN", createdAt: daysAgo(1) })]);
    const page = await openAdmin();
    const inviteeRequests = () => page.requests.filter((r) => r.url.startsWith(`/api/admin/polls/${invited._id}/invitees`)).length;
    await page.click(searchTab);
    const before = inviteeRequests();
    await search(page, { q: "kettle" });
    expect(results(page).length).toBe(2);
    expect(inviteeRequests()).toBe(before);
    expect(resultOf(page, "Kettle by invitation").querySelector(".admin-result-visibility")!.textContent).toBe("Private (invitation)");
    await clickRow(page, "Kettle by invitation");
    expect(inviteeRequests()).toBeGreaterThan(before);
  });

  it("draws a single result open, and every row closed after any other search the administrator runs", async () => {
    await seedKettles();
    const page = await openAdmin();
    await search(page, { q: "kettle", state: "CLOSED" });
    expect(results(page).length).toBe(1);
    expect(openResults(page)).toEqual([resultOf(page, "Kettle two")]);
    expect(cardIn(resultOf(page, "Kettle two"))).not.toBeNull();

    await search(page, { state: "" });
    expect(results(page).length).toBe(3);
    expect(openResults(page)).toEqual([]);
    expect(page.document.querySelector("#pollList .poll-admin-card")).toBeNull();

    await clickRow(page, "Kettle one");
    await page.submitForm("#adminSearchForm", {});
    await page.settle(300);
    expect(openResults(page)).toEqual([]);
  });

  it("shows the last search like a fresh one on returning to the Search view", async () => {
    await seedKettles();
    const page = await openAdmin();
    await search(page, { q: "kettle" });
    await clickRow(page, "Kettle one");
    await page.click('#adminTabBar .tab[data-tab="newest"]');
    await page.settle(200);
    expect(results(page)).toEqual([]);
    expect(page.document.querySelectorAll("#pollList > .poll-admin-card").length).toBe(3);
    await page.click(searchTab);
    await page.settle(200);
    expect(results(page).length).toBe(3);
    expect(openResults(page)).toEqual([]);

    await search(page, { state: "CLOSED" });
    await clickRow(page, "Kettle two");
    expect(openResults(page)).toEqual([]);
    await page.click('#adminTabBar .tab[data-tab="newest"]');
    await page.settle(200);
    await page.click(searchTab);
    await page.settle(200);
    expect(openResults(page)).toEqual([resultOf(page, "Kettle two")]);
  });

  it("empties the list and hides the notice on Clear", async () => {
    await seedKettles();
    const page = await openAdmin();
    await search(page, { q: "kettle" });
    await clickRow(page, "Kettle one");
    await page.click("#adminSearchClear");
    await page.settle(200);
    expect(page.document.getElementById("pollList")!.children.length).toBe(0);
    expect(page.document.getElementById("adminSearchNotice")!.hidden).toBe(true);
  });

  it("collapses the search panel once rows are on screen", async () => {
    await seedKettles();
    const page = await openAdmin();
    await search(page, { q: "kettle" });
    expect(results(page).length).toBe(3);
    expect(form(page).hasAttribute("data-collapsed")).toBe(true);
  });
});

describe("the results list while a card is being edited", () => {
  const heldControls = (p: BrowserPage) => [
    ...Array.from(p.document.querySelectorAll<HTMLButtonElement>("#pollList .admin-result-row")),
    form(p).querySelector<HTMLButtonElement>(".admin-search-btn")!,
    p.document.getElementById("adminSearchClear") as HTMLButtonElement
  ];

  async function startEditing(p: BrowserPage, title: string) {
    await clickRow(p, title);
    cardIn(resultOf(p, title))!.querySelector<HTMLElement>(".card-readonly .wizard-summary-link")!.click();
    await p.settle(150);
    expect(p.document.querySelector(".poll-admin-card--new")).not.toBeNull();
  }

  it("holds every row, Search and Clear, and releases them when the edit is cancelled", async () => {
    await seedKettles();
    const page = await openAdmin();
    await search(page, { q: "kettle" });
    await startEditing(page, "Kettle one");
    const editing = page.document.querySelector<HTMLElement>(".admin-result--open")!;

    expect(heldControls(page).length).toBe(5);
    for (const control of heldControls(page)) {
      expect(control.disabled).toBe(true);
      expect(control.getAttribute("title")).toBe(HELD);
    }

    const other = results(page).find((result) => result !== editing)!;
    other.querySelector<HTMLButtonElement>(".admin-result-row")!.click();
    editing.querySelector<HTMLButtonElement>(".admin-result-row")!.click();
    await page.settle(100);
    expect(openResults(page)).toEqual([editing]);
    expect(cardIn(editing)!.classList.contains("poll-admin-card--new")).toBe(true);

    const searches = () => page.requests.filter((r) => r.url.startsWith("/api/admin/polls/search?")).length;
    const before = searches();
    await page.submitForm("#adminSearchForm", {});
    await page.click("#adminSearchClear");
    await page.settle(200);
    expect(searches()).toBe(before);
    expect(results(page).length).toBe(3);

    const cancel = Array.from(cardIn(editing)!.querySelectorAll<HTMLButtonElement>(".wizard-footer button")).find((b) => b.textContent === "Cancel")!;
    cancel.click();
    await page.settle(300);
    expect(page.document.querySelector(".poll-admin-card--new")).toBeNull();
    for (const control of heldControls(page)) expect(control.disabled).toBe(false);
    expect(Array.from(page.document.querySelectorAll("#pollList .admin-result-row")).map((row) => row.getAttribute("title")).sort()).toEqual(["Kettle one", "Kettle three", "Kettle two"]);
    expect(form(page).querySelector<HTMLButtonElement>(".admin-search-btn")!.title).toBe("");
    expect((page.document.getElementById("adminSearchClear") as HTMLButtonElement).title).toBe("");
    expect(openResults(page)).toEqual([editing]);
    expect(cardIn(editing)).not.toBeNull();
  });
});

describe("the results list on a refresh", () => {
  let fast: TestContext;
  let fastCookie: string;

  beforeAll(async () => {
    fast = await startTestContext({ ENV_ADMINS: ADMIN, ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL: "300" });
    fastCookie = (await forgeSession(fast, ADMIN)).cookie;
  });
  afterAll(async () => {
    await fast.stop();
  });

  async function openFast(seeded: ReturnType<typeof makePoll>[]) {
    await polls(fast).deleteMany({});
    await polls(fast).insertMany(seeded);
    const page = await openPage(fast, "admin.html", {
      cookie: fastCookie,
      scripts: SCRIPTS,
      beforeScripts: (window) => {
        window.HTMLElement.prototype.scrollIntoView = () => {};
      }
    });
    await page.settle(100);
    return page;
  }
  const setRow = (pid: string, values: { poll_state?: string; vote_count?: number }) =>
    fast.db.updateTable("polls").set(values).where("id", "=", pid).execute();

  it("updates rows in place and leaves the open card, the focus and the other rows alone", async () => {
    const one = makePoll({ title: "Kettle one", pollState: "OPEN", createdAt: daysAgo(1) });
    const two = makePoll({ title: "Kettle two", pollState: "OPEN", createdAt: daysAgo(2) });
    const page = await openFast([one, two]);
    await search(page, { state: "OPEN" });
    await clickRow(page, "Kettle one");
    const nodes = results(page);
    const card = cardIn(nodes[0]!)!;
    const row = nodes[0]!.querySelector<HTMLButtonElement>(".admin-result-row")!;
    row.focus();

    await setRow(two._id, { vote_count: 7 });
    await setRow(one._id, { vote_count: 3 });
    await page.settle(900);
    expect(results(page)).toEqual(nodes);
    expect(nodes[1]!.querySelector(".admin-result-voters")!.textContent).toBe("7 voters");
    expect(nodes[0]!.querySelector(".admin-result-voters")!.textContent).toBe("3 voters");
    expect(openResults(page)).toEqual([nodes[0]]);
    expect(cardIn(nodes[0]!)).toBe(card);
    expect(page.document.activeElement).toBe(row);
    expect(page.document.getElementById("adminSearchNotice")!.textContent).toBe("2 polls match.");
    page.close();
  });

  it("removes a poll that stops matching, adds a new match closed in its place, and never opens one", async () => {
    const one = makePoll({ title: "Kettle one", pollState: "OPEN", createdAt: daysAgo(1) });
    const two = makePoll({ title: "Kettle two", pollState: "OPEN", createdAt: daysAgo(2) });
    const page = await openFast([one, two]);
    await search(page, { state: "OPEN" });
    await clickRow(page, "Kettle two");

    await setRow(two._id, { poll_state: "CLOSED" });
    await page.settle(900);
    expect(results(page).map((result) => result.dataset.pid)).toEqual([one._id]);
    expect(openResults(page)).toEqual([]);
    expect(page.document.querySelector("#pollList .poll-admin-card")).toBeNull();
    expect(page.document.getElementById("adminSearchNotice")!.textContent).toBe("1 poll matches.");

    const newest = makePoll({ title: "Kettle newest", pollState: "OPEN" });
    await polls(fast).insertOne(newest);
    await page.settle(900);
    expect(results(page).map((result) => result.dataset.pid)).toEqual([newest._id, one._id]);
    expect(openResults(page)).toEqual([]);
    page.close();
  });

  it("does not reopen a single result the administrator closed", async () => {
    const page = await openFast([makePoll({ title: "Kettle only", pollState: "OPEN" })]);
    await search(page, { state: "OPEN" });
    expect(openResults(page).length).toBe(1);
    await clickRow(page, "Kettle only");
    expect(openResults(page)).toEqual([]);
    await page.settle(900);
    expect(openResults(page)).toEqual([]);
    page.close();
  });

  it("keeps the row and card of the poll being edited, and draws new rows held", async () => {
    const one = makePoll({ title: "Kettle one", pollState: "OPEN", createdAt: daysAgo(1) });
    const two = makePoll({ title: "Kettle two", pollState: "OPEN", createdAt: daysAgo(2) });
    const page = await openFast([one, two]);
    await search(page, { state: "OPEN" });
    await clickRow(page, "Kettle two");
    const editing = resultOf(page, "Kettle two");
    cardIn(editing)!.querySelector<HTMLElement>(".card-readonly .wizard-summary-link")!.click();
    await page.settle(150);
    const card = cardIn(editing)!;
    expect(card.classList.contains("poll-admin-card--new")).toBe(true);

    await setRow(two._id, { poll_state: "CLOSED" });
    const newest = makePoll({ title: "Kettle newest", pollState: "OPEN" });
    await polls(fast).insertOne(newest);
    await page.settle(900);
    expect(results(page).length).toBe(3);
    expect(results(page)).toContain(editing);
    expect(openResults(page)).toEqual([editing]);
    expect(cardIn(editing)).toBe(card);
    expect(card.classList.contains("poll-admin-card--new")).toBe(true);
    const added = rowOf(page, "Kettle newest");
    expect(added.disabled).toBe(true);
    expect(added.getAttribute("title")).toBe(HELD);
    page.close();
  });
});

describe("the count of matching polls", () => {
  const notice = (p: BrowserPage) => p.document.getElementById("adminSearchNotice") as HTMLElement;

  it("says how many polls match, in the Search view only", async () => {
    await seedKettles();
    const page = await openAdmin();
    expect(notice(page).textContent).toBe("");
    await search(page, { q: "kettle" });
    expect(notice(page).textContent).toBe("3 polls match.");
    expect(notice(page).hidden).toBe(false);
    await search(page, { state: "CLOSED" });
    expect(notice(page).textContent).toBe("1 poll matches.");
    await page.click('#adminTabBar .tab[data-tab="rejected"]');
    await page.settle(200);
    expect(notice(page).textContent).toBe("No rejected polls.");
  });

  it("keeps the cut-off sentence when more polls match than are shown", async () => {
    const capped = await startTestContext({ ENV_ADMINS: ADMIN, ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL: "60000", ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS: "1" });
    try {
      const adminCookie = (await forgeSession(capped, ADMIN)).cookie;
      await polls(capped).insertMany([makePoll({ title: "Kettle one" }), makePoll({ title: "Kettle two" })]);
      const page = await openPage(capped, "admin.html", { cookie: adminCookie, scripts: SCRIPTS });
      await page.settle(100);
      await search(page, { q: "kettle" });
      expect(notice(page).textContent).toBe("More polls match than are shown. Narrow the search.");
      expect(results(page).length).toBe(1);
      page.close();
    } finally {
      await capped.stop();
    }
  });
});
