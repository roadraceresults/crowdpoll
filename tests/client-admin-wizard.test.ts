/**
 * The admin card in a browser: the six-step wizard for a new poll, the same
 * wizard for an existing poll, the Settings Summary and its Summary Text links,
 * the read-only face and its when-line.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls, voteHistory } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import type { Poll } from "../src/polls/store.js";

const ADMIN = "admin-wizard-client@example.com";
const CREATOR = "creator-wizard-client@example.com";
let ctx: TestContext;
let cookie = "";
let creatorCookie = "";
let creatorId = "";
let page: BrowserPage | null = null;
/** The JSON body of every request the page sent, in order. */
let bodies: { method: string; url: string; body: Record<string, unknown> | null }[] = [];
let clipboardText = "";

beforeAll(async () => {
  ctx = await startTestContext({ ENV_ADMINS: ADMIN, ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL: "60000" });
  cookie = (await forgeSession(ctx, ADMIN)).cookie;
  const creator = await forgeSession(ctx, CREATOR);
  creatorCookie = creator.cookie;
  creatorId = creator.userId;
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

async function open(sessionCookie = cookie): Promise<BrowserPage> {
  page?.close();
  const p = await openPage(ctx, "admin.html", {
    cookie: sessionCookie,
    url: "http://localhost/admin",
    scripts: ["m3-ripple.js", "app.js", "notesEditor.js", "adminCard.js", "adminList.js"],
    beforeScripts: (window) => {
      Object.defineProperty(window.navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => { clipboardText = text; },
          readText: async () => clipboardText
        }
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

async function seed(...items: Poll[]) {
  for (const poll of items) await polls(ctx).insertOne(poll);
}

const cardWith = (p: BrowserPage, title: string) =>
  Array.from(p.document.querySelectorAll<HTMLElement>("#pollList .poll-admin-card")).find((c) =>
    (c.querySelector(".wizard-summary-title")?.textContent ?? "").includes(title)
  )!;
const wizardCard = (p: BrowserPage) => p.document.querySelector<HTMLElement>(".poll-admin-card--new")!;
const heading = (card: HTMLElement) => card.querySelector(".wizard-panel-heading")?.textContent ?? "";
const links = (card: HTMLElement) => Array.from(card.querySelectorAll<HTMLElement>(".wizard-summary-link"));
const link = (card: HTMLElement, text: string) => links(card).find((l) => l.textContent === text)!;
const footerButton = (card: HTMLElement, text: string) =>
  Array.from(card.querySelectorAll<HTMLButtonElement>(".wizard-footer button")).find((b) => b.textContent === text)!;
const circles = (card: HTMLElement) => Array.from(card.querySelectorAll<HTMLElement>(".wizard-step"));
const sent = (path: string) => bodies.filter((b) => b.method === "POST" && b.url.endsWith(path));

function type(p: BrowserPage, field: HTMLInputElement | HTMLTextAreaElement, value: string) {
  field.value = value;
  field.dispatchEvent(new p.window.Event("input", { bubbles: true }));
}

function blur(p: BrowserPage, field: HTMLElement) {
  field.dispatchEvent(new p.window.Event("blur"));
  field.dispatchEvent(new p.window.FocusEvent("focusout", { bubbles: true }));
}

async function next(p: BrowserPage) {
  (wizardCard(p).querySelector(".wizard-next") as HTMLButtonElement).click();
  await p.settle();
}

async function pick(p: BrowserPage, name: string, value: string) {
  const input = wizardCard(p).querySelector<HTMLInputElement>(`input[name^="${name}-"][value="${value}"]`)!;
  input.checked = true;
  input.dispatchEvent(new p.window.Event("change", { bubbles: true }));
  await p.settle();
}

async function createPoll(p: BrowserPage) {
  await p.click("#createPollBtn");
  await p.settle(50);
  return wizardCard(p);
}

const titleField = (p: BrowserPage) => wizardCard(p).querySelector<HTMLInputElement>('[id^="pollTitle-"]')!;
const choicesBox = (p: BrowserPage) => wizardCard(p).querySelector<HTMLTextAreaElement>('textarea[aria-label="Choices"]')!;

/** Answers Steps 1–3 of a new poll: a title and two choices. */
async function answerFirstSteps(p: BrowserPage, title = "Bake sale") {
  await next(p);
  type(p, titleField(p), title);
  await next(p);
  type(p, choicesBox(p), "Cakes\nCookies");
  blur(p, choicesBox(p));
  await next(p);
}

describe("a new poll's wizard", () => {
  it("opens at Step 1 from Create New Poll, public by default, with the other steps not yet visited", async () => {
    const p = await open();
    const card = await createPoll(p);
    expect(card).toBeTruthy();
    expect(heading(card)).toBe("Step 1 · Who can vote");
    expect(card.querySelector<HTMLInputElement>('input[name^="who-"]:checked')!.value).toBe("public");
    const steps = circles(card);
    expect(steps.map((s) => s.className.replace("wizard-step ", ""))).toEqual([
      "is-current", "is-unvisited", "is-unvisited", "is-unvisited", "is-unvisited", "is-unvisited"
    ]);
    expect(steps.slice(1).every((s) => s.querySelector("button")!.disabled)).toBe(true);
    expect((p.document.getElementById("createPollBtn") as HTMLButtonElement).disabled).toBe(true);
    expect(card.querySelector(".card-pen")).toBeNull();
  });

  it("explains each answer to Who can vote under What does this mean?", async () => {
    const p = await open();
    const card = await createPoll(p);
    const help = card.querySelector(".wizard-help")!;
    expect(help.querySelector("summary")!.textContent).toBe("What does this mean?");
    const pairs = Array.from(help.querySelectorAll("dt")).map((dt) => [dt.textContent, dt.nextElementSibling!.textContent]);
    expect(pairs).toEqual([
      [
        "Anyone you send the link to",
        "Your poll is private: it is listed only in the \"Shared With You\" tab for the people you share it with, " +
          "and is not listed in Trending, Newest or Search. Anyone who has the link can open it and vote."
      ],
      [
        "Only people you invite",
        "Your poll is private: it is listed only in the \"Shared With You\" tab for the people you share it with, " +
          "and is not listed in Trending, Newest or Search. Only the people whose email addresses you invite can vote. " +
          "You add them after the poll is created."
      ],
      [
        "Everyone on CrowdPoll",
        "Your poll is public: anyone on CrowdPoll can find it and vote. Public polls appear after they are reviewed and approved."
      ]
    ]);
  });

  it("moves forward only with Next, which Step 6 does not have, and back through a visited circle", async () => {
    const p = await open();
    let card = await createPoll(p);
    await next(p);
    card = wizardCard(p);
    expect(heading(card)).toBe("Step 2 · Title & Tags");
    expect(circles(card)[0]!.classList.contains("is-visited")).toBe(true);
    for (let i = 0; i < 4; i++) await next(p);
    card = wizardCard(p);
    expect(heading(card)).toBe("Step 6 · When to vote");
    expect(card.querySelector(".wizard-next")).toBeNull();
    expect(card.querySelector(".wizard-back, .btn-back")).toBeNull();
    (circles(card)[0]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
    expect(heading(wizardCard(p))).toBe("Step 1 · Who can vote");
  });

  it("blocks Publish with a reason until every step is visited and the poll is complete, then publishes", async () => {
    const p = await open();
    let card = await createPoll(p);
    let publish = footerButton(card, "Publish");
    expect(publish.getAttribute("aria-disabled")).toBe("true");
    expect(publish.disabled).toBe(false);
    expect(publish.title).toBe("Visit all six steps to publish.");
    const before = bodies.length;
    publish.click();
    await p.settle(50);
    expect(bodies.length).toBe(before);

    for (let i = 0; i < 5; i++) await next(p);
    expect(footerButton(wizardCard(p), "Publish").title).toBe("Give your poll a title to publish.");
    (circles(wizardCard(p))[1]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
    type(p, titleField(p), "Bake sale");
    expect(footerButton(wizardCard(p), "Publish").title).toBe("Add at least 2 choices to publish.");
    (circles(wizardCard(p))[2]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
    type(p, choicesBox(p), "Cakes\nCookies");
    card = wizardCard(p);
    publish = footerButton(card, "Publish");
    expect(publish.hasAttribute("aria-disabled")).toBe(false);
    publish.click();
    await p.settle(100);
    expect(sent("/publish")).toHaveLength(1);
    const pid = decodeURIComponent(sent("/publish")[0]!.url.split("/")[4]!);
    expect(sent("/publish")[0]!.body).toMatchObject({ title: "Bake sale", labels: ["Cakes", "Cookies"], pollVisibility: "Public Poll" });
    expect((await polls(ctx).findOne({ _id: pid }))!.pollState).toBe("AWAITING APPROVAL");
    expect(p.document.querySelector(".poll-admin-card--new")).toBeNull();
  });

  it("blocks Next, Save and Publish while two choices differ only in capitals or spaces", async () => {
    const p = await open();
    await createPoll(p);
    await next(p);
    await next(p);
    type(p, choicesBox(p), "Taco Town\ntaco  town ");
    const card = wizardCard(p);
    expect((card.querySelector(".wizard-next") as HTMLButtonElement).disabled).toBe(true);
    for (const name of ["Save", "Publish"]) {
      expect(footerButton(card, name).getAttribute("aria-disabled"), name).toBe("true");
      expect(footerButton(card, name).title, name).toBe("Remove the duplicate choice first.");
    }
    expect(footerButton(card, "Cancel").hasAttribute("aria-disabled")).toBe(false);
  });

  it("saves to finish later, then reopens at the tapped step with its progress", async () => {
    const p = await open();
    await createPoll(p);
    await answerFirstSteps(p);
    footerButton(wizardCard(p), "Save").click();
    await p.settle(100);
    expect(sent("/save")).toHaveLength(1);
    expect(sent("/publish")).toHaveLength(0);
    expect(p.document.querySelector(".poll-admin-card--new")).toBeNull();
    const card = cardWith(p, "Bake sale");
    expect(card.querySelector(".card-readonly")).not.toBeNull();
    link(card, "Cakes, Cookies").click();
    await p.settle(50);
    const reopened = wizardCard(p);
    expect(heading(reopened)).toBe("Step 3 · Choices");
    expect(circles(reopened).slice(0, 4).map((s) => s.className.replace("wizard-step ", ""))).toEqual([
      "is-visited", "is-visited", "is-current", "is-visited"
    ]);
  });

  for (const [label, away] of [["another admin view", "awaiting"], ["the Search view before a search", "search"]] as const) {
    it(`keeps the saved progress across ${label}`, async () => {
      const p = await open();
      await createPoll(p);
      await answerFirstSteps(p);
      footerButton(wizardCard(p), "Save").click();
      await p.settle(100);
      await p.click(`#adminTabBar .tab[data-tab="${away}"]`);
      await p.settle(50);
      expect(p.document.querySelector("#pollList")!.textContent).not.toContain("Cakes, Cookies");
      await p.click('#adminTabBar .tab[data-tab="newest"]');
      await p.settle(50);
      link(cardWith(p, "Bake sale"), "Cakes, Cookies").click();
      await p.settle(50);
      expect(circles(wizardCard(p)).slice(0, 3).map((s) => s.className.replace("wizard-step ", ""))).toEqual([
        "is-visited", "is-visited", "is-current"
      ]);
    });
  }

  it("keeps the saved answers after a reload, reopening at Step 1", async () => {
    let p = await open();
    await createPoll(p);
    await pick(p, "who", "link");
    await answerFirstSteps(p, "Picnic spot");
    footerButton(wizardCard(p), "Save").click();
    await p.settle(100);

    p = await open();
    const card = cardWith(p, "Picnic spot");
    link(card, "Private Poll").click();
    await p.settle(50);
    const reopened = wizardCard(p);
    expect(heading(reopened)).toBe("Step 1 · Who can vote");
    expect(reopened.querySelector<HTMLInputElement>('input[name^="who-"]:checked')!.value).toBe("link");
    await next(p);
    expect(titleField(p).value).toBe("Picnic spot");
    await next(p);
    expect(choicesBox(p).value).toBe("Cakes\nCookies");
  });

  it("gives any unpublished poll the new-poll footer, whoever created it", async () => {
    await seed(makePoll({ title: "Seeded draft", pollState: "INITIALIZED" }));
    const p = await open();
    link(cardWith(p, "Seeded draft"), "Seeded draft").click();
    await p.settle(50);
    const card = wizardCard(p);
    expect(heading(card)).toBe("Step 2 · Title & Tags");
    expect(Array.from(card.querySelectorAll(".wizard-footer button")).map((b) => b.textContent)).toEqual(["Cancel", "Save", "Publish"]);
    expect(card.querySelector(".wizard-review-note")).toBeNull();
  });

  it("asks before Cancel discards edits, and never deletes the poll", async () => {
    const p = await open();
    await createPoll(p);
    await next(p);
    type(p, titleField(p), "Unsaved title");
    footerButton(wizardCard(p), "Cancel").click();
    await p.settle();
    const dialog = p.document.querySelector('.modal[role="alertdialog"]')!;
    expect(dialog).not.toBeNull();
    (dialog.querySelector(".modal-keep") as HTMLButtonElement).click();
    await p.settle();
    expect(titleField(p).value).toBe("Unsaved title");

    footerButton(wizardCard(p), "Cancel").click();
    await p.settle();
    (p.document.querySelector(".modal .modal-discard") as HTMLButtonElement).click();
    await p.settle(100);
    expect(p.document.querySelector(".poll-admin-card--new")).toBeNull();
    expect(p.document.querySelectorAll("#pollList .poll-admin-card")).toHaveLength(1);
    expect(sent("/save")).toHaveLength(0);
    const stored = (await request(ctx.app).get("/api/admin/polls").set("Cookie", cookie)).body.polls;
    expect(stored).toHaveLength(1);
    expect(stored[0].pollState).toBe("INITIALIZED");
  });

  it("offers the anonymity switch on private polls only, and the summary follows it", async () => {
    const p = await open();
    let card = await createPoll(p);
    expect(card.querySelector(".m3-switch")).toBeNull();
    await pick(p, "who", "link");
    card = wizardCard(p);
    const toggle = card.querySelector<HTMLInputElement>(".m3-switch")!;
    expect(toggle.getAttribute("role")).toBe("switch");
    expect(toggle.checked).toBe(false);
    expect(card.querySelector(".wizard-summary-who")!.textContent).toContain("Votes are anonymous.");
    toggle.click();
    await p.settle();
    expect(wizardCard(p).querySelector(".wizard-summary-who")!.textContent).toContain("Users can see who voted for what.");
    await pick(p, "who", "public");
    expect(wizardCard(p).querySelector(".m3-switch")).toBeNull();
  });

  describe("inside the steps", () => {
    it("copies the poll link under the link-only option, with a snackbar", async () => {
      const p = await open();
      await createPoll(p);
      expect(wizardCard(p).querySelector(".wizard-copy-link")).toBeNull();
      await pick(p, "who", "link");
      const copy = Array.from(wizardCard(p).querySelectorAll("button")).find((b) => b.textContent === "Copy link")!;
      copy.click();
      await p.settle();
      expect(clipboardText).toMatch(/^http:\/\/localhost\/\?PID=/);
      expect(p.document.querySelector(".m3-snackbar")!.textContent).toBe("Link copied");
    });

    it("cuts a choice to 35 characters, refuses an empty line and drops pasted repeats", async () => {
      const p = await open();
      await createPoll(p);
      await next(p);
      await next(p);
      type(p, choicesBox(p), "x".repeat(36));
      expect(choicesBox(p).value).toBe("x".repeat(35));
      expect(wizardCard(p).textContent).toContain("Choices are capped at 35 characters.");

      type(p, choicesBox(p), "Cakes\n");
      choicesBox(p).setSelectionRange(6, 6);
      const enter = new p.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
      choicesBox(p).dispatchEvent(enter);
      expect(enter.defaultPrevented).toBe(true);
      expect(wizardCard(p).textContent).toContain("Type a choice before starting a new line.");

      type(p, choicesBox(p), "Cakes");
      clipboardText = "Cookies\ncakes\nPies";
      Array.from(wizardCard(p).querySelectorAll("button")).find((b) => b.textContent === "Paste choices")!.click();
      await p.settle();
      expect(choicesBox(p).value).toBe("Cakes\nCookies\nPies");
      expect(p.document.querySelector(".m3-snackbar")!.textContent).toBe("1 duplicate was removed.");
    });

    it("counts choices, not characters, under the Choices box (TWEAK01)", async () => {
      const p = await open();
      await createPoll(p);
      await next(p);
      await next(p);
      type(p, choicesBox(p), "x".repeat(36));
      const counter = wizardCard(p).querySelector(".m3-field--choices .m3-field-counter")!;
      expect(counter.textContent).toBe("1 / 50 choices");
      type(p, choicesBox(p), "Cakes\nPies");
      expect(counter.textContent).toBe("2 / 50 choices");
    });

    it("pre-fills the dates, names the time zone, and blocks Publish for an end in the past", async () => {
      const p = await open();
      await createPoll(p);
      for (let i = 0; i < 5; i++) await next(p);
      expect(wizardCard(p).querySelector(".wizard-tz")!.textContent).toMatch(/^Times are in your time zone/);
      await pick(p, "starts", "on");
      const start = wizardCard(p).querySelector<HTMLInputElement>('input[aria-label="Start date and time"]')!.value;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(start.slice(11)).toBe("09:00");
      expect(new Date(start).getDate()).toBe(tomorrow.getDate());
      await pick(p, "ends", "on");
      const end = wizardCard(p).querySelector<HTMLInputElement>('input[aria-label="End date and time"]')!.value;
      const day = (v: string) => Date.UTC(Number(v.slice(0, 4)), Number(v.slice(5, 7)) - 1, Number(v.slice(8, 10)));
      expect((day(end) - day(start)) / 86_400_000).toBe(7);
      expect(end.slice(11)).toBe("09:00");

      await pick(p, "starts", "now");
      const endInput = wizardCard(p).querySelector<HTMLInputElement>('input[aria-label="End date and time"]')!;
      endInput.value = "2020-01-01T09:00";
      endInput.dispatchEvent(new p.window.Event("change", { bubbles: true }));
      await p.settle();
      expect(wizardCard(p).querySelector(".wizard-error")!.textContent).toBe("The end must be in the future.");
      expect(footerButton(wizardCard(p), "Publish").getAttribute("aria-disabled")).toBe("true");
    });
  });
});

describe("the View step", () => {
  const rowsOf = (p: BrowserPage) => Array.from(wizardCard(p).querySelectorAll<HTMLElement>(".wizard-color-row"));
  const colorButton = (p: BrowserPage, choice: string) =>
    wizardCard(p).querySelector<HTMLButtonElement>(`button[aria-label="Color for ${choice}"]`)!;
  const popover = (p: BrowserPage) => wizardCard(p).querySelector<HTMLElement>(".wizard-color-popover")!;
  const swatches = (p: BrowserPage) => Array.from(popover(p).querySelectorAll<HTMLButtonElement>('[role="radio"]'));
  const swatchNamed = (p: BrowserPage, name: string) => swatches(p).find((s) => s.getAttribute("aria-label") === name)!;
  const dotOf = (button: HTMLElement) => button.querySelector<HTMLElement>(".wizard-color-dot")!;
  const nameOf = (button: HTMLElement) => button.querySelector(".wizard-color-name")!.textContent;

  async function openColors(p: BrowserPage, title = "Bake sale") {
    await createPoll(p);
    await answerFirstSteps(p, title);
  }

  async function choose(p: BrowserPage, choice: string, colorName: string) {
    colorButton(p, choice).click();
    await p.settle();
    swatchNamed(p, colorName).click();
    await p.settle();
  }

  it("reads Who, Title, Choices, View, How, When, and Next on Choices leads to View", async () => {
    const p = await open();
    const card = await createPoll(p);
    expect(circles(card).map((c) => c.querySelector(".wizard-step-label")!.textContent)).toEqual([
      "Who", "Title", "Choices", "View", "How", "When"
    ]);
    await next(p);
    await next(p);
    expect(heading(wizardCard(p))).toBe("Step 3 · Choices");
    type(p, choicesBox(p), "Cakes\nCookies");
    blur(p, choicesBox(p));
    await next(p);
    expect(heading(wizardCard(p))).toBe("Step 4 · View");
    await next(p);
    expect(heading(wizardCard(p))).toBe("Step 5 · How to vote");
    await next(p);
    expect(heading(wizardCard(p))).toBe("Step 6 · When to vote");
  });

  it("lists one row per choice, each on Automatic with an empty ring, under one line of help", async () => {
    const p = await open();
    await openColors(p);
    const card = wizardCard(p);
    expect(heading(card)).toBe("Step 4 · View");
    expect(card.querySelector(".wizard-colors-help")!.textContent).toBe("Optional. Leave a choice on Automatic to color it for you.");
    expect(rowsOf(p).map((r) => r.querySelector(".wizard-color-label")!.textContent)).toEqual(["Cakes", "Cookies"]);
    for (const choice of ["Cakes", "Cookies"]) {
      const button = colorButton(p, choice);
      expect(nameOf(button)).toBe("Automatic");
      expect(dotOf(button).classList.contains("is-automatic")).toBe(true);
      expect(button.getAttribute("aria-haspopup")).toBe("true");
      expect(button.getAttribute("aria-expanded")).toBe("false");
    }
    expect(popover(p).hidden).toBe(true);
  });

  it("opens Automatic and every palette swatch in palette order, then closes on a choice with focus back on the button", async () => {
    const p = await open();
    await openColors(p);
    colorButton(p, "Cakes").click();
    await p.settle();
    expect(popover(p).hidden).toBe(false);
    expect(colorButton(p, "Cakes").getAttribute("aria-expanded")).toBe("true");
    expect(swatches(p).map((s) => s.getAttribute("aria-label"))).toEqual([
      "Automatic", "red", "blue", "black", "darkslategray", "darkgray", "gainsboro", "darkred", "orangered",
      "yellow", "greenyellow", "lime", "darkgreen", "teal", "dodgerblue", "darkslateblue", "purple", "plum", "saddlebrown"
    ]);
    swatchNamed(p, "red").click();
    await p.settle();
    expect(popover(p).hidden).toBe(true);
    const button = colorButton(p, "Cakes");
    expect(p.document.activeElement).toBe(button);
    expect(nameOf(button)).toBe("red");
    expect(dotOf(button).classList.contains("is-automatic")).toBe(false);
    expect(dotOf(button).style.getPropertyValue("--swatch")).toBe("#F91010");
    expect(nameOf(colorButton(p, "Cookies"))).toBe("Automatic");
  });

  it("clears a color when Automatic is chosen", async () => {
    const p = await open();
    await openColors(p);
    await choose(p, "Cakes", "blue");
    expect(nameOf(colorButton(p, "Cakes"))).toBe("blue");
    await choose(p, "Cakes", "Automatic");
    expect(nameOf(colorButton(p, "Cakes"))).toBe("Automatic");
    expect(dotOf(colorButton(p, "Cakes")).classList.contains("is-automatic")).toBe(true);
  });

  it("sends the colors beside the labels on Save and on Publish, null for Automatic", async () => {
    const p = await open();
    await openColors(p);
    await choose(p, "Cakes", "red");
    footerButton(wizardCard(p), "Save").click();
    await p.settle(100);
    expect(sent("/save")[0]!.body).toMatchObject({ labels: ["Cakes", "Cookies"], colors: ["#F91010", null] });
    expect(sent("/publish")).toHaveLength(0);

    await createPoll(p);
    await answerFirstSteps(p, "Second sale");
    await choose(p, "Cakes", "red");
    await next(p);
    await next(p);
    footerButton(wizardCard(p), "Publish").click();
    await p.settle(100);
    expect(sent("/publish")[0]!.body).toMatchObject({ labels: ["Cakes", "Cookies"], colors: ["#F91010", null] });
  });

  it("shows the saved colors again when the poll is reopened, also after a reload", async () => {
    let p = await open();
    await openColors(p);
    await choose(p, "Cookies", "teal");
    footerButton(wizardCard(p), "Save").click();
    await p.settle(100);
    link(cardWith(p, "Bake sale"), "Cakes, Cookies").click();
    await p.settle(50);
    (circles(wizardCard(p))[3]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
    expect(heading(wizardCard(p))).toBe("Step 4 · View");
    expect(nameOf(colorButton(p, "Cookies"))).toBe("teal");
    expect(nameOf(colorButton(p, "Cakes"))).toBe("Automatic");
    footerButton(wizardCard(p), "Cancel").click();
    await p.settle(100);

    p = await open();
    link(cardWith(p, "Bake sale"), "Public Poll").click();
    await p.settle(50);
    for (let i = 0; i < 3; i++) await next(p);
    expect(heading(wizardCard(p))).toBe("Step 4 · View");
    expect(nameOf(colorButton(p, "Cookies"))).toBe("teal");
  });
});

describe("colors on an existing poll", () => {
  const choices = [{ id: "c1", label: "Left", position: 0 }, { id: "c2", label: "Right", position: 1 }];
  const colorButton = (p: BrowserPage, choice: string) =>
    wizardCard(p).querySelector<HTMLButtonElement>(`button[aria-label="Color for ${choice}"]`)!;
  const nameOf = (button: HTMLElement) => button.querySelector(".wizard-color-name")!.textContent;

  async function chooseColor(p: BrowserPage, choice: string, colorName: string) {
    colorButton(p, choice).click();
    await p.settle();
    wizardCard(p).querySelector<HTMLButtonElement>(`.wizard-swatch[aria-label="${colorName}"]`)!.click();
    await p.settle();
  }

  async function openExisting(title: string, withVotes: boolean, overrides: Partial<Poll> = {}) {
    const poll = makePoll({ title, subtitle: "Sub", pollState: "OPEN", choices, ...overrides });
    await seed(poll);
    if (withVotes) {
      await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "v@example.com", userName: "v", choiceIds: ["c1"], votedAt: new Date() });
    }
    const p = await open();
    link(cardWith(p, title), title).click();
    await p.settle(50);
    (circles(wizardCard(p))[3]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
    return { p, poll };
  }

  // EDITING-POLL-AVAILABLE C1 reversed the old lock: on a voted poll the Choices
  // textbox stays editable too, and its changes go to review through the merge.
  it("keeps Colors and Choices open on a poll that has votes, listing the stored choices", async () => {
    const { p } = await openExisting("Voted", true);
    expect(heading(wizardCard(p))).toBe("Step 4 · View");
    expect(Array.from(wizardCard(p).querySelectorAll(".wizard-color-label")).map((l) => l.textContent)).toEqual(["Left", "Right"]);
    expect(colorButton(p, "Left").disabled).toBe(false);
    expect(wizardCard(p).querySelector(".wizard-locked")).toBeNull();
    (circles(wizardCard(p))[2]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
    expect(heading(wizardCard(p))).toBe("Step 3 · Choices");
    expect(wizardCard(p).querySelector(".wizard-locked")).toBeNull();
    expect(choicesBox(p).disabled).toBe(false);
  });

  it("shows a stored choice over 35 characters whole, and cuts it to 35 once its text changes", async () => {
    const long = "L".repeat(72);
    const { p } = await openExisting("Long choice", true, {
      choices: [{ id: "c1", label: long, position: 0 }, { id: "c2", label: "Right", position: 1 }]
    });
    (circles(wizardCard(p))[2]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
    expect(choicesBox(p).value).toBe(`${long}\nRight`);

    type(p, choicesBox(p), `${long}!\nRight`);
    expect(choicesBox(p).value).toBe(`${"L".repeat(35)}\nRight`);
    expect(wizardCard(p).textContent).toContain("Choices are capped at 35 characters.");
  });

  it("leaves lines in storedLabels whole and cuts every other line to 35", async () => {
    const p = await open();
    const long = "L".repeat(72);
    const result = p.window.AdminCard.sanitizeChoicesText(`${long}\n${"x".repeat(40)}`, 0, { storedLabels: new Set([long]) });
    expect(result.text).toBe(`${long}\n${"x".repeat(35)}`);
  });

  it("posts only to the colors route, with the session's guid, when colors are all that changed on a poll with votes", async () => {
    const { p, poll } = await openExisting("Voted", true);
    await chooseColor(p, "Left", "red");
    const save = footerButton(wizardCard(p), "Save changes");
    expect(save.hasAttribute("aria-disabled")).toBe(false);
    const before = bodies.length;
    save.click();
    await p.settle(100);
    const posts = bodies.slice(before).filter((b) => b.method === "POST");
    expect(posts.map((b) => b.url.replace(/^.*\/api/, "/api"))).toEqual([`/api/admin/polls/${poll._id}/colors`]);
    expect(Object.keys(posts[0]!.body!).sort()).toEqual(["clientGuid", "colors", "timeZone"]);
    expect(posts[0]!.body!.colors).toEqual(["#F91010", null]);
    expect(sent("/publish")).toHaveLength(0);
    const stored = (await polls(ctx).findOne({ _id: poll._id }))!;
    expect(stored.pollState).toBe("OPEN");
    expect(stored.choices.map((c) => c.color)).toEqual(["#F91010", undefined]);
    expect(p.document.querySelector(".poll-admin-card--new")).toBeNull();
  });

  it("publishes with both the title and the colors when more than colors changed", async () => {
    const { p } = await openExisting("Voted", true);
    await chooseColor(p, "Right", "blue");
    (circles(wizardCard(p))[1]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
    type(p, titleField(p), "Voted, renamed");
    footerButton(wizardCard(p), "Save changes").click();
    await p.settle(100);
    expect(sent("/colors")).toHaveLength(0);
    expect(sent("/publish")).toHaveLength(1);
    expect(sent("/publish")[0]!.body).toMatchObject({ title: "Voted, renamed", colors: [null, "#0808FD"] });
  });

  it("publishes the colors of a poll without votes, as it does a change of title", async () => {
    const { p } = await openExisting("Unvoted", false);
    await chooseColor(p, "Left", "darkgreen");
    footerButton(wizardCard(p), "Save changes").click();
    await p.settle(100);
    expect(sent("/colors")).toHaveLength(0);
    expect(sent("/publish")[0]!.body).toMatchObject({ colors: ["#006120", null] });
    expect(Object.keys(sent("/publish")[0]!.body!).sort()).toEqual(["clientGuid", "colors", "timeZone"]);
  });

  it("shows the server's message and stays in the wizard, answers intact, when the colors are refused", async () => {
    const { p } = await openExisting("Voted", true);
    await chooseColor(p, "Left", "red");
    const real = p.window.fetch;
    p.window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith("/colors")) return new Response(JSON.stringify({ error: "Colors can only be saved from the open edit session." }), { status: 409, headers: { "Content-Type": "application/json" } });
      return real(input, init);
    }) as typeof fetch;
    footerButton(wizardCard(p), "Save changes").click();
    await p.settle(100);
    expect(wizardCard(p)).toBeTruthy();
    expect(wizardCard(p).querySelector(".card-status-line")!.textContent).toBe("Colors can only be saved from the open edit session.");
    expect(nameOf(colorButton(p, "Left"))).toBe("red");
  });
});

describe("the color picker's keyboard, roles and look", () => {
  const colorButton = (p: BrowserPage, choice: string) =>
    wizardCard(p).querySelector<HTMLButtonElement>(`button[aria-label="Color for ${choice}"]`)!;
  const popover = (p: BrowserPage) => wizardCard(p).querySelector<HTMLElement>(".wizard-color-popover")!;
  const swatches = (p: BrowserPage) => Array.from(popover(p).querySelectorAll<HTMLButtonElement>('[role="radio"]'));
  const nameOf = (button: HTMLElement) => button.querySelector(".wizard-color-name")!.textContent;
  const key = (p: BrowserPage, target: Element, name: string) => {
    const event = new p.window.KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  };
  const focusedLabel = (p: BrowserPage) => p.document.activeElement?.getAttribute("aria-label");

  async function atColors(p: BrowserPage) {
    await createPoll(p);
    await answerFirstSteps(p);
  }

  async function openFor(p: BrowserPage, choice: string) {
    colorButton(p, choice).click();
    await p.settle();
  }

  it("enters the grid at Automatic, or at the chosen swatch, with one tab stop", async () => {
    const p = await open();
    await atColors(p);
    await openFor(p, "Cakes");
    expect(focusedLabel(p)).toBe("Automatic");
    expect(swatches(p).filter((s) => s.tabIndex === 0).map((s) => s.getAttribute("aria-label"))).toEqual(["Automatic"]);
    key(p, p.document.activeElement!, "Escape");
    await p.settle();
    await openFor(p, "Cakes");
    swatches(p).find((s) => s.getAttribute("aria-label") === "purple")!.click();
    await p.settle();
    await openFor(p, "Cakes");
    expect(focusedLabel(p)).toBe("purple");
    expect(swatches(p).filter((s) => s.tabIndex === 0).map((s) => s.getAttribute("aria-label"))).toEqual(["purple"]);
  });

  it("moves by one with the arrow keys, jumps with Home and End, and chooses with Enter or Space", async () => {
    const p = await open();
    await atColors(p);
    await openFor(p, "Cakes");
    key(p, p.document.activeElement!, "ArrowRight");
    expect(focusedLabel(p)).toBe("red");
    key(p, p.document.activeElement!, "ArrowDown");
    expect(focusedLabel(p)).toBe("blue");
    key(p, p.document.activeElement!, "ArrowLeft");
    expect(focusedLabel(p)).toBe("red");
    key(p, p.document.activeElement!, "ArrowUp");
    expect(focusedLabel(p)).toBe("Automatic");
    key(p, p.document.activeElement!, "ArrowUp");
    expect(focusedLabel(p)).toBe("Automatic");
    key(p, p.document.activeElement!, "End");
    expect(focusedLabel(p)).toBe("saddlebrown");
    key(p, p.document.activeElement!, "ArrowRight");
    expect(focusedLabel(p)).toBe("saddlebrown");
    key(p, p.document.activeElement!, "Home");
    expect(focusedLabel(p)).toBe("Automatic");
    key(p, p.document.activeElement!, "ArrowRight");
    const enter = key(p, p.document.activeElement!, "Enter");
    await p.settle();
    expect(enter.defaultPrevented).toBe(true);
    expect(nameOf(colorButton(p, "Cakes"))).toBe("red");
    expect(popover(p).hidden).toBe(true);
    expect(p.document.activeElement).toBe(colorButton(p, "Cakes"));

    await openFor(p, "Cookies");
    key(p, p.document.activeElement!, "End");
    key(p, p.document.activeElement!, " ");
    await p.settle();
    expect(nameOf(colorButton(p, "Cookies"))).toBe("saddlebrown");
  });

  it("closes on Escape with focus back on the button, and on a press outside", async () => {
    const p = await open();
    await atColors(p);
    await openFor(p, "Cakes");
    key(p, p.document.activeElement!, "Escape");
    await p.settle();
    expect(popover(p).hidden).toBe(true);
    expect(colorButton(p, "Cakes").getAttribute("aria-expanded")).toBe("false");
    expect(p.document.activeElement).toBe(colorButton(p, "Cakes"));

    await openFor(p, "Cakes");
    wizardCard(p).querySelector(".wizard-colors-help")!.dispatchEvent(new p.window.Event("pointerdown", { bubbles: true }));
    await p.settle();
    expect(popover(p).hidden).toBe(true);
    expect(p.document.activeElement).toBe(colorButton(p, "Cakes"));
  });

  it("moves the one grid to the next button that is pressed, closing it under the first", async () => {
    const p = await open();
    await atColors(p);
    await openFor(p, "Cakes");
    await openFor(p, "Cookies");
    expect(wizardCard(p).querySelectorAll(".wizard-color-popover")).toHaveLength(1);
    expect(popover(p).parentElement).toBe(colorButton(p, "Cookies").parentElement);
    expect(colorButton(p, "Cakes").getAttribute("aria-expanded")).toBe("false");
    expect(colorButton(p, "Cookies").getAttribute("aria-expanded")).toBe("true");
  });

  it("flips the grid above the button when there is no room below", async () => {
    const p = await open();
    await atColors(p);
    const button = colorButton(p, "Cookies");
    button.getBoundingClientRect = () => ({ top: 700, bottom: 748, left: 0, right: 100, width: 100, height: 48, x: 0, y: 700, toJSON() {} });
    Object.defineProperty(popover(p), "offsetHeight", { configurable: true, value: 300 });
    p.window.innerHeight = 768;
    await openFor(p, "Cookies");
    expect(popover(p).classList.contains("wizard-color-popover--above")).toBe(true);
    key(p, p.document.activeElement!, "Escape");
    await openFor(p, "Cakes");
    expect(popover(p).classList.contains("wizard-color-popover--above")).toBe(false);
  });

  it("names the button and the radio group, and marks the chosen swatch, with the name as the tooltip", async () => {
    const p = await open();
    await atColors(p);
    const button = colorButton(p, "Cakes");
    expect(button.getAttribute("aria-haspopup")).toBe("true");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    await openFor(p, "Cakes");
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(popover(p).getAttribute("role")).toBe("radiogroup");
    expect(popover(p).getAttribute("aria-label")).toBe("Color for Cakes");
    expect(swatches(p)).toHaveLength(19);
    for (const swatch of swatches(p)) {
      expect(swatch.getAttribute("aria-checked")).toBe(swatch.getAttribute("aria-label") === "Automatic" ? "true" : "false");
      expect(swatch.title).toBe(swatch.getAttribute("aria-label"));
      expect(swatch.classList.contains("wizard-swatch-outlined")).toBe(true);
    }
    swatches(p).find((s) => s.getAttribute("aria-label") === "black")!.click();
    await p.settle();
    await openFor(p, "Cakes");
    const checked = swatches(p).filter((s) => s.getAttribute("aria-checked") === "true");
    expect(checked.map((s) => s.getAttribute("aria-label"))).toEqual(["black"]);
    expect(checked[0]!.querySelector(".wizard-swatch-check")).not.toBeNull();
    expect(checked[0]!.classList.contains("is-chosen")).toBe(true);
  });

  it("sizes every target at 48px and the grid at four columns in the stylesheet", async () => {
    const css = (await request(ctx.app).get("/admin-card-m3.css")).text;
    const rule = (selector: string) => {
      const start = css.indexOf(selector + "{");
      expect(start, selector).toBeGreaterThanOrEqual(0);
      return css.slice(start, css.indexOf("}", start));
    };
    expect(rule(".poll-admin-card .wizard-color-btn")).toContain("min-height:48px");
    expect(rule(".poll-admin-card .wizard-swatch")).toMatch(/width:48px;\s*height:48px/);
    expect(rule(".poll-admin-card .wizard-swatch-automatic")).toContain("grid-column:1 / -1");
    expect(rule(".poll-admin-card .wizard-color-popover")).toContain("grid-template-columns:repeat(4, 48px)");
    expect(rule(".poll-admin-card .wizard-color-popover")).toContain("gap:8px");
    expect(css).toMatch(/\.poll-admin-card \.wizard-swatch-outlined \.wizard-swatch-fill\{[^}]*border:1px solid var\(--md-sys-color-outline\)/);
  });

  it("replaces the list with one line, and shows no button, when the Choices box is empty", async () => {
    const p = await open();
    await createPoll(p);
    for (let i = 0; i < 3; i++) await next(p);
    const card = wizardCard(p);
    expect(heading(card)).toBe("Step 4 · View");
    expect(card.querySelector(".wizard-colors-empty")!.textContent).toBe("Add your choices first, then come back to choose their colors.");
    expect(card.querySelectorAll(".wizard-color-btn")).toHaveLength(0);
  });

  it("lists lines typed in the Choices box but not yet saved", async () => {
    const p = await open();
    await createPoll(p);
    await next(p);
    await next(p);
    type(p, choicesBox(p), "Typed one\nTyped two\nTyped three");
    await next(p);
    expect(Array.from(wizardCard(p).querySelectorAll(".wizard-color-label")).map((l) => l.textContent)).toEqual(["Typed one", "Typed two", "Typed three"]);
  });

  it("renders fifty rows and one grid for a poll with fifty choices", async () => {
    const p = await open();
    await createPoll(p);
    await next(p);
    await next(p);
    type(p, choicesBox(p), Array.from({ length: 50 }, (_, i) => `Choice number ${i + 1}`).join("\n"));
    await next(p);
    expect(wizardCard(p).querySelectorAll(".wizard-color-row")).toHaveLength(50);
    await openFor(p, "Choice number 50");
    expect(wizardCard(p).querySelectorAll(".wizard-color-popover")).toHaveLength(1);
  });
});

describe("the Settings Summary's line for colors", () => {
  const colorsLine = (card: HTMLElement) => card.querySelector<HTMLElement>(".wizard-summary-colors");
  const swatchesIn = (line: HTMLElement) => Array.from(line.querySelectorAll<HTMLElement>(".wizard-summary-swatch"));

  it("says bar colors are assigned automatically when none is set, on the line after the choices", async () => {
    const p = await open();
    await createPoll(p);
    await answerFirstSteps(p);
    expect(colorsLine(wizardCard(p))).toBeNull();
    await next(p);
    const card = wizardCard(p);
    const line = colorsLine(card)!;
    expect(line.textContent).toBe("Bar colors are assigned automatically.");
    expect(line.previousElementSibling!.classList.contains("wizard-summary-choices")).toBe(true);
    expect(swatchesIn(line)).toHaveLength(0);
  });

  it("counts the colors set by hand, one swatch each, with singular and plural wording", async () => {
    const p = await open();
    await createPoll(p);
    await answerFirstSteps(p);
    const pickFor = async (choice: string, name: string) => {
      wizardCard(p).querySelector<HTMLButtonElement>(`button[aria-label="Color for ${choice}"]`)!.click();
      await p.settle();
      wizardCard(p).querySelector<HTMLButtonElement>(`.wizard-swatch[aria-label="${name}"]`)!.click();
      await p.settle();
    };
    await pickFor("Cakes", "red");
    await next(p);
    (circles(wizardCard(p))[3]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
    let line = colorsLine(wizardCard(p))!;
    expect(line.textContent).toBe("1 color has been set manually: .");
    expect(swatchesIn(line).map((s) => [s.getAttribute("aria-label"), s.style.getPropertyValue("--swatch")])).toEqual([["Cakes: red", "#F91010"]]);

    await pickFor("Cookies", "blue");
    line = colorsLine(wizardCard(p))!;
    expect(line.textContent).toBe("2 colors have been set manually:  .");
    expect(swatchesIn(line).map((s) => s.title)).toEqual(["Cakes: red", "Cookies: blue"]);
  });

  it("is worded the same on an existing poll's read-only face, and the sentence opens Step 4", async () => {
    await seed(makePoll({
      title: "Painted", pollState: "OPEN",
      choices: [{ id: "a", label: "Left", position: 0, color: "#F91010" }, { id: "b", label: "Right", position: 1 }]
    }));
    const p = await open();
    const card = cardWith(p, "Painted");
    const line = colorsLine(card)!;
    expect(line.textContent).toBe("1 color has been set manually: .");
    expect(line.previousElementSibling!.classList.contains("wizard-summary-choices")).toBe(true);
    link(card, "1 color has been set manually").click();
    await p.settle(50);
    expect(heading(wizardCard(p))).toBe("Step 4 · View");
  });
});

describe("colors follow their labels", () => {
  const colorButton = (p: BrowserPage, choice: string) =>
    wizardCard(p).querySelector<HTMLButtonElement>(`button[aria-label="Color for ${choice}"]`)!;
  const nameOf = (button: HTMLElement) => button.querySelector(".wizard-color-name")!.textContent;
  const labelsOnScreen = (p: BrowserPage) => Array.from(wizardCard(p).querySelectorAll(".wizard-color-label")).map((l) => l.textContent);

  async function colored(p: BrowserPage, lines: string, colors: Record<string, string>) {
    await createPoll(p);
    await next(p);
    await next(p);
    type(p, choicesBox(p), lines);
    blur(p, choicesBox(p));
    await next(p);
    for (const [choice, name] of Object.entries(colors)) {
      colorButton(p, choice).click();
      await p.settle();
      wizardCard(p).querySelector<HTMLButtonElement>(`.wizard-swatch[aria-label="${name}"]`)!.click();
      await p.settle();
    }
  }

  async function backToChoices(p: BrowserPage) {
    (circles(wizardCard(p))[2]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
  }

  async function onToColors(p: BrowserPage) {
    await next(p);
  }

  it("keeps each color with its label when the lines are reordered", async () => {
    const p = await open();
    await colored(p, "Cakes\nCookies\nPies", { Cakes: "red", Pies: "blue" });
    await backToChoices(p);
    type(p, choicesBox(p), "Pies\nCakes\nCookies");
    blur(p, choicesBox(p));
    await onToColors(p);
    expect(labelsOnScreen(p)).toEqual(["Pies", "Cakes", "Cookies"]);
    expect([nameOf(colorButton(p, "Pies")), nameOf(colorButton(p, "Cakes")), nameOf(colorButton(p, "Cookies"))]).toEqual(["blue", "red", "Automatic"]);
  });

  it("drops the color of a line that is renamed or removed", async () => {
    const p = await open();
    await colored(p, "Cakes\nCookies\nPies", { Cakes: "red", Cookies: "darkgreen", Pies: "blue" });
    await backToChoices(p);
    type(p, choicesBox(p), "Cake\nCookies");
    blur(p, choicesBox(p));
    await onToColors(p);
    expect([nameOf(colorButton(p, "Cake")), nameOf(colorButton(p, "Cookies"))]).toEqual(["Automatic", "darkgreen"]);
    footerButton(wizardCard(p), "Save").click();
    await p.settle(100);
    expect(sent("/save")[0]!.body).toMatchObject({ labels: ["Cake", "Cookies"], colors: [null, "#006120"] });
  });

  it("shows a stored color the palette no longer holds as an extra, selected swatch labelled with its hex", async () => {
    await seed(makePoll({
      title: "Old palette", pollState: "INITIALIZED",
      choices: [{ id: "o1", label: "Left", position: 0, color: "#123456" }, { id: "o2", label: "Right", position: 1 }]
    }));
    const p = await open();
    link(cardWith(p, "Old palette"), "Old palette").click();
    await p.settle(50);
    await next(p);
    await next(p);
    expect(nameOf(colorButton(p, "Left"))).toBe("#123456");
    colorButton(p, "Left").click();
    await p.settle();
    const swatches = Array.from(wizardCard(p).querySelectorAll<HTMLButtonElement>('.wizard-color-popover [role="radio"]'));
    expect(swatches).toHaveLength(20);
    const extra = swatches.find((s) => s.getAttribute("aria-label") === "#123456")!;
    expect(extra.getAttribute("aria-checked")).toBe("true");
    expect(swatches.filter((s) => s.getAttribute("aria-checked") === "true")).toEqual([extra]);
    colorButton(p, "Right").click();
    await p.settle();
    expect(wizardCard(p).querySelectorAll('.wizard-color-popover [role="radio"]')).toHaveLength(19);
  });

  it("keeps a stored color the palette no longer holds when the poll is saved", async () => {
    await seed(makePoll({
      title: "Old palette", pollState: "INITIALIZED",
      choices: [{ id: "o1", label: "Left", position: 0, color: "#123456" }, { id: "o2", label: "Right", position: 1 }]
    }));
    const p = await open();
    link(cardWith(p, "Old palette"), "Old palette").click();
    await p.settle(50);
    footerButton(wizardCard(p), "Save").click();
    await p.settle(100);
    expect(sent("/save")[0]!.body!.colors).toEqual(["#123456", null]);
  });

  it("shows seventeen swatches, and one more in the grid, when the palette gains a color", async () => {
    const p = await open();
    const config = (await request(ctx.app).get("/api/config")).body;
    (p.window as unknown as { AdminCard: { setRuntimeConfig: (c: unknown) => void } }).AdminCard.setRuntimeConfig({
      barPalette: [...config.barPalette, { name: "Lime", hex: "#B5E61D" }]
    });
    await colored(p, "Cakes\nCookies", {});
    colorButton(p, "Cakes").click();
    await p.settle();
    const swatches = Array.from(wizardCard(p).querySelectorAll<HTMLButtonElement>('.wizard-color-popover [role="radio"]'));
    expect(swatches.filter((s) => s.getAttribute("aria-label") !== "Automatic")).toHaveLength(19);
    expect(swatches[swatches.length - 1]!.getAttribute("aria-label")).toBe("Lime");
  });
});

describe("the read-only face", () => {
  it("shows the dates and counts panels, no pen and no voter settings", async () => {
    await seed(makePoll({ title: "Plain poll", pollState: "OPEN", launchedAt: undefined } as Partial<Poll>));
    const p = await open();
    const card = cardWith(p, "Plain poll");
    const dates = card.querySelector(".card-dates-panel")!;
    expect(Array.from(dates.querySelectorAll(".card-state-buttons button")).map((b) => b.textContent)).toEqual(["Open", "Close", "Archive"]);
    expect(Array.from(dates.querySelectorAll(".card-field-label")).map((l) => l.textContent)).toEqual(["Created", "Launched"]);
    expect(Array.from(card.querySelectorAll(".card-counts-panel .card-field-label")).map((l) => l.textContent)).toEqual([
      "Voter Count", "Banned Voter Count"
    ]);
    expect(card.querySelector(".card-pen")).toBeNull();
    expect(card.textContent).not.toContain("Voter Count Limit");
    expect(card.querySelector('[id^="voterCountLimit"], .admin-participant-list')).toBeNull();
  });

  it("shows Voter Count and, on a multiple-choice poll, the Vote Count of selections (TWEAK02)", async () => {
    await seed(makePoll({
      title: "Multi counts", pollState: "OPEN", choiceMode: "Multiple-Choice Poll",
      currentVotes: [
        { emailAddress: "a@example.com", userName: "A", choiceIds: ["c1", "c2"], votedAt: new Date() },
        { emailAddress: "b@example.com", userName: "B", choiceIds: ["c1"], votedAt: new Date() }
      ]
    }));
    const p = await open();
    const fields = Array.from(cardWith(p, "Multi counts").querySelectorAll(".card-counts-panel .card-field"))
      .map((f) => [f.querySelector(".card-field-label")!.textContent, f.querySelector(".card-field-value")!.textContent]);
    expect(fields).toEqual([["Voter Count", "2"], ["Vote Count", "3"], ["Banned Voter Count", "0"]]);
  });

  it("offers no voter settings in the wizard either", async () => {
    const p = await open();
    await createPoll(p);
    for (let i = 0; i <= 5; i++) {
      const card = wizardCard(p);
      expect(card.textContent).not.toMatch(/Voter Count Limit|Banned Voter List|Invited Voter/);
      expect(card.querySelector('[id^="voterCountLimit"], .admin-participant-list')).toBeNull();
      if (i < 5) await next(p);
    }
  });

  it("shows the notes in the summary after the subtitle, opening Step 2 when the notes can change", async () => {
    await seed(
      makePoll({ title: "With notes", subtitle: "Sub", notes: "**Bring** a plate", pollState: "OPEN" }),
      makePoll({ title: "Archived notes", notes: "Kept", pollState: "ARCHIVED" }),
      makePoll({ title: "No notes", pollState: "OPEN" })
    );
    const p = await open();
    const card = cardWith(p, "With notes");
    const line = card.querySelector<HTMLElement>(".card-readonly .wizard-summary .wizard-summary-notes")!;
    expect(line.previousElementSibling!.classList.contains("wizard-summary-subtitle")).toBe(true);
    expect(line.textContent).toBe("Notes: Bring a plate");
    expect(line.querySelector(".wizard-summary-notes-text")!.innerHTML).toBe("<strong>Bring</strong> a plate");
    const part = line.querySelector<HTMLElement>(".wizard-summary-link")!;
    expect(part.getAttribute("aria-label")).toBe("Notes: change in Step 2");
    expect(card.querySelector(".card-notes-preview")).toBeNull();

    const archived = cardWith(p, "Archived notes").querySelector(".wizard-summary-notes")!;
    expect(archived.querySelector(".wizard-summary-link")).toBeNull();
    expect(archived.textContent).toBe("Notes: Kept");
    expect(cardWith(p, "No notes").querySelector(".wizard-summary-notes")).toBeNull();

    part.click();
    await p.settle(50);
    expect(heading(wizardCard(p))).toBe("Step 2 · Title & Tags");
  });

  describe("the when-line", () => {
    const hour = 3_600_000;
    const whenOf = (p: BrowserPage, title: string) => cardWith(p, title).querySelector(".wizard-summary-when")!.textContent;

    it("words each state's dates by the state first", async () => {
      const future = new Date(Date.now() + 48 * hour);
      const past = new Date(Date.now() - 48 * hour);
      await seed(
        makePoll({ title: "Awaiting", pollState: "AWAITING APPROVAL", startAt: past }),
        makePoll({ title: "Waiting", pollState: "WAITING TO OPEN", startAt: future }),
        makePoll({ title: "Running", pollState: "OPEN" }),
        makePoll({ title: "Finished", pollState: "CLOSED", endAt: past }),
        makePoll({ title: "Archived", pollState: "ARCHIVED", endAt: past }),
        makePoll({ title: "Being edited", pollState: "EDITING", pollStateBeforeEditUpdate: "OPEN", pollEditUpdateClientGUID: "other-tab" })
      );
      const p = await open();
      expect(whenOf(p, "Awaiting")).toBe("Voting opens as soon as your poll is approved and stays open until you close it.");
      expect(whenOf(p, "Waiting")).toMatch(/^Voting opens on .+ at .+ and stays open until you close it\.$/);
      expect(whenOf(p, "Running")).toBe("Voting is open now and stays open until you close it.");
      expect(whenOf(p, "Finished")).toMatch(/^Voting opened when your poll was published and closed on .+ at .+\.$/);
      expect(whenOf(p, "Archived")).toMatch(/^Voting opened when your poll was published and closed on .+ at .+\.$/);
      expect(whenOf(p, "Being edited")).toBe("Voting is open now and stays open until you close it.");
    });

    it("words an unpublished poll's plans in the wizard", async () => {
      const p = await open();
      await createPoll(p);
      for (let i = 0; i < 5; i++) await next(p);
      await pick(p, "ends", "none");
      expect(wizardCard(p).querySelector(".wizard-summary-when")!.textContent).toBe(
        "Voting opens as soon as your poll is published and stays open until you close it."
      );
    });
  });
});

describe("an existing poll in the wizard", () => {
  async function voted(poll: Poll) {
    await seed(poll);
    await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "v@example.com", userName: "v", choiceIds: ["c1"], votedAt: new Date() });
    return poll;
  }
  const linkTexts = (card: HTMLElement) => links(card).map((l) => l.textContent);

  it("links only what the poll's state lets change", async () => {
    const future = new Date(Date.now() + 48 * 3_600_000);
    await seed(
      makePoll({ title: "Awaiting", pollState: "AWAITING APPROVAL" }),
      makePoll({ title: "Archived", pollState: "ARCHIVED" }),
      makePoll({ title: "Locked", pollState: "EDITING", pollStateBeforeEditUpdate: "OPEN", pollEditUpdateClientGUID: "other-tab" }),
      makePoll({ title: "Scheduled", subtitle: "Sub", pollState: "WAITING TO OPEN", startAt: future })
    );
    await voted(makePoll({ title: "Running", subtitle: "Sub", pollState: "OPEN" }));
    await voted(makePoll({ title: "Finished", subtitle: "Sub", pollState: "CLOSED", endAt: new Date(Date.now() - 3_600_000) }));
    const p = await open();
    for (const title of ["Awaiting", "Archived", "Locked"]) expect(linkTexts(cardWith(p, title)), title).toEqual([]);
    const scheduled = linkTexts(cardWith(p, "Scheduled"));
    expect(scheduled.slice(0, 3)).toEqual(["Scheduled", "Sub", "Public Poll"]);
    expect(scheduled).toContain("Choice 1, Choice 2");
    expect(scheduled).toContain("one choice");
    expect(scheduled).toContain("stays open until you close it");
    expect(scheduled.some((t) => t!.startsWith("on "))).toBe(true);
    // EDITING-POLL-AVAILABLE C1/C4: on an ever-voted poll the choices (the merge),
    // the one-way choice mode and the vote mutability stay changeable, so their
    // parts link in UPDATE too.
    expect(linkTexts(cardWith(p, "Running"))).toEqual(["Running", "Sub", "Choice 1, Choice 2", "Bar colors are assigned automatically.", "one choice", "their vote is final", "stays open until you close it"]);
    expect(linkTexts(cardWith(p, "Finished"))).toEqual(["Finished", "Sub", "Choice 1, Choice 2", "Bar colors are assigned automatically.", "one choice", "their vote is final"]);
  });

  it("opens at the tapped step with every step visited, locks what cannot change and says saving re-screens only for a reviewed change", async () => {
    await voted(makePoll({ title: "Running", subtitle: "Sub", pollState: "OPEN" }));
    const p = await open();
    link(cardWith(p, "Running"), "Running").click();
    await p.settle(50);
    let card = wizardCard(p);
    expect(heading(card)).toBe("Step 2 · Title & Tags");
    expect(circles(card).map((s) => s.className.replace("wizard-step ", ""))).toEqual([
      "is-visited", "is-current", "is-visited", "is-visited", "is-visited", "is-visited"
    ]);
    // EDITING-POLL-AVAILABLE C5: on an ever-voted poll only a title, subtitle or
    // choice change goes to review, so the note waits for one.
    expect(card.querySelector(".wizard-review-note")).toBeNull();
    type(p, titleField(p), "Running renamed");
    expect(wizardCard(p).querySelector(".wizard-review-note")!.textContent).toBe("Saving sends your poll to be reviewed again.");
    type(p, titleField(p), "Running");
    expect(wizardCard(p).querySelector(".wizard-review-note")).toBeNull();
    card = wizardCard(p);
    expect(Array.from(card.querySelectorAll(".wizard-footer button")).map((b) => b.textContent)).toEqual(["Cancel", "Save changes"]);
    (circles(card)[0]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
    card = wizardCard(p);
    expect(card.querySelector(".wizard-locked")).not.toBeNull();
    expect(Array.from(card.querySelectorAll<HTMLInputElement>('input[name^="who-"]')).every((r) => r.disabled)).toBe(true);
  });

  it("enables Save changes only after an edit, and sends just what changed", async () => {
    // The starter choices, on purpose: a published poll is sent for review whatever its choices.
    await voted(makePoll({ title: "Running", subtitle: "Sub", pollState: "OPEN" }));
    const p = await open();
    link(cardWith(p, "Running"), "Sub").click();
    await p.settle(50);
    let save = footerButton(wizardCard(p), "Save changes");
    expect(save.getAttribute("aria-disabled")).toBe("true");
    expect(save.title).toBe("Change something to save.");
    const subtitle = wizardCard(p).querySelector<HTMLInputElement>('[id^="pollSubtitle-"]')!;
    type(p, subtitle, "New sub");
    save = footerButton(wizardCard(p), "Save changes");
    expect(save.hasAttribute("aria-disabled")).toBe(false);
    save.click();
    await p.settle(100);
    const body = sent("/publish")[0]!.body!;
    expect(Object.keys(body).sort()).toEqual(["clientGuid", "subtitle", "timeZone"]);
    expect(body.subtitle).toBe("New sub");
    // EDITING-POLL-AVAILABLE C6/C8: the save of an ever-voted poll never pauses it —
    // the poll stays OPEN while the changes wait for review, and the editor is
    // withheld until the review resolves.
    const card = cardWith(p, "Running");
    expect(card.querySelector(".card-state-value")!.textContent).toBe("OPEN");
    expect(card.querySelector(".card-state-detail")!.textContent).toBe("changes pending review");
    expect(links(card)).toEqual([]);
  });

  it("caps the subtitle at 40 characters and the title at 60, on an existing poll as on a new one", async () => {
    await seed(makePoll({ title: "Existing", subtitle: "Sub", pollState: "OPEN" }));
    const p = await open();
    link(cardWith(p, "Existing"), "Existing").click();
    await p.settle(50);
    const subtitle = wizardCard(p).querySelector<HTMLTextAreaElement>('[id^="pollSubtitle-"]')!;
    expect(subtitle.maxLength).toBe(40);
    expect(titleField(p).maxLength).toBe(60);
  });

  it("lets only one card be edited at a time", async () => {
    await seed(makePoll({ title: "First", pollState: "OPEN" }), makePoll({ title: "Second", pollState: "OPEN" }));
    const p = await open();
    link(cardWith(p, "First"), "First").click();
    await p.settle(50);
    expect(links(cardWith(p, "Second"))).toEqual([]);
  });

  it("returns focus to the card's first link after Cancel and after Save", async () => {
    await seed(makePoll({ title: "Focus me", pollState: "OPEN" }));
    const p = await open();
    link(cardWith(p, "Focus me"), "Focus me").click();
    await p.settle(50);
    footerButton(wizardCard(p), "Cancel").click();
    await p.settle(100);
    expect(p.document.activeElement).toBe(links(cardWith(p, "Focus me"))[0]);

    // Save on a poll that has not been published keeps it editable, so it keeps its links.
    // (Save changes sends a published poll for review, after which it has no link to focus.)
    await seed(makePoll({ title: "Draft focus", pollState: "INITIALIZED" }));
    const fresh = await open();
    link(cardWith(fresh, "Draft focus"), "Draft focus").click();
    await fresh.settle(50);
    type(fresh, titleField(fresh), "Draft focused");
    footerButton(wizardCard(fresh), "Save").click();
    await fresh.settle(100);
    expect(fresh.document.activeElement).toBe(links(cardWith(fresh, "Draft focused"))[0]);
  });

  it("returns focus to the card's first link when the session is lost", async () => {
    const poll = makePoll({ title: "Lost", pollState: "OPEN" });
    await seed(poll);
    const p = await open();
    link(cardWith(p, "Lost"), "Lost").click();
    await p.settle(50);
    await ctx.db.updateTable("polls").set({ poll_edit_update_client_guid: "someone-else" }).where("id", "=", poll._id).execute();
    await p.settle(10_500);
    expect(p.document.querySelector(".poll-admin-card--new")).toBeNull();
    expect(p.document.activeElement).toBe(links(cardWith(p, "Lost"))[0]);
  }, 20_000);
});

describe("notes in Step 2", () => {
  const notesHost = (p: BrowserPage) => wizardCard(p).querySelector<HTMLElement>(".wizard-notes")!;
  const editButton = (p: BrowserPage) => notesHost(p).querySelector<HTMLButtonElement>(".wizard-notes-edit")!;
  const previewHtml = (p: BrowserPage) => notesHost(p).querySelector(".wizard-notes-text")!.innerHTML;

  async function openAtStep2(title: string, notes: string, pollState: Poll["pollState"] = "INITIALIZED") {
    await seed(makePoll({ title, subtitle: "Sub", notes, pollState }));
    const p = await open();
    link(cardWith(p, title), title).click();
    await p.settle(50);
    return p;
  }

  async function editNotes(p: BrowserPage, html: string) {
    editButton(p).click();
    await p.settle();
    const text = notesHost(p).querySelector<HTMLElement>(".notes-editor-text")!;
    text.innerHTML = html;
    text.dispatchEvent(new p.window.Event("input", { bubbles: true }));
    await p.settle();
  }

  async function editorButton(p: BrowserPage, name: string) {
    notesHost(p).querySelector<HTMLElement>(`.notes-editor-${name}`)!.click();
    await p.settle();
  }

  it("shows Notes after Subtitle, with the preview, \"... edit\" and its chevron, and the counter", async () => {
    const p = await openAtStep2("Picnic", "**Bring** a <plate>");
    const labels = Array.from(wizardCard(p).querySelectorAll(".wizard-fields .m3-field-label")).map((l) => l.textContent);
    expect(labels.slice(0, 3)).toEqual(["Title", "Subtitle", "Notes"]);
    expect(previewHtml(p)).toBe("<strong>Bring</strong> a &lt;plate&gt;");
    expect(editButton(p).textContent).toBe("... edit");
    expect(editButton(p).querySelector("svg.wizard-notes-edit-chevron path")!.getAttribute("d")).toBe("m6 9 6 6 6-6");
    const notesField = notesHost(p).closest(".m3-field")!;
    expect(notesField.querySelector(".m3-field-support")!.textContent).toBe("Optional. Shown under the title on the poll card.");
    expect(notesField.querySelector(".m3-field-counter")!.textContent).toBe("19 / 6000");
  });

  it("puts the notes into the preview and the summary on Done, returns the focus to \"... edit\", and Save sends them", async () => {
    const p = await openAtStep2("Picnic", "");
    await editNotes(p, "<b>Bring</b> two <i>plates</i>");
    expect(notesHost(p).querySelector(".wizard-notes-preview")).toBeNull();
    await editorButton(p, "done");
    expect(previewHtml(p)).toBe("<strong>Bring</strong> two <em>plates</em>");
    expect(p.document.activeElement).toBe(editButton(p));
    const summaryNotes = wizardCard(p).querySelector(".wizard-summary .wizard-summary-notes")!;
    expect(summaryNotes.textContent).toBe("Notes: Bring two plates");
    expect(summaryNotes.querySelector(".wizard-summary-notes-text")!.innerHTML).toBe("<strong>Bring</strong> two <em>plates</em>");
    footerButton(wizardCard(p), "Save").click();
    await p.settle(100);
    expect(sent("/save")[0]!.body!.notes).toBe("**Bring** two *plates*");
  });

  it("keeps an open editor's changes on Next and on a numbered step", async () => {
    const p = await openAtStep2("Picnic", "");
    await editNotes(p, "kept by next");
    await next(p);
    expect(heading(wizardCard(p))).toBe("Step 3 · Choices");
    (circles(wizardCard(p))[1]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
    expect(previewHtml(p)).toBe("kept by next");

    await editNotes(p, "kept by a step");
    (circles(wizardCard(p))[0]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
    expect(heading(wizardCard(p))).toBe("Step 1 · Who can vote");
    footerButton(wizardCard(p), "Save").click();
    await p.settle(100);
    expect(sent("/save")[0]!.body!.notes).toBe("kept by a step");
  });

  it("drops an open editor's changes with the card's Cancel, after asking", async () => {
    const poll = makePoll({ title: "Picnic", notes: "Original", pollState: "INITIALIZED" });
    await seed(poll);
    const p = await open();
    link(cardWith(p, "Picnic"), "Picnic").click();
    await p.settle(50);
    await editNotes(p, "Changed");
    footerButton(wizardCard(p), "Cancel").click();
    await p.settle();
    (p.document.querySelector(".modal .modal-discard") as HTMLButtonElement).click();
    await p.settle(100);
    expect(p.document.querySelector(".poll-admin-card--new")).toBeNull();
    expect(sent("/save")).toHaveLength(0);
    expect((await polls(ctx).findOne({ _id: poll._id }))!.notes).toBe("Original");
  });

  it("asks before the editor's own Cancel drops a change, and keeps Escape from the card", async () => {
    const p = await openAtStep2("Picnic", "Original");
    await editNotes(p, "Changed");
    const text = notesHost(p).querySelector<HTMLElement>(".notes-editor-text")!;
    text.dispatchEvent(new p.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await p.settle();
    (p.document.querySelector(".modal .modal-discard") as HTMLButtonElement).click();
    await p.settle();
    expect(previewHtml(p)).toBe("Original");
    expect(wizardCard(p)).not.toBeNull();
  });

  it("refuses Done, Next and Save above 6000 characters", async () => {
    const p = await openAtStep2("Picnic", "");
    await editNotes(p, "x".repeat(6001));
    await editorButton(p, "done");
    expect(notesHost(p).querySelector(".notes-editor")).not.toBeNull();
    await next(p);
    expect(heading(wizardCard(p))).toBe("Step 2 · Title & Tags");
    footerButton(wizardCard(p), "Save").click();
    await p.settle(100);
    expect(sent("/save")).toHaveLength(0);
  });

  it("sends only the changed notes from an existing poll, and says saving re-screens", async () => {
    const p = await openAtStep2("Running", "Before", "OPEN");
    expect(footerButton(wizardCard(p), "Save changes").getAttribute("aria-disabled")).toBe("true");
    await editNotes(p, "After");
    expect(footerButton(wizardCard(p), "Save changes").hasAttribute("aria-disabled")).toBe(false);
    await editorButton(p, "done");
    expect(wizardCard(p).querySelector(".wizard-review-note")).not.toBeNull();
    footerButton(wizardCard(p), "Save changes").click();
    await p.settle(100);
    const body = sent("/publish")[0]!.body!;
    expect(Object.keys(body).sort()).toEqual(["clientGuid", "notes", "timeZone"]);
    expect(body.notes).toBe("After");
  });
});

describe("choice edits inside the wizard (EDITING-POLL-AVAILABLE US2)", () => {
  const when = new Date();
  /** An OPEN poll with two c1 voters and one c2 voter, so the grant's counts are { c1: 2, c2: 1 }. */
  async function votedPoll(overrides: Partial<Poll> = {}) {
    const poll = makePoll({
      title: "Snacks",
      pollState: "OPEN",
      currentVotes: [
        { emailAddress: "v1@example.com", userName: "v1", choiceIds: ["c1"], votedAt: when },
        { emailAddress: "v2@example.com", userName: "v2", choiceIds: ["c1"], votedAt: when },
        { emailAddress: "v3@example.com", userName: "v3", choiceIds: ["c2"], votedAt: when }
      ],
      ...overrides
    });
    await seed(poll);
    await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "v1@example.com", userName: "v1", choiceIds: ["c1"], votedAt: when });
    return poll;
  }

  async function openAtChoices(p: BrowserPage) {
    link(cardWith(p, "Snacks"), "Choice 1, Choice 2").click();
    await p.settle(50);
    return wizardCard(p);
  }

  const dialog = (p: BrowserPage) => p.document.querySelector<HTMLElement>('.modal[role="alertdialog"]');
  const dialogButton = (p: BrowserPage, text: string) =>
    Array.from(dialog(p)!.querySelectorAll<HTMLButtonElement>(".modal-action")).find((b) => b.textContent === text)!;

  it("keeps today's Choices editor enabled on a voted OPEN poll (C1)", async () => {
    await votedPoll();
    const p = await open();
    const card = await openAtChoices(p);
    expect(heading(card)).toBe("Step 3 · Choices");
    const box = choicesBox(p);
    expect(box.disabled).toBe(false);
    expect(box.value).toBe("Choice 1\nChoice 2");
    const paste = Array.from(card.querySelectorAll<HTMLButtonElement>(".wizard-paste .m3-tonal-btn"))
      .find((b) => b.textContent === "Paste choices")!;
    expect(paste.disabled).toBe(false);
    expect(card.querySelector(".wizard-locked")).toBeNull();
  });

  it("leaving the step with a voted deletion opens the dialog, and Cancel restores the session-entry text (C2, C3)", async () => {
    await votedPoll();
    const p = await open();
    await openAtChoices(p);
    type(p, choicesBox(p), "Choice 2\nChoice 3");
    blur(p, choicesBox(p));
    await next(p);
    const box = dialog(p)!;
    expect(box).not.toBeNull();
    expect(box.getAttribute("aria-modal")).toBe("true");
    expect(box.querySelector(".modal-headline")!.textContent).toBe("Delete choices with votes?");
    expect(box.querySelector(".modal-text")!.textContent).toBe("Choice 1 — 2 vote(s)");
    dialogButton(p, "Cancel").click();
    await p.settle(50);
    expect(dialog(p)).toBeNull();
    expect(heading(wizardCard(p))).toBe("Step 3 · Choices");
    expect(choicesBox(p).value).toBe("Choice 1\nChoice 2");
    expect(sent("/publish")).toEqual([]);
  });

  it("Delete proceeds, and the confirmed set does not prompt again (C2)", async () => {
    await votedPoll();
    const p = await open();
    await openAtChoices(p);
    type(p, choicesBox(p), "Choice 2\nChoice 3");
    blur(p, choicesBox(p));
    await next(p);
    dialogButton(p, "Delete").click();
    await p.settle(50);
    expect(heading(wizardCard(p))).toBe("Step 4 · View");
    (circles(wizardCard(p))[2]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle(50);
    expect(heading(wizardCard(p))).toBe("Step 3 · Choices");
    await next(p);
    expect(dialog(p)).toBeNull();
    expect(heading(wizardCard(p))).toBe("Step 4 · View");
  });

  it("a zero-vote deletion never prompts (C2)", async () => {
    await votedPoll({
      currentVotes: [{ emailAddress: "v1@example.com", userName: "v1", choiceIds: ["c1"], votedAt: when }]
    });
    const p = await open();
    await openAtChoices(p);
    type(p, choicesBox(p), "Choice 1\nChoice 3");
    blur(p, choicesBox(p));
    await next(p);
    expect(dialog(p)).toBeNull();
    expect(heading(wizardCard(p))).toBe("Step 4 · View");
  });

  it("a rename shows as a deletion of the old label (C2)", async () => {
    await votedPoll();
    const p = await open();
    await openAtChoices(p);
    type(p, choicesBox(p), "Choice 1 renamed\nChoice 2");
    blur(p, choicesBox(p));
    await next(p);
    const box = dialog(p)!;
    expect(box).not.toBeNull();
    expect(box.querySelector(".modal-text")!.textContent).toBe("Choice 1 — 2 vote(s)");
    dialogButton(p, "Cancel").click();
    await p.settle(50);
    expect(choicesBox(p).value).toBe("Choice 1\nChoice 2");
  });

  it("Save changes gates on the dialog too, and its payload carries labels with aligned colors (C2, C8)", async () => {
    await votedPoll();
    const p = await open();
    await openAtChoices(p);
    type(p, choicesBox(p), "Choice 2\nChoice 3");
    blur(p, choicesBox(p));
    footerButton(wizardCard(p), "Save changes").click();
    await p.settle(50);
    expect(dialog(p)).not.toBeNull();
    expect(sent("/publish")).toEqual([]);
    dialogButton(p, "Delete").click();
    await p.settle(200);
    const body = sent("/publish")[0]!.body!;
    expect(Object.keys(body).sort()).toEqual(["baseChoiceIds", "clientGuid", "colors", "labels", "timeZone"]);
    expect(body.baseChoiceIds).toHaveLength(2);
    expect(body.labels).toEqual(["Choice 2", "Choice 3"]);
    expect(body.colors).toEqual([null, null]);
  });
});

describe("sharing mode on a voted Private poll (EDITING-POLL-AVAILABLE US3)", () => {
  async function votedPrivate(overrides: Partial<Poll> = {}) {
    const poll = makePoll({
      title: "Team outing",
      pollState: "OPEN",
      pollVisibility: "Private Poll",
      pollSharingMode: "Anyone With The Link",
      ...overrides
    });
    await seed(poll);
    await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "v@example.com", userName: "v", choiceIds: ["c1"], votedAt: new Date() });
    return poll;
  }

  const whoRadio = (p: BrowserPage, value: string) =>
    wizardCard(p).querySelector<HTMLInputElement>(`input[name^="who-"][value="${value}"]`)!;

  it("enables the two private options, keeps public and the anonymity switch locked, and sends the change (C4, C8)", async () => {
    await votedPrivate();
    const p = await open();
    link(cardWith(p, "Team outing"), "Team outing").click();
    await p.settle(50);
    (circles(wizardCard(p))[0]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
    expect(heading(wizardCard(p))).toBe("Step 1 · Who can vote");
    expect(whoRadio(p, "link").disabled).toBe(false);
    expect(whoRadio(p, "invite").disabled).toBe(false);
    expect(whoRadio(p, "public").disabled).toBe(true);
    expect(wizardCard(p).querySelector<HTMLInputElement>(".m3-switch")!.disabled).toBe(true);
    expect(wizardCard(p).querySelector(".wizard-locked")).not.toBeNull();

    await pick(p, "who", "invite");
    footerButton(wizardCard(p), "Save changes").click();
    await p.settle(200);
    const body = sent("/publish")[0]!.body!;
    expect(Object.keys(body).sort()).toEqual(["clientGuid", "pollSharingMode", "timeZone"]);
    expect(body.pollSharingMode).toBe("Invitation Only");
  });

  it("keeps every Step 1 control locked on a voted public poll", async () => {
    await votedPrivate({ title: "Town hall", pollVisibility: "Public Poll", pollSharingMode: "Anyone With The Link" });
    const p = await open();
    link(cardWith(p, "Town hall"), "Town hall").click();
    await p.settle(50);
    (circles(wizardCard(p))[0]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
    for (const value of ["link", "invite", "public"]) expect(whoRadio(p, value).disabled, value).toBe(true);
  });
});

describe("Step 5 on a voted poll (EDITING-POLL-AVAILABLE US4/US5)", () => {
  const stepRadio = (p: BrowserPage, name: string, value: string) =>
    wizardCard(p).querySelector<HTMLInputElement>(`input[name^="${name}-"][value="${value}"]`)!;

  async function openAtHow(p: BrowserPage, title: string) {
    link(cardWith(p, title), title).click();
    await p.settle(50);
    (circles(wizardCard(p))[4]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
  }

  it("enables both count options on a voted Single-Choice poll and sends the widening (C4, C8)", async () => {
    const poll = makePoll({ title: "Pick one", pollState: "OPEN" });
    await seed(poll);
    await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "v@example.com", userName: "v", choiceIds: ["c1"], votedAt: new Date() });
    const p = await open();
    await openAtHow(p, "Pick one");
    expect(stepRadio(p, "howmany", "one").disabled).toBe(false);
    expect(stepRadio(p, "howmany", "multi").disabled).toBe(false);

    await pick(p, "howmany", "multi");
    footerButton(wizardCard(p), "Save changes").click();
    await p.settle(200);
    const body = sent("/publish")[0]!.body!;
    expect(Object.keys(body).sort()).toEqual(["choiceMode", "clientGuid", "timeZone"]);
    expect(body.choiceMode).toBe("Multiple-Choice Poll");
  });

  it("keeps only the single-choice option locked on a voted Multiple-Choice poll", async () => {
    const poll = makePoll({ title: "Pick several", pollState: "OPEN", choiceMode: "Multiple-Choice Poll" });
    await seed(poll);
    await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "v@example.com", userName: "v", choiceIds: ["c1"], votedAt: new Date() });
    const p = await open();
    await openAtHow(p, "Pick several");
    expect(stepRadio(p, "howmany", "one").disabled).toBe(true);
    expect(stepRadio(p, "howmany", "multi").disabled).toBe(false);
    expect(wizardCard(p).querySelector(".wizard-locked")).not.toBeNull();
  });

  it("unlocks the mutability radios on a voted poll and sends the switch (C4, C8)", async () => {
    const poll = makePoll({ title: "First vote final", pollState: "OPEN" });
    await seed(poll);
    await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "v@example.com", userName: "v", choiceIds: ["c1"], votedAt: new Date() });
    const p = await open();
    await openAtHow(p, "First vote final");
    expect(stepRadio(p, "mutable", "change").disabled).toBe(false);
    expect(stepRadio(p, "mutable", "final").disabled).toBe(false);

    await pick(p, "mutable", "change");
    footerButton(wizardCard(p), "Save changes").click();
    await p.settle(200);
    const body = sent("/publish")[0]!.body!;
    expect(Object.keys(body).sort()).toEqual(["clientGuid", "timeZone", "voteMutability"]);
    expect(body.voteMutability).toBe("Dynamic-Vote Poll");
  });
});

describe("pending review on the card (EDITING-POLL-AVAILABLE US1)", () => {
  async function voted(poll: Poll) {
    await seed(poll);
    await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "v@example.com", userName: "v", choiceIds: ["c1"], votedAt: new Date() });
    return poll;
  }

  it("shows the pending status and withholds the editor links", async () => {
    await voted(makePoll({ title: "Pending poll", pollState: "OPEN", pendingUpdate: { title: "Renamed" } }));
    const p = await open();
    const card = cardWith(p, "Pending poll");
    expect(card.querySelector(".card-state-value")!.textContent).toBe("OPEN");
    expect(card.querySelector(".card-state-detail")!.textContent).toBe("changes pending review");
    expect(links(card)).toEqual([]);
  });

  it("shows the rejection reason without changing the poll's own state", async () => {
    await voted(makePoll({
      title: "Rejected changes", subtitle: "Sub", pollState: "OPEN",
      pendingRejectionReason: "contains unacceptable language"
    }));
    const p = await open();
    const card = cardWith(p, "Rejected changes");
    expect(card.querySelector(".card-state-value")!.textContent).toBe("OPEN");
    expect(card.querySelector(".card-state-detail")!.textContent).toBe("changes rejected: contains unacceptable language");
    // A rejected update leaves the poll editable, so a corrected save can follow.
    expect(links(card).length).toBeGreaterThan(0);
  });

  it("surfaces the server's refusal when the editor is opened on a freshly pending poll", async () => {
    const poll = await voted(makePoll({ title: "Stale row", subtitle: "Sub", pollState: "OPEN" }));
    const p = await open();
    // The review began after the page loaded, so this row still offers its links.
    await ctx.db.updateTable("polls")
      .set({ pending_update: JSON.stringify({ title: "Renamed" }) })
      .where("id", "=", poll._id).execute();
    link(cardWith(p, "Stale row"), "Stale row").click();
    await p.settle(50);
    expect(p.document.querySelector(".poll-admin-card--new")).toBeNull();
    expect(cardWith(p, "Stale row").querySelector(".card-status-line")!.textContent)
      .toBe("Changes are being reviewed. Try again shortly.");
  });

  it("keeps the blanket review note on a never-voted existing poll", async () => {
    await seed(makePoll({ title: "Unvoted", subtitle: "Sub", pollState: "OPEN" }));
    const p = await open();
    link(cardWith(p, "Unvoted"), "Unvoted").click();
    await p.settle(50);
    expect(wizardCard(p).querySelector(".wizard-review-note")!.textContent)
      .toBe("Saving sends your poll to be reviewed again.");
  });
});

describe("the line graph switch on the View step", () => {
  const CHOICES = [{ id: "c1", label: "Left", position: 0 }, { id: "c2", label: "Right", position: 1 }];
  const LINE_GRAPH_LABEL = "Show the line graph";

  const lineGraphSwitch = (p: BrowserPage) =>
    Array.from(wizardCard(p).querySelectorAll<HTMLElement>(".m3-switch-row")).find((row) =>
      (row.textContent ?? "").includes(LINE_GRAPH_LABEL)) ?? null;
  const lineGraphInput = (p: BrowserPage) => lineGraphSwitch(p)!.querySelector<HTMLInputElement>("input")!;
  const summaryColors = (p: BrowserPage) => wizardCard(p).querySelector(".wizard-summary-colors")?.textContent ?? "";

  async function seedPoll(title: string, overrides: Partial<Poll> = {}, owner?: string, votes = false) {
    const poll = makePoll({ title, subtitle: "Sub", pollState: "OPEN", choices: CHOICES, ...overrides });
    await seed(poll);
    if (owner) await ctx.db.updateTable("polls").set({ created_by_id: owner }).where("id", "=", poll._id).execute();
    if (votes) {
      await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "v@example.com", userName: "v", choiceIds: ["c1"], votedAt: new Date() });
    }
    return poll;
  }

  async function openViewStep(p: BrowserPage, title: string) {
    link(cardWith(p, title), title).click();
    await p.settle(50);
    (circles(wizardCard(p))[3]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
  }

  it("an Administrator's View step shows the switch first, unchecked when the graph is off", async () => {
    await seedPoll("Graph off");
    const p = await open();
    await openViewStep(p, "Graph off");
    expect(heading(wizardCard(p))).toBe("Step 4 · View");
    expect(lineGraphSwitch(p)).not.toBeNull();
    expect(wizardCard(p).querySelector(".wizard-colors")!.firstElementChild).toBe(lineGraphSwitch(p));
    expect(lineGraphInput(p).checked).toBe(false);
  });

  it("shows the stored value: checked when the graph is on", async () => {
    await seedPoll("Graph on", { lineGraphEnabled: true });
    const p = await open();
    await openViewStep(p, "Graph on");
    expect(lineGraphInput(p).checked).toBe(true);
  });

  it("sends the setting alone to the colors route on a poll with votes, and the poll stays open", async () => {
    const poll = await seedPoll("Voted graph", {}, undefined, true);
    const p = await open();
    await openViewStep(p, "Voted graph");
    lineGraphInput(p).checked = true;
    lineGraphInput(p).dispatchEvent(new p.window.Event("change", { bubbles: true }));
    await p.settle();

    footerButton(wizardCard(p), "Save changes").click();
    await p.settle(100);
    const posts = sent("/colors");
    expect(posts).toHaveLength(1);
    expect(Object.keys(posts[0]!.body!).sort()).toEqual(["clientGuid", "lineGraphEnabled", "timeZone"]);
    expect(posts[0]!.body!.lineGraphEnabled).toBe(true);
    expect(sent("/publish")).toHaveLength(0);
    const stored = (await polls(ctx).findOne({ _id: poll._id }))!;
    expect(stored.lineGraphEnabled).toBe(true);
    expect(stored.pollState).toBe("OPEN");
  });

  it("an Administrator's Save on a new poll carries the setting; the switch is on the View step", async () => {
    const p = await open();
    await createPoll(p);
    await answerFirstSteps(p, "Switch save");
    lineGraphInput(p).checked = true;
    lineGraphInput(p).dispatchEvent(new p.window.Event("change", { bubbles: true }));
    await p.settle();
    footerButton(wizardCard(p), "Save").click();
    await p.settle(100);
    expect(sent("/save")[0]!.body).toMatchObject({ lineGraphEnabled: true });
  });

  it("an Administrator's switch with no choices sits first, and the note replaces the color pickers", async () => {
    await seedPoll("No choices", { choices: [] });
    const p = await open();
    await openViewStep(p, "No choices");
    expect(lineGraphSwitch(p)).not.toBeNull();
    expect(wizardCard(p).querySelector(".wizard-colors")!.firstElementChild).toBe(lineGraphSwitch(p));
    expect(wizardCard(p).querySelector(".wizard-colors-empty")!.textContent)
      .toBe("Add your choices first, then come back to choose their colors.");
    expect(wizardCard(p).querySelector('button[aria-label^="Color for"]')).toBeNull();
  });

  it("a creator's View step shows no switch and still shows the color pickers", async () => {
    await seedPoll("Creator's poll", {}, creatorId);
    const p = await open(creatorCookie);
    await openViewStep(p, "Creator's poll");
    expect(heading(wizardCard(p))).toBe("Step 4 · View");
    expect(lineGraphSwitch(p)).toBeNull();
    expect(wizardCard(p).querySelector('button[aria-label="Color for Left"]')).not.toBeNull();
  });

  it("a creator's Save never carries the setting", async () => {
    await seedPoll("Creator saves", { lineGraphEnabled: true }, creatorId);
    const p = await open(creatorCookie);
    await openViewStep(p, "Creator saves");
    expect(lineGraphSwitch(p)).toBeNull();
    const colorButton = wizardCard(p).querySelector<HTMLButtonElement>('button[aria-label="Color for Left"]')!;
    colorButton.click();
    await p.settle();
    wizardCard(p).querySelector<HTMLButtonElement>(`.wizard-swatch[aria-label="red"]`)!.click();
    await p.settle();
    footerButton(wizardCard(p), "Save changes").click();
    await p.settle(100);
    const posts = bodies.filter((b) => b.method === "POST");
    expect(posts.length).toBeGreaterThan(0);
    for (const post of posts) expect(post.body && "lineGraphEnabled" in post.body).toBe(false);
  });

  it("the Settings Summary's View line says the graph is shown when it is on, for a creator", async () => {
    await seedPoll("Shown", { lineGraphEnabled: true }, creatorId);
    const shown = await open(creatorCookie);
    await openViewStep(shown, "Shown");
    expect(summaryColors(shown)).toContain("The line graph is shown.");

    await seedPoll("Hidden", { lineGraphEnabled: false }, creatorId);
    const hidden = await open(creatorCookie);
    await openViewStep(hidden, "Hidden");
    expect(summaryColors(hidden)).not.toMatch(/graph/i);
  });
});

describe("the editing banner on an existing poll's wizard (TWEAK01)", () => {
  it("shows Poll State Is: EDITING while the wizard is open, and clears it on Cancel", async () => {
    await seed(makePoll({ title: "Banner poll", subtitle: "Sub", pollState: "OPEN" }));
    const p = await open();
    link(cardWith(p, "Banner poll"), "Banner poll").click();
    await p.settle(50);
    const status = wizardCard(p).querySelector<HTMLElement>(".card-status-line")!;
    expect(status.hidden).toBe(false);
    expect(status.textContent).toBe("Your poll is being edited in this tab. Poll State Is: EDITING.");

    footerButton(wizardCard(p), "Cancel").click();
    await p.settle(100);
    expect(p.document.querySelector(".poll-admin-card--new")).toBeNull();
    expect(cardWith(p, "Banner poll").querySelector<HTMLElement>(".card-status-line")!.hidden).toBe(true);
  });

  it("shows no banner on a new poll's wizard", async () => {
    const p = await open();
    await createPoll(p);
    expect(wizardCard(p).querySelector<HTMLElement>(".card-status-line")!.hidden).toBe(true);
  });
});

describe("voters may add choices (USER-ADD-CHOICES C5)", () => {
  const addSwitch = (p: BrowserPage) => wizardCard(p).querySelector<HTMLInputElement>(".m3-switch--add-choices");
  const summaryAdd = (card: HTMLElement) => card.querySelector(".wizard-summary-add-choices")?.textContent ?? null;

  async function votedPrivate(overrides: Partial<Poll> = {}) {
    const poll = makePoll({ title: "Picnic", pollState: "OPEN", pollVisibility: "Private Poll", ...overrides });
    await seed(poll);
    await voteHistory(ctx).insertOne({ pid: poll._id, emailAddress: "v@example.com", userName: "v", choiceIds: ["c1"], votedAt: new Date() });
    return poll;
  }

  it("offers the switch in Step 5 of a private poll only, off for a new poll, and sends it on Save and Publish", async () => {
    const p = await open();
    await createPoll(p);
    for (let i = 0; i < 4; i++) await next(p);
    expect(heading(wizardCard(p))).toBe("Step 5 · How to vote");
    expect(addSwitch(p)).toBeNull();
    (circles(wizardCard(p))[0]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
    await pick(p, "who", "link");
    (circles(wizardCard(p))[4]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
    expect(addSwitch(p)!.checked).toBe(false);
    expect(summaryAdd(wizardCard(p))).toBeNull();
    addSwitch(p)!.click();
    await p.settle();
    await next(p);
    expect(summaryAdd(wizardCard(p))).toBe("Voters may add choices: Yes.");
    footerButton(wizardCard(p), "Save").click();
    await p.settle(100);
    expect(sent("/save")[0]!.body!.votersAddChoices).toBe(true);
  });

  it("sends false when the poll is switched to public", async () => {
    const p = await open();
    await createPoll(p);
    await pick(p, "who", "link");
    for (let i = 0; i < 4; i++) await next(p);
    addSwitch(p)!.click();
    await p.settle();
    (circles(wizardCard(p))[0]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
    await pick(p, "who", "public");
    expect(summaryAdd(wizardCard(p))).toBeNull();
    footerButton(wizardCard(p), "Save").click();
    await p.settle(100);
    expect(sent("/save")[0]!.body!.votersAddChoices).toBe(false);
  });

  it("is enabled on a voted private poll, links from the summary, and saves alone", async () => {
    await votedPrivate();
    const p = await open();
    const card = cardWith(p, "Picnic");
    expect(summaryAdd(card)).toBe("Voters may add choices: No.");
    link(card, "No").click();
    await p.settle(50);
    expect(heading(wizardCard(p))).toBe("Step 5 · How to vote");
    expect(addSwitch(p)!.disabled).toBe(false);
    addSwitch(p)!.click();
    await p.settle();
    footerButton(wizardCard(p), "Save changes").click();
    await p.settle(100);
    const body = sent("/publish")[0]!.body!;
    expect(Object.keys(body).sort()).toEqual(["clientGuid", "timeZone", "votersAddChoices"]);
    expect(body.votersAddChoices).toBe(true);
  });

  it("caps a new poll's choices at choiceLabelMax from /api/config", async () => {
    const p = await open();
    await createPoll(p);
    await next(p);
    await next(p);
    type(p, choicesBox(p), "x".repeat(36));
    expect(choicesBox(p).value).toHaveLength(35);
  });

  it("sends baseChoiceIds, the session's choice ids, with the labels on Save and on Save changes", async () => {
    const p = await open();
    await createPoll(p);
    await answerFirstSteps(p);
    footerButton(wizardCard(p), "Save").click();
    await p.settle(100);
    const saved = sent("/save")[0]!.body!;
    expect(saved.labels).toEqual(["Cakes", "Cookies"]);
    expect(Array.isArray(saved.baseChoiceIds)).toBe(true);

    bodies = [];
    await polls(ctx).deleteMany({});
    await votedPrivate();
    const q = await open();
    link(cardWith(q, "Picnic"), "Choice 1, Choice 2").click();
    await q.settle(50);
    type(q, choicesBox(q), "Choice 1\nChoice 2\nChoice 3");
    blur(q, choicesBox(q));
    footerButton(wizardCard(q), "Save changes").click();
    await q.settle(200);
    expect(sent("/publish")[0]!.body!.baseChoiceIds).toEqual(["c1", "c2"]);
  });

  it("lists Added by <name> in Step 3 for choices a voter added, and nothing for the others", async () => {
    const adder = await forgeSession(ctx, "adder-wizard@example.com");
    await ctx.db.updateTable("user").set({ name: "Ada" }).where("id", "=", adder.userId).execute();
    await votedPrivate({
      voteAnonymity: "No",
      choices: [
        { id: "c1", label: "Choice 1", position: 0 },
        { id: "c2", label: "Choice 2", position: 1 },
        { id: "c3", label: "Choice 3", position: 2, addedBy: adder.userId }
      ]
    });
    const p = await open();
    link(cardWith(p, "Picnic"), "Choice 1, Choice 2, Choice 3").click();
    await p.settle(50);
    const items = Array.from(wizardCard(p).querySelectorAll(".wizard-added-by li")).map((li) => li.textContent);
    expect(items).toEqual(["Choice 3: Added by Ada"]);
  });
});

describe("custom email message in Step 1", () => {
  const messageField = (p: BrowserPage) =>
    wizardCard(p).querySelector<HTMLButtonElement>('[id^="pollInvitationMessage-"]')?.closest<HTMLElement>(".m3-field") ?? null;
  const editButton = (p: BrowserPage) => messageField(p)!.querySelector<HTMLButtonElement>(".wizard-notes-edit")!;
  const previewHtml = (p: BrowserPage) => messageField(p)!.querySelector(".wizard-notes-text")!.innerHTML;
  const counter = (p: BrowserPage) => messageField(p)!.querySelector(".m3-field-counter")!.textContent;
  const summaryLine = (p: BrowserPage) => wizardCard(p).querySelector<HTMLElement>(".wizard-summary .wizard-summary-invitation-message");
  const SENTENCE = "A Custom Invitation Email Message has been entered";

  async function openInvitePoll(invitationMessage: string, pollState: Poll["pollState"] = "INITIALIZED", voted = false) {
    const when = new Date();
    const vote = { emailAddress: "v1@example.com", userName: "v1", choiceIds: ["c1"], votedAt: when };
    const poll = makePoll({
      title: "Reunion", pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", pollState, invitationMessage,
      currentVotes: voted ? [vote] : []
    });
    await seed(poll);
    if (voted) await voteHistory(ctx).insertOne({ pid: poll._id, ...vote });
    const p = await open();
    link(cardWith(p, "Reunion"), "Only people you invite").click();
    await p.settle(50);
    return { p, poll };
  }

  async function editMessage(p: BrowserPage, html: string) {
    editButton(p).click();
    await p.settle();
    const text = messageField(p)!.querySelector<HTMLElement>(".notes-editor-text")!;
    text.innerHTML = html;
    text.dispatchEvent(new p.window.Event("input", { bubbles: true }));
    await p.settle();
  }

  async function done(p: BrowserPage) {
    messageField(p)!.querySelector<HTMLElement>(".notes-editor-done")!.click();
    await p.settle();
  }

  it("shows the field for Only people you invite directly under its radio button, with a line between the sections", async () => {
    const page = await open();
    await createPoll(page);
    expect(messageField(page)).toBeNull();
    await pick(page, "who", "invite");
    const card = wizardCard(page);
    const field = messageField(page)!;
    expect(field).not.toBeNull();
    const group = card.querySelector(".wizard-step-body .m3-radio-list")!;
    const inviteRow = group.querySelector('input[value="invite"]')!.closest(".m3-radio-item")!;
    expect(field.parentElement).toBe(group);
    expect(inviteRow.nextElementSibling).toBe(field);
    expect(field.nextElementSibling!.classList.contains("wizard-who-divider")).toBe(true);
    expect(Array.from(group.children).map((c) => c.classList.contains("wizard-who-divider") ? "line"
      : c.classList.contains("m3-radio-item") ? (c.querySelector("input") as HTMLInputElement).value : "field"))
      .toEqual(["link", "line", "invite", "field", "line", "public"]);
    expect(group.querySelector(".wizard-who-divider")!.getAttribute("aria-hidden")).toBe("true");
    const body = card.querySelector(".wizard-step-body")!;
    expect(group.nextElementSibling).toBe(body.querySelector(".m3-switch-row"));
    expect(field.querySelector(".m3-field-label")!.textContent).toBe("Custom Email Message");
    expect(field.querySelector(".m3-field-support")!.textContent)
      .toBe("Optional. Added to the invitation email we send to the people you invite, and shown in the link preview when the poll's link is shared.");
    expect(counter(page)).toBe("0 / 1000");
    expect(editButton(page).id).toMatch(/^pollInvitationMessage-/);
    expect(editButton(page).textContent).toBe("... edit");
    expect(editButton(page).getAttribute("aria-label")).toBe("Edit custom email message");
    for (const who of ["link", "public"]) {
      await pick(page, "who", who);
      expect(messageField(page), who).toBeNull();
    }
  });

  it("opens the editor with its label and limit, updates the preview and counter on Done, and Save sends it", async () => {
    const { p } = await openInvitePoll("");
    await editMessage(p, "Hi <b>all</b>");
    expect(messageField(p)!.querySelector(".notes-editor-heading")!.textContent).toBe("Custom Email Message");
    expect(messageField(p)!.querySelector(".notes-editor-counter")!.textContent).toBe("10 / 1000");
    await done(p);
    expect(previewHtml(p)).toBe("Hi <strong>all</strong>");
    expect(counter(p)).toBe("10 / 1000");
    expect(p.document.activeElement).toBe(editButton(p));
    footerButton(wizardCard(p), "Save").click();
    await p.settle(100);
    expect(sent("/save")[0]!.body!.invitationMessage).toBe("Hi **all**");
  });

  it("refuses Done above 1000 characters", async () => {
    const { p } = await openInvitePoll("");
    await editMessage(p, "x".repeat(1001));
    await done(p);
    expect(messageField(p)!.querySelector(".notes-editor")).not.toBeNull();
  });

  it("keeps the message while hidden, still sends it, and shows it again on switching back", async () => {
    const { p } = await openInvitePoll("Kept **here**");
    expect(previewHtml(p)).toBe("Kept <strong>here</strong>");
    await pick(p, "who", "link");
    expect(messageField(p)).toBeNull();
    expect(summaryLine(p)).toBeNull();
    footerButton(wizardCard(p), "Save").click();
    await p.settle(100);
    expect(sent("/save")[0]!.body!.invitationMessage).toBe("Kept **here**");
    expect(sent("/save")[0]!.body!.pollSharingMode).toBe("Anyone With The Link");

    const again = await openInvitePoll("Kept **here**");
    await pick(again.p, "who", "public");
    await pick(again.p, "who", "invite");
    expect(previewHtml(again.p)).toBe("Kept <strong>here</strong>");
  });

  it("says saving re-screens when a voted poll's message changes, and sends only it", async () => {
    const { p } = await openInvitePoll("Before", "OPEN", true);
    expect(wizardCard(p).querySelector(".wizard-review-note")).toBeNull();
    await editMessage(p, "After");
    await done(p);
    expect(wizardCard(p).querySelector(".wizard-review-note")).not.toBeNull();
    footerButton(wizardCard(p), "Save changes").click();
    await p.settle(100);
    const body = sent("/publish")[0]!.body!;
    expect(Object.keys(body).sort()).toEqual(["clientGuid", "invitationMessage", "timeZone"]);
    expect(body.invitationMessage).toBe("After");
  });

  it("adds the summary line after the who line, tappable once Step 1 is answered, opening Step 1 at the field", async () => {
    const p = await open();
    await createPoll(p);
    await pick(p, "who", "invite");
    expect(summaryLine(p)).toBeNull();
    await editMessage(p, "Hello");
    await done(p);
    let line = summaryLine(p)!;
    expect(line.textContent).toBe(SENTENCE + ".");
    expect(line.previousElementSibling!.classList.contains("wizard-summary-who")).toBe(true);
    expect(line.querySelector(".wizard-summary-link")).toBeNull();

    await next(p);
    line = summaryLine(p)!;
    const tap = line.querySelector<HTMLElement>(".wizard-summary-link")!;
    expect(tap.textContent).toBe(SENTENCE);
    expect(tap.getAttribute("aria-label")).toBe("Custom Email Message: change in Step 1");
    tap.click();
    await p.settle();
    expect(heading(wizardCard(p))).toBe("Step 1 · Who can vote");
    expect(p.document.activeElement).toBe(editButton(p));

    await next(p);
    summaryLine(p)!.querySelector<HTMLElement>(".wizard-summary-link")!
      .dispatchEvent(new p.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await p.settle();
    expect(heading(wizardCard(p))).toBe("Step 1 · Who can vote");
    expect(p.document.activeElement).toBe(editButton(p));
  });

  it("shows the summary line, with its period, on the read-only card of a poll with a message", async () => {
    await seed(
      makePoll({ title: "With message", pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", pollState: "OPEN", invitationMessage: "Hi" }),
      makePoll({ title: "Without message", pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", pollState: "OPEN" })
    );
    const p = await open();
    const line = cardWith(p, "With message").querySelector(".wizard-summary-invitation-message")!;
    expect(line.textContent).toBe(SENTENCE + ".");
    expect(line.previousElementSibling!.classList.contains("wizard-summary-who")).toBe(true);
    expect(cardWith(p, "Without message").querySelector(".wizard-summary-invitation-message")).toBeNull();
  });

  it("has no summary line for a blank message or another answer", async () => {
    const { p } = await openInvitePoll("** **");
    expect(summaryLine(p)).toBeNull();
    const other = await openInvitePoll("Hello");
    expect(summaryLine(other.p)!.textContent).toBe(SENTENCE + ".");
    await pick(other.p, "who", "link");
    expect(summaryLine(other.p)).toBeNull();
    await pick(other.p, "who", "public");
    expect(summaryLine(other.p)).toBeNull();
  });
});

describe("link preview message in Step 1", () => {
  const messageField = (p: BrowserPage) =>
    wizardCard(p).querySelector<HTMLButtonElement>('[id^="pollLinkPreviewMessage-"]')?.closest<HTMLElement>(".m3-field") ?? null;
  const editButton = (p: BrowserPage) => messageField(p)!.querySelector<HTMLButtonElement>(".wizard-notes-edit")!;
  const previewHtml = (p: BrowserPage) => messageField(p)!.querySelector(".wizard-notes-text")!.innerHTML;
  const counter = (p: BrowserPage) => messageField(p)!.querySelector(".m3-field-counter")!.textContent;
  const summaryLine = (p: BrowserPage) => wizardCard(p).querySelector<HTMLElement>(".wizard-summary .wizard-summary-link-preview-message");
  const SENTENCE = "A Link Preview Message has been entered";

  async function openLinkPoll(linkPreviewMessage: string, pollState: Poll["pollState"] = "INITIALIZED", voted = false, invitationMessage = "") {
    const when = new Date();
    const vote = { emailAddress: "v1@example.com", userName: "v1", choiceIds: ["c1"], votedAt: when };
    const poll = makePoll({
      title: "Reunion", pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link", pollState, linkPreviewMessage,
      invitationMessage, currentVotes: voted ? [vote] : []
    });
    await seed(poll);
    if (voted) await voteHistory(ctx).insertOne({ pid: poll._id, ...vote });
    const p = await open();
    link(cardWith(p, "Reunion"), "Anyone you send the link to").click();
    await p.settle(50);
    return { p, poll };
  }

  async function editMessage(p: BrowserPage, html: string) {
    editButton(p).click();
    await p.settle();
    const text = messageField(p)!.querySelector<HTMLElement>(".notes-editor-text")!;
    text.innerHTML = html;
    text.dispatchEvent(new p.window.Event("input", { bubbles: true }));
    await p.settle();
  }

  async function done(p: BrowserPage) {
    messageField(p)!.querySelector<HTMLElement>(".notes-editor-done")!.click();
    await p.settle();
  }

  it("shows the field under Anyone you send the link to, after the Copy Link block, and nowhere else", async () => {
    const page = await open();
    await createPoll(page);
    await pick(page, "who", "link");
    const card = wizardCard(page);
    const field = messageField(page)!;
    expect(field).not.toBeNull();
    const group = card.querySelector(".wizard-step-body .m3-radio-list")!;
    const linkRow = group.querySelector('input[value="link"]')!.closest(".m3-radio-item")!;
    expect(field.parentElement).toBe(group);
    expect(linkRow.nextElementSibling!.classList.contains("wizard-copy-link")).toBe(true);
    expect(linkRow.nextElementSibling!.nextElementSibling).toBe(field);
    expect(field.nextElementSibling!.classList.contains("wizard-who-divider")).toBe(true);
    expect(field.querySelector(".m3-field-label")!.textContent).toBe("Link Preview Message");
    expect(field.querySelector(".m3-field-support")!.textContent)
      .toBe("Optional. Shown under the poll's title when its link is shared in a messaging app.");
    expect(counter(page)).toBe("0 / 100");
    expect(editButton(page).id).toMatch(/^pollLinkPreviewMessage-/);
    expect(editButton(page).textContent).toBe("... edit");
    expect(editButton(page).getAttribute("aria-label")).toBe("Edit link preview message");
    for (const who of ["invite", "public"]) {
      await pick(page, "who", who);
      expect(messageField(page), who).toBeNull();
    }
  });

  it("opens the editor with its label and limit, updates the preview and counter on Done, and Save sends it", async () => {
    const { p } = await openLinkPoll("");
    await editMessage(p, "Vote <b>today</b>");
    expect(messageField(p)!.querySelector(".notes-editor-heading")!.textContent).toBe("Link Preview Message");
    expect(messageField(p)!.querySelector(".notes-editor-counter")!.textContent).toBe("14 / 100");
    await done(p);
    expect(previewHtml(p)).toBe("Vote <strong>today</strong>");
    expect(counter(p)).toBe("14 / 100");
    expect(p.document.activeElement).toBe(editButton(p));
    footerButton(wizardCard(p), "Save").click();
    await p.settle(100);
    expect(sent("/save")[0]!.body!.linkPreviewMessage).toBe("Vote **today**");
  });

  it("refuses Done above 100 characters", async () => {
    const { p } = await openLinkPoll("");
    await editMessage(p, "x".repeat(101));
    await done(p);
    expect(messageField(p)!.querySelector(".notes-editor")).not.toBeNull();
  });

  it("keeps the message while hidden, still sends it, and shows it again on switching back", async () => {
    const { p } = await openLinkPoll("Kept **here**", "INITIALIZED", false, "Email **text**");
    expect(previewHtml(p)).toBe("Kept <strong>here</strong>");
    await pick(p, "who", "invite");
    expect(messageField(p)).toBeNull();
    expect(summaryLine(p)).toBeNull();
    const emailField = wizardCard(p).querySelector('[id^="pollInvitationMessage-"]')!.closest(".m3-field")!;
    expect(emailField.querySelector(".wizard-notes-text")!.innerHTML).toBe("Email <strong>text</strong>");
    footerButton(wizardCard(p), "Save").click();
    await p.settle(100);
    expect(sent("/save")[0]!.body!.linkPreviewMessage).toBe("Kept **here**");
    expect(sent("/save")[0]!.body!.invitationMessage).toBe("Email **text**");
    expect(sent("/save")[0]!.body!.pollSharingMode).toBe("Invitation Only");

    const again = await openLinkPoll("Kept **here**");
    await pick(again.p, "who", "public");
    await pick(again.p, "who", "link");
    expect(previewHtml(again.p)).toBe("Kept <strong>here</strong>");
  });

  it("says saving re-screens when a voted poll's message changes, and sends only it", async () => {
    const { p } = await openLinkPoll("Before", "OPEN", true);
    expect(wizardCard(p).querySelector(".wizard-review-note")).toBeNull();
    await editMessage(p, "After");
    await done(p);
    expect(wizardCard(p).querySelector(".wizard-review-note")).not.toBeNull();
    footerButton(wizardCard(p), "Save changes").click();
    await p.settle(100);
    const body = sent("/publish")[0]!.body!;
    expect(Object.keys(body).sort()).toEqual(["clientGuid", "linkPreviewMessage", "timeZone"]);
    expect(body.linkPreviewMessage).toBe("After");
  });

  it("adds the summary line after the who line, tappable once Step 1 is answered, opening Step 1 at the field", async () => {
    const p = await open();
    await createPoll(p);
    await pick(p, "who", "link");
    expect(summaryLine(p)).toBeNull();
    await editMessage(p, "Hello");
    await done(p);
    let line = summaryLine(p)!;
    expect(line.textContent).toBe(SENTENCE + ".");
    expect(line.previousElementSibling!.classList.contains("wizard-summary-who")).toBe(true);
    expect(line.querySelector(".wizard-summary-link")).toBeNull();

    await next(p);
    line = summaryLine(p)!;
    const tap = line.querySelector<HTMLElement>(".wizard-summary-link")!;
    expect(tap.textContent).toBe(SENTENCE);
    expect(tap.getAttribute("aria-label")).toBe("Link Preview Message: change in Step 1");
    tap.click();
    await p.settle();
    expect(heading(wizardCard(p))).toBe("Step 1 · Who can vote");
    expect(p.document.activeElement).toBe(editButton(p));
  });

  it("shows the summary line on the read-only card of a poll with a message, never beside the email line", async () => {
    await seed(
      makePoll({ title: "With message", pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link", pollState: "OPEN", linkPreviewMessage: "Hi", invitationMessage: "Hi" }),
      makePoll({ title: "Without message", pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link", pollState: "OPEN", invitationMessage: "Hi" })
    );
    const p = await open();
    const withCard = cardWith(p, "With message");
    const line = withCard.querySelector(".wizard-summary-link-preview-message")!;
    expect(line.textContent).toBe(SENTENCE + ".");
    expect(line.previousElementSibling!.classList.contains("wizard-summary-who")).toBe(true);
    expect(withCard.querySelector(".wizard-summary-invitation-message")).toBeNull();
    expect(cardWith(p, "Without message").querySelector(".wizard-summary-link-preview-message")).toBeNull();
    expect(cardWith(p, "Without message").querySelector(".wizard-summary-invitation-message")).toBeNull();
  });

  it("has no summary line for a blank message or another answer", async () => {
    const { p } = await openLinkPoll("** **");
    expect(summaryLine(p)).toBeNull();
    const other = await openLinkPoll("Hello");
    expect(summaryLine(other.p)!.textContent).toBe(SENTENCE + ".");
    await pick(other.p, "who", "invite");
    expect(summaryLine(other.p)).toBeNull();
    await pick(other.p, "who", "public");
    expect(summaryLine(other.p)).toBeNull();
  });
});
