# Implementation Plan: Poll Edit Card

**Branch**: `dev` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/014-poll-edit-card/spec.md`

## Summary

The poll administration page becomes a list of cards, one per poll, where a poll's settings are both
displayed and edited in place. Two editing routes and their page and script are deleted, and their
logic — the editing session, the draft model, the choices editor, the participant lists — moves into
the card. Three stored enumerations are renamed to readable phrases and rendered verbatim everywhere,
which reaches the voter-facing poll card and invalidates every stored poll.

The approach is a client-side rewrite over an almost unchanged server. Two endpoints grow fields, two
response shapers gain a size cap, one configuration value is added, and no new endpoint is introduced.
The card's behaviour is not new either: every rule it enforces already exists in `adminPoll.js` or in
`service.ts`, so the work is relocation and composition rather than invention.

## Technical Context

**Language/Version**: TypeScript 5.8 (server, ES modules, `node >=22`); vanilla ES2020 JavaScript
served as static assets (client — no framework, by long-standing project choice)

**Primary Dependencies**: Express 5, MongoDB driver 6, BetterAuth 1.3, nodemailer 7. No client
dependencies; no build step for client assets beyond a copy into `dist/public`

**Storage**: MongoDB. Feature-relevant collections: `polls`, `voteHistory`. Untouched by this feature:
`user`, `session`, `verification`, `email_change_requests`

**Testing**: Vitest 3 with supertest and `mongodb-memory-server` (no local MongoDB needed); asset
content assertions read the shipped files over HTTP

**Target Platform**: DigitalOcean App Platform web service with managed MongoDB, autodeploy from `dev`;
evergreen desktop browsers for the administration page

**Project Type**: Single project — an Express web service that serves its own static client from
`src/public`

**Performance Goals**: the administration page usable within 3 seconds with 100 polls present
(SC-012); one request paints every card (no per-card fetch on load or refresh)

**Constraints**: no code-to-label mapping for any stored enumeration — values are stored exactly as
displayed; rosters over the configured ceiling are not sent to the browser at all; a card being edited
is never re-rendered by the background refresh

**Scale/Scope**: ~100 polls per administration page; rosters displayed up to 500 entries; roughly 180
literal occurrences of the three renamed constants across 20 files, 11 of them test suites

**Unknowns**: none. The specification carries no `[NEEDS CLARIFICATION]` markers — the architecture
pass closed 24 findings against the source requirements, and `/speckit-clarify` closed three more.

## Constitution Check

*GATE: evaluated against `.specify/memory/constitution.md` v1.1.0. Re-checked after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| **I. Think Before Coding** | Assumptions stated before implementation; no silent interpretation | **PASS** — 27 findings raised and resolved across the architecture and clarify passes, each with its rejected alternatives recorded |
| **II. Simplicity First** | Minimum code; nothing speculative | **PASS** — net deletion. Two routes, one page and one 883-line script are removed; no new endpoint, no new abstraction, no configurability beyond the one setting the spec requires |
| **III. Surgical Changes** | Every changed line traces to the request; no drive-by refactoring | **PASS with a note** — the constant rename touches ~180 literals across 20 files. That breadth *is* the request (FR-038–FR-041), not incidental cleanup. Dead `table.admin-poll-list` rules are removed because this feature orphans them, which is the principle's own "clean up your own mess" clause |
| **IV. Goal-Driven Execution** | Verifiable success criteria per task | **PASS** — 12 measurable success criteria; `quickstart.md` gives a runnable scenario per user story |
| **V. Code Quality & Maintainability** | Minimal, modular, single-purpose; graceful errors; server logs informative, browser logs minimal and never sensitive | **PASS with a constraint** — rosters hold email addresses, so nothing about a roster may be logged in the browser. See research R11 |
| **VI. Self-Documenting Code** (NEW in v1.1.0) | Comments only point at external documentation; never explain code, record history, or cite requirement or task identifiers | **PASS with a constraint** — the existing admin sources are dense with `012 T059 (FR-033):`-style comments. New card code carries none. Per the constitution's own scope clause, pre-existing comments are corrected only inside regions already being changed for another reason — they are not swept. See research R11 |
| **Documentation Deliverables** | `README.md` and `ARCHITECTURE.md` regenerated at the project root *after* implementation | **PASS — carries two obligations.** `ARCHITECTURE.md` does not exist and must be created. `README.md` currently has a "Project docs" section pointing at `specs/` and `designDocs/`, which the constitution now forbids; regeneration must remove it |

No gate fails. The Complexity Tracking table is therefore omitted.

## Project Structure

### Documentation (this feature)

```text
specs/014-poll-edit-card/
├── plan.md              # This file
├── research.md          # Phase 0 output — 11 decisions
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output — validation scenarios per user story
├── contracts/
│   ├── api-endpoints.md # Phase 1 output — the four changed responses
│   └── ui-contracts.md  # Phase 1 output — card modes, controls, accessibility
├── checklists/
│   └── requirements.md  # Spec quality checklist (16/16)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── config.ts                    # + ENV_PARTICIPANTS_VIEWPORT_SIZE
├── polls/
│   ├── store.ts                 # renamed enums, predicates, home-grid queries
│   ├── service.ts               # renamed enums in defaults + validation; roster cap helper
│   ├── sweeps.ts                # unchanged
│   └── screening.ts             # unchanged
├── routes/
│   ├── pages.ts                 # editSurface() and both registrations DELETED
│   ├── pollsApi.ts              # list response widened; cap in buildAdminPollDetail + results
│   └── api.ts                   # /api/config gains participantsViewportSize
└── public/
    ├── admin.html               # table markup replaced by a card list container
    ├── adminList.js             # list, refresh, actions menu, latch
    ├── adminCard.js             # NEW — card render, modes, draft, session, rosters
    ├── admin.css                # table rules removed; card rules added
    ├── adminPoll.js             # DELETED
    ├── admin-poll.html          # DELETED
    ├── pollCard.js              # renamed choiceMode comparison (voter-facing)
    ├── admin-results.html       # unchanged
    └── adminResults.js          # unchanged

tests/                           # 11 suites touched; see research R9
postman/openapi.json             # 4 response schemas + 5 enums
```

**Structure Decision**: The existing single-project layout is kept unchanged — `src/` for the service
and its static client, `tests/` for Vitest suites, `postman/openapi.json` for the API contract. This
feature adds exactly one source file (`src/public/adminCard.js`) and deletes two
(`src/public/adminPoll.js`, `src/public/admin-poll.html`). No new directory is introduced. The split
between `adminList.js` and `adminCard.js` is the one structural decision and is argued in research R1.

## Phase Status

- [X] Phase 0 — `research.md`: 11 decisions, no unresolved unknowns
- [X] Phase 1 — `data-model.md`, `contracts/api-endpoints.md`, `contracts/ui-contracts.md`,
      `quickstart.md`, agent context updated
- [ ] Phase 2 — `tasks.md` (produced by `/speckit-tasks`, not by this command)

## Post-Design Constitution Re-Check

Re-evaluated after Phase 1. No gate changed status. Two points were sharpened by the design work:

- **Simplicity First** held under pressure at research R1, where the obvious alternative — one large
  module carrying both the list and the card — was rejected in favour of two files with one direction
  of dependency. That is fewer moving parts per file, not more abstraction.
- **Self-Documenting Code** is the gate most likely to be breached during implementation, because the
  code being ported from `adminPoll.js` carries requirement-referencing comments on almost every
  function. R11 states the rule that applies as those functions move.
