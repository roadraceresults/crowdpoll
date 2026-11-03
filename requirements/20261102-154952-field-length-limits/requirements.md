Start a new spec for these requirements called `20261102-154952-FIELD-LENGTH-LIMITS`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

This feature simply changes the size limits for subtitles, titles, and choice labels in the application.  

SUBTITLE
The maximum subtitle length is currently 30 characters. It isn't an ENV_* setting.  
It's a hard-coded constant in two places:
Server: service.ts:32 sets SUBTITLE_MAX = 30. Saves are checked against it at service.ts:503, and the populate script imports it from here.
Browser: adminCard.js:520 has its own copy of SUBTITLE_MAX = 30, which the admin card's subtitle field uses.
**Increase that to 40 characters.**


TITLE
The maximum title length is 50 characters.  
Like the subtitle limit, it's a hard-coded constant rather than an ENV_* setting, and it appears in the same two places:
Server: service.ts:31 sets TITLE_MAX = 50.
Browser: adminCard.js:519 has its own copy, TITLE_MAX = 50, which the admin card uses.
**Increase that to 60 characters.**

CHOICE LABEL
The maximum choice label length is 100 characters. It's also a hard-coded constant, not an ENV_* setting:
Server: service.ts:33 sets CHOICE_LABEL_MAX = 100.
Browser: adminCard.js:10 has its own copy, CHOICE_LABEL_MAX = 100, which the admin card uses.

There is also a 40-character limit applied in two places:
- A new poll's Choices box in the admin wizard	40	runtime.wizardChoiceMax (adminCard.js:1409)
- A voter's added choice (the Add Choice dialog on the poll card)	40	the dialog and the server's validateAddedChoice (service.ts:975)

An existing poll's Choices box in the wizard	100	CHOICE_LABEL_MAX (adminCard.js:1409), so labels already saved at up to 100 aren't cut.
Server check on every poll save	100	CHOICE_LABEL_MAX (service.ts:33)
The 40 is WIZARD_CHOICE_MAX at service.ts:35. It isn't an ENV_* setting either. The server sends it to the browser as wizardChoiceMax in /api/config (api.ts:165).

So in practice a new poll's choices are limited to 40 characters. A poll save sent straight to the API is only checked against 100, though, because the server doesn't apply the 40 to poll saves. It applies it only to choices voters add.

This one requires a bit more work to clean it up.  
The 40-character limit is applied in multiple places and is not as straightforward to change as the subtitle and title limits.

**Change CHOICE_LABEL_MAX to 35 characters.**  
**Eliminate WIZARD_CHOICE_MAX and use CHOICE_LABEL_MAX instead.**  

Labels already saved at up to 100 characters won't be cut, but new labels will be limited to 35 characters.

## Decisions (from requirements-report.md)

- **Stored choice labels (IN1)**: the 35-character limit applies only to newly entered labels.  
  A label whose text matches a label already stored on the poll is exempt, whatever its length, in the browser and on the server.  
  The existing poll's Choices box caps each stored line at its own length and every other line at 35;  
  `replaceChoices` and `mergeChoices` check only the labels that do not match a stored label against `CHOICE_LABEL_MAX`.  
  No stored label is ever cut, so no choice loses its id or its votes.  
- **`/api/config` (AM1)**: `wizardChoiceMax` is renamed `choiceLabelMax` and sent from `CHOICE_LABEL_MAX` (35).  
  The browser (`adminCard.js`, `tabs.js`, `pollCard.js`, `addChoiceDialog.js`) reads `choiceLabelMax`, falling back to 35 in place of every literal 40.  
- **Browser copies (UA1)**: the copies in `adminCard.js` become `TITLE_MAX = 60`, `SUBTITLE_MAX = 40` and `CHOICE_LABEL_MAX = 35`;  
  a test reads `src/polls/service.ts` and `src/public/adminCard.js` and fails when the values differ.  
- **Display (UA2)**: today's wrapping and styling are kept;  
  every view showing a title or subtitle (poll card, maximized card, admin card, search results, line-graph subtitle) is checked at 360 px width with a 60-character title and a 40-character subtitle, and only what overflows is fixed.  
- **Documents and tests (UA3)**: `README.md`, `postman/openapi.json` (`maxLength` 60, 40 and 35, and the `choiceLabelMax` field), `CLAUDE.md` and the tests that pin 30, 50 and 40 are updated to the new numbers;  
  the error messages follow, being built from the constants;  
  `src/db/migrations/007-title-lengths.ts` keeps its own 50 and 30.  
- **Populate script (UA4)**: `devScripts/populate/populate-poll.ts` follows `CHOICE_LABEL_MAX` (35), `TITLE_MAX` (60) and `SUBTITLE_MAX` (40) through its imports, since it creates new polls.  
