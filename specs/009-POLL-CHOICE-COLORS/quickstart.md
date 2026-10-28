# Quickstart: Poll Choice Colors

Validation guide for `009-POLL-CHOICE-COLORS`. Per spec.md's clarification session
(2026-08-15), the color-assignment behavior is **manually verified** — automated coverage
only guards that the shipped asset carries the required constants.

> **Scenario Q3 is mandatory and must not be skipped.** It is the only check that can
> catch the in-place-update defect described in [research.md R1](./research.md). That
> defect is invisible to static inspection, never appears on page load, and inverts the
> colors of exactly the Yes/No polls this feature exists to serve. If you validate
> nothing else by hand, validate Q3.

## Prerequisites

- `npm install`
- Local dev server: `npm run dev` (or `devScripts/launch-dev.ps1` on Windows).
- An admin account (address listed in `APP_ADMINS`) to author polls via `/admin/poll`.
- A second browser profile or private window, so you can vote as a second participant
  without losing the admin session — needed for Q3.

## Test polls

Create these once via `/admin/poll` and reuse them. All public and open unless stated.

| Poll | Choices |
|---|---|
| **A** | `Yes`, `No` |
| **B** | `Yes`, `No`, `Maybe`, `Undecided` |
| **C** | `5K`, `10K`, `Half marathon`, `Marathon` |
| **D** | `I agree`, `I disagree`, `TRUE`, `false`, `Correct`, `Incorrect`, `Y`, `N`, `Yup`, `Nope`, `Yay`, `Nay` |
| **E** | `Agreement`, `Yesterday`, `November`, `Nobody`, `Disagreement`, `Agree2`, `No1`, `yes_please`, `Y or N`, `Nope, never`, `Yes and no`, `Option 1 - Yes`, `Don't agree` |
| **F** | 50 choices, none matching a trigger word (`Item 01` … `Item 50`) — the maximum a poll allows (`MAX_CHOICES`; the API rejects more with HTTP 400) |

## Reading colors

Open devtools console on the poll grid and paste this once. `colors()` prints each bar's
label and its actual rendered fill color, top to bottom.

```js
function colors(card = document.querySelector('.card-viewport')) {
  const toHex = (rgb) => {
    const m = rgb.match(/\d+/g);
    return m ? '#' + m.slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join('').toUpperCase() : rgb;
  };
  console.table([...card.querySelectorAll('.result-row')].map((row, i) => ({
    pos: i + 1,
    label: row.querySelector('.result-label')?.textContent ?? '(hidden)',
    pct: row.querySelector('.result-pct')?.textContent ?? '',
    fill: toHex(getComputedStyle(row.querySelector('.result-fill')).backgroundColor),
    ink: toHex(getComputedStyle(row.querySelector('.result-label')).color),
  })));
}
colors();
```

For a specific card when several are on screen, pass its element:
`colors(document.querySelectorAll('.card-viewport')[2])`.

Expected values throughout: affirmative `#43F781`, negative `#FC9E9E`, palette entry 1
`#3B5FCC`, entry 2 `#B84A1F`, entry 3 `#16614B`, entry 4 `#7A3FA0`.

---

## Q1 — Affirmative and negative basics *(FR-001, FR-002, SC-007, C1, C2)*

Open **Poll A**, cast a vote so both bars have a percentage, run `colors()`.

**Expect**: `Yes` → `#43F781`, `No` → `#FC9E9E`.

**Then, for SC-007**, look at the card without reading the labels — glance at it, or blur
your eyes — and confirm you can tell which bar is the affirmative one from color alone.
This is a subjective observation rather than a measurement, and it is the whole point of
the feature: if the two colors do not read as "yes" and "no" at a glance, the feature has
not delivered its value even with every other scenario passing.

## Q2 — Semantic choices do not consume palette entries *(FR-007, SC-003, C4)*

Open **Poll B**, run `colors()`.

**Expect**, in display order:

| Label | Fill |
|---|---|
| Yes | `#43F781` |
| No | `#FC9E9E` |
| Maybe | `#3B5FCC` — palette entry **1**, not entry 3 |
| Undecided | `#B84A1F` — palette entry **2** |

**Fails if**: Maybe/Undecided show `#16614B`/`#7A3FA0` (entries 3 and 4) — the palette
cursor is advancing for semantic choices.

## Q3 — Colors survive a live reorder ⚠️ MANDATORY *(FR-009, FR-010, SC-001, C5)*

This reproduces the R1 defect. It requires a **live vote change while the card stays on
screen** — reloading the page hides the bug.

1. Open **Poll A** in your admin window. Vote `Yes`. Run `colors()` and confirm row 1 is
   `Yes`/`#43F781`, row 2 is `No`/`#FC9E9E`.
2. **Leave that tab open and untouched on the poll grid.**
3. In the second browser profile, open the same poll and vote `No` — enough times that
   `No` overtakes `Yes`.
4. Back in the first tab, wait for the live refresh (`APP_POLLING_INTERVAL`, 5s by
   default). The bars will visibly swap order.
5. Run `colors()` again.

**Expect**: row 1 is now `No` → `#FC9E9E`, row 2 is `Yes` → `#43F781`. Each color followed
its label.

**Fails if**: row 1 reads `No` with fill `#43F781` and row 2 reads `Yes` with fill
`#FC9E9E` — colors stayed with the position instead of the label. That is the R1 defect:
the in-place update branch is not reapplying colors.

Also confirm the bars did **not** flicker back to empty and re-animate during the
reorder — that would mean the fix forced a full rebuild instead of updating in place.

Repeat once with **Poll B** to confirm the palette colors on `Maybe`/`Undecided`
reassign by the new order while `Yes`/`No` keep theirs.

## Q4 — Case insensitivity and exact-label rules *(FR-003, FR-005, C1, C2)*

Open **Poll D**, run `colors()`.

**Expect**: `I agree`, `TRUE`, `Correct`, `Y`, `Yup`, `Yay` → `#43F781`; `I disagree`,
`false`, `Incorrect`, `N`, `Nope`, `Nay` → `#FC9E9E`. Every bar is semantic; no palette
color appears.

Note `Correct` → green while `Incorrect` → red: whole-word matching is what keeps
`correct` inside `Incorrect` from matching.

## Q5 — Duplicate colors are allowed *(FR-006)*

Create a poll with `Yes, definitely` and `Yes, with reservations`.

**Expect**: both bars `#43F781`. Sharing a color is valid — nothing should nudge one to a
different shade.

## Q6 — Word boundaries and precedence *(FR-004, FR-002, C3)*

Open **Poll E**, run `colors()`.

**Expect**:

| Label | Fill | Why |
|---|---|---|
| `Agreement`, `Yesterday`, `November`, `Nobody`, `Disagreement` | palette | trigger word is followed by a letter, so it's not a whole word |
| `Y or N`, `Nope, never` | palette | exact rules require the whole label |
| `Agree2`, `yes_please` | `#43F781` | a digit or underscore delimits the word just like a space does (amended 2026-08-19) |
| `No1` | `#FC9E9E` | same boundary rule, negative side |
| `Yes and no` | `#43F781` | matches both lists; affirmative wins |
| `Option 1 - Yes` | `#43F781` | space and hyphen delimit normally |
| `Don't agree` | `#43F781` | apostrophe delimits |

Only 7 labels are non-semantic (`Agreement`, `Yesterday`, `November`, `Nobody`,
`Disagreement`, `Y or N`, `Nope, never`) — these must take palette entries **1, 2, 3, …
7** in display order with no gaps. `Agree2`, `No1`, and `yes_please` no longer draw from
the palette at all now that they match a semantic rule.

> `Don't agree` rendering green is the documented limitation in spec.md — negations of an
> affirmative word read as affirmative. Confirm it behaves as specified; it is not a bug.
>
> If `Agree2`, `No1`, or `yes_please` instead render a palette color, the deployed
> `pollCard.js` still has the pre-2026-08-19 `\b`-based regex (research.md R3) — rebuild
> and reload before re-testing.

## Q7 — Full choice count *(FR-008, SC-002, SC-005, C4)*

Open **Poll F** (50 non-semantic choices — the maximum), run `colors()`.

**Expect**: all 50 bars take palette entries 1–50 in display order, with no gaps and no
repeats. Every bar has a color — none transparent or unstyled. Scroll the list to confirm
the off-screen bars too.

The palette holds exactly 50 entries and a poll allows exactly 50 choices, so this poll
consumes the palette to its last entry without wrapping. Wraparound is unreachable by
design (FR-008) and is deliberately not exercised here — it cannot be, since the API
rejects a 51st choice with HTTP 400.

## Q8 — Text legibility *(FR-011, FR-011a, SC-004, C6)*

On **Poll A**, run `colors()` and read the `ink` column.

**Expect**: both bars use dark ink `#1A1A1A`.

**Fails if**: the `No` bar's ink is `#FFFFFF` — the threshold is still `0.55` and
`#FC9E9E` is being treated as a dark background, giving 2.00:1.

Then confirm no palette bar changed: on **Poll C** (no semantic labels), all four bars
must still use white ink `#FFFFFF`.

Visually check on **Poll A** that the label and percentage remain readable where the text
crosses from the colored fill onto the unfilled track.

## Q9 — The back face is untouched *(FR-013, SC-006, C7)*

On **Poll A**, click **Vote** to flip to the back face.

**Expect**: both voting rows show the ordinary neutral tone `#F1F3EE`; selecting one turns
it `#E4D3AE`. Neither `#43F781` nor `#FC9E9E` appears anywhere on the back face, even
though the front face shows both.

```js
const back = document.querySelector('.card-viewport .card-back');
console.table([...back.querySelectorAll('.vote-row')].map(r => ({
  label: r.querySelector('.vote-label')?.textContent,
  bg: getComputedStyle(r).backgroundColor,
  selected: r.classList.contains('is-selected'),
})));
```

## Q11 — Fill boundary visibility *(FR-012, FR-012a, SC-008, C9)*

The pale semantic colors sit very close to the track in luminance, so this checks that
the bar still reads as a *proportion* rather than a solid block.

On **Poll A**, vote so `Yes` sits near 30%, then near 70%. At both percentages the green
bar's fill must be clearly bounded — you can see where the fill stops and the track
begins, without squinting or relying on the label text.

Run this to confirm the boundary is present in the DOM rather than judging by eye alone:

```js
const fill = document.querySelector('.card-viewport .result-fill');
console.log('fill:', getComputedStyle(fill).backgroundColor);
console.log('edge:', getComputedStyle(fill).boxShadow);  // must be a non-'none' inset
```

**Expect**: `boxShadow` reports an inset shadow, not `none`.

**Fails if**: `boxShadow` is `none` — the trailing edge rule is missing or overridden, and
the `#43F781` bar's boundary drops to 1.06:1 against the track.

Then repeat on **Poll C** (all palette colors) to confirm the edge looks like a subtle
inner shadow on dark fills rather than a heavy border.

## Q10 — No collateral change *(C8)*

Across polls A, C, and F, confirm unchanged behavior: bar heights and gaps, label
truncation, font scaling at high choice counts, scroll arrows on **Poll F**, sort order
(highest percentage first), and the fill grow-in animation on first render.

---

## Automated checks

```
npm test
```

All suites must pass. The 009 additions in `tests/poll-card-assets.test.ts` assert the
served `/pollCard.js` carries `#43F781`, `#FC9E9E`, and the `0.40` ink threshold.

These guard against the constants being dropped or reverted. They **cannot** detect the
R1 defect, a wrong boundary regex, or an off-by-one palette cursor — which is why Q3, Q6,
and Q2 above carry the real verification weight.

## Contrast verification *(SC-004, SC-008)*

Recompute both contrast criteria across all 52 colors after any color, threshold, or edge
change. Run from the repository root:

```bash
node -e '
const src=require("fs").readFileSync("src/public/pollCard.js","utf8");
const i=src.indexOf("RESULTS_PALETTE_ENTRIES = [");
const pal=[...src.slice(i,src.indexOf("];",i)).matchAll(/hex:\s*.(#[0-9A-Fa-f]{6})./g)].map(m=>m[1]);
const all=[...pal,"#43F781","#FC9E9E"];
const TRACK="#DDE1D6", THRESHOLD=0.40, EDGE_ALPHA=0.55;
const lum=h=>{const c=h.replace("#",""),v=[0,2,4].map(i=>parseInt(c.substr(i,2),16)/255).map(x=>x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4));return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2];};
const ratio=(a,b)=>{const A=lum(a),B=lum(b);return (Math.max(A,B)+0.05)/(Math.min(A,B)+0.05);};
const over=(a,bg)=>"#"+[0,2,4].map(i=>Math.round(parseInt(bg.replace("#","").substr(i,2),16)*(1-a)).toString(16).padStart(2,"0")).join("");
const textBad=all.filter(h=>ratio(h,lum(h)>THRESHOLD?"#1a1a1a":"#ffffff")<4.5);
// A boundary is legible if the fill contrasts with the track, OR the
// trailing edge contrasts with both the fill and the track.
const boundaryBad=all.filter(h=>{
  if(ratio(h,TRACK)>=3) return false;
  const e=over(EDGE_ALPHA,h);
  return ratio(e,h)<3||ratio(e,TRACK)<3;
});
console.log(textBad.length?"FAIL text: "+textBad.join(", "):"PASS text: all "+all.length+" colors >= 4.5:1 (SC-004)");
console.log(boundaryBad.length?"FAIL boundary: "+boundaryBad.join(", "):"PASS boundary: all "+all.length+" fill boundaries legible (SC-008)");
const viaFill=all.filter(h=>ratio(h,TRACK)>=3).length;
console.log("   bounded by fill contrast: "+viaFill+"   bounded by the edge: "+(all.length-viaFill));'
```

**Expect**:

```
PASS text: all 52 colors >= 4.5:1 (SC-004)
PASS boundary: all 52 fill boundaries legible (SC-008)
   bounded by fill contrast: 50   bounded by the edge: 2
```

Keep `THRESHOLD` in sync with `textStyleFor` in `pollCard.js`, and `TRACK` / `EDGE_ALPHA`
in sync with `--track` and the `.result-fill` edge rule in `site.css`.
