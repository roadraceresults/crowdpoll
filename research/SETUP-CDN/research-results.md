# Overview: research/SETUP-CDN

## Document History

| Record | Value |
|---|---|
| Research requirements directory | `research/SETUP-CDN` |
| Research results file created | 2026-10-06 02:18 |
| Last updated | 2026-10-07 09:59 |

Legend: `[ ]` open · `[X]` resolved · `[-]` resolved manually (or accepted as-is) by the developer.

"What's next" always returns the first `[ ]` item.

# Findings

## Spaces bucket with its CDN — what the application already does

**What was found**

- Four objects are published, two per tab: `trending-counts.json`, `trending.json`, `newest-counts.json`, `newest.json` (`src/trending/publish.ts:11-12`). The counts object is written every sweep; the cards object only when the membership version changed (`publish.ts:53-62`).
- Each is gzipped and written with `Content-Type: application/json; charset=utf-8`, `Content-Encoding: gzip`, `Cache-Control: public, max-age=<recompute interval in s>` (`publish.ts:48-51`) and `ACL: public-read` (`publish.ts:33`). Keys are at the bucket root.
- The client is `S3Client` against `https://<region>.digitaloceanspaces.com`, virtual-host style, with the key/secret from config (`publish.ts:19-25`). Nothing creates the bucket, the CDN, CORS rules or lifecycle rules.
- Configuration is five variables, all or none (`src/config.ts:296-315`): `ENV_SPACES_BUCKET`, `_REGION`, `_KEY`, `_SECRET`, `_CDN_URL`. Without them the store is `null` (`src/server.ts:65`) and the instances serve the same objects at `/api/trending/*` with `Cache-Control` and `ETag` (`src/routes/tabsApi.ts:61-93`).
- The browser learns the base URL from `/api/config`: `trendingBaseUrl` is the CDN URL without a trailing slash when Spaces is configured (`src/routes/api.ts:89`), and `trending.js` / `newest.js` fetch `base + "/trending-counts.json"` etc. with `fetch(url, { cache: "no-cache" })` (`src/public/trending.js:18, 64-67, 77+`). Those are **cross-origin** requests from the app's origin to the CDN origin.
- The same bucket also carries static assets under `assets/` (`src/routes/assets.ts:18`, `devScripts/publish-assets.ts:31-38`, `Cache-Control: public, max-age=31536000, immutable`, uploaded by `npm run publish-assets`, which is a separate manual/build step, `README.md:166`).
- `.do/app.yaml` names `ENV_SPACES_BUCKET: crowdpoll`, `ENV_SPACES_REGION: tor1`, `ENV_SPACES_CDN_URL: https://crowdpoll.tor1.cdn.digitaloceanspaces.com` (as edited by the developer; the committed file had `nyc3`); `ENV_SPACES_KEY`/`ENV_SPACES_SECRET` are declared SECRET with empty values.
- No CORS handling exists anywhere in `src/` or `.do/` (grep for `CORS` / `Access-Control` finds nothing).

## What needs to be done to make this work (TRENDING and NEWEST)

**What it would take** — nothing in the code; it is all provisioning, in this order:

1. **Create the bucket** `crowdpoll` in the Spaces region chosen in `.do/app.yaml` (now `tor1`, same as the app; that Spaces offers TOR1 is unconfirmed — see "`.do/app.yaml` as edited by the developer"; the endpoints in the steps below follow whatever region is confirmed). Leave **File Listing restricted** (the app only needs GET by exact key, so listing need not be public).
2. **Create a Spaces access key pair** (Spaces keys, not a personal API token). Prefer a *limited-access key* with read/write/delete on this bucket only, if the account's plan offers it; otherwise a full-access key. Always a dedicated pair named for this app.
   - Chosen (2026-10-06 14:30, from the console screenshot `dontTrack/DO-spaces-key.jpg`): scope **Limited Access**, bucket `crowdpoll` ticked, name `crowdpoll-app` (letters, digits, dashes, periods only). The app makes only `PutObject` calls (`src/trending/publish.ts:28-38`), so Full Access (all buckets, CORS, policies, bucket creation) is more than it needs; Limited keys are incompatible with `PutBucketPolicy`, which the app never uses. Permission level: Read/Write/Delete on that bucket is recommended, because every upload sends `ACL: public-read` (`publish.ts:33`) and it was not confirmed which lower level permits that; if the first publish fails with access denied, check this first. CORS and the CDN are set with the owner's login in the bucket settings, not with this key.
   - Where: control panel → Spaces Object Storage → **Access Keys** → **Generate New Key**. The secret is shown **once**; copy both values straight into the app's settings, never into a file, git or chat. A lost secret means generating a new key.
   - Where they go (2026-10-06 15:11, from `dontTrack/DO-app-env-vars.jpg`): as **encrypted** environment variables `ENV_SPACES_KEY` and `ENV_SPACES_SECRET` on the **web service component**, not in the app-level list. The app-level page says a component variable with the same key overrides an app-level value, and `.do/app.yaml` declares both at the component level with empty values, so an app-level entry would be overridden by the empty ones and the app would keep failing (`src/config.ts:304-312`). In the console: app → Settings → the `crowdpoll` Web Service component box (under "Components:") → Environment Variables → edit each variable, paste the value, tick *Encrypt*, save (this redeploys); add the variable there if it is not listed. The same applies to `ENV_BETTER_AUTH_SECRET`, `ENV_SMTP_USER` and `ENV_SMTP_PASS`. The app already exists (`brooksapps`, TOR1, component `crowdpoll`, status "First deploy failed"), so these are edits, not wizard entries; menu labels are from the screenshots.
   - `.do/app.yaml` keeps them as `type: SECRET`, `value: ""`. Whether re-applying that spec (for example `doctl apps update --spec`) blanks stored secrets or keeps them was not verified: check the values after any spec update.
   - Both are `RUN_AND_BUILD_TIME`, so they are available to a build-time `npm run publish-assets` (see the clarification on who publishes the assets).
   - Rotation: generate a new pair, update both values and redeploy, then delete the old key.
   - **Verified from a workstation (2026-10-06 17:02):** `npm run publish-assets` uploaded the fingerprinted assets to the `crowdpoll` bucket in `tor1` with a Limited Access key, so the bucket, the key's write permission (including the `ACL: public-read` upload) and the code's `https://tor1.digitaloceanspaces.com` endpoint all work. That script reads the five `ENV_SPACES_*` variables from the **shell**, not from `.vscode/launch.json` (which only applies to VS Code debug launches); they came from the git-ignored `devScripts/launch-dev.ps1`, dot-sourced.
   - **Lessons from the first attempts:** (1) `ConfigError: … ENV_SPACES_KEY, ENV_SPACES_SECRET must be set` meant the shell variables were empty (`config.ts:304-312`). (2) `403 InvalidAccessKeyId` meant `ENV_SPACES_KEY` held the key's *name* (13 characters, `crowdpoll-app`) instead of its access key ID (about 20 characters, starting `DO`). (3) The secret is shown once at creation and cannot be retrieved; a lost secret means generating a new pair and deleting the old key.
   - **Not yet verified:** that the CDN is enabled on the bucket and serves the uploaded files at `crowdpoll.tor1.cdn.digitaloceanspaces.com`; the CORS rule; and that the same key ID and secret are set, encrypted, on the `crowdpoll` web service component.
3. **Enable the CDN** on the bucket (Settings → CDN → Enable). This yields the `…<region>.cdn.digitaloceanspaces.com` endpoint (`…tor1…` while the region is `tor1`) that `ENV_SPACES_CDN_URL` already holds. Decided: the default endpoint is used, not a custom domain. Do **not** use the origin endpoint (`…<region>.digitaloceanspaces.com`) as the CDN URL: it would bypass the edge cache.
4. **Set the bucket's CORS policy** to allow `GET` and `HEAD` from the app's origin(s), with `If-None-Match` in allowed headers and `ETag` exposed. This is required: the tabs fetch the objects cross-origin with `cache: "no-cache"`, which sends `If-None-Match`, and without an `Access-Control-Allow-Origin` response the browser discards the response and the tabs stay empty. Web fonts, if ever served from the CDN, need it too. Spaces CORS is set in the control panel (Settings → CORS Configurations) or with `s3cmd`/the S3 API `PutBucketCors`.
   - How (2026-10-06 17:48; menu labels from memory, not seen in the console): with the owner's login, not the `crowdpoll-app` key (Limited Access keys cannot change bucket configuration) — Spaces Object Storage → bucket `crowdpoll` → Settings → CORS Configurations → Add, one rule per origin. Allowed methods `GET` and `HEAD`; allowed headers `If-None-Match` (or `*`); max age `3600`; exposed header `ETag` if the form has the field. Origins: `http://localhost:8080` (local runs against the CDN), `https://crowdpoll.vote`, `https://www.crowdpoll.vote`, and the app's default URL, now known: `https://officialsurveyvote-app-7auec.ondigitalocean.app` (the Overview page shows no URL before that, `dontTrack/DO-app-overview.jpg`).
   - Test: `curl.exe -I -H "Origin: <origin>" https://crowdpoll.tor1.cdn.digitaloceanspaces.com/newest-counts.json` (in PowerShell `curl.exe`, not `curl`) must show `access-control-allow-origin: <origin>`; then refresh the Newest tab and check the browser's network and console panels for CORS errors.
   - Risks, not verified: with several origins the CDN might cache one origin's `access-control-allow-origin` and serve it to the others, in which case one `*` rule is the fallback (every object is already public-read); a CDN copy cached before the rule existed may lack the header for up to its TTL.
   - **Status (2026-10-07 09:59): verified.** `curl.exe -I -H "Origin: <origin>" https://crowdpoll.tor1.cdn.digitaloceanspaces.com/trending-counts.json` returns `200` with `access-control-allow-origin` equal to the origin sent, for `https://officialsurveyvote-app-7auec.ondigitalocean.app`, `https://crowdpoll.vote`, `https://www.crowdpoll.vote` and `http://localhost:8080` (the request URL stays on the CDN; the Origin header is only the asker; the domains need no DNS for this test). The rule allows `GET` only (not `HEAD`), which is all the app uses. The response also carries `vary: Origin` (the CDN caches per origin, so one origin's header is not served to another), `cache-control: public, max-age=60`, and `cf-cache-status: EXPIRED` with a `last-modified` one second old: the CDN honors the object's `Cache-Control` and refreshes after 60 s, which answers the open question under step 5.
5. **Set the CDN edge TTL no higher than the recompute interval** (default 60 s, `ENV_TRENDING_POLLS_RECOMPUTE_INTERVAL` / `ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL`). The publisher sets `max-age` on each object, but the CDN's own TTL setting is configurable (the default is far longer); whether the CDN honours the object's `Cache-Control` over its configured TTL must be confirmed on the live endpoint (see the verification step). If it does not, set the TTL to 60 s (the minimum accepted may be higher than 60 s — check) and note that the tabs then lag by the TTL.
6. **Redeploy** with the key pair set. The next sweep (each is lock-guarded and runs at start, so within a minute) writes the four objects; no manual upload is needed. Run `npm run publish-assets` with the same five variables for the static assets (it must run after `npm run build` and before or with each deploy, since the pages then reference fingerprinted assets on the CDN — if the assets are missing from the bucket the pages lose their scripts and styles, because `assetsBaseUrl` switches to the CDN as soon as Spaces is configured, `routes/api.ts:90`, `routes/assets.ts:18`).
7. **Verify** (read-only checks): `curl -I <cdnUrl>/trending-counts.json` shows `200`, `content-encoding: gzip`, `cache-control: public, max-age=60`, an `etag`, and a CDN cache header on the second call; `curl -I -H "Origin: <app origin>" …` shows `access-control-allow-origin`; a conditional request with `If-None-Match` returns `304`; open the app signed out, click Trending and Newest, and confirm the network tab shows the objects from the CDN host and no CORS errors.

**Recommendation** — follow the six steps above in that order; it needs no code change. The one trap is step 6's asset coupling: turning Spaces on moves *all* static assets to the CDN, not just the two tabs, so `publish-assets` must be part of the deploy (a clarification below asks how).

## Failure and rollback behaviour

**What was found** — Spaces is all-or-none (`config.ts:308-312`); misconfiguration is a startup `ConfigError`, so a half-set environment cannot deploy. A failed `PutObject` rejects `publish()`; the sweep's own handling of that was not traced in this pass. If Spaces is unset, behaviour reverts to instance serving with no other change (`server.ts:65`, `tabsApi.ts`).

**Recommendation** — keep the instance fallback as the rollback path: clearing the five variables and redeploying restores `/api/trending/*` and `/assets` with no data loss. First-time cut-over order: provision → set keys with `ENV_SPACES_CDN_URL` **last** → run `publish-assets` → verify objects exist → redeploy. Because the variables are all-or-none this is one redeploy, so the objects and assets should be uploaded to the bucket *before* that redeploy (publish-assets can be run from a workstation with the same keys).

## Sizing and cost (indicative, not verified)

**What was found** — four small gzipped JSON objects; the counts object is rewritten every 60 s (about 1,440 PUTs per object per day, ~2,900 for both tabs' counts), the cards objects only on membership change. Egress is served by the CDN edge, so origin reads are a handful per edge per TTL.

**Recommendation** — the base Spaces subscription (storage + transfer allowance) covers this; no plan decision is needed beyond the account having Spaces enabled. Pricing and the CDN TTL minimum are platform facts that change; confirm on the DigitalOcean pricing page before relying on them.

## Provisioning state and prerequisites before the first deploy

**What was found** (from the developer's screenshots of the DigitalOcean and Namecheap consoles, `dontTrack/DO-databases-01.jpg`, `dontTrack/DO-add-domains.jpg`, `dontTrack/name-cheap-dns.jpg`, and `.do/app.yaml`):

- Provisioned so far: one managed PostgreSQL cluster, `db-pgsql-tor1-crowdpoll` — PostgreSQL **18**, 1 GB / 1 vCPU / 10 GiB, primary only, region **TOR1**. Nothing else exists: no app, Valkey, OpenSearch, Spaces bucket, or environment variables. The domain `crowdpoll.vote` is registered at Namecheap and its nameservers are not yet set.
- The *committed* `.do/app.yaml` disagreed with that: `region: nyc` (line 5), a `databases:` entry that would create a *new* cluster `crowdpoll-pg` at version `"16"` (not the existing one), and `github.repo: roadraceresults/nativeAuthOAuth` (line 9) while `git remote` and `CLAUDE.md` name `roadraceresults/crowdpoll02`.
- The test suite runs on `embedded-postgres` **16.14** (`package.json:36`), so no automated run has exercised PostgreSQL 18.
- A project named `brooksapps` in TOR1 exists in the console with "First deploy failed"; it is not this spec's app (name `crowdpoll`). The likely cause of a failed start with this spec is `config.ts:304-312`: `ENV_SPACES_KEY`/`ENV_SPACES_SECRET` are empty in `app.yaml`, empty counts as unset, and the five Spaces variables are all-or-none, so the process throws a `ConfigError`. This is a hypothesis; the deploy logs were not seen.
- Email: `ENV_SMTP_HOST` is `sandbox.smtp.mailtrap.io` and `ENV_SMTP_FROM` is `NativeAuthOAuth <no-reply@nativeauth.local>` (`app.yaml`; defaults at `src/config.ts:252-256`). A mail sandbox does not deliver to real inboxes, so no real user could receive a sign-in link. (Accepted for the internal development phase; see the SMTP clarification.)
- With 4–12 instances (the committed spec; the developer's working copy now runs 1 instance, 2026-10-06 18:29), Valkey is not optional in practice for a fleet: sessions, refresh floors, the request budget, vote counters and queue are shared through it (`CLAUDE.md`, `README.md:190-196`). OpenSearch is optional (PostgreSQL full-text search is the fallback).
- DigitalOcean allows attaching a custom domain to an app only after the app has deployed successfully; adding the domain to DigitalOcean DNS and changing the Namecheap nameservers does not depend on the app.

**What it would take**

1. Settle the region (see the clarification below) and confirm which regions offer Valkey, OpenSearch and Spaces.
2. Create Valkey in the chosen region; optionally OpenSearch.
3. Create the Spaces bucket `crowdpoll`, enable its CDN, create a dedicated key pair; set CORS once the origin is known.
4. Create a connection pool on the database and use its URL for `ENV_DATABASE_URL` (`README.md` says to use the pool's URL).
5. Choose and configure a real SMTP provider and sender address; generate `ENV_BETTER_AUTH_SECRET`.
6. Correct `.do/app.yaml` (region, database reference to the existing cluster, repo, SMTP values) and create the app.
7. After a successful deploy: attach `crowdpoll.vote`; set Namecheap to Custom DNS with `ns1/ns2/ns3.digitalocean.com`, and add the domain to DigitalOcean DNS (this part can be done earlier).

**Recommendation** — keep the app, database, Valkey and OpenSearch in the same region as the database (TOR1, if offered) so they share a private network; use the nearest Spaces region; and do the steps in the order above so that the first deploy has every variable it needs. Use Namecheap **Custom DNS** with DigitalOcean's nameservers: BasicDNS would need hand-made records and an ALIAS record at the apex, and Web Hosting DNS applies only to Namecheap's own hosting. Custom DNS stops Namecheap's redirect and email-forwarding features, which this project does not use.

## `.do/app.yaml` as edited by the developer (checked 2026-10-06 13:15)

**What was found** (working-tree `.do/app.yaml`, uncommitted):

- Changed by the developer: `region: tor1`; `ENV_SPACES_REGION: tor1`; `ENV_SPACES_CDN_URL: https://crowdpoll.tor1.cdn.digitaloceanspaces.com`; the `db` entry is now PostgreSQL `"18"` with `cluster_name: db-pgsql-tor1-crowdpoll` (the existing cluster); the `cache` and `search` entries name `valkey-tor1-crowdpoll` and `search-tor1-crowdpoll`.
- Also changed since (2026-10-06 18:29, working-tree file): `github.repo` is now `roadraceresults/crowdpoll02`; `deploy_on_push` is `false`; `min_instance_count` and `max_instance_count` are both `1` (the committed file had 4 and 12); `ENV_DATABASE_URL` is `${db.crowdpoll.DATABASE_URL}` (the pool). The component in the console reads "1 Instance" and an estimated $12.00/month (`dontTrack/DO-app-overview.jpg`).
- Not yet changed: `ENV_SMTP_HOST`/`ENV_SMTP_FROM` are still the Mailtrap sandbox and `no-reply@nativeauth.local`; the five secrets (`ENV_SPACES_KEY`, `ENV_SPACES_SECRET`, `ENV_BETTER_AUTH_SECRET`, `ENV_SMTP_USER`, `ENV_SMTP_PASS`) are empty.
- `git diff` reports every line of the file as changed, which points to a line-ending change (CRLF vs LF) rather than content; not verified.
- This supersedes the earlier finding's statement that the spec says `nyc`/`nyc3`; that held for the committed file only.

**What it would take / still to verify before deploying**

1. **Valkey and OpenSearch must already exist.** With `production: true`, a `databases:` entry names an existing cluster. Only the PostgreSQL cluster has been seen provisioned. Create `valkey-tor1-crowdpoll` (required for a multi-instance deploy) and, optionally, `search-tor1-crowdpoll`, with exactly those names — or drop the entries and the `ENV_OPENSEARCH_URL` line (OpenSearch only; Valkey is needed).
2. **Spaces in TOR1 — confirmed (2026-10-06 14:30).** The developer's console screenshot (`dontTrack/DO-spaces-key.jpg`) lists a bucket `crowdpoll` in `tor1` (0 bytes, 0 items), so the region exists and `ENV_SPACES_REGION: tor1` is valid; what follows is the original reasoning, kept for the record. It was **unconfirmed**: Earlier this research believed Spaces had no Toronto region; that was not verified either way. The bucket, its CDN endpoint `crowdpoll.tor1.cdn.digitaloceanspaces.com` and the S3 endpoint the code builds (`https://tor1.digitaloceanspaces.com`, `src/trending/publish.ts:22`) are only valid if the region exists. Confirm by creating the bucket; if TOR1 is not offered, revert both values to the nearest region (e.g. `nyc3`).
3. **Connection pool and the database URL (2026-10-06 18:58).** Settings chosen for the pool `crowdpoll` on `defaultdb` (`dontTrack/DO-connection-pool.jpg`): **User privileges override** left at *Use inbound user*; **Pool mode: Transaction** (also the console's recommendation) — the code's cross-instance sweep locks are transaction-scoped, `pg_try_advisory_xact_lock` (`src/polls/sweeps.ts:64-70`), and a scan of `src/` found no session-level settings, listen/notify or temporary tables; avoid Statement mode, because the app runs multi-statement transactions (`db.transaction()` in `src/polls/store.ts`, `bookmarks.ts`); **Pool size 20** of the 22 backend connections available. PgBouncer shares those 22 among up to 5000 client connections; the app opens up to 20 per instance (`POOL_MAX`, `src/db/client.ts:7`).
   - **What is in use now:** `ENV_DATABASE_URL` is the database's **direct** connection, `${db-pgsql-tor1-crowdpoll.DATABASE_URL}`, set on the web service component, Run time, encrypted; the console's editor validated and saved it, and `.do/app.yaml` carries the same value. The component's name is the cluster's (`db-pgsql-tor1-crowdpoll`), not `db` (component names confirmed from the console's app spec, which also has `db_name: defaultdb`, `db_user: doadmin`, Valkey `version: "9"`). With one instance the app's pool (max 20) fits inside the database's 22 connections, so the pool is not needed yet.
   - **The pool placeholder, for later:** DigitalOcean's page (`dontTrack/DO-env-var-connection-pools.jpg`, https://docs.digitalocean.com/products/app-platform/how-to/connect-pg-pools/) gives `${<database component>.<pool>.DATABASE_URL}`, set under *App-Level* Environment Variables "once the app redeploys". The component-level editor rejected `${db-pgsql-tor1-crowdpoll.crowdpoll.DATABASE_URL}` and the `defaultdb` variant before any deploy; the likely reason is that the app had not yet redeployed with the pool known (not confirmed). When a second instance is added: try it on the component after a successful deploy; if still rejected, set it at app level and delete the component's own `ENV_DATABASE_URL` (a component variable overrides an app-level one with the same key).
   - **Valkey:** the component is `valkey-tor1-crowdpoll`; `ENV_VALKEY_URL` is `${valkey-tor1-crowdpoll.REDIS_URL}` in `app.yaml`; the old console value `${cache.REDIS_URL}` was flagged invalid and must be replaced; whether the variable is `REDIS_URL` or `DATABASE_URL` is unverified. The console app has no OpenSearch component, so `ENV_OPENSEARCH_URL` must not be set there.
   - **Scope and encryption:** the console showed these variables as "Run and build time" and unencrypted; `app.yaml` says `RUN_TIME`, `type: SECRET`. The developer reports that the secret variables are now **encrypted** in the console (2026-10-06 21:09). The developer also reports their scope is now **Run time** (2026-10-06 21:10). `ENV_SPACES_KEY` and `ENV_SPACES_SECRET` are `RUN_AND_BUILD_TIME` in `app.yaml` (so a build-time `publish-assets` could read them); with Run time only they are not available during the build, which matters only if the assets upload is moved into the build command (see that clarification).
   - **Unverified TLS risk:** `createDb` passes only the URL to `pg` and sets no `ssl` option (`src/db/client.ts:19`). With a DigitalOcean `sslmode=require` URL, newer `pg` versions may fail with "self-signed certificate in certificate chain"; not tested for this version. Watch the first start for `[server] Database schema is up to date`; if the error appears it needs a code or URL change (a fix, not research).
4. **PostgreSQL 18 (updated 2026-10-07 08:40): kept, see the resolved clarification.** The six migrations applied on the platform's PostgreSQL 18; the automated suite has still not been run against 18. Original note: **untested.** The suite uses `embedded-postgres` 16.14 (`package.json:36`). Keep 18, but run the migrations and the suite against an 18 server before the first deploy.
5. **Bindable variable names (added 2026-10-06 14:12).** `.do/app.yaml` binds `ENV_VALKEY_URL` to `${cache.REDIS_URL}` (and `ENV_OPENSEARCH_URL` to `${search.OPENSEARCH_URL}`). It is believed, not verified, that App Platform's bindable variable for a managed database component is `DATABASE_URL`, i.e. `${cache.DATABASE_URL}`; check DigitalOcean's app-spec reference. The name before the dot must equal the `databases:` entry's `name:` (`cache`, `search`, `db`), and the entry must name an existing cluster. Fallback if a binding does not resolve: set `ENV_VALKEY_URL` as an encrypted value in the console, never in the file. The connection string must never be written into the repository or this research; a Valkey password was pasted into the conversation and has since been reset by the developer (2026-10-06 14:12).
6. **Repo and SMTP** (see the clarifications) and the **five secrets** must be set in the console, not in the file; an empty Spaces key/secret stops the app at startup (`config.ts:304-312`).

**Recommendation** — commit the line-ending-clean file after the repo and SMTP corrections, create the Valkey cluster before the app, and confirm the Spaces region by creating the bucket first.

## Adding OpenSearch after launch

**What was found**

- Switching on is configuration only: `ENV_OPENSEARCH_URL` set and a redeploy. At startup `ensureIndex()` creates the index if absent (`src/search/openSearch.ts:90-95`, called from `src/server.ts:167-171`); from then on `search.ts:57` picks OpenSearch whenever `healthy()` is true, and `healthy()` checks only the cluster's green/yellow status, cached five seconds (`openSearch.ts:97-110`). If the cluster is unreachable, PostgreSQL full-text search serves (`ARCHITECTURE.md:412-421`).
- Without OpenSearch the outbox sweep still runs and still deletes its rows (`src/search/outbox.ts:18-38`: `engine` is `null`, nothing is indexed, the rows are cleared). Changes made while OpenSearch is absent are therefore not queued for it.
- The new index is empty and nothing tests for that, so search would use it at once and return only polls changed after the switch.
- `reindexAll(db)` (`outbox.ts:46-62`) queues every home-listable poll for indexing, but nothing calls it: no route, no script in `devScripts/`, no entry in `package.json`. Only `tests/search-home.test.ts` mentions reindexing.
- The administrator's search is a separate PostgreSQL query and is unaffected.

**What it would take** — to make a late switch safe, an operator command (for example `npm run reindex`, in the style of `npm run reconcile`) that calls `reindexAll` and lets the next outbox drains fill the index. Small, but a code change; it belongs in a fix or a new feature, not in this research. Without it, the only ways to populate the index are to edit every poll or to call the function by hand.

**Recommendation** — launch without OpenSearch unless search load or quality demands it: remove the `search` entry and the `ENV_OPENSEARCH_URL` line from `.do/app.yaml` for the first deploy (the PostgreSQL search needs nothing else). Add the reindex command before OpenSearch is enabled, and enable it in three steps: create the cluster, set the variable and deploy, run the reindex once. A production cluster also bills hourly from creation.

## Valkey: trusted sources, local testing and eviction policy

**What was found** (from the developer's screenshot `dontTrack/DO-valkey-security.jpg`, the eviction-policy list read from the console, and the cache code):

- The console's "Authorize specific inbound connections" step restricts the cluster to trusted sources; the cluster is open to all connections until one is added, and once any is added everything else is denied.
- The cluster is the one the production app will use for sessions, refresh floors, the request budget, the live vote counters and the vote queue (`CLAUDE.md`; `src/cache/valkeyCache.ts`). Running the app or `tests/cache-valkey.integration.test.ts` from a developer machine against it would write to those same keys. The integration test runs only when `ENV_VALKEY_URL` is set (`tests/cache-valkey.integration.test.ts:5-7`); these are the 15 tests skipped in the last full run. Whether it uses a key prefix or deletes only its own keys was not checked.
- Keys **without** an expiry: `cnt:<pid>` (the live vote counters, `hincrby` with no `expire`, `src/polls/counters.ts:48-51`) and the vote stream (trimmed by `xtrim` after consumption, `src/votes/consumer.ts:158`). Keys **with** an expiry: the rate and token buckets (`valkeyCache.ts:43`), per-IP vote counters (`src/votes/votePath.ts:48`), page-load counters (`src/load/pageLoads.ts:30`), the roster cache (`src/votes/rosterCache.ts:21-26`), trending buckets (`counters.ts:55`), live-results lists (`src/live/registry.ts:78,92`), and the sweep locks (`valkeyCache.ts:223`). Not every key type was audited.

**What it would take**

1. **Trusted sources:** add the developer machine's public IP (it must be re-added if the ISP changes it) and the App Platform app. Attaching the database as an app component is believed to add the app automatically; not verified — check the Network Access list after the first deploy.
2. **Connection string:** managed Valkey requires TLS, so `ENV_VALKEY_URL` is a `rediss://` URL. Whether `iovalkey` takes it unchanged was not run.
3. **Eviction policy:** set in the console and changeable at any time.

**Recommendation**

- **Eviction policy: `volatile-lru`.** Only keys with an expiry can be evicted, so the counters and the vote stream are never touched, and what is lost (buckets, caches, lists) the app rebuilds. Rejected: `allkeys-lru` and `allkeys-random` (could evict a counter or unconsumed votes: silent vote loss); `noeviction` (when memory fills every write fails, including votes and sessions); `volatile-ttl` (evicts the shortest TTL first, which are the sweep locks); `volatile-random` (no advantage over lru). Caveat: if the non-expiring data alone fills memory, `volatile-lru` has nothing to evict and writes fail as under `noeviction`, so size the cluster for the stream and counters and watch memory.
- **Local testing:** do not point the app or the integration test at the production cluster once real users exist; use a separate throwaway Valkey (for example a local container) or run the test only before launch.
- **Trusted sources:** add the dev machine only while needed, and remove it when launched if local testing then uses a separate Valkey.

## First deploy: what the logs showed (2026-10-07 06:51)

**What was found** (the developer's `dontTrack/build-log.txt` and `dontTrack/deploy-log.txt`; no connection strings were read into this record):

- **The build succeeded** (`npm ci && npm run build`, image uploaded, "build complete").
- **The start failed on TLS to the database.** `[server] Database migration failed; refusing to start: MigrationError: … self-signed certificate in certificate chain` (from `migrateToLatest`, `dist/db/migrator.js`). Before it, `pg` printed that `sslmode=require` is currently treated as `verify-full` (it will become standard libpq semantics in `pg` v9 / `pg-connection-string` v3). DigitalOcean's database certificates are signed by DigitalOcean's own authority, which Node does not trust; `createDb` passes only the URL and no `ssl` option (`src/db/client.ts:19`). This is the risk recorded earlier as unverified; it is now confirmed.
- **The health check failed on the port.** `Readiness probe failed: dial tcp …:8080: connection refused`: the platform probes 8080, the app listens on `ENV_PORT` = 9999 (`app.yaml` has `http_port: 9999`), so the console's web service still has its default HTTP port 8080. The container had already exited, so this probe error would have appeared even without the TLS failure.

**What it would take**

1. **Quick unblock (internal use):** set `ENV_DATABASE_URL` to `${db-pgsql-tor1-crowdpoll.DATABASE_URL}&uselibpqcompat=true` (the URL already ends `?sslmode=require`), which the `pg` warning itself suggests; encrypted but the server's identity is not verified. Not confirmed: that the console editor accepts a placeholder followed by extra text.
2. **Proper fix (before real users):** keep full verification by supplying DigitalOcean's CA certificate (the database component's `CA_CERT` bindable variable) to `pg` as `ssl.ca`; this needs a code change in `createDb` and an optional setting such as `ENV_DATABASE_CA_CERT` (a fix or a new feature, not part of this research).
3. **Port:** set the web service's HTTP port to 9999 (and confirm the health-check path `/healthz`), or set `ENV_PORT` to 8080. Recommended: change the HTTP port, which matches `app.yaml`.
4. **Valkey may fail the same way:** `rediss://` connections verify the certificate and DigitalOcean's Valkey certificates are also issued by DigitalOcean's authority; the Valkey connection worked from the developer's Windows machine but has not been seen working from the platform. If the next log shows a TLS error at the `[cache]` lines, that is the cause.

**Recommendation** — apply 1 and 3 now and redeploy; plan 2 (and the Valkey equivalent if needed) before any real users, and keep the item "PostgreSQL 18 is untested" in mind: the next log should show `[server] Database schema is up to date` once TLS passes.

## Second deploy: the app runs, 12 assets blocked (2026-10-07 08:35)

**What was found** (the developer's `dontTrack/deploy-log-03.txt`, `dontTrack/DO-deployment-01.jpg`, `dontTrack/DO-deployment-errors-01.jpg`; default URL `https://officialsurveyvote-app-7auec.ondigitalocean.app/`):

- **The app started.** The runtime log shows six migrations applied (PostgreSQL 18 ran them), `[cache] Using Valkey`, `[search] postgres is serving home search`, the `[spaces]` line, `[trending]` and `[newest] published counts and cards for 0 polls to Spaces bucket "crowdpoll"` (the platform's encrypted key and secret can write to the bucket), and `Listening on http://localhost:8080`. No certificate error and no `SECURITY WARNING`: the CA reached the app (that deployment predates the `[db]` log line, which was not seen). The page loads, unstyled in places.
- **12 of 21 assets were blocked** with `net::ERR_BLOCKED_BY_ORB`: `tabs.css`, `tooltip-m3.css`, `tabs-modal-m3.css`, `live-idle-prompt-m3.css`, `empty-tab-line-m3.css`, `m3-ripple.js`, `tooltip-m3.js`, `voteClient.js`, `trending.js`, `newest.js`, `searchTab.js`, `liveResults.js`. ORB blocks a cross-origin script/stylesheet response that is an error page, here the CDN's 404, because the file is not in the bucket. `GET /api/me` answered 401, which is normal for a guest.
- **Cause: the asset names are content hashes** (`sha256` of the file's bytes, `devScripts/build-assets.ts`), and the page links the hashes of the *deployed* build, built from the repository (LF line endings). The assets had been uploaded from the developer's working folder, where 20 of the 37 client files use CRLF; 17 are LF. Comparing the local `dist/public/asset-manifest.json` with hashes of the committed files: the 17 LF files match (they loaded) and the 20 CRLF files do not (for example `tabs.css`: local `90fc75ae…`, deployed `35683e73…`). Same text, different bytes, different name.

**What it would take / recommendation**

- **Immediate:** publish from a clean LF copy at the deployed commit: `git -c core.autocrlf=false clone --branch dev <repo> <dir>`, then `npm ci`, `npm run build`, load the Spaces and auth-secret variables, `npm run publish-assets`. Never from the Windows working folder.
- **Lasting (applied, see the clarification on who publishes the assets):** run `npm run publish-assets` in the platform's build command, so the uploaded bytes are the deployed bytes. It needs the Spaces key and secret and `ENV_BETTER_AUTH_SECRET` at Run-and-build-time (`publish-assets` calls `loadConfig`, which requires the auth secret) and a build with Spaces access. `tsx` is already available in the build, since `npm run build` uses it. A `.gitattributes` forcing LF would also make local and deployed hashes agree.

## Third deploy: assets fixed, CORS still open (2026-10-07 09:47)

**What was found** (`dontTrack/build-log-04.txt`, `dontTrack/deploy-log-04.txt`, `dontTrack/DO-network-errors-01.jpg`):

- **The build published the assets.** It checked out commit `bb06194…`, wrote 37 fingerprinted assets and published all 37 to the bucket (`[assets] published assets/<hash>/<file>`), then "build complete". The names are the repository's LF hashes (for example `tabs.css` `35683e73f67d4d61`, `trending.js` `0c64b82328c035a5`), the ones the deployed page links to.
- **All 12 previously blocked assets now load with 200** in the browser with the cache disabled; the page is styled.
- **The runtime log supplied (12:53) is from the previous deployment** (the build finished 13:21). It shows `[db] Verifying the database certificate against ENV_DATABASE_CA_CERT (1541 characters)`, a clean schema check, Valkey, Spaces and `Listening on http://localhost:8080`. `budgetController: another instance holds lock 8; skipped` is the rollout's old and new instances overlapping.
- **Two red lines remain.** `GET /api/me` 401 is the normal answer to a signed-out visitor. `trending-counts.json` fails with a CORS error (`trending.js:65`): the bucket has no CORS rule yet, so the Trending and Newest tabs stay empty (the database also holds no polls yet).

**Observation (2026-10-07 09:59):** the CDN's responses carry `set-cookie: __cf_bm=…` for `digitaloceanspaces.com`, set by the CDN's provider and not by the app. The project's rule is that the session cookie is the only cookie the app sets; whether a browser stores this one for the cross-origin loads depends on its third-party cookie settings and was not verified.

**What it would take / recommendation** — set one CORS rule per origin in the bucket's settings with the owner's login (`https://officialsurveyvote-app-7auec.ondigitalocean.app`, `https://crowdpoll.vote`, `https://www.crowdpoll.vote`, `http://localhost:8080`), as in step 4 above, then test with `curl.exe -I -H "Origin: <origin>" https://crowdpoll.tor1.cdn.digitaloceanspaces.com/trending-counts.json`. A copy cached by the CDN before the rule existed may keep lacking the header for up to its TTL.

# Clarifications

## Clarification## Custom domain for the CDN endpoint, or the default `*.cdn.digitaloceanspaces.com`
[X] Resolved
`.do/app.yaml` points `ENV_SPACES_CDN_URL` at the default DigitalOcean CDN endpoint. A custom subdomain (e.g. `cdn.<your-domain>`) needs a DNS record and a certificate managed by DigitalOcean, and changes the CORS origin and `ENV_SPACES_CDN_URL`. Which do you want?
### Recommendation
#### Option 1 — default endpoint (recommended)
Pros: nothing to provision; already in `.do/app.yaml`. Cons: the hostname is DigitalOcean's, and moving to a custom domain later changes every asset URL (harmless, assets are fingerprinted, and `/api/config` hands the URL out at runtime).
#### Option 2 — custom subdomain
Pros: stable hostname independent of the vendor; can be same-site with the app. Cons: needs DNS access and a certificate step, and the domain must be known.
I recommend Option 1 now; Option 2 can be adopted later by changing one variable.

### RESOLUTION
Option 1 taken: the default DigitalOcean CDN endpoint. `ENV_SPACES_CDN_URL` stays `https://crowdpoll.nyc3.cdn.digitaloceanspaces.com` as in `.do/app.yaml`; no DNS record or certificate is needed (2026-10-06 10:46). Note 2026-10-06 14:26: the host part now follows the Spaces region, which the developer's `app.yaml` sets to `tor1` (unconfirmed); the decision — default endpoint, no custom domain — is unchanged.

## Clarification## The app's production origin (for the CORS rule)
[X] Resolved
The CORS rule must list the exact origin(s) the app is served from. The repository does not say what the production domain is (App Platform's `*.ondigitalocean.app` default, or a custom domain), nor whether the staging/PR deployments should also be allowed. What origin(s) should be allowed?
### Recommendation
Allow exactly the production origin (scheme + host, no wildcard path), plus the `*.ondigitalocean.app` default origin during cut-over if the app is reachable there. Do not use `*`: the objects are public anyway, but an explicit list keeps hot-linking from other sites out and costs nothing. Tell me the origin(s) and I will record them.

Update 2026-10-06 12:58: the developer owns `crowdpoll.vote` (Namecheap), so the production origin is expected to be `https://crowdpoll.vote`. Still open: whether `www.crowdpoll.vote` is also served and whether the `*.ondigitalocean.app` default origin stays allowed during cut-over.

### RESOLUTION
Origins to allow on the bucket's CORS rule: `https://crowdpoll.vote`, `https://www.crowdpoll.vote` (the developer plans to serve `www`), `http://localhost:8080` (local runs against the CDN), and the app's default URL `https://officialsurveyvote-app-7auec.ondigitalocean.app` (known since 2026-10-07 09:47; the local origin is `http://localhost:8080`, the port was changed from 9999). One rule per origin; methods `GET` and `HEAD`, allowed header `If-None-Match`, exposed header `ETag` if the form offers it. The rule can be created now (2026-10-07 06:32).

## Clarification## Who publishes the static assets, and when
[X] Resolved
Turning on Spaces moves `/assets/*` to the CDN (`routes/assets.ts:18`), but `npm run publish-assets` is a manual step, and `.do/app.yaml` has no build/deploy hook that runs it. Should uploading the assets be part of the App Platform deploy, or stay a manual step?
### Recommendation
#### Option 1 — run it in the build command (recommended)
Add `npm run publish-assets` after `npm run build` in the app's build command, with the five variables available at build time (they are already `RUN_AND_BUILD_TIME`). Pros: each deploy ships its own assets before instances start; no stale-asset window. Cons: build needs network access to Spaces and the secret; a failed upload fails the build (arguably desirable).
#### Option 2 — keep it manual
Pros: no change to the build. Cons: easy to forget; a deploy then serves pages that reference fingerprinted assets that are not in the bucket.

### RESOLUTION
Option 1 taken: `npm run publish-assets` runs in the build command. `.do/app.yaml` now has `build_command: npm ci && npm run build && npm run publish-assets` and `ENV_BETTER_AUTH_SECRET` at `RUN_AND_BUILD_TIME` (`ENV_SPACES_KEY` and `ENV_SPACES_SECRET` already are). The console app does not read the file: the developer must make the same two changes on the web service (build command; the secret's scope, and the Spaces key and secret's scope back to Run and build time if they were set to Run time) and redeploy (2026-10-07 08:35).

## Clarification## Key scope
[X] Resolved
Does the account's Spaces offer limited-access (per-bucket) keys, and may a dedicated key pair be created for this app rather than reusing a personal one?
### Recommendation
Create a dedicated, per-bucket read/write key pair named for this app, so it can be rotated or revoked independently. If only full-access keys are available, still create a dedicated pair rather than reusing one. Only you can confirm what the account offers and who owns the key.

### RESOLUTION
Recommendation applied. The account offers Limited Access keys (console screenshot `dontTrack/DO-spaces-key.jpg`); a dedicated Limited Access key scoped to the `crowdpoll` bucket was created for the app, named for it, and verified by a successful `publish-assets` upload. A key's secret cannot be retrieved later, so a lost secret means a new pair and deleting the old key. (2026-10-07 08:38)

## Clarification## Region for the app and its services
[-] Resolved
The database is in TOR1 but `.do/app.yaml` says `nyc` and the Spaces bucket is in `nyc3`. Which region should the app, Valkey and OpenSearch use, and which Spaces region?
### Recommendation
Use TOR1 for the app, database, Valkey and OpenSearch (private networking needs the same region), and the nearest Spaces region to Toronto (`nyc3` if no Toronto region exists — availability not confirmed here). Change `region: nyc` in `.do/app.yaml` to `tor1`. If Valkey or OpenSearch is not offered in TOR1, say so and the research will propose moving everything to one region instead.

### RESOLUTION
Resolved by the developer by editing `.do/app.yaml`: app, database, Valkey and OpenSearch in TOR1, and the Spaces region and CDN URL set to `tor1`. Open caveat, recorded in the finding "`.do/app.yaml` as edited by the developer": that Spaces offers a TOR1 region was confirmed on 2026-10-06 14:30 (the bucket `crowdpoll` exists in `tor1`); the Valkey and OpenSearch clusters named in the file must exist (2026-10-06 13:15).

## Clarification## PostgreSQL 16 or 18
[X] Resolved
The provisioned database is PostgreSQL 18; `app.yaml` says 16, and the tests run on 16.14.
### Recommendation
#### Option 1 — keep 18 and run the suite against it first
Pros: no new database; newest version. Cons: untested; needs the embedded-postgres package or a local 18 to confirm the migrations and queries.
#### Option 2 — recreate the database as 16
Pros: matches everything tested. Cons: discards the one-hour-old cluster; version 16 will age out sooner.
I recommend Option 1, because nothing is stored yet and the code uses ordinary SQL; but only a run can confirm it, so I would verify before the first deploy.

Update 2026-10-06 13:15: the developer's `.do/app.yaml` now says `version: "18"` with `cluster_name: db-pgsql-tor1-crowdpoll`, i.e. Option 1 is in effect; the checkbox is left for the developer. The suite still runs on `embedded-postgres` 16.14.

### RESOLUTION
Option 1 taken: keep PostgreSQL 18. `.do/app.yaml` already says `version: "18"` for the cluster `db-pgsql-tor1-crowdpoll`, and on the platform all six migrations applied on it with no error (`dontTrack/deploy-log-03.txt`). Still not run: the automated suite against a PostgreSQL 18 server (it uses `embedded-postgres` 16.14), which remains advisable before relying on 18 (2026-10-07 08:40).

## Clarification## SMTP provider and sender for production
[-] Resolved
Mailtrap's sandbox cannot deliver sign-in links to real users, and the sender is `no-reply@nativeauth.local`. Which provider and sender address should production use (for example a `no-reply@crowdpoll.vote` address)?
### Recommendation
Pick a transactional email provider with SMTP, verify `crowdpoll.vote` there, add its SPF/DKIM records in DigitalOcean DNS (once Custom DNS is in place), and set `ENV_SMTP_HOST`, `ENV_SMTP_PORT`, `ENV_SMTP_USER`, `ENV_SMTP_PASS` and `ENV_SMTP_FROM`. Only you can choose the provider. Note the app's email rate limit (`ENV_EMAIL_RATE_LIMIT_*`) is independent of the provider's.

### RESOLUTION
Accepted as-is by the developer: the app is still in development and internal, so the Mailtrap sandbox and `no-reply@nativeauth.local` stay for now (2026-10-06 14:14). Assumption that stands: no external user needs to receive a sign-in link. Revisit before any real users are invited: a real provider, a verified `crowdpoll.vote` sender and SPF/DKIM records would then be needed.

## Clarification## Which GitHub repository the app deploys from
[X] Resolved
`.do/app.yaml` names `roadraceresults/nativeAuthOAuth`; the local `origin` and `CLAUDE.md` name `roadraceresults/crowdpoll02`.

Update 2026-10-06 18:29: the developer's working-copy `.do/app.yaml` now says `roadraceresults/crowdpoll02`, i.e. the recommendation is in effect; the checkbox is left for the developer to close.
### Recommendation
Use `roadraceresults/crowdpoll02`, branch `dev`, and correct `app.yaml`. If `nativeAuthOAuth` is a real, separate repository you intend to deploy from, say so.

### RESOLUTION
Recommendation applied: the app deploys from `roadraceresults/crowdpoll02`, branch `dev`. `.do/app.yaml` names it, and the console's source settings were confirmed by the developer (repository, branch `dev`, source directory `/`, hash `78846ae`, autodeploy off). (2026-10-07 08:38)

## Clarification## OpenSearch at launch
[X] Resolved
`.do/app.yaml` has an `OPENSEARCH` entry (`search-tor1-crowdpoll`) and `ENV_OPENSEARCH_URL`, but the cluster is not provisioned and the code has no way to fill a new index with existing polls (see "Adding OpenSearch after launch"). Should OpenSearch be part of the first deploy?
### Recommendation
#### Option 1 — launch without it (recommended)
Remove the `search` database entry and the `ENV_OPENSEARCH_URL` line for the first deploy. Pros: one less cluster to provision and pay for; no empty-index problem; PostgreSQL search is the tested fallback. Cons: PostgreSQL search covers only the 5,000 newest listable polls per pass and has the fuzzy/typo limits described in `ARCHITECTURE.md:412`; adding OpenSearch later needs the reindex command first.
#### Option 2 — launch with it
Create `search-tor1-crowdpoll` first and deploy with it. Pros: full search from day one; the index fills as polls are created. Cons: cost from the first day; any polls created before the first successful index (none, on a fresh database) would be missing; the cluster must exist before the app can deploy.
I recommend Option 1, with the reindex command written before OpenSearch is enabled.

### RESOLUTION
Option 1 taken: launch without OpenSearch. The console app has no OpenSearch component and no `ENV_OPENSEARCH_URL`, and the deployed app logs `[search] postgres is serving home search` (`dontTrack/deploy-log-03.txt`). The `search` database entry and the `ENV_OPENSEARCH_URL` line were removed from `.do/app.yaml` so the file matches. Before OpenSearch is ever enabled, the reindex trigger described in "Adding OpenSearch after launch" must exist, or the new index will lack every existing poll (2026-10-07 08:43).
