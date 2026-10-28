# Quickstart Validation: Poll Line Graph

Proves the feature end-to-end. Contracts: [contracts/api.md](contracts/api.md) (A1–A2),
[contracts/ui-contracts.md](contracts/ui-contracts.md) (C1–C9); derived data: [data-model.md](data-model.md).

## Prerequisites

- Local PostgreSQL with the app schema (`npm run dev` applies migrations); no Valkey needed (in-process cache).
- Launch with the usual `devScripts/launch-dev.ps1`, plus, to make the feature visible quickly:
  - `ENV_LINE_GRAPH_REFRESH_INTERVAL=5000` (watch refreshes without waiting a minute; it clamps to
    `ENV_MIN_LIVE_REFRESH_INTERVAL` if set lower)
  - `ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE=1` (the default)

## Automated

```powershell
npm test
```

New suites that must pass: `tests/line-graph-replay.test.ts` (cumulative replay, changed votes, multi-choice
denominators, UTC bucket edges, availability, threshold incl. 0), `tests/line-graph-route.test.ts` (access matrix,
scales, 404s, cache sharing, `/api/config` fields), `tests/line-graph-ui.test.ts` (mount/unmount, legend,
placeholders, failure fallback). Also still green: `m3-assets.test.ts` (new `line-graph-m3.css` in `LAYER_ORDER`
and on `index.html`), `cookie-use-list.test.ts` (no new storage).

## Manual walkthrough

1. **Seed a poll with history**: create and publish a public poll with 3+ choices; vote from a few sessions
   (lower `ENV_EMAIL_RATE_LIMIT_*` friction by signing in once per browser profile). For a spread axis, insert a
   few `vote_history` rows with back-dated `voted_at` (dev database only) spanning several hours/days. The graph
   reads the hourly tally, not the history (TWEAK03), so after inserting rows by hand run
   `rebuildLineGraphTally(db, pid)` (`src/polls/lineGraphTally.ts`), or use `devScripts/populate/populate-poll.ts`,
   which keeps the tally itself. A populated poll with millions of history rows must draw as quickly as a small one,
   and the server's memory must not grow when it is maximized.
2. **P1 — the graph renders**: on the home page, maximize the poll's card. The right column shows title,
   subtitle, legend (dot + label + current % per drawn choice, total votes) and the line graph at full column
   width. Line colours match the bars exactly; the newest point and vote count equal the bar graph (SC-002).
3. **Scales**: with history spanning > a month all four buttons show and `1 Year` is selected; with < a day of
   history only `1 Day` shows. Click another scale → redraw in place; hourly scales label hours, daily scales
   label dates, in your local time.
4. **Crosshair**: hover (or tap on a touch device) → vertical line + tooltip listing every drawn choice's
   percentage at that time, the time shown once. Leaves on pointer-out.
5. **Refresh**: with the 5 s interval set, vote from another session; within ~5 s the newest point, legend and
   vote count move (SC-003). Close the maximized view; the network panel shows no further line-graph requests.
6. **Threshold**: set `ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE=40`, restart: only choices above 40% keep lines and
   legend entries; `0` restores every voted choice.
7. **Sparse data**: maximize a freshly published poll with no votes → "Not enough voting data to graph yet";
   after two votes an interval apart (hourly bucket spread may need back-dating), the graph appears on refresh.
8. **Access**: as a guest, maximize a public poll → graph renders. Request
   `GET /api/polls/<pid>/line-graph` for an invitation-only poll you are not invited to → `404`; as its creator →
   `200`. The card for a poll you cannot see never mounts, so the in-page case shows only via the direct request.
9. **Failure**: with the card maximized, stop the server → the drawn graph stays (no error banner); restart the
   server → next tick refreshes. Reload the page with the server stopped, maximize nothing is possible — instead
   simulate a first-load failure by blocking the request in devtools: the column shows "Graph unavailable right
   now", and unblocking lets the next tick draw it.
10. **Dark mode and phone width**: toggle `data-theme="dark"` (or OS theme) — line colours unchanged, chrome
    follows the theme; narrow the window below the maximized grid's wrap point — the graph sits below the card at
    full width and a tap places the crosshair.
11. **Caching**: open the same maximized poll in two browser sessions; the server log shows one "line-graph
    computed" line per interval per scale, not one per viewer (SC-004).

## Expected server log shape

One line per cache miss, e.g. `[line-graph] poll <pid> scale 1w — 412 tally rows summed in 3 ms`; never an email
address. The first start after migration `012-line-graph-tally` backfills the tally from the whole history, which
can take a minute or more for a 15-million-row poll; later starts do nothing.
