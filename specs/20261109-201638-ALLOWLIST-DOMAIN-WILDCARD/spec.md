# Feature Specification: Allowlist Domain Wildcard

**Feature Branch**: `20261109-201638-ALLOWLIST-DOMAIN-WILDCARD`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "requirements/20261109-201638-allowlist-domain-wildcard/requirements.md"

## User Scenarios & Testing *(mandatory)*

Before launch, the site's operator limits account creation and login to invited testers by listing their email addresses in the pre-launch allowlist (`ENV_ALLOWED_EMAILS`, set in production from `allowed_emails` in the Terraform secrets file).
While the list holds at least one entry the site is in "test mode": anyone not listed, and not an administrator, is told the site has not launched yet.
Today every entry is one full address, so a team of testers on one mail domain must be listed one by one.
This feature lets an entry hold the wildcard `*`, so one entry admits a whole group of addresses.

### User Story 1 - Admit everyone at a domain with one entry (Priority: P1)

The operator adds `*@crowdpoll.vote` to the allowlist.
Every address at `crowdpoll.vote` can now create an account and log in, by email link or by a login provider, without being listed one by one; addresses at other domains are still refused unless listed.

**Why this priority**: it is the need the requirement states: admitting a whole tester domain.

**Independent Test**: start the site with the list `*@crowdpoll.vote`, request a login link for `qa1@crowdpoll.vote` and for `someone@example.org`, and check that the first is sent and the second is refused as not launched.

**Acceptance Scenarios**:

1. **Given** the list `*@crowdpoll.vote`, **When** `qa1@crowdpoll.vote` creates an account or requests a login link, **Then** it is accepted as if the address were listed.
2. **Given** the same list, **When** `someone@example.org` (not an administrator) does the same, **Then** it is refused with the existing "not launched yet" answer and nothing is sent.
3. **Given** the same list, **When** `QA1@CrowdPoll.Vote` logs in, **Then** it is accepted: letter case does not matter.
4. **Given** the same list, **When** a person signs in with a login provider whose account address is `qa2@crowdpoll.vote`, **Then** the account is created and the session started, as for a listed address.
5. **Given** a list holding only wildcard entries, **When** the site starts, **Then** the allowlist is on (test mode), exactly as with a list of addresses.

---

### User Story 2 - Patterns anywhere in an entry (Priority: P2)

The operator writes patterns with one or more `*`, in the local part, the domain or both: `qa-*@gmail.com` admits `qa-anna@gmail.com` and `qa-ben@gmail.com`; `*@*.crowdpoll.vote` admits `qa@mail.crowdpoll.vote`.

**Why this priority**: it widens the stated need to tester groups inside shared domains and to subdomains, as the requirements decided (UA1, UA2).

**Independent Test**: start the site with `qa-*@gmail.com,*@*.crowdpoll.vote` and check which of a set of addresses are admitted.

**Acceptance Scenarios**:

1. **Given** the list `qa-*@gmail.com`, **When** `qa-anna@gmail.com` logs in, **Then** it is accepted; **When** `anna@gmail.com` logs in, **Then** it is refused.
2. **Given** the list `*@*.crowdpoll.vote`, **When** `qa@mail.crowdpoll.vote` logs in, **Then** it is accepted; **When** `qa@crowdpoll.vote` logs in, **Then** it is refused (the pattern needs a subdomain).
3. **Given** the list `*@gmail.com`, **When** `someone@googlemail.com` logs in, **Then** it is accepted, because both read as the same Gmail address, as exact entries already do.
4. **Given** the list `john*@gmail.com`, **When** `john.smith@gmail.com` logs in, **Then** it is accepted (Gmail ignores dots, so the address reads `johnsmith@gmail.com`); **Given** `john.*@gmail.com`, **Then** no Gmail address matches it.

---

### User Story 3 - A clear startup state and a clear refusal of a malformed entry (Priority: P3)

When the site starts, the operator sees whether the allowlist is on and how many addresses and patterns it holds, without any entry being written to the log.
An entry that is not in address form, such as `*.crowdpoll.vote`, stops the site at start-up with a message naming the entry and the accepted form.

**Why this priority**: it makes the setting safe to edit; the matching itself is stories 1 and 2.

**Independent Test**: start the site with `a@x.org,b@x.org,*@crowdpoll.vote` and read the startup line; start it with `*.crowdpoll.vote` and read the error.

**Acceptance Scenarios**:

1. **Given** the list `a@x.org,b@x.org,*@crowdpoll.vote`, **When** the site starts, **Then** it logs `[auth] Sign-up allowlist on (2 addresses, 1 pattern)`, naming no entry.
2. **Given** a list of addresses only, **When** the site starts, **Then** the line reads as today, `[auth] Sign-up allowlist on (2 addresses)`; **Given** patterns only, **Then** it reads `(1 pattern)`.
3. **Given** the entry `*.crowdpoll.vote` (no `@`), **When** the site starts, **Then** it stops with a configuration error naming the entry and showing the accepted form `*@crowdpoll.vote`.
4. **Given** the entry `*@*`, **When** the site starts, **Then** it starts, and every address is admitted.

---

### Edge Cases

- An entry with more than one `@`, or with nothing before or after its `@` (`*@`, `@x.org`), stops the site at start-up, as a malformed address does today.
- `*` never stands for an `@`: `a*@x.org` does not admit `a@b@x.org`.
- `*` may stand for nothing: `qa*@x.org` admits `qa@x.org`.
- Every character other than `*` is matched literally: in `*@x.org` the `.` is a dot, so `qa@xyorg` is not admitted.
- A plus-tag is ignored on the address, as today: `*@crowdpoll.vote` admits `qa+test@crowdpoll.vote`; a pattern written with a plus-tag in its local part matches no address.
- Administrators (`ENV_ADMINS`) are always admitted, whatever the list holds.
- Emptying the list (at launch) turns test mode off: everyone is admitted, patterns included.
- A pattern on a public mail domain (`*@gmail.com`) is allowed; it admits everyone with a mailbox there.
- An entry that today holds a literal `*` (`*@x.org`, which matched only the impossible address `*@x.org`) now admits the whole domain.
- Existing sessions are unaffected by a list change until their owner next logs in, as today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: An allowlist entry MAY hold the wildcard `*`, any number of times, anywhere in the entry; an entry holding a `*` is a **pattern**, any other entry an **address**.
- **FR-002**: Every entry, pattern or address, MUST have exactly one `@` with at least one character on each side; any other entry MUST stop the site at start-up with a configuration error that names the entry, and for a pattern without an `@` shows the accepted form (`*@crowdpoll.vote`). No other pattern is refused (`*@*` is valid).
- **FR-003**: An address MUST be admitted by a pattern when the pattern, lower-cased, matches the address's email key (the existing normalised form: lower-cased, plus-tag dropped, Gmail dots removed, `googlemail.com` read as `gmail.com`) as a whole, with each `*` standing for any run of characters, possibly empty, except `@`, and every other character matched literally. The pattern itself is not normalised.
- **FR-004**: Address entries MUST keep their current meaning (compared by email key), and administrators MUST always be admitted.
- **FR-005**: The allowlist MUST be on (test mode) when the list holds at least one entry of either kind, and off when it is unset or empty; there is no new setting.
- **FR-006**: Every path the allowlist already guards MUST apply patterns the same way: account creation, login link request, link verification and confirmation, email change, invitation redemption, and account creation and session start through a login provider.
- **FR-007**: The startup line MUST count the two kinds separately, `[auth] Sign-up allowlist on (<n> addresses, <m> pattern(s))`, leaving out a kind with none, followed by `; <k> administrator(s) always allowed` when `ENV_ADMINS` holds any (TWEAK01), and MUST NOT name any entry; with the list off it reads as today.
- **FR-008**: The Terraform variable `allowed_emails` MUST carry patterns unchanged; no infrastructure change is made.
- **FR-009**: The operator documentation (the README's settings and pre-launch sections, the architecture notes, the settings reference and the Terraform secrets example) MUST describe the pattern form, with the warning that a pattern admits everyone with a matching mailbox, and the Gmail note of FR-003.
- **FR-010**: Automated tests MUST cover parsing and refusal (FR-002), matching (case, Gmail, plus-tag, subdomain, `*` matching nothing, `*` never matching `@`, administrators), a pattern-only list turning test mode on, a login link and a provider-style account creation from a pattern-admitted address, and the startup line.

### Key Entities

- **Allowlist entry**: one comma-separated item of `ENV_ALLOWED_EMAILS`, trimmed and lower-cased; either an address (compared by email key) or a pattern (holding `*`, matched against the email key).
- **Email key**: the existing normalised form of an address that the allowlist compares with (plus-tag dropped, Gmail dots removed, `googlemail.com` as `gmail.com`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With one pattern entry, every address the pattern covers can create an account and log in, by link and by a login provider, and every address it does not cover (and not otherwise listed or an administrator) is refused, in 100% of the test cases of FR-010.
- **SC-002**: An existing list of addresses only behaves exactly as before: the same admissions, refusals and startup line.
- **SC-003**: A malformed entry never lets the site start: 100% of the malformed cases of FR-002 stop it with a message naming the entry.
- **SC-004**: No log line written by the allowlist contains an entry or an address.

## Assumptions

- The wildcard is for the pre-launch period only, like the allowlist itself; at launch the list is emptied.
- Patterns apply to `ENV_ALLOWED_EMAILS` only, not to `ENV_ADMINS`.
- No database change, route, setting, cookie or dependency is needed.
- The operator, not the site, decides whether a pattern is too wide; no list of public mail providers is kept.
- All decisions come from `requirements/20261109-201638-allowlist-domain-wildcard/requirements-report.md` (AM1–AM2, UA1–UA7, NC1, IN1–IN2).
