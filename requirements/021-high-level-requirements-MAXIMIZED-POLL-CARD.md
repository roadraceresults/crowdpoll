Start a new spec for these requirements called `021-MAXIMIZED-POLL-CARD`.

# Overview
This requirements document specifies the high-level requirements for a Poll Card view that maximizes the space available for the Poll Card, while still providing access to the other features of the CrowdPoll webapp.  

# Design

## Selecting A Poll To Be Maximized
Every Poll Card will have two ways to select the Poll to be displayed in a maximized view.  

### Title and Subtitle Click
The first way to maximize a Poll is to click the title or subtitle of a Poll (not maximized).  
When the user mouses over the title or subtitle, the cursor will change to a pointer to indicate that it is clickable.  
The title and subtitle will be underlined when the user mouses over them.  
The title and subtitle open the maximized view from either face of the card (front or back). They stay text: they are operated by mouse and touch, and the Maximize icon is the keyboard route.  

### Maximize Icon Click
The second way to maximize a Poll is to click the Maximize icon in the upper right corner of the current Poll Cards (not maximized).  
The Maximize icon will push the Bookmark icon to the left to make room for the Maximize icon.  
The space between the Bookmark icon and the Maximize icon will be a small gap. This is left to the AI to determine the size of the gap.  
When the user mouses over the Maximize icon, the cursor will change to a pointer to indicate that it is clickable.  
A jpg of the Maximize Icon is in the file:  
`designDocs/dontTrack/maximizeIcon.jpg`
Convert this image to a svg and place it in the file:
`designDocs/dontTrack/maximizeIcon.svg`
The svg should have just 1 color which is the black for the rounded rectangle (with a box in the lower left corner) and arrow.
Every color that isn't white should be converted to black.
Every pixel that is white should be converted to transparent background.
The svg should be rendered the same size as the Bookmark icon.
The svg file will be used to embed an inline SVG in:
`src/public/pollCard.js`  
The inline copy fills with `currentColor`. The icon's colour and states (FIX02):  
- Normal: icon `#202020`.  
- Hover: the same icon on a light grey background (`rgba(0,0,0,0.06)`).  
- Mouse-down: a slightly darker background (`rgba(0,0,0,0.12)`).  
- Keyboard focus: the light grey background and a focus ring, the same ring the X uses.  

The svg file itself stays black on transparent.  
The gap between the Bookmark icon and the Maximize icon is 4px.  
The Maximize icon is a button with the `aria-label` and tooltip (`title`) "Maximize Poll Card".  
On tabs where the Bookmark icon is hidden (My Private Polls), the Maximize icon sits alone at the right of the title row.  
When the card is maximized, the same button becomes a **Minimize** icon: the same drawing with the arrow pointing the opposite way (down and to the left, into the box), with the same states, and `aria-label` / tooltip "Minimize Poll Card". Pressing it closes the maximized view, as the X does (FIX02).  
Guests may maximize a Poll Card. In the maximized card, Vote, Bookmark and Live Results still send guests to sign in, as they do now.  

## Appearance of the Maximized Poll Card
The maximized poll card will be rendered according to the stand-alone Poll Card layout in html/css/js in the files:
`research/MAXIMIZED-POLL-CARD/SINGLE-CARD-LAYOUT`  
Note:  
- the stand-alone layout isn't functional, the current implementation of the maximized Poll Card in the CrowdPoll webapp will function as it does now
- the stand-alone layout resizes the Poll Card so that all bars fit without scrolling
- the current Poll Card adds scrolling to the Poll Card if the bars don't fit in the available space, that won't be needed in the maximized version
- it has hardcoded values for the Poll title, subtitle, choices and percentages, this content will be replaced with the actual Poll data when the maximized Poll Card is implemented in the CrowdPoll webapp
- its purpose is to show the layout of the maximized Poll Card and to provide a starting point for the implementation of the maximized Poll Card in the CrowdPoll webapp 

In the Maximized Card, the class="maximized-card-grid" div in the stand-alone layout will replace the class="card-grid" div in the current implementation of the Poll Card in the CrowdPoll webapp.  
"Replace" means on screen: `.maximized-card-grid` is a sibling of the tab's `.card-grid` in the same tab panel. It is shown while `.card-grid` is hidden, and every card in the grid stays mounted.  
The maximized classes are added to the card's elements **in addition to** their own (`card-viewport maximized-card-viewport`, `card-flip maximized-card-flip`), so every existing `.card-viewport` / `.card-flip` rule and lookup keeps working. The maximized rules override only what differs. The page shell keeps its names: `.container` and `.layout` are not renamed.  
The poll data will be rendered in the maximized Poll Card the same way it is rendered in the non-maximized Poll Card, including the colors and fonts this document introduces (see "Impact on the Non-maximized Poll Card"),  
except that there will be no scrolling as mentioned above.  
Without scrolling, the maximized card's bar height follows the number of choices: 50px at `ENV_MIN_CHOICES`, falling linearly to 25px at `ENV_MAX_CHOICES`, with a fixed 2px gap between bars (the stand-alone layout's `barHeightFor` and `RESULTS_GAP_FIXED`). The card grows to fit its bars, and the page scrolls.  
The poll data will be rendered in the class="maximized-card-flip" div in the stand-alone layout, which will replace the class="card-flip" div in the current implementation of the Poll Card in the CrowdPoll webapp. 

The stand-alone layout has a class="maximized-space-right" div that currently has "Lorem ipsum" text as a placeholder for now.  
The next requirements document will specify what content will be displayed in this space.  
Keep the "Lorem ipsum" text in the maximized Poll Card for validation of the layout, until the next requirements document is completed.  

The width floor of the card and of the side panel is `min(375px, 100%)`, not a plain 375px, so neither overflows the page on a phone. The side-by-side widths are otherwise unchanged.  

What is carried from the stand-alone layout: the markup structure, the `.maximized-*` rules, the rule between the columns and its container query, the close row and its X, the Lorem ipsum panel, `barHeightFor` with `RESULTS_GAP_FIXED`, and the color technique (`RESULTS_PALETTE_ENTRIES`, `darkShadeOf` and its contrast helpers, the semantic tint and the white text clipped to the fill).  
What is not carried: the `#back` hash and `showFace`, `single-card-back.html`, the `'halo'` text mode, `rowGapFor` and its bounds, the hard-coded `ENV_MIN_CHOICES` / `ENV_MAX_CHOICES` (the client's configuration supplies them), the frozen inline bar sizes, and the estimated truncation (the card's measured truncation stays). The palette's first two entries are restored to robin's egg blue `#98EFF9` and pale peach `#FFE5AD`.  

# Functional Requirements
When the Maximize icon in a non-maximized Poll Card is clicked, the maximized Poll Card will be displayed in the exact same location (current tab) as the non-maximized Poll Card.  
When the "X" icon is clicked in the maximized Poll Card, the content of the current tab will be rendered (with no maximized poll cards) as it was before the maximized Poll Card was displayed.  
The user can also click the current tab to display the content of the current tab (with no maximized poll cards) as it was before the maximized Poll Card was displayed.  

The maximized Poll Card functions the same as the current Poll Card, except that it is maximized and there is no scrolling of the Poll Card.

### Entering and leaving the maximized view
- **The same card.** The maximized view shows the tab's own card instance, moved into the view and moved back when it closes. It carries its face (front or back), any selection made but not yet submitted, any vote notice and any vote error, both ways. It keeps receiving the tab's live updates, votes and bookmarks.
- **Entry points inside the view.** While maximized, the card's Maximize icon shows its Minimize form, which closes the view like the X, and its title and subtitle have no pointer, no underline and no click.
- **Clicking the current tab** while a card is maximized only restores the grid. It sends no request and spends no refresh allowance. The next tab click, the Refresh button or the tab's own timer refresh the tab as usual. The Refresh button, pressed while maximized, refreshes the tab, and the maximized card updates in place.
- **Other exits.** The maximized view belongs to the tab it was opened in. Clicking another tab, submitting a header search, or signing in or out closes it, so returning to the tab shows its grid. If the poll leaves the tab's listing because the visitor removed it (from Live Results, or un-bookmarked on Favorites), or because it was deleted, rejected or is no longer accessible, the view closes at once and the tab shows its grid without the poll. When a Trending or Newest recompute drops it, the view stays open and the card keeps working until the visitor closes it; those two tabs cannot tell a deletion or rejection from a recompute, so the same applies to them there. Focus follows the existing rules: 020's rule on Live Results, otherwise the tab's first card or its empty-state line.
- **Escape** closes the maximized view, like the X and the Minimize icon.
- **Focus.** On opening, focus moves to the X. On closing with the X, the Minimize icon, Escape or the current tab, it returns to that card's Maximize icon, or to its title when the card is on its back face as the view closes (whichever face it was opened from). A close caused by leaving the tab (another tab, a search, signing in or out) moves neither focus nor the scroll position, because the tab's content is about to be hidden.
- **Scroll position.** On opening, the top of the tab panel is brought into view. On closing, the window's scroll position from before opening is restored.
- **No address.** The maximized view has no URL and no browser-history entry. The X, the Minimize icon, the current tab and Escape close it within the page. The stand-alone layout's `history.back()` in `closeMaximizedCard` is replaced.

## Impact on the Non-maximized Poll Card
A major part of the research done to develop the Maximized Poll Card involved how colors and fonts are assigned to the bars in the Poll Card.  
This technique of assigning colors and and fonts must be applied to the non-maximized Poll Card as well, so that the colors and fonts are consistent between the maximized and non-maximized Poll Cards.  
The size and spacing of the bars in the non-maximized Poll Card will remain the same as it is now, but the colors and fonts will be changed to match the maximized Poll Card.

- **"Fonts"** means the text color and text shadow of each bar's label and percentage. The typeface (Inter), weight (600), size (scaled 7–11px by bar height) and padding do not change.
- **The whole technique applies, Yes/No included.** Each palette bar's fill comes from `RESULTS_PALETTE_ENTRIES`, and its label and percentage are drawn in a very dark shade of that fill (at least 7:1 against it), with no halo. Yes/No bars use the semantic colors on a pale tint of their own color, with text that is white over the fill and dark over the tint.
- **The Yes color is `#018826`**, not the research's `#019529`: white text reaches 4.61:1 on it, meeting WCAG AA's 4.5:1. The No color stays `#CF0234` (5.66:1). White text on a semantic fill must reach 4.5:1, alongside the palette's 7:1 rule.
- **The white text follows the fill's animation.** The fill grows to its width over 0.9s. The white copy of a Yes/No bar's text is clipped to the fill's current width throughout, with the same duration and easing, on every render and refresh, including the in-place update path.
- **The old rules are retired.** `textStyleFor`, `majorityBackground`, the 0.40 luminance threshold and the black/white halo shadows are removed. `RESULTS_TRACK_COLOR` and the dark trailing edge on each fill (009 FR-012) are kept. 009's and 010's spec folders get a note that 021 supersedes their palette, Yes/No colors and ink rule.
- The vote rows on the back face keep their two flat colors. The admin pages are not affected.

# Assumptions

# Exclusions

