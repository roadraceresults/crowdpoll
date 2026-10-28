# Quickstart: Phone Tab Bar

## 1. Automated checks

```sh
npm test
npm run build
```

The suite covers: the stylesheet rules (one 900 px block for the bar, no tab rule in the phone block, the 32 px fade
variable, the row tab wrapped to its longest word and at least 48 px tall with 16 px icons, smooth scrolling and its two exceptions, the swapped buttons), the
drag with a mouse and a pen, a touch pointer left to the browser, the wheel scrolling the row while it can move and
letting the page scroll otherwise, the All tabs menu, the keyboard scrolling the focused tab into view, and the page
still serving `tabBarScroll.js` with no arrow buttons in the markup.

## 2. Phone check in a browser

Run `npm run dev` (`devScripts/launch-dev.ps1`), open `http://localhost:8080/` and use the browser's device toolbar.

1. **390 px** (a phone): one row of tabs, small icon left of each label, Your Polls, Your Votes, Live Results and
   Shared With You (Shared / With You) on two left-aligned lines in an 11 px label 2 px from its icon, every tab 48 px tall, the underline from the icon's left edge, 3 px of space above the logo, no arrows;
   the first tab's icon
   starts under the left edge of the logo above. The right edge fades;
   the left does not. Swipe (drag with the touch pointer on): the row glides and both edges fade; at the end only the
   left edge fades. Tap "Watching" while it is half under the fade: it slides fully into view, clear of the fade.
2. **Refresh and All tabs**: Refresh is under the row at the left, the All tabs button at the right, each flush with
   the edge of the cards below (at 390 px the page's 14 px padding; at 591 px the centred card's edge, about 85 px
   in; at 700 px the 20 px padding), and in the same place on an empty tab; its menu opens below it, right-aligned
   with the button, lists the eight tabs with the current one marked; picking "Your Polls" glides the row back
   to the start. Open Live Results: Refresh is hidden, the menu button stays. Signed out, Log In and Create Account
   To Vote start in the row just right of Refresh, nothing peeking in at the left edge.
3. **Keyboard**: focus a tab, press → repeatedly: focus moves and the row glides to show each tab; Home and End as before.
4. **Reduced motion** (emulate `prefers-reduced-motion: reduce`): every move is instant.
5. **Dark mode** (emulate `prefers-color-scheme: dark`): the fade shows the dark background.
6. **640 px, 700 px and 900 px**: the same bar as at 390 px. **901 px and 1400 px**: today's bar, 64 px stacked tabs,
   24 px icons, no buttons under it, the first tab's icon under the logo's left edge.
7. **Rotate / resize** across 900 px without reloading: the bar switches designs; the page's top padding follows the
   bar's height (no card hides under it).
8. **Mouse at 800 px** (device toolbar off, window narrowed): the wheel over the row scrolls it sideways; at the end
   the wheel scrolls the page; dragging the row moves it and releasing over a tab does not select it; a plain click does.
9. **Guest**: signed out, the personal tabs are greyed and still fade and scroll; tapping one goes to `/login`.

## 3. Nothing else

No server, route, setting, data or migration change; no other page changes. `README.md` and `ARCHITECTURE.md` are
regenerated in the final tasks phase (constitution, Documentation Deliverables).
