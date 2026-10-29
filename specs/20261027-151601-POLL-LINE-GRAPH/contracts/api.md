# HTTP Contracts: Poll Line Graph

## A1. GET /api/polls/:pid/line-graph

The one new endpoint. Guest-capable (no session required), wrapped `...dynamic("refresh")` (instance shedding +
the manual/refresh floor), read-only, documented in `postman/openapi.json`.

**Query**: none. (Amended by TWEAK04: the former `?scale=` parameter is gone; a stray `scale` query is ignored.
Every available scale is answered at once, so a scale switch is drawn in the browser with no request and never
meets the refresh floor's 429.)

**Access** (`mayViewResults`, research R2): the poll exists and is published, and is not `Private Poll`, or the
caller is its creator or reaches it (invitation for Invitation Only; linked/voted/invited otherwise). Guests pass
for public published polls only. A ban does not refuse. Every refusal — unknown pid, malformed pid, unpublished
poll, unreachable private poll — is `404 { "error": "Not found" }`, so a probe cannot tell a private poll from a
missing one.

**200 response** (`Cache-Control: no-store`; the server-side cache is the freshness bound):

```json
{
  "defaultScale": "1y",
  "availableScales": ["1d", "1w", "1m", "1y"],
  "totalVoted": 412,
  "scales": {
    "1d": { "buckets": [ ... ], "series": [ ... ] },
    "1y": {
      "buckets": [1760918400000, 1761004800000, 1761091200000],
      "series": [
        { "id": "c1", "label": "Anthropic", "color": null, "points": [51, 54, 56] },
        { "id": "c4", "label": "Google", "color": "#0808FD", "points": [38, 35, 34] }
      ]
    }
  }
}
```

- `defaultScale`: the largest available scale, drawn first.
- `scales`: one `{ buckets, series }` entry per element of `availableScales`, and no others.
- `buckets`: epoch milliseconds, UTC hour/day aligned per the scale, ascending; the last element is "now".
- `series`: only choices whose **current** share exceeds `lineGraphMinVotePercentage` (0 disables the filter),
  in the poll's choice order; `points[i]` pairs with `buckets[i]`; integer percentages computed by
  `computeResults`'s formula on the replayed standing (single-choice: count / voters; multiple-choice:
  count / total selections).
- `color`: the choice's stored manual hex, else `null` (the browser supplies palette/semantic colours from the
  card's `resultColors()`).
- `totalVoted` and the last point of every series equal the bar graph's current values.
- A poll whose every available scale has fewer than two buckets still answers `200`, with the data it has
  (possibly `buckets.length < 2`); the placeholder decision is the browser's (ui-contracts C6).

**Caching** (research R5): read-through on the shared `Cache`, key `line-graph:<pid>` (one entry holding every
scale, amended by TWEAK04), TTL = `lineGraphRefreshIntervalMs`. The access check runs on every request, before the
cache.

**Server logging**: one informative line per cache miss (pid, the scales computed, tally rows summed, duration);
never an email, e.g. `[line-graph] poll <pid> scales 1d,1w,1m,1y — 212 tally rows summed in 9 ms`.

## A2. GET /api/config — two added fields

```json
{
  "lineGraphMinVotePercentage": 1,
  "lineGraphRefreshIntervalMs": 60000
}
```

Added to the existing response (everything else unchanged). `lineGraphRefreshIntervalMs` is the value after the
clamp to `minLiveRefreshIntervalMs`, so the client can use it verbatim as its timer interval.
