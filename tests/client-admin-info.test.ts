/**
 * POLL-ADMIN-IMPROVEMENTS U11 and U12: the info icons that replace the "What does this mean?" blocks, and the dialog
 * they open.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls, voteHistory } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import type { Poll } from "../src/polls/store.js";

const ADMIN = "admin-info-icons@example.com";
let ctx: TestContext;
let cookie = "";
let page: BrowserPage | null = null;

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
  await polls(ctx).deleteMany({});
  await voteHistory(ctx).deleteMany({});
});

const PRIVATE = { pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link" } as const;

const WHO_HELP: Record<string, string> = {
  "Anyone you send the link to":
    "Your poll is private: it is listed only in the \"Shared With You\" tab for the people you share it with, and is not listed in Trending, Newest or Search. Anyone who has the link can open it and vote.",
  "Only people you invite":
    "Your poll is private: it is listed only in the \"Shared With You\" tab for the people you share it with, and is not listed in Trending, Newest or Search. Only the people whose email addresses you invite can vote. You add them after the poll is created.",
  "Everyone on CrowdPoll":
    "Your poll is public: anyone on CrowdPoll can find it and vote. Public polls appear after they are reviewed and approved."
};
const VOTERS_HELP =
  "Off (the default): votes are anonymous. Everyone sees how many votes each choice has, but not who cast them. On: the names of voters are shown next to the choices they picked. Turn it on only if your voters expect it, and tell them. It can't be changed once your poll has votes.";
const NOTES_HELP = "The first lines of your notes appear under the title on the polls card. The entire notes appear on the Maximized view.";
const ORDER_HELP = [
  "This toggle allows you to override the default order of the poll's choices, which is most votes to least votes.",
  "Using the order you enter the Choices makes sense when the Choices have a logical order, such as consecutive dates, or a sequence of numbers (1 Star, 2 Star, 3 Star, etc.)."
];
const ADD_CHOICES_HELP =
  "Off (the default): only you set the choices. On: anyone who may vote on your poll can add a choice while it is open, up to the most choices a poll may have. This is only available for Private polls.";
const HOW_HELP: Record<string, string> = {
  "One choice": "Each voter picks exactly one choice.",
  "More than one": "Each voter picks one or more of the choices.",
  "Yes, as often as they like while the poll is open": "Voters can change their vote as often as they like until the poll closes. Only their latest vote counts.",
  "No, their first vote is final": "A voter's first vote counts, and cannot be changed."
};
const WHEN_HELP = [
  ["Poll starts immediately", "Voting opens as soon as your poll is published. Public polls open once they have been reviewed."],
  ["Poll starts on", "Your poll waits until this date and time, then opens for voting. Until then, anyone who opens it sees that it hasn't started yet."],
  ["Poll has no end date", "Your poll stays open until you close it from its card."],
  ["Poll ends on", "Voting closes at this date and time. The results stay available after it closes."],
  ["Time zone", "Dates and times are in your time zone. Voters see them in their own."]
];

async function open(): Promise<BrowserPage> {
  const p = await openPage(ctx, "admin.html", {
    cookie,
    url: "http://localhost/admin",
    scripts: ["m3-ripple.js", "app.js", "notesEditor.js", "adminCard.js", "adminList.js"]
  });
  p.window.HTMLElement.prototype.scrollIntoView = () => {};
  page = p;
  return p;
}

const wizardCard = (p: BrowserPage) => p.document.querySelector<HTMLElement>(".poll-admin-card--new")!;
const heading = (p: BrowserPage) => wizardCard(p).querySelector(".wizard-panel-heading")!.textContent;
const icons = (p: BrowserPage) => Array.from(wizardCard(p).querySelectorAll<HTMLButtonElement>("button.wizard-info"));
const icon = (p: BrowserPage, label: string) => icons(p).find((b) => b.getAttribute("aria-label") === "About: " + label);
const dialogs = (p: BrowserPage) => Array.from(p.document.querySelectorAll<HTMLElement>(".modal-backdrop > .modal[role=\"dialog\"]"));
const checkedState = (p: BrowserPage) => Array.from(wizardCard(p).querySelectorAll<HTMLInputElement>("input")).map((i) => i.checked);
const blocks = (p: BrowserPage) =>
  Array.from(dialogs(p)[0]!.querySelectorAll<HTMLElement>(".modal-text > p")).map((el) => [el.className, el.textContent]);

/** Seeds one published poll (its only row opens by itself), opens the wizard and goes to step `n`. */
async function step(n: number, overrides: Partial<Poll> = {}, voted = false): Promise<BrowserPage> {
  const poll = makePoll({ title: "Info poll", pollState: "OPEN", ...overrides });
  await polls(ctx).insertOne(poll);
  if (voted) await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "v@example.com", userName: "v", choiceIds: ["c1"], votedAt: new Date() });
  const p = await open();
  await p.settle(100);
  p.document.querySelector<HTMLElement>("#pollList .poll-admin-card .card-readonly .wizard-summary-link")!.click();
  await p.settle(150);
  await goTo(p, n);
  return p;
}

async function goTo(p: BrowserPage, n: number) {
  wizardCard(p).querySelectorAll<HTMLElement>(".wizard-step")[n - 1]!.querySelector<HTMLButtonElement>("button")!.click();
  await p.settle(50);
  expect(heading(p)).toMatch(new RegExp(`^Step ${n} `));
}

async function press(p: BrowserPage, label: string) {
  icon(p, label)!.click();
  await p.settle();
}

function isDirty(p: BrowserPage): Promise<boolean> {
  const cancel = Array.from(wizardCard(p).querySelectorAll<HTMLButtonElement>(".wizard-footer button")).find((b) => b.textContent === "Cancel")!;
  cancel.click();
  return p.settle().then(() => {
    const asked = p.document.querySelector<HTMLElement>('.modal[role="alertdialog"]');
    if (asked) asked.querySelector<HTMLButtonElement>(".modal-keep")!.click();
    return asked !== null;
  });
}

describe("U11: the icons", () => {
  it("leaves no What does this mean? on any step", async () => {
    const p = await step(1, PRIVATE);
    for (const n of [1, 2, 3, 4, 5, 6]) {
      await goTo(p, n);
      expect(wizardCard(p).querySelector("details.wizard-help"), `step ${n}`).toBeNull();
      expect(wizardCard(p).textContent, `step ${n}`).not.toContain("What does this mean?");
    }
  });

  const TABLE: [number, string[]][] = [
    [1, ["Anyone you send the link to", "Only people you invite", "Everyone on CrowdPoll", "Users can see who voted for what"]],
    [2, ["Notes"]],
    [3, ["Display Choices in the order above", "Voters may add choices"]],
    [5, ["One choice", "More than one", "Yes, as often as they like while the poll is open", "No, their first vote is final"]],
    [6, ["When does voting start?", "When does voting end?", "Time zone"]]
  ];

  it("puts one icon, outside any label, beside each label of a private poll's steps", async () => {
    const p = await step(1, PRIVATE);
    for (const [n, labels] of TABLE) {
      await goTo(p, n);
      expect(icons(p).map((b) => b.getAttribute("aria-label")), `step ${n}`).toEqual(labels.map((l) => "About: " + l));
      for (const button of icons(p)) {
        expect(button.closest("label"), button.getAttribute("aria-label")!).toBeNull();
        expect(button.type).toBe("button");
      }
    }
  });

  it("leaves out the two private-only icons on a public poll", async () => {
    const p = await step(1);
    expect(icon(p, "Users can see who voted for what")).toBeUndefined();
    expect(icon(p, "Everyone on CrowdPoll")).toBeDefined();
    await goTo(p, 3);
    expect(icon(p, "Voters may add choices")).toBeUndefined();
  });

  it("changes no control and leaves the wizard unchanged when pressed", async () => {
    const p = await step(5, PRIVATE);
    const before = checkedState(p);
    await press(p, "More than one");
    dialogs(p)[0]!.querySelector<HTMLButtonElement>("button")!.click();
    await p.settle();
    expect(checkedState(p)).toEqual(before);
    expect(await isDirty(p)).toBe(false);
  });

  it("still switches a row's control from its label and its support line", async () => {
    const p = await step(5, PRIVATE);
    const radio = (value: string) => wizardCard(p).querySelector<HTMLInputElement>(`input[name^="mutable-"][value="${value}"]`)!;
    const [from, to] = radio("change").checked ? ["change", "final"] : ["final", "change"];
    radio(to).closest(".m3-radio-item")!.querySelector<HTMLElement>(".m3-radio-label")!.click();
    await p.settle();
    expect(radio(to).checked).toBe(true);
    radio(from).closest(".m3-radio-item")!.querySelector<HTMLElement>(".m3-radio-support")!.click();
    await p.settle();
    expect(radio(from).checked).toBe(true);
  });

  it("keeps the icon of a locked row usable", async () => {
    const p = await step(1, {}, true);
    const publicRow = wizardCard(p).querySelector('input[value="public"]')!.closest(".m3-radio-item")!;
    expect(publicRow.classList.contains("is-disabled")).toBe(true);
    const button = publicRow.querySelector<HTMLButtonElement>("button.wizard-info")!;
    expect(button.disabled).toBe(false);
    button.click();
    await p.settle();
    expect(dialogs(p).length).toBe(1);
  });
});

describe("U12: the dialog", () => {
  const whoBlocks = (entries: [string, string][]) => entries.flatMap(([title, text]) => [["modal-info-heading", title], ["", text]]);

  it("gives every Who icon one dialog, the voters entry included on a private poll", async () => {
    const p = await step(1, PRIVATE);
    const entries: [string, string][] = [...Object.entries(WHO_HELP), ["Users can see who voted for what", VOTERS_HELP]];
    for (const [label] of entries) {
      await press(p, label);
      const box = dialogs(p)[0]!;
      expect(box.getAttribute("aria-modal")).toBe("true");
      expect(box.querySelector(".modal-headline")!.textContent).toBe("Who can vote");
      expect(blocks(p)).toEqual(whoBlocks(entries));
      box.querySelector<HTMLButtonElement>("button")!.click();
      await p.settle();
    }
  });

  it("leaves the voters entry out of a public poll's Who dialog", async () => {
    const p = await step(1);
    for (const label of Object.keys(WHO_HELP)) {
      await press(p, label);
      expect(dialogs(p)[0]!.querySelector(".modal-headline")!.textContent).toBe("Who can vote");
      expect(blocks(p)).toEqual(whoBlocks(Object.entries(WHO_HELP)));
      dialogs(p)[0]!.querySelector<HTMLButtonElement>("button")!.click();
      await p.settle();
    }
  });

  const escape = async (p: BrowserPage) => {
    p.document.dispatchEvent(new p.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await p.settle();
  };
  const orderBlocks = [["modal-info-heading", "Display Choices in the order above"], ...ORDER_HELP.map((text) => ["", text])];

  it("shows the Notes text", async () => {
    const p = await step(2, PRIVATE);
    await press(p, "Notes");
    expect(dialogs(p)[0]!.querySelector(".modal-headline")!.textContent).toBe("Notes");
    expect(blocks(p)).toEqual([["", NOTES_HELP]]);
  });

  it("gives every Choices icon one dialog, the add-choices entry included on a private poll", async () => {
    const p = await step(3, PRIVATE);
    for (const label of ["Display Choices in the order above", "Voters may add choices"]) {
      await press(p, label);
      expect(dialogs(p)[0]!.querySelector(".modal-headline")!.textContent).toBe("Choices");
      expect(blocks(p)).toEqual([...orderBlocks, ["modal-info-heading", "Voters may add choices"], ["", ADD_CHOICES_HELP]]);
      await escape(p);
    }
  });

  it("leaves the add-choices entry out of a public poll's Choices dialog", async () => {
    const p = await step(3);
    await press(p, "Display Choices in the order above");
    expect(dialogs(p)[0]!.querySelector(".modal-headline")!.textContent).toBe("Choices");
    expect(blocks(p)).toEqual(orderBlocks);
  });

  it("gives every How icon one dialog of four entries", async () => {
    const p = await step(5, PRIVATE);
    for (const label of Object.keys(HOW_HELP)) {
      await press(p, label);
      expect(dialogs(p)[0]!.querySelector(".modal-headline")!.textContent).toBe("How to vote");
      expect(blocks(p)).toEqual(whoBlocks(Object.entries(HOW_HELP)));
      await escape(p);
    }
  });

  it("gives the three When icons one dialog of five entries", async () => {
    const p = await step(6);
    for (const label of ["When does voting start?", "When does voting end?", "Time zone"]) {
      await press(p, label);
      expect(dialogs(p)[0]!.querySelector(".modal-headline")!.textContent).toBe("When to vote");
      expect(blocks(p)).toEqual(WHEN_HELP.flatMap(([title, text]) => [["modal-info-heading", title], ["", text]]));
      p.document.dispatchEvent(new p.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await p.settle();
    }
  });

  it("has one Close button with the focus, keeps the focus there, and closes by Close, Escape or the backdrop", async () => {
    const p = await step(5);
    const opener = icon(p, "One choice")!;
    for (const how of ["close", "escape", "backdrop"]) {
      opener.focus();
      opener.click();
      await p.settle();
      expect(dialogs(p).length).toBe(1);
      const buttons = Array.from(dialogs(p)[0]!.querySelectorAll("button"));
      expect(buttons.map((b) => b.textContent)).toEqual(["Close"]);
      expect(p.document.activeElement).toBe(buttons[0]);
      for (const shiftKey of [false, true]) {
        p.document.dispatchEvent(new p.window.KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true }));
        expect(p.document.activeElement).toBe(buttons[0]);
      }
      opener.click();
      await p.settle();
      expect(dialogs(p).length).toBe(1);

      if (how === "close") buttons[0]!.click();
      if (how === "escape") p.document.dispatchEvent(new p.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      if (how === "backdrop") p.document.querySelector<HTMLElement>(".modal-backdrop")!.click();
      await p.settle();
      expect(dialogs(p).length, how).toBe(0);
      expect(p.document.activeElement, how).toBe(opener);
    }
    expect(await isDirty(p)).toBe(false);
  });

  it("sets its text as text", async () => {
    const p = await open();
    await p.settle(100);
    (p.window as unknown as { AdminCard: { showInfo(title: string, blocks: { heading?: string; text: string }[]): void } }).AdminCard.showInfo(
      "<b>Title</b>",
      [{ heading: "<i>h</i>", text: "<b>bold</b>" }]
    );
    await p.settle();
    const box = dialogs(p)[0]!;
    expect(box.querySelector(".modal-headline")!.textContent).toBe("<b>Title</b>");
    expect(box.querySelector("b, i")).toBeNull();
    expect(blocks(p)).toEqual([["modal-info-heading", "<i>h</i>"], ["", "<b>bold</b>"]]);
  });
});

describe("U14: wording", () => {
  const COLORS_HELP = "Optional. Leave a choice on Automatic and an appropriate color is automatically assigned.";
  const LINE_GRAPH_ON = "On: the line graph is drawn on the Maximized view of a poll.";

  it("says how Automatic colors are assigned when the colors are set by hand", async () => {
    const p = await step(4, { choices: [{ id: "c1", label: "Red", position: 0, color: "#d32f2f" }] });
    expect(wizardCard(p).querySelector(".wizard-colors-help")!.textContent).toBe(COLORS_HELP);
  });

  it("says where the line graph is drawn, to an administrator with the line graph on", async () => {
    const p = await step(4, { lineGraphEnabled: true });
    const input = Array.from(wizardCard(p).querySelectorAll<HTMLElement>(".m3-switch-label"))
      .find((l) => l.textContent === "Show the line graph")!.closest(".m3-switch-row")!.querySelector("input")!;
    expect(p.document.getElementById(input.getAttribute("aria-describedby")!)!.textContent).toBe(LINE_GRAPH_ON);
  });

  it("leaves neither replaced sentence in any file of src/public", () => {
    const dir = path.join(process.cwd(), "src", "public");
    for (const name of readdirSync(dir, { recursive: true }) as string[]) {
      const file = path.join(dir, name);
      if (!statSync(file).isFile() || !/\.(js|html|css)$/.test(name)) continue;
      const text = readFileSync(file, "utf8");
      expect(text, name).not.toContain("Leave a choice on Automatic to color it for you.");
      expect(text, name).not.toContain("drawn beside the poll when it is maximized.");
    }
  });
});
