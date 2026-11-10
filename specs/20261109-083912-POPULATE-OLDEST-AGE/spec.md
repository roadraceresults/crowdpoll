# Feature Specification: Populate Oldest Age

**Feature Branch**: `20261109-083912-POPULATE-OLDEST-AGE`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "requirements/20261109-083912-populate-oldest-age/requirements.md"

## User Scenarios & Testing *(mandatory)*

A developer fills a demonstration poll from a poll data file: the file's time series is replayed as simulated votes, with its dates moved so that the latest data point falls on today.
Some files span many years, so a run replays thousands of days, most of which the site's 12-month vote-history retention later removes anyway.
This feature lets a data file limit how far back its data is replayed.

### User Story 1 - Replay only the recent part of a long data file (Priority: P1)

The developer adds `"oldest_age_in_days": 30` to a poll data file and populates it.
Only the data points no older than 30 days (counted back from the latest point, which falls on today) are replayed;
the older points are ignored as if they were not in the file.

**Why this priority**: it is the feature: shorter runs, and a poll whose history covers only the period of interest.

**Independent Test**: populate a file of several years with the limit set to 30, and check that the poll's votes and history cover only today and the 30 days before it.

**Acceptance Scenarios**:

1. **Given** a data file spanning 3 years with `oldest_age_in_days` 30, **When** it is populated, **Then** only the points dated today through today − 30 days are replayed as votes, and the run reports how many points it kept out of how many.
2. **Given** the same file, **When** it is populated, **Then** the poll's start and launch dates (and, for a new poll, its creation date) are the first kept point's day, not the file's first point's day.
3. **Given** a poll populated earlier from the full file, **When** it is populated again with the limit, **Then** none of its earlier simulated votes older than the limit remain.
4. **Given** the kept span is 12 months or less, **When** the run finishes, **Then** it prints no note about vote history older than 12 months.
5. **Given** `oldest_age_in_days` 0, **When** the file is populated, **Then** only the latest point (today) is replayed.

---

### User Story 2 - Files without the limit behave as before (Priority: P1)

A data file without `oldest_age_in_days` is populated exactly as it is today: every data point is replayed.

**Why this priority**: every existing data file must keep working unchanged.

**Independent Test**: populate an existing data file with no limit and compare the votes, dates and output with the behaviour before the change.

**Acceptance Scenarios**:

1. **Given** a data file without `oldest_age_in_days`, **When** it is populated, **Then** every data point is replayed and no kept-points line is printed.
2. **Given** a limit larger than the file's span, **When** it is populated, **Then** every data point is replayed and no kept-points line is printed.

---

### User Story 3 - An invalid limit is refused before anything is written (Priority: P2)

A mistyped limit stops the run with one clear error line, before the database is touched, like every other input error of a data file.

**Why this priority**: a bad value must never half-populate a poll.

**Independent Test**: populate files with each invalid value and check the error line, the exit status and that the database is unchanged.

**Acceptance Scenarios**:

1. **Given** `oldest_age_in_days` is `-1`, `2.5`, `"30"` or `null`, **When** the file is populated, **Then** the run prints `[populate] Error: "oldest_age_in_days" must be a whole number of at least 0, not <value>`, exits with status 1, and writes nothing.

---

### User Story 4 - Folder runs pick up the limit (Priority: P3)

The developer adds or changes the limit in one file of a folder and populates the folder.
That file is populated again with its new limit; unchanged files are skipped as before.

**Why this priority**: it follows from the limit being part of the file, and needs no change to the folder command.

**Independent Test**: populate a folder, add the limit to one file, populate the folder again, and check that only that file is repopulated.

**Acceptance Scenarios**:

1. **Given** a folder already populated, **When** the limit is added to one file and the folder is populated again, **Then** only that file is repopulated, with the limit applied.

---

### Edge Cases

- A point exactly N days old is kept (the boundary is inclusive): N keeps up to N + 1 calendar days.
- The latest point is always kept, so the limit can never leave nothing to replay.
- A limit equal to or larger than the file's span keeps every point.
- Points are filtered after their dates are moved, so a file whose real data ended long ago still keeps its most recent N days.
- Data points out of date order in the file are filtered on their dates, not their positions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A poll data file MAY contain the key `oldest_age_in_days`; when it is absent, every data point MUST be replayed exactly as before this feature.
- **FR-002**: `oldest_age_in_days` MUST be a whole number of at least 0;
  any other value MUST stop the run with `[populate] Error: "oldest_age_in_days" must be a whole number of at least 0, not <value>` and exit status 1, before anything is written.
- **FR-003**: A data point's age MUST be measured after the dates are moved so that the latest point falls on today;
  a point MUST be kept when its moved date is no earlier than today minus `oldest_age_in_days` days.
- **FR-004**: Only the kept points MUST be replayed as simulated votes.
- **FR-005**: The poll's start and launch dates (and, for a newly created poll, its creation date) MUST be the first kept point's day.
- **FR-006**: The note about data spanning more than 12 months MUST be printed only when the kept points span more than 12 months.
- **FR-007**: When the limit removes at least one point, the run MUST print one line `[populate] Kept <kept> of <total> data points (oldest_age_in_days <N>)`, with counts grouped by thousands;
  when it removes none, no such line is printed.
- **FR-008**: Repopulating a poll MUST leave no earlier simulated votes from points outside the limit (the existing removal of a poll's earlier simulated votes continues to apply).
- **FR-009**: The folder command MUST NOT change; adding or changing the key in a file MUST cause that file to be repopulated on the folder's next run, because the file's contents changed.
- **FR-010**: The populate README MUST document `oldest_age_in_days` in its key table, with an example.
- **FR-011**: The automated tests MUST cover: the key absent, a limit that drops points (votes, start date, the kept-points line), `0`, a limit larger than the span, and each invalid value of FR-002.

### Key Entities

- **Poll data file**: the JSON description of one demonstration poll (creator, title, subtitle, choices, votes per point, dated data points); gains the optional `oldest_age_in_days`.
- **Data point**: one day's percentages per choice; kept or ignored according to its age after the dates are moved.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With `oldest_age_in_days` 30, a multi-year data file replays at most N + 1 (31) data points, and writes votes only for them.
- **SC-002**: Every existing data file without the key produces the same number of replayed points and the same poll dates as before the change.
- **SC-003**: Each invalid value of FR-002 is refused with the single error line, and the database is unchanged afterwards.
- **SC-004**: After adding the key to one file of an already populated folder, the folder's next run repopulates exactly that one file.

## Assumptions

- The key name is `oldest_age_in_days`, in snake case like the file's other keys; it replaces the name `oldestAgeInDays` of the first draft of the requirements.
- "Today" is the local calendar day of the run, the same day the script already moves the latest point to.
- Only the single-file populate script and its README and tests change; the server, the database schema, the retention sweep, the load-test seeding script and the existing data files do not.
- Fixing the README's unrelated technical debt (its git-ignored file name and stale length limits) is out of scope, as the requirements report records it only as debt.
