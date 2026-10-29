# Implementation Plan: Plan Through Analyze Chain

**Branch**: `speckit-skills` (no dedicated branch) | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261029-171759-PLAN-ANALYZE-CHAIN/spec.md`

## Summary

A new skill, `/speckit-plan-thru-analyze`, checks that the current feature is ready (no plan yet, no `[NEEDS CLARIFICATION` marker, no open finding in `clarify-findings.md`), then runs `/speckit-plan`, `/speckit-tasks`, `/speckit-analyze` and `/speckit-analyze-findings` in turn through Claude Code's `Skill` tool, printing `Step <n> of 4` around each.
It passes its argument to `/speckit-plan` only, lists optional hooks without running them, runs mandatory ones, skips the remediation question of `/speckit-analyze`, stops at the first failed step, and ends at the findings prompt (R1–R7).
The journey message of `/speckit-requirements NEW` and the workflow block of `CLAUDE.md` each gain one line naming it (R8).

## Technical Context

**Language/Version**: Markdown instructions for a Claude Code skill (`SKILL.md`); the one shell call is PowerShell, as in the other Spec Kit skills.

**Primary Dependencies**: Claude Code's `Skill` tool; the existing `check-prerequisites.ps1`; nothing new.

**Storage**: none; the steps write their own files under `specs/<feature>/`.

**Testing**: no automated tests (R9): text checks and walk-throughs in `quickstart.md`.

**Target Platform**: Claude Code CLI on Windows 11.

**Project Type**: developer tooling (a Spec Kit skill) inside the CrowdPoll repository; no CrowdPoll code changes.

**Performance Goals**: N/A.

**Constraints**: the four skills and the two clarify skills are not edited (FR-015); the analysis report must still be in the conversation when `/speckit-analyze-findings` captures it, which running them back to back ensures.

**Scale/Scope**: one new file of roughly 120 lines; one line added to each of two existing files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | 9 requirements findings and 2 clarifications resolved; assumptions listed in the spec | Pass |
| II. Simplicity First | the steps are invoked, not copied (R1); no script, no stored state | Pass |
| III. Surgical Changes | one new skill; one line each in `CLAUDE.md` and the requirements skill's journey message (R8) | Pass |
| IV. Goal-Driven Execution | quickstart §1–§4 map to SC-001–SC-006 | Pass |
| V. Code Quality | errors are reported with the failed step and what finished (K5) | Pass |
| VI. Self-Documenting Code | no code; no explanatory comments | Pass |
| Documentation Deliverables | `README.md` / `ARCHITECTURE.md` describe CrowdPoll, not the skills: no change | Pass |

Post-design re-check: unchanged, all pass. No Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/20261029-171759-PLAN-ANALYZE-CHAIN/
├── spec.md
├── plan.md               # this file
├── research.md           # R1–R9
├── data-model.md         # feature, gate result, step, run states
├── quickstart.md         # text checks + three walk-throughs
├── contracts/
│   └── command.md        # K1 invocation … K7 listings
├── checklists/
│   └── requirements.md
└── tasks.md              # /speckit-tasks
```

### Source Code (repository root)

```text
.claude/skills/speckit-plan-thru-analyze/
└── SKILL.md                              # new
.claude/skills/speckit-requirements/SKILL.md   # one line in the NEW journey message
CLAUDE.md                                      # one line in the Spec Kit Workflow block
```

**Structure Decision**: one new skill folder beside the other Spec Kit skills, in their style (frontmatter, User Input, Outline, Completion Report); its sections follow the run: find the feature (R2), gate (R3), steps (R4–R7), end.

## Phase 0 / Phase 1 outputs

- `research.md` — R1 (`Skill` tool), R2 (feature lookup), R3 (gate), R4 (arguments), R5 (hooks and questions), R6 (failure), R7 (progress), R8 (listings), R9 (verification).
- `data-model.md`, `contracts/command.md`, `quickstart.md`.
- `CLAUDE.md` Spec Kit block points at this plan.
