# Quickstart: Integrate Single Column

How to prove the feature works end to end. Implementation detail lives in `tasks.md`; the surfaces are in [contracts/ui-contracts.md](contracts/ui-contracts.md) and the state in [data-model.md](data-model.md).

> Amended by feature 031 (2026-10-14): from 900 px down the tab bar has the arrows, the all-tabs button (flush left on the Refresh row, three dots before three lines) and the Refresh row; the logo icon is shown at every width and the header's sign-in buttons are 21 px high on a phone; so the "no icon" check below and "at 700 px the page looks as before" no longer hold.

> Amended by feature 20261023-155959-PHONE-TAB-BAR (2026-10-23): the scroll arrows, the hold and the step are removed (`tabBarScroll.js` keeps the drag, now for mouse and pen, gains a mouse-wheel handler and keeps the All tabs menu); up to 900 px each tab is one line, a 16 px icon beside the label in a 48 px tab, the row has a 32 px edge fade and scrolls with the browser's own touch scrolling, smoothly when a tab is chosen, and Refresh sits under the bar at the left with the All tabs button at the right.

## Prerequisites

- Node ≥ 22, `npm install` done, PostgreSQL available for the project's tests (the test suite starts its own embedded one).
- A phone, or a browser window resized to 384 px wide (developer tools device mode works; a real touch device is better for swiping and holding).
- For comparison: `npm run prototypes` serves the prototype page (the design record) beside the app.

## Automated

```powershell
npm run build          # tsc + fingerprinted assets; new sheets and scripts must appear in dist/public
npm test               # whole suite; the new files are named in plan.md
npx vitest run tests/m3-assets.test.ts tests/pages.test.ts tests/single-column-sheets.test.ts tests/client-tab-bar-scroll.test.ts tests/client-floating-actions.test.ts tests/client-search-tab-field.test.ts tests/client-create-poll-item.test.ts tests/client-home.test.ts
```

Expected: all green. The new tests fail if a rule in spec FR-006 to FR-015 is reverted (SC-008): arrow `aria-disabled` at each end, step targets 200 / 400 / 500 and 300 / 100 / 0 for 8 tabs of 100 px in a 300 px bar, a hold that starts at the very end (first-frame time stamp older than the start), the 5 px drag threshold and swallowed click, menu build and keyboard, floating pair start / clamp / reset / header rebuild / sign-in-only site, Search field submit / clear / "/" / `?q=`, Create Poll enabled / disabled / hint.

## Manual: the home page at 384 px

Start the app (`npm run dev` with the usual launch script), open `/` in the phone-size window.

1. **Layout (US1, SC-001)**: one column of cards, 16 px apart, no sideways page scroll; the first screen shows the header, tab bar and a whole card with the top of the next. Vote, bookmark, Live Results and maximize work; a maximized card keeps today's size.
2. **Tab bar (US2, SC-002, SC-003)**: both arrows are on screen; the left is greyed. Tap the right arrow: the bar moves about two tabs in half a second. Reach "Search" in three taps. Hold the right arrow: steady scroll, then it eases to a tab edge when you let go; at the end the right arrow greys and nothing shifts. Hold the left arrow at the far right (and the right at the far left): it scrolls. Swipe, then drag with a mouse: the bar follows; a drag does not select a tab. Open the menu: eight tabs, current one marked; choose "Newest": it selects and the menu closes. As a guest, a greyed item takes you to sign-in. Escape closes the menu and focus returns to the button.
3. **Highlights**: hover an arrow with a mouse (slight circle), press and hold (stronger); a greyed arrow shows nothing.
4. **Refresh (US6)**: on Trending the round green Refresh is on its own row under the line, flush right with the cards; open Live Results: it is gone and the cards sit close to the line.
5. **Guest buttons (US3, SC-006)**: signed out, the pair floats at the top right of the cards; scroll, the pair stays; drag it anywhere inside the visible cards, never out; resize the window so it no longer fits, it returns to the corner; rotate to wide, the buttons are back in the header; maximize a card: the pair stays inside the maximized card's area and is not sent to a corner; sign in, no floating buttons.
6. **Search (US4)**: the header has no search box; open Search: the field is at the top; search, results appear; clear; press "/" outside a field, the field is focused; open `/?q=senate`, the field shows "senate" and results.
7. **Create Poll (US5)**: as an administrator, the avatar menu has Create Poll before Poll Administration and it opens poll administration; as a plain member it is dimmed, focusable, shows the line "Needs permission to create polls" under its label (and the pointer hint) and does nothing.
8. **Wide (SC-005)**: at 700 px and 1200 px the page looks as it did before; compare against `main` or the last deploy.

## Manual: the seven pages (US7, FR-019, SC-004)

Run at 360, 384, 414 and 639 px on `/`, `/login`, `/create-account`, `/profile`, `/not-authorized`, `/admin`, `/admin/results`:

- the header does not overflow and is the compact one (24 px banner, no icon, no search box, no Create Poll link, no user name);
- nothing is cut off or overlapped, and the page's own cards or forms keep their layout;
- the avatar menu opens (signed in) and each item is reachable.

Record any page that fails in the plan's notes and fix before pushing.

## Release

Push to `dev` (autodeploy). Then repeat the seven-page check on the deployed site from a phone. When it passes, a later change removes `SINGLE-COLUMN-RENDERING` from `ENV_PROTOTYPES` in `.do/app.yaml`.
