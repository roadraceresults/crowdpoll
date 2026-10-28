# Data Model: Bar Colors (022)

No stored data changes. No table, column, index, route payload, cached object or configuration
variable is added or altered.

## Inputs (existing)

| Name | Where | Used as |
|---|---|---|
| Poll id | `polls.id` (text, `randomUUID()` in production); reaches the card as `opts.pid` | The only input to the starting colour |
| Palette | `RESULTS_PALETTE_ENTRIES` → `RESULTS_COLOR_PALETTE`, 50 hex colours in fixed order, `src/public/pollCard.js` | Unchanged; its length is the modulus |
| Semantic colours | `SEMANTIC_AFFIRMATIVE_COLOR` `#018826`, `SEMANTIC_NEGATIVE_COLOR` `#CF0234`, chosen by `semanticColorFor(label)` | Unchanged; consume no palette entry |
| Display order | `data`, sorted by `pct` descending in `rebuildData` | Unchanged; the order the cursor walks |

## Derived value (new, in memory only)

**Palette offset** — one integer per card instance.

| Property | Rule |
|---|---|
| Definition | `FNV-1a-32(pid) mod 50`; `0` when `pid` is missing, empty or not a string |
| Range | `0 … 49` (the requirements' index `1 … 50` is the offset plus one) |
| Lifetime | Computed once in `initPollCard`; constant for the card, since the pid is |
| Scope | Same for every user, device, tab and view of the poll |

## Colour of a bar

For the display-ordered dataset `data` and offset `s`:

```text
k ← 0
for each item in data (top to bottom):
    if semanticColorFor(item.label) → that colour
    else → RESULTS_COLOR_PALETTE[(s + k) mod 50]; k ← k + 1
```

Its tint, inks and clipped text copy come from `BAR_COLORS.get(colour)` as today.

**Invariants**
- No palette colour appears twice in one card (at most 50 choices, 50 colours).
- The sequence of palette colours among the non-semantic bars, top to bottom, is fixed for a poll.
- Changing `RESULTS_PALETTE_ENTRIES` recolours every card (accepted).
