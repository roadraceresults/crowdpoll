# Overview: `specs/20261027-133129-SINGLE-EMAIL-INVITE`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261027-133129-SINGLE-EMAIL-INVITE` |
| Tweak file created | 2026-10-27 16:53 |
| Last updated | 2026-10-27 22:21 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Disabled Buttons Look Enabled on Email Pages  
[X] Resolved  
[ ] Run Tests  

When a button is disabled on one of the email related pages, it isn't visually obvious to the user.  
The button appearas the same as if it wedre enabled.

### RECOMMENDATION

**Cause** (2026-10-27 17:55): the pages that use the card shell — `login.html`, `create-account.html`, `confirm-signin.html`, `accept-terms.html`, `invite.html` and `profile.html` — load `site.css` and then `card-shell-m3.css`.  
`site.css` dims a disabled primary action (`.card-shell-action .btn-primary:disabled{ opacity:0.5; … }`), but `card-shell-m3.css` overrides it with `opacity:1` (its section 6, "Buttons") and supplies no replacement look;  
so a gated or settled button (Continue before the Terms box is ticked, a sent sign-in link, an unchanged Profile field) renders exactly like a live one.  
The poll card's Vote button already has the correct Material 3 disabled look in `pollCard-m3.css` (`background: on-surface at 12%`, `text: on-surface at 38%`), but its selector is `.card-face`, which never matches the shell's `.card-shell-face`.

**Recommendation**: give the shell's buttons the same Material 3 disabled colours the Vote button has, in `card-shell-m3.css`, by extending the existing `opacity:1` rule:  

```css
.card-shell-face .card-shell-action .btn-primary:disabled,
.card-shell-face .btn-primary.is-running{
  opacity:1;
  background:color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent);
  color:color-mix(in srgb, var(--md-sys-color-on-surface) 38%, transparent);
  box-shadow:none;
}
```

- One rule in one file; no HTML or script change.  
- Covers every disabled state: gated (Terms unticked, empty field), running (the click-to-outcome window, which also sets `disabled`), and settled (a used-up action such as "email a link").  
- Matches the Vote button's disabled look, so the two button families stay consistent, and the `--md-sys-color-on-surface` token flips with dark mode on its own.  
- `Run Tests` is unticked, so no automated test is written or run for this tweak;  
  the change is visible at once on `/login` (the button before an address is typed) and `/invite` (Continue before the Terms box is ticked).  

### ACCEPTED RECOMMENDATION

Accepted by "Accept" 2026-10-27 18:38.  

- `src/public/card-shell-m3.css` — the section 6 rule `.card-shell-face .card-shell-action .btn-primary:disabled, .card-shell-face .btn-primary.is-running` gained the Material 3 disabled colours beside its `opacity:1`:  
  `background: color-mix(in srgb, var(--md-sys-color-on-surface) 12%, transparent)`, `color: color-mix(… 38% …)` and `box-shadow:none`, matching the Vote button's disabled look in `pollCard-m3.css`.  
- No HTML, script or feature-artifact change was needed;  
  the invite card's contracts describe when Continue is unavailable, not its colours.  
- `Run Tests` was unticked, so no automated test was written or run;  
  the change shows on `/login`, `/create-account`, `/confirm-signin`, `/accept-terms`, `/invite` and `/profile` wherever a primary action is gated, running or settled.  


## TWEAK02 Used Link in Private Window Shows the Poll Card  
[X] Resolved  
[ ] Run Tests  

In quickstart.md, doing Step 2.2:
?2. After step 1.4, open the same link in another private window: it goes to the sign-in page (today's poll link), not to a card."

When we open the link:
http://localhost:8080/invite?PID=7e143acc-f776-4f44-9a47-3672be6c84c7&token=zyKzambkQzE0MhjqVHDqrE4XoUEgr9vCBWqT5Gy7kH0

In a new Incognito private browser, we open the same link: it goes straight to the the maximized Poll Card.  
User3 already has an account, but is not signed into the new private browser.  
This doesn't do what the quickstart instructions suggest: the link should lead to the sign-in page, not directly to the Poll Card.  

### RECOMMENDATION

**Cause** (2026-10-27 18:44): the server is behaving as specified;  
the second window was not a guest.  
Every Incognito window of one Chrome browser shares a single private session until the **last** Incognito window is closed, so a "new" Incognito window opened while step 1.4's window (or any other Incognito window) is still open carries step 1.4's sign-in cookie.  
The route then does exactly what it should (`src/routes/pages.ts:111`):  

- the token was used by step 1.4, so `findSignInToken` returns null and `GET /invite` redirects to `/?PID=<pid>` without writing anything;  
- `/?PID=` with User3's session shows the poll maximized — the observed result;  
- `/?PID=` for a true guest redirects to `/login?PID=<pid>` (`src/routes/pages.ts:79`), the sign-in page carrying today's poll link — the quickstart's promised result.  

The automated suite pins both halves: `tests/invitations-redeem.test.ts` (US5) proves a used token redirects to `/?PID=`, and the guest redirect from `/?PID=` to sign-in is feature 026 behaviour under test since then.  

- **Recommendation A** _(recommended)_: no code change;  
  reword quickstart §2.2 so the check is run as a genuine guest:  
  "After step 1.4, close every private window, then open the same link in a new private window (private windows of one browser share a session until the last closes): it goes to the sign-in page (today's poll link), not to a card."  
  Then re-run the step with every Incognito window closed first (or in a different browser's private window).  

- **Recommendation B**: leave the quickstart as written and only re-test with all private windows closed first;  
  the wording trap stays for the next reader.  

### ACCEPTED RECOMMENDATION

Recommendation A accepted by "Accept A" 2026-10-27 18:49.  

- No code change: the server behaves as specified, and the observed poll card came from the shared Incognito session, not from the link.  
- `specs/20261027-133129-SINGLE-EMAIL-INVITE/quickstart.md` §2.2 reworded:  
  "After step 1.4, close every private window, then open the same link in a new private window (private windows of one browser share a session until the last closes): it goes to the sign-in page (today's poll link), not to a card."  
- `Run Tests` was unticked, so no automated suite was run;  
  the behaviour was already pinned by `tests/invitations-redeem.test.ts` (used token → `/?PID=`) and the feature-026 guest redirect tests.  
- To confirm by hand: close every Incognito window, then open the link in a fresh one (or use a different browser's private window).  


## TWEAK03 Resend Button Enablement Logic  
[X] Resolved  
[ ] Run Tests  

For quickstart.md Step 5.1, resend.  
Resend is always greyed out.  

See screenshot:  
![Resend greyed out](dontTrack/resend.jpg)

What is the logic around whether the Resend button is enabled or greyed out?  

### RECOMMENDATION

**The logic** (2026-10-27 19:04) — `resendBlockedReason` in `src/invitations/invitations.ts:62`, from the preceding feature (20261026-POLL-INVITATIONS);  
the server derives it per row, the menu item greys out and shows the reason as the small inline text (your screenshot's "user2@crowdpoll.vote was e…").  
Resend is enabled only when **all three** hold, checked in this order:  

1. **The poll is OPEN.** Closed or archived → "The poll is closed."; any other state (editing, awaiting approval, scheduled) → "The poll is not open."  
2. **No reminder has ever been sent** for this invitation (`reminded_at` is null) — one reminder per invitee, ever → "Already reminded once."  
3. **The last email is stale**: either the last send failed (`send_failed_at` set — resend allowed at once), or the invitation email went out **24 hours or more ago** → otherwise "<name> was emailed less than 24 hours ago."  

"Always greyed out" during a quickstart walk is rule 3: the invitation was just sent, so the 24-hour cooldown always blocks an immediate Resend.  
This is by design (it stops an invitee being mailed twice in a day), but it means **quickstart §5.1 cannot be walked as written** — "Invite A, then press Resend" is impossible within 24 hours of the invite.  

- **Recommendation A** _(recommended)_: no code change;  
  amend quickstart §5.1 to age the invitation first, e.g.:  
  "Invite A; age the invitation so Resend becomes available —  
  `psql app01 -c "UPDATE poll_invitations SET sent_at = sent_at - INTERVAL '25 hours' WHERE email = '<A>';"` —  
  refresh the admin card, then press Resend; open the first email's link: today's poll link behaviour, not a card."  

- **Recommendation B**: leave everything as it is;  
  the answer above documents the logic, and §5.1 is walked a day later (or by triggering a failed send).  

### ACCEPTED RECOMMENDATION

Recommendation A accepted by "Accept A" 2026-10-27 19:07.  

- No code change: the greyed Resend is the designed 24-hour cooldown (`resendBlockedReason`, `src/invitations/invitations.ts:62`), with the poll-OPEN and reminded-once rules before it.  
- `specs/20261027-133129-SINGLE-EMAIL-INVITE/quickstart.md` §5.1 now ages the invitation before pressing Resend:  
  `psql app01 -c "UPDATE poll_invitations SET sent_at = sent_at - INTERVAL '25 hours' WHERE email = '<A>';"`, then refresh the admin card.  
- `Run Tests` was unticked, so no automated suite was run;  
  the cooldown, reminded-once and poll-state rules were already pinned by the 20261026 feature's invitation tests.  


## TWEAK04 One Email to Create an Account from Login  
[X] Resolved  
[ ] Run Tests  

We would like to reduce the emails for a user who tried to Login with an email that doesn't have an account.  
Currently, 
1. the user will receive a Login email
2. then when clicking its link 
3. they are shown the Create Account page.
4. they then need to enter the email address again
5. they receive a Create Account email.
6. click the link in the Create Account email to complete the account creation process.

Could the first email be a Create Account email instead of a Login email, to reduce the number of emails sent to a user who doesn't have an account?  
Since they don't have an account, sending a Login email first is unnecessary and could be replaced with a Create Account email directly.

### RECOMMENDATION

**Today** (2026-10-27 20:21): the first email already is a Create Account email, not a sign-in link.  
`POST /api/auth/request-login-link` (`src/routes/api.ts:265`) sends an unknown address `createAccountMessage` ("Finish creating your CrowdPoll account"), whose button opens the plain `/create-account` page;  
the person must type the address again and tick the Terms box, and `POST /api/auth/create-account` then sends a second email, the real sign-in link.  
The second email exists because the first link proves nothing: it is an ordinary page address, so the server must mail the address again to confirm it.  
Two emails, and the address typed twice.  

- **Recommendation A** _(recommended)_: make the first email's button a one-time sign-in link, as this feature did for invitations, so the account is created and signed in from that one email.  
  - `request-login-link`, unknown address: store a single-use token (32 bytes, base64url, only its `hashToken` stored) in BetterAuth's `verification` table, under an identifier of its own, holding the address, the poll id if any, and the "stay signed in" choice, expiring after 15 minutes like a sign-in link;  
    the email's button becomes `/create-account?token=<token>` (plus `&PID=` when the request carried one).  
    No account is created when the email is sent, so the email's promise "no account is created unless you finish" still holds, and `retentionSweep` already removes expired `verification` rows.  
  - `GET /create-account?token=…` writes nothing (mail scanners);  
    `createAccountCard.js` asks a new `GET /api/auth/create-account/link-info` for the masked address and shows "Create your account as j•••@…", the Terms box and Create account, with no address field.  
  - `POST /api/auth/create-account` gains a token form: Origin check, token valid, Terms ticked, rate limit, allowlist; then create the account with `recordAgreement`, use the token up (conditional, once), and sign in through this feature's `mintLoginToken` + `completeSignIn`, so the address is confirmed and the session hooks run exactly as for an emailed link.  
    The poll id rides through to `/?PID=`.  
  - An expired, used or unknown token falls back to today's page (address field and a second email), so an old email never dead-ends.  
  - The email's wording changes only where it must ("…create your account to continue. The button works once, for 15 minutes.");  
    the address-existence privacy is unchanged, since both cases still answer `Check your inbox`.  
  - Tests: the token issue and fallback paths, the token form of create-account (Terms, Origin, rate limit, allowlist, used-once, no second email), the card's token mode, the email text, openapi.json.  
  - Result: request, one email, one click, tick Terms, press Create account, signed in.  

- **Recommendation B**: create the pending account when the login link is requested and send an ordinary sign-in link;  
  the existing Terms gate sends the newly signed-in account to `/accept-terms` on arrival.  
  - A few lines of code, and one email.  
  - But every mistyped or abusive address on the login page leaves a pending account row that nothing removes, the email says "Sign in" to someone who has no account, and its "no account is created unless you finish" promise is broken.  

- **Recommendation C**: leave it as it is;  
  two emails, the second a plain sign-in link, and no new token path to secure.  

### ACCEPTED RECOMMENDATION

Recommendation A accepted by "Accept A" 2026-10-27 20:30.  

- `src/auth/createAccountLinks.ts` (new): `issueCreateAccountToken`, `findCreateAccountToken`, `useCreateAccountToken`.  
  The token is 32 random bytes, base64url;  
  only its hash is stored, as a `verification` row with a `create-account:` identifier, 15 minutes, the newest per address.  
  Its value starts `{"createAccount":…`, so `supersedeLoginLinks` (which `mintLoginToken` runs) never deletes it.  
- `src/routes/api.ts`:  
  - `request-login-link`, address with no account: issues the token and emails `/create-account?token=…` (plus `&PID=`);  
    no account is created.  
  - New `GET /api/auth/create-account/link-info` (no-store, reads only): `{ email (masked), hasAccount, termsVersion }`, or `404 invalid-link`.  
  - `POST /api/auth/create-account` with `token`: Origin, token, Terms (when still no account), create-account rate limit, allowlist, token used up, account created with `recordAgreement`, any session in the browser ended, signed in through `mintLoginToken` + `completeSignIn` with the stored poll id and "stay signed in" choice;  
    answers `{ redirect }`, and sends no second email.  
- `src/legal/termsGate.ts`: link-info joins `ALLOWED_API`.  
- `src/email/templates.ts`: the create-account email adds "The button works once, for 15 minutes.";  
  `tests/fixtures/email-messages-before-heading-line-2.json` updated to match.  
- `src/public/createAccountCard.js`: a token mode ("Create your account as j•••@…", the Terms box, no address field;  
  "Sign in as …" with no Terms box when the address gained an account meanwhile).  
  A link that cannot be used falls back to the address form with "That link has expired or has been used."  
- Tests written, not run (`Run Tests` unticked):  
  - `tests/create-account-link.test.ts` (new): the token issue, newest-only and supersession, link-info, Terms, success with no second email, single use, Origin, expiry, existing account, rate limit, allowlist.  
  - `tests/client-create-account-link.test.ts` (new): the card's token mode, gating, request body, existing account and both fallbacks.  
  - `tests/auth.test.ts` and `tests/signin-pid.test.ts`: the emailed link is now `/create-account?token=…`.  
- `npx tsc --noEmit` passes;  
  `node --check src/public/createAccountCard.js` passes.  
- Documents: `postman/openapi.json` (token form and link-info), `README.md` and `ARCHITECTURE.md` (Email), `contracts/api.md` A4–A5, `quickstart.md` §8.  


## TWEAK05 DigitalOcean Build Fails on the Valkey Guard  
[X] Resolved  
[ ] Run Tests  

Let us know where the problem is during the Build phase on DigitalOcean.  
The ENV varriable for ENV_DATABASE_URL isn't localhost,  
so the build must be getting it from somewhere else.  
Here's the log:

Oct 28 00:06:30  [34m│[0m [assets] failed: ConfigError: ENV_VALKEY_URL names valkey-tor1-crowdpoll-do-user-19711650-0.i.db.ondigitalocean.com while ENV_DATABASE_URL names localhost: a local database needs a local Valkey, or none (leave ENV_VALKEY_URL unset).
Oct 28 00:06:30  [34m│[0m     at loadConfig (/workspace/src/config.ts:220:11)
Oct 28 00:06:30  [34m│[0m     at main (/workspace/devScripts/publish-assets.ts:23:18)
Oct 28 00:06:30  [34m│[0m     at <anonymous> (/workspace/devScripts/publish-assets.ts:41:1)
Oct 28 00:06:30  [34m│[0m     at ModuleJob.run (node:internal/modules/esm/module_job:561:25)
Oct 28 00:06:30  [34m│[0m     at async node:internal/modules/esm/loader:647:26
Oct 28 00:06:30  [34m│[0m     at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5)
Oct 28 00:06:30  [34m│[0m building: exit status 1
Oct 28 00:06:30  [34m│[0m Timer: Builder ran for 32.202281854s and ended at 2026-10-28T00:06:30Z
Oct 28 00:06:30  [34m│[0m [31;1mERROR: [0mfailed to build: exit status 1
  




### RECOMMENDATION

**Cause** (2026-10-27 21:06), confirmed against the live app spec (`doctl apps spec get`, read only):  

- The build command ends with `npm run publish-assets`, and `devScripts/publish-assets.ts` calls `loadConfig()`, so the whole configuration is checked at build time.  
- At build time `ENV_DATABASE_URL` is absent: it is `RUN_TIME` only, in the live spec as in `.do/app.yaml`.  
  `loadConfig` then falls back to its default, `postgres://localhost:5432/app01` (`src/config.ts:201`);  
  that is the "localhost" in the log.  
- The live spec lists `ENV_VALKEY_URL` twice: the `RUN_TIME` entry `.do/app.yaml` has, and a second, encrypted one with `RUN_AND_BUILD_TIME`, added in the console.  
  So the build does see the managed Valkey host.  
- The guard added with the previous feature (commit 1ccac61, `src/config.ts:213`) refuses a localhost database beside a remote Valkey, so `publish-assets` stops and the build fails.  
  Earlier builds passed because the guard did not exist.  

- **Recommendation A** _(recommended)_: in `src/config.ts`, apply the guard only when `ENV_DATABASE_URL` is actually set, not to its built-in default.  
  - The build, which never touches the database, passes whatever the variable scopes are.  
  - A developer's server is still protected:  
    the launch templates set `ENV_DATABASE_URL` to `localhost` explicitly, so the guard still applies there.  
  - Add a config test:  
    no `ENV_DATABASE_URL` plus a remote `ENV_VALKEY_URL` loads, and an explicit localhost one still throws.  
  - Separately, and by hand, tidy the console:  
    delete the second, `RUN_AND_BUILD_TIME` `ENV_VALKEY_URL`, so the spec matches `.do/app.yaml` and the Valkey password is not handed to the build.  
    Check first that the remaining `RUN_TIME` entry holds the right URL, since the duplicate may be the value the server uses today.  

- **Recommendation B**: no code change;  
  only delete the console's `RUN_AND_BUILD_TIME` `ENV_VALKEY_URL` entry (with the same check of the remaining one).  
  The build then sees no Valkey and passes, but any later variable given build scope could trip the guard again.  

### ACCEPTED RECOMMENDATION

Recommendation A accepted by "Accept A" 2026-10-27 21:28.  

- `src/config.ts`: the local-database-beside-remote-Valkey guard now checks only an `ENV_DATABASE_URL` that is set;  
  the built-in default (`postgres://localhost:5432/app01`), which the build sees because the variable is `RUN_TIME` only, is not checked.  
  A developer's server, whose launch template sets `localhost` explicitly, is still refused a remote Valkey.  
- `tests/config.test.ts`: the guard's loop no longer counts an unset `ENV_DATABASE_URL` as local;  
  a new case loads the default database URL beside a remote `ENV_VALKEY_URL`.  
  Not run (`Run Tests` unticked).  
- Checked by hand: `npx tsc --noEmit` passes, and `npx tsx devScripts/publish-assets.ts` with no `ENV_DATABASE_URL` and a remote `ENV_VALKEY_URL` now passes the configuration check (exit 0), the step that failed the build.  
- Still to do by hand, in the DigitalOcean console (not done here):  
  delete the second, `RUN_AND_BUILD_TIME` `ENV_VALKEY_URL`, after checking that the remaining `RUN_TIME` entry holds the right URL.  
- The fix reaches DigitalOcean only once it is committed and pushed to `dev`.  


## TWEAK06 Console Valkey Variable Recreated  
[X] Resolved  
[ ] Run Tests  
This has been done, and the Prod app launches:

Still to do by hand, in the DigitalOcean console (not done here):  
  delete the second, `RUN_AND_BUILD_TIME` `ENV_VALKEY_URL`, after checking that the remaining `RUN_TIME` entry holds the right URL. 

### RECOMMENDATION

**Confirmed** (2026-10-27 22:18) against the live app spec (`doctl`, read only):  

- The spec now holds one `ENV_VALKEY_URL`, `RUN_TIME` only, valued `${valkey-tor1-crowdpoll.DATABASE_URL}`;  
  the build no longer sees Valkey.  
- The latest deployment (manual, 2026-10-28 01:53 UTC) is `ACTIVE`;  
  the 00:05 UTC deployment is the failed build from TWEAK05.  
- One difference remains: `.do/app.yaml` still says `${valkey-tor1-crowdpoll.REDIS_URL}`, the name that was not used.  

- **Recommendation A** _(recommended)_: change `.do/app.yaml`'s `ENV_VALKEY_URL` value to `${valkey-tor1-crowdpoll.DATABASE_URL}`, so the checked-in spec matches the one that works.  
  One line;  
  no code change.  

- **Recommendation B**: accept as-is;  
  the console is right, and `.do/app.yaml` keeps the untried name.  

### ACCEPTED RECOMMENDATION

Recommendation A accepted by "Accept A" 2026-10-27 22:21.  

- `.do/app.yaml`: `ENV_VALKEY_URL` is now `${valkey-tor1-crowdpoll.DATABASE_URL}`, matching the live console spec that works.  
- `devScripts/password-cycling-HOWTO.md` (git-ignored, local only) names the same reference.  
- No code change, no test (`Run Tests` unticked);  
  the research note in `research/SETUP-CDN/` is left as the historical record it is.  


## TWEAK07 <short title here>  
[ ] Resolved  
[ ] Run Tests  

