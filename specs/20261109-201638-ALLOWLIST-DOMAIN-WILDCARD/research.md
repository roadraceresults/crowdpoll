# Research: Allowlist Domain Wildcard

All decisions below were settled in `requirements/20261109-201638-allowlist-domain-wildcard/requirements-report.md`
(AM1–AM2, UA1–UA7, NC1, IN1–IN2); this file records how each maps onto `src/config.ts` and `src/auth/allowlist.ts`.

## R1. One allowlist value in the configuration

- **Decision**: `AppConfig.allowedEmailKeys?: Set<string>` becomes `AppConfig.allowlist?: Allowlist`, where
  `Allowlist = { keys: Set<string>; patterns: RegExp[] }` (exported from `src/config.ts`). It is `undefined` when
  `ENV_ALLOWED_EMAILS` is unset, empty or only separators (off), and set whenever the list holds an entry of either kind
  (FR-005), so a pattern-only list turns test mode on.
- **Rationale**: the three places that ask "is the allowlist on?" (`src/auth/auth.ts:226`, `src/routes/api.ts:517`,
  `:570`) test `config.allowedEmailKeys`; a separate `allowedEmailPatterns` field would leave them off for a pattern-only
  list (requirements report, Technical Debt). One value with one meaning removes that trap.
- **Alternatives considered**: keeping `allowedEmailKeys` and adding `allowedEmailPatterns` (rejected: the "on" checks
  would need a second condition each, and a forgotten one admits everyone); keeping `allowedEmailKeys` as an empty
  `Set` meaning "on" (rejected: an empty set meaning "on" reads as the opposite of what it says).

## R2. Parsing and refusal

- **Decision**: `allowlistFrom(env)` (replacing `allowedEmailKeys(env)`) splits on `,`, trims, lower-cases and drops
  empty items, as today. An entry holding `*` is a pattern; it is valid when it matches `^[^\s@]+@[^\s@]+$` (exactly one
  `@`, at least one character on each side, no whitespace). Any other entry is an address, validated with
  `EMAIL_PATTERN` as today. A refused pattern throws
  `ConfigError('Invalid ENV_ALLOWED_EMAILS: "<entry>" is not an email address or a pattern such as "*@crowdpoll.vote".')`;
  a refused address keeps today's message.
- **Rationale**: FR-002 (IN1 A): the only check on a pattern is the address shape, so `*@*` is valid and
  `*.crowdpoll.vote`, `*@`, `a@b@*` are refused. The message names the entry (a domain or pattern is not a personal
  address, and today's message already names the entry) and shows the accepted form (AM1).
- **Alternatives considered**: requiring a dot in a pattern's domain like `EMAIL_PATTERN` (rejected: `*@*` must be
  valid, IN1 A); refusing patterns that admit everyone (IN1 B, not chosen).

## R3. Matching

- **Decision**: each pattern is compiled once, at load, to an anchored `RegExp`: every character other than `*` is
  regex-escaped, each `*` becomes `[^@]*`, the whole wrapped in `^…$`. `isAllowed` tests it against
  `emailKeyOf(address)` of the trimmed, lower-cased address. The pattern itself is not passed through `emailKeyOf`.
- **Rationale**: FR-003 (UA4, UA7 Developer Resolution): literal match against the email key, `*` any run except `@`
  (possibly empty, as the spec states); escaping makes `.` a dot. Compiling at load keeps the check per login a few
  regex tests on a list of a handful of entries.
- **Alternatives considered**: a hand-written glob matcher (rejected: more code than an escaped `RegExp`); normalising
  the pattern with `emailKeyOf` (UA7 A, not chosen: the developer chose literal matching).

## R4. Order of the checks in `isAllowed`

- **Decision**: off → allowed; then the address is in `config.admins` → allowed; then its key is in `allowlist.keys`
  → allowed; then any pattern matches the key → allowed; otherwise refused.
- **Rationale**: FR-004 keeps administrators and exact entries as they are; patterns are a further way in, tried last
  because a `Set` lookup is cheaper.

## R5. The startup line

- **Decision**: `allowlistStatus` returns `[auth] Sign-up allowlist off` when off; otherwise
  `[auth] Sign-up allowlist on (<parts>)`, where the parts are `<n> addresses` when there are exact entries and
  `<m> pattern` / `<m> patterns` when there are patterns, joined by `, `. `<n> addresses` keeps today's wording
  (always plural, as today's line and test have it).
- **Rationale**: FR-007 (UA5 revised by IN2); a list of addresses only gives exactly today's line (SC-002); no entry is
  named (SC-004).

## R6. Call sites

- **Decision**: the three "on" checks become `if (config.allowlist)`; `isAllowed` and `allowlistStatus` read
  `config.allowlist`. `tests/invitations-api.test.ts:139–149`, which swaps `ctx.config.allowedEmailKeys` for one test,
  swaps `ctx.config.allowlist` (`{ keys: new Set([...]), patterns: [] }`) instead. No other code reads the field.
- **Rationale**: FR-006: every guarded path already calls `isAllowed`, so patterns reach all of them through it.

## R7. Infrastructure, documentation and tests

- **Decision**: no Terraform change (FR-008); `infra/secrets.auto.tfvars.example` gains a comment line showing a mixed
  list. The pattern form, the public-domain warning (NC1) and the Gmail note (UA7) are added to `README.md` (pre-launch
  section and settings table), `ARCHITECTURE.md` (Pre-launch allowlist), `CLAUDE_COMPLETE.md` (settings table) and
  `.claude/rules/environment.md`. `tests/allowlist.test.ts` gains the cases of FR-010.
- **Rationale**: FR-009, FR-010 (UA6); the constitution's documentation phase covers README.md and ARCHITECTURE.md.
