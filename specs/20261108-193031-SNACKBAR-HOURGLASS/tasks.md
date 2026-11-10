# Tasks: Snackbar Hourglass

**Input**: Design documents from `specs/20261108-193031-SNACKBAR-HOURGLASS/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R10), data-model.md, contracts/ui-contracts.md (C1–C5), quickstart.md

**Tests**: included. The plan (R10) and the constitution (IV. Goal-Driven Execution) call for them, and an existing suite pins the notice's duration.

**Organization**: grouped by user story; the change is small, so Setup and Foundational phases are short.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: the user story the task belongs to (US1, US2)

---

## Phase 1: Setup

**Purpose**: confirm the starting point.

- [X] T001 Run `npx vitest run tests/client-sign-in-notice.test.ts tests/m3-assets.test.ts` and confirm both pass before any change (baseline for `NOTICE_MS = 6000` and the snackbar sheet rules in `src/public/snackbar-m3.css`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the one duration constant both clocks share (research R4).

- [X] T002 In `src/public/app.js`, change `SIGN_IN_NOTICE_MS` from `6000` to `7000`, and in `tests/client-sign-in-notice.test.ts` change `NOTICE_MS` to `7000`. Update that suite's "six seconds" wording (the helper's doc comment and the first test's name) to "seven seconds"

**Checkpoint**: `npx vitest run tests/client-sign-in-notice.test.ts` passes with the 7 s timer.

---

## Phase 3: User Story 1 - A member sees how long the "Logged in as" notice will stay (Priority: P1) 🎯 MVP

**Goal**: the notice shows an hourglass at its right end, whose sand drains smoothly once over the notice's 7 seconds, in a 48 px bar.

**Independent Test**: quickstart rows 1–5 and 11, and `tests/client-sign-in-notice.test.ts`.

### Tests for User Story 1

- [X] T003 [P] [US1] In `tests/client-sign-in-notice.test.ts`, extend the first `the snackbar (C4)` test, or add one beside it, to assert (contracts C2):
  - the bar has class `m3-snackbar--timed`;
  - `bar.style.getPropertyValue("--m3-snackbar-timer")` is `"7000ms"`;
  - the bar's first child is `span.m3-snackbar-text` with text `Logged in as <email>`;
  - its last child is `svg.m3-snackbar-hourglass` with `viewBox="0 0 22 32"`, holding one each of `.hourglass-frame`, `.hourglass-top`, `.hourglass-stream` and `.hourglass-bottom`, the last three also carrying `.hourglass-part`;
  - `bar.textContent` is still exactly `Logged in as <email>`.

  The test must fail before T005.
- [X] T004 [P] [US1] In `tests/m3-assets.test.ts`, add a test beside "lifts the snackbar above the cookie banner" that reads `snackbar-m3.css` and asserts (contracts C3, C4):
  - `.m3-snackbar--timed` sets `padding-block:8px`;
  - `.m3-snackbar-text` has `flex:1 1 auto`, `min-width:0` and `overflow-wrap:anywhere`;
  - `.m3-snackbar-hourglass` has `flex:none`, `width:22px`, `height:32px` and `margin-inline-start:12px`;
  - the frame's stroke is `var(--md-sys-color-inverse-on-surface)` and the sand's fill is `var(--md-sys-color-inverse-primary)`;
  - `.hourglass-part` uses `transform-box:fill-box`, `animation-duration:var(--m3-snackbar-timer)`, `animation-timing-function:linear` and `animation-fill-mode:forwards`;
  - no rule in `snackbar-m3.css` selects both `is-shown` and an `hourglass` class.

  The test must fail before T006.

### Implementation for User Story 1

- [X] T005 [US1] In `src/public/app.js`, add a function (e.g. `buildHourglass()`) that returns the SVG of data-model.md, built with `document.createElementNS("http://www.w3.org/2000/svg", …)`:
  - the `svg` has `class="m3-snackbar-hourglass"`, `viewBox="0 0 22 32"`, `width="22"` and `height="32"`;
  - `path.hourglass-frame` is the two-bulb outline with a neck at y=16 and cap bars at top and bottom, matching the silhouette of `requirements/20261108-193031-snackbar-hourglass/snackbar_hourglass_7_seconds.gif`;
  - `path.hourglass-top.hourglass-part` is the top bulb's sand down to the neck;
  - `rect.hourglass-stream.hourglass-part` is about 1 px wide, from the neck to the bottom heap;
  - `path.hourglass-bottom.hourglass-part` is the bottom heap.

  Then change `showSignInNotice` (contracts C2):
  - the bar's class gains `m3-snackbar--timed`;
  - `bar.style.setProperty("--m3-snackbar-timer", SIGN_IN_NOTICE_MS + "ms")`;
  - inside the existing `requestAnimationFrame` callback, replace `bar.textContent = …` with a `span.m3-snackbar-text` whose `textContent` is `"Logged in as " + me.emailAddress`, followed by `buildHourglass()`, before `is-shown` is added and the timer started.

  No comment citing the spec (constitution VI).
- [X] T006 [US1] In `src/public/snackbar-m3.css`, after `.m3-snackbar.is-shown`, add the `.m3-snackbar--timed` rules of contracts C3 and C4 (research R2, R3, R6, R7):
  - **Layout**: `padding-block:8px`; the `.m3-snackbar-text` and `.m3-snackbar-hourglass` rules.
  - **Colours**: frame `fill:none; stroke:var(--md-sys-color-inverse-on-surface); stroke-width:1.5; stroke-linejoin:round; stroke-linecap:round`; parts `fill:var(--md-sys-color-inverse-primary)`.
  - **Resting pose**: top `transform:scaleY(1)` with `transform-origin:50% 100%`; bottom `transform:scaleY(0)` with `transform-origin:50% 100%`; stream `opacity:0`.
  - **Animation**: `.m3-snackbar--timed .hourglass-part` takes `transform-box:fill-box`, `animation-duration:var(--m3-snackbar-timer)`, `animation-timing-function:linear`, `animation-fill-mode:forwards`, and `animation-iteration-count:1`, with `animation-name` set per part.
  - **Keyframes**:
    - `m3-hourglass-top`: `from{transform:scaleY(1)} to{transform:scaleY(0)}`;
    - `m3-hourglass-bottom`: `from{transform:scaleY(0)} to{transform:scaleY(1)}`;
    - `m3-hourglass-stream`: `0%,98%{opacity:1} 100%{opacity:0}`.

  M3 tokens only, no literal font size.
- [X] T007 [US1] Verify User Story 1.
  - **Automated (the implementer runs these)**:
    - `npx vitest run tests/client-sign-in-notice.test.ts tests/m3-assets.test.ts`: T003 and T004 now pass;
    - in a browser, open `/?signedIn=1` on a signed-in session (a forged test session or an emailed-link login, no provider needed) and check quickstart rows 1, 2, 4, 5 and 11: hourglass at the right end, a smooth single drain, 48 px bar with 22 × 32 hourglass and 12 px gap, wrapping at 320 px, no added request;
    - adjust the T005 paths until the drawing matches the reference silhouette.
  - **Developer to verify** (listed in the implementation summary as not yet verified): quickstart row 1 with a real provider login, and row 3, the top bulb emptying within 0.2 s of the fade (SC-002).

**Checkpoint**: User Story 1 is complete. The notice shows a draining hourglass in the light theme, and the bar stays 48 px.

---

## Phase 4: User Story 2 - The hourglass is clear in both themes and for every reader (Priority: P2)

**Goal**: the hourglass is visible in the dark theme, stands still under reduced motion, and is silent to screen readers.

**Independent Test**: quickstart rows 6–8, plus the assertions below.

### Tests for User Story 2

- [X] T008 [P] [US2] In `tests/client-sign-in-notice.test.ts`, assert that the notice's `svg.m3-snackbar-hourglass` has `aria-hidden="true"` and `focusable="false"`, and holds no `title` or `text` element (contracts C2, research R8)
- [X] T009 [P] [US2] In `tests/m3-assets.test.ts`, extend the T004 test to assert that `snackbar-m3.css`'s `@media (prefers-reduced-motion: reduce)` block contains `.m3-snackbar--timed .hourglass-part{ animation:none; }` (contracts C4, research R5)

### Implementation for User Story 2

- [X] T010 [US2] In `buildHourglass()` in `src/public/app.js`, set `aria-hidden="true"` and `focusable="false"` on the `svg`
- [X] T011 [US2] In `src/public/snackbar-m3.css`, add `.m3-snackbar--timed .hourglass-part{ animation:none; }` inside the existing `@media (prefers-reduced-motion: reduce)` block
- [X] T012 [US2] Verify User Story 2.
  - **Automated (the implementer runs these)**:
    - `npx vitest run tests/client-sign-in-notice.test.ts tests/m3-assets.test.ts`: T008 and T009 pass;
    - in a browser at `/?signedIn=1`, check quickstart row 6 (the dark theme via the site's own setting) and row 7 (DevTools reduced-motion emulation: still, full, no stream);
    - confirm the contrast ratios in research R7 still hold against `src/public/m3-tokens.css`: outline and sand each at least 3:1 against `--md-sys-color-inverse-surface` in both themes (SC-004).
  - **Developer to verify** (listed in the implementation summary as not yet verified): quickstart row 8, a screen reader announcing only "Logged in as <email>".

**Checkpoint**: both stories work on their own; the notice is right in both themes, with reduced motion and with a screen reader.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T013 Confirm scope.
  - **Automated (the implementer runs these)**: quickstart row 9 (since TWEAK01, the notice after an emailed-link login; row 9a, no notice after a reload) and row 10 (the admin "Link copied" snackbar is unchanged, with no hourglass).
  - **Developer to verify** (listed in the implementation summary as not yet verified): quickstart row 12, the notice starting only when a background tab is shown.
- [X] T014 Run `npx tsc --noEmit` and `npm test`; the whole suite passes
- [X] T015 [P] Documentation (constitution, Documentation Deliverables), in `README.md` and `ARCHITECTURE.md`:
  - in `README.md` (line ~425), change "for about 6 seconds on the first page" to say the notice stays 7 seconds, with an hourglass that empties as it goes;
  - in `ARCHITECTURE.md`, beside the `signedIn=1` sentence (line ~1220), add that `showSignInNotice` builds the hourglass as an inline SVG timed by `SIGN_IN_NOTICE_MS` through `--m3-snackbar-timer`.
- [X] T016 [P] In `CLAUDE_COMPLETE.md`, add this feature's decisions as for earlier features (the same summary as the `CLAUDE.md` SPECKIT block)
- [X] T017 (TWEAK01) In `src/routes/api.ts`, `completeSignIn` lands an emailed-link login on `/?signedIn=1` or `/?PID=<pid>&signedIn=1`, so the notice follows it too; the landing addresses asserted in `tests/auth.test.ts`, `oauth-modes.test.ts`, `signin-binding.test.ts`, `signin-pid.test.ts`, `session.test.ts`, `profile.test.ts`, `create-account-link.test.ts` and `invitations-redeem.test.ts` gain `signedIn=1`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: after T001; blocks both stories (the suite's timer constant).
- **US1 (Phase 3)**: after T002.
- **US2 (Phase 4)**: after T005 and T006, which create the SVG and the sheet rules that US2 refines; its tests (T008, T009) can be written alongside US1's.
- **Polish (Phase 5)**: after both stories.

### Within Each Story

- Tests first (T003/T004, then T008/T009), confirmed failing, then the implementation.
- T005 (script) and T006 (sheet) touch different files, but T007 needs both.

### Parallel Opportunities

- T003 ∥ T004 (different test files).
- T008 ∥ T009 (different test files).
- T010 ∥ T011 (script vs sheet).
- T015 ∥ T016 (different documents).

---

## Parallel Example: User Story 1

```text
Task: "T003 hourglass markup assertions in tests/client-sign-in-notice.test.ts"
Task: "T004 timed-snackbar sheet assertions in tests/m3-assets.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001–T002: baseline, then the 7 s constant.
2. T003–T007: the hourglass in the notice, drawn and animated.
3. **Stop and validate**: quickstart rows 1–5 and 11.

### Incremental Delivery

1. US1: a draining hourglass in the light theme (its token colours already cover the dark theme).
2. US2: reduced motion and screen readers; the dark theme is confirmed.
3. Polish: scope checks, the full suite, documentation.

---

## Notes

- No migration, route, setting, cookie, file or dependency; `postman/openapi.json`, `privacy.html` and `LAYER_ORDER` are unchanged.
- Code comments follow constitution VI: none that cite this spec, its findings or task ids.
- Commit after each phase.
