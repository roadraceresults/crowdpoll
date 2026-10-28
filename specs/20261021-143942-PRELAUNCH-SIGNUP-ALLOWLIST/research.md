# Research: Pre-Launch Sign-Up Allowlist

**Feature**: `specs/20261021-143942-PRELAUNCH-SIGNUP-ALLOWLIST/spec.md`
**Requirements**: `requirements/20261021-143942-prelaunch-signup-allowlist/requirements.md` (Decisions UA1–UA8, AM1–AM3, NC1–NC2)

Every question was settled by the requirements review and `/speckit-clarify`; this file records how each is carried into the
code. No item needed outside research.

## R1. The setting and where it is read (FR-001–FR-004, UA1, AM3)

- **Decision**: `ENV_ALLOWED_EMAILS`, read once by `loadConfig` in `src/config.ts` into `config.allowedEmailKeys: Set<string> |
  undefined`.
  - Absent, empty, or only commas and spaces → `undefined` (off), as `optionalVar` treats every other setting (AM3).
  - Each entry is trimmed and lower-cased, checked against the same address pattern `parseEmail` uses, and stored as its email
    key (R2). An entry that fails → `ConfigError("Invalid ENV_ALLOWED_EMAILS: \"<entry>\" is not an email address.")`, so the app
    refuses to start (FR-003).
  - `server.ts` logs one line beside its other startup lines: `[auth] Sign-up allowlist off` or
    `[auth] Sign-up allowlist on (<n> addresses)`; never an address (FR-004).
- **Rationale**: the same shape as `ENV_ADMINS`; a typo fails at deployment, not at a tester's first sign-in.
- **Alternatives considered**: reading the variable per request (needless; App Platform restarts the app on a change);
  a database table of invitees (not asked for, and needs an admin UI).

## R2. Matching by email key (FR-005, FR-006, AM2, UA6)

- **Decision**: a TypeScript twin of the SQL `emailKey`, `emailKeyOf(address: string): string`, in `src/auth/emailKey.ts`:
  local part up to the first `+`; for `gmail.com` and `googlemail.com` the dots are removed and the domain becomes `gmail.com`.
  The address pattern moves there too (`EMAIL_PATTERN`), so `parseEmail` in `src/routes/api.ts` and the setting share it.
- **`isAllowed(email, config)`** in a new `src/auth/allowlist.ts`: `true` when the list is off, when the trimmed, lower-cased address is in
  `config.admins` (UA6; compared directly, so `src/auth/` does not import `src/polls/`, analyze L1), or when `config.allowedEmailKeys.has(emailKeyOf(email))`.
- **Rationale**: the same mailbox rule as one-person-one-account (Production Email R10), with no query: the list is in memory.
- **Agreement**: a test runs both versions over the same addresses on the embedded database and expects equal results, so the
  two cannot drift.
- **Alternatives considered**: exact match (rejected in AM2); querying the SQL function per check (a round trip for an
  in-memory list).

## R3. Where the check runs (FR-007–FR-010, UA3, UA5, UA7)

- **Decision**: one call to `isAllowed` at each way in, after the existing checks (honeypot, address, rate limit, FR-012) and
  before anything is created or sent:

  | Path | Where | On refusal |
  |---|---|---|
  | Create Account | `POST /api/auth/create-account`, after the rate limit, before `userByKey` | `403`, no account, no email |
  | Login | `POST /api/auth/request-login-link`, after the rate limit, before the account lookup | `403`, no link, no invitation |
  | Email change | `POST /api/me/email-change`, after the rate limit, before the old request is dropped | `403`, no email |
  | Sign-in link | `GET /api/auth/verify`, on `pendingLink(token).email`, before `completeSignIn` | redirect `/login?error=not-launched`, token not consumed |
  | Confirmation page | `POST /api/auth/confirm-signin`, the same check | `403` with `redirect: /login?error=not-launched` |
  | Email-change link | `GET /api/me/email-change/verify`, on `change.newEmail` after consuming | redirect `/profile?error=not-launched` |
  | Every new session | BetterAuth `session.create.before` (`src/auth/auth.ts`), only while the list is on: looks up the user's email by id | throws `APIError("FORBIDDEN")`; no session |
  | Every new user | BetterAuth `user.create.before`, only while the list is on: the new user's email | throws the same; no `"user"` row (social sign-in; analyze C2) |

- **Rationale**: the routes refuse early, so nothing is sent or created; the session hook is the backstop that also covers the
  OAuth phase, whose callback never passes through these routes (UA7).
- **OAuth refusal page**: BetterAuth sends a refused OAuth callback to its error URL. The social sign-in is given `/login` as
  its error callback, and the login card maps the error value BetterAuth passes for the hook's `APIError` to the same message;
  a test drives the callback with a stubbed provider to pin that value (analyze C1, T033).
- **Alternatives considered**: the session hook alone (it would let Login and Create Account send emails before refusing at the
  link); a middleware on `/api/auth/*` (the address is in different places per route).

## R4. The refusal's shape (FR-011, UA8, clarify Q2)

- **Decision**: `403 { "error": "CrowdPoll hasn't launched yet. For now, accounts are open to invited testers only.", "code":
  "not-launched" }`.
  - `error` carries the message because the Create Account, Login and Profile cards already show `body.error` in their status
    line, so they need no change for the three `POST` paths.
  - `code` is the stable value for tests and future clients.
  - The two redirect paths use `?error=not-launched`; the Login and Profile cards map it to the same message, beside their
    existing `invalid-link` mapping.
  - No contact address (clarify Q2).
- **Rationale**: the requirements' draft (`error: "not-launched", message: …`) would have needed every card changed to read
  `message`; this keeps a stable code and the cards as they are.
- **Alternatives considered**: `409` (not a conflict); `401` (the visitor is not unauthenticated in any useful sense).

## R5. Logging refusals (FR-004a, clarify Q1)

- **Decision**: each refusal logs `[auth] Not launched: <path> refused for <masked>`, where `<path>` is `create-account`,
  `login`, `email-change` or `session`, and `<masked>` comes from `mailer.maskAddress` (`j•••@gmail.com`).
- **Rationale**: shows pre-launch demand without storing an address (SC-005), in the format the mailer already uses.

## R6. Existing accounts and sessions (FR-013, UA4)

- **Decision**: nothing is deleted or changed; `session.create.before` runs only for new sessions, and the session lookup
  (`src/auth/sessionCache.ts`) is untouched, so an existing session runs until it ends.
- **Rationale**: the smallest change; accounts work again when the list is removed.

## R7. Keeping the list out of the repository (FR-015, FR-016, NC2)

- **Decision**: `.do/app.yaml` does **not** list `ENV_ALLOWED_EMAILS`; the operator adds it in the App Platform console as an
  encrypted variable (`quickstart.md` §2).
  The setting is documented by name in `CLAUDE.md`, `README.md` and `postman/openapi.json` (the `403`), and the local templates
  carry it empty (off): `"ENV_ALLOWED_EMAILS": ""` in `launch.json.example`, `$env:ENV_ALLOWED_EMAILS = ""` in
  `devScripts.example/launch-dev.ps1`.
- **Rationale**: an entry in `.do/app.yaml` would need a value; a plain value would put addresses in git, and an encrypted one
  ties the spec file to one app. Leaving it out means removing it in the console is the whole launch step.
- **Also fixed**: `launch.json.example`'s invalid `"ENV_OPENSEARCH_URL" = …` line (requirements TD3), since the new entry goes
  into the same block.

## R8. Tests

- `tests/allowlist.test.ts` (new): the setting (off when absent or empty, count, invalid entry refuses), `emailKeyOf` against the
  SQL `emailKey`, and each path in R3: listed and unlisted, an administrator not listed, a link issued before the list was set,
  the confirmation page, the email-change request and link, the refusal log line, and that nothing is sent on refusal.
- `tests/client-not-launched.test.ts` (new, jsdom): the Login and Profile cards show the message for `?error=not-launched`.
- `tests/openapi-contract.test.ts`: the new `403` responses.
- With the setting unset, the existing suite runs unchanged (SC-003).
