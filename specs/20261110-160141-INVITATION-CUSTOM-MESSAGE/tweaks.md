# Overview: `specs/20261110-160141-INVITATION-CUSTOM-MESSAGE`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261110-160141-INVITATION-CUSTOM-MESSAGE` |
| Tweak file created | 2026-11-10 17:52 |
| Last updated | 2026-11-10 19:18 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Message Field Under Its Radio Button  
[X] Resolved  
[ ] Run Tests  

Position the Custom Email Message editor directly under the "Only people you invite" radio button.  
Also, place a line between each radio button section.
The mockup image below illustrates the desired placement and separation of the sections:  
![Custom Email Message Position](requirements\20261110-160141-invitation-custom-message\custom-email-message-position.jpg)  

The mockup isn't pixel-perfect; it serves as a visual guide for the desired layout and separation of sections.  

### RECOMMENDATION

- `src/public/adminCard.js` `buildStep1`: append the Custom Email Message field inside the radio group, directly after the "Only people you invite" row (as the copy-link block already follows "Anyone you send the link to"), instead of after the voters switch.  
  Before every option row but the first, append a decorative `div.wizard-who-divider` (`aria-hidden="true"`), so each option section — the row and anything under it — is separated by a line.  
  The voters switch already draws its own top line, which separates it from the last section.  
- `src/public/admin-card-m3.css`: `.poll-admin-card .wizard-who-divider{ border-top:1px solid var(--md-sys-color-outline-variant); }` (tokens only, as the M3 layer requires).  
  A separate element rather than a border on the row, so the row's rounded selection background keeps its corners.  
- `tests/client-admin-wizard.test.ts`: the field now directly follows the "Only people you invite" row inside the radio group and precedes the next divider;  
  two dividers sit between the three options.  
  Tests written, not run (Run Tests not ticked).  
- Artifacts: `spec.md` US1-AC1 and FR-002, `contracts/ui-contracts.md` C1, `tasks.md` T013 and T019, `research.md` R7, and the requirements decision UA5 is noted in the console only.  

2026-11-10 18:05  

### ACCEPTED RECOMMENDATION

- `src/public/adminCard.js` `buildStep1`: the Custom Email Message field is now appended inside the radio group right after the "Only people you invite" row (removed from after the voters switch);  
  a `div.wizard-who-divider` (`aria-hidden="true"`) precedes every option row but the first.  
- `src/public/admin-card-m3.css`: one rule, `.poll-admin-card .wizard-who-divider{ border-top:1px solid var(--md-sys-color-outline-variant); }`.  
- `tests/client-admin-wizard.test.ts`: the placement test now asserts the group's order `link, line, invite, field, line, public`, the field directly after the invite row, the divider's `aria-hidden`, and the switch right after the group.  
  Tests postponed (Run Tests not ticked); the updated test was not run, so the tweak is unverified by a run.  
- Artifacts: `spec.md` (US1-AC1, FR-002), `contracts/ui-contracts.md` (C1), `tasks.md` (T013, T019), `research.md` (R7), `quickstart.md` (step 1), `README.md` (Custom Email Message paragraph).  

2026-11-10 18:05  

## TWEAK02 Summary Line On The Read-Only Card  
[X] Resolved  
[ ] Run Tests  

A poll in the local database with the title "Brainstorm: Polling Website Name"
has a Custom Email Message entered. 

The Wizard Summary does not display  
"A Custom Invitation Email Message has been entered"  
when not in Editing mode.  

However, when in Editing mode, the Wizard Summary correctly displays "A Custom Invitation Email Message has been entered".

A small change to the summary message text is to add a period at the end, so it reads: "A Custom Invitation Email Message has been entered."

### RECOMMENDATION

Cause: the read-only card builds its summary from the admin list row, which (by R2) carries no message at all;  
only the wizard, which loads the admin detail, knows there is one.  

- `src/routes/pollsApi.ts` `adminListRow`: add `hasInvitationMessage: p.invitation_message !== ""` — a boolean only, never the text, so the message itself still stays on the admin detail (blank messages are already stored as `""`).  
- `src/public/adminCard.js`:
  - `readOnlyAnswers()` adds `hasInvitationMessage: current.hasInvitationMessage === true`;  
  - `buildSummary` shows the line when `s.hasInvitationMessage` is given and true, and otherwise (in the wizard) when the rendered message has visible text, as now;  
  - the line reads `A Custom Invitation Email Message has been entered.`: the period follows the summary part, as on the other summary lines, so the tappable text and its `aria-label` are unchanged.  
- `postman/openapi.json`: `hasInvitationMessage` (boolean) in `AdminPollSummary`.  
- Tests (written, not run — Run Tests not ticked):
  - `tests/client-admin-wizard.test.ts`: the read-only card of an Only people you invite poll with a message shows the line with its period, and one without a message does not;  
    the wizard tests expect the period on the line's text.  
  - `tests/polls-discovery.test.ts`: the admin list row has `hasInvitationMessage: true` and still no message text.  
- Artifacts: `contracts/ui-contracts.md` C2 (sentence with period, read-only card), `contracts/api.md` A3 (the boolean on admin list rows), `spec.md` US2-AC1 and FR-011 (period), `research.md` R2 and R7, `CLAUDE.md`/`CLAUDE_COMPLETE.md` "Admin-only" decision, `README.md` sentence.  

2026-11-10 18:47  

### ACCEPTED RECOMMENDATION

- `src/routes/pollsApi.ts` `adminListRow`: added `hasInvitationMessage: p.invitation_message !== ""` (a boolean; the text stays on the admin detail).  
- `src/public/adminCard.js`:
  - `readOnlyAnswers()` passes `hasInvitationMessage` from the list row;  
  - `buildSummary` uses it when present, and the rendered message's visible text in the wizard;  
  - the line now ends with a period after the summary part.  
- `postman/openapi.json`: `hasInvitationMessage` in `AdminPollSummary`.  
- Tests (postponed — Run Tests not ticked; written, not run, so the tweak is unverified by a run):
  - `tests/client-admin-wizard.test.ts`: new test for the read-only card's line with its period, and none without a message;  
    two wizard assertions now expect the period.  
  - `tests/polls-discovery.test.ts`: the admin list row's `hasInvitationMessage` is true with a message and false without.  
- `npx tsc --noEmit` passes.  
- Artifacts: `spec.md` (US2-AC1, FR-011: period), `contracts/ui-contracts.md` (C2), `contracts/api.md` (A3), `research.md` (R2, R7), `tasks.md` (T043 added), `quickstart.md` (step 3), `README.md`, `ARCHITECTURE.md`, `CLAUDE.md` and `CLAUDE_COMPLETE.md` ("Admin-only" decision).  

2026-11-10 18:48  

## TWEAK03 Resend Interval Setting  
[X] Resolved  
[ ] Run Tests  
Question: is there an environment variable that specifies how soon a email can be resent?

### RECOMMENDATION

Answer: no.  
The wait is fixed at 24 hours by `DAY_MS` in `src/invitations/invitations.ts:37`, checked in `resendBlockedReason` (line 73): a resend is allowed once the last email is 24 hours old, or at once after a failed delivery, and only once per invitee (`reminded_at`).  
The related settings are `ENV_MAX_INVITATIONS_PER_DAY` (200, the daily sending allowance) and `ENV_INVITATION_SWEEP_INTERVAL` (30 s); neither changes the resend wait.  
The README states the rule ("**Resend invitation** once, a day or more after the last email").  

- **Option A** _(recommended)_: Accept as-is — the question is answered; nothing changes.  
  - Pros: no change outside this feature's scope;  
    24 hours matches the email's own wording ("up to one reminder").  
  - Cons: testing a reminder locally needs the row's `sent_at` moved back by hand.  
- **Option B**: Add `ENV_INVITATION_RESEND_WAIT` (ms, default 86 400 000), validated in `loadConfig` (`src/config.ts`), passed to `resendBlockedReason` and the listing's `resendBlockedReason` field, with the message worded from it;  
  rows in `.claude/rules/environment.md`, the `.example` launch templates and the README; tests in `tests/invitations-*.test.ts` and the config tests.  
  - Pros: a short wait in development makes reminders easy to try.  
  - Cons: a new setting for a feature that does not need one;  
    the plan says this feature adds no setting.  

2026-11-10 18:54  

### ACCEPTED RECOMMENDATION

Option B, accepted 2026-11-10.  

- `src/config.ts`: `invitationResendWaitMs`, read from `ENV_INVITATION_RESEND_WAIT` (a positive integer in ms; default `86400000`, 24 hours).  
- `src/invitations/invitations.ts`: `DAY_MS` removed;  
  `resendBlockedReason` takes the wait, used by `listInvitees` and `resendInvitation`;  
  its reason reads "… was emailed less than <n hours / minutes / seconds> ago.", so the default wording ("24 hours") is unchanged.  
- `launch.json.example` (7 configurations) and `devScripts.example/launch-dev.ps1`: `ENV_INVITATION_RESEND_WAIT = 86400000`.  
  Your git-ignored `.vscode/launch.json` and `devScripts/launch-dev.ps1` were not touched; add the line there (e.g. `60000`) to try reminders after a minute.  
- Docs: rows in `.claude/rules/environment.md`, `CLAUDE_COMPLETE.md` and the README settings table;  
  the README's "Resend invitation" sentence;  
  the `resendBlockedReason` description in `postman/openapi.json`.  
- Tests (postponed — Run Tests not ticked; written, not run, so the tweak is unverified by a run):
  - `tests/config.test.ts`: the default and the read value (`SETTINGS`), and the `defaultsUsed` entry (`NUMERIC_DEFAULTS`);  
  - `tests/invitations-store.test.ts`: a 60 s wait allows a reminder at 61 s and refuses it at 59 s, and the reason is worded in minutes, hours or seconds.  
  - The existing "less than 24 hours ago" assertions stay as they are, since the default keeps that wording.  
- `npx tsc --noEmit` passes.  
- Artifacts: `plan.md` (summary), `spec.md` (Assumptions), `tasks.md` (T044 added), `CLAUDE.md` and `CLAUDE_COMPLETE.md` (the feature's closing line).  

2026-11-10 19:02  

## TWEAK04 Invitation Email Wording  
[X] Resolved  
[ ] Run Tests  

Small changes to the invitation email.  

Remove the sentence:  
"That's why we're writing to you."  

Change the wording of:  
"Please don't forward this email."
to
"Do not forward this email."

### RECOMMENDATION

- `src/email/templates.ts` `invitationMessage`: end the first paragraph at "… on CrowdPoll." and word the sign-in line "This button signs you in to CrowdPoll as <address>. Do not forward this email." (invitations and reminders alike).  
- `tests/invitation-email.test.ts`: update `PARAGRAPH_1` and the sign-in `SENTENCE`, and add a test that neither old wording appears.  
  Tests written, not run (Run Tests not ticked).  
- Artifacts: `tasks.md` (new task), `contracts/ui-contracts.md` C4;  
  earlier features' documents are left as their history.  

2026-11-10 19:18  

### ACCEPTED RECOMMENDATION

- `src/email/templates.ts`: removed "That's why we're writing to you." from the first paragraph;  
  "Please don't forward this email." is now "Do not forward this email.".  
- `tests/invitation-email.test.ts`: `PARAGRAPH_1` and the sign-in `SENTENCE` updated;  
  new test "no longer says why we're writing, and says not to forward the email" (text and HTML).  
  Tests postponed (Run Tests not ticked); written, not run, so the tweak is unverified by a run.  
- `npx tsc --noEmit` passes.  
- Artifacts: `tasks.md` (T045 added), `contracts/ui-contracts.md` (C4).  
  The earlier POLL-INVITATIONS and SINGLE-EMAIL-INVITE specs still quote the old wording, as their record of what was built then.  

2026-11-10 19:18  

## TWEAK05 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  
