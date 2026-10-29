# Implementation Plan: Poll Line Graph

**Branch**: `20261027-151601-POLL-LINE-GRAPH` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261027-151601-POLL-LINE-GRAPH/spec.md`

## Summary

Fill the maximized poll view's empty right column (`.maximized-space-right`) with a vote-history line graph: one
line per choice above a share threshold, tracing each choice's cumulative percentage over a selectable trailing
window (1 Day / 1 Week / 1 Month / 1 Year), in the choice's bar-graph colour, with a legend, a crosshair tooltip
and a periodic refresh. The series is computed server-side from the existing `vote_history` table by replaying
each voter's latest `choice_ids` at UTC bucket boundaries with `computeResults`'s percentage formula, served by
one new read-only endpoint (`GET /api/polls/:pid/line-graph`) behind the existing shedding/floor machinery, and
cached read-through per (poll id, scale) with TTL = `ENV_LINE_GRAPH_REFRESH_INTERVAL`. The browser renders it as
hand-rolled inline SVG in a new `lineGraph.js` module mounted by `tabs.js` on maximize. No migration (the needed
`(poll_id, voted_at)` index already exists on every partition), no new dependency, two new settings.

**Amended by TWEAK03 (2026-10-27)**: loading a 14.9-million-row history exhausted the server's memory, so the
replay moved to write time. One additive migration (`012-line-graph-tally`, with a backfill) adds an hourly tally
and each voter's latest selection, kept by every `vote_history` writer in the same transaction. The graph sums
the tally instead of reading the history (research R1, R4; `data-model.md`).

**Amended by TWEAK04 (2026-10-27)**: scale clicks met the refresh floor's `429`, so the endpoint takes no `?scale=`
and answers every available scale at once, cached per poll id (`line-graph:<pid>`); the browser switches scales
locally (research R3, R5; `contracts/api.md` A1).

## Technical Context

**Language/Version**: TypeScript (Node 20+, ES modules) on the server; plain ES2020 JavaScript in the browser

**Primary Dependencies**: Express, Kysely (PostgreSQL); no new dependency — the graph is hand-rolled inline SVG (spec/requirements NC1)

**Storage**: PostgreSQL — read-only use of the existing `vote_history` partitioned table; the `(poll_id, voted_at)` index already exists per partition (`ensureVoteHistoryPartition`), so **no migration**

**Testing**: Vitest + supertest + embedded-postgres for the route and replay; jsdom for `lineGraph.js` (opt-in script list, as `tooltip-m3.js` tests do)

**Target Platform**: DigitalOcean App Platform web service + evergreen browsers (desktop and phone widths)

**Project Type**: Web application (server + static browser modules in `src/public/`)

**Performance Goals**: graph rendered within 2 s of maximizing (SC-001); at most one series computation per poll (all scales, TWEAK04) per refresh interval regardless of viewer count (SC-004); replay of a poll's history in milliseconds for ≤ 100k vote events

**Constraints**: voter identities never reach the browser (FR-012); access mirrors card/results visibility, enforced server-side (FR-013); UTC buckets, viewer-local labels (FR-010); refresh floored at `ENV_MIN_LIVE_REFRESH_INTERVAL` (FR-011); Material 3 tokens only in stylesheets (`m3-assets.test.ts`)

**Scale/Scope**: ≤ 366 points per series, ≤ `ENV_MAX_CHOICES` (50) choices before the threshold filter; 12-month history ceiling set by `retentionSweep`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Think Before Coding** — PASS. Every ambiguity was resolved upstream: 16 findings in the requirements report
  and 2 `/speckit-clarify` answers (fetch failure, accessibility); the decisions are recorded, not assumed.
- **II. Simplicity First** — PASS. No new dependency (hand-rolled SVG, R8); no migration (the index exists, R1);
  the replay runs in TypeScript over one indexed query instead of a SQL window-function construction (R4); the
  cache reuses the existing `Cache` seam (R5). Nothing speculative: no zoom, pan, export or per-line toggles.
- **III. Surgical Changes** — PASS. Existing files gain minimal seams only: `tabs.js` mounts/unmounts the graph in
  `maximize()`/`close()`, `pollCard.js` exposes the colours it already computed, `tabs.css` loses only the
  placeholder rules of the element being replaced, `config.ts` and `/api/config` gain the two settings. All other
  new behaviour lives in new files (`lineGraph.js`, `line-graph-m3.css`, `src/polls/lineGraph.ts`, route block).
- **IV. Goal-Driven Execution** — PASS. Each requirement maps to a test: replay correctness (changed votes,
  multi-choice), scale availability, access, cache sharing, threshold, placeholder, failure handling (quickstart
  and contracts define the checks).
- **V. Code Quality & Maintainability** — PASS. Server logs the route's work informatively; the browser module
  logs nothing sensitive and minimally. Single-purpose modules: replay/bucketing pure and unit-testable.
- **VI. Self-Documenting Code** — PASS. No requirement/finding IDs in code comments; comments only for external
  references (e.g. the PostgreSQL partitioning doc already cited in `partitions.ts`).
- **Documentation Deliverables** — the tasks phase must carry the post-implementation README.md/ARCHITECTURE.md
  update phase, per governance.

**Post-design re-check (after Phase 1)**: PASS — the design added no project, no dependency, no migration and no
speculative surface; Complexity Tracking stays empty.

**Re-check after TWEAK03**: PASS. The one additive migration is the simplest change that removes the cost:
aggregating in SQL instead was measured at 24 s per cache miss on the large poll. It also changes the vote write
path (Surgical Changes): one call, `recordLineGraphTally`, beside each existing `vote_history` insert.

## Project Structure

### Documentation (this feature)

```text
specs/20261027-151601-POLL-LINE-GRAPH/
├── plan.md              # This file
├── research.md          # Phase 0 output (R1–R13)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── api.md           # A1–A2: the line-graph endpoint and /api/config additions
│   └── ui-contracts.md  # C1–C9: right-column composition and behaviour
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── config.ts                    # + lineGraphMinVotePercentage, lineGraphRefreshIntervalMs
├── routes/
│   ├── api.ts                   # + two fields in GET /api/config
│   └── tabsApi.ts               # + GET /api/polls/:pid/line-graph (dynamic("refresh"), guest-capable)
├── polls/
│   ├── access.ts                # + mayViewResults (guest-capable card-visibility rule reusing reaches())
│   ├── lineGraph.ts             # NEW: scale table, bucket replay, threshold filter, series assembly
│   └── lineGraphTally.ts        # NEW (TWEAK03): hourly tally kept by the vote writers; backfill and rebuild
└── public/
    ├── index.html               # + line-graph-m3.css, lineGraph.js
    ├── lineGraph.js             # NEW: SVG renderer, legend, crosshair, scale selector, refresh timer
    ├── line-graph-m3.css        # NEW: tokens-only styling for the right column's graph
    ├── tabs.js                  # maximize()/close(): mount/unmount the graph in .maximized-space-right
    ├── pollCard.js              # + resultColors() getter on the card API (colours it already computes)
    └── tabs.css                 # − the .maximized-space-right placeholder rules (#E6E6E6, literal font)

tests/
├── line-graph-route.test.ts     # NEW: access, scales, replay, threshold, cache sharing (supertest + embedded-postgres)
├── line-graph-replay.test.ts    # NEW: pure replay/bucketing units (changed votes, multi-choice, UTC edges)
├── line-graph-tally.test.ts     # NEW (TWEAK03): tally kept by the writers equals one rebuilt from vote_history
└── line-graph-ui.test.ts        # NEW: jsdom — render, legend, placeholder, failure fallback (opt-in scripts)

postman/openapi.json             # + the new endpoint
```

**Structure Decision**: single web-service project, as the codebase stands. New behaviour in new files; five
existing files touched (`config.ts`, `api.ts`, `tabsApi.ts`, `tabs.js`, `pollCard.js`, plus `index.html`/`tabs.css`
asset edits), each a minimal seam listed above.

## Complexity Tracking

No constitution violations — table intentionally empty.
