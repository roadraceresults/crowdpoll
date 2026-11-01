# Implementation Plan: Editing an Open Poll Without Interrupting Voting

**Branch**: `editing-poll-available` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261029-225209-EDITING-POLL-AVAILABLE/spec.md`

## Summary

An open, ever-voted poll stays listed and votable while its creator edits it and while saved changes are screened. Two mechanisms carry the feature: the poll projection publishes the *stashed* state while a poll is `EDITING`, so the vote path and every voter-facing reader behave as if no edit session existed (research R1); and a save's screenable content (title, subtitle, the choice list) is held in a new `polls.pending_update` column and applied by the approval sweep while the poll keeps serving its pre-save content — the poll's own state is never written, so it never unlists, never refuses votes and never re-stamps `launched_at` (R2). Choices on a voted poll change by id through a new `mergeChoices` (exact-trimmed-label matching; survivors keep id, label and position; R3); an applied deletion removes the id from every affected vote in the same transaction, rebuilds the line-graph tally and reconciles the counters (R4). The freezes on sharing mode, Single→Multiple and vote mutability are relaxed, keyed on ever-voted as all freezes are (R5). The admin card unlocks the corresponding controls, computes the choices merge against the session-entry list, and confirms voted deletions with counts from a snapshot the edit-session grant now carries (R6, R7); while changes are pending the editor is refused and the card shows "changes pending review" (R8).

## Technical Context

**Language/Version**: TypeScript on Node ≥ 22, ESM.

**Primary Dependencies**: Express 5, Kysely (PostgreSQL), BetterAuth. Browser: vanilla JavaScript and CSS, no framework, no bundler. No new dependency.

**Storage**: PostgreSQL. Two additive nullable columns on `polls` (`pending_update jsonb`, `pending_rejection_reason text`, migration `014-pending-update`), no backfill. A deletion's apply rewrites `votes.choice_ids` rows of one poll in one transaction (accepted in requirements, NC2).

**Testing**: Vitest with supertest and embedded PostgreSQL for server suites; jsdom for client scripts via `tests/helpers/browser.ts` (client fetches route through supertest to the real app).

**Target Platform**: DigitalOcean App Platform, one autoscaled web service; browsers on desktop and phone.

**Project Type**: Web service with a browser client.

**Performance Goals**: The vote hot path gains no read and no branch (it already validates against the projection; only the projected value changes). The approval sweep keeps its one-poll-per-tick cadence over two disjoint claim pools. The deletion rewrite is O(votes of one poll) inside one transaction, run only on an explicitly confirmed deletion.

**Constraints**: No new configuration value, route, cookie or browser storage key. The pending columns are non-content fields (setting them must not bump `content_version`, or voters would refetch unchanged content); the apply itself is an ordinary content write. `postman/openapi.json` follows the contract changes (A7).

**Scale/Scope**: ~7 server files (route, service, store, sweeps, projection, the vote path's refusal wording, counters untouched but called), 2 client files (adminCard.js, adminList.js pass-through), one migration, one new server test suite plus extensions to four existing suites.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | The two load-bearing choices (projection publishes the stashed state; pending set instead of AWAITING APPROVAL) are stated with alternatives in R1/R2; every requirements-phase decision (19 findings) is cited where applied | Pass |
| II. Simplicity First | No new table, route, module or setting; the pending pool reuses the existing claim columns and sweep; `mergeChoices` sits beside `replaceChoices` instead of generalizing it | Pass |
| III. Surgical Changes | The unreachable `POLL_EDITING` branches stay in place; `user_polls` rows are not touched; `/colors` and the EDIT-mode (never-voted) flow are unchanged | Pass |
| IV. Goal-Driven Execution | Each scenario in quickstart.md maps to a user story or FR; R12 names the suites that verify each mechanism | Pass |
| V. Code Quality | The sweep logs each pending apply/reject; the browser logs nothing new; refusals are structured codes (`PENDING_REVIEW`) | Pass |
| VI. Self-Documenting Code | New code cites no finding, FR or task id; names carry the meaning (`pendingUpdate`, `mergeChoices`, `askToDeleteChoices`) | Pass |
| Security, Privacy & Reliability | All relaxations enforced server-side in `validatePollFields`/route, not only in the UI; access on sharing-mode switch rides existing live checks; no address logged | Pass |
| Performance & Operational Efficiency | No polling added; the admin card reuses the existing 5 s list refresh for pending status | Pass |
| Documentation Deliverables | README.md and ARCHITECTURE.md are regenerated after implementation (documentation phase in tasks.md) | Deferred to after implementation |

**Gate result**: no violations. Nothing to justify in Complexity Tracking.

**Post-design re-check** (after Phase 1): unchanged — the design added no project, no abstraction and no configuration; the one judgment call (the whole choice list travels in the pending set even for deletion-only saves) is justified in R2 as the price of a single atomic apply path and stays inside SC-003's 10-second budget.

## Project Structure

### Documentation (this feature)

```text
specs/20261029-225209-EDITING-POLL-AVAILABLE/
├── plan.md              # This file
├── research.md          # Phase 0 output — R1–R12
├── data-model.md        # Phase 1 output — pending_update shape, vote-rewrite semantics
├── quickstart.md        # Phase 1 output — six validation scenarios
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
├── contracts/
│   ├── api.md           # A1–A7: edit-session, /publish split, sweep, vote, admin rows, openapi
│   └── ui-contracts.md  # C1–C8: choices editor, merge + confirmation, locks, statuses
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── db/
│   ├── migrations/014-pending-update.ts   # new: pending_update, pending_rejection_reason
│   ├── migrations/index.ts                # register 014
│   └── schema.ts                          # PollTable columns
├── polls/
│   ├── store.ts        # Poll fields + column map, NON_CONTENT_FIELDS, claimNextForApproval over both pools
│   ├── service.ts      # mergeChoices; validatePollFields relaxations; editModeFor PENDING_REVIEW
│   ├── sweeps.ts       # approval sweep: screen/apply/reject pending updates
│   ├── versions.ts     # projectPoll publishes the effective (stashed) state
│   └── counters.ts     # unchanged; reconcile() called after a deletion apply
├── routes/
│   └── pollsApi.ts     # edit-session choiceCounts + PENDING_REVIEW; /publish split; adminListRow fields
├── votes/
│   └── votePath.ts     # reworded refusal of a vote naming a deleted choice
└── public/
    ├── adminCard.js    # unlock steps, merge diff, askToDeleteChoices, pending/rejected status, payload
    └── adminList.js    # passes the new row fields through (if any change is needed at all)

tests/
├── polls-pending-update.test.ts   # new suite: pending lifecycle, merge, deletion rewrite, refusals
├── polls-editing-lock.test.ts     # votes during EDITING-stashed-OPEN; projection state
├── polls-screening.test.ts        # pending claim/approve/reject/timeout; launched_at; close-while-pending
├── client-admin-wizard.test.ts    # unlocked UPDATE steps, confirmation dialog, payloads, statuses
└── openapi-contract.test.ts       # contract changes

postman/openapi.json               # A7
```

**Structure Decision**: the existing single-service layout; every change lands in files that already own the touched behaviour. No new module: the pending-update apply lives in `sweeps.ts` beside the approval logic it extends, and `mergeChoices` in `service.ts` beside `replaceChoices`.

## Complexity Tracking

No constitution violations; table intentionally empty.
