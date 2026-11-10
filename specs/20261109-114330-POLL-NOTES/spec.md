# Feature Specification: Poll Notes

**Feature Branch**: `poll-notes`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "requirements/20261109-114330-poll-notes/requirements.md"

## Clarifications

### Session 2026-11-09

- Q: Do the poll's JSON and Markdown downloads include the notes? → A: Yes, both, as stored (`**bold**`, `*italic*`, `++underline++`); in the Markdown after the subtitle, and left out when empty.
- Q: Does the Admin Poll Card's read-only face show the notes? → A: Yes, the two-line preview under the summary; clicking it opens step 2 when the poll can be edited.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Write notes for my poll (Priority: P1)

A poll creator adds notes to a poll in step 2 (Title and Tags) of the Admin Poll Card. Two lines of the current notes are shown there, ending with an "... edit ⌄" link. Clicking it opens a small editor in place, under a "Notes" heading, with Cancel and Done at its top right and a fixed toolbar holding only Bold, Italic and Underline. The creator can make text bold, italic or underlined, and nothing else. Done keeps the notes in the card's form, just like typing in Subtitle, and the card's Save or Publish stores them with the rest of the poll. See the mockups `requirements/20261109-114330-poll-notes/poll_notes_wysiwig_editor.jpg` and `poll_notes_editor.jpg`.

**Why this priority**: Notes can't be shown until they can be written, so this story is needed before any other.

**Independent Test**: Open a draft poll's step 2 and click "... edit ⌄". Type text, make words bold, italic and underlined, then click Done and Save. Reopen the poll and check that the notes come back with the same formatting.

**Acceptance Scenarios**:

1. **Given** a poll with no notes, **When** its creator opens step 2, **Then** the notes area is empty and ends with "... edit ⌄".
2. **Given** step 2 is open, **When** the creator clicks "... edit ⌄", **Then** the editor opens in place, the cursor is placed in it, and its toolbar shows Bold, Italic and Underline.
3. **Given** the editor is open, **When** the creator selects text and presses Bold, Italic or Underline (or Ctrl/⌘+B, I or U), **Then** that formatting is turned on or off, and the buttons show which formatting applies at the cursor.
4. **Given** the editor holds changed notes, **When** the creator clicks Done, **Then** the editor closes, step 2 shows the first two lines of the formatted notes, and the focus returns to "... edit ⌄".
5. **Given** the editor holds changed notes, **When** the creator clicks "Next >>" or another numbered step, **Then** the editor closes and keeps the changes, exactly as Done does.
6. **Given** notes were changed with Done, **When** the creator then cancels the card without saving, **Then** the poll keeps its previous notes.
7. **Given** notes were changed with Done, **When** the creator saves or publishes the poll, **Then** the notes are stored, and they look the same when the poll is reopened.
8. **Given** the editor holds changed notes, **When** the creator clicks the editor's Cancel or presses Escape, **Then** the site's usual discard dialog asks first, and confirming it closes the editor without the changes.
9. **Given** the editor holds no changes, **When** the creator clicks Cancel or presses Escape, **Then** the editor closes without asking.

---

### User Story 2 - Read the notes on a poll card (Priority: P1)

Anyone who can see a poll, guests included, sees the start of its notes on the card's front, between the title and the choices: at most two lines, ending in an ellipsis when there is more, with a "Show more ⌄" link below them. See the mockup `poll_notes_location.jpg`.

**Why this priority**: Notes exist so that voters read them. This is the place every voter sees.

**Independent Test**: Give a published poll three paragraphs of notes. Open it as a guest and as a logged-in voter, and check that two lines appear between the title and the choices, with an ellipsis and "Show more ⌄".

**Acceptance Scenarios**:

1. **Given** a poll whose notes are longer than two lines, **When** its card is shown, **Then** two lines of formatted notes appear between the title and the choices, the second ending in an ellipsis, with "Show more ⌄" beneath them.
2. **Given** a poll whose notes fit within two lines, **When** its card is shown, **Then** the notes appear with no ellipsis and no "Show more ⌄".
3. **Given** a poll with no notes, **When** its card is shown, **Then** no notes area and no link appear.
4. **Given** a poll that is OPEN, CLOSED or WAITING TO OPEN, **When** anyone allowed to see it views its card, **Then** the notes appear on the card's front, but not on its back.
5. **Given** a person who may not see a poll, **When** they ask for it, **Then** they get the same not-found answer as today, notes included.
6. **Given** a creator's poll with notes, **When** its Admin Poll Card is shown read-only, **Then** the two-line preview appears under the summary, and clicking it opens step 2 if the poll can be edited.

---

### User Story 3 - Read the full notes in the Maximized view (Priority: P2)

A voter who wants the whole text clicks "Show more ⌄". The Maximized view opens: the card on the left without its preview, and the full formatted notes at the top of the right column, above the line graph. See the mockup `poll_notes_maximized_view.jpg`.

**Why this priority**: Long notes are only useful if they can be read in full, but the two-line preview already delivers value without this story.

**Independent Test**: Click "Show more ⌄" on a card whose notes are long. Check that the Maximized view shows the full notes before the line graph, and that the card itself no longer shows the preview.

**Acceptance Scenarios**:

1. **Given** a card showing "Show more ⌄", **When** the voter clicks it, **Then** the Maximized view opens with the full notes heading the right column, followed by the line graph.
2. **Given** a poll with notes, **When** the Maximized view is opened with the maximize button instead, **Then** the full notes are shown in the same place.
3. **Given** the Maximized view is open, **When** the card is shown in it, **Then** the card hides its notes preview and "Show more ⌄".
4. **Given** a narrow screen with a single column, **When** the Maximized view opens, **Then** the full notes come straight after the card and before the line graph.
5. **Given** a poll without notes, **When** the Maximized view opens, **Then** it looks as it does today.

---

### User Story 4 - Notes are safe, screened and findable (Priority: P2)

Notes can contain no link, image or other active content. Text that looks like a web address stays plain text. Notes are screened for acceptability together with the title, subtitle and choices. Their words help search find the poll, and the poll's public page shows them.

**Why this priority**: Notes are text written by users and shown to everyone, so they must be at least as safe as the fields that exist today. Being searchable is a smaller benefit.

**Independent Test**: Save notes containing `<script>`, a `javascript:` address and a web address, and check that each shows as plain text. Save unacceptable notes on a poll and check that publishing is refused with the new message. Search for a word found only in the notes and check that the poll is found.

**Acceptance Scenarios**:

1. **Given** notes containing markup, a script or a web address, **When** they are shown anywhere, **Then** they appear as the plain text that was typed, and nothing is run, loaded or linked.
2. **Given** content pasted or dropped into the editor, **When** it arrives, **Then** only its plain text is inserted.
3. **Given** notes that fail acceptability screening, **When** the poll is published or an edit is submitted, **Then** it is refused with "Please revise the title, subtitle, notes and choices."
4. **Given** a published poll whose notes contain a word, **When** someone searches for that word, **Then** the poll can be found, ranked below matches in the title, subtitle and choices.
5. **Given** a poll that can be indexed, **When** its public page is loaded, **Then** the formatted notes appear under its summary, and its description for search engines is unchanged.

---

### User Story 5 - Change the notes of a published poll (Priority: P3)

A creator changes the notes of a published poll wherever the subtitle may be changed. Voters see the change when it takes effect, and until then they see the notes as they were before the edit.

**Why this priority**: This follows the editing rules that already exist for the subtitle, so it adds little new behaviour.

**Independent Test**: Edit the notes of an OPEN poll. While the edit is pending, check that voters still see the old notes. When the edit takes effect, check that open cards refresh with the new notes.

**Acceptance Scenarios**:

1. **Given** a poll in a state where its subtitle may be edited, **When** its creator opens step 2, **Then** its notes may be edited too.
2. **Given** a poll that is being edited, **When** voters view it, **Then** they see the notes from before the edit.
3. **Given** a change to the notes takes effect, **When** a voter has the card open, **Then** the card refreshes with the new notes, as it does for a change to the subtitle.
4. **Given** a poll with notes, **When** it is duplicated, **Then** the copy has the same notes, and they are screened when the copy is published.

---

### Edge Cases

- Notes reach 6000 characters: the counter under the field shows the count, Done is disabled above 6000, and the server refuses longer notes with the field-length error used for every other field.
- Formatting marks count toward the 6000, so heavily formatted notes hold slightly less text.
- Notes that contain literal `*`, `+` or `\` keep them exactly as typed, and they are not read as formatting.
- Stored marks that are unbalanced or nested oddly still show safely: anything that does not form a valid mark is shown as text.
- Blank lines and line breaks are kept as typed.
- Notes made only of whitespace count as empty: no notes area appears on the poll card.
- Very long notes in the editor: it grows with its content up to the height of the window minus the site header and its own bar, then scrolls inside, with its heading, buttons and toolbar kept in view at its top.
- A browser shortcut or menu that would insert a heading, list, link or image produces nothing beyond the three kinds of formatting.
- Notes that end exactly at two lines: no ellipsis and no "Show more ⌄" on the poll card. On the Admin Poll Card, "... edit ⌄" always ends the second line.
- A guest or a logged-in voter: both see the notes in the same way.

## Requirements *(mandatory)*

### Functional Requirements

**The notes field**

- **FR-001**: A poll MUST have a notes field, empty by default.
- **FR-002**: Notes MUST hold at most 6000 characters, counted on the stored text with its formatting marks, and the server MUST enforce the limit exactly as it does for every other poll field.
- **FR-003**: Notes MUST allow only bold, italic and underline formatting, plus line breaks. Links, images, headings, lists and any other content MUST NOT be possible.
- **FR-004**: Notes MUST be stored as plain text in which bold, italic and underline are written as `**bold**`, `*italic*` and `++underline++`. A literal `*`, `+` or `\` MUST be written with a backslash in front of it, and line breaks MUST be kept.

**Editing**

- **FR-005**: Step 2 (Title and Tags) of the Admin Poll Card MUST show the first two lines of the formatted notes, never the stored marks, with "... edit ⌄" always at the end of the second line.
- **FR-027**: The Admin Poll Card's read-only face MUST show the two-line preview of the formatted notes under the summary when the poll has notes. Clicking it MUST open step 2 when the editor may open there and notes may change in the poll's state; otherwise it MUST be plain text.
- **FR-006**: Clicking "... edit ⌄" MUST open the editor in place, under a "Notes" heading, with Cancel and Done at its top right and a fixed toolbar above the text that holds only Bold, Italic and Underline.
- **FR-007**: The editor MUST grow with its content up to the height of the window minus the site header and its own bar, then scroll inside, keeping its heading, buttons and toolbar visible.
- **FR-008**: Ctrl/⌘+B, I and U MUST turn the three kinds of formatting on and off, and the toolbar buttons MUST show which ones apply at the cursor.
- **FR-009**: Pasting or dropping into the editor MUST insert plain text only.
- **FR-010**: Done, "Next >>" and every other numbered step MUST close the editor and put the notes into the card's form, as typing does for Subtitle. Only the card's Save or Publish sends them to the server, and the card's Cancel discards them.
- **FR-011**: The editor's Cancel and the Escape key MUST close it without its changes. If the notes were changed, the site's existing discard dialog MUST ask first.
- **FR-012**: A counter under the field MUST show the character count of FR-002, and Done MUST be disabled while it is above 6000.
- **FR-013**: When the editor opens, the focus MUST move into it. When it closes, the focus MUST return to "... edit ⌄". Toolbar buttons MUST have accessible labels and tooltips.
- **FR-014**: Notes MUST be editable in every state in which the subtitle is editable. A change MUST count as a content change, so open cards refresh. While a poll is being edited, voters MUST see the notes from before the edit.
- **FR-015**: The editor MUST work without any third-party library, and the site MUST still make no request to a third party from any page.

**Showing the notes**

- **FR-016**: Saved notes MUST be turned into formatted text on the server by one shared rule. Everything typed is shown as text, and only the three marks and line breaks become formatting. Unsaved notes in the editor are previewed from the editor's own content, with only text, line breaks and the three marks.
- **FR-017**: Everyone allowed to see a poll, guests included, MUST see its notes on the card's front in every state the card is shown in. Notes MUST NOT appear on the card's back or on the admin results page. No new access rule is added.
- **FR-018**: On the poll card, notes MUST appear between the title and the choices in a container in the site's Material 3 style. The preview MUST show at most two lines at body-text size, end in an ellipsis when cut, and show "Show more ⌄" beneath only when cut. A card with no notes MUST show no notes area.
- **FR-019**: The minimum height of a poll card MUST grow by the height of two lines of notes and the "Show more ⌄" link.
- **FR-020**: "Show more ⌄" MUST open the Maximized view. Whenever a poll has notes, however the view was opened, the full formatted notes MUST head the right column before the line graph, or come straight after the card on a single-column layout. The card in that view MUST hide its preview and link.
- **FR-021**: Lists of cards, the creator's admin list included, MUST carry only enough of the notes for the two-line preview, and whether there is more. The full notes MUST come with the single card that the Maximized view asks for, and with one poll's admin details, which the editor opens from.

**Screening, search and public page**

- **FR-022**: Notes MUST be screened for acceptability together with the title, subtitle and choices, and a refusal MUST say "Please revise the title, subtitle, notes and choices."
- **FR-023**: The plain text of the notes MUST be searchable, weighted lowest, level with keywords, in both search back ends, and kept up to date in the way other poll fields are.
- **FR-024**: The public page of an indexable poll MUST show the formatted notes under the summary. Its description for search engines MUST NOT change.
- **FR-025**: Duplicating a poll MUST copy its notes.
- **FR-026**: The poll's JSON and Markdown downloads MUST include the notes as stored, with their formatting marks. In the Markdown download they come after the subtitle and are left out when empty.

### Key Entities *(include if feature involves data)*

- **Poll**: already exists. It gains **notes**: plain text of up to 6000 characters, with three formatting marks, empty by default. Notes are part of the poll's content, like its subtitle.
- **Rendered notes**: the formatted text made from a poll's notes by the shared rule. It is made once for each version of the poll's content, and lists carry a short preview of it while a single card carries all of it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A creator can add formatted notes to a poll and save them in under one minute, without leaving step 2.
- **SC-002**: 100% of tested dangerous inputs (markup, scripts, `javascript:` addresses, web addresses, unbalanced marks) show as plain text, and none runs, loads or links anything.
- **SC-003**: Notes saved and reopened look identical, with the same text, line breaks and formatting, in 100% of round-trip tests, including notes with literal `*`, `+` and `\`.
- **SC-004**: Pages make 0 requests to third-party addresses, and the site adds no third-party dependency for the editor.
- **SC-005**: On every card with notes longer than two lines, the preview shows exactly two lines, and the full notes are one click away.
- **SC-006**: A poll can be found by a word that appears only in its notes, in both search back ends.
- **SC-007**: Card lists download no more than the two-line preview of each poll's notes, however long the notes are.

## Assumptions

- The decisions behind this specification are recorded in `requirements/20261109-114330-poll-notes/requirements-report.md`: 23 findings, 21 resolved and 2 no longer applicable. The requirements' "Decisions from the requirements report" and its Additional Requirements override the earlier sentences that name Milkdown and Markdown.
- The editor is CrowdPoll's own and has no dependency. It relies on a browser editing feature that is deprecated but supported by every current browser. Its use is kept in one place, so that it can be replaced if browsers drop it.
- The editor's buttons are Cancel and Done, not Save as in the original text, because the card's own Save stores the poll.
- Notes are shown wherever the poll card front and the Maximized view are shown today. No other place, such as emails or the admin results page, gains notes.
- The 6000-character limit uses the same counting as other poll fields.
- Search ranking places notes at the lowest weight. No new search setting is added.
- The four mockups in the requirements folder show placement and appearance. They are not pixel-exact designs.
