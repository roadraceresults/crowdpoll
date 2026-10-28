# 031 — Single Row site-header

At all widths, the site header must remain a single row.  
The div is `<div id="site-header" class="site-header">`.  

## Current Implementation
When a user is not logged in, 
and when the viewport is wide enough, 
the site header contains:
- the site logo, brand-logo
- the site word mark, brand-wordmark
- header Search field, header-search
- Create Poll link 
- Login Button
- Create Account to Vote button

When an admin user is logged in, 
and when the viewport is wide enough, 
the site header contains:
- the site logo, brand-logo
- the site word mark, brand-wordmark
- header Search field, header-search
- Create Poll link 
- User Name
- Avatar Icon

When a non-admin user is logged in, 
and when the viewport is wide enough, 
the site header contains:
- the site logo, brand-logo
- the site word mark, brand-wordmark
- header Search field, header-search
- Create Poll link (if the user has "Create Poll" permission)
- User Name
- Avatar Icon

## New Requirements

When the viewport width gets narrower and the User/Avatar Icon wraps,  
then hide the username.  

Then when the viewport width gets even narrower and the Avatar Icon wraps,  
then hide the header Search field.

Any narrower than that, the Single Column mode will be activated.  


## Decisions (from the architecture review)

- **Trigger.** A stage applies when the header's own content overflows its row (`scrollWidth > clientWidth` of `#site-header`), not at fixed viewport widths. The item that would wrap is the last one in the row: the user cluster for a signed-in user, *Create Account to Vote* for a guest.
- **Stage 1.** The user name is hidden with `display:none`, as the phone rule does. The avatar and its menu are unchanged.
- **Stage 2.** The header Search field is hidden, and the Search tab field is shown in its place whenever the header field is hidden (at any width). `/` follows whichever field is on screen.
- **Single Column** starts at the fixed 639.98 px of feature 030. Below it, the 030 rules apply. Above it, the two stages operate.
- **Re-measuring.** Every evaluation starts from the full state and runs on resize, on a rebuilt header and when fonts have loaded. The stage lives in `data-header-fit` on `<html>`, because the header's own class is overwritten on every rebuild.
- **Search box width.** It has a tunable minimum width of 200 px (`--header-search-min-width`); it is hidden when that no longer fits.
- **Row.** `flex-wrap:nowrap` at all widths; the existing rule that puts the search box on its own row from 640 to 767 px is overridden.
- **Still no room (mostly guests).** After the search is hidden, nothing more is hidden. The logo mark (FIX08) and the wordmark are never hidden at any width, phone included; the guest buttons are tightened from 641 to 900 px (same height, text size and side padding as a poll card's Vote button) so a guest's row fits.
- **Create Poll link (FIX07).** The header has a Create Poll link only for a user who may create polls (an administrator, or a user with both Create Poll and View Polls). A guest and a user without permission have no link, so no step hides it, and the link is never hidden for a user who may create polls above 640 px.
