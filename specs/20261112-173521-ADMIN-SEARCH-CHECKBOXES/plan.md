# Implementation Plan: Admin Search Checkboxes

**Branch**: `main` (no feature branch) | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261112-173521-ADMIN-SEARCH-CHECKBOXES/spec.md`

## Summary

Add two checkboxes, "Line graph enabled" and "Custom colors set", on a new row under the vote mode radios of the admin
Search form:

- Ticked, each narrows the results; unticked, it does nothing (AM1 A). They AND with every other control (UA1).
- The form sends `lineGraphEnabled=true` / `customColors=true` only when ticked; `parseAdminSearch` accepts only `true`
  (blank ignored, anything else `400`), and `adminSearchQuery` adds `line_graph_enabled = true` and
  `jsonb_path_exists(choices, '$[*] ? (@.color != null)')` (at least one hand-picked color, AM2 A), reading the saved
  row only (UA4).
- Migration `022-admin-search-flags` adds one partial index per filter, so the "every filter combination is answered
  from an index" test still holds (R3).
- `postman/openapi.json`, the M3 search styles, the tests, README and ARCHITECTURE follow.

## Technical Context

**Language/Version**: TypeScript ^5.8 on Node ≥ 22 (ESM, NodeNext) on the server; plain browser JavaScript and CSS in
`src/public/` (no framework, no bundler).

**Primary Dependencies**: Express 5, Kysely over PostgreSQL; none new.

**Storage**: PostgreSQL `polls` (existing `line_graph_enabled`, `choices` jsonb); two new partial indexes.

**Testing**: Vitest ^3.2 + supertest + embedded-postgres (`tests/search-admin.test.ts`), jsdom client tests
(`tests/client-admin-search.test.ts`), `tests/openapi-contract.test.ts`, `tests/m3-assets.test.ts`.

**Target Platform**: the existing web app (DigitalOcean App Platform, Managed PostgreSQL); admin page in current
browsers.

**Project Type**: web application (server + static client in one repository).

**Performance Goals**: a search with either box ticked is answered from an index, like every other filter (SC-004).

**Constraints**:
- No change to the response shape, order, cap or other filters (SC-003).
- M3 layers hold only M3 tokens (`m3-assets.test.ts`); the admin page's stylesheet list is unchanged.
- `postman/openapi.json` follows the routes; the 404/403 and terms rules are untouched (admin-only route as before).

**Scale/Scope**: about 10 lines of server code, 1 migration, ~6 lines of HTML, 1 line of client JS, ~50 lines of CSS,
tests, the OpenAPI entry, two documentation paragraphs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Think Before Coding | Pass | The 6 requirements findings are resolved; research R1–R7 settle the parameters, SQL, indexes, form and style |
| II. Simplicity First | Pass | Two checkboxes reuse the existing reader, parser, query and route; one value (`true`) per parameter |
| III. Surgical Changes | Pass | `adminSearch.ts`, one migration, `admin.html`, one line of `adminList.js`, `admin-search-m3.css`, OpenAPI, tests, docs |
| IV. Goal-Driven Execution | Pass | Each user story has server and client tests (R6) and quickstart steps |
| V. Code Quality | Pass | Strict parsing with the existing `AdminSearchError`; predicates match their partial indexes |
| VI. Self-Documenting Code | Pass | Names follow the controls (`lineGraphEnabled`, `customColors`); one comment on the jsonpath predicate |
| Security/Privacy | Pass | Admin-only route unchanged; no new cookie or storage key; no voter data exposed |
| Documentation Deliverables | Pass | README and ARCHITECTURE updated in the final phase |

Post-design re-check: Pass. The spec's assumptions name the two partial indexes as the only database change (no column
or data change), as R3 decides (analysis I1). No Complexity Tracking entry is needed.

## Project Structure

### Documentation (this feature)

```text
specs/20261112-173521-ADMIN-SEARCH-CHECKBOXES/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md
│   └── ui.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/search/adminSearch.ts                        # filters, parsing, SQL
src/db/migrations/022-admin-search-flags.ts      # new: two partial indexes
src/db/migrations/index.ts                       # register 022
src/public/admin.html                            # the checkbox row
src/public/adminList.js                          # readSearchForm sends the two names
src/public/admin-search-m3.css                   # checkbox row style
postman/openapi.json                             # two parameters
tests/search-admin.test.ts                       # server filters, parsing, index combinations
tests/client-admin-search.test.ts                # form, order, sending, Clear
tests/openapi-contract.test.ts                   # parameters documented
README.md, ARCHITECTURE.md                       # documentation phase
```

**Structure Decision**: every change sits in the files that already implement the admin search; the only new file is
the migration, numbered after `021-link-preview-message`.

## Complexity Tracking

None.
