import { readFileSync } from "node:fs";
import path from "node:path";
import request from "supertest";
import type { JSDOM } from "jsdom";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";

const SCRIPTS = ["app.js", "deviceEvidence.js", "voteClient.js"];
const LIBRARY = "/vendor/fingerprintjs-5.3.0.min.js";
const VISITOR = "a".repeat(32);
const HARDWARE = "b".repeat(32);
const IDLE_MS = 400;
const storedKeys = (window: JSDOM["window"]) => [window.localStorage, window.sessionStorage].map((store) => Object.keys(store).sort());
const ON = { ENV_DEVICE_EVENTS_ENABLED: "true", ENV_DEVICE_EVENTS_KEY: "k".repeat(32) };

type TestWindow = JSDOM["window"] & { DeviceEvidence: { headers(): Record<string, string> }; VoteClient: { submit(pid: string, choiceIds: string[]): Promise<{ ok: boolean }> } };

const COMPONENTS = {
  screenResolution: { value: [1920, 1080], duration: 0 },
  colorDepth: { value: 24, duration: 0 },
  hardwareConcurrency: { value: 8, duration: 0 },
  timezone: { error: new Error("no time zone"), duration: 0 },
  platform: { value: "Win32", duration: 0 },
  deviceMemory: { value: 8, duration: 0 },
  webGlBasics: { value: { rendererUnmasked: "ANGLE (Test)" }, duration: 0 },
  canvas: { value: {}, duration: 0 }
};

function libraryStub(get: () => Promise<unknown> = async () => ({ visitorId: VISITOR, components: COMPONENTS })) {
  return { load: vi.fn(async () => ({ get })), hashComponents: vi.fn(() => HARDWARE) };
}

/** jsdom does not run an injected script, so the page's <script> is answered here. */
function answerLibraryWith(answer: (window: JSDOM["window"], script: HTMLScriptElement) => void, injected: string[] = []) {
  return (window: JSDOM["window"]) => {
    const append = window.document.head.appendChild.bind(window.document.head);
    window.document.head.appendChild = ((node: Node) => {
      const script = node as HTMLScriptElement;
      if (script.tagName !== "SCRIPT") return append(node);
      injected.push(script.getAttribute("src") ?? "");
      setTimeout(() => answer(window, script), 0);
      return node;
    }) as typeof window.document.head.appendChild;
  };
}

function withStub(stub: ReturnType<typeof libraryStub>, injected: string[] = []) {
  return answerLibraryWith((window, script) => {
    (window as unknown as { FingerprintJS: unknown }).FingerprintJS = stub;
    script.dispatchEvent(new window.Event("load"));
  }, injected);
}

let on: TestContext;
let off: TestContext;
let page: BrowserPage | null = null;
let users = 0;

beforeAll(async () => {
  on = await startTestContext(ON);
  off = await startTestContext();
});
afterAll(async () => {
  await on.stop();
  await off.stop();
});
afterEach(() => {
  page?.close();
  page = null;
});

async function signedIn(ctx: TestContext) {
  return (await forgeSession(ctx, `browser${users++}@example.com`)).cookie;
}

describe("deviceEvidence.js: when it computes (C1)", () => {
  it("computes nothing when collection is off", async () => {
    const injected: string[] = [];
    const stub = libraryStub();
    page = await openPage(off, "index.html", { cookie: await signedIn(off), scripts: SCRIPTS, beforeScripts: withStub(stub, injected) });
    await page.settle(IDLE_MS);
    expect(injected).toEqual([]);
    expect(stub.load).not.toHaveBeenCalled();
    expect((page.window as TestWindow).DeviceEvidence.headers()).toEqual({});
  });

  it("computes nothing for a guest", async () => {
    const injected: string[] = [];
    page = await openPage(on, "index.html", { scripts: SCRIPTS, beforeScripts: withStub(libraryStub(), injected) });
    await page.settle(IDLE_MS);
    expect(injected).toEqual([]);
  });

  it("loads the library from this origin once, with its usage statistics off", async () => {
    const injected: string[] = [];
    const stub = libraryStub();
    page = await openPage(on, "index.html", { cookie: await signedIn(on), scripts: SCRIPTS, beforeScripts: withStub(stub, injected) });
    await page.settle(IDLE_MS);
    await (page.window as unknown as { Session: { refresh(): Promise<boolean> } }).Session.refresh();
    await page.settle(IDLE_MS);
    expect(injected).toEqual([LIBRARY]);
    expect(stub.load).toHaveBeenCalledTimes(1);
    expect(stub.load).toHaveBeenCalledWith({ monitoring: false });
  });

  it("hashes only the listed components, leaves out deviceMemory and the GPU, and treats a failed one as absent", async () => {
    const stub = libraryStub();
    page = await openPage(on, "index.html", { cookie: await signedIn(on), scripts: SCRIPTS, beforeScripts: withStub(stub) });
    await page.settle(IDLE_MS);
    const hashed = (stub.hashComponents.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(Object.keys(hashed).sort()).toEqual(["colorDepth", "hardwareConcurrency", "platform", "screenResolution"]);
    expect((page.window as TestWindow).DeviceEvidence.headers()).toEqual({ "X-Device-Fingerprint": `${VISITOR}.${HARDWARE}` });
  });

  it.each([
    ["a blocked script", answerLibraryWith((window, script) => script.dispatchEvent(new window.Event("error")))],
    ["a thrown error", withStub(libraryStub(async () => { throw new Error("no"); }))],
    ["a value of the wrong shape", withStub(libraryStub(async () => ({ visitorId: "short", components: COMPONENTS })))]
  ])("leaves headers() empty and the console silent after %s", async (_name, install) => {
    const logged: unknown[] = [];
    page = await openPage(on, "index.html", {
      cookie: await signedIn(on),
      scripts: SCRIPTS,
      beforeScripts: (window) => {
        install(window);
        for (const method of ["log", "info", "warn", "error", "debug"] as const) window.console[method] = (...args: unknown[]) => void logged.push(args);
      }
    });
    await page.settle(IDLE_MS);
    expect((page.window as TestWindow).DeviceEvidence.headers()).toEqual({});
    expect(logged).toEqual([]);
  });
});

describe("voteClient.js and the fingerprint (C3)", () => {
  async function votablePoll() {
    const poll = makePoll();
    await polls(on).insertOne(poll);
    return poll._id;
  }
  const votes = (p: BrowserPage) => p.requests.filter((r) => r.url.endsWith("/vote"));

  it("carries the header once the value is ready", async () => {
    page = await openPage(on, "index.html", { cookie: await signedIn(on), scripts: SCRIPTS, beforeScripts: withStub(libraryStub()) });
    await page.settle(IDLE_MS);
    const outcome = await (page.window as TestWindow).VoteClient.submit(await votablePoll(), ["c1"]);
    expect(outcome.ok).toBe(true);
    expect(votes(page)[0]!.headers["X-Device-Fingerprint"]).toBe(`${VISITOR}.${HARDWARE}`);
  });

  it("does not wait for a value that is not ready", async () => {
    page = await openPage(on, "index.html", { cookie: await signedIn(on), scripts: SCRIPTS, beforeScripts: withStub(libraryStub(() => new Promise(() => undefined))) });
    await page.settle(IDLE_MS);
    const outcome = await (page.window as TestWindow).VoteClient.submit(await votablePoll(), ["c1"]);
    expect(outcome.ok).toBe(true);
    expect(votes(page)[0]!.headers["X-Device-Fingerprint"]).toBeUndefined();
  });
});

describe("the real vendored library (R2, SC-005)", () => {
  const vendored = readFileSync(path.resolve("src/public", LIBRARY.slice(1)), "utf8");

  it("is served from this origin, and keeps its licence header", async () => {
    expect((await request(on.app).get(LIBRARY)).status).toBe(200);
    expect(vendored.startsWith("/**\n * FingerprintJS v5.3.0")).toBe(true);
    expect(vendored).toContain("Licensed under MIT License");
  });

  it("leaves no cookie or storage key once it has computed, and asks for nothing from elsewhere", async () => {
    const injected: string[] = [];
    const elsewhere: string[] = [];
    let keysBefore: string[][] = [];
    page = await openPage(on, "index.html", {
      cookie: await signedIn(on),
      scripts: SCRIPTS,
      beforeScripts: (window) => {
        // The library yields through a MessageChannel, which jsdom lacks.
        (window as unknown as { MessageChannel: unknown }).MessageChannel = class {
          port1: { onmessage?: () => void } = {};
          port2 = { postMessage: () => void setTimeout(() => this.port1.onmessage?.(), 0) };
        };
        const beacon = (url: string | URL) => {
          elsewhere.push(String(url));
          return true;
        };
        Object.defineProperty(window.navigator, "sendBeacon", { value: beacon });
        answerLibraryWith((w, script) => {
          keysBefore = storedKeys(w);
          w.eval(vendored);
          script.dispatchEvent(new w.Event("load"));
        }, injected)(window);
      }
    });
    await page.settle(3000);
    expect(injected).toEqual([LIBRARY]);
    expect(new URL(LIBRARY, "http://localhost/").origin).toBe("http://localhost");
    expect((page.window as TestWindow).DeviceEvidence.headers()["X-Device-Fingerprint"]).toMatch(/^[0-9a-f]{32}\.[0-9a-f]{32}$/);
    expect(page.document.cookie).not.toContain("cookietest");
    expect(storedKeys(page.window)).toEqual(keysBefore);
    expect(elsewhere).toEqual([]);
    expect(page.requests.filter((r) => /^https?:/.test(r.url))).toEqual([]);
  }, 30_000);
});

describe("reporting a sign-in (C2)", () => {
  const reports = (p: BrowserPage) => p.requests.filter((r) => r.url === "/api/me/device-login");
  const PROFILE = ["app.js", "deviceEvidence.js"];

  it("posts once when due, with the header, and a later page does neither", async () => {
    const cookie = await signedIn(on);
    const injected: string[] = [];
    page = await openPage(on, "profile.html", { cookie, scripts: PROFILE, url: "http://localhost/profile", beforeScripts: withStub(libraryStub(), injected) });
    await page.settle(IDLE_MS);
    expect(injected).toEqual([LIBRARY]);
    expect(reports(page).length).toBe(1);
    expect(reports(page)[0]!.headers["X-Device-Fingerprint"]).toBe(`${VISITOR}.${HARDWARE}`);
    page.close();

    const later: string[] = [];
    page = await openPage(on, "profile.html", { cookie, scripts: PROFILE, url: "http://localhost/profile", beforeScripts: withStub(libraryStub(), later) });
    await page.settle(IDLE_MS);
    expect(later).toEqual([]);
    expect(reports(page)).toEqual([]);
  });

  it("still posts after a failed computation, without the header", async () => {
    page = await openPage(on, "profile.html", {
      cookie: await signedIn(on),
      scripts: PROFILE,
      url: "http://localhost/profile",
      beforeScripts: answerLibraryWith((window, script) => script.dispatchEvent(new window.Event("error")))
    });
    await page.settle(IDLE_MS);
    expect(reports(page).length).toBe(1);
    expect(reports(page)[0]!.headers["X-Device-Fingerprint"]).toBeUndefined();
  });

  it("ignores a failed post", async () => {
    const logged: unknown[] = [];
    const failures: unknown[] = [];
    page = await openPage(on, "profile.html", {
      cookie: await signedIn(on),
      scripts: PROFILE,
      url: "http://localhost/profile",
      beforeScripts: (window) => {
        withStub(libraryStub())(window);
        window.console.error = (...args: unknown[]) => void logged.push(args);
        window.addEventListener("unhandledrejection", (event) => failures.push(event));
        const send = window.fetch;
        window.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
          String(input) === "/api/me/device-login" ? Promise.reject(new Error("offline")) : send(input, init)) as typeof fetch;
      }
    });
    await page.settle(IDLE_MS);
    expect(logged).toEqual([]);
    expect(failures).toEqual([]);
  });

  it("leaves the session snapshot as it was, and notifies no subscriber because of the header", async () => {
    page = await openPage(on, "profile.html", { cookie: await signedIn(on), scripts: PROFILE, url: "http://localhost/profile", beforeScripts: withStub(libraryStub()) });
    const session = (page.window as unknown as { Session: { getSession(): Record<string, unknown>; subscribe(fn: () => void): void; refresh(): Promise<boolean> } }).Session;
    const fields = Object.keys(session.getSession()).sort();
    let notified = 0;
    session.subscribe(() => {
      notified += 1;
    });
    await page.settle(IDLE_MS);
    expect(notified).toBe(1);
    expect(page.requests.some((r) => r.url === "/api/me/device-login")).toBe(true);
    await session.refresh();
    expect(Object.keys(session.getSession()).sort()).toEqual(fields);
  });
});
