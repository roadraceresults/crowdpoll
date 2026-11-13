# Quickstart: Admin Search Results List

How to check the feature end to end. The contract is [contracts/ui.md](contracts/ui.md); the states are in
[data-model.md](data-model.md).

## Automated

```
npx tsc --noEmit
npx vitest run tests/client-admin-search.test.ts tests/admin-search-assets.test.ts tests/m3-assets.test.ts
npm test
```

Expected: all pass; `tests/search-admin.test.ts` and `tests/openapi-contract.test.ts` pass unchanged.

## Manual

Prerequisites: the app running locally (`devScripts/launch-dev.ps1`), signed in as an address in `ENV_ADMINS`, and at
least 20 polls (`npm run` the populate script the README names, or create them), one of them invitation-only.

1. **Scan** — open `/admin`, Search, press Search with an empty form. Expected: the form collapses; "N polls match.";
   one compact row per poll, newest first, in one card-like frame with every second row shaded; no card. Each row is
   two lines (title and subtitle, then visibility, "Poll state: …", "Created by: … on …", voters) and at least 10
   rows are visible without scrolling on a 1080 p screen.
2. **Open** — click a row. Expected: its card opens under it, 420 px wide and centred; the row is highlighted and its
   chevron turns. The browser's network panel shows the invitees request only if this poll is invitation-only.
3. **One at a time** — click another row. Expected: the first card closes, the second opens; the clicked row is in
   view.
4. **Close** — click the open row. Expected: only rows remain.
5. **Single result** — expand the form, search for a word only one poll has. Expected: "1 poll matches." and its card
   already open. Close it and wait two refresh intervals: it stays closed.
6. **Edit** — open a row, click a summary part to edit. Expected: every row, Search and Clear are disabled with the
   tooltip "Finish editing the open poll first"; the view tabs and Create New Poll are held as before. Cancel:
   everything is usable again and the card is still open.
7. **Refresh** — with a card open and focus inside it, vote on that poll from another browser. Expected: within one
   interval the row's voter count and the card's count change; the card stays open; focus and scroll do not move.
8. **Stops matching** — search by state OPEN, open a row, Close that poll from its card. Expected: on the reload its
   row and card disappear and the count drops by one; nothing else opens.
9. **Views** — click Newest, then Search. Expected: Newest shows full cards as before; back on Search the last search
   is shown again with every row closed (or its single result open).
10. **Clear** — press Clear. Expected: fields empty, no rows, no notice.
11. **Keyboard** — Tab to a row, press Enter, Tab into the card, Shift+Tab back, press Space. Expected: a visible
    focus ring; the card opens and closes; focus stays on the row.
12. **Screen reader** — on a row, expected announcement: the row's text, "button", "collapsed" or "expanded".
13. **Phone width** — narrow the window to 320 px. Expected: the title and the facts wrap inside the row;
    no horizontal scroll; the open card fits.
14. **Dark scheme** — switch the color scheme. Expected: the frame, stripes, hover, focus, selected and disabled looks stay
    legible.
15. **Long title, no title** — a poll with a very long title shows it in full, wrapped; a new
    poll with no title shows "(untitled)".
16. **Creator-only account** — sign in as a non-administrator creator. Expected: one list of full cards, no Search.
17. **200 results** — with at least 200 polls (the populate script), press Search with an empty form. Expected: 200
    rows (with the cut-off message when more match); opening a row shows its card with no perceptible wait; across
    several refresh intervals the page does not jump and scrolling stays smooth.
