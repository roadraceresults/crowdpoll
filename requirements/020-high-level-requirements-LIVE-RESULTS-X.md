Start a new spec for these requirements called `020-LIVE-RESULTS-X`.

# Overview
This requirements document specifies the high-level requirements for a small UI change that moves the 'X' icon on a Live Results Poll Card from the top right corner to the bottom row.

# Design

The mockup image in   
`designDocs/dontTrack/liveResultsX.jpg` 
show the proposed layout of the `Live Results` Poll Card.  
The 'X' icon, which is used to close the poll card, will be relocated from its current position in the top right corner  
to a new position in the bottom row of the card.   
Poll Cards on tabs other than the `Live Results` tab have a `Live Results` link with an animated 3-bar icon to the left of a `Live Results` label. 
On the `Live Results` tab, the animated 3-bar icon is replaced with an 'X' icon, which is used to remove the poll from the `Live Results` tab. 

The 'X' is a plain stroked glyph — two crossed lines in the link's own colour, no border, no background — drawn in the same 14 × 14 box the three bars occupy, so the label sits exactly where it does on every other tab and the 8 px gap between icon and label is unchanged. It is **not** the bordered 28 px icon button used for the corner 'X' and the profile card's close control: a bordered box that fills the row's height would read as a second button beside `Vote`.

The visible words stay `Live Results` in both forms. The tooltip and the accessible name follow the action: on the `Live Results` tab they read "Remove from Live Results" — the wording the corner 'X' carries today — and on every other tab they stay "Add to Live Results".

The link keeps exactly one hover treatment in both forms — the amber underline under its label — and the 'X' takes no hover, colour or size change of its own; it simply inherits the link's colour. The focus ring stays as it is today.

The 'X' is static: it has no animation in any state. The two rules that freeze the three bars — reduced-motion and the guest rule — continue to apply to the bars alone. (The `Live Results` tab is for signed-in members, so the guest rule never reaches it in any case.)

The two appearances are one control in two forms, not two controls: the icon, the tooltip, the accessible name and the action change together, and which form a tab gets is decided by whether that tab supplies a remove handler. The separate switch that showed the corner 'X' goes away with the button itself, so no tab can ask for both.

The corner 'X' is **removed outright** — the button, its styling and its spacing rules — rather than left hidden in the card for a future use: it exists for this one caller, and dead markup would ride in every card on every tab. With it gone the `Bookmark` star sits in the title row exactly as it does on every other tab, with no nudge of its own; a later feature that wants a corner control can restore it from the 017 record that introduced it.

# Functional Requirements

Clicking the proposed `X Live Results` link will perform the exact same function as clicking the 'X' icon on the current `Live Results` Poll Card.

The link is operable by keyboard in both forms: Tab reaches it, and **Enter and Space both activate it** — Space without scrolling the page. (It announces itself as a button, so it must behave as one; the corner 'X' it replaces is a real button and answers both keys today.)

Removing a poll destroys the card that holds the focused control, so focus must be placed deliberately rather than lost to the top of the page: after a removal it moves to the same link on the card that now occupies the vacated position; when no card does — the removed card was the bottom one and others remain — it moves to that link on the previous card; and when the tab is left with no cards at all, it moves to the tab's empty-state line.

On the `Live Results` tab the `X Live Results` link is shown for **every** poll on the tab, whatever the poll's state — including a poll that has closed while it was being watched and a poll an administrator has opened for editing. (Today the link is hidden in both of those states, because on every other tab it *adds* a poll and neither state may be added; the corner 'X' it replaces was always shown, so a member could always take a poll off the tab. That must stay true.) The "Poll closed on ..." and editing messages keep their place in the same row beside the link, as they do today beside the hidden Vote button.

"Whatever the poll's state" is about the poll, not the card's face: the link is a front-face control in both forms, exactly as the corner 'X' is today, and a card flipped to its voting face is returned to the front by its `Back` arrow.

What must be verified, on the tabs named:
- on every tab but `Live Results`: the link shows the animated bars, reads "Add to Live Results", and adding a poll still works as it does today;
- on the `Live Results` tab: the link shows the 'X', reads "Remove from Live Results", and activating it — by mouse or by keyboard — removes the poll from the tab exactly as the corner 'X' does today;
- a poll that closes while it is being watched can still be removed from the tab;
- no poll card on any tab carries a corner 'X' any more.
  
# Assumptions



# Exclusions

