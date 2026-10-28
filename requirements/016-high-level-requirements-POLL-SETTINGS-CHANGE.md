Start a new spec for these requirements called `016-POLL-SETTINGS-CHANGE`.

# Overview
The purpose of this requirements doc is to describe an update to the poll settings.  
This will be implemented before the next requirements document describes a major change of moving from mongoDB to PostgreSQL and adding a search engine.  
## POLL_VISIBILITIES
The POLL_VISIBILITIES array will be updated from:
```
export const POLL_VISIBILITIES = [
  "Public Poll",
  "Private Poll - Anyone With The Link - Do Not Show Who Voted",
  "Private Poll - Anyone With The Link - Show Who Voted",
  "Private Poll - Invitation Only - Do Not Show Who Voted",
  "Private Poll - Invitation Only - Show Who Voted"
] as const;
```
to:
```
export const POLL_VISIBILITIES = [
  "Public Poll",
  "Private Poll"
] as const;
```

## NEW POLL FIELDS
To support this change, some fields will be added to the poll schema.  

pollSharingMode: "Anyone With The Link" | "Invitation Only"
note: this field is only relevant for private polls, and will be ignored for public polls.

voteAnonymity: "Yes" | "No"
note: this field is only relevant for private polls, and will be ignored for public polls. It determines whether the poll creator will be able to see who voted for which choice. It does not affect whether the poll creator can see the total number of votes for each choice.
An admin can see who voted for which choice in any poll, regardless of the voteAnonymity setting.
Voters who did not create the poll can never see who voted for which choice, regardless of the voteAnonymity setting.
On the admin card this field is labelled **"Anonymous Votes"**. `Yes` means voter identities are
hidden from the poll creator; `No` means the creator can see who voted for which choice.

## ADMIN POLL CARD CONTROLS
The admin poll card will have a new control to select the POLL_VISIBILITY that is simply a radio button with the two options: "Public Poll" and "Private Poll".
Once the poll has received votes, the POLL_VISIBILITY control will be disabled and cannot be changed.

There will also be a new control to select the pollSharingMode, which is a radio button with the two options: "Anyone With The Link" and "Invitation Only".   
This control will only be visible if the POLL_VISIBILITY is set to "Private Poll".
Once the poll has received votes, the pollSharingMode control will be disabled and cannot be changed.

There will also be a new control to select the voteAnonymity, which is a radio button with the two options: "Yes" and "No".   
This control will only be visible if the POLL_VISIBILITY is set to "Private Poll".  
Once the poll has received votes, the voteAnonymity control will be disabled and cannot be changed.

"Has received votes" means the poll has **ever** been voted on (`hasEverBeenVotedOn`) — the same
rule that already freezes `pollVisibility` today. Deleting the votes does not unfreeze any of the
three controls, and the server rejects a change to any of them on such a poll, as it already does
for `pollVisibility`.


# Assumptions

# Exclusions
- **No data migration.** Every existing poll document carries a `pollVisibility` value that no
  longer exists, so the `polls` and `voteHistory` collections are dropped as a release step,
  exactly as 014 did — `voteHistory` goes because its rows reference polls by `pid` and would be
  orphaned. The authentication collections — `user`, `session`, `verification` and
  `email_change_requests` — contain none of the changed values and are **not** touched: no
  account is lost and nobody is signed out. Nothing is converted or copied.
