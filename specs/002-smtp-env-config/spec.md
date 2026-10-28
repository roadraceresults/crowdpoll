# Feature Specification: Email & Auth-Secret Deployment Configuration

**Feature Branch**: `002-smtp-env-config`

**Created**: 2026-08-10

**Status**: Draft

## Clarifications

### Session 2026-08-10

- Q: The source document briefly required `APP_BETTER_AUTH_SECRET` to be identical in
  `launch.json`, `launch-dev.ps1`, **and** the launch-script example file — a checked-in
  example carrying a real secret would publish it in the public repository. → A:
  Initially resolved as "git-ignore the example too". **SUPERSEDED 2026-08-10**: the
  source document was revised to drop the example file from the sync rule entirely —
  the shared secret now covers only the two git-ignored assets, and the example
  template stays checked in with placeholders.
- Q: What happens when `APP_BETTER_AUTH_SECRET` is missing or too short? → A: Resolved
  by the same document revision: the system MUST refuse to start with an error when
  the variable is unset or shorter than 32 characters, **in every environment
  including development** — no insecure fallback exists.

**Input**: User description: "using ./designDocs/high-level-requirements.md" (2026-08-10
revision, updated same day — delta against the implemented `001-user-auth` feature: the
deployment environment-variable list now includes the authentication secret and the five
email (SMTP) delivery settings as first-class `APP_*` variables, the developer launch
assets must carry them, the development secret is auto-generated — a random string of at
least 32 characters shared identically by `launch.json` and `launch-dev.ps1` — and a
missing or too-short secret prevents startup in every environment)

**Source doc note (added 2026-08-20)**: `designDocs/high-level-requirements.md` no longer
exists under that name — it evolved in place across 001–004, then was split/renamed. The
closest surviving snapshot of what this spec actually read is
`designDocs/001-high-level-requirements-user-auth.md`, captured at the 003 commit.

## Context

Feature `001-user-auth` implemented the authentication system with email delivery and a
signing secret configured through environment variables that were treated as internal
details. The source document's 2026-08-10 revision promotes them to **documented
deployment configuration**: every deployment (and every developer launch asset) must
supply the authentication secret and the email delivery settings the same way it
supplies the port and database settings. One variable is renamed by this revision: the
implementation's `APP_AUTH_SECRET` becomes **`APP_BETTER_AUTH_SECRET`**.

The delta additions to the deployment variable list:

| Variable | Purpose | Dev default |
|---|---|---|
| `APP_BETTER_AUTH_SECRET` | Secret used to sign session cookies and tokens. **Required, ≥32 characters, in every environment — startup fails without it** | auto-generated random string, ≥32 characters (same value in both git-ignored launch assets) |
| `APP_SMTP_HOST` | Email (SMTP) host | `sandbox.smtp.mailtrap.io` |
| `APP_SMTP_PORT` | Email (SMTP) port | `2525` |
| `APP_SMTP_USER` | Email service username | placeholder (developer's Mailtrap username) |
| `APP_SMTP_PASS` | Email service password | placeholder (developer's Mailtrap password) |
| `APP_SMTP_FROM` | From header on all system email | `NativeAuthOAuth <no-reply@nativeauth.local>` |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operator Configures a Deployment Completely from the Documented Variable List (Priority: P1)

An operator deploying the system reads the documented environment-variable list, sets
every `APP_*` value — including the authentication secret and the email delivery
settings — and the deployment sends real sign-in email and issues sessions signed with
the operator's secret. Nothing about email delivery or session signing requires reading
the source code.

**Why this priority**: A deployment whose email and secret settings are undocumented
side channels cannot be stood up reliably; this is the reason the variables were
promoted into the spec.

**Independent Test**: On a clean environment, set only the documented `APP_*` variables
and launch. Sign-in email arrives via the configured SMTP settings; sessions are signed
with the configured secret; no other configuration source is consulted.

**Acceptance Scenarios**:

1. **Given** a deployment with all documented `APP_*` variables set, **When** a user
   requests a login link, **Then** the email is delivered through the configured
   SMTP host/port/credentials with the configured From header.
2. **Given** a deployment with `APP_BETTER_AUTH_SECRET` set, **When** sessions are
   issued, **Then** they are signed with that secret (a restart with the same secret
   keeps existing sessions valid; a different secret invalidates them).
3. **Given** a deployment missing or with unusable SMTP credentials, **When** the
   system starts and a login link is requested, **Then** the system does not crash: it
   logs the delivery problem and the user sees the friendly failure message already
   required by `001-user-auth` (FR-022).
4. **Given** the renamed secret variable, **When** the system reads configuration,
   **Then** it honors `APP_BETTER_AUTH_SECRET` (the prior internal name is no longer
   consulted).
5. **Given** any environment (development, staging, or production) where
   `APP_BETTER_AUTH_SECRET` is unset or shorter than 32 characters, **When** the
   system starts, **Then** it refuses to run and reports an error naming the
   variable and the 32-character minimum.

---

### User Story 2 - Developer Launch Assets Carry the Full Variable Set (Priority: P2)

A developer sets up the git-ignored launch assets from the checked-in templates. During
that setup a random authentication secret of at least 32 characters is generated
automatically and written into both assets (the same value in each), so the developer
only has to fill in their own Mailtrap credentials. Both the IDE debug entries and the
launch script then start the system with the complete documented variable set — email
delivery works in development without setting any Windows environment variables.

**Why this priority**: The launch assets are the documented on-ramp (FR-024/025 of
`001-user-auth`); if they omit the new variables, development email silently degrades
to console logging.

**Independent Test**: Copy the templates, fill in credentials, launch via the script
and via the IDE debug entry; a development sign-in email lands in the Mailtrap sandbox
inbox.

**Acceptance Scenarios**:

1. **Given** the IDE debug configuration, **When** any server or test entry is
   launched, **Then** all documented `APP_*` variables — including the secret and the
   five SMTP settings — are set with the documented development defaults.
2. **Given** the launch script, **When** it runs, **Then** it sets the same complete
   variable set before starting the server.
3. **Given** the checked-in templates for these git-ignored assets, **When** they are
   inspected in source control, **Then** credential-bearing values (`APP_SMTP_USER`,
   `APP_SMTP_PASS`, `APP_BETTER_AUTH_SECRET`) contain only obvious placeholders —
   never real credentials and never a generated secret.
4. **Given** first-time setup of the git-ignored launch assets, **When** they are
   created from the templates, **Then** `APP_BETTER_AUTH_SECRET` is populated
   automatically with a freshly generated random string of at least 32 characters,
   and the IDE configuration and the launch script carry the **same** generated
   value (sessions started from either asset remain valid across the other).

---

### Edge Cases

- `APP_SMTP_PORT` set to a non-numeric or non-positive value: startup fails fast with
  a friendly message naming the variable (consistent with `001-user-auth` FR-021/022).
- `APP_SMTP_USER`/`APP_SMTP_PASS` absent (fresh clone, unfilled template): the system
  still starts; email is not deliverable, the condition is clearly logged, and send
  attempts surface the existing friendly failure path rather than crashing.
- `APP_BETTER_AUTH_SECRET` unset, empty, or shorter than 32 characters — in any
  environment, including development: the system refuses to start with a friendly
  error naming the variable and the minimum length. There is no insecure fallback;
  normal development never hits this because setup auto-generates the secret into
  both launch assets. Ad-hoc launches outside the launch assets must export the
  variable themselves.
- Launch assets regenerated later (fresh setup): a new secret is generated; existing
  development sessions become invalid, which is acceptable (see Assumptions).
- The two launch assets somehow carry different secrets (manual editing): sessions
  created via one asset are rejected via the other; the shared-value rule (US2
  scenario 4) exists to prevent this.
- Real credentials accidentally placed in a checked-in template: prevented by the
  placeholder rule (US2 scenario 3); the git-ignored copies are the only files that
  ever hold real values.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The documented deployment environment-variable list MUST include
  `APP_BETTER_AUTH_SECRET`, `APP_SMTP_HOST`, `APP_SMTP_PORT`, `APP_SMTP_USER`,
  `APP_SMTP_PASS`, and `APP_SMTP_FROM`, alongside the variables documented by
  `001-user-auth`.
- **FR-002**: The system MUST read the session-signing secret from
  `APP_BETTER_AUTH_SECRET` (renaming the implementation's prior internal variable);
  the old name is not consulted.
- **FR-003**: The system MUST deliver all authentication email using the SMTP settings
  from `APP_SMTP_HOST`, `APP_SMTP_PORT`, `APP_SMTP_USER`, `APP_SMTP_PASS`, with
  `APP_SMTP_FROM` as the From header.
- **FR-004**: The IDE debug configuration (git-ignored, per `001-user-auth` FR-024)
  MUST set the six new variables with the documented development defaults in every
  entry (server and each test suite), in addition to the previously documented set.
- **FR-005**: The development launch script (git-ignored, per `001-user-auth` FR-025)
  MUST set the same complete variable set before launching the server.
- **FR-005a**: First-time setup of the git-ignored launch assets MUST automatically
  generate `APP_BETTER_AUTH_SECRET` as a random string of at least 32 characters and
  place the **same** generated value in both the IDE debug configuration and the
  launch script (per the source document's revised two-file sync rule).
- **FR-006**: The checked-in templates for the git-ignored launch assets MUST contain
  only placeholder values for credential-bearing variables (`APP_SMTP_USER`,
  `APP_SMTP_PASS`, `APP_BETTER_AUTH_SECRET`); real credentials and generated secrets
  live exclusively in the git-ignored copies.
- **FR-007**: Invalid values for the new variables (e.g., non-numeric `APP_SMTP_PORT`)
  MUST fail fast at startup with a friendly message naming the variable, matching the
  validation behavior established for the existing `APP_*` set.
- **FR-008**: Missing SMTP credentials MUST NOT crash the system: startup logs the
  degraded-email condition and send attempts follow the existing friendly failure
  path.
- **FR-009**: Project documentation of the environment variables (the configuration
  reference maintained with the project) MUST be updated to include the six new
  variables, their purposes, and their development defaults.
- **FR-010**: The system MUST refuse to start when `APP_BETTER_AUTH_SECRET` is unset
  or shorter than 32 characters, in every environment (development, staging,
  production), reporting a friendly error that names the variable and the minimum
  length. No fallback or default secret exists.

### Key Entities

- **Sign-In Configuration** (extends the `001-user-auth` entity): the per-deployment
  settings now additionally comprise the session-signing secret and the email delivery
  settings (host, port, username, password, From header).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An operator can configure a working deployment — including real email
  delivery and session signing — using only the documented variable list, with zero
  code reading or undocumented settings.
- **SC-002**: A developer on a fresh clone reaches a running environment whose sign-in
  email lands in their Mailtrap sandbox inbox by filling in only their Mailtrap
  credentials in the two git-ignored launch assets — the authentication secret
  requires no manual step because it is generated for them.
- **SC-003**: 100% of launch-asset entries (server + every test suite entry) carry the
  complete documented variable set.
- **SC-004**: A search of the checked-in repository finds zero real credentials and
  zero generated secrets; every credential-bearing value in checked-in files is an
  obvious placeholder.
- **SC-005**: 100% of startup attempts without a valid ≥32-character secret are
  refused with an error naming the variable — in every environment.

## Assumptions

- The five SMTP variable names match those already read by the `001-user-auth`
  implementation (`APP_SMTP_HOST/PORT/USER/PASS/FROM`), so this feature standardizes
  and documents them rather than introducing new behavior; only the secret variable
  requires a rename (`APP_AUTH_SECRET` → `APP_BETTER_AUTH_SECRET`).
- The source document lists `APP_SMTP_PORT` default as `2525` and the Mailtrap sandbox
  host as the development default; production deployments override these with their
  provider's values.
- The source document's literal template text (e.g., `"Mailtrap SMTP username"`) is
  treated as placeholder guidance for the checked-in templates, not as required
  runtime values; for the secret, the document's later instruction to auto-generate a
  ≥32-character random string supersedes its `"BetterAuth secret"` placeholder line.
- "First-time setup" of the launch assets is whatever checked-in step creates the
  git-ignored copies from the templates (a small setup script — the plan phase decides
  its exact shape); regenerating them mints a fresh secret and invalidates existing
  development sessions, which is acceptable in development.
- The secret-sync rule covers exactly the two git-ignored assets (`launch.json`,
  `launch-dev.ps1`); both example templates stay checked in and placeholder-only.
- The source document's "not 32 characters long" startup rule is read as "shorter
  than 32 characters" (i.e., at least 32 required), consistent with its own
  "at least 32 characters" generation rule; longer secrets are fine.
- The test suites set their own in-process configuration (the launch assets' debug
  entries provide a valid secret), so the mandatory-secret rule does not break
  `npm test` on a fresh clone.
- No behavioral change to authentication flows, rate limiting, or the demo client is
  intended by this feature; it is configuration surface and developer-asset work only.
- Session invalidation on secret rotation is acceptable operational behavior (standard
  for signed-session systems) and needs no migration handling.
