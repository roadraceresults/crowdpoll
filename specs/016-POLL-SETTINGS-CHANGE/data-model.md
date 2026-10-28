# Data Model: Poll Settings Change

The feature touches one entity, `Poll`, adds two enumerations, narrows one, and re-bases one
predicate. Everything else in the model is unchanged and is not restated here.

## Enumerations

All three are stored verbatim and rendered verbatim; there is no code-to-label mapping anywhere.

| Constant | Values | Change |
|---|---|---|
| `POLL_VISIBILITIES` | `"Public Poll"`, `"Private Poll"` | narrowed from five values to two |
| `POLL_SHARING_MODES` | `"Anyone With The Link"`, `"Invitation Only"` | new |
| `VOTE_ANONYMITIES` | `"Yes"`, `"No"` | new |

Derived types `PollVisibility`, `PollSharingMode`, `VoteAnonymity` are each `(typeof X)[number]`.
`INVITATION_ONLY_VISIBILITIES` is removed.

## `Poll` — changed and added fields

| Field | Type | Required | Default (new poll) | Meaning |
|---|---|---|---|---|
| `pollVisibility` | `PollVisibility` | yes | `"Public Poll"` | Whether the poll is open to everyone. Unchanged in role; narrowed in range |
| `pollSharingMode` | `PollSharingMode` | yes | `"Anyone With The Link"` | For a private poll, whether anyone with the link may take part or only invited addresses. Always present; **ignored while the poll is public** |
| `voteAnonymity` | `VoteAnonymity` | yes | `"Yes"` | For a private poll, whether the creator may see who voted for which choice (`"No"`) or totals only (`"Yes"`). Always present; ignored while public; **not read by anything in this feature** |

Both new fields are **never cleared**. Switching a poll to public leaves them as they were;
switching it back to private exposes the stored values.

## Validation rules (on update)

Applied in `validatePollFields`, per field, in the same shape as the existing `pollVisibility` rule:

| Condition | Result |
|---|---|
| Field present in the body and the poll has ever been voted on | refused — `409`, `"<field> cannot be changed after the poll has received a vote."` |
| Field present and its value is not in the field's enumeration | refused — `400`, `"Invalid <field>."` |
| Field present, poll never voted on, value valid | stored |
| Field absent | untouched |

"Ever been voted on" is `hasEverBeenVotedOn` (a `voteHistory` row exists for the poll); deleting
votes does not reset it. A public poll accepts and stores any valid value for the two fields.

## The invitation-only predicate

```
isInvitationOnly(poll) ⇔ poll.pollVisibility ≠ "Public Poll" ∧ poll.pollSharingMode = "Invitation Only"
```

Takes the poll (or a `Pick` of the two fields), never the visibility string alone. It is the single
definition used by:

| Consumer | Effect when true |
|---|---|
| `checkViewEligibility` | a caller not on `invitedVoterList` may not view the poll |
| `viewerVoteBlock` | a caller not on `invitedVoterList` may not vote |
| `validatePollFields` roster reconciliation | `currentVotes` is restricted to invited addresses and each gets a not-yet-voted placeholder |
| `duplicatePoll` | the invited and banned lists (and placeholders) are copied |
| participants route | the response carries `notYetVoted` and the card labels the section "Invitations" |
| `homeGridFilter` | (as a query) the poll appears on a signed-in invitee's home grid |
| `adminCard.js` `isInvitationOnly()` | section labels, Invite row, empty-state text |

The MongoDB form of the same rule, for `homeGridFilter`:
`{ pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" }`.

## State and lifecycle

No poll state changes. One lifecycle rule applies to the three settings together:

```
never voted on ──(first vote recorded in voteHistory)──▶ ever voted on
   settings editable                                          settings frozen (409 on change;
                                                              controls rendered frozen)
```

The transition is one-way; vote deletion does not reverse it. This is the existing rule for
`pollVisibility`, now covering all three.

## Read-only and editing views (client model)

| Poll visibility | Editing form shows | Read-only form shows |
|---|---|---|
| `"Public Poll"` | `Poll Visibility` radio; sharing-mode and anonymity groups **hidden** (draft values retained) | `Poll Visibility` |
| `"Private Poll"` | `Poll Visibility`, `Sharing Mode`, `Anonymous Votes` radios (frozen rendering when ever voted on) | `Poll Visibility`, `Sharing Mode`, `Anonymous Votes` |

Both forms place the fields in the mechanics block after `Poll Visibility`, so the card's height
is the same in both forms for a given visibility.

## What is *not* in the model

- No derived "is private" field: it is `!isPublicVisibility(v)`.
- No stored "show who voted" — the old value's second half maps to `voteAnonymity`, which nothing
  reads yet.
- No migration of existing documents: every stored `pollVisibility` is invalid after this feature,
  and `polls` plus `voteHistory` are dropped as a release step (spec FR-022).
