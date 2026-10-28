# Implementation Plan: Privacy Policy, Terms of Service and Account Deletion

**Branch**: `dev` (no dedicated branch) | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261021-204537-PRIVACY-AND-TERMS/spec.md`

## Summary

CrowdPoll publishes a Privacy Policy and Terms of Service, links them from a footer on every page, the cookie banner,
the Create Account and Login cards and every email, requires and records agreement to the Terms before an account can be
used, lets a user delete their account from the Profile page, and makes the policy's promises true: fonts served by
CrowdPoll, no IP address or user agent on sessions, masked IPs in logs, and a daily retention sweep.
The technical approach (research R1–R14): two static pages from reviewed drafts; one `TERMS_VERSION` constant; two
nullable columns on `user` read with the cached session; one Express middleware as the terms gate; one transactional
`deleteAccount` that deletes what is the user's and anonymizes their votes on others' polls; one new daily sweep.

## Technical Context

**Language/Version**: TypeScript 5 on Node.js 22 (ES modules); browser scripts in plain ES5-style JavaScript, as the
existing `src/public/*.js`.

**Primary Dependencies**: Express 5, BetterAuth 1.6.26 (magic link, database hooks), Kysely 0.29 on `pg`, nodemailer's
SES transport; no new dependency.

**Storage**: PostgreSQL: one additive migration (`009-terms-and-privacy`: two `user` columns, `polls.ever_voted` backfilled
from `vote_history`, session IP/user-agent cleared); Valkey or the in-process cache for sessions, rosters and counters (entries dropped on deletion).

**Testing**: Vitest + supertest on embedded PostgreSQL; jsdom for the cards, footer and dialog
(`tests/helpers/browser.js`).

**Target Platform**: DigitalOcean App Platform (Linux), `tor1`; browsers: current evergreen.

**Project Type**: web service with server-rendered static pages and vanilla-JS cards.

**Performance Goals**: the gate adds no database query to a request (the session is already read and cached); a
deletion completes in one transaction (seconds for a user with hundreds of polls and votes).

**Constraints**: cookie policy unchanged (two strictly necessary cookies); no third-party request from any page;
Material 3 tokens only in new sheets; Constitution VI (no explanatory comments).

**Scale/Scope**: 2 new pages and 1 accept page, 5 new routes (`/privacy`, `/terms`, `/accept-terms`, `POST /api/legal/accept-terms`, `DELETE /api/me`), 1 middleware, 1 sweep, 1 migration, changes to 11 page
heads, 4 cards, `app.js`, `templates.ts`, `openapi.json`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Think before coding | Assumptions stated in spec Assumptions and research R7, R8 (OAuth mode, earlier addresses), R14 (operator facts) | Pass |
| II. Simplicity first | One constant, two columns, one middleware, one module for deletion; no history table, no contact form, no download button, no dependency | Pass |
| III. Surgical changes | Existing routes untouched except create-account (validation), `/api/me` (one field), the two log lines; cards gain controls, nothing restructured | Pass |
| IV. Goal-driven | Each user story has an independent test; SC-001–SC-007 map to automated checks (quickstart §2) | Pass |
| V. Code quality | Single-purpose modules (`legal/version.ts`, `legal/termsGate.ts`, `legal/deleteAccount.ts`, `auth/maskIp.ts`); errors logged and answered, deletion all-or-nothing; server logs each acceptance, deletion and sweep | Pass |
| VI. Self-documenting code | No explanatory comments ported from the drafts or the spec | Pass |
| Security, privacy | `Origin` checks on accept and delete; `next` restricted to same-origin paths; addresses masked in logs; data collection reduced | Pass |
| Documentation deliverables | `README.md` and `ARCHITECTURE.md` regenerated in the final phase of `tasks.md` | Pass (to be carried into tasks) |

Post-design re-check: unchanged, all pass. No Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/20261021-204537-PRIVACY-AND-TERMS/
├── spec.md
├── plan.md                      # this file
├── research.md                  # R1–R14
├── data-model.md                # two columns, anonymized vote, deletion and retention tables
├── quickstart.md                # fonts fetch, automated, local, production and pre-launch checks
├── contracts/
│   ├── api.md                   # A1–A9
│   ├── ui-contracts.md          # C1–C8
│   ├── email-messages.md        # M1–M2
│   ├── privacy-policy.md        # the draft policy
│   └── terms-of-service.md      # the draft terms
├── checklists/requirements.md
└── tasks.md                     # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── legal/
│   ├── version.ts               # TERMS_VERSION (new)
│   ├── termsGate.ts             # the gate middleware (new)
│   └── deleteAccount.ts         # the deletion transaction (new)
├── auth/
│   ├── auth.ts                  # session.create.before nulls ipAddress/userAgent
│   ├── maskIp.ts                # (new)
│   └── sessionCache.ts          # reads terms_version with permissions
├── db/
│   ├── migrations/009-terms-and-privacy.ts   # (new) + index.ts
│   └── schema.ts                # two UserTable fields
├── email/templates.ts, mailer.ts             # M1, M2
├── polls/
│   ├── sweeps.ts                # retentionSweep, lock 11
│   └── store.ts                 # ever_voted set on every history insert, read by hasVoteHistory/pollsEverVoted
├── votes/consumer.ts            # skips queued votes from deleted accounts; sets ever_voted
├── routes/
│   ├── api.ts                   # create-account agreement, /api/me fields, DELETE /api/me, accept-terms, masked IPs
│   └── pages.ts                 # /privacy, /terms, /accept-terms
├── server.ts                    # mounts the gate
└── public/
    ├── privacy.html, terms.html, accept-terms.html, acceptTermsCard.js   # (new)
    ├── fonts/fonts.css, fonts/*.woff2, fonts/OFL-*.txt                   # (new; under fonts/ so the instance serves them, never the CDN)
    ├── footer-m3.css, legal-m3.css                                       # (new)
    ├── app.js                   # footer, banner link, terms-required redirect helper
    ├── createAccountCard.js, loginCard.js, profileCard.js                 # C3, C4, C6, C7
    ├── adminResults.js            # @deleted.invalid shown as "Deleted user" (C9)
    └── *.html                   # font links replaced; footer sheet added
tests/                           # new: legal-pages, terms-gate, accept-terms, account-deletion, retention-sweep,
                                 # privacy-minimization, cookie-use-list, no-third-party, client-footer,
                                 # client-terms-box, client-delete-account; updated: m3-assets, openapi-contract
postman/openapi.json
```

**Structure Decision**: the existing single project. A new `src/legal/` folder holds the three modules that exist only
for this feature, so the policy's mechanics are in one place; everything else is an edit beside the code it changes.

## Complexity Tracking

No violations to justify.
