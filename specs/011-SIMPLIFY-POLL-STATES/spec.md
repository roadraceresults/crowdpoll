# Feature Specification: Simplify Poll States

**Feature Branch**: `011-SIMPLIFY-POLL-STATES`

**Created**: 2026-08-28

**Status**: Draft

**Input**: Source requirements: `designDocs/011-high-level-requirements-SIMPLIFY-POLL-STATES.md`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edit a poll that has never been voted on (Priority: P1)

An administrator opens a poll that has not yet received a single vote and changes anything about
it — its title, its subtitle, its choices, its schedule, its access rules. Because nobody has
voted, there is no history to protect, so every field is freely editable and the choice list is
simply replaced wholesale when saved.

**Why this priority**: This is the reason the feature exists. The system currently carries
substantial complexity — choices that are marked removed rather than deleted, cascading vote
removal, and stored data whose only purpose is to reconcile an edit against votes already cast — to
support editing a poll after it has been voted on.
That capability is not worth its cost. Restricting full editing to never-voted polls removes the
complexity at its root, and everything else in this feature follows from that decision.

**Independent Test**: Create a poll, confirm every field including the choice list can be edited
and saved. Cast one vote, then confirm the full-edit surface is no longer offered for that poll.
Delivers the simplification on its own, with no dependency on screening or scheduling.

**Acceptance Scenarios**:

1. **Given** a poll that has never received a vote, **When** the administrator opens it for
   editing, **Then** the full editing surface is available and all fields may be changed.
2. **Given** a poll being edited, **When** the administrator saves a new set of choices,
   **Then** the new list replaces the previous list entirely, with no record of removed choices
   retained.
3. **Given** a poll that has received a vote which was subsequently deleted, **When** the
   administrator attempts to open the full editing surface, **Then** access is refused — a
   deleted vote still counts as having been voted on.
4. **Given** a poll whose voter was banned and whose votes were deleted, **When** the
   administrator attempts to open the full editing surface, **Then** access is refused for the
   same reason.

---

### User Story 2 - Update a poll that already has votes (Priority: P1)

An administrator needs to correct the wording of a live poll's title or extend its closing time,
but people have already voted. They get a reduced editing surface offering only title, subtitle,
start time and end time. The choices are untouchable and every existing vote is preserved.

**Why this priority**: Paired with Story 1, this is what makes the simplification acceptable
rather than merely restrictive. Without it, a typo in a live poll's title would be uncorrectable.
Together the two stories cover every poll in the system: never-voted polls get the full surface,
voted polls get the safe subset.

**Independent Test**: Cast a vote on a poll, confirm the reduced surface is offered, change the
title and end time, and confirm the vote count and choice list are unchanged afterwards.

**Acceptance Scenarios**:

1. **Given** a poll with at least one vote cast, **When** the administrator opens it for
   updating, **Then** only title, subtitle, start time and end time may be changed.
2. **Given** a poll being updated, **When** the administrator saves the change, **Then** every
   existing vote remains intact and the choice list is unchanged.
3. **Given** a poll that has never been voted on, **When** the administrator attempts to open the
   reduced updating surface, **Then** access is refused — that poll belongs on the full editing
   surface instead.

---

### User Story 3 - Publish a poll deliberately, after acceptability screening (Priority: P1)

An administrator finishes composing a poll and clicks Save and Publish. The poll is not
immediately public: it enters an approval state, is screened for unacceptable content, and only
then moves into its schedule-appropriate state. If the screening objects, the poll is rejected and
the administrator is shown the reason.

**Why this priority**: This replaces the current autosave behaviour, under which partially-composed
polls could become publicly visible before the administrator had finished. Publication becomes an
explicit act with a quality gate in front of it. It is P1 because the autosave removal and the
publish path are the same change — one cannot ship without the other.

**Independent Test**: Compose a poll containing clearly unacceptable wording, publish it, and
confirm it lands in the rejected state with a readable reason and remains invisible to the public.
Repeat with acceptable wording and confirm it becomes visible according to its schedule.

**Acceptance Scenarios**:

1. **Given** a poll being composed, **When** the administrator has made no change, **Then** the
   Save and Publish and Cancel controls are unavailable, and they become available as soon as any
   change is made.
2. **Given** a poll still holding every default value, **When** the administrator publishes it,
   **Then** it stays in the initialized state and does not become public.
3. **Given** a poll whose title and subtitle have been changed but whose choices are all still
   defaults, **When** the administrator publishes it, **Then** it stays in the initialized state —
   changed wording alone does not make a poll ready to publish.
4. **Given** a poll with real content, **When** the administrator publishes it, **Then** it enters
   the awaiting-approval state, remains invisible to the public, and the administrator is returned
   to the poll list.
5. **Given** a poll awaiting approval, **When** screening finds unacceptable content, **Then** the
   poll becomes rejected, stays invisible to the public, and carries a human-readable reason.
6. **Given** a poll awaiting approval, **When** screening finds nothing objectionable, **Then**
   any previous rejection reason is cleared and the poll moves to the state its schedule calls for.
7. **Given** a poll awaiting approval, **When** the administrator opens the poll list, **Then**
   they can see that it is awaiting approval and how long it has been in that state.

---

### User Story 4 - Polls open and close on their own schedule (Priority: P2)

An administrator sets a poll to open next Monday and close on Friday, then stops thinking about it.
The poll becomes votable on Monday and stops accepting votes on Friday without anyone touching it.
Adjusting those times later moves the poll between waiting, open and closed accordingly.

**Why this priority**: P2 rather than P1 because a poll with no schedule is usable the moment it is
approved — this story adds unattended operation rather than basic function. It is nonetheless
load-bearing for real use, and it is what makes the state set worth having.

**Independent Test**: Set a poll to open in the near future, confirm it is not votable, wait past
the start time, and confirm it becomes votable without any administrator action.

**Acceptance Scenarios**:

1. **Given** an approved poll whose start time is in the future, **When** the schedule is
   evaluated, **Then** the poll is in the waiting-to-open state and refuses votes.
2. **Given** an approved poll whose start time has passed and whose end time has not, **When** the
   schedule is evaluated, **Then** the poll is open and accepts votes.
3. **Given** an open poll whose end time passes, **When** the schedule is next evaluated, **Then**
   the poll closes and refuses further votes.
4. **Given** a poll with no start time, **When** the schedule is evaluated, **Then** the current
   time is treated as being after the start — the poll opens as soon as it is approved.
5. **Given** a poll with no end time, **When** the schedule is evaluated, **Then** the poll never
   closes on its own.
6. **Given** a closed poll whose end time is moved into the future, **When** the schedule is next
   evaluated, **Then** the poll returns to the open or waiting state as appropriate.
7. **Given** a poll whose start time is somehow later than its end time, **When** the schedule is
   evaluated, **Then** the start time is corrected to one second before the end time and the poll
   is closed.

---

### User Story 5 - Two administrators cannot edit the same poll at once (Priority: P2)

One administrator opens a poll for editing. A second administrator — or the same person in another
browser tab — tries to open the same poll and is told it is currently being edited and to try again
shortly. If the first administrator's browser closes, crashes or loses its connection, the poll
frees itself automatically within a short, bounded time rather than staying locked forever.

**Why this priority**: Concurrent edits would silently discard one administrator's work, and a lock
with no recovery path would strand polls permanently. P2 because a single-administrator deployment
will rarely encounter it, but the failure is severe enough and the recovery is what makes the lock
safe to ship at all.

**Independent Test**: Open a poll for editing in one browser tab, attempt to open it in a second,
and confirm refusal with a clear message. Close the first tab abruptly and confirm the poll becomes
editable again without administrator action.

**Acceptance Scenarios**:

1. **Given** a poll being edited, **When** anyone else attempts to open it for editing or updating,
   **Then** they are refused and told the poll is currently being edited and to try again shortly.
2. **Given** a poll being edited, **When** the poll list is viewed, **Then** the poll is not
   visible to the public while it is in the editing state.
3. **Given** a poll being edited, **When** the editing client stops signalling that it is still
   present, **Then** the poll returns to whatever state it was in before editing began and becomes
   available again within a bounded time.
4. **Given** an administrator who refreshes the editing page, **When** they attempt to resume,
   **Then** they are refused until the lock is released — the lock is deliberately not re-entrant.
5. **Given** a poll that was open before editing began and whose end time passed during the edit,
   **When** the administrator exits, **Then** the poll returns to its prior state and the next
   schedule evaluation corrects it.

---

### User Story 6 - Abandoning an edit changes nothing (Priority: P2)

An administrator makes changes, thinks better of them, and leaves — by clicking Cancel, by clicking
the back arrow, by pressing the browser's back button, by closing the tab. In every case they are
warned that unsaved edits will be lost, and if they confirm, the poll is exactly as it was.

**Why this priority**: Without this, an interrupted edit leaves a poll in a half-changed state with
no way back. P2 because it protects against a routine, high-frequency mistake rather than a rare
one.

**Independent Test**: Change several fields, leave by each available exit route, confirm the warning
appears each time, and confirm the poll's stored values are unchanged afterwards.

**Acceptance Scenarios**:

1. **Given** a poll with unsaved changes, **When** the administrator clicks Cancel or the back
   arrow, **Then** a confirmation dialog warns that edits will be lost.
2. **Given** that dialog, **When** the administrator declines, **Then** they return to editing with
   their changes intact.
3. **Given** that dialog, **When** the administrator confirms, **Then** no change is written and the
   poll returns to the state it held before editing began.
4. **Given** a poll with unsaved changes, **When** the administrator uses the browser's back button,
   closes the tab, or navigates elsewhere, **Then** an equivalent warning is presented.

---

### User Story 7 - Screening failures resolve without stranding a poll (Priority: P2)

The content screening service is unreachable. Rather than retrying forever in silence, the system
tries a bounded number of times, then rejects the poll with an explanation and offers the
administrator a control to try again once the service is back.

**Why this priority**: Without a bound, a screening outage produces polls that are invisible,
uneditable and undeletable, with no administrator action that can resolve them — and an unbounded
retry loop hammering an external service. P2 because it only manifests during an outage, but it is
what keeps that outage from becoming permanent damage.

**Independent Test**: Make the screening service fail, publish a poll, and confirm that retries stop
after the configured limit, that the poll is rejected with a readable reason, and that the retry
control appears and works once the service is restored.

**Acceptance Scenarios**:

1. **Given** a poll awaiting approval, **When** the screening call does not complete within its
   timeout or fails immediately, **Then** the poll stays awaiting approval and is queued to be
   retried.
2. **Given** repeated screening failures, **When** the attempt count reaches the configured
   maximum, **Then** the poll is rejected, carries a reason naming the number of attempts, and no
   further screening is attempted automatically.
3. **Given** a poll rejected for exhausted attempts, **When** the administrator uses the retry
   control, **Then** the poll returns to awaiting approval with its attempt count reset and its
   rejection reason cleared.
4. **Given** a screening attempt whose server process dies part-way through, **When** the stalled
   attempt is detected, **Then** the poll is queued to be retried, and that attempt still counts
   against the maximum so a repeatedly-crashing process cannot retry forever.
5. **Given** a screening call that completes and returns a verdict — acceptable or not — **When**
   the verdict is recorded, **Then** the attempt count is reset, because the call succeeded
   whatever it decided.

---

### User Story 8 - The poll list reflects reality without being reloaded (Priority: P3)

An administrator leaves the poll list open on a second monitor. Polls move from waiting to open to
closed, screening completes, states change — and the list keeps up on its own, updating rows in
place rather than reloading the page.

**Why this priority**: P3 because everything works without it; the administrator would simply have
to refresh. It matters because most of this feature's state changes are driven by background
processes rather than by the administrator, so a static list is misleading within seconds.

**Independent Test**: Open the poll list, publish a poll from another session, and confirm the row
updates without the page being reloaded.

**Acceptance Scenarios**:

1. **Given** the poll list is open, **When** a poll's state changes for any reason, **Then** the
   affected row updates in place within the configured refresh interval.
2. **Given** the poll list is open, **When** rows update, **Then** the page is not fully reloaded
   and the administrator's position in the list is preserved.

---

### User Story 9 - Retiring a poll (Priority: P3)

An administrator archives a poll that has finished. It disappears from public view but its results
stay available to administrators forever. Polls that never became anything — never published, or
rejected — can be deleted outright.

**Why this priority**: P3 because a system with no archive still works; polls simply accumulate.
Included here because archiving is one of the eight states and the delete rules are what stop an
administrator destroying a poll that people have voted in.

**Independent Test**: Archive a closed poll and confirm it leaves public view, retains its votes,
and cannot return to any other state. Confirm the delete action is offered only for initialized,
rejected and archived polls.

**Acceptance Scenarios**:

1. **Given** a closed poll, **When** the administrator archives it, **Then** it is no longer public
   but remains visible to administrators with its votes intact.
2. **Given** an archived poll, **When** any state change is attempted, **Then** it is refused —
   archiving is permanent.
3. **Given** an archived poll, **When** the administrator opens its action menu, **Then** neither
   the edit nor the update action is offered.
4. **Given** a poll that is initialized, rejected or archived, **When** the administrator opens its
   action menu, **Then** the delete action is offered and asks for confirmation before destroying
   the poll.
5. **Given** a poll in any other state, **When** the administrator opens its action menu, **Then**
   the delete action is not offered.

---

### User Story 10 - Configuration reads consistently (Priority: P3)

An operator deploying the system reads one naming convention for every setting the environment
supplies, rather than two conventions accumulated across eleven features.

**Why this priority**: P3 because it changes no behaviour. It rides along with this feature because
this feature introduces six new settings, and adding them under a second convention would make the
inconsistency permanent.

**Independent Test**: Start the system with the renamed settings and confirm it reads every one of
them, and that no reference to a superseded name survives anywhere in the codebase, the
configuration templates, the API description or the deployment environment.

**Acceptance Scenarios**:

1. **Given** the system is starting, **When** it reads its configuration, **Then** every
   environment-supplied setting uses the new prefix and every documented default applies.
2. **Given** a setting with no default, **When** it is absent at startup, **Then** startup fails
   with a message naming the missing setting.
3. **Given** the rename is complete, **When** the codebase and its supporting files are searched,
   **Then** no superseded setting name remains.

---

### Edge Cases

- **A vote arrives while a poll is hidden.** Removing a poll from public listings does not by
  itself stop a vote: a voter with the page already open, or following a direct link, can still
  submit. Votes are refused unless the poll is in the open state, whatever route the voter took.
- **The editing lock is not re-entrant.** An administrator who refreshes, opens a second tab, or
  briefly loses connectivity is refused their own lock until it goes stale. This is accepted
  deliberately; the worst-case wait is bounded and the message tells them to try again shortly.
- **A poll's schedule expires mid-edit.** Exiting restores the pre-edit state, which may now be
  wrong. The next schedule evaluation corrects it.
- **Screening crashes rather than fails.** An attempt is counted when it is claimed, not when it
  returns, so a process that dies mid-call still consumes its attempt and the retry budget still
  terminates.
- **Screening completes but rejects.** That is a successful call. The attempt count resets; only
  calls that fail to complete leave it advanced.
- **Every field still holds its default.** Publishing is refused and the poll stays initialized —
  including when the title and subtitle have been changed but the choices have not.
- **Start time later than end time.** Should be impossible through the editing surfaces, which
  prevent it. If encountered anyway, the start is pulled to one second before the end and the poll
  is closed.
- **Two polls become eligible for screening simultaneously.** One is handled per cycle. Stalled
  attempts are recovered before new ones are started, and among new ones the poll that would open
  soonest goes first — a poll with no start time opens the moment it is approved, so it goes ahead
  of every scheduled poll.
- **A vote was cast and then deleted.** The poll is permanently on the reduced updating surface.
  Deletion does not restore full editability.

## Requirements *(mandatory)*

### Functional Requirements

#### Poll states

- **FR-001**: The system MUST represent every poll in exactly one of eight states: initialized,
  editing, awaiting approval, rejected, waiting to open, open, closed, archived.
- **FR-002**: A newly created poll MUST begin in the initialized state with every field at its
  default value.
- **FR-003**: The system MUST withhold a poll from public view in the initialized, editing,
  awaiting-approval, rejected and archived states.
- **FR-004**: The system MUST refuse any vote unless the poll is in the open state, regardless of
  how the voter reached the poll.
- **FR-005**: The system MUST display each poll's state to administrators using the same wording it
  stores.

#### Editing and updating

- **FR-006**: The system MUST offer the full editing surface only for polls that have never
  received a vote and that are not in the editing, awaiting-approval or archived states.
- **FR-007**: The system MUST treat a poll as having received a vote even if that vote was
  subsequently deleted, including deletion caused by banning a voter.
- **FR-008**: The system MUST offer the reduced updating surface only for polls that have received
  at least one vote and that are not in the editing, awaiting-approval or archived states.
- **FR-009**: The reduced updating surface MUST permit changes to title, subtitle, start time and
  end time only. This governs the poll's own fields; removing or banning a participant is moderation
  rather than editing and MUST remain available on the updating surface, since it is needed
  precisely when a poll has votes.
- **FR-010**: The system MUST replace a poll's choice list wholesale when it is saved from the full
  editing surface, retaining no record of removed choices.
- **FR-011**: The system MUST preserve every existing vote across every state change and every
  change made through the reduced updating surface.
- **FR-012**: The system MUST NOT save changes automatically while a poll is being edited; changes
  MUST take effect only when the administrator publishes them.
- **FR-013**: The system MUST keep the publish and cancel controls unavailable until the
  administrator makes a change.
- **FR-014**: The system MUST warn the administrator that unsaved changes will be lost when they
  leave an editing surface by any route, including the cancel control, the back control, the
  browser's back button, closing the tab, and navigating elsewhere.
- **FR-015**: The system MUST discard all changes and restore the poll's pre-edit state when the
  administrator confirms they are leaving without saving.
- **FR-016**: The system MUST return the administrator to the poll list by in-application
  navigation rather than by browser history when they leave an editing surface.

#### Editing lock

- **FR-017**: The system MUST place a poll into the editing state for the duration of an editing or
  updating session and record the state it held beforehand.
- **FR-018**: The system MUST refuse to open a poll for editing or updating while it is in the
  editing state, and MUST tell the requester that the poll is currently being edited and to try
  again shortly.
- **FR-019**: The system MUST verify a session's eligibility on the server when the session begins,
  rather than relying on checks performed by the client, and MUST make no change if the session is
  not eligible.
- **FR-020**: The editing client MUST signal at a configured interval that it is still present, and
  MUST abandon the session and return the administrator to the poll list if the server reports that
  the session is no longer valid.
- **FR-021**: The system MUST detect editing sessions whose client has stopped signalling and
  return those polls to their pre-edit state, releasing the lock without administrator action.
- **FR-022**: The system MUST bound the time a poll can remain locked after its client disappears
  to twice the signalling interval plus one detection cycle.
- **FR-023**: The system MUST allow only the holder of an editing session to end it.

#### Publishing and screening

- **FR-024**: The system MUST refuse to publish a poll whose fields all still hold default values,
  leaving it in the initialized state.
- **FR-025**: The system MUST refuse to publish a poll whose choices all still hold default values,
  even if other fields have been changed.
- **FR-026**: The system MUST place a published poll into the awaiting-approval state, clear any
  previous rejection reason and screening attempt count, and return the administrator to the poll
  list without waiting for the outcome.
- **FR-027**: The system MUST refuse to edit or update a poll while it is awaiting approval.
- **FR-028**: The system MUST screen every published poll's title, subtitle and choices for content
  that would normally be rejected by an online community.
- **FR-029**: The system MUST reject a poll whose screening returns an objection, record the
  returned explanation as the poll's rejection reason, and keep the poll out of public view.
- **FR-030**: The system MUST display a poll's rejection reason on the editing and updating surfaces
  when the poll is rejected, and in the poll list for every poll that has one.
- **FR-031**: The system MUST clear a poll's rejection reason once it is approved.
- **FR-032**: The system MUST ensure that only one screening is in progress for a given poll at a
  time, and MUST make the elapsed time of an in-progress approval visible to administrators.
- **FR-033**: The system MUST screen at most one poll per cycle, recovering stalled attempts before
  starting new ones.
- **FR-034**: When starting new screenings, the system MUST select the poll that would open
  soonest, treating a poll with no start time as more urgent than any scheduled poll.

#### Screening failure and recovery

- **FR-035**: The system MUST abandon a screening call that does not complete within a configured
  timeout, leave the poll awaiting approval, and queue it to be screened again.
- **FR-036**: The system MUST count a screening attempt when the attempt is claimed rather than
  when it concludes, so that an attempt whose outcome the server never observes is still counted.
- **FR-037**: The system MUST detect screening attempts that were claimed but never concluded and
  queue those polls to be screened again without counting an additional attempt.
- **FR-038**: The system MUST reset a poll's screening attempt count whenever a screening call
  completes, whatever verdict it returned.
- **FR-039**: The system MUST stop screening a poll once its attempt count reaches the configured
  maximum, reject it, and record a reason naming the number of attempts made.
- **FR-040**: The system MUST offer administrators a control to re-attempt screening for a poll
  rejected for exhausted attempts, which returns the poll to awaiting approval with its attempt
  count and rejection reason cleared.

#### Scheduling

- **FR-041**: The system MUST determine a poll's state from its schedule after successful screening,
  placing it in the waiting-to-open, open or closed state.
- **FR-042**: The system MUST re-evaluate the schedule of every waiting, open and closed poll at a
  configured interval and move each poll to whichever state its schedule calls for.
- **FR-043**: The system MUST treat a poll with no start time as having already started.
- **FR-044**: The system MUST treat a poll with no end time as never closing on its own.
- **FR-045**: The system MUST treat the start and end times as inclusive bounds.
- **FR-046**: The system MUST correct a poll whose start time is later than its end time by setting
  the start to one second before the end and closing the poll.
- **FR-047**: The editing surfaces MUST prevent an administrator from setting a start time later
  than an end time.

#### Poll list

- **FR-048**: The poll list MUST refresh at a configured interval, updating changed rows in place
  without reloading the page.

#### Archiving and deletion

- **FR-049**: The system MUST allow a poll to be archived only from the closed state.
- **FR-050**: The system MUST refuse every state change on an archived poll.
- **FR-051**: The system MUST retain an archived poll and its votes, visible to administrators only.
- **FR-052**: The system MUST offer neither the edit nor the update action for an archived poll.
- **FR-053**: The system MUST offer the delete action only for polls that are initialized, rejected
  or archived, and MUST ask for confirmation before deleting.
- **FR-054**: The system MUST offer only the edit and delete actions for a poll in the initialized
  state, disabling all others.
- **FR-055**: The system MUST delete votes outright when a vote is removed or a voter is banned,
  retaining no marker of the deleted vote.

#### Configuration

- **FR-056**: Every environment-supplied setting MUST use a single consistent prefix distinguishing
  it from values fixed in the code, and constants MUST be named consistently throughout.
- **FR-057**: The system MUST read all such settings once at startup and MUST fail to start, naming
  the setting, when one that has no default is absent.
- **FR-058**: The rename MUST reach every place a superseded name appears, including the codebase,
  configuration templates, the API description, the developer setup scripts, the project
  documentation and the deployment environment.
- **FR-059**: The poll list refresh interval and the pre-existing client polling interval MUST
  remain independently configurable.

### Key Entities

- **Poll**: The unit administrators create and the public votes on. Carries its identity and
  content (title, subtitle, choices), its access and mechanics settings, its schedule (start and
  end times, either of which may be absent), its lifecycle state, and the bookkeeping this feature
  adds: the state held before an editing session began, the liveness signal and identity of the
  editing client, the claim marker and attempt count for screening, and the reason for rejection.
- **Vote**: A participant's recorded choice within a poll. Created only while a poll is open,
  preserved across every state change, and destroyed outright — never marked — when removed or when
  its voter is banned.
- **Editing session**: A single administrator's claim on a single poll, established when an editing
  surface opens and released when it closes cleanly or when its liveness signal lapses. Identified
  per browser tab and deliberately not re-entrant.
- **Screening attempt**: One claimed try at evaluating a poll's content. Counted when claimed rather
  than when concluded, reset when a call completes with any verdict, and bounded by a configured
  maximum beyond which the poll is rejected.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A poll that has never been voted on can have any of its fields changed and published
  in a single pass, with no step asking the administrator to reconcile the change against existing
  votes.
- **SC-002**: 100% of votes cast survive every subsequent state change and every change made
  through the reduced updating surface.
- **SC-003**: No poll becomes publicly visible before an administrator has explicitly published it
  and screening has passed.
- **SC-004**: Every attempt to vote on a poll that is not open is refused, including attempts from a
  page opened before the poll left the open state.
- **SC-005**: A poll whose editing client disappears becomes available to other administrators
  within 40 seconds at the default settings, with no administrator action.
- **SC-006**: Concurrent editing attempts on one poll never result in one administrator's saved
  changes overwriting another's.
- **SC-007**: A poll reaches its schedule-appropriate state within one minute of its start or end
  time at the default settings.
- **SC-008**: A poll never remains in the awaiting-approval state indefinitely: within a bounded
  number of attempts it is either approved or rejected with a stated reason.
- **SC-009**: A total screening outage produces at most the configured maximum number of calls per
  poll, after which the poll is rejected and an administrator can resolve it without developer
  intervention.
- **SC-010**: The poll list reflects any state change within 5 seconds at the default settings
  without a page reload.
- **SC-011**: An administrator can determine, from the poll list alone, which polls are awaiting
  approval, how long each has waited, and why any rejected poll was rejected.
- **SC-012**: No poll that has received a vote can be deleted.
- **SC-013**: The system starts successfully with every setting supplied under the new convention,
  and no superseded setting name remains anywhere in the project.
- **SC-014**: The stored representation of a poll carries no field whose only purpose is to
  reconcile edits against existing votes.

## Assumptions

- **The eight state names are domain vocabulary, not implementation detail.** They are displayed to
  administrators exactly as stored, so this specification names them directly. Mapping them to
  friendlier wording is explicitly deferred to a later feature.
- **Server-side identifiers are left to planning.** Endpoint names, poll field names and background
  process names appear in the source requirements but are deliberately not carried into these
  requirements, which describe the pre-edit state, the lock owner, the liveness signal, the
  screening claim and the attempt count behaviourally instead.
- **Timing values are configurable, not fixed.** They appear here as named intervals rather than
  literals, except where a concrete figure is needed to make a success criterion measurable
  (SC-005, SC-007, SC-010). Their defaults are 10 seconds for the editing liveness signal, 5 seconds
  for the approval cycle, 1 minute for the schedule cycle, 10 seconds for the screening call
  timeout, 10 for the maximum screening attempts, and 5 seconds for the poll list refresh.
- **No data migration is required.** The system has no production users; existing collections and
  documents may be dropped and recreated. Simplifying the stored representation is an intended
  outcome, not a cost.
- **Screening may send poll text outside the system.** If a hosted service is used, private drafts
  reach a third party. This is accepted, and how screening is implemented — hosted API, local
  library, or local model — is a research question for planning rather than a requirement here.
- **A single instance runs the background work.** The three recurring processes are assumed not to
  run concurrently with themselves. Deploying them as a separate single-instance service is
  explicitly a later feature.
- **The existing authentication and administrator model is reused unchanged.** Administrator access
  continues to be governed by the configured administrator list, with no per-poll ownership.
- **System logging is out of scope**, deferred to a later feature by the source requirements.
- **The prior "removed choice" and "removed vote" behaviours are withdrawn, not deprecated.** The
  markers and the reconciliation logic they supported are removed outright.
- **This feature carries the configuration rename for earlier features.** Settings introduced by
  features 001 and 002 are renamed here rather than in a separate effort.
