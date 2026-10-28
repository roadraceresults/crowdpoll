Start a new spec for these requirements called `20261019-153514-PRODUCTION-EMAIL`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

The current CrowdPoll webapp uses an email sandbox on mailtrap.io.  
We are ready to move to a production-ready email system.  
The webapp is deployed to Digital Ocean that doesn't offer mail server services.  
Therefore, we need to integrate an external email service provider for production use.

**Scope (NC1)**: this feature implements all five areas below, not only the research:  
the production email provider, the anti-bot check, the refined emails, the sending domain's SPF/DKIM/DMARC, and the single-user integrity rules, including address normalization and disposable-domain blocking.  

## Production-Ready Email
Please research suitable external email service providers that can be integrated with the CrowdPoll webapp for production use.  
Compare service providers based on features, pricing, reliability, and ease of integration with the CrowdPoll webapp.  
Provide pros and cons.

- **Provider (RS1)**: Amazon SES, for the lowest cost, on very reliable infrastructure.  
  The setup it needs (an AWS account, leaving the SES sandbox, IAM credentials, bounce and complaint handling) is listed under AWS Setup Instructions (RS8).  
- **Integration (AM1)**: CrowdPoll calls the provider's HTTPS API through a small transport behind the existing `send()` in `src/email/mailer.ts`, not SMTP.  
  DigitalOcean blocks SMTP ports 25, 465 and 587, and the HTTPS API is never blocked.  
- **Development and tests (UA1, IN1)**: development sends through SES too, in its own region and sandbox  
  (`us-east-1`, sender `no-reply@dev.mail.crowdpoll.vote`, its own send-only key `crowdpoll-ses-dev`; quickstart §6),  
  and tests keep the capture transport;  
  which channel is used is decided by environment variables alone;  
  the Mailtrap/SMTP path stays in the code, unused (TWEAKS01, TWEAKS03).  
- **Missing credentials (UA2)**: in production the app refuses to start without email credentials, as `config.ts` already does for the auth secret;  
  the console fallback stays for development only.  
  Production needs a clear signal, e.g. `NODE_ENV=production` or a new `ENV_EMAIL_REQUIRED=1` in `.do/app.yaml`.  
- **Bounces and failures (UA3)**: the provider's own suppression list handles bounces and complaints, with no webhook in this feature;  
  each send logs the provider's message id;  
  a send error keeps today's `502` reply.  

## Anti-Bot Mechanisms
Research, the best way of "proving" the user is not a robot.  
Consider researching CAPTCHA solutions, email verification methods, and other anti-bot mechanisms suitable for the CrowdPoll webapp.  
Provide pros and cons.

- **Decision (RS2)**: a honeypot field plus the existing rate limits, with no third-party CAPTCHA service.  
- **Where the check applies (UA5)**: the three endpoints that send email (create account, request login link, request email change), and not voting.  
  Votes already need a signed-in, mailbox-verified account and are limited per IP.  

## Current Email Analysis
To help us in refining our emails, please provide a detailed breakdown of the current emails that are sent by the CrowdPoll webapp.  
Provide where the email content is defined.  
Provide the current email templates or content used by the CrowdPoll webapp.  
Provide any relevant configuration files, settings and environment variables related to email delivery in the CrowdPoll webapp.  

- **Baseline (RS3)**: CrowdPoll sends four messages, all defined in `src/email/mailer.ts`:  
  1. `sendLoginLink`, "Your sign-in link": called from `src/auth/auth.ts` (BetterAuth's `sendMagicLink`), reached from `issueLoginLink` in `src/routes/api.ts`.  
  2. `sendCreateAccountInvitation`, "Create your account": called from `src/routes/api.ts` when an unknown address asks for a login link.  
  3. `sendEmailChangeVerification`, "Verify your new email address": called from `src/routes/api.ts` when a signed-in user asks to change their address.  
  4. `sendEmailChangeNotice`, "Your account email address was changed": called from `src/routes/api.ts` once the change is verified, sent to the old address.  
  No poll-related email exists today.  
  Section 2 of `requirements-report.md` holds each message's full text and every configuration value.  
- **Refining (AM3)**: in this feature the four messages get a shared branded HTML layout (logo, colours, footer) and reviewed wording.  
- **Replies (UA6)**: the messages stay no-reply, with no `Reply-To` header;  
  the branded layout's footer names a contact address instead, `support@crowdpoll.vote` (RS9).  

## Email Deliverability Best Practices
Research best practices for email deliverability, including SPF, DKIM, and DMARC configurations, to ensure that emails sent by the CrowdPoll webapp reach users' inboxes reliably.
Provide pros and cons for each approach.  

- **Decision (RS4)**: publish SPF, DKIM (2048-bit, from the provider) and DMARC for the sending domain, with a provider return-path subdomain for SPF alignment.  
  DMARC starts at `p=none` with aggregate reports and moves to `p=quarantine` once the reports show only CrowdPoll's provider.  
- **All three are required (AM2)**: SPF, DKIM and DMARC are complementary layers, not alternatives;  
  the pros and cons apply to the choices within them (the DMARC policy level, the sending subdomain).  
- **Sending domain (NC2)**: a sending subdomain of the app's own domain, e.g. `CrowdPoll <no-reply@mail.<app-domain>>`.  
  The app's domain is `crowdpoll.vote`, so the sender is `CrowdPoll <no-reply@mail.crowdpoll.vote>` (RS8).  

## Single User Integrity
Research techniques for ensuring that a single user does not create multiple accounts or perform actions that could compromise the integrity of the CrowdPoll webapp.  
Consider methods such as email verification, CAPTCHA, IP address tracking, and device fingerprinting.  
Provide pros and cons for each approach.  

- **Decision (RS5)**: OAuth-only sign-in (planned phase).  
  The developer's resolution: "this will be put off until after OAuth-only sign-in is implemented".  
- **Existing accounts (NC3)**: the rules apply to new sign-ups and email changes only;  
  existing accounts keep working unchanged, and a collision with one only refuses the new address.  

## Cookies Beyond `session_token`

Research request (RS6): how could cookies other than `session_token` help with this feature?  

- **Decision (RS6)**: one security cookie ties each sign-in link to the browser that requested it, with a "confirm on this device" fallback for a link opened elsewhere.  
  The cookie policy becomes "`session_token` plus strictly necessary security cookies", and the cookie banner stays informational, with its text updated to list the new cookie.  

## Success Criteria (UA4)

- A sign-in link sent to Gmail, Outlook and Yahoo test mailboxes lands in the inbox (not spam) within 60 seconds.  
- The sending domain passes SPF, DKIM and DMARC in a mail header check.  
- A request without a valid anti-bot token sends no email.  
- All existing tests pass.

## Additional Requirements (2026-10-19 7:34 PM)

### AWS Plan

Research which pricing plan of AWS would be most suitable for sending CrowdPoll.vote emails?  
1. Essentials
2. Pro
3. Enterprise
4. a la carte

- **Decision (RS7)**: stay on Essentials, the SES default: no monthly fee, $0.16 per 1,000 emails, with Virtual Deliverability Manager included.  
  It costs cents to a few dollars a month more than à la carte at CrowdPoll's volume, and its deliverability insights help with the inbox checks (UA4) and with tracing a missing link (UA3).  

### AWS Setup Instructions

Provide a checklist of steps required to set up AWS SES for sending CrowdPoll.vote emails.

- **Decision (RS8)**: the SES setup procedure, to be carried into the feature's quickstart.  
  Steps 1–12 are done by hand in AWS and DNS before any code ships;  
  steps 13–15 belong to the deployment.  
  All SES settings are per region, so every step uses one region.  
  1. **AWS account**: MFA on the root user, an administrator IAM identity for daily use, and an AWS Budget alarm (e.g. $10 a month).  
  2. **Region**: `ca-central-1` (Canada Central), nearest App Platform's `tor1`.  
  3. **Pricing plan**: Essentials (RS7), checked with `aws sesv2 get-account --query PricingAttributes`.  
  4. **Domain identity**: `mail.crowdpoll.vote`, with Easy DKIM and the `RSA_2048_BIT` key;  
     its DKIM CNAME records are published in the DNS of `crowdpoll.vote`.  
  5. **Custom MAIL FROM domain**: `bounce.mail.crowdpoll.vote`, "Use default MAIL FROM domain" on MX failure;  
     exactly one record `MX 10 feedback-smtp.ca-central-1.amazonses.com`, and `TXT "v=spf1 include:amazonses.com ~all"`.  
  6. **DMARC**: two TXT records, both `"v=DMARC1; p=none; rua=mailto:dmarc@crowdpoll.vote"`:  
     `_dmarc.mail.crowdpoll.vote` (the one SES suggests, which governs CrowdPoll's mail, with `rua=` added) and `_dmarc.crowdpoll.vote` (the root domain and every other subdomain).  
     `dmarc@crowdpoll.vote` is forwarded to Gmail by the inbound mail service (RS9, RS10);  
     it shares the organizational domain of `mail.crowdpoll.vote`, so no authorization record (RFC 7489 §7.1) is needed;  
     add `rua=` once RS10's test shows mail to `dmarc@` arriving;  
     in DigitalOcean the value is typed without the outer quotes.  
  7. **Verification**: the identity Verified, DKIM Successful and MAIL FROM Success (up to 72 hours).  
  8. **Sandbox test** (RS11, RS12): send from `no-reply@mail.crowdpoll.vote` to verified own addresses and to the SES mailbox simulator.  
     1. **Region.** In the SES console, check that the region menu (top right) says **Canada (Central)** `ca-central-1`.  
     2. **Verify a test address.** Configuration → **Identities** → **Create identity** → **Email address**, enter your own address (e.g. your Gmail), **Create identity**;  
        click the link AWS emails to it within 24 hours (check spam), then refresh until the status is **Verified**.  
        Repeat for an Outlook or Yahoo address if you have one (UA4).  
     3. **Open the send form.** **Identities** → click the name `mail.crowdpoll.vote` (not its checkbox) → **Send test email**.  
     4. **Fill it in.** Email format **Formatted**;  
        From-address `no-reply` (the `@mail.crowdpoll.vote` part is filled in);  
        Scenario **Custom** with your verified address as **Custom recipient**;  
        any subject and body;  
        no configuration set.  
        Choose **Send test email**.  
     5. **Check the headers.** In Gmail, open the message → ⋮ → **Show original**.  
        The summary shows `SPF: PASS with IP <an SES address>`, `DKIM: PASS with domain mail.crowdpoll.vote` and `DMARC: PASS`.  
        Below it, in `Authentication-Results`, `smtp.mailfrom=` ends in `@bounce.mail.crowdpoll.vote`;  
        one ending in `@…amazonses.com` means the custom MAIL FROM (step 5) is not verified yet.  
     6. **The simulator.** Send once more with each scenario **Success**, **Bounce** and **Complaint** (no recipient to type);  
        each must be accepted without an error.  
        Do not expect a notice by email or a change in the reputation metrics: simulator mail does not count toward the quota or the bounce and complaint rates, and is billed like any other mail.  
     7. **Sandbox limits.** At most 200 messages a day and 1 a second;  
        simulator sends do not use up the 200.  
     8. **Done when** the Custom message passed all three checks, and the three simulator sends were accepted.  
        Bounce handling is checked for real after production access, with the suppression list (step 9).  
  9. **Suppression list**: the account-level list suppresses both bounces and complaints (UA3).  
  10. **Sending credentials**: an IAM user (`crowdpoll-ses-sender`) allowed only `ses:SendEmail` and `ses:SendRawEmail` on `arn:aws:ses:ca-central-1:<account id>:identity/mail.crowdpoll.vote`, with `ses:FromAddress` limited to `no-reply@mail.crowdpoll.vote` (bare or after a display name), one access key, used only by the HTTPS API transport (AM1);  
      raw sending is needed because nodemailer sends the MIME it builds (IN2; TWEAKS04, TWEAKS05; the policy JSON is in quickstart §1).  
  11. **Production access** (RS15): in SES (`ca-central-1`) → **Get set up** → **Request production access**:  
      Mail type **Transactional**;  
      Website URL `https://crowdpoll.vote`;  
      Additional contacts, e.g. `support@crowdpoll.vote, postmaster@crowdpoll.vote` (forwarded, RS9), each an ImprovMX alias (RS10 step 2);  
      language English;  
      tick the Acknowledgement and **Submit request**.  
      The form has no description field;  
      AWS replies within 96 hours in an AWS Support Center case, and if it asks how the mail is used, the reply is the description under Describing the Messages for Production Access (RS15).  
      Granted on 2026-10-20 (RS16).  
  12. **Quota**: once approved, `aws sesv2 get-account --region ca-central-1` shows the daily quota and send rate;  
      on 2026-10-20 it showed 50,000 messages a day and 14 a second (RS16).  
  13. **DigitalOcean**: the region, access key id and secret access key as encrypted secrets in `.do/app.yaml`, and the sender `CrowdPoll <no-reply@mail.crowdpoll.vote>`;  
      variable names are settled by `/speckit-plan`, and the app refuses to start without them (UA2).  
  14. **Success criteria (UA4)**: Gmail, Outlook and Yahoo test sign-ins land in the inbox within 60 seconds, with `spf=pass`, `dkim=pass` and `dmarc=pass` in the headers.  
  15. **Monitor, then tighten**: watch the bounce and complaint rates on SES's Reputation metrics (a CloudWatch alarm on each);  
      once the DMARC reports show only SES, move `p=none` to `p=quarantine` (RS4).  
      The alarms, in `ca-central-1`, with no configuration set (RS17):  
      1. **Alarm topic.** SNS → Topics → **Create topic**, Standard, name `crowdpoll-ses-alarms`;  
         **Create subscription**, protocol Email, endpoint `support@crowdpoll.vote`, and confirm the link that arrives (forwarded by ImprovMX).  
      2. **Bounce alarm.** CloudWatch → Alarms → **Create alarm** → metric **SES** → Account metrics → `Reputation.BounceRate`, statistic Maximum, period 1 hour, threshold `> 0.04`, notify `crowdpoll-ses-alarms`.  
      3. **Complaint alarm.** The same for `Reputation.ComplaintRate`, threshold `> 0.0008`.  
         Both stay below the rates (about 5% and 0.1%) at which AWS reviews an account.  
      4. **Dashboards.** Watch SES → **Virtual Deliverability Manager** (included in Essentials, RS7) and **Reputation metrics** for trends.  
      Individual bounce and complaint notices are not delivered to anyone (they go to `no-reply@mail.crowdpoll.vote`);  
      the suppression list (step 9) still stops repeat sends to those addresses.  


## Additional Requirements (2026-10-19 10:07 PM)

### Inbound Mail at `crowdpoll.vote`

We are soon going to want inbound mail at `crowdpoll.vote`
so please add the step-by-step instructions for setting up inbound mail at `crowdpoll.vote`.
As well as configuring DMARC reporting to receive reports at `crowdpoll.vote`.

- **Decision (RS9)**: a forwarding service, ImprovMX, sends mail for `@crowdpoll.vote` on to an existing Gmail inbox.  
  The addresses are `dmarc@`, `postmaster@`, `abuse@` and `support@crowdpoll.vote`;  
  DMARC reports go to `dmarc@crowdpoll.vote` (RS8 step 6).  
  It is set up by hand in ImprovMX and DigitalOcean DNS, with no code;  
  the steps are under Inbound Mail Forwarding Setup (RS10).  
  Replying as `@crowdpoll.vote` is not needed (UA6) and is not set up.  

## Additional Requirements (2026-10-20 12:25 PM)

### Inbound Mail Forwarding Setup

For RS9, we have accepted:
"Recommendation C: a forwarding service (e.g. ImprovMX) that sends @crowdpoll.vote mail on to an existing Gmail inbox."
Provide step-by-step instructions for setting up the forwarding service.

- **Decision (RS10)**: the ImprovMX forwarding setup procedure, done by hand, to be carried into the feature's quickstart.  
  1. **Account and domain.** At improvmx.com, enter `crowdpoll.vote` and the Gmail address to forward to, and create the free account;  
     ImprovMX then shows the DNS records it expects and checks them.  
  2. **Aliases.** In the ImprovMX dashboard for `crowdpoll.vote`, add the aliases `dmarc`, `postmaster`, `abuse` and `support`, and one for each AWS account contact address at `@crowdpoll.vote` (RS16), each forwarding to the Gmail address;  
     leave the catch-all (`*`) off, so mail to any other address is refused rather than forwarded as spam.  
  3. **MX records.** In DigitalOcean, Networking → Domains → `crowdpoll.vote` → MX:  
     hostname `@`, mail server `mx1.improvmx.com`, priority `10`;  
     then hostname `@`, mail server `mx2.improvmx.com`, priority `20`.  
     These are the only MX records on `@`; the one on `bounce.mail` stays SES's.  
  4. **SPF record.** In DigitalOcean → TXT: hostname `@`, value `v=spf1 include:spf.improvmx.com ~all` (or the "Recommended Value" ImprovMX shows), without quotes.  
     Each host name has exactly one SPF record: if one already exists at `@`, merge the `include:` into it;  
     a record on another host name, such as `bounce.mail.crowdpoll.vote`'s `v=spf1 include:amazonses.com ~all`, is separate and is left unchanged (RS14).  
  5. **Check.** In ImprovMX, click "Check Again" until both MX and SPF show as valid (usually minutes, up to 24–48 hours);  
     `nslookup -type=MX crowdpoll.vote 8.8.8.8` should list the two ImprovMX servers.  
  6. **Test.** From a different mailbox than the forwarding target (Gmail can hide a message sent to itself), send to `dmarc@crowdpoll.vote` and `support@crowdpoll.vote`;  
     both arrive in Gmail, check spam, and appear in ImprovMX's log.  
     In Gmail, add a filter on `to:dmarc@crowdpoll.vote` that skips the inbox and labels the reports.  
  7. **DMARC reports.** Add `rua=mailto:dmarc@crowdpoll.vote` to both DMARC records (RS8 step 6);  
     check with `nslookup -type=TXT _dmarc.mail.crowdpoll.vote 8.8.8.8`.  
     Reports, about one a day from each large mailbox provider once real mail flows, arrive as zipped XML attachments.  
  8. **Limits.** The free plan allows 1 domain, 25 aliases and 500 forwarded messages a day;  
     watch ImprovMX's log for the cap, which DMARC reports and occasional support mail stay far below.  

## Additional Requirements (2026-10-20 12:46 PM)

### Sandbox Test Details

We need more details on how to complete step 8 of RS8:
"Test while still in the sandbox."

- **Decision (RS11)**: RS8 step 8 now holds the sandbox test as eight sub-steps.  

## Additional Requirements (2026-10-20 1:11 PM)

### Gmail's SPF Result in the Sandbox Test

For Step 5 of RS11 (Verify Custom MAIL FROM):
"Check the headers. In Gmail, open the message → ⋮ → Show original:
SPF: PASS with bounce.mail.crowdpoll.vote, DKIM: PASS with mail.crowdpoll.vote, and DMARC: PASS.
SPF showing amazonses.com means the custom MAIL FROM (step 5) is not verified yet."
The only difference is:
SPF:	PASS with IP 23.249.208.17 Learn more

Is this okay?

- **Decision (RS12)**: yes, it is a pass: Gmail's summary names the sending IP for SPF (`23.249.208.17` is in SES's range `23.249.208.0/20`);  
  the domain checked is `smtp.mailfrom=` in `Authentication-Results`, which must end in `@bounce.mail.crowdpoll.vote`.  
  RS8 step 8, sub-step 5, is worded this way.  

## Additional Requirements (2026-10-20 1:17 PM)

### Sandbox Test Headers

The developer pasted the full headers of the sandbox test message (subject `test02`, sent 2026-10-20 17:02:55 UTC) to be checked.  
The paste is summarized here without the recipient address, message ids and signatures:  
`From: noreply@mail.crowdpoll.vote`, sent through `d208-17.smtp-out.ca-central-1.amazonses.com` (`23.249.208.17`) over TLS 1.3;  
`Authentication-Results: dkim=pass header.i=@mail.crowdpoll.vote; dkim=pass header.i=@amazonses.com; spf=pass smtp.mailfrom=…@bounce.mail.crowdpoll.vote; dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=mail.crowdpoll.vote`;  
`Return-Path: <…@bounce.mail.crowdpoll.vote>`;  
a `multipart/alternative` body with plain-text and HTML parts.  

- **Decision (RS13)**: the sandbox test (RS8 step 8, Custom scenario) passed DKIM, SPF and DMARC on 2026-10-20, sent from SES `ca-central-1`.  
  The sender stays `no-reply@mail.crowdpoll.vote` (NC2);  
  the test is repeated once from `no-reply@` (it was sent from `noreply@`) before production access is requested (RS8 step 11).  

## Additional Requirements (2026-10-20 2:04 PM)

### SPF Record for the Root Domain

In RS10, Step 4:
"SPF record. In DigitalOcean → TXT: hostname @, value v=spf1 include:spf.improvmx.com ~all (or the "Recommended Value" ImprovMX shows), without quotes;
crowdpoll.vote must have only one SPF record, so if one already exists at @, merge the include: into it instead."
We currently have:
TXT  bounce.mail.crowdpoll.vote  v=spf1 include:amazonses.com ~all  3600 

We assume this is okay, but just want to make sure that we should add a new TXT record for the SPF configuration on the root domain (`@`).

- **Decision (RS14)**: yes, add the new TXT record at `@` (`v=spf1 include:spf.improvmx.com ~all`) and leave the `bounce.mail.crowdpoll.vote` record unchanged.  
  SPF records belong to one host name each (RFC 7208), and `crowdpoll.vote` had no TXT record on 2026-10-20;  
  RS10 step 4 now says so.  

## Additional Requirements (2026-10-20 2:55 PM)

### Describing the Messages for Production Access

Step 11 of RS8 says:
Request production access.
In SES → Get set up → Request production access, choose Transactional, give https://crowdpoll.vote, and up to four contact addresses.
Describe the four messages (RS3), that each is sent only at the user's request, the anti-bot honeypot and rate limits (RS2), and bounce handling by the suppression list (UA3).

Where do I describe the four messages.

- **Decision (RS15)**: the current form has no description field, so RS8 step 11 is reworded for it.  
  If AWS asks about the use case in its Support Center case, the reply is this description:  
  > CrowdPoll (https://crowdpoll.vote) is a polling web app with passwordless sign-in. SES sends only transactional mail from no-reply@mail.crowdpoll.vote, each message at the request of the person receiving it: (1) a sign-in link, when a user asks to sign in; (2) a create-account invitation, when an unknown address asks to sign in; (3) a verification link, when a signed-in user asks to change their email address; (4) a notice to the old address once that change is verified. We send no marketing or newsletter mail and use no purchased lists. Requests that send mail are protected by a honeypot field and per-client rate limits (2 requests per 15 minutes by default). Bounces and complaints are handled by the SES account-level suppression list, and we monitor the bounce and complaint rates with CloudWatch alarms. The domain uses DKIM (Easy DKIM, 2048-bit), SPF through a custom MAIL FROM domain, and DMARC with aggregate reports.  

  The sentence about CloudWatch alarms holds only once RS8 step 15's alarms exist.  
  AWS granted the request on 2026-10-20 without asking (RS16).  

## Additional Requirements (2026-10-20 3:01 PM)

### SES Account Status After Production Access

The developer ran `aws sesv2 get-account`, which responds with (the support case id and the additional contact address are left out here):
```json
{
    "DedicatedIpAutoWarmupEnabled": true,
    "EnforcementStatus": "HEALTHY",
    "ProductionAccessEnabled": true,
    "SendQuota": {
        "Max24HourSend": 50000.0,
        "MaxSendRate": 14.0,
        "SentLast24Hours": 3.0
    },
    "SendingEnabled": true,
    "SuppressionAttributes": {
        "SuppressedReasons": [
            "BOUNCE",
            "COMPLAINT"
        ]
    },
    "Details": {
        "MailType": "TRANSACTIONAL",
        "WebsiteURL": "https://crowdpoll.vote",
        "ContactLanguage": "EN",
        "AdditionalContactEmailAddresses": [
            "<one address at crowdpoll.vote>"
        ],
        "ReviewDetails": {
            "Status": "GRANTED",
            "CaseId": "<support case id>"
        }
    },
    "PricingAttributes": {
        "CurrentPlan": "ESSENTIALS"
    }
}
```

- **Decision (RS16)**: RS8 steps 3, 9, 11 and 12 are confirmed on 2026-10-20:  
  production access granted (Transactional, `https://crowdpoll.vote`), a quota of 50,000 messages a day and 14 a second, the Essentials plan, and the suppression list covering bounces and complaints.  
  The AWS account's contact address at `@crowdpoll.vote` gets its own ImprovMX alias forwarding to Gmail (RS10 step 2), so AWS's account notices are delivered;  
  the region is confirmed with `aws sesv2 get-account --region ca-central-1`.  
  The AWS setup is complete apart from RS8 steps 13–15, which belong to the deployment.  

## Additional Requirements (2026-10-20 3:17 PM)

### Monitor Email Sending

Please provide instructions for:
Monitor email sending
(Optional but recommended)
Configure SES event publishing to track your email sending.

- **Decision (RS17)**: no configuration set and no event publishing;  
  monitoring is RS8 step 15's two CloudWatch alarms on the account-level bounce and complaint rates, notifying `support@crowdpoll.vote` through the SNS topic `crowdpoll-ses-alarms`, and the Virtual Deliverability Manager and Reputation metrics dashboards.  
  Individual bounce and complaint notices are accepted as unread;  
  a configuration set can be added later as the identity's default, with no code change.  
