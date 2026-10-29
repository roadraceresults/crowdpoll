# Research: Poll Line Graph

Each entry: Decision / Rationale / Alternatives considered.

## R1. Data source and index

**Decision**: Read the existing `vote_history` table (`poll_id`, `email`, `choice_ids[]`, `voted_at`; monthly
partitions; 12-month retention via `retentionSweep`). **No migration**: `ensureVoteHistoryPartition`
(`src/db/partitions.ts`) already creates `<partition>_poll_voted` on `("poll_id", "voted_at")` for every
partition, so the per-poll range query is indexed today.

**Rationale**: Every vote event — first and changed votes alike — is inserted by the consumer
(`src/votes/consumer.ts`) with the voter's full `choice_ids` at that moment, which is exactly the event log a
cumulative replay needs. The requirements report's technical-debt note ("vote_history has no per-poll index") was
checked against the code and found stale.

**Alternatives considered**: a new aggregate table updated per vote (write-path change, backfill problem, more
moving parts); querying `votes` (holds only the current standing — no history).

**Amended by TWEAK03 (2026-10-27)**: the rejected alternative was adopted. A populated poll with 14.9 million
`vote_history` rows (2.6 GB) exhausted the server's 4 GB heap on the first graph request, so the graph no longer
reads the history. Migration `012-line-graph-tally` adds `line_graph_tally` and `line_graph_selection`, which every
`vote_history` writer keeps in the same transaction, and backfills them from the existing history (see R4 and
`data-model.md`). The history is still read once per request for the poll's first vote (an index probe, for the
span).

## R2. Access rule for the endpoint

**Decision**: A new `mayViewResults(deps, caller, pid)` in `src/polls/access.ts`, reusing the module's `reaches()`
and `standingOf()`: the poll row exists and is published, and it is not `Private Poll`, or the caller is its
creator, or the caller reaches it (invitation for Invitation Only; linked/voted/invited relation otherwise).
Guests (no session) may view **public published** polls only. A ban does not hide the graph (bans block voting,
not viewing, per the existing `reachableMany` comment).

**Rationale**: This mirrors exactly who can see the poll's card and counts today: guests get public polls' results
through trending/newest/search projections, so the graph for a public poll must be guest-visible; `mayWatch` was
rejected as the rule because it additionally requires a session and the `View Polls` grant (it gates *watching*,
not seeing). Server-side enforcement satisfies FR-013 (no side channel).

**Alternatives considered**: `mayWatch` (too strict for guests, as above); no check (leaks invitation-only
standings to anyone with the pid).

## R3. Route shape and load class

**Decision**: `GET /api/polls/:pid/line-graph?scale=1d|1w|1m|1y` in `src/routes/tabsApi.ts`, wrapped
`...dynamic("refresh")` (instance shedding + the manual/refresh floor), **no** `requireSession` (guest-capable,
like `/api/search`). An unknown scale, an unavailable scale or a failed access check answers `404 { error: "Not
found" }` (indistinguishable from a missing poll, as `canActOnPoll` precedent prefers); a malformed pid answers
`404` too. Added to `postman/openapi.json`.

**Rationale**: The "refresh" kind is the manual-fetch class every per-poll read uses (`/api/me/polls`, bookmark);
the client's own cadence (one request per refresh interval per viewer) sits far under its floor. The "live" kind
is reserved for the Live Results tab's registered sessions.

**Alternatives considered**: a `live`-kind route (wrong class, needs registration); piggybacking the series onto
the existing delta/overlay responses (bloats every refresh for a view few viewers have open).

**Amended by TWEAK04 (2026-10-27)**: the `?scale=` parameter is gone. One response carries every available scale
(`defaultScale`, `availableScales`, `totalVoted`, `scales: { <scale>: { buckets, series } }`), and the browser
switches scales locally. A scale click was a manual-kind request, so a few quick clicks met the refresh floor's
`429` (5 s after a burst of 5). With no scale to refuse, the only 404s are the access refusals.

## R4. Series computation (bucket replay)

**Decision**: A pure module `src/polls/lineGraph.ts`: one indexed query
(`select email, choice_ids, voted_at from vote_history where poll_id = ? order by voted_at`), then a TypeScript
replay — walk events in time order, keep each voter's (email's) latest `choice_ids`, and at each UTC bucket
boundary apply `computeResults`'s percentage formula (single-choice: count / voters with a non-empty selection;
multiple-choice: count / total selections) for every current choice of the poll. The final bucket is "now", so the
newest point equals the bar graph. Choices are filtered **after** replay by current share >
`lineGraphMinVotePercentage` (0 disables). Deleted-choice ids that appear in old events simply never match a
current choice and drop out. The replay's per-email identity also depends on account deletion rewriting
`vote_history` emails with the same per-poll anonymized mapping it applies to `votes`
(`deleted-<uuid>@deleted.invalid`), so an anonymized voter is still one voter; T003/T004 carry a test case for it.

**Rationale**: One query, one pass, trivially unit-testable, and it reuses the one percentage definition the bar
graph has (`computeResults`, `src/polls/service.ts`) rather than duplicating it in SQL. Volume is bounded: a poll's
events fit comfortably in memory and replay in milliseconds, and the result is cached (R5).

**Alternatives considered**: SQL window functions / `generate_series` lateral joins (harder to read, duplicates the
percentage rule in a second language, saves nothing behind a 60 s cache); incremental per-bucket queries (N queries
per request).

**Amended by TWEAK03 (2026-10-27)**: "a poll's events fit comfortably in memory" was wrong at scale (R1's
amendment). The replay now happens as votes are written. `recordLineGraphTally` (`src/polls/lineGraphTally.ts`)
replaces each address's previous selection (`line_graph_selection`) and adds the change to the hour it happened
in, the first hour boundary at or after the vote (`line_graph_tally`, with the voter count under the reserved
choice id `""`). The graph sums that tally into its buckets in one grouped query, at most buckets × choices rows,
and `seriesFromTally` applies `computeResults`'s formula as before. The rules are unchanged: each email's latest
selection wins, a point at boundary t counts every vote at or before t, and deleted choice ids drop out. One
deviation: a vote older than the address's latest recorded vote (possible only when a queued vote is reclaimed
late) changes nothing, since it was superseded before it arrived. The tally's history does not depend on
`vote_history` partitions, which retention drops after 12 months. The tests still state graphs as their raw
votes: `buildSeries` runs them through the same `tallyDeltas` arithmetic the writers use.

## R5. Caching and refresh

**Decision**: Read-through on the existing `Cache` seam (`src/cache/cache.ts` — Valkey in production, in-process in
development/tests): key `line-graph:<pid>:<scale>`, value the serialized response, TTL = `lineGraphRefreshIntervalMs`.
The access check (R2) always runs before the cache is consulted, so the cached payload (which contains no voter
identities) is shared safely across viewers. The browser refetches the current scale on the same interval while the
card is maximized and stops when it closes.

**Rationale**: Accepted finding RS1. Computes only what is viewed, one computation shared by all viewers of a
poll+scale per interval (SC-004), no sweep, no publisher, no new infrastructure; the TTL doubles as the staleness
bound, so one setting governs both sides.

**Amended by TWEAK04 (2026-10-27)**: the key is `line-graph:<pid>`, one entry holding every available scale; a
miss computes all of them (one grouped tally query per scale). The browser's timer refetches that one response
and redraws the scale the viewer chose.

**Alternatives considered**: TRENDING-style precompute-and-publish to Spaces/CDN (computes four scales for every
open poll nobody is watching; new sweep and object family); no cache (every viewer pays the query every interval).

## R6. Scales, availability, time zone

**Decision**: Scale table — `1d` (window 24 h, hourly buckets), `1w` (7 days, hourly), `1m` (31 days, daily), `1y`
(366 days, daily). Availability from span = now − the poll's first `vote_history` row: `1d` always, `1w` at ≥ 1 day,
`1m` at ≥ 1 week, `1y` at ≥ 1 month; the default (and the response's `scale` when none is requested) is the largest
available. Buckets are aligned UTC hour/day boundaries inside the window plus a final "now" point; the response
carries epoch-millisecond timestamps and `availableScales`, and the browser formats all labels with
`Intl.DateTimeFormat` in the viewer's local time.

**Rationale**: Accepted findings AM2, UA2, UA8 verbatim; UTC bucketing keeps one shared cache entry per poll+scale
(R5) while labelling stays free per viewer.

**Alternatives considered**: creator-time-zone bucketing (`polls.time_zone`) — rejected by the developer in UA8;
viewer-local bucketing (fragments the cache or mislabels shared buckets).

## R7. Browser integration (mount/unmount seam)

**Decision**: A new `lineGraph.js` exposing `window.PollLineGraph = { mount(el, ctx), unmount() }`. `tabs.js`
calls `mount` in `maximize()` after the card moves into the maximized view — passing the
`.maximized-space-right` element and a context `{ pid, title, subtitle, card }` — and `unmount` in `close()` (all
four close paths funnel through it). `pollCard.js` adds one getter to the card API, `resultColors()`, returning
`[{ id, label, hex }]` from the colours the card already assigned (`assignResultColors` with the card's palette,
offset and manual colours), so the graph can never disagree with the bars. `lineGraph.js` reads the threshold and
interval from `/api/config` (cached by `app.js`'s existing config fetch pattern) and guards all its entry points so
pages without the elements return at once, as `tabBarScroll.js` does.

**Rationale**: The maximize/close seam already exists and is the only place the right column appears; passing the
card instance avoids re-deriving colours and titles. Two small edits to existing files, everything else new.

**Alternatives considered**: a MutationObserver watching for the maximized view (indirect, ordering-fragile);
rendering the graph from inside `pollCard.js` (bloats the card module with a feature only the maximized view has).

## R8. Rendering technology

**Decision**: Hand-rolled inline SVG (accepted finding NC1): `<polyline>` per choice in its bar hex, four or five
horizontal gridlines with percentage labels, X labels at natural day/hour steps, a crosshair (vertical line +
tooltip listing every drawn choice) driven by `pointermove`/`pointerdown` so mouse, pen and touch all work, and a
`ResizeObserver` re-rendering on column width changes. No animation, so reduced-motion needs no special case.

**Rationale**: Keeps the zero-dependency front end; the needed feature set (fixed scales, ≤ 366 points, one hover
behaviour) is small enough to own; full control of Material 3 theming.

**Alternatives considered**: Chart.js / uPlot (first front-end dependency, bundle weight, theming and jsdom-test
friction) — rejected in NC1.

## R9. Styling

**Decision**: A new `line-graph-m3.css`, loaded last on `index.html` only, holding tokens-only rules for the right
column's graph (legend, axes text, crosshair, tooltip, scale selector, placeholders); it joins `LAYER_ORDER` and
the `index.html` allowlist in `tests/m3-assets.test.ts`. The `.maximized-space-right` placeholder styling in
`tabs.css` (hard-coded `#E6E6E6`, Inter at a literal 13 px) is removed — that element's content is what this
feature replaces, so the removal is in scope (and retires the debt the requirements report named). Line colours
are data, not style: each polyline's stroke is the choice hex inline, like the card's inline `--swatch` precedent.

**Rationale**: Matches the layered-stylesheet convention every M3 feature follows; keeps literal colours out of
stylesheets so `m3-assets.test.ts` passes.

**Alternatives considered**: extending `pollCard-m3.css` (wrong scope — the graph is the maximized view's, not the
card's); styling inside `tabs.css` (a pre-M3 sheet the convention says to layer over, not grow).

## R10. Settings

**Decision**: `ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE` → `lineGraphMinVotePercentage` (integer ≥ 0, default `1`;
`0` disables the filter) and `ENV_LINE_GRAPH_REFRESH_INTERVAL` → `lineGraphRefreshIntervalMs` (default `60000`,
clamped up to `minLiveRefreshIntervalMs` when set lower), parsed in `src/config.ts` like the existing numeric
settings; both added to `GET /api/config`'s JSON (`src/routes/api.ts`).

**Rationale**: Accepted finding UA5; the clamp keeps a misconfigured refresh from undercutting the tightest
existing per-user floor.

**Alternatives considered**: a hard startup error on a too-small interval (the clamp is gentler and matches how
the floors already defend themselves).

## R11. Failure handling in the browser

**Decision**: Per the clarification (spec FR-017): a failed or non-OK fetch during refresh leaves the last drawn
series in place and the timer retries at the next interval, with one minimal `console` line at most; a failed
first load renders the quiet "Graph unavailable right now" placeholder, replaced by the next successful fetch. A
`404` from the access rule renders the results-unavailable note instead (spec FR-013) and stops refreshing.

**Rationale**: Quiet degradation bounded to one interval of staleness; distinguishing "cannot ever see this"
(stop) from "blip" (retry) avoids hammering a route that will keep refusing.

**Alternatives considered**: visible error banners or staleness badges — rejected in clarification Q1.

## R12. Accessibility

**Decision**: Per the clarification (spec FR-018): the legend is real text (colour dot + label + current
percentage + total votes) and carries the accessible reading; the SVG gets `role="img"` and an `aria-label`
("Vote share over time for <poll title>"); the crosshair stays pointer/touch-only.

**Rationale**: The legend already duplicates the graph's headline data as text; a keyboard-navigable chart was
explicitly not asked for.

**Alternatives considered**: keyboard crosshair, hidden data table — rejected in clarification Q2.

## R13. Tests

**Decision**: Three suites. `line-graph-replay.test.ts`: pure units over `src/polls/lineGraph.ts` — cumulative
replay with changed votes (a voter counted once per bucket), multiple-choice denominators, UTC bucket edges, span
and availability rules, threshold filter including `0`. `line-graph-route.test.ts`: supertest + embedded-postgres —
access matrix (guest/public, guest/private, invited, creator, banned-still-sees, unpublished 404), default and
explicit scales, `404` on bad scale, cache sharing (two requests, one computation — observable via a counting
cache or query spy), settings in `/api/config`. `line-graph-ui.test.ts`: jsdom with the opt-in script list —
mount on maximize, legend contents, placeholder on empty data, first-load failure placeholder, unmount stops the
timer. `m3-assets.test.ts` and `cookie-use-list.test.ts` updated expectations (new sheet; no new storage keys, so
the cookie table is untouched).

**Rationale**: Constitution IV (verifiable success criteria) and the project's existing test layering.

**Alternatives considered**: browser-automation tests (the project's suites are vitest/jsdom; quickstart covers
the eyes-on pass).
