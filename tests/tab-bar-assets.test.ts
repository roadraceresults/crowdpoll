/**
 * The tab bar's shipped markup and rules: six inline icons, the glyphs three of
 * them copy from elsewhere on the page, and the full-width rule under the row.
 * jsdom does not lay out or paint, so the geometry is verified manually via
 * quickstart.md; what can be guarded here is that the served text says what
 * the layout depends on.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { startTestContext, type TestContext } from "./helpers/setup.js";

let ctx: TestContext;
let index = "";
let tabsCss = "";
let pollCardJs = "";
let appJs = "";
let avatarSvg = "";
let pollCardCss = "";
let headerM3Css = "";

const TAB_ORDER = ["your-polls", "shared-with-you", "your-votes", "trending", "newest", "watching", "live", "search"];

function tabButton(name: string): string {
  const match = index.match(new RegExp(`<button class="tab[^"]*" type="button" data-tab="${name}"[^>]*>[\\s\\S]*?</button>`));
  expect(match, `button for ${name}`).not.toBeNull();
  return match![0];
}

beforeAll(async () => {
  ctx = await startTestContext();
  const get = async (p: string) => {
    const res = await request(ctx.app).get(p).buffer(true).parse((r, done) => {
      const chunks: Buffer[] = [];
      r.on("data", (c: Buffer) => chunks.push(c));
      r.on("end", () => done(null, Buffer.concat(chunks).toString("utf8")));
    });
    expect(res.status).toBe(200);
    return res.body as string;
  };
  index = await get("/");
  tabsCss = await get("/tabs.css");
  pollCardJs = await get("/pollCard.js");
  appJs = await get("/app.js");
  avatarSvg = await get("/avatar-default.svg");
  pollCardCss = await get("/pollCard.css");
  headerM3Css = await get("/header-tab-bar-m3.css");
});

afterAll(async () => {
  await ctx.stop();
});

describe("the tab bar's icons", () => {
  it("every tab's first child is a decorative icon in the 16px box", () => {
    for (const name of TAB_ORDER) {
      const button = tabButton(name);
      const firstChild = button.match(/<button[^>]*>\s*(<(svg|span) [^>]*>)/)![1]!;
      expect(firstChild, name).toContain('class="tab-icon');
      expect(firstChild, name).toContain('aria-hidden="true"');
      if (firstChild.startsWith("<svg")) expect(firstChild, name).toContain('focusable="false"');
    }
    expect(index.match(/<button class="tab[^"]*" type="button" data-tab=[^>]*>\s*<(svg|span) class="tab-icon/g)!.length).toBe(8);
    expect(tabsCss).toMatch(/\.tab-icon\s*\{[^}]*width:\s*16px[^}]*height:\s*16px/);
    expect(tabsCss).toMatch(/\.tab-bar \.tab\s*\{[^}]*display:\s*inline-flex[^}]*gap:\s*6px/);
  });

  it("the Watching icon is the eye symbol, drawn once in the current colour, an outline and a filled twin", () => {
    expect(tabButton("watching")).toContain('<use href="#watching-eye"/>');
    expect(index).toMatch(/<symbol id="watching-eye"[^>]*>[\s\S]*?stroke="currentColor"[\s\S]*?<\/symbol>/);
    expect(index).toMatch(/<symbol id="watching-eye-on"[^>]*>[\s\S]*?stroke="currentColor"[\s\S]*?<\/symbol>/);
    expect(index.match(/<symbol id="watching-eye[^>]*>[\s\S]*?<\/symbol>/g)!.join("")).not.toMatch(/#9AA197|#1E2422/i);
    expect(index.match(/id="watching-catchlight"/g)!.length).toBe(1);
  });

  it("the Search glass is the header's, taking the label's colour", () => {
    const button = tabButton("search");
    for (const part of ['<circle cx="11" cy="11" r="7"></circle>', '<line x1="21" y1="21" x2="16.65" y2="16.65"></line>']) {
      expect(button).toContain(part);
      expect(appJs).toContain(part);
    }
    expect(button).toContain('stroke="currentColor"');
  });

  it("the Your Polls icon is the default avatar's shapes, and the avatar file says so", () => {
    const button = tabButton("your-polls");
    expect(button).toContain('viewBox="0 0 64 64"');
    for (const shape of avatarSvg.match(/<(circle|path) [^>]*\/>/g)!) expect(button).toContain(shape);
    expect(button).not.toContain("<img");
    expect(avatarSvg).toContain("index.html");
  });

  it("the Live Results icon is the card's live-bars markup, with no bars rule of its own", () => {
    expect(tabButton("live")).toContain('<span class="live-bars"><i></i><i></i><i></i></span>');
    expect(tabsCss).not.toMatch(/live-bar/);
    expect(tabsCss).toMatch(/\.tab-icon--live\s*\{[^}]*align-items:\s*flex-end/);
  });

  it("the bars are still for a guest: the page starts as a guest and the card stylesheet stops them", () => {
    expect(index).toMatch(/<body class="is-guest">/);
    expect(pollCardCss).toMatch(/\.is-guest \.live-bars i\s*\{[^}]*animation:\s*none/);
  });

  it("Trending takes the label's colour; Newest wears the avatar's two colours and has no text element", () => {
    expect(tabButton("trending")).toContain('fill="currentColor"');
    const newest = tabButton("newest");
    expect(newest).toMatch(/<circle cx="12" cy="12" r="12" fill="#8093a7"/);
    expect(newest).toMatch(/<path [^>]*fill="#e8edf2"/);
    expect(newest).not.toContain("<text");
  });

  it("More wears the Newest icon's circle, with three dots in the avatar's light colour", () => {
    const more = index.match(/<button class="tab-more" id="tabMoreBtn"[^>]*>[\s\S]*?<\/button>/);
    expect(more, "More button").not.toBeNull();
    expect(more![0]).toMatch(/<circle cx="12" cy="12" r="12" fill="#8093a7"\/>/);
    expect(more![0].match(/<circle cx="12" cy="(7|12|17)" r="1\.8" fill="#e8edf2"\/>/g)).toHaveLength(3);
  });
});

describe("the rule under the tab bar", () => {
  it("is a viewport-wide pseudo-element on the non-scrolling wrap, with the scrollbar guard on the page", () => {
    expect(tabsCss).toMatch(/\.tab-bar-wrap\s*\{[^}]*position:\s*relative/);
    expect(tabsCss).toMatch(/\.tab-bar-wrap::after\s*\{[^}]*width:\s*100vw[^}]*height:\s*2px[^}]*background:\s*var\(--line\)/);
    expect(tabsCss).toMatch(/\.tab-bar-wrap::after\s*\{[^}]*bottom:\s*-7px/);
    expect(tabsCss).toMatch(/\.tab-bar-wrap\s*\{[^}]*align-items:\s*flex-end/);
    expect(tabsCss).not.toMatch(/\.tab-bar\s*\{[^}]*padding-bottom/);
    expect(tabsCss).toMatch(/\.page\s*\{[^}]*overflow-x:\s*clip/);
    expect(tabsCss).not.toMatch(/\.tab-bar::after/);
  });
});

describe("the Material 3 tab bar", () => {
  it("draws every tab icon in the label's colour, the Live Results bars included", () => {
    expect(headerM3Css).toMatch(/\.tab-icon \[fill="#8093a7" i\]\{ fill:currentColor; \}/);
    expect(headerM3Css).toMatch(/\.tab-icon \[fill="#e8edf2" i\]\{ fill:var\(--paper\); \}/);
    expect(headerM3Css).toMatch(/\.tab-icon \[stroke="#9AA197" i\]\{ stroke:currentColor; \}/);
    expect(headerM3Css).toMatch(/\.tab \.live-bars i:nth-child\(n\)\{ background:currentColor; \}/);
  });

  it("is linked after the production sheets, with the empty-tab line's layer", () => {
    const after = index.slice(index.indexOf('href="/site.css"'));
    expect(after).toContain('href="/header-tab-bar-m3.css"');
    expect(after).toContain('href="/empty-tab-line-m3.css"');
  });

  it("applies the phone layout: no stray comment end swallows the 640px rule", () => {
    expect(tabsCss.split("*/").length).toBe(tabsCss.split("/*").length);
    const uncommented = tabsCss.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(uncommented).toMatch(/@media \(max-width:639\.98px\)\{\s*\.container\{ padding:20px 14px 40px; \}\s*\.card-grid\{ grid-template-columns:1fr; \}/);
  });

  it("styles the notice and the empty-tab line separately, and centres the line on every tab", () => {
    expect(tabsCss).not.toMatch(/\.tab-notice,\s*\.tab-empty\s*\{/);
    expect(tabsCss).not.toContain('[data-panel="search"] .tab-empty');
    expect(tabsCss).toMatch(/\.tab-notice\{/);
    expect(tabsCss).toMatch(/\.tab-empty\{/);
  });
});
