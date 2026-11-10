# Overview: `specs/20261108-193031-SNACKBAR-HOURGLASS`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261108-193031-SNACKBAR-HOURGLASS` |
| Tweak file created | 2026-11-09 15:22 |
| Last updated | 2026-11-09 15:28 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Notice After Email Login  
[X] Resolved  
[ ] Run Tests  

The new hourglass on the "Logged in as..." snackbar looks great.   
We now require that the "Logged in as..." snackbar with the hourglass to also be displayed when a user logs in by email address.

### RECOMMENDATION

- **Code**: in `src/routes/api.ts`, `completeSignIn` returns `/?PID=<pid>&signedIn=1` or `/?signedIn=1` instead of `/?PID=<pid>` or `/`.  
  Every email login ends there: the login link (`/api/auth/verify`), the confirmation page (`/api/auth/confirm-signin`), the create-account link and an invitation's Continue.  
  `app.js` already shows the notice for `signedIn=1` and removes it at once, and `acceptTermsCard.js` already takes it out of `next`, so no client change is needed; only the comment on `takeSignInMark` that says the mark comes from a provider login is reworded.  
- **Tests** (written, not run: `Run Tests` is not ticked): the landing addresses asserted in `auth.test.ts`, `oauth-modes.test.ts`, `signin-binding.test.ts`, `signin-pid.test.ts`, `session.test.ts`, `profile.test.ts`, `create-account-link.test.ts` and `invitations-redeem.test.ts` gain `signedIn=1`; the client test "shows nothing with no parameter, as after an emailed link" is renamed, since an emailed link now carries the mark.  
- **Artifacts**: `spec.md` (Story 1, FR-001, FR-009, SC-001, the emailed-link edge case), `contracts/ui-contracts.md` C1, `quickstart.md` row 9, `plan.md` summary, `research.md` R4's scope note if it names provider logins only, `tasks.md` (a new task T017), and `README.md` / `ARCHITECTURE.md`, which say the notice follows a provider login.  

2026-11-09 15:27  

### ACCEPTED RECOMMENDATION

- **Code**:
  - `src/routes/api.ts:485`: `completeSignIn` now returns `/?PID=<pid>&signedIn=1` or `/?signedIn=1`, so every email login (login link, confirmation page, create-account link, invitation Continue) lands with the mark and `app.js` shows the notice with the hourglass.  
  - `src/public/app.js:612`: the comment on `takeSignInMark` no longer says the mark comes only from a provider login.  
- **Tests**: tests postponed (Run Tests not ticked); not run.  
  - 18 landing-address assertions updated to carry `signedIn=1`: `tests/auth.test.ts` (3), `oauth-modes.test.ts` (2), `signin-binding.test.ts` (3), `signin-pid.test.ts` (3), `session.test.ts` (1), `profile.test.ts` (1), `create-account-link.test.ts` (1), `invitations-redeem.test.ts` (4).  
  - `tests/client-sign-in-notice.test.ts`: "shows nothing with no parameter, as after an emailed link" renamed "… as on a reload or an ordinary visit".  
  - `npx tsc --noEmit` passes.  
- **Artifacts**: `spec.md` (Story 1 and its first scenario, FR-001, FR-009, SC-001, the reload edge case, Assumptions), `plan.md` (Summary, Scale/Scope), `contracts/ui-contracts.md` C1, `quickstart.md` rows 9 and 9a, `tasks.md` (T013 wording, T017 added), `README.md`, `ARCHITECTURE.md`.  
- **Requirements**: `requirements/20261108-193031-snackbar-hourglass/requirements.md:20` still says the notice does not appear after an emailed-link login; left unedited.  

2026-11-09 15:28  

## TWEAK02 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  



