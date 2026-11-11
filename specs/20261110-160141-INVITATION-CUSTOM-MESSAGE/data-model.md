# Data Model: Invitation Custom Message

## Migration `020-invitation-message`

| Table | Change | Notes |
|---|---|---|
| `polls` | add `invitation_message text not null default ''` | not part of the generated `search` column; `down` drops it |

No other table changes. `pending_update` (jsonb) gains an optional key, which needs no migration.

## Poll (existing aggregate, `src/polls/store.ts`)

| Field | Column | Type | Rules |
|---|---|---|---|
| `invitationMessage` | `invitation_message` | string | 0–1000 UTF-16 units of stored text, the notes' markup (`**`, `*`, `++`, `\` escapes, `\n`); text with no visible characters is stored as `''`; in `NON_CONTENT_FIELDS` |

- Kept whatever the poll's "Who can vote" answer; read for email only while the poll is `Private Poll` /
  `Invitation Only` (invitations are sent for no other poll).
- Copied by `duplicatePoll`.

## PendingUpdate (existing, `pending_update`)

| Key | Type | When present |
|---|---|---|
| `invitationMessage` | string | an UPDATE save of an ever-voted published poll changed the message |

Applied by `applyPendingUpdate` with the other keys; screened by `screenPendingUpdate` as the poll would read after the
apply.

## ScreeningInput (existing, `src/polls/screening.ts`)

| Field | Type | Value |
|---|---|---|
| `invitationMessage` | string | `notesPlainText(message)`; `""` for a choice-only screen |

## Admin poll detail (existing response)

| Field | Type | Notes |
|---|---|---|
| `invitationMessage` | string | stored text |
| `invitationMessageHtml` | string | `renderNotesHtml(invitationMessage)`: `strong`, `em`, `u`, `br` only |

Absent from: poll projections (`poll:<pid>`), card, tab, delta, admin list rows, SEO page.

## Invitation email (existing, `src/email/templates.ts`)

`InvitationInput.personalMessage?: { html: string; text: string }` → `LayoutInput.messageBox` (same shape), drawn after
`paragraphs[0]`. Absent when the stored message is `''`.

## Wizard state (browser, `adminCard.js`)

| Key | Source | Sent as |
|---|---|---|
| `invitationMessage` | detail / saved progress / editor Done | `invitationMessage` on every save and publish |
| `invitationMessageHtml` | detail / editor Done | not sent |

Field visibility: shown in Step 1 only while `who === "invite"`; the value survives switching answers.
