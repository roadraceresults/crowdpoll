---
name: "speckit-concise-claudemd"
description: "Keep CLAUDE.md concise: move what is new in it to CLAUDE_COMPLETE.md, then condense CLAUDE.md back to the current plan, the overview, layout, commands and cross-feature rules. Run by hand after a feature is implemented, before it is committed or merged."
allowed-tools: Read, Write, Edit, Bash
user-invocable: true
disable-model-invocation: true
metadata:
    - author: "David Brooks"
---

# Skill Name / Purpose

`CLAUDE.md` is sent with almost every request, and the shipped Spec Kit skills keep writing into it. This skill keeps
it concise while nothing is lost:

- `CLAUDE_COMPLETE.md`, beside it at the repository root, holds the full, current text for developers: every
  feature's summary, newest first, the Spec Kit Workflow list, the settings table and everything else.
- `CLAUDE.md` holds only what a typical request needs.
- `.claude/rules/environment.md` holds the settings table, loaded only when configuration files are touched.

The first run makes the split; every later run brings `CLAUDE_COMPLETE.md` up to date with what changed in `CLAUDE.md`
since the previous run, then condenses `CLAUDE.md` again.

## User Input

```text
$ARGUMENTS
```

The command takes no arguments. If the text above is not empty after trimming, print
`ERROR: Unrecognized argument(s): <text>. Usage: /speckit-concise-claudemd` and stop, writing nothing.

## Rules for every run

- Write only `CLAUDE.md`, `CLAUDE_COMPLETE.md` and `.claude/rules/environment.md`. Never change a shipped Spec Kit
  skill or extension (`speckit-specify`, `-clarify`, `-plan`, `-tasks`, `-analyze`, `-implement`, `-checklist`,
  `-constitution`, `-taskstoissues`, `-agent-context-update`, `.specify/extensions/`) or any other file.
- Write both files without asking. Never ask the developer a question. Never stage or commit anything.
- Change existing files with targeted edits; write a file whole only when creating it, or when writing the concise
  `CLAUDE.md` on the first run.
- Write no size limit (line, bullet or token count) into any file. Conciseness is a judgement, made visible by the
  size report.
- `CLAUDE.md` names `CLAUDE_COMPLETE.md` exactly once, in backticks, for developers. Never put `@` before it, and
  never write a sentence that asks the AI to read it.
- Run shell commands in Git Bash from the repository root.

## Outline

### 1. Pre-checks

1. `CLAUDE.md` must exist, else print `ERROR: CLAUDE.md not found` and stop.
2. It must hold both `<!-- SPECKIT START -->` and `<!-- SPECKIT END -->`, else print
   `ERROR: CLAUDE.md has no <!-- SPECKIT START --> / <!-- SPECKIT END --> markers` and stop.
3. Measure both files before anything is written: `wc -l -m CLAUDE.md CLAUDE_COMPLETE.md` (an absent
   `CLAUDE_COMPLETE.md` counts as `0 lines`, `0 tokens`).
4. If `git status --porcelain -- CLAUDE_COMPLETE.md` prints anything, note in one line that `CLAUDE_COMPLETE.md` has
   uncommitted changes (a previous run not yet committed) and carry on; removals are then not carried over (step 3).

Then take step 2 when `CLAUDE_COMPLETE.md` does not exist, otherwise step 3.

### 2. First run (no `CLAUDE_COMPLETE.md`)

1. Copy byte for byte: `cp CLAUDE.md CLAUDE_COMPLETE.md`. Do not edit the copy; its SPECKIT markers stay.
2. Create `.claude/rules/environment.md`: the frontmatter below, then the `## Environment Variables` heading, its
   table and its closing paragraph (the "Dev defaults are set in …" line), copied verbatim from `CLAUDE.md`:

   ```markdown
   ---
   paths:
     - "src/config.ts"
     - ".do/app.yaml"
     - "launch.json.example"
     - "devScripts.example/**"
     - "tests/config.test.ts"
   ---
   ```

3. Write the concise `CLAUDE.md` in the layout of *Concise layout* below, from the text now in
   `CLAUDE_COMPLETE.md`. The cross-feature invariants are drawn from the whole chain (*Choosing a cross-feature
   invariant*).
4. Go to step 4.

### 3. Later run (`CLAUDE_COMPLETE.md` exists)

1. **Baseline**: `BASE=$(git log -1 --format=%H -- CLAUDE_COMPLETE.md)`. `CLAUDE.md` at that commit is the concise
   text the previous run left. If there is no such commit (`CLAUDE_COMPLETE.md` was never committed), compare
   `CLAUDE.md` with `CLAUDE_COMPLETE.md` section by section instead, and carry no removals.
2. **What changed**: read `git diff "$BASE" -- CLAUDE.md` and classify each hunk:
   - **inside the SPECKIT block** → step 3.3;
   - **added outside it** → new text: add it to the matching section of `CLAUDE_COMPLETE.md`, or to the nearest
     fitting section when none matches; never drop it;
   - **changed outside it** → an edit: replace its counterpart in `CLAUDE_COMPLETE.md`, so the old wording does not
     stay beside the new;
   - **removed outside it** → a deletion the developer made by hand (the run's own condensing comes after this diff):
     remove its counterpart from `CLAUDE_COMPLETE.md`, but only when `CLAUDE_COMPLETE.md` has no uncommitted changes
     (step 1.4); otherwise ignore every removal and say so in the report;
   - a new or changed row of a settings table → step 3.4.

   Before adding anything, check that it is not already in `CLAUDE_COMPLETE.md`; add nothing twice. A second run
   without a commit in between then changes nothing.
3. **The SPECKIT block**: accept whatever form it is in (a three-line plan pointer, a summary, or a summary with older
   features pushed down below it). Find the plan path it names first, `specs/<feature>/plan.md`; a feature is known
   by its plan path.
   - When that plan is not yet in the chain of `CLAUDE_COMPLETE.md` (the text inside its SPECKIT markers), add the
     feature's full summary on top of the chain, in the chain's form: it opens with the shipped "For additional
     context … read the current plan:" sentence, then the plan path, its artifacts, the requirements report and its
     "Decisions that are easy to get wrong", and ends with its one-line "No … change" summary. The previous top entry's
     opening sentence becomes "The preceding feature is" followed by its plan path.
   - When the block holds only a pointer, or no decisions for that plan, build the summary and its decisions from that
     `plan.md` and its `research.md`.
   - Any other summaries the block holds (pushed-down older features) are already in the chain or are added below the
     new entry in their order; otherwise never rewrite an existing chain entry.
   - Check the new feature's decisions for a cross-feature invariant (*Choosing a cross-feature invariant*) and add it
     to `CLAUDE.md`'s *Cross-feature invariants*.
4. **Settings**: carry any new or changed setting row into both `.claude/rules/environment.md` and the settings table of
   `CLAUDE_COMPLETE.md` (replacing the old row when changed), then remove it from `CLAUDE.md`.
5. **Condense `CLAUDE.md`** back to *Concise layout*: the SPECKIT block becomes the current plan only; any other new
   text is shortened to what a typical request needs, or left in `CLAUDE_COMPLETE.md` only.

### 4. Report

Measure both files again with `wc -l -m`. Tokens ≈ characters ÷ 4, rounded to the nearest 100. Print:

```text
/speckit-concise-claudemd — <first run | run>

                       Before                 After
CLAUDE.md            <l> lines ≈<t> tokens   <l> lines ≈<t> tokens
CLAUDE_COMPLETE.md   <l> lines ≈<t> tokens   <l> lines ≈<t> tokens
(tokens ≈ characters ÷ 4)

Moved to CLAUDE_COMPLETE.md:
  - <section>: <what>
Removals not carried over: CLAUDE_COMPLETE.md has uncommitted changes
Condensed in CLAUDE.md:
  - <section>: <what>
Settings rule (.claude/rules/environment.md): <created | updated: <names> | unchanged>

Review with: git diff -- CLAUDE.md CLAUDE_COMPLETE.md .claude/rules/environment.md
Nothing was staged or committed.
```

- One line per section changed under *Moved* and *Condensed*; `nothing new` when nothing moved. On the first run,
  *Moved* reads `everything (verbatim copy)`.
- Print the *Removals not carried over* line only when step 1.4 found uncommitted changes and the diff had removals.

## Concise layout

`CLAUDE.md` holds these sections, in this order:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
The full description, every earlier feature's decisions and the settings table are in `CLAUDE_COMPLETE.md`, for developers.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/<feature>/plan.md` (<its artifacts, one sentence>). Decisions that are easy to get wrong:
- **…**
<!-- SPECKIT END -->

## Project Overview
## Layout
## Commands
## Configuration rules
## Cross-feature invariants
## Architecture Notes

Spec Kit uses the PowerShell scripts (`.specify/scripts/powershell/`).
```

- **SPECKIT block**: the first two lines keep the shipped wording, so `/speckit-plan` and the agent-context script
  find the pattern they write. Exactly one plan path; its artifacts in one sentence; its "Decisions that are easy to
  get wrong", concise; no "The preceding feature is" and no earlier feature.
- **Project Overview**: stack, purpose, sign-in modes, sessions and cookies in brief, deployment target, and the
  pointers to `README.md` and `ARCHITECTURE.md`.
- **Layout**: the *Current State* layout bullets, condensed; leave out the sentence "Every feature in the Spec Kit
  block above is implemented…".
- **Commands**: only the commands the AI runs to check its work (type-check, the tests, one file, one test); the
  developer's and operator's commands stay in `CLAUDE_COMPLETE.md`.
- **Configuration rules**: a few lines: every setting is an `ENV_*` variable validated once by `loadConfig`
  (`src/config.ts`); intervals are in ms except the one setting in minutes; the development templates are git-ignored;
  production secrets are console variables, never in `.do/app.yaml`; the full table is in
  `.claude/rules/environment.md`.
- **Cross-feature invariants**: see below.
- **Architecture Notes**: today's notes, condensed (cookie policy and its Cookie Use test, `postman/openapi.json`
  kept in sync, the auth-phase constraint).
- **Absent**: earlier features' summaries, the Spec Kit Workflow list, the Environment Variables table and the Key
  Design Documents history. They stay in `CLAUDE_COMPLETE.md`.

## Choosing a cross-feature invariant

Keep a rule only when a task in another area could break it without knowing it. Write it on one line, naming the file
or test that enforces it. There is no target count. Examples of the kind (not a fixed list):

- vote counters are never written to a poll row per vote;
- every writer or deleter of `vote_history` keeps the line-graph tally;
- a new cookie or browser storage key needs a Cookie Use row (`tests/cookie-use-list.test.ts`);
- `postman/openapi.json` follows the routes;
- a new dev script needs a `!devScripts/<file>` line in `.gitignore`;
- `m3-assets.test.ts` pins each page's stylesheets;
- setting or clearing `pending_update` must not bump `content_version`.

A decision that matters only inside its own feature's files stays in `CLAUDE_COMPLETE.md`.

## Merge conflicts

When merging a branch conflicts in either file:

- **`CLAUDE_COMPLETE.md`**: keep both chain entries, newest first, and both sides of any other conflicting passage.
- **`CLAUDE.md`**: take the side whose SPECKIT block names the branch's own plan, so that plan's summary reaches the
  next run; taking `main`'s side would lose a summary `CLAUDE_COMPLETE.md` does not hold yet.
- Commit the merge, then run `/speckit-concise-claudemd`, which restores the concise form.

A branch planned before this skill existed brings its old long block into `CLAUDE.md`; the next run moves it as it
would a new summary.
