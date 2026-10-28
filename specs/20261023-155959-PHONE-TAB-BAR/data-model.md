# Data Model: Phone Tab Bar

No stored data, no schema change, no migration, no setting. The feature's state lives in the browser, on the home
page's tab bar, and is recomputed from the row's geometry.

## Edge state (`.tab-bar-wrap` classes)

| Class | Meaning | Set by | Read by |
|---|---|---|---|
| `has-tabs-before` | tabs wait beyond the left edge (`scrollLeft > 1`) | `tabs.js` `updateOverflowFades`, on `scroll` and `resize` | `header-tab-bar-m3.css` masks (R2) |
| `has-tabs-after` | tabs wait beyond the right edge (`scrollLeft + clientWidth < scrollWidth - 1`) | same | same |

Both set → both edges fade; neither → the row fits and nothing fades. The mask width is `--tab-fade` (24 px above
900 px, 32 px up to 900 px).

## Drag state (`#tabBar` class, `tabBarScroll.js`)

| State | Meaning |
|---|---|
| `is-dragging` | a mouse or pen has moved the row more than 5 px since pressing; the next click on a tab is swallowed; `scroll-behavior` is `auto` while it is set |

A touch pointer never enters this state (R5).

## Wheel state (`tabBarScroll.js`)

| State | Meaning |
|---|---|
| `wheelTarget` | the position the last wheel tick asked for while the row's smooth scroll is still in flight; `null` when none is pending. Set by the wheel handler, which adds each tick to it, cleared on `scrollend` and on the next `pointerdown` (R6) |

## All tabs menu state (unchanged)

| Attribute | Meaning |
|---|---|
| `#tabMenuBtn[aria-expanded]` | whether `#tabMenu` is open |
| `#tabMenu[hidden]` | the menu's visibility; rebuilt from the tabs each time it opens |

## Active tab (unchanged)

`.tab.is-active` / `aria-selected="true"` on one tab and `data-active` on the wrap, set by `tabs.js` `select()`; the
selected tab is scrolled into view on every selection, including the first at page load.
