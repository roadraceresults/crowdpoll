# Data Model: Refresh Mechanisms

No database change and no migration.
Everything new lives in the shared cache (Valkey in production, `memoryCache` in development and tests), and losing any of it only costs full answers (spec Assumptions).

## Cache keys

| Key | Value | TTL | Written by | Read by |
|---|---|---|---|---|
| `tabs:v:<emailKey>` | opaque unique string `<ms>-<random>` | 24 h | `setNx` at the start of a full personal-tab answer | every personal-tab refresh |
| `tabs:seen:<emailKey>:<tab>` | JSON `TabSeen` (below) | 5 min | after every full personal-tab answer | the shortcut check |
| `poll:<pid>` | the poll projection (existing) | none (existing) | store on every content change (existing); refreshes only when missing or stale (R5) | shortcut check, Live Results, refreshes |
| `stats:tabs:fast`, `stats:tabs:full` | integer | 10 min | `INCR` per personal-tab answer by path | budget controller log line |
| `stats:floor:stretched` | integer | 10 min | `INCR` per stretched refusal (R9) | budget controller log line |

`<emailKey>` is `emailKeyOf(address)` (`src/auth/emailKey.ts`); `<tab>` is `your-polls`, `shared-with-you`, `your-votes` or `watching`.

### TabSeen

```text
{
  v: string                          // tabs:v value read before the queries
  membershipVersion: string | null   // as sent
  order: string[]                    // poll ids as sent
  rows: [pid, rowContentVersion, sentContentVersion][]   // every row loaded, before narrowing
}
```

`sentContentVersion` is `0` for a "not published" placeholder and the row's `content_version` otherwise.

## Life of the list version

```text
(missing) ──full answer: setNx──▶ V1 ──change: del──▶ (missing) ──full answer──▶ V2 …
                                   │
                                   └─ refreshes while V1 and TabSeen match → shortcut
```

- **Missing** = unknown: a refresh builds a full answer (FR-005).
- **Change** (R3): after commit, `forgetTabs(cache, addresses)` deletes `tabs:v:<emailKey>` for each address.
- **Deleted poll** (R4): `poll:<pid>` is deleted, so every `TabSeen` listing it fails its row check.
- **Expiry**: `TabSeen` (5 min) bounds staleness from a missed signal; `tabs:v` (24 h) bounds memory.

## Unchanged entities used

- `user_polls`, `poll_invitations`, `poll_bans` (PostgreSQL): their write sites now also signal (research R3).
- `polls.content_version`: already bumped on every content change; read through the cached projection.
- Floor buckets `floor:<kind>:<who>`: same keys; the `search` and `refresh` buckets now refill at `floor × k` (R9).
