# Bug: Result-bar text illegible at 0% fill for dark-bucket colors

**Found**: 2026-08-19, during manual quickstart verification of `009-POLL-CHOICE-COLORS`
(scenario Q1-adjacent — a freshly created poll with 0 votes).

**Screenshots**: `designDocs/colorsTextBug02.jpg`.

## Symptom

On a poll with 0 votes, some result-bar labels render bold and legible while others
render pale/washed out on the same card. Example: a `Yes`/`No`/`Maybe`/`Undecided` poll
shows `Yes` and `No` in solid dark text, but `Maybe` and `Undecided` in faint white text
that is hard to read against the light track background.

## Root cause

`renderPollResults` sizes `.result-fill` to `width: <pct>%` (`src/public/pollCard.js`
around lines 569 and 619). At 0% votes the fill is 0px wide, so the label sits entirely
on the row's base background — the unfilled track, `--track: #DDE1D6`
(`src/public/pollCard.css:212`), not on the assigned bar color at all.

`textStyleFor()` (`src/public/pollCard.js:299`) picks ink purely from the *assigned bar
color's* luminance, with no awareness of how much (if any) of that color is currently
visible:

- Colors with luminance > 0.40 ("light bucket") get dark ink `#1a1a1a` — which happens
  to read well against the light track regardless of fill width.
- Colors with luminance ≤ 0.40 ("dark bucket") get white ink with a dark halo, designed
  for a dark fill. At 0% fill there is no dark fill to sit on, so it's white text with a
  soft dark halo directly on the light track (`#DDE1D6`) — low contrast in practice.

This is **not specific to the new semantic colors** from `009-POLL-CHOICE-COLORS`. It
affects any "dark bucket" color (most of the 50-entry results palette) whenever its bar
is at or near 0%. It is visible even on polls with zero semantic choices (e.g. a
`5K`/`10K`/`Half marathon`/`Marathon` poll at 0 votes — all four labels are pale, just
uniformly so, which reads as less jarring than the mixed case but is the same
underlying defect). `009` did not introduce the mechanism; it made the inconsistency
obvious because both new semantic colors happen to land in the light bucket, placed
directly next to palette colors that land in the dark bucket, on the same card.

## Relationship to 009's requirements

`009-POLL-CHOICE-COLORS` FR-011 requires label/percentage text to "remain legible on
every assigned color ... whether the text sits over the filled portion of a bar or over
the unfilled track." Taken literally this defect is in tension with that requirement,
but it is a pre-existing mechanism (predates 009) affecting the existing palette, not a
regression introduced by 009's own changes (T001-T019, all complete). Per user decision
2026-08-19: tracked as a separate bug rather than folded into 009's scope. 009's manual
verification (tasks T004, T010, T012, T016) continues separately.

## Suggested fix direction (not yet implemented)

Base the ink decision on the actual visible background rather than solely on the
assigned fill color — e.g. fall back to the track's own ink rule when `pct` is at or
near 0, or blend based on how much of the label's width is likely to sit over fill vs.
track. Needs its own spec/plan pass; touches `textStyleFor` and both `renderPollResults`
call sites, and affects all 50 palette colors, not just the two semantic ones.
