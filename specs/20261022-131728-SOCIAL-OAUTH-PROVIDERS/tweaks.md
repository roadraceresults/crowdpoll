# Overview: `specs/20261022-131728-SOCIAL-OAUTH-PROVIDERS`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261022-131728-SOCIAL-OAUTH-PROVIDERS` |
| Tweak file created | 2026-10-22 15:47 |
| Last updated | 2026-10-23 15:38 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAKS01 Open Prod Site For Provider Verification  
[X] Resolved  
[ ] Run Tests  

We are going to open up the Prod site (empty ENV_ALLOWED_EMAILS) for easier Provider verification.  
Please update provider-setup.md to reflect this if necessary.  
Also update quick-start.md to reflect this if necessary.  

We have a DUNS number.

### RECOMMENDATION

Documentation only; no code change.  
- `contracts/provider-setup.md` P0:
  - step 1 records that CrowdPoll has its D-U-N-S number, and P3 step 1 uses it;  
  - a new step opens the production site before any provider is configured or submitted for review: delete `ENV_ALLOWED_EMAILS` in the App Platform console (or leave it empty) and redeploy.  
    The reason is that provider reviewers sign in with their own accounts, and with the allowlist on, their sign-in would land on `/login?error=not-launched`.  
    The check is that start-up logs `[auth] Sign-up allowlist off`.  
- `quickstart.md`:
  - §2 keeps `ENV_ALLOWED_EMAILS` empty in `launch-dev.ps1`;  
  - §3 adds the open-site step and a check that a new address can create an account.  
- Tests: none; nothing a test can observe changes.  
  The allowlist's off behaviour is already asserted by `tests/allowlist.test.ts` ("with the list off").  

2026-10-22 15:52

### TWEAKS ACCEPTED

Documentation only; no code changed.  
- `contracts/provider-setup.md`:
  - P0 step 1 records that CrowdPoll has its D-U-N-S number;  
  - a new P0 step 2 opens the production site (`ENV_ALLOWED_EMAILS` deleted or empty, redeploy, check for `[auth] Sign-up allowlist off`) before any provider is configured or reviewed, and the later P0 steps are renumbered 3–4;  
  - P3 step 1 enrols with that D-U-N-S number.  
- `quickstart.md`:
  - §2 keeps `ENV_ALLOWED_EMAILS` empty in `launch-dev.ps1`;  
  - §3 step 1 opens the site and checks that an address never listed can create an account.  
- Tests: none written or run, because nothing a test can observe changed.  
  `tests/allowlist.test.ts` ("with the list off") already covers the open site.  
- The requirement itself is unchanged; the allowlist feature's own documents already say to remove the variable at launch.  

2026-10-22 15:52

## TWEAKS02 Clarify Why The Site Is Opened  
[X] Resolved  
[x] Run Tests  

The quickstart says:
```
2. Open the site: delete `ENV_ALLOWED_EMAILS` in the App Platform console (or leave it empty) and redeploy, before any
   provider is configured or submitted for review. Reviewers sign in with their own accounts; with the allowlist on,
   their sign-in lands on `/login?error=not-launched` and the review fails. Start-up then logs
   `[auth] Sign-up allowlist off`.
```   

Why would the sign-in land on `/login?error=not-launched` if the ENV_ALLOWED_EMAILS has been deleted?

### RECOMMENDATION

It would not: once `ENV_ALLOWED_EMAILS` is deleted, nobody is refused.  
The sentence (in `contracts/provider-setup.md` P0 step 2, not the quickstart) describes what happens if the step is skipped, but "with the allowlist on" reads as if it followed the deletion.  
- Reword P0 step 2 so the reason comes first and the consequence is plainly the case the step prevents:  
  "Open the site before any provider is configured or submitted for review: delete `ENV_ALLOWED_EMAILS` in the App Platform console (or leave it empty) and redeploy; start-up then logs `[auth] Sign-up allowlist off` and any address can sign in.  
  This is needed because provider reviewers sign in with their own accounts, which are not on the list: while the list is set, their sign-in is refused (`/login?error=not-launched`) and the review fails."  
- `quickstart.md` §3 step 1 already says it the right way round; no change.  
- Tests (Run Tests ticked): no new test, because the wording is not observable.  
  Run `tests/allowlist.test.ts`, whose "with the list off" and the social sign-in cases assert both halves of the sentence.  

2026-10-22 16:09

### TWEAKS ACCEPTED

It would not: with `ENV_ALLOWED_EMAILS` deleted, no one is refused.  
The old sentence described what happens if the step is skipped, but read as if it followed the deletion.  
- `contracts/provider-setup.md` P0 step 2 is reworded: open the site and redeploy, the log line, then "any address can sign in"; the reason follows, naming the refusal as what happens only while the list is set.  
- `quickstart.md`: unchanged, because §3 step 1 already reads the right way round.  
- Tests: none added, because the wording is not observable.  
  `tests/allowlist.test.ts` was run and passed (1 file, 22 tests); it asserts that the list off admits everyone and the list on refuses a provider address with `/login?error=not-launched`.  

2026-10-22 16:09

## TWEAKS03 Amazon Consent Logo Choice  
[X] Resolved  
[X] Run Tests  
Question:
The AWS "Login with Amazon" application requests:
```
If you want to add a Consent Logo Image for your application, click Upload Image. This logo is displayed on the sign-in and consent screen to represent your business or website. It applies to Android, iOS, and website versions of your application. The logo will be shrunk to 50 pixels in height if it is taller than 50 pixels; there is no limitation on the width of the logo.
```

Would this be the CrowdPoll Banner or the CrowdPoll Logo Icon?

### RECOMMENDATION

`contracts/provider-setup.md` names the logo only loosely (`email-logo.png` "or the favicon SVG", and "consent logo" in P4).  
There is no banner image file today; the banner is drawn by `app.js` in the page header.  
`src/public/email-logo.png` is the icon (the two figures, 96 × 96 px, transparent).

- **Option A (recommended): the Logo Icon**, uploading `src/public/email-logo.png` as is.  
  - Pros: ready now;  
    Amazon shrinks it to 50 px, which stays sharp from 96 px;  
    the same square icon suits Google's branding logo (square, 120 px) and Microsoft's (square), so all three consent screens match;  
    the consent screen already names the app with the security profile's name, CrowdPoll, so the word mark would repeat it.  
  - Cons: the screen shows the figures without the word mark beside them.  
- **Option B: the Banner** (icon and word mark), exported once as a PNG 100 px high (2× of 50 px) from the header's SVG with headless Edge, saved as `src/public/consent-banner.png`.  
  - Pros: the brand reads in full where the logo is shown.  
  - Cons: a new image to generate and keep in step with the header;  
    at 50 px high the word mark is small;  
    Google and Microsoft still need a square icon, so the providers would differ.  

For either option, P0's value list and P4 step 1 in `provider-setup.md` would name the file, and P1/P2 would use the same choice where they ask for a logo.  
Tests: Option A changes documentation only, so nothing is testable;  
Option B would add a check in `tests/well-known.test.ts`' style that `/consent-banner.png` is served as `image/png`, run because Run Tests is ticked.  

2026-10-22 18:29

### TWEAKS ACCEPTED

Option B, the banner, chosen by the developer.  
- `src/public/consent-banner.png` (new): the header's own SVG (`SITE_HEADER_MARKUP` in `app.js`, icon and word mark) rendered once with headless Edge at 100 px high (twice Amazon's 50 px), 733 × 100, transparent.  
- `contracts/provider-setup.md`:
  - the values section names both images, the square `email-logo.png` for Google and Microsoft and `consent-banner.png` for Amazon, and how the banner was made;  
  - P1 and P2 name `email-logo.png`;  
  - P4 step 1 names `consent-banner.png` as the Consent Logo Image.  
- `tests/consent-banner.test.ts` (new): `GET /consent-banner.png` is `200 image/png`, 100 px high, wider than high, with an alpha channel.  
- Tests run: `tests/consent-banner.test.ts` and `tests/m3-assets.test.ts` passed (2 files, 38 tests).  
- Smart App Control (now On) blocks embedded PostgreSQL's `initdb.exe` (`spawn UNKNOWN`), so the developer chose to run the tests on the local PostgreSQL 16 service:  
  - `tests/helpers/global-setup.ts` uses `TEST_PG_ADMIN_URL` when it is set, instead of starting the embedded server;  
  - it accepts a localhost server only, and always connects through its `postgres` database;  
  - `README.md` (Testing) documents it.  

2026-10-22 20:45

## TWEAKS04 Google User Support Email  
[X] Resolved  
[x] Run Tests  

QUESTION: answer will resolve  

The Provide Registration Procedure for Google P1. Says:
```text
2. **Google Auth Platform → Branding**: app name CrowdPoll, support email, logo (optional; `email-logo.png`), homepage, privacy and terms
```

However, the dropdown on the form olny allows me to selecdt from an email address the I verified with Google.  
And they won't let me verify an email that has been forwarded - such as all the @crowdpoll.vote emails that get forward through ImprovMX.    

![google support email](dontTrack/google-support-email.png)

We definitely want the support email to be support@crowdpoll.vote.  

Is there a way to set the support email to support@crowdpoll.vote without having to verify it through Google?  
Or do we need to figure out how to get @crowdpoll.vote emails without forwarding to ImprovMX?  

Do we need to go the route of using:  
"Recommendation A (recommended): a hosted mailbox provider (e.g. Zoho Mail) for crowdpoll.vote, with dmarc@crowdpoll.vote as one of its addresses."?

### RECOMMENDATION

The screenshot (`dontTrack/google-support-email.jpg`) shows the field's only two sources: the signed-in account (`crowdpollvote@gmail.com`) and "Google Groups managed by you".  
Google offers no way to type an address in.  
A Google Group cannot help either: a personal account can only make `@googlegroups.com` groups, an address like `support@crowdpoll.vote` needs Google Workspace or Cloud Identity, and a group's aliases cannot be chosen.  
Google's documented way is to make the address itself a Google Account, give it a role on the project, and sign in as it.  
Forwarding does not prevent that: the account is verified by a code sent to the address, and ImprovMX delivers it to Gmail.  
So Zoho Mail is not needed: a mailbox would not put the address in the list either, and Option A would still be needed.  

- **Option A (recommended): a Google Account named `support@crowdpoll.vote`.**  
  1. Sign out of Google, or use a private window: Create account → For my personal use → "Use my current email address instead" → `support@crowdpoll.vote`;  
     the code arrives in Gmail through ImprovMX (if it does not, check ImprovMX's logs and Gmail's spam folder);  
     turn on 2-Step Verification for the account.  
  2. As `crowdpollvote@gmail.com`: IAM & Admin → IAM → Grant access → `support@crowdpoll.vote`, role Owner (or Editor) on the CrowdPoll project.  
  3. Sign in to the Cloud console as `support@crowdpoll.vote`, open Google Auth Platform → Branding, and choose it as User support email.  
     The developer contact may stay `crowdpollvote@gmail.com`, which needs no Google Account.  
  - Pros: users see `support@crowdpoll.vote`, as on the site, in the emails and in the policies;  
    no change to mail delivery.  
  - Cons: a second Google Account to secure;  
    Google may ask for a phone number when creating it.  
  - Not "verifying a forwarded email": adding the address as an alternate email on the Gmail account, or as Gmail "Send mail as", is a different flow, and neither puts it in this list.  
- **Option B: use `crowdpollvote@gmail.com` on Google's screen.**  
  - Pros: no setup;  
    it can be changed later.  
  - Cons: Google's consent screen shows a Gmail address unlike every other CrowdPoll contact.  
- **Option C: a hosted mailbox (Zoho Mail) for `crowdpoll.vote`.**  
  - Pros: real mailboxes, so mail can also be sent as `support@crowdpoll.vote`.  
  - Cons: does not solve this alone (it still needs Option A);  
    moves the MX, SPF and DMARC records away from the ImprovMX setup that works today.  

For Options A or B, `contracts/provider-setup.md` P1 step 2 would say how the support email is chosen (for Option A, the three steps above as a new P1 step before Branding), and `quickstart.md` would match if it repeats the step.  
Tests: Run Tests is ticked, but the change is documentation for steps done in Google's console, so nothing is testable;  
no suite would run.  

2026-10-23 09:17

### TWEAKS ACCEPTED

Option A, accepted by "Accept A".  
The developer created the `support@crowdpoll.vote` Google Account and gave it a role on the CrowdPoll project.  
- `contracts/provider-setup.md` P1:  
  - new step 2, "The support email's account": why Branding offers only the signed-in account;  
    create the account with "Use my current email address instead" (the code arrives through ImprovMX), and never open Gmail with it, which asks for phone verification;  
    grant it Editor (active at once) or Owner (active only once the emailed invitation is accepted in a window signed in as `support@crowdpoll.vote` alone);  
    fill Branding in a private window signed in only as that account;  
  - step 3 (Branding) names `support@crowdpoll.vote` as User support email;  
  - the later steps are renumbered 4 to 7; nothing else cites their numbers.  
- `quickstart.md` does not repeat the Branding step, so it is unchanged.  
- Tests: Run Tests is ticked, but the change is documentation of steps in Google's console, so there is nothing to test and no suite was run.  

2026-10-23 13:38

## TWEAKS05 Login And Create Account Cards  
[X] Resolved  
[X] Run Tests  

Revise the Login page as shown in the image below:  
![Login Page Revision](dontTrack/login-page-revision.png)  

Also, revise the Create Account page with some of the same revisions:  
- smaller font-size for the "I agree" text
- add the "Lock" icon next to the top of the Create Account card
- adjust spacing and alignment for consistency with the Login page
- change the "Enter your email..." text to  
```text
Enter your email address.
We will create your account and email your first sign-in link.
We do not store passwords.
```

Also, remove the "Create Account To Vote" buttons from the entire webapp.
The user will be able to Create an account on the Login page.



### RECOMMENDATION

Grounded in `loginCard.js`, `createAccountCard.js`, `cardShell.js`, `card-shell-m3.css` and the guest header in `app.js`.  
The tweak's image is `dontTrack/login-page-revision.jpg` (the link says `.png`).  
"Don't have an account? Create account" is new: the Login card has no such line today, and the 14 px it shows (`--md-sys-typescale-body-medium-size`) is the size the arrows ask for.  

- **Option A (recommended): the two cards as drawn, and the header's guest buttons reduced to Log In.**  
  - Lock badge (both cards):  
    a 40 px circle in `--md-sys-color-primary-container` (`#AFF1C3`, the site's light green; its dark twin in dark mode) holding an inline SVG padlock in `--md-sys-color-on-primary-container`, centred above the title;  
    added by `CardShell.mount` when a card passes `icon: "lock"`, so Profile and Not Authorized are unchanged.  
  - Login subtitle, three lines, the last in 12 px:  
    - `both`: "Sign in with a provider," / "or we email you a one-time sign-in link." / "We do not store passwords.";  
    - `native`: "We email you a one-time sign-in link." / "We do not store passwords.";  
    - `oauth`: the current provider sentence / "We do not store passwords.".  
  - 14 px instead of 16 px for the "I agree…" box, "Stay signed in…" and "By signing in you agree…", with the checkbox kept aligned to the first line.  
  - New last line on the Login card, under the action, centred, 14 px: "Don't have an account? Create account", linking to `/create-account` (with `?PID=` when the page has one, so a shared poll survives);  
    shown in `native` and `both` only, because `/create-account` answers 404 in `oauth`.  
  - Create Account card: the lock badge;  
    the subtitle as three lines, "Enter your email address." / "We will create your account and email your first sign-in link." / "We do not store passwords." (last in 12 px);  
    the "I agree…" box in 14 px;  
    the same spacing as the Login card (one shared rule set in `card-shell-m3.css`).  
  - Header: `app.js` no longer renders "Create Account To Vote", so a guest sees Log In alone on every page and in the phone's floating pair;  
    `floatingActions.js` already handles one button.  
    The `.btn-header-primary` class and its rules stay, since the admin card's Publish and Save buttons use them.  
  - Docs: `contracts/ui-contracts.md` C1 (Login card) and the header note, `spec.md` FR-007's "Create Account … keep working" (reached from the Login card now).  
  - Tests (Run Tests ticked):  
    - `tests/client-floating-actions.test.ts` expects `["Log In"]`;  
    - new `tests/client-login-card.test.ts`: lock badge on both cards, the subtitle lines per mode, the Create account line in `native`/`both` but not `oauth`, `?PID=` carried;  
    - run those with `client-terms-box`, `client-login-pid`, `client-oauth-login` and `pages`.  
- **Option B: as A, plus "Already have an account? Log in" at the foot of the Create Account card.**  
  - Pros: with the header button gone, a visitor who reaches Create Account by mistake has a way back besides the ×.  
  - Cons: not in the image or the list.  

2026-10-23 14:25

### TWEAKS ACCEPTED

Option B, accepted by "accept b": Option A plus the Log in line on the Create Account card.  
- `src/public/cardShell.js`:  
  - `mount` takes `signin: true` (a lock badge on its own row above the title, with the close control beside it, and the `card-shell-signin` class), a `subtitle` given as an array of lines, and a `note` (the smaller last line);  
  - new `CardShell.addFootLine(card, lead, href, text)`, which adds `?PID=` when the page has one.  
- `src/public/loginCard.js`: the subtitle lines per mode with the note "We do not store passwords.";  
  "Don't have an account? Create account" in `native` and `both` (not `oauth`, where `/create-account` answers 404).  
- `src/public/createAccountCard.js`: the badge, "Enter your email address." / "We will create your account and email your first sign-in link." and the note;  
  "Already have an account? Log in".  
- `src/public/card-shell-m3.css` (section 13): the badge (40 px, `--md-sys-color-primary-container`, so dark mode follows the tokens), the subtitle lines and 12 px note, 14 px for the Terms box, "Stay signed in…", the terms line and the foot line, and the foot line's centred style.  
  Profile and Not Authorized are unchanged.  
- `src/public/app.js`: the guest header renders Log In only;  
  `renderSiteHeader` no longer takes the config, and `siteConfig` is gone.  
  `.btn-header-primary` stays for the admin card's Publish and Save.  
- Docs: `contracts/ui-contracts.md` C1 (badge, subtitle, sizes, the Create account line) and new C1a (the Create Account card and the header);  
  `spec.md` FR-007 says where Create Account is reached from.  
- Tests:  
  - new `tests/client-login-card.test.ts` (7 tests): the badge row on both cards, the subtitle lines and note in each mode, the foot lines and their `?PID=`, no Create account line in `oauth`, and a guest header with Log In only;  
  - `tests/client-floating-actions.test.ts` expects Log In alone, in every mode;  
  - `tests/client-header-fit.test.ts`: the guest row is one button narrower (685 px in the model instead of 851 px), so the guest widths moved (800 → 650, 850 → 700, the resize steps 600 → 680 → 700) and the sign-in test now has the member's row, not the guest's, overflow.  
- Tests run: the full suite passed on the local PostgreSQL 16, 112 files, 1538 tests (15 skipped).  

2026-10-23 14:44

## TWEAKS06 Terms Prompt After Provider Sign-In  
[X] Resolved  
[ ] Run Tests  

Everythings works as expected.  
However, it doesn't seem typical to have the "I agree to" checkbox everything a user uses a third party login.  

Can we try having anothe small dialog that appears after a third-party login, only if the user hasn't previously agreed to the terms?


### RECOMMENDATION

Most of this exists already.  
The Terms box on the Login card only unlocks the provider buttons: nothing records the tick.  
Agreement is recorded by the terms gate (privacy feature R5, this feature's FR-015): after a provider sign-in, any account that has not accepted the current `TERMS_VERSION` is redirected from its first page to `/accept-terms?next=…`, a small card with the "I agree…" box, Accept and Sign Out.  
A returning member who has accepted goes straight through.  
So removing the box from the Login card gives exactly the flow asked for, and the box was a second, unrecorded tick.  

- **Option A (recommended): remove the box from the Login card, and word the Accept Terms card for a first sign-in.**  
  - `loginCard.js`: no Terms box;  
    the provider buttons work at once (no `aria-disabled` wait);  
    in `oauth` mode a line under the buttons, "By signing in you agree to the Terms of Service and Privacy Policy." (the line `native` and `both` already show under the email form), as Google, Apple, Microsoft and Amazon sign-in pages commonly do.  
  - `acceptTermsCard.js`: the title "Updated Terms of Service" only suits someone who accepted an earlier version.  
    For a first acceptance it would read "Welcome to CrowdPoll" / "Before you continue, please accept the Terms of Service.", with the lock badge of the sign-in cards;  
    it tells the two apart from a new `termsFirstAcceptance` (no version ever accepted) on `GET /api/me`, documented in `postman/openapi.json`.  
  - Docs: `spec.md` FR-009 (no box; agreement on the Accept Terms card, as FR-015 already says) and the user story;  
    `contracts/ui-contracts.md` C1.  
  - Tests (postponed, Run Tests is empty): `client-oauth-login` drops the "inert until ticked" test and checks the buttons work at once and the `oauth` terms line;  
    a new check that a first-time account sees "Welcome to CrowdPoll" and one with an older version sees "Updated Terms of Service";  
    `/api/me` returns `termsFirstAcceptance`.  
- **Option B: as A, but the prompt as a dialog over the home page instead of a redirect to `/accept-terms`.**  
  - Pros: the visitor stays on the page they were going to.  
  - Cons: the gate in `termsGate.ts` redirects every page today and answers `403 terms-required` for the APIs the home page calls, so the home page would need exempting and its tabs held back until accepted;  
    a much larger change to the privacy feature's central rule.  
- **Option C: remove the box only, keeping the Accept Terms card as it is.**  
  - Pros: smallest change.  
  - Cons: a new member is greeted with "Updated Terms of Service".  

2026-10-23 15:05

### TWEAKS ACCEPTED

Option A, accepted by "accept a".  
- `src/public/loginCard.js`: no Terms box;  
  the provider buttons work at once (inert only while another one's sign-in is starting);  
  in `oauth` mode the line "By signing in you agree to the Terms of Service and Privacy Policy." follows the buttons (`native` and `both` already had it under the email form).  
- `src/routes/api.ts`: `GET /api/me` adds `termsFirstAcceptance`, true while the account has never accepted any version;  
  `postman/openapi.json` documents it.  
- `src/public/acceptTermsCard.js`: reads `/api/me` first;  
  a first acceptance sees "Welcome to CrowdPoll" / "Before you continue, please accept the Terms of Service.", anyone else "Updated Terms of Service" as before;  
  both with the lock badge.  
  The terms gate is unchanged: it already sends an account without the current Terms to `/accept-terms` after any sign-in.  
- Docs: `spec.md` (the user story and FR-009), `contracts/ui-contracts.md` C1, `ARCHITECTURE.md`.  
- Tests (written, not run: Run Tests is empty):  
  - `tests/client-oauth-login.test.ts`: the "inert until ticked" test is now "no Terms box, buttons work at once, the terms line follows them";  
    the other tests no longer tick a box;  
  - `tests/client-terms-box.test.ts`: the oauth Login card has no box;  
    the Accept Terms card greets a never-accepted account and tells one with an older version the Terms were updated;  
  - `tests/terms-gate.test.ts`: `termsFirstAcceptance` is true without agreement and false once accepted.  
- `npx tsc --noEmit` passed.  
- Run later at the developer's request (2026-10-23 15:38): the three files passed, 20 tests, after one fix to `client-oauth-login`: the terms line breaks with a `<br>`, so its text has no space before "and";  
  the test now checks how the line starts and its two links.  

2026-10-23 15:12

## TWEAKS07 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  
