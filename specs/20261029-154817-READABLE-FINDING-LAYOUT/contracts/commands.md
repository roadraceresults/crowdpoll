# Contract: Commands and Prompts

What the developer types in the CC CLI terminal while findings are open, and what the skill prints back.
All commands are matched case-insensitively, ignoring surrounding punctuation and trailing periods.

## C1. `Accept <ID>[,] [<LETTER>]` (new)

**Grammar**: `accept` + whitespace + an id `(IN|AM|UA|NC|RS)\d+` + optional `,` + optional whitespace + optional letter `[A-Z]`.
Examples: `Accept AM2, B`, `accept am2 b`, `ACCEPT AM2,B`, `Accept UA3`.
A single letter after `Accept` (`Accept B`) is C2's `Accept X`, never an id; `Accept all` is C4.

| Case | Result |
|---|---|
| Open finding, letter names a Recommendation | Resolve with it; clear any other tick in the finding (FR-012) |
| Open finding, letter names the Developer Resolution with text written under it | Resolve with it |
| Open finding, no letter, exactly one option ticked in the file | Resolve with the ticked option |
| Open finding, no letter, nothing ticked | Resolve with the single Recommendation, or the one marked `_(recommended)_` |
| Single, unlettered Recommendation, letter `A` | Same as no letter |
| Letter names an empty Developer Resolution | Say so, ask for text under it; change nothing (FR-013) |
| Unknown letter, unknown id, or resolved finding | Say which; change nothing (FR-013) |

After resolving: log the finding and the change to the requirements, then run "Next" (FR-014).

## C2. `Accept` and `Accept X` (unchanged)

Act on the first open finding, exactly as today (FR-015).

## C3. `Next` (unchanged, plus marker upkeep)

As today; the sweep also keeps `❌ NOT Resolved` in step (L3.4) and reads both forms (L3, L4).

## C4. `Accept all` (unchanged)

As today. Findings resolved this way get `accepted by "Accept all"` in their Notes.

## C5. Prompts

The three prompts in *Prompting The Developer* keep their wording, with the Accept line(s) naming the current finding (FR-016):

- **P1** — no open finding has options: `⚪ Type/Say 👉 "Accept <ID>" - accept the Recommendation for the current finding`
- **P2** — the current finding has one Recommendation, others have options: `⚪ Type/Say 👉 "Accept <ID>" - to accept the Recommendation for the current finding`
- **P3** — the current finding has options:
  - `⚪ Type/Say 👉 "Accept <ID>, X" - to accept Recommendation X where X is the option letter for the current finding`
  - `⚪ Type/Say 👉 "Accept <ID>" - to accept Recommendation <SUGGESTED_LETTER> (recommended) for the current finding`

`"Accept"` and `"Accept X"` still work but are no longer suggested. On an old-form report the prompts are the same.
