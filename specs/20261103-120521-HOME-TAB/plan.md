# Implementation Plan: Home Tab

**Branch**: `home-tab` | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261103-120521-HOME-TAB/spec.md`

## Summary

A ninth tab, **Home**, first in the bar and the landing tab for signed-in users, lists in one place the polls shared with the user, their own, those they voted in, those they watch, then what is trending — each poll once, under the first of five rules it matches.

- **Membership, cached per user** (research R1): `home:<emailKey>` in the cache holds the ordered pids, why each is listed and the user's list version (`tabs:v`) it was built under, for `ENV_HOME_TAB_REFRESH_INTERVAL` (2 h). It is built on demand, never by a sweep.
- **One rebuild query** (R2–R4): rules 1–4 come from one indexed read of `user_polls ⨝ polls` with the state and date windows in SQL (OPEN launched ≤ 2 months, CLOSED closed ≤ 7 days, WAITING TO OPEN always); rule 5 reads the cached TRENDING listing. The existing narrowing functions (`sharedWithYouKept`, `reachableMany`, `mayWatchMany`) keep each rule identical to its tab.
- **Fresh where it matters** (R5, R6): every refresh re-checks access and serves live counts through the personal tabs' delta path; `forgetTabs` already changes the list version on every relation write, so the user's own changes rebuild at the next refresh — except a change made on a Home card, where the browser sends `keepOrder` until Home is next opened (clarification Q2).
- **Reasons on the cards** (R7, clarification Q1): the overlay's `relations` adds `created` ("Your poll") and `trending` ("Trending").
- **Browser** (R9–R11): the tab is hidden for guests (UA3), the avatar menu gains Home first, with a house icon drawn in SVG.

## Technical Context

**Language/Version**: TypeScript on Node ≥ 22, ESM; browser: vanilla JavaScript.

**Primary Dependencies**: Express 5, Kysely (PostgreSQL), BetterAuth; no new dependency.

**Storage**: no migration. One cache key per active user, `home:<emailKey>`, JSON, TTL = the interval (data-model.md). Valkey in production, `memoryCache` in development and tests.

**Testing**: Vitest with supertest and embedded PostgreSQL; jsdom client suites through `tests/helpers/browser.ts` (research R14).

**Target Platform**: DigitalOcean App Platform, the existing `web` service; desktop and phone browsers.

**Project Type**: web service with a browser client.

**Performance Goals**:
- A Home rebuild: one indexed `user_polls ⨝ polls` read, one row load, and the narrowing reads — about one personal-tab refresh (SC-008).
- At most one rebuild per user per interval plus one per change of their own relations (SC-003, FR-019); none for users who do not open Home.
- Between rebuilds a refresh costs what a personal-tab refresh costs; unchanged refreshes take the existing counts-only shortcut.
- Rule 5 adds no database read.

**Constraints**:
- No sweep, table, cookie or browser storage key; one new route (A1) and two settings (`ENV_HOME_TAB_REFRESH_INTERVAL`, `ENV_MAX_HOME_PAGE_POLLS`).
- Logs carry no email address (the key is the email key); `postman/openapi.json` gains A1.
- The terms gate refuses A1 before acceptance, as for every personal tab.

**Scale/Scope**:
- Server, 5 files: new `src/polls/homeTab.ts`; changed `src/routes/tabsApi.ts`, `src/config.ts`, `src/refresh/tabVersions.ts` (two counter keys), `src/polls/userPolls.ts` (the `HomeReason` type on `PersonalTab.relations`).
- Client, 6 files: `index.html`, `tabs.js`, `tabBarScroll.js`, `deltaClient.js` (unchanged pass-through, verified), `pollCard.js`, `app.js`.
- Docs and config: `postman/openapi.json`, `.claude/rules/environment.md`, `launch.json.example`, `devScripts.example/launch-dev.ps1`, `.do/app.yaml`.
- Tests: `home-tab.test.ts`, `client-home-tab.test.ts`, `client-home-menu-item.test.ts`, plus `config.test.ts` and the suites that count tabs or menu items.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | Every decision cites its finding or clarification (research R1–R14); the RS1 measurement, the `launched_at` gap (TD1) and the Q2 trade-off are written down | Pass |
| II. Simplicity First | One module (`homeTab.ts`), one route reusing `personalListing`/`computeDelta`/`shortcut`, one cache key, two settings. No sweep, no table, no new response shape | Pass |
| III. Surgical Changes | The four personal-tab routes are untouched; `tabs.js` gains one controller and the landing line; the menu gains one item; `buildTabMenu`/`moveTabFocus` gain a `hidden` skip | Pass |
| IV. Goal-Driven Execution | quickstart.md scenarios 1–14 map to US1–US4 and SC-002–SC-007; R14 names the suites | Pass |
| V. Code Quality | Cache failures log `[home] Could not …` and fall back to a rebuild or an uncached answer; `stats:home:*` counters instead of per-request logs; an invalid interval is a `ConfigError` | Pass |
| VI. Self-Documenting Code | `loadHomeCandidates`, `composeHomeTab`, `readHomeMembership`, `HomeReason`, `keepOrder` carry the meaning; comments only point to the findings | Pass |
| Security, Privacy & Reliability | Signed-in only; access re-checked on every refresh (FR-015); no invitation is accepted by Home (FR-012); no email in logs or keys | Pass |
| Performance & Operational Efficiency | Work ∝ active users; rule 5 from the cache; the shortcut serves unchanged refreshes | Pass |
| Documentation Deliverables | README.md and ARCHITECTURE.md are updated after implementation (the tab, its rules and the Home membership on the refresh path) | Deferred to after implementation |

**Gate result**: no violations; Complexity Tracking is empty.

**Post-design re-check**: unchanged. The design adds only the optional `keepOrder` request field (A1) to carry clarification Q2 without a server-side record of where a change came from.

## Project Structure

### Documentation (this feature)

```text
specs/20261103-120521-HOME-TAB/
├── plan.md              # This file
├── research.md          # R1–R14
├── data-model.md        # the Home membership, rules, setting, counters
├── quickstart.md        # 14 scenarios
├── contracts/
│   ├── api.md           # A1–A3
│   └── ui-contracts.md  # C1–C6
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── config.ts                  # homeTabRefreshIntervalMs (R12), maxHomePagePolls
├── polls/
│   ├── homeTab.ts             # new: loadHomeCandidates, composeHomeTab, readHomeMembership, homeTabListing (R1–R6)
│   └── userPolls.ts           # HomeReason on PersonalTab.relations (R7)
├── refresh/tabVersions.ts     # HOME_REBUILT_KEY, HOME_REUSED_KEY (R13)
├── routes/tabsApi.ts          # POST /api/tabs/home/refresh (A1, R8)
└── public/
    ├── index.html             # Home tab button and panel (C1)
    ├── tabs.js                # home controller, keepOrder, landing, guest hiding (C2, C3)
    ├── tabBarScroll.js        # skip hidden tabs in the "All tabs" menu (C1)
    ├── pollCard.js            # "Your poll", "Trending" (C4)
    └── app.js                 # HOME_GLYPH, Home menu item (C5)

tests/
├── home-tab.test.ts           # new
├── client-home-tab.test.ts    # new
├── client-home-menu-item.test.ts  # new
└── config.test.ts             # extended

postman/openapi.json, .claude/rules/environment.md, launch.json.example,
devScripts.example/launch-dev.ps1, .do/app.yaml
```

**Structure Decision**: the existing single project. Home sits beside the personal tabs in `src/polls/` and `src/routes/tabsApi.ts`, and beside the other tabs in `src/public/tabs.js`.

## Complexity Tracking

None.
