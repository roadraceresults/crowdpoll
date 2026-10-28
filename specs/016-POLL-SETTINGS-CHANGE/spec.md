# Feature Specification: Poll Settings Change

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-09-14

**Status**: Draft

**Input**: User description: "using designDocs/016-high-level-requirements-POLL-SETTINGS-CHANGE.md"

**Source requirements**: `designDocs/016-high-level-requirements-POLL-SETTINGS-CHANGE.md` (92 lines)
**Architecture**: `architecture/016-poll-settings-change/architecture.md` — 12 findings raised and resolved

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose a poll's visibility in three plain decisions (Priority: P1)

An administrator editing a poll decides whether it is public or private with a single two-way
choice. If they choose private, two further two-way choices appear beneath it: whether anyone
with the link may take part or only invited people, and whether the votes are anonymous. If
they choose public, those two choices are not shown, because they do not apply.

Today those three decisions are compressed into one five-way list of long phrases
("Private Poll - Invitation Only - Do Not Show Who Voted"), which is hard to scan and hides the
fact that two of the decisions are independent of each other.

**Why this priority**: It is the whole reason for the feature — every other story exists to keep
the surrounding behaviour intact while this change lands.

**Independent Test**: Open any poll that has never been voted on for editing. The visibility
control offers exactly two options; choosing "Private Poll" reveals the two further controls
with sensible defaults pre-selected; choosing "Public Poll" hides them again; saving persists
whatever was chosen and the read-only card shows it.

**Acceptance Scenarios**:

1. **Given** a poll open for editing, **When** the administrator looks at the visibility
   control, **Then** it offers exactly "Public Poll" and "Private Poll" and nothing else.
2. **Given** the visibility is "Public Poll", **When** the administrator views the card,
   **Then** no sharing-mode or anonymity control is shown.
3. **Given** the visibility is switched to "Private Poll", **When** the card updates,
   **Then** a "Sharing Mode" control (Anyone With The Link / Invitation Only) and an
   "Anonymous Votes" control (Yes / No) appear immediately after the visibility control, in that
   order, with the poll's stored values pre-selected.
4. **Given** a newly created poll, **When** its visibility is first switched to "Private Poll",
   **Then** "Anyone With The Link" and "Anonymous Votes: Yes" are pre-selected.
5. **Given** a private poll set to "Invitation Only" and "Anonymous Votes: No", **When** the
   administrator switches it to "Public Poll" and then back to "Private Poll" without saving,
   **Then** "Invitation Only" and "No" are still selected — nothing was cleared.
6. **Given** any combination of the three choices, **When** the administrator saves and the card
   returns to read-only form, **Then** the card shows the visibility and, for a private poll, the
   sharing mode and anonymity values, in the same position the controls occupied, and the card's
   height does not change between the two forms.

---

### User Story 2 - Settings freeze once anyone has voted (Priority: P2)

Once a poll has received a vote, its visibility, sharing mode and anonymity can no longer be
changed — by anyone, by any means. The controls are shown disabled with their current values,
and a change attempted around the controls is refused with a clear reason.

**Why this priority**: Voters took part under a particular set of promises (who can see the poll,
who can see their vote). Changing those after the fact would break the promise; the existing
rule for visibility already protects it and must extend to the two new decisions.

**Independent Test**: Cast one vote on a private poll, then open it for editing: all three
controls are disabled. Delete that vote and reopen: they are still disabled. Submit a change to
any of the three by a route other than the controls: it is refused and the poll is unchanged.

**Acceptance Scenarios**:

1. **Given** a poll that has received at least one vote, **When** an administrator opens it for
   editing, **Then** the visibility, sharing-mode and anonymity controls are disabled and show the
   poll's current values.
2. **Given** a poll whose only vote has since been deleted, **When** an administrator opens it for
   editing, **Then** the three controls are still disabled — having ever been voted on is what
   freezes them.
3. **Given** a poll that has received a vote, **When** a change to any of the three settings is
   submitted other than through the disabled controls, **Then** the change is refused with a
   message naming the setting, and the poll's settings are unchanged.
4. **Given** a poll that has never been voted on, **When** any of the three settings is changed
   and saved, **Then** the change is accepted.

---

### User Story 3 - Invitation-only polls keep working exactly as before (Priority: P3)

Everything that today depends on a poll being "invitation only" — who may open it, who may vote,
how the participants section is labelled, whether invited people see it on their home page, what
a duplicate copies — continues to behave identically, now driven by the combination of
"Private Poll" and "Invitation Only" instead of a phrase inside the old visibility value.

**Why this priority**: This story delivers no new capability, but it is where the feature can
silently break: if any one of these behaviours is left keyed on the old phrase, invitation-only
polls become open to anyone with no error anywhere.

**Independent Test**: Create a private, invitation-only poll with one invited address. A visitor
who is not invited cannot open or vote on it; the invited visitor can, and sees it on their home
page; the participants section is labelled as invitations; a duplicate of it is also
invitation-only and carries the same invited list. Repeat with "Anyone With The Link": the
uninvited visitor can now open it by link.

**Acceptance Scenarios**:

1. **Given** a private poll set to "Invitation Only" and a visitor not on its invited list,
   **When** the visitor opens the poll's link, **Then** they are refused exactly as today.
2. **Given** the same poll and a visitor on its invited list, **When** they sign in, **Then** the
   poll appears on their home page and they can vote on it.
3. **Given** a private poll set to "Anyone With The Link", **When** any visitor opens its link,
   **Then** they can view and vote on it, as an "anyone with the link" poll allows today.
4. **Given** a **public** poll whose stored sharing mode happens to be "Invitation Only",
   **When** any visitor opens it, **Then** it behaves as a public poll — the sharing mode is
   ignored for public polls.
5. **Given** a private "Invitation Only" poll, **When** an administrator views its participants
   section, **Then** it is labelled and behaves as the invitations list, with the invite control
   present; for any other poll it is the participants list, as today.
6. **Given** a private "Invitation Only" poll with invited and banned addresses, **When** an
   administrator duplicates it, **Then** the duplicate has the same visibility, sharing mode and
   anonymity, and carries the same invited and banned lists.
7. **Given** a private "Anyone With The Link" poll, **When** an administrator duplicates it,
   **Then** the duplicate carries no invited or banned list, as today.

---

### User Story 4 - Administrators see the new settings everywhere; voters see nothing new (Priority: P4)

Every administrative view of a poll — the list, the detail, the result of saving or duplicating —
includes the sharing mode and anonymity values. The views a voter receives do not change at all.

**Why this priority**: It completes the administrator's picture and confirms the feature has no
voter-facing footprint, which is what keeps its scope small.

**Independent Test**: Compare an administrator's view of a private poll and a voter's view of the
same poll: the former carries both new values, the latter carries neither and is otherwise
identical to today's.

**Acceptance Scenarios**:

1. **Given** any poll, **When** an administrator retrieves the poll list, a single poll, or the
   result of saving or duplicating one, **Then** each poll carries its sharing mode and anonymity
   values alongside its visibility.
2. **Given** any poll, **When** a voter retrieves the home page listing or a single poll,
   **Then** neither the sharing mode nor the anonymity value is present, and the rest of the
   response is unchanged from today.

---

### Edge Cases

- A public poll carries stored sharing-mode and anonymity values: they are ignored by every rule
  that reads them, and never shown to the administrator while the poll is public.
- A setting is submitted with a value outside its two options: it is refused with a message naming
  the setting, and nothing is saved.
- The sharing mode is changed on a private poll that already has an invited list, from
  "Invitation Only" to "Anyone With The Link": the invited list is kept as stored (it is simply
  not consulted), exactly as switching visibility away from invitation-only behaves today.
- An administrator changes the anonymity setting: nothing observable changes anywhere yet, because
  no poll-creator role exists to be governed by it; the value is stored for the feature that
  introduces that role.
- Existing polls carry a visibility value that no longer exists: they are not converted; all
  stored polls and their vote history are deleted as a release step, and accounts are untouched.
- The visibility control is disabled because the poll has been voted on, and the poll is private:
  the two dependent controls are shown (disabled) so the administrator can read the settings.

## Requirements *(mandatory)*

### Functional Requirements

#### The visibility setting

- **FR-001**: A poll's visibility MUST have exactly two values, "Public Poll" and "Private Poll";
  the previous five values MUST no longer be accepted or offered anywhere.
- **FR-002**: A poll MUST carry a sharing mode with exactly two values, "Anyone With The Link" and
  "Invitation Only", and an anonymity setting with exactly two values, "Yes" and "No".
- **FR-003**: Both new settings MUST be present on every poll, public or private, from the moment
  the poll is created; a new poll MUST start with "Anyone With The Link" and anonymity "Yes".
- **FR-004**: The two new settings MUST never be cleared. Switching a poll to public MUST leave
  their stored values unchanged, and switching it back to private MUST present those values.
- **FR-005**: For a public poll, every rule that reads the sharing mode or the anonymity setting
  MUST ignore them and treat the poll as public.
- **FR-006**: A poll MUST be treated as invitation-only if, and only if, its visibility is
  "Private Poll" **and** its sharing mode is "Invitation Only". Every behaviour that today depends
  on a poll being invitation-only — view eligibility, vote eligibility, saving the invited list,
  the invited-visitor home page listing, the participants section's form and label, and what a
  duplicate copies — MUST use this definition.
- **FR-007**: The three settings MUST be stored and displayed in the same words, with no separate
  presentation form.

#### The administrator's card

- **FR-008**: In editing form the card MUST offer the visibility as a two-option choice; the
  sharing mode and anonymity MUST be offered as two-option choices captioned "Sharing Mode" and
  "Anonymous Votes", placed immediately after the visibility choice, in that order.
- **FR-009**: The sharing-mode and anonymity choices MUST be shown only while the visibility
  choice is "Private Poll", following the current selection in the editing form, not the last
  saved value.
- **FR-010**: In read-only form the card MUST show the visibility and, for a private poll, the
  sharing mode and anonymity values, in the same position the choices occupy in editing form, so
  that switching forms does not change the card's height.
- **FR-011**: Once a poll has ever received a vote, all three choices MUST be disabled in editing
  form, showing the poll's current values; deleting votes MUST NOT re-enable them.
- **FR-012**: The existing rule that a public poll carries no voter limit, and that the limit
  control is unavailable while the visibility is "Public Poll", MUST be unchanged.

#### Saving

- **FR-013**: A change to the visibility, sharing mode or anonymity of a poll that has ever
  received a vote MUST be refused with a message naming the setting, regardless of how the change
  was submitted, and MUST leave the poll unchanged.
- **FR-014**: A submitted visibility, sharing mode or anonymity value outside its permitted
  options MUST be refused with a message naming the setting, and nothing MUST be saved.
- **FR-015**: Duplicating a poll MUST copy its visibility, sharing mode and anonymity, and MUST
  copy its invited and banned lists only when the source is invitation-only per FR-006.

#### Who may see who voted

- **FR-016**: Administrators MUST continue to see who voted for which choice on every poll,
  regardless of the anonymity setting.
- **FR-017**: Voters who did not create a poll MUST never see who voted for which choice,
  regardless of the anonymity setting — unchanged from today.
- **FR-018**: The anonymity setting's effect on a poll's creator (a creator sees who voted for
  which choice only when anonymity is "No", and always sees totals) is defined here but MUST NOT
  be implemented in this feature: no creator role exists yet. The setting MUST be stored,
  validated, edited and shown to administrators, and nothing else MUST read it.

#### Administrator and voter views

- **FR-019**: Every administrator view that carries a poll's visibility — the poll list, a single
  poll, and the result of saving or duplicating — MUST also carry its sharing mode and anonymity.
- **FR-020**: Voter-facing views (the home page listing and a single poll) MUST NOT carry the
  sharing mode or anonymity, and MUST be otherwise unchanged.
- **FR-021**: The published description of the administrator and voter views MUST be updated in
  the same change so it matches FR-019 and FR-020.

#### Release

- **FR-022**: No existing poll MUST be converted. As a release step, all stored polls and their
  vote history MUST be deleted; account, sign-in and email-change data MUST NOT be touched, so no
  account is lost and nobody is signed out.

### Key Entities

- **Poll visibility**: Whether a poll is open to everyone ("Public Poll") or restricted
  ("Private Poll"). One of two values; frozen once the poll has ever been voted on.
- **Sharing mode**: For a private poll, whether anyone holding the link may take part or only
  invited people. Always present; meaningful only while the poll is private; frozen once voted on.
- **Anonymity setting**: For a private poll, whether the poll's creator may see who voted for
  which choice ("No") or only totals ("Yes"). Always present; meaningful only while the poll is
  private; frozen once voted on; not yet read by anything, pending a creator role.
- **Invitation-only poll**: A private poll whose sharing mode is "Invitation Only". The single
  definition every invitation-dependent behaviour uses.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can make a poll private, invitation-only and non-anonymous in three
  selections, each from a control with exactly two options, with no option text longer than four
  words.
- **SC-002**: 100% of the invitation-only behaviours listed in FR-006 produce the same outcome for
  the same visitor before and after this feature, verified by the existing tests for each
  behaviour passing against polls defined with the new settings.
- **SC-003**: On a poll that has ever been voted on, 0 of the three settings can be changed by any
  route — every attempt is refused with a message naming the setting.
- **SC-004**: A public poll's stored sharing mode has no observable effect: an uninvited visitor
  opens a public poll set to "Invitation Only" with the same result as one set to "Anyone With
  The Link".
- **SC-005**: Switching a card between read-only and editing form changes its height by 0 pixels
  for both public and private polls.
- **SC-006**: 0 voter-facing responses contain the sharing mode or anonymity value.
- **SC-007**: After release, 0 accounts are lost and 0 sessions are ended; the poll list is empty.
- **SC-008**: Every existing test suite passes with the old visibility values removed and no test
  still naming them.

## Assumptions

- "Has received votes" means the poll has ever been voted on, the same rule that already freezes
  visibility today; this is stated in the source requirements.
- Both new settings are validated against their two permitted values on every save, following
  the existing pattern for visibility.
- The two dependent controls are hidden (not merely disabled) while a poll is public, as the
  source requirements say "only visible"; when a poll is private but frozen, they are shown
  disabled.
- The anonymity setting has no effect on exports or the administrator results page, since the
  source grants administrators full visibility regardless.
- The sharing mode and anonymity of a duplicate are copied verbatim, as every other setting is.
- The release-step deletion of stored polls and vote history follows the procedure the previous
  feature used for its own settings rename.
- No environment variable is added or changed.
- The datastore change and search feature (`017`) are sequenced after this feature and are not in
  scope; they will read the two-valued visibility and the two new settings as given here.
