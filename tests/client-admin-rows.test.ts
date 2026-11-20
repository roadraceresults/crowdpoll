/**
 * POLL-ADMIN-IMPROVEMENTS U1–U6: every admin list, not only Search, is drawn as rows, and a row opens its poll's card.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import type { Poll } from "../src/polls/store.js";

const ADMIN = "admin-rows-ui@example.com";
const HELD = "Finish editing the open poll first";
const SCRIPTS = ["app.js", "notesEditor.js", "adminCard.js", "adminList.js"];
let ctx: TestContext;
let cookie: string;
let page: BrowserPage | null = null;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_ADMINS: ADMIN, ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL: "300" });
  cookie = (await forgeSession(ctx, ADMIN)).cookie;
});
afterAll(async () => {
  page?.close();
  await ctx.stop();
});
beforeEach(async () => {
  page?.close();
  page = null;
  await polls(ctx).deleteMany({});
});

async function openAdmin(options: { as?: string; storage?: Record<string, string> } = {}): Promise<BrowserPage> {
  const p = await openPage(ctx, "admin.html", {
    cookie: options.as ?? cookie,
    url: "http://localhost/admin",
    scripts: SCRIPTS,
    sessionStorage: options.storage,
    beforeScripts: (window) => {
      window.HTMLElement.prototype.scrollIntoView = () => {};
    }
  });
  await p.settle(100);
  page = p;
  return p;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const results = (p: BrowserPage) => Array.from(p.document.querySelectorAll<HTMLElement>("#pollList .admin-result"));
const openResults = (p: BrowserPage) => Array.from(p.document.querySelectorAll<HTMLElement>("#pollList .admin-result--open"));
const rowOf = (p: BrowserPage, title: string) =>
  Array.from(p.document.querySelectorAll<HTMLButtonElement>("#pollList .admin-result-row")).find(
    (row) => row.querySelector(".admin-result-title")!.textContent === title
  )!;
const resultOf = (p: BrowserPage, title: string) => rowOf(p, title).closest<HTMLElement>(".admin-result")!;
const cardIn = (result: HTMLElement) => result.querySelector<HTMLElement>(".admin-result-panel > .poll-admin-card");
const notice = (p: BrowserPage) => p.document.getElementById("adminSearchNotice") as HTMLElement;
const tab = (name: string) => `#adminTabBar .tab[data-tab="${name}"]`;

async function clickRow(p: BrowserPage, title: string) {
  rowOf(p, title).click();
  await p.settle(100);
}

async function seed(state: Poll["pollState"], titles: string[]) {
  const made = titles.map((title, i) => makePoll({ title, pollState: state, createdAt: daysAgo(i + 1) }));
  await polls(ctx).insertMany(made);
  return made;
}

const removePoll = (pid: string) => ctx.db.deleteFrom("polls").where("id", "=", pid).execute();

async function startEditing(p: BrowserPage, title: string) {
  if (!resultOf(p, title).classList.contains("admin-result--open")) await clickRow(p, title);
  cardIn(resultOf(p, title))!.querySelector<HTMLElement>(".card-readonly .wizard-summary-link")!.click();
  await p.settle(150);
  expect(p.document.querySelector(".poll-admin-card--new")).not.toBeNull();
}

async function cancelEditing(p: BrowserPage) {
  const card = p.document.querySelector<HTMLElement>(".poll-admin-card--new")!;
  Array.from(card.querySelectorAll<HTMLButtonElement>(".wizard-footer button")).find((b) => b.textContent === "Cancel")!.click();
  await p.settle(300);
}

const VIEWS = [
  { name: "newest", state: "OPEN" as const },
  { name: "awaiting", state: "AWAITING APPROVAL" as const },
  { name: "rejected", state: "REJECTED" as const }
];

describe("U1: every view is rows", () => {
  for (const view of VIEWS) {
    it(`draws the ${view.name} view as rows, with its own notice and no count`, async () => {
      const made = await seed(view.state, ["Row one", "Row two", "Row three"]);
      const p = await openAdmin({ storage: { "admin:tab": view.name } });
      const list = p.document.getElementById("pollList")!;
      expect(Array.from(list.children).map((child) => [child.className, (child as HTMLElement).dataset.pid])).toEqual(
        made.map((poll) => ["admin-result", poll._id])
      );
      expect(list.querySelector(".poll-admin-card")).toBeNull();
      for (const result of results(p)) {
        const row = result.querySelector<HTMLButtonElement>(":scope > .admin-result-row")!;
        const panel = result.querySelector<HTMLElement>(":scope > .admin-result-panel")!;
        expect(row.nextElementSibling).toBe(panel);
        expect(row.getAttribute("aria-expanded")).toBe("false");
        expect(row.getAttribute("aria-controls")).toBe(panel.id);
        expect(panel.hidden).toBe(true);
      }
      expect(notice(p).textContent).toBe("");
      expect(notice(p).hidden).toBe(true);
    });
  }

  it("keeps each view's empty message", async () => {
    const p = await openAdmin({ storage: { "admin:tab": "rejected" } });
    expect(results(p)).toEqual([]);
    expect(notice(p).textContent).toBe("No rejected polls.");
  });
});

describe("U2: opening and closing", () => {
  it("opens a row, closes it on a second click, and keeps one card open at a time", async () => {
    await seed("OPEN", ["Row one", "Row two", "Row three"]);
    const p = await openAdmin();
    expect(openResults(p)).toEqual([]);

    await clickRow(p, "Row two");
    const two = resultOf(p, "Row two");
    expect(openResults(p)).toEqual([two]);
    expect(rowOf(p, "Row two").getAttribute("aria-expanded")).toBe("true");
    expect(two.querySelector<HTMLElement>(".admin-result-panel")!.hidden).toBe(false);
    expect(cardIn(two)!.dataset.pid).toBe(two.dataset.pid);

    await clickRow(p, "Row three");
    expect(openResults(p)).toEqual([resultOf(p, "Row three")]);
    expect(cardIn(two)).toBeNull();
    expect(p.document.querySelectorAll("#pollList .poll-admin-card").length).toBe(1);

    const first = cardIn(resultOf(p, "Row three"));
    await clickRow(p, "Row three");
    expect(openResults(p)).toEqual([]);
    expect(p.document.querySelector("#pollList .poll-admin-card")).toBeNull();
    await clickRow(p, "Row three");
    expect(cardIn(resultOf(p, "Row three"))).not.toBe(first);
  });
});

describe("U3: opening by itself", () => {
  it("opens the only poll of the first list, and of a view selected", async () => {
    await seed("OPEN", ["Only open"]);
    await seed("REJECTED", ["Only rejected"]);
    await seed("AWAITING APPROVAL", ["First waiting", "Second waiting"]);
    const p = await openAdmin({ storage: { "admin:tab": "rejected" } });
    expect(openResults(p)).toEqual([resultOf(p, "Only rejected")]);
    expect(cardIn(resultOf(p, "Only rejected"))).not.toBeNull();

    await p.click(tab("awaiting"));
    await p.settle(100);
    expect(results(p).length).toBe(2);
    expect(openResults(p)).toEqual([]);

    await p.click(tab("newest"));
    await p.settle(100);
    expect(results(p).length).toBe(4);
    expect(openResults(p)).toEqual([]);
  });

  it("opens nothing on a refresh that leaves one poll, and keeps an open card in place", async () => {
    const [one, two] = await seed("OPEN", ["Row one", "Row two"]);
    const p = await openAdmin();
    await clickRow(p, "Row one");
    const card = cardIn(resultOf(p, "Row one"));
    await p.settle(800);
    expect(cardIn(resultOf(p, "Row one"))).toBe(card);

    await clickRow(p, "Row one");
    await removePoll(two!._id);
    await p.settle(800);
    expect(results(p).map((result) => result.dataset.pid)).toEqual([one!._id]);
    expect(openResults(p)).toEqual([]);
  });
});

describe("U4: polls that leave the list", () => {
  it("removes an open row whose poll leaves the list", async () => {
    const [, two] = await seed("OPEN", ["Row one", "Row two"]);
    const p = await openAdmin();
    await clickRow(p, "Row two");
    await removePoll(two!._id);
    await p.settle(800);
    expect(results(p).map((result) => result.querySelector(".admin-result-title")!.textContent)).toEqual(["Row one"]);
    expect(p.document.querySelector("#pollList .poll-admin-card")).toBeNull();
  });

  it("keeps the row of the poll being edited where it is, though its new state leaves the view", async () => {
    await seed("REJECTED", ["Rejected one", "Rejected two", "Rejected three"]);
    const p = await openAdmin({ storage: { "admin:tab": "rejected" } });
    await startEditing(p, "Rejected two");
    const editing = resultOf(p, "Rejected two");
    await p.settle(800);
    expect(results(p)[1]).toBe(editing);
    expect(cardIn(editing)!.classList.contains("poll-admin-card--new")).toBe(true);
  });
});

describe("U5: held during an edit", () => {
  it("holds the other rows, the other tabs, Search, Clear and Create New Poll, and releases them on Cancel", async () => {
    await seed("OPEN", ["Row one", "Row two"]);
    const p = await openAdmin();
    await startEditing(p, "Row one");
    const others = [
      rowOf(p, "Row two"),
      ...Array.from(p.document.querySelectorAll<HTMLButtonElement>("#adminTabBar .tab")).filter((b) => b.dataset.tab !== "newest"),
      p.document.querySelector<HTMLButtonElement>("#adminSearchForm .admin-search-btn")!,
      p.document.getElementById("adminSearchClear") as HTMLButtonElement
    ];
    for (const control of others) {
      expect(control.disabled).toBe(true);
      expect(control.title).toBe(HELD);
    }
    expect((p.document.getElementById("createPollBtn") as HTMLButtonElement).disabled).toBe(true);

    await cancelEditing(p);
    for (const control of others) expect(control.disabled).toBe(false);
    expect((p.document.getElementById("createPollBtn") as HTMLButtonElement).disabled).toBe(false);
  });

  const editingCard = (p: BrowserPage) => p.document.querySelector<HTMLElement>(".poll-admin-card--new");
  const discardDialog = (p: BrowserPage) => p.document.querySelector<HTMLElement>('.modal[role="alertdialog"]');

  async function changeSomething(p: BrowserPage) {
    editingCard(p)!.querySelectorAll<HTMLElement>(".wizard-step")[0]!.querySelector<HTMLButtonElement>("button")!.click();
    await p.settle(50);
    const invite = editingCard(p)!.querySelector<HTMLInputElement>('.m3-radio[value="invite"]')!;
    invite.checked = true;
    invite.dispatchEvent(new p.window.Event("change", { bubbles: true }));
    await p.settle();
  }

  it("leaves the edited poll's own row enabled, titled Cancel editing (TWEAK09)", async () => {
    await seed("OPEN", ["Row one", "Row two"]);
    const p = await openAdmin();
    await startEditing(p, "Row one");
    expect(rowOf(p, "Row one").disabled).toBe(false);
    expect(rowOf(p, "Row one").title).toBe("Cancel editing");
    expect(rowOf(p, "Row two").disabled).toBe(true);
  });

  it("ends an unchanged edit from the edited row with no dialog, and closes the row (TWEAK09)", async () => {
    await seed("OPEN", ["Row one", "Row two"]);
    const p = await openAdmin();
    await startEditing(p, "Row one");
    await clickRow(p, "Row one");
    await p.settle(300);
    expect(discardDialog(p)).toBeNull();
    expect(editingCard(p)).toBeNull();
    expect(openResults(p)).toEqual([]);
    expect(rowOf(p, "Row two").disabled).toBe(false);
    expect(p.document.activeElement).toBe(rowOf(p, "Row one"));
  });

  it("asks before discarding a changed edit from the edited row: Keep editing keeps it, Discard ends it and closes the row (TWEAK09)", async () => {
    await seed("OPEN", ["Row one", "Row two"]);
    const p = await openAdmin();
    await startEditing(p, "Row one");
    await changeSomething(p);

    await clickRow(p, "Row one");
    expect(discardDialog(p)).not.toBeNull();
    discardDialog(p)!.querySelector<HTMLButtonElement>(".modal-keep")!.click();
    await p.settle(300);
    expect(editingCard(p)).not.toBeNull();
    expect(editingCard(p)!.querySelector<HTMLInputElement>('.m3-radio[value="invite"]')!.checked).toBe(true);
    expect(openResults(p)).toEqual([resultOf(p, "Row one")]);

    await clickRow(p, "Row one");
    discardDialog(p)!.querySelector<HTMLButtonElement>(".modal-discard")!.click();
    await p.settle(300);
    expect(editingCard(p)).toBeNull();
    expect(openResults(p)).toEqual([]);
    expect(rowOf(p, "Row two").disabled).toBe(false);
  });
});

describe("U6: Create New Poll", () => {
  for (const from of ["search", "rejected"]) {
    it(`moves from ${from} to Newest with the new poll's row open in wizard mode`, async () => {
      await seed("OPEN", ["Older"]);
      const p = await openAdmin({ storage: { "admin:tab": from } });
      await p.click("#createPollBtn");
      await p.settle(200);
      expect(p.document.querySelector(`${tab("newest")}.is-active`)).not.toBeNull();
      const open = openResults(p);
      expect(open.length).toBe(1);
      expect(open[0]).toBe(results(p)[0]);
      expect(cardIn(open[0]!)!.classList.contains("poll-admin-card--new")).toBe(true);
      expect(results(p).length).toBe(2);
    });
  }

  it("opens nothing when the new poll is not in the list returned", async () => {
    const capped = await startTestContext({ ENV_ADMINS: ADMIN, ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS: "1", ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL: "60000" });
    try {
      const capCookie = (await forgeSession(capped, ADMIN)).cookie;
      await polls(capped).insertOne(makePoll({ title: "From the future", pollState: "OPEN", createdAt: new Date(Date.now() + 86_400_000) }));
      const p = await openPage(capped, "admin.html", {
        cookie: capCookie,
        url: "http://localhost/admin",
        scripts: SCRIPTS,
        beforeScripts: (window) => {
          window.HTMLElement.prototype.scrollIntoView = () => {};
        }
      });
      page = p;
      await p.settle(100);
      await clickRow(p, "From the future");
      await p.click("#createPollBtn");
      await p.settle(200);
      expect(results(p).length).toBe(1);
      expect(openResults(p)).toEqual([resultOf(p, "From the future")]);
      expect(p.document.querySelector(".poll-admin-card--new")).toBeNull();
    } finally {
      page?.close();
      page = null;
      await capped.stop();
    }
  });

  it("opens the new poll's row in a creator's list", async () => {
    const creator = await forgeSession(ctx, "rows-creator@example.com");
    await ctx.db.updateTable("user").set({ permissions: ["Create Poll", "View Polls"] }).where("id", "=", creator.userId).execute();
    const own = makePoll({ title: "Own older", pollState: "OPEN", createdAt: daysAgo(2) });
    await polls(ctx).insertOne(own);
    await ctx.db.updateTable("polls").set({ created_by_id: creator.userId }).where("id", "=", own._id).execute();
    const p = await openAdmin({ as: creator.cookie });
    expect(openResults(p)).toEqual([resultOf(p, "Own older")]);
    await p.click("#createPollBtn");
    await p.settle(200);
    expect(results(p).length).toBe(2);
    const open = openResults(p);
    expect(open).toEqual([results(p)[0]]);
    expect(cardIn(open[0]!)!.classList.contains("poll-admin-card--new")).toBe(true);
  });
});

describe("U7: the open-poll link", () => {
  const linkOf = (result: HTMLElement) => result.querySelector<HTMLAnchorElement>(":scope > a.admin-result-open");
  const setState = (pid: string, poll_state: string) => ctx.db.updateTable("polls").set({ poll_state }).where("id", "=", pid).execute();

  it("is a sibling of the row's button on a poll the viewer can open, and absent on one they cannot", async () => {
    const open = makePoll({ title: "Openable", pollState: "OPEN", createdAt: daysAgo(1) });
    const untitled = makePoll({ title: "", subtitle: "nameless", pollState: "CLOSED", createdAt: daysAgo(2) });
    const draft = makePoll({ title: "Draft", pollState: "INITIALIZED", createdAt: daysAgo(3) });
    await polls(ctx).insertMany([open, untitled, draft]);
    const p = await openAdmin();

    const link = linkOf(resultOf(p, "Openable"))!;
    expect(link).not.toBeNull();
    expect(link.parentElement).toBe(resultOf(p, "Openable"));
    expect(rowOf(p, "Openable").contains(link)).toBe(false);
    expect(link.getAttribute("href")).toBe(`/?PID=${encodeURIComponent(open._id)}`);
    expect(link.hasAttribute("target")).toBe(false);
    expect(link.getAttribute("aria-label")).toBe("View Poll: Openable");
    expect(link.dataset.tooltip).toBe("View Poll");
    const svgs = link.querySelectorAll("svg");
    expect(svgs.length).toBe(1);
    expect(svgs[0]!.getAttribute("aria-hidden")).toBe("true");
    expect(svgs[0]!.getAttribute("viewBox")).toBe("0 0 46 46");
    for (const shape of Array.from(svgs[0]!.querySelectorAll("*"))) {
      expect(shape.getAttribute("fill") ?? "").not.toMatch(/#/);
      expect(shape.getAttribute("stroke") ?? "").not.toMatch(/#/);
    }
    expect(linkOf(resultOf(p, "(untitled)"))!.getAttribute("aria-label")).toBe("View Poll: (untitled)");
    expect(linkOf(resultOf(p, "Draft"))).toBeNull();
  });

  it("is added or removed by a refresh on the same row element", async () => {
    const [one] = await seed("OPEN", ["Flips", "Stays"]);
    const p = await openAdmin();
    const row = resultOf(p, "Flips");
    expect(linkOf(row)).not.toBeNull();
    await setState(one!._id, "INITIALIZED");
    await p.settle(800);
    expect(resultOf(p, "Flips")).toBe(row);
    expect(linkOf(row)).toBeNull();
    await setState(one!._id, "CLOSED");
    await p.settle(800);
    expect(resultOf(p, "Flips")).toBe(row);
    expect(linkOf(row)).not.toBeNull();
  });

  it("opens no row and closes none when clicked", async () => {
    await seed("OPEN", ["Row one", "Row two"]);
    const p = await openAdmin();
    await clickRow(p, "Row one");
    const expanded = () => Array.from(p.document.querySelectorAll("#pollList .admin-result-row")).map((r) => r.getAttribute("aria-expanded"));
    const before = expanded();
    linkOf(resultOf(p, "Row two"))!.click();
    await p.settle(50);
    expect(expanded()).toEqual(before);
  });

  it("stays enabled while another poll is edited, and asks first when the draft has changes", async () => {
    await seed("OPEN", ["Edited", "Other"]);
    const p = await openAdmin();
    await startEditing(p, "Edited");
    const link = linkOf(resultOf(p, "Other"))!;
    expect(link.hasAttribute("disabled")).toBe(false);
    expect(link.hasAttribute("aria-disabled")).toBe(false);
    const title = p.document.querySelector<HTMLInputElement>('.poll-admin-card--new [id^="pollTitle-"]')!;
    title.value = "Changed";
    title.dispatchEvent(new p.window.Event("input", { bubbles: true }));
    link.click();
    await p.settle(50);
    expect(p.document.querySelector('.modal[role="alertdialog"]')).not.toBeNull();
  });

  it("is drawn in the Search view and in the creator's list too", async () => {
    await seed("OPEN", ["Searched one", "Searched two"]);
    const p = await openAdmin();
    await p.click(tab("search"));
    await p.settle(100);
    (p.document.querySelector('#adminSearchForm [name="state"]') as HTMLSelectElement).value = "OPEN";
    await p.submitForm("#adminSearchForm", {});
    await p.settle(300);
    expect(results(p).length).toBe(2);
    for (const result of results(p)) expect(linkOf(result)).not.toBeNull();

    const creator = await forgeSession(ctx, "rows-link-creator@example.com");
    await ctx.db.updateTable("user").set({ permissions: ["Create Poll", "View Polls"] }).where("id", "=", creator.userId).execute();
    const own = makePoll({ title: "Own open", pollState: "OPEN" });
    const draft = makePoll({ title: "Own draft", pollState: "INITIALIZED" });
    await polls(ctx).insertMany([own, draft]);
    await ctx.db.updateTable("polls").set({ created_by_id: creator.userId }).where("id", "in", [own._id, draft._id]).execute();
    const q = await openAdmin({ as: creator.cookie });
    expect(linkOf(resultOf(q, "Own open"))).not.toBeNull();
    expect(linkOf(resultOf(q, "Own draft"))).toBeNull();
  });
});
