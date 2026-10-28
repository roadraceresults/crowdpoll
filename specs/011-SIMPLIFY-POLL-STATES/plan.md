# Implementation Plan: Simplify Poll States

**Branch**: `dev` | **Date**: 2026-08-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-SIMPLIFY-POLL-STATES/spec.md`

## Summary

Replace the current four-value poll state model — where two values are derived from the schedule on
every read and editing a voted-on poll is reconciled against existing votes — with eight explicitly
stored states, and remove the reconciliation machinery entirely.

The simplification is the point: full editing is restricted to polls that have never been voted on,
so choices become immutable the moment a vote exists, so the `(removed)` markers on choices and
votes have nothing left to support and are deleted. What replaces them is a lifecycle: an explicit
publish step, a content-screening gate with a bounded retry budget, a per-tab editing lock that
recovers itself, and three recurring server processes that move polls between states without
administrator action.

Technically this is four pieces of work that share one data model: a stored state field with
transition rules; a screening pipeline whose claim, attempt count and recovery paths are designed
so that a process dying mid-call still terminates; a heartbeat-based editing lock; and a
project-wide configuration rename that this feature carries for features 001 and 002.

## Technical Context

**Language/Version**: TypeScript 5.8, ES modules, Node 22 (`@types/node` ^22.15)

**Primary Dependencies**: Express 5.1, MongoDB driver 6.17, BetterAuth 1.3, Nodemailer 7 — all
already present. **No new runtime dependency is introduced by this feature** (see research R1, R2).

**Storage**: MongoDB. Two collections: `polls` (configuration plus current votes) and `voteHistory`
(append-only). Schema simplification is in scope; migration is not (research R7).

**Testing**: Vitest 3.2 with supertest and `mongodb-memory-server`; no local MongoDB required.
Time-dependent behaviour is tested by injecting the current time, never by sleeping.

**Target Platform**: DigitalOcean App Platform — one Web Service instance plus managed MongoDB.
Autodeploy from `dev`.

**Project Type**: Server-rendered web service with static client pages — Express serving both a JSON
API and vanilla-JS pages from `src/public/`. No frontend framework, no build step beyond `tsc`.

**Performance Goals**: Not throughput-bound. The binding constraints are latency to *state*
correctness, taken from the spec's measurable outcomes: a poll reaches its schedule-appropriate
state within 60s (SC-007), an abandoned editing lock frees within 40s (SC-005), and the admin list
reflects a change within 5s (SC-010).

**Constraints**: Background work runs in the same process as the web server, so no sweep may block
the event loop or overlap itself (research R2). Screening must not hold a claim indefinitely —
every call is bounded by a timeout, and every claim is recoverable by a later tick even if the
process that took it no longer exists. Single instance assumed; concurrent instances are explicitly
a later feature.

**Scale/Scope**: Administrator-authored polls, tens to low hundreds. One poll screened per tick at
5s drains roughly 700/hour, which the spec's own analysis found sufficient. Roughly 8 source files
change substantially, 2 are added, and the configuration rename touches ~20 names across code,
tests, scripts, documentation and the deployment environment.

**No NEEDS CLARIFICATION remain.** The one genuine unknown — how screening is performed — is
resolved in research R1 by defining it behind an interface and shipping a local default, which
unblocks every dependent requirement without committing to an external service.

## Constitution Check

*GATE: evaluated before Phase 0, re-evaluated after Phase 1 design. Both passes recorded.*

### I. Think Before Coding — **PASS**

Assumptions are stated rather than embedded: the spec carries ten, and this plan's research
records ten decisions each with its rejected alternatives. Two interpretations that would have
changed the work were surfaced and settled in the source document before planning began — whether
the schedule fields were being renamed (they are not), and whether a screening attempt is counted
on claim or on failure (on claim). Nothing in this plan proceeds on a silent reading.

### II. Simplicity First — **PASS**, and it is the feature's purpose

This feature deletes more than it adds. Removed: per-choice and per-vote `removed` markers, the
vote-reconciliation logic on choice change, the duplicate-poll carry-over filtering for removed
choices, and the derived-state computation on every read. Added: one stored state field, five
bookkeeping fields, three interval-driven sweeps, and one screening interface.

No new dependency is introduced. No abstraction is added for a single caller except the screening
interface, which exists because research R1 identified a real second implementation, not a
hypothetical one. The queue ordering uses the database's natural null-first sort rather than a
sentinel value or a computed sort key (research R5).

### III. Surgical Changes — **PASS with one deliberate exception**

Every change traces to a requirement. The one exception is the configuration rename, which touches
files this feature otherwise has no reason to open — `src/auth/auth.ts`, `src/email/mailer.ts`, the
launch templates, `README.md`, `postman/openapi.json`, `CLAUDE.md`. That is not incidental cleanup:
it is FR-056 through FR-059 and User Story 10, assigned to this feature by the source requirements
because this feature adds six new settings and would otherwise entrench two conventions permanently.
It is recorded in Complexity Tracking below rather than passed off as tidying.

### IV. Goal-Driven Execution — **PASS**

Every functional requirement has an acceptance scenario in the spec, and the quickstart turns the
fourteen success criteria into runnable checks. The three hardest behaviours to verify — lock
recovery, the attempt budget under a crashing process, and schedule transitions — are all made
directly assertable by the injected-time pattern, so "done" is a passing test rather than a
judgement call.

### V. Code Quality & Maintainability — **PASS**

The sweeps are exported as single-tick functions with the timer scheduling separated from the tick
body, which is what makes them both testable and readable. Every sweep body is wrapped so a failure
logs and the next tick still runs — a screening outage must not take down the web server. The
screening interface is the modularity the constitution asks for: replacing the screener later
requires no change to any caller.

Error handling follows the existing pattern: fail fast and loudly at startup for missing
configuration, log-and-continue at runtime.

### Security, Privacy & Reliability — **PASS, with one privacy decision made explicit**

Screening may send unpublished poll text outside the system if a hosted implementation is chosen.
Research R1 makes the local implementation the default specifically so that this is an opt-in
rather than an inherited cost. Beyond that: all editing and administration remains behind the
existing admin gate, votes are refused unless the poll is open regardless of how the voter arrived
(FR-004), and the lock's ownership check prevents a stale client from clearing another
administrator's lock.

### Performance & Operational Efficiency — **PASS**

Three timers in a single process, each doing one indexed query per tick, with overlap guards. The
heaviest tick performs one screening call. Indexes are specified in the data model for both queue
queries and the stale-lock query so no sweep performs a collection scan.

### Post-Phase 1 re-evaluation — **PASS, no new violations**

The design added no project, no dependency, and no pattern beyond what the pre-Phase-0 check
anticipated. The one item in Complexity Tracking is unchanged. The data model removed two fields
more than it added net of the state bookkeeping, which strengthens rather than weakens the
Simplicity First position.

### Second-pass audit (2026-08-28, after the artifacts were first written)

Re-running the gate against the completed artifacts found two coverage gaps, both now closed. They
are recorded rather than quietly fixed, because Principle I is about surfacing what was missed.

**The duplicate endpoint had no specified state.** `duplicatePoll()` currently writes
`ACTIVE-POLL-STATE`, a value this feature deletes. Nothing in the first pass said what should replace
it — and the wrong answer is dangerous rather than merely wrong: a duplicate carries the source's
title, subtitle and choices, so inheriting an approved state would put unscreened content in front of
the public. The contract now specifies that a duplicate starts `INITIALIZED`, and the transition
table records it.

**The three sweeps were referenced everywhere and specified nowhere.** Each was named in the
structure, the research and the index notes, but no artifact stated any sweep's query, ordering or
effects. FR-033's requirement that stalled claims be recovered *before* new screenings begin existed
only as a clause inside an index justification. `/speckit-tasks` reads these artifacts to generate
work; it would have had to guess. `data-model.md` now specifies all three, including why the
crashed-claim query must run first — a poll whose claim was abandoned is invisible to the
unclaimed-poll query, so without recovery-first it would be starved indefinitely by its own claim.

## Project Structure

### Documentation (this feature)

```text
specs/011-SIMPLIFY-POLL-STATES/
├── plan.md              # This file
├── research.md          # Phase 0 — ten decisions with rejected alternatives
├── data-model.md        # Phase 1 — poll shape, the eight states, transitions, indexes
├── quickstart.md        # Phase 1 — runnable validation of all fourteen success criteria
├── contracts/
│   ├── api-endpoints.md #   JSON API: new endpoints and changed responses
│   ├── page-routes.md   #   Page routes and their access rules
│   └── ui-contracts.md  #   Control availability and messaging per state
├── checklists/
│   └── requirements.md  # Spec quality checklist — 16/16
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── config.ts                 # CHANGED: ENV_ rename; six new settings
├── server.ts                 # CHANGED: start/stop the three sweeps
├── auth/
│   ├── auth.ts               # CHANGED: rename only — the interpolated OAuth template
│   └── username.ts           # unchanged
├── email/
│   └── mailer.ts             # CHANGED: rename only
├── polls/
│   ├── store.ts              # CHANGED: eight states; new fields; removed markers deleted; indexes
│   ├── service.ts            # CHANGED: transitions, eligibility, publish, schedule evaluation
│   ├── screening.ts          # NEW: the screening interface and its local default
│   └── sweeps.ts             # NEW: the three single-tick sweep functions
├── routes/
│   ├── pollsApi.ts           # CHANGED: session, heartbeat, publish, re-screen endpoints
│   ├── pages.ts              # CHANGED: the update-poll page route and its access rule
│   └── api.ts                # unchanged
└── public/
    ├── adminPoll.js          # CHANGED: autosave removed; publish/cancel; heartbeat; exit guards
    ├── adminList.js          # CHANGED: interval refresh in place; action-menu rules; reason column
    ├── admin-poll.html       # CHANGED: publish and cancel controls
    └── pollCard.js           # CHANGED: state vocabulary (pollGrid.js needs none — it
                              #   references no poll state)

tests/
├── polls-state-machine.test.ts   # NEW: transitions and per-state visibility
├── polls-editing-lock.test.ts    # NEW: claim, heartbeat, ownership, stale recovery
├── polls-screening.test.ts       # NEW: claim atomicity, attempt budget, timeout, recovery
├── polls-schedule-sweep.test.ts  # NEW: schedule transitions and the inverted-dates fail-safe
├── config.test.ts                # CHANGED: new names, new settings, fail-fast messages
├── polls-admin-crud.test.ts      # CHANGED: edit/update eligibility, delete rules
├── polls-vote.test.ts            # CHANGED: votes refused unless open
├── polls-service.test.ts         # CHANGED: derived state removed; removed-marker cases deleted
└── (remaining suites)            # CHANGED: rename only

postman/openapi.json              # CHANGED: new endpoints; renamed settings in descriptions
README.md, CLAUDE.md              # CHANGED: rename only
launch.json.example
devScripts.example/*.ps1          # CHANGED: rename only
```

**Structure Decision**: The existing single-project layout is kept unchanged — `src/` with
`polls/`, `routes/`, `auth/`, `email/` and static `public/`, and a flat `tests/`. This feature adds
two modules inside `src/polls/` rather than introducing a new top-level directory, because both are
poll domain logic and belong beside the service they extend. Splitting the sweeps into their own
file (rather than growing `service.ts`, already 489 lines) keeps each file single-purpose per
Principle V; splitting screening out is what makes the interface in research R1 replaceable.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Configuration rename touches ~20 names across files this feature otherwise would not open, breaching Principle III's "touch only what the task requires" | FR-056–FR-059 and User Story 10 assign it here. This feature introduces six new settings; adding them under the new convention while fifteen remain under the old one makes the split permanent, and leaves the "no superseded name remains" check permanently unanswerable | *Rename in a separate feature*: leaves this feature to choose between two conventions for its own six settings, both wrong. *Accept both names during a deprecation period*: guarantees the old names survive indefinitely and makes FR-058 unverifiable — with no production users there is nobody to deprecate for |
