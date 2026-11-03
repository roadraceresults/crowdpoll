# HTTP Contracts: Field Length Limits

Only the limits change; no route is added or removed.

## A1. `GET /api/config`

- The response carries `choiceLabelMax` (integer, 35) and no longer carries `wizardChoiceMax`.
- Every other field is unchanged.

## A2. Poll saves — `PATCH /api/admin/polls/:pid` and the wizard's `POST` save

- `title`: a string of at most 60 characters; 61 → `400` `{ "error": "Title must be at most 60 characters." }`.
- `subtitle`: at most 40; 41 → `400` `{ "error": "Subtitle must be at most 40 characters." }`.
- `labels[]`: each trimmed label is at most 35 characters, **except** a label whose trimmed text equals a label
  already stored on the poll, which is accepted at any length.
  A new label of 36 or more → `400` `{ "error": "Choice label must be at most 35 characters." }`, and nothing is
  saved.
- A stored label repeated unchanged keeps its id and votes (an ever-voted poll's `mergeChoices` matches by text, as
  today).

## A3. `POST /api/polls/:pid/choices` (a voter's added choice)

- `label`: trimmed, at most 35 characters; 36 → `400`
  `{ "error": "A choice can be at most 35 characters.", "code": "CHOICE_TOO_LONG" }`.
- Every other check (empty, characters, duplicate, full, state) is unchanged.

## A4. `postman/openapi.json`

- Every schema's title `maxLength` is 60, subtitle 40.
- `labels.items.maxLength` is 35, with a description stating the stored-label exemption.
- The `/api/config` response documents `choiceLabelMax` in place of `wizardChoiceMax`.
- The add-choice request's `label.maxLength` is 35 and its `400` description says "at most 35 characters".
