# Quickstart: Legal Page Updates

Validation scenarios for the feature. Markup and styles are in `contracts/ui-contracts.md`; the version in `data-model.md`.

## Prerequisites

- The app running locally (`.vscode/launch.json` or `devScripts/launch-dev.ps1`, from their `.example` templates), signed in with an account that accepted the previous version.
- A desktop browser and a phone-width window (DevTools device toolbar, 375 px).

## Automated

```
npx tsc --noEmit
npx vitest run tests/legal-pages.test.ts tests/back-to-top-sheet.test.ts tests/m3-assets.test.ts tests/client-back-arrow.test.ts tests/client-human-check.test.ts tests/client-admin-discard.test.ts
npm test
```

## Scenarios

| # | Story | Steps | Expected |
|---|---|---|---|
| 1 | US1 | Open `/login` as a guest, follow "What this safeguard checks." | `/privacy` opens at "Bot and AI Agent Detection", below the header; the text reads as C1 |
| 2 | US1 | Read "In short" and the retention table; search the page for "Bot check" | Both use the new name; no "Bot check" (SC-001) |
| 3 | US1 | Look at the top of `/privacy` and `/terms` | Both: `Version <release date>`; `/privacy`'s Last updated is the release date, `/terms`' is 22 October 2026 |
| 4 | US1 | Signed in with the earlier acceptance, open `/` | Sent to `/accept-terms` once; after accepting, not again (SC-006) |
| 5 | US2 | From `/login`, follow the Privacy Policy link | Back arrow under the header, left edge level with the logo |
| 6 | US2 | On `/privacy`, follow "bot check" in "In short" and then `#cookies`; press the arrow | Back on `/login`, in one press (SC-002) |
| 7 | US2 | From `/privacy` follow the Terms link; press the arrow on `/terms` | Back on `/privacy`, arrow shown again |
| 8 | US2 | Type `/privacy` in the address bar; open it from a bookmark; middle-click the footer link | No arrow in each case, no gap where it would be (SC-003) |
| 9 | US2 | Reload `/privacy` after scenario 5 | Arrow still shown |
| 10 | US2 | Tab from the header | The arrow takes focus with a ring, announced "Back"; Enter returns (SC-007) |
| 11 | US2 | 375 px wide: scroll the whole policy | The arrow stays under the header and never covers text (SC-004) |
| 12 | US3 | On `/privacy`, `/`, `/admin` and `/profile`, scroll past 600 px | The Up arrow appears bottom centre (SC-005); press returns to the top |
| 13 | US3 | With the cookie notice showing, scroll down | The Up arrow sits above the notice |
| 14 | — | `/admin`: look at and press its back arrow | Same look as before; goes to `/` |
| 15 | — | Network panel on `/privacy` | Only the site's own address |
