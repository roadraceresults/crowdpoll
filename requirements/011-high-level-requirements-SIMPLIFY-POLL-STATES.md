Start a new spec for these requirements called `011-SIMPLIFY-POLL-STATES`.   

# NEW POLL STATES REQUIREMENTS  
The logic of the system has been complicated by trying to edit a poll that already has votes.  
In the interest of KISS, these requirements will simplify that.  
One of the previous requirements of handling `Choices` that have been `(removed)` affects many parts of the code, database schema and testing.   
The cost of that feature is not justified by the benefit gained by changing a poll's `Choices` after the Poll has launched and received votes.  

To reiterate, when a vote is removed, the vote is simply deleted from the database.
When a voter is banned, their votes are simply deleted from the database.
   
The states that a poll can be in will now be the following `pollState`s:
- `INITIALIZED`
- `EDITING`
- `AWAITING APPROVAL`
- `REJECTED`
- `WAITING TO OPEN`
- `OPEN`
- `CLOSED`
- `ARCHIVED`

A newly created poll will default to `pollState`=`INITIALIZED`.  
In this state all the poll's fields have a default value.  
A poll in the `INITIALIZED` state will not be visible to the public.  
The only thing that can be done to a poll that is in the `INITIALIZED` state is:
- edit with the `editPoll` page
- delete the poll from the `Actions` three dot menu on the `adminPoll` page for each poll in the list of polls.
Note: other actions on the `Actions` three dot menu will be disabled for a poll in the `INITIALIZED` state.

# EDIT POLL PAGE REQUIREMENTS  
The `editPoll` page will only be accessible if all of the following are TRUE:
- the poll has never had any votes cast
- `pollState` is NOT one of the following:
    - `EDITING`
    - `AWAITING APPROVAL`
    - `ARCHIVED`
  
Even if a vote has been removed or the voter has been banned, that still counts as a vote preventing access to the `editPoll` page.  

At the top left of the `editPoll` page, below the header, there will be:
- `Back Arrow`
- `Save and Publish` button
- `Cancel` button

The buttons will be in the order listed.  
Initially, the `Save and Publish` and `Cancel` buttons will be disabled.  

When the `Choices` are edited (clicking the `SAVE` button to the right of the `Choices` section), the new `Choices` list simply replaces the previous list.  
This simplifies the logic of loading `Choices` for a poll, since a check of whether a `Choice` has been `(removed)` does not need to be done because the `Choices` are immutable once the poll has received a vote (even if that vote has been `removed`).  
Since the `editPoll` page is only accessible when no votes have been cast, the `Choices` can be changed freely.  
The logic previously implemented that removes votes when poll `Choices` are changed is not needed because poll `Choices` are now immutable once the poll has ever received a vote.  

## EDITING STATE and HEARTBEAT  

To support the feature described next, each client (browser tab) will have a GUID, `pollEditUpdateClientGUID`, that is generated on PageLoad of the `editPoll` page.  
There will also be a new field in the poll document called `pollEditUpdateHeartbeatTimestamp`.
There will also be a new field in the poll document called `pollStateBeforeEditUpdate`.

When the `editPoll` page is accessed (onPageLoad) all of the following are set using a server end-point called `startEditUpdate(pollID, pollEditUpdateClientGUID)`.  
The `startEditUpdate` end-point handler will set the following values for the poll:
- current `pollState` will be saved to `pollStateBeforeEditUpdate`
- the `pollState` will be changed to `EDITING`  
- the `pollEditUpdateHeartbeatTimestamp` will be set to the current date/time in UTC
- the `pollEditUpdateClientGUID` will be set to the value received from the client

Note: the `startEditUpdate` end-point will re-check the page access conditions listed above on the server before making any of these changes,  
rather than relying on the page having checked them. If the conditions are not met, the end-point will make no changes and will return FALSE,  
and the page will display a message to the user and navigate back to the `adminPoll` page.

Then, after the `editPoll` page has loaded, it will call a server end-point, `pollEditUpdateHeartbeat(pollID, pollEditUpdateClientGUID)`,  
every `ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL` (initially set to 10 seconds).  
The end-point will:
- confirm that the `pollEditUpdateClientGUID` = the value stored in the poll document
- confirm that the `pollState` is still `EDITING`
- update the `pollEditUpdateHeartbeatTimestamp` to the current date/time in UTC

If either of the confirmations fail, the server will return FALSE.  
When the client receives a FALSE response, the `editPoll` page will:
- display a message to the user that the poll can not be edited
- navigate back to the `adminPoll` page

Otherwise, the `editPoll` page will continue  
calling `pollEditUpdateHeartbeat(pollID, pollEditUpdateClientGUID)` to update the `pollEditUpdateHeartbeatTimestamp` every `ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL` milliseconds,
and continue ensuring that the return value is TRUE.

The `pollState`, `pollEditUpdateHeartbeatTimestamp` will be used by a background process on the server  
that checks for polls where all of the following are TRUE:
- `pollState`=`EDITING`
- `pollEditUpdateHeartbeatTimestamp` < (CurrentTime - (`ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL`*2))  

This background process will be called: `staleEditUpdateSweep`.

If the above conditions are TRUE, then the server has found an editing session that has become stale and the client is no longer active.  
The background process will:
- revert the `pollState` to the value stored in `pollStateBeforeEditUpdate`
- clear the `pollStateBeforeEditUpdate` field
- clear the `pollEditUpdateHeartbeatTimestamp` field
- clear the `pollEditUpdateClientGUID` field

This background process will execute every (`ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL`*2) milliseconds.
This mechanism ensures that if some unexpected event happens where the `editPoll` page does not exit cleanly,  
and the `pollEditUpdateHeartbeatTimestamp` will stop being updated by the page on the client-side.  
This prevents polls from being stuck in the `EDITING` state.   
This unexpected state will be rare, but will resolve itself automatically after a short time.  

These three fields (`pollState`, `pollEditUpdateHeartbeatTimestamp`, `pollEditUpdateClientGUID`)
are also necessary to prevent a poll from being edited by multiple users (or the same user in different tabs) at the same time.
If a poll is in the `EDITING` state, the `editPoll` page will not be accessible by any user until the `pollState` is changed back to the previous state.  

Note: the editing lock is deliberately not re-enterable by its own holder.  
Because a new `pollEditUpdateClientGUID` is generated on every PageLoad, an admin who refreshes the page,
opens the poll in a second tab, or briefly loses their connection will be refused until `staleEditUpdateSweep` releases the lock.  
The worst case is (`ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL`*2) for the heartbeat to go stale, plus one sweep interval -
40 seconds with the initial values.  
The message shown to the user should say the poll is currently being edited and to try again shortly.
  
In the `EDITING` state, the poll is not visible to the public. This is done to prevent any votes being cast while the poll is being edited.  
This is a rare case where a poll is edited while it is being voted on. Typically, a poll that has been published should be untouched.  

Note: hiding a poll from the public listings is not by itself enough to prevent a vote.  
The end-point that receives a vote will refuse the vote unless `pollState`=`OPEN`, regardless of how the voter reached the poll -  
for example a voter who already had the poll page open when the state changed, or who follows a direct link.

The `pollStateBeforeEditUpdate` is needed so that if the user cancels or exits editing/updating cleanly, the `pollState` can be reverted back to the previous state, as described in the section `Exiting the editPoll Page` below.  

Note: a poll may be edited for longer than its own schedule allows - for example an `OPEN` poll whose `endAt` passes while the `editPoll` page is open.  
On exit the poll is reverted to `pollStateBeforeEditUpdate`, which may now be out of date.  
This is expected and self-correcting: the next `pollDateCheckSweep` tick moves the poll to whichever state its schedule calls for, within `ENV_POLL_DATE_CHECK_POLLING_INTERVAL`.  


## Exiting the `editPoll` Page
As soon as an edit has been made to the poll on the `editPoll` page, the `Save and Publish` and `Cancel` buttons will be enabled.  

If the user clicks the `Save and Publish` button, AND the poll has all the default values,  
the poll will remain in the `INITIALIZED` state, or be switched back to the `INITIALIZED` state in the rare case that the user reverts edited fields back to their defaults.  
This check for default values is done to prevent a poll from being published with all default values.  
Even more, if the `Choices` are all the default values, the poll will remain in the `INITIALIZED` state, or be switched back to the `INITIALIZED` state.  
This is because even if the `title` or `subtitle` are changed, if the `Choices` are all default values, the poll is not ready to be published.  
To make it clear, if a poll is switched back to the `INITIALIZED` state that poll will not be visible to the public.

If the user clicks the `Save and Publish` button, AND the poll DOES NOT have all the default values,  
the server end-point `saveAndPublishPoll` will be called.  
The section below called `SaveAndPublishPoll Requirements` describes the requirements for the `saveAndPublishPoll` end-point.

When the `Cancel` button is clicked, or the `Back Arrow` button is clicked,  
and changes have been made to the poll, a popup dialog will be presented to the user confirming that edits will be lost.  
The user can then click `No` to return to the `editPoll` page.  
The user can also click `Yes`, acknowledging that edits will be lost. In that case, no changes will be made to any of the poll's data. 
If the user agrees to discard any edits, any changes made to the poll will be discarded, and the previous `pollState` will be preserved.

When returning to the `adminPoll` page, by clicking the `Back Arrow`, `Save and Publish` or `Cancel` button, this will be done using a `navigate` function, rather than using the browser's back button (i.e. history).

If the user navigates away from the `editPoll` page by clicking the browser's back button, a similar confirmation dialog will be presented to the user, warning that any unsaved edits will be lost.  
If the user closes the browser, or the browser tab, or navigates to a different URL, a similar confirmation dialog will be presented to the user, warning that any unsaved edits will be lost.

When the user leaves the `editPoll` page without saving changes:
- revert the `pollState` to the value stored in `pollStateBeforeEditUpdate`
- clear the `pollStateBeforeEditUpdate` field
- clear the `pollEditUpdateHeartbeatTimestamp` field
- clear the `pollEditUpdateClientGUID` field


# UPDATE POLL PAGE REQUIREMENTS  

The `updatePoll` page will only be accessible if the poll HAS votes cast AND   
`pollState` is NOT one of the following:
- `EDITING`
- `AWAITING APPROVAL`
- `ARCHIVED`
    
The `updatePoll` page is a stripped down version of the complete `editPoll` page.  
The `updatePoll` page only allows the following fields to be edited:
- title
- subtitle
- `startAt`
- `endAt`

Just like the `editPoll` page, at the top left of the `updatePoll` page, below the header, there will be:
- `Back Arrow`
- `Save and Publish` button
- `Cancel` button

To make it clear, if any votes have been cast, they are never lost when the `updatePoll` page makes changes to title, subtitle, `startAt` or `endAt`.

The requirements above for **Exiting the `editPoll` Page** also apply to the `updatePoll` page.
The following requirements described above for the `editPoll` page also apply to the `updatePoll` page:
- the call to the end-point `startEditUpdate(pollID, pollEditUpdateClientGUID)` on PageLoad
- `pollStateBeforeEditUpdate` 
- `pollEditUpdateHeartbeatTimestamp`
- `pollEditUpdateClientGUID`
- the call to the end-point `pollEditUpdateHeartbeat(pollID, pollEditUpdateClientGUID)`
- the `staleEditUpdateSweep` background process

# SaveAndPublishPoll Requirements
The server-side end-point that receives the `saveAndPublishPoll` request (from the `editPoll` and `updatePoll` page) will immediately make the following initializations:
- set the poll fields to the values received from the client
- put the poll in `AWAITING APPROVAL` state
- clear the `pollRejectionReason` field
- clear a field in the poll document called `pollApprovalTimestamp`
- clear the `pollStateBeforeEditUpdate` field
- clear the `pollEditUpdateHeartbeatTimestamp` field
- clear the `pollEditUpdateClientGUID` field
- set `pollAcceptabilityScreeningAttempts` to 0,

Then `saveAndPublishPoll` end-point then returns, and the user returns back to the `adminPoll` page.  
The `adminPoll` page will display the `pollState`=`AWAITING APPROVAL` and the `pollApprovalTimestamp` in a human readable format (if the `pollApprovalTimestamp` is set).
The `pollApprovalTimestamp` field is used to ensure only one poll Approval process is active at a time and to determine how long the current Approval step has been running.  
A poll that is `AWAITING APPROVAL` can not be edited or updated until the `pollState` is changed to either:
- `REJECTED`
- `WAITING TO OPEN`
- `OPEN`
- `CLOSED`

When a poll is in the `AWAITING APPROVAL` state or the `REJECTED` state, the poll will not be visible to the public.

# POLLs AWAITING APPROVAL
A background process will be running on the server that checks for polls with 
`pollState`=`AWAITING APPROVAL` every `ENV_POLL_APPROVAL_POLLING_INTERVAL` milliseconds (initially set to 5 seconds).  
In this case, when the `ENV_POLL_APPROVAL_POLLING_INTERVAL` handler finds a poll where all of the following conditions are TRUE:
- `pollState`=`AWAITING APPROVAL`
- `pollApprovalTimestamp` is NOT set

This background process will be called: `pollsAwaitingApprovalSweep`.

Then the handler will:
- if `pollAcceptabilityScreeningAttempts` >= `ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS`:
    - set the `pollState` to `REJECTED`
    - set the `pollRejectionReason` to `Acceptability Screening has failed ${pollAcceptabilityScreeningAttempts} times and will not automatically be re-attempted.`
    - do NOT call `Acceptability Screening`, and stop processing this poll
- otherwise:
    - set the `pollApprovalTimestamp` to the current date/time in UTC
    - increment `pollAcceptabilityScreeningAttempts` (a field in the poll document) by 1
    - perform the `Acceptability Screening` process on the poll

Note: the attempt is counted when the claim is taken, not when it fails.  
Every attempt passes through this one step, including attempts that end in a way the server never gets to observe -  
for example the process being restarted or killed part-way through the `Acceptability Screening` call.

## Acceptability Screening 
The `Acceptability Screening` process screens a poll to determine if it contains swearing and cursing, vulgarity, hate, pornographic terms and whatever is normally rejected for online communities.  
The fields that are screened are:
- title
- subtitle
- `Choices`
  
*This screening is an item for a research step to determine if there is an open source library that will do this on the server, or if a small LLM can be accessed through an API to accomplish this screening.  
Perhaps there is a tiny LLM GGUF that can be deployed locally that specializes in acceptability screening.  
This would reduce latency, and cost, as well as improve reliability*  

If the `Acceptability Screening` call returns a string that is not empty, the `pollState` will be set to `REJECTED`.  
The `pollApprovalTimestamp` will be cleared, and the `pollAcceptabilityScreeningAttempts` will be set to 0 -  
the screening call completed successfully, so it does not count as a failed attempt, whatever verdict it returned.
Each poll will have a `pollRejectionReason` field that will contain a human-readable string that was returned by the call to `Acceptability Screening`. This is the reason for the rejection.
The `pollRejectionReason` will also be displayed to the user at the top of the `editPoll` page and the `updatePoll` page when `pollState`=`REJECTED`.  
The `pollRejectionReason` will also be rendered on the `adminPoll` page for every poll in the list of polls regardless of what the `pollState` is.  
After a poll is approved, the `pollRejectionReason` will be cleared.
If there is a case when the `pollRejectionReason` has not been cleared properly after the poll is approved, testing will reveal that and the code will be fixed.
Refer to a mockup of the `adminPoll` page for a poll that is `REJECTED` in the image `./designDocs/rejectionReasonOnAdminPollList.jpg`.  

If the poll is NOT `REJECTED`, the call to `Acceptability Screening` will return an empty string.  
In this case, the `pollRejectionReason` will be cleared. 
And the `pollApprovalTimestamp` will be cleared. 
And the `pollAcceptabilityScreeningAttempts` will be set to 0.
Then the `DateTimeCheck` will be performed as described in the next section.

If the `Acceptability Screening` is done using an external API, the server will need to handle potential network errors and API response times appropriately.  
There will be a timeout for the `Acceptability Screening` API call.  
If the API call cannot be completed within `ENV_API_CALL_TIMEOUT` (initially set to 10 seconds), or the API call fails immediately:
- the `pollState` will remain `AWAITING APPROVAL`
- the `pollApprovalTimestamp` will be cleared, which releases the claim so that the next `pollsAwaitingApprovalSweep` tick will re-attempt the `Acceptability Screening`
- the `pollRejectionReason` will be set to a human-readable string `Acceptability Screening has timed out ${pollAcceptabilityScreeningAttempts} times`

Note: `pollAcceptabilityScreeningAttempts` is NOT incremented here. It was already incremented when the claim was taken.

When the `ENV_POLL_APPROVAL_POLLING_INTERVAL` handler finds a poll where all of the following are TRUE:
- `pollState`=`AWAITING APPROVAL` 
- `pollApprovalTimestamp` IS set
- `pollApprovalTimestamp` < (CurrentTime - (`ENV_API_CALL_TIMEOUT`*2))     
then it has found a poll where the `Acceptability Screening` process has timed out.  
For those polls, the following will be done:
- `pollApprovalTimestamp` will be cleared (allowing the `pollsAwaitingApprovalSweep` background process to query for the poll again and re-attempt the `Acceptability Screening`)
- the `pollState` will remain equal to `AWAITING APPROVAL` until the `Acceptability Screening` has completed successfully 
- the `pollRejectionReason` will be set to a human-readable string `Acceptability Screening has timed out ${pollAcceptabilityScreeningAttempts} times`

Note: `pollAcceptabilityScreeningAttempts` is NOT incremented here either, for the same reason.  
This path exists for the case where the server process died between taking the claim and completing the call.  
Because the attempt was already counted when the claim was taken, a process that crashes on every attempt still reaches `ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS` and stops.

Note: `ENV_API_CALL_TIMEOUT` is initially set to 10 seconds.
This condition is a fail-safe in case the `Acceptability Screening` has timed out. The case where the API call has timed out has already been handled above.  

If the API is down for an extended period, the `Acceptability Screening` will be re-attempted up to `ENV_POLL_APPROVAL_POLLING_INTERVAL` milliseconds after each call has failed.  
This could result in endless API calls with no way for the Admin to resolve the `Acceptability Screening` issue.  
The remedy for this is as follows:
There will be a limit to the number of times the `Acceptability Screening` will be re-attempted - `ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS` (initially set to 10).  
This limit is checked by `pollsAwaitingApprovalSweep` before it takes a claim, as described above:  
once `pollAcceptabilityScreeningAttempts` >= `ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS` the `pollState` is set to `REJECTED`,  
the `pollRejectionReason` is set to `Acceptability Screening has failed ${pollAcceptabilityScreeningAttempts} times and will not automatically be re-attempted.`,  
and no further `Acceptability Screening` call is made.
Also, if the limit is reached, i.e. `pollAcceptabilityScreeningAttempts` >= `ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS`, a button or icon will be displayed on the `adminPoll` page that allows the Admin to re-attempt the `Acceptability Screening` process. This would be done if the API is back online and the Admin wants to re-attempt the `Acceptability Screening` process. 
If the Admin clicks the re-attempt button/icon, the same initialization that was done before the previous attempts will be done:
- put the poll in `AWAITING APPROVAL` state
- clear the `pollRejectionReason` field
- clear the field in the poll document called `pollApprovalTimestamp`
- clear the `pollEditUpdateHeartbeatTimestamp` field
- clear the `pollEditUpdateClientGUID` field
- set `pollAcceptabilityScreeningAttempts` to 0

Some of this initialization may be redundant, but it is done to ensure that the poll is in a clean state before re-attempting the `Acceptability Screening`.

The `pollsAwaitingApprovalSweep` will only be required to handle one poll per tick. In the future, when this is deployed to a separate serverless function, it will be architected to handle multiple polls concurrently.  

This `one poll per tick` refers to the tick that actually has 2 queries that must be executed in the following order, and only one of these queries will be executed per tick:
1. the query for polls in the crashed-process case:  
`pollState`=`AWAITING APPROVAL`  AND  `pollApprovalTimestamp` IS set AND  `pollApprovalTimestamp` < (CurrentTime - (`ENV_API_CALL_TIMEOUT`*2))      

2. the query for polls that haven't had a screening done yet:  
 `pollState`=`AWAITING APPROVAL` AND `pollApprovalTimestamp` is NOT set 

First, the query for polls that are in the crashed process case, will be executed. The one poll selected for this tick will be the one that has the oldest `pollApprovalTimestamp`.  

If no poll is found by that query, then the query for polls that haven't had a screening done yet will be executed.  
The one poll selected for this tick will be the one that has:
- the oldest `startAt`, where a poll with no `startAt` sorts before every poll that
  has one - it opens as soon as it is approved, so it is the most urgent in the queue

These rules might not address the exact poll which should be screened first, however, when the `Acceptability Screening` process is working as expected, all polls will be quickly approved or rejected. If it is discovered that improvements can be made to the poll selection for screening, when the system is in beta testing then a requirements change will be made to improve the selection of polls for screening. For now, it will suffice.

One way or the other, the `Acceptability Screening` process must be done to prevent an inappropriate poll from being published.  
Any further resolution to the problem will require a change at the code level, or a change to the `Acceptability Screening` API.  



## Date/Time Check  
After the `Acceptability Screening` process is performed,
if the poll is NOT rejected,  
the process will perform the `DateTimeCheck` to determine if the current date/time falls within the `startAt` and `endAt` (inclusive of both).  
If the `startAt` is empty/undefined, then any current date/time will be considered **AFTER** the `startAt`.  
If the `endAt` is empty/undefined, then the poll **DOES NOT** have an end time so it never closes.
Based on the results of the `DateTimeCheck`, the `pollState` will be transitioned to one of:
- `WAITING TO OPEN`
- `OPEN`
- `CLOSED`

Note: this current date/time test needs to be a re-useable function because it will also be executed by a background process as described below.

In addition, a background process will be running on the server that executes every `ENV_POLL_DATE_CHECK_POLLING_INTERVAL` milliseconds (initially set to 1 minute).
The process does a date check on all polls with any of the following `pollState`:
- `WAITING TO OPEN`
- `OPEN` 
- `CLOSED`

This background process will be called: `pollDateCheckSweep`.
The date check logic is described above.  
The date check background process will also detect polls that have a `startAt` that occurs after the `endAt`, the `startAt` will be set for 1 second before the `endAt` and the `pollState` will be set to `CLOSED`. This is a case that should never occur because the `editPoll` and `updatePoll` pages will prevent the user from setting a `startAt` that is after the `endAt`. But this will be a fail-safe.

Note: in case it hasn't been made clear, a poll can be transitioned between `WAITING TO OPEN`, `OPEN` or `CLOSED` if the `startAt` and `endAt` are adjusted accordingly.

# POLL ADMIN Page
Since the fields for a poll can change as time passes the `adminPoll` needs to auto-refresh, re-rendering rows in place.
For example, some of the changes that can occur are:
- as time passes, the `pollState` moves from `WAITING TO OPEN` to `OPEN` to `CLOSED`
- when editing a poll the `pollState` changes  
- when a poll is going through the `Acceptability Screening` process poll fields change

The interval of the auto-refresh will be set to `ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL` (initially set to 5 seconds).

# CLARIFICATIONS

These requirements have introduced the following naming conventions to be used throughout the code and database schema:
- CONSTANTS appear in the code as SCREAMING_SNAKE_CASE
- CONSTANTS that come from the ENVIRONMENT have the prefix `ENV_`
- variables appear in the code as camelCase. There may be several variables throughout the code that are not camelCase, and are likely SCREAMING_SNAKE_CASE. These will need to be refactored throughout.

The following CONSTANTS throughout the code will have the ENV_ prefix:
- APP_POLLING_INTERVAL -> ENV_POLLING_INTERVAL (default to 5 seconds)
- APP_SMTP_PORT -> ENV_SMTP_PORT (default to 587)
- APP_SMTP_HOST -> ENV_SMTP_HOST (default to sandbox.smtp.mailtrap.io)
- APP_SMTP_USER -> ENV_SMTP_USER (this ENV variable has no default and must be set to a valid SMTP user)
- APP_SMTP_PASS -> ENV_SMTP_PASS (this ENV variable has no default and must be set to a valid SMTP password)
- APP_SMTP_FROM -> ENV_SMTP_FROM (default to "NativeAuthOAuth <no-reply@nativeauth.local>")
- APP_SIGNIN_METHOD -> ENV_SIGNIN_METHOD (default to "native")
- APP_MONGODB_URI -> ENV_MONGODB_URI (default to "mongodb://localhost:27017/app01")
- APP_MONGODB_NAME -> ENV_MONGODB_NAME (default to "app01")
- APP_PORT -> ENV_PORT (default to 9999)
- APP_ADMINS -> ENV_ADMINS (this ENV variable must be set to a comma-separated list of email addresses, no default)
- APP_BETTER_AUTH_SECRET -> ENV_BETTER_AUTH_SECRET (this ENV variable must be set to a random string of at least 32 characters, no default)
- APP_SIGNIN_COOKIE_DURATION_MAX -> ENV_SIGNIN_COOKIE_DURATION_MAX (default to "2592000000") // 30 days in milliseconds
- APP_OAUTH_{PROVIDER}_CLIENT_ID -> ENV_OAUTH_{PROVIDER}_CLIENT_ID (this ENV variable has no default)
- APP_OAUTH_{PROVIDER}_CLIENT_SECRET -> ENV_OAUTH_{PROVIDER}_CLIENT_SECRET (this ENV variable has no default)
  Note: these two variable names are built at runtime from the provider name in `src/auth/auth.ts`,  
  so the rename must change the string template that builds them, not just literal occurrences of the name.  
  These variables are only read when `ENV_SIGNIN_METHOD` = `oauth`.
- ENV_API_CALL_TIMEOUT (default to 10 seconds)
- ENV_POLL_APPROVAL_POLLING_INTERVAL (default to 5 seconds)
- ENV_POLL_DATE_CHECK_POLLING_INTERVAL (default to 1 minute)
- ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL (default to 10 seconds)
- ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS (default to 10)
- ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL (default to 5 seconds)


All the above constants will be read by the server on startup in the loadConfig() function in `src/config.ts`.
Some of the existing constants need to have the prefix changed to ENV_ to make it clear that they are read from the environment, and not hard-coded in the code.  
This applies to:
- .ts files
- launch-dev.ps1
- launch.json
- README.md
- setup-dev.ps1

Renaming these variables that were implemented in previous features to satisfy the new naming conventions, such as 001 and 002, will be done for this 011 requirements.  
That touches CLAUDE.md, the git-ignored launch configs, postman/openapi.json, existing tests, and any vars already set on DigitalOcean. This rides along with these requirements (011). 

Whenever the `pollState` changes, existing votes always remain intact.  

The `ENV_POLLING_INTERVAL` and the `ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL` will remain distinct.

ENV_ADMINS has no default and must be part of system setup.

To make it clear, if the `pollState` = `ARCHIVED`, the three dot menu will not have either `Edit Poll` or `Update Poll`.

Another previous requirement that allowed votes to be removed and marked as `(removed)` in the database does not have enough benefit to justify the cost.  
The feature of removing votes is a feature that only an admin can perform and removed votes are simply deleted from the collection.

The poll Action `Delete Poll` will be ONLY be available in the three dot menu on the `adminPoll` page for polls the following `pollState`:
- `INITIALIZED`
- `REJECTED`
- `ARCHIVED`

When the user clicks `Delete`, they will be presented with a confirmation dialog that asks if they are sure they want to delete the poll.  
  
In addition, if a user is "Banned" from a poll, their votes are simply deleted from the collection.  
The previous requirement that allowed votes to be marked as `(removed)` in the database is not needed and is removed.

As described above, one of the states a poll can have is `ARCHIVED`.  
A poll can only be `ARCHIVED` from the `CLOSED` state. Once a poll is `ARCHIVED`, it can never be changed back to any other state.  
The poll is simply stored in the database for historical purposes and can be viewed by admin users.  
The votes are also stored in the database for historical purposes.

The new `Save and Publish` and `Cancel` buttons implies that the auto-save feature of the `editPoll` page and the `updatePoll` page is no longer needed. 
This eliminates the possibility of incomplete poll edits appearing to the public before the admin has completed all the editing.

If the database schema needs to be changed (likely simplified), that's okay. That's good.  
There is no need to preserve or migrate existing votes.  
Existing collections and document do not need to be migrated.  
This system is still in development and there are no production users.  
The database can be dropped and re-created with a new schema if needed.  


To aid in the `Acceptability Screening` research step:
- poll text may leave the system — for example if a hosted API is used, private drafts may be sent to a third party

# EXCLUSIONS

System Logging will be implemented in a future requirement.

The capitalized constants for `pollState` will be used in the UI and displayed exactly to the user.  
In other words, the `pollState` will be displayed to the user exactly as it is stored in the database.
In a future requirement, these `pollState` constants will be mapped to a more user-friendly string that is displayed to the user.

A future requirement will be written to deploy all the background processes described above to a separate serverless function that is a SINGLETON to ensure that only one instance is running at a time.
Currently, these background processes are:
- `staleEditUpdateSweep` - executes every (`ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL`*2) milliseconds
- `pollsAwaitingApprovalSweep` - executes every `ENV_POLL_APPROVAL_POLLING_INTERVAL` milliseconds
- `pollDateCheckSweep` - executes every `ENV_POLL_DATE_CHECK_POLLING_INTERVAL` milliseconds




