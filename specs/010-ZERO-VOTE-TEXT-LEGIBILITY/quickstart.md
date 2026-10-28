# Quickstart: Zero-Vote / Low-Fill Result Text Legibility

Validation guide for `010-ZERO-VOTE-TEXT-LEGIBILITY`. Per spec.md's Assumptions
(following the 008/009 precedent), behavior is **manually verified** — automated
coverage only guards that the shipped asset carries the required constants.

> **Scenario Q9 is mandatory and must not be skipped.** It is the only check that can
> catch an in-place-update path that silently diverges from a fresh page load (FR-006)
> — the same defect *shape* as 009-POLL-CHOICE-COLORS's research.md R1, just for this
> feature's ink logic instead of its color assignment. It is invisible on page load and
> only appears after a live vote change moves a row across the fill/track majority
> boundary without a reload.

## Prerequisites

- `npm install`
- Local dev server: `npm run dev` (or `devScripts/launch-dev.ps1` on Windows).
- An admin account (address listed in `APP_ADMINS`) to author polls via `/admin/poll`.
- A second browser profile or private window, to change vote counts on a poll while
  keeping the first tab open on the results view (needed for Q3).

## Test polls

Create these once via `/admin/poll` and reuse them.

| Poll | Choices |
|---|---|
| **A** | `Yes`, `No`, `Maybe`, `Undecided` — mixes a "light bucket" semantic pair with "dark bucket" palette entries |
| **B** | `5K`, `10K`, `Half marathon`, `Marathon` — all palette, no semantic colors |
| **C** | `Only Option`, `Never Chosen` — for the 100% case. A poll must have at least `MIN_CHOICES` (2) choices (`src/polls/service.ts`; enforced by `replaceChoices()` and documented in `specs/006-poll-choices-editor/contracts/api-endpoints.md`), so this uses two and puts every vote on the first, leaving the second at 0% |

## Reading label/percentage ink and position

Open devtools console on the poll grid and paste this once per page load (console state
resets on navigation/reload).

```js
function inkCheck(card = document.querySelector('.card-viewport')) {
  const toHex = (rgb) => {
    const m = rgb.match(/\d+/g);
    return m ? '#' + m.slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join('').toUpperCase() : rgb;
  };
  console.table([...card.querySelectorAll('.result-row')].map((row, i) => {
    const rowRect = row.getBoundingClientRect();
    const fillRect = row.querySelector('.result-fill').getBoundingClientRect();
    const label = row.querySelector('.result-label');
    const pct = row.querySelector('.result-pct');
    const span = (el) => el ? `${Math.round(el.getBoundingClientRect().left - rowRect.left)}-${Math.round(el.getBoundingClientRect().right - rowRect.left)}` : '(hidden)';
    return {
      pos: i + 1,
      label: label?.textContent ?? '(hidden)',
      pct: pct?.textContent ?? '',
      fillEdge: Math.round(fillRect.right - rowRect.left),
      labelSpan: span(label),
      pctSpan: span(pct),
      labelInk: label ? toHex(getComputedStyle(label).color) : '',
      pctInk: pct ? toHex(getComputedStyle(pct).color) : '',
    };
  }));
}
inkCheck(document.querySelectorAll('.card-viewport')[6])
```

`fillEdge` is the x-position (px from the row's left edge) where fill ends and track
begins. Compare it against `labelSpan`/`pctSpan` to confirm which background each
element is majority-over, and whether the reported ink matches: majority-fill → ink
derived from the row's assigned color; majority-track → dark ink `#1A1A1A` (track
luminance 0.7408 clears the 0.40 threshold decisively, at 13.11:1 — see the contrast
verification section below).

---

## Q1 — Zero votes: every element reads track ink *(FR-002, SC-001, SC-003, C2)*

Open **Poll A** with 0 votes cast, run `inkCheck()`.

**Expect**: every row's `fillEdge` is `0` (0% fill everywhere). `labelInk` and `pctInk`
are `#1A1A1A` for **all four** choices — `Yes`/`No` (which already read fine before this
feature) **and** `Maybe`/`Undecided` (which were the reported defect — previously pale
white-on-track text).

**Fails if**: `Maybe` or `Undecided`'s ink is `#FFFFFF` — majority-coverage ink isn't
wired in, or is still reading the row's assigned color regardless of coverage.

**Also covers Acceptance Scenario 1.2** (a poll with *only* non-semantic colors, at 0
votes): open **Poll B** with 0 votes cast, run `inkCheck()`. **Expect**: `labelInk` and
`pctInk` are `#1A1A1A` for all four choices (`5K`/`10K`/`Half marathon`/`Marathon`),
none of which are semantic — confirms the fix isn't riding on the two semantic colors
happening to already read fine.

## Q2 — Ink still varies by element, not just by row *(FR-001, FR-003, C1)*

On **Poll B**, vote so one choice sits around 40-60%. Run `inkCheck()`.

**Expect**: for the leading choice, compare `labelSpan` against `fillEdge` — if the
label's span ends before `fillEdge`, `labelInk` reflects the row's assigned fill color
(matches pre-010 behavior); compare `pctSpan` against `fillEdge` the same way for
`pctInk`. At a mid percentage, it's common for the label to be majority-fill while the
percentage figure is still majority-track — confirm `labelInk` and `pctInk` can differ
from each other on the same row.

## Q3 — The percentage figure's independent boundary *(FR-003, SC-004, C3)*

On **Poll B**, vote the leading choice to roughly 20-30% (low enough that `pctSpan`
should sit entirely past `fillEdge`, since `.result-pct` is anchored to the row's right
edge). Run `inkCheck()`.

**Expect**: `pctInk` is `#1A1A1A` (majority-track) even though the label itself may
already be majority-fill (covered by `labelInk` reflecting the assigned color) if the
label is short enough to sit fully within the fill at that percentage.

**Fails if**: `pctInk` still reflects the row's dark assigned color (pale/washed
against the track) at a percentage where `pctSpan` clearly starts after `fillEdge`.

**Also covers Acceptance Scenario 2.2** (the straddle/majority-coverage tie-break from
[research.md R2](./research.md), rather than just the clearly-one-side cases above):
nudge the vote count up or down by one or two votes at a time, re-running `inkCheck()`
after each change, until `fillEdge` falls *strictly between* the two numbers in
`pctSpan` (i.e. the fill boundary passes through the percentage figure itself, not just
somewhere else in the row) — a narrow poll card or a longer label makes this easier to
land on. **Expect**: `pctInk` matches whichever side has the larger overlap — if
`fillEdge` is closer to `pctSpan`'s right number than its left, majority is track and
`pctInk` is `#1A1A1A`; if closer to the left number, majority is fill and `pctInk`
matches the row's assigned color. Either way, the text stays legible — the halo carries
the minority side, matching FR-003a. Repeat once for `labelSpan` if you can find a
percentage where `fillEdge` lands inside it too (harder, since the label is short and
near the left edge, but not impossible on a wide card).

## Q4 — Live transition has no flash of illegible text *(Acceptance Scenario 1.3, C1)*

On **Poll A**, leave a tab open on the results view with `Yes`/`No` both at 0 votes.
From a second browser profile, cast the first vote for `No`. Watch the first tab through
the next live refresh (`APP_POLLING_INTERVAL`, 5s by default).

**Expect**: `No`'s ink transitions smoothly as its fill grows in — no frame where either
the label or the percentage figure is illegible mid-transition, and no flicker back to
an empty/re-animated state (this reuses the same in-place-update path 009 established;
confirm this feature didn't force a rebuild here).

## Q5 — All 52 colors are legible at 0 votes, via one uniform rule *(FR-005, SC-001, C2)*

Create a poll with as many choices as convenient spanning a mix of semantic and palette
colors (or reuse Poll A plus a few palette-only choices), leave it at 0 votes, run
`inkCheck()`.

**Expect**: every row's `labelInk`/`pctInk` is `#1A1A1A`, regardless of which of the 52
colors is assigned to that row underneath. This is what FR-005 requires — one general
rule, not 52 per-color exceptions — and it's provable in the general case by the
contrast verification script below rather than only by eye: track ink is a single,
fixed decision (`textStyleFor` is fed the constant `RESULTS_TRACK_COLOR`, not the row's
own color, so it structurally cannot vary per-color the way 009's fill-side ink does) —
but confirm visually on at least one real poll too.

## Q6 — No regression at high percentages *(FR-004, SC-002, C4)*

On **Poll C**, cast every vote for `Only Option` and none for `Never Chosen`, so the
first reaches 100% (a poll can't have only one choice — `MIN_CHOICES` is 2 — so the
second choice is what makes this a valid poll; it stays at 0% and isn't the row under
test here). Run `inkCheck()`.

**Expect**: for `Only Option`'s row, `fillEdge` equals the row's full width; both
`labelSpan` and `pctSpan` sit entirely before it; ink matches the row's assigned color
exactly as it did before this feature (unchanged from 009's established behavior).

## Q7 — No new forced reflow *(FR-003b, SC-005, C5)*

Code-inspection check, not a runtime script. Pick the command for whichever shell you
actually have open — these aren't interchangeable across shells (`Select-String` only
runs inside a real PowerShell window; it errors as an unrecognized command in `cmd.exe`,
and `grep` isn't available in either native Windows shell):

**PowerShell** (this project's primary shell — `powershell.exe` or `pwsh`, not `cmd.exe`):

```powershell
Select-String -Path src/public/pollCard.js -Pattern "getBoundingClientRect|scrollWidth"
```

**cmd.exe**:

```
findstr /N "getBoundingClientRect scrollWidth" src\public\pollCard.js
```

**Git Bash / a POSIX shell**:

```bash
grep -n "getBoundingClientRect\|scrollWidth" src/public/pollCard.js
```

**Expect**: every match is inside `applyTruncation` (plus any pre-existing call sites
unrelated to this feature, e.g. arrow-scroll logic — confirm against a pre-010 baseline
diff). No new call site for either property appears outside `applyTruncation`.

## Q8 — No collateral change *(FR-007, C6)*

Across Polls A, B, and C: confirm `.result-fill`'s own background color and width are
unchanged from pre-010 behavior, the 009-POLL-CHOICE-COLORS trailing edge
(`box-shadow` inset) is still present, bar sizing/truncation/scroll behavior is
unchanged, and the back (voting) face is untouched (flip Poll A to its back face and
confirm no `#1A1A1A` or track-ink logic applies there — it never reads
`RESULTS_TRACK_COLOR` at all).

## Q9 — In-place refresh matches a fresh page load ⚠️ MANDATORY *(FR-006, C1)*

research.md R4 argues the in-place update branch and the full-rebuild branch can't
diverge, because both call the same `applyTruncation` — but that's exactly the kind of
assumption 009-POLL-CHOICE-COLORS's R1 defect proved wrong once already for a different
code path. This scenario checks it empirically rather than trusting the argument.

1. Open **Poll A** in your admin window with `Yes` at a low percentage (e.g. vote once
   for `Yes`, none for `No`/`Maybe`/`Undecided`) so at least one row is majority-track
   on its percentage figure. Run `inkCheck()` and record each row's `labelInk`/`pctInk`.
2. **Leave that tab open and untouched on the results view.**
3. From the second browser profile, cast several more votes so the percentages shift
   enough to move at least one row's majority coverage from track to fill (or the
   reverse) — e.g. vote `Yes` repeatedly until it's comfortably past 90%.
4. Back in the first tab, wait for the live refresh (`APP_POLLING_INTERVAL`, 5s by
   default) to pick up the new percentages **without reloading the page**. Run
   `inkCheck()` again in the same tab.
5. **Separately**, open the same poll in a **new** tab (a fresh page load, forcing the
   full-rebuild path) and run `inkCheck()` there too.

**Expect**: the first tab's post-refresh `inkCheck()` output (in-place update) matches
the new tab's output (fresh rebuild) exactly — same `labelInk`/`pctInk` for every row,
for whichever rows crossed the fill/track majority boundary during step 3.

**Fails if**: the in-place tab shows different ink than the freshly-loaded tab for any
row — that would mean the in-place branch is reading stale coverage (e.g. still using
the previous refresh's `fillEdgeX`, or skipping the majority recalculation entirely),
silently reproducing the shape of 009's R1 defect for this feature's own ink logic.

---

## Automated checks

```
npm test
```

All suites must pass. The 010 additions in `tests/poll-card-assets.test.ts` assert the
served `/pollCard.js` carries the `RESULTS_TRACK_COLOR` constant.

## Contrast verification *(SC-001, SC-004)*

Unlike 009, this is a single fixed-color check, not a 52-color sweep: whenever majority
coverage resolves to `'track'`, every element — regardless of which of the 52 colors is
assigned to that choice — gets ink from the same constant, `RESULTS_TRACK_COLOR`. So
there is exactly one track-ink pairing to verify, not 52:

```bash
node -e '
const lum=h=>{const c=h.replace("#",""),v=[0,2,4].map(i=>parseInt(c.substr(i,2),16)/255).map(x=>x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4));return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2];};
const ratio=(a,b)=>{const A=lum(a),B=lum(b);return (Math.max(A,B)+0.05)/(Math.min(A,B)+0.05);};
const TRACK="#DDE1D6", THRESHOLD=0.40;
const ink = lum(TRACK) > THRESHOLD ? "#1a1a1a" : "#ffffff";
const r = ratio(TRACK, ink);
console.log("track luminance:", lum(TRACK).toFixed(4), "-> ink:", ink, "-> contrast:", r.toFixed(2)+":1");
console.log(r >= 4.5 ? "PASS: track ink >= 4.5:1 (SC-001)" : "FAIL: track ink below 4.5:1");
'
```

**Expect**:

```
track luminance: 0.7408 -> ink: #1a1a1a -> contrast: 13.11:1
PASS: track ink >= 4.5:1 (SC-001)
```

The fill-side contrast (majority-fill elements) is unchanged from 009-POLL-CHOICE-COLORS
and already covered by that feature's own contrast verification — this feature doesn't
touch fill-side ink selection, only adds the track-side path and the per-element
decision of which one applies.

Keep `TRACK`/`THRESHOLD` here in sync with `RESULTS_TRACK_COLOR` and the comparison in
`textStyleFor` in `pollCard.js`.
