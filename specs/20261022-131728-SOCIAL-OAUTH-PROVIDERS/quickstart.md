# Quickstart: Social Sign-In

## 1. Automated checks

```sh
npm test
npm run build
```

The suite covers, without contacting any provider: the settings rules (complete / partial / none), the three modes'
routes (contracts/api.md A4), the start routes returning a provider URL, a stubbed callback for each provider creating
an account, linking to an existing account by email key, the allowlist refusal, the error messages on the Login card,
the Apple client-secret JWT (claims and signature verified with the public key), and the domain-association route.

## 2. Local check with real providers (Google, Microsoft, Amazon)

1. Register a development client for each (contracts/provider-setup.md P5) with the `http://localhost:8080` redirect URIs.
2. In `devScripts/launch-dev.ps1`: `ENV_PUBLIC_ORIGIN=http://localhost:8080`, `ENV_SIGNIN_METHOD=both`, the provider
   settings, and `ENV_ALLOWED_EMAILS` empty (as the template carries it), so any provider address can sign in.
3. `npm run dev`; the log lists the providers.
4. On `/login`: tick the box, press each button, consent, land on `/` signed in; a first account is sent to
   `/accept-terms`.
5. With an existing email-link account under the same address: sign in with Google; the same account opens (Profile
   shows the same polls); `select "providerId" from account where "userId" = …` lists `google`.
6. Cancel at a provider: back on `/login` with "Sign-in was cancelled."

## 3. Production

1. Follow contracts/provider-setup.md P0–P4; P0 opens the site (`ENV_ALLOWED_EMAILS` deleted or empty), so the
   providers' reviewers can sign in. Check that the start-up log says `[auth] Sign-up allowlist off` and that an address
   that was never listed can create an account.
2. Set the settings in App Platform; keep `ENV_SIGNIN_METHOD=native` until a provider is ready, then `both`.
3. Apple: verify the domain after deploying the association file; sign in with Apple on `https://crowdpoll.vote`, once
   with "Share My Email" and once with "Hide My Email"; then send yourself an email-change link to the relay address
   and see it arrive.
