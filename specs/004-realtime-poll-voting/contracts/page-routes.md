# Contract: Page Routes (delta on `001-user-auth`'s "Pages" contract)

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-12

`src/routes/pages.ts` serves static HTML, not JSON — documented here rather than in
`postman/openapi.json` (scoped to `/api/*` per `CLAUDE.md`).

## `GET /`

**Replaces** the prior `001-user-auth` demo landing page (`index.html`'s "member/guest
message" content). Now serves the poll home grid, adopting `responsive-grid.html`'s header
(brand, greyed-out "Create Poll"/"Search"/filter-bar per spec Assumptions), plus a
`#cardGrid` populated client-side from `GET /api/polls` (FR-032).

| Query | Behavior |
|---|---|
| none | Renders the responsive grid of all eligible `PUBLIC_POLL`s (FR-032/033). |
| `?PID=<uuid>` | Renders that single poll's card standalone instead of the grid (US3-AC2, research.md R4). Guest/AccessMode visibility rules are enforced by `GET /api/polls/:pid` (FR-017), not by this route. |

The session-driven header area (Login/Create-Account vs. avatar+dropdown) is unchanged —
still `app.js`'s existing `renderHeader()` logic (research.md R8), now mounted into the
adopted header markup instead of the old minimal one.

## `GET /admin`

**New.** Admin main page (FR-035/036/037) — "Create New Poll" action, admin poll list.
Guarded server-side by `requireAdmin` (research.md R6): guest or non-admin → `401`/`403` with
the request never reaching `admin.html`; admins get `200` and the static shell, which then
calls `GET /api/admin/polls` client-side.

## `GET /admin/poll?PID=<uuid>`

**New.** Edit Poll Configuration page (FR-036, FR-039–054) — single page for both "new poll"
(landed on directly after `POST /api/admin/polls`) and existing-poll editing. Guarded by
`requireAdmin`. Missing/unknown `PID` → `404`.

## `GET /admin/poll/results?PID=<uuid>`

**New.** View Results admin page (FR-054/055) — aggregate results, participant lists,
export links. Guarded by `requireAdmin`. Missing/unknown `PID` → `404`.

## `GET /login`, `GET /create-account`, `GET /profile`

Unchanged — no behavior delta in this feature. `GET /login`'s post-signin redirect target
remains `/`, which now shows the poll grid instead of the old demo content.

## No route for "Live Results"

Per research.md R9, the poll card's "Live Results" link is rendered greyed-out/disabled and
does not navigate anywhere — no `/live-results` (or similar) route is created by this feature.
