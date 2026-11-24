/** The Share button on a poll card (contracts/share.md S1 to S9), on a card mounted by hand with no server. */
import { afterEach, describe, expect, it } from "vitest";
import { openStubbedHome, type StubbedHome } from "./helpers/single-column-page.js";

interface Card {
  applyPoll(detail: object): void;
  setMaximized(on: boolean): void;
  element: HTMLElement;
}

const PID = "0b6c9d2e-1f3a-4b5c-8d7e-9f0a1b2c3d4e";
let home: StubbedHome | null = null;

afterEach(() => {
  home?.close();
  home = null;
});

function detail(overrides: object = {}) {
  return {
    title: "Pizza night",
    subtitle: "",
    notesPreviewHtml: "",
    choiceMode: "Single-Choice Poll",
    voteMutability: "Final-Vote Poll",
    pollVisibility: "Public Poll",
    pollState: "OPEN",
    totalVoted: 2,
    myChoiceIds: [],
    choices: [
      { id: "c1", label: "Yes", position: 0, pct: 50, count: 1 },
      { id: "c2", label: "No", position: 1, pct: 50, count: 1 }
    ],
    contentVersion: 1,
    countsVersion: 1,
    ...overrides
  };
}

interface Browser {
  share?: (data: { title: string; url: string }) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
}

async function mount(poll: object, browser: Browser = {}, signedIn = true) {
  const shared: Array<{ title: string; url: string }> = [];
  const copied: string[] = [];
  const maximizeCalls: string[] = [];
  home = await openStubbedHome({
    scripts: ["sharePoll.js", "pollCard.js"],
    phone: false,
    phoneLayout: false,
    beforeScripts: (window) => {
      if (browser.share) {
        Object.defineProperty(window.navigator, "share", {
          configurable: true,
          value: async (data: { title: string; url: string }) => {
            shared.push(data);
            await browser.share!(data);
          }
        });
      }
      Object.defineProperty(window.navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            if (browser.writeText) await browser.writeText(text);
            copied.push(text);
          }
        }
      });
    }
  });
  const grid = home.document.querySelector('.tab-panel[data-panel="trending"] .card-grid')!;
  const card = (home.window as unknown as { PollCard: { mount(el: Element, pid: string, opts: object): Card } }).PollCard.mount(grid, PID, {
    isSignedIn: () => signedIn,
    choiceBounds: { minChoices: 2, maxChoices: 50, choiceLabelMax: 35 },
    onMaximize: (pid: string) => maximizeCalls.push(pid)
  });
  card.applyPoll(poll);
  const buttons = () => Array.from(card.element.querySelectorAll<HTMLButtonElement>(".share-btn"));
  const press = async (button = buttons()[0]!) => {
    button.click();
    await home!.settle(20);
  };
  const snackbar = () => home!.document.querySelector(".m3-snackbar")?.textContent ?? null;
  return { card, buttons, press, shared, copied, maximizeCalls, snackbar };
}

describe("the Share button", () => {
  it("is on both faces, before Follow and Maximize, named for the poll, for a guest too", async () => {
    const { card, buttons } = await mount(detail(), {}, false);
    expect(buttons()).toHaveLength(2);
    const front = card.element.querySelector(".card-front .question-row")!;
    const back = card.element.querySelector(".card-back .question-row")!;
    expect(front.querySelector(".share-btn")!.nextElementSibling!.classList.contains("bookmark-btn")).toBe(true);
    expect(back.querySelector(".share-btn")!.nextElementSibling!.classList.contains("bookmark-btn")).toBe(true);
    for (const button of buttons()) {
      expect(button.hidden).toBe(false);
      expect(button.getAttribute("aria-label")).toBe("Share poll: Pizza night");
      expect(button.title).toBe("Share poll");
      expect(button.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
    }
    expect(front.classList.contains("has-share")).toBe(true);
  });

  it("shows on published polls only", async () => {
    for (const pollState of ["WAITING TO OPEN", "OPEN", "CLOSED"]) {
      const { buttons } = await mount(detail({ pollState }));
      expect(buttons().every((b) => !b.hidden), pollState).toBe(true);
      home!.close();
    }
    for (const pollState of ["INITIALIZED", "AWAITING APPROVAL", "REJECTED", "ARCHIVED", "EDITING"]) {
      const { card, buttons } = await mount(detail({ pollState }));
      expect(buttons().every((b) => b.hidden), pollState).toBe(true);
      expect(card.element.querySelector(".card-front .question-row")!.classList.contains("has-share"), pollState).toBe(false);
      home!.close();
    }
    const { buttons } = await mount(detail({ notPublished: true }));
    expect(buttons().every((b) => b.hidden)).toBe(true);
  });

  it("offers the poll link, with no tab, through the share sheet", async () => {
    const { press, shared, copied, snackbar } = await mount(detail(), { share: async () => {} });
    await press();
    expect(shared).toEqual([{ title: "Pizza night", url: `http://localhost/?PID=${PID}` }]);
    expect(copied).toEqual([]);
    expect(snackbar()).toBeNull();
  });

  it("says nothing when the visitor cancels the share sheet", async () => {
    const cancel = async () => {
      throw Object.assign(new Error("cancelled"), { name: "AbortError" });
    };
    const { press, copied, snackbar } = await mount(detail(), { share: cancel });
    await press();
    expect(copied).toEqual([]);
    expect(snackbar()).toBeNull();
  });

  it("copies the link when the share sheet refuses for another reason", async () => {
    const refuse = async () => {
      throw Object.assign(new Error("not allowed"), { name: "NotAllowedError" });
    };
    const { press, copied, snackbar } = await mount(detail(), { share: refuse });
    await press();
    expect(copied).toEqual([`http://localhost/?PID=${PID}`]);
    expect(snackbar()).toBe("Link copied");
  });

  it("copies the link where there is no share sheet, and says when it could not", async () => {
    const copying = await mount(detail());
    await copying.press(copying.buttons()[1]);
    expect(copying.copied).toEqual([`http://localhost/?PID=${PID}`]);
    expect(copying.snackbar()).toBe("Link copied");
    home!.close();

    const failing = await mount(detail(), {
      writeText: async () => {
        throw new Error("denied");
      }
    });
    await failing.press();
    expect(failing.snackbar()).toBe("Could not copy the link");
  });

  it("neither maximizes nor turns the card over", async () => {
    const { card, press, maximizeCalls } = await mount(detail());
    await press();
    expect(maximizeCalls).toEqual([]);
    expect(card.element.querySelector(".card-flip")!.classList.contains("is-flipped")).toBe(false);
  });
});
