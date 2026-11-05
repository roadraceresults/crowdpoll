import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { JSDOM } from "jsdom";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import { startTestContext, type TestContext } from "./helpers/setup.js";

let ctx: TestContext;
let page: BrowserPage | null = null;

beforeAll(async () => {
  ctx = await startTestContext();
});

afterAll(async () => {
  await ctx.stop();
});

afterEach(() => {
  page?.close();
  page = null;
});

type Recorded = JSDOM["window"] & { goCalls: number[]; logged: unknown[][] };

async function open(options: { referrer?: string; earlierEntry?: boolean; state?: Record<string, unknown> } = {}) {
  const { referrer = "http://localhost/login", earlierEntry = true, state } = options;
  page = await openPage(ctx, "privacy.html", {
    url: "http://localhost/privacy",
    referrer: URL.canParse(referrer) ? referrer : undefined,
    scripts: ["tooltip-m3.js", "backArrow.js"],
    beforeScripts: (window) => {
      const w = window as Recorded;
      if (!URL.canParse(referrer)) Object.defineProperty(window.document, "referrer", { value: referrer });
      if (earlierEntry) window.history.pushState(null, "", "/privacy");
      if (state) window.history.replaceState(state, "");
      w.goCalls = [];
      window.history.go = ((delta: number) => {
        w.goCalls.push(delta);
      }) as typeof window.history.go;
      w.logged = [];
      for (const level of ["log", "info", "warn", "error", "debug"] as const) {
        window.console[level] = (...args: unknown[]) => {
          w.logged.push([level, ...args]);
        };
      }
    }
  });
  return page;
}

const recorded = (p: BrowserPage) => p.window as Recorded;
const arrow = (p: BrowserPage) => p.document.getElementById("backArrow") as HTMLButtonElement | null;

async function stepTo(p: BrowserPage, hash: string) {
  p.window.location.hash = hash;
  await p.settle();
}

describe("the legal pages' Back arrow", () => {
  it("shows after a CrowdPoll page in the same tab, directly under the header", async () => {
    const p = await open();
    const button = arrow(p)!;
    expect(button).not.toBeNull();
    expect(button.parentElement!.className).toBe("back-arrow-bar");
    expect(p.document.getElementById("site-header")!.nextElementSibling).toBe(button.parentElement);
    expect(button.type).toBe("button");
    expect(button.className).toBe("back-arrow");
    expect(button.getAttribute("aria-label")).toBe("Back");
    expect(button.getAttribute("data-tooltip")).toBe("Back");
    expect(button.querySelectorAll("svg path")).toHaveLength(2);
  });

  for (const [name, options] of [
    ["no previous page", { referrer: "" }],
    ["a page on another site", { referrer: "https://example.com/somewhere" }],
    ["a malformed referrer", { referrer: "not a url" }],
    ["a new tab", { earlierEntry: false }]
  ] as const) {
    it(`adds nothing for ${name}`, async () => {
      const p = await open(options);
      expect(arrow(p)).toBeNull();
      expect(p.document.querySelector(".back-arrow-bar")).toBeNull();
    });
  }

  it("goes back one entry when no anchor was followed", async () => {
    const p = await open();
    await p.click("#backArrow");
    expect(recorded(p).goCalls).toEqual([-1]);
  });

  it("goes back past every anchor step", async () => {
    const p = await open();
    await stepTo(p, "#cookies");
    await stepTo(p, "#bot-check");
    await p.click("#backArrow");
    expect(recorded(p).goCalls).toEqual([-3]);
  });

  it("counts from the entry the reader went back to", async () => {
    const p = await open();
    await stepTo(p, "#cookies");
    await stepTo(p, "#bot-check");
    p.window.history.back();
    await p.settle();
    expect(p.window.location.hash).toBe("#cookies");
    await p.click("#backArrow");
    expect(recorded(p).goCalls).toEqual([-2]);
  });

  it("counts an anchor step that fires both popstate and hashchange once", async () => {
    const p = await open();
    p.window.history.pushState(null, "", "/privacy#rights");
    p.window.dispatchEvent(new p.window.PopStateEvent("popstate", { state: null }));
    p.window.dispatchEvent(new p.window.HashChangeEvent("hashchange"));
    await p.settle();
    await p.click("#backArrow");
    expect(recorded(p).goCalls).toEqual([-2]);
  });

  it("keeps the number an entry already carries, as after a reload", async () => {
    const p = await open({ state: { legalDepth: 2 } });
    expect(p.window.history.state.legalDepth).toBe(2);
    await p.click("#backArrow");
    expect(recorded(p).goCalls).toEqual([-3]);
  });

  it("keeps the other keys of the history entry", async () => {
    const p = await open({ state: { scroll: 120 } });
    expect(p.window.history.state).toEqual({ scroll: 120, legalDepth: 0 });
  });

  it("writes nothing to the browser console", async () => {
    const p = await open();
    await stepTo(p, "#cookies");
    await p.click("#backArrow");
    p.close();
    const hidden = await open({ referrer: "not a url" });
    expect(recorded(p).logged).toEqual([]);
    expect(recorded(hidden).logged).toEqual([]);
  });
});
