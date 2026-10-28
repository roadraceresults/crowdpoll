# HTTP Contracts: Poll Invitations

All routes are described in `postman/openapi.json`.
Both invitee routes sit behind `requireOwnPoll` (`src/routes/pollsApi.ts`): the poll's creator, or an administrator;
a poll that is not the caller's own answers `404` (feature 025).

## A1. `GET /api/admin/polls/:pid/invitees`

The poll's invitation list with statuses, in list order.

**200**

```json
{
  "invitees": [
    {
      "email": "ann@example.com",
      "userName": "Ann Lee",
      "status": "Voted",
      "addedAt": "2026-10-26T15:00:00.000Z",
      "sentAt": "2026-10-26T15:00:02.000Z",
      "remindedAt": null,
      "canResend": false,
      "resendBlockedReason": "Ann Lee was emailed less than 24 hours ago."
    }
  ],
  "invitationCount": 1,
  "acceptedCount": 1,
  "voterLimit": 100,
  "editable": true
}
```

- `status` is one of `Not sent yet`, `Not delivered`, `Invited`, `Accepted`, `Voted` (data-model, Status).
- `userName` is the account's user name when the address has an account, else `""`.
- `editable` is false on a CLOSED or ARCHIVED poll.
- `canResend` / `resendBlockedReason` follow the data-model's reminder rule; the reason is one of
  `"The poll is closed."`, `"The poll is not open."`, `"Already reminded once."`,
  `"<name or address> was emailed less than 24 hours ago."` (research R16).
- **400** `{ "error": "This poll is not Invitation Only." }` for any other poll.

## A2. `POST /api/admin/polls/:pid/invitees`

Exactly one of `add`, `remove`, `resend`; `timeZone` is optional with each (A5).

```json
{ "add": "ann@example.com, bob@example.com\ncara@example.com", "timeZone": "America/New_York" }
{ "remove": ["bob@example.com"], "confirmVoted": false }
{ "resend": "ann@example.com" }
```

**200 (add)** — every address in the input, in order, with its outcome:

```json
{
  "results": [
    { "email": "ann@example.com", "outcome": "added" },
    { "email": "bob@example", "outcome": "invalid", "reason": "Not a valid email address." },
    { "email": "a.nn@gmail.com", "outcome": "duplicate", "reason": "Already invited." },
    { "email": "eve@example.com", "outcome": "banned", "reason": "Banned from this poll." },
    { "email": "zed@example.com", "outcome": "voter-limit", "reason": "The poll's voter limit of 100 is reached." },
    { "email": "kim@example.com", "outcome": "not-launched", "reason": "CrowdPoll has not launched for this address yet." },
    { "email": "lou@example.com", "outcome": "added", "waiting": true }
  ],
  "invitees": [ … as A1 … ],
  "invitationCount": 1,
  "acceptedCount": 0
}
```

- On an OPEN poll, the added addresses are emailed straight after the response's transaction commits; otherwise they
  wait, as `Not sent yet`, for the poll to open and for the creator's daily allowance (research R6, R7).
- An address whose email key was removed from this poll after being emailed is `added` with its earlier `sentAt`
  and `remindedAt` restored, and is not emailed again (R15).
- An add is never refused for the daily limit. On an OPEN poll, an address past the creator's remaining allowance is
  `added` with `waiting: true`: it stays `Not sent yet` and the sweep sends it, oldest first, as the rolling 24 hours
  free up (R7, TWEAK01). Only a resend is refused `429 daily-limit`.

**200 (remove)** — `{ "removed": ["bob@example.com"], "invitees": […], "invitationCount": …, "acceptedCount": … }`

- **409** `{ "error": "…has voted…", "code": "invitee-voted", "voted": ["bob@example.com"] }` when an address
  being removed has voted and `confirmVoted` is not `true`; nothing is removed.

**200 (resend)** — `{ "invitees": […] }`; the reminder is sent after the response.

- **409** `{ "error": <resendBlockedReason>, "code": "resend-unavailable" }` when the reminder rule refuses,
  including on a poll that is not open; nothing is queued.
- **429** `{ "error": "Your daily invitation limit is reached.", "code": "daily-limit", "retryAt": "…" }`.

**Common refusals**

- **400** `{ "error": "This poll is not Invitation Only." }`.
- **400** `{ "error": "Send one of add, remove or resend." }`.
- **409** `{ "error": "This poll is closed; its invitations can no longer change.", "code": "poll-closed" }` on a
  CLOSED or ARCHIVED poll.

**Never** changes `pollState`, the edit-session fields or the poll's review (FR-014).
Each change logs one line with masked addresses, e.g. `[invitations] Added 2, refused 1 on poll <pid>`.

## A3. `GET /api/admin/polls` rows

Each row gains `acceptedCount` (integer) beside the existing `invitationCount`; both are `0` for a poll that is not
Invitation Only. Each row of the list and of `GET /api/admin/polls/search` also carries `ownPoll` (boolean): true when
the caller created the poll (TWEAK09).

## A4. Changed behaviour of existing routes

- **Sign-in** (BetterAuth `session.create.after`): the new session's address adopts every invitation with the same
  email key (research R2). No response changes.
- **`GET /` with `?PID=`** (`resolveSharedLink`): adopts by email key before the invitation check, and sets
  `accepted_at` for an invited caller of an Invitation Only poll (R3). Landings are unchanged.
- **`GET /api/me/tabs/shared-with-you`**: adopts by email key first, then sets `accepted_at` for every invited poll it
  returns. The response is unchanged.
- **`POST /api/polls/:pid/vote`** (TWEAK10, FR-041): on an Invitation Only poll the creator (matched by account id)
  votes without an invitation; while they hold none, their vote is left out of the voter-limit count. Other voters still
  need an invitation (`403 You are not invited to this poll.`). The response is unchanged.
- **Account deletion**: removes invitations and invitation history by email key (R10, R15).

## A5. `timeZone` on the admin card's writes

`PATCH /api/admin/polls/:pid`, `POST /api/admin/polls/:pid/save`, `POST /api/admin/polls/:pid/publish`,
`POST /api/admin/polls/:pid/colors` and A2 accept an optional body field `timeZone` (an IANA name, e.g.
`"America/New_York"`).
A valid zone is stored as `polls.time_zone`; an invalid or missing one is ignored, never refused.
It changes no response, no content version, no state and no review (research R14).
