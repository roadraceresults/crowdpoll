Start a new spec for these requirements called `20261103-114927-PROVISION-FCAPTCHA-SERVICE`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

We are ready to provision the `fcaptcha` service and the required `ingress` on Digital Ocean.  
The .do/app.yaml has the necessary settings.  
We will put the set FCAPTCHA secrets in the file when used.  

~~We want to be absolutely sure that the current `web` service and the databases are not changed in any way.~~  
_(Withdrawn 2026-11-03 12:26 PM: see Additional Requirements (2026-11-03 12:26 PM).)_  

How do we automatically do that provisioning without clicking around the console?


## Decisions

- **IN1 — Only `fcaptcha` and `ingress` are provisioned.**  
  The script takes from `.do/app.yaml` only `services[name=fcaptcha]` and `ingress`;  
  `web` keeps its live spec.  
  The four `ENV_FCAPTCHA_*` variables on `web` in `.do/app.yaml` describe a later, separate step (turning the human check on), which is out of scope.  
- **IN3 — The submitted spec is always the live spec plus those two blocks.**  
  `.do/app.yaml` is never submitted whole (it has no `domains` and holds `""` for every secret).  
  The script stops if `ENV_FCAPTCHA_ALLOWED_HOSTNAMES` does not name every domain of the live spec's `domains`.  
- **RS2 — A guard before submitting and a check after, both against the saved live spec.**  
  - Before: the proposed spec without `services[fcaptcha]` and `ingress` must equal the live spec without them, as canonical JSON; any other difference stops the run.  
  - Before: every SECRET env outside `fcaptcha` must be an `EV[...]` value.  
  - The update is submitted with `update_all_source_versions: false`.  
  - After: the new active deployment's `web` commit equals the previous one, and `web`'s component spec and `databases` equal the backup's;  
    otherwise the run prints the rollback (re-submit the backup).  
- **AM1 — "The databases are not changed" means their configuration.**  
  The clusters' size, version, users, trusted sources and eviction policy, and the spec's `databases` entries, stay as they are;  
  the run makes no call to the databases API.  
  FCaptcha's keys in Valkey database 1 are expected; PostgreSQL and Valkey database 0 are not touched by `fcaptcha`.  
- **UA2 — The credential is a custom-scoped DigitalOcean token.**  
  Apps read and update only, short expiry, passed in the session as `DIGITALOCEAN_TOKEN`, never written to a file, and revoked or left to expire after the run.  
  It is a dev script's input, not an `ENV_*` setting.  
  The app is found by name (`crowdpoll`) or `--app-id`; the script logs neither the token nor any decrypted value.  
- **UA3 — Dry run by default, `--apply` to submit, checks after, and the backup as the rollback.**  
  - Without `--apply` the script prints the spec diff and the propose endpoint's monthly cost, and submits nothing.  
  - Before each submit the live spec is saved to a git-ignored file (e.g. `devScripts/app-spec-backups/<timestamp>.json`, encrypted values only).  
  - After the deployment is `ACTIVE`: RS2's checks, `https://crowdpoll.vote/fcaptcha/health` answers, `/fcaptcha/fcaptcha.js` loads, and `web`'s `/healthz` answers as before.  
  - On a failed deployment or check, the script prints the `--restore <file>` command that re-submits the backup.  
- **UA4 — The script is idempotent and stays the way `fcaptcha` is changed.**  
  With `fcaptcha` already live, a rerun keeps its `EV[...]` secrets and replaces only its other fields with `.do/app.yaml`'s;  
  with no difference it submits nothing.  
  `--rotate-secrets` generates new secrets.  
  `fcaptcha` keeps its commit unless `--rebuild-fcaptcha` is given, and `web` always keeps its commit.  
- **UA5 — Deprecated `routes` on `web` stop the run.**  
  If the live `web` has a `routes:` entry, the script stops and reports it;  
  `--convert-routes` then allows exactly the removal of `web.routes` whose rule is `/`, as the one permitted change to `web`.  

## Additional Requirements (2026-11-03 12:26 PM)

After reading the Research Results, it seems like using Teraform will be a great way to provisional all parts necessary for CrowdPoll, including the web service and ther database components.  
Since Crowdpoll is still only available to test users, there is no risk of downtime, or losing data in the databases.  
The only reason we wrote "We want to be absolutely sure that the current `web` service and the databases are not changed in any way." is that we didn't want to manually fix changes made that are already working well.  
However, if using Teraform going forward means we do not need to make any manual changes to the live app spec, 
then we are willing to tweak what is being provisioned by Terraform as needed.  
So, remove the requirement of "We want to be absolutely sure that the current `web` service and the databases are not changed in any way." from the high-level requirements.  
Please adjust the Findings section to reflect that the requirement of not changing the current `web` service and databases is no longer applicable. 

## Decisions (2026-11-03 1:32 PM)

- **IN4 — The earlier Decisions IN1, IN3, RS2, AM1, UA3, UA4 and UA5 are superseded by Terraform.**  
  Still in force from them: the custom-scoped token (UA2, its scopes now covering every resource Terraform manages);  
  the check that `ENV_FCAPTCHA_ALLOWED_HOSTNAMES` names every domain of the app (IN3);  
  and the after-deploy checks that `https://crowdpoll.vote/fcaptcha/health` answers, `/fcaptcha/fcaptcha.js` loads and `web`'s `/healthz` answers (UA3).  
  `terraform plan` is the dry run, `terraform apply` the submit, and reverting the configuration and applying again the rollback.  
- **RS1 — Terraform provisions CrowdPoll** (option C), with the `digitalocean/digitalocean` provider.  
- **RS3 — The provider is pinned to an exact version in `required_providers`.**  
  The first step is `terraform version` on this machine (or OpenTofu's `tofu version`), to prove the binary runs under its Application Control policy.  
  If the app resource refuses `engine: VALKEY` for the Valkey attachment, it is reported as a provider gap, not worked around by hand.  
  The import step of RS3 does not apply: NC2 builds a fresh stack, whose first `terraform plan` is reviewed instead.  
- **NC1 — Terraform manages every DigitalOcean resource of CrowdPoll** (option A):  
  the app (`web`, `fcaptcha`, the ingress and the domain), the PostgreSQL and Valkey clusters and their firewalls, OpenSearch if it is used, the Spaces bucket and its CDN;  
  not DNS, and not Amazon SES.  
- **NC2 — Terraform builds a fresh stack, and the old one is retired** (option B).  
  The test users' accounts and polls are not carried over; that is accepted, since CrowdPoll has only test users.  
- **NC3 — The human check is turned on in the same apply** (option A).  
  `web` gets `ENV_FCAPTCHA_ENABLED=1`, `ENV_FCAPTCHA_URL=${fcaptcha.PRIVATE_URL}`, `ENV_FCAPTCHA_SITE_KEY` and the shared verify secret, and is deployed at `main`'s current commit.  
- **IN5 — Terraform is the only description of the app** (option A).  
  `.do/app.yaml` is deleted, and the README, `ARCHITECTURE.md` and `CLAUDE.md` say so.  
- **IN2 and UA8 — Secrets.**  
  Secret values that exist outside Terraform (`ENV_BETTER_AUTH_SECRET`, the SES keys, the Spaces keys, the `ENV_OAUTH_*` values when used) are kept in a git-ignored local variables file (IN2, option C), read as `sensitive` Terraform variables;  
  that file takes the place of UA8's `TF_VAR_*` session variables.  
  The two FCaptcha secrets are generated by Terraform's `random_password`, so `web` and `fcaptcha` get the same verify secret with nothing copied by hand.  
  No secret is in a committed file; database URLs and CA certificates stay bindable variables.  
- **UA7 — The Terraform state is a local, git-ignored `terraform.tfstate`** (option C).  
  It holds every secret in plain text and is the only copy, so it is backed up by the operator.  
- **AM2 — A rolling replacement of `web` with the same build counts as unchanged** (option A).  
- **UA6 — `${valkey….DATABASE_URL}/1` is kept** (option A).  
  The apply must accept it, and after the deploy `fcaptcha`'s health and one challenge must work;  
  that FCaptcha's keys are in database 1 is checked once by hand with a Valkey client.  

## Decisions (2026-11-03 1:37 PM)

- **UA1 — `doctl` is not used; Terraform runs on this machine** (Developer Resolution C).  
  Terraform's provider calls the DigitalOcean API directly.  
  Whether `terraform.exe` runs under the Application Control policy is checked first (RS3);  
  if it is blocked, OpenTofu is tried, then Smart App Control's setting is reviewed.  

## Decisions (2026-11-03 1:42 PM)

- **UA9 — The old stack is deleted first, then Terraform applies everything once with the same names** (option B).  
  The cluster names (`db-pgsql-tor1-crowdpoll`, `valkey-tor1-crowdpoll`), the Spaces bucket `crowdpoll`, `ENV_SPACES_CDN_URL` and the domain `crowdpoll.vote` stay as they are.  
  The site is down from the deletion until the apply finishes, which is accepted since CrowdPoll has only test users.  
  If the apply fails, nothing is running until it is fixed and applied again;  
  if a deleted bucket name cannot be reused at once, the apply waits for it or the bucket gets a new name.  

## Decisions (2026-11-03 1:56 PM)

- **AM3 — No OpenSearch cluster now.**  
  `ENV_OPENSEARCH_URL` stays unset, so the home search keeps using PostgreSQL full-text search;  
  adding a cluster later is a Terraform change of its own.  
- **UA10 — The old stack is deleted once in the console, then Terraform applies** (option B).  
  The old app, the PostgreSQL and Valkey clusters and the Spaces bucket (emptied first) are deleted by hand;  
  this is the one console step of the feature, and it is done only after UA11's variables file is complete.  
- **UA11 — The variables file is filled before anything is deleted.**  
  - `ENV_BETTER_AUTH_SECRET`: a new random value.  
  - The SES keys: a new access key for the same IAM user, the old one deactivated after the new stack sends mail.  
  - The Spaces keys: a new key pair, used by `web` and by the provider (`spaces_access_id`, `spaces_secret_key`); the old one revoked after the switch.  
  - `ENV_ALLOWED_EMAILS` and any `ENV_OAUTH_*` values: from the operator's records or the providers' consoles.  
  - The deletion (UA10) is not started while any variable of the file is empty.  
- **UA12 — The Terraform configuration lives in a top-level `infra/` folder.**  
  Committed: `infra/*.tf`, `infra/.terraform.lock.hcl` and `infra/secrets.auto.tfvars.example` (every variable, empty).  
  Git-ignored: `infra/.terraform/`, `infra/*.tfstate`, `infra/*.tfstate.*` and `infra/secrets.auto.tfvars`.  
  The README, `ARCHITECTURE.md` and the `CLAUDE.md` invariants point to `infra/` in place of `.do/app.yaml`.  
- **UA13 — Autodeploy stays off; a deploy is started by one API call** (option A).  
  A small committed script sends `POST /v2/apps/{id}/deployments` with the same token, so a release needs neither the console nor `doctl`.  
