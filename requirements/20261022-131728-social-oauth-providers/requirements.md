Start a new spec for these requirements called `20261022-131728-SOCIAL-OAUTH-PROVIDERS`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

We are now ready to apply for Social OAuth integration.
We will initial seek approval from:
- Google
- Microsoft
- Apple
- Amazon

This requirement is for research on how to do this for the four major providers: Google, Microsoft, Apple, and Amazon.  

It is also required to analyze the CrowdPoll webapp to ensure that it will satisfy the requirements of those providers.
## Decisions

- **Decision (AM1), scope**: this feature covers the research, the analysis and the code changes that make CrowdPoll ready for the four providers; switching production to OAuth is a separate configuration step after approval.  
- **Decision (IN1), providers**: Google, Microsoft, Apple and Amazon; Facebook and GitHub are removed from the code (they can be added later the same way).  
- **Decision (NC1), sign-in modes**: email-link sign-in stays; a third mode offers the email link and the provider buttons together, so nobody is locked out and existing testers keep signing in while they link providers.  
- **Decision (NC2), identity**: the developer accounts are registered as an organization, CrowdPoll, obtaining a D-U-N-S number first.  
- **Decision (UA1), origin**: a required `ENV_PUBLIC_ORIGIN` (`https://crowdpoll.vote` in production, `http://localhost:8080` in the templates), validated by `loadConfig` and passed to BetterAuth as `baseURL`; every redirect URI is `<ENV_PUBLIC_ORIGIN>/api/auth/callback/<provider>`.  
- **Decision (UA2), existing accounts**: a social sign-in links automatically to the account with the same email key when the provider reports the email as verified and is trusted (Google, Microsoft, Apple); Amazon is not trusted for linking until its email is confirmed verified; otherwise a new account is created.  
- **Decision (UA3), Apple relay addresses**: a "Hide My Email" address is stored as given and treated as an ordinary address; `mail.crowdpoll.vote` is registered with Apple's private email relay (SPF and DKIM); the allowlist and admin lists keep working by address; the Privacy Policy says a relay address is stored as given.  
- **Decision (UA4), buttons**: one button per provider following its official guidelines (logo, wording, light and dark variants), in the order Google, Apple, Microsoft, Amazon, each starting the flow with `POST /api/auth/sign-in/social`; the logos are served by CrowdPoll.  
- **Decision (RS1), Google**: register with the basic scopes only (`openid`, `email`, `profile`), publish the consent screen to production, verify `crowdpoll.vote` in Google Search Console.  
  Procedure: Google Cloud project → OAuth consent screen (name CrowdPoll, support email, homepage `https://crowdpoll.vote/`, privacy `https://crowdpoll.vote/privacy`, terms `https://crowdpoll.vote/terms`, authorized domain `crowdpoll.vote`) → audience External, In production → OAuth client "Web application", redirect URI `https://crowdpoll.vote/api/auth/callback/google`.  
- **Decision (RS2), Microsoft**: register for personal and work accounts and complete publisher verification through the Microsoft Cloud Partner Program.  
  Procedure: Microsoft Entra admin center → App registrations → New registration ("any organizational directory and personal Microsoft accounts"), Web redirect URI `https://crowdpoll.vote/api/auth/callback/microsoft` → client secret (renew before it expires) → publisher domain `crowdpoll.vote` → associate the verified Partner ID.  
- **Decision (RS3), Apple**: enrol in the Apple Developer Program (organization), create an App ID with Sign in with Apple, a Services ID for `crowdpoll.vote` with the Return URL `https://crowdpoll.vote/api/auth/callback/apple`, serve the domain-association file at `/.well-known/apple-developer-domain-association.txt`, create a Sign in with Apple private key, and register `mail.crowdpoll.vote` for the private email relay.  
  The server signs the client-secret JWT itself from `ENV_OAUTH_APPLE_CLIENT_ID`, `ENV_OAUTH_APPLE_TEAM_ID`, `ENV_OAUTH_APPLE_KEY_ID` and `ENV_OAUTH_APPLE_PRIVATE_KEY` (a secret), so it never expires unnoticed.  
- **Decision (RS4), Amazon**: register a Login with Amazon security profile (privacy notice `https://crowdpoll.vote/privacy`, Allowed Return URL `https://crowdpoll.vote/api/auth/callback/amazon`), and add Amazon through BetterAuth's `generic-oauth` plugin (authorize `https://www.amazon.com/ap/oa`, token `https://api.amazon.com/auth/o2/token`, profile `https://api.amazon.com/user/profile`).  
- **Decision (RS5), readiness checklist**: the gaps the analysis found become this feature's functional requirements:  
  - redirect URIs on the production origin (UA1);  
  - working provider buttons;  
  - the Google, Microsoft, Apple and Amazon providers;  
  - Apple's domain-association file under `/.well-known/`;  
  - Apple's private relay registration for `mail.crowdpoll.vote`;  
  - provider-branded buttons;  
  - account linking (UA2).  
  Already met: HTTPS on `crowdpoll.vote`, a public homepage that describes the app, `/privacy` (lawyer review open), `/terms`, account deletion.  
  The registrations themselves are operator steps, recorded as procedures.  
- **Decision (UA5), credentials**: provider settings are read by `loadConfig`.  
  A provider is on when its settings are complete; a partial set stops the app at start-up; startup logs which providers are on, never a secret.  
  The secrets (each provider's client secret, Apple's private key) are encrypted App Platform variables.  
- **Decision (UA6), reviewers**: for each submission that needs one, a dedicated review account's address is added to `ENV_ALLOWED_EMAILS`, and its sign-in steps go into the submission notes.  
