import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sheet = readFileSync(path.resolve("src/public/back-to-top-m3.css"), "utf8");
const flat = (css: string) => css.replace(/\s+/g, " ");

describe("the back-to-top sheet", () => {
  it("fixes the button near the bottom-right corner, above the cookie banner", () => {
    expect(sheet).toContain("position:fixed;");
    expect(sheet).toContain("right:20px;");
    expect(sheet).toContain("bottom:calc(20px + var(--cookie-banner-offset,0px));");
    expect(sheet).toContain("z-index:40;");
  });

  it("is hidden until backToTopFab.js adds the visible class", () => {
    expect(sheet).toContain("opacity:0;");
    expect(sheet).toContain("pointer-events:none;");
    expect(flat(sheet)).toContain(".back-to-top-fab.is-visible{ opacity:1; transform:translateY(0); pointer-events:auto; }");
  });

  it("transitions opacity and transform, removed under reduced motion", () => {
    expect(sheet).toMatch(/transition:[^;]*opacity[^;]*,[^;]*transform/);
    expect(flat(sheet)).toContain("@media (prefers-reduced-motion: reduce){ .back-to-top-fab{ transition:none; } }");
  });

  it("gives the button a visible focus outline", () => {
    expect(flat(sheet)).toContain(".back-to-top-fab:focus-visible{ outline:3px solid var(--md-sys-color-secondary); outline-offset:2px; }");
  });

  it("carries no token section, dark twin, literal font size or comment", () => {
    expect(sheet).not.toContain("prefers-color-scheme: dark");
    expect(sheet).not.toContain("data-theme");
    expect(sheet).not.toContain("/*");
    expect(sheet).not.toMatch(/font-size:\s*[0-9.]+(px|rem|em)/);
    expect(sheet).not.toMatch(/--md-sys-[a-z-]+:\s*[^;{]+;(?![^{]*\})/);
  });
});
