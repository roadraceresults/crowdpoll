# Quickstart: Semantic Color Words

## Automated

```
npx tsc --noEmit
npx vitest run tests/poll-card-assets.test.ts tests/client-bar-colours.test.ts
npm test
```

Expected: the label table of [contracts/ui.md](contracts/ui.md) U1–U4 passes in `poll-card-assets.test.ts`, and the
rendering test (U6) passes in `client-bar-colours.test.ts`; the full suite stays green.

## Manual (dev server, PostgreSQL only)

1. Create a poll with choices "Strongly approve", "Neither approve nor disapprove", "Strongly disapprove", "No opinion",
   colors switch off, and open it: green, palette, red, palette (U1–U3).
2. Create a poll with "Support", "Oppose", "Customer support": green, red, green (accepted trade-off).
3. In the second poll, pick a color for "Customer support" by hand: it shows that color (U5).
4. Turn the line graph on for the first poll: the lines take the same colors as the bars.
5. Open an existing yes/no poll: its colors are as before (U4).
