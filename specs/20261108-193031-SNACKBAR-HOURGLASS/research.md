# Research: Snackbar Hourglass

Decisions already made in `requirements/20261108-193031-snackbar-hourglass/requirements.md` and the spec's clarification (a smooth drain with a falling stream) are not reopened here. This settles what the spec left to the plan.

## R1. How the hourglass reaches the page

**Decision**: `app.js` builds the hourglass as an inline `<svg>` (via `document.createElementNS`) inside the notice, and `snackbar-m3.css` colours and animates it. There is no image file.

**Rationale**:
- Only an inline SVG can read the page's CSS custom properties (the M3 colour tokens) and be animated by its stylesheet. An `<img src="x.svg">` is a separate document that sees neither (requirements report UA2, RS2).
- `app.js` and `snackbar-m3.css` are already fingerprinted by `devScripts/build-assets.ts` and served from the CDN with an immutable one-year cache (`src/routes/assets.ts`), so the hourglass adds no request (SC-006, FR-011).
- A file named by a script is served by the instance, because the script cannot know the hashed name (requirements report RS2).

**Alternatives considered**:
- A committed `hourglass.svg` or `.gif`: it can't follow the theme, can't stand still for reduced motion, and adds a request. Rejected.
- A CSS-only drawing (borders and pseudo-elements): the two-bulb outline with a neck is awkward without paths and would not resemble the reference. Rejected.

## R2. The drawing

**Decision**: a `viewBox="0 0 22 32"` SVG at 22 × 32 px, with four parts:

| Part | Shape | Paint |
|---|---|---|
| `hourglass-frame` | the two-bulb outline with a narrow neck at the vertical centre, plus a short cap bar at top and bottom, as in the reference | `stroke: var(--md-sys-color-inverse-on-surface)`, no fill, 1.5 stroke width, round joins |
| `hourglass-top` | the sand in the top bulb: a shape filling the bulb's lower part down to the neck | `fill: var(--md-sys-color-inverse-primary)` |
| `hourglass-bottom` | the sand heap in the bottom bulb | same fill |
| `hourglass-stream` | a thin vertical rect from the neck to the bottom heap | same fill |

The frame path is drawn by hand to match the reference GIF's silhouette (`requirements/20261108-193031-snackbar-hourglass/snackbar_hourglass_7_seconds.gif`). Its proportions (33 × 48) are the same 0.69 ratio as 22 × 32.

**Rationale**: four small elements and no gradients or filters keep it a few hundred bytes of script and cheap to animate.

## R3. The drain animation

**Decision**: animate `transform` only, with linear timing and `animation-fill-mode: forwards`, all over one duration:

- `hourglass-top`: `scaleY(1 → 0)` with `transform-origin` at the neck (bottom centre of its box), so the sand's surface sinks into the neck.
- `hourglass-bottom`: `scaleY(0 → 1)` with `transform-origin` at the bottom of its box, so the heap grows.
- `hourglass-stream`: visible (`opacity: 1`) while running, then `opacity: 0` in the last 2% of the run.

Every animated part uses `transform-box: fill-box`, so its origin is measured from its own shape, not the SVG's viewport.

The **resting (non-animated) state is "full"**: top at scale 1, bottom at scale 0 and stream hidden. The animation's keyframes start by showing the stream, so reduced motion only needs to remove the animation (R5).

**Rationale**: transform and opacity animate on the compositor, with no layout or paint per frame. Linear timing matches "steadily", and a single `forwards` run never loops (FR-003).

**Alternatives considered**: SMIL `<animate>` doesn't follow `prefers-reduced-motion` through CSS and is harder to tie to the notice's timer. A clip-path animation repaints every frame. Both rejected.

## R4. One clock for the notice and the sand

**Decision**:
- `SIGN_IN_NOTICE_MS` becomes `7000` and stays the only source of the duration.
- `showSignInNotice` sets `--m3-snackbar-timer: 7000ms` on the bar's inline style.
- The animation reads `animation-duration: var(--m3-snackbar-timer)`.
- The SVG is inserted in the same `requestAnimationFrame` callback that sets the text, adds `is-shown` and starts the `setTimeout`. The CSS animation (which starts when the element is rendered) and the timer therefore start in the same frame.

The animation is attached to the `m3-snackbar--timed` modifier, **not** to `is-shown`. Removing `is-shown` at the end starts the fade without resetting the sand to full.

**Rationale**: one constant, no duplicated `7s` in CSS, so the two cannot drift apart (SC-002, within 0.2 s). A background tab doesn't run `requestAnimationFrame`, so the bar, the text, the timer and the sand all start together when the tab is first shown (spec edge case).

**Alternatives considered**: ending the notice on `animationend`. No animation runs under reduced motion, so a timer would be needed anyway. Rejected.

## R5. Reduced motion

**Decision**: inside the existing `@media (prefers-reduced-motion: reduce)` block of `snackbar-m3.css`, `.m3-snackbar--timed .hourglass-part{ animation:none; }`. The parts stay in their resting "full" state (R3) with no stream. The timer still ends the notice after 7 s (FR-007).

## R6. Layout inside the bar

**Decision**: the bar keeps `display:flex; align-items:center`. With the hourglass:
- the text sits in a `<span class="m3-snackbar-text">` (`flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere`);
- the SVG (`flex: none; width: 22px; height: 32px; margin-inline-start: 12px`) follows it;
- `.m3-snackbar--timed` sets `padding-block: 8px`, so one line gives 8 + 32 + 8 = 48 px, the existing `min-height`.

A wrapped address grows the bar while the SVG keeps its size (FR-005, FR-006).

**Rationale**: the text's line box is 20 px and the SVG's 32 px, so the SVG sets the one-line height and the padding brings it to exactly 48 px. `overflow-wrap: anywhere` breaks a long address with no spaces.

## R7. Colours and contrast

**Decision**: the outline uses `--md-sys-color-inverse-on-surface` (the notice's own text colour) and the sand uses `--md-sys-color-inverse-primary` (M3's accent for content on an inverse surface, as used by a snackbar's action).

Measured from `m3-tokens.css`:

| Theme | Bar | Outline | Sand |
|---|---|---|---|
| Light | `#2C322D` | `#EDF2EB` 11.55:1 | `#94D5A8` 7.71:1 |
| Dark | `#DFE4DD` | `#2C322D` 10.17:1 | `#2C6A46` 5.00:1 |

Every pair is above 3:1 (SC-004). The site's own theme choice (`colorScheme.js`) switches the same tokens, so it is covered too (FR-004).

## R8. Accessibility

**Decision**: the SVG carries `aria-hidden="true"` and `focusable="false"`, and has no `<title>`. The bar's `textContent` therefore stays exactly `Logged in as <email>` (SVG shapes contribute no text), which the existing test asserts and `role="status"` announces (FR-008).

## R9. Scope guard

**Decision**: the hourglass is built only in `showSignInNotice` (`app.js`). `adminCard.js`'s `snackbar()` and `profileCard.js`'s `.profile-snackbar` are untouched, and no rule applies without `m3-snackbar--timed` (FR-010).

`snackbar-m3.css` keeps its place in `LAYER_ORDER`, and no sheet is added, so `tests/m3-assets.test.ts` needs no change. Its literal sizes are widths and heights, not font sizes, which that test allows.

## R10. Tests and documentation

**Decision**:
- **`tests/client-sign-in-notice.test.ts`**:
  - `NOTICE_MS` becomes 7000;
  - new assertions: the bar has `m3-snackbar--timed`, an `svg[aria-hidden="true"]` is its last child after the text span, it has the four parts, the bar's `--m3-snackbar-timer` is `7000ms`, and the text is unchanged.
- **A sheet test** (in `tests/m3-assets.test.ts`, beside the snackbar test) pins:
  - the `animation-duration: var(--m3-snackbar-timer)` rule;
  - the token colours;
  - the 8 px block padding;
  - the reduced-motion `animation:none`.
- **Documentation**: `README.md:425` changes "about 6 seconds" to "7 seconds, with an hourglass", and `ARCHITECTURE.md` gets a line beside its `signedIn=1` entry. Both happen in the post-implementation documentation phase (constitution).

jsdom does not run CSS animations, so the visual drain is checked by the quickstart in a browser.
