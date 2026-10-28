# Quickstart & Validation Guide: Email & Auth-Secret Deployment Configuration

**Feature**: [spec.md](./spec.md) | **Contract**: [contracts/environment-variables.md](./contracts/environment-variables.md)

How to prove the configuration delta works. Prerequisites are unchanged from
`001-user-auth` quickstart (Node 22, MongoDB service, Mailtrap account).

## First-time setup (replaces the manual Copy-Item steps)

```powershell
git pull ; npm install
./devScripts.example/setup-dev.ps1     # copies templates → git-ignored working copies,
                                       # generates one 48-char secret into BOTH copies
# then fill in APP_SMTP_USER / APP_SMTP_PASS in devScripts/launch-dev.ps1
# and .vscode/launch.json with your Mailtrap sandbox credentials
```

## Automated validation

```powershell
npm test                          # full suite still green (behavioral no-change)
npm test -- tests/config.test.ts  # new: rename + validation coverage
```

`tests/config.test.ts` must show: secret read from `APP_BETTER_AUTH_SECRET` (old
`APP_AUTH_SECRET` ignored); an unset, empty, or <32-character secret is refused with
an error naming the variable and the minimum (FR-010); invalid `APP_SMTP_PORT` fails
fast naming the variable; absent SMTP credentials produce the degraded-email warning,
not a crash.

## Manual validation scenarios

### US1 — Operator configuration (P1)

1. Launch with all documented variables set (the launch script provides this) →
   request a login link → the email arrives in the Mailtrap sandbox inbox via the
   configured host/port/credentials, From header matching `APP_SMTP_FROM`.
2. Restart the server with the same `APP_BETTER_AUTH_SECRET` → an existing session
   cookie still works. Change the secret and restart → the session is rejected
   (guest again).
3. Blank out `APP_SMTP_USER`/`APP_SMTP_PASS` and restart → startup logs the
   degraded-email warning; requesting a login link shows the friendly message; no
   crash. (Spec US1 scenario 3.)
4. Set `APP_SMTP_PORT` to `abc` and restart → process exits with a friendly error
   naming `APP_SMTP_PORT`.
5. Unset `APP_BETTER_AUTH_SECRET` (or set it to fewer than 32 characters) and
   restart → the process refuses to start with an error naming the variable and the
   32-character minimum — in development exactly as in deployment (US1 scenario 5,
   SC-005).

### US2 — Launch assets (P2)

1. Delete `.vscode/launch.json` and `devScripts/launch-dev.ps1`, run
   `./devScripts.example/setup-dev.ps1` → both files exist; both contain the **same**
   ≥32-character secret; no `__GENERATED_ON_SETUP__` remains in them.
2. Run it again without `-Force` → it refuses and leaves the files untouched.
   With `-Force` → fresh shared secret in both.
3. Inspect every entry in `.vscode/launch.json` (server + each test suite) → all six
   new variables present alongside the 001 set (SC-003). Same for the launch script.
4. `git grep` for the generated secret and your Mailtrap credentials → zero hits in
   tracked files; `git grep __GENERATED_ON_SETUP__` hits only the checked-in
   templates (SC-004).
5. Launch via the script **and** via the IDE "Debug server" entry → sign-in works in
   both, and a session created under one remains valid under the other (shared
   secret).

## Deployment smoke (DigitalOcean App Platform)

Set the six new variables in the component's environment settings (real SMTP values,
a real ≥32-char secret — deployment without it will fail at startup by design).
Deploy, run the 001 US1 flow over HTTPS, and confirm the login email arrives via the
configured SMTP service.
