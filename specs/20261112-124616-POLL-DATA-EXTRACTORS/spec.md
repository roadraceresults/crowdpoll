# Feature Specification: Poll Data Extractors

**Feature Branch**: `20261112-124616-POLL-DATA-EXTRACTORS`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "requirements/20261112-124616-poll-data-extractors/requirements.md": bring the five poll-page
extraction scripts of the separate htmlparser repository into this project, beside the poll populate scripts that use
their output, so that extraction and population are done in one place.

## User Scenarios & Testing *(mandatory)*

The user is a developer of CrowdPoll who fills a development database with demonstration polls. Today they save a poll
page (and, for Polymarket, its price history) into the `polldata` folder, describe it in a small configuration file,
switch to a second checkout (htmlparser) to turn it into a poll data file, then come back to this project to load that
file into the database. After this feature, every step runs from this project.

### User Story 1 - Extract any saved poll page from this project (Priority: P1)

The developer saves a poll page and its configuration file in `polldata`, runs the general extraction command from this
project with the configuration file, and gets the poll data file beside it, exactly as htmlparser produced it.

**Why this priority**: The general command detects the page kind and runs the matching extractor; with it alone, every
supported page can be extracted here, which is the whole point of the move.

**Independent Test**: Run the general command on a configuration file for each supported page kind (CNN line graph,
Polymarket line graph, POLITICO Poll of Polls, Polymarket yes/no) and compare each written poll data file with the one
htmlparser writes for the same inputs.

**Acceptance Scenarios**:

1. **Given** a configuration file naming a saved CNN poll page, **When** the developer runs the general extraction
   command with it, **Then** the poll data file named in the configuration is written, identical to htmlparser's output
   for the same inputs.
2. **Given** a configuration file whose `type` names a page kind, **When** the general command runs, **Then** that kind's
   extractor is used without detection.
3. **Given** a configuration file with no `type`, **When** the general command runs, **Then** the page kind is detected
   and the matching extractor runs.
4. **Given** a configuration file naming a page that does not exist, **When** the command runs, **Then** it reports the
   missing file by name, writes nothing and ends with a failure status.

---

### User Story 2 - Run a specific extractor by name (Priority: P2)

The developer runs one of the four kind-specific commands (CNN line graph, Polymarket line graph, POLITICO Poll of
Polls, Polymarket yes/no) when they already know the page kind.

**Why this priority**: The four commands exist in htmlparser today and are part of the move, but the general command
already covers their pages.

**Independent Test**: Run each kind-specific command on its own fixture and compare the output with htmlparser's.

**Acceptance Scenarios**:

1. **Given** a configuration file for a Polymarket page with its saved price history, **When** the developer runs the
   Polymarket line-graph command, **Then** the poll data file holds the price history's values.
2. **Given** a configuration file for a page of another kind, **When** a kind-specific command runs on it, **Then** it
   reports that the page is not of its kind and writes nothing, as in htmlparser.

---

### User Story 3 - Extract, then populate, from one checkout (Priority: P3)

The developer runs the extraction, then the existing populate command on the written file or folder, without leaving
this project.

**Why this priority**: It is the end-to-end result the requirements ask for, but it needs no new behaviour: it follows
from User Stories 1 and 2 and the existing populate scripts.

**Independent Test**: Extract a saved page, then populate the written file into a local development database, and check
that the poll appears with its votes.

**Acceptance Scenarios**:

1. **Given** a poll data file just written by an extraction command, **When** the developer runs the existing single-file
   populate command on it, **Then** the poll is created or refreshed as for a file written by htmlparser.
2. **Given** a folder of poll data files written by the extraction commands, **When** the developer runs the existing
   folder populate command, **Then** each file is populated, as before.

---

### Edge Cases

- A configuration file with an unknown key, a missing required key or an empty value: the command reports the key and
  writes nothing, as in htmlparser.
- A configuration file whose output would overwrite its own input page: refused, as in htmlparser.
- A page whose chart cannot be found or read: the command reports why, writes nothing and ends with a failure status.
- A Polymarket line-graph configuration with no price history file, or one holding no prices: reported by name.
- A command run with no configuration file argument: it prints its usage and ends with a failure status.
- Paths in a configuration file are read relative to the configuration file's folder, wherever the command is run from.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST provide five extraction commands, run from the project root by name: a general command
  that detects or reads the page kind, and one command each for CNN line graphs, Polymarket line graphs, POLITICO Poll of
  Polls and Polymarket yes/no pages.
- **FR-002**: Each command MUST take one argument, the path of a configuration file, and MUST accept the same
  configuration files htmlparser accepts today, with the same keys and the same meaning.
- **FR-003**: For the same configuration and input files, each command MUST write a poll data file identical in content
  to the one htmlparser's matching command writes, so the existing populate commands read it unchanged.
- **FR-004**: Each command MUST report errors and end with the same messages and success or failure status as
  htmlparser's matching command, except that its usage line and the command name in its messages give this project's
  way of running it.
- **FR-005**: The commands MUST run without a separate build step and MUST NOT require htmlparser to be installed or
  checked out.
- **FR-006**: Only the code the five commands use MUST be brought in; htmlparser's HTML title extractor stays where it is.
- **FR-007**: The tests that cover the moved code MUST be brought in and pass as part of the project's test run, except
  the one test that reads the two large saved reference pages, which stay out with it.
- **FR-008**: The moved code MUST follow this project's code conventions without any change of behaviour.
- **FR-009**: The packages the commands need MUST be development-only dependencies, so the production application does
  not use them.
- **FR-010**: The moved code MUST be taken from htmlparser's `latest` branch, and the change MUST record the exact
  htmlparser commit it was taken from.
- **FR-011**: The existing populate commands, the application and the database MUST NOT change; extraction and
  population stay separate commands.
- **FR-012**: The project's README MUST describe the five commands, their configuration files and the extract-then-populate
  workflow.

### Key Entities

- **Configuration file**: a small YAML file beside the saved page, naming the graph title, the input page, the price
  history when needed (read for a Polymarket line graph; named but never read for POLITICO), the page address for
  POLITICO, the output file and, optionally, the page kind, title and subtitle.
- **Saved poll page**: the HTML of a poll page from CNN, Polymarket or POLITICO, saved in `polldata`.
- **Price history**: the browser's saved network record (`.har`) of a Polymarket page, holding its price series; a
  POLITICO configuration also names one, which is recorded but not read.
- **Poll data file**: the JSON file the extraction writes and the populate commands read: title, subtitle, creator
  email, vote count, optional page kind and address, the choice labels and the dated data points.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the poll pages in the current `polldata` folder that htmlparser can extract are extracted from this
  project into files identical to htmlparser's.
- **SC-002**: A developer goes from a saved page to a populated poll using this project alone, in two commands.
- **SC-003**: Every moved test passes in the project's normal test run, and the run grows by no more than 5 seconds.
- **SC-004**: The production application loads no package the feature adds. One addition to the production install is
  accepted: `yaml`, which npm keeps as an optional peer of `vite`, itself already installed in production as an
  optional peer of `better-auth`; nothing in the application imports it.
- **SC-005**: The repository grows by under 1 MB of test fixtures.

## Assumptions

- htmlparser stays active as it is; the two copies may later differ, which is accepted (requirements decision NC2).
- The configuration files and saved pages already in `polldata` are representative of every supported page kind.
- The extraction commands are run by developers on their own machines; they are not part of the deployed application.
- The commands keep htmlparser's defaults for the poll data file (subtitle "Poll for Demonstration", creator
  `devadmin01@crowdpoll.vote`, 1000 votes), since the populate commands and existing data files rely on them.
- The project's supported Node version (22 and later) is enough for the moved code once it follows this project's
  conventions.
