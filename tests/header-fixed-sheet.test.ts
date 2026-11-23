import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sheet = readFileSync(path.resolve("src/public/header-fixed-m3.css"), "utf8");
const flat = (css: string) => css.replace(/\s+/g, " ");

describe("the header-fixed sheet", () => {
  it("pins the header and the Tab Bar to the top of the viewport, the header above the Tab Bar so its avatar menu is never covered", () => {
    expect(flat(sheet)).toContain("#site-header, .tab-bar-wrap{ position:fixed; left:0; right:0; z-index:40;");
    expect(flat(sheet)).toContain("#site-header{ top:0; z-index:41; }");
    expect(flat(sheet)).toContain(".tab-bar-wrap{ top:var(--fixed-chrome-height-header,0px); }");
  });

  it("keeps the header's and the Tab Bar's confined column matching .container's own", () => {
    expect(sheet).toContain("max-width:var(--max-width);");
    expect(sheet).toContain("margin:0 auto;");
    expect(sheet).toContain("padding-inline:20px;");
  });

  it("gives the header and the Tab Bar each an opaque background of its own, --paper unless retuned", () => {
    expect(sheet).toContain("#site-header{ top:0; z-index:41; background:var(--header-background);");
    expect(sheet).toContain(".tab-bar-wrap{ top:var(--fixed-chrome-height-header,0px); background:var(--tab-bar-background);");
  });

  it("paints that background out to both edges of a window wider than the column, without clipping what hangs below", () => {
    expect(sheet).toContain("border-image:linear-gradient(var(--header-background) 0 0) fill 0 / 0 / 0 100vw;");
    expect(sheet).toContain("border-image:linear-gradient(var(--tab-bar-background) 0 0) fill 0 / 0 / 0 100vw;");
    expect(sheet).not.toContain("clip-path");
  });

  it("draws the Tab Bar's full-width line under the header on pages without a Tab Bar, so Home keeps one line", () => {
    expect(sheet).toContain("body:not(.has-tab-bar) #site-header::after{ content:''; position:absolute; left:50%; bottom:0; width:100vw; height:1px; background:var(--header-divider); transform:translateX(-50%); }");
    expect(readFileSync(path.resolve("src/public/index.html"), "utf8")).toContain('<body class="is-guest has-tab-bar">');
  });

  it("reserves space for the fixed chrome in .container's top padding, at both breakpoints", () => {
    expect(sheet).toContain(".container{ padding-top:calc(32px + var(--fixed-chrome-height,0px)); }");
    expect(flat(sheet)).toContain("@media (max-width: 640px){ .container{ padding-top:calc(20px + var(--fixed-chrome-height,0px)); } }");
  });

  it("pins a background behind the Hamburger and Refresh row from 900 px down, so cards scroll under it", () => {
    expect(flat(sheet)).toContain("@media (max-width: 900px){ .tab-bar-wrap::before{ content:''; position:absolute; left:0; right:0; top:100%; height:calc(40px + var(--refresh-gap)); background:var(--tab-bar-background); } }");
  });

  it("carries no token section, dark twin, literal font size or comment", () => {
    expect(sheet).not.toContain("prefers-color-scheme");
    expect(sheet).not.toContain("data-theme");
    expect(sheet).not.toContain("/*");
    expect(sheet).not.toMatch(/font-size:\s*[0-9.]+(px|rem|em)/);
    expect(sheet).not.toMatch(/--md-sys-[a-z-]+:\s*[^;{]+;(?![^{]*\})/);
  });
});
