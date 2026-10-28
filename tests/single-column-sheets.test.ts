import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicDir = path.resolve("src/public");
const read = (name: string) => readFileSync(path.join(publicDir, name), "utf8");
const PHONE_BLOCK = "@media (max-width: 639.98px){";
const TABLET_BLOCK = "@media (max-width: 900px){";

const home = read("single-column-m3.css");
const header = read("header-single-column-m3.css");

function blockEnd(css: string, open: number): number {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return i + 1;
  }
  throw new Error("unbalanced braces");
}

function split(css: string): { outside: string; inside: string } {
  const start = css.indexOf(PHONE_BLOCK);
  expect(start, "the phone block").toBeGreaterThanOrEqual(0);
  const open = css.indexOf("{", start);
  const end = blockEnd(css, open);
  let rest = css.slice(end).trim();
  while (rest.startsWith(TABLET_BLOCK)) rest = rest.slice(blockEnd(rest, rest.indexOf("{"))).trim();
  expect(rest, "only 900 px blocks may follow the phone block").toBe("");
  return { outside: css.slice(0, start), inside: css.slice(open + 1, end - 1) };
}

const flat = (css: string) => css.replace(/\s+/g, " ");

function tabletBlocks(css: string): string[] {
  const blocks: string[] = [];
  for (let start = css.indexOf(TABLET_BLOCK); start >= 0; start = css.indexOf(TABLET_BLOCK, start + 1)) {
    const open = css.indexOf("{", start);
    blocks.push(flat(css.slice(open + 1, blockEnd(css, open) - 1)));
  }
  return blocks;
}

function blockBody(css: string, marker: string): string {
  const start = css.lastIndexOf(marker);
  expect(start, marker).toBeGreaterThanOrEqual(0);
  const open = css.indexOf("{", start);
  return flat(css.slice(open + 1, blockEnd(css, open) - 1));
}

describe("the single-column sheets", () => {
  it("hold their layout rules in the phone block and outside it only hide the new controls and style the Search tab field", () => {
    const outsideHome = flat(split(home).outside).trim();
    expect(outsideHome.startsWith(".tab-menu-btn, .tab-menu, .tab-more, .floating-actions, .search-tab-form{ display:none; }")).toBe(true);
    const rest = outsideHome.slice(".tab-menu-btn, .tab-menu, .tab-more, .floating-actions, .search-tab-form{ display:none; }".length);
    const selectors = [...rest.matchAll(/([^{}]+)\{/g)].map((match) => match[1].trim());
    expect(selectors).toEqual([
      ".search-tab-form",
      ".search-tab-form input",
      ".search-tab-form input::placeholder",
      ".search-tab-form input::-webkit-search-cancel-button",
      'html[data-header-fit~="no-search"] .search-tab-form'
    ]);
    expect(rest).toContain('html[data-header-fit~="no-search"] .search-tab-form{ display:flex; }');
    expect(flat(split(home).inside)).toContain(".search-tab-form{ display:flex; }");
    expect(flat(split(header).outside).trim()).toBe(".avatar-menu-create-poll{ display:none; }");
  });

  it("set the marker the poll card reads, only in the home sheet and only in the phone block", () => {
    expect(flat(split(home).inside)).toContain(":root{ --single-column:1; }");
    expect(home.match(/--single-column/g)).toHaveLength(1);
    expect(header).not.toContain("--single-column");
  });

  it("carry no token section, dark twin, literal font size or comment", () => {
    for (const css of [home, header]) {
      expect(css).not.toContain("prefers-color-scheme");
      expect(css).not.toContain("data-theme");
      expect(css).not.toContain("/*");
      expect(css).not.toMatch(/font-size:\s*[0-9.]+(px|rem|em)/);
      expect(css).not.toMatch(/--md-sys-[a-z-]+:\s*[^;{]+;(?![^{]*\})/);
    }
  });
});

describe("the cards", () => {
  const inside = flat(split(home).inside);

  it("sit in one column 16 px apart", () => {
    expect(inside).toContain(":root{ --card-gap:16px; }");
    expect(inside).toContain(".card-grid{ gap:var(--card-gap); }");
  });

  it("show the vote count at the size of the Vote button's text", () => {
    const size = "font-size:calc(var(--md-sys-typescale-label-large-size) * 0.75);";
    expect(inside).toContain(`.card-face .poll-totals, .card-flip:not(.maximized-card-flip) .card-face .poll-voted{ ${size}`);
    expect(inside).toContain(`.card-face .btn-vote, .card-flip:not(.maximized-card-flip) .card-face .live-link{ height:21px; ${size}`);
  });

  it("shrink the room the title leaves for its icons to the 24 px buttons", () => {
    expect(inside).toContain(".card-flip:not(.maximized-card-flip) .card-face .question-row{ --title-icon-size:24px; }");
  });

  it("give the title the phone's size from 900 px down, on the grid card, the maximized card and both faces", () => {
    const blocks: string[] = [];
    for (let start = home.indexOf(TABLET_BLOCK); start >= 0; start = home.indexOf(TABLET_BLOCK, start + 1)) {
      const open = home.indexOf("{", start);
      blocks.push(flat(home.slice(open + 1, blockEnd(home, open) - 1)));
    }
    const rule = ".card-flip .card-face .question{ font-size:calc(clamp(18px, 1.8vw, var(--md-sys-typescale-title-large-size)) * 0.75); line-height:1.27; }";
    expect(blocks.filter((body) => body.includes(rule))).toHaveLength(1);
    expect(inside).not.toContain(".card-face .question{");
  });

  it("leave the maximized card at its own size", () => {
    const rules = inside.split("}").filter((rule) => rule.includes(".card-face") || rule.includes(".bar-scroll") || rule.includes(".results-list"));
    expect(rules.length).toBeGreaterThan(5);
    for (const rule of rules) expect(rule).toContain(":not(.maximized-card-flip)");
  });
});

describe("the tab bar", () => {
  const inside = flat(split(home).inside);
  const wide = blockBody(home, TABLET_BLOCK);

  it("holds the tab bar rules in one 900 px block, and none in the phone block", () => {
    for (const part of ["#tabBar", ".tab-bar-wrap", ".tab-menu", "--tab-label-scale", "--tab-label-tracking", "--tab-pad"]) {
      expect(inside, part).not.toContain(part);
    }
    expect(tabletBlocks(home).filter((body) => body.includes("#tabBar"))).toHaveLength(1);
    expect(wide).toContain(":root{ --tab-label-scale:0.9; }");
  });

  it("lays each tab out in a row, its 11 px label wrapped to its longest word, at least 48 px tall with a 16 px icon, behind a 32 px fade", () => {
    expect(wide).toContain(":root{ --tab-fade:32px; }");
    expect(wide).toContain("#tabBar .tab{ flex-direction:row; width:min-content; min-width:0; height:auto; min-height:48px; gap:2px; padding:0px 10px 2px 0px; white-space:normal; font-size:var(--md-sys-typescale-label-small-size); line-height:var(--md-sys-typescale-label-small-line-height); font-weight:var(--md-sys-typescale-label-small-weight); letter-spacing:var(--md-sys-typescale-label-small-tracking); text-align:left; }");
    expect(wide).toContain("#tabBar .tab.is-active::after{ left:0; right:10px; }");
    expect(wide).toMatch(/#tabBar\{[^}]*margin-left:0; scroll-padding:0 var\(--tab-fade\);/);
    expect(wide).toContain("#tabBar .tab .tab-icon{ width:16px; height:16px; }");
    expect(wide).toMatch(/#tabBar \.tab-more\{[^}]*display:inline-flex;[^}]*min-height:48px; gap:2px; padding:0px 10px 2px 0px;[^}]*font-size:var\(--md-sys-typescale-label-small-size\);/);
    expect(wide).toContain("#tabBar .tab-more .tab-icon{ width:16px; height:16px; }");
    expect(wide).toMatch(/#tabBar\{[^}]*scroll-padding:0 var\(--tab-fade\);/);
    for (const part of ["mask-image", "scroll-snap", "--tab-label-tracking", "--tab-pad"]) expect(wide, part).not.toContain(part);
    expect(wide).not.toMatch(/#tabBar \.tab\{[^}]*(height:56px|font-size:calc\()/);
  });

  it("scrolls smoothly, except while dragging and for a visitor who asks for reduced motion", () => {
    expect(wide).toMatch(/#tabBar\{[^}]*scroll-behavior:smooth;/);
    expect(wide).toContain("#tabBar.is-dragging{ cursor:grabbing; scroll-behavior:auto; }");
    expect(wide).toContain("@media (prefers-reduced-motion: reduce){ #tabBar{ scroll-behavior:auto; } }");
  });

  it("draws the highlight behind the menu button, slight on hover and stronger when pressed", () => {
    expect(wide).toContain("--tab-hover-opacity:0.08; --tab-press-opacity:0.2;");
    expect(wide).toMatch(/\.tab-menu-btn::before\{[^}]*width:32px; height:32px;[^}]*border-radius:50%;[^}]*opacity:0;/);
    expect(wide).toMatch(/@media \(hover:hover\)\{ \.tab-menu-btn:hover::before\{ opacity:var\(--tab-hover-opacity\); \} \}/);
    expect(wide).toContain(".tab-menu-btn:active::before{ opacity:var(--tab-press-opacity); }");
    expect(wide).toContain(".tab-menu-btn[aria-expanded=\"true\"]::before{ opacity:var(--tab-hover-opacity); }");
  });
});

describe("the Refresh row", () => {
  const wide = blockBody(home, TABLET_BLOCK);

  it("puts the button under the line, flush left, and makes room for it, from 900 px down", () => {
    expect(wide).toContain(":root{ --refresh-gap:0px; }");
    expect(wide).toContain(".tab-bar-wrap{ margin-bottom:calc(40px + var(--refresh-gap)); }");
    expect(wide).toContain(".tab-bar-wrap .tab-refresh--icon{ position:absolute; left:var(--tab-edge); top:calc(100% + 5px); width:30px; height:30px; }");
    expect(wide).toContain(".tab-bar-wrap .tab-refresh--icon svg{ width:20px; height:20px; }");
  });

  it("sets the buttons' edge to the card column's: the container's padding, or the centred 420 px card below 640 px", () => {
    expect(wide).toContain(":root{ --tab-edge:20px; }");
    expect(wide).toContain("@media (max-width: 639.98px){ :root{ --tab-edge:max(14px, calc((100% - 420px) / 2)); } }");
    expect(read("pollCard.css")).toMatch(/\.card-viewport\{[^}]*max-width:420px;[^}]*margin:0 auto;/);
    const container = read("tabs.css");
    expect(container).toMatch(/\.container\{[^}]*padding:32px 20px 60px;/);
    expect(container).toMatch(/@media \(max-width:639\.98px\)\{\s*\.container\{ padding:20px 14px 40px; \}/);
  });

  it("keeps the room on Live Results, where the menu button still sits in the row", () => {
    expect(wide).not.toContain("data-active");
  });

  it("puts the all-tabs button on the same row, flush right, and opens its menu from there", () => {
    expect(wide).toContain(".tab-menu-btn{ position:absolute; right:var(--tab-edge); top:100%; width:40px; height:40px; }");
    expect(wide).toMatch(/\.tab-menu\{[^}]*top:calc\(100% \+ 40px\);[^}]*right:var\(--tab-edge\);/);
  });

  it("keeps the menu and the row's variables out of the phone block", () => {
    const phone = flat(split(home).inside);
    for (const part of [".tab-menu", "--refresh-gap", "--tab-hover-opacity", "#tabBar{ flex", ".tab-bar-wrap"]) {
      expect(phone, part).not.toContain(part);
    }
  });

  it("draws the all-tabs icon as three dots before three lines", () => {
    const html = readFileSync(path.join(publicDir, "index.html"), "utf8");
    const icon = html.slice(html.indexOf('id="tabMenuBtn"'), html.indexOf('id="tabMenu"'));
    expect(icon.match(/<circle /g)).toHaveLength(3);
    expect(icon.match(/h18v2H9z/g)).toHaveLength(3);
    expect(icon.indexOf("<circle")).toBeLessThan(icon.indexOf("<path"));
  });
});

describe("the compact header", () => {
  const inside = flat(split(header).inside);

  it("sizes the banner and the sign-in buttons, adds 3 px above the banner and tightens the space under it", () => {
    expect(inside).toContain(".btn-header-ghost, .btn-header-primary{ height:24px; }");
    expect(inside).toContain(".site-header{ margin-bottom:8px; padding-top:3px; }");
    expect(inside).toContain(".brand-logo, .brand-wordmark{ height:24px; }");
  });

  it("sizes the sign-in buttons like a card's Vote button on a phone, 21 px and three quarters of its text", () => {
    expect(inside).toContain(
      ":is(.header-actions, .floating-actions) :is(.btn-header-ghost, .btn-header-primary){ height:21px; font-size:calc(var(--md-sys-typescale-label-large-size) * 0.75); }"
    );
  });

  it("hides the icon, the search box, the Create Poll link and the user name", () => {
    expect(inside).not.toContain(".brand-logo{ display:none; }");
    expect(inside).toContain(".header-nav, #header-username, .header-search{ display:none; }");
  });

  it("shows the avatar menu's Create Poll item, dimmed with a reason when it is disabled", () => {
    expect(inside).toContain(".avatar-menu-create-poll{ display:flex; }");
    expect(inside).toContain('.avatar-menu-create-poll[aria-disabled="true"]{');
    expect(inside).toContain(".avatar-menu-create-poll-reason{");
    expect(inside).toContain('.avatar-menu-create-poll[aria-disabled="true"] .avatar-menu-label{');
  });
});
