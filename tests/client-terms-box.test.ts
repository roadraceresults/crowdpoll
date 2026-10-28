import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, withoutAgreement, type TestContext } from "./helpers/setup.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import { TERMS_VERSION } from "../src/legal/version.js";

let ctx: TestContext;
let page: BrowserPage | null = null;

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

function capture(p: BrowserPage, path: string): string[] {
  const sent: string[] = [];
  const original = p.window.fetch;
  p.window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith(path)) sent.push(String(init?.body));
    return original(input, init);
  }) as typeof p.window.fetch;
  return sent;
}

function tick(p: BrowserPage, checked = true): void {
  const box = p.document.getElementById("terms") as HTMLInputElement;
  box.checked = checked;
  box.dispatchEvent(new p.window.Event("change", { bubbles: true }));
}

function actionButton(p: BrowserPage, label: string): HTMLButtonElement {
  return [...p.document.querySelectorAll("button")].find((b) => b.textContent === label) as HTMLButtonElement;
}

describe("the Create Account card's agreement box (C3)", () => {
  it("keeps Create Account unavailable until the box is ticked, and sends the agreement", async () => {
    page = await openPage(ctx, "create-account.html", {
      url: "http://localhost/create-account",
      scripts: ["app.js", "cardShell.js", "createAccountCard.js"]
    });
    await page.settle();
    const box = page.document.getElementById("terms") as HTMLInputElement;
    expect(box.checked).toBe(false);
    const label = box.closest("label")!;
    expect([...label.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual(["/terms", "/privacy"]);
    expect([...label.children].map((c) => c.tagName)).toEqual(["INPUT", "SPAN"]);
    const sentence = label.querySelector(".terms-box-text")!;
    expect([...sentence.childNodes].map((n) => (n.nodeName === "BR" ? "\n" : n.textContent)).join("")).toBe(
      "I agree to the Terms of Service\nand have read the Privacy Policy."
    );

    const input = page.document.getElementById("email") as HTMLInputElement;
    input.value = "reader@example.com";
    input.dispatchEvent(new page.window.Event("input", { bubbles: true }));
    const button = actionButton(page, "Create Account");
    expect(button.getAttribute("aria-disabled") === "true" || button.disabled).toBe(true);

    tick(page);
    expect(button.getAttribute("aria-disabled") === "true" || button.disabled).toBe(false);
    tick(page, false);
    expect(button.getAttribute("aria-disabled") === "true" || button.disabled).toBe(true);
    tick(page);

    const sent = capture(page, "/api/auth/create-account");
    button.click();
    await page.settle(100);
    expect(JSON.parse(sent[0]!)).toMatchObject({ email: "reader@example.com", acceptedTerms: true, termsVersion: TERMS_VERSION });
  });
});

describe("the Login card (C4)", () => {
  it("links the Terms and the Privacy Policy in native mode", async () => {
    page = await openPage(ctx, "login.html", { url: "http://localhost/login", scripts: ["app.js", "cardShell.js", "loginCard.js"] });
    await page.settle();
    const line = page.document.querySelector(".login-terms-line")!;
    expect([...line.childNodes].map((n) => (n.nodeName === "BR" ? "\n" : n.textContent)).join("")).toBe(
      "By signing in you agree to the Terms of Service\nand Privacy Policy."
    );
    expect([...line.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual(["/terms", "/privacy"]);
  });

  describe("in oauth mode", () => {
    let oauthCtx: TestContext;
    beforeAll(async () => {
      oauthCtx = await startTestContext({ ENV_SIGNIN_METHOD: "oauth", ENV_OAUTH_GOOGLE_CLIENT_ID: "google-client", ENV_OAUTH_GOOGLE_CLIENT_SECRET: "google-secret" });
    });
    afterAll(async () => {
      await oauthCtx.stop();
    });

    it("has no Terms box: agreement comes after the sign-in, on the Accept Terms card", async () => {
      page = await openPage(oauthCtx, "login.html", { url: "http://localhost/login", scripts: ["app.js", "cardShell.js", "loginCard.js"] });
      await page.settle();
      const providers = [...page.document.querySelectorAll(".oauth-providers button")];
      expect(providers.length).toBeGreaterThan(0);
      expect(page.document.getElementById("terms")).toBeNull();
      for (const a of providers) expect(a.getAttribute("aria-disabled")).toBe("false");
    });
  });
});

describe("the accept page (C5)", () => {
  it("enables Accept once ticked and posts the current version", async () => {
    const { cookie, userId } = await forgeSession(ctx, "accept-card@example.org");
    await withoutAgreement(ctx, userId);
    page = await openPage(ctx, "accept-terms.html", {
      cookie,
      url: "http://localhost/accept-terms?next=%2Fprofile",
      scripts: ["app.js", "cardShell.js", "acceptTermsCard.js"]
    });
    await page.settle();
    const accept = actionButton(page, "Accept");
    expect(accept.getAttribute("aria-disabled") === "true" || accept.disabled).toBe(true);
    expect(accept.classList.contains("btn-text")).toBe(false);
    expect(actionButton(page, "Sign Out").classList.contains("btn-text")).toBe(true);
    tick(page);
    expect(accept.getAttribute("aria-disabled") === "true" || accept.disabled).toBe(false);
    const sent = capture(page, "/api/legal/accept-terms");
    accept.click();
    await page.settle(100);
    expect(JSON.parse(sent[0]!)).toEqual({ termsVersion: TERMS_VERSION, next: "/profile" });
  });

  it("greets an account that has never accepted the Terms", async () => {
    const { cookie, userId } = await forgeSession(ctx, "accept-first@example.org");
    await withoutAgreement(ctx, userId);
    page = await openPage(ctx, "accept-terms.html", {
      cookie,
      url: "http://localhost/accept-terms?next=%2F",
      scripts: ["app.js", "cardShell.js", "acceptTermsCard.js"]
    });
    await page.settle();
    expect(page.document.querySelector("h1")?.textContent).toBe("Welcome to CrowdPoll");
    expect(page.document.querySelector(".card-shell-subtitle")?.textContent).toBe("Before you continue, please accept the Terms of Service.");
    expect(page.document.querySelector(".card-shell-badge")).not.toBeNull();
  });

  it("tells an account that accepted an earlier version the Terms were updated", async () => {
    const { cookie, userId } = await forgeSession(ctx, "accept-older@example.org");
    await ctx.db.updateTable("user").set({ terms_version: "2000-01-01" }).where("id", "=", userId).execute();
    await ctx.sessions.forgetUserSessions(userId);
    page = await openPage(ctx, "accept-terms.html", {
      cookie,
      url: "http://localhost/accept-terms?next=%2F",
      scripts: ["app.js", "cardShell.js", "acceptTermsCard.js"]
    });
    await page.settle();
    expect(page.document.querySelector("h1")?.textContent).toBe("Updated Terms of Service");
    expect(page.document.querySelector(".card-shell-subtitle")?.textContent).toBe("Please read and accept the Terms of Service to continue.");
  });
});
