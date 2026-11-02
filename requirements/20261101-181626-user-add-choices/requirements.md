Start a new spec for these requirements called `20261101-181626-USER-ADD-CHOICES`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements


A previous requirement , `20261029-225209-editing-poll-available`, allowed for Choices to be added and removed on a Poll that ha received votes.  
That requirement has been implemented and can only be done by an Admin.  

This requirement allows users of a Private poll to add Choices, whether the poll has received votes or not.  
The UI/UX for this is being made available on the Voting side of the Poll Card.  
There will be a button, with the label "Add Choice", on the row of the "Submit Vote" button, and it will be centered.  

When the "Add Choice" button is clicked, a modal dialog with an edit field will appear, allowing the user to enter the new choice.  
The style of the modal dialog will match the existing webapp design, adhering to Material 3 design principles, ensuring consistency in the user interface.  

The dialog will enforce the maximum Choice text length of CHOICE_LABEL_MAX characters. This will be enforced while the user is typing in the field.  
The same UI/UX will be used as used on the Edit Poll Card for field that have a limit. i.e. <length> / CHOICE_LABEL_MAX.  

The dialog will have a "Save" and "Cancel" button.  
The "Save" button will send the new Choice to the server to be validated and added to the poll if it passes validation.  
The validation will ensure that the new Choice is not empty, does not exceed the maximum length of CHOICE_LABEL_MAX characters, and does not duplicate an existing Choice in the poll.  
It will also be checked for any invalid characters or formatting that is not allowed in a Choice.  
It will also check that the Choice passes the same inappropriate words filter that is used when the Edit Poll Card is saved.  
If any of these validations fail, an appropriate error message will be displayed to the user, indicating the reason for the failure, and the user will be able to correct the input before attempting to save again.  

Immediately before launching the "Add Choice" dialog, the client will query the server to get the most recent list of Choices.  
This needs to be done to minimize the chances that the Poll Admin has changed the Poll Choices using the Poll Edit Card since the Poll was updaed in the last scheduled sweep.  
If the Poll already has the maximum number of allowed Choices, the "Add Choice" dialog will not be launched, and an appropriate message will be displayed to the user.  

The dialog will use the most recent list of Choices retrieved from the server to ensure that the user is working with the latest data.  
If the server returns an error or fails to provide the latest list of Choices, an appropriate error message will be displayed to the user, and the "Add Choice" dialog will not be launched.  

Of course, there will be no way to absolutely guarantee that the list of Choices has not changed between the time it is retrieved from the server and the time the new Choice is added.  
However, this approach minimizes the chances of conflicts and ensures that users are working with the most up-to-date information available.  
The rule will be that the last to save; a User Add Choice or a Poll Admin Edit Poll Card action, will take precedence.  
In all cases the server will ensure that the number of Choices in a Poll does not exceed the maximum allowed, regardless of whether the changes are made by a User adding a Choice or a Poll Admin editing the Poll.  
Additionally, if a User attempts to add a Choice when the Poll has already reached the maximum number of allowed Choices, the server will reject the addition and return an appropriate error message, ensuring that the Poll remains within the defined constraints.  

In summary, the process for adding a Choice involves several layers of validation and checks to ensure data integrity and consistency.  

After a Choice is added successfully, the client will update the local view to reflect the new Choice.  
The other users viewing the poll or attempting to vote will have the poll updated according to the existing sweeps and refreshes. 


## Additional Requirements (2026-11-01 6:54 PM)

The initial requirement initially specified the maximum length of a Choice label as CHOICE_LABEL_MAX characters. It should be MAX_CHOICE_LABEL_LENGTH.

## Decisions From The Requirements Report

**Who may add a Choice (AM1).**  
A signed-in user who may vote on the poll now may add a Choice: they pass the view and vote eligibility checks (not banned; invited, for an Invitation Only poll; within the voter limit or already a voter) and have the `Vote on Polls` permission.  
The poll's creator always may.  
Guests never see the button, and the server re-checks every rule.  

**Per-poll setting (NC1).**  
Adding Choices is a per-poll setting, "Voters may add choices", off by default, in the Edit Poll Card's How step beside the other Private-only settings.  
It may be changed after the poll has votes, as sharing mode may.  
No existing poll changes behaviour; the setting needs one additive migration (a boolean column), and it rides in the admin card, the poll projections and `postman/openapi.json`.  

**The button (AM2).**  
The "Add Choice" button is an M3 outlined (secondary) button, centred on the whole width of the row, between the back arrow and the "Submit vote" button, which stays the one filled (primary) button.  
It is absent, not disabled, for users who may not add a Choice, on polls where the setting is off, and on public polls.  
Its label stays on one line at phone width, and the row keeps its height.  

**Poll states (UA1).**  
A Choice may be added only while the poll's raw state is OPEN and no change waits in `pending_update`.  
Every other state, EDITING included, is refused with `409`: "The poll's choices are being edited. Try again shortly." while EDITING, or the state's own wording otherwise.  

**Adding a Choice is not a vote (UA2).**  
The new Choice appears last on the voting face, unselected; the user's current selection is kept, and they vote with "Submit vote" as usual.  
On a Final-Vote poll the user has already voted on, the button is absent and the server refuses an addition; the poll's creator is not bound by this.  

**The query before the dialog opens (UA4).**  
The card calls the existing `GET /api/me/polls/:pid` (under the manual-refresh floor and burst), which answers the current Choices; no new read route is added.  
The card rebuilds its Choices from the answer; the dialog checks duplicates against that list while the user types, but Save is decided by the server.  
The messages, shown in the card's existing message area, are "This poll already has the most choices allowed (<max>)." and "Couldn't load the latest choices. Try again."  

**The dialog (UA6).**  
The dialog is an M3 basic dialog (`role="dialog"`, `aria-modal="true"`) titled "Add Choice", with the Edit Poll Card's outlined field.  
Focus moves to the field when it opens and returns to the button when it closes; Enter saves, and Escape or Cancel closes without saving.  
The field takes no more than the limit (a paste is cut to fit), the counter reads `<n> / <max>`, and Save stays disabled while the trimmed text is empty or a request is in flight.  
A refusal from the server shows under the field in the M3 error style, keeping the text; only M3 tokens are used, so the stylesheet passes `m3-assets.test.ts`.  

**Validation on Save.**  
- **Length (NC2):** a Choice added by a voter is limited to 40 characters, the limit a creator has for a new poll's Choices, not the server's 100 (`CHOICE_LABEL_MAX`), which stays for the creator's saves of existing polls.  
  The limit is `WIZARD_CHOICE_MAX` (40), the constant the Edit Poll Card's wizard already uses for a new poll's Choices (AM4: the additional requirement's `MAX_CHOICE_LABEL_LENGTH` was a slip for `WIZARD_CHOICE_MAX`).  
  `WIZARD_CHOICE_MAX` is today defined only in `src/public/adminCard.js`; it moves to `src/polls/service.ts` beside `CHOICE_LABEL_MAX`, the server enforces it for additions, and it is sent to the browser in `/api/config`, so the wizard and the Add Choice dialog read one value.  
- **Characters (UA3):** the label is trimmed and must be one line of printable text: no line breaks, tabs or other control characters (Unicode category `Cc`), and no zero-width or bidirectional-override characters (`U+200B–U+200F`, `U+202A–U+202E`, `U+2066–U+2069`).  
  Emoji and every script are allowed; HTML is stored as typed and always shown as text.  
  The rule applies to voters' additions only, so no stored poll becomes invalid.  
- **Duplicates (AM3):** a voter's addition is a duplicate when it equals an existing Choice ignoring case and repeated spaces; the creator's own saves keep today's exact trimmed comparison.  
- **Word filter (IN2):** the new label is screened inside the add request, by the same `Screener` the approval sweep uses (called with the one label, through `screenWithTimeout` and `ENV_SCREENING_CALL_TIMEOUT`), and the verdict shows in the dialog.  
  A Choice that passes is added at once, never through `pending_update`; a screening timeout or failure answers `503` with "Try again".  

**The write (UA5).**  
The addition is one transaction with the poll row locked, re-checking the ceiling (`ENV_MAX_CHOICES`) and duplicates, then appending the Choice with a new id, the next position and no colour (Automatic), and bumping `content_version`.  
After commit the server deletes the `poll:<pid>` projection and the affected users' tab versions (`forgetTabs`), and queues a `search_outbox` row; the line graph picks the Choice up from its first vote.  
The answer carries the poll's new Choices, so the adding user's card redraws at once.  

**How many Choices one user may add (NC3).**  
There is no per-user limit; only the poll's ceiling (`ENV_MAX_CHOICES`) and the vote floor (`ENV_MIN_VOTE_REFRESH_INTERVAL`) between requests bound a user's additions.  

**Who added a Choice (NC4).**  
Each added Choice keeps its adder's user id (`addedBy`, inside the `polls.choices` JSON, no migration).  
The Edit Poll Card shows "Added by <username>" beside such a Choice, so the creator can remove it (with the existing deletion flow and its vote prompt) or ban its author.  
The Privacy Policy names this data, and deleting an account clears it.  

**The creator's save and voters' additions (IN1).**  
The creator's save deletes only the Choices the creator removed: the server compares the submitted list with the Choices held when the edit session started to find the deletions, and applies them to the current stored list, so a Choice a voter added while the card was open survives the save.  
The Choice ceiling is checked on the combined list, so the creator's save is refused `409` when voters filled the poll meanwhile.  
