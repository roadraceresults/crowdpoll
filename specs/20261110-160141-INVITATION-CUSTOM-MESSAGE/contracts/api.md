# HTTP Contract: Invitation Custom Message

No new route. Three existing admin routes carry one new field; every other route is unchanged and must not carry it.

## A1. Requests that save the poll

`POST /api/admin/polls/:pid/publish` and `POST /api/admin/polls/:pid/save` accept:

| Body field | Type | Rules |
|---|---|---|
| `invitationMessage` | string, optional | ≤ 1000 UTF-16 units (stored text, markup included); blank text stored as `""`; allowed in UPDATE mode (`UPDATE_FIELDS`) |

- Over the limit → `400 { "error": "Custom email message must be at most 1000 characters." }` (the shape
  `validateFieldLength` gives every field).
- Not a string → `400`, as for `notes`.
- UPDATE mode on an ever-voted published poll: a changed value goes to `pendingUpdate.invitationMessage` and the response
  has `pending: true`; the stored `invitationMessage` is unchanged until approval.
- Otherwise the poll is re-screened as today (`AWAITING APPROVAL`); a rejection's `pollRejectionReason` names the
  custom email message when it is not empty.

## A2. Responses that describe the poll to its creator

`GET /api/admin/polls/:pid`, the `poll` of `POST /api/admin/polls/:pid/edit-session`, and the bodies of A1 add:

| Field | Type | Notes |
|---|---|---|
| `invitationMessage` | string | `""` when none |
| `invitationMessageHtml` | string | `strong`, `em`, `u`, `br` only; everything else escaped |
| `pendingUpdate.invitationMessage` | string, optional | while a change waits for review |

Same access as today: the creator, or an administrator; anyone else `404`.

## A3. Payloads that must NOT carry it

`GET /api/admin/polls` rows (which carry only the boolean `hasInvitationMessage`, for the read-only card's summary line),
every `/api/tabs/*` and `/api/me/*` answer, poll projections and deltas, the
`/poll/:pid` SEO page, `export.json` and `export.md`. Pinned by `polls-discovery.test.ts`.

## A4. `postman/openapi.json`

The admin poll detail schema and the publish/save request schemas gain the fields above, with the descriptions given
here; `openapi-contract.test.ts` keeps them in step with the routes.
