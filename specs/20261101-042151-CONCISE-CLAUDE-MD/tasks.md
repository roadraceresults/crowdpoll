# Tasks: Concise CLAUDE.md

**Input**: Design documents from `specs/20261101-042151-CONCISE-CLAUDE-MD/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (command.md, file-layout.md, messages.md), quickstart.md

**Tests**: There are no application tests (FR-018, research R10). Each phase is checked with the shell commands in `quickstart.md`.

**Organization**: Tasks are grouped by user story. Every task in Phases 1–5 that edits
`.claude/skills/speckit-concise-claudemd/SKILL.md` touches the same file, so those tasks run in order.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story the task belongs to (US1–US4)

---

## Phase 1: Setup

- [X] T001 Create `.claude/skills/speckit-concise-claudemd/SKILL.md` with its frontmatter: `name: "speckit-concise-claudemd"`, a one-line `description`, `user-invocable: true`, `disable-model-invocation: true`, `allowed-tools: Read, Write, Edit, Bash`. Add a *User Input* section that refuses any argument with `ERROR: Unrecognized argument(s): <text>. Usage: /speckit-concise-claudemd` (contracts/command.md K1; research R2). The skill writes no size limits anywhere (FR-005).

---

## Phase 2: Foundational (blocks every story)

- [X] T002 In `.claude/skills/speckit-concise-claudemd/SKILL.md`, write the run's frame:
  - the K2 pre-checks: `CLAUDE.md` exists and holds both SPECKIT markers, else `ERROR:` and no write; a one-line note when `CLAUDE_COMPLETE.md` has uncommitted changes;
  - the "before" measurement with `wc -l -m` on both files, an absent file counting as 0;
  - the K4 report: the "after" measurement, tokens ≈ characters ÷ 4 rounded to 100, the *Moved* and *Condensed* lists, the "Removals not carried over" line when `CLAUDE_COMPLETE.md` has uncommitted changes, the settings-rule line, the review command and "Nothing was staged or committed";
  - the rules that apply to every run: targeted edits only, never stage or commit, never ask a question (K3 "Both runs"; FR-012, FR-013; research R6).

**Checkpoint**: invoking the skill on an unchanged repository prints a size report and writes nothing that was already current.

---

## Phase 3: User Story 1 — Smaller per-request instructions (P1) 🎯 MVP

**Goal**: The first run splits today's `CLAUDE.md` into a verbatim `CLAUDE_COMPLETE.md` and a concise `CLAUDE.md`.

**Independent Test**: quickstart §2 (verbatim copy, one backtick mention, no import, no chain, one plan path, no settings table).

- [X] T003 [US1] In `.claude/skills/speckit-concise-claudemd/SKILL.md`, write the first-run branch. When `CLAUDE_COMPLETE.md` is absent:
  - copy it byte for byte with `cp CLAUDE.md CLAUDE_COMPLETE.md`, markers included (research R3);
  - then write the concise `CLAUDE.md` exactly in the section order of contracts/file-layout.md F1: the header naming `CLAUDE_COMPLETE.md` once in backticks, with no `@` and no instruction to read it; the SPECKIT block with the shipped first two lines, the current plan's path, its artifacts in one sentence and its "Decisions that are easy to get wrong"; Project Overview; Layout; Commands; Configuration rules (the few rules of data-model.md, naming `.claude/rules/environment.md`); Cross-feature invariants; Architecture Notes; the one PowerShell line;
  - leave out today's *Current State* sentence "Every feature in the Spec Kit block above is implemented…" from Layout;
  - leave out any "The preceding feature is", the Spec Kit Workflow list, the Environment Variables table and the Key Design Documents history (FR-002–FR-004).
- [X] T004 [US1] In `.claude/skills/speckit-concise-claudemd/SKILL.md`, state how a cross-feature invariant is chosen. Keep only a rule a task in another area could break without knowing it, one line each, naming the file or test that enforces it, with no count. List the research R8 candidates as examples of the kind, not as a fixed list (FR-002, FR-011; UA2 B).

**Checkpoint**: User Story 1 is ready to be shown by the first run (T012).

---

## Phase 4: User Story 2 — Keeping it concise after each feature (P1)

**Goal**: Later runs bring `CLAUDE_COMPLETE.md` up to date with what is new in `CLAUDE.md`, then condense `CLAUDE.md` again.

**Independent Test**: quickstart §4 (new summary on top of the chain, edited line replaced rather than duplicated, one plan in the block, "nothing new" on an immediate rerun).

- [X] T005 [US2] In `.claude/skills/speckit-concise-claudemd/SKILL.md`, write the later-run branch's baseline and classification:
  - take the baseline commit from `git log -1 --format=%H -- CLAUDE_COMPLETE.md` and read `git diff <hash> -- CLAUDE.md`;
  - classify each hunk: inside the SPECKIT block → T006; added outside → append to the matching section of `CLAUDE_COMPLETE.md`, or the nearest fitting one when none matches; changed outside → replace its counterpart in `CLAUDE_COMPLETE.md`; removed outside → remove its counterpart from `CLAUDE_COMPLETE.md`, but only when `CLAUDE_COMPLETE.md` has no uncommitted changes (otherwise ignore removals and say so in the report);
  - add nothing that is already in `CLAUDE_COMPLETE.md` (research R4; FR-009; clarification Q1).
- [X] T006 [US2] In `.claude/skills/speckit-concise-claudemd/SKILL.md`, write the SPECKIT-block handling:
  - accept the block in any form, and find the plan path it names;
  - when that plan is not in `CLAUDE_COMPLETE.md`'s chain, add its full summary on top and turn the previous top entry's opening into "The preceding feature is"; when the block is only a pointer, build the summary and decisions from that `plan.md` and its `research.md`;
  - otherwise never rewrite existing chain entries;
  - check the new feature's decisions for a cross-feature invariant and add it to `CLAUDE.md` by T004's rule (FR-011);
  - rewrite `CLAUDE.md`'s block as the current plan only, in the F1 form; then condense any other new text in `CLAUDE.md` back to F1 (research R5; FR-010; clarification Q2).
- [X] T007 [US2] In `.claude/skills/speckit-concise-claudemd/SKILL.md`, add the merge recipe of contracts/command.md K5 (in `CLAUDE.md`, keep the side whose SPECKIT block names the branch's own plan) and the boundaries of K6: only `CLAUDE.md`, `CLAUDE_COMPLETE.md` and `.claude/rules/environment.md` are written, and no shipped Spec Kit file is touched (FR-014, FR-017).

**Checkpoint**: User Stories 1 and 2 are complete in the skill.

---

## Phase 5: User Story 3 — Settings shown only for configuration work (P2)

**Goal**: The settings table lives in a path-scoped rule file.

**Independent Test**: quickstart §3 (the rule file loads only when a configuration file is touched) and the §2 rule-file checks.

- [X] T008 [US3] In `.claude/skills/speckit-concise-claudemd/SKILL.md`, write the settings-rule handling:
  - on the first run, create `.claude/rules/environment.md` with the frontmatter of contracts/file-layout.md F3 (`paths:` `src/config.ts`, `.do/app.yaml`, `launch.json.example`, `devScripts.example/**`, `tests/config.test.ts`) and today's Environment Variables table with its closing paragraph, verbatim;
  - on a later run, carry any new or changed setting row from `CLAUDE.md` into both the rule file and `CLAUDE_COMPLETE.md`, then remove it from `CLAUDE.md`;
  - report it on the K4 settings line (FR-006, FR-011; research R7).

---

## Phase 6: User Story 4 — Reminders and the workflow list (P3)

**Goal**: The tweak skill reminds the developer, and the requirements journey lists the new skill.

**Independent Test**: quickstart §6.

- [X] T009 [P] [US4] In `.claude/skills/speckit-tweak/SKILL.md`, replace the "All tweaks resolved" text with the four lines of contracts/messages.md M1 in its three places: the defining bold message (line ≈324, placeholders in backticks, two trailing spaces per line), the summary at ≈465, and the example row at ≈507 (with `specs/018-TAB-BAR/tweaks.md` filled in). Leave the lines that only name the message (≈138, ≈428) unchanged (FR-015; research R9).
- [X] T010 [P] [US4] In `.claude/skills/speckit-requirements/SKILL.md`, replace the journey list in step 4 of *Starting a new feature (NEW)* (lines ≈158–170) with contracts/messages.md M2, keeping the `⚪ **/skill**` form and the two trailing spaces (FR-016; research R9).

---

## Phase 7: Polish, the first run and verification

- [X] T011 Read `.claude/skills/speckit-concise-claudemd/SKILL.md` end to end against contracts/command.md K1–K6 and file-layout.md F1–F3. Check that it names no line, bullet or token limit (FR-005), never tells the AI to read `CLAUDE_COMPLETE.md` (FR-003), and has no step that stages or commits. Confirm that `README.md` and `ARCHITECTURE.md` need no update (neither mentions `CLAUDE.md` or Spec Kit; constitution, Documentation Deliverables).
- [X] T012 Run quickstart §1, §5 and §6 (the skill can only be started by hand; the shipped Spec Kit is untouched; the messages are in place). Record the commit as `BEFORE`.
- [ ] T013 On `main` (research R11), or on this branch just before it merges into `main`: the developer types `/speckit-concise-claudemd` for the first run. Then run quickstart §2 and §3, review `git diff`, and commit `CLAUDE.md`, `CLAUDE_COMPLETE.md` and `.claude/rules/environment.md` (SC-001, SC-002, SC-004, UA5).
- [ ] T014 After the next feature is planned, run quickstart §4 to confirm a later run (SC-003, SC-005).

---

## Dependencies & Execution Order

```text
T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T011 → T012 → T013 → T014
T009, T010 (any time; parallel with each other and with T001–T008) → T012
```

- **Phase 1 → Phase 2** block every story.
- US1 (T003–T004), US2 (T005–T007) and US3 (T008) all edit the same SKILL.md, so they run in order. Each is a separate section of the skill.
- US4 (T009, T010) touches other files, has no dependency, and can run at any point.
- T013 needs every skill task finished, because the first run uses the whole skill.

## Parallel Example

```text
Task: "T009 [P] [US4] speckit-tweak message M1 in .claude/skills/speckit-tweak/SKILL.md"
Task: "T010 [P] [US4] journey list M2 in .claude/skills/speckit-requirements/SKILL.md"
(both alongside T001–T008 in .claude/skills/speckit-concise-claudemd/SKILL.md)
```

## Implementation Strategy

1. **MVP**: T001–T004, then T013's first run. This alone delivers the per-request saving (User Story 1).
2. Add T005–T007 so the saving lasts from feature to feature (User Story 2).
3. Add T008 to move the settings table out (User Story 3). If it is done before T013, the first run already writes the rule file. That is the recommended order, so the first split happens once and is complete.
4. Add T009 and T010 for the reminders (User Story 4).
5. T011–T014 verify.
