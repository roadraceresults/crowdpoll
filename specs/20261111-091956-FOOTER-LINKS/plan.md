# Implementation Plan: Footer Links

**Branch**: `20261111-091956-FOOTER-LINKS` | **Date**: 2026-11-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/20261111-091956-FOOTER-LINKS/spec.md`

## Summary

Three fixes around the footer's links and one rule behind them. On a phone the legal pages' text gutter formula goes
negative and squeezes the text; below 640 px the Back arrow bar joins the page flow above the title and the gutter goes
(R1). The home page keeps its active tab in its address, `/?tab=<name>`, written with `history.replaceState` by the one
`select` path and honoured for all nine tabs on load, with a guest's personal tab falling back to Trending and the search
terms leaving the address with the Search tab (R3, R4, R5). `backArrow.js` exposes one rule, `window.SiteBack`
("came from this site in this browser tab: go back; otherwise the fallback"), used by the legal arrow, by the Delete
Account dialog's Cancel and Escape (decided when the dialog opens, close in place otherwise) and by the admin page's
arrow (fallback `/`) (R2, R6, R7). No route, cookie, storage key, setting, stylesheet or dependency.

## Technical Context

**Language/Version**: browser: vanilla ES2020 in `src/public/` (no bundler); tests in TypeScript on Node.js ≥ 22 (ESM)

**Primary Dependencies**: none new (jsdom for the client tests, as today)

**Storage**: N/A: the browser's address (`?tab=`) and `history.state`; no server data, cookie or storage key (FR-016)

**Testing**: Vitest; jsdom client tests via `tests/helpers/browser.ts` (`openPage` with `url`, `referrer`,
`beforeScripts`); static checks on the stylesheets (`legal-pages.test.ts`, `m3-assets.test.ts`, `cookie-use-list.test.ts`)

**Target Platform**: evergreen browsers, phones 360–430 px wide included; the `web` service serves the static files

**Project Type**: single project (web service with static front end)

**Performance Goals**: no extra request on any path; one `replaceState` per tab change

**Constraints**: no new history entry on a tab change (FR-004); the legal pages at 640 px and wider unchanged (FR-002);
the footer, legal texts and Cookie Use table unchanged (FR-016, FR-017); nothing written to the browser console

**Scale/Scope**: changed `src/public/legal-m3.css`, `src/public/backArrow.js`, `src/public/tabs.js`,
`src/public/profileCard.js`, `src/public/adminList.js`, `src/public/privacy.html`, `src/public/terms.html`,
`src/public/profile.html`, `src/public/admin.html`; tests (R8); `README.md`, `ARCHITECTURE.md`, `CLAUDE_COMPLETE.md`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Think Before Coding**: PASS. Seven requirements findings are resolved and the two clarifications settle the
  address rule. R5 decides the guest fallback's address for FR-004.
- **II. Simplicity First**: PASS. Two CSS rules move under media queries; one `replaceState` in the existing `select`;
  one twenty-line rule exported from the script that already computes it; no new file but a test.
- **III. Surgical Changes**: PASS. Each change is one existing function gaining the rule (`select`, `takeLanding`/`init`,
  `openDeleteDialog`, `guardNavigation`); the legal arrow's depth counting, the footer and the delete request are
  untouched. The one marker added to markup (`data-back-arrow`) is what lets the script load elsewhere without drawing.
- **IV. Goal-Driven Execution**: PASS. Every FR maps to a test in R8 or a quickstart step; the old gutter line's pin in
  `legal-pages.test.ts` is replaced by pins on the new rules.
- **V. Code Quality & Maintainability**: PASS. The rule lives once (`SiteBack`), the address writer once (`select`),
  the tab-name mapping once (`tabFromAddress`). Nothing is logged in the browser.
- **VI. Self-Documenting Code**: PASS. Names: `SiteBack.canReturn`, `SiteBack.leave`, `showTabInAddress`,
  `tabFromAddress`, `TAB_NAMES`, `returns`, `dismiss`. No requirement ids in code.
- **Security, Privacy & Reliability**: PASS. The referrer is compared by origin only, never logged; the address gains
  a tab name only; a malformed referrer or an unknown name is handled (false / default).
- **Documentation Deliverables**: README.md and ARCHITECTURE.md are updated in the task list's documentation phase.

**Post-Phase-1 re-check**: PASS. The design adds one global (`window.SiteBack`), one body attribute, two script tags,
one query parameter the page already understood for four tabs, and moves two stylesheet rules.

## Project Structure

### Documentation (this feature)

```text
specs/20261111-091956-FOOTER-LINKS/
├── plan.md              # This file
├── research.md          # R1–R8
├── data-model.md        # the address parameters, history state, SiteBack, the dialog decision, page markup
├── quickstart.md        # automated and manual checks
├── contracts/
│   └── ui-contracts.md  # C1–C6: phone layout, address, Delete dialog, SiteBack, admin arrow, unchanged
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/public/
├── legal-m3.css      # gutter rule under min-width 640px; static .back-arrow-bar under max-width 639.98px (R1)
├── backArrow.js      # window.SiteBack { canReturn, leave }; arrow drawn only with body[data-back-arrow] (R2)
├── tabs.js           # TAB_NAMES, showTabInAddress in select, tabFromAddress, takeLanding keeps tab, init order (R3, R4)
├── profileCard.js    # openDeleteDialog(opener, returns); dismiss(): history.back() or close in place (R6)
├── adminList.js      # guardNavigation: .admin-back-link → SiteBack.leave("/") (R7)
├── privacy.html      # <body data-back-arrow>
├── terms.html        # <body data-back-arrow>
├── profile.html      # + <script src="/backArrow.js" defer>
└── admin.html        # + <script src="/backArrow.js" defer>
tests/                # see research R8 (new client-tab-address.test.ts; updated legal-pages, client-back-arrow,
                      # client-delete-account, client-admin-discard, client-landing, client-home)
```

**Structure Decision**: the existing single project; every change extends an existing file, plus one new test file.

## Complexity Tracking

No violations.
