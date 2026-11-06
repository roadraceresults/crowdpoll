/**
 * The avatar menu's Home item: first, for every logged-in user, leading to /?tab=home from any page and selecting
 * the tab in place on the home page.
 */
import { afterEach, describe, expect, it } from "vitest";
import { openStubbedHome, type StubbedHome, type StubbedUser } from "./helpers/single-column-page.js";

const CREATOR: StubbedUser = { userName: "Creator", permissions: ["View Polls", "Create Poll"] };
const PLAIN_MEMBER: StubbedUser = { userName: "Member", permissions: ["Vote on Polls"] };

let page: StubbedHome | null = null;

afterEach(() => {
  page?.close();
  page = null;
});

async function menuFor(user: StubbedUser | null, tabs?: { select(name: string): void }): Promise<HTMLElement | null> {
  page = await openStubbedHome({
    scripts: ["app.js"],
    user,
    beforeScripts: (window) => {
      if (tabs) (window as unknown as { Tabs: typeof tabs }).Tabs = tabs;
    }
  });
  return page.document.querySelector(".avatar-menu");
}

function clickHome(menu: HTMLElement): MouseEvent {
  const link = menu.querySelector("a") as HTMLAnchorElement;
  const event = new page!.window.MouseEvent("click", { bubbles: true, cancelable: true });
  link.dispatchEvent(event);
  return event;
}

describe("the avatar menu's Home item", () => {
  it("comes first, with its icon and /?tab=home, whether or not the user may create polls", async () => {
    for (const user of [CREATOR, PLAIN_MEMBER]) {
      const menu = await menuFor(user);
      const first = menu!.querySelector("a") as HTMLAnchorElement;
      expect(first.querySelector(".avatar-menu-label")!.textContent, user.userName).toBe("Home");
      expect(first.getAttribute("href"), user.userName).toBe("/?tab=home");
      expect(first.firstElementChild!.matches("svg.avatar-menu-icon[aria-hidden='true']")).toBe(true);
      page!.close();
      page = null;
    }
  });

  it("navigates on a page without the tabs", async () => {
    const menu = await menuFor(CREATOR);
    expect(clickHome(menu!).defaultPrevented).toBe(false);
  });

  it("selects Home in place on the home page and closes the menu", async () => {
    const selected: string[] = [];
    const menu = await menuFor(CREATOR, { select: (name) => void selected.push(name) });
    (page!.document.querySelector(".avatar-btn") as HTMLButtonElement).click();
    expect(menu!.hidden).toBe(false);
    expect(clickHome(menu!).defaultPrevented).toBe(true);
    expect(selected).toEqual(["home"]);
    expect(menu!.hidden).toBe(true);
  });

  it("is not offered to a guest", async () => {
    expect(await menuFor(null)).toBeNull();
    expect(page!.document.querySelector('a[href="/?tab=home"]')).toBeNull();
  });
});
