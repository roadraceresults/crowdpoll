# Data Model: Populate Script Graph Subtitle

No stored-data change: no new table, column, migration or setting. The feature adds one field to the script's
input and its in-memory parse result; the destination is the existing `polls.subtitle` column.

## Poll data JSON file (input)

One new optional top-level key beside the existing ones:

| Key | Required | Type | Rule |
|---|---|---|---|
| `graph_subtitle` | no | string | at most `SUBTITLE_MAX` (30) characters; absent or `""` means no subtitle; a non-string or an over-long string is an input error (contracts C1–C2) |

The existing keys (`poll creator email`, `title`, `choice_a`…, `vote_count`, `data_points`) are unchanged
(FR-009). Other unknown top-level keys remain ignored.

## PollData (in memory, `devScripts/populate/populate-poll.ts`)

| Field | Type | Source | Notes |
|---|---|---|---|
| `subtitle` *(new)* | `string` | `graph_subtitle`, validated per research R2 | `""` when the key is absent or empty; untrimmed |

All other `PollData` fields are unchanged.

## polls (existing table — no change)

| Column | Change | Written by |
|---|---|---|
| `subtitle` | none (existing `text`, limit 30 via `SUBTITLE_MAX`) | create: `insertPoll` with the parsed value; refresh: `updatePoll` with the parsed value, clearing it when the file has none (research R3) |

## State transitions

None. The poll's lifecycle, the rerun's delete-and-replay of simulated votes, and the projection refresh are
untouched; the subtitle simply rides the existing writes.
