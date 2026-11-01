# Contract: `/speckit-concise-claudemd`

The skill file is `.claude/skills/speckit-concise-claudemd/SKILL.md`. Contracts K1–K6 describe what a run does and
prints.

## K1 — Invocation

- The developer starts it by typing `/speckit-concise-claudemd`. Its frontmatter carries
  `disable-model-invocation: true`, so the AI cannot start it on its own (FR-007).
- It takes no arguments. Anything typed after it stops the run with:
  `ERROR: Unrecognized argument(s): <text>. Usage: /speckit-concise-claudemd`
- It is meant to be run after a feature is implemented, before it is committed or merged. Nothing stops it running
  at any other time.

## K2 — Before anything is written

1. `CLAUDE.md` must exist and hold both SPECKIT markers. Otherwise the run stops with
   `ERROR: CLAUDE.md not found` or `ERROR: CLAUDE.md has no <!-- SPECKIT START --> / <!-- SPECKIT END --> markers`,
   and writes nothing.
2. The run measures both files (`wc -l -m`; an absent `CLAUDE_COMPLETE.md` counts as `0 lines, 0 tokens`).
3. If `git status --porcelain -- CLAUDE_COMPLETE.md` shows uncommitted changes, the run says so in one line and
   carries on. The baseline (K3) is then older than that edit, and the "already in `CLAUDE_COMPLETE.md`" check
   prevents duplicates.

## K3 — The run

- **First run** (no `CLAUDE_COMPLETE.md`):
  1. Copy `CLAUDE.md` to `CLAUDE_COMPLETE.md` byte for byte.
  2. Write the concise `CLAUDE.md` (file-layout.md, F1), with the cross-feature invariants drawn from the chain.
  3. Write `.claude/rules/environment.md` (F3) from the Environment Variables table.
- **Later run**:
  1. Take the baseline from the last commit that changed `CLAUDE_COMPLETE.md` (research R4).
  2. Bring `CLAUDE_COMPLETE.md` up to date:
     - new text goes to its matching section, or the nearest fitting section when none matches;
     - edited text replaces its counterpart;
     - text removed from `CLAUDE.md` since the baseline is removed from `CLAUDE_COMPLETE.md` too, unless
       `CLAUDE_COMPLETE.md` has uncommitted changes (K2), in which case removals are ignored and the report says
       `Removals not carried over: CLAUDE_COMPLETE.md has uncommitted changes`;
     - a summary of a plan not yet in the chain goes on top of the chain, built from that `plan.md` when the block
       holds only a pointer (R5);
     - nothing already present is added again.
  3. Carry any new or changed setting rows into `.claude/rules/environment.md`.
  4. Condense `CLAUDE.md` back to F1:
     - the SPECKIT block becomes the current plan only;
     - a new cross-feature invariant is added when the new feature's decisions include one;
     - everything else new is condensed or left in `CLAUDE_COMPLETE.md` only.
- **Both runs**: edit with targeted changes; never stage or commit anything; never ask a question (FR-013, SC-005).

## K4 — The report (printed at the end)

```text
/speckit-concise-claudemd — <first run | run>

                       Before                 After
CLAUDE.md            <l> lines ≈<t> tokens   <l> lines ≈<t> tokens
CLAUDE_COMPLETE.md   <l> lines ≈<t> tokens   <l> lines ≈<t> tokens
(tokens ≈ characters ÷ 4)

Moved to CLAUDE_COMPLETE.md:
  - <section>: <what>          (one line per section changed, or "nothing new")
Removals not carried over: CLAUDE_COMPLETE.md has uncommitted changes   (only in that case, K3)
Condensed in CLAUDE.md:
  - <section>: <what>          (one line per section changed)
Settings rule (.claude/rules/environment.md): <created | updated: <names> | unchanged>

Review with: git diff -- CLAUDE.md CLAUDE_COMPLETE.md .claude/rules/environment.md
Nothing was staged or committed.
```

## K5 — Merge recipe (written in the skill)

When a merge conflicts in either file:
- **`CLAUDE_COMPLETE.md`**: keep both chain entries, newest first, and both sides of any other conflicting passage.
- **`CLAUDE.md`**: take the side whose SPECKIT block names the branch's own plan (the branch's side), so that plan's
  summary reaches the next run; taking `main`'s side would lose a summary `CLAUDE_COMPLETE.md` does not hold yet.
- Then commit the merge and run `/speckit-concise-claudemd`, which restores the concise form.

A branch planned before this feature brings its old long block into `CLAUDE.md`. The next run moves it, as it would
a new summary.

## K6 — What the skill never touches

- The shipped Spec Kit skills and extensions (FR-017).
- Any file other than `CLAUDE.md`, `CLAUDE_COMPLETE.md` and `.claude/rules/environment.md`.
