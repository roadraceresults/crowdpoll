# Research: Who Voted Report

All decisions trace to the resolved findings of `requirements/20261110-123524-who-voted-report/requirements-report.md`
and to `spec.md`. No `NEEDS CLARIFICATION` remained in the Technical Context.

## R1. One per-viewer route, beside the line graph's

**Decision**: `GET /api/me/polls/:pid/voters` in `src/routes/tabsApi.ts`, after `GET /api/me/polls/:pid`:
`requireSession`, then `shedding.withKind("live")`, `floors.enforceFloor("live", "voters")`, `countBudget("live")`.
It answers `404 { error: "Not found" }` unless the poll is a published `Private Poll` with `vote_anonymity = "No"` and the
caller may see its results (R2). The answer carries `Cache-Control: private, no-store`.
The terms gate needs no change: every `/api/*` route not on its `ALLOWED_API` list is refused before acceptance.

**Rationale**: FR-002–FR-004, FR-018. `/api/polls/:pid/line-graph` is the model: a right-column read, access-checked
with `mayViewResults`, `404` for everything refused, `no-store`. A bucket of its own (`"voters"`) at the Live Results pace
(`ENV_MIN_LIVE_REFRESH_INTERVAL`, burst 1) stops the panel from taking the token `POST /api/live/refresh` needs.

**Alternatives considered**: names in the card or delta payloads — shared and cached per poll, so names would reach
people who must not see them (FR-003); `dynamic("live")` — shares the Live Results bucket and would answer `429` to the
next live refresh; the `"refresh"` kind — 5 s floor, slower than the bars it follows.

## R2. Who may read it

**Decision**: `mayViewResults(deps, caller, pid)` (creator, invitees, link or voted relation; published only), or the
caller is an administrator (`isAdminEmail(caller.email, config)`). Anything else is `404`, never `403`.

**Rationale**: NC1 A; the cross-feature rule "a poll the caller may not see answers 404". `mayViewResults` alone refuses
an administrator with no relation to the poll, while FR-002 names administrators.

**Alternatives considered**: a new access function — a second rule to keep in step (rejected in NC1).

## R3. What the report lists

**Decision**: a new module `src/polls/voters.ts`, `readVoterReport(db, row)`: one query on `votes` for the poll, rows
with `cardinality(choice_ids) > 0`, selecting `user_name`, `choice_ids`, `voted_at`; each row's `choice_ids` is
intersected with the ids of `row.choices` (the voter-facing choices: an edit's changes wait in `pending_update`), and a
row left with no choice is dropped. Ordered by `user_name`, then `voted_at`, for a stable answer.

**Rationale**: UA1, FR-005. The counters count exactly the rows with a non-empty `choice_ids` (`reconcile` in
`src/polls/counters.ts`), so banned voters and deleted accounts (`Deleted user`) appear exactly as the bars count them.
At most `ENV_MAX_PRIVATE_POLL_VOTERS` rows (100), so no paging and no index change.

**Alternatives considered**: `findPoll(...).currentVotes` — loads invitations and bans as well, three queries for one;
`vote_history` — holds previous votes (out of scope).

## R4. Catching up with the batched consumer

**Decision**: the route also reads the poll's live counters (`readOrRebuildCounts`); when their `voteCount` differs from
the number of rows with a non-empty `choice_ids`, the answer carries `settleMs: config.voteQueueLagNoticeMs` (2000 by
default). The browser refetches once after `settleMs`, then waits for the next `countsVersion` change.

**Rationale**: UA3, FR-017. The bars read the counters at once; `votes` rows are written by the consumer moments later.
Comparing on the server against the counters the card itself shows needs no new `/api/config` field, no new setting
and no timer beyond one `setTimeout`.

**Alternatives considered**: comparing with the card's `totalVoted` in the browser — needs the lag value sent to the
browser some other way, and a vote whose every choice was removed would keep the counts apart forever; polling — a new
timer the requirements rule out.

## R5. When the browser asks

**Decision**: the browser asks only for a maximized poll whose detail has `pollVisibility === "Private Poll"` and
`pollState` `OPEN` or `CLOSED` (the projection already reports an `EDITING` poll by its state before the edit). A `404`
hides the panel and records the poll's `contentVersion`; no further request is made for it until that version changes.
No projection field is added.

**Rationale**: FR-001, FR-016. Anonymity is not in `PollProjection`; adding it would not reach polls whose cached
projection (`poll:<pid>`) and browser copy are keyed by an unchanged `contentVersion`, so existing polls would never
show the panel. Anonymity is frozen once a poll has a vote, and any change before that bumps `contentVersion`.

**Alternatives considered**: a `votersShown` projection field — the roll-out gap above; asking for every maximized
poll — a wasted request for every public poll.

## R6. A browser module of its own

**Decision**: `src/public/whoVoted.js` exposes `window.WhoVoted` with `show(section, pid, detail)` and `hide(section)`;
it holds the sort, the request sequencing (a newer request or `hide` drops older replies), the one `settleMs` retry
and the one `429` retry (after `retryAfterMs`), and builds the table with DOM methods (`textContent`, never
`innerHTML`). `tabs.js` adds `<section class="maximized-voters">` handling in three places only: `maximize`, `render`
(when the maximized card's `countsVersion` or `contentVersion` changed) and `restore`.

**Rationale**: FR-007–FR-017; TD2 of the requirements report: `createGrid` already manages two panels by hand.
Names reach the DOM only as text, so a name holding markup is shown as typed.

**Alternatives considered**: all of it inside `createGrid` — a third hand-managed panel in an already long closure.

## R7. Orders, dates and table structure

**Decision**:
- **Bar order**: `detail.choices` sorted by `pct` descending, stable over `position` (as `pollCard.js` sorts its bars).
- **Names**: `Intl.Collator(undefined, { sensitivity: "base", numeric: true })`, ties by `votedAt`, so two `Alex`
  entries are separate groups in a fixed order.
- **Date**: `Intl.DateTimeFormat(undefined, { dateStyle: "medium" })` in a `<time datetime>`; its `title` is
  `{ dateStyle: "medium", timeStyle: "short" }`.
- **Groups**: one `<tbody>` per group; its first `<tr>` starts with `<th scope="rowgroup" rowspan="n">`; banding by
  `tbody:nth-of-type(even)`.

**Rationale**: AM1, AM2, UA2, UA6, NC2; FR-009–FR-014. A row-group header is announced with each line of its group.

**Alternatives considered**: repeated names hidden by CSS — read twice by screen readers; a nested list — loses the
column headers.

## R8. Look and placement

**Decision**: `index.html`'s `maximizedCardGrid` template gains `<section class="maximized-voters" aria-labelledby hidden>`
between `.maximized-notes` and `.maximized-graph`. A new sheet `who-voted-m3.css`, last in `LAYER_ORDER`, styles the
panel like `.maximized-notes` (`surface-container-low`, `corner-small`, 12/16 px padding), the heading as
`title-medium`, the segmented control after the M3 segmented-button spec (as `line-graph-m3.css` does), and banding
with `surface-container`. Only M3 tokens; no literal font size.

**Rationale**: UA5, UA7, UA9; FR-006, FR-013, FR-019; `m3-assets.test.ts` pins every page's sheets and scripts.

**Alternatives considered**: reusing `.line-graph-segment` — a graph class name on a control that is not the graph's.

## R9. Tests and documents

**Decision**: `tests/who-voted-route.test.ts` (access matrix, `404`s, listed rows, choice filtering, `settleMs`,
`no-store`, `429` bucket separation, terms gate), `tests/client-who-voted.test.ts` (jsdom: both orders, banding,
row-group headers, empty state, dates, stale replies, retries, sort kept across refreshes and reset on close, no
request for public polls, `404` stops requests), `tests/m3-assets.test.ts` (new sheet and script), `postman/openapi.json`
(the route), `README.md` (the Anonymous Votes row and the maximized view), `ARCHITECTURE.md` (the route and the panel),
the `adminCard.js` comment on who sees names, `CLAUDE_COMPLETE.md`.

**Rationale**: Principle IV; the cross-feature invariant "`postman/openapi.json` follows the routes"; FR-020.
