# Contract: `/speckit-plan-thru-analyze`

## K1. Invocation

```text
/speckit-plan-thru-analyze [guidance for /speckit-plan]
```

- Skill folder `.claude/skills/speckit-plan-thru-analyze/`, file `SKILL.md`; frontmatter `user-invocable: true`, `allowed-tools` including `Skill` and `Bash` (R1).
- The argument, trimmed, goes to `/speckit-plan` only; empty means no guidance (R4).

## K2. Gate refusal

Printed when any condition fails; no step runs and no file changes:

```text
⚪
⚪ /speckit-plan-thru-analyze did not start: <feature_directory> is not ready.
⚪ ❌ <condition>: <open items, comma-separated, or the reason>
⚪ ... (one line per failed condition)
⚪
🟩 👉 Next: <command>
⚪
```

| Condition | Line | Next command |
|---|---|---|
| planned | `❌ Already planned: plan.md exists` | run the remaining skills by hand, or delete `plan.md` to re-plan |
| open marker | `❌ Open clarification markers in spec.md: line <n>, …` | `/speckit-clarify` |
| open clarification finding | `❌ Open findings in clarify-findings.md: <ID>, …` | `/speckit-clarify-findings` |

The failed conditions are listed in the order of the table (R3); with several, the `Next` line names the command of the first one listed.
No feature recorded: the prerequisites script's `ERROR: Feature directory not found…` line is shown instead, and the run stops. A recorded folder without `spec.md` (`-PathsOnly` does not check it): `ERROR: <FEATURE_SPEC> not found. Run /speckit-specify first.`, and the run stops.

## K3. Progress

```text
Step <n> of 4: /<skill>
… the step's own output …
✅ /<skill> finished: <summary>
```

Summaries: step 1 the files written (`plan.md, research.md, data-model.md, contracts/, quickstart.md`); step 2 `tasks.md (<count> tasks)`; step 3 `<count> findings (<critical> critical)`; step 4 `analyze-findings.md`.

## K4. Within a step (R5)

- Optional hook: printed in the step's "Optional Hook" format, not run.
- Mandatory hook: run as the step says; a failure is the step's failure.
- `/speckit-analyze` step 8 (remediation offer): not asked.

## K5. Failure (R6)

```text
❌ /<skill> failed: <error>
Finished: <list or "none">
Not run: <list>
```

Nothing after it runs.

## K6. End of a normal run

The run ends with the prompt `/speckit-analyze-findings` prints after capturing the report (its *Prompting The Developer*); the developer continues with "Next", "Accept" or "Accept all".

## K7. Listings (R8)

- `.claude/skills/speckit-requirements/SKILL.md`, journey message: one added line after `/speckit-analyze-findings` (optional).
- `CLAUDE.md`, Spec Kit Workflow block: one added line after `/speckit-analyze-findings`.
