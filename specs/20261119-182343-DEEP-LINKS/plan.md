# Implementation Plan: Deep Links

**Branch**: `deep-links` | **Date**: 2026-11-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261119-182343-DEEP-LINKS/spec.md`

## Summary

A maximized poll gets an address (`/?tab=<tab>&PID=<pid>`), a search writes its terms (`q`), and every published poll's card
gets a Share button that offers the poll link (`/?PID=<pid>`) through the share sheet or the clipboard. When an address is
opened, the server keeps its `tab` only when it fits the visitor and otherwise chooses one (Your Polls, Shared With You, Your
Votes, Watching, Home), in the same request that already decides whether they may see the poll; the browser shows that tab
behind the poll from the start. The tab rides through login beside `PID`. Nothing is stored.

## Technical Context

**Language/Version**: TypeScript on Node ≥ 22 (ESM) for the server; plain ES2020 browser scripts, no framework, no bundler

**Primary Dependencies**: Express 5, Kysely (PostgreSQL), BetterAuth; browser: History API, Web Share API, Clipboard API

**Storage**: none added (reads `polls` and `user_polls`)

**Testing**: Vitest + supertest + embedded-postgres; jsdom for client scripts (`tests/helpers/browser.ts`)

**Target Platform**: DigitalOcean App Platform (Linux); current Safari, Chrome, Edge, Firefox, including phones

**Project Type**: web application (server-rendered pages + vanilla client scripts)

**Performance Goals**: an opened link costs one more indexed select (`user_polls` by email and poll); no extra round trip in the browser

**Constraints**: no new cookie or storage key; no third-party request; M3 tokens only in M3 sheets; client scripts must not
depend on their own names (the build transforms them); `window.SiteBack` rule unchanged

**Scale/Scope**: about 17 source files touched, 1 new client file; no migration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Think before coding | The one spec reading that needed a choice (Share for `WAITING TO OPEN`, research R8) and the reversal of today's "closing removes the retained card" (R4) are stated, not silent. | Pass |
| II. Simplicity first | One pure `chooseTab`; one address helper per side; one grid field (`keptPid`) keeps a closed retained card until the tab's next server answer (R4); no new storage, no new route. | Pass |
| III. Surgical changes | `adminCard.js` changes only to call the shared link helper it would otherwise duplicate; no unrelated cleanup. | Pass |
| IV. Goal-driven | Every contract rule (L1–L12, S1–S9) maps to a test (research R10) or a quickstart step. | Pass |
| V. Quality, errors, logging | Malformed `tab`/`PID` ignored; share/copy failures reported in the snackbar; server logs the chosen and asked tab, no address or id of the visitor; browser logs nothing. | Pass |
| VI. Self-documenting | No comments citing this spec; the one external-docs comment allowed is the Web Share API link. | Pass |
| Security & privacy | Visibility rules untouched (`decideSharedLink` decides first); a tab never reveals a poll; nothing new written (L6). | Pass |
| Documentation deliverables | README (Share, links) and ARCHITECTURE (link landing) in the task list's last phase. | Pass |

Post-design re-check: unchanged, Pass.

## Project Structure

### Documentation (this feature)

```text
specs/20261119-182343-DEEP-LINKS/
├── plan.md
├── research.md          # R1–R10
├── data-model.md        # tab names, link request, facts, chooseTab, address states
├── quickstart.md
├── contracts/
│   ├── links.md         # L1–L12
│   └── share.md         # S1–S9
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── polls/sharedLink.ts        # LANDING_TABS, parseTab, chooseTab, decideSharedLink(…, request), landingUrl(q), sharedLinkQuery
├── routes/pages.ts            # GET / passes tab and q; guest login address and /login, /create-account redirects carry tab
├── routes/api.ts              # verify redirect, login error addresses, create-account link carry tab
├── auth/auth.ts               # emailed verify link carries tab
└── public/
    ├── sharePoll.js           # NEW: SharePoll.link / copy / share, snackbar
    ├── tabs.js                # addressWithPoll / addressWithoutPoll, step URLs, landing, kept card (keptPid, releaseKept), showSearchTerms
    ├── searchTab.js           # writes and clears q; releaseKept before rendering a search answer
    ├── trending.js, newest.js # releaseKept before rendering a server answer (not on local re-renders)
    ├── pollCard.js            # .share-btn on both faces, shown for published states
    ├── adminCard.js           # pollLink / copyPollLink call SharePoll
    ├── cardShell.js           # sharedTab, sharedLinkQuery
    ├── loginCard.js           # callbackURL and magic-link body carry tab
    ├── confirmSigninCard.js   # loginHref carries tab
    ├── index.html, admin.html # load sharePoll.js
    ├── pollCard-m3.css        # .share-btn joins the header-button rules
    └── phone-card-m3.css      # .share-btn 48 px + halo; title reserve grows (.has-share)

postman/openapi.json           # optional tab on the magic-link request and /api/auth/verify

tests/
├── shared-link-tab.test.ts    # NEW: chooseTab table, GET / redirects, guests, LANDING_TABS = TAB_NAMES, no bookmark written
├── client-share-button.test.ts    # NEW
├── client-search-address.test.ts  # NEW
├── client-maximized-history.test.ts  # address on push/pop/drop
├── client-landing.test.ts     # address after landing; retained card stays (R4)
└── client-login-pid.test.ts   # tab beside PID
```

**Structure Decision**: the existing single web project; server changes live beside the shared-link decision they extend, client
changes in the scripts that own the address, the card and login.

## Complexity Tracking

No violations.
