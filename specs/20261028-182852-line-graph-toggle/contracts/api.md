# HTTP Contract Changes: Per-Poll Line Graph Toggle

All changes are additive. An existing request without the new field behaves as before.

## A1. Save a poll: `POST /api/admin/polls/:pid/publish` and `POST /api/admin/polls/:pid/save`

- **Request**: may include `lineGraphEnabled: boolean`.
- **Administrator** (`isAdminEmail`): the value is stored.
- **Not an Administrator** who sends the field: `403` `{ "error": "Only an Administrator can change the line graph." }`. Nothing is written. Log: `[admin] Refused line graph setting for poll <pid>: not an Administrator`.
- **No field**: the stored value is unchanged.
- **Poll with votes**: `lineGraphEnabled` joins `UPDATE_FIELDS`, so it is accepted alongside `title`, `subtitle`, `startAt`, `endAt`, the participant lists, `voterCountLimit` and `colors`.
- **Response**: unchanged shape.

## A2. Save colors on a poll with votes: `POST /api/admin/polls/:pid/colors`

- **Request**: `clientGuid` and `colors` as today. `colors` may be omitted when `lineGraphEnabled` is present.
- **Setting only**: with `lineGraphEnabled` and no `colors`, the choices are left as they are; the setting is stored; the poll returns to its pre-edit state and the session ends, as for a colors save.
- **Administrator rule**: as A1. A non-Administrator who sends the field gets `403`.
- **Guards unchanged**: an open edit session (`409` otherwise) and a poll with votes (`409` otherwise).
- **Response**: `{ pollState, choices }` as today, plus `lineGraphEnabled`.

## A3. Admin list and admin search rows

- **Response**: each row in `GET /api/admin/polls` and in the admin search carries `lineGraphEnabled: boolean`, for every caller who may see the row.

## A4. Graph data: `GET /api/polls/:pid/line-graph`

- **Setting on, and the caller may view results**: unchanged.
- **Setting off**: `404` `{ "error": "Not found" }`, the same answer the route gives for every refusal. Checked before any cached body is served.

## A5. Poll projections and the home page

- **Card data** (`PollProjection`, and the cards in `GET /api/...` listings that carry projections): gains `lineGraphEnabled: boolean`.
- **Change**: a change bumps `content_version`, so open cards refresh on their next Refresh of the tab.

## Documentation

`postman/openapi.json` is updated with the new request field on A1 and A2, the `403` on A1 and A2, the `lineGraphEnabled` field on the admin rows and the projection, and the `404` on A4.
