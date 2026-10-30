---
name: "speckit-analyze-findings"  
description: "Capture the most recent speckit-analyze Report into <feature_directory>/analyze-findings.md, one finding per section with its recommendation(s), then resolve the findings one at a time, or all at once after being reviewed in the report. The developer marks a recommendation [X] Accepted in the file and then will Type or Say 'Next', or the developer will Type or Say 'Accept', or the developer will Type or Say 'Accept all'; the skill applies it to spec.md/plan.md/tasks.md and marks the finding as resolved."
argument-hint: "no arguments"
compatibility: "Requires spec-kit project structure with .specify/ directory and a prior /speckit-analyze run"  
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebFetch, WebSearch, Skill
user-invocable: true  
disable-model-invocation: false
metadata:  
    - author: "David Brooks"  
---

# Skill Name / Purpose
This speckit-analyze-findings skill turns the **Specification Analysis Report** that `/speckit-analyze` prints to the CC CLI terminal
into a durable, checkable work list, and then helps the developer resolved the list of **findings** in the analysis report.  
A finding remains **open** as long as it has not be resolved.  

`/speckit-analyze` is strictly read-only: its report lives only in the conversation and is lost when the session ends or the
context is compacted. This skill:
1. **Captures** the most recent report into `analyze-findings.md`, next to the current feature's `spec.md`: with one section per
   finding, each with its recommendation(s) has a `➡️ [ ] **Accepted**` box.
2. **Answers three commands** about the findings list, for as long as findings remain open:
   - **"Next"** — resolves every open finding whose recommendation the developer has marked `[X] Accepted` in the file,
     then shows the first finding still open.
   - **"Accept"** — accepts the recommended recommendation of the next open finding, applies it to `spec.md` /
     `plan.md` / `tasks.md` (and to the feature's requirements, architecture and research documents where they
     must change too), and marks the finding resolved.
   - **"Accept all"** — does the same for every open finding that offers just one recommendation, in one pass, and reports the ones
     skipped because they have more than one recommendation.

Only this skill marks a finding resolved, because resolving it changes the feature's artifacts. The developer accepts a
recommendation (by marking it in the file, or by saying "Accept"); the skill does the rest.

The developer is expected to run `/speckit-analyze` again once every finding is resolved, to confirm that the
resolutions actually removed the finding rather than merely rewording it.

## Core Instructions

### User Input

The /speckit-analyze-findings command does not take any arguments (the raw text the user types after `/speckit-analyze-findings`).  

### Prerequisites (every mode)

1. Read `.specify/feature.json` at the project root and take its `feature_directory` field (a path relative to the project
   root, e.g. `specs/018-TAB-BAR`).
   - File or field missing → fail with: `ERROR: .specify/feature.json has no feature_directory. Run /speckit-specify first.`
2. Derive:
   - `FEATURE_DIR` = `<feature_directory>`
   - `SPEC` = `FEATURE_DIR/spec.md` (must exist; otherwise fail with `ERROR: <SPEC> not found.`)
   - `PLAN` = `FEATURE_DIR/plan.md`, `TASKS` = `FEATURE_DIR/tasks.md` (may be absent; resolutions that need them will say so)
   - `REPORT` = `FEATURE_DIR/analyze-findings.md`
   - **The feature's related artifacts**, written by the extension skills of this environment (they may be absent):
     - `REQUIREMENTS` = `requirements_path_and_filename` and `ARCHITECTURE` = `requirements_directory/architecture.md`,
       both from `.specify/requirements.json` (written by `/speckit-requirements`), **only when they belong to this feature**: the requirements
       document's first line (`Start a new spec for these requirements called `…``) names `FEATURE_DIR`'s folder,
       or the two folders' names start with the same feature number. Otherwise, or when the file or a key is
       missing, treat them as absent.
     - `RESEARCH_REQUIREMENTS` = `research/<FEATURE_FOLDER>/research-requirements.md` and `RESEARCH_RESULTS` =
       `research/<FEATURE_FOLDER>/research-research-results.md`, where `<FEATURE_FOLDER>` is the name of the folder
       that holds `REQUIREMENTS` (e.g. `20261016-172003-site-favicon`); each only when the file exists.
     - Together these four are the **related artifacts**; any that are absent are simply skipped.
3. For the three commands, `REPORT` must already exist.If it does not, fall through to **Capture mode** first (if a report
   is available in the conversation) and then answer the question; if no report is available either, fail with:
   `ERROR: <REPORT> not found and no Specification Analysis Report is in this conversation. Run /speckit-analyze first.`

Timestamps written to `REPORT` are local time in the form `YYYY-MM-DD HHMMSS XM`, obtained from the shell
(`date '+%Y-%m-%d %I%M%S %p'`), never guessed.

### Capturing the Report

**Locating the source report.** The source is the most recent `## Specification Analysis Report` that `/speckit-analyze`
printed **in this conversation** (or a report pasted into `$ARGUMENTS`, which takes precedence). Use the last one if several
exist. Take from it, verbatim where possible:

- every row of the findings table — ID, Category, Severity, Location(s), Summary, Recommendation;
- the **Coverage Summary** table;
- **Constitution Alignment Issues** and **Unmapped Tasks** (when present);
- **Metrics**;
- the **Next Actions** block;
- the overflow summary, if the report truncated at 50 findings.

Do not re-analyze the artifacts or invent findings the report did not contain. For each finding, read the cited
location(s) in `spec.md` / `plan.md` / `tasks.md` (and `.specify/memory/constitution.md` for a constitution finding) so its
recommendation(s) are grounded in the current text: the report's own recommendation is always one of them, written as the
report gave it; add further options only where another resolution is genuinely reasonable (for example: merge two
requirements *vs.* keep both and sharpen one; add a task *vs.* drop the requirement; change the artifact *vs.* leave it as
it is). If the report says there are zero findings,
still write the file (no findings, with the coverage table and metrics) so that *Next* can answer
"All findings resolved."

**When `REPORT` does not exist — create it** with exactly this layout:

```markdown
# Specification Analysis Report — <feature_directory>

## Record

| Record | Value |
|---|---|
| Feature directory | <feature_directory> |
| Report created | <timestamp> |
| Analysis captured | <timestamp of this capture> |
| Last updated | <timestamp> |

A finding is open until this skill marks it ✅ Resolved. To accept a recommendation, mark its box `[X] Accepted`, save
the file, and Type or Say "Next" — or Type or Say "Accept". Do not mark findings resolved yourself.
Findings are listed CRITICAL → HIGH → MEDIUM → LOW; within a severity, in the order the report gave them.
"Next" always returns the first open finding below.

## Findings

<one section per finding, in its initial form — see *Finding layout*>

## Coverage Summary

<the Coverage Summary table, verbatim>

## Constitution Alignment Issues

<verbatim, or "None reported.">

## Unmapped Tasks

<verbatim, or "None reported.">

## Metrics

<verbatim>

## Next Actions (as reported)

<verbatim>
```

Rules for the **Findings** section:

- One level-3 section per finding: its heading is `### ` followed by the report's stable ID in bold (`### **A1** · …`),
  so each finding stands out in the raw Markdown and in the preview. The ID is what the commands key on, so
  keep it exactly as the report printed it.
- Order by severity (CRITICAL, HIGH, MEDIUM, LOW), then by report order. This is what makes *Next* hand out the most
  important open finding first.
- Keep the summary and the report's recommendation as the report wrote them.
- A blank line between findings.

### Finding layout

Every finding goes through three forms. Every line ends with two spaces, the Markdown line break.

*Initial form* — as the finding is captured here is an example of how it should look:

```markdown
### **C1** · Constitution · CRITICAL · tasks.md Phase 6; constitution, Governance and Documentation Deliverables  

  The constitution says "every feature's task list MUST carry a post-implementation documentation phase" for `README.md` and `ARCHITECTURE.md`. `tasks.md` has none. Feature 032's T035/T036 show the expected form.  

  - **Recommendation A** _(recommended)_: Add a phase after T021: regenerate `README.md` and `ARCHITECTURE.md`.  

    ➡️ [ ] **Accepted** <span style="font-size:smaller ;padding-left:50px"><i>(you may mark <b>[X] Accepted</b> here, or Type/Say "<b>Accept</b>" in the CC CLI terminal)</i></span>  
    - <u>Pros</u>: Ensures that the documentation phase is properly added and tracked for the feature.  
    - <u>Cons</u>: Requires updating the documentation and integrating the new phase into the workflow.  

  - **Recommendation B**: do not add a documentation phase.  

    ➡️ [ ] **Accepted** <span style="font-size:smaller ;padding-left:50px"><i>(you may mark <b>[X] Accepted</b> here, or Type/Say "<b>Accept</b>" in the CC CLI terminal)</i></span>  
    - <u>Pros</u>: Avoids updating the documentation and integrating a new phase into the workflow.  
    - <u>Cons</u>: Violates the constitution's requirement for a post-implementation documentation phase.  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  
    - you may enter your own resolution here and check the box above when done  
    - then Type or Say "Next" in the CC CLI terminal to have it applied  
```

- The heading is a level-3 heading (`### `): the finding's ID in bold, then its Category, Severity and Location(s),
  separated by ` · `.
- The report's summary follows after a blank line, indented two spaces.
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
- There is **no** "Resolved" line or checkbox in the initial form.A finding is resolved only by this skill, because
  resolving it changes `spec.md`, `plan.md` or `tasks.md`, which the developer must not do by hand for a finding.

*Accepted form* — a recommendation has been accepted, by the developer in the file or by *Accept*, but the finding is
not yet resolved: that recommendation's `➡️ [ ] **Accepted**` becomes `➡️ [X] **Accepted**`, and nothing else changes.
The developer marks a recommendation this way in the file, saves the file, and then says "Next". To resolve a finding
their own way, the developer writes it under the finding's **Developer Resolution** and marks that.

*Resolved form* — written by this skill, and only by it, once the accepted recommendation has been applied:

```markdown
### **C1** · Constitution · CRITICAL · tasks.md Phase 6; constitution, Governance and Documentation Deliverables  
  <span style="font-size:large">✅ Resolved</span>  
  ✅ tasks.md README.md ARCHITECTURE.md Updated: 2026-10-16 9:50 PM  
  **Notes**: Recommendation accepted in file 2026-10-16: Recommendation A, added the documentation phase after T021.  

  The constitution says "every feature's task list MUST carry a post-implementation documentation phase" ...  

  - **Recommendation A** _(recommended)_: Add a phase after T021: regenerate `README.md` and `ARCHITECTURE.md`.  

    ➡️ [X] **Accepted**  
    - <u>Pros</u>: ...  

  - **Recommendation B**: do not add a documentation phase.  

    ➡️ [ ] **Accepted**  
    - <u>Pros</u>: ...  

  - **Developer Resolution C**:  

    ➡️ [ ] **Accepted**  
```

- Insert three lines directly under the finding's heading, indented two spaces like the rest of the finding:
  - `<span style="font-size:large">✅ Resolved</span>`;
  - `✅ <file> <file> … Updated: <date and time>`, naming every file the resolution changed, with the local time from
    the shell (`date '+%Y-%m-%d %-I:%M %p'`, e.g. `2026-10-16 9:50 PM`), never guessed. When the accepted
    recommendation needed no change to any file (for example "leave it as it is"), write
    `✅ Files Unchanged (no edit needed): <date and time>` instead;
  - `**Notes**:` how and when the recommendation was accepted (`Recommendation accepted in file <date>`, or
    `Recommendation accepted by "Accept" <date>`, or `… by "Accept all" <date>`), which recommendation, and what changed
    in which file, or that nothing needed to change.
- Remove the hint `<span>` from **every** `➡️ … **Accepted**` line of that finding, and the two instruction lines from
  its Developer Resolution (keeping any text the developer wrote there); the checkboxes stay as they are.
- **A finding is resolved only when it has all three:  
the `✅ Resolved` line,  
the `✅ … Updated` (or `✅ Files Unchanged`) line,  
and the `**Notes**:` line.**  
 
 A finding without the `✅ Resolved` line is open. The `Accepted`
  checkboxes never decide whether a finding is open.
- **A finding marked resolved by hand** has the `✅ Resolved` line but is missing the files line or the `**Notes**:`
  line: the developer marked it resolved without the artifacts being updated. It is treated as open, and *Next*
  repairs it (see "Next" in *Resolution of Findings*).

**When `REPORT` already exists and a report is being captured — back it up first.** In Capture mode, when there is a
source report to capture (see *Locating the source report*), check whether `REPORT` already exists before writing it.
If it does:

1. Rename it, in `FEATURE_DIR`, to `analyze-findings-<timestamp>.md`, where `<timestamp>` is the local time from the shell
   in the form `YYYYMMDD-HHMMSS-XM` (`date '+%Y%m%d-%H%M%S-%p'`, e.g. `analyze-findings-20261017-141502-PM.md`). The hour
   is on the 24-hour clock, so the backups sort by name in time order; `XM` is `AM` or `PM`. Its content is preserved
   exactly; the rename is the only change. If a file of that name already exists, wait a second and take a new
   timestamp.
2. Log `Backed up analyze-findings.md → analyze-findings-<timestamp>.md`.
3. Create a new `REPORT` from the source report, exactly as for a missing file above.

Take the lock on `analyze-findings.md` before the rename and hold it until the new file is written.

Capture mode backs up and recaptures **only when there is a report to capture that the file does not already hold**: a
report pasted into `$ARGUMENTS`, or a `/speckit-analyze` report printed in this conversation that has not already been
captured into `REPORT` in this conversation. With no such report, leave `REPORT` exactly as it is, say that no new
analysis was found, and prompt the developer (see *Prompting The Developer*).No other command renames or recreates `REPORT`.

**Changes to an existing `REPORT` while working through it.** Between captures the file is the developer's working record.
The only permitted changes are:

1. **The date/time records in the `## Record` section**: set `Last updated` to now on every write.
2. **Accepted boxes**: mark a recommendation `➡️ [X] **Accepted**` when *Accept* or *Accept all* accepts it. Never
   unmark one the developer marked.
3. **Resolving a finding**: turn it into its *Resolved form* (the three lines under its heading, and the hint
   `<span>` removed), or complete the lines a finding marked resolved by hand is missing.
4. **Reopening**: only when the developer asks ("reopen A3"), remove the finding's three resolved lines.

**After every capture (create or update)**, prompt the developer as described in *Prompting The Developer*.

### File lock while executing a command

The developers may edit `analyze-findings.md`, `spec.md`, `plan.md`, `tasks.md` and the related artifacts while this skill is in use, but
only while the skill holds no lock on the file, so the two never change a file at the same time. Every command
that may change any of them — Capture mode (creating or updating `REPORT`), *Next*, *Accept* (with or without
an option letter), *Accept all*, and any of these aimed at a finding by ID — runs under a lock on **each file it
changes**. A bare option letter, which never writes a file, takes none.

- **Before the first change to a file** while executing the command, create its sibling lock file — the file's
  own name plus `.lock`, in the file's own directory (`analyze-findings.md.lock`, `spec.md.lock`, `plan.md.lock`,
  `tasks.md.lock`, `requirements.md.lock`, `architecture.md.lock`, …)— containing the command being executed (as typed, with the finding ID it acts on) and the
  time it started. While it exists, the developers will not save that file; anyone with unsaved edits saves them
  before typing the command, or waits for the lock to go.
- **Make the locked file read-only.** Editors do not know about the `.lock` file, so the lock is also enforced:
  right after creating the `.lock` file, make the file read-only (`chmod a-w <file>`; in Git Bash on Windows this
  sets the read-only attribute, as `attrib +R <file>` does). VS Code then refuses to save it and offers Retry.
  Immediately before each of the skill's own writes, make it writable (`chmod u+w <file>`), write, and make it
  read-only again. In Capture mode, make `analyze-findings.md` writable before renaming it to its backup; the backup
  is left writable, and the new `analyze-findings.md` is made read-only once written.
- **Lock commands use literal paths, never shell variables or loops.** Write every command that creates,
  removes or changes the attribute of a lock or a locked file with the file's full path spelled out, one command
  per file, e.g. `rm -f -- "<dir>/<file>.lock"` with the real directory and file name in place of the
  placeholders; never `rm $d/$f.lock`, `for f in …; do rm …; done`, or any `rm` built from a variable. Claude Code
  stops a `rm` on a possibly-empty variable path for approval, and in an unattended session the request is denied,
  leaving the lock behind. The same goes for `chmod`, `attrib` and `sha256sum`.
- **While locked**:
  - re-read the part of the file you are about to change immediately before each change;
  - change it only with targeted edits, never by rewriting the whole file (writing a new `analyze-findings.md` in
    Capture mode is the one exception, since there is nothing to rewrite);
  - if an edit fails because the file changed on disk, re-read it, keep the developers' change, and redo your
    edit on top of it.
- **Tell the skill's own writes from anyone else's by content, never by tool warnings.**
  - Right after each of its own writes, record the file's SHA-256 (`sha256sum <file>`).
  - Before its next write, compute it again. Report "changed by someone else" only when it differs from the
    recorded value, and then show what changed.
  - An editing tool's warning that the file was "modified on disk since you last read it" is **not** evidence of
    another writer: it also appears after the skill's own shell writes. Re-read the file and carry on, without
    reporting it as an outside change.
- **When the command is finished, or abandoned because of an error**, on every exit path: make each locked file
  writable again (`chmod u+w <file>`), delete every lock file it created, record each changed file's final SHA-256
  in `.specify/analyze-findings.json` under `last_written` (a map from project-root-relative path to hash; create
  the file if it is absent, and change no other key in it), and log `Lock released <time>` to the CC CLI terminal,
  followed by:
  `If you had unsaved edits to <file> open in an editor, reload it before saving (VS Code: "Revert File", or accept the "file is newer" comparison in the CC CLI terminal), or the older copy will overwrite these changes.`
- **At the start of every command**, before anything else, compare each file it may change with its
  `last_written` hash (skip the check when there is none):
  - a change the developer is expected to make is accepted as usual: in `analyze-findings.md`, ticking or
    unticking `[ ] Accepted`, or writing their own resolution under a **Developer Resolution**;in `spec.md`, `plan.md`, `tasks.md`
    and the related artifacts, the developer's own edits, as long as they keep what this skill wrote there;
  - a change that removes or alters the skill's own text is reported, with what was lost, before anything else is
    done: in `analyze-findings.md`, a `✅ Resolved`, `✅ … Updated` / `✅ Files Unchanged` or `**Notes**:` line, a
    finding, or a captured section; in `spec.md`, `plan.md`, `tasks.md` and the related artifacts, an edit a resolved finding's
    `**Notes**:` says this skill made. That is what a stale editor tab saving over the file looks like. Ask the
    developers whether to restore the lost text (from the skill's own record of what it wrote, or from git) or
    keep the file as it is; change nothing until they answer.
- **If a lock file is already present when a command starts**, or a file the skill locks is still read-only with
  no lock file beside it, log what was found and ask the developers whether it is stale before continuing; do not
  delete it, change the attribute, or touch the locked file until they answer.

## Resolution of Findings
After generating the analyze report document, and using Claude Code,  
respond to the following three commands. All of them are matched **case-insensitively**, ignoring
surrounding punctuation and trailing periods.

**Resolving a finding** (used by all three commands) means, for the open finding and its one accepted
recommendation: revise the artifact(s) it points at (`spec.md`, `plan.md` or `tasks.md` in `FEATURE_DIR`) to
reflect it, as described below; then turn the finding into its *Resolved form* (see *Finding layout*): mark that
recommendation  
➡️ [X] **Accepted**  
if it is not already, insert the `✅ Resolved` line, the `✅ <files> Updated` (or `✅ Files Unchanged`) line and the
`**Notes**:` line under the finding's heading (completing any of them a hand-marked finding is missing, and
never duplicating one already there), remove the hint `<span>` from every `Accepted` line of the finding, and
update `Last updated`; then log the finding's ID and a one-line summary of the change made to the artifacts (or
that none was needed). Only this skill ever resolves a finding.

- **Revising the artifacts**: surgical edits only. Change only the lines the finding points at, keep the
  surrounding structure, headings, IDs (`FR-###`, `SC-###`, `T###`) and numbering intact, and preserve the file's
  existing wording style. Adding a task means a new task line in the correct phase with the next free `T###` id
  and the `[P]` marker only if it is genuinely parallel. Never edit `.specify/memory/constitution.md`; a
  constitution conflict is resolved by changing the spec, plan or tasks.
- **Keeping the related artifacts consistent.** After revising `spec.md`, `plan.md` or `tasks.md`, check each related
  artifact (`REQUIREMENTS`, `ARCHITECTURE`, `RESEARCH_REQUIREMENTS`, `RESEARCH_RESULTS`) for statements the change
  makes untrue — a requirement whose meaning changed, a component, flow or diagram label the plan no longer has, a
  research conclusion the decision now contradicts — and revise them the same surgical way so every artifact agrees.
  Change only the affected text: never a document's first line, a finding, its `➡️ … Accepted` lines, `✅` lines or
  `**Notes**:`, or a report section. When a related artifact needs no change, leave it alone. A finding that points
  directly at a related artifact is resolved there in the same way.
- List **every** file the resolution changed, related artifacts included, in the finding's `✅ <files> Updated` line
  and its `**Notes**:` line, and in the console log.
- If a required artifact is missing (e.g. the finding needs `tasks.md` and it does not exist), do not resolve the
  finding; say which `/speckit-*` command produces the missing file.

**Moving on automatically.** Two events run "Next" on their own, exactly as if the developer had typed it,
so the developer always sees the next open finding without asking:
- **Findings added**: when Capture mode writes a new `analyze-findings.md`, finish the capture and then run "Next";
- **A finding resolved**: when "Accept" resolves a finding, run "Next". "Accept all" runs "Next" once,
  after its report.

"Next" never chooses a recommendation itself; it resolves only what the developer has marked
`[X] Accepted`. When nothing was resolved ("Accept all" accepted nothing), do not move on.

   1. "Next", "Whats next" or "What's next":
      - **First, sweep every open finding in the report**, in file order (an open finding is one not fully
        resolved, see *Finding layout*; this includes one marked resolved by hand). For each:
        - **Exactly one recommendation marked `[X] Accepted`** (by the developer in the file, then saved) →
          resolve the finding with it (see *Resolving a finding*): this updates the artifacts, adds the
          `✅ Resolved` line, the `✅ <files> Updated` line (or `✅ Files Unchanged` when no edit was needed) and
          the `**Notes**:` line, and removes the hint text.
        - **More than one recommendation marked** → resolve nothing for it; remember it for the report below.
        - **No recommendation marked** → leave it as it is.
        - **Marked resolved by hand** (`✅ Resolved` present, but the files line or `**Notes**:` missing) →
          log: `Finding <ID> was marked ✅ Resolved by hand, but its files were not updated. Please do not
          mark findings resolved yourself: mark a recommendation [X] Accepted, save the file, and Type or Say
          "Next".` Then, if exactly one of its recommendations is marked, resolve it as above, which completes
          the missing lines; otherwise remove the hand-written `✅ Resolved` line, so the finding is plainly
          open again.
      - **A marked Developer Resolution** is resolved like any other recommendation, using the text the developer
        wrote under it. If it is marked but holds only the two instruction lines, resolve nothing for it: report it
        and ask the developer to write their resolution under it.
      - **Then report the sweep**: one line per finding resolved (its ID, and what changed in which file), one
        line per finding with more than one recommendation marked (asking the developer to leave exactly one
        marked), and the updated counts (open and resolved).
      - **Then proceed as if the developer had typed "Next" again**: take the first finding still open, read its
        cited location(s) so the context is current, and show it and its recommendation(s), with a brief
        explanation of the pros and cons of each option when there are several, and let the developer choose
        (see *Prompting The Developer*). The second pass finds nothing marked to resolve, so it only shows.

      - If there are no open findings, respond with:
 ```
⚪  
⚪ All findings have been resolved:  
⚪ ✅ Inconsistencies ✅ Ambiguities ✅ Underspecification ✅ Duplication ✅ Coverage ✅ Constitution  
⚪  
⚪  Run /speckit-analyze again to confirm that each resolution removed its finding, then /speckit-implement.  
⚪  
🟩 At the prompt, Type:  
🟩 👉 /speckit-analyze  
⚪  
  ```

   2. "Accept", or "Accept X" where X is an option letter:
      - Accept, for the first open finding (or the finding named by ID), the recommendation named: `Accept X`
        takes option X; a plain `Accept` takes the single **Recommendation**, or the option marked
        `_(recommended)_` when there are several. If the developer has already marked exactly one
        recommendation `[X] Accepted`, a plain `Accept` takes that one. `Accept X` naming the **Developer
        Resolution** takes it only when the developer has written a resolution under it; otherwise say so and change
        nothing.
      - Resolve the finding with it (see *Resolving a finding*), give a brief explanation of the
        recommendation, then run "Next" (see *Moving on automatically*).

   3. "Accept all":
      - The developer has read every proposed recommendation and wants them applied in one pass. Work
      through **every** open finding, in file order, and resolve each one exactly as "Accept" would,
      with one exception:

         - **A finding that offers more than one option is skipped**, unless the developer has marked
         exactly one of its options `[X] Accepted` (then that option is used). Leave a skipped finding as it
         is, change no artifact for it, and carry on with the next finding.
         - A finding with a single recommendation (no alternatives to choose between) is resolved with it.

      - When the pass is finished, report, in this order:
         1. the findings resolved, two lines each: line one with the finding's ID, Category and Severity, line
         two with the recommendation letter (if more than one recommendation) and a one-line summary of the
         accepted recommendation;
         2. the counts: resolved, and how many findings remain open.

      - If every open finding offers options with none marked, accept nothing and say so plainly; if none
      do, the pass resolves them all and the feature is ready for the next phase.
      - When at least one finding was resolved, run "Next" after the report; it shows the first finding
      still open (one that offers options) or the all-resolved message.
      - The rules of "Accept" hold throughout: surgical edits to `analyze-findings.md`, `spec.md`, `plan.md` and
      `tasks.md` in `FEATURE_DIR` and to the related artifacts, and no edit to any other file.


## Prompting The Developer

After capturing the report, and at the end of every command (Next, Accept, Accept X, Accept all)  
the user will be prompted as described below.  

When none of the open findings have options:
🟩 The Findings and Recommendations are in <FEATURE_DIR>/analyze-findings.md  
🟩 Open Findings: N      Resolved Findings: M  
🟩  
🟩 Current finding: <FINDING_ID> · <CATEGORY> · <SEVERITY>  
🟩 Recommendation: <RECOMMENDATION_SUMMARY>
⚪  
⚪ Type/Say 👉 "Next" - after marking one or more Recommendations "[X] Accepted" in the file (and saving it)  
⚪ Type/Say 👉 "Accept All" - to accept all Recommendations  
⚪ Type/Say 👉 "Accept" - accept the Recommendation for the current finding  
⚪  
  
and when there is at least one open finding with options, and just one option for the current finding:  
  
🟩 The Findings and Recommendations are in <FEATURE_DIR>/analyze-findings.md  
🟩 Open Findings: N      Resolved Findings: M  
🟩  
🟩 Current finding: <FINDING_ID> · <CATEGORY> · <SEVERITY>  
🟩 Recommendation: <RECOMMENDATION_SUMMARY>
⚪  
⚪ Type/Say 👉 "Next" - after marking one or more Recommendations "[X] Accepted" in the file (and saving it)  
⚪ Type/Say 👉 "Accept All" - to accept all Recommendations with one option  
⚪ Type/Say 👉 "Accept" - to accept the Recommendation for the current finding  
⚪  
  
and when there are multiple options for the current finding:  
  
🟩 The Findings and Recommendations are in <FEATURE_DIR>/analyze-findings.md  
🟩 Open Findings: N      Resolved Findings: M  
🟩
🟩 Current finding: <FINDING_ID> · <CATEGORY> · <SEVERITY>  
🟩 Suggested Recommendation <SUGGESTED_RECOMMENDATION_LETTER>:  <RECOMMENDATION_SUMMARY>
⚪  
⚪ Type/Say 👉 "Next" - after marking one or more Recommendations "[X] Accepted" in the file (and saving it)  
⚪ Type/Say 👉 "Accept All" - to accept all Recommendations with one option  
⚪ Type/Say 👉 "Accept X" - to accept Recommendation X where X is the option letter for the current finding  
⚪ Type/Say 👉 "Accept" - to accept the Recommendation (recommended) for the current finding  
⚪  


## Operating Constraints

- **Never overwrite an existing `analyze-findings.md`.** Capture mode renames it to a timestamped backup before writing a
  new one; otherwise only the changes listed under *Changes to an existing `REPORT`* are made.
- **Modify only the feature's own artifacts**: inside `FEATURE_DIR` only `spec.md`, `plan.md`, `tasks.md` and
  `analyze-findings.md`, and outside it only the related artifacts, and only while resolving a finding (see *Resolving
  a finding*). Never another feature's documents; past features are never changed retroactively.
- **Only this skill resolves a finding.** The developer accepts recommendations; the skill applies them and writes the
  resolved lines.
- **Write `analyze-findings.md`, `spec.md`, `plan.md`, `tasks.md` and the related artifacts only under their locks**(see *File lock while
  executing a command*), with targeted edits, and always release every lock, on success or on error.
- **Never invent findings.** Every finding traces to a row of the captured report.
- **One finding at a time, except where the developer has decided.** *Accept* acts on the first open finding unless
  the developer names a different ID ("accept A4"). *Next* resolves only the findings the developer has marked
  `[X] Accepted`. *Accept all* is the one command that resolves findings the developer has not marked, and even then
  only those that offer a single recommendation.
- Keep CC CLI terminal output short and concrete: IDs, file paths with line references, and the exact wording being changed.
- A new git branch will not be created for this slash command.  

## Examples

| Invocation / message | Effect |
|---|---|
| `/speckit-analyze-findings` (right after `/speckit-analyze`) | Creates `specs/018-TAB-BAR/analyze-findings.md` with 7 open findings; prompts the developer. |
| `/speckit-analyze-findings` (file exists, new report in chat) | Renames the file to `analyze-findings-20261017-141502-PM.md`, creates a new `analyze-findings.md` from the new report, and prompts the developer. |
| `/speckit-analyze-findings` (file exists, no new report) | Leaves the file as is; says no new analysis was found; prompts the developer. |
| `Next` | Resolves each finding marked `[X] Accepted` in the file (editing `spec.md` / `plan.md` / `tasks.md` and adding the ✅ lines), then shows the next open finding, e.g. `C1 · Coverage · CRITICAL · FR-004` with its Options A/B. |
| `Accept` / `Accept B` | Applies the recommended (or chosen) recommendation of the next open finding, marks it `[X] Accepted`, adds the ✅ lines. |
| `Accept all` | Resolves every open finding with a single recommendation (or exactly one option marked), and lists the ones skipped because they offer options. |
| `Next` (nothing open) |`All findings resolved.` plus the reminder to re-run `/speckit-analyze`. |
