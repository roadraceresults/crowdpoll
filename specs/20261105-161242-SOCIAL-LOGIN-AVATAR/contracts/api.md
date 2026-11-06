# HTTP Contracts: Social Login Avatar

No new route, and no new entry in the Terms gate.

## A1. `GET /api/me` and `PATCH /api/me`: `profileAvatar`

The field's name and type do not change; its value widens.

| Stored value | Spaces configured | Response value |
|---|---|---|
| `/avatar-default.svg` | either | `/avatar-default.svg` |
| `avatars/<key>` | yes | `<ENV_SPACES_CDN_URL, no trailing slash>/avatars/<key>` |
| `avatars/<key>` | no | `/avatar-default.svg` |
| null | either | null; the pages already fall back to the default |

`postman/openapi.json` says it is an image address: a site path, or an absolute URL on the site's CDN.

## A2. `GET /api/auth/callback/google`

The status and redirect do not change. Before the redirect is answered, the after hook of research R1 runs, for at most about 3 seconds.

| Situation | Result |
|---|---|
| Spaces not configured | no fetch; the account is unchanged |
| No session created (refused by the allowlist, or a provider error) | no fetch |
| No `picture` claim | the account is unchanged |
| Host, redirect, size, type or timeout refused, or upload failed | the account is unchanged; a log line without the URL |
| Same hash as stored | the account is unchanged; no upload |
| New image | object uploaded; `profileAvatar` and `profile_avatar_hash` set; old key queued; the session's cached copy dropped |

The hook never throws out of the login. The callback of every other provider does not run it.

## A3. Provider login start

`POST /api/auth/sign-in/social` and `POST /api/auth/sign-in/oauth2` do not change. The `callbackURL` that `loginCard.js` and `inviteCard.js` send gains `signedIn=1`: `/?signedIn=1`, or `/?PID=<pid>&signedIn=1`.
