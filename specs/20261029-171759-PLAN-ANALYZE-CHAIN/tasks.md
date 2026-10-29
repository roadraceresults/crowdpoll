---

description: "Task list for the Plan Through Analyze Chain feature"
---

# Tasks: Plan Through Analyze Chain

**Input**: Design documents from `specs/20261029-171759-PLAN-ANALYZE-CHAIN/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/command.md, quickstart.md

**Tests**: none automated (research R9); each story ends with its quickstart check.

**Organization**: most tasks edit the one new file `.claude/skills/speckit-plan-thru-analyze/SKILL.md` (written `SKILL.md` below), section by section, so they run in order; the two listing edits (US4) touch other files and are `[P]`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup

**Purpose**: the skill's folder and frame.

- [X] T001 Create `.claude/skills/speckit-plan-thru-analyze/SKILL.md` with frontmatter in the style of `.claude/skills/speckit-analyze-findings/SKILL.md`: `name: "speckit-plan-thru-analyze"`, a one-sentence `description` (checks the feature is clarified and unplanned, then runs /speckit-plan, /speckit-tasks, /speckit-analyze and /speckit-analyze-findings in turn), `argument-hint: "Optional guidance for /speckit-plan"`, `compatibility`, `allowed-tools: Read, Write, Edit, Glob, Grep, Bash, PowerShell, Skill`, `user-invocable: true`, `disable-model-invocation: false`, `metadata` author "David Brooks" (contracts/command.md K1)
- [X] T002 Add to `SKILL.md` the headings `# Skill Name / Purpose` (three sentences: what it runs, the gate, that the four skills are invoked unchanged), `## User Input` (the `$ARGUMENTS` block, passed to `/speckit-plan` only, R4), `## Outline` and `## Completion Report`, empty bodies for the sections T003–T009 fill

---

## Phase 2: Foundational

**Purpose**: finding the current feature, needed by every story.

- [X] T003 In `SKILL.md` `## Outline`, step 1: run `.specify/scripts/powershell/check-prerequisites.ps1 -Json -PathsOnly` once from the repo root and take `FEATURE_DIR`, `FEATURE_SPEC`, `IMPL_PLAN`; stop with `ERROR: <FEATURE_SPEC> not found. Run /speckit-specify first.` when `FEATURE_SPEC` does not exist (found in T015); on failure show the script's `ERROR: Feature directory not found…` line and stop, running nothing (research R2, spec Edge Cases)

**Checkpoint**: the skill can locate the feature.

---

## Phase 3: User Story 1 - One command from a clarified spec to the analysis findings (Priority: P1) 🎯 MVP

**Goal**: run the four steps in turn with progress lines, no stops for questions, argument to `/speckit-plan` only.

**Independent Test**: quickstart.md §3.

- [X] T004 [US1] In `SKILL.md` `## Outline`, step 3 "Run the steps": invoke with the `Skill` tool, one call at a time and only after the previous step's instructions are fully followed, `speckit-plan` (with `args` = the trimmed argument, omitted when empty), `speckit-tasks`, `speckit-analyze`, `speckit-analyze-findings`, each with no other change to its behaviour (research R1, R4; FR-007, FR-009)
- [X] T005 [US1] In `SKILL.md` step 3, the progress lines: `Step <n> of 4: /<skill>` before each call and `✅ /<skill> finished: <summary>` after it, with the four summaries of contracts/command.md K3 (research R7; FR-008)
- [X] T006 [US1] In `SKILL.md` step 3, "Within a step": optional hooks printed in the step's "Optional Hook" format and not run; mandatory hooks (`EXECUTE_COMMAND`) run as the step says; step 8 of `/speckit-analyze` (the remediation offer) not asked; the run ends at the prompt `/speckit-analyze-findings` prints (research R5; K4, K6; FR-010, FR-011)
- [X] T007 [US1] In `SKILL.md` `## Completion Report`: a normal run ends with the findings prompt of `/speckit-analyze-findings` and nothing after it; a stopped run ends with the K2 or K5 block

**Checkpoint**: a full run works on a ready feature (quickstart §3).

---

## Phase 4: User Story 2 - Stopped, with a clear next step, when the feature is not ready (Priority: P1)

**Goal**: the gate.

**Independent Test**: quickstart.md §2.

- [X] T008 [US2] In `SKILL.md` `## Outline`, step 2 "Gate", before step 3: the three conditions in order — no `IMPL_PLAN`; no `[NEEDS CLARIFICATION` in `FEATURE_SPEC` outside fenced code and inline code spans (report line numbers); when `FEATURE_DIR/clarify-findings.md` exists, every `### **<ID>**` finding section has a `✅ Resolved` line (report open ids) — all checked before stopping; a clarification session is not required (research R3; FR-003–FR-005; clarification Q2)
- [X] T009 [US2] In `SKILL.md` step 2, the refusal: print the K2 block of contracts/command.md (one `❌` line per failed condition, in table order, and `🟩 👉 Next:` with the first one's command), run no step and write no file (FR-006)

**Checkpoint**: each refusal of quickstart §2 shows its K2 line and leaves `git status` unchanged.

---

## Phase 5: User Story 3 - Know where a run stopped when a step fails (Priority: P2)

**Goal**: stop at the first failed step and say what finished.

**Independent Test**: quickstart.md §4.

- [X] T010 [US3] In `SKILL.md` step 3, "When a step fails": a step has failed when its instructions stop with an error (including a mandatory hook that fails) or its expected output is missing afterwards (`plan.md`; `tasks.md`; a printed `## Specification Analysis Report`; `analyze-findings.md`); then print the K5 block (`❌ /<skill> failed: <error>`, `Finished: …`, `Not run: …`) and invoke nothing further (research R6; FR-012)

**Checkpoint**: quickstart §4 stops at step 2 with the K5 lines.

---

## Phase 6: User Story 4 - Find the shortcut where the workflow is described (Priority: P3)

**Goal**: list the command in the two workflow listings.

**Independent Test**: quickstart.md §1, third check.

- [X] T011 [P] [US4] In `.claude/skills/speckit-requirements/SKILL.md`, *Starting a new feature (NEW)* step 4, add after the line `⚪ **/speckit-analyze-findings** (optional)  ` the line `⚪ (or **/speckit-plan-thru-analyze**, which runs /speckit-plan through /speckit-analyze-findings in one go)  `; change nothing else (research R8; FR-013)
- [X] T012 [P] [US4] In `CLAUDE.md`, the Spec Kit Workflow code block, add after the `/speckit-analyze-findings → …` line the line `/speckit-plan-thru-analyze → runs /speckit-plan, /speckit-tasks, /speckit-analyze and /speckit-analyze-findings in turn` (research R8; FR-014)

**Checkpoint**: `grep -n "speckit-plan-thru-analyze"` finds one line in each file.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T013 Read `SKILL.md` end to end against contracts/command.md K1–K7 and research R1–R7: every rule present once, no explanatory comments (Constitution VI), roughly 120 lines (plan Scale/Scope)
- [X] T014 Run quickstart.md §1 (text checks), including `git diff --stat` showing no change to the six skills FR-015 protects
- [X] T015 Run quickstart.md §2–§4 on the throwaway feature `specs/99990101-000000-CHAIN-TEST/` (§4 forces the failure by renaming `.specify/scripts/powershell/setup-tasks.ps1`, restored afterwards), then §5 clean-up (restore `.specify/feature.json` and any `last_written` entries)

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003)** → US1 (T004–T007) and US2 (T008–T009) → US3 (T010) → Polish.
- US1, US2 and US3 all edit `SKILL.md`, so they run in order; US2's gate is placed before US1's steps in the file but can be written after them.
- US4 (T011, T012) touches other files and can run any time, in parallel with each other and with Phases 3–5.
- T015 needs every earlier task.

## Parallel Example: User Story 4

```text
Task: "T011 Add the journey-message line in .claude/skills/speckit-requirements/SKILL.md"
Task: "T012 Add the workflow line in CLAUDE.md"
```

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. T001–T003.
2. T004–T009: a working chain behind its gate (both P1).
3. **Stop and validate**: quickstart §2 and §3.

### Incremental Delivery

1. Add US3 (T010), validate with quickstart §4.
2. Add US4 (T011–T012).
3. Polish (T013–T015).
