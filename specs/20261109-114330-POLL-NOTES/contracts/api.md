# HTTP Contracts: Poll Notes

No new route, and no new entry in the Terms gate. `postman/openapi.json` follows every change below.

## A1. The card (`Card` / `PollContent` schemas: every listing, search, Trending and Newest cards, Live, deltas)

| Field | Type | Meaning |
|---|---|---|
| `notesPreviewHtml` | string | The start of the rendered notes (research R2), `""` when there are none |
| `hasMoreNotes` | boolean | The preview stops before the end of the notes |

A projection cached before the release lacks both. The pages treat that as no notes until the poll's next content
version, or until the cached projection expires.

## A2. One card: `GET /api/polls/:pid/card` and `GET /api/me/polls/:pid`

`poll` is the A1 card plus `notesHtml` (string, the whole rendered notes, `""` when there are none). Access and the
`404` are unchanged.

## A3. Admin

| Route | Change |
|---|---|
| `GET` admin detail (every response built by `buildAdminPollDetail`) | gains `notes` (stored) and `notesHtml`; `pendingUpdate` may hold `notes` |
| Admin list rows (`adminListRow`) | gain `notesPreviewHtml` and `hasMoreNotes`; no `notes` (FR-021) |
| `POST /api/admin/polls/:pid/save` and `/publish` | accept `notes` (string); more than 6000 UTF-16 units → `400` "Notes must be at most 6000 characters."; a non-string → `400` as for other fields |
| `/publish` in UPDATE mode | a changed `notes` joins the pending update, as `subtitle` does |
| `POST /api/admin/polls/:pid/duplicate` | the copy has the source's `notes` |
| `GET /api/admin/polls/:pid/results` | unchanged (notes are not shown on the results page) |

## A4. Exports

| Route | Change |
|---|---|
| `GET …/export.json` | gains `notes`, as stored, after `subtitle` |
| `GET …/export.md` | after the subtitle paragraph, the notes as stored and a blank line; nothing when `notes` is `""` |

## A5. Screening

A rejection's reason reads "…unacceptable language (n terms). Please revise the title, subtitle, notes and choices."
It applies to a first publish and to a pending update.

## A6. Search

`POST /api/search`: a word found only in the notes finds the poll, ranked below matches in the title, subtitle and
choices, in both back ends.

## A7. `GET /poll/:pid`

The `#poll-summary` article gains `<div class="poll-notes">` holding `notesHtml`, after the subtitle. It is left out when
`notes` is `""`. The meta description, `og:description` and JSON-LD are unchanged.
