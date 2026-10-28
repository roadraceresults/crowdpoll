# Feature Specification: Social Sign-In With Google, Apple, Microsoft and Amazon

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "" (empty; taken to be `requirements/20261022-131728-social-oauth-providers/requirements.md`, the requirements document completed just before this command)

**Source requirements**: `requirements/20261022-131728-social-oauth-providers/requirements.md` (the requirements, with every finding of the review folded in under Decisions).
**Requirements report**: `requirements/20261022-131728-social-oauth-providers/requirements-report.md` (4 diagrams, 5 research results and 10 findings, all resolved).

## Clarifications

### Session 2026-10-22

- Q: What happens when an Amazon sign-in returns an address that already has an account? → A: Link to the existing account anyway, trusting Amazon's email (Amazon is treated like Google, Apple and Microsoft for linking; this overrides the requirements' UA2 and RS4 "never link Amazon")

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A person signs in with a provider account (Priority: P1)

On the Login card a person presses one of four buttons, "Sign in with Google", "Sign in with Apple", "Sign in with Microsoft" or "Login with Amazon".
They sign in at the provider, agree to share their name and email, and come back to CrowdPoll signed in.
A first-time person gets a new account and is asked to accept the Terms before anything else, as today.

**Why this priority**: It is the purpose of the feature: the providers' approval is useless without a working sign-in.

**Independent Test**: With test credentials for one provider, press its button, complete the provider's consent, and land on CrowdPoll signed in with an account carrying the provider's email.

**Acceptance Scenarios**:

1. **Given** the Login card with a provider enabled, **When** the box is not ticked, **Then** that provider's button is unavailable.
2. **Given** the box is ticked, **When** the person presses "Sign in with Google" and consents, **Then** they return to CrowdPoll signed in.
3. **Given** a person signs in with a provider for the first time and no account has their email, **When** they return, **Then** a new account exists and the Terms prompt appears before any other page.
4. **Given** the pre-launch allowlist is on, **When** an unlisted person signs in with a provider, **Then** no account is created and the Login card shows the "not launched yet" message.
5. **Given** the person cancels at the provider, **When** they return, **Then** they are on the Login card, signed out, with a short message that sign-in was cancelled.

---

### User Story 2 - An existing member keeps their account (Priority: P1)

A tester who already has a CrowdPoll account (created by email link) signs in with a provider whose account uses the same address.
They land in their existing account, with their polls, votes and watch list, not in a new empty one.

**Why this priority**: Every current tester has an email-link account; a duplicate account would lose their history.

**Independent Test**: Create an account by email link, then sign in with a provider returning the same verified address; the same account is used and now also lists the provider.

**Acceptance Scenarios**:

1. **Given** an account for `tester@example.org`, **When** Google, Apple or Microsoft returns `tester@example.org` as verified, **Then** the provider is linked to that account and the person is signed into it.
2. **Given** an account for `john.smith@gmail.com`, **When** a trusted provider returns the verified `johnsmith@gmail.com`, **Then** it is treated as the same mailbox (email key) and linked.
3. **Given** an account for an address, **When** Amazon returns that address, **Then** Amazon is linked to that account and the person is signed into it, as for the other providers.
4. **Given** a person signs in with Apple using "Hide My Email", **When** they return, **Then** they get an account under the relay address, separate from any account under their real address.

---

### User Story 3 - Email-link sign-in stays available (Priority: P2)

When providers are switched on, the Login card shows the provider buttons and, below them, the existing email-link form; Create Account and email change keep working.

**Why this priority**: People without an account at the four providers, and testers who have not linked one, must still get in.

**Independent Test**: With providers and email links both on, request a sign-in link and sign in by email; create an account by email; sign in with a provider; all three work.

**Acceptance Scenarios**:

1. **Given** the mode that offers both, **When** a guest opens the Login card, **Then** it shows the four provider buttons and the email form.
2. **Given** the mode that offers only email links (today's), **When** a guest opens the Login card, **Then** no provider button is shown.
3. **Given** the mode that offers only providers, **When** a guest opens the Login card, **Then** only the provider buttons are shown and the email routes are unavailable, as today's OAuth mode.

---

### User Story 4 - The operator registers CrowdPoll with each provider (Priority: P2)

The operator follows one written procedure per provider to register CrowdPoll, enters the resulting credentials as settings, and sees at start-up which providers are on.

**Why this priority**: Without the registrations nothing can be tested or approved; a procedure makes them repeatable.

**Independent Test**: Follow the Google procedure, set its two settings, restart, and see "Google" listed as on in the start-up log; remove one setting and see the app refuse to start with a message naming the missing setting.

**Acceptance Scenarios**:

1. **Given** a provider's settings are all present, **When** the app starts, **Then** the start-up log lists that provider as on, without printing any secret.
2. **Given** only some of a provider's settings are present, **When** the app starts, **Then** it stops with a message naming the provider and the missing setting.
3. **Given** the Apple settings (Services ID, team id, key id, private key), **When** the app starts, **Then** it can sign Apple's client secret itself, with no secret to renew by hand.
4. **Given** the procedures, **When** the operator registers, **Then** every value they are asked for (homepage, privacy and terms URLs, redirect address, domain, logo) is one CrowdPoll already serves.

---

### User Story 5 - Providers can verify the domain and reach relay addresses (Priority: P3)

Apple can verify that CrowdPoll owns `crowdpoll.vote`, and email from CrowdPoll reaches people who chose Apple's "Hide My Email".

**Why this priority**: Required by Apple only, and only once Apple is enabled.

**Independent Test**: Fetch the domain-association address and get Apple's file; send a sign-in-related email to a relay address and see it delivered.

**Acceptance Scenarios**:

1. **Given** the operator has placed Apple's domain-association file, **When** anyone requests `/.well-known/apple-developer-domain-association.txt`, **Then** the file is returned as plain text, to guests, with no sign-in.
2. **Given** `mail.crowdpoll.vote` is registered with Apple's relay, **When** CrowdPoll emails a relay address, **Then** the message is delivered.

---

### Edge Cases

- The provider returns no email (a person declined to share it, or the provider withholds it): no account is created; the Login card says CrowdPoll needs an email address and to try another way.
- The provider returns an unverified email: no automatic link to an existing account; a new account is created only if no account has that address, otherwise sign-in is refused with a message to use the existing sign-in method.
- An account's email changes later at the provider: the account stays linked by the provider's user id; the stored address is not changed silently.
- A provider's credentials expire or are revoked (Microsoft secret, Apple key): that provider's sign-in fails with a message, the others keep working, and the error is logged with the provider's name.
- A person presses a provider button while already signed in: they are taken to the home page, not signed in again.
- A person signed in with a provider deletes their account: the provider link is deleted with it; signing in again creates a new account.
- Apple returns the person's name only the first time: later sign-ins keep the stored user name.

## Requirements *(mandatory)*

### Functional Requirements

**Providers and settings**

- **FR-001**: CrowdPoll MUST support exactly four providers: Google, Apple, Microsoft (personal and work or school accounts) and Amazon; Facebook and GitHub MUST be removed.
- **FR-002**: Each provider MUST request only the person's identity: name, email and the provider's user id (Google, Apple, Microsoft: `openid email profile`; Amazon: `profile`).
- **FR-003**: Each provider MUST be on only when all of its settings are present; a partial set MUST stop start-up with a message naming the provider and the missing setting; start-up MUST log which providers are on, never a secret.
- **FR-004**: The public origin (`https://crowdpoll.vote` in production) MUST be one required setting, and every provider's return address MUST be `<origin>/api/auth/callback/<provider>` (Amazon: `<origin>/api/auth/oauth2/callback/amazon`, the path its sign-in mechanism uses; research R6).
- **FR-005**: Apple's client secret MUST be generated by CrowdPoll from the team id, key id and private key, so it never has to be renewed by hand.

**Sign-in modes**

- **FR-006**: The sign-in mode MUST offer three values: email links only (today's default), providers only (today's OAuth mode), and both.
- **FR-007**: In "both", the Login card MUST show the provider buttons above the email-link form, and Create Account (reached from the Login card's "Create account" line, TWEAKS05), email links and email change MUST keep working.
  An email change on an account linked to a provider keeps the link (it is keyed by the provider's user id); the next provider sign-in still opens the account and does not overwrite the new address.

**The buttons and the flow**

- **FR-008**: The Login card MUST show one button per enabled provider, in the order Google, Apple, Microsoft, Amazon, each following that provider's published button guidelines (logo, wording, light and dark variants), with the logos served by CrowdPoll.
- **FR-009**: The buttons MUST work at once, with no Terms box on the Login card; agreement is asked for after the sign-in, on the Accept Terms card, only when the account has not accepted the current Terms (FR-015), which greets an account that has never accepted any version with "Welcome to CrowdPoll" (TWEAKS06).
- **FR-010**: Pressing a button MUST start the provider's sign-in and return the person to the page they came from (or the shared-poll link they were following).
- **FR-011**: Every refusal (not launched, cancelled, no email, unverified email clash, provider error) MUST return the person to the Login card with a message naming what happened, and log it with the provider's name and a masked address.

**Accounts**

- **FR-012**: A sign-in whose email matches an existing account by email key MUST link to that account for all four providers (Google, Apple and Microsoft when they report the email as verified; Amazon's email is trusted as given).
- **FR-013**: A provider that reports the email as unverified MUST NOT link to an existing account (see Edge Cases).
- **FR-014**: An Apple relay address MUST be stored as given and treated as an ordinary address (allowlist, admin list, emails).
- **FR-015**: New accounts from a provider MUST go through the same rules as email-link accounts: allowlist, profile defaults, the Terms prompt on first request.
- **FR-016**: Deleting an account MUST delete its provider links.

**Provider requirements CrowdPoll must meet**

- **FR-017**: `/.well-known/apple-developer-domain-association.txt` MUST serve the file the operator places, as plain text, to anyone.
- **FR-018**: The Privacy Policy MUST name the four providers as sources of the name and email a person chooses to share, and say a relay address is stored as given.
- **FR-019**: One written procedure per provider MUST list every step and value to register CrowdPoll (from the requirements' Decisions RS1–RS4), including domain verification and, for Apple, registering `mail.crowdpoll.vote` with the private email relay.

### Key Entities *(include if feature involves data)*

- **Provider link**: an account's connection to one provider: the provider, the provider's user id, linked when; an account may have several, one per provider.
- **Provider settings**: per provider, the client id and secret (Apple: Services ID, team id, key id, private key), and whether it is on.
- **Sign-in mode**: email links, providers, or both.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person with an account at any of the four providers can sign in to CrowdPoll in under 30 seconds and two clicks after the provider's own sign-in.
- **SC-002**: 100% of existing testers who sign in with any of the four providers under the same address land in their existing account, never a duplicate.
- **SC-003**: Every value a provider's registration form asks for is answered by a page or address CrowdPoll already serves, with no placeholder.
- **SC-004**: Email-link sign-in keeps working unchanged in "email links" and "both" modes.
- **SC-005**: A misconfigured provider is caught at start-up, never at a person's first sign-in.

## Assumptions

- The four registrations are made by the operator, as the organization CrowdPoll (D-U-N-S number for Apple; Microsoft Cloud Partner Program for publisher verification); this feature supplies the procedures and the code, not the accounts.
- Switching production to "both" or "providers" is a configuration change made after the providers approve; this feature does not change production's mode.
- Google's basic scopes need no app verification; Microsoft publisher verification and Apple enrolment take days to weeks.
- Reviewers who need to sign in while the site is closed get a dedicated address on the allowlist.
- Amazon's email is trusted for linking (Clarifications 2026-10-22).
