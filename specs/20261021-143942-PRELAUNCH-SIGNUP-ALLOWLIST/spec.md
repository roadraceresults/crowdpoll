# Feature Specification: Pre-Launch Sign-Up Allowlist

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "requirements/20261021-143942-prelaunch-signup-allowlist/requirements.md"

**Source requirements**: `requirements/20261021-143942-prelaunch-signup-allowlist/requirements.md` (the requirements document, with every finding of the requirements review folded in under Decisions).
**Requirements report**: `requirements/20261021-143942-prelaunch-signup-allowlist/requirements-report.md` (4 diagrams and 13 findings, all resolved).

## Clarifications

### Session 2026-10-21

- Q: Should each "not launched" refusal be written to the application log? → A: Yes, one line per refusal naming the path (create-account, login, email change, session) and the masked address
- Q: Should the "not launched" message tell people how to ask for access? → A: No; the message stays as worded in FR-011, with no contact address

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Only invited testers can create an account (Priority: P1)

CrowdPoll is live in production but has not launched to the public.
The operator lists the email addresses of invited testers in one setting.
A listed tester who fills in the Create Account form gets their account and sign-in link as today.
Anyone else who submits the form is told, on the page, that CrowdPoll has not launched yet; no account is created and no email is sent.

**Why this priority**: It is the purpose of the feature: the public cannot create accounts before launch.

**Independent Test**: With the list set to one test address, submit the Create Account form with that address and with another one; the first receives a sign-in link, the second sees the "not launched" message and receives nothing.

**Acceptance Scenarios**:

1. **Given** the list is set and contains `tester@example.org`, **When** someone submits Create Account with `tester@example.org`, **Then** they see "Check your inbox" and receive a sign-in link, as today.
2. **Given** the list is set and does not contain `visitor@example.org`, **When** someone submits Create Account with `visitor@example.org`, **Then** the card shows "CrowdPoll hasn't launched yet. For now, accounts are open to invited testers only.", no account is created and no email is sent.
3. **Given** the list contains `John.Smith@gmail.com`, **When** someone submits `johnsmith+polls@googlemail.com`, **Then** it is treated as listed (same mailbox).

---

### User Story 2 - Only invited testers can sign in (Priority: P1)

The same rule applies to signing in.
A listed tester who asks for a sign-in link gets it as today.
An unlisted address on the Login page gets the same "not launched" message, and no email is sent: neither a sign-in link nor a create-account invitation.
A sign-in that reaches the account by any other path (a link already in an inbox, the confirmation page, or a social provider once that mode is on) is refused too.

**Why this priority**: Without it an unlisted person with an existing account, or a link requested earlier, could still get in.

**Independent Test**: With the list set, request a sign-in link from the Login page for a listed and an unlisted address; then, with an existing unlisted account, open a sign-in link issued before the list was set.

**Acceptance Scenarios**:

1. **Given** the list is set and contains the address, **When** a sign-in link is requested, **Then** it is sent as today.
2. **Given** the list is set and does not contain the address, **When** a sign-in link is requested, **Then** the Login card shows the "not launched" message and nothing is sent.
3. **Given** an unlisted address has a valid sign-in link from before the list was set, **When** the link is opened, **Then** no session is created and the person sees the "not launched" message.
4. **Given** an unlisted user already has an active session when the list is set, **When** they keep using the site, **Then** the session continues until it ends or they sign out.

---

### User Story 3 - The operator turns the list on and off (Priority: P2)

The operator sets the list in production's settings to start the pre-launch period and removes it at launch.
When the setting is absent or empty, everyone may create an account and sign in, exactly as today.
The administrators can always get in, whether or not they are listed.
The application log says at startup whether the list is on, and how many addresses it holds, without naming them.

**Why this priority**: Turning the gate on and off safely is what makes the feature usable, but it adds no new user-facing behaviour.

**Independent Test**: Start the application with the setting absent, empty, and holding two addresses, and with an administrator not in the list; check the startup log line and that the administrator can sign in in every case.

**Acceptance Scenarios**:

1. **Given** the setting is absent or empty, **When** anyone creates an account or signs in, **Then** behaviour is exactly as before this feature, and the log says the allowlist is off.
2. **Given** the setting holds two addresses, **When** the application starts, **Then** the log says the allowlist is on with 2 addresses and names neither.
3. **Given** the setting holds an entry that is not an email address, **When** the application starts, **Then** it refuses to start and names the setting.
4. **Given** an administrator's address is not in the list, **When** they sign in, **Then** they are signed in.

---

### User Story 4 - A tester cannot move their account to an unlisted address (Priority: P3)

A signed-in tester who asks to change their email address to an unlisted one sees the same "not launched" message on the Profile page, and no verification email is sent.
Changing to another listed address works as today.

**Why this priority**: It closes the last way for an account to end up at an unlisted address, but only a signed-in tester can reach it.

**Independent Test**: Signed in as a listed tester, request an email change to a listed and to an unlisted address.

**Acceptance Scenarios**:

1. **Given** the list is set, **When** a signed-in user asks to change to an unlisted address, **Then** the Profile card shows the "not launched" message and nothing is sent.
2. **Given** the list is set, **When** they ask to change to a listed address, **Then** the verification email is sent as today.

---

### Edge Cases

- An entry in the list with surrounding spaces or capital letters still matches (entries are trimmed and compared without case).
- A listed Gmail address matches the same mailbox written with dots, a `+tag` or `googlemail.com`.
- A request that fails the existing checks (hidden field filled, invalid address, rate limit) is answered as today, before the list is consulted; a refused request still counts against the rate limit.
- An unlisted address that already has an account is refused at sign-in; its account and data are kept and work again once the list is removed.
- Guests can still see what they can see today without an account; the list affects accounts and sign-ins only.
- The setting is changed while the application runs: the change applies once the application restarts, which the hosting platform does whenever a setting changes.
- In the social sign-in mode, an unlisted address returned by the provider is refused at the session step, and the login page shows the "not launched" message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST read an optional allowlist setting at startup: a comma-separated list of email addresses, each trimmed and compared without case.
- **FR-002**: When the setting is absent or empty, the system MUST allow every address to create an account and sign in, exactly as before this feature.
- **FR-003**: The system MUST refuse to start when the setting holds an entry that is not a valid email address, and name the setting in the error.
- **FR-004**: At startup the system MUST log whether the allowlist is on and, when it is, how many addresses it holds; it MUST NOT log the addresses.
- **FR-004a**: Each "not launched" refusal MUST be logged as one line naming the path that refused it (create-account, login, email change or session) and the address masked as the mailer masks recipients (e.g. `j•••@gmail.com`), never the full address.
- **FR-005**: An address MUST count as listed when it identifies the same mailbox as a listed entry, using the application's existing same-mailbox rule (case, a `+tag`, and for Gmail the dots and `googlemail.com`, are ignored).
- **FR-006**: An address in the administrators setting MUST always count as listed.
- **FR-007**: While the allowlist is on, Create Account with an unlisted address MUST create no account, send no email, and answer with the "not launched" refusal.
- **FR-008**: While the allowlist is on, a sign-in link request for an unlisted address MUST send no email (neither a sign-in link nor a create-account invitation) and answer with the "not launched" refusal.
- **FR-009**: While the allowlist is on, the system MUST NOT create a session for an unlisted address by any sign-in path: the emailed link, the confirmation page, or a social provider.
- **FR-010**: While the allowlist is on, an email change to an unlisted address MUST send no email and answer with the "not launched" refusal.
- **FR-011**: The "not launched" refusal MUST carry a stable code and the message "CrowdPoll hasn't launched yet. For now, accounts are open to invited testers only." (no contact address), and the Create Account, Login and Profile cards MUST show the message where they show other errors.
- **FR-012**: The existing protections (hidden field, address validation, rate limits) MUST run before the allowlist check, unchanged.
- **FR-013**: Sessions that already exist when the allowlist is turned on MUST NOT be ended by this feature; existing accounts MUST NOT be changed or deleted.
- **FR-014**: The allowlist MUST NOT change what a guest can see or do without an account.
- **FR-015**: The API description MUST document the "not launched" refusal on the endpoints and redirects that can return it (contracts A1–A6), and the environment-variable documentation and local templates MUST list the new setting (listed with an empty value (off) in the templates).
- **FR-016**: In production the list MUST be stored as an encrypted platform setting; the repository MUST hold only its name, never the addresses.

### Key Entities

- **Allowlist setting**: an optional, comma-separated list of email addresses, read once at startup; absent or empty means off.
- **"Not launched" refusal**: the answer to a refused request: a stable code plus the user-facing message.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: While the allowlist is on, 100% of attempts by unlisted addresses to create an account, sign in or change address are refused, with no account created, no session started and no email sent.
- **SC-002**: While the allowlist is on, 100% of listed testers and administrators can create an account and sign in exactly as before.
- **SC-003**: With the setting absent or empty, the full existing test suite passes unchanged.
- **SC-004**: An unlisted visitor sees the "not launched" message within the same time the page takes to answer today (no added wait).
- **SC-005**: No tester address appears in the repository or in the application log.

## Assumptions

- The list is small (a handful of testers) and is checked without a database query.
- The hosting platform restarts the application when a setting changes, so no reload mechanism is needed.
- The message wording is a draft that the developer may replace before implementation.
- The previous feature's same-mailbox rule (Production Email, research R10) is the comparison used; no new normalization is introduced.
- Revealing that an address is not on the list is acceptable during the pre-launch period; account existence is still not revealed.
- Launch means removing the setting; no data migration is needed either way.
