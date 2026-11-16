# UI Contract: the poll card, the maximized view and Back

"Phone layout" means `matchMedia("(max-width: 480px)")` matches. Outside it, everything in C1 to C5 is as today.

## C1. Essential choices (FR-013 to FR-015, FR-027)

Choices A, B, C… are in share order. "own" is what the viewer voted for.

| Choices | Limits | Own | Shown | Hidden count |
|---|---|---|---|---|
| 3 | compact (4, 5) | none | A B C | 0 |
| 5 | compact | none | A B C D E | 0 |
| 6 | compact | none | A B C D | 2 |
| 12 | compact | none | A B C D | 8 |
| 12 | compact | B | A B C D | 8 |
| 12 | compact | G | A B C D G | 7 |
| 12 | compact | G, K | A B C D G K | 6 |
| 50 | compact | none | A B C D | 46 |
| 12 | maximized (10, 12, above 2%, above 0%) | none | all 12 | 0 |
| 12, A B C D above 0% | maximized | none | A B C D | 8 |
| 12, A B C D above 0% | maximized | H (at 0%) | A B C D H | 7 |
| 12, no votes yet | maximized | none | all 12 | 0 |
| 13 | maximized | none | A … J | 3 |
| 37 | maximized | Z (27th) | A … J, Z | 26 |
| 50, A B C above 2% | maximized | none | A B C | 47 |
| 50, A B C above 2% | maximized | E (at 1%) | A B C E | 46 |
| 50, fifteen above 2% | maximized | none | A … J | 40 |
| 50, none above 2% | maximized | none | A … J | 40 |
| 6, no votes yet | compact | none | the first four in the poll's own order | 2 |

In the maximized view a leader counts only when its displayed share is above 2%, unless no leader's is; with twelve
or fewer choices, a choice counts only when its share is above 0%, unless none is (TWEAK05, on trial).
Where the table gives no shares, every choice is above 2%.
The hidden share is the sum of the hidden choices' shares. It is displayed on a single-choice poll only.

## C2. The compact card (FR-013 to FR-019)

- Results list: the shown choices as 44 px bars, 8 px apart, then, when the hidden count is above 0, one row:
  `More choices · 18%` (single-choice) or `More choices` (multiple-choice) (TWEAK07: no count).
- Tapping the title, the subtitle, a bar, the "more choices" row or Maximize opens the maximized view; tapping the
  notes line opens it with Notes open.
- Title at most three lines, subtitle one, notes one. Nothing scrolls inside the card.

## C3. Vote (FR-020 to FR-025)

| Card | Vote does |
|---|---|
| compact, hidden count 0 | flips in place; the back lists every choice in 64 px rows; Back and Submit in the card |
| compact, hidden count above 0 | opens the maximized view on its voting side |
| maximized | flips in place |
| guest, editing, blocked, closed | as today |

## C4. The maximized view (FR-026 to FR-031)

- Results side: C1 with the maximized limits; whenever a choice is left out, also on a poll of twelve or fewer, the
  row reads `Show all 37 choices · 30%` (no share on a multiple-choice poll), then `Show few choices`, which restores
  the C1 list.
- Opened from the card's "More choices" row (TWEAK07): every choice whose share is 1% or more, plus the viewer's own
  (every choice when none is at 1%); when choices remain the row reads `Remaining choices · 0%` and shows them, then
  reads `Show few choices`, which goes to the C1 list. Opened any other way, the view starts at the C1 list.
- Under the card, one tab bar (`.extras-tabs`) with the tabs Read More, Polling History and Who Voted, in that order,
  always present. A tab whose content the poll lacks is `aria-disabled="true"` and does nothing.
- One tab is `aria-selected="true"` and only its content shows: the leftmost available when the view opens, Read More
  when opened from the notes line, none when the poll has none of the three.
- The voters report and the graph are requested when their tab is first shown, once.
- The card is as tall as the side being shown.
- One column: the card, then the tab bar and the section shown.

## C5. The Submit bar (FR-024)

| State | Bar |
|---|---|
| maximized, voting side, phone layout | shown: Back, "N selected", Submit (same label and enabled state as the card's Submit); the card's own Back and Submit hidden (Add Choice stays in the card); Back-to-top hidden |
| anything else | hidden |

The bar's bottom edge is above the cookie notice. Its buttons do exactly what the card's do.

## H. Back (FR-032 to FR-034; every width)

| # | Given | When | Then |
|---|---|---|---|
| H1 | a tab's list | a card is maximized | `history.length` grows by one; the address is unchanged |
| H2 | that view | browser Back | the view closes, the list is at its previous scroll position, the address is unchanged |
| H3 | that view | on-screen Back arrow, Minimize, Escape or the active tab | the view closes and no step is left behind: the next Back goes where it would have gone before H1 |
| H4 | that view | another tab is chosen, a search is run or the session changes | the view closes; one Back press afterwards does not reopen it and does not stay on a dead step |
| H5 | a poll opened from `/?PID=…` | browser Back | the browser leaves, as today; no step was added |
| H6 | H5's view | on-screen Back arrow | the view closes to the list; no step is consumed |
