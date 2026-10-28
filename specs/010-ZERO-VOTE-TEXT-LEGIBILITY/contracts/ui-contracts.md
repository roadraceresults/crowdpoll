# Phase 1 UI Contract: Zero-Vote / Low-Fill Result Text Legibility

**Feature**: `010-ZERO-VOTE-TEXT-LEGIBILITY` | **Date**: 2026-08-19 | **Plan**: [../plan.md](../plan.md)

This feature exposes no HTTP surface — `postman/openapi.json` is unchanged. Its contract
is the rendering behavior of the poll card's results (front) face. Each contract below
is observable in a browser and is exercised by a numbered scenario in
[../quickstart.md](../quickstart.md).

---

## C1 — Ink is chosen per element, not per row

A result row's label and its percentage figure MAY show different ink from each other,
even though both belong to the same choice and the same assigned bar color.

**Matches**: whichever background — the choice's assigned fill color, or the track
(`RESULTS_TRACK_COLOR`, `#DDE1D6`) — covers the majority of that specific element's
rendered width.

**Satisfies**: FR-001, FR-003 · **Scenario**: Q1, Q2, Q4

---

## C2 — Zero-vote rows are fully legible

At 0% votes, every label and every percentage figure across all 52 assignable colors
uses track-based ink (majority coverage is 100% track when fill is 0px wide), not the
fill-derived ink that some colors would otherwise get.

**Satisfies**: FR-002 · **Scenario**: Q1, Q5 (sweep across colors)

---

## C3 — The percentage figure tracks its own boundary, independent of the label

Because `.result-pct` is anchored to the row's right edge while `.result-fill` grows
from the left, the percentage figure's majority background can differ from the label's
at the same percentage — commonly, the label is majority-fill while the percentage
figure is still majority-track, for low-to-mid percentages.

**Satisfies**: FR-003, SC-004 · **Scenario**: Q3

---

## C4 — No regression above the boundary

A bar whose label and percentage figure are already majority-fill today (broadly,
percentages approaching 100%, and always at exactly 100%) continues to use fill-derived
ink, identical to pre-010 behavior.

**Satisfies**: FR-004, SC-002 · **Scenario**: Q6

---

## C5 — No new forced reflow

The coverage computation adds exactly one new `scrollWidth` read (the percentage
figure) inside `applyTruncation`'s existing per-row pass. No new call site anywhere else
in `pollCard.js` reads `getBoundingClientRect`, `scrollWidth`, or any other
layout-forcing property.

**Satisfies**: FR-003b, SC-005 · **Scenario**: Q7 (verified by code inspection, not a
runtime check — see quickstart.md)

---

## C6 — The halo, not a new visual element, carries the boundary crossing

No new DOM element, class, or CSS rule is introduced for text that straddles the
fill/track boundary. The existing `textStyleFor` halo continues to be what keeps a
majority-decided ink legible on the minority side of that same element.

**Satisfies**: FR-003a, FR-007 · **Scenario**: Q3, Q8 (back-face / trailing-edge
non-regression)

---

## C7 — The in-place update path never diverges from a fresh load

A poll card whose ink is updated via the live in-place refresh path shows exactly the
same label/percentage ink as the same poll state would show on a fresh page load (full
rebuild). Both paths call `applyTruncation`, so the majority-coverage computation runs
identically regardless of which one rendered the row.

**Satisfies**: FR-006 · **Scenario**: Q9 ⚠️ MANDATORY — the only check that can catch
this path silently diverging, the same defect shape as
009-POLL-CHOICE-COLORS's research.md R1
