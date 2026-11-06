---

description: "Task list for Multiple Account Prevention"
---

# Tasks: Multiple Account Prevention

**Input**: Design documents from `specs/20261105-162941-MULTIPLE-ACCOUNT-PREVENTION/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. The requirements report's UA7 and SC-005 ask for automated checks, and the constitution treats tests as documentation.

**Organization**: Tasks are grouped by user story. Code follows the constitution: no comments citing specs or tasks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: The user story the task belongs to

## Phase 1: Setup

**Purpose**: the vendored library and the settings

- [X] T001 [P] Copy `dist/fp.min.js` of `@fingerprintjs/fingerprintjs` 5.3.0 unchanged, with its licence header, to `src/public/vendor/fingerprintjs-5.3.0.min.js`, and add `!src/public/vendor/*.min.js` to `.gitignore` after its `*.min.js` line, confirming with `git check-ignore` that the file is no longer ignored (research R1)
- [X] T002 Add `deviceEvents: { enabled, key }` to `AppConfig` in `src/config.ts`, read from `ENV_DEVICE_EVENTS_ENABLED` (default false) and `ENV_DEVICE_EVENTS_KEY`, throwing `ConfigError` when enabled with a key missing or under 32 characters (R11)
- [X] T003 [P] Add both settings to `.claude/rules/environment.md`, `launch.json.example` and `devScripts.example/launch-dev.ps1`, off by default
- [X] T004 [P] In `infra/variables.tf`, `infra/secrets.auto.tfvars.example` and `infra/app.tf`, add the `device_events_key` variable validated non-empty, the `SECRET` environment entry `ENV_DEVICE_EVENTS_KEY` on `web`, and `ENV_DEVICE_EVENTS_ENABLED = "false"`, extending `tests/infra-config.test.ts` to match (R11)
- [X] T005 Add config validation cases (off by default, on with a good key, on with none, on with a short key) to `tests/config.test.ts`

---

## Phase 2: Foundational

**Purpose**: the table and the shared server unit, which every story needs

**⚠️ CRITICAL**: no user story work can begin until this phase is complete

- [X] T006 Generalise `src/db/partitions.ts` so the partition helpers take the parent table's name and index list, keeping `ensureVoteHistoryPartition` and `partitionName` behaving as they do, and add `ensureDeviceEventsPartition` creating `device_events_YYYY_MM` with an index on `account_id` and one on `poll_id` (R9)
- [X] T007 Create `src/db/migrations/018-device-events.ts` from `data-model.md`, with this and next month's partitions, and register it in `src/db/migrations/index.ts`
- [X] T008 Add `DeviceEventsTable` and its entry in `Database` to `src/db/schema.ts`
- [X] T009 Create `src/votes/deviceEvents.ts` exporting `DEVICE_FINGERPRINT_VERSION = 1`, `parseFingerprintHeader(value)` (contract A1; returns the two parts or null) and `keyedDeviceHashes(header, key)` (HMAC-SHA-256 hex, or null hashes when missing) (R4, R5)
- [X] T010 [P] Unit-test `parseFingerprintHeader` and `keyedDeviceHashes` in `tests/device-events.test.ts`: valid, absent, wrong length, upper case, oversized, one part only; equal input gives equal output, a different key gives a different output, and the output never contains the input

**Checkpoint**: `npx tsc --noEmit` passes and the migration runs on the embedded database.

---

## Phase 3: User Story 1 - Each vote leaves evidence, and the voter notices nothing (Priority: P1) 🎯 MVP

**Goal**: every accepted vote has a record, and the vote itself is unchanged.

**Independent Test**: vote, change and clear with collection on, and compare `device_events` with the responses (quickstart Q2, Q4–Q8).

### Tests for User Story 1

- [X] T011 [US1] In `tests/device-events.test.ts`, test through the vote route: an accepted vote writes one row with account, poll, time, hashes and version and no choice; a change and a clear each write a row; two votes in one batch by one voter on one poll write two rows while `votes` holds one; a refused vote writes none; a missing or malformed header succeeds with null hashes; the response is identical with and without the header; collection off writes none; a stream entry with no `accountId` writes a vote and no row; a queued vote whose poll or account was deleted writes no row
- [X] T012 [P] [US1] Create `tests/client-device-evidence.test.ts` with a stubbed `FingerprintJS`, testing C1 and C3: nothing computes when `deviceEventsEnabled` is false or the viewer is signed out; `load` is called with `{ monitoring: false }`; at most one computation per page; the hardware value hashes only the listed components, leaving out `deviceMemory` and the GPU, and treats a failed component as absent; a blocked script or a thrown error leaves `headers()` returning `{}` with no console output; the vote request carries the header when ready and does not wait when not
- [X] T013 [US1] In `tests/client-device-evidence.test.ts`, test against the real vendored file what jsdom can show: `cookietest` is gone and no Local Storage or Session Storage key remains after computing, and the injected script's source is same-origin; real browsers are covered by quickstart Q8 and Q9 (R2, SC-005)
- [X] T046 [US1] In `tests/device-events.test.ts`, seed rows and run the query of SC-009, "which accounts voted on the same poll from the same browser value within a given time", confirming it returns the expected accounts

### Implementation for User Story 1

- [X] T014 [US1] In `src/votes/votePath.ts`, add an optional `device?: { accountId; browserHash; hardwareHash }` to `VoteRequest`, and add the three fields to the `xadd` entry only when it is present (R6)
- [X] T015 [US1] In the vote route in `src/routes/pollsApi.ts`, when `config.deviceEvents.enabled`, build `device` from `caller.id` and `keyedDeviceHashes(req.get("x-device-fingerprint"), key)`; never log the header
- [X] T016 [US1] In `src/votes/consumer.ts`, read the fields in `parseEntry`, and in `writeBatch` insert one `device_events` row per vote with `accountId` from the uncollapsed `votes` list, inside the transaction, after ensuring the months' partitions; empty strings become null
- [X] T017 [US1] Create `src/public/deviceEvidence.js` per contract C1 and research R3 (IIFE, `window.DeviceEvidence.headers()`, idle computation, lazy same-origin injection, `load({ monitoring: false })`, the hardware value, silent failure)
- [X] T018 [US1] Add `deviceEventsEnabled` to `GET /api/config` in `src/routes/api.ts`
- [X] T019 [US1] In `src/public/voteClient.js`, merge `window.DeviceEvidence?.headers()` into the vote fetch's headers (C3)
- [X] T020 [US1] Add `<script src="/deviceEvidence.js" defer>` before `voteClient.js` in `src/public/index.html`, and add it to the page's pinned scripts in `tests/m3-assets.test.ts`

**Checkpoint**: votes leave evidence with collection on, and nothing happens with it off.

---

## Phase 4: User Story 3 - Users are told, and accept, before anything is collected (Priority: P1)

**Goal**: the policy and the Terms tell the truth, and every account accepts once.

**Independent Test**: an account on the old version sees `/accept-terms` and has no rows until it accepts; both pages read as C4–C6 (quickstart Q10, Q16).

### Tests for User Story 3

- [X] T021 [P] [US3] In `tests/legal-pages.test.ts`, test the C4–C6 wording: `id="device-evidence"` exists; "In short", the section and the retention table agree; "profiling" no longer appears as a promise; `id="bot-check"` stays; the Terms link to the section; neither page contains "guarantee" or "ensure" applied to one vote per person
- [X] T022 [US3] In `tests/device-events.test.ts`, test that an account on the old `TERMS_VERSION` gets `403 terms-required` from `POST /api/polls/:pid/vote` and has no rows

### Implementation for User Story 3

- [X] T023 [US3] Apply C4 and add the C5 section in `src/public/privacy.html`
- [X] T024 [US3] Apply C6 in `src/public/terms.html`, and set the release date in `src/legal/version.ts` and on both pages

**Checkpoint**: US1 and US3 together can ship to test users.

---

## Phase 5: User Story 2 - Each sign-in leaves evidence, whichever way the user signs in (Priority: P2)

**Goal**: one sign-in event per session, including sessions open when collection starts.

**Independent Test**: sign in by each method, open pages and tabs, and find one row (quickstart Q1).

### Tests for User Story 2

- [X] T025 [US2] In `tests/device-events.test.ts`, test contract A3 and A4: the `X-Device-Login-Due` header appears only when on, accepted and unreported; the `/api/me` body is unchanged; each row of A4's table; two concurrent posts write one row; a failed insert releases the key; an email link, a provider and an invitation sign-in are each due; a session started before collection was on is due
- [X] T026 [US2] In `tests/client-device-evidence.test.ts`, test C2: one post when due, including after a failed computation; no post when not due; a failed post is ignored; the session snapshot's fields are unchanged and no subscriber is notified because of the header

### Implementation for User Story 2

- [X] T027 [US2] Add `recordSignInEvent` and the `device-signin:<sessionId>` key helpers to `src/votes/deviceEvents.ts` (`setNx`, `ensureDeviceEventsPartition` for the current month, insert with a null poll, release the key on failure) (R7)
- [X] T028 [US2] In `src/routes/api.ts`, set `X-Device-Login-Due: 1` in `GET /api/me` under A3's conditions, and add `POST /api/me/device-login` behind `pageLoads` per A4
- [X] T029 [US2] In `src/public/app.js`'s `fetchMe`, expose the header as `window.DeviceSignInDue` without touching the snapshot, and in `src/public/deviceEvidence.js` compute and post per C1 and C2
- [X] T030 [US2] Add the script tag to `src/public/profile.html`, `src/public/settings.html`, `src/public/admin.html` and `src/public/admin-results.html`, and pin them in `tests/m3-assets.test.ts` (R8)

**Checkpoint**: sign-ins and votes are both recorded.

---

## Phase 6: User Story 4 - The evidence is limited in time and removed with the account (Priority: P2)

**Goal**: records expire, and go with their account and their poll.

**Independent Test**: delete an account and a poll, and age a partition (quickstart Q14, Q15, Q17).

### Tests for User Story 4

- [X] T031 [P] [US4] In `tests/account-deletion.test.ts`, test that deleting an account removes its rows, including vote events on others' polls, plus the vote events on its own polls by other accounts; and that a vote queued before deletion leaves no row
- [X] T032 [US4] In `tests/device-events.test.ts`, test that `deletePoll` removes its vote events and keeps sign-in events; that a ban or a vote reset keeps them; that `retentionSweep` drops a partition whose month ended over 3 months ago and keeps the rest; and that `scheduleSweep` creates next month's partition

### Implementation for User Story 4

- [X] T033 [P] [US4] In `src/polls/store.ts`'s `deletePoll`, delete the poll's `device_events` in its transaction
- [X] T034 [P] [US4] In `src/legal/deleteAccount.ts`, delete `device_events` by `account_id`, and by `poll_id` for the account's own polls, in its transaction
- [X] T035 [US4] In `src/polls/sweeps.ts`, add `DEVICE_EVENTS_RETENTION_MONTHS = 3`, generalise `dropOldVoteHistory` to take a table and its months, drop old `device_events` partitions in `retentionSweep` and include them in its log line, and call `ensureDeviceEventsPartition` for next month in `scheduleSweep`

**Checkpoint**: the policy's retention row is true.

---

## Phase 7: User Story 5 - The operator controls collection and can see that it works (Priority: P2)

**Goal**: one switch, a coverage line, and no way in for anyone else.

**Independent Test**: run with the setting off and on, and read the log (quickstart Q12, Q13, Q17).

### Tests for User Story 5

- [X] T036 [US5] In `tests/device-events.test.ts`, test that with collection off nothing is written or due and the coverage line is absent; with it on, the line holds counts split by event and no identifying value
- [X] T037 [P] [US5] In `tests/privacy-minimization.test.ts`, test that no route exposes `device_events`; that a voted and signed-in session's server log holds no raw header value or hash; and that the key is absent from `/api/config`

### Implementation for User Story 5

- [X] T038 [US5] In `src/polls/sweeps.ts`, log `[device-events] last 24h: …` from `retentionSweep` when collection is on (R12)

**Checkpoint**: all user stories work independently.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T039 [P] Describe the header, the changed `GET /api/me` and `GET /api/config`, and `POST /api/me/device-login` in `postman/openapi.json`
- [X] T040 [P] Update `README.md` (what is collected, the setting and the secret, how to turn it on) and `ARCHITECTURE.md` (the vote path's new fields, the sign-in report, `device_events`, retention), without referring to specs
- [X] T041 Add the feature's decisions to `CLAUDE_COMPLETE.md` as the earlier features' are, and add `device_events` to any cross-feature list there
- [X] T042 Run `npx tsc --noEmit` and `npm test`, and fix what they find
- [ ] T043 Run `quickstart.md` Q1–Q17 in real browsers, recording in particular what Q3 shows about the hardware value across browsers (R3)
- [ ] T044 Measure SC-004 locally: the time from pressing Vote to seeing the result with collection off and on, and record the result in `quickstart.md`
- [X] T045 Draft the message telling test users what is recorded and why, and record FR-025, FR-026 and FR-028 as a release checklist, in `specs/20261105-162941-MULTIPLE-ACCOUNT-PREVENTION/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → the user stories → **Polish (8)**.

### User Story Dependencies

- **US1 (P1)**: only needs Foundational.
- **US3 (P1)**: only needs Foundational, but **must ship with or before any release that turns collection on**.
- **US2 (P2)**: reuses `deviceEvidence.js` from US1 (T017).
- **US4 (P2)**: only needs Foundational; it must be complete before collection is turned on, since the policy promises it.
- **US5 (P2)**: needs rows to count, so it follows US1. The switch itself is T002.

### Within Each User Story

- Tests are written first and fail, then the implementation makes them pass.

### Parallel Opportunities

- T001, T003 and T004 (different files).
- T010 and T012, which start the two shared test files; the other tasks on `tests/device-events.test.ts` and `tests/client-device-evidence.test.ts` run in turn.
- T033 and T034.
- T039 and T040.
- US3 and US4 can run beside US1 once Foundational is done, taking the shared test files in turn.

### Parallel Example: User Story 4

```text
Task: "T033 Delete a poll's device_events in src/polls/store.ts"
Task: "T034 Delete device_events in src/legal/deleteAccount.ts"
```

## Implementation Strategy

### MVP First

1. Phases 1 and 2.
2. US1, then US3: votes leave evidence and users have been told.
3. **Stop and validate** with collection on in development (quickstart Q2, Q4–Q10, Q16).

### Incremental Delivery

1. Add US2 for sign-ins.
2. Add US4 and US5.
3. Polish.
4. Release with the setting off; then follow `quickstart.md`, "Turning collection on in production".

**Do not turn collection on in production** until US1, US2, US3, US4 and US5 are all released and FR-025's confirmation is done.
