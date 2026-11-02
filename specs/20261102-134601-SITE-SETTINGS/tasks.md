# Tasks: Site Settings and Color Scheme

**Input**: Design documents from `specs/20261102-134601-SITE-SETTINGS/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui-contracts.md, quickstart.md

**Tests**: Included (plan R13, Constitution IV), written before the change they cover.

**Organization**: by user story, after the shared storage, API and head script that every story needs.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Run `npx tsc --noEmit` and `npm test` and record that both pass before any change (baseline).
  - Baseline: `npx tsc --noEmit` clean; `npm test` 147 files passed, 1 skipped; 2133 tests passed, 17 skipped (2026-11-02). The run overlapped the first edits of T002–T014.

---

## Phase 2: Foundational (blocks every story)

**Purpose**: the stored choice, its API, and the head script that paints it (research R1–R4, R12; contracts A1, A2, C2).

- [X] T002 [P] Create `tests/color-scheme.test.ts` (supertest, `startTestContext`, a signed-in agent as in the profile tests) with failing tests for A1 and A2:
  - `GET /api/me` answers `colorScheme: "light"` for a new user;
  - `PATCH /api/me { colorScheme: "dark" }` answers `200` with `colorScheme: "dark"`, and the next `GET /api/me` (through the session cache) says `"dark"`;
  - `PATCH { colorScheme: "blue" }` answers `400` with `Color scheme must be "light" or "dark".`, and nothing is stored;
  - `PATCH {}` answers `400 Nothing to change.`;
  - `PATCH { userName }` alone renames exactly as before;
  - `PATCH { userName, colorScheme }` changes both;
  - a scheme-only PATCH leaves every poll row's `content_version` unchanged;
  - signed out → `401`;
  - after `DELETE /api/me` the user row and its `color_scheme` are gone (FR-017–FR-019).
- [X] T003 Create `src/db/migrations/016-color-scheme.ts`: `up` runs `alter table "user" add column "color_scheme" text null check ("color_scheme" in ('light', 'dark'))`, and `down` drops it. Register it as `"016-color-scheme"` in `src/db/migrations/index.ts`, and add `color_scheme: string | null` to `UserTable` in `src/db/schema.ts` (data-model.md).
- [X] T004 In `src/auth/sessionCache.ts` `lookup()`, add `color_scheme` to the selected columns and set `user.colorScheme = row?.color_scheme === "dark" ? "dark" : "light"`, extending the cast type (research R1).
- [X] T005 In `src/routes/api.ts` `GET /api/me`, add `colorScheme` to the response (A1).
- [X] T006 In `src/routes/api.ts` `PATCH /api/me`, accept `userName` and/or `colorScheme` (A2):
  - validate each present key before writing; with neither, answer `400 "Nothing to change."`; refuse a scheme that is not `"light"` or `"dark"` with the A2 message;
  - run today's rename only when `userName` is present;
  - write `color_scheme` and `updatedAt` in the same transaction;
  - call `sessions.forgetUserSessions` after any success;
  - log `[settings] User <id> color scheme set to <value>`;
  - return `colorScheme` in the response.

  Make T002 pass.
- [X] T007 [P] Update `postman/openapi.json` for `GET /api/me` (`colorScheme`) and `PATCH /api/me` (both optional keys, the new `400`s) (FR-020).
- [X] T008 [P] Create `src/public/colorScheme.js` per contract C2:
  - an IIFE with `const STORAGE_KEY = "colorScheme";` that applies a stored `"dark"` at load;
  - `window.ColorScheme = { apply, current, setSaving }`;
  - a `DOMContentLoaded` handler that subscribes to `window.Session` when present, and skips applying while `setSaving(true)` is in effect;
  - every storage access in `try/catch`; no logging (research R3, R4).
- [X] T009 In `tests/m3-assets.test.ts`, add a failing test that every page in `PAGES` contains exactly one `<script src="/colorScheme.js"></script>`, placed before its first `<link rel="stylesheet">`.
- [X] T010 Add `<script src="/colorScheme.js"></script>` (no `defer`) as the first `<script>` in the `<head>` of each existing page, before `/fonts/fonts.css`. The pages are `src/public/index.html`, `profile.html`, `login.html`, `create-account.html`, `confirm-signin.html`, `accept-terms.html`, `invite.html`, `not-authorized.html`, `privacy.html`, `terms.html`, `admin.html` and `admin-results.html`. Make T009 pass.
- [X] T011 [P] Add the Cookie Use row `<tr data-storage="local" data-name="colorScheme">` to `src/public/privacy.html`, with the text "remembers your color scheme so each page opens in it" and "until you sign out" (FR-013, research R12). Run `npx vitest run tests/cookie-use-list.test.ts`.
- [X] T012 [P] Create `tests/client-site-settings.test.ts` (jsdom via `tests/helpers/browser.ts`), starting with `colorScheme.js` tests:
  - a stored `"dark"` sets `data-theme="dark"` before any other script runs;
  - no key → no attribute;
  - a throwing `localStorage` → no attribute and no error;
  - a session snapshot with `colorScheme: "dark"` → Dark and the key written;
  - a `null` snapshot (a `401`) → no attribute and the key removed (FR-012, FR-015, Clarification Q1).

**Checkpoint**: `npm test` passes. A user's choice can be stored and read through the API, and every page paints from the device copy.

---

## Phase 3: User Story 1 — A signed-in user switches to Dark (P1) 🎯 MVP

**Goal**: the menu item, the Site Settings page, applying and saving the choice, and Dark on every page including the admin pages and the line graph.

**Independent Test**: quickstart scenarios 1 (menu part), 2 and 3.

- [X] T013 [US1] In `tests/client-site-settings.test.ts`, add failing tests:
  - Menu (C1):
    - a signed-in user without permissions sees Edit Profile, Site Settings (`href="/settings"`, not `aria-disabled`), Create Poll, Logout, in that order;
    - a creator sees Poll Administration before Logout;
    - a guest has no menu.
  - Card (C3):
    - title "Site Settings", and `document.title` is "Site Settings";
    - a gear `<svg>` in the subtitle slot;
    - a radiogroup labelled "Color Scheme" with "Light (default)" and "Dark";
    - the session's scheme is checked;
    - no Profile fields.
  - Save (C4):
    - choosing Dark sets `data-theme="dark"` within the same task as the `change` event (no timer or await before it; SC-002) and sends `PATCH /api/me { colorScheme: "dark" }`;
    - re-selecting the radio that is already checked sends no PATCH;
    - three quick changes send at most two PATCHes, the last carrying the final choice.
- [X] T014 [US1] In `src/public/app.js`, rename `ADMIN_GLYPH` to `SETTINGS_GLYPH` (unchanged markup); Poll Administration keeps it only until T025, which comes next. Add the "Site Settings" link (`/settings`, `SETTINGS_GLYPH`) right after "Edit Profile" for every signed-in user, and expose `window.SiteGlyphs = { settings: SETTINGS_GLYPH }` (FR-001, FR-002; C1).
- [X] T024 [US1] In `tests/client-site-settings.test.ts`, add a failing test (do it with T013). Poll Administration's `<svg>` has the `currentColor` circle and three tick paths, and differs from Site Settings' gear. Neither icon contains a literal colour other than `currentColor` and `var(--paper)` (FR-003, FR-004).
- [X] T025 [US1] In `src/public/app.js`, add a new `ADMIN_GLYPH` per C1, a checklist of three rows with a checked box at the left of each, in a dark circle like the gear, and use it for Poll Administration. Trace its shape from `requirements/20261102-134601-site-settings/poll-admin-icon.jpg`: a `currentColor` circle; three rows, each a `var(--paper)` rounded square with a `currentColor` tick and then a `var(--paper)` rounded bar; the middle bar shorter. Make T024 pass, and check it at menu size in both schemes (research R10).
- [X] T015 [US1] In `src/routes/pages.ts`, add `GET /settings`: when `sessions.getSession` finds no session, redirect to `/login`; otherwise serve `page("settings.html")`, as `/profile` does without its verification-result branch. Add the signed-in `200` and signed-out `302 /login` cases to `tests/color-scheme.test.ts` (FR-005; A3).
- [X] T016 [P] [US1] Create `src/public/settings.html` from `profile.html`:
  - the head script first;
  - the same sheets, plus `/site-settings-m3.css` after `/profile-editor-m3.css`;
  - the same scripts, with `/settingsCard.js` in place of `/profileCard.js`;
  - `<title>Site Settings</title>`.

  Add its `PAGES` entry and `"site-settings-m3.css"` (after `"profile-editor-m3.css"`) to `LAYER_ORDER` in `tests/m3-assets.test.ts`.
- [X] T017 [P] [US1] Create `src/public/site-settings-m3.css` per C3: an M3 radio group from tokens only, with 48 px rows, a token-coloured radio, a visible focus ring, and the message line in `--md-sys-color-error`. No literal font sizes and no dark block.
- [X] T018 [US1] Create `src/public/settingsCard.js`. Build the card through `cardShell.js`, as `profileCard.js` builds the Profile card, with:
  - the title "Site Settings", the gear from `SiteGlyphs.settings` in the avatar's slot and size, and the C3 radiogroup;
  - the checked radio taken from `Session.subscribe`, and the card kept in step by it;
  - on `change`, the C4 serialized save, with `lastSaved` set on a `200`.

  Make T013 pass (FR-006–FR-008; research R6, R7).
- [X] T019 [US1] Remove `data-theme="light"` from `<html>` in `src/public/admin.html` and `src/public/admin-results.html` (FR-011; C6).
- [X] T020 [US1] In `tests/line-graph-ui.test.ts`, change the scheme-change test: it now sets `document.documentElement.dataset.theme` instead of firing a `matchMedia` change, and asserts the legend and lines redraw. In `src/public/lineGraph.js`, replace the `matchMedia` listener with a `MutationObserver` on `document.documentElement` (`attributeFilter: ['data-theme']`) that calls `onSchemeChange`, and disconnect it in `unmount` (FR-016; R9, C5).

**Checkpoint**: quickstart scenarios 2 and 3 pass. A user can choose Dark, and every page, admin and graph included, follows it.

---

## Phase 4: User Story 2 — Light is the default for everyone who has not chosen Dark (P1)

**Goal**: the device's dark appearance no longer changes the site.

**Independent Test**: quickstart scenario 5.

- [X] T021 [US2] In `tests/m3-assets.test.ts`, replace the check that pairs each `@media (prefers-color-scheme: dark)` rule with its forced twin by one that no sheet under `src/public` contains `prefers-color-scheme`. The new test fails first (FR-010; C6).
- [X] T022 [US2] Delete every `@media (prefers-color-scheme: dark){ … }` block, keeping the `:root[data-theme="dark"]` rules beside them, in `src/public/m3-tokens.css`, `card-shell-m3.css`, `header-tab-bar-m3.css`, `pollCard-m3.css` and `tabs-modal-m3.css`. Make T021 pass (research R8).
- [X] T023 [US2] In `tests/client-site-settings.test.ts`, add a test: with `matchMedia('(prefers-color-scheme: dark)')` faked to match and no stored copy, a signed-out page and a never-chosen user's page have no `data-theme` attribute (FR-010).

**Checkpoint**: quickstart scenario 5 passes.

---

## Phase 5: User Story 3 — Poll Administration gets its own icon (P2)

**Goal**: the checklist glyph for Poll Administration; the gear stays with Site Settings.

**Independent Test**: quickstart scenario 1 (icons).

- The checklist icon is built in Phase 3 (T024, T025, right after T014), so Site Settings and Poll Administration never share the gear. This phase holds no task of its own; its Independent Test checks that result.

**Checkpoint**: quickstart scenario 1 passes.

---

## Phase 6: User Story 4 — Other tabs follow, and a failed save is undone (P2)

**Goal**: other tabs switch at once, a failed save reverts with a message, and a `401` goes to sign-in.

**Independent Test**: quickstart scenarios 4, 6, 7 and 8.

- [X] T026 [US4] In `tests/client-site-settings.test.ts`, add failing tests:
  - a `500` or a network error reverts `data-theme` and the checked radio to `lastSaved` and shows `Your color scheme could not be saved. Please try again.`;
  - a later successful choice clears the message;
  - a `401` sets `location.href` to `/login`;
  - after a successful save, `Session.refresh` is called once, after the last queued choice;
  - a second page sharing the `auth-state` channel applies Dark when the snapshot it receives says `"dark"` (FR-009, FR-014; C4, R5);
  - while a save of Dark is in flight, a session snapshot saying `"light"` changes neither `data-theme` nor the checked radio; once the save returns `200`, `Session.refresh()` runs and the page shows Dark (C4 step 5);
  - the page shows Light and its save of Light is in flight; another tab saves Dark, and its snapshot arrives; this save then fails. The page and the checked radio end on Dark, the value the account holds (C4 steps 4 and 5).
- [X] T027 [US4] In `src/public/settingsCard.js`, complete C4:
  - call `ColorScheme.setSaving(true)` on each choice, and ignore session updates for the radio while a save is in flight or queued, but still set `lastSaved` from every session update;
  - on failure, drop the queued choice, call `ColorScheme.setSaving(false)`, apply and check `lastSaved`, and show the message in the `role="status"` line;
  - on `401`, go to `/login`;
  - when nothing is left to send, call `ColorScheme.setSaving(false)`, then `Session.refresh()`.

  Make T026 pass.

**Checkpoint**: quickstart scenarios 4, 6, 7 and 8 pass.

---

## Phase 7: Contrast audit (FR-011a, SC-007, Clarification Q2)

**Goal**: no WCAG 2.2 AA contrast failure on any page in either scheme.

**Independent Test**: quickstart scenario 9, and `tests/color-scheme-contrast.test.ts`.

- [X] T028 [P] Create `tests/color-scheme-contrast.test.ts`. It parses the Light `:root` block and the `:root[data-theme="dark"]` block of `src/public/m3-tokens.css`, computes WCAG relative-luminance contrast, and asserts, for each scheme:
  - ≥ 4.5:1 for these text pairs:
    - `on-surface` on `surface` and on each `surface-container*`;
    - `on-surface-variant` on `surface`;
    - `on-primary` on `primary`;
    - `on-secondary` on `secondary`;
    - `on-tertiary` on `tertiary`;
    - `on-error` on `error`;
    - each `on-*-container` on its container;
    - `error` on `surface`;
    - `inverse-on-surface` on `inverse-surface`;
  - ≥ 3:1 for `outline` on `surface` and for `primary` on `surface`.

  Fix any token that fails (research R11).
- [X] T029 Walk quickstart scenario 9 in a browser: all 13 pages in Light and in Dark, including each home tab, a maximized card with its line graph, each admin tab, the wizard, the avatar menu, dialogs and the cookie banner. Record each failure (page, element, colours, ratio) as a sub-item under this task.
  - 2026-11-02: the developer walked scenario 9 in a browser and reported that all manual tests passed. No contrast failure was recorded.
  - Static check (2026-11-02), not yet the browser walk: the token pairs pass in both schemes (T028). The admin pages, no longer pinned to Light, take their page background and text from tokens (`tabs.css` `html,body{ background:var(--paper); color:var(--ink) }`). Their remaining literals are token fallbacks in `admin.css`, plus `styles.css`'s `button` (#FFFFFF on #1F6FEB, 4.6:1 in both schemes). No failure recorded yet; the walk in a browser is still to do.
- [X] T030 Fix every failure recorded in T029 in the sheet that owns the colour. In an M3 layer (`*-m3.css`), fix only by referencing an M3 token; M3 layers hold only M3 tokens. Literal colours, with a `:root[data-theme="dark"]` rule beside them, are allowed only in the production sheets (`src/public/site.css`, `pollCard.css`, `tabs.css`, `styles.css`, `admin.css`), and even there a token reference is preferred. Re-check each fixed element in both schemes (FR-011a; C6).
  - 2026-11-02: nothing to fix; T029 recorded no failure.

**Checkpoint**: quickstart scenario 9 shows no failure.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T031 [P] Update `README.md`: Site Settings, the Color Scheme setting, and Light as the default whatever the device setting. Update `ARCHITECTURE.md`: the `color_scheme` column, the head script and its `localStorage` copy, and scheme sync through the session broadcast (Constitution, Documentation Deliverables).
- [X] T032 [P] Add the feature's decisions to `CLAUDE_COMPLETE.md`, in the form used for earlier features.
- [X] T033 Run `npx tsc --noEmit` and `npm test`, and record the pass and skip counts in this task.
  - 2026-11-02: `npx tsc --noEmit` clean; `npm test` 150 files passed, 1 skipped (151), 0 failed. The per-test count was not captured. The first run failed only `tests/session-cache.test.ts`, whose pattern for the session lookup's SQL now includes `color_scheme`.
- [X] T034 Walk quickstart scenarios 1–8 by hand in two browsers and record the result.
  - 2026-11-02: the developer walked scenarios 1–8 by hand and reported that all passed.

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2**: the baseline comes first.
- **Phase 2 blocks every story**: the column, the API and the head script.
- **US1 (Phase 3)** comes after Phase 2. It is the MVP.
- **US2 (Phase 4)** comes after Phase 2 and is independent of US1. Its CSS edits touch no file US1 touches.
- **US3 (Phase 5)** is delivered inside US1: T024 and T025 run right after T014, so the MVP never shows two gears.
- **US4 (Phase 6)** comes after T018, because it completes `settingsCard.js`.
- **Phase 7** comes after US1 and US2, so the audit sees the final pages in both schemes. T028 can start any time after Phase 2.
- **Phase 8** comes last.

Within a story, the tests come before the code that makes them pass.

Tasks run in the order they are listed. T024 and T025 are listed after T014 and before T015, so they are out of numeric order. They keep their IDs because earlier resolutions in `analyze-findings*.md` cite them.

## Parallel Opportunities

- **Phase 2**: T002, T007, T008, T011 and T012 touch different files. T003 → T004 → T005 → T006 run in order. T009 (the failing test) comes before T010, and T010 needs T008.
- **US1**: T016 and T017 run in parallel with each other and with T014 and T015. T019 and T020 are independent of T013–T018.
- **US2 can run beside US1** once Phase 2 is done. T016 (US1) and T021 (US2) both edit `tests/m3-assets.test.ts`, so whoever lands second rebases onto the other's change.
- **Phase 7**: T028 runs in parallel with T029.
- **Phase 8**: T031 and T032 run in parallel.

```text
# After Phase 2:
Developer A: T013 → T014 → T024 → T025 → T015 → T018 (with T016, T017 in parallel) → T019, T020
Developer B: T021 → T022 → T023, then T028
```

## Implementation Strategy

1. **MVP**: Phases 1–3. A signed-in user can choose Dark and see it everywhere. Validate with quickstart scenarios 2 and 3.
2. **Add US2**: Light becomes the default, and the breaking change for dark devices lands. Validate with scenario 5.
3. **Add US4**: tab sync and failure handling. Validate with scenarios 4, 6, 7 and 8 (the new admin icon, US3, ships with the MVP; scenario 1).
4. **Contrast audit**: Phase 7, then Polish.
