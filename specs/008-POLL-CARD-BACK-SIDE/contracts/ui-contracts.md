# UI Contracts: Poll Card Back Side Parity

This feature changes no HTTP API surface — `postman/openapi.json` is unchanged
(data-model.md). The contract below is the internal DOM/CSS contract that
`pollCard.js`, `site.css`, and the manual validation in `quickstart.md` are
written against. It extends, and does not replace, the closed-state contract in
`specs/007-closed-state/contracts/ui-contracts.md`.

---

## C1 — Markup additions to `POLL_CARD_TEMPLATE`

Two elements are added to `POLL_CARD_TEMPLATE` in `pollCard.js`. Everything else
in the template is unchanged.

### C1.1 — Participation count on the voting side (FR-004)

The back face's `.question-wrap` gains a third child, in the same DOM position
and with the same class as the front face's:

```html
<!-- BACK — .card-back > .question-wrap, last child, mirroring .card-front -->
<div class="question-wrap">
  <p class="question"></p>
  <p class="subtitle"></p>
  <p class="poll-totals"></p>   <!-- ADDED -->
</div>
```

Contract:

- The class is exactly `poll-totals`, with no face-scoped modifier, so it
  inherits the single existing `.poll-totals` rule (`site.css:213`) and needs no
  new CSS.
- It is a plain duplicate: no `aria-hidden`, no `aria-live`, no `role` — matching
  the already-duplicated `.question` and `.subtitle` (spec.md Clarifications).
- It carries no `hidden` attribute and is never toggled; it is present in every
  state, including when the poll is closed.

### C1.2 — Width sizer on the Vote button (FR-007)

The front face's primary button gains a wrapped label and a visually-hidden
sizer span, stacked in one grid cell (§C2.3):

```html
<!-- FRONT — .card-front .actions -->
<button class="btn-primary btn-vote vote-btn" type="button"><span
        class="btn-vote-label">Vote</span><span
        class="btn-vote-sizer" aria-hidden="true">Submit vote</span></button>
```

Contract:

- The visible label MUST be wrapped in `.btn-vote-label`. A bare text node
  becomes an *anonymous* grid item that `.vote-btn > *` cannot target, so it
  would auto-place into a second row instead of stacking behind the sizer.
- The sizer's text MUST equal the `.submit-vote-btn` label verbatim. If that
  label changes, this string changes with it (research.md R7 — stated
  limitation; a comment at both sites records this).
- `aria-hidden="true"` is required: without it the button announces
  "Vote Submit vote".
- Both spans are inside the button, so they contribute to its intrinsic width —
  as a **maximum**, not a sum, which is what §C2.3's grid override buys.
- The `.submit-vote-btn` markup is unchanged apart from the cross-reference
  comment (§C3 note): it needs no sizer and no wrapper, being the longer label
  already, and it stays a flex button.

---

## C2 — CSS contract (`site.css`)

`pollCard.css` is NOT modified (research.md R3). All three changes below land in
`site.css`.

### C2.1 — `[hidden]` override for the closed messages (FR-001, FR-002)

The existing override list at `site.css:228-230` is extended:

```css
.live-link[hidden],
.vote-btn[hidden],
.submit-vote-btn[hidden],
.poll-closed-message[hidden]{ display:none; }   /* ADDED — covers both variants */
```

Contract:

- `.poll-closed-message[hidden]` matches both the front element and the back
  element (which carries both `.poll-closed-message` and
  `.poll-closed-message--back`), so one selector suffices.
- The existing explanatory comment above this rule is extended to name the
  closed-message elements, since it is the block that documents this cascade
  hazard.
- **Invariant this establishes**: on an open poll, `.card-back` has exactly one
  in-flow `flex-grow:1` child — `.voting-scroll-wrap` — matching `.card-front`,
  whose only such child is `.results-scroll-wrap`.

### C2.2 — Closed-message typography (FR-008, FR-006a)

Both variants adopt the `.poll-totals` treatment:

```css
.poll-closed-message{
  /* CHANGED: colour/family/weight/size now match .poll-totals (FR-008);
     letter-spacing DROPPED — .poll-totals does not set it */
  color:var(--muted);
  font-family:'Inter', sans-serif;
  font-weight:500;
  font-size:clamp(11px, 1vw, 12.5px);
  line-height:1.4;
  height:28px;          /* UNCHANGED — keeps the footer height fixed (FR-006a) */
  display:flex;
  align-items:center;
}

.poll-closed-message--back{
  /* box behaviour UNCHANGED: flex:1 1 auto; min-height:0; margin:0 0 16px;
     display:flex; align-items:center; justify-content:center; text-align:center */
  /* CHANGED: all four typography declarations (font-size, font-weight, color
     and the now-redundant font-family) removed — inherited from the base rule */
}
```

Contract:

- `height:28px` on the base rule MUST be retained. It is what keeps the
  results-side footer at a constant height between the open and closed states
  (FR-006a) and what guarantees the single-line rendering that requirement asks
  for.
- The four typography properties SC-006 checks (computed colour, font family,
  weight, size) MUST resolve identically to `.poll-totals` on both faces. Reusing
  the same `clamp()` expression rather than a fixed px value is what keeps them
  equal across viewport widths.
- `letter-spacing:0.01em` MUST be dropped from the base rule. It was inherited
  from `.live-link-label`, which the front message replaces, but `.poll-totals`
  does not set it — leaving it in would make the two typographically different
  while still technically passing SC-006's four enumerated properties.
  (Added after `/speckit-analyze` finding F4.)
- The back variant MUST end up with **no** typography declarations of its own,
  so there is exactly one place to change the closed-message treatment.
  (Its redundant `font-family` is removed alongside the rest — finding F5.)
- The back variant's flex/margin/centring declarations are unchanged, so it
  continues to fill the shared region when a poll is closed.

### C2.3 — Button sizer rules (FR-007)

```css
/* Single-cell grid so the column resolves to max(label, sizer), not their sum. */
.vote-btn{ display:grid; justify-content:center; align-content:center; }
.vote-btn > *{ grid-area:1 / 1; }
.btn-vote-sizer{ visibility:hidden; height:0; overflow:hidden; }
```

Contract:

- The grid override is scoped to **`.vote-btn`**, NOT the shared `.btn-vote`.
  `.submit-vote-btn` must remain a flex button, untouched (Principle III); both
  still resolve to the same width because the back button already sizes to
  "Submit vote" naturally.
- `display:grid` here is what makes the technique work at all. `.btn-primary`
  sets `display:flex`, and a row flex container's max-content width is the
  **sum** of its items — a sizer laid out beside the label would make the button
  roughly twice as wide as intended (research.md R7).
- `justify-content:center; align-content:center` replace the centring that
  `.btn-primary`'s flex rules were providing.
- The sizer contributes width, not height (`height:0`), and paints nothing.
- **Cascade requirements** (both already hold, do not change them):
  - `site.css` must remain the last stylesheet loaded (`index.html:15-17`) so
    `.vote-btn{display:grid}` beats `.btn-primary{display:flex}` at equal
    specificity.
  - `.vote-btn[hidden]{display:none}` (§C2.1, specificity `0,2,0`) must keep
    winning over `.vote-btn{display:grid}` (`0,1,0`), so `007-closed-state`'s
    hiding of the button on a closed poll still works.
- `.btn-vote`'s existing `min-width:25%` floor in `pollCard.css` is retained and
  not overridden — the sizer raises the *content* width, the floor still applies
  when it is the larger of the two.

---

## C3 — JavaScript contract (`pollCard.js`)

One function changes. `updateClosedState()`, `render()`, `fetchPoll()`, the flip
handlers, and both list renderers are untouched.

```js
function setText(){
  viewport.querySelectorAll('.question').forEach(…);   // unchanged
  viewport.querySelectorAll('.subtitle').forEach(…);   // unchanged

  // CHANGED: querySelector → querySelectorAll, so both faces' copies receive
  // the same string from the same computation (FR-004/FR-005).
  const text = /* existing participation-count composition, unchanged */;
  viewport.querySelectorAll('.poll-totals').forEach((el) => { el.textContent = text; });
}
```

Contract:

- The string composition itself is unchanged — same singular/plural handling,
  same `· N not yet voted` clause, same order — so SC-004 (character-for-character
  identical text on both sides) holds by construction rather than by comparison.
- Both nodes are written in the same call, within the same render tick, so they
  can never display different values (FR-005).
- The function must remain tolerant of a missing node, matching its current
  behaviour: `querySelectorAll(...).forEach(...)` over an empty list is a no-op,
  which preserves the existing `if (totalsEl)` guard's intent without needing it.

---

## C4 — Behaviour explicitly unchanged (FR-009)

The following MUST be verifiably identical after this feature. They are listed
here because they are the regression surface quickstart.md checks:

| Behaviour | Owner (unchanged) |
|---|---|
| Card flip, both directions | `initPollCard()` flip handlers |
| Choice selection, single- vs. multi-choice rules | `vote-row` click handling |
| Submit disabled until a choice is selected | `updateSubmitState()` |
| Live result updates on the polling interval | `fetchPoll()` / `render()` |
| Scroll affordance arrows, click and press-and-hold | `updateArrowRows()`, `attachArrowBehavior()` |
| Drag-to-scroll on both lists | `initDragScroll()` |
| Back arrow flips without submitting | `.back-btn` handler |
| Closed-poll suppression rules and message wording | `updateClosedState()` (`007-closed-state`) |
| Bar/row sizing, compact mode, label truncation | `computeBarLayout()` and callers |
| Card outer size | `.card-viewport` / `.card-flip` in `pollCard.css` |

---

## C5 — Static-asset assertions (VM-002)

`src/server.ts` serves `src/public` via `express.static`, so the shipped assets
are reachable in tests. The new suite asserts on response text, following
`tests/pages.test.ts`:

| Request | Assertion | Guards |
|---|---|---|
| `GET /site.css` | contains `.poll-closed-message[hidden]` | R1 regression — the phantom returning |
| `GET /site.css` | contains `.btn-vote-sizer` | C2.3 present |
| `GET /pollCard.js` | `class="poll-totals"` occurs **exactly twice** | C1.1 — back-face copy present |
| `GET /pollCard.js` | contains `btn-vote-sizer` | C1.2 present |

**Why the `poll-totals` assertion counts `class="poll-totals"` and not the bare
string**: `poll-totals` already appears three times in `pollCard.js` today (a
`querySelector` call, a comment, and the front-face template element), so any
"contains" or "at least twice" assertion on the bare string passes before the
feature is written and can never detect a missing back-face element. The
markup form `class="poll-totals"` occurs exactly once today and exactly twice
afterwards, which is a real 1 → 2 transition. (Corrected after
`/speckit-analyze` finding C2.)

These verify shipped content, not geometry; the geometric criteria
(SC-001…SC-006) are verified manually per quickstart.md.
