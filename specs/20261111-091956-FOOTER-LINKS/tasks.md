---

description: "Task list for Footer Links"
---

# Tasks: Footer Links

**Input**: Design documents from `specs/20261111-091956-FOOTER-LINKS/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md, quickstart.md

**Tests**: Included. SC-006, Constitution Principle IV and research R8 require every FR to be covered by a static or
jsdom client test.

**Organization**: Tasks are grouped by user story so each story can be built and checked on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: the pages say which of them draws the arrow and which load the rule.

- [X] T001 [P] Add `data-back-arrow` to the `<body>` tag of src/public/privacy.html and src/public/terms.html (data-model.md, Page markup; contracts C4)
- [X] T002 [P] Add `<script src="/backArrow.js" defer></script>` directly after the `fixedChrome.js` script tag in src/public/profile.html and src/public/admin.html (research R2, R6, R7)

---

## Phase 2: Foundational (blocks US3 and US4; US1 depends on the arrow's opt-in)

**Purpose**: one back rule, exposed by the script that already computes it.

- [X] T003 In src/public/backArrow.js: compute `const canReturn = cameFromThisSite();` once at load and expose `window.SiteBack = { canReturn: () => canReturn, leave(fallback) { if (canReturn) { history.back(); return true; } if (fallback) { location.assign(fallback); return true; } return false; } };` before the arrow code; draw the arrow (today's `numberEntry(0)`, the `popstate`/`hashchange` listeners and `buildArrow()`) only when `canReturn && document.body.hasAttribute("data-back-arrow")`; keep `history.go(-(legalDepth + 1))` and everything else unchanged (research R2; contracts C4)
- [X] T004 In tests/client-back-arrow.test.ts: keep every existing case; add cases that `window.SiteBack.canReturn()` is `true` for the default `open()` and `false` for each of the four "adds nothing" cases; that `leave("/")` records `history.back` (stub it like `history.go`) and returns `true` when it can return, and navigates (`page.navigations` length 1) when it cannot; that `leave()` without a fallback returns `false` and neither navigates nor goes back; that a page without `data-back-arrow` (open `profile.html` with `scripts: ["backArrow.js"]`, referrer `http://localhost/`, an earlier entry) gets `window.SiteBack` and no `#backArrow`; that the console stays silent (contracts C4)
- [X] T005 Run `npx vitest run tests/client-back-arrow.test.ts tests/legal-pages.test.ts tests/m3-assets.test.ts` and make them pass

**Checkpoint**: the legal arrow behaves as today; `window.SiteBack` is available on the four pages.

---

## Phase 3: User Story 1 — Read the legal pages on a phone (Priority: P1) 🎯 MVP

**Goal**: below 640 px the legal text spans the screen and the Back arrow sits above the title, in the page flow.

**Independent Test**: quickstart step 1; `tests/legal-pages.test.ts`.

### Tests for User Story 1

- [X] T006 [US1] In tests/legal-pages.test.ts replace the "keeps the text clear of the Back arrow on a narrow screen" case with one that reads src/public/legal-m3.css and expects: a `@media (min-width: 640px)` block containing `.legal-doc{ box-sizing:border-box; padding-inline-start:max(0px, calc(56px - (100% - 72ch) / 2)); }`; a `@media (max-width: 639.98px)` block containing `.back-arrow-bar{ position:static; max-width:none; margin:0 0 12px; padding-inline:0; }`; no `padding-inline-start` outside the `min-width` block; the `scroll-margin-top` rules for `h2` and `section[id]` still present (FR-001–FR-003; contracts C1)

### Implementation for User Story 1

- [X] T007 [US1] In src/public/legal-m3.css move the `.legal-doc{ box-sizing:border-box; padding-inline-start:… }` rule (line 10) verbatim inside `@media (min-width: 640px){ … }` and add `@media (max-width: 639.98px){ .back-arrow-bar{ position:static; max-width:none; margin:0 0 12px; padding-inline:0; } }`; change nothing else; no literal font size (research R1; `m3-assets.test.ts`)
- [X] T008 [US1] Run `npx vitest run tests/legal-pages.test.ts tests/m3-assets.test.ts` and check both pages at 390 px and 640 px in a browser per quickstart step 1; SC-001's 90% text width is a visual check at 360, 390 and 430 px

**Checkpoint**: both legal pages read full-width on a phone, unchanged at 640 px and wider.

---

## Phase 4: User Story 2 — Return to the tab you left (Priority: P1)

**Goal**: the home page's address names the tab shown; a return, a reload, a bookmark or a shared link shows it.

**Independent Test**: quickstart steps 2–6; `tests/client-tab-address.test.ts`.

### Tests for User Story 2

- [X] T009 [P] [US2] Create tests/client-tab-address.test.ts (model: tests/client-home-tab.test.ts, its `SCRIPTS` list and `forgeSession`): a logged-in visitor opening `http://localhost/` ends with `location.search === "?tab=home"` and the same `history.length` as before the scripts ran; a guest ends with `?tab=trending`; clicking `.tab[data-tab="your-votes"]` gives `?tab=your-votes` with no new history entry; for each of the nine names, a logged-in visitor opening `/?tab=<name>` shows that tab (`#tabBar .tab.is-active`); a guest opening `/?tab=your-votes` shows Trending, reads `?tab=trending` and `page.navigations` is empty; `/?tab=nonsense` shows the default and writes its name; `/?q=senate` (logged in) requests `/api/search`, shows Search and reads `?q=senate&tab=search`; then clicking Trending reads `?tab=trending`; `/?q=senate&tab=trending` shows Trending, no `/api/search` request, reads `?tab=trending`; `/?open=<pid>&tab=trending` (with a Trending poll, as in client-landing.test.ts) ends `?tab=trending` with the card maximized; `/?PID=abc` ends `?PID=abc&tab=home`; `history.state` set before the scripts (`beforeScripts`: `replaceState({ kept: 1 }, "")`) is preserved; after maximizing a Trending card, a fresh open of `/?tab=trending` shows the tab with its list and no visible `.maximized-card-grid` (FR-004–FR-009; contracts C2)
- [X] T010 [P] [US2] Update tests/client-landing.test.ts line 102 to `expect(page.window.location.search).toBe("?tab=home")` and tests/client-home.test.ts lines 1751 and 1760 to `"?tab=shared-with-you"` and `"?tab=home"` (research R8)

### Implementation for User Story 2

- [X] T011 [US2] In src/public/tabs.js add `const TAB_NAMES = ["home", "your-polls", "shared-with-you", "your-votes", "trending", "newest", "watching", "live", "search"];` beside `PERSONAL_TABS`; add `function showTabInAddress(name) { const params = new URLSearchParams(location.search); params.set("tab", name); if (name !== "search") params.delete("q"); history.replaceState(history.state, "", location.pathname + "?" + params.toString() + location.hash); }` and call it in `select(name)` right after `activeTab = name;` (research R3; contracts C2)
- [X] T012 [US2] In src/public/tabs.js: change `LANDING_PARAMS` to `["open", "notice"]` and `takeLanding()` to read `tab` without deleting it, returning `tab: TAB_NAMES.indexOf(tab) !== -1 ? tab : null` (remove `LANDING_TABS`); add `function tabFromAddress() { const name = new URLSearchParams(location.search).get("tab") || ""; if (TAB_NAMES.indexOf(name) === -1) return null; return !isSignedIn() && PERSONAL_TABS.indexOf(name) !== -1 ? "trending" : name; }`; make `takeLanding()` return its object whenever `tab`, `open` or `notice` is present (research R4)
- [X] T013 [US2] In src/public/tabs.js rewrite the end of `init()` after `applyPollPage()`: `const landing = takeLanding(); const tab = tabFromAddress(); const q = (new URLSearchParams(location.search).get("q") || "").trim();` — if `landing && landing.notice && isSignedIn()` show the notice; if `tab`: `await select(tab)`, then when `isSignedIn() && landing && landing.pid` mount and maximize the poll as `applyLanding` does today, then when `tab === "search" && q && window.SearchTab` `await window.SearchTab.submit(q)`, and return; else if `q && window.SearchTab && window.SearchTab.submit` keep today's FIX013 path; else `await select(isSignedIn() ? "home" : "trending")`; fold `applyLanding` into this (delete it if nothing else calls it); `select` must never be reached with a personal tab for a guest; drop the `// FIX013: …` comment in the rewritten region and name the branch clearly (e.g. `searchFromAddress`), per Constitution Principle VI (research R4, R5; FR-006)
- [X] T014 [US2] Run `npx vitest run tests/client-tab-address.test.ts tests/client-landing.test.ts tests/client-home.test.ts tests/client-home-tab.test.ts tests/client-sign-in-notice.test.ts tests/client-search-tab-field.test.ts` and make them pass; then quickstart steps 2–6

**Checkpoint**: every return to the home page, kept or reloaded, shows the tab left; guests never see the login page.

---

## Phase 5: User Story 3 — Cancel the Delete Account dialog and go back (Priority: P2)

**Goal**: Cancel and Escape return to the page the visitor came from, or close in place when there is none.

**Independent Test**: quickstart steps 7 and 8; `tests/client-delete-account.test.ts`.

### Tests for User Story 3

- [X] T015 [US3] In tests/client-delete-account.test.ts add `"backArrow.js"` before `"profileCard.js"` in `profile()`'s `scripts`, give `profile()` options `referrer` and `earlierEntry` (default none / false) applied like tests/client-back-arrow.test.ts's `open()` (`history.pushState(null, "", "/profile#delete-account")` for the earlier entry, a recorded `history.back` stub) and add: with referrer `http://localhost/?tab=your-votes` and an earlier entry, Cancel removes the dialog and records one `back` call; Escape likewise; with no referrer, with `https://example.com/` and with a referrer but no earlier entry, Cancel removes the dialog, records no `back` call and focus is on the name input; a dialog opened by setting `location.hash = "#delete-account"` on the loaded page (with a referrer and an earlier entry) closes in place, and a second open closes in place again; the scrim click does nothing; "deletes the account and goes home" unchanged (FR-011–FR-013; contracts C3)

### Implementation for User Story 3

- [X] T016 [US3] In src/public/profileCard.js: `openDeleteDialog(opener, returns)`; replace `close()` with `function dismiss() { document.removeEventListener("keydown", onKey, true); scrim.remove(); if (returns) history.back(); else opener.focus(); }` used by Cancel's click and the Escape branch; `openDeleteDialogWhenAsked(fromLoad)` passes `fromLoad === true && Boolean(window.SiteBack && window.SiteBack.canReturn())`; in `start()` call `openDeleteDialogWhenAsked(true)` and register `window.addEventListener("hashchange", function () { openDeleteDialogWhenAsked(false); })`; the hash removal by `replaceState`, the scrim and the Delete Account button are unchanged (research R6)
- [X] T017 [US3] Run `npx vitest run tests/client-delete-account.test.ts tests/client-footer.test.ts` and make them pass; then quickstart steps 7 and 8

**Checkpoint**: Delete Account → Cancel lands back where the visitor started, tab included.

---

## Phase 6: User Story 4 — One rule for every Back control (Priority: P3)

**Goal**: the admin page's arrow follows the shared rule, with `/` as its fallback.

**Independent Test**: quickstart step 9; `tests/client-admin-discard.test.ts`.

### Tests for User Story 4

- [X] T018 [US4] For the admin page's Back arrow (`.admin-back-link`): in tests/client-admin-discard.test.ts add `"backArrow.js"` to the opened scripts; keep "is not shown when nothing was edited: the back link navigates" and "holds the back link until Discard, then navigates" (no referrer → `location.assign("/")`, one navigation); add a `describe` that opens admin.html with `referrer: "http://localhost/?tab=home"`, an earlier entry (`beforeScripts`: `history.pushState(null, "", "/admin")`) and a recorded `history.back` stub: a click on `.admin-back-link` with nothing edited records one `back` call and no navigation; with unsaved edits the discard dialog shows first and Discard then records the `back` call (FR-014; contracts C5)

### Implementation for User Story 4

- [X] T019 [US4] In src/public/adminList.js `guardNavigation()`, for the admin page's Back arrow (`.admin-back-link`): compute `const backLink = link.classList.contains("admin-back-link");` after the same-origin check; `if (!controller && !backLink) return;`; `event.preventDefault();`; when `controller` is set keep the dirty check and `releaseSession()`; navigate with `function go() { if (backLink && window.SiteBack) window.SiteBack.leave(url.href); else window.location.assign(url.href); }` (called after `releaseSession()` resolves, or at once with no controller) (research R7; contracts C5)
- [X] T020 [US4] Run `npx vitest run tests/client-admin-discard.test.ts tests/polls-editing-eligibility.test.ts` and make them pass; then quickstart step 9

**Checkpoint**: the three page-return controls decide by `SiteBack.canReturn()`; the maximized card's arrow is untouched.

---

## Phase 7: Polish & Documentation

**Purpose**: the whole suite, the manual pass and the documentation deliverables.

- [X] T021 Run `npx tsc --noEmit` and `npm test`; fix any suite the address change affected (grep tests for `location.search` and `ON_TRENDING`)
- [X] T022 Run the manual quickstart (steps 1–10) on the development server
- [X] T023 [P] Update README.md's "Privacy Policy and Terms of Service" bullet: on a phone the Back arrow sits above the title; a return shows the home page tab you left (the address names it, `/?tab=…`); the Delete Account dialog's Cancel takes you back to the page you came from; the admin page's arrow likewise (Documentation Deliverables)
- [X] T024 [P] Update ARCHITECTURE.md: `tabs.js` keeps the active tab in the address with `replaceState` and reads it on load; `backArrow.js` holds `window.SiteBack`, the one back rule used by the legal arrow, the Delete Account dialog and the admin arrow (Documentation Deliverables)
- [X] T025 [P] Add the feature's decisions to CLAUDE_COMPLETE.md (the Spec Kit block of CLAUDE.md already points at this plan)

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2**: T003 needs T001 so the legal pages keep their arrow; T002 lets the profile and admin pages see `SiteBack`.
- **US1 (Phase 3)**: depends on T001 and T003 only (the arrow still drawn); the CSS work (T006–T008) touches no script.
- **US2 (Phase 4)**: independent of Phase 2; `tabs.js` and its tests only.
- **US3 (Phase 5)** and **US4 (Phase 6)**: depend on Phase 2 (`window.SiteBack`) and on T002; US3's "tab included" outcome shows only once US2 is in, but its tests pass without it.
- **Phase 7**: after every story.

### Parallel Opportunities

- T001 ‖ T002; T009 ‖ T010; T023 ‖ T024 ‖ T025.
- After Phase 2: US1, US2, US3 and US4 touch different files and can proceed side by side.

---

## Implementation Strategy

1. **MVP**: Phases 1, 2 and 3: the legal pages readable on a phone, nothing else changed. Validate with quickstart step 1.
2. Add US2 (the tab in the address), validate steps 2–6.
3. Add US3 and US4, validate steps 7–9.
4. Phase 7: full suite, manual pass, README, ARCHITECTURE, CLAUDE_COMPLETE.
