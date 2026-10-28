/**
 * Captures the read-only admin card that src/public/adminCard.js draws for one fixture poll
 * into a stand-alone page that opens from disk: admin-card.html, admin-card.css (the rules of
 * admin.html's stylesheets that the page uses), admin-card.js (ripple, tooltips, theme switch)
 * and the fonts those rules name.
 * Usage: npx tsx devScripts/capture-admin-card.ts <output folder> [--force]
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const PUBLIC_DIR = path.resolve("src/public");
const OUTPUT_FILES = ["admin-card.html", "admin-card.css", "admin-card.js"];
const ALWAYS_KEPT = /m3-ripple|tooltip/;
const DYNAMIC_PSEUDO = /::?(hover|focus-visible|focus-within|focus|active|visited|before|after|placeholder|marker|selection|backdrop|-webkit-[a-z-]+|-moz-[a-z-]+)(\([^)]*\))?/g;
const THEMES = ["light", "dark", null] as const;
const FIXTURE_LOCALE = "en-US";

const RIPPLE_SELECTORS = [
  ".poll-admin-card .admin-state-btn",
  ".poll-admin-card .admin-icon-btn",
  ".poll-admin-card .actions-menu-trigger",
  ".actions-menu a",
  ".actions-menu button"
];

const at = (y: number, m: number, d: number, h: number, min: number, s = 0) =>
  new Date(y, m - 1, d, h, min, s).toISOString();

const fixturePoll = {
  pid: "3f6c2a9e-4b1d-4e8a-9c7f-1a2b3c4d5e6f",
  title: "When do you want to meet?",
  subtitle: "November Birthdays",
  keywords: "",
  pollState: "OPEN",
  pollStateBeforeEditUpdate: null,
  createdAt: at(2026, 10, 26, 8, 6, 11),
  createdByName: "David Brooks",
  createdByEmail: "roadraceresults@gmail.com",
  launchedAt: at(2026, 10, 26, 8, 7, 53),
  startAt: null,
  endAt: at(2026, 11, 13, 8, 7),
  pollRejectionReason: null,
  pollApprovalTimestamp: null,
  pollAcceptabilityScreeningAttempts: 0,
  hasEverBeenVotedOn: false,
  pollVisibility: "Private Poll",
  pollSharingMode: "Invitation Only",
  voteAnonymity: "No",
  choices: [
    { id: "c1", label: "Nov 14", position: 0 },
    { id: "c2", label: "Nov 21", position: 1 }
  ],
  choiceMode: "Multiple-Choice Poll",
  voteMutability: "Dynamic-Vote Poll",
  voterCountLimit: null,
  voteCount: 0,
  invitationCount: 0,
  bannedVoterCount: 0,
  canEdit: true,
  canUpdate: false,
  canOpen: false,
  canClose: true,
  canArchive: false,
  canDelete: false,
  canRescreen: false
};

function linkedStylesheets(adminHtml: string): string[] {
  return [...adminHtml.matchAll(/<link rel="stylesheet" href="\/([^"]+)">/g)].map((m) => m[1]);
}

function iconSprite(adminHtml: string): string {
  const sprite = adminHtml.match(/<svg width="0" height="0"[\s\S]*?<\/svg>/);
  if (!sprite) throw new Error("admin.html has no icon sprite");
  return sprite[0];
}

function renderCard(): string {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { runScripts: "outside-only" });
  dom.window.eval(`for (const name of ["toLocaleString", "toLocaleDateString", "toLocaleTimeString"]) {
    const format = Date.prototype[name];
    Date.prototype[name] = function (locale, options) { return format.call(this, locale || "${FIXTURE_LOCALE}", options); };
  }`);
  dom.window.eval(readFileSync(path.join(PUBLIC_DIR, "adminCard.js"), "utf8"));
  const noop = () => {};
  const controller = (dom.window as unknown as { AdminCard: { create: Function } }).AdminCard.create(fixturePoll, {
    now: () => Date.parse(at(2026, 10, 26, 8, 30)),
    isLatched: () => false,
    origin: "https://crowdpoll.vote",
    onDuplicate: noop, onCopyLink: noop, onRescreen: noop, onArchive: noop, onDelete: noop, onState: noop,
    onMenuToggle: noop, onEditStart: noop, onEditEnd: noop, refresh: noop
  });
  return indentBlocks(controller.element.outerHTML, "            ");
}

function indentBlocks(html: string, baseIndent: string): string {
  const BLOCK_TAG = /<(\/?)(article|div|p|h[1-6]|ul|ol|li|section)\b[^>]*>/g;
  let depth = 0;
  let out = "";
  let last = 0;
  let previousOpened = false;
  for (const match of html.matchAll(BLOCK_TAG)) {
    const closing = match[1] === "/";
    const before = html.slice(last, match.index);
    if (closing) depth--;
    const emptyElement = closing && previousOpened;
    out += before === "" && out !== "" && !emptyElement ? "\n" + baseIndent + "  ".repeat(depth) : before;
    out += match[0];
    if (!closing) depth++;
    previousOpened = !closing && before === "";
    last = match.index! + match[0].length;
  }
  return out + html.slice(last);
}

function pageHtml(sprite: string, cardHtml: string): string {
  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Admin Poll Card</title>
  <link rel="stylesheet" href="admin-card.css">
</head>
<body>
  ${sprite}
  <div class="canvas-bar">
    <button type="button" class="canvas-theme-btn" data-theme-choice="light" aria-pressed="true">Light</button>
    <button type="button" class="canvas-theme-btn" data-theme-choice="dark" aria-pressed="false">Dark</button>
  </div>
  <div class="page-decor"></div>
  <div class="page">
    <div class="container">
      <div class="layout">
        <main>
          <div class="admin-card-list" id="pollList">
            ${cardHtml}
          </div>
        </main>
      </div>
    </div>
  </div>
  <script src="admin-card.js"></script>
</body>
</html>
`;
}

type Block = { prelude: string; body: string | null };

function splitBlocks(css: string): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  let start = 0;
  while (i < css.length) {
    const ch = css[i];
    if (ch === '"' || ch === "'") {
      i = css.indexOf(ch, i + 1) + 1;
      continue;
    }
    if (ch === ";" && css.slice(start, i).trim().startsWith("@")) {
      blocks.push({ prelude: css.slice(start, i).trim(), body: null });
      start = ++i;
      continue;
    }
    if (ch === "{") {
      let depth = 1;
      let j = i + 1;
      while (depth > 0 && j < css.length) {
        if (css[j] === '"' || css[j] === "'") j = css.indexOf(css[j], j + 1);
        else if (css[j] === "{") depth++;
        else if (css[j] === "}") depth--;
        j++;
      }
      blocks.push({ prelude: css.slice(start, i).trim(), body: css.slice(i + 1, j - 1) });
      start = i = j;
      continue;
    }
    i++;
  }
  return blocks;
}

function selectorMatches(doc: Document, selector: string): boolean {
  if (ALWAYS_KEPT.test(selector)) return true;
  const stripped = selector.replace(DYNAMIC_PSEUDO, "").trim() || "*";
  try {
    return doc.querySelector(stripped) !== null;
  } catch {
    return true;
  }
}

function splitSelectorList(prelude: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < prelude.length; i++) {
    if (prelude[i] === "(") depth++;
    else if (prelude[i] === ")") depth--;
    else if (prelude[i] === "," && depth === 0) {
      parts.push(prelude.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(prelude.slice(start).trim());
  return parts;
}

function keptRules(css: string, docs: Document[], fontFaces: string[]): string {
  const out: string[] = [];
  for (const block of splitBlocks(css)) {
    if (block.body === null) continue;
    if (block.prelude.startsWith("@font-face")) {
      fontFaces.push(`@font-face{${block.body}}`);
      continue;
    }
    if (/^@(media|supports|layer|container)/.test(block.prelude)) {
      const inner = keptRules(block.body, docs, fontFaces);
      if (inner) out.push(`${block.prelude} {\n${inner}\n}`);
      continue;
    }
    if (block.prelude.startsWith("@")) {
      out.push(`${block.prelude} {${block.body}}`);
      continue;
    }
    const used = splitSelectorList(block.prelude).filter((s) => docs.some((d) => selectorMatches(d, s)));
    if (used.length) out.push(`${used.join(",\n")} {${block.body}}`);
  }
  return out.join("\n");
}

function documentsFor(html: string): Document[] {
  return THEMES.map((theme) => {
    const doc = new JSDOM(html).window.document;
    if (theme) doc.documentElement.setAttribute("data-theme", theme);
    else doc.documentElement.removeAttribute("data-theme");
    return doc;
  });
}

function usedFontFaces(fontFaces: string[], css: string): { rules: string[]; files: string[] } {
  const rules: string[] = [];
  const files: string[] = [];
  for (const face of fontFaces) {
    const family = face.match(/font-family:\s*['"]?([^;'"]+)/)?.[1];
    if (!family || !css.includes(family)) continue;
    rules.push(face.replace(/url\("\/fonts\/([^"]+)"\)/g, (_m, file: string) => {
      files.push(file);
      return `url("fonts/${file}")`;
    }));
  }
  return { rules, files };
}

const CANVAS_CSS = `
.canvas-bar { position:sticky; top:0; z-index:10; display:flex; gap:8px; justify-content:center; padding:12px 16px;
  background:var(--md-sys-color-surface-container); border-bottom:1px solid var(--md-sys-color-outline-variant); }
.canvas-theme-btn { font:inherit; padding:6px 16px; border-radius:999px; cursor:pointer;
  border:1px solid var(--md-sys-color-outline); background:transparent; color:var(--md-sys-color-on-surface); }
.canvas-theme-btn[aria-pressed="true"] { background:var(--md-sys-color-secondary-container);
  color:var(--md-sys-color-on-secondary-container); }
`;

function canvasScript(): string {
  const ripple = readFileSync(path.join(PUBLIC_DIR, "m3-ripple.js"), "utf8");
  const tooltip = readFileSync(path.join(PUBLIC_DIR, "tooltip-m3.js"), "utf8");
  return `${ripple}
${tooltip}
(function () {
  "use strict";
  for (const selector of ${JSON.stringify(RIPPLE_SELECTORS)}) window.M3Ripple.add(selector);

  const themeButtons = document.querySelectorAll(".canvas-theme-btn");
  for (const button of themeButtons) {
    button.addEventListener("click", () => {
      document.documentElement.setAttribute("data-theme", button.dataset.themeChoice);
      for (const other of themeButtons) other.setAttribute("aria-pressed", String(other === button));
    });
  }

  for (const trigger of document.querySelectorAll(".actions-menu-trigger")) {
    const menu = trigger.nextElementSibling;
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      menu.hidden = !menu.hidden;
      trigger.setAttribute("aria-expanded", String(!menu.hidden));
    });
    document.addEventListener("click", () => {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    });
  }
})();
`;
}

function main() {
  const [outDirArg, ...flags] = process.argv.slice(2);
  if (!outDirArg) throw new Error("Usage: npx tsx devScripts/capture-admin-card.ts <output folder> [--force]");
  const outDir = path.resolve(process.env.INIT_CWD ?? process.cwd(), outDirArg);
  const existing = OUTPUT_FILES.filter((f) => existsSync(path.join(outDir, f)));
  if (existing.length && !flags.includes("--force")) {
    throw new Error(`Not overwriting ${existing.join(", ")} in ${outDir}; pass --force to replace them.`);
  }

  const adminHtml = readFileSync(path.join(PUBLIC_DIR, "admin.html"), "utf8");
  const html = pageHtml(iconSprite(adminHtml), renderCard());
  const docs = documentsFor(html);
  const fontFaces: string[] = [];
  const sections = linkedStylesheets(adminHtml).map((sheet) => {
    const css = readFileSync(path.join(PUBLIC_DIR, sheet), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const rules = keptRules(css, docs, fontFaces);
    return rules ? `/* ${sheet} */\n${rules}` : "";
  }).filter(Boolean);
  const body = sections.join("\n\n") + "\n\n/* stand-alone page */" + CANVAS_CSS;
  const fonts = usedFontFaces(fontFaces, body);

  mkdirSync(path.join(outDir, "fonts"), { recursive: true });
  for (const file of fonts.files) copyFileSync(path.join(PUBLIC_DIR, "fonts", file), path.join(outDir, "fonts", file));
  writeFileSync(path.join(outDir, "admin-card.html"), html);
  writeFileSync(path.join(outDir, "admin-card.css"), fonts.rules.join("\n") + "\n\n" + body);
  writeFileSync(path.join(outDir, "admin-card.js"), canvasScript());
  console.log(`Wrote admin-card.html, admin-card.css (${sections.length} sheets), admin-card.js and ${fonts.files.length} fonts to ${outDir}`);
}

main();
