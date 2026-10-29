---

description: "Task list for Line Graph Material 3"
---

# Tasks: Line Graph Material 3

**Input**: Design documents from `specs/20261028-183546-LINE-GRAPH-M3/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md) (R1–R11),
[data-model.md](data-model.md), [contracts/ui-contracts.md](contracts/ui-contracts.md) (C1–C6),
[quickstart.md](quickstart.md)

**Tests**: Requested. Research R11 and the quickstart list the test files: `tests/client-line-colors.test.ts` (new),
`tests/line-graph-ui.test.ts` (updated) and `tests/m3-assets.test.ts` (one new check). Within each story the tests
are written first and must fail before the implementation tasks.

**Organization**: Tasks are grouped by user story so each story can be built and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: The user story the task belongs to (US1, US2, US3)

## Path Conventions

- Single repository: the browser client is in `src/public/` and the tests are in `tests/`.
- No server, route, configuration, data or migration change (FR-020). `postman/openapi.json` and the Cookie Use
  table in `privacy.html` are untouched, because no route and no storage key are added.
- The constitution's rule VI applies to every task: no comment citing this feature, a task, a requirement or a
  finding. A comment is allowed only where it names an outside reference, such as an M3 component spec or WCAG.

## Shared facts every task relies on

- `lineGraph.js` is one IIFE with a module-level `state`. `mount(element, ctx)` builds this structure:
  `div.line-graph` > `h2.line-graph-title`, `p.line-graph-subtitle`, `p.line-graph-note`, `div.line-graph-legend`,
  `div.line-graph-plot` (`state.graphEl`), `div.line-graph-scales` (`state.scalesEl`).
  - `render()` calls `renderLegend()`, `renderSvg()` and `renderScales()`.
  - `renderSvg()` replaces the plot's children with a new SVG and resets `state.view`, so it drops the crosshair
    and the tooltip.
  - The `ResizeObserver` calls `renderSvg()` alone.
- `colorOf(choiceId)` returns the colour the line is drawn in today: the response's manual hex, else the hex from
  `card.resultColors()`.
- `pollCard.js` loads before `lineGraph.js` on `index.html` and in the test's `SCRIPTS` list. Its helpers are at
  about lines 332–360:
  - `contrastRatio(a, b)`
  - `hexToHsl(hex)` → `{h, s, l}`
  - `hslToHex(h, s, l)`
  - `darkShadeOf` and `lightShadeFor`, the lightness walks to copy the style of.
- `window.PollCard = {…}` is at about line 1607.
- Test facts for `tests/line-graph-ui.test.ts`:
  - jsdom gives the SVG a zero-size rect, so `nearestBucketIndex` reads `clientX` as a viewBox coordinate: 0 is the
    oldest bucket, 320 the newest.
  - The `pointer()` helper dispatches `MouseEvent`s on the SVG with `bubbles:true`. These events have no
    `pointerType`; to make one a touch, set it with `Object.defineProperty(event, "pointerType", { value: "touch" })`.
  - jsdom has no `matchMedia`. A test that needs it installs a fake in `openPage`'s `beforeScripts`: an object with
    `matches`, `addEventListener` and `removeEventListener`, which records its `change` listeners.
  - A test sets the surface with an inline style on `.maximized-space-right`, which jsdom's `getComputedStyle`
    reports back.
    - The panel does not exist before the first maximize: `tabs.js` `maximizedView()` clones it from
      `<template id="maximizedCardGrid">` and mounts the graph in the same call.
    - So, before clicking Maximize, set the style on the template's copy:
      `page.document.getElementById("maximizedCardGrid").content.querySelector(".maximized-space-right").style.backgroundColor = "rgb(15, 21, 17)"`.
    - After the first maximize, change the live panel's style instead (`side.style.backgroundColor = …`).
  - Without such a style, the computed background is not an opaque colour, so no shading applies and the existing
    colour tests stay as they are.
- `seedPoll` in the test gives `c1` "Yes" (automatic, `#006120`), `c2` "No" (automatic) and `c3` "Maybe", which has
  the manual colour `#0808FD`. On the dark surface `#0F1511`, `lineColorOn` turns `#0808FD` into `#4444FD` and
  `#006120` into `#007527`. On white both stay as they are (research R2).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the starting point is green, so later failures belong to this feature.

- [X] T001 Run `npx vitest run tests/line-graph-ui.test.ts tests/m3-assets.test.ts tests/client-bar-colours.test.ts` and `npx tsc --noEmit` from the repository root and confirm that all pass before any edit. Record any failure that is already there in this task's line instead of fixing it.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The in-memory state from [data-model.md](data-model.md) and one crosshair entry point that US2 and US3
both build on.

**⚠️ CRITICAL**: Finish this phase before any user-story phase.

- [X] T002 In `src/public/lineGraph.js` `mount()`, extend the `state` object literal with the [data-model.md](data-model.md) fields:
  - `crosshairTime: null`
  - `pointerPlaced: false`
  - `liveEl: null`
  - `colorScheme: null`
  - `onDocumentPointerDown: null`

  In `unmount()`, before `state.el.replaceChildren()`, remove the listeners these fields will hold:
  - if `state.colorScheme` is set, call `state.colorScheme.removeEventListener('change', state.onSchemeChange)`;
  - if `state.onDocumentPointerDown` is set, call `document.removeEventListener('pointerdown', state.onDocumentPointerDown)`.

  The `onSchemeChange` field is set in T008. Leave both guards in place even while the fields are still null.
- [X] T003 In `src/public/lineGraph.js`, make the crosshair's shown state a bucket time:
  - `placeCrosshair(index)` also sets `state.crosshairTime = state.data.buckets[index]`.
  - `clearCrosshair()` also sets `state.crosshairTime = null`.

  Every later placement and hide goes through these two functions. Behaviour is otherwise unchanged, and the existing crosshair tests still pass.

**Checkpoint**: `npx vitest run tests/line-graph-ui.test.ts` is green; the user stories can start.

---

## Phase 3: User Story 1 - Every line is visible in both themes (Priority: P1) 🎯 MVP

**Goal**: Each line, legend dot and tooltip dot is drawn in its bar's colour. A colour below 3:1 on the graph's
surface is shaded to the nearest same-hue shade that reaches 3:1 (C1, C2; research R1–R3).

**Independent Test**: `npx vitest run tests/client-line-colors.test.ts` passes for every automatic, Yes/No and
manual colour on `#FFFFFF` and `#0F1511`. With a dark surface set on the panel, the `c3` line of a maximized poll
is stroked `#4444FD`, and switching the colour scheme redraws it.

### Tests for User Story 1 ⚠️

> Write these first and confirm they fail before T006–T008.

- [X] T004 [P] [US1] Create `tests/client-line-colors.test.ts` (C1, SC-001, SC-002).
  - **Setup**:
    - Load `pollCard.js` in jsdom with `openPage` from `tests/helpers/browser.ts`, as `tests/client-bar-colours.test.ts` does.
    - Parse every automatic colour from `RESULTS_PALETTE_ENTRIES` in `src/public/pollCard.js`, the way that test does.
    - Add Yes `#006120`, No `#F91010` and every colour of `BAR_PALETTE` from `src/polls/barPalette.ts`.
  - **Assertions**, for each colour on each of the surfaces `#FFFFFF` and `#0F1511`, with
    `out = window.PollCard.lineColorOn(hex, surface)`:
    1. `out` matches `/^#[0-9A-F]{6}$/`.
    2. Its contrast ratio against the surface is at least 3. Compute it with an independent WCAG relative-luminance
       function written in the test, not with the page's own `contrastRatio`.
    3. When `hex` already reaches 3:1, `out === hex.toUpperCase()`.
    4. Otherwise, `out`'s HSL hue is within 1° of `hex`'s (skip this for greys, saturation 0) and its saturation is
       unchanged within 0.01.
  - **Spot checks** from research R2:
    - `lineColorOn("#000000", "#0F1511") === "#636363"`
    - `lineColorOn("#880015", "#0F1511") === "#C7001F"`
    - `lineColorOn("#FFFF00", "#FFFFFF") === "#999900"`
    - `lineColorOn("#E0E0E0", "#FFFFFF") === "#949494"`
    - `lineColorOn("#0808fd", null) === "#0808fd"`, so with no surface the colour comes back exactly as passed.
- [X] T005 [P] [US1] In `tests/line-graph-ui.test.ts`, add a `describe("line colours per theme (C2)")` block with three cases. Each seeds with `seedPoll` and `seedHistory`, then calls `sweeps()`, `open()` and `maximize()`.
  1. **Unchanged on light.** Before clicking Maximize, set the template's panel background to `rgb(255, 255, 255)` (see *Shared facts*). Expect:
     - the `c3` polyline (`polyline.line-graph-line[data-choice-id="c3"]`) has `stroke` `#0808FD`, matched case-insensitively;
     - the legend dot of the third legend entry has the same colour.
  2. **Shaded on dark.**
     - Install a fake `matchMedia` in `beforeScripts` (see *Shared facts*); this case needs its `change` listener list.
     - Before clicking Maximize, set the template's panel background to `rgb(15, 21, 17)`, so the first draw is already shaded.
     - Expect the `c3` polyline's stroke to be `#4444FD`. Expect the third legend entry's `.line-graph-dot` background to be that colour too; jsdom reports it as `rgb(68, 68, 253)`.
     - After `pointer(page, side, "pointermove", 320)`, expect the third tooltip entry's dot to be the same colour.
  3. **Redrawn on a scheme change.**
     - Start with the dark surface on the template, so the stroke is `#4444FD`.
     - Change the live panel's surface to `rgb(255, 255, 255)` (`side.style.backgroundColor`).
     - Call every recorded `change` listener and `await page.settle(10)`.
     - Expect the stroke to be `#0808FD` again, and the legend to be redrawn (a new `.line-graph-dot` node).
     - After `unmount` (Escape closes the maximized view), expect the fake's listener list to be empty.

### Implementation for User Story 1

- [X] T006 [US1] In `src/public/pollCard.js`, add `function lineColorOn(hex, surfaceHex)` beside `darkShadeOf` and `lightShadeFor`, in the same style (C1, R2):
  - **Unchanged cases.** Return `hex` exactly as passed when `surfaceHex` is falsy or `contrastRatio(hex, surfaceHex) >= 3`.
  - **The walk.** Otherwise:
    1. Take `{h, s, l} = hexToHsl(hex)` and the surface's lightness from `hexToHsl(surfaceHex).l`.
    2. Step `l` by `+0.01` when the surface is dark (its lightness < 0.5), by `-0.01` when it is light, clamped to `[0, 1]`.
    3. Stop at the first `hslToHex(h, s, l)` whose `contrastRatio` against `surfaceHex` is ≥ 3, or at the bound.
    4. Return that colour upper-cased.
  - **Export.** Add `lineColorOn: lineColorOn` to the `window.PollCard = {…}` object.
  - **Before relying on the helpers**, read `contrastRatio`, `hexToHsl` and `hslToHex` to confirm their argument
    and return shapes. If `hexToHsl` returns lightness in 0–100 rather than 0–1, scale the step and bounds to
    match.

  Depends on nothing else in this phase. T004 must turn green.
- [X] T007 [US1] In `src/public/lineGraph.js`, apply the shading at every draw (C2, R3):
  - **`surfaceHex()`** reads `getComputedStyle(state.el).backgroundColor`. It returns `#RRGGBB` only for an opaque
    `rgb(r, g, b)` or an `rgba(r, g, b, 1)`, and `null` otherwise, including for `transparent` and
    `rgba(0, 0, 0, 0)`.
  - **`lineColorOf(choiceId, surface)`** returns `colorOf(choiceId)` when it is not a `#RRGGBB` string (the
    `'currentColor'` fallback). Otherwise it returns `window.PollCard.lineColorOn(colorOf(choiceId), surface)`.
    `pollCard.js` always loads before `lineGraph.js`, so there is no guard for a missing `window.PollCard`.
  - **One read per pass.** Read `surfaceHex()` once at the start of `renderLegend()`, of `renderSvg()` and of
    `placeCrosshair()`, and pass it to `lineColorOf`. Use `lineColorOf` for:
    - the legend `.line-graph-dot` background;
    - the polyline `stroke`;
    - the tooltip `.line-graph-dot` background.

    Do not cache the result across draws; `state.cardColors` stays cached as today.

  Leave the file's opening comment as it is: the shading is documented by the tests, not by a comment.
  Depends on T006.
- [X] T008 [US1] In `src/public/lineGraph.js` `mount()`, follow the device's colour scheme (C2, R3, US1 scenario 4):
  - When `typeof window.matchMedia === 'function'`:
    - set `state.colorScheme = window.matchMedia('(prefers-color-scheme: dark)')`;
    - set `state.onSchemeChange` to a function that, when `state` is set and `state.data` has at least 2 buckets,
      calls `renderLegend()` then `renderSvg()`;
    - add it with `addEventListener('change', …)`.
  - The removal is already in `unmount()` from T002.

  Depends on T007. T005 must turn green.

**Checkpoint**: T004 and T005 pass, and the earlier `line-graph-ui` cases still pass. User Story 1 is usable on its
own: lines are visible in both themes with today's chrome.

---

## Phase 4: User Story 2 - The graph looks and behaves like the rest of the site (Priority: P1)

**Goal**: The graph adopts the M3 look and its pointer behaviour (C3, C4, C5, C6; research R4–R6, R8–R10):
- an M3 segmented button for the scale;
- a rich tooltip placed beside the crosshair;
- ringed markers, round joins and a stronger baseline;
- touch persistence;
- crosshair keeping across a redraw;
- a stylesheet that uses tokens only.

**Independent Test**: `npx vitest run tests/line-graph-ui.test.ts tests/m3-assets.test.ts` passes. By hand,
quickstart steps 1, 2 and 5 match.

### Tests for User Story 2 ⚠️

> Write these first and confirm they fail before T015–T020. T009–T013 edit the same file, so write them in order.

- [X] T009 [US2] In `tests/line-graph-ui.test.ts`, move the scale tests to the segmented button (C3):
  - **Selectors.**
    - The `scaleButtons` helper (about line 221) and the two `auto refresh` queries (about lines 388 and 392) select
      `.line-graph-scales .line-graph-segment` instead of `.line-graph-scale`.
    - The `is-selected` assertion (about line 258) checks `aria-pressed === "true"` instead.
  - **New cases.**
    1. The scales container has `role="group"` and `aria-label="Time scale"`.
    2. Only the selected segment contains `svg.line-graph-segment-icon` with `aria-hidden="true"`.
    3. No `.line-graph-scale` or `.is-selected` element exists.
    4. A poll whose history gives one available scale shows exactly one segment, and it is pressed.
- [X] T010 [US2] In `tests/line-graph-ui.test.ts`, add the tooltip placement cases (C5, FR-008, SC-005).
  - **Stubs**, installed after `open()` on `page.window.HTMLElement.prototype`:
    - an `offsetWidth` getter that returns `100` for an element with the class `line-graph-tooltip`, else `0`;
    - a `clientWidth` getter that returns `400` for `.line-graph-plot`, and for the panel it keeps the value jsdom
      reports (0).
  - **Coordinates.** The SVG viewBox width is then 320 (`Math.max(clientWidth, 320)`), so a crosshair at viewBox x
    maps to `x / 320 * 400` px in the plot.
  - **Cases.**
    1. At bucket 0 (`pointermove` at 0), the tooltip's `style.left` is `crosshairPx + 12` px.
    2. At the newest bucket (320), it is `crosshairPx - 12 - 100` px.
    3. In both cases, `style.top` is `8px` and `style.transform` is empty.
    4. With the plot stubbed to 110 px, `style.left` is `0px` at both bucket 0 and the newest bucket: neither side
       fits, so the clamp to `[0, 10]` px applies.
- [X] T011 [US2] In `tests/line-graph-ui.test.ts`, add the marker and baseline cases (C4, FR-009, FR-010, FR-014):
  1. After `pointermove`, the SVG holds one `circle.line-graph-marker` per drawn series, with `r="4"`, and each one's
     `fill` equals its polyline's `stroke`.
  2. The markers come after every polyline in document order.
  3. After `pointerleave` no marker remains.
  4. Exactly one `line.line-graph-grid` also has the class `line-graph-baseline`, and its `y1` equals the 0 % label's `y`.
- [X] T012 [US2] In `tests/line-graph-ui.test.ts`, add the touch cases (C4, FR-019, Clarification Q2):
  1. A `pointerdown` then a `pointerleave`, both carrying `pointerType: "touch"`, leave the crosshair and tooltip shown.
  2. A `pointerdown` dispatched on `page.document.body` (outside the plot) then hides them.
  3. A `pointerdown` on the tooltip (inside the plot) does not hide them.
  4. The existing mouse `pointerleave` case still hides them.
- [X] T013 [US2] In `tests/line-graph-ui.test.ts`, add the redraw cases (C4, R9). Use the `auto refresh` block's short-interval setup.
  1. **A tick keeps the point.** Place the crosshair at bucket 0 with `pointermove`, let one refresh tick run, and
     expect the tooltip's time to be still bucket 0's.
  2. **A missing time falls back to the newest.** After the tick, remove bucket 0 from the served response by
     stubbing the next fetch with a body whose buckets start one hour later. Expect the crosshair at the newest
     bucket.
  3. **A scale change hides it.** Click another segment while the crosshair is shown, and expect no crosshair and
     no tooltip.
- [X] T014 [P] [US2] In `tests/m3-assets.test.ts`, add `it("holds only M3 tokens in the line graph sheet")` (C6, SC-003). Read `src/public/line-graph-m3.css`, strip `/* … */` comments, and assert:
  - no `#` followed by 3 to 8 hex digits;
  - no `rgb(`, `rgba(`, `hsl(` or `hsla(`;
  - every `font-size:` value starts with `var(--md-sys-typescale-`;
  - no `transition` or `animation` property;
  - the `.line-graph-line` rule declares `stroke-linejoin:round` and `stroke-linecap:round` (FR-009).

### Implementation for User Story 2

- [X] T015 [US2] In `src/public/lineGraph.js` `renderScales()`, build the segmented button (C3, R4):
  - **The container.** Set `role="group"` and `aria-label="Time scale"` on `state.scalesEl` in `mount()`.
  - **The segments.** `renderScales()` creates one `button.line-graph-segment` per `data.availableScales` entry, with:
    - `type="button"` and `aria-pressed`;
    - `tabindex` `0` when it is the selected segment, `-1` otherwise;
    - for the selected segment only, a leading inline SVG check icon. Create it with `svgEl('svg', { class: 'line-graph-segment-icon', 'aria-hidden': 'true', viewBox: '0 0 24 24', width: 18, height: 18 })`, holding `svgEl('path', { d: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z', fill: 'currentColor' })`;
    - then a text node with the label.
  - **Removed.** Drop the `line-graph-scale` class and the `is-selected` toggle.
  - **Click.** Keep the click handler (`showScale(scale)`, no request). After `render()` rebuilds the segments,
    focus the newly selected segment when the clicked one had focus, so focus does not fall to `body`.
  - **Ripple.** After building, call `window.M3Ripple?.add('.line-graph-segment')`.

  T009 must turn green.
- [X] T016 [US2] In `src/public/lineGraph.js`, add `positionTooltip(index)`, called at the end of `placeCrosshair()` in place of the `style.left` percentage line (C5, R5):
  1. Take `plotWidth = state.graphEl.clientWidth`, `px = (view.xs[index] / view.width) * plotWidth` and
     `w = view.tooltip.offsetWidth`.
  2. Set `left = px + 12`. If `left + w > plotWidth`, set `left = px - 12 - w`.
  3. Clamp `left` to `[0, Math.max(0, plotWidth - w)]`.
  4. Set `view.tooltip.style.left = left + 'px'` and `view.tooltip.style.top = '8px'`.

  Never set `transform`. T010 must turn green.
- [X] T017 [US2] In `src/public/lineGraph.js`, add the markers and the baseline (C4, R6):
  - **The baseline.** In `renderSvg()`, give the `pct === 0` grid line the class `line-graph-grid line-graph-baseline`.
  - **The markers.** In `placeCrosshair(index)`, remove any `view.markers` and draw new ones. After the polylines,
    append one `svgEl('circle', { class: 'line-graph-marker', cx: view.xs[index], cy: y(series.points[index]), r: 4, fill: <the line colour from T007> })`
    per series to `view.svg`. Keep the `y` mapping on `state.view` (e.g. `view.y = y`) so `placeCrosshair` can use it.
  - **Hiding.** `clearCrosshair()` removes the markers and resets `view.markers = []`. Add `markers: []` to the
    `state.view` literal.

  T011 must turn green.
- [X] T018 [US2] In `src/public/lineGraph.js`, keep a touch-placed crosshair (C4, R8):
  - **Leaving the plot.** The SVG's `pointerleave` handler calls `clearCrosshair()` only when `event.pointerType !== 'touch'`.
  - **Pressing outside.** In `mount()`:
    - set `state.onDocumentPointerDown` to a handler that calls `clearCrosshair()` when `state.view`, a shown
      crosshair (`state.crosshairTime !== null`) and `!state.graphEl.contains(event.target)` all hold;
    - add it with `document.addEventListener('pointerdown', …)`.
  - **Teardown.** The removal is in `unmount()` (T002).

  T012 must turn green.
- [X] T019 [US2] In `src/public/lineGraph.js`, keep the crosshair across a redraw (C4, R9):
  - **Redraw.** At the start of `renderSvg()`, remember `const keep = state.crosshairTime`. After the new SVG is in
    place, when `keep !== null`, call `placeCrosshair(i)` where `i` is `state.data.buckets.indexOf(keep)`, or the
    last index when it is `-1`.
  - **Scale change.** In `showScale()`, capture `const previous = state.data && state.data.scale` before
    `state.data` is reassigned. When `previous` differs from the new `state.scale`, set `state.crosshairTime = null`
    before `render()`, so a scale change hides it.
  - **Refresh.** A refresh calls `showScale(state.scale)` with the same scale, so the crosshair is kept.

  T013 must turn green.
- [X] T020 [P] [US2] Restyle `src/public/line-graph-m3.css` to C6 and R4–R6, R8, R10, using only `var(--md-sys-…)` tokens. Read the current file first and keep its selectors for the panel layout.
  - **Text**
    - `.line-graph-title`: `title-large` size, line height, weight and tracking tokens, with no `clamp()`.
    - `.line-graph-subtitle`, `.line-graph-note`: `body-medium`, colour `on-surface-variant`.
    - Legend entries: `label-large`. `.line-graph-dot`: 12 px circle with `border-radius: var(--md-sys-shape-corner-full)`.
    - SVG `text`: `fill: var(--md-sys-color-on-surface-variant)` and the `label-small` size.
  - **Grid**
    - `.line-graph-grid`: `stroke: var(--md-sys-color-outline-variant)`, 1 px.
    - `.line-graph-baseline`: `stroke: var(--md-sys-color-outline)`.
    - `.line-graph-crosshair`: `stroke: var(--md-sys-color-outline)`.
  - **Lines and markers**
    - `.line-graph-line`: `stroke-linejoin: round; stroke-linecap: round`.
    - `.line-graph-marker`: `stroke: var(--md-sys-color-surface); stroke-width: 2`.
  - **Tooltip**
    - `.line-graph-tooltip`: `position:absolute`, `background: var(--md-sys-color-surface-container)`,
      `color: var(--md-sys-color-on-surface)`, `box-shadow: var(--md-sys-elevation-2)`,
      `border-radius: var(--md-sys-shape-corner-medium)`, `border: none`, `padding: 12px 16px`,
      `pointer-events: none`.
    - Remove any `transform: translateX(-50%)`.
    - `.line-graph-tooltip-time`: `title-small`. Entries: `body-medium`.
    - `.line-graph-plot`: `position: relative; touch-action: pan-y`.
  - **Segmented button**
    - `.line-graph-scales`: `display: inline-flex`.
    - `.line-graph-segment`:
      - `position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 8px;`
      - `height: 40px; padding: 0 12px;`
      - `border: 1px solid var(--md-sys-color-outline); background: transparent; color: var(--md-sys-color-on-surface);`
      - `label-large` type.
      - Each segment after the first has `margin-left: -1px`.
      - The first and last have the outer corners at `var(--md-sys-shape-corner-full)` and inner corners 0.
    - `.line-graph-segment[aria-pressed="true"]`: `background: var(--md-sys-color-secondary-container); color: var(--md-sys-color-on-secondary-container)`.
    - `.line-graph-segment-icon`: 18 px.
    - State layer: a `.line-graph-segment::before` with `content:''`, `position: absolute; inset: 0;
      background: currentColor; opacity: 0`, at the hover, focus and pressed state-layer opacity tokens on
      `:hover`, `:focus-visible` and `:active`. Copy how `pollCard-m3.css` writes its state layers; check
      `m3-tokens.css` for the exact token names.
  - **Forbidden**: no `transition` and no `animation` anywhere, and no dark-only rule, since the tokens already
    switch with the theme.

  This file is independent of T015–T019. T014 must turn green.

**Checkpoint**: Every `line-graph-ui` and `m3-assets` case passes. User Stories 1 and 2 both work.

---

## Phase 5: User Story 3 - The graph can be read from the keyboard (Priority: P2)

**Goal**: The segmented button and the plot are one Tab stop each; the arrow keys move between segments and the
crosshair, and a polite live region reads the tooltip (C3, C4, C6; research R4, R7).

**Independent Test**: The new keyboard cases in `tests/line-graph-ui.test.ts` pass. By hand, quickstart step 4
works with the keyboard only.

### Tests for User Story 3 ⚠️

> Write this first and confirm it fails before T022–T025.

- [X] T021 [US3] In `tests/line-graph-ui.test.ts`, add a `describe("keyboard (C3, C4, FR-015–FR-018)")` block. Dispatch keys with `new page.window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })` on the focused element.
  1. **Segments.**
     - On an old poll with four scales, only the selected segment has `tabindex="0"`.
     - `ArrowRight` on it moves `document.activeElement` to the next segment, and from the last segment wraps to the
       first. `ArrowLeft` wraps the other way.
     - `aria-pressed` does not change on an arrow key.
     - The focused segment takes `tabindex="0"` and the others `-1`.
  2. **The plot's attributes.** `.line-graph-plot` has `tabindex="0"`, `role="group"` and
     `aria-label="Vote share over time for <title>. Use the Left and Right arrow keys to read the values."`.
  3. **Focus.** `plot.focus()` with no pointer press shows the crosshair at the newest bucket.
     `.line-graph-live` has `aria-live="polite"` and holds exactly the tooltip time, then `", "`, then
     `"<label> <pct>%"` per series joined by `", "`.
  4. **Moving.**
     - `ArrowLeft` moves the crosshair one bucket back and updates the live text.
     - `Home` moves it to bucket 0 and `End` to the last.
     - `ArrowLeft` at bucket 0 stays at 0.
     - Each handled key's event has `defaultPrevented === true`.
  5. **Hiding.** `Escape` hides the crosshair and tooltip. Focus again, then `blur()`, and they are hidden again.
  6. **A pointer press first.** Dispatch `pointerdown` at clientX 0 on the SVG, then `plot.focus()`: the crosshair
     stays at bucket 0, not the newest. The flag is cleared afterwards, so a later blur and focus goes to the
     newest.
  8. **A click on a plot that already has focus.**
     - Focus the plot, then dispatch `pointerdown` at clientX 0 on the SVG. No `focus` event fires, because the plot
       already has focus.
     - Call `blur()`, then `plot.focus()`.
     - Expect the crosshair at the newest bucket: the stale `pointerPlaced` was cleared on blur.
  9. **The SVG is hidden from assistive technology.** `svg.line-graph-svg` has `aria-hidden="true"` and no `role`
     or `aria-label`, because the plot group carries the label. Update the existing `mount` case that expects
     `role="img"` and an `aria-label` containing the title (about lines 132–133) to check these attributes on
     `.line-graph-plot` instead.
  7. **The live region outside the plot.** `.line-graph-live` exists inside `div.line-graph` but outside
     `.line-graph-plot`, so `renderSvg()` does not drop it.

### Implementation for User Story 3

- [X] T022 [US3] In `src/public/lineGraph.js` `renderScales()`, add roving focus to the segments (C3, R4, FR-015):
  - **Keys.** Each segment gets a `keydown` handler. For `ArrowRight` and `ArrowLeft` it:
    1. calls `preventDefault()`;
    2. moves focus to the next or previous segment in `state.scalesEl`, wrapping;
    3. sets `tabindex="0"` on the newly focused segment and `-1` on the others.
  - **No selection.** The arrow keys never change `aria-pressed`. Enter and Space stay the button's native click.
  - **On rebuild.** `renderScales()` gives `tabindex="0"` back to the selected segment.

  Depends on T015.
- [X] T023 [US3] In `src/public/lineGraph.js` `mount()`, make the plot focusable and add the live region (C4, R7):
  - **The plot.** On `state.graphEl`, set:
    - `tabindex="0"`;
    - `role="group"`;
    - `aria-label` to `'Vote share over time for ' + (ctx.title || '') + '. Use the Left and Right arrow keys to read the values.'`.
  - **The SVG.** In `renderSvg()`, replace the SVG's `role: 'img'` and `aria-label` attributes with
    `'aria-hidden': 'true'`, so the title is read once, from the plot.
  - **The live region.**
    - Create `state.liveEl = el('p', 'line-graph-live')` with `aria-live="polite"`.
    - Append it to `root` after `state.scalesEl`, so a `graphEl.replaceChildren()` never removes it.
    - Clear its text in `clearCrosshair()`.
  - **Notes.** `renderNote()` keeps the plot empty as today. While a note shows, also set the plot's `tabindex` to
    `-1`, so an empty plot is not a Tab stop, and set it back to `0` in `render()`.
- [X] T024 [US3] In `src/public/lineGraph.js`, add the keyboard crosshair (C4, R7, FR-016, FR-017):
  - **Pointer press.** The SVG `pointerdown` handler also sets `state.pointerPlaced = true`.
  - **Focus.** In `mount()`, add listeners on `state.graphEl`. `focus`:
    - when `state.pointerPlaced` is false, a drawn SVG exists (`state.view`) and there are at least 2 buckets, it
      calls `placeCrosshair(last)` then `announce()`;
    - in every case it then resets `state.pointerPlaced = false`.
  - **Keys.** `keydown`, only while a view exists:
    - `ArrowRight` and `ArrowLeft` move ±1 from the current index (`state.data.buckets.indexOf(state.crosshairTime)`,
      or the last index when nothing is shown), clamped to the ends;
    - `Home` goes to 0 and `End` to the last;
    - `Escape` calls `clearCrosshair()`;
    - each of these calls `preventDefault()`, and every placement calls `announce()`.
  - **Blur.** `blur` calls `clearCrosshair()` and resets `state.pointerPlaced = false`. A click on a plot that
    already has focus fires no `focus`, so the flag must not outlive the focus.
  - **`announce()`.** It sets `state.liveEl.textContent` to the tooltip time text, then `', '`, then the
    `series.label + ' ' + series.points[index] + '%'` entries joined by `', '`. It is called only from keyboard
    placements and focus.

  Depends on T003 and T023. T021 must turn green.
- [X] T025 [US3] In `src/public/line-graph-m3.css`, add the focus ring and hide the live region visually (C6, FR-018):
  - **Focus ring.** `.line-graph-segment:focus-visible, .line-graph-plot:focus-visible { outline: 3px solid var(--md-sys-color-secondary); outline-offset: 2px; }`. Also `.line-graph-plot:focus:not(:focus-visible) { outline: none; }`.
  - **Live region.** Hide `.line-graph-live` with the clip pattern: `position: absolute; width: 1px; height: 1px;
    margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0`.

  Same file as T020, so do it after T020. T014 must stay green.

**Checkpoint**: All three stories work and every test passes.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Whole-suite checks, documents and the hand checks.

- [X] T026 [P] Update `README.md` where it describes the maximized view's line graph:
  - each line is shaded only as far as needed to stay visible in the light or the dark theme;
  - the scale selector and the plot can be used from the keyboard;
  - on a touch screen the reading stays until a tap outside.

  Change nothing else.
- [X] T027 [P] Check `ARCHITECTURE.md` for any description of the line graph's client. If it says the line colours are identical in both themes, or that the plot has no keyboard reading, correct that sentence. Otherwise leave the file unchanged and note "no change" in this task.
- [X] T028 Run `npx tsc --noEmit` and `npm test` from the repository root, and confirm that both pass. Fix any failure inside this feature's files; report any other failure with its output.
- [X] T029 Walk the six hand checks in [quickstart.md](quickstart.md) with the development server (`devScripts/launch-dev.ps1`), in light and dark at 1400, 900 and 375 px. Record each step's result in this task's line, pass or the deviation seen. Result (2026-10-29, developer): all six checks pass in light and dark at 1400, 900 and 375 px.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: after Setup. It blocks every story.
- **US1 (Phase 3)**: after Foundational.
- **US2 (Phase 4)**: after Foundational. T017's marker `fill` uses T007's line colour, so if US2 starts before US1,
  use `colorOf()` and switch to `lineColorOf()` once T007 lands.
- **US3 (Phase 5)**: after Foundational. T022 needs T015's segments and T025 needs T020's sheet, so in practice
  US3 follows US2.
- **Polish (Phase 6)**: after the stories that are delivered.

### Within Each Story

- Tests first, failing, then the implementation tasks that turn them green.
- `src/public/lineGraph.js` is touched by T002, T003, T007, T008, T015–T019 and T022–T024. These are one file, so do
  them in ID order, never in parallel.
- `tests/line-graph-ui.test.ts` is touched by T005, T009–T013 and T021, also in ID order.

### Parallel Opportunities

- T004 (`tests/client-line-colors.test.ts`) and T005 (`tests/line-graph-ui.test.ts`) can be written in parallel.
- T006 (`pollCard.js`) can be done while the US1 tests are written.
- T014 (`tests/m3-assets.test.ts`) and T020 (`line-graph-m3.css`) can run in parallel with each other and with the
  US2 `lineGraph.js` tasks T015–T019.
- T026 and T027 can run in parallel.

---

## Parallel Example: User Story 2

```text
Task: "T014 Add the token-only check to tests/m3-assets.test.ts"
Task: "T020 Restyle src/public/line-graph-m3.css to C6"
Task: "T015–T019 in src/public/lineGraph.js, in order"
```

## Parallel Example: User Story 1

```text
Task: "T004 Create tests/client-line-colors.test.ts"
Task: "T005 Add the per-theme colour cases to tests/line-graph-ui.test.ts"
Task: "T006 Add PollCard.lineColorOn in src/public/pollCard.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 and Phase 2.
2. Phase 3 (T004–T008): every line is visible in both themes, which is the one defect fix.
3. **Stop and validate**: run `npx vitest run tests/client-line-colors.test.ts tests/line-graph-ui.test.ts`, then
   quickstart step 3.

### Incremental Delivery

1. Foundation, then US1: lines visible (MVP).
2. US2: the M3 look, tooltip placement, touch and redraw keeping.
3. US3: keyboard reading.
4. Polish: documents, the full suite and the hand checks.

---

## Notes

- [P] marks tasks on different files with no dependency on an unfinished task.
- No server file, route, setting, migration, cookie or storage key is added (FR-020).
- The bar colours in `pollCard.js` are not changed (FR-005): T006 only adds a function and one export entry.
- Commit after each phase, or as the developer prefers.
