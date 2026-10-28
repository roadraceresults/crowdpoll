# Implementation Plan: Poll Choices Editor

**Branch**: `dev` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-poll-choices-editor/spec.md`

## Summary

Replace the poll editor's row-per-choice UI (individual choice text boxes, per-row "Remove"
buttons, a separate "+ Add Choice" button) with a single free-text box and one "Save
Choices" button, porting `designDocs/smart-textbox.html`'s live typing guardrails (blank
lines blocked, 100-char/line cap, 50-line cap, live count) nearly verbatim. Saving replaces
the poll's entire active choice list in one server call rather than reconciling it against
the previous one — per the reconciliation strategy resolved during `/speckit-specify` (spec.md
FR-006), this is a full replace with no attempt to preserve an existing choice's identity,
matching the reference component literally. The direct, load-bearing consequence (research.md
R1): **every "Save Choices" click resets every current vote on the poll**, not only votes
tied to a choice that was actually removed — because no previous choice's id survives a save,
even one whose label text didn't change. This is a deliberate, already-resolved product
decision, not an oversight; it is called out again here because it is the single fact about
this feature most likely to surprise someone reading only the UI description.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS (existing project, unchanged)

**Primary Dependencies**: Existing stack only — Express 5, `mongodb` driver 6.x; vanilla
JS/CSS for the client (the ported `smart-textbox.html` logic plus `adminPoll.js`'s existing
per-field wiring-function convention), matching the codebase's zero-client-dependency
convention. No new dependencies.

**Storage**: MongoDB, same `polls` collection — no schema, field, or index changes
(data-model.md). `Choice`'s shape is unchanged; only which function produces/replaces
`Poll.choices` and how aggressively it touches `Poll.currentVotes` changes.

**Testing**: Vitest + supertest + mongodb-memory-server (existing pattern). Extends
`tests/polls-service.test.ts` (new `replaceChoices()` unit tests) and replaces the removed
`addChoice`/`editChoice`/`removeChoice` endpoint tests in `tests/polls-admin-crud.test.ts`
with equivalent coverage against the new endpoint. The live-typing guardrails (blank-line
blocking, char/line caps, live count) and the visual styling match are DOM/visual-level and
are validated manually via `quickstart.md`, per the constitution's tests-OR-manual-check
allowance.

**Target Platform**: Unchanged — DigitalOcean App Platform (Linux) for deployment; local dev
on Windows 11 + PowerShell (`devScripts/launch-dev.ps1`).

**Project Type**: Single project (existing layout, extended — no new top-level directories).

**Performance Goals**: Not a throughput-sensitive feature — one bounded array
validate-and-replace per admin save, no different in cost from the three per-choice
operations it replaces.

**Constraints**: The reconciliation strategy resolved in `/speckit-specify` (spec.md FR-006:
full replace, no identity/vote preservation) is the shaping constraint for this entire
feature — it is *why* the new server function can be simpler than the three it replaces
(no diffing against the previous state), and *why* it must aggressively reset
`currentVotes` (research.md R1).

**Scale/Scope**: 2 user stories, 14 functional requirements. Touches: `src/polls/service.ts`
(removes 4 functions, adds 1), `src/routes/pollsApi.ts` (removes 3 routes, adds 1),
`src/public/admin-poll.html` (Choices section markup), `src/public/adminPoll.js` (ported
smart-textbox logic replaces `renderChoices()`/add-choice wiring), `src/public/admin.css`
(a handful of new rules — most of the box's appearance is inherited from existing shared
rules, research.md R4), `postman/openapi.json` (3 operations removed, 1 added), and 2 test
files — no new files beyond this feature's own `specs/` documentation, no new collections.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Think Before Coding | The single scope-defining ambiguity (how a save reconciles against existing choice identity/votes) was surfaced with three concrete options and their consequences, and resolved with the user during `/speckit-specify` rather than guessed; the severe, easy-to-under-read consequence of the choice made (every save resets every vote) is restated explicitly in research.md R1, data-model.md, contracts/api-endpoints.md, quickstart.md, and this plan's own Summary, so it cannot be missed by anyone reading only one of these artifacts | ✅ PASS |
| II. Simplicity First | No new dependencies; the chosen reconciliation strategy (full replace) is the *simplest* of the three options that were on the table — no diffing/matching logic is implemented, matching the reference component's own ID-less model; the reference's placeholder-seeding fallback is deliberately not ported since it can never trigger against this app's actual data (research.md R3) | ✅ PASS |
| III. Surgical Changes | The three per-choice endpoints/functions this feature supersedes are deleted, not left as orphaned dead code, since this change is what orphans them (research.md R2, constitution Principle III's own "remove orphaned ... code your change creates"); their tests are replaced, not left stale | ✅ PASS |
| IV. Goal-Driven Execution | `replaceChoices()`'s validation and vote-reset behavior get automated unit + integration tests (data-model.md, contracts/api-endpoints.md); the live-typing guardrails and visual styling match get an explicit runnable manual check per user story in quickstart.md | ✅ PASS |
| V. Code Quality & Maintainability | One single-purpose function (`replaceChoices`) replaces three narrower ones it fully supersedes, rather than accumulating a fourth alongside them; the ported client logic keeps the reference component's existing internal structure (`sanitize`/`refresh`/`populate`) instead of inventing a parallel one | ✅ PASS |
| Security, Privacy & Reliability | No new input surface — same `requireAdmin` gate, same admin-only route; the server independently re-validates `labels` rather than trusting the client's own sanitization. **Flagged, not a gate failure**: this feature makes it easier to unintentionally destroy voter data than the UI it replaces (any save clears every vote, not just ones tied to a removed choice) — this is an accepted, explicitly-resolved product decision (spec.md FR-006/007), not an unreviewed risk, and is surfaced prominently in every design artifact per the Think Before Coding row above | ✅ PASS (flagged) |
| Performance & Operational Efficiency | `replaceChoices()` is one bounded validate-and-replace over ≤50 labels and the poll's existing vote list — no worse than, and structurally simpler than, the three operations it replaces | ✅ PASS |

**Post-Phase-1 re-check**: `data-model.md` introduces no new fields/collections/indexes —
only a different function producing/clearing existing ones. `contracts/api-endpoints.md`
documents a real HTTP surface change (3 operations removed, 1 added) — reflected in
`postman/openapi.json` during implementation. No additional dependencies, projects, or
patterns beyond what's justified above. ✅ PASS — no Complexity Tracking entries required
(the vote-reset behavior is a resolved product decision recorded across every design
artifact, not an architectural complexity violation needing justification here).

## Project Structure

### Documentation (this feature)

```text
specs/006-poll-choices-editor/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   └── api-endpoints.md
├── checklists/
│   └── requirements.md   # already validated (/speckit-specify, /speckit-clarify)
└── tasks.md               # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── polls/
│   └── service.ts          # EDITED: addChoice()/editChoiceLabel()/removeChoice()/
│                            #   markChoiceRemoved() removed; new replaceChoices(poll,
│                            #   labels) added (data-model.md, research.md R1/R2)
├── routes/
│   └── pollsApi.ts          # EDITED: POST/PATCH/DELETE .../choices(/:choiceId) removed;
│                            #   PUT /api/admin/polls/:pid/choices added, calling
│                            #   replaceChoices() and $set-ing both choices and
│                            #   currentVotes (contracts/api-endpoints.md)
└── public/
    ├── admin-poll.html       # EDITED: Choices section's <ul id="choiceList"> (active rows)
    │                        #   + "+ Add Choice" button replaced by a <textarea> + live
    │                        #   count + "Save Choices" button (ported from
    │                        #   designDocs/smart-textbox.html, research.md R3); a
    │                        #   separate read-only list for already-removed/audited
    │                        #   choices remains (FR-008)
    ├── adminPoll.js           # EDITED: renderChoices()'s active-row rendering and the
    │                        #   addChoiceBtn click handler are replaced by the ported
    │                        #   sanitize/refresh/populate logic and a single PUT call
    │                        #   (research.md R3); renderChoices() keeps rendering only
    │                        #   the already-removed list (FR-008)
    └── admin.css              # EXTENDED: a handful of new rules for the textarea+gutter
                                #   layout and hint/count text; the box's base appearance
                                #   (border, padding, font) is inherited from the existing
                                #   shared `.admin-field textarea` rule, and "Save Choices"
                                #   reuses the existing `.btn-header-ghost` class
                                #   (research.md R4) — no reference-component CSS is ported

postman/
└── openapi.json              # EDITED: addChoice/editChoice/removeChoice operations
                                #   removed; new PUT /api/admin/polls/{pid}/choices
                                #   operation added (contracts/api-endpoints.md)

tests/
├── polls-service.test.ts      # EXTENDED: unit tests for replaceChoices() (data-model.md)
└── polls-admin-crud.test.ts   # EDITED: existing addChoice/editChoice/removeChoice
                                 #   endpoint tests replaced by equivalent tests against
                                 #   PUT /api/admin/polls/:pid/choices
                                 #   (contracts/api-endpoints.md), including the
                                 #   full-poll vote-reset behavior
```

**Structure Decision**: Single project, existing layout extended — no new top-level
directories, collections, or files beyond this feature's own `specs/` documentation. The
notable structural decision is consolidating three narrow, identity-preserving per-choice
operations into one broader, identity-discarding bulk operation (`replaceChoices`) — a
reduction in the number of choice-editing entry points, not an addition, consistent with
`005-admin-page-improvements`'s own pattern of retiring superseded code paths rather than
accumulating alongside them.

## Complexity Tracking

*No entries — Constitution Check reported no violations requiring justification. The
vote-reset behavior flagged in the Security, Privacy & Reliability row is a resolved
product/spec decision (spec.md FR-006/007), not an architectural complexity tradeoff.*
