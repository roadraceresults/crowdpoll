# Feature Specification: Manual Bar Colors

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "029-high-level-requirements-MANUAL-BAR-COLOR-SETTING.md"

**Source requirements**: `designDocs/029-high-level-requirements-MANUAL-BAR-COLOR-SETTING.md` (the requirements document, with every finding of the architecture review folded in).
**Architecture**: `architecture/029-manual-bar-colors/architecture.md` (9 findings, all resolved).
**Research**: `research/MANUAL-BAR-COLOR-SETTING/research.md`. The palette is shown in `dontTrack\manual-bar-color-palette.jpg`.

## Clarifications

### Session 2026-10-08

- Q: What does the colour dot show for Automatic? → A: An empty ring, a 24 dp circle with an outline and no fill.
- Q: Which spelling does the on-screen text use? → A: American ("color", "Colors").

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Give a poll's choices colours by hand (Priority: P1)

A poll's creator, or an administrator, has entered a poll's choices, for example "Republican" and "Democratic", and wants the result bars to look right: red for one, blue for the other. In the poll edit card they open a new step, **Colors**, between **Choices** and **How**. It lists every choice with a colour button beside it. Each choice starts on **Automatic**. Pressing a choice's button opens a grid of 16 named colours; choosing one closes the grid and shows the colour on the button. The creator then goes on to the next steps as usual, and saves or publishes the poll.

**Why this priority**: This is the feature. Without a way to pick a colour per choice, nothing else has value.

**Independent Test**: Create a poll with two choices, open the Colors step, give the first choice Red and leave the second on Automatic, save, reopen the card, and check that the step shows the same two settings.

**Acceptance Scenarios**:

1. **Given** the poll edit card, **When** the creator looks at the numbered circles, **Then** there are six, in the order Who, Title, Choices, Colors, How, When, and Colors is step 4.
2. **Given** a poll with three choices, **When** the creator opens Colors, **Then** each choice has one row showing its label and a button with a colour dot, a name (**Automatic** until set) and a drop-down arrow; for **Automatic** the dot is an empty ring, a 24 dp circle with an outline and no fill.
3. **Given** the Colors step, **When** the creator presses a choice's button, **Then** a grid opens holding **Automatic** first and then the 18 palette colours, four to a row, and choosing one closes it, returns focus to the button and shows that colour's dot and name.
4. **Given** a colour is set on a choice, **When** the creator chooses **Automatic** for it, **Then** the colour is cleared and the button shows **Automatic** again.
5. **Given** the creator never opens Colors but presses Next through it, **When** the poll is published, **Then** every choice is Automatic and the poll behaves as before this feature.
6. **Given** the poll's creator or an administrator, **When** they open the card, **Then** the Colors step is available; for anyone else the card is not available at all, as for every other edit.

---

### User Story 2 - Voters see the chosen colours (Priority: P1)

A voter looks at the poll's results. A choice with a colour set by hand is drawn in that colour, with its track and text colours derived from it so the label stays readable in light and dark mode. A choice left on Automatic is drawn exactly as it is today. Setting a colour on one choice never changes the colour of a choice left on Automatic.

**Why this priority**: The colours only matter if the voter sees them, and existing polls must not change.

**Independent Test**: Show the results of a poll with three choices where only one has a colour, and compare the other two bars' colours with the same poll before the colour was set.

**Acceptance Scenarios**:

1. **Given** a poll where a choice has a colour, **When** its results are shown, **Then** that choice's bar uses the colour in preference to the fixed Yes and No colours and the automatic palette.
2. **Given** a poll with several choices where one is given a colour, **When** the results are shown, **Then** every choice left on Automatic has exactly the colour it had before the colour was set.
3. **Given** a poll with no colours set, **When** its results are shown, **Then** every bar has exactly the colour it had before this feature existed.
4. **Given** a poll where two choices have the same colour, **When** results are shown, **Then** both bars are drawn in it.
5. **Given** each of the 18 palette colours, **When** a bar is drawn in it, **Then** the label is legible on the unfilled part of the bar in light and dark mode (at least 7:1) and over the filled part (at least 4.5:1).
6. **Given** a card that is already showing the poll, **When** a colour is changed, **Then** the card shows the new colour the next time it refreshes the poll's content.

---

### User Story 3 - Change colours after voting has started (Priority: P2)

Colours do not change what a vote means, so a poll's creator or an administrator can still change them after the first vote, while the choices themselves stay locked. The Colors step is open on such a poll and the Choices step is not. When colours are the only thing the creator changed, saving them leaves the poll in the state it was in and does not review its text again, so voting resumes at once.

**Why this priority**: A late fix to a colour is common; refusing it would force a poll to be copied.

**Independent Test**: On a poll that has votes, change one colour and save; check the poll is back in its previous state, no review was started, and the votes and choices are unchanged.

**Acceptance Scenarios**:

1. **Given** a poll that has votes, **When** the creator opens the card, **Then** the Colors step can be changed while the Choices step is locked.
2. **Given** a poll that has votes where only colours were changed, **When** the creator saves, **Then** the colours are stored on the existing choices, every vote still points at its choice, the poll returns to the state it had before the edit, the edit session ends, and the poll is not sent for review again.
3. **Given** a poll that has votes where a colour and something else were changed, **When** the creator saves, **Then** the poll is published as for any change, and the colours are stored with it.
4. **Given** a closed poll that has votes, **When** the creator changes a colour, **Then** the change is accepted, as it is for the title.
5. **Given** a caller who is neither the poll's creator nor an administrator, **When** they ask to change colours, **Then** the poll appears not to exist, as for every other edit.
6. **Given** a colours-only request whose list is not exactly as long as the choice list, **When** it is received, **Then** it is refused and nothing is changed.

---

### User Story 4 - An easy, accessible picker (Priority: P2)

The colour picker is quick for a creator with many choices and usable by everyone: by touch, by keyboard and by screen reader. Colour is never the only cue: every swatch has a name, the chosen swatch shows a check mark, and every swatch has a visible outline so black and silver show on any surface.

**Why this priority**: The requirements ask for an intuitive, Material 3 interface; the picker is where users spend their time.

**Independent Test**: Operate the whole step with the keyboard alone and with a screen reader, on a phone-width card, with 50 choices.

**Acceptance Scenarios**:

1. **Given** the grid is open, **When** the creator uses the arrow keys, Home and End, **Then** focus moves between the swatches, Enter or Space chooses one, and Escape closes the grid and returns focus to the button.
2. **Given** any swatch or colour button, **When** it is measured, **Then** its touch target is at least 48 dp, and the grid fits a 320 px wide card.
3. **Given** a screen reader, **When** a swatch is reached, **Then** it announces the colour's name, and whether it is chosen.
4. **Given** the light and the dark theme, **When** the grid is shown, **Then** every swatch, including black and gainsboro, has a visible outline.
5. **Given** a poll with no choices yet, **When** the creator opens Colors, **Then** the list is replaced by one line asking them to add their choices first, and no colour buttons appear.
6. **Given** the Choices box has unsaved lines, **When** the creator opens Colors, **Then** those lines are listed.

---

### User Story 5 - Keep colours with their choices and keep the palette easy to extend (Priority: P3)

Colours stay with the choice they were set for as the creator edits the list, and a maintainer can add a colour to the palette by adding one line. A poll keeps its look if the palette is edited later.

**Why this priority**: It keeps the feature predictable and cheap to maintain but is not needed on the first day.

**Independent Test**: Reorder, rename and remove lines of a coloured poll's choices and check where each colour goes; add a 17th colour to the palette and check the grid shows it.

**Acceptance Scenarios**:

1. **Given** coloured choices, **When** the creator reorders the lines, **Then** every colour stays with its label.
2. **Given** a coloured choice, **When** the creator renames or removes its line, **Then** that line's colour is dropped.
3. **Given** a poll that stores a colour the palette no longer holds, **When** the poll is drawn, **Then** the bar is drawn in that colour; **When** the poll is saved, **Then** the colour is kept, and the picker shows it as its hex code, chosen.
4. **Given** a maintainer adds one colour to the palette list, **When** the picker is opened, **Then** the grid shows 19 swatches with no other change.
5. **Given** a poll is duplicated, **When** the copy is made, **Then** it has the same colours on the same choices.
6. **Given** a request that carries labels and no colours, **When** it is saved, **Then** the choices are replaced with none coloured, as before this feature.

---

### Edge Cases

- A poll that is still in its new-poll state, a published poll that has no votes, and a poll that has votes all take colours; only a poll that has votes uses the colours-only save, and only when nothing else changed.
- A published poll that has no votes and only colours changed is published as for a title change, so it is reviewed again; the colours-only save does not cover it.
- Colours cannot be changed while the poll is being edited by someone else, while it is awaiting approval, or when it is archived.
- A choice that reads as yes or no and is given a colour is drawn in that colour, not the fixed Yes or No colour.
- A poll with the largest allowed number of choices (50 by default) gives one colour button per choice; the page does not grow with the number of choices because the grid is shared.
- A colour sent as a lower-case hex code is accepted and stored in the palette's spelling; a code that is not in the palette and not already stored on the poll is refused.
- The list of colours must be exactly as long as the list of choices; any other length is refused and nothing is saved.
- Two choices may share a colour, and the creator is not warned about bars that look alike.
- Opening the card always takes an edit session, so voting is paused while the card is open, as for any edit.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The poll edit card MUST have six numbered circles in the order Who, Title, Choices, Colors, How, When; Colors is step 4 and How and When become steps 5 and 6. The circle row MUST show six equal columns, with the joining line running from the first circle's centre to the last's.
- **FR-002**: The Colors step MUST list one row per choice, in the order of the lines of the Choices box, each with a colour button showing a colour dot, the colour's name (or **Automatic**) and a drop-down arrow. For **Automatic** the dot MUST be an empty ring, a 24 dp circle with an outline and no fill, because an Automatic bar has no fixed colour; for a chosen colour it MUST be a filled 24 dp circle of that colour. The list MUST reflect unsaved edits to the Choices box. When the Choices box holds no choice, the list MUST be replaced by the line "Add your choices first, then come back to choose their colors." and no colour buttons shown.
- **FR-003**: Every choice MUST start on **Automatic**. **Automatic** MUST be the first entry of the colour menu and MUST clear a colour that was set. The step MUST carry one line of help: "Optional. Leave a choice on Automatic to color it for you."
- **FR-004**: The colour menu MUST offer exactly the 18 palette colours, in the order of the palette table, as a grid of four columns. Each swatch MUST be a target of at least 48 dp, have the colour's name as its accessible name and tooltip, show a check mark when chosen, have a 1 dp outline in the theme's outline colour in light and dark mode, and be reachable and choosable by keyboard (arrow keys, Home, End, Enter or Space, Escape to close).
- **FR-005**: Choosing a colour MUST close the menu, return focus to the colour button, and update the button's dot and name.
- **FR-006**: A colour MUST follow its choice's label: reordering the lines keeps every colour with its label, and renaming or removing a line drops that line's colour.
- **FR-007**: The palette MUST be one ordered list of name and hex code in one place, MUST be the only list a colour is validated against, and MUST be sent to the browser with the other settings it receives. Adding a colour to the list MUST add it to the menu without any other change.
- **FR-008**: Each choice MUST store its optional colour as the palette's hex code, absent for Automatic. No migration is run, and an existing poll's choices, which have no colour, are Automatic.
- **FR-009**: The save and publish requests MUST accept a list of colours beside the list of labels, of the same length and in the same order, whose entries are a palette hex code, a colour that the poll already stores on one of its choices, or nothing (Automatic). A list of a different length, or any other entry, MUST be refused and nothing saved. A hex code MUST be compared without regard to letter case and stored in the palette's spelling. A request that carries labels and no colours MUST replace the choices with none coloured. Each colour MUST be paired with its label before empty labels are discarded.
- **FR-010**: For a poll that has votes, a colours-only save (`POST /api/admin/polls/:pid/colors`) MUST be available to the poll's creator and to administrators (`404` for anyone else, `409` unless the caller holds the poll's edit session). It MUST set the colour of the existing choices by position, change no id, label, position or vote, put the poll back in the state it had before the edit session, end the session, and not screen the poll again. For a poll with no votes the route MUST refuse with `409`, and the wizard uses Publish instead (FR-020). Its list MUST be exactly as long as the choice list, with the entry rules of FR-009. Publish for such a poll MUST still refuse any field other than the allowed ones, and the list of colours MUST be one of them.
- **FR-011**: Colours MUST be changeable by the poll's creator and by administrators while choices can be edited, and also after the poll has votes; after votes the Colors step is open while the Choices step stays locked. This MUST apply in every state in which the card can be opened for editing, including a closed poll.
- **FR-012**: Duplicating a poll MUST copy the colours of its choices.
- **FR-013**: A result bar MUST use a choice's colour when it has one, in preference to the Yes and No colours and to the automatic palette.
- **FR-014**: A choice without a colour MUST be coloured exactly as before. A choice with a colour that would otherwise have taken an automatic palette entry MUST still advance the palette without drawing it, and a choice that reads as yes or no MUST still not advance it, so that setting a colour on a choice does not change the colour of any Automatic choice.
- **FR-015**: Two choices of one poll MAY have the same colour.
- **FR-016**: A bar's colours, in light and dark mode, and its text colours MUST be derived from the choice's colour on demand, for any hex code, by the existing derivation; a colour outside the 50 automatic colours MUST NOT cause an error.
- **FR-017**: A change of colour MUST reach a card that is already showing the poll the next time it refreshes the poll's content. Because a colours-only save restores the poll's state, voting MUST resume as soon as it is saved.
- **FR-018**: The request and response descriptions of the published API contract MUST include the list of colours on the save and publish requests, the colour on a choice, and the colours-only save.
- **FR-019**: Automated tests MUST cover the palette and its validation, the pairing of colours with labels when empty labels are dropped, the colours-only save (the state restored, no review, a caller who is neither creator nor administrator, a caller without the session, a list of the wrong length), duplication, the bar colours (manual wins, Automatic unchanged, no entry used up by a manual choice, any hex drawn), the wizard's six steps, the Colors step's behaviour (including no choices, a reordered, renamed and removed line, and a stored colour the palette no longer holds), and a closed poll that has votes.
- **FR-020**: In the wizard, when the poll has votes and the only answers that differ from the stored ones are colours, Save MUST use the colours-only save; when anything else differs it MUST use Publish.
- **FR-021**: The Settings Summary MUST carry one line for colors, on the line after the choices line and before the line for how to vote, shown once the Colors step is answered (always, for an existing poll). When no choice has a color set by hand it MUST read "Bar colors are assigned automatically." When one or more have, it MUST read "N color has been set manually:" for one or "N colors have been set manually:" for several, followed by one 24 dp swatch per colored choice, in the order of the choices, each named "<choice>: <color name>", and a full stop. The sentence MUST open the Colors step wherever the Summary's other parts open theirs.

### Key Entities *(include if feature involves data)*

- **Palette**: the ordered list of 18 named colours (name and hex code) a choice can be given; separate from the automatic palette used for bars by rank.
- **Choice colour**: an optional colour on a choice, the palette's hex code, absent for Automatic; it belongs to the choice and travels with its label.
- **Colors step**: the fourth numbered circle of the poll edit card, one row per choice with a colour button and a shared grid of swatches.
- **Colours-only save**: a save for a poll that has votes that changes colours and nothing else, and leaves the poll in its previous state.
- **Edit session**: the hold a poll's editor takes when the card is opened; while it is held the poll is not open for voting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A creator can give two choices colours, from opening the Colors step to leaving it, in under 30 seconds with a pointer and under 60 seconds with the keyboard alone.
- **SC-002**: For all 18 palette colours, label text reaches at least 7:1 contrast on the unfilled part of a bar in light and dark mode, and at least 4.5:1 over the filled part.
- **SC-003**: Setting a colour on any one choice changes the colour of 0 choices left on Automatic, across a test matrix of polls with 2 to 50 choices, with and without Yes or No choices.
- **SC-004**: Every poll that exists before this feature, and every poll with no colour set, shows bars with exactly the colours it showed before (100% unchanged).
- **SC-005**: After a colours-only save, the poll is in the state it was in before the edit, 0 reviews of its text were started, and 100% of its votes still point at their choices.
- **SC-006**: Every colour button and swatch has a target of at least 48 dp, and the whole step can be completed with the keyboard alone and by a screen reader.
- **SC-007**: Adding one colour to the palette list adds one swatch to the grid with 0 other changes, verified by a test that sees 19 swatches.
- **SC-008**: A colour change shows on an already-open card within one content refresh of the poll.

## Assumptions

- The CrowdPoll web app, including its DigitalOcean deployment, is still in development, so no migration or data conversion of existing polls is needed.
- The text colour on the filled part of a bar is below 7:1 for eight of the 18 colours (lowest 4.67:1), as it is for half of the automatic palette; this is accepted. The image's teal `#008488` (4.29:1) is replaced by `#007A7E` (4.88:1).
- The palette is the 18 colours of the Color Palette Editor's revision of the image's palette, in this order, with these names, which are proposals: red `#F91010`, blue `#0808FD`, black `#000000`, darkslategray `#545454`, darkgray `#9E9E9E`, gainsboro `#E0E0E0`, darkred `#880015`, orangered `#FF6601`, yellow `#FFFF00`, greenyellow `#E3E335`, lime `#06D400`, darkgreen `#006120`, teal `#007A7E`, dodgerblue `#0695F5`, darkslateblue `#1A539E`, purple `#800080`, plum `#FF91CB`, saddlebrown `#784315`.
- Labels stay unique within a poll, so a colour can follow its label.
- A bar's colour is not previewed on the edit card in this version; the colour dot is the preview of a chosen colour, because the bar derivation is not available on the administration page; an Automatic choice shows an empty ring, because its bar colour depends on the poll and the ranking.
- Choice ids are reissued whenever choices are saved, as they are today; colours do not depend on them.
- Scope limits: no AI colouring, no free colour picker or typed hex code, no change to the automatic palette, the Yes and No colours or how Automatic choices are coloured, no stable choice ids, no change to search, screening or the vote path, no change to the exports or the results page, and the read-only card and the Settings Summary change only by the line of FR-021, no way to change colours without an edit session, and no colours-only save for a published poll that has no votes.
- The picker is built from the card's existing Material 3 pieces and menu approach; no new dependency is added.
- Text a user reads on screen uses American spelling ("color", "Colors"), like the step's name; this specification's prose uses "colour".
