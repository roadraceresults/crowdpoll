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
    scripts: ["m3-ripple.js", "app.js", "adminCard.js", "adminList.js"],
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

    it("cuts a choice to 40 characters, refuses an empty line and drops pasted repeats", async () => {
      const p = await open();
      await createPoll(p);
      await next(p);
      await next(p);
      type(p, choicesBox(p), "x".repeat(41));
      expect(choicesBox(p).value).toBe("x".repeat(40));
      expect(wizardCard(p).textContent).toContain("Choices are capped at 40 characters.");

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

  it("keeps Colors open while Choices is locked on a poll that has votes, listing the stored choices", async () => {
    const { p } = await openExisting("Voted", true);
    expect(heading(wizardCard(p))).toBe("Step 4 · View");
    expect(Array.from(wizardCard(p).querySelectorAll(".wizard-color-label")).map((l) => l.textContent)).toEqual(["Left", "Right"]);
    expect(colorButton(p, "Left").disabled).toBe(false);
    expect(wizardCard(p).querySelector(".wizard-locked")).toBeNull();
    (circles(wizardCard(p))[2]!.querySelector("button") as HTMLButtonElement).click();
    await p.settle();
    expect(heading(wizardCard(p))).toBe("Step 3 · Choices");
    expect(wizardCard(p).querySelector(".wizard-locked")).not.toBeNull();
    expect(choicesBox(p).disabled).toBe(true);
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
      "Vote Count", "Banned Voter Count"
    ]);
    expect(card.querySelector(".card-pen")).toBeNull();
    expect(card.textContent).not.toContain("Voter Count Limit");
    expect(card.querySelector('[id^="voterCountLimit"], .admin-participant-list')).toBeNull();
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
    expect(linkTexts(cardWith(p, "Running"))).toEqual(["Running", "Sub", "Bar colors are assigned automatically.", "stays open until you close it"]);
    expect(linkTexts(cardWith(p, "Finished"))).toEqual(["Finished", "Sub", "Bar colors are assigned automatically."]);
  });

  it("opens at the tapped step with every step visited, locks what cannot change and says saving re-screens", async () => {
    await voted(makePoll({ title: "Running", subtitle: "Sub", pollState: "OPEN" }));
    const p = await open();
    link(cardWith(p, "Running"), "Running").click();
    await p.settle(50);
    let card = wizardCard(p);
    expect(heading(card)).toBe("Step 2 · Title & Tags");
    expect(circles(card).map((s) => s.className.replace("wizard-step ", ""))).toEqual([
      "is-visited", "is-current", "is-visited", "is-visited", "is-visited", "is-visited"
    ]);
    expect(card.querySelector(".wizard-review-note")!.textContent).toBe("Saving sends your poll to be reviewed again.");
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
    const card = cardWith(p, "Running");
    expect(card.querySelector(".card-state-value")!.textContent).toBe("AWAITING APPROVAL");
    expect(links(card)).toEqual([]);
  });

  it("caps the subtitle at 30 characters and the title at 50, on an existing poll as on a new one", async () => {
    await seed(makePoll({ title: "Existing", subtitle: "Sub", pollState: "OPEN" }));
    const p = await open();
    link(cardWith(p, "Existing"), "Existing").click();
    await p.settle(50);
    const subtitle = wizardCard(p).querySelector<HTMLTextAreaElement>('[id^="pollSubtitle-"]')!;
    expect(subtitle.maxLength).toBe(30);
    expect(titleField(p).maxLength).toBe(50);
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
