# Implementation Plan: Single-Email Invitation

**Branch**: `dev` (no dedicated branch) | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261027-133129-SINGLE-EMAIL-INVITE/spec.md`

## Summary

An invitee reaches an Invitation Only poll from the invitation email alone.
Each invitation and reminder carries `/invite?PID=<pid>&token=<token>`, a personal token stored only as a hash on its `poll_invitations` row, newest only, used once, until the poll ends or 30 days.
Opening the link shows a confirmation card and changes nothing (safe from mail scanners), except for a browser already signed in as the invited address, which goes straight to the poll.
Continue creates the account if needed (Terms box), then signs in by minting a BetterAuth magic-link token on the server and consuming it through the existing `completeSignIn`, so the address is confirmed and every session hook runs as for an emailed link.
Any token that cannot sign in falls back to today's `/?PID=` link.
A landed poll is maximized whether or not its tab already held it.
Research R1–R11.

## Technical Context

**Language/Version**: TypeScript 5 on Node.js 22 (ES modules); browser scripts in plain JavaScript.

**Primary Dependencies**: Express 5, BetterAuth 1.6.26 (`magicLink` plugin, `auth.api.signInMagicLink` / `magicLinkVerify`), Kysely on `pg`, nodemailer (SES); no new dependency.

**Storage**: PostgreSQL. One additive migration, `011-invitation-tokens`: three nullable columns and a unique partial index on `poll_invitations` (`data-model.md`).

**Testing**: Vitest + supertest on embedded PostgreSQL; jsdom for the card and `tabs.js`.

**Target Platform**: DigitalOcean App Platform (unchanged); development on Windows 11.

**Project Type**: Web service with server-rendered static pages and browser scripts.

**Performance Goals**: no new hot path; one indexed lookup per link open, one transaction per Continue.

**Constraints**: no token in logs or storage; no new cookie or storage key; `oauth` mode unchanged; every other email unchanged.

**Scale/Scope**: invitations are bounded by `ENV_MAX_INVITATIONS_PER_DAY` per creator; one token row per invitation.

## Constitution Check

| Principle | Check |
|---|---|
| I. Think Before Coding | Every behaviour traced to a resolved finding or clarification; assumptions in `spec.md`. ✅ |
| II. Simplicity First | Three columns, no table; sign-in reuses `completeSignIn` and BetterAuth's own verification (R5) instead of a second session path. ✅ |
| III. Surgical Changes | `sender.ts` (per-recipient render), `templates.ts` (one optional field), `auth.ts` (mint branch in `sendMagicLink`, one rate-limit key), `api.ts` (`mintLoginToken`, two routes), `pages.ts` (one route), `termsGate.ts` (allowlists), `tabs.js` (one call); new `tokens.ts`, `invite.html`, `inviteCard.js`. ✅ |
| IV. Goal-Driven Execution | Each FR has a test named in `tasks.md`; quickstart steps 1–7 check SC-001–SC-006. ✅ |
| V. Code Quality | Server logs `[invite]` lines with masked addresses; browser logs nothing beyond errors. ✅ |
| VI. Self-Documenting Code | No comments citing finding ids; names carry the meaning. ✅ |
| Security & Privacy | Token hashed, single-use, expiring, bound to one address, `Origin`-checked, rate-limited; allowlist applies; Privacy Policy sentence (R11). ✅ |

Post-design re-check: unchanged, no violation.

## Project Structure

### Documentation (this feature)

```text
specs/20261027-133129-SINGLE-EMAIL-INVITE/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R11
├── data-model.md        # three poll_invitations columns, token life
├── quickstart.md
├── contracts/
│   ├── api.md           # A1 GET /invite, A2 link-info, A3 redeem
│   └── ui-contracts.md  # C1 the card, C2 landing maximized, M1 the email sentence
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── db/migrations/011-invitation-tokens.ts   # new
├── db/migrations/index.ts                    # registers 011
├── db/schema.ts                              # PollInvitationTable + 3 fields
├── invitations/tokens.ts                     # new: issue, look up, use up
├── invitations/sender.ts                     # token per recipient, link, signInAddress
├── email/templates.ts                        # invitationMessage: optional signInAddress
├── auth/auth.ts                              # sendMagicLink mint branch; RATE_LIMITED.redeemInvitation
├── routes/api.ts                             # mintLoginToken; A2, A3
├── routes/pages.ts                           # A1 GET /invite
├── legal/termsGate.ts                        # /invite page route; A2, A3 allowed
└── public/
    ├── invite.html, inviteCard.js            # new: C1
    ├── tabs.js                               # C2
    └── privacy.html                          # one sentence (R11)
devScripts/render-invitation-email.ts         # sample signInAddress
devScripts/build-assets.ts                    # invite page assets (if pages are listed)
postman/openapi.json                          # A2, A3
tests/
├── invitation-tokens.test.ts                 # new: issue, replace, expiry, use, removal
├── invitations-redeem.test.ts                # new: A1–A3
├── client-invite-card.test.ts                # new: C1
├── client-landing.test.ts                    # existing landing suite: C2
├── invitation-email.test.ts                  # M1 sentence, oauth absence
└── m3-assets.test.ts                         # invite.html sheets
```

**Structure Decision**: the existing single web service; no new top-level folder.

## Complexity Tracking

None: no constitution violation to justify.

Technical debt carried (requirements report §6): a second way into `completeSignIn` without the `signin_binding` cookie, guarded by the card's `Origin`-checked POST; the token map in `auth.ts` is in-process and filled and emptied within one request.
