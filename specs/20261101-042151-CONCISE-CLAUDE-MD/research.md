# Research: Concise CLAUDE.md

Every unknown in the Technical Context is resolved below. Sources: the requirements report
(`requirements/20261101-042151-concise-claude-md/requirements-report.md`, RS1 and RS2), the Claude Code memory
documentation, and the repository as read on 2026-11-01.

## R1 — The command is a skill of instructions, with no script

- **Decision**: `/speckit-concise-claudemd` is one file, `.claude/skills/speckit-concise-claudemd/SKILL.md`. Its
  instructions are carried out by the AI with `Read`, `Edit`, `Write` and `Bash`. There is no TypeScript or
  PowerShell script.
- **Rationale**: the work is editorial judgment: deciding what is new, which section it belongs to, and how to
  condense it. A script can only measure sizes and list differences, and both are one-line shell commands (R6, R4).
  The project's other custom skills (`speckit-tweak`, `speckit-requirements`) work the same way. This is
  Constitution II: no code where none is needed.
- **Alternatives considered**: a `devScripts/concise-claudemd.ts` that splits on headings. Rejected, because it
  cannot condense prose or pick out cross-feature invariants, so the AI would still have to do the main part.

## R2 — Invocation and frontmatter

- **Decision**: the frontmatter has `name: "speckit-concise-claudemd"`, a one-line `description`,
  `user-invocable: true`, `disable-model-invocation: true` and `allowed-tools: Read, Write, Edit, Bash`. It takes no
  arguments, and anything typed after the command is refused with a usage line.
- **Rationale**: `disable-model-invocation` is what makes it "used manually" (FR-007): the AI cannot load it on its
  own. `speckit-file-remote` already uses the same pair of flags.
- **Alternatives considered**: an optional `--dry-run` argument. Rejected, because git is the undo (UA8) and nobody
  asked for one.

## R3 — The first split copies, then condenses

- **Decision**: when `CLAUDE_COMPLETE.md` is absent, the run copies `CLAUDE.md` byte for byte (`cp CLAUDE.md
  CLAUDE_COMPLETE.md`) and then writes the concise `CLAUDE.md` (contracts/file-layout.md, F1). The SPECKIT markers
  stay in the copy.
- **Rationale**: SC-002 asks for all of today's text, verbatim. A shell copy cannot drop a line, and an AI rewrite
  could. The markers are harmless in the copy: the agent-context script and `/speckit-plan` step 4 both edit
  `CLAUDE.md` only (`context_file: CLAUDE.md` in `.specify/extensions/agent-context/agent-context-config.yml`).
- **Alternatives considered**: renaming the block in the copy to a plain `## Feature Chain` heading. Rejected,
  because it breaks "verbatim" for no gain.

## R4 — Finding what is new: a git baseline, no state file

- **Decision**: the baseline is `CLAUDE.md` as it was in the last commit that changed `CLAUDE_COMPLETE.md`
  (`git log -1 --format=%H -- CLAUDE_COMPLETE.md`). The run reads `git diff <hash> -- CLAUDE.md`, and each hunk is
  then one of these:
  - **inside the SPECKIT block**: a feature summary, handled by R5;
  - **added outside it**: new text, added to the matching section of `CLAUDE_COMPLETE.md`;
  - **changed outside it**: an edit, which replaces its counterpart in `CLAUDE_COMPLETE.md` (clarification Q1);
  - **removed outside it**: a deletion the developer made by hand, since the baseline is the concise text the
    previous run left and the run's own condensing comes after the diff; its counterpart is removed from
    `CLAUDE_COMPLETE.md` too, so the complete file stays current (FR-001; analyze finding I2 B). The one exception: when
    `CLAUDE_COMPLETE.md` has uncommitted changes, the previous run was not committed, the baseline is older than it, and
    that run's own condensing would look like deletions; removals are then ignored and the report says so.

  Before anything is added, the run checks that it is not already in `CLAUDE_COMPLETE.md`. That makes a second run
  without a commit in between harmless.
- **Rationale**: the workflow is "run, review, commit" (FR-013), so the last commit that touched the complete file
  holds the concise text the previous run left. That gives a precise "since the last run" with nothing new stored,
  in keeping with UA9's no-state choice. Comparing the concise file with the complete one directly could not tell a
  condensed passage from an edited one: the two files differ on purpose.
- **Alternatives considered**: a saved copy of the last concise file under `.specify/`. Rejected, because it is one
  more file to keep in step, and git already has it. Comparing against `HEAD`. Rejected, because a commit made
  between plan and run would hide the new material.

## R5 — The SPECKIT block and the feature chain

- **Decision**: a feature is identified by its plan path, `specs/<feature>/plan.md`.
  - When the block names a plan that is not yet in the chain of `CLAUDE_COMPLETE.md`, its summary is added on top
    of that chain. The chain's form is kept: the newest entry opens with the "read the current plan" sentence, and
    the previous newest entry's opening becomes "The preceding feature is".
  - When the block holds only a pointer, as the agent-context script writes it, the summary and decisions are built
    from that `plan.md` and its `research.md` (clarification Q2).
  - The run then rewrites the block in `CLAUDE.md` as the current plan's path, its supporting artifacts in one
    sentence, and its "Decisions that are easy to get wrong".
- **Rationale**: the shipped writers leave the block in any of three forms (RS2), and the plan path is the one thing
  all three contain. Building from `plan.md` means the decisions always come from the authoritative record.
- **Alternatives considered**: telling summaries apart by date or text. Rejected, because a reworded summary would
  then look like a new feature.

## R6 — The size report

- **Decision**: the run takes `wc -l -m` of both files before it starts and after it finishes. Tokens are estimated
  as characters ÷ 4, rounded to the nearest 100. The report is printed as in contracts/command.md, K4.
- **Rationale**: no tokenizer runs locally (RS1). Characters ÷ 4 is the common rule of thumb and close to the
  `/usage` figure: today's 91,300 bytes ≈ 21,000 tokens, about 4.3 per token. `-m` counts characters rather than
  bytes, so the `→`, `≤` and `⚪` characters do not inflate the estimate.
- **Alternatives considered**: the Anthropic token-counting API. Rejected, because it needs a key and a network
  call for a figure that only has to be approximate.

## R7 — The settings rule file

- **Decision**: `.claude/rules/environment.md` holds the Environment Variables table verbatim, under frontmatter:

  ```yaml
  ---
  paths:
    - "src/config.ts"
    - ".do/app.yaml"
    - "launch.json.example"
    - "devScripts.example/**"
    - "tests/config.test.ts"
  ---
  ```

  The concise `CLAUDE.md` keeps a short *Configuration rules* section without the table.
- **Rationale**: the Claude Code memory documentation loads a `.claude/rules/*.md` file with a `paths:` field only
  when a task reads or edits a matching file (RS1, UA4 B). The list matches the requirements' Resolutions, UA4.
- **Alternatives considered**: a subdirectory `CLAUDE.md`. Rejected, because the settings are spread across the
  repository root, `src/`, `tests/` and `.do/`, and no single directory covers them.

## R8 — The concise file's contents (the first run's target)

- **Decision**: the sections, in order, are:
  1. a two-line header naming `CLAUDE_COMPLETE.md` in backticks;
  2. the SPECKIT block (R5);
  3. Project Overview;
  4. Layout;
  5. Commands;
  6. Configuration rules;
  7. Cross-feature invariants;
  8. Architecture Notes;
  9. one line saying Spec Kit uses the PowerShell scripts.

  The Spec Kit Workflow list, the Environment Variables table and the Key Design Documents history go
  (contracts/file-layout.md, F1). An invariant is kept only when a task in another area could break it without
  knowing it. Candidates from today's chain include:
  - vote counters are never written to a poll row per vote;
  - every `vote_history` writer keeps the line-graph tally;
  - a new cookie or storage key needs a Cookie Use row;
  - `postman/openapi.json` follows the routes;
  - a new dev script needs a `.gitignore` exception;
  - `m3-assets.test.ts` pins each page's sheets;
  - setting or clearing `pending_update` must not bump `content_version`.
- **Rationale**: these are the parts of the requirements report's section 5 that the Resolutions kept (UA2 B, UA7
  B, AM3 C), with no line or bullet counts (UA1 C).
- **Alternatives considered**: keeping the Workflow list. Rejected by the developer (UA7 B).

## R9 — Changes to the two project skills

- **Decision**:
  - In `.claude/skills/speckit-tweak/SKILL.md`, the "All tweaks resolved" message appears in four places (lines
    138, 324, 465 and 507 as read): the defining text at 324, the summary at 465 and the example at 507 change to
    the four-line message; 138 and 428 only name it and stay as they are.
  - In `.claude/skills/speckit-requirements/SKILL.md`, the journey message at lines 158–170 becomes the developer's
    list (contracts/messages.md, M2). Its existing formatting is kept: `⚪ **/skill**` with two trailing spaces.
- **Rationale**: these are the only places the texts live. Every copy changes together, so the skills stay
  consistent.
- **Alternatives considered**: none. The texts are fixed by the Resolutions (NC1 C, UA9 B, UA7 B).

## R10 — Verification without application tests

- **Decision**: there are no Vitest tests (FR-018, UA1 C). The quickstart verifies the result with shell checks:
  - the verbatim copy (`git show <before>:CLAUDE.md | diff - CLAUDE_COMPLETE.md`);
  - no `@CLAUDE_COMPLETE` import;
  - one plan path between the markers;
  - the rule file's frontmatter;
  - the shipped skills unchanged (`git diff --stat` on their paths);
  - the two message texts by `grep`.
- **Rationale**: Constitution IV asks that every change can be checked, and these checks do it without adding tests
  to the application suite, which the developer ruled out.
- **Alternatives considered**: a `tests/claude-md.test.ts`. Rejected (UA1 C).

## R11 — Where and when the first run happens

- **Decision**: implementation ends with the first run on `main` (UA5, UA6). The current working folder is on
  branch `pop-poll-2`, so the skill and the two message edits are made here, and the first run is made after this
  work reaches `main`, or on `main` directly. The quickstart says so.
- **Rationale**: every branch folder gets the concise file by merging `main`. A first run on a feature branch would
  make two different first splits when another branch runs it too.
- **Alternatives considered**: running it on this branch. Allowed if the developer merges this branch into `main`
  next, since that has the same effect.

## R12 — This plan's own SPECKIT update

- **Decision**: `/speckit-plan` step 4 for this feature prepends this feature's summary to today's chain, in the
  chain's existing form.
- **Rationale**: the first run must copy an intact chain to `CLAUDE_COMPLETE.md` (SC-002). Replacing the block with
  a pointer now would delete 31 features' decisions before the complete file exists. For the same reason the
  optional `after_plan` agent-context hook must not be run before the first split.
- **Alternatives considered**: a pointer only, which is what the shipped step 4 literally asks for. Rejected for
  the reason above. After the split, either form is fine (R5).
