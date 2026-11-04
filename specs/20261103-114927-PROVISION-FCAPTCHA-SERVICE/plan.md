# Implementation Plan: Provision CrowdPoll as Code, With the FCaptcha Service

**Branch**: `home-tab` | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/20261103-114927-PROVISION-FCAPTCHA-SERVICE/spec.md`

## Summary

CrowdPoll's DigitalOcean hosting — the app (`web`, the new `fcaptcha` service, the `/fcaptcha` ingress and the
`crowdpoll.vote` domain), the PostgreSQL and Valkey clusters with their firewalls, and the Spaces bucket with its CDN —
is described once in a Terraform configuration under `infra/`, with today's names, and provisioned fresh after the old,
hand-made stack is deleted (R1–R10).
Outside secrets come from a git-ignored `infra/secrets.auto.tfvars` checked non-empty at plan time; the FCaptcha secrets
are `random_password` resources shared by both services (R4).
Releases are started by a small committed `devScripts/deploy-app.ts` through the API (R11).
`.do/app.yaml` is deleted and the documentation points to `infra/` (R14).

## Technical Context

**Language/Version**: HCL for Terraform ≥ 1.6 (or OpenTofu ≥ 1.6); TypeScript on Node ≥ 22 (ESM) for the deploy script

**Primary Dependencies**: `digitalocean/digitalocean` = 2.106.0, `hashicorp/random` = 3.9.1 (R1); no new npm dependency

**Storage**: Terraform state in a local, git-ignored `infra/terraform.tfstate` (UA7); the app's PostgreSQL and Valkey are re-created empty

**Testing**: Vitest (`tests/infra-config.test.ts`, `tests/deploy-app.test.ts`, `fetch` stubbed); `terraform fmt -check` / `validate` / `plan` in the quickstart

**Target Platform**: DigitalOcean App Platform, Managed PostgreSQL 18, Managed Valkey 9, Spaces + CDN, region `tor1`; run from the operator's Windows machine

**Project Type**: infrastructure configuration plus one CLI dev script, in the existing web-service repository

**Performance Goals**: an apply that brings the stack up within 45 minutes (SC-001); the deploy command polls every 10 s

**Constraints**: no secret in a committed file; no `doctl`; one console step (the old stack's deletion); same resource names

**Scale/Scope**: about 8 resources, 6 required and 10 optional secret inputs, one script of about 100 lines, two test files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I. Think Before Coding | ✅ | Every unknown is a research item (R1–R14); the one spec clarification (DNS) is answered; two unconfirmed points (R3's `/1`, R5's second-plan diff) are checked by quickstart scenarios, not assumed. |
| II. Simplicity First | ✅ | No modules, no remote backend, no CI: a flat `infra/` of a few `.tf` files; the allowed hostnames are derived from the domain list instead of checked (R8); the deploy script uses `fetch` only. |
| III. Surgical Changes | ✅ | No application code changes; only `.do/app.yaml` (deleted), docs, `.gitignore` and two new tests. |
| IV. Goal-Driven Execution | ✅ | Each story maps to quickstart scenarios 1–14 with expected outcomes. |
| V. Code Quality | ✅ | The deploy script logs each phase and fails with a clear message and exit code; `sensitive` keeps secrets out of plans. |
| VI. Self-Documenting Code | ✅ | HCL comments only link external docs (e.g. the app spec reference); names carry meaning (`fcaptcha_verify_secret`). |
| Security, Privacy & Reliability | ✅ | Secrets in an ignored file and the ignored state; scoped, expiring token in the session only; no token or secret printed. The plain-text secrets on the operator's disk are an accepted risk (UA7, IN2). |
| Documentation Deliverables | ✅ | README and ARCHITECTURE updated in the final phase (R14). |

Post-design re-check: unchanged, all ✅.

## Project Structure

### Documentation (this feature)

```text
specs/20261103-114927-PROVISION-FCAPTCHA-SERVICE/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── infra-config.md
│   └── deploy-command.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
infra/
├── versions.tf                     # required_version, required_providers (exact pins)
├── providers.tf                    # digitalocean (token from DIGITALOCEAN_TOKEN, Spaces keys from variables)
├── variables.tf                    # inputs with sensitive + validation (data-model.md)
├── databases.tf                    # pg and valkey clusters, firewalls
├── spaces.tf                       # bucket and CDN
├── fcaptcha.tf                     # the two random_password resources
├── app.tf                          # digitalocean_app: domain, web, fcaptcha, ingress, databases, alerts
├── outputs.tf                      # app_id, default_ingress, live_url, cdn_endpoint
├── .terraform.lock.hcl             # committed after the first init
└── secrets.auto.tfvars.example     # committed, every input ""

devScripts/deploy-app.ts            # the deploy command (contracts/deploy-command.md)

tests/
├── infra-config.test.ts
└── deploy-app.test.ts

.gitignore                          # + infra ignores, + !devScripts/deploy-app.ts
.do/app.yaml                        # deleted
README.md, ARCHITECTURE.md, CLAUDE.md, .claude/rules/environment.md   # docs
```

**Structure Decision**: a top-level `infra/` folder (UA12) beside the existing `src/`, `tests/` and `devScripts/`; the
deploy command is a named dev script like `publish-assets.ts`.

## Complexity Tracking

No violations.
