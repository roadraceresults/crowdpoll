# Quickstart: Fixed-Position Site Header

How to prove the feature works end to end. The surfaces are in [contracts/ui-contracts.md](contracts/ui-contracts.md) and the state in [data-model.md](data-model.md).

## Prerequisites

- Node ≥ 22, `npm install` done, PostgreSQL available for the project's tests (the suite starts its own embedded one).
- A desktop browser whose window can be dragged from 1400 px down to 375 px (developer tools can set the width precisely), and whose devtools can simulate `prefers-reduced-motion: reduce`.
- Two sessions to compare: a guest and a signed-in member, each with enough content (polls, admin rows) to scroll a page past 600 px.

## Automated

```bash
npm run build
npm test
npx vitest run tests/m3-assets.test.ts tests/pages.test.ts tests/client-fixed-chrome.test.ts tests/client-back-to-top.test.ts tests/header-fixed-sheet.test.ts tests/back-to-top-sheet.test.ts tests/client-floating-actions.test.ts tests/client-maximized.test.ts
```

Expected: all green. The new tests fail if either custom property is wrong, if the Back to Top button's thresholds or hysteresis are reverted to a single value, if either new sheet's rules go missing, or if `floatingActions.js`/`tabs.js` go back to clamping/scrolling against the literal `0`.

## Manual: the fixed header and Tab Bar

Open `/` and, one by one, `/login`, `/create-account`, `/profile`, `/admin`, `/admin/poll/results?PID=…` and a refused admin page. At each of **375, 640, 1024 and 1400 px**:

1. **Pinned (US1/US2, SC-001, SC-002)**: scroll the page's content down and back up; the header (and, on the home page, the Tab Bar, including the Hamburger/Refresh row on a phone-width window) never moves and never disappears.
2. **Nothing hidden underneath (SC-003)**: at the top of the scroll and partway down, the first visible card or row is always fully below the header — never drawn under it or clipped by it.
3. **Unchanged footprint (SC-008)**: at 1400 px, the header's left/right position and background band match today's exactly — only its "stays put while scrolling" behaviour is new.
4. **Maximize (U4)**: on the home page, maximize a poll's results from partway down a scrolled list; the maximized view's top lands just below the fixed chrome, never behind it.
5. **Guest floating buttons (U5)**: signed out, at 375 px, drag the floating Log In / Create Account pair toward the top of the screen; it stops just below the fixed header, never underneath it.
6. **Re-fit on sign-in (FR-005)**: sign in or out while scrolled down; the reserved space at the top adjusts immediately, with no visible gap or overlap.
7. **First-load shift (US clarification, SC-009)**: reload the page and watch the very first frame; any shift in where the content starts is a single, barely perceptible jump, settled well under 100 ms, that never recurs for the rest of that page view.
8. **Long unbroken title (FIX05)**: on the home page, a poll whose title is a 60-character unbroken string (e.g. `1234567890` repeated) wraps inside its card; the card stays within its grid column and never spills under its neighbour.
9. **Title wraps around its icons (FIX06)**: on the home page, at desktop width and at 375 px, a poll whose title runs to three lines shortens only its first line to make room for the Watch and Maximize icons; later lines use the card's full width, the icons sit where they did before, and a card without the Watch eye (and the voting face) leaves room for Maximize alone. The title is 20 px at most (`--md-sys-typescale-title-large-size`).
10. **Title and subtitle lengths (FIX07)**: in the Admin Poll Card Wizard, for a new poll and an existing one, the Title field stops at 50 characters and the Subtitle at 30, and the counters read `/ 50` and `/ 30`. After the server starts on a database with longer values, those polls show their first 50 and 30 characters.
11. **Bar text size (FIX08)**: on the home page, in a grid card and a maximized card with a few choices, each bar's label and percentage, and each label on the voting face, are 13 px. A card with many choices still shrinks its text with its bars.
12. **Card title at 900 px and below (FIX09)**: at 375, 640, 768 and 900 px, the title is 13.5 px on a grid card, a maximized card and the voting face. At 1024 px the grid card is back to 18 px and the maximized card to 20 px.
13. **Title weight (FIX10)**: on the home page and in the Admin Poll Card Wizard summary, poll titles are semi-bold Roboto (600), visibly lighter than bold. In the browser's network panel, the Roboto request names `wght@400;500;600;700`.
14. **Blank side panel (FIX11)**: at 1024 px and wider, a maximized card has a blank bordered panel beside it, as tall as the card, with no filler text. Below 768 px, where the panel wraps under the card, it is a short blank bordered strip.
15. **Maximize and Minimize icons (FIX12, FIX13)**: on a grid card (24 px, and 15 px on a phone) the Maximize button shows a rounded box with two arrows pointing from the middle to the top right and bottom left corners; inside the maximized view the button shows two arrows pointing from those corners to the middle. Both follow the button colour in light and dark.
16. **Maximize hint on hover (FIX15)**: with a mouse, hovering a grid card turns its Maximize icon the primary colour and pulses a ring around it, and a "Maximize Poll" label appears above the icon (FIX16); pointing at the icon itself shows its tooltip instead of the label. With reduced motion set, the ring is still. After the first maximize (icon or title), the label no longer appears on any card on that page; the pulse remains. Refreshing the page brings the label back (FIX24). On a touch screen nothing changes.
17. **Tooltips above (FIX18)**: with a mouse, rest the pointer on a card's Maximize icon for half a second; "Maximize Poll" (FIX25) appears centred just above the icon, clear of the pointer. The Watch eye, the Back to Top button and the header buttons do the same. Scroll so a control sits at the very top of the window: its tooltip shows below it instead.
18. **Cards below the icon row (FIX19)**: the Hamburger (40 px) and a 30 px Refresh sit level, right under the tab bar, in a 40 px row (FIX21, FIX22); at 375, 640 and 900 px on the home page, the first card starts below the Hamburger and Refresh icons, and scrolling slides the cards under that row (no card shows between the icons). Signed out at 375 px, "Log In" and "Create Account To Vote" start in the row just left of Refresh (just right of it since feature 20261023-155959-PHONE-TAB-BAR's TWEAKS04), covering neither icon nor any card, also straight after a reload (FIX20); they stay there on scroll, and once dragged they stay over the cards. At 1024 and 1400 px the page looks as before.
19. **Maximize pulse on a touch phone (FIX26)**: on a phone, or in DevTools device mode with touch emulation, at 375 px, every grid card's Maximize icon is in the primary colour and pulses without being touched. Maximize any card (icon or title) and close it: no card pulses any more, including cards on other tabs. Refresh the page: they all pulse again. With reduced motion set, the icons show a still glow instead. At 640 px and wider, or with a mouse, nothing pulses until a card is hovered.
20. **Maximized card height (FIX27)**: maximize a two-choice poll at 1024 px and at 375 px; the card ends just below its footer, with no empty space under the bars, and the blank side panel is as tall as the card. Flip it to the voting face: the height does not jump. A poll with many choices is as tall as its bars need.

## Manual: the Back to Top button

On any page with enough content to scroll past 600 px:

1. **Appears (US3, SC-004)**: scroll down 600 px or more; the button appears near the bottom-right corner with an upward-arrow icon.
2. **Returns to top**: click it (and, separately, activate it with keyboard Tab + Enter); the page scrolls smoothly back to the very top and the button disappears once it arrives.
3. **Tooltip and label**: hover or focus the button; the tooltip reads "Back to top"; inspect its accessible name (devtools Accessibility pane) and confirm `aria-label="Back to top"`.
4. **Hysteresis, no flicker (US4, SC-006)**: scroll slowly up and down between 400 and 600 px several times; the button's visibility does not toggle within that range — only at the two boundaries.
5. **Reduced motion**: enable `prefers-reduced-motion: reduce` in devtools, scroll down, and click the button; the page jumps to the top instantly instead of animating, and the button's own appearance/disappearance has no transition.
6. **Cookie banner coexistence**: with the cookie banner showing (a fresh session, before dismissing it), scroll down 600 px; the button sits above the banner, not overlapping or hidden behind it.
7. **Short pages**: on a page whose content never reaches 600 px of scroll (e.g., Log In with no error state), confirm the button never appears.

## Before pushing

Push to `dev` deploys. The fixed header reaches every visitor on all seven pages at every width; the Back to Top button appears on all seven. Check the pages above first, at both the widest and narrowest widths.
