/**
 * Site Settings in the browser: the head script that applies the color scheme, the avatar menu item,
 * the Site Settings card and its saves.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { AGREED, startTestContext, extractLinkPath, followSignInLink, type TestContext } from "./helpers/setup.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import { openStubbedHome, type StubbedHome, type StubbedUser } from "./helpers/single-column-page.js";

let ctx: TestContext;
let nextIp = 1;
const freshIp = () => `10.8.0.${nextIp++}`;
let nextUser = 1;
const freshEmail = () => `site-settings${nextUser++}@example.com`;

const HEAD = ["colorScheme.js", "app.js"];

async function signIn(email = freshEmail()): Promise<string> {
  await request(ctx.app).post("/api/auth/create-account").set("x-forwarded-for", freshIp()).send({ ...AGREED, email });
  const res = await followSignInLink(ctx, extractLinkPath(ctx.sent.at(-1)!));
  const setCookie = (res.headers["set-cookie"] as unknown as string[]).find((c) => c.startsWith("session_token="))!;
  return setCookie.split(";")[0]!;
}

function storeDark(window: Window): void {
  window.localStorage.setItem("colorScheme", "dark");
}

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});

describe("colorScheme.js", () => {
  it("applies a stored Dark on its own, with no session script", async () => {
    const page = await openPage(ctx, "privacy.html", {
      scripts: ["colorScheme.js"],
      beforeScripts: (window) => storeDark(window as unknown as Window)
    });
    expect(page.document.documentElement.dataset.theme).toBe("dark");
    page.close();
  });

  it("leaves the page Light when nothing is stored", async () => {
    const page = await openPage(ctx, "privacy.html", { scripts: ["colorScheme.js"] });
    expect(page.document.documentElement.hasAttribute("data-theme")).toBe(false);
    page.close();
  });

  it("stays Light, without an error, when storage is blocked", async () => {
    const errors: unknown[] = [];
    const page = await openPage(ctx, "privacy.html", {
      scripts: ["colorScheme.js"],
      beforeScripts: (window) => {
        Object.defineProperty(window, "localStorage", { get: () => { throw new Error("blocked"); } });
        window.addEventListener("error", (event) => errors.push(event.error));
      }
    });
    expect(page.document.documentElement.hasAttribute("data-theme")).toBe(false);
    page.window.eval('window.ColorScheme.apply("dark")');
    expect(page.document.documentElement.dataset.theme).toBe("dark");
    expect(errors).toEqual([]);
    page.close();
  });

  it("applies and stores the account's Dark once the session answers", async () => {
    const cookie = await signIn();
    await request(ctx.app).patch("/api/me").set("Cookie", cookie).send({ colorScheme: "dark" });
    const page = await openPage(ctx, "privacy.html", { cookie, scripts: HEAD });
    expect(page.document.documentElement.dataset.theme).toBe("dark");
    expect(page.window.localStorage.getItem("colorScheme")).toBe("dark");
    page.close();
  });

  it("returns to Light and removes the copy when there is no session", async () => {
    const page = await openPage(ctx, "privacy.html", {
      scripts: HEAD,
      beforeScripts: (window) => storeDark(window as unknown as Window)
    });
    expect(page.document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(page.window.localStorage.getItem("colorScheme")).toBeNull();
    page.close();
  });

  it("corrects a stored Dark to the account's Light", async () => {
    const cookie = await signIn();
    const page = await openPage(ctx, "privacy.html", {
      cookie,
      scripts: HEAD,
      beforeScripts: (window) => storeDark(window as unknown as Window)
    });
    expect(page.document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(page.window.localStorage.getItem("colorScheme")).toBeNull();
    page.close();
  });
});

describe("the device's appearance setting (FR-010)", () => {
  const darkDevice = (window: BrowserPage["window"]) => {
    (window as unknown as { matchMedia: unknown }).matchMedia = (query: string) => ({
      matches: query.includes("dark"), media: query, onchange: null,
      addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false
    });
  };

  it("leaves a signed-out page and a never-chosen user's page Light on a dark device", async () => {
    const guest = await openPage(ctx, "privacy.html", { scripts: HEAD, beforeScripts: darkDevice });
    expect(guest.document.documentElement.hasAttribute("data-theme")).toBe(false);
    guest.close();
    const member = await openPage(ctx, "privacy.html", { cookie: await signIn(), scripts: HEAD, beforeScripts: darkDevice });
    expect(member.document.documentElement.hasAttribute("data-theme")).toBe(false);
    member.close();
  });
});

const PLAIN: StubbedUser = { userName: "Member", permissions: ["Vote on Polls"] };
const CREATOR: StubbedUser = { userName: "Creator", permissions: ["View Polls", "Create Poll"] };

describe("the avatar menu (C1)", () => {
  let home: StubbedHome | null = null;
  afterEach(() => {
    home?.close();
    home = null;
  });
  const labelOf = (a: Element) => a.querySelector(".avatar-menu-label")!.firstChild!.textContent;
  const items = (h: StubbedHome) => Array.from(h.document.querySelectorAll(".avatar-menu a")).map(labelOf);
  const link = (h: StubbedHome, label: string) =>
    Array.from(h.document.querySelectorAll(".avatar-menu a")).find((a) => labelOf(a) === label) as HTMLAnchorElement;

  it("offers Site Settings after Edit Profile to a user without permissions", async () => {
    home = await openStubbedHome({ scripts: ["app.js"], user: PLAIN });
    expect(items(home)).toEqual(["Edit Profile", "Site Settings", "Create Poll", "Logout"]);
    const settings = link(home, "Site Settings");
    expect(settings.getAttribute("href")).toBe("/settings");
    expect(settings.hasAttribute("aria-disabled")).toBe(false);
  });

  it("lists Poll Administration before Logout for a creator", async () => {
    home = await openStubbedHome({ scripts: ["app.js"], user: CREATOR });
    expect(items(home)).toEqual(["Edit Profile", "Site Settings", "Create Poll", "Poll Administration", "Logout"]);
  });

  it("is not there for a guest", async () => {
    home = await openStubbedHome({ scripts: ["app.js"], user: null });
    expect(home.document.querySelector(".avatar-menu")).toBeNull();
  });

  it("gives Poll Administration a checklist and Site Settings the gear, in theme colours only (FR-003, FR-004)", async () => {
    home = await openStubbedHome({ scripts: ["app.js"], user: CREATOR });
    const admin = link(home, "Poll Administration").querySelector("svg")!;
    const gear = link(home, "Site Settings").querySelector("svg")!;
    expect(admin.querySelector('circle[fill="currentColor"]')).not.toBeNull();
    expect(admin.querySelectorAll('path[stroke="currentColor"]')).toHaveLength(3);
    expect(admin.innerHTML).not.toBe(gear.innerHTML);
    for (const svg of [admin, gear]) {
      for (const node of Array.from(svg.querySelectorAll("*"))) {
        for (const attr of ["fill", "stroke"]) {
          const value = node.getAttribute(attr);
          if (value !== null) expect(["currentColor", "var(--paper)", "none"]).toContain(value);
        }
      }
    }
  });
});

const CARD = ["colorScheme.js", "app.js", "cardShell.js", "settingsCard.js"];
const FAILED = "Your color scheme could not be saved. Please try again.";

type Listener = ((event: { data: unknown }) => void) | null;

/* jsdom has no BroadcastChannel; this stand-in links the windows of one test, and lets a test post a snapshot to one. */
function fakeChannels() {
  const members: { window: BrowserPage["window"]; channel: { onmessage: Listener } }[] = [];
  const install = (window: BrowserPage["window"]) => {
    class FakeBroadcastChannel {
      onmessage: Listener = null;
      constructor(public name: string) {
        members.push({ window, channel: this });
      }
      postMessage(data: unknown) {
        for (const member of members) if (member.channel !== this) member.channel.onmessage?.({ data });
      }
      close() {}
    }
    (window as unknown as { BroadcastChannel: unknown }).BroadcastChannel = FakeBroadcastChannel;
  };
  const post = (window: BrowserPage["window"], data: unknown) => {
    for (const member of members) if (member.window === window) member.channel.onmessage?.({ data });
  };
  return { install, post };
}

type Reply = number | "network" | "server";

/** Holds every PATCH until the test releases it: with a status, a network error, or "server" to pass it through. */
function holdSaves(page: BrowserPage) {
  const realFetch = page.window.fetch;
  const saves: { body: { colorScheme?: string }; release: (reply: Reply) => void }[] = [];
  page.window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if ((init?.method ?? "GET").toUpperCase() !== "PATCH") return realFetch(input, init);
    const body = JSON.parse(String(init!.body)) as { colorScheme?: string };
    const reply = await new Promise<Reply>((release) => saves.push({ body, release }));
    if (reply === "server") return realFetch(input, init);
    if (reply === "network") throw new TypeError("Failed to fetch");
    return { ok: reply >= 200 && reply < 300, status: reply, json: async () => ({}) } as unknown as Response;
  }) as typeof fetch;
  return saves;
}

interface SessionApi {
  getSession(): Record<string, unknown> | null;
  refresh(): unknown;
}
const sessionOf = (page: BrowserPage) => (page.window as unknown as { Session: SessionApi }).Session;

async function openSettings(cookie: string, beforeScripts?: (window: BrowserPage["window"]) => void): Promise<BrowserPage> {
  return openPage(ctx, "settings.html", { cookie, scripts: CARD, url: "http://localhost/settings", beforeScripts });
}

const radio = (page: BrowserPage, value: string) =>
  page.document.querySelector(`input[name="colorScheme"][value="${value}"]`) as HTMLInputElement;
const theme = (page: BrowserPage) => page.document.documentElement.dataset.theme ?? "light";
const message = (page: BrowserPage) => page.document.querySelector(".settings-message")!.textContent;

describe("the Site Settings card (C3)", () => {
  it("is titled Site Settings, shows the gear and the Color Scheme group, and nothing from Profile", async () => {
    const page = await openSettings(await signIn());
    const doc = page.document;
    expect(doc.querySelector("h1.question")!.textContent).toBe("Site Settings");
    expect(doc.title).toBe("Site Settings");
    expect(doc.querySelector(".card-shell-subtitle svg[aria-hidden='true'][viewBox='0 0 64 64']")).not.toBeNull();
    const group = doc.querySelector('[role="radiogroup"]')!;
    expect(doc.getElementById(group.getAttribute("aria-labelledby")!)!.textContent).toBe("Color Scheme");
    expect(Array.from(group.querySelectorAll("label")).map((l) => l.textContent!.trim())).toEqual(["Light (default)", "Dark"]);
    expect(radio(page, "light").checked).toBe(true);
    expect(doc.querySelector("#card-root input:not([type='radio']), #card-root button, .profile-card-avatar")).toBeNull();
    page.close();
  });

  it("checks the account's Dark", async () => {
    const cookie = await signIn();
    await request(ctx.app).patch("/api/me").set("Cookie", cookie).send({ colorScheme: "dark" });
    const page = await openSettings(cookie);
    expect(radio(page, "dark").checked).toBe(true);
    page.close();
  });
});

describe("saving a choice (C4)", () => {
  it("applies Dark in the same task as the change and saves it", async () => {
    const page = await openSettings(await signIn());
    const saves = holdSaves(page);
    radio(page, "dark").click();
    expect(page.document.documentElement.dataset.theme).toBe("dark");
    expect(saves.map((s) => s.body)).toEqual([{ colorScheme: "dark" }]);
    saves[0]!.release("server");
    await page.settle();
    expect(page.requests.filter((r) => r.method === "PATCH")).toHaveLength(1);
    page.close();
  });

  it("sends nothing when the checked radio is chosen again", async () => {
    const page = await openSettings(await signIn());
    const saves = holdSaves(page);
    radio(page, "light").click();
    await page.settle();
    expect(saves).toHaveLength(0);
    page.close();
  });

  it("sends at most two saves for three quick changes, the last carrying the final choice", async () => {
    const page = await openSettings(await signIn());
    const saves = holdSaves(page);
    const refresh = vi.spyOn(sessionOf(page), "refresh");
    radio(page, "dark").click();
    radio(page, "light").click();
    radio(page, "dark").click();
    expect(saves).toHaveLength(1);
    saves[0]!.release("server");
    await page.settle();
    expect(refresh).not.toHaveBeenCalled();
    expect(saves).toHaveLength(2);
    expect(saves[1]!.body).toEqual({ colorScheme: "dark" });
    saves[1]!.release("server");
    await page.settle();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(theme(page)).toBe("dark");
    page.close();
  });
});

describe("a failed save, and other tabs (C4, US4)", () => {
  for (const reply of [500, "network"] as const) {
    it(`reverts and says so after ${reply === 500 ? "a 500" : "a network error"}, and a later success clears the message`, async () => {
      const page = await openSettings(await signIn());
      const saves = holdSaves(page);
      radio(page, "dark").click();
      saves[0]!.release(reply);
      await page.settle();
      expect(theme(page)).toBe("light");
      expect(radio(page, "light").checked).toBe(true);
      expect(message(page)).toBe(FAILED);
      radio(page, "dark").click();
      saves[1]!.release("server");
      await page.settle();
      expect(message(page)).toBe("");
      expect(theme(page)).toBe("dark");
      page.close();
    });
  }

  it("goes to sign-in on a 401", async () => {
    const page = await openSettings(await signIn());
    const saves = holdSaves(page);
    const before = page.navigations.length;
    radio(page, "dark").click();
    saves[0]!.release(401);
    await page.settle();
    expect(page.navigations.length).toBeGreaterThan(before);
    page.close();
  });

  it("switches another tab to Dark when the saving tab's snapshot reaches it", async () => {
    const channels = fakeChannels();
    const cookie = await signIn();
    const settings = await openSettings(cookie, channels.install);
    const other = await openPage(ctx, "privacy.html", { cookie, scripts: HEAD, beforeScripts: channels.install });
    expect(theme(other)).toBe("light");
    radio(settings, "dark").click();
    await settings.settle();
    await other.settle();
    expect(theme(other)).toBe("dark");
    settings.close();
    other.close();
  });

  it("keeps the pending Dark over a Light snapshot that arrives mid-save, then shows the account's Dark", async () => {
    const channels = fakeChannels();
    const page = await openSettings(await signIn(), channels.install);
    const saves = holdSaves(page);
    const snapshot = sessionOf(page).getSession()!;
    radio(page, "dark").click();
    channels.post(page.window, { ...snapshot, colorScheme: "light", userName: "Elsewhere" });
    expect(theme(page)).toBe("dark");
    expect(radio(page, "dark").checked).toBe(true);
    const refresh = vi.spyOn(sessionOf(page), "refresh");
    saves[0]!.release("server");
    await page.settle();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(theme(page)).toBe("dark");
    expect(radio(page, "dark").checked).toBe(true);
    page.close();
  });

  it("falls back to another tab's newer Dark when its own pending Light fails", async () => {
    const channels = fakeChannels();
    const page = await openSettings(await signIn(), channels.install);
    const saves = holdSaves(page);
    const snapshot = sessionOf(page).getSession()!;
    radio(page, "dark").click();
    radio(page, "light").click();
    expect(theme(page)).toBe("light");
    channels.post(page.window, { ...snapshot, colorScheme: "dark", userName: "Elsewhere" });
    expect(theme(page)).toBe("light");
    saves[0]!.release(500);
    await page.settle();
    expect(saves).toHaveLength(1);
    expect(theme(page)).toBe("dark");
    expect(radio(page, "dark").checked).toBe(true);
    expect(message(page)).toBe(FAILED);
    page.close();
  });
});
