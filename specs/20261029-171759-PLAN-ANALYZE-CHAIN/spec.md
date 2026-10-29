# Feature Specification: Plan Through Analyze Chain

**Feature Branch**: `speckit-skills` (no dedicated branch created for this feature)

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "requirements/20261029-171759-plan-analyze-chain/requirements.md"

**Source requirements**: `requirements/20261029-171759-plan-analyze-chain/requirements.md` (the requirements, with every finding of the review folded in under "Decisions").
**Requirements report**: `requirements/20261029-171759-plan-analyze-chain/requirements-report.md` (4 diagrams and 9 findings, all resolved).

## Overview

After a feature's specification has been clarified, the developer today types four commands in turn: `/speckit-plan`, `/speckit-tasks`, `/speckit-analyze` and `/speckit-analyze-findings`, waiting for each to finish before typing the next.
This feature adds one command, `/speckit-plan-thru-analyze`, that runs the four for the current feature, one after another, once it has checked that nothing in clarification is left open and the feature has not been planned yet.
The four skills it runs, and `/speckit-clarify`, are not changed; the new command is listed where the workflow is described.

## Clarifications

### Session 2026-10-29

- Q: What does the chain do with a **mandatory** hook (`optional: false`) that a step registers? → A: Runs it as the step would; only optional hooks are listed and skipped; a failed mandatory hook stops the chain like any failed step.
- Q: A clarify run that asks no questions writes no session; how does the gate treat such a spec? → A: A spec with no `[NEEDS CLARIFICATION` marker counts as clarified even without a clarification session; the session is not required.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Go from a clarified spec to the analysis findings with one command (Priority: P1)

A developer has run `/speckit-clarify` (and, optionally, `/speckit-clarify-findings`) on the current feature, and every clarification is resolved.
They type `/speckit-plan-thru-analyze`.
The command plans the feature, generates its tasks, analyzes the three artifacts and captures the analysis into its findings file, each step starting only when the one before it has finished, and leaves the developer at the first open analysis finding.

**Why this priority**: it is the purpose of the feature: one command instead of four, with no waiting at the terminal in between.

**Independent Test**: on a feature whose spec has no open clarification and no plan yet, run the command once and check that the plan, tasks and findings files exist afterwards and that the last thing shown is the findings prompt.

**Acceptance Scenarios**:

1. **Given** a clarified feature with nothing open and no plan, **When** the developer runs `/speckit-plan-thru-analyze`, **Then** the plan and its design files, the task list and the analysis findings file are produced, in that order, and the developer is shown the first open analysis finding.
2. **Given** the same feature, **When** the command runs, **Then** before each step it shows `Step <n> of 4: /<skill>` and after each a one-line result, so the developer can tell where a long run is.
3. **Given** the planning step offers an optional follow-up and the analysis step offers remediation edits, **When** the command runs, **Then** neither question stops it: the optional follow-up is listed but not run, the remediation question is not asked, and the run continues to the next step.
4. **Given** the developer types text after the command, **When** it runs, **Then** that text reaches the planning step as its guidance, and no other step receives it.

---

### User Story 2 - Be stopped, with a clear next step, when the feature is not ready (Priority: P1)

A developer runs `/speckit-plan-thru-analyze` on a feature that still holds an open clarification, or has already been planned.
The command runs nothing and changes nothing; it says which condition was not met, what is still open, and which command to run next.

**Why this priority**: the requirements make the check the first thing the command does; planning over open questions would produce a plan built on guesses.

**Independent Test**: run the command once for each failing condition and check that no file changed and that the message names the condition, the open items and the next command.

**Acceptance Scenarios**:

1. **Given** a spec that still holds a `[NEEDS CLARIFICATION` marker, **When** the command runs, **Then** it stops, lists the markers, and tells the developer to run `/speckit-clarify`.
2. **Given** the feature has a clarification findings file with open findings, **When** the command runs, **Then** it stops, lists the open finding ids, and tells the developer to resolve them with `/speckit-clarify-findings`.
3. **Given** the feature already has a plan, **When** the command runs, **Then** it stops and says that the feature has already been planned.

---

### User Story 3 - Know exactly where a run stopped when a step fails (Priority: P2)

During a run, one of the steps ends with an error (for example a failed constitution gate in planning, or a missing prerequisite).
The command runs none of the later steps and reports the step that failed, its error, and the steps already finished, so the developer can fix the cause and run the remaining skills by hand.

**Why this priority**: failures are rarer than the normal run, but carrying on after one would only add errors on top of it.

**Independent Test**: make one step fail (for example by removing a file it needs) and check that no later step runs and the report names the failed step, its error and the finished steps.

**Acceptance Scenarios**:

1. **Given** planning ends with an error, **When** the command runs, **Then** tasks, analysis and findings capture do not run, and the report names planning, its error, and no finished steps.
2. **Given** analysis ends with an error, **When** the command runs, **Then** findings capture does not run, and the report names analysis, its error, and planning and tasks as finished.

---

### User Story 4 - Find the shortcut where the workflow is described (Priority: P3)

A developer reading the list of skills when starting a new feature, or the workflow section of the project's agent guide, sees `/speckit-plan-thru-analyze` named as an alternative to running the four skills one by one.

**Why this priority**: it helps discovery, but the command works without it.

**Independent Test**: start a new feature with `/speckit-requirements NEW` and read the journey message; open the project's agent guide and read its workflow section; both name the command.

**Acceptance Scenarios**:

1. **Given** a developer starts a new feature, **When** the journey message is shown, **Then** it names `/speckit-plan-thru-analyze` as an alternative to the four skills it runs.
2. **Given** a developer reads the workflow section of the agent guide, **When** they reach the four skills, **Then** the command is named there as the same alternative.

---

### Edge Cases

- **Clarification asked no questions**: a clarify run that found nothing to ask writes no clarification session; the check passes, because it does not require a session, only that nothing is left open.
- **Clarification never run**: a spec with no `[NEEDS CLARIFICATION` marker passes the check even if `/speckit-clarify` was never run; running it first is the developer's choice, as it is when the four skills are typed by hand.
- **`/speckit-clarify-findings` was the last command**: allowed; the check reads the feature's files, not which command ran last.
- **A new or compacted session**: the check gives the same answer as in the session where clarification ran, because it reads only files.
- **Re-planning a planned feature**: refused while the plan exists (User Story 2, scenario 3); the developer deletes the plan first, or runs the skills by hand.
- **No current feature recorded**: the command stops with the same error the four skills give when no feature is recorded, and runs nothing.
- **The analysis finds nothing**: the findings capture still runs and records the empty result, so the run ends at "all findings resolved".
- **The analysis findings file already exists**: the findings capture backs it up as it does when run alone; the command adds no rule of its own.

## Requirements *(mandatory)*

### Functional Requirements

**The command**

- **FR-001**: The project MUST offer a developer command named `/speckit-plan-thru-analyze`, invocable by the developer.
- **FR-002**: The command MUST act on the current feature, found the same way the four skills it runs find it.

**The check (gate)**

- **FR-003**: Before running any step, the command MUST check, from the feature's files only, that the feature has not been planned yet (it has no plan); a clarification session in the spec is not required, so a clarify run that asked nothing does not block the command.
- **FR-004**: The check MUST NOT depend on which command ran last in the conversation; running `/speckit-clarify-findings` after `/speckit-clarify` MUST NOT make it fail.
- **FR-005**: The check MUST also require that every clarification is resolved: the spec holds no `[NEEDS CLARIFICATION` marker, and, when the feature has a clarification findings file, that file holds no open finding.
- **FR-006**: When any part of the check fails, the command MUST run no step, change no file, and show which condition failed, what is open (the markers or the finding ids), and the command to run next (`/speckit-clarify` or `/speckit-clarify-findings`), or, when the feature is already planned, that the remaining skills can be run by hand or `plan.md` deleted to re-plan.

**The steps**

- **FR-007**: When the check passes, the command MUST run, in this order, `/speckit-plan`, `/speckit-tasks`, `/speckit-analyze` and `/speckit-analyze-findings`, each exactly as it behaves when the developer types it, and MUST start each only when the one before it has finished.
- **FR-008**: The command MUST show `Step <n> of 4: /<skill>` before each step and a one-line result after it.
- **FR-009**: Any text typed after the command MUST be passed to `/speckit-plan` as its guidance; nothing MUST be passed to the other three steps.
- **FR-010**: The run MUST NOT stop for the questions the steps ask along the way: optional follow-ups offered by a step MUST be listed but not run, mandatory follow-ups (hooks marked not optional) MUST be run as the step runs them, and the remediation question of `/speckit-analyze` MUST NOT be asked, since `/speckit-analyze-findings` replaces it.
- **FR-011**: The run MUST end at the first prompt of `/speckit-analyze-findings`, after which the developer works through the analysis findings as usual.

**Failures**

- **FR-012**: When a step ends with an error, including a mandatory follow-up of that step that fails, the command MUST run none of the later steps and MUST report the step, its error, and the steps already finished.

**Where it is listed**

- **FR-013**: The journey message shown when a new feature is started MUST name `/speckit-plan-thru-analyze` as an alternative to running the four skills one by one.
- **FR-014**: The workflow section of the project's agent guide MUST name the command as the same alternative.

**What does not change**

- **FR-015**: The four skills the command runs, and `/speckit-clarify` and `/speckit-clarify-findings`, MUST NOT be changed.

### Key Entities

- **Feature**: the current feature, with its folder of specification artifacts; the command reads its stage from these files.
- **Clarification findings file**: optional; the record `/speckit-clarify-findings` keeps, whose findings are open until marked resolved.
- **Step**: one of the four skills the command runs; each has a position (1 to 4), a result line, and finishes either normally or with an error.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a clarified feature, the developer types one command instead of four and is not asked anything until the analysis findings prompt appears.
- **SC-002**: In 100% of runs on a feature that fails the check, no file changes and the message names the failed condition and the next command.
- **SC-003**: The check gives the same answer in a new session as in the session where clarification ran.
- **SC-004**: When a step fails, no later step runs, and the developer can tell from the report alone which steps finished and which did not.
- **SC-005**: The plan, tasks and analysis findings produced by the command are the same kind of output, in the same files, as when the four skills are run by hand.
- **SC-006**: A developer starting a new feature can find the command in the journey message without searching elsewhere.

## Assumptions

- The four skills can be started one after another within a single developer request, as they were for feature `20261029-154817-READABLE-FINDING-LAYOUT`.
- Skipping the optional agent-context follow-up after planning is acceptable, because planning already updates the agent guide.
- Running analysis and findings capture back to back keeps the analysis report available to the capture step, which reads it from the conversation.
- No CrowdPoll application code, configuration, data or migration changes.
