# Implementation Plan: Admin Revisions

**Branch**: `dev` | **Date**: 2026-09-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-ADMIN-REVISIONS/spec.md`

## Summary

Twelve independent requirement groups that land on three surfaces: the admin poll list, the two
poll editing surfaces, and the public poll grid. They share one theme — decisions that currently
live in the browser, or in two places at once, move to a single authoritative place on the server.

The load-bearing change is a data-model collapse. Two poll fields, `accessMode` and
`resultsVisibility`, describe one concept between them, and one of their six combinations is
impossible. Rather than reject that combination the server silently rewrites whichever field the
administrator did *not* just touch, which is why the editing page has to re-fetch after every
change to either control. Replacing both with a single `pollVisibility` of five literal values
deletes the impossible cell, the auto-correction, the re-fetch, and a class of bug where a user's
explicit choice is overwritten without being told.

Around that sit four smaller pieces of work. Two live defects (invite and ban) turn out to be one
bug in one function, reached by three routes: the editing page's own lock makes the poll
"currently being edited", and the participant routes refuse it. A second write path on the editing
page (`PUT …/choices`) is folded into publish, which as a side effect fixes a dirty flag that
ignores one of its own fields. Three one-click state transitions are added to the poll list,
each writing the schedule fields in a shape the existing date sweep then *agrees* with — which is
what lets them work with no override flag anywhere in the model. And the poll grid becomes a
polling list, which is also the vehicle for making a vote impossible against a poll being edited.

Migration is explicitly out of scope: both collections are dropped at deploy.

## Technical Context

**Language/Version**: TypeScript 5.8, ES modules, Node 22 (`@types/node` ^22.15), `strict` with
`noUncheckedIndexedAccess`.

**Primary Dependencies**: Express 5.1, MongoDB driver 6.17, BetterAuth 1.3, Nodemailer 7 — all
already present. **No new runtime or development dependency is introduced by this feature.** The
icons the poll list needs are hand-authored inline SVG rather than an icon package (research R11).

**Storage**: MongoDB. Two collections, `polls` and `voteHistory`, both unchanged in shape apart
from the `Poll` field delta in [data-model.md](./data-model.md). No migration and no compatibility
shim — the spec's final assumption authorises deleting existing data at deploy (research R13).

**Testing**: Vitest 3.2 with supertest and `mongodb-memory-server`; no local MongoDB required.
Time-dependent behaviour is tested by injecting the current time, never by sleeping — the existing
convention in `polls-schedule-sweep.test.ts`, and the only practical way to assert the
manual-transition convergence in FR-028.

**Target Platform**: DigitalOcean App Platform — one Web Service instance plus managed MongoDB.
Autodeploy from `dev`.

**Project Type**: Server-rendered web service with static client pages — Express serving both a
JSON API and vanilla-JS pages from `src/public/`. No frontend framework, no build step beyond
`tsc` plus a recursive copy of `src/public`.

**Performance Goals**: Not throughput-bound. The binding constraints are the spec's own latency
targets: a poll that opens or closes appears on or leaves the home grid within one polling
interval (SC-008), and a manually chosen state survives a full scheduling cycle (SC-003). One
efficiency constraint is added rather than inherited: the grid must not grow its request count
with the number of cards (research R8).

**Constraints**: Single instance assumed, as in 011 — the editing lock and the sweeps are not
designed for concurrent instances. Every new refusal path must leave the poll unchanged, so the
manual state transitions validate before they write. The five visibility values contain spaces and
hyphens and are persisted verbatim, so they appear in query filters and test fixtures and must
never be retyped as literals (research R1).

**Scale/Scope**: Administrator-authored polls, tens to low hundreds; at most 500 voters on any
private poll. Roughly 10 source files change, none is added, and the visibility collapse touches
**119 occurrences across 15 files** — 51 lines in `src/`, the rest in the nine test suites and the
shared fixture helper. That count is what makes the Foundational phase unavoidably large.

**No NEEDS CLARIFICATION remain.** The specification carries none, and the four questions raised
during `/speckit-clarify` were answered and integrated before planning began.

## Constitution Check

*GATE: evaluated before Phase 0, re-evaluated after Phase 1 design. Both passes recorded.*

### I. Think Before Coding — **PASS**

Nothing here proceeds on a silent reading. The specification carries 15 assumptions and a
Clarifications section recording four questions and their answers; this plan's research records 13
decisions, each with the alternatives rejected. Where the source requirements contradict
themselves — three places, catalogued in the architecture document — the reading adopted is stated
rather than assumed. Where they contradict the *implemented* system, seven deltas are named, so no
one discovers mid-implementation that a passing test now encodes the wrong rule.

### II. Simplicity First — **PASS**, but the pre-implementation claim was wrong

> **Corrected at T091, after implementation.** This section originally claimed the feature would be
> "net-negative in code". Measured against the delivered diff, that is false: `src/` is
> **+1254 / −298, net +956 lines** (282 of the additions are comments). The principle still holds —
> every line traces to a requirement, no speculative abstraction was introduced, and no dependency
> was added — but the evidence originally offered for it did not survive contact with the work.
>
> Where the claim was right: **`routes/pollsApi.ts` is genuinely net-negative** (+64/−82), which is
> the layer the deletions were concentrated in. Where it was wrong: it under-counted the
> presentation work. US5 alone adds a column of state buttons, three radio groups, four inline-SVG
> icons and their styling — `admin.css` +243 and `adminList.js` +243, which no deletion offsets.
> A feature that adds visible controls adds code; the original framing mistook "deletes a lot" for
> "deletes more than it adds".

This feature deletes a great deal. Removed: one route (`PUT …/choices`), one function
(`refuseWhenNotConfigurable`), the access/visibility auto-switch block, the public→private
voter-limit auto-fill, one poll field net (two out, one in), a second dirty flag, and the grid's
per-card polling loop.

Added: three columns of state buttons rendered from booleans the server already computes, two
booleans joining that set, one shared admin predicate extracted from an existing inline check, and
four inline SVG icons. No new dependency. No new abstraction with a single caller — the one
extraction, `isAdminEmail`, exists because the requirements name two callers and the risk of drift
between them.

The deliberate simplicity call is research R4: the manual state transitions carry no override
flag. An override field would need a lifecycle of its own (when is it cleared? does editing the
schedule clear it? does archiving?). Writing the schedule fields so the sweep re-derives the chosen
state needs none of that, and leaves the poll's dates telling the truth.

### III. Surgical Changes — **PASS**

Every changed line traces to a requirement. Three things that could tempt an adjacent cleanup are
deliberately left alone: the vote-history retention rule, the ban semantics themselves (012 fixes
only the blocked call, not what banning means), and the responsive behaviour of the widened poll
list, which the spec explicitly defers to its own future feature.

Orphans created by this feature are removed with it — `refuseWhenNotConfigurable` has no callers
once the three participant routes adopt `resolveEditContext`, and the auto-switch block has none
once the two fields it reconciles are gone. Pre-existing dead code, if any is encountered, is
reported rather than removed.

### IV. Goal-Driven Execution — **PASS**

Every requirement in the spec is stated as observable behaviour, and
[quickstart.md](./quickstart.md) turns the ten success criteria into runnable checks. Two
requirements need explicit verification design rather than an assertion, and both are covered in
research: FR-028's convergence is verified by advancing injected time past a sweep tick and
re-asserting the state (R4), and FR-045's selection preservation is verified across a forced flip
rather than only across a refresh (R9).

### V. Code Quality & Maintainability — **PASS**, with the logging question answered explicitly

Modularity, single-purpose functions and graceful failure are all satisfied: the new rules land in
`src/polls/service.ts` as pure functions the routes call, which is where the existing validation
rules already live, and every new refusal returns a status and a message rather than throwing.

The clause that needs an explicit answer is *"The program MUST provide informative logging to the
console about what it is doing."* **This feature adds no logging**, because the source requirements
withdrew that scope in their latest revision and deferred it to a dedicated logging document. This
is judged a PASS rather than a violation on three grounds: the program already logs (startup,
configuration, sweep registration, sweep failures, auth events) and this feature removes none of
it; the withdrawn requirement would have applied per-item logging to two endpoints that are polled
every five seconds by every open page, which the *Performance & Operational Efficiency* section's
"MUST stay informative without becoming noise" independently forbids; and the new failure paths
this feature adds are all client-facing refusals that return a message to the caller, which is
graceful handling in the sense Principle V requires.

The volume analysis is preserved in the architecture document so the future logging feature does
not have to rediscover it. **If the developer reads Principle V as requiring new logging here, that
is a scope change to the source requirements, not a plan-level decision** — it is flagged here
rather than resolved silently.

### Security, Privacy & Reliability Standards — **PASS**

Input validation is tightened, not loosened: the voter count limit gains server-side enforcement
it did not have (FR-009), and the five visibility values are validated against a closed set. Two
privacy points are handled deliberately. `isAdmin` is a rendering hint and every admin route keeps
its own server-side gate (FR-053), so forging the flag reveals a menu entry whose target still
refuses. And `pollStateBeforeEditUpdate` becomes an input to a public read path for the first time
— research R6 requires it be used as a filter only and never emitted, so a visitor cannot learn
what state a poll was in before an administrator started editing it.

### Performance & Operational Efficiency — **PASS**, improved

The grid's request count drops from N + 1 per interval to 1 (research R8). Nothing added runs
continuously beyond the three existing sweeps, whose intervals and behaviour are untouched.

### Gate result (pre-Phase 0)

**PASS — no violations.**

### Re-evaluation after Phase 1 design

Re-checked against `research.md`, `data-model.md`, `contracts/` and `quickstart.md`. **Still PASS.**
The design phase changed the assessment in two places, both favourably:

- **Principle II strengthened.** Two design decisions removed code that the pre-Phase-0 pass had
  assumed would stay. Research R2 deletes the access/visibility auto-switch outright rather than
  remapping it, and research R8 deletes the grid's per-card polling loop rather than adding a
  parallel one. The feature's net effect on code volume is more negative than first estimated.
- **Principle IV sharpened.** Two requirements that were merely "testable" in the abstract now have
  concrete verification designs: FR-028's convergence is asserted by advancing injected time past a
  sweep tick (quickstart SC-003 step 4, and `polls-schedule-sweep.test.ts`), and the model collapse
  is verified by grep rather than by query, which is only sound because no document survives the
  deploy.

Two design decisions were checked specifically for new violations and cleared. Research R7 adds an
error `code` field to one refusal — a discriminator, not an abstraction, and the alternative
(string-matching user-facing copy) is the more fragile design. Research R6 gives
`pollStateBeforeEditUpdate` a role in a public read path, which is a privacy surface; it is
constrained to a filter input, never emitted, and asserted by test.

**No violations at either gate. Complexity Tracking is therefore empty.**

## Project Structure

### Documentation (this feature)

```text
specs/012-ADMIN-REVISIONS/
├── plan.md              # This file
├── research.md          # Phase 0 output — 13 decisions
├── data-model.md        # Phase 1 output — Poll field delta, validation, transitions
├── quickstart.md        # Phase 1 output — runnable validation of all 10 success criteria
├── contracts/
│   ├── api-endpoints.md # Phase 1 output — request/response delta per route
│   └── ui-contracts.md  # Phase 1 output — poll list row, editing surfaces, card faces
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify, re-validated)
├── spec.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── config.ts                  # unchanged
├── server.ts                  # unchanged
├── auth/                      # unchanged
├── email/                     # unchanged
├── polls/
│   ├── store.ts               # Poll: -accessMode -resultsVisibility +pollVisibility
│   ├── service.ts             # visibility validation; voter-limit rules; state-action
│   │                          #   transitions; capabilitiesFor(); isAdminEmail();
│   │                          #   EDITING vote refusal; choices folded into publish
│   └── sweeps.ts              # unchanged — convergence comes from the transition rules
├── routes/
│   ├── api.ts                 # GET /api/me gains isAdmin
│   ├── pages.ts               # unchanged
│   └── pollsApi.ts            # -PUT …/choices; PATCH gains OPEN; three participant
│                              #   routes adopt resolveEditContext; public listings admit
│                              #   EDITING conditionally; list returns canOpen/canClose
└── public/
    ├── admin.html             # 10-column header
    ├── adminList.js           # row layout, zebra, state buttons, action icons
    ├── admin-poll.html        # radio groups; no Save Choices button
    ├── adminPoll.js           # one dirty flag; always-enabled Cancel; participants
    ├── admin.css              # row, zebra, radio group, icon styling
    ├── app.js                 # Poll Administration menu entry
    ├── pollGrid.js            # membership polling; feeds cards from the list response
    ├── pollCard.js            # EDITING front face; selection preserved across a flip
    └── pollCard.css           # unavailable-message styling

tests/                         # Vitest; suites extended, none added
├── polls-admin-crud.test.ts        # visibility, voter limit, publish-with-choices
├── polls-admin-participants.test.ts # the lock-aware participant routes
├── polls-state-machine.test.ts     # OPEN/CLOSE/ARCHIVE transitions + schedule writes
├── polls-schedule-sweep.test.ts    # convergence after a manual transition
├── polls-discovery.test.ts         # EDITING admission to the public listings
├── polls-vote.test.ts              # EDITING refusal; voter limit across all private values
├── polls-service.test.ts           # capabilitiesFor, isAdminEmail
├── profile.test.ts                 # isAdmin on /api/me
├── openapi-contract.test.ts        # contract sync
└── helpers/poll-fixtures.ts        # pollVisibility replaces the two old fields

postman/openapi.json           # kept in sync — enforced by openapi-contract.test.ts
```

**Structure Decision**: The existing single-project layout is kept unchanged. This feature adds no
directory and no file — it modifies ten source files and eight test files in place. That is the
correct shape here because every requirement group extends behaviour that already has a home:
validation rules belong in `polls/service.ts` beside the rules they replace, route changes belong
in `routes/pollsApi.ts`, and the three client surfaces already have one script each. Introducing a
module for any single group would add an import boundary without a second caller, which
Principle II forbids.

## Complexity Tracking

*Not applicable — the Constitution Check passed with no violations.*
