# Feature Specification: Populate Test Poll

**Feature Branch**: `populatepoll` (no dedicated branch created for this feature)

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "requirements/20261026-152737-populate-test-poll/requirements.md"

**Source requirements**: `requirements/20261026-152737-populate-test-poll/requirements.md` (the requirements, with every finding of the review folded in under Clarifications).
**Requirements report**: `requirements/20261026-152737-populate-test-poll/requirements-report.md` (4 diagrams and 20 findings, all resolved).
**Example input**: `polldata/trump_approval_rating_over_time.json` (git-ignored; 2 choices, `vote_count` 123456, 119 data points from 02/07/25 to 10/21/26).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A developer creates a poll that replays a time series (Priority: P1)

A developer has a JSON file describing a poll: its creator's email, its title, its choices (`choice_a`, `choice_b`, …), a nominal vote count, and a list of dated data points, each giving a percentage per choice.
They run the populate script with that file as its only argument.
The script creates a public, open, single-choice, dynamic-vote poll owned by that creator, shifts the data points' dates so the latest one is today, and casts simulated votes for every data point, so the poll looks as if people had been voting on it over that whole period.
On the home page, the poll's bars end close to the latest data point's percentages.

**Why this priority**: It is the feature: a realistic, well-populated poll for testing the cards, tabs, search and load, made in one command.

**Independent Test**: With an empty test database and an existing creator account, run the script on a two-choice fixture with three data points and a vote count of 100; the summary reports a created poll, about 300 votes written, and final percentages close to the last data point's; the poll appears on the home page as open, public and owned by the creator.

**Acceptance Scenarios**:

1. **Given** a valid file whose creator exists and who owns no poll with that title, **When** the script runs, **Then** one new poll is created with the file's title and choices, in the order of their keys, as Public, Open, Single-Choice, Dynamic-Vote, anonymous, with no end date and an empty subtitle, owned by the creator.
2. **Given** data points whose latest date is D, **When** the script runs on day T, **Then** every data point's votes fall on its date moved by T − D days, the intervals between data points are unchanged, and the poll's start date is midnight of the earliest moved date.
3. **Given** a data point with percentages 48 and 49 and a vote count of 100, **When** its votes are cast, **Then** between 85 and 115 votes are cast for it, all going to a choice, split 48 : 49 (rounded so the parts add up to the count).
4. **Given** the script has finished, **When** the poll card is opened, **Then** its totals and percentages match the votes written, without restarting anything when a shared cache is configured.
5. **Given** a choice that has 0% in every data point, **When** the script runs, **Then** that choice is still on the poll, with no votes.

---

### User Story 2 - A developer reruns the script to refresh the same poll (Priority: P2)

The same file is run again, on a later day or after editing it.
Instead of making a second poll, the script finds the creator's poll with that title, removes the earlier simulated votes, brings the poll back in line with the file, and casts a fresh set of votes dated relative to the new "today".
The poll keeps its identity, so links, bookmarks and Watching still work.

**Why this priority**: Test data goes stale daily (its dates are relative to today); rerunning must be safe and must not pile up duplicate votes.

**Independent Test**: Run the script twice on the same fixture; the poll count for that creator and title stays one, the poll id is unchanged, and the number of simulated votes after the second run equals the second run's "votes written", not the sum of both runs.

**Acceptance Scenarios**:

1. **Given** the creator already owns a poll with the file's title, **When** the script runs, **Then** no new poll is created and the existing poll's id is kept.
2. **Given** that poll holds earlier simulated votes and their history, **When** the script runs, **Then** all of the simulated voters' current votes, vote history and "voted" links for that poll are removed before new votes are cast, and votes from real voters are not touched.
3. **Given** the file's choices changed since the last run, **When** the script runs, **Then** a choice whose label is still present keeps its identity and takes its new position, a new label becomes a new choice, and a dropped choice is removed together with every vote cast for it.
4. **Given** the poll had been closed or was being edited, **When** the script runs, **Then** it is open again, any edit session is cleared, and a warning says so.
5. **Given** the rerun happens on a later day, **When** it finishes, **Then** the poll's start and launch dates are those of the new earliest moved date, and its creation date is unchanged.

---

### User Story 3 - A developer is told clearly when the input or target is wrong (Priority: P3)

When the file is wrong or the creator does not exist, the script says exactly what is wrong in one line and stops before changing anything.
While it runs, it shows where it is writing and how far it has got, and it ends with a summary the developer can check against the file.

**Why this priority**: A test tool that half-builds a poll from a bad file, or writes to the wrong database unannounced, costs more time than it saves.

**Independent Test**: Run the script with no argument, with two arguments, with a file whose creator does not exist, and with a file whose data point percentages are all zero; each prints a one-line error, exits with code 1, and leaves the database unchanged.

**Acceptance Scenarios**:

1. **Given** any error listed in FR-018, **When** the script runs, **Then** it prints one line naming the problem, exits with code 1, and writes nothing.
2. **Given** a valid run, **When** it starts, **Then** its first output names the target site origin and database host.
3. **Given** a valid run, **When** each data point is written, **Then** one progress line shows that data point's moved date, the votes cast for it and the running total.
4. **Given** a valid run, **When** it finishes, **Then** the summary shows the poll id, whether it was created or refreshed, votes deleted, votes written, the final count and percentage per choice, and the elapsed time.

---

### Edge Cases

- The data points are not in date order in the file: they are sorted by date before anything else.
- Two data points share a date, or a date is not `MM/DD/YY`: the script stops with an error (FR-018).
- A data point omits a choice: that choice counts as 0% for it.
- A data point names a choice key the poll does not have: the script stops with an error.
- The percentages do not add up to 100 (e.g. 48 + 49 = 97): they are scaled to their sum, so every vote goes to a choice.
- Today's data point: its votes are spread across today but never later than the moment the script runs.
- The data span more than 12 months: the full history is written, and a note warns that the daily retention sweep will drop the part older than 12 months; the poll's current results are unaffected.
- The creator owns several polls with the same title: the newest is used, with a warning.
- No shared cache is configured (development): the summary tells the developer to restart the server so it shows the new counts.
- The target is a production database: the script runs (the developer's responsibility) after printing the target.
- The run is interrupted part way: rerunning it repairs the poll, because the rerun first removes all simulated votes.

## Requirements *(mandatory)*

### Functional Requirements

**Invocation and target**

- **FR-001**: The script MUST take exactly one command-line argument, the path of the poll data file, and MUST be run from the project with the same environment settings as the server.
- **FR-002**: Before writing anything, the script MUST print the target site origin and database host; it MUST NOT refuse any target.

**Reading the file**

- **FR-003**: The script MUST read the creator email (`poll creator email`), `title`, choice labels (`choice_a`, `choice_b`, … `choice_z`, then `choice_aa`, `choice_ab`, …), `vote_count` and `data_points` from the file.
- **FR-004**: The script MUST sort the data points ascending by date, reading `MM/DD/YY` as 20YY.
- **FR-005**: The script MUST move every date by the whole number of days between the latest date and today's local date, so the latest data point falls on today and the intervals are kept.

**Finding or creating the poll**

- **FR-006**: The script MUST look up the user whose email equals the creator email exactly; the poll's creator id and creator name MUST be that user's id and user name. The creator's email MUST NOT be stored on the poll (it is read from the user, as today).
- **FR-007**: The script MUST look for a poll with that creator and exactly that title (case included); when several match, it MUST use the newest (latest creation date, ties broken by poll id) and warn; because the script backdates a poll's creation date to its first data point, a poll created by hand later always counts as newer, which the warning makes visible.
- **FR-008**: With no matching poll, the script MUST create one with: the file's title and choices (new identities, positions in key order); Public visibility; sharing "Anyone With The Link"; state Open; anonymous votes; Single-Choice; Dynamic-Vote; no voter limit; no keywords; an empty subtitle; no end date; start, launch and creation dates all equal to midnight of the earliest moved date. It MUST be created through the application's own poll-creation path, so its creator link and cached copy are written.
- **FR-009**: With a matching poll, the script MUST keep its identity and refresh it from the file through the application's own poll-update path: the settings in FR-008, its choices (FR-010) and its start date, state Open, with any edit session cleared; then set its launch date to its start date; its creation date MUST stay unchanged. It MUST warn when the poll was not Open before.
- **FR-010**: On a rerun, choices MUST be matched to the file's by exact label: a kept label keeps its identity and takes its new position, a new label gets a new identity, and every vote (simulated or real) cast for a dropped choice MUST be deleted.

**Removing earlier simulated votes**

- **FR-011**: On a rerun, before casting votes, the script MUST delete, for that poll only, the simulated voters' current votes, vote history and "voted" links, matching addresses of the form `test_…@crowdpolltest.test` literally (the `_` is not a wildcard).

**Casting the votes**

- **FR-012**: Simulated voters MUST be addressed `test_<n>@crowdpolltest.test` with the name `test_<n>`, `n` counting from 1; no accounts are created for them.
- **FR-013**: Each data point's voters MUST be numbered sequentially from 1, so every data point reuses the same addresses and the poll's voter count never exceeds the largest single data point's vote count.
- **FR-014**: For each data point, the number of votes MUST be `vote_count` multiplied by a uniform random factor between 0.85 and 1.15, rounded to a whole number (no fixed seed); the voters are `test_1` through `test_<count>`.
- **FR-015**: Each data point's votes MUST be split between the choices in proportion to its percentages scaled to their sum, rounded by largest remainder so the parts add up to the data point's vote count; a choice the data point omits counts as 0%.
- **FR-016**: Each vote MUST be timed at a random moment within its data point's moved day, never later than the moment the script runs; data points MUST be written oldest first, so a voter's latest vote is their current one.
- **FR-017**: Votes MUST be written through the application's own batch vote-writing path, which records the current vote, the vote history (creating any month's history partition it needs) and the voter's "voted" link, as real votes do. Afterwards the poll's counters MUST be recomputed from its votes, in the shared cache and on the poll, which also queues the poll for the search index; this MUST happen even when no votes were written.

**Validation and errors**

- **FR-018**: The script MUST stop with a one-line error and exit code 1, before writing anything, when: there is no argument or more than one; the file cannot be read or is not valid JSON; the creator email or title is missing or empty; the title is longer than the application's title limit (50); a choice label is empty, longer than the application's label limit (100), or equal to another label; there are fewer choices than the minimum or more than the maximum the application allows; `vote_count` is not a whole number of at least 1; `data_points` is missing or empty; a date is not `MM/DD/YY`; two data points share a date; a data point names a choice key the poll does not have; a percentage is not a number or is negative; a data point's percentages add up to 0; no user has the creator email.

**Output**

- **FR-019**: The script MUST print one progress line per data point: its moved date, the votes cast for it and the running total.
- **FR-020**: The script MUST end with a summary: the poll id; created or refreshed; votes deleted; votes written; the final count and percentage per choice; the elapsed time; a note when the data span more than 12 months (FR-021); a note to restart the server when no shared cache is configured. It MUST exit with code 0. There is no time limit.
- **FR-021**: The script MUST write the full history and MUST NOT change the vote-history retention period.

**Delivery and tests**

- **FR-022**: The script MUST live beside the existing seeding script, be tracked in version control despite the folder's ignore rule, be documented in that folder's README, and run its main routine only when started directly.
- **FR-023**: The date shift, count spread and share rounding MUST be separately testable, and automated tests MUST cover them and a full run (create, then rerun) on the test database with a small committed fixture; the git-ignored example file MUST NOT be needed by any test.

### Key Entities *(include if feature involves data)*

- **Poll data file**: one poll's description: creator email, title, ordered choice labels, nominal vote count, and dated data points, each with a percentage per choice.
- **Data point**: a date (moved relative to today) and the share of the vote each choice had on it.
- **Creator**: an existing user, found by email, who owns the poll.
- **Poll**: the public, open, single-choice, dynamic-vote poll the script creates or refreshes; identified by creator and title.
- **Simulated voter**: one of the `test_<n>@crowdpolltest.test` addresses (numbered from 1 for every data point) with no account; each holds one current vote on the poll and a history of every vote they cast.
- **Vote**: a voter's choice at a moment in time; the latest per voter is current and counts toward the results, every one is kept in the history.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer populates a poll from a valid file with one command and no other manual step (besides a server restart when no shared cache is configured).
- **SC-002**: For every data point, the number of votes cast is within ±15% of the file's vote count, and each choice's share of that data point's votes differs from its scaled percentage by less than one vote.
- **SC-003**: After a run on the example file, each choice's final percentage on the poll card is within 3 percentage points of the latest data point's scaled percentage (a file whose percentages swing sharply at its last data point may end further away, because the voters not drawn on it keep older votes).
- **SC-004**: Running the script twice on the same file leaves exactly one poll for that creator and title, with the same identity, and a number of simulated votes equal to the second run's votes written.
- **SC-005**: Every invalid input listed in FR-018 is reported in one line and leaves the database unchanged (100% of the listed cases, checked by tests).
- **SC-006**: No real (non-simulated) vote on the poll is changed by a rerun, except votes for a choice dropped from the file.
- **SC-007**: The poll's totals and percentages shown to visitors equal the votes written, immediately after the run when a shared cache is configured.

## Assumptions

- The script is a developer and test tool; it changes no route, page, setting, stored structure or dependency of the application.
- The poll is created directly as Open, without the publish flow or acceptability screening, as the existing seeding script does.
- The creator's account already exists; the script never creates accounts.
- Simulated voters need no accounts: the batch vote-writing path does not require them, and the poll is anonymous, so their names are never shown.
- The run is not a single transaction; an interrupted run is repaired by rerunning, which first removes every simulated vote.
- With the example file (about 14.7 million votes), a run takes minutes; the rerun's history delete scans the whole history because it has no index by poll, which is accepted for a test database; no index is added.
- The example file lives in the git-ignored `polldata/` folder and stays there.
- Nothing in the application displays vote history today; the 12-month retention only affects history, not the poll's current results.
