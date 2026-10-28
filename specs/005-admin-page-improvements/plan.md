# Implementation Plan: Admin Page Improvements

**Branch**: `dev` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-admin-page-improvements/spec.md`

## Summary

Four independent fixes to the admin experience: (1) the admin poll list's four per-row
action links consolidate behind a single kebab-menu trigger with full keyboard/ARIA support;
(2) `POST /api/admin/polls/:pid/duplicate` gains a title-uniqueness pass so repeated
duplication of the same poll never produces two polls with the same title, checked across
every poll state; (3) the site header (brand, nav, search, account area) is unified into one
JS-rendered component mounted identically on all 7 pages, replacing today's three divergent
header variants (full hardcoded markup on the home page, a reduced admin-branded version on
`/admin`, a back-arrow-only version on the poll editor/results pages, and a plain-text
JS-rendered version on login/profile/create-account); (4) the poll editor page (Edit Poll)
gets a back-to-`/admin` control, relabeled Access Mode options, a server-enforced invariant
that Transparent results and a Public access mode can never coexist (each side
auto-corrects the other), a Voter Count Limit that defaults blank and tracks Access Mode's
Public/private transitions (capped at 500, clearable), a relabeled "Ban from Voting"
participant action, and a tighter label-left/reduced-spacing layout for its top fields.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS (existing project, unchanged)

**Primary Dependencies**: Existing stack only — Express 5, `mongodb` driver 6.x for the
title-uniqueness query; vanilla JS/CSS for the client (actions menu, header), matching the
codebase's existing zero-client-dependency convention (research.md R2/R3). No new
dependencies.

**Storage**: MongoDB, same `polls` collection — no new fields, indexes, or collections
(data-model.md). The duplicate-title check is a single regex query over the existing `title`
field. User Story 4 narrows `Poll.voterCountLimit`'s existing type from `number` to
`number | null` (still the same field, no migration — `null` simply becomes a valid stored
value alongside the existing positive-integer range) and adds a cross-field invariant
between `resultsVisibility` and `accessMode`, enforced in `validatePollPatch()`
(data-model.md).

**Testing**: Vitest + supertest + mongodb-memory-server (existing pattern). Extends
`tests/polls-service.test.ts` (new pure-function unit tests) and
`tests/polls-admin-crud.test.ts`/`tests/polls-admin-participants.test.ts` (extended
duplicate-endpoint, cross-field auto-correction, and Voter Count Limit tests). The
actions-menu keyboard/ARIA behavior, the header's visual identity across pages, and the poll
editor's layout/back-navigation are DOM/visual-level and are validated manually via
`quickstart.md`, per the constitution's tests-OR-manual-check allowance.

**Target Platform**: Unchanged — DigitalOcean App Platform (Linux) for deployment; local dev
on Windows 11 + PowerShell (`devScripts/launch-dev.ps1`).

**Project Type**: Single project (existing layout, extended — no new top-level directories).

**Performance Goals**: SC-002 (≤2 interactions to reach any per-row action) is a UX target,
not a throughput one. The title-uniqueness query is bounded by 004's own stated scale
(≤1,000 active polls; archived/closed polls accumulate but are never purged) — a single
regex-filtered `find()` projecting only `title`, trivial at that scale.

**Constraints**: FR-011 (full keyboard + ARIA menu semantics) shapes the actions-menu
implementation (research.md R2). Avoiding ~40KB of duplicated inline-SVG header markup across
6 additional pages, and avoiding the stylesheet-bleed risk uncovered while researching header
unification (research.md R3), rules out the naive "copy the markup, add the existing
stylesheets" approach.

**Scale/Scope**: 4 user stories, 24 functional requirements. Touches: `src/polls/service.ts`
(+1 pure function, +`voterCountLimit`/cross-field validation in `validatePollPatch()`),
`src/polls/store.ts` (`voterCountLimit` type), `src/routes/pollsApi.ts` (duplicate route
extended), `src/public/app.js` (header rendering consolidated), `src/public/adminList.js`
(actions menu rewrite), `src/public/adminPoll.js` (back-link markup, cross-field
reload-on-success wiring, Voter Count Limit clamp/clear, "Ban from Voting" label), 7 HTML
pages' header markup, `admin-poll.html`'s field markup/layout, 5 CSS files reorganized
(research.md R3) plus the new `admin.css` field-layout rules, and `postman/openapi.json`
(`voterCountLimit` now nullable) — no new files, no new collections, no new API endpoints.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Think Before Coding | Spec clarified via 1 `/speckit-clarify` round (keyboard/ARIA level for the actions menu); every other ambiguity in the source design doc (menu icon shape, title case-sensitivity, header scope beyond `/admin`, the "View Results Admin-mode" wording) was resolved as a documented spec Assumption rather than guessed silently; the stylesheet-bleed risk found while researching header unification (research.md R3) was surfaced and designed around rather than shipped as a latent bug | ✅ PASS |
| II. Simplicity First | No new dependencies; header unification extends the existing empty-shell + JS-render pattern already used by 3 of 7 pages to all 7, instead of inventing a templating mechanism; the actions menu is hand-rolled vanilla JS/CSS (4 static items), matching the codebase's zero-client-dependency convention (research.md R2) | ✅ PASS |
| III. Surgical Changes | CSS reorganization (research.md R3) only relocates selectors that were already meant to be page-wide (header rules), not new styling; the now-orphaned `.admin-brand*` rules and the legacy `#site-header`/`.header-user`/`.avatar-menu` duplicate rules in `styles.css` are removed as part of this change since this feature is what makes them dead code, per "remove orphaned ... code your change creates" | ✅ PASS |
| IV. Goal-Driven Execution | Title-uniqueness logic gets automated unit + integration tests (data-model.md); actions-menu keyboard/ARIA behavior and header visual identity get an explicit runnable manual check per user story in quickstart.md | ✅ PASS |
| V. Code Quality & Maintainability | Title-uniqueness logic isolated in one pure, independently-testable helper (`nextAvailableCopyTitle`) rather than mixed into the route handler; actions-menu markup/behavior isolated in `adminList.js`; the header now has exactly one implementation (`renderSiteHeader`) instead of two diverging ones (`renderHeader`/`renderHeaderActions`) | ✅ PASS |
| Security, Privacy & Reliability | No new input surface — duplicate-title generation reads existing server-side data only; the `requireAdmin` gate on the duplicate route is unchanged | ✅ PASS |
| Performance & Operational Efficiency | Title-uniqueness check is one bounded query per duplicate action (research.md R1), no N+1 pattern, no new continuous/background process | ✅ PASS |

**User Story 4 gate re-check** (added after US1–US3 above; same table, same principles):
no new dependencies (extends the existing `validatePollPatch()`/`wireSelectField()`
patterns rather than introducing new ones — Simplicity First); the Results
Visibility/Access Mode invariant is enforced once, server-side, in `validatePollPatch()`
rather than duplicated in client JS, with the client re-fetching on success instead of
re-implementing the rule (Surgical Changes, Code Quality); the auto-correction is unit- and
integration-tested (`polls-service.test.ts` default assertion,
`polls-admin-crud.test.ts`/`polls-admin-participants.test.ts` cross-field and
null-safety cases) while the back-link, label-left layout, and spacing are DOM/visual-level
and validated manually via `quickstart.md` (Goal-Driven Execution); no new input surface
beyond the existing admin-only `PATCH /api/admin/polls/:pid` route, and the null-safety fix
in `validateVoteSubmission()` closes a latent bug the type-narrowing would otherwise have
introduced (Security, Privacy & Reliability). ✅ PASS

**Post-Phase-1 re-check**: `data-model.md` introduces no new fields/collections/indexes for
User Stories 1–3 (research.md "Out of scope" still holds for the duplicate endpoint). User
Story 4 narrows `voterCountLimit`'s existing type (no migration) and adds a cross-field
invariant to the existing `PATCH /api/admin/polls/:pid` handler — a behavior/contract change
to an existing endpoint, not a new one, reflected in `postman/openapi.json`
(`voterCountLimit` now `["integer", "null"]`) and `contracts/ui-contracts.md`'s new "Poll
editor HTTP contract" section. No additional dependencies, projects, or patterns beyond
what's justified above. ✅ PASS — no Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/005-admin-page-improvements/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── ui-contracts.md
├── checklists/
│   └── requirements.md  # already validated (/speckit-specify, /speckit-clarify)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── polls/
│   ├── service.ts          # EXTENDED: new pure `nextAvailableCopyTitle(baseTitle,
│                            #   existingTitles)` helper alongside the existing
│                            #   `duplicatePoll()` (research.md R1, data-model.md);
│                            #   `duplicatePoll()` itself is unchanged. US4: `createDefaultPoll()`
│                            #   now sets `voterCountLimit: null`; `validatePollPatch()` gains the
│                            #   Results Visibility/Access Mode cross-field invariant and the
│                            #   accessMode-driven Voter Count Limit default (FR-014–021);
│                            #   `validateVoteSubmission()`'s voter-cap check is null-safe
│   └── store.ts             # US4 EDITED: `Poll.voterCountLimit` type narrows from `number`
│                            #   to `number | null` (data-model.md)
├── routes/
│   └── pollsApi.ts          # EXTENDED: POST /api/admin/polls/:pid/duplicate queries
│                            #   existing titles matching the source's base title,
│                            #   calls nextAvailableCopyTitle, sets it on the copy
│                            #   before insert, then does the bounded post-insert
│                            #   recheck/rename retry (research.md R1)
└── public/
    ├── app.js               # REWORKED: renderHeader() + renderHeaderActions() merge
    │                        #   into one renderSiteHeader(me, config) (research.md
    │                        #   R3), mounted into #site-header on every page's init()
    ├── index.html            # EDITED: hardcoded header block replaced by the
    │                        #   `<header id="site-header"></header>` shell
    ├── admin.html             # EDITED: `.admin-brand` header replaced by the same shell
    ├── admin-poll.html         # EDITED: back-arrow-only header replaced by the same shell.
    │                        #   US4 EDITED: gains a new below-header back link to `/admin`
    │                        #   (FR-012), relabeled Access Mode options (FR-013), Voter Count
    │                        #   Limit `max="500"` + its own error slot, and
    │                        #   `.admin-field--inline`/`.admin-field--tight` classes on
    │                        #   Title/Subtitle/Choices/Voter Count Limit (FR-023/024)
    ├── admin-results.html      # EDITED: back-arrow-only header replaced by the same shell
    ├── login.html              # EDITED: gains the `.page-decor`/`.page`/`.container`/
    │                        #   `.layout` wrapper around the existing empty header
    │                        #   shell (research.md R3) + a `site.css` <link>
    ├── profile.html            # EDITED: same as login.html
    ├── create-account.html     # EDITED: same as login.html
    ├── adminList.js            # REWORKED: Actions column renders one kebab-trigger
    │                        #   button + menu per row instead of 4 flat elements;
    │                        #   open/close/keyboard-nav/focus-return/viewport-flip
    │                        #   logic (contracts/ui-contracts.md); the four actions'
    │                        #   own destinations/handlers are unchanged
    ├── adminPoll.js            # US4 EDITED: `wireSelectField()` gains an opt-in
    │                        #   `reloadOnSuccess` (used by resultsVisibility/accessMode so a
    │                        #   server-driven side effect on the other field is picked up);
    │                        #   new `wireVoterCountLimitField()` clamps to 500 and sends
    │                        #   `null` when cleared; `removeButton()`'s label changes to
    │                        #   "Ban from Voting" (FR-022); `load()` null-coalesces
    │                        #   `voterCountLimit` to `""` (an input's `.value` setter would
    │                        #   otherwise stringify `null` to the literal text "null")
    ├── admin.css               # EXTENDED: `.actions-menu-trigger`/`.actions-menu` styles.
    │                        #   US4 EXTENDED: `.admin-back-link`, `.admin-field--inline`,
    │                        #   `.admin-field--tight` (FR-012/023/024)
    ├── site.css                # EXTENDED: becomes the canonical header stylesheet —
    │                        #   gains `.site-header`/`.brand*`/`.header-nav*`/
    │                        #   `.header-search*`/`.btn-header-*` (moved from
    │                        #   pollGrid.css) + the `:root` tokens they need
    │                        #   (research.md R3); `.admin-brand*` rules removed
    │                        #   (orphaned by the admin.html edit above)
    ├── pollGrid.css            # EDITED: loses the header/brand/nav/search rules
    │                        #   moved to site.css (research.md R3); keeps only the
    │                        #   card-grid/filter-bar layout rules index.html needs
    └── styles.css               # EDITED: loses the now-superseded `#site-header`/
                                # `#site-header nav`/`#site-header a`/`.header-user`/
                                # `.avatar-menu` rules (site.css's versions now apply
                                # everywhere); keeps its non-header page rules

tests/
├── polls-service.test.ts       # EXTENDED: unit tests for nextAvailableCopyTitle
│                                #   (base case, one collision, many collisions).
│                                #   US4: createDefaultPoll() asserts voterCountLimit is null
├── polls-admin-crud.test.ts    # EXTENDED: duplicate-endpoint tests — repeated
│                                #   duplication produces "X Copy", "X Copy 1", ...;
│                                #   archived/closed polls' titles also count.
│                                #   US4: Results Visibility/Access Mode cross-field
│                                #   auto-correction (both directions), Voter Count Limit's
│                                #   500/blank transitions, and explicit-clear-to-null
└── polls-admin-participants.test.ts  # US4 EXTENDED: a blank voterCountLimit does not
                                       #   cap voting on a PRIVATE_POLL_ANYONE_WITH_THE_LINK poll

postman/
└── openapi.json                # US4 EDITED: voterCountLimit schema is now ["integer", "null"]
```

**Structure Decision**: Single project, existing layout extended — no new top-level
directories or collections. The notable structural decisions are (1) consolidating header
ownership into one JS function (`renderSiteHeader`) and one canonical stylesheet (`site.css`)
instead of per-page markup, so "identical header" is enforced by construction rather than by
convention, and (2) keeping the new title-uniqueness logic as a pure, independently-testable
function in `service.ts` next to the existing `duplicatePoll()` it complements, with the only
I/O (the title query and the race-guard recheck) living in the `pollsApi.ts` route handler
that already owns the collection accessor.

## Complexity Tracking

*No entries — Constitution Check reported no violations requiring justification.*
