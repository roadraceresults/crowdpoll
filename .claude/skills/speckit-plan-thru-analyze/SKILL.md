---
name: "speckit-plan-thru-analyze"
description: "Check that the current feature has no open clarification and no plan yet, then run /speckit-plan, /speckit-tasks, /speckit-analyze and /speckit-analyze-findings in turn, each starting when the previous one finishes, ending at the first analysis finding."
argument-hint: "Optional guidance for /speckit-plan"
compatibility: "Requires spec-kit project structure with .specify/ directory and a specified feature"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, PowerShell, Skill
user-invocable: true
disable-model-invocation: false
metadata:
    - author: "David Brooks"
---

# Skill Name / Purpose

This skill takes the current feature from a clarified spec to its analysis findings with one command.
It first checks that nothing in clarification is left open and that the feature has not been planned yet.
It then runs `/speckit-plan`, `/speckit-tasks`, `/speckit-analyze` and `/speckit-analyze-findings`, one after another, each
exactly as it behaves when the developer types it; none of them is copied or changed.

## User Input

```text
$ARGUMENTS
```

The text is optional guidance for `/speckit-plan`. Trim it; when it is not empty, pass it as the `args` of the
`speckit-plan` call, and pass nothing to the other three steps.

## Outline

1. **Find the feature.** Run `.specify/scripts/powershell/check-prerequisites.ps1 -Json -PathsOnly` once from the repository
   root and take `FEATURE_DIR`, `FEATURE_SPEC` and `IMPL_PLAN`. If it fails, show its `ERROR: …` line and stop: run nothing.
   The script does not check that the folder exists, so when `FEATURE_SPEC` does not exist, show
   `ERROR: <FEATURE_SPEC> not found. Run /speckit-specify first.` and stop the same way.

2. **Gate.** Check, from the files only (never from which command ran last), these three conditions, in this order,
   collecting every failure before deciding:
   1. **Not planned**: `IMPL_PLAN` does not exist.
   2. **No open marker**: `FEATURE_SPEC` contains no `[NEEDS CLARIFICATION` outside fenced code blocks and inline code
      spans (a mention in backticks names the marker, it is not one); note the line number of each one found.
   3. **No open clarification finding**: when `FEATURE_DIR/clarify-findings.md` exists, every finding section (a heading
      starting `### **<ID>**`) has a `✅ Resolved` line; note the id of each one that does not. When the file does not
      exist, the condition holds.

   A clarification session in the spec is not required. When any condition fails, run no step, change no file, print the
   following and stop, with one `❌` line per failed condition in the order above and `Next` naming the first one's next
   step:

   ```text
   ⚪
   ⚪ /speckit-plan-thru-analyze did not start: <feature_directory> is not ready.
   ⚪ ❌ Already planned: plan.md exists
   ⚪ ❌ Open clarification markers in spec.md: line <n>, …
   ⚪ ❌ Open findings in clarify-findings.md: <ID>, …
   ⚪
   🟩 👉 Next: <next step>
   ⚪
   ```

   | Failed condition | Next step |
   |---|---|
   | Already planned | run the remaining skills by hand, or delete `plan.md` to re-plan |
   | Open markers | `/speckit-clarify` |
   | Open findings | `/speckit-clarify-findings` |

3. **Run the steps.** When the gate passes, run these four steps in order. For each, print `Step <n> of 4: /<skill>`,
   invoke it with the `Skill` tool, follow its loaded instructions in full, and only then go on:

   | n | Skill | `args` | Expected output | Result summary |
   |---|---|---|---|---|
   | 1 | `speckit-plan` | the trimmed argument, omitted when empty | `plan.md` | `plan.md, research.md, data-model.md, contracts/, quickstart.md` (those written) |
   | 2 | `speckit-tasks` | none | `tasks.md` | `tasks.md (<count> tasks)` |
   | 3 | `speckit-analyze` | none | a printed `## Specification Analysis Report` | `<count> findings (<critical> critical)` |
   | 4 | `speckit-analyze-findings` | none | `analyze-findings.md` | `analyze-findings.md` |

   After each step that finished, print `✅ /<skill> finished: <result summary>`.

   **Within a step:**
   - An optional hook (`optional: true`) is printed in the step's own "Optional Hook" format and not run.
   - A mandatory hook (`optional: false`) is run exactly as the step says (`EXECUTE_COMMAND`).
   - Step 8 of `/speckit-analyze`, the offer of remediation edits, is not asked: `/speckit-analyze-findings` replaces it.
   - No other question stops the run.

   **When a step fails** — its instructions stop with an error (a failed mandatory hook included), or its expected
   output is missing once it ends — print the following and invoke nothing further:

   ```text
   ❌ /<skill> failed: <error>
   Finished: <the finished steps, or "none">
   Not run: <the later steps>
   ```

4. **End.** After step 4 the run ends with the prompt `/speckit-analyze-findings` prints; the developer carries on from it
   with "Next", "Accept" or "Accept all".

## Completion Report

- A normal run ends with the `/speckit-analyze-findings` prompt and nothing after it.
- A refused run ends with the gate block of step 2.
- A failed run ends with the failure block of step 3.
