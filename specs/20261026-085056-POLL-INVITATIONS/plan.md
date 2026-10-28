# Implementation Plan: Poll Invitations

**Branch**: `dev` (no dedicated branch) | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261026-085056-POLL-INVITATIONS/spec.md`

## Summary

The creator of an Invitation Only poll gets an Invitees panel on its admin card: paste addresses, see each invitee's
status (`Not sent yet`, `Not delivered`, `Invited`, `Accepted`, `Voted`), remove one, or send one reminder.
Invitation emails, in the approved wording and with the poll's dates in the creator's time zone, go out once the
poll is open.
The approach (research R1–R16): state on the existing `poll_invitations` rows; matching by email key through
adoption of the account's address at sign-in, the poll link and the Shared With You tab; acceptance recorded where
the invitee is shown the poll; one route that never takes the edit session; an atomic claim shared by the route and a
5-second sweep, within a per-creator daily limit counted in an address-free table; a history row so an address added
back is not emailed again; the creator's time zone stored on the poll from the admin card's writes; one email
function on the existing layout, which gains an optional second heading line; a Privacy Policy paragraph.
The stand-alone admin card and the email draft already exist in the requirements folder; the production panel and
email follow them.

## Technical Context

**Language/Version**: TypeScript 5 on Node.js 22 (ES modules); browser scripts in plain JavaScript.

**Primary Dependencies**: Express 5, BetterAuth 1.6.26 (`databaseHooks.session.create.after`), Kysely on `pg`,
nodemailer with the SES transport, the built-in `Intl` for time zones; no new dependency.

**Storage**: PostgreSQL. One additive migration, `010-invitations`: five columns and an email-key index on
`poll_invitations`, `polls.time_zone`, and two new tables, `invitation_emails` and `invitation_history`
(data-model.md).

**Testing**: Vitest + supertest on embedded PostgreSQL; jsdom for the admin card; the mailer's `setTransport` stub
records messages; no network.

**Target Platform**: DigitalOcean App Platform at `https://crowdpoll.vote`; SES in `ca-central-1`.

**Project Type**: web service with server-rendered pages and vanilla-JS cards.

**Performance Goals**: an add of 100 addresses answers in one transaction; the sweep reads only OPEN polls with
pending invitations (`sent_at is null`).

**Constraints**: voting is never paused by an invitee change (FR-014); no invitation is emailed twice or before the
poll opens (SC-002); no address in logs (masked) or in the limit table; every other email's output unchanged by the
layout's new input; no new cookie or storage key.

**Scale/Scope**: at most the voter limit (100 by default) invitees per poll; 1 migration, 1 new module folder
(`src/invitations/`), changes to `store.ts` (`writeRoster`), `sweeps.ts`, `sharedLink.ts`, `tabsApi.ts`, `auth.ts`,
`deleteAccount.ts`, `pollsApi.ts`, `config.ts`, `templates.ts`, `mailer.ts`, `adminCard.js`, `admin-card-m3.css`,
`privacy.html`, `devScripts/render-invitation-email.ts`, `postman/openapi.json`, the launch templates and docs.

## Constitution Check

| Principle | Check | Status |
|---|---|---|
| I. Think before coding | The roster, vote, shared-link, sweep, mailer and layout code was read before designing (R1–R9); where the requirements left a case open (old invitations at migration, the panel before launch, a removed address added back) the decision is recorded (data-model, R13, R15) | Pass |
| II. Simplicity first | Columns on the existing table; adoption instead of key-matching at every reader (R2); one sweep instead of hooks on four paths into OPEN (R6); one email function; `Intl` for zones; no new dependency | Pass |
| III. Surgical changes | Existing readers stay exact-match; `writeRoster` changes only for invitations; `layout()`'s new input is optional and every other message is unchanged; the vote consumer is untouched | Pass |
| IV. Goal-driven | Each story's independent test is an automated suite (quickstart §1) plus the end-to-end walk (§3); SC-007 is checked by the email test and the redrawn draft | Pass |
| V. Code quality | Settings validated by `loadConfig`; masked logging; one module per concern (`invitations.ts`, `sender.ts`) | Pass |
| VI. Self-documenting code | No explanatory comments | Pass |
| Security & privacy | Owner-only routes (`404` otherwise); the allowlist honoured; no address stored for the limit; the history holds only an email key, deleted with the poll or the account; Privacy Policy updated; email content escaped | Pass |
| Documentation deliverables | README/ARCHITECTURE regenerated, `CLAUDE.md` env table and `openapi.json` updated in the final tasks phase | Pass (to carry into tasks) |

Post-design re-check: all pass; no Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/20261026-085056-POLL-INVITATIONS/
├── spec.md
├── plan.md                      # this file
├── research.md                  # R1–R16
├── data-model.md                # poll_invitations columns, polls.time_zone, invitation_history, invitation_emails, statuses, setting, sweep
├── quickstart.md
├── contracts/
│   ├── api.md                   # A1–A5
│   ├── ui-contracts.md          # C1–C9
│   └── email-messages.md        # M1–M2
└── checklists/requirements.md
```

### Source Code (repository root)

```text
requirements/20261026-085056-poll-invitations/   # done before this plan (R11, C1, C9)
├── admin-card.html, admin-card.css, admin-card.js, fonts/
└── invitation-email.html, email-logo.png

devScripts/
├── capture-admin-card.ts        # wrote the stand-alone card (done)
└── render-invitation-email.ts   # imports invitationMessage from templates.ts once it exists (C9)

src/
├── db/
│   ├── migrations/010-invitations.ts   # columns, index, polls.time_zone, invitation_emails, invitation_history, sent_at backfill
│   └── schema.ts                        # PollInvitationTable columns, PollTable.time_zone, InvitationEmailTable, InvitationHistoryTable
├── invitations/
│   ├── invitations.ts           # parse, add (with history), remove, resend, list with statuses, adopt, accept (R2–R5, R8, R10, R15, R16)
│   └── sender.ts                # claim and send, daily allowance (R6, R7)
├── polls/
│   ├── store.ts                 # writeRoster diff and history (R1, R15); time_zone mapping (R14)
│   ├── sweeps.ts                # SWEEP_LOCKS.invitations = 12, invitationSweep; retentionSweep prunes invitation_emails
│   └── sharedLink.ts            # adopt, then accept (R2, R3)
├── routes/
│   ├── pollsApi.ts              # A1, A2, A5; acceptedCount on admin rows (A3)
│   └── tabsApi.ts               # Shared With You: adopt, then accept
├── auth/auth.ts                 # session.create.after → adoptInvitations
├── legal/deleteAccount.ts       # invitations and history by email key (R10, R15)
├── email/
│   ├── templates.ts             # layout headingLine2, formatPollDate, invitationMessage (R9, R14, M1, M2)
│   └── mailer.ts                # "invitation" type, sendInvitation
├── config.ts                    # ENV_MAX_INVITATIONS_PER_DAY
└── public/
    ├── adminCard.js             # Invitees panel, add field, rows, chips, menus, Accepted Count, timeZone on writes (C2–C5, C8)
    ├── admin-card-m3.css        # panel rules (C6)
    └── privacy.html             # #invitations (C7)

tests/
├── invitations-api.test.ts
├── invitations-send.test.ts
├── invitation-email.test.ts
├── invitations-accept.test.ts
├── invitations-adopt.test.ts
├── invitations-store.test.ts
├── poll-time-zone.test.ts
├── migration-invitations.test.ts
└── client-admin-invitees.test.ts
```

**Structure Decision**: the existing single project; one new folder, `src/invitations/`, for the invitation rules
and the sender, beside `src/polls/` and `src/votes/`.

## Complexity Tracking

None.
