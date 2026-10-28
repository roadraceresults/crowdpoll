# Data Model: Admin Search, Material 3

**No server data, no schema change, no migration.** The search request and its results are unchanged.

## Client state

One module variable in `adminList.js`, `searchCollapsed` (boolean, default false), in memory only: it is not stored
and does not survive a reload. It drives the form's `data-collapsed` attribute, the toggle's `aria-expanded` and its
label. Nothing else is held by the panel beyond its form controls. (The More filters preference,
`sessionStorage["admin:moreFilters"]`, was removed by FIX01.)

## Radio groups

| Group (`name`) | Options, in order (value → label) |
|---|---|
| `visibility` | `""` → Any visibility (default) · `Public Poll` → Public · `Private Poll` → Private |
| `choiceMode` | `""` → Any choice mode (default) · `Single-Choice Poll` → Single Choice · `Multiple-Choice Poll` → Multiple Choice |
| `voteMutability` | `""` → Any vote mode (default) · `Dynamic-Vote Poll` → Vote can change · `Final-Vote Poll` → First vote is final |

A group sends a filter only when an option other than Any is chosen, with the same value the replaced select sent.

## Form fields (unchanged names)

`q`, `state`, `visibility`, `choiceMode`, `voteMutability`, `createdBy`; `createdAt`/`startAt`/`endAt` each
with `…Op` (`eq`·`gte`·`lte`); `voteCount`/`invitedVoterCount`/`bannedVoterCount` each with `…Op`
(`gte`·`lte`·`eq`).

## Admin list row, two added fields (FIX04)

| Field | Source | Empty when |
|---|---|---|
| `createdByName` | `polls.created_by_name` | no creator is recorded |
| `createdByEmail` | `user.email`, looked up by `polls.created_by_id` for the page (`creatorEmails`) | no creator is recorded or the account no longer exists |

The card's Created By text is `<username> (<email>)`, the email alone when there is no username, and absent when both are empty.
