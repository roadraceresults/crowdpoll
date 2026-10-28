---
name: "speckit-research"  
description: "Research a set of requirements and recommend how to satisfy them, before any specification is written. Reads the High Level Requirements section of <directory>/research.md, writes its findings and Clarifications into the same file, and has the developer walk the Clarifications one at a time: 'What's next' shows the next open clarification and a recommendation, 'Accept' records the chosen resolution and carries it into the research, 'I resolved it' records one the developer settled by hand, 'Apply all' takes every clarification that offers a single recommendation in one pass. 'Generate requirements' then turns the finished research into high-level-requirements.md, the document /speckit-specify and /speckit-mdd-architecture take as their input."  
argument-hint: "<path/to/research.md | path/to/research-directory> [What's next | Accept [option] | I resolved it | Accept as-is | Apply all | Generate requirements]"  
compatibility: "Requires a directory dedicated to one research topic. The skill creates research.md there if it does not exist. No .specify/ state is read or written."  
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebFetch, WebSearch, Skill
user-invocable: true  
disable-model-invocation: false
metadata:  
    - author: "David Brooks"  
---

# Skill Name / Purpose

This speckit-research skill does the work of an engineer asked "can we do this, and how?" before
anyone writes a specification. It reads the **high level requirements** the developer has entered in
`research.md`, investigates each item in them against the **current implementation**, and writes what
it found — with a recommendation per item — into the same file. Where the requirements do not say
enough to decide, it stops and asks, in writing, rather than guessing.

The work lives in a directory dedicated to one research topic:

```
<research directory>/
├── research.md                 # the developer enters the high level requirements; this skill writes the findings and clarifications below them
└── high-level-requirements.md  # this skill writes this on request: what to build, from the findings
```

One file, `research.md`, holds both the initial requirements and the research results. It is divided
into sections:

| Section | Written by |
|---|---|
| `# Overview` (the Document History table and legend) | this skill creates it and keeps `Last updated` current |
| `# High Level Requirements` | **the developer**; this skill never edits it |
| `# Research Findings` | this skill, below the requirements |
| `# Clarifications` | this skill, below the findings |

The skill:

1. **Researches** the items in the `# High Level Requirements` section against the code as it stands,
   and writes the findings and recommendations into `research.md`.
2. **Raises Clarifications** for everything it cannot settle from the requirements and the code, each
   with a recommendation — or with two or more options when the choice is genuinely the developer's.
   While clarifications are open the research is *not* finished: the answers change what is worth
   researching, so the skill asks first and completes afterwards. The developer iteratively resolves
   the clarifications until all high level requirements are fully specified.
3. **Answers four commands** about those clarifications, for as long as any remain open:
   - **"What's next"** — show the next open clarification and its recommendation.
   - **"Accept"** — record the recommended (or chosen) resolution, carry it into the research, and
     check the clarification off with `[X]`.
   - **"I resolved it"** — record that the developer settled it by hand, marking it `[-]`.
   - **"Apply all"** — take every open clarification that offers a single recommendation in one
     pass, and report the ones skipped because they offer options.
4. **Generates the high-level requirements** on request, once the research is settled: a
   `high-level-requirements.md` in the same directory that says what should be built, in the form
   `/speckit-specify` and `/speckit-mdd-architecture` read.

**This skill never changes the implementation.** It reads the codebase freely and writes exactly two
files, both inside the research directory: `research.md` and — on request —
`high-level-requirements.md`. Nothing under `src/`, `tests/`, `specs/` or `.specify/` is modified, and
no branch is created or commit made. Its output is the input to `/speckit-mdd-architecture` or
`/speckit-specify`, not a substitute for them.

## Core Instructions

### User Input

`$ARGUMENTS` is the raw text the developer typed after `/speckit-research`. Tokenize it on whitespace,
honoring quotes (`"..."` or `'...'`) so a path containing spaces stays one token, then interpret it in
this order:

1. **The path argument.** The first token that names an existing file or directory is the research
   target, and is removed from the token list:
   - a path ending in `research.md` — use it;
   - a path to a **directory** — use `research.md` inside it (it need not exist yet; see *Creating
     research.md*);
   - a path ending in some other `.md` name → fail with:
     `ERROR: The research document must be named research.md. Found: <name>.`
   - Relative paths resolve from the project root. At most one path token is allowed; two or more →
     fail with `ERROR: More than one path given: <a>, <b>.`
2. **The remaining text** (all entries are case-insensitive; ignore surrounding punctuation,
   apostrophes and trailing periods) is one of:

   | Remaining text | Meaning |
   |---|---|
   | *(empty)* | **Research mode** — run or continue the research (see *The research pass*), then print the status summary. |
   | `Whats next`, `What's next` | **Question 1** — show the next open clarification. |
   | `Accept` — optionally followed by an option label, e.g. `Accept 2`, `Accept, option B` | **Question 2** — record the resolution of the next open clarification. |
   | `I resolved it`, `We resolved it` | **Question 3** — the developer settled the next open clarification by hand. |
   | `Accept as-is`, `Won't resolved` | **Question 3 variant** — the developer consciously leaves the clarification unanswered and accepts whatever the recommendation assumed. |
   | `Apply all`, `Apply all recommendations` | **Question 4** — record every open clarification that offers a single recommendation, and report the ones that offer options. |
   | `Generate requirements`, `Requirements` | **Question 5** — write `high-level-requirements.md` from the finished research. |
   | Anything else | Fail with: `ERROR: Unrecognized argument(s): <text>. Usage: /speckit-research <path/to/research.md> [Whats next \| Accept [option] \| I resolved it \| We resolved it \| Accept as-is \| Won't resolved \| Apply all \| Apply all recommendations \| Generate requirements \| Requirements]` |

   Test `Accept as-is` before `Accept`, so that "as-is" is never read as an option label.

**Follow-up turns.** After this skill has run once in a conversation, the same phrases typed as plain
chat messages (without the `/speckit-research` prefix) — "What's next", "Accept", "I resolved it",
"Apply all", "Generate requirements" and their synonyms above — are answered exactly as if they had been passed as
`$ARGUMENTS`, against the same research directory. A bare option label ("2", "option B", "the second
one") given right after a *What's next* answer that offered options records the developer's choice for
the following *Accept*.

The path argument is required on the first invocation of a conversation; afterwards it is remembered
and may be omitted. Invoked with no path and no remembered directory → fail with:
`ERROR: No research directory given. Usage: /speckit-research <path/to/research.md>`

### Locating the files

Keep these for the whole conversation:

- **`RESEARCH_DIRECTORY`** — the directory holding the research document. It is dedicated to this one
  research topic; everything this skill writes goes inside it.
- **`RESEARCH`** = `<RESEARCH_DIRECTORY>/research.md`. It holds both the high level requirements the
  developer enters and the research results this skill writes. If it does not exist, the skill creates
  it (see below).
- **`HIGH_LEVEL_REQUIREMENTS`** = `<RESEARCH_DIRECTORY>/high-level-requirements.md`, written only by
  Question 5.

Timestamps written into `RESEARCH` are local time in the form `YYYY-MM-DD HH:MM`, obtained from the
shell (`date '+%Y-%m-%d %H:%M'`), never guessed.

### Creating research.md

**If `RESEARCH` does not exist**, create it (and the research directory, if it is missing) with exactly
this content, substituting the path and the timestamps:

````markdown
# Overview 

## Document History

| Record | Value |
|---|---|
| Research directory | <path to research.md file> |
| Research results file created | YYYY-MM-DD HH:MM |
| Last updated | YYYY-MM-DD HH:MM |

Legend: `[ ]` open · `[X]` resolved · `[-]` resolved manually (or accepted as-is) by the developer.

"What's next" always returns the first `[ ]` item.  

# High Level Requirements  

Enter the initial high level requirements here.
Clarifications will then be requested below.  
Iteratively resolve the requested clarifications until all high level requirements are fully specified.

````

Then stop: there is nothing to research yet. Report that the file was created at its path, that the
developer should enter the high level requirements under `# High Level Requirements`, and that running
`/speckit-research` again starts the research. Do not research the placeholder text.

Everything the research produces is written below the `# High Level Requirements` section.

### Updating an existing research.md

**If `RESEARCH` already exists**, it is the developer's working record, and both the requirements and
the resolutions recorded in it are the point of the file. Preserve them:

1. **Never edit the `# High Level Requirements` section.** It is the developer's text. Read it; do not
   rewrite, reformat or trim it.
2. **Never discard a resolved clarification.** A clarification marked `[X]` or `[-]`, and the
   resolution recorded under it, survives every later run verbatim.
3. **Carry the resolutions into the research.** Every clarification the developer has resolved since
   the previous run is now an input: re-do the part of the research that was waiting on it and write
   the finding, rather than leaving the question standing.
4. **Update `Last updated`** in the Document History table on every write; leave `Research results file
   created` as it is.
5. The findings themselves may be rewritten freely — they are this skill's output, not the developer's.
   It is permissible to regenerate the `# Research Findings` section from scratch when the requirements
   or the resolutions have moved on; only the high level requirements and the clarifications'
   checkboxes and recorded resolutions are protected.

### The research pass

Run this in *research mode* (an invocation with no command), and again after the last open
clarification is closed.

1. **Read `RESEARCH` in full.** Take the items to research from the `# High Level Requirements` section
   and nothing else. If that section still holds only the placeholder text, there is nothing to
   research: say so and stop.
2. **Research each item against the current implementation**: read the code, the tests, the
   configuration and the data model that bear on it; run read-only commands (`grep`, `git log`, a test
   run) where they answer a question; consult external documentation when the item turns on a
   third-party library, a standard or a platform limit.
3. **Write the findings** in a `# Research Findings` section below the requirements, one section per
   item of the requirements, in the requirements' own order and using its own words for the item's
   title. Each finding states:
   - **What was found** — the mechanism as it is today, with the file and line references that prove
     it, so a reader can check the claim rather than trust it;
   - **What it would take** — the shape of the change, its blast radius, and what it would break;
   - **Recommendation** — what you would do, and why; alternatives considered and why they lost.
4. **Raise a Clarification** (see below) for anything the requirements do not settle and the code
   cannot answer: a value only the developer knows, a choice between two defensible behaviours, a
   scope boundary, a constraint that might be negotiable. **Do not guess.**
5. **Stop when clarifications are open.** A research item that depends on an unanswered clarification
   gets its section, its findings so far, and a line naming the clarification it waits on — not a
   speculative recommendation. Finish the items that do not depend on an answer.
6. Print the status summary.

Two rules govern the research itself:

- **Base it only on the `# High Level Requirements` section and the current implementation.** Do not
  carry in requirements, decisions or vocabulary from earlier research, specifications or features
  that look similar; if a previous decision is relevant, it is relevant as *code that exists*, cited
  as such.
- **Treat no current constraint as non-negotiable.** An existing limit, schema, contract, convention or
  architectural choice is evidence of what is, not a boundary on what could be. When the best answer
  needs one of them changed, say so and cost it; note separately when a constraint is genuinely fixed
  (a platform limit, a standard, a legal requirement) and why.

### The clarification format

Clarifications live in a Level One section of `RESEARCH`, below the findings:

```markdown
# Clarifications
```

Each one is a Level Two section on this template:

```markdown
## Clarification## <title>
[ ] Resolved
Description of the clarification.
### Recommendation
Description of the recommended resolution.
```

When the choice is genuinely the developer's, the recommendation is split into Level Four options:

```markdown
## Clarification## <title>
[ ] Resolved
Description of the clarification.
### Recommendation
#### Option 1
description of option 1
#### Option 2
description of option 2
```

Rules for reading and writing them:

- Give each option a brief **pros** and **cons**, and say which one you recommend and why. An option
  list without a recommendation is an abdication, not a question.
- The **checkbox line** is the first line after the title that matches `[ ]`, `[X]`, `[x]` or `[-]`,
  optionally followed by a word such as `Resolved`.
- Clarifications are taken **in file order**. "The next open clarification" is the first one, reading
  top to bottom, whose checkbox is `[ ]`.
- A clarification is **not** a place to park work the skill could do itself. Ask only what the
  developer alone can answer.

### Status summary

After every invocation — research mode and each command — print:

```
research.md — <RESEARCH_DIRECTORY>
  Research items: <n> (<complete> complete, <waiting> waiting on a clarification)
  Clarifications  Open [ ]: 3   Resolved [X]: 5   Manual [-]: 1
Next open clarification: <title>
Say "What's next" for the recommendation, "Accept" to record it, "I resolved it" if you decided it yourself, or "Apply all" to take every one that offers a single recommendation.
```

When no clarification is open and every item is complete, say so instead, and offer the next step:
`Say "Generate requirements" to turn this into high-level-requirements.md.` Once that document
exists, name it — with its own last-written timestamp — in place of the offer, and say whether the
research has moved since it was written.

### Question 1 — "Whats next" / "What's next"

Show **the first clarification in `RESEARCH` whose checkbox is `[ ]`**, reading top to bottom.

- If there is none, respond with exactly: **All clarifications resolved.** — followed by one line
  saying whether the research is complete, and if it is not, that an invocation with no command
  finishes it.
- Otherwise, re-read the clarification and the part of the requirements and the code it bears on, so
  the recommendation is grounded in the current text rather than in what you remember, and log:

```
Next clarification: <title>
  <the description, in one to three lines>

Recorded recommendation: <the Recommendation section as written in the file>

Recommended resolution:
  <what you would record, and what it would change about the research that follows — specific
   enough that "Accept" needs no further decisions>
```

- When the file offers options, list them as they are written (Option 1 / Option 2 / …) with their
  pros and cons, state which you recommend and why, and end with:
  `Choose an option and say "Accept", or say "I resolved it" if you decide it yourself.`
- Questions 1 and 3 never change the research; only *Accept* and *Apply all* do.

### Question 2 — "Accept"

Records a resolution for **the same clarification that "What's next" would show** (the first `[ ]`).

1. **Determine the resolution**: the option the developer chose (with the command, e.g. `Accept 2`,
   or as a follow-up to *What's next*), else the one you recommended for this clarification earlier in
   the conversation, else work it out now as *What's next* would. If that yields options and the
   developer has not chosen, **present them and stop** — do not guess.
2. **Record it in the clarification**: set the checkbox to `[X]` and append, at the end of that
   clarification's section, a `### RESOLUTION` subsection saying what was decided, which option was
   taken when there were several, and the timestamp.
3. **Carry it into the research**: revise the finding(s) that were waiting on this answer — replace
   the "waits on" line with the research the answer unlocks, and adjust any recommendation the answer
   changes. This is the point of the command; a resolution recorded but not used is half the work.
4. **Update `Last updated`.** Change nothing else in the file, and no file outside it.
5. Log:

```
Recorded <title>: <one-line description of the decision>
  Research updated: <the sections revised, or "none — nothing was waiting on it">
  research.md: marked [X]
Remaining open clarifications: 2 — say "What's next" to continue.
```

### Question 3 — "I resolved it" / "We resolved it"

The developer has settled **the next open clarification** themselves, in the file or in the chat.

1. Read what they wrote. If the answer is in the file, take it from there; if it is in the chat, take
   it from there; if neither says what was decided, say so plainly and ask — do not invent a decision.
2. Set the checkbox to `[-]`, append a `### RESOLUTION` subsection recording the decision as the
   developer stated it and the timestamp, and update `Last updated`.
3. **Carry it into the research** exactly as Question 2 step 3 does.
   - For the *Accept as-is* / *Won't resolved* variant, record instead:
     `Resolution: accepted as-is by the developer — the recommendation's assumption stands (<timestamp>)`,
     and let the research proceed on that assumption, naming it.
4. Log the same shape as Question 2, with `marked [-] — resolved by the developer`.

### Question 4 — "Apply all" / "Apply all recommendations"

The developer has read every recommendation and wants them recorded in one pass. Work through **every**
clarification whose checkbox is `[ ]`, in file order, and record each exactly as *Accept* would —
with one exception:

- **A clarification that offers more than one option is skipped.** Leave its checkbox `[ ]`, record
  nothing for it, and carry on with the next one.
- A clarification with a single recommendation is recorded: `[X]`, its `### RESOLUTION`, and the
  research it unlocks.

When the pass is finished, report, in this order:

1. the clarifications recorded, one line each: the title, the decision, and what it unlocked;
2. the clarifications skipped because they offer options, one line each with the option labels and the
   instruction to choose — "say the option (for example `Accept 2`) or resolve it by hand" — because
   *Apply all* will keep skipping them;
3. the counts: recorded, skipped-for-options, and how many remain open.

If every open clarification offers options, record nothing and say so plainly. If none do, the pass
closes them all — then finish the research and say that the file is ready for
`/speckit-mdd-architecture` or `/speckit-specify`.

### Question 5 — "Generate requirements" / "Requirements"

Turns the finished research into `HIGH_LEVEL_REQUIREMENTS` — the document `/speckit-specify` reads to
produce a specification, and `/speckit-mdd-architecture` reads when the work is large or structural
enough to want an architecture pass first.

1. **Check the research is ready.** Every research item complete and every clarification closed.
   - Clarifications still open → say which, and ask whether to generate anyway. Generating with open
     questions is allowed (the developer may want a draft), but each unanswered one is then written
     into the document as an explicit open question rather than silently assumed.
   - Research items still waiting on an answer → finish them first (a research pass with no command).
2. **Write the document from the research, not from the requirements the developer entered.** The
   `# High Level Requirements` section asked for things; this document states decisions. Every
   requirement it contains traces to a finding or a recorded resolution in `research.md`; nothing new
   is invented here, and nothing the research rejected survives.
3. **Write what to build, not how it was investigated.** No findings, no file-and-line citations, no
   options weighed, no "the research showed" — those stay in `research.md`. What crosses over
   is the decision and, where it is load-bearing, one sentence of the reason.
4. **Follow the house shape** of the project's other high-level requirements documents — read one or
   two before writing (in this project, `designDocs/###-high-level-requirements-*.md`) and match their
   skeleton and voice rather than inventing a format. In this project that is: a first line naming the
   spec to create, then `# Overview`, `# Design`, `# Functional Requirements`, `# Assumptions`,
   `# Exclusions`. Where a mockup, a screenshot or a diagram informed the research, reference it by
   path as those documents do.
5. **Say what is out of scope.** The research will have touched things the developer decided not to
   do; naming them under `# Exclusions` is what stops the next phase re-opening them.
6. **Never overwrite silently.** If `HIGH_LEVEL_REQUIREMENTS` exists, say so, show what would change
   at a heading level, and ask before replacing it. The developer's hand edits to that file outrank
   anything this skill would regenerate.
7. Log:

```
Wrote high-level-requirements.md — <RESEARCH_DIRECTORY>
  <n> requirements, from <m> research items and <k> recorded resolutions
  Open questions carried into the document: <none | list>
Next: copy or move it to designDocs/ as ###-high-level-requirements-<NAME>.md, then run
/speckit-mdd-architecture on it (for structural work) or /speckit-specify (for a contained change).
```

This skill writes the document inside the research directory and stops there: moving or renaming it
into the project's requirements folder is the developer's step, because only they know the number and
the name the next feature should carry.

### Operating Constraints

- **Two files are written, both inside the research directory**: `research.md`, and
  `high-level-requirements.md` when Question 5 is asked. No source file, test, specification, the
  `# High Level Requirements` section of `research.md`, or `.specify/` state is modified by this
  skill, ever. It does not create a branch and does not commit.
- **Never discard a recorded resolution.** Checkboxes move `[ ]` → `[X]` / `[-]` only, and only on the
  developer's word; they are reopened only when the developer asks ("reopen <title>" → `[ ]`).
- **Never invent an answer to a clarification.** An unanswered question stays open, and the research
  that depends on it stays unfinished and says so.
- **Cite, don't assert.** Every claim about the current implementation carries the file and line that
  shows it; every claim about a library, standard or platform carries its source.
- **One clarification at a time, except when asked for all of them.** *What's next*, *Accept* and
  *I resolved it* act on the first open clarification; *Apply all* works through the
  whole open list, and even then records only those offering a single recommendation.
- **Research only what the requirements ask.** Findings beyond their scope — however interesting —
  belong in one short "Also noticed" line at the end of the findings, not in the body.
- Keep console output short and concrete: titles, file paths with line references, and the exact
  decision being recorded.

### Examples

| Invocation / message | Effect |
|---|---|
| `/speckit-research designDocs/research/live-updates` | If `research.md` does not exist there, creates it with the empty template and stops, asking the developer to enter the high level requirements. |
| `/speckit-research designDocs/research/live-updates/research.md` | With requirements entered: researches each item, writes the findings and 3 clarifications below them in the same file, and prints the status summary. |
| `/speckit-research` (same conversation, later) | Re-runs the research over the remembered directory, carrying in every resolution recorded since. |
| `What's next` / `Whats next` | Shows the first open clarification with its recommendation, or its options with pros and cons. |
| `Accept` / `Accept 2` | Records the resolution, revises the findings that waited on it, marks `[X]`. |
| `I resolved it` / `We resolved it` | Records the developer's own decision, marks `[-]`, and carries it into the research. |
| `Accept as-is` / `Won't resolved` | Leaves the clarification unanswered on purpose; the recommendation's assumption stands, marks `[-]`. |
| `Apply all` / `Apply all recommendations` | Records every clarification offering a single recommendation; lists those offering options. |
| `What's next` (nothing open) | `All clarifications resolved.` plus whether the research still needs a finishing pass. |
| `Generate requirements` / `Requirements` | Writes `high-level-requirements.md` beside the research, in the house shape, from the findings and the recorded resolutions. |
| `Requirements` (clarifications still open) | Names them and asks whether to generate a draft that carries them as explicit open questions. |
