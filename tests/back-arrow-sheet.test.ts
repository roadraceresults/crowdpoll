import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sheet = readFileSync(path.resolve("src/public/back-arrow-m3.css"), "utf8");
const flat = (css: string) => css.replace(/\s+/g, " ");
const rule = (selector: string) => {
  const match = new RegExp("(^|\n)" + selector.replace(/[.:()]/g, "\$&") + "\{([^}]*)\}").exec(sheet);
  expect(match, selector).not.toBeNull();
  return flat(match![2]);
};

describe("the back-arrow sheet", () => {
  it("fixes the bar under the header, in the header's column", () => {
    const bar = rule(".back-arrow-bar");
    for (const decl of [
      "position:fixed;",
      "left:0;",
      "right:0;",
      "top:calc(var(--fixed-chrome-height,0px) + 12px);",
      "max-width:var(--max-width);",
      "margin:0 auto;",
      "padding-inline:20px;",
      "z-index:40;",
      "pointer-events:none;"
    ]) expect(bar).toContain(decl);
    expect(flat(sheet)).toContain("@media (max-width: 639.98px){ .back-arrow-bar{ padding-inline:14px; } }");
  });

  it("draws the arrow as a 40px filled tonal icon button that takes clicks through the bar", () => {
    const button = rule(".back-arrow");
    for (const decl of [
      "width:40px;",
      "height:40px;",
      "border-radius:var(--md-sys-shape-corner-full);",
      "background:var(--md-sys-color-secondary-container);",
      "color:var(--md-sys-color-on-secondary-container);",
      "pointer-events:auto;"
    ]) expect(button).toContain(decl);
    expect(rule(".back-arrow svg")).toContain("width:26px; height:26px;");
  });

  it("gives the arrow M3 state layers and a visible focus outline", () => {
    expect(rule(".back-arrow:hover::before")).toContain("opacity:var(--md-sys-state-hover-state-layer-opacity);");
    expect(rule(".back-arrow:focus-visible::before")).toContain("opacity:var(--md-sys-state-focus-state-layer-opacity);");
    expect(rule(".back-arrow:active::before")).toContain("opacity:var(--md-sys-state-pressed-state-layer-opacity);");
    expect(flat(sheet)).toContain(".back-arrow:focus-visible{ outline:3px solid var(--md-sys-color-secondary); outline-offset:2px; }");
  });

  it("carries no token section, dark twin, literal font size or comment", () => {
    expect(sheet).not.toContain("prefers-color-scheme: dark");
    expect(sheet).not.toContain("data-theme");
    expect(sheet).not.toContain("/*");
    expect(sheet).not.toMatch(/font-size:\s*[0-9.]+(px|rem|em)/);
    expect(sheet).not.toMatch(/--md-sys-[a-z-]+:\s*[^;{]+;(?![^{]*\})/);
  });
});
