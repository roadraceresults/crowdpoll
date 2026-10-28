---
description: "Task list for 020-LIVE-RESULTS-X"
---

# Tasks: Live Results X

**Input**: Design documents from `specs/020-LIVE-RESULTS-X/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contracts.md,
quickstart.md

**Tests**: Test tasks are included and are **not** optional here. Constitution v1.1.0 Principle IV
requires a verifiable criterion per task and Principle VI treats the suite as documentation; and
SC-006 ("every existing check passes, except those that identify the control by its former corner
position") is only meaningful if the new behaviour is under test too. jsdom does not lay out or
paint, so the icon's geometry and the hover treatment are manual steps in `quickstart.md`;
`document.activeElement` *is* observable in jsdom, so the focus rules are automated.

**Organization**: grouped by user story. The card's markup and the two forms are foundational —
every story reads from them; each story phase then delivers a demonstrable increment with its
tests.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel — different files, no dependency on an incomplete task
- **[Story]**: US1–US3, mapping to the user stories in `spec.md`
- Paths are repository-relative

---

## Phase 1: Setup

**Purpose**: a known-green baseline. This feature adds no dependency, configuration or file, so
setup is the regression baseline SC-006 is measured against.

- [X] T001 Run `npm test` and `npm run build` on the untouched tree and record both as green (file and test counts) in this task's line; every later checkpoint compares against it — *baseline 2026-09-22: 42 files / 649 tests passed, 15 skipped; build clean (23 assets)*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the control's two forms — the markup, the mode, the wording and the deletion of the
corner button. Every story reads from this; nothing is demonstrable until it is done.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 In `src/public/pollCard.js`'s `POLL_CARD_TEMPLATE`, add a sibling to `.live-bars` inside `.live-link`: `<span class="live-x" aria-hidden="true" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg></span>`, between `.live-bars` and `.live-link-label` (research R1; contracts/ui-contracts.md § The control)
- [X] T003 In `src/public/pollCard.js`'s `POLL_CARD_TEMPLATE`, delete the `.card-close-btn` button, its SVG and the FIX025 comment above it from the title row; in `initPollCard`, delete the `closeBtn` lookup, its click handler and the `if (closeBtn) closeBtn.hidden = opts.showClose !== true;` line in `updateActionButtons` (research R6; FR-003)
- [X] T004 [P] In `src/public/pollCard.css`, beside the `.live-bars` rules add `.live-x{ display:flex; align-items:center; justify-content:center; width:14px; height:14px; }`, `.live-x svg{ width:14px; height:14px; display:block; }` and `.live-link .live-bars[hidden], .live-link .live-x[hidden]{ display:none; }` — the last because both spans are `display:flex`, which defeats the plain `hidden` attribute (the sibling rule for `.live-link[hidden]` itself lives in `site.css:301`; these two belong here, beside the rules that size the same spans) (research R1)
- [X] T005 [P] In `src/public/site.css`, delete `.card-front .question-row .card-close-btn{ … }`, `.card-close-btn[hidden]{ display:none; }` and the FIX025 comment above them; leave `.bookmark-btn`'s own `margin` rule untouched so the star returns to the corner every other tab gives it (research R6; FR-004)
- [X] T006 In `src/public/pollCard.js` `initPollCard`, add `const removeMode = typeof opts.onClose === "function";` beside the other element lookups, and in `updateActionButtons` set, when `liveLink` exists and `opts.showLive !== false`: `liveBars.hidden = removeMode`, `liveX.hidden = !removeMode`, `liveLink.title = removeMode ? "Remove from Live Results" : "Add to Live Results"`, and `aria-label` set to the same words in remove form / removed in add form. `updateActionButtons` MUST NOT write `liveLink.hidden` outside its existing `opts.showLive === false` branch — `render()` calls it **last** (`pollCard.js:1016-1023`, after `updateClosedState` and the updaters it chains), so writing `hidden` there would override T008's guards and re-show the link for a closed or being-edited poll on every tab (research R2, R3; FR-002, FR-007, FR-012; contracts/ui-contracts.md § The control)
- [X] T007 In `src/public/pollCard.js`, extract the click handler's body into `activateLiveLink()` — the guest check, then `opts.onClose(opts.pid, poll)` in remove form or `opts.onLive(opts.pid, poll)` in add form — and call it from the existing click handler; add `liveLink?.addEventListener('keydown', …)` that returns unless `event.key` is `Enter`, `' '` or `Spacebar`, then calls `event.preventDefault()` and `activateLiveLink()` (research R4; FR-014)
- [X] T008 In `src/public/pollCard.js`, guard the two lines that hide the link by the form: `updateClosedState`'s `liveLink.hidden = closed` and `updateEditingState`'s `liveLink.hidden = true` both become conditional on `!removeMode`. Do **not** touch `updateBlockedState` — it withdraws only Vote and Submit and never referred to the link (research R3; FR-010, FR-012)
- [X] T009 In `src/public/liveResults.js` `ensureGrid`, change the grid options to `{ showVote: true, onClose: removePoll, tab: TAB }` — dropping `showLive: false` and `showClose: true`, so the link is shown on the tab and its remove form is selected by the handler (research R2; FR-001)
- [X] T010 Run `npm run build` and `npx vitest run tests/client-home.test.ts -t "Live Results"`; the build is clean and the existing Live Results tests now fail where they look for `.card-close-btn` and where the second test asserts no visible link on the tab (they are rewritten in T011–T014) — record which assertions fail so the rewrite is deliberate — *2026-09-22: exactly two, as predicted — `client-home.test.ts:509` (the "no visible link on the tab" assertion) and `:544` (the `.card-close-btn` lookup)*

**Checkpoint**: the Live Results card shows the X link and no corner button; every other tab's
card is untouched.

---

## Phase 3: User Story 1 — Take a poll off the tab from the bottom row (Priority: P1) 🎯 MVP

**Goal**: a member removes a poll from the Live Results tab using the bottom-row link, with the
corner X gone and every other tab unchanged.

**Independent Test**: with two polls on the Live Results tab, press the link on one: that card
goes, the other stays, the tab stays active, the server no longer lists the removed poll. A card
on any other tab still shows the bars, says "Live Results" and adds a poll.

- [X] T011 [US1] In `tests/client-home.test.ts`, in the Live Results describe, replace `closeOf(title)` with `linkOf(title)` returning `card.querySelector(".live-link")`, and rewrite the three corner-X assertions: on Trending the link's `.live-bars` is visible, `.live-x` is hidden and `title` is `Add to Live Results`; on Live Results `.live-x` is visible, `.live-bars` is hidden and `aria-label` is `Remove from Live Results`; and read `src/public/pollCard.css` as text to assert its `prefers-reduced-motion` block and its `.is-guest` rule still name `.live-bars` only — the X is static in every state and neither rule was widened to it (FR-002, FR-005, FR-007, FR-009)
- [X] T012 [US1] In `tests/client-home.test.ts`, in the same describe, assert `document.querySelectorAll(".card-close-btn").length === 0` across the whole page — the button exists nowhere, on any tab, hidden or not (FR-003; SC-002)
- [X] T013 [US1] In `tests/client-home.test.ts`, in the same describe, keep the removal flow but drive it through the link: `linkOf("Stop watching").click()` sends exactly one `DELETE /api/live/<pid>`, drops that card, leaves the other, keeps the Live Results tab active, and leaves the server's registry with only the remaining poll; removing the last card shows the tab's empty line and stops the refresh timer — all as the existing assertions already check (FR-006; SC-001)
- [X] T014 [US1] In `tests/client-home.test.ts`, in the **other** Live Results test ("the tab refreshes on its timer…", around L496-509), rewrite its closing assertion: `'.tab-panel[data-panel="live"] .live-link:not([hidden])'` now matches one link per card in remove form, not zero — assert the count equals the number of watched polls and that each shows `.live-x` (FR-001; the assertion predates this feature and is the one existing check FR-001 reverses)
- [X] T015 [US1] Run `npx vitest run tests/client-home.test.ts` then `npm test`; all green, and `git grep -n "card-close-btn\|showClose" -- src tests` returns nothing

**Checkpoint**: removal works from the bottom row; the add form elsewhere is provably unchanged.

---

## Phase 4: User Story 2 — The control is there whatever the poll is doing (Priority: P2)

**Goal**: a poll that closes while it is watched, or that an administrator opens for editing,
still offers the control — the case that made this more than a move.

**Independent Test**: watch a poll, close it, refresh the tab: the card shows its closed note and
the link; press the link and the poll is removed.

- [X] T016 [US2] In `tests/client-home.test.ts`'s Live Results describe, add a test with its own context — `startTestContext({ ENV_MIN_LIVE_REFRESH_INTERVAL: "300", ENV_MIN_MANUAL_REFRESH_INTERVAL: "1", ENV_MAX_IDLE_TIME: "60000" })`, as the existing removal test uses — so a refresh can be awaited: with a poll on the tab, update it to CLOSED (`polls(live).updateOne({ _id }, { $set: { pollState: "CLOSED", endAt: new Date() } })`), `await livePage.settle(700)` for the timer's next refresh, then assert the card shows its `.poll-closed-message` **and** its `.live-link` is not hidden, its Vote button is hidden, and `linkOf(title).click()` removes the poll (FR-010, FR-011; SC-003)
- [X] T017 [US2] In `tests/client-home.test.ts`, in the same describe, add the add-form counterpart: a CLOSED poll's card has its `.live-link` hidden, unchanged from today (FR-012) — *written against the **Search** tab, not Trending: the trending listing excludes closed polls, so one never appears there*
- [X] T018 [US2] Run `npx vitest run tests/client-home.test.ts -t "Live Results"`; both new tests pass and the US1 tests still do

**Checkpoint**: the control survives every poll state on the Live Results tab, and only there.

---

## Phase 5: User Story 3 — Keyboard, and where focus lands (Priority: P3)

**Goal**: Enter and Space activate the control, and a removal never leaves focus on the document
body.

**Independent Test**: with three polls on the tab, focus the first card's link and press Space
twice without touching the mouse: two polls are removed.

- [X] T019 [US3] In `src/public/tabs.js`'s `createGrid`, add `cardOf: (pid) => mounted.get(pid) || null` to the object the factory returns — the mounted card instance, so `liveResults.js` can reach `.element` without querying the DOM by poll id; add nothing else to the grid's surface (research R5)
- [X] T020 [US3] In `src/public/liveResults.js` `removePoll`, capture `const index = state.order.indexOf(pid);` **before** `window.Tabs.dynamicRequest` applies the server's answer (`DeltaClient.apply` rewrites `state.order` in place); after `ensureGrid().render(state)` and the empty-state branch, focus the `.live-link` of `state.order[index] ?? state.order[index - 1]` as `grid.cardOf(next).element.querySelector(".live-link").focus()` — `cardOf` returns the mounted card instance, whose `element` is the card's `.card-viewport` (`pollCard.js:1192`) — or, when no poll remains, the panel's `.tab-empty` element after setting `tabIndex = -1` on it (research R5; FR-015) — *also required for FR-015 and done here: `createGrid`'s `render` in `src/public/tabs.js` re-appended every card on every render, which moves the focused node and blurs it, so the tab's own refresh threw focus to the body a second after each removal; it now moves a card only when its position actually changed*
- [X] T021 [US3] In `tests/client-home.test.ts`'s Live Results describe, add a keyboard test: with three polls, dispatch `new page.window.KeyboardEvent("keydown", { key: " ", bubbles: true })` on the first card's link → exactly one `DELETE` is sent, the card goes, and `page.document.activeElement` is the next card's `.live-link`; then dispatch `Enter` on the bottom card's link → it goes and focus is on the **previous** card's link; remove the last → focus is the panel's `.tab-empty` (FR-014, FR-015; SC-005)
- [X] T022 [US3] In `tests/client-home.test.ts`, in the same describe, assert the add form's keyboard path: on Trending, `keydown` with `key: "Enter"` on a card's link sends one `POST /api/live/<pid>` and switches to the Live Results tab, as a click does (FR-014)
- [X] T023 [US3] Run `npx vitest run tests/client-home.test.ts` then `npm test`; all green

**Checkpoint**: the control behaves as the button it announces itself to be, and keeps the
member's place.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: the superseded contract, the constitution's documentation deliverables and the
manual validation the suites cannot perform.

- [X] T024 [P] In `specs/017-SEARCH-AND-SCALABILITY-DATABASE/contracts/ui-contracts.md`, annotate the two superseded statements: the "Cards" bullet that says the Live Results button is on every card *except* in Live Results, and the "Live Results tab" section's `DELETE` on remove — both now describe the same link in its remove form; cite `specs/020-LIVE-RESULTS-X/contracts/ui-contracts.md` (FR-016; BC-2)
- [X] T025 [P] Update `README.md` in place: the Live Results bullet describes removing a poll with the **X Live Results** link in the card's bottom row rather than a corner X; keep the file free of references to `specs/`, `designDocs/` and `architecture/` (constitution Documentation Deliverables)
- [X] T026 [P] Update `ARCHITECTURE.md` in place: wherever the poll card's controls or the Live Results tab are described, replace the corner-X description with the link's two forms (bars + "Add to Live Results" elsewhere, X + "Remove from Live Results" there) and note that the control is shown on that tab whatever the poll's state
- [X] T027 Run `npm test` and `npm run build`; compare against T001: every pre-existing test passes except the Live Results assertions rewritten in T011–T014 (SC-006); `git grep -n "FR-0\|T0[0-9][0-9]\b\|020-" -- src` returns nothing new (constitution VI) — *2026-09-22: 42 files / 653 tests passed, 15 skipped; build clean (23 assets); the grep's only hits predate 020*
- [ ] T028 Walk `specs/020-LIVE-RESULTS-X/quickstart.md` manually (US1 steps 1–7, US2 steps 1–6, US3 steps 1–6), covering what jsdom cannot: the 14 px icon geometry and the label's position against another tab, the hover treatment, the refusal notice, the editing and blocked cases, the flipped face, and the visible focus ring; record any discrepancy as a FIX item for `/speckit-fix` — *left for the developer: needs a running server, an admin identity and a browser; everything automated in the quickstart's coverage map is green*

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none — start immediately
- **Foundational (Phase 2)**: T002 → T006/T007 (the span must exist before the mode reads it);
  T003 before T005 (delete the button, then its rules); T004 ‖ T005; T006 before T008; T009 after
  T006 (the grid must not show a link with no form); T010 last. **Blocks every story**
- **US1 (Phase 3)**: after Phase 2. T011 → T012 → T013 → T014 in the same file, so sequential; T015 last
- **US2 (Phase 4)**: after Phase 2; independent of US1's assertions but edits the same test file,
  so run after US1's edits land
- **US3 (Phase 5)**: T020 needs T019 (the accessor before its caller); T021/T022 after T020; independent of US2
- **Polish (Phase 6)**: T024 ‖ T025 ‖ T026 after every story; T027 then T028 last

### Parallel Opportunities

- Phase 2: T004 ‖ T005 while T002/T003/T006/T007/T008/T009 proceed in sequence
- Phase 6: T024 ‖ T025 ‖ T026
- The three test phases all edit `tests/client-home.test.ts`, so they are sequential by file

---

## Parallel Example: Phase 2

```bash
# The two stylesheets, no shared edits:
Task: "Add .live-x rules in src/public/pollCard.css"
Task: "Delete the two .card-close-btn rules in src/public/site.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: baseline
2. Phase 2: the span, the mode, the wording, the keyboard handler, the form-aware hide rules, the
   grid options, the deleted button (T002–T010)
3. Phase 3: the rewritten removal assertions (T011–T015)
4. **STOP and VALIDATE**: remove a poll from the bottom row; check no corner X anywhere; check
   another tab still adds
5. Demo: three polls on the tab, remove the middle one

### Incremental Delivery

1. Phase 2 → the control exists in both forms (verifiable by eye on the Live Results tab)
2. + US1 → removal works from the new position (MVP)
3. + US2 → the control survives a poll closing or being edited
4. + US3 → keyboard activation and focus placement
5. Polish → 017's contract annotated, README and ARCHITECTURE updated, full regression, quickstart

---

## Notes

- Constitution III: `tabs.js` gains one accessor (T019) and nothing else; the Vote button, the
  Bookmark star, the results bars, the messages and every other tab's card are not touched
- Constitution VI: the two FIX025 comments die with the code they describe; no comment in `src/`
  may cite an FR, a task id or "020"
- T008 is the task that makes this more than a move: without the `!removeMode` guards, a poll that
  closes while watched can never be removed
- T020's index must be captured before the request resolves — `DeltaClient.apply` rewrites
  `state.order` in place
- Commit after each phase checkpoint; `npm run build` after T010 and T027 proves the card's assets
  still fingerprint cleanly
