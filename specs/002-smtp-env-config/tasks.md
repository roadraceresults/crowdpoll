# Tasks: Email & Auth-Secret Deployment Configuration

**Input**: Design documents from `/specs/002-smtp-env-config/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/environment-variables.md, quickstart.md

**Tests**: Included — the mandatory-secret rule (FR-010) and the rename (FR-002) are
behavior changes that get tests-first coverage in a new `tests/config.test.ts`.

**Organization**: Tasks are grouped by user story. This is a small delta on the
implemented `001-user-auth` system; most tasks are asset/documentation work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US2)

## Path Conventions

Single project at repository root per plan.md (`src/`, `tests/`, templates at root and
`devScripts.example/`).

---

## Phase 1: Setup

**Purpose**: Confirm the ground the launch-asset work relies on

- [X] T001 Verify `.gitignore` already covers the git-ignored launch assets (`devScripts/`, `.vscode/*` with `!.vscode/settings.json`) and that `devScripts.example/` and `launch.json.example` are tracked — confirmation only, no expected changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None — the `001-user-auth` infrastructure (config parser, mailer, test
harness) is already in place. No foundational tasks for this feature.

---

## Phase 3: User Story 1 - Operator Configures a Deployment Completely from the Documented Variable List (Priority: P1) 🎯 MVP

**Goal**: The renamed, mandatory secret and the documented SMTP settings are the only
configuration surface; startup refuses to run without a valid secret in every
environment (FR-001–003, FR-007–008, FR-010).

**Independent Test**: `npm test` green; launching with a <32-char or missing
`APP_BETTER_AUTH_SECRET` refuses to start naming the variable; launching with valid
variables sends email via the configured SMTP settings (quickstart US1 scenarios 1–5).

### Tests for User Story 1 (write first, ensure they FAIL) ⚠️

- [X] T002 [US1] Write `tests/config.test.ts`: `loadConfig` reads the secret from `APP_BETTER_AUTH_SECRET` (≥32 chars accepted); legacy `APP_AUTH_SECRET` is ignored even when set; unset, empty, and 31-character secrets are refused with a `ConfigError` naming the variable and the 32-character minimum (FR-002, FR-010); non-numeric/non-positive `APP_SMTP_PORT` refused naming the variable (FR-007); SMTP host/port/From defaults and `APP_SMTP_USER`/`APP_SMTP_PASS` passthrough parse correctly (FR-003)

### Implementation for User Story 1

- [X] T003 [US1] Update `src/config.ts`: source `authSecret` from `APP_BETTER_AUTH_SECRET`, delete the insecure dev fallback, and validate presence + ≥32-character length with a fail-fast `ConfigError` naming the variable and minimum (FR-002, FR-010; research R1/R4). SMTP parsing is already correct — do not touch beyond the secret
- [X] T004 [US1] Update `tests/helpers/setup.ts` to pass a fixed valid ≥32-character `APP_BETTER_AUTH_SECRET` in its `loadConfig` overrides, then run the full suite — all 001 suites plus `tests/config.test.ts` green (spec Assumptions: `npm test` works on a fresh clone with no launch assets)

**Checkpoint**: Config behavior final — quickstart US1 scenarios 4–5 (bad port, bad
secret) verifiable from a shell

---

## Phase 4: User Story 2 - Developer Launch Assets Carry the Full Variable Set (Priority: P2)

**Goal**: Checked-in templates carry the complete `APP_*` set with placeholders; a
checked-in setup script creates the git-ignored copies with one shared generated
secret (FR-004–FR-006, FR-005a).

**Independent Test**: Delete the git-ignored copies, run
`./devScripts.example/setup-dev.ps1`, and verify both copies exist, share one
≥32-character secret, contain no `__GENERATED_ON_SETUP__` remnants, and carry all
documented variables in every entry (quickstart US2 scenarios 1–5).

### Implementation for User Story 2

- [X] T005 [P] [US2] Regenerate `launch.json.example`: every entry (server + each test suite) gains `APP_BETTER_AUTH_SECRET: "__GENERATED_ON_SETUP__"` and the five SMTP variables — **replacing the real Mailtrap credentials currently in the file** with `your-mailtrap-username` / `your-mailtrap-password` placeholders (FR-004, FR-006; research R3; remediates the working-tree leak)
- [X] T006 [P] [US2] Update `devScripts.example/launch-dev.ps1`: set `APP_BETTER_AUTH_SECRET = "__GENERATED_ON_SETUP__"` and keep the five SMTP variables with credential placeholders; point the header comment at `setup-dev.ps1` instead of manual `Copy-Item` (FR-005, FR-006)
- [X] T007 [US2] Create `devScripts.example/setup-dev.ps1`: copy `launch.json.example` → `.vscode/launch.json` and `devScripts.example/launch-dev.ps1` → `devScripts/launch-dev.ps1`; generate one 48-character base64url secret via `[System.Security.Cryptography.RandomNumberGenerator]`; substitute every `__GENERATED_ON_SETUP__` in **both** copies with that single value; refuse to overwrite existing copies without `-Force`; print completion notes reminding the developer to fill in Mailtrap credentials (FR-005a; research R2)
- [X] T008 [US2] Recreate the local git-ignored working copies through the setup flow (script logic; on this non-Windows environment replicate its exact copy+substitute steps if PowerShell is unavailable) and verify: same secret in `.vscode/launch.json` and `devScripts/launch-dev.ps1`, no placeholder remnants, all entries carry the complete variable set (SC-003; quickstart US2 scenarios 1–3)

**Checkpoint**: Both stories independently verifiable

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T009 [P] Update `README.md`: configuration table — rename the secret row to `APP_BETTER_AUTH_SECRET` marked "required in every environment, ≥32 chars (startup fails without it)", keep/verify the five SMTP rows, and replace the manual `Copy-Item` first-time-setup instructions with `./devScripts.example/setup-dev.ps1` (FR-009; research R5)
- [X] T010 Security sweep: `git grep` tracked files for the previously leaked Mailtrap credentials, any generated secret value, and confirm every credential-bearing value in tracked files is an obvious placeholder; `__GENERATED_ON_SETUP__` appears only in the two templates (SC-004; constitution Security standards)
- [X] T011 Run the full `specs/002-smtp-env-config/quickstart.md` validation (automated suite + the shell-verifiable manual scenarios: startup refusal on missing/short secret, bad SMTP port, degraded-email warning, two-asset secret match) and confirm SC-001–SC-005; note any Windows-only steps (PowerShell script run, Mailtrap round trip) as deferred to the user's machine

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: T001 first (trivial)
- **US1 (Phase 3)**: T002 (test, must fail) → T003 (config change) → T004 (harness fix + full suite). Blocks nothing in US2 except final validation
- **US2 (Phase 4)**: T005 ∥ T006 (different files) → T007 (script referencing both) → T008 (uses all three)
- **Polish (Phase 5)**: T009 parallel anytime after T007; T010 after T005/T008; T011 last
- US1 and US2 are independent until T011 validates both together

## Parallel Opportunities

- T005 ∥ T006 (different template files)
- T009 ∥ (T007–T008) (README vs scripts)
- T002 may be written while T005/T006 are edited (different files)

## Implementation Strategy

**MVP = US1** (T001–T004): the runtime contract — rename + mandatory secret — is the
deployable behavior change; templates and setup script (US2) can follow in the same
session. Commit after each phase; T010's sweep must pass before anything is pushed,
since the current working tree contains real credentials in a tracked file.

## Notes

- The five SMTP variables are already read by `src/config.ts` under the documented
  names — no SMTP code changes; the mailer's degraded-mode warning and friendly 502
  path are existing behavior revalidated by T011.
- Secret rotation invalidates sessions by design; no migration handling (spec
  Assumptions).
