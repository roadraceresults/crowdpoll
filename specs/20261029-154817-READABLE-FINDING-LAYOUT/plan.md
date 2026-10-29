# Implementation Plan: Readable Finding Layout

**Branch**: `speckit-skills` (no dedicated branch) | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261029-154817-READABLE-FINDING-LAYOUT/spec.md`

## Summary

`/speckit-requirements` gets a finding layout that shows at a glance what is open: a block-quoted explanation, a `❌ NOT Resolved` line, and an Accept line per option that starts with its box, `[ ] ➡️ **Accept** (…)`, and names the command `Accept <ID>, <LETTER>`.
A resolved finding loses the `❌` line and its instructions, gains `✅ Resolved`, the requirements line and the Notes line, and reads `Accepted` / `Not Accepted` per option.
The new command accepts any open finding by id; the existing commands are unchanged.
Old reports keep the old form, detected from their Accept lines.
The whole change is one file, `.claude/skills/speckit-requirements/SKILL.md`, with the layout described once, in *Finding layout* (research R1, R2).

## Technical Context

**Language/Version**: Markdown instructions for a Claude Code skill (`SKILL.md`), executed by the model; shell commands in it are Git Bash.

**Primary Dependencies**: Claude Code's skill loader; nothing new.

**Storage**: the Markdown reports under `requirements/<feature>/requirements-report.md`; `.specify/requirements.json` unchanged.

**Testing**: no automated tests (R10): text searches over `SKILL.md` and the walk-throughs in `quickstart.md`.

**Target Platform**: Claude Code CLI on Windows 11 (Git Bash), reports viewed in VS Code's editor and Markdown preview.

**Project Type**: developer tooling (a Spec Kit skill) inside the CrowdPoll repository; no CrowdPoll code changes.

**Performance Goals**: N/A.

**Constraints**: CommonMark rendering (a four-space indent after a blank line is a code block, R3); old-form reports must keep working (R9).

**Scale/Scope**: one file of 866 lines; about 10 sections touched; 10 existing reports, one with open findings.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Think Before Coding | 14 requirements findings and 2 clarifications resolved; assumptions listed in the spec | Pass |
| II. Simplicity First | one file, no script, no stored setting; form detected from the text (R5) | Pass |
| III. Surgical Changes | only the sections in R1; other skills untouched (NC1); "a a" and the report's name fixed only on lines already changed | Pass |
| IV. Goal-Driven Execution | quickstart searches and walk-throughs are the success checks, mapped to SC-001–SC-006 | Pass |
| V. Code Quality | the layout described once instead of 25 times (R2) | Pass |
| VI. Self-Documenting Code | no code; no explanatory comments added to the skill | Pass |
| Documentation Deliverables | `README.md` / `ARCHITECTURE.md` describe CrowdPoll, not the skills: no change | Pass |

Post-design re-check: unchanged, all pass. No Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/20261029-154817-READABLE-FINDING-LAYOUT/
├── spec.md
├── plan.md               # this file
├── research.md           # R1–R11
├── data-model.md         # report, finding, option, state transitions
├── quickstart.md         # searches + two walk-throughs
├── contracts/
│   ├── finding-layout.md # L1 open, L2 resolved, L3 reading, L4 old form
│   └── commands.md       # C1 Accept <ID>, C2–C4 unchanged, C5 prompts
├── checklists/
│   └── requirements.md
└── tasks.md              # /speckit-tasks
```

### Source Code (repository root)

```text
.claude/skills/speckit-requirements/
└── SKILL.md              # the only file changed
```

**Structure Decision**: a single-file edit. The sections and their order stay; *Finding layout* is rewritten around `contracts/finding-layout.md`, *Resolution of Findings* gains command 4 and *Prompting The Developer* names the current id; the other sections change only where they quote the layout (R1).

## Phase 0 / Phase 1 outputs

- `research.md` — R1 (sections to change), R2 (describe once), R3 (block quote), R4 (ticks), R5 (form detection), R6 (grammar), R7 (resolved wording), R8 (`❌` upkeep), R9 (old reports), R10 (verification), R11 (writing rules).
- `data-model.md`, `contracts/finding-layout.md`, `contracts/commands.md`, `quickstart.md`.
- `CLAUDE.md` Spec Kit block points at this plan.
