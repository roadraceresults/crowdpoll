# Implementation Plan: Invitation Custom Message

**Branch**: `20261110-160141-INVITATION-CUSTOM-MESSAGE` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/20261110-160141-INVITATION-CUSTOM-MESSAGE/spec.md`

## Summary

An Only people you invite poll gets an optional **Custom Email Message**, edited in the wizard's Step 1 with the Notes
editor (limit 1000) and shown in a grey box after the first paragraph of every invitation and reminder. It is stored in
a new `polls.invitation_message` column (R1). Only the creator and administrators can see it, and it is in
`NON_CONTENT_FIELDS` (R2). It is validated like the notes (R3) and screened and held in `pending_update` like the notes
(R4). It is rendered for email only through `src/polls/notes.ts` (R5) and read at send time (R6). The Notes editor gains
`max` and `label` options, and the Notes field builder is generalized for both fields (R7). Duplicate copies the
message (R8). One migration and one setting, `ENV_INVITATION_RESEND_WAIT` (TWEAK03); no new route, cookie, storage key, stylesheet or dependency.

## Technical Context

**Language/Version**: TypeScript on Node.js ≥ 22 (ESM); browser: vanilla ES2020 in `src/public/`

**Primary Dependencies**: none new (Express 5, Kysely, nodemailer)

**Storage**: PostgreSQL `polls.invitation_message` (migration `020-invitation-message`); `pending_update` jsonb gains a key

**Testing**: Vitest + supertest + embedded-postgres; jsdom client tests via `tests/helpers/browser.ts` (R9)

**Target Platform**: the `web` service on DigitalOcean App Platform; email through Amazon SES; evergreen browsers and the
major email clients

**Project Type**: single project (web service with static front end)

**Performance Goals**: no extra query per send (one more column in `buildInvitation`'s existing select); no change to
voter-facing caches

**Constraints**: the message never reaches a voter's browser (SC-005); it reaches HTML only through `renderNotesHtml`;
emails without a message are unchanged (SC-002)

**Scale/Scope**: new `src/db/migrations/020-invitation-message.ts`; changed `src/db/schema.ts`,
`src/db/migrations/index.ts`, `src/polls/store.ts`, `src/polls/notes.ts`, `src/polls/service.ts`,
`src/polls/screening.ts`, `src/polls/sweeps.ts`, `src/routes/pollsApi.ts`, `src/invitations/sender.ts`,
`src/email/templates.ts`, `src/public/notesEditor.js`, `src/public/adminCard.js`, `postman/openapi.json`, tests,
`README.md`, `ARCHITECTURE.md`, `CLAUDE_COMPLETE.md`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Think Before Coding**: PASS. Nine requirements findings are resolved and clarify found nothing open. The case of
  a hidden message changing without review is settled in the spec's Edge Cases (R4).
- **II. Simplicity First**: PASS. One column. The notes' validation, screening, pending and rendering paths are reused.
  The editor gets two options rather than a copy.
- **III. Surgical Changes**: PASS. Each change is one more field threaded through an existing path. `m3NotesField` is
  generalized only because the new field needs the same builder (R7).
- **IV. Goal-Driven Execution**: PASS. Every FR maps to a test in R9 or a quickstart step.
- **V. Code Quality & Maintainability**: PASS. Rendering stays in `notes.ts`, layout in `templates.ts` and data in
  `sender.ts`. A failed send is handled as today. No message text is logged (constitution: no sensitive data in logs).
- **VI. Self-Documenting Code**: PASS. The names are `invitationMessage`, `INVITATION_MESSAGE_MAX`, `messageBox` and
  `personalMessage`. The one pre-rendered HTML input is named so, with no explanatory comment needed.
- **Security, Privacy & Reliability**: PASS. Server-side length check, markup escaped, kept out of every voter payload
  and out of search, and screened before any send.
- **Documentation Deliverables**: README.md and ARCHITECTURE.md are updated in the task list's documentation phase.

**Post-Phase-1 re-check**: PASS. The design adds one column and one optional email block, and widens three existing
types (`Poll`, `PendingUpdate`, `ScreeningInput`).

## Project Structure

### Documentation (this feature)

```text
specs/20261110-160141-INVITATION-CUSTOM-MESSAGE/
├── plan.md              # This file
├── research.md          # R1–R9
├── data-model.md        # column, Poll field, PendingUpdate key, detail fields, email input
├── quickstart.md        # automated and manual checks
├── contracts/
│   ├── api.md           # A1–A4: save requests, admin detail, forbidden payloads, OpenAPI
│   └── ui-contracts.md  # C1–C4: Step 1 field, summary line, editor options, email box
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── db/
│   ├── migrations/020-invitation-message.ts   # new
│   ├── migrations/index.ts                    # register 020
│   └── schema.ts                              # PollTable.invitation_message, PendingUpdateJson.invitationMessage
├── polls/
│   ├── notes.ts          # INVITATION_MESSAGE_MAX
│   ├── store.ts          # Poll/PendingUpdate field, mapping, NON_CONTENT_FIELDS, pending apply
│   ├── service.ts        # validatePollFields, LIMITS, duplicatePoll
│   ├── screening.ts      # ScreeningInput.invitationMessage, verdict wording
│   └── sweeps.ts         # both screening calls
├── routes/pollsApi.ts    # UPDATE_FIELDS, pending, admin detail html, choice-only screen input
├── invitations/sender.ts # select + personalMessage
├── email/templates.ts    # InvitationInput.personalMessage, LayoutInput.messageBox
└── public/
    ├── notesEditor.js    # options.max, options.label
    └── adminCard.js      # wizard state, Step 1 field, summary line, save, dirty, review note
tests/                    # see research R9
```

**Structure Decision**: the existing single project. One migration is added; everything else extends existing modules.

## Complexity Tracking

No violations.
