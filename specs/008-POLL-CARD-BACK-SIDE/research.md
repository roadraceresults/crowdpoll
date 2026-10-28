# Phase 0 Research: Poll Card Back Side Parity

All Technical Context unknowns were resolvable from the existing codebase; no
`NEEDS CLARIFICATION` markers remain. The four spec-level ambiguities were
already closed in `/speckit-clarify` (spec.md § Clarifications, session
2026-08-14) and are treated here as inputs, not open questions.

---

## R1 — Root cause of the shortened choices region

**Decision**: The defect is a missing `[hidden]` override on
`.poll-closed-message`, not a flex-sizing bug in the choices region. Fix it by
extending the existing override rule in `site.css` to cover both closed-message
variants.

**Rationale**:

`007-closed-state` added two initially-`hidden` elements to
`POLL_CARD_TEMPLATE` (`pollCard.js:917`, `pollCard.js:941`) and styled them in
`site.css`:

```css
.poll-closed-message{ …; height:28px; display:flex; align-items:center; }
.poll-closed-message--back{ flex:1 1 auto; min-height:0; margin:0 0 16px;
                            display:flex; …; }
```

Both set `display` unconditionally. The `hidden` attribute works via the UA
stylesheet's `[hidden]{display:none}`, and **author-origin declarations always
beat UA-origin ones regardless of specificity** — so `hidden` is defeated and
both elements render on every card, whether the poll is open or closed.

That hazard was known: `site.css:222-230` carries a comment explaining this
exact mechanism and adds the override for the three neighbouring elements —

```css
.live-link[hidden],
.vote-btn[hidden],
.submit-vote-btn[hidden]{ display:none; }
```

— but the two `.poll-closed-message` elements, which have the same
`display:flex` problem, were left out. The comment even reasons about
`.voting-scroll-wrap` ("has no such override and needs none", which is correct —
`.bar-scroll-wrap` sets no `display`), which is likely how the closed-message
elements themselves were overlooked.

The consequence on the **voting side** is precisely the reported bug. The back
face is `display:flex; flex-direction:column` with these in-flow children:

| Child | Flex | Effective basis |
|---|---|---|
| `.question-wrap` | default (`0 1 auto`) | content height |
| `.voting-scroll-wrap` | `1 1 auto` + `margin-bottom:16px` | `0` (its content is absolutely positioned) |
| `.poll-closed-message--back` *(phantom)* | `1 1 auto` + `margin-bottom:16px` | `28px` (inherited `height`) |
| `.actions` | default, `margin-top:auto` | `28px` |

Two siblings share `flex-grow:1`, so the free space is split **evenly** between
the choices region and an empty element — and the phantom additionally consumes
its own `28px` basis and `16px` margin. The choices region therefore ends up at
roughly half its intended height, and the `28px + 16px` phantom is the "large
band of empty space above the back-side footer" described in spec.md and visible
in `poll-card-back-side-bug.jpg`.

On the **results side** the same phantom sits inside `.actions` (a `28px`-tall
flex *row*), where an empty `28px` item changes nothing measurable — which is
why the defect appears one-sided.

Adding `.poll-closed-message[hidden]{display:none}` removes the phantom, leaving
`.voting-scroll-wrap` as the only `flex-grow:1` child. Combined with R4 (equal
headers), both faces then resolve their scroll region to the identical height
from identical rules, satisfying FR-001 and FR-002. FR-003 follows for free —
see R5.

**Alternatives considered**:

- *Give `.voting-scroll-wrap` a larger `flex-grow` so it out-competes the
  phantom.* Rejected: masks the bug rather than fixing it, leaves an empty
  28px+16px band, and leaves the phantom to misbehave elsewhere.
- *Swap the `hidden` attribute for a class-based `.is-hidden` toggle in
  `updateClosedState()`.* Rejected: more code, changes JS that works, and
  abandons the plain-`hidden` convention 007 deliberately chose; the one-line
  CSS fix is strictly smaller (Principle II).
- *Move the styling into `pollCard.css` next to the display declarations.*
  Rejected: violates the reference-stylesheet convention (R3).

---

## R2 — FR-006 (footer parity) does not reproduce

**Decision**: FR-006 and FR-006a require **no code change**. They become
verification-only requirements, measured in quickstart.md. The one obligation
they impose is a constraint on R6: the closed-message restyle must not alter the
front variant's `28px` height.

**Rationale**: The spec states the two footers sit at different distances from
the bottom edge of the card. Reading the cascade, both faces derive footer
geometry from rules that are shared or identical:

- `.card-face` — one rule for both faces: `padding:18px 22px 16px` (`14px`
  bottom under the ≤479.98px media query, again for both).
- `.actions` — one rule for both: `margin-top:auto`, plus
  `.card-front .actions` and `.card-back .actions` declaring *identical*
  `flex-direction:row; align-items:center; justify-content:space-between`.
- `.bar-scroll-wrap` — one rule for both: `margin:0 0 16px`.
- Footer height — every footer child is `28px` tall (`.btn-vote`, `.live-link`,
  `.icon-btn`, and the front `.poll-closed-message`).
- Card height — both faces are `height:100%` of the same
  `.card-flip` grid cell (`grid-area:1/1`), so their bottom edges coincide by
  construction.

There is no declaration anywhere that makes one footer sit differently from the
other. The apparent difference in the screenshot is the R1 phantom: a `44px`
void directly above the back footer makes that footer read as "tighter to the
bottom" relative to its content, even though its distance to the card edge is
identical. Once R1 lands, the two footers coincide with no further work.

This is recorded rather than silently skipped because the spec asserts a defect
that the code does not contain. quickstart.md measures FR-006 explicitly (open
*and* closed, per FR-006a) so the claim is verified rather than assumed; if a
measurable delta does appear on real hardware, that is a genuine finding to
raise before writing speculative CSS for it.

**Alternatives considered**:

- *Add explicit footer height/padding declarations anyway, "to be safe".*
  Rejected under Principle III — every changed line must trace to a real need,
  and duplicating values that already match invites future drift.
- *Silently drop FR-006 from the plan.* Rejected under Principle I — the spec
  premise deserves an explicit answer, not omission.

---

## R3 — Where the CSS changes belong

**Decision**: All CSS changes go in `src/public/site.css`. `pollCard.css` is not
touched.

**Rationale**: `pollCard.css` is the checked-in reference stylesheet extracted
from the CrowdPoll design ("Extracted from the CrowdPoll grid so the card can be
designed on…", `pollCard.css:1-4`), and `007-closed-state` established the
convention of layering app-owned deltas in `site.css` instead of editing it. All
three CSS changes here are app-owned deltas of exactly that kind, so the same
split applies. This also keeps the diff legible: everything this feature changes
in CSS lands in one contiguous region of one file.

**Alternatives considered**: Editing `pollCard.css` directly — rejected; it
breaks the established convention and makes future re-syncs with the reference
design harder to reason about.

---

## R4 — Equalising the two headers (FR-004/FR-005)

**Decision**: Add `<p class="poll-totals"></p>` to the back face's
`.question-wrap` in `POLL_CARD_TEMPLATE`, and change `setText()`'s
`viewport.querySelector('.poll-totals')` to `querySelectorAll(...).forEach(...)`
so both copies receive the same string from the same computation.

**Rationale**: `setText()` (`pollCard.js:722-735`) already uses
`querySelectorAll` for `.question` and `.subtitle` — the two elements duplicated
across faces — and `querySelector` for `.poll-totals`, which today exists only
on the front. Making the totals element the third member of that duplicated set
is the smallest change that satisfies FR-004, and because the text is built once
and written to both nodes in the same call, FR-005 (identical value at all
times, including live updates) holds by construction: `setText()` runs on every
render, so both copies update in the same tick. No new formatting code, no
second code path, nothing to keep in sync.

`.poll-totals` is styled once in `site.css:213` with no face-scoped selector, so
the new element picks up identical typography with no CSS change. Placing it
last inside `.question-wrap` mirrors the front's DOM order exactly, satisfying
FR-004's "same position within the card header".

Per the clarification, the duplicate is plain — no `aria-hidden`, no `aria-live`
— matching how the already-duplicated `.question` and `.subtitle` behave.

**Alternatives considered**:

- *Keep `querySelector` and add a second explicit lookup for the back node.*
  Rejected: two code paths where one suffices, and it invites the two from
  drifting.
- *Render the totals once into a shared overlay outside both faces.* Rejected:
  the faces are `backface-visibility:hidden` siblings in a 3D transform; an
  overlay would not flip with them and would be far more code.

---

## R5 — Why FR-003 (equal visible rows) needs no separate work

**Decision**: No dedicated implementation. FR-003 is a consequence of FR-001 and
is verified, not engineered.

**Rationale**: Both faces size their rows through the *same* functions:
`renderPollResults()` (`pollCard.js:392`) and `renderVotingOptions()`
(`pollCard.js:565`) each call `computeBarLayout(count, wrap.clientHeight)`, which
delegates to the shared `computeBarMetrics()` / `computeMaxBarsAtFloor()`
(`pollCard.js:136-186`) with the same `RESULTS_MAX_BAR_HEIGHT` /
`RESULTS_MIN_BAR_HEIGHT` / `RESULTS_GAP_*` constants. Row height, gap,
compact-mode threshold, and the scrolling decision are therefore pure functions
of `(count, availableHeight)`.

`count` is the same poll on both faces. So once R1 and R4 make the two
`availableHeight` measurements equal, both faces necessarily produce identical
`barHeight`, `gap`, and `scrolling` values — same visible row count, same
scroll-onset threshold, same arrow-row behaviour (`updateArrowRows` is likewise
shared). This is also why the bug manifested as *fewer rows* on the back rather
than *differently sized* rows: the sizing logic was already correct and was
simply being handed a smaller box.

**Alternatives considered**: Explicitly synchronising row counts between faces
in JS — rejected as redundant work that would duplicate a guarantee the existing
shared sizing already provides.

---

## R6 — Restyling the closed messages (FR-008) without moving the footer

**Decision**: Restyle both variants to the `.poll-totals` treatment —
`font-family:'Inter', sans-serif; font-weight:500;
font-size:clamp(11px, 1vw, 12.5px); line-height:1.4; color:var(--muted)` —
while **keeping `height:28px` on the front variant**.

**Rationale**: FR-008 asks for the participation count's exact grey treatment
(colour, family, weight, size), so copying those four declarations from
`.poll-totals` (`site.css:213-220`) is the literal implementation; reusing the
same `clamp()` keeps the two in step at every viewport width, which is what
SC-006 checks. Today the front variant is `color:var(--ink); font-weight:700;
font-size:12.5px` (it was styled to match `.live-link-label`, which it replaces)
and the back variant is `color:var(--muted); font-weight:500; font-size:14px` —
so both need the change, and the two currently differ from each other as well.

Retaining `height:28px` on the front variant is what makes FR-006a hold: that
element is a flex item in the footer row, so dropping the fixed height would let
the footer's height follow the now-smaller text and shift the footer up in the
closed state only. The fixed height also guarantees the single-line rendering
FR-006a requires, since `align-items:center` in a `28px` box with `12.5px` text
cannot wrap to two lines at any supported width.

The back variant keeps its `flex:1 1 auto; min-height:0; margin:0 0 16px` and
centring so it continues to fill the shared region (spec.md Edge Cases), with
only the four typography declarations changing.

**Alternatives considered**:

- *Have both variants share a single class with `.poll-totals`.* Rejected: the
  two elements need genuinely different box behaviour (fixed-height footer item
  vs. flexing region filler); sharing only the typography via duplicated
  declarations is clearer than a class that means two different things.
- *Drop `height:28px` and let the footer size to content.* Rejected: breaks
  FR-006a, which the clarification explicitly settled.

---

## R7 — Equalising the primary button widths (FR-007)

**Decision**: Add a visually-hidden width sizer carrying the longer label to the
**Vote** button, so both buttons resolve to the same content-derived intrinsic
width, with the existing `min-width:25%` retained as the floor.

**Rationale**: `.btn-vote` (`pollCard.css:434-443`) is already shared by both
buttons: `flex:0 0 auto; width:auto; min-width:25%; padding:0 14px;
white-space:nowrap`. The pair is therefore equal only while the `25%` floor
exceeds both labels — true at a 420px card (`105px` floor vs. roughly `103px`
for "Submit vote"), false at narrow widths (a 320px card gives an `80px` floor,
so "Submit vote" wins and "Vote" stays narrow). FR-010 demands parity at *every*
width, so the shared width must stop depending on each button's own label.

The clarification chose a content-derived width over a hard-coded dimension. CSS
cannot read a string from another subtree, so the way to derive it is to put the
longer string inside the shorter button, laid out but not painted and not
announced — **stacked on top of the visible label rather than beside it**:

```html
<button class="btn-primary btn-vote vote-btn" type="button"><span
        class="btn-vote-label">Vote</span><span class="btn-vote-sizer"
        aria-hidden="true">Submit vote</span></button>
```

```css
/* Single-cell grid: both children occupy the same track, so the column
   resolves to max(label, sizer) rather than their sum. */
.vote-btn{ display:grid; justify-content:center; align-content:center; }
.vote-btn > *{ grid-area:1 / 1; }
.btn-vote-sizer{ visibility:hidden; height:0; overflow:hidden; }
```

**The stacking is the load-bearing part, and a naive version of this technique
fails.** `.btn-primary` (`pollCard.css:420-426`) sets `display:flex`, so the
button is a flex container: a sizer added as a plain sibling of the label
becomes a second flex item in the same row, and a row flex container's
max-content width is the **sum** of its items. That would size the Vote button
to `width("Vote") + width("Submit vote") + padding` — far too wide, and wrong in
the opposite direction from the bug being fixed. `height:0`, `overflow:hidden`
and `visibility:hidden` do not prevent a flex item's width from contributing.

Overriding the front button to a single-cell grid fixes this: with both children
placed in cell `1 / 1`, the column's max-content size is the **maximum** of the
two, which is exactly "Submit vote". The sizer's `height:0` keeps the row height
driven by the visible label, and `justify-content`/`align-content:center`
reproduce the centring `.btn-primary`'s flex rules were providing.

Three details make this safe:

- The visible label **must** be wrapped in `.btn-vote-label`. A bare text node
  becomes an *anonymous* grid item, which `.vote-btn > *` cannot target, so it
  would auto-place into row 2 instead of stacking.
- The override is scoped to `.vote-btn`, not the shared `.btn-vote`, so
  `.submit-vote-btn` stays a flex button and is not touched at all
  (Principle III). Both still resolve to the same width, because the back button
  already sizes to "Submit vote" naturally.
- `site.css` is the last stylesheet loaded (`index.html:15-17`), so
  `.vote-btn{display:grid}` wins over `.btn-primary{display:flex}` at equal
  specificity — while `.vote-btn[hidden]{display:none}` (specificity `0,2,0`)
  still wins over both, so `007-closed-state`'s hiding of the button on a closed
  poll keeps working.

The sizer tracks font-family, font-size, font-weight, padding, and viewport
automatically — the properties that actually vary at runtime. `aria-hidden` is
required (without it the button announces "Vote Submit vote"); this is intrinsic
to the technique, not a change to the accessibility posture the clarification
settled.

**Known limitation, stated plainly**: the sizer duplicates the literal
`"Submit vote"`. If that label is ever edited, the sizer must be edited to
match. A comment at both sites will say so. Fully automatic adaptation would
require runtime measurement, which the clarification rejected.

**Alternatives considered**:

- *`min-width: max(25%, 7.5em)` — one line.* Rejected as the clarification's
  option B: it is a hand-tuned constant that silently mis-sizes if the label,
  font, or padding changes, and re-tuning it is invisible work.
- *Measure the back button in JS and assign the width to the front button on
  render and resize.* Rejected as the clarification's option C: it adds a
  measurement path to a hot render loop and can flash a mis-sized button before
  the first measurement.
- *Shorten "Submit vote" to "Submit".* Rejected: changes user-facing copy, which
  is outside this feature's scope.
- *Keep the button as flex and add the sizer as a plain sibling of the label.*
  Rejected because it does not work — a row flex container sizes to the **sum**
  of its items, not the max, so the button would render roughly twice as wide as
  intended. This was the mechanism originally written into this section and it
  was corrected after `/speckit-analyze` (finding C1); it is recorded here so the
  failure mode is not re-discovered later.

---

## R8 — Verification strategy

**Decision**: Manual measurement via quickstart.md for SC-001…SC-006, plus one
new supertest suite asserting the served static assets carry the new markup and
rules. No layout-measuring or browser-automation harness.

**Rationale**: This implements spec.md VM-001/VM-002 verbatim. The repository has
no DOM or browser test tooling (no jsdom, happy-dom, or Playwright in
`package.json`), and no existing test references `pollCard.js` at all — the
client-side features `005`, `006`, and `007` were each validated through their
own `quickstart.md`, under the constitution's tests-OR-explicit-manual-check
allowance (Principle IV). Adding a browser harness for a presentational fix
would be a large infrastructure change with its own maintenance surface, and
jsdom would be worse than nothing here: it performs no layout, so every pixel
assertion would pass vacuously.

What *can* be checked cheaply and meaningfully is that the shipped assets
contain the intended markup and declarations. `src/server.ts:52` serves
`src/public` via `express.static`, so a supertest `GET /pollCard.js` and
`GET /site.css` can assert on the response text using the same
`expect(res.text).toContain(...)` pattern as `tests/pages.test.ts:32`. That
guards the specific regressions a future edit is most likely to introduce —
dropping the `[hidden]` override again, or removing the back-face totals element
— without pretending to verify geometry.

**Alternatives considered**: Playwright with real bounding-box assertions —
genuinely the strongest verification, and worth revisiting if the poll card
grows more layout-critical behaviour, but rejected here by the clarification as
disproportionate to a four-line presentational fix.
