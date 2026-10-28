---
description: "Task list for 027-ADMIN-SEARCH-MATERIAL3"
---

# Tasks: Admin Search, Material 3

**Input**: Design documents from `specs/027-ADMIN-SEARCH-MATERIAL3/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md, quickstart.md

**Tests**: Included, and not optional. Constitution Principle IV requires a verifiable criterion per task, and SC-001–SC-005 are exercised by the suites named below; the painted/browser result is `quickstart.md` scenarios 1–5.

**Organization**: by user story. This is a client-only change (one new stylesheet, the form's markup, a few tokens and one block of script), so there is no server, data or contract task. US1 (P1, the card-sized panel) and US2 (P1, the fields) are the MVP; US3 (P2, the status line) follows; the former More filters story was removed by FIX01 (T023) — see Dependencies.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel: different files, no dependency on an incomplete task
- **[Story]**: US1–US5, mapping to `spec.md`'s five user stories (`[removed]` marks tasks of the More filters story FIX01 removed)
- Paths are repository-relative

---

## Phase 1: Setup

**Purpose**: a known-green baseline. The feature adds no dependency, configuration, server code or migration.

- [X] T001 Run `npm run build` and `npm test` on the untouched tree and record both results (suite and test counts, fingerprinted asset count) on this task's line. Every checkpoint compares against it — *Baseline: build green, 36 fingerprinted assets; `npm test` 63 files passed + 1 skipped (64), 904 tests passed + 15 skipped (919)*

---

## Phase 2: Foundational

**Purpose**: the motion tokens and the new stylesheet's place in the page, so every story can add rules to it.

**⚠️ CRITICAL**: no user story task may begin until this phase's checkpoint passes.

- [X] T002 [P] In `src/public/m3-tokens.css`, add to the shape/state/motion `:root` block `--md-sys-motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);` and `--md-sys-motion-duration-medium2: 300ms;` (research R7), beside `--md-sys-motion-easing-emphasized-decelerate`
- [X] T003 Create `src/public/admin-search-m3.css` (empty apart from one comment linking https://m3.material.io/components/text-fields/specs), add `<link rel="stylesheet" href="/admin-search-m3.css">` after the `admin-card-m3.css` link in `src/public/admin.html`, and in `tests/m3-assets.test.ts` add `"admin-search-m3.css"` to `LAYER_ORDER` after `"admin-card-m3.css"` and to the `admin.html` entry's `layers` (research R10)

**Checkpoint**: `npx vitest run tests/m3-assets.test.ts` is green and `npm run build` fingerprints the new sheet.

---

## Phase 3: User Story 1 — The panel is card-sized (P1) 🎯 MVP

**Purpose**: the search panel has the poll cards' exact container geometry, shared in one rule, centred in the same column.

**Independent Test**: quickstart scenario 1.

- [X] T004 [P] [US1] Create `tests/admin-search-assets.test.ts` with the geometry cases: in `src/public/admin.css` one rule's selector list contains both `.poll-admin-card` and `.admin-search` and carries `width:100%`, `max-width:420px`, `margin:0 auto`, the border, `border-radius:20px`, `box-shadow:var(--shadow)` and the padding; the `max-width:479.98px` (18px corners) and `max-width:639.98px` (14px padding) media rules list both selectors too
- [X] T005 [US1] In `src/public/admin.css`, turn the `.poll-admin-card` container rule and its two media-query rules into selector lists `.poll-admin-card, .admin-search`; reduce the old `.admin-search` rule to `margin-bottom:18px` (the list's own gap) so geometry lives in one place; keep `.admin-search[hidden]{ display:none; }` and FIX04's `.admin-search-notice` width and margin (research R1)

**Checkpoint**: `tests/admin-search-assets.test.ts` geometry cases green; quickstart 1 passes.

---

## Phase 4: User Story 2 — Labelled Material 3 fields (P1)

**Purpose**: one column of outlined 56px fields with visible labels, a filled Search and a text Clear, no search behaviour change.

**Independent Test**: quickstart scenario 2.

- [X] T006 [P] [US2] Create `tests/client-admin-search.test.ts` (jsdom, `openPage(ctx, "admin.html", { cookie, scripts: ["app.js","adminCard.js","adminList.js"] })` as an administrator, like `tests/client-home.test.ts`'s admin search case): every `#adminSearchForm` control has a visible `<label for>`; the controls follow the order of `contracts/ui-contracts.md` C3; ids `adminSearchForm`, `adminSearchClear`, `adminSearchNotice`, every `name` of `data-model.md` and the classes `admin-search-btn` / `admin-search-clear` exist; each operator select is the first child of an `.admin-field-pair` beside its value; the form is `hidden` outside the Search view; filling `q`, `state`, a date group and a count group and submitting sends exactly the query string `readSearchForm` produced before this feature (`/api/admin/polls/search?...`) and returns the same polls
- [X] T007 [US2] In `src/public/admin.html`, rewrite the `#adminSearchForm` markup (research R3): keep `form.admin-search#adminSearchForm[hidden]`; a vertical stack of `div.m3-outlined` fields (control then `<label for>`, ids `search-q`, `search-state`, …; text and number inputs `placeholder=" "`) in this order: `q` (keep `.admin-search-text`), `state`, `visibility`, `choiceMode`, `voteMutability`, `createdBy`, then `createdAt`/`startAt`/`endAt` and `voteCount`/`invitedVoterCount`/`bannedVoterCount` each as `div.admin-field-pair` (operator select, then value); then `div.admin-search-actions` with `button.btn-primary.admin-search-btn[type=submit]` Search and `button.admin-search-clear#adminSearchClear[type=button]` Clear. Remove the `.admin-search-row` wrappers; keep every `name`, option and value
- [X] T008 [US2] First, in `src/public/admin.css`, remove the production rules T007's markup orphans — `.admin-search-row`, `.admin-search-row label`, `.admin-search input, .admin-search select`, `.admin-search-text`, `.admin-search-btn`, `.admin-search-clear` — because their literal `font-size:13px`, `--line` border, 8px corners, 7px padding and 36px button height would otherwise override the new styles (keep `.admin-search[hidden]`, the shared geometry rule and the notice's geometry). Then, in `src/public/admin-search-m3.css`, style the panel's contents from tokens only (research R2, R8): a column with 16px gaps; `.m3-outlined` 56px high, 1px `--md-sys-color-outline` border, `--md-sys-shape-corner-extra-small` corners, the label inside the border, on the panel's own background (`var(--paper-raised)`) so the border appears cut, and floating on `:focus`, `:not(:placeholder-shown)`, and always for `select` and `input[type=date]`, a 2px `--md-sys-color-primary` border and primary label on focus, values in body-large and labels in body-small tokens; `.admin-field-pair` as a 40%/60% grid with a `@media (max-width: 319.98px)` stack; **Search** filled (primary fill, on-primary label, label-large, 48px minimum, full-pill shape), **Clear** a text button (primary label, 48px minimum), both with hover/focus/pressed state layers from `--md-sys-state-*-opacity` on a `::before`; no literal `font-size`, no dark `@media`; every field, control and `.admin-field-pair` gets `min-width:0; max-width:100%; box-sizing:border-box` so nothing overflows the panel down to 320px
- [X] T009 [US2] In `src/public/adminList.js`, inside the `DOMContentLoaded` handler after the `#adminSearchForm` listeners, add `window.M3Ripple?.add("#adminSearchForm .admin-search-btn, #adminSearchForm .admin-search-clear");`
- [X] T010 [P] [US2] In `tests/admin-search-assets.test.ts`, add static cases against `src/public/admin-search-m3.css`: `.m3-outlined` is 56px high; `.admin-search-btn` and `.admin-search-clear` have a 48px minimum height; values use `--md-sys-typescale-body-large-*` and labels `--md-sys-typescale-body-small-*`; the file contains no literal `font-size:` value other than `var(...)` and no `prefers-color-scheme: dark` block; the field, control and pair rules carry `min-width:0`, `max-width:100%` and `box-sizing:border-box`
- [X] T023 [US2] FIX01: replace the visibility, choice mode and vote mutability selects with three radio groups (Any, then the two choices, in one row each) and remove the More filters disclosure. `src/public/admin.html`: flat field list with `div.admin-radio-group[role=radiogroup]` of three `label.admin-radio` rows (names and values unchanged); `src/public/adminList.js`: remove `MORE_KEY`, `hiddenFilterActive`, the preference helpers and the `applyMoreFilters` block; `src/public/admin-search-m3.css`: radio rules in place of the disclosure rules; `src/public/m3-tokens.css`: remove the two motion tokens only the disclosure used; tests: `tests/client-admin-search.test.ts` and `tests/admin-search-assets.test.ts` rewritten for radios and no disclosure; `spec.md` (US3 and FR-010–FR-014 replaced by FR-010/FR-011, SC-005/SC-006 removed), `plan.md`, `research.md` R4/R5, `data-model.md`, `contracts/ui-contracts.md`, `quickstart.md`, `README.md`, `ARCHITECTURE.md`, `CLAUDE.md` (tests postponed, not run)
- [X] T024 [US3] FIX02: remove the Search view's pre-search prompt ("Fill in the form and press Search.") in `src/public/adminList.js` (`showSearchNotice("")` before a search); `tests/client-admin-search.test.ts` and `tests/client-home.test.ts` updated; `spec.md` FR-013, `quickstart.md` (tests postponed, not run)
- [X] T025 [US2] FIX03: remove the two stray closing-tag fragments (`div>`, `v>`) the FIX01 rebuild left in `src/public/admin.html`; a jsdom case in `tests/client-admin-search.test.ts` asserts the form holds no stray text (tests postponed, not run)
- [X] T026 [US4] FIX04: add the Created By line to the read-only card (`src/public/adminCard.js`), `createdByName`/`createdByEmail` to the admin list rows (`src/routes/pollsApi.ts`, `creatorEmails()` in `src/polls/store.ts`), `postman/openapi.json`; tests in `tests/polls-admin-crud.test.ts` and `tests/client-admin-search.test.ts`; `spec.md` User Story 4 and FR-015/SC-006, `research.md` R12, `data-model.md`, `contracts/ui-contracts.md` C7 (tests postponed, not run)
- [X] T027 [US5] FIX05: collapse the search panel — `button#adminSearchToggle` above the form in `src/public/admin.html`, `paintSearchPanel()` / `setSearchCollapsed()` and the submit/Clear wiring in `src/public/adminList.js` (collapse after a search with results, stay open for none or an error, never on the timer refresh), the toggle and `data-collapsed` rules in `src/public/admin-search-m3.css`; tests in `tests/client-admin-search.test.ts` and `tests/admin-search-assets.test.ts`; `spec.md` User Story 5 and FR-016–FR-019/SC-007, `research.md` R14, `data-model.md`, `contracts/ui-contracts.md` C8, `quickstart.md` (tests postponed, not run)
- [X] T028 [US2] FIX06: relabel eight fields in `src/public/admin.html` (Created by user name (contains); State (Initialized, Open, Closed, etc.); Created on; Starts on; Ends on; Vote count; Invitee count; Banned users count) and widen the operator/value pair to equal columns in `src/public/admin-search-m3.css` so the labels fit; tests in `tests/client-admin-search.test.ts` and `tests/admin-search-assets.test.ts`; `spec.md` FR-008, `research.md` R3, `contracts/ui-contracts.md` C3, `quickstart.md` (tests postponed, not run)
- [X] T029 [US5] FIX07: a click on the Search view tab expands a collapsed panel — one line in the tab bar's click handler in `src/public/adminList.js` (`setSearchCollapsed(false)` before `selectTab`), two cases in `tests/client-admin-search.test.ts`; `spec.md` User Story 5 and FR-018, `research.md` R14, `contracts/ui-contracts.md` C8, `quickstart.md`, `README.md`, `designDocs/027-high-level-requirements-admin-search.md`, `CLAUDE.md` (tests postponed, not run)

**Checkpoint**: `tests/client-admin-search.test.ts`, `tests/admin-search-assets.test.ts`, `tests/m3-assets.test.ts` and `tests/client-home.test.ts` (its admin search case) green; quickstart 2 passes.

---

## Phase 5: (Removed by FIX01) More filters (formerly User Story 3)

**Purpose**: the common filters first; the rest under a disclosure that is remembered and held open by a filled hidden field.

**Independent Test**: quickstart scenario 3.

- [X] T011 [P] [removed] In `tests/client-admin-search.test.ts`, add the More filters cases: first load shows `#adminMoreToggle` with `aria-expanded="false"`, `aria-controls="adminMoreFilters"` and the region `inert`; pressing it opens the region directly beneath the toggle with the actions after it, and pressing again closes it; the state is written to `sessionStorage["admin:moreFilters"]` and a page reopened with that value starts in it; a page whose `sessionStorage` throws still works and just does not remember; a filled text, date, number input or a select off "Any…" in the region holds it open, sets `aria-disabled="true"` and the title "Clear the filters below to collapse this section", and pressing the toggle does nothing; changing only an operator does not; Clear empties every field including hidden ones, ends the forced state, leaves the region as open as it was and leaves the stored preference alone; a hidden field's value still reaches the search request; and a creator-only page (no `#adminSearchForm`, `#adminMoreToggle` or `#adminMoreFilters`) loads without an error and still lists the creator's polls — *Superseded by T023 (FIX01): the More filters disclosure was removed*
- [X] T012 [removed] In `src/public/admin.html`, wrap the fields after `state` in `div#adminMoreFilters.admin-more-region` (an outer grid wrapper and an inner `overflow:hidden` div, `inert` when collapsed, `role="group"`, `aria-label="More filters"`) and add `button.admin-more-toggle#adminMoreToggle[type=button][aria-expanded=false][aria-controls=adminMoreFilters]` with a chevron `<svg aria-hidden="true">` and the text "More filters" directly after the `state` field; the actions stay after the region (research R4) — *Superseded by T023 (FIX01): the More filters disclosure was removed*
- [X] T013 [removed] In `src/public/adminList.js`, add `const MORE_KEY = "admin:moreFilters"`, `hiddenFilterActive(form)` (research R5: non-empty text/date/number, or a non-operator select with a non-empty value, among the region's controls) and `applyMoreFilters()` (effective open = stored preference open or forced; sets the region's `inert`, the toggle's `aria-expanded`, `aria-disabled` and title, and a class for styling); read the preference once in a `try`, write it on each toggle in a `try`, never write the forced state; wire the toggle click (ignored while forced), an `input`/`change` listener on the region, an initial call, and a call after the existing Clear handler's `searchForm.reset()`; register the toggle with `window.M3Ripple?.add`; all of this runs only inside the existing `if (searchForm)` block and is null-safe, because `becomeCreatorView()` removes the form for a poll creator who is not an administrator — *Superseded by T023 (FIX01): the More filters disclosure was removed*
- [X] T014 [removed] In `src/public/admin-search-m3.css`, style the disclosure (research R4, R7): `.admin-more-region` as a `grid-template-rows: 0fr` → `1fr` transition with `--md-sys-motion-easing-standard` and `--md-sys-motion-duration-medium2`, the chevron rotating with the same timing, `.admin-more-toggle` as a 48px text button with a state layer, `[aria-disabled="true"]` dimmed to 38% content with `cursor:not-allowed`, and `@media (prefers-reduced-motion: reduce)` setting every transition to `none` — *Superseded by T023 (FIX01): the More filters disclosure was removed*
- [X] T015 [P] [removed] In `tests/admin-search-assets.test.ts`, add static cases: the region transitions `grid-template-rows` with the standard easing and medium2 duration tokens; a `prefers-reduced-motion: reduce` block sets the transitions to `none`; `[aria-disabled="true"]` on the toggle uses the 38% content colour; `m3-tokens.css` defines `--md-sys-motion-easing-standard` and `--md-sys-motion-duration-medium2` — *Superseded by T023 (FIX01): the More filters disclosure was removed*

**Checkpoint**: the More filters cases in `tests/client-admin-search.test.ts` and `tests/admin-search-assets.test.ts` green; quickstart 3 passes.

---

## Phase 6: User Story 3 — The status line as supporting text (P2)

**Purpose**: the line under the tabs is centred Material 3 supporting text and a live region, in every view.

**Independent Test**: quickstart scenario 4.

- [X] T016 [P] [US3] In `tests/client-admin-search.test.ts` and `tests/admin-search-assets.test.ts`, add: `#adminSearchNotice` has `role="status"` and sits outside `#adminSearchForm`; its text for the Newest cut-off, the empty view and an error is unchanged, and it is empty and hidden in the Search view before a search (FIX02); the stylesheet gives it body-small type in `--md-sys-color-on-surface-variant`, `text-align:center`, and no border or background
- [X] T017 [US3] In `src/public/admin.html` add `role="status"` to `p#adminSearchNotice`, and in `src/public/admin-search-m3.css` add the `.admin-search-notice` supporting-text rule (body-small tokens, on-surface-variant colour, centred; the 420px width and margin stay in `admin.css`)

**Checkpoint**: the US3 cases green; quickstart 4 passes.

---

## Phase 7: Polish & cross-cutting

**Purpose**: confirm nothing selects the rules T008 removed, update the docs, run everything.

- [X] T018 Confirm nothing else in `src/public/` or `tests/` selects the rules T008 removed from `src/public/admin.css` (`.admin-search-row`, `.admin-search input`, `.admin-search select`, `.admin-search-text`, `.admin-search-btn`, `.admin-search-clear`), and that `.admin-search[hidden]`, the shared geometry rule and the notice's geometry are still there
- [X] T019 [P] Update `README.md` and `ARCHITECTURE.md` where they describe the administration page's search (the Search view's form, More filters, the shared card geometry), if they do; add nothing if they do not mention it
- [X] T020 [P] Grep the new and changed `src/public` files for comments citing requirement, feature or task ids and for orphaned code left by the removed rules; remove only what this feature orphaned (Constitution III, VI)
- [X] T021 Run `npm run build`, `npx tsc --noEmit` and `npm test`; compare with T001's baseline and record the counts on this task's line — *Result: build green, 37 fingerprinted assets (baseline 36, plus the new sheet); `tsc` clean; `npm test` 65 files passed + 1 skipped (66), 938 tests passed + 15 skipped (953), against a baseline of 63 + 1 (64) and 904 + 15 (919)*
- [ ] T022 Walk `quickstart.md` scenarios 1–5 in the running app and record any deviation as a new task; at a 320px window measure that the Search view has no sideways scroll, and at 1366×768 that the collapsed panel plus the tabs leaves the top of the first card visible — *Not done: it needs the app running in a browser against PostgreSQL, which this session could not do; each scenario's behaviour is covered by the automated suites named above, but the layout checks (320px no sideways scroll, 1366×768 above the fold, the look of the fields) are left for the developer*

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (blocking) → stories.
- **US1** needs Phase 2 only. **US2** needs Phase 2 and builds on US1's geometry (the panel is already card-sized). **US3** (the status line) needs Phase 2 only and can run beside US1.
- Files shared across stories: `src/public/admin.html` (US2 rewrite, then US3 `role`), `src/public/admin-search-m3.css` (US2 and US3 add disjoint rule groups), `src/public/adminList.js` (the US2 ripple line), `tests/client-admin-search.test.ts` and `tests/admin-search-assets.test.ts` (each story adds cases). Sequence the edits to a shared file; everything marked [P] is otherwise independent.

### Parallel example (US2)

T006 (the jsdom test file) and T010 (the static test additions) run together while T007 (markup) is written; T008 (stylesheet) and T009 (script line) follow T007.

## Implementation Strategy

### MVP first (User Stories 1 and 2)
Phases 1–4. After Phase 4 the Search view's panel is card-sized, fully labelled and Material 3, with every field shown. Stop and walk quickstart 1 and 2.

### Incremental delivery
1. Setup + Foundational → tokens and the sheet in place, allowlist updated
2. US1 → the shared geometry rule
3. US2 → the labelled outlined fields and buttons (MVP)
4. (More filters, removed by FIX01)
5. US3 → the status line
6. Polish → confirm the removal, docs, full suite, manual walk

## Notes

- 29 tasks: Setup 1, Foundational 2, US1 2, US2 8, removed 5, US3 3, US4 1, US5 2, Polish 5 (T023–T029 record FIX01–FIX07)
- FR-005 asks for outlined fields while the admin cards' wizard uses underlined ones (research R2): the panel follows the spec and the wizard is left alone.
- Constitution VI: new CSS and JS carry no requirement ids or `M3:` comments; the one new comment is an external link to the Material 3 text-field spec.
- Commit after each phase, or per story.
