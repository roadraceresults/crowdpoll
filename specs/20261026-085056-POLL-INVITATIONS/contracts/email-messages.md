# Email Messages: Poll Invitations

One function, `invitationMessage(…)` in `src/email/templates.ts` (research R9), builds both messages with `layout()`
(logo, footer naming `support@crowdpoll.vote`, the policy links); everything is escaped, nothing is tracked, and the
recipient is masked in logs.
The approved draft is `requirements/20261026-085056-poll-invitations/invitation-email.html`; it is redrawn from this
function by `npx tsx devScripts/render-invitation-email.ts requirements/20261026-085056-poll-invitations --force`.

`<creator name>` is the creator's user name, `<creator email>` their address, `<title>` the poll's title,
`<link>` is `${ENV_PUBLIC_ORIGIN}/?PID=<pid>`, `<origin>` is `ENV_PUBLIC_ORIGIN`.
`<launched>` and `<end>` are `polls.launched_at` and `polls.end_at`, written by `formatPollDate` in `polls.time_zone`
(UTC when null), like `Monday, October 26, 2026, 12:59 PM EDT` (research R14).

## M1. Invitation

- **Subject**: `<creator name> invited you to a private poll on CrowdPoll: "<title>"`
- **Preheader**: `You're invited to vote in "<title>".`
- **Heading**: `You are invited to vote in a Private Poll:`
- **Heading line 2** (`headingLine2`): `"<title>"`
- **Paragraphs**:
  1. `<creator name> (<creator email>) invited you to vote in their poll "<title>" on CrowdPoll. That's why we're writing to you.`
  2. `It's an Invitation Only private poll: only the people <creator name> invites can see it and vote.`
  3. *(only when the poll's votes are anonymous to the creator)* `Your vote will be anonymous: <creator name> will not see how you voted.`
  4. `Poll Started: <launched>`
  5. *(only when the poll has an end)* `Poll Ends: <end>`
- **Button**: `Open the poll` → `<link>`
- **Closing**:
  1. `If you'd rather not take part, just ignore this email. We won't contact you again, except for up to one reminder about this poll if <creator name> re-sends it, another private invitation, or where the law requires it.`
  2. `<creator name> gave us your address only for this poll; our Privacy Policy (<origin>/privacy#invitations) explains how we use it and how to have it removed.`

## M2. Reminder

As M1, with:

- **Subject**: `Reminder: <creator name> invited you to a private poll on CrowdPoll: "<title>"`
- **Heading**: `Reminder: you are invited to vote in a Private Poll:`
- **Closing 1**: `If you'd rather not take part, just ignore this email. This is the only reminder we'll send about this poll.`

The dates are read at the reminder's send, so `Poll Ends` shows the end as it is then.

## Plain-text part

`layout()`'s text part, with `headingLine2` on its own line directly after the heading:

```text
CrowdPoll

You are invited to vote in a Private Poll:
"When do you want to meet?"

David Brooks (roadraceresults@gmail.com) invited you to vote in their poll "When do you want to meet?" on CrowdPoll. That's why we're writing to you.

…

Poll Started: Monday, October 26, 2026, 12:59 PM EDT

Poll Ends: Monday, November 2, 2026, 5:00 PM EST

Open the poll:
https://crowdpoll.vote/?PID=…
```
