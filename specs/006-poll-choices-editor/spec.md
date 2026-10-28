# Feature Specification: Poll Choices Editor

**Feature Branch**: `006-poll-choices-editor`

**Created**: 2026-08-13

**Status**: Draft

**Input**: User description: "using ./designDocs/006-high-level-requirements-poll-choices-editor.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edit All Choices as One List (Priority: P1)

An admin editing a poll's choices currently works through a stack of individual rows, each
with its own text box and "Remove" button, plus a separate "+ Add Choice" button to append a
new row. Instead, the admin wants to see and edit every choice as plain lines of text in a
single box — one choice per line — and save the whole list in one action, the same way the
reference "smart textbox" component works.

**Why this priority**: This is the entire point of the feature — replacing the per-row
editing mechanism with a single free-text box is what "make it easier for the user" means
here. Nothing else in this feature has value without it.

**Independent Test**: Open a poll's editor, confirm its existing choices appear one per line
in a single text box, edit the text (change a line, add a new line, delete a line), click
"Save Choices," and confirm the poll's stored choices reflect exactly what was saved —
including on a poll where one of its choices already has votes.

**Acceptance Scenarios**:

1. **Given** a poll's editor page, **When** it loads, **Then** its current active choices
   appear in a single text box, one choice's label per line, in their existing display order,
   and no "Save Choices" button is visible yet (nothing has been changed).
2. **Given** the choices text box, **When** the admin types a change (edits a line, adds a
   new line, or deletes a line), **Then** a "Save Choices" button appears.
3. **Given** unsaved changes in the text box, **When** the admin clicks "Save Choices," **Then**
   the poll's choices are updated to match the box's final content (blank lines ignored,
   each line trimmed), the button disappears again, and the box no longer shows unsaved-state
   styling.
4. **Given** a text box holding fewer than 2 non-blank lines, **When** the admin attempts to
   save, **Then** the save is rejected and the admin is told at least 2 choices are required —
   matching today's minimum.
5. **Given** a text box holding more than 50 non-blank lines, **When** the admin attempts to
   save, **Then** the save is rejected (or the excess is prevented from being entered in the
   first place — see User Story 2) — matching today's maximum of 50.
6. **Given** two lines in the box that are identical after trimming, **When** the admin
   attempts to save, **Then** the save is rejected and the admin is told the label is
   duplicated — matching today's no-duplicate-active-label rule.
7. **Given** a poll where one existing choice already has at least one vote, **When** the
   admin saves a list that no longer includes that choice, **Then** the save proceeds and
   that choice is gone from the poll's active choices — "Save Choices" replaces the whole
   active list outright rather than preserving a removed choice's identity or vote history
   (see FR-006/FR-007; this differs from today's single-choice "Remove" behavior).
8. **Given** the poll editor page, **When** the admin views it, **Then** any choices marked
   removed by the *old* per-choice "Remove" action (from before this feature existed, or
   from a poll never edited with the new box) remain visible below the editable list exactly
   as they are today — this feature does not delete that historical record, it simply stops
   creating new entries in it (FR-008).

---

### User Story 2 - Guided, Mistake-Resistant Typing (Priority: P2)

While editing the choices list, the admin gets immediate, in-the-moment guidance instead of
finding out about a problem only after clicking "Save" — matching the reference component's
"smart" behavior: blank lines can't be created, a running count of how many choices are
entered is always visible, and the box won't let the admin exceed the maximum.

**Why this priority**: This is a usability refinement on top of User Story 1's core
replacement — the box is fully usable (and everything can still be validated at save time)
without it, but it's what makes the new editor meaningfully easier than the old one rather
than just differently shaped.

**Independent Test**: Type into the choices box and confirm blank lines, over-length lines,
and an excess number of lines are all prevented or cleaned up as they happen, with a visible
running count, independent of whether a save has occurred.

**Acceptance Scenarios**:

1. **Given** the choices text box, **When** the admin presses Enter while the current line is
   empty (or only whitespace), **Then** a new line is not started.
2. **Given** the choices text box, **When** the admin types past 100 characters on a line,
   **Then** further characters on that line are not accepted.
3. **Given** the choices text box, **When** the admin pastes text containing blank lines or
   lines over 100 characters, **Then** the blank lines are removed and the long lines are
   shortened to 100 characters automatically.
4. **Given** the choices text box holding 50 non-blank lines, **When** the admin tries to add
   a 51st, **Then** the box does not accept it.
5. **Given** the choices text box, **When** its content changes, **Then** a live count of the
   current number of choices is shown next to it, out of the maximum of 50.
6. **Given** the choices text box holding fewer than 2 non-blank lines, **When** the admin
   looks at "Save Choices," **Then** it is visibly disabled (not just rejected after the
   fact) until at least 2 remain.

### Edge Cases

- Deleting (or simply rewording) a line for a choice that already has votes discards that
  choice and its vote history as part of the same save — there is no confirmation step or
  warning before this happens (FR-006/FR-007). This is a deliberate simplification versus
  today's single-choice "Remove," not an oversight — see FR-006.
- A save that would leave two lines with identical trimmed text is rejected with the same
  duplicate-label message the single-choice editor gives today, even though the box no
  longer edits one choice at a time.
- Leaving the choices box (e.g., clicking elsewhere on the page) without clicking "Save
  Choices" discards the in-progress edit — matching the reference component, and consistent
  with "Save Choices" being an explicit action rather than autosave-on-blur like the page's
  other fields.
- Pasting a very large block of text (well over 50 lines, or lines far longer than 100
  characters) is cleaned up the same way ordinary typing is (User Story 2, Acceptance
  Scenario 3), not rejected outright.
- Emptying the box entirely (zero lines) is treated the same as "fewer than 2 choices" — save
  is blocked, not an error state different from any other under-the-minimum case.
- A participant who had voted on a choice that a save just removed is not left referencing a
  choice that no longer exists — their vote is cleared for that choice, same as it would be
  if the choice were removed any other way (FR-007).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The poll editor's Choices section MUST present all of a poll's active (non-removed)
  choices as one choice per line in a single multi-line text box, replacing today's stacked
  individual choice rows, their individual "Remove" buttons, and the separate "+ Add Choice"
  button.
- **FR-002**: The system MUST provide a single "Save Choices" action that commits the text
  box's current content as the poll's new set of active choices, replacing today's
  save-per-row/add-one/remove-one actions.
- **FR-003**: The "Save Choices" action MUST only be visible/available once the admin has
  changed the box's content since it was last loaded or saved, and MUST return to hidden
  (or disabled, per FR-009) immediately after a successful save.
- **FR-004**: The system MUST continue to enforce a minimum of 2 and a maximum of 50 active
  choices, and a maximum of 100 characters per choice label — the same limits already
  enforced today — evaluated against the text box's non-blank, trimmed lines.
- **FR-005**: The system MUST continue to reject a save that would leave two active choices
  with the same label (after trimming), matching today's duplicate-label rule.
- **FR-006**: "Save Choices" MUST replace the poll's entire set of active choices with the
  text box's final content outright — a full replacement, not a reconciliation against the
  previous list. No attempt is made to preserve an existing choice's identity or vote history
  because its line was edited, reordered, or removed; this matches the reference
  component's own behavior and is a deliberate simplification versus today's single-choice
  "Remove" action (which soft-removes a voted choice into an audit trail — see FR-008 for
  what happens to *that* existing behavior/data).
- **FR-007**: Any vote that was cast for a choice no longer present after a save MUST NOT be
  left referencing a choice that no longer exists — it MUST be cleared, so a participant
  whose entire vote was on a removed choice is left "not yet voted" and can vote again,
  exactly as if nothing referenced the deleted choice.
- **FR-008**: Choices already marked removed (audited) by the *prior* single-choice "Remove"
  action — from before this feature existed — MUST remain visible on the poll editor page
  exactly as they are today. This feature does not delete that historical record; it simply
  stops producing new entries in it going forward, since FR-006 no longer soft-removes a
  voted choice when it drops out of a save.
- **FR-009**: While the text box holds fewer than 2 non-blank lines, "Save Choices" MUST be
  disabled (in addition to FR-004's save-time enforcement), so the admin sees the constraint
  before attempting to save, not only after.
- **FR-010**: The text box MUST NOT allow a blank (empty-or-whitespace-only) line to be
  created by pressing Enter on an empty line, and MUST strip any blank lines introduced by
  paste or programmatic input.
- **FR-011**: The text box MUST NOT allow more than 100 characters to accumulate on a single
  line, whether by typing or by paste (excess characters on a pasted line are dropped, not
  rejected outright).
- **FR-012**: The text box MUST NOT allow more than 50 non-blank lines to accumulate, whether
  by typing or by paste (excess lines are dropped, not rejected outright).
- **FR-013**: The system MUST display a live count of the current number of non-blank lines
  next to the text box, alongside the maximum of 50, updating as the admin types.
- **FR-014**: The Choices section's visual styling (text box, count indicator, and "Save
  Choices" button) MUST match the poll editor page's existing look (fonts, colors, spacing,
  borders) rather than the reference implementation's own styling.

### Key Entities *(include if feature involves data)*

- **Poll**: The poll being edited. Relevant attribute for this feature: its ordered list of
  choices (each with a label, a display position, an identity, a removed/active state, and
  any votes already cast against it) — a save under FR-006 replaces this list outright.
- **Choice**: A single option on a poll. This feature changes both how an admin edits the set
  of active choices (via one shared text box instead of one row per choice) and what happens
  to a choice's identity/votes when it's edited or removed via that box (FR-006) — a
  departure from how the prior single-choice "Remove" action preserved a voted choice's
  audit trail (still true for any choice removed *that* way before this feature existed,
  FR-008).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can go from a poll's current choice list to a fully revised list
  (some edited, some added, some removed) and have it saved in a single explicit action,
  without navigating away from the Choices section.
- **SC-002**: Typing a blank line, a line over 100 characters, or a 51st choice is prevented
  or auto-corrected at the moment it happens, not only reported after an attempted save.
- **SC-003**: After any save, every remaining vote references a choice that is still present
  in the poll's active list — no vote is ever left pointing at a choice that no longer
  exists.
- **SC-004**: The Choices section is visually indistinguishable, in styling, from the rest of
  the poll editor page it lives on.

## Assumptions

- The 2/50/100 limits (minimum choices, maximum choices, maximum label length) are unchanged
  from today's enforced values — the reference component's own constants happen to already
  match them exactly, so no new limit is being introduced.
- "Save Choices" is an explicit, click-triggered action rather than autosave-on-blur (unlike
  the page's Title/Subtitle fields) — the source design document names "Save Choices button"
  as one of the three elements being ported over, which only makes sense if it is a real,
  user-triggered action rather than an autosave indicator.
- The existing duplicate-active-label rule (today enforced when editing one choice at a
  time) continues to apply to the saved list as a whole — the reference component doesn't
  implement this check itself (it has no concept of "the rest of the app's choices"), but
  nothing in the source design document asks for this existing data-integrity rule to be
  relaxed, only for the editing mechanism to change.
- The already-removed (audited) choices list already shown on the poll editor page (for
  admin audit purposes) is unaffected by this feature and keeps being displayed as it is
  today — the source design document names the active-choice textbox, "Remove" buttons, and
  "Add Choice" button as what's being replaced, and doesn't mention the removed-choices
  display.
- Inline feedback messages (blank line blocked, character cap reached, line cap reached,
  saved successfully, save rejected) are shown using the poll editor page's existing inline
  error/feedback element for the Choices section, in the same place today's "could not
  remove"/"could not add" messages appear — the reference component leaves its own messaging
  hook deliberately unimplemented ("wire this to your app's own toast / inline-validation
  component").
- Reordering existing choices' text within the box (e.g., cutting and pasting lines into a
  different order) is treated as an ordinary edit, not a special "reorder" operation with its
  own rules — under FR-006's full-replace approach, the saved list's line order simply
  becomes the new display order for all active choices.
- This feature intentionally retires the vote-preserving "soft remove" behavior for the
  *active-choice editing path* going forward (FR-006) — a deliberate, explicit product
  decision (not an oversight) to adopt the reference component's simpler, ID-less model.
  Choices already marked removed from before this feature shipped are historical data and
  are unaffected (FR-008).
