import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openStubbedHome, pointerEvent, type StubbedHome, type StubbedHomeOptions } from "./helpers/single-column-page.js";

const LAYOUT = { tabWidth: 100, barWidth: 300 };
const LAST_POSITION = 8 * LAYOUT.tabWidth - LAYOUT.barWidth;

let page: StubbedHome | null = null;

afterEach(() => {
  page?.close();
  page = null;
});

async function open(options: Partial<StubbedHomeOptions> = {}): Promise<StubbedHome> {
  page = await openStubbedHome({ scripts: ["tabBarScroll.js"], tabBarLayout: LAYOUT, ...options });
  return page;
}

const byId = (home: StubbedHome, id: string) => home.document.getElementById(id) as HTMLElement;

describe("the tab bar's arrows", () => {
  it("has both scroll arrows in the page, hidden, and the script still runs without the arrow script", async () => {
    const html = readFileSync(path.resolve("src/public/index.html"), "utf8");
    for (const part of ["tabScrollBefore", "tabScrollAfter"]) expect(html, part).not.toContain(part);
    for (const id of ["tabScrollLeftArrow", "tabScrollRightArrow"]) {
      expect(html, id).toMatch(new RegExp(`id="${id}"[^>]*\\shidden>`));
    }
    const home = await open();
    byId(home, "tabMenuBtn").click();
    expect(byId(home, "tabMenu").hidden).toBe(false);
  });

  it("gives the menu button and the menu accessible names", async () => {
    const home = await open();
    for (const id of ["tabMenuBtn", "tabMenu"]) {
      expect(byId(home, id).getAttribute("aria-label"), id).toBeTruthy();
    }
  });
});

describe("dragging the tab bar with a mouse", () => {
  function listenToTabClicks(home: StubbedHome): { count: number } {
    const clicks = { count: 0 };
    byId(home, "tab-trending").addEventListener("click", () => {
      clicks.count += 1;
    });
    return clicks;
  }

  it("lets a movement under the threshold through as a click on the tab", async () => {
    const home = await open();
    const clicks = listenToTabClicks(home);
    const tab = byId(home, "tab-trending");
    tab.dispatchEvent(pointerEvent(home.window, "pointerdown", { clientX: 200 }));
    home.window.dispatchEvent(pointerEvent(home.window, "pointermove", { clientX: 197 }));
    home.window.dispatchEvent(pointerEvent(home.window, "pointerup", { clientX: 197 }));
    tab.dispatchEvent(new home.window.MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(clicks.count).toBe(1);
    expect(home.tabBarScroll()).toBe(0);
  });

  it("moves the bar with the pointer and does not select the tab it ends on", async () => {
    const home = await open();
    const clicks = listenToTabClicks(home);
    const tab = byId(home, "tab-trending");
    tab.dispatchEvent(pointerEvent(home.window, "pointerdown", { clientX: 200 }));
    home.window.dispatchEvent(pointerEvent(home.window, "pointermove", { clientX: 150 }));
    home.window.dispatchEvent(pointerEvent(home.window, "pointermove", { clientX: 120 }));
    expect(home.tabBarScroll()).toBe(80);
    home.window.dispatchEvent(pointerEvent(home.window, "pointerup", { clientX: 120 }));
    tab.dispatchEvent(new home.window.MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(clicks.count).toBe(0);
  });

  it("moves the bar for a pen too", async () => {
    const home = await open();
    const clicks = listenToTabClicks(home);
    const tab = byId(home, "tab-trending");
    tab.dispatchEvent(pointerEvent(home.window, "pointerdown", { clientX: 200, pointerType: "pen" }));
    home.window.dispatchEvent(pointerEvent(home.window, "pointermove", { clientX: 150, pointerType: "pen" }));
    home.window.dispatchEvent(pointerEvent(home.window, "pointermove", { clientX: 120, pointerType: "pen" }));
    expect(home.tabBarScroll()).toBe(80);
    home.window.dispatchEvent(pointerEvent(home.window, "pointerup", { clientX: 120, pointerType: "pen" }));
    tab.dispatchEvent(new home.window.MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(clicks.count).toBe(0);
  });

  it("ignores touch pointers, which scroll the bar themselves", async () => {
    const home = await open();
    const tab = byId(home, "tab-trending");
    tab.dispatchEvent(pointerEvent(home.window, "pointerdown", { clientX: 200, pointerType: "touch" }));
    home.window.dispatchEvent(pointerEvent(home.window, "pointermove", { clientX: 100, pointerType: "touch" }));
    expect(home.tabBarScroll()).toBe(0);
  });
});

describe("the mouse wheel", () => {
  function wheel(home: StubbedHome, deltaY: number, deltaX = 0): boolean {
    const event = new home.window.WheelEvent("wheel", { deltaY, deltaX, bubbles: true, cancelable: true });
    byId(home, "tabBar").dispatchEvent(event);
    return event.defaultPrevented;
  }

  const atRest = (home: StubbedHome) => byId(home, "tabBar").dispatchEvent(new home.window.Event("scrollend"));

  it("scrolls the row sideways from the start, and lets the page scroll when the row cannot move back", async () => {
    const home = await open();
    expect(wheel(home, 40)).toBe(true);
    expect(home.tabBarScroll()).toBe(40);
    expect(wheel(home, -40)).toBe(true);
    expect(home.tabBarScroll()).toBe(0);
    expect(wheel(home, -40)).toBe(false);
    expect(home.tabBarScroll()).toBe(0);
  });

  it("adds each tick to the last tick's target while the row is still gliding, and starts afresh once it has come to rest", async () => {
    const home = await open();
    wheel(home, 40);
    home.setTabBarScroll(10);
    expect(wheel(home, 40)).toBe(true);
    expect(home.tabBarScroll()).toBe(80);
    atRest(home);
    home.setTabBarScroll(80);
    expect(wheel(home, 40)).toBe(true);
    expect(home.tabBarScroll()).toBe(120);
  });

  it("lets the page scroll at the end of the row, and still moves the row back", async () => {
    const home = await open();
    home.setTabBarScroll(LAST_POSITION);
    expect(wheel(home, 40)).toBe(false);
    expect(home.tabBarScroll()).toBe(LAST_POSITION);
    expect(wheel(home, -40)).toBe(true);
    expect(home.tabBarScroll()).toBe(LAST_POSITION - 40);
  });

  it("leaves a horizontal wheel or trackpad swipe to the browser", async () => {
    const home = await open();
    expect(wheel(home, 0, 40)).toBe(false);
    expect(home.tabBarScroll()).toBe(0);
  });

  it("does nothing above 900 px, where the desktop bar is unchanged", async () => {
    const home = await open();
    home.setPhone(false);
    expect(wheel(home, 40)).toBe(false);
    expect(home.tabBarScroll()).toBe(0);
  });
});

describe("the all-tabs menu", () => {
  it("lists every tab with the current one marked", async () => {
    const home = await open();
    byId(home, "tabMenuBtn").click();
    const items = Array.from(home.document.querySelectorAll<HTMLElement>("#tabMenu .tab-menu-item"));
    expect(items).toHaveLength(8);
    expect(items.filter((item) => item.classList.contains("is-active")).map((item) => item.dataset.tab)).toEqual(["trending"]);
    expect(byId(home, "tabMenuBtn").getAttribute("aria-expanded")).toBe("true");
    expect(byId(home, "tabMenu").hidden).toBe(false);
  });

  it("copies a guest's greyed tabs and hands a choice to the real tab, which alone scrolls into view", async () => {
    const home = await open();
    byId(home, "tab-your-polls").setAttribute("aria-disabled", "true");
    const chosen: string[] = [];
    const scrolled: string[] = [];
    for (const tab of Array.from(home.document.querySelectorAll<HTMLElement>("#tabBar .tab"))) {
      tab.addEventListener("click", () => chosen.push(tab.dataset.tab as string));
      tab.scrollIntoView = () => scrolled.push(tab.dataset.tab as string);
    }
    byId(home, "tabMenuBtn").click();
    const greyed = home.document.querySelector('#tabMenu .tab-menu-item[data-tab="your-polls"]') as HTMLElement;
    expect(greyed.getAttribute("aria-disabled")).toBe("true");
    greyed.click();
    expect(chosen).toEqual(["your-polls"]);
    expect(byId(home, "tabMenu").hidden).toBe(true);

    byId(home, "tabMenuBtn").click();
    (home.document.querySelector('#tabMenu .tab-menu-item[data-tab="newest"]') as HTMLElement).click();
    expect(chosen).toEqual(["your-polls", "newest"]);
    expect(scrolled).toEqual([]);
  });

  it("moves with the arrow keys and closes on Escape, returning focus to the button", async () => {
    const home = await open();
    byId(home, "tabMenuBtn").click();
    const items = Array.from(home.document.querySelectorAll<HTMLElement>("#tabMenu .tab-menu-item"));
    expect(home.document.activeElement).toBe(items[3]);
    items[3].dispatchEvent(new home.window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    expect(home.document.activeElement).toBe(items[4]);
    items[4].dispatchEvent(new home.window.KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true }));
    expect(home.document.activeElement).toBe(items[0]);
    items[0].dispatchEvent(new home.window.KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    expect(home.document.activeElement).toBe(items[7]);

    home.document.dispatchEvent(new home.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(byId(home, "tabMenu").hidden).toBe(true);
    expect(home.document.activeElement).toBe(byId(home, "tabMenuBtn"));
  });

  it("closes on a tap outside", async () => {
    const home = await open();
    byId(home, "tabMenuBtn").click();
    home.document.body.click();
    expect(byId(home, "tabMenu").hidden).toBe(true);
    expect(byId(home, "tabMenuBtn").getAttribute("aria-expanded")).toBe("false");
  });
});

describe("the More item", () => {
  it("ends the row after Search, and is neither a tab nor a menu item", async () => {
    const home = await open();
    const more = byId(home, "tabMoreBtn");
    expect(byId(home, "tabBar").lastElementChild).toBe(more);
    expect(more.previousElementSibling).toBe(byId(home, "tab-search"));
    expect(more.classList.contains("tab")).toBe(false);
    expect(more.getAttribute("role")).toBeNull();
    expect(more.getAttribute("aria-label")).toBe("More");
    expect(more.textContent?.trim()).toBe("More");
    more.click();
    const items = Array.from(home.document.querySelectorAll<HTMLElement>("#tabMenu .tab-menu-item"));
    expect(items).toHaveLength(8);
    expect(items.map((item) => item.dataset.tab)).not.toContain(undefined);
  });

  it("opens and closes the all-tabs menu, which the All tabs button still opens", async () => {
    const home = await open();
    const more = byId(home, "tabMoreBtn");
    more.click();
    expect(byId(home, "tabMenu").hidden).toBe(false);
    expect(more.getAttribute("aria-expanded")).toBe("true");
    expect(byId(home, "tabMenuBtn").getAttribute("aria-expanded")).toBe("false");
    more.click();
    expect(byId(home, "tabMenu").hidden).toBe(true);
    expect(more.getAttribute("aria-expanded")).toBe("false");

    byId(home, "tabMenuBtn").click();
    expect(byId(home, "tabMenu").hidden).toBe(false);
    expect(byId(home, "tabMenuBtn").getAttribute("aria-expanded")).toBe("true");
    expect(more.getAttribute("aria-expanded")).toBe("false");
  });

  it("returns focus to More on Escape and after a choice", async () => {
    const home = await open();
    const more = byId(home, "tabMoreBtn");
    more.click();
    home.document.dispatchEvent(new home.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(byId(home, "tabMenu").hidden).toBe(true);
    expect(home.document.activeElement).toBe(more);

    more.click();
    (home.document.querySelector('#tabMenu .tab-menu-item[data-tab="newest"]') as HTMLElement).click();
    expect(byId(home, "tabMenu").hidden).toBe(true);
    expect(home.document.activeElement).toBe(more);
  });
});
