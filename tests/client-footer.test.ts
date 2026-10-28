import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
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

const PAGES: [string, string[]][] = [
  ["index.html", ["app.js"]],
  ["login.html", ["app.js", "cardShell.js", "loginCard.js"]],
  ["profile.html", ["app.js", "cardShell.js", "profileCard.js"]],
  ["privacy.html", ["app.js"]]
];

describe("the site footer (C1)", () => {
  for (const [file, scripts] of PAGES) {
    it(`appears once on ${file} with the legal links and both addresses`, async () => {
      page = await openPage(ctx, file, { scripts });
      const footers = page.document.querySelectorAll("footer.site-footer");
      expect(footers).toHaveLength(1);
      const hrefs = [...footers[0]!.querySelectorAll("a")].map((a) => a.getAttribute("href"));
      expect(hrefs).toEqual(
        expect.arrayContaining(["/privacy", "/terms", "/privacy#cookies", "mailto:privacy@crowdpoll.vote", "mailto:support@crowdpoll.vote"])
      );
      expect(footers[0]!.textContent).toContain(`© ${new Date().getFullYear()} CrowdPoll`);
    });
  }
});

describe("the footer's look (C1, TWEAKS07)", () => {
  it("is a primary-coloured band as wide as the header's column", () => {
    const css = readFileSync(path.resolve("src/public/footer-m3.css"), "utf8").replace(/\s+/g, " ");
    expect(css).toContain("background:var(--md-sys-color-primary);");
    expect(css).toContain("color:var(--md-sys-color-on-primary);");
    expect(css).toContain("width:min(calc(100% - 40px), calc(var(--max-width, 1280px) - 40px));");
    expect(css).toContain("margin:0 auto calc(16px + var(--cookie-banner-offset, 0px));");
    expect(css).toContain("@media (max-width: 639.98px){ .site-footer{ width:calc(100% - 28px); } }");
  });
});

describe("the cookie banner (C2)", () => {
  it("links to Cookie Use", async () => {
    page = await openPage(ctx, "index.html", { scripts: ["app.js"] });
    const link = page.document.querySelector("#cookie-banner a");
    expect(link?.getAttribute("href")).toBe("/privacy#cookies");
    expect(link?.textContent).toBe("Cookie Use");
  });
});
