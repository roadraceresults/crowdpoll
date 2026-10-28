# CLI Contract: populate-poll

## C1. Invocation

```
npx tsx devScripts/populate/populate-poll.ts <poll-data.json>
```

- Exactly one argument, a path (relative paths resolve from the current directory).
- Environment: the server's `ENV_*` variables (`loadConfig`); `ENV_VALKEY_URL` decides whether the shared cache is used.
- No flags. The database must already be migrated.

## C2. Exit codes

| Code | Meaning |
|---|---|
| 0 | the poll was created or refreshed and populated |
| 1 | an input error (C4) before any write, or an unexpected failure (`[populate] failed: <message>`) |

## C3. Output (standard output, in order)

```
[populate] Target: http://localhost:8080 (database localhost:5432)
[populate] Warning: 2 polls match "Trump Approval Rating" for devadmin01@crowdpoll.vote; using the newest, <pid>
[populate] Removed 141,972 earlier test vote(s)
[populate] Warning: poll <pid> was CLOSED; it is OPEN again
[populate] 2025-02-12  votes 118,204  total 118,204
[populate] 2025-02-23  votes 131,877  total 250,081
...
[populate] Done: poll <pid> refreshed
[populate]   Votes deleted: 141,972   Votes written: 14,702,113
[populate]   Approve: 47,102 (33.6%)
[populate]   Disapprove: 93,011 (66.4%)
[populate]   Elapsed: 11m 42s
[populate] Note: the data span 20 months; vote history older than 12 months is removed by the daily retention sweep
[populate] Note: no shared cache is configured (ENV_VALKEY_URL); restart the server to see the new counts
```

- The target line is always first; the database part is the URL's host only, never its credentials.
- Lines appear in run order: the several-match warning, then "Removed", then the was-CLOSED warning (the poll is reopened after the earlier test votes are removed).
- Warnings appear only when they apply; "Removed" only on a rerun.
- One progress line per data point: its moved date (`YYYY-MM-DD`), its votes, the running total.
- The two notes appear only when they apply.
- Numbers use the `en-US` grouping shown; the wording above is indicative, the fields are fixed.

## C4. Input errors (one line, `[populate] Error: <message>`, exit 1, nothing written)

| Case | Message names |
|---|---|
| no argument / more than one | the usage line |
| file unreadable / not JSON | the path and the parser's reason |
| `poll creator email` or `title` missing or empty | the key |
| title longer than 50 | the limit |
| choice label empty, longer than 100, or duplicated | the key(s) |
| fewer than `ENV_MIN_CHOICES` / more than `ENV_MAX_CHOICES` choices | the count and the bound |
| `vote_count` not a whole number ≥ 1 | the value |
| `data_points` missing or empty | the key |
| date not `MM/DD/YY` or not a calendar date | the data point's index and value |
| two data points with the same date | the date |
| data point key not among the choices | the index and key |
| percentage not a number or negative | the index and key |
| data point percentages add up to 0 | the index and date |
| no user with the creator email | the email |

Every error but the last is raised before `populatePoll` runs, so it is the only line printed. The unknown-creator error is raised inside `populatePoll`, after the target line, so that run prints two lines: the target, then the error.

## C5. Exported functions (for tests)

| Function | Contract |
|---|---|
| `parsePollData(json: unknown, bounds: { minChoices, maxChoices }): PollData` | validates per C4 (except the user lookup); throws `InputError` |
| `shiftDates(points, today: Date)` | moves each date by the local-calendar day offset that puts the latest on `today` |
| `voteCountFor(base, random)` | `round(base × (0.85 + 0.3 × random()))` |
| `splitByShares(count, percentages)` | non-negative integers summing to `count`, largest remainder |
| `voteTimesFor(day, now, random)` | a function returning a time in `[day, min(next day, now))` |
| `readArguments(argv: string[]): string` | exactly one argument, returned; otherwise throws `InputError` carrying the usage line |
| `matchChoices(existing: Choice[], labels: string[])` | `{ choices, droppedIds }`: an existing choice's id is kept when its label is exactly the same, else a new id; positions in key order; `droppedIds` are the existing ids not kept |
| `populatePoll(deps: { db, cache, config }, data: PollData, options?: { now?, random?, log? }): Promise<Summary>` | the whole run after parsing; throws `InputError` for an unknown creator |
