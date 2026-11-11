---
paths:
  - "src/config.ts"
  - "infra/**"
  - "launch.json.example"
  - "devScripts.example/**"
  - "tests/config.test.ts"
---

## Environment Variables

All runtime configuration comes from `ENV_*` environment variables:

| Variable | Dev default | Description |
|---|---|---|
| `ENV_PORT` | `8080` | HTTP port for the web app |
| `ENV_PUBLIC_ORIGIN` | `http://localhost:8080` (templates) | The one origin the site is reached at, no path (`https://crowdpoll.vote` in `infra/app.tf`); required — the app refuses to start without it. Every login provider redirect URI is built from it; a request for its `www.` name is redirected to it (`src/routes/wwwRedirect.ts`) |
| `ENV_DATABASE_URL` | `postgres://localhost:5432/app01` | PostgreSQL connection string (the managed pool's URL in production) |
| `ENV_DATABASE_CA_CERT` | unset | PEM of the CA that signed the database server's certificate (DigitalOcean: the database component's `CA_CERT`). Set → the connection is verified against it and `sslmode` is dropped from the URL; unset → `pg` verifies against the system roots, which fails against a managed database. `\n` pairs are read as line breaks |
| `ENV_VALKEY_URL` | unset | Valkey URL; unset → the in-process cache/queue/registry (development and tests). A remote host beside a `localhost` `ENV_DATABASE_URL` stops the app: a local server on a shared Valkey would trade votes and counter flushes with production and drop them |
| `ENV_OPENSEARCH_URL` | unset | OpenSearch endpoint; unset → PostgreSQL full-text search |
| `ENV_SPACES_BUCKET`, `ENV_SPACES_REGION`, `ENV_SPACES_KEY`, `ENV_SPACES_SECRET`, `ENV_SPACES_CDN_URL` | unset | Where the TRENDING objects and static assets are published; all five or none; unset → served from the instance |
| `ENV_ADMINS` | unset | Comma-separated identifiers allowed on admin pages; unset → no administrators. Production: `admins` in the git-ignored `infra/secrets.auto.tfvars` (a secret), never in a committed file |
| `ENV_PROTOTYPES` | unset | Comma-separated folders of `prototypes/` served, unlisted and `noindex`, at `/prototypes/<name>/` (temporary). Unset → none, and those addresses answer `404`. Letters, digits, `_` and `-` only |
| `ENV_MAX_SIGNIN_COOKIE_DURATION` | `2592000000` | Max stay-logged-in duration (ms; 30 days); the login card shows it as whole days (hours below a day) |
| `ENV_STAY_SIGNED_IN` | `0` | `1` → the login page's "Stay logged in on this device" box starts ticked; any other value, or none, leaves it clear |
| `ENV_SIGNIN_METHOD` | `native` | `native` (email magic link), `oauth` (the login providers only) or `both`; `oauth` and `both` need at least one provider below |
| `ENV_OAUTH_GOOGLE_CLIENT_ID`, `ENV_OAUTH_GOOGLE_CLIENT_SECRET` | unset | Sign in with Google (secrets). A provider is on only when all its values are set; some but not all stops the app, naming the missing one |
| `ENV_OAUTH_APPLE_CLIENT_ID`, `ENV_OAUTH_APPLE_TEAM_ID`, `ENV_OAUTH_APPLE_KEY_ID`, `ENV_OAUTH_APPLE_PRIVATE_KEY` | unset | Sign in with Apple: the Services ID, team, key id and the `.p8` key's PEM (`\n` pairs read as line breaks); the app signs Apple's client secret itself and renews it every 30 days |
| `ENV_OAUTH_MICROSOFT_CLIENT_ID`, `ENV_OAUTH_MICROSOFT_CLIENT_SECRET` | unset | Sign in with Microsoft (personal, work and school accounts) |
| `ENV_OAUTH_AMAZON_CLIENT_ID`, `ENV_OAUTH_AMAZON_CLIENT_SECRET` | unset | Login with Amazon. Production: all `ENV_OAUTH_*` values come from the git-ignored `infra/secrets.auto.tfvars`, never from a committed file (`contracts/provider-setup.md`) |
| `ENV_SCREENING_CALL_TIMEOUT` | `10000` | Bound on one Acceptability Screening call (ms) |
| `ENV_POLL_APPROVAL_SWEEP_INTERVAL` | `5000` | How often polls awaiting approval are swept (ms) |
| `ENV_POLL_DATE_CHECK_SWEEP_INTERVAL` | `60000` | How often poll schedules are re-evaluated (ms) |
| `ENV_POLL_EDIT_HEARTBEAT_INTERVAL` | `10000` | How often an open editing page signals it is present (ms) |
| `ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS` | `10` | Screening attempts before a poll is rejected for an admin to retry |
| `ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL` | `5000` | Admin poll list refresh interval (ms), distinct from the above |
| `ENV_EMAIL_TRANSPORT` | `smtp` | `smtp` (the `ENV_SMTP_*` sandbox, or console logging without credentials; kept for reference) or `ses` (Amazon SES over HTTPS; production and the development templates). With `ses` the three `ENV_SES_*` values are required and the app refuses to start without them |
| `ENV_SES_REGION` | unset | SES region: `ca-central-1` in production, `us-east-1` in the development templates; required with `ses` |
| `ENV_SES_ACCESS_KEY_ID`, `ENV_SES_SECRET_ACCESS_KEY` | unset | The SES sending user's access key (secrets); required with `ses` |
| `ENV_SMTP_HOST`, `ENV_SMTP_PORT` | `sandbox.smtp.mailtrap.io`, `2525` | SMTP server for `smtp` (no longer in the development templates) |
| `ENV_SMTP_USER`, `ENV_SMTP_PASS` | unset | SMTP credentials for `smtp`; unset → each message is logged to the console instead of sent |
| `ENV_EMAIL_FROM` | `CrowdPoll <no-reply@mail.crowdpoll.vote>` | Sender of every message (replaces `ENV_SMTP_FROM`, which is no longer read); the development templates use `no-reply@dev.mail.crowdpoll.vote` |
| `ENV_DEFAULT_LINK_PREVIEW_MESSAGE` | `You have been invited to vote in this poll.` | The description a messaging app shows under a poll's shared link when the poll has neither a subtitle nor a message of its sharing mode (login page only; `/poll/<pid>` keeps its own line); trimmed; blank or over 300 characters stops the app |
| `ENV_EMAIL_SEND_TIMEOUT` | `10000` | Longest one send may take (ms) before it counts as failed |
| `ENV_EMAIL_ASSET_ORIGIN` | unset | Origin the email logo is loaded from, no path; unset → the link's origin. The development templates set `https://crowdpoll.vote`, because a mail app's image proxy cannot reach `localhost` |
| `ENV_ALLOWED_EMAILS` | unset | Pre-launch allowlist: comma-separated addresses allowed to create an account and log in, compared by email key, or patterns holding `*` (any characters except `@`, e.g. `*@crowdpoll.vote`) matched against the email key; `ENV_ADMINS` addresses always are. Unset or empty → off (everyone). An invalid entry, or a pattern without one `@`, stops the app; startup logs only the counts (`2 addresses, 1 pattern; 3 administrators always allowed`). Production: `allowed_emails` in the git-ignored `infra/secrets.auto.tfvars`, never in a committed file; the templates carry it empty |
| `ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES` | `15` | Rate-limit window for email-sending endpoints, in **minutes** (not ms or seconds, unlike the intervals above) |
| `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW` | `2` | Requests allowed per client in that window. Lower the window and raise this while testing login — the defaults lock you out for 15 minutes after two login links |
| `ENV_MAX_INVITATIONS_PER_DAY` | `200` | Invitation and reminder emails one poll creator may send in any rolling 24 hours, counted across all their polls; what does not fit waits as `Not sent yet` and goes as the window frees up. Lower it (e.g. `3`) to see the limit while testing |
| `ENV_MAX_PRIVATE_POLL_VOTERS` | `100` | Voter ceiling on a private poll — both the limit a blank field means and the largest value enterable. Lower it (e.g. `10`) to fill a test poll in a few votes |
| `ENV_PARTICIPANTS_VIEWPORT_SIZE` | `10` | Rows per page in the admin poll card's `Invitees` list (an "Only people you invite" poll), sent to the browser as `participantsViewportSize` on `GET /api/config`. Lower it (e.g. `3`) to make paging visible with a handful of invitees |
| `ENV_MIN_CHOICES` | `2` | Fewest choices a poll may be published with |
| `ENV_MAX_CHOICES` | `50` | Most choices a poll may be published with; the choices editor caps its lines at this. Lower it (e.g. `5`) to exercise the ceiling without typing fifty lines. Must be ≥ `ENV_MIN_CHOICES` |
| `ENV_SESSION_CACHE_TTL` | `300000` | How long a session lookup is served from the cache (ms); never past the session's own expiry |
| `ENV_MAX_POLLS_SEARCH_RESULTS` | `200` | Cap on home search results, personal-tab rows and overlay ids per request |
| `ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS` | `200` | Cap on admin search results and on the unfiltered admin list (newest first, with a cut-off notice) |
| `ENV_MAX_TRENDING_POLLS` | `200` | Polls in the TRENDING tab |
| `ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL` | `60000` | How often TRENDING is recomputed and published (ms); also the browser copy's lifetime. The CDN `max-age`, and the wait before Refresh is offered, is the smaller of it and 10 s |
| `ENV_MAX_NEWEST_POLLS` | `50` | Polls in the Newest tab; must not exceed `ENV_MAX_POLLS_SEARCH_RESULTS` |
| `ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL` | `60000` | How often Newest is recomputed and published (ms; at least 1000); also the browser copy's lifetime. The CDN `max-age`, and the wait before Refresh is offered, is the smaller of it and 10 s |
| `ENV_HOME_TAB_REFRESH_INTERVAL` | `7200000` | How long a user's Home list is reused before it is rebuilt (ms; at least 60000); a change to the user's own polls, votes, watches or invitations rebuilds it sooner |
| `ENV_MAX_HOME_PAGE_POLLS` | `200` | How many of the user's eligible polls a Home rebuild considers, most recent relation first (at least 1) |
| `ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE` | `1` | Current share (whole percent) a choice must hold to be drawn on the maximized view's line graph; `0` draws every choice |
| `ENV_LINE_GRAPH_REFRESH_INTERVAL` | `60000` | How often an open line graph refetches its series (ms); also the server-side cache TTL per poll. Clamped up to `ENV_MIN_LIVE_REFRESH_INTERVAL` |
| `ENV_MIN_LIVE_REFRESH_INTERVAL` | `2000` | Floor between two Live Results refreshes from one user (ms) |
| `ENV_MIN_MANUAL_REFRESH_INTERVAL` | `5000` | Floor between two manual tab refreshes from one user (ms) |
| `ENV_MIN_SEARCH_REFRESH_INTERVAL` | `2000` | Floor between two searches from one user (ms) |
| `ENV_MIN_VOTE_REFRESH_INTERVAL` | `2000` | Floor between two votes from one session, across all polls (ms) |
| `ENV_MANUAL_REFRESH_BURST` | `5` | Manual-kind requests (tab clicks, Refresh, bookmarks, the overlay call) one user may make back to back before the manual floor applies; one comes back per floor interval. `1` is the plain floor |
| `ENV_SEARCH_BURST` | `3` | The same allowance for searches. Live Results and votes are always one per interval |
| `ENV_MAX_VOTES_PER_IP_PER_MINUTE` | `600` | Votes from one address per minute before `429 ip-vote-cap` and the `[abuse]` alert line |
| `ENV_MAX_LIVE_RESULTS_PER_USER` | `5` | Polls in the Live Results tab; a sixth is refused (`409 live-cap`) until one is removed |
| `ENV_LIVE_RESULTS_MAX_IDLE_TIME` | `1800000` | Idle time before the Live Results tab asks whether to continue (ms). Lower it (e.g. `60000`) to see the prompt in a minute |
| `ENV_SERVER_MAX_REQUESTS_PER_INSTANCE_PER_SECOND` | `1250` | Dynamic requests per second each live instance adds to the effective budget |
| `ENV_SERVER_MAX_REQUESTS_PER_SECOND` | `15000` | Cap on the effective budget. Must be ≥ the per-instance value |
| `ENV_SERVER_MAX_SEARCH_PER_SECOND` | `2000` | Search-engine queries per second (cache hits excluded) before searches are stretched |
| `ENV_SERVER_MAX_SEARCH_FALLBACK_PER_SECOND` | `200` | The same bound while PostgreSQL full-text search serves |
| `ENV_BUDGET_CONTROLLER_SWEEP_INTERVAL` | `1000` | Controller tick (ms). Must not exceed the smallest floor |
| `ENV_MAX_REFRESH_AND_SEARCH_STRETCH` | `8` | Largest multiplier on the search and manual floors; Live Results is uncapped |
| `ENV_BUDGET_LOWER_THRESHOLD_PERCENT` | `80` | Load below this share of the budget lets the controller lower multipliers |
| `ENV_INSTANCE_MAX_INFLIGHT` | `200` | Requests in flight on one instance before it sheds |
| `ENV_INSTANCE_MAX_EVENT_LOOP_LAG` | `100` | Event-loop lag (ms) before an instance sheds |
| `ENV_SHED_RETRY_AFTER` | `2000` | `Retry-After` handed out with a `503` (ms) |
| `ENV_COUNTER_FLUSH_SWEEP_INTERVAL` | `10000` | How often live vote counters are written to poll rows (ms); nothing a visitor sees reads them, the tabs read the live counters |
| `ENV_INVITATION_SWEEP_INTERVAL` | `30000` | How often pending invitation emails of open polls are picked up (ms); saving an open poll sends its new invitations at once |
| `ENV_INVITATION_RESEND_WAIT` | `86400000` | How long after an invitation email its one reminder may be sent (ms; 24 hours); a failed delivery may be resent at once. Lower it (e.g. `60000`) to try reminders while testing |
| `ENV_VOTE_BATCH_SIZE` | `500` | Votes the consumer inserts per batch |
| `ENV_VOTE_QUEUE_LAG_NOTICE` | `2000` | Consumer lag (ms) above which a vote response says `queued` |
| `ENV_SEARCH_CACHE_TTL` | `10000` | How long an identical search is answered from the cache (ms) |
| `ENV_OUTBOX_DRAIN_SWEEP_INTERVAL` | `15000` | How often changed polls are pushed to the search index (ms) |
| `ENV_MAX_BOOKMARKS_PER_USER` | `200` | Bookmarks per user before `409 bookmark-cap` |
| `ENV_BOOKMARK_EXPIRY_MONTHS` | `6` | Months after a poll closes, or after its last activity, before its bookmarks are removed |
| `ENV_PAGE_LOADS_PER_MINUTE` | `120` | Page loads per session (or address, for guests) per minute before `429 too-many-loads` |
| `ENV_FCAPTCHA_ENABLED` | unset | `1` → the human check (self-hosted FCaptcha) stands before `/login`, `/create-account` and `/invite`, and every login start needs a pass; any other value, or none, turns it off. When on, the three below are required and a missing one stops the app |
| `ENV_FCAPTCHA_URL` | unset | Where the web service reaches the FCaptcha service, server to server (`${fcaptcha.PRIVATE_URL}` in `infra/app.tf`; `http://localhost:3001` for a local FCaptcha). Browsers reach it at `/fcaptcha` on the site's own domain |
| `ENV_FCAPTCHA_SITE_KEY` | unset | The site key the widget is drawn with; published in `/api/config`. Must be in the FCaptcha service's `ENV_FCAPTCHA_SITE_KEYS` |
| `ENV_FCAPTCHA_VERIFY_SECRET` | unset | The credential sent with each pass to FCaptcha's token check; the FCaptcha service reads the same name, with the same value. Production: an encrypted variable, never logged or published |
| `ENV_FCAPTCHA_PORT` | unset | Read by the FCaptcha service (`fcaptcha-server/start.js`), not the web app: the port it listens on (`8080` in `infra/app.tf`, `3001` locally); unset → FCaptcha's own `PORT`, else `3000` |
| `ENV_FCAPTCHA_SECRET` | unset | FCaptcha service only: the signing key, at least 32 bytes with 8 distinct characters (`openssl rand -hex 32`), different from the verify secret. Production: an encrypted variable |
| `ENV_FCAPTCHA_SITE_KEYS` | unset | FCaptcha service only: comma-separated site keys accepted (`crowdpoll` in `infra/app.tf`, `dev` locally) |
| `ENV_FCAPTCHA_ALLOWED_HOSTNAMES` | unset | FCaptcha service only: page hosts passes may be minted for (`crowdpoll.vote`, `localhost`) |
| `ENV_FCAPTCHA_REDIS_URL` | unset | FCaptcha service only: Valkey URL for its shared state, database 1 (`${valkey-tor1-crowdpoll.DATABASE_URL}/1`); unset → in memory |
| `ENV_FCAPTCHA_TRUSTED_PROXIES` | unset | FCaptcha service only: comma-separated CIDRs whose forwarding headers are believed (FCaptcha's `TRUSTED_PROXIES`); production adds App Platform's `100.64.0.0/10` to the default; unset → loopback and private ranges |
| `ENV_FCAPTCHA_INSECURE_DEV_MODE` | unset | FCaptcha service only: `1` lets it start without `ENV_FCAPTCHA_SECRET`, signing with a public key; never on a network |
| `ENV_DEVICE_EVENTS_ENABLED` | `false` | `true` → a device fingerprint is recorded at each login and vote, once the current Terms are accepted; any value but `true` or `false` stops the app. Nothing refuses or warns on a fingerprint |
| `ENV_DEVICE_EVENTS_KEY` | unset | The key the fingerprints are hashed with, required with at least 32 characters when collection is on. Replacing it means bumping `DEVICE_FINGERPRINT_VERSION`. Production: an encrypted variable, never logged or published |

The FCaptcha service's settings are mapped by `fcaptcha-server/start.js` to FCaptcha's own names (`FCAPTCHA_SECRET`, `FCAPTCHA_VERIFY_SECRET`, `FCAPTCHA_SITE_KEYS`, `FCAPTCHA_ALLOWED_HOSTNAMES`, `FCAPTCHA_INSECURE_DEV_MODE`, `REDIS_URL`); one of those set directly stops it.

Dev defaults are set in `.vscode/launch.json` and `devScripts/launch-dev.ps1` — both are **git-ignored** by design; regenerate them locally rather than committing them.
