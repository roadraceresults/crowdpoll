# Quickstart & Validation Guide: Profile Menu Consolidation

**Feature**: [spec.md](./spec.md) | **Contract**: [contracts/page-routes.md](./contracts/page-routes.md)

Prerequisites are unchanged from `001-user-auth`'s quickstart (Node 22, MongoDB
service, launch assets configured per `002-smtp-env-config`).

## Automated validation

```powershell
npm test                          # full suite still green
npm test -- tests/pages.test.ts   # new: GET /login redirect coverage (US2)
```

`tests/pages.test.ts` must show: a signed-in request to `GET /login` responds `302`
with `Location: /`; a guest (no session) request to `GET /login` responds `200` and
serves the login form unchanged.

## Manual validation scenarios

### US1 — Single profile menu (P1)

1. Sign in → confirm the header shows only `userName` + avatar, with **no**
   standalone `Edit Profile` or `Logout` link in the main nav (spec Acceptance
   Scenario 1, FR-001/002).
2. Click the avatar → menu opens listing exactly `Edit Profile` then `Logout`, no
   other items (Acceptance Scenario 2, FR-003).
3. Click outside the open menu → it closes without action (Edge Case, FR-007
   preserved). Click the avatar again while open → it closes (toggle, FR-007).
4. From the open menu, select `Edit Profile` → lands on the profile page, same as
   the prior standalone link (Acceptance Scenario 3, FR-004).
5. From the open menu, select `Logout` → session ends, guest header + guest content
   shown (Acceptance Scenario 4, FR-005).
6. Sign out → header shows `Login` and (native mode) `Create Account`, unchanged
   from `001-user-auth` (Acceptance Scenario 5, FR-006).
7. Repeat steps 1-5 in OAuth mode (`APP_SIGNIN_METHOD=oauth`) → identical menu
   behavior; avatar/fields still come from the provider (Edge Case).

### US2 — Signed-in users redirected off the Login page (P2)

1. Sign in, then navigate directly to `/login` → immediately redirected to `/`; the
   login form is never visible, not even momentarily (Acceptance Scenario 1,
   FR-008, SC-004).
2. Sign out, navigate to `/login` → login form renders normally (Acceptance
   Scenario 2, FR-009).
3. Sign in, let the session expire (or invalidate it from another device), then
   follow a stale link to `/login` → treated as a guest visit, login form renders
   (no redirect loop — Edge Case).
