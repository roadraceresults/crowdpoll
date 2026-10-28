/*
  POLL CARD — multi-instance component script.
  Every .card-viewport in the document is initialized independently on
  DOMContentLoaded (see initPollCard at the bottom of this file): flip
  wiring, scroll arrows, vote toggling, and the card's dataset are all
  per-instance, so any number of cards can share one page (the grid
  renders 12; the standalone demo renders 1).

  SHARED POLL DATA
  Both faces of a card render from the same sorted dataset — Results-
  mode bars and Vote-mode bars must show choices in the same order
  (highest percentage first), so each card keeps one canonical, cached
  dataset (in its initPollCard closure) rather than each face
  generating its own. Regenerated only when the choice count
  (RESULTS_TEST_COUNT) actually changes, so resizing the window
  re-lays-out bars without reshuffling data or resetting selections.
  The generator is deterministic (seeded), so every card on a page
  shows identical labels/percentages while keeping its own state.
*/

// ---- MANUAL TEST CONTROL ----
// Change this number (2–50) and reload the page to preview how the
// bars render at different choice counts. Also settable live from the
// console: RESULTS_TEST_COUNT = 30; renderCard();
var RESULTS_TEST_COUNT = 11;

const RESULTS_MIN_CHOICES = 2;
const RESULTS_MAX_CHOICES = 50;

// Fixed, deterministic palette (not randomized) so color-by-position is
// predictable and repeatable: bar 1 is always this palette's color 1,
// bar 2 is always color 2, etc. Named entries are the single source of
// truth — RESULTS_COLOR_PALETTE (hex list used for rendering) and
// RESULTS_SAMPLE_LABELS (debug labels naming each color) are both
// derived from this, so they can never drift out of sync. The first 30
// are the set used in the reference "Where the Day Goes" chart; all 50
// are kept dark/saturated enough that shadowed text stays legible on
// top of them.
const RESULTS_PALETTE_ENTRIES = [
  { hex: '#880015', name: 'darkred' },
  { hex: '#C8468B', name: 'palevioletred' },
  { hex: '#0808FD', name: 'blue' },
  { hex: '#1A539E', name: 'darkslateblue' },
  { hex: '#0695F5', name: 'dodgerblue' },
  { hex: '#000000', name: 'black' },
  { hex: '#404040', name: 'darkslategray' },
  { hex: '#7D7D7D', name: 'gray' },
  { hex: '#800080', name: 'purple' },
  { hex: '#B045B0', name: 'darkorchid' },
  { hex: '#FF6601', name: 'orangered' },
  { hex: '#FC8E45', name: 'coral' },
  { hex: '#007A7E', name: 'teal' },
  { hex: '#399FA2', name: 'lightseagreen' }
];

/*
  The list above is the base; the palette a card draws from is that list
  repeated until it holds one entry per choice the poll may have
  (ENV_MAX_CHOICES, handed to the card as choiceBounds.maxChoices).
  Repeating the list keeps equal colors 14 entries apart. When the count
  leaves the last entry equal to the first, one more entry is added so
  the wrap from the end back to the start never repeats a color.
*/
const DEFAULT_PALETTE_SIZE = 50;

function expandPalette(base, count){
  const size = Math.max(Number(count) || 0, base.length);
  const out = [];
  while (out.length < size) out.push(base[out.length % base.length]);
  if (out.length > 1 && out[out.length - 1] === out[0]) out.push(base[out.length % base.length]);
  return out;
}

const RESULTS_COLOR_PALETTE = expandPalette(RESULTS_PALETTE_ENTRIES.map(e => e.hex), DEFAULT_PALETTE_SIZE);

// Debug labels for testing color assignment — each names the color the
// bar at that RENDERED position should have, e.g.
// "This is choice 3 - color=teal green #1F8A6B". Assigned to bars by
// final sorted position (see ensurePollData), so each rendered bar's
// label truthfully describes its own expected color.
const RESULTS_SAMPLE_LABELS = RESULTS_PALETTE_ENTRIES.map((e, i) =>
  'This is choice ' + (i + 1) + ' - color=' + e.name + ' ' + e.hex
);

// Deterministic pseudo-random in [0,1), seeded by index — used only to
// vary sample bar lengths for preview; not related to bar color, which
// is always assigned by position (see getResultColor below).
function seededRandom(seed){
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function generateResultsData(count){
  const weights = [];
  for (let i = 0; i < count; i++){
    weights.push(0.35 + seededRandom(i + 1));
  }
  const total = weights.reduce((sum, w) => sum + w, 0);

  const data = weights.map(w => ({
    pct: Math.round((w / total) * 100)
  }));

  // Nudge rounding so percentages sum to exactly 100.
  const roundedSum = data.reduce((sum, d) => sum + d.pct, 0);
  data[data.length - 1].pct += 100 - roundedSum;

  return data;
}

// Builds a fresh poll dataset, sorted by percentage descending — the
// order both Results-mode and Vote-mode render in. Labels are assigned
// AFTER sorting, by final position: colors are assigned by rendered
// position, so labeling by pre-sort index would let the sort scramble
// the label/color correspondence and each bar's "color=..." text could
// name the wrong color. Each card instance caches its own copy (see
// ensurePollData inside initPollCard).
function buildPollData(){
  const count = Math.min(RESULTS_MAX_CHOICES, Math.max(RESULTS_MIN_CHOICES, RESULTS_TEST_COUNT));
  const data = generateResultsData(count);
  data.sort((a, b) => b.pct - a.pct);
  data.forEach((d, i) => {
    d.label = RESULTS_SAMPLE_LABELS[i % RESULTS_SAMPLE_LABELS.length];
    d.selected = false;
  });
  data[0].selected = true; // demo default: top result pre-selected
  return data;
}

/*
  SHARED BAR SIZING
  Both Results-mode and Vote-mode bars are sized by the same rules —
  fixed card size regardless of choice count (2–50), so bar height and
  the gap between bars are calculated from the space actually
  available, capped at RESULTS_MAX_BAR_HEIGHT and never below
  RESULTS_MIN_BAR_HEIGHT. When even the floor size can't fit every
  choice, the list scrolls instead — see computeBarLayout.
*/

const RESULTS_MAX_BAR_HEIGHT = 50; // cap so 2–3 bars don't grow absurdly tall
const RESULTS_MIN_BAR_HEIGHT = 25;  // floor so bars stay visible at high choice counts

// Below this bar height, label/% text is hidden entirely (row becomes
// a plain colored bar) — there just isn't room to render legible text.
// Above it, font-size scales continuously between MIN and MAX (see
// scaleFontSize) so labels keep showing, just smaller, as bars shrink.
const RESULTS_COMPACT_THRESHOLD = 10;
const RESULTS_FONT_MIN = 7;   // smallest still-legible label/% size
const RESULTS_FONT_MAX = 11;  // label/% size at/above RESULTS_FONT_FULL_HEIGHT
const RESULTS_FONT_FULL_HEIGHT = 26; // bar height at which font reaches max

// Gap between bars. Spacing is reduced before bar height is: bars stay
// at their ideal/max height with up to RESULTS_GAP_MAX between them
// when there's room, spacing shrinks toward RESULTS_GAP_MIN as room
// gets tighter, and only once it hits that floor does bar height
// itself start shrinking below its ideal size — see computeBarMetrics.
const RESULTS_GAP_MAX = 20;
const RESULTS_GAP_MIN = 1;

// Interpolates label/% font-size linearly between RESULTS_FONT_MIN (at
// RESULTS_COMPACT_THRESHOLD) and RESULTS_FONT_MAX (at
// RESULTS_FONT_FULL_HEIGHT), clamped at both ends.
function scaleFontSize(barHeight){
  const t = Math.min(1, Math.max(0,
    (barHeight - RESULTS_COMPACT_THRESHOLD) / (RESULTS_FONT_FULL_HEIGHT - RESULTS_COMPACT_THRESHOLD)
  ));
  return RESULTS_FONT_MIN + t * (RESULTS_FONT_MAX - RESULTS_FONT_MIN);
}

// Side padding shrinks with font-size too, so small text isn't stuck
// with disproportionately large inset at the edges of a thin bar.
function scalePad(fontSize){
  return Math.max(5, Math.min(10, fontSize - 1));
}

// Two-phase fit, in priority order, for a count of bars that's already
// known to fit in availableHeight:
//   1. Bars at RESULTS_MAX_BAR_HEIGHT, gap shrinking from RESULTS_GAP_MAX
//      down to RESULTS_GAP_MIN as space gets tighter.
//   2. Once gap has hit RESULTS_GAP_MIN and bars at max height still
//      don't fit, gap stays at RESULTS_GAP_MIN and bar height itself
//      shrinks (down to RESULTS_MIN_BAR_HEIGHT) to fit the remaining
//      space.
function computeBarMetrics(count, availableHeight){
  // Gap needed to fit `count` bars at max height in the available space.
  const gapForMaxHeight = count > 1
    ? (availableHeight - RESULTS_MAX_BAR_HEIGHT * count) / (count - 1)
    : RESULTS_GAP_MAX;

  if (gapForMaxHeight >= RESULTS_GAP_MIN){
    // Enough room for full-height bars — just dial the gap down from
    // its max as needed (never below RESULTS_GAP_MIN).
    return {
      barHeight: RESULTS_MAX_BAR_HEIGHT,
      gap: Math.min(RESULTS_GAP_MAX, gapForMaxHeight)
    };
  }

  // Not enough room even at the minimum gap — hold gap at its floor
  // and shrink bar height to fit exactly, floored so bars stay visible.
  const barHeight = Math.max(
    RESULTS_MIN_BAR_HEIGHT,
    (availableHeight - RESULTS_GAP_MIN * (count - 1)) / count
  );
  return { barHeight, gap: RESULTS_GAP_MIN };
}

// The theoretical maximum number of bars that could ever fit in
// availableHeight, at the smallest they're allowed to get (floor
// height + minimum gap). This is a property of the available space
// alone, independent of how many choices are actually being rendered.
function computeMaxBarsAtFloor(availableHeight){
  return Math.floor((availableHeight + RESULTS_GAP_MIN) / (RESULTS_MIN_BAR_HEIGHT + RESULTS_GAP_MIN));
}

// Decides whether `count` choices fit in availableHeight at all, and
// returns the bar height/gap to use either way:
//   - Fits (count <= the floor-size capacity): normal two-phase fit
//     via computeBarMetrics, which may size bars larger than the floor.
//   - Doesn't fit even at the floor: bar height and gap are held at
//     their floor values and the caller should enable scrolling. Two
//     of the available floor-sized "slots" get reserved for the
//     up/down arrow rows, so the list's visible capacity while
//     scrolling is (maxBarsAtFloor - 2) — enforced purely by CSS flex
//     layout (the arrow rows take real, fixed-height space) rather
//     than computed here.
function computeBarLayout(count, availableHeight){
  const maxBarsAtFloor = computeMaxBarsAtFloor(availableHeight);
  if (count <= maxBarsAtFloor){
    const { barHeight, gap } = computeBarMetrics(count, availableHeight);
    return { scrolling: false, barHeight, gap };
  }
  return { scrolling: true, barHeight: RESULTS_MIN_BAR_HEIGHT, gap: RESULTS_GAP_MIN };
}

/*
  RESULTS-MODE — horizontal bar list
  Renders a card's dataset inside its .results-list, one colored bar
  per choice, longest (highest %) first. Bar colors come from
  RESULTS_COLOR_PALETTE (derived from RESULTS_PALETTE_ENTRIES, defined
  with the shared poll data above).
*/

function getResultColor(index){
  return RESULTS_COLOR_PALETTE[index % RESULTS_COLOR_PALETTE.length];
}

// Relative luminance of a hex color, used to decide how to render the
// label/percentage text so it stays legible whether it sits over the
// colored fill or the (lighter) unfilled track behind it.
function luminanceOf(hex){
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const lin = v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// Text over a light fill needs dark ink with a light halo; text over a
// darker fill (or the track) needs white ink with a dark halo. Either
// way the halo keeps it readable as it crosses from fill to track.
function textStyleFor(hex){
  const light = luminanceOf(hex) > 0.55;
  return light
    ? { color: '#1a1a1a', shadow: '0 0 4px rgba(255,255,255,0.9), 0 0 8px rgba(255,255,255,0.55)' }
    : { color: '#ffffff', shadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.55)' };
}

/*
  SCROLL / ARROW ROWS
  Up/down arrow rows are real flex rows (see .arrow-row in the CSS),
  not floating overlays — when scrolling is engaged they take up an
  actual, fixed-height row above and below the bar list, which is what
  reserves the two capacity "slots" referenced in computeBarLayout.
  Click handlers and the scroll listener (for fading the icons based
  on position) are wired up once; render calls just update state.
*/

function updateArrowRows(wrap, list, upRow, downRow, layout){
  if (!wrap || !list || !upRow || !downRow) return;

  // The inner (absolutely-positioned) container is the actual flex
  // column now — the gap between arrow rows and the list goes there.
  const inner = wrap.querySelector('.bar-scroll-inner');
  if (inner) inner.style.rowGap = layout.gap + 'px';

  if (!layout.scrolling){
    upRow.classList.remove('is-active', 'is-visible');
    downRow.classList.remove('is-active', 'is-visible');
    upRow.style.height = '';
    downRow.style.height = '';
    return;
  }

  upRow.classList.add('is-active');
  downRow.classList.add('is-active');
  upRow.style.height = layout.barHeight + 'px';
  downRow.style.height = layout.barHeight + 'px';

  // Mirror the bars' compact corner radius so the outlined arrow rows
  // stay exactly bar-shaped at floor sizes too.
  const compact = layout.barHeight < RESULTS_COMPACT_THRESHOLD;
  upRow.classList.toggle('is-compact', compact);
  downRow.classList.toggle('is-compact', compact);

  const atTop = list.scrollTop <= 1;
  const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
  upRow.classList.toggle('is-visible', !atTop);
  downRow.classList.toggle('is-visible', !atBottom);
}

// Arrow behavior: a quick click steps by ~80% of a screenful (smooth),
// while pressing and HOLDING starts continuous scrolling after a short
// delay, at a steady speed, until released (or the end is reached).
// The delay is what separates the two gestures: release before it and
// the normal click fires; hold past it and the click is swallowed so
// releasing doesn't also trigger a page-jump.
const ARROW_HOLD_DELAY_MS = 300;
const ARROW_HOLD_SPEED_PX_PER_SEC = 240;

function attachArrowBehavior(btn, list, direction){
  let holdTimer = null;
  let rafId = null;
  let lastTs = null;
  let didHoldScroll = false;

  function stopContinuous(){
    if (holdTimer){ clearTimeout(holdTimer); holdTimer = null; }
    if (rafId){ cancelAnimationFrame(rafId); rafId = null; }
    lastTs = null;
  }

  function startContinuous(){
    didHoldScroll = true;
    const step = (ts) => {
      if (lastTs !== null){
        const before = list.scrollTop;
        list.scrollTop = before + direction * ARROW_HOLD_SPEED_PX_PER_SEC * ((ts - lastTs) / 1000);
        if (list.scrollTop === before){ stopContinuous(); return; } // hit the end
      }
      lastTs = ts;
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
  }

  btn.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    didHoldScroll = false;
    btn.setPointerCapture(e.pointerId);
    holdTimer = setTimeout(startContinuous, ARROW_HOLD_DELAY_MS);
  });
  btn.addEventListener('pointerup', stopContinuous);
  btn.addEventListener('pointercancel', stopContinuous);
  btn.addEventListener('lostpointercapture', stopContinuous);

  btn.addEventListener('click', () => {
    if (didHoldScroll){ didHoldScroll = false; return; } // hold already scrolled
    list.scrollBy({ top: direction * list.clientHeight * 0.8, behavior: 'smooth' });
  });
}

// Drag-to-scroll: grab anywhere on the list contents with the mouse
// and drag up/down to scroll (1:1 with the pointer). Mouse only —
// touch devices already scroll the overflow area natively, and
// intercepting touch here would fight that. A small movement
// threshold separates a drag from a click, and once a drag has
// happened the click that fires on release is swallowed (capture
// phase, so it's stopped before the voting list's row-toggle handler
// sees it) — otherwise every drag on the Vote face would also toggle
// whichever choice the pointer happened to be over.
const DRAG_THRESHOLD_PX = 4;

function initDragScroll(list){
  let pointerId = null;
  let startY = 0;
  let startScrollTop = 0;
  let dragging = false;
  let suppressClick = false;

  list.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    pointerId = e.pointerId;
    startY = e.clientY;
    startScrollTop = list.scrollTop;
    dragging = false;
  });

  list.addEventListener('pointermove', (e) => {
    if (pointerId === null || e.pointerId !== pointerId) return;
    const delta = startY - e.clientY;
    if (!dragging && Math.abs(delta) > DRAG_THRESHOLD_PX){
      dragging = true;
      list.setPointerCapture(pointerId);
      list.classList.add('is-dragging');
    }
    if (dragging){
      list.scrollTop = startScrollTop + delta;
      e.preventDefault();
    }
  });

  const endDrag = () => {
    if (dragging) suppressClick = true;
    pointerId = null;
    dragging = false;
    list.classList.remove('is-dragging');
  };
  list.addEventListener('pointerup', endDrag);
  list.addEventListener('pointercancel', endDrag);

  list.addEventListener('click', (e) => {
    if (suppressClick){
      suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}

function initScrollArrows(wrap, list, upRow, downRow){
  if (!wrap || !list || !upRow || !downRow) return;

  // Scrolling only changes which arrow icon is faded in — whether the
  // rows are active/sized at all is decided at render time.
  list.addEventListener('scroll', () => {
    if (!upRow.classList.contains('is-active')) return;
    const atTop = list.scrollTop <= 1;
    const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
    upRow.classList.toggle('is-visible', !atTop);
    downRow.classList.toggle('is-visible', !atBottom);
  });

  attachArrowBehavior(downRow, list, 1);
  attachArrowBehavior(upRow, list, -1);
  initDragScroll(list);
}

function renderPollResults(wrap, list, upRow, downRow, data){
  if (!wrap || !list || !upRow || !downRow) return;

  const count = data.length;

  const previousScrollTop = list.scrollTop;

  // Reset to an empty, arrows-inactive state before measuring. With
  // the bar area now absolutely positioned (see .bar-scroll-inner in
  // the CSS), the wrap's size is content-independent by construction,
  // so this is belt-and-braces rather than load-bearing.
  list.innerHTML = '';
  list.style.rowGap = '';
  upRow.classList.remove('is-active', 'is-visible');
  downRow.classList.remove('is-active', 'is-visible');
  upRow.style.height = '';
  downRow.style.height = '';
  void wrap.offsetHeight; // flush the reset before reading clientHeight

  const availableHeight = wrap.clientHeight;
  const layout = computeBarLayout(count, availableHeight);
  const { barHeight, gap } = layout;
  const compact = barHeight < RESULTS_COMPACT_THRESHOLD;

  list.style.rowGap = gap + 'px';

  const fontSize = scaleFontSize(barHeight);
  const pad = scalePad(fontSize);

  const rows = data.map((item, i) => {
    const color = getResultColor(i);
    const style = textStyleFor(color);

    const row = document.createElement('li');
    row.className = 'result-row' + (compact ? ' is-compact' : '');
    row.style.height = barHeight + 'px';
    row.title = item.label + ' — ' + item.pct + '%';

    const fill = document.createElement('span');
    fill.className = 'result-fill';
    fill.style.background = color;

    const label = document.createElement('span');
    label.className = 'result-label';
    label.textContent = item.label;
    label.style.color = style.color;
    label.style.textShadow = style.shadow;
    label.style.fontSize = fontSize + 'px';
    label.style.left = pad + 'px';

    const pct = document.createElement('span');
    pct.className = 'result-pct';
    pct.textContent = item.pct + '%';
    pct.style.color = style.color;
    pct.style.textShadow = style.shadow;
    pct.style.fontSize = fontSize + 'px';
    pct.style.right = pad + 'px';

    row.append(fill, label, pct);
    list.appendChild(row);

    return { row, label, pct: item.pct };
  });

  // After layout, truncate a label with an ellipsis ONLY if it (plus
  // its left padding) would occupy more than 90% of the bar's total
  // width. Otherwise the full label renders, extending past the fill
  // into the track behind it if needed. Skipped for compact rows,
  // where label text is hidden entirely.
  function applyTruncation(){
    if (compact) return;
    rows.forEach(({ row, label }) => {
      const rowWidth = row.getBoundingClientRect().width;
      const naturalLabelWidth = label.scrollWidth;
      const occupiedWidth = pad + naturalLabelWidth;
      const limit = rowWidth * 0.90;

      if (occupiedWidth > limit){
        const maxWidth = Math.max(0, limit - pad);
        label.classList.add('is-truncated');
        label.style.maxWidth = maxWidth + 'px';
        label.style.lineHeight = barHeight + 'px';
      } else {
        label.classList.remove('is-truncated');
        label.style.maxWidth = 'none';
        label.style.lineHeight = '';
      }
    });
  }

  applyTruncation();

  // Restore scroll position (re-render rebuilds the list from scratch)
  // and refresh the arrow rows to match.
  list.scrollTop = Math.max(0, Math.min(previousScrollTop, list.scrollHeight - list.clientHeight));
  updateArrowRows(wrap, list, upRow, downRow, layout);

  // Animate fill widths in.
  requestAnimationFrame(() => {
    setTimeout(() => {
      rows.forEach(({ row, pct }) => {
        row.querySelector('.result-fill').style.width = pct + '%';
      });
    }, 60);
  });
}

/*
  VOTE-MODE — horizontal bar list
  Same sizing/layout technique as Results-mode (same computeBarLayout,
  same font/pad scaling, same order — highest % first, from the same
  shared dataset), but the visual meaning of each bar is different:
  there's no proportional fill and no per-position palette color, just
  two states. Unselected choices show --choice-unselected; selected
  choices (any number — this is multi-select) show --choice-selected
  across the full width of the bar. A round button at the left of each
  bar fills in solid when that choice is selected. Clicking anywhere
  on a row toggles its selection.
*/

const VOTE_RADIO_MIN = 8;
const VOTE_RADIO_MAX = 18;
const VOTE_LABEL_GAP = 6; // space between the round button and label text

// Radio button scales with bar height, same spirit as scaleFontSize,
// but never exceeds the bar's own height (avoids overflow on very
// short/compact bars).
function scaleRadioSize(barHeight){
  return Math.max(VOTE_RADIO_MIN, Math.min(VOTE_RADIO_MAX, barHeight - 2, barHeight * 0.55));
}

function renderVotingOptions(wrap, list, upRow, downRow, data){
  if (!wrap || !list || !upRow || !downRow) return;

  const count = data.length;

  const previousScrollTop = list.scrollTop;

  // Reset to an empty, arrows-inactive state before measuring — see
  // the matching comment in renderPollResults.
  list.innerHTML = '';
  list.style.rowGap = '';
  upRow.classList.remove('is-active', 'is-visible');
  downRow.classList.remove('is-active', 'is-visible');
  upRow.style.height = '';
  downRow.style.height = '';
  void wrap.offsetHeight; // flush the reset before reading clientHeight

  const availableHeight = wrap.clientHeight;
  const layout = computeBarLayout(count, availableHeight);
  const { barHeight, gap } = layout;
  const compact = barHeight < RESULTS_COMPACT_THRESHOLD;

  list.style.rowGap = gap + 'px';

  const fontSize = scaleFontSize(barHeight);
  const pad = scalePad(fontSize);
  const radioSize = scaleRadioSize(barHeight);
  const labelLeft = pad + radioSize + VOTE_LABEL_GAP;

  const rows = data.map((item, i) => {
    const row = document.createElement('li');
    row.className = 'vote-row'
      + (item.selected ? ' is-selected' : '')
      + (compact ? ' is-compact' : '');
    row.style.height = barHeight + 'px';
    row.dataset.index = i;
    row.title = item.label;

    const radio = document.createElement('span');
    radio.className = 'vote-radio' + (item.selected ? ' is-selected' : '');
    radio.style.width = radioSize + 'px';
    radio.style.height = radioSize + 'px';
    radio.style.left = pad + 'px';
    row.appendChild(radio);

    let label = null;
    if (!compact){
      label = document.createElement('span');
      label.className = 'vote-label';
      label.textContent = item.label;
      label.style.fontSize = fontSize + 'px';
      label.style.left = labelLeft + 'px';
      row.appendChild(label);
    }

    list.appendChild(row);
    return { row, label };
  });

  // Same width-based truncation approach as Results-mode, just offset
  // by the round button's width instead of starting at the row edge.
  if (!compact){
    rows.forEach(({ row, label }) => {
      const rowWidth = row.getBoundingClientRect().width;
      const naturalLabelWidth = label.scrollWidth;
      const occupiedWidth = labelLeft + naturalLabelWidth;
      const limit = rowWidth * 0.90;

      if (occupiedWidth > limit){
        const maxWidth = Math.max(0, limit - labelLeft);
        label.classList.add('is-truncated');
        label.style.maxWidth = maxWidth + 'px';
        label.style.lineHeight = barHeight + 'px';
      } else {
        label.classList.remove('is-truncated');
        label.style.maxWidth = 'none';
        label.style.lineHeight = '';
      }
    });
  }

  // Restore scroll position (re-render rebuilds the list from scratch)
  // and refresh the arrow rows to match.
  list.scrollTop = Math.max(0, Math.min(previousScrollTop, list.scrollHeight - list.clientHeight));
  updateArrowRows(wrap, list, upRow, downRow, layout);
}

/*
  CARD INSTANCES
  initPollCard wires one .card-viewport: flip buttons, both faces'
  scroll arrows, vote-row toggling, and the card's own cached dataset.
  All lookups are class-based and scoped to the viewport, so the same
  markup can repeat any number of times per page (see
  contracts/poll-card-component.md in the feature spec for the markup
  contract). Both faces re-render together so they always reflect the
  same underlying data and stay correctly sized as the card's
  container changes size. Bar resizing never changes the card's own
  size — see poll-card.css (.card-flip / .card-face) — and front/back
  always match because both faces share the same sizing logic and
  render from the same underlying dataset.
*/

function initPollCard(viewport){
  const cardFlip = viewport.querySelector('.card-flip');
  if (!cardFlip) return null;

  // ---- Flip wiring ----
  viewport.querySelector('.vote-btn')?.addEventListener('click', () => {
    cardFlip.classList.add('is-flipped');
  });

  // Left-arrow button — always just flips back without submitting.
  viewport.querySelector('.back-btn')?.addEventListener('click', () => {
    cardFlip.classList.remove('is-flipped');
  });

  // Placeholder behavior for now — submitting will eventually trigger
  // a results update; for this revision it just flips back.
  viewport.querySelector('.submit-vote-btn')?.addEventListener('click', () => {
    cardFlip.classList.remove('is-flipped');
  });

  // ---- Face elements ----
  const resultsWrap = viewport.querySelector('.results-scroll-wrap');
  const resultsList = viewport.querySelector('.results-list');
  const resultsUp = resultsWrap?.querySelector('.arrow-row-up');
  const resultsDown = resultsWrap?.querySelector('.arrow-row-down');

  const votingWrap = viewport.querySelector('.voting-scroll-wrap');
  const votingList = viewport.querySelector('.voting-list');
  const votingUp = votingWrap?.querySelector('.arrow-row-up');
  const votingDown = votingWrap?.querySelector('.arrow-row-down');

  initScrollArrows(resultsWrap, resultsList, resultsUp, resultsDown);
  initScrollArrows(votingWrap, votingList, votingUp, votingDown);

  // ---- This card's dataset ----
  // Cached per card; rebuilt only when the clamped RESULTS_TEST_COUNT
  // no longer matches, preserving selections across resizes.
  let data = null;
  function ensurePollData(){
    const count = Math.min(RESULTS_MAX_CHOICES, Math.max(RESULTS_MIN_CHOICES, RESULTS_TEST_COUNT));
    if (!data || data.length !== count) data = buildPollData();
    return data;
  }

  // Clicking anywhere on a row toggles that choice's selection
  // (multi-select — any number of rows can be selected at once) and
  // re-renders to reflect the new state.
  votingList?.addEventListener('click', (event) => {
    const row = event.target.closest('.vote-row');
    if (!row) return;
    const item = ensurePollData()[Number(row.dataset.index)];
    if (!item) return;
    item.selected = !item.selected;
    renderVotingOptions(votingWrap, votingList, votingUp, votingDown, ensurePollData());
  });

  function render(){
    const d = ensurePollData();
    renderPollResults(resultsWrap, resultsList, resultsUp, resultsDown, d);
    renderVotingOptions(votingWrap, votingList, votingUp, votingDown, d);
  }

  return { render };
}

const pollCardInstances = [];

// Global re-render entry point — kept as `renderCard` so the manual
// test knob still works from the console on any page:
// RESULTS_TEST_COUNT = 30; renderCard();
function renderCard(){
  pollCardInstances.forEach(instance => instance.render());
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.card-viewport').forEach(viewport => {
    const instance = initPollCard(viewport);
    if (instance) pollCardInstances.push(instance);
  });
  renderCard();
});

let cardResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(cardResizeTimer);
  cardResizeTimer = setTimeout(renderCard, 100);
});
