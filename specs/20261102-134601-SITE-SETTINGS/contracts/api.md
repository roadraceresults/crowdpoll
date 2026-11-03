# API Contracts: Site Settings and Color Scheme

## A1. `GET /api/me` (changed)

- The response gains `colorScheme`: `"light"` or `"dark"` (`"light"` when never chosen).
- Every other field and status is unchanged.
- `401` for no session, as today.

```json
{ "userName": "ana", "emailAddress": "…", "profileAvatar": "…", "status": "…", "isAdmin": false,
  "permissions": ["View Polls"], "termsAccepted": true, "termsFirstAcceptance": false, "colorScheme": "dark" }
```

## A2. `PATCH /api/me` (changed)

- **Body**: `{ "userName"?: string, "colorScheme"?: "light" | "dark" }`.
  At least one key is required.
- **Validation**: each present key is checked before anything is written.
  - No `userName` and no `colorScheme` → `400 { "error": "Nothing to change." }`
  - `userName` present → today's rules: `400` for empty or too long, `409` for a name in use.
  - `colorScheme` present and not `"light"` or `"dark"` → `400 { "error": "Color scheme must be \"light\" or \"dark\"." }`
- **Effect**:
  - `colorScheme` → `user.color_scheme` and `updatedAt`. No poll row and no `content_version` changes.
  - `userName` → today's rename transaction, unchanged.
  - Both are written in one transaction.
- **After success**:
  - `sessions.forgetUserSessions(userId)` runs.
  - The server logs `[settings] User <id> color scheme set to <value>` (no address).
- **Response 200**: `{ userName, emailAddress, profileAvatar, status, colorScheme }`.
- **401**: no session, as today.
- `postman/openapi.json` documents both keys and the new `400`.

## A3. `GET /settings` (new page route)

- With a session → `200 settings.html`.
- Without a session → `302 Location: /login`.
- The terms gate applies as for `/profile`.
