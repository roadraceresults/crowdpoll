/**
 * The phone layout's sheets (contracts/phone-layout.md): one `@media (max-width: 640px)` block each,
 * sized from the tokens, coloured from the tokens, and the phone type scale beside the tokens.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicDir = path.resolve("src/public");
const read = (name: string) => readFileSync(path.join(publicDir, name), "utf8");
const PHONE_QUERY = "(max-width: 640px)";
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
    "phone-m3.css": ["#tabBar .tab", ".card-shell-body label.checkbox", ".card-shell-body .settings-group label"],
    "phone-card-m3.css": [".extras-tab"]
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

  for (const selector of [".avatar-menu a", ".avatar-menu button", ".tab-menu-item"]) {
    it(`phone-m3.css: ${selector} is a row of at least 36px`, () => {
      const declarations = declarationsOf(read("phone-m3.css"), selector);
      expect(declarations).toContain("min-height:36px");
      expect(declarations).not.toContain("min-height:64px");
    });
  }

  for (const selector of [".card-face .more-row", ".card-face .show-all-row"]) {
    it(`phone-card-m3.css: ${selector} is a 52px row whose outline is drawn 8px inside it`, () => {
      const css = read("phone-card-m3.css");
      expect(declarationsOf(css, selector)).toContain("min-height:52px");
      expect(declarationsOf(css, selector + "::before")).toContain("inset:8px0");
    });
  }

  it("makes a card-shell text field 64px tall", () => {
    expect(read("phone-m3.css")).toMatch(/\.card-shell-body input:is\(\[type="text"\], \[type="email"\]\)[^{]*\{[^}]*min-height:64px/);
  });

  it("draws vote rows 52px tall from the script", () => {
    expect(read("pollCard.js")).toContain("const PHONE_VOTE_ROW_HEIGHT = 52;");
  });

  it("gives the admin sheet halos and 64px rows", () => {
    const css = read("phone-admin-m3.css").replace(/\s+/g, "");
    expect(css).toContain("position:absolute;inset:-8px");
    expect(css).toContain("min-height:64px");
  });

  it("keeps each admin search operator beside its value, two fields per line", () => {
    expect(read("admin-search-m3.css")).toMatch(/\.admin-search \.admin-field-pair\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/);
    expect(declarationsOf(read("phone-admin-m3.css"), ".admin-search .admin-field-pair")).toBe("gap:16px;");
  });

  it("draws the Home tab bar's faint line under the admin tab bar", () => {
    expect(read("header-tab-bar-m3.css")).toMatch(/\.tab-bar-wrap::after\{[^}]*height:1px;[^}]*background:var\(--md-sys-color-outline-variant\)/);
    expect(declarationsOf(read("phone-admin-m3.css"), ".admin-tab-bar")).toContain("border-bottom:1pxsolidvar(--md-sys-color-outline-variant)");
  });

  it("draws the admin search toggle as a control bar on top of the search form", () => {
    const base = read("admin-search-m3.css");
    expect(base).toMatch(/\.admin-search-toggle\{[^}]*color:var\(--md-sys-color-primary\);/);
    expect(base).toContain(".admin-search[data-collapsed]{ display:none; }");
    const phone = read("phone-admin-m3.css");
    const bar = declarationsOf(phone, ".admin-search-toggle");
    for (const declaration of [
      "width:100%",
      "min-height:48px",
      "justify-content:flex-end",
      "border:1pxsolidvar(--md-sys-color-primary)",
      "border-radius:20px20px00",
      "background:var(--md-sys-color-secondary-container)"
    ]) {
      expect(bar, declaration).toContain(declaration);
    }
    expect(bar).not.toMatch(/(^|;)color:/);
    expect(declarationsOf(phone, ".admin-search-toggle::before")).toContain("border-radius:inherit");
    expect(declarationsOf(phone, ".admin-search-toggle-row")).toBe("width:100%;margin:0;");
    expect(declarationsOf(phone, ".admin-search-toggle-row + .admin-search")).toContain("border-top:0;border-top-left-radius:0;border-top-right-radius:0;");
  });

  it("outlines the search form in the control bar's color, so the two read as one card", () => {
    const phone = read("phone-admin-m3.css");
    expect(declarationsOf(phone, ".admin-search-toggle")).toContain("border:1pxsolidvar(--md-sys-color-primary)");
    expect(phone).toMatch(/\.admin-search-toggle-row \+ \.admin-search\{\s*border-color:var\(--md-sys-color-primary\);\s*border-top:0;/);
    expect(read("admin.css")).toMatch(/\.poll-admin-card,\s*\.admin-search\s*\{[^}]*border:\s*1px solid var\(--line\)/);
  });

  it("rounds the collapsed control bar on every corner and keeps it clear of the results", () => {
    const phone = read("phone-admin-m3.css");
    expect(declarationsOf(phone, '.admin-search-toggle[aria-expanded="false"]')).toBe("border-radius:20px;");
    expect(declarationsOf(phone, '.admin-search-toggle-row:has(.admin-search-toggle[aria-expanded="false"])')).toBe("margin-bottom:16px;");
  });

  it("clamps the admin card's notes summary to three lines, one fewer than on wider screens", () => {
    expect(read("admin-card-m3.css")).toMatch(/\.poll-admin-card \.wizard-summary-notes\{[^}]*-webkit-line-clamp:4;\s*line-clamp:4;/);
    expect(declarationsOf(read("phone-admin-m3.css"), ".poll-admin-card .wizard-summary-notes")).toBe("-webkit-line-clamp:3;line-clamp:3;");
  });

  it("narrows the gap between the rows of the admin search form to 9px and keeps the gap inside a row", () => {
    const phone = read("phone-admin-m3.css");
    expect(read("admin-search-m3.css")).toMatch(/\.admin-search\{\s*display:flex;\s*flex-direction:column;\s*gap:16px;/);
    expect(declarationsOf(phone, ".admin-search")).toContain("gap:9px;");
    expect(declarationsOf(phone, ".admin-search .admin-field-pair")).toBe("gap:16px;");
    expect(declarationsOf(phone, ".admin-search .admin-search-actions")).toContain("gap:16px;");
  });

  it("draws each radio group of the admin search form 4px closer to the row below it", () => {
    const phone = read("phone-admin-m3.css");
    expect(declarationsOf(phone, ".admin-search .admin-radio-group")).toContain("margin-bottom:-4px;");
    expect(declarationsOf(phone, ".admin-search .admin-checkbox-row")).not.toContain("margin");
  });

  it("gives each admin search row whose label floats on its border 2px more room above, the label keeping its solid background", () => {
    const phone = read("phone-admin-m3.css");
    expect(declarationsOf(phone, ".admin-search > .m3-outlined:has(> select)")).toBe("margin-top:2px;");
    expect(declarationsOf(phone, ".admin-search > .admin-field-pair")).toBe("margin-top:2px;");
    expect(phone).not.toContain("linear-gradient");
    expect(declarationsOf(read("admin-search-m3.css"), ".admin-search .m3-outlined label")).toContain("background:var(--paper-raised);");
  });

  it("sets the admin card's summary sentences in the small body size, on lines that still clear a link's padding", () => {
    const phone = read("phone-admin-m3.css");
    expect(read("admin-card-m3.css")).toMatch(/\.poll-admin-card \.wizard-summary-text\{\s*font-size:var\(--md-sys-typescale-body-medium-size\);/);
    expect(declarationsOf(phone, ".poll-admin-card .wizard-summary-text")).toBe(
      "margin-top:4px;font-size:var(--md-sys-typescale-body-small-size);line-height:24px;",
    );
    expect(declarationsOf(phone, ".poll-admin-card .wizard-summary-link")).toBe("padding-block:3px;");
    expect(declarationsOf(phone, ".poll-admin-card .wizard-summary .subtitle")).toBe("");
  });

  it("leaves the Banned Voter Count line off the admin card", () => {
    expect(declarationsOf(read("phone-admin-m3.css"), ".poll-admin-card .card-banned-count")).toBe("display:none;");
    expect(read("adminCard.js")).toContain('readOnlyField("Banned Voter Count", String(current.bannedVoterCount ?? 0), "card-banned-count")');
  });

  it("sets every typed field of the wizard at 16px on 24px lines, the Choices text area at least four lines tall", () => {
    const phone = read("phone-admin-m3.css");
    const typed = "font-size:max(16px,var(--md-sys-typescale-body-small-size));line-height:24px;";
    for (const selector of [".m3-field-input", ".wizard-notes-preview", ".notes-editor-text", ".m3-datetime"]) {
      expect(declarationsOf(phone, `.poll-admin-card ${selector}`), selector).toContain(typed);
    }
    expect(declarationsOf(phone, ".poll-admin-card .m3-field-input")).toContain("min-height:48px;padding-block:12px;");
    expect(declarationsOf(phone, ".poll-admin-card .m3-field--choices .m3-field-input")).toBe("min-height:calc(4*24px+24px);");
    expect(declarationsOf(phone, ".poll-admin-card .invitees-input")).toContain("font-size:var(--md-sys-typescale-body-large-size);");
  });

  it("draws the wizard's fields and rows 48px tall and its parts closer together, the buttons keeping their halo", () => {
    const phone = read("phone-admin-m3.css");
    for (const selector of [".m3-radio-item", ".m3-switch-row", ".m3-field-input", ".wizard-notes-preview", ".m3-datetime", ".wizard-color-row"]) {
      expect(declarationsOf(phone, `.poll-admin-card ${selector}`), selector).toContain("min-height:48px;");
    }
    expect(declarationsOf(phone, ".poll-admin-card .m3-chip-input")).toContain("height:48px;");
    expect(declarationsOf(phone, ".poll-admin-card .wizard-step-circle")).toBe("width:40px;height:40px;");
    expect(declarationsOf(phone, ".poll-admin-card .wizard-step-btn")).toBe("grid-template-rows:20px40px;");
    expect(declarationsOf(phone, ".poll-admin-card .wizard-steps::before")).toBe("top:40px;");
    expect(declarationsOf(phone, ".poll-admin-card--new")).toBe("gap:12px;");
    expect(declarationsOf(phone, ".poll-admin-card .wizard-panel")).toBe("gap:12px;padding:12px16px;");
    expect(declarationsOf(phone, ".poll-admin-card .wizard-fields")).toBe("gap:12px;");
    expect(phone).toContain(".poll-admin-card :is(.m3-filled-btn, .m3-tonal-btn, .btn-header-primary, .btn-header-ghost){ height:48px; overflow:visible; }");
  });

  it("sets every label-medium text of the admin poll card in the small label size", () => {
    const base = read("admin-card-m3.css");
    const phone = read("phone-admin-m3.css");
    const sized = [...base.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, , body]) => body!.includes("font-size:var(--md-sys-typescale-label-medium-size)"))
      .map(([, selectors]) => selectors!.replace(/\/\*[\s\S]*?\*\//g, "").trim());
    expect(sized).toEqual([
      ".poll-admin-card .card-field-label",
      ".poll-admin-card .is-current .wizard-step-label",
      ".poll-admin-card .wizard-summary-copy-link",
      ".poll-admin-card .invitees-field-label",
      ".poll-admin-card .invitee-chip",
      ".poll-admin-card .not-your-poll-chip"
    ]);
    for (const selector of sized) {
      const size = selector.endsWith(".wizard-summary-copy-link") ? "label-large" : "label-small";
      expect(declarationsOf(phone, selector), selector).toContain(`font-size:var(--md-sys-typescale-${size}-size)`);
    }
    expect(phone).not.toContain("label-medium");
  });

  it("draws the separator dot before a result's first fact too, so wrapped facts line up", () => {
    const base = read("admin-search-m3.css");
    const separator = /\.admin-result-facts > span:not\(:first-child\)::before\{([^}]*)\}/.exec(base)![1]!.replace(/\s+/g, "");
    expect(separator).toContain("width:6px;height:6px;margin:010px;");
    expect(declarationsOf(read("phone-admin-m3.css"), ".admin-result-facts > span:first-child::before")).toBe(separator);
  });

  it("keeps each admin search radio group in one row of three, its labels wrapping", () => {
    expect(read("admin-search-m3.css")).toMatch(/\.admin-search \.admin-radio-group\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
    const phone = read("phone-admin-m3.css");
    expect(declarationsOf(phone, ".admin-search .admin-radio-group")).not.toContain("grid-template-columns");
    expect(declarationsOf(phone, ".admin-search .admin-radio span")).toBe("min-width:0;overflow-wrap:anywhere;");
  });

  it("sets the Reset control's text on three right-aligned lines 15px apart, with a 28px X after it", () => {
    const base = read("admin-search-m3.css");
    expect(base).toMatch(/\.admin-search \.admin-search-clear\{\s*display:inline-flex;\s*align-items:center;\s*gap:8px;\s*\}/);
    expect(base).toMatch(/\.admin-search \.admin-search-clear svg\{\s*flex:0 0 auto;\s*width:24px;\s*height:24px;\s*\}/);
    const phone = read("phone-admin-m3.css");
    expect(declarationsOf(phone, ".admin-search .admin-search-clear-text")).toBe("width:min-content;line-height:15px;text-align:right;");
    expect(declarationsOf(phone, ".admin-search .admin-search-clear svg")).toBe("width:28px;height:28px;");
    const html = read("admin.html");
    expect(html.match(/<span class="admin-search-clear-text">Reset search fields<\/span>/g)).toHaveLength(2);
    expect(html.match(/id="adminSearchClear"/g)).toHaveLength(1);
  });

  it("draws the Reset control's X on a solid circle of the control's color", () => {
    expect(read("admin.html").match(/<circle cx="12" cy="12" r="11" fill="currentColor" stroke="none"\/><path d="M8\.5 8\.5l7 7M15\.5 8\.5l-7 7"\/><\/svg>\s*<\/button>/g)).toHaveLength(2);
    const base = read("admin-search-m3.css");
    expect(base).toContain(".admin-search .admin-search-clear svg path{ stroke:var(--md-sys-color-on-primary); }");
    expect(base).toMatch(/\.admin-search \.admin-search-clear\{\s*padding:0 12px;\s*background:transparent;\s*color:var\(--md-sys-color-primary\);/);
  });

  it("puts the admin search's two checkboxes side by side, their labels wrapping", () => {
    const phone = read("phone-admin-m3.css");
    expect(declarationsOf(phone, ".admin-search .admin-checkbox-row")).toContain("grid-template-columns:repeat(2,minmax(0,1fr))");
    expect(declarationsOf(phone, ".admin-search .admin-checkbox span")).toBe("min-width:0;overflow-wrap:anywhere;");
  });

  it("keeps an admin search result a 64px row at every width and draws its chevron at the phone icon size", () => {
    expect(declarationsOf(read("admin-search-m3.css"), ".admin-result-row")).toContain("min-height:64px");
    const phone = read("phone-admin-m3.css");
    expect(declarationsOf(phone, ".admin-result-row")).toContain("gap:16px");
    expect(declarationsOf(phone, ".admin-result-chevron")).toBe("width:28px;height:28px;");
  });

  it("sets the admin search's text, but not its typed fields, in the small label size", () => {
    const phone = read("phone-admin-m3.css");
    for (const selector of [
      ".admin-search-notice",
      ".admin-search-toggle",
      ".admin-search .m3-outlined label",
      ".admin-search .admin-radio",
      ".admin-search .admin-checkbox",
      ".admin-search .admin-search-btn",
      ".admin-search .admin-search-clear",
      ".admin-result-row",
      ".admin-result-title",
      ".admin-result-subtitle"
    ]) {
      const declarations = declarationsOf(phone, selector);
      expect(declarations, selector).toContain("font-size:var(--md-sys-typescale-label-small-size)");
      expect(declarations, selector).toContain("line-height:var(--md-sys-typescale-label-small-line-height)");
      expect(declarations.match(/font-size:/g), selector).toHaveLength(1);
    }
    expect(phone).toMatch(/\.admin-search \.m3-outlined :is\(input, select\)\{ height:\d+px; \}/);
    expect(phone).not.toMatch(/:is\(input, select\)[^{]*\{[^}]*font-size/);
  });

  it("keeps every typed admin search field at 16px or more, so iOS Safari does not zoom on focus", () => {
    expect(read("admin-search-m3.css")).toMatch(/\.admin-search \.m3-outlined :is\(input, select\)\s*\{[^}]*font-size:\s*var\(--md-sys-typescale-body-large-size\)/);
    const sizes = [...read("m3-tokens.css").matchAll(/--md-sys-typescale-body-large-size:\s*(\d+)px/g)].map((match) => Number(match[1]));
    expect(sizes).toEqual([16, 20]);
    const form = /<form[^>]*class="admin-search"[\s\S]*?<\/form>/.exec(read("admin.html"))![0];
    const typed = [...form.matchAll(/<(?:select|textarea|input(?![^>]*type="(?:radio|checkbox)"))\b/g)].length;
    const outlined = [...form.matchAll(/<div class="m3-outlined">\s*<(?:input|select)\b/g)].length;
    expect(typed).toBeGreaterThan(0);
    expect(outlined).toBe(typed);
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

  it("sets its text 4px larger than the small text", () => {
    expect(declarationsOf(css, ".site-footer")).toContain("font-size:calc(var(--md-sys-typescale-body-small-size)+4px)");
  });

  it("keeps its links in the text, on lines 1.5 times the small text's line height", () => {
    expect(declarationsOf(css, ".site-footer")).toContain("line-height:calc(var(--md-sys-typescale-body-small-line-height)*1.5)");
    expect(declarationsOf(css, ".site-footer a")).toBe("padding-block:6px;");
  });

  it("draws the separator dots at three times the small text's size without making the line taller", () => {
    const dot = declarationsOf(css, ".site-footer-dot");
    expect(dot).toContain("font-size:calc(var(--md-sys-typescale-body-small-size)*3)");
    expect(dot).toContain("line-height:0");
  });
});

describe("the phone boundary", () => {
  it("is 640px in every sheet and script, with no older boundary left", () => {
    for (const name of readdirSync(publicDir).filter((file) => /\.(css|js)$/.test(file))) {
      expect(read(name), name).not.toMatch(/639\.98px|max-width:\s*480px|min-width:\s*640px/);
    }
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
