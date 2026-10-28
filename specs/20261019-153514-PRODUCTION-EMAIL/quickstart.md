# Quickstart: Production Email

How to set up and validate the feature. Hand-done setup lives in the requirements document; this guide links to it rather than
copying it (FR-023).

## 1. One-time setup (by hand, already done on 2026-10-20 unless noted)

| Step | Where | Status |
|---|---|---|
| SES identity, DKIM, MAIL FROM, DMARC, sandbox test, suppression list, IAM sender, production access, quota | `requirements/20261019-153514-production-email/requirements.md`, AWS Setup Instructions, Decision (RS8) steps 1–12 | Done (RS13, RS16). Repeat the sandbox test once from `no-reply@` (RS13). |
| Inbound forwarding for `support@`, `postmaster@`, `abuse@`, `dmarc@` and the AWS contact address | same file, Decision (RS10) | Done; add the alias for the AWS contact address if missing (RS16). Fix the space in `_dmarc.crowdpoll.vote`'s `rua=mailto: dmarc@…`. |
| Bounce and complaint alarms | same file, RS8 step 15 and Decision (RS17) | To do. |
| Email logo | `npx tsx devScripts/favicon-ico.ts` writes `src/public/email-logo.png` beside `favicon.ico` | To do, once, after the script change. |

The IAM sender's policy (`crowdpoll-ses-sender`, policy `sesSendEmail`) must allow `ses:SendRawEmail` as well as `ses:SendEmail`,
because nodemailer sends raw MIME (TWEAKS04, TWEAKS05); RS8 step 10 lists only the second. Before the first deployment, its JSON is:

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

## 2. Deployment settings (RS8 step 13)

In `.do/app.yaml` (research R2, R3; `data-model.md` Configuration):

- `ENV_EMAIL_TRANSPORT=ses`
- `ENV_SES_REGION=ca-central-1`
- `ENV_SES_ACCESS_KEY_ID` and `ENV_SES_SECRET_ACCESS_KEY`: `type: SECRET`, the `crowdpoll-ses-sender` access key
- `ENV_EMAIL_FROM=CrowdPoll <no-reply@mail.crowdpoll.vote>` (replaces `ENV_SMTP_FROM`)
- `ENV_EMAIL_SEND_TIMEOUT` left at its default (10 s)

Local development also sends through SES (TWEAKS01), from its own region and sender (TWEAKS03): the templates set
`ENV_EMAIL_TRANSPORT=ses`, `ENV_SES_REGION=us-east-1` and `ENV_EMAIL_FROM=CrowdPoll <no-reply@dev.mail.crowdpoll.vote>`;
put the development sending key (`crowdpoll-ses-dev`, §6) into `ENV_SES_ACCESS_KEY_ID` and `ENV_SES_SECRET_ACCESS_KEY`.
Update your git-ignored `launch.json` and `launch-dev.ps1` from the `.example` templates: drop the `ENV_SMTP_*` entries and add the SES ones.
Development mail is real mail, so send only to your own addresses.

## 3. Automated checks

```
npm test
```

Expected: all suites pass (SC-007), including `config.test.ts`, `mailer.test.ts`, `honeypot.test.ts`, `signin-binding.test.ts`,
`email-key.test.ts`, `openapi-contract.test.ts` and `pages.test.ts` (research R12). No message leaves the machine.

## 4. Local checks (development, through SES)

1. **Refusal to start** (SC-005, US5): start with `ENV_EMAIL_TRANSPORT=ses` and no `ENV_SES_*`. The app exits with
   `Invalid ENV_SES_REGION …` (or the first missing one).
2. **Layout** (US2): request a sign-in link to your own mailbox; the HTML shows the logo bar, heading, button, the link written out and
   the footer naming `support@crowdpoll.vote`; the text tab shows the same content. The logo loads from `ENV_EMAIL_ASSET_ORIGIN`
   (`https://crowdpoll.vote` in the templates), so it shows once production serves `/email-logo.png` (TWEAKS06).
3. **Hidden field** (US3): in the browser's devtools, fill `homepage` on the login form and submit; the page says "Check your
   inbox", and no message arrives; the server log says `Honeypot filled`.
4. **Same browser** (US4): request a link and open it in the same browser: you are signed in at once.
5. **Other browser** (US4): request a link, copy it into a private window: the confirmation page names your address and the
   request time. **Not now** creates no session; **Sign in** signs you in; the link then no longer works anywhere.
6. **Plus-tag** (FR-026): with an account `you@gmail.com`, create an account as `y.ou+test@gmail.com`: no new account; the sign-in
   link arrives for `you@gmail.com`.
7. **Log** (SC-006): each send logs `[mailer] Sent <type> to y•••@<domain> (message id …)`; no full address, link or token.

## 5. Production checks (after deployment)

1. **Inbox placement** (SC-001): request a sign-in link for test mailboxes at Gmail, Outlook and Yahoo. Each lands in the inbox,
   not spam, within 60 seconds, and signs in.
2. **Authentication** (SC-002): in each, view the original message: `spf=pass` with `smtp.mailfrom=…@bounce.mail.crowdpoll.vote`,
   `dkim=pass` with `header.i=@mail.crowdpoll.vote`, `dmarc=pass`. Repeat for the other three messages.
3. **Tracing** (SC-006): find the message id in the App Platform log, and look it up in SES.
4. **Later** (RS4): once the DMARC reports at `dmarc@crowdpoll.vote` show only SES, move both DMARC records to `p=quarantine`.

## 6. Development sending setup (by hand, TWEAKS03)

Development uses SES in `us-east-1`, in the production account, sending as `no-reply@dev.mail.crowdpoll.vote` and left in that
region's sandbox, so it can only mail verified inboxes. Production (`ca-central-1`, `mail.crowdpoll.vote`,
`crowdpoll-ses-sender`) is not touched. If the SES console's region list offers Canada West (`ca-west-1`), it may be used instead,
to keep the mail in Canada: put it wherever `us-east-1` appears below and in the templates.

1. **Region**: in the console's region selector pick US East (N. Virginia), `us-east-1`, and open Amazon SES.
2. **Domain identity**: Identities → Create identity → Domain `dev.mail.crowdpoll.vote`; Easy DKIM, `RSA_2048_BIT`;
   Custom MAIL FROM `bounce.dev.mail.crowdpoll.vote`, "Use default MAIL FROM domain" on MX failure.
3. **DNS** (DigitalOcean, `crowdpoll.vote`): the three DKIM CNAMEs SES shows (`<token>._domainkey.dev.mail` →
   `<token>.dkim.amazonses.com`); `MX bounce.dev.mail` → `feedback-smtp.us-east-1.amazonses.com`, priority 10;
   `TXT bounce.dev.mail` → `v=spf1 include:amazonses.com ~all`. No DMARC record: `_dmarc.crowdpoll.vote` covers the subdomain.
4. **Verification**: wait for Verified, DKIM Successful and MAIL FROM Success (up to 72 hours);
   `nslookup -type=MX bounce.dev.mail.crowdpoll.vote 8.8.8.8` shows the MX record.
5. **Recipients**: in `us-east-1`, Create identity → Email address for each of your own test inboxes, and click each verification
   link. Do not request production access.
6. **IAM user**: Users → Create user `crowdpoll-ses-dev`, no console access, with one inline policy, `ses-dev-send-us-east-1`
   (JSON tab; `<account-id>` is the 12-digit id in the account menu):

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

   `identity/*` is needed because, in the sandbox, SES also checks the verified recipient identities.
   `ses:SendRawEmail` is needed because nodemailer sends the MIME it builds as raw content, which SES authorizes as a raw send
   (TWEAKS04); without it every send fails with `AccessDeniedException … ses:SendRawEmail`. The `StringLike` accepts the bare
   address and the address after the display name nodemailer passes (`CrowdPoll <no-reply@dev.mail.crowdpoll.vote>`, TWEAKS05).
   Production's `crowdpoll-ses-sender` needs the same two actions (§1).
7. **Access key**: the user → Security credentials → Create access key → "Application running outside AWS"; keep it in a password
   manager, never in the repository.
8. **Local files**: in the git-ignored `.vscode/launch.json` and `devScripts/launch-dev.ps1`, set `ENV_SES_REGION=us-east-1`, the
   two key values, and `ENV_EMAIL_FROM=CrowdPoll <no-reply@dev.mail.crowdpoll.vote>`.
9. **Test**: sign in locally and view the original message: `DKIM: PASS with domain dev.mail.crowdpoll.vote`,
   `SPF: PASS with bounce.dev.mail.crowdpoll.vote`, `DMARC: PASS`.
10. **Separation**: a send with the dev key to `--region ca-central-1`, or from another address, fails with
    `AccessDeniedException`; `crowdpoll-ses-sender`'s policy names only the `ca-central-1` identity.

The production CloudWatch alarms watch `ca-central-1` only, so development bounces never trip them. IAM, billing and the root user
stay shared with production.
