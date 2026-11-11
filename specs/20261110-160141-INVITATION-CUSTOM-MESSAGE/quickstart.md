# Quickstart: Invitation Custom Message

## Automated

```
npx tsc --noEmit
npx vitest run tests/invitation-email.test.ts tests/email-layout.test.ts tests/field-limits.test.ts
npx vitest run tests/polls-screening.test.ts tests/polls-pending-update.test.ts tests/polls-discovery.test.ts
npx vitest run tests/client-notes-editor.test.ts tests/client-admin-wizard.test.ts
npm test
```

## Manual (development server, native sign-in, dev mailer logging messages)

1. **Field and counter** (C1): create a poll, choose *Only people you invite* in Step 1. The *Custom Email Message* field
   appears directly under that radio button, with a line between the answers' sections; choose "... edit", type two lines with a bold word, Done. The preview shows both
   lines and the bold word; the counter reads `n / 1000`.
2. **Limit**: paste 1001 characters; the counter turns red and Done is refused.
3. **Summary** (C2): the Settings Summary shows `A Custom Invitation Email Message has been entered.` after the Who line;
   choosing it returns to Step 1 with "... edit" focused.
4. **Kept across a switch**: choose *Anyone you send the link to*; field and summary line disappear. Choose *Only people
   you invite* again; the message is back.
5. **Email** (C4): publish, wait for approval, add an invitee. The sent email shows the message in a grey rounded box
   right after "… invited you to vote …"; the text part has the words without `**`.
6. **Reminder**: re-send to the invitee; the reminder has the box too.
7. **Escaping**: a message `<b>hi</b>` arrives as the literal characters.
8. **Screening**: a message containing a term on the deny list gets the poll rejected, the reason naming the
   invitation message.
9. **Pending**: on a poll with a vote, change the message and save: the card says "changes pending review"; until the
   sweep approves it, a new invitation carries the old message; after, the new one.
10. **Privacy**: as a voter, load the poll in every tab and maximized; no response contains the message (DevTools →
    Network, search for a word of it).
11. **No message**: an invitation for a poll without a message is identical to before the feature.
