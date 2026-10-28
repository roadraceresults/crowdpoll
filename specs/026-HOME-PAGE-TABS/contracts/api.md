# Contract: HTTP changes

All routes keep their existing auth, floors, shedding and `postman/openapi.json` entries; changes below must be
mirrored there (`tests/openapi-contract.test.ts`).

## Pages

### `GET /?PID=<pid>`
| Caller | Result |
|---|---|
| No `PID`, or `PID` not a UUID | `200` the home page, as today (PID ignored) |
| Guest, valid UUID | `302 /login?PID=<uuid>` — identical for every poll, existing or not |
| Signed in, valid UUID | one of the outcomes below; the view is written here |

Signed-in outcomes, always `302` to `/`:

| Outcome | Location |
|---|---|
| Creator | `/?open=<uuid>&tab=your-polls` |
| Private, published, reachable | `/?open=<uuid>&tab=shared-with-you` |
| Private, not published, reachable | `/?tab=shared-with-you&notice=unpublished` |
| Public, published | `/?open=<uuid>&tab=trending` |
| Not shown (unknown, Archived non-creator, public unpublished non-creator, Invitation Only not invited, banned, caller lacks `View Polls`) | `/?notice=unavailable` |

"Reachable" and the view write follow the spec (FR-015–FR-018): `linked` is upserted only for a Private Anyone With
The Link poll the visitor did not create, and for an unpublished one too; Invitation Only needs no write.
`open`, `tab`, `notice` accept only the values above; the page ignores anything else.

### `GET /login?PID=` and `GET /create-account?PID=`
Signed in with a valid `PID` → `302 /?PID=<uuid>`. Signed in without → `302 /` (as today). Guests: the page.
`/create-account` stays `404` outside native mode.

## Authentication (additive; every field optional)

| Route | Change |
|---|---|
| `POST /api/auth/request-login-link` | body `pid?: uuid`; passed to the magic link; unknown address → invitation URL `/create-account?PID=<uuid>` |
| `POST /api/auth/create-account` | body `pid?: uuid`; passed to the magic link it sends |
| magic-link email URL | `/api/auth/verify?token=…&stay=…&PID=<uuid>` when a pid was given |
| `GET /api/auth/verify` | query `PID?`; success → `302 /?PID=<uuid>` (else `/`); failure → `/login?error=invalid-link&PID=<uuid>` (else as today) |
| OAuth callback | `/?PID=<uuid>` when a pid was given |

An invalid `pid`/`PID` is dropped, never echoed. Rate limits and the identical "Check your inbox" response are unchanged.

## Tabs

| Route | Notes |
|---|---|
| `POST /api/tabs/your-polls/refresh` | `requireSession`, `dynamic("refresh")`; `View Polls` gate as today; includes `rejectionReason` for the caller's own rejected polls |
| `POST /api/tabs/shared-with-you/refresh` | placeholders for not-published polls (see below) |
| `POST /api/tabs/your-votes/refresh` | |
| `POST /api/tabs/watching/refresh` | rows failing `mayWatch` omitted |
| ~~`POST /api/tabs/private/refresh`~~, ~~`POST /api/tabs/favourites/refresh`~~ | **removed** |
| ~~`POST /api/me/polls/{pid}/link`~~ | **removed** (the server now records the view while serving `GET /`) |
| `GET /api/me/polls/{pid}` | **new.** `requireSession`, `pageLoads`; returns `{ poll, counts, overlay }` for a poll the caller may be shown; `404 Not found` otherwise (unknown, Archived non-creator, public unpublished non-creator, not reachable, banned, caller lacks `View Polls`); never writes |

Responses keep the delta shape (`computeDelta`). Overlay entries gain `mayWatch`.

### Placeholder entry (Shared With You)
`{ pid, notPublished: true, createdByName, contentVersion: 0 }` — no title, subtitle, choices, counts, overlay choice
ids or `mayWatch`. Produced server-side before any projection/count call.

## Bookmark

| Route | Change |
|---|---|
| `POST /api/polls/{pid}/bookmark` | after the existing `View Polls` check and before `addBookmark`: `mayWatch` false → `404 Not found` (same body as an unknown poll); `409 bookmark-cap` unchanged |
| `DELETE /api/polls/{pid}/bookmark` | unchanged, never checked |

## Admin routes
`updatePoll` (via `PATCH`/save routes) deletes dropped `invited` relations when the invite list changes. No shape change.
