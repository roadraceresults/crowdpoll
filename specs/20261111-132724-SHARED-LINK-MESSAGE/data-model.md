# Data Model: Shared Link Message

One new column, one new optional key in `pending_update`, one new setting. Everything else is derived.

## `polls` (migration `021-link-preview-message`)

| Column | Type | Rule |
|---|---|---|
| `link_preview_message` | `text not null default ''` | the Link Preview Message in the notes' stored format (`**bold**`, `*italic*`, `++underline++`, `\n` line breaks); at most 100 UTF-16 units, marks included (`LINK_PREVIEW_MESSAGE_MAX`); a value with no visible text is stored as `''` (`normalizeNotes`); not a content field (`NON_CONTENT_FIELDS`) |
| `invitation_message` | unchanged | the Custom Email Message, at most 1000 |
| `pending_update.linkPreviewMessage` | optional string | a changed Link Preview Message of an ever-voted published poll, until the approval sweep writes it to the column |

Existing rows get `''`; nothing is copied from `invitation_message` (requirements NC1).

## `Poll` (`src/polls/store.ts`)

| Field | Column | Where it appears |
|---|---|---|
| `linkPreviewMessage: string` | `link_preview_message` | `rowToPoll`, `pollToRow`, `FIELD_TO_COLUMN`, `NON_CONTENT_FIELDS`, `PendingUpdate`, `duplicatePoll`, the new poll's defaults (`""`) |

The projection (`PollProjection`) does not carry it, as it does not carry `invitationMessage`: card, tab, delta and
SEO payloads are unchanged by construction.

## Admin API payloads (`src/routes/pollsApi.ts`)

| Payload | Field | Rule |
|---|---|---|
| save / publish body | `linkPreviewMessage` | optional string; `validateFieldLength(…, 100, "Link preview message")`, then `normalizeNotes`; in UPDATE mode on a published ever-voted poll, parked in `pending_update` when changed |
| admin poll detail | `linkPreviewMessage`, `linkPreviewMessageHtml` | the stored text and `renderNotesHtml` of it; creator or administrator only |
| admin poll detail | `pendingUpdate.linkPreviewMessage` | present while a change awaits review |
| admin list row | `hasLinkPreviewMessage: boolean` | `link_preview_message !== ""`, for the Settings Summary line |

## Derived preview values (`src/seo/loginPage.ts`)

| Value | Rule |
|---|---|
| `message` | `previewMessageOf(row)`: `""` when `poll_visibility === "Public Poll"`; `invitation_message` when `poll_sharing_mode === "Invitation Only"`; else `link_preview_message` — always the approved column |
| `description` | `oneLine(subtitle)` and `oneLine(notesPlainText(message))`, non-empty parts joined by `" - "`; `fallback` when both are empty; cut to `LINK_PREVIEW_DESCRIPTION_MAX = 300` with the ellipsis inside |
| `oneLine(text)` | `text.replace(/\s+/g, " ").trim()` |
| `fallback` | `config.defaultLinkPreviewMessage` |
| image | `${origin}/og-image.png`, `1200` × `630`, `image/png` (constants in `src/seo/pollPage.ts`) |

The public poll page's description (`describe()` in `pollPage.ts`) is unchanged: the subtitle, or
`Vote and see live results: ${title}`, cut at 160.

## Setting (`src/config.ts`)

| Variable | Default | Validation | Field |
|---|---|---|---|
| `ENV_DEFAULT_LINK_PREVIEW_MESSAGE` | `You have been invited to vote in this poll.` | trimmed; blank or over 300 characters → `ConfigError` naming the setting | `AppConfig.defaultLinkPreviewMessage` |

## Static file

| Path | Content |
|---|---|
| `src/public/og-image.png` | 1200 × 630 PNG, the favicon figures on white, under 300 KB; rendered by `devScripts/favicon-ico.ts`, committed, served by `express.static` at `/og-image.png` |

## States

Unchanged from the previous feature: the login page carries the poll's tags when `isOpenOrClosed(row)` holds (OPEN,
CLOSED, or EDITING from one of those), else the plain page. A pending change to the Link Preview Message is not shown
until approved.
