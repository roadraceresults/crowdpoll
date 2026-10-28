# Implementation Plan: Poll Settings Change

**Branch**: `dev` | **Date**: 2026-09-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/016-POLL-SETTINGS-CHANGE/spec.md`

## Summary

One five-valued stored setting, `pollVisibility`, becomes three two-valued ones: `pollVisibility`
(`Public Poll` / `Private Poll`), `pollSharingMode` (`Anyone With The Link` / `Invitation Only`) and
`voteAnonymity` (`Yes` / `No`). The admin card shows the two new choices only while a poll is
private, all three freeze once the poll has ever been voted on, and every behaviour that today
hinges on the phrase "Invitation Only" inside the visibility string is re-based on the conjunction
*private and Invitation Only*. Voters see nothing new. No document is migrated; `polls` and
`voteHistory` are dropped as a release step.

The approach is a narrow rename with one predicate at its centre. `isInvitationOnly()` changes from
a substring test on a string to a two-field test on the poll and takes the poll object; its six
server callers and the client's copy of it are the whole behavioural surface. Two constants, two
validation blocks, two radio groups, two read-only fields, three `openapi.json` enums and 46 test
literals follow mechanically. No endpoint is added or removed, no configuration changes, and
`voteAnonymity` has — by explicit decision — no reader in this feature.

## Technical Context

**Language/Version**: TypeScript 5.8 (server, ES modules, `node >=22`); vanilla ES2020 JavaScript
served as static assets (client — no framework, by long-standing project choice)

**Primary Dependencies**: Express 5, MongoDB driver 6, BetterAuth 1.3, nodemailer 7. No client
dependencies; no client build step beyond a copy into `dist/public`

**Storage**: MongoDB (this feature is sequenced *before* 017's move to PostgreSQL). Feature-relevant
collections: `polls` (two new fields, one narrowed enum), `voteHistory` (dropped with `polls` at
release, untouched in code). Untouched: `user`, `session`, `verification`, `email_change_requests`

**Testing**: Vitest 3 with supertest and `mongodb-memory-server`; the OpenAPI contract test reads
`postman/openapi.json`; asset tests read the shipped client files

**Target Platform**: DigitalOcean App Platform web service with managed MongoDB, autodeploy from
`dev`; evergreen desktop browsers for the administration page

**Project Type**: Single project — an Express web service serving its own static client from
`src/public`

**Performance Goals**: none new. The card must not change height between read-only and editing
form for either visibility (SC-005); no additional requests are introduced

**Constraints**: the three settings are stored and rendered verbatim with no code-to-label mapping
(FR-007); the two new fields are always present and never cleared (FR-003/FR-004); a public poll
ignores them everywhere (FR-005); `voteAnonymity` must have no reader beyond validation and echo
(FR-018); voter-facing responses are byte-for-byte unchanged apart from the removed enum values
(FR-020)

**Scale/Scope**: 2 constants, 1 predicate with 7 call sites (6 server, 1 client), 1 MongoDB query
(`homeGridFilter`), 12 literal occurrences of the old values in `postman/openapi.json`, 46 in 7
test files, 5 in `src/public/adminCard.js`, 1 seed file (`devScripts/populate/pollsImportData.json`)

**Unknowns**: none. The specification carries no `[NEEDS CLARIFICATION]` markers — the architecture
pass closed 12 findings against the source requirements and `/speckit-clarify` found nothing
further to ask.

## Constitution Check

*GATE: evaluated against `.specify/memory/constitution.md` v1.1.0. Re-checked after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| **I. Think Before Coding** | Assumptions stated; no silent interpretation | **PASS** — every interpretation the feature needed was raised as an architecture finding and resolved into the requirements before this plan; the eight assumptions in `spec.md` are the residue, each traceable to a resolved item |
| **II. Simplicity First** | Minimum code; nothing speculative | **PASS** — two new enum constants, two new fields, one predicate re-based, two radio groups reusing the existing `radioGroup()` helper. No new endpoint, module, abstraction or configuration. `voteAnonymity` is deliberately *not* given behaviour the spec defers (FR-018) — building a creator-facing surface now would be exactly the speculation this principle forbids |
| **III. Surgical Changes** | Every changed line traces to the request | **PASS** — the 46 test literals and 12 `openapi.json` literals are the request (FR-001), not cleanup. `INVITATION_ONLY_VISIBILITIES` is removed because this feature orphans it (the principle's own "clean up your own mess" clause). Pre-existing requirement-ID comments in touched regions are corrected only where the surrounding line changes; nothing is swept |
| **IV. Goal-Driven Execution** | Verifiable success criteria per task | **PASS** — eight measurable success criteria; `quickstart.md` gives a runnable scenario per user story, including the one that has no new capability (US3, the regression guard) |
| **V. Code Quality & Maintainability** | Minimal, modular, graceful errors; server logs informative, browser logs minimal and never sensitive | **PASS** — refusals reuse the existing `AdminError` path and its server-side logging; nothing new is logged in the browser. Research R9 |
| **VI. Self-Documenting Code** | Comments only point at external documentation | **PASS with a constraint** — new code (constants, predicate, validation branches, card groups) carries no explanatory or requirement-citing comments; `isInvitationOnly`'s current doc comment ("the only two questions the rest of the codebase asks of a visibility value") is corrected because that line is being rewritten anyway. Research R9 |
| **Documentation Deliverables** | `README.md` and `ARCHITECTURE.md` regenerated at the project root *after* implementation | **PASS — carries two obligations.** Both files exist (014 created `ARCHITECTURE.md`); each is updated in place for the three-field visibility model. `README.md` must remain free of references to `specs/`, `designDocs/` and `architecture/` |

No gate fails. The Complexity Tracking table is omitted.

## Project Structure

### Documentation (this feature)

```text
specs/016-POLL-SETTINGS-CHANGE/
├── plan.md              # This file
├── research.md          # Phase 0 output — 10 decisions
├── data-model.md        # Phase 1 output — the three settings, the predicate, the freeze
├── quickstart.md        # Phase 1 output — validation scenarios per user story
├── contracts/
│   ├── api-endpoints.md # Phase 1 output — the admin responses that change, and the voter ones that must not
│   └── ui-contracts.md  # Phase 1 output — the card's two forms and the three controls
├── checklists/
│   └── requirements.md  # /speckit-specify output — 16/16
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── polls/
│   ├── store.ts              # POLL_VISIBILITIES narrowed; POLL_SHARING_MODES, VOTE_ANONYMITIES added;
│   │                         #   Poll gains pollSharingMode, voteAnonymity; isInvitationOnly(poll) re-based;
│   │                         #   INVITATION_ONLY_VISIBILITIES removed; homeGridFilter queries the pair
│   └── service.ts            # createDefaultPoll defaults; validatePollFields validation + 409 freeze for the two
│                             #   new fields; duplicatePoll copies them; eligibility Picks widen; call sites
│                             #   pass the poll to isInvitationOnly
├── routes/
│   └── pollsApi.ts           # participants route passes the poll to isInvitationOnly; buildAdminPollDetail
│                             #   and the list row already spread the poll — the new fields flow through
└── public/
    └── adminCard.js          # POLL_VISIBILITIES copy narrowed; two new radio groups shown only when
                              #   private; two new read-only fields; client isInvitationOnly() re-based

postman/openapi.json          # pollVisibility enums (3 sites); pollSharingMode + voteAnonymity on admin
                              #   schemas and the update body; public schemas unchanged

tests/
├── helpers/poll-fixtures.ts  # makePoll gains the two fields with their defaults
├── openapi-contract.test.ts  # enum and field assertions
├── polls-admin-crud.test.ts  # validation, 409 freeze, duplicate — the two new fields alongside visibility
├── polls-admin-participants.test.ts
├── polls-discovery.test.ts   # home grid for invitees under the new pair
├── polls-editing-lock.test.ts
├── polls-state-machine.test.ts
└── polls-vote.test.ts        # eligibility under the new pair; public poll with stale "Invitation Only"

devScripts/populate/pollsImportData.json   # seed values re-expressed in the three fields
README.md, ARCHITECTURE.md                 # updated after implementation (constitution)
```

**Structure Decision**: single project, existing layout; no file is added or removed. The change is
confined to the two poll modules, one route file, one client script, the contract file, the fixtures
and seven suites. The 014 editing surfaces (`adminList.js`, `cardShell.js`, `pollCard.js`) are not
touched — `pollCard.js` never reads the visibility.

## Phase Status

| Phase | Output | Status |
|---|---|---|
| 0 — Research | `research.md` (R1–R10) | complete |
| 1 — Design | `data-model.md`, `contracts/api-endpoints.md`, `contracts/ui-contracts.md`, `quickstart.md`, agent context (`CLAUDE.md`) | complete |
| 2 — Tasks | `tasks.md` | `/speckit-tasks` |

## Post-Design Constitution Re-Check

Re-evaluated after Phase 1 with the data model and contracts in hand.

- **II. Simplicity First** — held. The design added nothing beyond the Technical Context's count:
  no helper for "is private" (it is `!isPublicVisibility(v)`, which already exists), no client-side
  state beyond the draft fields the card already keeps, no new CSS class for hiding (the `hidden`
  attribute the project already uses).
- **III. Surgical Changes** — held, with one deliberate widening: the eligibility functions'
  `Pick<Poll, …>` types gain `"pollSharingMode"` so the predicate can read it. That is the minimum
  the re-based predicate needs; nothing else in their signatures moves.
- **VI. Self-Documenting Code** — held. The contracts name the two error messages the server emits;
  the code needs no comment to say what the branch does.
- **Documentation Deliverables** — unchanged obligation; carried as the final task phase.

No new violations. Ready for `/speckit-tasks`.
