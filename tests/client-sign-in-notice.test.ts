/**
 * "Logged in as": the snackbar after a provider login, and the line on the Accept Terms card.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { forgeSession, startTestContext, withoutAgreement, type TestContext } from "./helpers/setup.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";

const NOTICE_MS = 6000;
const PID = "6f1c2b9e-3d4a-4f5b-8c7d-9e0a1b2c3d4e";

let ctx: TestContext;
let page: BrowserPage | null = null;
let accounts = 0;

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

async function account() {
  const email = `notice-${++accounts}@example.com`;
  return { ...(await forgeSession(ctx, email)), email };
}

/** Holds back the notice's timer, so a suite need not wait out its seven seconds. */
async function openHome(query: string, cookie?: string) {
  const held: (() => void)[] = [];
  page = await openPage(ctx, "index.html", {
    url: `http://localhost/${query}`,
    cookie,
    scripts: ["app.js"],
    beforeScripts: (window) => {
      const real = window.setTimeout;
      window.setTimeout = ((fn: () => void, ms?: number) => {
        if (ms === NOTICE_MS) {
          held.push(fn);
          return 0;
        }
        return real(fn, ms);
      }) as typeof window.setTimeout;
    }
  });
  await page.settle(50);
  return { page, held };
}

const snackbar = (p: BrowserPage) => p.document.querySelector<HTMLElement>(".m3-snackbar");

describe("the snackbar (C4)", () => {
  it("shows the address once, politely and with no action, for seven seconds", async () => {
    const { cookie, email } = await account();
    const { page: p, held } = await openHome("?signedIn=1", cookie);
    const bar = snackbar(p)!;
    expect(bar.textContent).toBe(`Logged in as ${email}`);
    expect(bar.classList.contains("m3-snackbar--top")).toBe(true);
    expect(bar.getAttribute("role")).toBe("status");
    expect(bar.querySelector("button, a")).toBeNull();
    expect(bar.classList.contains("is-shown")).toBe(true);
    expect(held).toHaveLength(1);
    held[0]!();
    expect(bar.classList.contains("is-shown")).toBe(false);
  });

  it("ends with an hourglass timed by the notice's own duration, after the unchanged text", async () => {
    const { cookie, email } = await account();
    const { page: p } = await openHome("?signedIn=1", cookie);
    const bar = snackbar(p)!;
    expect(bar.classList.contains("m3-snackbar--timed")).toBe(true);
    expect(bar.style.getPropertyValue("--m3-snackbar-timer")).toBe(`${NOTICE_MS}ms`);
    const text = bar.firstElementChild!;
    expect(text.matches("span.m3-snackbar-text")).toBe(true);
    expect(text.textContent).toBe(`Logged in as ${email}`);
    const hourglass = bar.lastElementChild!;
    expect(hourglass.matches("svg.m3-snackbar-hourglass")).toBe(true);
    expect(hourglass.getAttribute("viewBox")).toBe("0 0 22 32");
    expect(hourglass.querySelectorAll(".hourglass-frame")).toHaveLength(1);
    for (const part of ["hourglass-top", "hourglass-stream", "hourglass-bottom"]) {
      expect(hourglass.querySelectorAll(`.${part}.hourglass-part`)).toHaveLength(1);
    }
    expect(bar.textContent).toBe(`Logged in as ${email}`);
  });

  it("hides the hourglass from assistive technology, with nothing of its own to announce", async () => {
    const { cookie } = await account();
    const { page: p } = await openHome("?signedIn=1", cookie);
    const hourglass = snackbar(p)!.querySelector("svg.m3-snackbar-hourglass")!;
    expect(hourglass.getAttribute("aria-hidden")).toBe("true");
    expect(hourglass.getAttribute("focusable")).toBe("false");
    expect(hourglass.querySelector("title, text")).toBeNull();
  });

  it("removes the parameter, keeping a shared poll's, so a reload shows nothing", async () => {
    const { cookie } = await account();
    const { page: p } = await openHome(`?PID=${PID}&signedIn=1`, cookie);
    expect(p.window.location.search).toBe(`?PID=${PID}`);
    expect(snackbar(p)).not.toBeNull();
    p.close();
    const { page: reloaded } = await openHome(`?PID=${PID}`, cookie);
    expect(snackbar(reloaded)).toBeNull();
  });

  it("shows nothing to a guest, and still removes the parameter", async () => {
    const { page: p } = await openHome("?signedIn=1");
    expect(snackbar(p)).toBeNull();
    expect(p.window.location.search).toBe("");
  });

  it("shows nothing to someone who has not accepted the Terms, and still removes the parameter", async () => {
    const { cookie, userId } = await account();
    await withoutAgreement(ctx, userId);
    const { page: p } = await openHome("?signedIn=1", cookie);
    expect(snackbar(p)).toBeNull();
    expect(p.navigations.length).toBeGreaterThan(0);
    expect(p.window.location.search).toBe("");
  });

  it("shows nothing with no parameter, as on a reload or an ordinary visit", async () => {
    const { cookie } = await account();
    const { page: p } = await openHome("", cookie);
    expect(snackbar(p)).toBeNull();
  });
});

describe("the line on Accept Terms (C3)", () => {
  async function openAcceptTerms(next: string, cookie: string, me?: object) {
    page = await openPage(ctx, "accept-terms.html", {
      url: `http://localhost/accept-terms?next=${encodeURIComponent(next)}`,
      cookie,
      scripts: ["app.js", "cardShell.js", "acceptTermsCard.js"],
      beforeScripts: (window) => {
        if (!me) return;
        const real = window.fetch;
        window.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
          String(input) === "/api/me"
            ? Promise.resolve({ ok: true, status: 200, headers: { get: () => null }, json: async () => me, text: async () => JSON.stringify(me) } as unknown as Response)
            : real(input, init)) as typeof window.fetch;
      }
    });
    await page.settle(50);
    return page;
  }

  const line = (p: BrowserPage) => p.document.querySelector(".accept-terms-account");

  it("appears for a new account, before the Terms box", async () => {
    const { cookie, userId, email } = await account();
    await withoutAgreement(ctx, userId);
    const p = await openAcceptTerms("/", cookie);
    expect(p.document.querySelector("h1, h2, .question")?.textContent).toContain("Welcome");
    expect(line(p)!.textContent).toBe(`Logged in as ${email}`);
    const box = p.document.getElementById("terms")!;
    expect(line(p)!.compareDocumentPosition(box) & p.window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("appears for updated Terms", async () => {
    const { cookie, userId, email } = await account();
    await ctx.db.updateTable("user").set({ terms_version: "2000-01-01" }).where("id", "=", userId).execute();
    const p = await openAcceptTerms("/", cookie);
    expect(p.document.querySelector("h1, h2, .question")?.textContent).toContain("Updated");
    expect(line(p)!.textContent).toBe(`Logged in as ${email}`);
  });

  const notices: [string, object, string][] = [
    ["both", { termsUpdated: true, privacyUpdated: true }, "Terms of Service and Privacy Policy"],
    ["the Terms", { termsUpdated: true, privacyUpdated: false }, "Terms of Service"],
    ["the Privacy Policy", { termsUpdated: false, privacyUpdated: true }, "Privacy Policy"],
    ["the Terms, without an answer", {}, "Terms of Service"]
  ];
  for (const [what, flags, documents] of notices) {
    it(`names ${what} in the notice`, async () => {
      const { cookie } = await account();
      const p = await openAcceptTerms("/", cookie, { termsAccepted: false, ...flags });
      expect(p.document.querySelector("h1")?.textContent).toBe(`Updated ${documents}`);
      expect(p.document.title).toBe(`Updated ${documents}`);
      expect(p.document.querySelector(".card-shell-subtitle")?.textContent).toBe(`Please read and accept the ${documents} to continue.`);
    });
  }

  it("is left out when the profile gives no address", async () => {
    const { cookie, userId } = await account();
    await withoutAgreement(ctx, userId);
    const p = await openAcceptTerms("/", cookie, { termsFirstAcceptance: true, termsAccepted: false });
    expect(p.document.getElementById("terms")).not.toBeNull();
    expect(line(p)).toBeNull();
  });

  async function postedNext(next: string): Promise<unknown> {
    const { cookie, userId } = await account();
    await withoutAgreement(ctx, userId);
    const p = await openAcceptTerms(next, cookie);
    const box = p.document.getElementById("terms") as HTMLInputElement;
    box.checked = true;
    box.dispatchEvent(new p.window.Event("change", { bubbles: true }));
    [...p.document.querySelectorAll("button")].find((b) => b.textContent === "Accept")!.click();
    await p.settle(100);
    const posted = p.requests.find((r) => r.url === "/api/legal/accept-terms");
    return (posted!.body as { next: unknown }).next;
  }

  it("takes signedIn out of the next that is posted, so no snackbar follows", async () => {
    expect(await postedNext("/?signedIn=1")).toBe("/");
  });

  it("keeps the other parameters of next", async () => {
    expect(await postedNext(`/?PID=${PID}&signedIn=1`)).toBe(`/?PID=${PID}`);
    expect(await postedNext(`/?PID=${PID}`)).toBe(`/?PID=${PID}`);
    expect(await postedNext("/profile")).toBe("/profile");
  });
});
