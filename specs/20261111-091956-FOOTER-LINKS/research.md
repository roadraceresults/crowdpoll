# Research: Footer Links

Every decision below comes from reading the code paths the footer links use today; nothing external was needed (no
new library, standard or service). Each item gives the decision, the reason and the alternatives considered.

## R1. The phone layout: the gutter rule is the whole bug

- **Decision**: in `legal-m3.css` the rule
  `.legal-doc{ box-sizing:border-box; padding-inline-start:max(0px, calc(56px - (100% - 72ch) / 2)); }` moves inside
  `@media (min-width: 640px)`, and a new `@media (max-width: 639.98px)` block takes the Back arrow bar into the page
  flow: `.back-arrow-bar{ position:static; max-width:none; margin:0 0 12px; padding-inline:0; }`. Nothing else in the
  legal pages changes; `legal-m3.css` loads on `privacy.html` and `terms.html` only, so the bar rule reaches no other
  page's `.back-arrow-bar` (the home page's maximized-card bar shares the class and keeps `back-arrow-m3.css`).
- **Rationale**: the gutter formula is `56px - (100% - 72ch) / 2`; once the column is narrower than `72ch` the
  subtraction turns negative and the gutter grows by half the shortfall, which on a 390 px phone is about half the
  screen (the screenshot in the requirements). Below 640 px the arrow bar leaves its fixed position, so no gutter is
  needed at all (UA1 A). The site's own breakpoint is `639.98px` (`site.css`, `header-fixed-m3.css`, `footer-m3.css`,
  `back-arrow-m3.css`). The bar is inserted by `backArrow.js` right after `#site-header`, inside `.layout` and before
  `main.legal-doc`, so in flow it sits above the title; `.container`'s padding already clears the fixed header.
  `scroll-margin-top` on `h2` and `section[id]` is untouched, so in-page links still land below the header (FR-003).
- **Alternatives**: clamping the formula (`max(0px, …)` already does; the bug is the sign of the inner term); a
  `min(56px, …)` variant keeping the arrow fixed on phones (rejected in UA1: the arrow would still take 56 px of a
  360 px screen); a new stylesheet (one more `LAYER_ORDER` entry for two rules).

## R2. One back rule, exposed by `backArrow.js`

- **Decision**: `backArrow.js` exposes `window.SiteBack` before anything else:
  - `canReturn()`: `history.length > 1` and `document.referrer`'s origin equals `location.origin`, computed once at
    script load (the values the legal pages' `cameFromThisSite()` already uses);
  - `leave(fallback)`: `history.back()` when `canReturn()`, else `location.assign(fallback)`; with no fallback it does
    nothing when it cannot return and answers `false`, so a caller can close in place.
  The legal pages' arrow keeps its own `history.go(-(legalDepth + 1))`, because it counts anchor steps; it is drawn only
  on a page whose `<body>` carries `data-back-arrow` (`privacy.html`, `terms.html`), so the script can load on
  `profile.html` and `admin.html` for the rule alone.
- **Rationale**: RS1 A / FR-014: three controls, one decision. The decision is taken at load, as the legal pages do
  today (FR-010), so a referrer that changes meaning later (a reload keeps the original referrer) cannot flip it. The
  legal pages keep their depth counting (FR-010, edge cases), the one place the rule needs more than one step.
- **Alternatives**: a new `siteBack.js` (one more script tag on four pages for twenty lines); duplicating the referrer
  check in `profileCard.js` and `adminList.js` (the drift RS1 was raised about); a `Referrer-Policy` header (none is
  needed: the browser default sends the same-origin referrer, and the spec assumes none is added).

## R3. The home page's tab in its address

- **Decision**: in `tabs.js`, `select(name)` ends its state change with `showTabInAddress(name)`:
  `URLSearchParams(location.search)`, `set("tab", name)`, `delete("q")` unless `name === "search"`, then
  `history.replaceState(history.state, "", pathname + "?" + params + hash)`. Every path that shows a tab goes through
  `select` (`init`'s default, `applyLanding`, `applyPollPage`, `applyGuestState`'s fallback, `SearchTab.submit` and
  `clear`, the tab bar click), so the address is right from the first tab shown (FR-004, clarification Q1) and the
  search terms leave with the Search tab (FR-009, clarification Q2). Other parameters (`PID`) are kept.
- **Rationale**: NC1 A: `replaceState` adds no history entry, so the browser's Back button still leaves the home page
  in one press, and the address is what a fresh load, a bookmark or a shared link gets (FR-005, SC-004). No storage key
  is added, so the Cookie Use table is unchanged (FR-016). The page's own `history.state` is preserved.
- **Alternatives**: `sessionStorage` (a new storage key and a Cookie Use row, NC1 B); the hash (`/#your-votes`,
  which collides with in-page anchors and `#delete-account`-style links); writing the terms into the address on every
  search (not asked: the address carries `q` only when it arrived with it, as today).

## R4. Reading the tab on load, for all nine tabs, for everyone

- **Decision**: `takeLanding()` keeps stripping `open` and `notice` and returning the poll and notice, but no longer
  strips `tab` and accepts any of the nine names (`TAB_NAMES`, the keys of the tab bar). A new `tabFromAddress()` maps
  the name to the tab to show: a personal tab (`PERSONAL_TABS`) for a guest becomes `trending`; an unknown name is
  `null`. `init` becomes: `applyPollPage()`; then, if the address names a tab, `select` it, mount the landing poll
  when the visitor is signed in (as `applyLanding` does), and when the tab is `search` and `q` is present run
  `SearchTab.submit(q)`; else if `q` is present, `SearchTab.submit(q)` (today's FIX013 path); else the default
  (`home` signed in, `trending` not). `select` is never called with a personal tab for a guest, so its
  `location.href = "/login"` branch is never reached by a return (FR-006).
- **Rationale**: FR-005 to FR-008, UA2, UA3: the tab is restored, not the card (`open` is honoured only when the link
  carries it, as today); a guest's return goes to Trending, never the login page. `applyGuestState` already falls back
  to Trending when the session ends while a personal tab is showing.
- **Alternatives**: keeping `LANDING_TABS` (four tabs) and a second list for the return (two lists for one thing);
  restoring the maximized card too (rejected in UA3).

## R5. A session that ended while away

- **Decision**: a guest who arrives with a personal tab in the address sees Trending, and the address is rewritten to
  `/?tab=trending` like every other fallback: FR-004 ("one rule, no exception", clarification Q1) governs. The login
  flow returns to `/` in every case (`pages.ts` redirects to `/`, the header's Login goes to `/login` without a
  return address), so a stale tab name in the address bar could not be honoured after login anyway.
- **Rationale**: the rewrite loses nothing the visitor could use, and the bookmark or shared link they came from still
  names the tab for after they log in (SC-004); the spec's "session ends while away" edge case says the same.
- **Alternatives**: skipping the address write on a guest fallback (an exception to FR-004 that the clarification
  refused); carrying `next=` through login (a change to the login flow, out of scope).

## R6. The Delete Account dialog's Cancel

- **Decision**: `profileCard.js` decides when the dialog opens: `openDeleteDialogWhenAsked(fromLoad)` passes
  `returns = fromLoad && window.SiteBack.canReturn()` to `openDeleteDialog(opener, returns)`. `fromLoad` is `true` for
  the call made when the page starts with `#delete-account` in its address, `false` for the `hashchange` listener
  (the footer's link while already on the Profile page). Cancel and Escape call one `dismiss()`: it removes the
  scrim and the key listener, then `history.back()` when `returns`, else `opener.focus()`. The scrim stays inert and
  the Delete Account button is unchanged (FR-013).
- **Rationale**: AM1 A, UA4, FR-011, FR-012. The hash is already removed by `replaceState` when the dialog opens, so
  `history.back()` lands on the page before `/profile`: the home page with its tab in the address (R3), or the
  Privacy Policy with its `legalDepth` in `history.state`. Removing the dialog before leaving keeps a back/forward-cache
  copy of the Profile page clean. A dialog opened by the footer of the Profile page itself has no page to return to,
  and after an in-place Cancel the next open is a `hashchange` again (US3 scenario 4).
- **Alternatives**: `history.back()` whenever a referrer exists (a fresh tab with a referrer has no earlier entry:
  the spec's last edge case); deciding at Cancel time (a reload between open and Cancel would not matter, but FR-012
  says at open).

## R7. The admin page's arrow

- **Decision**: `adminList.js`'s `guardNavigation()` click handler treats `.admin-back-link` specially: it always
  `preventDefault()`s it, runs the discard check when a wizard is editing (as today), and then calls
  `window.SiteBack.leave(link.href)` (`"/"`) instead of `location.assign`. The link stays
  `<a href="/" class="admin-back-link back-arrow">`, so a middle click, a new tab and a page without the script still
  reach the home page. `admin.html` loads `backArrow.js` after `fixedChrome.js`, as the legal pages do.
- **Rationale**: RS1 A / FR-014, US4: reached from the home page, the arrow returns to the tab left (R3); opened
  directly, it goes home as today. The guard already owns the link's click, so the rule is applied in one place and the
  discard dialog keeps working (`client-admin-discard.test.ts`).
- **Alternatives**: a click listener in `backArrow.js` on the link (it would run before the document-level guard and
  skip the discard dialog); replacing the link with a button (loses the plain navigation fallback).

## R8. Tests and documents

- **Server/static**: `legal-pages.test.ts` pins the new `legal-m3.css` rules instead of the old gutter line;
  `m3-assets.test.ts` is unchanged (no new stylesheet); `cookie-use-list.test.ts` passes with no new row.
- **Client**:
  - `client-back-arrow.test.ts`: `window.SiteBack.canReturn()` for the four "adds nothing" cases and the normal one;
    `leave("/")` navigates in the first and calls `history.back` in the second; the arrow is drawn only with
    `data-back-arrow`; today's depth cases unchanged.
  - new `client-tab-address.test.ts`: a plain `/` becomes `/?tab=home` (logged in) or `/?tab=trending` (guest) with
    `history.length` unchanged; a click on each tab updates the address; each of the nine names in the address shows
    its tab for a logged-in visitor; a guest's `/?tab=your-votes` shows Trending with `/?tab=trending` and no
    navigation; `/?tab=nonsense` shows the default; `/?q=senate` runs the search and reads `/?q=senate&tab=search`;
    selecting Trending then reads `/?tab=trending`; `/?open=<pid>&tab=trending` ends as `/?tab=trending`; `?PID=` is
    kept.
  - `client-landing.test.ts` (line 102) and `client-home.test.ts` (lines 1751, 1760): the address now names the tab.
  - `client-delete-account.test.ts`: loads `backArrow.js` too; with a same-origin referrer and an earlier entry,
    Cancel and Escape remove the dialog and call `history.back` once; with no referrer, a foreign referrer or no
    earlier entry they close in place with focus on the name field; opened by `hashchange` on the page they close in
    place, twice in a row.
  - `client-admin-discard.test.ts`: the back link still navigates when nothing was edited and still waits for
    Discard; a new case with a referrer and an earlier entry calls `history.back` instead.
- **Documents**: README (the footer paragraph: arrow above the title on a phone, the return to the tab, Cancel),
  ARCHITECTURE.md (`tabs.js` keeps the tab in the address; `backArrow.js` holds the shared rule), CLAUDE_COMPLETE.md
  and the CLAUDE.md Spec Kit block.
