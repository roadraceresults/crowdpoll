# Feature Specification: Zero-Vote / Low-Fill Result Text Legibility

> **Superseded by 021-MAXIMIZED-POLL-CARD.** Choosing each label's and percentage's ink from the
> measured share of fill and track beneath it is no longer needed: 021 draws every bar's text in
> one dark shade of its own fill that reads over both, and splits Yes/No text at the fill's edge.
> See `specs/021-MAXIMIZED-POLL-CARD/contracts/ui-contracts.md` (C5).

**Feature Branch**: `010-ZERO-VOTE-TEXT-LEGIBILITY`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "Start a new spec for 010-ZERO-VOTE-TEXT-LEGIBILITY using ./designDocs/010-high-level-requirements-ZERO-VOTE-TEXT-LEGIBILITY.md"

Source: `designDocs/010-high-level-requirements-ZERO-VOTE-TEXT-LEGIBILITY.md` (bug found during manual
verification of `009-POLL-CHOICE-COLORS`, screenshot `designDocs/colorsTextBug02.jpg`).

## Clarifications

### Session 2026-08-19

- Q: Should this feature fix only the reported 0%-votes case, or the broader case where
  the percentage figure sits on the track at any fill level below roughly 90-95%? → A:
  Full range — fix wherever the percentage figure sits on the track, not just at 0%.
- Q: How should ink be chosen, given it can no longer be one fill-color-derived decision
  per row? → A: Per-element geometry — compute each of the label's and the percentage
  figure's ink independently, from whichever background (fill or track) that specific
  element actually renders over.
- Q: When a label or percentage figure's rendered position straddles both the fill and
  the track, which background decides its ink? → A: Majority coverage — whichever
  background covers more of the element's rendered width wins; the existing halo
  continues to bridge legibility on the minority side, exactly as it already does today.
- Q: How should each element's fill/track coverage be determined, given this re-runs on
  every live poll refresh across every visible card? → A: Algebraically, from layout
  values already known at render time (row width, padding, fill %, an estimated text
  width) — no DOM reads of already-rendered elements, so the live-refresh path adds no
  forced layout reflow.
- Q: `/speckit-plan` Phase 0 research found that `applyTruncation` (called on every live
  refresh already, by both render paths) already forces exactly the layout reflow the
  answer above was chosen to avoid, reading real row width and label width for
  truncation. Does that change how coverage should be computed? → A: Yes — reuse those
  real measurements (extend the same already-forced reflow to also read the percentage
  figure's width) instead of estimating text width algebraically. No *new* reflow is
  added beyond what `applyTruncation` already costs today, and real measured widths are
  more accurate than an estimate. This supersedes the "estimated text width" detail in
  the answer above; the "no *new* reflow" intent is unchanged.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Result text is legible on a poll nobody has voted on yet (Priority: P1)

A viewer opens a freshly created poll — every choice is at 0%, so every result bar's
colored fill is not visible at all (0px wide); the label and percentage sit entirely on
the bar's neutral background. Today, some choices read clearly (bold dark text) while
others read as pale, washed-out text on the same card, depending on which color the
choice happened to be assigned — an implementation detail invisible to the viewer. Every
choice's text must be legible, not just the ones lucky enough to land on a color that
happens to work by coincidence.

**Why this priority**: This is the reported defect and the worst case of the underlying
issue — with 0% fill, 100% of the label and percentage sit on the track, so it's where
the illegibility is most visible.

**Independent Test**: Create a poll with choices spanning both outcomes of today's rule
(e.g. `Yes`/`No`/`Maybe`/`Undecided`, where `Yes`/`No` currently read fine and
`Maybe`/`Undecided` don't), leave it at 0 votes, and confirm every label and every "0%"
figure meets the same legibility standard.

**Acceptance Scenarios**:

1. **Given** a poll with 0 votes and choices whose assigned colors span both of today's
   ink outcomes, **When** results are displayed, **Then** every label and every
   percentage figure is legible against the bar's neutral background, regardless of
   which color the choice was assigned.
2. **Given** a poll with 0 votes and only non-semantic (palette) colors assigned,
   **When** results are displayed, **Then** every label/percentage pair is legible.
3. **Given** a poll that later receives its first vote, **When** a bar transitions from
   0% to a non-zero percentage, **Then** its text remains legible throughout the
   transition, with no flash of illegible text at either end.

---

### User Story 2 - The percentage figure stays legible for as long as it sits on the unfilled track (Priority: P2)

`.result-fill` grows from the row's left edge, but `.result-pct` (the percentage
figure) is anchored to the row's *right* edge (`src/public/pollCard.js`, `right:
10px`) — so for the large majority of non-100% percentages, the percentage figure sits
on the unfilled track regardless of vote count, not just at 0%. (The label, anchored to
the *left* edge where the fill also starts, is covered by fill much sooner — often by
the time a bar reaches a modest double-digit percentage — so its illegibility window is
much narrower and closer to the originally-reported "0 votes" case.) **Resolved
2026-08-19 (see Clarifications)**: this feature's scope covers the general case — the
percentage figure must stay legible at any fill level where it sits on the track, not
only at 0%.

**Why this priority**: Secondary to User Story 1 because it wasn't the reported symptom,
but it is the same defect at a wider scope, and is explicitly in scope per the
Clarifications decision below rather than being left as the unfixed remainder.

**Independent Test**: Vote a poll's leading choice to a low-to-mid percentage (e.g. 20%)
where a "dark bucket" color is assigned, and confirm the percentage figure at the row's
right edge remains legible even though it sits on the track, not the fill.

**Acceptance Scenarios**:

1. **Given** a choice at a non-zero percentage low enough that its percentage figure
   still sits on the unfilled track, **When** results are displayed, **Then** the
   percentage figure is legible.
2. **Given** a choice at a percentage where the fill boundary passes directly under a
   label or percentage element (part of it over fill, part over track), **When** results
   are displayed, **Then** its ink is chosen by whichever background covers the majority
   of that element, and the text remains legible on both sides of the boundary.

---

### Edge Cases

- **All choices tied at 0%** (the reported case): every bar's fill is 0px; both label
  and percentage sit entirely on the track.
- **A choice at 100%**: the fill covers the entire row; today's ink rule already applies
  correctly since no track is visible at all.
- **The boundary itself**: where a bar's fill edge passes directly under a label or
  percentage element, so part of it sits on fill and part on track. Resolved by FR-003a:
  the element's ink is decided by whichever background covers the majority of its
  rendered width, with the existing halo (see `textStyleFor`) carrying legibility on the
  minority side. This is separate from 009-POLL-CHOICE-COLORS's trailing edge and halo
  (FR-012/FR-012a), which make the boundary *line itself* visible — this feature is only
  about which ink the text uses on either side of it.
- **Compact rows** (`RESULTS_COMPACT_THRESHOLD`, many choices in a small card): labels
  and percentages are hidden entirely (`display:none`) below the compact threshold, so
  this defect cannot occur there — out of scope by construction.
- **Narrow cards / long labels**: how much of a label or percentage actually overlaps
  fill vs. track at a given percentage depends on the row's pixel width and the text's
  rendered width, not on the percentage value alone — a percentage-only threshold is an
  approximation of the real, per-element, pixel-level answer.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST choose label and percentage ink (color plus any halo/shadow)
  based on the background actually visible beneath that text, not solely on the choice's
  assigned bar color, for every combination of assigned color and vote percentage.
- **FR-002**: At 0% fill, the system MUST select ink using the row's neutral (unfilled
  track) background, for every one of the 52 assignable colors (50 palette entries plus
  the two 009-POLL-CHOICE-COLORS semantic colors), not just the subset that already
  happens to read correctly today.
- **FR-003**: The system MUST choose the label's ink and the percentage figure's ink
  **independently** of each other, each based on which background (fill or track) that
  specific element's rendered position actually falls under — not one ink pair per row
  chosen from the row's fill color. **Resolved 2026-08-19 (see Clarifications)**: this
  is a per-element geometry decision, not a row-level percentage cutoff, since a cutoff
  cannot correctly solve User Story 2's general case (actual fill/track coverage depends
  on row width and text length, not on percentage alone).
- **FR-003a**: When an element's rendered position overlaps both the fill and the track,
  the system MUST decide its ink by **majority coverage** — whichever background covers
  more of that element's rendered width. The existing halo (see `textStyleFor`) MUST
  continue to carry legibility on the minority-coverage side, exactly as it already does
  today for text crossing the fill/track boundary; this feature does not add a second,
  split-color rendering within a single label or percentage element.
- **FR-003b**: Each element's fill/track coverage MUST be computed without adding a *new*
  forced layout reflow beyond what the render path already costs today. **Resolved
  2026-08-19, revised during `/speckit-plan` Phase 0 research (see Clarifications)**:
  `applyTruncation` already forces a layout reflow on every live refresh (reading real
  row width and label width for truncation), so the coverage calculation MUST reuse
  those real, already-measured values — extending the same pass to also read the
  percentage figure's rendered width — rather than introducing a separate algebraic
  text-width estimate. This is a stronger fulfillment of the original intent (no added
  reflow cost) than a from-scratch estimate would have been, and is more accurate.
  **"No new forced reflow" is SC-005's measurable form**: SC-005's "no perceptible added
  lag" is a subjective description of the user-facing consequence, not independently
  testable on its own — FR-003b (verified by grep-diffing `getBoundingClientRect`/
  `scrollWidth` call sites before and after, per quickstart.md Q7) is the concrete,
  binary check that stands in for it. There is no separate timing/latency measurement.
- **FR-004**: The system MUST NOT change the ink of any label/percentage whose text
  already sits fully on the fill at a legible contrast today (this feature must not
  regress the cases that already work).
- **FR-005**: The fix MUST apply uniformly across all 52 assignable colors as one general
  rule, not as a per-color exception (consistent with the precedent set by
  009-POLL-CHOICE-COLORS FR-011a).
- **FR-006**: The live in-place update path (`renderPollResults`'s reorder branch, see
  009-POLL-CHOICE-COLORS research.md R1) MUST apply the same ink rule as the full
  rebuild path, so a bar's text does not become illegible only after a live vote change.
- **FR-007**: This feature MUST NOT change the fill or track colors themselves, the
  009-POLL-CHOICE-COLORS trailing-edge boundary rule, or which colors are classified as
  semantic vs. palette — only how ink is chosen for the text drawn over them.
- **FR-008**: This feature applies only to the results (front) face of the poll card;
  the back (voting) face is unaffected, matching the scope boundary already established
  by 009-POLL-CHOICE-COLORS FR-013.

### Key Entities

- **Result Bar Text**: The label and percentage figure drawn on a single result row.
  Each has its own rendered position (label at the row's left edge, percentage at the
  row's right edge) and therefore may sit on a different actual background (fill vs.
  track) than the other, at the same vote percentage.
- **Visible Background**: Whichever of the bar's fill color or the row's track color
  (`--track`, `#DDE1D6`) is actually beneath a given piece of text, determined by that
  text's rendered position relative to the fill's current width — as distinct from the
  choice's *assigned* bar color, which is what today's ink rule incorrectly uses as a
  stand-in for it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a poll with 0 votes, 100% of result bar labels and percentage figures
  meet at least 4.5:1 contrast against their actual visible background, across all 52
  assignable colors — up from the current state where roughly half (the "dark bucket"
  colors) fail this at 0%.
- **SC-002**: No result bar that was legible before this change becomes illegible after
  it, across a representative sweep of percentages (0%, 1%, 20%, 50%, 80%, 99%, 100%)
  for all 52 colors.
- **SC-003**: A viewer can read every choice's label and percentage on a freshly created,
  unvoted poll without having to guess or squint at any one of them, regardless of which
  colors the choices happened to be assigned.
- **SC-004**: Percentage figures remain legible for the full range of fill levels at
  which they sit on the track, not only at 0%.
- **SC-005**: Poll cards continue to refresh at the same responsiveness as before this
  feature — no perceptible added lag from live percentage updates, including on the poll
  grid with many cards visible and refreshing at once. **Measured via FR-003b**: this
  criterion's operational, testable definition is "no new forced layout reflow beyond
  what `applyTruncation` already costs today" — a binary code-level check (no new
  `getBoundingClientRect`/`scrollWidth` call site), not a timing measurement, since a
  reflow that isn't there can't add perceptible lag.

## Assumptions

- **Verification follows the 008/009 precedent**: this is a presentation-only defect, so
  it is expected to be validated primarily by a manual quickstart walkthrough plus a
  computed-contrast script (as 009-POLL-CHOICE-COLORS Q1-Q11 and its contrast
  verification snippet did), not by new unit/browser test infrastructure.
- **No stored data changes**: like 009, this is display-only — no new poll or choice
  attributes, no author-facing controls.
- **The palette and semantic colors themselves are out of scope**: this feature changes
  *how ink is chosen*, not which fill colors exist or what they mean.
- **The 0-vote case is the mandatory minimum bar**: regardless of how User Story 2 is
  scoped, User Story 1 (0 votes) must be fully fixed — it is the reported defect.
- **Coverage is computed from real measured widths, not an estimate** (revised from the
  original FR-003b resolution — see Clarifications): since `applyTruncation` already
  measures real row and label width on every refresh, extending it to also measure the
  percentage figure gives exact widths at no added reflow cost, so there is no
  estimation-error case to reason about at the boundary; the halo (FR-003a) remains as
  the legibility margin for the minority-coverage side regardless.

## Out of Scope

- Any change to the palette, the two semantic colors, or which trigger words route to
  them (009-POLL-CHOICE-COLORS territory).
- Any change to the trailing-edge fill-boundary rule (FR-012/FR-012a from 009).
- The back (voting) face of the poll card.
- Non-poll-card UI (admin pages, exports, poll grid).
