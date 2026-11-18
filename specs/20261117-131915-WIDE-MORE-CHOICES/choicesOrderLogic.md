Everywhere voters see results, choices are listed by **current share, highest first**. Ties keep the creator's order. Admin pages instead show the creator's order. A voter's own vote **never moves a choice up or down**: it only decides whether a choice is **shown** when some are hidden, and its counts change the shares, which can change the order on the next refresh.

## The base order (server)
- Every choice has a stored `position`, which is the creator's order.
  - A never-voted poll takes it from the lines of the Choices textbox (`replaceChoices`).
  - On an ever-voted poll (`mergeChoices`, `service.ts:1124`), a choice that is kept **keeps its old position**, and a new choice goes after the last one.
- `computeResults` (`service.ts:314`) returns the choices **in position order**, each with a `pct` that is a **whole number** (`Math.round`). Single-choice polls divide by the number of voters; multiple-choice polls divide by the total number of selections.
- The card payload sends `poll.choices` in that same position order.

## Poll cards: Home and every other tab, both faces (`pollCard.js`)
- **`rebuildData` (line 927)** copies the choices and runs `data.sort((a, b) => b.pct - a.pct)`.
  - JavaScript's sort is stable, so choices with the **same rounded %** stay in position order. Because % is a whole number, ties are common: every 0% choice, for example, stays in creator order.
- This one sorted `data` drives **both faces**:
  - the results bars (`renderPollResults`);
  - the **voting face** (`renderVotingOptions`), whose rows are in the same share order, not the creator's.
- **Colors** follow that order too. A choice with a manual color or a yes/no meaning keeps its own color. Every other choice takes the next palette color in display order, starting at a point set by the poll's id (`assignResultColors`). So a change in rank can change the color of a choice without a set color.
- **When the order is recomputed:** on every `applyPoll` (each refresh the tab gives the card, including the response to your own vote) and when the voting face opens.
  - The voter's selection is carried through (`pendingSelection`), but **the rows are re-sorted** even while the voting face is open. A refresh in the middle of a vote can move the rows under the voter.

**Which choices are shown** (the order is always `data`'s):

| Where | Rule | What the voter's own choices do |
|---|---|---|
| Card above 640 px (`fitting`, line 894) | As many as fit; if not all fit, the space minus one row, then a **More choices** row | `fittingChoices` **reserves room for your own choices first**, then fills with the leaders. They're still drawn in share order, not pinned to the top |
| Card on a phone (640 px and below) | `essentialChoices` with `COMPACT_LIMITS`: the top 4, or all of them if there are 5 or fewer | Your choices are **added** to the leaders, in their share position |
| Maximized view | `MAXIMIZED_LIMITS`: of the top 10 (all, if 12 or fewer), those above 2% (above 0% if 12 or fewer), as long as at least one is; then **Show all N choices** or **Show fewer choices** | Added the same way, in share position |
| Maximized from **More choices** (`votedChoices`, line 888) | Every choice at 1% or more, then **Remaining choices · 0%** | Your choices are kept even when below 1% |
| Voting face | **Every** choice, in share order. When the card can't hold them all, **Vote** opens the maximized view on its voting side instead | Selected rows are only highlighted; they never move |

## Line graph legend (`lineGraph.js:476`)
- The server sends each scale's series in **position** order (`polls/lineGraph.ts:89`).
- The client sorts them by **current share**, which is the **last point on the graph's current scale**, not the live counters. The sort is stable, so ties keep position order.
- With more than 10 lines, only the leaders are drawn (`leadingCount`): those whose shares add up to 80% of the total, plus any tied with the last of them, and never more than 10. **Show all** draws the rest.
- The legend, lines, markers and Y axis all come from `drawnSeries()` in that order.
- **The voter's own vote plays no part**: a choice you voted for isn't added to the drawn set.

## Who Voted (`whoVoted.js:126`)
- `barOrder` sorts by `pct` descending, then by **position**. This tie-break is written out explicitly, but gives the same result as the card's stable sort.
- Grouped by voter: voters A–Z (then by the time they voted), and each voter's choices in that bar order.
- Grouped by choice: choices in bar order, with the voters A–Z under each.

## Poll Administration (`adminCard.js`)
- The wizard's Choices textbox, Cancel's restore (`sessionChoicesText`) and the list of choices added by voters all sort by **`position`**, ignoring votes.
- The admin search rows show no choice bars. The creator's own polls, under Your Polls, use the ordinary poll card, ordered as above.

## Two things you might not expect
1. **Reordering an ever-voted poll's choices in the textbox doesn't stick.** `mergeChoices` keeps each kept choice's old `position`, and only new choices go to the end. It only matters for ties and in the admin views, because voters see share order anyway.
2. **The voting face re-sorts on every refresh**, as described above. If you'd like the ballot to keep its order while it's open (or always to use the creator's order), that would be a small change.