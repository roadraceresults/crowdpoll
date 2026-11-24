# Quickstart: Voting Center

**Feature**: [spec.md](spec.md) | **Contract**: [contracts/ui.md](contracts/ui.md)

## Prerequisites

- PostgreSQL for `npm run dev` (development needs nothing else); Node ≥ 22.
- Two signed-in accounts (A creates, B votes) and one guest window.
- A Private poll P1, open, with "Voters may add choices" on, Multiple-Choice, 4 choices; a Private poll P2 like it with
  12 choices; a Public Single-Choice poll P3; a non-anonymous poll with votes for Who Voted.

## Automated checks

```
npx tsc --noEmit
npx vitest run tests/client-add-choice.test.ts tests/client-maximized.test.ts tests/client-remove-vote.test.ts
npx vitest run tests/client-phone-view.test.ts tests/client-who-voted.test.ts tests/m3-assets.test.ts tests/phone-sheets.test.ts
npm test
npm run build && npm run test:built
```

Expected: all pass; the build reports no missing page reference (the removed `addChoiceDialog.js` is gone from
`index.html`).

## Manual scenarios

| # | Do | Expect (contract) |
|---|---|---|
| 1 | As B, look at P1's compact card on Home | "Cast Your Vote" left, Live Results right; add-your-own row last, after "More choices" if shown (V1, V7) |
| 2 | Click Cast Your Vote; tick 1, then 2 choices | "Cast this vote" → "Cast these votes"; Cast left, flip-back right; help line under the row (V2, V3, V18) |
| 3 | Type "Pizza", press Enter | snackbar "Choice added"; field empty and focused; ticks kept; Pizza last and unticked (V10) |
| 4 | Type an existing label in other case | duplicate message, Enter does nothing (V11) |
| 5 | Type half a word; from A's window vote on P1 | B's text, caret and focus unchanged after the refresh (V15) |
| 6 | On the results face, click into the row | card does not flip or maximize; add a choice; card stays on results, new bar at 0% (V13) |
| 7 | Add twice quickly | second refusal "Please wait a moment and try again.", text kept (V12) |
| 8 | Maximize P2's Voting Center (desktop) | divider + top row under the title; both Cast buttons agree; Tab reaches the top row first (V16, V17) |
| 9 | Same on a 9-choice poll, on a phone width, compact | no top row (V16) |
| 10 | Phone width, maximize P1, press Cast Your Vote | bottom bar: Cast, "n selected", flip-back (V4) |
| 11 | Maximized Voting Center title row | Share, Follow, Minimize; follow there → front shows followed (V19) |
| 12 | Tab bar, Following tab, tooltips; open an old `/?tab=watching&PID=…` link | "Following" everywhere; the old link opens the Following tab (V20, V21) |
| 13 | Guest window; P3 as B | no add-your-own row anywhere (V7) |
| 14 | Who Voted on the non-anonymous poll, both orders | "Vote Cast Date" (V22) |
| 15 | Narrowest card, Multiple-Choice poll | labels whole, no clipping (V5) |
| 16 | Dark theme | row near-black with light text, outlined; help line on-surface colour (V8, V18) |
