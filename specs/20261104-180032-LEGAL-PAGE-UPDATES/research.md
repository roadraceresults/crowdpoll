# Research: Legal Page Updates

All unknowns of the Technical Context are resolved here; nothing is left as NEEDS CLARIFICATION.
The requirements decisions (IN1, AM1–AM3, UA1–UA5, NC1) and the clarifications Q1–Q2 are inputs, not reopened.

## R1. When the Back arrow is shown

- **Decision**: shown when both hold, checked once at load:
  - `document.referrer` parses as a URL whose `origin` equals `location.origin`;
  - `history.length > 1`.
  Otherwise the button is never inserted, so it takes no space (FR-010, FR-011).
- **Rationale**:
  - The site sends no `Referrer-Policy`, so browsers apply `strict-origin-when-cross-origin`, which gives a same-origin page the full previous address ([MDN — Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy)).
  - The referrer is empty for a typed address, a bookmark, and a link opened from an email or another app (UA2).
  - A page opened in a new tab keeps a same-site referrer but starts a tab whose history holds one entry, so `history.length` is 1 (clarification Q1).
  - A reload keeps both the referrer and the history length, so the decision repeats (spec Edge Cases).
  - The `302` from `/privacy.html` to `/privacy` keeps the referrer.
- **Alternatives considered**:
  - The Navigation API (`navigation.entries()`, `canGoBack`) would answer exactly, but it is not in every supported browser, so it would need this check as a fallback anyway.
  - `sessionStorage` breadcrumbs written by every page: a new storage key with a Cookie Use row, and a change to every page, for no better answer (FR-018).

## R2. Going back past in-page anchor steps

- **Decision**: the page numbers its own history entries in `history.state`:
  - at load, `history.replaceState({ ...history.state, legalDepth: 0 }, "")` unless the entry already carries a number (a reload or a return);
  - on `popstate` and `hashchange`, an entry without a number gets the last known number plus one (`replaceState`), and an entry with one makes it the current number;
  - the button calls `history.go(-(legalDepth + 1))`.
- **Rationale**:
  - Every in-page link followed (`#cookies`, `#bot-check`) adds an entry; the browser's Back walks them one at a time, which FR-012 rules out for the arrow.
  - Numbering each entry when it is created, and reading the number back when the visitor moves with the browser's own Back and Forward, keeps the count right in both directions, with no listener on link clicks.
  - `history.state` lives with the tab's history entry: it is not a cookie or a storage key, other pages cannot read it, and it goes with the tab, so FR-018 and the Cookie Use list are unaffected.
  - The previous page comes back from the back-forward cache when the browser keeps it, so a human-check pass in its memory survives (spec Edge Cases) ([web.dev — bfcache](https://web.dev/articles/bfcache)).
- **Alternatives considered**:
  - Loading `document.referrer` (requirements AM2, Recommendation B, not accepted).
  - Intercepting anchor clicks to replace rather than push entries: simpler arithmetic (always `history.back()`), but it changes what the browser's own Back does on the policy, which nothing asked for.

## R3. Where the Back arrow sits

- **Decision**: a fixed wrapper built like the fixed header (`position:fixed; left:0; right:0; max-width:var(--max-width); margin:0 auto; padding-inline:20px`, `14px` below 640 px), with `top:calc(var(--fixed-chrome-height,0px) + 12px)` and `pointer-events:none`; the button inside it takes `pointer-events:auto`.
- **Rationale**:
  - `header-fixed-m3.css` places `#site-header` exactly so: the same box puts the button's left edge on the logo's left edge at every width (clarification Q2, FR-014), without computing `100vw`, which includes the scrollbar.
  - `fixedChrome.js` already publishes the header's height as `--fixed-chrome-height` on every page that loads it, both legal pages included; the legal pages have no tab bar, so it is the header's height.
  - `pointer-events:none` on the full-width wrapper keeps the text beneath it selectable and its links clickable.
  - `z-index:40`, under the header's 41, as the back-to-top button.
- **Alternatives considered**: `left:calc(max(0px, (100vw - var(--max-width)) / 2) + 20px)`, off by the scrollbar's width on desktop browsers.

## R4. The text's gutter on narrow screens

- **Decision**: `.legal-doc` gets `box-sizing:border-box` and `padding-inline-start:max(0px, calc(56px - (100% - 72ch) / 2))` in `legal-m3.css`.
- **Rationale**:
  - The arrow is 40 px wide at the container's content edge; 16 px of space after it makes 56 px.
  - While the container's content box is at least `72ch + 112px` wide, the centred column already leaves 56 px or more, and the padding is 0, so wide screens are unchanged.
  - Narrower, the padding grows by exactly the shortfall, so the text starts 56 px from the content edge, and on a phone (where the column fills the width) the gutter is 56 px (FR-015, SC-004).
  - `border-box` keeps the column's outer width at `72ch`, so the padding does not push it off-centre; its existing padding is vertical only, so nothing else changes.
  - Percentages in padding resolve against the containing block's width, the container's content box; `ch` resolves against the column's own font size, as its `max-width` does.
- **Alternatives considered**: a media query at a fixed width: `72ch` is not a fixed number of pixels across fonts and zoom levels, so it would be wrong at one of them.

## R5. One look for both back arrows

- **Decision**: a new M3 layer, `back-arrow-m3.css`, holds the look (40 px round tonal button, 26 px stroked arrow, state layers, focus ring) under the class `.back-arrow`, plus the R3 wrapper and the hidden-until-ready rules.
  The admin page's link keeps its class `admin-back-link` and gains `back-arrow`; `admin.css` keeps only its placement (the toolbar grid, `margin-bottom`), and loses the copied look.
- **Rationale**: one rule set for one look (FR-013), so the two cannot drift (requirements TD1); the admin link's class stays, so `client-admin-discard.test.ts` and `polls-editing-eligibility.test.ts` keep working.
- **Alternatives considered**: copying the rules into `legal-m3.css`: two copies of the same look in two sheets.

## R6. The arrow's control and its tooltip

- **Decision**: `backArrow.js` inserts `<div class="back-arrow-bar"><button type="button" id="backArrow" class="back-arrow" aria-label="Back" title="Back">…svg…</button></div>` directly after `#site-header` (`header.after(bar)`), so it is the first control after the header in the tab order (FR-016).
  The SVG is the admin link's (`M19 12H5`, `M12 19l-7-7 7-7`), inline, `aria-hidden="true"`.
- **Rationale**:
  - `tooltip-m3.js`, which both pages load, adopts any `title` into its tooltip (`data-tooltip`), including elements added later (its `MutationObserver`), so the button needs nothing more.
  - A `<button>` is pressed by Enter and Space natively; no keydown handler is needed, unlike `backToTopFab.js`'s.
  - Placing it right after the header in the DOM keeps it next in the tab order whatever the header holds; its fixed position makes its DOM place irrelevant to the layout.
- **Alternatives considered**: appending it to `<body>`, as `backToTopFab.js` does: it would then come after the whole policy in the tab order.

## R7. Centring the Up arrow on every page

- **Decision**: in `back-to-top-m3.css`, `right:20px;` becomes `left:0; right:0; margin-inline:auto;`.
- **Rationale**: a fixed box of fixed width (56 px) with both insets at 0 and auto inline margins is centred in the viewport, and `transform` stays free for the existing show animation (`translateY(8px)` → `translateY(0)`), so `.is-visible`, the reduced-motion rule and the cookie-notice offset are untouched (FR-019, FR-020, SC-005).
  The sheet is shared by all 13 pages that load `backToTopFab.js`, so one change covers them (requirements AM1, Recommendation B).
- **Alternatives considered**: `left:50%; transform:translateX(-50%)`: it collides with the animation's `transform` and needs both rewritten.

## R8. The new version

- **Decision**: `TERMS_VERSION` in `src/legal/version.ts` becomes the release date (`YYYY-MM-DD`, the day it ships); both pages print it in their `Version …` line; the Privacy Policy's `Last updated` becomes the same date written as on the page (`4 November 2026` style); the Terms' `Last updated` stays `22 October 2026`.
- **Rationale**:
  - The existing gate does the rest: `hasAcceptedTerms` compares the session's `termsVersion` with the constant, so every account with the earlier value is sent to `/accept-terms` once, and accepting stores the new one (FR-009, SC-006).
  - `tests/legal-pages.test.ts` already checks that both pages print `TERMS_VERSION` and nothing else.
  - No email: the policy's 30-day notice is for "a change that matters"; this one clarifies the check and collects nothing new (requirements NC1).
- **Alternatives considered**: a separate privacy version (requirements TD3): a schema and gate change for one wording update.
