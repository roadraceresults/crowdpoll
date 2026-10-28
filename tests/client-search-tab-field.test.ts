import { readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import { afterEach, describe, expect, it } from "vitest";

interface TabsCall {
  name: string;
  args: unknown[];
}

interface Home {
  window: JSDOM["window"];
  document: Document;
  calls: TabsCall[];
  field: HTMLInputElement;
  clearButton: HTMLElement;
  close(): void;
}

let home: Home | null = null;

afterEach(() => {
  home?.close();
  home = null;
});

function openHome(): Home {
  const html = readFileSync(path.resolve("src/public/index.html"), "utf8").replace(/<script[^>]*><\/script>/g, "");
  const dom = new JSDOM(html, { url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const { window } = dom;
  const calls: TabsCall[] = [];
  const record = (name: string) => async (...args: unknown[]) => {
    calls.push({ name, args });
    return true;
  };
  const target = window as unknown as Record<string, unknown>;
  target.DeltaClient = { createTabState: () => ({ order: [], overlay: new Map() }), apply: () => ({}), setOverlay: () => {} };
  target.Tabs = {
    register: () => {},
    createGrid: () => ({ render: () => {}, reapply: () => {} }),
    createOverlayFetcher: () => ({ fetch: async () => {}, reset: () => {} }),
    emptyState: (...args: unknown[]) => calls.push({ name: "emptyState", args }),
    select: record("select"),
    canRequest: () => true,
    dynamicRequest: record("dynamicRequest")
  };
  window.eval(readFileSync(path.resolve("src/public/searchTab.js"), "utf8"));
  return {
    window,
    document: window.document,
    calls,
    field: window.document.getElementById("searchTabBox") as HTMLInputElement,
    clearButton: window.document.getElementById("searchTabClear") as HTMLElement,
    close: () => window.close()
  };
}

const submitForm = (page: Home) =>
  page.document.getElementById("searchTabForm")!.dispatchEvent(new page.window.Event("submit", { bubbles: true, cancelable: true }));

const slash = (page: Home, target: EventTarget = page.document.body) => {
  const event = new page.window.KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
};

const showSearchTab = (page: Home) => (page.document.getElementById("panel-search") as HTMLElement).removeAttribute("hidden");

describe("the Search tab's own field", () => {
  it("is in the Search tab's panel, above its cards, with a clear button", () => {
    home = openHome();
    const panel = home.document.getElementById("panel-search") as HTMLElement;
    expect(panel.firstElementChild!.id).toBe("searchTabForm");
    expect(home.field.getAttribute("placeholder")).toBe("Search CrowdPoll");
    expect(home.field.getAttribute("maxlength")).toBe("200");
    expect(home.clearButton.hidden).toBe(true);
  });

  it("makes the same search request as the header box and keeps the terms in the field", async () => {
    home = openHome();
    home.field.value = "  senate  ";
    submitForm(home);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(home.calls.map((call) => call.name)).toContain("select");
    const request = home.calls.find((call) => call.name === "dynamicRequest")!;
    expect(request.args[0]).toBe("search");
    expect(request.args[1]).toBe("/api/search");
    expect(JSON.parse((request.args[2] as { body: string }).body)).toEqual({ q: "senate" });
    expect(request.args[5]).toBe("search");
    expect(home.field.value).toBe("senate");
    expect(home.clearButton.hidden).toBe(false);
  });

  it("only selects the tab when the terms are empty", async () => {
    home = openHome();
    home.field.value = "   ";
    submitForm(home);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(home.calls.map((call) => call.name)).toEqual(["select"]);
  });

  it("is filled by a submit made from anywhere, such as a link carrying search terms", async () => {
    home = openHome();
    await (home.window as unknown as { SearchTab: { submit(q: string): Promise<void> } }).SearchTab.submit("senate");
    expect(home.field.value).toBe("senate");
    expect(home.clearButton.hidden).toBe(false);
  });

  it("empties the field and the search when the clear button is pressed", async () => {
    home = openHome();
    home.field.value = "senate";
    home.field.dispatchEvent(new home.window.Event("input", { bubbles: true }));
    expect(home.clearButton.hidden).toBe(false);
    home.clearButton.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(home.field.value).toBe("");
    expect(home.clearButton.hidden).toBe(true);
    expect(home.calls.map((call) => call.name)).toContain("select");
    expect(home.calls.find((call) => call.name === "emptyState" && String(call.args[1]).includes("Enter your search terms"))).toBeTruthy();
    expect(home.document.activeElement).toBe(home.field);
  });
});

describe('the "/" shortcut', () => {
  it("focuses the field when the Search tab is showing, and stops the header box's own handler", () => {
    home = openHome();
    showSearchTab(home);
    let reachedBubblePhase = false;
    home.document.addEventListener("keydown", () => {
      reachedBubblePhase = true;
    });
    const event = slash(home);
    expect(event.defaultPrevented).toBe(true);
    expect(home.document.activeElement).toBe(home.field);
    expect(reachedBubblePhase).toBe(false);
  });

  it("leaves the key alone while the Search tab is not showing", () => {
    home = openHome();
    const event = slash(home);
    expect(event.defaultPrevented).toBe(false);
    expect(home.document.activeElement).not.toBe(home.field);
  });

  it("leaves the key alone while the user is typing in a field", () => {
    home = openHome();
    showSearchTab(home);
    const other = home.document.createElement("input");
    home.document.body.append(other);
    expect(slash(home, other).defaultPrevented).toBe(false);
  });
});

describe("the field while the header search box is hidden at a wide width", () => {
  const outsidePhoneBlock = () => {
    const css = readFileSync(path.resolve("src/public/single-column-m3.css"), "utf8");
    return css.slice(0, css.indexOf("@media (max-width: 639.98px)"));
  };

  function withSheet(page: Home) {
    const style = page.document.createElement("style");
    style.textContent = outsidePhoneBlock();
    page.document.head.append(style);
    showSearchTab(page);
  }

  it("is on screen, so \"/\" focuses it", () => {
    home = openHome();
    withSheet(home);
    home.document.documentElement.setAttribute("data-header-fit", "no-name no-search");
    expect(slash(home).defaultPrevented).toBe(true);
    expect(home.document.activeElement).toBe(home.field);
  });

  it("is off screen while the header box is shown, so \"/\" is left alone", () => {
    home = openHome();
    withSheet(home);
    expect(slash(home).defaultPrevented).toBe(false);
    expect(home.document.activeElement).not.toBe(home.field);
  });
});
