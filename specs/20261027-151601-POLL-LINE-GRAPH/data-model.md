# Data Model: Poll Line Graph

**No stored-data change.** No table, no column, no migration: the feature reads the existing `vote_history`
table, whose per-partition `("poll_id", "voted_at")` index already exists (research R1). Everything below is
derived or in-memory.

**Amended by TWEAK03 (2026-10-27)**: one additive migration, `012-line-graph-tally`, adds the two tables below,
backfilled from `vote_history`. The graph reads them instead of the history (research R1, R4).

### line_graph_tally (new)

| Column | Type | Use here |
|---|---|---|
| `poll_id` | text | references `polls(id)` on delete cascade |
| `hour` | timestamptz | the first UTC hour boundary at or after the votes it sums |
| `choice_id` | text | a choice id, or `""` (`TALLY_VOTERS`) for the number of addresses with a non-empty selection |
| `delta` | integer | how much that count changed in that hour |

Primary key `(poll_id, hour, choice_id)`. Written only by `recordLineGraphTally`, in the same transaction as every
`vote_history` insert (`writeBatch`, `recordVote`, `insertVoteHistory`), and by `fillLineGraphTally` (the backfill
and `rebuildLineGraphTally`, which the populate script runs after deleting history rows). Not subject to
retention. A graph point at boundary t = the sum of the poll's rows with `hour <= t`.

### line_graph_selection (new)

| Column | Type | Use here |
|---|---|---|
| `poll_id` | text | references `polls(id)` on delete cascade |
| `email` | text | the address; rewritten to the per-poll placeholder by account deletion, as `votes` and `vote_history` are |
| `choice_ids` | text[] | the address's latest selection, which its next vote replaces |
| `voted_at` | timestamptz | when that selection was made; an older vote arriving later changes nothing |

Primary key `(poll_id, email)`. Never leaves the server.

## Existing stored data (read-only)

### vote_history (existing, unchanged)

| Column | Type | Use here |
|---|---|---|
| `poll_id` | text | the one filter; indexed with `voted_at` per partition |
| `email` | text | replay identity — each email's latest event wins; never leaves the server |
| `choice_ids` | text[] | the voter's full selection as of the event; empty never occurs here (history rows are real votes) |
| `voted_at` | timestamptz | event time; range-partitions the table monthly; 12-month retention |

### polls (existing, unchanged)

`choices` (ids, labels, positions, optional manual `color`), `choice_mode`, `poll_state`, `poll_visibility`,
`poll_sharing_mode`, `created_by_id` — read for the current choice set, the percentage denominator rule and the
access check (`mayViewResults`, research R2).

## Derived data (computed per request, cached)

### Scale (fixed table, `src/polls/lineGraph.ts`)

| Key | Window | Bucket | Available when span ≥ |
|---|---|---|---|
| `1d` | 24 hours | hour | always |
| `1w` | 7 days | hour | 1 day |
| `1m` | 31 days | day | 1 week |
| `1y` | 366 days | day | 1 month |

Span = now − the poll's earliest `vote_history` row. Buckets are UTC-aligned hour/day boundaries inside the
window, plus a final point at "now".

### Series response (the cached value; see contracts/api.md A1)

```
{
  scale: "1d" | "1w" | "1m" | "1y",     // the scale served (the largest available when none requested)
  availableScales: string[],             // ordered smallest → largest
  totalVoted: number,                    // voters with a non-empty selection now (equals the bar graph)
  buckets: number[],                     // epoch ms, UTC-aligned, last = now
  series: [{ id, label, color, points: number[] }]  // one per drawn choice; points[i] pairs with buckets[i]
}
```

- `color` is the manual hex when the choice has one, else null — the browser fills palette/semantic colours from
  the card's own `resultColors()` so the two graphs cannot disagree (research R7).
- `points` are integer percentages, rounded exactly as `computeResults` rounds.
- Drawn choices: current share > `lineGraphMinVotePercentage`; `0` disables the filter.
- Cache entry: key `line-graph:<pid>` holding every available scale (amended by TWEAK04), TTL `lineGraphRefreshIntervalMs`; contains no voter identity.

### Replay state (transient, inside one computation)

`Map<email, choice_ids>` — each voter's latest selection while walking events in time order; snapshotted at each
bucket boundary through `computeResults`'s formula. Discarded after the response is built.

**Amended by TWEAK03**: the walk now happens as votes are written, held in `line_graph_selection` (above). A
request holds only the summed tally rows, at most buckets × (choices + 1), and the running counts per choice.

## Browser state (in memory only)

| State | Owner | Notes |
|---|---|---|
| mounted graph context `{ pid, title, subtitle, card }` | `lineGraph.js` | set by `tabs.js` `maximize()`, cleared by `close()` |
| current scale | `lineGraph.js` | starts at the response's default; changed by the selector |
| last successful response | `lineGraph.js` | kept on fetch failure (FR-017) |
| refresh timer id | `lineGraph.js` | started on mount, cleared on unmount |
| crosshair position | `lineGraph.js` | pointer-driven; not persisted |

No browser storage (no localStorage/sessionStorage keys), no cookie — `cookie-use-list.test.ts` unaffected.

## New settings (configuration, not data)

| ENV | Config field | Default | Rule |
|---|---|---|---|
| `ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE` | `lineGraphMinVotePercentage` | `1` | integer ≥ 0; `0` disables the filter |
| `ENV_LINE_GRAPH_REFRESH_INTERVAL` | `lineGraphRefreshIntervalMs` | `60000` | clamped up to `minLiveRefreshIntervalMs`; served in `/api/config` |
