# Phase 0 Research: Live Results X

Seven decisions. Each records what was chosen, why, and what was rejected. No
`[NEEDS CLARIFICATION]` items remained from the specification, so nothing here resolves an
unknown — these are the choices the implementation would otherwise make ad hoc, plus the two
places (R2, R5) where the obvious implementation is wrong.

---

## R1 — The X is a second span inside the existing anchor, not a second control

**Decision**: the card template's `.live-link` gains a sibling to `.live-bars`:

```html
<a class="live-link" href="#" role="button" title="Add to Live Results">
  <span class="live-bars" aria-hidden="true"><i></i><i></i><i></i></span>
  <span class="live-x" aria-hidden="true" hidden>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
  </span>
  <span class="live-link-label">Live Results</span>
</a>
```

`pollCard.css` sizes it in the bars' box:

```
.live-x{ display:flex; align-items:center; justify-content:center; width:14px; height:14px; }
.live-x svg{ width:14px; height:14px; display:block; }
.live-link .live-bars[hidden], .live-link .live-x[hidden]{ display:none; }
```

**Rationale**: FR-001/FR-002 want one control in two forms, in the same place with the same label.
`.live-bars` is `height:14px` and about 14.5px wide (three 3.5px bars, two 2px gaps), so a 14×14
box keeps the label within half a pixel of where it sits on every other tab and the link's 8px gap
untouched. The `hidden` attribute needs the explicit `display:none` rules because `.live-bars` and
`.live-x` are `display:flex`, exactly as `site.css:301` already does for `.live-link[hidden]`. The
two `<path>` strokes are the corner button's own drawing, so the glyph is the one the mockup shows
and nothing new is authored (spec assumption).

**Alternatives considered**: swapping the span's contents at render time — rejected: it rebuilds
DOM on every `applyPoll` and loses the `aria-hidden` wrapper. A CSS `::before` with a masked
image — rejected: a new asset and no `currentColor` inheritance on older engines. Using the
bordered `.icon-btn` — rejected by AMB-1: a 28px bordered box fills the row's height and reads as
a second button beside Vote.

---

## R2 — `removeMode` is derived once from `opts.onClose`, and drives four things

**Decision**: in `initPollCard`, `const removeMode = typeof opts.onClose === "function";`.
`updateActionButtons` then, when the link exists and is not suppressed:

| | add form (`removeMode` false) | remove form (`removeMode` true) |
|---|---|---|
| `.live-bars` | shown | `hidden` |
| `.live-x` | `hidden` | shown |
| `title` | `"Add to Live Results"` | `"Remove from Live Results"` |
| `aria-label` | absent | `"Remove from Live Results"` |
| activation | `opts.onLive(pid, poll)` | `opts.onClose(pid, poll)` |

**Rationale**: AMB-3's resolution — the form follows the handler. `tabs.js:102-111` merges a
universal `onLive` into *every* grid's options, so `onLive`'s presence cannot discriminate;
`onClose` is supplied by the Live Results grid alone. Deriving it once avoids testing
`opts.onClose` at four sites. The label element is never touched (FR-007).

**Alternatives considered**: a `liveMode: "add" | "remove"` option — rejected: renames a live
option at six call sites for one tab's benefit. Keeping `showClose` as the discriminator —
rejected: the flag's name describes a control that ceases to exist (R6).

---

## R3 — The visibility rules become form-aware in two places, not three

**Decision**: `updateClosedState` and `updateEditingState` keep their `liveLink.hidden = …` lines
but guard them with the form:

```
if (liveLink && !removeMode) liveLink.hidden = closed;     // updateClosedState
if (liveLink && !removeMode) liveLink.hidden = true;       // updateEditingState
```

`updateBlockedState` is **not** touched — it withdraws only `voteBtn` and `submitBtn`, and never
referred to the link. `updateActionButtons` keeps its `opts.showLive === false` branch for tabs
that suppress the link outright.

**Rationale**: FR-010/FR-012. In add form a closed or being-edited poll may not be added, so the
link stays hidden there; in remove form the control must survive exactly what the corner X
survived. Two guards, no new state. Order matters, the other way round: `render()`
(`pollCard.js:1016-1023`) calls `updateClosedState()` first — which itself calls
`updateBlockedState()` then `updateEditingState()` — and `updateActionButtons()` **last**. So
`updateActionButtons` must never write `liveLink.hidden` outside its existing
`opts.showLive === false` branch: running last, it would override these guards and re-show the
link for a closed or being-edited poll on every tab. It sets the icon, the tooltip and the
accessible name only; the link's visibility is owned by the state updaters and by `showLive`.

**Alternatives considered**: one combined `updateLinkVisibility()` — rejected: it would have to
re-derive closed/editing/blocked precedence that the three existing functions already own
(Principle III). Showing the link in remove form by re-showing it after the state updaters —
rejected: a later `applyPoll` would flip it back.

---

## R4 — One keydown handler on the link, both forms, Enter and Space

**Decision**: beside the existing click handler:

```
liveLink?.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
  event.preventDefault();
  activateLiveLink();
});
```

where `activateLiveLink()` is the body the click handler already runs (guest check, then
`onClose` or `onLive`), extracted so click and keydown cannot drift.

**Rationale**: FR-014. `role="button"` promises button activation; an anchor gives Enter natively
but not Space, and Space on an anchor scrolls the page. `preventDefault` covers both the scroll
and the `href="#"` navigation. Handling Enter in the handler as well as natively is harmless — the
click handler already calls `preventDefault`, and a keydown-then-click double fire cannot occur
because the keydown prevents the default that would synthesise the click.

**Alternatives considered**: `keyup` for Space (the native button timing) — rejected: `keydown`
must preventDefault anyway to stop the scroll, so splitting the two keys across two events buys
nothing. Converting the link to a `<button>` in remove form — rejected by AMB-1/R1: two elements
to keep visually identical.

---

## R5 — Focus after a removal is placed by the tab, from the index it already knows

**Decision**: `liveResults.js` captures the removed poll's position **before** applying the
server's answer, then after `render(state)`:

```
const next = state.order[index] ?? state.order[index - 1] ?? null;
if (next) focus the .live-link of that card;
else focus the panel's .tab-empty line (tabIndex = -1 set on it first).
```

The card's link is reached through the grid's mounted card element (`card.element`), which
`createGrid` already keeps in its `mounted` map; the tab module asks the grid for it rather than
querying the DOM by poll id.

**Rationale**: FR-015 and the clarification — the card that now occupies the vacated position,
else the previous card, else the empty-state line. The index must be taken before the state is
replaced, because `DeltaClient.apply` rewrites `state.order` in place. `.tab-empty` is a `<p>`, so
it needs `tabIndex = -1` to accept focus; that is one attribute, set when the line is shown.
Focus placement belongs to the tab, not the card: only the tab knows the order and owns the empty
line.

**Alternatives considered**: focusing from inside the card's `onClose` — rejected: the card is
being destroyed, and it does not know its neighbours. Always focusing the first card — rejected by
the clarification (option B). Leaving focus alone — rejected: that is the defect UNS-7 raised.

---

## R6 — The corner button is deleted with its options and its stylesheet rules

**Decision**: remove from `pollCard.js` the `.card-close-btn` markup (button + SVG), the
`closeBtn` lookup, its click handler and the `showClose` line in `updateActionButtons`; remove
from `site.css` the two rules and the FIX025 comment above them. `opts.onClose` survives as the
remove handler (R2). `liveResults.js`'s grid options become
`{ showVote: true, onClose: removePoll, tab: TAB }`.

**Rationale**: FR-003 and UNS-5 — the control is moved, not duplicated, and a hidden button in
every card on every tab is a maintenance cost with no caller. With the button gone the Bookmark
star's own `margin:-4px -4px 0 0` (`site.css:749`) puts it back exactly where every other tab has
it (FR-004).

**Alternatives considered**: keeping the button hidden behind `showClose` — rejected above. Keeping
`showClose: false` as a no-op option — rejected: an option nothing reads.

---

## R7 — Tests follow the control; three assertions change and two are added

**Decision**: in `tests/client-home.test.ts`, the Live Results describe:

- `closeOf(title)` becomes `linkOf(title)` — `card.querySelector(".live-link")`;
- the Trending assertion changes from "no visible `.card-close-btn`" to "the link shows
  `.live-bars` and its title is `Add to Live Results`", plus a new assertion that no
  `.card-close-btn` exists anywhere in the document;
- the Live Results assertions become: `.live-x` visible, `.live-bars` hidden, `aria-label` is
  `Remove from Live Results`; the click still sends the `DELETE`, drops the card, keeps the tab
  active, and leaves the registry with the other poll;
- **new**: a poll that closes while watched still shows the link and can be removed (US2);
- **new**: keyboard — dispatch `keydown` with `key: " "` on the link, assert the `DELETE` went and
  that `document.activeElement` is the next card's link; with the last card, that it is the
  `.tab-empty` line (US3, FR-015).

`tests/poll-card-assets.test.ts` is checked for assertions naming the close button's markup or the
icon symbol list and updated if any exist.

**Rationale**: constitution IV — each FR has a check that fails before the change; SC-006 is only
meaningful if the replaced assertions are rewritten rather than deleted. jsdom reports
`document.activeElement`, so the focus rule is testable there; only geometry needs the quickstart.

**Alternatives considered**: keeping the corner-X assertions as "must not exist" and writing a new
describe for the link — rejected: one flow, one place; the existing describe already builds the
two-poll fixture the new assertions need.
