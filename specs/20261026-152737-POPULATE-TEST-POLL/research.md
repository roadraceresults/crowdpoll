# Research: Populate Test Poll

**Feature**: [spec.md](./spec.md) · **Requirements**: `requirements/20261026-152737-populate-test-poll/requirements.md` (findings IN1–NC2, UA9–UA13)

Every decision below was checked against the code it reuses.

## R1. One script, beside the seed script, with pure functions exported

- **Decision**: `devScripts/populate/populate-poll.ts`, run as `npx tsx devScripts/populate/populate-poll.ts <file.json>`.
  It exports the pure steps (`parsePollData`, `shiftDates`, `voteCountFor`, `splitByShares`, `voteTimesFor`) and one orchestrator, `populatePoll(deps, data, options)`, which takes `{ db, cache, config }` so tests pass the harness's own.
  `main()` runs only when the file is the entry point, with the guard `devScripts/file-manifest.ts` uses (`process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href`).
- **Rationale**: Spec FR-022/FR-023; `seed-polls.ts` is the precedent for location and imports, `file-manifest.ts` for an importable, testable script.
- **Alternatives considered**: an `npm run` script (rejected: the requirements fix the command line; `npm run` would also need `--` before the argument); a module under `src/` (rejected: no server code changes).

## R2. Configuration and connections: the server's, without migrating

- **Decision**: `loadConfig()` from `src/config.ts` (it already demands `ENV_DATABASE_URL`, `ENV_PUBLIC_ORIGIN`, `ENV_BETTER_AUTH_SECRET`, …), `createDb(config.databaseUrl, { caCert: config.databaseCaCert })` and `createCache(config)`, as `devScripts/reconcile.ts` does.
  The script does **not** run migrations.
- **Rationale**: `createCache` picks Valkey when `ENV_VALKEY_URL` is set, so `reconcile` reaches the server's live counters (FR-017, SC-007).
  Unlike `seed-polls.ts`, this script may target any database (NC2), and migrating a shared database from a developer's machine is not its job; a creator account already requires a migrated database.
- **Alternatives considered**: `migrateToLatest` first, as the seed does (rejected for the reason above).

## R3. Creating the poll: `createDefaultPoll` + `insertPoll`

- **Decision**: build the `Poll` from `createDefaultPoll(now)` (`src/polls/service.ts`) and override `title`, `subtitle: ""`, `choices`, `pollState: "OPEN"`, `startAt`, `createdAt` (both the earliest moved midnight), `endAt: null`; then `insertPoll({ db, cache }, poll, { id, name, email })`.
- **Rationale**: the defaults already are `Public Poll`, `Anyone With The Link`, `Yes`, `Single-Choice Poll`, `Dynamic-Vote Poll`, `keywords: ""`, `voterCountLimit: null` (UA1).
  `newRow` sets `launched_at = startAt` for an OPEN poll, and `insertPoll` writes the `created` relation and the projection (UA13).
  `PollCreator.email` is used only for the `created` relation; `polls` has no email column.
- **Alternatives considered**: inserting a row by hand as `seed-polls.ts` does (rejected: it skips the relation and projection, TD2).

## R4. Refreshing on a rerun: `updatePoll`, then `launched_at` directly

- **Decision**: `updatePoll(deps, pid, $set)` with `title`, `subtitle`, the six setting fields, `voterCountLimit: null`, `keywords: ""`, `endAt: null`, `startAt`, `choices`, `pollState: "OPEN"`, `pollStateBeforeEditUpdate: null`, `pollEditUpdateHeartbeatTimestamp: null`, `pollEditUpdateClientGUID: null`.
  Then `update polls set launched_at = start_at` for that poll and `refreshProjection(cache, row)`.
  A warning is printed when the poll's state before was not `OPEN`.
- **Rationale**: `updatePoll` bumps `content_version` (queuing a `content` outbox row and refreshing the projection) because the `$set` holds content fields.
  It stamps `launched_at = now()` only when the state *enters* OPEN, and `launchedAt` is not in `FIELD_TO_COLUMN`, so the launch date must be written directly afterwards (UA10).
  `createdAt` is left out of `$set`, so the creation date is unchanged.
- **Alternatives considered**: deleting and re-creating the poll (rejected: new id breaks links and bookmarks, IN2).

## R5. Matching choices on a rerun

- **Decision**: for each file label, in key order, reuse the id of the existing choice with exactly that label, else `randomUUID()`; positions are 0, 1, ….
  Dropped ids are the existing ids not reused; before `reconcile`, delete `votes` rows of the poll whose `choice_ids && <dropped ids>` (array overlap).
- **Rationale**: UA9.
  `reconcile` counts `unnest(choice_ids)` from `votes`, so an orphaned id would otherwise appear in `choice_counts`.
  Duplicate labels are already rejected by validation (UA12), so the match is unambiguous.

## R6. Removing the earlier simulated votes

- **Decision**: three deletes for the poll, each `where poll_id = $pid and email like 'test\_%@crowdpolltest.test' escape '\'`: `votes`, `vote_history`, `user_polls` (`relation = 'voted'`).
  Their row counts are summed into "votes deleted" (the `votes` count is reported).
- **Rationale**: FR-011 / UA3; `escape` makes `_` literal.
  `vote_history` has no `poll_id` index (key `id, voted_at`), so its delete scans every partition; accepted (UA11, no migration).
  `user_polls` has an index on `poll_id`.

## R7. Writing votes: `writeBatch`, oldest data point first

- **Decision**: per data point, build its votes and pass them to `writeBatch(db, batch)` (`src/votes/consumer.ts`) in slices of 5,000 (1,000 until TWEAK03), data points in date order.
  Each vote is `{ pid, email, userName, choiceIds: [choiceId], votedAt, voteMutability: "Dynamic-Vote Poll" }`; the type is `Parameters<typeof writeBatch>[1][number]`, so the unexported `QueuedVote` is not restated and the consumer is not edited.
- **Rationale**: `writeBatch` upserts `votes` (a Dynamic-Vote vote replaces an older one only when its `voted_at` is not earlier), inserts `vote_history`, ensures each month's partition, upserts `user_polls` `voted` and sets `ever_voted` (FR-017).
  Writing oldest first, and every vote of one data point being on an earlier day than the next one's, makes a voter's latest vote their current one (FR-016).
  Slices of 5,000 keep each statement well under PostgreSQL's 65,535-parameter limit (5 per row, so about 13,000 is the ceiling).
  Only one data point's votes (about 142,000 at most for the example) are in memory at a time.
- **Alternatives considered**: enqueuing on the vote stream for the server's consumer (rejected: needs the server running, and the stream path drops votes from addresses without accounts via `withoutDeletedAccounts`).

## R8. Counters and search: `reconcile`, always

- **Decision**: after all writes, `reconcile({ db, cache }, [pid])` (`src/polls/counters.ts`), even when nothing was written; then read `vote_count` and `choice_counts` from the poll row for the summary.
- **Rationale**: `reconcile` recomputes from `votes`, writes `cnt:<pid>` in the cache and the row, and queues a `counters` row in `search_outbox`; `drainOutbox` indexes the whole poll for any queued row (UA13).
  Without `ENV_VALKEY_URL` the running server's counters live in its own memory, hence the restart note (UA4).

## R9. Dates, counts and shares

- **Decision**:
  - `MM/DD/YY` → `new Date(2000 + YY, MM − 1, DD)` (local midnight), rejected unless the result's fields round-trip (so `02/30/25` fails).
  - The offset in days is computed from local calendar dates (`Date.UTC(y, m, d)` difference / 86,400,000) so a daylight-saving change does not shift a day; each moved date is `new Date(y, m, d + offset)`.
  - `voteCountFor(base, random) = Math.round(base × (0.85 + 0.3 × random()))`.
  - `splitByShares(count, percentages)`: exact share `count × p / sum`, floor each, give the remaining votes one each to the largest fractional parts (ties by key order).
  - Each data point's voters are `1..count` in order (TWEAK01 replaced the earlier random pick from a `ceil(1.15 × vote_count)` pool), so every data point reuses the same addresses.
  - A vote's time is `dayStart + random() × (min(nextMidnight, now) − dayStart)`.
  - `random` is injected (default `Math.random`), so tests are deterministic without a fixed seed in production (AM2).
- **Rationale**: AM2, AM3, UA2, NC1; pure functions for FR-023.

## R10. Validation before any write

- **Decision**: `parsePollData(json, { minChoices, maxChoices })` returns the validated data or throws an `InputError` with one message; the creator lookup and the poll lookup follow, and only then does anything write.
  Choice keys are the top-level keys matching `^choice_[a-z]+$`, ordered by length then alphabetically (`choice_a` … `choice_z`, `choice_aa`, …).
  Limits come from `TITLE_MAX` and `CHOICE_LABEL_MAX` (`src/polls/service.ts`) and `config.minChoices` / `config.maxChoices`.
  `main()` prints `InputError` messages as one line and exits 1; any other error prints `[populate] failed: …` and exits 1.
- **Rationale**: FR-018 / UA6 / UA12; constitution V (fail safely, log informatively).

## R11. Output

- **Decision**: lines prefixed `[populate]`, as `[seed]` and `[reconcile]` are: target first (`ENV_PUBLIC_ORIGIN`, the database host from `new URL(config.databaseUrl).host`), warnings, one line per data point, then the summary (contract C3).
- **Rationale**: FR-002, FR-019, FR-020; constitution V (server-side logging is informative).
  Only the host is printed, never the URL's credentials.

## R12. Tests and fixture

- **Decision**: `tests/populate-poll.test.ts` imports the exported functions; unit cases cover R9 and R10; integration cases use `startTestContext()` (its `db`, `cache`, `config`) with a committed fixture `tests/fixtures/populate-poll.json` (two choices, three data points, `vote_count` 100), a user inserted directly, and an injected `now` and `random`.
  They check create, rerun (one poll, same id, simulated votes = second run's written), a changed choice list, a closed poll reopened, real votes untouched, and the counters in the cache and the row.
- **Rationale**: FR-023, SC-002 to SC-007; the example in `polldata/` is git-ignored (TD3).
  `.gitignore` gains `!devScripts/populate/populate-poll.ts` (it ignores `devScripts/populate/*` except named files).
