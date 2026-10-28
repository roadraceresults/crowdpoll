# Contract: API endpoints

Only four responses change. No endpoint is added, and no request shape changes. Every change below
must land in `postman/openapi.json` in the same commit (research R10; `openapi-contract.test.ts`
guards it).

## Changed

### `GET /api/admin/polls` — seven new fields per poll

Adds to each poll in the existing array. Nothing is removed or renamed.

| Field | Type | Meaning |
|---|---|---|
| `voteCount` | integer | Participants who have actually voted (non-empty `choiceIds`) |
| `invitationCount` | integer | Length of the invited list |
| `bannedVoterCount` | integer | Length of the banned list |
| `choices` | array | The poll's choices, as the read-only card displays them |
| `choiceMode` | enum | Renamed values |
| `voteMutability` | enum | Renamed values |
| `voterCountLimit` | integer or null | Null on a public poll, where the field does not apply |

`invitedVoterList` and `bannedVoterList` are **not** added. The counts stand in for them; the rosters
reach the browser only through the edit-session response. This is what keeps the list unable to
populate editing form on its own, and keeps the largest and most sensitive part of the payload off a
response sent for every poll on every refresh.

*Cost*: none at the database. The handler already loads whole documents with no MongoDB projection and
already runs one `voteHistory.distinct` for the page. The projection is applied when the response is
shaped, so this is payload only.

### `GET /api/config` — one new field

| Field | Type | Meaning |
|---|---|---|
| `participantsViewportSize` | integer | Rows per page in both roster sections. Default 10 |

Joins `signinMethod`, `pollingIntervalMs`, `pollAdminPageRefreshIntervalMs` and
`privateVoterLimitDefault`. The client keeps 10 as a fallback for the window before this answers and for
outright failure. `privateVoterLimitDefault` is already served and is the ceiling the over-cap message
names — no second field is needed for it.

### Roster-bearing responses — size cap

Applied in `buildAdminPollDetail()`, which is the single shaper behind five endpoints:

- `POST /api/admin/polls/:pid/edit-session`
- `POST /api/admin/polls/:pid/publish` — both outcomes
- `GET /api/admin/polls/:pid`
- `PATCH /api/admin/polls/:pid`

and separately in the `GET /api/admin/polls/:pid/results` handler for `voted` and `notYetVoted`.

**Rule**: if a list holds more than `ENV_PRIVATE_VOTER_LIMIT_DEFAULT` entries, the response carries an
empty array in its place. The three count fields remain accurate regardless, because the client needs
them to state the true size of a list it is not being given.

**Exempt**: `GET /api/admin/polls/:pid/export.json` — an export exists to hand over exactly the data the
screen withholds. `GET /api/admin/polls/:pid/export.md` carries no roster and needs no change.

### Enumerations — renamed values

Five enumerations in `openapi.json` carry the renamed values. Consumers reading the old spellings break;
that is intended and is why stored data is discarded rather than migrated.

## Unchanged

`POST /api/admin/polls`, `POST /api/admin/polls/:pid/edit-session/heartbeat`,
`DELETE /api/admin/polls/:pid/edit-session`, `DELETE /api/admin/polls/:pid`,
`POST /api/admin/polls/:pid/duplicate`, `POST /api/admin/polls/:pid/rescreen`, both export endpoints,
and every voter-facing endpoint (`GET /api/polls`, `GET /api/polls/:pid`, `POST /api/polls/:pid/vote`) —
apart from the renamed enumeration values those responses already carried.

## Removed page routes

| Route | Was | Now |
|---|---|---|
| `GET /admin/poll` | Edit surface for a poll with no votes | Removed — no longer resolves |
| `GET /admin/poll/update` | Edit surface for a poll with votes | Removed — no longer resolves |

Both were registrations of one `editSurface()` factory, which is removed with them, along with the
`?notice=` redirect it produced. `GET /admin/poll/results` is unaffected.

The `notice` query parameter on `/admin` is removed. It had three producers and no consumer —
`adminList.js` has never read `location.search` — so every message routed through it was already being
discarded. Refusals now render on the card.
