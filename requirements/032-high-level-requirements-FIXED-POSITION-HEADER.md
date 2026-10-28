# 032 — High-Level Requirements for Fixed-Position Site Header

## Fixed-Position Site Header Requirements
At all widths, 
the site header and Tab Bar and, if it exists, the row with the Hamburger Menua and Refresh icon 
must remain fixed at the top of the viewport, regardless of scrolling.

## Back to Top FAB Requirements

In Material Design 3 (M3), the most appropriate control for a "Back to Top" action is a Floating Action Button (FAB) with an upward arrow icon.

- Icon: arrow_upward from Material Symbols.
- Position: Fixed near the bottom-right corner, approximately 16–24 px from the edges.
- Visibility: Only appear after the user has scrolled down significantly (e.g., 500–800 px).
- Behaviour: Scroll to the top when clicked. The FAB disappears when they return near the top.
- Tooltip: "Back to top".
- Accessibility: Give it an accessible label such as aria-label="Back to top".

## Decisions (from the architecture review)

- **"If it exists" applies uniformly.** Each page keeps fixed whatever top chrome it actually has: the site header is always fixed; the Tab Bar (and, within it, the row the Hamburger Menu and Refresh icon form below 640 px) is fixed only on the page that has one. No page gains elements it doesn't already have.
- **Reserved space, measured live.** Pulling the fixed chrome out of normal document flow would otherwise let page content slide up underneath it. The page content reserves space equal to the fixed chrome's actual rendered height, not a hardcoded constant, and that space is re-measured whenever the chrome's height changes (viewport resize, session change, or the narrower-width Hamburger/Refresh row appearing).
- **Opaque background.** The fixed header and Tab Bar have an opaque background, so content scrolling underneath is never visible through them.
- **Nothing lands behind the fixed chrome.** Maximizing a poll card's results view, and the guest "Login"/"Create Account to Vote" floating buttons' draggable area, both account for the fixed chrome's height, so neither can end up positioned underneath it.
- **FAB margin is from the viewport edges**, not from the edges of the page's centered content column.
- **FAB scroll distance is measured from the top of the document**, with two concrete thresholds rather than a range or a single toggle point: it appears once the user has scrolled 600 px, and disappears once they've scrolled back up past 400 px (the gap avoids flicker right at one boundary).
- **FAB icon is an inline SVG upward arrow**, matching every other icon already in the product, rather than a Material Symbols font glyph.
- **The FAB appears on all seven pages** (home, admin, admin results, profile, login, create account, not authorized), injected identically everywhere, rather than only the pages whose content is normally long enough to need it.
- **The fixed header and Tab Bar keep the page's existing centered content column** (the same max width and side padding as the rest of the page content uses today), rather than painting an edge-to-edge band across the full viewport width. On wide screens, the page's bare background stays visible on either side, exactly as it already looks today.

