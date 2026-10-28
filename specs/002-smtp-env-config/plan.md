# Implementation Plan: Email & Auth-Secret Deployment Configuration

**Branch**: `dev` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-smtp-env-config/spec.md`

## Summary

Promote the authentication secret and the five SMTP email settings to first-class,
documented `APP_*` deployment configuration, and make the developer launch assets carry
them. Technical approach: this is a small delta on the implemented `001-user-auth`
system — the five `APP_SMTP_*` variables are already read by `src/config.ts` under
exactly the documented names, so the code change reduces to (a) renaming
`APP_AUTH_SECRET` → `APP_BETTER_AUTH_SECRET` in `src/config.ts` and making it
**mandatory**: startup fails fast in every environment when it is unset or shorter
than 32 characters (FR-010 — the previous insecure dev fallback is removed), (b)
keeping the existing `APP_SMTP_PORT` validation and degraded-email logging, and (c)
regenerating the two checked-in launch-asset templates with the full variable set —
with an auto-generated ≥32-character random secret written identically into both
**git-ignored working copies** at first-time setup, while the templates keep
placeholders. The test harness supplies its own valid secret. README's configuration
table is updated accordingly.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS (existing project)

**Primary Dependencies**: Existing stack — Express 5, better-auth 1.6.26, nodemailer;
no new dependencies. Secret generation uses the platform's standard random source
(PowerShell `Get-Random`-free approach: .NET `RNGCryptoServiceProvider` equivalent via
`[System.Security.Cryptography.RandomNumberGenerator]` or Node `crypto.randomBytes`,
decided in research R2)

**Storage**: N/A — configuration only; no data-model change beyond the config surface

**Testing**: Vitest (existing suites); config unit coverage extends the existing
fail-fast validation behavior to the renamed secret and SMTP port

**Target Platform**: DigitalOcean App Platform (deployment vars set in the platform
UI); Windows 11 + PowerShell for the developer launch assets

**Project Type**: Single project (existing layout)

**Performance Goals**: N/A — no runtime-path changes

**Constraints**: Single source of truth for variable names (`src/config.ts`); checked-in
templates must never contain real credentials or generated secrets (spec FR-006);
both git-ignored launch assets must share one generated secret (spec FR-005a)

**Scale/Scope**: ~7 files touched: `src/config.ts`, `tests/helpers/setup.ts` (valid
test secret), `README.md`, `launch.json.example`, `devScripts.example/launch-dev.ps1`,
plus a first-time-setup mechanism (`setup-dev.ps1`) and a new config test suite

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Think Before Coding | Delta scoped against implemented 001; the one naming conflict (`APP_AUTH_SECRET` vs `APP_BETTER_AUTH_SECRET`) identified and resolved by the source document's explicit name | ✅ PASS |
| II. Simplicity First | No new dependencies; reuse existing config parser/validation; setup = one small PowerShell script section, no scaffolding framework | ✅ PASS |
| III. Surgical Changes | Only the rename, template regeneration, setup step, README table rows, and matching test updates; no adjacent refactoring | ✅ PASS |
| IV. Goal-Driven Execution | Every FR maps to a verifiable check (config test for rename/validation, template grep for placeholders, both-assets-same-secret check) | ✅ PASS |
| V. Code Quality & Maintainability | Degraded-email and missing-secret conditions logged (already implemented); fail-fast errors name the variable | ✅ PASS |
| Security & Privacy standards | Real credentials/generated secrets only in git-ignored files; ≥32-char secret mandatory in every environment with fail-fast startup (FR-010, no fallback secret ever); existing working tree's leaked Mailtrap credentials in `launch.json.example` replaced with placeholders as part of this feature | ✅ PASS |
| Performance & Efficiency | No runtime additions | ✅ PASS |

**Post-Phase-1 re-check**: no new projects, dependencies, or patterns introduced by the
design. ✅ PASS — Complexity Tracking left empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-smtp-env-config/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── environment-variables.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
└── config.ts                    # rename APP_AUTH_SECRET → APP_BETTER_AUTH_SECRET and
                                 #   make it mandatory (≥32 chars, fail-fast, FR-010);
                                 #   SMTP vars already read under documented names

tests/
├── helpers/setup.ts             # supply a valid ≥32-char test secret to loadConfig
└── config.test.ts               # NEW: mandatory-secret refusal (unset/short), rename
                                 #   honored, APP_SMTP_PORT fail-fast, degraded email

README.md                        # configuration table: add the six variables
launch.json.example              # full APP_* set, placeholders for credentials/secret
devScripts.example/
├── launch-dev.ps1               # full APP_* set, placeholders; references setup
└── setup-dev.ps1                # NEW: first-time setup — copies both templates to
                                 #   their git-ignored locations and writes one
                                 #   generated ≥32-char secret into both copies
.vscode/launch.json              # git-ignored working copy (regenerated locally)
devScripts/launch-dev.ps1        # git-ignored working copy (regenerated locally)
```

**Structure Decision**: Single project, existing layout untouched. The only structural
addition is `devScripts.example/setup-dev.ps1` — the "first-time setup" step the spec
leaves to the plan (spec Assumptions) is a small checked-in PowerShell script, because
manual copy-plus-generate instructions cannot guarantee the same secret lands in both
assets (FR-005a) and the developer environment is mandated PowerShell.

## Complexity Tracking

No constitution violations — table intentionally empty.
