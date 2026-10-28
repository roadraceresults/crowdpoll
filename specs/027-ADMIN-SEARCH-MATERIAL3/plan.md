# Implementation Plan: Admin Search, Material 3

**Branch**: `dev` (no dedicated branch) | **Date**: 2026-10-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/027-ADMIN-SEARCH-MATERIAL3/spec.md`

## Summary

The administration page's Search view has a structured search form (`form.admin-search#adminSearchForm`, 15
controls in three wrapped rows, placeholder-only labels, full page width, 12 px corners, no shadow) and a
status line (`p.admin-search-notice#adminSearchNotice`). Both are styled by the production sheet `admin.css`;
neither is in a Material 3 layer. 027 makes the form a card-sized panel — the poll cards' own container
rule, shared by selector — restyles it as one column of outlined Material 3 fields with visible labels, a
filled **Search** and a text **Clear**, shows visibility, choice mode and vote mutability as three radio
groups (Any and the two choices in one row each) to save vertical space, and restyles the status line as
supporting text with a live-region role, the panel can be collapsed by a toggle above it and collapses after a search with results (FIX05), and the read-only poll card regains its Created By line (FIX04). It is
mostly a client-only change: one new stylesheet and new form markup; `adminList.js` gains one ripple line and
loses the Search view's pre-search prompt (FIX02). The one server addition is the creator's name and email on
the administration list rows (R12). No server, route, contract,
configuration, data or migration change; every id, field name and button class the script and tests use is
preserved, so `readSearchForm()` and the search request are untouched.

## Technical Context

**Language/Version**: JavaScript (browser, classic scripts) and CSS under `src/public/`; the server (TypeScript
5.8, Node 22) changes only to add two fields to the admin list rows

**Primary Dependencies**: none new — the existing `m3-tokens.css`, `M3Ripple`, `adminList.js`

**Storage**: none new: no schema change, and nothing stored in the browser

**Testing**: Vitest + jsdom (`tests/helpers/browser.ts`), plus static stylesheet assertions in the style of
`tests/m3-assets.test.ts` and `tests/tab-bar-assets.test.ts`

**Target Platform**: evergreen browsers; the page is served by the existing Express static pipeline

**Project Type**: web application (Express server + static client)

**Performance Goals**: no measurable cost — static markup, one stylesheet (~200 lines), one toggle handler

**Constraints**: preserve ids `adminSearchForm`, `adminSearchClear`, `adminSearchNotice`, every control
`name`, and the classes `admin-search-btn` / `admin-search-clear` (FR-009); `m3-assets.test.ts` allowlists each
page's stylesheets, so the new layer must be added to its list; no literal font sizes, no `M3:` /
requirement comments, no dark `@media` twins (the admin page stays light, 024 Step 5); Constitution VI

**Scale/Scope**: 1 HTML file (`admin.html`), 1 new stylesheet, 1 edited stylesheet (`admin.css`), 1 script (`adminList.js`: one ripple line, the pre-search prompt removed), `adminCard.js` (Created By), `pollsApi.ts` and `store.ts` (creator fields), 1 test file updated (`m3-assets.test.ts`) plus `polls-admin-crud.test.ts` and `client-home.test.ts`, 2 new test files, `postman/openapi.json`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | 11 architecture findings and 1 clarification were resolved before this plan; four later fixes (FIX01–FIX04) are recorded in `fix.md`. Reading the code surfaced a conflict the spec does not mention: the admin cards use *underlined* fields (`m3-field-input`), while FR-005 asks for *outlined* ones. The spec is explicit, so the plan follows it and records the difference (R2) | Pass |
| II. Simplicity First | One new stylesheet, no new script file, no framework; native `select` / `date` inputs kept; the disclosure is one button, one region and about forty lines of script; the card and the panel share one geometry rule instead of a copy | Pass |
| III. Surgical Changes | Files are enumerated in Project Structure. The old `.admin-search*` rules in `admin.css` become orphaned by the new markup and are removed; nothing else in `admin.css` changes | Pass |
| IV. Goal-Driven Execution | FR-001–FR-014 and SC-001–SC-005 are testable; `research.md` R10 names every test; `quickstart.md` maps each user story to a check | Pass |
| V. Code Quality | `adminList.js` gains small single-purpose functions (`hiddenFilterActive`, `applyMoreFilters`); errors from a blocked store are swallowed as `TAB_KEY` already does; the browser logs nothing new | Pass |
| VI. Self-Documenting Code | New CSS and JS carry no requirement ids or `M3:` comments; the one comment is an external link to the Material 3 text-field spec | Pass |

**Post-design re-check**: unchanged; Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/027-ADMIN-SEARCH-MATERIAL3/
├── plan.md
├── research.md           # R1–R10
├── data-model.md         # client-side state only
├── quickstart.md
├── contracts/
│   └── ui-contracts.md   # markup, preserved names, states, accessibility
└── tasks.md              # /speckit-tasks — not created here
```

### Source Code (repository root)

```text
src/public/
├── admin.html             # new form markup (radio groups), the collapse toggle, status line role, new <link>
├── admin-search-m3.css    # NEW: the Material 3 layer for the panel, fields, buttons, disclosure, status line
├── admin.css              # card + panel share one geometry rule; the old .admin-search* rules removed
├── adminList.js           # ripple registration; the pre-search prompt removed; collapsing the panel (FIX05)
└── adminCard.js           # Created By line on the read-only card
src/polls/store.ts         # creatorEmails()
src/routes/pollsApi.ts     # createdByName / createdByEmail on the admin list rows
postman/openapi.json       # AdminPollSummary: the two new fields
tests/
├── m3-assets.test.ts              # allowlist: admin-search-m3.css after admin-card-m3.css
├── client-admin-search.test.ts    # NEW: structure, labels, disclosure, forced open, Clear, storage
└── admin-search-assets.test.ts    # NEW: geometry shared with the cards, sizes, motion, no literal sizes
```

**Structure Decision**: web application, existing layout; no new script and no server file. The M3 layer is a
sibling of `admin-card-m3.css`, as 024 did for each area.

## Complexity Tracking

No Constitution Check violations.
