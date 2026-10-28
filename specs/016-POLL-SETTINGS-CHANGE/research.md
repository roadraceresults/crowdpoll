# Phase 0 Research: Poll Settings Change

Ten decisions. Each records what was chosen, why, and what was rejected. No `[NEEDS CLARIFICATION]`
items remained from the specification, so nothing here resolves an unknown — these are the design
choices the implementation would otherwise make ad hoc, plus the one place (R1) where the obvious
implementation compiles and is wrong.

---

## R1 — The predicate takes the poll, not the string

**Decision**: `isInvitationOnly` changes signature from `(v: PollVisibility) => boolean` to
`(poll: Pick<Poll, "pollVisibility" | "pollSharingMode">) => boolean` and is defined as
`!isPublicVisibility(poll.pollVisibility) && poll.pollSharingMode === "Invitation Only"`.
`isPublicVisibility` is unchanged. `INVITATION_ONLY_VISIBILITIES` is deleted.

**Rationale**: Today the predicate is `v.includes("Invitation Only")` — a substring test that the
014 plan already flagged as the site that fails silently. After this feature the substring no
longer exists in any visibility value, so the old body returns `false` for every poll, and every
caller quietly treats invitation-only polls as open to anyone. Changing the *parameter type* to the
poll is what makes the compiler find all seven call sites: each currently passes
`poll.pollVisibility`, which stops type-checking. The client copy in `adminCard.js:543` has no
compiler and is listed by name in the tasks for that reason.

**Alternatives considered**: keeping the string parameter and adding a second one
(`isInvitationOnly(visibility, sharingMode)`) — rejected because a call site that passes only the
first argument still compiles under an optional second parameter, which is the failure mode being
designed out. A derived stored field `isInvitationOnly` on the document — rejected as a second
source of truth for one boolean.

**Call sites** (server, all found by the type change): `service.ts` `viewerVoteBlock`,
`checkViewEligibility`, `validatePollFields` (roster reconciliation), `duplicatePoll` (two uses);
`pollsApi.ts` participants route. Query: `store.ts` `homeGridFilter`.

---

## R2 — `homeGridFilter` queries the pair

**Decision**: the invited-visitor clause becomes
`{ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only", invitedVoterList: callerEmail, bannedVoterList: { $ne: callerEmail } }`.

**Rationale**: it is the same rule as R1 expressed as a query; the `$in` over
`INVITATION_ONLY_VISIBILITIES` had no meaning once the values are two. No new index is added — the
grid query is unchanged in shape and the 017 datastore move retires this collection.

**Alternatives considered**: `pollSharingMode: "Invitation Only"` alone — rejected because a public
poll with a stale `Invitation Only` would appear only to its "invitees", contradicting FR-005.

---

## R3 — Two more verbatim enumerations, always present

**Decision**: `store.ts` gains
`POLL_SHARING_MODES = ["Anyone With The Link", "Invitation Only"] as const` and
`VOTE_ANONYMITIES = ["Yes", "No"] as const`, with derived types `PollSharingMode` and
`VoteAnonymity`. `Poll` gains `pollSharingMode: PollSharingMode` and `voteAnonymity: VoteAnonymity`,
both required. `createDefaultPoll` sets `"Anyone With The Link"` and `"Yes"`.

**Rationale**: matches the precedent `POLL_VISIBILITIES`, `ChoiceMode` and `VoteMutability` set in
014 — stored verbatim, rendered verbatim, no mapping table (FR-007). Required (not optional) fields
mean no null path anywhere: the card can pre-select, the predicate can read, the validator can
compare (FR-003, FR-004).

**Alternatives considered**: nullable fields cleared while public — rejected by the resolved
requirement (UNS-2): a mis-click on the visibility radio would lose `Invitation Only` on a poll
with a roster.

---

## R4 — Validation and the freeze mirror `pollVisibility` exactly

**Decision**: in `validatePollFields`, two new branches follow the existing `pollVisibility` branch with the
same shape: if the field is present in the body and `hasEverVoted`, throw
`AdminError(409, "pollSharingMode cannot be changed after the poll has received a vote.")` (and the
`voteAnonymity` equivalent); otherwise validate against the accept-list and throw
`AdminError(400, "Invalid pollSharingMode.")` / `"Invalid voteAnonymity."`; then `$set` it.

**Rationale**: FR-013 and FR-014 ask for exactly what the visibility branch already does; copying
its shape keeps the three settings' behaviour identical and the messages parallel. The card's
`hasVotes` flag (`hasEverBeenVotedOn` from the list row) already drives `radioGroup`'s frozen
rendering, so the client side needs no new state.

**Alternatives considered**: one combined check over the three fields — rejected because the
existing per-field structure names the offending field in the message (FR-013), and a loop over
three names is not simpler than three parallel branches.

---

## R5 — The card: two `radioGroup`s inside one hidden-toggled container

**Decision**: in the editing form, `pollSharingMode` and `voteAnonymity` are rendered with the
existing `radioGroup()` helper — captions `"Sharing Mode"` and `"Anonymous Votes"` — and appended to
the mechanics row immediately after `Poll Visibility`, wrapped in a container whose `hidden`
attribute is set when the visibility radio's current value is `"Public Poll"`. The visibility
radio's `onChange` toggles the container alongside its existing call to
`applyVoterLimitAvailability(v)`. Changes go through `markDirty(field, value)` like every other
setting; hiding does not touch the draft.

**Rationale**: the helper already produces the frozen (`is-frozen`) rendering, the `radiogroup`
role and the per-poll `aria-label`, so accessibility parity with the three existing groups is
inherited rather than re-implemented. `hidden` is the project's existing show/hide mechanism. Not
clearing the draft on hide is what FR-004's "switching back presents the stored values" requires.

**Alternatives considered**: disabling rather than hiding — rejected because the requirements say
"only visible"; 014's disable-not-hide preference was about controls whose disappearance would
reflow the card, which is why R6 keeps the read-only face in the same position.

---

## R6 — The read-only face shows the same fields in the same place

**Decision**: `renderReadOnly()` appends two `readOnlyField`s — `"Sharing Mode"` and
`"Anonymous Votes"` — to the `card-mechanics` block after `Poll Visibility`, only when
`current.pollVisibility !== "Public Poll"`.

**Rationale**: FR-010 and SC-005. Both faces show one field for a public poll and three for a
private one, in the same block, so the mode switch does not change the card's height. The
mechanics block already lays its fields out as a wrapping row; five fields wrap the same way five
fieldsets do.

**Alternatives considered**: always showing the two fields with a placeholder for public polls —
rejected as displaying two values the requirements say are ignored.

---

## R7 — `openapi.json`: three enums narrow, two properties added to admin schemas only

**Decision**: the three `pollVisibility` enum sites — `AdminPollDetail`, `AdminPollSummary` (the
list row) and the `POST /api/admin/polls/{pid}/publish` request body — become
`["Public Poll", "Private Poll"]`. `pollSharingMode` and `voteAnonymity` are added as required
properties on `AdminPollDetail` and `AdminPollSummary`, and as optional properties on the publish
body (the route through which the card saves settings). The public poll schemas are not touched.
`openapi-contract.test.ts` gains assertions for both.

**Rationale**: FR-019–FR-021. `buildAdminPollDetail` and the list row in `GET /api/admin/polls`
already spread or enumerate the poll's settings, so the two fields reach the wire once they exist
on the document; the contract must say so, and the contract test is what keeps the two in step.

**Alternatives considered**: adding the fields to the public poll schema "for completeness" —
rejected by FR-020 and by the project's precedent of never emitting settings a voter cannot act on.

---

## R8 — Tests: fixtures carry the defaults; private polls are built from the pair

**Decision**: `makePoll()` in `tests/helpers/poll-fixtures.ts` gains
`pollSharingMode: "Anyone With The Link"` and `voteAnonymity: "Yes"`. The 46 occurrences of the old
private values across seven suites are rewritten: `"Private Poll - Invitation Only - …"` becomes
`pollVisibility: "Private Poll", pollSharingMode: "Invitation Only"`, and
`"Private Poll - Anyone With The Link - …"` becomes `pollVisibility: "Private Poll"` (the default
sharing mode). The "Show Who Voted" half of every old value maps to nothing — no existing test
asserts on it, because nothing ever read it.

**Rationale**: SC-002 and SC-008. The existing suites *are* the regression guard for US3; they
must pass unchanged in intent against polls defined the new way. New cases are limited to what the
feature adds: the two 409s, the two 400s, the duplicate copy, the public-poll-with-stale-sharing-mode
case, and the participants label under the pair.

**Alternatives considered**: a compatibility shim that accepts the old strings in tests — rejected;
it would hide exactly the call sites R1 exists to expose.

---

## R9 — Comments and logging under the constitution

**Decision**: new code carries no comments. In `store.ts`, the doc comment on the predicate pair
("The only two questions the rest of the codebase asks of a visibility value") is deleted with the
line it describes, since that line is rewritten. Elsewhere, pre-existing `012 FR-…`-style comments
are left alone unless the line they sit on changes. Refusals go through `AdminError`, which the
route layer already logs server-side; nothing new is logged in the browser.

**Rationale**: constitution VI and its governance scope clause; principle V's logging split.

---

## R10 — `voteAnonymity` has no reader, and a test proves it

**Decision**: beyond validation, storage, the admin responses and the card, no code reads
`voteAnonymity`. One test asserts that the results endpoint and the participants endpoint return
identical bodies for a poll with `"Yes"` and the same poll with `"No"`.

**Rationale**: FR-018 defines the semantics and forbids implementing them here. The test is the
statement that keeps the next feature — the one that introduces a creator role — from assuming
enforcement already exists; it will fail the day someone wires the field in, which is the intended
signal to go and read the requirement.

**Alternatives considered**: a code comment saying "not yet enforced" — rejected by constitution
VI, and a test says it in a form the runner checks.
