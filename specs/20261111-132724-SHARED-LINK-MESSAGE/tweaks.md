# Overview: `specs/20261111-132724-SHARED-LINK-MESSAGE`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261111-132724-SHARED-LINK-MESSAGE` |
| Tweak file created | 2026-11-11 20:03 |
| Last updated | 2026-11-12 04:21 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Copy Link Preview Shows the Custom Email Message  
[-] Resolved (accepted as-is)  
[ ] Run Tests  

It seems that link from "Copy Link" has the "Custom Email Message" applied instead of the "Link Preview Message".  
We confirmed that it aactually is using the "Custom Email Message".  
![data base fields](image.png)  

We changed the email message value and that is what is being previewed.  

Here is an example:  
![previewed message](image-1.png)

### CLARIFICATIONS

The server picks the message by the poll's stored sharing mode (`previewMessageOf` in `src/seo/loginPage.ts`):  
the Custom Email Message for an *Only people you invite* poll, else the Link Preview Message.  
Production (`curl -sL https://crowdpoll.vote/?PID=a72b5ac9-…`) answers `this is the subtitle - - email` right now, the `invitation_message` column, so for this poll the stored mode must be `Invitation Only`, or something else is wrong.  
Please answer in this file or in chat:  

1. In the same database row (`polls` where `id = 'a72b5ac9-3707-47d2-9939-942856ab1567'`), what do `poll_visibility` and `poll_sharing_mode` hold?  
   And which option does Step 1 of the wizard show selected for this poll: *Anyone you send the link to* or *Only people you invite*?  
2. Was the poll created as *Only people you invite* and switched to *Anyone you send the link to* (or the reverse) at some point, and had it received votes by then?  
3. The description carries a double dash, `this is the subtitle - - email`.  
   Is the subtitle literally `this is the subtitle -`, or does the Custom Email Message start with `- `?  
   (The card in your screenshot, "These are the email message notes…", is older text than the `email` the column holds now; Google Messages keeps the card it fetched first for a link, so a changed message shows only on a link shared afresh.)  

Asked 2026-11-11 20:24

Answer (2026-11-11 20:32, in chat): the link was copied and shared before the switch to *Anyone you send the link to* had been saved;  
the poll's saved mode was still *Only people you invite* when the app fetched the card.  

### ACCEPTED RECOMMENDATION

Resolution: accepted as-is by the developer (2026-11-11 20:32)  
No defect in the implementation:  
the server reads the saved sharing mode (`previewMessageOf` in `src/seo/loginPage.ts`), and at the time of the share that mode was still *Only people you invite*, so the Custom Email Message was the right message under the spec's mode rule (research R2, contract P1).  
Once the switch to *Anyone you send the link to* is saved, the same link previews with the Link Preview Message, as production's login page now serves it.  
A messaging app keeps the card it fetched first for a link, so a conversation that already holds the old card may keep showing it;  
the new card appears where the link is pasted afresh.  
No code, test or artifact change.  

## TWEAK02 Speech Bubble on the Link Preview Logo  
[X] Resolved  
[ ] Run Tests  

The larger logo provided to the link preview looks great now.  
We realized that the fav-icon was created from the brand logo back in spec `specs\20261016-172002-FAVICON\research.md`:
```
## R4. Drawing the mark: `favicon.svg`

- **Decision**: Copy the figure geometry from `.brand-logo` in `SITE_HEADER_MARKUP` (`src/public/app.js`) — the mask `brand-logo-front`, the red group, the green circle and body — and drop both speech-bubble paths (fill and stroke). Use a cropped square `viewBox="10 4.5 96 96"`.
- **Rationale** (geometry from the logo):
  - The figures span x 16–100 and y 15–90 (84 × 75 units, the mockup's 23 × 20 ratio).
  - At 16 px one pixel is 6 units; filling the width with 1 px each side gives 84 + 12 = 96 units, so x 10–106; centring 75 units vertically in 96 gives y 4.5–100.5.
  - No background rectangle, so it is transparent (U1).
  - Give the mask a file-local id (`favicon-front`); the file is standalone.
- **Markup rules**: `<title>CrowdPoll</title>` as the first child (A2); no `role`/`aria-*` (a favicon is not in the accessibility tree); no comments (Constitution VI).
```

The fav-icon dropped the speech-bubble paths from the brand logo, keeping only the core figure geometry (mask, red group, green circle and body) for a simplified and recognizable mark at small sizes.  

For the large link preview logo, please add a speech bubble back to the core figure geometry, while keeping the high quality at larger sizes.  
Create the SVG using the same technique you used for the current large link preview logo, ensuring that the speech bubble integrates seamlessly with the core figure geometry and maintains visual clarity at larger sizes.

### RECOMMENDATION

Add a second standalone master beside the favicon, `src/public/og-logo.svg`, and render the preview image from it:  

- `src/public/og-logo.svg`: the whole `.brand-logo` drawing of `SITE_HEADER_MARKUP` (`src/public/app.js`), copied verbatim — the speech-bubble fill (`#FAFAFA`), the red group under its mask, the green circle and body, and the bubble's black outline (stroke 4.5, round joins) — on the logo's own `viewBox="0 0 120 120"`, so the bubble's tail and outline are inside the frame;  
  the favicon's file rules apply (favicon research R4): `<title>CrowdPoll</title>` first, a file-local mask id `og-logo-front`, no `role`/`aria-*`, no comments, no background rectangle.  
- `devScripts/favicon-ico.ts`: `renderOgImage` draws `OG_LOGO_PATH` (`src/public/og-logo.svg`) instead of `SVG_PATH`, still 480 px tall and centred on white at 1200 × 630;  
  the header comment names the new master.  
  Rerun it; the icon and email logo are unchanged, `og-image.png` is replaced.  
- `src/seo/pollPage.ts`: the `OG_IMAGE` comment names `og-logo.svg`.  
- Tests (written, not run — Run Tests is empty): in `tests/pages.test.ts`, beside the `og-image.png` test, one test that `og-logo.svg` exists, starts with `<title>CrowdPoll</title>`, holds the bubble path (`M96 6 H24`), its outline stroke, the `og-logo-front` mask, both figure colours, and carries no `role`, `aria-` or comment;  
  the existing `og-image.png` test (1200 × 630, under 300 KB, served as PNG) still covers the rendered file.  
- Artifacts: `spec.md` (clarification Q1, FR-011), `research.md` R6, `tasks.md` T038, `quickstart.md`, `README.md`, `ARCHITECTURE.md`, `CLAUDE.md` and `CLAUDE_COMPLETE.md` say "rendered from `favicon.svg`";  
  each now names `og-logo.svg` (the brand logo with its speech bubble).  

Recommended 2026-11-12 04:20

### ACCEPTED RECOMMENDATION

Applied as recommended:  

- `src/public/og-logo.svg` (new): the header's brand logo copied verbatim — bubble fill `#FAFAFA`, masked red figure, green figure, black outline (stroke 4.5, round joins) — on `viewBox="0 0 120 120"`, with `<title>CrowdPoll</title>` first, the file-local mask id `og-logo-front`, no `role`/`aria-*`, no comments.  
- `devScripts/favicon-ico.ts`: `OG_LOGO_PATH`;  
  `renderOgImage` draws it instead of `favicon.svg`;  
  header comment updated.  
  Rerun: `favicon.ico` and `email-logo.png` unchanged byte for byte;  
  `src/public/og-image.png` re-rendered (1200 × 630, 20,035 bytes), the bubble and figures sharp and centred.  
- `src/seo/pollPage.ts`: the `OG_IMAGE` comment names `og-logo.svg`.  
- Tests: `tests/pages.test.ts` gains "og-logo.svg is the brand logo with its speech bubble, under the favicon's file rules";  
  the existing `og-image.png` test still covers the rendered file.  
  Tests postponed (Run Tests not ticked);  
  the new test was written but not run, so this tweak is unverified by a run.  
  `npx tsc --noEmit` passes.  
- Artifacts: `spec.md` (Q1), `research.md` (R6), `plan.md`, `tasks.md` (T038), `quickstart.md`, `README.md`, `ARCHITECTURE.md`, `CLAUDE.md`, `CLAUDE_COMPLETE.md` now say the image is rendered from `og-logo.svg`.  

Applied 2026-11-12 04:21  

## TWEAK03 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  
