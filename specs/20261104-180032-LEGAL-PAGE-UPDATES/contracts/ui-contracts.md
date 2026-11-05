# UI Contracts: Legal Page Updates

No HTTP route, request or response changes; `postman/openapi.json` is unchanged.

## C1. The Bot and AI Agent Detection section (`/privacy`)

- `<section id="bot-check" aria-labelledby="bot-check-title">` keeps its ids (FR-007).
- `<h3 id="bot-check-title">Bot and AI Agent Detection</h3>`.
- First paragraph: "Before a sign-in starts, on the Login, Create Account and invitation pages, you tick a box that checks you are not a bot or an AI agent."
- List items, in order, each `<li><strong>Label</strong>: text</li>`:
  - **What it measures**: unchanged.
  - **Why**: "to prevent bots and AI agents from creating accounts, sending sign-in emails, and voting on polls."
  - **Where**, **How long**, **Cookies**: unchanged.
- "In short": `<li>Before you sign in, a quick <a href="#bot-check">check</a> on our own servers detects bots and AI agents. It sets no cookie.</li>`.
- Retention table: `<tr><td>Bot and AI agent detection measurements</td><td>in memory, one hour at most</td></tr>`.
- The words "Bot check" appear nowhere on the page (SC-001).
- `humanCheck.js`'s link stays `/privacy#bot-check`, "What this safeguard checks.".

## C2. The version line (`/privacy`, `/terms`)

- Both pages: `Version <TERMS_VERSION>`; `TERMS_VERSION` is the release date (research R8).
- `/privacy`: `Last updated <release date, D Month YYYY>`; `/terms`: `Last updated 22 October 2026`, unchanged.

## C3. The Back arrow (`/privacy`, `/terms`)

- **Loaded by**: `backArrow.js` (deferred, after `fixedChrome.js`) and `back-arrow-m3.css` (an M3 layer after `back-to-top-m3.css` in `LAYER_ORDER`), on both pages.
- **Shown** only when, at load, `document.referrer`'s origin is the page's own and `history.length > 1` (research R1); otherwise no element is added.
- **Markup**, inserted directly after `#site-header`:

  ```html
  <div class="back-arrow-bar">
    <button type="button" id="backArrow" class="back-arrow" aria-label="Back" title="Back">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
      </svg>
    </button>
  </div>
  ```

  `tooltip-m3.js` turns `title` into `data-tooltip`.
- **Press**: `history.go(-(legalDepth + 1))`, `legalDepth` from `history.state` (research R2, data-model).
- **Browser console**: nothing logged.

## C4. The Back arrow's look and place (`back-arrow-m3.css`)

- `.back-arrow`: 40 × 40 px, `border-radius:var(--md-sys-shape-corner-full)`, `background:var(--md-sys-color-secondary-container)`, `color:var(--md-sys-color-on-secondary-container)`, M3 hover/focus/pressed state layers, `:focus-visible` outline `3px solid var(--md-sys-color-secondary)` offset 2 px, SVG 26 px (research R5).
- `.back-arrow-bar`: `position:fixed; left:0; right:0; top:calc(var(--fixed-chrome-height,0px) + 12px); max-width:var(--max-width); margin:0 auto; padding-inline:20px` (`14px` below 640 px); `z-index:40; pointer-events:none`; its button `pointer-events:auto` (research R3).
- Holds only M3 tokens; no literal font size, no comment, no token section (as `back-to-top-sheet.test.ts` requires of its sheet).
- `admin.html`: loads `back-arrow-m3.css`; its link is `class="admin-back-link back-arrow"`; `admin.css` keeps only the link's placement.

## C5. The text gutter (`legal-m3.css`)

- `.legal-doc{ box-sizing:border-box; padding-inline-start:max(0px, calc(56px - (100% - 72ch) / 2)); }` beside its existing rules (research R4).

## C6. The Up arrow (`back-to-top-m3.css`, every page that has it)

- `right:20px;` is replaced by `left:0; right:0; margin-inline:auto;`; every other rule is unchanged (research R7).
