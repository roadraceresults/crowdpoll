# Data Model: Per-Poll Line Graph Toggle

## Stored change

### `polls` (one new column)

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `line_graph_enabled` | `boolean` | not null | `false` | Whether the poll shows the line graph when maximized. Set only by an Administrator. |

Migration `013-line-graph-enabled`: `alter table "polls" add column "line_graph_enabled" boolean not null default false`. Down: drop the column. No backfill, no index (the flag is read by primary key only).

No other table changes. The graph's own tables from `012-line-graph-tally` (`line_graph_tally`, `line_graph_selection`) are unchanged.

## Derived shapes (in memory)

| Shape | Field | Source |
|---|---|---|
| `Poll` (`src/polls/store.ts`) | `lineGraphEnabled: boolean` | `line_graph_enabled` |
| `PollProjection` (`src/polls/versions.ts`) | `lineGraphEnabled: boolean` | `projectPoll` |
| Admin list and search row (`adminListRow`) | `lineGraphEnabled: boolean` | the poll |
| Card in the browser (`deltaClient.js`) | `lineGraphEnabled: boolean` | copied from the projection |

## Rules

- **Who may set it**: an Administrator (`isAdminEmail`). Any other caller who sends the field is refused with `403`.
- **When it may change**: any poll state except awaiting approval, with or without votes. While a poll is awaiting approval, a change is refused as any other field is (`409`). Changing it does not change `pollState`, does not send the poll for review, and does not pause voting beyond an open edit session.
- **Change of content**: it is a content field, so a change bumps `content_version`, which refreshes open cards and listings.
- **Default**: `false` for every poll, new or existing.
- **Administrator removed from the list**: the stored value stays as it is (spec Clarifications).
- **Graph route**: answers `404` when the value is `false`, before any cached body is served.

## State transitions

None. The setting is not part of the poll's lifecycle (`pollState` is unchanged by it).
