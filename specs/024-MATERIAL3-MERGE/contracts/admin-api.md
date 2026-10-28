# Admin API changes: Material 3 Merge (024), Step 6

Step 6 is the only step that touches the server. Every change is additive except the new-poll
default. All routes are `requireAdmin`. `postman/openapi.json` is updated to match each item.

## A1. `POST /api/admin/polls/:pid/save` (new)

Stores a new poll's answers without publishing it (research R21).

**Request** (JSON): the `/publish` body.

| Field | Type | Notes |
|---|---|---|
| `clientGuid` | string | the edit session's holder, when the poll is being edited. A poll that is not being edited is saved without a session, as `/publish` allows |
| `pollVisibility`, `pollSharingMode`, `voteAnonymity` | enum strings | as `/publish` |
| `title` | string | an empty (trimmed) title is ignored; ≤ 100 |
| `subtitle` | string | ≤ 100 |
| `keywords` | string | A4 |
| `labels` | string[] | 0 to `ENV_MAX_CHOICES` non-blank labels; none keeps the stored choices; each ≤ 100; no exact repeats |
| `choiceMode`, `voteMutability` | enum strings | as `/publish` |
| `startAt`, `endAt` | ISO string or null | start before end when both set |

**Responses**

| Status | When | Body |
|---|---|---|
| 200 | stored; the poll is INITIALIZED and its session cleared | the admin poll detail plus `message: "Saved: you can finish later."` |
| 400 | a field is invalid | `{ error }` |
| 404 | no such poll | `{ error: "Not found" }` |
| 409 | locked by another session; or the effective state is not INITIALIZED; or duplicate labels | `{ error }` |

Never requests approval, never consults the "default values" hold, and logs
`[admin] Saved poll <pid> without publishing`.

## A2. `POST /api/admin/polls/:pid/publish` (body gains `keywords`; the hold narrows)

Unchanged except that `keywords` is accepted (A4), and that the "still has its default values"
hold (a 200 that leaves the poll INITIALIZED with a `message`) applies only when the poll's
effective state is INITIALIZED (FR-049). A published poll whose choices are still the starter
ones goes to AWAITING APPROVAL like any other. In UPDATE mode it is outside `UPDATE_FIELDS`,
so a poll with votes refuses it with 400, as today for the other settings.

## A3. `POST /api/admin/polls` (default changes)

The created poll has `voteMutability: "Dynamic-Vote Poll"` (was `Final-Vote Poll`) and
`keywords: ""`. Visibility stays `Public Poll`, sharing `Anyone With The Link`.

## A4. `keywords`

- `""`, or keywords separated by commas; each matches `^[a-z0-9]+( [a-z0-9]+)*$`; no repeats; at
  most 200 characters in total. Otherwise 400.
- Stored only on a public poll: when the poll's resulting visibility is `Private Poll`, the
  stored value becomes `""`.
- A poll that has received a vote refuses a change: 400 through `/publish`'s votes filter (A2); `validatePollFields` also throws 409 as a backstop, which no route reaches.
- Returned on the admin poll detail (every route that returns it) and on the admin list row
  (A5). Searchable by home search on a listable public poll, through the existing `search`
  column and the OpenSearch outbox.

## A5. `GET /api/admin/polls` and `GET /api/admin/polls/search` (row gains two fields)

| Field | Type | Meaning |
|---|---|---|
| `pollStateBeforeEditUpdate` | `PollState \| null` | the state an EDITING poll returns to |
| `keywords` | string | A4 |
