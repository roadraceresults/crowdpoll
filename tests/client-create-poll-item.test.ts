import { afterEach, describe, expect, it } from "vitest";
import { openStubbedHome, type StubbedHome, type StubbedUser } from "./helpers/single-column-page.js";

const ADMINISTRATOR: StubbedUser = { userName: "Admin", isAdmin: true, permissions: ["View Polls", "Vote on Polls", "Create Poll"] };
const CREATOR: StubbedUser = { userName: "Creator", permissions: ["View Polls", "Create Poll"] };
const PLAIN_MEMBER: StubbedUser = { userName: "Member", permissions: ["Vote on Polls"] };
const CREATE_ONLY: StubbedUser = { userName: "Half", permissions: ["Create Poll"] };

let page: StubbedHome | null = null;

afterEach(() => {
  page?.close();
  page = null;
});

async function menuFor(user: StubbedUser | null): Promise<{ home: StubbedHome; menu: HTMLElement | null }> {
  page = await openStubbedHome({ scripts: ["app.js"], user });
  return { home: page, menu: page.document.querySelector(".avatar-menu") };
}

const labels = (menu: HTMLElement) => Array.from(menu.querySelectorAll("a")).map((link) => link.querySelector(".avatar-menu-label")!.firstChild!.textContent);
const item = (menu: HTMLElement) => menu.querySelector("a.avatar-menu-create-poll") as HTMLAnchorElement;

describe("the avatar menu's Create Poll item", () => {
  it("sits between Edit Profile and Poll Administration and opens poll administration for an administrator", async () => {
    const { menu } = await menuFor(ADMINISTRATOR);
    expect(labels(menu!)).toEqual(["Edit Profile", "Create Poll", "Poll Administration", "Logout"]);
    expect(item(menu!).getAttribute("href")).toBe("/admin");
    expect(item(menu!).hasAttribute("aria-disabled")).toBe(false);
    expect(item(menu!).querySelector(".avatar-menu-create-poll-reason")).toBeNull();
  });

  it("is enabled for a user with both the Create Poll and View Polls permissions", async () => {
    const { menu } = await menuFor(CREATOR);
    expect(item(menu!).getAttribute("href")).toBe("/admin");
    expect(item(menu!).hasAttribute("aria-disabled")).toBe(false);
  });

  it("is dimmed, focusable, inert and says why for a user who may not create polls", async () => {
    const { home, menu } = await menuFor(PLAIN_MEMBER);
    const link = item(menu!);
    expect(labels(menu!)).toEqual(["Edit Profile", "Create Poll", "Logout"]);
    expect(link.getAttribute("aria-disabled")).toBe("true");
    expect(link.getAttribute("href")).toBe("/admin");
    expect(link.title).toBe("You need permission to create polls");
    const reason = link.querySelector(".avatar-menu-create-poll-reason") as HTMLElement;
    expect(reason.textContent).toBe("Needs permission to create polls");
    expect(link.getAttribute("aria-describedby")).toBe(reason.id);
    const click = new home.window.MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
  });

  it("is dimmed for a user who has Create Poll without View Polls, as the header link is", async () => {
    const { menu } = await menuFor(CREATE_ONLY);
    expect(item(menu!).getAttribute("aria-disabled")).toBe("true");
  });

  it("is not there for a guest, who has no avatar menu", async () => {
    const { home, menu } = await menuFor(null);
    expect(menu).toBeNull();
    expect(home.document.querySelector(".avatar-menu-create-poll")).toBeNull();
  });
});

describe("the header's Create Poll link icon", () => {
  it("is a plus in a circle inside the link, before the text, for a creator and an administrator", async () => {
    for (const user of [CREATOR, ADMINISTRATOR]) {
      page = await openStubbedHome({ scripts: ["app.js"], user });
      const link = page.document.querySelector(".header-nav-link") as HTMLAnchorElement;
      expect(link.firstElementChild!.matches("svg.header-nav-icon[aria-hidden='true']")).toBe(true);
      expect(link.firstElementChild!.querySelector("circle")).not.toBeNull();
      expect(link.firstElementChild!.querySelector("path")!.getAttribute("d")).toBe("M32 18v28M18 32h28");
      expect(link.textContent).toBe("Create Poll");
      page.close();
      page = null;
    }
  });
});

describe("the avatar menu's icons", () => {
  it("gives every item an icon before its label, and Create Poll the header link's icon", async () => {
    const { menu } = await menuFor(ADMINISTRATOR);
    const links = Array.from(menu!.querySelectorAll("a"));
    expect(links).toHaveLength(4);
    for (const link of links) {
      expect(link.firstElementChild!.matches("svg.avatar-menu-icon[aria-hidden='true']")).toBe(true);
      expect(link.lastElementChild!.matches("span.avatar-menu-label")).toBe(true);
    }
    expect(item(menu!).querySelector(".avatar-menu-icon path")!.getAttribute("d")).toBe("M32 18v28M18 32h28");
    expect(links[0]!.querySelector('.avatar-menu-icon circle[fill="#8093a7"]')).not.toBeNull();
  });

  it("keeps the disabled Create Poll item's reason under its label", async () => {
    const { menu } = await menuFor(PLAIN_MEMBER);
    expect(item(menu!).querySelector(".avatar-menu-label .avatar-menu-create-poll-reason")).not.toBeNull();
  });
});
