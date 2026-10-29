# Environment variables, by group

Every `ENV_*` variable the application reads, placed in one of eleven groups; `devScripts.example/launch-dev.ps1` sets them in the same groups and order. The groups
follow *what a change to the variable affects*, so an operator tuning one concern finds its
knobs together: where the app runs, what it connects to, who may sign in, mail, the rules a
poll obeys, the background work, the vote pipeline, the listings, the two layers of load
protection (per user, then site-wide), and the browser's own timings.

Defaults and one-line descriptions are in `CLAUDE.md` (table) and `README.md`; the
authoritative parsing and validation is `src/config.ts` (OAuth credentials: `src/auth/auth.ts`).
Cross-group constraints the config enforces are noted where they apply. Units: intervals and
TTLs are milliseconds unless the name or note says otherwise.

## 1. Runtime

Where this process listens and the origin it is reached at. The rest of the process's shape
comes from the platform (`.do/app.yaml`: instance size, autoscaling 4–12).

| Variable | Note |
|---|---|
| `ENV_PORT` | HTTP port (dev `8080`) |
| `ENV_PUBLIC_ORIGIN` | The one origin the site is reached at, no path; required. Every sign-in provider redirect URI is built from it |
| `ENV_PROTOTYPES` | Comma-separated `prototypes/` folders served at `/prototypes/<name>/` (temporary); unset → none |

## 2. Backing services

Connection strings and credentials for the managed services. Development needs PostgreSQL
only; each of the others has an in-process stand-in when unset.

| Variable | Note |
|---|---|
| `ENV_DATABASE_URL` | PostgreSQL connection string (required in every environment) |
| `ENV_DATABASE_CA_CERT` | PEM of the CA that signed the database server's certificate (optional; managed databases) |
| `ENV_VALKEY_URL` | Valkey; unset → in-process cache, queue and registry |
| `ENV_OPENSEARCH_URL` | OpenSearch; unset → PostgreSQL full-text search |
| `ENV_SPACES_BUCKET` | Spaces + CDN for the TRENDING objects and static assets — all five or none; unset → served from the instance |
| `ENV_SPACES_REGION` | |
| `ENV_SPACES_KEY` | |
| `ENV_SPACES_SECRET` | |
| `ENV_SPACES_CDN_URL` | |

## 3. Authentication and sessions

Who can sign in, how, for how long, and who is an administrator.

| Variable | Note |
|---|---|
| `ENV_BETTER_AUTH_SECRET` | Session signing secret, ≥ 32 characters, required |
| `ENV_SIGNIN_METHOD` | `native` (magic link), `oauth` (the providers only) or `both` |
| `ENV_MAX_SIGNIN_COOKIE_DURATION` | Longest stay-signed-in duration (ms; 30 days) |
| `ENV_STAY_SIGNED_IN` | `1` ticks the login page's "Stay signed in" box by default; any other value or none leaves it clear |
| `ENV_SESSION_CACHE_TTL` | How long a session lookup is served from the cache (ms), never past the session's own expiry |
| `ENV_ADMINS` | Comma-separated identifiers allowed on the admin pages |
| `ENV_ALLOWED_EMAILS` | Pre-launch allowlist, compared by email key; unset or empty → off |
| `ENV_OAUTH_GOOGLE_CLIENT_ID` | A provider is on only when all its values are set; some but not all stops the app |
| `ENV_OAUTH_GOOGLE_CLIENT_SECRET` | |
| `ENV_OAUTH_APPLE_CLIENT_ID` | The Services ID |
| `ENV_OAUTH_APPLE_TEAM_ID` | |
| `ENV_OAUTH_APPLE_KEY_ID` | |
| `ENV_OAUTH_APPLE_PRIVATE_KEY` | The `.p8` key's PEM; the app signs Apple's client secret itself |
| `ENV_OAUTH_MICROSOFT_CLIENT_ID` | |
| `ENV_OAUTH_MICROSOFT_CLIENT_SECRET` | |
| `ENV_OAUTH_AMAZON_CLIENT_ID` | |
| `ENV_OAUTH_AMAZON_CLIENT_SECRET` | |

## 4. Email

Outgoing mail (sign-in links, invitations) and the rate limit on the endpoints that send it.

| Variable | Note |
|---|---|
| `ENV_EMAIL_TRANSPORT` | `ses` (production and the development templates) or `smtp` (kept for reference) |
| `ENV_SES_REGION` | Required with `ses` |
| `ENV_SES_ACCESS_KEY_ID` | Required with `ses` |
| `ENV_SES_SECRET_ACCESS_KEY` | Required with `ses` |
| `ENV_EMAIL_FROM` | Sender of every message |
| `ENV_EMAIL_SEND_TIMEOUT` | Longest one send may take before it counts as failed |
| `ENV_EMAIL_ASSET_ORIGIN` | Origin the email logo is loaded from; unset → the link's origin |
| `ENV_SMTP_HOST` | `smtp` only |
| `ENV_SMTP_PORT` | `smtp` only |
| `ENV_SMTP_USER` | `smtp` only; unset → each message is logged to the console |
| `ENV_SMTP_PASS` | `smtp` only |
| `ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES` | Window in **minutes** (not ms) |
| `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW` | Requests allowed per client in that window |

## 5. Poll rules

What a poll may contain and what a user may keep. Product rules, not performance knobs.

| Variable | Note |
|---|---|
| `ENV_MIN_CHOICES` | Fewest choices a poll may be published with |
| `ENV_MAX_CHOICES` | Most choices; must be ≥ `ENV_MIN_CHOICES` |
| `ENV_MAX_PRIVATE_POLL_VOTERS` | Voter ceiling on a private poll — both the blank-field value and the largest enterable |
| `ENV_MAX_INVITATIONS_PER_DAY` | Invitation and reminder emails one poll creator may send in any rolling 24 hours |
| `ENV_MAX_BOOKMARKS_PER_USER` | Bookmarks before `409 bookmark-cap` |
| `ENV_BOOKMARK_EXPIRY_MONTHS` | Months after a poll closes, or after its last activity, before its bookmarks are removed |
| `ENV_MAX_LIVE_RESULTS_PER_USER` | Polls in the Live Results tab; one more is refused (`409 live-cap`) |

## 6. Background work

The site-wide sweeps and the calls they make: screening, scheduling, indexing, bookmark
removal. Each runs once per tick under an advisory lock; the tick lengths live here.

| Variable | Note |
|---|---|
| `ENV_SCREENING_CALL_TIMEOUT` | Bound on one Acceptability Screening call |
| `ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS` | Attempts before a poll is rejected for an admin to retry |
| `ENV_POLL_APPROVAL_SWEEP_INTERVAL` | How often polls awaiting approval are swept |
| `ENV_POLL_DATE_CHECK_SWEEP_INTERVAL` | How often poll schedules are re-evaluated |
| `ENV_OUTBOX_DRAIN_SWEEP_INTERVAL` | How often changed polls are pushed to the search index |
| `ENV_INVITATION_SWEEP_INTERVAL` | How often pending invitation emails of open polls are picked up |

## 7. Vote pipeline

The one path every vote takes: counted in the cache, queued, inserted in batches, and the
counters written to the poll rows on a sweep.

| Variable | Note |
|---|---|
| `ENV_COUNTER_FLUSH_SWEEP_INTERVAL` | How often live counters are written to poll rows; nothing a visitor sees reads them |
| `ENV_VOTE_BATCH_SIZE` | Votes the consumer inserts per batch |
| `ENV_VOTE_QUEUE_LAG_NOTICE` | Consumer lag above which a vote response says `queued` |

## 8. Listings and search

How much each listing returns and how long shared answers are reused — TRENDING's
publication cadence included, since it is the cadence of a listing, not of a sweep.

| Variable | Note |
|---|---|
| `ENV_MAX_TRENDING_POLLS` | Polls in the TRENDING tab |
| `ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL` | How often TRENDING is recomputed and published; also the browser copy's lifetime. The CDN `max-age` is the smaller of it and 10 s |
| `ENV_MAX_NEWEST_POLLS` | Polls in the Newest tab; must not exceed `ENV_MAX_POLLS_SEARCH_RESULTS` |
| `ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL` | The same for Newest (at least 1000) |
| `ENV_MAX_POLLS_SEARCH_RESULTS` | Cap on home search results, personal-tab rows and overlay ids per request |
| `ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS` | Cap on admin search results and the unfiltered admin list |
| `ENV_SEARCH_CACHE_TTL` | How long an identical search is answered from the cache |

## 9. Per-user rate limits

The first layer of load protection: what one user (session, or address for a guest) may do
per unit of time. Floors are sustained rates; the bursts say how many may follow each other
at once before the floor applies.

| Variable | Note |
|---|---|
| `ENV_MIN_LIVE_REFRESH_INTERVAL` | Floor between two Live Results refreshes |
| `ENV_MIN_MANUAL_REFRESH_INTERVAL` | Floor for manual-kind requests: tab clicks, Refresh, bookmarks, the overlay call |
| `ENV_MIN_SEARCH_REFRESH_INTERVAL` | Floor between two searches |
| `ENV_MIN_VOTE_REFRESH_INTERVAL` | Floor between two votes from one session, across all polls |
| `ENV_MANUAL_REFRESH_BURST` | Manual-kind requests allowed back to back before the floor applies; `1` is the plain floor |
| `ENV_SEARCH_BURST` | The same for searches (Live Results and votes are always 1) |
| `ENV_PAGE_LOADS_PER_MINUTE` | Page loads per session (or address) per minute before `429 too-many-loads` |
| `ENV_MAX_VOTES_PER_IP_PER_MINUTE` | Votes from one address per minute before `429 ip-vote-cap` and the `[abuse]` alert |

## 10. Site-wide load bounds

The second and third layers: the budget controller (reacts within seconds; stretches the
intervals it hands to browsers when the fleet's dynamic-request budget is spent) and
per-instance shedding (reacts within milliseconds; `503` when one instance is overloaded). Autoscaling, the slowest layer, is in
`.do/app.yaml`.

| Variable | Note |
|---|---|
| `ENV_SERVER_MAX_REQUESTS_PER_INSTANCE_PER_SECOND` | Dynamic requests per second each live instance adds to the budget |
| `ENV_SERVER_MAX_REQUESTS_PER_SECOND` | Cap on the budget; must be ≥ the per-instance value |
| `ENV_SERVER_MAX_SEARCH_PER_SECOND` | Search-engine queries per second (cache hits excluded) before searches are stretched |
| `ENV_SERVER_MAX_SEARCH_FALLBACK_PER_SECOND` | The same bound while PostgreSQL full-text search serves |
| `ENV_BUDGET_CONTROLLER_SWEEP_INTERVAL` | Controller tick; must not exceed the smallest floor in group 9 |
| `ENV_MAX_REFRESH_AND_SEARCH_STRETCH` | Largest multiplier on the search and manual floors; Live Results is uncapped |
| `ENV_BUDGET_LOWER_THRESHOLD_PERCENT` | Load below this share of the budget lets the controller lower multipliers |
| `ENV_INSTANCE_MAX_INFLIGHT` | Requests in flight on one instance before it sheds |
| `ENV_INSTANCE_MAX_EVENT_LOOP_LAG` | Event-loop lag (ms) before an instance sheds |
| `ENV_SHED_RETRY_AFTER` | `Retry-After` handed out with a `503` |

## 11. Browser behaviour

Timings and sizes the server hands to the page (`/api/config`) for the browser to act on.
They cost nothing on the server directly; they decide how often a page asks or how much it
shows.

| Variable | Note |
|---|---|
| `ENV_LIVE_RESULTS_MAX_IDLE_TIME` | Idle time before the Live Results tab asks whether to continue |
| `ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL` | Admin list refresh interval |
| `ENV_POLL_EDIT_HEARTBEAT_INTERVAL` | How often an open editing card signals it is present |
| `ENV_PARTICIPANTS_VIEWPORT_SIZE` | Rows per page in the card's Participants and Banned Voter List sections |
| `ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE` | Current share (whole percent) a choice needs to be drawn on the vote history graph; `0` draws every choice |
| `ENV_LINE_GRAPH_REFRESH_INTERVAL` | How often an open vote history graph refreshes, and how long the server keeps one poll's graph; never below `ENV_MIN_LIVE_REFRESH_INTERVAL` |

## Where each group is set

- Groups 1–4 hold the secrets and addresses: set as **secrets** on the platform, and in the
  git-ignored `devScripts/launch-dev.ps1` / `.vscode/launch.json` locally (templates:
  `devScripts.example/launch-dev.ps1`, `launch.json.example`).
- Groups 5–11 are plain values with defaults; `.do/app.yaml` lists the production values, and
  the dev templates carry the same defaults with comments on which to lower while testing
  (e.g. `ENV_LIVE_RESULTS_MAX_IDLE_TIME`, `ENV_MAX_PRIVATE_POLL_VOTERS`, the email rate limit).
