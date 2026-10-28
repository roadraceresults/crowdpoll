import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { NOT_LAUNCHED_MESSAGE } from "../src/auth/allowlist.js";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";

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

describe("the not-launched notice", () => {
  it("shows on the Login card for ?error=not-launched (C2)", async () => {
    page = await openPage(ctx, "login.html", {
      url: "http://localhost/login?error=not-launched",
      scripts: ["app.js", "cardShell.js", "loginCard.js"]
    });
    await page.settle(100);
    const status = page.document.querySelector(".card-shell-status.error");
    expect(status?.textContent).toBe(NOT_LAUNCHED_MESSAGE);
  });

  it("shows on the Profile page for ?error=not-launched (C3)", async () => {
    page = await openPage(ctx, "profile.html", {
      url: "http://localhost/profile?error=not-launched",
      scripts: ["app.js", "cardShell.js", "profileCard.js"]
    });
    await page.settle(100);
    expect(page.document.body.textContent).toContain(NOT_LAUNCHED_MESSAGE);
  });
});

describe("the not-launched notice in oauth mode", () => {
  let oauthCtx: TestContext;
  beforeAll(async () => {
    oauthCtx = await startTestContext({ ENV_SIGNIN_METHOD: "oauth", ENV_OAUTH_GOOGLE_CLIENT_ID: "google-client", ENV_OAUTH_GOOGLE_CLIENT_SECRET: "google-secret" });
  });
  afterAll(async () => {
    await oauthCtx.stop();
  });

  it("shows on the Login card after a refused social sign-in (T033)", async () => {
    page = await openPage(oauthCtx, "login.html", {
      url: "http://localhost/login?error=not-launched",
      scripts: ["app.js", "cardShell.js", "loginCard.js"]
    });
    await page.settle(100);
    expect(page.document.querySelector(".card-shell-status.error")?.textContent).toBe(NOT_LAUNCHED_MESSAGE);
  });
});
