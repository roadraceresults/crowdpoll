# Feature Specification: Populate Script Graph Subtitle

**Feature Branch**: `20261030-123029-POPULATE-GRAPH-SUBTITLE`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "requirements/20261030-123029-populate-graph-subtitle/requirements.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A populated demonstration poll carries a subtitle (Priority: P1)

A developer prepares a poll data JSON file that includes a `graph_subtitle` value and runs the populate
script against it. The created (or refreshed) demonstration poll stores that value as its subtitle, so
visitors see it under the poll's title on the poll card and on the maximized view's line graph — the places
every poll's subtitle already appears.

**Why this priority**: it is the whole point of the feature; without it the field in the data files does
nothing.

**Independent Test**: run the script on a data file whose `graph_subtitle` is a valid value; open the poll
and confirm the subtitle is shown under the title and on the maximized line graph.

**Acceptance Scenarios**:

1. **Given** a valid data file with `"graph_subtitle": "For Demonstration Purposes"` and no existing poll
   with its title, **When** the script runs, **Then** the new poll's subtitle is
   `For Demonstration Purposes` and it is visible wherever a poll subtitle is shown.
2. **Given** the same poll already exists with an empty subtitle, **When** the script reruns on the same
   file, **Then** the poll keeps its id and its subtitle becomes the file's value.
3. **Given** a data file whose `graph_subtitle` changed since the last run, **When** the script reruns,
   **Then** the poll's subtitle equals the file's new value.

---

### User Story 2 - Existing data files keep working (Priority: P2)

A developer runs the script on an older data file that has no `graph_subtitle` key. The run succeeds exactly
as before; the poll's subtitle is empty.

**Why this priority**: the field is optional, and the change must not break any existing file or the test
fixture.

**Independent Test**: run the script on a file without the key and confirm the outcome is unchanged from
today, with an empty subtitle.

**Acceptance Scenarios**:

1. **Given** a valid data file with no `graph_subtitle` key, **When** the script runs, **Then** the poll is
   created or refreshed as today and its subtitle is empty.
2. **Given** a poll whose subtitle was set by an earlier run, **When** the script reruns on a file that no
   longer has the key (or has it empty), **Then** the poll's subtitle is cleared — the file is the source of
   truth on every run.

---

### User Story 3 - An invalid subtitle stops the run before any write (Priority: P3)

A developer runs the script on a file whose `graph_subtitle` is not usable — longer than the poll subtitle
limit, or not text. The script reports one clear error line and exits with a failure code, and nothing in
the database has changed.

**Why this priority**: it protects the validate-before-any-write guarantee the script already makes for
every other field.

**Independent Test**: run the script on a file whose value is 31 characters and confirm the single error
line, the failure exit code, and that no poll or vote row changed.

**Acceptance Scenarios**:

1. **Given** a data file whose `graph_subtitle` is 31 characters (one over the limit of 30), **When** the
   script runs, **Then** it prints one `[populate] Error:` line naming the problem, exits with code 1, and
   writes nothing.
2. **Given** a data file whose `graph_subtitle` is not text (e.g. a number), **When** the script runs,
   **Then** it fails the same way.
3. **Given** a data file whose `graph_subtitle` is exactly 30 characters, **When** the script runs, **Then**
   the value is accepted and stored.

---

### Edge Cases

- `graph_subtitle` is an empty string: treated the same as an absent key — the poll's subtitle is empty.
- `graph_subtitle` is exactly at the 30-character limit: accepted.
- A rerun whose file dropped the key: the existing subtitle is cleared (the file is the source of truth).
- Other unknown top-level keys in a data file: unchanged behaviour (they are ignored); only
  `graph_subtitle` gains meaning.
- The two local data files under `polldata/` currently hold a 31-character value and non-standard keys:
  they are corrected by hand (they are git-ignored, local-only files); the script does not adapt to their
  current shape.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The populate script MUST read an optional `graph_subtitle` key from the poll data JSON file.
- **FR-002**: An absent or empty `graph_subtitle` MUST result in an empty poll subtitle, so every existing
  data file and the test fixture keep working unchanged.
- **FR-003**: A present `graph_subtitle` MUST be text of at most the poll subtitle limit (30 characters,
  the same limit enforced when a subtitle is saved through the poll administration card); a value that is
  not text or is over the limit MUST produce exactly one `[populate] Error:` line and exit code 1, before
  anything is written.
- **FR-004**: On a create run, the poll MUST be created with the file's `graph_subtitle` as its subtitle.
- **FR-005**: On a refresh rerun, the poll's subtitle MUST be set to the file's current value — including
  being cleared when the file no longer carries the key — exactly as the title and choices follow the file.
- **FR-006**: The stored subtitle MUST appear wherever a poll subtitle already appears (under the title on
  the poll card and on the maximized view's line graph) with no change to how polls are displayed.
- **FR-007**: The script's documentation (the key table in `devScripts/populate/README.md`) MUST describe
  the new key, its optionality and its limit.
- **FR-008**: The test fixture (`tests/fixtures/populate-poll.json`) and the populate tests MUST cover the
  new key: stored on create, applied on refresh, and the length validation.
- **FR-009**: The input format MUST otherwise stay exactly as documented — this feature adds the one key
  and changes nothing else about the file format.

### Key Entities

- **Poll data JSON file**: the script's input; gains one optional key, `graph_subtitle`, beside the
  existing `poll creator email`, `title`, `choice_…`, `vote_count` and `data_points`.
- **Poll**: the existing poll record; its existing `subtitle` attribute is the destination of the new key.
  No new attribute is added.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a run on a file with a valid `graph_subtitle`, the poll's displayed subtitle equals the
  file's value, both on the poll card and on the maximized line graph, with zero manual steps after the run.
- **SC-002**: Every data file and fixture valid before this feature runs unchanged and produces the same
  poll as before, with an empty subtitle.
- **SC-003**: A run on a file with an over-limit or non-text `graph_subtitle` changes zero database rows and
  exits with a failure code and exactly one error line.
- **SC-004**: After any sequence of runs, the poll's subtitle always equals the latest file's value
  (or empty when the file has none) — reruns converge with no manual cleanup.

## Assumptions

- The poll subtitle limit stays at its current value (30 characters); this feature adopts it rather than
  changing it.
- No server, route, schema, configuration or browser change is needed: polls already store and display a
  subtitle; the script simply stops hard-coding it to empty.
- The two local data files under `polldata/` are corrected by hand to the documented keys with a value
  within the limit (e.g. "For Demonstration Purposes", 26 characters); they are git-ignored, so no commit
  carries them.
- The scope decision NC2 from the requirements holds: the script accepts only the documented input format;
  the non-standard shape currently in those local files (`graph_title`, `label_…`, bare data-point keys) is
  out of scope.
