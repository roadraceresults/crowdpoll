# Implementation Plan: Log Settings Left at Their Defaults

**Branch**: `log-env-default` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261029-150117-LOG-ENV-DEFAULTS/spec.md`

## Summary

At start-up the web server prints one `[config] <NAME> was not found, using default value: <VALUE>.` line for every setting it filled in itself, sorted by name, before `[server] Starting in …`.  
`loadConfig` records each default where it substitutes it, through a small reader (`settingsReader(env)`: `int`, `nonNegativeInt`, `text`), and returns the list as `AppConfig.defaultsUsed` without printing; settings with no value are recorded as `none (<behaviour>)` beside the code that already decides their fallback; `ENV_SMTP_*` entries are dropped unless the transport is `smtp`, and `ENV_OAUTH_*` are only read for `oauth`/`both`.  
`startServer` prints the list through `defaultsUsedLines(config)`, masking `ENV_ADMINS` with `maskAddress`.  
No behaviour, default or validation changes. Research R1–R6.  

## Technical Context

**Language/Version**: TypeScript 5 on Node.js 22 (ES modules).

**Primary Dependencies**: none new; `maskAddress` from `src/email/mailer.ts`.

**Storage**: N/A (in memory only, `data-model.md`).

**Testing**: Vitest; `tests/config.test.ts` (pure `loadConfig` calls, no database).

**Target Platform**: DigitalOcean App Platform (runtime log) and development on Windows 11; unchanged.

**Project Type**: Web service; this feature touches its start-up only.

**Performance Goals**: none beyond today's: at most about 70 extra string pushes and log lines once per start.

**Constraints**: no setting, route, dependency, data or migration; `loadConfig` stays side-effect free (scripts and tests print nothing new); every existing line stays (FR-013).

**Scale/Scope**: 54 numeric and 6 text settings with a concrete default; 10 settings or groups reported as `none`/`0`.

## Constitution Check

| Principle | Check |
|---|---|
| I. Think Before Coding | Every behaviour traces to a requirements decision or the clarification; the three wording choices the spec made are stated in its completion notes. ✅ |
| II. Simplicity First | One reader, one list, one formatting function; no new module, setting or dependency (R1, R4). ✅ |
| III. Surgical Changes | `src/config.ts` (reader, the six `??` reads, the `none` entries, `defaultsUsed`), `src/server.ts` (`defaultsUsedLines` and one loop), `tests/config.test.ts`; docs `README.md`, `ARCHITECTURE.md`, `CLAUDE.md`. The helper call sites change only in form (`intVar(env, …)` → `read.int(…)`). ✅ |
| IV. Goal-Driven Execution | Each FR has a test in `tests/config.test.ts`; quickstart steps 1–6 check SC-001–SC-005. ✅ |
| V. Code Quality | Server-side logging becomes more informative; no address is logged in full; an invalid setting still fails safely. ✅ |
| VI. Self-Documenting Code | No comments citing finding or requirement ids; names carry the meaning (`defaultsUsed`, `settingsReader`). ✅ |
| Documentation Deliverables | `README.md` and `ARCHITECTURE.md` updated in the same feature. ✅ |

Post-design re-check: unchanged, no violation.

## Project Structure

### Documentation (this feature)

```text
specs/20261029-150117-LOG-ENV-DEFAULTS/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R6
├── data-model.md        # DefaultUsed, AppConfig.defaultsUsed
├── quickstart.md        # steps 1–6
├── contracts/
│   └── log-lines.md     # L1–L3: the line, when and in what order, what is never printed
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── config.ts            # settingsReader, textVar reads, none entries, AppConfig.defaultsUsed
└── server.ts            # defaultsUsedLines(config); printed after loadConfig, before "[server] Starting in"

tests/
└── config.test.ts       # defaultsUsed and defaultsUsedLines

README.md                # Configuration: one sentence on the start-up lines
ARCHITECTURE.md          # Start-up sequence: one step
CLAUDE.md                # plan block
```

**Structure Decision**: the existing single-project layout; no new file under `src/`.
