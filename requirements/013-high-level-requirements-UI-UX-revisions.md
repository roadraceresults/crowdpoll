Start a new spec for these requirements called `013-UI-UX-revisions`.  

# Invite and Voted Labels in Participants Section
In the current implementation, for "PRIVATE - INVITATION ONLY" type polls, the "Participants" section of the 'editPoll' and 'updatePoll' includes the Invited emails.  
Yet, in the current implementation, for "PUBLIC" type polls, the "Participants" section includes those who have voted.  
This makes it impossible for the admin to know which Invited participants have voted.

To remedy this, there are three new requirements,  
one for "PRIVATE - INVITATION ONLY" polls and  
one for "PRIVATE - ANYONE WITH THE LINK" and  
one for "PUBLIC" polls.  

For "PRIVATE - INVITATION ONLY" polls, the email address in the "Particpants" section will have an " - Invited" suffix for every row.  
And another suffix " - Voted" if they have exercised their vote.  
To be clear, a row can have both suffixes if the participant has voted.  
This will require this branch to load the voted Set.  
The voted set is a subset of the invited list on an invitation-only poll, and the server
keeps it that way rather than the client assuming it. On every save, votes from banned
addresses are deleted, votes from addresses no longer invited are dropped, and every
invited address without a vote gets a placeholder. A row in the voted set that is not in
the invited list therefore cannot occur, and neither can a banned address in either list.

The results endpoint already reflects that partition. For an invitation-only poll it
returns `voted` — the addresses with real votes — **and** `notYetVoted`, the placeholders,
a field it returns for no other visibility. Between them they are the saved invited
roster, already split by the distinction the suffixes describe.

So the rows come from the invited list held in the editor, and `voted` decides which of
them also carry " - Voted". The invited list is used rather than `voted` plus `notYetVoted`
because it is the only one of the three that reflects the current editing session: an
address invited a moment ago is in the draft and in neither server field until the poll is
saved, and it must still render as " - Invited". `notYetVoted` needs no separate handling —
an invited address absent from `voted` has not voted, whether or not the server has a
placeholder for it yet.

For "PRIVATE - ANYONE WITH THE LINK" polls, the email address in the "Particpants" section will have the suffix " - Voted" for every row.  

This will require all poll types to load the voted Set for the poll.  

One row format serves all three poll types. Currently the "Participants" list renders a
voter as:  
userName <emailAddress>  
This will now change to:  
emailAddress <userName>  

The address leads on every row of every poll type, because the address is what the suffixes
describe and what the list is now sorted by. The display name follows it in angle brackets —
literal `<` and `>` characters in the rendered text — whenever one is known.

A display name is known for anyone who has voted, since the voted set carries it, so
link-only and public rows always show one. It is unknown only for an address that was
invited and has not voted: that address may belong to no account yet, so there is no name
to show and the row is the address and its suffix alone.

As a result, for "PRIVATE - INVITATION ONLY" polls, for a user who has been invited but hasn't voted, the userName will not be known.
So that row will appear as follows:  
emailAddress - Invited
If the user has voted, the row will appear as follows:
emailAddress <userName> - Invited - Voted  

For "PUBLIC" polls, the email address in the "Particpants" section will have the suffix " - Voted" for every row.  

To keep sorting consistent, the "Participant" list for all poll types will be sorted by email address.

The comparison is code-point order on the lower-cased address — a plain `<`, not
`localeCompare`. Two admins looking at the same poll see the same order regardless of their
browser's locale, which `localeCompare` would not guarantee: it orders by the viewer's
locale, so the same roster could read differently on two machines. The list being compared
is one both admins may be reading to each other.

Case never varies in practice. Addresses are lower-cased on entry everywhere they can enter
— account addresses by the API, invited addresses both server-side and in the editor's
invite box before they reach the draft, and voted addresses on the wire — so folding the
case in the comparator is a no-op today. It is specified anyway, so the order stays stable
if a future path ever admits an address that skipped normalisation.

The Banned Voter List keeps its current rendering. It takes the same sort rule, which is
already what it does — a bare comparison over addresses that are lower-cased — so stating it
removes a second comparator rather than changing an order. Nothing else about those rows
changes: no display name, because a banned address has none to show, and no suffix, because
both would be false on every row. Banning removes the invitation and does not restore it on
un-ban, and it deletes the vote on save, so a banned address is by construction neither
invited nor a voter. The Un-ban control stays where it is.  

# Change Add button to Invite
Also, it will be more accurate if the "Add" button for adding Invited Email addresses is named "Invite".

# Header Changes
In the header, clicking the site Icon  or the CrowdPoll logo will navigate to the home page.

In the header, the "Search" box will be renderd left justified with the Site Icon and logo at the far left.  
The "Create Poll" link will be right justified, with the user name and avatar at the far right.

The header reorder is source order alone  
Move .header-nav after .header-search in SITE_HEADER_MARKUP.   
No spacer element,  
no margin-left:auto,  
no change to justify-content:space-between.  
.header-search keeps flex:1 1 auto and its 640 px cap;  
it is the only flexible child,  
so it absorbs the slack and separates the two clusters on its own.   

# Cards for Login, Create Account and Profile
## Login Page Card
The login page will have a card that has the style of the Poll card on the home page, except that it will be sized appropriately to fit the contents.  
Extract a card shell; do not reuse POLL_CARD_TEMPLATE — see "Card Shell Rendering" below.  

The Login card will be centered horizontally.  
The title will be "Login" which will be rendered in style like the title of a poll card.  
The text "No passwords here - we email you a one-time sign-in link." will be rendered in the style of the subTitle.  
The "Email address" label and the text box, and the check box for "Stay signed in on this device",  will be rendered where the bars on the poll card are. 
The "Email me a login link" button will be rendered in style as the "Vote" button is on the poll card.  

There will be an 'X' icon in the top right of the card, to the right of the title.  
It reuses the poll card's `.icon-btn` chrome — the 28 px bordered chip from `pollCard.css` that the card's back control uses — carrying an × glyph rather than that control's arrow.  
It is an anchor with `href="/"`, not a button, per the navigation rule below; see "Card Shell Rendering" below for its accessible name and keyboard behaviour.

The card for the Login will have no back-side.  
The "Email me a login link" button will be right justified in the style of the "Vote" button on the poll card.    
The "Email me a login link" button and the "Stay signed in on this device" checkbox and its label are unavailable until the user begins entering text in the "Email address" field, and become unavailable again if that field is cleared. A blank submission is not something the user can attempt and then be refused for.

The "Email me a login link" button click awaits the response and does not navigate away. On success the card stays and its status line reads "Check your inbox — click the link we sent you to sign in", and the button becomes unavailable so the same link cannot be requested twice. On 429 or 400 the card stays and renders the reason.  

When clicking the link in the email, a new browser window will be opened.  
The window that requested the link is kept current rather than left orphaned in the
logged-out state; see "Session State Propagation Across Open Windows" below.  


## Create Account Page Card
The "Create Account" page will have a card that has the style of the Poll card on the home page, except that it will be sized appropriately to fit the contents.  
Extract a card shell; do not reuse POLL_CARD_TEMPLATE — see "Card Shell Rendering" below.  

The "Create Account" card will be centered horizontally.
The title will be "Create Account" which will be rendered in style like the title of a poll card.  
The text "Enter your email address — we'll create your account and email your first sign-in link." will be rendered in the style of the subTitle.  
The "Email address" label and the text box, will be rendered where the bars on the poll card are.    

There will be an 'X' icon in the top right of the card, to the right of the title.  
It reuses the poll card's `.icon-btn` chrome — the 28 px bordered chip from `pollCard.css` that the card's back control uses — carrying an × glyph rather than that control's arrow.  
It is an anchor with `href="/"`, not a button, per the navigation rule below; see "Card Shell Rendering" below for its accessible name and keyboard behaviour.  

Clicking that will navigate back to the home page.  
The card for the "Create Account" page will have no back-side.
The "Create Account" button will be rendered right justified in the style of the "Vote" button on the poll card.
The "Create Account" button is unavailable until the user begins entering text in the "Email address" field, and becomes unavailable again if that field is cleared.

The "Create Account" button click awaits the response and does not navigate away. On success the card stays and its status line reads "Check your inbox — click the link we sent you to activate your account", and the button becomes unavailable. On 429 or 400 the card stays and renders the reason.

Navigating home on success would discard the only place that instruction can appear — the same defect "Session State Propagation Across Open Windows" and "Verification Landing Without a Session" exist to fix elsewhere in this document. The person leaves by the 'X' or the brand link when they are ready.
When clicking the link in the email, a new browser window will be opened.
The window that requested the link is kept current rather than left orphaned in the
logged-out state; see "Session State Propagation Across Open Windows" below.  


Two different back controls exist in this app and the shell borrows only one:  
`.icon-btn` from the poll card for the cards' close controls, and `.admin-back-link` from the admin pages for the admin back arrow.  
They are not interchangeable — one is a bordered chip, the other is borderless.  


## Edit Profile Page Card
The "Edit Profile" page will have a card that has the style of the Poll card on the home page, except that it will be sized appropriately to fit the contents.  
Extract a card shell; do not reuse POLL_CARD_TEMPLATE — see "Card Shell Rendering" below.  

The "Edit Profile" card will be centered horizontally.    
The title will be "Profile" which will be rendered in style like the title of a poll card.
There will be no text where the subTitle of the poll card is.  
The user's avatar will be rendered right justified beneath the title.  
The avatar occupies the subtitle slot, right-aligned.  
In the area where the bars are on the poll card will be the following elements:  

 ---------------------------------- 
``` 
Profile                     X
                       Avatar

Current User Name (label)
[current_username]          read-only text box

New User Name (label)
[enter new user name]       placeholder text
           | Save User Name |   right justified

Current Email Address (label)
[current_email_address]     read-only text box

New Email Address (label)
[enter new email address]   placeholder text
   | Send Verification Link |   right justified
``` 
--------------------------------------------  

Both current values are rendered in read-only text boxes, so each lines up with the field beneath it, and both are slightly lighter than the labels naming them — they are there to refer to, not to fill in. "Current User Name", "New User Name", "Current Email Address" and "New Email Address" all take the same label styling.

Each "new" field shows light grey prompt text — "enter new user name", "enter new email address" — which disappears as soon as the field has content.

Each button sits beneath the "new" field it acts on — inside that section, not in a row at the foot of the card — right justified in the style of the "Vote" button on the poll card.

There is more spacing between the User Name section and the Email Address section than between a label and its own field, so the card reads as two sections rather than one list of six things. Each is disabled by default and becomes enabled only when its field holds text **that differs from the current value**: submitting the name someone already has, or the address they already use, is not a change.
  
There will be an 'X' icon in the top right of the card, to the right of the title. 
It reuses the poll card's `.icon-btn` chrome — the 28 px bordered chip from `pollCard.css` that the card's back control uses — carrying an × glyph rather than that control's arrow.  
It is an anchor with `href="/"`, not a button, per the navigation rule below; see "Card Shell Rendering" below for its accessible name and keyboard behaviour.  

Clicking that will navigate back to the home page.  
The card for the "Profile" will have no back-side.  
Each of the Profile card's two buttons is unavailable while the field above it is empty. The user name arrives pre-filled, so "Save User Name" starts available and becomes unavailable only if the user clears it; the "Change Email Address" box starts empty, so "Send Verification Link" starts unavailable.

The "Send Verification Link" button click awaits the response and does not navigate away.
`POST /api/me/email-change` answers **202**, not 200, so the success condition here is a
successful response rather than a particular code. On success the card stays and its Send
Verification Link status line reads "Verification sent to <the address> — click the link in
that email to finish the change." On 429 or 400 the card stays and the same status line
renders the reason.

The typed address stays in the box, so the user can see what was sent. Submitting again
supersedes the link already issued, which is the server's existing behaviour.

Neither of the Profile card's actions navigates on success. Login and Create Account go to
the home page because a card whose only purpose is to obtain a session has nothing left to
show; the Profile card is a page the user is working on, holding a name, an address and a
pending change, and navigating away from it would discard the confirmation that the action
just produced.

When clicking the link in the email, a new browser window will be opened.
The window that requested the link is kept current rather than left showing the old
email address; see "Session State Propagation Across Open Windows" below.
The new window may hold no session at all, since the verification link requires none;
see "Verification Landing Without a Session" below.

Clicking "Save User Name" does not navigate away. The header's displayed name updates in place. The Profile page renders the new username.

Labels are derived on the client; no API change  
Both source lists are already on the wire: invitedVoterList from the poll detail, voted from the results endpoint.  
The suffix is computed where the roster is rendered.  
No new field, no new route, and no change to postman/openapi.json.  
This also keeps the labels correct for unsaved edits.  
An address invited in this editing session exists only in the draft;  
a server-computed label would not know about it, and the section's whole design since 012 US10 is that it renders local state.  

## What an adopted snapshot re-renders on the Profile card

Adoption is adoption: the Profile card re-renders identically whether the snapshot arrived from a page load, a visibility re-check, a broadcast, or the page's own `PATCH`. No rendering rule in this document depends on which of those delivered it.  
  
When an adopted snapshot's `emailAddress` differs from the one the card is showing:  
- the Email Address value shows the address `/api/me` now reports, and 
- the Change Email Address box is cleared. 
  
A change the user started in another window has by then either completed or been superseded — an issued email-change link is invalidated by the next request from the same account — so leaving the typed address in the box would offer a change that is no longer pending.  

The clearing is keyed to `emailAddress` alone. A snapshot that differs in any other field re-renders what it changed and leaves the Change Email Address box as the user left it.  

Whatever was reported about that pending change is cleared with it. "Verification sent to … — click the link in that email to finish the change" describes an action that has now finished; leaving it beside the new address tells the user to do something they have already done.  
  
The User Name box is not overwritten while it holds focus. A snapshot that changes `userName` updates the header and the card, but a name the user is part-way through typing is theirs until they save or leave the field.  
  
Re-checks are per-event, not periodic. No timer polls `/api/me`. A page fetches on load, when it regains visibility, and when it changes the session itself; nothing else.  
  
A re-check that fails at the network level leaves the held snapshot in place and re-renders nothing, on the same reasoning as `refreshGrid`'s handling of a failed fetch:  
state one visibility-change stale is better than a view emptied by a lost request. A 401 is an answer rather than a failure — the snapshot becomes `null` and the page re-renders as a guest.  


### Card Shell Rendering
Width and centring come from `.card-viewport` — `width:100%`, `max-width:420px`, `margin:0 auto` — the wrapper `pollCard.css` already provides for a card that sits outside the grid.  
The card itself stays fluid, so it shrinks below 420 px on a narrow viewport exactly as a grid card does.  
This is what "sized appropriately" and "centered horizontally" mean on all three pages; no page sets its own width.  

Height is where the three differ. Login and Create Account drop the inherited
`.card-flip` `min-height:420px` and take their height from their contents — that is
what "a single card body with no slack" asks for, and neither card's contents reach
420 px. Profile sets `min-height:640px` as stated above.

A card taller than the viewport scrolls the page. The card never becomes a scroll
container, and its contents are never clipped.

`login.html`, `create-account.html`, `profile.html` and the card markup follow
`index.html`'s precedent: load `pollGrid.css`, `pollCard.css`, `site.css` and the
Fraunces/Inter link; do not load `styles.css`.

`styles.css` is 53 lines, so the migration is stated rule by rule rather than left to
judgement. Nothing element-level moves. `index.html` already refuses that sheet for the
reason its own head comment gives — "its element-level rules (button padding/hover,
input padding) bleed into the reference components" — and these three pages become
reference-component pages.

Not moved, because the rule is dead on a rebuilt card page:

- `:root{--accent,--bg}` — referenced nowhere outside `styles.css`; `pollGrid.css`
  supplies the palette these pages will use.  
- `*{box-sizing:border-box}` — already set by `pollGrid.css` and `pollCard.css`.  
- `body{...}` — `pollGrid.css` sets `html,body` for exactly these pages' new layout.  
- `main.narrow` — the wrapper the rebuild deletes; centring comes from `.card-viewport`.  
- `button{...}` and `button:hover` — the rules `index.html` names. Card actions use `.btn-primary.btn-vote` and the close control uses `icon-btn`; a generic `button` rule would crush both.

Moved into `site.css`, re-expressed scoped to the shell's body region and never as a
bare element selector:

- `form{display:grid; gap:0.6rem}` — becomes the body region's own field layout.
- `label{font-weight:600}` and `label.checkbox{...}`.
- `input[type="email"], input[type="text"]{padding; border; border-radius; font:inherit}`.
- `.profile-field` and `.profile-field .label` — become the body region's label/value
  group, used by the Profile card's Email Address block.

Moved as-is:

- `.error{color:#b3261e}`, dropping the `#form-message` half of the selector, since that
  id goes with the rebuild. `site.css` is loaded by every page, so the admin pages keep
  the same colour from the new location.

End state: `styles.css` is left in place, loaded only by `admin.html`, `admin-poll.html`
and `admin-results.html`, holding the element-level rules those pages still depend on.
No rule ends up defined in both sheets.

The admin pages keep the sheet, and this feature does not touch their heads. Their
`admin.css` rules are class-based and sit on top of `styles.css`'s element-level layer,
so removing it would change how admin forms and buttons render — work that belongs to a
feature about the admin pages, not to this one. R9 adds a back arrow to `admin.html` and
nothing else.

One rule does leave outright rather than move. `main.narrow` is used by `login.html`,
`create-account.html` and `profile.html` and by no other page, so once those three are
rebuilt on the shell it matches nothing anywhere in the app. It is deleted from
`styles.css` rather than left behind as an unreachable rule.

For the record, so a later reader does not mistake the sheet for load-bearing on the
admin pages: `styles.css`'s `*{box-sizing}` and `body{...}` are already overridden there
by `pollGrid.css`, which those pages load after it. What they still take from it is the
form, label, input and button layer. Retiring the sheet altogether is a later feature's
job.

The shell ships as `src/public/cardShell.js`, following the convention every other
client component uses: one file, an IIFE, exposing a single global — `window.CardShell`
— loaded with `<script src="/cardShell.js" defer>` after `/app.js`, which owns the
session snapshot the shell's pages read. Its rules go in `site.css` alongside the rules
promoted from `styles.css`; no page gains another stylesheet. The shell defines only the
wrapper and its regions, and reuses `.card-face`, `.question`, `.subtitle`,
`.btn-primary.btn-vote` and `.icon-btn` from `pollCard.css` without redefining them.

A fourth sheet was the alternative and is rejected: `site.css` is already the sheet D2
nominates for rules these pages share, and a new one would have to be added to the head of
every page that uses the shell — the heads D2 has just finished specifying. Because
`site.css` is loaded by all seven pages, the shell's rules ship everywhere; they are
class-scoped to the shell's own wrapper and regions, so on a page with no card they match
nothing. `cardShell.js` is loaded only by the three pages that use it.

`CardShell.mount(container, { title, subtitle, closeHref })` returns the regions, and
each page fills the body and action row itself. The shell stays ignorant of fields,
exactly as it stays ignorant of polls.

Each of the three pages gets its own deferred script — `loginCard.js`,
`createAccountCard.js`, `profileCard.js` — holding the code that fills the shell and
handles submissions, in place of the inline `<script>` blocks those pages carry today.
This matches `index.html`, `admin.html` and `admin-poll.html`, none of which has inline
page logic. It also removes an ordering trap: a plain inline `<script>` runs during
parsing, before any deferred script has executed, so inline code could not see
`window.CardShell` or the shared snapshot at all.

An action has three separate unavailable states, and the shell keeps them apart so they cannot
undo one another. It is **gated** while the field it acts on is empty or merely repeats the current
value; it is **in flight** from the moment it is used until its outcome arrives, showing that work
is in progress, so one intended action costs at most one attempt against a rate limit; and it is
**settled** once it has succeeded, staying unavailable rather than returning to its resting state,
so a link already sent cannot be requested again. Typing during a request must not re-enable the
button, and a completed request must stay settled whatever the fields say.

A control that is unavailable must also look unavailable — dimmed, and not inviting a click that
will do nothing — and so must the label naming it, since the control and its words are one thing to
the person using them. A refusal does not settle an action: there is a real reason to try again, so
the button returns to available.

The shell gives each action a status line: a `<p role="status">` directly below the
action it belongs to, present and empty from first paint. Login and Create Account have
one; Profile has two, one under "Save User Name" and one under "Send Verification Link",
so a message is never ambiguous about which action produced it. A refusal — `429` or
`400` — renders into the status line of the action that was submitted.

`role="status"` is what carries the message to a screen reader, and it only works because
the element exists before the text does: a live region announces text arriving *into* it,
so a message rendered into an element created at the same moment announces nothing.

A notice that arrives with the page rather than from an action — `/login?error=invalid-link`
is the only one — renders into the first status line. Being present at first paint it is
not announced as an update, which is right: it is part of the page, and a reader meets it
in document order.

The card's title is a heading: an `<h1>` carrying the `.question` styling, not the `<p>`
the poll card uses. A poll card is one of many in a grid and titles nothing, while each
of these pages is a single card and its title is the page's heading — which `login.html`,
`create-account.html` and `profile.html` all have today and must not lose in the rebuild.

The close control is named for where it goes, not for its glyph: `aria-label="Back to the
home page"`. This follows the two back controls the app already has — "Back to poll list"
on the edit page and "Back to results without voting" on the poll card — and it does not
promise a dismissal the control cannot perform. An × that announces itself as "Close"
tells a screen-reader user the card will go away and the page will stay; what happens is
a navigation. Its `<svg>` is decorative and carries `aria-hidden="true"`.

It sits after the title in the markup, matching its position to the right of the title on
screen, so reading order and visual order agree and no `tabindex` is needed. The `<h1>`
is not focusable, which makes the close control the card's first focusable element —
the same arrangement `admin-poll.html` already uses, where the back link opens `<main>`.

It takes a visible focus indicator. The app defines no `:focus-visible` rule today, so
one is added for the control in `site.css` rather than left to the browser default
against the card's surface.

Escape does not dismiss the card. These are pages, not dialogs: there is nothing to
dismiss, and a user part-way through typing an address who presses Escape out of habit
would lose the page. Navigation happens only when the control is activated.

The cards keep their sign-in-mode switch, and gain no oauth design work. `ENV_SIGNIN_METHOD`
already decides what each of these pages may offer, and a card that offered a control its
endpoint refuses would be broken in a supported configuration — so preserving the switch is
correctness, not oauth feature work, and stays in scope while the Exclusions section defers
the rest.

- **Login** reads `/api/config` as it does today. In `native` mode the card body holds the
  email field, the stay-signed-in checkbox and the "Email me a login link" action. In
  `oauth` mode it holds the provider buttons instead, rendered with the shell's own action
  styling. No bespoke layout is designed for oauth mode; it gets what the shell gives it.
- **Profile** does not render the Change Email Address label, box or "Send Verification
  Link" action in `oauth` mode. The address is provider-supplied and read-only there, and
  `POST /api/me/email-change` returns 404. The Email Address value and the User Name group
  are unaffected. `profile.html` has no such branch today, so this is new — one condition,
  not an oauth feature.
- **Create Account** needs nothing. `pages.ts` already returns 404 for `/create-account`
  outside `native` mode, so the card is never served in the mode that would break it.


# Session State Propagation Across Open Windows

Clicking the link in a sign-in, account-creation, or email-change email opens a new
browser window. The window that sent the email stays open, holding whatever session
state it had at load: `app.js` fetches `/api/me` once on `DOMContentLoaded`, and
`pollGrid.js` captures that result in `me` and closes over it in `isSignedIn`. That
window is orphaned — a logged-out header, guest-gated cards, a stale email address on
the Profile card — until the user reloads it by hand. Two mechanisms remove it.
Neither adds an API endpoint and neither changes `/api/me`.

# The shared session snapshot

`app.js` will own one session snapshot per page — the parsed body of `GET /api/me`, or
`null` for a 401 — and will expose it together with a subscribe function so that
`pollGrid.js`, `profile.html`, `login.html` and `create-account.html` read the same
value instead of each fetching independently.

`pollGrid.js` will read `isSignedIn` from the shared snapshot at each evaluation rather
than closing over a value captured in `init`.

Adopting a new snapshot re-renders the header, the grid's signed-in gating, and whatever the current page derives from the session.  
It does not navigate, with two exceptions.  
A page whose only purpose is to obtain a session — Login and Create Account — navigates to the home page when the snapshot changes from `null` to a signed-in user.  
A page that requires a session navigates to `/login` when the snapshot becomes `null`;  
see "Sign-out reaches every window" below.

# Broadcast between windows

`app.js` will publish every snapshot it obtains on a same-origin `BroadcastChannel`
named `auth-state`, whether that snapshot came from a page load, a visibility re-check,
or a successful `PATCH /api/me`.

On the channel, the message payload is the snapshot itself — the whole `/api/me` body,
or `null` — and never a "signed in" flag. An email change and a username change alter
the body without altering signed-in-ness, and a flag cannot carry them.

Every page will subscribe to `auth-state` on load. On a message the page compares the
received snapshot against the one it holds, by value over every field the body carries,
plus the `null` / not-`null` distinction. An identical snapshot is discarded without a
re-render; a differing one replaces the held snapshot and re-renders.

The comparison is not an enumerated list of fields. Enumerating invites the wrong
question — whether a given field belongs in the list — and guarantees that the next field
added to `/api/me` is compared only if someone remembers to add it. Comparing the whole
body needs no maintenance and cannot silently omit anything.

In practice four fields can differ today — `userName`, `emailAddress`, `profileAvatar`
and `isAdmin` — plus the presence of a body at all. `status` cannot: it flips from
`pending` to `active` in the session-creation hook, before the session exists, so the
first `/api/me` of any session already reports `active` and no later snapshot in that
session reports anything else. It is compared because it is in the body, not because it
is expected to change.

A page will re-broadcast only snapshots it fetched itself, never one it received, so a
single change cannot echo between windows.

Where `BroadcastChannel` is unavailable, `app.js` signals through `localStorage`
instead. Whenever it would have broadcast, it writes a value that differs from the
last one written — a timestamp with a random suffix — to a single key,
`authStateChangedAt`, and it listens for the `storage` event on that key. A window
that receives the event re-fetches `/api/me` and puts the result through the same
comparison, re-render and re-broadcast as any other snapshot.

The key carries no session data, only the signal that something changed, so nothing
identifying is written to the device. It is write-and-notify only: no page reads it
to learn who is signed in, and a page's snapshot always comes from `/api/me`.

`app.js` removes the key when the snapshot it would have published is `null`, so a
sign-out leaves nothing behind. Removing a key fires a `storage` event of its own, so the
removal *is* the publish — a signing-out window signals the other windows by clearing the
key, not by writing one last value and leaving it there.

This gives up the requirement's "payload, comparison and re-render are identical" only
in the first term — delivery differs, the comparison and re-render stay identical — and
buys three things: no personal data at rest, no lifetime question to answer beyond the
one-line clearing rule, and no risk of a page treating a persisted snapshot as a cache.

No change to either verify route is required. Both redirect targets — `/` for
`/api/auth/verify` and `/profile` for `/api/me/email-change/verify` — are ordinary pages
that run `app.js`, so the window that consumed the link publishes its snapshot as soon
as it loads.

This mechanism reaches only windows in the same browser profile. A link opened in a
different browser, or in a mail client's in-app browser, shares neither the channel nor
the cookie jar with the window that sent it.

## Sign-out reaches every window

A successful `POST /api/auth/logout` produces a snapshot the page knows without asking
for it: `null`. The page publishes that snapshot as soon as the request succeeds and
before it navigates to the home page, so the other windows drop to the guest state at
once rather than waiting for the signing-out window to finish loading. This is a publish,
not a re-broadcast — the rule above forbids echoing a snapshot a page *received*, not
publishing one its own action produced.

That navigation happens as soon as the change is adopted, without waiting for the person to act,
and it discards unsaved text like any other navigation — including in a window where someone was
part-way through typing. The session is already gone, so every action on that page would now fail;
keeping them there to protect text that can no longer be submitted would be worse.

A window that adopts `null` re-renders as a guest: the header shows the signed-out state
and the grid re-gates its cards. A page that requires a session has nothing to render for
a guest and navigates to `/login` instead — `/profile` and the admin pages.

The one page that does not is `/profile` while it is showing a verification result. That
state is rendered for a session-less visitor by design, so it neither expects a snapshot
nor navigates away when there is none. See "Verification Landing Without a Session".

## Re-check when the window is seen again

Every page will re-fetch `/api/me` when it becomes visible again: on `visibilitychange`
when `document.visibilityState` is `visible`, and on `pageshow` when `event.persisted`
is true, so that a window restored from the back/forward cache re-checks as well. The
result goes through the same comparison, re-render and broadcast as any other snapshot.

This is what covers a link consumed in another browser. The server is the authority, so
the re-check reports the change no matter which window completed it.

`event.persisted` is a precondition, not a description of the common case. `pageshow`
also fires at the end of every ordinary load, with `persisted` false, and those firings
are ignored. The two paths are then mutually exclusive by construction: an ordinary load
runs `app.js`, which fetches once at start-up, and a window restored from the
back/forward cache does not re-execute the script at all, so `pageshow` is its only
fetch. Neither case issues a second request, and no page load costs a duplicate
`/api/me` or a duplicate broadcast to every other window.

Only one `/api/me` request is in flight per page at a time. `visibilitychange`,
`pageshow` and the re-check that follows the page's own `PATCH` can overlap; a trigger
that arrives while a request is outstanding joins that request rather than starting a
second one. This holds whatever the trigger, and it is what keeps two responses from
resolving out of order and installing a stale snapshot over a newer one.
  
# Verification Landing Without a Session

`/api/me/email-change/verify` requires no session — it consumes the token, updates the
address, and redirects to `/profile?changed=1`. When the link opens in a browser that
holds no session, which is the ordinary outcome for a mail client's in-app browser or a
non-default browser, that landing window finds `/api/me` returning 401. As currently
written, `profile.html` redirects any session-less visitor to `/login`, so the change
succeeds and the confirmation is discarded: the user is shown a login form and told
nothing. `/profile?error=invalid-link` is lost the same way.

The Profile page will therefore treat a verification result as a state of its own,
rendered from the query string alone, and independent of whether the window has a session.

## The guard is relaxed narrowly

There are two redirects to `/login`, not one. `profile.html` redirects a session-less
visitor from the client, and `pages.ts` redirects the request from the server before
`profile.html` is ever sent. Removing only the client one leaves the result card
unreachable in exactly the case it exists for, so the page route changes too.

`GET /profile` is served without a session **only** when the query string carries
`changed=1` or `error=invalid-link`. Every other session-less request keeps redirecting to
`/login`, so FR-014 holds everywhere the verification result is not involved.

The match is exact on the two recognised parameters, not on the shape of the whole query string:
`?changed=1&from=email` is served, so a verification link can carry additional parameters without
the guard refusing it. What is matched exactly is their value. `changed=1` and `error=invalid-link` are recognised as written; any
other value of either parameter, and any other parameter, falls through to the redirect. A
guard that accepted `changed` with any value would turn one condition into an open door.

The relaxed branch discloses nothing. It sends a static file. `/api/me` still returns 401
to that window, and `profileCard.js` renders only the result state from the query string —
no name, no address, no avatar, and no Profile card. What a guest can reach is a page that
says a link succeeded or failed and offers a Log In button.

`/profile` becoming servable in general was the alternative and is rejected. It would
spend a documented guard to buy nothing the narrow form does not already buy, leave the
page's own JavaScript as the only thing between a guest and a profile editor, and remove
the regression test that currently proves guests are redirected. See "Test Impact": under
the narrow form that test passes unchanged and becomes the guard on the relaxation itself.

No new endpoint is added and neither verify route changes. One page route changes, and it
is the one above.

## Rendering

When `/profile` is loaded with `changed=1` or `error=invalid-link`, the page will render
the result before it evaluates the session, and will not redirect to `/login` on a 401.
The redirect to `/login` for a session-less visitor stands for every other load of the page.

A session-less result load renders the card shell used by Login, Create Account and
Profile — one face, a title row with the 'X' close control, a subtitle, and an action row
— in place of the Profile card. It has no back side, and the 'X' navigates to the home
page.

`profileCard.js` renders the result state itself, before it evaluates the session, so the
same script draws the page on both paths and `cardShell.js` is loaded either way. The
result state is not a separate page and does not depend on the Profile card's own
rendering having run.

The result card is page content, not an announcement. It is rendered in the document at
load, its title is the page's `<h1>`, and it is not wrapped in a live region — a live
region announces a change to itself, and there is no change here. `document.title` is set
to match the card's title, so neither the browser tab nor the accessibility tree says
"Profile" over a page reporting a completed email change.

Each result carries a second wording for the visitor who **does** have a session, whose outcome
appears in the Profile card's status line rather than on this card. It must not tell them to sign
in: an email change does not end a session, so they are still signed in. Nor should a refusal send
them to their Profile page, which is the page they are looking at. On the card they read "Your
email address has been updated." and "That verification link has expired, has already been used,
has been replaced by a newer request, or the address is now in use by another account. You can
start the change again." Same event, two readers, two sentences.

For `changed=1` the title is "Email Address Changed" and the subtitle is "Your email
address has been updated. Sign in with your new address to continue." The action row
holds a single "Log In" button, styled as the "Vote" button on the poll card and right
justified, navigating to `/login`.

For `error=invalid-link` the title is "Link No Longer Valid" and the subtitle is "This
verification link has expired, has already been used, has been replaced by a newer
request, or the address is now in use by another account. Start the change again from
your Profile page." The action row holds a single "Log In" button, as above.

A load that has a session keeps today's behavior: the Profile card renders as specified,
with the result reported in its message line.

## The confirmation carries no data

The confirmation names no email address. The landing window has no session, so it cannot
obtain the address from `/api/me`, and the address will not be passed through the redirect
to be reflected back into the page. The four failure causes are likewise stated together
rather than distinguished, because the redirect reports only that the link was refused.
Necessary endpoints may added, and route changes may be made.

The wording describes the outcome of the link rather than the state of the window's
session, so it stays accurate in the case where the browser holds a session belonging to
a different account than the one the link was issued for.

## Contract impact

`postman/openapi.json` describes `/api/*` endpoints only — it carries no page routes — so
nothing in this feature changes it. That holds for the whole feature, not only for the
participant labels.

Page-route behaviour is recorded per feature, in `specs/<feature>/contracts/page-routes.md`.
Each of those files states its own deltas and names the routes it leaves alone, so the
existing ones stay accurate as records of what their features did and are not edited. 013
gets its own, recording one delta:

| Aspect | Before (001, 003, 004) | After (this feature) |
|---|---|---|
| `GET /profile`, valid session | 200, sends `profile.html` | unchanged |
| `GET /profile`, no session, no result parameter | 302 to `/login` | unchanged |
| `GET /profile`, no session, with `changed=1` or `error=invalid-link` | 302 to `/login` | **200, sends `profile.html`** |

The third row is the whole of this feature's page-route change. `GET /login`,
`GET /create-account`, `GET /` and the `/admin*` routes are unchanged.

## Relationship to the propagation mechanisms

This section closes the loop only in the window that consumed the link. The window that
holds the session — the one where the change was started — learns the new address through
the shared session snapshot: by broadcast if it is in the same browser profile, and
otherwise on its next visibility re-check.

# Admin Page Back Arrow  

The "admin" page will have a back arrow icon that reuses the editPoll page's `.admin-back-link` — the same 32 px borderless anchor and the same arrow glyph — pointing at `/` rather than `/admin`.

The icon will be rendered left justified, just above the "Create New Poll" button.  

One anchor wraps both brand marks  
<div class="brand"> becomes <a class="brand" href="/">, keeping display:flex and the 6 px gap. Both SVGs stay decorative children.  

Every new navigation is a declared destination, never browser history
The admin back arrow, both close buttons and the brand link are anchors with href="/" (or href="/admin" for the existing one). Post-submission navigation is location.href = "/". Nothing calls history.back().

# Unauthorized Access to Admin Page
Currehntly, if a user is not an admin, they can still navigate to the "admin" page.  
However, what they see is unfriendly JSON object:

```json
{
"error": "Not authorized"
}```

Please make this more user friendly by rendering a card with the title "Not Authorized" and the subtitle "You do not have permission to access this page.".  The card will have an 'X' icon in the top right of the card, to the right of the title, the same close control the other cards use — see "Card Shell Rendering" for its chrome, accessible name and keyboard behaviour. Clicking it will navigate to the home page.
Also, the standard header will be rendered.

The response keeps its **403** status. Only the body changes — from
`{"error":"Not authorized"}` with `Content-Type: application/json` to the card's markup
with `Content-Type: text/html`. The request is still refused, and a `200` would tell
browser caches, crawlers and any uptime monitoring that the page loaded normally. A
browser renders an HTML body on a 403 exactly as it does on a 200, so nothing about the
card's appearance depends on this.

It also costs no test churn. `tests/pages.test.ts` already asserts `403` for a signed-in
non-administrator and for a guest, and asserts the status alone with no claim about the
body — so both pass unchanged, and they go on guarding the thing worth guarding, which is
that the route still refuses.

The card answers every admin page route, not only `/admin`. Four page routes share the
guard — `/admin`, `/admin/poll`, `/admin/poll/update` and `/admin/poll/results` — and a
non-administrator who opens any of them, from a stale bookmark or a link someone shared, is
in the same position and deserves the same answer. Covering only `/admin` would mean adding
a condition to the guard so that the other three keep returning JSON, which is more work for
a worse result.

The card's wording already suits all four: "You do not have permission to access this page"
names no particular page, and the × goes to the home page, which is where a
non-administrator can actually go. On the three routes that take a `PID`, the guard runs
before the poll is looked up, so a refused visitor gets the card rather than a `404` for a
poll they were never allowed to see.

This is a property of where the card is rendered rather than a list to maintain: the page
routes' guard renders it, so every route that guard protects is covered, including any
added later.

The `/api/admin/*` routes keep answering `{"error":"Not authorized"}` as JSON, unchanged.
This needs saying because there is no "page routes' guard" today to change: `createRequireAdmin`
in `src/polls/service.ts` is a single factory, and `pages.ts` and `pollsApi.ts` each build an
instance from it. Editing the factory is the obvious way to implement this requirement and is
the wrong one — it would turn every admin API refusal into an HTML page, which no caller
expects. The factory takes a parameter, or `pages.ts` gets a handler of its own; either way
the API's refusals are untouched.

One card serves everyone the guard refuses. A visitor who is not signed in and a signed-in
user who is not an administrator see the same title, the same subtitle and the same ×, and
both get `403`. The guard makes no distinction between them, and neither does the card.

The subtitle is true of both without naming which they are, and that is deliberate: the
page does not tell a visitor whether the address they are signed in as would have worked,
or whether signing in would help. What it tells them is that this page is not theirs and
where to go instead.

Guests are not redirected to `/login`. That is what `/profile` does, but `/admin` has
refused guests outright since 012 and `tests/pages.test.ts` asserts it; redirecting would
turn that `403` into a `302` and delete a guard assertion in order to send the visitor to a
sign-in page that, having no return-URL support, would land them on the home page rather
than the page they asked for.

`admin.html` is not involved and does not change. The guard refuses before the page file is
sent, so a visitor without permission never receives it; the admin pages keep the heads they
have today, as stated in "Card Shell Rendering".

What the guard sends is a page of its own, `src/public/not-authorized.html`, with the `403`.
Its head follows the same precedent as the three card pages — `pollGrid.css`,
`pollCard.css`, `site.css` and the Fraunces/Inter link, and not `styles.css` — and it loads
`app.js` for the standard header, `cardShell.js`, and its own deferred
`notAuthorizedCard.js`, which mounts the card:

```
CardShell.mount(main, {
  title:     "Not Authorized",
  subtitle:  "You do not have permission to access this page.",
  closeHref: "/"
});
```

This makes the page a fourth consumer of the shell, on the same terms as Login, Create
Account and Profile: one face, no back side, a title row with the close control, a subtitle,
and no action row. Mounting it rather than hand-writing the markup is what keeps the card
from drifting — the close control comes from the shell, so it is `.icon-btn` with the
shell's accessible name, and cannot accidentally become the admin pages' `.admin-back-link`.

The page has no body region and no actions. It is the smallest thing the shell can render,
which is the point: R10 asks for a page that says one sentence and offers a way out.

# Test Impact

The suites that touch the surfaces this feature moves, and what happens to each.

**Breaks, and is prevented rather than updated.** `tests/pages.test.ts` asserts that a
guest's `GET /login` contains `login-form`. The rebuilt Login card keeps `id="login-form"`
on its form element so the assertion keeps holding; a page-guard test should not be
rewritten because a stylesheet changed.

**Looks like it breaks, and does not.** `tests/session.test.ts` asserts that `GET /profile`
without a session returns `302` to `/login`. Under the narrow relaxation a bare request
with no result parameter still redirects, so the test passes unchanged — and it becomes
the regression guard proving the relaxation stayed narrow. If it ever fails, `/profile`
has been opened wider than this feature intends.

**New coverage, in `tests/session.test.ts` beside the existing guard tests.** A
session-less `GET /profile?changed=1` and `GET /profile?error=invalid-link` each return
`200` and HTML. These are the two cases the Verification Landing exists for, and nothing
today would notice if the guard silently swallowed them again.

**New coverage, in `tests/poll-card-assets.test.ts`.** That suite exists to guard "the
specific edits a future change is most likely to undo", fetched over HTTP so they are
proven to be served. The stylesheet migration is exactly that: assert that `site.css`
carries the promoted `.error` rule, that `styles.css` no longer carries `main.narrow`, and
that `login.html`, `create-account.html` and `profile.html` no longer link `styles.css`.

**Unaffected.** `tests/signin-mode.test.ts` checks status codes for `/login` and
`/create-account` in each sign-in mode, not their markup. `tests/auth.test.ts`,
`tests/profile.test.ts` and `tests/rate-limit.test.ts` exercise the API endpoints these
pages call, none of which changes.

No test is deleted by this feature.

# Exclusions

Further updates to ENV_SIGNIN_METHOD=oauth related code will be descdribed in a requirements spec in the future.  
The implementation may rebuild a page that contains it if necessary.
