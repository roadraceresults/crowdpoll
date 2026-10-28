# Implementation Plan: Newest Poll Tab

**Branch**: `dev` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/019-NEWEST-POLL-TAB/spec.md`

## Summary

The Newest tab lists the public polls that most recently entered the OPEN state — at most
`ENV_MAX_NEWEST_POLLS` (50) of them, most recent first, ties by vote total then by id — recomputed
every `ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL` (60 s) by one instance under an advisory lock and
published as two objects (`newest-counts.json` every recompute, `newest.json` only when the set
of ids changes) beside the Trending objects. The browser renders from a session-storage copy on
reload, fetches the counts on each interaction under a browser-side bucket of its own, fetches
the cards only on a membership change, and asks the fleet for nothing but a signed-in visitor's
overlay. A closed poll leaves; a re-opened poll is newly launched; a poll under edit stays.

The approach is to instantiate 017's TRENDING publication a second time rather than build a
parallel one. One migration adds `polls.launched_at` and the partial index
`polls_home_launched`; `updatePoll` stamps and clears the column beside its `closed_at` line;
`recomputeNewest` sits next to `recomputeTrending` and shares its `listable` predicate, version
hash and ETag helpers; the publisher takes its object names as a parameter so a second instance
serves Newest; a second sweep schedule runs it; two instance routes reuse the Trending handler
with the Newest reader; `newest.js` is `trending.js` with its tab name, storage key, object
names, interval key and empty-state text changed; `tabs.js` loses the 018 placeholder and gains
`KIND_OF.newest`. No backfill: existing open polls enter the tab when they next open, and the
scale seed writes the column itself.

## Technical Context

**Language/Version**: TypeScript 5.8 (server, ES modules, `node >=22`); vanilla ES2020 JavaScript
served as static assets (client — no framework, by long-standing project choice)

**Primary Dependencies**: Express 5, Kysely 0.29 + `pg` (the migration and the ranked query),
`@aws-sdk/client-s3` (the existing Spaces publisher, reused), `node:crypto` (the existing
membership hash / ETag). No new dependency

**Storage**: PostgreSQL — one nullable `timestamptz` column and one partial index on `polls`;
the shared cache (in-process or Valkey) holds `listing:newest:counts|cards|meta`; Spaces + CDN
(or the instances) serve the two objects; browser `sessionStorage` holds `newest:copy`

**Testing**: Vitest 3 on embedded PostgreSQL through `tests/helpers/setup.ts`
(`startTestContext` with `ENV_*` overrides, `ctx.trendingPublisher`, `polls(ctx).insertOne`);
`supertest` for the routes; jsdom 30 through `tests/helpers/browser.ts` (`openPage` with a
`sessionStorage` seed, `click`, `cardTitles`, request capture) for the tab; `tests/helpers/explain.ts`
(`planNodes`, `seqScansOfPolls`) for the index guard

**Target Platform**: DigitalOcean App Platform web service (4–12 instances) with Managed
PostgreSQL, Valkey, Spaces + CDN; development needs PostgreSQL only (instance-served objects)

**Project Type**: Single project — an Express web service serving its own static client from
`src/public`

**Performance Goals**: the recompute reads exactly `cap` index entries on a million-row table
(SC-005); a guest's Newest interaction reaches no instance behind a CDN, a member's exactly one
(SC-003); the counts object alone moves when membership is unchanged (SC-004); a launch is
published within one interval (SC-001)

**Constraints**: every vote path and counter rule of 017 is untouched — counts shown come from
`readOrRebuildCounts`, never the row (FR-015); Newest interactions are not dynamic requests
(FR-020); `/api/trending/` stays the one listing base and `trendingBaseUrl` keeps its name
(FR-016); the tab's identifier, label, icon and panel from 018 do not change (FR-029); `launched_at`
is never displayed or exported (assumption); the 018 placeholder controller **must be deleted**,
since `init()` runs after deferred scripts register and would overwrite the new controller

**Scale/Scope**: 1 migration (+ registry line), 1 schema line, 2 store lines, 2 config fields +
2 checks, ≈ 40 lines of recompute, ≈ 10 of publisher generalisation, 1 sweep + schedule, 2 routes
(+ 2 aliases), 1 config field, 1 new client module (≈ 160 lines cloned), 3 `tabs.js` lines,
1 script tag, seed script 1 line, 3 templates + `.do/app.yaml` + CLAUDE.md table, OpenAPI (2 paths,
1 config field), 1 new test file, 4 test files touched, README/ARCHITECTURE after implementation

**Unknowns**: none. The specification carries no `[NEEDS CLARIFICATION]` markers — two
architecture passes closed 15 findings against the source requirements and `/speckit-clarify`
found nothing further to ask.

## Constitution Check

*GATE: evaluated against `.specify/memory/constitution.md` v1.1.0. Re-checked after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| **I. Think Before Coding** | Assumptions stated; no silent interpretation | **PASS** — the stamp/clear rule on every state edge, the re-open semantics, the no-backfill decision, the insert-time value, the object names and paths, the browser floor and the overlay call were each raised as an architecture finding and written into the requirements before this plan; the twelve assumptions in `spec.md` are the residue |
| **II. Simplicity First** | Minimum code; nothing speculative | **PASS** — the recompute is one indexed query, not a copy of Trending's two-set merge (R2); the publisher is parameterised by object names rather than duplicated (R3); the route handler is reused with a different reader (R5); `newest.js` is a clone with five substitutions and drops `trending.js`'s unused `window.Trending` export rather than carrying it (R6); no shared "listing factory" is introduced for two files |
| **III. Surgical Changes** | Every changed line traces to the request | **PASS** — `updatePoll` gains two lines beside `closed_at`; `recomputeTrending`'s local `listable` predicate is lifted to a module-level function so both recomputes share it (the only change to Trending's code); `createTrendingPublisher` is renamed to take object names, with its two callers updated; the 018 placeholder is deleted because it would break the feature, not tidied |
| **IV. Goal-Driven Execution** | Verifiable success criteria per task | **PASS** — nine measurable criteria; `quickstart.md` gives a runnable scenario per user story with the settings to lower; the explain guard, the state-edge tests and the publish-cadence test are the acceptance tests for FR-007, FR-002–005 and FR-014 |
| **V. Code Quality & Maintainability** | Minimal, modular, graceful errors; server logs informative, browser logs minimal and never sensitive | **PASS** — the sweep logs `[newest] published counts[ and cards] for N polls` exactly as Trending does (the one item `/speckit-clarify` left to precedent); the routes answer `503 newest-not-ready` with a retry hint; the browser logs nothing new and holds only public listing data plus the visitor's own overlay |
| **VI. Self-Documenting Code** | Comments only point at external documentation | **PASS** — `newest.js` carries the same one-paragraph header `trending.js` carries (a pointer to the two published objects, which is how every client module here opens); the migration links the PostgreSQL partial-index page as `002-polls.ts` links the generated-columns page; no FR/task identifiers in code |
| **Documentation Deliverables** | `README.md` and `ARCHITECTURE.md` regenerated at the project root *after* implementation | **PASS — carries two obligations.** README's "Newest — a placeholder" bullet becomes the real description; ARCHITECTURE's `tabs.js` node and the "Newest is registered as a controller with no behaviour" paragraph are replaced by the second listing publication. `README.md` must remain free of references to `specs/`, `designDocs/` and `architecture/` |

No gate fails. The Complexity Tracking table is omitted.

## Project Structure

### Documentation (this feature)

```text
specs/019-NEWEST-POLL-TAB/
├── plan.md              # This file
├── research.md          # Phase 0 output — 10 decisions
├── data-model.md        # Phase 1 output — launched_at, the index, the listing objects, cache keys, settings
├── quickstart.md        # Phase 1 output — validation scenarios per user story
├── contracts/
│   ├── api-endpoints.md # Phase 1 output — the two instance routes, the config field, the published objects
│   └── ui-contracts.md  # Phase 1 output — the Newest tab's behaviour; supersedes 018's Newest section
├── checklists/
│   └── requirements.md  # /speckit-specify output — 16/16
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── db/
│   ├── migrations/005-launched-at.ts   # new: add column launched_at timestamptz; create index polls_home_launched
│   ├── migrations/index.ts             # register "005-launched-at"
│   └── schema.ts                       # PollTable.launched_at: NullableTimestamp
├── polls/
│   ├── store.ts                        # insertPoll: launched_at = startAt ?? createdAt when OPEN; updatePoll: stamp / clear
│   └── sweeps.ts                       # newestSweep; SWEEP_LOCKS.newest = 10; schedule entry with runAtStart
├── trending/
│   ├── recompute.ts                    # listablePolls() lifted; NEWEST_KEYS; newestQuery(); recomputeNewest(); readNewestObjects()
│   │                                 #   returns TrendingListing — no Newest* types exist; data-model.md's NewestCountsObject /
│   │                                 #   NewestCardsObject are reading names for TrendingCountsObject / TrendingCardsObject
│   └── publish.ts                      # createListingPublisher(store, intervalMs, objects); NEWEST_OBJECTS
├── config.ts                           # maxNewestPolls (1 ≤ n ≤ maxPollsSearchResults), newestRecomputeIntervalMs (≥ 1000)
├── server.ts                           # AppContext.newestPublisher
├── routes/
│   ├── tabsApi.ts                      # serveListingObject(reader, notReady, intervalMs); GET /api/trending/newest-counts[.json], newest[.json]
│   └── api.ts                          # /api/config: newestRecomputeIntervalMs
└── public/
    ├── newest.js                       # new: the tab controller, cloned from trending.js
    ├── index.html                      # <script src="/newest.js" defer> after trending.js
    └── tabs.js                         # delete the 018 placeholder in init(); KIND_OF.newest = "newest"; bucketOf maps it to the refresh floor

devScripts/populate/seed-polls.ts       # launched_at: created_at for OPEN rows
launch.json.example, devScripts.example/launch-dev.ps1, .do/app.yaml, CLAUDE.md   # the two settings
postman/openapi.json                    # 2 paths (+ aliases), NewestCounts/NewestCards, config.newestRecomputeIntervalMs
specs/018-TAB-BAR/spec.md               # note: FR-023–FR-025 superseded by 019

tests/
├── newest.test.ts                      # new: launched_at on every edge and at insert; ranking and eligibility; publish cadence; routes, 304, 503
├── db-explain-guard.test.ts            # "Newest": newestQuery(ctx.db, 50)
├── config.test.ts                      # defaults; the three bounds
├── openapi-contract.test.ts            # the two routes documented
└── client-home.test.ts                 # rewrite "the Newest tab in a browser": fetches, Refresh enabled, session copy, empty state, overlay

README.md, ARCHITECTURE.md              # updated after implementation (constitution)
```

**Structure Decision**: single project, existing layout; one migration, one client module and
one test file are added. Every other change is a handful of lines in the file that already
holds the Trending equivalent. `src/trending/` keeps its name and gains the Newest recompute —
it is the "published listings" module in all but name, and renaming it would touch every import
for no functional gain (R2).

## Phase Status

| Phase | Output | Status |
|---|---|---|
| 0 — Research | `research.md` (R1–R10) | complete |
| 1 — Design | `data-model.md`, `contracts/api-endpoints.md`, `contracts/ui-contracts.md`, `quickstart.md`, agent context (`CLAUDE.md`) | complete |
| 2 — Tasks | `tasks.md` | `/speckit-tasks` |

## Post-Design Constitution Re-Check

Re-evaluated after Phase 1 with the data model, contracts and quickstart in hand.

- **II. Simplicity First** — held. Two temptations resisted: a `listing/` package with a
  factory producing both recomputes and both tab modules (two instances do not justify a
  framework; R2, R6), and a `NewestCounts` schema of its own in OpenAPI when the shape is
  Trending's byte for byte (the new paths reference the existing schemas; R10).
- **III. Surgical Changes** — held. The only Trending code that changes is the lift of the
  `listable` predicate and the publisher's signature; `trending.js` is read, not written.
- **VI. Self-Documenting Code** — held. The new migration carries one external link; `newest.js`
  carries one module header; nothing cites a requirement.
- **Documentation Deliverables** — unchanged obligation; carried as the final task phase.

No new violations. Ready for `/speckit-tasks`.
