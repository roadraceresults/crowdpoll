# Implementation Plan: Poll Admin Improvements

**Branch**: `poll-admin` | **Date**: 2026-11-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261119-144614-POLL-ADMIN-IMPROVEMENTS/spec.md`

## Summary

Poll Administration draws every list as the Search view's rows, each with a link that opens the poll itself; the
wizard gains a "Display Choices in the order above" setting, moves "Voters may add choices" to the Choices step, shows
the choices as a five-line preview that opens to edit, and replaces its three "What does this mean?" blocks with info
icons that open one shared dialog.

- The lists: the card path of `adminList.js` is removed and the Search view's row code serves every view and the
  creator's list (R1–R3). The link is a sibling of the row's button, drawn from the SVG's paths with M3 tokens, shown
  when the server says `canWatch` (R4), which is `mayWatchMany`, unchanged, on both list routes (R5).
- The setting: one boolean column, `choices_in_entered_order`, carried like `votersAddChoices` through the store, the
  service, the projection and the payloads (R6). `pollCard.js` keeps its share-sorted list as the ranking and reorders
  only what it draws (R7). Nothing is needed for a poll under edit (R8).
- The dialogs: `showInfo` on the existing modal markup (R9); the rows that take an icon become a `div` with
  `<label for>` parts so that the icon is outside any label (R10); the texts move, the blocks and their styles go (R11).
- The Choices step: two in-memory fields decide between a preview and today's textarea under a Cancel/Done bar (R12);
  the summary's lines move to step 3 (R14).
- Tests first, by contract (R15); documents after (R16).

**Three corrections the developer should know about.**

1. *There is no "... view" link* (R13). The requirements (AM2, UA8) and the first spec said a poll's choices are
   "locked by votes" and gave that state a read-only list. They are not: with votes the choices change by id, and the
   wizard opens only on a poll that can be edited or updated. No state shows step 3 with locked choices, so the link
   always reads "... edit". `spec.md` is corrected (FR-041, FR-043, User Story 5 scenarios 10 and 13).
2. *Few rows will carry the link for an administrator's drafts and reviews* (R5). With the rule accepted in UA9,
   `canWatch` is false for every poll that is not published: drafts, polls awaiting approval, rejected and archived
   polls, whoever looks. The Awaiting Approval and Rejected views will therefore show no link at all, and the link
   cannot be used to preview a poll under review. This follows from the decisions taken; it is stated here because the
   mockup shows an icon on a draft.
3. *SC-001's numbers are estimates* until quickstart §1 measures them (rows of 64 px and more against cards of 300 px
   and more, at 1280 × 800). The quickstart says to correct the criterion to what is measured.

## Technical Context

**Language/Version**: TypeScript ^5.8 on Node ≥ 22 (ESM) for the server and tests; browser JavaScript (plain scripts,
no modules, no bundler) and CSS for `src/public/`.

**Primary Dependencies**: Express 5, Kysely, PostgreSQL; none new.

**Storage**: PostgreSQL, one new column on `polls` (migration 023). No cookie, no browser storage key.

**Testing**: Vitest; supertest with embedded-postgres for the routes; jsdom through `tests/helpers/browser.ts` for the
client scripts; file-reading tests for the sheets; sizes, scrolling and Back by hand with the quickstart, since jsdom
has no layout. `npm run test:built` runs the client suites on the transformed build.

**Target Platform**: the DigitalOcean App Platform `web` service; every supported browser at every width.

**Project Type**: web service (Express) serving static pages.

**Performance Goals**: no new request from the page; three indexed queries added to each admin list request (R5);
each admin list page holds one card in the DOM where it held up to `maxPollsAdminSearchResults`.

**Constraints**: no access rule changes (`mayWatchMany` is not edited; a poll the caller may not see still answers
404); no third-party request and no new served file; M3 layers hold only M3 tokens and no literal font size
(`m3-assets.test.ts`); phone rules stay under `max-width: 640px` (`phone-sheets.test.ts`); poll text reaches the DOM
as text, never through `innerHTML`; a client script must not depend on its own names or source text at run time (the
build transforms it); no console logging added in the browser (Constitution V); no explanatory comments in new code,
and comments in the regions changed are brought into line (Constitution VI).

**Scale/Scope**: `adminList.js` about 60 lines removed and 70 added; `adminCard.js` about 90 removed and 260 added;
`pollCard.js` about 15 added; `deltaClient.js` 1 line; four sheets; five server files and one migration; six new
test files and six touched; `postman/openapi.json`; four documents after implementation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Think before coding | Pass | Product choices settled in the requirements report (18 findings); technical points in research R1–R16; the three places where the code contradicts earlier wording are stated in the summary, and the spec is corrected, rather than silently resolved. |
| II. Simplicity first | Pass | The row code, the modal markup, the textarea and the path of an existing boolean are reused; the unreachable "... view" branch is not built (R13); no new file is served and no abstraction is added. |
| III. Surgical changes | Pass | Only the card-list path and the help blocks this feature orphans are removed; rows without an icon keep their markup (R10); the six hand-written dialogs are not merged; `mayWatchMany` is not touched. |
| IV. Goal-driven execution | Pass | Contracts A1–A6 and U1–U16 are tests written before the code; U17 is the quickstart, with before and after counts for SC-001. |
| V. Quality and maintainability | Pass | Single-purpose functions (`inDisplayOrder`, `showInfo`, `infoButton`, `commitChoices`, the link's builder); the server change follows the one existing pattern for a poll field; nothing logged in the browser. |
| VI. Self-documenting code | Pass | No comment is added; the comments above the removed blocks go with them; the header comment of `adminList.js` and the "below vote mutability" comment of the add-choices switch are brought into line. |
| Security, privacy and reliability | Pass | `canWatch` is the existing rule's answer for the caller and reveals nothing the list did not already show them; no voter name and no raw `voteAnonymity` reaches a payload (`polls-discovery.test.ts`); dialog text is fixed and set as text. |
| Documentation deliverables | Pass | `README.md` and `ARCHITECTURE.md` after implementation, with `postman/openapi.json` (R16). |

Post-design re-check: unchanged, all pass. No Complexity Tracking entry.

## Project Structure

### Documentation (this feature)

```text
specs/20261119-144614-POLL-ADMIN-IMPROVEMENTS/
├── plan.md              # This file
├── research.md          # R1–R16
├── data-model.md        # one column; payload fields; the row's and the Choices field's states
├── quickstart.md        # automated commands and the by-hand checklist
├── contracts/
│   ├── api.md           # A1 stored, A2 saving, A3 reading, A4 duplicate, A5 canWatch, A6 description
│   └── ui.md            # U1–U7 lists and link, U8–U10 switches and summary, U11–U12 info, U13 choices,
│                        # U14 wording, U15 card order, U16 styles, U17 by hand
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/db/migrations/023-choices-in-entered-order.ts   # new (R6)
src/db/migrations/index.ts                          # registers it
src/db/schema.ts                                    # the column
src/polls/store.ts                                  # Poll field and its three mappings
src/polls/service.ts                                # default, validation, duplicate
src/polls/versions.ts                               # PollProjection, projectPoll
src/routes/pollsApi.ts                              # UPDATE_FIELDS, adminListRow, canWatch on both list routes (R5)

src/public/adminList.js          # rows in every view, Create New Poll, the open-poll link (R1–R4)
src/public/adminCard.js          # showInfo, infoButton, row shapes, texts, the Choices field, the switches,
                                 # the summary (R9–R14)
src/public/pollCard.js           # position on data, inDisplayOrder (R7)
src/public/deltaClient.js        # the card mapping's new field (R6)
src/public/admin.css             # .wizard-help rules removed
src/public/admin-search-m3.css   # .admin-result-open; the row's left padding
src/public/admin-card-m3.css     # .wizard-info, .m3-row-heading, .wizard-choices-preview, .modal--info;
                                 # .wizard-help rules removed
src/public/phone-admin-m3.css    # halos for the link and the info button; .wizard-help rules removed

tests/polls-entered-order.test.ts            # new: A1–A4
tests/polls-admin-can-watch.test.ts           # new: A5
tests/client-admin-rows.test.ts              # new: U1–U7
tests/client-admin-info.test.ts              # new: U11, U12, U14
tests/client-admin-choices-field.test.ts     # new: U8–U10, U13
tests/client-entered-order.test.ts           # new: U15
tests/client-admin-wizard.test.ts            # opens a row and the choices list first; help assertions replaced
tests/client-admin-discard.test.ts, client-admin-invitees.test.ts, client-admin-creator.test.ts,
tests/client-admin-search.test.ts            # rows in every view; the link
tests/admin-search-assets.test.ts            # U16

postman/openapi.json                                        # A6
README.md, ARCHITECTURE.md, CLAUDE.md, CLAUDE_COMPLETE.md   # after implementation (R16)
```

**Structure Decision**: the existing single project. No file is added to or removed from `src/public/`, so no page
head, no `LAYER_ORDER` and no build input changes; one migration is added.

## Phases for `/speckit-tasks`

1. **The server, tests first**: A1–A6; then migration 023, the field through schema, store, service, projection and
   routes, `canWatch`, `postman/openapi.json`. Nothing on a page changes yet, and every later phase can rely on the
   payloads.
2. **Story 1, the lists**: U1–U6 as failing tests; the card path removed, `fresh` on the first load, Create New
   Poll, the ripple registration; the touched client suites open a row first.
3. **Story 2, the link**: U7; the link, its mark and its styles.
4. **Story 3, the display order**: U8 and U15; `wizard.enteredOrder`, the switch on step 3, the fields sent,
   `deltaClient.js`, `inDisplayOrder` in `pollCard.js`.
5. **Story 4, the info icons**: U11 and U12; `showInfo`, `infoButton`, the row shapes, the texts; the three blocks
   and their styles removed.
6. **Story 5, the Choices step**: U9, U10 and U13; the preview and the open list, `commitChoices`, Paste on the
   text, the add-choices switch and the summary lines moved to step 3, focus by `id` in `howChanged`.
7. **Story 6, wording**: U14.
8. **Styles and checks**: U16; `npm test`, `npm run build && npm run test:built`.
9. **Check by hand**: quickstart §1–§9, with SC-001 measured and corrected if needed.
10. **Documents**: `README.md`, `ARCHITECTURE.md`, `CLAUDE.md`, `CLAUDE_COMPLETE.md`.

Stories 4 and 5 both rebuild step 3's switch rows; 4 comes first so that the display-order and add-choices switches
are built once, in the shape that takes an icon.

## Complexity Tracking

None.
