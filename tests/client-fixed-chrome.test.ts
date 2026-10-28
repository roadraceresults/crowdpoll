import { afterEach, describe, expect, it } from "vitest";
import { openStubbedHome, type StubbedHome } from "./helpers/single-column-page.js";

let page: StubbedHome | null = null;

afterEach(() => {
  page?.close();
  page = null;
});

function stubOffsetHeight(element: HTMLElement, initial: number) {
  const state = { value: initial };
  Object.defineProperty(element, "offsetHeight", { configurable: true, get: () => state.value });
  return {
    set(value: number) {
      state.value = value;
    }
  };
}

function property(home: StubbedHome, name: string): string {
  return home.window.getComputedStyle(home.document.documentElement).getPropertyValue(name).trim();
}

function fixedChrome(home: StubbedHome) {
  return (home.window as unknown as { FixedChrome?: { height(): number } }).FixedChrome;
}

describe("measuring the fixed chrome", () => {
  it("equals the header alone when there is no Tab Bar", async () => {
    page = await openStubbedHome({
      scripts: ["fixedChrome.js"],
      beforeScripts: (window) => {
        window.document.querySelector(".tab-bar-wrap")?.remove();
        stubOffsetHeight(window.document.getElementById("site-header") as HTMLElement, 56);
      }
    });
    expect(property(page, "--fixed-chrome-height-header")).toBe("56px");
    expect(property(page, "--fixed-chrome-height")).toBe("56px");
    expect(fixedChrome(page)?.height()).toBe(56);
  });

  it("does not throw, and sets nothing, on a page without the header", async () => {
    page = await openStubbedHome({
      scripts: ["fixedChrome.js"],
      beforeScripts: (window) => {
        window.document.getElementById("site-header")?.remove();
      }
    });
    expect(fixedChrome(page)).toBeUndefined();
  });

  it("sums the header and the Tab Bar when both are present", async () => {
    page = await openStubbedHome({
      scripts: ["fixedChrome.js"],
      beforeScripts: (window) => {
        stubOffsetHeight(window.document.getElementById("site-header") as HTMLElement, 56);
        stubOffsetHeight(window.document.querySelector(".tab-bar-wrap") as HTMLElement, 48);
      }
    });
    expect(property(page, "--fixed-chrome-height-header")).toBe("56px");
    expect(property(page, "--fixed-chrome-height")).toBe("104px");
  });
});

describe("the Hamburger and Refresh row under the Tab Bar", () => {
  it("adds the Tab Bar's bottom margin, the row the pinned bar reserves, to the total but not to the header", async () => {
    page = await openStubbedHome({
      scripts: ["fixedChrome.js"],
      beforeScripts: (window) => {
        stubOffsetHeight(window.document.getElementById("site-header") as HTMLElement, 56);
        const wrap = window.document.querySelector(".tab-bar-wrap") as HTMLElement;
        stubOffsetHeight(wrap, 56);
        wrap.style.marginBottom = "60px";
      }
    });
    expect(property(page, "--fixed-chrome-height-header")).toBe("56px");
    expect(property(page, "--fixed-chrome-height")).toBe("172px");
    expect(fixedChrome(page)?.height()).toBe(172);
  });
});

describe("telling others the chrome has moved", () => {
  it("dispatches fixedchromechange on window after each measurement", async () => {
    let fired = 0;
    page = await openStubbedHome({
      scripts: ["fixedChrome.js"],
      beforeScripts: (window) => {
        window.addEventListener("fixedchromechange", () => {
          fired += 1;
        });
        stubOffsetHeight(window.document.getElementById("site-header") as HTMLElement, 56);
      }
    });
    expect(property(page, "--fixed-chrome-height-header")).toBe("56px");
    expect(fired).toBeGreaterThanOrEqual(1);
  });
});

describe("the six pages without a Tab Bar", () => {
  it("reserves exactly the header's own height, with the tab-bar-wrap term contributing nothing", async () => {
    page = await openStubbedHome({
      scripts: ["fixedChrome.js"],
      beforeScripts: (window) => {
        window.document.querySelector(".tab-bar-wrap")?.remove();
        stubOffsetHeight(window.document.getElementById("site-header") as HTMLElement, 64);
      }
    });
    expect(property(page, "--fixed-chrome-height")).toBe(property(page, "--fixed-chrome-height-header"));
    expect(property(page, "--fixed-chrome-height")).toBe("64px");
  });
});

describe("re-measuring", () => {
  it("updates after a ResizeObserver fire", async () => {
    const observers: Array<{ callback: () => void; targets: Set<Element> }> = [];
    let header: { set(value: number): void } | null = null;
    page = await openStubbedHome({
      scripts: ["fixedChrome.js"],
      beforeScripts: (window) => {
        (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
          readonly entry = { callback: () => {}, targets: new Set<Element>() };
          constructor(callback: () => void) {
            this.entry.callback = callback;
            observers.push(this.entry);
          }
          observe(target: Element) {
            this.entry.targets.add(target);
          }
          disconnect() {
            this.entry.targets.clear();
          }
        };
        window.document.querySelector(".tab-bar-wrap")?.remove();
        header = stubOffsetHeight(window.document.getElementById("site-header") as HTMLElement, 56);
      }
    });
    expect(property(page, "--fixed-chrome-height")).toBe("56px");

    header?.set(72);
    observers[0].callback();
    await page.settle(30);
    expect(property(page, "--fixed-chrome-height")).toBe("72px");
  });

  it("updates after the header is rebuilt", async () => {
    page = await openStubbedHome({
      scripts: ["fixedChrome.js"],
      beforeScripts: (window) => {
        window.document.querySelector(".tab-bar-wrap")?.remove();
        stubOffsetHeight(window.document.getElementById("site-header") as HTMLElement, 56);
      }
    });
    expect(property(page, "--fixed-chrome-height")).toBe("56px");

    const header = page.document.getElementById("site-header") as HTMLElement;
    stubOffsetHeight(header, 90);
    header.appendChild(page.document.createElement("span"));
    await page.settle(30);
    expect(property(page, "--fixed-chrome-height")).toBe("90px");
  });

  it("updates once the fonts have loaded", async () => {
    let release: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    page = await openStubbedHome({
      scripts: ["fixedChrome.js"],
      beforeScripts: (window) => {
        window.document.querySelector(".tab-bar-wrap")?.remove();
        stubOffsetHeight(window.document.getElementById("site-header") as HTMLElement, 56);
        Object.defineProperty(window.document, "fonts", { value: { ready }, configurable: true });
      }
    });
    expect(property(page, "--fixed-chrome-height")).toBe("56px");

    stubOffsetHeight(page.document.getElementById("site-header") as HTMLElement, 80);
    release();
    await page.settle(30);
    expect(property(page, "--fixed-chrome-height")).toBe("80px");
  });
});
