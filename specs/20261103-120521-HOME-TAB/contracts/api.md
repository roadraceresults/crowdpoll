# HTTP Contracts: Home Tab

`postman/openapi.json` gains A1, tagged `home`, beside `/api/tabs/your-votes/refresh`.

## A1. `POST /api/tabs/home/refresh` (new)

Signed-in only (`requireSession`); `refresh` kind: shedding, the refresh floor and the load budget apply (FR-020); listed nowhere in the terms gate's exemptions, so it is refused before Terms acceptance like the other personal tabs.

**Request** — the personal tabs' body, plus one optional field:

```json
{
  "membershipVersion": "2026-11-03T13:30:00.000Z",
  "versions": { "<pid>": [3, 17] },
  "keepOrder": true
}
```

| Field | Meaning |
|---|---|
| `membershipVersion`, `versions` | As every personal tab (`parseClientVersions`) |
| `keepOrder` | Optional boolean. `true` reuses a cached, unexpired membership even when the user's list version changed (research R6). Any other value, or absent, is `false` |

**Responses** — exactly the personal tabs' (`computeDelta`):

| Status | Body |
|---|---|
| `200` | `{ membershipVersion, order?, cards?, counts, overlay?, removed?, nextRefreshMs }` — `membershipVersion` is the membership's `builtAt` |
| `304` | none: nothing the browser holds changed |
| `401` | `{ "error": "Not signed in" }` |
| `429` / `503` | the shedding and floor answers, `retryAfterMs` |

Each `overlay[pid]` is the personal tabs' entry (`voted`, `choiceIds`, `bookmarked`, `mayWatch`, `ownPoll`, `voteBlockedReason`) with `relations: HomeReason[]` (data-model.md), e.g. `["invited", "bookmarked"]`, `["created"]`, `["trending"]`.

A caller without View Polls gets `200` with an empty listing.

**Side effects**: none on the database (FR-012: no `markAccepted`, no `adoptInvitations`); may write `home:<emailKey>`, `tabs:seen:<emailKey>:home`, the counters.

## A2. Configuration

`ENV_HOME_TAB_REFRESH_INTERVAL` (data-model.md). Not sent to the browser: `/api/config` is unchanged.

## A3. Unchanged

The four personal-tab routes, TRENDING, Newest, Search, Live Results and `/api/me/polls` are unchanged; Home reads the TRENDING listing from the cache only.
