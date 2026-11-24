/**
 * The Material 3 assets each page ships: the token sheet first, the page's own
 * production sheets unchanged, then its M3 layers in one canonical order, and
 * the ripple script ahead of the page's scripts. The lists below are the whole
 * allowlist, so any other change to a page's sheets or scripts fails here.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicDir = path.resolve("src/public");

const LAYER_ORDER = [
  "tooltip-m3.css",
  "header-tab-bar-m3.css",
  "header-single-column-m3.css",
  "header-single-row-m3.css",
  "header-fixed-m3.css",
  "back-to-top-m3.css",
  "back-arrow-m3.css",
  "tabs-modal-m3.css",
  "add-own-m3.css",
  "live-idle-prompt-m3.css",
  "empty-tab-line-m3.css",
  "discard-dialog-m3.css",
  "pollCard-m3.css",
  "card-shell-m3.css",
  "human-check-m3.css",
  "profile-editor-m3.css",
  "site-settings-m3.css",
  "admin-card-m3.css",
  "admin-search-m3.css",
  "single-column-m3.css",
  "tab-bar-scroll-arrows-m3.css",
  "snackbar-m3.css",
  "legal-m3.css",
  "footer-m3.css",
  "line-graph-m3.css",
  "who-voted-m3.css",
  "phone-m3.css",
  "phone-card-m3.css",
  "phone-admin-m3.css"
];

interface PageAssets {
  sheets: string[];
  scripts: string[];
  layers: string[];
}

const PAGES: Record<string, PageAssets> = {
  "index.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "sharePoll.js", "pollCard.js", "deviceEvidence.js", "voteClient.js", "deltaClient.js", "lineGraph.js", "whoVoted.js", "tabs.js", "trending.js", "newest.js", "searchTab.js", "liveResults.js", "tabBarScroll.js", "tabBarScrollArrows.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "back-arrow-m3.css", "tabs-modal-m3.css", "add-own-m3.css", "live-idle-prompt-m3.css", "empty-tab-line-m3.css", "pollCard-m3.css", "single-column-m3.css", "tab-bar-scroll-arrows-m3.css", "snackbar-m3.css", "footer-m3.css", "line-graph-m3.css", "who-voted-m3.css", "phone-m3.css", "phone-card-m3.css"]
  },
  "profile.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "pageTabBar.js", "headerFit.js", "fixedChrome.js", "backArrow.js", "deviceEvidence.js", "cardShell.js", "profileCard.js", "tabBarScroll.js", "tabBarScrollArrows.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "card-shell-m3.css", "profile-editor-m3.css", "single-column-m3.css", "tab-bar-scroll-arrows-m3.css", "footer-m3.css", "phone-m3.css"]
  },
  "settings.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "pageTabBar.js", "headerFit.js", "fixedChrome.js", "deviceEvidence.js", "cardShell.js", "settingsCard.js", "tabBarScroll.js", "tabBarScrollArrows.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "card-shell-m3.css", "profile-editor-m3.css", "site-settings-m3.css", "single-column-m3.css", "tab-bar-scroll-arrows-m3.css", "footer-m3.css", "phone-m3.css"]
  },
  "login.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "cardShell.js", "humanCheck.js", "loginCard.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "card-shell-m3.css", "human-check-m3.css", "footer-m3.css", "phone-m3.css"]
  },
  "create-account.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "cardShell.js", "humanCheck.js", "createAccountCard.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "card-shell-m3.css", "human-check-m3.css", "footer-m3.css", "phone-m3.css"]
  },
  "confirm-signin.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "cardShell.js", "confirmSigninCard.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "card-shell-m3.css", "footer-m3.css", "phone-m3.css"]
  },
  "invite.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "cardShell.js", "humanCheck.js", "inviteCard.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "card-shell-m3.css", "human-check-m3.css", "footer-m3.css", "phone-m3.css"]
  },
  "not-authorized.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "cardShell.js", "notAuthorizedCard.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "card-shell-m3.css", "footer-m3.css", "phone-m3.css"]
  },
  "privacy.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "backArrow.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "back-arrow-m3.css", "legal-m3.css", "footer-m3.css", "phone-m3.css"]
  },
  "terms.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "backArrow.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "back-arrow-m3.css", "legal-m3.css", "footer-m3.css", "phone-m3.css"]
  },
  "accept-terms.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "cardShell.js", "acceptTermsCard.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "card-shell-m3.css", "footer-m3.css", "phone-m3.css"]
  },
  "admin.html": {
    sheets: ["styles.css", "tabs.css", "pollCard.css", "admin.css", "site.css"],
    scripts: ["app.js", "pageTabBar.js", "headerFit.js", "fixedChrome.js", "backArrow.js", "notesEditor.js", "deviceEvidence.js", "sharePoll.js", "adminCard.js", "adminList.js", "tabBarScroll.js", "tabBarScrollArrows.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "back-arrow-m3.css", "tabs-modal-m3.css", "discard-dialog-m3.css", "admin-card-m3.css", "admin-search-m3.css", "single-column-m3.css", "tab-bar-scroll-arrows-m3.css", "snackbar-m3.css", "footer-m3.css", "phone-m3.css", "phone-admin-m3.css"]
  }
};

function read(name: string): string {
  return readFileSync(path.join(publicDir, name), "utf8");
}

function localSheets(html: string): string[] {
  return [...html.matchAll(/<link rel="stylesheet" href="\/([^"/]+)">/g)].map((m) => m[1]);
}

function scripts(html: string): string[] {
  return [...html.matchAll(/<script src="\/([^"]+)" defer><\/script>/g)].map((m) => m[1]);
}

function blockEnd(css: string, open: number): number {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return i + 1;
  }
  throw new Error("unbalanced braces");
}

const normalise = (rule: string) => rule.replace(/\s+/g, " ").trim();

/** Top-level rules forced dark by `:root[data-theme="dark"]`. */
function forcedDarkRules(css: string): string[] {
  return [...css.matchAll(/^:root\[data-theme="dark"\][^{]*\{/gm)].map((m) =>
    normalise(css.slice(m.index!, blockEnd(css, css.indexOf("{", m.index!))))
  );
}

function expectedSheets(page: PageAssets): string[] {
  return ["m3-tokens.css", ...page.sheets, ...LAYER_ORDER.filter((layer) => page.layers.includes(layer))];
}

function expectedScripts(page: PageAssets): string[] {
  const tooltip = page.layers.includes("tooltip-m3.css") ? ["tooltip-m3.js"] : [];
  return ["m3-ripple.js", ...tooltip, ...page.scripts];
}

describe("Material 3 page assets", () => {
  for (const [file, page] of Object.entries(PAGES)) {
    it(`${file} loads exactly its allowed sheets and scripts, in order`, () => {
      const html = read(file);
      expect(localSheets(html)).toEqual(expectedSheets(page));
      expect(scripts(html)).toEqual(expectedScripts(page));
    });

    it(`${file} loads its fonts from CrowdPoll, first`, () => {
      const html = read(file);
      expect(html.match(/<link rel="stylesheet" href="\/fonts\/fonts\.css">/g)).toHaveLength(1);
      expect(html.indexOf('href="/fonts/fonts.css"')).toBeLessThan(html.indexOf('href="/m3-tokens.css"'));
      expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    });

    it(`${file} applies the color scheme before any stylesheet`, () => {
      const html = read(file);
      const tag = '<script src="/colorScheme.js"></script>';
      expect(html.split(tag)).toHaveLength(2);
      expect(html.indexOf(tag)).toBeLessThan(html.indexOf('<link rel="stylesheet"'));
      expect(html.indexOf("<script")).toBe(html.indexOf(tag));
    });
  }

  it("never follows the device's colour scheme: Dark comes only from the user's choice", () => {
    const sheets = readdirSync(publicDir).filter((name) => name.endsWith(".css"));
    let darkSheets = 0;
    for (const name of sheets) {
      if (forcedDarkRules(read(name)).length > 0) darkSheets++;
      expect(read(name), name).not.toContain("prefers-color-scheme");
    }
    expect(darkSheets).toBeGreaterThanOrEqual(4);
  });

  it("pins no page to a scheme: the admin pages follow the user's choice too", () => {
    for (const file of Object.keys(PAGES)) expect(read(file).includes("data-theme"), file).toBe(false);
  });

  it("defines the shared ripple registry", () => {
    expect(read("m3-ripple.js")).toContain("window.M3Ripple = { add }");
  });

  it("holds the ripple rules with the tokens", () => {
    const tokens = read("m3-tokens.css");
    expect(tokens).toContain(".m3-ripple{");
    expect(tokens).toContain("@keyframes m3-ripple");
    expect(tokens).toContain(".m3-ripple-host{");
  });

  it("draws the page background's two glows from tokens, colour and strength set per scheme", () => {
    const tokens = read("m3-tokens.css");
    const scheme = (selector: string) => {
      const start = tokens.indexOf(`${selector}{`);
      return tokens.slice(start, tokens.indexOf("}", start));
    };
    for (const selector of [':root:not([data-theme="dark"])', ':root[data-theme="dark"]']) {
      for (const declaration of ["--page-glow-1-color:#3D5A46;", "--page-glow-1-strength:6%;", "--page-glow-2-color:#E8A33D;", "--page-glow-2-strength:8%;"]) {
        expect(scheme(selector), `${selector} ${declaration}`).toContain(declaration);
      }
    }
    for (const declaration of ["--page-glow-1-size:600px 400px;", "--page-glow-1-at:12% 8%;", "--page-glow-2-size:500px 380px;", "--page-glow-2-at:90% 95%;"]) {
      expect(tokens).toContain(declaration);
    }
    const decor = tokens.match(/:root \.page-decor\{([^}]*)\}/)![1];
    for (const glow of [1, 2]) {
      expect(decor).toContain(
        `radial-gradient(var(--page-glow-${glow}-size) at var(--page-glow-${glow}-at), color-mix(in srgb, var(--page-glow-${glow}-color) var(--page-glow-${glow}-strength), transparent), transparent 60%)`
      );
    }
  });

  it("sets the header's and the Tab Bar's colours per scheme, starting from the roles they used before", () => {
    const tokens = read("m3-tokens.css");
    const scheme = (selector: string) => {
      const start = tokens.indexOf(`${selector}{`);
      return tokens.slice(start, tokens.indexOf("\n}", start));
    };
    const levers = {
      "--header-background": "var(--paper)",
      "--header-divider": "var(--md-sys-color-outline-variant)",
      "--header-text": "var(--md-sys-color-on-surface)",
      "--header-link": "var(--md-sys-color-primary)",
      "--header-button": "var(--md-sys-color-primary)",
      "--on-header-button": "var(--md-sys-color-on-primary)",
      "--search-field-background": "var(--md-sys-color-surface-container-high)",
      "--tab-bar-background": "var(--paper)",
      "--tab-bar-divider": "var(--md-sys-color-outline-variant)",
      "--tab-text": "var(--md-sys-color-on-surface-variant)",
      "--tab-active-text": "var(--md-sys-color-primary)",
      "--tab-indicator": "var(--md-sys-color-primary)",
      "--tab-refresh-background": "var(--icon-button-background)",
      "--tab-refresh-icon": "var(--md-sys-color-on-secondary-container)"
    };
    for (const selector of [':root:not([data-theme="dark"])', ':root[data-theme="dark"]']) {
      for (const [name, value] of Object.entries(levers)) {
        expect(scheme(selector), `${selector} ${name}`).toContain(`${name}:${value};`);
      }
    }
    const bar = read("header-tab-bar-m3.css");
    for (const use of [
      "background:var(--tab-bar-divider);",
      "color:var(--tab-text);",
      "color:var(--tab-active-text);",
      "background:var(--tab-indicator);",
      '.tab-bar .tab-icon [fill="#e8edf2" i]{ fill:var(--tab-bar-background); }',
      "background:var(--tab-refresh-background);",
      "color:var(--tab-refresh-icon);",
      "background:var(--search-field-background);",
      ".search-icon-btn{ color:var(--header-text); }",
      "color:var(--header-link);",
      "background:var(--header-button);",
      "color:var(--on-header-button);"
    ]) {
      expect(bar, use).toContain(use);
    }
    expect(read("single-column-m3.css")).toMatch(/\.tab-menu-btn\{[^}]*color:var\(--tab-text\);/);
  });

  it("borders the header's Search field and the Search tab's field as a poll card is bordered", () => {
    expect(read("pollCard.css")).toMatch(/\.card-face\{[^}]*border:1px solid var\(--line\);/);
    expect(read("header-tab-bar-m3.css")).toMatch(/\.header-search,\s*\.header-search:focus-within\{[^}]*border:1px solid var\(--line\);/);
    expect(read("single-column-m3.css")).toMatch(/\.search-tab-form\{[^}]*border:1px solid var\(--line\);/);
  });

  it("fills the header's Search field and the Search tab's field from one token, in both schemes", () => {
    expect(read("header-tab-bar-m3.css")).toMatch(/\.header-search,\s*\.header-search:focus-within\{[^}]*background:var\(--search-field-background\);/);
    expect(read("single-column-m3.css")).toMatch(/\.search-tab-form\{[^}]*background:var\(--search-field-background\);/);
    expect(read("m3-tokens.css").match(/--search-field-background:/g)).toHaveLength(2);
    expect(read("m3-tokens.css")).not.toContain("--header-search-background");
  });

  it("fills the filled icon buttons (Refresh, back arrow, phone vote bar) from one token, CrowdPoll green 30% in Light", () => {
    const tokens = read("m3-tokens.css");
    const block = (selector: string) => {
      const from = tokens.indexOf(`${selector}{`);
      return tokens.slice(from, tokens.indexOf("\n}", from));
    };
    expect(block(':root:not([data-theme="dark"])')).toContain("--icon-button-background:var(--crowdpoll-green-30-percent);");
    expect(block(':root[data-theme="dark"]')).toContain("--icon-button-background:var(--md-sys-color-secondary-container);");
    expect(read("back-arrow-m3.css")).toMatch(/\.back-arrow\{[^}]*background:var\(--icon-button-background\);/);
    expect(read("phone-card-m3.css")).toMatch(/\.vote-bar \.icon-btn\{[^}]*background:var\(--icon-button-background\);/);
    // The M3 role is its own token: chips, tonal buttons and pressed segments keep it.
    expect(tokens).toContain("--md-sys-color-secondary-container:var(--crowdpoll-green-20-percent);");
  });

  it("rounds the Search tab's field fully, as the header's Search field is, with the same padding around its magnifier", () => {
    const tab = /\.search-tab-form\{([^}]*)\}/.exec(read("single-column-m3.css"))![1]!;
    const header = /\.header-search,\s*\.header-search:focus-within\{([^}]*)\}/.exec(read("header-tab-bar-m3.css"))![1]!;
    for (const declaration of ["border-radius:var(--md-sys-shape-corner-full);", "padding:0 16px 0 8px;", "gap:4px;"]) {
      expect(tab, declaration).toContain(declaration);
      expect(header, declaration).toContain(declaration);
    }
    expect(read("phone-m3.css")).toMatch(/\.search-tab-form \.search-icon-btn,\s*\.search-tab-form \.header-search-clear\{ width:48px; height:48px; \}/);
  });

  it("paints the header's two horizontal glows across the header and the Tab Bar from tokens, colour and strength set per scheme", () => {
    const tokens = read("m3-tokens.css");
    const scheme = (selector: string) => {
      const start = tokens.indexOf(`${selector}{`);
      return tokens.slice(start, tokens.indexOf("}", start));
    };
    for (const selector of [':root:not([data-theme="dark"])', ':root[data-theme="dark"]']) {
      for (const name of ["left-color", "left-strength", "right-color", "right-strength"]) {
        expect(scheme(selector), `${selector} --header-glow-${name}`).toMatch(new RegExp(`--header-glow-${name}:[^;]+;`));
      }
    }
    for (const name of ["left-at", "left-size", "right-at", "right-size"]) {
      expect(tokens, `--header-glow-${name}`).toMatch(new RegExp(`--header-glow-${name}:[^;]+;`));
    }
    const sheet = read("header-fixed-m3.css");
    const layer = sheet.slice(sheet.indexOf("#site-header::before{"), sheet.indexOf("}", sheet.indexOf("#site-header::before{")));
    expect(layer).toContain("position:fixed;");
    expect(layer).toContain("z-index:-1;");
    expect(layer).toContain("pointer-events:none;");
    expect(layer).toContain("background:var(--header-glows);");
    expect(sheet).toMatch(/\.tab-bar-wrap::after\{[^}]*z-index:-1;[^}]*var\(--header-glows\)/);
    expect(sheet).toMatch(/\.tab-bar-wrap::before\{[^}]*background:var\(--header-glows\), var\(--tab-bar-background\);/);
    for (const side of [["left", "right"], ["right", "left"]]) {
      const [glow, toward] = side;
      expect(tokens).toContain(
        `linear-gradient(to ${toward}, color-mix(in srgb, var(--header-glow-${glow}-color) var(--header-glow-${glow}-strength), transparent) var(--header-glow-${glow}-at), transparent calc(var(--header-glow-${glow}-at) + var(--header-glow-${glow}-size)))`
      );
    }
  });

  it("declares the type roles the admin cards read", () => {
    const tokens = read("m3-tokens.css");
    for (const role of ["title-medium", "label-medium", "label-small"]) {
      for (const property of ["size", "line-height", "weight", "tracking"]) {
        expect(tokens, `${role}-${property}`).toContain(`--md-sys-typescale-${role}-${property}:`);
      }
    }
    expect(read("admin-card-m3.css")).not.toContain("--md-sys-typescale-title-medium-size:");
  });

  it("draws the chosen radio button's dot: no doubled pseudo-selector drops the rule", () => {
    const css = read("admin-card-m3.css");
    expect(css).not.toMatch(/::(before|after)::|::(before|after):|:checked:checked|:focus-visible:focus-visible/);
    expect(css).toContain(".poll-admin-card .m3-radio::before{");
    expect(css).toContain(".poll-admin-card .m3-radio:checked::before{ transform:scale(1); }");
  });

  it("rules the Settings Summary under the Public/Private paragraph as it is ruled above it", () => {
    const css = read("admin-card-m3.css");
    const selector = ".poll-admin-card .wizard-summary-who + .wizard-summary-text:not(.wizard-summary-invitation-message),\n" +
      ".poll-admin-card .wizard-summary-invitation-message + .wizard-summary-text{";
    const start = css.indexOf(selector);
    expect(start).toBeGreaterThan(-1);
    const body = css.slice(start + selector.length, css.indexOf("}", start));
    for (const declaration of ["margin-top:8px;", "padding-top:8px;", "border-top:1px solid var(--md-sys-color-outline-variant);"]) {
      expect(body).toContain(declaration);
    }
  });

  it("draws the Settings Summary's Copy poll link as a 20px Label Medium pill, right-aligned under the sharing sentence (TWEAK04)", () => {
    const css = read("admin-card-m3.css");
    const rule = /\.poll-admin-card \.wizard-summary-copy-link\{([^}]*)\}/.exec(css);
    expect(rule).not.toBeNull();
    const body = rule![1];
    expect(body).toContain("height:20px;");
    expect(body).toContain("padding:0 8px;");
    // A line of its own, at the right.
    expect(body).toContain("display:block;");
    expect(body).toContain("width:fit-content;");
    expect(body).toContain("margin:4px 0 0 auto;");
    // Outlined like the state buttons (Open, Close, Archive).
    expect(body).toContain("border:1px solid var(--md-sys-color-outline);");
    for (const property of ["size", "weight", "line-height", "tracking"]) {
      expect(body, property).toContain(`var(--md-sys-typescale-label-medium-${property})`);
    }
    expect(body).not.toMatch(/font-size:\s*\d/);
  });

  it("lifts the snackbar above the cookie banner, in its own sheet", () => {
    expect(read("snackbar-m3.css")).toContain("bottom:calc(16px + var(--cookie-banner-offset, 0px));");
    expect(read("snackbar-m3.css")).toMatch(/\.m3-snackbar--top\{\s*top:16px;\s*bottom:auto;/);
    expect(read("admin-card-m3.css")).not.toContain(".m3-snackbar");
  });

  it("sizes, colours and drains the timed snackbar's hourglass by the notice's own timer", () => {
    const css = read("snackbar-m3.css");
    expect(css).toMatch(/\.m3-snackbar--timed\{[^}]*padding-block:8px;/);
    expect(css).toMatch(/\.m3-snackbar-text\{[^}]*flex:1 1 auto;[^}]*min-width:0;[^}]*overflow-wrap:anywhere;/);
    expect(css).toMatch(/\.m3-snackbar-hourglass\{[^}]*flex:none;[^}]*width:22px;[^}]*height:32px;[^}]*margin-inline-start:12px;/);
    expect(css).toMatch(/\.hourglass-frame\{[^}]*stroke:var\(--md-sys-color-inverse-on-surface\);/);
    expect(css).toMatch(/\.hourglass-part\{[^}]*fill:var\(--md-sys-color-inverse-primary\);/);
    const timed = css.match(/\.m3-snackbar--timed \.hourglass-part\{[^}]*\}/)?.[0] ?? "";
    expect(timed).toContain("transform-box:fill-box;");
    expect(timed).toContain("animation-duration:var(--m3-snackbar-timer);");
    expect(timed).toContain("animation-timing-function:linear;");
    expect(timed).toContain("animation-fill-mode:forwards;");
    const selectors = css.replace(/\/\*[\s\S]*?\*\//g, "").match(/[^{}]+(?=\{)/g) ?? [];
    expect(selectors.filter((s) => s.includes("is-shown") && s.includes("hourglass"))).toEqual([]);
    const reducedMotion = css.match(/@media \(prefers-reduced-motion: reduce\)\{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(reducedMotion).toContain(".m3-snackbar--timed .hourglass-part{ animation:none; }");
  });

  it("scales the card title between 18px and Title Large's 20px", () => {
    expect(read("pollCard-m3.css")).toContain("font-size:clamp(18px, 1.8vw, var(--md-sys-typescale-title-large-size));");
    expect(read("m3-tokens.css")).toContain("--md-sys-typescale-title-large-size:20px;");
  });

  it("holds only M3 tokens in the line graph sheet", () => {
    const css = read("line-graph-m3.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
    expect(css).not.toMatch(/\b(rgba?|hsla?)\(/);
    for (const [, value] of css.matchAll(/font-size:\s*([^;}]+)/g)) expect(value!.trim()).toMatch(/^var\(--md-sys-typescale-/);
    expect(css).not.toMatch(/\b(transition|animation)\s*:/);
    const line = css.match(/\.line-graph-line\{[^}]*\}/)![0].replace(/\s+/g, "");
    expect(line).toContain("stroke-linejoin:round;");
    expect(line).toContain("stroke-linecap:round;");
  });

  it("lays the line graph legend out as a table of 18px rows under a tight title block", () => {
    const css = read("line-graph-m3.css").replace(/\s+/g, "");
    expect(css.match(/\.line-graph\{[^}]*\}/)![0]).toContain("gap:4px;");
    expect(css.match(/\.line-graph-subtitle\{[^}]*\}/)![0]).toContain("margin:-4px00;");
    expect(css.match(/\.line-graph-plot\{[^}]*\}/)![0]).toContain("margin-top:8px;");
    const controls = css.match(/\.line-graph-controls\{[^}]*\}/)![0];
    expect(controls).toContain("margin-top:8px;");
    expect(controls).toContain("display:flex;");
    expect(css.match(/\.line-graph-show-all\{[^}]*\}/)![0]).toContain("margin:0;");
    expect(css.match(/\.line-graph-controls-start\{[^}]*\}/)![0]).toContain("flex:110;");
    expect(css.match(/\.line-graph-controls::after\{[^}]*\}/)![0]).toContain("flex:110;");
    const legend = css.match(/\.line-graph-legend\{[^}]*\}/)![0];
    expect(legend).toContain("display:grid;");
    expect(legend).toContain("grid-auto-flow:column;");
    expect(legend).toContain("grid-template-rows:repeat(var(--line-graph-legend-rows,1),auto);");
    expect(legend).toContain("grid-auto-columns:minmax(0,max-content);");
    expect(legend).toContain("column-gap:4px;");
    expect(css.match(/\.line-graph-legend\.is-measuring\{[^}]*\}/)![0]).toContain("grid-auto-columns:max-content;");
    const entry = css.match(/\.line-graph-legend-entry\{[^}]*\}/)![0];
    expect(entry).toContain("min-height:18px;");
    expect(entry).toContain("padding:0px2px;");
  });

  it("sets the line graph legend in the axis labels' size and outlines the show-all button", () => {
    const css = read("line-graph-m3.css").replace(/\s+/g, "");
    const legend = css.match(/\.line-graph-legend\{[^}]*\}/)![0];
    const axis = css.match(/\.line-graph-svgtext\{[^}]*\}/)![0];
    expect(legend).toContain("font-size:var(--md-sys-typescale-label-small-size);");
    expect(axis).toContain("font-size:var(--md-sys-typescale-label-small-size);");
    const showAll = css.match(/\.line-graph-show-all\{[^}]*\}/)![0];
    expect(showAll).toContain("border:1pxsolidvar(--md-sys-color-outline);");
    expect(showAll).toContain("font-size:var(--md-sys-typescale-label-small-size);");
    expect(showAll).toContain("height:24px;");
    expect(css.match(/\.line-graph-subtitle\{[^}]*\}/)![0]).toContain("font-size:var(--md-sys-typescale-label-small-size);");
  });

  it("sizes the line graph scale buttons as the show-all button and the legend dots at 9px", () => {
    const css = read("line-graph-m3.css").replace(/\s+/g, "");
    const segment = css.match(/\.line-graph-segment\{[^}]*\}/)![0];
    expect(segment).toContain("height:24px;");
    expect(segment).toContain("padding:012px;");
    expect(segment).toContain("font-size:var(--md-sys-typescale-label-small-size);");
    const dot = css.match(/\.line-graph-dot\{[^}]*\}/)![0];
    expect(dot).toContain("width:9px;");
    expect(dot).toContain("height:9px;");
  });

  it("sets the line graph title as the maximized card's title", () => {
    const css = read("line-graph-m3.css").replace(/\s+/g, "");
    const title = css.match(/\.line-graph-title\{[^}]*\}/)![0];
    expect(title).toContain("font-size:var(--md-sys-typescale-title-large-size);");
    expect(title).toContain("line-height:var(--md-sys-typescale-title-large-line-height);");
    expect(title).toContain("font-weight:var(--md-sys-typescale-title-large-weight);");
    expect(title).toContain("overflow-wrap:anywhere;");
  });

  it("lets a maximized card be only as tall as its bars need", () => {
    expect(read("pollCard-m3.css")).toContain(".maximized-card-flip{ min-height:0; }");
  });

  it("stretches the blank panel beside a maximized card to the card's height", () => {
    const rule = read("pollCard-m3.css").match(/\.maximized-space-right\{[^}]*\}/)![0];
    expect(rule).toContain("border:1px solid var(--md-sys-color-outline-variant);");
    expect(rule).toContain("align-self:stretch;");
  });

  it("pulses the Maximize button and shows its label while a pointer is over a grid card", () => {
    const css = read("pollCard-m3.css").replace(/\s+/g, " ");
    expect(css).toContain(".maximize-hint{ display:none; }");
    const hover = css.slice(css.indexOf("@media (hover:hover){"));
    expect(hover).toContain(".card-flip:not(.maximized-card-flip) .card-face:hover .maximize-btn{ color:var(--md-sys-color-primary); animation:maximize-pulse 1.8s ease-out infinite; }");
    expect(hover).toContain(".card-flip:not(.maximized-card-flip) .card-face:hover .maximize-hint{ display:block; position:absolute; top:-14px; translate:0 -100%; right:calc(var(--title-icon-size) / 2 - 22px);");
    expect(css).toContain(".maximize-hint::after{ content:''; position:absolute; top:100%; right:11px; border:5px solid transparent; border-top-color:var(--md-sys-color-inverse-surface); }");
    expect(hover).toContain(".card-flip:not(.maximized-card-flip) .card-face .maximize-btn:hover + .maximize-hint{ display:none; }");
    expect(css).toContain("@keyframes maximize-pulse{");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\{ \.card-flip:not\(\.maximized-card-flip\) \.card-face:hover \.maximize-btn\{ animation:none; box-shadow:/);
  });

  it("pulses every grid card's Maximize button on a touch phone until the first maximize on the page", () => {
    const css = read("pollCard-m3.css").replace(/\s+/g, " ");
    const selector = ":root:not(.maximize-hint-dismissed) .card-flip:not(.maximized-card-flip) .card-face .maximize-btn";
    expect(css).toContain(`@media (max-width: 640px) and (hover: none){ ${selector}{ color:var(--md-sys-color-primary); animation:maximize-pulse 1.8s ease-out infinite; } }`);
    expect(css).toContain(`@media (max-width: 640px) and (hover: none) and (prefers-reduced-motion: reduce){ ${selector}{ animation:none; box-shadow:`);
  });

  it("draws Title Large semi-bold, at a weight every page loads", () => {
    expect(read("m3-tokens.css")).toContain("--md-sys-typescale-title-large-weight:600;");
    expect(read("pollCard-m3.css")).toContain("font-weight:var(--md-sys-typescale-title-large-weight);");
  });

  it("wraps the card title around the Share, Watch and Maximize icons, shortening only its first line", () => {
    const css = read("pollCard-m3.css").replace(/\s+/g, " ");
    expect(css).toContain(".card-face .question-row{ --title-icon-size:32px; display:block; position:relative; }");
    expect(css).toContain(".card-face .question-row .bookmark-btn, .card-face .question-row .share-btn, .card-face .question-row .maximize-btn{ position:absolute; top:0;");
    expect(css).toContain(".card-face .question-row .maximize-btn{ right:0; }");
    expect(css).toContain(".card-face .question-row .bookmark-btn, .card-face .question-row .share-btn{ right:calc(var(--title-icon-size) - 4px); }");
    expect(css).toContain(".card-face .question-row.has-bookmark .share-btn{ right:calc(2 * var(--title-icon-size) - 8px); }");
    // 1lh (Chromium 109) follows a fallback of one title line, and the two-icon width keys on a class
    // the card sets, not :has() (Chromium 105): Opera 83 (Chromium 97) ran titles under the icons.
    expect(css).toContain(".card-face .question-row .question::before{ content:''; float:right; width:calc(var(--title-icon-size) + 2px); height:1.27em;");
    expect(css).toContain("height:1lh; }");
    expect(css).toContain(".card-face .question-row.has-bookmark .question::before, .card-face .question-row.has-share .question::before{ width:calc(2 * var(--title-icon-size) + 4px); }");
    expect(css).toContain(".card-face .question-row.has-bookmark.has-share .question::before{ width:calc(3 * var(--title-icon-size) - 4px); }");
  });

  it("closes the card's title section with a 2px rule from edge to edge, matching the face's side padding", () => {
    const css = read("pollCard-m3.css").replace(/\s+/g, " ");
    expect(css).toContain(".card-viewport:not(.card-shell-viewport) .card-face .question-wrap{ margin:0 -22px 12px; padding:0 22px 8px; border-bottom:2px solid var(--line); }");
    const face = /\.card-face\s*\{([^}]*)\}/.exec(read("pollCard.css"))![1]!;
    expect(face).toMatch(/padding:\s*18px 22px 16px;/);
    expect(read("phone-card-m3.css")).not.toContain(".question-wrap");
  });

  it("keeps the poll-card title hover off the card-shell pages", () => {
    const selectors = read("site.css").match(/\.card-viewport:not\(\.maximized-card-viewport\)[^,{]*/g) ?? [];
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(selector).toContain(":not(.card-shell-viewport)");
  });

  it("has no Tab Bar on the eleven pages other than the home page, so the fixed-chrome sheet's .tab-bar-wrap rule never applies there", () => {
    for (const file of Object.keys(PAGES)) {
      if (file === "index.html") continue;
      expect(read(file), file).not.toContain("tab-bar-wrap");
    }
  });
});
