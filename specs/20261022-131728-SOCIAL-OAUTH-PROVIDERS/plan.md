# Implementation Plan: Social Sign-In With Google, Apple, Microsoft and Amazon

**Branch**: `dev` (no dedicated branch) | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261022-131728-SOCIAL-OAUTH-PROVIDERS/spec.md`

## Summary

CrowdPoll gains sign-in with Google, Apple, Microsoft and Amazon beside the email link, ready for the providers'
approval. The approach (research R1–R11): one public origin for every redirect URI; a third sign-in mode, `both`;
BetterAuth's handler mounted for the OAuth paths only; provider settings validated by `loadConfig`; Apple's client
secret signed by CrowdPoll with `node:crypto`; Amazon through BetterAuth's `generic-oauth` plugin; account linking by
email key for all four; branded buttons on the Login card; Apple's domain file served under `/.well-known/`; the
Privacy Policy and four registration procedures updated.

## Technical Context

**Language/Version**: TypeScript 5 on Node.js 22 (ES modules); browser scripts in plain JavaScript.

**Primary Dependencies**: Express 5, BetterAuth 1.6.26 (`socialProviders` google/apple/microsoft, `generic-oauth`
plugin, `account.accountLinking`), Kysely on `pg`; no new dependency.

**Storage**: PostgreSQL, existing `account` and `user` tables; no migration.

**Testing**: Vitest + supertest on embedded PostgreSQL, jsdom for the Login card; providers stubbed by intercepting
`fetch` (as the allowlist feature's GitHub callback test does); no network.

**Target Platform**: DigitalOcean App Platform at `https://crowdpoll.vote`.

**Project Type**: web service with server-rendered pages and vanilla-JS cards.

**Performance Goals**: none new; a sign-in adds one provider round trip.

**Constraints**: one new cookie: BetterAuth sets a signed `state` cookie for 5 minutes on every provider sign-in
(`better-auth/dist/state.mjs`), named `oauth_state` here; it is strictly necessary (it stops forged sign-ins), set only
in `oauth` and `both`, and is added to the Cookie Use table, the policy's "In short" line and CLAUDE.md's cookie policy
(`tests/cookie-use-list.test.ts` enforces the table); no third-party request on CrowdPoll's pages
(logos served locally); the existing `native` and `oauth` modes behave exactly as today.

**Scale/Scope**: 4 providers, 1 new module (`appleSecret.ts`), changes to `config.ts`, `auth.ts`, `server.ts`,
`api.ts`, `pages.ts`, `loginCard.js`, `profileCard.js`, `privacy.html`, templates and docs.

## Constitution Check

| Principle | Check | Status |
|---|---|---|
| I. Think before coding | BetterAuth's actual routes and linking rules were read in `node_modules` (R3, R6, R7) before designing | Pass |
| II. Simplicity first | No dependency (ES256 via `node:crypto`); Amazon by the installed plugin; no profile-linking UI | Pass |
| III. Surgical changes | `native` and `oauth` unchanged; the OAuth mount narrows instead of rewriting routes | Pass |
| IV. Goal-driven | Each story's independent test is an automated test with stubbed providers, plus quickstart §2–3 | Pass |
| V. Code quality | Settings validated at start-up; refusals logged with masked addresses; one module per concern | Pass |
| VI. Self-documenting code | No explanatory comments | Pass |
| Security | Secrets as encrypted variables, never logged; `callbackURL` same-origin only; linking only with verified local email | Pass |
| Documentation deliverables | README/ARCHITECTURE regenerated in the final tasks phase | Pass (to carry into tasks) |

Post-design re-check: all pass; no Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/20261022-131728-SOCIAL-OAUTH-PROVIDERS/
├── spec.md
├── plan.md                      # this file
├── research.md                  # R1–R11
├── data-model.md                # account links, user fields, settings
├── quickstart.md
├── contracts/
│   ├── api.md                   # A1–A6
│   ├── ui-contracts.md          # C1–C3
│   └── provider-setup.md        # P0–P5 registration procedures
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/
├── config.ts                    # ENV_PUBLIC_ORIGIN, `both`, oauthProviders (R1, R2, R4)
├── auth/
│   ├── auth.ts                  # baseURL, socialProviders, genericOAuth Amazon, accountLinking, mapProfileToUser (R5–R7)
│   └── appleSecret.ts           # ES256 client secret + 30-day refresh (R5, new)
├── server.ts                    # OAuth paths mounted only (R3)
├── routes/
│   ├── api.ts                   # nativeOnly → nativeSignin; /api/config oauthProviders (R2, R9)
│   └── pages.ts                 # page guards; /.well-known/apple-developer-domain-association.txt (R2, R10)
└── public/
    ├── loginCard.js             # provider buttons, both mode, error codes (R8, R9)
    ├── profileCard.js           # email section in both (R2)
    ├── oauth/{google,apple,microsoft,amazon}.svg   # official logos (new)
    ├── privacy.html             # providers in "Who processes", relay note (R11)
    └── card-shell-m3.css        # provider button styles
tests/                           # new: oauth-config, oauth-modes, oauth-providers (stubbed callbacks, linking),
                                 # apple-secret, well-known; updated: client-terms-box, signin-mode, allowlist
postman/openapi.json, launch.json.example, devScripts.example/launch-dev.ps1, .do/app.yaml
```

**Structure Decision**: the existing single project; the only new module is `src/auth/appleSecret.ts`.

## Complexity Tracking

No violations to justify.
