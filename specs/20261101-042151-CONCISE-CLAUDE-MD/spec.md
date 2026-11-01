# Feature Specification: Concise CLAUDE.md

**Feature Branch**: `pop-poll-2` (no dedicated branch created for this feature)

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "requirements/20261101-042151-concise-claude-md/requirements.md"

**Source requirements**: `requirements/20261101-042151-concise-claude-md/requirements.md` (the initial requirements, the additional requirements of 2026-11-01, and every finding's decision under "Resolutions").
**Requirements report**: `requirements/20261101-042151-concise-claude-md/requirements-report.md` (5 diagrams and 15 findings, all resolved).

## Clarifications

### Session 2026-11-01

- Q: When text already in `CLAUDE.md` was edited (not added), how does a run update `CLAUDE_COMPLETE.md`? → A: Replace: edited text replaces its counterpart in `CLAUDE_COMPLETE.md`, new text is added; feature summaries in the chain are never rewritten, only added on top.
- Q: Where does a run get the current feature's "Decisions that are easy to get wrong" when the SPECKIT block holds only a plan pointer? → A: From the current feature's `plan.md` (and its research), whenever the block does not already hold them for that plan.
- Q: Should the Success Criteria carry size figures (75% smaller after the first split; within 10% after each run)? → A: No: every size figure is dropped; success is judged from the size report by the developer.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Smaller per-request instructions (Priority: P1)

The developer works with the AI assistant on CrowdPoll every day. Today the project instruction file sent with
almost every request is about 21,000 tokens, most of it the history of 31 finished features. The developer wants
that file cut down to what a typical request needs, while the full text is kept in a separate complete file that
developers can read and that is never sent to the AI automatically.

**Why this priority**: This is the cost and performance problem the feature exists to solve; everything else keeps
the result from decaying.

**Independent Test**: After the first split, compare the instruction file with its previous version: it holds the
current plan and its key decisions, the overview, layout, commands and the rules that bind every change; the
complete file holds the previous text verbatim; nothing of the previous text is missing from the complete file.

**Acceptance Scenarios**:

1. **Given** no complete file exists, **When** the developer runs `/speckit-concise-claudemd` for the first time,
   **Then** the complete file `CLAUDE_COMPLETE.md` is created holding today's `CLAUDE.md` verbatim, and `CLAUDE.md`
   is rewritten as the concise version.
2. **Given** the split has been made, **When** the AI assistant starts a session, **Then** only the concise file is
   loaded: the complete file is not imported, not loaded automatically, and the concise file does not tell the AI
   to read it.
3. **Given** the concise file, **When** a developer reads it, **Then** it names `CLAUDE_COMPLETE.md` once, as a
   plain file name, so a developer knows where the full text is.

---

### User Story 2 - Keeping it concise after each feature (Priority: P1)

Planning a new feature writes into the instruction file again (the shipped Spec Kit skills, which this feature must
not change, keep doing so). After implementing a feature and before committing or merging it, the developer runs
one command that moves the new material into the complete file and condenses the instruction file back.

**Why this priority**: Without it the file regrows by 2–3 KB per feature, and the first story's gain is lost within
a few features.

**Independent Test**: Plan a feature so that the instruction file gains a feature summary, run the command, and
check that the summary is now at the top of the feature chain in the complete file and that the instruction file
holds only the new current plan's path and its key decisions.

**Acceptance Scenarios**:

1. **Given** the instruction file holds material not yet in the complete file (a new feature summary, a
   hand-added note, a changed command), **When** the developer runs the command, **Then** that material is added
   to the complete file in its matching section, a feature summary on top of the chain, newest first, and the
   instruction file is condensed again.
2. **Given** a passage already in the complete file was edited in the instruction file (a renamed command, a
   reworded note), **When** the command runs, **Then** the edited text replaces the old passage in the complete
   file rather than being added beside it.
3. **Given** any form of content between the Spec Kit markers (a three-line plan pointer, a summary, or a summary
   with the previous feature pushed down), **When** the command runs, **Then** it handles it without assuming one
   format; when the block holds only a plan pointer, the decisions it leaves there are taken from that plan.
4. **Given** a run has finished, **When** the developer looks at the output, **Then** it shows the lines and
   estimated tokens of the instruction file and of the complete file, each before and after the run, and what
   moved and what was condensed, section by section.
5. **Given** a run has finished, **When** the developer checks the repository, **Then** both files are written and
   nothing is staged or committed; the developer reviews the change before committing.

---

### User Story 3 - Settings shown only for configuration work (Priority: P2)

The table of every environment setting is 13% of today's file and is needed only when configuration is being
changed. The developer wants it shown to the AI only when configuration files are being worked on.

**Why this priority**: The second-largest saving, and independent of the feature chain.

**Independent Test**: Start a session that touches no configuration file and confirm the settings table is not in
context; open the configuration module and confirm it is.

**Acceptance Scenarios**:

1. **Given** the split, **When** a task touches none of the configuration files, **Then** the settings table is not
   loaded.
2. **Given** the split, **When** a task reads or edits the configuration module, the deployment specification, the
   launch template, the development script templates or the configuration tests, **Then** the settings table is
   loaded.
3. **Given** a new setting appears in the instruction file, **When** the command runs, **Then** the setting is
   carried into the settings rule file and into the complete file.

---

### User Story 4 - Reminders and the workflow list (Priority: P3)

When the developer finishes a feature's tweaks, they are reminded to run the command; when a new feature's
requirements journey starts, the command is listed among its steps.

**Why this priority**: The command is manual by requirement; a reminder at the right moment keeps it from being
forgotten.

**Independent Test**: Resolve the last tweak of a tweak file and read the message; start a new requirements
journey and read the list.

**Acceptance Scenarios**:

1. **Given** every tweak is resolved, **When** `/speckit-tweak` reports "All tweaks resolved", **Then** the message
   reads exactly:
   ```
   All tweaks resolved.
   Add TWEAK### to <tweaks_file_directory>/<tweaks_file_name> if there are more tweaks.
   `CLAUDE.md` has grown as this feature has been implemented.
   Execute `/speckit-concise-claudemd` to trim it and transfer important details to `CLAUDE_COMPLETE.md`.
   ```
   with the tweak file's directory and name filled in, every time it is reported.
2. **Given** the developer types `/speckit-requirements NEW`, **When** the journey message is shown, **Then** it
   lists, in order: `/speckit-requirements`, `/speckit-specify`, `/speckit-clarify`, `/speckit-plan`,
   `/speckit-tasks`, `/speckit-analyze`, `/speckit-analyze-findings (recommended)`, the
   `/speckit-plan-thru-analyze` alternative line, `/speckit-implement`, `/speckit-tweak (optional)`,
   `/speckit-concise-claudemd (recommended)`.
3. **Given** the AI assistant, **When** it considers starting `/speckit-concise-claudemd` on its own, **Then** it
   cannot: only the developer can invoke it.

---

### Edge Cases

- **A branch merge conflicts in either file**: the developer keeps both chain entries in the complete file (newest
  first) and, in the instruction file, the side whose Spec Kit block names the branch's own plan, then runs the
  command again, which restores the concise form.
  The command's own instructions carry this recipe.
- **A branch planned before this feature merges `main`**: its old long Spec Kit block arrives in the instruction
  file; the next run moves it as it would a new summary.
- **The command is run when nothing is new**: the complete file is unchanged, the instruction file is unchanged or
  only condensed, and the size report still prints.
- **The developer forgets to run the command**: the instruction file stays longer until the next run, which moves
  everything new at once.
- **Material in the instruction file matches no section of the complete file**: it is added to the complete file
  in the nearest fitting section rather than dropped.
- **The developer deletes a passage from the instruction file as obsolete**: the next run removes it from the
  complete file too, unless the complete file has uncommitted changes (a previous run not yet committed), when
  removals are ignored and the report says so.
- **The instruction file was edited by hand**: hand-added material is preserved in the complete file like any
  other new material.

## Requirements *(mandatory)*

### Functional Requirements

**The two files**

- **FR-001**: The repository MUST hold a complete file, `CLAUDE_COMPLETE.md`, at its root beside `CLAUDE.md`,
  committed, holding everything the instruction file has ever held that is still current, including every
  feature's full summary, newest first.
- **FR-002**: `CLAUDE.md` MUST be a concise version holding: the current plan's path and its "Decisions that are
  easy to get wrong" between the Spec Kit markers; the project overview (stack, purpose, sign-in modes, deployment
  target, pointers to the user and architecture documents); the layout; the commands; a short configuration-rules
  section; a cross-feature invariants section (rules a change in one area could break elsewhere); the architecture
  notes; and one line saying Spec Kit uses the PowerShell scripts.
- **FR-003**: `CLAUDE.md` MUST name `CLAUDE_COMPLETE.md` once, as a plain file name in code formatting, for
  developers; it MUST NOT import it and MUST NOT instruct the AI to read it.
- **FR-004**: The Spec Kit workflow list, the earlier features' summaries and the full settings table MUST NOT
  appear in `CLAUDE.md`; they remain in `CLAUDE_COMPLETE.md`.
- **FR-005**: No size limit is enforced, tested or written as a line count; conciseness is kept by the command's
  judgement and made visible by its size report (FR-012).

**The settings rule**

- **FR-006**: The settings table MUST live in a path-scoped instruction file, `.claude/rules/environment.md`, loaded
  only when a task touches `src/config.ts`, `.do/app.yaml`, `launch.json.example`, `devScripts.example/**` or
  `tests/config.test.ts`; it MUST also stay in `CLAUDE_COMPLETE.md`.

**The command `/speckit-concise-claudemd`**

- **FR-007**: A project skill `/speckit-concise-claudemd` MUST exist that only the developer can invoke; the AI
  MUST NOT be able to start it on its own.
- **FR-008**: When `CLAUDE_COMPLETE.md` does not exist, a run MUST copy `CLAUDE.md` to it verbatim, then condense
  `CLAUDE.md` (the first split, made by the command itself at the end of this feature's implementation on `main`).
- **FR-009**: When `CLAUDE_COMPLETE.md` exists, a run MUST add to it everything in `CLAUDE.md` not yet in it, each
  in its matching section, a new feature summary on top of the chain; text in `CLAUDE.md` that is an edited version
  of a passage already in `CLAUDE_COMPLETE.md` MUST replace that passage, so the complete file holds no stale
  wording beside its replacement; text the developer removed from `CLAUDE.md` since the previous run MUST be removed from `CLAUDE_COMPLETE.md`
  too, except while `CLAUDE_COMPLETE.md` has uncommitted changes; feature summaries already in the chain keep their text, except that the opening
  phrase of the previous newest entry becomes "The preceding feature is". Then the run condenses
  `CLAUDE.md`.
- **FR-010**: A run MUST treat whatever lies between the `<!-- SPECKIT START -->` and `<!-- SPECKIT END -->` markers
  as input, whatever its form, and leave there the current plan's path and its "Decisions that are easy to get
  wrong", concise. When the block does not already hold that plan's decisions (for example, only a plan pointer),
  the run MUST build them from the current feature's `plan.md` and its research.
- **FR-011**: A run MUST add a cross-feature invariant to `CLAUDE.md` when a new feature's decisions include a rule
  a change in another area could break, and carry a new setting into the settings rule file (FR-006).
- **FR-012**: A run MUST print: the lines and estimated tokens of `CLAUDE.md` before and after it, the lines and
  estimated tokens of `CLAUDE_COMPLETE.md` before and after it, what moved and what was condensed, section by
  section. Tokens are an estimate at about 4 characters per token.
- **FR-013**: A run MUST write both files without asking, and MUST NOT stage or commit anything.
- **FR-014**: The command's instructions MUST carry the merge-conflict recipe (Edge Cases, first item).

**Project skills that change**

- **FR-015**: `/speckit-tweak`'s "All tweaks resolved" message MUST become the four lines of User Story 4,
  scenario 1, shown every time it is reported, with no state kept.
- **FR-016**: `/speckit-requirements`' new-feature journey message MUST become the list of User Story 4,
  scenario 2.

**Boundaries**

- **FR-017**: No Spec Kit skill or extension shipped from GitHub may change (`speckit-specify`, `-clarify`, `-plan`,
  `-tasks`, `-analyze`, `-implement`, `-checklist`, `-constitution`, `-taskstoissues`, `-agent-context-update` and
  `.specify/extensions/agent-context/`).
- **FR-018**: No CrowdPoll code, configuration, data, migration or application test changes.

### Key Entities

- **Instruction file (`CLAUDE.md`)**: the concise text loaded into every request; written by the shipped Spec Kit
  skills between its markers, and condensed by the command.
- **Complete file (`CLAUDE_COMPLETE.md`)**: the full, current record for developers; grows with each run; never
  loaded automatically.
- **Settings rule file (`.claude/rules/environment.md`)**: the settings table, loaded only for configuration work.
- **Feature chain**: the sequence of feature summaries, newest first, each with its "Decisions that are easy to get
  wrong"; in the complete file only, except the current feature's path and decisions.
- **Size report**: the lines and estimated tokens of both files, before and after a run.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the first split, the developer judges from the command's size report that the instruction
  file sent with every request is markedly smaller than today's (about 91 KB and 21,000 tokens); no size figure is
  set as a target.
- **SC-002**: After the first split, 100% of today's instruction text can be found verbatim in the complete file.
- **SC-003**: After a feature is planned and the command is run, the instruction file holds exactly one feature's
  path and decisions between its markers, and the developer judges from the size report that it has not regrown.
- **SC-004**: In a session that touches no configuration file, the settings table is not in the AI's context; in a
  session that touches one, it is.
- **SC-005**: A run completes with a size report in a single invocation, with no question asked of the developer.
- **SC-006**: No file of the shipped Spec Kit skills or extensions differs from its state before the feature.

## Assumptions

- Token figures are estimated at about 4 characters per token; the `/usage` figure for today's file is about
  21,000 tokens for 91,300 bytes.
- The AI tool loads the root instruction file into every request, loads a path-scoped rule file only when a task
  touches a matching file, and never loads a file merely named in backticks (requirements report, RS1).
- The shipped `/speckit-plan` and the agent-context extension keep writing between the markers of `CLAUDE.md`; the
  chain grew by imitation of the block's own pattern, not because those skills ask for it (RS2).
- Each branch folder under `C:\crowdPoll\` has its own copy of the files; the change is made on `main` and reaches
  a branch when it merges `main`.
- The project's own skills (`speckit-requirements`, `speckit-tweak`, `speckit-analyze-findings`,
  `speckit-clarify-findings`, `speckit-plan-thru-analyze`, `speckit-file-remote`) may change; only
  `speckit-requirements` and `speckit-tweak` do.
- `README.md` and `ARCHITECTURE.md` describe the application, not the developer tooling, and need no change.
