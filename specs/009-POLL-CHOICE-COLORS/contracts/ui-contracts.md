# Phase 1 UI Contract: Poll Choice Colors

**Feature**: `009-POLL-CHOICE-COLORS` | **Date**: 2026-08-15 | **Plan**: [../plan.md](../plan.md)

This feature exposes no HTTP surface — `postman/openapi.json` is unchanged. Its contract
is the rendering behavior of the poll card's front face. Each contract below is
observable in a browser and is exercised by a numbered scenario in
[../quickstart.md](../quickstart.md).

---

## C1 — Affirmative labels render `#43F781`

A results bar whose choice label matches the affirmative rule renders its fill as
`#43F781`, regardless of position, percentage, or choice count.

**Matches**: label contains the whole word `yes`, `true`, `correct`, `agree`, or `yay`
(case-insensitive), **or** the trimmed label equals `y` or `yup` (case-insensitive).

Two choices in the same poll may both match and both render `#43F781`; duplicate colors
within a poll are valid and must not be deduplicated or adjusted.

**Satisfies**: FR-001, FR-003, FR-005, FR-006, FR-009 · **Scenario**: Q1, Q4, Q5

---

## C2 — Negative labels render `#FC9E9E`

A results bar whose choice label matches the negative rule, **and did not match C1**,
renders its fill as `#FC9E9E`.

**Matches**: label contains the whole word `no`, `false`, `incorrect`, `disagree`, or
`nay` (case-insensitive), **or** the trimmed label equals `n` or `nope` (case-insensitive).

**Precedence is observable**: a label matching both rules renders `#43F781`. `"Yes and no"`
is green, not red.

**Satisfies**: FR-002, FR-003, FR-005, FR-009 · **Scenario**: Q1, Q4, Q5, Q6

---

## C3 — Whole-word boundaries

A trigger word embedded in a longer token does not match. The boundary is
letters-only: only a letter counts as "still part of the word", so a space, hyphen,
digit, or underscore all delimit it *(amended 2026-08-19; digits and underscores were
originally treated as word characters like `\b` does — see research.md R3)*.

| Label | Renders |
|---|---|
| `Yes!`, `(true)`, `I agree`, `Don't agree`, `Option 1 - Yes`, `Agree2`, `yes_please` | `#43F781` |
| `Incorrect` | `#FC9E9E` (matches `incorrect`, **not** `correct`) |
| `Disagree` | `#FC9E9E` (is the whole word `disagree`) |
| `No1`, `option_no` | `#FC9E9E` |
| `Agreement`, `Yesterday`, `November`, `Nobody`, `Disagreement` | palette color (a letter follows the matched word) |
| `Y or N`, `Nope, never` | palette color (exact rules need the whole label) |

**Satisfies**: FR-004, FR-005 · **Scenario**: Q6

---

## C4 — Palette assignment skips semantically colored choices

Choices not colored by C1 or C2 take palette entries in display order, from a cursor that
advances **only** for those choices. A semantic choice never consumes a palette entry.

For choices `["Yes", "No", "Maybe", "Undecided"]` in display order:

| Position | Label | Fill |
|---|---|---|
| 1 | Yes | `#43F781` |
| 2 | No | `#FC9E9E` |
| 3 | Maybe | palette entry **1** (`#3B5FCC`) |
| 4 | Undecided | palette entry **2** (`#B84A1F`) |

The palette is guaranteed to hold at least one entry per possible choice (50 entries, 50
maximum choices), so the cursor never exhausts it. Every bar receives a color at any
choice count up to 50, with no gaps and no repeats.

**Satisfies**: FR-007, FR-008, SC-005 · **Scenario**: Q2, Q7

---

## C5 — Colors survive a live reorder *(the critical contract)*

When a live refresh re-sorts the bars, each semantic color follows its **label** to the
label's new position; palette colors are reassigned by the **new** display order.

This is the contract that the pre-existing in-place update path violates by default, and
it is the one most likely to regress in future work. `renderPollResults` skips a full
rebuild when row count and geometry are unchanged, and previously left fills untouched
because color was purely positional. Any change that reintroduces that assumption
reproduces the defect.

**Observable failure if broken**: in a Yes/No poll where "No" overtakes "Yes", the card
shows **"No" in green and "Yes" in red** — inverted, silent, and persisting until a
rebuild is forced. It never appears on page load, only after a live vote change.

**Satisfies**: FR-009, FR-010, SC-001 · **Scenario**: Q3 · **Source**:
[../research.md R1](../research.md)

---

## C6 — Label and percentage text stay legible on every color

Label and percentage text reach at least 4.5:1 contrast against their bar's fill, for all
52 colors in play.

The rule selecting dark versus light ink treats a fill as light above **0.40** relative
luminance (lowered from `0.55`). Exactly one color changes ink as a result:

| Color | Luminance | Ink | Ratio |
|---|---|---|---|
| `#43F781` | 0.693 | dark `#1a1a1a` | 12.32:1 (unchanged) |
| `#FC9E9E` | 0.476 | dark `#1a1a1a` | **8.72:1** (was white at 2.00:1) |
| all 50 palette entries | ≤ 0.163 | white `#ffffff` | ≥ 4.93:1 (unchanged) |

No palette bar may change appearance. The nearest palette color sits 0.237 below the new
threshold.

**Satisfies**: FR-011, FR-011a, SC-004 · **Scenario**: Q8

---

## C7 — The back face is unchanged

Voting rows on the card's back face continue to derive their background solely from
selection state — `--choice-unselected` (`#F1F3EE`) and `--choice-selected` (`#E4D3AE`) —
and never from choice colors. A choice appearing green on the front face appears in the
ordinary neutral or selected tone on the back face.

`renderVotingOptions` sets no background color and calls neither the color-assignment
function nor `textStyleFor`. This contract is satisfied by leaving it and the `.vote-row`
CSS rules untouched.

**Satisfies**: FR-013, SC-006 · **Scenario**: Q9 · **Source**:
[../research.md R5](../research.md)

---

## C9 — The fill boundary is visible at every fill color

A bar's filled portion is separated from the unfilled track by a visible boundary at all
percentages, so the bar still reads as a proportion rather than a solid block.

Fill-versus-track contrast alone does not achieve this for the semantic colors:

| Fill | vs. track `#DDE1D6` | Boundary source |
|---|---|---|
| 50 palette entries | 3.71:1 – 9.04:1 | fill contrast alone suffices |
| `#43F781` | **1.06:1** | requires the trailing edge |
| `#FC9E9E` | **1.50:1** | requires the trailing edge |

A trailing edge on `.result-fill` supplies the boundary independently of fill color,
reaching at least **3.91:1** against the fill and **4.67:1** against the track for both
semantic colors. It applies to every bar uniformly.

Each color needs to satisfy **one** of the two mechanisms, not both — the 50 palette
entries qualify on fill-vs-track contrast alone, and the 2 semantic colors qualify via the
edge. Requiring the edge to also clear 3:1 against dark palette fills would be both
unnecessary and unachievable, since a dark edge on a dark fill has little contrast by
construction.

Why this matters beyond aesthetics: at 1.06:1 the only remaining cue is hue — green
against a green-tinted grey — which is the cue red-green color-vision deficiency removes.
Without the edge, a bar at 30% and a bar at 70% are hard to tell apart for those viewers,
on a chart whose sole job is conveying proportion.

**Satisfies**: FR-012, FR-012a, SC-008 · **Scenario**: Q11

---

## C8 — Nothing else changes

Bar layout, sizing, gap, font scaling, truncation, scroll arrows, sort order, percentage
calculation, and the fill grow-in animation all behave exactly as before. The results
palette itself is not modified by this feature.

**Satisfies**: spec.md Assumptions, Out of Scope · **Scenario**: Q10
