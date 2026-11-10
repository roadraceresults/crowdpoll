# Quickstart: Allowlist Domain Wildcard

## Automated checks

```
npx tsc --noEmit
npx vitest run tests/allowlist.test.ts tests/invitations-api.test.ts
npm test
```

`tests/allowlist.test.ts` covers the entry kinds and refusals (contract S1, S2), the matching table of `data-model.md`,
a pattern-only list turning the allowlist on, a login link and a provider-style account creation from a
pattern-admitted address, and the start-up line (S3).

## Manual checks (local server)

Start the server with `devScripts/launch-dev.ps1`, after setting `ENV_ALLOWED_EMAILS` in the copy you run:

1. **A domain pattern.** `ENV_ALLOWED_EMAILS = "*@crowdpoll.vote"`.
   Start-up prints `[auth] Sign-up allowlist on (1 pattern; <k> administrators always allowed)`, `<k>` being the `ENV_ADMINS` count.
   On `/login`, request a link for `qa1@crowdpoll.vote`: it is sent. Request one for `someone@example.org`: the page
   says CrowdPoll hasn't launched yet, and nothing is sent.
2. **A mixed list.** `ENV_ALLOWED_EMAILS = "a@x.org,b@x.org,*@crowdpoll.vote"`.
   Start-up prints `[auth] Sign-up allowlist on (2 addresses, 1 pattern; <k> administrators always allowed)`.
3. **A malformed entry.** `ENV_ALLOWED_EMAILS = "*.crowdpoll.vote"`.
   The server stops with
   `Invalid ENV_ALLOWED_EMAILS: "*.crowdpoll.vote" is not an email address or a pattern such as "*@crowdpoll.vote".`
4. **Off.** `ENV_ALLOWED_EMAILS = ""`: start-up prints `[auth] Sign-up allowlist off`, and any address may log in.

Production needs no Terraform change: put the pattern in `allowed_emails` in `infra/secrets.auto.tfvars` and apply.
