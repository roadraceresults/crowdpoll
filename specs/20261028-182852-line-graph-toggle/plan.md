# Implementation Plan: Per-Poll Line Graph Toggle

**Branch**: `line-graph-toggle` | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261028-182852-line-graph-toggle/spec.md`

## Summary

Make the line graph a per-poll setting, off by default, that only an Administrator can switch on. The graph code is already on this branch (commit `3f4b6de`). This feature adds one stored attribute to a poll, one additive migration, the server rules that protect it, its carriage in the poll projections and admin rows, the graph route's answer when it is off, and the admin card's "View" step. The graph itself is unchanged.

## Technical Context

**Language/Version**: TypeScript on Node ≥ 22, ESM.

**Primary Dependencies**: Express 5, Kysely (PostgreSQL), BetterAuth. Browser: vanilla JavaScript and CSS, no framework, no bundler. No new dependency.

**Storage**: PostgreSQL. One additive column on `polls` (migration `013-line-graph-enabled`), no backfill.

**Testing**: Vitest with supertest and embedded PostgreSQL for server suites; jsdom for client scripts (`client-*.test.ts`, via `tests/helpers/browser.ts`).

**Target Platform**: DigitalOcean App Platform, one autoscaled web service; browsers on desktop and phone.

**Project Type**: Web service with a browser client.

**Performance Goals**: No new request or polling cost. The setting rides in data the poll projections and admin rows already carry. The graph route serves a cached body as before, after one primary-key read of the setting.

**Constraints**: No new configuration value, cookie or browser storage key (FR-016). Cookie Use table unchanged. The setting is a content field, so a change bumps `content_version` like a title change.

**Scale/Scope**: Same as the graph feature; one boolean per poll.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | Assumptions and open questions surfaced in spec Clarifications and research R3–R5 | Pass |
| II. Simplicity First | One column, one flag check per route, one card control; no new abstraction or module | Pass |
| III. Surgical Changes | Each change traces to FR-001–FR-016; no drive-by edits of the graph code | Pass |
| IV. Goal-Driven Execution | Quickstart gives a verifiable check for each user story and each refusal | Pass |
| V. Code Quality | Refusals log one informative server line; browser logs nothing new | Pass |
| VI. Self-Documenting Code | New code adds no comment citing the spec, requirements or findings | Pass |
| Security, Privacy & Reliability | Non-administrators refused server-side (403), not only hidden; no address logged | Pass |
| Performance & Operational Efficiency | No polling added; no new query on the hot path beyond the route's primary-key read | Pass |
| Documentation Deliverables | README.md and ARCHITECTURE.md are generated after implementation (see the documentation tasks T034–T035 in tasks.md) | Deferred to after implementation |

**Gate result**: no violations. Nothing to justify in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/20261028-182852-line-graph-toggle/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── api.md           # HTTP contract changes
│   └── ui-contracts.md  # Admin card and viewer contract changes
├── checklists/baseline.md    # T001: the pre-change test and type-check baseline
├── checklists/requirements.md
└── tasks.md             # Created by /speckit-tasks, not here
```

### Source Code (repository root)

```text
src/
├── db/
│   ├── migrations/013-line-graph-enabled.ts   # NEW: one additive column
│   ├── migrations/index.ts                    # register 013
│   └── schema.ts                              # polls.line_graph_enabled
├── polls/
│   ├── store.ts                               # Poll field ↔ column; content field
│   ├── versions.ts                            # projectPoll carries lineGraphEnabled
│   └── service.ts                             # validatePollFields: admin-only rule
├── routes/
│   ├── pollsApi.ts                            # publish/save/colors: admin gate, UPDATE_FIELDS, colors-only setting, adminListRow
│   └── tabsApi.ts                             # graph route answers 404 when off
├── public/
│   ├── adminCard.js                           # step 4 "View", checkbox, summary sentence, save fields
│   ├── deltaClient.js                         # copies lineGraphEnabled into the card
│   ├── tabs.js                                # maximize mounts the graph only when on
│   └── (lineGraph.js, line-graph-m3.css)      # unchanged
postman/openapi.json                            # documented fields and the 404
tests/
├── line-graph-setting.test.ts                 # NEW: server rules and rows
├── client-admin-wizard.test.ts                # step-label list and the View step
├── client-delta-line-graph.test.ts            # NEW: the card copies the setting
├── line-graph-route.test.ts                   # the route answers 404 when the setting is off
├── line-graph-ui.test.ts                      # maximize with the setting on and off
└── helpers/poll-fixtures.ts                   # makePoll defaults the setting off
```

**Structure Decision**: Extend the existing modules. The poll write paths, projections, admin rows and graph route already exist; the setting is one more field through them. No new module.

## Complexity Tracking

No violations to justify.
