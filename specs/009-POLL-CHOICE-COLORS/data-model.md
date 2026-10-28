# Phase 1 Data Model: Poll Choice Colors

**Feature**: `009-POLL-CHOICE-COLORS` | **Date**: 2026-08-15 | **Plan**: [plan.md](./plan.md)

## Storage impact: none

This feature adds no persisted state. No MongoDB collection, document field, index, or
API payload changes. Nothing in `src/polls/`, `src/routes/`, or `postman/openapi.json`
requires an update.

Colors are **derived at render time** from data the client already holds. The rendering
client receives each choice's label in the existing poll payload and computes the color
locally; the assignment is never stored, never transmitted, and never authored.

This is a direct consequence of spec.md's "Scope is display-only" assumption: authors
cannot pick or override a choice's color, so there is nothing to persist.

## Runtime entities

These exist only within one `renderPollResults` call. None outlive the render.

### Choice datum (existing — unchanged)

An element of the card's shared, cached, percentage-sorted dataset. This feature reads it
and does not modify it.

| Field | Type | Used by this feature |
|---|---|---|
| `label` | string, ≤200 chars | **Yes** — matched against the semantic rules |
| `pct` | number | No — position in the sorted order is what matters, not the value |
| `selected` | boolean | No — back-face concern only |

**Not modified.** Both card faces render from this one cached array (see the SHARED POLL
DATA comment at the top of `pollCard.js`). Writing an assigned color onto each item would
make it visible to the back face, coupling it to a front-face concern that FR-013
separates — so assignment returns a parallel array instead. See
[research.md R5](./research.md).

### Semantic rule set (new — module-scope constants)

Two rules, evaluated affirmative-first per FR-002.

| Rule | Word match (whole word, case-insensitive) | Exact label (trimmed, case-insensitive) | Color |
|---|---|---|---|
| Affirmative | `yes`, `true`, `correct`, `agree` | `y`, `yup` | `#43F781` |
| Negative | `no`, `false`, `incorrect`, `disagree` | `n`, `nope` | `#FC9E9E` |

Word matching uses `\b`-anchored regexes built **without** the `g` flag — with `g`, the
retained `lastIndex` would make repeated `.test()` calls alternate true/false and produce
order-dependent colors. See [research.md R3](./research.md).

### Results palette (existing — unchanged)

`RESULTS_PALETTE_ENTRIES` / `RESULTS_COLOR_PALETTE`: 50 ordered hex colors. Read-only for
this feature. Seven entries were recolored to meet SC-004 *before* this feature; that work
is complete and is not part of this change.

### Assigned colors array (new — transient)

The output of `assignResultColors(data)`: an array of hex strings, index-parallel to the
sorted dataset, consumed by both render branches within the same call and then discarded.

## Assignment rules

Applied in a single left-to-right pass over the display-ordered dataset:

1. If the label matches the **affirmative** rule → `#43F781`. (FR-001)
2. Otherwise, if it matches the **negative** rule → `#FC9E9E`. (FR-002 — affirmative is
   tested first, so a label matching both is affirmative.)
3. Otherwise → the next unconsumed palette entry, advancing a cursor that **only** steps
   for choices reaching this branch. (FR-007)
4. When the cursor passes the 50th entry it wraps to the first. (FR-008)

Duplicate colors within one poll are valid and must not be deduplicated (FR-006).

### Validation and degenerate input

| Input | Behavior |
|---|---|
| `label` is `null`/`undefined`/non-string | Coerced to `''`; matches no rule; takes a palette color. No throw. |
| `label` is empty or whitespace-only | Matches no rule; takes a palette color. |
| Dataset is empty | Returns an empty array; no bars rendered. |
| More than 50 non-semantic choices | Palette wraps; colors repeat (FR-008). |
| All choices semantic | Palette cursor never advances; no palette color used. |

## Derived-state consistency

Because the assignment is a pure function of *(ordered labels, palette)*, it is
recomputed on every render rather than cached across renders. This is what makes the
[R1](./research.md) fix correct: the in-place update branch calls the same function with
the freshly sorted dataset and reapplies the result, so a label that moved between
positions carries its semantic color with it.

Two properties follow, and both are required by the spec:

- **Semantic colors are position-independent** — a label's color depends only on the
  label (FR-009).
- **Palette colors are position-dependent** — a non-semantic choice's color may change
  when the display order changes, and must not be pinned (FR-010).
