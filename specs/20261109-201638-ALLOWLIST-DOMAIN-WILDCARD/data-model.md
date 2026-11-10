# Data Model: Allowlist Domain Wildcard

No database change and no migration. The feature changes one configuration value, read once at start-up.

## Allowlist (configuration, in memory)

`AppConfig.allowlist?: Allowlist` replaces `AppConfig.allowedEmailKeys?: Set<string>` (research R1).

| Field | Type | Meaning |
|---|---|---|
| `keys` | `Set<string>` | the email key (`emailKeyOf`) of each **address** entry, as today |
| `patterns` | `RegExp[]` | each **pattern** entry (one holding `*`), compiled to an anchored expression (R3) |

- `allowlist` is `undefined` (test mode off) when `ENV_ALLOWED_EMAILS` holds no entry; otherwise it is set, even when one
  of the two fields is empty.
- **Address entry**: trimmed, lower-cased, valid by `EMAIL_PATTERN`, stored as its email key.
- **Pattern entry**: trimmed, lower-cased, valid by `^[^\s@]+@[^\s@]+$`, stored compiled; not passed through
  `emailKeyOf`.

## Admission rule

For an address `a`, with `k = emailKeyOf(a.trim().toLowerCase())`:

```
allowlist undefined                  → admitted
a (lower-cased) ∈ ENV_ADMINS         → admitted
k ∈ allowlist.keys                   → admitted
some p ∈ allowlist.patterns, p.test(k) → admitted
otherwise                            → refused (not-launched)
```

| Entry | Address | Key | Admitted |
|---|---|---|---|
| `*@crowdpoll.vote` | `QA1@CrowdPoll.Vote` | `qa1@crowdpoll.vote` | yes |
| `*@crowdpoll.vote` | `qa+t@crowdpoll.vote` | `qa@crowdpoll.vote` | yes |
| `*@*.crowdpoll.vote` | `qa@crowdpoll.vote` | `qa@crowdpoll.vote` | no |
| `*@*.crowdpoll.vote` | `qa@mail.crowdpoll.vote` | `qa@mail.crowdpoll.vote` | yes |
| `*@gmail.com` | `x@googlemail.com` | `x@gmail.com` | yes |
| `john*@gmail.com` | `john.smith@gmail.com` | `johnsmith@gmail.com` | yes |
| `john.*@gmail.com` | `john.smith@gmail.com` | `johnsmith@gmail.com` | no |
| `qa*@x.org` | `qa@x.org` | `qa@x.org` | yes |
| `*@x.org` | `qa@xyorg` | `qa@xyorg` | no |
| `*@*` | any | any | yes |
