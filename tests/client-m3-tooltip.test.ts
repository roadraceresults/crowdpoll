import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import { trendingSweep } from "../src/polls/sweeps.js";

const HOME_SCRIPTS = ["app.js", "pollCard.js", "voteClient.js", "deltaClient.js", "tabs.js", "trending.js", "newest.js", "searchTab.js", "liveResults.js"];

let ctx: TestContext;
let page: BrowserPage | null = null;

beforeAll(async () => {
  ctx = await startTestContext();
});

afterAll(async () => {
  page?.close();
  await ctx.stop();
});

beforeEach(async () => {
  page?.close();
  page = null;
  await polls(ctx).deleteMany({});
  await polls(ctx).insertOne(makePoll({ title: "Tooltips" }));
  await trendingSweep(ctx, ctx.config, ctx.trendingPublisher);
  page = await openPage(ctx, "index.html", { scripts: [...HOME_SCRIPTS, "tooltip-m3.js"] });
});

const tip = (p: BrowserPage) => p.document.querySelector(".m3-tooltip") as HTMLElement;
const shownText = (p: BrowserPage) => (tip(p).hidden ? null : tip(p).textContent);
const card = (p: BrowserPage) => p.document.querySelector('.tab-panel[data-panel="trending"] .card-front') as HTMLElement;

function pointer(p: BrowserPage, target: EventTarget, type: string, pointerType = "mouse", relatedTarget: EventTarget | null = null): Event {
  const event = new p.window.MouseEvent(type, { bubbles: true, cancelable: true, relatedTarget: relatedTarget as Element | null });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  target.dispatchEvent(event);
  return event;
}

function key(p: BrowserPage, k: string) {
  p.document.dispatchEvent(new p.window.KeyboardEvent("keydown", { key: k, bubbles: true }));
}

describe("M3 tooltips", () => {
  it("take over every title, now and later", async () => {
    const p = page!;
    expect(p.document.querySelectorAll("[title]").length).toBe(0);
    const maximize = card(p).querySelector(".maximize-btn") as HTMLElement;
    expect(maximize.dataset.tooltip).toBe("Maximize Poll");

    maximize.setAttribute("title", "Changed");
    await p.settle();
    expect(maximize.hasAttribute("title")).toBe(false);
    expect(maximize.dataset.tooltip).toBe("Changed");

    maximize.setAttribute("title", "");
    await p.settle();
    expect(maximize.hasAttribute("data-tooltip")).toBe(false);
  });

  it("show half a second after the pointer enters and hide shortly after it leaves", async () => {
    const p = page!;
    const maximize = card(p).querySelector(".maximize-btn") as HTMLElement;
    pointer(p, maximize, "pointerover");
    // A bare timer: settle() adds ~30 short ticks, which Windows' ~15.6 ms timer
    // resolution stretches past the 500 ms show delay.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(shownText(p)).toBeNull();
    await p.settle(400);
    expect(shownText(p)).toBe("Maximize Poll");

    pointer(p, maximize, "pointerout", "mouse", p.document.body);
    await p.settle(250);
    expect(shownText(p)).toBeNull();
  });

  it("show at once on keyboard focus, and Escape hides them", async () => {
    const p = page!;
    key(p, "Tab");
    const maximize = card(p).querySelector(".maximize-btn") as HTMLElement;
    maximize.focus();
    expect(shownText(p)).toBe("Maximize Poll");
    key(p, "Escape");
    expect(shownText(p)).toBeNull();
  });

  it("show on a long press on touch without activating the control or opening a menu", async () => {
    const p = page!;
    const maximize = card(p).querySelector(".maximize-btn") as HTMLElement;
    pointer(p, maximize, "pointerdown", "touch");
    await p.settle(600);
    expect(shownText(p)).toBe("Maximize Poll");
    pointer(p, maximize, "pointerup", "touch");
    const click = new p.window.MouseEvent("click", { bubbles: true, cancelable: true });
    maximize.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(pointer(p, maximize, "contextmenu").defaultPrevented).toBe(true);
  });

  it("show a result row's label only while it is cut off", async () => {
    const p = page!;
    const row = card(p).querySelector(".result-row") as HTMLElement;
    expect(row).not.toBeNull();
    const label = row.querySelector(".result-label") as HTMLElement;
    const widths = (scroll: number, client: number) => {
      Object.defineProperty(label, "scrollWidth", { value: scroll, configurable: true });
      Object.defineProperty(label, "clientWidth", { value: client, configurable: true });
    };

    widths(80, 80);
    pointer(p, row, "pointerover");
    await p.settle(600);
    expect(shownText(p)).toBeNull();

    pointer(p, row, "pointerout", "mouse", p.document.body);
    await p.settle(200);
    widths(160, 80);
    pointer(p, row, "pointerover");
    await p.settle(600);
    expect(shownText(p)).toBe(row.dataset.tooltip);
  });

  it("sit above their control, where the pointer does not cover them, and below only when there is no room above", () => {
    const p = page!;
    const root = p.document.documentElement;
    Object.defineProperty(root, "clientWidth", { value: 1024, configurable: true });
    Object.defineProperty(root, "clientHeight", { value: 768, configurable: true });
    Object.defineProperty(tip(p), "offsetWidth", { value: 120, configurable: true });
    Object.defineProperty(tip(p), "offsetHeight", { value: 24, configurable: true });
    const maximize = card(p).querySelector(".maximize-btn") as HTMLElement;
    const at = (top: number) => {
      maximize.getBoundingClientRect = () => ({ top, bottom: top + 32, left: 500, right: 532, width: 32, height: 32, x: 500, y: top, toJSON() {} }) as DOMRect;
    };
    key(p, "Tab");

    at(300);
    maximize.focus();
    expect(shownText(p)).toBe("Maximize Poll");
    expect(tip(p).style.top).toBe("272px");
    expect(tip(p).style.left).toBe("456px");
    key(p, "Escape");
    maximize.blur();

    at(10);
    maximize.focus();
    expect(tip(p).style.top).toBe("46px");
  });

  it("explain a guest's personal tab", async () => {
    const p = page!;
    key(p, "Tab");
    (p.document.querySelector('.tab[data-tab="watching"]') as HTMLElement).focus();
    expect(shownText(p)).toBe("Sign in to use this tab");
  });
});
