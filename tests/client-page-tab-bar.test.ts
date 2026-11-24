/**
 * The home page's Tab Bar on /admin, /profile and /settings (pageTabBar.js): the same tabs, labels and icons as
 * index.html, each a link to the home page on that tab, with the All-tabs menu, at every width.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import { afterEach, describe, expect, it } from "vitest";

const publicDir = path.resolve("src/public");
const read = (name: string) => readFileSync(path.join(publicDir, name), "utf8");

const TAB_ORDER = ["home", "your-polls", "shared-with-you", "your-votes", "trending", "newest", "watching", "live", "search"];
const PERSONAL = ["your-polls", "shared-with-you", "your-votes", "watching", "live"];

let dom: JSDOM | null = null;

afterEach(() => {
  dom?.window.close();
  dom = null;
});

interface Options {
  signedIn?: boolean;
  liveResultsEnabled?: boolean;
  scripts?: string[];
}

async function open(options: Options = {}): Promise<Document> {
  dom = new JSDOM('<!doctype html><html><body><div class="layout"><header id="site-header" class="site-header"></header><main></main></div></body></html>', {
    url: "http://localhost/profile",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole()
  });
  const window = dom.window as unknown as Record<string, unknown>;
  const session = options.signedIn ? { user: { name: "A" } } : null;
  window.Session = {
    getSession: () => session,
    subscribe: (fn: (s: unknown) => void) => {
      fn(session);
      return () => {};
    }
  };
  window.SiteConfig = Promise.resolve({ liveResultsEnabled: Boolean(options.liveResultsEnabled) });
  for (const name of ["pageTabBar.js", ...(options.scripts ?? [])]) dom.window.eval(read(name));
  await new Promise((resolve) => setTimeout(resolve, 0));
  return dom.window.document;
}

const tab = (doc: Document, name: string) => doc.querySelector(`#tabBar .tab[data-tab="${name}"]`) as HTMLAnchorElement;

/** index.html's tab buttons, as name → [label, icon], with the watching eye's <use> written out as the symbol. */
function homeTabs(): Map<string, [string, string]> {
  const index = new JSDOM(read("index.html")).window.document;
  const eye = index.getElementById("watching-eye")!;
  const tabs = new Map<string, [string, string]>();
  for (const button of index.querySelectorAll("#tabBar .tab") as NodeListOf<HTMLElement>) {
    const icon = button.querySelector(".tab-icon")!.cloneNode(true) as Element;
    const use = icon.querySelector("use");
    if (use) use.replaceWith(...[...eye.children].map((child) => child.cloneNode(true)));
    tabs.set(button.dataset.tab!, [button.textContent!.trim(), icon.outerHTML.replace(/>\s+</g, "><")]);
  }
  return tabs;
}

describe("the Tab Bar on the pages without tabs", () => {
  it("is loaded by /admin, /profile and /settings", () => {
    for (const file of ["admin.html", "profile.html", "settings.html"]) {
      const html = read(file);
      for (const script of ["pageTabBar.js", "tabBarScroll.js", "tabBarScrollArrows.js"]) expect(html, `${file} ${script}`).toContain(`src="/${script}"`);
    }
  });

  it("has index.html's tabs, in its order, with the same labels and icons", async () => {
    const doc = await open({ signedIn: true });
    const home = homeTabs();
    expect([...home.keys()]).toEqual(TAB_ORDER);
    const links = [...doc.querySelectorAll("#tabBar .tab")] as HTMLAnchorElement[];
    expect(links.map((a) => a.dataset.tab)).toEqual(TAB_ORDER);
    for (const [name, [label, icon]] of home) {
      expect(tab(doc, name).textContent!.trim(), `${name} label`).toBe(label);
      expect(tab(doc, name).querySelector(".tab-icon")!.outerHTML, `${name} icon`).toBe(icon);
    }
  });

  it("sits right under the site header and marks the page as having a Tab Bar", async () => {
    const doc = await open();
    const wrap = doc.getElementById("site-header")!.nextElementSibling!;
    expect(wrap.className).toBe("tab-bar-wrap");
    expect(wrap.querySelector("#tabBar")).not.toBeNull();
    expect(doc.body.classList.contains("has-tab-bar")).toBe(true);
    for (const id of ["tabMenuBtn", "tabMenu", "tabMoreBtn", "tabScrollLeftArrow", "tabScrollRightArrow"]) expect(doc.getElementById(id), id).not.toBeNull();
    expect(doc.getElementById("refreshBtn")).toBeNull();
    expect(doc.querySelector("#tabBar .tab.is-active")).toBeNull();
  });

  it("links each tab to the home page on that tab for a signed-in visitor", async () => {
    const doc = await open({ signedIn: true, liveResultsEnabled: true });
    for (const name of TAB_ORDER) {
      expect(tab(doc, name).getAttribute("href"), name).toBe(`/?tab=${name}`);
      expect(tab(doc, name).hidden, name).toBe(false);
      expect(tab(doc, name).hasAttribute("aria-disabled"), name).toBe(false);
    }
  });

  it("hides Home from a guest and sends the personal tabs to /login", async () => {
    const doc = await open({ liveResultsEnabled: true });
    expect(tab(doc, "home").hidden).toBe(true);
    for (const name of PERSONAL) {
      expect(tab(doc, name).getAttribute("href"), name).toBe("/login");
      expect(tab(doc, name).getAttribute("aria-disabled"), name).toBe("true");
    }
    for (const name of ["trending", "newest", "search"]) expect(tab(doc, name).getAttribute("href"), name).toBe(`/?tab=${name}`);
  });

  it("hides Live Results while ENV_LIVE_RESULTS is off", async () => {
    const doc = await open({ signedIn: true });
    expect(tab(doc, "live").hidden).toBe(true);
  });

  it("lists the shown tabs in the All-tabs menu, and choosing one follows its link", async () => {
    const doc = await open({ signedIn: true, scripts: ["tabBarScroll.js"] });
    (doc.getElementById("tabMenuBtn") as HTMLButtonElement).click();
    const items = [...doc.querySelectorAll("#tabMenu .tab-menu-item")] as HTMLElement[];
    expect(items.map((item) => item.dataset.tab)).toEqual(TAB_ORDER.filter((name) => name !== "live"));
    let followed = "";
    tab(doc, "newest").addEventListener("click", (event) => {
      followed = (event.currentTarget as HTMLAnchorElement).getAttribute("href")!;
      event.preventDefault();
    });
    items.find((item) => item.dataset.tab === "newest")!.click();
    expect(followed).toBe("/?tab=newest");
    expect((doc.getElementById("tabMenu") as HTMLElement).hidden).toBe(true);
  });
});
