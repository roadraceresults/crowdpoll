# Quickstart: Pre-Launch Sign-Up Allowlist

How to validate the feature. Contracts: `contracts/api.md` (A1–A6), `contracts/ui-contracts.md` (C1–C3).

## 1. Automated checks

```
npm test
```

Expected: all suites pass, including `allowlist.test.ts`, `client-not-launched.test.ts` and `openapi-contract.test.ts` (R8).
With `ENV_ALLOWED_EMAILS` unset, every existing suite passes unchanged (SC-003).

## 2. Production setting (by hand)

1. DigitalOcean → Apps → the CrowdPoll app → Settings → the web component → Environment Variables → **Edit**.
2. Add `ENV_ALLOWED_EMAILS`, scope **Run time**, tick **Encrypt**, value: the testers' addresses separated by commas.
   Administrators in `ENV_ADMINS` need not be listed.
3. Save; App Platform redeploys.
4. In the runtime log, look for `[auth] Sign-up allowlist on (<n> addresses)` with the expected count, and no address.

At launch: delete the variable (or empty it) and save; the log then says `[auth] Sign-up allowlist off`.

## 3. Local checks

Set `ENV_ALLOWED_EMAILS` in the git-ignored `.vscode/launch.json` or `devScripts/launch-dev.ps1` to one of your verified SES
sandbox addresses (production-email quickstart §6), and use another verified address as the unlisted one.

1. **Startup** (US3): the log says the allowlist is on with 1 address. Set the value to `not-an-address`: the app refuses to
   start, naming `ENV_ALLOWED_EMAILS`. Set it to empty: the log says off.
2. **Create Account** (US1, C1): the listed address gets "Check your inbox" and a link; the unlisted one sees the message and
   receives nothing; the log has `[auth] Not launched: create-account refused for u•••@…`.
3. **Login** (US2, C2): the same for the Login card (`login`), and no invitation reaches the unlisted inbox.
4. **Earlier link** (US2): with the list off, request a link for the second address; turn the list on and restart; open the
   link: you land on `/login` with the message, and the link still shows as unused (opening it after removing the list signs
   in).
5. **Administrator** (US3): an `ENV_ADMINS` address not in the list signs in.
6. **Existing session** (US2): sign in as the second address with the list off; turn it on and restart; you stay signed in.
7. **Email change** (US4, C3): signed in as the listed address, change to the unlisted one: the Profile card shows the message
   and nothing is sent.
