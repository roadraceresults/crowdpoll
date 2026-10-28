# Quickstart: validating Bar Colors (022)

## Automated

```text
npm test        # every suite, including tests/client-bar-colours.test.ts
npm run build   # tsc + fingerprinted assets
```

Expected: every suite passes. `client-bar-colours` covers the start rule, the wrap past entry 50,
Yes/No, the distribution over 1,000 ids and the maximized view (research R7).

## Manual (real browser)

Prerequisite: `npm run dev` with the usual `ENV_*` settings, several published polls on Trending
with three or more non-Yes/No choices. Restart the dev server after pulling (it caches page HTML).

| # | Do | Expect |
|---|---|---|
| Q1 | Open Trending with 10+ polls | The first bars of the cards show many different colours, not one dark blue on every card (SC-001) |
| Q2 | Look closely at one card with many choices | No colour appears twice (SC-004) |
| Q3 | Open a poll with Yes, No and Maybe | Yes green, No red, both with white text over the fill; Maybe takes a palette colour (FR-004) |
| Q4 | Note a card's colours, then maximize it | Same colours in the same order (FR-005) |
| Q5 | Find the same poll on Newest or Search, and add it to Live Results | Same colours in each place |
| Q6 | Reload; open the page in another browser as another user | Same colours |
| Q7 | Vote on a live poll until two non-Yes/No choices swap places | The colour sequence top to bottom stays the same; the choices move through it (FR-003) |
| Q8 | On any bar, read the label and percentage over the tint and over the fill | As readable as before (SC-005) |
| Q9 | Narrow the window to phone width | Colours unchanged; nothing else affected |
