/**
 * The viewport rule in the browser: which viewport declaration viewportWidth.js leaves on a page for the screen
 * it is shown on, and when it decides again.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";

const DEVICE = "width=device-width, initial-scale=1";
const FIXED_480 = "width=480";
const FIXED_640 = "width=640";
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

function asIphone(window: PageWindow): void {
  Object.defineProperty(window.navigator, "userAgent", { value: IPHONE, configurable: true });
}

type PageWindow = BrowserPage["window"];
type OrientationType = "portrait-primary" | "landscape-primary";

interface HeldScreen {
  width: number;
  height: number;
  orientation?: OrientationType;
  windowOrientation?: number;
}

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});

function hold(window: PageWindow, held: HeldScreen): void {
  Object.defineProperty(window.screen, "width", { value: held.width, configurable: true });
  Object.defineProperty(window.screen, "height", { value: held.height, configurable: true });
  if (held.orientation) {
    const orientation = Object.assign(new window.EventTarget(), { type: held.orientation });
    Object.defineProperty(window.screen, "orientation", { value: orientation, configurable: true });
  }
  if (held.windowOrientation !== undefined) {
    Object.defineProperty(window, "orientation", { value: held.windowOrientation, configurable: true });
  }
}

async function openHeld(held: HeldScreen, before?: (window: PageWindow) => void): Promise<BrowserPage> {
  return openPage(ctx, "privacy.html", {
    scripts: ["viewportWidth.js"],
    beforeScripts: (window) => {
      hold(window, held);
      before?.(window);
    }
  });
}

const viewportMeta = (page: BrowserPage) => page.document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
const content = (page: BrowserPage) => viewportMeta(page).getAttribute("content");

function textSizeAdjust(page: BrowserPage): string[] {
  const style = page.document.documentElement.style;
  return [style.getPropertyValue("text-size-adjust"), style.getPropertyValue("-webkit-text-size-adjust")];
}

describe("viewportWidth.js on a screen held narrower than 480 px", () => {
  it.each([
    [320, 568],
    [360, 800],
    [390, 844],
    [430, 932],
    [479, 900]
  ])("lays a %i × %i portrait screen out 480 px wide", async (width, height) => {
    const page = await openHeld({ width, height, orientation: "portrait-primary" });
    expect(content(page)).toBe(FIXED_480);
    page.close();
  });

  it("keeps the browser from enlarging text on its own", async () => {
    const page = await openHeld({ width: 390, height: 844, orientation: "portrait-primary" });
    expect(textSizeAdjust(page)).toEqual(["100%", "100%"]);
    page.close();
  });

  it.each([
    [390, 844, "0.8125"],
    [375, 667, "0.7813"],
    [430, 932, "0.8959"]
  ])("on an iPhone %i × %i, caps the scale at the fitted one, so a focused field is not zoomed in on", async (width, height, scale) => {
    const page = await openHeld({ width, height, orientation: "portrait-primary" }, asIphone);
    expect(content(page)).toBe(`${FIXED_480}, maximum-scale=${scale}`);
    expect(content(page)).not.toMatch(/initial-scale|minimum-scale|user-scalable/);
    page.close();
  });

  it("writes nothing that limits zoom on other phones, and touches nothing but the page", async () => {
    let globalsBefore: string[] = [];
    const page = await openHeld({ width: 390, height: 844, orientation: "portrait-primary" }, (window) => {
      globalsBefore = Object.getOwnPropertyNames(window);
    });
    expect(content(page)).not.toMatch(/initial-scale|minimum-scale|maximum-scale|user-scalable/);
    expect(page.requests).toEqual([]);
    expect(page.window.localStorage.length).toBe(0);
    expect(page.window.sessionStorage.length).toBe(0);
    expect(page.document.cookie).toBe("");
    expect(Object.getOwnPropertyNames(page.window).filter((name) => !globalsBefore.includes(name))).toEqual([]);
    page.close();
  });

});

describe("viewportWidth.js on a screen held between 481 and 639 px", () => {
  it.each([
    [481, 900],
    [540, 720],
    [600, 960],
    [639, 900]
  ])("lays a %i × %i portrait screen out 640 px wide, with nothing beside the width", async (width, height) => {
    const page = await openHeld({ width, height, orientation: "portrait-primary" });
    expect(content(page)).toBe(FIXED_640);
    expect(textSizeAdjust(page)).toEqual(["100%", "100%"]);
    page.close();
  });

  it.each<[string, HeldScreen]>([
    ["reports its portrait width", { width: 320, height: 568, orientation: "landscape-primary" }],
    ["reports its landscape width", { width: 568, height: 320, orientation: "landscape-primary" }]
  ])("lays a small phone in landscape that %s out 640 px wide", async (_name, held) => {
    const page = await openHeld(held);
    expect(content(page)).toBe(FIXED_640);
    page.close();
  });

  it("on an iPhone held 568 px wide, caps the scale at the one fitted to 640 px", async () => {
    const page = await openHeld({ width: 320, height: 568, orientation: "landscape-primary" }, asIphone);
    expect(content(page)).toBe(`${FIXED_640}, maximum-scale=0.8875`);
    page.close();
  });

  it("reads window.orientation when the screen has no orientation API", async () => {
    const page = await openHeld({ width: 320, height: 568, windowOrientation: 90 });
    expect(content(page)).toBe(FIXED_640);
    page.close();
  });
});

describe("viewportWidth.js on a screen held exactly 480 px wide, or 640 px and wider", () => {
  it.each<[string, HeldScreen]>([
    ["a phone in landscape that reports its portrait width", { width: 390, height: 844, orientation: "landscape-primary" }],
    ["a phone in landscape that reports its landscape width", { width: 844, height: 390, orientation: "landscape-primary" }],
    ["a screen exactly 480 px wide", { width: 480, height: 900, orientation: "portrait-primary" }],
    ["a screen exactly 640 px wide", { width: 640, height: 900, orientation: "portrait-primary" }],
    ["a tablet in portrait", { width: 768, height: 1024, orientation: "portrait-primary" }],
    ["a desktop screen", { width: 1920, height: 1080, orientation: "landscape-primary" }]
  ])("leaves the page's own declaration on %s", async (_name, held) => {
    const page = await openHeld(held);
    expect(content(page)).toBe(DEVICE);
    expect(textSizeAdjust(page)).toEqual(["", ""]);
    page.close();
  });
});

describe("viewportWidth.js without the screen orientation API", () => {
  it.each<[number | undefined, string]>([
    [90, DEVICE],
    [-90, DEVICE],
    [0, FIXED_480],
    [undefined, FIXED_480]
  ])("reads window.orientation %s on a 390 × 844 screen", async (windowOrientation, expected) => {
    const page = await openHeld({ width: 390, height: 844, windowOrientation });
    expect(content(page)).toBe(expected);
    page.close();
  });
});

describe("viewportWidth.js when the screen is turned", () => {
  function setOrientation(page: BrowserPage, type: OrientationType): void {
    (page.window.screen.orientation as unknown as { type: string }).type = type;
  }

  const signals: [string, (page: BrowserPage) => void][] = [
    ["the orientation change", (page) => page.window.screen.orientation.dispatchEvent(new page.window.Event("change"))],
    ["a resize", (page) => page.window.dispatchEvent(new page.window.Event("resize"))],
    ["a page shown again from history", (page) => page.window.dispatchEvent(new page.window.Event("pageshow"))]
  ];

  it.each(signals)("decides again on %s, to landscape and back", async (_name, signal) => {
    const page = await openHeld({ width: 390, height: 844, orientation: "portrait-primary" });
    expect(content(page)).toBe(FIXED_480);

    setOrientation(page, "landscape-primary");
    signal(page);
    expect(content(page)).toBe(DEVICE);
    expect(textSizeAdjust(page)).toEqual(["", ""]);

    setOrientation(page, "portrait-primary");
    signal(page);
    expect(content(page)).toBe(FIXED_480);
    expect(textSizeAdjust(page)).toEqual(["100%", "100%"]);
    page.close();
  });

  it.each(signals)("moves between the 480 px and the 640 px page on %s, keeping the text size held", async (_name, signal) => {
    const page = await openHeld({ width: 320, height: 568, orientation: "portrait-primary" });
    expect(content(page)).toBe(FIXED_480);

    setOrientation(page, "landscape-primary");
    signal(page);
    expect(content(page)).toBe(FIXED_640);
    expect(textSizeAdjust(page)).toEqual(["100%", "100%"]);

    setOrientation(page, "portrait-primary");
    signal(page);
    expect(content(page)).toBe(FIXED_480);
    expect(textSizeAdjust(page)).toEqual(["100%", "100%"]);
    page.close();
  });

  it.each(signals)("moves between the 640 px page and the device's width on %s", async (_name, signal) => {
    const page = await openHeld({ width: 600, height: 960, orientation: "portrait-primary" });
    expect(content(page)).toBe(FIXED_640);

    setOrientation(page, "landscape-primary");
    signal(page);
    expect(content(page)).toBe(DEVICE);
    expect(textSizeAdjust(page)).toEqual(["", ""]);

    setOrientation(page, "portrait-primary");
    signal(page);
    expect(content(page)).toBe(FIXED_640);
    expect(textSizeAdjust(page)).toEqual(["100%", "100%"]);
    page.close();
  });

  it("writes nothing on the 640 px page when the decision has not changed", async () => {
    const page = await openHeld({ width: 600, height: 960, orientation: "portrait-primary" });
    const observer = new page.window.MutationObserver(() => {});
    observer.observe(viewportMeta(page), { attributes: true });
    for (const [, signal] of signals) signal(page);
    expect(observer.takeRecords()).toEqual([]);
    page.close();
  });

  it("writes nothing when the decision has not changed", async () => {
    const page = await openHeld({ width: 390, height: 844, orientation: "portrait-primary" });
    const observer = new page.window.MutationObserver(() => {});
    observer.observe(viewportMeta(page), { attributes: true });
    for (const [, signal] of signals) signal(page);
    expect(observer.takeRecords()).toEqual([]);
    page.close();
  });
});
