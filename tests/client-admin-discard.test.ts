import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";

const ADMIN = "admin-discard@example.com";
let ctx: TestContext;
let cookie = "";
let page: BrowserPage | null = null;

beforeAll(async () => {
  ctx = await startTestContext({ ENV_ADMINS: ADMIN, ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL: "60000" });
  cookie = (await forgeSession(ctx, ADMIN)).cookie;
});

afterAll(async () => {
  page?.close();
  await ctx.stop();
});

beforeEach(async () => {
  page?.close();
  page = null;
  await polls(ctx).deleteMany({});
  await polls(ctx).insertOne(makePoll({ title: "Draft to edit", pollState: "OPEN" }));
  page = await openPage(ctx, "admin.html", { cookie, url: "http://localhost/admin", scripts: ["m3-ripple.js", "app.js", "adminCard.js", "adminList.js"] });
  page.window.HTMLElement.prototype.scrollIntoView = () => {};
  (page.window as unknown as { confirm: () => boolean }).confirm = () => {
    throw new Error("window.confirm must not be called");
  };
  // The card opens its wizard from the Summary Text: the title is Step 2's link.
  await page.click("#pollList .wizard-summary-title .wizard-summary-link");
  await page.settle(50);
});

const cancelButton = (p: BrowserPage) =>
  Array.from(p.document.querySelectorAll<HTMLButtonElement>(".wizard-footer button")).find((b) => b.textContent === "Cancel")!;
const titleBox = (p: BrowserPage) => p.document.querySelector('[id^="pollTitle-"]') as HTMLInputElement;
const dialog = (p: BrowserPage) => p.document.querySelector('.modal[role="alertdialog"]') as HTMLElement | null;
const editing = (p: BrowserPage) => Boolean(p.document.querySelector(".poll-admin-card--new"));

function typeInTitle(p: BrowserPage, text: string) {
  const box = titleBox(p);
  box.value = text;
  box.dispatchEvent(new p.window.Event("input", { bubbles: true }));
}

function keydown(p: BrowserPage, k: string, shiftKey = false) {
  p.document.activeElement!.dispatchEvent(new p.window.KeyboardEvent("keydown", { key: k, shiftKey, bubbles: true, cancelable: true }));
}

describe("the Not Saved dialog", () => {
  it("is not shown when nothing was edited: Cancel leaves editing at once", async () => {
    const p = page!;
    expect(editing(p)).toBe(true);
    cancelButton(p).click();
    await p.settle();
    expect(dialog(p)).toBeNull();
    expect(editing(p)).toBe(false);
  });

  it("is not shown when nothing was edited: the back link navigates", async () => {
    const p = page!;
    await p.click(".admin-back-link");
    await p.settle(50);
    expect(dialog(p)).toBeNull();
    expect(p.navigations.length).toBe(1);
  });

  it("asks before Cancel discards edits, with focus on Keep editing and Tab kept on its two actions", async () => {
    const p = page!;
    typeInTitle(p, "Edited title");
    const cancel = cancelButton(p);
    cancel.focus();
    cancel.click();
    await p.settle();
    const box = dialog(p)!;
    expect(box).not.toBeNull();
    expect(box.getAttribute("aria-modal")).toBe("true");
    expect(p.document.getElementById(box.getAttribute("aria-labelledby")!)!.textContent).toBe("Discard changes?");
    expect(p.document.getElementById(box.getAttribute("aria-describedby")!)!.textContent).toBe("Your edits will be lost.");
    const keep = box.querySelector(".modal-keep") as HTMLButtonElement;
    const discard = box.querySelector(".modal-discard") as HTMLButtonElement;
    expect([keep.textContent, discard.textContent]).toEqual(["Keep editing", "Discard"]);
    expect(p.document.activeElement).toBe(keep);
    keydown(p, "Tab");
    expect(p.document.activeElement).toBe(discard);
    keydown(p, "Tab", true);
    expect(p.document.activeElement).toBe(keep);
  });

  for (const [how, answer] of [
    ["Keep editing", (p: BrowserPage) => (dialog(p)!.querySelector(".modal-keep") as HTMLButtonElement).click()],
    ["Escape", (p: BrowserPage) => keydown(p, "Escape")],
    ["a click outside", (p: BrowserPage) => (p.document.querySelector(".modal-backdrop") as HTMLElement).click()]
  ] as const) {
    it(`keeps the edits on ${how} and returns focus to Cancel`, async () => {
      const p = page!;
      typeInTitle(p, "Keep me");
      const cancel = cancelButton(p);
      cancel.focus();
      cancel.click();
      await p.settle();
      answer(p);
      await p.settle();
      expect(dialog(p)).toBeNull();
      expect(editing(p)).toBe(true);
      expect(titleBox(p).value).toBe("Keep me");
      expect(p.document.activeElement).toBe(cancel);
    });
  }

  it("leaves editing on Discard", async () => {
    const p = page!;
    typeInTitle(p, "Throw away");
    cancelButton(p).click();
    await p.settle();
    (dialog(p)!.querySelector(".modal-discard") as HTMLButtonElement).click();
    await p.settle(50);
    expect(dialog(p)).toBeNull();
    expect(editing(p)).toBe(false);
  });

  it("holds the back link until Discard, then navigates", async () => {
    const p = page!;
    typeInTitle(p, "Unsaved");
    await p.click(".admin-back-link");
    expect(dialog(p)).not.toBeNull();
    expect(p.navigations.length).toBe(0);
    (dialog(p)!.querySelector(".modal-keep") as HTMLButtonElement).click();
    await p.settle(50);
    expect(p.navigations.length).toBe(0);

    await p.click(".admin-back-link");
    (dialog(p)!.querySelector(".modal-discard") as HTMLButtonElement).click();
    await p.settle(50);
    expect(p.navigations.length).toBe(1);
  });

  // 025 FIX10: the banner stays on the site, so it asks in-page, not "Leave site?".
  it("holds the CrowdPoll banner link until Discard, then navigates", async () => {
    const p = page!;
    typeInTitle(p, "Unsaved");
    await p.click("#site-header a.brand");
    expect(dialog(p)).not.toBeNull();
    expect(p.navigations.length).toBe(0);
    (dialog(p)!.querySelector(".modal-keep") as HTMLButtonElement).click();
    await p.settle(50);
    expect(p.navigations.length).toBe(0);
    expect(editing(p)).toBe(true);

    await p.click("#site-header a.brand");
    (dialog(p)!.querySelector(".modal-discard") as HTMLButtonElement).click();
    await p.settle(50);
    expect(p.navigations.length).toBe(1);
  });

  it("does not hold the banner link when nothing was edited", async () => {
    const p = page!;
    await p.click("#site-header a.brand");
    await p.settle(50);
    expect(dialog(p)).toBeNull();
    expect(p.navigations.length).toBe(1);
  });
});
