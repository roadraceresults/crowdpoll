# Feature Specification: Populate All Polls

**Feature Branch**: `20261101-121236-POPULATE-ALL-POLLS`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "requirements/20261101-121236-populate-all-polls/requirements.md"

## Clarifications

### Session 2026-11-01

- Q: When a changed file is populated again, is its history entry replaced or appended? → A: Replaced — the new entry takes the place of the earlier entry for the same database and file name, so the history holds at most one entry per database and file name.
- Q: While a file is populated, is the single-file run's output shown? → A: Shown live and unchanged (its `[populate]` lines, errors included), while its summary lines are also read for the history entry.
- Q: A single-file run exits 0 but its summary lines are missing or unreadable — what then? → A: The file counts as failed with the message `populated, but its summary could not be read`, and nothing is recorded.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Populate one poll with a short command (Priority: P1)

A developer populates one demonstration poll from a data file by typing
`npm run populate-poll <file>` instead of the longer `npx tsx devScripts/populate/populate-poll.ts <file>`.
The file may be named with or without its `.json` extension, and a relative path means what it would mean
to any other command typed in the same folder.

**Why this priority**: it is the smallest useful change, it stands alone, and the folder command builds on
the same single-file population.

**Independent Test**: from the project root, run `npm run populate-poll polldata/trump_approval_rating_over_time`
(no extension) against a development database; confirm the poll is created or refreshed exactly as the
long command does it.

**Acceptance Scenarios**:

1. **Given** a valid data file `polldata/x.json`, **When** the developer runs `npm run populate-poll polldata/x.json`,
   **Then** the poll is created or refreshed and the output is the same as from the long command.
2. **Given** the same file, **When** the developer runs `npm run populate-poll polldata/x` (no extension) and no
   file named `polldata/x` exists, **Then** the script uses `polldata/x.json`.
3. **Given** the developer is in the `polldata` folder, **When** they run `npm run populate-poll x.json`,
   **Then** the script reads `polldata/x.json`, not `x.json` at the project root.
4. **Given** no argument, or two arguments, **When** the command runs, **Then** it prints
   `[populate] Error: Usage: npm run populate-poll <poll-data.json>` and exits with code 1, writing nothing.
5. **Given** a path that exists neither as given nor with `.json` added, **When** the command runs, **Then** it
   prints one `[populate] Error:` line naming the path, exits with code 1, and writes nothing.

---

### User Story 2 - Populate every new data file in a folder (Priority: P2)

A developer keeps a folder of poll data files and wants each one populated once into the target database.
They run `npm run populate-all-polls [<directory>]`. Every `.json` file not yet recorded for that database
(or whose contents changed since it was recorded) is populated, one after another; every recorded,
unchanged file is skipped with a log line. Each success is recorded in a history file, so the next run
populates only what is new.

**Why this priority**: it is the main new capability, but it depends on the single-file population working
as in User Story 1.

**Independent Test**: point the command at a folder of two valid data files and an empty history; confirm
both polls are populated and recorded; run it again and confirm both are skipped and nothing is written to
the database.

**Acceptance Scenarios**:

1. **Given** a folder holding `a.json`, `b.json`, `a.har` and `a.yaml`, and no history file, **When** the
   command runs on it, **Then** `a.json` then `b.json` are populated, the other files are ignored, the history
   file is created with one entry per populated file, and the run ends with
   `[populate-all] Done: 2 populated, 0 skipped, 0 failed`.
2. **Given** that history, **When** the command runs again on the same folder and database, **Then** both
   files are skipped, each with a log line naming the file and when it was populated, the database is not
   written, and the run ends with `Done: 0 populated, 2 skipped, 0 failed`.
3. **Given** `b.json` was edited after it was recorded, **When** the command runs again, **Then** `b.json` is
   populated again (its poll keeps its id) and its entry is replaced by a new one; `a.json` is skipped.
4. **Given** the history records both files for one database, **When** the command runs with
   `ENV_DATABASE_URL` naming a different database, **Then** both files are populated into that database.
5. **Given** no argument, **When** the command runs, **Then** it uses the `polldata` folder at the project root,
   whatever folder the command was typed in.
6. **Given** a subfolder inside the directory, **When** the command runs, **Then** the subfolder's files are
   not looked at.

---

### User Story 3 - Failures are reported and never recorded (Priority: P3)

A developer runs the folder command on a folder where one file is invalid (e.g. its creator email has no
account). The run reports that file's error, records nothing for it, goes on to the other files, and at
the end lists every failed file again, so the errors are not lost in a long output. The run exits with a
failure code, and the next run tries the failed file again.

**Why this priority**: it makes unattended runs over many files trustworthy, but the happy path delivers
value without it.

**Independent Test**: populate a folder of one valid and one invalid file; confirm the valid one is recorded,
the invalid one is not, the closing list names the invalid file and its message, and the exit code is 1.

**Acceptance Scenarios**:

1. **Given** a folder with valid `a.json` and invalid `b.json`, **When** the command runs, **Then** the
   output has `[populate-all] Error: b.json: <message>`, `a.json` is populated and recorded, `b.json` is not
   recorded, and the run ends with `Done: 1 populated, 0 skipped, 1 failed` followed by a list of the failed
   files with their messages, and exit code 1.
2. **Given** the failed file is fixed, **When** the command runs again, **Then** it is populated and
   recorded, and `a.json` is skipped.
3. **Given** a directory argument that does not exist, or no argument and no `polldata` folder, **When** the
   command runs, **Then** it prints one `[populate-all] Error:` line naming the folder, populates nothing and
   exits with code 1.
4. **Given** two or more arguments, **When** the command runs, **Then** it prints
   `[populate-all] Error: Usage: npm run populate-all-polls [<directory>]` and exits with code 1.
5. **Given** a history file that is not valid JSON, **When** the command runs, **Then** it prints one
   `[populate-all] Error:` line naming the history file, populates nothing and exits with code 1.

---

### Edge Cases

- **Empty folder**: a directory with no `.json` file prints a line saying so, populates nothing and exits 0.
- **Interrupted run**: the history is written after each successful file, so a run stopped part-way keeps the
  entries of the files it finished; the next run skips them and populates the rest.
- **Database reset**: the history still records files for a database that was emptied or restored; they are
  skipped. The developer removes their entries (or deletes the history file), or populates single files
  with `npm run populate-poll`.
- **File populated singly**: `npm run populate-poll` neither reads nor writes the history, so the next folder
  run populates that file once more; this is a refresh that keeps the poll id.
- **Password rotation**: entries are compared by the database location without its password, so changing the
  password alone does not make recorded files look new.
- **Unreadable summary**: a single-file run that succeeds but whose summary lines cannot be read counts as
  failed and is not recorded, so the next run populates the file again (a refresh).
- **Letter case**: `X.JSON` is a data file like `x.json`.
- **Same file name in two folders**: the history identifies a file by its name and contents, so an identical
  copy in another folder is skipped for the same database, and a different one with the same name is populated.
- **A path with spaces** must be quoted on the command line.

## Requirements *(mandatory)*

### Functional Requirements

**Single-file command**

- **FR-001**: The project MUST offer `npm run populate-poll <file>`, which behaves exactly as running the
  existing single-file populate script with that file today; the long form MUST keep working.
- **FR-002**: When the path as given does not exist and has no extension, the single-file script MUST try the
  same path with `.json` added; no other extension is tried.
- **FR-003**: A relative path MUST be resolved from the folder the developer typed the command in (falling back
  to the process's working directory when that is not known).
- **FR-004**: The single-file script MUST take exactly one argument; otherwise it MUST print
  `[populate] Error: Usage: npm run populate-poll <poll-data.json>` and exit 1 with nothing written.
- **FR-005**: The single-file script MUST NOT read or write the population history.

**Folder command**

- **FR-006**: The project MUST offer `npm run populate-all-polls [<directory>]`, which populates the database
  named by `ENV_DATABASE_URL` from the data files in the directory.
- **FR-007**: With no argument the directory MUST be `polldata` at the project root; a relative directory
  argument MUST be resolved as in FR-003.
- **FR-008**: Two or more arguments MUST print `[populate-all] Error: Usage: npm run populate-all-polls [<directory>]`
  and exit 1.
- **FR-009**: A missing or unreadable directory, given or default, MUST print one `[populate-all] Error:` line
  naming it and exit 1 before any file is populated.
- **FR-010**: The data files MUST be the files directly in the directory whose name ends in `.json` in any letter
  case, processed one after another in name order; subfolders MUST NOT be searched.
- **FR-011**: Each data file MUST be populated by running the single-file populate script on it as a separate
  process, so it is validated, created or refreshed exactly as a single run does; success or failure MUST be
  taken from that process's exit code, and the poll id, outcome and votes written from its closing summary
  lines. That process's output, errors included, MUST be shown to the developer live and unchanged. A run
  that exits 0 but whose poll id, outcome or votes written cannot be read MUST count as failed, with the
  message `populated, but its summary could not be read`.
- **FR-012**: A file MUST be skipped when the history holds an entry with the same database, the same file name
  and the same content fingerprint (SHA-256); a skip MUST be logged as one line naming the file and when it
  was populated.
- **FR-013**: A file whose name is recorded for the database but whose contents changed MUST be populated
  again (a refresh that keeps its poll id); its new entry MUST replace the earlier entry for the same
  database and file name.
- **FR-014**: After each file succeeds, its entry MUST be added and the history file written at once.
- **FR-015**: A file that fails MUST be logged as `[populate-all] Error: <file>: <message>`, MUST NOT be
  recorded, and the run MUST go on to the next file.
- **FR-016**: The run MUST end with `[populate-all] Done: <n> populated, <n> skipped, <n> failed`; when any file
  failed, it MUST then list every failed file with its message, and exit 1; otherwise it MUST exit 0.
- **FR-017**: A directory holding no `.json` file MUST print a line saying so and exit 0.

**Population history**

- **FR-018**: The history MUST be kept in `devScripts/populate/populate-all-polls-history.json`, which MUST
  NOT be committed to the repository.
- **FR-019**: The history MUST hold a list of entries, at most one per database and file name (the latest
  successful population), each with: the database,
  the file name, the file's SHA-256, the poll id, the outcome (`created` or `refreshed`), the number of votes
  written and the time it was populated (ISO 8601).
- **FR-020**: The database MUST be recorded as `ENV_DATABASE_URL` with its password removed, and entries MUST be
  compared in that form; the password MUST NOT be written to the history or printed.
- **FR-021**: A missing history file MUST be treated as an empty history; a history file that cannot be read or
  parsed MUST stop the run with one `[populate-all] Error:` line naming it, before any file is populated.

**Documentation**

- **FR-022**: The populate `README.md` MUST show both npm commands, describe the history file, and say how to
  populate a recorded file again (remove its entry or the file, or use `npm run populate-poll`).

### Key Entities

- **Data file**: one poll's data in the existing populate format (`.json`), identified for the history by its
  file name and content fingerprint.
- **Population history**: the latest successful population of each file into each database, local to the
  developer's machine.
- **History entry**: database (password-free location), file name, content fingerprint, poll id, outcome
  (created or refreshed), votes written, populated at.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer populates one poll with a command of at most 3 words plus the file path, from any
  folder of the project.
- **SC-002**: A developer populates every data file of a folder with one command; a second run on an unchanged
  folder writes nothing to the database and reports every file as skipped.
- **SC-003**: After a run with failures, 100% of the failed files appear in the closing list with their
  messages, and none of them is recorded as populated.
- **SC-004**: The history file never contains a database password (verified against a URL with a password).
- **SC-005**: An interrupted run loses no record of the files it finished: the next run skips each of them.
- **SC-006**: The single-file command's results are unchanged: the same input gives the same poll, votes and
  output as before this feature, apart from the usage line.

## Assumptions

- The `ENV_*` variables are set in the shell that runs either command, as the single-file script requires
  today; npm does not load them.
- The data file format, validation, poll creation and refresh, and vote replay of the single-file script are
  unchanged; this feature adds only the npm commands, the `.json` fallback, path resolution, the usage line,
  and the folder command with its history.
- The folder command lives beside the single-file script in `devScripts/populate/` and logs with the
  `[populate-all]` prefix; the single-file script's `[populate]` lines appear unchanged in its output.
- "Project root" is the folder holding `package.json`.
- No server, route, configuration, database schema or migration change, and no new dependency.
- Tests follow the existing single-file script's tests (embedded database, fixture files), using temporary
  folders and a temporary history file.
