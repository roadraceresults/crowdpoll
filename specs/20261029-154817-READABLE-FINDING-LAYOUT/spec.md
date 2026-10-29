# Feature Specification: Readable Finding Layout

**Feature Branch**: `speckit-skills` (no dedicated branch created for this feature)

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "requirements/20261029-154817-readable-finding-layout/requirements.md"

**Source requirements**: `requirements/20261029-154817-readable-finding-layout/requirements.md` (the requirements, with every finding of the review folded in under "Decisions").
**Requirements report**: `requirements/20261029-154817-readable-finding-layout/requirements-report.md` (4 diagrams and 14 findings, all resolved).

## Overview

The `/speckit-requirements` skill writes a report of findings that the developer works through, partly in the report file, partly by commands typed in the terminal.
Today an open finding looks almost the same as a resolved one in the raw file, the accept box hides after an arrow, and a recommendation can be accepted from the terminal only for the first open finding.
This feature changes how the skill lays out a finding, and adds one command form, so the developer sees at once what is still open and can accept any recommendation, in the file or by naming it.
Only the `/speckit-requirements` skill changes; the content of findings and every other part of the skill stay as they are.

## Clarifications

### Session 2026-10-29

- Q: When `Accept AM2, B` is typed but Recommendation A is ticked in the file, which wins, and what does `Accept AM2` (no letter) take? → A: The command's letter wins and A's tick is cleared; with no letter, the ticked option is taken, otherwise the single or recommended one.
- Q: How does the skill tell whether an existing report is in the old or the new form? → A: Old form if any Accept line puts the arrow before the box (`➡️ [ ]`, `➡️ [X]`); otherwise, including a report with no findings, new form.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See at a glance which findings are still open (Priority: P1)

A developer opens a report in an editor, raw or in preview, and scrolls through it.
Every finding that is still open carries a `❌ NOT Resolved` line under its explanation; every resolved finding instead carries `✅ Resolved` and `✅ Requirements File Updated` under its title, says which option was chosen (`Accepted`) and which were not (`Not Accepted`), and holds no instructions.

**Why this priority**: it is the main goal of the requirements: telling open from resolved findings without reading each one.

**Independent Test**: create a report with several findings, resolve some of them, and check, in the raw file and the preview, that each open finding shows `❌ NOT Resolved` and each resolved one shows the resolved lines, with nothing else needed.

**Acceptance Scenarios**:

1. **Given** a newly created report, **When** the developer opens it, **Then** every finding shows the title, the explanation as a block quote, a `❌ NOT Resolved` line, and each option followed by its own `[ ] ➡️ **Accept**` line with instructions.
2. **Given** a finding resolved with Recommendation B, **When** the developer opens the report, **Then** the `❌ NOT Resolved` line is gone, `✅ Resolved`, `✅ Requirements File Updated: <date and time>` and `**Notes**:` are under the title, B reads `[X] ➡️ **Accepted**`, every other option reads `[ ] ➡️ **Not Accepted**`, and no instructions remain.
3. **Given** a finding whose accepted option needed no change to the requirements, **When** it is resolved, **Then** its second line reads `✅ Requirements File Unchanged (no edit needed): <date and time>`.
4. **Given** an explanation containing a link, a file name in backticks or bold text, **When** the report is previewed, **Then** they render as a link, code and bold, not as raw characters.

---

### User Story 2 - Accept any recommendation by naming it (Priority: P1)

A developer reading finding AM2 decides on Recommendation B and types `Accept AM2, B` in the terminal, without first resolving the findings before it.

**Why this priority**: it is the new way to accept a recommendation that the Accept lines teach, and it saves working through findings in order.

**Independent Test**: on a report with several open findings, accept the third one by id and letter, and check that only that finding is resolved, the requirements document is updated for it, and the first open finding is then shown.

**Acceptance Scenarios**:

1. **Given** AM2 is open with Recommendations A and B, **When** the developer types `Accept AM2, B`, **Then** AM2 is resolved with B, the requirements document reflects B, and the skill then shows the first finding still open.
2. **Given** the same, **When** the developer types `accept am2 b` (lower case, no comma), **Then** the result is the same.
3. **Given** AM2 offers options with A recommended, **When** the developer types `Accept AM2`, **Then** AM2 is resolved with A.
4. **Given** UA3 has a single, unlettered Recommendation, **When** the developer types `Accept UA3` or `Accept UA3, A`, **Then** UA3 is resolved with that Recommendation.
5. **Given** AM2 is already resolved, or `XY9` does not exist, or AM2 has no option D, **When** the developer names it, **Then** the skill says why and changes nothing.
6. **Given** AM2's Developer Resolution C holds only its instruction line, **When** the developer types `Accept AM2, C`, **Then** the skill asks for a resolution to be written there and changes nothing.
7. **Given** AM2 has Recommendation A ticked in the file, **When** the developer types `Accept AM2, B`, **Then** AM2 is resolved with B and A reads `[ ] ➡️ **Not Accepted**`; **When** instead they type `Accept AM2`, **Then** AM2 is resolved with the ticked A.
8. **Given** the existing commands, **When** the developer types `Accept`, `Accept B`, `Next` or `Accept all`, **Then** they behave exactly as before.

---

### User Story 3 - Accept a recommendation in the file (Priority: P2)

A developer ticks the box at the start of an Accept line in the report, saves the file, and types `Next`.

**Why this priority**: the file route already exists; this story moves the box to the front of its line and makes ticking tolerant, which matters but is a smaller change.

**Independent Test**: tick one Accept line in several different ways, save, type `Next`, and check that each is recognized and resolved.

**Acceptance Scenarios**:

1. **Given** an open finding, **When** the developer changes `[ ]` to `[X]`, `[x]`, `[ x]`, `[x ]` or `[ X     ]` on one Accept line and says `Next`, **Then** that option is accepted and the finding resolved, and the box is written back as `[X]`.
2. **Given** two options of one finding ticked, **When** the developer says `Next`, **Then** nothing is resolved for that finding and the developer is asked to leave exactly one ticked.
3. **Given** an open finding whose `❌ NOT Resolved` line the developer deleted, **When** they say `Next`, **Then** the finding is still treated as open and the line is restored.

---

### User Story 4 - Terminal prompts teach the new command (Priority: P2)

After each command, the skill's prompt names the current finding's id in its Accept lines, e.g. `Type/Say 👉 "Accept AM2, B"`, and the description of the commands includes the new form.

**Why this priority**: it makes the new command discoverable from the terminal as well as from the file.

**Independent Test**: run any command that leaves findings open and check that the prompt shows the current finding's id in the Accept suggestion.

**Acceptance Scenarios**:

1. **Given** the current finding is AM2 with options, **When** the prompt is shown, **Then** it suggests `Accept AM2, <letter>` and the recommended letter.
2. **Given** the current finding has a single Recommendation, **When** the prompt is shown, **Then** it suggests `Accept <ID>`.

---

### User Story 5 - Reports written before the change keep working (Priority: P3)

A developer returns to a report created in the old layout that still has open findings, and resolves them.

**Why this priority**: one existing report (`requirements/20261028-151716-refresh-mechanisms/requirements-report.md`) has 3 open findings in the old layout; without this they could no longer be resolved by the skill.

**Independent Test**: on a copy of that report, tick an old-form `➡️ [X] **Accepted**` line, say `Next`, and check that the finding is resolved in the old form.

**Acceptance Scenarios**:

1. **Given** a report in the old layout, **When** the developer ticks an old-form Accept line and says `Next`, or types `Accept`, **Then** the finding is resolved and written in the old form.
2. **Given** a report in the old layout, **When** a run appends new findings to it, **Then** they are written in the old form, so the report never mixes two layouts.
3. **Given** a report in the new layout, **When** findings are appended, **Then** they are written in the new form.

---

### Edge Cases

- A finding with both `❌ NOT Resolved` and `✅ Resolved`: `✅ Resolved` decides, and the `❌` line is removed.
- A finding marked `✅ Resolved` by hand, without the requirements line or the Notes line: still treated as open and repaired as today.
- A Developer Resolution in which the developer wrote text but also left the instruction line: on resolving, the instruction line is removed and the developer's text kept.
- A command naming a finding in a different case (`am2`) or with extra spaces: matched.
- Blank lines that hold only spaces in a developer-edited report: tolerated when read; the skill never writes them.
- An old report with no findings at all ("None found." in every subsection) has no old-form text, so findings appended to it are written in the new form.
- A research result (`RS`) follows the same layout; Breaking Changes and Technical Debt items are not findings and get no `❌` line.

## Requirements *(mandatory)*

### Functional Requirements

Layout of an open finding (new form):

- **FR-001**: Each finding MUST be written as: its bold title (`**<ID>. <title>**`); a blank line; the explanation, every line starting with `> `; a blank line; the line `❌ NOT Resolved`; a blank line; then its options.
- **FR-002**: Each option MUST be written as its label (`**Recommendation A** _(recommended)_: **<summary>**`, `**Recommendation B**: **<summary>**`, or `**Recommendation**: **<summary>**` when there is only one), a blank line, its Accept line, a blank line, then its details, pros and cons.
- **FR-003**: Each Accept line MUST read `[ ] ➡️ **Accept** (To Accept, you may: mark <b>[X]</b> on this line, save the file, then Type/Say "<b>next</b>" in the CC CLI terminal, OR Type/Say "<b>Accept <ID>, <LETTER></b>" in CC CLI)`, with the finding's real id and the option's letter; for a single, unlettered Recommendation, the command shown MUST be `Accept <ID>`.
- **FR-004**: Every finding MUST end with a Developer Resolution, lettered after the last Recommendation, with its own Accept line and the single instruction line `- you may enter your own resolution here`.
- **FR-005**: Two blank lines MUST separate consecutive options; every blank line the skill writes MUST be empty (no spaces).

Layout of a resolved finding (new form):

- **FR-006**: On resolving, the skill MUST remove the `❌ NOT Resolved` line and insert directly under the title `<span style="font-size:large" ><b>` / `✅ Resolved</b></span>`, then `✅ Requirements File Updated: <date and time>` (or `✅ Requirements File Unchanged (no edit needed): <date and time>`), then the `**Notes**:` line recording how, when and which option was accepted and what changed in the requirements.
- **FR-007**: The accepted option's Accept line MUST become `[X] ➡️ **Accepted**`; every other option's, including an unused Developer Resolution, MUST become `[ ] ➡️ **Not Accepted**`; no instructions MUST remain on any Accept line.
- **FR-008**: The Developer Resolution's instruction line MUST be removed on resolving, and any text the developer wrote there MUST be kept.

Reading the file:

- **FR-009**: An Accept line's box MUST count as ticked when it holds `x` or `X` with any number of spaces before or after it; the skill MUST always write a ticked box as `[X]`.
- **FR-010**: Whether a finding is resolved MUST be decided only by the presence of the `✅ Resolved` line, as today; the `❌ NOT Resolved` line MUST NOT decide it.
- **FR-011**: "Next" MUST restore the `❌ NOT Resolved` line on an open new-form finding that lacks it, and remove it from a resolved one.

Commands:

- **FR-012**: The skill MUST accept the command `Accept <ID>[,] [<LETTER>]`, matched case-insensitively with the comma optional, for any open finding in any order; a letter in the command MUST win over any box ticked in the file, whose tick is cleared; the id alone MUST take the one option ticked in the file, if exactly one is, otherwise the single Recommendation or the one marked recommended.
- **FR-013**: For a resolved or unknown id, an unknown letter, or a Developer Resolution holding only its instruction line, the skill MUST say why and change nothing.
- **FR-014**: After resolving a finding by id, the skill MUST run "Next", showing the first finding still open.
- **FR-015**: The existing commands "Next", "Accept", "Accept X" and "Accept all" MUST keep their current meaning.
- **FR-016**: The skill's description of its commands MUST include the new form, and its terminal prompts MUST suggest it with the current finding's id (`Accept <ID>, <LETTER>`, or `Accept <ID>` for a single Recommendation).

Compatibility and scope:

- **FR-017**: The skill MUST read reports in both the old and the new form.
- **FR-018**: A report MUST keep the form it was created in: findings appended to, or resolved in, an old-form report MUST be written in the old form; reports created after this change MUST use the new form; a report is in the old form when any of its Accept lines puts the arrow before the box (`➡️ [ ]`, `➡️ [X]`), and in the new form otherwise, including when it has no findings.
- **FR-019**: The layout MUST apply to every finding category (`IN`, `AM`, `UA`, `NC`, `RS`); Breaking Changes and Technical Debt items MUST NOT carry the `❌` line.
- **FR-020**: Only the `/speckit-requirements` skill MUST change; `/speckit-analyze-findings` and `/speckit-clarify-findings` keep the old layout, recorded as a follow-up.
- **FR-021**: Every place in the skill that describes or quotes the finding layout or the Accept line MUST describe the new form (with the old form kept where FR-017/FR-018 need it), so no instruction contradicts another.

### Key Entities

- **Finding**: one item of the report, with an id (`IN`, `AM`, `UA`, `NC`, `RS` and a number), a title, an explanation, one or more options, and a state: open, or resolved.
- **Option**: a lettered or single Recommendation, or the Developer Resolution, each with one Accept line whose box is ticked or not.
- **Report form**: old or new, fixed when the report is created, deciding how its findings are written; read from the report's Accept lines (arrow before the box → old), never stored separately.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a new report, a developer can count the open findings by searching for one marker (`❌ NOT Resolved`), and, after each command, the count equals the skill's own count of open findings in 100% of cases.
- **SC-002**: A developer can accept any open finding's option with one command, in any order, without resolving the findings before it.
- **SC-003**: Each of the five ticked-box variants in User Story 3 is recognized on the first `Next`.
- **SC-004**: All links and formatting inside explanations render in the preview of a new report, none showing as raw characters.
- **SC-005**: The 3 open findings of the existing old-form report can still be resolved, and that report ends with no new-form finding in it.
- **SC-006**: A resolved finding contains no instruction text: zero lines starting `(To Accept` or `- you may enter` remain in it.

## Assumptions

- The developer uses an editor with a Markdown preview (VS Code); the `<b>` and `<span>` tags in the layout render there and on GitHub.
- `FINDING1` in the requirements is a placeholder for the real ids; ids, numbering and finding categories are unchanged.
- The skill's other behaviour (normalizing, locks, CREATE and APPEND, Additional Requirements, the Complete Report) is unchanged.
- The rule of breaking lines after sentences, with two trailing spaces, still applies to text the skill writes; in the block-quoted explanation each line starts with `> `.
- The small existing faults in the skill's text (a repeated "a a", "in the console", "Architecture Complete Report") may be corrected where the surrounding text is already changed by this feature, and not elsewhere.
- Updating the other two findings skills to the new form is a separate, later feature.
