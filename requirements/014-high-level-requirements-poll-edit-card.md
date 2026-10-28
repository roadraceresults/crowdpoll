Start a new spec for these requirements called `014-poll-edit-card`.  

# Overview
The purpose of this requirements doc is to describe enhancements to the Poll Admin functionality.
The primary scope of this requirements doc is the `/admin`, `/admin/poll`, and `/admin/poll/update` routes.
Currently, the `/admin` route is only accessible to users whose email appears in the `ENV_ADMINS` environment variable.

Two further areas are changed, and both are specified below:
- **Two API responses.** `GET /api/admin/polls` gains the fields a card needs in `Read-Only` mode and the three count fields, and `GET /api/config` gains `participantsViewportSize`. Both are described in `postman/openapi.json` and that description must be kept in step.
- **Three shared constants.** `POLL_VISIBILITIES`, `ChoiceMode` and `VoteMutability` are renamed to more user-friendly values under `MORE FRIENDLY CONSTANTS`. These are stored verbatim rather than mapped, so the rename reaches `src/polls/store.ts` and its predicates and queries, `src/polls/service.ts`, `postman/openapi.json`, the test suites, and every existing poll document.

One of those reaches outside the admin pages. `src/public/pollCard.js` — the voter-facing poll card — compares `choiceMode` to decide whether selecting a choice deselects the previous one. It is the only voter-facing change in this document, and it must be included when the rename is applied and when the work is tested: a poll card left comparing the old value silently turns a single-choice poll into a multiple-choice one, with no error anywhere.


# /admin Page Layout
The `/admin` page is no longer a table with a header,  
but instead a list of cards, one card per poll.  
The new requirement is that the Poll settings are displayed AND edited in this card layout.  
Previously, the route `/admin/poll/update` was used to edit a poll,  
but now the `/admin` route is used to edit a poll in place, without navigating away from the `/admin` route.  

Both editing routes are removed. `/admin/poll` (polls with no votes) and `/admin/poll/update` (polls with votes) are two registrations of a single handler, so they retire together, along with:
- the `editSurface()` factory and both `router.get` registrations in `src/routes/pages.ts`
- `src/public/admin-poll.html`
- `src/public/adminPoll.js`, whose edit-session, heartbeat, draft, and publish logic moves into the Poll Edit Card

The `/admin/poll/results` route, `admin-results.html`, and `adminResults.js` are **not** affected and remain as they are.

The card has a width determined using the exact same rules that the existing table uses.  
This has a responsive width that is determined by the width of the browser window.  
The height of the card is determined by its content (and as described below, the height changes when the card is in `Edit` mode).  
The cards are displayed in a single column, one card per row, with suitable spacing between them.  
The webpage scrolls vertically to accommodate all the cards.  

The selection and sorting of polls that appear on the revised `/admin` page use the same logic as the existing code.

The new layout of a Poll Edit Card can be seen in the mockup image: `designDocs/014-poll-edit-card-mockup.jpg`.  
This image describes the layout, not the functionality.  

# /admin Page Functionality

All the Enabling and Disabling of fields in the existing code apply to the new layout of Poll Admin Cards as adopted from the existing table layout. This includes the fields on the table on the `/admin` page as well as the fields on the previous `/admin/poll/update` route.

The `Back Arrow` icon navigates back to the `/` route, which is the Polls page.

The `Save and Publish` button sends the same request, and saves the same fields, as the `Save and Publish` button on the previous `/admin/poll/update` route. What the card does afterwards is described under `Save and Publish Outcomes` below, and differs from the previous route in one case.  

The `Cancel` button resets the card to its original state, and does not navigate away from the `/admin` route.  
It keeps the name of the `Cancel` button on the previous `/admin/poll/update` route, but not that button's behaviour: the previous `Cancel` released the editing session and navigated back to `/admin`, whereas this one returns the card to `Read-Only` mode in place. The mockup image labels this button `Discard`; the name is `Cancel`.  

`Start Date Time` and `End Date Time` Selector Controls  
The same italicized labels appear in the `Start Date Time` and `End Date Time` fields when they are empty as in the existing code:
- empty `Start Date Time` field: *started*
- empty `End Date Time` field: *does not end*

The rules for the `Choice Mode`, `Vote Mutability`, and `Poll Visibility` are the same as in the existing code. The only change is that the layout is now in a card.  
i.e. A poll that has votes does not allow the Choice Mode to be changed,  
and a poll that has votes does not allow the Vote Mutability to be changed,  
and a poll that has votes does not allow the Poll Visibility to be changed.  

`Voter Count Limit`  
For PRIVATE polls, the value follows this rule: a blank field means `ENV_PRIVATE_VOTER_LIMIT_DEFAULT`, and an entered value must be an integer from 1 to that value, which is the ceiling in every case.
When a poll is transitioned from Public to Private, auto-fill is removed.
This is the same behaviour as in the existing code. The only change is that the layout is now in a card.

# New Enable/Disable Functionality

By default, every card is in `Read-Only` mode.  
The user must click the `Pen` icon to put the card in `Edit` mode.  
The same existing logic for when the `Pen` icon is enabled or disabled applies to the new card layout, but with one additional constraint: only one card per open `/admin` page may be in `Edit` mode at a time. While a card holds `Edit` mode, the `Pen` icon on every other card on that page is disabled.  
Another user, or the same user in a different tab on the `/admin` page, may edit a different poll simultaneously. The constraint is per open page, not per user: an administrator with two `/admin` tabs open may have one card in `Edit` mode in each.  

Two separate mechanisms are at work here, at two different scopes, and only the first is new:
- **One card per page** is a client-side rule belonging to the open `/admin` page. It is what stops a single page accumulating several unsaved drafts, and it needs no server support.
- **One editor per poll** is the existing server-side editing session, which prevents a poll from being edited simultaneously by another user or by the current user in a different tab. It is unchanged, and it is what the `Pen` icon's existing enable/disable logic already reflects.

The Poll Edit Heartbeat, previously used on the `/admin/poll/update` route, is used on the new Poll Edit Card to determine if a poll is being edited.

When in `Read-Only` mode, the following fields, buttons and icons are affected:
- the Action icons and the items in the Action menu are enabled according to the same logic used in the existing table code, with the one removal described under `Action Icons and the Action Menu` below
- `Save and Publish` button is hidden
- `Cancel` button is hidden
- `Title`, `Subtitle`, `Choices`, `Start Date` control, `End Date` control, `Voter Count Limit` are rendered as read-only
- `Open` button, `Close` button, `Archive` button are rendered, and either `enabled` or `disabled` according to the same logic used in the existing table code
- `Choice Mode`, `Vote Mutability`, `Poll Visibility` are rendered as read-only in the same way they are when the poll has votes (i.e. not as radio buttons, but as text)
- `State`, `Rejection Reason`, and `Created` are displayed as read-only text (as before)
- three new fields: `Vote Count`, `Invitation Count` and `Banned Voter Count` are displayed as read-only fields

When the user clicks the `Pen` icon to put the card in `Edit` mode, the following fields, buttons and icons are affected:
- the Action icons and the items in the Action menu are hidden
- `Save and Publish` button is rendered, and either `enabled` or `disabled` according to the same logic used in the existing code
- `Cancel` button is rendered, and is always `enabled`, as the `Cancel` button on the previous `/admin/poll/update` route always was. It is one of only two controls that return the card to `Read-Only` mode, and the other — `Save and Publish` — is disabled until the card is dirty; a `Cancel` that greyed itself out with nothing to discard would leave a card entered by mistake with no way out of `Edit` mode and the editing session still held
- `Title`, `Subtitle`, `Choices`, `Start Date` control, `End Date` control, `Voter Count Limit` are enabled according to the same logic used in the existing code for the previous `/admin/poll/update` route, which now applies to the new Poll Edit Card
- the `Open` button, `Close` button, `Archive` button are hidden
- `Choice Mode`, `Vote Mutability`, `Poll Visibility` are rendered as either radio button groups, or read-only using the same logic as in the existing code
- `State` label, `State`, `Rejection Reason` are hidden
- `Created` is displayed as read-only text (as before)
- three new fields: `Vote Count`, `Invitation Count` and `Banned Voter Count` are hidden (as well as the field labels)
- a `Participants` section is displayed with an icon to the right of the label that expands the list (the functionality of the `Participants` section is described in the `Participants and Banned Voter List` section below)
- a `Banned Voter List` section is displayed with an icon to the right of the label that expands the list (the functionality of the `Banned Voter List` section is described in the `Participants and Banned Voter List` section below)

To return to `Read-Only` mode, the user can either click the `Save and Publish` button or the `Cancel` button. These are the only two controls on the card that do so, and this holds for every outcome of `Save and Publish`, without exception — see `Save and Publish Outcomes` below. A card can also leave `Edit` mode without either being clicked; the full set is listed under `The Editing Session and the Card`.
The existing gate for warning of unsaved changes is applied when the user:
- clicks the `Cancel` button, as in the existing code
- attempts to navigate away from the `/admin` route, as in the existing code  

As before, the `started` and `does not end` text is rendered in italics according to the existing logic.

## Action Icons and the Action Menu

The Action icons and the Action menu keep the existing table's logic and the same capability flags, with one removal: the `Edit Poll` / `Update Poll` item is gone, because both editing routes are removed. The `Pen` icon replaces it.

The helper that built that item's link, `editHref()`, is removed with it. It has three call sites in `src/public/adminList.js` and all three lose their destination under the card design:
- the `Edit Poll` / `Update Poll` menu item — removed
- the `Pen` icon, which no longer navigates but flips the card into `Edit` mode
- the poll title, which is no longer a link but a field on the card

The Action menu therefore holds `Duplicate Poll`, `Copy Poll Link` and `View Results` always, plus `Re-attempt Screening`, `Archive Poll` and `Delete Poll` when their capability flags allow, exactly as in the existing code. The Action icons are unchanged: `Duplicate Poll`, `Copy Poll Link`, `View Results`, and `Delete Poll` greyed when the poll cannot be deleted.

The mockup image shows four menu items only because it is drawn for one poll in one state; the conditional items are absent there, not removed.

`Archive Poll` stays in the Action menu even though the `Archive` button now sits on the same `Read-Only` face. The two are deliberately two affordances for the same capability, as they already are in the existing table, and the menu is meant to mirror the capability set completely — so that a greyed button and a missing menu item can never disagree.

## Page Refresh and the Card in `Edit` Mode

The `/admin` page refreshes itself every `ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL` by re-issuing `GET /api/admin/polls`, as in the existing code. This continues, and it is what keeps the list true: almost every state change on this page comes from a background sweep — approval, rejection, a scheduled open or close — rather than from the administrator.

The card in `Edit` mode is exempt from that refresh. The refresh still reconciles everything else on the page — polls added or deleted, states changed by the sweeps, the three counts, the capability flags — but it must not re-render the card being edited, and it must ignore that poll's row in the response entirely.

Both halves of that are needed:
- **Not re-rendering** the card is what protects the edit. The existing code rebuilds the whole list on each refresh, which against an open card would discard the text being typed, the caret and focus, and the expanded state and page position of the `Participants` and `Banned Voter List` sections.
- **Ignoring the row** is needed because a poll being edited is in the `EDITING` state, so its row comes back with `pollState` of `EDITING` and every capability flag false. A card repainted from that row would render as a locked poll with all of its actions greyed.

Nothing visible goes stale as a result: `State`, `Rejection Reason` and the three count fields are all hidden in `Edit` mode, so the only fields on screen are the ones being edited, which the refresh must not overwrite in any case.

At most one card per page can be in `Edit` mode, so at most one card is ever exempt.

When the card leaves `Edit` mode it is repainted from fresh list data rather than from the data it was opened with, so that a `Save and Publish` which changed the invited or banned lists does not leave the card showing counts its own save has just invalidated.

## The Editing Session and the Card

A card in `Edit` mode holds a server-side editing session: the poll's `pollState` is `EDITING`, its previous state is stashed in `pollStateBeforeEditUpdate`, the owning tab is recorded in `pollEditUpdateClientGUID`, and the Poll Edit Heartbeat keeps the session alive.

The rule is an invariant about state, not about actions: **exactly the card in `Edit` mode holds a session. A card in `Read-Only` mode never holds one.**

A card leaves `Edit` mode in one of four ways. Three are initiated by the user, and each of them ends the session and stops the heartbeat, which is what maintains the invariant:
- `Save and Publish` — the server clears the session on both of its outcomes, as described below
- `Cancel` — the card releases the session with `DELETE /api/admin/polls/:pid/edit-session`, which restores the poll's stashed state, and then re-renders in `Read-Only` mode from that restored state
- navigating away from `/admin`, including by the `Back Arrow` — the session is released on the way out, after the unsaved-changes gate. This one leaves the page rather than returning the card to `Read-Only`, but it ends the session in the same way

The fourth is not initiated by the user and is the one case in which the card releases nothing, because there is nothing left to release: the session has already ended elsewhere, and the card is reacting to that. The Poll Edit Heartbeat answers `alive: false`, the card returns to `Read-Only`, and the invariant holds because the session is already gone. This case is described under `Messages and Refusals on a Card`.

The two controls named in `New Enable/Disable Functionality` — `Save and Publish` and `Cancel` — remain the only two on the card that return it to `Read-Only`. Navigating away leaves the page, and a lost session is not something the user can choose.

Without this rule a cancelled card would return to `Read-Only` while the poll remained `EDITING`: the `State` field would read `EDITING` instead of the poll's real state, every other administrator would see the poll locked with all of its actions greyed, and because the page is still open and still beating, the session would be held for as long as the tab remained open.

A tab that is closed or crashes cannot release anything — a browser will not reliably complete a request while unloading. That case, and only that case, is left to the existing stale-session sweep, which reclaims a session whose heartbeat is older than twice `ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL`. The sweep is the backstop for what the client cannot do, not the normal way a session ends.

## Messages and Refusals on a Card

A message about a poll is displayed on that poll's card, in a status line at the top of the card. Nothing about a card is reported by navigating or reloading, because the card is already on screen. This extends the existing rule that a refused state transition is reported on the row that asked for it.

The status line is a separate element from the field beside `State` that carries the poll's standing state detail — the elapsed time for a poll `AWAITING APPROVAL`, or the `Rejection Reason` for a `REJECTED` one. The status line sits above that row, and the two are stacked rather than sharing one slot. The status line is transient: it is cleared on the next successful action on that card.

They are kept separate because they genuinely coincide, and on the poll an administrator is most likely to be working on:
- a `REJECTED` poll can be edited — `editModeFor` refuses only `EDITING`, `AWAITING APPROVAL` and `ARCHIVED` — so clicking the `Pen` on a rejected card and having the editing session refused produces a message on a card that is already displaying its rejection reason
- a held-back publish on a previously rejected poll does the same. That branch writes `pollState` and clears the session but does not clear `pollRejectionReason`, so the card returns to `Read-Only` carrying both the old rejection reason and the message saying the poll still holds its default values

In both cases the two pieces of information are needed together, so neither may overwrite the other.

Three cases use it:
- **A refused editing session.** The user clicks the `Pen` icon and `POST /api/admin/polls/:pid/edit-session` answers 409 — the poll is being edited elsewhere, or is in a state that cannot be edited. The card stays in `Read-Only` mode and shows the `message` the server returned.
- **A lost editing session.** The Poll Edit Heartbeat answers `alive: false`, meaning the session was recovered as stale or taken by someone else. The card leaves `Edit` mode and returns to `Read-Only`, and shows a message saying the poll is no longer being edited by this tab. It cannot remain in `Edit` mode: without a session it cannot save, so a `Save and Publish` button offered there would be certain to fail. The unsaved changes are lost — as they are today, where the page navigates away and loses them.
- **A refused state change.** `Open`, `Close` or `Archive` is refused by the server, as in the existing code.

The `notice` query parameter on the `/admin` route is removed. It had three producers — the redirect in `editSurface()` and two in `adminPoll.js`, all of which are deleted with those files — and no consumer at all: nothing on the `/admin` page has ever read it, so every message sent through it was silently discarded. Removing it deletes a dead path rather than a working one.

## `Save and Publish` Outcomes

`Save and Publish` has two outcomes, and it ends the editing session in both. The card returns to `Read-Only` mode either way, and the heartbeat stops.

**Published.** The fields are saved, the poll moves to `AWAITING APPROVAL`, and the editing session is cleared. The card re-renders in `Read-Only` mode showing the new state.

**Held back as still-default.** When `isAllDefaults()` is true — in practice, when the poll still carries its seeded `Choice 1` / `Choice 2` — the server saves the edited fields, forces the poll to `INITIALIZED`, clears the editing session, and returns a message instead of publishing. The card re-renders in `Read-Only` mode showing `INITIALIZED`, and displays the server's message on the card. To finish the poll the user clicks the `Pen` icon again, corrects the choices, and saves again.

This differs from the previous `/admin/poll/update` route, which kept the user on the edit surface after a held-back publish. That behaviour was already incorrect: the server clears the editing session on this branch as well, so the page went on sending heartbeats for a session that no longer existed, and was thrown back to `/admin` within one heartbeat interval carrying "This poll is no longer being edited by this tab." Ending the session on the card, in both outcomes, is what the server has always done — and it keeps `Save and Publish` to a single rule rather than a rule with an exception.

## Why `Open`, `Close` and `Archive` live on the `Read-Only` face

Changing a poll's state is not an edit, and it must not require one. In the existing table these three are one click from the list with no editing session involved, and that is preserved: they stay on the `Read-Only` face beside the Action icons, and are hidden in `Edit` mode.

The alternative — rendering them in `Edit` mode — cannot work. Entering `Edit` mode starts an editing session, which sets the poll's `pollState` to `EDITING`, and every rule deciding whether these three are available reads `pollState`: `canOpen` and `canClose` test membership of `OPENABLE_STATES` and `CLOSEABLE_STATES`, and `canArchive` tests for `CLOSED`. `EDITING` satisfies none of them, so all three buttons would be permanently disabled in the only mode that rendered them. Nor would forcing the request help: `validateStateAction` refuses a transition out of `EDITING` with a 409.

Keeping them on the `Read-Only` face means every existing rule applies unchanged, with no second source of enablement and no need to release the editing session before a state change.

## Populating a Card in `Read-Only` Mode

Every card on the `/admin` page is in `Read-Only` mode when the page loads, and the fields listed above — `Choices`, `Choice Mode`, `Vote Mutability` and `Voter Count Limit` among them — must be rendered at that point.
`GET /api/admin/polls` does not currently carry them. Its response is a projection of `pid`, `title`, `subtitle`, `pollState`, `createdAt`, `startAt`, `endAt`, `pollRejectionReason`, `pollApprovalTimestamp`, `pollAcceptabilityScreeningAttempts`, `hasEverBeenVotedOn`, `pollVisibility` and the capability booleans. Of the settings a `Read-Only` card displays, only `Poll Visibility` is already among them.

So `GET /api/admin/polls` also gains `choices`, `choiceMode`, `voteMutability` and `voterCountLimit`,  
alongside the new count fields `voteCount`, `invitationCount`, and `bannedVoterCount`.  

The three counts are defined as:
- `voteCount` — the number of participants who have actually voted, that is, the entries in `currentVotes` whose `choiceIds` is not empty. This is the existing `computeResults().totalVoted`. `currentVotes` is a list of participant records rather than of votes: on an `isInvitationOnly()` poll it also holds an entry with an empty `choiceIds` for every invited address that has not yet voted, and those are not votes. It matters that this is the voted count and not the record count, because the `Voter Count Limit` is enforced against exactly this number — a poll is refused a new vote once the participants with a non-empty `choiceIds` reach the limit — and the two fields sit on the same card, where they must mean the same thing.
- `invitationCount` — the number of entries in `invitedVoterList`.
- `bannedVoterCount` — the number of entries in `bannedVoterList`.

The counts arrive with the list request and are refreshed with it. `GET /api/admin/polls` is re-issued every `ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL`, as described under `Page Refresh and the Card in Edit Mode`, so a displayed count is never more than one interval old. No separate refresh control is needed: the counts are shown only on cards in `Read-Only` mode, and those are exactly the cards that refresh reconciles — the card in `Edit` mode is exempt from it, and hides all three counts anyway.

The mockup image shows a `Refresh` icon beside the `Vote Count` field. It is not part of the design and is not implemented. At the default refresh interval it would re-issue the request the page is about to make of its own accord.

These three are independent measures, not a partition of one population, and none of them is the number of rows in the section below:
- on a poll that is not `isInvitationOnly()`, the `Participants` rows are the voters, so the row count matches `voteCount`
- on an `isInvitationOnly()` poll, the `Invitations` rows are the invited list, so the row count matches `invitationCount`, and `voteCount` will normally be smaller — it counts how many of those invitations have been used  
  
The whole page is then populated by the single request that already loads the list.

This costs nothing on the server. The handler already reads whole poll documents — `find({}).sort({ createdAt: -1 })`, with no MongoDB projection — and the vote-history lookup is already a single query for the whole page. The projection is applied when the response is shaped, so widening it adds payload and nothing else: at most fifty choice labels of one hundred characters each per poll, plus three scalar fields.

`invitedVoterList` and `bannedVoterList` stay off this response. `Read-Only` mode shows only their counts; `Edit` mode receives the lists themselves from the edit-session call. Sending every invited address of every poll to every card would be both the largest part of the payload and the widest exposure of it.

## Participants and Banned Voter List
The mockup image shows a `Participants` section and a `Banned Voter List` section.  
These sections are only displayed when the card is in `Edit` mode.  

By default, both sections are collapsed. The user can click the `Down` icon to the right of the label to expand either section.  
When collapsed, the `Down` icon is enabled and the `Up` icon is disabled.  
When expanded, the `Down` icon is disabled and the `Up` icon is enabled. The user can click the `Up` icon to collapse the section.  
When expanded, the `Participants` section displays a list of all participants in the poll, or for `isInvitationOnly()` polls, it displays a list of all invited participants.  
When the poll `isInvitationOnly()`, the section label will be `Invitations` rather than `Participants`.  

In the mockup image, the `Participants` section is expanded and the `Banned Voter List` section is collapsed. The `Banned Voter List` section displays a list of all banned participants in the poll.

The following elements are displayed right-justified on the same line as the `Participants` label or the `Banned Voter List` label, when the section is expanded:
- "`i - j`" text  
where `i` is the first item displayed in the viewport  
and `j` is the last item displayed in the viewport  
and `ENV_PARTICIPANTS_VIEWPORT_SIZE` is the number of items that can be displayed in the viewport.  
    The default value of `ENV_PARTICIPANTS_VIEWPORT_SIZE` is 10, but it can be changed in the environment variable.  
    `j` is `i + ENV_PARTICIPANTS_VIEWPORT_SIZE - 1`, or `N` when that is smaller. On a last page that is not full, the range must not name items that do not exist: 505 items at a viewport size of 10 ends "`501 - 505 (505 items)`", never "`501 - 510`".  
    Clamping the range does not change the height of the list control. The control keeps the fixed height described below, so a last page that is not full shows its remaining row slots empty rather than shrinking — otherwise the card's height would change as the user pages through the list.  
- "(N items)" text  
where `N` is the total number of items in the list
- "Page `[p]` of `[q]`" text  
where `p` is the current page number, and `q` is the total number of pages in the list (either `Participants` or `Banned Voter List`)
    `[p]` is an edit box where the user can enter a page number to navigate to that page  
    The entry commits on `Enter` or when the box loses focus — never on each keystroke, which would page the list through every prefix of the number being typed.  
    On commit the entry is read as a whole number and clamped to the range `1` to `q`: an entry above `q` navigates to page `q`, an entry below `1` navigates to page `1`. An entry that is not a whole number at all — empty, text, or a decimal — makes no change and the box returns to the current page.  
    After any commit the box shows the page actually being displayed, so a clamped entry is visible to the user rather than silently discarded. The box is likewise updated by the `Next` and `Previous` icons, so it always reflects the page on screen.  
    The box may additionally carry `min` and `max` attributes for the spinner and the numeric keypad, but these do not remove the need for the rule above: a browser does not prevent an out-of-range number from being typed into such a box.
- `Next` and `Previous` icons to navigate to the Next page or the Previous page.  
    These icons are enabled and disabled appropriately according to the current page number and the total number of pages in the list.
    When the user navigates to a different page, the "`i - j`" text is updated to reflect the new page of items being displayed.

The list control does not have a vertical scroll bar, but instead has a fixed height that is determined by the `ENV_PARTICIPANTS_VIEWPORT_SIZE` environment variable. This also applies to the `Banned Voter List` section. 

### The Empty Section

A section whose list holds no entries at all displays a message in the list area instead of rows, and its pager — the "`i - j`" range, the "(N items)" text, the `Page [p] of [q]` box and the `Next` and `Previous` icons — is not rendered. The message is:
- `Participants` section — "No participants yet."
- `Invitations` section — "No invitations yet."
- `Banned Voter List` section — "No banned voters."

The list area keeps the fixed height described above, so expanding, collapsing and paging never change the height of the card.

This is the same treatment the over-cap case receives, and deliberately so: whenever a list cannot be shown as a list, a message stands in its place and the pager is not rendered. One rule covers both, rather than two special cases behaving differently.

Rendering a pager for an empty list was rejected. Every value in it degenerates — `q` is `ceil(0 / ENV_PARTICIPANTS_VIEWPORT_SIZE)`, which is zero, so "Page 1 of 1" would be a fiction and "Page 1 of 0" a contradiction, and the range would read "1 - 0". An empty section is also the ordinary case rather than an unusual one: the `Banned Voter List` is empty on almost every poll, the `Participants` section is empty on any poll that has no votes yet, and the `Invitations` section is empty on every invitation-only poll until its first invitation.

The section must still be expandable when it is empty. The `Invite` row sits inside the `Invitations` section, so a section that could not be opened while empty would leave no way to invite the first participant.

### List Control Maximum List Size Limit
The list control will not be used if a section's list holds more than `ENV_PRIVATE_VOTER_LIMIT_DEFAULT` entries. The rule is all-or-nothing: over that size the section renders no rows at all, rather than the first `ENV_PRIVATE_VOTER_LIMIT_DEFAULT` of them.

The same rule governs both sections — `Participants`/`Invitations` and `Banned Voter List` — and each section is measured against its own list.

This limit will not affect PRIVATE type polls, because the `Voter Count Limit` field is limited to a maximum of `ENV_PRIVATE_VOTER_LIMIT_DEFAULT`.

This limit affects PUBLIC type polls which could have millions of participants. This list control would not be an efficient way to display millions of participants, so the limit is imposed to prevent performance issues.
A PUBLIC poll has no `Voter Count Limit` at all — the field does not apply to that visibility, and `effectiveVoterLimit()` returns null for it — so neither its participant list nor its banned voter list is bounded by anything else. That is why the `Banned Voter List` is capped by the same rule rather than exempted from it: on the one poll type this limit exists for, nothing else bounds it.

To support this efficiency measure, the endpoints that serve these lists to a page will not attempt to return more than `ENV_PRIVATE_VOTER_LIMIT_DEFAULT` rows of either list. If a list holds more than `ENV_PRIVATE_VOTER_LIMIT_DEFAULT` entries, the endpoint returns an empty array in its place, but the three count fields `voteCount`, `invitationCount`, and `bannedVoterCount` will still be returned with the correct counts.
We do not want huge lists going over the wire, and we do not want to render huge lists in the browser. The limit is imposed to prevent performance issues.

The rule applies in two places, which between them cover every response that carries one of these lists to a page:
- `buildAdminPollDetail()`, which shapes `invitedVoterList` and `bannedVoterList` into a response. It is the single shaper behind five endpoints — `POST /api/admin/polls/:pid/edit-session`, both outcomes of `POST /api/admin/polls/:pid/publish`, `GET /api/admin/polls/:pid`, and `PATCH /api/admin/polls/:pid` — so applying the cap there applies it to all five, and to any endpoint later added on the same shaper.
- the `GET /api/admin/polls/:pid/results` handler, which returns `voted` and, for `isInvitationOnly()` polls, `notYetVoted`.

It is not enough to cap only the two endpoints the card reads from. `publish` and `PATCH` return the same rosters to the same browser, and the `publish` response arrives immediately after saving a card that may hold a large list, so capping the load path and not the save path would leave the larger payload in place.

`GET /api/admin/polls/:pid/export.json` is deliberately **exempt**. An export exists precisely to hand over the complete data that the screen will not display, and an export that silently omitted its `participants` list would produce a file that looked complete and was not — worse than not offering one. It is an explicit download requested by an administrator, not a page render. `GET /api/admin/polls/:pid/export.md` is unaffected either way: it emits the title, subtitle, a choice-and-vote table and a total, and carries no participant list at all.

The voter-facing endpoints `GET /api/polls` and `GET /api/polls/:pid` are also unaffected, as they have never carried these lists.

The client-side code will display a message in place of the list, to the right of that section's label.
Beside the `Participants` label (or `Invitations`):  
"There are `N` Participants. This list is too large to display (limit `ENV_PRIVATE_VOTER_LIMIT_DEFAULT`)."  
Beside the `Banned Voter List` label:  
"There are `N` Banned Voters. This list is too large to display (limit `ENV_PRIVATE_VOTER_LIMIT_DEFAULT`)."  

`N` in these messages is the section's count field from `GET /api/admin/polls`, not a length measured from the list itself — over the cap the endpoint returned an empty array, so there is nothing to measure. The mapping is:
- `Participants` section on a poll that is not `isInvitationOnly()` — `voteCount`
- `Invitations` section on an `isInvitationOnly()` poll — `invitationCount`
- `Banned Voter List` section — `bannedVoterCount`

The wording says the list is too large to display rather than naming a number that can be displayed, because the rule is all-or-nothing: no rows are rendered, not the first `ENV_PRIVATE_VOTER_LIMIT_DEFAULT` of them.

Do not confuse this `N` with the `(N items)` text in the pager, which is a length measured from the list the client holds. The two never appear together: when a section is over the cap its list control is not used, so the pager — the range, the `(N items)` total, the page box and the `Next`/`Previous` icons — is not rendered at all, and the message stands in its place.  

For `isInvitationOnly()` polls, the limit could never be reached, because the `Voter Count Limit` field is limited to a maximum of `ENV_PRIVATE_VOTER_LIMIT_DEFAULT`.

In a future requirements doc, the 'Results' page will be enhanced to manage any size list of `Participants` and `Banned Voter List`.

### The Invite Row

The mockup image shows an `Invite` button and an email edit box inside the `Invitations` section. These are carried forward from the previous `/admin/poll/update` route unchanged, and they are the only means of inviting anyone to a poll.

- They are rendered only when the poll `isInvitationOnly()`, gated on the poll's visibility alone, exactly as in the existing code. `invitedVoterList` is consulted only for invitation-only polls, so an invitation entered against any other visibility would have no effect.
- They live inside the section, so they appear only in `Edit` mode, and they are hidden with the rest of the section body when it is collapsed.
- Adding an address is a local edit, exactly like a ban: the address is validated, lower-cased and added to the invited list held by the card, and nothing reaches the server until `Save and Publish`. `Cancel` discards an unsaved invitation along with every other unsaved change.
- The existing checks apply unchanged: the address must be a valid email address of no more than 200 characters, an address already in the invited list is rejected, and an address in the banned list is rejected with a message telling the user to un-ban it first. Failures are reported in the section, not silently.

The over-cap case described above cannot arise here: the `Invite` row appears only on `isInvitationOnly()` polls, and those can never exceed `ENV_PRIVATE_VOTER_LIMIT_DEFAULT` participants, because the `Voter Count Limit` field is bounded by the same constant. There is no state in which the `Invite` row is displayed above a list that has been replaced by the over-cap message.

### Row Content

Row content and the per-row actions are unchanged from the previous `/admin/poll/update` route. The same logic applies in the new card layout. To make it clear the two sections below are describing the same functionality, the text below is copied from the previous requirements doc.  

#### Participants Section
In the `Participants` section, each row shows the email address first, then the display name in literal angle brackets when one is known, then one status suffix per applicable state, each preceded by " - ":
- `email@domain.com <username> - Invited - Voted`

Which rows appear, and which suffixes they carry, follows the poll visibility:
- for `isInvitationOnly()` polls, the rows are the invited list. Every row carries the `Invited` suffix, and also carries `Voted` when that address has voted. The display name appears only for an address that has voted, since that is the only place a name is known from.
- for every other visibility, the rows are the voters. Each row shows the display name and carries the `Voted` suffix only.

Both lists are sorted ascending by the lower-cased email address, in code-point order.

Every row in the `Participants` section has a `Ban from Voting` button. Clicking it is a local edit only, exactly as in the existing code: the address is added to the banned list, removed from the invited list, and its vote is dropped, but none of that reaches the server until `Save and Publish`. `Cancel` therefore discards an unsaved ban along with every other unsaved change.

#### Banned Voter List Section
The `Banned Voter List` section has the same layout, pagination, and expand/collapse behaviour as the `Participants` section. Its rows differ: a banned row shows the email address alone — no display name and no status suffix, because banning removes the invitation and deletes the vote, so both would be false on every row — and its per-row action is `Un-ban` rather than `Ban from Voting`. Lifting a ban restores neither the invitation nor the vote.

# Create New Poll
In the current implementation, the user clicks the `Create New Poll` button on the `/admin` page, and a new poll is created in the database. The user is then navigated to the `/admin/poll` route to edit the new poll — a newly created poll has no votes, so it always lands on the edit surface and never on `/admin/poll/update`.  
The poll is persisted before the admin types anything. `Create` writes an `INITIALIZED` row unconditionally — no draft state, no client-side placeholder.  
So with the new requirements, under the card design, the click inserts a real card and flips it to `Edit` mode, rather than opening a blank form.  
The abandoned-poll case is already handled elsewhere: `DEFAULT_TITLE_RE` and `hasDefaultChoices()` exist so publish can hold back a still-default poll.  

`Create New Poll` obeys the same one-card-per-page rule as the `Pen` icon, because it is another way of opening a card in `Edit` mode: while any card on the page is in `Edit` mode, the `Create New Poll` button is disabled, just as every other card's `Pen` icon is. The user returns to `Read-Only` by `Save and Publish` or `Cancel` first.

On success the list is reloaded, and because a newly created poll sorts first under the existing `createdAt` descending order, the new card appears at the top of the page. It is put into `Edit` mode and scrolled into view.

A poll created and then immediately cancelled leaves an empty poll in the `INITIALIZED` state in the list. This is existing behaviour, not a consequence of the card design — the row is written before the administrator types anything, so clicking `Create New Poll` and then navigating away does the same today — and it is already handled: such a poll cannot be published, because `isAllDefaults()` holds it back, and `INITIALIZED` is one of the states from which a poll can be deleted.

Entering `Edit` mode on the card needs one fetch, not two. In the current implementation the poll is fetched twice: the `POST /api/admin/polls/:pid/edit-session` response already returns the full poll, and `load()` then re-fetches the same document with `GET /api/admin/polls/:pid`. The card uses the poll returned by the edit-session call and drops the second request. The list's `GET /api/admin/polls` still cannot populate `Edit` mode on its own: it carries the poll's settings for the `Read-Only` card, as described under `Populating a Card in Read-Only Mode`, but not `invitedVoterList` or `bannedVoterList`, which the `Participants` and `Banned Voter List` sections need.  

# MORE FRIENDLY CONSTANTS
## POLL_VISIBILITIES
While using the software to build these requirements, it was noticed that the existing `POLL_VISIBILITIES` constants are not very user-friendly.  
It is still required to avoid using a mapping from software const to user-friendly string.  
The previous and new constants are shown below. The new constants are more user-friendly, but still avoid using a mapping from software const to user-friendly string.  
When implementing these requirements, not only the main application files need to be updated, but also the test files that use the `POLL_VISIBILITIES` constant need to be updated to use the new constants.
DO NOT retroactively make any changes to previous requirements, specs, or feature architecture docs.

**PREVIOUS CONSTANTS**
```
export const POLL_VISIBILITIES = [
  "PUBLIC POLL",
  "PRIVATE POLL - ANYONE WITH THE LINK - DO NOT SHOW WHO VOTED",
  "PRIVATE POLL - ANYONE WITH THE LINK - SHOW WHO VOTED",
  "PRIVATE POLL - INVITATION ONLY - DO NOT SHOW WHO VOTED",
  "PRIVATE POLL - INVITATION ONLY - SHOW WHO VOTED"
] as const;
```
**NEW CONSTANTS**
```
export const POLL_VISIBILITIES = [
  "Public Poll",
  "Private Poll - Anyone With The Link - Do Not Show Who Voted",
  "Private Poll - Anyone With The Link - Show Who Voted",
  "Private Poll - Invitation Only - Do Not Show Who Voted",
  "Private Poll - Invitation Only - Show Who Voted"
] as const;
```
## ChoiceMode
While using the software to build these requirements, it was noticed that the existing `ChoiceMode` constants are not very user-friendly.  
It is still required to avoid using a mapping from software const to user-friendly string.  
The previous and new constants are shown below. The new constants are more user-friendly, but still avoid using a mapping from software const to user-friendly string.  
When implementing these requirements, not only the main application files need to be updated, but also the test files that use the `ChoiceMode` constant need to be updated to use the new constants.
DO NOT retroactively make any changes to previous requirements, specs, or feature architecture docs.

**PREVIOUS CONSTANTS**
```
export type ChoiceMode = "SINGLE-CHOICE-POLL" | "MULTIPLE-CHOICE-POLL";
```
**NEW CONSTANTS**
```
export type ChoiceMode = "Single-Choice Poll" | "Multiple-Choice Poll";
```
## VoteMutability
While using the software to build these requirements, it was noticed that the existing `VoteMutability` constants are not very user-friendly.  
It is still required to avoid using a mapping from software const to user-friendly string.  
The previous and new constants are shown below. The new constants are more user-friendly, but still avoid using a mapping from software const to user-friendly string.  
When implementing these requirements, not only the main application files need to be updated, but also the test files that use the `VoteMutability` constant need to be updated to use the new constants.
DO NOT retroactively make any changes to previous requirements, specs, or feature architecture docs.

**PREVIOUS CONSTANTS**
```
export type VoteMutability = "FINAL-VOTE-POLL" | "DYNAMIC-VOTE-POLL";
```
**NEW CONSTANTS**
```
export type VoteMutability = "Final-Vote Poll" | "Dynamic-Vote Poll";
```
When implementing these requirements, not only the main application files need to be updated, but also the test files that use these constants need to be updated to use the new constants.

   
## INCONSISTENT USE OF CONSTANTS IN UI     
There is currently an inconsistent use of constants in the UI.  
For example, the `VoteMutability` constant is used in the UI as follows:
- `FINAL-VOTE-POLL` is used when the group is frozen
- `Final vote` is used when the group is editable
  
The const choiceMode behaves identically (Single choice vs SINGLE-CHOICE-POLL).  
  
After these consts have been updated to be more user-friendly, the UI must use them consistently. In other words, the UI must use the value of the const, verbatim, and not a mapping from the const to a user-friendly string.

# Assumptions

The new environment variable `ENV_PARTICIPANTS_VIEWPORT_SIZE` needs:
- a row in CLAUDE.md's table
- an intVar() line in config.ts
- a field in the `GET /api/config` response, named `participantsViewportSize`
- an entry for that field in postman/openapi.json
- a description in the README.md file
- an entry in all the test suites that use the `/admin` route, to ensure that the new environment variable is set in the test environment
- an entry in the launch.json file for all configurations to ensure that the new environment variable is set in the debug environment
- an entry in the launch-dev.ps1 file to ensure that the new environment variable is set in the dev environment
- an entry in the devScripts.example/setup-dev.ps1 file to ensure that the new environment variable is set in the dev environment
- an entry in the launch.json.example file to ensure that the new environment variable is documented for example configurations

The `GET /api/config` entry is what makes the setting work at all. Everything else in this list is server-side or dev tooling, but the value's only consumers are in the browser — the page size for both list sections, and the fixed height of the list control — and a browser cannot read `process.env`. `/api/config` is the channel the client already uses for `privateVoterLimitDefault` and `pollAdminPageRefreshIntervalMs`, and `ENV_PRIVATE_VOTER_LIMIT_DEFAULT`, which the over-cap message also needs, is already served there as `privateVoterLimitDefault`.

The client keeps the documented default of 10 as a fallback for the window before `/api/config` answers and for the case where it fails, exactly as the existing code does for the voter limit. The timing is not tight: the value is not needed until a section is first expanded, which is a user action well after page load. The value must not be hard-coded in the client — that would let an operator change the setting and see no effect, which is the defect the same pattern was introduced to prevent for the voter limit.

# Exclusions

## No Data Migration Necessary
The SUD is still in development, and the database model is still evolving.
For all the requirements in this document, if the underlying database model needs to be changed, there is no need to migrate data from the old model to the new model.  
The old model will be deprecated and the new model will be used for all future polls.
Old poll data can simply be deleted.

The deletion is scoped to the two collections the change actually affects:
- `polls` — every document holds a `pollVisibility`, a `choiceMode` and a `voteMutability`, and the renamed constants make all three invalid
- `voteHistory` — its rows reference polls by `pid` and would be orphaned once `polls` is emptied. It holds none of the renamed constants itself; it goes because the polls it records are gone

The authentication collections — `user`, `session`, `verification` and `email_change_requests` — are **not** deleted. The renamed constants do not appear in any of them, and dropping them would destroy every account and sign every user out for a change that does not touch them.

This must be done as part of the release, not left to chance. The rename fails silently rather than loudly: a stored `"PUBLIC POLL"` does not raise an error against a renamed `"Public Poll"` — `isPublicVisibility()` simply returns false, `isInvitationOnly()`'s substring test simply misses, and `homeGridFilter` matches nothing, so pre-existing polls quietly vanish from the home grid and behave as a visibility nobody chose. Deployment is by autodeploy from the `dev` branch, so there is no later step at which this decision gets made again.
