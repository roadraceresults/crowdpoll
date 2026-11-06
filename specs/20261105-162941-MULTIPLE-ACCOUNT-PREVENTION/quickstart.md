# Quickstart: Multiple Account Prevention

How to prove the feature works end to end. Contracts: `contracts/api.md`, `contracts/ui-contracts.md`. Table: `data-model.md`.

## Prerequisites

- PostgreSQL and the development launch template, with:
  - `ENV_DEVICE_EVENTS_ENABLED=true`
  - `ENV_DEVICE_EVENTS_KEY=` at least 32 random characters
- Two signed-in test accounts, A and B; Chrome and Firefox.
- A SQL client, with this query:

```sql
select event, account_id, poll_id, left(browser_hash, 8) b, left(hardware_hash, 8) h, fingerprint_version, at
from device_events order by at desc limit 20;
```

## Automated

```
npx tsc --noEmit
npm test
```-9

## Scenarios

| # | Do | Expect |
|---|---|---|
| Q1 | Account A signs in by email link; load several pages and a second tab | Exactly one `sign-in` row; later page loads send no `POST /api/me/device-sign-in` |
| Q2 | A votes and changes the vote on a Dynamic-Vote poll | Two `vote` rows with the poll and a time, and nothing about choices; the vote response is as before (the vote route refuses an empty vote, so there is no clear to record) |
| Q3 | A votes in Chrome and in Firefox on one computer | Different `b`; the same `h` is hoped for and should be noted either way (R3); this is the check of the hardware value on real browsers |
| Q4 | Sign out, then B signs in and votes in the same Chrome | B's `b` equals A's Chrome `b` |
| Q5 | Block `/vendor/fingerprintjs-5.3.0.min.js` in DevTools, reload and vote | The vote succeeds as usual; the row has null hashes |
| Q6 | Send a vote with a malformed `X-Device-Fingerprint` | The vote succeeds; the row has null hashes |
| Q7 | Vote on a closed poll | Refused; no new row |
| Q8 | In DevTools > Network, reload and vote | Nothing leaves the site's origin |
| Q9 | In DevTools > Application, after the fingerprint is computed | No new cookie, Local Storage or Session Storage key |
| Q10 | A signed-in account that accepted the old Terms loads a page | `/accept-terms` first, with no row and no fingerprint request; one `sign-in` row after accepting |
| Q11 | Load a page signed out | The library file is not requested |
| Q12 | Start with `ENV_DEVICE_EVENTS_ENABLED=false`, sign in and vote | The library file is not requested; no row; `/api/me` has no `X-Device-Sign-In-Due` |
| Q13 | Start with the setting on and no key | The app stops with a `ConfigError` |
| Q14 | Delete a poll with vote events | Its vote rows are gone; other rows remain |
| Q15 | Delete account A | No row for A remains |
| Q16 | Read `/privacy` and `/terms` | The wording of C4–C6; "In short", the section and the retention table agree |
| Q17 | Wait for, or run, the retention sweep | `[device-events] last 24h: …` in the log with counts only; a partition past its age is dropped |

## Turning collection on in production (FR-025)

1. Confirm that every account is a test user. Compare the result of this query with `ENV_ALLOWED_EMAILS`:
   ```sql
   select email from "user" order by email;
   ```
   If any account is not a test user, stop and resolve that first.
2. Tell each test user directly what will be recorded and why, with a link to `/privacy#device-evidence`.
3. Add `device_events_key` to `infra/secrets.auto.tfvars`, set `ENV_DEVICE_EVENTS_ENABLED = "true"` in `infra/app.tf`, apply, and run `npm run deploy`.
4. After a day, check the coverage line in the log.

Replacing the key, or upgrading the library, also means bumping `DEVICE_FINGERPRINT_VERSION`.

## Answering a privacy request (FR-022)

```sql
select * from device_events
where account_id = (select id from "user" where email = '<address>');
```

## Before the public opening

A lawyer reviews C5 and the basis for collection (FR-028). Any change that matters from then on follows the policy's 30-day email.

## Release checklist

These steps are the operator's, and none of them is automated:

- [ ] **FR-025**: every account is confirmed to be a test user, by the query under "Turning collection on in production". Each has been told directly, with the message below, before collection is turned on. This replaces the 30-day email only while every account is a test user.
- [ ] **FR-026**: after the public opening, any further change that matters follows the policy's 30-day email promise.
- [ ] **FR-028**: a lawyer has reviewed the Device Evidence section and the basis for collection before the public opening. Ask in particular about section 3's "We do not rely on consent for anything" and the heading of section 6, "No tracking", which this feature leaves in place.

## Message to test users (draft)

> **Subject: CrowdPoll will record a device fingerprint when you sign in and vote**
>
> Before CrowdPoll opens to the public we want to be able to uphold its rule of one account per person, so we are starting to keep a record of the devices accounts use.
>
> When you sign in and each time you vote, we will record your account, the time, which poll for a vote, and two scrambled codes made from characteristics of your browser and device. We will not record how you voted. The records stay on CrowdPoll's own servers and are not shared with anyone. They are kept for about 4 months at most, and are deleted at once if you delete your account.
>
> Nothing changes in how you use the site, except that you will be asked to accept the updated Terms of Service on your next visit. A shared device is normal, and a match alone does not mean anyone broke the rule.
>
> The details are at https://crowdpoll.vote/privacy#device-evidence. Questions are welcome at privacy@crowdpoll.vote.
