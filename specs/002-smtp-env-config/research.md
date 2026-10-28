# Phase 0 Research: Email & Auth-Secret Deployment Configuration

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-10

No NEEDS CLARIFICATION markers remained in the spec. Research resolves the plan-level
decisions the spec deferred.

## R1. Secret variable rename strategy

- **Decision**: Hard rename in `src/config.ts`: read `APP_BETTER_AUTH_SECRET` only;
  do not fall back to the old `APP_AUTH_SECRET` name.
- **Rationale**: Spec FR-002 says the old name is not consulted. The old name shipped
  today and appears in no deployment yet (feature 001 was never deployed with a real
  secret); a compatibility fallback would be speculative complexity (Simplicity First).
- **Alternatives considered**: Dual-read with deprecation warning (rejected: no
  installed base to migrate); keeping the old name (rejected: contradicts the source
  document's explicit variable list).

## R2. Secret generation mechanism (first-time setup)

- **Decision**: A checked-in `devScripts.example/setup-dev.ps1` performs first-time
  setup: it copies `launch.json.example` → `.vscode/launch.json` and
  `devScripts.example/launch-dev.ps1` → `devScripts/launch-dev.ps1`, generates one
  48-character base64url secret via PowerShell's cryptographic RNG
  (`[System.Security.Cryptography.RandomNumberGenerator]::GetBytes(36)` +
  base64url encoding), and replaces the `__GENERATED_ON_SETUP__` placeholder in **both**
  copies with that single value. Refuses to overwrite existing copies unless `-Force`.
- **Rationale**: FR-005a requires the *same* generated value in both assets — only a
  scripted step guarantees that; 48 chars comfortably exceeds the ≥32 minimum and
  satisfies BetterAuth's own entropy warning threshold; PowerShell is the mandated dev
  environment (Spec Kit `script: ps`, Windows 11), and the crypto RNG is available on
  every supported PowerShell without extra modules. The overwrite guard preserves an
  existing secret (and hand-entered Mailtrap credentials) across re-runs.
- **Alternatives considered**: Node one-liner in `package.json` postinstall (rejected:
  surprising side effects on `npm install`, and CI/sandbox installs would churn
  secrets); documenting a manual two-file paste (rejected: cannot enforce same-value
  rule, error-prone); `openssl rand` (rejected: not guaranteed present on Windows).

## R3. Placeholder convention for checked-in templates

- **Decision**: Credential-bearing values in `launch.json.example` and
  `devScripts.example/launch-dev.ps1` use unmistakable placeholders:
  `__GENERATED_ON_SETUP__` for `APP_BETTER_AUTH_SECRET` (machine-replaced) and
  `"your-mailtrap-username"` / `"your-mailtrap-password"` for `APP_SMTP_USER/PASS`
  (human-replaced). Non-secret SMTP values ship real defaults
  (`sandbox.smtp.mailtrap.io`, `2525`, the From header).
- **Rationale**: FR-006/SC-004 demand a repo-wide search find zero real credentials;
  distinct machine vs. human placeholders make the setup script's replacement target
  unambiguous and leave grep-able markers if setup was skipped. This also remediates
  the real Mailtrap credentials currently sitting in the working tree's
  `launch.json.example`.
- **Alternatives considered**: Empty strings (rejected: indistinguishable from
  intentionally-blank config and silently valid); comments-only guidance (rejected:
  JSON has no comments in `launch.json` env blocks... env values must be strings).

## R4. Config validation & degraded-email behavior *(revised 2026-08-10 for FR-010)*

- **Decision**: `APP_SMTP_PORT` keeps the shared positive-integer parser (fail fast
  naming the variable, FR-007); missing `APP_SMTP_USER`/`APP_SMTP_PASS` keeps the
  console-transport fallback with its startup warning (FR-008). The secret changes:
  `APP_BETTER_AUTH_SECRET` is **mandatory in every environment** — `loadConfig` throws
  a `ConfigError` naming the variable and the 32-character minimum whenever it is
  unset, empty, or shorter than 32 characters. The previous insecure development
  default is deleted. The test harness (`tests/helpers/setup.ts`) passes a fixed valid
  test secret, so suites run on a fresh clone with no launch assets.
- **Rationale**: The source document's final revision states the system "will not
  start and will throw an error" without a ≥32-character secret, explicitly including
  development — this supersedes the earlier fallback design and eliminates the
  forgeable-session risk of a known default secret.
- **Alternatives considered**: Insecure dev fallback with warning (the prior design —
  rejected by the document revision); environment-conditional enforcement
  (production-only — rejected: the document names every environment); minimum-entropy
  checks beyond length (rejected: the document specifies length only; BetterAuth's own
  low-entropy warning still applies as defense in depth).

## R5. Documentation surface (FR-009)

- **Decision**: Update the existing README configuration table in place — rename the
  secret row to `APP_BETTER_AUTH_SECRET`, keep the five SMTP rows (already present),
  and document the setup script as the first-time path (replacing the manual
  `Copy-Item` instructions).
- **Rationale**: README is the project's configuration reference established by 001
  (FR-023); one table keeps a single documentation source.
- **Alternatives considered**: Separate CONFIG.md (rejected: fragments the reference).
