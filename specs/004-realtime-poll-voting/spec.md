# Feature Specification: Real-Time Opinion Poll System

**Feature Branch**: `004-realtime-poll-voting`

**Created**: 2026-08-11

**Status**: Draft

**Input**: User description: "Replace the Simple Web App Client per the updated .\designDocs\high-level-requirements.md"

**Source doc note (added 2026-08-20)**: `designDocs/high-level-requirements.md` no longer
exists under that name — right after this feature shipped, it was renamed to
`designDocs/004-high-level-requirements-realtime-poll-voting.md` (its final, poll-focused form), which is
this spec's accurate source document.

## Clarifications

### Session 2026-08-11

- Q: As the number of polls grows over time, how should the Admin Poll List and the Home Page poll grid handle listing them — is pagination/limiting needed, or should every poll always be listed? → A: No limits anywhere — both views always render the complete set of polls; simplest to build, but page-load time and UI usability will degrade as poll count grows into the hundreds or thousands. Acceptable for this iteration.
- Q: Beyond requiring a logged-in account to vote, should the system take any additional measures to prevent one person from skewing results by voting through multiple accounts? → A: Leave it out of scope for now. Being logged in via the existing authentication system is the only gate; detecting or preventing collusion across multiple accounts (e.g., via IP correlation) is not a requirement of this feature.
- Q: Should archived/closed polls have a data retention or auto-purge policy, or is indefinite retention intended? → A: Indefinite retention. No automatic deletion; archived and closed polls and their vote history are kept until an admin removes them by some other means, none of which is defined by this feature.
- Q: What scale should the system be expected to handle smoothly — concurrent voters on a single poll, and total simultaneously active polls? → A: Medium scale — hundreds of concurrent voters on a single popular poll, and low hundreds of active polls system-wide.
- Q: Should the voter-facing poll UI require a specific accessibility conformance level? → A: No formal target. The reference poll-card/grid design files are adopted as-is, with no additional WCAG conformance requirement layered on top.

### Session 2026-08-12

- Source requirements doc (`designDocs/high-level-requirements.md`) was updated to formalize the 2026-08-11 answers as explicit requirements (a confirmed admin env var name, a corrected `VoteMutability` spelling, and a new `EXCLUSIONS` section). This spec has been reconciled against that update:
  - Scale target refined to the doc's explicit figures — **up to 10,000 concurrent voters on a single poll and up to 1,000 simultaneously active polls** — superseding the "medium scale" estimate from 2026-08-11; scaling techniques beyond that figure are explicitly deferred to a future implementation.
  - The administrator allow-list environment variable is now unambiguously `APP_ADMINS` (the doc's earlier, conflicting `CROWDPOLL_ADMIN_GUIDS` reference was removed), confirming this spec's existing project-convention assumption.
  - The dynamic vote-mutability option is now consistently named `DYNAMIC-VOTE-POLL` throughout the source doc (the conflicting `DYNAMIC-VOTING-POLL` spelling was removed), confirming this spec's existing terminology choice.
  - The no-pagination exclusion from 2026-08-11 is now explicit that it also covers each poll's `Participants` list (invited/voter/banned lists), not just the Admin Poll List and Home Grid.
- Q: Does the `Edit Poll Configuration` page's `AccessMode` dropdown intentionally omit `PUBLIC_POLL` as a selectable option (public is a one-way, creation-only default), or should all 3 modes be selectable? → A: All 3 modes are selectable through the dropdown, confirming this spec's existing FR-048/US7 behavior; the source doc's 2-item option list is a holdover, not an intentional restriction.
- The source doc's `AccessMode` dropdown line was subsequently updated to list all 3 values explicitly (`PUBLIC_POLL`, `PRIVATE_POLL_ANYONE_WITH_THE_LINK_POLL` — a naming variant of `PRIVATE_POLL_ANYONE_WITH_THE_LINK`, treated as the same concept per this spec's established terminology-normalization approach — and `PRIVATE_POLL_INVITATION_ONLY`), formally confirming the answer above. No further spec changes were required: FR-013/FR-048/US7-AC8 already stated this correctly.
- Q: For a `TRANSPARENT-POLL`, the reference poll-card UI only shows aggregate bars and the reference `live-results.html` is an explicit unimplemented placeholder, while the admin "View Results" page already always shows every participant's choice regardless of `ResultsVisibility`. What should `TRANSPARENT-POLL` actually change for a non-admin viewer of the poll's results? → A: This will be implemented in the future — the voter-facing differentiation between `ANONYMOUS-POLL` and `TRANSPARENT-POLL` is out of scope for this implementation (see FR-011, Assumptions).
- Q: The adopted reference header includes a "Create Poll" nav link visible to any visitor, but only `APP_ADMINS` accounts may access poll administration (FR-035). Should it be admin-aware, shown to everyone, or dropped? → A: Dropped from the adopted header. The poll administration area has no site-navigation entry point in this implementation; admins reach it only by navigating directly to its URL.
- Q: The adopted reference header also includes a "Search CrowdPoll" input, but search is out of scope for this iteration. Should it be dropped too, or kept as inert/decorative UI? → A: Kept, inert for now — visible as part of the adopted header's look, but not wired to any functionality.
- The source doc was updated to formalize the 3 answers above as explicit requirements, with two refinements this spec is reconciled against:
  - **Correction**: the doc specifies the header's "Create Poll" link is **greyed-out** (visible to all visitors but disabled/non-functional), not dropped from the header entirely as the interactive answer above concluded. The doc's explicit wording is treated as authoritative and supersedes that answer; FR-035 and the header-adoption Assumption are updated accordingly. Full admin-aware behavior for this link is deferred and "will be specified later" per the doc.
  - **Confirmed**: the header's "Search CrowdPoll" input is likewise **greyed-out**, matching the "kept, inert" answer above; wording aligned to the doc's "greyed-out" term.
  - **New detail** (informational, not required for this implementation): the doc adds a `Live Results Page` section specifying that, when built in a future version, that page shows a poll's title/subtitle, and — for a `TRANSPARENT-POLL` — lists voters by `userName` (not `emailAddress`). This is recorded here for future reference; it does not change this spec, since the `Live Results` page's full implementation remains explicitly out of scope (see FR-011, Assumptions).
- Q: The adopted reference grid page (`responsive-grid.html`) also includes a category filter bar (`Trending`, `Sports`, `Media`, `Politics`, `Business`, `Home`, `Technology`, `Science`, `Games`, `Health`, `Shopping`, `Society`, `Recreation`) below the header, with no corresponding `Category` field or filtering requirement anywhere in the source doc or this spec. Should it be greyed-out/inert like the header's "Create Poll" link and "Search" box, or dropped from the adopted layout entirely? → A: Greyed-out, inert — same treatment as "Create Poll" and "Search CrowdPoll": rendered for visual/layout fidelity to the reference design, not wired to any Category field or filtering logic. No `Category` concept is introduced by this spec.
- **Post-implementation design resync** (user-reported defect: the rendered header/poll-card didn't match the reference files): the reference design files were updated by the user — `responsive-grid.html` now links the poll-card component (`poll-card.css`/`poll-card.js`) directly and renders the two-sided flip card in its grid (its former single-sided "outdated" card was removed), `poll-card.js` became a multi-instance, class-hook-based component, and `poll-card.css` became consumer-safe (demo chrome scoped under `body.card-demo-page`). Per the user's direction, `responsive-grid.html` is the authoritative appearance reference for both the header and the poll card. The implementation was resynced to it verbatim: the served `pollCard.css` is a byte-identical copy of `poll-card.css`; a new `pollGrid.css` is a verbatim extraction of the grid page's inline `<style>`; the home page's header/filter-bar markup is extracted verbatim from the reference (with only the spec-mandated deltas: inert "Create Poll"/"Search"/filter-bar, and the session-driven `header-actions` area); and the card script keeps the reference component's mechanics verbatim with only its demo data layer replaced by live API wiring (per research.md R7). Two deliberate visual deltas beyond the reference remain, both spec-driven: the card's "Live Results" link is greyed-out/inert (research.md R9), and a small `.poll-totals` line shows FR-022's participant totals (the reference design has no equivalent element).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vote on a Public Poll and See Live Results (Priority: P1)

A visitor finds a public poll (via a link, the home grid, or a suggestion), reviews the question and choices, casts a vote for one choice, and immediately sees the results side of the poll — including their own current selection — update. As other people vote, the percentages they see keep refreshing without requiring a page reload.

**Why this priority**: This is the entire reason the system exists — a person voting and watching opinion form in real time. Nothing else in the system has value without this loop working.

**Independent Test**: Create a single-choice, public, anonymous, final-vote poll with two choices; as a logged-in user, open it, submit a vote, and confirm the results side shows the vote counted and updates again automatically after another user votes, without a manual refresh.

**Acceptance Scenarios**:

1. **Given** an active, single-choice, public poll with no votes yet, **When** a logged-in user selects one choice and submits, **Then** the results side of the poll shows 1 total participant, that choice at 100%, and the user's own choice highlighted as their current vote.
2. **Given** a poll a user has already voted on and the poll is a `FINAL-VOTE-POLL`, **When** the user returns to the poll, **Then** they see the results side (not the voting side) and cannot change their choice.
3. **Given** a poll open in a browser tab, **When** another participant casts a vote for a different choice, **Then** the viewing user's results update to reflect the new vote within one polling interval, with no manual page refresh.
4. **Given** a user who is not logged in, **When** they open a public poll, **Then** they can see the current results but are prompted to log in before they can vote.

---

### User Story 2 - Multiple-Choice Voting and Changing Your Vote (Priority: P2)

A poll creator configures a poll to allow selecting more than one choice, and/or to let voters change their mind later. A voter selects several choices at once, submits, and — if the poll allows it — comes back later and changes their selection, with only their most recent submission counting.

**Why this priority**: Multi-select and revotable polls are core configuration options described for every poll, and voting mechanics differ enough from single-choice/final-vote that they need explicit, independently verifiable behavior before other features build on top of the vote record.

**Independent Test**: Create a multiple-choice, dynamic-vote poll; vote for two choices in one submission, confirm each shows up as a distinct participant in its own choice's count with a shared percentage base; then submit a different set of choices and confirm only the latest selection counts.

**Acceptance Scenarios**:

1. **Given** a `MULTIPLE-CHOICE-POLL`, **When** a user selects two choices and submits, **Then** both choices each count that user once, and each choice's percentage is computed against the total number of selections made (so the percentages add up to 100), not the number of participants.
2. **Given** a `DYNAMIC-VOTE-POLL` a user has already voted on, **When** the user opens the poll again, **Then** they see the voting side pre-populated with their current choice(s) and can submit a different selection.
3. **Given** a user changes their vote on a `DYNAMIC-VOTE-POLL`, **When** the new selection is submitted, **Then** the previous selection is superseded (kept in history with its original timestamp) and only the newest selection counts toward results.
4. **Given** a `SINGLE-CHOICE-POLL`, **When** a user selects a different choice than one already selected, **Then** the previous selection is automatically deselected so only one choice is ever active at a time.
5. **Given** no choice has been selected yet, **When** the voting side is displayed, **Then** the submit action is disabled until at least one choice is selected.

---

### User Story 3 - Discover Polls via the Home Grid and Direct Links (Priority: P3)

A visitor lands on the site's home page and sees a responsive grid of poll cards, each showing live results on its front and flipping to a voting form on its back. A poll creator can also copy a direct link to any poll and share it outside the grid.

**Why this priority**: Without a discovery surface, public polls have no way to reach voters organically; this is the primary landing experience for the whole product.

**Independent Test**: Load the home page as a guest and confirm a grid of public poll cards renders with live-updating results; navigate directly to a poll via its link parameter and confirm the same card renders standalone.

**Acceptance Scenarios**:

1. **Given** one or more active public polls exist, **When** a visitor loads the home page, **Then** a responsive grid of poll cards is displayed, each showing question, subtitle, and current results.
2. **Given** a poll's direct link (containing its poll identifier), **When** a user navigates to that URL, **Then** the individual poll card is displayed the same way it would appear in the grid.
3. **Given** the grid is on screen, **When** the browser window is resized narrower or wider, **Then** the number of cards per row adjusts responsively without loss of readability.

---

### User Story 4 - Admin Creates and Configures a Poll (Priority: P4)

An administrator opens the poll administration area, creates a new poll (which starts with sensible defaults and two placeholder choices), and edits its title, subtitle, and choice list until it is ready to publish.

**Why this priority**: Nothing can be voted on until an administrator can create and configure it; this is the producing side of the core loop and is required before any voter-facing story can be exercised with real content.

**Independent Test**: As an admin, click "Create New Poll," confirm it opens pre-filled with the documented defaults, rename the title and choices, add a third choice, and confirm the changes are saved automatically and reflected immediately when the poll is viewed.

**Acceptance Scenarios**:

1. **Given** an admin on the administration main page, **When** they select "Create New Poll," **Then** a new poll is created with `SINGLE-CHOICE-POLL`, `ANONYMOUS-POLL`, `FINAL-VOTE-POLL`, `PUBLIC_POLL`, no start/end time, `ACTIVE-POLL-STATE`, a title of "New Poll" with a unique timestamp suffix, an empty subtitle, and two choices labeled "Choice 1" and "Choice 2" — and the admin is taken straight to that poll's configuration page.
2. **Given** the poll configuration page, **When** the admin edits the title, subtitle, or a choice label and the field loses focus (or an equivalent commit action occurs), **Then** the change is saved without the admin needing to click a separate "Save" button.
3. **Given** a poll with fewer than 50 choices, **When** the admin adds a choice, **Then** a new choice labeled "Choice #N" (N = its 1-based position) is appended and immediately editable.
4. **Given** a poll with exactly 2 choices, **When** the admin attempts to remove one, **Then** the removal is prevented and the admin is informed the minimum of 2 choices must remain.
5. **Given** a poll with 50 choices, **When** the admin attempts to add another, **Then** the addition is prevented and the admin is informed the maximum of 50 choices has been reached.
6. **Given** an existing choice label, **When** the admin tries to save another choice with the same label (or an empty label), **Then** the save is rejected and the admin is shown feedback explaining why.
7. **Given** the admin poll list, **When** the admin opens it, **Then** every poll's title, subtitle, state, and created/start/end times are listed sorted with the most recently created poll first.

---

### User Story 5 - Admin Manages Choice Removal and Poll Duplication (Priority: P5)

An administrator removes a choice from a poll that already has votes, and separately duplicates an existing poll to reuse its configuration for a new round.

**Why this priority**: Choice removal has unusually specific rules about what happens to affected voters' state and must behave correctly before polls can be safely edited once they're live; duplication is the main way admins reuse a working poll setup.

**Independent Test**: On a poll with votes on a given choice, remove that choice as admin, and confirm affected voters' state is reset to "not yet voted" while the choice disappears from voter-facing results; separately, duplicate a poll and confirm the copy has a new identifier, no votes, and (only if invitation-only) the same invited/banned lists.

**Acceptance Scenarios**:

1. **Given** a choice with no votes, **When** the admin removes it, **Then** it is deleted from the poll's configuration outright.
2. **Given** a choice that already has votes, **When** the admin removes it, **Then** the choice is marked `(removed)` (its label suffixed with "(removed)", truncated as needed to stay within 100 characters) rather than deleted, and it disappears from both the voting and results sides shown to voters.
3. **Given** a participant whose only current selection was on a choice that was just removed, **When** results are next viewed, **Then** that participant's vote is marked `(removed)` (i.e., no current vote), they are listed among participants who have not yet voted, and they are allowed to vote again — even on a `FINAL-VOTE-POLL` or a `PRIVATE_POLL_ANYONE_WITH_THE_LINK` poll that would otherwise block re-voting.
4. **Given** a poll with a `(removed)` choice, **When** an admin (not a voter) opens the poll's edit view, **Then** the `(removed)` choice is visible, labeled as removed, for audit purposes.
5. **Given** a `(removed)` choice, **When** results are exported (JSON or Markdown), **Then** the removed choice and its votes are excluded from the export.
6. **Given** any poll, **When** an admin selects "Duplicate Poll," **Then** a new poll is created with the same configuration, a newly generated identifier, no votes, `ACTIVE-POLL-STATE`, and empty start/end times, and no `(removed)` choices carried over.
7. **Given** a poll being duplicated, **When** its `AccessMode` is `PRIVATE_POLL_INVITATION_ONLY`, **Then** its `InvitedVoterList` and `BannedVoterList` are copied to the new poll; for any other `AccessMode`, those lists are not copied.

---

### User Story 6 - Admin Manages Poll Lifecycle and Scheduling (Priority: P6)

An administrator sets an optional start and/or end date/time on a poll and can manually close or archive a poll ahead of schedule.

**Why this priority**: Time-boxing and retiring polls is a distinct, independently valuable capability that doesn't require any of the participant-management or export features to be useful on its own.

**Independent Test**: Set a future start time on a poll and confirm voters are told it hasn't started yet; set a past end time on another poll and confirm voters are told it has closed; manually archive a third poll and confirm it disappears from voter-facing views while remaining visible to admins.

**Acceptance Scenarios**:

1. **Given** a poll with a `START_DATE_TIME` in the future, **When** a user tries to view or vote on it, **Then** they are told the poll has not started yet, shown the poll's `PENDING-POLL-STATE`.
2. **Given** a poll whose `END_DATE_TIME` has passed, **When** a user tries to vote, **Then** the vote is rejected and they are told the poll is closed (`CLOSED-POLL-STATE`).
3. **Given** a poll with a `START_DATE_TIME` and/or `END_DATE_TIME` set, **When** it is displayed to a user, **Then** the times are shown converted to that user's local time zone, while stored in the system in UTC.
4. **Given** an active poll, **When** an admin sets its state to `CLOSED-POLL-STATE` via the state dropdown, **Then** its `END_DATE_TIME` is set to the current date/time and no further votes are accepted.
5. **Given** any poll, **When** an admin sets its state to `ARCHIVED-POLL-STATE`, **Then** its `END_DATE_TIME` is set to the current date/time, it is hidden from all voter-facing views, and its configuration and vote history are retained; an admin can later restore it to `CLOSED-POLL-STATE`.
6. **Given** a poll that already has at least one vote and whose `START_DATE_TIME` has already passed, **When** an admin tries to move the `START_DATE_TIME` into the future, **Then** the change is rejected.
7. **Given** an admin sets both a start and end time, **When** the start time is not earlier than the end time, **Then** the change is rejected and the admin is informed.

---

### User Story 7 - Restricted-Access Polls: Link-Only and Invitation-Only (Priority: P7)

An administrator creates a poll that is not publicly listed — either voteable by anyone who has the link (with an optional cap on the number of voters) or restricted to a pre-defined list of invited email addresses.

**Why this priority**: Access control is what makes private polling possible and is required before participant-management and result-visibility rules (Story 8) can be exercised meaningfully, but it is not needed for the core public-voting loop to deliver value.

**Independent Test**: Create a link-only poll with a voter cap of 2, vote as two different logged-in users, and confirm a third is blocked with a "poll is full" message; separately, create an invitation-only poll with one invited address, confirm a non-invited logged-in user is told they're not invited while the invited user can vote.

**Acceptance Scenarios**:

1. **Given** a `PUBLIC_POLL`, **When** the home grid or any future search/suggestion surface is queried, **Then** it is eligible to appear; **given** a `PRIVATE_POLL_ANYONE_WITH_THE_LINK` or `PRIVATE_POLL_INVITATION_ONLY` poll, **When** the same discovery surfaces are queried, **Then** it is never included, and it is only reachable via its direct link.
2. **Given** a `PRIVATE_POLL_ANYONE_WITH_THE_LINK` poll, **When** a logged-in user who is not on any list opens its direct link, **Then** they can view and vote on it (subject to the voter cap).
3. **Given** a `PRIVATE_POLL_ANYONE_WITH_THE_LINK` poll whose number of distinct voters has reached its `VoterCountLimit`, **When** another user tries to vote, **Then** they are told the poll has reached its maximum number of votes and are not permitted to vote.
4. **Given** a `PRIVATE_POLL_ANYONE_WITH_THE_LINK` poll, **When** a user who has not logged in opens its results, **Then** the results are not shown until they log in (unlike a `PUBLIC_POLL`, whose results are visible to guests).
5. **Given** a `PRIVATE_POLL_INVITATION_ONLY` poll, **When** a logged-in user whose account email address appears in its `InvitedVoterList` opens the poll (via link or after login), **Then** they can view and vote on it.
6. **Given** a `PRIVATE_POLL_INVITATION_ONLY` poll, **When** a logged-in user whose email address is not in its `InvitedVoterList` opens the poll's direct link, **Then** they are told they are not invited to vote and cannot vote.
7. **Given** a `PRIVATE_POLL_INVITATION_ONLY` poll is created, **When** its `InvitedVoterList` is set, **Then** a vote record is pre-seeded for every invited address with an empty (no-vote) selection, so they show up as "not yet voted" until they vote.
8. **Given** a poll's `AccessMode`, **When** it has already received at least one vote, **Then** its `AccessMode` can no longer be changed.

---

### User Story 8 - Admin Manages Participants, Bans, and Result Exports (Priority: P8)

An administrator reviews who has voted and who hasn't, removes a specific participant's vote (banning them from further voting on that poll), reverses a ban, and exports a poll's results.

**Why this priority**: This closes the loop on poll operations — moderation and reporting — but depends on votes and access-mode configuration already existing (Stories 1–2 and 7), so it is appropriately sequenced after them.

**Independent Test**: As admin, open a poll's Edit Poll Configuration page and remove one participant from its Participants section (confirm their vote no longer counts and they appear in the banned list), confirm they cannot vote again, then un-ban them (confirm they can be re-invited/re-vote from scratch); separately, open the poll's results view and export the results as both JSON and Markdown.

**Acceptance Scenarios**:

1. **Given** a poll's "View Results" admin page, **When** it is opened, **Then** it shows the same aggregate results a voter would see, plus a list of participants who have voted (with their choices) and, for `PRIVATE_POLL_INVITATION_ONLY` polls, a list of those who have not yet voted.
2. **Given** a participant on the banned list, **When** the "View Results" or "Edit Poll" participant lists are displayed, **Then** that person does not appear in the "voted" or "not yet voted" lists.
3. **Given** a participant who has voted on any access mode, **When** an admin removes them from the participant/invited list, **Then** their vote is removed from the results and their email address is added to the poll's `BannedVoterList`.
4. **Given** an email address on a poll's `BannedVoterList`, **When** a user with that address tries to vote on that poll, **Then** the vote is rejected.
5. **Given** an email address on a poll's `BannedVoterList`, **When** an admin removes it from that list, **Then** the address may vote (or, for invitation-only polls, must be re-added to the `InvitedVoterList` before they can vote again) — but their previously removed vote is not restored.
6. **Given** a poll's results, **When** an admin selects "Export JSON" or "Export Markdown," **Then** a file in that format is produced containing the poll's configuration and current (non-removed) vote results.
7. **Given** the poll configuration page for an invitation-only poll, **When** an admin adds an email address already present in its `InvitedVoterList`, **Then** the addition is rejected with feedback that the address is already invited.

---

### Edge Cases

- What happens when a user attempts to submit a vote for a poll whose `POLL_STATE` changed to `CLOSED-POLL-STATE` or `ARCHIVED-POLL-STATE` between the time the page loaded and the time they submit? The vote MUST be rejected and the current state communicated to the user.
- What happens when an admin tries to switch `ChoiceMode` from `MULTIPLE-CHOICE-POLL` to `SINGLE-CHOICE-POLL` after more than one vote exists for some choice? The change MUST be rejected.
- What happens when the last remaining participant on a `PRIVATE_POLL_INVITATION_ONLY` invited list is removed (banned)? The poll simply has zero invited participants remaining; this is allowed.
- What happens when an admin attempts to remove a `BannedVoterList` entry and re-invite the same address in one motion? Un-banning and re-inviting are separate, explicit actions — the address must be added back to the `InvitedVoterList` as its own step.
- What happens if a `Title`, `SubTitle`, `ChoiceLabel`, or email-address field is pasted with more characters than its limit? Input MUST be prevented from exceeding the limit, with feedback shown to the user attempting it.
- What happens when two votes for the same participant on a `MULTIPLE-CHOICE-POLL` are submitted with an identical timestamp (the normal case for a single multi-select submission) versus different timestamps? Only the full set of choices sharing the single most recent timestamp counts as the current vote; anything with an earlier timestamp is superseded.
- What happens when a poll has a `START_DATE_TIME` but no `END_DATE_TIME` (or vice versa)? Each is independently optional; only the ones that are set are enforced and displayed.
- What happens when an admin duplicates a poll that has `(removed)` choices? The duplicate starts with only the currently active (non-removed) choices, freshly ordered, and no vote history.
- What happens if the same person votes on a poll through two different logged-in accounts? Each account is a distinct Participant and both votes count independently; detecting or preventing this kind of multi-account collusion is explicitly out of scope for this feature (see Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

**Poll configuration & data limits**

- **FR-001**: System MUST generate a unique poll identifier (`PID`) at poll creation time.
- **FR-002**: System MUST enforce a `Title/Question` of up to 100 characters (multiline permitted), preventing further input once the limit is reached and giving the user feedback when they try to exceed it.
- **FR-003**: System MUST enforce an optional `SubTitle` of up to 100 characters (multiline permitted) with the same input-limit feedback behavior.
- **FR-004**: System MUST enforce each `ChoiceLabel` as single-line, up to 100 characters, with the same input-limit feedback behavior.
- **FR-005**: System MUST require every poll to have between 2 and 50 choices at all times.
- **FR-006**: System MUST reject a choice label that is empty or duplicates another active choice label on the same poll, with feedback to the admin explaining the rejection.
- **FR-007**: System MUST support a per-poll `VoterCountLimit` that only applies to `PRIVATE_POLL_ANYONE_WITH_THE_LINK` polls. **Superseded by `005-admin-page-improvements` US4**: the default is now blank/unlimited (`PUBLIC_POLL` is the default `AccessMode`, and `VoterCountLimit` now tracks `AccessMode`'s Public/private transitions — see that feature's FR-017–021 and data-model.md).
- **FR-008**: System MUST support an `InvitedVoterList` of up to 500 email addresses (each up to 200 characters) for `PRIVATE_POLL_INVITATION_ONLY` polls.
- **FR-009**: System MUST support a per-poll `BannedVoterList` of email addresses (each up to 200 characters).
- **FR-010**: System MUST support `ChoiceMode` of `SINGLE-CHOICE-POLL` (default) or `MULTIPLE-CHOICE-POLL`.
- **FR-011**: System MUST support a per-poll, admin-configurable `ResultsVisibility` setting of `ANONYMOUS-POLL` (default) or `TRANSPARENT-POLL`, stored and editable as poll configuration. Differentiating the two in what a non-admin viewer of a poll's results actually sees is deferred to a future implementation (see Assumptions); for this iteration, the voter-facing results display (poll card and any expanded results view) shows only aggregate counts and percentages regardless of `ResultsVisibility`, and the admin "View Results" page and exports continue to show full per-participant detail (FR-054/FR-055) irrespective of this setting.
- **FR-012**: System MUST support `VoteMutability` of `FINAL-VOTE-POLL` (default, vote cannot be changed) or a dynamic mode where a voter can change their vote at any time before the poll closes.
- **FR-013**: System MUST support `AccessMode` of `PUBLIC_POLL` (default), `PRIVATE_POLL_ANYONE_WITH_THE_LINK`, or `PRIVATE_POLL_INVITATION_ONLY`, each with the discovery, visibility, and eligibility rules described in User Story 7.
- **FR-014**: System MUST track `POLL_STATE` as one of `PENDING-POLL-STATE`, `ACTIVE-POLL-STATE` (default), `CLOSED-POLL-STATE`, or `ARCHIVED-POLL-STATE`, derived from `START_DATE_TIME`/`END_DATE_TIME` except where an admin has explicitly set `CLOSED-POLL-STATE` or `ARCHIVED-POLL-STATE`.
- **FR-015**: System MUST support optional `START_DATE_TIME` and `END_DATE_TIME`, stored in UTC and displayed to users converted to their browser-detected local time zone, with `START_DATE_TIME` required to be earlier than `END_DATE_TIME` when both are set.

**Voting & results**

- **FR-016**: System MUST require a user to be logged in before they can cast a vote on any poll, regardless of `AccessMode`.
- **FR-017**: System MUST allow a guest (not logged in) to view results of a `PUBLIC_POLL` but MUST NOT reveal results of a `PRIVATE_POLL_ANYONE_WITH_THE_LINK` or `PRIVATE_POLL_INVITATION_ONLY` poll to a guest.
- **FR-018**: System MUST record each vote submission with a version timestamp, keeping prior submissions in history rather than overwriting them.
- **FR-019**: System MUST treat, for a `SINGLE-CHOICE-POLL`, only the most recent vote by a participant as counting toward results.
- **FR-020**: System MUST treat, for a `MULTIPLE-CHOICE-POLL`, only the most recent set of choices sharing the participant's latest timestamp as counting toward results.
- **FR-021**: System MUST compute each choice's displayed percentage against the total number of distinct participants who have voted on a `SINGLE-CHOICE-POLL`, and against the total number of selections cast on a `MULTIPLE-CHOICE-POLL`, so that a multiple-choice poll's percentages add up to 100 (apart from rounding).
- **FR-022**: System MUST display, alongside each poll's results, the total number of participants who have voted, and — for `PRIVATE_POLL_INVITATION_ONLY` polls — the total number who have not yet voted.
- **FR-023**: System MUST disable the vote submission control until at least one choice is selected.
- **FR-024**: System MUST prevent a `SINGLE-CHOICE-POLL` voting UI from having more than one choice selected at a time (selecting a new choice deselects the previous one).
- **FR-025**: System MUST allow a `MULTIPLE-CHOICE-POLL` voting UI to select and deselect any number of choices before submission.
- **FR-026**: System MUST refresh the results shown to a viewer by polling the server on an interval controlled by the `APP_POLLING_INTERVAL` configuration (default 5000 ms), without requiring a manual page reload.
- **FR-027**: System MUST reject a vote submitted for a poll that is not in `ACTIVE-POLL-STATE` and inform the user of the poll's current state (not yet started or closed).
- **FR-028**: System MUST reject a vote from a participant whose email address is on the poll's `BannedVoterList`.
- **FR-029**: System MUST reject additional votes on a `PRIVATE_POLL_ANYONE_WITH_THE_LINK` poll once its distinct-voter count reaches its `VoterCountLimit`, informing the user the poll is full.
- **FR-030**: System MUST reject a vote on a `PRIVATE_POLL_INVITATION_ONLY` poll from a user whose email address is not in the `InvitedVoterList`, informing them they are not invited.
- **FR-031**: System MUST pre-seed a `PRIVATE_POLL_INVITATION_ONLY` poll's vote records with an empty ("no vote") entry for every address in its `InvitedVoterList` at the time the list is set.

**Discovery & home grid**

- **FR-032**: System MUST render the home page as a responsive grid of poll cards for eligible `PUBLIC_POLL`s, listing all eligible polls with no pagination or count limit in this iteration.
- **FR-033**: System MUST make `PUBLIC_POLL`s discoverable via the home grid and via direct navigation to a poll's link (a dedicated search feature is out of scope for this iteration; see Assumptions); `PRIVATE_POLL_ANYONE_WITH_THE_LINK` and `PRIVATE_POLL_INVITATION_ONLY` polls MUST be reachable only via their direct link (or, for invitation-only, a post-login suggestion to an invited user) and MUST never appear in the home grid or any future search results.
- **FR-034**: System MUST allow any poll's link to be copied for sharing, containing the identifying parameter needed to navigate directly to that poll.

**Poll administration**

- **FR-035**: System MUST restrict access to all poll administration pages to logged-in users whose account identifier is on the `APP_ADMINS`-configured administrator allow-list, managed entirely through environment configuration and not editable through the admin UI. The general (non-admin) header's "Create Poll" link, adopted from the reference design, MUST be rendered greyed-out/disabled for all visitors in this iteration, regardless of admin status; it is not wired to the administration area. Admins reach the administration pages only via direct URL navigation; admin-aware behavior for the header link is deferred to a future implementation.
- **FR-036**: System MUST provide a "Create New Poll" action that creates a poll with the documented defaults (see User Story 4, Acceptance Scenario 1) and navigates the admin directly to its configuration page.
- **FR-037**: System MUST provide an administration list of all polls, sorted by creation time descending, showing each poll's title, subtitle, state, and created/start/end times, with no pagination or count limit in this iteration.
- **FR-038**: System MUST provide, per poll in the admin list, actions to view results, edit the poll, copy its link, and duplicate it.
- **FR-039**: System MUST let an admin add, edit the label of, and remove choices, subject to the 2–50 count limit and the no-duplicate/no-empty label rules.
- **FR-040**: System MUST, when a choice with existing votes is removed, mark it `(removed)` (retaining it and its votes rather than deleting them) instead of deleting it outright, suffixing its label with "(removed)" (truncating the base label as needed to keep the total at or under 100 characters).
- **FR-041**: System MUST exclude `(removed)` choices and their votes from voter-facing voting/results views and from exports, while still showing them to admins in the poll's edit view for audit purposes.
- **FR-042**: System MUST, when a choice is removed, mark any participant's vote that was solely for that choice as `(removed)` (no current vote), list that participant as not-yet-voted, and allow them to vote again regardless of the poll's `VoteMutability` or `AccessMode` re-vote restrictions.
- **FR-043**: System MUST NOT provide a way to undo a choice removal; an admin may add a new choice with the same label as a previously removed one, but it is treated as a new choice with no restored votes.
- **FR-044**: System MUST let an admin duplicate a poll into a new poll with the same configuration, a new `PID`, `ACTIVE-POLL-STATE`, no start/end time, no votes, and no `(removed)` choices — copying the `InvitedVoterList`/`BannedVoterList` only when the source poll's `AccessMode` is `PRIVATE_POLL_INVITATION_ONLY`.
- **FR-045**: System MUST let an admin set `POLL_STATE` to `CLOSED-POLL-STATE` (setting `END_DATE_TIME` to now and blocking further votes) or `ARCHIVED-POLL-STATE` (soft-delete: hidden from voters, `END_DATE_TIME` set to now, configuration and history retained, restorable to `CLOSED-POLL-STATE`); the dropdown MUST NOT offer `ACTIVE-POLL-STATE` or `PENDING-POLL-STATE` as directly settable, since those are derived from the schedule. Retention of a poll's configuration and vote history (any state, including `ARCHIVED-POLL-STATE`) is indefinite; this feature defines no automatic purge/deletion mechanism.
- **FR-046**: System MUST let an admin set or clear `START_DATE_TIME` and `END_DATE_TIME` via a date/time picker, subject to: the ordering rule (start before end when both set), and a prohibition on moving an already-passed `START_DATE_TIME` into the future once the poll has at least one vote.
- **FR-047**: System MUST let an admin change `ChoiceMode`, `ResultsVisibility`, and `VoteMutability` at any time, except that `ChoiceMode` MUST NOT be changed to `SINGLE-CHOICE-POLL` if any choice already has more than one vote.
- **FR-048**: System MUST let an admin change `AccessMode` to any of the 3 supported values only until the poll has received its first vote, after which `AccessMode` is locked.
- **FR-049**: System MUST provide an invitation-only poll's admin configuration with an ascending-by-email `InvitedVoterList` view, supporting adding a unique, ≤200-character email address and removing an existing one, with no pagination or count limit on the displayed list in this iteration.
- **FR-050**: System MUST, when an admin removes an address from a poll's participant/invited list, remove that participant's vote from results and add their address to the poll's `BannedVoterList`.
- **FR-051**: System MUST reject any vote from an address on the `BannedVoterList` and MUST list banned addresses to admins in a distinct "Banned Voter List" view below the invited/participant list.
- **FR-052**: System MUST let an admin remove an address from the `BannedVoterList` without restoring its prior removed vote or re-adding it to the `InvitedVoterList` automatically.
- **FR-053**: System MUST provide, for `PRIVATE_POLL_ANYONE_WITH_THE_LINK` and `PUBLIC_POLL` polls, an admin participant view listing voters by `userName` and `emailAddress`, sorted by `userName` ascending, with the same remove/ban and un-ban behavior as invitation-only polls, and with no pagination or count limit on the displayed list in this iteration.
- **FR-054**: System MUST provide a "View Results" admin page showing the same aggregate results as the voter-facing card plus a list of participants who have voted (with their choices) and, for invitation-only polls, a list of those who have not yet voted — excluding any banned addresses from both lists.
- **FR-055**: System MUST provide "Export JSON" and "Export Markdown" actions on the "View Results" admin page that produce the poll's current (non-removed) results in the respective format.
- **FR-056**: System MUST NOT require the admin poll list page to auto-refresh `POLL_STATE` as time passes; it reflects state as of the page load.
- **FR-057**: System MUST enforce the `userName` profile-editing length limit with the same input-prevention-plus-feedback behavior as poll fields.

### Key Entities

- **Poll**: A single opinion poll. Attributes: `PID` (unique identifier), `Title/Question`, `SubTitle`, `ChoiceMode`, `ResultsVisibility`, `VoteMutability`, `AccessMode`, `VoterCountLimit`, `POLL_STATE`, `CREATE_DATE_TIME`, `START_DATE_TIME`, `END_DATE_TIME`. Owns an ordered list of Choices and, depending on `AccessMode`, an `InvitedVoterList` and a `BannedVoterList`.
- **Choice**: One selectable option on a Poll. Attributes: label (≤100 chars), position/order, and a removed flag (choices are never hard-deleted once voted on; they are marked `(removed)`).
- **Vote**: A time-stamped record of a participant's selection(s) on a Poll at a point in time. Multiple Votes accumulate per participant over time; only the most recent (by shared timestamp for multi-select) counts toward results. A Vote can itself be marked `(removed)` as a side effect of choice removal.
- **Participant**: A voter's relationship to a specific Poll, identified by their account (`userName`, `emailAddress`). Distinct from the account itself — the same person is a different Participant on each Poll they interact with.
- **InvitedVoterList entry**: An email address (≤200 chars) pre-authorized to vote on a `PRIVATE_POLL_INVITATION_ONLY` poll, pre-seeded with an empty vote record.
- **BannedVoterList entry**: An email address (≤200 chars) explicitly barred from voting on a specific poll, created only as a side effect of an admin removing that address from the invited/participant list.
- **Administrator allow-list entry**: An account identifier authorized to access the Poll Administration Pages; managed entirely through system configuration, not through the admin UI itself.
- **Profile** *(existing entity, owned by the prior authentication feature)*: The logged-in account a Participant and an Administrator are both backed by — supplies `userName`, `emailAddress`, and login state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A logged-in voter can go from opening a public poll to seeing their vote reflected in the results in under 10 seconds.
- **SC-002**: Any viewer looking at an open poll sees a vote cast by someone else reflected in the displayed results within one polling interval (default 5 seconds) without manually reloading the page.
- **SC-003**: An administrator can create a new poll and have it accepting votes in under 1 minute from opening the administration area.
- **SC-004**: 100% of votes tied to a `(removed)` choice are absent from voter-facing results and from exports, while remaining visible to admins for audit.
- **SC-005**: 100% of vote-count calculations on `MULTIPLE-CHOICE-POLL`s reflect distinct participants, and 100% of their percentage calculations are against the total number of selections.
- **SC-006**: A `PRIVATE_POLL_ANYONE_WITH_THE_LINK` poll never accepts a vote once its distinct-voter count equals its `VoterCountLimit`.
- **SC-007**: A `PRIVATE_POLL_INVITATION_ONLY` poll never accepts a vote from, or reveals results to, an account whose email address is absent from its `InvitedVoterList` or present on its `BannedVoterList`.
- **SC-008**: 100% of attempts to enter text beyond a field's documented character limit (title, subtitle, choice label, email address, `userName`) are blocked at the point of entry with visible feedback.
- **SC-009**: An admin can locate any poll's current state, participant counts, and export its results without needing to query the underlying data store directly.
- **SC-010**: The system maintains the SC-001/SC-002 response and refresh targets with up to 10,000 concurrent voters actively participating in a single poll, and with up to 1,000 polls simultaneously active system-wide; techniques for scaling beyond those figures are explicitly out of scope for this implementation.

## Assumptions

- This feature supersedes the previously implemented "Simple Web App Client" landing/demo experience; the underlying login, session, and profile-editing capabilities delivered by the prior authentication features (`001-user-auth`, `002-smtp-env-config`, `003-profile-menu-consolidation`) are retained and reused as-is as the identity system behind "Logged In," rather than rebuilt — only the site's home/landing surface and navigation are replaced by the poll grid and the header design referenced in the poll UI design files. The adopted header keeps both the reference design's "Create Poll" nav link and its "Search CrowdPoll" input, but renders each greyed-out/disabled per the source requirements' `EXCLUSIONS` section — visible for visual/layout fidelity to the reference design, not functional, and not gated by admin status. Full behavior for both is deferred to a future implementation.
- The adopted grid page also keeps the reference design's category filter bar (`Trending`, `Sports`, `Media`, etc., below the header) for visual/layout fidelity, rendered greyed-out/inert — same treatment as "Create Poll" and "Search CrowdPoll." No `Category` field or filtering capability is introduced by this spec; the bar is not wired to the poll grid's contents. Full behavior is deferred to a future implementation.
- A dedicated poll-search feature (free-text search page/box) is out of scope for this specification, per the source requirements' `EXCLUSIONS` section; discovery is limited to the home poll grid and direct links. The header's search input (from the reference design) is adopted visually but greyed-out/non-functional. "Search" as mentioned in the source requirements is treated as a future enhancement built on the same discovery rules defined here for `PUBLIC_POLL`s.
- The algorithm for ranking which public polls are "popular" or "suggested" on the home grid is left as an implementation detail for the planning phase (e.g., recency or vote volume); this spec only requires that eligible `PUBLIC_POLL`s are discoverable there.
- "Has received at least one vote," used as the trigger that locks `AccessMode` and restricts `ChoiceMode`/`START_DATE_TIME` edits, is interpreted as "has ever had at least one vote recorded in its history," even if that vote was later marked `(removed)` — the more conservative reading, so admins cannot bypass the restriction by having votes removed.
- Detecting or preventing one person voting through multiple accounts (e.g., via IP correlation, device fingerprinting) is explicitly out of scope for this feature, per the source requirements' `EXCLUSIONS` section. Voting eligibility is gated solely by being logged in through the existing authentication system, same as every other rule in this spec; the existing auth system's own rate limiting on account/magic-link creation is the only friction against throwaway accounts, and it was not built for, and is not being relied upon for, voting-integrity purposes.
- The Admin Poll List, the Home Page poll grid, and each poll's `Participants` lists (invited/voter/banned) render their complete sets with no pagination or infinite scroll in this iteration, per the source requirements' `EXCLUSIONS` section; this is an accepted simplification, not a scale target, and revisiting it is expected if list sizes grow large enough to affect page-load usability.
- The administrator allow-list (who may access the Poll Administration Pages) is configured entirely through the `APP_ADMINS` environment variable and is not editable through the admin UI, per the source requirements.
- "Logged In," "account," and `Profile` in this spec refer to the same authenticated-identity concept already defined by the existing authentication system in this project.
- The system is expected to perform smoothly with up to 10,000 concurrent voters on a single popular poll and up to 1,000 polls active system-wide (see SC-010), per the source requirements' explicit scale figures; techniques for scaling beyond that point are explicitly deferred to a future implementation.
- No formal accessibility conformance level (e.g., WCAG) is required for the voter-facing poll UI beyond what the adopted reference design files (`poll-card.html`/`.css`/`.js`, `live-results.html`, `responsive-grid.html`) already provide.
- Making `TRANSPARENT-POLL` visibly different from `ANONYMOUS-POLL` to a non-admin viewer (e.g., showing each participant's identity alongside their choice on the poll card or an expanded results view) is out of scope for this implementation, consistent with the reference `live-results.html` file being an explicit, unimplemented placeholder. This feature stores and lets admins configure the `ResultsVisibility` setting (FR-011), but its voter-facing effect is future work; only the admin "View Results" page and exports show per-participant detail today, unconditionally. The source requirements now describe the intended future `Live Results` page in more detail — showing a poll's title/subtitle, plus, for a `TRANSPARENT-POLL`, a list of voters by `userName` — which is recorded here to inform a later feature, but does not change this spec's scope.

**IMPORTANT** — Not part of the specification's own scope, but a consequence of the "replace" instruction: functional requirements and pages delivered by earlier features (`001-user-auth`, `002-smtp-env-config`, `003-profile-menu-consolidation`) are assumed to remain in force except where this document explicitly changes the home/landing experience; this spec does not re-derive or restate them.
