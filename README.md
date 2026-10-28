# CrowdPoll

A real-time opinion-poll site with passwordless sign-in, built in TypeScript with Express,
PostgreSQL and [BetterAuth](https://better-auth.com). Visitors browse polls on a six-tab
home page (Your Polls, Shared With You, Your Votes, Trending, Newest, Watching, Live Results,
Search — each tab with its own icon, under a rule that runs the full width of the window), vote
once per poll (or change their vote on a poll that allows it), watch the polls they care about,
and follow up to five polls update live. Administrators create, edit, screen, moderate and export polls. Sign-in emails a
one-time login link (no passwords, ever), or goes through Google, Apple, Microsoft or Amazon: `ENV_SIGNIN_METHOD`
chooses the email link alone (`native`), the providers alone (`oauth`) or both.

The site is built to hold a million concurrent visitors over a quarter of a million polls on a
small autoscaled fleet: nothing a visitor does refreshes on its own except the Live Results
tab, every kind of request has a per-visitor floor, the fleet stretches those floors under
load in a fixed order (searches first, votes never), votes are accepted at once and written in
batches, and everything identical for every visitor is served as pre-built objects from a
delivery network.

## For end users

- **Trending** — the polls with the most recent votes, first on every visit. Nothing on it
  changes until you press **Refresh** (once every 5 seconds at most).
- **Newest** — the public polls opened most recently, newest first (fifty at most); a poll an
  administrator re-opens counts as new, and a poll under edit keeps its place. **Refresh** works
  as on Trending.
- **Your Polls**, **Shared With You**, **Your Votes** and **Watching** — the private tabs come
  first. Sign in to see them; **Refresh** works as on Trending.
  - **Your Polls** — every poll you created, public and private, in every state, newest first. A
    poll that has not launched shows its state (and why it was rejected) and cannot be voted on.
  - **Shared With You** — the private polls someone else created that you were invited to, or whose
    link you opened. It has no remove control. Opening a poll's shared link (`/?PID=…`, from **Copy
    Link**) lists it here and opens that tab at the poll, shown maximized; a guest is sent to sign in
    first (or to create an account) and returns to the poll, even when the sign-in email is opened in
    another browser (after one click to confirm the sign-in there). A poll that is not published yet waits here as a card saying who shared it; it
    becomes the ordinary card once published. Any link to a poll you may not see answers "That poll
    isn't available."
  - **Your Votes** — every poll you voted in, public and private.
  - **Watching** — only the polls you chose to watch.
- **Search** — type words in the box and press Enter: titles match first, then subtitles, then
  choices; a misspelt title is still found. At most 200 results are shown.
- **Vote** — press **Vote** on a card, pick your choice(s) and **Submit vote**. The card shows
  the new counts at once. On a very busy site the card may say your vote is *queued*; it has
  been counted and will be stored within moments.
- **Live Results** — press **Live Results** on any card to watch it update every few seconds
  in the Live Results tab (up to five polls; a sixth is refused until you remove one). On that
  tab the same link reads **✕ Live Results** and takes the poll off it — for every poll there,
  even one that has closed while you watched it. After 30 minutes without any interaction the
  tab asks whether to continue.
- **Watch** — the eye on a card puts a poll in Watching until it is archived or has been closed or
  inactive for six months; press it again to stop. Up to 200 polls. You can watch a poll you may
  see (public, or private and invited to or opened by you); a poll you lose access to leaves
  Watching and comes back if access returns. Voting never watches a poll.
- **Maximize** — click a card's title or subtitle, or the maximize icon at the right of its title
  (on either side of the card), to show that poll on its own, in the tab you are on, with every
  choice visible at once and no scrolling inside the card. The card works exactly as it does in
  the grid. Close it with the same icon, now a minimize icon, the **Escape** key, or a click on the
  tab you are on; the tab comes back as you
  left it. Switching tabs or searching closes it too. A poll that leaves Trending or Newest while
  you have it open stays open until you close it.
- **Result colours** — each result bar has a vivid colour of its own, on a pale tint of the same
  colour. Each poll takes its own run of colours from the palette, starting at a point set by the
  poll itself, so neighbouring cards look different, and a poll shows the same colours wherever
  it appears. The label and percentage are dark over the tint and turn light (or stay dark on the
  paler colours) where the bar is filled. Yes and No answers are green and red, and are drawn exactly
  like any other colour. On a dark screen each bar keeps its colour, on a darker track,
  with its text still easy to read.
- **Result percentages** — on a single-choice poll a bar shows the share of voters who chose it. On a
  multiple-choice poll it shows the share of all the selections made, so the bars add up to 100%.
- **Look and dark mode** — the site follows Google's Material 3 design, in the Roboto typeface:
  tabs, buttons, menus, dialogs and short messages ("snackbars") look and respond the same way
  everywhere. It follows your device's light or dark setting; the administration pages stay light
  for now.
- **Tooltips** — resting the pointer on an icon, or reaching it with the keyboard, explains what it
  does. On a touch screen, press and hold the icon. A result or choice whose name is cut off shows
  the full name the same way.
- **Fixed header** — the header, and the tab row beneath it on the home page, stay in place while
  you scroll; the page's content moves underneath them, never over or under.
- **The tab bar on a phone** — on screens up to 900 px wide the home page's tabs are each
  a small icon beside the name, a name of more than one word wrapped word by word to shorten the row, with no scroll arrows: where more tabs wait beyond an edge the row
  fades out there, and a swipe scrolls it with your phone's own momentum. Tapping a tab that is half
  hidden, picking one from the All tabs menu or moving to one with the arrow keys slides it fully into
  view (at once if your device asks for reduced motion). With a mouse, drag the row or turn the wheel
  over it to move it sideways. Refresh sits under the bar at the left and the All tabs menu at the right, each
  flush with the edge of the poll cards below.
- **Back to top** — once you have scrolled a good way down any page, a button appears near the
  bottom-right corner; press it (or reach it with the keyboard) to return to the top at once.
- Guests can browse Trending and Newest, search, and open any poll maximized; everything else
  asks you to sign in.
- **Privacy Policy and Terms of Service** — every page ends with a footer linking the Privacy Policy
  (`/privacy`), its Cookie Use section and the Terms of Service (`/terms`), with
  `privacy@crowdpoll.vote` for privacy questions and `support@crowdpoll.vote` for everything else.
  Creating an account needs the "I agree to the Terms of Service" box ticked; when the Terms change,
  you are asked to accept them again on your next visit before you can do anything else.
- **Your data** — the Profile page's Your Data section explains how to get a copy of your data and
  lets you delete your account: type DELETE to confirm. Your account, sessions, bookmarks and the
  polls you created go at once; your votes on other people's polls stay counted, shown as
  "Deleted user"; a ban from a poll stays.

## For administrators

- **Poll cards** — the admin page (`/admin`) shows each poll as a card: its state and actions,
  a panel with Open, Close and Archive, who created it (`Created By: <username> (<email>)`) and the dates it was created and launched, a panel of
  counts, and a **Settings Summary** — a few plain sentences describing the poll ("Your poll is
  a Public Poll. Everyone on CrowdPoll can find it and vote."). The underlined parts of the
  summary are links that open the setting they describe.
- **Search** — the Search view's filters sit in a panel the same width and look as a poll card, in the
  same centred column as the view tabs. Free text, state, created by, the date groups and the count groups
  are fields; visibility, choice mode and vote mutability are each one row of three radios (Any, then the
  two choices). **Clear** empties every field and puts each radio row back on Any. **Collapse Search**, above the
  panel, folds it away (the button then reads **Expand Search**); it folds itself after a search that shows results
  and stays open when nothing matched. Clicking the **Search** view tab opens a collapsed panel.
- **Create New Poll** opens the new poll's card as a six-step wizard: Who can vote, Title &
  Tags, Choices, Colors, How to vote, and When to vote. **Save** keeps your answers so you can
  finish later; **Publish**, available once every step has been visited and the poll is complete,
  sends the poll to be reviewed. New polls are public and let voters change their vote unless
  you choose otherwise.
- **Colors** — on the Colors step, the poll's creator or an administrator can choose a color for
  each choice from a fixed palette of eighteen, shown as a grid of named swatches. A choice left
  on **Automatic** is colored as before, and choosing a color for one choice never changes the
  color of another that was left on Automatic. Colors can also be changed after voting has
  started, while the choices themselves stay locked; changing only colors does not send the poll
  to be reviewed again. The poll's summary says "Bar colors are assigned automatically." or how many colors have
  been set manually, with a swatch for each.
- **Editing a poll** — select the part of the summary you want to change and the wizard opens
  at that step. Only what the poll's state allows can change: everything until the poll has
  votes, then only the title, the subtitle, the dates and the bar colors. **Save changes** sends
  the poll back to be reviewed; changing only colors on a poll that has votes does not.
- **Keywords** — a public poll can carry search keywords (lower-case words separated by
  commas); home search finds the poll by them.
- A poll's voter count limit, invitation list and banned voter list keep their stored values,
  but cannot be changed on the admin page for now.

## For poll creators

Every account has three grants: **View Polls**, **Vote on Polls** and **Create Poll**. New and
existing accounts hold all three. Administrators (`ENV_ADMINS`) hold every grant on every poll,
whatever is stored for their account.

- **Create Poll** — with both Create Poll and View Polls, the header's **Create Poll** link and the
  profile menu's **Poll Administration** entry open the admin page. There you see only the polls you created, with no views and no search form,
  and you can create, edit, publish, open, close, archive, duplicate, delete and view the results
  of those polls. Re-attempting a rejected poll's review stays with administrators; edit and
  publish the poll again instead. Any other poll's page answers "not found".
- **Vote on Polls** — without it, every poll card says "You do not have permission to vote." and
  offers no vote.
- **View Polls** — without it, no tab shows any poll card, only "You do not have permission to view
  polls."; searching and adding a poll to Watching or Live Results are refused, though removing one
  still works. Nothing already watched is deleted. Signed out, public polls show as
  for any guest.

**Inviting people.** On an *Only people you invite* poll, the admin card has an **Invitees** panel below its counts
(and below the wizard once the new poll has been saved that way). Paste or type addresses, separated by commas, spaces or
new lines, and choose **Invite** (or Ctrl+Enter); any address that could not be added stays in the field with the reason.
Each person gets one email from CrowdPoll inviting them in your name, sent as soon as the poll is open; addresses added
before then wait, as *Not sent yet*. Each row shows the person's status — *Not sent yet*, *Not delivered*, *Invited*,
*Accepted* (they opened the poll) or *Voted* — and its menu can **Resend invitation** once, a day or more after the last
email, while the poll is open, or **Remove** them (and, after a confirmation, their vote). You can invite and remove at any
time until the poll closes, without pausing voting. You may send at most `ENV_MAX_INVITATIONS_PER_DAY` invitation emails a
day across all your polls; the rest go out as the day's allowance frees up. Dates in the email are in your time zone. Someone
who signs in with a differently written form of the invited address (a Gmail address with or without dots, or a `+tag`)
is matched to their invitation.

The invitation's **Open the poll** button can also sign the invitee in, once, without a second email: it opens a
confirmation card naming the invited address, where one press of **Continue** signs them in and lands them on the poll,
maximized — a new address just ticks the Terms of Service box first, and a browser signed in as someone else offers
**Sign out and continue** in one press. Each email's link works until the poll ends or for 30 days, whichever comes
first, and only the newest email's link signs in, once; any link that no longer signs in still leads to the poll's
ordinary sign-in flow, so old invitation emails never dead-end. Opening the link writes nothing by itself, which keeps
corporate mail scanners from using it up.

There is no page for changing grants yet. To change one, edit the `permissions` column of the
`user` table (any of `View Polls`, `Vote on Polls`, `Create Poll`). The change takes effect when
the user next signs in, or once their cached session expires (`ENV_SESSION_CACHE_TTL`).

## Prerequisites

| Environment | Needs |
|---|---|
| Tests (`npm test`) | Node.js 22 only — an embedded PostgreSQL is downloaded with the packages |
| Development (`npm run dev`) | Node.js 22, PostgreSQL 16 (Windows installer or Docker), an Amazon SES development sending key for the login-link emails (a send-only IAM user; development mail is real mail) |
| Production | DigitalOcean App Platform with Managed PostgreSQL, Managed Valkey, Managed OpenSearch and a Spaces bucket with its CDN (the last three are optional: without them the app uses an in-process cache/queue, PostgreSQL full-text search and serves the TRENDING and Newest objects and assets itself — fine for one instance, not for a fleet) |

### Windows 11 development machine

```powershell
winget install OpenJS.NodeJS.LTS               # Node 22
winget install PostgreSQL.PostgreSQL.16        # PostgreSQL 16; create a database named app01
```

Create the `app01` database (for example with pgAdmin or `createdb app01`); the server creates
every table on start-up.

## First-time setup

```powershell
git clone https://github.com/roadraceresults/nativeAuthOAuth ; cd nativeAuthOAuth
npm install

# Create the git-ignored launch assets (.vscode/launch.json, devScripts/launch-dev.ps1)
# from the checked-in templates. This also generates one random ENV_BETTER_AUTH_SECRET
# (48 chars) shared by both files — the server refuses to start without a valid secret.
./devScripts.example/setup-dev.ps1        # add -Force to regenerate (mints a new secret)

# Then put your SES development sending key (ENV_SES_ACCESS_KEY_ID / ENV_SES_SECRET_ACCESS_KEY)
# and your PostgreSQL connection string (ENV_DATABASE_URL) into BOTH git-ignored copies.
```

## Running

```
npm run dev          # tsx watch src/server.ts — or ./devScripts/launch-dev.ps1, which sets the ENV_* variables
npm run build        # compiles to dist/ and writes fingerprinted copies of the static assets
npm start            # node dist/server.js
npm run reconcile    # recomputes every poll's vote counters from the stored votes
npm run publish-assets   # uploads the fingerprinted assets to the Spaces bucket (after build; needs ENV_SPACES_*)
npm run file-manifest -- <project>   # writes a file manifest of a git project (see File manifest below)
npx tsx devScripts/favicon-ico.ts    # regenerates src/public/favicon.ico from favicon.svg (see Site icon below)
```

The server starts by running its database migrations (it refuses to start if one fails),
connects to the cache, chooses the search engine, mounts the routes, and starts the
background sweeps and the vote writer. Open <http://localhost:8080>. Administrators are the
addresses in `ENV_ADMINS`; the admin page is at `/admin`.

## Testing

```
npm test             # every suite, on an embedded PostgreSQL with the in-process cache — no services to install
```

Where Windows Smart App Control blocks the embedded PostgreSQL binaries (`spawn UNKNOWN` at start-up), set
`TEST_PG_ADMIN_URL` to a local server's connection string for a role that may create databases, such as
`postgres://postgres:<password>@localhost:5432/postgres`. The run then creates and drops its databases there; only a
localhost server is accepted.

Set `ENV_VALKEY_URL` (for example `redis://localhost:6379`) to also run the cache integration
suite against a real Valkey or Redis server. Load tests for a deployed fleet live in
`devScripts/load/` (k6) with their own README; `devScripts/populate/seed-polls.ts` seeds a
database with 250,000 polls and a realistic vote distribution for them.

`npx tsx devScripts/populate/populate-poll.ts <poll-data.json>` creates one public poll from a JSON
file, or refreshes it, and fills it with simulated votes (`test_<n>@crowdpolltest.test`) that replay
the file's time series, moved so the latest data point is today. It writes through the app's own
poll, vote and counter paths, so the poll looks the same as one people voted on. A rerun keeps the
poll's id and replaces only its simulated votes. The database must already be migrated; see
`devScripts/populate/README.md` for the file format.

## File manifest

`npm run file-manifest -- <project>` counts the files of a git project and writes the results as
markdown tables. It needs Node 22 or later and `git` on the path, and it only reads the project.

```
npm run file-manifest -- .            # the current repository
npm run file-manifest -- ../other     # a relative path is resolved from where you typed the command
```

Each run creates `<project>/manifests/YYYY-MM-DD_HH-mm-ss/` (with `-2`, `-3` and so on if that name is
taken) and writes one table per file:

| File | Counts |
|---|---|
| `overall.md` | every file, by file type |
| `not-gitignored.md` | tracked and untracked files that are not ignored |
| `gitignored.md` | ignored files |
| `directories.md` | by top-level folder, as `committed`, `untracked` or `.gitignored`, then by file type |
| `dist.md`, `public.md`, `assets.md` | everything under `dist/`, `dist/public/` and `dist/public/assets/` |
| `src.md`, `tests.md` | everything under `src/` and `tests/` |

The last five are written only when their folder holds files. Every table has the columns file type,
files, lines, comment lines and size in bytes, and ends in a `**Total**` row. Lines are counted for text
files only, size for binary files only, and comment lines for text files in a known language (a line
that holds nothing but a comment). `node_modules`, `node-modules` and `manifests` are left out. Add
`/manifests/` to the project's `.gitignore` to keep the output out of `git status`; this repository
already does. The command prints the output folder, the number of files counted and skipped (missing
files, symlinks, folders, unreadable files) and the reports it wrote, and exits with 1 and writes
nothing when the argument is missing, is not a folder, or is not a git repository.

## Site icon

The browser-tab icon is `src/public/favicon.svg`, with `src/public/favicon.ico` (16, 32 and 48 px) for
browsers that do not read SVG icons. Never edit the ICO by hand: after changing `favicon.svg`, regenerate
it and commit both files together.

```
npx tsx devScripts/favicon-ico.ts
```

It needs Microsoft Edge at its usual install path, or `FAVICON_BROWSER` set to the path of another
Chromium-based browser (Chrome, Brave). It prints
`[favicon] wrote src/public/favicon.ico (16, 32, 48 px, <bytes> bytes)`, or a `[favicon]` message and
exit code 1, leaving the old ICO in place, when the browser is missing, fails or produces no image. It is
not part of `npm run build`.

## Email

CrowdPoll sends six messages: the sign-in link, the create-account invitation, the email-change verification, the
notice to the old address after a change, the notice that an account was deleted, and a poll creator's invitation to a
private poll (with its one reminder). The four with a link also link
the Privacy Policy and the Terms of Service; the two notices carry no link at all. The create-account invitation, sent
when someone asks to sign in with an address that has no account, carries a one-time link (15 minutes, the newest one
only): it opens Create Account for that address, and ticking the Terms and pressing Create Account creates the account
and signs in, with no second email; a link that can no longer be used falls back to the ordinary Create Account form.
They share one branded layout (`src/email/templates.ts`), come from
`CrowdPoll <no-reply@mail.crowdpoll.vote>`, and name `support@crowdpoll.vote` for questions.

- **Production** sends through Amazon SES (`ca-central-1`) over HTTPS, since DigitalOcean blocks outbound SMTP. The SES,
  DNS (SPF, DKIM, DMARC), inbound forwarding and alarm setup is done by hand; the procedure is in
  `requirements/20261019-153514-production-email/requirements.md` (RS8, RS10, RS17).
- **Development** sends through SES too, from `us-east-1` as `no-reply@dev.mail.crowdpoll.vote`, with a separate key that can
  send nowhere else; that region stays in the SES sandbox, so it only mails inboxes you have verified. The setup is in
  `specs/20261019-153514-PRODUCTION-EMAIL/quickstart.md` §6. The SMTP
  (Mailtrap) path and the console fallback remain in the code for reference; the tests capture messages and send none.
- Each send logs its type, a masked recipient (`j•••@gmail.com`) and the provider's message id, never the link.
- A sign-in link signs in at once only in the browser that asked for it (a short-lived `signin_binding` cookie);
  opened anywhere else, a page names the account and asks for one click to confirm.
- Before launch, `ENV_ALLOWED_EMAILS` limits account creation and sign-in to the listed addresses (and the administrators);
  anyone else is told CrowdPoll hasn't launched yet, and nothing is sent. In production it is an encrypted App Platform
  variable set in the console; remove it at launch.
- The three forms that send email carry a hidden field; a request that fills it sends nothing.
- `privacy@crowdpoll.vote` is an ImprovMX alias set up by hand, like `support@`.
- A new account or email change that is a `+tag` (or, for Gmail, dotted) variant of an existing address creates no
  second account.

## Sign-in with Google, Apple, Microsoft and Amazon

- `ENV_SIGNIN_METHOD` is `native` (the email link, the default), `oauth` (the providers only) or `both` (the provider
  buttons above the email form). A provider is on when all its `ENV_OAUTH_*` values are set; some but not all stops the
  app, and `oauth` or `both` with no provider stops it too. Start-up logs the mode and the providers, never a value.
- Every redirect address is built from `ENV_PUBLIC_ORIGIN` (required): `<origin>/api/auth/callback/google`, `…/apple`,
  `…/microsoft`, and `<origin>/api/auth/oauth2/callback/amazon` (Amazon goes through BetterAuth's generic OAuth plugin).
  Only those provider routes are mounted, so the email routes stay CrowdPoll's own in `both`.
- A provider address with the same email key as an existing account signs in to that account and links the provider to
  it, if the account has signed in before and the provider vouches for the address; an Apple Hide My Email address gets
  an account of its own. A new provider account accepts the Terms on its first page. Its picture is not kept.
- Apple's client secret is a JWT the app signs with the Sign in with Apple key (`node:crypto`, ES256) at start-up and
  every 30 days; `GET /.well-known/apple-developer-domain-association.txt` serves the file Apple asks for, once committed
  to `src/public/.well-known/`.
- A refused sign-in lands on `/login?error=<code>` with a message. A provider sign-in sets the `oauth_state` cookie
  for 5 minutes, listed in the Privacy Policy's Cookie Use table.
- Registering the four apps, the secrets and the checks are in
  `specs/20261022-131728-SOCIAL-OAUTH-PROVIDERS/contracts/provider-setup.md` (P0–P5) and `quickstart.md`.

## Deploying to DigitalOcean App Platform

`.do/app.yaml` describes the app: one web service on dedicated 1 vCPU / 2 GiB instances,
autoscaling between 4 and 12 on 70 % CPU, health-checked at `/healthz`, with a 30-second
termination grace period so a retiring instance finishes writing the votes it holds. Attach:

1. **Managed PostgreSQL 16** → `ENV_DATABASE_URL` (use the connection pool's URL).
2. **Managed Valkey** → `ENV_VALKEY_URL`. Shared by the fleet for sessions, refresh floors,
   the request budget, live vote counters, the Live Results registry and the vote queue.
3. **Managed OpenSearch** → `ENV_OPENSEARCH_URL`. Serves the home search; the app falls back
   to PostgreSQL full-text search whenever the cluster is unhealthy.
4. **Spaces + CDN** → the five `ENV_SPACES_*` variables. The trending and newest sweeps each
   publish two objects there every minute and `npm run publish-assets` uploads the static
   assets; the pages then reference all of them through the CDN.

Set `ENV_BETTER_AUTH_SECRET`, `ENV_ADMINS`, `ENV_SES_ACCESS_KEY_ID` and `ENV_SES_SECRET_ACCESS_KEY` as secrets (and the
`ENV_OAUTH_*` values of each sign-in provider, once `ENV_SIGNIN_METHOD` is `oauth` or `both`). The spec sets
`ENV_PUBLIC_ORIGIN=https://crowdpoll.vote` and `ENV_EMAIL_TRANSPORT=ses`, so the app refuses to start without the SES values (see *Email* below). Autodeploy from
the `dev` branch runs `npm ci && npm run build` and `npm start`.

Operational notes:

- `/healthz` always answers `200` (so the load balancer never removes an overloaded instance)
  and reports whether the cache answered, how many requests the instance shed by kind, and
  how many votes were refused for exceeding the per-address cap.
- An instance that cannot reach the cache answers every vote, search, refresh and Live
  Results request with `503` and a `Retry-After`, keeps serving pages, and pauses its sweeps
  until the cache is back.
- Every sweep (screening, schedule, counter flush, trending, newest, search index, bookmark
  expiry, nightly reconcile, budget controller) runs on one instance at a time; the vote writer
  runs on every instance.
- `[abuse]` log lines mark addresses that exceeded `ENV_MAX_VOTES_PER_IP_PER_MINUTE`;
  `[controller]` lines show the request rate against the budget and the current multipliers.

## Configuration

All settings are `ENV_*` environment variables. Intervals are in milliseconds unless noted.

| Variable | Default | Description |
|---|---|---|
| `ENV_PORT` | `8080` | HTTP port |
| `ENV_PUBLIC_ORIGIN` | — (required) | The site's origin, no path (`https://crowdpoll.vote`; `http://localhost:8080` in the templates); every provider redirect address is built from it |
| `ENV_DATABASE_URL` | `postgres://localhost:5432/app01` | PostgreSQL connection string |
| `ENV_DATABASE_CA_CERT` | unset | PEM of the CA that signed the database server's certificate (on DigitalOcean the database component's `CA_CERT`); the connection is then verified against it. Unset on a local database |
| `ENV_VALKEY_URL` | unset | Valkey/Redis URL; unset → in-process cache and queue |
| `ENV_OPENSEARCH_URL` | unset | OpenSearch endpoint; unset → PostgreSQL full-text search |
| `ENV_SPACES_BUCKET`, `ENV_SPACES_REGION`, `ENV_SPACES_KEY`, `ENV_SPACES_SECRET`, `ENV_SPACES_CDN_URL` | unset | Spaces bucket for the TRENDING and Newest objects and the assets; all five or none |
| `ENV_BETTER_AUTH_SECRET` | — (required, ≥ 32 chars) | Session signing secret |
| `ENV_ADMINS` | `roadraceresults@gmail.com` | Comma-separated administrator addresses |
| `ENV_SIGNIN_METHOD` | `native` | `native` (email login link), `oauth` (sign-in providers only) or `both` |
| `ENV_SIGNIN_COOKIE_DURATION_MAX` | `2592000000` | Longest stay-signed-in session (30 days) |
| `ENV_STAY_SIGNED_IN` | `0` | `1` → the login page's "Stay signed in" box starts ticked; anything else leaves it clear |
| `ENV_EMAIL_TRANSPORT` | `smtp` | `smtp` (development) or `ses` (production); `ses` requires the three `ENV_SES_*` values |
| `ENV_SES_REGION` / `ENV_SES_ACCESS_KEY_ID` / `ENV_SES_SECRET_ACCESS_KEY` | — | Amazon SES region and sending key |
| `ENV_SMTP_HOST` / `ENV_SMTP_PORT` / `ENV_SMTP_USER` / `ENV_SMTP_PASS` | Mailtrap sandbox / `2525` / — / — | Development mail; without user and password each message is logged to the console |
| `ENV_EMAIL_FROM` | `CrowdPoll <no-reply@mail.crowdpoll.vote>` | Sender of every message |
| `ENV_EMAIL_SEND_TIMEOUT` | `10000` | Longest one send may take before it counts as failed |
| `ENV_EMAIL_ASSET_ORIGIN` | unset | Origin the email logo is loaded from (development: `https://crowdpoll.vote`, since mail apps cannot reach `localhost`); unset → the link's origin |
| `ENV_ALLOWED_EMAILS` | unset | Comma-separated addresses allowed to create an account and sign in before launch; administrators always are. Unset or empty: everyone. An invalid entry stops the app. Production: an encrypted console variable, never in `.do/app.yaml` |
| `ENV_OAUTH_GOOGLE_*`, `ENV_OAUTH_MICROSOFT_*`, `ENV_OAUTH_AMAZON_*` (`CLIENT_ID`, `CLIENT_SECRET`) | — | Sign-in provider credentials; a provider is on when both are set |
| `ENV_OAUTH_APPLE_CLIENT_ID` / `_TEAM_ID` / `_KEY_ID` / `_PRIVATE_KEY` | — | Sign in with Apple: the Services ID, team, key id and the key's PEM (`\n` pairs read as line breaks) |
| `ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW` / `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW` | `15` / `2` | Email-sending rate limit (window in **minutes**) |
| `ENV_API_CALL_TIMEOUT` | `10000` | Bound on one screening call |
| `ENV_POLL_APPROVAL_POLLING_INTERVAL` | `5000` | Screening sweep interval |
| `ENV_POLL_DATE_CHECK_POLLING_INTERVAL` | `60000` | Schedule sweep interval |
| `ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL` | `10000` | Editing-page heartbeat |
| `ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS` | `10` | Screening attempts before a poll is rejected |
| `ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL` | `5000` | Admin list refresh |
| `ENV_PARTICIPANTS_VIEWPORT_SIZE` | `10` | Rows per page in the card's participant lists |
| `ENV_MAX_INVITATIONS_PER_DAY` | `200` | Invitation and reminder emails per poll creator in any rolling 24 hours; the rest wait |
| `ENV_PRIVATE_VOTER_LIMIT_DEFAULT` | `100` | Voter ceiling on a private poll |
| `ENV_MIN_CHOICES` / `ENV_MAX_CHOICES` | `2` / `50` | Choices a poll may be published with |
| `ENV_SESSION_CACHE_TTL` | `300000` | How long a session lookup is served from the cache |
| `ENV_MAX_POLLS_SEARCH_RESULTS` | `200` | Cap on search results, personal-tab rows and overlay ids |
| `ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS` | `200` | Cap on admin search results and the unfiltered admin list |
| `ENV_MAX_TRENDING_POLLS` | `200` | Polls on the TRENDING tab |
| `ENV_TRENDING_POLLS_RECOMPUTE_INTERVAL` | `60000` | TRENDING recompute and publication interval |
| `ENV_MAX_NEWEST_POLLS` | `50` | Polls on the Newest tab; at most `ENV_MAX_POLLS_SEARCH_RESULTS` |
| `ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL` | `60000` | Newest recompute and publication interval (at least 1000) |
| `ENV_MIN_LIVE_REFRESH_INTERVAL` | `2000` | Floor between two Live Results refreshes per visitor |
| `ENV_MIN_MANUAL_REFRESH_INTERVAL` | `5000` | Floor between two manual refreshes per visitor |
| `ENV_MIN_SEARCH_INTERVAL` | `2000` | Floor between two searches per visitor |
| `ENV_MIN_VOTE_INTERVAL` | `2000` | Floor between two votes per session |
| `ENV_MANUAL_REFRESH_BURST` | `5` | Manual requests a visitor may make back to back before the floor applies |
| `ENV_SEARCH_BURST` | `3` | Searches a visitor may make back to back before the floor applies |
| `ENV_MAX_VOTES_PER_IP_PER_MINUTE` | `600` | Votes per address per minute before refusal |
| `ENV_MAX_LIVE_RESULTS_PER_USER` | `5` | Polls in the Live Results tab |
| `ENV_MAX_IDLE_TIME` | `1800000` | Idle time before Live Results asks whether to continue |
| `ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND` | `1250` | Dynamic requests per second each live instance adds to the budget |
| `ENV_SERVER_MAX_REFRESH_PER_SECOND` | `15000` | Cap on the fleet's budget |
| `ENV_SERVER_MAX_SEARCH_PER_SECOND` | `2000` | Search-engine queries per second before searches are stretched |
| `ENV_SERVER_MAX_SEARCH_PER_SECOND_FALLBACK` | `200` | The same while PostgreSQL full-text search serves |
| `ENV_BUDGET_CONTROLLER_INTERVAL` | `1000` | Controller tick; must not exceed the smallest floor |
| `ENV_MAX_STRETCH` | `8` | Largest multiplier on the search and manual floors |
| `ENV_BUDGET_LOWER_THRESHOLD_PERCENT` | `80` | Load below this share of the budget relaxes the multipliers |
| `ENV_INSTANCE_MAX_INFLIGHT` | `200` | Requests in flight on one instance before it sheds |
| `ENV_INSTANCE_MAX_EVENT_LOOP_LAG` | `100` | Event-loop lag (ms) before an instance sheds |
| `ENV_SHED_RETRY_AFTER` | `2000` | `Retry-After` handed out with a `503` |
| `ENV_COUNTER_FLUSH_INTERVAL` | `2000` | How often live vote counters are written to poll rows |
| `ENV_VOTE_BATCH_SIZE` | `500` | Votes written per batch |
| `ENV_VOTE_QUEUE_LAG_NOTICE` | `2000` | Writer lag above which a vote is reported as queued |
| `ENV_SEARCH_CACHE_TTL` | `10000` | How long identical searches are answered from the cache |
| `ENV_OUTBOX_DRAIN_INTERVAL` | `15000` | How often changed polls are pushed to the search index |
| `ENV_MAX_BOOKMARKS_PER_USER` | `200` | Bookmarks per visitor |
| `ENV_BOOKMARK_EXPIRY_MONTHS` | `6` | Months of closure or inactivity before a bookmark is removed |
| `ENV_PAGE_LOADS_PER_MINUTE` | `120` | Page loads per session (or address) per minute before a notice |

## Poll visibility settings

An administrator sets who may see and vote on a poll in the first step of the poll card's
wizard, **Who can vote**. Its three options store these settings:

| Setting | Options | Meaning |
|---|---|---|
| **Poll Visibility** | `Public Poll` / `Private Poll` | A public poll can appear on TRENDING and in search results for everyone. A private poll reaches only the people it is shared with, through their My PRIVATE POLLS tab |
| **Sharing Mode** (private polls only) | `Anyone With The Link` / `Invitation Only` | Whether anyone holding the poll's link may take part, or only the addresses on its invited list |
| **Anonymous Votes** (private polls only) | `Yes` / `No` | Reserved for the poll-creator role: `Yes` hides who voted for which choice from the creator, `No` reveals it. Administrators always see who voted; ordinary voters never do. The setting is stored and shown but not yet enforced: a poll's creator, like an administrator, currently sees who voted on the results page |

**Anyone you send the link to** is `Private Poll` with `Anyone With The Link`, **Only people
you invite** is `Private Poll` with `Invitation Only`, and **Everyone on CrowdPoll** is
`Public Poll`. A private poll also offers the switch **Users can see who voted for what**, which
stores **Anonymous Votes** (`Yes` while off, the default). All three freeze once the poll has
received its first vote — deleting votes does not unfreeze them — so the terms voters took
part under cannot change afterwards.

## API

The full machine-readable contract lives in [`postman/openapi.json`](postman/openapi.json)
(OpenAPI 3.1) and is kept in sync with the routes by a test. Requests that cost the fleet
something — votes, searches, tab refreshes, Live Results — answer `429 too-soon` when sent
before that visitor's floor and `503 busy` when an instance is overloaded; both carry
`retryAfterMs` and a `Retry-After` header, and every successful answer carries
`nextRefreshMs`, the interval the visitor should wait before the next request of that kind.
