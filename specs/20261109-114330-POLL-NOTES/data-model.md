# Data Model: Poll Notes

One migration: `src/db/migrations/018-poll-notes.ts`, registered in `src/db/migrations/index.ts`, with types in
`src/db/schema.ts`.

## `polls` (existing)

| Column | Type | Change | Meaning |
|---|---|---|---|
| `notes` | `text` not null, default `''` | **new** | The notes in the stored format (research R1), at most 6000 UTF-16 units (R3); `''` when there are none |
| `search` | `tsvector`, generated, stored | **redefined** | As before, plus `setweight(to_tsvector('english', coalesce("notes", '')), 'D')` |
| `pending_update` | `jsonb` null | shape widens | `{ title?, subtitle?, notes?, choices? }` (R7) |

The migration:
1. Adds `notes`.
2. Drops `polls_home_search`, `polls_search` and `search`.
3. Re-adds `search` with the five parts.
4. Recreates both indexes as in `002-polls.ts`.

Every existing poll gets `''`, so its search terms are unchanged. `content_version` is not bumped and no outbox row is
written.

## TypeScript shapes

| Type | File | Change |
|---|---|---|
| `PollTable` / `PollRow` | `src/db/schema.ts` | `notes: Generated<string>` |
| `PendingUpdateJson` | `src/db/schema.ts` | `notes?: string` |
| `Poll` | `src/polls/store.ts` | `notes: string`; `rowToPoll`, `FIELD_TO_COLUMN`, `newRow` map it |
| `PendingUpdate` | `src/polls/store.ts` | `notes?: string`; `applyPendingUpdate` writes it |
| `PollProjection` | `src/polls/versions.ts` | `notesPreviewHtml: string`, `hasMoreNotes: boolean` |
| `ScreeningInput` | `src/polls/screening.ts` | `notes: string` (plain text) |
| `PollDocument` | `src/search/openSearch.ts` | `notes: string` (plain text) |
| `LIMITS` | `src/polls/service.ts` | gains `NOTES_MAX` |

`notes` is not added to `NON_CONTENT_FIELDS`, so a change bumps `content_version` and queues the outbox, as for the
subtitle.

## Validation

| Rule | Where |
|---|---|
| A string, at most `NOTES_MAX` UTF-16 units, else `400` "Notes must be at most 6000 characters." | `validatePollFields`, through `validateFieldLength` |
| Whitespace-only plain text is stored as `''` | `normalizeNotes`, in `validatePollFields` |
| Any characters are accepted; the format cannot be invalid (R1) | — |

## Derived values (not stored)

| Value | Made by | Carried in |
|---|---|---|
| `notesPreviewHtml`, `hasMoreNotes` | `renderNotesPreview` in `projectPoll`, once per content version | every projection |
| `notesHtml` | `renderNotesHtml` | one-card routes, admin payloads, the `/poll/:pid` page |
| plain text | `notesPlainText` | screening, OpenSearch |

## Lifecycle

Notes follow the subtitle in every state:

| Situation | Result |
|---|---|
| Draft or EDIT mode | Written by save or publish |
| UPDATE mode | A change waits in `pending_update` until screened, then applied |
| Duplicate | Copied |
| Delete | Removed with the row |
