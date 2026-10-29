/**
 * The login card says how long "stay signed in" lasts, from ENV_MAX_SIGNIN_COOKIE_DURATION:
 * whole days rounded down ("day" for one, "days" for more), and hours to two decimals
 * below a day (a test deployment only).
 */
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";

let ctx: TestContext;
let page: BrowserPage | null = null;
let original: number;
let originalDefault: boolean;

beforeAll(async () => {
  ctx = await startTestContext();
  original = ctx.config.maxSigninCookieDurationMs;
  originalDefault = ctx.config.staySignedInDefault;
});
afterAll(async () => {
  await ctx.stop();
});
afterEach(() => {
  page?.close();
  page = null;
  ctx.config.maxSigninCookieDurationMs = original;
  ctx.config.staySignedInDefault = originalDefault;
});

async function stayText(ms: number | null): Promise<string> {
  if (ms !== null) ctx.config.maxSigninCookieDurationMs = ms;
  page = await openPage(ctx, "login.html", {
    url: "http://localhost/login",
    scripts: ["app.js", "cardShell.js", "loginCard.js"]
  });
  await page.settle(100);
  return page.document.querySelector("label.checkbox")!.textContent!.trim();
}

const DAY = 86400000;
const HOUR = 3600000;

describe("the stay-signed-in help text", () => {
  it("serves the duration in the configuration", async () => {
    const res = await request(ctx.app).get("/api/config");
    expect(res.body.maxSigninCookieDurationMs).toBe(original);
  });

  it("says 30 days for the default setting", async () => {
    expect(await stayText(null)).toBe("Stay signed in on this device for 30 days");
  });

  it.each([
    [DAY, "1 day"],
    [2 * DAY - 1, "1 day"],
    [2 * DAY, "2 days"],
    [7 * DAY + 5 * HOUR, "7 days"]
  ])("rounds %d ms down to whole days: %s", async (ms, expected) => {
    expect(await stayText(ms)).toBe(`Stay signed in on this device for ${expected}`);
  });

  it.each([
    [90 * 60000, "1.5 hours"],
    [HOUR, "1 hours"],
    [DAY - 1, "24 hours"],
    [20 * 60000, "0.33 hours"]
  ])("shows %d ms below a day as hours to two decimals: %s", async (ms, expected) => {
    expect(await stayText(ms)).toBe(`Stay signed in on this device for ${expected}`);
  });
});

describe("the stay-signed-in box default", () => {
  async function stayBox(): Promise<HTMLInputElement> {
    page = await openPage(ctx, "login.html", {
      url: "http://localhost/login",
      scripts: ["app.js", "cardShell.js", "loginCard.js"]
    });
    await page.settle(100);
    return page.document.getElementById("stay") as HTMLInputElement;
  }

  it("is clear by default and the configuration says so", async () => {
    const res = await request(ctx.app).get("/api/config");
    expect(res.body.staySignedInDefault).toBe(false);
    expect((await stayBox()).checked).toBe(false);
  });

  it("starts ticked when ENV_STAY_SIGNED_IN is 1, and the choice is sent with the link request", async () => {
    ctx.config.staySignedInDefault = true;
    const box = await stayBox();
    expect(box.checked).toBe(true);
    const win = page!.window;
    const sent: string[] = [];
    const original = win.fetch;
    win.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/api/auth/request-login-link")) sent.push(String(init?.body));
      return original(input, init);
    }) as typeof win.fetch;
    const email = page!.document.getElementById("email") as HTMLInputElement;
    email.value = "reader@example.com";
    email.dispatchEvent(new win.Event("input", { bubbles: true }));
    page!.document.getElementById("login-form")!.dispatchEvent(new page!.window.Event("submit", { bubbles: true, cancelable: true }));
    await page!.settle(100);
    expect(JSON.parse(sent[0]!)).toMatchObject({ staySignedIn: true });
  });
});
