# HTTP Contracts

`postman/openapi.json` follows these.

## A1. The fingerprint header

`X-Device-Fingerprint: <browser>.<hardware>`, each part exactly 32 lower-case hexadecimal characters (`^[0-9a-f]{32}\.[0-9a-f]{32}$`).

An absent or malformed header, or either part being unusable, is treated as missing. It never produces an error, a delay or a log line holding its value.

## A2. `POST /api/polls/:pid/vote` (changed)

- **Request**: may carry A1. The body is unchanged.
- **Response**: unchanged, for every outcome.
- **Effect when collection is on and the vote is accepted**: the stream entry carries the account and the keyed hashes, or empty hashes when A1 is missing.
- **Effect when the vote is refused, or collection is off**: none. The header is ignored.

## A3. `GET /api/me` (changed)

- **Body**: unchanged.
- **Response header**: `X-Device-Sign-In-Due: 1` only when collection is on, the current Terms are accepted and this session has no sign-in event. It is absent otherwise.
- **Caching**: `Cache-Control: no-store` when collection is on and the Terms are accepted, so a browser's stored copy cannot keep the header (research R7).

## A4. `POST /api/me/device-sign-in` (new)

Records this session's sign-in event. It is not on the terms gate's allow list, so it is refused before acceptance.

| Case | Answer |
|---|---|
| Not signed in | `401 { "error": "Not signed in" }` |
| Current Terms not accepted | `403` `terms-required`, from the gate |
| Collection off | `204`, nothing written |
| Session already reported | `204`, nothing written |
| First report of the session, A1 valid | `204`, one row with the keyed hashes |
| First report of the session, A1 missing or malformed | `204`, one row with null hashes |

- **Request**: A1 and no body.
- It goes through the same `pageLoads` limit as `GET /api/me`.
- If the insert fails, the session's key is released and the answer is the usual server error, so a later page can report again.

## A5. `GET /api/config` (changed)

Gains `deviceEventsEnabled: boolean`. It never carries the key.
