# API Contract: Poll Admin Improvements

What the server tests hold the implementation to. No route is added or removed; two fields are added.
`postman/openapi.json` follows (A6).

## A1. `choicesInEnteredOrder` is stored and defaults to off (FR-018)

- After migration 023, every existing poll reads `choicesInEnteredOrder: false`.
- `POST /api/admin/polls` creates a poll with `false`.
- Migration `down` removes the column and leaves the table as it was.

## A2. Saving it (FR-020)

On the wizard's two save routes, `POST /api/admin/polls/:pid/publish` and, for a poll not yet published, `POST /api/admin/polls/:pid/save`, with the other wizard fields (`PATCH /api/admin/polls/:pid` carries state actions only):

| Request | Answer |
|---|---|
| `choicesInEnteredOrder: true` or `false`, public or private poll, no votes | saved |
| the same on a poll with votes (UPDATE mode) | accepted as an update field, alone or with others |
| `choicesInEnteredOrder: "yes"`, `1` or `null` | `400`, `choicesInEnteredOrder must be true or false.`, nothing saved |
| field absent | the stored value is kept |

A poll becoming public keeps its value (unlike `votersAddChoices`).

## A3. Reading it (FR-025)

- The admin list item (both list routes) and the admin poll detail carry `choicesInEnteredOrder`.
- The card, tab, delta and Live Results payloads carry it, from `projectPoll`.
- A saved change raises `contentVersion`, and a delta request holding the old version receives the card again.
- While the poll is `EDITING`, those payloads carry the stored value.
- No payload gains any other field; `polls-discovery.test.ts` still finds no voter name and no raw `voteAnonymity`.

## A4. Duplicate (FR-026)

`POST /api/admin/polls/:pid/duplicate` of a poll with the setting on gives a poll with it on; `lineGraphEnabled` is
still reset, as today.

## A5. `canWatch` on the admin lists (FR-011, FR-012)

Every item of `GET /api/admin/polls` and `GET /api/admin/polls/search` carries `canWatch: boolean`, equal to
`mayWatchMany` for the caller:

| Poll | Caller | `canWatch` |
|---|---|---|
| `INITIALIZED`, `AWAITING APPROVAL`, `REJECTED`, `ARCHIVED` | anyone, the creator included | `false` |
| public, `WAITING TO OPEN`, `OPEN` or `CLOSED` | holds "View Polls", not banned | `true` |
| the same | banned from it | `false` |
| private, published, created by the caller | | `true` |
| private link poll, published, another person's | no relation | `false` |
| the same | `linked` or `voted` | `true` |
| Invitation Only, published, another person's | invited | `true` |
| the same | not invited | `false` |
| `EDITING`, was `OPEN` | as for `OPEN` | as for `OPEN` |
| `EDITING`, was `INITIALIZED` | anyone | `false` |

The lists' other fields, their order, `truncated` and their access rules (`requireCreator`, `requireAdmin`) are
unchanged. `mayWatchMany` itself is not edited.

## A6. The description

`postman/openapi.json` describes `choicesInEnteredOrder` wherever it describes `votersAddChoices`, and `canWatch` on
the admin list item; `tests/openapi-contract.test.ts` passes.
