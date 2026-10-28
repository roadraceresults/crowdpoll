# Feature Specification: User Authentication System

**Feature Branch**: `001-user-auth`

**Created**: 2026-08-10

**Status**: Draft

**Input**: User description: "using ./designDocs/high-level-requirements.md" (reusable user
authentication system: passwordless native email sign-in via one-time login links, later
switchable to OAuth social providers; profile management; demo web app client)

**Source doc note (added 2026-08-20)**: `designDocs/high-level-requirements.md` no longer
exists under that name — it evolved in place across 001–004, then was split/renamed. The
closest surviving snapshot of what this spec actually read is
`designDocs/001-high-level-requirements-user-auth.md`, captured at the 003 commit.

## Clarifications

### Session 2026-08-10

- Q: Should the system rate-limit login-link email requests, and how? → A: Originally
  per-email (2 per 15-minute window). SUPERSEDED 2026-08-10 — see the final clarification:
  limits now key on the requesting client, not the email address.
- Q: When is the account record created? → A: Immediately on submit, in a pending/unverified
  state; the first successful login-link click activates it.
- Q: What is a native account's userName before the user edits their profile? → A: Defaults
  to the email address's local-part (the text before the @), editable on the profile page.
- Q: Can a user be signed in on multiple devices at once, and what does Logout affect? →
  A: Single session only — a new sign-in invalidates any existing session on other devices;
  at most one active session per account. Logout ends that session.
- Q: The email-change limit is "2 requests per email address per 15 minutes" — which
  address does it count against? → A: Originally both the new address and the requesting
  account. SUPERSEDED 2026-08-10 — see the final clarification: a single per-client limit
  replaces the address/account counters.
- Q: When an email-address change completes, what does the old address receive? → A: A
  notification-only email (no action links) informing it that the account's address
  changed.
- Q: Must the user be signed in (in the same browser) when clicking the email-change
  verification link? → A: No — the single-use link is self-contained and completes the
  change from any device or browser, signed in or not.
- Q: When a visitor submits Create Account, is the first login (activation) link emailed
  automatically? → A: Yes — submit creates the pending account and immediately sends the
  first login link (counting toward the 2-per-15-minute limit).
- Q: Must userNames be unique across accounts? → A: Yes — userName is a unique handle;
  edits to a name already in use are rejected, and system-assigned defaults are made unique
  by appending a distinguishing numeric suffix when they would collide.
- Q: Keep per-email/per-account rate-limit keys, or adopt the authentication framework's
  built-in limiter as the source document now mandates? → A: Strict built-in defaults —
  every email-sending endpoint is limited per requesting client (network origin): 2
  requests per 15-minute window, refusals stating when the next request can be made.
  Per-email-address and per-account counting are dropped.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Account & Sign In with Email Link (Priority: P1)

A visitor creates an account by providing their email address. To sign in — every time — the
user enters their email address on the Login page, optionally checks "Stay signed in on this
device", and submits. The system emails them a one-time login link. Clicking the link signs
them in and returns them to the app as an authenticated user. There are no passwords at any
point.

**Why this priority**: Signing in is the entire point of the system; nothing else (profile,
member-only content, OAuth switch) is demonstrable without a working account-creation and
sign-in flow.

**Independent Test**: With a clean database, create an account with an email address, request
a login link, open the emailed link, and confirm the app recognizes the user as signed in.
Delivers a complete, usable authentication loop on its own.

**Acceptance Scenarios**:

1. **Given** a visitor with no account, **When** they submit the Create Account flow with a
   valid email address, **Then** a pending account is created, the first login link is
   emailed to them automatically, and they are told to check their inbox.
2. **Given** a registered user on the Login page, **When** they submit their email address,
   **Then** the system sends an email containing a one-time login link and tells the user to
   check their inbox.
3. **Given** a valid, unused login link, **When** the user opens it, **Then** they are signed
   in and a session is established on that device.
4. **Given** a login link that has already been used, **When** it is opened again, **Then**
   sign-in is refused with a clear message and no session is created.
5. **Given** a user who checked "Stay signed in on this device", **When** they return to the
   app within the configured maximum duration (default 30 days), **Then** they are still
   signed in without requesting a new link.
6. **Given** a signed-in user, **When** they choose Logout, **Then** their session ends and
   they see the guest experience.

---

### User Story 2 - Signed-In vs. Guest Experience (Priority: P2)

The demo web app presents different content depending on authentication state. The header
shows Login and Create Account links to guests; it shows the user's name, their avatar, and a
Logout option to signed-in users. Signed-in users see "You are logged in as <userName>";
guests see "Guest-mode: You are not logged in". Clicking the avatar opens a menu with an
Edit Profile item.

**Why this priority**: This is the consuming web app's reason to adopt the system — gating
content and personalizing the experience by authentication state. It builds directly on
Story 1's session.

**Independent Test**: Visit the app signed out and verify the guest header, guest message,
and absence of member content; sign in and verify the member header (name + avatar), member
message, and avatar menu.

**Acceptance Scenarios**:

1. **Given** a guest, **When** they view the app, **Then** the header shows Login and Create
   Account links and the page shows "Guest-mode: You are not logged in".
2. **Given** a signed-in user, **When** they view the app, **Then** the header shows their
   userName and profileAvatar and the page shows "You are logged in as <userName>".
3. **Given** a signed-in user, **When** they click their profileAvatar, **Then** a menu opens
   containing an Edit Profile item.
4. **Given** a guest, **When** they attempt to view member-only content, **Then** the content
   is not shown.

---

### User Story 3 - View & Edit Profile (Priority: P3)

A signed-in user opens the profile page (via the avatar menu or header link), sees their
current profile (userName, email address, avatar), and can edit their userName. They can
also change their email address: the change takes effect only after they click a
verification link sent to the new address. The avatar is not editable (it is the system
default for native sign-in, or provider-supplied for OAuth).

**Why this priority**: Profile access is a core promise of the system ("web apps can access
profile information to personalize the experience") but depends on Stories 1–2 to be
reachable and demonstrable.

**Independent Test**: Sign in, open Edit Profile, change the userName, save, and confirm the
header immediately reflects the new name and the change survives sign-out/sign-in.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they open the profile page, **Then** their current
   userName, email address, and avatar are displayed.
2. **Given** a signed-in user editing their profile, **When** they save a userName of 200
   characters or fewer, **Then** the change persists and appears in the header.
3. **Given** a signed-in user editing their profile, **When** they enter a userName or email
   address exceeding 200 characters, **Then** the input is rejected with a clear message and
   nothing is saved.
4. **Given** a signed-in user editing their profile, **When** they enter a userName already
   in use by another account, **Then** the change is rejected with a clear message and
   nothing is saved.
5. **Given** a guest, **When** they attempt to open the profile page, **Then** they are
   directed to sign in instead.
6. **Given** a signed-in user on the profile page, **When** they request a change to a new
   email address not used by any other account, **Then** a verification email is sent to
   the new address and the profile keeps the old address until verification completes.
7. **Given** a pending email change, **When** the user clicks the verification link sent to
   the new address, **Then** the profile's email address is updated to the new address.
8. **Given** a signed-in user on the profile page, **When** they request a change to an
   email address already in use by another account, **Then** the request is rejected with a
   clear message and no verification email is sent.
9. **Given** a completed email address change, **When** the change takes effect, **Then**
   the previous address receives an informational notification containing no action links.

---

### User Story 4 - Cookie Notification Banner (Priority: P4)

All visitors see an informational banner explaining that the app uses a single, strictly
necessary session cookie. The banner has only an "I Understand" button; acknowledging it
dismisses it.

**Why this priority**: Required for transparency, but it does not gate any functionality —
the session cookie is strictly necessary and needs no consent.

**Independent Test**: Visit the app fresh, verify the banner text and single "I Understand"
button, acknowledge it, and verify it stays dismissed on subsequent page views.

**Acceptance Scenarios**:

1. **Given** a first-time visitor, **When** the app loads, **Then** an informational cookie
   banner is shown with exactly one action: "I Understand".
2. **Given** a visitor who acknowledged the banner, **When** they continue browsing, **Then**
   the banner is not shown again on that device.

---

### User Story 5 - Switch to OAuth Social Sign-In (Priority: P5)

Once the app is approved by OAuth providers (Google, Facebook, GitHub, etc.), an operator
switches the deployment's sign-in method from `native` to `oauth` via configuration. From
then on, users sign in exclusively through the configured social providers; the provider
supplies the user's identity and avatar, and the system no longer needs to collect or store
email addresses for authentication.

**Why this priority**: This is the planned end-state, but it is blocked on external provider
approval and depends on everything above already working.

**Independent Test**: With the sign-in method configured to `oauth`, verify the Login page
offers provider sign-in (not the email field), a user can sign in via a provider, and their
provider-supplied name and avatar appear in the header.

**Acceptance Scenarios**:

1. **Given** a deployment configured for OAuth sign-in, **When** a user visits the Login
   page, **Then** they are offered social-provider sign-in and not the email-link flow.
2. **Given** a user signing in via an OAuth provider, **When** sign-in completes, **Then**
   their profile shows the provider-supplied identity and avatar.
3. **Given** a deployment configured for OAuth sign-in, **When** any user authenticates,
   **Then** no login-link emails are sent.

---

### Edge Cases

- A login link is opened after it has expired, or after a newer link was requested: sign-in
  is refused with a clear message and the user can request a fresh link.
- A login link is requested for an email address with no account: the on-screen response
  is identical to the registered-address case (never confirming whether an address is
  registered); the address instead receives an email inviting the recipient to create an
  account, and no session is possible.
- A third login-link request arrives from the same client within 15 minutes: the request
  is refused with a message stating when the next request can be made, and no email is
  sent.
- The email service is unavailable when a login link is requested: the user sees a friendly
  failure message and the system logs the error without crashing.
- A malformed or tampered login link is opened: sign-in is refused; nothing is revealed
  about why beyond "invalid or expired link".
- The session reaches the configured maximum age (default 30 days): the user is treated as a
  guest and must sign in again.
- "Stay signed in" is left unchecked: the session does not persist beyond the browser
  session.
- A user submits an invalid email address format at account creation or login: the input is
  rejected with a clear message.
- Two accounts would default to the same userName (e.g. pat@a.com and pat@b.com both
  yielding "pat"): the later account's default gets a distinguishing numeric suffix.
- An email-change verification link is opened after expiry, after reuse, or after a newer
  change request superseded it: the change is refused and the profile keeps its current
  address.
- Two accounts race to claim the same new email address: only the first verified change
  wins; the other is rejected as already in use.
- A user signs in on a second device while signed in on a first: the first device's
  session is invalidated and it is treated as a guest on its next request.
- The database is unreachable: the app fails safely with a logged error and a user-facing
  error message, not a crash.

## Requirements *(mandatory)*

### Functional Requirements

**Accounts & Native Sign-In**

- **FR-001**: The system MUST allow a visitor to create an account using their email
  address. The account is created immediately in a pending (unverified) state, the first
  login link is emailed automatically as part of the same submission (counting toward the
  FR-004a limit), and the account becomes active on the first successful login-link
  sign-in.
- **FR-002**: The system MUST authenticate users without passwords: each sign-in request
  sends the user an email containing a one-time login link.
- **FR-003**: The system MUST verify a login link before signing the user in, and MUST
  accept each link at most once.
- **FR-004**: Login links MUST expire approximately 15 minutes after issuance, and a newly
  requested link MUST supersede any prior unused links. The system MUST reject expired,
  superseded, already-used, malformed, or otherwise invalid login links with a clear,
  non-revealing message.
- **FR-004a**: The system MUST rate-limit login-link requests per requesting client
  (maximum 2 requests per 15-minute window); requests over the limit MUST be politely
  refused with a message that includes the time the next request can be made, and MUST NOT
  send an email.
- **FR-005**: The Login page MUST provide an email address field, a "Stay signed in on this
  device" checkbox, and a submit button.
- **FR-006**: When "Stay signed in" is selected, the system MUST keep the user signed in on
  that device for up to a configurable maximum duration (default 30 days); when not
  selected, the session MUST NOT outlive the browser session.
- **FR-007**: The system MUST let a signed-in user log out, immediately ending their
  session.
- **FR-007a**: The system MUST allow at most one active session per account: a successful
  sign-in on any device MUST invalidate any existing session on other devices.

**Sessions & Cookies**

- **FR-008**: The system MUST maintain sign-in state with exactly one cookie (the session
  token) and MUST NOT set any other cookies.
- **FR-009**: The session cookie MUST be protected from client-side script access, MUST only
  be transmitted over encrypted connections, and MUST NOT be sent on cross-site background
  requests.
- **FR-010**: The system MUST display an informational cookie banner describing the session
  cookie, with a single "I Understand" acknowledgement and no consent flow; once
  acknowledged on a device it MUST NOT reappear.

**Profile**

- **FR-011**: Each account MUST have a profile consisting of: a client identifier, a client
  secret, a userName (200 characters maximum, unique across all accounts), an email address
  (200 characters maximum; native sign-in only), and a profile avatar.
- **FR-012**: For native sign-in accounts, the system MUST assign the client identifier and
  client secret, provide a default avatar image, and default the userName to the email
  address's local-part (the text before the @, truncated to 200 characters); for OAuth
  accounts, identifier, secret, avatar, and initial userName come from the provider. If a
  defaulted or provider-supplied userName is already taken, the system MUST make it unique
  by appending a distinguishing numeric suffix.
- **FR-013**: A signed-in user MUST be able to view their profile and edit their userName
  on a dedicated Display/Edit Profile page; inputs exceeding the 200-character limits, and
  userNames already in use by another account, MUST be rejected with a clear message and
  without saving. The profile avatar MUST NOT be user-editable.
- **FR-013a**: A signed-in user (native sign-in) MUST be able to request an email address
  change from the Display/Edit Profile page. The change MUST NOT take effect until the user
  clicks a verification link emailed to the new address; until then the profile keeps the
  old address. The verification link is self-contained: it completes the change from any
  device or browser, with no requirement that an active session be present at click time.
- **FR-013b**: An email address change MUST be rejected if the new address is already in
  use by another account, or if it is the account's own current address.
- **FR-013d**: When an email address change completes, the system MUST send an
  informational notification (containing no action links) to the previous address stating
  that the account's email address was changed.
- **FR-013c**: Email-change verification requests MUST be rate-limited per requesting
  client (maximum 2 requests per 15-minute window); requests over the limit MUST be
  politely refused with a message that includes the time the next request can be made, and
  no email is sent.
- **FR-014**: Profile pages and member-only content MUST be inaccessible to guests.

**Consuming Web App (demo client)**

- **FR-015**: The client MUST render header links for Login, Logout, Create Account (native
  sign-in only), and Edit Profile, appropriate to the user's authentication state.
- **FR-016**: When signed in, the client MUST render the user's userName and profileAvatar
  in the header, and clicking the avatar MUST open a menu containing Edit Profile.
- **FR-017**: The client MUST show signed-in users "You are logged in as <userName>" and
  guests "Guest-mode: You are not logged in".

**Sign-In Method Switch**

- **FR-018**: The active sign-in method (native email link vs. OAuth social providers) MUST
  be selectable per deployment via configuration, with no code changes required to switch.
- **FR-019**: When OAuth is active, users MUST sign in exclusively through social providers;
  the email-link flow MUST be unavailable and no login emails sent.
- **FR-020**: OAuth sign-in MUST NOT depend on an email address for authentication (the
  provider-assigned `clientId` is the identity key); the OAuth provider's supplied email
  address MUST still be stored on the profile and exposed read-only via the profile API. The
  system MUST NOT migrate or link native-sign-in profiles to OAuth identities — old profiles
  simply stop being used for authentication.

**Operability & Resilience**

- **FR-021**: All deployment-specific settings (port, database name and connection, admin
  list, polling interval, maximum sign-in duration, sign-in method) MUST be supplied via
  environment configuration.
- **FR-022**: The system MUST validate inputs and handle failures (email delivery,
  database unavailability, invalid links) by logging an informative error and presenting a
  friendly message, never by crashing.

**Developer Deliverables** *(explicitly required by the source document)*

- **FR-023**: The project MUST include written instructions for installing and launching a
  development database on Windows 11.
- **FR-024**: The project MUST include a git-ignored IDE debug configuration that launches
  the server (and test files) with the documented development default settings.
- **FR-025**: The project MUST include a git-ignored development launch script
  (`devScripts/launch-dev.ps1`) that sets the required environment settings, starts the
  local database service if it is not running, and launches the server.
- **FR-026**: The project MUST include a machine-readable API description
  (`postman/openapi.json`) covering every endpoint's request and response formats, kept in
  sync with the implemented API.

### Key Entities

- **User Profile**: One per account. Client identifier (system-assigned for native;
  provider-assigned for OAuth), client secret (system-assigned for native;
  provider-assigned for OAuth), userName (≤200 chars, unique across accounts), email
  address (≤200 chars; present
  only while native sign-in is in use), profile avatar (system default for native;
  provider-supplied for OAuth). Lifecycle: created pending (unverified) at signup,
  activated by the first successful login-link sign-in.
- **Session**: A sign-in established by a verified login link (or OAuth sign-in), carried
  by the single session cookie, expiring at browser close or after the configured maximum
  duration (default 30 days) depending on the user's "stay signed in" choice. At most one
  active session exists per account; a new sign-in anywhere replaces it.
- **Login Link**: A one-time credential emailed to a user to complete native sign-in.
  Expires ~15 minutes after issuance, is superseded by any newer request, and is consumed on
  first successful use.
- **Email-Change Request**: A pending change of a profile's email address to a proposed new
  address. Holds a one-time verification link emailed to the new address; the profile's
  address updates only when that link is used. The link is self-contained (usable from any
  device without an active session) and follows the same semantics as login links (expiry,
  supersession, single use).
- **Sign-In Configuration**: The per-deployment settings governing behavior: sign-in method
  (native vs. OAuth), maximum session duration, admin list, and connection settings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user with access to their email inbox can go from first visit to
  signed-in (account created, link received, link clicked) in under 3 minutes.
- **SC-002**: A returning user who chose "Stay signed in" is recognized without
  re-authenticating on every visit within the configured duration (default 30 days), and is
  treated as a guest after it lapses.
- **SC-003**: 100% of login links work at most once; every reuse, expiry, or tampering
  attempt is refused.
- **SC-004**: Guests are never shown member-only content, and signed-in users always see
  their own name and avatar in the header — verified across all pages of the demo client.
- **SC-005**: Switching a deployment between native and OAuth sign-in requires only a
  configuration change and no code changes.
- **SC-006**: Exactly one cookie is observable in the browser across every flow of the app.
- **SC-007**: A user with access to both inboxes can complete an email address change
  (request → verify → new address shown on profile) in under 3 minutes, and the old
  address remains in effect until the moment verification completes.
- **SC-008**: A developer on a fresh Windows 11 machine can follow the provided
  instructions and launch script to reach a running local environment (database + server)
  without undocumented steps.

## Assumptions

- **Prescribed technology and vendor choices** (language, database, auth library, email
  service, deployment platform) are mandated in `designDocs/high-level-requirements.md` and
  are intentionally excluded here; they bind the plan phase, not this specification.
- **Account-existence privacy**: Login responses are assumed not to disclose whether an
  email address is registered.
- **Unactivated-account cleanup**: Pending accounts that are never activated may be cleaned
  up later by a scheduled job; the source document explicitly places that cleanup out of
  scope for this feature.
- **Email-change link semantics**: The source document does not specify expiry for
  email-change verification links. Assumed: they follow the same rules as login links
  (~15-minute expiry, newer request supersedes, single use).
- **Admin list (`APP_ADMINS`)**: The source document reserves this setting for
  "Administration Pages that may be created in the future". The setting is accepted and
  validated, but no admin UI is in scope for this feature.
- **Polling interval (`APP_POLLING_INTERVAL`)**: Defined in the source document for "live
  real-time updated results"; no such feature exists in this system's scope. Assumed:
  accepted as configuration, unused by this feature.
- **Accessibility**: Standard semantic HTML only; no formal WCAG/screen-reader/keyboard-nav
  compliance is targeted (stated in the source document).
- **Deployment**: Single-region deployment with HTTPS, and a managed database with
  encrypted connections, per the source document's assumptions.
