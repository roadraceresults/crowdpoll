/** TWEAK04 — the Create Account card opened from the one-time link in the create-account email. */
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
  create?: { status: number; body: unknown };
}

function stubApi(stub: Stub, createBodies: string[]) {
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
      if (url.startsWith("/api/auth/create-account/link-info")) return answer(stub.linkInfo.status, stub.linkInfo.body);
      if (url.startsWith("/api/auth/create-account")) {
        createBodies.push(String(init?.body));
        const r = stub.create ?? { status: 200, body: { redirect: "/" } };
        return answer(r.status, r.body);
      }
      return real(input, init);
    }) as typeof window.fetch;
  };
}

const NEW_ADDRESS = { email: "j•••@gmail.com", hasAccount: false, termsVersion: TERMS_VERSION };

function open(stub: Stub, createBodies: string[] = []): Promise<BrowserPage> {
  return openPage(ctx, "create-account.html", {
    url: "http://localhost/create-account?token=tok1",
    scripts: ["app.js", "cardShell.js", "createAccountCard.js"],
    beforeScripts: stubApi(stub, createBodies)
  });
}

const actionButton = (p: BrowserPage) => p.document.querySelector(".card-shell-action button") as HTMLButtonElement;

function tickTerms(p: BrowserPage): void {
  const box = p.document.getElementById("terms") as HTMLInputElement;
  box.checked = true;
  box.dispatchEvent(new p.window.Event("change", { bubbles: true }));
}

describe("the Create Account card opened from the emailed link", () => {
  it("shows the masked address and no address field, and gates the button on the Terms", async () => {
    page = await open({ linkInfo: { status: 200, body: NEW_ADDRESS } });
    await page.settle();
    expect(page.document.body.textContent).toContain("Create your account as j•••@gmail.com.");
    expect(page.document.getElementById("email")).toBeNull();
    const button = actionButton(page);
    expect(button.textContent).toBe("Create Account");
    expect(button.disabled).toBe(true);
    tickTerms(page);
    expect(button.disabled).toBe(false);
  });

  it("posts the token and the Terms, never an address", async () => {
    const bodies: string[] = [];
    page = await open({ linkInfo: { status: 200, body: NEW_ADDRESS } }, bodies);
    await page.settle();
    tickTerms(page);
    actionButton(page).click();
    await page.settle();
    expect(bodies.map((b) => JSON.parse(b))).toEqual([{ token: "tok1", acceptedTerms: true, termsVersion: TERMS_VERSION }]);
  });

  it("offers Sign In without the Terms box when the address already has an account", async () => {
    page = await open({ linkInfo: { status: 200, body: { ...NEW_ADDRESS, hasAccount: true } } });
    await page.settle();
    expect(page.document.body.textContent).toContain("Sign in as j•••@gmail.com.");
    expect(page.document.getElementById("terms")).toBeNull();
    expect(actionButton(page).textContent).toBe("Sign In");
    expect(actionButton(page).disabled).toBe(false);
  });

  it("falls back to the address form, saying why, when the link cannot be used", async () => {
    page = await open({ linkInfo: { status: 404, body: { code: "invalid-link" } } });
    await page.settle();
    expect(page.document.getElementById("email")).not.toBeNull();
    expect(page.document.body.textContent).toContain("That link has expired or has been used.");
  });

  it("falls back to the address form when the link is used up before the press", async () => {
    page = await open({ linkInfo: { status: 200, body: NEW_ADDRESS }, create: { status: 400, body: { code: "invalid-link", error: "x" } } });
    await page.settle();
    tickTerms(page);
    actionButton(page).click();
    await page.settle();
    expect(page.document.getElementById("email")).not.toBeNull();
    expect(page.document.body.textContent).toContain("That link has expired or has been used.");
  });

  it("shows a refusal in the status line", async () => {
    page = await open({ linkInfo: { status: 200, body: NEW_ADDRESS }, create: { status: 403, body: { code: "not-launched", error: "Not yet." } } });
    await page.settle();
    tickTerms(page);
    actionButton(page).click();
    await page.settle();
    expect(page.document.querySelector(".card-shell-status")?.textContent).toBe("Not yet.");
  });
});
