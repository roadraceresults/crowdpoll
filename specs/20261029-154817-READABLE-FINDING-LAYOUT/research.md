# Research: Readable Finding Layout

The feature edits one file, `.claude/skills/speckit-requirements/SKILL.md` (866 lines).
There was nothing external to research; each decision below comes from reading that file, the requirements report and the existing reports under `requirements/`.

## R1. One file, these sections

**Decision**: change only `SKILL.md`, in these places:

| Section (line today) | Change |
|---|---|
| *Skill Name / Purpose* (48, 55) | the Accept line and commands named in the new form; "a a" fixed |
| *Generation Mode*, APPEND (280, 283) | "its own Accept line"; appended findings follow the report's form (R5) |
| *For AI Generation* items 8–11 (390–410) | refer to *Finding layout* instead of repeating the `➡️ [ ] **Accepted**` line |
| *Finding layout* (412–518) | rewritten: initial, accepted and resolved forms as in `contracts/finding-layout.md` L1–L3, then the old form (L4) |
| *Research Results* (527–570) | the example in the new form; "same layout as *Finding layout*" |
| *Writing text into the files* (572–587) | the explanation's `> ` prefix; empty blank lines; two blank lines between options |
| *Resolution of Findings* (669–770) | *Resolving a finding* in the new form; new command 4, `Accept <ID>, <LETTER>`; "Next" marker upkeep |
| *Prompting The Developer* (772–826) | Accept lines name the current id (`contracts/commands.md` C5) |
| "Architecture Complete Report" (283, 720, 866) | renamed *Requirements Report Complete Report*, where the line is already touched |

Frontmatter, *User Input*, *NEW*, *Normalizing*, locks and the Complete Report's content are unchanged.

**Rationale**: FR-020, FR-021; Constitution III (surgical changes).
**Alternatives considered**: also editing `speckit-analyze-findings` and `speckit-clarify-findings` — rejected by NC1, a follow-up.

## R2. The layout is described once

**Decision**: *Finding layout* holds the only full template of each form; every other section refers to it by name.
**Rationale**: the old layout is quoted in about 25 places (TD1), which is why changing it needs care; describing it once makes this the last time.
**Alternatives considered**: updating every quotation in place — keeps the duplication.

## R3. The explanation is a block quote

**Decision**: every line of the explanation starts with `> ` and still ends with two spaces; a blank line before and after it.
**Rationale**: AM1. A four-space indent after a blank line is an indented code block in CommonMark, which would print links, `code` and bold as raw characters; a block quote keeps the offset and renders them.
**Alternatives considered**: plain lines (no offset), the code block (raw characters).

## R4. Recognizing a tick

**Decision**: a box is ticked when it matches `\[\s*[xX]\s*\]` and unticked when it matches `\[\s*\]`; the skill writes `[X]` and `[ ]` only (L3.1).
**Rationale**: IN1 resolution; editors and voice input produce `[x]`, `[ X ]` and the like.

## R5. Which form a report is in

**Decision**: old when any Accept line has the arrow before the box (`➡️ [ ]`, `➡️ [X]`), new otherwise; read each time, never stored (L3.5).
**Rationale**: clarification Q2. The ten existing reports all match the old pattern; a report with no findings has nothing to stay consistent with.
**Alternatives considered**: a date cut-off, a stored marker line.

## R6. The command grammar

**Decision**: `Accept <ID>[,] [<LETTER>]` with the id `(IN|AM|UA|NC|RS)\d+`; a lone letter is still `Accept X`; `Accept all` is checked first. The command's letter wins over a tick in the file and the tick is cleared; with no letter, a single tick is used, else the single or recommended option (C1).
**Rationale**: AM4, UA5, clarification Q1. An id always has two letters and a number, so it cannot be mistaken for an option letter or for "all".

## R7. Resolved wording

**Decision**: `[X] ➡️ **Accepted**` and `[ ] ➡️ **Not Accepted**`; the `✅ Resolved` span as in the requirements (`<span style="font-size:large" ><b>` then `✅ Resolved</b></span>` on the next line); the requirements line and the Notes line kept (L2).
**Rationale**: AM2, UA1, UA2. "Next" finds `✅ Resolved` by its text, so the span split over two lines does not matter.

## R8. The `❌` line is a reading aid

**Decision**: `✅ Resolved` alone decides the state; "Next" adds a missing `❌ NOT Resolved` to an open new-form finding and removes a stray one from a resolved one (L3.2–L3.4). Old-form findings never get one.
**Rationale**: UA4; keeps the hand-marked check unchanged.

## R9. Old reports

**Decision**: the skill reads both forms and writes the report's own form; *Finding layout* ends with a short *Old form* subsection (L4) holding what the skill needs to resolve or append in an old report.
**Rationale**: NC2. `requirements/20261028-151716-refresh-mechanisms/requirements-report.md` has 3 open old-form findings.

## R10. How the change is verified

**Decision**: no automated test: a skill is instructions, run by the model. Verification is (a) a consistency check of `SKILL.md` by search — no quotation of the old Accept line outside the *Old form* subsection and the old-report rules, and the new Accept line in every place that describes it — and (b) the walk-throughs in `quickstart.md`, on a throwaway feature and on a copy of an old report.
**Rationale**: the deferred "verification" item from `/speckit-clarify`; Constitution IV asks for a checkable definition of done, which the searches and walk-throughs give.
**Alternatives considered**: a script that parses reports — no such code exists to test; writing one for this would be speculative (Constitution II).

## R11. Writing rules

**Decision**: *Writing text into the files* gains three rules: the explanation's `> ` prefix; a blank line is empty; two blank lines between options and one after each label and each Accept line. The Accept line itself needs no trailing spaces, because a blank line follows it.
**Rationale**: UA7.
