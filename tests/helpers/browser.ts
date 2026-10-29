import { readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import request from "supertest";
import type { TestContext } from "./setup.js";

const publicDir = path.resolve("src/public");

export interface BrowserPage {
  window: JSDOM["window"];
  document: Document;
  /** Every request the page made, in order. */
  requests: { method: string; url: string }[];
  /** One entry per attempted navigation (jsdom reports it without the target URL). */
  navigations: string[];
  /** Runs the queued microtasks and timers the page is waiting on. */
  settle(ms?: number): Promise<void>;
  click(selector: string): Promise<void>;
  submitForm(selector: string, values: Record<string, string>): Promise<void>;
  cardTitles(panel: string): string[];
  close(): void;
}

function toHeaders(init?: RequestInit): Record<string, string> {
  const out: Record<string, string> = {};
  const headers = init?.headers as Record<string, string> | undefined;
  if (headers) for (const [k, v] of Object.entries(headers)) out[k] = String(v);
  return out;
}

/**
 * Loads a page from src/public into jsdom with its scripts, routing fetch() to
 * the app under test. The session cookie, when given, rides on every request.
 */
export async function openPage(
  ctx: TestContext,
  file: string,
  options: {
    cookie?: string;
    scripts?: string[];
    /** The page's own address; jsdom ignores a navigation to the address it is already at. */
    url?: string;
    sessionStorage?: Record<string, string>;
    /** Runs against the window before the page's scripts, e.g. to install a browser API jsdom lacks. */
    beforeScripts?: (window: JSDOM["window"]) => void;
  } = {}
): Promise<BrowserPage> {
  const html = readFileSync(path.join(publicDir, file), "utf8").replace(/<script[^>]*><\/script>/g, "");
  const virtualConsole = new VirtualConsole();
  const navigations: string[] = [];
  virtualConsole.on("jsdomError", (error) => {
    if (/navigation/i.test(error.message)) navigations.push(error.message);
  });
  const dom = new JSDOM(html, { url: options.url ?? "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true, virtualConsole });
  const { window } = dom;
  const requests: { method: string; url: string; status?: number }[] = [];
  const etags = new Map<string, { etag: string; body: string; status: number; headers: Record<string, string> }>();

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    const pathname = url.startsWith("http") ? new URL(url).pathname + new URL(url).search : url;
    const record: { method: string; url: string; status?: number } = { method, url: pathname };
    requests.push(record);
    let req = request(ctx.app)[method.toLowerCase() as "get" | "post" | "delete" | "patch"](pathname);
    if (options.cookie) req = req.set("Cookie", options.cookie);
    for (const [k, v] of Object.entries(toHeaders(init))) req = req.set(k, v);
    const cached = etags.get(pathname);
    if (cached && method === "GET") req = req.set("If-None-Match", cached.etag);
    if (init?.body) req = req.send(typeof init.body === "string" ? JSON.parse(init.body) : init.body);
    const res = await req;
    const headers = new Map(Object.entries(res.headers as Record<string, string>));
    let status = res.status;
    record.status = status;
    let text = res.text ?? "";
    if (status === 304 && cached && method === "GET") {
      status = cached.status;
      text = cached.body;
    } else if (status === 200 && method === "GET" && headers.get("etag")) {
      etags.set(pathname, { etag: headers.get("etag")!, body: text, status, headers: Object.fromEntries(headers) });
    }
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
      json: async () => JSON.parse(text || "null"),
      text: async () => text
    } as unknown as Response;
  }) as typeof fetch;

  if (options.sessionStorage) {
    for (const [k, v] of Object.entries(options.sessionStorage)) window.sessionStorage.setItem(k, v);
  }

  if (options.beforeScripts) options.beforeScripts(window);
  const scripts = options.scripts ?? ["app.js", "pollCard.js", "voteClient.js", "deltaClient.js", "tabs.js", "trending.js", "newest.js", "searchTab.js", "liveResults.js"];
  for (const name of scripts) {
    window.eval(readFileSync(path.join(publicDir, name), "utf8"));
  }
  // Yields by the clock, not by counted timers: on Windows every timer waits for the
  // ~15.6 ms system tick, which tripled a settle and let the floors' tests outrun the floor.
  const flush = async (ms: number) => {
    const end = performance.now() + ms;
    do await new Promise((resolve) => setImmediate(resolve));
    while (performance.now() < end);
  };
  const settle = async (ms = 0) => {
    await flush(100);
    if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
    await flush(50);
  };
  // jsdom fires DOMContentLoaded itself once construction settles; the scripts above
  // registered their listeners synchronously, so waiting is enough.
  if (window.document.readyState === "loading") {
    await new Promise<void>((resolve) => window.addEventListener("DOMContentLoaded", () => resolve(), { once: true }));
  } else {
    window.document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));
  }
  await settle();

  return {
    window,
    document: window.document,
    requests,
    navigations,
    settle,
    async click(selector) {
      const el = window.document.querySelector(selector) as HTMLElement | null;
      if (!el) throw new Error(`No element matches ${selector}`);
      el.click();
      await settle();
    },
    async submitForm(selector, values) {
      const form = window.document.querySelector(selector) as HTMLFormElement | null;
      if (!form) throw new Error(`No form matches ${selector}`);
      for (const [id, value] of Object.entries(values)) (window.document.getElementById(id) as HTMLInputElement).value = value;
      form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
      await settle();
    },
    cardTitles(panel) {
      return Array.from(
        window.document.querySelectorAll(`.tab-panel[data-panel="${panel}"] .card-front .question`)
      ).map((el) => el.textContent ?? "");
    },
    close() {
      window.close();
    }
  };
}

/**
 * Feature 20261028 R7: Refresh on Trending and Newest waits until the copy is as old as the
 * published max-age, min(recompute interval, 10 s). Suites that press it after a short settle
 * take a 1 s interval, so the max-age is 1 s.
 */
export const LISTING_MAX_AGE_1S = { ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL: "1000", ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL: "1000" };
