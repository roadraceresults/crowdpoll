/**
 * POLL-ADMIN-IMPROVEMENTS U8 (and, later, U9 and U13): step 3 of the wizard, Choices, opened from a poll's row.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls, voteHistory } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import type { Poll } from "../src/polls/store.js";

const ADMIN = "admin-choices-field@example.com";
const OFF = "Off: choices are displayed from most votes to least votes.";
const ON = "On: choices are displayed in the order entered above.";
let ctx: TestContext;
let cookie = "";
let page: BrowserPage | null = null;
let bodies: { method: string; url: string; body: Record<string, unknown> | null }[] = [];
let clipboardText = "";

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
  bodies = [];
  clipboardText = "";
  await polls(ctx).deleteMany({});
  await voteHistory(ctx).deleteMany({});
});

async function open(): Promise<BrowserPage> {
  const p = await openPage(ctx, "admin.html", {
    cookie,
    url: "http://localhost/admin",
    scripts: ["m3-ripple.js", "app.js", "notesEditor.js", "adminCard.js", "adminList.js"],
    beforeScripts: (window) => {
      Object.defineProperty(window.navigator, "clipboard", {
        configurable: true,
        value: { writeText: async (text: string) => { clipboardText = text; }, readText: async () => clipboardText }
      });
    }
  });
  p.window.HTMLElement.prototype.scrollIntoView = () => {};
  const send = p.window.fetch;
  p.window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
    bodies.push({ method: (init?.method ?? "GET").toUpperCase(), url, body });
    return send(input, init);
  }) as typeof fetch;
  page = p;
  return p;
}

const wizardCard = (p: BrowserPage) => p.document.querySelector<HTMLElement>(".poll-admin-card--new")!;
const sent = (path: string) => bodies.filter((b) => b.method === "POST" && b.url.endsWith(path));
const footerButton = (card: HTMLElement, text: string) =>
  Array.from(card.querySelectorAll<HTMLButtonElement>(".wizard-footer button")).find((b) => b.textContent === text)!;

/** Seeds one poll, opens the page (its only row opens by itself) and the wizard on step 3. */
async function stepThree(overrides: Partial<Poll>, voted = false): Promise<BrowserPage> {
  const poll = makePoll({ title: "Field poll", ...overrides });
  await polls(ctx).insertOne(poll);
  if (voted) await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "v@example.com", userName: "v", choiceIds: ["c1"], votedAt: new Date() });
  const p = await open();
  await p.settle(100);
  const card = p.document.querySelector<HTMLElement>("#pollList .admin-result-panel > .poll-admin-card")!;
  card.querySelector<HTMLElement>(".card-readonly .wizard-summary-link")!.click();
  await p.settle(150);
  const heading = () => wizardCard(p).querySelector(".wizard-panel-heading")!.textContent;
  wizardCard(p).querySelectorAll<HTMLElement>(".wizard-step")[2]!.querySelector<HTMLButtonElement>("button")!.click();
  await p.settle(50);
  while (heading() !== "Step 3 · Choices") {
    wizardCard(p).querySelector<HTMLButtonElement>(".wizard-next")!.click();
    await p.settle(50);
  }
  return p;
}

const orderSwitch = (p: BrowserPage) => {
  const label = Array.from(wizardCard(p).querySelectorAll<HTMLLabelElement>(".m3-switch-label")).find(
    (l) => l.textContent === "Display Choices in the order above"
  );
  return label ? wizardCard(p).querySelector<HTMLInputElement>(`#${label.htmlFor}`) : null;
};

describe("U8: the display-order switch", () => {
  it("follows the Paste choices caption, off for a poll set to the ranking, described by its Off line", async () => {
    const p = await stepThree({ pollState: "INITIALIZED" });
    const input = orderSwitch(p)!;
    expect(input).not.toBeNull();
    expect(input.getAttribute("role")).toBe("switch");
    expect(input.checked).toBe(false);
    const row = input.closest(".m3-switch-row")!;
    expect(row.previousElementSibling!.classList.contains("wizard-paste")).toBe(true);
    const support = p.document.getElementById(input.getAttribute("aria-describedby")!)!;
    expect(support.textContent).toBe(OFF);
  });

  it("is on for a poll set to its entered order, with the On line", async () => {
    const p = await stepThree({ pollState: "INITIALIZED", choicesInEnteredOrder: true });
    const input = orderSwitch(p)!;
    expect(input.checked).toBe(true);
    expect(p.document.getElementById(input.getAttribute("aria-describedby")!)!.textContent).toBe(ON);
  });

  it("is on a private poll's step too", async () => {
    const p = await stepThree({ pollState: "INITIALIZED", pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link" });
    expect(orderSwitch(p)).not.toBeNull();
  });

  it("can still change on a poll with votes", async () => {
    const p = await stepThree({ pollState: "OPEN" }, true);
    expect(orderSwitch(p)!.disabled).toBe(false);
  });

  it("marks the wizard changed, and the save sends the setting", async () => {
    const p = await stepThree({ pollState: "INITIALIZED" });
    const input = orderSwitch(p)!;
    input.checked = true;
    input.dispatchEvent(new p.window.Event("change", { bubbles: true }));
    await p.settle();
    expect(orderSwitch(p)!.checked).toBe(true);
    expect(p.document.getElementById(orderSwitch(p)!.getAttribute("aria-describedby")!)!.textContent).toBe(ON);

    footerButton(wizardCard(p), "Cancel").click();
    await p.settle();
    const dialog = p.document.querySelector('.modal[role="alertdialog"]')!;
    expect(dialog).not.toBeNull();
    (dialog.querySelector(".modal-keep") as HTMLButtonElement).click();
    await p.settle();

    footerButton(wizardCard(p), "Save").click();
    await p.settle(150);
    expect(sent("/save").at(-1)!.body!.choicesInEnteredOrder).toBe(true);
  });
});

const labels = (count: number) => Array.from({ length: count }, (_, i) => ({ id: `c${i + 1}`, label: `Option ${i + 1}`, position: i }));
const preview = (p: BrowserPage) => wizardCard(p).querySelector<HTMLElement>(".wizard-choices-preview");
const editLink = (p: BrowserPage) => preview(p)!.querySelector<HTMLButtonElement>("button.wizard-notes-edit")!;
const box = (p: BrowserPage) => wizardCard(p).querySelector<HTMLTextAreaElement>('textarea[aria-label="Choices"]');
const previewLines = (p: BrowserPage) =>
  Array.from(preview(p)!.querySelectorAll(".wizard-choices-lines > div")).map((d) => d.textContent);
const barButton = (p: BrowserPage, text: string) =>
  Array.from(wizardCard(p).querySelectorAll<HTMLButtonElement>(".notes-editor-bar button")).find((b) => b.textContent === text)!;
const pasteButton = (p: BrowserPage) =>
  Array.from(wizardCard(p).querySelectorAll<HTMLButtonElement>("button")).find((b) => b.textContent === "Paste choices")!;
const snackbar = (p: BrowserPage) => p.document.querySelector(".m3-snackbar")?.textContent ?? "";
const choicesField = (p: BrowserPage) => wizardCard(p).querySelector<HTMLElement>(".m3-field--choices")!;
const circle = (p: BrowserPage, i: number) =>
  wizardCard(p).querySelectorAll<HTMLElement>(".wizard-step")[i]!.querySelector<HTMLButtonElement>("button")!;
const stepHeading = (p: BrowserPage) => wizardCard(p).querySelector(".wizard-panel-heading")!.textContent;

async function openList(p: BrowserPage) {
  editLink(p).click();
  await p.settle();
}

async function typeChoices(p: BrowserPage, text: string) {
  box(p)!.value = text;
  box(p)!.dispatchEvent(new p.window.Event("input", { bubbles: true }));
  await p.settle();
}

describe("U13: the Choices field", () => {
  it("opens as a preview of the first five choices, with ... edit and no textarea", async () => {
    const p = await stepThree({ pollState: "INITIALIZED", choices: labels(7) });
    expect(box(p)).toBeNull();
    expect(previewLines(p)).toEqual(["Option 1", "Option 2", "Option 3", "Option 4", "Option 5"]);
    expect(editLink(p).textContent).toContain("... edit");
    expect(editLink(p).getAttribute("aria-label")).toBe("Edit choices");
    expect(choicesField(p).querySelector(".m3-field-counter")!.textContent).toMatch(/^7 \/ \d+ choices$/);
  });

  it("shows the placeholder when there are no choices", async () => {
    const p = await stepThree({ pollState: "INITIALIZED", choices: [] });
    expect(preview(p)!.querySelector(".wizard-choices-lines")!.textContent).toBe("Enter your choices here");
  });

  for (const how of ["the lines", "the box around them", "... edit"]) {
    it(`opens the list from ${how}: every choice in a focused textarea under Cancel and Done`, async () => {
      const p = await stepThree({ pollState: "INITIALIZED", choices: labels(7) });
      if (how === "the lines") preview(p)!.querySelector<HTMLElement>(".wizard-choices-lines")!.click();
      else if (how === "the box around them") preview(p)!.click();
      else editLink(p).click();
      await p.settle();
      expect(preview(p)).toBeNull();
      expect(box(p)!.value).toBe(labels(7).map((c) => c.label).join("\n"));
      expect(p.document.activeElement).toBe(box(p));
      expect(Array.from(wizardCard(p).querySelectorAll(".notes-editor-bar button")).map((b) => b.textContent)).toEqual(["Cancel", "Done"]);
    });
  }

  it("does not open the list from the box or its lines while ... edit is disabled", async () => {
    const p = await stepThree({ pollState: "INITIALIZED", choices: labels(3) });
    editLink(p).disabled = true;
    preview(p)!.click();
    preview(p)!.querySelector<HTMLElement>(".wizard-choices-lines")!.click();
    await p.settle();
    expect(box(p)).toBeNull();
    expect(previewLines(p)).toEqual(["Option 1", "Option 2", "Option 3"]);
  });

  it("keeps the text on Done and returns focus to ... edit", async () => {
    const p = await stepThree({ pollState: "INITIALIZED", choices: labels(2) });
    await openList(p);
    await typeChoices(p, "Red\nBlue\nGreen");
    barButton(p, "Done").click();
    await p.settle();
    expect(previewLines(p)).toEqual(["Red", "Blue", "Green"]);
    expect(p.document.activeElement).toBe(editLink(p));
  });

  it("shows a repeated choice's message under the preview after Done", async () => {
    const p = await stepThree({ pollState: "INITIALIZED", choices: labels(2) });
    await openList(p);
    await typeChoices(p, "Red\nBlue\nRed");
    barButton(p, "Done").click();
    await p.settle();
    expect(box(p)).toBeNull();
    expect(choicesField(p).textContent).toContain("“Red” is already a choice.");
  });

  it("closes without asking on Cancel when nothing changed", async () => {
    const p = await stepThree({ pollState: "INITIALIZED", choices: labels(2) });
    await openList(p);
    barButton(p, "Cancel").click();
    await p.settle();
    expect(p.document.querySelector('.modal[role="alertdialog"]')).toBeNull();
    expect(previewLines(p)).toEqual(["Option 1", "Option 2"]);
  });

  it("asks on Cancel after a change: Keep editing keeps the list, Discard restores the text", async () => {
    const p = await stepThree({ pollState: "INITIALIZED", choices: labels(2) });
    await openList(p);
    await typeChoices(p, "Changed");
    barButton(p, "Cancel").click();
    await p.settle();
    p.document.querySelector<HTMLButtonElement>('.modal[role="alertdialog"] .modal-keep')!.click();
    await p.settle();
    expect(box(p)!.value).toBe("Changed");

    barButton(p, "Cancel").click();
    await p.settle();
    p.document.querySelector<HTMLButtonElement>('.modal[role="alertdialog"] .modal-discard')!.click();
    await p.settle();
    expect(box(p)).toBeNull();
    expect(previewLines(p)).toEqual(["Option 1", "Option 2"]);
  });

  it("keeps the text and closes the list before Next, a step circle and Save", async () => {
    const p = await stepThree({ pollState: "INITIALIZED", choices: labels(2) });
    await openList(p);
    await typeChoices(p, "Red\nBlue");
    wizardCard(p).querySelector<HTMLButtonElement>(".wizard-next")!.click();
    await p.settle(50);
    expect(stepHeading(p)).not.toBe("Step 3 · Choices");
    circle(p, 2).click();
    await p.settle(50);
    expect(previewLines(p)).toEqual(["Red", "Blue"]);

    await openList(p);
    await typeChoices(p, "Red\nBlue\nGreen");
    circle(p, 1).click();
    await p.settle(50);
    expect(stepHeading(p)).toBe("Step 2 · Title & Tags");

    circle(p, 2).click();
    await p.settle(50);
    expect(previewLines(p)).toEqual(["Red", "Blue", "Green"]);
    await openList(p);
    await typeChoices(p, "Red\nBlue\nGreen\nGold");
    footerButton(wizardCard(p), "Save").click();
    await p.settle(150);
    expect(sent("/save").at(-1)!.body!.labels).toEqual(["Red", "Blue", "Green", "Gold"]);
  });

  it("pastes into the preview, removing repeats, and stays a preview", async () => {
    const p = await stepThree({ pollState: "INITIALIZED", choices: labels(2) });
    clipboardText = "Option 2\nNew one\nNew one";
    pasteButton(p).click();
    await p.settle(50);
    expect(box(p)).toBeNull();
    expect(previewLines(p)).toEqual(["Option 1", "Option 2", "New one"]);
    expect(snackbar(p)).toBe("2 duplicates were removed.");
  });

  it("pastes into the open list as before", async () => {
    const p = await stepThree({ pollState: "INITIALIZED", choices: labels(2) });
    await openList(p);
    clipboardText = "Pasted";
    pasteButton(p).click();
    await p.settle(50);
    expect(box(p)!.value).toBe("Option 1\nOption 2\nPasted");
  });

  it("keeps the list open, with its text, when a switch is toggled", async () => {
    const p = await stepThree({ pollState: "INITIALIZED", choices: labels(2) });
    await openList(p);
    await typeChoices(p, "Kept text");
    orderSwitch(p)!.click();
    await p.settle();
    expect(box(p)!.value).toBe("Kept text");
  });

  it("reads ... edit and lets the list change on a poll with votes", async () => {
    const p = await stepThree({ pollState: "OPEN" }, true);
    expect(editLink(p).disabled).toBe(false);
    await openList(p);
    expect(box(p)!.disabled).toBe(false);
  });
});

describe("U9 and U10: Voters may add choices on step 3, and the summary", () => {
  const addSwitch = (p: BrowserPage) => wizardCard(p).querySelector<HTMLInputElement>(".m3-switch--add-choices");
  const switchIds = (p: BrowserPage) =>
    Array.from(wizardCard(p).querySelectorAll<HTMLInputElement>('.wizard-step-body input[role="switch"]')).map((i) => i.id.replace(/-.*/, ""));

  it("ends a private poll's step 3 with the order switch then the add-choices switch; step 5 has none", async () => {
    const p = await stepThree({ pollState: "INITIALIZED", pollVisibility: "Private Poll" });
    expect(switchIds(p)).toEqual(["enteredOrderSwitch", "addChoicesSwitch"]);
    expect(p.document.getElementById(addSwitch(p)!.getAttribute("aria-describedby")!)!.textContent).toBe("Off: only you set the choices.");
    addSwitch(p)!.focus();
    addSwitch(p)!.click();
    await p.settle();
    expect(p.document.activeElement).toBe(addSwitch(p));
    expect(p.document.getElementById(addSwitch(p)!.getAttribute("aria-describedby")!)!.textContent).toBe(
      "On: voters can add a choice while the poll is open."
    );
    while (stepHeading(p) !== "Step 5 · How to vote") {
      wizardCard(p).querySelector<HTMLButtonElement>(".wizard-next")!.click();
      await p.settle(50);
    }
    expect(wizardCard(p).querySelector('.wizard-step-body input[role="switch"]')).toBeNull();
  });

  it("ends a public poll's step 3 with the order switch alone", async () => {
    const p = await stepThree({ pollState: "INITIALIZED" });
    expect(switchIds(p)).toEqual(["enteredOrderSwitch"]);
  });

  it("enables both switches on a voted private poll", async () => {
    const p = await stepThree({ pollState: "OPEN", pollVisibility: "Private Poll" }, true);
    expect(orderSwitch(p)!.disabled).toBe(false);
    expect(addSwitch(p)!.disabled).toBe(false);
  });

  it("says whether voters may add choices, and the entered order when it is on, with parts going to step 3", async () => {
    await polls(ctx).insertOne(makePoll({
      title: "Summary poll", pollState: "OPEN", pollVisibility: "Private Poll", votersAddChoices: true, choicesInEnteredOrder: true
    }));
    const p = await open();
    await p.settle(100);
    const card = p.document.querySelector<HTMLElement>("#pollList .poll-admin-card")!;
    const add = card.querySelector(".card-readonly .wizard-summary-add-choices")!;
    expect(add.textContent).toBe("Voters may add choices: Yes.");
    expect(add.previousElementSibling!.classList.contains("wizard-summary-choices")).toBe(true);
    const order = card.querySelector(".card-readonly .wizard-summary-entered-order")!;
    expect(order.textContent).toBe("Choices are shown in the order entered.");
    expect(order.previousElementSibling).toBe(add);
    order.querySelector<HTMLElement>(".wizard-summary-link")!.click();
    await p.settle(150);
    expect(stepHeading(p)).toBe("Step 3 · Choices");
  });

  it("has no entered-order line when the setting is off", async () => {
    await polls(ctx).insertOne(makePoll({ title: "Plain summary", pollState: "OPEN", pollVisibility: "Private Poll" }));
    const p = await open();
    await p.settle(100);
    const card = p.document.querySelector<HTMLElement>("#pollList .poll-admin-card")!;
    expect(card.querySelector(".wizard-summary-add-choices")!.textContent).toBe("Voters may add choices: No.");
    expect(card.querySelector(".wizard-summary-entered-order")).toBeNull();
  });
});
