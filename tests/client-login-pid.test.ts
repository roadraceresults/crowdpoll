import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";

let ctx: TestContext;
let page: BrowserPage | null = null;
const LINE = "Sign in to see the poll that was shared with you.";

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

const login = (search: string) => openPage(ctx, "login.html", { url: `http://localhost/login${search}`, scripts: ["app.js", "cardShell.js", "loginCard.js"] });
const createAccount = (search: string) =>
  openPage(ctx, "create-account.html", { url: `http://localhost/create-account${search}`, scripts: ["app.js", "cardShell.js", "createAccountCard.js"] });

async function sentBody(p: BrowserPage, form: string, path: string): Promise<Record<string, unknown>> {
  const sent: string[] = [];
  const original = p.window.fetch;
  p.window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith(path)) sent.push(String(init?.body));
    return original(input, init);
  }) as typeof p.window.fetch;
  const input = p.document.getElementById("email") as HTMLInputElement;
  input.value = "reader@example.com";
  input.dispatchEvent(new p.window.Event("input", { bubbles: true }));
  const terms = p.document.getElementById("terms") as HTMLInputElement | null;
  if (terms) {
    terms.checked = true;
    terms.dispatchEvent(new p.window.Event("change", { bubbles: true }));
  }
  p.document.querySelector(form)!.dispatchEvent(new p.window.Event("submit", { bubbles: true, cancelable: true }));
  await p.settle(100);
  expect(sent).toHaveLength(1);
  return JSON.parse(sent[0]!) as Record<string, unknown>;
}

describe("the login card with a shared poll link", () => {
  it("shows the generic line and sends the pid with the link request", async () => {
    const pid = randomUUID();
    page = await login(`?PID=${pid}`);
    await page.settle(100);
    expect(page.document.querySelector(".shared-poll-line")!.textContent).toBe(LINE);
    expect(await sentBody(page, "#login-form", "/api/auth/request-login-link")).toMatchObject({ email: "reader@example.com", pid });
  });

  it("ignores an id that is not a poll id", async () => {
    page = await login("?PID=//evil.example");
    await page.settle(100);
    expect(page.document.querySelector(".shared-poll-line")).toBeNull();
    expect(await sentBody(page, "#login-form", "/api/auth/request-login-link")).not.toHaveProperty("pid");
  });

  it("is unchanged without a pid", async () => {
    page = await login("");
    await page.settle(100);
    expect(page.document.querySelector(".shared-poll-line")).toBeNull();
  });

  it("keeps the pid when the link was no longer valid, and still says so", async () => {
    const pid = randomUUID();
    page = await login(`?error=invalid-link&PID=${pid}`);
    await page.settle(100);
    expect(page.document.querySelector(".shared-poll-line")).not.toBeNull();
    expect(page.document.body.textContent).toContain("That sign-in link is no longer valid.");
    expect(await sentBody(page, "#login-form", "/api/auth/request-login-link")).toMatchObject({ pid });
  });

  it("carries the pid on the provider sign-in in oauth mode", async () => {
    const oauth = await startTestContext({ ENV_SIGNIN_METHOD: "oauth", ENV_OAUTH_GOOGLE_CLIENT_ID: "google-client", ENV_OAUTH_GOOGLE_CLIENT_SECRET: "google-secret" });
    try {
      const pid = randomUUID();
      page = await openPage(oauth, "login.html", { url: `http://localhost/login?PID=${pid}`, scripts: ["app.js", "cardShell.js", "loginCard.js"] });
      await page.settle(100);
      const sent: string[] = [];
      const original = page.window.fetch;
      page.window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).endsWith("/api/auth/sign-in/social")) sent.push(String(init?.body));
        return original(input, init);
      }) as typeof page.window.fetch;
      page.document.querySelector<HTMLButtonElement>(".oauth-providers button")!.click();
      await page.settle(100);
      expect(sent.map((body) => JSON.parse(body).callbackURL)).toEqual([`/?PID=${pid}`]);
    } finally {
      page?.close();
      page = null;
      await oauth.stop();
    }
  });
});

describe("the create-account card with a shared poll link", () => {
  it("shows the generic line and sends the pid", async () => {
    const pid = randomUUID();
    page = await createAccount(`?PID=${pid}`);
    await page.settle(100);
    expect(page.document.querySelector(".shared-poll-line")!.textContent).toBe(LINE);
    expect(await sentBody(page, "#create-form", "/api/auth/create-account")).toMatchObject({ email: "reader@example.com", pid });
  });

  it("is unchanged without a pid", async () => {
    page = await createAccount("");
    await page.settle(100);
    expect(page.document.querySelector(".shared-poll-line")).toBeNull();
    expect(await sentBody(page, "#create-form", "/api/auth/create-account")).not.toHaveProperty("pid");
  });
});
