# Research: Wide More Choices

Every decision below was reached by reading the code as it stands on `641px+`; no external source was needed.
"Wide" is 641 px and up (`!isPhoneLayout()`), "phone" is 640 px and less.

## R1. How many choices fit in a wide card

**Decision**: the card's capacity is `computeMaxBarsAtFloor(wrap.clientHeight)`, the function that already decides
when the list scrolls: the number of 25 px bars, 1 px apart, the wrap can hold. A poll of `capacity` choices or fewer
shows every choice (FR-002). A longer one has `places = capacity − 1` bars and the "More choices" row (FR-003).

**Rationale**: the threshold is exactly the one at which a card scrolls today, so the cards that change are the
cards that scroll (SC-002), and no new constant is introduced.

**Alternatives considered**: a fixed count as on the phone (rejected by the requirements, AM2); reserving two places
as the arrow rows did (wastes one bar).

## R2. Which choices take the places

**Decision**: a pure function beside `essentialChoices`, `fittingChoices(sorted, ownIds, places)`, returning the same
`{ shown, hiddenCount, hiddenShare }`:

1. `own` = the viewer's choices in share order, cut to `places`;
2. `leaders` = the other choices in share order, cut to `places − own.length`;
3. `shown` = `sorted` filtered to `own` and `leaders`, so the bars stay in share order.

It is exported on `window.PollCard` for its unit tests, as `essentialChoices` is.

**Rationale**: it gives FR-004 and the clarified rule (own choices that outnumber the places: as many as fit, highest
share first) in three lines, and it cannot return more rows than fit, which `essentialChoices` (leaders, then own
choices added) can.

**Alternatives considered**: `essentialChoices` with computed limits (overflows the card when own choices fall outside
the leaders).

## R3. Sizing the rows; the scrolling branch goes

**Decision**: `measuredBarLayout(rows, wrap)` returns `computeBarMetrics(rows, wrap.clientHeight)` with no `scrolling`
field; `computeBarLayout` is deleted. `renderPollResults` asks for the layout of `shown.length + 1` rows when there is
a last row, so the row is one more bar: its `li` takes `barHeight` and its text `scaleFontSize(barHeight)`, set inline
as a bar's are, when the layout is not the phone's (FR-008). `phoneBarLayout`, `phoneVoteLayout` and
`maximizedBarLayout` lose their `scrolling: false`.

**Rationale**: `computeBarMetrics` already fits a known-to-fit count exactly, floor included; counting the row as a
bar keeps one sizing rule.

## R4. A card that is not laid out

**Decision**: a wrap whose `clientHeight` is 0 (a hidden grid, jsdom) is treated as fitting: every choice, no row.
`restore()` in `tabs.js` re-renders the mounted cards at every width (today only in the phone layout), since cards
refreshed while the grid was hidden were drawn without a height. The existing window `resize` handler (`renderCard`)
covers resizing and crossing 640 px.

**Rationale**: a height of 0 says nothing about room; showing the "More choices" row alone on every hidden card would
be wrong and would flip cards off their voting side (R5). Existing tests that mount a wide card in jsdom keep passing
unchanged, which is itself the proof of FR-002 for them.

**To verify in implementation**: that a tab's cards are rendered after its panel is shown (the bars' heights depend
on it today, so a path exists); if a path is missing, the same re-render is added there.

## R5. The voting side decides for itself

**Decision**: `ballotFits()` is `capacity(votingWrap) >= data.length` (true when not laid out). In the wide layout:

- Vote on a card whose ballot does not fit calls `requestMaximize({ face: 'vote' })`, the phone's call (FR-014);
- the ballot is built only when it fits, or the card is flipped or maximized, as `ballot()` does for the phone;
- a card found flipped, not maximized, with a ballot that no longer fits (a choice added, the window resized) returns
  to its results side with `pendingSelection` kept, the step `setMaximized` already takes for the phone.

The phone keeps its own test (`essential().hiddenCount > 0`). One function, `ballotOpensMaximized()`, holds both.

**A correction to the spec**: the two wraps are not the same height. The notes box is on the front face only, so a
poll with notes has *more* room on its voting side. FR-014 said every card that shows the row also has a ballot that
does not fit; that is false, and the clarified rule ("each side decides for itself") already covers it. FR-014 and
Story 3 (scenarios 1 and 6) now say so.

## R6. The maximized view

**Decision**: the maximized branch of `phoneResultsView()` and the `.show-all-row` click handler lose their
`isPhoneLayout()` tests; the function becomes `resultsView()`:

| | phone | wide |
|---|---|---|
| card | `essentialChoices(…, COMPACT_LIMITS)` | `fittingChoices` when the bars do not fit, else no view |
| maximized | `MAXIMIZED_LIMITS`, `choiceView` | the same |

`setMaximized(true, { choices: 'voted' })` already carries the "More choices" arrival at every width (FR-009–FR-012).

## R7. What opens the maximized view

**Decision**: in the wide layout the `.more-row` click calls `requestMaximize({ choices: 'voted' })`; the
`.result-row` click and the notes box click stay behind `isPhoneLayout()` (FR-007).

## R8. "Show more" and the notes

**Decision**: `requestMaximizedNotes()` passes `{ open: 'notes' }` at every width, and `maximize()` sets
`notesAsked = how.open === "notes"`. `revealNotes()` measures the top of `.extras-tabs` in the phone layout and of
`.maximized-notes` otherwise.

**Rationale**: `.extras-tabs` is `display:none` above 640 px, so its top reads 0 and `revealNotes()` would always
return early. The notes panel is `hidden` until its text arrives, and `syncNotes` already calls `revealNotes()` again
then. Where the view has two columns the notes sit beside the card, in the upper half, and nothing scrolls (FR-016).
`extraShown` being `"notes"` has no effect above 640 px: the rules that read `data-shown` are in the phone layer.

## R9. Styles

**Decision**: the wide rows are styled in `pollCard-m3.css`, in one `@media not all and (max-width: 640px)` block:
an outlined, bar-shaped button (the bars' 8 px radius, 2 px when compact; `outline-variant` border; `primary` text;
the label-large weight and tracking tokens; `cursor:pointer`), with the hover, focus and pressed state layers and the
focus ring the card's other controls have. The font size is the inline one from R3. The phone layer is not touched.

**Rationale**: the phone rows draw their border with `::before`, which the card's state layers also use, so sharing
rules across the boundary would change the phone (FR-018). A block that cannot match at 640 px or less keeps the phone
unchanged by construction. `phone-sheets.test.ts` allows this query form, and the block holds no literal font size
(`m3-assets.test.ts`).

**A correction to the requirements' wording**: the report (UA4) spoke of the phone row's "chevron". The phone rows
have none (the chevron belongs to "Show more"), so none is added; FR-008 now says "outlined shape and colours".

## R10. What is removed

- `pollCard.js`: `computeBarLayout`, `updateArrowRows`, `attachArrowBehavior`, `initDragScroll`, `initScrollArrows`,
  their constants and comments, the scroll-position save and restore in both renderers, the four arrow buttons in
  `POLL_CARD_TEMPLATE`, the `upRow`/`downRow` parameters, and `.card-face .arrow-row` in the `M3Ripple` list.
- `pollCard.css`: the `.arrow-row*` rules, `.is-dragging`, the scrollbar-hiding declarations, and `overflow-y:auto`
  on `.results-list` and `.voting-list` (now `hidden`); the comment above `.bar-scroll-wrap` keeps its account of why
  the list is out of flow and loses the scrolling part.
- `pollCard-m3.css`: `.arrow-row` in the state-layer and focus lists, and its two own rules.
- `single-column-m3.css`: `.card-flip:not(.maximized-card-flip) .arrow-row{ display:none; }`.

Kept: the `.bar-scroll-wrap` / `.bar-scroll-inner` structure and names (the absolute positioning is what keeps the
card's height fixed, and `m3-ripple.js` and the phone layers refer to them; renaming is not this feature's work), and
`user-select:none` on the lists.

## R11. Tests

**Decision**: jsdom has no layout, so the wide tests give the two wraps a height by defining `clientHeight` on them
before `applyPoll` (a small helper in the test file). New file `tests/client-wide-card.test.ts` for the wide card,
its voting and its maximized view; `fittingChoices` is tested directly. In `client-phone-card.test.ts` the three
"outside the phone layout" cases are updated or moved (the maximized one now expects ten bars and the row).
`client-maximized.test.ts` drops its `.arrow-row.is-active` assertion; `poll-card-assets.test.ts` drops its arrow-row
assertions and asserts the template and sheets hold no `arrow-row`; a sheet test pins R9's block and its query.
`revealNotes` at wide widths is tested where the phone's is.

## R12. Documents

After implementation: `README.md` (the maximize bullet, a wide-card bullet in place of scrolling, "Show few choices"
corrected to "Show fewer choices"), `ARCHITECTURE.md` (the card-sizing paragraph that names `computeBarLayout`, the
maximize state diagram), `CLAUDE.md` and `CLAUDE_COMPLETE.md` (`essentialChoices` and the notes step are no longer
phone-only).
