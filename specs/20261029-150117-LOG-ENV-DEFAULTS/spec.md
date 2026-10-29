# Feature Specification: Log Settings Left at Their Defaults

**Feature Branch**: `log-env-default`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "requirements/20261029-150117-log-env-defaults/requirements.md" — When the web app server launches, print a console log line if an environment variable is not found and the program uses the default: `ENV_NAME was not found, using default value: <default value>.` The requirements report `requirements/20261029-150117-log-env-defaults/requirements-report.md` resolved 10 findings (AM1–AM4, UA1–UA4, NC1–NC2) into the requirements' Decisions section.

## Clarifications

### Session 2026-10-29

- Q: Two existing start-up lines overlap the new ones (`[mailer] ENV_SMTP_USER/ENV_SMTP_PASS not set …` and `[db] ENV_DATABASE_CA_CERT is not set …`); keep them, or remove them? → A: Keep both as they are; the new `[config]` lines are added beside them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See every setting the server filled in itself (Priority: P1)

An operator starts the web server, locally or on a production instance, and reads its start-up log.
For every setting that was not provided and for which the server substituted a value of its own, one line names the setting and the value now in force, so a missing or misspelled setting is visible at once instead of silently running on a default.

**Why this priority**: This is the whole feature; without it nothing is reported.

**Independent Test**: Start the server with only the required settings and read the start-up log: one line per setting that took its default, each giving the value; start it again with one of those settings given a value and see its line gone.

**Acceptance Scenarios**:

1. **Given** `ENV_PORT` is not set, **When** the server starts, **Then** the log contains exactly `[config] ENV_PORT was not found, using default value: 8080.`
2. **Given** `ENV_PORT=9090`, **When** the server starts, **Then** no line names `ENV_PORT`.
3. **Given** several settings are missing, **When** the server starts, **Then** there is one line per missing setting, sorted by setting name, all printed after the configuration has been read and before the `[server] Starting in …` line.
4. **Given** `ENV_MAX_SIGNIN_COOKIE_DURATION` is not set, **When** the server starts, **Then** its line shows `2592000000`, written as the server holds it, without quotes or separators.

---

### User Story 2 - See which optional services and features are off (Priority: P2)

Some settings have no value of their own: leaving them out switches a capability off or picks a fallback (no Valkey means the in-process cache; no allowlist means everyone may sign in).
The operator sees each of these too, with `none` and what the server does instead, so a production instance that forgot its Valkey or OpenSearch address says so in its log.

**Why this priority**: It catches the costliest omissions in production, but the feature already delivers value for settings with a concrete default without it.

**Independent Test**: Start the server without `ENV_VALKEY_URL` and see `[config] ENV_VALKEY_URL was not found, using default value: none (in-process cache, queue and registry).`; set it and see the line gone.

**Acceptance Scenarios**:

1. **Given** none of the five `ENV_SPACES_*` settings is set, **When** the server starts, **Then** one line reads `[config] ENV_SPACES_* was not found, using default value: none (TRENDING objects and assets served from the instance).`
2. **Given** `ENV_SIGNIN_METHOD=both` and no Google settings, **When** the server starts, **Then** one line reads `[config] ENV_OAUTH_GOOGLE_* was not found, using default value: none (Google sign-in off).`
3. **Given** `ENV_SIGNIN_METHOD=native`, **When** the server starts, **Then** no `ENV_OAUTH_*` line is printed, since providers are not in use.
4. **Given** `ENV_STAY_SIGNED_IN` is not set, **When** the server starts, **Then** its line reads `… using default value: 0 (the Stay signed in box starts clear).`

---

### User Story 3 - Quiet, safe logs in production (Priority: P3)

The operator's production log carries only lines that matter and no personal data: settings that are not in effect are not reported, and an address used as a default is masked.

**Why this priority**: It keeps the feature from adding noise or exposing data, but does not change what is reported for the settings that matter.

**Independent Test**: Start the server with `ENV_EMAIL_TRANSPORT=ses` and no `ENV_SMTP_*` settings and see no `ENV_SMTP_*` line; start it without `ENV_ADMINS` and see the address masked.

**Acceptance Scenarios**:

1. **Given** `ENV_EMAIL_TRANSPORT=ses` and no `ENV_SMTP_*` settings, **When** the server starts, **Then** no line names `ENV_SMTP_HOST`, `ENV_SMTP_PORT`, `ENV_SMTP_USER` or `ENV_SMTP_PASS`.
2. **Given** `ENV_EMAIL_TRANSPORT=smtp` (or unset) and no `ENV_SMTP_HOST`, **When** the server starts, **Then** `[config] ENV_SMTP_HOST was not found, using default value: sandbox.smtp.mailtrap.io.` is printed.
3. **Given** `ENV_ADMINS` is not set, **When** the server starts, **Then** its line reads `[config] ENV_ADMINS was not found, using default value: r•••@gmail.com.` and the full address appears nowhere in the log.
4. **Given** the production settings in `.do/app.yaml`, **When** an instance starts, **Then** only settings actually left out of that file and in effect are reported (today: `ENV_OPENSEARCH_URL` and `ENV_EMAIL_ASSET_ORIGIN` would be, if not set in the console).

---

### Edge Cases

- **An invalid setting**: the server stops with its one `[config] Invalid …` error line, as today, and prints none of the default lines.
- **A setting present but empty**: reported exactly when the server already uses its default for it. A number setting or an optional setting (such as `ENV_VALKEY_URL=""`) set to an empty value is reported; one of the six text settings (`ENV_SIGNIN_METHOD`, `ENV_DATABASE_URL`, `ENV_EMAIL_TRANSPORT`, `ENV_ADMINS`, `ENV_SMTP_HOST`, `ENV_EMAIL_FROM`) set to an empty value keeps that empty value and is not reported. No behaviour changes.
- **Some but not all of a group**: some `ENV_SPACES_*` or some of a provider's `ENV_OAUTH_*` settings set is already an error that stops the server; nothing new is reported.
- **`ENV_SMTP_USER` set but `ENV_SMTP_PASS` missing (with `smtp`)**: each of the two is reported on its own when missing.
- **A required setting missing** (`ENV_BETTER_AUTH_SECRET`, `ENV_PUBLIC_ORIGIN`, `ENV_SES_*` with `ses`): the server stops as today; no default line is printed.
- **A clamped setting**: `ENV_LINE_GRAPH_REFRESH_INTERVAL` missing is reported with its default, `60000`; the clamp to the live-refresh floor is not part of the line.
- **Every setting provided**: no default line is printed.
- **The developer scripts and the tests** read the same configuration but print none of these lines.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When the web server starts and its configuration is valid, it MUST print one line for every setting that was not found and for which it uses a default, and no line for any other setting.
- **FR-002**: Each line MUST read exactly `[config] <NAME> was not found, using default value: <value>.`, with `<value>` written as the server holds it, unquoted and without thousands separators, followed by a period.
- **FR-003**: A setting the server fills with a concrete value MUST be reported with that value. These are every numeric setting with a default (54, `ENV_PORT` and `ENV_SMTP_PORT` among them, listed in the requirements report's section 5) and the six text settings `ENV_SIGNIN_METHOD` (`native`), `ENV_DATABASE_URL` (`postgres://localhost:5432/app01`), `ENV_EMAIL_TRANSPORT` (`smtp`), `ENV_ADMINS` (masked, FR-008), `ENV_SMTP_HOST` (`sandbox.smtp.mailtrap.io`) and `ENV_EMAIL_FROM` (`CrowdPoll <no-reply@mail.crowdpoll.vote>`).
- **FR-004**: A setting whose absence switches something off or picks a fallback MUST be reported with the value `none` (or `0` for `ENV_STAY_SIGNED_IN`) followed by the behaviour in brackets, worded exactly:

  | Setting | Value printed |
  |---|---|
  | `ENV_VALKEY_URL` | `none (in-process cache, queue and registry)` |
  | `ENV_OPENSEARCH_URL` | `none (PostgreSQL full-text search)` |
  | `ENV_SPACES_*` | `none (TRENDING objects and assets served from the instance)` |
  | `ENV_DATABASE_CA_CERT` | `none (system certificate roots)` |
  | `ENV_ALLOWED_EMAILS` | `none (allowlist off: everyone may sign in)` |
  | `ENV_EMAIL_ASSET_ORIGIN` | `none (each link's own origin)` |
  | `ENV_PROTOTYPES` | `none (no prototypes served)` |
  | `ENV_STAY_SIGNED_IN` | `0 (the Stay signed in box starts clear)` |
  | `ENV_SMTP_USER`, `ENV_SMTP_PASS` (each) | `none (emails logged to the console, not sent)` |
  | `ENV_OAUTH_GOOGLE_*`, `ENV_OAUTH_APPLE_*`, `ENV_OAUTH_MICROSOFT_*`, `ENV_OAUTH_AMAZON_*` (each provider) | `none (<Provider> sign-in off)`, with `Google`, `Apple`, `Microsoft` or `Amazon` |

- **FR-005**: The all-or-none groups MUST be reported as one line each, named with `*`: `ENV_SPACES_*` when all five are unset, and `ENV_OAUTH_<PROVIDER>_*` when all of that provider's settings are unset.
- **FR-006**: A setting MUST be reported only while it is in effect: `ENV_SMTP_HOST`, `ENV_SMTP_PORT`, `ENV_SMTP_USER` and `ENV_SMTP_PASS` only when the email transport is `smtp`; the `ENV_OAUTH_*` groups only when the sign-in method is `oauth` or `both`.
- **FR-007**: A setting MUST count as "not found" exactly when the server already uses its default for it today (see Edge Cases); this feature MUST NOT change any default, any validation or what any setting does.
- **FR-008**: An email address printed as a value MUST be masked as elsewhere in the logs (first character, `•••`, then the domain): the `ENV_ADMINS` default prints as `r•••@gmail.com`. No other value is masked; none of the others holds a secret or a personal address.
- **FR-009**: The lines MUST be informational output (standard output), sorted by setting name, printed after the configuration has been read and before the `[server] Starting in …` line.
- **FR-010**: When the configuration is invalid, or a required setting is missing, the server MUST stop with its existing error line and print none of these lines.
- **FR-011**: Only the web server's start-up MUST print these lines; reading the configuration MUST itself print nothing, so the developer scripts (`reconcile`, `publish-assets`, `populate-poll`, `seed-polls`) and the tests produce no new output.
- **FR-012**: Required settings (`ENV_BETTER_AUTH_SECRET`, `ENV_PUBLIC_ORIGIN`, and `ENV_SES_REGION`, `ENV_SES_ACCESS_KEY_ID`, `ENV_SES_SECRET_ACCESS_KEY` with `ses`) are never reported, since they have no default.
- **FR-013**: Every existing start-up line MUST stay as it is, including the `[mailer]` warning about missing SMTP credentials and the `[db]` line about `ENV_DATABASE_CA_CERT`, which the new lines repeat in part.

### Key Entities

- **Default used**: one setting that was not found and was filled in by the server — its name (or group name, such as `ENV_SPACES_*`) and the value printed for it. The configuration carries the list of these for start-up to print; it is in memory only and never stored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With only the required settings provided, every setting that has a default and is in effect appears in the start-up log exactly once, with its default value; 0 settings are missed and 0 are reported twice.
- **SC-002**: A setting given a value never appears in a default line (0 false reports across a start with every setting provided).
- **SC-003**: Starting with the production settings prints no line about the SMTP settings and no full email address.
- **SC-004**: An operator can find every defaulted setting in one start-up log by searching for `was not found, using default value`, in under a minute.
- **SC-005**: Running the developer scripts and the full test suite prints no new line, and every existing test still passes.

## Assumptions

- "Launches" means the web server's start-up only, not the build or the developer scripts.
- `proram` in the requirement is a typo for `program`; `ENV_NAME` and `<default value>` are placeholders.
- The settings and their defaults are the ones the server reads today (`CLAUDE.md`'s settings table); a setting added later follows the same rules.
- `ENV_ADMINS`' default is the only default that is an email address; `ENV_EMAIL_FROM`'s default is the service's own no-reply sender and is printed in full.
- On App Platform the lines go to the runtime log, like every other start-up line.
- No new setting, route, dependency, data or migration; no browser change.
- The requirements report's sections 4.2 and 5 and NC2's line count predate the AM1 decision (Recommendation B); this specification and the requirements' Decisions section are authoritative where they differ.
