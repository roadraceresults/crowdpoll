Start a new spec for these requirements called `20261023-155959-PHONE-TAB-BAR`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

We are going to try to improved the Tab bar on the Phone interface.  
It still doesn't have a good UX.  
The Phone interface here means every width up to 900 px, wherever the row has arrows today.  
Wider screens, above 900 px, keep today's tab bar.  

Let's try mimicing what is done on Polymarket.com.
That site is actually quite similar ion purpose as CrowdPoll.vote. 
It is well-designed and has a clean, intuitive interface, which makes it a good reference for improving our own Tab bar UX.

The image below shows how it appears:
![Polymarket Tab Bar](tab-bar-example.jpg)

We will put the tab icon to the left of the text.  
The icon will need to be smaller than it is now. 
The icon is 16 px, 6 px from a 14 px label, both vertically centred.  
A tab is 48 px tall, with 12 px of padding on each side, and its 14 px label has normal letter spacing.  
The active tab keeps today's marker: a green label and a 3 px green underline, spanning the icon and the label.  
We will not have any arrows but rather the tab text and icon will be blurred when on the edge of the bar.  
Blurred means a fade, as on Polymarket: at an edge where more tabs wait, the last 32 px go from opaque to transparent.  
The All tabs menu button and the Refresh button stay under the bar, but switch places: Refresh on the left, the All tabs menu on the right.  

Additionally, the tab bar should have smooth scrolling behavior, allowing users to easily navigate through tabs without abrupt jumps.
Smooth scrolling means:  
- a finger swipe uses the browser's own touch scrolling, with momentum; the script's drag no longer handles touch;  
- choosing a tab, by tap or keyboard, or from the All tabs menu, scrolls it fully into view smoothly;  
- there is no scroll snapping, so the row stops where the finger leaves it;  
- with reduced motion, every move is instant.  

Without arrows, the row can still be scrolled with a mouse:  
- a mouse or pen can drag the row, as today;  
- a vertical mouse wheel over the row scrolls it sideways while it can move, and scrolls the page otherwise;  
- the keyboard behaviour is unchanged.  
