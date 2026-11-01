# Implementation Plan: Concise CLAUDE.md

**Branch**: `pop-poll-2` (no dedicated branch) | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261101-042151-CONCISE-CLAUDE-MD/spec.md`

## Summary

`CLAUDE.md` costs about 21,000 tokens on every request. 78% of that is a chain of 31 finished features'
summaries, and 13% is the settings table. This feature does three things:

- adds one project skill, `/speckit-concise-claudemd`, which only the developer can start;
- has the skill's first run copy today's `CLAUDE.md` verbatim to `CLAUDE_COMPLETE.md`, rewrite `CLAUDE.md` as a
  concise file, and move the settings table to a path-scoped rule, `.claude/rules/environment.md`;
- has each later run find what was added or edited in `CLAUDE.md` since the previous run (against a git baseline),
  bring `CLAUDE_COMPLETE.md` up to date, and condense `CLAUDE.md` again.

Two project skills change only their messages: `/speckit-tweak`'s "All tweaks resolved" and `/speckit-requirements`'
journey list. The shipped Spec Kit is not touched.

## Technical Context

**Language/Version**: Markdown (skill instructions and instruction files); Git Bash commands inside the skill (`cp`, `wc`, `git log`, `git diff`)

**Primary Dependencies**: Claude Code skills (`SKILL.md` frontmatter: `disable-model-invocation`), Claude Code path-scoped rules (`.claude/rules/*.md` with `paths:`), git

**Storage**: Files: `CLAUDE.md`, `CLAUDE_COMPLETE.md`, `.claude/rules/environment.md`; the baseline is a git commit, not stored (R4)

**Testing**: No application tests (FR-018, UA1 C); shell checks in `quickstart.md` (R10)

**Target Platform**: The developer's Claude Code CLI on Windows 11 (Git Bash available to the skill)

**Project Type**: Developer tooling (a Claude Code skill), beside the CrowdPoll web application

**Performance Goals**: None beyond the purpose: a markedly smaller per-request `CLAUDE.md`, judged from the size report (SC-001)

**Constraints**:
- no change to the shipped Spec Kit skills or extensions (FR-017);
- no CrowdPoll code, configuration, data or test change (FR-018);
- no size limits written anywhere (FR-005);
- `CLAUDE_COMPLETE.md` is never imported and never named as something for the AI to read (FR-003).

**Scale/Scope**: Today's `CLAUDE.md` is 907 lines and 91 KB. Three files are written, two project skills get message
edits, and one new skill is added.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Think Before Coding | Pass | 15 requirement findings and 3 clarifications settled the choices; R11 and R12 surface the two risks: where the first run happens, and not wiping the chain before the split |
| II. Simplicity First | Pass | One instruction file for the skill and no script (R1); no state file, because git is the baseline (R4); no dry-run flag (R2) |
| III. Surgical Changes | Pass | Only the four lines of the tweak message and the journey list change in the two project skills (R9); the shipped skills are untouched |
| IV. Goal-Driven Execution | Pass | Every requirement has a shell check in `quickstart.md` (R10) |
| V. Code Quality & Maintainability | Pass | No code; the skill stops with a clear `ERROR:` before writing when its inputs are wrong (K2) |
| VI. Self-Documenting Code | Pass (N/A) | No code is added |
| Documentation Deliverables | Pass | `README.md` and `ARCHITECTURE.md` describe the application, not developer tooling; no change (spec Assumptions) |

Post-design re-check: still passes; Phase 1 added no script, dependency or state.

## Project Structure

### Documentation (this feature)

```text
specs/20261101-042151-CONCISE-CLAUDE-MD/
├── plan.md              # This file
├── research.md          # R1–R12
├── data-model.md        # The four files, the git baseline, a run's states
├── quickstart.md        # Shell checks for every requirement
├── contracts/
│   ├── command.md       # K1–K6: invocation, run, report, merge recipe
│   ├── file-layout.md   # F1–F3: concise CLAUDE.md, CLAUDE_COMPLETE.md, the settings rule
│   └── messages.md      # M1–M2: the tweak message, the journey list
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
.claude/
├── skills/
│   ├── speckit-concise-claudemd/SKILL.md   # new (K1–K6)
│   ├── speckit-tweak/SKILL.md              # M1 only
│   └── speckit-requirements/SKILL.md       # M2 only
└── rules/
    └── environment.md                      # new, written by the first run (F3)
CLAUDE.md                                   # rewritten by the first run (F1)
CLAUDE_COMPLETE.md                          # new, written by the first run (F2)
```

**Structure Decision**: Everything lives under `.claude/` and at the repository root; nothing under `src/`, `tests/`
or `devScripts/` changes. The three instruction files are produced by the skill's first run, not written by hand
(UA5), so the first run is also the skill's first test.

## Complexity Tracking

No violations.
