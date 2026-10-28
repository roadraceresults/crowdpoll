# Implementation Plan: UI/UX Revisions

**Branch**: `dev` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-UI-UX-revisions/spec.md`

## Summary

Ten revisions across the client, of which eight are presentation and two are a runtime mechanism.
The presentation work has a single organising idea: a **card shell** extracted alongside `PollCard`
rather than from it, which four pages then consume — Login, Create Account, Profile, and a new
refusal page. Those pages stop loading `styles.css` and take the poll grid's stylesheet set
instead, which is what makes the shell's styling apply at all.

The mechanism underneath is a **single session snapshot per page**, owned by `app.js`, shared
between windows, and refreshed on events rather than on a timer. It exists because every
email-link journey in the product ends with an abandoned window showing something untrue: the
window that requested the link keeps a signed-out header, guest-gated cards and a stale address
until someone reloads it. A same-origin broadcast covers windows of one browser; a
visibility/pageshow re-check covers everything else, because the server is the authority.

Two server changes, both to page routes and neither to an API. `GET /profile` gains a narrowly
relaxed guard so a verification link that lands without a session can be told what happened
instead of being redirected to a sign-in form — today that confirmation is silently discarded.
And the admin page routes answer a refusal with a page instead of a JSON fragment.

That second change carries the feature's one real trap. `createRequireAdmin` is a **single factory
with two instances** — `pages.ts` and `pollsApi.ts` — so the obvious implementation, editing the
factory, rewrites every `/api/admin/*` refusal into HTML. The factory gains a parameter; the API
instance is untouched.

No API endpoint changes, no data-model change, no new runtime dependency, and no change to
`postman/openapi.json`.

## Technical Context

**Language/Version**: TypeScript 5.8, ES modules, Node 22 (`@types/node` ^22.15), `strict`. Client
code is plain ES5-compatible browser JavaScript in `src/public` — no build step, no bundler, no
module system beyond one global per file.

**Primary Dependencies**: Express 5.1, MongoDB driver 6.17, BetterAuth 1.3, Nodemailer 7 — all
already present. **No new runtime or development dependency is introduced by this feature.**

**Storage**: MongoDB, unchanged. No collection, field or index is added, removed or migrated.
Browser `localStorage` gains one transient key that carries no personal data.

**Testing**: Vitest 3.2 + supertest 7.1 + mongodb-memory-server 10.1, `npm test`. Existing suites
`tests/pages.test.ts`, `tests/session.test.ts` and `tests/poll-card-assets.test.ts` are the ones
this feature touches.

**Target Platform**: Modern evergreen browsers against a Node 22 server on DigitalOcean App
Platform. `BroadcastChannel` is assumed present and a `localStorage` fallback covers its absence.

**Project Type**: Server-rendered multi-page web application with a static client. Not a SPA — each
page is an HTML file plus deferred scripts.

**Performance Goals**: The feature is net-negative on request volume: it adds no polling, and
`pollGrid.js` stops holding a stale session copy without gaining a fetch. A session re-check costs
one `GET /api/me` at page load, on return to the window, and after the page's own `PATCH`.

**Constraints**: Client JavaScript must run without a build step, so no ES modules, no JSX, no
TypeScript in `src/public`. Every navigation is a declared destination — nothing calls
`history.back()`. Rules promoted into `site.css` reach every page that loads it, so nothing
element-level may move there.

**Scale/Scope**: 4 new client files, ~8 modified client files, 2 modified server files, 1 new page
route response. Participant rosters are bounded by the private voter limit (default 500).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| **I. Think Before Coding** | Assumptions stated before implementation; ambiguities surfaced rather than guessed | **PASS.** The requirements document went through two architecture passes; every inconsistency, ambiguity and clarification is closed in the text. Two questions remain open from `/speckit-clarify` and are carried as explicit assumptions below rather than silently decided. |
| **II. Simplicity First** | Minimum code; nothing speculative | **PASS.** The shell is one file with one entry point and no configuration beyond what four pages pass it. The `localStorage` fallback carries a signal rather than a payload, which is less code than the alternative. No confirmation dialog, no return-URL mechanism, no state library. |
| **III. Surgical Changes** | Touch only what the task requires | **PASS with one deliberate exception.** `styles.css` loses `main.narrow`, a rule this feature makes unreachable. The constitution permits removing what a change orphans. Rules migrating to `site.css` end up defined once, in one sheet — but the migration lands in two steps: added in the foundational phase, removed from `styles.css` in US4, once the pages that still render through them are rebuilt. The overlap between those steps is deliberate and invisible (research R3). |
| **IV. Goal-Driven Execution** | Verifiable success criterion per task | **PASS.** Each server change has a supertest assertion; each asset change has an HTTP-fetched assertion in `poll-card-assets.test.ts`; card behaviour is verified through `quickstart.md`, following the precedent set for 008's presentation work. |
| **V. Code Quality & Maintainability** | Modular, readable, graceful failure, informative logging | **PASS.** The shell is the modularity gain: one definition of a card's structure instead of four. Failure is graceful by design — a failed session re-check holds the last known state rather than emptying the page. Both new server responses log at the point of refusal, matching the existing `[auth]`/`[profile]` log lines. |

**No violations. Complexity Tracking table omitted.**

### Post-design re-check (after Phase 1)

Re-evaluated against the generated artifacts. **Still passing, with two notes.**

- **II. Simplicity First** — Phase 1 added one client file beyond the original count
  (`notAuthorizedCard.js`), because the refusal page mounts the shell rather than hand-writing its
  markup. That is more files but less duplicated structure: the close control comes from the shell
  and cannot diverge into the admin pages' `.admin-back-link`. Accepted.
- **III. Surgical Changes** — the design confirms `main.narrow` is unreachable after the rebuild
  (used by exactly the three pages being rebuilt and nothing else), so deleting it removes code
  this change orphans rather than pre-existing dead code. Within the principle.
- **V. Code Quality** — the design adds two server log points, at the `/profile` relaxed branch and
  the admin refusal, matching the existing `[auth]`/`[profile]` prefixes. `research.md` R10 records
  the guard hazard so the modularity gain (one factory, two shapes) does not become a coupling
  defect.

No new violation. Complexity Tracking remains omitted.

## Project Structure

### Documentation (this feature)

```text
specs/013-UI-UX-revisions/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── page-routes.md   # Phase 1 output — the two page-route deltas
│   └── ui-contracts.md  # Phase 1 output — the card shell's contract
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── public/
│   ├── cardShell.js            # NEW — window.CardShell, one face, four consumers
│   ├── loginCard.js            # NEW — replaces login.html's inline script
│   ├── createAccountCard.js    # NEW — replaces create-account.html's inline script
│   ├── profileCard.js          # NEW — profile card + verification result state
│   ├── notAuthorizedCard.js    # NEW — mounts the refusal card
│   ├── not-authorized.html     # NEW — the page the admin guard sends
│   ├── app.js                  # MODIFIED — session snapshot owner; header source order; a.brand
│   ├── pollGrid.js             # MODIFIED — reads the shared snapshot instead of closing over it
│   ├── adminPoll.js            # MODIFIED — roster labels, row format, sort, "Invite"
│   ├── login.html              # MODIFIED — rebuilt on the shell; stylesheet swap
│   ├── create-account.html     # MODIFIED — rebuilt on the shell; stylesheet swap
│   ├── profile.html            # MODIFIED — rebuilt on the shell; stylesheet swap
│   ├── admin.html              # MODIFIED — back arrow only
│   ├── admin-poll.html         # MODIFIED — "Add" invite button renamed "Invite"
│   ├── site.css                # MODIFIED — shell rules + rules promoted from styles.css
│   └── styles.css              # MODIFIED — loses .error, field rules, main.narrow
├── routes/
│   └── pages.ts                # MODIFIED — /profile result branch; admin refusal page
└── polls/
    └── service.ts              # MODIFIED — createRequireAdmin gains a refusal-shape parameter

tests/
├── pages.test.ts               # MODIFIED — admin refusal is HTML at the same status
├── session.test.ts             # MODIFIED — two new /profile result-parameter cases
├── poll-card-assets.test.ts    # MODIFIED — stylesheet migration assertions
└── polls-admin-crud.test.ts    # MODIFIED — asserts /api/admin/* still refuses in JSON
```

**Structure Decision**: The existing layout is kept exactly. `src/public` is flat by convention —
one file per component, each an IIFE exposing at most one global, loaded with `<script defer>` —
and the five new client files follow it rather than introducing a directory. The server keeps its
`routes/` and `polls/` split; the only server files touched are the page router and the guard
factory that page router shares with the API router.

## Open Assumptions Carried From Clarification

`/speckit-clarify` answered one of its questions before planning began. Two remain open and are
resolved here by documented default rather than left as unknowns:

| # | Question | Default taken | Rework risk if wrong |
|---|---|---|---|
| A | ~~What happens to unsaved text when a card's close control or the brand link is used?~~ | **Decided** in `/speckit-clarify` Session 2026-09-07: leaving discards it silently. Now FR-047; no longer an assumption. | None. |
| B | ~~What happens when a session change arrives while the person is mid-edit on a page that requires a session?~~ | **Decided** in `/speckit-clarify` Session 2026-09-07: navigate immediately; text is lost as in A. Now stated in FR-014; no longer an assumption. | None. |

Both were subsequently answered in `/speckit-clarify` Session 2026-09-07 and are now stated
requirements rather than assumptions. This section is retained as the record of how they were
resolved. **No open assumptions remain.**
