---

description: "Task list for the Readable Finding Layout feature"
---

# Tasks: Readable Finding Layout

**Input**: Design documents from `specs/20261029-154817-READABLE-FINDING-LAYOUT/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/finding-layout.md, contracts/commands.md, quickstart.md

**Tests**: none automated (research R10); each story ends with its quickstart check.

**Organization**: every task edits the one file `.claude/skills/speckit-requirements/SKILL.md` (written `SKILL.md` below), so tasks run in order and none is `[P]`; each names the section it changes. Line numbers are those before the change and drift as earlier tasks edit the file: find each section by its heading.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)

---

## Phase 1: Setup

**Purpose**: a baseline to compare against.

- [X] T001 Record the baseline: run the five searches of `quickstart.md` §1 against `.claude/skills/speckit-requirements/SKILL.md` and keep their output in the scratchpad, so T025 can show what moved

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the one canonical layout every story refers to (R2, R11).

- [X] T002 In `.claude/skills/speckit-requirements/SKILL.md`, *For AI Generation* items 8–11 (lines 390–410): replace each quoted `➡️ [ ] **Accepted**` line with "lay out each … as described in *Finding layout*", so no item repeats the Accept line
- [X] T003 In `SKILL.md`, *Finding layout*: add a last subsection, *Old form*, with `contracts/finding-layout.md` L4 (the old Accept line and hint, the old resolved form) and the detection rule L3.5 — old when any Accept line has the arrow before the box, new otherwise, including a report with no findings (FR-017, FR-018). Write it from the old text still in *Finding layout* and *Resolving a finding*, before T005, T008 and T012 replace it, so old reports keep working at every stopping point
- [X] T004 In `SKILL.md`, *Writing text into the files* (572–587): add the three rules of R11 — every line of a finding's explanation starts with `> ` and still ends with two spaces; a blank line the skill writes is empty, never spaces; one blank line after a finding's title block, explanation, `❌` line, each option's label and each Accept line, and two blank lines between options (FR-005)

**Checkpoint**: the layout has one home, *Finding layout*, which the story phases now rewrite; its *Old form* subsection (T003) already keeps old reports working. Run T002, T003, T004 in that order.

---

## Phase 3: User Story 1 — See at a glance which findings are still open (P1) 🎯 MVP

**Goal**: new reports show `❌ NOT Resolved` on open findings and a clean record on resolved ones.

**Independent Test**: `quickstart.md` §2 steps 1–2 and 8.

- [X] T005 [US1] In `SKILL.md`, *Finding layout* → *Initial form* (412–458): replace the example and its bullet rules with `contracts/finding-layout.md` L1 — title, block-quoted explanation, `❌ NOT Resolved`, options with `[ ] ➡️ **Accept** (To Accept, you may: mark <b>[X]</b> on this line, save the file, then Type/Say "<b>next</b>" in the CC CLI terminal, OR Type/Say "<b>Accept <ID>, <LETTER></b>" in CC CLI)` after a blank line under each label, details after another blank line, two blank lines between options, and a Developer Resolution with the single instruction line `- you may enter your own resolution here` (FR-001–FR-004, L1.1–L1.6)
- [X] T006 [US1] In `SKILL.md`, *Finding layout* → *Initial form* rules: state that a single recommendation is labelled `**Recommendation**` without a letter, its Accept line names `Accept <ID>`, and its Developer Resolution is `B` (L1.3)
- [X] T007 [US1] In `SKILL.md`, *Finding layout* → *Accepted form* (459–468): the developer's tick is on the box at the start of the Accept line (`[X] ➡️ **Accept** (…)`); nothing else changes until the skill resolves it
- [X] T008 [US1] In `SKILL.md`, *Finding layout* → *Resolved form* (469–518): replace the example and rules with `contracts/finding-layout.md` L2 — remove the `❌` line and its blank line; under the title the two-line `<span style="font-size:large" ><b>` / `✅ Resolved</b></span>`, the `✅ Requirements File Updated` or `✅ Requirements File Unchanged (no edit needed)` line and the `**Notes**:` line; the chosen line `[X] ➡️ **Accepted**`, every other `[ ] ➡️ **Not Accepted**`; instructions and the Developer Resolution's instruction line removed, the developer's text kept (FR-006–FR-008, L2.1–L2.6)
- [X] T009 [US1] In `SKILL.md`, *Finding layout* → *Resolved form* Notes rule: list the four routes, `accepted in file`, `accepted by "Accept"`, `accepted by "Accept <ID>, <LETTER>"`, `accepted by "Accept all"` (L2.4)
- [X] T010 [US1] In `SKILL.md`, *Finding layout* → the open/resolved rule and the hand-marked rule: `✅ Resolved` alone decides; `❌ NOT Resolved` is for reading only; a finding with `✅ Resolved` but missing the requirements or Notes line is hand-marked and open (FR-010, L3.2, L3.3)
- [X] T011 [US1] In `SKILL.md`, *Research Results* (527–570): replace the RS1 example with the new form (block-quoted explanation holding the Sources links, `❌ NOT Resolved`, new Accept lines, `Accept RS1` for its single Recommendation), and say it uses *Finding layout* with the prefix `RS`; Breaking Changes and Technical Debt items carry no `❌` line (FR-019, L1.5)
- [X] T012 [US1] In `SKILL.md`, *Resolution of Findings* → *Resolving a finding* (677–686): rewrite in the new form — mark the chosen box `[X]` and its text `Accepted`, the others `Not Accepted`; remove the `❌` line; insert the `✅` lines and Notes (completing a hand-marked finding's, never duplicating); remove all instructions — with a pointer to *Old form* for old reports (FR-006–FR-008)
- [ ] T013 [US1] Check US1 with `quickstart.md` §2 steps 1, 2 and 8 (new report, preview, Complete Report, SC-001, SC-004, SC-006)

**Checkpoint**: a new report is readable and resolves cleanly with the existing commands.

---

## Phase 4: User Story 2 — Accept any recommendation by naming it (P1)

**Goal**: `Accept <ID>[,] [<LETTER>]` resolves any open finding.

**Independent Test**: `quickstart.md` §2 steps 3, 5 and 7.

- [X] T014 [US2] In `SKILL.md`, *Resolution of Findings* intro (669–672) and *Skill Name / Purpose* (44–55): name four commands — `Next`, `Accept` / `Accept X`, `Accept <ID>, <LETTER>`, `Accept all` — and quote the Accept line in the new form; fix "a a first step" on line 48 (FR-015, FR-016)
- [X] T015 [US2] In `SKILL.md`, *Resolution of Findings*: add command 4, `Accept <ID>[,] [<LETTER>]`, per `contracts/commands.md` C1 — the grammar (id `(IN|AM|UA|NC|RS)\d+`, comma optional, case-insensitive; a lone letter is `Accept X`; `Accept all` checked first), the outcome table (letter wins and clears another tick; no letter → the single tick, else the single or recommended option; `A` on a single Recommendation; empty Developer Resolution, unknown id or letter, resolved finding → say why, change nothing), then "Next" (FR-012–FR-014)
- [X] T016 [US2] In `SKILL.md`, *Moving on automatically* (688–694): "A finding resolved" also covers `Accept <ID>, <LETTER>`
- [ ] T017 [US2] Check US2 with `quickstart.md` §2 steps 3, 5 and 7 (SC-002)

**Checkpoint**: any open finding can be accepted by name.

---

## Phase 5: User Story 3 — Accept a recommendation in the file (P2)

**Goal**: a tolerant tick on the leading box is recognized; the `❌` line is kept in step.

**Independent Test**: `quickstart.md` §2 steps 4 and 6.

- [X] T018 [US3] In `SKILL.md`, *Finding layout* (a *Reading a report* rule after the forms) and *Resolution of Findings* → "Next": a box is ticked when it matches `\[\s*[xX]\s*\]`, unticked when `\[\s*\]`; the skill writes `[X]` and `[ ]` only; a blank line holding only spaces in a developer-edited report is read as blank (FR-009, L3.1, spec Edge Cases)
- [X] T019 [US3] In `SKILL.md`, *Resolution of Findings* → "Next" sweep (696–737): replace "marked `[X] Accepted`" by "ticked" throughout; add the marker upkeep — on each new-form finding, add `❌ NOT Resolved` after the explanation when open and missing, remove it when resolved (FR-011, L3.4)
- [ ] T020 [US3] Check US3 with `quickstart.md` §2 steps 4 and 6 (SC-003)

**Checkpoint**: the file route works with any tick spelling.

---

## Phase 6: User Story 4 — Terminal prompts teach the new command (P2)

**Goal**: prompts suggest `Accept <ID>, <LETTER>` for the current finding.

**Independent Test**: any prompt shown during `quickstart.md` §2 step 3.

- [X] T021 [US4] In `SKILL.md`, *Prompting The Developer* (772–826): in the three prompts, replace the `"Accept"` and `"Accept X"` lines with `contracts/commands.md` C5 P1–P3 (`"Accept <ID>"`, `"Accept <ID>, X"`, and the recommended letter); replace "marking one or more Recommendations "[X] Accepted"" by "ticking one Accept line [X]"; the opening line lists the four commands (FR-016)
- [ ] T022 [US4] Check US4 with the prompts seen in `quickstart.md` §2 step 3

**Checkpoint**: the terminal and the file teach the same command.

---

## Phase 7: User Story 5 — Reports written before the change keep working (P3)

**Goal**: findings appended to an old report are written in its own form (reading and resolving old reports already works from Phase 2).

**Independent Test**: `quickstart.md` §3.

- [X] T023 [US5] In `SKILL.md`, *Generation Mode* APPEND (280–283) and *Additional Requirements and Research Requests* step 2 (366–370): appended findings are written in the report's own form (*Old form* for an old report); rename *Architecture Complete Report* to *Requirements Report Complete Report* on line 283, on line 720 (touched by T019) and on line 866, its only other occurrence, so the skill uses one name (FR-018)
- [ ] T024 [US5] Check US5 with `quickstart.md` §3 (SC-005)

**Checkpoint**: the refresh-mechanisms report's open findings can still be resolved.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T025 Run `quickstart.md` §1 against `SKILL.md` and compare with T001's baseline: the old Accept line appears only in *Old form* and the old-report rules, the new one wherever the layout is described, `Accept <ID>` in *Resolution of Findings* and *Prompting The Developer*, no "a a first" (FR-021)
- [X] T026 Read `SKILL.md` once end to end for contradictions between sections (open/resolved rule, tick rule, Notes routes, command list) and fix any in place (FR-021)
- [X] T027 Confirm no other skill or product file changed: `git status` lists no file under `.claude/skills/` other than `.claude/skills/speckit-requirements/SKILL.md`, and none under `src/` or `tests/` (FR-020); `README.md` and `ARCHITECTURE.md` describe CrowdPoll and need no regeneration (plan, Constitution Check)

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002, T003, T004)** → stories.
- **US1 (T005–T013)** comes first: it writes *Finding layout*, which US2–US5 extend.
- **US2 (T014–T017)** needs US1's Accept line; **US3 (T018–T020)** needs US1's forms; **US4 (T021–T022)** needs US2's command; **US5 (T023–T024)** needs the *Old form* subsection written in Phase 2 (T003).
- **Polish (T025–T027)** last.
- Within a story, tasks run in the order listed.

### Parallel Opportunities

None: every implementation task edits the same file, so they run one after another. The quickstart checks (T013, T017, T020, T022, T024) can share one throwaway feature: run §2 once after US4, and §3 after US5.

## Implementation Strategy

### MVP

Phases 1–3 (T001–T013): new reports become readable with today's commands. Stop and validate with `quickstart.md` §2 steps 1, 2 and 8.

### Incremental delivery

1. US1 → readable reports (MVP).
2. US2 → `Accept <ID>, <LETTER>`.
3. US3 → tolerant ticks and the marker upkeep.
4. US4 → prompts.
5. US5 → appended findings follow the report's own form (reading and resolving old reports already works from Phase 2).
6. Polish → the consistency check over the whole file.
