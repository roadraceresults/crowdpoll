import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(path.resolve("src/public", name), "utf8");

function blockEnd(css: string, open: number): number {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return i + 1;
  }
  throw new Error("unbalanced braces");
}

/** The text of the first `@media` block that starts with the given condition. */
function mediaBlock(css: string, condition: string): string {
  const at = css.indexOf(`@media ${condition}`);
  expect(at, condition).toBeGreaterThanOrEqual(0);
  return css.slice(css.indexOf("{", at), blockEnd(css, css.indexOf("{", at)));
}

const compact = (text: string) => text.replace(/\s+/g, " ");

/** Whether the phone layout's sheet puts the selector's items in one column. */
function phoneStacks(selector: string): boolean {
  const rules = [...read("phone-admin-m3.css").matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  return rules.some(([, selectors, body]) => selectors!.includes(selector) && /grid-template-columns:\s*minmax\(0, ?1fr\)\s*(;|$)/.test(body!.trim()));
}

describe("the search panel shares the poll cards' geometry", () => {
  const css = read("admin.css");

  it("has one rule for both selectors carrying the card's width, border, corners, shadow and padding", () => {
    const rule = css.match(/\.poll-admin-card,\s*\.admin-search\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    const body = compact(rule![1]!);
    for (const declaration of [
      "border: 1px solid var(--line)",
      "border-radius: 20px",
      "box-shadow: var(--shadow)",
      "padding: 16px 18px",
      "width: 100%",
      "max-width: 420px",
      "margin: 0 auto"
    ]) {
      expect(body, declaration).toContain(declaration);
    }
  });

  it("leaves the narrow-screen padding to the phone layer", () => {
    expect(css).not.toContain("@media (max-width: 640px)");
  });

  it("keeps the panel hidden outside the Search view", () => {
    expect(css).toContain(".admin-search[hidden]{ display:none; }");
  });
});

describe("the search panel's Material 3 layer", () => {
  const css = read("admin-search-m3.css");
  const rule = (selector: string) => {
    const at = css.indexOf(selector);
    expect(at, selector).toBeGreaterThanOrEqual(0);
    return compact(css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at))).replace(/:\s+/g, ":");
  };

  it("draws 56px outlined fields", () => {
    expect(rule(".admin-search .m3-outlined :is(input, select){")).toContain("height:56px");
    expect(rule(".admin-search .m3-outlined :is(input, select){")).toContain("border:1px solid var(--md-sys-color-outline)");
  });

  it("makes both buttons at least 48px tall, and the search button filled and the clear button a text button", () => {
    const shared = rule(".admin-search .admin-search-btn,");
    expect(shared).toContain("min-height:48px");
    expect(rule(".admin-search .admin-search-btn{")).toContain("background:var(--md-sys-color-primary)");
    expect(rule(".admin-search .admin-search-clear{\n  padding:0 12px;")).toContain("background:transparent");
  });

  it("sets values in body-large and labels in body-small from the type tokens", () => {
    expect(rule(".admin-search .m3-outlined :is(input, select){")).toContain("font-size:var(--md-sys-typescale-body-large-size)");
    expect(css).toMatch(/\) ~ label\{[^}]*font-size:var\(--md-sys-typescale-body-small-size\)/);
  });

  it("lets nothing overflow the panel: fields, controls and pairs may shrink", () => {
    for (const selector of [".admin-search .m3-outlined{", ".admin-search .m3-outlined :is(input, select){", ".admin-search .admin-field-pair{"]) {
      const body = rule(selector);
      expect(body, selector).toContain("min-width:0");
      expect(body, selector).toContain("max-width:100%");
      expect(body, selector).toContain("box-sizing:border-box");
    }
  });

  it("puts an operator and its value in equal columns, so the longer labels fit", () => {
    expect(rule(".admin-search .admin-field-pair{")).toContain("grid-template-columns:minmax(0, 1fr) minmax(0, 1fr)");
  });

  it("keeps an operator beside its value in the phone layout too", () => {
    expect(phoneStacks(".admin-field-pair")).toBe(false);
  });

  it("declares no literal font size and no dark-scheme block", () => {
    const sizes = [...css.matchAll(/font-size:\s*([^;}]+)/g)].map((m) => m[1]!.trim());
    for (const size of sizes) expect(size).toMatch(/^var\(--md-sys-typescale-/);
    expect(css).not.toContain("prefers-color-scheme");
  });
});

describe("the radio groups", () => {
  const css = read("admin-search-m3.css");
  const rule = (selector: string) => {
    const at = css.indexOf(selector);
    expect(at, selector).toBeGreaterThanOrEqual(0);
    return compact(css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at))).replace(/:\s+/g, ":");
  };

  it("lays each group out as three options in a row, in the phone layout too", () => {
    expect(rule(".admin-search .admin-radio-group{")).toContain("grid-template-columns:repeat(3, minmax(0, 1fr))");
    expect(phoneStacks(".admin-radio-group")).toBe(false);
  });

  it("makes every option at least 48px tall and may shrink inside the panel", () => {
    const option = rule(".admin-search .admin-radio{");
    expect(option).toContain("min-height:48px");
    expect(option).toContain("min-width:0");
  });

  it("draws a 20px ring that turns primary with a primary dot when chosen", () => {
    const ring = rule(".admin-search .admin-radio input{");
    expect(ring).toContain("width:20px");
    expect(ring).toContain("height:20px");
    expect(ring).toContain("border:2px solid var(--md-sys-color-on-surface-variant)");
    expect(rule(".admin-search .admin-radio input:checked{")).toContain("border-color:var(--md-sys-color-primary)");
    expect(rule(".admin-search .admin-radio input:checked::before{")).toContain("transform:scale(1)");
  });

  it("uses no motion when the visitor asks for reduced motion", () => {
    const reduced = compact(mediaBlock(css, "(prefers-reduced-motion: reduce)")).replace(/:\s+/g, ":");
    expect(reduced).toContain(".admin-search .admin-radio input::before");
    expect(reduced).toContain("transition:none");
  });
});

describe("the status line's style", () => {
  const m3 = read("admin-search-m3.css");
  const rule = (css: string, selector: string) => {
    const at = css.indexOf(selector);
    expect(at, selector).toBeGreaterThanOrEqual(0);
    return compact(css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at))).replace(/:\s+/g, ":");
  };

  it("is Material 3 supporting text: body-small type in the secondary text colour, never boxed", () => {
    const body = rule(m3, ".admin-search-notice{");
    expect(body).toContain("font-size:var(--md-sys-typescale-body-small-size)");
    expect(body).toContain("color:var(--md-sys-color-on-surface-variant)");
    expect(body).not.toMatch(/border|background/);
  });

  it("stays centred in the cards' 420px column", () => {
    const body = rule(read("admin.css"), ".admin-search-notice{");
    expect(body).toContain("width:min(420px,100%)");
    expect(body).toContain("margin:0 auto 14px");
    expect(body).toContain("text-align:center");
    expect(body).not.toContain("font-size");
  });
});

describe("the collapse toggle's style", () => {
  const css = read("admin-search-m3.css");
  const rule = (selector: string) => {
    const at = css.indexOf(selector);
    expect(at, selector).toBeGreaterThanOrEqual(0);
    return compact(css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at))).replace(/:\s+/g, ":");
  };

  it("hides the collapsed panel", () => {
    expect(rule(".admin-search[data-collapsed]{")).toContain("display:none");
  });

  it("is a 48px text button in the cards' column, outside the panel", () => {
    expect(rule(".admin-search-toggle{")).toContain("min-height:48px");
    expect(rule(".admin-search-toggle{")).toContain("background:transparent");
    expect(rule(".admin-search-toggle-row{")).toContain("width:min(420px, 100%)");
    expect(rule(".admin-search-toggle-row[hidden]{")).toContain("display:none");
  });

  it("turns the chevron over while collapsed", () => {
    expect(rule('.admin-search-toggle[aria-expanded="false"] svg{')).toContain("transform:rotate(180deg)");
  });
});

describe("the result rows' style", () => {
  const css = read("admin-search-m3.css");
  const base = read("admin.css");
  const rule = (selector: string, sheet = css) => {
    const at = sheet.indexOf(selector);
    expect(at, selector).toBeGreaterThanOrEqual(0);
    return compact(sheet.slice(sheet.indexOf("{", at) + 1, sheet.indexOf("}", at))).replace(/:\s+/g, ":");
  };

  it("frames the whole list like a card, wider than the cards' column", () => {
    const frame = rule(".admin-card-list:has(> .admin-result) {", base);
    for (const declaration of [
      "gap:0",
      "width:min(840px, 100%)",
      "margin:0 auto",
      "background:var(--paper-raised)",
      "border:1px solid var(--line)",
      "border-radius:20px",
      "box-shadow:var(--shadow)"
    ]) {
      expect(frame, declaration).toContain(declaration);
    }
    expect(base).not.toContain("(max-width: 479.98px)");
    expect(css).not.toContain(".poll-admin-card");
  });

  it("separates the results with a hairline and rounds the first and the last into the frame", () => {
    expect(rule(".admin-result + .admin-result {", base)).toContain("border-top:1px solid var(--line)");
    expect(rule(".admin-result:first-child {", base)).toContain("border-top-left-radius:19px");
    expect(rule(".admin-result:last-child {", base)).toContain("border-bottom-right-radius:19px");
  });

  it("stripes every second result", () => {
    expect(rule(".admin-result:nth-child(even){")).toContain("background:var(--md-sys-color-surface-container)");
  });

  it("draws a row at least 64px tall with its text beside the chevron, in the type tokens", () => {
    const row = rule(".admin-result-row{");
    expect(row).toContain("display:flex");
    expect(row).toContain("min-height:64px");
    expect(row).toContain("border-radius:inherit");
    expect(row).toContain("font-size:var(--md-sys-typescale-body-medium-size)");
    expect(row).toContain("scroll-margin-top:calc(var(--fixed-chrome-height, 0px) + 8px)");
    expect(rule(".admin-result-main{")).toContain("flex-direction:column");
  });

  it("wraps a long title, subtitle or fact instead of cutting it", () => {
    expect(rule(".admin-result-title,")).toContain("overflow-wrap:anywhere");
    expect(rule(".admin-result-facts > span{")).toContain("overflow-wrap:anywhere");
    expect(rule(".admin-result-heading,")).toContain("flex-wrap:wrap");
    expect(css.slice(css.indexOf("7. Result rows"))).not.toContain("text-overflow");
  });

  it("separates the facts with a round primary dot and hides an empty subtitle or fact", () => {
    const dot = rule(".admin-result-facts > span:not(:first-child)::before{");
    for (const declaration of [
      "width:6px",
      "height:6px",
      "border-radius:var(--md-sys-shape-corner-full)",
      "background:var(--md-sys-color-primary)"
    ]) {
      expect(dot, declaration).toContain(declaration);
    }
    expect(rule(".admin-result-subtitle:empty,")).toContain("display:none");
  });

  it("hides the chevron of the row being edited, which cannot be closed", () => {
    expect(rule(".admin-result--open .admin-result-row:disabled .admin-result-chevron{")).toContain("visibility:hidden");
  });

  it("shows the state as plain text, with no border of its own", () => {
    expect(css).not.toContain(".admin-result-state");
  });

  it("shows hover, focus and press with a state layer, and focus with a primary ring", () => {
    expect(rule(".admin-result-row:hover::before{")).toContain("opacity:var(--md-sys-state-hover-state-layer-opacity)");
    expect(rule(".admin-result-row:focus-visible::before{")).toContain("opacity:var(--md-sys-state-focus-state-layer-opacity)");
    expect(rule(".admin-result-row:active::before{")).toContain("opacity:var(--md-sys-state-pressed-state-layer-opacity)");
    expect(rule(".admin-result-row:focus-visible{")).toContain("outline:2px solid var(--md-sys-color-primary)");
  });

  it("marks the open result, row and panel, with the secondary container and turns its chevron over", () => {
    const open = rule(".admin-result.admin-result--open{");
    expect(open).toContain("background:var(--md-sys-color-secondary-container)");
    expect(open).toContain("color:var(--md-sys-color-on-secondary-container)");
    expect(rule('.admin-result-row[aria-expanded="true"] .admin-result-chevron{')).toContain("transform:rotate(180deg)");
  });

  it("dims a held row, Search and Clear, but not the open row", () => {
    expect(rule(".admin-result-row:disabled{")).toContain("opacity:0.38");
    expect(rule(".admin-result--open .admin-result-row:disabled{")).toContain("opacity:1");
    expect(rule(".admin-search .admin-search-btn:disabled,")).toContain("opacity:0.38");
  });

  it("hides a closed panel", () => {
    expect(rule(".admin-result-panel[hidden]{")).toContain("display:none");
  });

  it("does not animate the chevron when the visitor asks for reduced motion", () => {
    expect(compact(css)).toContain("@media (prefers-reduced-motion: reduce){ .admin-result-chevron{ transition:none; } }");
  });
});

describe("the open-poll link's styles (POLL-ADMIN-IMPROVEMENTS U16)", () => {
  const css = read("admin-search-m3.css");
  const rules = (selector: string) =>
    [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, selectors]) => selectors!.split(",").some((s) => s.trim() === selector)).map(([, , body]) => compact(body!));

  it("is a 48 px absolutely placed circle with a focus ring, in the theme's primary and on-primary", () => {
    const box = rules(".admin-result-open").join(" ");
    expect(box).toMatch(/position:\s*absolute/);
    expect(box).toMatch(/width:\s*48px/);
    expect(box).toMatch(/height:\s*48px/);
    expect(rules(".admin-result-open:focus-visible").join(" ")).toMatch(/outline:/);
    expect(rules(".admin-result-open-disc").join(" ")).toContain("fill:var(--md-sys-color-primary)");
    expect(rules(".admin-result-open-mark").join(" ")).toContain("fill:var(--md-sys-color-on-primary)");
    expect(rules(".admin-result-open-stroke").join(" ")).toContain("stroke:var(--md-sys-color-on-primary)");
    const own = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, selectors]) => selectors!.includes("admin-result-open"));
    expect(own.length).toBeGreaterThan(0);
    for (const [, , body] of own) {
      expect(body).not.toMatch(/#[0-9a-fA-F]{3}/);
      expect(body).not.toMatch(/font-size/);
    }
  });

  it("has its 64 px halo in the phone layout", () => {
    const phone = mediaBlock(read("phone-admin-m3.css"), "(max-width: 640px)");
    const halo = [...phone.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([, selectors]) => selectors!.includes(".admin-result-open::after"));
    expect(halo).toBeDefined();
    expect(compact(halo![2]!)).toMatch(/inset:\s*-8px/);
  });
});

describe("the wizard's info icons, dialog and Choices preview (POLL-ADMIN-IMPROVEMENTS U16)", () => {
  const css = read("admin-card-m3.css");
  const ruleList = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];

  for (const name of [".wizard-info", ".m3-row-heading", ".wizard-choices-preview", ".modal--info"]) {
    it(`has rules for ${name}, with theme colors and token sizes only`, () => {
      const own = ruleList.filter(([, selectors]) => selectors!.includes(name));
      expect(own.length).toBeGreaterThan(0);
      for (const [, , body] of own) {
        expect(body).not.toMatch(/#[0-9a-fA-F]{3}/);
        expect(body).not.toMatch(/font-size:\s*[\d.]+px/);
      }
    });
  }

  const rules = (selector: string) =>
    ruleList.filter(([, selectors]) => selectors!.split(",").some((s) => s.trim() === selector)).map(([, , body]) => compact(body!)).join(" ");

  it("keeps each info icon on its label's line, about 8 px after it (TWEAK07)", () => {
    expect(rules(".poll-admin-card .m3-row-heading")).toMatch(/flex-wrap:\s*nowrap/);
    expect(rules(".poll-admin-card .m3-row-heading")).toMatch(/gap:\s*0 4px/);
    expect(rules(".poll-admin-card .m3-row-heading > label")).toMatch(/min-width:\s*0/);
    const icon = rules(".poll-admin-card .wizard-info");
    expect(icon).toMatch(/width:\s*24px/);
    expect(icon).toMatch(/height:\s*24px/);
    expect(icon).toMatch(/overflow:\s*visible/);
    expect(rules(".poll-admin-card .wizard-info::after")).toMatch(/inset:\s*-12px 0/);
  });

  it("puts a switch row's label and icon on a line of their own, the switch on the next (TWEAK07)", () => {
    const row = ".poll-admin-card .m3-switch-row:has(> .m3-switch-text > .m3-row-heading)";
    expect(rules(row)).toMatch(/display:\s*grid/);
    expect(rules(row + " > .m3-switch-text")).toMatch(/display:\s*contents/);
    expect(rules(row + " .m3-row-heading")).toMatch(/grid-column:\s*1 \/ -1/);
    expect(rules(row + " > .m3-switch")).toMatch(/grid-column:\s*2/);
  });

  it("keeps the info icon's 64 px target in the phone layout (TWEAK07)", () => {
    const phone = mediaBlock(read("phone-admin-m3.css"), "(max-width: 640px)");
    const own = [...phone.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, selectors]) => selectors!.trim() === ".poll-admin-card .wizard-info::after");
    expect(own.map(([, , body]) => compact(body!)).join(" ")).toMatch(/inset:\s*-20px/);
  });

  it("leaves no .wizard-help in any file of src/public", () => {
    const dir = path.resolve("src/public");
    for (const name of readdirSync(dir, { recursive: true }) as string[]) {
      if (!/\.(js|html|css)$/.test(name)) continue;
      expect(readFileSync(path.join(dir, name), "utf8"), name).not.toContain("wizard-help");
    }
  });
});
