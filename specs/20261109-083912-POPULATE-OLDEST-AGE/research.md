# Research: Populate Oldest Age

All decisions below were settled in `requirements/20261109-083912-populate-oldest-age/requirements-report.md`
(AM1–AM3, UA1–UA3); this file records how each maps onto `devScripts/populate/populate-poll.ts`.

## R1. Where the limit is read

- **Decision**: `parsePollData` reads an optional `oldest_age_in_days` key and returns it on `PollData` as
  `oldestAgeInDays: number | null` (`null` when the key is absent).
- **Rationale**: every other key of the data file is validated there, before `main()` opens the database, so an invalid
  value is refused before anything is written (FR-002) with no new code path. The TypeScript field follows the
  existing camel-case mapping (`vote_count` → `voteCount`).
- **Alternatives considered**: a command-line option (AM1 B; rejected: `populate-all-polls` would have to pass it on
  and its SHA-256 history would not notice a changed limit).

## R2. Validation

- **Decision**: present and not `Number.isInteger(value) && value >= 0` → `InputError`
  `"oldest_age_in_days" must be a whole number of at least 0, not ${JSON.stringify(value)}`.
  "Present" is `value !== undefined`, so an explicit `null` is refused.
- **Rationale**: the same shape and wording as the existing `vote_count` check;
  `JSON.stringify` shows `"30"` with its quotes, so a quoted number is recognisable in the error.
- **Alternatives considered**: treating `null` as absent (rejected by UA1: `null` is listed as invalid).

## R3. Filtering after the dates are moved

- **Decision**: a new exported pure function `keepRecent(points, today, oldestAgeInDays)` returns the points whose
  `calendarDay(date) >= calendarDay(today) - oldestAgeInDays`. `populatePoll` applies it to the result of
  `shiftDates(data.dataPoints, now)` when the limit is not `null`.
- **Rationale**: after `shiftDates` the latest point is today, so age is measured from the latest point (AM3);
  comparing `calendarDay` values (UTC-based day numbers of local dates, already used by `shiftDates`) is immune to
  daylight-saving hours, and keeps the boundary inclusive (UA1). The points are already sorted by `parsePollData`, so
  the filter keeps order and the latest point is always kept.
- **Alternatives considered**: filtering inside `shiftDates` (rejected: one function, one purpose);
  millisecond arithmetic (`DAY_MS * N`) (rejected: off by an hour across a daylight-saving change).

## R4. What follows the kept points

- **Decision**: `populatePoll` assigns the filtered list to the existing `points` variable, so `firstDay`, `lastDay`,
  the `startAt`/`launched_at`/`createdAt` values, the replay loop and the 12-month note all use the kept points with
  no further change (FR-004–FR-006).
- **Rationale**: the smallest change that satisfies UA2 (Constitution II, III).

## R5. The kept-points line

- **Decision**: when `points.length < shifted.length`, log
  `[populate] Kept ${grouped(kept)} of ${grouped(total)} data points (oldest_age_in_days ${N})` after the
  `Target:` line and before the first write.
- **Rationale**: FR-007; `grouped` is the script's existing thousands formatter. The line does not match the
  `Done:`, `Votes deleted:` or `Error|failed:` patterns that `populate-all-polls.ts` reads, so the folder command is
  unaffected (FR-009).

## R6. Reruns and the folder command

- **Decision**: no change. A rerun already deletes every earlier simulated vote, history row and `voted` relation of the
  poll before replaying (FR-008); `populate-all-polls.ts` already repopulates a file whose SHA-256 changed (FR-009).

## R7. Documentation and tests

- **Decision**: the key table of `devScripts/populate/README-populate-poll-and-seed-poll.md` (the populate README as
  it exists on disk) gains an `oldest_age_in_days` row and an example. `tests/populate-poll.test.ts` gains:
  `parsePollData` cases (absent → `null`, `0`, a valid number, each invalid value); `keepRecent` cases (inclusive
  boundary, `0`, larger than the span, across a daylight-saving change); a `populatePoll` case with a limit that drops
  points (votes only on kept days, `start_at` the first kept day, the kept-points line, no 12-month note), and one
  without the key (no kept-points line).
- **Rationale**: FR-010, FR-011. Renaming the README to fix its git-ignore debt is out of scope (spec Assumptions).
