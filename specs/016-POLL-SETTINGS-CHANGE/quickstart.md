# Quickstart: Validating the Poll Settings Change

Runnable scenarios that prove the feature works end to end, one section per user story. Details
live in [data-model.md](./data-model.md) and [contracts/](./contracts/) rather than being repeated
here.

## Prerequisites

```
npm install
npm test                # all suites, no local MongoDB needed
npm run build           # tsc + copy src/public -> dist/public
```

For manual validation you need a running server with an admin identity and one ordinary account.
Regenerate the git-ignored dev tooling from the checked-in templates (`launch.json.example`,
`devScripts.example/`), then:

```
npm run dev             # needs ENV_*; use devScripts/launch-dev.ps1 on Windows
```

Settings worth lowering while validating:

| Setting | Set to | Why |
|---|---|---|
| `ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW` / `…_MAX_REQUESTS_PER_WINDOW` | `1` / `20` | Two accounts sign in and out repeatedly below |
| `ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL` | `2000` | The read-only face refreshes quickly after a save |

**Before first run**: drop the `polls` and `voteHistory` collections — two `drop()` calls, never
`dropDatabase()`. Every existing poll holds a `pollVisibility` that no longer exists and will fail
validation on its first save rather than error on load. Leave `user`, `session`, `verification` and
`email_change_requests` alone (spec FR-022).

## US1 — Three plain decisions (P1)

1. Sign in as an `ENV_ADMINS` address, open `/admin`, press **Create New Poll**.
2. **Expect**: the card opens in editing form; `Poll Visibility` offers exactly `Public Poll` and
   `Private Poll`, with `Public Poll` selected; no `Sharing Mode` or `Anonymous Votes` group is
   visible.
3. Select `Private Poll`.
4. **Expect**: `Sharing Mode` (`Anyone With The Link` selected) and `Anonymous Votes` (`Yes`
   selected) appear immediately after `Poll Visibility`, in that order. The voter limit field
   becomes available, as before.
5. Select `Invitation Only` and `No`. Select `Public Poll`, then `Private Poll` again.
6. **Expect**: `Invitation Only` and `No` are still selected — nothing was cleared.
7. Give the poll a title and two real choices; **Save**.
8. **Expect**: the read-only face shows `Poll Visibility: Private Poll`, `Sharing Mode: Invitation
   Only`, `Anonymous Votes: No` in the mechanics block. Measure the card's height in read-only
   form, open it for editing, measure again: identical (SC-005). Repeat for a public poll:
   identical, and one field instead of three.

## US2 — Settings freeze once voted (P2)

1. Make the poll from US1 private + `Anyone With The Link`, publish it and open it.
2. As the ordinary account, open the poll by link and vote.
3. As the admin, open the card for editing.
4. **Expect**: `Poll Visibility`, `Sharing Mode` and `Anonymous Votes` all render as frozen static
   text with their current values.
5. In the card's `Participants` section, click `Ban from Voting` next to the ordinary account (this
   removes its vote), save, then `Un-ban` it and save again. Reopen the card for editing.
6. **Expect**: still frozen — the poll has *ever* been voted on.
7. With the browser's developer tools, replay the card's publish request with
   `"pollSharingMode": "Invitation Only"` added to the body.
8. **Expect**: `400` with `This poll has votes; only title, subtitle, startAt, endAt,
   invitedVoterList, bannedVoterList, voterCountLimit may be changed.` — the same refusal
   `pollVisibility` gets on a voted poll; the card's status line shows that text; the poll is
   unchanged. Repeat with `"voteAnonymity": "No"` → the same. (The validator's own
   field-naming `409` is covered by the unit tests in `polls-service.test.ts`.) Repeat with
   `"voteAnonymity": "Maybe"` on a never-voted poll → `400 Invalid voteAnonymity.`

## US3 — Invitation-only keeps working (P3)

This is the regression guard. Run it against a private `Invitation Only` poll with the ordinary
account's address in its invited list, and a second ordinary account that is not invited.

1. As the uninvited account, open the poll's `?PID=` link.
2. **Expect**: refused — `You are not invited to this poll.`
3. As the invited account, sign in and open `/`.
4. **Expect**: the poll is on the home grid; opening it and voting succeeds.
5. As the admin, expand the card's participants section.
6. **Expect**: captioned `Invitations`, with the Invite row present; the not-yet-voted invitee is
   listed.
7. Change the poll (never voted on, or a fresh one) to `Anyone With The Link`; as the uninvited
   account open its link.
8. **Expect**: it opens and can be voted on.
9. Set a **public** poll's sharing mode to `Invitation Only` (flip to private, choose it, flip back
   to public, save). As a signed-out visitor, open it.
10. **Expect**: it behaves as a public poll; the sharing mode is ignored.
11. Duplicate the invitation-only poll from step 1.
12. **Expect**: the duplicate is private, `Invitation Only`, same anonymity, and carries the same
    invited (and banned) addresses. Duplicate an `Anyone With The Link` poll: no lists copied.

## US4 — Admin sees the fields; voters don't (P4)

1. As the admin, request `GET /api/admin/polls` and `GET /api/admin/polls/<pid>`.
2. **Expect**: every row / the detail carries `pollVisibility`, `pollSharingMode` and
   `voteAnonymity`.
3. As a voter (or signed out, for a public poll), request `GET /api/polls` and
   `GET /api/polls/<pid>`.
4. **Expect**: neither response contains `pollSharingMode` or `voteAnonymity`; the rest of each
   response is as before.

## Anonymity has no reader (FR-018)

1. Take a private poll with votes; request `GET /api/admin/polls/<pid>/results` and
   `…/participants`. Set `voteAnonymity` to the other value on a never-voted copy with the same
   votes seeded, and request both again.
2. **Expect**: identical bodies. Nothing in this feature reads the setting.

## Automated checks

```
npm test
```

Suites that carry the feature's assertions: `polls-admin-crud` (the two `409`s, the two `400`s,
defaults on create, duplicate), `polls-vote` and `polls-discovery` (eligibility and the home grid
under the private-and-Invitation-Only rule, the stale-sharing-mode public poll),
`polls-admin-participants` (`notYetVoted` under the rule), `openapi-contract` (narrowed enum, new
admin properties, absence from public schemas). Every suite that previously built a private poll
by its old five-word value now builds it from the pair — SC-008 is that no test names an old value.

## Release step

On the deployed instance, as part of the release: drop `polls` and `voteHistory` — two `drop()`
calls, never `dropDatabase()`. Autodeploy from `dev` means there is no later moment to decide
this. Confirm afterwards that an existing account can still sign in (SC-007).
