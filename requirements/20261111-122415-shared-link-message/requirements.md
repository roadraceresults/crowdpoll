Start a new spec for these requirements called `20261111-122415-SHARED-LINK-MESSAGE`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

The requirements of this feature continues to make changes to the support of creating a preview for Messaging Apps.  

Currently, the notes that appear in the link preview come from the Custom Email Message field that is entered when the Poll Creator selects "Only people you invite" on the "Who" tab.  
However, the notes are used for the "Anyone you send the link to" when the notes are hidden.  

Please add an editor under the "Anyone you send the link to" section, similar to the one under the "Only people you invite".  
This field will be limnited to 100 characters since most previews truncate it, and this context only requires a summary message describing the poll.  

Store this in a new polls table field, since we want to be able to switch between "Anyone you send the link to" and "Only people you invite",  
and the messages need to be retained for each.  

When the Poll doesn't have a Custom Message or subtitle, the link preview will fall back to CrowdPoll's default message: "Vote and see live results: <title>"  
as specified in `src/seo/loginPage.ts`.  
Make this an environment variable called ENV_DEFAULT_LINK_PREVIEW_MESSAGE when the preview with the default of "You have been invited to vote in this poll."

The other place this is used as a preview to Search Engines for public polls. The default message is suitable for those, since there is no way to enter a custom message for public polls. 






## Decisions (from requirements-report.md, 2026-11-11 12:44 PM)

- **Scope of the setting (AM1)**: `ENV_DEFAULT_LINK_PREVIEW_MESSAGE` applies to the login page preview (`src/seo/loginPage.ts`) only;
  the public poll page `/poll/<pid>` keeps `Vote and see live results: <title>` for search engines.
- **Which message the preview uses (AM2)**: the message of the poll's current sharing mode, never the hidden one: the Link Preview Message for "Anyone you send the link to", the Custom Email Message for "Only people you invite", no message for a public poll;
  both columns are kept, so switching modes switches the message and switching back restores the other.
- **The setting's value (AM3)**: plain text, used as given, no placeholder;
  the card shows the title as its headline already.
- **The editor (UA1)**: the same `m3RichTextField` as the Custom Email Message, label "Link Preview Message", support text "Optional. Shown under the poll's title when its link is shared in a messaging app.", counter "n / 100", id prefix `pollLinkPreviewMessage-`;
  placed under the "Anyone you send the link to" option after its Copy Link block;
  the 100 characters count the stored text, formatting marks included, as the 1000 of the Custom Email Message do.
- **Storage, API and limits (UA2)**: column `link_preview_message text not null default ''` (migration `021-link-preview-message`);
  field `linkPreviewMessage`, `LINK_PREVIEW_MESSAGE_MAX = 100` in `notes.ts` and `LIMITS`;
  `validateFieldLength` ("Link preview message") and `normalizeNotes` on PATCH and publish;
  in `NON_CONTENT_FIELDS`, so a change does not bump `content_version`;
  copied by Duplicate;
  returned as `linkPreviewMessage` and `linkPreviewMessageHtml` on the admin poll detail only, and `hasLinkPreviewMessage` on the admin list;
  never in card, tab, delta or SEO payloads;
  `postman/openapi.json` documents it;
  the wizard's dirty check, base snapshot, save body, summary snapshot and change detection include it.
- **Screening and pending update (UA3)**: screened with the title, subtitle, notes and Custom Email Message, in `screening.ts` and both sweeps;
  on an ever-voted published poll a change waits in `pending_update` until approved, and the preview reads the approved column only;
  the screening message names "link preview message" when that field held the offending term.
- **Settings Summary (UA4)**: a line "A Link Preview Message has been entered" under the Who line, only for "Anyone you send the link to" polls with a non-blank message, a link that opens Step 1 with the field focused;
  `hasLinkPreviewMessage` on the admin list serves it.
- **The setting (UA5)**: read with `read.text`, default "You have been invited to vote in this poll.";
  the value is trimmed, and a blank value or one over 300 characters is a `ConfigError`;
  documented in `.claude/rules/environment.md`, the README settings table and `CLAUDE_COMPLETE.md`;
  no entry in the development templates or `infra/app.tf`.
- **Existing polls (NC1)**: the migration adds the column only;
  `invitation_message` is not copied, so the new field starts empty for every poll.

## Additional Requirements (2026-11-11 1:11 PM)

We did some testing in other messaging apps besides Google Messages.  
Facebook Messenger doesn't include any preview besides the crowdpoll.vote domain name:  
![Preview in Facebook Messenger](requirements\20261110-202128-link-preview-message\preview-in-facebook-messenger.jpg)
Slack message preview:  
![Preview in Slack](requirements\20261110-202128-link-preview-message\preview-in-slack.jpg)  
Slack includes the fav icon which is nice, as well as the title, subtitle and custom notes.  
WhatsApp message preview:  
![Preview in WhatsApp](requirements\20261110-202128-link-preview-message\preview-in-whatsapp.jpg)  
WhatsApp does not include the custom notes in the link preview.  
An image of the fav icon is shown but scaled up so it looks terrible.  
I don't know if this can be fixed.  
Instagram message preview:  
![Preview in Instagram](requirements\20261110-202128-link-preview-message\preview-instagram.jpg)  
Just like Facebook Messenger, Instagram doesn't include any preview besides the crowdpoll.vote domain name. 
Of course, because it is all Meta.

## Research Decisions (from requirements-report.md, 2026-11-11 1:26 PM)

- **Meta's preview crawler and robots.txt (RS1)**: Facebook Messenger and Instagram previews are built by Meta's server-side crawler, which obeys robots.txt, and the site's `Disallow: /login` under `User-agent: *` keeps it off the page every private poll's link leads to.
  robots.txt (`ROBOTS` in `src/routes/seo.ts`) gains a group for `facebookexternalhit` and `meta-externalfetcher` that allows `/login` and repeats the other disallows;
  `meta-externalagent` is not let in;
  the login page keeps `<meta name="robots" content="noindex">`;
  after deployment the result is checked with Meta's Sharing Debugger (robots.txt is cached by Meta for up to 24 hours);
  `tests/seo.test.ts` pins the new group.
- **One-line description (RS2)**: WhatsApp renders only the first line of `og:description`, so the preview description is one line:
  every line break in the message's plain text becomes a space, runs of whitespace collapse to one, the subtitle and the message are joined by ` - `, and the 300-character cut stays;
  the public poll page's description (the subtitle) is unchanged.
- **Preview image (RS3)**: a committed brand image `src/public/og-image.png`, 1200 × 630 pixels, under 300 KB, the brand figures on a plain background;
  the login page preview and the public poll page carry `og:image` (absolute URL, `<origin>/og-image.png`), `og:image:width`, `og:image:height` and `og:image:type`, added once in `previewHeadTags`;
  this reverses decision UA4 of `20261110-202128-link-preview-message` (no image);
  WhatsApp and Google Messages will show a large-image card with the title and description under the image.
