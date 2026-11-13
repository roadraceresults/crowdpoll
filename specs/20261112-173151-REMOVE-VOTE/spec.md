# Feature Specification: Remove Vote

**Feature Branch**: `20261112-173151-REMOVE-VOTE`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "requirements/20261112-173151-remove-vote/requirements.md": on a poll whose voters may
change their vote, testers expected to be able to remove their vote altogether. Today, un-setting the last selected
choice disables the Submit button, so a voter who wants no vote at all is stuck. The feature lets such a voter remove
their vote with one click, and treats them afterwards exactly as a voter who has not voted yet.

## User Scenarios & Testing *(mandatory)*

CrowdPoll polls come in two kinds for voters: on a **Final-Vote** poll the first vote is the only one, on a
**Dynamic-Vote** poll ("You may change your vote") a voter may come back and pick differently. Voting happens on the
back face of a poll card: the choices are shown as a ballot, each row toggles on and off, and a Submit button sends the
selection. The card then flips back to its results face, which shows the counts, "You voted" and, on the voter's
personal tabs, lists the poll under Your Votes.

This feature adds the one missing move on a Dynamic-Vote poll: taking a vote back.

### User Story 1 - Remove my vote from a Dynamic-Vote poll (Priority: P1)

A voter who has voted on a Dynamic-Vote poll opens the ballot, un-sets every selected choice and clicks the button,
which now reads "Remove vote". Their vote is gone: the counts drop, the card no longer says "You voted", and the poll
leaves their Your Votes tab. They may vote again later, as any first-time voter would.

**Why this priority**: This is the feature. Testers reached the disabled button repeatedly and expected removal to
work; nothing else here matters without it.

**Independent Test**: Vote on a Dynamic-Vote poll, open the ballot again, un-set the choice: the button is enabled and
reads "Remove vote". Click it: the card flips to its results, the choice's count and the voter total are one lower,
"You voted" is gone, the poll is no longer under Your Votes, and the Who Voted report no longer lists the voter.

**Acceptance Scenarios**:

1. **Given** a Dynamic-Vote poll on which the viewer has voted, **When** they open the ballot and un-set every selected
   choice, **Then** the Submit button stays enabled and its label reads "Remove vote".
2. **Given** that state, **When** they pick a choice again, **Then** the label returns to "Submit vote" (or "Submit
   votes" on a multiple-choice poll) and submitting changes the vote as today.
3. **Given** that state, **When** they click "Remove vote", **Then** the card flips to its results face, every choice they
   had selected shows one fewer, the voter total shows one fewer, "You voted" is gone, and the notice reads "Your vote
   was removed." (or the usual queued notice when the system is behind).
4. **Given** a removed vote, **When** the voter opens the ballot again, **Then** nothing is selected and the button is
   disabled until they pick a choice, exactly as for a voter who never voted.
5. **Given** a removed vote, **When** the voter votes again, **Then** they count as a new voter: the voter total rises by
   one, the poll is back under Your Votes, and any limit on the number of voters is checked again.
6. **Given** a Dynamic-Vote poll with a Who Voted report (the creator's view of who chose what), **When** a voter removes
   their vote, **Then** the report no longer lists them, and an invitee who removed their vote is counted again among
   those "not yet voted".
7. **Given** the poll's line graph is on, **When** a voter removes their vote, **Then** the graph's next point shows the
   lower counts and the lower voter line, as it does when a vote is changed.

---

### User Story 2 - Nothing changes for voters without a vote, or on Final-Vote polls (Priority: P2)

A voter who has never voted on a poll, or who is on a Final-Vote poll, sees no new behaviour: an empty selection keeps
the Submit button disabled, and a Final-Vote poll still refuses any change after the first vote.

**Why this priority**: Removal must not open a side door. A first-time voter submitting "nothing", or a Final-Vote
voter withdrawing a final vote, would break the two rules the ballot is built on.

**Independent Test**: On a poll the viewer never voted on, un-set every choice: the button is disabled with its usual
label. On a Final-Vote poll the viewer voted on, the ballot is not offered; a direct request to remove the vote is
refused with the existing "cannot change your vote" message.

**Acceptance Scenarios**:

1. **Given** a Dynamic-Vote poll on which the viewer has not voted, **When** nothing is selected, **Then** the Submit
   button is disabled and reads "Submit vote(s)", as today.
2. **Given** a Final-Vote poll on which the viewer has voted, **When** any request arrives to change or remove that vote,
   **Then** it is refused with the message that the vote cannot be changed, and nothing changes.
3. **Given** a request to remove a vote from a voter who holds none, **When** it arrives, **Then** it is refused with
   "Select at least one choice." and nothing changes.

---

### User Story 3 - The usual gates apply to a removal (Priority: P3)

A removal is a kind of vote: it is only accepted while the poll is open, and only from a voter the poll accepts.
While the poll is being edited it is served as it was before the edit, for a removal as for a vote; should the server
ever answer "try again shortly", the voter keeps their place.

**Why this priority**: The gates already exist for votes; this story only confirms the removal passes through the same
ones, so no voter can remove a vote where they could not cast one.

**Independent Test**: Put an open Dynamic-Vote poll into its editing state while a voter has the ballot open with an
empty selection; click "Remove vote": the removal goes through as a vote would. Close the poll: the removal is refused
with the "not open for voting" message. Stage the "try again shortly" answer: the card shows the editing message on its
results face, the vote still counts and the empty selection is kept.

**Acceptance Scenarios**:

1. **Given** a poll being edited by its creator, **When** a voter clicks "Remove vote", **Then** the removal is answered
   as a vote would be on the poll's pre-edit state; and should the answer be "try again shortly", the vote is not
   removed, the card shows the editing message on its results face, and the empty selection is kept for a retry.
2. **Given** a poll that is closed, waiting to open, or otherwise not open, **When** a removal arrives, **Then** it is
   refused with the same message a vote would get.
3. **Given** a voter who has been removed from the poll by its creator, **When** they ask to remove a vote, **Then** they
   are refused as for a vote (their vote was already removed by the ban).

---

### Edge Cases

- **Un-setting some, not all, choices** on a multiple-choice poll is a change of vote, not a removal: the button keeps
  its "Submit votes" label and submitting records the smaller selection, as today.
- **Removing a vote twice** (two tabs, or a double click): the second request finds no vote to remove and is refused with
  "Select at least one choice."; the counts move only once.
- **Vote and removal in quick succession**, before the first was fully written: the later request wins, as a changed vote
  does today, so the voter ends up with no vote and the counts reflect that.
- **The poll's voter limit**: a removal frees the voter's seat, so another voter may take it; the voter who removed must
  pass the limit again to vote anew.
- **Trending**: the poll's trending score counts arrivals of new voters and is not reduced by a removal; a voter who
  removes and votes again is counted as a new arrival again.
- **Another session of the same account** that still believes it voted: on its next request the system re-reads the
  stored vote, finds none, and treats the voter as new.
- **A vote hold after a removal**: the Vote button is held for the same short period as after a vote, so a removal
  cannot be used to vote faster than the poll allows.
- **The poll stays "ever voted"**: a poll whose only vote was removed is still a poll that has been voted on, so its
  creator's editing and deletion limits are unchanged.

## Requirements *(mandatory)*

### Functional Requirements

**The ballot**

- **FR-001**: On a Dynamic-Vote poll, while the viewer holds a vote and no choice is selected, the ballot's Submit button
  MUST be enabled and read "Remove vote".
- **FR-002**: As soon as at least one choice is selected, the button MUST return to its usual label ("Submit vote", or
  "Submit votes" on a multiple-choice poll) and behave as today.
- **FR-003**: While the viewer holds no vote and no choice is selected, the button MUST stay disabled with its usual
  label, as today; this holds for every poll kind.
- **FR-004**: The results face's Vote button MUST keep the same width as the ballot's button for all three labels, as
  it does today for the two.
- **FR-005**: A removal MUST take one click; no confirmation step is shown.
- **FR-006**: Un-setting some of several selected choices MUST remain a change of vote, submitted as today.

**Recording the removal**

- **FR-007**: A removal MUST be accepted only on an open Dynamic-Vote poll, from a voter who currently holds a vote on
  it; it passes the same checks as a vote (poll state, ban, invitation, rate limits), in the same order.
- **FR-008**: An empty submission from a voter who holds no vote MUST be refused with "Select at least one choice.".
- **FR-009**: A removal on a Final-Vote poll MUST be refused with the existing message that the vote cannot be changed.
- **FR-010**: A removal while the poll is being edited MUST be answered as a vote is, on the poll's pre-edit state; on
  the existing "momentarily unavailable" answer the card MUST keep the empty selection and show the editing message on
  its results face, as for a vote.
- **FR-011**: After a removal the voter's vote MUST count as absent everywhere a vote is read: the live counts of each
  choice they had selected drop by one, the voter total drops by one, the creator's Who Voted report no longer lists
  them, an invitee is counted among those not yet voted, and the line graph's running totals reflect the drop at its
  next point.
- **FR-012**: The removal MUST be kept in the poll's vote history as an event with an empty selection, so the history
  can be replayed to the same totals.
- **FR-013**: After a removal the poll MUST no longer be listed for the voter as one they voted on: it leaves the Your
  Votes tab and leaves the Home tab unless another reason lists it there (invited, linked, created, watching). The
  voter's tabs refresh as they do after a vote (the card's own "You voted" is FR-017).
- **FR-014**: A voter who removed their vote and votes again MUST be treated as a new voter in every respect: the voter
  total rises by one, any voter limit is checked again, the poll counts as a new arrival for trending, and the poll is
  listed under Your Votes again.
- **FR-015**: A removal MUST NOT reduce the poll's trending score, and MUST NOT change whether the poll counts as having
  ever been voted on.
- **FR-016**: A removal MUST be subject to the same per-voter hold and per-address rate limits as a vote.

**After the removal, on the card**

- **FR-017**: After a successful removal the card MUST flip to its results face, show the new counts, drop "You voted",
  hold the Vote button for the usual period, and show the notice "Your vote was removed." (or the usual queued notice
  when the system reports the removal as queued).
- **FR-018**: The next ballot the voter opens MUST start with nothing selected and the button disabled.

**Contract and documentation**

- **FR-019**: The published API description MUST state that a vote request with an empty selection removes the caller's
  vote on a Dynamic-Vote poll, and that a successful answer may then carry an empty list of the caller's choices.
- **FR-020**: The user-facing documentation MUST describe how to remove a vote on a Dynamic-Vote poll.

### Key Entities

- **Vote**: a voter's current selection on a poll: zero or more choices. A vote with no choices means "this participant
  has not voted" and already exists for invitees who have not voted yet; a removal produces the same state.
- **Vote history event**: one submission by one voter at one time, including a removal (an empty selection); the source
  the line graph's running totals are built from.
- **Voter relation to a poll** ("voted"): what lists a poll under the voter's Your Votes tab and puts "You voted" on the
  card; created by a vote, removed by a removal, a ban or a reset.
- **Live counts**: the per-choice counts and voter total every reader shows; moved by votes and removals, reconciled
  from the stored votes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A voter who has voted on a Dynamic-Vote poll can remove their vote in two actions on the ballot (un-set
  the selection, click "Remove vote"), with no dead end: at no point is the only button disabled while a vote is held.
- **SC-002**: Within one refresh period of a removal, every reader of the poll (the card, the live results, the Who Voted
  report, the line graph, the personal tabs) shows the voter as not having voted; the stored votes and the live counts
  agree, as they do after a vote.
- **SC-003**: 100% of removal attempts on Final-Vote polls, on polls that are not open (before or behind an edit), and
  from voters without a vote are refused with the existing messages, and change no count.
- **SC-004**: Existing voting behaviour is unchanged for voters who do not remove a vote: the full existing test suite
  for voting, counters, line graph, personal tabs and Who Voted passes with no behavioural expectation changed. The
  only edits to existing tests are the one rule that an empty selection used to be refused outright, and the card's
  label test, whose selector and sizer values follow the new button structure (FR-004).
- **SC-005**: A voter who removes a vote and votes again is counted exactly once in the voter total, and the poll's
  stored votes, live counts and line graph agree on that total.

## Assumptions

- A removal is submitted through the same vote request as a vote, carrying an empty selection; the API description is
  relaxed accordingly (decision NC2 of the requirements report). No new route, page or control is added.
- A removal keeps the voter's vote record with an empty selection rather than deleting it, which is how an invitee who
  has not voted is already represented (decision UA1); the detailed effect on each live counter and cache is fixed in
  decision UA2 of `requirements/20261112-173151-remove-vote/requirements.md` and binds the plan.
- The "voted" relation is removed on a removal, following the existing rule that a participant whose vote is removed by
  a ban or reset no longer "voted" (decision UA3).
- The ballot rows already toggle off on a click, for radios as for checkboxes; this feature does not change how a
  selection is un-set, only what the button does once the selection is empty.
- Final-Vote polls are out of scope: a final vote stays final. Removing another voter's vote stays with the creator's
  existing ban and reset tools.
- No confirmation is shown (decision NC3): a removal is as reversible as a vote, since the voter may vote again after
  the usual hold.
- No schema change is expected: an empty selection is already a valid stored vote.
- The Who Voted report, the invitation status, the voter limit and the results computation already treat an empty
  selection as "not voted"; the feature relies on that and adds tests for it.
