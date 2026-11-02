# Implementation Plan: Voters Add Choices to a Private Poll

**Branch**: `user-add-choices` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261101-181626-USER-ADD-CHOICES/spec.md`

## Summary

A Private poll whose creator turns on a new per-poll setting, `voters_add_choices` (migration
`015-voters-add-choices`, a content field, R1), lets each eligible voter add a choice from the poll card's voting
face. One new route, `POST /api/polls/:pid/choices`, sheds like a vote and has its own token bucket at the vote
interval (R2, R3). It admits exactly whom a vote admits, plus the creator (R4), and works only while the raw poll
state is OPEN with no pending review (R5). It validates the label with `validateAddedChoice`: the 40-character
`WIZARD_CHOICE_MAX` (moved server-side and published in `/api/config`), forbidden characters, and a duplicate check
that ignores case and spacing (R6). It screens the label in the request (R8), then appends it in one row-locked
transaction that bumps `content_version`, so every view picks it up through the existing refreshes (R7). On polls
without anonymous voting the choice keeps its adder's user id (`addedBy`), which the projection never publishes and
account deletion clears (R9). The creator's save sends `baseChoiceIds`, so choices added since the card loaded are
kept (R10). The browser gains an Add Choice button, a prefetch through `GET /api/me/polls/:pid`, a dialog module and
an M3 layer (R11); the Edit Poll Card gains the switch, the shared limit and "Added by" lines.

## Technical Context

**Language/Version**: TypeScript on Node ≥ 22, ESM.

**Primary Dependencies**: Express 5, Kysely (PostgreSQL), BetterAuth. Browser: vanilla JavaScript and CSS, no framework, no bundler. No new dependency.

**Storage**: PostgreSQL. One additive column `polls.voters_add_choices boolean not null default false`; one optional key `addedBy` inside the existing `polls.choices` JSON; no backfill (data-model.md).

**Testing**: Vitest with supertest and embedded PostgreSQL; jsdom client suites via `tests/helpers/browser.ts`.

**Target Platform**: DigitalOcean App Platform, one autoscaled web service; desktop and phone browsers.

**Project Type**: Web service with a browser client.

**Performance Goals**: An addition is one row-locked transaction on one poll plus a local screening call; it is bounded per session by the vote interval, and the vote hot path gains no read. SC-001: the card shows the choice within 2 s of Save.

**Constraints**: No new setting, cookie or browser storage key; one new route (A1), one new browser module, one new stylesheet. `addedBy` never leaves the admin surface. `postman/openapi.json` follows A1–A5.

**Scale/Scope**: About 9 server files (migration, schema, store, service, versions, votePath, floors, pollsApi, api.ts config, deleteAccount, userPolls overlay) and 5 client files (pollCard.js, deltaClient.js, adminCard.js, the new addChoiceDialog.js and add-choice-m3.css, index.html, privacy.html). Two new test suites plus extensions to the admin-wizard, save, account-deletion and m3-assets suites.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | The two judgment calls, a bucket name on `enforceFloor` rather than a new `RequestKind` (R3) and `baseChoiceIds` on the save request rather than a session column (R10), are stated with their alternatives. Each of the 16 requirements findings and 3 clarifications is cited where it is applied | Pass |
| II. Simplicity First | One column, one route, one optional parameter. The screener is called directly, with no new `AppContext` member. No per-user limit, notification or setting (NC3, Q3) | Pass |
| III. Surgical Changes | `CHOICE_LABEL_MAX` and its client copy stay as they are. Only `WIZARD_CHOICE_MAX` moves, because the server now needs it. The vote path's rules are called, not copied | Pass |
| IV. Goal-Driven Execution | quickstart.md scenarios 1–10 map to US1–US5. R12 names the suites | Pass |
| V. Code Quality | Every addition and refusal is logged server-side with no address. The browser logs nothing. Refusals carry structured codes | Pass |
| VI. Self-Documenting Code | Names carry the meaning (`validateAddedChoice`, `appendChoice`, `withChoicesAddedSince`, `mayAddChoice`). No finding or task ids in code | Pass |
| Security, Privacy & Reliability | Every rule is enforced server-side (FR-004). The ceiling and duplicate checks hold under the row lock. `addedBy` is kept out of the projection, absent on anonymous polls, and cleared on account deletion. The Privacy Policy is updated | Pass |
| Performance & Operational Efficiency | No polling is added. Other viewers learn through existing refreshes | Pass |
| Documentation Deliverables | README.md and ARCHITECTURE.md are updated after implementation | Deferred to after implementation |

**Gate result**: no violations. Complexity Tracking is empty.

**Post-design re-check**: unchanged. The design added one browser module, so `pollCard.js` grows only by the button and its call, and no new abstraction.

## Project Structure

### Documentation (this feature)

```text
specs/20261101-181626-USER-ADD-CHOICES/
├── plan.md              # This file
├── research.md          # Phase 0 output: R1–R12
├── data-model.md        # Phase 1 output: the column, Choice.addedBy, validation order
├── quickstart.md        # Phase 1 output: ten validation scenarios
├── contracts/
│   ├── api.md           # A1–A5
│   └── ui-contracts.md  # C1–C5
├── checklists/requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── db/migrations/015-voters-add-choices.ts   # new
├── db/migrations/index.ts, db/schema.ts
├── polls/store.ts        # Poll field, Choice.addedBy, appendChoice
├── polls/service.ts      # WIZARD_CHOICE_MAX, validateAddedChoice, normalizedChoiceKey, withChoicesAddedSince,
│                         # validatePollFields (setting, anonymity drops addedBy), merge/replace keep addedBy
├── polls/versions.ts     # projection: votersAddChoices, choices without addedBy
├── polls/userPolls.ts    # overlay ownPoll
├── votes/votePath.ts     # assertMayAddChoice
├── load/floors.ts        # enforceFloor(kind, bucket)
├── legal/deleteAccount.ts
└── routes/pollsApi.ts (A1, A4, A5), routes/api.ts (A2)
src/public/
├── pollCard.js, deltaClient.js, adminCard.js
├── addChoiceDialog.js, add-choice-m3.css     # new
└── index.html, privacy.html
tests/
├── add-choice.test.ts, client-add-choice.test.ts   # new
└── client-admin-wizard.test.ts, m3-assets.test.ts, account-deletion and save suites (extended)
postman/openapi.json
```

**Structure Decision**: the existing single web-service layout. Server code goes in the modules that already own each concern. The client adds one module beside `pollCard.js`.

## Complexity Tracking

None.
