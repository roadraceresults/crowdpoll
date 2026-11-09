# Data Model: Populate Oldest Age

No migration and no database change. The only data that changes is the poll data file and its parsed form.

## Poll data file (JSON)

| Key | Type | Required | Rule |
|---|---|---|---|
| `oldest_age_in_days` | number | no (new) | a whole number ≥ 0; absent = every data point is replayed |

Every other key (`poll_creator_email`, `title`, `subtitle`, `choice_*`, `vote_count`, `data_points`) is unchanged.

## `PollData` (parsed, in `populate-poll.ts`)

| Field | Type | From |
|---|---|---|
| `oldestAgeInDays` | `number \| null` (new) | `oldest_age_in_days`, `null` when absent |

## Data point: kept or ignored

After `shiftDates` moves the latest point to today:

- **kept** when `calendarDay(date) ≥ calendarDay(today) − oldestAgeInDays`, or when `oldestAgeInDays` is `null`;
- **ignored** otherwise: it is not replayed, and it plays no part in the poll's dates or the 12-month note.

The latest point is always kept, so at least one point is replayed.
