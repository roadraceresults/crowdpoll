import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sheet = readFileSync(path.resolve("src/public/header-single-row-m3.css"), "utf8");
const WIDE_BLOCK = "@media not all and (max-width: 639.98px){";

const flat = (css: string) => css.replace(/\s+/g, " ");

function blockEnd(css: string, open: number): number {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return i + 1;
  }
  throw new Error("unbalanced braces");
}

const start = sheet.indexOf(WIDE_BLOCK);
const open = sheet.indexOf("{", start);
const end = blockEnd(sheet, open);
const inside = flat(sheet.slice(open + 1, end - 1));

describe("the single-row header sheet", () => {
  it("holds everything inside the one wide-range media block, so the phone header is as feature 030 left it", () => {
    expect(start).toBe(0);
    expect(sheet.slice(end).trim()).toBe("");
  });

  it("keeps the header on one row with a fixed minimum height", () => {
    expect(inside).toContain("--header-search-min-width:200px;");
    expect(inside).toContain("flex-wrap:nowrap;");
    expect(inside).toContain("min-height:56px;");
    expect(inside).toContain(".site-header > *{ flex-shrink:0; }");
  });

  it("lets only the search box shrink, down to its minimum, with a rule that outranks the children rule", () => {
    expect(inside).toContain(".site-header > .header-search{ flex:1 1 auto; min-width:var(--header-search-min-width); }");
  });

  it("stops the Create Poll link and the user area wrapping their text", () => {
    expect(inside).toContain(".header-nav-link, .header-user{ white-space:nowrap; }");
  });

  it("pushes the Create Poll nav against the user area once the search box has taken what it can", () => {
    expect(inside).toContain(".header-nav{ margin-left:auto; }");
  });

  it("gives the search box back its place on the row between 640 and 767 px", () => {
    expect(inside).toMatch(/@media \(max-width: 767\.98px\)\{ \.site-header > \.header-search\{[^}]*order:0;[^}]*flex:1 1 auto;[^}]*margin-top:0;/);
  });

  it("hides, step by step, the user name and the search box, and never the logo mark", () => {
    expect(inside).toContain('html[data-header-fit~="no-name"] #header-username{ display:none; }');
    expect(inside).toContain('html[data-header-fit~="no-search"] .header-search{ display:none; }');
    expect(inside).not.toContain("no-link");
    expect(inside).not.toContain("no-logo");
    expect(inside).not.toContain(".brand-logo{ display:none; }");
  });

  it("sizes the sign-in buttons, padding included, like a card's Vote button from 641 to 900 px", () => {
    expect(inside).toContain(
      "@media (max-width: 900px){ :is(.header-actions, .floating-actions) :is(.btn-header-ghost, .btn-header-primary){ height:32px; padding:0 16px; font-size:var(--md-sys-typescale-label-large-size); } }"
    );
  });

  it("never hides the word mark, the avatar button or the guest buttons", () => {
    const hiding = inside.split("}").filter((rule) => rule.includes("data-header-fit"));
    expect(hiding).toHaveLength(2);
    for (const rule of hiding) {
      expect(rule).not.toContain("brand-wordmark");
      expect(rule).not.toContain("avatar-btn");
      expect(rule).not.toContain("btn-header");
    }
  });

  it("carries no token section, dark twin, literal font size or comment", () => {
    expect(sheet).not.toContain("prefers-color-scheme");
    expect(sheet).not.toContain("data-theme");
    expect(sheet).not.toContain("/*");
    expect(sheet).not.toMatch(/font-size:\s*[0-9.]+(px|rem|em)/);
    expect(sheet).not.toMatch(/--md-sys-[a-z-]+:\s*[^;{]+;(?![^{]*\})/);
  });
});
