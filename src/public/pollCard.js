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

let maximizeHintDismissed = false;

function dismissMaximizeHint(){
  maximizeHintDismissed = true;
  document.documentElement.classList.add('maximize-hint-dismissed');
  document.querySelectorAll('.maximize-hint').forEach((hint) => hint.remove());
}

const SEMANTIC_AFFIRMATIVE_COLOR = '#006120';
const SEMANTIC_NEGATIVE_COLOR = '#F91010';

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
const RESULTS_FONT_MAX = 13;  // label/% size at/above RESULTS_FONT_FULL_HEIGHT
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

// Single-column layout: every bar from 2 to 50 is a fixed height and the card
// grows to fit, so nothing scrolls. The stylesheet marks the layout with the
// --single-column custom property.
const SINGLE_COLUMN_BAR_HEIGHT = 30;
const SINGLE_COLUMN_GAP = 6;

function singleColumnBarLayout(){
  return { scrolling: false, barHeight: SINGLE_COLUMN_BAR_HEIGHT, gap: SINGLE_COLUMN_GAP };
}

function isSingleColumn(){
  return getComputedStyle(document.documentElement).getPropertyValue('--single-column').trim() === '1';
}

function defaultBarLayout(count, wrap){
  return isSingleColumn() ? singleColumnBarLayout() : measuredBarLayout(count, wrap);
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
function paletteOffsetFor(pid, length = RESULTS_COLOR_PALETTE.length){
  if (typeof pid !== 'string' || !pid) return 0;
  let hash = 0x811C9DC5;
  for (let i = 0; i < pid.length; i++){
    hash ^= pid.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % length;
}

// Assigns a color to every choice in one left-to-right pass over the
// display-ordered dataset, returning an array parallel to `data`.
//
// A whole-dataset pass rather than a per-index lookup because a choice's
// palette entry depends on how many EARLIER choices took one -- which an
// index alone can't tell you once some choices are colored by another
// rule. Both render paths call this with the same freshly sorted data,
// so they can never disagree about a bar's color.
function assignResultColors(data, paletteOffset, palette = RESULTS_COLOR_PALETTE){
  let paletteIndex = paletteOffset;
  return data.map(item => {
    const manual = manualColorOf(item);
    const semantic = semanticColorFor(item.label);
    if (semantic) return manual || semantic;
    // Only choices that reach here consume a palette entry.
    const automatic = palette[paletteIndex++ % palette.length];
    return manual || automatic;
  });
}

const MANUAL_COLOR = /^#[0-9A-Fa-f]{6}$/;

function manualColorOf(item){
  return typeof item.color === 'string' && MANUAL_COLOR.test(item.color) ? item.color.toUpperCase() : null;
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
const RESULTS_TRACK_TINT = 0.9;
const RESULTS_DARK_TRACK_TINT = 0.8;

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

// The text on a bar's fill, chosen by eye on a monitor and a phone: any color listed here takes its
// color; any other (a hex stored on a poll) takes white or black, whichever contrasts more.
const TEXT_ON_FILL_OVERRIDES = new Map(Object.entries({
  '#7D7D7D': '#FFFFFF',
  '#F91010': '#FFFFFF',
  '#0695F5': '#FFFFFF',
  '#399FA2': '#FFFFFF',
  '#C8468B': '#FFFFFF',
  '#FC8E45': '#FFFFFF',
  '#FF6601': '#FFFFFF',
  '#006120': '#FFFFFF',
  '#9E9E9E': '#FFFFFF',
  '#545454': '#FFFFFF',
  '#000000': '#FFFFFF',
  '#0808FD': '#FFFFFF',
  '#007A7E': '#FFFFFF',
  '#B045B0': '#FFFFFF',
  '#800080': '#FFFFFF',
  '#404040': '#FFFFFF',
  '#1A539E': '#FFFFFF',
  '#880015': '#FFFFFF',
  '#E0E0E0': '#000000',
  '#E3E335': '#000000',
  '#FFFF00': '#000000',
  '#06D400': '#000000',
  '#FF91CB': '#FFFFFF',
  '#784315': '#FFFFFF'
}));

function inkOnFillFor(fill){
  const listed = TEXT_ON_FILL_OVERRIDES.get(fill.toUpperCase());
  if (listed) return listed;
  return contrastRatio('#FFFFFF', fill) >= contrastRatio('#000000', fill) ? '#FFFFFF' : '#000000';
}

function barColorsFor(fill, trackTint, inkOnFill){
  const track = mixWithWhite(fill, trackTint);
  return { track, inkOnTrack: darkShadeOf(track), inkOnFill };
}

const BAR_COLORS = new Map([
  ...RESULTS_COLOR_PALETTE.map((hex) => [hex, barColorsFor(hex, RESULTS_TRACK_TINT, inkOnFillFor(hex))]),
  ...[SEMANTIC_AFFIRMATIVE_COLOR, SEMANTIC_NEGATIVE_COLOR].map((hex) => [hex, barColorsFor(hex, RESULTS_TRACK_TINT, inkOnFillFor(hex))])
]);

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

const LINE_TARGET_CONTRAST = 3;

function lineColorOn(hex, surfaceHex){
  if (!surfaceHex || contrastRatio(hex, surfaceHex) >= LINE_TARGET_CONTRAST) return hex;
  const [h, s, start] = hexToHsl(hex);
  const step = hexToHsl(surfaceHex)[2] < 0.5 ? 0.01 : -0.01;
  let l = start;
  let shade = hslToHex(h, s, l);
  while (contrastRatio(shade, surfaceHex) < LINE_TARGET_CONTRAST && (step > 0 ? l < 1 : l > 0)){
    l = Math.min(1, Math.max(0, Math.round((l + step) * 100) / 100));
    shade = hslToHex(h, s, l);
  }
  return shade.toUpperCase();
}

function darkBarColorsFor(fill, trackTint){
  const track = mixWith(fill, RESULTS_DARK_SURFACE, trackTint);
  return { track, inkOnTrack: lightShadeFor(track) };
}

const BAR_COLORS_DARK = new Map([
  ...RESULTS_COLOR_PALETTE.map((hex) => [hex, darkBarColorsFor(hex, RESULTS_DARK_TRACK_TINT)]),
  ...[SEMANTIC_AFFIRMATIVE_COLOR, SEMANTIC_NEGATIVE_COLOR].map((hex) => [hex, darkBarColorsFor(hex, RESULTS_DARK_TRACK_TINT)])
]);

function barColorsOf(hex){
  if (!BAR_COLORS.has(hex)) BAR_COLORS.set(hex, barColorsFor(hex, RESULTS_TRACK_TINT, inkOnFillFor(hex)));
  if (!BAR_COLORS_DARK.has(hex)) BAR_COLORS_DARK.set(hex, darkBarColorsFor(hex, RESULTS_DARK_TRACK_TINT));
  return { light: BAR_COLORS.get(hex), dark: BAR_COLORS_DARK.get(hex) };
}

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

function renderPollResults(wrap, list, upRow, downRow, data, layoutFor, paletteOffset, palette){
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
  const colors = assignResultColors(data, paletteOffset, palette);

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
      const { light: { track, inkOnTrack, inkOnFill }, dark } = barColorsOf(color);
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
  const stateMessageFront = viewport.querySelector('.card-front .poll-state-message');
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
  let layoutFor = defaultBarLayout;
  const palette = expandPalette(RESULTS_PALETTE_ENTRIES.map(e => e.hex), opts.choiceBounds && opts.choiceBounds.maxChoices);
  const paletteOffset = paletteOffsetFor(opts.pid, palette.length);
  let isMaximized = false;

  function rebuildData(selectedIds){
    data = poll.choices.map((c) => ({
      id: c.id,
      label: c.label,
      color: c.color,
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
    // On the personal tabs, why this poll is listed. "You voted" shares the count's
    // line; the other reasons take a line of their own. Your Polls says nothing: every
    // poll in it was created by the viewer.
    const reasons = opts.tab === 'your-polls' || !Array.isArray(poll.listedBecause) ? [] : poll.listedBecause;
    const votedEl = viewport.querySelector('.poll-voted');
    if (votedEl){
      const voted = reasons.indexOf('voted') !== -1;
      votedEl.textContent = voted ? 'You voted' : '';
      votedEl.hidden = !voted;
    }
    const because = viewport.querySelector('.poll-listed-because');
    if (because){
      const words = { invited: 'You were invited', linked: 'You opened the link', bookmarked: 'You are watching' };
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
    if (viewerMayNotVote()) return 'You do not have permission to vote.';
    return poll && poll.canVote === false ? (poll.voteBlockedReason || '') : '';
  }

  // The signed-in viewer's grants, from /api/me: a rendering hint, re-checked by the vote route.
  function viewerMayNotVote(){
    const me = window.Session && window.Session.getSession();
    const granted = me && Array.isArray(me.permissions) ? me.permissions : null;
    if (!granted) return false;
    return !granted.includes('Administrator') && !granted.includes('Vote on Polls');
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

  /*
    A creator follows a poll before it launches from Your Polls, so that tab says the
    poll's state (and why it was rejected). A poll that is not open for voting offers no
    vote, no Live Results and no Watch, on any tab.
  */
  var STATE_TITLES = {
    'INITIALIZED': 'Initialized',
    'EDITING': 'Editing',
    'AWAITING APPROVAL': 'Awaiting Approval',
    'REJECTED': 'Rejected',
    'ARCHIVED': 'Archived'
  };
  var NOT_VOTABLE_STATES = ['INITIALIZED', 'AWAITING APPROVAL', 'REJECTED', 'ARCHIVED'];

  function updateStateMessage(){
    const state = poll ? poll.pollState : '';
    const title = STATE_TITLES[state];
    if (stateMessageFront){
      const shown = Boolean(title) && opts.tab === 'your-polls';
      const reason = shown && state === 'REJECTED' && poll.rejectionReason ? ' — ' + poll.rejectionReason : '';
      stateMessageFront.hidden = !shown;
      stateMessageFront.textContent = shown ? title + reason : '';
    }
    if (NOT_VOTABLE_STATES.indexOf(state) === -1) return;
    if (voteBtn) voteBtn.hidden = true;
    if (submitBtn) submitBtn.hidden = true;
    if (liveLink && !removeMode) liveLink.hidden = true;
    if (bookmarkBtn) bookmarkBtn.hidden = true;
    if (cardFlip.classList.contains('is-flipped')) cardFlip.classList.remove('is-flipped');
  }

  function render(){
    if (!data) return;
    votingList?.classList.toggle('is-multi', Boolean(poll) && poll.choiceMode !== 'Single-Choice Poll');
    renderPollResults(resultsWrap, resultsList, resultsUp, resultsDown, data, layoutFor, paletteOffset, palette);
    renderVotingOptions(votingWrap, votingList, votingUp, votingDown, data, layoutFor);
    updateSubmitState();
    updateClosedState();
    updateActionButtons();
    updateStateMessage();
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
    viewport.classList.toggle('is-placeholder', Boolean(next.notPublished));
    if (next.notPublished){
      const line = next.createdByName ? 'Shared by ' + next.createdByName : 'Shared with you';
      viewport.querySelectorAll('.question').forEach((el) => { el.textContent = line; });
      viewport.querySelectorAll('.subtitle').forEach((el) => { el.textContent = ''; });
      return;
    }
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
     everywhere but the Live Results tab, Watch everywhere a tab sets showBookmark, and
     the X that removes the poll on the Live Results tab alone. Guests are sent to sign in by the first three. */
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
      bookmarkBtn.hidden = opts.showBookmark === false || poll.mayWatch === false;
      bookmarkBtn.setAttribute('aria-label', bookmarked ? 'Watching' : 'Watch');
      bookmarkBtn.title = bookmarked ? 'Stop watching this poll' : 'Watch this poll';
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
    dismissMaximizeHint();
    opts.onMaximize(opts.pid);
  }

  if (maximizeHintDismissed) viewport.querySelector('.maximize-hint')?.remove();

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
    layoutFor = on ? (count) => maximizedBarLayout(count, opts.choiceBounds) : defaultBarLayout;
    viewport.classList.toggle('maximized-card-viewport', on);
    cardFlip.classList.toggle('maximized-card-flip', on);
    const name = on ? 'Minimize Poll Card' : 'Maximize Poll Card';
    viewport.querySelectorAll('.maximize-btn').forEach((maximizeBtn) => {
      maximizeBtn.setAttribute('aria-label', name);
      maximizeBtn.title = on ? 'Minimize Poll Card' : 'Maximize Poll';
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

  /* The colours this card assigned its choices, in display order, for the
     maximized view's line graph — read from the one assignment the bars use,
     so the two can never disagree. */
  function resultColors(){
    if (!data) return [];
    const colors = assignResultColors(data, paletteOffset, palette);
    return data.map((item, i) => ({ id: item.id, label: item.label, hex: colors[i] }));
  }

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
    resultColors,
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
              <!-- The Watch control: aria-pressed chooses between the outline eye and the
                   filled one (the symbols live once in index.html). -->
              <button class="bookmark-btn" type="button" aria-pressed="false" aria-label="Watch" title="Watch this poll">
                <svg class="watch-icon watch-icon--off" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#watching-eye"/></svg>
                <svg class="watch-icon watch-icon--on" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#watching-eye-on"/></svg>
              </button>
              <button class="maximize-btn" type="button" aria-label="Maximize Poll Card" title="Maximize Poll">
                <svg class="maximize-icon" viewBox="-2 -2 28 28" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="1.125" y="1.125" width="21.75" height="21.75" rx="4.125"/><path d="M14 10L19 5M14.5 5H19V9.5M10 14L5 19M5 14.5V19H9.5"/></svg>
                <svg class="minimize-icon" viewBox="-2 -2 28 28" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" hidden><rect x="1.125" y="1.125" width="21.75" height="21.75" rx="4.125"/><path d="M19.5 4.5L14 10M18 10H14V6M4.5 19.5L10 14M6 14H10V18"/></svg>
              </button>
              <span class="maximize-hint" aria-hidden="true">Maximize Poll</span>
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
            <p class="poll-state-message" hidden></p>
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
              <button class="maximize-btn" type="button" aria-label="Maximize Poll Card" title="Maximize Poll">
                <svg class="maximize-icon" viewBox="-2 -2 28 28" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="1.125" y="1.125" width="21.75" height="21.75" rx="4.125"/><path d="M14 10L19 5M14.5 5H19V9.5M10 14L5 19M5 14.5V19H9.5"/></svg>
                <svg class="minimize-icon" viewBox="-2 -2 28 28" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" hidden><rect x="1.125" y="1.125" width="21.75" height="21.75" rx="4.125"/><path d="M19.5 4.5L14 10M18 10H14V6M4.5 19.5L10 14M6 14H10V18"/></svg>
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

window.M3Ripple?.add(
  '.card-face .btn-vote, .card-face .icon-btn, .card-face .bookmark-btn, .card-face .maximize-btn, ' +
  '.card-face .live-link, .card-face .arrow-row, .card-face .vote-row, .maximized-card-close'
);

window.PollCard = {
  /** Mounts a live, votable poll card for `pid` into `container`. */
  mount(container, pid, opts){
    container.insertAdjacentHTML('beforeend', POLL_CARD_TEMPLATE);
    const viewport = container.lastElementChild;
    const instance = initPollCard(viewport, Object.assign({ pid: pid }, opts));
    if (instance) pollCardInstances.push(instance);
    return instance;
  },
  lineColorOn: lineColorOn
};

let cardResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(cardResizeTimer);
  cardResizeTimer = setTimeout(renderCard, 100);
});
