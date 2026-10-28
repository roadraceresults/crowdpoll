Start a new spec for these requirements called `018-TAB-BAR`.

# Overview
This requirements document specifies the high-level requirements for the tab bar feature.

# Design
The mockup in the image designDocs/dontTrack/tab_bar.jpg shows the proposed tab bar.  
The image is not a pixel by pixel representation of the final design, but it is a hand draawn mockup that shows the following features of the tab bar:
- the current item is rendered inside a rounded rectangle. This rounded rectangle is exactly as currently implemented.
- each item has an icon to the left of the label
- there is a grey line under the tab bar items, this line extends the full width of the browser window, even though all the other content of the webapp is centered and has a maximum width.  
  The line is 1 px thick, in the app's rule colour (`--line`, #D8DCD3), 6 px below the row. It is a rule, not a tab underline: the active item's rounded rectangle and the Refresh control both sit above it. It is drawn by the row's wrapper — the element that holds the tabs and the Refresh control and does not scroll, not the scrolling tab strip inside it — as a pseudo-element spanning the viewport width (`100vw`), so the page markup is not restructured; the page prevents that width from adding a horizontal scrollbar.
- on narrow screens the tab bar keeps its current behaviour: a single row that scrolls horizontally with its scrollbar hidden, never wrapping; the grey line stays in place beneath it whatever the scroll position; no new breakpoint is added
- the labels are in Title Case, as in the mockup: "Trending", "Newest", "My Private Polls", "Favorites", "Live Results", "Search" (today "TRENDING" and "My PRIVATE POLLS" are capitalized; they change)

All the icons in the tab bar are SVGs generated specifically for this application. The icons are not from a third party library. The icons are designed to be simple and clear, and to be visually consistent with each other.  

Icon size and spacing: every icon is drawn in a 16×16 px box (the size of the header's search icon), with a 6 px gap between the icon and the label; the icon and the label are vertically centred on one line. The Live Results bars keep their 14 px height on the card, aligned to the bottom of the 16 px box.  

Where the icons live: every icon is inline SVG markup in `index.html`, directly inside its tab button before the label (the Live Results icon is the Poll Card's `.live-bars` markup), the way the page's existing icons are done. No sprite, no separate files, no `<img>`, and no change to the build's asset fingerprinting. The My Private Polls icon is an inline copy of the shapes in `avatar-default.svg`; a comment in that file notes the copy.  

Accessibility: the icons are decorative — each SVG carries `aria-hidden="true"` and `focusable="false"`, and each tab's accessible name remains its visible label text, exactly as today. The Newest icon's "!" is never announced.  

Icon colours: the Trending and Search icons take the colour of their label (`currentColor`) — the muted grey of an inactive tab, and the dark moss of the active tab's text inside the rounded rectangle. The My Private Polls icon keeps the default avatar's own two colours, as in the header. The Newest, Favorites and Live Results icons use the colours stated in their sections below.  

## Trending Icon
The icon to the left of the "Trending" label is shown in the image designDocs/dontTrack/trendingupicon.jpg.

## Newest Icon
The icon to the left of the "Newest" label is an appropriately sized circle with an Exclamation Mark "!" in italics inside it.  
The circle is filled with a light grey color, and the Exclamation Mark is black.  
The bubble shape drawn in the mockup is superseded by this description: the icon is a plain circle, with no tail.

## My Private Polls Icon
The icon to the left of the "My Private Polls" label is the same default avatar icon shown in the header.  
It is always the default avatar (the shapes of `avatar-default.svg`), for guests and signed-in users alike — never the user's own profile avatar.

## Favorites Icon
The icon to the left of the "Favorites" label is a star identical to the star in the "Add to Favorites" icon on a Poll Card, except without the tag, just the star. The star will be grey with no fill.

## Live Results Icon
The icon to the left of the "Live Results" label is the exact same three bar chart icon that is used in the "View Live Results" button on a Poll Card. It is animated in the same way, with the three bars moving up and down in a continuous loop.  
The loop runs at all times — whichever tab is active, and while the item is disabled for a guest (it dims with the item but keeps moving). It stops when the visitor's system asks for reduced motion (`prefers-reduced-motion: reduce`), exactly as the Poll Card's icon does.

## Search Icon
The icon to the left of the "Search" label is a magnifying glass, identical to the magnifying glass icon used in the "Search CrowdPoll" field in the header.

# Functional Requirements
The tab bar has six items, in this order from left to right, as in the mockup:  
Trending, Newest, My Private Polls, Favorites, Live Results, Search.  
(Today Search precedes Live Results; the two swap places.)  
Clicking an item in the tab bar, that currently exists, performs the exact same function as currently implemented.  
The only new item is the "Newest" item, which is described in the Exclusions section below.


# Assumptions

# Exclusions
- **Newest** The "Newest" item on the tab bar will be rendered in its final appearance.
However, in this current implementation cycle, it will simply display an empty list of polls.
A subsequent requirement will describe the actual functionality of clicking on the "Newest" item.  
In this cycle: guests may open the Newest tab (it is not gated behind sign-in, like Trending); clicking it sends nothing to the server; the Refresh control is disabled while it is the active tab; and its panel shows an empty poll grid with no message of any kind.

