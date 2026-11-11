# UI Contracts: Shared Link Message

## C1. The Link Preview Message field (wizard Step 1, "Who")

Shown only while **Anyone you send the link to** is selected, under that option, after the Copy Link block:

- label **Link Preview Message**;
- support text: *Optional. Shown under the poll's title when its link is shared in a messaging app.*
- the Notes-style editor (`m3RichTextField`): a preview of the text with an "… edit" button (aria label "Edit link
  preview message"), the rich editor on tap, counter `n / 100`, bold, italic, underline and line breaks;
- id `pollLinkPreviewMessage-<pid>`;
- editable after votes like the Custom Email Message (a change then waits for review).

Under **Only people you invite** the Custom Email Message field is shown instead, as today; under **Everyone on
CrowdPoll** neither. Switching between the two private options hides one message and shows the other; both are kept
and saved.

## C2. The Settings Summary line

After the Who line, only when the poll is "Anyone you send the link to" and the Link Preview Message has visible
text:

> A Link Preview Message has been entered.

The whole sentence is a summary link (aria label "Link Preview Message: change in Step 1") that opens Step 1 with the
field focused; class `wizard-summary-link-preview-message`. The existing Custom Email Message line keeps its rule
(shown for "Only people you invite" polls with a message); the two never show together.

## C3. The preview card (what a messaging app shows)

For a published poll's shared link:

- headline: the poll's title;
- description, on one line: the subtitle, then ` - `, then the message of the poll's sharing mode (the Link Preview
  Message or the Custom Email Message), as each app truncates it; or the site's default sentence when the poll has
  neither;
- the brand image (the CrowdPoll figures on white), where the app shows one; sharp, never a scaled browser icon;
- the host, `crowdpoll.vote`.

Facebook Messenger and Instagram build the same card once Meta's crawler has read the new `robots.txt` (up to a day).
The site controls the metadata only; each app's layout, truncation and caching are its own.
