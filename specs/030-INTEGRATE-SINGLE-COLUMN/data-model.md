# Data Model: Integrate Single Column

**No stored data, no schema change, no migration, no new field on any existing entity.** Everything below is state held in the browser page and lost when it reloads.

## Tab bar position

| Field | Meaning |
|---|---|
| `scrollLeft` | How far the tab bar is scrolled, in pixels, owned by the browser |
| at start | `scrollLeft ≤ 1` |
| at end | `scrollLeft ≥ scrollWidth − clientWidth − 1` |

Derived: the left arrow is `aria-disabled` at start; the right arrow is `aria-disabled` at end. Recomputed on scroll, resize and when the tab bar's tabs change.

## Arrow press (one at a time)

States: `idle → pressed → (stepping | holding) → (settling) → idle`.

| Transition | Rule |
|---|---|
| idle → pressed | `pointerdown` on an arrow that is not `aria-disabled` (primary button only); a 300 ms timer starts |
| pressed → stepping | `pointerup` before the timer: animate to the step target over 500 ms |
| pressed → holding | timer fires: scroll at 200 px/s; each frame moves by `speed × max(0, now − last)` |
| holding → settling | `pointerup`, `pointercancel` or `pointerleave`: animate to the nearest tab edge over 200 ms |
| holding → idle | the end in the direction of travel is reached (no settle needed) |
| any → idle | the bar is scrolled by something else (its `scrollLeft` differs from the last value written) |

A keyboard activation (a click without a pointer) takes one step.

## Tab bar drag (mouse only)

`pending → dragging` after more than 5 px of horizontal movement; `dragging` moves `scrollLeft = startScroll − dx`; on release a click is swallowed once if the state was `dragging`. Touch is the browser's own scrolling (`touch-action: pan-x`).

## Tab menu

`closed ⇄ open`. Contents are rebuilt from the tab bar on every open: for each `.tab`, `{ tab id, icon clone, label, isActive, isDisabled }`. Closing: Escape, a tap outside, or choosing an enabled tab; focus returns to the menu button for Escape and for keyboard choices.

## Floating pair

| Field | Meaning |
|---|---|
| `buttons` | The guest buttons found in `#header-actions` (1 or 2); `[]` for a member or administrator |
| `position` | `{ x, y }` in screen pixels, or none (not yet placed) |
| `area` | the rectangle of the visible tab panel's `.card-grid`, or of its `.maximized-card-grid` while a card is maximized (`.tab-panel:not([hidden])` then `.card-grid:not([hidden])` or `.maximized-card-grid:not([hidden])`; production has one grid per panel and no `#cardGrid`, and maximizing hides the grid) cut to the viewport: `left, right, top = max(top, 0), bottom = min(bottom, innerHeight)` |
| `dragging` | pending/active during a press that has moved more than 5 px |

Rules: `placed(position)` is inside `area` fully. On drag, scroll, after cards mount, after a tab switch, and when a card is maximized or restored, `position := clamp(position)`. On resize, `position := fits(position) ? position : start`. `start = { x: area.right − width, y: gridTop + 4 }` clamped. Not placed when the pair is hidden (member, administrator, wide layout).

## Search tab field

Value (string, up to 200 characters), visible only in the single column. `submit` and `clear` are the existing `SearchTab` operations; the field mirrors `lastQuery` after a submit or a `?q=` arrival, and is emptied by clear.

## Avatar menu item "Create Poll"

`{ enabled: canCreatePolls(me) }`; absent for a guest (a guest has no avatar menu).

## Existing entities

Poll, choice, vote, session and profile are unchanged and are not read or written differently.
