# Contract: the `ENV_ALLOWED_EMAILS` setting

The operator-facing interface of the feature: what the setting accepts, what stops the site, and what start-up prints.
The refused person's answer (`403 { error, code: "not-launched" }`, or `/login?error=not-launched` for a provider login)
does not change.

## S1. Entries

`ENV_ALLOWED_EMAILS` (production: `allowed_emails` in `infra/secrets.auto.tfvars`, passed unchanged by Terraform) is a
comma-separated list. Each item is trimmed and lower-cased; empty items are ignored.

| Kind | Recognised by | Valid when | Example |
|---|---|---|---|
| address | no `*` | it matches `EMAIL_PATTERN` (as today) | `tester@example.org` |
| pattern | holds `*` | exactly one `@`, at least one non-space character on each side, no whitespace | `*@crowdpoll.vote`, `qa-*@gmail.com`, `*@*.crowdpoll.vote`, `*@*` |

- A pattern is matched against the email key of the address as a whole; `*` stands for any run of characters, possibly
  empty, except `@`; every other character stands for itself.
- No entry: the allowlist is off and everyone is admitted. At least one entry of either kind: it is on.

## S2. Refusal at start-up

The first invalid entry stops the site with a `ConfigError`:

| Entry | Message |
|---|---|
| an address that is not one (`not-an-address`) | `Invalid ENV_ALLOWED_EMAILS: "not-an-address" is not an email address.` (unchanged) |
| a pattern that is not address-shaped (`*.crowdpoll.vote`, `*@`, `a@b@*`) | `Invalid ENV_ALLOWED_EMAILS: "*.crowdpoll.vote" is not an email address or a pattern such as "*@crowdpoll.vote".` |

## S3. The start-up line

| List | Line |
|---|---|
| none | `[auth] Sign-up allowlist off` (unchanged) |
| addresses only | `[auth] Sign-up allowlist on (2 addresses)` (unchanged) |
| patterns only | `[auth] Sign-up allowlist on (1 pattern)` / `(3 patterns)` |
| both | `[auth] Sign-up allowlist on (2 addresses, 1 pattern)` |
| with administrators (TWEAK01) | each line above ends `; <k> administrator(s) always allowed` inside the brackets, e.g. `(1 pattern; 3 administrators always allowed)`; left out when `ENV_ADMINS` is empty |

No entry, address or domain appears in the line.
