# UI Contracts: Poll Closed State Display

This feature changes no HTTP API surface (`postman/openapi.json` is unchanged — research.md
R1). The contract below is the internal DOM/markup contract `pollCard.js` and its manual
validation (quickstart.md) are written against.

## Poll card closed-state contract

Two new, initially-`hidden` elements are added to `POLL_CARD_TEMPLATE` (`pollCard.js`), one
per face:

```html
<!-- FRONT — inside .card-front .actions, alongside the existing .live-link/.vote-btn -->
<p class="poll-closed-message" hidden></p>

<!-- BACK — inside .card-back, as a sibling to .voting-scroll-wrap (not inside .actions,
     since .back-btn there must stay usable per FR-007) -->
<p class="poll-closed-message poll-closed-message--back" hidden></p>
```

`updateClosedState()` (research.md R2), called at the end of `render()` in `initPollCard()`,
is the sole writer of these elements' `hidden` state and text content, driven by
`poll.pollState`:

- **`poll.pollState !== "CLOSED-POLL-STATE"`** (open, pending, or no poll loaded yet):
  - Front: `.live-link` and `.vote-btn` visible (`hidden` removed); `.poll-closed-message`
    stays `hidden`.
  - Back: `.voting-scroll-wrap` and `.submit-vote-btn` visible; `.poll-closed-message--back`
    stays `hidden`.
- **`poll.pollState === "CLOSED-POLL-STATE"`**:
  - Front: `.live-link` and `.vote-btn` get `hidden`; `.poll-closed-message`'s `hidden` is
    removed and its text set to `"Poll closed on " + formatClosedDate(poll.endAt)` (FR-001/002).
  - Back: `.voting-scroll-wrap` and `.submit-vote-btn` get `hidden`; `.poll-closed-message--back`'s
    `hidden` is removed and its text set to `"This Poll closed on " + formatClosedDate(poll.endAt)`
    (FR-004/005/006).
  - `.back-btn` is untouched in both states — always visible, always usable (FR-007).

`formatClosedDate(isoString)` = `new Date(isoString).toLocaleDateString()` (research.md R4,
spec.md FR-003) — a small new helper in `pollCard.js`, not exported, used only by
`updateClosedState()`.

## Vote-rejection reaction contract (FR-009)

`submitBtn`'s click handler's failure path (non-`ok` response or thrown error) changes from
directly calling `updateSubmitState()` to calling `fetchPoll()` — which re-fetches, then
calls `render()` (and therefore `updateClosedState()`) itself. No separate "was this
rejection specifically because the poll closed?" check is added; the re-fetched
`poll.pollState` is authoritative and drives the same closed-state rendering described above.
If the poll is not actually closed (a different rejection reason), `render()`'s existing
`updateSubmitState()` call re-enables the button exactly as it does today — unchanged
behavior for every rejection reason outside this feature's scope.
