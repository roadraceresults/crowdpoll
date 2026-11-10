Start a new spec for these requirements called `20261109-201638-ALLOWLIST-DOMAIN-WILDCARD`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

We want the email addresses to have the wildcard "*" that are allowed when the site is in test mode
in the environment variable 
`ENV_ALLOWED_EMAILS`
and when configuring usinfg terraform in the file
`infra\secrets.auto.tfvars`
using the variable
`allowed_emails`

For example, "*.crowdpoll.vote" would allow any email address ending with `@crowdpoll.vote` when the site is in test mode. 

## Resolved Requirements

- **Test mode (AM2)**: "test mode" is the pre-launch allowlist being on, while `ENV_ALLOWED_EMAILS` holds at least one entry; there is no new setting.  
  Wildcard entries are ordinary entries of `ENV_ALLOWED_EMAILS`, and a list holding only wildcard entries also turns the allowlist on.  
  Emptying the list turns everything off, wildcards included.  
- **Invalid wildcard entries (UA3, revised by IN1)**: an entry with `*` is valid when it has exactly one `@` with at least one character on each side; nothing else is refused.  
  An entry without an `@` (such as `*.crowdpoll.vote`) stops the app with a `ConfigError` that names the entry and the accepted form.  
  `*@*` is valid and admits every address.  
- **Matching (UA4, made exact by UA7)**: the lower-cased entry is matched against the address's email key (`emailKeyOf`), so `QA@CrowdPoll.Vote` matches `*@crowdpoll.vote`, and `*@gmail.com` also admits `googlemail.com`; UA7 below says how the whole entry is matched.  
  Every path, provider logins included, uses the same comparison through `isAllowed`.  
- **Startup line (UA5, revised by IN2)**: `[auth] Sign-up allowlist on (2 addresses, 1 pattern)`, where an entry holding a `*` is a pattern and any other entry an address, counting the two kinds separately and leaving out a kind with none; no entry is named.  
- **Tests and documentation (UA6)**: `tests/allowlist.test.ts` covers parsing, the refusal of bad wildcards, matching (case, Gmail, subdomain, admin), a wildcard-only list turning the allowlist on, a login link and a provider-style account creation from a wildcard address, and the startup line.  
  `README.md`, `ARCHITECTURE.md`, `CLAUDE_COMPLETE.md`, `.claude/rules/environment.md` and `infra/secrets.auto.tfvars.example` (a comment showing a mixed list) describe the wildcard form; Terraform itself does not change.  
- **Wildcard form (AM1)**: a wildcard entry is written as an address, with `@`: `*@crowdpoll.vote`, not `*.crowdpoll.vote`.  
  An entry without an `@` (such as `*.crowdpoll.vote`) stops the app with a message showing the accepted form.  
- **Where `*` may appear (UA1)**: `*` may appear anywhere in the local part, as a glob standing for any characters (`qa-*@gmail.com`).  
- **Wildcards in the domain (UA2, Developer Resolution)**: the wildcard can appear anywhere in the entry, and there may be more than one wildcard in an entry (`*@*.crowdpoll.vote` admits the subdomains of crowdpoll.vote).  
- **Public mail domains (NC1)**: a wildcard may name a public mail domain (`*@gmail.com`); the documentation warns that a wildcard admits everyone with a mailbox matching it.  

## Additional Requirements (2026-11-09 8:25 PM)

- The accepted recommendation for UA2 make UA3 irrelavant  

## Resolved Requirements (continued)

- **Matching a pattern (UA7, Developer Resolution)**: match the entry literally against the email key, with `*` standing for any run of characters except `@`.  
  The pattern itself is not turned into an email key, so a Gmail pattern written with a dot or a plus-tag in its local part (`john.*@gmail.com`) matches no Gmail address, whose key has neither.  
