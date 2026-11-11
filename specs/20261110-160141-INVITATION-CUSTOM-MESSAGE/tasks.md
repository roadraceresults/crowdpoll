---

description: "Task list for the Invitation Custom Message"
---

# Tasks: Invitation Custom Message

**Input**: Design documents from `specs/20261110-160141-INVITATION-CUSTOM-MESSAGE/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui-contracts.md, quickstart.md

**Tests**: Included. Constitution Principle IV and research R9 require every FR to be covered by a server or client test.

**Organization**: Tasks are grouped by user story so each story can be built and checked on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: the column and its types.

- [X] T001 Create src/db/migrations/020-invitation-message.ts: `up` runs `alter table "polls" add column "invitation_message" text not null default ''`; `down` drops it; the generated `search` column is not touched (research R1; data-model.md)
- [X] T002 Register `"020-invitation-message": invitationMessage` in src/db/migrations/index.ts after `019-device-events`
- [X] T003 [P] Add `invitation_message: Generated<string>;` to `PollTable` after `notes`, and `invitationMessage?: string;` to `PendingUpdateJson`, in src/db/schema.ts

---

## Phase 2: Foundational (blocks every story)

**Purpose**: the field travels through the poll aggregate, validation and the admin detail.

- [X] T004 In src/polls/store.ts: add `invitationMessage: string;` to `Poll` after `notes` and `invitationMessage?: string;` to `PendingUpdate`; map it in `rowToPoll` (`row.invitation_message`), in the row writer beside `notes` (~line 512) and in `FIELD_TO_COLUMN` (`invitationMessage: "invitation_message"`); add `"invitationMessage"` to `NON_CONTENT_FIELDS` (research R1, R2)
- [X] T005 [P] Export `INVITATION_MESSAGE_MAX = 1000` beside `NOTES_MAX` in src/polls/notes.ts (research R3)
- [X] T006 In src/polls/service.ts: import `INVITATION_MESSAGE_MAX`; in `validatePollFields` after the notes block add `if (body.invitationMessage !== undefined) $set.invitationMessage = normalizeNotes(validateFieldLength(body.invitationMessage, INVITATION_MESSAGE_MAX, "Custom email message"));`; add it to `LIMITS`; set `invitationMessage: ""` in the new-poll defaults (~line 102) (research R3; contracts/api.md A1)
- [X] T007 In src/routes/pollsApi.ts: add `"invitationMessage"` to `UPDATE_FIELDS`; in `buildAdminPollDetail` add `invitationMessageHtml: renderNotesHtml(rest.invitationMessage)` after `notesHtml` (research R2; contracts/api.md A2)
- [X] T008 Run `npx tsc --noEmit` and fix every place the widened `Poll` type requires the new field (test fixtures and builders included)

**Checkpoint**: a save with `invitationMessage` stores it; the admin detail returns it.

---

## Phase 3: User Story 1 — Write a message that invitees receive (Priority: P1) 🎯 MVP

**Goal**: an Only people you invite poll's message appears in a box in every invitation and reminder.

**Independent Test**: quickstart steps 1, 2, 5, 6, 7 and 11.

### Tests for User Story 1

- [X] T009 [P] [US1] In tests/email-layout.test.ts: `layout` with `messageBox` draws its HTML unescaped in one `div` directly after the first paragraph and before the second, with `border-radius:8px` and `overflow-wrap:anywhere`, and puts its text as its own paragraph after the first in `text`; without `messageBox` the output is unchanged (contracts/ui-contracts.md C4)
- [X] T010 [P] [US1] In tests/invitation-email.test.ts: a poll with message `"Hi **all**\n<b>x</b>"` produces HTML containing `Hi <strong>all</strong><br>&lt;b&gt;x&lt;/b&gt;` after the "invited you to vote" paragraph and text containing `Hi all\n<b>x</b>`; the reminder (`sendReminder`) carries it too; a poll with `""` produces an email identical to the one before the feature; a message changed after a send is used by the next send; with `config.nativeSignin` false the invitation (button linking to the poll) carries the box too; a lone `**` in the message arrives as the literal `**`; the box's style keeps `overflow-wrap:anywhere` (FR-006–FR-009, SC-002; spec Edge Cases)
- [X] T011 [P] [US1] In tests/field-limits.test.ts: publish and save accept 1000 characters, refuse 1001 with `400 "Custom email message must be at most 1000 characters."`, refuse a non-string, and store `"  \n ** ** "` as `""` (a lone `**` is literal text, so it is not blank) (FR-004, FR-005)
- [X] T012 [P] [US1] In tests/client-notes-editor.test.ts: `NotesEditor.open(host, { max: 1000, label: "Custom Email Message" })` shows heading and `aria-label` "Custom Email Message", counter `n / 1000`, Done `aria-disabled="true"` at 1001; with no options it keeps "Notes" and 6000 (contracts/ui-contracts.md C3)
- [X] T013 [P] [US1] In tests/client-admin-wizard.test.ts: Step 1 with "Only people you invite" shows the Custom Email Message field (id `pollInvitationMessage-<pid>`) directly under the "Only people you invite" row inside the radio group, with a divider between the option sections, with the support text and `0 / 1000`; with the other two answers it is absent; editing and Done updates the preview and the counter; Save sends `invitationMessage` (FR-001–FR-003)

### Implementation for User Story 1

- [X] T014 [P] [US1] In src/email/templates.ts: add `messageBox?: { html: string; text: string }` to `LayoutInput`; in `layout` insert it after `paragraphs[0]` in both `text` (as its own part) and `html` (a `div` with `margin:0 0 16px;padding:12px 16px;background:#F1F3EC;border-radius:8px;font-family:${FONT};font-size:16px;line-height:1.5;color:${TEXT};overflow-wrap:anywhere;`); add `personalMessage?: { html: string; text: string }` to `InvitationInput` and pass it to `layout` as `messageBox` (research R5)
- [X] T015 [US1] In src/invitations/sender.ts: select `p.invitation_message` in `buildInvitation`; import `renderNotesHtml`, `notesPlainText` from ../polls/notes.js; pass `personalMessage: message ? { html: renderNotesHtml(message), text: notesPlainText(message) } : undefined` to `invitationMessage` (research R5, R6)
- [X] T016 [P] [US1] In src/public/notesEditor.js: `open(host, options)` reads `const max = options.max ?? NOTES_MAX` and `const label = options.label ?? "Notes"`; use `label` for the heading, the section's `aria-label` (`label + " editor"`) and the text box's `aria-label`, and `max` in `overLimit` and `refresh` (contracts/ui-contracts.md C3)
- [X] T017 [US1] In src/public/adminCard.js: generalize `m3NotesField` into `m3RichTextField({ key, htmlKey, idPrefix, label, support, max, editLabel })` that reads and writes `wizard[key]` / `wizard[htmlKey]` and keeps its editor handle in a map by key; `m3NotesField()` becomes a call to it with today's values, behaviour unchanged (research R7)
- [X] T018 [US1] In src/public/adminCard.js: add `invitationMessage` / `invitationMessageHtml` to `storedNotes()` (from `session.poll`), `openWizardState`, `keepWizardProgress`, `wizardBase`'s sources and the new-poll defaults; `wizardFields` always sets `fields.invitationMessage = s.invitationMessage`; `wizardDirty` compares it; `commitNotes()` commits every open rich-text editor and `changed()` checks every one (research R7; data-model.md)
- [X] T019 [US1] In src/public/adminCard.js `buildStep1`: when `wizard.who === "invite"`, append `m3RichTextField({ key: "invitationMessage", htmlKey: "invitationMessageHtml", idPrefix: "pollInvitationMessage-", label: "Custom Email Message", support: "Optional. Added to the invitation email we send to the people you invite.", max: 1000, editLabel: "Edit custom email message" })` inside the radio group directly after the "Only people you invite" row, and a `div.wizard-who-divider` before every option row but the first (contracts/ui-contracts.md C1; TWEAK01)
- [X] T020 [US1] Run `npx vitest run tests/email-layout.test.ts tests/invitation-email.test.ts tests/field-limits.test.ts tests/client-notes-editor.test.ts tests/client-admin-wizard.test.ts tests/poll-notes.test.ts tests/client-poll-notes.test.ts` and fix failures

**Checkpoint**: US1 independently works — quickstart steps 1, 2, 5, 6, 7, 11.

---

## Phase 4: User Story 2 — The Settings Summary says a message is set (Priority: P2)

**Goal**: one summary line that links to the field.

**Independent Test**: quickstart step 3.

### Tests for User Story 2

- [X] T021 [P] [US2] In tests/client-admin-wizard.test.ts: with "Only people you invite" and a non-blank message, `p.wizard-summary-invitation-message` follows `p.wizard-summary-who` with the text `A Custom Invitation Email Message has been entered`; activating it (click and Enter) opens Step 1 and focuses `#pollInvitationMessage-<pid>`; it is absent for a blank message (`"** **"`) and for the other two answers (FR-011)

### Implementation for User Story 2

- [X] T022 [US2] In src/public/adminCard.js `buildSummary`: after `who1`, when `who === "invite"` and the message's visible text is not blank, append a `wizard-summary-invitation-message` line holding the sentence "A Custom Invitation Email Message has been entered": while Step 1 is not answered, `plainPart(text)`; once it is, `tappablePart(text, "Custom Email Message: change in Step 1", onActivate)` with an `onActivate` that awaits `goToStep(1)` and then focuses `#pollInvitationMessage-<pid>` (leave `summaryPart` unchanged); add `invitation-message` to the class list in `refreshSummaryLine`'s `nextClass` pattern (contracts/ui-contracts.md C2)
- [X] T023 [US2] Run `npx vitest run tests/client-admin-wizard.test.ts` and fix failures

**Checkpoint**: US2 works on top of US1.

---

## Phase 5: User Story 3 — Kept, limited and reviewed like the notes (Priority: P2)

**Goal**: the message survives a sharing switch, is screened, and waits in `pending_update` on an ever-voted poll.

**Independent Test**: quickstart steps 4, 8 and 9.

### Tests for User Story 3

- [X] T024 [P] [US3] In tests/polls-screening.test.ts: a poll whose only offending text is its custom email message is `REJECTED`, its reason `… Please revise the title, subtitle, notes, custom email message and choices.`; a poll without a message keeps today's wording (FR-012)
- [X] T025 [P] [US3] In tests/polls-pending-update.test.ts: an UPDATE save of an ever-voted published poll that changes only the message answers `pending: true`, leaves `polls.invitation_message` unchanged and stores `pending_update.invitationMessage`; an invitation sent before the sweep carries the old message; after `applyPendingUpdate` it carries the new one; an offending pending message is rejected (FR-013)
- [X] T026 [P] [US3] In tests/client-admin-wizard.test.ts: switching to "Anyone you send the link to" hides the field and Save still sends the kept `invitationMessage`; switching back shows it; in UPDATE mode a changed message shows the "Saving sends your poll to be reviewed again." note (FR-010)

### Implementation for User Story 3

- [X] T027 [P] [US3] In src/polls/screening.ts: add `invitationMessage: string` to `ScreeningInput`; `localScreener` joins it with the other text and, when it is not empty, words the verdict `Please revise the title, subtitle, notes, custom email message and choices.` (research R4)
- [X] T028 [US3] In src/polls/sweeps.ts: pass `invitationMessage: notesPlainText(claimed.invitationMessage)` at the publish screening (~line 215) and `notesPlainText(pending.invitationMessage ?? claimed.invitationMessage)` at `screenPendingUpdate` (~line 279); in src/routes/pollsApi.ts pass `invitationMessage: ""` to the choice-only screen (~line 256)
- [X] T029 [US3] In src/routes/pollsApi.ts UPDATE save (~line 714): widen the `pending` type and move a changed `$set.invitationMessage` into `pending.invitationMessage` as for notes; in src/polls/store.ts `applyPendingUpdate` (~line 808) write `columns.invitation_message = pending.invitationMessage` when defined (research R4)
- [X] T030 [US3] In src/public/adminCard.js `reviewNeeded`: add `"invitationMessage"` to the compared names (research R4)
- [X] T031 [US3] Run `npx vitest run tests/polls-screening.test.ts tests/polls-pending-update.test.ts tests/client-admin-wizard.test.ts` and fix failures

**Checkpoint**: US3 works; no message reaches an inbox unreviewed.

---

## Phase 6: User Story 4 — The message stays private to the creator (Priority: P3)

**Goal**: voters never receive it; Duplicate copies it.

**Independent Test**: quickstart step 10.

### Tests for User Story 4

- [X] T032 [P] [US4] In tests/polls-discovery.test.ts: for a poll with a message, no card, tab, delta, admin list, `/poll/:pid`, `export.json` or `export.md` response contains the message's text or an `invitationMessage` key; the admin detail for the creator contains `invitationMessage` and `invitationMessageHtml`; at the store level, `updatePoll(store, pid, { invitationMessage })` with no other field leaves `content_version` unchanged (FR-014, FR-015, SC-005)
- [X] T033 [P] [US4] In tests/polls-admin-crud.test.ts: `POST /api/admin/polls/:pid/duplicate` copies `invitationMessage` (FR-016)

### Implementation for User Story 4

- [X] T034 [US4] In src/polls/service.ts `duplicatePoll`: copy `invitationMessage: source.invitationMessage` (research R8)
- [X] T035 [US4] Confirm `exportPollData` / `exportPollMarkdown` in src/polls/service.ts and the admin list rows in src/routes/pollsApi.ts (~883–915) pick fields explicitly and so omit the message; run `npx vitest run tests/polls-discovery.test.ts tests/polls-admin-crud.test.ts` and fix failures

**Checkpoint**: all four stories work.

---

## Phase 7: Polish & Documentation

- [X] T036 [P] Add `invitationMessage` (request, ≤ 1000) to the publish and save request schemas and `invitationMessage`, `invitationMessageHtml` and `pendingUpdate.invitationMessage` to the admin poll detail schema in postman/openapi.json, worded as contracts/api.md; run `npx vitest run tests/openapi-contract.test.ts`
- [X] T037 [P] Add a migration test for `020-invitation-message` (up adds the column with `''` for existing polls; down removes it) following the existing `tests/migration-*.test.ts` pattern
- [X] T038 [P] README.md "Inviting people": describe the Custom Email Message (Step 1, up to 1000 characters, bold/italic/underline, shown in every invitation and reminder, reviewed like the notes, kept when the poll's sharing changes)
- [X] T039 [P] ARCHITECTURE.md: the invitation email's optional message box, rendered by `src/polls/notes.ts` from the approved `polls.invitation_message`; the new column in the polls entity diagram
- [X] T040 [P] CLAUDE_COMPLETE.md: the feature's decisions (admin-only, reviewed like notes, `renderNotesHtml` only, kept when hidden, limit counts markup)
- [X] T041 [P] CLAUDE.md "Cross-feature invariants": extend the notes-HTML line so `invitationMessageHtml` (also rendered by `renderNotesHtml`) joins `notesPreviewHtml` and `notesHtml` among the values the browser may assign to `innerHTML`
- [X] T043 [US2] TWEAK02: `adminListRow` in src/routes/pollsApi.ts adds `hasInvitationMessage`; `readOnlyAnswers` in src/public/adminCard.js passes it so the read-only card shows the summary line; the line ends with a period after its summary part; openapi `AdminPollSummary` documents the boolean
- [X] T044 TWEAK03: `ENV_INVITATION_RESEND_WAIT` (ms, default 86400000) in src/config.ts, passed to `resendBlockedReason` in src/invitations/invitations.ts, which words its reason from it; rows in .claude/rules/environment.md, README.md and CLAUDE_COMPLETE.md; the two `.example` launch templates; tests in tests/config.test.ts and tests/invitations-store.test.ts
- [X] T045 TWEAK04: in src/email/templates.ts `invitationMessage`, drop "That's why we're writing to you." from the first paragraph and word the sign-in line "… Do not forward this email."; tests/invitation-email.test.ts follows
- [X] T042 Run `npx tsc --noEmit` and `npm test`; walk quickstart.md manual steps 1–11; then send one invitation with a message to Gmail on the web, Gmail and Apple Mail on a phone, and Outlook, and check the box, its wrapping and that nothing scrolls sideways at 600 px or phone width (SC-006) — Done 2026-11-10: `tsc` clean; `npm test` 175 files / 2782 tests passed (22 skipped); quickstart steps 1–11 passed (developer); the message box checked in Gmail only — Gmail and Apple Mail on a phone and Outlook not yet checked

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → stories. US1 first (MVP). US2 needs US1's field (T019). US3 needs Phase 2 only, but its client
  test (T026) needs T019. US4 needs Phase 2 only. Phase 7 after the stories it documents.
- Within a story: tests first (they fail), then implementation, then the run task.

## Parallel Opportunities

- Phase 1: T003 beside T001–T002.
- Phase 2: T005 beside T004.
- US1: T009–T013 together; T014 and T016 together, then T015, T017 → T018 → T019.
- US3: T024–T026 together; T027 beside T029–T030.
- US4: T032 and T033 together.
- Phase 7: T036–T041 together.

## Implementation Strategy

1. **MVP**: Phases 1–3. Creators can write a message and invitees receive it.
2. Add US3 before release. Without it, a message would be mailed without screening, so US1 alone should not ship to
   production.
3. Add US2 and US4, then Phase 7.
