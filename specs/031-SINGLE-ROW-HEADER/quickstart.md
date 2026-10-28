# Quickstart: Single Row Header

> Amended by feature 20261023-155959-PHONE-TAB-BAR (2026-10-23): the scroll arrows, the hold and the step are removed (`tabBarScroll.js` keeps the drag, now for mouse and pen, gains a mouse-wheel handler and keeps the All tabs menu); up to 900 px each tab is one line, a 16 px icon beside the label in a 48 px tab, the row has a 32 px edge fade and scrolls with the browser's own touch scrolling, smoothly when a tab is chosen, and Refresh sits under the bar at the left with the All tabs button at the right.

How to prove the feature works end to end. The surfaces are in [contracts/ui-contracts.md](contracts/ui-contracts.md) and the state in [data-model.md](data-model.md).

## Prerequisites

- Node ≥ 22, `npm install` done, PostgreSQL available for the project's tests (the suite starts its own embedded one).
- A desktop browser whose window can be dragged from 1400 px down to 640 px (developer tools can set the width precisely).
- Three sessions to compare: a guest, a signed-in member with the creating permissions, and a signed-in member without them. Give the member a long user name for one of the checks.

## Automated

```powershell
npm run build
npm test
npx vitest run tests/m3-assets.test.ts tests/pages.test.ts tests/single-column-sheets.test.ts tests/client-header-fit.test.ts tests/single-row-header-sheet.test.ts
```

Expected: all green. The new tests fail if the ladder order, the clearing of the attribute on a phone, the copying of typed terms or any rule of the sheet is reverted.

## Manual: the header from 1400 px to 640 px

Open `/` and, one by one, `/login`, `/create-account`, `/profile`, `/admin`, `/admin/poll/results?PID=…` and a refused admin page. At each of **1400, 1024, 900, 768, 700, 640 px**:

1. **One row (US1, SC-001)**: the header is one row high; the tab bar does not jump when the search box disappears.
2. **Name first (US2, SC-002)**: as a signed-in user, the user name disappears before the search box; the avatar is still there and its menu is unchanged.
3. **Search next (US3, SC-004)**: when the search box is gone, open the Search tab on the home page: the field is at its top; type terms, press Enter, results appear; "/" focuses the field. Type terms in the header box first, narrow the window: they are in the field; widen it: they are in the header box.
4. **Guest (US4, SC-003)**: signed out, the header stays one row down to 640 px; there is no Create Poll link; the logo mark never goes; Log In and Create Account to Vote stay.
5. **Member who may create polls (FR-004)**: the Create Poll link is there and is never hidden; the logo mark never goes. A user who may not create polls has no link.
6. **Re-fit (US5, SC-006)**: sign in and out at a width where the two headers differ; widen the window: the hidden parts return in reverse order, with no reload; zoom the page to 150%: the header stays one row.
7. **Unchanged (SC-005, SC-007)**: at 1400 px each header is as before; below 640 px the page is as after feature 030.

8. **Tabs (FIX02)**: on the home page the tabs are the phone size at 900 px and narrower, and at their normal size at 901 px and wider.
9. **Tab row (FIX03)**: at 900 px and narrower the home page shows the arrows, and the all-tabs button (three dots and three lines) flush left with Refresh flush right on one row under the tabs, also on Live Results (button alone); the menu opens from the left under that row; the right arrow sits at the tab bar's right edge; at 901 px and wider none of these show. From 640 to 900 px the tab bar keeps its edge fade beside the arrows; at 639 px and below the fade is off.
10. **Guest buttons (FIX05)**: signed out, at 900 and at 500 px, Log In and Create Account to Vote are as high as a poll card's Vote button and their text is the same size (32 px at 900 px, 21 px at 500 px).
11. **Create Poll position (FIX09)**: as a user who may create polls at 700 px, with the search box hidden, the Create Poll link sits at the right with a normal gap to the avatar, not in the middle of the row; with the search box showing, the box keeps its width.

## Before pushing

Push to `dev` deploys. The header change reaches every visitor at 640 px and wider. Check the seven pages above first.
