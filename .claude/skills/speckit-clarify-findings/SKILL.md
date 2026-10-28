---
name: "speckit-clarify-findings"
description: "Capture the most recent speckit-clarify session into <feature_directory>/clarify-findings.md: every question asked with its options, the recommended answer and the answer given, and the coverage summary, with each Deferred or Outstanding category as a finding with its recommendation(s). Then resolve those findings one at a time, or all at once after being reviewed in the report. The developer marks a recommendation [X] Accepted in the file and then will Type or Say 'Next', or the developer will Type or Say 'Accept', or the developer will Type or Say 'Accept all'; the skill applies it to spec.md and marks the finding as resolved."
argument-hint: "no arguments"
compatibility: "Requires spec-kit project structure with .specify/ directory and a prior /speckit-clarify run"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Skill
user-invocable: true
disable-model-invocation: false
metadata:
    - author: "David Brooks"
---

# Skill Name / Purpose
This speckit-clarify-findings skill turns a `/speckit-clarify` session, which lives only in the conversation, into a
durable record and a checkable work list.

`/speckit-clarify` asks up to five questions one at a time, writes each accepted answer into `spec.md` (one bullet under
`## Clarifications` → `### Session YYYY-MM-DD`, plus the section it clarifies), and ends with a Completion Report. The
questions, their options, the recommendation it made and the Completion Report are lost when the session ends or the
context is compacted. This skill:
1. **Captures** the most recent session into `clarify-findings.md`, next to the current feature's `spec.md`:
   - every question asked, with its options, the recommended answer, the answer given and the spec sections it changed.
     These were already applied by `/speckit-clarify`, so they are recorded, not resolved again;
   - the Completion Report: the sections touched, the spec quality checklist status and the coverage summary;
   - one **finding** per coverage category that `/speckit-clarify` left **Deferred** or **Outstanding**, each with its
     recommendation(s) and a `➡️ [ ] **Accepted**` box. A finding remains **open** as long as it has not been resolved.
2. **Answers three commands** about the findings list, for as long as findings remain open:
   - **"Next"** — resolves every open finding whose recommendation the developer has marked `[X] Accepted` in the file,
     then shows the first finding still open.
   - **"Accept"** — accepts the recommended recommendation of the next open finding, applies it to `spec.md` (and to the
     feature's requirements documents where they must change too), and marks the finding resolved.
   - **"Accept all"** — does the same for every open finding that offers just one recommendation, in one pass, and
     reports the ones skipped because they have more than one recommendation.

Only this skill marks a finding resolved, because resolving it changes `spec.md`. The developer accepts a
recommendation (by marking it in the file, or by saying "Accept"); the skill does the rest.

The developer is expected to run `/speckit-clarify` again once every finding is resolved, if any were answered here, to
confirm the spec has no critical ambiguity left before `/speckit-plan`.

## Core Instructions

### User Input

The /speckit-clarify-findings command does not take any arguments (the raw text the user types after `/speckit-clarify-findings`).

### Prerequisites (every mode)

1. Read `.specify/feature.json` at the project root and take its `feature_directory` field (a path relative to the project
   root, e.g. `specs/20261016-172002-FAVICON`).
   - File or field missing → fail with: `ERROR: .specify/feature.json has no feature_directory. Run /speckit-specify first.`
2. Derive:
   - `FEATURE_DIR` = `<feature_directory>`
   - `SPEC` = `FEATURE_DIR/spec.md` (must exist; otherwise fail with `ERROR: <SPEC> not found.`)
   - `CHECKLIST` = `FEATURE_DIR/checklists/requirements.md` (may be absent)
   - `REPORT` = `FEATURE_DIR/clarify-findings.md`
   - **The feature's related artifacts**, written by `/speckit-requirements` (they may be absent):
     `REQUIREMENTS` = `<requirements_directory>/requirements.md` and `REQUIREMENTS_REPORT` =
     `<requirements_directory>/requirements-report.md`, with `requirements_directory` from `.specify/requirements.json`,
     **only when they belong to this feature**: the requirements document's first line
     (`Start a new spec for these requirements called `…``) names `FEATURE_DIR`'s folder, or the two folders' names
     start with the same feature number. Otherwise, or when the file or key is missing, treat them as absent.
3. For the three commands, `REPORT` must already exist. If it does not, fall through to **Capture mode** first (if a
   session is available in the conversation) and then answer the command; if no session is available either, fail with:
   `ERROR: <REPORT> not found and no /speckit-clarify session is in this conversation. Run /speckit-clarify first.`

Timestamps written to `REPORT` are local time in the form `YYYY-MM-DD HHMMSS XM`, obtained from the shell
(`date '+%Y-%m-%d %I%M%S %p'`), never guessed.

### Capturing the Session

**Locating the source session.** The source is the most recent `/speckit-clarify` run **in this conversation**: from its
first question (or its "No critical ambiguities detected" reply) to its Completion Report. Use the last one if several
exist. A run still in progress (questions asked, no Completion Report yet) is not captured: say so, and ask the
developer to finish or stop `/speckit-clarify` first. Take from it, verbatim where possible:

- each question, in the order asked: its text, its options table (or, for a short-answer question, the suggested
  answer), the `**Recommended:**` / `**Suggested:**` line with its reasoning, and the answer the developer gave
  (an option letter, "yes"/"recommended"/"suggested", or their own short answer), with what it resolved to;
- for each question, the `- Q: … → A: …` bullet `/speckit-clarify` wrote and the spec section(s) it changed;
- the Completion Report: questions asked and answered, sections touched, the spec quality checklist status, the
  coverage summary table, and its recommendation and suggested next command.

Do not re-run the clarification scan or invent findings the session did not contain. Read `SPEC` to confirm each
question's `- Q: … → A: …` bullet is there; if one is missing, record that in the question's entry
(`⚠️ not found in spec.md`) rather than writing it in.

**Findings come from the coverage summary.** Each category whose status is **Deferred** or **Outstanding** becomes one
finding, Deferred before Outstanding, each in the summary's order. Read the parts of `SPEC` the category concerns so its
recommendation(s) are grounded in the current text:

- When the session gave a reason or a proposed answer for the category, that is one recommendation, written as the
  session gave it.
- Offer as options only resolutions that are genuinely reasonable, typically: answer it now in the spec (a concrete
  proposed answer, stated as a `- Q: … → A: …` pair); record it in the spec's Assumptions as a stated default; or leave
  it for `/speckit-plan` (no edit).
- A Deferred category is high impact by definition, so prefer answering it now; an Outstanding one is low impact, so
  prefer recording a default.

If the session had no Deferred or Outstanding categories, still write the file (the questions and the Completion
Report, with no findings) so that *Next* can answer "All findings resolved."

**When `REPORT` does not exist — create it** with exactly this layout:

```markdown
# Clarification Session Report — <feature_directory>

## Record

| Record | Value |
|---|---|
| Feature directory | <feature_directory> |
| Spec | <feature_directory>/spec.md |
| Report created | <timestamp> |
| Session captured | <timestamp of this capture> |
| Last updated | <timestamp> |

The questions below were answered during `/speckit-clarify` and are already in `spec.md`.
The findings are the coverage categories it left Deferred or Outstanding.
A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
"Next" always returns the first open finding below.

## Questions Asked

<one section per question, in the order asked — see *Question layout*>

## Findings

<one section per finding, in its initial form — see *Finding layout*>

## Coverage Summary

<the coverage summary table, verbatim>

## Spec Quality Checklist

<the checklist status as reported, verbatim, or "Not re-validated (no checklists/requirements.md).">

## Next Actions (as reported)

<the session's recommendation and suggested next command, verbatim>
```

### Question layout

Every line ends with two spaces, the Markdown line break.

```markdown
### **Q1** · Functional Scope & Behavior  

  Should a guest see the favicon on the sign-in page?  

  **Recommended:** Option A - every page shares one `<head>` partial, so excluding one page adds a special case.  

  | Option | Description |
  |--------|-------------|
  | A | Every page, the sign-in page included |
  | B | Signed-in pages only |

  **Answer:** "yes" → Option A, every page, the sign-in page included.  
  **Recorded in spec.md:** `- Q: Should a guest see the favicon on the sign-in page? → A: Every page, sign-in included`  
  **Sections changed:** Clarifications; Functional Requirements (FR-003).  
```

- The heading is a level-3 heading: `**Q<n>**` in bold, then ` · ` and the taxonomy category the question addressed.
- A short-answer question has its `**Suggested:**` line and no table.
- Questions are a record: they have no `Accepted` boxes and are never resolved, edited or reopened by this skill.

### Finding layout

Every finding goes through three forms. Every line ends with two spaces, the Markdown line break. Findings are numbered
`D1`, `D2`, … for Deferred categories and `O1`, `O2`, … for Outstanding ones.

*Initial form* — as the finding is captured; here is an example of how it should look:

```markdown
### **D1** · Non-Functional Quality Attributes · Deferred · spec.md Success Criteria  

  `/speckit-clarify` reached its five-question limit before asking about icon caching.  
  The spec does not say how long browsers may cache `favicon.ico`.  

  - **Recommendation A** _(recommended)_: Answer it now: `- Q: How long may browsers cache the favicon? → A: One day, as other static assets`.  

    ➡️ [ ] **Accepted** <span style="font-size:smaller ;padding-left:50px"><i>(you may mark <b>[X] Accepted</b> here, or Type/Say "<b>Accept</b>" in the CC CLI terminal)</i></span>  
    - <u>Pros</u>: the plan and the tests get a definite value.  
    - <u>Cons</u>: one more decision before planning.  

  - **Recommendation B**: Leave it for `/speckit-plan`.  

    ➡️ [ ] **Accepted** <span style="font-size:smaller ;padding-left:50px"><i>(you may mark <b>[X] Accepted</b> here, or Type/Say "<b>Accept</b>" in the CC CLI terminal)</i></span>  
    - <u>Pros</u>: no spec change now.  
    - <u>Cons</u>: the plan may choose a value the spec never stated.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  
    - you may enter your own resolution here and check the box above when done  
    - then Type or Say "Next" in the CC CLI terminal to have it applied  
```

- The heading is a level-3 heading: the finding's ID in bold, then its taxonomy category, its status (Deferred or
  Outstanding) and the spec location(s) it concerns, separated by ` · `.
- The description follows after a blank line, indented two spaces: why the category was left (as the session said) and
  what the spec lacks.
- With **one** recommendation, its label is `**Recommendation**`. With **several**, each is an option labelled
  `**Recommendation A**`, `**Recommendation B**`, …, and the one you recommend carries `_(recommended)_` after its
  label. Each label is followed by `: ` and the recommendation.
- Each recommendation is followed by a blank line and its own `➡️ [ ] **Accepted**` line, carrying the hint `<span>`
  exactly as shown, then its `<u>Pros</u>` and `<u>Cons</u>` sub-items (for options) or its explanation.
- **Every finding ends with a blank Developer Resolution**: a last item labelled `**Developer Resolution <letter>**`,
  where the letter follows the last recommendation's (`B` after a single **Recommendation**, `C` after
  Recommendations A and B), with its own `➡️ [ ] **Accepted**` line (no hint `<span>`) and the two instruction lines
  exactly as shown. The developer writes their own resolution under it (beside or in place of the two instruction
  lines), ticks its box, saves the file and says "Next". It is not an option: it never counts toward "more than one
  option", and it is never chosen by a plain *Accept* or by *Accept all*.
- There is **no** "Resolved" line or checkbox in the initial form. A finding is resolved only by this skill, because
  resolving it changes `spec.md`, which the developer must not do by hand for a finding.

*Accepted form* — a recommendation has been accepted, by the developer in the file or by *Accept*, but the finding is
not yet resolved: that recommendation's `➡️ [ ] **Accepted**` becomes `➡️ [X] **Accepted**`, and nothing else changes.

*Resolved form* — written by this skill, and only by it, once the accepted recommendation has been applied:

```markdown
### **D1** · Non-Functional Quality Attributes · Deferred · spec.md Success Criteria  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ spec.md Updated: 2026-10-20 10:15 AM  
  **Notes**: Recommendation accepted in file 2026-10-20: Recommendation A, browsers may cache the favicon for one day;  
  spec.md: a Clarifications bullet under Session 2026-10-20, and SC-004.  

  `/speckit-clarify` reached its five-question limit before asking about icon caching.  
  ...
```

- Insert three lines directly under the finding's heading, indented two spaces like the rest of the finding:
  - `<span style="font-size:large">✅ Resolved</span>`;
  - `✅ <file> <file> … Updated: <date and time>`, naming every file the resolution changed, with the local time from
    the shell (`date '+%Y-%m-%d %-I:%M %p'`, e.g. `2026-10-20 10:15 AM`), never guessed. When the accepted
    recommendation needed no change to any file (for example "leave it for `/speckit-plan`"), write
    `✅ Files Unchanged (no edit needed): <date and time>` instead;
  - `**Notes**:` how and when the recommendation was accepted (`Recommendation accepted in file <date>`, or
    `Recommendation accepted by "Accept" <date>`, or `… by "Accept all" <date>`), which recommendation, and what changed
    in which file, or that nothing needed to change.
- Remove the hint `<span>` from **every** `➡️ … **Accepted**` line of that finding, and the two instruction lines from
  its Developer Resolution (keeping any text the developer wrote there); the checkboxes stay as they are.
- **A finding is resolved only when it has all three:
  the `✅ Resolved` line, the `✅ … Updated` (or `✅ Files Unchanged`) line, and the `**Notes**:` line.**
  A finding without the `✅ Resolved` line is open. The `Accepted` checkboxes never decide whether a finding is open.
- **A finding marked resolved by hand** has the `✅ Resolved` line but is missing the files line or the `**Notes**:`
  line. It is treated as open, and *Next* repairs it (see "Next" in *Resolution of Findings*).

**When `REPORT` already exists and a session is being captured — back it up first.** In Capture mode, when there is a
source session to capture that `REPORT` does not already hold, check whether `REPORT` already exists before writing it.
If it does:

1. Rename it, in `FEATURE_DIR`, to `clarify-findings-<timestamp>.md`, where `<timestamp>` is the local time from the shell
   in the form `YYYYMMDD-HHMMSS-XM` (`date '+%Y%m%d-%H%M%S-%p'`, e.g. `clarify-findings-20261020-141502-PM.md`). The hour
   is on the 24-hour clock, so the backups sort by name in time order; `XM` is `AM` or `PM`. Its content is preserved
   exactly; the rename is the only change. If a file of that name already exists, wait a second and take a new
   timestamp.
2. Log `Backed up clarify-findings.md → clarify-findings-<timestamp>.md`.
3. Create a new `REPORT` from the source session, exactly as for a missing file above.

Take the lock on `clarify-findings.md` before the rename and hold it until the new file is written.

Capture mode backs up and recaptures **only when there is a session to capture that the file does not already hold**: a
`/speckit-clarify` session completed in this conversation that has not already been captured into `REPORT` in this
conversation. With no such session, leave `REPORT` exactly as it is, say that no new clarification session was found,
and prompt the developer (see *Prompting The Developer*). No other command renames or recreates `REPORT`.

**Changes to an existing `REPORT` while working through it.** Between captures the file is the developer's working record.
The only permitted changes are:

1. **The date/time records in the `## Record` section**: set `Last updated` to now on every write.
2. **Accepted boxes**: mark a recommendation `➡️ [X] **Accepted**` when *Accept* or *Accept all* accepts it. Never
   unmark one the developer marked.
3. **Resolving a finding**: turn it into its *Resolved form*, or complete the lines a finding marked resolved by hand is
   missing.
4. **Reopening**: only when the developer asks ("reopen D2"), remove the finding's three resolved lines.

The **Questions Asked**, **Coverage Summary**, **Spec Quality Checklist** and **Next Actions** sections are never changed
after capture.

**After every capture (create or update)**, run "Next" (see *Moving on automatically*).

### File lock while executing a command

The developers may edit `clarify-findings.md`, `spec.md` and the related artifacts while this skill is in use, but only while
the skill holds no lock on the file, so the two never change a file at the same time. Every command that may change any
of them — Capture mode, *Next*, *Accept* (with or without an option letter), *Accept all*, and any of these aimed at a
finding by ID — runs under a lock on **each file it changes**.

- **Before the first change to a file** while executing the command, create its sibling lock file — the file's own
  name plus `.lock`, in the file's own directory (`clarify-findings.md.lock`, `spec.md.lock`, `requirements.md.lock`, …) —
  containing the command being executed (as typed, with the finding ID it acts on) and the time it started.
- **The held lock on `requirements.md`.** `/speckit-requirements` may hold `REQUIREMENTS` locked between its commands (its
  `.lock` file holds `held: until the findings are resolved` and the file is read-only). Do not take, release or delete
  that lock. If a resolution must change `REQUIREMENTS` while it is held, make the file writable only for this skill's
  own write and read-only again at once, leave its `.lock` file in place, and record the new hash in
  `.specify/requirements.json` under `last_written` as well, so `/speckit-requirements` does not report it as an outside
  change.
- **Make the locked file read-only.** Right after creating the `.lock` file, make the file read-only (`chmod a-w <file>`;
  in Git Bash on Windows this sets the read-only attribute, as `attrib +R <file>` does). Immediately before each of the
  skill's own writes, make it writable (`chmod u+w <file>`), write, and make it read-only again. In Capture mode, make
  `clarify-findings.md` writable before renaming it to its backup; the backup is left writable.
- **Lock commands use literal paths, never shell variables or loops.** Write every command that creates, removes or
  changes the attribute of a lock or a locked file with the file's full path spelled out, one command per file, e.g.
  `rm -f -- "<dir>/<file>.lock"` with the real directory and file name in place of the placeholders; never
  `rm $d/$f.lock`, `for f in …; do rm …; done`, or any `rm` built from a variable. The same goes for `chmod`, `attrib`
  and `sha256sum`.
- **While locked**:
  - re-read the part of the file you are about to change immediately before each change;
  - change it only with targeted edits, never by rewriting the whole file (writing a new `clarify-findings.md` in Capture
    mode is the one exception);
  - if an edit fails because the file changed on disk, re-read it, keep the developers' change, and redo your edit on
    top of it.
- **Tell the skill's own writes from anyone else's by content, never by tool warnings.** Right after each of its own
  writes, record the file's SHA-256 (`sha256sum <file>`); before its next write, compute it again, and report "changed
  by someone else" only when it differs, showing what changed. An editing tool's "modified on disk" warning is not
  evidence of another writer.
- **When the command is finished, or abandoned because of an error**, on every exit path: make each locked file
  writable again (`chmod u+w <file>`), delete every lock file it created, record each changed file's final SHA-256 in
  `.specify/clarify-findings.json` under `last_written` (a map from project-root-relative path to hash; create the file if
  it is absent, and change no other key in it), and log `Lock released <time>` to the CC CLI terminal, followed by:
  `If you had unsaved edits to <file> open in an editor, reload it before saving (VS Code: "Revert File", or accept the "file is newer" comparison), or the older copy will overwrite these changes.`
- **At the start of every command**, before anything else, compare each file it may change with its `last_written`
  hash (skip the check when there is none):
  - a change the developer is expected to make is accepted as usual: in `clarify-findings.md`, ticking or unticking
    `[ ] Accepted`, or writing their own resolution under a **Developer Resolution**; in `spec.md` and the related
    artifacts, the developer's own edits, as long as they keep what this skill wrote there;
  - a change that removes or alters the skill's own text is reported, with what was lost, before anything else is done:
    in `clarify-findings.md`, a `✅ Resolved`, `✅ … Updated` / `✅ Files Unchanged` or `**Notes**:` line, a finding, a
    question or a captured section; in `spec.md` and the related artifacts, an edit a resolved finding's `**Notes**:`
    says this skill made. Ask the developers whether to restore the lost text (from the skill's own record of what it
    wrote, or from git) or keep the file as it is; change nothing until they answer.
- **If a lock file is already present when a command starts** (other than the held lock on `requirements.md`), or a file
  the skill locks is still read-only with no lock file beside it, log what was found and ask the developers whether it
  is stale before continuing; do not delete it, change the attribute, or touch the locked file until they answer.

## Resolution of Findings
All three commands are matched **case-insensitively**, ignoring surrounding punctuation and trailing periods.

**Resolving a finding** (used by all three commands) means, for the open finding and its one accepted recommendation:
revise `SPEC` to reflect it, as described below; then turn the finding into its *Resolved form* (see *Finding layout*):
mark that recommendation `➡️ [X] **Accepted**` if it is not already, insert the `✅ Resolved` line, the
`✅ <files> Updated` (or `✅ Files Unchanged`) line and the `**Notes**:` line under the finding's heading (completing any
of them a hand-marked finding is missing, and never duplicating one already there), remove the hint `<span>` from every
`Accepted` line of the finding, and update `Last updated`; then log the finding's ID and a one-line summary of the change
(or that none was needed). Only this skill ever resolves a finding.

- **Revising the spec — the way `/speckit-clarify` does.**
  - **An answer** goes in as `/speckit-clarify` step 6 writes one: under `## Clarifications`, in a `### Session
    YYYY-MM-DD` subheading for today (created if absent, after any existing sessions), append
    `- Q: <question> → A: <answer>`; then apply it to the most appropriate section (Functional Requirements, User
    Stories, Data Model, Success Criteria, Edge Cases), replacing any statement it makes obsolete rather than
    duplicating it.
  - **A stated default** goes in the spec's Assumptions section (created after the requirements sections if absent), as
    one bullet.
  - **"Leave it for `/speckit-plan`"** changes no file.
  - Surgical edits only: keep the headings, IDs (`FR-###`, `SC-###`) and numbering intact, and the file's wording style.
- **Re-validate the spec quality checklist.** After each change to `SPEC`, when `CHECKLIST` exists, re-evaluate its
  checkbox items against the updated spec exactly as `/speckit-clarify` step 9 does, toggling only the markers whose
  state changes; name it in the files line when it changed.
- **Keeping the related artifacts consistent.** After revising `SPEC`, check `REQUIREMENTS` and `REQUIREMENTS_REPORT` for
  statements the change makes untrue, and revise them the same surgical way. Change only the affected text: never a
  document's first line, a finding, its `➡️ … Accepted` lines, `✅` lines or `**Notes**:`, or a report section. When a
  related artifact needs no change, leave it alone.
- List **every** file the resolution changed in the finding's `✅ <files> Updated` line, its `**Notes**:` line and the
  console log.

**Moving on automatically.** Two events run "Next" on their own, exactly as if the developer had typed it:
- **A capture**: when Capture mode writes a new `clarify-findings.md`, finish the capture and then run "Next";
- **A finding resolved**: when "Accept" resolves a finding, run "Next". "Accept all" runs "Next" once, after its report.

"Next" never chooses a recommendation itself; it resolves only what the developer has marked `[X] Accepted`. When
nothing was resolved ("Accept all" accepted nothing), do not move on.

   1. "Next", "Whats next" or "What's next":
      - **First, sweep every open finding in the report**, in file order (an open finding is one not fully resolved,
        including one marked resolved by hand). For each:
        - **Exactly one recommendation marked `[X] Accepted`** → resolve the finding with it (see *Resolving a finding*).
        - **More than one recommendation marked** → resolve nothing for it; remember it for the report below.
        - **No recommendation marked** → leave it as it is.
        - **Marked resolved by hand** (`✅ Resolved` present, but the files line or `**Notes**:` missing) → log:
          `Finding <ID> was marked ✅ Resolved by hand, but spec.md was not updated. Please do not mark findings
          resolved yourself: mark a recommendation [X] Accepted, save the file, and Type or Say "Next".` Then, if
          exactly one of its recommendations is marked, resolve it as above; otherwise remove the hand-written
          `✅ Resolved` line, so the finding is plainly open again.
      - **A marked Developer Resolution** is resolved like any other recommendation, using the text the developer wrote
        under it. If it is marked but holds only the two instruction lines, resolve nothing for it: report it and ask
        the developer to write their resolution under it.
      - **Then report the sweep**: one line per finding resolved (its ID, and what changed in which file), one line per
        finding with more than one recommendation marked (asking the developer to leave exactly one marked), and the
        updated counts (open and resolved).
      - **Then proceed as if the developer had typed "Next" again**: take the first finding still open, read the spec
        text it concerns so the context is current, and show it and its recommendation(s), with a brief explanation of
        the pros and cons of each option when there are several (see *Prompting The Developer*).

      - If there are no open findings, respond with:
 ```
⚪  
⚪ All clarification findings have been resolved:  
⚪ ✅ Deferred ✅ Outstanding  
⚪  
⚪  The spec is ready for /speckit-plan.  
⚪  (If findings were answered here, you may run /speckit-clarify again first, to confirm no critical ambiguity is left.)  
⚪  
🟩 At the prompt, Type:  
🟩 👉 /speckit-plan  
⚪  
  ```

   2. "Accept", or "Accept X" where X is an option letter:
      - Accept, for the first open finding (or the finding named by ID), the recommendation named: `Accept X` takes
        option X; a plain `Accept` takes the single **Recommendation**, or the option marked `_(recommended)_` when
        there are several. If the developer has already marked exactly one recommendation `[X] Accepted`, a plain
        `Accept` takes that one. `Accept X` naming the **Developer Resolution** takes it only when the developer has
        written a resolution under it; otherwise say so and change nothing.
      - Resolve the finding with it (see *Resolving a finding*), give a brief explanation of the recommendation, then
        run "Next".

   3. "Accept all":
      - Work through **every** open finding, in file order, and resolve each one exactly as "Accept" would, except that
        **a finding that offers more than one option is skipped**, unless the developer has marked exactly one of its
        options `[X] Accepted` (then that option is used). A finding with a single recommendation is resolved with it.
      - When the pass is finished, report, in this order:
         1. the findings resolved, two lines each: line one with the finding's ID, category and status, line two with
            the recommendation letter (if more than one recommendation) and a one-line summary of it;
         2. the counts: resolved, and how many findings remain open.
      - If every open finding offers options with none marked, accept nothing and say so plainly.
      - When at least one finding was resolved, run "Next" after the report.

## Prompting The Developer

After a capture, and at the end of every command (Next, Accept, Accept X, Accept all), prompt the developer as below.

When none of the open findings have options:
🟩 The Findings and Recommendations are in <FEATURE_DIR>/clarify-findings.md  
🟩 Open Findings: N      Resolved Findings: M  
🟩  
🟩 Current finding: <FINDING_ID> · <CATEGORY> · <STATUS>  
🟩 Recommendation: <RECOMMENDATION_SUMMARY>  
⚪  
⚪ Type/Say 👉 "Next" - after marking one or more Recommendations "[X] Accepted" in the file (and saving it)  
⚪ Type/Say 👉 "Accept All" - to accept all Recommendations  
⚪ Type/Say 👉 "Accept" - accept the Recommendation for the current finding  
⚪  

and when there is at least one open finding with options, and just one option for the current finding:

🟩 The Findings and Recommendations are in <FEATURE_DIR>/clarify-findings.md  
🟩 Open Findings: N      Resolved Findings: M  
🟩  
🟩 Current finding: <FINDING_ID> · <CATEGORY> · <STATUS>  
🟩 Recommendation: <RECOMMENDATION_SUMMARY>  
⚪  
⚪ Type/Say 👉 "Next" - after marking one or more Recommendations "[X] Accepted" in the file (and saving it)  
⚪ Type/Say 👉 "Accept All" - to accept all Recommendations with one option  
⚪ Type/Say 👉 "Accept" - to accept the Recommendation for the current finding  
⚪  

and when there are multiple options for the current finding:

🟩 The Findings and Recommendations are in <FEATURE_DIR>/clarify-findings.md  
🟩 Open Findings: N      Resolved Findings: M  
🟩  
🟩 Current finding: <FINDING_ID> · <CATEGORY> · <STATUS>  
🟩 Suggested Recommendation <SUGGESTED_RECOMMENDATION_LETTER>:  <RECOMMENDATION_SUMMARY>  
⚪  
⚪ Type/Say 👉 "Next" - after marking one or more Recommendations "[X] Accepted" in the file (and saving it)  
⚪ Type/Say 👉 "Accept All" - to accept all Recommendations with one option  
⚪ Type/Say 👉 "Accept X" - to accept Recommendation X where X is the option letter for the current finding  
⚪ Type/Say 👉 "Accept" - to accept the Recommendation (recommended) for the current finding  
⚪  

## Operating Constraints

- **Never overwrite an existing `clarify-findings.md`.** Capture mode renames it to a timestamped backup before writing a
  new one; otherwise only the changes listed under *Changes to an existing `REPORT`* are made.
- **Modify only the feature's own artifacts**: inside `FEATURE_DIR` only `spec.md`, `checklists/requirements.md` and
  `clarify-findings.md`, and outside it only the related artifacts, and only while resolving a finding. Never `plan.md` or
  `tasks.md` (clarification comes before planning), never another feature's documents, and never
  `.specify/memory/constitution.md`.
- **Only this skill resolves a finding.** The developer accepts recommendations; the skill applies them and writes the
  resolved lines.
- **Never invent findings.** Every finding traces to a Deferred or Outstanding row of the captured coverage summary, and
  every question to one the session asked.
- **One finding at a time, except where the developer has decided.** *Accept* acts on the first open finding unless the
  developer names a different ID ("accept D2"). *Accept all* is the one command that resolves findings the developer has
  not marked, and only those that offer a single recommendation.
- Keep CC CLI terminal output short and concrete: IDs, file paths with line references, and the exact wording being changed.
- A new git branch will not be created for this slash command.

## Examples

| Invocation / message | Effect |
|---|---|
| `/speckit-clarify-findings` (right after `/speckit-clarify`) | Creates `specs/20261016-172002-FAVICON/clarify-findings.md` with 4 questions and 2 open findings (D1, O1); shows D1. |
| `/speckit-clarify-findings` (file exists, a new session in chat) | Renames the file to `clarify-findings-20261020-141502-PM.md`, captures the new session, and shows its first open finding. |
| `/speckit-clarify-findings` (file exists, no new session) | Leaves the file as is; says no new clarification session was found; prompts the developer. |
| `/speckit-clarify-findings` (session had no Deferred or Outstanding categories) | Creates the file with the questions and no findings; reports all findings resolved and suggests `/speckit-plan`. |
| `Next` | Resolves each finding marked `[X] Accepted` (adding the Clarifications bullet and the section edit to `spec.md`, and the ✅ lines), then shows the next open finding. |
| `Accept` / `Accept B` | Applies the recommended (or chosen) recommendation of the next open finding, marks it `[X] Accepted`, adds the ✅ lines. |
| `Accept all` | Resolves every open finding with a single recommendation (or exactly one option marked), and lists the ones skipped because they offer options. |
