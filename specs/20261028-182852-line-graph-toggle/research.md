# Research: Per-Poll Line Graph Toggle

Each decision below resolves a question the spec or the codebase left open. Code references are to this branch.

## R1. Storage: one additive column

**Decision**: `polls.line_graph_enabled boolean not null default false`, added by migration `013-line-graph-enabled`, registered in `src/db/migrations/index.ts` after `012-line-graph-tally`. No backfill; existing rows take the default.

**Rationale**: The spec requires existing polls to start off (FR-001). A column default does exactly that in one statement. The number 013 follows the graph's own migration, `012-line-graph-tally.ts`, already on this branch.

**Alternatives considered**: Folding the column into `012-line-graph-tally` (rejected: that migration has already been named and could already be applied where the graph was tested). A JSON flag on `polls.choices` (rejected: the setting is poll-level, not choice-level).

## R2. The setting is a content field

**Decision**: The setting is not added to `NON_CONTENT_FIELDS` in `src/polls/store.ts`, so changing it bumps `content_version`. Each change therefore also queues one search outbox row through `bumpContentVersion` (`src/polls/store.ts`), exactly as a title change does.

**Rationale**: Open cards and listings refresh on `content_version` (see R5). The spec requires a change to reach open cards on their next Refresh of the tab (FR-012), so the version must move. The outbox row is the cost of that, and it is accepted here.

**Alternatives considered**: Excluding it and pushing the change on a separate channel (rejected: it adds a second path for one boolean).

## R3. Admin-only enforcement on the server

**Decision**: Any save that carries `lineGraphEnabled` from a caller who is not an Administrator is refused with `403`, before any write. The check uses `isAdminEmail(caller.email, config)` (`src/polls/service.ts:750`), the rule `GET /api/me` already reports as `isAdmin`. "Administrator" here means that rule only, not the `Administrator` permission string, which the server also grants to such users; the check never reads the permission string. A save without the field leaves the stored value as it is. The refusal logs one informative line with the poll id and no address, matching the existing `[admin] Refused colors …` lines.

**Rationale**: FR-003 requires a refusal from the server, not only a hidden checkbox. Reusing `isAdminEmail` keeps one Administrator rule, as the spec's Assumptions require.

**Alternatives considered**: Checking the flag in each route separately (rejected: three routes would repeat one rule). Ignoring the field from non-administrators silently (rejected: the spec requires a refusal, so a hand-made request cannot change the setting unnoticed).

## R4. The colors-only path accepts the setting alone

**Decision**: `POST /api/admin/polls/:pid/colors` accepts a body with `lineGraphEnabled` and no `colors`. When `colors` is absent, the choices are left as they are. When `colors` is present, behavior is unchanged. The existing guards stay (an open edit session, and a poll with votes).

**Rationale**: FR-008 says a setting-only change on a poll with votes uses this path. Today `applyChoiceColors` rejects a non-array `colors` with `400`, so the route needs this small branch.

**Alternatives considered**: Sending the setting through `/publish` for polls with votes (rejected: publish refuses every field outside `UPDATE_FIELDS` once a poll has votes, and the spec wants the colors-only path to accept the setting).

## R5. How open cards learn the setting

**Decision**: `projectPoll` (`src/polls/versions.ts`) adds `lineGraphEnabled: row.line_graph_enabled`. `deltaClient.js` copies it into the card it builds from the projection (its card-building block, around lines 100–122, copies each field explicitly, so the new field must be added there). `tabs.js` mounts the graph only when the card's `lineGraphEnabled` is true. When the graph is off, `tabs.js` leaves the maximized view's right-hand space as the template renders it (`index.html:141`), so it may stay reserved and empty (FR-010 as amended by the analysis, G1).

**Rationale**: Mirrors how colors already reach cards: through the projection and `deltaClient.js`, as the graph feature's own decision recorded. Spec FR-012 and US2 rely on it.

**Alternatives considered**: A separate request on maximize (rejected: an extra round trip per maximize, where the projection already carries the flag).

## R6. Admin list and search rows

**Decision**: `adminListRow` (`src/routes/pollsApi.ts:682`) adds `lineGraphEnabled: p.line_graph_enabled` for every row. The admin list (`pollsApi.ts:676`) and the admin search (`pollsApi.ts:744`) both build rows through this function, so one change covers both.

**Rationale**: FR-013 requires the checkbox and the summary line to read the stored value for every poll a caller can see. The creator's summary line needs it too (FR-009).

**Alternatives considered**: A second query for the setting on the card (rejected: the row already has the poll).

## R7. The graph route answers 404 when off

**Decision**: In `GET /api/polls/:pid/line-graph` (`src/routes/tabsApi.ts:304`), read `line_graph_enabled` by primary key before serving, and answer `404` when it is false. The check runs before the cached body is served, because `serveLineGraph` caches a body per poll and would otherwise keep serving it after the switch.

**Rationale**: FR-011 requires `404` for a poll whose setting is off. Checking before the cache makes a switch take effect on the next request, not after the cache expires.

**Alternatives considered**: Invalidating the cached body on each change (rejected: more moving parts, and the primary-key read is cheap).

## R8. Admin rule on the browser side

**Decision**: The card learns whether the viewer is an Administrator from `GET /api/me` (`isAdmin`), the same field `adminList.js` reads (`adminList.js:474`). Only an Administrator's card sends `lineGraphEnabled` in a save; a creator's card leaves it out.

**Rationale**: Spec FR-002 and FR-003. Sending only for Administrators means a creator's save never carries the field, and R3 keeps the server rule as the real guard.

**Alternatives considered**: Sending the field always and letting the server ignore it for creators (rejected: the spec requires a refusal, so the browser must not send it).

## R9. Wizard step 4 becomes "View"

**Decision**: In `src/public/adminCard.js`, `WIZARD_STEPS` step 4 changes `name` and `short` from "Colors" to "View". Its number stays 4, so every `part(…, 4, "colors")` and the Settings Summary link keep working. The color picker keeps its accessible name "Colors".

**Rationale**: Spec FR-004. The rename touches labels only; the step-number literals (research R9 notes in the graph feature) do not move.

**Alternatives considered**: Renumbering the step (rejected: it would move every literal and the Settings Summary links for no behavior change).

## R10. The checkbox and the summary sentence

**Decision**: `buildColorsStep()` (`adminCard.js:1338`) renders the "Show the line graph" checkbox first, for Administrators only, in the wizard's existing checkbox style. The "Add your choices first" note takes the place of the color pickers when there are no choices. `buildColorsSummaryLine()` (`adminCard.js:790`) adds "The line graph is shown." to the View line when the card's `lineGraphEnabled` is true, for every viewer of the card.

**Rationale**: Spec FR-005, FR-006, FR-009.

**Alternatives considered**: A separate step for the graph (rejected: the spec places it on the View step).

## R11. Save routing in the card

**Decision**: The card's colors-only check (`savesColorsOnly`, `adminCard.js:1966`) also accepts `lineGraphEnabled` as a key that does not disqualify a colors-only save. A change to only the setting, on a poll with votes, is sent to `/colors`. On a poll without votes it is sent through `/publish` or `/save` like any other field, and `UPDATE_FIELDS` (`pollsApi.ts:500`) gains `lineGraphEnabled`.

**Rationale**: Spec FR-007 and FR-008. Polls without votes already accept any field through publish.

**Alternatives considered**: Always using `/colors` for the setting (rejected: `/colors` is refused for a poll without votes, per its guard).

## R12. Tests and documentation

**Decision**: New server suite `tests/line-graph-setting.test.ts` covers the default, the 403, the setting-only colors save, the admin rows and the 404. `tests/client-admin-wizard.test.ts:437` changes the expected step labels to "View". `tests/line-graph-ui.test.ts` covers maximize with the setting on and off. `postman/openapi.json` documents the new field and the 404. README.md and ARCHITECTURE.md are updated after implementation, per the constitution.

**Rationale**: Constitution VI treats the test suite as documentation, and the constitution requires README and ARCHITECTURE updates after implementation.

**Alternatives considered**: None.

## R13. Logging

**Decision**: One server line per refused setting change, `[admin] Refused line graph setting for poll <pid>: not an Administrator`. No address, token or link is logged. The browser logs nothing new.

**Rationale**: Constitution V: the server console is informative and never sensitive.
