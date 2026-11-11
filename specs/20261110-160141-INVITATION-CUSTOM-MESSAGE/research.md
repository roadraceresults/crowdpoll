# Research: Invitation Custom Message

Every decision below comes from reading the code paths the notes already use; nothing external was needed (no new
library, standard or service). Each item gives the decision, the reason and the alternatives considered.

## R1. One new poll column, beside `notes`

- **Decision**: migration `020-invitation-message` adds `polls.invitation_message text not null default ''`.
  `Poll.invitationMessage`, `PollTable.invitation_message`, `FIELD_TO_COLUMN.invitationMessage`, `rowToPoll` and the
  row writer (`store.ts` ~512) carry it. It is **not** added to the `search` tsvector.
- **Rationale**: the notes were added the same way (`018-poll-notes`); a column defaulting to `''` gives existing polls
  today's email (FR-017). Leaving it out of `search` keeps a private message out of full-text and OpenSearch results.
- **Alternatives**: a separate `poll_invitation_messages` table (an extra join on every send for one text value);
  storing it in `pending_update`-style JSON (no reason, it is a plain scalar).

## R2. Admin-only: never in a projection

- **Decision**: `invitationMessage` joins `NON_CONTENT_FIELDS`; `projectPoll` (`src/polls/versions.ts`), the admin list
  rows (`pollsApi.ts` ~883–915), `tabsApi.ts` and `seo.ts` are left unchanged, because each builds its fields one by
  one. `buildAdminPollDetail` spreads `...rest` of `Poll`, so the admin detail gains `invitationMessage` without a change;
  it gains `invitationMessageHtml: renderNotesHtml(rest.invitationMessage)` beside `notesHtml`, for the editor preview.
  The admin list rows gain only the boolean `hasInvitationMessage`, so the read-only card can show the summary line (TWEAK02).
- **Rationale**: FR-014/FR-015 — voters never receive it, and an edit to it alone must not bump `content_version` or
  refresh voters' copies. `polls-discovery.test.ts` already pins what card, tab and delta payloads carry; it gains the
  new field among the forbidden ones.
- **Alternatives**: a separate admin route for the message (one more request for the wizard, and the detail already
  holds the creator-only fields).

## R3. Validation: the notes' rules at 1000

- **Decision**: `INVITATION_MESSAGE_MAX = 1000` exported from `src/polls/notes.ts` beside `NOTES_MAX` and listed in
  `LIMITS` (`service.ts` 896); `validatePollFields` gains
  `$set.invitationMessage = normalizeNotes(validateFieldLength(body.invitationMessage, INVITATION_MESSAGE_MAX, "Custom email message"))`.
  `invitationMessage` joins `UPDATE_FIELDS` (`pollsApi.ts` 642), so an ever-voted poll can change it.
- **Rationale**: FR-003–FR-005: same markup, same counting (stored length, marks included), same blank rule, same
  "too long" message shape as every other field.
- **Alternatives**: counting visible characters (rejected in AM1).

## R4. Screening and review exactly as the notes

- **Decision**:
  - `ScreeningInput` gains `invitationMessage: string` (plain text). Both sweep call sites (`sweeps.ts` ~215 and ~279)
    pass `notesPlainText(…invitationMessage)`, the pending one `pending.invitationMessage ?? claimed.invitationMessage`;
    the one choice-only call in `pollsApi.ts` 256 passes `""`.
  - `localScreener` joins it with the other text; its verdict reads
    `Please revise the title, subtitle, notes, custom email message and choices.` when the message is not empty, and
    today's wording otherwise.
  - `PendingUpdate`/`PendingUpdateJson` gain `invitationMessage?: string`; the UPDATE save moves a changed message into
    `pending` as it does notes (`pollsApi.ts` ~723); `applyPendingUpdate` (`store.ts` ~808) writes it.
  - The wizard's `reviewNeeded()` lists `invitationMessage` with title, subtitle, notes and labels.
- **Rationale**: NC1 A / FR-012–FR-013. Emails read `polls.invitation_message`, the approved column, so a message
  waiting in `pending_update` is never mailed (US3-5). Because the field is hidden unless the poll is Only people you
  invite, a kept message can only change while visible, and every change is screened (spec Edge Cases).
- **Alternatives**: screen on save and apply at once (NC1 B); a separate screener call (two review rules).

## R5. The email: a box after the first paragraph, rendered by `notes.ts`

- **Decision**:
  - `buildInvitation` (`src/invitations/sender.ts`) selects `p.invitation_message` and, when non-empty, passes
    `personalMessage: { html: renderNotesHtml(m), text: notesPlainText(m) }` to `invitationMessage`.
  - `LayoutInput` gains an optional `messageBox?: { html: string; text: string }`, drawn after the first paragraph: in
    HTML as one `<div>` with inline styles (background `#F1F3EC`, `border-radius:8px`, `padding:12px 16px`,
    `margin:0 0 16px`, the body font at 16 px / 1.5, `overflow-wrap:anywhere`); in text as its own paragraph.
  - The HTML is the one value in `layout` that is not escaped there, so its name says it is pre-rendered, and only
    `sender.ts` builds it, from `renderNotesHtml`.
- **Rationale**: FR-006–FR-008, UA2; CLAUDE.md: notes reach HTML only through `src/polls/notes.ts`. A `<div>` with
  inline styles renders in every major client inside the existing 600 px table; `overflow-wrap` keeps long words from
  widening it (SC-006). The plain text drops the marks (`notesPlainText`).
- **Alternatives**: rendering inside `templates.ts` (would import poll code into the email layer); a nested table
  for the box (only needed for Outlook's rounded corners, which degrade to square corners harmlessly).

## R6. Sent as it stands at send time

- **Decision**: no change to when or how often emails go out; `sendPendingInvitations` and `sendReminder` both call
  `buildInvitation`, which reads the row at send time.
- **Rationale**: UA1 / FR-009 — later sends carry the current approved message; sent mail is never revisited.

## R7. The editor: the Notes editor, parameterized

- **Decision**: `NotesEditor.open(host, options)` gains `options.max` (default `NOTES_MAX`) and `options.label`
  (default `"Notes"`) for its heading, its `aria-label`s and its counter. `adminCard.js`:
  - wizard state gains `invitationMessage` and `invitationMessageHtml` (from the detail, saved progress and
    `wizardFields`, which always sends `invitationMessage`, whatever the Who answer — AM2 B keeps it);
  - `buildStep1` appends `m3InvitationMessageField()` inside the radio group under the "Only people you invite" row, only when
    `wizard.who === "invite"`; it is `m3NotesField` generalized: `m3RichTextField({ key, label, support, max, … })`
    serves both, so there is no copy;
  - a second editor handle; `commitNotes()` commits whichever editor is open; `wizardDirty()` compares
    `invitationMessage` and asks the open editor's `changed()`;
  - `buildSummary` adds the line after `who1` when `who === "invite"` and the plain text is not blank:
    `summaryPart("A Custom Invitation Email Message has been entered", 1, "invitationMessage")` followed by `"."`, whose activation goes to
    Step 1 and then focuses the field's "... edit" button.
- **Rationale**: FR-001–FR-003, FR-010, FR-011, with one editor and one field builder.
- **Alternatives**: a plain `<textarea>` (contradicts AM1); a copy of `m3NotesField` (two places to keep in step).

## R8. Duplicate

- **Decision**: `duplicatePoll` (`service.ts` ~1207) copies `invitationMessage`.
- **Rationale**: FR-016; it already copies notes and the invitee list.

## R9. Tests and documents

- **Server**: `field-limits.test.ts` (1000 vs 1001, blank → `''`, the browser copy of the limit), `poll-notes.test.ts`
  or a new `invitation-message.test.ts` (save, detail fields, not in card/tab/delta/SEO, no `content_version` bump,
  Duplicate), `polls-screening.test.ts` (rejected for an offending message; wording), `polls-pending-update.test.ts`
  (held, applied, email uses the approved one), `invitation-email.test.ts` and `email-layout.test.ts` (box after the
  first paragraph, escaping, text part, unchanged email without a message, reminder), `polls-discovery.test.ts`
  (forbidden field), `migration-*.test.ts` pattern for `020`.
- **Client**: `client-notes-editor.test.ts` (`max`, `label`), `client-admin-wizard.test.ts` (field shown only for
  invite, kept across a switch, counter, summary line and its link).
- **Documents**: `postman/openapi.json` (admin detail and save request), README "Inviting people", ARCHITECTURE.md
  (invitation email), CLAUDE_COMPLETE.md.
