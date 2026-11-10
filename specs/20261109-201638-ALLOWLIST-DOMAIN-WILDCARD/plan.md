# Implementation Plan: Allowlist Domain Wildcard

**Branch**: `20261109-201638-ALLOWLIST-DOMAIN-WILDCARD` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/20261109-201638-ALLOWLIST-DOMAIN-WILDCARD/spec.md`

## Summary

An entry of `ENV_ALLOWED_EMAILS` may hold `*`, making it a pattern. `loadConfig` builds one `Allowlist`
(`{ keys, patterns }`) in place of `allowedEmailKeys`, set whenever the list holds an entry of either kind (R1).
A pattern is valid when it is address-shaped (one `@`, something on each side); anything else stops the app with a
message showing `*@crowdpoll.vote` (R2). Each pattern is compiled once to an anchored `RegExp` (`*` → `[^@]*`, the rest
escaped) and matched against the address's email key (R3); `isAllowed` tries administrators, exact keys, then patterns
(R4). The startup line counts addresses and patterns (R5). The three "is the allowlist on?" checks read
`config.allowlist` (R6). Terraform is unchanged; tests and documentation are extended (R7). No migration, route,
setting, cookie or dependency.

## Technical Context

**Language/Version**: TypeScript on Node.js ≥ 22 (ESM)

**Primary Dependencies**: none new

**Storage**: none; a configuration value in memory

**Testing**: Vitest + supertest + embedded-postgres, `tests/allowlist.test.ts` extended, `tests/invitations-api.test.ts`
adjusted

**Target Platform**: the web service on DigitalOcean App Platform; developer machines (Windows 11)

**Project Type**: single project (web service)

**Performance Goals**: an allowlist check stays a `Set` lookup plus a few precompiled regex tests per login

**Constraints**: a list of addresses only behaves exactly as before (SC-002); a malformed entry never lets the app start
(SC-003); no entry or address is logged (SC-004)

**Scale/Scope**: files touched: `src/config.ts`, `src/auth/allowlist.ts`, `src/auth/auth.ts`, `src/routes/api.ts`,
`tests/allowlist.test.ts`, `tests/invitations-api.test.ts`, `infra/secrets.auto.tfvars.example`, `README.md`,
`ARCHITECTURE.md`, `CLAUDE_COMPLETE.md`, `.claude/rules/environment.md`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Think Before Coding** — PASS: twelve requirements findings resolved; the clarify pass found no open question.
- **II. Simplicity First** — PASS: one value replaces one value; a pattern is one escaped `RegExp`; no new setting.
- **III. Surgical Changes** — PASS: the field rename touches only its five readers; the `ENV_ADMINS` email-key debt is
  reported, not fixed.
- **IV. Goal-Driven Execution** — PASS: every FR maps to a test (R7, quickstart).
- **V. Code Quality & Maintainability** — PASS: parsing stays in `config.ts`, matching in `allowlist.ts`; an invalid
  entry is a `ConfigError` naming it.
- **VI. Self-Documenting Code** — PASS: `Allowlist`, `keys`, `patterns`, `allowlistFrom` carry the meaning.
- **Security, Privacy & Reliability** — PASS: input validated at start-up; escaped patterns cannot inject regex syntax;
  logs name no entry.
- **Documentation Deliverables** — README.md and ARCHITECTURE.md are updated in the task list's documentation phase.

**Post-Phase-1 re-check**: PASS — the design adds one configuration type and changes one log line, nothing else.

## Project Structure

### Documentation (this feature)

```text
specs/20261109-201638-ALLOWLIST-DOMAIN-WILDCARD/
├── plan.md                    # This file
├── research.md                # Phase 0: R1–R7
├── data-model.md              # Phase 1: the Allowlist value and the admission rule
├── quickstart.md              # Phase 1: automated and manual checks
├── contracts/
│   └── allowlist-setting.md   # S1–S3: entries, refusals, the start-up line
└── tasks.md                   # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── config.ts               # Allowlist type; allowlistFrom(env) replaces allowedEmailKeys(env)
├── auth/
│   ├── allowlist.ts        # isAllowed tries patterns; allowlistStatus counts patterns
│   └── auth.ts             # session.create.before: if (config.allowlist)
└── routes/
    └── api.ts              # two "on" checks: if (config.allowlist)

tests/
├── allowlist.test.ts       # parsing, refusal, matching, startup line, link and provider paths
└── invitations-api.test.ts # swaps ctx.config.allowlist

infra/secrets.auto.tfvars.example     # a comment showing a mixed list
README.md, ARCHITECTURE.md, CLAUDE_COMPLETE.md, .claude/rules/environment.md
```

**Structure Decision**: the existing single project; no new module.

## Complexity Tracking

No violations.
