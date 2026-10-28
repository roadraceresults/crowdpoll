# Contract: user interface

## C1 — Tab bar
Order and labels (Title Case, "you/your"): **Your Polls · Shared With You · Your Votes · Trending · Newest ·
Watching · Live Results · Search**. `data-tab`: `your-polls`, `shared-with-you`, `your-votes`, `trending`, `newest`,
`watching`, `live`, `search`. Trending is active on load. `.tab-bar` keeps its single sideways-scrolling row.
Guests: the four personal tabs are `aria-disabled` and send to sign-in, as today. Signed-in users always see all
eight, whatever their permissions.

The bar is a `role="tablist"`; each tab carries `role="tab"`, `id="tab-<name>"`, `aria-controls`, `aria-selected`
and a roving `tabindex`; each panel is a `role="tabpanel"` labelled by its tab. Arrow keys, Home and End move
focus and Enter or Space activates. On the home page only (the admin view tabs keep their text-only 48px tabs, centred in the cards' 420px column), tabs are M3 scrollable tabs: icon over label, 64px tall, 90px minimum
width, the selected tab scrolled into view, an edge fade where tabs are cut off.

## C2 — Icons
Your Polls: the person icon from My Private Polls. Shared With You: people silhouette. Your Votes: check mark
(both in the existing 64×64 circle style). Watching: the eye (`watching-icon.svg`). Eye symbols are defined once in
`index.html` and referenced with `<use>`.

## C3 — Watch control
`.bookmark-btn` keeps its class and `aria-pressed`. Off: outline eye, grey `#9AA197`, label `Watch`. On: filled
eye, ink `#1E2422`, label `Watching`, tooltip `Stop watching this poll`. No red, no slash, no bare count. Hidden
(not disabled) when the overlay's `mayWatch` is false or the Live Results tab hides it as today. Shown on Shared
With You and Your Polls cards (the old `showBookmark: false` is removed).
The eye symbols draw in `currentColor`, so the tab icon follows the tab's colour and the card button gets its grey and ink from the button's own `color`.

## C4 — Cards
Your Polls: no "listed because" line. Unlaunched states show the state in Title Case (+ rejection reason when
Rejected), no vote control; Archived read-only. Other tabs: "You opened the link" · "You were invited" · "You
voted" · "You are watching". Shared With You has no remove/hide control.

## C5 — Placeholder card
"Shared by <name>" or "Shared with you"; no title, subtitle, choices, counts, results, Vote, Live Results or Watch.
Becomes the ordinary card on the tab's next refresh.

## C6 — Landing
On load the client reads `open`, `tab`, `notice` (fixed values only), clears them from the address, selects the tab,
maximizes the card if present, else fetches `GET /api/me/polls/{pid}` and mounts a retained card (closing removes it).
Notices (fixed text, shown with `Tabs.notice`): `unavailable` → "That poll isn't available."; `unpublished` → "This
poll hasn't been published yet. It's waiting in Shared With You, and you can vote once it's published."

## C7 — Sign-in pages
With `?PID=` (valid) the login and create-account cards show "Sign in to see the poll that was shared with you."
and send `pid`; the invalid-link notice keeps the pid. Unchanged without a pid.

## C8 — Empty states
"You haven't created any polls yet." (+ the header's Create Poll link for `canReachAdmin` users) · "Nothing has
been shared with you yet." · "You haven't voted in any polls yet." · "You aren't watching any polls yet." No mention
of email or notifications.
