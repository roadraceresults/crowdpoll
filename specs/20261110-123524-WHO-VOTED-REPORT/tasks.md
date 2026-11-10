---

description: "Task list for the Who Voted Report"
---

# Tasks: Who Voted Report

**Input**: Design documents from `specs/20261110-123524-WHO-VOTED-REPORT/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui-contracts.md, quickstart.md

**Tests**: Included. Constitution Principle IV and research R9 require every FR to be covered by a route or client test.

**Organization**: Tasks are grouped by user story so each story can be built and checked on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: Wire the new files into the page so later phases only fill them in.

- [X] T001 Add `<section class="maximized-voters" aria-labelledby="maximizedVotersHeading" hidden></section>` between `.maximized-notes` and `.maximized-graph` in the `maximizedCardGrid` template, `<link rel="stylesheet" href="/who-voted-m3.css">` after `/line-graph-m3.css`, and `<script src="/whoVoted.js" defer></script>` after `/lineGraph.js` in src/public/index.html (contracts/ui-contracts.md C1; research R8)
- [X] T002 [P] Create src/public/who-voted-m3.css with an empty `.maximized-voters[hidden]{ display:none; }` rule and src/public/whoVoted.js exposing `window.WhoVoted = { show, hide }` as no-op stubs (research R6)
- [X] T003 Append `"who-voted-m3.css"` to `LAYER_ORDER` and add `whoVoted.js` to index.html's pinned script list in tests/m3-assets.test.ts; run `npx vitest run tests/m3-assets.test.ts`

**Checkpoint**: `npm test` passes; the page loads with an empty, hidden section.

---

## Phase 2: Foundational (blocks every story)

**Purpose**: The server side every story reads: the votes query and the route (contracts/api.md A1).

- [X] T004 Create src/polls/voters.ts exporting `readVoterReport(db, row)`: one Kysely query on `votes` for `row.id` with `cardinality(choice_ids) > 0`, selecting `user_name`, `choice_ids`, `voted_at` (never `email`), ordered by `user_name` then `voted_at`; intersect each row's `choice_ids` with the ids of `row.choices`, drop rows left empty; return `{ voters: [{ name, choiceIds, votedAt: ISO string }], counted }` where `counted` is the row count before the choice filter (research R3; data-model.md)
- [X] T005 Add `GET /api/me/polls/:pid/voters` in src/routes/tabsApi.ts after `GET /api/me/polls/:pid`: `requireSession`, `shedding.withKind("live")`, `floors.enforceFloor("live", "voters")`, `countBudget("live")`; load the row with `parsePid`; answer `404 { error: "Not found" }` unless the row exists, `poll_visibility === "Private Poll"`, `vote_anonymity === "No"`, and (`mayViewResults({ db, config }, callerOf(res), pid)` or `isAdminEmail(emailOf(res), config)`) — an administrator still needs the poll published (`isPublished(row)`); otherwise call `readVoterReport`, read `readOrRebuildCounts({ db, cache }, [pid])`, and send `{ voters, ...(counts.voteCount !== counted ? { settleMs: config.voteQueueLagNoticeMs } : {}) }`; set `Cache-Control: private, no-store` on every answer (research R1, R2, R4)
- [X] T006 Add `/api/me/polls/{pid}/voters` (`get`; `200` with a `VoterReport` schema, `401`, `404`, `429`) to postman/openapi.json and run `npx vitest run tests/openapi-contract.test.ts` (contracts/api.md A2)
- [X] T007 Create tests/who-voted-route.test.ts (supertest, embedded PostgreSQL, existing poll/vote helpers): `401` without a session; `404` for an unknown pid, a public poll, an anonymous private poll, an unpublished poll and a signed-in user with no relation; `200` for the creator, an invitee, a link-related user and an unrelated administrator; terms not accepted → the gate's refusal; rows with empty `choice_ids` skipped; a removed choice id filtered and a row left empty dropped; a `Deleted user` row listed; no `email`, user id or address anywhere in the body; `Cache-Control: private, no-store` on `200` and `404`; `settleMs` present when the counters are ahead of `votes` and absent when equal; a second call within the floor answers `429` while `POST /api/live/refresh` from the same session is not refused because of it

**Checkpoint**: `npx vitest run tests/who-voted-route.test.ts` passes; no browser change yet beyond Phase 1.

---

## Phase 3: User Story 1 — See who voted for what (Priority: P1) 🎯 MVP

**Goal**: a participant who maximizes a non-anonymous private poll sees `Who voted`, sorted by voter.

**Independent Test**: three accounts vote on such a poll; maximizing it shows the three names A→Z with choices and dates (quickstart steps 2–4, 8).

### Tests for User Story 1

- [X] T008 [P] [US1] Create tests/client-who-voted.test.ts (jsdom via tests/helpers/browser.ts, `fetch` stubbed): `show` on a `Private Poll` OPEN detail requests `/api/me/polls/<pid>/voters`; no request for a public poll or a poll not OPEN/CLOSED; heading `Who voted`; Sort by Voter `aria-pressed="true"`; columns Voter, Choice, Date; one `<tbody>` per voter ordered by `Intl.Collator` (base sensitivity, numeric), same-name voters as separate groups ordered by `votedAt`; a voter's choices in bar order (`pct` desc, ties by `position`); `<th scope="rowgroup" rowspan>` on the first line only; every line's `<time datetime>` holds `votedAt` with a medium date and a date-time `title`; a name like `<b>x</b>` appears as text; empty `voters` shows `No votes yet.` without sort control or table; `404` hides the section and a later `show` with the same `contentVersion` makes no request, while a new `contentVersion` does

### Implementation for User Story 1

- [X] T009 [US1] In src/public/whoVoted.js implement `show(section, pid, detail)` and `hide(section)`: the qualification check (`pollVisibility === "Private Poll"`, `pollState` `OPEN`/`CLOSED`, `refusedVersion !== contentVersion`); one fetch with a request token, replies with an older token or after `hide` dropped; `404` → `hide` and record `refusedVersion`; per-section state kept on a `WeakMap` keyed by the section; the per-section heading id derived from `maximizedVotersHeading` (data-model.md "Browser state"; contracts/ui-contracts.md C3)
- [X] T010 [US1] In src/public/whoVoted.js build the panel with DOM methods only (`textContent`, never `innerHTML`): heading, segmented control (Sort by Voter selected), and the Sort by Voter table per contracts/ui-contracts.md C2, bar order and collator per research R7, dates via `Intl.DateTimeFormat(undefined, { dateStyle: "medium" })` with the `title` from `{ dateStyle: "medium", timeStyle: "short" }`; the empty state `No votes yet.`
- [X] T011 [US1] In src/public/tabs.js `createGrid`: add `syncVoters(pid, detail)`, which calls `window.WhoVoted?.show(maximizedEl.querySelector(".maximized-voters"), pid, detail)` and records the `countsVersion` and `contentVersion` it showed; call it from `maximize` after `syncNotes`; call `window.WhoVoted?.hide(...)` in `restore` beside `clearNotes()` and clear the recorded versions (contracts/ui-contracts.md C3)
- [X] T012 [US1] Style the section, heading and table in src/public/who-voted-m3.css per contracts/ui-contracts.md C4 (section as `.maximized-notes`, heading `title-medium`, table `body-medium`, `thead` `label-large` on `on-surface-variant`), M3 tokens only

**Checkpoint**: US1 passes `npx vitest run tests/client-who-voted.test.ts` and quickstart steps 2–4 and 8.

---

## Phase 4: User Story 2 — Sort by choice (Priority: P2)

**Goal**: the viewer can regroup the table by choice.

**Independent Test**: select Sort by Choice; groups follow the bars, empty choices are absent, voters A→Z (quickstart step 5, 7).

### Tests for User Story 2

- [X] T013 [P] [US2] Extend tests/client-who-voted.test.ts: clicking Sort by Choice redraws without a request; columns Choice, Voter, Date; groups in bar order, only choices with voters; voters ordered by the collator; `aria-pressed` follows the selection; the selection survives a later `show` for the same pid; after `hide`, the next `show` starts on Sort by Voter; a `show` for a different pid starts on Sort by Voter; `localStorage` and `sessionStorage` stay empty after sorting (FR-008)

### Implementation for User Story 2

- [X] T014 [US2] In src/public/whoVoted.js add the `sort` state (`"voter"` default, kept across `show` calls for the same pid, reset by `hide` or a new pid), segment click handlers that redraw from the held report, and the Sort by Choice table builder (contracts/ui-contracts.md C2–C3)
- [X] T015 [US2] Style `.who-voted-sort` / `.who-voted-segment` in src/public/who-voted-m3.css after the M3 segmented-button spec: 40 px high, `outline` border, `corner-full` ends, selected `secondary-container` / `on-secondary-container` with the inline check icon, hover/focus/pressed state layers (contracts/ui-contracts.md C4; research R8)

**Checkpoint**: US1 and US2 tests pass; quickstart steps 5 and 7 behave as described.

---

## Phase 5: User Story 3 — The report follows the bars (Priority: P2)

**Goal**: the table changes when the bars change and catches up with batched votes.

**Independent Test**: with Live Results on, a new and then a changed vote from another account appear after the bars move, with no previous vote shown (quickstart step 6).

### Tests for User Story 3

- [X] T016 [P] [US3] Extend tests/client-who-voted.test.ts (fake timers): a `show` with a new `countsVersion` refetches and redraws in the selected order; a reply with `settleMs` schedules exactly one refetch after it, and a reply without it schedules none; a `429` with `retryAfterMs` schedules exactly one refetch; a `settleMs` retry answered by a `429` is rescheduled once after its `retryAfterMs`, and a second `429` on that retry schedules nothing more; a newer `show` cancels a pending retry; an older reply arriving after a newer one is ignored; any other failure keeps the last table; a changed bar order regroups Sort by Choice; with 100 voters, switching the sort makes no request and the table is redrawn before the click handler returns (SC-004)
- [X] T017 [P] [US3] Extend tests/client-maximized.test.ts: with a maximized private poll, a tab render whose detail has a new `countsVersion` or `contentVersion` calls `WhoVoted.show` once for the maximized pid, a render with the same versions does not, the first render after `maximize` with unchanged versions does not call it a second time, a retained (pinned) maximized poll whose counts change through `patchRetained` (another vote, or the viewer's own) calls `WhoVoted.show` once, and closing the view calls `WhoVoted.hide`

### Implementation for User Story 3

- [X] T018 [US3] In src/public/whoVoted.js add the one pending retry timer: after a reply with `settleMs`, and after a `429` (after `retryAfterMs`), cleared by a newer fetch or `hide`; at most one retry is pending at a time, and a `429` answering a retry schedules that retry again once, after its `retryAfterMs`; bring the `429` line of contracts/ui-contracts.md C3 into step with this rule ("At most one retry pending; a `429` answering a retry schedules it again once."); on other failures keep the current table and log nothing that holds a name (contracts/ui-contracts.md C3; research R4)
- [X] T019 [US3] In src/public/tabs.js call `syncVoters` from `render` beside `syncNotes`: for the maximized pid only, and only when `detail.countsVersion` or `detail.contentVersion` differs from the versions `syncVoters` last recorded (T011), so the first render after `maximize` sends no second request; `patchRetained` also calls `syncVoters` with the patched detail, because a maximized poll that no tab list holds gets its counts only there

**Checkpoint**: US1–US3 tests pass; quickstart step 6 behaves as described.

---

## Phase 6: User Story 4 — Readable on every screen and to every reader (Priority: P3)

**Goal**: banding, phone layout, both colour schemes and screen readers.

**Independent Test**: quickstart steps 9–11.

- [X] T020 [P] [US4] Extend tests/client-who-voted.test.ts: every line of a group sits in one `<tbody>`, row-group headers carry `scope="rowgroup"` and the right `rowspan`; the sort group has `role="group"` and an `aria-label`; the section has no fixed height or overflow of its own (computed style in jsdom: no inline height); inside `.maximized-space-right` of the cloned `maximizedCardGrid` template the order is `.maximized-notes`, `.maximized-voters`, `.maximized-graph` (FR-006)
- [X] T021 [US4] In src/public/who-voted-m3.css add banding `tbody:nth-of-type(even)` on `surface-container`, left-aligned row-group headers with `title-small` weight, and no `max-height` or `overflow` on the section; the phone-width order follows from the template (T020) and is checked visually in quickstart step 9

**Checkpoint**: all tests pass; quickstart steps 9–11 behave as described.

---

## Phase 7: Polish & Documentation

- [X] T022 [P] In src/public/adminCard.js, delete only the stale sentence "Who sees the names is unchanged: administrators only." from the comment above `VOTERS_SWITCH_LABEL`; do not write a replacement (constitution VI), leave the rest of the comment as it is (constitution III); who sees the names is documented by T023 and the tests (FR-020)
- [X] T023 [P] Update README.md: rewrite the **Anonymous Votes** row of "Poll visibility settings" (who sees names, where), and describe the Who voted panel of the maximized view; add `GET /api/me/polls/:pid/voters` where the API's per-viewer reads are listed (FR-020)
- [X] T024 [P] Update ARCHITECTURE.md: the voters route (access, `no-store`, its floor bucket, `settleMs`) and the maximized view's right column (Notes, Who voted, line graph), with the sequence of a vote reaching the panel
- [X] T025 [P] Add the feature's summary and easy-to-get-wrong decisions to CLAUDE_COMPLETE.md
- [X] T026 Run `npx tsc --noEmit` and `npm test`; run quickstart.md's manual steps 1–11 and record the results, including in step 6 the seconds from the bars moving to the new voter appearing (SC-002: within 5 s)
- [X] T027 Add the development script `devScripts/populate/populate-test-poll.ts` (`npm run populate-test-poll [<file>]`, default `devScripts/populate/test-poll.json`): it creates or refreshes the creator's poll with the file's title (OPEN, *Anyone With The Link*, Anonymous Votes `No` when `showVoterChoices` on a private poll), creates missing voter accounts `<name>@crowdpolltest.test`, and casts random votes (multiple choice: 0…n choices, each count equally likely; single choice: one choice for 80%), linking a voter who picks nothing; `.gitignore`, `package.json` and `README-populate-poll-and-seed-poll.md` follow; tests in tests/populate-test-poll.test.ts (TWEAK01)

---

## Dependencies & Execution Order

- **Setup (T001–T003)** → **Foundational (T004–T007)** → stories.
- **US1 (T008–T012)** needs Foundational. **US2 (T013–T015)** and **US3 (T016–T019)** need US1's `whoVoted.js` and `tabs.js` calls; they touch different parts and may follow in either order, but both edit whoVoted.js, so run them one after the other. **US4 (T020–T021)** needs US1 and US2's markup.
- **Polish (T022–T027)** after the stories; T022–T025 in parallel; T027 (TWEAK01) is independent of the others.
- Within a story: test task first (it fails), then implementation.

## Parallel Opportunities

- T002 with T001 (different files).
- T006 and T007 after T005; T004 before T005.
- T008 while T009–T012 are written (test file vs source).
- T016 and T017 together (different test files).
- T022, T023, T024, T025 together.

## Implementation Strategy

1. **MVP**: Phases 1–3 — the panel, sorted by voter, refreshed on maximize. It already keeps the switch's promise.
2. Add US2 (sort by choice), then US3 (live follow and catch-up), then US4 (polish), checking each against quickstart.md.
3. Documentation last (constitution: after implementation).
