# Data Model: Home Tab

No migration, table or column. Home reads the existing `user_polls`, `polls`, `poll_invitations` and the cached TRENDING listing, and keeps one cache key per user.

## Home membership (cache, new)

Key `home:<emailKey>` (`emailKeyOf(email.toLowerCase())`), a JSON string; TTL = `homeTabRefreshIntervalMs`, or `trendingPollsRecomputeSweepIntervalMs` when `trendingReady` is false (research R1, R4).

| Field | Type | Meaning |
|---|---|---|
| `v` | string | The `tabs:v:<emailKey>` list version it was built under (`ensureVersion`) |
| `builtAt` | ISO string | When it was built; sent to the browser as `membershipVersion` |
| `order` | string[] | The listed pids, rule order, then the order within each rule (R4) |
| `rules` | number[] | The rule (1–5) that placed each pid of `order`, by position, so a refresh re-checks rule 1 by Shared With You's rule and rule 4 by `mayWatch` |
| `relations` | `[pid, HomeReason[]][]` | Why each pid is listed (R7) |
| `trendingReady` | boolean | Whether rule 5 had a listing to read |

`HomeReason` = `"invited" | "linked" | "created" | "voted" | "bookmarked" | "trending"`; `"trending"` appears alone, on a pid only rule 5 placed.

**Validity** (checked on each refresh, research R6):

```text
reuse  ⇔ cached exists ∧ (cached.v = current tabs:v ∨ request.keepOrder)
rebuild otherwise   (the TTL removes an expired one)
```

**Lifecycle**: built on the first Home refresh with no valid membership → reused → expires (TTL) or is superseded when the list version changes (`forgetTabs` after any write to `user_polls`, `poll_invitations` or `poll_bans`, the existing invariant) → rebuilt on the next Home refresh.
Nothing deletes it on sign-out; it expires.

## Rules (derived, research R2–R4)

| Rule | Relations | Narrowing at rebuild | Cap |
|---|---|---|---|
| 1 | `invited`, `linked`; `created_by_id ≠ user` | `sharedWithYouKept` | 10 |
| 2 | `created` | — | 10 |
| 3 | `voted` | `reachableMany` | 10 |
| 4 | `bookmarked` | `mayWatchMany` | none (≤ `ENV_MAX_BOOKMARKS_PER_USER`) |
| 5 | TRENDING listing order | not already listed | 10 |

**Eligibility for rules 1–4**, `s` = the stashed state while EDITING, else `poll_state`:

| `s` | Listed when |
|---|---|
| WAITING TO OPEN | always |
| OPEN | `launched_at ≥ now − 2 calendar months (UTC)` |
| CLOSED | `closed_at ≥ now − 7 days` |
| INITIALIZED, AWAITING APPROVAL, REJECTED, ARCHIVED | never |

**Per refresh** (R5): every listed row `isPublished`; rule-1 rows in `sharedWithYouKept`; all rows in `reachableMany`; rule-4 rows in `mayWatchMany`.

## Setting (new)

| Variable | Config field | Default | Rule |
|---|---|---|---|
| `ENV_HOME_TAB_REFRESH_INTERVAL` | `homeTabRefreshIntervalMs` | `7200000` | integer ms, ≥ `60000`, else `ConfigError` |
| `ENV_MAX_HOME_PAGE_POLLS` | `maxHomePagePolls` | `200` | integer, ≥ `1`, else `ConfigError`; distinct polls a rebuild considers, most recent relation first |

## Counters (new, research R13)

`stats:home:rebuilt`, `stats:home:reused` — `countStat`, 10-minute TTL, beside `stats:tabs:fast` / `stats:tabs:full`.

## Browser state (no storage)

The Home controller in `tabs.js` holds a `keepOrder` flag in memory: set by a vote, watch, unwatch or added choice on a Home card; cleared when Home is opened (tab selected, page loaded). No cookie or storage key is added, so `privacy.html`'s Cookie Use list is unchanged.
