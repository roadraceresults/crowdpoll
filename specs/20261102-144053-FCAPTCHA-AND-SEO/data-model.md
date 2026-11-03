# Data Model: Human Check Before Sign-In, and Search Engine Indexing of Public Polls

No migration, no new table or column. Everything below is derived per request or held briefly in the cache.

## Human check pass (held by FCaptcha, never stored by the web service)

A *pass* is the concept the spec names; on the wire it is carried as FCaptcha's *token*.

| Field | Source | Rule |
|---|---|---|
| token | FCaptcha widget, in page memory | sent once, in the `X-Human-Check` header (research R3) |
| action | widget `action` = page: `login`, `create-account`, `invite` | must be in the route's accepted set (R4) |
| hostname | FCaptcha's verify answer | must equal the host of `ENV_PUBLIC_ORIGIN` |
| lifetime | FCaptcha | 5 minutes; single use; spent tokens remembered 10 minutes (in Valkey db 1, R2) |
| client address | `do-connecting-ip`, else `req.ip` (R6) | sent as `remoteip`; logged only masked |

**Verify outcome** (`src/auth/humanCheck.ts`): `valid` → request proceeds; `invalid` → `400 challenge-required`;
`unreachable` (or no header while the service is unreachable) → proceeds, `abuse.humanCheckSkipped += 1`.

## Configuration (`AppConfig.humanCheck`)

| Setting | Type | Rule |
|---|---|---|
| `ENV_FCAPTCHA_ENABLED` | `1` / unset | unset → `humanCheck: null` (check off) |
| `ENV_FCAPTCHA_URL` | URL | required when enabled |
| `ENV_FCAPTCHA_SITE_KEY` | text | required when enabled; published in `/api/config` |
| `ENV_FCAPTCHA_VERIFY_SECRET` | secret text | required when enabled; never published or logged |

## Health counter

`AppContext.abuse` gains `humanCheckSkipped: number` beside `ipVoteCap`, reported by `/healthz` under `abuse`.

## Indexable poll (derived from `polls`)

`isIndexable(row)` (`src/polls/access.ts`, beside `mayViewResults`):

```
poll_visibility = 'Public Poll'
and ( poll_state in ('OPEN', 'CLOSED')
      or (poll_state = 'EDITING' and poll_state_before_edit_update in ('OPEN', 'CLOSED')) )
```

| Derived value | Rule |
|---|---|
| canonical address | `<ENV_PUBLIC_ORIGIN>/poll/<id>` |
| lastmod | `closed_at` if set, else `launched_at` |
| summary results | per choice: published percentage from the live counters (`readOrRebuildCounts`), and the total vote count |

State transitions that matter: a poll **becomes** indexable when it opens (or is approved into OPEN); it **stops**
being indexable when it turns private, is archived or deleted. Both take effect in the sitemap within its 5-minute
cache, and at once on `/poll/<id>` and `/api/polls/<id>/card`, which read the row.

Never placed on a poll page or in the guest card answer: `created_by`, a choice's `addedBy`, voters.

## Poll list (sitemap, cache only)

| Key | Value | Lifetime |
|---|---|---|
| `seo:sitemap` | the XML of `/sitemap.xml` (a urlset, or an index when over the limit) | 5 minutes |
| `seo:sitemap:<n>` | the XML of part `n` (1-based), only when over the limit | 5 minutes |

The limit is 50,000 addresses per file (sitemaps.org protocol); the home page is the first entry of the first part.
