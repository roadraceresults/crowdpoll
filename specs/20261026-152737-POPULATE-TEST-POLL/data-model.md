# Data Model: Populate Test Poll

No table, column, index or migration is added.
The script reads one file, holds a few in-memory structures, and writes rows the application already writes.

## Input: the poll data file

| Key | Type | Rule (FR-018) |
|---|---|---|
| `poll creator email` | string | non-empty; an existing `user.email`, matched exactly |
| `title` | string | non-empty, at most `TITLE_MAX` (50) characters |
| `choice_a`, `choice_b`, … | string | `^choice_[a-z]+$`; ordered by length then alphabetically; non-empty, at most `CHOICE_LABEL_MAX` (100), unique (exact); count within `ENV_MIN_CHOICES`..`ENV_MAX_CHOICES` |
| `vote_count` | number | whole, at least 1 |
| `data_points` | array | non-empty |
| `data_points[].date` | string | `MM/DD/YY`, a real calendar date, unique across data points |
| `data_points[].choice_x` | number | a key among the top-level choice keys; not negative; a missing key is 0 |
| (per data point) | | the percentages add up to more than 0 |

Other keys are ignored.

## In-memory structures

- **PollData** (from `parsePollData`): `creatorEmail`, `title`, `choices: { key, label }[]` (key order), `voteCount`, `dataPoints: { date: Date, percentages: number[] }[]` (sorted ascending, one percentage per choice, 0 when missing).
- **Moved data points** (from `shiftDates(dataPoints, today)`): the same, with each `date` moved by `offsetDays = today − latest date` in local calendar days.
- **Plan of one data point**: `count = voteCountFor(voteCount, random)`; the voters are `1..count` in order; `perChoice = splitByShares(count, percentages)`; one `votedAt` per vote from `voteTimesFor(day, now, random)`.
- **Voters**: each data point's voters are numbered from 1; voter `n` is `test_<n>@crowdpolltest.test`, user name `test_<n>`, so the poll's voter count never exceeds the largest single data point's count.
- **Summary**: `pollId`, `outcome: "created" | "refreshed"`, `votesDeleted`, `votesWritten`, `final: { label, count, percent }[]`, `elapsedMs`, `notes: string[]`.

## Rows read and written

| Table | Read | Written | By |
|---|---|---|---|
| `user` | `id`, `userName` by `email` | — | the script |
| `polls` | `id`, `poll_state`, `choices` by `created_by_id` + `title`, newest `created_at` first, ties by `id` (the script backdates `created_at` to the first data point, so a poll created by hand later counts as newer) | insert (new) or update (rerun); `launched_at = start_at`; `vote_count`, `choice_counts`, `counts_version`, `last_vote_at` | `insertPoll`, `updatePoll`, the script, `reconcile` |
| `votes` | — | delete simulated voters' rows and dropped-choice rows; upsert one row per voter | the script, `writeBatch` |
| `vote_history` | — | delete simulated voters' rows; insert one row per vote, monthly partitions created as needed | the script, `writeBatch` |
| `user_polls` | — | `created` (new poll); delete simulated `voted`; upsert `voted` per voter | `insertPoll`, the script, `writeBatch` |
| `search_outbox` | — | `content` (rerun) and `counters` rows | `updatePoll`, `reconcile` |
| cache `cnt:<pid>` | — | total, seq, per-choice counts | `reconcile` |
| cache poll projection | — | refreshed | `insertPoll`, `updatePoll`, the script |

## Poll fields set by the script

| Field | New poll | Rerun |
|---|---|---|
| `title`, `choices` | from the file | from the file; ids kept by label (R5) |
| `subtitle`, `keywords` | `""` | `""` |
| `poll_visibility` / `poll_sharing_mode` / `vote_anonymity` | `Public Poll` / `Anyone With The Link` / `Yes` | same |
| `choice_mode` / `vote_mutability` | `Single-Choice Poll` / `Dynamic-Vote Poll` | same |
| `voter_count_limit`, `end_at` | null | null |
| `poll_state` | `OPEN` | `OPEN`; edit-session fields cleared |
| `start_at`, `launched_at` | earliest moved midnight | earliest moved midnight |
| `created_at` | earliest moved midnight | unchanged |
| `created_by_id`, `created_by_name` | creator's `id`, `userName` | unchanged |

## State transitions

A rerun takes the poll from any state to `OPEN` (warning when it was not `OPEN`).
A new poll starts in `OPEN`.
