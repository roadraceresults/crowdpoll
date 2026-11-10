# Implementation Plan: Who Voted Report

**Branch**: `20261110-123524-WHO-VOTED-REPORT` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/20261110-123524-WHO-VOTED-REPORT/spec.md`

## Summary

A maximized private poll whose votes are not anonymous gets a **Who voted** panel in the right column, between the
Notes panel and the line graph. Names come from one new per-viewer route, `GET /api/me/polls/:pid/voters` (R1): it
answers `404` unless the poll is a published non-anonymous private poll the caller may view or the caller is an
administrator (R2), lists each current vote from `votes` limited to the voter-facing choices, names only (R3), adds
`settleMs` when the live counters are ahead of the batched consumer (R4), and is `no-store` on its own Live-Results-paced
bucket. The browser asks only for private OPEN/CLOSED polls and stops after a `404` until the content changes (R5). A new
script, `whoVoted.js`, owns the panel — sort, sequencing, retries and a DOM-built grouped table (R6, R7) — and
`tabs.js` calls it from `maximize`, `render` and `restore`. One new sheet, `who-voted-m3.css` (R8). No migration,
setting, cookie, storage key or dependency.

## Technical Context

**Language/Version**: TypeScript on Node.js ≥ 22 (ESM); browser: vanilla ES2020 in `src/public/`

**Primary Dependencies**: none new (Express 5, Kysely)

**Storage**: PostgreSQL `votes` (read only); the existing live counters (read only)

**Testing**: Vitest + supertest + embedded-postgres (`tests/who-voted-route.test.ts`); jsdom
(`tests/client-who-voted.test.ts` via `tests/helpers/browser.ts`); `m3-assets.test.ts`, `openapi-contract.test.ts`

**Target Platform**: the `web` service on DigitalOcean App Platform; evergreen browsers

**Project Type**: single project (web service with static front end)

**Performance Goals**: one indexed query of ≤ 100 rows plus one counters read per request; at most one request per
viewer per `ENV_MIN_LIVE_REFRESH_INTERVAL`; re-sorting redraws without a request (SC-004)

**Constraints**: no name in any shared or cached payload (SC-003); names reach the DOM as text only; M3 tokens only

**Scale/Scope**: new `src/polls/voters.ts`, `src/public/whoVoted.js`, `src/public/who-voted-m3.css`, two test files;
changed `src/routes/tabsApi.ts`, `src/public/tabs.js`, `src/public/index.html`, `tests/m3-assets.test.ts`,
`postman/openapi.json`, `src/public/adminCard.js` (one comment), `README.md`, `ARCHITECTURE.md`, `CLAUDE_COMPLETE.md`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Think Before Coding** — PASS: fourteen requirements findings resolved; clarify found nothing open; the roll-out
  gap of a projection field was found and avoided (R5).
- **II. Simplicity First** — PASS: one route, one query, one script; no new setting, timer or projection field.
- **III. Surgical Changes** — PASS: `tabs.js` gains three calls; `createGrid`'s existing panels are not refactored
  (TD2 reported, not fixed); one stale comment in `adminCard.js` is corrected because FR-020 asks for it.
- **IV. Goal-Driven Execution** — PASS: every FR maps to a route or client test (R9, quickstart).
- **V. Code Quality & Maintainability** — PASS: access, reading and rendering live in separate units; failures leave the
  last table and log without names; the server logs nothing new per request.
- **VI. Self-Documenting Code** — PASS: `readVoterReport`, `VoterReport`, `settleMs`, `WhoVoted.show/hide`.
- **Security, Privacy & Reliability** — PASS: `404` for every refusal; names only, no address; `no-store`; text nodes,
  never `innerHTML`; rate-limited.
- **Documentation Deliverables** — README.md and ARCHITECTURE.md are updated in the task list's documentation phase.

**Post-Phase-1 re-check**: PASS — the design adds one read route, one browser module and one sheet; nothing is written.

## Project Structure

### Documentation (this feature)

```text
specs/20261110-123524-WHO-VOTED-REPORT/
├── plan.md               # This file
├── research.md           # Phase 0: R1–R9
├── data-model.md         # Phase 1: the votes read, VoterReport, browser state, panel states
├── quickstart.md         # Phase 1: automated and manual checks
├── contracts/
│   ├── api.md            # A1–A2: the voters route, OpenAPI
│   └── ui-contracts.md   # C1–C4: placement, content, behaviour, look
└── tasks.md              # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── polls/
│   └── voters.ts            # new: readVoterReport(db, row) → { voters, counted }
├── routes/
│   └── tabsApi.ts           # GET /api/me/polls/:pid/voters
└── public/
    ├── index.html           # section in maximizedCardGrid; who-voted-m3.css; whoVoted.js
    ├── whoVoted.js          # new: window.WhoVoted.show / hide
    ├── who-voted-m3.css     # new: panel, segmented control, table
    ├── tabs.js              # show from maximize/render, hide from restore
    └── adminCard.js         # comment: who sees the names

tests/
├── who-voted-route.test.ts  # new
├── client-who-voted.test.ts # new
└── m3-assets.test.ts        # LAYER_ORDER + script list

postman/openapi.json, README.md, ARCHITECTURE.md, CLAUDE_COMPLETE.md
```

**Structure Decision**: the existing single project; one server module and one browser script added.

## Complexity Tracking

No violations.
