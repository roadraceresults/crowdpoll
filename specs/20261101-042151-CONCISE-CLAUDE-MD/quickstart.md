# Quickstart: Concise CLAUDE.md

These checks prove the feature works. They run in Git Bash from the repository root. There is no application test
to run (research R10).

## Prerequisites

- The skill `.claude/skills/speckit-concise-claudemd/SKILL.md` and the two message edits have been committed.
- The first run (§2) is made on `main`, or on a branch that merges into `main` next (R11).
- Note the commit before the first run: `BEFORE=$(git rev-parse HEAD)`.

## 1. The skill can only be started by hand

```bash
grep -n "disable-model-invocation: true" .claude/skills/speckit-concise-claudemd/SKILL.md
```

Expected: one match (K1). Typing `/speckit-concise-claudemd extra` prints the usage error and writes nothing.

## 2. First run: split

Type `/speckit-concise-claudemd`. Expected: the K4 report, headed `first run`, with `CLAUDE_COMPLETE.md` at
`0 lines` before. Then:

```bash
git show "$BEFORE":CLAUDE.md | diff - CLAUDE_COMPLETE.md && echo "verbatim copy"   # SC-002
grep -c "CLAUDE_COMPLETE.md" CLAUDE.md                                            # 1 (FR-003)
grep -n "@CLAUDE_COMPLETE" CLAUDE.md || echo "no import"                          # FR-003
grep -c "The preceding feature is" CLAUDE.md                                      # 0 (FR-004)
sed -n '/SPECKIT START/,/SPECKIT END/p' CLAUDE.md | grep -o 'specs/[^/`]*/plan.md' | sort -u | wc -l   # 1 (SC-003)
grep -n "^| \`ENV_PORT\`" CLAUDE.md || echo "no settings table"                    # FR-004
head -9 .claude/rules/environment.md                                              # F3 frontmatter
grep -c "^| \`ENV_" .claude/rules/environment.md                                  # the table's rows
git status --short                                                                # nothing staged (FR-013)
```

Read the report: the developer judges that `CLAUDE.md` is markedly smaller (SC-001). Review with `git diff`, then
commit.

## 3. The settings table loads only for configuration work (SC-004)

- In a new session, ask a question about a client script, then run `/context` (or `/memory`):
  `.claude/rules/environment.md` is not listed.
- Ask the AI to read `src/config.ts`: the rule file is now loaded.

## 4. A later run after planning a feature (User Story 2)

1. Plan any feature with `/speckit-plan`. `CLAUDE.md`'s block changes: a summary, or a pointer if the agent-context
   hook is run.
2. Make a small edit to a line in *Commands* in `CLAUDE.md`.
3. Type `/speckit-concise-claudemd`. Expected:
   - `CLAUDE_COMPLETE.md`'s chain begins with the new feature, and the former first entry now opens with
     "The preceding feature is";
   - the edited command line replaced its old wording in `CLAUDE_COMPLETE.md`, and is not there twice (Q1);
   - `CLAUDE.md`'s block names only the new plan and its decisions (SC-003), built from `plan.md` when the block
     was a pointer (Q2);
   - the report lists what moved and was condensed.
4. Before the run in step 3, also delete one line from *Architecture Notes* in `CLAUDE.md`: after the run it is gone
   from `CLAUDE_COMPLETE.md` too (FR-009, hand deletions carried over).
5. Run it again at once, before committing: the report says `nothing new` under *Moved* (Edge Cases) and prints
   `Removals not carried over: CLAUDE_COMPLETE.md has uncommitted changes`.

## 5. The shipped Spec Kit is untouched (SC-006)

```bash
git diff --stat "$BEFORE" -- .claude/skills/speckit-specify .claude/skills/speckit-clarify .claude/skills/speckit-plan \
  .claude/skills/speckit-tasks .claude/skills/speckit-analyze .claude/skills/speckit-implement .claude/skills/speckit-checklist \
  .claude/skills/speckit-constitution .claude/skills/speckit-taskstoissues .claude/skills/speckit-agent-context-update \
  .specify/extensions/agent-context
```

Expected: no output.

## 6. Messages (User Story 4)

```bash
grep -n "has grown as this feature has been implemented" .claude/skills/speckit-tweak/SKILL.md   # 3 places (M1)
grep -n "speckit-concise-claudemd\*\* (recommended)" .claude/skills/speckit-requirements/SKILL.md # 1 (M2)
grep -n "speckit-clarify-findings\*\* (optional)" .claude/skills/speckit-requirements/SKILL.md || echo "removed"
```

Then resolve the last tweak of any tweak file. The four-line message of M1 is printed.

## 7. Merge recipe (K5)

On a branch folder, merge `main` after the first run. Resolve any conflict as K5 says, then run the skill. Expected:
the concise form is restored, and the branch's own summary is on top of the chain in `CLAUDE_COMPLETE.md`.
