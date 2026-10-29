---
name: "speckit-requirements"
description: "Assists the developer in refining the high-level requirements for a new feature. Also, generates Markdown+Mermaid architecture for the requirements. This does the work of a software architect."  
argument-hint: "[NEW]"  
compatibility: "Requires spec-kit project structure with .specify/ directory"  
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebFetch, WebSearch, Skill
user-invocable: true  
disable-model-invocation: false
metadata:  
    - author: "David Brooks"  
---

# Skill Name / Purpose
This speckit-requirements skill assists the developer in refining the high-level requirements for a new feature.  
It also generates the Markdown+Mermaid architecture for the requirements.  
It does the work of a software architect.  
It is extremely valuable to help the developer visualize the current requirements to ensure to ensure that the requirements are correct and complete, with none of the following:
- **Inconsistencies**
- **Ambiguities**
- **Unspecified Aspects**
- **"Needs Clarifications" items**
  
 This skill will also document:  
- **Breaking Changes**
- **Technical Debt**

To be clear, **INCONSISTENCIES** are requirements that contradict each other within the current requirements document. This does NOT include Inconsistencies between previous requirements documents (resulting in the current implementation) and the current requirements document.  
**AMBIGUITIES** are current requirements that can be interpreted in multiple ways.  
**UNSPECIFIED ASPECTS** are current requirements that are missing details.  
**"NEEDS CLARIFICATIONS" ITEMS** are requirements that need to be clarified by the product owner or stakeholders.  
    
**BREAKING CHANGES** are requirements that introduce changes that are not backward compatible with the current implementation.  
**TECHNICAL DEBT** refers to areas of the current implementation that may require refactoring or improvement to maintain long-term code quality and maintainability.
 
Standard software architecture diagrams will be generated in Mermaid format to help visualize the requirements, because "A picture is worth a thousand words.".  
The software architecture will be generated in Markdown (md) format with the Mermaid diagrams inline using the ```mermaid``` code blocks, and will be placed beside the requirements document, in its folder `<REQUIREMENTS_DIRECTORY>` (a path relative to the project root, e.g. `requirements/20261016-172002-site-favicon`).
This allows the developer to easily locate the Markdown+Mermaid architecture within the project structure.

This skill identifies, **Inconsistencies**, **Ambiguities**, **Unspecified Aspects**, and **"Needs Clarifications" items**, that will need to be resolved before the requirements are ready for /speckit-specify. These items will be called **findings**, with one section per finding.   
This skill also makes one or more recommendations for each finding, suggesting how it could be resolved.  
A finding remains **open** as long as it has not be resolved.  
  
This skill will also document **Breaking Changes** and **Technical Debt**, and performs the research the requirements
document asks for, reporting each result as a finding with recommendation(s) in a **Research Results** section (see
*Research Results*).

This skill **Answers four commands** about the findings list, for as long as findings remain open:
   - **"Next"** — as a first step, resolves every open finding whose `[ ] ➡️ **Accept**` box the developer has ticked in the file,
     then it shows the first finding still open.
   - **"Accept"** — accepts the recommended recommendation of the next open finding, updates the requirements if necessary, and marks the finding resolved.
   - **"Accept <ID>, <LETTER>"** — does the same for the option named, of any open finding, e.g. `Accept AM2, B`.
   - **"Accept all"** — does the same for every open finding that offers just one recommendation, in one pass, and reports the ones
     skipped because they have more than one recommendation.

Only this skill marks a finding resolved, because resolving it may require an update to the current requirements document. The developer accepts a
recommendation, by Typing or Saying "Accept" or `Accept <ID>, <LETTER>`, or by ticking the `[ ] ➡️ **Accept**` box; the skill does the rest.

The findings this skill resolves are the ones `/speckit-requirements` reports. Such as **Inconsistencies**, **Ambiguities**, **Unspecified Aspects**, and **"Needs Clarifications" items**.

The developer is expected to run `/speckit-requirements` again once every finding is resolved, to confirm that the
resolutions actually removed the finding rather than merely rewording it.

## Core Instructions

### User Input

```text
$ARGUMENTS
```
`$ARGUMENTS` is optional. It is the raw, unparsed text the user typed after `/speckit-requirements`. It arrives as a
single string — nothing tokenizes it for you — so parse it here, in this order:

1. **Tokenize** `$ARGUMENTS` on whitespace, honoring quotes (`"..."` or `'...'`) so a path containing
   spaces stays one token.
2. **Zero tokens — no argument.** Find the requirements document through `.specify/requirements.json`, in this order:
   - `requirements_directory` is set and not empty → `REQUIREMENTS_PATH_AND_FILENAME` =
     `<requirements_directory>/requirements.md`.
   - otherwise (the key is unset or empty, or the file does not exist), `template_path_and_filename` is set → a new
     feature's template is waiting; handle it exactly as "Next" does for a waiting template (see *Starting a new
     feature (NEW)*).
   - otherwise (neither key is set, or `.specify/requirements.json` does not exist) → stop, and display:

⚪  
⚪ No requirements documents were found.  
⚪ Next step:  
🟩 👉 Type or Say: /speckit-requirements NEW  
⚪  

3. **One token, `NEW`** (case-insensitive) → start a new feature from a template (see *Starting a new feature (NEW)*).
4. **Anything else** (a path, any other word, or two or more tokens) → fail with an error naming the unrecognized
   token(s); do not guess. The skill never takes a requirements file the developer created: a feature's requirements
   always start from the template that `NEW` creates.
Exact error format, e.g., 'ERROR: Unrecognized argument(s): <token1>, <token2>. Usage: /speckit-requirements [NEW]'

Assume the parsed input is available in this conversation, even if `$ARGUMENTS` appears literally above. Do not ask
the user to repeat it.

Examples:

| Invocation | `REQUIREMENTS_PATH_AND_FILENAME` |
|---|---|
| `/speckit-requirements` | `<requirements_directory>/requirements.md` from `.specify/requirements.json` (or the waiting template) |
| `/speckit-requirements NEW` | none yet: a template is created (see *Starting a new feature (NEW)*) |

If the file at `REQUIREMENTS_PATH_AND_FILENAME` does not exist, log to the CC CLI terminal and stop: `ERROR: Requirements file not found: <REQUIREMENTS_PATH_AND_FILENAME>. Run /speckit-requirements NEW to start a new feature.`
The contents of the human-readable requirements document will be used by this SKILL to generate the `requirements-report.md` document beside the normalized requirements document.

### Starting a new feature (NEW)

A new feature has no requirements yet, so it cannot be named or normalized. `NEW` creates a template for the
developer to fill in; the first "Next" after it normalizes the filled-in template and creates the requirements report.

**`NEW`:**

1. If `.specify/requirements.json` already has a `template_path_and_filename` whose file still exists and is not yet
   normalized, do not create another: tell the developer where it is and ask whether to keep working on it or start a
   new one anyway. Change nothing until they answer.
2. Create the folder `requirements/new-<YYYYMMDD-HHMMSS>` (the local time from the shell,
   `date '+%Y%m%d-%H%M%S'`) and in it `requirements.md`, containing exactly:

```markdown
# Initial High-Level Requirements

1. Replace these instructions with your high-level requirements, in prose (sentences and paragraphs).  
There is no need to make the requirements exhaustive at this stage.  
The /speckit-requirements skill will help you iterate until the requirements are complete.  
Focus on capturing the high-level ideas and main objectives.  
Things you may consider including:  
- Use Cases  
- Functional Requirements  
- UI/UX Design (describe or illustrate with mockup images)  
- Logic  
- Scope  
- Exclusions  
- Success metrics  

2. You may also request items to research, by entering "Research this:<topic>".  
This could include:  
- Research on similar features or systems  
- Technical analysis  
- Recommended technologies: patterns, APIs, libraries, languages, deployment platforms etc.  
- Risks and Mitigations  
- Compliance  

3. When done, save the file (same name, same directory)  

4. At the CC CLI prompt Type or Say:  
    > next  
```

3. Update `.specify/requirements.json` (create it if absent; keep any other keys): set `requirements_directory` to
   `""` (a new session of refining requirements has started, and its folder is not named yet) and set
   `template_path_and_filename` to the new file's project-root-relative path, e.g.
   `"requirements/new-20261019-101500/requirements.md"`.
4. Display, with `<REQUIREMENTS_DIRECTORY>` replaced by the new folder (e.g. `requirements/new-20261019-101500`):

⚪  
⚪ A new feature journey has started taking you through the following **skills**:  
⚪ **/speckit-requirements**  
⚪ **/speckit-specify**  
⚪ **/speckit-clarify**  
⚪ **/speckit-clarify-findings** (optional)  
⚪ **/speckit-plan**  
⚪ **/speckit-tasks**  
⚪ **/speckit-analyze**  
⚪ **/speckit-analyze-findings** (optional)  
⚪ (or **/speckit-plan-thru-analyze**, which runs /speckit-plan through /speckit-analyze-findings in one go)  
⚪ **/speckit-implement**  
⚪ **/speckit-tweaks**  (optional)  
⚪  
🟩 👉 1. Open the newly created requirements file: `<REQUIREMENTS_DIRECTORY>/requirements.md` in your editor.  
🟩 👉 2. Enter your high-level requirements in the section: # Initial High-Level Requirements.  
🟩 👉 3. When done, save the file (same name, same directory).  
🟩 👉 4. Come back here and Type or Say: Next  
⚪  

5. Stop and wait for the developer to Type or Say "Next".

**"Next" while a template is waiting** (`template_path_and_filename` is set). This takes precedence over "Next" for
findings:

1. If the file at `template_path_and_filename` does not exist, say so, remove the key, and stop.
2. If its first line already starts with `Start a new spec for these requirements called`, it has been normalized:
   remove `template_path_and_filename` and carry on as for any requirements document.
3. Otherwise it must have a `# Initial High-Level Requirements` section holding the developer's requirements, not the
   instructions. The section counts as filled in when, leaving out every instruction line that is still as written
   above, some text remains. Lines are compared ignoring leading and trailing spaces, so a line an editor has
   re-indented or stripped of its trailing spaces still counts as an instruction line. If it is not
   filled in, show the message from step 4 of `NEW` again and stop.
4. Display:

⚪ A new file called `requirements-report.md` will be created with the following contents:  
⚪ ✅ Architecture diagrams based on your high-level requirements  
⚪ ✅ Research Results  
⚪ ✅ Findings: Inconsistencies, Ambiguities, Unspecified Aspects, Clarifications  
⚪ The findings will then need to be resolved using: **Accept**, **Accept X**, **Accept All**, **Next**  
⚪  

5. Normalize it, with `REQUIREMENTS_PATH_AND_FILENAME` = the template's path (see *Normalizing the requirements
   document*). The template's folder is renamed to its feature folder, so images the developer saved beside it go
   with it. Remove every instruction line that is still as written (compared the same way, ignoring leading and trailing
   spaces), and keep everything the developer wrote,
   wherever they wrote it.
6. In `.specify/requirements.json`, set `requirements_directory` to the new `REQUIREMENTS_FOLDER` and remove
   `template_path_and_filename`.
7. Create the requirements report (CREATE mode, see *Generation Mode*), then carry on as after any CREATE run.

### Normalizing the requirements document

Once `REQUIREMENTS_PATH_AND_FILENAME` is found, and before the generation mode is chosen, bring the requirements
document's location, name and first two lines into the standard form. Every feature's requirements live in a folder of
their own under the top-level `requirements/` directory:

```
requirements/<FEATURE_NUMBERING>-<SHORT_NAME>/requirements.md
```

for example `requirements/20261016-172002-site-favicon/requirements.md` (timestamp) or
`requirements/032-fixed-position-header/requirements.md` (sequential). The folder, `REQUIREMENTS_FOLDER`, also holds
every image and support document the requirements use (mockups, diagrams, notes), so the document's relative links
work from it.

1. **Feature numbering.** Read `feature_numbering` from `.specify/init-options.json` (`"sequential"` when the
   file or field is absent).
   - A **timestamp prefix** is `YYYYMMDD-HHMMSS` (8 digits, `-`, 6 digits) followed by `-`; a **sequential
     prefix** is exactly 3 digits followed by `-`.
   - Look for the prefix on the folder name when the document is already in a folder directly under
     `requirements/`, otherwise on the document's file name.
   - The prefix matches the numbering in use → keep it as `FEATURE_NUMBERING`.
   - The prefix is the other kind, or there is none → set `FEATURE_NUMBERING` to a new number of the kind in use:
     the current local date and time as `YYYYMMDD-HHMMSS` (timestamp), or the next free 3-digit number after
     scanning `requirements/`, `specs/` (sequential).
2. **The short name.** `SHORT_NAME` is lower case, three words or fewer, joined by `-` (e.g. `site-favicon`).
   - Take it from the folder name after its prefix, when the document is already in a folder directly under
     `requirements/`; otherwise from the file name, after removing its prefix, any leading
     `high-level-requirements`, `requirements` or `specs` (with or without a trailing `-`), and its extension.
   - Use it when it is already in that form (lower-casing it is allowed). Otherwise, or when nothing meaningful is
     left, set `SHORT_NAME` to a summary of the document's contents in three words or fewer.
   - A template's folder (`new-<YYYYMMDD-HHMMSS>`, see *Starting a new feature (NEW)*) has neither a prefix nor a
     short name: `FEATURE_NUMBERING` is a new number and `SHORT_NAME` is always the summary of the contents.
3. **The target.** `REQUIREMENTS_FOLDER` = `requirements/<FEATURE_NUMBERING>-<SHORT_NAME>`, and the target document is
   `REQUIREMENTS_FOLDER/requirements.md`. When `REQUIREMENTS_PATH_AND_FILENAME` already is that path, nothing moves.
4. **Moving into place.** Otherwise, move what is needed, using `git mv` for tracked files so their history follows,
   and log each move to the CC CLI terminal as `Moved <old path> → <new path>`:
   - **The document is in a folder directly under `requirements/` whose name is wrong** → rename that folder to
     `<FEATURE_NUMBERING>-<SHORT_NAME>` (its other files go with it), then, if the document is not named
     `requirements.md`, rename it to that.
   The document is always in a folder directly under `requirements/` (the template's `new-<YYYYMMDD-HHMMSS>` folder,
   see *Starting a new feature (NEW)*), so nothing else is ever moved.
5. **The first two lines.** The document's first two lines should be (without the surrounding backticks):
   ```
   Start a new spec for these requirements called `<FEATURE_NUMBERING>-<SPECNAME>`  
   !! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  
   ```

   where `SPECNAME` is `SHORT_NAME` in upper case (e.g. `20261016-172002-SITE-FAVICON`).
   - If the first line of the file already starts with `Start a new spec for these requirements called ` and the
     name between the backticks is `<FEATURE_NUMBERING>-<SPECNAME>`, change nothing.
   - Otherwise, insert the two lines above as the first two lines, followed by a blank line, and log
     `First line set: Started a spec for these requirements called `<FEATURE_NUMBERING>-<SPECNAME>`` to the CC CLI terminal.

### Generation Mode

Whether the `requirements-report.md` document already exists decides how it is produced. **An existing `requirements-report.md`
document is never overwritten or regenerated.**  
The `requirements-report.md` document is always `<REQUIREMENTS_DIRECTORY>/requirements-report.md`,  
beside `requirements.md`, where `REQUIREMENTS_DIRECTORY` is
`REQUIREMENTS_FOLDER` from *Normalizing the requirements document* (e.g. `requirements/20261016-172002-site-favicon`).

- **APPEND** — the document already exists: `.specify/requirements.json` records a `requirements_directory` that
  is this document's folder (the same folder once both paths are normalized to project-root-relative form with
  forward slashes, compared case-insensitively on Windows), and `<REQUIREMENTS_DIRECTORY>/requirements-report.md`
  exists. Then:
  - do **not** create a directory or rewrite any existing section, diagram, finding or checkbox, with two
    exceptions: a subsection's `None found.` line is replaced by its first finding, and an existing Requirements
    Report Complete Report is removed when at least one finding is appended (see *Requirements Report Complete Report*);
  - re-read `REQUIREMENTS_PATH_AND_FILENAME` and look for new findings — Inconsistencies, Ambiguities, Unspecified
    Aspects, "Needs Clarifications" items and Breaking Changes — that the document does not already list,
    including anything a resolution left unsettled; and for research requests the **Research Results** section does
    not already answer, which are researched and appended there (see *Research Results*);
  - **append** each new finding in its initial form, as described in *Finding layout* (its bold title, its
    explanation, then its recommendation(s), each with its own Accept line), in the report's own form (the
    *Old form* for a report created before 2026-10-29, see *Reading a report*), at
    the end of its existing subsection in the findings section (adding the subsection at the end of that
    section if it is absent), numbered after the last finding already there;
  - append no report: an APPEND run leaves new findings open, so the document is not complete (see *Requirements Report Complete Report*);
  - if no new finding is found, append nothing and say so in the CC CLI terminal;
  - leave `.specify/requirements.json` unchanged, except to update `last_written` (see *File lock while executing a
    command*).
- **CREATE** — otherwise: write `<REQUIREMENTS_DIRECTORY>/requirements-report.md` and every other artifact into the
  requirements folder, and record the run in `.specify/requirements.json`:

```
        {
            "requirements_directory": "<REQUIREMENTS_DIRECTORY>"
        }
```

  Write the actual value (for example `"requirements/20261016-172002-site-favicon"`) as a project-root-relative
  path with forward slashes, so the APPEND check can match it on the next run. The requirements document is always
  `<requirements_directory>/requirements.md`. If `<REQUIREMENTS_DIRECTORY>/requirements-report.md` already exists
  while `.specify/requirements.json` does not record its folder, stop with
  `ERROR: <REQUIREMENTS_DIRECTORY>/requirements-report.md exists but is not recorded in .specify/requirements.json.`
  and change nothing, so an existing document is never overwritten.

`.specify/requirements.json` is this skill's only settings file. Its keys: `requirements_directory` (the current
feature's folder, `""` while a new feature's template is waiting), `template_path_and_filename` (only while a
template is waiting) and `last_written` (see *File lock while executing a command*).

   **IMPORTANT**:
   - In CREATE mode the `requirements-report.md` document is always created by this command, never by a hook, and never over an
     existing one.
   - In APPEND mode no file is created, `.specify/requirements.json` is changed only in `last_written`, and the
     existing document is only appended to — never regenerated, overwritten or rewritten.

### Requirements Report Output File Name

The main `requirements-report.md` document file is named `requirements-report.md` and placed in the requirements folder, beside the
requirements document. For example:

```
requirements/20261016-172002-site-favicon/requirements-report.md
```

### Branch Creation

   A new git branch will not be created for this slash command.

### For AI Generation

When creating the `requirements-report.md` document files, the AI should follow these guidelines.

**The report's first section** is always:

```markdown
# High Level Requirements

Requirements: `<REQUIREMENTS_DIRECTORY>/requirements.md`  
External Files: <every file the requirements document links to or embeds, by its path in REQUIREMENTS_DIRECTORY, or "none">  
Generated: <local date and time from the shell, `date '+%Y-%m-%d %-I:%M %p'`>  

<the high-level requirements as they were found in the requirements document when the report was created>
```

**The second section**, immediately after the high-level requirements copied from `requirements.md`, is always:

```markdown
## Additional Requirements and Research Requests

**Instructions To The Developer**  
Enter any additional requirements or research requests under the ## Additional Requirements and Research Requests heading above.  
When you Type or Say: "Next" in the CC CLI terminal, the additional requirements and research requests will be applied to the report.  
  
You may leave these instructions here. They will be ignored when "Next" is executed.  
```

The architecture sections follow it, then the **Research Results** (see *Research Results*), then the findings.

### Additional Requirements and Research Requests

The **Additional Requirements and Research Requests** section is where the developer adds to the requirements once
the report exists, since `requirements.md` itself is locked (see *File lock while executing a command*). Its heading
and its three instruction lines (from **Instructions To The Developer** on) are the skill's; anything else the developer writes in the section is **pending
input**. "Next" applies it before anything else (see "Next" in *Resolution of Findings*):

1. **Sort the pending input** into additional requirements and research requests (a line starting
   `Research this:`, or any request to research, investigate, compare, evaluate or survey something, is a research
   request; everything else is a requirement).
2. **Additional requirements** are added to `requirements.md`, at the end of the document under a heading
   `## Additional Requirements (<date and time>)`, worded as the developer wrote them. Then the report is checked
   against them exactly as an APPEND run checks the requirements (see *Generation Mode*): new Inconsistencies,
   Ambiguities, Unspecified Aspects, "Needs Clarifications" items and Breaking Changes are appended as findings,
   in the report's own form (see *Reading a report*).
   Existing sections and diagrams are not rewritten; when a diagram no longer fits, that is reported as a finding.
3. **Research requests** are added to `requirements.md` the same way, under the same heading, then researched and
   appended to **Research Results** as new `RS` findings (see *Research Results*).
4. **Clear the section**: remove the pending input, leaving the heading and the three instruction lines, and add
   under them one line recording what was done, e.g.
   `✅ Applied 2026-10-19 4:30 PM: 2 requirements added to requirements.md (findings UA4, NC2); 1 research request (RS5).`
   Earlier `✅ Applied` lines stay, as the section's history.
5. Log the same summary to the CC CLI terminal, then carry on with "Next" as usual.

When the section holds nothing but its heading, its instruction lines and `✅ Applied` lines, there is no pending input
and "Next" carries on as usual.

1. **Generate a clear and concise `requirements-report.md` document** that is easy to read (when the Markdown and Mermaid diagrams are rendered) and understand
2. **Generate an overview of the requirements and their scope.**
3. **Generate appropriate standard Software Development diagrams** to include in the `requirements-report.md` document
4. **Use the requirements document** to generate the `requirements-report.md` document, and ensure that all requirements are addressed in the `requirements-report.md` document
5. **Use the SKILLs** `/artifact-design` and `/artifact-diagramming` to generate diagrams and the `requirements-report.md` document
6. **Generate descriptive and concise prose** if necessary to document the requirements  
7. **Make informed guesses**: Use context, industry standards, and common patterns to fill gaps.  

8. **Document Inconsistencies** of the requirements.  
   - lay out each Inconsistency as described in *Finding layout* below.

9. **Document Ambiguities** of the requirements.  
   - lay out each Ambiguity as described in *Finding layout* below.

10. **Document Unspecified Aspects** of the requirements.  

      - lay out each Unspecified Aspect as described in *Finding layout* below.

11. **Document "Needs Clarifications" items** of the requirements.
      - **Prioritize clarifications**: scope > security/privacy > user experience > technical details
      - **Limit "Needs Clarifications"**: Maximum 10 [NEEDS CLARIFICATION] markers - use only for critical decisions that:
         - Significantly impact feature scope or user experience
         - Have multiple reasonable interpretations with different implications
         - Lack any reasonable default
      - lay out each "Needs Clarification" item as described in *Finding layout* below.

    **Finding layout.** Every finding — Inconsistency, Ambiguity, Unspecified Aspect, "Needs Clarification" item or
    Research Result — goes through three *forms*: initial, accepted and resolved.
    This section is the only full description of them; every other section refers to it.
    A report created before 2026-10-29 keeps the *Old form* described at the end of this section; every other report
    uses the forms below.
    In the examples, `␣␣` stands for the two trailing spaces of a Markdown line break and is not written literally;
    everything else is written exactly as shown, and every blank line is empty.

    *Initial form* — as the finding is first written:

    ```markdown
    **NC1. Should the favicon include the speech bubble?**␣␣

    > The mockup shows only the two figures.␣␣
    > The header's brand logo draws the same figures inside a white speech bubble with a black outline.␣␣

    ❌ NOT Resolved

      - **Recommendation A** _(recommended)_: **figures only, as in the mockup.**␣␣

        [ ] ➡️ **Accept** (To Accept, you may: mark <b>[X]</b> on this line, save the file, then Type/Say "<b>next</b>" in the CC CLI terminal, OR Type/Say "<b>Accept NC1, A</b>" in CC CLI)

        - <u>Pros</u>: it matches the mockup, and it is legible at 16 px, where the bubble's outline and tail would take a third of the pixels.␣␣
        - <u>Cons</u>: it is a slightly different mark from the header logo.␣␣


      - **Recommendation B**: **the full brand logo, bubble included.**␣␣

        [ ] ➡️ **Accept** (To Accept, you may: mark <b>[X]</b> on this line, save the file, then Type/Say "<b>next</b>" in the CC CLI terminal, OR Type/Say "<b>Accept NC1, B</b>" in CC CLI)

        - <u>Pros</u>: it is the same mark everywhere.␣␣
        - <u>Cons</u>: the figures shrink to about 8 px at 16 px and blur, and it does not match the mockup.␣␣


      - **Developer Resolution C**:␣␣

        [ ] ➡️ **Accept** (To Accept, you may: mark <b>[X]</b> on this line, save the file, then Type/Say "<b>next</b>" in the CC CLI terminal, OR Type/Say "<b>Accept NC1, C</b>" in CC CLI)

        - you may enter your own resolution here␣␣
    ```

    - The title is bold: the finding's id (category letters and number, e.g. `IN1`, `AM2`, `UA3`, `NC1`, `RS1`), a
      period, and the title.
    - The explanation follows after a blank line, as a block quote: every line starts with `> `, broken after each
      sentence as in *Writing text into the files*.
      Never indent it by four spaces instead: after a blank line that is a code block, which shows links, `code` and
      **bold** as raw characters.
    - After the explanation, a blank line, the line `❌ NOT Resolved`, and a blank line.
    - With **one** recommendation, its label is `**Recommendation**`, without a letter. With **several**, each is an
      option labelled `**Recommendation A**`, `**Recommendation B**`, …, and the one you recommend carries
      `_(recommended)_` after its label. Each label is followed by `: ` and a bold one-line summary.
    - Each label is followed by a blank line, its **Accept line**, a blank line, then its detail indented under it:
      `<u>Pros</u>` and `<u>Cons</u>` sub-items for options, or the recommendation's explanation, broken after each
      sentence. Two blank lines separate one option from the next.
    - The Accept line is exactly
      `[ ] ➡️ **Accept** (To Accept, you may: mark <b>[X]</b> on this line, save the file, then Type/Say "<b>next</b>" in the CC CLI terminal, OR Type/Say "<b>Accept <ID>, <LETTER></b>" in CC CLI)`
      with the finding's id and the option's letter in place of `<ID>` and `<LETTER>`.
      Under a single, unlettered **Recommendation** the command it names is `Accept <ID>` (e.g. `"<b>Accept UA3</b>"`).
    - **Every finding ends with a blank Developer Resolution**, research results included: a last item labelled
      `**Developer Resolution <letter>**`, where the letter follows the last recommendation's (`B` after a single
      **Recommendation**, `C` after Recommendations A and B), with its own Accept line naming that letter and the
      one instruction line `- you may enter your own resolution here`. The developer writes their own resolution
      under it (beside or in place of the instruction line), ticks its box, saves the file and says "Next", or types
      `Accept <ID>, <letter>`. It is not an option: it never counts toward "more than one option", and it is never
      chosen by a plain "Accept", by `Accept <ID>` without a letter, or by "Accept all", unless the developer has
      ticked it.
    - There is **no** "Resolved" line in the initial form. A finding is resolved only by this skill, because
      resolving it updates the requirements document, which the developer must not do by hand.

    *Accepted form* — the developer has ticked the box at the start of one Accept line in the file,
    `[X] ➡️ **Accept** (To Accept, …)`, and saved it, but the finding is not yet resolved; nothing else changes until
    the developer says "Next" (or names the finding with `Accept <ID>`), and the skill resolves it.

    *Resolved form* — written by this skill, and only by it, once the accepted recommendation has been carried
    into the requirements document:

    ```markdown
    **NC1. Should the favicon include the speech bubble?**␣␣
    <span style="font-size:large" ><b>
    ✅ Resolved</b></span>␣␣
    ✅ Requirements File Updated: 2026-10-16 9:50 PM␣␣
    **Notes**: Recommendation accepted in file 2026-10-16: Recommendation A, figures only, with no speech bubble;␣␣
    the requirements now say so beneath the mockup.␣␣

    > The mockup shows only the two figures.␣␣
    > The header's brand logo draws the same figures inside a white speech bubble with a black outline.␣␣

      - **Recommendation A** _(recommended)_: **figures only, as in the mockup.**␣␣

        [X] ➡️ **Accepted**

        - <u>Pros</u>: ...␣␣
        - <u>Cons</u>: ...␣␣


      - **Recommendation B**: **the full brand logo, bubble included.**␣␣

        [ ] ➡️ **Not Accepted**

        - <u>Pros</u>: ...␣␣
        - <u>Cons</u>: ...␣␣


      - **Developer Resolution C**:␣␣

        [ ] ➡️ **Not Accepted**
    ```

    - Remove the `❌ NOT Resolved` line and the blank line after it.
    - Insert directly under the title the two lines `<span style="font-size:large" ><b>` and
      `✅ Resolved</b></span>`, then `✅ Requirements File Updated: <date and time>`, the local time from the shell
      (`date '+%Y-%m-%d %-I:%M %p'`, e.g. `2026-10-16 9:50 PM`), never guessed. When the accepted
      recommendation needed no change to the requirements document, that line reads
      `✅ Requirements File Unchanged (no edit needed): <date and time>` instead.
    - Directly under those lines, add a `**Notes**:` line: how and when the recommendation was accepted
      (`Recommendation accepted in file <date>`, `Recommendation accepted by "Accept" <date>`,
      `Recommendation accepted by "Accept <ID>, <LETTER>" <date>` with the id and letter the command named, or
      `Recommendation accepted by "Accept all" <date>`), which recommendation (its label and bold summary), and what
      changed in the requirements document, or that nothing needed to change; broken after each semicolon and
      sentence as in *Writing text into the files*. A blank line follows it.
    - The chosen option's Accept line becomes exactly `[X] ➡️ **Accepted**`; every other Accept line of the finding,
      the Developer Resolution's included, becomes exactly `[ ] ➡️ **Not Accepted**`. No instruction text stays on
      any of them.
    - Remove the Developer Resolution's instruction line, keeping any text the developer wrote there.
    - **Open or resolved.** A finding is resolved when it has all three: the `✅ Resolved` line, the
      `✅ Requirements File …` line and the `**Notes**:` line. The `✅ Resolved` line alone decides whether a finding is
      open: a finding without it is open. Neither the `❌ NOT Resolved` line nor the boxes ever decide it; the
      `❌ NOT Resolved` line is for reading, and "Next" keeps it in step (see "Next").
    - **A finding marked resolved by hand** has the `✅ Resolved` line but is missing the `✅ Requirements File...` and/or
      the `**Notes**:` line: the developer marked it resolved without the requirements document being
      updated. It is treated as open, and "Next" repairs it (see "Next").

    *Reading a report* — rules for every command that reads the findings:

    - **A box is ticked** when it matches `\[\s*[xX]\s*\]` — `[X]`, `[x]`, `[ x]`, `[X   ]` and the like — and
      unticked when it matches `\[\s*\]`. The skill itself writes only `[X]` and `[ ]`.
    - **A line holding only spaces** in a report the developer edited is read as a blank line.
    - **The report's form** is read from its Accept lines each time, never stored: the report is in the *Old form*
      when any Accept line has the arrow before the box (`➡️ [ ] **Accepted**`, `➡️ [X] **Accepted**`, with any tick
      spelling), and in the new form otherwise, including a report with no findings at all.
      Every finding written into a report — appended, resolved or repaired — is written in the report's own form,
      so a report never mixes the two.

    *Old form* — the layout of reports created before 2026-10-29, used only for such a report:

    - **Initial**: the bold title; a blank line; the explanation as plain lines (no `> `), each ending with two
      spaces; no `❌` line. Each option's label is followed by a blank line and
      `➡️ [ ] **Accepted** <span style="font-size:smaller ;padding-left:50px"><i>(you may mark <b>[X] Accepted</b> here, or Type/Say "<b>Accept</b>" in the CC CLI terminal)</i></span>␣␣`
      with its detail directly under it. The Developer Resolution's line is `➡️ [ ] **Accepted**␣␣` (no `<span>`),
      followed by the two instruction lines
      `- you may enter your own resolution here and check the box above when done␣␣` and
      `- then Type or Say "Next" in the CC CLI terminal to have it applied␣␣`.
    - **Accepted**: the developer's tick turns `➡️ [ ] **Accepted**` into `➡️ [X] **Accepted**`.
    - **Resolved**: under the title, `<span style="font-size:large">✅ Resolved</span>␣␣` on one line, then the
      requirements line and the `**Notes**:` line, as in the new form; the chosen line becomes `➡️ [X] **Accepted**`
      and every other keeps `➡️ [ ] **Accepted**`; the hint `<span>` is removed from every Accept line of the
      finding, and the Developer Resolution's two instruction lines are removed, keeping any text the developer
      wrote there.
    - The open-or-resolved rule, the hand-marked rule, *Reading a report* and every command are the same as for
      the new form.

12. **Document assumptions**: Record reasonable defaults in the Assumptions section
13. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
14. **Common areas for "Needs Clarification"** (only if no reasonable default exists):
   - Feature scope and boundaries (include/exclude specific use cases)
   - User types and permissions (if multiple conflicting interpretations possible)
   - Security/compliance requirements (when legally/financially significant)

### Research Results

When the requirements document asks for research — a section such as `## Research`, or a request to research,
investigate, compare, evaluate or survey something (libraries, browser support, standards, prior art, costs) —
perform that research and report it in the architecture document.

- **Doing the research.** Use the sources the question needs: the codebase (search it for what already exists and
  how it is used), and the web (`WebSearch`, `WebFetch`) for libraries, standards, browser support and current
  practice. Prefer primary sources (official documentation, specifications, release notes). Record each source with
  a link, and say when a fact could not be confirmed instead of guessing.
- **Where it goes.** A level-2 section, `## <n>. Research Results`, placed immediately after the architecture
  sections (the overview, the diagrams and the design sections) and **before** the findings section, numbered in
  sequence with the sections around it. It holds one `###` section per research request, in the order the
  requirements document asks them. When the requirements document asks for no research, there is no such section.
- **Each research result is a finding.** It uses the *Finding layout* — the same initial, accepted and resolved
  forms, the same Accept lines, the same `❌`, `✅` and `**Notes**:` lines — with the id prefix
  `RS` (`RS1`, `RS2`, …) and the research question as its title.
  Its explanation, the block quote, states the question, the sources as Markdown links, and what was found:

  ```markdown
  **RS1. Which favicon formats do current browsers need?**␣␣

  > The requirements ask which icon files a 2026 site must ship.␣␣
  > Sources: [MDN — link rel=icon](https://developer.mozilla.org/…), [caniuse — SVG favicons](https://caniuse.com/…).␣␣
  > All current desktop browsers accept an SVG icon;␣␣
  > Safari still needs a PNG or ICO fallback.␣␣

  ❌ NOT Resolved

    - **Recommendation**: **ship `favicon.svg` and a multi-size `favicon.ico`.**␣␣

      [ ] ➡️ **Accept** (To Accept, you may: mark <b>[X]</b> on this line, save the file, then Type/Say "<b>next</b>" in the CC CLI terminal, OR Type/Say "<b>Accept RS1</b>" in CC CLI)

      - It covers every browser listed in the sources, at the cost of two files to keep in step.␣␣


    - **Developer Resolution B**:␣␣

      [ ] ➡️ **Accept** (To Accept, you may: mark <b>[X]</b> on this line, save the file, then Type/Say "<b>next</b>" in the CC CLI terminal, OR Type/Say "<b>Accept RS1, B</b>" in CC CLI)

      - you may enter your own resolution here␣␣
  ```

  - The explanation states the question, the sources (with links) and what the research found, broken after each
    sentence as in *Writing text into the files*.
  - **When possible, offer recommendations** based on the results: one `**Recommendation**`, or lettered options
    with `<u>Pros</u>` / `<u>Cons</u>` and one marked `_(recommended)_`, each with its own Accept line. A result
    that only informs, with nothing to decide, gets a single **Recommendation** to record it in the requirements as
    found.
- **Breaking Changes and Technical Debt items are not findings**: they are listed in their own sections, with no
  `❌` line and no Accept lines.
- **Resolving a research result** works exactly as for any other finding (see *Resolution of Findings*): accepting
  a recommendation carries the decision into the requirements document (for example beneath the research request),
  and the result takes its `✅ Resolved`, `✅ Requirements File …` and `**Notes**:` lines.

### Writing text into the files

Everything this skill writes — the requirement document's prose, findings, recommendation(s), resolution
notes and the requirements report, and any text it adds to `REQUIREMENTS_PATH_AND_FILENAME` — is laid out
for reading in the raw file as well as rendered:

- **Break the line after each sentence-ending period (`.`) and after each semicolon (`;`)**, and end every
  such line with **two spaces**, the Markdown line break, so each renders on its own line. A period that does
  not end a sentence — in a file name (`spec.md`), a number (`1.5`), an abbreviation (`e.g.`) or anything in
  backticks — is not a break.
- **Use list items and indentation** where they help: one item per component, requirement, option or
  artifact, with continuation lines and sub-points indented under their item; a list item may still hold
  several sentences, each broken as above.
- **Never break inside** a code span, a fenced code block (Mermaid diagrams included) or a table row, and
  leave a blank line between paragraphs, lists and sections.
- **A finding's explanation is a block quote**: every line of it starts with `> ` and still ends with two spaces
  (except in an *Old form* report, see *Finding layout*).
- **A blank line is empty**, never a line of spaces. In a finding, one blank line follows the title block (the title,
  or the title and its resolved lines), the explanation, the `❌ NOT Resolved` line, each option's label and each
  Accept line, and two blank lines separate one option from the next. The Accept line and the `❌ NOT Resolved` line
  need no trailing spaces, since a blank line follows each.
- These rules apply only to the text this skill writes; the developer's own text is never reflowed.

### File lock while executing a command

The developers keep editing the requirements report document and the requirements document while this skill works,
so every command that may change either of them — a `/speckit-requirements` run (normalizing the requirements
document, CREATE or APPEND), "Next", "Accept" (with or without an option letter) and "Accept all" — runs under a lock on each file it changes.

- **Before the first change to a file** while executing the command, create its sibling lock file — the
  file's own name plus `.lock`, in the same directory (e.g. `requirements-report.md.lock`, or
  `requirements.md.lock`)— containing the command being executed (as
  typed, with the finding id it acts on) and the time it started. While it exists, the developers will not
  save that file; anyone with unsaved edits saves them before typing the command, or waits for the lock to
  go. When the requirements document is renamed, the lock follows it: release the old name's lock and take
  one under the new name.
- **`requirements.md` stays locked between commands.** The developer never edits a normalized requirements document:
  they accept recommendations in `requirements-report.md`, and this skill carries them into `requirements.md`. So
  once a feature's `requirements.md` is normalized, its lock is **held** for as long as the developer is working
  through the findings, not only while a command runs:
  - **It starts** when a command first locks the normalized `requirements.md` (normalization, a CREATE or APPEND run,
    or the first "Next", "Accept" or "Accept all" of a session). A waiting template (see *Starting a new feature
    (NEW)*) is never locked: the developer must write in it.
  - **Its lock file says so**: besides the command and time, it holds the line `held: until the findings are
    resolved`, so the next command recognizes it as this skill's own held lock, not a stale one.
  - **Between commands** the file stays read-only and its `.lock` file stays in place; each command makes it
    writable only for its own writes, as below, and read-only again at once.
  - **It is released** — the file made writable, its `.lock` file deleted, and `Lock released <time>` logged — when
    the last open finding is resolved (the Requirements Report Complete Report is appended), when `NEW` starts
    another feature, or when the developer says "Unlock" (or "Unlock requirements"); for "Unlock", warn that edits to
    `requirements.md` by hand are not reflected in `requirements-report.md`.
  - The lock outlives a Claude Code session that ends before the findings are resolved; the next
    `/speckit-requirements` run picks it up as its own. To edit the file without the skill, say "Unlock", or clear
    its read-only attribute (`attrib -R <file>`) and delete its `.lock` file.
  - `requirements-report.md` is **not** held: the developer ticks Accept lines and writes Developer Resolutions in
    it between commands, so its lock lasts only while a command runs.
- **Make the locked file read-only.** Editors do not know about the `.lock` file, so the lock is also
  enforced: right after creating the `.lock` file, make the file read-only (`chmod a-w <file>`; in Git Bash
  on Windows this sets the read-only attribute, as `attrib +R <file>` does). VS Code then refuses to save
  it and offers Retry. Immediately before each of the skill's own writes, make it writable
  (`chmod u+w <file>`), write, and make it read-only again.
- **Lock commands use literal paths, never shell variables or loops.** Write every command that creates,
  removes or changes the attribute of a lock or a locked file with the file's full path spelled out, one command
  per file, e.g. `rm -f -- "<dir>/<file>.lock"` with the real directory and file name in place of the
  placeholders; never `rm $d/$f.lock`, `for f in …; do rm …; done`, or any `rm` built from a variable. Claude Code
  stops a `rm` on a possibly-empty variable path for approval, and in an unattended session the request is denied,
  leaving the lock behind. The same goes for `chmod`, `attrib` and `sha256sum`.
- **While locked**:
  - re-read the part of the file you are about to change immediately before each change;
  - change it only with targeted edits, never by rewriting the whole file (writing a new architecture
    document in CREATE mode is the one exception, since there is nothing to rewrite);
  - if an edit fails because the file changed on disk, re-read it, keep the developers' change, and redo
    your edit on top of it.
- **Tell the skill's own writes from anyone else's by content, never by tool warnings.**
  - Right after each of its own writes, record the file's SHA-256 (`sha256sum <file>`).
  - Before its next write, compute it again. Report "changed by someone else" only when it differs from
    the recorded value, and then show what changed.
  - An editing tool's warning that the file was "modified on disk since you last read it" is **not**
    evidence of another writer: it also appears after the skill's own shell writes. Re-read the file and
    carry on, without reporting it as an outside change.
- **When the command is finished, or abandoned because of an error**, on every exit path: make each locked
  file writable again (`chmod u+w <file>`) and delete every lock file it created, **except** the held lock on
  `requirements.md` (make that file read-only again and leave its `.lock` file in place),record each changed file's
  final SHA-256 in `.specify/requirements.json` under `last_written`(a map from project-root-relative path
  to hash; this key is the one change to that file allowed in APPEND mode), and log
  `Lock released <time>` to the CC CLI terminal, followed by:
  `If you had unsaved edits to <file> open in an editor, reload it before saving (VS Code: "Close" without saving, "Revert File", or accept the "file is newer" comparison), or the older copy will overwrite these changes.`
- **At the start of every command**, before anything else, compare each file it may change with its
  `last_written` hash (skip the check when there is none):
  - a change the developer is expected to make — writing in the **Additional Requirements and Research Requests**
    section, ticking or unticking the box of an Accept line, deleting a `❌ NOT Resolved` line, or writing their own
    resolution under a **Developer Resolution** — is accepted as usual;
  - a change that removes or alters the skill's own text — a `✅ Resolved`, `✅ Requirements File …` or
    `**Notes**:` line, a finding, or a report section — is reported, with what was lost, before
    anything else is done. That is what a stale editor tab saving over the file looks like. Ask the
    developers whether to restore the lost text (from the skill's own record of what it wrote, or from
    git) or keep the file as it is; change nothing until they answer.
- **If a lock file is already present when a command starts**, or a file the skill locks is still
  read-only with no lock file beside it, log what was found and ask the developers whether it is stale
  before continuing; do not delete it, change the attribute, or touch the locked file until they answer.
  The one exception is the held lock on the current feature's `requirements.md` (its `.lock` file holds
  `held: until the findings are resolved` and the file is read-only): that is expected, so carry on without asking.

## Resolution of Findings
After generating the requirements report document, and using Claude Code,  
respond to the following four commands in the CC CLI terminal: `Next`, `Accept` (or `Accept X`), `Accept <ID>, <LETTER>`
and `Accept all`. All of them are matched **case-insensitively**, ignoring surrounding punctuation and trailing periods.

Research results (`RS` ids, see *Research Results*) are findings for every command below: they are open, accepted
and resolved in exactly the same way, and are counted with the other findings in the prompts.

**Resolving a finding** (used by every command) means, for the open finding and its one accepted
recommendation: revise `REQUIREMENTS_PATH_AND_FILENAME` if necessary to reflect it; then turn the finding
into its *Resolved form* (see *Finding layout*): remove its `❌ NOT Resolved` line; insert the `✅ Resolved` lines,
the `✅ Requirements File …` line and the `**Notes**:` line under the title (completing any of them a hand-marked
finding is missing, and never duplicating one already there); write the accepted option's Accept line as
`[X] ➡️ **Accepted**` and every other Accept line of the finding as `[ ] ➡️ **Not Accepted**`, with no instruction
text left on any of them; and remove the Developer Resolution's instruction line, keeping any text the developer
wrote there. In an *Old form* report, resolve it in the *Old form* instead (see *Finding layout*). Then log the
finding's id and title and a one-line summary of the change made to the requirements document (or that none was
needed). Only this skill ever resolves a finding.

**Moving on automatically.** Two events run "Next" on their own, exactly as if the developer had typed it,
so the developer always sees the next open finding without asking:
- **Findings added** — when a CREATE run writes the document, or an APPEND run appends at least one new
  finding, finish the run and then run "Next";
- **A finding resolved** — when "Accept" or `Accept <ID>, <LETTER>` resolves a finding, run "Next". "Accept all"
  runs "Next" once, after its report.

"Next" never chooses a recommendation itself; it resolves only what the developer has ticked in the file.
When nothing was resolved ("Accept all" accepted nothing), do not move on.

   1. "Next", "Whats next" or "What's next" (when a new feature's template is waiting, "Next" handles it instead;
      see *Starting a new feature (NEW)*):
      - **First, apply any pending input** in the **Additional Requirements and Research Requests** section (see
        *Additional Requirements and Research Requests*); the new findings it adds take part in the sweep below.
      - **Then sweep every open finding in the document**, in document order (an open finding is one not
        fully resolved, see *Finding layout*; this includes one marked resolved by hand). A box counts as ticked
        as *Reading a report* says. For each:
        - **Exactly one Accept line ticked** (by the developer in the file, then saved) →
          resolve the finding with it (see *Resolving a finding*): this updates the requirements document,
          adds the `✅ Resolved` line, the `✅ Requirements File Updated` line (or `✅ Requirements File
          Unchanged` when no edit was needed) and the `**Notes**:` line, and removes the instructions.
        - **More than one Accept line ticked** → resolve nothing for it; remember it for the report below.
        - **No Accept line ticked** → leave it as it is.
        - **Marked resolved by hand** (`✅ Resolved` present, but the requirements line or `**Notes**:`
          missing) → log: `Finding <id> was marked ✅ Resolved by hand, but the requirements document was not
          updated. Please do not mark findings resolved yourself: tick one Accept line [X], save
          the file, and Type or Say "Next".` Then, if exactly one of its Accept lines is ticked, resolve
          it as above, which completes the missing lines; otherwise remove the hand-written `✅ Resolved`
          line, so the finding is plainly open again.
      - **A ticked Developer Resolution** is resolved like any other recommendation, using the text the developer
        wrote under it. If it is ticked but holds only its instruction line(s), resolve nothing for it: report
        it and ask the developer to write their resolution under it.
      - **Keep the `❌ NOT Resolved` lines in step** (new-form reports only): add the line, after the explanation, to
        every open finding that lacks it, and remove it from every resolved finding that still has it.
      - **Then report the sweep**: one line per finding resolved (its id, its title, and the accepted
        recommendation), one line per finding with more than one Accept line ticked (asking the
        developer to leave exactly one ticked), and the updated counts (open and resolved). When the sweep
        resolved the last open finding, append the Requirements Report Complete Report (see *Requirements Report Complete Report*).
      - **Then proceed as if the developer had typed "Next" again**: take the first finding still open and
        show it and its recommendation(s), with a brief explanation of the pros and cons of each option
        when there are several, and let the developer choose (see *Prompting The Developer*). The second
        pass finds nothing ticked to resolve, so it only shows.

      - If there are no open findings, respond with:
 ```
⚪
⚪ All findings have been resolved:  
⚪ ✅ Inconsistencies ✅ Ambiguities ✅ Unspecified Aspects ✅ Needs Clarifications  
⚪  
⚪  The requirements are ready for /speckit-specify.  
⚪  
🟩 At the prompt, Type:  
🟩 👉 /speckit-specify <REQUIREMENTS_PATH_AND_FILENAME>  
⚪  
  ```

   2. "Accept", or "Accept X" where X is an option letter:
      - Accept, for the first open finding, the recommendation named: `Accept X` takes option X; a plain
        `Accept` takes the single **Recommendation**, or the option marked `_(recommended)_` when there are
        several. If the developer has already ticked exactly one Accept line, a plain
        `Accept` takes that one. `Accept X` naming the **Developer Resolution** takes it only when the developer
        has written a resolution under it; otherwise say so and change nothing.
      - Resolve the finding with it (see *Resolving a finding*), give a brief explanation of the
        recommendation, then run "Next" (see *Moving on automatically*).

   3. "Accept all":
      - The developer has read every proposed recommendation and wants them applied in one pass. Work
      through **every** open finding, in document order, and resolve each one exactly as "Accept" would,
      with one exception:

         - **A finding that offers more than one option is skipped**, unless the developer has ticked
         exactly one of its Accept lines (then that option is used). Leave a skipped finding as it
         is, change nothing in the requirements document for it, and carry on with the next finding.
         - A finding with a single recommendation (no alternatives to choose between) is resolved with it.

      - When the pass is finished, report, in this order:
         1. the findings resolved, two lines each: line one with the finding's id and title, line two with
         the recommendation letter (if more than one recommendation) and a one-line summary of the accepted
         recommendation;
         2. the counts: resolved, and how many findings remain open.

      - If every open finding offers options with none ticked, accept nothing and say so plainly; if none
      do, the pass resolves them all and the document is ready for the next phase.
      - When at least one finding was resolved, run "Next" after the report; it shows the first finding
      still open (one that offers options) or the all-resolved message.
      - The rules of "Accept" hold throughout: surgical edits to the requirements report document and to
      `REQUIREMENTS_PATH_AND_FILENAME`, and no edit to any other artifact.

   4. `Accept <ID>[,] [<LETTER>]`, e.g. `Accept AM2, B`, `accept am2 b`, `Accept UA3`:
      - **Reading it**: "Accept all" is checked first; then `Accept` followed by an id — category letters and a
        number, `(IN|AM|UA|NC|RS)\d+` — then an optional `,`, then an optional option letter. A single letter after
        `Accept` (`Accept B`) is always command 2's `Accept X`, never an id.
      - **Any open finding** may be named, in any order; the findings before it stay as they are.
      - **With a letter**, accept that option. The command wins over the file: if another Accept line of the
        finding is ticked, clear that tick, so the finding resolves with the option the command named. On a single,
        unlettered **Recommendation**, the letter `A` names it.
      - **Without a letter**, accept the one Accept line ticked in the file, if exactly one is; otherwise the single
        **Recommendation**, or the option marked `_(recommended)_`.
      - **Refusals** — say why and change nothing when: the id is not in the report; the finding is already
        resolved; the letter names no option of the finding; or the letter names a **Developer Resolution** that
        holds only its instruction line(s) (ask the developer to write their resolution under it first).
      - Resolve the finding with it (see *Resolving a finding*), with `accepted by "Accept <ID>, <LETTER>"` in its
        `**Notes**:` line, give a brief explanation of the recommendation, then run "Next" (see *Moving on
        automatically*).


## Prompting The Developer

After creating or appending to the requirements report document — and at the end of every command (Next, Accept,
Accept X, Accept <ID>, <LETTER>, Accept all)  
the user will be prompted as described below.  
`<FINDING_ID>` is the current finding's id, in every line that names it.

When none of the open findings have options:
⚪  
🟩 Current Status  👉  Open Findings: N      Resolved Findings: M  
🟩  
🟩 The Findings and Recommendations are in:
🟩 👉 <REQUIREMENTS_DIRECTORY>/requirements-report.md   
🟩 Open that file in your editor to read and optionally accept recommendations.
🟩  
🟩 Current finding: <FINDING_ID> <FINDING_TITLE>   
🟩 Recommendation: <RECOMMENDATION_SUMMARY>
⚪  
⚪ Type/Say 👉 "Next" - after ticking one or more Accept lines "[X]" in the file (and saving it)  
⚪ Type/Say 👉 "Accept All" - to accept all Recommendations  
⚪ Type/Say 👉 "Accept <FINDING_ID>" - accept the Recommendation for the current finding  
⚪  
  
and when there is at least one open finding with options, and just one option for the current finding:  
⚪  
🟩 Current Status  👉  Open Findings: N      Resolved Findings: M  
🟩  
🟩 The Findings and Recommendations are in:
🟩 👉 <REQUIREMENTS_DIRECTORY>/requirements-report.md   
🟩 Open that file in your editor to read and optionally accept recommendations.
🟩  
🟩 Current finding: <FINDING_ID> <FINDING_TITLE>   
🟩 Recommendation: <RECOMMENDATION_SUMMARY>
⚪  
⚪ Type/Say 👉 "Next" - after ticking one or more Accept lines "[X]" in the file (and saving it)  
⚪ Type/Say 👉 "Accept All" - to accept all Recommendations with one option  
⚪ Type/Say 👉 "Accept <FINDING_ID>" - to accept the Recommendation for the current finding  
⚪  
  
and when there are multiple options for the current finding:  
⚪  
🟩 Current Status  👉  Open Findings: N      Resolved Findings: M  
🟩  
🟩 The Findings and Recommendations are in:
🟩 👉 <REQUIREMENTS_DIRECTORY>/requirements-report.md   
🟩 Open that file in your editor to read and optionally accept recommendations.
🟩 
🟩 Current finding: <FINDING_ID> <FINDING_TITLE>   
🟩 Suggested Recommendation <SUGGESTED_RECOMMENDATION_LETTER>:  <RECOMMENDATION_SUMMARY>
⚪  
⚪ Type/Say 👉 "Next" - after ticking one or more Accept lines "[X]" in the file (and saving it)  
⚪ Type/Say 👉 "Accept All" - to accept all Recommendations with one option  
⚪ Type/Say 👉 "Accept <FINDING_ID>, X" - to accept Recommendation X where X is the option letter for the current finding  
⚪ Type/Say 👉 "Accept <FINDING_ID>" - to accept Recommendation <SUGGESTED_RECOMMENDATION_LETTER> (recommended) for the current finding  
⚪  



## Requirements Report Complete Report

After executing an instruction after which there are no more open findings, the skill appends a final Requirements Report Complete Report summarizing the state of the requirements document. It is written once, after every other change that instruction made, so its counts are final; an instruction that leaves any finding open appends no report.
The report goes as its own numbered section at the end of the requirements report document.

A document holds at most one Complete Report:
- When a command adds a finding to a document that already has a Complete Report (an APPEND run, or "Next" applying
  additional requirements), that command removes the report, since its counts and its "ready for /speckit-specify" line
  are no longer true.
- When the last open finding is resolved again, a new report is appended at the end of the document, numbered
  after the section before it, with the totals of the whole document.

```markdown
## 8. Requirements Report Complete Report  
  
- **Requirements Report Document:** <REQUIREMENTS_DIRECTORY>/requirements-report.md  
- **Requirements Document:** <REQUIREMENTS_DOCUMENT_PATH>  
- **Software Architecture Diagrams:** s  
- **Inconsistencies:** i  
- **Ambiguities:** a  
- **Unspecified Aspects:** u  
- **Needs Clarifications:** n  
- **Research Results:** r  
- **Breaking Changes:** b  
- **Technical Debt items:** t  
  
The requirements are ready for /speckit-specify.
To generate specs from the requirements document, use the `/speckit-specify` skill followed by the path (relative to the project root) to the requirements file.
At the prompt, Type:  
🟩 👉 /speckit-specify <REQUIREMENTS_PATH_AND_FILENAME>  

```

- **Requirements document** is its project-root-relative path; when this instruction renamed it, show
  `<old path> → <new path>`.
- The finding counts are the totals in the whole document; 

  
Note: Breaking Changes and Technical Debt items are not considered a failure, but they should be documented in the architecture document and the Requirements Report Complete Report.
