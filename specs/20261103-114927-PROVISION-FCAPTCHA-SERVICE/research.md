# Research: Provision CrowdPoll as Code, With the FCaptcha Service

Sources checked on 2026-11-03:
[digitalocean_app](https://github.com/digitalocean/terraform-provider-digitalocean/blob/v2.106.0/docs/resources/app.md),
[app spec schema, v2.106.0](https://github.com/digitalocean/terraform-provider-digitalocean/blob/v2.106.0/digitalocean/app/app_spec.go),
[digitalocean_database_cluster](https://github.com/digitalocean/terraform-provider-digitalocean/blob/v2.106.0/docs/resources/database_cluster.md),
[Terraform registry: digitalocean/digitalocean](https://registry.terraform.io/providers/digitalocean/digitalocean/2.106.0),
[Terraform registry: hashicorp/random](https://registry.terraform.io/providers/hashicorp/random/3.9.1),
[App spec reference](https://docs.digitalocean.com/products/app-platform/reference/app-spec/),
[PyDo apps.update](https://docs.digitalocean.com/reference/pydo/reference/apps/update/).

## R1. The provisioning tool and its plugins

- **Decision**: Terraform (OpenTofu if `terraform.exe` is blocked), `digitalocean/digitalocean` pinned to `= 2.106.0` and `hashicorp/random` to `= 3.9.1` in `required_providers`; `infra/.terraform.lock.hcl` committed.
- **Rationale**: 2.106.0 is the current release (published 2026-10-12); an exact pin and the lock file make every plan use the same plugin (FR-010). Neither binary is installed on the operator's machine yet; the first quickstart step installs one and runs `terraform version` (FR-011), because the same Application Control policy blocks `doctl.exe`.
- **Alternatives considered**: a `~> 2.106` range (a minor release could change a plan without a configuration change); Pulumi (a second language runtime).

## R2. Valkey as an app database attachment

- **Decision**: the app's `database` block for Valkey uses `engine = "VALKEY"`, `production = true`, `cluster_name` = the cluster's name.
- **Rationale**: the v2.106.0 schema accepts `VALKEY` among the engines (`app_spec.go`), so RS3's unknown is settled and FR-024's stop is not expected; the check stays in the quickstart (the plan fails validation if the value were refused).
- **Alternatives considered**: `REDIS` (the cluster's engine is Valkey; a mismatch is refused by the API).

## R3. Bindable variables inside Terraform strings

- **Decision**: every App Platform bindable variable is written with Terraform's escape, `$${...}`: `ENV_DATABASE_URL = "$${db-pgsql-tor1-crowdpoll.DATABASE_URL}"`, `ENV_DATABASE_CA_CERT = "$${db-pgsql-tor1-crowdpoll.CA_CERT}"`, `ENV_VALKEY_URL = "$${valkey-tor1-crowdpoll.DATABASE_URL}"`, `ENV_FCAPTCHA_REDIS_URL = "$${valkey-tor1-crowdpoll.DATABASE_URL}/1"`, `ENV_FCAPTCHA_URL = "$${fcaptcha.PRIVATE_URL}"`.
- **Rationale**: an unescaped `${...}` is Terraform interpolation and fails the plan; the escape sends the literal text to App Platform, which binds it at deploy time (FR-006). Whether text may follow a binding (`/1`) stays unconfirmed (UA6); the after-apply checks catch it (FR-022).
- **Alternatives considered**: reading the URLs from `digitalocean_database_cluster` attributes (`uri`) into plain envs: copies a credential into the state and the app spec, against FR-006.

## R4. Secrets

- **Decision**: one `variable` per outside secret, `sensitive = true`, with a `validation` block `length(trimspace(var.x)) > 0` for the required ones; values in the git-ignored `infra/secrets.auto.tfvars`, loaded automatically; `infra/secrets.auto.tfvars.example` committed with every name and `""`. FCaptcha's two secrets are `random_password` resources (`length = 64`, `special = false`, which gives 64 characters of 62 symbols, well over 32 bytes of entropy) used for `ENV_FCAPTCHA_SECRET` on `fcaptcha` and `ENV_FCAPTCHA_VERIFY_SECRET` on both services.
- **Rationale**: variable validation fails `terraform plan` before any plan is shown, naming the variable (FR-014); `sensitive` hides values in plans and logs (FR-018); `random_password` keeps both secrets stable across applies in the state, and two separate resources can never be equal by construction except by chance (FR-015).
- **Required**: `better_auth_secret`, `ses_access_key_id`, `ses_secret_access_key`, `spaces_access_id`, `spaces_secret_key`, `allowed_emails`. **Optional** (default `""`, set together per provider): the `ENV_OAUTH_*` values, since `ENV_SIGNIN_METHOD` is `native`.
- **Alternatives considered**: `TF_VAR_*` in the session (UA8's first form, replaced by IN2 C); `ephemeral` / write-only arguments (not supported by the app resource's `env.value`).

## R5. Secret envs and a clean second plan

- **Decision**: env values of type `SECRET` are given from variables; SC-002 (zero changes on a second plan) is verified in the quickstart, and a perpetual diff, if one appears, is recorded as a provider gap in the README rather than hidden with `ignore_changes`.
- **Rationale**: App Platform returns secrets encrypted (`EV[...]`); a perpetual diff for app envs has been reported against the Pulumi wrapper of this provider, and whether v2.106.0 suppresses it could not be confirmed. `ignore_changes` on `spec` would also hide every real change, against FR-012.
- **Alternatives considered**: `ignore_changes = [spec[0].service[0].env]` (rejected as above).

## R6. Database clusters and their access rules

- **Decision**: `digitalocean_database_cluster` `pg` (`engine = "pg"`, `version = "18"`, `name = "db-pgsql-tor1-crowdpoll"`) and `valkey` (`engine = "valkey"`, `version = "9"`, `name = "valkey-tor1-crowdpoll"`), region `tor1`, size and node count from variables (defaults `db-s-1vcpu-1gb`, 1 node); `digitalocean_database_firewall` for each with one rule `type = "app"`, `value = digitalocean_app.crowdpoll.id`.
- **Rationale**: the versions are those of `.do/app.yaml`; the old sizes are not in the repository, so the quickstart has the operator note them before the deletion and set the variables if they differ. The firewall rule limits access to the app (FR-001). The app refers to the clusters by name (`cluster_name = digitalocean_database_cluster.pg.name`), which orders creation without a cycle.
- **Alternatives considered**: no firewall resource (App Platform adds the app as a trusted source for attached databases; an explicit rule makes the limit part of the configuration and visible in plans).

## R7. Spaces bucket and CDN

- **Decision**: `digitalocean_spaces_bucket` `crowdpoll` in `tor1`, `acl = "private"`, `force_destroy = false`; `digitalocean_cdn` with `origin = digitalocean_spaces_bucket.crowdpoll.bucket_domain_name`. The provider is given `spaces_access_id` / `spaces_secret_key` from the same variables as `web`'s `ENV_SPACES_KEY` / `ENV_SPACES_SECRET`.
- **Rationale**: objects are uploaded `public-read` by the app (`src/trending/publish.ts`, `publish-assets`), so the bucket itself stays private; the CDN's default address is `crowdpoll.tor1.cdn.digitaloceanspaces.com` as long as the bucket's name is `crowdpoll` (FR-002). `force_destroy = false` keeps a later `terraform destroy` from emptying it by accident.
- **Alternatives considered**: a separate key pair for the provider (one more secret; UA11 chose one pair).

## R8. The app resource

- **Decision**: one `digitalocean_app` `crowdpoll` with `spec { name = "crowdpoll", region = "tor1" }`, the `domain { name = "crowdpoll.vote", type = "PRIMARY", zone = "crowdpoll.vote" }`, the two `service` blocks and the `ingress` rules of `.do/app.yaml`, the two `database` blocks, and the `web` alerts; `deploy_on_push = false` on both GitHub sources.
- **Rationale**: `zone` makes App Platform write the domain's record in the DigitalOcean zone (FR-001a, clarification); `ingress` with `preserve_path_prefix = false` removes `/fcaptcha` (FR-003). `ENV_FCAPTCHA_ALLOWED_HOSTNAMES` is computed as `join(",", local.domains)` from the same list as the `domain` blocks, so a missing hostname cannot happen (FR-005) without a separate check.
- **Alternatives considered**: a `precondition` comparing two hand-written lists (more code for the same guarantee).

## R9. Non-secret settings

- **Decision**: `web`'s non-secret envs are written as a `locals` map from `.do/app.yaml`'s current values, rendered into `env` blocks with a `dynamic` block; `ENV_FCAPTCHA_ENABLED = "1"` and `ENV_FCAPTCHA_SITE_KEY = "crowdpoll"` are added; `ENV_OPENSEARCH_URL` is absent.
- **Rationale**: one map is easier to compare with `.do/app.yaml` while porting, and to edit later, than 70 `env` blocks; scopes other than the default (`RUN_TIME` for the bindable and secret values, `RUN_AND_BUILD_TIME` for `NODE_ENV` and the build-time Spaces values) are kept as in the file.
- **Alternatives considered**: `yamldecode(file(".do/app.yaml"))` (rejected by IN5: the file is deleted).

## R10. Switch-over and failure

- **Decision**: the order of FR-019 is the quickstart's runbook. A failed apply is fixed and re-applied; Terraform resumes from its state. A lost state is restored from the operator's backup or rebuilt with `import` blocks.
- **Rationale**: Terraform creates only what its state lacks, so a second apply after a partial failure does not duplicate resources (edge case of the spec).

## R11. Deploying a new version

- **Decision**: `devScripts/deploy-app.ts`, run with `npx tsx devScripts/deploy-app.ts`: reads `DIGITALOCEAN_TOKEN`, finds the app by name (`crowdpoll`, `--app <name>`), sends `POST /v2/apps/{id}/deployments` (`{ "force_build": false }`), then polls `GET /v2/apps/{id}/deployments/{deployment_id}` every 10 s until the phase is `ACTIVE`, `ERROR`, `CANCELED` or `SUPERSEDED`, or 30 minutes pass; prints each phase change, and on failure the first failed step's name; exit code 0 only for `ACTIVE`.
- **Rationale**: a manual deployment builds the source branch's latest commit, as the console's Deploy button does (FR-023); Node's `fetch` needs no new dependency and avoids `doctl` (UA1). A `!devScripts/deploy-app.ts` line joins `.gitignore` (CLAUDE.md invariant).
- **Alternatives considered**: a Terraform `null_resource` that deploys on every apply (mixes infrastructure changes and releases).

## R12. Tests

- **Decision**: `tests/deploy-app.test.ts` (Vitest, `fetch` stubbed): finding the app, starting the deployment, phase reporting, failure and timeout exit codes, a missing token. `tests/infra-config.test.ts`: every `sensitive` variable of `infra/variables.tf` appears in `secrets.auto.tfvars.example` with `""` and nowhere else with a value; `.gitignore` ignores `infra/.terraform/`, `infra/*.tfstate`, `infra/*.tfstate.*` and `infra/secrets.auto.tfvars`; no `.tf` file holds an unescaped App Platform binding (`"${db-`, `"${valkey-`, `"${fcaptcha.`); `.do/app.yaml` does not exist.
- **Rationale**: `npm test` needs no Terraform binary; `terraform fmt -check` and `terraform validate` run in the quickstart where the binary exists.

## R13. Credentials

- **Decision**: a DigitalOcean custom-scoped token with create, read, update and delete on apps, databases, CDN and domains (record writes for the zone), 30-day expiry, in the session as `DIGITALOCEAN_TOKEN` (read by both the provider and the deploy script); the Spaces key pair with access to all buckets, since the bucket does not exist when it is made.
- **Rationale**: FR-017; one token for provisioning and deploying keeps the operator's setup to one secret outside the file.

## R14. Documentation

- **Decision**: `.do/app.yaml` deleted; README's "Deploying to DigitalOcean App Platform" rewritten around `infra/`; `ARCHITECTURE.md`'s deployment section notes Terraform; `CLAUDE.md`'s overview and configuration rules point to `infra/`; `.claude/rules/environment.md` lines naming `.do/app.yaml` say `infra/` instead.
- **Rationale**: FR-025; the constitution's documentation phase.
