# Feature Specification: Extract All Poll Data

**Feature Branch**: `20261112-152622-EXTRACT-ALL-POLLDATA`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "requirements/20261112-152622-extract-all-polldata/requirements.md": give the general
extraction command the same folder-wide convenience the populate side already has. A new command,
`extract-all-polldata`, extracts every configuration file of a folder (default `./polldata`) that has not been
processed yet, as `populate-all-polls` does for poll data files.

## User Scenarios & Testing *(mandatory)*

The user is a developer of CrowdPoll who fills a development database with demonstration polls. The `polldata` folder
holds, for each poll, a configuration file, the saved poll page, an optional price history and the extracted poll data
file. Today the developer extracts each configuration with its own command, then populates the whole folder with one
`populate-all-polls` command. After this feature, extraction is also one command for the whole folder, and both
commands only work on what is new or changed.

### User Story 1 - Extract every new configuration of the folder with one command (Priority: P1)

The developer adds a few saved pages and their configuration files to `polldata`, runs the folder-wide extraction
command with no argument, and gets a poll data file for each, then runs `populate-all-polls`.

**Why this priority**: This is the convenience the feature exists for; without it nothing else matters.

**Independent Test**: In a folder with three configuration files never processed, run the command; each poll data file
is written exactly as the single-configuration extraction command writes it, and the run reports 3 extracted.

**Acceptance Scenarios**:

1. **Given** a folder holding configuration files never processed, **When** the developer runs the command with that
   folder, **Then** each configuration is extracted in name order and each output is byte-identical to what the
   single-configuration command writes for it.
2. **Given** no argument, **When** the developer runs the command, **Then** the project's own `polldata` folder is used,
   wherever the command was typed.
3. **Given** a relative folder argument, **When** the command runs, **Then** it is resolved from the folder the command
   was typed in.
4. **Given** a successful run, **When** it ends, **Then** it prints one summary line with the numbers extracted, skipped
   and failed, and ends with a success status.

---

### User Story 2 - Skip what was already extracted, redo what changed (Priority: P2)

The developer runs the command again after adding one page, or after saving one page again with fresher data. Only the
new or changed configurations are extracted; the others are reported as skipped.

**Why this priority**: Re-running the whole folder after each new page would be slow and noisy; skipping is what makes
the command safe to run at any time.

**Independent Test**: Run the command twice on the same folder: the second run extracts nothing and skips every
configuration. Then change one saved page and run again: only that configuration is extracted.

**Acceptance Scenarios**:

1. **Given** a configuration extracted by an earlier run and unchanged since, **When** the command runs, **Then** it is
   skipped with a line naming it and the time it was extracted.
2. **Given** a configuration whose configuration file, saved page or price history changed since it was extracted,
   **When** the command runs, **Then** it is extracted again.
3. **Given** a recorded configuration whose history entry the developer removed (or the whole history deleted), **When** the
   command runs, **Then** it is extracted again.
4. **Given** a configuration extracted on its own with the single-configuration command, **When** the folder-wide
   command runs, **Then** that single run has left no history entry, so the configuration is extracted (again) by the
   folder-wide run.

---

### User Story 3 - One bad configuration does not stop the others (Priority: P3)

The folder holds a configuration that cannot be extracted (a page with no recognizable graph, an unknown setting). The
command reports it, extracts all the others, and lists every failure again at the end.

**Why this priority**: Known pages in `polldata` already fail; without this the command would be unusable on that
folder, but it builds on Stories 1 and 2.

**Independent Test**: In a folder with two good configurations and one bad one, run the command: two poll data files are
written, the bad one is reported twice (where it failed and in the final list), and the run ends with a failure status.

**Acceptance Scenarios**:

1. **Given** a configuration that fails, **When** the command runs, **Then** the single-configuration command's own error
   is shown, followed by a line naming the file and the message, and the next configuration is processed.
2. **Given** a run with failures, **When** it ends, **Then** every failed file is listed again with its message and the
   run ends with a failure status.
3. **Given** a configuration that fails after an earlier success, **When** the command runs, **Then** its earlier history entry
   is kept, so it is tried again on every run until it succeeds.

---

### Edge Cases

- No configuration file in the folder: the command says so and ends with a success status.
- The folder (given or default) does not exist or cannot be read: one error line, nothing extracted, failure status.
- Two or more arguments: one error line giving the usage `npm run extract-all-polldata [<directory>]`, failure status.
- The extraction history exists but cannot be read: one error line before anything is extracted,
  failure status.
- The run is interrupted part way: every configuration finished before the interruption stays recorded.
- Configuration files ending in `.yml` or with upper-case extensions are taken; files in subfolders are not.
- A `.yaml` file that is not an extraction configuration fails like any other bad configuration.
- Two folders holding a configuration of the same name are recorded separately.
- A configuration whose output poll data file was deleted by hand, with unchanged inputs, is skipped until its history entry is
  removed or it is extracted on its own.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The developer MUST be able to run `npm run extract-all-polldata [<directory>]`; the only argument is the
  optional folder, which defaults to the project root's `polldata`.
- **FR-002**: A relative folder MUST be resolved from the folder the command was typed in.
- **FR-003**: The configurations MUST be the files directly in the folder whose name ends in `.yaml` or `.yml` (any
  letter case), processed in name order; subfolders MUST NOT be searched.
- **FR-004**: Each configuration MUST be extracted exactly as the single-configuration command `npm run extract-all
  <configuration>` extracts it: the same output file contents, the same messages and the same success or failure.
- **FR-005**: The command MUST keep a history of the configurations it extracted: for each, its folder, its name, one
  fingerprint of the contents of the configuration, its saved page and its price history (when it names one), its output
  file and the time it was extracted.
- **FR-006**: A configuration MUST be skipped, with a line naming it and its extraction time, when the history holds an
  entry for the same folder and name with the same fingerprint; otherwise it MUST be extracted.
- **FR-007**: The history MUST be saved after each configuration that succeeds, so an interrupted run keeps what it
  finished; a missing history MUST be treated as empty, and an unreadable one MUST stop the run before any extraction.
- **FR-008**: The history MUST be kept in a single file inside the extraction scripts' folder that is never committed to
  the repository.
- **FR-009**: A configuration that fails MUST be reported (the single-configuration command's error, then
  `[extract-all-polldata] Error: <file>: <message>`), MUST leave its history entry as it was, and MUST NOT stop the run.
- **FR-010**: Each configuration MUST be announced before it is extracted; the run MUST end with
  `[extract-all-polldata] Done: <n> extracted, <n> skipped, <n> failed`, followed by the list of failed files with their
  messages when any failed; the run MUST end with a failure status if any configuration failed, and a success status
  otherwise.
- **FR-011**: Two or more arguments MUST print `Usage: npm run extract-all-polldata [<directory>]` as one error line and
  end with a failure status; a missing or unreadable folder MUST print one error line and end with a failure status
  before anything is extracted; a folder with no configuration MUST say so and end with a success status.
- **FR-012**: Every line the command prints itself MUST start with `[extract-all-polldata]`.
- **FR-013**: The single-configuration command MUST neither read nor write the history, and its behaviour, output and
  messages MUST stay unchanged.
- **FR-014**: The command MUST only extract; it MUST NOT populate the database, and it MUST run without any of the
  application's settings.
- **FR-015**: The new script MUST be tracked in the repository, and the project's README MUST describe the command, the
  two-command workflow (extract the folder, then populate it) and both ways to extract a recorded configuration again
  (remove its history entry, or run the single-configuration command).
- **FR-016**: The command MUST be covered by automated tests that need no database: skipping, a changed input, a failure
  that does not stop the run, the history file, and the argument and folder errors.

### Key Entities

- **Configuration file**: a YAML file in the folder naming a saved poll page (`input_html`), an optional price history
  (`input_history`) and the poll data file to write (`output_json`), with its title settings.
- **Extraction history** (the record of what was extracted): the list of configurations already extracted, one entry each: folder, configuration name,
  fingerprint of its inputs, output file and extraction time.
- **Poll data file**: the JSON file written for a configuration, later loaded by `populate-all-polls`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After saving any number of new poll pages with their configurations, the developer brings `polldata` up to
  date with one command, instead of one command per configuration.
- **SC-002**: A second run on an unchanged folder extracts nothing and reports every configuration as skipped.
- **SC-003**: Every poll data file written by the folder-wide command is byte-identical to the one the
  single-configuration command writes for the same inputs.
- **SC-004**: One failing configuration never prevents the others from being extracted, and 100% of failures appear in
  the final summary.
- **SC-005**: The new automated tests add no more than 5 seconds to the project's test run.

## Assumptions

- The extraction pipeline, configuration format and `polldata` layout are those of the Poll Data Extractors feature
  (`specs/20261112-124616-POLL-DATA-EXTRACTORS/`), and are not changed here.
- The history lives beside the extraction scripts and is excluded from git by the folder's existing ignore rule; only the
  new script needs its own tracking exception.
- Extraction is fast (about a second per configuration), so configurations are processed one after another.
- No option argument (such as forcing a re-extraction) is added; the history is edited or deleted by hand instead.
- A configuration whose output file was deleted while its inputs are unchanged is not recreated automatically
  (accepted with the fingerprint rule in the requirements report, AM2).
- The application is unchanged. On the populate side, `populate-poll` (and so `populate-all-polls`) turns a poll's line
  graph on when its data file's `type` contains "line graph" (TWEAK03); nothing else there changes.
- Every poll data file `extract-all` writes (and so this command) carries `oldest_age_in_days: 365`, the field
  `populate-poll` reads to replay only the last year of data points (TWEAK01); the kind-specific commands other than
  `extract-polymarket-yes-no` do not write it.
