# Contract: Page Routes (delta on `001-user-auth`'s "Pages" contract)

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-11

`src/routes/pages.ts` serves static HTML pages, not JSON — it is documented here
rather than in `postman/openapi.json` (which covers `/api/*` JSON endpoints only,
per `CLAUDE.md`'s "keep it in sync with route changes" scoped to that file).

## `GET /login`

| Aspect | Before (001-user-auth) | After (this feature, FR-008/FR-009) |
|---|---|---|
| No session (guest) | 200, sends `login.html` | unchanged: 200, sends `login.html` |
| Valid session (signed in) | 200, sends `login.html` | **302 redirect to `/`** — `login.html` is never sent |

Implementation mirrors the existing `GET /profile` guard in the same file (session
check via `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })`, evaluated
server-side before any file is sent — see research.md R2).

## `GET /profile`, `GET /`, `GET /create-account`

Unchanged — no behavior delta in this feature.
