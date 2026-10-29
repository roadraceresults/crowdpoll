---

description: "Task list for Log Settings Left at Their Defaults"
---

# Tasks: Log Settings Left at Their Defaults

**Input**: Design documents from `specs/20261029-150117-LOG-ENV-DEFAULTS/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R6), data-model.md, contracts/log-lines.md (L1–L3), quickstart.md

**Tests**: Requested by the requirements (Decisions, UA4) and the plan (Constitution IV): unit tests in `tests/config.test.ts`, written before the code they check.

**Organization**: Tasks are grouped by user story; every story's code is in `src/config.ts` and `src/server.ts`, so stories run one after the other, not in parallel.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Confirm the starting point.

- [X] T001 Run `npx tsc --noEmit` and `npx vitest run tests/config.test.ts` from the repository root and confirm both pass before any change.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The reader and the list every story writes to (R1, data-model.md).

- [X] T002 In `src/config.ts`, add `export interface DefaultUsed { name: string; value: string }` and `defaultsUsed: readonly DefaultUsed[]` on `AppConfig`.
- [X] T003 In `src/config.ts`, replace the module functions `intVar` and `nonNegativeIntVar` with `settingsReader(env: Env)`, returning `{ int(name, fallback), nonNegativeInt(name, fallback), text(name, fallback), none(name, behaviour), defaultsUsed }`: `int`/`nonNegativeInt` keep today's parsing and error messages exactly and push `{ name, value: String(fallback) }` when the raw value is `undefined` or `""`; `text` returns `env[name] ?? fallback` and pushes only when the raw value is `undefined` (R5); `none(name, behaviour)` pushes `{ name, value: behaviour }`.
- [X] T004 In `loadConfig` (`src/config.ts`), create `const read = settingsReader(env)` first and change every `intVar(env, "X", n)` / `nonNegativeIntVar(env, "X", n)` call to `read.int("X", n)` / `read.nonNegativeInt("X", n)`, with no other change to those lines; return `defaultsUsed: [...read.defaultsUsed].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))` (code-unit order) on the config object. `npx tsc --noEmit` and the existing `tests/config.test.ts` must still pass.

**Checkpoint**: The configuration carries a list of numeric defaults; nothing is printed yet.

---

## Phase 3: User Story 1 - See every setting the server filled in itself (Priority: P1) 🎯 MVP

**Goal**: One `[config] <NAME> was not found, using default value: <VALUE>.` line per setting with a concrete default, sorted, before `[server] Starting in …` (FR-001–FR-003, FR-007, FR-009–FR-011, FR-013; contract L1, L2).

**Independent Test**: Quickstart steps 2, 3 and 5: a bare start lists `ENV_PORT … 8080.` and the others; `ENV_PORT=9090` removes its line; `ENV_PORT=abc` prints only the error.

### Tests for User Story 1

- [X] T005 [US1] In `tests/config.test.ts`, add `describe("defaultsUsed")` with: `loadConfig(baseEnv())` lists `{ name: "ENV_PORT", value: "8080" }`, `{ name: "ENV_MAX_SIGNIN_COOKIE_DURATION", value: "2592000000" }`, `{ name: "ENV_SIGNIN_METHOD", value: "native" }`, `{ name: "ENV_DATABASE_URL", value: "postgres://localhost:5432/app01" }`, `{ name: "ENV_EMAIL_TRANSPORT", value: "smtp" }`, `{ name: "ENV_ADMINS", value: "roadraceresults@gmail.com" }` and `{ name: "ENV_EMAIL_FROM", value: "CrowdPoll <no-reply@mail.crowdpoll.vote>" }`; every one of the 54 numeric settings read by `loadConfig`, held in the test as an explicit array of `[name, default]` pairs copied from `src/config.ts`, appears exactly once with that default (so a new numeric setting fails the test until it is added); `ENV_PORT: "9090"` removes the `ENV_PORT` entry; `ENV_PORT: ""` keeps it; `ENV_ADMINS: ""` has no `ENV_ADMINS` entry and `config.admins` is `[]`; the list is sorted by name with no duplicate; neither `ENV_BETTER_AUTH_SECRET` nor `ENV_PUBLIC_ORIGIN` appears; `loadConfig` writes nothing to `console.log` (spy); `loadConfig(baseEnv({ ENV_PORT: "abc" }))` throws `ConfigError` and `console.log` was not called (FR-010).
- [X] T006 [US1] In `tests/config.test.ts`, add `describe("defaultsUsedLines")` importing `defaultsUsedLines` from `../src/server.js`: for a config whose `defaultsUsed` is `[{ name: "ENV_PORT", value: "8080" }]` it returns exactly `["[config] ENV_PORT was not found, using default value: 8080."]`, and for an empty list `[]`.

### Implementation for User Story 1

- [X] T007 [US1] In `loadConfig` (`src/config.ts`), replace the six `??` reads with `read.text(...)`, keeping each fallback: `ENV_SIGNIN_METHOD` (`"native"`), `ENV_DATABASE_URL` (`"postgres://localhost:5432/app01"`), `ENV_EMAIL_TRANSPORT` (`"smtp"`), `ENV_ADMINS` (`"roadraceresults@gmail.com"`), `ENV_SMTP_HOST` (`"sandbox.smtp.mailtrap.io"`), `ENV_EMAIL_FROM` (`"CrowdPoll <no-reply@mail.crowdpoll.vote>"`); the `ENV_DATABASE_URL === undefined` test for the Valkey check stays as it is.
- [X] T008 [US1] In `src/server.ts`, add `export function defaultsUsedLines(config: AppConfig): string[]` beside `providerList`, returning `` `[config] ${name} was not found, using default value: ${value}.` `` for each entry of `config.defaultsUsed`.
- [X] T009 [US1] In `startServer` (`src/server.ts`), right after the `loadConfig` `try`/`catch` and before `[server] Starting in …`, print each line of `defaultsUsedLines(config)` with `console.log`; leave every existing line, including `[db] ENV_DATABASE_CA_CERT is not set …` and the mailer's warning, unchanged.
- [X] T010 [US1] Run `npx vitest run tests/config.test.ts` and `npx tsc --noEmit`; T005 and T006 pass.

**Checkpoint**: User Story 1 works on its own (quickstart steps 2, 3, 5).

---

## Phase 4: User Story 2 - See which optional services and features are off (Priority: P2)

**Goal**: Settings with no value are reported as `none (<behaviour>)` (or `0 (…)`), groups as one line (FR-004, FR-005; R2).

**Independent Test**: Quickstart step 2: `ENV_VALKEY_URL … none (in-process cache, queue and registry).` appears on a bare start and goes once it is set.

### Tests for User Story 2

- [X] T011 [US2] In `tests/config.test.ts` (`describe("defaultsUsed")`), add: with `baseEnv()` the list holds exactly these values: `ENV_VALKEY_URL` → `none (in-process cache, queue and registry)`, `ENV_OPENSEARCH_URL` → `none (PostgreSQL full-text search)`, `ENV_SPACES_*` → `none (TRENDING objects and assets served from the instance)` (one entry, and no `ENV_SPACES_BUCKET`… entry), `ENV_DATABASE_CA_CERT` → `none (system certificate roots)`, `ENV_ALLOWED_EMAILS` → `none (allowlist off: everyone may sign in)`, `ENV_EMAIL_ASSET_ORIGIN` → `none (each link's own origin)`, `ENV_PROTOTYPES` → `none (no prototypes served)`, `ENV_STAY_SIGNED_IN` → `0 (the Stay signed in box starts clear)`, `ENV_SMTP_USER` and `ENV_SMTP_PASS` → `none (emails logged to the console, not sent)`; `ENV_VALKEY_URL: ""` keeps its entry; `ENV_SMTP_USER: ""` keeps its `ENV_SMTP_USER` entry; `ENV_PROTOTYPES: " , "` keeps its `ENV_PROTOTYPES` entry and `ENV_PROTOTYPES: "SINGLE-COLUMN-RENDERING"` removes it; `ENV_VALKEY_URL: "redis://localhost:6379"` removes it; all five `ENV_SPACES_*` set removes `ENV_SPACES_*`; `ENV_SIGNIN_METHOD: "both"` with only the two Google settings lists `ENV_OAUTH_APPLE_*` → `none (Apple sign-in off)`, `ENV_OAUTH_MICROSOFT_*` → `none (Microsoft sign-in off)`, `ENV_OAUTH_AMAZON_*` → `none (Amazon sign-in off)` and no `ENV_OAUTH_GOOGLE_*`.

### Implementation for User Story 2

- [X] T012 [US2] In `loadConfig` (`src/config.ts`), after the value is read and only when it is `undefined` (absent or empty), call `read.none(...)` with the FR-004 wording for `ENV_VALKEY_URL`, `ENV_OPENSEARCH_URL`, `ENV_DATABASE_CA_CERT` and `ENV_EMAIL_ASSET_ORIGIN`; for `ENV_ALLOWED_EMAILS` and `ENV_PROTOTYPES` when the parsed list is empty (`allowedEmailKeys` returns `undefined`; `prototypes.length === 0`), which covers absent, `""` and values holding only commas and spaces; for `ENV_STAY_SIGNED_IN` when absent or `""` (value `0 (the Stay signed in box starts clear)`); for `ENV_SMTP_USER` and `ENV_SMTP_PASS`, each when absent or `""` (the mailer treats an empty credential as not set).
- [X] T013 [US2] Pass `read` to `spacesConfig` and `oauthProvidersOf` in `src/config.ts`: `spacesConfig` calls `read.none("ENV_SPACES_*", "none (TRENDING objects and assets served from the instance)")` where it returns `undefined` because all five are unset; `oauthProvidersOf` calls `read.none(`ENV_OAUTH_${provider.toUpperCase()}_*`, `none (${PROVIDER_NAMES[provider]} sign-in off)`)` where it `continue`s because all of a provider's values are unset. No other change to either function.
- [X] T014 [US2] Run `npx vitest run tests/config.test.ts`; T011 passes.

**Checkpoint**: User Stories 1 and 2 both work (quickstart step 2).

---

## Phase 5: User Story 3 - Quiet, safe logs in production (Priority: P3)

**Goal**: No line for settings not in effect; `ENV_ADMINS` masked (FR-006, FR-008; R3, R4; contract L3).

**Independent Test**: Quickstart step 4: with `ENV_EMAIL_TRANSPORT=ses`, no `ENV_SMTP_*` line and no full address.

### Tests for User Story 3

- [X] T015 [US3] In `tests/config.test.ts` (`describe("defaultsUsed")`), add: with `ENV_EMAIL_TRANSPORT: "ses"` and the three `ENV_SES_*` values, no entry's name starts with `ENV_SMTP_`; with `baseEnv()` (transport `smtp` by default) `ENV_SMTP_HOST` → `sandbox.smtp.mailtrap.io` and `ENV_SMTP_PORT` → `2525` are listed; with `baseEnv()` (method `native`) no entry's name starts with `ENV_OAUTH_`.
- [X] T016 [US3] In `tests/config.test.ts` (`describe("defaultsUsedLines")`), add: `{ name: "ENV_ADMINS", value: "roadraceresults@gmail.com" }` gives `[config] ENV_ADMINS was not found, using default value: r•••@gmail.com.`; `{ name: "ENV_EMAIL_FROM", value: "CrowdPoll <no-reply@mail.crowdpoll.vote>" }` is printed in full; for `loadConfig(baseEnv())` no line contains `roadraceresults@gmail.com`.

### Implementation for User Story 3

- [X] T017 [US3] In `loadConfig` (`src/config.ts`), when building the returned `defaultsUsed`, drop entries whose name starts with `ENV_SMTP_` unless `emailTransport === "smtp"` (R3).
- [X] T018 [US3] In `defaultsUsedLines` (`src/server.ts`), for `ENV_ADMINS` print the value split on `,`, each address trimmed and passed through `maskAddress` (import it from `./email/mailer.js` beside `initMailer`), joined with `, ` (R4).
- [X] T019 [US3] Run `npx vitest run tests/config.test.ts`; T015 and T016 pass.

**Checkpoint**: All three stories work.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T020 [P] In `README.md`, under `## Configuration`, after the sentence "All settings are `ENV_*` environment variables. Intervals are in milliseconds unless noted.", add one sentence: at start-up the server prints `[config] <NAME> was not found, using default value: <VALUE>.` for each setting it left at its default (`none (…)` for one with no value; SMTP settings only with `smtp`, provider settings only with `oauth` or `both`; administrator addresses masked).
- [X] T021 [P] In `ARCHITECTURE.md`, in the `## Start-up and shutdown` sequence diagram, change the step `S->>S: loadConfig (fails fast, names the variable; a partial sign-in provider stops it)` to also say it records each default used, and add `S->>S: log each setting left at its default ([config] … was not found, using default value: …)` before the sign-in mode step.
- [X] T022 Check that no comment added in `src/config.ts` or `src/server.ts` cites a requirement, finding or task id (Constitution VI), and that the existing comments around the changed lines are untouched.
- [X] T023 Run `npx tsc --noEmit` and `npm test`; every suite passes and no `was not found` line appears in the test output (SC-005).
- [X] T024 Walk through `quickstart.md` steps 2–6 and record the result.

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T004)** → **US1 (T005–T010)** → **US2 (T011–T014)** → **US3 (T015–T019)** → **Polish (T020–T024)**.
- US2 and US3 depend on US1's `read.text`, `defaultsUsedLines` and print loop; they are independent of each other in behaviour, but every story edits `src/config.ts`, so run them in order.
- Within each story, the tests come first and fail until the implementation tasks are done.

## Parallel Opportunities

- T020 and T021 (different documents) can run together, and beside T022.
- No other pair: every code and test task edits `src/config.ts`, `src/server.ts` or `tests/config.test.ts`.

## Implementation Strategy

- **MVP**: Phases 1–3 (User Story 1): every setting with a concrete default is reported; stop and validate with quickstart steps 2, 3 and 5.
- **Increment 2**: Phase 4 adds the `none (…)` lines.
- **Increment 3**: Phase 5 silences settings not in effect and masks the address; Phase 6 documents and validates.
- Between the MVP and Phase 5, a production start would print `ENV_SMTP_*` lines and the full `ENV_ADMINS` default; ship only after Phase 5.
