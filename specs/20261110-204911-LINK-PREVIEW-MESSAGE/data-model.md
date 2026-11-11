# Data Model: Link Preview Message

No schema change, no migration, no new type persisted. The feature reads existing columns and derives three values for
one page.

## The read set (`polls`, one row by `id`)

| Column | Used for | Note |
|---|---|---|
| `title` | `<title>`, `og:title`, the description fallback | through `projectPoll(row).title`, so an EDITING poll shows its published title |
| `subtitle` | the first part of the description | through `projectPoll(row).subtitle`; trimmed; may be empty |
| `invitation_message` | the second part of the description | the **approved** column, read directly from the row; `pending_update` is never read; notes markup, converted by `notesPlainText` |
| `poll_state`, `poll_state_before_edit_update` | the gate | `isOpenOrClosed(row)` (`src/polls/access.ts`): OPEN, CLOSED, or EDITING from one of those |
| `poll_visibility`, `poll_sharing_mode` | not consulted | public and private, both sharing modes, follow one rule (clarification Q2) |

Everything else of the row (choices, notes, counts, creator) is never placed on the page.

## Derived values (`src/seo/loginPage.ts`)

| Value | Rule | Limit |
|---|---|---|
| `title` | `${poll.title} · CrowdPoll` for `<title>`; `poll.title` for `og:title` | the poll's own title limit |
| `description` | `[subtitle, notesPlainText(message)]`, each trimmed, non-empty parts joined by `"\n\n"`; `Vote and see live results: ${title}` when both are empty | `LINK_PREVIEW_DESCRIPTION_MAX = 300`, ellipsis included (`slice(0, 299).trimEnd() + "…"`) |
| `url` | `${config.publicOrigin}/?PID=${pid}` (the shared link) | — |

All three are attribute-escaped by `escapeHtml` when written into the head.

## States

| Poll state | Login page with its PID |
|---|---|
| OPEN, CLOSED | rendered with the poll's tags |
| EDITING from OPEN or CLOSED | rendered, with the title and subtitle as published before the edit |
| draft, waiting to open, awaiting approval, rejected, archived, EDITING from any other | the plain page, `<title>Login</title>` |
| unknown or malformed PID, no PID | the plain page |

A pending change to the title, subtitle or message of an ever-voted poll (`pending_update`) is not shown until it is
approved and written to the columns.
