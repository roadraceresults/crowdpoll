# Feature Specification: Field Length Limits

**Feature Branch**: `20261102-154952-FIELD-LENGTH-LIMITS`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "requirements/20261102-154952-field-length-limits/requirements.md"

## Clarifications

### Session 2026-11-02

- Q: When a creator changes the text of a stored choice longer than 35 characters, what does the Choices box do with
  the line? → A: Cut it to 35 characters as soon as its text differs from the stored label (Option B).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Longer titles and subtitles (Priority: P1)

A poll creator writing a new poll, or editing one, finds today's title (50 characters) and subtitle (30 characters)
too short to say what the poll is about. With this feature a title may be up to 60 characters and a subtitle up to
40, in the poll wizard and on every save, and both still read well wherever the poll is shown.

**Why this priority**: It is a pure gain for creators with no effect on stored data, and it is independent of the
choice-label change.

**Independent Test**: In the wizard, type 60 characters into the title and 40 into the subtitle, save, and check that
both are stored whole, that a 61st or 41st character cannot be entered, and that the poll card shows both without
overflow at phone width.

**Acceptance Scenarios**:

1. **Given** the poll wizard, **When** the creator types a title, **Then** up to 60 characters are accepted and no
   more.
2. **Given** the poll wizard, **When** the creator types a subtitle, **Then** up to 40 characters are accepted and no
   more.
3. **Given** a save sent straight to the site's interface with a 60-character title and a 40-character subtitle,
   **When** it is received, **Then** it is accepted; with a 61-character title or a 41-character subtitle it is
   refused with a message naming the limit.
4. **Given** a poll with a 60-character title and a 40-character subtitle, **When** it is shown on the poll card,
   the maximized card, the admin card, search results and the line graph's subtitle at 360 px width, **Then**
   nothing overflows its card or is hidden.

---

### User Story 2 - One 35-character limit for every new choice (Priority: P1)

Today a new choice may be 40 characters in the wizard and in a voter's Add Choice dialog, but up to 100 when saved
straight through the site's interface. With this feature every newly entered choice label, wherever it is entered
(new poll's wizard, existing poll's wizard, a direct save, a voter's Add Choice, the populate script), is limited to
35 characters, and there is a single limit instead of two.

**Why this priority**: It is the main change asked for and removes the inconsistency between the 40 and the 100.

**Independent Test**: Try to enter a 36-character choice in each place a choice is entered, and check that each one
stops at, or refuses, more than 35 characters while a 35-character choice is accepted.

**Acceptance Scenarios**:

1. **Given** a new poll's wizard, **When** the creator types or pastes a choice line, **Then** it is limited to 35
   characters.
2. **Given** an open poll's Add Choice dialog, **When** a voter types a choice, **Then** the dialog accepts at most 35
   characters and its counter reads "n / 35".
3. **Given** a voter's addition of 36 characters sent straight to the site's interface, **When** it is received,
   **Then** it is refused with "A choice can be at most 35 characters."
4. **Given** a poll save whose new choice label is 36 characters, **When** it is received, **Then** it is refused
   with a message naming the 35-character limit, and nothing is saved.
5. **Given** a populate file with a choice label of 36 characters, **When** the populate script reads it, **Then** it
   reports that labels are 1 to 35 characters and creates nothing for that poll.

---

### User Story 3 - Choices already saved stay whole (Priority: P1)

A creator opens an existing poll whose choices were saved before this feature, one of them 72 characters long, and
votes have been cast for it. They add a new choice and save. The 72-character choice is shown, saved and counted
exactly as before, with all its votes; only the newly added line is held to 35 characters.

**Why this priority**: Without it, lowering the limit would cut stored choices and, on a poll with votes, turn them
into new choices and lose their votes.

**Independent Test**: Store a poll with a 72-character choice and votes for it, open it in the wizard, add a short
choice and save; check that the long choice keeps its full text, its identity and its vote count.

**Acceptance Scenarios**:

1. **Given** an existing poll with a stored choice of 72 characters, **When** the creator opens it in the wizard,
   **Then** the line shows all 72 characters, uncut.
2. **Given** that line, **When** the creator changes its text in any way (types, deletes or pastes a character),
   **Then** it is no longer a stored choice and is cut to 35 characters at once, as any new line is; a line that is
   not a stored choice is always limited to 35.
3. **Given** a save that keeps the 72-character stored choice and adds a 30-character one, **When** it is received,
   **Then** it is accepted, the stored choice keeps its text, identity and votes, and the new one is added.
4. **Given** a creator who edited the 72-character stored choice (so it was cut to 35), **When** they save, **Then**
   the edited text is saved as a new label of at most 35 characters, and the original stored choice is removed, as an
   edited choice is today.
5. **Given** a save sent straight to the site's interface that repeats every stored label unchanged, whatever its
   length, **When** it is received, **Then** it is not refused for length.

---

### Edge Cases

- A stored label of exactly 35 characters or fewer behaves as any label: kept when unchanged, limited to 35 when
  edited.
- A creator who cuts a long stored choice by mistake (one keystroke in it) can leave the wizard without saving; the
  stored choice, its text and its votes are then unchanged.
- A pasted block of several lines in the wizard: each line that is not a stored label is cut to 35, as lines are cut
  today; stored lines are not cut.
- A line in an existing poll that matches a stored label except for leading or trailing spaces counts as that stored
  label, since labels are compared after trimming, as today.
- A choice that a voter added earlier at 36 to 40 characters is a stored label: it is kept and counted, and the
  creator's save does not refuse it.
- A title or subtitle stored before this feature is always within the new, higher limits, so no stored title or
  subtitle is ever refused or cut.
- A page loaded before the change is deployed keeps its old 40-character cap for new choices until it is reloaded;
  a choice of 36 to 40 characters entered there is refused by the server with "A choice can be at most 35
  characters." A page loaded after the deploy that gets no limit from the site's configuration uses 35.
- Characters outside the basic plane (for example emoji) are counted as they are today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The title limit MUST be 60 characters, in the wizard and in the server's check of every save.
- **FR-002**: The subtitle limit MUST be 40 characters, in the wizard and in the server's check of every save.
- **FR-003**: There MUST be a single choice-label limit of 35 characters; the separate 40-character limit for the
  new poll's wizard and voters' additions MUST be removed.
- **FR-004**: Every newly entered choice label MUST be limited to 35 characters: in the new poll's wizard, in the
  existing poll's wizard, in a poll save, in a voter's Add Choice (dialog and server) and in the populate script.
- **FR-005**: A label in a poll save whose trimmed text equals a label already stored on that poll MUST be exempt
  from the length limit, in the browser and on the server.
- **FR-006**: The existing poll's wizard MUST show stored labels uncut, MUST limit every other line to 35 characters,
  and MUST cut a stored line to 35 characters as soon as its text differs from the stored label.
- **FR-007**: This feature MUST NOT change, cut or remove any stored title, subtitle or choice label; a stored
  choice MUST keep its identity and its votes.
- **FR-008**: The site's public configuration MUST publish the choice-label limit (35) under the name
  `choiceLabelMax`, replacing `wizardChoiceMax`; the browser MUST read it and use 35 when it is absent.
- **FR-009**: The limits written into the browser (title, subtitle, choice label) MUST equal the server's, and an
  automated test MUST fail when they differ.
- **FR-010**: Messages that state a limit MUST state the new value (60, 40, 35).
- **FR-011**: Every view showing a title or subtitle (poll card, maximized card, admin card, search results, line
  graph subtitle) MUST show a 60-character title and a 40-character subtitle at 360 px width without overflow, keeping
  today's wrapping and styling.
- **FR-012**: The published interface description, the user README and the developer guide MUST state the new limits
  and the renamed configuration field; the migration that once cut titles to 50 and subtitles to 30 MUST stay as it
  is.

### Key Entities

- **Poll**: has a title (at most 60 characters), a subtitle (at most 40) and a list of choices.
- **Choice**: has a label; a label entered after this feature is at most 35 characters, a label stored before it
  keeps its length (up to 100) for as long as its text is unchanged.
- **Site configuration**: the values the browser reads at start-up; it carries `choiceLabelMax` (35).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A creator can save a 60-character title and a 40-character subtitle on the first try, and both are
  shown whole on every view at 360 px width.
- **SC-002**: In every one of the five places a choice is entered, a 36-character new choice is stopped or refused,
  and a 35-character one is accepted (5 of 5).
- **SC-003**: After the feature ships, 100% of stored choices keep their text and vote counts, including those longer
  than 35 characters, and an existing poll with such a choice can be edited and saved without error.
- **SC-004**: Exactly one choice-label limit exists, and the browser's limits equal the server's (checked by an
  automated test on every run).

## Assumptions

- Lengths are counted as today: after trimming, in the same units in the browser and on the server.
- No data migration is needed: the higher title and subtitle limits keep every stored value valid, and stored choice
  labels are left as they are.
- The limits stay fixed values, not settings an operator can change.
- The renamed configuration field is a breaking change for any outside client reading `wizardChoiceMax`; the site's
  own pages are its only known readers.
- The populate script creates new polls, so all of its labels are new and held to 35.
- The search-box, keyword and email limits (200) are unchanged.
