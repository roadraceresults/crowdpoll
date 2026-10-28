import { afterEach, describe, expect, it } from "vitest";
import { openStubbedHome, type StubbedHome, type StubbedHomeOptions } from "./helpers/single-column-page.js";

let page: StubbedHome | null = null;

afterEach(() => {
  page?.close();
  page = null;
});

async function open(options: Partial<StubbedHomeOptions> = {}): Promise<StubbedHome> {
  const { beforeScripts, ...rest } = options;
  page = await openStubbedHome({
    scripts: ["backToTopFab.js"],
    phone: false,
    ...rest,
    beforeScripts: (window) => {
      Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
      (window as unknown as { scrollCalls: unknown[] }).scrollCalls = [];
      window.scrollTo = ((init: ScrollToOptions) => {
        (window as unknown as { scrollCalls: unknown[] }).scrollCalls.push(init);
      }) as typeof window.scrollTo;
      beforeScripts?.(window);
    }
  });
  return page;
}

function button(home: StubbedHome): HTMLElement {
  return home.document.getElementById("backToTopFab") as HTMLElement;
}

function scrollCalls(home: StubbedHome): unknown[] {
  return (home.window as unknown as { scrollCalls: unknown[] }).scrollCalls;
}

async function scrollTo(home: StubbedHome, y: number) {
  Object.defineProperty(home.window, "scrollY", { value: y, writable: true, configurable: true });
  home.window.dispatchEvent(new home.window.Event("scroll"));
  await home.settle(30);
}

describe("the Back to Top button", () => {
  it("exists with the tooltip, the accessible label and an icon", async () => {
    const home = await open();
    const btn = button(home);
    expect(btn.getAttribute("aria-label")).toBe("Back to top");
    expect(btn.getAttribute("title")).toBe("Back to top");
    expect(btn.querySelector("svg")).not.toBeNull();
  });

  it("is hidden until the user has scrolled 600 pixels", async () => {
    const home = await open();
    expect(button(home).classList.contains("is-visible")).toBe(false);
    await scrollTo(home, 600);
    expect(button(home).classList.contains("is-visible")).toBe(true);
  });

  it("scrolls smoothly to the top on click", async () => {
    const home = await open();
    await scrollTo(home, 600);
    button(home).click();
    expect(scrollCalls(home).at(-1)).toEqual({ top: 0, behavior: "smooth" });
  });

  it("scrolls instantly under reduced motion", async () => {
    const home = await open({ reducedMotion: true });
    await scrollTo(home, 600);
    button(home).click();
    expect(scrollCalls(home).at(-1)).toEqual({ top: 0, behavior: "auto" });
  });

  it("activates the same way from the keyboard, with Enter and with Space", async () => {
    const home = await open();
    await scrollTo(home, 600);
    button(home).dispatchEvent(new home.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(scrollCalls(home).at(-1)).toEqual({ top: 0, behavior: "smooth" });
    button(home).dispatchEvent(new home.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
    expect(scrollCalls(home).at(-1)).toEqual({ top: 0, behavior: "smooth" });
  });

  it("hides again once scrolled back under 400 pixels", async () => {
    const home = await open();
    await scrollTo(home, 600);
    expect(button(home).classList.contains("is-visible")).toBe(true);
    await scrollTo(home, 399);
    expect(button(home).classList.contains("is-visible")).toBe(false);
  });

  it("never flickers across 10 up-and-down passes through the 400-600 pixel range", async () => {
    const home = await open();
    const isVisible = () => button(home).classList.contains("is-visible");
    await scrollTo(home, 650);
    expect(isVisible()).toBe(true);

    let changes = 0;
    let last = isVisible();
    for (let pass = 0; pass < 10; pass++) {
      await scrollTo(home, 410);
      if (isVisible() !== last) {
        changes++;
        last = isVisible();
      }
      await scrollTo(home, 590);
      if (isVisible() !== last) {
        changes++;
        last = isVisible();
      }
    }
    expect(changes).toBe(0);
    expect(isVisible()).toBe(true);

    await scrollTo(home, 350);
    expect(isVisible()).toBe(false);
  });
});
