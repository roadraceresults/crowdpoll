# Tasks: Profile Menu Consolidation

**Input**: Design documents from `/specs/003-profile-menu-consolidation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/page-routes.md, quickstart.md

**Tests**: Partial — US2's server-side redirect is testable with the existing
`supertest` pattern and gets a tests-first task. US1's DOM/menu changes are verified
via `quickstart.md`'s manual scenarios only (research.md R3: no DOM-testing
dependency exists in this project, and adding one for a two-file feature would
violate Simplicity First).

**Organization**: Tasks are grouped by user story. This is a small delta on the
implemented `001-user-auth` system — two files change behavior, one test file is new.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US2)

## Path Conventions

Single project at repository root per plan.md (`src/`, `tests/`).

---

## Phase 1: Setup

**Purpose**: None — no new dependencies, structure, or tooling. The existing
`001-user-auth` layout (Express app, static client, Vitest/supertest harness) is
reused unchanged. No setup tasks for this feature.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None — both stories build directly on already-implemented code
(`src/public/app.js`'s `renderHeader()`, `src/routes/pages.ts`'s existing `/profile`
guard pattern). No foundational tasks for this feature.

---

## Phase 3: User Story 1 - Manage Account via a Single Profile Menu (Priority: P1) 🎯 MVP

**Goal**: The header's main nav shows no standalone `Edit Profile`/`Logout` links for
a signed-in user; both actions live exclusively in the avatar-triggered menu, in the
order `Edit Profile` then `Logout` (FR-001–FR-007).

**Independent Test**: Sign in, confirm the header shows only the avatar + `userName`
(no standalone `Logout`/`Edit Profile` links), open the avatar menu, confirm both
actions are present in order and work correctly from there (quickstart US1 steps 1–7).

### Implementation for User Story 1

- [ ] T001 [US1] Edit `renderHeader()` in `src/public/app.js`: stop appending the
      standalone `profile` (Edit Profile) and `logout` anchors to `nav` (currently
      `nav.append(profile, logout, user)` — keep only `user`). Move the `Logout`
      anchor — same `id="logout-link"`, same click handler (`POST
      /api/auth/logout` then `location.href = "/"`) — into the existing `menu`
      element (`.avatar-menu`), appended immediately after the existing `Edit
      Profile` item, so `menu` contains `Edit Profile` then `Logout` and nothing
      else. Do not touch the guest (`else`) branch, the avatar click toggle, or the
      outside-click handler (FR-001–FR-007)

**Checkpoint**: User Story 1 fully functional and independently testable via
`quickstart.md` (no automated test — see Tests note above)

---

## Phase 4: User Story 2 - Signed-In Users Cannot Land on the Login Page (Priority: P2)

**Goal**: A signed-in user who navigates to `/login` is redirected to `/` before
`login.html` is ever sent — no flash of the login form (FR-008/FR-009, SC-004).

**Independent Test**: Sign in, navigate directly to `/login`, confirm an immediate
redirect to `/` and that the login form never renders; signed out, confirm `/login`
still serves the form normally (quickstart US2 steps 1–3).

### Tests for User Story 2 (write first, ensure they FAIL) ⚠️

- [X] T002 [US2] Write `tests/pages.test.ts`: `GET /login` with a valid signed-in
      session cookie responds `302` with `Location: /`; `GET /login` with no
      session responds `200` and serves `login.html` unchanged (mirror the
      supertest setup pattern already used by `tests/profile.test.ts` for session
      cookies). Confirm this test fails against the current, unguarded `/login`
      route before implementing T003 (FR-008/FR-009, contracts/page-routes.md)

### Implementation for User Story 2

- [X] T003 [US2] Edit the `GET /login` handler in `src/routes/pages.ts`: before
      `res.sendFile(page("login.html"))`, call `auth.api.getSession({ headers:
      fromNodeHeaders(req.headers) })` (same call already used by the `GET
      /profile` guard in this file) and `res.redirect("/")` when a session exists;
      otherwise fall through to sending `login.html` as today. Leave `/`,
      `/create-account`, and `/profile` untouched (FR-008/FR-009; research.md R2)

**Checkpoint**: Both user stories independently functional; `tests/pages.test.ts`
(T002) now passes

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T004 Run the full `specs/003-profile-menu-consolidation/quickstart.md`
      validation: `npm test` (full suite green, including new
      `tests/pages.test.ts`), then the US1 manual browser scenarios (steps 1–7,
      including the OAuth-mode repeat) and the US2 manual scenarios (steps 1–3,
      including the stale-session edge case). Confirm SC-001–SC-004

---

## Dependencies & Execution Order

- **Setup (Phase 1)** / **Foundational (Phase 2)**: No tasks — user stories can
  start immediately
- **US1 (Phase 3)**: T001 only, one file, no dependencies on US2
- **US2 (Phase 4)**: T002 (test, must fail) → T003 (route guard, makes T002 pass)
- **Polish (Phase 5)**: T004 last, after T001 and T003 are both done
- US1 and US2 touch different files (`app.js` vs. `pages.ts`) and are fully
  independent of each other until T004 validates both together

## Parallel Opportunities

- T001 (US1, `src/public/app.js`) can run in parallel with T002 (US2,
  `tests/pages.test.ts`) — different files, no shared dependency
- T003 depends on T002 existing (tests-first) and is otherwise independent of T001

## Implementation Strategy

**MVP = US1** (T001): the header/menu consolidation is the primary, higher-priority
scope (P1) and is independently shippable — one file, no test infrastructure needed
beyond manual quickstart validation. US2 (T002–T003) is a small, independent
addition that can follow in the same session. Commit after each phase; run T004
before considering the feature done.

## Notes

- No CSS changes: `.avatar-menu a, .avatar-menu button` styling in `src/public/
  styles.css` already covers any anchor inside `.avatar-menu`, including the moved
  `Logout` item.
- No `postman/openapi.json` changes: that file documents `/api/*` JSON endpoints
  only; `/login`'s redirect is a page-route behavior change, documented instead in
  `contracts/page-routes.md`.
