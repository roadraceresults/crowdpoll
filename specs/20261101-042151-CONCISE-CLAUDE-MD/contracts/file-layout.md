# Contract: File Layouts

## F1 — Concise `CLAUDE.md`

These sections, in this order. No line or bullet counts are set (UA1 C, UA2 B, UA3 C).

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
The full description, every earlier feature's decisions and the settings table are in `CLAUDE_COMPLETE.md`, for developers.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/<feature>/plan.md` (<its artifacts, one sentence>). Decisions that are easy to get wrong:
- **…**
<!-- SPECKIT END -->

## Project Overview
## Layout
## Commands
## Configuration rules
## Cross-feature invariants
## Architecture Notes

Spec Kit uses the PowerShell scripts (`.specify/scripts/powershell/`).
```

Rules:

- `CLAUDE_COMPLETE.md` is named once, in backticks. There is never an `@` before it, and no sentence asks the AI to
  read it (FR-003).
- Exactly one plan path sits between the markers (SC-003).
- These are absent: any "The preceding feature is", the Spec Kit Workflow list, the Environment Variables table and
  the Key Design Documents history (FR-004).
- The first two lines of the SPECKIT block keep the shipped wording, so a later run of the agent-context script or
  `/speckit-plan` finds the pattern it writes.

## F2 — `CLAUDE_COMPLETE.md`

- **First run**: a verbatim copy of `CLAUDE.md` (R3).
- **After that**: the same sections, kept current (data-model.md). The chain sits inside its own SPECKIT markers,
  newest first.

## F3 — `.claude/rules/environment.md`

```markdown
---
paths:
  - "src/config.ts"
  - ".do/app.yaml"
  - "launch.json.example"
  - "devScripts.example/**"
  - "tests/config.test.ts"
---

## Environment Variables

<today's table and its closing paragraph, verbatim>
```
