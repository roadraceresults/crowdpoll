# Phase 0 Research: Profile Menu Consolidation

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-11

No NEEDS CLARIFICATION markers remained in the spec after `/speckit-clarify` (the one
material ambiguity — client-side vs. server-side enforcement of the Login-page
redirect — was resolved in that session and is recorded in spec.md's Clarifications
section). Research here confirms the plan-level mechanics for both stories.

## R1. Header/menu consolidation mechanism

- **Decision**: In `src/public/app.js`'s `renderHeader()`, stop appending the
  standalone `profile` (Edit Profile) and `logout` anchors to `nav`. Instead append a
  second menu item — a `Logout` anchor with the same click handler currently wired to
  the standalone `logout` link — into the existing `menu` element (the `.avatar-menu`
  div), immediately after the existing `Edit Profile` item.
- **Rationale**: `menu` already holds the `Edit Profile` item and the existing
  open/close toggle (avatar click, outside-click) is wired to `menu.hidden`, so this
  is a pure move of two DOM nodes and one event listener — no new toggle logic, no CSS
  changes (`.avatar-menu a` styling in `styles.css` already covers both items,
  `styles.css:74-89`).
- **Alternatives considered**: Rebuilding the header render function (rejected —
  unnecessary churn on working code, violates Surgical Changes); a separate dropdown
  component (rejected — the existing `.avatar-menu` toggle already satisfies FR-007).

## R2. Login-page redirect mechanism

- **Decision**: Add a session check to the `GET /login` handler in
  `src/routes/pages.ts`, mirroring the existing `GET /profile` guard (lines 40-51):
  call `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })`; if a session
  exists, `res.redirect("/")`; otherwise `res.sendFile(page("login.html"))` as today.
- **Rationale**: This is the resolved clarification — a server-side check guarantees
  `login.html` is never sent to a signed-in browser (SC-004's literal "never
  rendered"), and reuses the exact session-check call already proven correct for
  `/profile`. No new session-detection mechanism, no client-side redirect race.
- **Alternatives considered**: Client-side check in `app.js` after page load
  (rejected in clarification — risks a flash of the login form since `login.html`'s
  `<form>` has no `hidden` guard today); a shared route-guard middleware abstraction
  (rejected — only two routes ever need this shape, and the project's Simplicity First
  principle disfavors an abstraction for two call sites).

## R3. Test coverage split

- **Decision**: User Story 2 (server-side redirect) gets an automated `supertest`
  test — the project already tests page-adjacent redirect behavior this way (e.g.
  `profile.test.ts` asserts on `res.headers.location` for magic-link redirects). User
  Story 1 (header/menu DOM changes) is verified via the quickstart's manual browser
  scenarios only, matching how `001-user-auth`'s existing header/avatar-menu behavior
  was originally validated — the project has no DOM-testing dependency (no jsdom/
  Testing Library in `package.json`), and adding one for a single small feature would
  violate Simplicity First / no-new-dependencies.
- **Rationale**: Every FR needs a verifiable check (Goal-Driven Execution); this
  splits verification by what's actually testable at the current stack's altitude
  without introducing new tooling.
- **Alternatives considered**: Adding jsdom + a DOM-assertion library for the header
  test (rejected — new dev dependency for one feature, disproportionate to Simplicity
  First); skipping automated coverage for US2 too (rejected — supertest already
  covers this exact request/redirect shape at zero new cost).
