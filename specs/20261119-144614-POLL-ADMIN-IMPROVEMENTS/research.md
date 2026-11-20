# Research: Poll Admin Improvements

Every decision below was reached by reading the code as it stands on `poll-admin`; no external source was needed.
"Row" is a `div.admin-result` of `adminList.js`; "card" is the Admin Poll Card of `adminCard.js`; "wizard" is the card's
six-step editor.

## R1. One way of drawing a list

**Decision**: `loadList` draws rows in every view. `cardElements` and the `inSearch` branch that chose between it and
`resultElements` are removed; `forgetResults` stays for `emptyList`. A view's notice is unchanged: `noticeFor` already
shows a count only for a view that defines `count`, which is Search alone (FR-009).

**Rationale**: `resultElements`, `openResult`, `closeResult`, `keepEditingResult` and `holdResult` already implement
every rule the spec asks for (FR-002, FR-003, FR-005, FR-006, FR-007), and were written against a list that refreshes
on a timer. Extending them to the other views is the removal of a branch, not new behaviour.

**Alternatives considered**: keeping cards on the creator's list (rejected by the requirements, AM1; it would keep two
reconcilers).

## R2. When a row opens by itself

**Decision**: `fresh` keeps its meaning (a list the viewer asked for): `selectTab` passes it, and so does the first
`loadList` of the page, which today does not. With `fresh`, the open row is closed and a list of exactly one poll opens
its row (FR-004). The periodic refresh and the card's `deps.refresh` stay without it (FR-005).

Create New Poll, after `selectTab("newest")`, calls `openResult(pid)`, `revealRow`, then `openWizard()` on the row's
controller (FR-008). When the new poll is not in the list, nothing opens, as today.

**Rationale**: the first load must be `fresh` for a creator with one poll to see its card (User Story 1, scenario 10),
and it costs nothing in Search, whose first load has no request.

**To verify in implementation**: `deps.refresh({ focusPid, message })` is called only from a card that is open (Save,
Publish, an action's answer), so `controllers.get(focusPid)` exists; if a path is found where the row is closed, the
row's button takes the focus and the message goes to the snackbar.

**Verified (T019)**: the four calls in `src/public/adminCard.js` (after Save, after Publish, after Save changes, and
Cancel) all run from the wizard of the card being edited, whose row is open and held open, so no path runs from a
closed row and `adminList.js` needed no change for it. When Save or Publish moves the poll out of the view on
screen (a Rejected poll published goes to Awaiting Approval), the refresh removes its row (U4) and the message is not
shown; this is how the Search view behaved before this feature, and it is left as it is.

**TWEAK09**: the edited poll's own row is no longer held. `holdResult` leaves it enabled, titled "Cancel editing", and
a click on it runs the card's `requestCancel()` (the footer Cancel: "Discard changes?" only when something changed);
when the edit has ended, `cancelFromRow` closes the row and focuses its button. Cancel's `deps.refresh({ focusPid })`
runs before the close, while the card is still open, so the check above still holds. Every other row stays held.

## R3. The creator's list

**Decision**: `becomeCreatorView` is unchanged; the creator's single view goes through the same `loadList`. The ripple
registration for `#pollList .admin-result-row`, which sits inside `if (searchForm)`, moves out of it, since a creator
has no search form.

## R4. The open-poll link

**Decision**: each row gains `a.admin-result-open`, a sibling of the row's `<button>` inside `div.admin-result`
(FR-014), positioned over the row's left padding; the button's left padding grows by the link's width in every row,
so the text starts at the same place with or without a link (FR-011) and no placeholder element is needed.

- The link exists only while `poll.canWatch` is true (R5); `paintResult` adds or removes it on each refresh.
- `href` is `"/?PID=" + encodeURIComponent(pid)`, the address `pollLink()` in `adminCard.js` copies.
- The mark is built with `createElementNS`, as `resultChevron` is, from the paths of `launchPoll-circle.svg`: a
  46-unit `viewBox`, drawn at 36 px; the disc is filled with `--md-sys-color-primary` and the mark with
  `--md-sys-color-on-primary`, by class, in `admin-search-m3.css` (FR-013). No file is added to `src/public/`.
- `aria-label` is `"View Poll: " + resultTitle(poll)`; the tooltip is `data-tooltip="View Poll"`, which
  `tooltip-m3.js`, already loaded by `admin.html`, shows (FR-015).
- The link is 48 px square around the 36 px mark; under `max-width: 640px` it takes the transparent 64 px halo the
  phone layers use (FR-016). The row's `min-height` is already 64 px.
- It is never disabled. `guardNavigation` already intercepts every same-origin `a[href]` click while a poll is being
  edited and asks before leaving; with no edit in progress it lets the browser follow the link (FR-017).
- Back returns to `admin.html`, which reads the view from `sessionStorage` (`admin:tab`) as today.

**Alternatives considered**: a wrapper element holding the link and the button (changes the row's markup and its
zebra and state-layer rules for no gain); an `<img>` of the SVG file (a new served file, literal colors, and a
transformed and fingerprinted asset for 500 bytes).

## R5. `canWatch`

**Decision**: both list routes (`GET /api/admin/polls`, `GET /api/admin/polls/search` in `src/routes/pollsApi.ts`)
call `mayWatchMany({ db, config }, caller, rows)` once and pass the resulting set to `adminListRow`, which adds
`canWatch: boolean`. `mayWatchMany` is unchanged (requirements UA9, option B). `postman/openapi.json` gains the
property on the list item. The requirements report calls it `canOpen`, but that name is already the list item's
capability for the Open state action (`capabilitiesFor` in `src/polls/service.ts`), so the new fact is named after the
rule it reports.

**What it means in practice**, from `src/polls/access.ts` and `isPublished` in `src/polls/store.ts`:

- published = `WAITING TO OPEN`, `OPEN` or `CLOSED`, a poll under edit counting by the state it held before; so a
  draft, a poll awaiting approval, a rejected and an archived poll have no link;
- the viewer holds "View Polls" and is not banned;
- a public poll, a poll the viewer created, an Invitation Only poll the viewer is invited to, or a link poll the
  viewer already has a relation to (`linked`, `voted`, `invited`).

**Cost**: three indexed queries per list request (`poll_bans`, `poll_invitations`, `user_polls`, each `poll_id in`),
for at most `maxPollsAdminSearchResults` polls, on a request the page repeats every
`pollAdminPageRefreshIntervalMs`. The routes already run five such per-page queries.

**Alternatives considered**: deciding in the browser from `pollState` and `ownPoll` (the page would restate an access
rule, which FR-012 forbids); a wider rule for administrators (rejected, UA9).

## R6. The setting: name, storage, and every place a poll field passes through

**Decision**: the field is `choicesInEnteredOrder` (`Poll`, payloads) and `choices_in_entered_order` (column),
`boolean not null default false`, added by `src/db/migrations/023-choices-in-entered-order.ts`, registered in
`src/db/migrations/index.ts`. It follows `votersAddChoices` through the code, with these differences:

| Place | Change |
|---|---|
| `src/db/schema.ts` | `choices_in_entered_order: Generated<boolean>` |
| `src/polls/store.ts` | `Poll` field, row → poll, `FIELD_TO_COLUMN`, poll → row; **not** in `NON_CONTENT_FIELDS`, so a change bumps `content_version` (FR-025) |
| `src/polls/service.ts` | new poll: `false`; `validatePollFields`: a boolean or 400, with no visibility rule (FR-020); `duplicatePoll`: copied (FR-026) |
| `src/polls/versions.ts` | `PollProjection` and `projectPoll`, so the card, tab, delta and Live Results payloads carry it |
| `src/routes/pollsApi.ts` | `UPDATE_FIELDS` (changeable after votes), `adminListRow`, and the poll detail the wizard reads |
| `src/public/deltaClient.js` | its card mapping names fields one by one (`votersAddChoices`, `lineGraphEnabled`): the new one is added |
| `postman/openapi.json` | wherever `votersAddChoices` is described (five places) |

It is not added to `src/search/adminSearch.ts` or to migration 022's flags (FR-028).

**Projections cached before the release** have no such property; every reader treats a missing value as off
(`=== true`), so no cache is flushed.

**A change on a poll that has votes** goes through the UPDATE path like `votersAddChoices` and `lineGraphEnabled`:
it is not one of the text fields that wait in `pending_update`, so it applies at once and bumps `content_version`.

## R7. Drawing the entered order

**Decision**: in `pollCard.js`, `data` stays sorted by share: it is the ranking that `essentialChoices`,
`fittingChoices`, `votedChoices`, the hidden share and the "Show all N" count read, and none of that may change
(FR-022). `rebuildData` and `applyAddedChoices` carry each choice's `position` into `data`. One function,
`inDisplayOrder(choices)`, returns the list sorted by `position` when `poll.choicesInEnteredOrder === true` and the
list itself otherwise. It is applied in two places only:

- to `shown` in every branch of `resultsView()` (card and maximized, phone and wide);
- to the non-empty result of `ballot()`.

**Rationale**: ranking and drawing are two uses of one array today; separating them at the last step leaves every
selection rule, and the phone and wide code paths, untouched, and the off case returns the same array object as
before (SC-009). `lineGraph.js`, `whoVoted.js` and the pages' link previews do not read the setting (FR-023).

**To verify in implementation**: `renderPollResults` receives `allData` (the ranking) beside the view; if an
automatic bar color is taken from a choice's index in the list drawn rather than from `allData` or its `position`,
the color must keep following what it follows today, so that turning the setting on moves bars without recoloring
them.

**A voter-added choice** already takes the next `position` (`appendChoice`), so it is last (FR-024).

## R8. A poll being edited

**Decision**: nothing to build. The wizard writes the poll only on Save or Publish, and `projectPoll` reads the row,
so voters keep the stored value for the whole edit (FR-025).

## R9. The information dialog

**Decision**: one module-level function in `adminCard.js`, `showInfo(title, blocks)`, beside `askToDiscard` and
`askToDeleteChoices` and built on the same markup (`.modal-backdrop`, `.modal`, `.modal-headline`, `.modal-text`,
`.modal-actions`), so `tabs-modal-m3.css` and `discard-dialog-m3.css` dress it:

- `role="dialog"`, `aria-modal="true"`, labelled by its headline and described by its text;
- `blocks` is a list of `{ heading?, text }`; each is set with `textContent` (no `innerHTML`), a heading as a
  `<strong>`-weight line above its text;
- one button, "Close", focused on opening; Tab stays on it; Close, Escape and a press on the backdrop close the
  dialog and return focus to the opener (FR-032);
- a second call while one is open does nothing;
- `.modal--info .modal-text` scrolls inside a `max-height` taken from the viewport (`admin-card-m3.css`), for the
  When dialog in the phone layout.

It never touches `wizard`, so it cannot mark the wizard as changed (FR-030).

**Alternatives considered**: the native `<dialog>` element (no script on the site uses it, and the existing dialogs'
styles and tests are written for the `div` pattern); `tooltip-m3.js` (a tooltip is not modal and cannot hold five
entries); a shared dialog module for all six hand-written dialogs (out of scope: Constitution III).

## R10. Where the info icon sits

**Decision**: `infoButton(label, title, blocks)` returns `button.wizard-info` (`type="button"`,
`aria-label="About: " + label`) holding a DOM-built SVG (a circle and an "i", `currentColor`), 48 px square with the
phone layout's halo. It must be outside any `<label>` (requirements UA5), and the rows are `<label>` elements today,
so the rows that take an icon change shape:

| Row | Today | With an icon |
|---|---|---|
| radio option (steps 1 and 5) | `label.m3-radio-item` > `input`, `span.m3-radio-text` > label, support | `div.m3-radio-item` > `input#id`, `span.m3-radio-text` > `span.m3-row-heading` (> `label[for=id].m3-radio-label`, button), `label[for=id].m3-radio-support` |
| switch (steps 1 and 3) | `label.m3-switch-row` > text, `input` | `div.m3-switch-row` > `span.m3-switch-text` > `span.m3-row-heading` (> `label[for=id].m3-switch-label`, button), `label[for=id].m3-switch-support`; `input#id` |
| Notes (step 2) | `label.m3-field-label` in `.m3-field-box` | `span.m3-row-heading` > the same label, button |
| questions and time zone (step 6) | `p.wizard-question`, `p.wizard-tz` | the same `<p>`, with the button after its text |

`m3RadioRow` and the two switch builders take an optional `info`; without it they build what they build today, so
step 6's options and step 4's switches are untouched. The class names stay, so `lockStep`
(`.closest(".m3-radio-item, .m3-switch-row")`), the sheets (no rule selects these rows by tag) and
`phone-sheets.test.ts` keep working. The label and the support line both carry `for`, so pressing either still
switches the control.

TWEAK07 (styles only): the button is drawn 24 px square, about 8 px after its label, and keeps a 24 × 48 px target
through a transparent `::after` (64 × 64 px in the phone layout); `.m3-row-heading` no longer wraps, so the icon stays
on the label's first line and a long label wraps inside its own box; a switch row with an icon is a two-line grid, the
label and icon on the first line across the row, the support line and the switch on the second.

`howChanged` restores focus to `input[role="switch"]`, the first switch of the step; with two switches on step 3 it
restores by the control's `id` instead.

**Alternatives considered**: the button inside the `<label>` (browsers do not forward such a click, but the
requirements exclude it); a wrapper with the button at the far end of the row (on a switch row that puts it after the
switch, not "at the end of the label").

## R11. The texts

**Decision**: the three `details.wizard-help` blocks and their `dl` lists are removed from `buildStep1`, `buildStep5`
and `buildStep6`. The texts stay where they are defined (`WHO_OPTIONS[].help`, `VOTERS_SWITCH_HELP`,
`ADD_CHOICES_HELP`) or become constants beside their step (the four How entries, the five When entries, the Notes and
display-order texts), and each is passed to `infoButton`.

- `ADD_CHOICES_HELP` gains " This is only available for Private polls."
- The When dialog is titled "When to vote" and holds five `{ heading, text }` blocks in today's order; its three
  buttons are named after their own labels.
- TWEAK05: the Who step follows the same pattern. `whoHelp()` gives every step-1 icon one dialog, "Who can vote":
  each option's label as a heading over its text, then, on a private poll (where the switch is shown), "Users can see
  who voted for what" over its text; each button keeps its own "About: <label>" name.
- TWEAK08: steps 3 and 5 too. `choicesHelp()` gives step 3's icons "Choices" (the display-order heading over its two
  paragraphs, then the add-choices entry where that switch is shown); `howInfo` gives step 5's icons "How to vote" with
  the four `HOW_HELP` entries as headed blocks. Only Notes, alone on step 2, keeps a dialog of its own.
- Step 4: the two sentences of FR-044 and FR-045.
- The `.wizard-help` rules go from `admin.css` (3), `admin-card-m3.css` (two groups) and `phone-admin-m3.css` (3).

## R12. The Choices field

**Decision**: two wizard fields, `choicesOpen` (boolean, false when the wizard opens) and `choicesAtOpen` (the text
when the list was opened), decide what `buildStep3` builds, so a redraw of the step (a switch changing) keeps the
list as it is.

- **Preview** (`choicesOpen` false): `div.wizard-choices-preview` holding `div.wizard-choices-lines` (the first five
  entries of `choiceLines()`, one per line, as text; or the placeholder) and the Notes link's button
  (`button.wizard-notes-edit`, "... edit" with the chevron, `aria-label="Edit choices"`). A click on either opens
  the list. The counter and the error line are the field's own, filled from the wizard's state
  (`choiceLines()`, `duplicateMessage()`, `choicesProblem()`), as today.
- **Open list** (`choicesOpen` true): a bar with the Notes editor's classes (`notes-editor-bar`,
  `notes-editor-cancel`, `notes-editor-done`) above today's `<textarea>` with all of its present wiring
  (`wireChoicesBox`, paste, grow), focused on opening, which keeps the "starter choices are selected" behaviour.
- **Done**: `choicesTouched = true`, `choicesOpen = false`, redraw, focus the link (FR-037).
- **Cancel**: when the text differs from `choicesAtOpen`, `await confirmDiscard()` (the page's "Not Saved" dialog,
  as the Notes editor does); then restore, close, redraw.
- **`commitChoices()`** closes an open list as Done does. It is called wherever `commitNotes()` is (step change,
  Save, Save for later, Publish: four sites), before the validation those already run (FR-038, FR-039).
- **Paste choices** works on `wizard.choicesText` when there is no `<textarea>`: the same normalization and
  `withoutDuplicateChoices`, the same snackbars, then a redraw of the preview (FR-040).

**Rationale**: the textarea and its rules are not rewritten; the feature only decides whether it is on screen.
`notesEditor.js` is not reused as a component: it is a rich-text editor (marks, `contenteditable`, HTML out), and the
choices are plain lines.

## R13. No "... view"

**Decision**: not built. `canChange("labels")` returns `true` whenever the wizard has a mode, and the card offers the
wizard only when `current.canEdit || current.canUpdate`; with votes the choices change by id (`mergeChoices`). There
is therefore no state in which step 3 is on screen with its choices locked. The requirements (AM2, UA8) assumed one;
`spec.md` is corrected (FR-041, FR-043, User Story 5 scenarios 10 and 13, Assumptions).

`lockStep`'s step-3 line also covers the preview's "... edit" link (`.wizard-choices-preview .wizard-notes-edit`,
T050) beside `.m3-field-input` and the Paste button, never a switch, so FR-043 holds in both states of the field if
that line ever applies.

**Rationale**: a branch no state reaches cannot be tested through the page and would be speculative (Constitution
II).

## R14. The Settings Summary

**Decision**: the "Voters may add choices" line moves from the `answered.has(5)` block to the `answered.has(3)`
block, its part pointing to step 3; under it, when `enteredOrder` is on, a line "Choices are shown in the order
entered." whose part points to step 3 with the field `choicesInEnteredOrder` (FR-027, FR-042). The wizard state gains
`enteredOrder` in the three places `addChoices` appears (`wizardBase`, `openWizardState`, the saved-progress
snapshot), in the dirty comparison and in the fields sent (`fields.choicesInEnteredOrder`). `canChange` answers `true`
for it.

## R15. Tests

**Decision**: tests first, per contract (see `contracts/`):

- **Server** (`embedded-postgres`): `tests/polls-entered-order.test.ts` (default, PATCH validation, after votes,
  projection, duplicate, `content_version`, delta card) and `tests/polls-admin-can-watch.test.ts` (each state and
  each kind of reach, on both list routes); `tests/openapi-contract.test.ts` covers the description.
- **Client** (jsdom through `tests/helpers/browser.ts`): `tests/client-admin-rows.test.ts` (every view and the
  creator's list as rows, Create New Poll, the link), `tests/client-admin-info.test.ts` (icons, dialog, no
  "What does this mean?"), `tests/client-admin-choices-field.test.ts` (preview, open list, Cancel, Done, Paste, the
  moved switch, the summary), `tests/client-entered-order.test.ts` (`pollCard.js`: bars and ballot, kept choices
  unchanged, off identical).
- **Touched**: `client-admin-wizard`, `client-admin-discard`, `client-admin-invitees` and `client-admin-creator`
  open a row before using a card, and type into the choices after opening the list; `admin-search-assets` and
  `m3-assets` for the new rules; `phone-sheets` unchanged.

jsdom has no layout, so sizes (36 px, 48 px, the halo), the dialog's scrolling and SC-001's counts are checked by
hand with the quickstart.

## R16. Documents

**Decision**, after implementation: `README.md` (the lists, the link, the display-order setting, the info icons),
`ARCHITECTURE.md` (the list payload's `canWatch`, the new field's path), `CLAUDE.md` and `CLAUDE_COMPLETE.md` (the
ADMIN-SEARCH-RESULTS entry's "Search view only" is superseded), `postman/openapi.json` with the routes.
