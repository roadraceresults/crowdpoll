import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
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

interface Stub {
  linkInfo: { status: number; body: unknown };
  redeem?: { status: number; body: unknown };
}

function stubApi(stub: Stub, redeemBodies: string[]) {
  return (window: BrowserPage["window"]) => {
    const real = window.fetch;
    const answer = (status: number, body: unknown) =>
      Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        headers: { get: () => null },
        json: async () => body,
        text: async () => JSON.stringify(body)
      } as unknown as Response);
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("/api/invitations/link-info")) return answer(stub.linkInfo.status, stub.linkInfo.body);
      if (url.startsWith("/api/invitations/redeem")) {
        redeemBodies.push(String(init?.body));
        const r = stub.redeem ?? { status: 200, body: { redirect: "/?PID=3f6c2a9e-4b1d-4e8a-9c7f-1a2b3c4d5e6f" } };
        return answer(r.status, r.body);
      }
      return real(input, init);
    }) as typeof window.fetch;
  };
}

const NEW_ADDRESS = {
  email: "j•••@gmail.com",
  hasAccount: false,
  signedInAs: null,
  termsVersion: TERMS_VERSION,
  staySignedInDefault: false,
  providers: [] as string[]
};

const INVITE_URL = "http://localhost/invite?PID=3f6c2a9e-4b1d-4e8a-9c7f-1a2b3c4d5e6f&token=tok1";

async function open(stub: Stub, redeemBodies: string[] = [], url = INVITE_URL): Promise<BrowserPage> {
  return openPage(ctx, "invite.html", {
    url,
    scripts: ["app.js", "cardShell.js", "inviteCard.js"],
    beforeScripts: stubApi(stub, redeemBodies)
  });
}

function continueButton(p: BrowserPage): HTMLButtonElement {
  return [...p.document.querySelectorAll("button")].find((b) => (b.textContent ?? "").startsWith("Continue")) as HTMLButtonElement;
}

const isDisabled = (button: HTMLButtonElement) => button.getAttribute("aria-disabled") === "true" || button.disabled;

function tickTerms(p: BrowserPage, checked = true): void {
  const box = p.document.getElementById("terms") as HTMLInputElement;
  box.checked = checked;
  box.dispatchEvent(new p.window.Event("change", { bubbles: true }));
}

describe("the invitation card for a new address (C1)", () => {
  it("shows the masked address, the unticked Terms box and Stay logged in, gating Continue", async () => {
    page = await open({ linkInfo: { status: 200, body: NEW_ADDRESS } });
    await page.settle();
    expect(page.document.body.textContent).toContain("Continue as j•••@gmail.com");
    const terms = page.document.getElementById("terms") as HTMLInputElement;
    expect(terms).not.toBeNull();
    expect(terms.checked).toBe(false);
    const stay = page.document.getElementById("stay") as HTMLInputElement;
    expect(stay).not.toBeNull();
    expect(stay.checked).toBe(false);
    const button = continueButton(page);
    expect(button.textContent).toBe("Continue");
    expect(isDisabled(button)).toBe(true);
    tickTerms(page);
    expect(isDisabled(button)).toBe(false);
    tickTerms(page, false);
    expect(isDisabled(button)).toBe(true);
  });

  it("starts Stay logged in from staySignedInDefault", async () => {
    page = await open({ linkInfo: { status: 200, body: { ...NEW_ADDRESS, staySignedInDefault: true } } });
    await page.settle();
    expect((page.document.getElementById("stay") as HTMLInputElement).checked).toBe(true);
  });

  it("Continue posts the agreement, the token and stay, then follows the redirect", async () => {
    const sent: string[] = [];
    page = await open({ linkInfo: { status: 200, body: NEW_ADDRESS }, redeem: { status: 200, body: { redirect: "/?PID=3f6c2a9e-4b1d-4e8a-9c7f-1a2b3c4d5e6f" } } }, sent);
    await page.settle();
    tickTerms(page);
    const stay = page.document.getElementById("stay") as HTMLInputElement;
    stay.checked = true;
    stay.dispatchEvent(new page.window.Event("change", { bubbles: true }));
    continueButton(page).click();
    await page.settle(100);
    expect(sent).toHaveLength(1);
    expect(JSON.parse(sent[0]!)).toEqual({
      pid: "3f6c2a9e-4b1d-4e8a-9c7f-1a2b3c4d5e6f",
      token: "tok1",
      stay: true,
      acceptedTerms: true,
      termsVersion: TERMS_VERSION
    });
    expect(page.navigations.length).toBe(1);
  });

  it("shows a refusal's error in the status area and stays", async () => {
    const sent: string[] = [];
    page = await open(
      { linkInfo: { status: 200, body: NEW_ADDRESS }, redeem: { status: 429, body: { error: "Too many requests." } } },
      sent
    );
    await page.settle();
    tickTerms(page);
    continueButton(page).click();
    await page.settle(100);
    const status = page.document.querySelector('[role="status"]');
    expect(status?.textContent).toContain("Too many requests.");
    expect(page.navigations.length).toBe(0);
  });

  it("shows no Terms box and enables Continue at once for an existing account", async () => {
    page = await open({ linkInfo: { status: 200, body: { ...NEW_ADDRESS, hasAccount: true } } });
    await page.settle();
    expect(page.document.getElementById("terms")).toBeNull();
    const button = continueButton(page);
    expect(button.textContent).toBe("Continue");
    expect(isDisabled(button)).toBe(false);
  });

  it("explains another logged-in account, posts signOut on switch, and Stay as leaves quietly", async () => {
    const sent: string[] = [];
    page = await open({ linkInfo: { status: 200, body: { ...NEW_ADDRESS, signedInAs: "o•••@example.com" } } }, sent);
    await page.settle();
    expect(page.document.body.textContent).toContain(
      "This invitation is for j•••@gmail.com. Log out and continue as that address to see the poll. " +
        "Or ask the poll creator to resend the invitation to your current address."
    );
    const buttons = [...page.document.querySelectorAll("button")].map((b) => b.textContent);
    expect(buttons).toContain("Log out and continue as j•••@gmail.com");
    expect(buttons).toContain("Stay as o•••@example.com");
    const switchButton = [...page.document.querySelectorAll("button")].find(
      (b) => b.textContent === "Log out and continue as j•••@gmail.com"
    ) as HTMLButtonElement;
    expect(isDisabled(switchButton)).toBe(true);
    tickTerms(page);
    expect(isDisabled(switchButton)).toBe(false);
    switchButton.click();
    await page.settle(100);
    expect(sent).toHaveLength(1);
    expect(JSON.parse(sent[0]!)).toMatchObject({ signOut: true, acceptedTerms: true });
    expect(page.navigations.length).toBe(1);
  });

  it("Stay as goes home without a request", async () => {
    const sent: string[] = [];
    page = await open({ linkInfo: { status: 200, body: { ...NEW_ADDRESS, hasAccount: true, signedInAs: "o•••@example.com" } } }, sent);
    await page.settle();
    expect(page.document.getElementById("terms")).toBeNull();
    const stayAs = [...page.document.querySelectorAll("button")].find((b) => b.textContent === "Stay as o•••@example.com") as HTMLButtonElement;
    stayAs.click();
    await page.settle(100);
    expect(sent).toHaveLength(0);
    expect(page.navigations.length).toBe(1);
  });

  it("offers the provider buttons as on the Login page when login is both", async () => {
    page = await open({ linkInfo: { status: 200, body: { ...NEW_ADDRESS, providers: ["google", "apple"] } } });
    await page.settle();
    const buttons = [...page.document.querySelectorAll(".oauth-button")] as HTMLButtonElement[];
    expect(buttons.map((b) => b.dataset.provider)).toEqual(["google", "apple"]);
    expect(buttons.map((b) => b.textContent)).toEqual(["Sign in with Google", "Sign in with Apple"]);
    expect(buttons[0]!.querySelector("img.oauth-logo")).not.toBeNull();
  });

  it("says what is shared under the provider buttons (C2)", async () => {
    page = await open({ linkInfo: { status: 200, body: { ...NEW_ADDRESS, providers: ["google", "amazon"] } } });
    await page.settle();
    const line = page.document.querySelector(".oauth-sharing")!;
    expect(line.textContent).toBe("Google shares your name, email address and profile picture. Amazon shares your name and email address. Privacy Policy");
    expect(line.querySelector("a")!.getAttribute("href")).toBe("/privacy");
    const buttons = page.document.querySelector(".oauth-providers")!;
    expect(buttons.compareDocumentPosition(line) & page.window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("says nothing about what is shared when the page lists no provider", async () => {
    page = await open({ linkInfo: { status: 200, body: NEW_ADDRESS } });
    await page.settle();
    expect(continueButton(page)).toBeTruthy();
    expect(page.document.querySelector(".oauth-sharing")).toBeNull();
  });

  async function startedWith(provider: string, url?: string): Promise<unknown> {
    page = await open({ linkInfo: { status: 200, body: { ...NEW_ADDRESS, providers: [provider] } } }, [], url);
    await page.settle();
    page.document.querySelector<HTMLButtonElement>(".oauth-button")!.click();
    await page.settle(100);
    return page.requests.find((r) => r.url.startsWith("/api/auth/sign-in/"))!.body;
  }

  it("marks a provider login, so the first page says which account is in use (A3)", async () => {
    const pid = "3f6c2a9e-4b1d-4e8a-9c7f-1a2b3c4d5e6f";
    expect(await startedWith("google")).toEqual({ provider: "google", callbackURL: `/?PID=${pid}&signedIn=1` });
    page!.close();
    expect(await startedWith("amazon")).toEqual({ providerId: "amazon", callbackURL: `/?PID=${pid}&signedIn=1` });
    page!.close();
    expect(await startedWith("google", "http://localhost/invite?token=tok1")).toEqual({ provider: "google", callbackURL: "/?signedIn=1" });
  });

  it("carries Stay logged in through a provider login (C11)", async () => {
    page = await open({ linkInfo: { status: 200, body: { ...NEW_ADDRESS, staySignedInDefault: true, providers: ["google"] } } }, [], "http://localhost/invite?token=tok1");
    await page.settle();
    page.document.querySelector<HTMLButtonElement>(".oauth-button")!.click();
    await page.settle(100);
    expect(page.requests.find((r) => r.url.startsWith("/api/auth/sign-in/"))!.body).toEqual({
      provider: "google",
      callbackURL: "/?signedIn=1",
      additionalData: { staySignedIn: true }
    });
  });

  it("follows the redirect of a link that cannot log in", async () => {
    page = await open({ linkInfo: { status: 404, body: { error: "invalid-invitation", redirect: "/?PID=3f6c2a9e-4b1d-4e8a-9c7f-1a2b3c4d5e6f" } } });
    await page.settle();
    expect(page.navigations.length).toBe(1);
  });
});
