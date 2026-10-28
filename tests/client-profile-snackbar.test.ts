import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";

let ctx: TestContext;
let page: BrowserPage | null = null;
let accounts = 0;

beforeAll(async () => {
  ctx = await startTestContext();
});

afterAll(async () => {
  page?.close();
  await ctx.stop();
});

beforeEach(async () => {
  page?.close();
  const { cookie } = await forgeSession(ctx, `snackbar${accounts++}@example.com`);
  page = await openPage(ctx, "profile.html", {
    cookie,
    url: "http://localhost/profile",
    scripts: ["m3-ripple.js", "app.js", "cardShell.js", "profileCard.js"]
  });
  await page.settle(50);
});

const snackbar = (p: BrowserPage) => p.document.querySelector(".profile-snackbar") as HTMLElement | null;
const shown = (p: BrowserPage) => {
  const bar = snackbar(p);
  return bar && !bar.hidden ? bar.textContent : null;
};

function saveButton(p: BrowserPage): HTMLButtonElement {
  return Array.from(p.document.querySelectorAll("button")).find((b) => b.textContent === "Save User Name") as HTMLButtonElement;
}

async function saveName(p: BrowserPage, name: string) {
  const input = p.document.getElementById("userName") as HTMLInputElement;
  input.value = name;
  input.dispatchEvent(new p.window.Event("input", { bubbles: true }));
  saveButton(p).click();
}

function answerProfileSaveWith(p: BrowserPage, answer: () => Promise<Response>) {
  const realFetch = p.window.fetch;
  p.window.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
    String(input) === "/api/me" && init?.method === "PATCH" ? answer() : realFetch(input, init)) as typeof fetch;
}

describe("the profile snackbar", () => {
  it("confirms a saved user name for 4 seconds, beside the status line", async () => {
    const p = page!;
    const status = saveButton(p).parentElement!.querySelector(".card-shell-status")!;
    const statusTexts: string[] = [];
    new p.window.MutationObserver(() => statusTexts.push(status.textContent ?? "")).observe(status, { childList: true, characterData: true, subtree: true });
    await saveName(p, "Snack Bar");
    await p.settle();
    expect(statusTexts).toContain("Saved.");
    const bar = snackbar(p)!;
    expect(bar.getAttribute("role")).toBe("status");
    expect(shown(p)).toBe("User name saved");
    await p.settle(4100);
    expect(shown(p)).toBeNull();
  });

  it("restarts its 4 seconds when the name is saved again", async () => {
    const p = page!;
    await saveName(p, "First Name");
    await p.settle(2500);
    expect(shown(p)).toBe("User name saved");
    await saveName(p, "Second Name");
    await p.settle(2500);
    expect(shown(p)).toBe("User name saved");
    await p.settle(1800);
    expect(shown(p)).toBeNull();
  });

  it("stays away when the server refuses the name", async () => {
    const p = page!;
    await saveName(p, "x".repeat(201));
    await p.settle(100);
    expect(saveButton(p).parentElement!.querySelector(".card-shell-status")!.className).toContain("error");
    expect(shown(p)).toBeNull();
  });

  it("stays away on a rate limit", async () => {
    const p = page!;
    answerProfileSaveWith(p, async () =>
      ({
        ok: false,
        status: 429,
        headers: { get: () => null },
        json: async () => ({ error: "Too many requests.", nextAllowedAt: new Date(Date.now() + 60_000).toISOString() })
      }) as unknown as Response
    );
    await saveName(p, "Rate Limited");
    await p.settle(100);
    expect(shown(p)).toBeNull();
  });

  it("stays away when the server cannot be reached", async () => {
    const p = page!;
    answerProfileSaveWith(p, () => Promise.reject(new TypeError("Failed to fetch")));
    await saveName(p, "Offline");
    await p.settle(100);
    expect(saveButton(p).parentElement!.querySelector(".card-shell-status")!.textContent).toBe(
      "Could not reach the server, please try again."
    );
    expect(shown(p)).toBeNull();
  });
});
