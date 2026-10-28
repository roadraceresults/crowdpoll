# Implementation Plan: Profile Menu Consolidation

**Branch**: `dev` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-profile-menu-consolidation/spec.md`

## Summary

Two small, independent deltas on the implemented `001-user-auth` demo client, both
UI-reorganization/route-guard only — no API, session, or data-model changes. (1)
Consolidate the header's standalone `Edit Profile`/`Logout` links into the existing
avatar-triggered profile menu (`Edit Profile` then `Logout`, nothing else), reusing
the menu's existing open/close toggle. (2) Add a server-side session guard to the
`GET /login` route, mirroring the existing `GET /profile` guard, so a signed-in user
is redirected to `/` before `login.html` is ever sent — resolving the clarified
requirement that the login form must never flash for a signed-in user.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS (existing project)

**Primary Dependencies**: Existing stack only — Express 5, better-auth 1.6.26
(`auth.api.getSession`, same call already used by the `/profile` guard); vanilla JS
for the static client (`src/public/app.js`). No new dependencies.

**Storage**: N/A — no data-model change

**Testing**: Vitest + supertest (existing pattern). US2's server-side redirect gets
an automated test (`tests/pages.test.ts`, new). US1's DOM/menu changes are verified
via quickstart's manual browser scenarios — the project has no DOM-testing
dependency and adding one for this feature would violate Simplicity First (see
research.md R3).

**Target Platform**: Same as `001-user-auth`/`002-smtp-env-config` — DigitalOcean App
Platform (Linux); local dev on Windows 11 + PowerShell.

**Project Type**: Single project (existing layout, unchanged)

**Performance Goals**: N/A — no new runtime paths beyond one extra `getSession` call
on `GET /login`, same cost as the existing `/profile` guard.

**Constraints**: Zero API/session/data-model changes (spec Assumptions); reuse the
existing `.avatar-menu` CSS hook and toggle interaction as-is (spec Assumptions);
server-side guard only for the Login-page redirect (spec Clarifications, session
2026-08-11).

**Scale/Scope**: 2 files change behavior (`src/public/app.js`, `src/routes/pages.ts`)
plus 1 new test file (`tests/pages.test.ts`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Think Before Coding | Spec fully clarified (one material ambiguity resolved in `/speckit-clarify`, session 2026-08-11); no open questions remain | ✅ PASS |
| II. Simplicity First | No new dependencies; reuses existing `.avatar-menu` toggle and existing `/profile` session-guard pattern verbatim; no shared route-guard abstraction introduced for two call sites | ✅ PASS |
| III. Surgical Changes | Only `app.js`'s `renderHeader()` and `pages.ts`'s `GET /login` handler change; no adjacent refactoring | ✅ PASS |
| IV. Goal-Driven Execution | Every FR maps to a spec Acceptance Scenario; US2 has an automated supertest check; US1 has explicit manual quickstart steps (tests-or-manual-check per constitution) | ✅ PASS |
| V. Code Quality & Maintainability | Route guard reuses the same session-check call and redirect idiom already established by `/profile`, keeping the two guards consistent and readable | ✅ PASS |
| Security & Privacy standards | No new attack surface; the redirect guard is strictly more restrictive (prevents an authenticated session from re-submitting a login form), same session mechanism as elsewhere | ✅ PASS |
| Performance & Efficiency | One additional `getSession` call per `/login` request, identical cost to the existing `/profile` guard; no background work added | ✅ PASS |

**Post-Phase-1 re-check**: Design artifacts (research.md, data-model.md,
contracts/page-routes.md, quickstart.md) introduce no new projects, dependencies, or
patterns beyond the above. ✅ PASS — Complexity Tracking left empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-profile-menu-consolidation/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── page-routes.md
├── checklists/
│   └── requirements.md  # already validated (/speckit-specify, /speckit-clarify)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── routes/
│   └── pages.ts          # GET /login: add session check + res.redirect("/") when
│                          #   signed in, mirroring the existing GET /profile guard
│                          #   (lines 40-51); GET /, /create-account, /profile unchanged
└── public/
    └── app.js             # renderHeader(): stop appending standalone `profile`/
                            #   `logout` anchors to nav; append a Logout item (same
                            #   click handler) into the existing `menu` element after
                            #   the existing Edit Profile item

tests/
└── pages.test.ts          # NEW: supertest coverage for GET /login (signed-in → 302
                            #   Location: /; guest → 200, login form served)
```

**Structure Decision**: Single project, existing layout untouched — this feature adds
no new source directories or modules, only edits two existing files and adds one test
file, consistent with its scope as a UI-reorganization-plus-one-route-guard delta.

## Complexity Tracking

No constitution violations — table intentionally empty.
