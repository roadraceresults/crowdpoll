# UI Contracts: Link Preview Message

## C1. The Custom Email Message support text

In the poll wizard's Step 1, under the **Only people you invite** radio button, the **Custom Email Message** field's
support text reads:

> Optional. Added to the invitation email we send to the people you invite, and shown in the link preview when the poll's link is shared.

Nothing else of the field — label, editor, counter, limit, edit button — changes. The Settings Summary line is
unchanged.

## C2. The login page as seen by a person

A visitor without a session who follows a published poll's link sees the login page exactly as today. The only
visible difference is the browser tab, which reads `<poll title> · CrowdPoll` instead of `Login` (spec AM1). No text,
control or layout on the page changes.

## C3. The preview card (what a messaging app shows)

For a published private poll's shared link, the card built by Google Messages, WhatsApp or iMessage shows:

- headline: the poll's title;
- description: the subtitle, then the Custom Email Message's words (when the poll has them), as each app lays it out
  and truncates it;
- the host, `crowdpoll.vote`;
- no image.

The site controls the metadata only; each app's layout, truncation and caching are its own.
