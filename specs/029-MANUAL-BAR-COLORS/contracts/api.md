# Contract: HTTP changes

All routes are under the existing admin API and sit behind `requireOwnPoll`: the poll's creator or an administrator proceeds; anyone else, and an unknown poll, gets `404 {"error": "Not found"}`. Every body is JSON. These changes are additive; no existing field changes meaning, and `postman/openapi.json` is updated with them (R10).

## `GET /api/config` (changed)

Adds one field to the existing response:

```json
{ "barPalette": [ { "name": "red", "hex": "#F91010" }, { "name": "blue", "hex": "#0808FD" } ] }
```

18 entries in picker order, upper-case hex. The admin page keeps it as `runtime.barPalette`.

## Choice object (changed)

Wherever the API returns a poll's choices (admin list, admin detail, the card projection), each choice may carry `"color": "#RRGGBB"`. A choice without the property is Automatic. `null` is never returned.

## `POST /api/admin/polls/:pid/save` and `POST /api/admin/polls/:pid/publish` (changed)

Both gain an optional body property:

| Property | Type | Rule |
|---|---|---|
| `colors` | array of string or `null` | one entry per choice, in the order of `labels` (or of the stored choices when `labels` is absent); an entry is `null`, a palette hex, or a colour the poll already stores |

| Situation | Result |
|---|---|
| `labels` and `colors` | choices replaced; each choice takes its paired colour |
| `labels`, no `colors` | choices replaced with none coloured (as before the feature) |
| `colors`, no `labels` (publish only) | the colours are set on the existing choices by position; ids, labels, positions and votes unchanged |
| `colors`, no non-empty `labels` (save) | ignored: the stored choices are kept |
| `colors` on a poll that has votes | allowed: `colors` is one of the fields `UPDATE` mode accepts, beside the existing ones |
| `colors` of the wrong length | `400 {"error": "Colors must have one entry per choice."}`, nothing saved |
| an entry that is not allowed | `400 {"error": "Colors must come from the palette."}`, nothing saved |

Other responses are unchanged: `409` when the poll is locked or the session lost, `400` for the existing field checks. After `publish` the poll is `AWAITING APPROVAL`, as for any edit.

## `POST /api/admin/polls/:pid/colors` (new)

The colours-only save for a poll that has votes, taken inside the edit session the card already holds.

Request:

```json
{ "clientGuid": "<the edit session's guid>", "colors": ["#F91010", null, "#0808FD"] }
```

| Condition | Status | Body |
|---|---|---|
| caller is neither the creator nor an administrator, or no such poll | `404` | `{"error": "Not found"}` |
| the poll is not `EDITING`, or `clientGuid` is not the session holder's | `409` | `{"error": "This poll is not being edited by this session."}` |
| the poll has no votes | `409` | `{"error": "A colours-only save is for a poll that has votes."}` |
| `colors` missing, wrong length, or an entry not allowed | `400` | as for `publish` |
| otherwise | `200` | `{"pollState": "<the restored state>", "choices": [ ... ]}` |

On success, in one conditional write (filtered on `pollEditUpdateClientGUID`): the colours are set on the existing choices by position; the poll's state returns to what it was before the session; the session fields are cleared; `content_version` moves, so open cards refresh. The poll is not sent for review: `pollApprovalTimestamp` and the attempt count are untouched.
