# Implementation Plan: Home Page Tabs

**Branch**: `dev` (no dedicated branch) | **Date**: 2026-10-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/026-HOME-PAGE-TABS/spec.md`

## Summary

Today the home page has `Trending · Newest · My Private Polls · Favorites · Live Results · Search`, and a
shared poll link (`/?PID=<id>`) is handled entirely in the browser: a guest is sent to `/login`, the id waits
in `localStorage`, and after sign-in a client `POST /api/me/polls/:pid/link` records a `linked` relation and
selects My Private Polls. 026 replaces the tab set with `Your Polls · Shared With You · Your Votes ·
Trending · Newest · Watching · Live Results · Search`, narrows Favorites to deliberate watches and renames
it Watching (eye icon), and makes the link flow server-driven: the server decides, records the view and
lands the visitor on the right tab (or the one generic notice) while serving `GET /`; the poll id travels
through the sign-in URLs and emailed link (never `localStorage`, never a cookie), including create-account
and OAuth. A new `mayWatch` predicate gates watching; an unpublished poll shows as a server-redacted
placeholder; shrinking an invite list deletes the dropped `invited` relations. No new table, column, index,
migration, `ENV_*` variable or relation value: the stored form of a *view* is the existing `linked` relation
(R1).

## Technical Context

**Language/Version**: TypeScript 5.8 (server, `src/`); JavaScript (browser, classic scripts) for
`src/public/*.js`; Node 22

**Primary Dependencies**: none new — Express, Kysely, BetterAuth (magic-link `metadata`), the existing
`PollCard`/`Tabs`/`DeltaClient` browser modules

**Storage**: PostgreSQL — no schema change. `user_polls.relation` (plain `text`) keeps its five values;
`linked` is the view (`data-model.md`)

**Testing**: Vitest + supertest + embedded-postgres + jsdom, the project's existing suite

**Target Platform**: unchanged — Linux server (Express) + evergreen browsers

**Project Type**: web application (Express server + static client under `src/public/`)

**Performance Goals**: the three new personal tabs cost what My Private Polls and Favorites cost (one
`personalTabQuery` + one `overlay` + one `voteBlocks` per refresh); `mayWatch` is batched per listing (R6),
never one query per card; the link route adds one indexed point lookup and one upsert (skipped when under a
minute old)

**Constraints**: no new `ENV_*` variable; no cookie other than `session_token`; no open redirect; a guest's
response to `/?PID=` identical for every poll; `postman/openapi.json` kept in sync (`openapi-contract.test.ts`);
identifiers keep the word `bookmark` (A12); Constitution VI (no requirement/task ids in `src/` comments)

**Scale/Scope**: 4 personal refresh routes (replacing 2), 1 retired link route, 1 new poll-fetch route,
`GET /`, `/login`, `/create-account`, 3 auth routes + the magic-link sender + mailer, `updatePoll`, 6 browser
files (`index.html`, `tabs.js`, `pollCard.js`, `deltaClient.js`, `loginCard.js`, `createAccountCard.js`) plus
`tabs.css`/`pollCard-m3.css` and 2 icons, ~12 existing test files updated, ~10 new test files,
`postman/openapi.json`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | 17 architecture findings and 2 spec clarifications were resolved before this plan. Reading the code surfaced one more: the requirements describe the link as dropped by the server, but a client-side flow already exists with a `linked` relation (R1). The plan states the correction and reuses what exists rather than building a parallel `viewed` value | Pass |
| II. Simplicity First | No new table, column, relation value, env variable or cache. `mayWatch` is one function used by the bookmark route, the Watching query and the overlay. The client `localStorage` hand-off and the `/link` route are deleted, not kept beside the new flow | Pass |
| III. Surgical Changes | Touched files are enumerated in Project Structure; pre-existing dead code is not removed | Pass |
| IV. Goal-Driven Execution | FR-001–FR-033 and SC-001–SC-008 are testable; `quickstart.md` maps each user story to a runnable check; `research.md` R12 names every test file that changes | Pass |
| V. Code Quality | Single-purpose helpers (`parsePid`, `resolveSharedLink`, `mayWatch`, `redactedProjection`); every refusal returns a clear non-crashing response; server logs the link outcome category, never the pid's owner or the email; browser logs nothing new | Pass |
| VI. Self-Documenting Code | Comments only cite external docs; the stale "My PRIVATE POLLS" / FIX024 comments are updated, not extended | Pass |

**Post-design re-check**: unchanged — no complexity violations (Complexity Tracking empty).

## Project Structure

### Documentation (this feature)

```text
specs/026-HOME-PAGE-TABS/
├── plan.md
├── research.md           # R1–R12
├── data-model.md         # no schema change; relation map, projections, query rules
├── quickstart.md         # validation guide
├── contracts/
│   ├── api.md            # routes, redirects, auth `pid`, refresh routes, redacted projection
│   └── ui-contracts.md   # tab bar, cards, placeholder, notices, icons, sign-in line
└── tasks.md              # /speckit-tasks — not created here
```

### Source Code (repository root)

```text
src/
├── polls/
│   ├── sharedLink.ts          # NEW: parsePid, decideSharedLink (pure decision), resolveSharedLink (decision + view write), landing
│   ├── access.ts              # NEW: mayWatch, mayWatchMany (the one access rule), reachable-private rule
│   ├── userPolls.ts           # yourPollsTab, sharedWithYouTab, yourVotesTab, watchingTab; privateTab/favouritesTab removed
│   ├── store.ts               # updatePoll deletes dropped `invited` rows
│   └── bookmarks.ts           # (addBookmark unchanged; guard lives in the route)
├── routes/
│   ├── pages.ts               # GET / link route; /login & /create-account carry PID
│   ├── api.ts                 # `pid` on request-login-link/create-account; verify carries PID
│   ├── pollsApi.ts            # POST /bookmark calls mayWatch
│   └── tabsApi.ts             # 4 personal refresh routes; GET /api/me/polls/:pid; redacted placeholder; /link route removed
├── auth/auth.ts               # sendMagicLink appends PID; OAuth callback carries it
├── email/mailer.ts            # sendCreateAccountInvitation url carries PID (caller passes it)
└── public/
    ├── index.html             # eight tabs, four personal panels, symbols for eye icons
    ├── tabs.js                # PERSONAL_TABS/KIND_OF, controllers, placeBookmark, landing handler; localStorage hand-off removed
    ├── pollCard.js            # state + rejection reason, placeholder, Watch/Watching eye, listed-because words
    ├── deltaClient.js         # relations → "You opened the link" etc.; notPublished/rejectionReason pass-through
    ├── loginCard.js, createAccountCard.js   # send `pid`, show the generic line
    ├── tabs.css, pollCard-m3.css            # tab icons, eye icon states, placeholder
    └── watching-icon.svg / watching-icon-active.svg   # copied from dontTrack/ as inline symbols
postman/openapi.json           # routes, `pid`, `PID`, 404 on bookmark POST, redirects
tests/                         # see research R12
```

**Structure Decision**: web application, existing layout. Two new server modules (`sharedLink.ts`, `access.ts`)
keep the decision logic out of the route files and unit-testable; everything else edits the files that own
the behaviour today.

## Complexity Tracking

No Constitution Check violations.
