# Provider Registration Procedures (FR-019)

Operator steps, done once per provider, as the organization **CrowdPoll** (NC2). Sources for every step are in
`requirements/20261022-131728-social-oauth-providers/requirements-report.md` RS1–RS4.
The values CrowdPoll serves: homepage `https://crowdpoll.vote/`, privacy `https://crowdpoll.vote/privacy`, terms
`https://crowdpoll.vote/terms`, support `support@crowdpoll.vote`.
Logos: the square icon `src/public/email-logo.png` (96 × 96, transparent) where a provider asks for a square logo
(Google, Microsoft), and the banner `src/public/consent-banner.png` (icon and word mark, 733 × 100, transparent) for
Amazon's consent logo. The banner is the header's own SVG (`SITE_HEADER_MARKUP` in `app.js`) rendered once with headless
Edge at 100 px high; render it again if the header's logo changes.

## P0. Before any provider

1. CrowdPoll has its D-U-N-S number (needed for Apple's organization enrolment, P3).
2. Open the site before any provider is configured or submitted for review: delete `ENV_ALLOWED_EMAILS` in the App
   Platform console (or leave it empty) and redeploy. Start-up then logs `[auth] Sign-up allowlist off`, and any address
   can sign in. This is needed because provider reviewers sign in with their own accounts, which are not on the list:
   while the list is set, their sign-in is refused (`/login?error=not-launched`) and the review fails.
3. Verify `crowdpoll.vote` in Google Search Console (a DNS TXT record).
4. Deploy this feature with `ENV_PUBLIC_ORIGIN=https://crowdpoll.vote` and `ENV_SIGNIN_METHOD=native`, so the callback
   routes exist before the providers test them; switch to `both` only when at least one provider is configured.

## P1. Google (RS1)

1. Google Cloud console → new project "CrowdPoll".
2. **The support email's account.** Branding's User support email offers only the signed-in account and the Google Groups
   it manages, so `support@crowdpoll.vote` must itself be a Google Account on the project:
   1. In a private window: Create account → For my personal use → "Use my current email address instead" →
      `support@crowdpoll.vote`; the code arrives through ImprovMX. The account has no Gmail mailbox: never open Gmail
      with it, which asks for phone verification; its mail keeps arriving through ImprovMX.
   2. As the project's owner: **IAM & Admin → IAM → Grant access** → `support@crowdpoll.vote`, role Basic → Editor
      (active at once) or Owner (active only once the emailed invitation is accepted in a window signed in as
      `support@crowdpoll.vote` alone).
   3. Do step 3 in a private window signed in only as `support@crowdpoll.vote`: Google acts for whichever account is
      signed in.
3. **Google Auth Platform → Branding**: app name CrowdPoll, User support email `support@crowdpoll.vote`, logo (optional;
   `email-logo.png`), homepage, privacy and terms URLs above, authorized domain `crowdpoll.vote`, developer contact.
4. **Audience**: External; **Publish app** → In production.
5. **Data access**: scopes `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` only.
6. **Clients → Create client**: Web application; authorized JavaScript origin `https://crowdpoll.vote`; authorized
   redirect URI `https://crowdpoll.vote/api/auth/callback/google`.
7. Set `ENV_OAUTH_GOOGLE_CLIENT_ID` and `ENV_OAUTH_GOOGLE_CLIENT_SECRET` (secret: encrypted) in App Platform.

## P2. Microsoft (RS2)

1. Microsoft Entra admin center (a free tenant) → **App registrations → New registration**: name CrowdPoll; supported
   account types "Accounts in any organizational directory and personal Microsoft accounts"; redirect URI (Web)
   `https://crowdpoll.vote/api/auth/callback/microsoft`.
2. **Branding & properties**: logo (`email-logo.png`), homepage, terms and privacy URLs; **publisher domain** `crowdpoll.vote` (DNS or
   `/.well-known/microsoft-identity-association.json` verification).
3. **Certificates & secrets → New client secret** (24 months); note its expiry in the operator calendar.
4. **API permissions**: `openid`, `email`, `profile` (Microsoft Graph, delegated); no admin consent needed.
5. Enrol CrowdPoll in the **Microsoft AI Cloud Partner Program**, complete its verification, then **Branding →
   Publisher verification → Add Partner ID**.
6. Set `ENV_OAUTH_MICROSOFT_CLIENT_ID` (Application (client) ID) and `ENV_OAUTH_MICROSOFT_CLIENT_SECRET`.

## P3. Apple (RS3)

1. Enrol in the **Apple Developer Program** as an organization (US$99/year), with CrowdPoll's D-U-N-S number.
2. **Identifiers → App IDs**: register an App ID (e.g. `vote.crowdpoll.app`) with **Sign in with Apple** enabled.
3. **Identifiers → Services IDs**: register `vote.crowdpoll.web`; enable Sign in with Apple, configure: primary App ID
   from step 2, domain `crowdpoll.vote`, Return URL `https://crowdpoll.vote/api/auth/callback/apple`.
4. Download Apple's domain-association file, commit it as
   `src/public/.well-known/apple-developer-domain-association.txt`, deploy, then press **Verify**.
5. **Keys**: create a key with Sign in with Apple (linked to the App ID); download the `.p8` once; note the Key ID and
   the Team ID.
6. **Services → Sign in with Apple for Email Communication → Configure**: add the email source
   `mail.crowdpoll.vote` (already SPF- and DKIM-signed by SES; RS3).
7. Set `ENV_OAUTH_APPLE_CLIENT_ID=vote.crowdpoll.web`, `ENV_OAUTH_APPLE_TEAM_ID`, `ENV_OAUTH_APPLE_KEY_ID` and
   `ENV_OAUTH_APPLE_PRIVATE_KEY` (the `.p8` contents, encrypted; line breaks as `\n`).

## P4. Amazon (RS4)

1. Amazon Developer Console → **Login with Amazon → Create a New Security Profile**: name CrowdPoll, description,
   **Consent Privacy Notice URL** `https://crowdpoll.vote/privacy`, **Consent Logo Image** `src/public/consent-banner.png`
   (Amazon shows it 50 px high).
2. **Web Settings**: Allowed Origins `https://crowdpoll.vote`; **Allowed Return URLs**
   `https://crowdpoll.vote/api/auth/oauth2/callback/amazon` (research R6: the generic OAuth plugin's path).
3. Set `ENV_OAUTH_AMAZON_CLIENT_ID` and `ENV_OAUTH_AMAZON_CLIENT_SECRET`.

## P5. Development registrations

Each provider can carry a second redirect URI for local testing: `http://localhost:8080/...` (Google, Microsoft and
Amazon allow `http://localhost`; Apple requires HTTPS and a real domain, so test Apple on the deployed site).
