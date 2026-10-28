/**
 * The Login card's provider buttons (contracts/ui-contracts.md C1, C2): one per enabled provider in display
 * order, usable at once (agreement is asked for afterwards, on the Accept Terms card), each starting its provider's sign-in; the email form follows a
 * divider in both mode; a refused sign-in's ?error= code shows its message.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { NOT_LAUNCHED_MESSAGE } from "../src/auth/allowlist.js";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";

const PROVIDERS = {
  ENV_OAUTH_GOOGLE_CLIENT_ID: "google-client",
  ENV_OAUTH_GOOGLE_CLIENT_SECRET: "google-secret",
  ENV_OAUTH_MICROSOFT_CLIENT_ID: "ms-client",
  ENV_OAUTH_MICROSOFT_CLIENT_SECRET: "ms-secret",
  ENV_OAUTH_AMAZON_CLIENT_ID: "amzn-client",
  ENV_OAUTH_AMAZON_CLIENT_SECRET: "amzn-secret"
};

let page: BrowserPage | null = null;
afterEach(() => {
  page?.close();
  page = null;
});

function login(ctx: TestContext, query = ""): Promise<BrowserPage> {
  return openPage(ctx, "login.html", { url: `http://localhost/login${query}`, scripts: ["app.js", "cardShell.js", "loginCard.js"] });
}

function buttons(p: BrowserPage): HTMLButtonElement[] {
  return [...p.document.querySelectorAll<HTMLButtonElement>(".oauth-providers button")];
}

function capture(p: BrowserPage, path: string): unknown[] {
  const sent: unknown[] = [];
  const original = p.window.fetch;
  p.window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith(path)) sent.push(JSON.parse(String(init?.body)));
    return original(input, init);
  }) as typeof p.window.fetch;
  return sent;
}

describe("oauth mode", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await startTestContext({ ENV_SIGNIN_METHOD: "oauth", ...PROVIDERS });
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("shows one button per enabled provider, in order, with its logo and wording, and no email form", async () => {
    page = await login(ctx);
    await page.settle();
    expect(buttons(page).map((b) => b.textContent)).toEqual(["Sign in with Google", "Sign in with Microsoft", "Login with Amazon"]);
    expect(buttons(page).map((b) => b.querySelector("img")!.getAttribute("src"))).toEqual([
      "/oauth/google.svg",
      "/oauth/microsoft.svg",
      "/oauth/amazon.svg"
    ]);
    for (const img of page.document.querySelectorAll(".oauth-providers img")) expect(img.getAttribute("alt")).toBe("");
    expect(page.document.getElementById("login-form")).toBeNull();
    expect(page.document.querySelector(".oauth-divider")).toBeNull();
  });

  it("has no Terms box: the buttons work at once, and a line below them names the Terms", async () => {
    page = await login(ctx);
    await page.settle();
    expect(page.document.getElementById("terms")).toBeNull();
    for (const b of buttons(page)) expect(b.getAttribute("aria-disabled")).toBe("false");
    const line = page.document.querySelector(".login-terms-line")!;
    expect(line.textContent!.startsWith("By signing in you agree to the Terms of Service")).toBe(true);
    expect([...line.querySelectorAll("a")].map((link) => link.getAttribute("href"))).toEqual(["/terms", "/privacy"]);
    expect(buttons(page).at(-1)!.compareDocumentPosition(line) & page.window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("starts Google's sign-in with the shared poll's landing and goes to the address it is given", async () => {
    const pid = "6f1c2b9e-3d4a-4f5b-8c7d-9e0a1b2c3d4e";
    page = await login(ctx, `?PID=${pid}`);
    await page.settle();
    const sent = capture(page, "/api/auth/sign-in/social");
    buttons(page)[0]!.click();
    await page.settle(100);
    expect(sent).toEqual([{ provider: "google", callbackURL: `/?PID=${pid}` }]);
    expect(page.navigations.length).toBeGreaterThan(0);
  });

  it("starts Amazon's sign-in at its own route", async () => {
    page = await login(ctx);
    await page.settle();
    const sent = capture(page, "/api/auth/sign-in/oauth2");
    buttons(page)[2]!.click();
    await page.settle(100);
    expect(sent).toEqual([{ providerId: "amazon", callbackURL: "/" }]);
  });

  it("shows each refusal's message (C2)", async () => {
    const cases: [string, string][] = [
      ["not-launched", NOT_LAUNCHED_MESSAGE],
      ["access_denied", "Sign-in was cancelled."],
      ["account_not_linked", "An account already uses this email address. Sign in the way you usually do."],
      ["email_not_found", "CrowdPoll needs your email address to sign you in; try another way."],
      ["invalid_code", "Sign-in with that provider failed. Please try again."]
    ];
    for (const [code, message] of cases) {
      page = await login(ctx, `?error=${code}`);
      await page.settle();
      expect(page.document.querySelector(".card-shell-status.error")?.textContent).toBe(message);
      page.close();
      page = null;
    }
  });
});

describe("both mode", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await startTestContext({ ENV_SIGNIN_METHOD: "both", ENV_OAUTH_GOOGLE_CLIENT_ID: "google-client", ENV_OAUTH_GOOGLE_CLIENT_SECRET: "google-secret" });
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("puts the email form after the buttons, below a divider", async () => {
    page = await login(ctx);
    await page.settle();
    const wrap = page.document.querySelector(".oauth-providers")!;
    const divider = page.document.querySelector(".oauth-divider")!;
    const form = page.document.getElementById("login-form")!;
    expect(divider.textContent).toBe("or");
    expect(wrap.compareDocumentPosition(divider) & page.window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(divider.compareDocumentPosition(form) & page.window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(page.document.querySelector(".login-terms-line")).not.toBeNull();
  });

  it("keeps an expired email link's notice on the email form", async () => {
    page = await login(ctx, "?error=invalid-link");
    await page.settle();
    const errors = [...page.document.querySelectorAll(".card-shell-status.error")].map((s) => s.textContent);
    expect(errors).toEqual(["That sign-in link is no longer valid. Request a new one."]);
  });
});
