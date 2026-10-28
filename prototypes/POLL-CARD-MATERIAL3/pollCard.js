/*
  POLL CARD — multi-instance component script.
  Adapted from designDocs/pollUserInterface/poll-card.js (research.md
  R7): all layout, sizing, color, scroll, and flip mechanics are kept
  verbatim from the reference component; only its demo data layer
  (seeded random sample polls, DOMContentLoaded auto-init of static
  markup) is replaced with live data — cards are mounted
  programmatically via window.PollCard.mount (see tabs.js), are fed
  their data by the tab that owns them through applyPoll, and submit
  via POST /api/polls/:pid/vote. A card never fetches on its own.

  SHARED POLL DATA
  Both faces of a card render from the same sorted dataset — Results-
  mode bars and Vote-mode bars must show choices in the same order
  (highest percentage first), so each card keeps one canonical, cached
  dataset (in its initPollCard closure) rather than each face
  generating its own.
*/

// Colour names and values from the xkcd colour survey: https://xkcd.com/color/rgb/
const RESULTS_PALETTE_ENTRIES = [
  { hex: '#014182', name: 'darkish blue' },
  { hex: '#1F6357', name: 'dark green blue' },
  { hex: '#FCC006', name: 'marigold' },
  { hex: '#C45508', name: 'rust orange' },
  { hex: '#0203E2', name: 'pure blue' },
  { hex: '#000000', name: 'black' },
  { hex: '#DB4BDA', name: 'pink purple' },
  { hex: '#7F5F00', name: 'shit' },
  { hex: '#8B3103', name: 'rust brown' },
  { hex: '#929591', name: 'grey' },
  { hex: '#016795', name: 'peacock blue' },
  { hex: '#137E6D', name: 'blue green' },
  { hex: '#FEC615', name: 'golden yellow' },
  { hex: '#E17701', name: 'pumpkin' },
  { hex: '#0C06F7', name: 'strong blue' },
  { hex: '#070D0D', name: 'almost black' },
  { hex: '#F075E6', name: 'purply pink' },
  { hex: '#A87900', name: 'bronze' },
  { hex: '#A83C09', name: 'rust' },
  { hex: '#A8A495', name: 'greyish' },
  { hex: '#0485D1', name: 'cerulean' },
  { hex: '#3C9992', name: 'sea' },
  { hex: '#F4D054', name: 'maize' },
  { hex: '#F97306', name: 'orange' },
  { hex: '#3A2EFE', name: 'light royal blue' },
  { hex: '#1B2431', name: 'dark' },
  { hex: '#DD85D7', name: 'lavender pink' },
  { hex: '#C69C04', name: 'ocre' },
  { hex: '#DC4D01', name: 'deep orange' },
  { hex: '#C8ACA9', name: 'pinkish grey' },
  { hex: '#056EEE', name: 'cerulean blue' },
  { hex: '#42B395', name: 'greeny blue' },
  { hex: '#FDDE6C', name: 'pale gold' },
  { hex: '#F0833A', name: 'dusty orange' },
  { hex: '#6140EF', name: 'purpleish blue' },
  { hex: '#363737', name: 'dark grey' },
  { hex: '#D6B4FC', name: 'light violet' },
  { hex: '#FCB001', name: 'yellow orange' },
  { hex: '#FF5B00', name: 'bright orange' },
  { hex: '#C5C9C7', name: 'silver' },
  { hex: '#0D75F8', name: 'deep sky blue' },
  { hex: '#24BCA8', name: 'tealish' },
  { hex: '#FFF39A', name: 'dark cream' },
  { hex: '#FFA756', name: 'pale orange' },
  { hex: '#6A79F7', name: 'cornflower' },
  { hex: '#3C4142', name: 'charcoal grey' },
  { hex: '#EFC0FE', name: 'light lavendar' },
  { hex: '#FFC512', name: 'sunflower' },
  { hex: '#FB7D07', name: 'pumpkin orange' },
  { hex: '#D8DCD6', name: 'light grey' }
];

const RESULTS_COLOR_PALETTE = RESULTS_PALETTE_ENTRIES.map(e => e.hex);

/*
  SEMANTIC CHOICE COLORS (009-POLL-CHOICE-COLORS)
  Choices that read as "yes" or "no" get a fixed color instead of a
  palette entry, so a viewer can read the shape of an agree/disagree
  poll without reading the labels. Affirmative is tested first, so a
  label matching both lists ("Yes and no") comes out affirmative.

  Two kinds of match:
    - word rules  -- the word appears as a WHOLE word anywhere in the
      label. The boundary is letters-only: only a letter on either side
      counts as "still part of the word", so a space, hyphen, digit, or
      underscore all delimit it. Plain \b can't express this (\b treats
      digits and underscore as word characters), so the boundary is
      built from lookaround instead of \b -- that is what keeps
      "correct" inside "Incorrect" from matching, while still letting
      "Agree2"/"yes_please" match (FR-004, amended 009 mid-flight: the
      original decision treated digits/underscore as word characters
      like \b does, which kept those two out; the boundary was
      widened to letters-only after testing showed the narrower one
      unintuitive).
    - exact rules -- the whole trimmed label is that token. These are
      short enough ("y", "n") that word-matching them would fire on any
      label containing a stray "N", so they must stay whole-label only.

  These regexes MUST NOT carry the `g` flag: a global regex retains
  lastIndex between .test() calls, so a module-scope one would return
  alternating true/false for identical labels and produce colors that
  depend on how many bars were checked before them.
*/

const SEMANTIC_AFFIRMATIVE_COLOR = '#018826';
const SEMANTIC_NEGATIVE_COLOR = '#CF0234';

const AFFIRMATIVE_WORDS = /(?<![a-z])(?:yes|true|correct|agree|yay)(?![a-z])/i;
const NEGATIVE_WORDS = /(?<![a-z])(?:no|false|incorrect|disagree|nay)(?![a-z])/i;
const AFFIRMATIVE_EXACT = ['y', 'yup'];
const NEGATIVE_EXACT = ['n', 'nope'];

// Returns the semantic color for a label, or null if no rule matches
// (in which case the caller draws from the palette). A non-string or
// missing label coerces to '' and simply matches nothing.
function semanticColorFor(label){
  const text = (typeof label === 'string' ? label : '').trim();
  if (!text) return null;
  const lower = text.toLowerCase();

  if (AFFIRMATIVE_WORDS.test(text) || AFFIRMATIVE_EXACT.includes(lower)){
    return SEMANTIC_AFFIRMATIVE_COLOR;
  }
  if (NEGATIVE_WORDS.test(text) || NEGATIVE_EXACT.includes(lower)){
    return SEMANTIC_NEGATIVE_COLOR;
  }
  return null;
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
const RESULTS_GAP_FIXED = 2;

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

function measuredBarLayout(count, wrap){
  return computeBarLayout(count, wrap.clientHeight);
}

function maximizedBarLayout(count, bounds){
  const { minChoices, maxChoices } = bounds;
  if (maxChoices <= minChoices){
    return { scrolling: false, barHeight: RESULTS_MAX_BAR_HEIGHT, gap: RESULTS_GAP_FIXED };
  }
  const n = Math.min(Math.max(count, minChoices), maxChoices);
  const share = (n - minChoices) / (maxChoices - minChoices);
  const barHeight = RESULTS_MAX_BAR_HEIGHT - share * (RESULTS_MAX_BAR_HEIGHT - RESULTS_MIN_BAR_HEIGHT);
  return { scrolling: false, barHeight, gap: RESULTS_GAP_FIXED };
}

/*
  RESULTS-MODE — horizontal bar list
  Renders a card's dataset inside its .results-list, one colored bar
  per choice, longest (highest %) first.

  Bar colors are assigned semantic-first: a choice whose label reads as
  "yes" or "no" takes its fixed semantic color (see semanticColorFor
  above), and every other choice takes the next unused entry from
  RESULTS_COLOR_PALETTE in display order. Semantically colored choices
  don't consume a palette entry.
*/

// FNV-1a: http://www.isthe.com/chongo/tech/comp/fnv/
function paletteOffsetFor(pid){
  if (typeof pid !== 'string' || !pid) return 0;
  let hash = 0x811C9DC5;
  for (let i = 0; i < pid.length; i++){
    hash ^= pid.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % RESULTS_COLOR_PALETTE.length;
}

// Assigns a color to every choice in one left-to-right pass over the
// display-ordered dataset, returning an array parallel to `data`.
//
// A whole-dataset pass rather than a per-index lookup because a choice's
// palette entry depends on how many EARLIER choices took one -- which an
// index alone can't tell you once some choices are colored by another
// rule. Both render paths call this with the same freshly sorted data,
// so they can never disagree about a bar's color.
function assignResultColors(data, paletteOffset){
  let paletteIndex = paletteOffset;
  return data.map(item => {
    const semantic = semanticColorFor(item.label);
    if (semantic) return semantic;
    // Only choices that reach here consume a palette entry.
    return RESULTS_COLOR_PALETTE[paletteIndex++ % RESULTS_COLOR_PALETTE.length];
  });
}

// Relative luminance as WCAG defines it: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
function luminanceOf(hex){
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const lin = v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

const RESULTS_INK_TARGET_CONTRAST = 7;
const RESULTS_INK_START_LIGHTNESS = 0.25;
const RESULTS_INK_FLOOR_LIGHTNESS = 0.08;
const SEMANTIC_TRACK_TINT = 0.85;
const RESULTS_TRACK_TINT = 0.8;
const RESULTS_LIGHT_INK_LIGHTNESS = 0.95;
const SEMANTIC_TEXT_COLOR = '#FFFFFF';

function hexToRgb(hex){
  const c = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(c.substring(i, i + 2), 16) / 255);
}

// Contrast ratio as WCAG defines it: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
function contrastRatio(a, b){
  const [hi, lo] = [luminanceOf(a), luminanceOf(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function hexToHsl(hex){
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h < 0 ? h + 360 : h, s, l];
}

function hslToHex(h, s, l){
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}

function darkShadeOf(hex){
  const [h, s] = hexToHsl(hex);
  let l = RESULTS_INK_START_LIGHTNESS;
  let ink = hslToHex(h, s, l);
  while (contrastRatio(ink, hex) < RESULTS_INK_TARGET_CONTRAST && l > RESULTS_INK_FLOOR_LIGHTNESS + 1e-9){
    l = Math.round((l - 0.01) * 100) / 100;
    ink = hslToHex(h, s, l);
  }
  return ink;
}

function mixWithWhite(hex, amount){
  return '#' + hexToRgb(hex)
    .map((v) => Math.round((v * (1 - amount) + amount) * 255).toString(16).padStart(2, '0'))
    .join('');
}

function lightShadeOf(hex){
  const [h, s] = hexToHsl(hex);
  return hslToHex(h, s, RESULTS_LIGHT_INK_LIGHTNESS);
}

function inkOnFillFor(fill){
  const light = lightShadeOf(fill);
  const dark = darkShadeOf(fill);
  return contrastRatio(light, fill) >= contrastRatio(dark, fill) ? light : dark;
}

function barColorsFor(fill, trackTint, inkOnFill){
  const track = mixWithWhite(fill, trackTint);
  return { track, inkOnTrack: darkShadeOf(track), inkOnFill };
}

const BAR_COLORS = new Map([
  ...RESULTS_COLOR_PALETTE.map((hex) => [hex, barColorsFor(hex, RESULTS_TRACK_TINT, inkOnFillFor(hex))]),
  ...[SEMANTIC_AFFIRMATIVE_COLOR, SEMANTIC_NEGATIVE_COLOR].map((hex) => [hex, barColorsFor(hex, SEMANTIC_TRACK_TINT, SEMANTIC_TEXT_COLOR)])
]);

/*
  M3: dark-scheme bar colours (REQUIREMENT004, prototype only). The light
  entries above are unchanged. In the dark scheme each track is mixed toward
  the dark card surface (--md-sys-color-surface-container-low) by the same
  amounts, and the ink on a track climbs in lightness until it reaches the same
  7:1. The fills, inkOnFill and the white Yes/No copy are the same in both
  schemes. applyBarColors hands both pairs to CSS as custom properties, and
  pollCard-m3.css picks the pair for the scheme, so a scheme change needs no
  re-render.
*/
const RESULTS_DARK_SURFACE = '#181D19';
const RESULTS_DARK_INK_START_LIGHTNESS = 0.75;
const RESULTS_DARK_INK_CEILING_LIGHTNESS = 0.98;

function mixWith(hex, base, amount){
  const b = hexToRgb(base);
  return '#' + hexToRgb(hex)
    .map((v, i) => Math.round((v * (1 - amount) + b[i] * amount) * 255).toString(16).padStart(2, '0'))
    .join('');
}

function lightShadeFor(hex){
  const [h, s] = hexToHsl(hex);
  let l = RESULTS_DARK_INK_START_LIGHTNESS;
  let ink = hslToHex(h, s, l);
  while (contrastRatio(ink, hex) < RESULTS_INK_TARGET_CONTRAST && l < RESULTS_DARK_INK_CEILING_LIGHTNESS - 1e-9){
    l = Math.round((l + 0.01) * 100) / 100;
    ink = hslToHex(h, s, l);
  }
  return ink;
}

function darkBarColorsFor(fill, trackTint){
  const track = mixWith(fill, RESULTS_DARK_SURFACE, trackTint);
  return { track, inkOnTrack: lightShadeFor(track) };
}

const BAR_COLORS_DARK = new Map([
  ...RESULTS_COLOR_PALETTE.map((hex) => [hex, darkBarColorsFor(hex, RESULTS_TRACK_TINT)]),
  ...[SEMANTIC_AFFIRMATIVE_COLOR, SEMANTIC_NEGATIVE_COLOR].map((hex) => [hex, darkBarColorsFor(hex, SEMANTIC_TRACK_TINT)])
]);

function clipToWidth(width){
  return 'inset(0 calc(100% - ' + width + ') 0 0)';
}

function setFillWidth(row, pct){
  row.querySelector('.result-fill').style.width = pct + '%';
  const overlay = row.querySelector('.result-ink-on-fill');
  if (overlay) overlay.style.clipPath = clipToWidth(pct + '%');
}

function syncInkOnFill(row, inkOnFill){
  let overlay = row.querySelector('.result-ink-on-fill');
  if (!overlay){
    overlay = document.createElement('span');
    overlay.className = 'result-ink-on-fill';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.clipPath = clipToWidth(row.querySelector('.result-fill').style.width || '0%');
    row.append(overlay);
    void overlay.offsetWidth;
  }
  const copies = Array.from(row.querySelectorAll(':scope > .result-label, :scope > .result-pct')).map((text) => {
    const copy = text.cloneNode(true);
    copy.style.color = inkOnFill;
    return copy;
  });
  overlay.replaceChildren(...copies);
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

function renderPollResults(wrap, list, upRow, downRow, data, layoutFor, paletteOffset){
  if (!wrap || !list || !upRow || !downRow) return;

  const count = data.length;

  // Measured before any DOM changes: the bar area is absolutely
  // positioned (see .bar-scroll-inner in the CSS), so the wrap's size
  // is content-independent by construction. Measuring first is what
  // lets the in-place path below skip the clear-and-rebuild entirely.
  const layout = layoutFor(count, wrap);
  const { barHeight, gap } = layout;
  const compact = barHeight < RESULTS_COMPACT_THRESHOLD;

  const fontSize = scaleFontSize(barHeight);
  const pad = scalePad(fontSize);

  // Computed once, before the in-place/rebuild fork, so both paths color
  // the bars from the same array.
  const colors = assignResultColors(data, paletteOffset);

  // After layout, truncate a label with an ellipsis ONLY if it (plus
  // its left padding) would occupy more than 90% of the bar's total
  // width. Otherwise the full label renders, extending past the fill
  // into the track behind it if needed. Skipped for compact rows,
  // where label text is hidden entirely.
  function applyTruncation(rows){
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

  function applyBarColors(rows){
    rows.forEach(({ row, color }) => {
      const { track, inkOnTrack, inkOnFill } = BAR_COLORS.get(color);
      // M3: both schemes' track and ink go to CSS as custom properties
      // (pollCard-m3.css picks the pair), instead of an inline background
      // and color. pollCard-m3.css must load wherever this file is used.
      const dark = BAR_COLORS_DARK.get(color);
      row.style.setProperty('--bar-track', track);
      row.style.setProperty('--bar-ink', inkOnTrack);
      row.style.setProperty('--bar-track-dark', dark.track);
      row.style.setProperty('--bar-ink-dark', dark.inkOnTrack);
      row.querySelectorAll(':scope > .result-label, :scope > .result-pct').forEach((text) => {
        text.style.textShadow = 'none';
      });
      syncInkOnFill(row, inkOnFill);
    });
  }

  /*
    IN-PLACE UPDATE vs REBUILD
    A live refresh (every ENV_POLLING_INTERVAL) normally changes only
    the percentages — same choices, same bar sizing. Rebuilding the
    list in that case would recreate every .result-fill at its CSS
    width:0% and replay the grow-in animation on every poll, which
    reads as the bars flickering back to empty every few seconds.
    So when nothing layout-affecting has changed, the existing rows
    are updated instead: each fill transitions from its current width
    to the new one, which is the same animation doing the useful half
    of its job (showing the change) without the distracting reset.

    The signature covers everything the rebuilt DOM encodes — row
    count and every size/spacing value derived from it — so a resize,
    a choice added/removed, or a switch into/out of compact mode all
    still fall through to a full rebuild.
  */
  const signature = [count, barHeight, gap, compact, fontSize, pad].join('|');
  if (list.dataset.renderSignature === signature && list.children.length === count){
    const rows = data.map((item, i) => {
      const row = list.children[i];
      const label = row.querySelector('.result-label');
      const pctEl = row.querySelector('.result-pct');

      // Fill color MUST be reapplied here, not just on a rebuild. Bar
      // color is a function of the choice, but `data` re-sorts by
      // percentage on every refresh, so a given DOM row shows a
      // DIFFERENT choice after a reorder. Skipping this leaves each row
      // wearing the previous occupant's color: in a Yes/No poll where No
      // overtakes Yes, the card would render "No" green and "Yes" red --
      // silently, never on page load, only after a live vote change.
      const color = colors[i];
      row.querySelector('.result-fill').style.background = color;

      row.title = item.label + ' — ' + item.pct + '%';
      if (label){
        label.textContent = item.label;
      }
      if (pctEl){
        pctEl.textContent = item.pct + '%';
      }
      return { row, label, pct: item.pct, color };
    });
    applyTruncation(rows);
    applyBarColors(rows);
    rows.forEach(({ row, pct }) => setFillWidth(row, pct));
    updateArrowRows(wrap, list, upRow, downRow, layout);
    return;
  }

  const previousScrollTop = list.scrollTop;

  // Reset to an empty, arrows-inactive state.
  list.innerHTML = '';
  list.style.rowGap = '';
  upRow.classList.remove('is-active', 'is-visible');
  downRow.classList.remove('is-active', 'is-visible');
  upRow.style.height = '';
  downRow.style.height = '';

  list.style.rowGap = gap + 'px';

  const rows = data.map((item, i) => {
    const color = colors[i];

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
    label.style.fontSize = fontSize + 'px';
    label.style.left = pad + 'px';

    const pct = document.createElement('span');
    pct.className = 'result-pct';
    pct.textContent = item.pct + '%';
    pct.style.fontSize = fontSize + 'px';
    pct.style.right = pad + 'px';

    row.append(fill, label, pct);
    list.appendChild(row);

    return { row, label, pct: item.pct, color };
  });

  applyTruncation(rows);
  applyBarColors(rows);

  list.dataset.renderSignature = signature;

  // Restore scroll position (this path rebuilt the list from scratch)
  // and refresh the arrow rows to match.
  list.scrollTop = Math.max(0, Math.min(previousScrollTop, list.scrollHeight - list.clientHeight));
  updateArrowRows(wrap, list, upRow, downRow, layout);

  // Animate fill widths in. Deferring past a paint is load-bearing:
  // the fills are born at the stylesheet's width:0%, and setting the
  // real width in the same frame would land before that initial state
  // was ever rendered, so there'd be nothing to transition from.
  requestAnimationFrame(() => {
    setTimeout(() => {
      rows.forEach(({ row, pct }) => setFillWidth(row, pct));
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

function renderVotingOptions(wrap, list, upRow, downRow, data, layoutFor){
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

  const layout = layoutFor(count, wrap);
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

function initPollCard(viewport, opts){
  const cardFlip = viewport.querySelector('.card-flip');
  if (!cardFlip) return null;
  opts = opts || {};

  // ---- Face elements ----
  const resultsWrap = viewport.querySelector('.results-scroll-wrap');
  const resultsList = viewport.querySelector('.results-list');
  const resultsUp = resultsWrap?.querySelector('.arrow-row-up');
  const resultsDown = resultsWrap?.querySelector('.arrow-row-down');

  const votingWrap = viewport.querySelector('.voting-scroll-wrap');
  const votingList = viewport.querySelector('.voting-list');
  const votingUp = votingWrap?.querySelector('.arrow-row-up');
  const votingDown = votingWrap?.querySelector('.arrow-row-down');

  const submitBtn = viewport.querySelector('.submit-vote-btn');

  // 007-closed-state: front (Live Results link/Vote) and back (choice
  // bars/Submit vote) elements swapped for a closed message once a poll
  // closes — see updateClosedState() below.
  const liveLink = viewport.querySelector('.live-link');
  const liveBars = viewport.querySelector('.live-bars');
  const liveX = viewport.querySelector('.live-x');
  const removeMode = typeof opts.onClose === 'function';
  const voteBtn = viewport.querySelector('.vote-btn');
  const bookmarkBtn = viewport.querySelector('.bookmark-btn');
  const voteNoticeFront = viewport.querySelector('.card-front .poll-vote-notice');
  const closedMessageFront = viewport.querySelector('.card-front .poll-closed-message');
  const editingMessageFront = viewport.querySelector('.card-front .poll-editing-message');
  const blockedMessageFront = viewport.querySelector('.card-front .poll-blocked-message');
  const closedMessageBack = viewport.querySelector('.poll-closed-message--back');
  const voteErrorBack = viewport.querySelector('.card-back .poll-vote-error');

  initScrollArrows(resultsWrap, resultsList, resultsUp, resultsDown);
  initScrollArrows(votingWrap, votingList, votingUp, votingDown);

  // ---- This card's dataset ----
  // `poll` is the latest PollDetail from GET /api/polls/:pid; `data` is
  // the render dataset both faces share (reference invariant: sorted by
  // percentage descending, selections carried on the items).
  let poll = null;
  let data = null;
  /* 012 FR-045: the voter's in-progress selection, held independently of the flip
     state so it survives a flip the system forced (W1/W3) and is restored when the
     poll reopens (W5). null means "nothing pending — use the recorded vote". */
  let pendingSelection = null;
  let layoutFor = measuredBarLayout;
  const paletteOffset = paletteOffsetFor(opts.pid);
  let isMaximized = false;

  function rebuildData(selectedIds){
    data = poll.choices.map((c) => ({
      id: c.id,
      label: c.label,
      pct: c.pct,
      selected: selectedIds.indexOf(c.id) !== -1
    }));
    data.sort((a, b) => b.pct - a.pct);
  }

  function selectedIds(){
    return data ? data.filter((d) => d.selected).map((d) => d.id) : [];
  }

  // FR-023: submission disabled until at least one choice is selected.
  function updateSubmitState(){
    if (submitBtn) submitBtn.disabled = selectedIds().length === 0 || Boolean(viewerBlockedReason());
  }

  /** 012 FR-058: a refused vote must say why, on the face the voter is looking at. */
  function showVoteError(message){
    if (!voteErrorBack) return;
    voteErrorBack.textContent = message;
    voteErrorBack.hidden = false;
  }

  function clearVoteError(){
    if (voteErrorBack) voteErrorBack.hidden = true;
  }

  function setText(){
    viewport.querySelectorAll('.question').forEach((el) => { el.textContent = poll.title; });
    viewport.querySelectorAll('.subtitle').forEach((el) => { el.textContent = poll.subtitle || ''; });
    // FR-022: totals alongside the results (app addition; see site.css).
    // 008 FR-004/FR-005: written to both faces' copies from one composition
    // in one call, so they can never show different values.
    // FIX022: "N votes" (one participant, one vote — the count is of participants who voted).
    let text = poll.totalVoted + ' vote' + (poll.totalVoted === 1 ? '' : 's');
    if (typeof poll.totalNotYetVoted === 'number' && poll.totalNotYetVoted > 0){
      text += ' · ' + poll.totalNotYetVoted + ' not yet voted';
    }
    viewport.querySelectorAll('.poll-totals').forEach((el) => { el.textContent = text; });
    // FIX020/FIX021/FIX023: on the personal tabs, why this poll is listed — bare
    // words; a bookmark is not named, the star already says it. "you voted" shares
    // the count's line; created / invited take a line of their own.
    const reasons = Array.isArray(poll.listedBecause) ? poll.listedBecause : [];
    const votedEl = viewport.querySelector('.poll-voted');
    if (votedEl){
      const voted = reasons.indexOf('voted') !== -1;
      votedEl.textContent = voted ? 'you voted' : '';
      votedEl.hidden = !voted;
    }
    const because = viewport.querySelector('.poll-listed-because');
    if (because){
      const words = { created: 'created by you', invited: 'you are invited' };
      const parts = reasons.map((r) => words[r]).filter(Boolean);
      because.textContent = parts.join(' · ');
      because.hidden = parts.length === 0;
    }
  }

  // 007-closed-state FR-003: date-only, no time -- compact for the space
  // this message occupies (research.md R4).
  function formatClosedDate(isoString){
    return new Date(isoString).toLocaleDateString();
  }

  // 007-closed-state: swaps the Live Results link/Vote button (front) and
  // the choice bars/Submit vote button (back) for a closed message once a
  // poll closes (FR-001/002/004/005/006, contracts/ui-contracts.md).
  // .back-btn is never touched here, so it stays usable (FR-007).
  /*
    012 US6 (FR-042/FR-042a/FR-043): while a poll is being edited the card shows its
    FRONT face carrying one message, in place of both the Vote and Live Results
    controls. It takes precedence over the closed-poll message: a closed poll can
    still be opened for editing, and "try again shortly" is the actionable truth in
    that moment — the closed message returns when editing ends.
  */
  var EDITING_MESSAGE =
    'This poll is momentarily unavailable to cast a vote. Please try again shortly.';

  function isEditing(){
    return !!poll && poll.pollState === 'EDITING';
  }

  /*
    012 FR-057: this viewer may not vote in this poll — banned, not invited, or the
    poll is full. The server has always refused these (004 FR-028); what it never did
    was tell the card, so the card offered a Vote button, then a Submit button, then
    swallowed the refusal. Say it once, up front, on the front face.
  */
  function viewerBlockedReason(){
    return poll && poll.canVote === false ? (poll.voteBlockedReason || '') : '';
  }

  function updateBlockedState(){
    const reason = viewerBlockedReason();
    if (blockedMessageFront){
      blockedMessageFront.hidden = !reason;
      blockedMessageFront.textContent = reason;
    }
    if (!reason) return;
    // Results stay visible — a public poll is still readable. Only the two controls
    // that lead to a vote are withdrawn.
    if (voteBtn) voteBtn.hidden = true;
    if (submitBtn) submitBtn.hidden = true;
    if (cardFlip.classList.contains('is-flipped')) cardFlip.classList.remove('is-flipped');
  }

  function updateEditingState(){
    const editing = isEditing();
    if (editingMessageFront) {
      editingMessageFront.hidden = !editing;
      editingMessageFront.textContent = editing ? EDITING_MESSAGE : '';
    }
    if (!editing) return;
    // Precedence: whatever the underlying state, nothing else claims the slot.
    if (liveLink && !removeMode) liveLink.hidden = true;
    if (voteBtn) voteBtn.hidden = true;
    if (closedMessageFront) closedMessageFront.hidden = true;
    // W1/W3: the card ends on the front face. The selection is not discarded —
    // it lives in pendingSelection and is restored when the poll reopens (W5).
    if (cardFlip.classList.contains('is-flipped')){
      pendingSelection = selectedIds();
      cardFlip.classList.remove('is-flipped');
    }
  }

  function updateClosedState(){
    const closed = !!poll && poll.pollState === 'CLOSED';
    const dateText = closed ? formatClosedDate(poll.endAt) : '';

    if (liveLink && !removeMode) liveLink.hidden = closed;
    if (voteBtn) voteBtn.hidden = closed;
    if (closedMessageFront){
      closedMessageFront.hidden = !closed;
      closedMessageFront.textContent = closed ? 'Poll closed on ' + dateText : '';
    }

    if (votingWrap) votingWrap.hidden = closed;
    if (submitBtn) submitBtn.hidden = closed;
    if (closedMessageBack){
      closedMessageBack.hidden = !closed;
      closedMessageBack.textContent = closed ? 'This Poll closed on ' + dateText : '';
    }
    // A viewer who may not vote is told so whatever the poll's state; the editing
    // message still outranks everything, so it is applied last.
    updateBlockedState();
    updateEditingState();
  }

  function render(){
    if (!data) return;
    // M3: multi-choice polls draw an M3 checkbox instead of a radio (pollCard-m3.css).
    votingList?.classList.toggle('is-multi', Boolean(poll) && poll.choiceMode !== 'Single-Choice Poll');
    renderPollResults(resultsWrap, resultsList, resultsUp, resultsDown, data, layoutFor, paletteOffset);
    renderVotingOptions(votingWrap, votingList, votingUp, votingDown, data, layoutFor);
    updateSubmitState();
    updateClosedState();
    updateActionButtons();
  }

  /*
    A card is fed from data rather than fetching its own: the tab that owns it
    hands it a fresh PollDetail whenever something it holds changed.

    FR-045: the in-progress selection is held in `pendingSelection`, independent of
    the flip state. The old rule kept a selection only *while the card was flipped*,
    which used the flip as a proxy for "the voter is mid-vote" — a proxy 012 breaks
    by introducing a flip the voter did not ask for.
  */
  function applyPoll(next){
    poll = next;
    if (cardFlip.classList.contains('is-flipped')) pendingSelection = selectedIds();
    const keep = pendingSelection !== null ? pendingSelection : (poll.myChoiceIds || []);
    rebuildData(keep);
    setText();
    render();
  }

  function requireSignIn(){
    if (opts.isSignedIn && !opts.isSignedIn()){
      location.href = '/login';
      return false;
    }
    return true;
  }

  /* The card actions: Vote everywhere but the Search tab, Live Results
     everywhere but the Live Results tab, Bookmark everywhere but My PRIVATE POLLS
     (FIX024: a private poll never reaches Favourites, so the icon there would
     mislead), and the X that removes the poll on the Live Results tab alone
     (FIX025). Guests are sent to sign in by the first three. */
  function updateActionButtons(){
    if (voteBtn && opts.showVote === false) voteBtn.hidden = true;
    if (bookmarkBtn && opts.showBookmark === false) bookmarkBtn.hidden = true;
    if (liveLink){
      if (opts.showLive === false) liveLink.hidden = true;
      else {
        liveLink.classList.remove('is-inert');
        liveLink.removeAttribute('aria-disabled');
        liveLink.setAttribute('role', 'button');
        liveLink.tabIndex = 0;
      }
      if (liveBars) liveBars.hidden = removeMode;
      if (liveX) liveX.hidden = !removeMode;
      const name = removeMode ? 'Remove from Live Results' : 'Add to Live Results';
      liveLink.title = name;
      if (removeMode) liveLink.setAttribute('aria-label', name);
      else liveLink.removeAttribute('aria-label');
    }
    if (bookmarkBtn && poll){
      const bookmarked = Boolean(poll.bookmarked);
      const label = bookmarked ? 'Remove from Favorites' : 'Add to Favorites';
      bookmarkBtn.setAttribute('aria-label', label);
      bookmarkBtn.title = label;
      bookmarkBtn.setAttribute('aria-pressed', bookmarked ? 'true' : 'false');
    }
  }

  function activateLiveLink(){
    if (opts.showLive === false || !requireSignIn()) return;
    if (removeMode) opts.onClose(opts.pid, poll);
    else if (opts.onLive) opts.onLive(opts.pid, poll);
  }

  liveLink?.addEventListener('click', (event) => {
    event.preventDefault();
    activateLiveLink();
  });

  // https://www.w3.org/WAI/ARIA/apg/patterns/button/#keyboardinteraction
  liveLink?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
    event.preventDefault();
    activateLiveLink();
  });

  bookmarkBtn?.addEventListener('click', () => {
    if (opts.showBookmark === false || !requireSignIn()) return;
    if (opts.onBookmark) opts.onBookmark(opts.pid, !(poll && poll.bookmarked), poll);
  });

  function requestMaximize(){
    if (isMaximized || !opts.onMaximize) return;
    opts.onMaximize(opts.pid);
  }

  viewport.querySelectorAll('.question, .subtitle').forEach((el) => {
    el.addEventListener('click', requestMaximize);
  });

  viewport.querySelectorAll('.maximize-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (isMaximized){
        if (opts.onMinimize) opts.onMinimize(opts.pid);
      } else {
        requestMaximize();
      }
    });
  });

  function setMaximized(on){
    isMaximized = on;
    layoutFor = on ? (count) => maximizedBarLayout(count, opts.choiceBounds) : measuredBarLayout;
    viewport.classList.toggle('maximized-card-viewport', on);
    cardFlip.classList.toggle('maximized-card-flip', on);
    const name = on ? 'Minimize Poll Card' : 'Maximize Poll Card';
    viewport.querySelectorAll('.maximize-btn').forEach((maximizeBtn) => {
      maximizeBtn.setAttribute('aria-label', name);
      maximizeBtn.title = name;
      maximizeBtn.querySelector('.maximize-icon').toggleAttribute('hidden', on);
      maximizeBtn.querySelector('.minimize-icon').toggleAttribute('hidden', !on);
    });
    render();
  }

  // ---- Flip wiring ----
  // Vote requires sign-in (FR-016); guests are sent to the login page.
  viewport.querySelector('.vote-btn')?.addEventListener('click', () => {
    if (!requireSignIn()) return;
    // 012 W2: the click landed in the split second before the grid refreshed. The
    // card must not turn over — it shows the message and stays on the front face.
    if (isEditing()){
      updateEditingState();
      return;
    }
    // 012 FR-057: belt and braces — the button is hidden for a blocked viewer, but a
    // refresh could race a click.
    if (viewerBlockedReason()){
      updateBlockedState();
      return;
    }
    rebuildData(pendingSelection !== null ? pendingSelection : (poll ? poll.myChoiceIds || [] : []));
    cardFlip.classList.add('is-flipped');
    render();
  });

  // Left-arrow button — always just flips back without submitting.
  viewport.querySelector('.back-btn')?.addEventListener('click', () => {
    cardFlip.classList.remove('is-flipped');
  });

  // Submit posts the current selection through the vote client; the response
  // carries the poll's live counts and the voter's choices, which the owning tab
  // applies to this card at once.
  submitBtn?.addEventListener('click', async () => {
    const ids = selectedIds();
    if (ids.length === 0 || !poll) return;
    clearVoteError();
    if (!window.VoteClient || !window.VoteClient.canVote()){
      showVoteError('Please wait a moment before voting again.');
      return;
    }
    submitBtn.disabled = true;
    const result = await window.VoteClient.submit(opts.pid, ids);
    if (result.ok){
      pendingSelection = null;
      cardFlip.classList.remove('is-flipped');
      if (opts.onVoted) opts.onVoted(opts.pid, result.outcome);
      holdVoteButton(result.outcome.nextRefreshMs || 0);
      showVoteNotice(result.outcome.status === 'queued' ? window.VoteClient.QUEUED_NOTICE : '');
      return;
    }
    // 012 W3/W4: the poll entered EDITING; nothing was recorded, the selection
    // is kept, and the card ends on the front face showing the message.
    if (result.code === 'POLL_EDITING'){
      pendingSelection = ids;
      if (poll) poll.pollState = 'EDITING';
      cardFlip.classList.remove('is-flipped');
      render();
      submitBtn.disabled = false;
      return;
    }
    showVoteError(result.error || 'Your vote could not be recorded. Please try again.');
    render();
  });

  function holdVoteButton(ms){
    if (!voteBtn) return;
    voteBtn.disabled = true;
    setTimeout(() => { voteBtn.disabled = false; }, ms);
  }

  function showVoteNotice(text){
    if (!voteNoticeFront) return;
    voteNoticeFront.textContent = text;
    voteNoticeFront.hidden = !text;
  }

  // Clicking anywhere on a row toggles that choice's selection. A
  // Single-Choice Poll keeps at most one selection — picking a new
  // choice deselects the previous one (FR-024); a Multiple-Choice Poll
  // toggles any number independently (FR-025).
  votingList?.addEventListener('click', (event) => {
    const row = event.target.closest('.vote-row');
    if (!row || !data) return;
    const item = data[Number(row.dataset.index)];
    if (!item) return;
    const single = poll && poll.choiceMode === 'Single-Choice Poll';
    if (single && !item.selected){
      data.forEach((d) => { d.selected = false; });
    }
    item.selected = !item.selected;
    renderVotingOptions(votingWrap, votingList, votingUp, votingDown, data, layoutFor);
    updateSubmitState();
  });

  /* The owning tab tears the card down when a poll leaves its listing. */
  function unmount(){
    viewport.remove();
    const at = pollCardInstances.indexOf(instance);
    if (at >= 0) pollCardInstances.splice(at, 1);
  }

  const instance = {
    render,
    applyPoll,
    unmount,
    setMaximized,
    detail: () => poll,
    get isMaximized(){ return isMaximized; },
    element: viewport,
    pid: opts.pid
  };
  return instance;
}

const pollCardInstances = [];

// Global re-render entry point (all mounted cards) — driven by the
// shared resize handler below, same as the reference component.
function renderCard(){
  pollCardInstances.forEach(instance => instance.render());
}

/*
  LIVE MOUNTING
  The reference page auto-initializes static demo markup on
  DOMContentLoaded; the app instead mounts cards programmatically
  (tabs.js), one per poll, injecting the reference grid page's card
  markup verbatim — with a few app deltas: the "Live Results" link adds
  the poll to the Live Results tab; a Bookmark icon button (a tag with a
  star) sits at the right of the title row (FIX03, FIX05), joined on the
  Live Results tab by an X that removes the poll (FIX025); a .poll-totals
  line under the action row (FIX022) carries FR-022's
  totals; and two
  hidden .poll-closed-message elements (007-closed-state) stand in for
  the Live Results link/Vote button (front) and the choice bars/Submit
  vote button (back) once a poll closes (contracts/ui-contracts.md).
*/
const POLL_CARD_TEMPLATE = `
    <div class="card-viewport">
      <div class="card-flip">

        <!-- FRONT — Results-mode -->
        <div class="card-face card-front">
          <div class="question-wrap">
            <div class="question-row">
              <p class="question"></p>
              <!-- FIX03/FIX05: a tag-with-star icon; aria-pressed drives which of the
                   two looks the stylesheet draws (light grey outline / red star). -->
              <button class="bookmark-btn" type="button" aria-pressed="false" aria-label="Add to Favorites" title="Add to Favorites">
                <svg class="bookmark-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                  <path class="bookmark-tag" d="M11.414 2.586A2 2 0 0 1 12.828 2H20a2 2 0 0 1 2 2v7.172a2 2 0 0 1-.586 1.414l-8.704 8.704a2.426 2.426 0 0 1-3.42 0l-6.58-6.58a2.426 2.426 0 0 1 0-3.42z"/>
                  <circle class="bookmark-hole" cx="16.5" cy="7.5" r="1.25"/>
                  <path class="bookmark-halo" d="M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55-4.76-4.64 6.58-.96z" transform="translate(10.5 11) scale(0.52)"/>
                  <path class="bookmark-star" d="M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55-4.76-4.64 6.58-.96z" transform="translate(10.5 11) scale(0.52)"/>
                </svg>
              </button>
              <button class="maximize-btn" type="button" aria-label="Maximize Poll Card" title="Maximize Poll Card">
                <svg class="maximize-icon" viewBox="-2 -2 28 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4.97 0.02 c-0.4 0.04-0.58 0.06-0.75 0.09-2.07 0.43-3.68 2.04-4.11 4.11-0.11 0.54-0.11 0.5-0.11 4.59 l0.01 3.79 0.16-0.12 c0.54-0.41 1.32-0.75 1.91-0.83 0.15-0.02 0.28-0.04 0.29-0.04 0.02-0.01 0.03-0.68 0.03-3.26 0-3.41 0-3.43 0.09-3.78 0.29-1.1 1.19-1.92 2.33-2.12 0.24-0.04 14.12-0.04 14.36 0 1.17 0.21 2.08 1.06 2.34 2.19 0.02 0.08 0.04 0.19 0.06 0.25 0.02 0.11 0.03 13.88 0.01 14.16-0.01 0.16-0.07 0.4-0.14 0.61-0.34 0.97-1.13 1.67-2.16 1.9-0.15 0.03-0.45 0.04-3.05 0.05 l-2.89 0.01-0.01 0.47 c-0.02 0.75-0.11 1.19-0.39 1.84 l-0.04 0.08 3.19-0.01 c3.5-0.01 3.29 0 3.86-0.14 1.99-0.47 3.56-2.11 3.95-4.11 0.09-0.47 0.09-0.23 0.09-7.72 0-7.51 0-7.29-0.09-7.76-0.4-2.04-2-3.68-4.05-4.14-0.55-0.12-0.01-0.11-7.73-0.12-3.9 0-7.12 0-7.16 0z M14.01 4.42 c-0.44 0.09-0.82 0.43-0.93 0.87-0.05 0.17-0.04 0.52 0.02 0.68 0.1 0.31 0.3 0.54 0.59 0.69 0.24 0.13 0.29 0.13 1.25 0.13 0.47 0 0.86 0.01 0.86 0.02 0 0.02-0.12 0.15-0.69 0.78-0.2 0.22-0.45 0.5-0.56 0.62-0.11 0.13-0.24 0.27-0.28 0.31-0.04 0.05-0.17 0.19-0.29 0.32-0.12 0.13-0.22 0.24-0.22 0.25-0.01 0.01-0.09 0.1-0.19 0.21-0.1 0.11-0.23 0.25-0.28 0.31-0.06 0.06-0.22 0.24-0.37 0.41-0.15 0.17-0.28 0.31-0.29 0.32-0.58 0.63-0.67 0.77-0.72 1.08-0.15 0.97 0.84 1.7 1.72 1.27 0.2-0.1 0.36-0.25 0.86-0.83 0.11-0.13 0.28-0.32 0.38-0.42 0.09-0.1 0.31-0.34 0.48-0.53 0.26-0.29 0.77-0.86 0.85-0.94 0.01-0.01 0.11-0.12 0.21-0.24 0.11-0.12 0.2-0.22 0.2-0.23 0.01-0.01 0.08-0.09 0.16-0.18 0.08-0.09 0.16-0.18 0.18-0.2 0.02-0.02 0.14-0.16 0.28-0.31 l0.25-0.28 0.01 1.23 c0.01 1.19 0.01 1.23 0.06 1.35 0.08 0.21 0.14 0.31 0.3 0.46 0.57 0.57 1.53 0.43 1.9-0.29 0.15-0.29 0.14-0.15 0.14-3.14 0-2.62 0-2.7-0.04-2.86-0.11-0.41-0.39-0.71-0.8-0.85-0.14-0.05-0.16-0.05-1.4-0.06-0.95 0-1.26 0-1.26 0.02 0 0.02-0.01 0.02-0.03 0-0.03-0.03-2.21-0.03-2.35 0z M2.46 12.97 c-1.01 0.12-1.91 0.76-2.38 1.69 l-0.09 0.17 0.01 2.21 c0.01 2.31 0.01 2.31 0.1 2.76 0.33 1.55 1.34 2.88 2.75 3.61 0.15 0.07 0.31 0.16 0.37 0.18 0.54 0.22 0.91 0.32 1.46 0.38 0.43 0.05 6.58 0.05 6.63-0.01 0.31-0.38 0.55-0.95 0.63-1.47 0.03-0.25 0.03-6.68-0.01-6.92-0.21-1.36-1.32-2.43-2.69-2.59-0.37-0.04-6.42-0.04-6.78 0z"/></svg>
                <svg class="minimize-icon" viewBox="-2 -2 28 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" hidden><path fill="currentColor" d="M4.97 0.02 c-0.4 0.04-0.58 0.06-0.75 0.09-2.07 0.43-3.68 2.04-4.11 4.11-0.11 0.54-0.11 0.5-0.11 4.59 l0.01 3.79 0.16-0.12 c0.54-0.41 1.32-0.75 1.91-0.83 0.15-0.02 0.28-0.04 0.29-0.04 0.02-0.01 0.03-0.68 0.03-3.26 0-3.41 0-3.43 0.09-3.78 0.29-1.1 1.19-1.92 2.33-2.12 0.24-0.04 14.12-0.04 14.36 0 1.17 0.21 2.08 1.06 2.34 2.19 0.02 0.08 0.04 0.19 0.06 0.25 0.02 0.11 0.03 13.88 0.01 14.16-0.01 0.16-0.07 0.4-0.14 0.61-0.34 0.97-1.13 1.67-2.16 1.9-0.15 0.03-0.45 0.04-3.05 0.05 l-2.89 0.01-0.01 0.47 c-0.02 0.75-0.11 1.19-0.39 1.84 l-0.04 0.08 3.19-0.01 c3.5-0.01 3.29 0 3.86-0.14 1.99-0.47 3.56-2.11 3.95-4.11 0.09-0.47 0.09-0.23 0.09-7.72 0-7.51 0-7.29-0.09-7.76-0.4-2.04-2-3.68-4.05-4.14-0.55-0.12-0.01-0.11-7.73-0.12-3.9 0-7.12 0-7.16 0z M2.46 12.97 c-1.01 0.12-1.91 0.76-2.38 1.69 l-0.09 0.17 0.01 2.21 c0.01 2.31 0.01 2.31 0.1 2.76 0.33 1.55 1.34 2.88 2.75 3.61 0.15 0.07 0.31 0.16 0.37 0.18 0.54 0.22 0.91 0.32 1.46 0.38 0.43 0.05 6.58 0.05 6.63-0.01 0.31-0.38 0.55-0.95 0.63-1.47 0.03-0.25 0.03-6.68-0.01-6.92-0.21-1.36-1.32-2.43-2.69-2.59-0.37-0.04-6.42-0.04-6.78 0z"/><path fill="currentColor" d="M14.01 4.42 c-0.44 0.09-0.82 0.43-0.93 0.87-0.05 0.17-0.04 0.52 0.02 0.68 0.1 0.31 0.3 0.54 0.59 0.69 0.24 0.13 0.29 0.13 1.25 0.13 0.47 0 0.86 0.01 0.86 0.02 0 0.02-0.12 0.15-0.69 0.78-0.2 0.22-0.45 0.5-0.56 0.62-0.11 0.13-0.24 0.27-0.28 0.31-0.04 0.05-0.17 0.19-0.29 0.32-0.12 0.13-0.22 0.24-0.22 0.25-0.01 0.01-0.09 0.1-0.19 0.21-0.1 0.11-0.23 0.25-0.28 0.31-0.06 0.06-0.22 0.24-0.37 0.41-0.15 0.17-0.28 0.31-0.29 0.32-0.58 0.63-0.67 0.77-0.72 1.08-0.15 0.97 0.84 1.7 1.72 1.27 0.2-0.1 0.36-0.25 0.86-0.83 0.11-0.13 0.28-0.32 0.38-0.42 0.09-0.1 0.31-0.34 0.48-0.53 0.26-0.29 0.77-0.86 0.85-0.94 0.01-0.01 0.11-0.12 0.21-0.24 0.11-0.12 0.2-0.22 0.2-0.23 0.01-0.01 0.08-0.09 0.16-0.18 0.08-0.09 0.16-0.18 0.18-0.2 0.02-0.02 0.14-0.16 0.28-0.31 l0.25-0.28 0.01 1.23 c0.01 1.19 0.01 1.23 0.06 1.35 0.08 0.21 0.14 0.31 0.3 0.46 0.57 0.57 1.53 0.43 1.9-0.29 0.15-0.29 0.14-0.15 0.14-3.14 0-2.62 0-2.7-0.04-2.86-0.11-0.41-0.39-0.71-0.8-0.85-0.14-0.05-0.16-0.05-1.4-0.06-0.95 0-1.26 0-1.26 0.02 0 0.02-0.01 0.02-0.03 0-0.03-0.03-2.21-0.03-2.35 0z " transform="rotate(180 15.83 8.74)"/></svg>
              </button>
            </div>
            <p class="subtitle"></p>
          </div>

          <div class="bar-scroll-wrap results-scroll-wrap">
            <div class="bar-scroll-inner">
            <button class="arrow-row arrow-row-up" type="button" aria-label="Scroll up">
              <svg viewBox="0 0 256 128" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M184.49 167.51a12 12 0 0 1 0 17l-48 48a12 12 0 0 1-17 0l-48-48a12 12 0 0 1 17-17L128 207l39.51-39.52a12 12 0 0 1 16.98.03m-96-79L128 49l39.51 39.52a12 12 0 0 0 17-17l-48-48a12 12 0 0 0-17 0l-48 48a12 12 0 0 0 17 17Z"/></svg>
            </button>
            <ul class="results-list"></ul>
            <button class="arrow-row arrow-row-down" type="button" aria-label="Scroll down">
              <svg viewBox="0 128 256 128" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M184.49 167.51a12 12 0 0 1 0 17l-48 48a12 12 0 0 1-17 0l-48-48a12 12 0 0 1 17-17L128 207l39.51-39.52a12 12 0 0 1 16.98.03m-96-79L128 49l39.51 39.52a12 12 0 0 0 17-17l-48-48a12 12 0 0 0-17 0l-48 48a12 12 0 0 0 17 17Z"/></svg>
            </button>
            </div>
          </div>

          <div class="actions">
            <a class="live-link" href="#" role="button" title="Add to Live Results">
              <span class="live-bars" aria-hidden="true"><i></i><i></i><i></i></span>
              <span class="live-x" aria-hidden="true" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg></span>
              <span class="live-link-label">Live Results</span>
            </a>
            <p class="poll-closed-message" hidden></p>
            <!-- 012 FR-042: takes the same slot as the closed message, and takes
                 precedence over it while the poll is being edited. -->
            <p class="poll-editing-message" hidden></p>
            <!-- 012 FR-057: shown when this viewer may not vote — banned, not invited,
                 or the poll is full. Results stay readable; only the controls go. -->
            <p class="poll-blocked-message" hidden></p>
            <p class="poll-vote-notice" hidden></p>
            <!-- 008 FR-007: .btn-vote-sizer carries the OTHER button's label so
                 this one resolves to the same width at every card size. Three
                 things it depends on: the sizer text must stay identical to
                 .submit-vote-btn's label below; the visible label needs its own
                 span (a bare text node becomes an anonymous grid item that
                 site.css's .vote-btn child rule can't stack); and aria-hidden
                 keeps the button from announcing "Vote Submit vote". -->
            <button class="btn-primary btn-vote vote-btn" type="button"><span class="btn-vote-label">Vote</span><span class="btn-vote-sizer" aria-hidden="true">Submit vote</span></button>
          </div>
          <!-- FIX022: the vote count and, on the personal tabs, why the poll is
               listed (FIX020) sit under the action row. -->
          <div class="card-foot">
            <!-- FIX023: the count on the left and "you voted" on the right of one
                 line; any other reason the poll is listed on its own line, right. -->
            <div class="card-foot-row">
              <p class="poll-totals"></p>
              <p class="poll-voted" hidden></p>
            </div>
            <p class="poll-listed-because" hidden></p>
          </div>
        </div>

        <!-- BACK — Vote-mode -->
        <div class="card-face card-back">
          <div class="question-wrap">
            <div class="question-row">
              <p class="question"></p>
              <button class="maximize-btn" type="button" aria-label="Maximize Poll Card" title="Maximize Poll Card">
                <svg class="maximize-icon" viewBox="-2 -2 28 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4.97 0.02 c-0.4 0.04-0.58 0.06-0.75 0.09-2.07 0.43-3.68 2.04-4.11 4.11-0.11 0.54-0.11 0.5-0.11 4.59 l0.01 3.79 0.16-0.12 c0.54-0.41 1.32-0.75 1.91-0.83 0.15-0.02 0.28-0.04 0.29-0.04 0.02-0.01 0.03-0.68 0.03-3.26 0-3.41 0-3.43 0.09-3.78 0.29-1.1 1.19-1.92 2.33-2.12 0.24-0.04 14.12-0.04 14.36 0 1.17 0.21 2.08 1.06 2.34 2.19 0.02 0.08 0.04 0.19 0.06 0.25 0.02 0.11 0.03 13.88 0.01 14.16-0.01 0.16-0.07 0.4-0.14 0.61-0.34 0.97-1.13 1.67-2.16 1.9-0.15 0.03-0.45 0.04-3.05 0.05 l-2.89 0.01-0.01 0.47 c-0.02 0.75-0.11 1.19-0.39 1.84 l-0.04 0.08 3.19-0.01 c3.5-0.01 3.29 0 3.86-0.14 1.99-0.47 3.56-2.11 3.95-4.11 0.09-0.47 0.09-0.23 0.09-7.72 0-7.51 0-7.29-0.09-7.76-0.4-2.04-2-3.68-4.05-4.14-0.55-0.12-0.01-0.11-7.73-0.12-3.9 0-7.12 0-7.16 0z M14.01 4.42 c-0.44 0.09-0.82 0.43-0.93 0.87-0.05 0.17-0.04 0.52 0.02 0.68 0.1 0.31 0.3 0.54 0.59 0.69 0.24 0.13 0.29 0.13 1.25 0.13 0.47 0 0.86 0.01 0.86 0.02 0 0.02-0.12 0.15-0.69 0.78-0.2 0.22-0.45 0.5-0.56 0.62-0.11 0.13-0.24 0.27-0.28 0.31-0.04 0.05-0.17 0.19-0.29 0.32-0.12 0.13-0.22 0.24-0.22 0.25-0.01 0.01-0.09 0.1-0.19 0.21-0.1 0.11-0.23 0.25-0.28 0.31-0.06 0.06-0.22 0.24-0.37 0.41-0.15 0.17-0.28 0.31-0.29 0.32-0.58 0.63-0.67 0.77-0.72 1.08-0.15 0.97 0.84 1.7 1.72 1.27 0.2-0.1 0.36-0.25 0.86-0.83 0.11-0.13 0.28-0.32 0.38-0.42 0.09-0.1 0.31-0.34 0.48-0.53 0.26-0.29 0.77-0.86 0.85-0.94 0.01-0.01 0.11-0.12 0.21-0.24 0.11-0.12 0.2-0.22 0.2-0.23 0.01-0.01 0.08-0.09 0.16-0.18 0.08-0.09 0.16-0.18 0.18-0.2 0.02-0.02 0.14-0.16 0.28-0.31 l0.25-0.28 0.01 1.23 c0.01 1.19 0.01 1.23 0.06 1.35 0.08 0.21 0.14 0.31 0.3 0.46 0.57 0.57 1.53 0.43 1.9-0.29 0.15-0.29 0.14-0.15 0.14-3.14 0-2.62 0-2.7-0.04-2.86-0.11-0.41-0.39-0.71-0.8-0.85-0.14-0.05-0.16-0.05-1.4-0.06-0.95 0-1.26 0-1.26 0.02 0 0.02-0.01 0.02-0.03 0-0.03-0.03-2.21-0.03-2.35 0z M2.46 12.97 c-1.01 0.12-1.91 0.76-2.38 1.69 l-0.09 0.17 0.01 2.21 c0.01 2.31 0.01 2.31 0.1 2.76 0.33 1.55 1.34 2.88 2.75 3.61 0.15 0.07 0.31 0.16 0.37 0.18 0.54 0.22 0.91 0.32 1.46 0.38 0.43 0.05 6.58 0.05 6.63-0.01 0.31-0.38 0.55-0.95 0.63-1.47 0.03-0.25 0.03-6.68-0.01-6.92-0.21-1.36-1.32-2.43-2.69-2.59-0.37-0.04-6.42-0.04-6.78 0z"/></svg>
                <svg class="minimize-icon" viewBox="-2 -2 28 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" hidden><path fill="currentColor" d="M4.97 0.02 c-0.4 0.04-0.58 0.06-0.75 0.09-2.07 0.43-3.68 2.04-4.11 4.11-0.11 0.54-0.11 0.5-0.11 4.59 l0.01 3.79 0.16-0.12 c0.54-0.41 1.32-0.75 1.91-0.83 0.15-0.02 0.28-0.04 0.29-0.04 0.02-0.01 0.03-0.68 0.03-3.26 0-3.41 0-3.43 0.09-3.78 0.29-1.1 1.19-1.92 2.33-2.12 0.24-0.04 14.12-0.04 14.36 0 1.17 0.21 2.08 1.06 2.34 2.19 0.02 0.08 0.04 0.19 0.06 0.25 0.02 0.11 0.03 13.88 0.01 14.16-0.01 0.16-0.07 0.4-0.14 0.61-0.34 0.97-1.13 1.67-2.16 1.9-0.15 0.03-0.45 0.04-3.05 0.05 l-2.89 0.01-0.01 0.47 c-0.02 0.75-0.11 1.19-0.39 1.84 l-0.04 0.08 3.19-0.01 c3.5-0.01 3.29 0 3.86-0.14 1.99-0.47 3.56-2.11 3.95-4.11 0.09-0.47 0.09-0.23 0.09-7.72 0-7.51 0-7.29-0.09-7.76-0.4-2.04-2-3.68-4.05-4.14-0.55-0.12-0.01-0.11-7.73-0.12-3.9 0-7.12 0-7.16 0z M2.46 12.97 c-1.01 0.12-1.91 0.76-2.38 1.69 l-0.09 0.17 0.01 2.21 c0.01 2.31 0.01 2.31 0.1 2.76 0.33 1.55 1.34 2.88 2.75 3.61 0.15 0.07 0.31 0.16 0.37 0.18 0.54 0.22 0.91 0.32 1.46 0.38 0.43 0.05 6.58 0.05 6.63-0.01 0.31-0.38 0.55-0.95 0.63-1.47 0.03-0.25 0.03-6.68-0.01-6.92-0.21-1.36-1.32-2.43-2.69-2.59-0.37-0.04-6.42-0.04-6.78 0z"/><path fill="currentColor" d="M14.01 4.42 c-0.44 0.09-0.82 0.43-0.93 0.87-0.05 0.17-0.04 0.52 0.02 0.68 0.1 0.31 0.3 0.54 0.59 0.69 0.24 0.13 0.29 0.13 1.25 0.13 0.47 0 0.86 0.01 0.86 0.02 0 0.02-0.12 0.15-0.69 0.78-0.2 0.22-0.45 0.5-0.56 0.62-0.11 0.13-0.24 0.27-0.28 0.31-0.04 0.05-0.17 0.19-0.29 0.32-0.12 0.13-0.22 0.24-0.22 0.25-0.01 0.01-0.09 0.1-0.19 0.21-0.1 0.11-0.23 0.25-0.28 0.31-0.06 0.06-0.22 0.24-0.37 0.41-0.15 0.17-0.28 0.31-0.29 0.32-0.58 0.63-0.67 0.77-0.72 1.08-0.15 0.97 0.84 1.7 1.72 1.27 0.2-0.1 0.36-0.25 0.86-0.83 0.11-0.13 0.28-0.32 0.38-0.42 0.09-0.1 0.31-0.34 0.48-0.53 0.26-0.29 0.77-0.86 0.85-0.94 0.01-0.01 0.11-0.12 0.21-0.24 0.11-0.12 0.2-0.22 0.2-0.23 0.01-0.01 0.08-0.09 0.16-0.18 0.08-0.09 0.16-0.18 0.18-0.2 0.02-0.02 0.14-0.16 0.28-0.31 l0.25-0.28 0.01 1.23 c0.01 1.19 0.01 1.23 0.06 1.35 0.08 0.21 0.14 0.31 0.3 0.46 0.57 0.57 1.53 0.43 1.9-0.29 0.15-0.29 0.14-0.15 0.14-3.14 0-2.62 0-2.7-0.04-2.86-0.11-0.41-0.39-0.71-0.8-0.85-0.14-0.05-0.16-0.05-1.4-0.06-0.95 0-1.26 0-1.26 0.02 0 0.02-0.01 0.02-0.03 0-0.03-0.03-2.21-0.03-2.35 0z " transform="rotate(180 15.83 8.74)"/></svg>
              </button>
            </div>
            <p class="subtitle"></p>
          </div>

          <div class="bar-scroll-wrap voting-scroll-wrap">
            <div class="bar-scroll-inner">
            <button class="arrow-row arrow-row-up" type="button" aria-label="Scroll up">
              <svg viewBox="0 0 256 128" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M184.49 167.51a12 12 0 0 1 0 17l-48 48a12 12 0 0 1-17 0l-48-48a12 12 0 0 1 17-17L128 207l39.51-39.52a12 12 0 0 1 16.98.03m-96-79L128 49l39.51 39.52a12 12 0 0 0 17-17l-48-48a12 12 0 0 0-17 0l-48 48a12 12 0 0 0 17 17Z"/></svg>
            </button>
            <ul class="voting-list"></ul>
            <button class="arrow-row arrow-row-down" type="button" aria-label="Scroll down">
              <svg viewBox="0 128 256 128" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M184.49 167.51a12 12 0 0 1 0 17l-48 48a12 12 0 0 1-17 0l-48-48a12 12 0 0 1 17-17L128 207l39.51-39.52a12 12 0 0 1 16.98.03m-96-79L128 49l39.51 39.52a12 12 0 0 0 17-17l-48-48a12 12 0 0 0-17 0l-48 48a12 12 0 0 0 17 17Z"/></svg>
            </button>
            </div>
          </div>

          <p class="poll-closed-message poll-closed-message--back" hidden></p>
          <!-- 012 FR-058: a refused vote says why, on the face the voter is on. -->
          <p class="poll-vote-error" hidden></p>

          <div class="actions">
            <button class="icon-btn back-btn" type="button" aria-label="Back to results without voting">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 12H5"/>
                <path d="M11 18l-6-6 6-6"/>
              </svg>
            </button>
            <!-- 008 FR-007: this label is the width both buttons size to. If it
                 changes, update .btn-vote-sizer on the front face to match. -->
            <button class="btn-primary btn-vote submit-vote-btn" type="button" disabled>Submit vote</button>
          </div>
          <!-- 008 FR-004 / FIX022: the same count as the front, in the same place
               (under the action row), so the two faces keep equal height and the
               choices and results regions line up (FR-001). -->
          <div class="card-foot">
            <p class="poll-totals"></p>
          </div>

        </div>

      </div>
    </div>
  `;

window.PollCard = {
  /** Mounts a live, votable poll card for `pid` into `container`. */
  mount(container, pid, opts){
    container.insertAdjacentHTML('beforeend', POLL_CARD_TEMPLATE);
    const viewport = container.lastElementChild;
    const instance = initPollCard(viewport, Object.assign({ pid: pid }, opts));
    if (instance) pollCardInstances.push(instance);
    return instance;
  }
};

let cardResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(cardResizeTimer);
  cardResizeTimer = setTimeout(renderCard, 100);
});
