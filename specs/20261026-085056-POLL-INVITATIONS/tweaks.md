# Overview: `specs/20261026-085056-POLL-INVITATIONS`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261026-085056-POLL-INVITATIONS` |
| Tweak file created | 2026-10-26 19:07 |
| Last updated | 2026-10-27 10:41 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Over-Limit Invitations Are Lost  
[X] Resolved  
[ ] Run Tests  

We set ENV_MAX_INVITATIONS_PER_DAY to 3.  
Then invited:  
user1@crowdpoll.vote,user2@crowdpoll.vote,user3@crowdpoll.vote,user4@crowdpoll.vote,user5@crowdpoll.vote,user6@crowdpoll.vote  

The first 3 emails were sent successfully.
And the remaining emails were not sent:
user4@crowdpoll.vote — Your daily invitation limit is reached until 7:01 PM.
user5@crowdpoll.vote — Your daily invitation limit is reached until 7:01 PM.
user6@crowdpoll.vote — Your daily invitation limit is reached until 7:01 PM.

The poll_invitations table has these records only:
"5ed545cf-ad48-4bcf-a90c-bebf0e3423e0"	"roadraceresults@gmail.com"	0	"2026-10-26 18:27:05.961188-04"	"2026-10-26 18:27:05.961188-04"			
"4d5c4636-6903-4ab6-af74-976a5ab86c04"	"user1@crowdpoll.vote"	0	"2026-10-26 19:01:11.985-04"	"2026-10-26 19:01:12.003-04"			
"4d5c4636-6903-4ab6-af74-976a5ab86c04"	"user2@crowdpoll.vote"	1	"2026-10-26 19:01:11.985-04"	"2026-10-26 19:01:12.003-04"			
"4d5c4636-6903-4ab6-af74-976a5ab86c04"	"user3@crowdpoll.vote"	2	"2026-10-26 19:01:11.985-04"	"2026-10-26 19:01:12.003-04"			

So, when the ENV_MAX_INVITATIONS_PER_DAY is set to 200, and the dev server is started again,
the 3 unsent invitations are lost.





### RECOMMENDATION

The behaviour seen is the one specified: FR-025 says "On an open poll an add past the limit MUST be refused with the time the limit frees up", so `addInvitees` (`src/invitations/invitations.ts:202`) never stores the refused addresses.  
They are left only in the Invite field, and the field is gone once the page is reloaded.  
The invitations sweep cannot send what was never stored.  
The message also reads "until 7:01 PM" with no date, although the limit frees up at 7:01 PM the next day.  

- **Option A** _(recommended)_: Queue them instead of refusing them.  
  On an open poll, an address past the daily allowance is `added`, its row waits as `Not sent yet`, and `invitationSweep` sends it, oldest first, as the rolling 24 hours free up.  
  This is the same path a poll that is not open yet already takes.  
  - Code: drop the `daily-limit` branch and `emailsLeft` from `addInvitees`, and the `daily-limit` add outcome from `AddOutcome`;  
    the Resend `429 daily-limit` stays.  
    In `adminCard.js`, the summary adds `n will be sent as your daily limit frees up.` when the response's rows include `Not sent yet` on an open poll.  
  - Tests (written, not run): in `tests/invitations-api.test.ts`, replace the `daily-limit` add case (lines 159–164) with: limit 3, six addresses, all `added`, three emailed, three `Not sent yet`; after `invitation_emails` rows age past 24 hours, a sweep tick sends the rest.  
    In `tests/client-admin-invitees.test.ts`, replace the add-refusal `daily-limit` line with the new summary text.  
  - Artifacts: `spec.md` (FR-009 and FR-025 lose the add refusal; the edge case at line 134 becomes "queued"; acceptance scenario 3), `contracts/api.md` (A2 outcomes), `contracts/ui-contracts.md` (C3), `tasks.md` (a new task), `quickstart.md` (step 9), `postman/openapi.json` (the add outcome enum).  
  - <u>Pros</u>: nothing the creator typed is lost;  
    an open poll behaves the same as one not open yet;  
    the sweep already does the sending.  
  - <u>Cons</u>: this changes a requirement (FR-025);  
    the creator learns of the delay from the summary and the `Not sent yet` chips, not from a refusal.  

- **Option B**: Keep the refusal as specified, and give the message its date.  
  Write `Your daily invitation limit is reached until tomorrow at 7:01 PM.` (or the date when it is further away).  
  The addresses still stay in the field for the creator to retry.  
  - Tests (written, not run): a client test in `tests/client-admin-invitees.test.ts` where `retryAt` falls on the next day.  
  - Artifacts: `contracts/ui-contracts.md` (C3).  
  - <u>Pros</u>: a small client-only change;  
    the spec is unchanged.  
  - <u>Cons</u>: refused addresses are still lost on reload, which is what this tweak reports.  

- **Option C**: Accept as-is.  

The `[tests postponed]` default applies: whichever option is chosen, its tests are written but not run.  
Option A's queue makes Option B's date wording matter only for Resend; Option A could also take B's date fix for that one message.  

2026-10-26 19:26  

### ACCEPTED RECOMMENDATION

Option A, accepted by the developer ("a").  
On an open poll, an address past the creator's daily allowance is now added instead of refused.  
It waits as `Not sent yet`, and `invitationSweep` sends it, oldest first, as the rolling 24 hours free up.  
Only a resend is still refused `429 daily-limit`.  

- `src/invitations/invitations.ts`: `addInvitees` drops the `daily-limit` branch.  
  An address past the allowance is `{ outcome: "added", waiting: true }`;  
  `AddOutcome` loses `daily-limit` and `AddResult.retryAt` becomes `waiting`.  
- `src/public/adminCard.js`: the add summary adds `n will be sent as your daily limit frees up.`;  
  the refusal lines no longer special-case `daily-limit` (`dailyLimitText` stays for Resend).  
- Tests (written, not run):  
  - `tests/invitations-api.test.ts`: the daily-limit case now adds four addresses at a limit of 2, checks `waiting` on the last two, two emails sent and two `Not sent yet`.  
  - `tests/client-admin-invitees.test.ts`: "adds past the daily limit and says they will be sent as it frees up" replaces the `retryAt` refusal-line test.  
  - The existing `tests/invitations-send.test.ts` case already covers the sweep sending the rest once the window frees.  
- Tests postponed (Run Tests not ticked); the tweak is therefore unverified by a run.  
  `npx tsc --noEmit` passes.  
- Artifacts:  
  - `spec.md`: acceptance scenario 3, the edge case, FR-009 and FR-025 (this changes a requirement: the requirements document may need the same change).  
  - `contracts/api.md` (A2), `contracts/ui-contracts.md` (C3), `research.md` (the outcomes list and R7), `quickstart.md` (step 9 and the test list), `tasks.md` (T053 added).  
  - `postman/openapi.json` (the add outcome enum, `waiting` replaces `retryAt`), `ARCHITECTURE.md`.  
- The three addresses already refused in your dev run were never stored, so invite them again.  

2026-10-26 19:37  

## TWEAK02 Waiting Summary Goes Stale  
[X] Resolved  
[ ] Run Tests  

When the unsent emails are finally sent, and the dialog is still open, 
the dialog still says,
"3 will be sent as your daily limit frees up."



### RECOMMENDATION

The add summary is written once, in `addInvitees` (`src/public/adminCard.js`), and nothing rewrites it when the list refresh brings the sent rows.  

- Code: `src/public/adminCard.js`.  
  - `addInvitees` keeps the counts of its summary and the set of `waiting` addresses on `invitees.addSummary`;  
    `showInviteesSummary` clears it, so a later remove or resend message is never rewritten.  
  - `renderInvitees` (run on every list refresh) drops from that set each address whose row is no longer `Not sent yet`, and rewrites the summary: `Invited 3. 2 will be sent as your daily limit frees up.` while some still wait, and `Invited 3.` once none do.  
- Test (written, not run): in `tests/client-admin-invitees.test.ts`, extend "adds past the daily limit…": set `sent_at` on bob's row, settle one refresh, and the summary reads `Invited 2.`.  
- Artifacts: `contracts/ui-contracts.md` (C3: the waiting count follows the list refresh), `tasks.md` (T054).  

2026-10-26 19:56  

### ACCEPTED RECOMMENDATION

The add summary now follows the list refresh.  

- `src/public/adminCard.js`:  
  - a new `addSummaryText({ invited, waiting, refused })` writes the summary;  
    `addInvitees` keeps its counts and the set of `waiting` addresses on `invitees.addSummary`.  
  - `showInviteesSummary` clears `invitees.addSummary`, so a later remove or resend message is never rewritten.  
  - `renderInvitees` drops each waiting address whose row is no longer `Not sent yet` and rewrites the summary, so `Invited 6. 3 will be sent as your daily limit frees up.` counts down and becomes `Invited 6.`.  
- Test (written, not run): `tests/client-admin-invitees.test.ts`, "adds past the daily limit and says they will be sent as it frees up" now sets `sent_at` on bob's row, settles one refresh and expects `Invited 2.`.  
- Tests postponed (Run Tests not ticked); the tweak is therefore unverified by a run.  
  `node --check src/public/adminCard.js` passes.  
- Artifacts: `contracts/ui-contracts.md` (C3), `tasks.md` (T054 added).  

2026-10-26 19:57  

## TWEAK03 Four Stale Tests Fail  
[X] Resolved  
[ ] Run Tests  
 ERRORS FROM: npm test:

 ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/client-admin-wizard.test.ts > a new poll's wizard > inside the steps > pre-fills the dates, names the time zone, and blocks Publish for an end in the past
AssertionError: expected 608400000 to be 604800000 // Object.is equality

- Expected
+ Received

- 604800000
+ 608400000

 ❯ tests/client-admin-wizard.test.ts:396:67
    394|       await pick(p, "ends", "on");
    395|       const end = wizardCard(p).querySelector<HTMLInputElement>('input[aria-label="End date and time"]')!.value;
    396|       expect(new Date(end).getTime() - new Date(start).getTime()).toBe(7 * 24 * 3600 * 1000);
       |                                                                   ^
    397| 
    398|       await pick(p, "starts", "now");

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯

 FAIL  tests/client-login-pid.test.ts > the login card with a shared poll link > carries the pid on the provider sign-in in oauth mode
TypeError: Cannot set properties of null (setting 'checked')
 ❯ tests/client-login-pid.test.ts:84:11
     82|       await page.settle(100);
     83|       const box = page.document.getElementById("terms") as HTMLInputElement;
     84|       box.checked = true;
       |           ^
     85|       box.dispatchEvent(new page.window.Event("change", { bubbles: true }));
     86|       const sent: string[] = [];

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯

 FAIL  tests/client-tab-bar-scroll.test.ts > the tab bar without arrows > has no scroll arrow in the page, and the script still runs without them
AssertionError: tab-scroll: expected '<!doctype html>\n<html lang="en">\n<h…' not to contain 'tab-scroll'

- Expected
+ Received

- tab-scroll
+ <!doctype html>
+ <html lang="en">
+ <head>
+   <meta charset="utf-8">
+   <meta name="viewport" content="width=device-width, initial-scale=1">
+   <link rel="icon" href="/favicon.svg" type="image/svg+xml">
+   <link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
+   <title>CrowdPoll</title>
+   <link rel="stylesheet" href="/fonts/fonts.css">
+   <!-- Reference-page order (responsive-grid.html): page and tab styles, then the
+        card component sheet. styles.css (the auth pages' sheet) is deliberately NOT
+        loaded here — its element-level rules bleed into the reference components;
+        the few session-UI styles this page needs from it live in site.css instead. -->
+   <link rel="stylesheet" href="/m3-tokens.css">
+   <link rel="stylesheet" href="/tabs.css">
+   <link rel="stylesheet" href="/pollCard.css">
+   <link rel="stylesheet" href="/site.css">
+   <link rel="stylesheet" href="/tooltip-m3.css">
+   <link rel="stylesheet" href="/header-tab-bar-m3.css">
+   <link rel="stylesheet" href="/header-single-column-m3.css">
+   <link rel="stylesheet" href="/header-single-row-m3.css">
+   <link rel="stylesheet" href="/header-fixed-m3.css">
+   <link rel="stylesheet" href="/back-to-top-m3.css">
+   <link rel="stylesheet" href="/tabs-modal-m3.css">
+   <link rel="stylesheet" href="/live-idle-prompt-m3.css">
+   <link rel="stylesheet" href="/empty-tab-line-m3.css">
+   <link rel="stylesheet" href="/pollCard-m3.css">
+   <link rel="stylesheet" href="/single-column-m3.css">
+   <link rel="stylesheet" href="/tab-bar-scroll-arrows-m3.css">
+   <link rel="stylesheet" href="/footer-m3.css">
+ </head>
+ <body class="is-guest">
+
+ <div class="page-decor"></div>
+
+ <div class="page">
+   <div class="container">
+     <div class="layout">
+
+       <header id="site-header" class="site-header"></header>
+
+       <div class="tab-bar-wrap">
+         <button class="tab-scroll-arrow tab-scroll-arrow--left" id="tabScrollLeftArrow" type="button" aria-label="Scroll tabs left" hidden>
+           <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path fill="currentColor" d="M9.41 7.41L8 6l-6 6 6 6 1.41-1.41L4.83 12z M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
+         </button>
+         <div class="tab-bar" id="tabBar" role="tablist" aria-label="Poll tabs">
+           <button class="tab" type="button" data-tab="your-polls" role="tab" id="tab-your-polls" aria-controls="panel-your-polls" aria-selected="false" tabindex="-1">
+             <svg class="tab-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="32" fill="#8093a7"/><circle cx="32" cy="25" r="11" fill="#e8edf2"/><path d="M32 40c-11 0-19 6.5-19 14.5V64h38v-9.5C51 46.5 43 40 32 40z" fill="#e8edf2"/></svg>
+             Your Polls
+           </button>
+           <button class="tab" type="button" data-tab="shared-with-you" role="tab" id="tab-shared-with-you" aria-controls="panel-shared-with-you" aria-selected="false" tabindex="-1">
+             <svg class="tab-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="32" fill="#8093a7"/><circle cx="22" cy="26" r="8" fill="#e8edf2"/><circle cx="42" cy="26" r="8" fill="#e8edf2"/><path d="M22 37c-8 0-14 4.800-14 11v2h28v-2c0-6.200-6-11-14-11zM42 37c-2.500 0-4.800.600-6.700 1.700C38.400 41 40 44.200 40 48v2h16v-2c0-6.200-6-11-14-11z" fill="#e8edf2"/></svg>
+             Shared With&nbsp;You
+           </button>
+           <button class="tab" type="button" data-tab="your-votes" role="tab" id="tab-your-votes" aria-controls="panel-your-votes" aria-selected="false" tabindex="-1">
+             <svg class="tab-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="32" fill="#8093a7"/><path d="M18 33l9 9 19-20" fill="none" stroke="#e8edf2" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>
+             Your Votes
+           </button>
+           <button class="tab is-active" type="button" data-tab="trending" role="tab" id="tab-trending" aria-controls="panel-trending" aria-selected="true" tabindex="0">
+             <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M2 20.4C8.9 20.4 14.2 17.6 18 12.1l2.4 2.1L21.6 5.2 12.8 7l2.4 2.1c-3.3 4.6-7.7 6.9-13.2 6.9z"/></svg>
+             Trending
+           </button>
+           <button class="tab" type="button" data-tab="newest" role="tab" id="tab-newest" aria-controls="panel-newest" aria-selected="false" tabindex="-1">
+             <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="12" fill="#8093a7"/><path fill="#e8edf2" transform="translate(12 12) skewX(-12) translate(-12 -12)" d="M10.4 5h3.2l-.6 9h-2zM10.5 16h3v3h-3z"/></svg>
+             Newest
+           </button>
+           <button class="tab" type="button" data-tab="watching" role="tab" id="tab-watching" aria-controls="panel-watching" aria-selected="false" tabindex="-1">
+             <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#watching-eye"/></svg>
+             Watching
+           </button>
+           <button class="tab" type="button" data-tab="live" role="tab" id="tab-live" aria-controls="panel-live" aria-selected="false" tabindex="-1">
+             <span class="tab-icon tab-icon--live" aria-hidden="true"><span class="live-bars"><i></i><i></i><i></i></span></span>
+             Live Results
+           </button>
+           <button class="tab" type="button" data-tab="search" role="tab" id="tab-search" aria-controls="panel-search" aria-selected="false" tabindex="-1">
+             <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
+             Search
+           </button>
+           <button class="tab-more" id="tabMoreBtn" type="button" aria-label="More" aria-haspopup="true" aria-expanded="false" aria-controls="tabMenu">
+             <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="12" fill="#8093a7"/><circle cx="12" cy="7" r="1.8" fill="#e8edf2"/><circle cx="12" cy="12" r="1.8" fill="#e8edf2"/><circle cx="12" cy="17" r="1.8" fill="#e8edf2"/></svg>
+             More
+           </button>
+         </div>
+         <button class="tab-scroll-arrow tab-scroll-arrow--right" id="tabScrollRightArrow" type="button" aria-label="Scroll tabs right" hidden>
+           <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path fill="currentColor" d="M10 6l-1.41 1.41L12.17 12l-3.58 3.59L10 17.41 16 11z M16 6l-1.41 1.41L18.17 12l-3.58 3.59L16 17.41 22 11z"/></svg>
+         </button>
+         <button class="tab-menu-btn" id="tabMenuBtn" type="button" aria-label="All tabs" aria-haspopup="true" aria-expanded="false" aria-controls="tabMenu">
+           <svg viewBox="0 0 30 24" aria-hidden="true" focusable="false"><circle cx="3" cy="7" r="1.8" fill="currentColor"/><circle cx="3" cy="12" r="1.8" fill="currentColor"/><circle cx="3" cy="17" r="1.8" fill="currentColor"/><path d="M9 6h18v2H9zM9 11h18v2H9zM9 16h18v2H9z" fill="currentColor"/></svg>
+         </button>
+         <div class="tab-menu" id="tabMenu" role="menu" aria-label="All tabs" hidden></div>
+         <!-- FIX013: the search box is the header's "Search CrowdPoll" field. -->
+         <!-- FIX007: an icon (two arrows chasing round a circle); the words stay
+              on the label and tooltip. -->
+         <button class="tab-refresh tab-refresh--icon" id="refreshBtn" type="button" aria-label="Refresh" title="Refresh">
+           <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
+             <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
+             <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
+           </svg>
+         </button>
+       </div>
+
+       <p class="tab-notice" id="tabNotice" hidden></p>
+
+       <main class="all-markets">
+         <section class="tab-panel" data-panel="your-polls" role="tabpanel" id="panel-your-polls" aria-labelledby="tab-your-polls" hidden><div class="card-grid"></div><p class="tab-empty" hidden></p></section>
+         <section class="tab-panel" data-panel="shared-with-you" role="tabpanel" id="panel-shared-with-you" aria-labelledby="tab-shared-with-you" hidden><div class="card-grid"></div><p class="tab-empty" hidden></p></section>
+         <section class="tab-panel" data-panel="your-votes" role="tabpanel" id="panel-your-votes" aria-labelledby="tab-your-votes" hidden><div class="card-grid"></div><p class="tab-empty" hidden></p></section>
+         <section class="tab-panel" data-panel="trending" role="tabpanel" id="panel-trending" aria-labelledby="tab-trending"><div class="card-grid"></div><p class="tab-empty" hidden></p></section>
+         <section class="tab-panel" data-panel="newest" role="tabpanel" id="panel-newest" aria-labelledby="tab-newest" hidden><div class="card-grid"></div><p class="tab-empty" hidden></p></section>
+         <section class="tab-panel" data-panel="watching" role="tabpanel" id="panel-watching" aria-labelledby="tab-watching" hidden><div class="card-grid"></div><p class="tab-empty" hidden></p></section>
+         <section class="tab-panel" data-panel="live" role="tabpanel" id="panel-live" aria-labelledby="tab-live" hidden><div class="card-grid"></div><p class="tab-empty" hidden></p></section>
+         <section class="tab-panel" data-panel="search" role="tabpanel" id="panel-search" aria-labelledby="tab-search" hidden><form class="search-tab-form" id="searchTabForm" role="search" autocomplete="off"><input type="search" id="searchTabBox" name="q" placeholder="Search CrowdPoll" aria-label="Search CrowdPoll" maxlength="200"><button class="header-search-clear" id="searchTabClear" type="button" aria-label="Clear Search Terms" title="Clear Search Terms" hidden><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></form><div class="card-grid"></div><p class="tab-empty" hidden></p></section>
+       </main>
+
+     </div>
+   </div>
+ </div>
+
+ <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
+   <defs>
+     <mask id="watching-catchlight" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
+       <rect width="24" height="24" fill="#fff"/>
+       <circle cx="13.3" cy="10.7" r="1.3" fill="#000"/>
+     </mask>
+   </defs>
+   <symbol id="watching-eye" viewBox="0 0 24 24">
+     <path d="M1.8 12C4.6 7.2 8 4.9 12 4.9s7.4 2.3 10.2 7.1C19.4 16.8 16 19.1 12 19.1S4.6 16.8 1.8 12z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
+     <circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" stroke-width="1.8"/>
+     <circle cx="12" cy="12" r="1.2" fill="currentColor"/>
+   </symbol>
+   <symbol id="watching-eye-on" viewBox="0 0 24 24">
+     <path d="M1.8 12C4.6 7.2 8 4.9 12 4.9s7.4 2.3 10.2 7.1C19.4 16.8 16 19.1 12 19.1S4.6 16.8 1.8 12z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
+     <circle cx="12" cy="12" r="4.3" fill="currentColor" mask="url(#watching-catchlight)"/>
+   </symbol>
+ </svg>
+
+ <template id="maximizedCardGrid">
+   <div class="maximized-card-grid">
+     <div class="col-rule" aria-hidden="true"></div>
+     <div class="maximized-space-right"></div>
+   </div>
+ </template>
+
+ <div class="floating-actions" id="floatingActions" hidden></div>
+ <script src="/m3-ripple.js" defer></script>
+ <script src="/tooltip-m3.js" defer></script>
+ <script src="/app.js" defer></script>
+ <script src="/headerFit.js" defer></script>
+ <script src="/fixedChrome.js" defer></script>
+ <script src="/pollCard.js" defer></script>
+ <script src="/voteClient.js" defer></script>
+ <script src="/deltaClient.js" defer></script>
+ <script src="/tabs.js" defer></script>
+ <script src="/trending.js" defer></script>
+ <script src="/newest.js" defer></script>
+ <script src="/searchTab.js" defer></script>
+ <script src="/liveResults.js" defer></script>
+ <script src="/tabBarScroll.js" defer></script>
+ <script src="/tabBarScrollArrows.js" defer></script>
+ <script src="/floatingActions.js" defer></script>
+ <script src="/backToTopFab.js" defer></script>
+ </body>
+ </html>
+

 ❯ tests/client-tab-bar-scroll.test.ts:26:100
     24|   it("has no scroll arrow in the page, and the script still runs without them", async () => {
     25|     const html = readFileSync(path.resolve("src/public/index.html"), "utf8");
     26|     for (const part of ["tab-scroll", "tabScrollBefore", "tabScrollAfter"]) expect(html, part).not.toContain(part);
       |                                                                                                    ^
     27|     const home = await open();
     28|     byId(home, "tabMenuBtn").click();

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯

 FAIL  tests/m3-assets.test.ts > Material 3 page assets > index.html loads exactly its allowed sheets and scripts, in order
AssertionError: expected [ 'm3-tokens.css', 'tabs.css', …(15) ] to deeply equal [ 'm3-tokens.css', 'tabs.css', …(14) ]

- Expected
+ Received

@@ -12,7 +12,8 @@
    "tabs-modal-m3.css",
    "live-idle-prompt-m3.css",
    "empty-tab-line-m3.css",
    "pollCard-m3.css",
    "single-column-m3.css",
+   "tab-bar-scroll-arrows-m3.css",
    "footer-m3.css",
  ]

 ❯ tests/m3-assets.test.ts:150:33
    148|     it(`${file} loads exactly its allowed sheets and scripts, in order`, () => {
    149|       const html = read(file);
    150|       expect(localSheets(html)).toEqual(expectedSheets(page));
       |                                 ^
    151|       expect(scripts(html)).toEqual(expectedScripts(page));
    152|     });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯


 Test Files  4 failed | 118 passed | 1 skipped (123)
      Tests  4 failed | 1629 passed | 15 skipped (1648)
   Start at  18:30:06
   Duration  599.79s (transform 880ms, setup 0ms, collect 57.31s, tests 524.65s, environment 10ms, prepare 4.36s)

(base) PS C:\code\UI-UX-PRIVATE-POLLS\crowdpoll02> 




















### RECOMMENDATION

None of the four failures comes from the invitations feature, and none is a product bug.  
Each test asserts something an earlier, deliberate change made untrue, so only the tests change.  

- `tests/client-admin-wizard.test.ts:396` (end date across a DST change): the wizard pre-fills the end as the start plus 7 calendar days at the same wall-clock time (`adminCard.js:1591`, `setDate(+7)`).  
  Today (2026-10-26) plus a week crosses the 2026-11-01 change, so the gap is 169 hours, not 168, and the test fails only in the week before a clock change.  
  Fix: compare calendar days and the time of day (7 days apart, both `09:00`), not milliseconds.  
- `tests/client-login-pid.test.ts:84` (oauth mode): Social sign-in TWEAKS06 removed the oauth login card's `#terms` checkbox (agreement is asked after the provider sign-in), so `getElementById("terms")` is `null`.  
  Fix: drop the three lines that tick the box;  
  the test still checks that the provider sign-in carries `/?PID=<pid>`.  
- `tests/client-tab-bar-scroll.test.ts:26` ("has no scroll arrow in the page"): Phone tab bar TWEAKS09 put the scroll arrows back (`tabScrollLeftArrow`/`tabScrollRightArrow`, `tabBarScrollArrows.js`, `tab-bar-scroll-arrows-m3.css`).  
  Fix: rename the test to say the arrows are in the page, hidden until `tabBarScrollArrows.js` shows them, assert the two arrow buttons are present and `hidden`, keep the old ids `tabScrollBefore`/`tabScrollAfter` absent, and keep the check that `tabBarScroll.js` runs (the menu opens) without the arrow script.  
- `tests/m3-assets.test.ts:150` (`index.html` allowlist): the same tweak added `tab-bar-scroll-arrows-m3.css` and `tabBarScrollArrows.js`.  
  Fix: add `tab-bar-scroll-arrows-m3.css` to `LAYER_ORDER` after `single-column-m3.css` and to `index.html`'s layers, and `tabBarScrollArrows.js` after `tabBarScroll.js` in its scripts.  
- Tests postponed (Run Tests not ticked): the four edited tests are not run here.  
- Artifacts: `tasks.md` (T055);  
  the phone tab bar's `tasks.md` and FR-003 already record the arrows coming back (TWEAKS09).  

2026-10-26 20:39  

### ACCEPTED RECOMMENDATION

The four tests now match what the code deliberately does;  
no product code changed.  

- `tests/client-admin-wizard.test.ts`: the pre-filled end is checked as 7 calendar days after the start, at `09:00`, instead of exactly 168 hours, so a week that crosses a clock change passes.  
- `tests/client-login-pid.test.ts`: the oauth case no longer ticks the `#terms` box that Social sign-in TWEAKS06 removed;  
  it still checks that the provider sign-in carries `/?PID=<pid>`.  
- `tests/client-tab-bar-scroll.test.ts`: "the tab bar's arrows" now expects `tabScrollLeftArrow` and `tabScrollRightArrow` in `index.html`, each `hidden`, keeps `tabScrollBefore`/`tabScrollAfter` absent, and still opens the menu with `tabBarScroll.js` alone.  
- `tests/m3-assets.test.ts`: `tab-bar-scroll-arrows-m3.css` joins `LAYER_ORDER` after `single-column-m3.css` and `index.html`'s layers;  
  `tabBarScrollArrows.js` follows `tabBarScroll.js` in its scripts.  
- Tests postponed (Run Tests not ticked); the four edited tests were not run, so the fix is unverified by a run.  
- Artifacts: `tasks.md` (T055 added).  

2026-10-26 20:39  

## TWEAK04 One Summary Message Per Line  
[X] Resolved  
[ ] Run Tests  

For all the summary messages that are displayed under the invitee list, 
make each message rendered on a line of its own for readability.

Change:
"Invited #."
TO:
"Invited Emails: #."

Change:
"# could not be added."
TO:
"Emails that could not be added: #"


    



### RECOMMENDATION

The add summary is one sentence run-on in `.invitees-summary`, written by `addSummaryText` in `src/public/adminCard.js`;  
every other summary (remove, resend, an error) is already a single message.  

- `src/public/adminCard.js`: `addSummaryText` joins its parts with a line break instead of a space, and words them as asked:  
  - `Invited Emails: 2.`  
  - `1 will be sent as your daily limit frees up.` (only while some wait)  
  - `Emails that could not be added: 3` (only when some were refused; no period, as written)  
- `src/public/admin-card-m3.css`: `.poll-admin-card .invitees-summary` gains `white-space:pre-line`, so each part renders on a line of its own while the summary stays one `role="status"` node, read in full by screen readers.  
- Tests (written, not run): in `tests/client-admin-invitees.test.ts`, the three summary expectations become `"Invited Emails: 2.\nEmails that could not be added: 3"`, `"Invited Emails: 2.\n1 will be sent as your daily limit frees up."` and `"Invited Emails: 2."`.  
- Artifacts: `contracts/ui-contracts.md` (C3, the summary wording and its lines), `tasks.md` (T056).  

2026-10-26 21:04  

### ACCEPTED RECOMMENDATION

Each message of the add summary now has a line of its own, in the new wording.  

- `src/public/adminCard.js`: `addSummaryText` returns its messages joined by line breaks:  
  `Invited Emails: n.`, then `n will be sent as your daily limit frees up.` while some wait, then `Emails that could not be added: n` when some were refused.  
- `src/public/admin-card-m3.css`: `.poll-admin-card .invitees-summary` gains `white-space:pre-line` (CRLF endings kept);  
  the summary stays one `role="status"` node.  
- Tests (written, not run): the three summary expectations in `tests/client-admin-invitees.test.ts` take the new lines.  
- Tests postponed (Run Tests not ticked); the tweak is therefore unverified by a run.  
  `node --check src/public/adminCard.js` passes.  
- Artifacts: `contracts/ui-contracts.md` (C3), `tasks.md` (T056 added).  

2026-10-26 21:04  

## TWEAK05 Waiting Message Names The Daily Limit  
[X] Resolved  
[ ] Run Tests  
 The message "# will be sent as your daily limit frees up"
 will change to:
 "# emails will be sent when your daily limit allows. Your daily limit is: <DAILY LIMIT>".

### RECOMMENDATION

The card does not know the daily limit yet: `/api/config` sends the voter limit and the page size, but not `ENV_MAX_INVITATIONS_PER_DAY`.  

- `src/routes/api.ts`: `/api/config` adds `maxInvitationsPerDay: config.maxInvitationsPerDay`, beside `privateVoterLimitDefault`.  
- `src/public/adminCard.js`: `runtime` takes `maxInvitationsPerDay` (default 200, read like `participantsViewportSize`), and `addSummaryText`'s waiting line becomes `3 emails will be sent when your daily limit allows. Your daily limit is: 200`.  
  It reads `1 email` for one, and keeps no closing period after the number, as written.  
- `postman/openapi.json`: the `/api/config` schema gains `maxInvitationsPerDay`.  
- Tests (written, not run): in `tests/client-admin-invitees.test.ts` (limit 1, served by the real `/api/config`), the waiting summary becomes `"Invited Emails: 2.\n1 email will be sent when your daily limit allows. Your daily limit is: 1"`.  
- Artifacts: `contracts/ui-contracts.md` (C3 wording), `tasks.md` (T057).  

2026-10-26 21:15  

### ACCEPTED RECOMMENDATION

The waiting line now names the daily limit.  

- `src/routes/api.ts`: `/api/config` sends `maxInvitationsPerDay`.  
- `src/public/adminCard.js`: `runtime.maxInvitationsPerDay` (default 200) is read from `/api/config`;  
  the waiting line reads `3 emails will be sent when your daily limit allows. Your daily limit is: 200`, with `1 email` for one.  
- `postman/openapi.json`: `maxInvitationsPerDay` added to the `/api/config` schema.  
- Tests (written, not run): the waiting summary in `tests/client-admin-invitees.test.ts` expects `1 email will be sent when your daily limit allows. Your daily limit is: 1` (that suite runs with `ENV_MAX_INVITATIONS_PER_DAY=1`, so it also checks the value reaches the card).  
- Tests postponed (Run Tests not ticked); the tweak is therefore unverified by a run.  
  `npx tsc --noEmit` and `node --check src/public/adminCard.js` pass.  
- Artifacts: `contracts/ui-contracts.md` (C3), `tasks.md` (T057 added).  

2026-10-26 21:15  

## TWEAK06 Diagnose Why Nothing Is Sent  
[-] Resolved (accepted as-is)  
[ ] Run Tests  

We are trying to diagnose what the problem is with this...
The ENV_MAX_INVITATIONS_PER_DAY is set to 2 in the launch configuration.  

We restarted the server after changing the launch configuration to ensure the new environment variable takes effect.  

We did a hard Refresh of the browser page.

We emptied the poll_invitations table.

We invited: user1@crowdpoll.vote,user2@crowdpoll.vote,user3@crowdpoll.vote,user4@crowdpoll.vote,user5@crowdpoll.vote,user6@crowdpoll.vote

The Admin Poll Card then says:
Invited Emails: 6
6 emails will be sent when your daily limit allows. Your daily limit is: 2

The poll_invitation table shows 6 rows, all not sent.
Screenshot of table:
![poll_invitations table](dontTrack/diagnose.jpg)

Question: is there any way we can diagnose this?
### RECOMMENDATION

Diagnosis: the server is behaving as designed;  
the allowance was already used up.  
The daily allowance is not counted from `poll_invitations` but from `invitation_emails`, one row per invitation or reminder email sent, kept for 24 hours (`allowance()` in `src/invitations/sender.ts`).  
Emptying `poll_invitations` leaves those rows in place: the 3 emails sent at 19:01 (TWEAK01's run), and any sent since, still count until 24 hours after each was sent.  
With a limit of 2 and 2 or more sends in the last 24 hours, the remaining allowance is 0, so all 6 addresses are `added` with `waiting: true` and stay `Not sent yet`.  
They will be sent by `invitationSweep` as each counted email turns 24 hours old.  

How to check it (development database; first confirm that the active `ENV_DATABASE_URL` in the launch file is the local `localhost:5432/app01` one):  

```sql
-- sends counted against each creator right now
select creator_id, count(*) as used, min(sent_at) as oldest, min(sent_at) + interval '24 hours' as frees_up_at
  from invitation_emails
 where sent_at > now() - interval '24 hours'
 group by creator_id;
```

How to start a limit test from zero (development only):  

```sql
delete from invitation_emails;
```

Within 5 seconds the sweep then sends the 2 oldest waiting invitations, and the other 4 stay `Not sent yet`.  
Deleting `poll_invitations` rows by hand also leaves the `invited` `user_polls` rows, the empty placeholder votes and `polls.invited_count` behind;  
the panel's Remove clears all of them.  

- **Option A** _(recommended)_: Add a test-setup note, change no code.  
  `quickstart.md` gets a "Testing the daily limit" note with the two queries above and the warning about deleting rows by hand.  
  - <u>Pros</u>: no product change;  
    the next limit test starts from a known state.  
  - <u>Cons</u>: the card still does not say how much of the limit is used, so the same surprise can happen to a real creator.  

- **Option B**: Option A, plus say what is used.  
  The add response carries `used` (the creator's emails in the last 24 hours), and the waiting line reads `6 emails will be sent when your daily limit allows. Your daily limit is: 2, and 3 were sent in the last 24 hours.`.  
  The sweep also logs `[invitations] Creator <id>: 3 of 2 sent in the last 24 hours; 6 waiting` once per tick while invitations wait.  
  - Code: `src/invitations/invitations.ts` (`addInvitees` returns the allowance's `used`), `src/routes/pollsApi.ts` (passes it on), `src/public/adminCard.js` (the line), `src/invitations/sender.ts` (the log).  
  - Tests (written, not run): `tests/invitations-api.test.ts` (`used` on an add to an OPEN poll), `tests/client-admin-invitees.test.ts` (the line), `tests/invitations-send.test.ts` (the log line, with no address in it).  
  - Artifacts: `contracts/api.md` (A2), `contracts/ui-contracts.md` (C3), `postman/openapi.json`, `tasks.md`, `quickstart.md`.  
  - <u>Pros</u>: the card itself explains why nothing is sent;  
    the log shows it without SQL.  
  - <u>Cons</u>: one more response field and log line;  
    it rewrites the wording just set by TWEAK05.  

- **Option C**: Accept as-is (the diagnosis above is the answer).  

2026-10-26 22:03  

### ACCEPTED RECOMMENDATION

Option C.  
Resolution: accepted as-is by the developer (2026-10-26 22:14)  

## TWEAK07 Daily Limit On Its Own Line  
[X] Resolved  
[ ] Run Tests  
On a line of its own:
"Your daily limit is: 2"
and change it to:
-"Daily Limit: # Emails"


### RECOMMENDATION

The waiting message in `addSummaryText` (`src/public/adminCard.js`) is split in two lines of the summary:  

- `3 emails will be sent when your daily limit allows.`  
- `Daily Limit: 2 Emails` (`1 Email` for a limit of one;  
  the leading `-` in the requirement is read as a list marker, not text).  

Both show only while some added addresses wait;  
the `white-space:pre-line` of TWEAK04 already puts each on its own line.  

- Tests (written, not run): `tests/client-admin-invitees.test.ts` expects `"Invited Emails: 2.\n1 email will be sent when your daily limit allows.\nDaily Limit: 1 Email"`.  
- Artifacts: `contracts/ui-contracts.md` (C3), `tasks.md` (T058).  

2026-10-26 22:16  

### ACCEPTED RECOMMENDATION

The daily limit now has a line of its own in the summary.  

- `src/public/adminCard.js`: the waiting message is `3 emails will be sent when your daily limit allows.` followed, on its own line, by `Daily Limit: 2 Emails` (`1 Email` for a limit of one).  
- Tests (written, not run): `tests/client-admin-invitees.test.ts` expects `Invited Emails: 2.`, `1 email will be sent when your daily limit allows.` and `Daily Limit: 1 Email` on three lines.  
- Tests postponed (Run Tests not ticked); the tweak is therefore unverified by a run.  
  `node --check src/public/adminCard.js` passes.  
- Artifacts: `contracts/ui-contracts.md` (C3), `tasks.md` (T058 added).  

2026-10-26 22:16  

## TWEAK08 Capitalize Emails In Waiting Message  
[X] Resolved  
[ ] Run Tests  
Very simple change: capitalize "emails" in the waiting message.
"# Emails will be sent when your daily limit allows."

### RECOMMENDATION

In `addSummaryText` (`src/public/adminCard.js`), the waiting line's `" email"` / `" emails"` become `" Email"` / `" Emails"`: `3 Emails will be sent when your daily limit allows.` (`1 Email` for one).  

- Tests (written, not run): `tests/client-admin-invitees.test.ts` expects `1 Email will be sent when your daily limit allows.`.  
- Artifacts: `contracts/ui-contracts.md` (C3), `tasks.md` (T059).  

2026-10-26 22:20  

### ACCEPTED RECOMMENDATION

The waiting message now reads `3 Emails will be sent when your daily limit allows.` (`1 Email` for one).  

- `src/public/adminCard.js`: `" email"` / `" emails"` → `" Email"` / `" Emails"` in `addSummaryText`.  
- Tests (written, not run): `tests/client-admin-invitees.test.ts` expects `1 Email will be sent when your daily limit allows.`.  
- Tests postponed (Run Tests not ticked); the tweak is therefore unverified by a run.  
  `node --check src/public/adminCard.js` passes.  
- Artifacts: `contracts/ui-contracts.md` (C3), `tasks.md` (T059 added).  

2026-10-26 22:20  

## TWEAK09 Open Poll Missing From Your Polls  
[X] Resolved  
[ ] Run Tests  

We are trying to diagnose an issue where a Poll we have created and is Open, is not showing.

The row from the polls table is:
"id","title","subtitle","choices","choice_labels","keywords","search","poll_state","poll_state_before_edit_update","poll_visibility","poll_sharing_mode","vote_anonymity","choice_mode","vote_mutability","voter_count_limit","home_listable","created_by_id","created_by_name","created_at","start_at","end_at","closed_at","last_vote_at","vote_count","invited_count","banned_count","choice_counts","content_version","counts_version","poll_edit_update_heartbeat_timestamp","poll_edit_update_client_guid","poll_approval_timestamp","poll_acceptability_screening_attempts","poll_rejection_reason","launched_at","ever_voted"
"4d5c4636-6903-4ab6-af74-976a5ab86c04","When do you want to meet?","November Birthdays","[{""id"": ""aa0e4bf7-7b86-4609-8eba-11e0bdd67cd3"", ""label"": ""Nov 14"", ""position"": 0}, {""id"": ""d6e019d2-cdbf-4331-8b61-884de0c334a1"", ""label"": ""Nov 21"", ""position"": 1}]","Nov 14 Nov 21","","'14':10C '21':12C 'birthday':8B 'meet':6A 'nov':9C,11C 'novemb':7B 'want':4A","OPEN",NULL,"Private Poll","Invitation Only","No","Multiple-Choice Poll","Dynamic-Vote Poll",NULL,False,"X8D55D3H8vYNcoE1LrzaWZnAmXBZnQ7S","David Brooks","2026-10-26 08:06:11.999-04",NULL,"2026-11-13 08:07:00-05",NULL,NULL,0,7,0,"{}",4,0,NULL,NULL,NULL,0,NULL,"2026-10-26 08:07:53.785-04",False

Here's screenshot showing the "Your Polls" tab page and
the Admin Poll card for the "When do you want to meet?" poll creatd by user "Poll Creator RRR".

![Your Polls](dontTrack/your-polls.jpg)

It is running on local development environment.

### RECOMMENDATION

Diagnosis: not a fault — the screenshot is signed in as a different account from the poll's creator.  

- The poll was created by account `X8D55D3H8vYNcoE1LrzaWZnAmXBZnQ7S`, `roadraceresults@gmail.com`, user name `David Brooks` (`polls.created_by_id`, and the card's `Created By` line).  
- The only live session in the local database is `devadmin01@crowdpoll.vote`, whose user name is `Poll Creator RRR` — the name in the screenshot's header.  
- `devadmin01@crowdpoll.vote` is in `ENV_ADMINS` (`devScripts/launch-dev.ps1`), and an administrator's Poll Administration list shows every creator's polls, so the card appears on the left.  
- Your Polls lists only the polls whose `user_polls` row with relation `created` carries the signed-in address (`yourPollsTab`, `src/polls/userPolls.ts`).  
  For this poll that row is `roadraceresults@gmail.com` / `created`, so for `devadmin01@crowdpoll.vote` the tab is rightly empty.  
- The invitation work did not touch the `created` row: it is still there, dated the poll's creation (2026-10-26 08:06).  

To see the poll in Your Polls, sign in as `roadraceresults@gmail.com`; or create the poll while signed in as `devadmin01@crowdpoll.vote`.  

- **Option A** _(recommended)_: Accept as-is (the diagnosis above is the answer); no code change.  
  - <u>Pros</u>: the behaviour matches the spec — Your Polls is the signed-in user's own polls.  
  - <u>Cons</u>: an administrator can still mistake another creator's poll for their own on Poll Administration.  

- **Option B**: Mark another creator's poll on the admin card.  
  When the poll's `created_by_id` is not the signed-in account, the read-only card's `Created By` line carries a `Not your poll` chip.  
  - Code: `src/public/adminCard.js` (compare `createdById` with the session's user id), `src/public/admin-card-m3.css` (the chip).  
  - Tests (written, not run): `tests/client-admin-invitees.test.ts` or the admin card's client test (chip shown and hidden).  
  - Artifacts: `contracts/ui-contracts.md` (C1), `tasks.md`.  
  - <u>Pros</u>: an administrator sees at once whose poll it is.  
  - <u>Cons</u>: a UI change outside this feature's scope, for a case only administrators meet.  

2026-10-27 04:08  

### ACCEPTED RECOMMENDATION

Option B, chosen by the developer: the diagnosis stands (not a fault), and the admin card now marks a poll the signed-in account did not create, to prevent the confusion in future.  

- `src/routes/pollsApi.ts`: `adminListRow` takes the caller's id;  
  each row of `GET /api/admin/polls` and `GET /api/admin/polls/search` carries `ownPoll` (true only when `created_by_id` is the caller's).  
- `src/public/adminCard.js`: when `ownPoll` is `false`, the read-only card's `Created By` field gets a `Not your poll` chip (`not-your-poll-chip`);  
  a missing `ownPoll` shows no chip.  
- `src/public/admin-card-m3.css`: the chip, outlined in the error colour like the `Not delivered` invitee chip, from Material 3 tokens only;  
  the field wraps when the chip does not fit.  
- Tests (written, not run):  
  - `tests/polls-admin-crud.test.ts`: `ownPoll` is true for the creator, false for an administrator, on the list and on search.  
  - `tests/client-admin-search.test.ts`: the chip shows on another creator's card and not on the administrator's own.  
- Artifacts: `contracts/ui-contracts.md` (C1), `tasks.md` (T060), `postman/openapi.json` (`ownPoll` on the admin row).  
- Typecheck (`npx tsc --noEmit`) and `node --check src/public/adminCard.js` pass.  
- Tests postponed (Run Tests not ticked); the tweak is therefore unverified by a run.  

Resolution: applied (2026-10-27 04:15)  

## TWEAK10 Creator Always Votes On Own Poll  
[X] Resolved  
[ ] Run Tests  

The previous TWEAK09 works great.  
However, it uncovered something we didn't specify.  
The Creator of a poll can not Vote for their own poll if they don't invite themself.  
Update this so that the creator can always vote on their own poll, and it doesn't count towards their invitee limit.


### RECOMMENDATION

Cause: the vote path (`assertEligible`, `src/votes/votePath.ts`) refuses anyone without an invitation on an Invitation Only poll, the creator included.  
Viewing already lets the creator in (`reaches` in `src/polls/access.ts`), the card's vote block exempts them (`src/routes/tabsApi.ts`), and Live Results does too (`src/live/registry.ts`);  
only the vote itself was refused.  

- **Recommendation** (single, applied): the creator, matched by account id, votes on their own Invitation Only poll without an invitation;  
  while they hold no invitation, their vote is left out of the voter-limit count, so every invitee can still vote.  
  - The invitee limit (`7 of 100`) counts invitations only, so the creator never takes a place there.  
  - A creator who invites themselves is an invitee like any other, as today.  

2026-10-27 04:22  

### ACCEPTED RECOMMENDATION

Recommendation applied (single recommendation).  

- `src/votes/votePath.ts`: `VoteRequest` gains `userId`;  
  `assertEligible` reads `created_by_id` with `voter_count_limit` and lets an uninvited creator through;  
  the voter-limit check subtracts the creator's uninvited vote (`uninvitedCreatorVotes`).  
- `src/routes/pollsApi.ts`: the vote route passes `userId: caller.id`.  
- Tests (written, not run): `tests/polls-vote.test.ts`: on an Invitation Only poll with a limit of 2 and 2 invitees, the uninvited creator votes, then both invitees still vote, and the creator holds no invitation.  
- Artifacts: `spec.md` (FR-041 and an edge case), `contracts/api.md` (A4, and `ownPoll` in A3 from TWEAK09), `tasks.md` (T061), `postman/openapi.json` (the vote route's 403).  
- Not changed: the legacy `PATCH` with `invitedVoterList` (no client sends it now) still rebuilds an Invitation Only poll's votes from the invited list, which would drop an uninvited creator's vote.  
- Typecheck (`npx tsc --noEmit`) passes.  
- Tests postponed (Run Tests not ticked); the tweak is therefore unverified by a run.  

Resolution: applied (2026-10-27 04:22)  

## TWEAK11 Move Poll Summary Text to Top of Admin Poll Card  
[X] Resolved  
[ ] Run Tests  

We have decided to move the "Poll Summary Text" panel to the top of the "Admin Poll Card".

### RECOMMENDATION

The read-only admin card's body is built in `renderReadOnly()` (`src/public/adminCard.js`) as: dates panel, counts panel, Invitees panel (Invitation Only), then the Settings Summary (`wizard-summary`), the "Poll Summary Text".  

- **Recommendation** (single, applied): put the Settings Summary first in the body, directly under the card's header row (`Poll State Is: …` and its actions), above the dates panel;  
  the dates, counts and Invitees panels keep their order below it.  
  - The body is a flex column with a 12 px gap, so no stylesheet changes.  
  - The new-poll wizard face is unchanged: its summary already sits at the top of the wizard.  

2026-10-27 04:27  

### ACCEPTED RECOMMENDATION

Recommendation applied (single recommendation).  

- `src/public/adminCard.js`: `renderReadOnly()` appends the Settings Summary before the dates panel.  
- Tests (written, not run): `tests/client-admin-invitees.test.ts` ("sits below the counts panel…") also checks that the summary is the body's first child and the Invitees panel its last.  
- Artifacts: `contracts/ui-contracts.md` (the read-only card's order, under C1), `tasks.md` (T062).  
- `node --check src/public/adminCard.js` passes.  
- Tests postponed (Run Tests not ticked); the tweak is therefore unverified by a run.  

Resolution: applied (2026-10-27 04:27)  

## TWEAK12 Creator Vote Missing From Admin Vote Count  
[X] Resolved  
[ ] Run Tests 

The Vote Count on the Poll Admin Card for an Invitation Only Poll that only the Creator has voted in
is 0 when only the Creator has voted in the poll.

### RECOMMENDATION

Diagnosis: not a fault in TWEAK10.  
The local Debug server uses the **production Valkey**, which production shares, so production instances took the creator's vote and dropped it.  

- `.vscode/launch.json` ("Debug server") and `devScripts/launch-dev.ps1` set `ENV_VALKEY_URL` to `valkey-tor1-crowdpoll`, the same managed Valkey that `.do/app.yaml` binds for production;  
  `ENV_DATABASE_URL` is the local `app01`.  
  The templates (`launch.json.example`, `devScripts.example/launch-dev.ps1`) use `redis://localhost:6379`.  
- The vote was accepted: Valkey's live counter `cnt:4d5c4636-…` reads `total: 1` on choice `Nov 21`, so the poll card shows it.  
- The vote stream `votes` and its consumer group `writers` are shared;  
  at the time of the check two consumers were active within the last second, this server and at least one production instance.  
  A production consumer that reads a local poll's vote finds no such poll in the production database and drops it (`writeBatch`, "dropped … vote(s) for polls that no longer exist").  
- The counter flush works the same way: whichever instance renames the shared `dirty` set writes the counts to *its* database, so `polls.vote_count` stayed 0 locally.  
- Local database: no `votes` row for the poll, `vote_count` 0, `counts_version` 0.  
- **It works both ways:** while the Debug server runs, it can also take production votes and drop them, and take production's dirty set so those poll rows miss a flush.  

- **Option A** _(recommended)_: Development uses its own cache and queue.  
  Comment out `ENV_VALKEY_URL` in the local `.vscode/launch.json` ("Debug server") and `devScripts/launch-dev.ps1`, leaving it unset, which gives the in-process cache and queue (CLAUDE.md: development needs PostgreSQL only).  
  Then restart the server, and the creator votes again.  
  No code change.  
  - <u>Pros</u>: stops the cross-traffic with production at once;  
    matches the templates and CLAUDE.md.  
  - <u>Cons</u>: the vote already cast is lost;  
    production votes taken by the local server while it ran are lost too (production's logs show `[votes] dropped` lines).  

- **Option B**: Option A, plus a startup guard.  
  `loadConfig` (`src/config.ts`) refuses to start when `ENV_VALKEY_URL` names a non-local host while `ENV_DATABASE_URL` names `localhost`, naming both.  
  - Code: `src/config.ts`;  
    test in `tests/config.test.ts` (written, not run);  
    `CLAUDE.md` (the `ENV_VALKEY_URL` row).  
  - <u>Pros</u>: the mix cannot happen again by accident.  
  - <u>Cons</u>: a configuration rule outside this feature;  
    it would block a deliberate local test against a remote Valkey.  

- **Option C**: Accept as-is (the diagnosis above is the answer).  

2026-10-27 04:32  

### ACCEPTED RECOMMENDATION

Option B, chosen by the developer.  

- Local configuration (git-ignored, not part of the repository):  
  - `.vscode/launch.json` ("Debug server") and `devScripts/launch-dev.ps1`: the production `ENV_VALKEY_URL` line is commented out, so the server uses the in-process cache and queue.  
  - Restart the Debug server for this to take effect, then vote again as the creator;  
    the vote already cast was dropped by production and is lost.  
- `src/config.ts`: `loadConfig` refuses to start when `ENV_VALKEY_URL` names a non-local host while `ENV_DATABASE_URL` names `localhost`, `127.x` or `::1`;  
  the message names both hosts and never a password.  
  A local Valkey, no Valkey, or a remote database with a remote Valkey still start.  
- Tests (written, not run): `tests/config.test.ts`: the refusal (default, `localhost` and `127.0.0.1` databases), with no credentials in the message, and the three allowed pairs;  
  the existing "leaves the cache, search engine and Spaces unset by default" case now gives its remote Valkey a remote database.  
- Artifacts: `CLAUDE.md` (the `ENV_VALKEY_URL` row), `tasks.md` (T063).  
- Typecheck (`npx tsc --noEmit`) passes, and a direct call of `loadConfig` with the old Debug server values throws as intended.  
- Tests postponed (Run Tests not ticked); the tweak is therefore unverified by a run.  
- Not changed, for the developer to decide: the same local files still set `ENV_SPACES_*` to the production bucket `crowdpoll`, so a local server publishes its TRENDING and Newest objects (and static assets) where production reads them.  

Resolution: applied (2026-10-27 04:39)  

## TWEAK13 Run A Local Valkey  
[-] Resolved (manually)  
[ ] Run Tests  
How do I get 
        "ENV_VALKEY_URL": "redis://localhost:6379",
to work?

### RECOMMENDATION

Nothing in the code is in the way: `src/config.ts:216` accepts `redis://localhost:6379` beside the local `ENV_DATABASE_URL`, and `iovalkey` connects to it.  
What is missing is a server: nothing listens on port 6379 (no `valkey-server` or `redis-server` on the PATH).  
Docker Desktop 29.8 and WSL 2 (Ubuntu) are both installed, so either can provide one.  

- **Option A (recommended): a Docker container.**  
  `docker run -d --name crowdpoll-valkey -p 6379:6379 --restart unless-stopped valkey/valkey:8`  
  Start Docker Desktop first; check with `docker exec crowdpoll-valkey valkey-cli ping` (`PONG`).  
  - Pros: one command, the same Valkey family as production, restarts with Docker, removed with `docker rm -f crowdpoll-valkey`.  
  - Cons: Docker Desktop must be running whenever the app is.  
- **Option B: Valkey inside WSL Ubuntu.**  
  `wsl -d Ubuntu -- sudo apt-get install -y valkey-server` (or `redis-server` on older Ubuntu), then `wsl -d Ubuntu -- sudo service valkey-server start`; WSL 2 forwards `localhost:6379` to Windows.  
  - Pros: no Docker.  
  - Cons: the service does not start with WSL by itself; the package may be missing on older Ubuntu releases.  
- **Option C: leave `ENV_VALKEY_URL` unset locally** (comment out `.vscode/launch.json:75` and `devScripts/launch-dev.ps1:83`).  
  - Pros: the in-process cache and queue need nothing; it is the documented development default.  
  - Cons: the Valkey code paths (and the cache integration suite in `README.md:227`) are not exercised.  

No code, test or artifact change is needed for any option; optionally a line in `README.md` and `devScripts.example/launch-dev.ps1:83` naming the Docker command, which would be the only edit and needs no test (documentation only).  

Recommended: Option A, because Docker is already installed and it matches production's Valkey.  
(2026-10-27 08:21)  

### ACCEPTED RECOMMENDATION

Resolved manually by the developer, following Option A.  

- Docker Desktop was started (`Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"`).  
  The existing container `valkey` (`valkey/valkey:8`, restart `unless-stopped`) came up with it on port 6379 and answered `PONG`, so `redis://localhost:6379` in the local launch files now reaches a server.  
  A second container, `crowdpoll-valkey`, could not bind the same port and was removed.  
- `devScripts.example/launch-dev.ps1:83-84` gained the two commands as comments (committed in `1ccac61`).  
  On a machine that already has a Valkey container, the `docker run` line fails with `port is already allocated`; starting Docker Desktop is enough there.  
- Tests: none needed — a local environment change with nothing a test can observe; `config.ts` already accepts a localhost Valkey beside a localhost database.  
- Artifacts: none needed.  

Resolution: resolved manually (2026-10-27 10:41)  

## TWEAK14 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  
