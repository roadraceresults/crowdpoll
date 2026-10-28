# Quickstart: validating the Maximized Poll Card

**Feature**: `specs/021-MAXIMIZED-POLL-CARD/spec.md` | **Date**: 2026-09-24

## Prerequisites

- PostgreSQL for development, as for every feature (`npm test` needs nothing; it embeds its own).
- Launch with the usual development environment (`devScripts/launch-dev.ps1`, or
  `.vscode/launch.json`). Two settings make the checks quicker:
  - `ENV_MAX_CHOICES=50` (the default) so a 50-choice poll can be created;
  - `ENV_TRENDING_POLLS_RECOMPUTE_INTERVAL=60000`, and `ENV_MAX_TRENDING_POLLS` lowered (e.g. `3`)
    for Q7, so a poll can be pushed off Trending.
- As an admin, create and approve: a public poll with 50 choices (long labels among them), one with
  2 choices, one with 7, one Yes/No/Maybe poll, and one private poll.

## Automated

```
npm test
```

Expected: every suite passes, including the new `client-home` cases for opening, closing, exits,
retention and focus, and the contrast test (research R11). The only removed assertions are the
009/010 colour and threshold checks in `poll-card-assets.test.ts`, which are replaced.

## Manual checks (a real browser: layout, painting and animation are not visible to jsdom)

| # | Steps | Expected | Covers |
|---|---|---|---|
| Q1 | On Trending, point at a card's title, then its subtitle, then the right end of its title row; then look at the private poll on My Private Polls | Pointer and underline on the title and subtitle. The star, a 4 px gap, then the Maximize icon at the star's size in near-black `#202020`: a light grey background on hover, a darker one while pressed, the grey background and a focus ring when tabbed to, tooltip "Maximize Poll Card". On My Private Polls the icon sits alone at the right | FR-002 – FR-005 |
| Q2 | Scroll half-way down Trending, click a card's title | The grid gives way to that card and the grey panel beside it, with no close button above them. The header and tabs are still there, the top of the panel is in view, the Maximize icon has become a Minimize icon (arrow pointing down-left) that closes the view, and the title is plain | FR-008 – FR-012, FR-022, FR-027 |
| Q3 | Press the card's Minimize icon; repeat with the Maximize icon and close by clicking Trending; repeat and press Escape | The grid is back each time, at the same scroll position, with the same cards. Clicking Trending sends no request (DevTools Network is empty) | FR-023, FR-024, SC-003 |
| Q4 | Maximize the 2-, 7- and 50-choice polls, on both faces | Every bar is shown, with no arrows and no scrolling inside the card. Bar heights are about 50, 47 and 25 px, with 2 px gaps. The page scrolls for 50 | FR-016, FR-017, SC-002 |
| Q5 | Narrow the window from 1400 px to 360 px with a poll maximized | Side by side down to about 898 px; equal widths shrinking to 375 px by about 808 px; below that the panel goes under the card, the card is centred and the rule disappears. At 360 px nothing is cut off, and there is no horizontal scroll | FR-012 – FR-014, SC-007 |
| Q6 | Flip a card to vote, pick two choices, click its title; close | The maximized card opens on the voting face with both chosen. Closing returns it the same way, and focus lands on the voting face's own Maximize icon. The voting face shows the Maximize icon at the right of its title in the grid, and the Minimize icon while maximized | FR-020, FR-027 |
| Q7 | With Trending capped at 3, maximize the third poll. From another account, vote enough in a fourth poll to overtake it, and wait for the recompute and a Trending refresh. Vote in the maximized card; close | The view stays open through the recompute. The vote shows in the card. On close, the poll is gone from the grid and focus is on the first card's Maximize icon | FR-026 (clarified), R8 |
| Q8 | On Favorites, maximize a poll you have not voted in and un-favourite it. On Live Results, maximize a poll and press its Live Results (X) link | Each view closes at once, and the card is gone. Focus follows the tab's rule | FR-026 |
| Q9 | Maximize a poll, then click Newest; come back to Trending. Maximize, then search from the header. Maximize, then sign out | Each time the view closes; returning shows the grid | FR-025 |
| Q10 | Keyboard only: Tab to a Maximize icon, press Enter, then Escape; Tab to it again, press Space, then press Enter again | Focus on the same button throughout: it shows Minimize after opening and Maximize after each close. The title and subtitle are never tab stops | FR-005, FR-027, SC-008 |
| Q11 | Compare the 50-choice poll's card in the grid and maximized | Same fill, tint and text colours on every bar. Vibrant fills on a pale tint of themselves; dark text over the tint and a light or dark shade over the fill, switching at the fill's edge; no glow. The dark end-line on every fill | FR-029, FR-030, FR-033, SC-004 |
| Q12 | Reload Trending with the Yes/No/Maybe poll in view, and watch the bars grow; then vote to change the percentages and watch them move | The Yes bar is green, No red, each on a pale tint of itself. The text is white over the fill and dark over the tint, and the change from dark to white follows the growing and moving edge. White never shows on the tint | FR-031, FR-032, SC-006 |
| Q13 | Flip any card to its voting face | Choice rows are the same two greys as before | FR-035 |
| Q14 | Check the address bar and Back button during Q2 – Q3 | The address never changes. Back leaves the page, as it did before maximizing | FR-028 |
| Q15 | Open `designDocs/dontTrack/maximizeIcon.svg` | One black shape on a transparent background, matching the JPG | FR-006 |
