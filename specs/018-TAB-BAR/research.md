# Phase 0 Research: Tab Bar

Eight decisions. Each records what was chosen, why, and what was rejected. No
`[NEEDS CLARIFICATION]` items remained from the specification, so nothing here resolves an
unknown — these are the choices the implementation would otherwise make ad hoc, plus the two
places (R1, R6) where the obvious implementation renders and is wrong.

---

## R1 — The rule is a `::after` on `.tab-bar-wrap`, never on `nav.tab-bar`

**Decision**: `.tab-bar-wrap { position:relative }` and
`.tab-bar-wrap::after { content:""; position:absolute; left:50%; bottom:-7px; width:100vw;
height:2px; background:var(--line); transform:translateX(-50%) }`, with `.page { overflow-x:clip }`.

**Rationale**: FR-018 needs the line at the window's edges while the row sits inside the 1280px
`.container`; FR-021 needs it to stay put when the tab strip scrolls. `nav.tab-bar` has
`overflow-x:auto`, which clips any pseudo-element to its own box and scrolls it with the content —
the line would stop at the container edge and slide with the tabs. `.tab-bar-wrap` does not scroll,
holds the Refresh control too (so FR-019's "Refresh sits above it" is automatic), and already has
`margin-bottom:20px`, inside which the 6px offset fits. `100vw` counts the vertical scrollbar's
width on Windows browsers; `overflow-x:clip` on `.page` (already `position:relative; width:100%`)
stops that from creating a horizontal scrollbar (FR-020) without affecting anything else on the
page. `bottom:-7px` with `height:2px` puts the line in the band 5–7px below the wrap's bottom edge;
the wrap is `align-items:flex-end` and the strip has no bottom padding, so the tab buttons and the
Refresh control both rest on that edge with the same 5px of air above the line (FR-017, FR-019;
FIX06, FIX07). An offset rather than a padding or
margin keeps the row's height unchanged (assumption).

**Alternatives considered**: moving the bar out of `.container` into a full-width band — the
"proper" layout, rejected by the architecture pass and the requirements (no restructure) because
it moves the bar, header and `main` onto different ancestors and touches a page shape that six
scripts and the browser tests know. `border-bottom` on `body` or `.page` — rejected: it cannot sit
6px under the row while the row is inside the column. A separate `<hr>` element — rejected: an
extra DOM node for one line, and it would need the same positioning trick anyway.

---

## R2 — Buttons become `inline-flex`; icons are 16×16 with a 6px gap

**Decision**: `.tab-bar .tab` gains `display:inline-flex; align-items:center; gap:6px`.
Every icon carries the class `tab-icon` with `width:16px; height:16px; flex:0 0 auto`. The
`.tab` rule's padding, radius, colours, font and `white-space:nowrap` are unchanged.

**Rationale**: FR-005 — one 16px box, one 6px gap, icon and label centred on one line. `gap` on
the button avoids per-icon margins; `flex:0 0 auto` stops the icon shrinking when the bar is
squeezed on a phone (FR-022 keeps the scroll, but a flex child would otherwise be the first thing
to give). `inline-flex` keeps the buttons inline in the bar's own flex row exactly as they are now.

**Alternatives considered**: `vertical-align:middle` on inline SVGs — rejected: baseline
alignment against a 13px label drifts by a pixel or two per glyph and is what "vertically centred
on one line" was written to exclude. Padding-left with a background-image icon — rejected:
background images cannot take `currentColor` (FR-013) and are fetched separately (FR-015).

---

## R3 — The Live Results icon is the card's `.live-bars` markup in a 16px box

**Decision**: the Live Results button contains
`<span class="tab-icon tab-icon--live" aria-hidden="true"><span class="live-bars"><i></i><i></i><i></i></span></span>`
with `.tab-icon--live { display:flex; align-items:flex-end }`. No `live-bars` rule is added or
overridden.

**Rationale**: FR-010 wants "the same three-bar picture … with the same bouncing animation";
`pollCard.css` is already loaded by `index.html`, so the class, its three palette colours, the
`live-bar-bounce` keyframes and the `prefers-reduced-motion` rule apply as-is. FR-011 as revised by
FIX08 — running for members, still for guests — is one more exception beside the reduced-motion
one: `.is-guest .live-bars i { animation:none }`, keyed on a `body.is-guest` class that `app.js`
toggles from the session snapshot (`index.html` starts as a guest so the first paint is still). The bars are 14px tall on the
card; the outer 16px box aligns them to its bottom (FR-010's "sitting on the bottom of the 16
pixel box"). Sharing the definition means a future change to the card's icon changes the tab's,
which is the intent of "the exact same icon" (spec assumption). `opacity:.45` on a disabled button
dims the bars; whether they move is decided by sign-in, not by the button's state (FR-016).

**Alternatives considered**: copying the bars' CSS under a `.tab-live-bars` name — rejected as a
second copy of one animation that would drift. An SVG drawing of three static bars with its own
`<animate>` — rejected: not "the same icon", and a second animation to keep in step.

---

## R4 — The four reused glyphs are copied verbatim; the two new ones are single filled paths

**Decision**:

| Icon | Markup |
|---|---|
| Favorites | `<svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55-4.76-4.64 6.58-.96z" fill="none" stroke="#9AA197" stroke-width="1.8" stroke-linejoin="round"/></svg>` — the `.bookmark-star` path string from `pollCard.js`, without its `transform` (the star fills the 24-unit box on its own) |
| Search | the header's `.search-icon` SVG from `app.js` — `<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`, `fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round` — with class `tab-icon` |
| My Private Polls | the three shapes of `avatar-default.svg` inside `<svg class="tab-icon" viewBox="0 0 64 64">`, fills `#8093a7` / `#e8edf2` verbatim |
| Trending | one filled `<path fill="currentColor">` in a 24-unit box: a downward-bowing swoosh from the lower left to the upper right ending in a solid arrowhead pointing upper-right, stroke weight ≈ 1/5 of the box (FR-006 governs; `trendingupicon.jpg` is an untracked reference) |
| Newest | `<circle cx="12" cy="12" r="12" fill="#8093a7"/>` (fills the 24-unit box, as the avatar fills its 64-unit one) plus one `<path fill="#e8edf2">` for the `!` — the avatar's two colours — a tapered bar and a dot — with `transform="skewX(-12)"` about the centre for the italic |

**Rationale**: FR-009 and FR-012 say "identical"; copying the path and attribute strings is the
only way to make that true and testable (the asset test compares the Favorites path string with
`pollCard.js`'s). The Newest `!` is a path rather than `<text>` so it never depends on a font and
can never be read aloud even if an assistive tool ignores `aria-hidden` on the parent (FR-014).
Colour tokens: the Newest icon reuses the avatar's `#8093a7` / `#e8edf2` so the pair match
(FIX05); `#9AA197` is the unpressed Bookmark control's
grey, so the two stars match on screen (spec assumptions).

**Alternatives considered**: `<use href="#…">` from a hidden sprite — rejected: a new pattern in a
codebase that inlines every icon, and it does not save a request. `<img src="/avatar-default.svg">`
for the avatar — rejected by the requirements (no separate images): it would be the one icon
fetched separately (SC-005), and the copy is three shapes.

---

## R5 — Trending and Search take `currentColor`; the rest carry their own colours

**Decision**: the Trending and Search SVGs use `fill="currentColor"` / `stroke="currentColor"`
and no colour rule of their own; `.tab` already sets `color:var(--muted)` and `.tab.is-active`
sets `color:var(--moss-dark)`, so the two icons follow the label for free. The Newest, Favorites
and avatar colours are attributes on the SVG (R4). No new CSS custom property is introduced.

**Rationale**: FR-013 verbatim. Attributes on the SVG keep the fixed colours next to the shapes
they colour, and the asset test can assert them by reading `index.html`. Hover (`paper-raised`
background) changes no text colour today, so the icons do not change on hover either.

**Alternatives considered**: a `.tab-icon` colour rule overriding `currentColor` for all six —
rejected: it would have to be undone for the four fixed-colour icons.

---

## R6 — Newest is a controller literal registered in `tabs.js`'s `init()`

**Decision**: in `init()`, after the two personal tabs are created:
`controllers.newest = { guestsAllowed: true, state: window.DeltaClient.createTabState(), activate() {}, refresh: null };`
No `KIND_OF` entry, no module, no panel script.

**Rationale**: `select(name)` returns immediately when `controllers[name]` is missing — the button
would never highlight and the panel would never show (architecture §4). The literal is the
smallest object that satisfies every consumer in `tabs.js`: `select()` reads `guestsAllowed` and
calls `activate()`; `updateRefreshButton()` disables the control when `refresh` is falsy (FR-026,
no new code); `applyVote`, `updateOverlayEverywhere`, `heldCopy` and `overlayOf` iterate every
controller and skip one whose `state.cards` is empty or whose `grid` is undefined — a real
`createTabState()` (empty maps) keeps those loops honest without a guard. `PERSONAL_TABS` is
untouched, so `applyGuestState()` never disables Newest (FR-024). Nothing in `activate()` means
no request (FR-025) and no empty-state text (FR-023): `emptyState()` is never called, and the
panel's `.tab-empty` element stays `hidden` as it is in the markup.

**Alternatives considered**: a `newestTab.js` module shaped like `trending.js` — rejected as
speculative structure; the follow-on feature will write that module to its own requirements and
replace this literal in one line. Leaving the tab unregistered and special-casing `"newest"` in
`select()` — rejected: a branch in shared code for one tab, and it would still need a state
object for the iterating helpers.

---

## R7 — Order and labels change in `index.html` only; identifiers do not

**Decision**: the six buttons are rewritten in the stated order with Title Case labels; `data-tab`
values stay `trending`, `private`, `favourites`, `search`, `live` and the new one is `newest`; the
panel sections are reordered to match and a sixth `<section class="tab-panel" data-panel="newest" hidden>`
with the standard `.card-grid` and hidden `.tab-empty` is added.

**Rationale**: FR-001/FR-002 and the spec's first assumption. Every selector in `tabs.js`,
`liveResults.js`, `searchTab.js`, `trending.js` and the browser tests addresses tabs by `data-tab`
/ `data-panel`, so nothing else moves. `select("trending")` on load and the `?q=` deep link are
unaffected. Panel order is cosmetic (only one is visible) but is kept in step with the buttons so
the markup reads in one order.

**Alternatives considered**: renaming `favourites` to `favorites` to match the new label — rejected
under Principle III; it would touch the API path `/api/tabs/favourites/refresh`, `KIND_OF`,
`PERSONAL_TABS`, `placeBookmark` and a dozen tests for no user-visible gain.

---

## R8 — What the tests can and cannot see

**Decision**: browser tests (`tests/client-home.test.ts`, jsdom) assert structure and behaviour:
six `.tab` buttons in order with the exact label text; each button's first element child is an
icon with `aria-hidden="true"`; the Live Results button contains `.live-bars`; the accessible
name (text content, trimmed) equals the label; Newest opens for a guest without a redirect and for
a member, `requests` gains nothing, `#refreshBtn` is disabled, the panel's `.card-grid` is empty
and `.tab-empty` is hidden. A new asset test file (`tests/tab-bar-assets.test.ts`, following
`poll-card-assets.test.ts`) asserts on served text: `index.html` carries six `.tab-icon`s; the
Favorites path string equals the `.bookmark-star` path in `pollCard.js`; the Search SVG's circle
and line match `app.js`'s; `tabs.css` carries `.tab-bar-wrap::after` with `width:100vw` and
`.page` with `overflow-x:clip`; `avatar-default.svg` contains the note. Geometry — the rule
reaching both window edges, no horizontal scrollbar, 16px icons, the Search/Live Results swap
*looking* right — is verified by eye in `quickstart.md`.

**Rationale**: jsdom does not compute layout or paint, so a `100vw` assertion in jsdom is
meaningless; the stylesheet text is the testable proxy, and the manual scenario is the real
check (SC-002). The existing suites already cover FR-003's "unchanged behaviour": they pass
unchanged apart from the two label strings, which no test asserts on (SC-003).

**Alternatives considered**: a headless-browser screenshot test — rejected: a new dependency and
CI surface for one line of CSS.
