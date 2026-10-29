# Quickstart: Plan Through Analyze Chain

Checks that `/speckit-plan-thru-analyze` works, against `contracts/command.md` (K1–K7).
Run from the repository root in Claude Code. Save `.specify/feature.json` before §2–§4 and restore it after.

## §1. Text checks

- `.claude/skills/speckit-plan-thru-analyze/SKILL.md` exists; its frontmatter has `user-invocable: true` and `Skill` in `allowed-tools`.
- It names the four steps in order, `Step <n> of 4`, the three gate conditions (R3), the hook rules (K4) and the failure report (K5).
- `grep -n "speckit-plan-thru-analyze" CLAUDE.md .claude/skills/speckit-requirements/SKILL.md` finds one line in each (K7).
- `git diff --stat` shows no change to `speckit-plan`, `speckit-tasks`, `speckit-analyze`, `speckit-analyze-findings`, `speckit-clarify` or `speckit-clarify-findings` (FR-015).

## §2. Gate refusals (SC-002)

On a throwaway feature folder `specs/99990101-000000-CHAIN-TEST/` with a copy of any `spec.md`, set `.specify/feature.json` to it, then for each case run `/speckit-plan-thru-analyze` and check that the K2 lines appear and that `git status` shows no new change:

1. add a line `[NEEDS CLARIFICATION: test]` to the spec → `❌ Open clarification markers…`, next `/speckit-clarify`;
2. remove it; add a `clarify-findings.md` with one finding section without `✅ Resolved` → `❌ Open findings…`, next `/speckit-clarify-findings`;
3. remove it; add an empty `plan.md` → `❌ Already planned…`;
4. remove `plan.md`, then repeat case 1 after `/clear`: the same K2 lines appear (SC-003);
5. set `feature_directory` to a missing folder → `ERROR: <FEATURE_SPEC> not found. Run /speckit-specify first.` (the script's `-PathsOnly` mode does not check the folder; found in T015).

## §3. A full run (SC-001, SC-005)

Remove `plan.md` from the throwaway feature, then run `/speckit-plan-thru-analyze focus on the gate`:

- four `Step <n> of 4` lines appear in order, each followed by a `✅ … finished` line;
- the plan reflects the guidance; no question is asked; the optional `agent-context` hook is listed, not run;
- the analysis does not offer remediation edits;
- `plan.md`, `tasks.md` and `analyze-findings.md` exist, and the last output is the findings prompt.

## §4. A failure (SC-004)

Rename `.specify/scripts/powershell/setup-tasks.ps1` for the run, so step 1 of `/speckit-tasks` fails every time, then run the command on a fresh copy (no `plan.md`):

- the run stops at step 2 with `❌ /speckit-tasks failed: …`, `Finished: /speckit-plan`, `Not run: /speckit-analyze, /speckit-analyze-findings`;
- restore the script.

## §5. Clean-up

Delete `specs/99990101-000000-CHAIN-TEST/`, restore `.specify/feature.json` and any `.specify/*.json` `last_written` entries the run added.
