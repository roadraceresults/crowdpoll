---

description: "Task list for the Voting Center feature"
---

# Tasks: Voting Center

**Input**: Design documents from `specs/20261122-012539-VOTING-CENTER-UI/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/ui.md](contracts/ui.md), [quickstart.md](quickstart.md)

**Tests**: Included. The constitution (Principles IV and VI) treats the suite as each requirement's check and
documentation, and research R19 names the suites. Within a story, write or update its tests first and watch them fail.

**Organization**: Tasks are grouped by user story, in the spec's priority order.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: The user story the task belongs to (US1–US6)
- References such as (R4) point to research.md; (V7) to contracts/ui.md

## Path Conventions

Single repository: the client is in `src/public/`, the suites in `tests/`. Most work is in
`src/public/pollCard.js`, so tasks that touch it run one after another.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The token and stylesheet the add-your-own row needs.

- [X] T001 [P] Add `--md-sys-color-surface-container-lowest` to `src/public/m3-tokens.css`: `#FFFFFF` in the light `:root` block (beside `--md-sys-color-surface-container-low`), and `#0A0F0B` in the `:root[data-theme="dark"]` block (R9)
- [X] T002 Rename `src/public/add-choice-m3.css` to `src/public/add-own-m3.css` with `git mv`. Update its `<link>` in `src/public/index.html` (line 29) and the name in `LAYER_ORDER` and the index page's `layers` in `tests/m3-assets.test.ts`. Leave its rules for T020 (R10)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The add-your-own row itself: one builder, the visibility rule, and renderers that keep the row in place
and count it as a bar. US2 and US3 both depend on this phase.

**⚠️ CRITICAL**: US2 and US3 cannot start until this phase is complete. US1, US4, US5 and US6 do not depend on it.

- [X] T003 Add `showsAddOwnRow()` to `initPollCard` in `src/public/pollCard.js`: `mayAddChoice() && poll.choices.length < maxChoices && !isEditing() && !poll.notPublished`, where `maxChoices` comes from `opts.choiceBounds` (default 50). Leave `mayAddChoice()` unchanged (R3)
- [X] T004 Add `createAddOwnRow()` in `src/public/pollCard.js`. It builds:
  - an `li.add-own-item` holding `input.add-own-input`, with `type="text"`, `autocomplete="off"`, `enterkeyhint="enter"`, `maxlength=choiceLabelMax` (default 35), `aria-label="Add your own choice"` and `aria-describedby` pointing to the support line;
  - a `span.add-own-counter`;
  - a separate `p.add-own-support`, with `aria-live="polite"` and `hidden`.

  It sets the hint placeholder: "Enter your own choice, then press ↵." when `matchMedia('(pointer: coarse)')` matches and `(any-pointer: fine)` does not, otherwise "Enter your own choice, then press Enter.". Each card builds two rows, one per face, on first need, and inserts each support line directly after the face's `.bar-scroll-wrap` (R2, R8, V8)
- [X] T005 Change `renderPollResults` and `renderVotingOptions` in `src/public/pollCard.js` to take an `addOwn` row (or `null`):
  - **Clearing**: replace `list.innerHTML = ''` with removing every child except `li.add-own-item`, and insert the new rows before it.
  - **Placing the row**: append it last, after the More / Show-all item, when it is missing; set `hidden` when `addOwn` is `null`.
  - **Sizing**: size the layout for one more bar while it shows, and give the row the bar height (the phone bar or vote-row height in the phone layout).
  - **Results signature**: add whether the row shows to the in-place path's signature and child-count check (R2, R4, R5, V9)
- [X] T006 In `src/public/pollCard.js`, make `render()` pass each face's row when `showsAddOwnRow()` (else `null`), and refresh its placeholder. When the row becomes hidden, clear its text, its support line and `aria-invalid` (R3, R8)

**Checkpoint**: Each face can draw an empty, focusable add-your-own row as its last bar. Nothing is sent yet.

---

## Phase 3: User Story 1 - Clearer voting buttons (Priority: P1) 🎯 MVP

**Goal**: "Cast Your Vote" on the left and Live Results on the right of the front face. The ballot's button reads "Cast
this vote" or "Cast these votes", with Cast on the left and flip-back on the right; the phone vote bar follows. Widths
stay as today.

**Independent Test**: Open an open poll's compact card, read the front action row, open the Voting Center, tick one and
then two choices, and check the Cast label and the button places. Repeat at phone width with a maximized card
(quickstart 1, 2, 10, 15).

### Tests for User Story 1

- [X] T007 [P] [US1] Update `tests/client-remove-vote.test.ts`, `tests/client-home.test.ts`, `tests/client-home-tab.test.ts` and `tests/client-tabs-026.test.ts` to the new labels: "Cast Your Vote" for "Vote", and "Cast this vote" / "Cast these votes" for "Submit vote(s)". Add cases: the label turns to "Cast these votes" at 2 ticked and back at 1, and "Remove vote" is unchanged (V2)
- [X] T008 [P] [US1] In `tests/client-phone-view.test.ts`, assert the `#voteBar` order (submit, count, back) and that its submit text equals the card's Cast label. In `tests/poll-card-assets.test.ts`, in its `pollCard.js card template` describe, assert the front `.actions` children start with `.vote-btn` and the back `.actions` ends with `.back-btn`. In its `site.css` button-sizing describe, assert the `.btn-vote-label{ width:0; min-width:100% }` rule for the three primary buttons and that `.top-submit-btn` is in the grid and stacking rules, and update the existing cases "stacks the Vote label and its sizer in one grid cell" and "carries the width sizer that equalises the two primary buttons" to the new rules and comments (V1, V3, V4, V5)

### Implementation for User Story 1

- [X] T009 [US1] In `POLL_CARD_TEMPLATE` in `src/public/pollCard.js`:
  - move `.vote-btn` before `.live-link`, with its label "Cast Your Vote";
  - move `.back-btn` after `.submit-vote-btn`;
  - set the submit label's initial text to "Cast this vote";
  - bring the comments in the front and back `.actions` regions into line with the constitution's Principle VI: remove the FR/FIX references ("008 FR-007", "012 FR-042", "012 FR-057", "012 FR-058"), correct any that state the old order, and delete any that only describes what the markup does. Leave comments outside these regions as they are (R11, R12)
- [X] T010 [US1] In `src/public/pollCard.js`, change `updateSubmitState` to write "Remove vote" for a removal, otherwise "Cast these votes" when `selectedIds().length >= 2`, else "Cast this vote". Remove `submitLabel` and its assignment in `setText`. Keep the sizer spans' text as today's labels ("Submit votes" or "Submit vote", plus "Remove vote" on a Dynamic-Vote poll) through a constant named for its job, e.g. `WIDTH_SETTING_LABELS`. Rewrite the two sizer comments in `POLL_CARD_TEMPLATE` (front `.vote-btn`, back `.submit-vote-btn`) so they are true: the sizers carry today's width-setting labels, not "every label the back button may show"; drop their "008 FR-007" references (R11, V2)
- [X] T011 [US1] Add `fitLabel(button)` in `src/public/pollCard.js`. It steps the `.btn-vote-label` font size down by 0.5px, to a 9px floor, until the label's own `scrollWidth <= clientWidth` (measure the label, not the button); if it still overflows at the floor, it sets `white-space: normal`. Reset to the stylesheet size before measuring. Call it for `.vote-btn` and `.submit-vote-btn` after every label change and at the end of `render()`, but measure only when the button's label text or `clientWidth` differs from the last fit (keep both per button), so a live refresh that changes neither forces no layout. It relies on T012's `site.css` rule, which takes the label out of the button's width so only the sizers set it (R11, V5)
- [X] T012 [P] [US1] In `src/public/site.css`, change line 332's `.card-front .actions .vote-btn{ margin-left:auto; }` to `.card-front .actions .live-link{ margin-left:auto; }` and correct its FIX017 comment. Add `.top-submit-btn` to the `.vote-btn, .submit-vote-btn` grid and `> *` stacking rules, and add `.vote-btn > .btn-vote-label, .submit-vote-btn > .btn-vote-label, .top-submit-btn > .btn-vote-label{ width:0; min-width:100%; }` so the label no longer sets the width and only the sizers do. Bring the comments in these changed regions into line with Principle VI: in `site.css` (the block above the grid rules, around lines 310–331), remove the "008-POLL-CARD-BACK-SIDE FR-007", "FIX017" and "007-closed-state" references, make the sizer comment true (the sizers carry today's width-setting labels, not "every label the back button may show"), and delete what only describes the rules; in `src/public/pollCard.css`, rewrite or delete the two action-row comments (around lines 482 and 490) so none states the old order or only describes the rules. Leave comments outside these regions as they are (R11, R12)
- [X] T013 [P] [US1] In `src/public/index.html`, reorder `#voteBar`'s children to `.vote-bar-submit`, `.vote-bar-count`, `.vote-bar-back`. Check `src/public/phone-card-m3.css` `.vote-bar` rules that assume the back button is first (e.g. `.vote-bar-back` margins) and swap them to match. In the regions changed, remove FR/FIX/feature references from existing comments and delete comments that only describe the markup or rules (R12, V4)

**Checkpoint**: US1 is complete. Labels and places are right on every card, and the button widths are as before.

---

## Phase 4: User Story 2 - Add your own choice in the Voting Center (Priority: P1)

**Goal**: The Add Choice dialog is gone. The Voting Center's last bar is the add-your-own row, which adds a choice on
Enter with the dialog's checks, a "Choice added" snackbar, the selection kept, and text and focus that survive live
updates.

**Independent Test**: As a voter of a Private poll that lets voters add choices, open its Voting Center (compact, then
maximized), type a choice, press Enter, and confirm it is the last choice for this voter and a second one; vote from
another window while typing (quickstart 2–5, 7, 13, 16).

### Tests for User Story 2

- [X] T014 [US2] Rewrite `tests/client-add-choice.test.ts` for the row on the voting face, compact and maximized. Cover:
  - **Visibility**: shown for an eligible voter; absent for a guest, a Public poll, a closed poll, a final vote (but present for the creator), a poll at `maxChoices` and an editing poll (V7).
  - **Field**: its attributes and both placeholders (V8).
  - **Enter**: one POST with the trimmed label; the field empty and focused afterwards; ticks kept; the new choice unticked; an `.m3-snackbar` reading "Choice added" (V10).
  - **Checks**: empty and duplicate send nothing; the duplicate message shows; the counter; paste flattening; Escape (V11).
  - **Refusals**: 429, a server error text, a network failure (V12).
  - **No dialog**: no `.add-choice-btn` and no `window.AddChoiceDialog` (V6).
  - **Live update while typing**: an `applyPoll` keeps the same input element, value, selection and focus (V15).
  - **Grid reorder while typing**: the row keeps focus and caret (V15).
  - **A full ballot**: a compact ballot that fits only without the row opens maximized (R4).
  - **Turn-back while typing**: a compact Voting Center whose row has focus or text stays flipped when an `applyPoll` adds another voter's choice and the ballot no longer fits; the next `applyPoll` after the row is blurred and emptied turns it back (R4, FR-025).
  - **Filling the poll**: an addition that brings the poll to `maxChoices` hides the row and moves focus to the enabled Cast button, or to `.maximize-btn` when Cast is disabled; on a results face, to `.vote-btn`, or to `.maximize-btn` when it is hidden (FR-011)

### Implementation for User Story 2

- [X] T015 [US2] In `src/public/pollCard.js`, wire the voting-face row's input:
  - **On input**: clear the refusal; show "This poll already has that choice." when `keyOf(value)` matches a choice in `poll.choices`; update the counter (`n / max`, shown while there is text).
  - **On paste**: flatten line breaks to spaces and cut at the maximum.
  - **Escape**: empties the field.
  - **Enter**: ignored while busy, empty or duplicate; otherwise call `saveChoice(value.trim())`.
  - **On `{ok}`**: empty the field, keep focus, call `window.SharePoll.snackbar('Choice added')`. When the addition brings the poll to `maxChoices` (the row is now hidden), focus instead the face's primary button (the Cast button on the Voting Center, `.vote-btn` on the results face) if it is shown and enabled, else the face's `.maximize-btn`.
  - **Otherwise**: keep text and focus, set `aria-invalid`, and show "Please wait a moment and try again." for 429, the server's `error` text when there is one, else "Your choice could not be added. Please try again."

  Move `keyOf` and the three message constants from `addChoiceDialog.js` into `pollCard.js` (R7, V10–V12)
- [X] T016 [US2] In `src/public/pollCard.js`, put the wiring of T015 in one function used for both rows, so US3 only attaches it. Clear the row's text, support line and `aria-invalid` on flip (Voting Center, `.back-btn`, a successful cast) and in `setMaximized` (R2, FR-025)
- [X] T017 [US2] In `src/public/pollCard.js`, make `ballotOpensMaximized()` compare `data.length + (showsAddOwnRow() ? 1 : 0)` with `capacity(votingWrap)` on the desktop path; the phone path is unchanged. In `render()`, skip the forced turn-back (`ballotOpensMaximized()` on a flipped compact card) while the voting row's input has focus or holds text, so it happens at the first render once the row is both left and empty (R4, FR-025)
- [X] T018 [US2] Remove the dialog path from `src/public/pollCard.js`: the `.add-choice-btn` button in `POLL_CARD_TEMPLATE`, `addChoiceBtn`, its click handler, `updateAddChoice()` and its call in `render()`, `latestDetail()`, and `.card-face .add-choice-btn` in the `M3Ripple.add` selector. Keep `saveChoice` and `applyAddedChoices` (R7, R10, V6)
- [X] T019 [P] [US2] Delete `src/public/addChoiceDialog.js` and its `<script>` tag in `src/public/index.html` (line 210). Drop `addChoiceDialog.js` from the index page's `scripts` in `tests/m3-assets.test.ts` and `.card-face .add-choice-btn` from `tests/phone-sheets.test.ts`. Remove the `.add-choice-btn` rules from `src/public/phone-card-m3.css` (around lines 154 and 167), with any comment that belongs only to them; in the surrounding region, remove FR/FIX/feature references from comments that stay (R10)
- [X] T020 [US2] After T019 (both edit `tests/phone-sheets.test.ts` and `src/public/phone-card-m3.css`), replace the contents of `src/public/add-own-m3.css` with the row's rules, tokens only:
  - **Row**: `li.add-own-item` filled with `--md-sys-color-surface-container-lowest`, a 1px `--md-sys-color-outline` border and the bars' corner radius; the input spans the row with no border of its own, text `--md-sys-color-on-surface`; `::placeholder` in `--md-sys-color-on-surface-variant`, italic.
  - **Focus**: `:focus-within` gives a 2px `--md-sys-color-primary` border.
  - **Counter**: `.add-own-counter` is right-aligned inside the row, in `--md-sys-color-on-surface-variant`.
  - **Support line**: `.add-own-support` in `--md-sys-color-error` with `[hidden]{display:none}`.
  - **Phone**: add a phone touch-target rule in `src/public/phone-card-m3.css` if the row needs one, and list its selector in `tests/phone-sheets.test.ts` (R9, V8)
- [X] T021 [US2] In `createGrid`'s `render` in `src/public/tabs.js`, before placing cards, note `document.activeElement` if it matches `.add-own-input`, with its `selectionStart`/`selectionEnd`. After placing, if it is still connected and no longer focused, re-focus it with `{ preventScroll: true }` and restore the selection (R18, V15)

**Checkpoint**: US2 is complete. Choices are added only from the row; the dialog is gone; live updates and grid
reorders never disturb typing.

---

## Phase 5: User Story 3 - Add your own choice from the results face (Priority: P2)

**Goal**: The same row is the last bar of every results face, after "More choices"; adding there leaves the card on its
results.

**Independent Test**: Add a choice from a compact Home card's results face and from a maximized results face; the card
neither flips nor maximizes, and the new 0% bar appears (quickstart 1, 6).

### Tests for User Story 3

- [X] T022 [US3] Extend `tests/client-add-choice.test.ts` with results-face cases:
  - the row is the last child of `.results-list`, after `.more-row` when shown, on a compact card and a maximized one (V7);
  - a click in the row changes neither `is-flipped` nor the maximized state (V13);
  - a full compact card shows one fewer result before "More choices" (V9);
  - after adding, the card is on its results face and the new choice's bar shows 0%;
  - another mounted copy of the poll shows it too (V14);
  - a viewer who may not add sees today's bars (V7)

### Implementation for User Story 3

- [X] T023 [US3] In `src/public/pollCard.js`, attach the results-face row (built by T004, wired by T016) in `render()`. Make `fitting()` reserve its place: `places - addOwn` when everything else fits, and `places - 1 - addOwn` when a "More choices" row is needed (R4, V9)
- [X] T024 [US3] In `src/public/pollCard.js`, make the `resultsList` click handler return at once when `event.target.closest('.add-own-item')`, so a click only focuses the field (R6, V13)

**Checkpoint**: US3 is complete. Every face that shows bars offers the row to eligible viewers.

---

## Phase 6: User Story 4 - Long ballots keep their buttons in reach (Priority: P2)

**Goal**: A desktop maximized ballot of 10 or more choices shows a divider and a second action row under its title.
Multiple-choice ballots show the help line under every action row with a Cast button.

**Independent Test**: Maximize the Voting Center of a 12-choice multiple-choice poll on the desktop and cast from the
top row; then check a 9-choice poll, the phone layout and a compact card (quickstart 8, 9).

### Tests for User Story 4

- [X] T025 [US4] Add cases to `tests/client-maximized.test.ts`:
  - the top row and divider are shown at 10 choices and hidden at 9, at phone width and on a compact card (V16);
  - the top Cast button mirrors the bottom one's label, `disabled` and `hidden` as choices are ticked, and casts; the top flip-back flips; the top row comes first in document order (V17);
  - `.multi-help` is under each shown row on a Multiple-Choice poll and absent on a Single-Choice poll (V18)

### Implementation for User Story 4

- [X] T026 [US4] In `POLL_CARD_TEMPLATE` in `src/public/pollCard.js`, add to the back face, after its `.question-wrap`:
  - `<hr class="top-divider" hidden>`;
  - `<div class="actions actions--top" hidden>` holding a `btn-primary btn-vote top-submit-btn` (label span and sizer spans like the bottom button) and an `icon-btn top-back-btn` (the same icon and `aria-label` as `.back-btn`);
  - `<p class="multi-help" hidden>You may select more than one choice.</p>`.

  Add another `p.multi-help` after the bottom back-face `.actions`. In the regions these additions change (after the back `.question-wrap`, and between the back `.actions` and `.card-foot`), remove the FR/FIX references from the existing comments ("008 FR-004 / FIX022", "FR-001") and delete any comment that only describes what the markup does (R13, R14)
- [X] T027 [US4] Add `syncTopRow()` in `src/public/pollCard.js`. It shows the divider and top row when `isMaximized && !isPhoneLayout() && poll.choices.length >= 10 && !submitBtn.hidden`, copies the bottom label text, sizer text, `disabled` and `hidden`, and calls `fitLabel` on the top button. It also shows each `.multi-help` when `poll.choiceMode === 'Multiple-Choice Poll'` and its row's Cast button is shown. Call it at the end of `render()` and `updateSubmitState()`. Wire `.top-submit-btn` clicks to `submitBtn.click()` and `.top-back-btn` clicks to the `.back-btn` click. Add `.card-face .top-back-btn` to the `M3Ripple.add` selector (R13, R14, V16–V18)
- [X] T028 [P] [US4] In `src/public/pollCard-m3.css`, using tokens only:
  - `.top-divider`: a 1px `--md-sys-color-outline-variant` rule with no margin beyond the card's spacing;
  - `.actions--top`: the bottom row's layout (Cast left, flip-back right);
  - `.top-back-btn`: the same look as `.back-btn`, by adding it to the existing `.card-face .back-btn` selectors;
  - `.multi-help`: `--md-sys-color-on-surface`, `--md-sys-typescale-label-large-weight`, upright, `text-align:end`;
  - `[hidden]{display:none}` for the three.

  In the `.card-face .back-btn` region it changes, remove FR/FIX/feature references from existing comments and delete comments that only describe the rules (R13, R14)

**Checkpoint**: US4 is complete.

---

## Phase 7: User Story 5 - Follow instead of Watch (Priority: P3)

**Goal**: The maximized Voting Center shows Share, Follow and Minimize, and every user-visible "Watch" reads "Follow".
Identifiers and old links are unchanged.

**Independent Test**: Follow a poll from a maximized Voting Center; the front shows it followed. Read the tab bar, the
tooltips and the Following tab's reason line, and open an old `/?tab=watching&PID=…` link (quickstart 11, 12).

### Tests for User Story 5

- [X] T029 [P] [US5] In `tests/client-maximized.test.ts`, add cases:
  - a maximized back face shows `.share-btn`, `.bookmark-btn`, `.maximize-btn` in that order (V19);
  - pressing it calls the bookmark route, and both faces' `aria-pressed` agree;
  - a compact back face's `.bookmark-btn` is not displayed.

  In `tests/client-tab-address.test.ts`, add a case: opening `/?tab=watching` selects the `[data-tab="watching"]` tab, whose label reads "Following"; `tests/shared-link-tab.test.ts`'s `tab=watching` cases must pass unchanged (FR-023, SC-006).

  Update every suite asserting Watch wording (`tests/client-home.test.ts`, `tests/client-home-tab.test.ts`, `tests/client-tabs-026.test.ts` and any found by searching `tests/` for "Watch this poll", "Stop watching", "You are watching", "aren't watching", ">Watching") to the new texts (V20)

### Implementation for User Story 5

- [X] T030 [US5] In `src/public/pollCard.js`:
  - **Template**: add a `.bookmark-btn` (the same markup as the front's) to the back face's `.question-row`, between `.share-btn` and `.maximize-btn`; set the template default `aria-label="Follow"` and `title="Follow this Poll"` on both.
  - **One set of buttons**: replace `bookmarkBtn` with `bookmarkBtns` (all of the card's); apply `updateActionButtons`, `updateStateMessage` and `syncTitleIcons` to each (`has-bookmark` per row); add the click handler to each.
  - **Wording**: `aria-label` "Following" / "Follow", `title` "Stop following this Poll" / "Follow this Poll", and the listed-because word `bookmarked: 'You are following'`.
  - **Title icons**: make `syncTitleIcons` read the button's computed display, not only `hidden`, so the compact back row does not get `has-bookmark` (R15, R16, V19, V20)
- [X] T031 [P] [US5] In `src/public/pollCard-m3.css`, add `.card-flip:not(.maximized-card-flip) .card-back .bookmark-btn{ display:none; }` (R15)
- [X] T032 [P] [US5] In `src/public/tabs.js`:
  - Home's empty text: "…the polls you follow…".
  - The watching tab's empty text: "You aren't following any polls yet."
  - The bookmark-cap modal: "You have reached the maximum number of polls you can follow. The limit is n. Please stop following a poll on the Following tab before following another."

  In `src/public/index.html`, change the tab label "Watching" to "Following". Keep `data-tab="watching"`, the ids, `TAB_NAMES` and the `#watching-eye` symbols (R16, V20, V21)

**Checkpoint**: US5 is complete.

---

## Phase 8: User Story 6 - "Vote Cast Date" in Who Voted (Priority: P3)

**Goal**: The Who Voted table's date column reads "Vote Cast Date" in both orders.

**Independent Test**: Open Who Voted for a non-anonymous poll and switch between its two orders (quickstart 14).

- [X] T033 [P] [US6] Update `tests/client-who-voted.test.ts` to expect "Vote Cast Date" as the third heading in both orders (V22)
- [X] T034 [P] [US6] In `src/public/whoVoted.js:217`, change both heading arrays' "Date" to "Vote Cast Date" (R17)

**Checkpoint**: All user stories are complete.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T035 Run `npx tsc --noEmit`, then `npm test`; fix any suite still expecting old wording, order or the dialog
- [X] T036 Run `npm run build` and `npm run test:built`. Confirm the build reports no missing page reference and every client file in scope is transformed (the removed `addChoiceDialog.js`, the renamed `add-own-m3.css`)
- [X] T037 [P] Update `README.md` at the project root (post-implementation deliverable):
  - the Vote / Submit paragraphs (around lines 62 and 183–190) become Voting Center / Cast this vote / Cast these votes, with the new button places and the help line;
  - the Add Choice paragraph (lines 68–72) becomes the add-your-own row on both faces, with the "Choice added" confirmation;
  - the Watch / Watching paragraphs (lines 5, 37, 50, 81–84, 118, 343) become Follow / Following;
  - Who Voted's column becomes "Vote Cast Date".

  Keep the README self-contained (no references to specs)
- [X] T038 [P] Update `ARCHITECTURE.md` at the project root (post-implementation deliverable), only where it describes the client side of adding a choice or the Watch wording users see. Keep identifiers such as `mayWatch` and `bookmarked`
- [ ] T039 Run the manual scenarios 1–16 in `specs/20261122-012539-VOTING-CENTER-UI/quickstart.md` in light and dark themes, at desktop and phone widths

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none. T001 and T002 are independent.
- **Foundational (Phase 2)**: T003 → T004 → T005 → T006 (all in `pollCard.js`). Blocks US2 and US3 only.
- **US1 (Phase 3)**: starts after Setup. Independent of Phase 2.
- **US2 (Phase 4)**: needs Phase 2, and T002 for T020.
- **US3 (Phase 5)**: needs Phase 2 and T016 (the shared wiring).
- **US4, US5, US6**: start after Setup. Independent of Phase 2 and of each other.
- **Shared files across stories**: tasks in different stories that edit the same file run in ID order, even when
  marked [P]: `src/public/pollCard-m3.css` (T028, T031), `src/public/index.html` (T002, T013, T019, T032),
  `src/public/phone-card-m3.css` (T013, T019, T020) and `src/public/tabs.js` (T021, T032); and the suites `tests/client-maximized.test.ts` (T025, T029),
  `tests/client-home.test.ts`, `tests/client-home-tab.test.ts` and `tests/client-tabs-026.test.ts` (T007, T029) and
  `tests/m3-assets.test.ts` (T002, T019).
- **Polish (Phase 9)**: after every story wanted.

### Within Each User Story

- Tests first, and they fail before implementation.
- Every task touching `src/public/pollCard.js` runs one after another, in ID order: T003–T006, T009–T011, T015–T018,
  T023–T024, T026–T027, T030.
- CSS, HTML, `tabs.js`, `whoVoted.js` and test-file tasks marked [P] run beside them.

### Parallel Opportunities

- T001 ∥ T002.
- US1: T007 ∥ T008 ∥ T012 ∥ T013, beside the `pollCard.js` tasks T009–T011.
- US2: T019 then T020, ∥ T021, beside T015–T018.
- US4: T028 beside T026–T027. US5: T029 ∥ T031 ∥ T032 beside T030. US6: T033 ∥ T034.
- US6 can be done at any time; US5's `tabs.js` and `index.html` wording (T032) does not depend on its `pollCard.js` task.

---

## Parallel Example: User Story 2

```bash
# While T015–T018 change src/public/pollCard.js in sequence:
Task: "T019 Delete src/public/addChoiceDialog.js and its references (index.html, m3-assets, phone-sheets, phone-card-m3.css)"
Task: "T020 Write the row's token-only styles in src/public/add-own-m3.css"
Task: "T021 Restore a moved row's focus and caret in createGrid's render in src/public/tabs.js"
```

---

## Implementation Strategy

### MVP First (User Story 1, then 2)

1. Phase 1 Setup.
2. Phase 3 (US1): labels and places. Validate with quickstart 1, 2, 10 and 15.
3. Phase 2, then Phase 4 (US2). Validate with quickstart 2–5, 7, 13 and 16. US2 must ship with or before removing the
   dialog: T018 and T019 belong to it, so voters are never left without a way to add a choice.

### Incremental Delivery

US1 → US2 (MVP: both P1) → US3 → US4 → US5 → US6 → Polish. Each story leaves the card working and the suite passing.

---

## Notes

- [P] tasks touch different files and depend on no unfinished task.
- New code carries no comments naming FRs, tasks or research ids (Principle VI). Existing comments in a region being
  changed are brought into line with Principle VI; comments elsewhere are left alone (Governance scope clause).
- Identifiers stay: `watching`, `bookmark*`, `mayWatch`, `.submit-vote-btn`, `.back-btn`.
- Commit after each task or logical group.
