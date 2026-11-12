# Data Model: Admin Search Checkboxes

No new table or column. Two existing `polls` columns are read, and two partial indexes are added.

## `polls` (existing columns read)

| Column | Type | Use |
|---|---|---|
| `line_graph_enabled` | `boolean`, not null | "Line graph enabled" matches `true` |
| `choices` | `jsonb`, array of `{ id, label, position, color?, addedBy? }` | "Custom colors set" matches when at least one element has a non-null `color` (`#RRGGBB`, a palette color or one already stored) |
| `pending_update` | `jsonb` or null | **not read**: a pending change counts once it is saved or approved (UA4) |

## Migration `022-admin-search-flags`

```sql
create index "polls_line_graph_created" on "polls" ("created_at" desc) where "line_graph_enabled";
create index "polls_custom_colors_created" on "polls" ("created_at" desc)
  where jsonb_path_exists("choices", '$[*] ? (@.color != null)');
```

`down` drops both. Registered in `src/db/migrations/index.ts`; no change to `src/db/schema.ts`.

## Search filters (`AdminSearchFilters`, `src/search/adminSearch.ts`)

| Field | Type | From query | SQL when set |
|---|---|---|---|
| `lineGraphEnabled` | `true \| undefined` | `lineGraphEnabled=true` | `line_graph_enabled = true` |
| `customColors` | `true \| undefined` | `customColors=true` | `jsonb_path_exists(choices, '$[*] ? (@.color != null)')` |

Missing or blank → `undefined` (no filter). Any other value → `AdminSearchError` → `400`.
