# Implementation Plan: Poll Closed State Display

**Branch**: `dev` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-closed-state/spec.md`

## Summary

Poll cards (the home grid and the same component's `?PID=` single-poll view) currently never
read `poll.pollState`, so a closed poll looks identical to an open one — "Vote" and the
(already-inert) "Live Results" link both still show. This feature adds one client-side
function, `updateClosedState()`, called from `pollCard.js`'s existing render cycle: when a
poll is closed, its front face swaps "Live Results" for "Poll closed on `<date>`" and hides
"Vote"; its back face (if open) hides the choice bars and "Submit vote" and shows "This Poll
closed on `<date>`", leaving the back-navigation control usable. The server-side rejection of
a vote submitted after closing (research.md R1) and the date this all reads from (`endAt`,
stamped whenever a poll closes — `004-realtime-poll-voting` FR-045) already exist; this
feature is purely the client catching up to data it's already being sent.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS / vanilla JS client (existing project,
unchanged) — this feature touches only the vanilla-JS/CSS client, no TypeScript files.

**Primary Dependencies**: None new — extends `src/public/pollCard.js`'s existing
`initPollCard()`/`render()`/`fetchPoll()` cycle and `src/public/site.css`'s existing
app-owned-additions convention (research.md R3). No new dependencies.

**Storage**: MongoDB, unchanged — no schema, field, or index changes (data-model.md). This
feature reads `pollState`/`endAt`, both already present on every voter-facing poll payload.

**Testing**: Vitest + supertest (existing pattern) — no new server tests needed;
`tests/polls-vote.test.ts` already covers the one server-side behavior this feature depends
on (research.md R1). The feature's own client-side work is DOM/visual/timing-level and is
validated manually via `quickstart.md`, per the constitution's tests-OR-manual-check
allowance — the same approach `005-admin-page-improvements`/`006-poll-choices-editor` used
for their own DOM-level stories.

**Target Platform**: Unchanged — DigitalOcean App Platform (Linux) for deployment; local dev
on Windows 11 + PowerShell (`devScripts/launch-dev.ps1`).

**Project Type**: Single project (existing layout, extended — no new top-level directories).

**Performance Goals**: Not applicable — the added work per render is a handful of
`hidden`/text-content toggles on elements that already exist in the DOM, no different in cost
from the rendering `render()` already does every poll tick.

**Constraints**: None beyond reusing the existing render/poll cycle (research.md R2) and the
existing reference-file/app-owned-file CSS split (research.md R3) — both established
conventions from prior features, not new constraints this feature introduces.

**Scale/Scope**: 3 user stories, 9 functional requirements. Touches: `src/public/pollCard.js`
(new `updateClosedState()` + `formatClosedDate()`, two new template elements, one changed
line in the submit-failure handler) and `src/public/site.css` (new `.poll-closed-message`
rules) — no new files, no new collections, no new API endpoints, no server-side changes at
all (research.md R1).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Think Before Coding | The one real ambiguity (closed-message date format) was surfaced with concrete tradeoffs and resolved with the user during `/speckit-specify` rather than guessed; research.md documents that the server-side half of this feature already exists, rather than silently re-implementing or leaving that undocumented | ✅ PASS |
| II. Simplicity First | No new dependencies; reuses the existing `render()`/`fetchPoll()`/poll-tick cycle instead of introducing a second, parallel state-checking mechanism (research.md R2); reuses the existing `.live-link-label` typography instead of a new type scale (research.md R3) | ✅ PASS |
| III. Surgical Changes | `pollCard.css` (a verbatim reference file) is left untouched; new styling goes only in `site.css`'s existing app-owned-additions section, matching the established split (research.md R3); no server files are touched at all since none need to change (research.md R1) | ✅ PASS |
| IV. Goal-Driven Execution | The one server-side behavior this feature depends on already has automated test coverage (`tests/polls-vote.test.ts`); the new client-side behavior gets an explicit runnable manual check per user story in quickstart.md | ✅ PASS |
| V. Code Quality & Maintainability | One small, single-purpose function (`updateClosedState()`) added to the existing `initPollCard()` closure, following that function's existing per-concern-function structure (`setText()`, `updateSubmitState()`, etc.) rather than inlining logic into `render()` itself | ✅ PASS |
| Security, Privacy & Reliability | No new input surface — this feature only reads data the server already sends; the vote-rejection safeguard it depends on (FR-008) is already server-enforced and already tested, not newly trusted from the client | ✅ PASS |
| Performance & Operational Efficiency | No new polling/timer — piggybacks on the existing per-card poll cycle (`APP_POLLING_INTERVAL`), no additional requests | ✅ PASS |

**Post-Phase-1 re-check**: `data-model.md` introduces no new fields/collections/indexes —
only newly-*read* existing ones. `contracts/ui-contracts.md` documents an internal DOM
contract only — no HTTP API surface changes (`postman/openapi.json` unchanged, research.md
R1/"Out of scope"). No additional dependencies, projects, or patterns beyond what's justified
above. ✅ PASS — no Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/007-closed-state/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   └── ui-contracts.md
├── checklists/
│   └── requirements.md   # already validated (/speckit-specify, /speckit-clarify)
└── tasks.md               # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
└── public/
    ├── pollCard.js   # EDITED: POLL_CARD_TEMPLATE gains two new hidden
    │                 #   `.poll-closed-message` elements (front and back,
    │                 #   contracts/ui-contracts.md); initPollCard() gains
    │                 #   updateClosedState() (called at the end of render(),
    │                 #   research.md R2) and a small formatClosedDate()
    │                 #   helper (research.md R4); the submitBtn click
    │                 #   handler's failure path calls fetchPoll() instead of
    │                 #   updateSubmitState() directly (FR-009,
    │                 #   contracts/ui-contracts.md)
    └── site.css      # EXTENDED: new `.poll-closed-message` /
                       #   `.poll-closed-message--back` rules in the existing
                       #   app-owned-additions section — front variant mirrors
                       #   `.live-link-label`'s typography (research.md R3);
                       #   pollCard.css (reference file) is not touched
```

**Structure Decision**: Single project, existing layout, no new files. The narrowest possible
footprint for this feature — one existing client file gains one small render-time function
and two template elements, one existing stylesheet gains a few rules; nothing else changes,
since the data and server-side enforcement this feature displays already exist
(research.md R1).

## Complexity Tracking

*No entries — Constitution Check reported no violations requiring justification.*
