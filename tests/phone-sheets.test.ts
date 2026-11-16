/**
 * The phone layout's sheets (contracts/phone-layout.md): one `@media (max-width: 480px)` block each,
 * sized from the tokens, coloured from the tokens, and the phone type scale beside the tokens.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicDir = path.resolve("src/public");
const read = (name: string) => readFileSync(path.join(publicDir, name), "utf8");
const PHONE_QUERY = "(max-width: 480px)";
const PHONE_SHEETS = ["phone-m3.css", "phone-card-m3.css", "phone-admin-m3.css"];

const PHONE_SCALE: Record<string, [number, number]> = {
  "headline-small": [30, 40],
  "title-large": [25, 35],
  "title-medium": [20, 30],
  "title-small": [18, 25],
  "body-large": [20, 30],
  "body-medium": [18, 25],
  "body-small": [15, 20],
  "label-large": [18, 25],
  "label-medium": [15, 20],
  "label-small": [15, 18]
};

function blockAt(css: string, open: number): string {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(open, i + 1);
  }
  throw new Error("unbalanced braces");
}

/** The declarations of every rule in the sheet whose selector list names `selector` exactly. */
function declarationsOf(css: string, selector: string): string {
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  return rules
    .filter(([, selectors]) => selectors!.split(",").some((one) => one.trim() === selector))
    .map(([, , body]) => body)
    .join(";")
    .replace(/\s+/g, "");
}

describe("the phone type scale", () => {
  it("redefines every typescale role under the phone query, beside the tokens (contract P2)", () => {
    const tokens = read("m3-tokens.css");
    const blocks = tokens.split(`@media ${PHONE_QUERY}`);
    expect(blocks).toHaveLength(2);
    const block = blockAt(blocks[1]!, blocks[1]!.indexOf("{")).replace(/\s+/g, "");
    expect(block.startsWith("{:root{")).toBe(true);
    for (const [role, [size, line]] of Object.entries(PHONE_SCALE)) {
      expect(block, role).toContain(`--md-sys-typescale-${role}-size:${size}px;`);
      expect(block, role).toContain(`--md-sys-typescale-${role}-line-height:${line}px;`);
    }
    expect(tokens).toContain("--md-sys-typescale-title-large-size:20px;");
  });
});

describe("the phone sheets", () => {
  for (const name of PHONE_SHEETS) {
    it(`${name} is one phone-query block holding only tokens`, () => {
      const css = read(name);
      expect(css.trimStart().startsWith(`@media ${PHONE_QUERY}{`)).toBe(true);
      expect(blockAt(css, css.indexOf("{")).length).toBe(css.trim().length - css.trim().indexOf("{"));
      expect(css).not.toContain("/*");
      expect(css).not.toMatch(/font-size:\s*[\d.]+(px|rem|em)/);
      expect(css).not.toMatch(/font:\s*[^;]*\d(px|rem|em)/);
      expect(css).not.toMatch(/(^|[{;\s])--md-sys-[a-z-]+:/);
      expect(css).not.toContain("prefers-color-scheme");
      expect(css).not.toContain("data-theme");
      expect(css).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
      expect(css).not.toMatch(/\b(rgba?|hsla?)\(/);
      for (const [, factor] of css.matchAll(/var\(--md-sys-typescale-[a-z-]+\)\s*\*\s*([\d.]+)/g)) {
        expect(Number(factor)).toBeGreaterThanOrEqual(1);
      }
    });
  }

  it("keeps the page at least 480px wide (contract P1)", () => {
    expect(declarationsOf(read("phone-m3.css"), ".page")).toContain("min-width:480px");
  });

  it("uses the query the scripts ask about", () => {
    expect(read("pollCard.js")).toContain(`const PHONE_LAYOUT_QUERY = '${PHONE_QUERY}';`);
  });

  it("links the frame sheet last on every page, and the card and admin sheets after it on theirs", () => {
    const pages = readdirSync(publicDir).filter((name) => name.endsWith(".html"));
    expect(pages.length).toBeGreaterThanOrEqual(12);
    for (const page of pages) {
      const sheets = [...read(page).matchAll(/<link rel="stylesheet" href="\/([^"/]+)">/g)].map((m) => m[1]);
      const expected = page === "index.html" ? ["phone-m3.css", "phone-card-m3.css"] : page === "admin.html" ? ["phone-m3.css", "phone-admin-m3.css"] : ["phone-m3.css"];
      expect(sheets.slice(-expected.length), page).toEqual(expected);
    }
  });
});

describe("touch targets in the phone layout (contract P3)", () => {
  /** A 48px control whose transparent ::after reaches 8px past each edge. */
  const HALOED: Record<string, string[]> = {
    "phone-m3.css": [
      ".header-actions .btn-header-ghost",
      ".header-actions .btn-header-primary",
      ".header-search-tab-btn",
      ".header-user .avatar-btn",
      ".tab-bar-wrap .tab-refresh--icon",
      ".tab-bar-wrap .tab-menu-btn",
      ".tab-bar-wrap .maximized-back",
      ".back-arrow",
      "#cookie-banner button",
      ".card-shell-face .btn-vote",
      ".card-shell-face .card-shell-close"
    ],
    "phone-card-m3.css": [
      ".card-face .btn-vote",
      ".card-face .live-link",
      ".card-face .icon-btn",
      ".card-face .question-row .bookmark-btn",
      ".card-face .question-row .maximize-btn",
      ".card-face .add-choice-btn",
      ".vote-bar .icon-btn",
      ".vote-bar .vote-bar-submit"
    ]
  };
  /** A control that is itself at least 64px tall across its container. */
  const ROWS: Record<string, string[]> = {
    "phone-m3.css": ["#tabBar .tab", ".card-shell-body label.checkbox", ".card-shell-body .settings-group label", ".avatar-menu button", ".tab-menu-item"],
    "phone-card-m3.css": [".card-face .more-row", ".card-face .show-all-row", ".extras-tab"]
  };

  for (const [sheet, selectors] of Object.entries(HALOED)) {
    for (const selector of selectors) {
      it(`${sheet}: ${selector} is 48px with a halo`, () => {
        const css = read(sheet);
        expect(declarationsOf(css, `${selector}::after`)).toContain("position:absolute;inset:-8px");
        expect(declarationsOf(css, selector)).toMatch(/height:48px/);
      });
    }
  }

  for (const [sheet, selectors] of Object.entries(ROWS)) {
    for (const selector of selectors) {
      it(`${sheet}: ${selector} is a 64px row`, () => {
        expect(declarationsOf(read(sheet), selector)).toContain("min-height:64px");
      });
    }
  }

  it("makes a card-shell text field 64px tall", () => {
    expect(read("phone-m3.css")).toMatch(/\.card-shell-body input:is\(\[type="text"\], \[type="email"\]\)[^{]*\{[^}]*min-height:64px/);
  });

  it("draws vote rows 64px tall from the script", () => {
    expect(read("pollCard.js")).toContain("const PHONE_VOTE_ROW_HEIGHT = 64;");
  });

  it("gives the admin sheet halos, 64px rows and one search field per row", () => {
    const css = read("phone-admin-m3.css").replace(/\s+/g, "");
    expect(css).toContain("position:absolute;inset:-8px");
    expect(css).toContain("min-height:64px");
    expect(css).toMatch(/\.admin-field-pair[^{]*\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
  });
});

describe("the extras tab bar and the Submit bar", () => {
  it("shows them in the phone layout only", () => {
    const base = read("tabs.css").replace(/\s+/g, " ");
    expect(base).toContain(".extras-tabs, .vote-bar{ display:none; }");
    const phone = read("phone-card-m3.css");
    expect(declarationsOf(phone, ".extras-tabs")).toContain("display:flex");
    expect(declarationsOf(phone, ".vote-bar")).toContain("display:flex");
    expect(declarationsOf(phone, ".vote-bar")).toContain("bottom:var(--cookie-banner-offset,0px)");
    expect(phone).not.toContain("extras-header");
  });

  it("shows only the section whose tab is selected", () => {
    const phone = read("phone-card-m3.css");
    for (const extra of ["notes", "voters", "graph"]) {
      expect(declarationsOf(phone, `.maximized-space-right:not([data-shown="${extra}"]) > .maximized-${extra}`), extra).toContain("display:none");
    }
  });

  it("styles the extras tabs as the Home tab bar's tabs", () => {
    const phone = read("phone-card-m3.css");
    const home = read("header-tab-bar-m3.css");
    const homePhone = read("phone-m3.css");
    const tab = declarationsOf(phone, ".extras-tab");
    expect(declarationsOf(homePhone, "#tabBar .tab")).toContain("font-size:var(--md-sys-typescale-label-small-size)");
    expect(tab).toContain("font-size:var(--md-sys-typescale-label-small-size)");
    expect(tab).toContain("line-height:var(--md-sys-typescale-label-small-line-height)");
    for (const declaration of ["color:var(--md-sys-color-on-surface-variant)", "font-weight:500", "letter-spacing:var(--md-sys-typescale-title-small-tracking)"]) {
      expect(declarationsOf(home, ".tab-bar .tab"), declaration).toContain(declaration);
      expect(tab, declaration).toContain(declaration);
    }
    expect(declarationsOf(home, ".tab-bar .tab.is-active")).toContain("color:var(--md-sys-color-primary)");
    expect(declarationsOf(phone, ".extras-tab.is-active")).toContain("color:var(--md-sys-color-primary)");
    for (const declaration of ["bottom:0", "height:3px", "border-radius:3px3px00", "background:var(--md-sys-color-primary)"]) {
      expect(declarationsOf(home, ".tab-bar .tab.is-active::after"), declaration).toContain(declaration);
      expect(declarationsOf(phone, ".extras-tab.is-active::after"), declaration).toContain(declaration);
    }
    const greyed = "color:color-mix(insrgb,var(--md-sys-color-on-surface)38%,transparent)";
    expect(declarationsOf(home, '.tab-bar .tab[aria-disabled="true"]')).toContain(greyed);
    expect(declarationsOf(phone, '.extras-tab[aria-disabled="true"]')).toContain(greyed);
    expect(declarationsOf(home, ".tab-bar-wrap::after")).toContain("background:var(--md-sys-color-outline-variant)");
    expect(declarationsOf(phone, ".extras-tabs")).toContain("border-bottom:1pxsolidvar(--md-sys-color-outline-variant)");
  });

  it("draws the extras tabs' icons half as large again as the Home tab bar's", () => {
    const icon = declarationsOf(read("phone-card-m3.css"), ".extras-tab .tab-icon");
    const homeIcon = declarationsOf(read("phone-m3.css"), "#tabBar .tab .tab-icon");
    for (const side of ["width", "height"]) {
      expect(homeIcon).toContain(`${side}:20px`);
      expect(icon).toContain(`${side}:30px`);
    }
  });

  it("sizes the bar labels from the label-large token", () => {
    expect(declarationsOf(read("phone-card-m3.css"), ".card-face .result-row.is-phone > .result-label")).toContain("font-size:var(--md-sys-typescale-label-large-size)");
  });

  it("lets the maximized card be as tall as the side showing", () => {
    expect(declarationsOf(read("phone-card-m3.css"), ".maximized-card-flip:not(.is-flipped) .card-back")).toContain("position:absolute");
    expect(declarationsOf(read("phone-card-m3.css"), ".maximized-card-flip.is-flipped .card-front")).toContain("position:absolute");
  });
});

describe("the footer in the phone layout", () => {
  const css = read("phone-m3.css");

  it("keeps its links in the text, on lines 1.6 times the small text's line height", () => {
    expect(declarationsOf(css, ".site-footer")).toContain("line-height:calc(var(--md-sys-typescale-body-small-line-height)*1.6)");
    expect(declarationsOf(css, ".site-footer a")).toBe("padding-block:6px;");
  });

  it("draws the separator dots at twice the small text's size without making the line taller", () => {
    const dot = declarationsOf(css, ".site-footer-dot");
    expect(dot).toContain("font-size:calc(var(--md-sys-typescale-body-small-size)*2)");
    expect(dot).toContain("line-height:0");
  });
});

describe("the thresholds under 480px", () => {
  it("are gone from every sheet (contract P1)", () => {
    for (const name of readdirSync(publicDir).filter((file) => file.endsWith(".css"))) {
      expect(read(name), name).not.toMatch(/max-width:\s*(479\.98|359\.98|319\.98)px/);
    }
    expect(read("admin.css")).not.toContain("292px");
  });
});
