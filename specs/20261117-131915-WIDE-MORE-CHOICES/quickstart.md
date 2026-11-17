# Quickstart: Wide More Choices

How to check the feature end to end. The contract is [contracts/ui.md](contracts/ui.md); the states are in
[data-model.md](data-model.md).

## Automated

```
npx tsc --noEmit
npx vitest run tests/client-wide-card.test.ts tests/client-phone-card.test.ts tests/client-maximized.test.ts tests/poll-card-assets.test.ts tests/m3-assets.test.ts tests/phone-sheets.test.ts
npm test
```

Expected: all pass; the phone-layout cases of `client-phone-card.test.ts` are unchanged (W7).

## By hand

Start the app as usual (the local launch script), sign in, and have these polls on one tab (the populate script makes
them): 4, 12, 13, 37 and 50 choices; one of 37 with notes longer than two lines; one multiple-choice poll of 30 on
which you voted for 15 choices; one single-choice poll of 37 on which you voted for the last choice.

Before changing any code, take screenshots of the tab at 1280 px and at 400 px wide, for §1 and §7.

### 1. Cards that fit (W2, SC-002)

At 1280 px: the 4- and 12-choice cards look exactly as in the "before" screenshot.

### 2. Cards that do not fit (W2, SC-001)

- The 37- and 50-choice cards show leading bars and a last row "More choices · p%"; the multiple-choice card's row
  reads "More choices".
- No arrow rows. The mouse wheel over the bars scrolls the page, not the card; dragging on the bars does nothing;
  Tab reaches the row and nothing inside the card scrolls with the arrow keys.
- The row is as tall as a bar, outlined, with a pointer cursor, a hover tint and a focus ring.
- On the poll where you voted for the last choice, that choice is the last bar before the row.
- On the 15-of-30 poll, every bar shown is one of your choices, highest share first.
- Resize the window between 641 and 1600 px: rows appear and disappear with the room; nothing scrolls.

### 3. More choices (W3, W5)

- Click the row on the 37-choice card: the maximized view opens with every voted choice and
  "Remaining choices · 0%" when some have no vote. Back returns to the grid where it was.
- Tab to the row and press Enter: the same.
- Click a bar: nothing. Click the notes text on a card: nothing.

### 4. Maximized view (W5)

- Maximize the 12-choice poll by its button: every bar, no row.
- Maximize the 37-choice poll by its title: ten bars and "Show all 37 choices · p%"; click it: 37 bars and
  "Show fewer choices", focus still on the row; click it: ten again.

### 5. Voting (W4)

- Vote on the 4-choice card: it turns over in place.
- Vote on the 50-choice card: the maximized view opens on its voting side with 50 choices; submit; the vote counts.
- On the 37-choice poll with notes: if its results side shows the row while Vote turns the card in place and lists
  37 choices without scrolling, that is correct (the voting side has the room the notes take on the front).
- Signed out: Vote on any card goes to the login page.

### 6. Show more (W6, SC-004)

At about 740 px wide and 900 px tall, as in the requirements' screenshot: click "Show more" on the card with notes.
The view opens with the Live Results and Vote row directly under the header and the notes beneath it. At 1400 px,
where the notes sit beside the card, the page does not move. Repeat at 740 px wide with the window 600 px tall: the
Vote row and the first line of the notes are both in sight without scrolling (SC-004). Back returns to the grid where it was. No tab bar
appears over the panels.

### 7. The phone layout (W7, SC-006)

At 400 px wide: the tab looks exactly as in the "before" screenshot; "More choices", Vote and "Show more" behave as
before.

## Outcome

Record here, after implementation, the date, the browser, and the result of each section.

**2026-11-17, automated.**

- Before the change: `npx tsc --noEmit` passed. The checkout had no `node_modules` (`npm ci` was run), and the
  first full `npm test` overlapped the first edits, so there is no clean record of it. Two cases of
  `tests/client-phone-card.test.ts` were failing before the feature: they expected "Show few choices" while the
  working tree's `pollCard.js` already read "Show fewer choices"; they now expect the corrected text.
- After the change: `npx tsc --noEmit` passed; `npm test`: 212 files passed, 3 skipped; 3543 tests passed, 27 skipped.
- A tab's cards after its panel is shown (research R4): `select()` in `tabs.js` calls `showPanel(name)` and then the
  tab's `activate()`, and every `activate()` (`tabs.js`, `trending.js`, `newest.js`, `searchTab.js`,
  `liveResults.js`) draws its grid, so every card is drawn with its height. No path was added.
- The wide notes cases are in `tests/client-phone-view.test.ts`, beside the phone layout's, which already tested
  `revealNotes`.
- `single-column-m3.css` keeps `#tabBar.is-dragging`, the tab bar's own rule.

**2026-11-17, by hand (§1–§7): all passed**, walked by the developer. No "before" screenshots were taken before
the code changed, so §1 and §7 were judged without them.

