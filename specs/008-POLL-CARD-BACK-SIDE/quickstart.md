# Quickstart: Poll Card Back Side Parity

This is the validation guide for the pixel-parity criteria SC-001…SC-006, which
spec.md VM-001 designates as **manually verified**. The automated half (VM-002)
runs with `npm test`.

## Prerequisites

- `npm install`
- Local dev server running: `npm run dev` (or `devScripts/launch-dev.ps1` on
  Windows).
- An admin account (address listed in `APP_ADMINS`) to author polls via
  `/admin/poll`.
- Test polls, created once and reused throughout:
  - **Poll A** — 7 choices, public, open. The headline case from the bug report.
  - **Poll B** — 2 choices, public, open. Short-list case.
  - **Poll C** — 50 choices, public, open. Scrolling case.
  - **Poll D** — invitation-only, at least 2 invitees, only some having voted.
  - **Poll E** — any poll, then set **Poll State** → **Closed**.
  - **Poll F** — a very long question (enough to wrap to 3+ lines at 360px) and
    at least one very long choice label.

## Measuring technique

Every measurement below uses browser devtools. Open the console on the poll grid
and use the card under test:

```js
// Paste once; `m()` prints the geometry of both faces of the first card.
function m(card = document.querySelector('.card-viewport')) {
  const r = (sel) => { const e = card.querySelector(sel); return e ? e.getBoundingClientRect() : null; };
  const face = (name, wrap, actions) => {
    const w = r(wrap), a = r(actions), f = r(`.${name}`);
    return { region_top: w.top, region_bottom: w.bottom, region_height: w.height,
             footer_top: a.top, gap_below_footer: f.bottom - a.bottom };
  };
  console.table({
    front: face('card-front', '.results-scroll-wrap', '.card-front .actions'),
    back:  face('card-back',  '.voting-scroll-wrap',  '.card-back .actions'),
  });
  console.table({
    vote:   r('.vote-btn')?.width,
    submit: r('.submit-vote-btn')?.width,
  });
}
m();
```

Flipping is not required to measure: both faces are always laid out (they are
grid-stacked siblings), so `getBoundingClientRect()` is valid for both at once.

To flip a card without clicking, use `document.querySelector('.vote-btn').click()`
and `document.querySelector('.back-btn').click()`.

Viewport widths to test, per SC-001: **360px, 480px, 768px, 1024px, 1440px**
(devtools responsive mode).

---

## V1 — Choices fill the voting side (US1 / FR-001, FR-002, FR-003 / SC-001, SC-002, SC-003)

1. Load `/` and locate **Poll A** (7 choices).
2. Run `m()`. Confirm `front.region_top === back.region_top`,
   `front.region_bottom === back.region_bottom`, and
   `front.region_height === back.region_height`, each within 1px (**SC-001**).
3. Flip the card. Count the choice rows visible without scrolling and compare
   with the results bars on the front. They must match, and for Poll A all 7
   must be visible on both sides with no scrolling (**SC-002** — this is the
   regression from the bug report, where the back showed 3).
4. Confirm there is no empty band between the bottom of the choice list and the
   footer: `back.footer_top - back.region_bottom` must equal
   `front.footer_top - front.region_bottom` (both are the shared 16px margin)
   (**SC-003**).
5. Repeat steps 2–4 at each viewport width in the list above (**SC-001**,
   FR-010).

## V2 — Participation count on the voting side (US2 / FR-004, FR-005 / SC-004)

1. On **Poll A**, note the front's participation text. Flip the card and confirm
   the back reads character-for-character the same, in the same position (last
   line of the header, under the question and subtitle) and the same grey
   typography (**SC-004**).
2. Verify singular and plural: with exactly 1 vote both sides read
   "1 participant voted"; with 5 votes both read "5 participants voted".
   A quick check for both nodes at once:
   ```js
   [...document.querySelectorAll('.card-viewport .poll-totals')].map(e => e.textContent)
   // → both strings must be identical
   ```
3. On **Poll D** (invitation-only, partially voted), confirm both sides include
   the same "· N not yet voted" clause.
4. Leave the card open and cast a vote from a second browser/incognito window.
   Within one polling interval, confirm **both** copies update to the new value
   in the same refresh — never one before the other (**FR-005**).
5. Confirm a poll with no votes reads "0 participants voted" on both sides.

## V3 — Matching footers and equal buttons (US3 / FR-006, FR-006a, FR-007 / SC-005)

> Per research.md R2, FR-006/FR-006a are expected to need **no code change** —
> both faces already derive footer geometry from identical rules. This step
> verifies that rather than assuming it. If a real delta appears here, report it
> before writing CSS for it.

1. On **Poll A**, run `m()`. Confirm `front.footer_top === back.footer_top` and
   `front.gap_below_footer === back.gap_below_footer`, within 1px (**SC-005**).
2. In the same output, confirm the `vote` and `submit` widths differ by no more
   than 1px (**SC-005**, FR-007).
3. Repeat steps 1–2 at **all five widths** (360px, 480px, 768px, 1024px,
   1440px), matching § V1's sweep. Confirm at each that the widths still match
   and that neither button's label wraps or is clipped. 360px is the important
   one — it is where the old `min-width:25%` floor stopped covering
   "Submit vote" (**FR-010**).
4. Confirm the **Vote** label is still visually centred in its button. The
   button is now a single-cell grid rather than a flex box, so centring comes
   from `justify-content`/`align-content` instead of the flex rules; an
   off-centre or top-aligned label means the grid override landed wrong.
5. Verify the two cascade requirements the grid override depends on
   (`contracts/ui-contracts.md` § C2.3):
   ```js
   getComputedStyle(document.querySelector('.vote-btn')).display  // → "grid"
   ```
   and on **Poll E** (closed), confirm the Vote button is *fully* hidden —
   `.vote-btn[hidden]` must still beat `.vote-btn{display:grid}`:
   ```js
   getComputedStyle(document.querySelector('.vote-btn')).display  // → "none"
   ```
6. Repeat steps 1–2 on **Poll E** (closed), confirming footer parity holds in
   the closed state too and that the results-side closed message sits on one
   line without changing the footer's height (**FR-006a**).

## V4 — Closed-poll message styling (US4 / FR-008 / SC-006)

1. Load **Poll E** (closed). Compare the computed styles of the closed message
   and the participation count on each face:
   ```js
   const pick = (e) => { const s = getComputedStyle(e);
     return { color: s.color, family: s.fontFamily, weight: s.fontWeight, size: s.fontSize }; };
   const card = document.querySelector('.card-viewport');
   console.table({
     totals_front: pick(card.querySelector('.card-front .poll-totals')),
     msg_front:    pick(card.querySelector('.card-front .poll-closed-message')),
     totals_back:  pick(card.querySelector('.card-back .poll-totals')),
     msg_back:     pick(card.querySelector('.poll-closed-message--back')),
   });
   ```
   All four rows must show the same colour, font family, weight, and size
   (**SC-006**).
2. Confirm the wording is unchanged from `007-closed-state`: "Poll closed on
   `<date>`" on the results side, "This Poll closed on `<date>`" on the voting
   side.
3. Confirm the existing closed-poll behaviour is intact: no Vote button, no
   Live Results link, no choices or Submit vote on the voting side, and the back
   arrow still flips the card back.
4. Confirm the voting-side message fills the shared region (same top and bottom
   edges as the results bars opposite it) without moving the footer.

## V5 — Edge cases (spec.md § Edge Cases)

| Case | Poll | Expected |
|---|---|---|
| Short list stays top-anchored | **B** (2 choices) | Both regions span the full shared extent; the 2 choices sit at the top of the region, not centred — matching the results side |
| Both sides scroll together | **C** (50 choices) | Both sides scroll, both show the same number of rows before scrolling, and the up/down arrow rows appear on both under the same conditions |
| Long labels | **F** | Truncation behaviour on the voting side is unchanged, and region height does not vary with label length |
| Long question wraps | **F** at 360px | Both headers grow equally; both regions shrink equally and still match (**SC-001**) |
| Reduced motion | any | Set `prefers-reduced-motion: reduce` in devtools rendering panel; parity is unaffected |

## V6 — No regressions (FR-009 / SC-007)

1. Run the full suite:
   ```
   npm test
   ```
   All existing suites must pass, and the new `tests/poll-card-assets.test.ts`
   must pass (**SC-007**, VM-002).
2. Manually exercise the interaction surface listed in
   `contracts/ui-contracts.md` § C4 on **Poll A** and **Poll C**: flip both ways,
   select and deselect choices (single- and multi-choice polls), confirm Submit
   stays disabled until something is selected, submit a vote and confirm the
   card returns to the results side with the new totals, use the scroll arrows
   (click and press-and-hold) and drag-to-scroll on both faces, and confirm the
   card's outer size is unchanged from before the feature.

## Done when

- V1–V5 pass at every listed viewport width.
- V6 passes with a green `npm test`.
- Any measurement that fails is reported with the `m()` output for the failing
  width, rather than worked around.
