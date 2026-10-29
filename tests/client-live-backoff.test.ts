import { readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const publicDir = path.resolve("src/public");
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

type Reply = { status: number; body?: unknown } | { refused: number };

/**
 * liveResults.js alone, behind a stub of window.Tabs: requests take the scripted
 * replies in turn, and the page's clock and timers are driven by the test.
 */
async function livePage() {
  const dom = new JSDOM('<div class="tab-panel" data-panel="live"><div class="card-grid"></div></div>', {
    url: "http://localhost/",
    runScripts: "outside-only",
    pretendToBeVisual: true
  });
  const { window } = dom;
  let now = 1_000_000;
  let nextId = 1;
  const timers = new Map<number, { fn: () => void; at: number }>();
  const waits: number[] = [];
  const replies: Reply[] = [];
  let refusalWait = 0;
  let controller: Record<string, (...args: unknown[]) => unknown> = {};
  let onClose: (pid: string) => Promise<void> = async () => {};

  window.Date.now = () => now;
  window.Math.random = () => 0;
  window.setTimeout = ((fn: () => void, ms: number) => {
    const id = nextId++;
    timers.set(id, { fn, at: now + ms });
    waits.push(ms);
    return id;
  }) as unknown as typeof window.setTimeout;
  window.clearTimeout = ((id: number) => {
    timers.delete(id);
  }) as typeof window.clearTimeout;

  const reply = async (onResponse: (body: unknown, res: unknown) => Promise<void>) => {
    const next = replies.shift() ?? { status: 304 };
    if ("refused" in next) {
      refusalWait = next.refused;
      return false;
    }
    const res = { status: next.status, json: async () => next.body };
    await onResponse(next.status === 200 ? next.body : null, res);
    return true;
  };

  (window as unknown as { Tabs: unknown }).Tabs = {
    config: async () => ({ floors: { live: 2000 }, liveResultsMaxIdleTimeMs: 1e12 }),
    createOverlayFetcher: () => ({ fetch: async () => {}, reset() {} }),
    createGrid: (_el: unknown, opts: { onClose: typeof onClose }) => {
      onClose = opts.onClose;
      return { render() {}, reapply() {}, cardOf: () => null };
    },
    register: (_name: string, c: typeof controller) => {
      controller = c;
    },
    active: () => "live",
    select: async () => {},
    emptyState() {},
    notice() {},
    modal() {},
    isSignedIn: () => true,
    canRequest: () => true,
    nextAllowedIn: () => refusalWait,
    overlayOf: () => null,
    dynamicRequest: async (_name: string, _url: string, _init: unknown, onResponse: (body: unknown, res: unknown) => Promise<void>) =>
      reply(onResponse)
  };
  window.eval(readFileSync(path.join(publicDir, "deltaClient.js"), "utf8"));
  window.eval(readFileSync(path.join(publicDir, "liveResults.js"), "utf8"));

  const served = (nextRefreshMs = 2000) => ({
    status: 200,
    body: { membershipVersion: "m1", order: ["p1"], cards: {}, counters: {}, nextRefreshMs }
  });

  /** The wait of the one timer still pending. */
  const pending = () => {
    const [entry] = [...timers.values()];
    return entry ? entry.at - now : null;
  };

  /** Lets the pending timer fire, answering its request with `next`. */
  async function fire(next: Reply) {
    replies.push(next);
    const [[id, entry]] = [...timers.entries()];
    timers.delete(id!);
    now = entry!.at;
    entry!.fn();
    for (let i = 0; i < 10; i++) await flush();
  }

  async function open(first: Reply = served()) {
    replies.push(first);
    await controller.activate!();
    for (let i = 0; i < 10; i++) await flush();
  }

  return { window, waits, replies, pending, fire, open, controller: () => controller, remove: (pid: string) => onClose(pid), served, close: () => window.close() };
}

describe("the Live Results back-off", () => {
  it("doubles the wait after each unchanged answer, 2, 4, 8, 10, 10 s", async () => {
    const page = await livePage();
    await page.open();
    expect(page.pending()).toBe(2000);
    const seen: number[] = [page.pending()!];
    for (let i = 0; i < 4; i++) {
      await page.fire({ status: 304 });
      seen.push(page.pending()!);
    }
    expect(seen).toEqual([2000, 4000, 8000, 10000, 10000]);
    page.close();
  });

  it("returns to nextRefreshMs after a changed answer", async () => {
    const page = await livePage();
    await page.open();
    await page.fire({ status: 304 });
    await page.fire({ status: 304 });
    expect(page.pending()).toBe(8000);
    await page.fire(page.served(2000));
    expect(page.pending()).toBe(2000);
    await page.fire({ status: 304 });
    expect(page.pending()).toBe(4000);
    page.close();
  });

  it("never waits less than a stretched nextRefreshMs", async () => {
    const page = await livePage();
    await page.open(page.served(16000));
    expect(page.pending()).toBe(16000);
    await page.fire({ status: 304 });
    expect(page.pending()).toBe(16000);
    page.close();
  });

  it("starts again from the interval on a vote, an add or a remove", async () => {
    const page = await livePage();
    const backedOff = async () => {
      for (let i = 0; i < 3; i++) await page.fire({ status: 304 });
      expect(page.pending()).toBe(10000);
    };
    await page.open();

    await backedOff();
    page.controller().onVoted!("p1");
    for (let i = 0; i < 5; i++) await flush();
    expect(page.pending()).toBe(2000);
    await page.fire({ status: 304 });
    expect(page.pending()).toBe(4000);

    await backedOff();
    page.replies.push({ status: 200, body: { polls: ["p1", "p2"] } });
    await (page.window as unknown as { LiveResults: { addPoll(pid: string): Promise<void> } }).LiveResults.addPoll("p2");
    for (let i = 0; i < 5; i++) await flush();
    expect(page.pending()).toBe(2000);

    await backedOff();
    page.replies.push({ status: 200, body: { polls: ["p1"] } });
    await page.remove("p2");
    for (let i = 0; i < 5; i++) await flush();
    expect(page.pending()).toBe(2000);
    page.close();
  });

  it("starts again when the page becomes visible, but not on a window focus", async () => {
    const page = await livePage();
    await page.open();
    for (let i = 0; i < 3; i++) await page.fire({ status: 304 });
    expect(page.pending()).toBe(10000);
    page.window.dispatchEvent(new page.window.Event("focus"));
    for (let i = 0; i < 5; i++) await flush();
    expect(page.pending()).toBe(10000);

    page.replies.push({ status: 304 });
    page.window.document.dispatchEvent(new page.window.Event("visibilitychange"));
    for (let i = 0; i < 10; i++) await flush();
    expect(page.pending()).toBe(4000);
    page.close();
  });

  for (const status of [429, 503]) {
    it(`keeps the refusal's wait on a ${status} and starts the back-off again after it`, async () => {
      const page = await livePage();
      await page.open();
      for (let i = 0; i < 3; i++) await page.fire({ status: 304 });
      expect(page.pending()).toBe(10000);
      // dynamicRequest handles both alike: no callback, the hold-off read back through nextAllowedIn.
      await page.fire({ refused: status === 429 ? 3000 : 2500 });
      expect(page.pending()).toBe(status === 429 ? 3000 : 2500);
      await page.fire({ status: 304 });
      expect(page.pending()).toBe(4000);
      page.close();
    });
  }
});
