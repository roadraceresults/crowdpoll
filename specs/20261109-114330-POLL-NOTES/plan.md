# Implementation Plan: Poll Notes

**Branch**: `poll-notes` | **Date**: 2026-11-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261109-114330-POLL-NOTES/spec.md`

## Summary

A poll gains `notes`: plain text with three marks (`**bold**`, `*italic*`, `++underline++`), at most 6000 characters,
written in step 2 of the Admin Poll Card with a small editor of CrowdPoll's own (`notesEditor.js`, `contenteditable`, no
dependency). One server module turns notes into HTML by escaping everything and adding four tags. Listings carry a
two-line preview in the cached projection, and one card carries the full notes for the Maximized view, which shows them
above the line graph. Notes are screened, searched at the lowest weight, shown on the public poll page, exported and
copied with the poll, and in UPDATE mode wait in the pending update like the subtitle.

## Technical Context

**Language/Version**: TypeScript on Node ≥ 22 (ESM); vanilla JS in `src/public/`

**Primary Dependencies**: Express 5, Kysely; no new dependency (the editor uses the browser's own editing)

**Storage**: PostgreSQL: one column, `polls.notes`, and the generated `search` column redefined (migration 018); the
OpenSearch mapping gains `notes`

**Testing**: Vitest + supertest + embedded-postgres; jsdom for client scripts (`client-*.test.ts`), with `execCommand`
stubbed (jsdom has none)

**Target Platform**: DigitalOcean App Platform; development runs on PostgreSQL only

**Project Type**: Web service with server-rendered static pages

**Performance Goals**: listings grow by at most about 300 characters of preview per card; the full notes, up to 6000
characters, travel only with one card

**Constraints**: no third-party request from a page; no new route, cookie, setting or dependency; only two named fields of
server HTML ever reach `innerHTML`

**Scale/Scope**: one text column per poll; every reader of the projection; one new client script, loaded by the admin
page only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | Two decisions refined against the code and stated: UTF-16 counting (R3), no content stash (R7) | Pass |
| II. Simplicity First | No dependency, route or style sheet; one tokenizer; notes reuse the subtitle's paths | Pass |
| III. Surgical Changes | Each change is where `subtitle` already flows; the line graph only moves into a child container | Pass |
| IV. Goal-Driven Execution | The renderer's dangerous cases and the round trip are tests before the UI (SC-002, SC-003) | Pass |
| V. Code Quality | Server logs name the change with no notes text; the editor logs nothing | Pass |
| VI. Self-Documenting Code | Comments only link `execCommand`, `beforeinput` and text search docs | Pass |
| Documentation Deliverables | `README.md` and `ARCHITECTURE.md` updated after implementation | Pass |

Re-checked after Phase 1: no change.

## Decisions Easy to Get Wrong

- **Unbalanced marks are text, never dropped**, and a run of `*` closes before it opens (R1).
- **The preview is cut from parsed runs**, so it can never split a mark or an escape; it ends in "…" when cut, and CSS draws the ellipsis when it clamps (R2, R13).
- **6000 counts UTF-16 units**, like every field, not code points (R3).
- **No stash**: in UPDATE mode notes join `pending_update`, are screened, then applied (R7).
- **The line graph moves into `.maximized-graph`**: its `mount` empties its host (R9).
- **`innerHTML` only for `notesPreviewHtml` and `notesHtml`**, both from `src/polls/notes.ts` (R6).
- **The editor never parses the stored format**: it loads the server's `notesHtml` and writes through `serialize` (R5).
- **Admin list rows carry the preview only** (`notesPreviewHtml`, `hasMoreNotes`); `notes` and `notesHtml` come with one poll's admin details, needed before the editor opens (analysis I1).
- **An unsaved preview is the editor's own content**, rebuilt from `runsOf` with `textContent` and four elements; saved notes are always the server's rendering (FR-016, analysis I2).
- **"Show more ⌄" is measured again** whenever `.poll-notes-text` changes size (`ResizeObserver`), so a card drawn in a hidden tab is right once shown (analysis U2).
- **Notes change where the subtitle does**: `canChange("notes")` in `adminCard.js` answers as for `subtitle` (analysis U3).
- **The editor's Escape stops there** (`stopPropagation`), so it never also cancels the card (analysis U4).

## Project Structure

### Documentation (this feature)

```text
specs/20261109-114330-POLL-NOTES/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md
│   └── ui-contracts.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── html.ts                     # new: escapeHtml, moved from email/templates.ts
├── db/
│   ├── schema.ts
│   └── migrations/018-poll-notes.ts, index.ts
├── polls/
│   ├── notes.ts                # new: parse, render, preview, plain text, normalize
│   ├── service.ts              # NOTES_MAX in LIMITS; validatePollFields; duplicate; exports
│   ├── store.ts                # Poll, PendingUpdate, mapping, applyPendingUpdate
│   ├── versions.ts             # projection preview fields
│   ├── screening.ts            # notes in the input and the message
│   └── sweeps.ts               # notes screened on publish and pending update
├── search/openSearch.ts        # document, mapping, putMapping, multi_match
├── seo/pollPage.ts             # notes under the summary
├── routes/
│   ├── pollsApi.ts             # UPDATE_FIELDS, admin payloads, add-choice screening input
│   ├── tabsApi.ts              # notesHtml on the one-card routes
│   └── seo.ts                  # notesHtml to the page
├── email/templates.ts          # imports escapeHtml
└── public/
    ├── notesEditor.js          # new
    ├── adminCard.js, admin.html, admin-card-m3.css
    ├── pollCard.js, pollCard-m3.css
    ├── deltaClient.js
    └── tabs.js, index.html
postman/openapi.json
tests/
├── poll-notes.test.ts          # new: renderer, preview, plain text, validation, exports, duplicate, pending update
├── client-notes-editor.test.ts # new: serialize, round trip, keys, paste, counter, Done
├── client-poll-notes.test.ts   # new: card preview, Show more, Maximized view
├── client-admin-wizard.test.ts, polls-screening.test.ts, search-home.test.ts, seo.test.ts
├── field-limits.test.ts, refresh-deltas.test.ts, m3-assets.test.ts
└── helpers/poll-fixtures.ts
```

**Structure Decision**: the existing single project; notes live beside the poll code (`src/polls/notes.ts`), and the
editor is a plain script beside `adminCard.js`, as the requirements' Technical Debt asked.

## Complexity Tracking

None. No principle is violated.
