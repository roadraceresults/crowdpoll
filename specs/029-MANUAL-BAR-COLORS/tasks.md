---
description: "Task list for 029-MANUAL-BAR-COLORS"
---

# Tasks: Manual Bar Colors

**Input**: Design documents from `specs/029-MANUAL-BAR-COLORS/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui-contracts.md, quickstart.md

**Tests**: Included, and not optional. FR-019 requires them and Constitution Principle IV requires a verifiable criterion per task. SC-003 to SC-005 and SC-007 are asserted by the suites named below; the visible result is `quickstart.md` scenarios 2 to 6.

**Organization**: by user story. The server and the browser are edited in a few shared files (`src/polls/service.ts`, `src/routes/pollsApi.ts`, `src/public/adminCard.js`, `src/public/pollCard.js`), so tasks that touch the same file are sequential; `[P]` appears only where the files differ. There is no database or migration task. US1 (P1, set colours) and US2 (P1, voters see them) are the MVP together; US3 and US4 (P2) and US5 (P3) follow.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel: different files, no dependency on an incomplete task
- **[Story]**: US1 to US5, mapping to `spec.md`'s five user stories
- Paths are repository-relative. Test commands use `npx vitest run <file>`; the project's global setup starts its embedded PostgreSQL first, so allow a minute.

---

## Phase 1: Setup

**Purpose**: a known baseline. The feature adds no dependency, configuration or migration.

- [X] T001 Run `npm test` (the suites under `tests/`) once and note the result: files passed and skipped, tests passed and skipped. The feature changes no existing behaviour for a poll without colours, so the same suites must stay green at T038.

---

## Phase 2: Foundational (blocks every story)

**Purpose**: the palette, the widened choice type and the config response every story reads.

**⚠️ CRITICAL**: no user story work can begin until this phase is complete.

- [X] T002 Create `tests/bar-palette.test.ts` (Vitest): `BAR_PALETTE` has 18 entries, each with a unique name and a unique upper-case `#RRGGBB` hex, in the order of the spec's Assumptions with the teal `#007A7E`; `isPaletteColor` is true for each entry and for the same hex in lower case, false for `#123456`, `red` and `undefined`; `normalizeColor` returns the upper-case hex or `undefined`; and `GET /api/config` returns `barPalette` equal to `BAR_PALETTE` (build the app the way `tests/page-loads.test.ts` does). It fails until T003 and T005 exist.
- [X] T003 Create `src/polls/barPalette.ts` exporting `BAR_PALETTE` (a `readonly` array of `{name, hex}` with the 18 names and hex codes of the spec's Assumptions), `isPaletteColor(value)` and `normalizeColor(value)` (research R1). No comments describing behaviour.
- [X] T004 [P] Add `color?: string` to `Choice` in `src/polls/store.ts`, to `PollChoiceJson` in `src/db/schema.ts` and to the choice type of `PollProjection` in `src/polls/versions.ts` (research R2). No migration is written.
- [X] T005 Add `barPalette: BAR_PALETTE` to the `/api/config` response in `src/routes/api.ts`, after `maxChoices`, then make `tests/bar-palette.test.ts` pass (`npx vitest run tests/bar-palette.test.ts`).

**Checkpoint**: the palette exists, the choice type carries a colour, and the browser can be told the palette.

---

## Phase 3: User Story 1 - Give a poll's choices colours by hand (Priority: P1) 🎯 MVP

**Goal**: a creator or administrator sets a colour per choice on a new step 4, **Colors**, and the colours are saved with the poll.

**Independent Test**: create a poll with two choices, open Colors, give the first Red and leave the second on Automatic, save, reopen the card, and see the same settings (`quickstart.md` §2, steps 1 to 3).

### Server

- [X] T006 [US1] Create `tests/polls-colors.test.ts`, using the poll-building and request helpers of `tests/polls-admin-wizard.test.ts`, with the new-poll and no-votes cases (they fail until T007 and T008): `POST /save` with `labels` and `colors` stores each choice's `color` in order, upper-case; a colour is paired with its label before an empty label is dropped (labels `["A","","B"]` with colours `["#FF0000","#00FF00","#0000FF"]` give A red and B blue); `labels` without `colors` leaves every choice without a colour; a `colors` list of the wrong length and an entry that is not in the palette both give `400` and save nothing; a lower-case hex is accepted and stored upper-case; `POST /publish` in `EDIT` mode with `labels` and `colors`; `POST /publish` with `colors` and no `labels` sets the colours by position and keeps every choice id; `colors` with no non-empty `labels` on `/save` is ignored.

- [X] T007 [US1] In `src/polls/service.ts` add `checkedColor(value)` (`null` or `undefined` is Automatic; otherwise `normalizeColor` must be in the palette, else `AdminError(400, "Colors must come from the palette.")`), extend `replaceChoices` with an optional `colors` argument (pair each colour with its label before the empty labels are dropped; the list must be as long as `labels`, else `AdminError(400, "Colors must have one entry per choice.")`; write `color` on each created choice only when set), and add `applyChoiceColors(poll, colors)` (sets `color` on the existing choices in `position` order and keeps ids, labels and positions; same length and entry rules) (research R3).
- [X] T008 [US1] In `src/routes/pollsApi.ts` take `body.colors` out of the body beside `body.labels` in `publish` (`:436-447`) and `save` (`:520-528`): with `labels`, call `replaceChoices` with the colours; in `publish` with `colors` and no `labels`, call `applyChoiceColors`; in `save` with no non-empty `labels`, ignore `colors` (research R4). `UPDATE_FIELDS` is not changed here.
- [X] T009 [P] [US1] In `postman/openapi.json` add an optional `colors` property (array of string or null, one entry per choice) to the `save` and `publish` request bodies beside `labels` (`:2870`, `:3050`) and an optional `color` property to the choice schema, then run `npx vitest run tests/openapi-contract.test.ts`.
- [X] T010 [US1] Make `tests/polls-colors.test.ts` pass (`npx vitest run tests/polls-colors.test.ts`) and run `tests/polls-admin-wizard.test.ts`, `tests/polls-service.test.ts` and `tests/polls-editing-eligibility.test.ts` unchanged and green.

### Browser

- [X] T011 [US1] In `tests/client-admin-wizard.test.ts`, update every existing test that numbers or counts steps (How becomes 5 and When 6; the circle row has six), and add: the circles read Who, Title, Choices, Colors, How, When; Next on Choices leads to Colors; each choice line has a row with a colour button showing an empty ring and **Automatic**; pressing it opens a grid with **Automatic** and the 16 palette swatches in palette order, four to a row (the palette comes from `AdminCard.setRuntimeConfig({barPalette})`); choosing Red closes the grid, returns focus to the button, and shows a red dot and the name Red; choosing **Automatic** clears it; Save and Publish send `colors` (with `null` for Automatic) beside `labels`; reopening the card shows the saved colours. It fails until T012 to T015 exist.
- [X] T012 [US1] In `src/public/adminCard.js`: keep `cfg.barPalette` in `runtime` in `setRuntimeConfig` (`:36-44`, default empty); add `{ n: 4, name: "Colors", short: "Colors" }` to `WIZARD_STEPS` and renumber How and When to 5 and 6; change every step literal (research R7): `visited` and `answered` `[1..5]` to `[1..6]` (`:479`), the Settings Summary's `part(…, 4, …)` and `part(…, 5, …)` to 5 and 6 (`:748-757`), `publishWizard`'s `wizard.answered.add(5)` to 6, the `lockStep` branches for the old steps 4 and 5 to 5 and 6, and `buildStepPanel`'s mapping to Choices, Colors, How, When.
- [X] T013 [P] [US1] In `src/public/admin.css` make the circle row six equal columns (`repeat(6, 1fr)`, `:331`) and the joining line's inset 8.333% each side (`:336-337`); update the comment-free rule only, no other rule.
- [X] T014 [US1] In `src/public/adminCard.js` add `buildColorsStep()` for step 4: the help line "Optional. Leave a choice on Automatic to color it for you."; one row per choice line of the Choices box (unsaved lines included), each with the label and the colour button (24 dp dot: filled, or an empty ring for Automatic; the name or "Automatic"; a drop-down arrow; accessible name "Color for <choice>"); one shared popover under the pressed button holding **Automatic** and the palette as swatches (inline `--swatch`), opened and closed by clicks, choosing closes it and returns focus. Keep the answers in `wizard.colors`, an object `{label: hex}` started from the poll's stored choices and pruned to the labels still in the Choices box when the step opens; add `fields.colors = choiceLines(s).map((l) => s.colors[l.trim()] ?? null)` to `wizardFields` (`:1640-1660`); make `saveChanges` (`:1737-1760`) send `colors` whenever it sends `labels`; make `canChange("colors")` true (`:414-421`). Register the colour buttons with `window.M3Ripple?.add` beside the existing selectors.
- [X] T015 [P] [US1] In `src/public/admin-card-m3.css` add the rules for the colour row, the button (at least 48 dp tall), the dot (filled and empty-ring forms), the popover, the four-column swatch grid of 48 dp targets with 8 dp gaps, the swatch (fill from `--swatch`) and the chosen check mark, using only Material 3 tokens.
- [X] T016 [US1] Make `tests/client-admin-wizard.test.ts` pass (`npx vitest run tests/client-admin-wizard.test.ts`) and run `tests/m3-assets.test.ts` green.

**Checkpoint**: a creator can colour a poll's choices and the colours are stored. Walk `quickstart.md` §2 steps 1 to 3.

---

## Phase 4: User Story 2 - Voters see the chosen colours (Priority: P1)

**Goal**: result bars use a choice's colour, and every Automatic bar keeps exactly the colour it has today.

**Independent Test**: show the results of a poll with three choices where only one has a colour, and compare the other two bars with the same poll without it (`quickstart.md` §2 steps 4 and 5, §3).

- [X] T017 [US2] In `tests/client-bar-colours.test.ts` add cases built from poll data that carries `color` (no server needed): a colour wins over a Yes or No label and over the automatic palette; with the top choice coloured, every Automatic choice has the colour it has without it, over polls of 2, 3, 10 and 50 choices, each with and without a yes or no choice; a coloured non-yes/no choice advances the palette index and a coloured yes/no choice does not; a poll with no colours is identical to today's expectations; two choices with one colour are both drawn in it; a hex outside the 50 automatic colours draws without throwing and sets the four `--bar-*` properties; a stored `#12` or `red` is drawn as Automatic; for each of the 18 palette colours the track text reaches 7:1 in light and dark mode and the text over the fill 4.5:1 (use the card's own derivation); a refresh that gives an already-drawn choice a new `color` repaints its bar and fill in place, with no remount. It fails until T018.
- [X] T018 [US2] In `src/public/pollCard.js`: `rebuildData` adds `color: c.color` (`:963-968`); `assignResultColors` (`:284-292`) returns `item.color` when it matches `/^#[0-9A-Fa-f]{6}$/`, otherwise the semantic or palette colour, with the index rule of research R6 (every choice that does not read as yes or no advances `paletteIndex`, manual or not; a yes or no choice never does); add `barColorsOf(hex)` that returns the cached colours of `BAR_COLORS` and `BAR_COLORS_DARK` and derives and caches them with `barColorsFor`, `inkOnFillFor` and `darkBarColorsFor` on a miss, and use it in `applyBarColors` (`:658-660`). Make `tests/client-bar-colours.test.ts` pass.
- [X] T019 [US2] Run `tests/poll-card-assets.test.ts`, `tests/client-maximized.test.ts` and `tests/client-home.test.ts` unchanged and green.
- [X] T020 [US2] Walk `specs/029-MANUAL-BAR-COLORS/quickstart.md` §2 (all steps) and §3 on a running server and record that the Automatic bars did not move and the two SC-001 times of §2 step 3.

**Checkpoint**: US1 and US2 together are the MVP: colours can be set and are seen.

---

## Phase 5: User Story 3 - Change colours after voting has started (Priority: P2)

**Goal**: colours stay editable on a poll that has votes, and a colours-only change leaves the poll's state alone with no new review.

**Independent Test**: on a poll that has votes, change one colour and save; the poll is back in its previous state, no review started, votes and choices unchanged (`quickstart.md` §4).

- [X] T021 [US3] In `tests/polls-colors.test.ts` add the poll-with-votes cases (they fail until T022 and T023): `publish` in `UPDATE` mode accepts `colors` beside `title` and still refuses `labels`; `POST /api/admin/polls/:pid/colors` with the session's `clientGuid` returns `200`, sets the colours by position, leaves every id, label, position and vote unchanged, restores the poll's state (`OPEN`, `WAITING TO OPEN`, `CLOSED` and `REJECTED` each), clears the session fields, moves `content_version`, and never sets `AWAITING APPROVAL` or touches `pollApprovalTimestamp`; `404` for a signed-in user who is not the creator, `409` without the session or with the wrong guid, `409` for a poll with no votes, `400` for a list of the wrong length and for an entry not in the palette; an administrator who is not the creator succeeds. In `tests/refresh-deltas.test.ts` add a case: a projection whose choices gain a `color` and whose `contentVersion` is higher yields a delta whose card carries the choices with that `color` for a client holding the older version.
- [X] T022 [US3] In `src/routes/pollsApi.ts` add `"colors"` to `UPDATE_FIELDS` (`:418`) and route `publish` in `UPDATE` mode: `colors` with or without the other allowed fields calls `applyChoiceColors` (research R4).
- [X] T023 [US3] In `src/routes/pollsApi.ts` add `POST /api/admin/polls/:pid/colors` behind `requireOwnPoll`, copying the guard of `DELETE /edit-session` (`:284-300`): the poll must be `EDITING` with `pollEditUpdateClientGUID` equal to the body's `clientGuid`, else `409`; it must have votes (`hasEverBeenVotedOn`), else `409`; call `applyChoiceColors`, then `updatePoll(store, poll._id, { choices, pollState: poll.pollStateBeforeEditUpdate ?? "INITIALIZED", ...CLEAR_SESSION }, { pollEditUpdateClientGUID: clientGuid })`; answer `{ pollState, choices }` (contracts/api.md). Log `[admin] Saved colors of poll <pid>` after the write, and `[admin] Refused colors for poll <pid>: <reason>` when the session or vote guard answers `409`; the lines hold only the poll id and a fixed reason, no colours or user data. Make `tests/polls-colors.test.ts` pass.
- [X] T024 [P] [US3] In `postman/openapi.json` describe `POST /api/admin/polls/{pid}/colors` (request, `200`, `400`, `404`, `409`) and add `colors` to the poll-with-votes description of `publish`; run `npx vitest run tests/openapi-contract.test.ts`.
- [X] T025 [US3] In `tests/client-admin-wizard.test.ts` and `tests/polls-admin-wizard.test.ts` add: on a poll that has votes the `Colors` step is open while `Choices` is locked, and the step lists the stored choices; only colours changed posts to `/colors` with the session's `clientGuid` and no other request; colours and the title changed posts to `/publish` with both; on a poll without votes only colours changed posts `/publish` with `colors`; a refused save shows the server's message in the card's status line and keeps the wizard open with the answers intact.
- [X] T026 [US3] In `src/public/adminCard.js`: add no lock for step 4 in `lockStep` (`:1498-1505`) so Colors stays open when `Choices` is locked; in `saveChanges` (`:1737-1760`) when the poll has votes and the changed fields are `colors` only (the body holds just `clientGuid` and `colors`), `POST` to `pollUrl("/colors")` instead of `/publish`, end the session as the publish path does, and on a refusal show `answer.error` and stay in the wizard. Make T025 pass.
- [X] T027 [US3] Run `npx vitest run tests/polls-colors.test.ts tests/client-admin-wizard.test.ts tests/polls-admin-wizard.test.ts` green, then walk `specs/029-MANUAL-BAR-COLORS/quickstart.md` §4 on a running server. (Suites green; the quickstart walk on a running server was done by the developer.)

---

## Phase 6: User Story 4 - An easy, accessible picker (Priority: P2)

**Goal**: the picker is usable by touch, keyboard and screen reader on a phone-width card, and colour is never the only cue.

**Independent Test**: operate the step with the keyboard only and with a screen reader at 320 px (`quickstart.md` §5).

- [X] T028 [US4] In `tests/client-admin-wizard.test.ts` add: Tab enters the grid at the chosen swatch (or **Automatic**); arrow keys move by one, Home and End jump, Enter and Space choose, Escape closes and returns focus to the button; a press outside closes it; the button has `aria-haspopup="true"`, `aria-expanded` and the name "Color for <choice>"; the grid is a `radiogroup` of `radio` buttons with `aria-checked` and each swatch's name and tooltip equal to the colour's name; the chosen swatch shows a check mark; every swatch carries the outline class; `admin-card-m3.css` gives the button, the swatch and the **Automatic** entry a minimum of 48px and the grid four columns; with no choice line the step shows "Add your choices first, then come back to choose their colors." and no buttons; unsaved Choices-box lines are listed; a 50-choice poll renders 50 rows and one popover. It fails until T029 and T030.
- [X] T029 [US4] In `src/public/adminCard.js` complete `buildColorsStep()`: the `radiogroup` and `radio` roles and `aria-checked`, roving tabindex, the keyboard map of `contracts/ui-contracts.md` C4, Escape and outside-press closing with focus returned, the empty-state paragraph, the chosen check mark, the outline class on every swatch, and placement that flips the popover above the button when it would leave the viewport (a local check; `adminList.js`'s menu positioner is not shared). Make T028 pass.
- [X] T030 [P] [US4] In `src/public/admin-card-m3.css` add the focus ring, the 1 dp outline in the outline token (light and dark), the check mark, and the 320 px grid (216 px wide) rules, tokens only.
- [X] T031 [US4] Run `npx vitest run tests/client-admin-wizard.test.ts tests/m3-assets.test.ts` green, then walk `specs/029-MANUAL-BAR-COLORS/quickstart.md` §5 (keyboard, screen reader, dark mode, 320 px). (Suites green; the keyboard, screen-reader, dark-mode and 320 px walk was done by the developer.)

---

## Phase 7: User Story 5 - Colours follow their choices, and the palette is easy to extend (Priority: P3)

**Goal**: colours stay with their labels, a stored colour the palette no longer holds survives a save, a duplicate keeps colours, and a new palette colour appears in the grid with no other change.

**Independent Test**: reorder, rename and remove lines of a coloured poll; add a 19th palette entry (`quickstart.md` §6).

- [X] T032 [US5] Add the cases (they fail until T033 and T034): in `tests/polls-colors.test.ts`, a colour the poll already stores that is not in the palette is accepted and kept on `save`, `publish` and `/colors` (seed a choice with `color: "#123456"`), a different non-palette colour is refused, `duplicatePoll` copies each choice's colour, and every `BAR_PALETTE` entry is accepted; in `tests/client-admin-wizard.test.ts`, reordering the Choices lines keeps each colour with its label, renaming or removing a line drops its colour, a stored non-palette colour shows as an extra selected swatch labelled with its hex, and a runtime palette of 19 entries shows 19 swatches.
- [X] T033 [US5] In `src/polls/service.ts` extend `checkedColor(value, stored)` so an entry equal (case-insensitively) to a colour that any of the poll's current choices stores is also accepted, pass the poll's stored colours from `replaceChoices` and `applyChoiceColors`, and make `duplicatePoll` (`:984`) copy `color` onto each new choice.
- [X] T034 [US5] In `src/public/adminCard.js` make the popover add an extra selected swatch, labelled with its hex, for a stored colour that is not in the palette, and confirm the colour map pruning of T014 against the reorder, rename and remove cases. Make T032 pass.
- [X] T035 [US5] Run `npx vitest run tests/polls-colors.test.ts tests/client-admin-wizard.test.ts` green, then walk `specs/029-MANUAL-BAR-COLORS/quickstart.md` §6. (Suites green; the quickstart walk was done by the developer.)

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T036 [P] Run `npx tsc --noEmit` (the project's `tsconfig.json`, which covers `src/`) and fix every error in `src/polls/barPalette.ts`, `src/polls/service.ts`, `src/routes/pollsApi.ts`, `src/routes/api.ts`, `src/polls/store.ts`, `src/polls/versions.ts` and `src/db/schema.ts`.
- [X] T037 Constitution VI pass over every file this feature added or changed under `src/` and `tests/`: no comment describes behaviour, cites a requirement, spec, task or feature number, or records history; the only comments allowed point to external documentation. Check that each function does one thing and its name states the rule.
- [X] T038 Run `npm test`; the result must equal T001's baseline plus the new and extended suites, with nothing else changed.
- [X] T039 Walk `specs/029-MANUAL-BAR-COLORS/quickstart.md` §1 to §8 once more on a running server, then clean up with §8. Confirm `git status` shows only: `src/polls/barPalette.ts`, `src/polls/store.ts`, `src/polls/versions.ts`, `src/polls/service.ts`, `src/db/schema.ts`, `src/routes/api.ts`, `src/routes/pollsApi.ts`, `src/public/pollCard.js`, `src/public/adminCard.js`, `src/public/admin.css`, `src/public/admin-card-m3.css`, `postman/openapi.json`, the tests, the documentation tasks below and `CLAUDE.md`.
- [X] T043 After FIX01: `src/trending/recompute.ts` adds `cardsVersion` (a hash of the sorted `pid:contentVersion` lines) to the counts object, the cards object and `TrendingListing`; `src/trending/publish.ts` republishes the cards object when it changes; `src/public/trending.js` and `src/public/newest.js` refetch the cards when it differs from the held one; `postman/openapi.json`, `ARCHITECTURE.md` and `CLAUDE.md` say so. Tests were written in `tests/trending.test.ts` and `tests/client-home.test.ts` and not run (No Tests).
- [X] T044 After FIX02 (FR-021): `buildSummary` in `src/public/adminCard.js` gains `buildColorsSummaryLine`, the line for colors after the choices line, with `wizard-summary-swatch` rules in `src/public/admin-card-m3.css`; `spec.md` gets FR-021 and its scope limit is narrowed; `README.md` and `ARCHITECTURE.md` say so. Tests were written in `tests/client-admin-wizard.test.ts` (two link lists updated, three cases added) and not run (No Tests).
- [X] T045 After FIX03: `src/public/pollCard.js` (and the reference copy `designdocs/pollUserInterface/poll-card.js`) keeps a 14-colour base list; `expandPalette(base, count)` repeats it to `choiceBounds.maxChoices` entries (default 50), adding one entry when the last would equal the first; `paletteOffsetFor(pid, length)` and `assignResultColors(data, offset, palette)` take the card's palette; `tests/client-bar-colours.test.ts` and `tests/poll-card-assets.test.ts` check the expansion and that no neighbours repeat; `ARCHITECTURE.md` and `data-model.md` say so.
- [X] T046 Semantic bars use the derivation of every other color: `src/public/pollCard.js` drops `SEMANTIC_TRACK_TINT` and `SEMANTIC_TEXT_COLOR`, so Yes/No take the 80% tint and `inkOnFillFor` text; the Color Palette Editor's semantic row does the same; `tests/client-bar-colours.test.ts` checks it, including a case comparing Yes/No with a choice set by hand to the same colors; `README.md`, `ARCHITECTURE.md` and `CLAUDE.md` say so.
- [X] T047 Colors chosen in the Color Palette Editor: `src/public/pollCard.js` uses a 90% track tint (dark mode keeps 80%), a `TEXT_ON_FILL_OVERRIDES` map giving the text colour (white or black) on each palette, Yes/No and manual fill, `inkOnFillFor` falling back to the higher contrast, and Yes/No `#006120` / `#F91010`; `lightShadeOf` is removed; `tests/client-bar-colours.test.ts` and `tests/poll-card-assets.test.ts` check them; `ARCHITECTURE.md` and `CLAUDE.md` say so.

---

## Phase 9: Documentation (post-implementation)

**Purpose**: the post-implementation documentation phase the constitution requires for every feature: `README.md` and `ARCHITECTURE.md`, then the agent context. It starts only after Phase 8, because the documents describe the final behaviour.

- [X] T040 [P] Update the root `README.md`: the **Create New Poll** bullet (`:90`) becomes a six-step wizard (Who can vote, Title & Tags, Choices, **Colors**, How to vote, When to vote), and add a short note that a creator or administrator can choose a color for each choice on the Colors step, from a fixed palette, also after voting has started, and that a choice left on Automatic is colored as before. The README is self-contained: it names no spec, requirements or architecture document.
- [X] T041 [P] Update the root `ARCHITECTURE.md`: change "five-step wizard" to six steps with Colors (`:456`); extend the **Result bar colours** section (`:340-364`) with the manual colour, the palette index rule (every non-yes/no choice advances the index, so Automatic bars never move), the derive-on-demand `barColorsOf` in place of the closed maps, and the stored `color` on each choice; add the `barPalette` config field and the colours-only route to the poll administration section, with a Mermaid sequence of the colours-only save (edit session, `POST colors`, state restored). Keep existing accurate content; name no spec or requirements document.
- [X] T042 Re-read the `CLAUDE.md` plan block against what was built and correct any decision that changed during implementation (it already points at this plan).

---

## Dependencies & Execution Order

### Phase dependencies
- **Setup (1)**: T001 first.
- **Foundational (2)**: T002 (tests) first, T003 and T004 [P] together, then T005; blocks every story.
- **US1 (3)**: server first (T006 tests, T007, T008, T009 [P], T010), then the browser (T011 tests, T012, T013 [P], T014, T015 [P], T016). It is half of the MVP.
- **US2 (4)**: needs only the Foundational phase (the card reads `color` from poll data); independent of US1's code. T017 then T018, T019, T020.
- **US3 (5)**: after US1 (it reuses `applyChoiceColors`, `/publish` handling and the wizard's colour step).
- **US4 (6)** and **US5 (7)**: each after US1; independent of US2 and US3 and of each other (US5's T033 changes `checkedColor` that US3's tests call with palette colours only, so the order US3 then US5 is safest).
- **Polish (8)**: after all stories. **Documentation (9)**: after Phase 8; T040 and T041 need the behaviour to be final.

### Within the shared files
`src/polls/service.ts`: T007, T033. `src/routes/pollsApi.ts`: T008, T022, T023. `src/public/adminCard.js`: T012, T014, T026, T029, T034. `src/public/pollCard.js`: T018 only. `tests/polls-colors.test.ts`: T006, T021, T032. `tests/client-admin-wizard.test.ts`: T011, T025, T028, T032. Sequence the edits to a shared file; everything marked [P] is otherwise independent.

### Parallel example (US1)
T009 (`postman/openapi.json`) runs beside T007 and T008 on the server; T013 (`admin.css`) and T015 (`admin-card-m3.css`) run beside T012 and T014 in the browser.

## Implementation Strategy

### MVP first (User Stories 1 and 2)
Phases 1 to 4. After Phase 4 a creator can colour a poll's choices and voters see the colours, with every uncoloured poll unchanged. Stop and walk `quickstart.md` §2 and §3.

### Incremental delivery
1. Setup + Foundational: the palette, the choice type and the config
2. US1: the save path and the Colors step (half the MVP)
3. US2: the card's colour rule (the other half; can be built any time after Foundational)
4. US3: colours after votes and the colours-only route
5. US4: the accessible picker
6. US5: colours follow labels, stored colours, duplicates, palette extension
7. Polish, then Documentation

## Notes

- 42 tasks: Setup 1, Foundational 4, US1 11, US2 4, US3 7, US4 4, US5 4, Polish 4, Documentation 3.
- Tests come first within US1 to US5 (T006 and T011, T017, T021 and T025, T028, T032); Foundational has T002.
- `checkedColor` accepts palette colours only until T033 adds the poll's own stored colours, so US1 to US4 ship without the I3 behaviour and US5 completes it.
- Constitution VI: the new code and tests carry no requirement ids or behaviour comments; the tests are the documentation of the rules.
- Commit after each phase, or per story.
