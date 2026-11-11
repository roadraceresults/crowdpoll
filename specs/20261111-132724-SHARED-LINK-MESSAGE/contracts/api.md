# API Contract: the Link Preview Message in the admin API

`postman/openapi.json` gains the entries below, each beside the matching `invitationMessage` entry.

## A1. `POST /api/admin/polls/:pid/save` and `POST /api/admin/polls/:pid/publish`

Body field `linkPreviewMessage` (optional, string): the Link Preview Message of an "Anyone you send the link to" poll,
in the notes' stored format (`**bold**`, `*italic*`, `++underline++`, a newline is a line break). Counted in UTF-16
units, marks included; a message with no visible text is stored as `""`.

- Over 100 characters, or not a string: `400` `Link preview message must be at most 100 characters.`
- Screened with the title, subtitle, notes and custom email message; the rejection sentence names
  "link preview message" when that field held the term.
- In UPDATE mode on a published, ever-voted poll a changed value waits in `pendingUpdate.linkPreviewMessage` until
  review; the response's `pending` is `true` as for the other text fields.
- Kept whatever the sharing mode; shown only in the link preview of an "Anyone you send the link to" poll.

## A2. `GET /api/admin/polls/:pid` (the admin poll detail)

- `linkPreviewMessage` (string): the stored text; `""` when none.
- `linkPreviewMessageHtml` (string): rendered as HTML: `strong`, `em`, `u` and `br` only; everything else escaped.
- `pendingUpdate.linkPreviewMessage` (string, optional): a changed message awaiting review.

Admin detail only: never in a projection, card, tab, delta, the `/poll` page or an export.

## A3. `GET /api/admin/polls` (the admin list)

Each row gains `hasLinkPreviewMessage` (boolean): whether the stored Link Preview Message is non-empty, for the
Settings Summary line; the text itself is not in the row.

## Unchanged

Every other route. `GET /api/me/polls/:pid`, the card, tab and delta payloads carry neither message.
