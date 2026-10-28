# Implementation Plan: Real-Time Opinion Poll System

**Branch**: `dev` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-realtime-poll-voting/spec.md`

## Summary

Replaces the `001-user-auth` demo landing page with a full real-time opinion poll system:
public/link-only/invitation-only polls, live-polling results (no push), single/multi-choice
and final/dynamic-vote mechanics, an admin authoring/moderation surface gated by
`APP_ADMINS`, and JSON/Markdown result exports. Adopts the reference `poll-card`/
`responsive-grid` UI files for markup, styling, and interaction, wired to a new `polls`/
`voteHistory` MongoDB schema and ~15 new API endpoints. The existing login/session/profile
system (`001-user-auth`, `002-smtp-env-config`, `003-profile-menu-consolidation`) is reused
as-is — this feature adds no new auth mechanics, only a new consumer of the existing session.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS (existing project, unchanged)

**Primary Dependencies**: Existing stack only — Express 5, `mongodb` driver 6.x,
`better-auth` (session lookup via `auth.api.getSession`, same call already used for the
`/profile` guard); vanilla JS for the static client, matching both the existing `app.js`
pattern and the reference `poll-card.js`/`responsive-grid.html` (also vanilla). No new
dependencies — `crypto.randomUUID()` (Node built-in) covers `PID`/choice-id generation
(research.md R3).

**Storage**: MongoDB (`APP_MONGODB_URI`/`APP_MONGODB_NAME`, same instance as auth data). Two
new collections: `polls`, `voteHistory` — see data-model.md, research.md R2.

**Testing**: Vitest + supertest + mongodb-memory-server (existing pattern). New
`tests/polls-*.test.ts` files exercise `contracts/api-endpoints.md` end-to-end; pure-function
service logic (percentage computation, `(removed)`-label truncation, `POLL_STATE`
derivation) gets direct unit tests per Goal-Driven Execution.

**Target Platform**: Unchanged — DigitalOcean App Platform (Linux) for deployment; local dev
on Windows 11 + PowerShell (`devScripts/launch-dev.ps1`).

**Project Type**: Single project (existing layout, extended — no new top-level directories).

**Performance Goals**: SC-001 (vote-to-visible-in-results <10s), SC-002 (a peer's vote
reflected within one `APP_POLLING_INTERVAL`, default 5s, no manual reload).

**Constraints**: SC-010 scale target (≤10,000 concurrent voters/poll, ≤1,000 active polls) —
directly shapes the storage layout (research.md R2) and the query-time-aggregation choice
(research.md R5). Zero pagination anywhere (spec Assumptions/`EXCLUSIONS`) — no `skip`/
`limit`/cursor params on any list endpoint. Real-time strictly via polling, never push
(FR-026, research.md R1).

**Scale/Scope**: 8 user stories, 57 functional requirements. ~2 new backend modules
(`src/polls/store.ts`, `src/polls/service.ts`), 1 new API router
(`src/routes/pollsApi.ts`), 3 new admin pages + a reworked home page, ~5 new client JS
files, 2 new MongoDB collections, ~15 new API endpoints (contracts/api-endpoints.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Think Before Coding | Spec fully clarified across 3 `/speckit-clarify` rounds + a 4th mid-plan (the reference grid's unaddressed category filter bar, resolved this session); one cross-feature ambiguity found and fixed at its root (`001-user-auth`'s `/api/me` incorrectly omitted `emailAddress` under OAuth, which this feature's invitation matching depends on) rather than worked around here | ✅ PASS |
| II. Simplicity First | No new dependencies (built-in `crypto.randomUUID`, hand-rolled exports, query-time aggregation over denormalized counters — research.md R3/R5/R12); reuses existing session/admin-guard idiom rather than inventing new auth | ✅ PASS |
| III. Surgical Changes | New poll functionality lives in new files (`src/polls/*`, `src/routes/pollsApi.ts`, new admin pages); `001-user-auth`'s `src/routes/api.ts` (auth/profile) is untouched by this feature; `index.html` is the one existing file substantially reworked, which is the spec's explicit intent (superseding the old demo landing content) | ✅ PASS |
| IV. Goal-Driven Execution | Every FR maps to a spec Acceptance Scenario; quickstart.md gives one runnable scenario per user story's Independent Test; contract-level behavior gets automated supertest coverage, pure-logic functions get unit tests | ✅ PASS |
| V. Code Quality & Maintainability | Storage/service/route layers separated by responsibility (`store.ts` = data access, `service.ts` = business rules, `pollsApi.ts` = HTTP); single canonical results-aggregation function avoids the counter-drift risk denormalization would introduce | ✅ PASS |
| Security & Privacy standards | Admin routes gated by a new `requireAdmin` middleware (research.md R6), same session mechanism as the rest of the app; voter eligibility (ban/invite/cap) enforced server-side on every vote, never trusted from the client | ✅ PASS |
| Performance & Efficiency | Two-collection storage split (research.md R2) keeps the hot-path document bounded at SC-010's stated scale instead of growing unboundedly with vote-history; query-time aggregation is sub-millisecond at ≤10k entries | ✅ PASS |

**Post-Phase-1 re-check**: `data-model.md`/`contracts/*` introduce exactly the two
collections and one new middleware justified above — no additional projects, dependencies,
or patterns. One documented deviation from a literal reading of the source doc (single
document per poll) is tracked in Complexity Tracking below. ✅ PASS.

## Project Structure

### Documentation (this feature)

```text
specs/004-realtime-poll-voting/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   ├── page-routes.md
│   └── api-endpoints.md
├── checklists/
│   └── requirements.md  # already validated (/speckit-specify, /speckit-clarify)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── polls/
│   ├── store.ts           # NEW: polls()/voteHistory() Mongo collection accessors
│   └── service.ts          # NEW: business logic — createDefaultPoll, deriveState,
│                            #   computeResults, submitVote, addChoice, removeChoice
│                            #   (with (removed)-label truncation, research.md R10),
│                            #   duplicatePoll, invite/ban, exportJson, exportMarkdown;
│                            #   requireAdmin middleware (shared by pollsApi.ts and
│                            #   pages.ts's new admin page guards, research.md R6)
├── routes/
│   ├── pollsApi.ts         # NEW: GET/POST /api/polls*, /api/admin/polls* — see
│                            #   contracts/api-endpoints.md
│   ├── pages.ts             # EXTENDED: GET / reworked to serve the poll grid instead
│                            #   of the old demo content; + GET /admin, /admin/poll,
│                            #   /admin/poll/results (requireAdmin-guarded); /login,
│                            #   /create-account, /profile unchanged
│   └── api.ts                # UNCHANGED — stays scoped to 001-user-auth's auth/profile
├── server.ts                 # EXTENDED: mount pollsApi router, wire polls()/voteHistory()
│                            #   collections at startup (same pattern as existing users())
└── public/
    ├── index.html            # REWORKED: adopts responsive-grid.html's header (brand +
                              #   greyed-out Create Poll/Search/filter-bar, research.md
                              #   R9 + spec Assumptions) and #cardGrid; session-driven
                              #   header area still mounted via existing app.js (R8)
    ├── admin.html             # NEW: admin main page shell (page-routes.md)
    ├── admin-poll.html        # NEW: edit poll configuration page shell
    ├── admin-results.html     # NEW: view results page shell
    ├── pollCard.css           # NEW: adapted from designDocs/pollUserInterface/
                              #   poll-card.css + the grid rules from
                              #   responsive-grid.html's inline <style> — kept separate
                              #   from styles.css (auth pages' minimal styling untouched)
    ├── pollCard.js             # NEW: adapted from designDocs/pollUserInterface/
                              #   poll-card.js — same flip/bar-layout/scroll mechanics,
                              #   real data layer replacing ensurePollData() (research.md
                              #   R7): fetches GET /api/polls/:pid, polls it every
                              #   APP_POLLING_INTERVAL (exposed via existing
                              #   GET /api/config), submits via POST /api/polls/:pid/vote
    ├── pollGrid.js             # NEW: home-page bootstrap — GET /api/polls, mounts one
                              #   pollCard instance per result; ?PID= → single standalone
                              #   card instead (contracts/page-routes.md)
    ├── adminList.js            # NEW: admin.html logic — poll list, Create New Poll,
                              #   copy-link, duplicate
    ├── adminPoll.js             # NEW: admin-poll.html logic — auto-save-on-blur fields,
                              #   choice add/edit/remove, participants section
    ├── adminResults.js          # NEW: admin-results.html logic — aggregate + participant
                              #   lists, export buttons
    ├── app.js                  # ADAPTED: renderHeader()'s output gains the CSS hooks
                              #   needed to sit inside the adopted header markup; no
                              #   change to its session/logout logic
    └── styles.css               # UNCHANGED — still serves login/create-account/profile

tests/
├── polls-vote.test.ts         # NEW: POST /api/polls/:pid/vote — FR-016/018-031, US1-2
├── polls-discovery.test.ts     # NEW: GET /api/polls, GET /api/polls/:pid — FR-032-034, US3
├── polls-admin-crud.test.ts    # NEW: create/edit/choices/duplicate — FR-036-048, US4-6
├── polls-admin-participants.test.ts  # NEW: invite/ban/results/export — FR-049-055, US7-8
└── polls-service.test.ts       # NEW: unit tests for pure logic in src/polls/service.ts
                                #   (percentage calc, (removed)-truncation, state
                                #   derivation, choice-removal reset)
```

**Structure Decision**: Single project, existing layout extended. Poll functionality is
domain-separated into `src/polls/` (data + logic) and a dedicated `src/routes/pollsApi.ts`,
kept apart from `001-user-auth`'s `src/routes/api.ts` — the two domains don't share routes
and mixing them into one growing file would violate Surgical Changes on every future auth-only
or poll-only change. `index.html` is reworked in place (not duplicated) since the spec's
explicit intent is that the poll grid *replaces* the prior demo landing content at `/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Two MongoDB collections (`polls` + `voteHistory`) instead of one document per poll (the source doc's literal wording) | FR-018 requires indefinitely-retained full vote history (Assumptions: no purge mechanism), which at SC-010's stated scale (10,000 participants, `DYNAMIC-VOTE-POLL` revoted repeatedly, kept forever) risks exceeding MongoDB's hard 16MB per-document limit if embedded in the same document read on every results/vote request | A single embedded document is simpler to reason about and matches the doc's literal phrasing, but has no bound on growth and would eventually corrupt or fail writes on a long-lived, popular, frequently-revoted poll — a correctness failure, not a style preference, so it was rejected rather than accepted as a documented risk |
