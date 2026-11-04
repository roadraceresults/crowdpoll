# Contract: The Infrastructure Configuration (`infra/`)

## C1. Commands the operator runs (from `infra/`)

| Command | Effect | Expected outcome |
|---|---|---|
| `terraform init` | downloads the pinned plugins | `.terraform.lock.hcl` unchanged |
| `terraform fmt -check` | formatting check | exit 0 |
| `terraform validate` | static check | `Success! The configuration is valid.` |
| `terraform plan` | preview (FR-008) | the resource list with secrets shown as `(sensitive value)`; or a validation error naming each empty required input (FR-014) |
| `terraform apply` | the same plan, then a `yes` prompt | resources created or changed; waits for the app's deployment |
| `terraform plan` after an apply | repeatability (FR-009) | `No changes. Your infrastructure matches the configuration.` |

`DIGITALOCEAN_TOKEN` must be set in the session; without it the plan stops with the provider's authentication error.

## C2. Resource names (FR-002)

| What | Name |
|---|---|
| Region | `tor1` |
| App | `crowdpoll` |
| Domain | `crowdpoll.vote` (`PRIMARY`, zone `crowdpoll.vote`) |
| PostgreSQL cluster | `db-pgsql-tor1-crowdpoll` |
| Valkey cluster | `valkey-tor1-crowdpoll` |
| Spaces bucket | `crowdpoll` |
| CDN address | `https://crowdpoll.tor1.cdn.digitaloceanspaces.com` |

## C3. Routing (FR-003)

| Path | Component | Prefix |
|---|---|---|
| `/fcaptcha` and below | `fcaptcha` | removed |
| everything else | `web` | kept |

## C4. Service settings added or changed against `.do/app.yaml`

| Service | Setting | Value |
|---|---|---|
| `web` | `ENV_FCAPTCHA_ENABLED` | `1` |
| `web` | `ENV_FCAPTCHA_URL` | `$${fcaptcha.PRIVATE_URL}` |
| `web` | `ENV_FCAPTCHA_SITE_KEY` | `crowdpoll` |
| `web`, `fcaptcha` | `ENV_FCAPTCHA_VERIFY_SECRET` | `random_password.fcaptcha_verify_secret` (SECRET) |
| `fcaptcha` | `ENV_FCAPTCHA_SECRET` | `random_password.fcaptcha_secret` (SECRET) |
| `fcaptcha` | `ENV_FCAPTCHA_ALLOWED_HOSTNAMES` | the app's domains, comma-joined |
| `fcaptcha` | `ENV_FCAPTCHA_REDIS_URL` | `$${valkey-tor1-crowdpoll.DATABASE_URL}/1` (SECRET) |
| `web` | `ENV_OPENSEARCH_URL` | absent |

Every other `web` setting keeps the value it has in `.do/app.yaml` at the start of the feature.

## C5. The secrets file

`infra/secrets.auto.tfvars.example` (committed) and `infra/secrets.auto.tfvars` (ignored) hold the same names, one per
line, `name = "value"`, in the order of `data-model.md` *Inputs*. The example's values are all `""`.
