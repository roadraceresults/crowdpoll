# Tasks: Allowlist Domain Wildcard

**Input**: Design documents from `specs/20261109-201638-ALLOWLIST-DOMAIN-WILDCARD/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/allowlist-setting.md, quickstart.md

**Tests**: requested by the spec (FR-010), in `tests/allowlist.test.ts`.

**Organization**: tasks are grouped by user story. Parsing is in `src/config.ts` and matching in `src/auth/allowlist.ts`,
so tasks touching the same file run one after another; documentation tasks of different files may run in parallel.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: the user story the task belongs to (US1–US3)

---

## Phase 1: Setup

No setup: no dependency, setting or file to create.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: replace `allowedEmailKeys` with one `Allowlist` value, with no change in behaviour yet.

- [X] T001 In `src/config.ts`, export `interface Allowlist { keys: Set<string>; patterns: RegExp[] }`, replace `AppConfig.allowedEmailKeys?: Set<string>` with `allowlist?: Allowlist` (doc comment kept, reworded), and rename `allowedEmailKeys(env)` to `allowlistFrom(env)` returning `{ keys, patterns: [] }` for today's address-only entries (`undefined` when there is none), with `loadConfig` setting `allowlist` and its `read.none` line unchanged (R1, data-model)
- [X] T002 In `src/auth/allowlist.ts`, make `isAllowed` and `allowlistStatus` read `config.allowlist` (`allowlist.keys` for the lookup and the count) (R1, R4)
- [X] T003 [P] Replace the "is the allowlist on?" checks `if (config.allowedEmailKeys)` with `if (config.allowlist)` in `src/auth/auth.ts` (`session.create.before`) and `src/routes/api.ts` (the two link checks) (R6)
- [X] T004 [P] Adjust the tests that read or swap the old field: `tests/allowlist.test.ts` ("is off when absent…" and "holds the email key…" read `allowlist` and `allowlist.keys`) and `tests/invitations-api.test.ts:139–149` (swap `ctx.config.allowlist` for `{ keys: new Set([emailKeyOf("ok@example.com")]), patterns: [] }`) (R6)

**Checkpoint**: `npx tsc --noEmit` passes; `npx vitest run tests/allowlist.test.ts tests/invitations-api.test.ts` passes unchanged in behaviour.

---

## Phase 3: User Story 1 — Admit everyone at a domain with one entry (Priority: P1) 🎯 MVP

**Goal**: `*@crowdpoll.vote` admits every address at that domain on every guarded path, and a pattern-only list turns
the allowlist on.

**Independent Test**: with `ENV_ALLOWED_EMAILS=*@crowdpoll.vote`, a login link is sent to `qa1@crowdpoll.vote` and
refused for `someone@example.org`.

### Tests for User Story 1

- [X] T005 [US1] In `tests/allowlist.test.ts` ("allowlist setting"), add: `*@crowdpoll.vote` alone gives an `allowlist` with no keys and one pattern (on); a mixed list keeps the address's key and the pattern; and an `isAllowed` case: `qa1@crowdpoll.vote` and `QA1@CrowdPoll.Vote` and `qa+t@crowdpoll.vote` admitted, `someone@example.org` refused, an `ENV_ADMINS` address admitted (FR-001, FR-003–FR-005)
- [X] T006 [US1] In `tests/allowlist.test.ts`, following the existing request-login-link and provider (`user.create.before` / `session.create.before`) cases of the file, add the same journeys for a pattern-only list `*@crowdpoll.vote`: a link request for `qa1@crowdpoll.vote` is sent and one for `someone@example.org` answers `403 not-launched` with nothing sent; a provider-style sign-in for `qa2@crowdpoll.vote` creates the account and starts a session, following the file's "session hook" cases (FR-006, SC-001)

### Implementation for User Story 1

- [X] T007 [US1] In `allowlistFrom` (`src/config.ts`), sort each entry into an address (no `*`, validated and keyed as today) or a pattern (holds `*`), compiling a pattern to `new RegExp("^" + escaped + "$")`, where every character other than `*` is regex-escaped and each `*` becomes `[^@]*` (R3; validation of the pattern's shape is T012)
- [X] T008 [US1] In `isAllowed` (`src/auth/allowlist.ts`), after the administrator and exact-key checks, admit the address when any `allowlist.patterns` entry tests true against `emailKeyOf` of the trimmed, lower-cased address (R3, R4)

**Checkpoint**: T005–T006 pass.

---

## Phase 4: User Story 2 — Patterns anywhere in an entry (Priority: P2)

**Goal**: `*` works anywhere and more than once, matched literally against the email key.

**Independent Test**: the matching table of `data-model.md` holds row by row.

### Tests for User Story 2

- [X] T009 [US2] In `tests/allowlist.test.ts`, add a table-driven `isAllowed` test with every row of the `data-model.md` matching table: `qa-*@gmail.com` (`qa-anna` in, `anna` out), `*@*.crowdpoll.vote` (subdomain in, bare domain out), `*@gmail.com` with `googlemail.com`, `john*@gmail.com` and `john.*@gmail.com` against `john.smith@gmail.com`, `qa*@x.org` admitting `qa@x.org`, `*@x.org` refusing `qa@xyorg`, `a*@x.org` refusing `a@b@x.org`, and `*@*` admitting any address (FR-001, FR-003)

### Implementation for User Story 2

No code beyond T007–T008: the compiled expression already handles any number of `*` in any position. Fix T007 if a T009 row fails.

**Checkpoint**: T009 passes.

---

## Phase 5: User Story 3 — A clear startup state and a clear refusal (Priority: P3)

**Goal**: a malformed pattern stops the app with a message showing `*@crowdpoll.vote`; the startup line counts addresses
and patterns.

**Independent Test**: start-up with `a@x.org,b@x.org,*@crowdpoll.vote` prints `(2 addresses, 1 pattern)`; with
`*.crowdpoll.vote` it stops with the S2 message.

### Tests for User Story 3

- [X] T010 [US3] In `tests/allowlist.test.ts`, extend "refuses an entry that is not an address": `*.crowdpoll.vote`, `*@`, `@*` and `a@b@*` each throw `ConfigError` with exactly `Invalid ENV_ALLOWED_EMAILS: "<entry>" is not an email address or a pattern such as "*@crowdpoll.vote".`, while `*@*` loads (FR-002, contract S2)
- [X] T011 [US3] In `tests/allowlist.test.ts`, extend "reports its state at startup by count": patterns only → `(1 pattern)` and `(2 patterns)`; mixed → `(2 addresses, 1 pattern)`; addresses only unchanged; the line contains no entry (`crowdpoll.vote` absent) (FR-007, SC-004, contract S3)

### Implementation for User Story 3

- [X] T012 [US3] In `allowlistFrom` (`src/config.ts`), refuse a pattern that does not match `^[^\s@]+@[^\s@]+$` with the S2 message (R2)
- [X] T013 [US3] In `allowlistStatus` (`src/auth/allowlist.ts`), build the parts `<n> addresses` (when keys exist) and `<m> pattern`/`<m> patterns` (when patterns exist), joined by `, ` (R5); then `; <k> administrator(s) always allowed` when `ENV_ADMINS` holds any (TWEAK01)

**Checkpoint**: T010–T011 pass.

---

## Phase 6: Documentation (post-implementation)

- [X] T014 [P] `README.md`: in the pre-launch paragraph and the `ENV_ALLOWED_EMAILS` settings row, describe patterns (`*@crowdpoll.vote`, `*` anywhere, matched against the email key), the warning that a pattern admits everyone with a matching mailbox, and the Gmail note that a pattern with a dot in a Gmail local part matches nothing (FR-009)
- [X] T015 [P] `ARCHITECTURE.md`, "Pre-launch allowlist": `config.allowlist` (`keys` and compiled `patterns`), the order of the checks in `isAllowed`, and that every guarded path gets patterns through it (FR-009)
- [X] T016 [P] `CLAUDE_COMPLETE.md` and `.claude/rules/environment.md`: the `ENV_ALLOWED_EMAILS` row mentions patterns and the startup counts (FR-009)
- [X] T017 [P] `infra/secrets.auto.tfvars.example`: a comment line above `allowed_emails` showing a mixed list, e.g. `# allowed_emails: addresses and patterns, e.g. "tester@example.org,*@crowdpoll.vote"` (FR-008, FR-009)

---

## Phase 7: Polish & verification

- [X] T018 Run `npx tsc --noEmit` and `npm test`; all pass (SC-001–SC-004)
- [X] T019 Run the manual checks 1–4 of `quickstart.md` against the local server

---

## Dependencies & Execution Order

- Phase 2 (T001 → T002; T003, T004 after T001) blocks every story.
- US1 (T005–T008) after Phase 2; US2 (T009) after T007–T008; US3 (T010–T013) after Phase 2, and T012 edits the same
  function as T007, so after it.
- Phase 6 after US1–US3; T014–T017 in parallel. Phase 7 last.

## Parallel Opportunities

- T003 and T004 (different files) after T001.
- T014, T015, T016 and T017 (four different files).
- Tests in `tests/allowlist.test.ts` are one file, so they are written one after another.

## Implementation Strategy

- **MVP**: Phase 2 + US1 — a domain pattern admits a tester domain on every path.
- Then US2 (the matching table, no new code expected), US3 (refusal and startup line), documentation, verification.
