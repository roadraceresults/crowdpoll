# Data Model: Tab Bar

Nothing in this feature is stored. There is no table, column, cache key, cookie or configuration
value. The two entities the specification names live only in the home page's markup and in the
tab script's in-memory controller registry.

## Tab

One of the six items in the bar. In markup it is a `<button class="tab" data-tab="…">`; in
`tabs.js` it is a controller registered under the same name.

| Attribute | Where | Values after 018 | Notes |
|---|---|---|---|
| identifier (`data-tab` / `data-panel`) | markup, `controllers` key | `trending`, `newest`, `private`, `favourites`, `live`, `search` | Unchanged for the five existing tabs; `favourites` keeps its British spelling because the API path, `KIND_OF`, `PERSONAL_TABS` and the tests use it (R7) |
| label | markup text | Trending, Newest, My Private Polls, Favorites, Live Results, Search | Title Case; the accessible name (FR-014) |
| position | markup order | 1–6 in the order above | Search and Live Results swap; Newest is second |
| icon | markup, first child of the button | see **Icon** | `aria-hidden="true"`, `focusable="false"` |
| `guestsAllowed` | controller | `trending` true, `newest` true, others false | Drives the sign-in redirect and the disabled state |
| `state` | controller | a `createTabState()` — `cards`, `counts`, `overlay`, `order`, `versions`… | Newest's is always empty |
| `activate()` | controller | per tab | Newest's does nothing |
| `refresh` | controller | function or `null` | `null` for Live Results (own timer) and Newest (nothing to refresh) → Refresh control disabled |
| open | `.is-active` on the button; `hidden` absent on the panel | exactly one tab at a time | Trending on arrival, as today |
| disabled | `disabled` attribute | the three personal tabs while a guest | Icon dims with the button (`opacity:.45`) |

### State transitions

Unchanged from 017 for the five existing tabs. For Newest:

```
closed ──click──▶ open (is-active; panel shown; Refresh disabled; no request)
open ──click another tab──▶ closed
open ──sign in / sign out──▶ open (reset() absent → nothing runs; activate() runs → nothing happens)
```

`select()` calls `controller.activate()` after highlighting; Newest's `activate()` is empty, so the
transition is complete when the button and panel have changed. There is no loading, empty-state
or error state: the panel's `.tab-empty` element stays `hidden` as it is in the markup.

## Icon

A decorative drawing belonging to exactly one tab. Not an entity in any store; it exists only as
inline markup and is identified by its position (first child of its button) and the class
`tab-icon`.

| Tab | Kind | Source of truth | Colour |
|---|---|---|---|
| Trending | new | one filled path in `index.html`, traced from `designDocs/dontTrack/trendingupicon.jpg` | `currentColor` |
| Newest | new | circle + `!` path in `index.html` | circle `var(--line)`, `!` `var(--ink)` |
| My Private Polls | copy | the three shapes of `src/public/avatar-default.svg`; that file carries a note that the copy exists | `#8093a7` / `#e8edf2` (the file's own) |
| Favorites | copy | the `.bookmark-star` path string in `src/public/pollCard.js` | stroke `#9AA197`, no fill |
| Live Results | shared | the `.live-bars` markup and `pollCard.css` rules — not copied; the same class | palette 1–3 (the stylesheet's) |
| Search | copy | the `.search-icon` SVG in `src/public/app.js` | `currentColor` |

**Validation rule (tested)**: the Favorites path string in `index.html` equals the `.bookmark-star`
`d` attribute in `pollCard.js`; the Search circle and line attributes equal those in `app.js`.
The avatar and Live Results are asserted by presence (`viewBox="0 0 64 64"` with the two fills;
`.live-bars` inside the Live Results button).

## The rule

Not an entity — one pseudo-element (`.tab-bar-wrap::after`) with no state. Its only variable is
its width, which is always the viewport's (`100vw`); the tab strip's horizontal scroll position
does not affect it (R1).
