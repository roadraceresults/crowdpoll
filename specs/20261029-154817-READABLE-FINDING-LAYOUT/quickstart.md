# Quickstart: Validating the Readable Finding Layout

No build or test suite applies: the change is to the instructions in `.claude/skills/speckit-requirements/SKILL.md`.
Validate it in three parts. Layouts are in `contracts/finding-layout.md`, commands in `contracts/commands.md`.

## Prerequisites

- A Claude Code session in the repository root, started after the skill was changed (skills are read at invocation).
- `git status` clean for `.specify/requirements.json`, or a copy of it, since the walk-through starts a throwaway feature.

## 1. Consistency of the skill text

```bash
f=.claude/skills/speckit-requirements/SKILL.md
grep -n '➡️ \[ \] \*\*Accepted\*\*' "$f"        # only in the Old form subsection and old-report rules
grep -n '\[ \] ➡️ \*\*Accept\*\*' "$f"          # the new Accept line, in Finding layout and Research Results
grep -n 'NOT Resolved\|Not Accepted' "$f"       # Finding layout, Resolving a finding, Next
grep -n 'Accept <ID>' "$f"                      # Resolution of Findings and Prompting The Developer
grep -n 'a a first\|Architecture Complete Report' "$f"   # nothing
```

Expected: every hit of the first search is in the old-form text; the others appear where the comments say.

## 2. A new report (User Stories 1–4)

1. `/speckit-requirements NEW`; fill the template with two short, deliberately vague paragraphs, including one research request; save; `Next`.
2. Open the new `requirements-report.md`. Expected: every finding matches L1 — block-quoted explanation (a link in a research result renders in the preview), `❌ NOT Resolved`, each option with `[ ] ➡️ **Accept** (…)` naming its own id and letter, empty blank lines, two between options.
3. Type `Accept <second open id>, B` (a finding with options). Expected: only that finding is resolved (L2: `❌` gone, `✅` lines and Notes, `[X] ➡️ **Accepted**` on B, `[ ] ➡️ **Not Accepted**` elsewhere, no instructions); the prompt then shows the first open finding with `Accept <ID>, X` in its Accept lines (C5).
4. In the file, tick an option as `[ x ]` and another finding's as `[X  ]`; save; `Next`. Expected: both resolved, boxes written `[X]`.
5. Tick A of a finding, then type `Accept <its id>, B`. Expected: resolved with B, A reads `[ ] ➡️ **Not Accepted**`.
6. Delete one open finding's `❌ NOT Resolved` line; save; `Next`. Expected: the line is back.
7. Type `Accept <a resolved id>`, `Accept XY9`, `Accept <open id>, Z`, and `Accept <open id>, <its Developer Resolution letter>` with nothing written there. Expected: each says why; `requirements-report.md`'s hash is unchanged.
8. `Accept all`, then answer the remaining findings until the Complete Report appears. Expected: zero lines starting `(To Accept` or `- you may enter` remain in resolved findings (SC-006).
9. Clean up: delete the throwaway requirements folder and restore `.specify/requirements.json`.

## 3. An old report (User Story 5)

1. Copy `requirements/20261028-151716-refresh-mechanisms/` to a throwaway folder and point `requirements_directory` at it in `.specify/requirements.json`.
2. Tick an old-form `➡️ [X] **Accepted**` line on one open finding; save; `Next`. Expected: resolved in the old form (L4) — no `❌` line, no `Not Accepted`.
3. Type `Accept <another open id>`. Expected: resolved in the old form.
4. Add a line to *Additional Requirements and Research Requests* that raises a new finding; `Next`. Expected: the new finding is in the old form.
5. Clean up: delete the copy and restore `.specify/requirements.json`.
