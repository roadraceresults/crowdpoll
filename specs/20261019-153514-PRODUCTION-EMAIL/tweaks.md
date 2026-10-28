# Overview: `specs/20261019-153514-PRODUCTION-EMAIL`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261019-153514-PRODUCTION-EMAIL` |
| Tweak file created | 2026-10-20 18:40 |
| Last updated | 2026-10-21 13:24 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAKS01 Use SES for sending Dev Emails  
[X] Resolved  
[ ] Run Tests  
We will no longer be using Mailtrap.
All development emails will now be sent through Amazon SES.
Keep the Mailtrap code in place for reference, but it will no longer be used for sending development emails.
Remove any Mailtrap-specific configuration from the development environment.
Ensure that the Amazon SES configuration is correctly set up for development emails.

### RECOMMENDATION

Point the development templates at SES and keep the SMTP transport in the code, unused.  
- `launch.json.example` (all 7 configurations) and `devScripts.example/launch-dev.ps1`: remove the four Mailtrap `ENV_SMTP_*` entries;  
  set `ENV_EMAIL_TRANSPORT` to `ses`, add `ENV_SES_REGION` = `ca-central-1` and placeholders for `ENV_SES_ACCESS_KEY_ID` / `ENV_SES_SECRET_ACCESS_KEY`.  
- `devScripts.example/setup-dev.ps1`: its comment and closing message ask for the SES development key instead of Mailtrap credentials.  
- `src/config.ts` and `src/email/mailer.ts` are unchanged: the code default stays `smtp`, so the Mailtrap/SMTP path and the console fallback remain for reference, and the test harness (which sets no transport) keeps working;  
  a development machine sends through SES only because its launch files say `ses`, and its sends fail until the placeholder key is replaced with a real one.  
- Tests (written, not run, since Run Tests is empty): `tests/config.test.ts` checks that both templates set `ENV_EMAIL_TRANSPORT` to `ses` with `ENV_SES_REGION` `ca-central-1` and carry no `ENV_SMTP_*` entry.  
- Artifacts: `spec.md` FR-003 and User Story 5 scenario 2;  
  `plan.md` (Summary, Target Platform), `research.md` R2, `quickstart.md` §2 and §4, `data-model.md` Configuration;  
  `README.md`, `ARCHITECTURE.md` and `CLAUDE.md` where they say development uses Mailtrap.  
- Advice, not code: use a separate send-only IAM user for development (e.g. `crowdpoll-ses-dev`, same policy as `crowdpoll-ses-sender`), so a leaked dev key never touches production's;  
  development mail is real mail, so send only to your own addresses.  
- This changes requirement UA1 ("development keeps the Mailtrap sandbox") in `requirements/20261019-153514-production-email/requirements.md`, which is not edited unasked.  

2026-10-20 18:44  

### TWEAKS ACCEPTED

Development now sends through Amazon SES;  
the Mailtrap/SMTP path stays in the code for reference, unused by the templates.  
- `launch.json.example` (7 configurations) and `devScripts.example/launch-dev.ps1`: the four `ENV_SMTP_*` entries are gone;  
  `ENV_EMAIL_TRANSPORT` is `ses`, with `ENV_SES_REGION` `ca-central-1` and placeholders for the two `ENV_SES_*` keys.  
- `devScripts.example/setup-dev.ps1`: the comment and the closing message ask for the SES development key.  
- `src/config.ts`, `src/email/mailer.ts`: unchanged (default `smtp`, kept for reference).  
- Tests: `tests/config.test.ts` gains "development templates send through SES and carry no Mailtrap settings";  
  tests postponed (Run Tests not ticked): written, not run;  
  `tsc --noEmit` passes.  
- Artifacts: `spec.md` (FR-003, User Story 5 text and scenario 2), `plan.md` (Target Platform), `research.md` R2, `quickstart.md` §2 and §4, `data-model.md` Configuration;  
  `README.md`, `ARCHITECTURE.md`, `CLAUDE.md`.  
- Not edited: requirement UA1 in `requirements/20261019-153514-production-email/requirements.md` still says development keeps the Mailtrap sandbox.  
- To do by hand: update your git-ignored `.vscode/launch.json` and `devScripts/launch-dev.ps1` (drop `ENV_SMTP_*`, add the SES entries with a development key from a separate send-only IAM user).  

2026-10-20 18:46  

## TWEAKS02 Separate SES Dev AWS Account
[-] Resolved (accepted as-is)  (the next tweak will require same account, different region for dev)
[ ] Run Tests  

For fully separating development from production, we are going to create a separate AWS account or use a different region for the dev environment.  
Notes: 
```
This ensures that any issues or testing in the dev environment do not impact the production environment.  
Fully separating them: to separate dev from production completely, use a different AWS account or region for dev.  
Generate a separate IAM user and access key pair for development, scope it tightly. 
Keep the production pair only in DigitalOcean's encrypted app settings (.do/app.yaml already marks both as SECRET).
```

Please provide step-by-step instructions for setting up the separate SES dev AWS account.

### RECOMMENDATION

Two options; A is recommended.  

- **Option A** _(recommended)_: a separate AWS account for development, in the same region (`ca-central-1`), sending from its own subdomain `dev.mail.crowdpoll.vote` and left in the SES sandbox.  
  - Isolation: IAM users, keys, SES reputation, suppression list, sending quota and billing are all separate;  
    a leaked development key can reach nothing in production.  
  - The sandbox is the guard rail: development can only send to addresses verified in the dev account, so it can never mail a real user.  
  - The subdomain keeps development mail off `mail.crowdpoll.vote`'s reputation, and its headers show at a glance which environment sent it.  
  - Hand steps (written into `quickstart.md` as a new section on Accept):  
    1. In the production account, AWS Organizations → Create an organization (if there is none) → Add an AWS account → Create, named `crowdpoll-dev`, with a root email of its own (e.g. an ImprovMX alias such as `aws-dev@crowdpoll.vote`).  
    2. Open the new account through Switch role (`OrganizationAccountAccessRole`, the account id from Organizations);  
       for root access, use "Forgot password" on its root email, then turn on root MFA.  
    3. In the dev account, SES `ca-central-1` → Identities → Create identity → Domain `dev.mail.crowdpoll.vote`, Easy DKIM, `RSA_2048_BIT`;  
       Custom MAIL FROM `bounce.dev.mail.crowdpoll.vote`, "Use default MAIL FROM domain" on MX failure.  
    4. In DigitalOcean DNS for `crowdpoll.vote`, add the three DKIM CNAMEs SES shows, `MX bounce.dev.mail` → `feedback-smtp.ca-central-1.amazonses.com` (priority 10) and `TXT bounce.dev.mail` `v=spf1 include:amazonses.com ~all`;  
       no new DMARC record is needed, since `_dmarc.crowdpoll.vote` covers the subdomain.  
    5. Still in SES, create an Email address identity for each of your own test inboxes and click each verification link;  
       do not request production access.  
    6. IAM → Users → `crowdpoll-ses-dev`, no console access, with one inline policy allowing `ses:SendEmail` on `arn:aws:ses:ca-central-1:<dev-account-id>:identity/*` under the condition `ses:FromAddress` = `no-reply@dev.mail.crowdpoll.vote`;  
       then Security credentials → Create access key → "Application running outside AWS".  
    7. Put the key into your git-ignored `.vscode/launch.json` and `devScripts/launch-dev.ps1`, with `ENV_EMAIL_FROM` = `CrowdPoll <no-reply@dev.mail.crowdpoll.vote>`.  
    8. Sign in locally and check the message's headers: `DKIM: PASS with domain dev.mail.crowdpoll.vote`, `SPF: PASS with bounce.dev.mail.crowdpoll.vote`, `DMARC: PASS`.  
    9. In the production account, delete any development key or user made there (e.g. a `crowdpoll-ses-dev` created after TWEAKS01);  
       the production pair stays only in DigitalOcean's encrypted settings.  
    10. Optional: an AWS Budgets alert in the dev account.  
  - Code and files: the development templates' `ENV_EMAIL_FROM` becomes `CrowdPoll <no-reply@dev.mail.crowdpoll.vote>` (`launch.json.example`, 7 configurations, and `devScripts.example/launch-dev.ps1`);  
    `tests/config.test.ts` checks it (written, not run: Run Tests is empty);  
    `src/` is unchanged, and `.do/app.yaml` keeps `no-reply@mail.crowdpoll.vote`.  
  - Artifacts: `quickstart.md` (the steps above), `research.md` R2, `spec.md` FR-003, `data-model.md` Configuration;  
    `README.md` and `CLAUDE.md` where they describe the development key.  
  - <u>Pros</u>: full separation, as the requirement asks;  
    no way to mail real users from development.  
  - <u>Cons</u>: a second account to sign in to;  
    three more DKIM CNAMEs plus an MX and a TXT record;  
    each new tester's inbox must be verified first.  

- **Option B**: the same account, a different region (e.g. `us-east-1`), with the dev IAM user scoped to that region (`aws:RequestedRegion`) and identity.  
  - SES reputation, sandbox and suppression list are per region, so sending is separated;  
    the steps are A's 3 to 8 without the new account, with `us-east-1` in the MX target and the policy ARN, and `ENV_SES_REGION` = `us-east-1` in the templates.  
  - <u>Pros</u>: no second account.  
  - <u>Cons</u>: IAM, billing and the root user stay shared, so a mis-scoped policy can still reach production;  
    development mail leaves Canada.  

Either way this again touches requirement UA1 in `requirements/20261019-153514-production-email/requirements.md`, which is not edited unasked.  

2026-10-21 03:53  

### TWEAKS ACCEPTED

Resolution: accepted as-is by the developer (2026-10-21 03:55)  
No code, template, test or artifact was changed;  
the recommendation above stays as the record of the hand steps.  

2026-10-21 03:55  

## TWEAKS03 Dev SES In Another Region
[X] Resolved  
[ ] Run Tests  
Note:
```
The same account, a different region (e.g. `us-east-1`),  
with the dev IAM user scoped to that region (`aws:RequestedRegion`) and identity.  
  - SES reputation, sandbox and suppression list are per region, so sending is separated;  
    the steps are A's 3 to 8 without the new account, with `us-east-1` in the MX target and the policy ARN, and `ENV_SES_REGION` = `us-east-1` in the templates.  
  - <u>Pros</u>: no second account.  
  - <u>Cons</u>: IAM, billing and the root user stay shared, so a mis-scoped policy can still reach production;  
    development mail leaves Canada.  
```
Please provide step-by-step instructions for setting up the development environment in a different region within the same account.

### RECOMMENDATION

Development sends from SES `us-east-1`, in the production account, as `no-reply@dev.mail.crowdpoll.vote`, and stays in that region's sandbox.  
If the SES console's region list offers Canada West (Calgary, `ca-west-1`), use it instead to keep the mail in Canada;  
put that region wherever `us-east-1` appears below.  
Production (`ca-central-1`, `mail.crowdpoll.vote`, `crowdpoll-ses-sender`) is not touched.  

Hand steps:  

1. **Region**: in the AWS console's region selector pick US East (N. Virginia), `us-east-1`, then open Amazon SES.  
2. **Domain identity**: Identities → Create identity → Domain `dev.mail.crowdpoll.vote`;  
   Easy DKIM, `RSA_2048_BIT`;  
   Custom MAIL FROM `bounce.dev.mail.crowdpoll.vote`, "Use default MAIL FROM domain" on MX failure.  
3. **DNS** (DigitalOcean, domain `crowdpoll.vote`):  
   - the three DKIM CNAMEs SES shows (`<token>._domainkey.dev.mail` → `<token>.dkim.amazonses.com`);  
   - `MX bounce.dev.mail` → `feedback-smtp.us-east-1.amazonses.com`, priority 10;  
   - `TXT bounce.dev.mail` → `v=spf1 include:amazonses.com ~all`;  
   - no DMARC record: `_dmarc.crowdpoll.vote` covers the subdomain.  
4. **Wait for verification**: the identity Verified, DKIM Successful and MAIL FROM Success (minutes, up to 72 hours);  
   check with `nslookup -type=MX bounce.dev.mail.crowdpoll.vote 8.8.8.8`.  
5. **Recipients**: in `us-east-1`, Create identity → Email address for each of your own test inboxes, and click each verification link;  
   do not request production access, so development can never mail a real user.  
6. **IAM user** (IAM is global): Users → Create user `crowdpoll-ses-dev`, no console access;  
   add one inline policy, `ses-dev-send-us-east-1`:  
    - At the top of the policy editor, click **JSON** (next to **Visual**).
    - Replace everything there with the policy below. Put your 12-digit account id in place of `<account-id>`; it's in the account menu at the top right.
    - Click **Next**, name the policy `ses-dev-send-us-east-1`, then click **Create policy**.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SendAsDevSenderInUsEast1",
      "Effect": "Allow",
      "Action": "ses:SendEmail",
      "Resource": "arn:aws:ses:us-east-1:<account-id>:identity/*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "us-east-1",
          "ses:FromAddress": "no-reply@dev.mail.crowdpoll.vote"
        }
      }
    }
  ]
}
```
7. **Access key**: the user → Security credentials → Create access key → "Application running outside AWS";  
   save it in your password manager, never in the repository.  
8. **Local files**: in your git-ignored `.vscode/launch.json` and `devScripts/launch-dev.ps1` set `ENV_SES_REGION` = `us-east-1`, the two key values, and `ENV_EMAIL_FROM` = `CrowdPoll <no-reply@dev.mail.crowdpoll.vote>`.  
9. **Test**: sign in locally and open the message's headers;  
   expect `DKIM: PASS with domain dev.mail.crowdpoll.vote`, `SPF: PASS with bounce.dev.mail.crowdpoll.vote` and `DMARC: PASS`.  
10. **Check the fence**: with the dev key, `aws sesv2 send-email --region ca-central-1 …` must fail with `AccessDeniedException`;  
    and `crowdpoll-ses-sender`'s policy should name only the `ca-central-1` identity, so neither key can act in the other's region.  

Notes: the production CloudWatch alarms watch `ca-central-1` only, so development bounces never trip them;  
IAM, billing and the root user stay shared, the cost of not having a second account.  

- **Option A** _(recommended)_: the steps above, plus the files to match.  
  - `launch.json.example` (7 configurations) and `devScripts.example/launch-dev.ps1`: `ENV_SES_REGION` = `us-east-1`, `ENV_EMAIL_FROM` = `CrowdPoll <no-reply@dev.mail.crowdpoll.vote>`;  
  - `tests/config.test.ts`: the TWEAKS01 test also checks those two values (written, not run: Run Tests is empty);  
  - `quickstart.md`: a new section holding the steps;  
    `research.md` R2, `spec.md` FR-003, `data-model.md`, `README.md` and `CLAUDE.md` where they describe the development key;  
  - `src/` and `.do/app.yaml` unchanged.  
  - <u>Pros</u>: a fresh clone's templates match the setup, and the steps live in the feature's docs.  
  - <u>Cons</u>: the templates name a region and sender that exist only once the steps are done.  

- **Option B**: the steps only, recorded here, with no file changed (as TWEAKS02).  
  - <u>Pros</u>: nothing to review or commit.  
  - <u>Cons</u>: the templates keep `ca-central-1` and `no-reply@mail.crowdpoll.vote`, so a dev machine set up from them sends from the production region.  

This again touches requirement UA1 in `requirements/20261019-153514-production-email/requirements.md`, which is not edited unasked.  

2026-10-21 04:00  

### TWEAKS ACCEPTED

Option A: development sends from SES `us-east-1` as `no-reply@dev.mail.crowdpoll.vote`, in that region's sandbox;  
the setup is done by hand, following `quickstart.md` §6.  
- `launch.json.example` (7 configurations) and `devScripts.example/launch-dev.ps1`: `ENV_SES_REGION` = `us-east-1`, `ENV_EMAIL_FROM` = `CrowdPoll <no-reply@dev.mail.crowdpoll.vote>`.  
- `src/` and `.do/app.yaml`: unchanged (production stays `ca-central-1`, `no-reply@mail.crowdpoll.vote`).  
- Tests: `tests/config.test.ts`, the TWEAKS01 template test now also checks the region and sender, and that the production sender is absent;  
  tests postponed (Run Tests not ticked): written, not run;  
  `tsc --noEmit` passes.  
- Artifacts: `quickstart.md` §2 and a new §6 (the ten hand steps, with the IAM policy JSON), `spec.md` FR-003, `research.md` R2, `data-model.md` Configuration, `plan.md` Target Platform;  
  `README.md`, `CLAUDE.md`.  
- Not edited: requirement UA1 in `requirements/20261019-153514-production-email/requirements.md`.  
- To do by hand: `quickstart.md` §6 steps 1 to 10, and the same region, key and sender in your git-ignored launch files.  

2026-10-21 12:01  

## TWEAKS04 Dev SES Send Access Denied  
[X] Resolved  
[ ] Run Tests  
Error sending on Dev machine to sandbox:
[mailer] Failed to send create-account to d•••@crowdpoll.vote: AccessDeniedException: User 'arn:aws:iam::442426892613:user/crowdpoll-ses-dev' is not authorized to perform 'ses:SendRawEmail' on resource 'arn:aws:ses:us-east-1:442426892613:identity/dev.mail.crowdpoll.vote'

A screenshot of the Ses Dev Identities page showing the verified domain and MAIL FROM settings:
![SES Dev Identities](ses-dev-identities.jpg)

### RECOMMENDATION

The identities are fine (the screenshot, `dontTrack/ses-dev-identities.jpg`, shows `dev.mail.crowdpoll.vote` and every `devadmin`/`user` recipient Verified);  
the policy grants the wrong action.  
nodemailer's SES transport calls SES v2 `SendEmail` with `Content.Raw` (the MIME it builds), and AWS authorizes a raw send as `ses:SendRawEmail`, not `ses:SendEmail`.  
It also passes the From header with its display name (`CrowdPoll <no-reply@dev.mail.crowdpoll.vote>`) as `FromEmailAddress`, so an exact `StringEquals` on `ses:FromAddress` may not match.  

- Hand fix, development: IAM → Users → `crowdpoll-ses-dev` → the inline policy `ses-dev-send-us-east-1` → Edit → JSON:  
  - `"Action": ["ses:SendEmail", "ses:SendRawEmail"]`;  
  - the condition becomes `StringEquals` `aws:RequestedRegion` = `us-east-1` plus `StringLike` `ses:FromAddress` = `*no-reply@dev.mail.crowdpoll.vote*`;  
  - IAM changes take effect within seconds; no app restart is needed.  
- ⚠️ Hand fix, production, before `dev` is pushed: `crowdpoll-ses-sender` has only `ses:SendEmail` (requirements RS8 step 10), so production sign-in mail would fail the same way;  
  add `ses:SendRawEmail` to its policy, still on `arn:aws:ses:ca-central-1:<account id>:identity/mail.crowdpoll.vote` only.  
- Files: `quickstart.md` §6 step 6, the policy JSON and a note on why both actions are needed;  
  `src/` unchanged (the raw send is what lets nodemailer and the tests' `setTransport` stay as they are, research R1).  
- Not edited unasked: requirements RS8 step 10 in `requirements/20261019-153514-production-email/requirements.md` (and its line in `requirements-report.md`) still say only `ses:SendEmail`.  
- Tests: none; this is an IAM policy, not code.  

2026-10-21 12:51  

### TWEAKS ACCEPTED

The fix is an IAM policy change, made by hand;  
the repository now documents the right policy.  
- `quickstart.md` §6 step 6: the policy allows `ses:SendEmail` and `ses:SendRawEmail`, and matches `ses:FromAddress` with `StringLike` `*no-reply@dev.mail.crowdpoll.vote*`;  
  a note explains both, and that production's `crowdpoll-ses-sender` needs `ses:SendRawEmail` too.  
- `src/`: unchanged.  
- Tests: none (no code changed).  
- Not edited: requirements RS8 step 10 (`requirements.md`, and its line in `requirements-report.md`) still say only `ses:SendEmail`.  
- To do by hand: edit `ses-dev-send-us-east-1` on `crowdpoll-ses-dev` as in §6, retry the send;  
  and add `ses:SendRawEmail` to `crowdpoll-ses-sender` before `dev` is pushed.  

2026-10-21 12:51  

## TWEAKS05 Final SES IAM Policies  
[X] Resolved  
[ ] Run Tests  
The json record that is in the quickstart.md says:
```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "SendAsDevSenderInUsEast1",
         "Effect": "Allow",
         "Action": ["ses:SendEmail", "ses:SendRawEmail"],
         "Resource": "arn:aws:ses:us-east-1:<account-id>:identity/*",
         "Condition": {
           "StringEquals": { "aws:RequestedRegion": "us-east-1" },
           "StringLike": { "ses:FromAddress": "*no-reply@dev.mail.crowdpoll.vote*" }
         }
       }
     ]
   }
```

Please provide the updated JSON for the IAM policy reflecting the changes discussed in TWEAKS04 and TWEAKS05.  

Also, for Prod the policy,sesSendEmail, set for Identity crowdpoll-ses-sender is:
is
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "SendAsCrowdPollOnly",
            "Effect": "Allow",
            "Action": "ses:SendEmail",
            "Resource": "arn:aws:ses:ca-central-1:<account_id>:identity/mail.crowdpoll.vote",
            "Condition": {
                "StringEquals": {
                    "ses:FromAddress": "no-reply@mail.crowdpoll.vote"
                }
            }
        }
    ]
}
```

### RECOMMENDATION

Both policies get the two send actions and a sender match that allows for the display name.  
The development JSON in `quickstart.md` already carries the TWEAKS04 fix;  
this tightens its `*…*` wildcard to the two exact forms SES may compare, the bare address and `<address>` after a display name.  
- Development, `crowdpoll-ses-dev`, inline policy `ses-dev-send-us-east-1`:  

  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "SendAsDevSenderInUsEast1",
        "Effect": "Allow",
        "Action": ["ses:SendEmail", "ses:SendRawEmail"],
        "Resource": "arn:aws:ses:us-east-1:<account-id>:identity/*",
        "Condition": {
          "StringEquals": { "aws:RequestedRegion": "us-east-1" },
          "StringLike": {
            "ses:FromAddress": ["no-reply@dev.mail.crowdpoll.vote", "*<no-reply@dev.mail.crowdpoll.vote>"]
          }
        }
      }
    ]
  }
  ```

- Production, `crowdpoll-ses-sender`, policy `sesSendEmail` (account id as in your copy):  

  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "SendAsCrowdPollOnly",
        "Effect": "Allow",
        "Action": ["ses:SendEmail", "ses:SendRawEmail"],
        "Resource": "arn:aws:ses:ca-central-1:<account-id>:identity/mail.crowdpoll.vote",
        "Condition": {
          "StringLike": {
            "ses:FromAddress": ["no-reply@mail.crowdpoll.vote", "*<no-reply@mail.crowdpoll.vote>"]
          }
        }
      }
    ]
  }
  ```

  - Production keeps its one identity: out of the sandbox, SES checks only the sender identity, not the recipients.  
  - Neither pattern matches the other environment's sender, since `<no-reply@mail.` never appears in `no-reply@dev.mail.…`.  
- Files: `quickstart.md` §6 step 6 gets the development JSON;  
  §1 gets the production JSON under the IAM sender row, with `<account-id>` in place of the id.  
- Not edited unasked: requirements RS8 step 10 (as for TWEAKS04).  
- Tests: none (no code changed).  
- To do by hand: paste each JSON into its policy (IAM → Users → the user → the policy → Edit → JSON), then send a sign-in link from development;  
  production is proven by the first sign-in after deployment (quickstart §5).  

2026-10-21 13:02  

### TWEAKS ACCEPTED

Both policies are documented in their final form;  
the IAM changes themselves are made by hand.  
- `quickstart.md` §6 step 6: the development JSON matches `ses:FromAddress` with `StringLike` on `no-reply@dev.mail.crowdpoll.vote` and `*<no-reply@dev.mail.crowdpoll.vote>`.  
- `quickstart.md` §1: the production JSON for `crowdpoll-ses-sender` (`sesSendEmail`), with both send actions, the one `ca-central-1` identity and the same two-form sender match, `<account-id>` in place of the id.  
- `src/`: unchanged;  
  tests: none (no code changed).  
- Not edited: requirements RS8 step 10.  
- To do by hand: paste each JSON into its policy, then send a sign-in link from development.  

2026-10-21 13:03  

## TWEAKS06 Email Logo Missing In Dev  
[X] Resolved  
[ ] Run Tests  

The logo icon doesn't render when sent on the development environment.

The "Create Poll Account" email on dev has a reference to google.com as shown in the html below:
```html
<tr><td style="background:#2c6a46;padding:16px 24px"><img src="https://ci3.googleusercontent.com/meips/ADKq_NYiFexApqniYbyCdaOGQbumo-4Q3MulurZXAIqvtoTc_Ndqh52PrJCB7cyYWqm4l0ud5kKnDC6wATk=s0-d-e1-ft#http://localhost:8080/email-logo.png" width="48" height="48" alt="CrowdPoll" style="vertical-align:middle;border:0" class="CToWUd" data-bit="iit" jslog="138226; u014N:xr6bB; 53:WzAsMl0."><span style="vertical-align:middle;margin-left:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff">CrowdPoll</span></td></tr>
```
Here's a screenshot of how it appears in the email client:
![google in email](dontTrack/google-in-email.jpg)

### RECOMMENDATION

The Google address is not in CrowdPoll's mail;  
Gmail rewrites every image through its own proxy (`ci3.googleusercontent.com/meips/…#<original URL>`), and the part after `#` is what the app wrote: `http://localhost:8080/email-logo.png`.  
`layout()` in `src/email/templates.ts` takes the logo's origin from the link's origin, which on a development machine is `localhost`;  
Google's servers cannot reach it, so the image breaks.  
In production the origin is public, so the same code works there.  
(The screenshot also confirms that TWEAKS04 fixed sending: the message came from `no-reply@dev.mail.crowdpoll.vote`.)  

- **Option A** _(recommended)_: a new optional setting, `ENV_EMAIL_ASSET_ORIGIN`, the origin the logo is loaded from;  
  unset means the link's origin, as today, so production needs no change.  
  - `src/config.ts`: `emailAssetOrigin`, validated as an `http(s)` origin;  
    `src/email/templates.ts`: `layout()` takes the logo origin separately from the link;  
    `src/email/mailer.ts`: passes the setting through.  
  - The development templates set it to `https://crowdpoll.vote`, so development mail shows the deployed logo once production serves `/email-logo.png` (until then it is still broken).  
  - Tests (written, not run): `tests/mailer.test.ts` checks the logo uses the setting when set and the link's origin when not;  
    `tests/config.test.ts` checks the validation and the templates.  
  - Artifacts: `research.md` R6, `data-model.md` Configuration, `quickstart.md` §4, `CLAUDE.md` and `README.md` environment tables.  
  - <u>Pros</u>: one small setting, the same hosted image everywhere, nothing changes for production.  
  - <u>Cons</u>: development depends on the deployed site for its logo.  

- **Option B**: embed the logo in each message as an inline attachment (`cid:`), instead of hosting it.  
  - `templates.ts` uses `src="cid:email-logo"` and `mailer.ts` attaches `src/public/email-logo.png` to every message.  
  - <u>Pros</u>: works everywhere, without depending on any server, including offline development.  
  - <u>Cons</u>: reverses research R6 (a hosted logo);  
    every message grows by the image's size;  
    some clients show the logo as an attachment as well.  

- **Option C**: accept as-is: a development-only limitation, checked in production by quickstart §5.  
  - <u>Pros</u>: no change.  
  - <u>Cons</u>: development mail keeps a broken image, so the layout can only be judged in production.  

2026-10-21 13:18  

### TWEAKS ACCEPTED

Option A: a new optional setting, `ENV_EMAIL_ASSET_ORIGIN`, sets the origin the email logo loads from;  
unset, the logo uses the link's origin as before, so production is unchanged.  
- `src/config.ts`: `emailAssetOrigin`, validated as an `http(s)` origin with no path (a trailing slash is dropped).  
- `src/email/templates.ts`: the three link messages take an optional logo origin;  
  `src/email/mailer.ts`: passes the setting to all four messages.  
- `launch.json.example` (7 configurations) and `devScripts.example/launch-dev.ps1`: `ENV_EMAIL_ASSET_ORIGIN` = `https://crowdpoll.vote`.  
- Tests: `tests/mailer.test.ts` gains three (setting used, link origin when unset, change notice);  
  `tests/config.test.ts` gains one (validation) and the template test checks the new entry;  
  tests postponed (Run Tests not ticked): written, not run;  
  `tsc --noEmit` passes.  
- Artifacts: `research.md` R7, `data-model.md` Configuration, `quickstart.md` §4 step 2;  
  `README.md`, `CLAUDE.md` environment tables.  
- To do by hand: add `ENV_EMAIL_ASSET_ORIGIN=https://crowdpoll.vote` to your git-ignored launch files;  
  the logo appears once production serves `/email-logo.png`.  

2026-10-21 13:24  

## TWEAKS07 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  






