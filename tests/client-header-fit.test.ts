import { afterEach, describe, expect, it } from "vitest";
import { modelHeaderWidth, openStubbedHome, type HeaderModel, type StubbedHome, type StubbedHomeOptions, type StubbedUser } from "./helpers/single-column-page.js";

const MEMBER: StubbedUser = { userName: "Member", permissions: ["View Polls", "Vote on Polls", "Create Poll"] };
const PLAIN_MEMBER: StubbedUser = { userName: "Member", permissions: ["View Polls", "Vote on Polls"] };

let page: StubbedHome | null = null;
let model: HeaderModel;

afterEach(() => {
  page?.close();
  page = null;
});

async function open(clientWidth: number, options: Partial<StubbedHomeOptions> = {}): Promise<StubbedHome> {
  const { beforeScripts, ...rest } = options;
  page = await openStubbedHome({
    scripts: ["app.js", "headerFit.js"],
    phone: false,
    ...rest,
    beforeScripts: (window) => {
      model = modelHeaderWidth(window, clientWidth);
      beforeScripts?.(window);
    }
  });
  return page;
}

const fit = (home: StubbedHome) => home.document.documentElement.getAttribute("data-header-fit");

async function resizeTo(home: StubbedHome, width: number) {
  model.setClientWidth(width);
  home.window.dispatchEvent(new home.window.Event("resize"));
  await home.settle(30);
}

async function signInAs(home: StubbedHome, user: StubbedUser | null) {
  home.setUser(user);
  await (home.window as unknown as { Session: { refresh(): Promise<boolean> } }).Session.refresh();
  await home.settle(30);
}

describe("one row", () => {
  it("sets nothing when everything fits", async () => {
    const home = await open(1400);
    expect(fit(home)).toBeNull();
    await signInAs(home, MEMBER);
    expect(fit(home)).toBeNull();
  });

  it("does nothing, and does not throw, on a page without the header", async () => {
    const home = await open(100, {
      beforeScripts: (window) => {
        window.document.getElementById("site-header")?.remove();
      }
    });
    expect(fit(home)).toBeNull();
  });

  it("sets nothing at a phone width, whatever the measurements say", async () => {
    const home = await open(100, { phone: true });
    expect(fit(home)).toBeNull();
  });
});

describe("the user name", () => {
  it("is the first thing to go, and the avatar and its menu stay", async () => {
    const home = await open(800, { user: MEMBER });
    expect(fit(home)).toBe("no-name");
    expect(home.document.querySelector(".avatar-btn")).not.toBeNull();
    expect(home.document.querySelector(".avatar-menu")).not.toBeNull();
  });

  it("comes back when the window is wide enough", async () => {
    const home = await open(800, { user: MEMBER });
    await resizeTo(home, 900);
    expect(fit(home)).toBeNull();
  });
});

describe("the search box", () => {
  it("goes next, when removing the name is not enough", async () => {
    const home = await open(700, { user: MEMBER });
    expect(fit(home)).toBe("no-name no-search");
  });

  it("hands its terms to the Search tab field, and takes them back", async () => {
    const home = await open(1400, { user: MEMBER });
    const inputs: string[] = [];
    home.document.addEventListener("input", (event) => inputs.push((event.target as HTMLElement).id));
    const site = (home.window as unknown as { SiteSearch: { value(): string; set(value: string): void } }).SiteSearch;
    const field = home.document.getElementById("searchTabBox") as HTMLInputElement;

    site.set("senate");
    await resizeTo(home, 700);
    expect(fit(home)).toBe("no-name no-search");
    expect(field.value).toBe("senate");
    expect(inputs).toContain("searchTabBox");

    field.value = "house";
    field.dispatchEvent(new home.window.Event("input", { bubbles: true }));
    expect(site.value()).toBe("house");

    await resizeTo(home, 1400);
    expect(fit(home)).toBeNull();
    expect(site.value()).toBe("house");
  });

  it("leaves the Search tab field alone when the header box holds no terms", async () => {
    const home = await open(1400, { user: MEMBER });
    const field = home.document.getElementById("searchTabBox") as HTMLInputElement;
    field.value = "kept";
    await resizeTo(home, 700);
    expect(field.value).toBe("kept");
  });
});

describe("the logo, and a Create Poll link that is only there for a creator", () => {
  it("is never given up: a guest's row ends at the search box, however narrow", async () => {
    const home = await open(650);
    expect(fit(home)).toBe("no-name no-search");
    await resizeTo(home, 600);
    expect(fit(home)).toBe("no-name no-search");
    expect(home.document.querySelector(".brand-logo") !== null).toBe(true);
  });

  it("draws the brand mark, not the placeholder: a bubble holding a green figure in front of a red one", async () => {
    const home = await open(1400);
    const logo = home.document.querySelector(".brand-logo")!;
    expect(logo.querySelector("text")).toBeNull();
    expect(logo.querySelector('g[mask="url(#brand-logo-front)"][fill="#E04A4A"]')!.children.length).toBe(2);
    expect(logo.querySelectorAll('[fill="#3FB34F"]').length).toBe(2);
    expect(logo.querySelector('[stroke="#000000"]') !== null).toBe(true);
  });

  it("puts the speech bubble's tail on the right, pointing toward the content", async () => {
    const home = await open(1400);
    const outline = home.document.querySelector('.brand-logo path[stroke="#000000"]')!.getAttribute("d")!;
    expect(outline).toContain("H78 L100 116 L96 96");
    expect(outline).not.toContain("L20 116");
  });

  it("keeps the link for a user who may create polls", async () => {
    const home = await open(500, { user: MEMBER });
    expect(home.document.querySelector(".header-nav-link") !== null).toBe(true);
    expect(fit(home)).toBe("no-name no-search");
  });

  it("has no link for a user without permission, and fits once the name and the search box are gone", async () => {
    const home = await open(500, { user: PLAIN_MEMBER });
    expect(home.document.querySelector(".header-nav-link")).toBeNull();
    expect(fit(home)).toBe("no-name no-search");
  });
});

describe("re-measuring", () => {
  it("follows a resize, and gives the hidden parts back in reverse order", async () => {
    const home = await open(600);
    expect(fit(home)).toBe("no-name no-search");
    await resizeTo(home, 680);
    expect(fit(home)).toBe("no-name no-search");
    await resizeTo(home, 700);
    expect(fit(home)).toBeNull();
  });

  it("measures the new header after a sign-in or a sign-out", async () => {
    const home = await open(700);
    expect(fit(home)).toBeNull();
    await signInAs(home, MEMBER);
    expect(fit(home)).toBe("no-name no-search");
    await signInAs(home, null);
    expect(fit(home)).toBeNull();
  });

  it("measures again when the fonts have loaded", async () => {
    let release: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    const home = await open(1400, {
      beforeScripts: (window) => {
        Object.defineProperty(window.document, "fonts", { value: { ready }, configurable: true });
      }
    });
    model.setClientWidth(650);
    await home.settle(30);
    expect(fit(home)).toBeNull();
    release();
    await home.settle(30);
    expect(fit(home)).toBe("no-name no-search");
  });

  it("removes its mark when the window becomes a phone, and restores it when it becomes wide", async () => {
    const home = await open(650);
    expect(fit(home)).toBe("no-name no-search");
    home.setPhone(true);
    await home.settle(30);
    expect(fit(home)).toBeNull();
    home.setPhone(false);
    await home.settle(30);
    expect(fit(home)).toBe("no-name no-search");
  });

  it("measures again when the header or one of its children changes size", async () => {
    const observers: Array<{ callback: () => void; targets: Set<Element> }> = [];
    const home = await open(1400, {
      user: MEMBER,
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
      }
    });
    const header = home.document.getElementById("site-header") as HTMLElement;
    const watching = observers.find((entry) => entry.targets.has(header));
    expect(watching !== undefined).toBe(true);
    for (const child of Array.from(header.children)) expect(watching?.targets.has(child)).toBe(true);

    model.setClientWidth(700);
    watching?.callback();
    await home.settle(30);
    expect(fit(home)).toBe("no-name no-search");
  });

  it("evaluates once for several triggers in the same frame", async () => {
    const home = await open(1400);
    let frames = 0;
    const original = home.window.requestAnimationFrame.bind(home.window);
    home.window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      frames += 1;
      return original(callback);
    }) as typeof home.window.requestAnimationFrame;
    for (let i = 0; i < 3; i++) home.window.dispatchEvent(new home.window.Event("resize"));
    expect(frames).toBe(1);
  });
});
