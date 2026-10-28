/**
 * The Login and Create Account cards (TWEAKS05): a lock badge above the title, the subtitle as lines with
 * "We do not store passwords." as its smaller last line, and a foot line leading to the other card, which
 * keeps a shared poll's ?PID=. The Login card has no Create account line in oauth mode, where
 * /create-account does not exist.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";

const PROVIDERS = {
  ENV_OAUTH_GOOGLE_CLIENT_ID: "google-client",
  ENV_OAUTH_GOOGLE_CLIENT_SECRET: "google-secret"
};
const PID = "0f8fad5b-d9cb-469f-a165-70867728950e";

let page: BrowserPage | null = null;
afterEach(() => {
  page?.close();
  page = null;
});

async function login(ctx: TestContext, query = ""): Promise<BrowserPage> {
  const p = await openPage(ctx, "login.html", { url: `http://localhost/login${query}`, scripts: ["app.js", "cardShell.js", "loginCard.js"] });
  await p.settle();
  return p;
}

async function createAccount(ctx: TestContext, query = ""): Promise<BrowserPage> {
  const p = await openPage(ctx, "create-account.html", {
    url: `http://localhost/create-account${query}`,
    scripts: ["app.js", "cardShell.js", "createAccountCard.js"]
  });
  await p.settle();
  return p;
}

const lines = (p: BrowserPage) => [...p.document.querySelectorAll(".card-shell-subtitle-line")].map((n) => n.textContent);
const note = (p: BrowserPage) => p.document.querySelector(".card-shell-subtitle-note")?.textContent;
const foot = (p: BrowserPage) => p.document.querySelector(".card-shell-foot");

function expectBadge(p: BrowserPage): void {
  const face = p.document.querySelector(".card-shell-face") as HTMLElement;
  expect(face.classList.contains("card-shell-signin")).toBe(true);
  const top = face.querySelector(".card-shell-top-row") as HTMLElement;
  expect(top).not.toBeNull();
  expect(top.querySelector(".card-shell-badge svg")?.getAttribute("aria-hidden")).toBe("true");
  expect(top.querySelector(".card-shell-close")).not.toBeNull();
  expect(top.nextElementSibling?.querySelector("h1")).not.toBeNull();
}

describe("native mode", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await startTestContext();
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("the Login card has the badge, its subtitle lines and a Create account line", async () => {
    page = await login(ctx);
    expectBadge(page);
    expect(lines(page)).toEqual(["We email you a one-time sign-in link."]);
    expect(note(page)).toBe("We do not store passwords.");
    expect(foot(page)?.textContent).toBe("Don't have an account? Create account");
    expect(foot(page)?.querySelector("a")?.getAttribute("href")).toBe("/create-account");
  });

  it("the Create account line keeps a shared poll's id", async () => {
    page = await login(ctx, `?PID=${PID}`);
    expect(foot(page)?.querySelector("a")?.getAttribute("href")).toBe(`/create-account?PID=${PID}`);
  });

  it("the Create Account card has the badge, its subtitle lines and a Log in line", async () => {
    page = await createAccount(ctx);
    expectBadge(page);
    expect(lines(page)).toEqual(["Enter your email address.", "We will create your account and email your first sign-in link."]);
    expect(note(page)).toBe("We do not store passwords.");
    expect(foot(page)?.textContent).toBe("Already have an account? Log in");
    expect(foot(page)?.querySelector("a")?.getAttribute("href")).toBe("/login");
  });

  it("the Log in line keeps a shared poll's id", async () => {
    page = await createAccount(ctx, `?PID=${PID}`);
    expect(foot(page)?.querySelector("a")?.getAttribute("href")).toBe(`/login?PID=${PID}`);
  });

  it("the header offers a guest Log In only", async () => {
    page = await login(ctx);
    const header = page.document.getElementById("header-actions") as HTMLElement;
    expect([...header.querySelectorAll("button")].map((b) => b.textContent)).toEqual(["Log In"]);
  });
});

describe("both mode", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await startTestContext({ ENV_SIGNIN_METHOD: "both", ...PROVIDERS });
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("the Login card names both ways in two lines and keeps the Create account line", async () => {
    page = await login(ctx);
    expectBadge(page);
    expect(lines(page)).toEqual(["Sign in with a provider,", "or we email you a one-time sign-in link."]);
    expect(note(page)).toBe("We do not store passwords.");
    expect(foot(page)?.textContent).toBe("Don't have an account? Create account");
  });
});

describe("oauth mode", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await startTestContext({ ENV_SIGNIN_METHOD: "oauth", ...PROVIDERS });
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("the Login card names the providers and has no Create account line", async () => {
    page = await login(ctx);
    expectBadge(page);
    expect(lines(page)).toEqual(["Sign in with your Google, Apple, Microsoft or Amazon account."]);
    expect(note(page)).toBe("We do not store passwords.");
    expect(foot(page)).toBeNull();
  });
});
