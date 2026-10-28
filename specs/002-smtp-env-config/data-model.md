# Data Model: Email & Auth-Secret Deployment Configuration

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-10

No database entities change. The only modeled entity is the extended configuration
surface (spec Key Entities: "Sign-In Configuration").

## Sign-In Configuration (extends 001-user-auth)

Parsed by `src/config.ts` from the environment at startup; invalid values fail fast
with a message naming the variable (001 FR-021/022, this feature FR-007).

| Setting | Env var | Type / Rules | Default (dev) |
|---|---|---|---|
| Session-signing secret | `APP_BETTER_AUTH_SECRET` | string; **required, ≥32 chars — startup refused otherwise, in every environment (FR-010)** | generated 48-char value written by setup into both launch assets; no fallback exists |
| SMTP host | `APP_SMTP_HOST` | string | `sandbox.smtp.mailtrap.io` |
| SMTP port | `APP_SMTP_PORT` | positive integer (validated) | `2525` |
| SMTP username | `APP_SMTP_USER` | string; optional — absence ⇒ degraded-email mode (console transport + warning) | unset |
| SMTP password | `APP_SMTP_PASS` | string; optional — same rule as username | unset |
| From header | `APP_SMTP_FROM` | string | `NativeAuthOAuth <no-reply@nativeauth.local>` |

**Renamed**: `APP_AUTH_SECRET` → `APP_BETTER_AUTH_SECRET` (old name no longer read).

## Launch-asset lifecycle (developer machines only)

```text
templates (checked in, placeholders only)
  launch.json.example
  devScripts.example/launch-dev.ps1
        │ setup-dev.ps1 (first run; -Force to redo)
        ▼
working copies (git-ignored, hold real values)
  .vscode/launch.json
  devScripts/launch-dev.ps1
        • APP_BETTER_AUTH_SECRET: one generated value, identical in both
        • APP_SMTP_USER/PASS: filled in by the developer
```

States: `template (placeholders)` → `initialized (generated secret, placeholder
credentials)` → `configured (credentials filled in)`. Re-running setup without
`-Force` never regresses a later state; with `-Force` both copies return to
`initialized` with a fresh shared secret (existing dev sessions invalidated —
accepted by spec Assumptions).
