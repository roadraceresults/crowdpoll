# Quickstart: Link Preview Message

## Automated

```
npx tsc --noEmit
npx vitest run tests/seo.test.ts tests/pages.test.ts tests/shared-link.test.ts tests/shared-link-unpublished.test.ts
npx vitest run tests/client-admin-wizard.test.ts tests/client-login-pid.test.ts tests/m3-assets.test.ts
npm test
```

## Manual (development server, `ENV_PUBLIC_ORIGIN` set)

1. **A fetcher's view** (P1): create a private *Only people you invite* poll with a subtitle and a two-line Custom
   Email Message with a bold word; publish and let it be approved. In a terminal:
   `curl -sL "http://localhost:3000/?PID=<pid>" | grep -E "<title>|og:|name=\"description\""`.
   The title is `<poll title> · CrowdPoll`; `og:description` is the subtitle, a blank line, then the message's words
   without `**`; `og:url` is `…/?PID=<pid>`.
2. **Long text**: make subtitle plus message exceed 300 characters; the description is 300 characters ending in `…`.
3. **Escaping**: set the message to `<b>hi</b> & "there"`; the attribute holds `&lt;b&gt;hi&lt;/b&gt; &amp; &quot;there&quot;`.
4. **Pending**: on the same poll after a vote, change the message; until the sweep approves it, step 1 shows the old
   message; after, the new one.
5. **Not published**: repeat step 1 for a draft poll and for a random UUID: `<title>Login</title>`.
6. **Public poll**: `curl -sL` on a public open poll's link lands on `/poll/<pid>` as before; `curl -s
   "http://localhost:3000/login?PID=<public pid>"` directly carries the poll's tags (Q2).
7. **Nothing changes for people**: open the private poll's link in a browser without a session — the login page, as
   today, tab titled `<poll title> · CrowdPoll`; sign in and reach the poll. Signed in, the link goes straight to the
   poll.
8. **The support text** (C1): in the wizard's Step 1 with *Only people you invite* selected, the Custom Email Message
   field's support text ends with "and shown in the link preview when the poll's link is shared."
9. **A real app** (C3, on a deployed build): paste the poll's link into Google Messages, WhatsApp or iMessage; the card
   shows the title and the subtitle/message text over `crowdpoll.vote`. (A link shared before the deploy may keep its
   cached "Login" card in that app; share it anew.)
10. **Log**: the server printed `[login] Poll preview rendered: <pid>` for step 1 and nothing of the kind for step 5.
