# Development launch script (FR-025). The working copy lives at
# devScripts/launch-dev.ps1 and is git-ignored. First-time setup:
#   ./devScripts.example/setup-dev.ps1
# copies this template there (and .vscode/launch.json from launch.json.example)
# and replaces __GENERATED_ON_SETUP__ with one shared random secret in both.
# Then fill in your SES development sending key in the git-ignored copies.
#
# The settings are in the eleven groups of requirements/environmentVariablesGroups.md.
# Unless a note says otherwise, a value is the production default and intervals are in ms.

# --- 1. Runtime: where this process listens and the origin it is reached at ---
$env:ENV_PORT = "8081"  # default 8080
$env:ENV_PUBLIC_ORIGIN = "http://localhost:8081"
# Comma-separated prototypes/ folders served at /prototypes/<name>/; empty serves none.
$env:ENV_PROTOTYPES = ""

# --- 2. Backing services: the database and the optional managed services ---
# PostgreSQL is the only store development needs. Leave ENV_OPENSEARCH_URL and the
# ENV_SPACES_* variables empty: the server then uses PostgreSQL full-text search and
# instance-served TRENDING/Newest objects. A local Valkey is optional; empty
# ENV_VALKEY_URL uses the in-process cache, queue and registry.
$env:ENV_DATABASE_URL = ""
$env:ENV_DATABASE_CA_CERT = ""
# Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
# docker run -d --name crowdpoll-valkey -p 6379:6379 --restart unless-stopped valkey/valkey:8
$env:ENV_VALKEY_URL = "redis://localhost:6379"
$env:ENV_OPENSEARCH_URL = ""
# Spaces: all five or none (empty counts as unset). With them set, this machine publishes the
# TRENDING/Newest objects to the real bucket and the pages load assets from the CDN.
$env:ENV_SPACES_BUCKET = ""
$env:ENV_SPACES_REGION = ""
$env:ENV_SPACES_KEY = ""
$env:ENV_SPACES_SECRET = ""
$env:ENV_SPACES_CDN_URL = ""

# --- 3. Authentication and sessions: who may sign in, how, and for how long ---
# Required in every environment (>= 32 chars); the server refuses to start without it.
# setup-dev.ps1 writes the same generated value here and into .vscode/launch.json.
$env:ENV_BETTER_AUTH_SECRET = "__GENERATED_ON_SETUP__"
# native (email link) | oauth (providers only) | both; oauth and both need at least one provider below
$env:ENV_SIGNIN_METHOD = "native"
$env:ENV_MAX_SIGNIN_COOKIE_DURATION = "2592000000"
$env:ENV_STAY_SIGNED_IN = "1"  # default 0
$env:ENV_SESSION_CACHE_TTL = "300000"
$env:ENV_ADMINS = "devadmin01@crowdpoll.vote, devadmin02@crowdpoll.vote, devadmin03@crowdpoll.vote"
# Pre-launch allowlist; empty lets everyone in.
$env:ENV_ALLOWED_EMAILS = ""
# Sign-in providers (secrets; a provider is on only when all its values are set)
$env:ENV_OAUTH_GOOGLE_CLIENT_ID = ""
$env:ENV_OAUTH_GOOGLE_CLIENT_SECRET = ""
$env:ENV_OAUTH_APPLE_CLIENT_ID = ""
$env:ENV_OAUTH_APPLE_TEAM_ID = ""
$env:ENV_OAUTH_APPLE_KEY_ID = ""
$env:ENV_OAUTH_APPLE_PRIVATE_KEY = ""
$env:ENV_OAUTH_MICROSOFT_CLIENT_ID = ""
$env:ENV_OAUTH_MICROSOFT_CLIENT_SECRET = ""
$env:ENV_OAUTH_AMAZON_CLIENT_ID = ""
$env:ENV_OAUTH_AMAZON_CLIENT_SECRET = ""

# --- 4. Email: Amazon SES and the rate limit on the endpoints that send mail ---
# Fill in the development sending key; development mail is real mail.
$env:ENV_EMAIL_TRANSPORT = "ses"
$env:ENV_SES_REGION = "us-east-1"
$env:ENV_SES_ACCESS_KEY_ID = "your-ses-dev-access-key-id"
$env:ENV_SES_SECRET_ACCESS_KEY = "your-ses-dev-secret-access-key"
$env:ENV_EMAIL_FROM = "CrowdPoll <no-reply@dev.mail.crowdpoll.vote>"
$env:ENV_EMAIL_SEND_TIMEOUT = "10000"
$env:ENV_EMAIL_ASSET_ORIGIN = "https://crowdpoll.vote"
# NOTE the unit -- the window is in MINUTES, unlike every interval in this file.
# Production defaults are 15 / 2. Loosened here because the production values make
# sign-in testing painful: two login links and you are locked out for 15 minutes.
$env:ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES = "5"  # default 15
$env:ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW = "10"  # default 2

# --- 5. Poll rules: what a poll may contain and what a user may keep ---
# The number of choices a poll must have to be published, inclusive. Lower
# ENV_MAX_CHOICES to reach the choices editor's ceiling without typing fifty lines.
$env:ENV_MIN_CHOICES = "2"
$env:ENV_MAX_CHOICES = "50"
# The voter ceiling on a private poll -- both the limit a blank field means and the
# largest value enterable. Production default is 100; 10 here so a test poll can be
# filled in a handful of votes.
$env:ENV_MAX_PRIVATE_POLL_VOTERS = "10"  # default 100
$env:ENV_MAX_INVITATIONS_PER_DAY = "200"
$env:ENV_MAX_BOOKMARKS_PER_USER = "200"
$env:ENV_BOOKMARK_EXPIRY_MONTHS = "6"
$env:ENV_MAX_LIVE_RESULTS_PER_USER = "5"

# --- 6. Background work: the site-wide sweeps and the screening calls they make ---
$env:ENV_SCREENING_CALL_TIMEOUT = "10000"
$env:ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS = "10"
$env:ENV_POLL_APPROVAL_SWEEP_INTERVAL = "5000"
$env:ENV_POLL_DATE_CHECK_SWEEP_INTERVAL = "60000"
$env:ENV_OUTBOX_DRAIN_SWEEP_INTERVAL = "15000"
$env:ENV_INVITATION_SWEEP_INTERVAL = "30000"

# --- 7. Vote pipeline: counted in the cache, queued, inserted in batches, flushed ---
$env:ENV_COUNTER_FLUSH_SWEEP_INTERVAL = "10000"
$env:ENV_VOTE_BATCH_SIZE = "500"
$env:ENV_VOTE_QUEUE_LAG_NOTICE = "2000"

# --- 8. Listings and search: how much each listing returns and how long answers are reused ---
$env:ENV_MAX_TRENDING_POLLS = "200"
$env:ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL = "60000"
$env:ENV_MAX_NEWEST_POLLS = "50"
$env:ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL = "60000"
$env:ENV_MAX_POLLS_SEARCH_RESULTS = "200"
$env:ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS = "200"
$env:ENV_SEARCH_CACHE_TTL = "10000"

# --- 9. Per-user rate limits: floors between requests, and the bursts allowed first ---
$env:ENV_MIN_LIVE_REFRESH_INTERVAL = "2000"
$env:ENV_MIN_MANUAL_REFRESH_INTERVAL = "5000"
$env:ENV_MIN_SEARCH_REFRESH_INTERVAL = "2000"
$env:ENV_MIN_VOTE_REFRESH_INTERVAL = "2000"
$env:ENV_MANUAL_REFRESH_BURST = "5"
$env:ENV_SEARCH_BURST = "3"
$env:ENV_PAGE_LOADS_PER_MINUTE = "120"
$env:ENV_MAX_VOTES_PER_IP_PER_MINUTE = "600"

# --- 10. Site-wide load bounds: the budget controller and per-instance shedding ---
$env:ENV_SERVER_MAX_REQUESTS_PER_INSTANCE_PER_SECOND = "1250"
$env:ENV_SERVER_MAX_REQUESTS_PER_SECOND = "15000"
$env:ENV_SERVER_MAX_SEARCH_PER_SECOND = "2000"
$env:ENV_SERVER_MAX_SEARCH_FALLBACK_PER_SECOND = "200"
$env:ENV_BUDGET_CONTROLLER_SWEEP_INTERVAL = "1000"
$env:ENV_MAX_REFRESH_AND_SEARCH_STRETCH = "8"
$env:ENV_BUDGET_LOWER_THRESHOLD_PERCENT = "80"
$env:ENV_INSTANCE_MAX_INFLIGHT = "200"
$env:ENV_INSTANCE_MAX_EVENT_LOOP_LAG = "100"
$env:ENV_SHED_RETRY_AFTER = "2000"

# --- 11. Browser behaviour: timings and sizes handed to the page in /api/config ---
$env:ENV_LIVE_RESULTS_MAX_IDLE_TIME = "1800000"
$env:ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL = "5000"
$env:ENV_POLL_EDIT_HEARTBEAT_INTERVAL = "10000"
$env:ENV_PARTICIPANTS_VIEWPORT_SIZE = "10"

# --- Start the PostgreSQL Windows service if it is not running (a local database only) ---
# A database URL whose host is not this machine (a managed database) needs no local service.
$databaseHost = "localhost"
if (-not [string]::IsNullOrWhiteSpace($env:ENV_DATABASE_URL) -and
    $env:ENV_DATABASE_URL -match '^postgres(?:ql)?://(?:[^@/]*@)?(\[[^\]]+\]|[^:/?]+)') {
    $databaseHost = $Matches[1]
}
if ($databaseHost -in @("localhost", "127.0.0.1", "[::1]")) {
    $postgres = Get-Service | Where-Object { $_.Name -like "postgresql*" } | Select-Object -First 1
    if ($null -eq $postgres) {
        Write-Host "PostgreSQL service not found. Install it first:  winget install PostgreSQL.PostgreSQL.16" -ForegroundColor Red
        exit 1
    }
    if ($postgres.Status -ne "Running") {
        Write-Host "Starting PostgreSQL service..."
        Start-Service -Name $postgres.Name
        $postgres.WaitForStatus("Running", (New-TimeSpan -Seconds 30))
    }
    Write-Host "PostgreSQL service is running."
} else {
    Write-Host "ENV_DATABASE_URL points at $databaseHost; not starting the local PostgreSQL service."
}

# --- Launch the server ---
Write-Host "Starting server on http://localhost:$($env:ENV_PORT) ($($env:ENV_SIGNIN_METHOD) mode)..."
npm run dev
