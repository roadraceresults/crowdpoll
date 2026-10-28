Start a new spec for these requirements called `012-ADMIN-REVISIONS`.  

For all the requirements in this document, if the underlying database model needs to be changed, there is no need to migrate data from the old model to the new model.  
The old model will be deprecated and the new model will be used for all future polls.
Old data in all collections can simply be deleted.

# Save Choices on Edit Poll Page
On the `editPoll` page, the 'Save Choices' button functionality of saving the choices list will now be folded into the edit page `Save and Publish` button.  
i.e. when the `Save and Publish` button is clicked, the choices list will be saved along with the other poll data.
The `Save Choices` button is no longer needed.  
Choice validation moves into the publish handler; the dedicated choices route is removed; the client's choice-edit state feeds the same dirty flag as every other field.
Editing only the choices must enable `Save and Publish`. The page now only requires one dirty flag.
The existing "PUT …/choices" endpoint will be removed; the choices are now saved as part of the main poll update.

# Cancel Button on Admin Page
On the `editPoll` and `updatePoll` pages, the `Cancel` button can be enabled even before an edit is made.
The `Cancel` button will perform the same function as the back icon. This is not referring to the browser back button, but rather the back icon in the header of the page.

# `Public` AND `Transparent` are Mutually-Exclusive
Currently, the implementation ensures that values for `resultsVisibility` and `accessMode` that are mutually exclusive are prevented with logic in a server-side end-point that switches the values as needed.  

There is now a new requirements to combine the `resultsVisibility` and `accessMode` values into a single set of permissible values. The new poll collection field will be called `pollVisibility` with the following possible values"
`PUBLIC POLL`   (assumes ANONYMOUS-POLL, the list of who votes will NOT be shown
`PRIVATE POLL - ANYONE WITH THE LINK - DO NOT SHOW WHO VOTED`   
`PRIVATE POLL - ANYONE WITH THE LINK - SHOW WHO VOTED`  
`PRIVATE POLL - INVITATION ONLY - DO NOT SHOW WHO VOTED`
`PRIVATE POLL - INVITATION ONLY - SHOW WHO VOTED`

This will simplify the logic and make it easier to understand for the user.  
There isn't a possibility of selectinconda activate g values that are mutually exclusive.  

The five values are persisted exactly as written in the requirements. No code-to-label map is introduced. The UI renders the values exactly as written in the requirements.

There will be a new requirement for how the `choiceMode`, `voteMutability`, and `pollVisibility` values are rendered on the `editPage` and `updatePoll` pages. Currently they are single select drop-down boxes.  
The new requirement is to render each of them as a single select radio button group.  
This will make it easier for the user to see all the options without clicking, and allow them to make their choice with a single click.  

`pollVisibility`, `choiceMode` and `voteMutability` will be frozen after the poll has received a vote. As such, the `updatePoll` page will not render these radio button group but rather the value will simply be rendered as a static label.

# Add Participants on Edit Poll Page
There is a bug in the current implementation: on the `editPoll` page, when using the `Add Participant` feature, an error message is displayed "The poll is currently being edited. Please try again shortly.".  
This makes it impossible to add participants to a poll.
The `Add Participant` feature must be enabled for `PRIVATE POLL - INVITATION ...` polls, and not rendered for any other `pollVisibility` value.

# Voter Count Limit
This field defaults to EMPTY, which means there is no limit on the number of voters, for `PUBLIC` polls. Therefore, the `voterCountLimit` field will be disabled and greyed out for `PUBLIC` polls.  

For `PRIVATE` type polls, if a number is entered, then the poll will only allow that many voters to cast a vote. If the field is left blank, then the limit will be be 500. The maximum for private polls is always 500.  
The field will not be auto-filled with 500, but the user can enter a number between 1 and 500 inclusive.  
validatePollFields() currently auto-fills 500 whenever a poll moves from public to private. This aspect of the function will be removed. The field will remain empty when switching from public to private, and the user can enter a number if they wish.  
There will be client-side field validation to ensure the number is a positive integer between 1 and 500 inclusive.
The `voterCountLimit` max (currently 500) will be enforced on the server-side as well as the client-side. 

# Ban from Voting
'Ban from Voting' is not working on this poll http://localhost:9999/admin/poll?PID=d8d90298-b104-4852-bc19-a76baeda199f  
pid=d8d90298-b104-4852-bc19-a76baeda199f
I click the "Ban from Voting" button but nothing appears to happen. And the email address still appears in the "Partcipants" list and does not appear in the "Banned Voter List" list.  

# Voting when Editing
A fail-safe needs to be added to the home page as follows: if a poll has switched to `EDITING`, and split second later the user clicks the poll `Vote` button on the poll card front-side, then the user must be presented with the "Try Again" message:
- "This poll is momentarily unavailable to cast a vote. Please try again shortly."  

When editing, the poll card will only be rendered on the front-side. The `Vote` button will not be rendered, the `Live Results` button will not be rendered, and in their place the "Try Again" message will be rendered.  
If the user is viewing the poll card back-side when the poll goes into `EDITING` mode, they must see the "Try Again" message if they click the `Submit Vote` button. The card will then be flipped to the front-side.   
If the user is viewing the poll card back-side when the poll goes into `EDITING` mode, (and the user does not click "Submit Vote"), the next time the polls are refreshed, the poll card will be switched to the front-side with the "Try Again" message rendered.  
Even if the poll goes into `EDITING` mode after the `Submit Vote` button is clicked, the end-point handler will return a value that instructs the client-side to render the poll card front-side with the "Try Again" message.
This would be a very rare timing issue when the poll goes into `EDITING` at almost the exact same time that the `Submit Vote` button is clicked, but it needs to be handled.  
If and when the poll transitions back to `OPEN`, during the next refresh, the front-side of the poll card will be rendered and the `Vote` button will be rendered again.  
In summary, any time there is a user action on the poll card or the poll card is refreshed, if the poll is in `EDITING` mode, the front-side of the poll card will be rendered with the "Try Again" message.
  
This new requirement requires that the following end-points:
- GET /api/polls  
- GET /api/polls/:pollId
will admit EDITING to both endpoints ONLY when pollStateBeforeEditUpdate is itself one of the three public states [WAITING TO OPEN, OPEN, CLOSED].  
A poll that was public before EDITING stays visible and shows the message. A poll that was never public [INITIALIZED, REJECTED] stays hidden.  


# Accessing the Admin Page
When a user is logged in and their email address appears in the `ENV_ADMINS` list, a `Poll Administration` menu item will appear in the `Avatar Menu` in the header.  
Here's how that works:
1. GET /api/me returns isAdmin: boolean alongside the existing profile fields.
2. isAdmin is computed by the same allow-list predicate that gates admin routes — extracted from createRequireAdmin as a shared isAdminEmail(email, config) so the two can never drift. Comparison stays case-insensitive against the trimmed ENV_ADMINS entries.
3. When isAdmin is true, the avatar menu renders a Poll Administration item linking to /admin, positioned after Edit Profile and before Logout (logout stays last). When false or absent, the item is not rendered at all — not rendered-and-disabled.
4. isAdmin is a rendering hint, never an authorization decision. Every admin API route and page route continues to enforce the allow-list server-side. A user who forges the flag in devtools reveals a menu entry whose target still refuses them.
5. Guests need no separate rule: /api/me returns 401 when not signed in, so the flag is simply absent and the item never renders.
6. The new field will be documented in postman/openapi.json.

# Admin Page Revisions
There are new requirements here of how the list of polls on the `adminPage` in page will be rendered.  
The goal is to make it easier for the admin to see all of the important data related to each poll, and make selections with one click.  
First, the rows in the list will use an alternating background color to make them easier to distinguish.  
Second, icons will be rendered in the rows to allow the admin to perform actions with one click. (described in "Icons for Actions" below)
The kebab (three dot) menu at the right edge of each row will remain using the text description of the action, as it does now.
The kebab menu allows the user to see a description of each action, even though the icon on the row allows the user to perform the same actions with one click. And even though the icon will have a tool tip. 

## Title and Edit/Update icon
On the `admin` page, the `Title` column will be in the 1st column, but now there will be a typical `pen` icon that launches the `editPoll` or `updatePoll`, whichever is appropriate based on whether the poll has votes cast.
The pen icon will be rendered immediately to the left of the `Title` text.  
If `editPoll` and `updatePoll` are not available, the `pen` icon will be disabled.  This is the case for a poll that is `pollState`=`ARCHIVED`.  
Also, the `Title` will be a link that also launches the `editPoll` or `updatePoll`, just like the `pen` icon does. If the pen icon is enabled, the title will be a link, otherwise the `title` will not be a link.  

## Subtitle
`Subtitle` will no longer be a column of its own on the `Admin` page.  
It will now be rendered directly below the `title`, with very little padding.  
It will be rendered in italics and a slightly smaller font to help distinguish it from the `title`.  
This is necessary because a `title` can be multi-line.

## State Column
The `state` column will appear as the 2nd column of each poll row on the `admin` page. 
There is a new requirement that allows the admin to more easily OPEN, CLOSE, or ARCHIVE a poll.
There will be buttons, rendered to the right of the STATE column, that allow the admin to OPEN, CLOSE or ARCHIVE a poll with one click if appropriate.  
These buttons have conditions that determine whether each is enabled or greyed-out.
The OPEN button (3rd column) is only available if the current `pollState` is:
- `WAITING TO OPEN`
- `CLOSED`

The CLOSE button (4th column) is only available if the current `pollState` is:
- `WAITING TO OPEN`
- `OPEN`

The ARCHIVE button (5th column) is only available if the current `pollState` is:
- `CLOSED`

When the `pollState` is changed by the user by clicking a button,  
the `startAt` and `endAt` date/time values will be updated as follows:  
- when a poll is switched to OPEN:
    - the `startAt` date/time will be cleared out.
    - the `endAt` date/time will be cleared out IF AND ONLY IF it is currently set to a value prior to the current date/time.
- when a poll is switched to CLOSED:
    - the `endAt` date/time will be set to the current date/time
    - the `startAt` date/time will be cleared out IF AND ONLY IF it is currently set to a value in the future
- when a poll is switched to ARCHIVED:
    - the server-side end-point that already exists will be used to change `pollState`=`ARCHIVED`
    - that endpoint will no longer alter the `endAt` timestamp to `now`

Use the existing resolveEditContext pattern across all three participant endpoints, and the three client calls send clientGuid.    
Manual transitions write schedule fields; archiving leaves them alone.
The blanket endAt = now that the current state endpoint applies to both CLOSED and ARCHIVED is replaced by the three per-transition rules. Archiving preserves endAt.
Rationale: The existing behaviour rewrites a poll's real close date when it is archived. The per-transition rules are also what make the date-check sweep confirm the manual state rather than revert it, so no override flag is needed.

## Created, Start, End Columns
Currently, the `createdAt`, `startAt`, and `endAt` columns are rendered for each poll in the `admin` list.  
These columns will be the 6th, 7th and 8th columns respectively.
A new requirement is that if `startAt` is empty, then the `admin` poll list will render `started` (in lower case) in the `startAt` column.  
If the `endAt` is empty, then the `admin` poll list will render `does not end` (in lower case) in the `endAt` column.

## Icons for Actions
Immediately to the right of the `endAt` column, in the 9th column, there will be icons for the following one-click actions:

There will be an icon for the `Duplicate Poll` action.   
The icon will be similar to font-awesome duplicate icon: 
```
<i class="fa-solid fa-copy"></i>
```
There will be an icon for the `Copy Poll Link` action that will copy the poll link to the clipboard.
The icon will be similar to font-awesome copy icon: 
```
<i class="fa-solid fa-link"></i>
```
There will be an icon for the `View Results` action that will launch the admin `results` page for that poll.
The icon will be similar to font-awesome chart icon: 
```
<i class="fa-solid fa-square-poll-horizontal"></i>
```
There will be an icon for the `Delete Poll` action that will delete the poll.  
This icon will only be enabled if the the `pollState` is one of "INITIALIZED", "REJECTED" or "ARCHIVED".  
The icon will be similar to font-awesome trash icon:
```
<i class="fa-solid fa-trash"></i>
```

All icons will be rendered, even if disabled and greyed out.
Icons are inline SVG. Font Awesome is not present in the project.

The kebab menu will be rendered at the far right of each row and will remain using the text description of the action, as it does now.

# POLL STATE Computed Server-side
Every row capability is computed server-side.  
canOpen and canClose join the existing canEdit, canUpdate, canArchive, canDelete, canRescreen. The client renders enablement from booleans and re-derives no state rules.

## AWAITING APPROVAL and Rejection Reason 
When a poll is being approved for acceptability according to social media standards,
the `pollState` is set to `AWAITING APPROVAL`.
The `Acceptability Screening` will set a rejection reason if the poll is `REJECTED` and `pollState` is set to `REJECTED`.
These fields rarely have a non-empty value, so they will be rendered as a 2nd row below the `title` and `subtitle` with the same font as the `title` and in BOLD.  
The second title line renders as AWAITING APPROVAL — <elapsed> while screening runs and  
[Re-attempt Screening] REJECTED: <reason> if it has failed.   
To be clear, [Re-attempt Screening] is a button that is only rendered if maxAcceptabilityScreeningAttempts has been reached.

# LOGGING 
These requirements will not require any logging to be added to the server-side end-points.  
More thorough logging will be added in the future through a requirements document dedicated to logging.  

# Home Grid Polling
The home grid becomes a polling list.
GET /api/polls is re-fetched on ENV_POLLING_INTERVAL; cards are added and removed as membership changes, and a surviving card keeps its flip state and in-progress selection.

# ASSUMPTIONS

All icons will have an appropriate tool-tip that describes the action.

pollVisibility is frozen once the poll has been voted on, inheriting accessMode's rule rather than resultsVisibility's.  

The voter count limit is enforced for all four private values, not only for link polls as previously required. It stays null and disabled for PUBLIC POLL.  

The 500 ceiling survives and is enforced on the server as well as in the browser, removing today's client-only cap.  

Switching to PUBLIC POLL clears the stored limit rather than preserving it for a later switch back.  

Save and Publish is only enabled when the user makes an edit on the `editPoll` and `updatePoll` pages.  

The participant list, its ban action and un-ban action remain available for every visibility including PUBLIC POLL. Only the Add Participant invite row is gated. Add Participant is only available for INVITATION ONLY polls. These are all admin functions, not voter-facing.

Zebra striping alternates per poll, not per rendered line — rows are now variable height.  

A forced flip to the front face preserves the in-progress selection and restores it when the poll reopens, overriding a previous requirement of keep-while-flipped rule only for the visible face.	

Delete keeps its confirmation prompt as an inline icon; archive keeps its irreversibility warning. Promotion to one click does not remove the confirmations.  

For the two DELETE routes, the clientGuid should travel in the body. A JSON body on DELETE is legal and matches the other lock-aware calls. This gives symmetry with POST …/invited, POST …/publish and the heartbeat — one shape across all lock-aware calls.

`SHOW WHO VOTED` is not currently used. This will be a future requirement.  

 Two administrators on the admin list can click OPEN and CLOSE on the same poll within one refresh interval. The from-state guards make the second click a 409 rather than a lost update. The losing row should show the refusal inline on the row and let the next refresh reconcile.  

 Seven of the ten columns become icon or short-label buttons. Tooltips are required. Accessible names are not required at this point.  

 The list gains four columns and loses one. Below roughly 900 px the row will not fit. There will be a horizontal scroll within the table container.  This is not a responsive design. A future requirement will be dedicated to responsive design.  

 When a poll is reopened after reaching its voteCountLimit limit, the poll reopens still at its limit and admits no new voters.  

