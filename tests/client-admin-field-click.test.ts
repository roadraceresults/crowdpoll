/**
 * POLL-ADMIN-IMPROVEMENTS TWEAK06: a click anywhere in a rich-text field's preview opens its editor, and a click
 * anywhere in the "Poll starts on" / "Poll ends on" rows opens that row's date and time picker.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls, voteHistory } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import type { Poll } from "../src/polls/store.js";

const ADMIN = "admin-field-click@example.com";
let ctx: TestContext;
let cookie = "";
let page: BrowserPage | null = null;
let pickers: { label: string | null; connected: boolean }[] = [];

beforeAll(async () => {
  ctx = await startTestContext({ ENV_ADMINS: ADMIN, ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL: "60000" });
  cookie = (await forgeSession(ctx, ADMIN)).cookie;
});
afterAll(async () => {
  page?.close();
  await ctx.stop();
});
beforeEach(async () => {
  page?.close();
  page = null;
  pickers = [];
  await polls(ctx).deleteMany({});
  await voteHistory(ctx).deleteMany({});
});

const wizardCard = (p: BrowserPage) => p.document.querySelector<HTMLElement>(".poll-admin-card--new")!;
const heading = (p: BrowserPage) => wizardCard(p).querySelector(".wizard-panel-heading")!.textContent!;

/** Seeds one poll (its only row opens by itself), opens the wizard and moves to step `n`. */
async function step(n: number, overrides: Partial<Poll>): Promise<BrowserPage> {
  await polls(ctx).insertOne(makePoll({ title: "Click poll", ...overrides }));
  const p = await openPage(ctx, "admin.html", {
    cookie,
    url: "http://localhost/admin",
    scripts: ["m3-ripple.js", "app.js", "notesEditor.js", "adminCard.js", "adminList.js"]
  });
  page = p;
  p.window.HTMLElement.prototype.scrollIntoView = () => {};
  (p.window.HTMLInputElement.prototype as unknown as { showPicker: () => void }).showPicker = function (this: HTMLInputElement) {
    pickers.push({ label: this.getAttribute("aria-label"), connected: this.isConnected });
  };
  await p.settle(100);
  p.document.querySelector<HTMLElement>("#pollList .poll-admin-card .card-readonly .wizard-summary-link")!.click();
  await p.settle(150);
  wizardCard(p).querySelectorAll<HTMLElement>(".wizard-step")[n - 1]!.querySelector<HTMLButtonElement>("button")!.click();
  await p.settle(50);
  while (!heading(p).startsWith(`Step ${n} `)) {
    wizardCard(p).querySelector<HTMLButtonElement>(".wizard-next")!.click();
    await p.settle(50);
  }
  return p;
}

const fieldOf = (p: BrowserPage, idPrefix: string) =>
  wizardCard(p).querySelector<HTMLElement>(`[id^="${idPrefix}"]`)!.closest<HTMLElement>(".m3-field")!;

describe("a rich-text field's preview", () => {
  const FIELDS: [string, number, string, Partial<Poll>][] = [
    ["Notes", 2, "pollNotes-", { pollState: "INITIALIZED" }],
    ["Link Preview Message", 1, "pollLinkPreviewMessage-", { pollState: "INITIALIZED", pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link" }],
    ["Custom Email Message", 1, "pollInvitationMessage-", { pollState: "INITIALIZED", pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" }]
  ];

  for (const [name, n, idPrefix, overrides] of FIELDS) {
    it(`opens the ${name} editor from a click anywhere in the box`, async () => {
      const p = await step(n, overrides);
      const field = fieldOf(p, idPrefix);
      expect(field.querySelector(".notes-editor")).toBeNull();
      field.querySelector<HTMLElement>(".wizard-notes-preview")!.click();
      await p.settle();
      expect(field.querySelector(".wizard-notes-preview")).toBeNull();
      expect(field.querySelector(".notes-editor")).not.toBeNull();
    });
  }

  it("opens the editor once from a click on ... edit", async () => {
    const p = await step(2, { pollState: "INITIALIZED" });
    const field = fieldOf(p, "pollNotes-");
    field.querySelector<HTMLButtonElement>(".wizard-notes-edit")!.click();
    await p.settle();
    expect(field.querySelectorAll(".notes-editor").length).toBe(1);
  });
});

describe("the date rows of step 6", () => {
  const rowOf = (p: BrowserPage, name: string) =>
    wizardCard(p).querySelector<HTMLInputElement>(`input.m3-radio[name^="${name}-"][value="on"]`)!.closest<HTMLElement>(".m3-radio-item")!;
  const radio = (p: BrowserPage, name: string) =>
    wizardCard(p).querySelector<HTMLInputElement>(`input.m3-radio[name^="${name}-"][value="on"]`)!;

  it("selects Poll ends on and opens its picker from a click on its support line, and again once selected", async () => {
    const p = await step(6, { pollState: "INITIALIZED" });
    expect(radio(p, "ends").checked).toBe(false);
    rowOf(p, "ends").querySelector<HTMLElement>(".m3-radio-support")!.click();
    await p.settle();
    expect(radio(p, "ends").checked).toBe(true);
    expect(pickers).toEqual([{ label: "End date and time", connected: true }]);

    rowOf(p, "ends").querySelector<HTMLElement>(".m3-radio-label")!.click();
    await p.settle();
    expect(radio(p, "ends").checked).toBe(true);
    expect(pickers.length).toBe(2);
  });

  it("opens the start picker from the Poll starts on label, and a picker from a click on the date box itself", async () => {
    const p = await step(6, { pollState: "INITIALIZED" });
    rowOf(p, "starts").querySelector<HTMLElement>(".m3-radio-label")!.click();
    await p.settle();
    expect(radio(p, "starts").checked).toBe(true);
    expect(pickers).toEqual([{ label: "Start date and time", connected: true }]);

    wizardCard(p).querySelector<HTMLInputElement>('input[aria-label="End date and time"]')!.click();
    await p.settle();
    expect(pickers.at(-1)).toEqual({ label: "End date and time", connected: true });
  });

  it("opens nothing from the start row once voting has opened", async () => {
    const p = await step(6, { pollState: "OPEN", startAt: new Date(Date.now() - 86_400_000) });
    const row = rowOf(p, "starts");
    expect(row.classList.contains("is-disabled")).toBe(true);
    row.querySelector<HTMLElement>(".m3-radio-support")!.click();
    await p.settle();
    expect(pickers).toEqual([]);
  });
});
