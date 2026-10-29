# Implementation Plan: Refresh Mechanisms

**Branch**: `refresh-research` (no dedicated branch) | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261028-151716-REFRESH-MECHANISMS/spec.md`

## Summary

Refreshes become cheaper and feel faster, and the documents finally explain them.
A personal-tab refresh that finds nothing changed answers from the live counts alone: a per-user list version in the cache (`tabs:v:<emailKey>`, deleted after every committed change to the user's relations, invitations or bans) and a per-tab record of what was last sent (`tabs:seen:…`, 5 minutes) let the server skip the database; deleting a poll deletes its cached projection.
Projections are written once per refresh in one batch, and only when missing or stale.
Live Results backs off on unchanged answers (2 → 10 s); Trending and Newest are published with a 10 s lifetime and Refresh is offered only once a newer copy can exist; the Refresh button explains its wait in its tooltip.
Search and manual refresh buckets refill at the stretched interval, and the controller's log line counts both new behaviours.
The counter flush runs every 10 s and the invitation sweep every 30 s; `ARCHITECTURE.md`, `README.md` and `CLAUDE.md` are updated.
Research R1–R10.

## Technical Context

**Language/Version**: TypeScript 5 on Node.js 22 (ES modules); browser scripts in plain JavaScript.

**Primary Dependencies**: Express 5, Kysely on `pg`, the existing `Cache` interface (Valkey client in production); no new dependency.

**Storage**: PostgreSQL unchanged (no migration); new cache keys only (`data-model.md`).

**Testing**: Vitest + supertest on embedded PostgreSQL with `memoryCache`; jsdom for `tabs.js`, `liveResults.js`, `trending.js`, `newest.js`; `cache-valkey.integration.test.ts` for the two new cache methods when `ENV_VALKEY_URL` is set.

**Target Platform**: DigitalOcean App Platform (unchanged); development on Windows 11.

**Project Type**: Web service with static pages and browser scripts.

**Performance Goals**: shortcut answer with no database query, under 50 ms at the server for 200 polls (SC-001); ≥ 80 % of personal-tab answers by the shortcut (SC-002); a quiet Live Results tab ≤ 8 requests a minute (SC-003).

**Constraints**: response shapes unchanged; no new setting, cookie or storage key; every change signal after commit; a lost cache costs only full answers.

**Scale/Scope**: up to 200 polls per tab; one `tabs:v` key per active user and one `tabs:seen` record per active tab (≤ ~10 KB each).

## Constitution Check

| Principle | Check |
|---|---|
| I. Think Before Coding | Every behaviour traces to a resolved requirements finding or a clarification; the one deviation (a single refusal when `k` rises, R9) is stated. ✅ |
| II. Simplicity First | Delete-to-signal instead of fan-out or triggers (R1, R3); two cache methods (R5); one constant for the listing lifetime (R7); no new setting. ✅ |
| III. Surgical Changes | Server: `floors.ts`, `controller.ts`, `tabsApi.ts`, `store.ts`, `bookmarks.ts`, `invitations.ts`, `userPolls.ts`, `consumer.ts`, `deleteAccount.ts`, `publish.ts`, `sweeps.ts`, `config.ts`, `api.ts` (config fields), cache interface and two implementations; one new module `src/refresh/tabVersions.ts`. Browser: `tabs.js`, `liveResults.js`, `trending.js`, `newest.js`, two stylesheets. ✅ |
| IV. Goal-Driven Execution | Each FR has a test named in `tasks.md`; quickstart steps 1–7 check SC-001–SC-007. ✅ |
| V. Code Quality | The controller logs the new counts; a failed cache call on the shortcut falls back to a full answer; the browser logs nothing new. ✅ |
| VI. Self-Documenting Code | No comments citing finding ids; `ARCHITECTURE.md` carries the explanation. ✅ |
| Documentation Deliverables | `ARCHITECTURE.md` and `README.md` updated in the same feature (FR-018, FR-019). ✅ |

Post-design re-check: unchanged, no violation.

## Project Structure

### Documentation (this feature)

```text
specs/20261028-151716-REFRESH-MECHANISMS/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R10
├── data-model.md        # cache keys, TabSeen, life of the list version
├── quickstart.md
├── contracts/
│   ├── api.md           # A1 personal tabs, A2 search, A3 floors, A4 /api/config, A5 listing objects, A6 log line, A7 sweeps
│   └── ui-contracts.md  # C1 Refresh button, C2 Live Results timing, C3 Trending/Newest Refresh
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── refresh/tabVersions.ts      # new: forgetTabs, readVersion/ensureVersion, TabSeen record and shortcut check
├── cache/cache.ts              # getMany, setMany
├── cache/memoryCache.ts        # getMany, setMany
├── cache/valkeyCache.ts        # MGET; pipelined SET
├── routes/tabsApi.ts           # personalTabRoute shortcut; batched projection writes; listing max-age
├── routes/api.ts               # /api/config trendingMaxAgeMs, newestMaxAgeMs
├── polls/store.ts              # forgetTabs after commit (insertPoll, updatePoll); deletePoll drops poll:<pid>
├── polls/bookmarks.ts          # forgetTabs after add, remove, expiry
├── polls/userPolls.ts          # upsertRelation callers signal (shared link)
├── invitations/invitations.ts  # forgetTabs on roster changes and adoption
├── votes/consumer.ts           # forgetTabs for each batch's voters
├── legal/deleteAccount.ts      # drop poll:<pid> of own polls
├── load/floors.ts              # stretched refill; stretched-refusal counter
├── load/controller.ts          # tabs= and stretched= on the log line
├── trending/publish.ts         # listingMaxAgeMs
├── polls/sweeps.ts             # INVITATION_SWEEP_INTERVAL_MS = 30000
├── config.ts                   # ENV_COUNTER_FLUSH_INTERVAL default 10000
└── public/
    ├── tabs.js                 # aria-disabled Refresh, countdown title, refreshAvailableIn
    ├── liveResults.js          # back-off
    ├── trending.js, newest.js  # refreshAvailableIn
    ├── tabs.css                # [aria-disabled="true"] twin
    └── header-tab-bar-m3.css   # [aria-disabled="true"] twins
.do/app.yaml, launch.json.example, devScripts.example/launch-dev.ps1   # flush 10000
ARCHITECTURE.md, README.md, CLAUDE.md, postman/openapi.json            # documents
tests/                          # new and updated suites (tasks.md)
```

**Structure Decision**: the existing single project; one new server module, `src/refresh/tabVersions.ts`, beside `deltas.ts`, holds every rule about the list version so the write sites only call `forgetTabs`.

## Complexity Tracking

None.
