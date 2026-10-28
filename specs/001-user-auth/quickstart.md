# Quickstart & Validation Guide: User Authentication System

**Feature**: [spec.md](./spec.md) | **Contracts**: [contracts/api-endpoints.md](./contracts/api-endpoints.md)

How to run the system locally and prove each user story end-to-end. Implementation
details live in `tasks.md` and the code; this is the validation runbook.

## Prerequisites (Windows 11 dev machine)

1. **Node.js 22 LTS** — `winget install OpenJS.NodeJS.LTS`
2. **MongoDB Community Server** (as a Windows service) —
   `winget install MongoDB.Server` (or the MSI from mongodb.com; keep "Install as
   Service" checked). Verify: `Get-Service MongoDB` shows `Running`.
   *(These are the FR-023 startup instructions; a maintained copy ships in the repo
   README at implementation.)*
3. **Mailtrap account** — free sandbox inbox; note the SMTP credentials for env config.

## Setup

```powershell
git clone https://github.com/roadraceresults/nativeAuthOAuth ; cd nativeAuthOAuth
npm install
./devScripts/launch-dev.ps1     # sets APP_* vars, starts MongoDB service if stopped,
                                # launches the server on http://localhost:9999
```

`launch-dev.ps1` (FR-025) and `.vscode/launch.json` (FR-024) are git-ignored; first-time
setup copies them from checked-in `*.example` templates (created during implementation).
Environment defaults: `APP_PORT=9999`, `APP_MONGODB_NAME=app01`,
`APP_MONGODB_URI=mongodb://localhost:27017/app01`, `APP_SIGNIN_METHOD=native`,
`APP_SIGNIN_COOKIE_DURATION_MAX=2592000000`.

## Automated validation

```powershell
npm test                # Vitest: all suites under ./tests (uses in-memory MongoDB +
                        # mock mail transport; no local service or Mailtrap needed)
npm test -- tests/auth.test.ts    # single suite; or debug via launch.json entries
```

Suites map to stories: `auth.test.ts` (US1), `session.test.ts` (US1/FR-007a),
`profile.test.ts` (US3 + email change), `rate-limit.test.ts` (FR-004a/013c).

## Manual validation scenarios

Run against `http://localhost:9999` with the Mailtrap sandbox inbox open.

### US1 — Create account & sign in (P1)
1. Visit `/create-account`, submit `you@example.com` → "check your inbox" message.
2. Mailtrap shows a login-link email. Click the link → redirected to `/`, header shows
   userName `you` and default avatar; message reads "You are logged in as you".
3. Click the link again → refused ("invalid or expired link"), still exactly one session.
4. Request 2 login links, then a 3rd within 15 min (same browser/client) → the 3rd is
   refused with the next-allowed time (2-per-15-min per-client limit on the endpoint).
5. Logout → guest header returns.
**Expected**: SC-001 (≤3 min), SC-003 (single-use links).

### US2 — Signed-in vs guest experience (P2)
1. Signed out: header shows Login / Create Account; page shows "Guest-mode: You are not
   logged in"; `/profile` redirects to sign-in.
2. Signed in: header shows userName + avatar; avatar click opens menu with Edit Profile.
**Expected**: SC-004.

### US3 — Profile & email change (P3)
1. `/profile`: change userName to a free name → header updates. To a taken name → clear
   "already in use" error, nothing saved (create a second account first to test).
2. Request email change to a fresh address → verification lands in the NEW address's
   Mailtrap inbox; profile still shows the old address.
3. Open the verification link in a private/incognito window (no session) → change
   completes anyway (self-contained link); profile shows new address; OLD address receives
   a notification email with no links.
4. Request a change to the other account's address → `409`-style clear refusal, no email.
**Expected**: SC-007.

### US4 — Cookie banner (P4)
1. Fresh browser profile: banner appears with only "I Understand". Acknowledge → gone on
   reload (stored in localStorage — confirm no second cookie in DevTools; only
   `session_token` exists at any time).
**Expected**: SC-006.

### US5 — Single session (FR-007a)
1. Sign in from browser A, then browser B. Refresh A → guest (session replaced).
**Expected**: matches clarified single-session rule.

### Switch rehearsal (US5/FR-018) — config only
1. Stop server; set `APP_SIGNIN_METHOD=oauth` (no provider creds yet) → Login page offers
   provider buttons and hides the email flow; `/create-account` hidden; no code changes.
   (Full OAuth sign-in validation is blocked on provider approval — out of scope for
   local validation.)
**Expected**: SC-005.

## Deployment smoke (DigitalOcean App Platform)

After autodeploy from `dev` of `roadraceresults/nativeAuthOAuth`: visit the custom domain
over HTTPS, run US1 with a real Mailtrap-routed address, confirm `session_token` cookie is
`Secure` and is the only cookie set (SC-006), and confirm the app served on `APP_PORT`
behind the platform proxy.
