import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";

let ctx: TestContext;
let page: BrowserPage | null = null;
let accounts = 1;

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});
afterEach(() => {
  page?.close();
  page = null;
});

function captureBodies(p: BrowserPage, path: string): string[] {
  const sent: string[] = [];
  const original = p.window.fetch;
  p.window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith(path)) sent.push(String(init?.body));
    return original(input, init);
  }) as typeof p.window.fetch;
  return sent;
}

function expectHidden(p: BrowserPage): HTMLInputElement {
  const input = p.document.querySelector('input[name="homepage"]') as HTMLInputElement | null;
  expect(input).not.toBeNull();
  expect(input!.getAttribute("tabindex")).toBe("-1");
  expect(input!.getAttribute("autocomplete")).toBe("off");
  expect(input!.closest('[aria-hidden="true"]')).not.toBeNull();
  expect(input!.closest(".hp-field")).not.toBeNull();
  return input!;
}

async function submit(p: BrowserPage, form: string, field: string, value: string): Promise<void> {
  const input = p.document.getElementById(field) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new p.window.Event("input", { bubbles: true }));
  const terms = p.document.getElementById("terms") as HTMLInputElement | null;
  if (terms) {
    terms.checked = true;
    terms.dispatchEvent(new p.window.Event("change", { bubbles: true }));
  }
  p.document.querySelector(form)!.dispatchEvent(new p.window.Event("submit", { bubbles: true, cancelable: true }));
  await p.settle(100);
}

describe("the hidden homepage field on the emailing forms (C1)", () => {
  it("the login card carries it and sends its value", async () => {
    page = await openPage(ctx, "login.html", {
      url: "http://localhost/login",
      scripts: ["app.js", "cardShell.js", "loginCard.js"]
    });
    await page.settle(100);
    expectHidden(page);
    const sent = captureBodies(page, "/api/auth/request-login-link");
    await submit(page, "#login-form", "email", "reader@example.com");
    expect(JSON.parse(sent[0]!)).toMatchObject({ email: "reader@example.com", homepage: "" });
  });

  it("the create-account card carries it and sends its value", async () => {
    page = await openPage(ctx, "create-account.html", {
      url: "http://localhost/create-account",
      scripts: ["app.js", "cardShell.js", "createAccountCard.js"]
    });
    await page.settle(100);
    const hidden = expectHidden(page);
    hidden.value = "https://spam.example";
    const sent = captureBodies(page, "/api/auth/create-account");
    await submit(page, "#create-form", "email", "reader@example.com");
    expect(JSON.parse(sent[0]!)).toMatchObject({ homepage: "https://spam.example" });
  });

  it("the profile card's email change carries it and sends its value", async () => {
    const { cookie } = await forgeSession(ctx, `hp${accounts++}@example.com`);
    page = await openPage(ctx, "profile.html", {
      cookie,
      url: "http://localhost/profile",
      scripts: ["m3-ripple.js", "app.js", "cardShell.js", "profileCard.js"]
    });
    await page.settle(200);
    expectHidden(page);
    const sent = captureBodies(page, "/api/me/email-change");
    const input = page.document.getElementById("newEmail") as HTMLInputElement;
    input.value = "moved@example.com";
    input.dispatchEvent(new page.window.Event("input", { bubbles: true }));
    const button = Array.from(page.document.querySelectorAll("button")).find((b) =>
      /Send Verification Link/.test(b.textContent ?? "")
    ) as HTMLButtonElement;
    button.click();
    await page.settle(100);
    expect(JSON.parse(sent[0]!)).toMatchObject({ newEmail: "moved@example.com", homepage: "" });
  });
});
