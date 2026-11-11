# Quickstart: Shared Link Message

## Automated

```
npx tsc --noEmit
npx vitest run tests/seo.test.ts tests/pages.test.ts tests/config.test.ts tests/field-limits.test.ts
npx vitest run tests/polls-pending-update.test.ts tests/polls-screening.test.ts tests/polls-admin-crud.test.ts tests/polls-discovery.test.ts
npx vitest run tests/client-admin-wizard.test.ts
npm test
```

## Once, before the tags can be tested: the image

```
npx tsx devScripts/favicon-ico.ts
```

writes `src/public/og-image.png` (1200 × 630) beside `favicon.ico` and `email-logo.png`; commit it. (`FAVICON_BROWSER`
points at a Chromium-based browser when Edge is not at its default path.)

## Manual (development server, `ENV_PUBLIC_ORIGIN` set)

1. **The editor** (C1): create a poll, choose *Anyone you send the link to*; under the Copy Link block the
   **Link Preview Message** field shows with its support text and `0 / 100`. Enter a two-line message with a bold word;
   the counter counts the marks. Choose *Only people you invite*: the field is gone and the Custom Email Message field
   shows; choose *Anyone you send the link to* again: the message is back.
2. **The limit**: type 101 characters; the counter shows the excess and the save is refused with
   "Link preview message must be at most 100 characters."
3. **A fetcher's view** (P1): publish and open the poll; in a terminal:
   `curl -sL "http://localhost:3000/?PID=<pid>" | grep -E "<title>|og:|name=\"description\""`.
   `og:description` is the subtitle, ` - `, then the message's words on one line (the line break became a space,
   no `**`); `og:image` is `…/og-image.png` with width 1200 and height 630.
4. **The mode rule** (P1): on an *Only people you invite* poll with a Custom Email Message, step 3 shows that message;
   switch it to *Anyone you send the link to* without a Link Preview Message: the description is the subtitle alone.
5. **The default sentence**: clear the subtitle and the message; the description is
   "You have been invited to vote in this poll." Restart with `ENV_DEFAULT_LINK_PREVIEW_MESSAGE="Have your say."`:
   the description is "Have your say."; restart with it set to a blank: the server refuses to start naming the
   setting.
6. **Pending**: after a vote, change the Link Preview Message; until the sweep approves it, step 3 shows the old
   message; after, the new one.
7. **The summary** (C2): with a message, the Settings Summary says "A Link Preview Message has been entered." after
   the Who line; tapping it opens Step 1 with the field focused; without a message, or under *Only people you
   invite*, the line is absent.
8. **Public poll** (P3): `curl -s http://localhost:3000/poll/<public pid>` carries the same four `og:image*` tags and
   its description is still the subtitle or `Vote and see live results: <title>`.
9. **robots.txt** (P4): `curl -s http://localhost:3000/robots.txt` shows the second group for
   `facebookexternalhit` and `meta-externalfetcher` with `Allow: /login` and without `Disallow: /login`.
10. **The image** (P5): `curl -sI http://localhost:3000/og-image.png` is `200` `image/png`.
11. **Real apps** (C3, on a deployed build, a day after deployment for Meta's apps): paste the link into Google
    Messages, WhatsApp, Facebook Messenger, Instagram and Slack; every card shows the title, the one-line description
    and the brand image, sharp. Meta's Sharing Debugger (https://developers.facebook.com/tools/debug) reports the
    title, description and image for the link. (A link shared before the deploy may keep its cached card; share it
    anew.)
12. **Log**: the server printed `[login] Poll preview rendered: <pid>` for step 3, and at start-up listed
    `ENV_DEFAULT_LINK_PREVIEW_MESSAGE` among the defaults in use.
