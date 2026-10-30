Start a new spec for these requirements called `20261029-225209-EDITING-POLL-AVAILABLE`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

Currently, the Admin Poll Card allows certain Poll settings to be updated when a poll is active, and has received votes.  
These settings include:  
- title  
- subtitle  
- choice colors for bars and lines in graphs
- available of line graph
- end date

However, when the Admin Poll Card is in editing mode, the poll is made unavailable for voting.

One requirement is to make the poll available for voting while the Poll settings are being edited.  
If that isn't possible then the time must be minimized during which the poll is unavailable for voting.  

A second requirement is to allow additional settings to be updated while the poll is active and has received votes.  
When the Admin Poll Card is "Saved" the new settings will take effect. Or as soon as made possible by the current Intervals and Sweeps mechanism.

The additional settings are as follows:

1. Choices can be added while the poll is active and has received votes.  

> **Superseded 2026-10-30 (IN1)**: the control-by-control UI below — the Add Choice field and button, the Delete Choice dropdown and button, and the removal of the Paste choices button and the help text — is superseded by the section "Additional Requirements (2026-10-30 9:16 AM)" at the end of this document.  
> The Choices step keeps today's textbox, Paste choices button and help text in every state;  
> additions, deletions and unchanged choices are determined by the merge on focus loss, and the controls below are not built.  
> The deletion-confirmation sentences at the end of point 1 still apply.  

When the poll is "Open":
the "Choices" section of the Admin Poll Card,   
will not have a "Paste Choices" button, and will not have the help text, "One choice per line. Press Enter after each choice. For emoji press Win + .".  
There will be an "Add Choice" button, on the row where the "Paste Choices" button would have been.  
There will be an edit field to the left of the "Add Choice" button.  
Initially the "Add Choice" button will be disabled until text is entered into the edit field.  
When the "Add Choice" button is clicked, the text from the edit field will be appened to the list of Choices.  
The edit field will then be cleared and the "Add Choice" button will be disabled again until new text is entered.  
If the number of Choices is equal to the maximum allowed, the "add Choice" button will be disabled.  
There will be a "Delete Choice" button below the "Add Choice" row.  
To the left of the "Delete Choice" button will be a dropdown box with a list of existing choices, each with its current vote count (current when the Admin Poll Card went into edit mode).  
The "Delete Choice" button will be disabled until a choice is selected from the dropdown box.  
The "Delete Choice" button will remove the selected choice from the list of Choices shown in the Choices text area, and the dropdown box will be unselected and the choices in it will be updated accordingly.  
When the "Choices" section loses focus, either by clicking the circle for another section, clicking the "Next" button, or clicking the "Save" button,  
the user will be prompted to confirm deletion of choices, if any.  
Clicking "Cancel" will, of course, abort the deletion process and leave the choices unchanged.  

2. If the "Open" poll is a "Private" poll it can be switched between "Invitation Only" and "Anyone with the Link".  
If it was switched away from "Invitation Only" to "Anyone with the Link", the poll will remain accessible to those who have the link, but new invitations will not be required.  
The record of "Invitations" will remain unchanged, showing who was invited while the poll was in "Invitation Only" mode.  
If it was switched from "Anyone with the Link" to "Invitation Only", new invitations will be required for those who wish to access the poll.  
Even if a user has voted, the will no longer have access to the poll unless they receive an invitation.  
This is not an ideal situation, but is the the decision of the poll creator.  
Note: a Private poll cannot be made public while it is active, and a Public poll cannot be made private while it is active.  

3. If a poll is Single Choice, it can be changed to multiple choice once it is open and even if it has received votes.  
But if it is multiple choice, it cannot be changed to single choice once it is open.  

4. The options for Vote Mutability, Dynamic and Final can be switched while the poll is open and even if it has received votes.  
Once again, this isn't ideal, but it is the decision of the poll creator.  

## Accepted Resolutions (2026-10-30)

The following decisions were accepted from `requirements-report.md` (findings UA1–UA9, AM2–AM5) and are part of these requirements.

- **Choice identity (UA1)**: on a poll with votes, choices are changed by id;  
  additions append new ids, a deletion removes one id, and every surviving choice keeps its id, label and position.  
  The whole-list replacement path stays reserved for polls without votes.  
- **Voting during editing (UA2)**: the edit session is kept for editor exclusivity and expiry,  
  but votes are no longer refused while a poll is `EDITING` with a stashed state of `OPEN`;  
  the voter-facing "momentarily unavailable" flow disappears for open polls.  
- **Delete dropdown counts (UA3)**: the vote counts shown in the Delete Choice dropdown are returned once, in the edit-session response,  
  read through the existing results path, and held by the card for the life of the session.  
- **Added choice colour and position (UA4)**: an added choice is appended at the end with no manual colour (Automatic);  
  the Colors step lists it like any other choice.  
  Existing choices keep their positions, so no existing Automatic bar changes colour.  
- **Switch to Invitation Only (UA5)**: votes already cast stay counted and visible in results;  
  `user_polls` relations and Participants rows are kept;  
  only access (viewing, voting, watching) is refused until the address is invited, at which point everything reconnects by email key.  
- **Mode and mutability switches (UA6)**: existing votes are kept exactly as cast;  
  the new rules apply only to votes from the save onward.  
  Accepted consequences: Single → Multiple changes the percentage base, so bars can sum past 100 %;  
  Dynamic → Final freezes every existing voter's vote as it stands;  
  Final → Dynamic lets every past voter change their vote from then on.  
- **When settings take effect (UA7)**: settings and choices take effect at Save (the poll projection is rewritten in the same transaction);  
  schedule changes take effect within one date-check sweep;  
  invitation emails go out within one invitation sweep (or at once while the poll is open);  
  screened text follows the decision of NC1.  
- **Delete Choice lower bound (UA8)**: the Delete Choice button is disabled when deleting would leave fewer than `ENV_MIN_CHOICES` choices,  
  and the server refuses such a save with the same rule.  
- **Add Choice validation (UA9)**: an added label is trimmed, capped at the existing-poll limit of 100 characters,  
  and refused when it duplicates a current choice's label (exact match after trimming);  
  the Add Choice button stays disabled for an invalid value.  
- **Freeze scope (AM2)**: the freezes on visibility (a Private poll cannot become Public and vice versa) and on choice mode (Multiple cannot become Single) stay keyed on "has ever been voted on", exactly as every existing freeze is;  
  an OPEN poll with no votes keeps today's full editing freedom, and the new wording only loosens the rules it names.  
- **Cancel on the deletion confirmation (AM3)**: clicking Cancel reverts the whole Choices section to the state it had when the card entered edit mode.  
- **Choices merge rule (AM4)**: the merge on focus loss matches by exact label after trimming;  
  a line equal to a current choice's label keeps that choice and its id, a line matching no current label is an addition, and a current label with no matching line is a deletion (with its votes, per the resolution of NC2);  
  a rename is therefore a deletion plus an addition, which the confirmation prompt makes visible.  
- **Deletion confirmation scope (AM5)**: the confirmation prompt appears only when at least one deleted choice has votes (per the UA3 snapshot), naming those choices and their counts;  
  zero-vote deletions apply without a prompt.  

## Additional Requirements (2026-10-30 9:16 AM)

We have changed the requirements for the "Add Choice" and "Delete Choice" functionality.  
Rather than having a different method of entering choices after the poll has received votes,  
The user will simply edit the Choices in the same textbox that exists now.  
Then when the "Choices" section loses focus for any other reason, the current Choices wil be merged with the new Choices,  
and from that it can be determined which choices are new, which have been deleted, and which remain unchanged.  
Then the same logic for confirming the deletion of choices that have received votes will be applied, prompting the user to confirm or cancel the deletion as necessary.  

 



