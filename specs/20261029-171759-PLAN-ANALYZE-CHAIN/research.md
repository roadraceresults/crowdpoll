# Research: Plan Through Analyze Chain

## R1. How one skill runs another

- **Decision**: the new skill calls each step with Claude Code's `Skill` tool (`skill: "speckit-plan"`, then `speckit-tasks`, `speckit-analyze`, `speckit-analyze-findings`), one call at a time, and follows the loaded instructions in full before the next call.
- **Rationale**: it is how a typed `/speckit-plan` is loaded, so each step behaves as when typed (FR-007).
  All four have `disable-model-invocation: false`, so the model may invoke them.
  The new skill's frontmatter lists `Skill` in `allowed-tools`, as `speckit-analyze-findings` and `speckit-clarify-findings` already do.
- **Alternatives considered**: copying the four skills' instructions into the new one (duplicates about 900 lines and drifts on every upgrade); the `specify` CLI workflow engine (`.specify/workflows/speckit/workflow.yml`), which drives an integration from outside Claude Code and has review gates the spec does not want.

## R2. Finding the current feature

- **Decision**: run `.specify/scripts/powershell/check-prerequisites.ps1 -Json -PathsOnly` once, as `/speckit-clarify` does, and take `FEATURE_DIR`, `FEATURE_SPEC` and `IMPL_PLAN`.
- **Rationale**: the same resolution the four steps use (FR-002): `SPECIFY_FEATURE_DIRECTORY`, else `.specify/feature.json`; with neither it prints `ERROR: Feature directory not found…`, which the skill shows and stops on (Edge Cases).
- **Alternatives considered**: reading `.specify/feature.json` directly (misses the environment-variable override).

## R3. The gate

- **Decision**: three conditions, all read from files, checked in this order, every failure collected before stopping:
  1. **Not planned**: `IMPL_PLAN` (`plan.md`) does not exist → else "already planned".
  2. **No open marker**: `spec.md` contains no `[NEEDS CLARIFICATION` (case-sensitive, as `/speckit-specify` writes it) outside fenced code and inline code spans (a backticked mention names the marker; found in T015) → else list each marker's line, next command `/speckit-clarify`.
  3. **No open clarification finding**: when `FEATURE_DIR/clarify-findings.md` exists, every finding section (`### **<ID>**` heading) has a `✅ Resolved` line → else list the open ids, next command `/speckit-clarify-findings`.
- **Rationale**: FR-003–FR-006 and clarification Q2 (no session required).
  The open-finding rule is the one `speckit-clarify-findings` itself uses: "A finding without the `✅ Resolved` line is open."
  Reading files only makes the answer the same in any session (SC-003).
- **Alternatives considered**: requiring a `### Session` heading (dropped by clarification Q2); reading the conversation (fails after compaction).

## R4. Arguments

- **Decision**: the whole argument string, trimmed, is passed as `args` to the `speckit-plan` call; the other three calls get no `args`.
- **Rationale**: FR-009; `/speckit-plan` treats its user input as optional guidance.

## R5. Hooks and questions inside a step

- **Decision**: while following a step's instructions, the skill
  - prints optional hooks in the step's own "Optional Hook" format and does not run them;
  - runs mandatory hooks (`EXECUTE_COMMAND`) exactly as the step says, and treats a failed one as the step's failure;
  - skips step 8 of `/speckit-analyze` ("Would you like me to suggest concrete remediation edits…");
  - lets `/speckit-analyze-findings` end at its normal prompt, which ends the run.
- **Rationale**: FR-010, FR-011, clarification Q1.
  Today only the optional `agent-context` hook is registered (`after_specify`, `after_plan`); `/speckit-plan` already updates the `CLAUDE.md` Spec Kit block itself.

## R6. Telling a finished step from a failed one

- **Decision**: a step has failed when its instructions say to stop or abort with an error (for example `ERROR on gate failures`, a missing prerequisite reported by `check-prerequisites.ps1`, a mandatory hook that fails), or when its expected output is missing afterwards: `plan.md` after step 1, `tasks.md` after step 2, a printed `## Specification Analysis Report` after step 3, `analyze-findings.md` after step 4.
- **Rationale**: FR-012; checking the expected output catches a step that stopped without saying so.

## R7. Progress lines

- **Decision**: `Step <n> of 4: /<skill>` before each call; after it, one line: `✅ /<skill> finished: <the files it wrote, or the report's finding count>` or `❌ /<skill> failed: <error>`.
  A failure ends with `Finished: <steps>` and `Not run: <steps>`.
- **Rationale**: FR-008, FR-012, SC-004.

## R8. Listing the command

- **Decision**: two edits outside the new skill (FR-013, FR-014):
  - `.claude/skills/speckit-requirements/SKILL.md`, the journey message in *Starting a new feature (NEW)* step 4: after `⚪ **/speckit-analyze-findings** (optional)  `, add
    `⚪ (or **/speckit-plan-thru-analyze**, which runs /speckit-plan through /speckit-analyze-findings in one go)  `;
  - `CLAUDE.md`, the Spec Kit Workflow block: after the `/speckit-analyze-findings` line, add
    `/speckit-plan-thru-analyze → runs /speckit-plan, /speckit-tasks, /speckit-analyze and /speckit-analyze-findings in turn`.
- **Rationale**: the two places the workflow is listed; the message's other lines stay as they are.

## R9. Verification

- **Decision**: no automated test (skills are Markdown instructions); text checks over the new `SKILL.md` and three walk-throughs in `quickstart.md` (gate refusals, a full run on a throwaway feature, a forced failure).
- **Rationale**: matches how feature `20261029-154817-READABLE-FINDING-LAYOUT` was verified.
