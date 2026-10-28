import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openStubbedHome, pointerEvent, type StubbedHome, type StubbedHomeOptions, type StubbedUser } from "./helpers/single-column-page.js";

const PAIR = { width: 200, height: 24 };
const MEMBER: StubbedUser = { userName: "Member", permissions: ["View Polls", "Vote on Polls", "Create Poll"] };

let page: StubbedHome | null = null;
let gridBox = { left: 14, right: 370, top: 100, bottom: 1600 };

afterEach(() => {
  page?.close();
  page = null;
  gridBox = { left: 14, right: 370, top: 100, bottom: 1600 };
});

function boxOf(source: () => { left: number; right: number; top: number; bottom: number }) {
  return () => {
    const box = source();
    return { ...box, width: box.right - box.left, height: box.bottom - box.top } as DOMRect;
  };
}

const FIXED_CHROME_HEIGHT = 56;

async function open(options: Partial<StubbedHomeOptions> = {}): Promise<StubbedHome> {
  page = await openStubbedHome({
    scripts: ["app.js", "fixedChrome.js", "floatingActions.js"],
    beforeScripts: (window) => {
      Object.defineProperty(window, "innerHeight", { value: 700, configurable: true });
      const grid = window.document.querySelector(".tab-panel:not([hidden]) .card-grid") as HTMLElement;
      grid.getBoundingClientRect = boxOf(() => gridBox);
      const floating = window.document.getElementById("floatingActions") as HTMLElement;
      floating.getBoundingClientRect = () => ({ left: 0, top: 0, right: PAIR.width, bottom: PAIR.height, ...PAIR }) as DOMRect;
      Object.defineProperty(window.document.getElementById("site-header") as HTMLElement, "offsetHeight", {
        configurable: true,
        get: () => FIXED_CHROME_HEIGHT
      });
    },
    ...options
  });
  return page;
}

const floatingOf = (home: StubbedHome) => home.document.getElementById("floatingActions") as HTMLElement;
const slotOf = (home: StubbedHome) => home.document.getElementById("header-actions") as HTMLElement;
const labels = (element: HTMLElement) => Array.from(element.querySelectorAll("button")).map((button) => button.textContent);
const where = (home: StubbedHome) => [floatingOf(home).style.left, floatingOf(home).style.top];

async function signInAs(home: StubbedHome, user: StubbedUser | null) {
  home.setUser(user);
  await (home.window as unknown as { Session: { refresh(): Promise<boolean> } }).Session.refresh();
  await home.settle();
}

function dragBy(home: StubbedHome, button: HTMLElement, dx: number, dy: number) {
  button.dispatchEvent(pointerEvent(home.window, "pointerdown", { clientX: 200, clientY: 110 }));
  home.window.dispatchEvent(pointerEvent(home.window, "pointermove", { clientX: 200 + dx / 2, clientY: 110 + dy / 2 }));
  home.window.dispatchEvent(pointerEvent(home.window, "pointermove", { clientX: 200 + dx, clientY: 110 + dy }));
  home.window.dispatchEvent(pointerEvent(home.window, "pointerup", { clientX: 200 + dx, clientY: 110 + dy }));
  button.dispatchEvent(new home.window.MouseEvent("click", { bubbles: true, cancelable: true }));
}

describe("the guest's floating buttons", () => {
  it("move the header's own buttons into the floating element on a phone, at the start position", async () => {
    const home = await open();
    expect(labels(floatingOf(home))).toEqual(["Log In"]);
    expect(slotOf(home).children).toHaveLength(0);
    expect(floatingOf(home).hidden).toBe(false);
    expect(where(home)).toEqual(["170px", "104px"]);
  });

  it("show Log In alone in every sign-in mode", async () => {
    for (const signinMethod of ["native", "oauth", "both"] as const) {
      const home = await open({ signinMethod });
      expect(labels(floatingOf(home))).toEqual(["Log In"]);
      home.close();
    }
  });

  it("are absent for a member and sit in the header in the wide layout", async () => {
    const member = await open({ user: MEMBER });
    expect(floatingOf(member).hidden).toBe(true);
    expect(floatingOf(member).children).toHaveLength(0);
    member.close();

    const wide = await open({ phone: false });
    expect(floatingOf(wide).hidden).toBe(true);
    expect(labels(slotOf(wide))).toEqual(["Log In"]);
  });

  it("go back into the header when the window becomes wide, and float again on a phone", async () => {
    const home = await open();
    home.setPhone(false);
    expect(labels(slotOf(home))).toEqual(["Log In"]);
    expect(floatingOf(home).hidden).toBe(true);
    home.setPhone(true);
    expect(labels(floatingOf(home))).toEqual(["Log In"]);
    expect(slotOf(home).querySelectorAll("button")).toHaveLength(0);
  });

  it("are replaced, never duplicated, when the header is rebuilt by a change of session", async () => {
    const home = await open();
    await signInAs(home, MEMBER);
    expect(floatingOf(home).hidden).toBe(true);
    expect(floatingOf(home).children).toHaveLength(0);
    await signInAs(home, null);
    expect(labels(floatingOf(home))).toEqual(["Log In"]);
    expect(floatingOf(home).hidden).toBe(false);
    await signInAs(home, null);
    expect(labels(floatingOf(home))).toEqual(["Log In"]);
  });

  it("hold the header's Log In button itself", async () => {
    const home = await open();
    const classes = Array.from(floatingOf(home).children).map((child) => child.className);
    expect(classes).toEqual(["btn-header-ghost"]);
  });
});

describe("dragging the floating buttons", () => {
  it("treats a movement under the threshold as an ordinary press", async () => {
    const home = await open();
    const button = floatingOf(home).querySelector("button") as HTMLElement;
    let clicks = 0;
    button.addEventListener("click", () => {
      clicks += 1;
    });
    dragBy(home, button, 3, 2);
    expect(where(home)).toEqual(["170px", "104px"]);
    expect(clicks).toBe(1);
  });

  it("moves both buttons together and swallows the click that follows", async () => {
    const home = await open();
    const button = floatingOf(home).querySelector("button") as HTMLElement;
    let clicks = 0;
    button.addEventListener("click", () => {
      clicks += 1;
    });
    dragBy(home, button, -60, 200);
    expect(where(home)).toEqual(["110px", "304px"]);
    expect(clicks).toBe(0);
  });

  it("stops at the right edge of the cards and the bottom of the screen", async () => {
    const home = await open();
    dragBy(home, floatingOf(home).querySelector("button") as HTMLElement, 500, 900);
    expect(where(home)).toEqual(["170px", "676px"]);
  });

  it("is pushed down when scrolling brings the top of the cards under it", async () => {
    const home = await open();
    dragBy(home, floatingOf(home).querySelector("button") as HTMLElement, -60, 200);
    gridBox = { ...gridBox, top: 450 };
    home.window.dispatchEvent(new home.window.Event("scroll"));
    expect(where(home)[1]).toBe("450px");
  });

  it("stays where it is on the screen while the cards scroll away above it", async () => {
    const home = await open();
    dragBy(home, floatingOf(home).querySelector("button") as HTMLElement, -60, 200);
    gridBox = { ...gridBox, top: -300, bottom: 1300 };
    home.window.dispatchEvent(new home.window.Event("scroll"));
    expect(where(home)).toEqual(["110px", "304px"]);
  });

  it("clamps to the fixed chrome's height, not the top of the screen, once the cards have scrolled far enough away", async () => {
    const home = await open();
    gridBox = { ...gridBox, top: -300, bottom: 1300 };
    dragBy(home, floatingOf(home).querySelector("button") as HTMLElement, -60, -9000);
    expect(where(home)).toEqual(["110px", `${FIXED_CHROME_HEIGHT}px`]);
  });

  it("goes back to the start when a resize leaves it outside the cards, and stays when it still fits", async () => {
    const home = await open();
    dragBy(home, floatingOf(home).querySelector("button") as HTMLElement, -60, 500);
    expect(where(home)).toEqual(["110px", "604px"]);
    home.window.dispatchEvent(new home.window.Event("resize"));
    expect(where(home)).toEqual(["110px", "604px"]);

    Object.defineProperty(home.window, "innerHeight", { value: 400, configurable: true });
    home.window.dispatchEvent(new home.window.Event("resize"));
    expect(where(home)).toEqual(["170px", "104px"]);
  });
});

describe("the start beside Refresh", () => {
  let refresh = { left: 14, right: 54, top: 70, bottom: 110 };
  beforeEach(() => {
    refresh = { left: 14, right: 54, top: 70, bottom: 110 };
  });
  const openWithRefresh = () =>
    open({
      beforeScripts: (window) => {
        Object.defineProperty(window, "innerHeight", { value: 700, configurable: true });
        const grid = window.document.querySelector(".tab-panel:not([hidden]) .card-grid") as HTMLElement;
        grid.getBoundingClientRect = boxOf(() => gridBox);
        const floating = window.document.getElementById("floatingActions") as HTMLElement;
        floating.getBoundingClientRect = () => ({ left: 0, top: 0, right: PAIR.width, bottom: PAIR.height, ...PAIR }) as DOMRect;
        Object.defineProperty(window.document.getElementById("site-header") as HTMLElement, "offsetHeight", {
          configurable: true,
          get: () => FIXED_CHROME_HEIGHT
        });
        (window.document.querySelector(".tab-bar-wrap .tab-refresh--icon") as HTMLElement).getBoundingClientRect = boxOf(() => refresh);
      }
    });

  it("starts in the row, 8 px right of Refresh and centred on it, and stays there while the cards scroll", async () => {
    const home = await openWithRefresh();
    expect(where(home)).toEqual(["62px", "78px"]);
    gridBox = { ...gridBox, top: -300, bottom: 1300 };
    home.window.dispatchEvent(new home.window.Event("scroll"));
    expect(where(home)).toEqual(["62px", "78px"]);
  });

  it("leaves the row when dragged, into the card area below it, and goes back to the row on a resize that leaves it outside", async () => {
    const home = await openWithRefresh();
    dragBy(home, floatingOf(home).querySelector("button") as HTMLElement, 60, 0);
    expect(where(home)).toEqual(["122px", "100px"]);
    Object.defineProperty(home.window, "innerHeight", { value: 110, configurable: true });
    home.window.dispatchEvent(new home.window.Event("resize"));
    expect(where(home)).toEqual(["62px", "78px"]);
  });

  it("follows Refresh when the fixed chrome is re-measured while docked, and not once dragged", async () => {
    const home = await openWithRefresh();
    expect(where(home)).toEqual(["62px", "78px"]);
    refresh = { ...refresh, top: 120, bottom: 160 };
    home.window.dispatchEvent(new home.window.Event("fixedchromechange"));
    expect(where(home)).toEqual(["62px", "128px"]);

    dragBy(home, floatingOf(home).querySelector("button") as HTMLElement, 60, 0);
    expect(where(home)).toEqual(["122px", "128px"]);
    refresh = { ...refresh, top: 70, bottom: 110 };
    home.window.dispatchEvent(new home.window.Event("fixedchromechange"));
    expect(where(home)).toEqual(["122px", "128px"]);
  });
});

describe("the card area", () => {
  it("is the maximized card's area while a card is maximized, never the corner of the screen", async () => {
    const home = await open();
    dragBy(home, floatingOf(home).querySelector("button") as HTMLElement, -60, 200);
    const panel = home.document.querySelector(".tab-panel:not([hidden])") as HTMLElement;
    const grid = panel.querySelector(".card-grid") as HTMLElement;
    const maximized = home.document.createElement("div");
    maximized.className = "maximized-card-grid";
    maximized.getBoundingClientRect = boxOf(() => ({ left: 14, right: 370, top: 400, bottom: 1500 }));
    grid.after(maximized);
    grid.hidden = true;
    await home.settle(40);
    expect(where(home)).toEqual(["110px", "400px"]);
  });

  it("follows the tab that is showing", async () => {
    const home = await open();
    const trending = home.document.querySelector(".tab-panel:not([hidden])") as HTMLElement;
    const other = home.document.querySelector('.tab-panel[data-panel="newest"]') as HTMLElement;
    (other.querySelector(".card-grid") as HTMLElement).getBoundingClientRect = boxOf(() => ({ left: 14, right: 300, top: 100, bottom: 1600 }));
    trending.hidden = true;
    other.hidden = false;
    await home.settle(40);
    expect(Number.parseFloat(floatingOf(home).style.left)).toBeLessThanOrEqual(100);
  });
});
