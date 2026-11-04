# Quickstart: Switching CrowdPoll Over to Terraform

The runbook and its validation scenarios. Names and settings are in `contracts/infra-config.md`; inputs in
`data-model.md`.

## Prerequisites

- Terraform (or OpenTofu) installed; `terraform version` (or `tofu version`) prints a version on this machine (FR-011).
  If Windows Application Control blocks it, try OpenTofu, then review the Smart App Control setting.
  Checked 2026-11-03: `terraform.exe` 1.13.4 (the release zip, unpacked to a temporary folder) ran on this machine
  without being blocked; `init`, `fmt -check`, `validate` and a token-less plan with placeholder values succeeded.
  A permanent install is still the operator's step.
- A DigitalOcean custom-scoped token (apps, databases, CDN, domains; 30 days), set in the session:
  `$env:DIGITALOCEAN_TOKEN = "<token>"` (PowerShell). Never written to a file.
- A new Spaces key pair, and a new SES access key for the existing IAM user.

## Runbook

1. **Note the old sizes** (read-only): the PostgreSQL and Valkey cluster sizes and node counts in the console; set
   `pg_size`, `pg_node_count`, `valkey_size` in the secrets file if they differ from the defaults.
2. **Fill the secrets file**: copy `infra/secrets.auto.tfvars.example` to `infra/secrets.auto.tfvars` and fill every
   required value (`ENV_BETTER_AUTH_SECRET`: `openssl rand -hex 32`).
3. **Validate**: in `infra/`, `terraform init`, `terraform fmt -check`, `terraform validate`, `terraform plan`.
   The plan must list the resources of `data-model.md` and nothing else.
4. **Delete the old stack** in the console (the feature's one console step): the app `crowdpoll`; the clusters
   `db-pgsql-tor1-crowdpoll` and `valkey-tor1-crowdpoll`; the bucket's CDN endpoint; the bucket `crowdpoll` after
   emptying it. Then check the DNS zone `crowdpoll.vote` for records the old app left (its A/AAAA or CNAME records for
   the domain) and remove them, leaving the SES records alone (FR-019).
5. **Apply**: note the time, `terraform apply`, review, `yes`; on a failure fix it and apply again. Back up
   `infra/terraform.tfstate` in encrypted form (for example as a password-manager attachment), and keep it and
   `infra/secrets.auto.tfvars` out of cloud-synced folders (FR-016).
6. **Check** (scenarios 4–8 below).
7. **Revoke** the old SES access key and the old Spaces key pair once scenario 7 passes (FR-021). Then replace the
   all-buckets Spaces key with one limited to the `crowdpoll-cdn` bucket, set it in `infra/secrets.auto.tfvars`,
   `terraform apply`, and revoke the all-buckets key (FR-017).

## Releasing a later change

Autodeploy is off, so the command depends on what changed. A `terraform apply` that changes the app spec redeploys the
commit already deployed, with the new settings; it does not fetch `main` again (seen 2026-11-04: the apply rebuilt
`83ce186` though `main` was ahead). Only `deploy-app.ts` builds `main`'s latest commit.

| Changed | Run |
|---|---|
| Only `infra/*.tf` (settings, sizes, secrets file) | `terraform apply` in `infra/` |
| Only code, pushed to `main` | `npx tsx devScripts/deploy-app.ts` from the repository root |
| Both | `terraform apply`, then `npx tsx devScripts/deploy-app.ts` |

Both commands need `$env:DIGITALOCEAN_TOKEN` in the session. Check the build log's `Checking out commit "<sha>"` line
names the commit you pushed.

## Validation scenarios

| # | Story | Steps | Expected |
|---|---|---|---|
| 1 | US2 | Empty `allowed_emails` in the secrets file, `terraform plan` | Stops: `allowed_emails must be set in infra/secrets.auto.tfvars.`; no plan shown |
| 2 | US1 | Complete secrets file, `terraform plan` | The resources of `data-model.md`; every secret `(sensitive value)` |
| 3 | US1 | After the apply, `terraform plan` | `No changes.` (SC-002; a perpetual diff on SECRET envs is recorded as a provider gap, R5) |
| 4 | US1 | `curl -s https://crowdpoll.vote/fcaptcha/health`, `curl -sI https://crowdpoll.vote/fcaptcha/fcaptcha.js` | Both 200 |
| 5 | US1 | `curl -s https://crowdpoll.vote/healthz` | 200; `abuse.humanCheckSkipped` stays 0 after scenario 6 |
| 6 | US1 | Open `https://crowdpoll.vote/login` as a guest, pass the check | The check first, then the form; network panel shows only the site's own domain |
| 7 | US1 | Request a sign-in email for an allowed address | The email arrives; the home page's assets load from the CDN address |
| 8 | US1 | With a Valkey client on the new cluster: `SELECT 1`, `DBSIZE` after scenario 6 | Greater than 0 (FR-022) |
| 9 | US1 | Change one non-secret setting, `terraform plan` | Exactly that one change |
| 10 | US3 | Merge a visible change to `main`, `npx tsx devScripts/deploy-app.ts` | Phases printed, `ACTIVE`, exit 0, change live |
| 11 | US3 | Unset `DIGITALOCEAN_TOKEN`, run the deploy command | Exit 2 with a message naming the variable |
| 12 | US2 | `git ls-files` and a search of committed files for each secret value | None found; `git check-ignore infra/secrets.auto.tfvars infra/terraform.tfstate` lists both (SC-003) |
| 13 | US4 | `Test-Path .do/app.yaml`; search docs for `.do/app.yaml` | `False`; no current reference |
| 14 | All | `npm test` | All suites pass, `tests/infra-config.test.ts` and `tests/deploy-app.test.ts` included |


(base) PS C:\Windows\System32> terraform version
Terraform v1.17.1
on windows_386


## Notes

Meanwhile, /speckit-implement finished. Every task that doesn't need DigitalOcean is done: 23 of 33. The 10 left are operator steps, and none of them has run.

  What changed:
  - New in infra/:
    - the Terraform files: versions.tf, providers.tf, variables.tf, databases.tf, spaces.tf, fcaptcha.tf, app.tf, outputs.tf;
    - secrets.auto.tfvars.example;
    - .terraform.lock.hcl, generated, with hashes for Windows, Linux and macOS.
    - The 67 non-secret web settings were copied from .do/app.yaml. ENV_SPACES_BUCKET and ENV_SPACES_CDN_URL are built from the bucket and CDN resources.
  - New deploy command: devScripts/deploy-app.ts, tested by tests/deploy-app.test.ts.
  - New test: tests/infra-config.test.ts.
  - Deleted: .do/app.yaml.
  - Changed tests: two checks in tests/config.test.ts read .do/app.yaml, so I moved them to infra/app.tf. No task covered this.
  - .gitignore: the four Terraform lines, plus !devScripts/deploy-app.ts.
  - Docs:
    - README.md: deployment section rewritten around infra/;
    - ARCHITECTURE.md: deployment section;
    - CLAUDE.md: deployment and secrets lines;
    - .claude/rules/environment.md, CLAUDE_COMPLETE.md and devScripts/load/README.md: references to .do/app.yaml replaced.
  - Outside the task list:
    - the /speckit-trim-claudemd skill's templates, so a trim doesn't bring back the old .do/app.yaml lines;
    - a note in the quickstart prerequisites recording the Terraform check.

  Worth knowing:
  - allowed_emails is required in Terraform, so the allowlist can't be switched off by leaving it empty. At launch, remove its check from infra/variables.tf. The README says so.
  - The provider hides the contents of every env setting in a plan, secret or not. Scenario 9 will show one changed env setting without its value.
  - ENV_DATABASE_CA_CERT and ENV_FCAPTCHA_URL are ordinary (non-secret) settings, as in .do/app.yaml. Task T012 had listed them among the secret ones.
  - git grep ".do/app.yaml" outside specs/ and requirements/ still finds old mentions in architecture/, prototypes/ and research/. They're feature history, so I left them.

  Still to do (operator, against DigitalOcean): T001 (install), T008 (fill in the secrets file), T016 (real plan, commit the lock file), T017–T021 (the switch-over), T025, T032. The runbook is in specs/20261103-114927-PROVISION-FCAPTCHA-SERVICE/quickstart.md. Nothing has been committed.