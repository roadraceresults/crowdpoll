# UI Contract: Wide More Choices

The behaviour the tests and the quickstart hold the implementation to. "Wide" is a viewport of 641 px and up.
W1–W7 are checked by Vitest with jsdom (wrap heights stubbed, research R11); W8 and W9 by reading the sheets and the
template; W10 by hand with the quickstart.

## W1. `fittingChoices(sorted, ownIds, places)` (FR-003, FR-004)

`sorted` is in share order. Returns `{ shown, hiddenCount, hiddenShare }`.

| Case | `shown` |
|---|---|
| no own choice | the first `places` of `sorted` |
| own choices among the leaders | the first `places` of `sorted` |
| one own choice outside the leaders | the first `places − 1` and the own choice, in share order |
| more own choices than `places` | the `places` own choices with the highest share, and no other |
| `places` is 0 | none |

`shown.length` never exceeds `places`; `hiddenCount` is `sorted.length − shown.length`; `hiddenShare` is the sum of
the hidden choices' `pct`.

## W2. The wide card's results side (FR-001–FR-005)

With a results wrap that holds `capacity` bars at 25 px, 1 px apart:

- `count <= capacity`: `count` result rows, no `.more-row`, sizes as before this feature;
- `count > capacity`: `capacity − 1` result rows and one `.more-row` button, last in the list, whose `li` has the
  rows' height and whose text has the rows' label size;
- the row reads `More choices · p%` on a single-choice poll and `More choices` otherwise;
- a wrap with no height: `count` rows, no `.more-row`;
- the template holds no `.arrow-row`, and the lists do not scroll.

## W3. Opening the maximized view from a wide card (FR-006, FR-007)

| Action | `onMaximize` receives |
|---|---|
| click or Enter/Space on `.more-row` | `(pid, { choices: 'voted' })` |
| click "Show more" | `(pid, { open: 'notes' })` |
| click the title, subtitle or maximize button | `(pid)` |
| click a `.result-row`, or the notes box outside "Show more" | nothing |

## W4. Voting from a wide card (FR-014, FR-015)

- ballot fits: Vote flips the card; the voting list holds every choice;
- ballot does not fit: Vote calls `onMaximize(pid, { face: 'vote' })`, the card does not flip, and no ballot is built
  behind it;
- the two sides are judged apart: a results side with `.more-row` and a ballot that fits flips in place; a results
  side with every bar and a ballot that does not fit opens the view;
- a guest is sent to `/login`, and an editing or blocked poll shows its message, before either;
- a flipped card whose ballot stops fitting returns to its results side, and the selection is restored on the voting
  side of the maximized view.

## W5. The maximized view at wide widths (FR-009–FR-013)

The cases of `client-phone-card.test.ts` › "the maximized card in the phone layout" hold with the phone query not
matching, except bar sizes: 12 choices, no row; 37 choices, ten rows and `Show all 37 choices · p%`, then 37 and
`Show fewer choices` with `aria-expanded="true"` and focus on the row, then ten; the 2% and 0% rules; opened with
`{ choices: 'voted' }`, the voted choices and `Remaining choices · 0%`; the viewer's own choice added; the voting
side lists every choice.

## W6. "Show more" positions the page (FR-016, FR-017)

In `tabs.js`, with the phone query not matching and the view opened with `{ open: 'notes' }`:

- when the top of `.maximized-notes` is below the middle of the window under the fixed chrome, the page is scrolled
  so that the card's `.card-front .actions` is 16 px under the chrome;
- when it is not, the page is not scrolled;
- it is evaluated when the view opens and again when the notes' text arrives;
- `.extras-tabs` stays undisplayed and every panel the poll has is shown.

## W7. The phone layout (FR-018)

Every existing test of `client-phone-card.test.ts` that mounts with the phone query matching passes unchanged.

## W8. The wide rows' styles (FR-008, FR-013)

`pollCard-m3.css` has one `@media not all and (max-width: 640px)` block that styles `.card-face .more-row` and
`.card-face .show-all-row`: bordered with `--md-sys-color-outline-variant`, text in `--md-sys-color-primary`,
`cursor:pointer`, a state layer on hover, focus and press, and the card's 3 px `--md-sys-color-secondary` focus ring.
It holds no literal font size. `phone-card-m3.css` is unchanged.

## W9. Removed (FR-001)

No `arrow-row`, `is-dragging`, `computeBarLayout`, `initScrollArrows` or `scrolling:` remains in `src/public/`
(the tab bar's own `tab-scroll-arrow` is another control and stays).

## W10. By hand

The quickstart: appearance of the rows, no scrolling by wheel, drag, touch or keyboard, the notes position on a
real page, Back, and the phone layout before and after.
