# Feature Specification: Multiple Account Prevention

**Feature Branch**: `multiple-account-prevention`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "requirements/20261105-162941-multiple-account-prevention/requirements.md"

## Clarifications

### Session 2026-11-05

- Q: When a poll is deleted, what happens to its vote events? → A: they are removed with the poll, matching what the policy says about votes.
- Q: Does a session already open when collection starts get a sign-in event? → A: yes: the first page after collection starts records one event for it, and a sign-in event's time means "first seen in this session".

## User Scenarios & Testing *(mandatory)*

CrowdPoll's most important promise is one vote per person.
Before the site opens to the public, this feature starts gathering the evidence that a later feature will analyse offline to find one person voting from several accounts.
This feature collects, discloses and limits that evidence.
It detects nobody, and nothing changes for a voter.

### User Story 1 - Each vote leaves evidence, and the voter notices nothing (Priority: P1)

A signed-in voter votes on a poll exactly as before.
Alongside the vote, CrowdPoll records which account voted on which poll, when, and the fingerprint of the device and browser it came from.
The record never says how the account voted.

**Why this priority**: Voting from several accounts is the abuse that matters most, and evidence that was not recorded at the time cannot be recovered later.

**Independent Test**: Vote from a signed-in browser, including a changed vote, and confirm that each accepted vote has a matching record and that the voter's experience and the counts are unchanged.

**Acceptance Scenarios**:

1. **Given** collection is on and a voter has accepted the current Terms, **When** they vote, **Then** a vote event is recorded with their account, the poll, the time and both fingerprint values, and no choice.
2. **Given** a poll that allows changing a vote, **When** a voter changes or clears their vote, **Then** each accepted change is recorded as its own vote event.
3. **Given** a vote is refused for any reason, **When** the refusal is returned, **Then** no vote event is recorded.
4. **Given** the fingerprint is missing or malformed, **When** the voter votes, **Then** the vote succeeds without delay and the vote event is recorded with empty fingerprint values.
5. **Given** two accounts vote from the same browser, **When** the records are compared, **Then** their browser values are equal.
6. **Given** one account votes from two different browsers on the same computer, **When** the records are compared, **Then** their browser values differ, and their hardware values match unless the browser's own protections prevent it.

---

### User Story 2 - Each sign-in leaves evidence, whichever way the user signs in (Priority: P2)

A user signs in by email link, social provider or invitation link.
The first page of the signed-in site that loads after the session starts, and after the Terms are accepted, reports the fingerprint once.

**Why this priority**: Sign-ins widen the evidence, but the requirements rank them below votes, which each carry their own fingerprint.

**Independent Test**: Sign in by each method, load several pages and tabs, and confirm exactly one sign-in event for the session.

**Acceptance Scenarios**:

1. **Given** a user has just signed in by any method and has accepted the current Terms, **When** the first page loads, **Then** one sign-in event is recorded with their account, the time and both fingerprint values.
2. **Given** a session already has a sign-in event, **When** more pages or tabs load, or the user returns later in the same session, **Then** no further sign-in event is recorded.
3. **Given** a user signed in but has not accepted the current Terms, **When** they are shown the acceptance page, **Then** nothing is computed or sent until they accept.
4. **Given** a visitor is not signed in, **When** they view any page, **Then** no fingerprint is computed or sent.
5. **Given** a session was already open when collection started, **When** its next page loads, **Then** one sign-in event is recorded, with that moment as its time.

---

### User Story 3 - Users are told, and accept, before anything is collected (Priority: P1)

A user opening CrowdPoll after this release is asked to accept the updated Privacy Policy and Terms.
The policy explains in plain words what is collected, why, for how long, who can see it, and that it is never used for advertising.
The policy's former claims that contradict this are corrected.

**Why this priority**: The policy now promises "no tracking" and "no profiling". Collecting before those promises are corrected and accepted would break the site's word to its users.

**Independent Test**: Sign in with an account that accepted the previous version, confirm the acceptance page appears, read the updated policy, and confirm no record exists for that account until acceptance.

**Acceptance Scenarios**:

1. **Given** an account accepted the previous Terms, **When** it next uses CrowdPoll, **Then** it must accept the new version once before continuing.
2. **Given** a reader opens the Privacy Policy, **When** they read what is collected, the summary at the top and the retention table, **Then** all of them describe the fingerprint collection consistently, and none claims the absence of it.
3. **Given** a reader reads the bot and AI agent detection section, **When** they compare it with the new collection, **Then** the two are clearly separate, and that section's statements about itself remain true.
4. **Given** a reader reads the Terms, **When** they reach the rule of one account per person, **Then** they can see that device evidence is collected to uphold that rule.

---

### User Story 4 - The evidence is limited in time and removed with the account (Priority: P2)

A user who deletes their account has its records removed at once.
All other records expire on their own.

**Why this priority**: The less that is kept, the easier the privacy case, and the policy promises that a user's data goes with their account.

**Independent Test**: Delete an account and confirm its records are gone; age records past the limit and confirm the retention sweep removes them.

**Acceptance Scenarios**:

1. **Given** an account has records, **When** the account is deleted, **Then** all its records are removed in the same operation.
2. **Given** a vote from an account is still waiting to be saved, **When** the account is deleted, **Then** no record for that account is saved afterwards.
3. **Given** records from a calendar month that is wholly older than 3 months, **When** the retention sweep runs, **Then** that month's records are removed.
4. **Given** a user asks for a copy of their data, **When** the operator prepares it, **Then** their records can be found and included.

---

### User Story 5 - The operator controls collection and can see that it works (Priority: P2)

The operator turns collection on with one setting, after confirming that every current account is a test user and telling those users directly.
Afterwards, a periodic count shows how many events arrived with and without a fingerprint.

**Why this priority**: The operator must be able to ship the code before collection begins, and a silent failure would otherwise be noticed only when the later analysis starts.

**Independent Test**: With the setting off, vote and sign in and confirm the fingerprint library is not loaded and nothing is computed, sent or recorded; turn it on, repeat, and confirm the records and the count.

**Acceptance Scenarios**:

1. **Given** the setting is off, which is the default, **When** a user signs in or votes, **Then** no fingerprint is computed, sent or recorded.
2. **Given** the setting is on, **When** the counting period ends, **Then** the operator sees the number of events with and without a fingerprint, with no account, device value or address in it.
3. **Given** a poll creator or an in-app administrator, **When** they use any screen or request available to them, **Then** they cannot see any record.

---

### Edge Cases

- **A vote made before the fingerprint is ready**: the vote does not wait; its event has empty values, and the next vote on that page carries the fingerprint.
- **An oversized or malformed fingerprint value, or a direct call without one**: treated as missing; the vote is unaffected.
- **Browsers with fingerprint protection** (Safari, Firefox, private modes): whatever they report is recorded as it is; a value may differ from one visit to the next, which the later analysis must allow for.
- **Identical devices**: two phones of one model may share a hardware value, so that value alone never identifies a device.
- **A vote refused for load and retried**: only the accepted attempt is recorded.
- **A long vote queue**: events wait with their votes and are saved with them, and none is lost when processing is slow.
- **A vote queued before the release**: it is saved as usual, and no event is recorded for it because it holds no account or fingerprint.
- **A poll deleted while its vote is queued**: the vote and its event are dropped together.
- **A session open when collection starts**: it gets one sign-in event on its next page load, so that event marks when the session was first seen, not when the user signed in.
- **A poll deleted later**: its vote events are removed with it, as the policy says of votes; sign-in events are unaffected.
- **An email address changed**: records are unaffected, because they are held by account and not by address.
- **Collection turned off while users are signed in**: pages already open may send one more value; it is ignored, and no record is written.
- **The secret or library version changed**: older values no longer match newer ones, and each record's version number shows this.
- **Votes written directly by development scripts**: no events are created.

## Requirements *(mandatory)*

### Functional Requirements

**Collection**

- **FR-001**: System MUST record a vote event for every vote it accepts from a signed-in account, including changed and cleared votes.
- **FR-002**: System MUST NOT record an event for a refused vote.
- **FR-003**: System MUST record one sign-in event per session, from the first page of the signed-in site that loads after the session starts, the current Terms are accepted and collection is on, for every sign-in method; this includes a session already open when collection starts, and the event's time means "first seen in this session".
- **FR-004**: Each record MUST hold the account, the event type (sign-in or vote), the poll for a vote event, the time, a browser fingerprint value, a hardware fingerprint value based on hardware-like attributes that browsers report alike (screen, colour depth, CPU cores, time zone, platform), and a version number for the fingerprint method and secret.
- **FR-005**: A record MUST NOT hold the voter's choices, IP address, user agent, or email address.
- **FR-006**: System MUST NOT compute or send a fingerprint for a visitor who is not signed in, or for an account that has not accepted the current Terms.

**Fingerprint**

- **FR-007**: The fingerprint MUST be produced by a pinned copy of the open-source FingerprintJS 5 library (MIT license), served by CrowdPoll itself, so that no page makes a third-party request.
- **FR-008**: The browser MUST keep nothing for this feature: no cookie or browser storage key remains. The fingerprint library's test cookie, set and removed in one call, is allowed.
- **FR-009**: System MUST store only keyed one-way hashes of the fingerprint values, under a secret held outside the code; raw attributes MUST NOT reach the database or the logs.

**No harm to voters**

- **FR-010**: The fingerprint MUST be computed at most once per page load, while the page is idle, and MUST NOT delay any interaction.
- **FR-011**: A missing or malformed fingerprint MUST NOT delay or refuse a vote; its event is recorded with empty fingerprint values.
- **FR-012**: A vote MUST NOT cause a database write during the request; its event is saved with the vote's own batch, and MUST be taken before votes are reduced to one per participant per poll.
- **FR-013**: Nothing in this feature may refuse a vote or sign-in, warn or notify a user, or change a count, on the basis of a fingerprint.

**Disclosure**

- **FR-014**: The Privacy Policy MUST state what is collected, why, how long it is kept, who can see it, and that it is never used for advertising; its summary, its "what we collect" section and its retention table MUST agree.
- **FR-015**: The Privacy Policy's "no tracking" and "no profiling" statements MUST be corrected so that they stay true, and the bot and AI agent detection section MUST remain accurate about itself and distinct from this collection.
- **FR-016**: The Terms MUST state that device evidence is collected to uphold the rule of one account per person.
- **FR-017**: Both pages MUST take a new shared version, so every account accepts once through the existing acceptance page.
- **FR-018**: Neither page, nor any other part of this feature, may claim that one vote per person is ensured or guaranteed.

**Retention and access**

- **FR-019**: Records MUST be removed by calendar month once the whole month is older than 3 months, and the policy MUST state the resulting maximum of about 4 months.
- **FR-020**: Deleting an account MUST remove all its records in the same operation, and no record for it may be saved afterwards.
- **FR-021**: Deleting a poll MUST remove its vote events.
- **FR-022**: This feature MUST offer no screen, request or export for the records; only the operator may read them, directly from the database, and an account's records MUST be retrievable to answer a privacy request.
- **FR-023**: Records MUST NOT be written to the logs.

**Control and verification**

- **FR-024**: Collection MUST be controlled by one setting, off by default; when off, the fingerprint library is not loaded, and nothing is computed, sent or recorded.
- **FR-025**: The setting MUST NOT be turned on in production until the operator has confirmed that every current account is a test user and has told those users directly.
- **FR-026**: After the public opening, any further change that matters MUST follow the policy's 30-day email promise.
- **FR-027**: System MUST periodically log the number of events with and without a fingerprint, holding no identifying value.
- **FR-028**: A lawyer's review of the disclosure and the basis for collection MUST be recorded as a condition of the public opening. It is not a condition of this feature's release to test users.

### Key Entities

- **Device event** (the canonical name for a record; the Privacy Policy calls these records "Device Evidence"): one sign-in or accepted vote: the account, the event type, the poll for a vote, the time, the browser value, the hardware value and the version. It belongs to an account, and a vote event also refers to a poll.
- **Fingerprint value**: a keyed one-way hash of what a browser reports about itself. It is comparable only within CrowdPoll, and only among records of the same version. It is evidence, not proof of one device or one person.
- **Fingerprint secret**: the key behind those hashes, held in the deployment's secrets. Replacing it makes older values unmatchable.
- **Collection setting**: the operator's single on or off control for the whole feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With collection on, 100% of accepted votes have a device event, and no refused vote has one.
- **SC-002**: During the test period, at least 90% of all vote events carry a fingerprint, as shown by the periodic count.
- **SC-003**: 100% of votes with a missing or malformed fingerprint succeed, and the counts are identical to those of the same votes without this feature.
- **SC-004**: Voters notice no difference: the time from pressing Vote to seeing the result grows by no more than 5%, and no new step, message or permission prompt appears.
- **SC-005**: Pages add no third-party request, and no cookie or browser storage key remains; automated checks fail otherwise.
- **SC-006**: A review of the stored records and the logs finds no raw device attribute, choice, IP address or email address.
- **SC-007**: After an account is deleted, no record for it remains, and none appears afterwards; no record is older than about 4 months.
- **SC-008**: 100% of accounts accept the new version before any record exists for them under it.
- **SC-009**: The later analysis can answer, from these records alone, "which accounts voted on the same poll from the same browser value within a given time?".

## Assumptions

- **Scope**: analysis, identification of fraud and any response are later features. User verification and account monitoring are long-term goals, not part of this feature.
- **No Voter ID** is issued. The brand is carried in the words "One Vote, One Person", with no absolute security claim beside them.
- **The limit of the evidence is accepted**: a fingerprint is reported by the browser, so a determined fraudster can change or forge it, and browsers increasingly resist it. It serves against casual abuse.
- **The hardware value** is added beyond a browser fingerprint because a second browser is the simplest way to vote from a second account on one device.
- **No stored browser identifier**: to be revisited if the coverage figure or the later analysis shows the fingerprint is too unstable.
- **Notice**: every current account is assumed to be a test user. The 30-day email promised by the policy is not sent for this change, on that basis; the requirements report's item BC2 described the alternative and does not apply. If any account is not a test user, the operator must not turn collection on without resolving that.
- **Deleting a poll also erases its evidence**: this is accepted, so that the policy's statement about votes stays true.
- **Operator**: the people with direct database access, as today.
- **Dependencies**: the existing acceptance page and terms gate, the vote queue and its batched writer, the retention sweep, account deletion, and the deployment's secrets.
- **Tests that pin** the policy's text, each page's scripts and the Cookie Use list change with this feature where needed.
