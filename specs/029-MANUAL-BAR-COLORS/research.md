# Research: Manual Bar Colors

Every decision is checked against this repository. No `NEEDS CLARIFICATION` item remained in the Technical Context; these are the choices the spec leaves to the plan. Line numbers are those of the repository on 2026-10-08.

## R1. The palette: one server module, delivered through `/api/config`

- **Decision**: a new `src/polls/barPalette.ts` exports `BAR_PALETTE: readonly {name: string; hex: string}[]` (the 18 colours of the spec, in picker order, upper-case hex), `isPaletteColor(value)` and `normalizeColor(value)` (returns the upper-case `#RRGGBB` or `undefined`). `/api/config` gains `barPalette` (`src/routes/api.ts:98-110`), and `AdminCard.setRuntimeConfig` keeps it in `runtime` (`src/public/adminCard.js:36-44`, called from `adminList.js:441`).
- **Rationale**: the browser cannot import TypeScript, and the server must validate; the server already tells the page its limits through `/api/config` (`minChoices`, `maxChoices`). One list means one place to extend (FR-007).
- **Alternatives considered**: a constant in `adminCard.js` copied into the server (two lists drift); a separate `/api/palette` route (a second round trip for one list); putting the palette in `pollCard.js` beside the automatic one (the admin page does not load that file, `admin.html:187-191`).

## R2. Storage: an optional `color` on each element of `polls.choices`

- **Decision**: widen `Choice` (`src/polls/store.ts:107`), `PollChoiceJson` (`src/db/schema.ts:73`) and the `PollProjection` choice type (`src/polls/versions.ts:19`) with `color?: string`. No migration, no backfill, no new column.
- **Rationale**: `choices` is jsonb written whole by `columnsFor` (`store.ts:285-288`) and read back whole (`store.ts:200`, `versions.ts:35`); a missing `color` is Automatic, which is what every existing poll already is. The colour then travels with the choice into the cached projection and the delta path (`src/refresh/deltas.ts:69-78`) with no further code.
- **Alternatives considered**: a `choice_colors` column (a second structure kept aligned by position across saves that reissue every id, `service.ts:948`).

## R3. Server validation and writers: `replaceChoices` takes colours; a second function serves the colours route

- **Decision**: `replaceChoices(poll, labels, config, colors?)` (`src/polls/service.ts:921`) pairs each colour with its label **before** it trims and drops empty labels (`:929-931`), then writes `color` on the choice it creates. A new `applyChoiceColors(poll, colors)` sets `color` on the existing choices, in `position` order, keeping every id, label and position. Both use one helper, `checkedColor(value, stored)`: `null` or `undefined` is Automatic; otherwise `normalizeColor(value)` must be in the palette **or** equal a colour any of the poll's current choices already stores (the spec's FR-009). A list whose length differs, or any other entry, is `AdminError(400)`.
- **Rationale**: in `UPDATE` mode `labels` are refused (`pollsApi.ts:418-432`) and `replaceChoices` would reissue every id and orphan the votes (`service.ts:948`), so colours need a writer that touches nothing else.
- **Alternatives considered**: reusing `replaceChoices` with the stored labels (orphans the votes); making `replaceChoices` keep ids for unchanged labels (a behaviour change to every save, out of scope).

## R4. Routes: which request carries colours

| Request | Carries `colors` | Writer | Result |
|---|---|---|---|
| `POST /save` (new poll, draft) | yes, beside `labels` | `replaceChoices` | stays `INITIALIZED` (`pollsApi.ts:495-548`); `colors` with no non-empty `labels` is ignored, because the stored choices are kept |
| `POST /publish`, `EDIT` mode | yes, beside `labels`; or alone | `replaceChoices`, or `applyChoiceColors` when there are no `labels` | `AWAITING APPROVAL`, as for any edit (`:470-476`) |
| `POST /publish`, `UPDATE` mode | alone, or with the other allowed fields | `applyChoiceColors` | `AWAITING APPROVAL`; `colors` joins `UPDATE_FIELDS` (`:418`) |
| `POST /colors` (new) | alone | `applyChoiceColors` | previous state restored, session ended |

- **Decision**: add `colors` to `UPDATE_FIELDS`; in `publish`, `body.colors` is taken out of `body` beside `body.labels` (`:436-447`) and routed by the table. The new `POST /api/admin/polls/:pid/colors` sits behind `requireOwnPoll` (`:181`) and mirrors the guard of `DELETE /edit-session` (`:284-300`): the poll must be `EDITING` with `pollEditUpdateClientGUID` equal to the request's `clientGuid`, otherwise `409`; it must have votes (`hasEverBeenVotedOn`), otherwise `409` ("only for a poll that has votes"); it then calls `updatePoll(store, pid, {choices, pollState: pollStateBeforeEditUpdate ?? "INITIALIZED", ...CLEAR_SESSION}, {pollEditUpdateClientGUID: clientGuid})`, the same conditional write the release route uses, so a stale tab cannot overwrite a session that now belongs to someone else.
- **Rationale**: it needs no new concept: the lock check and the restoring write already exist; `updatePoll` bumps `content_version` and refreshes the projection (`versions.ts:40-62`), so open cards pick the change up (FR-017); screening is untouched because `pollApprovalTimestamp` and the state are never set to the review values.
- **Side effect noted**: `bumpContentVersion` also enqueues a search re-index for the poll (`versions.ts:55-60`); a colour change reindexes unchanged text, which is harmless and rare.
- **Alternatives considered**: a flag on `publish` that restores the state (mixes two outcomes in one route, and `publish`'s state write is unconditional); sending colours with the edit-session release (conflates two concerns).

## R5. `duplicatePoll` copies colours

- **Decision**: `duplicatePoll` (`service.ts:984`) builds each new choice as `{id, label, position, ...(c.color ? {color: c.color} : {})}`.
- **Rationale**: FR-012; it rebuilds each choice from `label` alone today.

## R6. The card draws any hex: palette index rule and get-or-create colours

- **Decision**: in `pollCard.js`, `rebuildData` adds `color: c.color` to each item (`:963-968`). `assignResultColors` (`:284-292`) becomes: for each item in display order, if it reads as yes or no (`semanticColorFor`), it never advances the palette and takes `item.color` when valid, else the semantic colour; otherwise it **always** advances `paletteIndex` by one and takes `item.color` when valid, else the palette entry at that slot. `item.color` is valid when it matches `/^#[0-9A-Fa-f]{6}$/`; anything else is treated as Automatic. The two Maps become caches behind `barColorsOf(hex)`, which derives with `barColorsFor` and `darkBarColorsFor` on a miss (`:376-420, :659-660`).
- **Rationale**: a manually coloured, non-semantic choice that still advances the index leaves every Automatic bar exactly where it is today (FR-014), which a branch that skips the advance would break. Validating the hex on read keeps a corrupt stored value from reaching a style property. Deriving on a miss keeps the closed Maps from throwing on a colour outside the 50 automatic ones (FR-016).
- **Alternatives considered**: skipping the advance for manual choices (shifts every Automatic bar below it); adding the 18 colours to the pre-built Maps (still closed; fails for a colour the palette later gains).

## R7. The wizard: step numbers, a colour map keyed by label, six circles

- **Decision**: `WIZARD_STEPS` (`adminCard.js:345`) gains `{ n: 4, name: "Colors", short: "Colors" }` and the old steps 4 and 5 become 5 and 6. Every step-number literal changes: `visited`/`answered` `[1..5]` at `:479` become `[1..6]`; the Settings Summary's `part(…, 4, …)` and `part(…, 5, …)` (`:748-757`) become 5 and 6; `publishWizard`'s `wizard.answered.add(5)` (`:1722`) becomes 6; `lockStep` (`:1498-1505`) moves its 4 and 5 branches to 5 and 6 and gets none for 4 (Colors stays open after votes); `buildStepPanel` (`:1515-1531`) maps 3, 4, 5, 6 to Choices, Colors, How, When; `admin.css:331` becomes `repeat(6, 1fr)` and the line inset at `:336-337` 8.333% (50 divided by 6).
- **Colour state**: `wizard.colors`, a plain object `{label: hex}` for the answers on screen, started from the poll's stored choices for an existing poll, pruned to the labels still in the Choices box each time Colors is opened (so a renamed or removed line loses its colour and a reordered one keeps it, FR-006). `wizardFields` (`:1640-1660`) adds `fields.colors = choiceLines(s).map((l) => s.colors[l.trim()] ?? null)`.
- **Request rule** (`saveChanges`, `:1737-1760`): the diff of `after` against `before` already drops unchanged fields and fields `canChange` forbids; two rules are added: `labels` in the body always brings `colors` with it, because labels without colours replace the choices with none coloured (FR-009); and when the poll has votes and the diff holds `colors` and nothing else (`Object.keys(body)` is `clientGuid` and `colors`), the card posts to the colours route (FR-020) instead of `/publish`. A new poll's Save and Publish go through `postWizard` (`:1695-1710`), which sends `wizardFields()` whole, so colours ride with it.
- **`canChange`** (`:414-421`) answers true for `colors` in both `EDIT` and `UPDATE` mode.

## R8. The picker: a shared popover under the button, built from existing pieces

- **Decision**: one `buildColorsStep()` returns the step body: the one-line help, then a `<ul>` of rows. Each row holds the label and a button (`aria-haspopup="true"`, `aria-expanded`, accessible name "Color for <choice>") with a 24 dp dot, the name and an arrow, styled by new rules in `admin-card-m3.css` (a 48 dp minimum height; tokens only, as the other M3 sheets use them). The popover is one element per step, moved under the pressed button, holding a `role="radiogroup"` of 17 `role="radio"` buttons: **Automatic** first, then the palette in 4 columns of 48 dp targets with 8 dp gaps (216 px, fits a 320 px card). A chosen swatch shows a check mark; every swatch has a 1 dp outline from the outline token; swatch colours are set inline with `style.setProperty("--swatch", hex)` so the stylesheet holds no palette. Roving tabindex; arrow keys move, Home and End jump, Enter and Space choose, Escape and a press outside close and return focus. The popover flips above the button when it would leave the viewport, using a small local check, not `adminList.js`'s menu positioner, which is private to that file's closure.
- **Rationale**: the card has a menu pattern (`aria-haspopup`, `role="menuitem"`, `admin-card-m3.css:119-147`) but its positioner is not exported; a ten-line local placement avoids coupling the two files and does not touch the actions menu.
- **Empty state** (US4): with no choice lines, the list is replaced by one paragraph, "Add your choices first, then come back to choose their colors."
- **Alternatives considered**: reusing `.actions-menu` as is (a vertical list of 19 items, not a grid); a native `<select>` (cannot draw swatches).

## R9. Refused saves and corrupt values (the spec's two outstanding points)

- **Decision**: a refused save shows the server's `error` in the card's status line and keeps the wizard open with the creator's choices intact, as `saveWizard`, `publishWizard` and `saveChanges` already do (`adminCard.js:1711-1716, 1725-1731, 1753-1760`). A stored value that is not a six-digit hex is drawn as Automatic (R6). Neither needs a new mechanism.

## R10. API contract and tests

- **Decision**: `postman/openapi.json` gains `colors` on the `publish` and `save` bodies (beside `labels`, `:2870, :3050`), `color` on the choice schema, and the new path; `tests/openapi-contract.test.ts` pins that every route is described, so the new route cannot be left out. Tests: a new `tests/bar-palette.test.ts` (palette shape, hex normalisation); a new `tests/polls-colors.test.ts` against the real routes (the matrix in R4, the state restored, no review, `404`, `409` without the session and for a poll without votes, wrong length, unknown colour, stored colour accepted, case folding, `labels` without `colors`, duplicate copies colours, a closed poll); additions to `tests/client-bar-colours.test.ts` (manual wins, Automatic unchanged, palette index rule, any hex, corrupt value) and to `tests/client-admin-wizard.test.ts` and `tests/polls-admin-wizard.test.ts` (six steps, the Colors step, the empty state, the colour map by label, the request rule, keyboard, outline) and to `tests/refresh-deltas.test.ts` (a projection whose choices gain a `color` yields a delta carrying it).

## R11. Browser support

- **Decision**: no new platform feature; the popover, radiogroup and `style.setProperty` are already used by the card.
