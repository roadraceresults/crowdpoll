---
name: "speckit-tweak"  
description: "Methodically request tweaks to the implementation resulting from the most recent speckit-implement run. Reads <feature_directory>/tweaks.md (or a tweak file named on the command line), creating it if absent, then walks the TWEAK### items one at a time: 'Next' shows the next open tweak and a recommendation, 'Accept' implements it (code, tests, feature artifacts) and checks it off, 'I resolved it' records a tweak the developer made by hand."  
argument-hint: "[<tweaks-file.md> | <path/to/tweaks-file.md>] [Next | Accept [option] | I resolved it | TWEAK###]"  
compatibility: "Requires spec-kit project structure with .specify/ directory and a feature_directory recorded in .specify/feature.json"  
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebFetch, WebSearch, Skill
user-invocable: true  
disable-model-invocation: false
metadata:  
    - author: "David Brooks"  
---

# Skill Name / Purpose

This speckit-tweak skill lets the developer burn down a list of **implementation tweaks** — the small
corrections, adjustments and follow-ups that surface once `/speckit-implement` has delivered a feature and
the developer has used it — one tweak at a time, with the AI doing the work and recording what it did.

The list lives in a Markdown **tweak file**, by default `tweaks.md` in the current feature's directory. The
developer writes the tweaks into it as numbered `## TWEAK###` sections, each with an empty checkbox. This
skill:

1. **Locates or creates** the tweak file (see *Locating the tweak file*).
2. **Answers three questions** about it, for as long as open tweaks remain:
   - **"Next"** — show the next open tweak and a recommendation (with options when there are
     several).
   - **"Accept"** — implement the recommendation (or chosen recommendation) in the code, update the tests,
     run them only when the tweak's `Run Tests` box is ticked (empty, the default, postpones the run), bring the feature's artifacts
     (`spec.md`, `plan.md`, `tasks.md`, contracts, quickstart) into line, record the resolution in the tweak
     file and check the tweak off with `[X]`.
   - **"I resolved it"** — the developer resolved it by hand; detect what changed, verify it, record it, and mark
     the tweak `[-]` Resolved (manually).

The assumption is that the developer has already run `/speckit-specify` — and more usefully
`/speckit-implement` — so that `.specify/feature.json` names the feature being tweaked.

## Core Instructions

### User Input

```text
$ARGUMENTS
```

`$ARGUMENTS` is optional. It is the raw text the user typed after `/speckit-tweak`. Tokenize it on whitespace,
honoring quotes (`"..."` or `'...'`) so a path containing spaces stays one token, then interpret it in this
order:

1. **Tweaks-file argument.** If any token ends in `.md` (case-insensitive) it names the tweak file, and is removed
   from the token list:
   - a token containing a path separator (`/` or `\`) is a **path with a filename** — use that file in that
     directory (relative paths are resolved from the project root);
   - a token with no separator is **just a filename** — use that file inside the feature directory.
   At most one such token is allowed; two or more → fail with
   `ERROR: More than one tweak file given: <a>, <b>. Usage: /speckit-tweak [<tweaks-file.md>] [Next | Accept [option] | I resolved it | TWEAK###]`.
2. **The remaining text** (match case-insensitively; ignore surrounding punctuation, apostrophes and trailing
   periods) is one of:

   | Remaining text | Meaning |
   |---|---|
   | *(empty)* | **Status mode** — locate or create the tweak file and print the status summary; when the file already existed, go on to *Next* (see *Creating the tweak file*). |
   | `Next` | **Question 1** — show the next open tweak. |
   | `Accept` — optionally followed by an option label, e.g. `Accept B` | **Question 2** — accept the resolution to the next open tweak. |
   | `I resolved it`, `We resolved it` | **Question 3** — the developer resolved the next open tweak by hand. |
   | `Accept as-is` | **Question 3 variant** — the developer consciously leaves the implementation alone (see Question 3). |
   | `TWEAK###` (e.g. `TWEAK007`, `tweak7`) | **Jump** — act on that tweak instead of the first open one, for whichever question follows it or, alone, as *Next* for that tweak. |
   | Anything else | Fail with: `ERROR: Unrecognized argument(s): <text>. Usage: /speckit-tweak [<tweaks-file.md>] [Next | Accept [option] | I resolved it | TWEAK###]` |

**Follow-up turns.** Once this skill has run in a conversation, the same phrases typed as plain chat messages
— "Next", "Accept", "I resolved it", "TWEAK###" and the synonyms above — are answered exactly as if
they had been passed as `$ARGUMENTS`, against the same tweak file. A bare option label ("B", "option 2", "the
second one") given right after a *Next* answer that offered options records the developer's choice
for the following *Tweak*.

Assume the parsed command is available in this conversation even if `$ARGUMENTS` appears literally above.
Do not ask the user to repeat the input.

### Locating the tweak file

1. Read `.specify/feature.json` at the project root and take its `feature_directory` field (a path relative
   to the project root, e.g. `specs/018-TAB-BAR`).
   - File or field missing → fail with:
     `ERROR: .specify/feature.json has no feature_directory. Run /speckit-specify (and normally /speckit-implement) first.`
2. Set two variables and keep them for the whole conversation:
   - **`tweaks_file_name`** — the tweak file's name: the filename from the argument, or `tweaks.md` by default.
   - **`tweaks_file_directory`** — the directory containing the tweak file: the directory from a path argument, or
     `feature_directory` otherwise. In the usual case this *is* the feature directory — the working directory
     of the feature being tweaked.
   - `TWEAKS_FILE` = `tweaks_file_directory/tweaks_file_name`.
3. Also derive, for the artifacts a resolution may need to update: `SPEC` = `feature_directory/spec.md`,
   `PLAN` = `feature_directory/plan.md`, `TASKS` = `feature_directory/tasks.md`, plus `contracts/` and
   `quickstart.md` under `feature_directory` when they exist. These always come from `feature_directory`,
   even when the tweak file was pointed elsewhere.

Timestamps written to the tweak file are local time in the form `YYYY-MM-DD HH:MM`, obtained from the shell
(`date '+%Y-%m-%d %H:%M'`), never guessed.

### Creating the tweak file

**If `TWEAKS_FILE` does not exist**, create it (creating `tweaks_file_directory` if needed) with exactly this
content, substituting the two variables and the timestamp. Each of the four `TWEAK01` lines (the heading,
`[ ] Resolved`, `[ ] Run Tests` and `tweak requirements...`) ends with **two spaces**, a Markdown line break,
so each renders on its own line; keep them when writing the file:

```markdown
# Overview: `tweaks_file_directory`

## Document History

| Record | Value |
|---|---|
| Feature directory | `tweaks_file_directory` |
| Tweak file created | YYYY-MM-DD HH:MM |
| Last updated | YYYY-MM-DD HH:MM |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  


```

Then tell the developer the file was created and where, and that the placeholder `TWEAK01` is theirs to
replace. A freshly created file has no real tweak to act on: answer any question asked in the same invocation
with the *All tweaks resolved* message below.

**If `TWEAKS_FILE` already exists — never overwrite it.** On the skill's first run in a conversation, log to the
-console `<tweaks_file_name> already exists in <tweaks_file_directory> — it will not be overwritten.`, print the
status summary, and then, when no question was given with the command, run *Next* (Question 1)
automatically, exactly as if the developer had typed it, so the first open tweak is shown. It is the
developer's working record. The only permitted changes are:

status summary, and then, when no question was given with the command, run *Next* (Question 1)
automatically, exactly as if the developer had typed it, so the first open tweak is shown. It is the
developer's working record. The only permitted changes are:

1. the date/time records in the `## Record` section (`Last updated` on every write; the section is added,
   unchanged otherwise, if an older file lacks it);
2. a tweak's **resolution** checkbox — `[ ]` → `[X]` or `[-]` when the developer has indicated, through
   Question 2 or 3 or by naming the tweak, that it is resolved or consciously accepted. Never uncheck a tweak on
   your own initiative; only the developer can reopen one ("reopen TWEAK003" → `[ ]`). The **`Run Tests`**
   checkbox is the developer's alone: never tick, untick or add it. When the checkbox is set to `[-]`, the
   line also says how: `[-] Resolved (manually)` for *I resolved it*, `[-] Resolved (accepted as-is)` for *Accept
   as-is*;
3. a **`### RECOMMENDATION`** subsection appended at the end of a tweak's section whenever a
   recommendation (or a set of options) for it is logged to the console (see Question 1);
4. a **`### ACCEPTED RECOMMENDATION`** subsection appended at the end of a tweak's section when Question 2 or 3 resolves it
   (see below);
5. a tweak's **heading**, only to fill in a missing number or title (see *Completing a tweak's heading*);
6. a **new-tweak template** appended at the end of the file after a tweak is resolved (see *Appending the next
   tweak's template*). Nothing else in the tweak's text is edited — the developer's requirement stays as written.

### The tweak format

A tweak is a level-2 section whose heading starts with `TWEAK`, normally followed by digits and then a title
(a bare `## TWEAK`, or one without a title, is completed by the skill — see *Completing a tweak's heading*):

```markdown
## TWEAK007 Bookmark star is clipped on narrow cards
[ ] Resolved
[ ] Run Tests
<the developer's requirement — any Markdown, any length>

### CLARIFICATIONS
<optional: questions the AI raised, and the developer's answers>

### RECOMMENDATION
<written by this skill each time "Next" recommends a resolution>

### ACCEPTED RECOMMENDATION
<written by this skill when the tweak is resolved>
```

Rules for reading it:

- The **resolution checkbox line** is the first line after the heading that matches `[ ]`, `[X]`, `[x]` or
  `[-]` and is **not** the `Run Tests` line, optionally followed by a word such as `Resolved`. 
- The **`Run Tests` line** is any line of the tweak's section that *starts* with a checkbox followed by the
  words `Run Tests` — matched case-insensitively, singular or plural, so `[ ] Run Tests`, `[x] run tests` and
  `[X] run test` are all the same line. It is conventionally written directly under the resolution checkbox,
  but may sit anywhere in the tweak's section.
  - **Empty (`[ ]`), or the line absent altogether** — the default: this **tweak's automated test run is
    postponed**. Implement the tweak and write its tests exactly as when the box is ticked; but do
    **not** run any test suite for it, and do not hold the tweak open for want of a passing run. The developer
    batches several such tweaks and runs the suite once, because a five-minute run for a one-line UI tweak is
    not worth it per tweak.
  - **Ticked** — any character other than a space between the brackets (`[x]`, `[X]`, `[-]`, `[✓]`) — tests
    are written and run for this tweak exactly as described under Question 2 and Question 3.
  - **An older file's `No Tests` line** (a checkbox followed by `No Tests`, read the same way) keeps its old
    meaning, the inverse: empty means run the tests, ticked means postpone them. It is honored only when the
    tweak has no `Run Tests` line.
- TWEAK numbers may have any number of digits (`TWEAK1`, `TWEAK01`, `TWEAK007`); match on the digits' value, and keep
  the developer's spelling when writing the id back.
- **Completing a tweak's heading.** When the tweak to act on is found — its `[ ] Resolved` line read — and before
  any recommendation is logged or appended, check its heading and fill in what the developer left out:
  - **No number** (`## TWEAK`, `## TWEAK <title>`), or **a number not incremented** (the same value as an
    earlier tweak in the file): give it the previous tweak's number plus one — `TWEAK01` for the first tweak in the
    file — padded to the same number of digits as the tweak before it (`TWEAK06` → `TWEAK07`, `TWEAK007` →
    `TWEAK008`). If that value is already taken further down the file, take the next free one; never renumber
    any other tweak.
  - **No title**, or the template's `<short title here>`: write a short title of a few words, in Title Case
    like the file's other titles, that names what the requirement asks for.
  - Rewrite only the heading line, under the file lock, and log the change to the console, e.g.
    `Heading completed: "## TWEAK" → "## TWEAK08 Poll Card Title Wraps"`. Use the completed id and title in
    everything that follows.
- Tweaks are taken **in file order**, not by number. "The next open tweak" is the first tweak, reading top to
  bottom, whose **resolution** checkbox is `[ ]`; the `Run Tests` box never decides whether a tweak is open.
  An **untouched template** — a tweak whose title is still `<short title here>` and whose requirement is still
  just `tweak requirements...` — is not an open tweak: it is skipped, not counted in the status summary, and its
  heading is never completed. Once the developer writes a requirement into it, it is a tweak like any other.

.claude/skills/speckit-tweak/SKILL.md:218
  bottom, whose **resolution** checkbox is `[ ] Resolved`; the `Run Tests` box never decides whether a tweak is open.
  appended — by *Accept*, *I resolved it* or *Accept as-is* — and when that tweak is the last tweak in the
  file and no untouched template already follows it, append a blank line and this template at the end of
  the file, under the file lock, each line ending with two spaces:

  ```markdown
  ## TWEAKnn <short title here>  
  [ ] Resolved  
  [ ] Run Tests  
  tweak requirements...  
  ```

  `TWEAKnn` is the resolved tweak's number plus one, padded to the same number of digits (`TWEAK07` → `TWEAK08`).
  Log `Template added: TWEAKnn` to the console. When later tweaks already exist, add nothing — the template
  belongs only after the last tweak.
- A tweak section may carry a `### CLARIFICATIONS` subsection. If a tweak's requirement is too ambiguous to
  resolve, *Next* asks the questions there (see Question 1) rather than guessing.
- Text outside `## TWEAK` sections (the Overview, the Record, notes, a `# USAGE` section) is left alone.

### File lock while executing a question

The developers keep editing `TWEAKS_FILE` while this skill works, so every question that may change it — *next*, *accept* (with or without an option label), *I resolved it*, *Accept as-is* and a `TWEAK###` jump to
any of them — runs under a lock. Status mode and a bare option label, which never write the file, take none; the *Next* that follows
Status mode on an existing file takes its own.

- **Before the first change to `TWEAKS_FILE`** while executing the question, create the sibling file
  `<tweaks_file_name>.lock` (e.g. `tweaks.md.lock`) in `tweaks_file_directory`, containing the question being executed
  (as typed, with the tweak id it acts on) and the time it started. While it exists, the developers will not
  save `TWEAKS_FILE`; anyone with unsaved edits saves them before typing the question, or waits for the lock to
  go.
- **Lock commands use literal paths, never shell variables or loops.** Write every command that creates,
  removes or changes the attribute of a lock or a locked file with the file's full path spelled out, one command
  per file, e.g. `rm -f -- "<dir>/<file>.lock"` with the real directory and file name in place of the
  placeholders; never `rm $d/$f.lock`, `for f in …; do rm …; done`, or any `rm` built from a variable. Claude Code
  stops a `rm` on a possibly-empty variable path for approval, and in an unattended session the request is denied,
  leaving the lock behind. The same goes for `chmod`, `attrib` and `sha256sum`.
- **While locked**:
  - re-read the part of `TWEAKS_FILE` you are about to change immediately before each change;
  - change it only with targeted edits, never by rewriting the whole file;
  - if an edit fails because the file changed on disk, re-read it, keep the developers' change, and redo
    your edit on top of it.
- **When the question is finished, or abandoned because of an error**, delete `<tweaks_file_name>.lock` and log
  `Lock released` to the console.
- **If a lock file is already present when a question starts**, log its contents and ask the developers
  whether it is stale before continuing; do not delete it or touch `TWEAKS_FILE` until they answer.

### Writing text into the tweak file

Everything this skill writes into `TWEAKS_FILE` — `### CLARIFICATIONS` questions, `### RECOMMENDATION`
and `### RECOMMENDATION`
and `### ACCEPTED RECOMMENDATION` subsections — is laid out for reading in the raw file as well as rendered:
- **Break the line after each sentence-ending period (`.`) and after each semicolon (`;`)**, and end every
  such line with **two spaces**, the Markdown line break, so each renders on its own line. A period that does
  not end a sentence — in a file name (`spec.md`), a number (`1.5`), an abbreviation (`e.g.`) or anything in
  backticks — is not a break.
- **Use list items and indentation** where they help: one item per file, test, option or artifact, with
  continuation lines and sub-points indented under their item; a list item may still hold several
  sentences, each broken as above.
- **Never break inside** a code span, a fenced code block or a table row, and leave a blank line between
  paragraphs, lists and subsections.
- These rules apply only to the text this skill writes; the developer's own text is never reflowed.

### Status summary

After locating or creating the file — and at the end of every question — print:

```
<tweaks_file_name> — <tweaks_file_directory>
  Open [ ]: 3   Applied [X]: 5   Manual [-]: 1
Next open tweak: TWEAK009 — <title, or the first line of the requirement>   [tests postponed]
Type or Say: "I resolved it" if you made the tweak yourself
Type or Say: "Next" to generate a recommendation for the tweak
Type or Say: "Tweak" to have it implemented
```

**Prompt lines.** Every line that asks the developer to type or say something next — the last line of the
status summary (three lines, one per command), the options prompt, and the `Remaining open tweaks … to continue` line — starts with
`Type or Say`, never `Type`, `Say` or `Choose`. Print the prompt lines together, after the log (even where a log
template in this file shows one inside it), in their own `diff` code block with each line starting with `+ `,
so the console's syntax highlighting shows them in green:

````
```diff
 Type or Say: "I resolved it" if you made the tweak yourself
 Type or Say: "Next" to generate a recommendation for the tweak
+ Type or Say: "Tweak" to have it implemented
```
````

The exact green comes from the console's theme; Markdown cannot set a background color, and bold does not
render inside a code block, so the lines are plain text.

### Question 1 — "Next" 

The tweak to show is **the first `## TWEAK###` section in `TWEAKS_FILE` whose checkbox is `[ ]`** (or the tweak named
with a `TWEAK###` jump).

- If there is no such tweak, respond with exactly:
  **All tweaks resolved. Add TWEAK### to `tweaks_file_directory`/`tweaks_file_name` if there are more tweaks.**
- Otherwise, first **complete the tweak's heading** if its number or title is missing (see *Completing a tweak's
  heading*); then, before recommending anything, **ground the recommendation**: read the tweak's requirement in full,
  the code it points at (search the repository for the files, selectors, routes or strings it names), the
  relevant tests, and the feature artifacts (`spec.md`, `plan.md`, `tasks.md`, contracts) so the resolution is
  consistent with what was specified — and so a tweak that *changes* a requirement is recognized as such. Then
  log to the console:

```
Next tweak: TWEAK### · <title>
  <the requirement, as written — quoted or summarized in one to three lines>   [tests postponed]

Recommendation:
  <what you would change, in which file(s), with the concrete edit, the tests you would add or update,
   and any artifact (spec/plan/tasks/contract/quickstart) that must change to stay true — specific enough
   that "Tweak" needs no further decisions>
```

Append `[tests postponed]` to the requirement line only when that tweak's `Run Tests` box is empty (or absent), and say in
the recommendation which tests you would write but not run. The recommendation always names the tests to add
or update, whatever the `Run Tests` box says.

- When more than one reasonable resolution exists (for example: change the behavior *vs.* change the wording;
  tweak in the client *vs.* in the server; a quick local patch *vs.* the change the spec implies), list them as
  **Option A / B / C**, each with a one-line description and brief **Pros** / **Cons**, state which you
  recommend and why, and end with:
  `Type or Say an option (A/B/…) and "Accept", or "I resolved it" if you handle it yourself.` (a prompt line)
- **Record the recommendation in `TWEAKS_FILE`**: whenever a recommendation (or a set of options) is
  logged to the console, append it to that tweak's section as a `### RECOMMENDATION` subsection — the
  same text as the console's `Recommendation:` block (or the options with their Pros / Cons and which
  one is recommended), ending with the timestamp — and update `Last updated`. Place it at the end of the
  tweak's section, after any `### CLARIFICATIONS`. If the tweak already has one from an earlier *Next*,
  append the new one below it rather than rewriting the old one, so the record shows how the recommendation
  changed.
- When the requirement cannot be resolved without an answer only the developer can give (what a value should
  be, which of two behaviors is wanted, whether something is in scope), **ask** instead of recommending:
  write the question(s) under a `### CLARIFICATIONS` subsection of that tweak in `TWEAKS_FILE` (creating the
  subsection if absent; this is the one permitted edit inside a tweak's text, and it adds, never rewrites), log
  them to the console, and stop. The developer answers in the file or in chat; the next *Next* reads
  the answers and recommends.
- **When there is just one recommendation** — a single `Recommendation:`, no options to choose and no
  clarification questions — release the lock and run *Accept* (Question 2) on that tweak automatically, as if
  the developer had typed it. When there are options or questions, stop and wait for the developer.
- Questions 1 and 3 never change the code or the artifacts; only *Accept* does (including the one that
  follows a single recommendation). Question 1 never changes the tweak file except to add clarification
  questions or a recommendation.

### Question 2 — "Accept"

Applies a resolution to **the same tweak that "Next" would show** (or the tweak named with a jump).

1. **Determine the resolution**:
   - the option the developer chose (given with the command, e.g. `Accept B`, or as a follow-up to *Next*), else
   - the resolution you recommended for this tweak earlier in this conversation, else
   - the latest `### RECOMMENDATION` recorded in that tweak's section, else
   - work it out now exactly as *Next* would, recording it in `TWEAKS_FILE` as *Next* does. If
     that yields several options and the developer has not chosen, **present the options and stop** — do not guess which one they want. If it yields
     clarification questions, ask them (as Question 1 does) and stop.
2. **Implement it in the code** with surgical edits, following the project's constitution
   (`.specify/memory/constitution.md` if present): change only what the tweak requires, match the surrounding
   style, add no speculative generality, and leave neighboring code, comments and formatting alone.
3. **Write the tests, then execute them only when this tweak's `Run Tests` box is ticked.** Whatever the box
   says, add or adjust tests so the tweaked behavior is asserted — in the file where each belongs, following
   the project's existing test style — and name them in the console log and the `### ACCEPTED RECOMMENDATION`. Only a tweak
   with nothing a test can observe (a comment, a documentation-only change) may go without one, and the
   resolution says why.
   - **Default (`Run Tests` empty or absent)**: run **no** suite, not even the narrowest, so the developer's
     later run picks the new tests up, and never hold the tweak open for want of a passing run. A type-check or build that takes seconds is still fair
     game when the change could break compilation. Say plainly, in the console log and in the
     `### ACCEPTED RECOMMENDATION`, that the tests were postponed and that the tweak is therefore unverified by a run.
   - **`Run Tests` ticked**: run the tests (the
     project's test command — check `package.json` or the plan — e.g. `npm test`, or the narrowest suite that
     covers the change followed by the full suite when the change is not local). A tweak is not applied until
     its tests pass. If tests fail and the failure is not yours to tweak within the scope of the tweak, stop,
     report the failure verbatim, and do not check the tweak off.
4. **Update the feature artifacts as necessary** so they stay true to the implementation: `spec.md` (an FR,
   SC, edge case or assumption the tweak changed), `plan.md`, `tasks.md` (a task line that now reads
   differently, or a new task line with the next free `T###` id in the right phase), `contracts/*`,
   `quickstart.md`, and `postman/openapi.json` or equivalent contract files if an interface changed. Never
   edit `.specify/memory/constitution.md`. If a tweak changes what a *requirement* means, say so in the
   console log — the high-level requirements document in `designDocs/` may need the same change; do not
   edit it unasked.
5. **Record it in `TWEAKS_FILE`**: set the tweak's **resolution** checkbox to `[X]`, append a `### ACCEPTED RECOMMENDATION`
   subsection at the end of that tweak's section (or `### IMPLEMENTATION REPORT` in a file that uses that
   idiom) with a short report — what changed, in which files, which tests were added or updated and their
   result (or `tests postponed (Run Tests not ticked); <what was written, if anything> not run`), which
   artifacts were touched — ending with the timestamp; update `Last updated`. Leave the `Run Tests` box
   exactly as the developer wrote it. Then append the next tweak's template when the rule in *The tweak format*
   calls for it (*Appending the next tweak's template*). Change nothing else.
6. **Log to the console**:

```
Applied TWEAK### (<title>): <one-line description of the change>
  Edited:  src/…, tests/… (added <n> tests, suite green: <files>/<tests> — or "tests postponed (Run Tests not ticked), not run")
  Artifacts: specs/<feature>/spec.md (FR-012), specs/<feature>/tasks.md (T031 added)
  <tweaks_file_name>: TWEAK### marked [X]
Remaining open tweaks: 2
```

7. **Continue with the next tweak**: once the tweak is checked off and its lock released, run *Next*
   (Question 1) automatically, exactly as if the developer had typed it — it takes its own lock, shows the next
   open tweak with its recommendation (recording it in `TWEAKS_FILE`) or its clarification questions, and
   — when that is a single recommendation — applies it in turn, so the run carries on tweak by tweak until a tweak
   offers options or asks questions, a tweak's tests fail, or no open tweak remains. When no open tweak remains,
   it prints the *All tweaks resolved* message instead. If *Accept* stopped without checking the tweak off (failing tests, options to
   choose, questions to answer), do not continue.

### Question 3 — "I resolved it" / "We resolved it" 

The developer has resolved **the next open tweak** (or the tweak named with a jump) by hand. This is
discouraged — the record is only as good as what can be detected — but allowed when the developer has made
and verified the tweak themselves. Do not redo the tweak.

1. **Detect what was done**: read the tweak's requirement, then inspect the working tree (`git status`,
   `git diff`, and `git log` since the tweak file's `Last updated` time if the change was committed) for the
   files the requirement points at. Summarize the change in your own words; if nothing relevant can be
   found, say so plainly and ask the developer to describe it — do not invent a description.
2. **Verify it**: run the tests that cover the changed files, then the full suite; add or adjust tests if the
   tweaked behavior is not yet asserted (the only code edits this question may make are to tests). Report the
   result; a failing suite does not stop the tweak being recorded, but the failure is written into the
   resolution note verbatim. Unless the tweak's `Run Tests` box is ticked, run nothing, but still write the missing
   tests and record that verification was postponed.
3. **Update the feature artifacts as necessary**, exactly as Question 2 step 4 does.
4. **Record it in `TWEAKS_FILE`**: change the checkbox line to `[-] Resolved (manually)`, append a `### ACCEPTED RECOMMENDATION` subsection describing
   the manual tweak as detected, the test result and any artifacts touched, ending with the timestamp; update
   `Last updated`; then append the next tweak's template as Question 2 step 5 does.
   - For the *Accept as-is* / *Won't tweak* variant, skip steps 1–3, change the checkbox line to
     `[-] Resolved (accepted as-is)` instead, and write instead of the report:
     `Resolution: accepted as-is by the developer (<timestamp>)` — so a later reader knows the
     implementation was left alone on purpose.
5. **Log to the console**:

```
TWEAK### (<title>) marked [-] — Resolved (manually).
  Detected: <one-line description of the change, with files>
  Tests: <result>
  Artifacts: <files touched, or "none needed">
Remaining open tweaks: 1 — Type or Say "Next" to continue.   (a prompt line)
```

When the last open tweak is closed by either question, add:
`All tweaks resolved. Add TWEAK### to <tweaks_file_directory>/<tweaks_file_name> if there are more tweaks.`

### Operating Constraints

- **Never overwrite an existing tweak file.** Its only mutable parts are the Record timestamps, the checkbox
  states, an added `### CLARIFICATIONS` subsection, and the `### RECOMMENDATION` and
  `### RECOMMENDATION` and
  `### ACCEPTED RECOMMENDATION` subsections this skill appends, and a tweak heading's missing number or title.
  edits, and always release the lock — on success or on error.
- **One tweak at a time.** The three questions always act on the first open tweak, and each tweak is recommended,
  recorded, applied and checked off before the next is read; do not skip ahead unless the developer names a
  different tweak explicitly (`TWEAK###`). A tweak with a single recommendation is applied without waiting; one
  with options or clarification questions always stops the run for the developer.
- **Surgical changes.** Every changed line traces to the tweak that motivated it. No refactoring of adjacent
  code, no cleanup, no comments that describe behavior or cite tweak ids.
- **Tests are the proof** — except where the run is postponed. *Tweak* is not done until the tests
  that cover the tweak pass; say so with the numbers, and report failures verbatim rather than paraphrasing
  them. A tweak whose `Run Tests` box is not ticked is the exception: its tests are still written, but no suite
  is run for it, the tweak is recorded as unverified by a run, and the developer picks the moment to run the
  batch.
- **Artifacts follow the code.** A tweak that leaves `spec.md`, `tasks.md` or a contract saying something the
  code no longer does is half done.
- **Never edit `.specify/memory/constitution.md`.**
- **A new git branch will not be created** for this slash command, and nothing is committed or pushed; the
  developer decides when to commit.
- Keep console output short and concrete: tweak ids, file paths with line references, the exact wording or
  values being changed, and test counts.

### Examples

| Invocation / message | Effect |
|---|---|
| `/speckit-tweak` (no `tweaks.md` yet) | Creates `specs/018-TAB-BAR/tweaks.md` from the template; prints the status summary with the placeholder TWEAK01 as the next open tweak. |
| `/speckit-tweak` (file exists) | Leaves the file as is; says it already exists and will not be overwritten, prints the status summary, then runs *Next* on the first open tweak. |
| `/speckit-tweak hotfixes.md` | Uses `specs/018-TAB-BAR/hotfixes.md` (created if absent). |
| `/speckit-tweak specs/017-SEARCH-AND-SCALABILITY-DATABASE/tweaks.md` | Uses that file in that directory; `tweaks_file_directory` is `specs/017-SEARCH-AND-SCALABILITY-DATABASE`; artifact updates still go to the feature in `.specify/feature.json`. |
| `Next` | Shows `TWEAK003 · Refresh stays disabled after a 503` with a grounded recommendation, or Options A/B when both a client and a server tweak are defensible — either way appended to the tweak as `### RECOMMENDATION` — or clarification questions written into the tweak. A single recommendation is then applied at once, as *Tweak*. |
| `Accept` / `Accept B`, with the tweak's `[x] Run Tests` ticked | Implements the tweak, adds tests, runs the suite, updates `tasks.md`/`spec.md` as needed, appends `### ACCEPTED RECOMMENDATION`, marks `[X]`, then shows the next open tweak as *Next* would. |
| `Accept`, with the tweak's `[ ] Run Tests` left empty | The same, but no suite is run — the tests are still written, and the resolution records that verification was postponed. Appends `### ACCEPTED RECOMMENDATION`. |
| `I resolved it` | Detects the developer's change from the working tree, runs the tests, appends `### ACCEPTED RECOMMENDATION`, marks `[-] Resolved (manually)`. |
| `Accept as-is` | Marks the next open tweak `[-] Resolved (accepted as-is)` with an "accepted as-is" resolution line. |
| `TWEAK007` then `Accept` | Acts on TWEAK007 regardless of its position. |
| `Next` (nothing open) | `All tweaks resolved. Add TWEAK### to specs/018-TAB-BAR/tweaks.md if there are more tweaks.` |
