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
  "tabs-modal-m3.css",
  "live-idle-prompt-m3.css",
  "empty-tab-line-m3.css",
  "discard-dialog-m3.css",
  "pollCard-m3.css",
  "card-shell-m3.css",
  "profile-editor-m3.css",
  "admin-card-m3.css",
  "admin-search-m3.css",
  "single-column-m3.css",
  "tab-bar-scroll-arrows-m3.css",
  "legal-m3.css",
  "footer-m3.css",
  "line-graph-m3.css"
];

interface PageAssets {
  sheets: string[];
  scripts: string[];
  layers: string[];
}

const PAGES: Record<string, PageAssets> = {
  "index.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "pollCard.js", "voteClient.js", "deltaClient.js", "lineGraph.js", "tabs.js", "trending.js", "newest.js", "searchTab.js", "liveResults.js", "tabBarScroll.js", "tabBarScrollArrows.js", "floatingActions.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "tabs-modal-m3.css", "live-idle-prompt-m3.css", "empty-tab-line-m3.css", "pollCard-m3.css", "single-column-m3.css", "tab-bar-scroll-arrows-m3.css", "footer-m3.css", "line-graph-m3.css"]
  },
  "profile.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "cardShell.js", "profileCard.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "card-shell-m3.css", "profile-editor-m3.css", "footer-m3.css"]
  },
  "login.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "cardShell.js", "loginCard.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "card-shell-m3.css", "footer-m3.css"]
  },
  "create-account.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "cardShell.js", "createAccountCard.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "card-shell-m3.css", "footer-m3.css"]
  },
  "confirm-signin.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "cardShell.js", "confirmSigninCard.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "card-shell-m3.css", "footer-m3.css"]
  },
  "invite.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "cardShell.js", "inviteCard.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "card-shell-m3.css", "footer-m3.css"]
  },
  "not-authorized.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "cardShell.js", "notAuthorizedCard.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "card-shell-m3.css", "footer-m3.css"]
  },
  "privacy.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "legal-m3.css", "footer-m3.css"]
  },
  "terms.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "legal-m3.css", "footer-m3.css"]
  },
  "accept-terms.html": {
    sheets: ["tabs.css", "pollCard.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "cardShell.js", "acceptTermsCard.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "card-shell-m3.css", "footer-m3.css"]
  },
  "admin.html": {
    sheets: ["styles.css", "tabs.css", "pollCard.css", "admin.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "adminCard.js", "adminList.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "tabs-modal-m3.css", "discard-dialog-m3.css", "admin-card-m3.css", "admin-search-m3.css", "footer-m3.css"]
  },
  "admin-results.html": {
    sheets: ["styles.css", "tabs.css", "pollCard.css", "admin.css", "site.css"],
    scripts: ["app.js", "headerFit.js", "fixedChrome.js", "adminResults.js", "backToTopFab.js"],
    layers: ["tooltip-m3.css", "header-tab-bar-m3.css", "header-single-column-m3.css", "header-single-row-m3.css", "header-fixed-m3.css", "back-to-top-m3.css", "footer-m3.css"]
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

/** The rules inside `@media (prefers-color-scheme: dark)`, written as their forced twins. */
function systemDarkRules(css: string): string[] {
  return [...css.matchAll(/@media \(prefers-color-scheme: dark\)\{/g)].map((m) => {
    const open = css.indexOf("{", m.index!);
    const inner = css.slice(open + 1, blockEnd(css, open) - 1);
    return normalise(inner.replaceAll(':root:not([data-theme="light"])', ':root[data-theme="dark"]'));
  });
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
  }

  it("follows the system colour scheme wherever a dark rule exists, with identical declarations", () => {
    const sheets = readdirSync(publicDir).filter((name) => name.endsWith(".css"));
    let darkSheets = 0;
    for (const name of sheets) {
      const forced = forcedDarkRules(read(name));
      const system = systemDarkRules(read(name));
      if (forced.length > 0) darkSheets++;
      expect(system, name).toEqual(forced);
    }
    expect(darkSheets).toBeGreaterThanOrEqual(4);
  });

  it("keeps the admin pages light, and only them", () => {
    for (const file of Object.keys(PAGES)) {
      const html = read(file);
      const light = file.startsWith("admin");
      expect(html.includes('<html lang="en" data-theme="light">'), file).toBe(light);
      expect(html.includes("data-theme"), file).toBe(light);
    }
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

  it("scales the card title between 18px and Title Large's 20px", () => {
    expect(read("pollCard-m3.css")).toContain("font-size:clamp(18px, 1.8vw, var(--md-sys-typescale-title-large-size));");
    expect(read("m3-tokens.css")).toContain("--md-sys-typescale-title-large-size:20px;");
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
    expect(css).toContain(`@media (max-width: 639.98px) and (hover: none){ ${selector}{ color:var(--md-sys-color-primary); animation:maximize-pulse 1.8s ease-out infinite; } }`);
    expect(css).toContain(`@media (max-width: 639.98px) and (hover: none) and (prefers-reduced-motion: reduce){ ${selector}{ animation:none; box-shadow:`);
  });

  it("draws Title Large semi-bold, at a weight every page loads", () => {
    expect(read("m3-tokens.css")).toContain("--md-sys-typescale-title-large-weight:600;");
    expect(read("pollCard-m3.css")).toContain("font-weight:var(--md-sys-typescale-title-large-weight);");
  });

  it("wraps the card title around the Watch and Maximize icons, shortening only its first line", () => {
    const css = read("pollCard-m3.css").replace(/\s+/g, " ");
    expect(css).toContain(".card-face .question-row{ --title-icon-size:32px; display:block; position:relative; }");
    expect(css).toContain(".card-face .question-row .bookmark-btn, .card-face .question-row .maximize-btn{ position:absolute; top:0;");
    expect(css).toContain(".card-face .question-row .maximize-btn{ right:0; }");
    expect(css).toContain(".card-face .question-row .bookmark-btn{ right:calc(var(--title-icon-size) - 4px); }");
    expect(css).toContain(".card-face .question-row .question::before{ content:''; float:right; width:calc(var(--title-icon-size) + 2px); height:1lh; }");
    expect(css).toContain(".card-face .question-row:has(.bookmark-btn:not([hidden])) .question::before{ width:calc(2 * var(--title-icon-size) + 4px); }");
  });

  it("keeps the poll-card title hover off the card-shell pages", () => {
    const selectors = read("site.css").match(/\.card-viewport:not\(\.maximized-card-viewport\)[^,{]*/g) ?? [];
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(selector).toContain(":not(.card-shell-viewport)");
  });

  it("has no Tab Bar on the six pages other than the home page, so the fixed-chrome sheet's .tab-bar-wrap rule never applies there", () => {
    for (const file of Object.keys(PAGES)) {
      if (file === "index.html") continue;
      expect(read(file), file).not.toContain("tab-bar-wrap");
    }
  });
});
