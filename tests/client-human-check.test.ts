/**
 * The human check before login, in the browser: /login, /create-account (form) and /invite open on a
 * "Vote protection" card; passing it draws the page's own card, whose login start carries the pass once.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import { TERMS_VERSION } from "../src/legal/version.js";

const HUMAN_CHECK_ON = {
  ENV_FCAPTCHA_ENABLED: "1",
  ENV_FCAPTCHA_URL: "http://fcaptcha.test",
  ENV_FCAPTCHA_SITE_KEY: "site-key",
  ENV_FCAPTCHA_VERIFY_SECRET: "verify-secret"
};
const PROVIDERS = {
  ENV_SIGNIN_METHOD: "both",
  ENV_OAUTH_GOOGLE_CLIENT_ID: "google-client",
  ENV_OAUTH_GOOGLE_CLIENT_SECRET: "google-secret"
};

/** FCaptcha's answers, server to server: every pass the fake widget hands out is good once. */
function fcaptcha(): typeof fetch {
  const spent = new Set<string>();
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/health")) return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
    const { token } = JSON.parse(String(init?.body)) as { token: string };
    const valid = token.startsWith("tok-") && !spent.has(token);
    spent.add(token);
    return new Response(JSON.stringify(valid ? { valid, hostname: "localhost", action: "" } : { valid: false }), { status: 200 });
  }) as typeof fetch;
}

interface FakeWidget {
  options: Record<string, unknown> & { callback(token: string): void; errorCallback(): void };
  container: HTMLElement;
}

/** A stand-in for FCaptcha's browser widget: a focusable checkbox whose outcome the test decides. */
const configured: { serverUrl?: string }[] = [];

function installWidget(widgets: FakeWidget[]) {
  return (window: BrowserPage["window"]) => {
    (window as unknown as { FCaptcha: unknown }).FCaptcha = {
      render(container: HTMLElement, options: FakeWidget["options"]) {
        const box = window.document.createElement("div");
        box.className = "fake-fcaptcha";
        box.setAttribute("role", "checkbox");
        box.setAttribute("aria-checked", "false");
        box.tabIndex = 0;
        box.addEventListener("keydown", (e) => {
          if (e.key === " ") options.callback(`tok-${widgets.length}`);
        });
        const branding = window.document.createElement("div");
        branding.className = "fcaptcha-branding";
        branding.textContent = "WebDecoy FCaptcha";
        container.append(box, branding);
        widgets.push({ options, container });
        return `w${widgets.length}`;
      },
      destroy() {},
      configure(options: { serverUrl?: string }) {
        configured.push(options);
      }
    };
  };
}

let page: BrowserPage | null = null;
afterEach(() => {
  page?.close();
  page = null;
});

const SCRIPTS = {
  login: ["app.js", "cardShell.js", "humanCheck.js", "loginCard.js"],
  create: ["app.js", "cardShell.js", "humanCheck.js", "createAccountCard.js"],
  invite: ["app.js", "cardShell.js", "humanCheck.js", "inviteCard.js"]
};

async function open(ctx: TestContext, file: string, url: string, scripts: string[], widgets: FakeWidget[], extra?: (w: BrowserPage["window"]) => void) {
  const p = await openPage(ctx, file, {
    url,
    scripts,
    beforeScripts: (window) => {
      installWidget(widgets)(window);
      extra?.(window);
    }
  });
  await p.settle();
  return p;
}

const title = (p: BrowserPage) => p.document.querySelector("h1")?.textContent;
const status = (p: BrowserPage) => p.document.querySelector(".human-check-status") as HTMLElement;
const linkRequests = (p: BrowserPage) => p.requests.filter((r) => r.url === "/api/auth/request-login-link");

async function requestLink(p: BrowserPage, email: string) {
  const input = p.document.getElementById("email") as HTMLInputElement;
  input.value = email;
  input.dispatchEvent(new p.window.Event("input", { bubbles: true }));
  p.document.getElementById("login-form")!.dispatchEvent(new p.window.Event("submit", { bubbles: true, cancelable: true }));
  await p.settle();
}

async function pass(p: BrowserPage, widget: FakeWidget, token: string) {
  widget.options.callback(token);
  await p.settle();
}

describe("native login with the check on", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await startTestContext(HUMAN_CHECK_ON, { humanCheckFetch: fcaptcha() });
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("draws the widget in the site's color scheme, and redraws it when the account's Dark arrives", async () => {
    const widgets: FakeWidget[] = [];
    page = await open(ctx, "login.html", "http://localhost/login", SCRIPTS.login, widgets);
    expect(widgets.at(-1)!.options.theme).toBe("light");
    page.document.documentElement.dataset.theme = "dark";
    await page.settle();
    expect(widgets.at(-1)!.options.theme).toBe("dark");
    expect(page.document.querySelectorAll(".human-check-widget .fake-fcaptcha")).toHaveLength(1);
  });

  it("opens /login on the check card only", async () => {
    const widgets: FakeWidget[] = [];
    page = await open(ctx, "login.html", "http://localhost/login", SCRIPTS.login, widgets);
    expect(title(page)).toBe("Vote protection");
    expect(widgets).toHaveLength(1);
    expect(widgets[0]!.options).toMatchObject({ siteKey: "site-key", action: "login", theme: "light", serverUrl: "/fcaptcha", strings: { label: "I am not a Bot or AI Agent" } });
    expect(configured.at(-1)).toEqual({ serverUrl: "/fcaptcha" });
    expect(page.document.querySelector(".fcaptcha-branding")).toBeNull();
    expect(page.document.querySelector(".human-check-widget")!.textContent).not.toContain("WebDecoy");
    const link = page.document.querySelector(".human-check-why a") as HTMLAnchorElement;
    expect(link.textContent).toBe("What this safeguard checks.");
    expect(page.document.querySelector(".human-check-why")!.textContent).toBe("What this safeguard checks.");
    expect(link.getAttribute("href")).toBe("/privacy#bot-check");
    expect(status(page).getAttribute("role")).toBe("status");
    expect(page.document.getElementById("login-form")).toBeNull();
    expect(page.document.querySelector(".oauth-button")).toBeNull();
  });

  it("draws the login card in place once passed, and sends the pass with one link request only", async () => {
    const widgets: FakeWidget[] = [];
    page = await open(ctx, "login.html", "http://localhost/login", SCRIPTS.login, widgets);
    await pass(page, widgets[0]!, "tok-login");
    expect(title(page)).toBe("Login");
    expect(page.document.getElementById("login-form")).not.toBeNull();
    expect(page.window.location.href).toBe("http://localhost/login");
    expect(page.navigations).toEqual([]);

    await requestLink(page, "first@example.com");
    const sent = linkRequests(page);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.headers["X-Human-Check"]).toBe("tok-login");
    const check = (page.window as unknown as { HumanCheck: { headers(): Record<string, string> } }).HumanCheck;
    expect(check.headers()).toEqual({});
  });

  it("shows the check again when the server refuses the pass, keeping what was typed", async () => {
    const widgets: FakeWidget[] = [];
    page = await open(ctx, "login.html", "http://localhost/login", SCRIPTS.login, widgets);
    await pass(page, widgets[0]!, "spent");
    (page.document.getElementById("stay") as HTMLInputElement).checked = true;
    await requestLink(page, "kept@example.com");
    expect(title(page)).toBe("Vote protection");
    expect(widgets).toHaveLength(2);

    await pass(page, widgets[1]!, "tok-again");
    expect(title(page)).toBe("Login");
    expect((page.document.getElementById("email") as HTMLInputElement).value).toBe("kept@example.com");
    expect((page.document.getElementById("stay") as HTMLInputElement).checked).toBe(true);
  });

  it("says plainly when the check fails, and redraws the widget on Try again", async () => {
    const widgets: FakeWidget[] = [];
    page = await open(ctx, "login.html", "http://localhost/login", SCRIPTS.login, widgets);
    const retry = page.document.querySelector(".human-check-retry") as HTMLButtonElement;
    expect(retry.hidden).toBe(true);

    widgets[0]!.options.errorCallback();
    await page.settle();
    expect(status(page).textContent).toBe("We couldn't confirm you're a person. Please try again.");
    expect(status(page).classList.contains("error")).toBe(true);
    expect(retry.hidden).toBe(false);

    await page.click(".human-check-retry");
    expect(widgets).toHaveLength(2);
    expect(retry.hidden).toBe(true);
    expect(status(page).textContent).toBe("");
  });

  it("counts an expired pass as no failure", async () => {
    const widgets: FakeWidget[] = [];
    page = await open(ctx, "login.html", "http://localhost/login", SCRIPTS.login, widgets);
    const options = widgets[0]!.options as FakeWidget["options"] & { expiredCallback(): void };
    options.errorCallback();
    options.expiredCallback();
    options.errorCallback();
    await page.settle();
    expect(status(page).textContent).not.toContain("support@crowdpoll.vote");
    expect(page.document.querySelector(".fake-fcaptcha")).not.toBeNull();
  });

  it("checks the create-account form for create-account", async () => {
    const widgets: FakeWidget[] = [];
    page = await open(ctx, "create-account.html", "http://localhost/create-account", SCRIPTS.create, widgets);
    expect(title(page)).toBe("Vote protection");
    expect(widgets[0]!.options.action).toBe("create-account");
    await pass(page, widgets[0]!, "tok-create");
    expect(page.document.getElementById("create-form")).not.toBeNull();
  });

  it("asks no check of a create-account link from an email", async () => {
    const widgets: FakeWidget[] = [];
    page = await open(ctx, "create-account.html", "http://localhost/create-account?token=tok1", SCRIPTS.create, widgets, (window) => {
      const real = window.fetch;
      window.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
        String(input).startsWith("/api/auth/create-account/link-info")
          ? Promise.resolve({
              ok: true,
              status: 200,
              headers: { get: () => null },
              json: async () => ({ email: "j•••@gmail.com", hasAccount: false, termsVersion: TERMS_VERSION })
            } as unknown as Response)
          : real(input, init)) as typeof window.fetch;
    });
    expect(widgets).toHaveLength(0);
    expect(title(page)).toBe("Create Account");
  });

  it("checks the invitation card for invite", async () => {
    const widgets: FakeWidget[] = [];
    page = await open(ctx, "invite.html", "http://localhost/invite?PID=3f6c2a9e-4b1d-4e8a-9c7f-1a2b3c4d5e6f&token=tok1", SCRIPTS.invite, widgets, (window) => {
      const real = window.fetch;
      window.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
        String(input).startsWith("/api/invitations/link-info")
          ? Promise.resolve({
              ok: true,
              status: 200,
              headers: { get: () => null },
              json: async () => ({
                email: "j•••@gmail.com",
                hasAccount: true,
                signedInAs: null,
                termsVersion: TERMS_VERSION,
                staySignedInDefault: false,
                providers: []
              })
            } as unknown as Response)
          : real(input, init)) as typeof window.fetch;
    });
    expect(title(page)).toBe("Vote protection");
    expect(widgets[0]!.options.action).toBe("invite");
    await pass(page, widgets[0]!, "tok-invite");
    expect(title(page)).toBe("You're invited to a poll");
  });

  it("puts the widget first after the header, works it from the keyboard, and reports each result", async () => {
    const widgets: FakeWidget[] = [];
    page = await open(ctx, "login.html", "http://localhost/login", SCRIPTS.login, widgets);
    const main = page.document.getElementById("card-root")!;
    const focusable = [...main.querySelectorAll<HTMLElement>("a[href], button, input, [tabindex]")].filter(
      (n) => n.tabIndex >= 0 && !n.hidden && !n.classList.contains("card-shell-close")
    );
    expect(focusable[0]!.classList.contains("fake-fcaptcha")).toBe(true);

    widgets[0]!.options.errorCallback();
    await page.settle();
    expect(status(page).textContent).toBe("We couldn't confirm you're a person. Please try again.");
    widgets[0]!.options.errorCallback();
    widgets[0]!.options.errorCallback();
    await page.settle();
    expect(status(page).textContent).toContain("write to support@crowdpoll.vote");

    const box = page.document.querySelector(".fake-fcaptcha") as HTMLElement;
    box.focus();
    box.dispatchEvent(new page.window.KeyboardEvent("keydown", { key: " ", bubbles: true }));
    await page.settle();
    expect(title(page)).toBe("Login");
  });
});

describe("the check off", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await startTestContext();
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("draws the login card at once and loads no widget", async () => {
    const widgets: FakeWidget[] = [];
    page = await open(ctx, "login.html", "http://localhost/login", SCRIPTS.login, widgets);
    expect(title(page)).toBe("Login");
    expect(widgets).toHaveLength(0);
    expect(page.document.querySelector('script[src*="fcaptcha"]')).toBeNull();
    await requestLink(page, "reader@example.com");
    expect(linkRequests(page)[0]!.headers["X-Human-Check"]).toBeUndefined();
  });
});

describe("provider login with the check on", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await startTestContext({ ...HUMAN_CHECK_ON, ...PROVIDERS }, { humanCheckFetch: fcaptcha() });
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("sends the pass with the provider start", async () => {
    const widgets: FakeWidget[] = [];
    page = await open(ctx, "login.html", "http://localhost/login", SCRIPTS.login, widgets);
    await pass(page, widgets[0]!, "tok-google");
    await page.click('.oauth-button[data-provider="google"]');
    const start = page.requests.find((r) => r.url === "/api/auth/sign-in/social");
    expect(start?.headers["X-Human-Check"]).toBe("tok-google");
  });
});

describe("when the widget cannot be loaded", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await startTestContext(HUMAN_CHECK_ON, { humanCheckFetch: fcaptcha() });
  });
  afterAll(async () => {
    await ctx.stop();
  });

  /** Shortens the page's long timers so ten seconds pass at once, and records what was asked for. */
  function quickTimers(asked: number[]) {
    return (window: BrowserPage["window"]) => {
      const real = window.setTimeout.bind(window);
      window.setTimeout = ((fn: () => void, ms?: number, ...rest: unknown[]) => {
        if (ms !== undefined && ms >= 10_000) {
          asked.push(ms);
          return real(fn, 5, ...rest);
        }
        return real(fn, ms, ...rest);
      }) as typeof window.setTimeout;
    };
  }

  const widgetScript = (p: BrowserPage) => p.document.querySelector('script[src="/fcaptcha/fcaptcha.js"]') as HTMLScriptElement | null;
  const unavailable = (p: BrowserPage) => p.document.querySelector(".human-check-unavailable")?.textContent;

  it("draws the login card without a pass after ten seconds, saying the check is unavailable", async () => {
    const asked: number[] = [];
    const warnings: string[] = [];
    page = await openPage(ctx, "login.html", {
      url: "http://localhost/login",
      scripts: SCRIPTS.login,
      beforeScripts: (window) => {
        quickTimers(asked)(window);
        window.console.warn = (...args: unknown[]) => void warnings.push(args.map(String).join(" "));
      }
    });
    await page.settle(50);
    expect(widgetScript(page)).not.toBeNull();
    expect(asked).toContain(10_000);
    expect(title(page)).toBe("Login");
    expect(unavailable(page)).toBe("The human check is unavailable right now.");
    expect(warnings).toEqual(["[human-check] The check could not be loaded (timeout)"]);
    expect(warnings.join(" ")).not.toMatch(/tok-|@/);

    await requestLink(page, "fallback@example.com");
    expect(linkRequests(page)[0]!.headers["X-Human-Check"]).toBeUndefined();
    // FCaptcha is up again, so the server asks for the check: the page tries it once more (here it times out
    // again) and keeps what was typed.
    expect(asked).toEqual([10_000, 10_000]);
    expect((page.document.getElementById("email") as HTMLInputElement).value).toBe("fallback@example.com");
  });

  it("falls back at once when the widget script fails to load", async () => {
    page = await openPage(ctx, "login.html", {
      url: "http://localhost/login",
      scripts: SCRIPTS.login,
      beforeScripts: (window) => {
        window.console.warn = () => undefined;
      }
    });
    await page.settle();
    expect(title(page)).toBe("Vote protection");
    widgetScript(page)!.dispatchEvent(new page.window.Event("error"));
    await page.settle();
    expect(title(page)).toBe("Login");
    expect(unavailable(page)).toBe("The human check is unavailable right now.");
  });
});
