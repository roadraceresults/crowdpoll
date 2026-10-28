# Feature Specification: Live Results X

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "020-high-level-requirements-LIVE-RESULTS-X.md"

**Source requirements**: `designDocs/020-high-level-requirements-LIVE-RESULTS-X.md` (51 lines,
carrying the twelve resolutions of the architecture passes) with the mockup
`designDocs/dontTrack/liveResultsX.jpg`
**Architecture**: `architecture/020-live-results-x/architecture.md` — 12 findings raised and
resolved across two runs; two breaking changes documented

## Clarifications

### Session 2026-09-22

- Q: Where does focus go when the member removes the **bottom** card of several, so no card takes the vacated position and the tab is not empty? → A: Focus the card that now occupies the vacated position; when there is none, focus the same control on the **previous** card (the tab's empty-state line remains the target only when the tab is left empty).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Take a poll off the Live Results tab from the bottom row (Priority: P1)

A member watching several polls on the Live Results tab decides they are done with one. The card's
bottom row — where every other tab offers "Live Results" beside three animated bars — offers
**Live Results** beside a small **X**. They press it and the card leaves the tab; the other cards
stay, the tab stays open, and nothing else about the card has moved. No X sits in the card's
corner any more.

**Why this priority**: It is the feature. The control's new position and its unchanged effect are
the whole of what the requirements ask for.

**Independent Test**: With two polls on the Live Results tab, press the X-and-label link on one:
that card goes, the other remains, the tab stays active, and the server no longer lists the
removed poll for that session. Compare a card on any other tab: it still shows the animated bars,
still says "Live Results", and still adds a poll.

**Acceptance Scenarios**:

1. **Given** a member with two polls on the Live Results tab, **When** they press the link on one
   card, **Then** that card leaves the tab, the other stays, and the tab remains the open one.
2. **Given** the same member, **When** they look at the card's top-right corner, **Then** they see
   only the Favorites star — no X.
3. **Given** a card on any other tab, **When** the member looks at its bottom row, **Then** it
   shows the animated bars before "Live Results" and pressing it still adds the poll to the Live
   Results tab.
4. **Given** the last poll on the Live Results tab, **When** the member removes it, **Then** the
   tab stays open showing its "press Live Results on a poll to watch it here" line, exactly as it
   does today.
5. **Given** a member hovering the link on either tab, **When** they look at it, **Then** the
   label takes the same underline it takes today and the icon itself does not change.

---

### User Story 2 - The control is there whatever the poll is doing (Priority: P2)

A member is watching a poll that closes while they watch it, and another that an administrator has
opened for editing. Both cards still offer the same X-and-label link, so either can be taken off
the tab. The "poll closed" and "being edited" notes sit beside the link in the same row, as they
sit beside the hidden Vote button today.

**Why this priority**: Without it the feature is a regression — the corner X was always there, and
every watched poll eventually closes.

**Independent Test**: Watch a poll, close it from the admin page, refresh the tab: the card shows
its closed note **and** the link. Press the link: the card goes. Repeat with a poll opened for
editing.

**Acceptance Scenarios**:

1. **Given** a poll being watched on the Live Results tab, **When** it closes, **Then** the card
   shows the closed note and still offers the link, and pressing it removes the poll.
2. **Given** a poll being watched, **When** an administrator opens it for editing, **Then** the
   card shows the editing note and still offers the link, and pressing it removes the poll.
3. **Given** a member who may not vote in a watched poll (removed from it, not invited, or the
   poll is full), **When** they view the card, **Then** the blocked note and the link are both
   shown, exactly as the blocked note and the corner X are today.
4. **Given** a card on any other tab whose poll is closed or being edited, **When** the member
   views its bottom row, **Then** no Live Results link is offered — unchanged from today, because
   such a poll may not be added.
5. **Given** a member who has flipped a Live Results card to its voting face, **When** they look
   for the link, **Then** it is on the front face only — as the corner X is today — and the Back
   arrow returns them to it.

---

### User Story 3 - The control works from the keyboard, and does not lose the member's place (Priority: P3)

A member navigating by keyboard tabs to the link on a Live Results card and presses Space. The
poll is removed, the page does not scroll, and the focus lands on the same link of the card that
took its place — so they can remove a second poll with one more press, without tabbing from the
top of the page.

**Why this priority**: The control announces itself as a button, and the one it replaces is a real
button that answers both keys. Losing focus after every removal would make keyboard use worse than
before the change.

**Independent Test**: With three polls on the tab, tab to the first card's link, press Space, then
press Space again without touching the mouse: two polls are removed.

**Acceptance Scenarios**:

1. **Given** a member using the keyboard, **When** they tab through a Live Results card, **Then**
   the link takes focus and shows a visible focus indication.
2. **Given** the link has focus, **When** they press Enter, **Then** the poll is removed; **and**
   when they press Space, **Then** the poll is removed and the page does not scroll.
3. **Given** a removal from the keyboard with cards after it, **When** the card goes, **Then**
   focus moves to the same link on the card that takes its place.
4. **Given** a removal of the bottom card from the keyboard with cards before it, **When** the
   card goes, **Then** focus moves to the same link on the previous card.
5. **Given** a removal of the only remaining card from the keyboard, **Then** focus moves to the
   tab's empty-state line.
6. **Given** a member on any other tab, **When** the link has focus, **Then** Enter and Space both
   add the poll, just as a mouse click does.

---

### Edge Cases

- **The removal is refused because the member asked too soon**: the link behaves exactly as the
  corner X does today — the member is told how long to wait and nothing is sent.
- **The removal fails on the network**: the card stays, as today; the member may press again.
- **Two windows of the same session**: removing in one leaves the other's copy until its next
  refresh, unchanged from today.
- **The removed card was the bottom one of several**: focus moves to the previous card's link, so
  a member removing from the end of the list can keep pressing without tabbing.
- **A poll is removed by another window while a card has focus**: the card disappears on the next
  refresh, and focus falls back as it does for any card the tab drops — this feature governs only
  focus after a removal the member performed.
- **The poll's card is flipped to the voting face**: the link, like the corner X before it, is a
  front-face control; the Back arrow returns to it.
- **A card whose poll is closed and whose member may not vote**: both notes follow today's
  precedence rules; the link is shown regardless.
- **Reduced-motion or guest settings**: the X never animates in any case; the rules that freeze
  the three bars continue to apply to the bars alone, on the tabs that show them.
- **A very narrow window**: the bottom row keeps today's behaviour — the link at the left, the
  Vote button at the right, with the notes in the same row.

## Requirements *(mandatory)*

### Functional Requirements

**The control's new form and position**

- **FR-001**: On the Live Results tab, each poll card MUST offer the removal control in its bottom
  row, at the left, as an icon followed by the words **Live Results** — the position, spacing and
  label every other tab uses for its Live Results link.
- **FR-002**: The icon in that form MUST be a plain X — two crossed strokes in the link's own
  colour, with no border or background — drawn in the same box the three animated bars occupy, so
  the label sits where it does on every other tab.
- **FR-003**: The removal control MUST NOT appear anywhere else on the card; no poll card on any
  tab MAY show an X in its title row after this feature.
- **FR-004**: With the corner control gone, the Favorites star MUST sit in the title row exactly as
  it does on every other tab.
- **FR-005**: On every tab other than Live Results, the bottom-row link MUST be unchanged — the
  animated bars, the label, the tooltip "Add to Live Results", and the behaviour of adding the poll
  to the Live Results tab.

**What it says and does**

- **FR-006**: Activating the control on the Live Results tab MUST remove the poll from that tab in
  exactly the way the corner control does today: the same request, the same allowance rules, the
  same refusal message when the member asks too soon, the same updated list of watched polls, the
  same behaviour when the removed poll was the last one.
- **FR-007**: The visible words MUST be "Live Results" in both forms. The tooltip and the
  accessible name MUST follow the action: "Remove from Live Results" on the Live Results tab,
  "Add to Live Results" everywhere else.
- **FR-008**: The link MUST keep exactly one hover treatment — the label's underline — in both
  forms; the icon MUST NOT take a hover, colour or size change of its own, and the focus
  indication MUST be as it is today.
- **FR-009**: The X MUST be static in every state; the rules that freeze the animated bars for
  reduced-motion and guest viewers continue to govern the bars alone.

**When it is shown**

- **FR-010**: On the Live Results tab the control MUST be shown for **every** poll on the tab,
  whatever the poll's state — including a poll that closed while it was being watched and a poll
  an administrator has opened for editing.
- **FR-011**: The "poll closed" and "being edited" notes MUST keep their place in the same row
  beside the control, as they do today beside the hidden Vote button, and their precedence rules
  MUST NOT change.
- **FR-012**: On every other tab the control MUST continue to be hidden for a closed or
  being-edited poll, because in its add form neither may be added.
- **FR-013**: The control MUST be a front-face control in both forms; the card's voting face keeps
  its Back and Submit controls, and the Back control returns the member to the front face.

**Keyboard**

- **FR-014**: The control MUST be reachable by Tab and MUST be activated by **both** Enter and
  Space, in both forms; activating it with Space MUST NOT scroll the page.
- **FR-015**: After a removal performed by the member, focus MUST move to the same control on the
  card that now occupies the vacated position; when no card does — the removed card was the last
  in the grid but others remain — focus MUST move to that control on the **previous** card; and
  when the tab is left with no cards at all, focus MUST move to the tab's empty-state line. Focus
  MUST NOT be left on the document body in any case.

**Superseded rules from the search-and-scalability feature (017)**

- **FR-016**: The 017 rules that the Live Results card carries its removal control in the card's
  top-right corner, and that the Live Results tab's cards carry no Live Results link, are
  superseded by FR-001–FR-003; that feature's interface description MUST be annotated to say so.

### Key Entities

- **The Live Results link**: one control on a poll card's front face, in two forms. The *add* form
  — animated bars, "Add to Live Results", adds the poll — is shown on every tab but Live Results,
  and hidden for a closed or being-edited poll. The *remove* form — a plain X, "Remove from Live
  Results", removes the poll — is shown on the Live Results tab for every poll on it. Both forms
  share the element, the position, the visible label and the hover treatment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A member can remove a poll from the Live Results tab in one action from the card's
  bottom row, and the outcome is identical to the previous corner control in every respect a
  member can observe: which poll goes, what the tab shows afterwards, and what happens when they
  ask too soon.
- **SC-002**: No poll card on any tab displays an X in its title row, on any of the six tabs.
- **SC-003**: Every poll on the Live Results tab offers the control, 100% of the time, including
  polls that closed while being watched and polls opened for editing.
- **SC-004**: On every tab other than Live Results, the bottom-row link's appearance and behaviour
  are unchanged — verified by the existing checks for adding a poll continuing to pass without
  amendment.
- **SC-005**: A member using only the keyboard can remove two polls in succession without leaving
  the Live Results tab or tabbing from the top of the page.
- **SC-006**: Every existing automated check passes, except those that identify the removal
  control by its former corner position, which are updated to the new one.

## Assumptions

- The removal itself is unchanged end to end — the request it sends, the allowance it spends, the
  refusal it may receive, the updated list of watched polls it applies, and the empty-tab line
  when the last poll goes. This feature moves and re-dresses the control only.
- The Live Results tab is available to signed-in members only, so the rules that dim controls for
  guests never reach the remove form.
- The card's other controls are untouched: the Vote button, the Favorites star, the card faces,
  the results bars, the scroll arrows and every note in the bottom row.
- No server behaviour, stored data, configuration setting or published interface changes; the
  removal action already exists.
- The corner control is removed outright rather than hidden for later use; a future feature that
  wants one can restore it from the record of the feature that introduced it.
- The X drawing reuses the strokes the card already carries for the corner control rather than
  introducing a new asset.
- The existing automated checks that drive removal through the corner control are rewritten
  against the new control rather than kept alongside it.
- No dedicated git branch is created for this feature; work continues on `dev`.
