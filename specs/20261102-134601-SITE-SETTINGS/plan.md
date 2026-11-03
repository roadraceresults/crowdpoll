# Implementation Plan: Site Settings and Color Scheme

**Branch**: `user-settings` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261102-134601-SITE-SETTINGS/spec.md`

## Summary

Every signed-in user gets a "Site Settings" item in the avatar menu, directly after "Edit Profile", with today's gear icon. "Poll Administration" gets a new checklist glyph (R10).

The item opens `/settings`, a page guarded like `/profile` and built from the same card shell. It has one setting, "Color Scheme", shown as a radio group: "Light (default)" or "Dark" (R6).

Selecting a scheme applies it at once and saves it through `PATCH /api/me`. Saves are serialized, and a failure reverts to the saved scheme with a message (R7).

The choice is stored in one nullable column, `user.color_scheme`, added by migration `016-color-scheme`. `sessionCache` reads it, `GET /api/me` returns it, and the cached sessions are cleared after every PATCH (R1, R2).

A new synchronous head script, `colorScheme.js`, paints each page in the scheme from a `localStorage` copy. The account's value then corrects that copy through the existing session subscription. When no session is found, the page shows Light and the copy is removed (R3, R4). Other tabs follow through the existing session broadcast (R5).

Light becomes the default everywhere. The `prefers-color-scheme` dark rules are deleted, and the admin pages lose their light pin (R8). The line graph watches `<html data-theme>` instead of the device's appearance setting (R9).

Every page is audited for WCAG 2.2 AA contrast in both schemes: a token-pair test plus a page-by-page walk-through, with each failure fixed (R11).

## Technical Context

**Language/Version**: TypeScript on Node ≥ 22, ESM.

**Primary Dependencies**: Express 5, Kysely (PostgreSQL), BetterAuth. Browser: vanilla JavaScript and CSS, no framework, no bundler. No new dependency.

**Storage**: PostgreSQL. One additive nullable column, `user.color_scheme`, with a check constraint and no backfill. One browser `localStorage` key, `colorScheme`, declared in `privacy.html` (data-model.md).

**Testing**: Vitest with supertest and embedded PostgreSQL. Client suites run in jsdom via `tests/helpers/browser.ts`. The contrast walk-through is manual (quickstart 9).

**Target Platform**: DigitalOcean App Platform, one autoscaled web service; desktop and phone browsers.

**Project Type**: Web service with a browser client.

**Performance Goals**:
- No extra request per page load; the scheme rides on `GET /api/me`.
- The head script is under 1 KB, cacheable, and runs before first paint.
- The setting is applied within 100 ms of a choice (SC-002).

**Constraints**:
- One new page route, one new browser module plus the head script, and one new M3 layer.
- No inline script, and no cookie.
- `postman/openapi.json` follows A1 and A2.

**Scale/Scope**:
- About 6 server files: migration, migrations index, schema, sessionCache, api.ts, pages.ts.
- About 12 client files: `app.js`, `lineGraph.js`, the new `colorScheme.js`, `settingsCard.js`, `settings.html` and `site-settings-m3.css`, five M3 sheets, `privacy.html`, and the 12 existing pages' heads.
- Three new test suites, and extensions to the m3-assets and line-graph suites.
- Contrast fixes as found.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | Each judgment call states its rejected alternative: an external head script, not an inline one or a server-rendered attribute (R3); serialized saves, not a debounce (R7); a token test plus a manual audit, not a new dependency (R11). All 13 requirement findings and both clarifications are cited where they apply. | Pass |
| II. Simplicity First | One column, no new route beyond the page, no new sync channel (R5). The dark rules go from two copies to one (R8). | Pass |
| III. Surgical Changes | The rename path of `PATCH /api/me` is unchanged; `colorScheme` is an independent branch. The gear glyph is renamed, not redrawn. | Pass |
| IV. Goal-Driven Execution | quickstart.md scenarios 1–9 map to US1–US4, the edge cases and FR-011a. R13 names the suites. | Pass |
| V. Code Quality | The server logs every scheme change with the user id, no address. The browser logs nothing. Each refusal has its own message. | Pass |
| VI. Self-Documenting Code | Names carry the meaning (`ColorScheme.apply`, `SETTINGS_GLYPH`, `color_scheme`). No finding or task ids in code. | Pass |
| Security, Privacy & Reliability | The value is validated in the route and by a check constraint. Storage access cannot throw. The key is disclosed and removed when no one is signed in. | Pass |
| Performance & Operational Efficiency | No polling and no extra request. One observer per mounted graph. | Pass |
| Documentation Deliverables | README.md and ARCHITECTURE.md are updated after implementation. | Deferred to after implementation |

**Gate result**: no violations; Complexity Tracking is empty.

**Post-design re-check**: unchanged. The design added no abstraction beyond `window.ColorScheme`, which both the head script and the Settings card need.

## Project Structure

### Documentation (this feature)

```text
specs/20261102-134601-SITE-SETTINGS/
├── plan.md              # This file
├── research.md          # Phase 0 output: R1–R13
├── data-model.md        # Phase 1 output: the column, the device copy, data-theme states
├── quickstart.md        # Phase 1 output: nine validation scenarios
├── contracts/
│   ├── api.md           # A1–A3
│   └── ui-contracts.md  # C1–C6
├── checklists/requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── db/migrations/016-color-scheme.ts        # new
├── db/migrations/index.ts, db/schema.ts
├── auth/sessionCache.ts                     # lookup() reads color_scheme
└── routes/api.ts (A1, A2), routes/pages.ts (A3)
src/public/
├── colorScheme.js, settingsCard.js, settings.html, site-settings-m3.css   # new
├── app.js                # SETTINGS_GLYPH, new ADMIN_GLYPH, menu item, SiteGlyphs
├── lineGraph.js          # data-theme observer
├── m3-tokens.css, card-shell-m3.css, header-tab-bar-m3.css, pollCard-m3.css, tabs-modal-m3.css  # media blocks removed
├── admin.html, admin-results.html            # light pin removed
├── privacy.html          # Cookie Use row
└── every *.html head     # colorScheme.js
tests/
├── color-scheme.test.ts, client-site-settings.test.ts, color-scheme-contrast.test.ts   # new
└── m3-assets.test.ts, line-graph-ui.test.ts (extended)
postman/openapi.json
```

**Structure Decision**: the existing single web-service layout. Server changes go in the modules that own the user row, the session and the routes. The client gains one page with its card module, and one head script.

## Complexity Tracking

None.
