# CrowdPoll

A real-time opinion-poll site with passwordless login, built in TypeScript with Express,
PostgreSQL and [BetterAuth](https://better-auth.com). Visitors browse polls on a
nine-tab home page (Home, Your Polls, Shared With You, Your Votes, Trending, Newest, Watching, Live Results,
Search — each tab with its own icon, under a rule that runs the full width of the window), vote
once per poll (or change their vote on a poll that allows it), watch the polls they care about,
and follow up to five polls update live. Administrators create, edit, screen, moderate and export polls. Login emails a
one-time login link (no passwords, ever), or goes through Google, Apple, Microsoft or Amazon: `ENV_SIGNIN_METHOD`
chooses the email link alone (`native`), the providers alone (`oauth`) or both.

The site is built to hold a million concurrent visitors over a quarter of a million polls on a
small autoscaled fleet: nothing a visitor does refreshes on its own except the Live Results
tab, every kind of request has a per-visitor floor, the fleet stretches those floors under
load in a fixed order (searches first, votes never), votes are accepted at once and written in
batches, and everything identical for every visitor is served as pre-built objects from a
delivery network.

## For end users

- **Home** — where a logged-in visitor lands: one list gathering, in this order, the polls shared
  with you (10 at most), your own polls (10), the polls you voted in (10), every poll you watch, and
  ten from Trending, each poll once, at its first place. Open polls appear for two months after
  they opened, closed polls for a week after they closed, and polls waiting to open always; drafts,
  rejected and archived polls never do. Each card says why it is listed ("You were invited",
  "Your poll", "You voted", "You are watching", "Trending"). The list is rebuilt when something
  you did changes it, and at least every two hours; voting on or watching a card on Home does not
  move it until you next open Home. Guests do not see the tab, and the avatar menu's first item,
  **Home**, opens it from any page.
- **Trending** — the polls with the most recent votes, first on every visit. Nothing on it
  changes until you press **Refresh**, which is offered once a newer list can exist (10 seconds
  after the last one at most); while it waits, its tooltip says how long is left.
- **Newest** — the public polls opened most recently, newest first (fifty at most); a poll an
  administrator re-opens counts as new, and a poll under edit keeps its place. **Refresh** works
  as on Trending.
- **Your Polls**, **Shared With You**, **Your Votes** and **Watching** — the private tabs come
  first. Log in to see them; **Refresh** can be pressed a few times in a row, then once every 5
  seconds, and its tooltip says how long is left while it waits.
  - **Your Polls** — every poll you created, public and private, in every state, newest first. A
    poll that has not launched shows its state (and why it was rejected) and cannot be voted on.
  - **Shared With You** — the private polls someone else created that you were invited to, or whose
    link you opened. It has no remove control. Opening a poll's shared link (`/?PID=…`, from **Copy
    Link**) lists it here and opens that tab at the poll, shown maximized; a guest is sent to log in
    first (or to create an account) and returns to the poll, even when the login email is opened in
    another browser (after one click to confirm the login there). A poll that is not published yet waits here as a card saying who shared it; it
    becomes the ordinary card once published. Any link to a poll you may not see answers "That poll
    isn't available."
  - **Your Votes** — every poll you voted in, public and private.
  - **Watching** — only the polls you chose to watch.
- **Human check before logging in** — **Login**, **Create Account** and an invitation open on a
  "Vote protection" card: tick **I am not a Bot or AI Agent** (it follows your Color Scheme in Site Settings), and the page's own
  card appears in its place. The check runs on CrowdPoll's own servers and sets no cookie; **What this
  safeguard checks** leads to the Privacy Policy's *Bot and AI Agent Detection*. If it fails, the card says so and offers **Try
  again**; if it cannot load within 10 seconds, the login card appears without it. A link from a
  login email needs no check.
- **A public poll's own page** — every public poll that is open or closed has an address of its own,
  `/poll/<id>`, that search engines can read. A guest who opens it, or a shared link to it, sees the
  poll's live card on Trending, maximized; a logged-in visitor goes to the poll as before.
- **Search** — type words in the box and press Enter: titles match first, then subtitles, then
  choices, then keywords and notes; a misspelt title is still found. At most 200 results are shown.
- **Vote** — press **Vote** on a card, pick your choice(s) and **Submit vote** (**Submit votes** on a multiple-choice poll). The card shows
  the new counts at once. On a very busy site the card may say your vote is *queued*; it has
  been counted and will be stored within moments. Under the count, the voting side says
  *Multiple-choice poll* and *You may change your vote* when they apply.
- **Add Choice** — on a Private poll whose creator lets voters add choices, the voting side of
  the card has an **Add Choice** button while the poll is open. Type a choice of up to 35
  characters and press **Save**: it appears last on the card at once, for every voter, and can be
  voted for straight away. A choice the poll already has (ignoring capitals and spaces), a full
  poll, or language that isn't allowed is refused with the reason in the dialog. On a Final-Vote
  poll you can add choices only until you have voted.
- **Live Results** — press **Live Results** on any card to watch it update every few seconds
  in the Live Results tab (every 2 seconds, easing off to every 10 while nothing changes; up to
  five polls; a sixth is refused until you remove one). On that tab the same link reads
  **✕ Live Results** and takes the poll off it — for every poll there, even one that has closed
  while you watched it. After 30 minutes without any interaction the tab asks whether to continue.
- **Watch** — the eye on a card puts a poll in Watching until it is archived or has been closed or
  inactive for six months; press it again to stop. Up to 200 polls. You can watch a poll you may
  see (public, or private and invited to or opened by you); a poll you lose access to leaves
  Watching and comes back if access returns. Voting never watches a poll.
- **Notes** — a poll may have notes under its title: the card shows their first two lines, with
  **Show more ⌄** when there is more. **Show more ⌄** opens the poll maximized, with the whole notes
  above its line graph.
- **Maximize** — click a card's title or subtitle, **Show more ⌄**, or the maximize icon at the right
  of its title (on either side of the card), to show that poll on its own, in the tab you are on, with every
  choice visible at once and no scrolling inside the card. The card works exactly as it does in
  the grid. Close it with the same icon, now a minimize icon, the **Escape** key, or a click on the
  tab you are on; the tab comes back as you
  left it. Switching tabs or searching closes it too. A poll that leaves Trending or Newest while
  you have it open stays open until you close it.
- **Who voted** — on a private poll whose **Users can see who voted for what** switch is on, the
  maximized view shows who voted for what, below the notes and above the line graph, to everyone who
  may see the poll's results (and to administrators). It lists current votes only, by name (never an
  address), each with its date; hover over a date for the time. **Sort by Voter** (the default) groups
  each voter's choices; **Sort by Choice** groups each choice's voters, in the order of the bars, and
  leaves out choices nobody picked. The sort lasts while the poll stays open. The panel grows to fit
  the list and follows the bars: when the counts change it is fetched again, so a new vote appears a
  moment after the bars move. A poll nobody has voted on shows **No votes yet.**
- **Vote history graph** — beside a maximized poll, a line graph shows how each choice's share of
  the vote has moved over time, in the same colours as its bars (a colour too faint for the light or
  dark theme is drawn in a deeper or brighter shade of itself, so every line stays visible), with a
  legend giving each line's current share and the total count of votes (of voters, on a
  multiple-choice poll, where the votes cast can outnumber them). Choose **1 Day**, **1 Week**,
  **1 Month** or **1 Year** (only the ranges the poll's history covers are offered; the longest is
  shown first). The scale ends at 25, 50, 75 or 100%, whichever fits the lines shown, so small
  shares fill the graph. Point at the graph, or touch it on a phone, to read every line's share at that
  moment; on a phone the reading stays after you lift your finger, until you tap outside the graph.
  From the keyboard, Tab to the graph and use the Left and Right arrow keys (Home and End for the
  ends, Escape to hide the reading); a screen reader reads each point. Times are in your own time
  zone. The graph updates itself about once a minute while it is open. Anyone who may see a
  poll's results may see its graph, guests included on public polls. Choices with less than 1% of
  the current vote are left off. The graph is drawn only on a poll whose administrator has turned on
  **Show the line graph** (see the View step below); on every other poll the maximized view has no
  graph.
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
  everywhere. The site is light for everyone, whatever your device's own light or dark setting.
- **Site Settings** — the avatar menu's Site Settings item (a gear, for every logged-in user) opens a
  page with one setting, Color Scheme: Light (the default) or Dark. A choice applies at once, with no
  Save button, and is saved to your account, so every page, the administration pages and the line
  graph included, opens in it on any device you log in on. Other open tabs switch too. If the save
  fails, the page goes back to the scheme your account holds and says so. Signing out returns the
  browser to Light. Poll Administration's menu item now has its own checklist icon.
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
- **Back to top** — once you have scrolled a good way down any page, a button appears at the
  bottom left; press it (or reach it with the keyboard) to return to the top at once.
- Guests can browse Trending and Newest, search, and open any poll maximized; everything else
  asks you to log in.
- **Privacy Policy and Terms of Service** — every page ends with a footer linking the Privacy Policy
  (`/privacy`), its Cookie Use section and the Terms of Service (`/terms`), with
  `privacy@crowdpoll.vote` for privacy questions and `support@crowdpoll.vote` for everything else.
  When you are logged in, it also has a **Delete Account** link, which opens the delete dialog.
  Creating an account needs the "I agree to the Terms of Service" box ticked; when the Terms change,
  you are asked to accept them again on your next visit before you can do anything else.
  Opened from another CrowdPoll page in the same tab, the Privacy Policy and the Terms show a **Back**
  arrow under the header, in line with the logo (on a phone, above the title); it returns to that page, past any
  section links you followed. Opened in a new tab or from another site, they show no arrow. The home page keeps
  the tab you are on in its address (`/?tab=your-votes`, for example), so a return by the Back arrow, the
  browser's Back button, a reload or a bookmark shows that tab again; a tab you may not use while logged out
  shows Trending instead. The Delete Account dialog's **Cancel** (or Escape) takes you back to the page you came
  from the same way, and so does the Poll Administration page's Back arrow; opened directly, Cancel closes the
  dialog in place and the admin arrow opens the home page.
- **Device evidence** — when collection is on, CrowdPoll records a fingerprint of your device and browser each
  time you log in and vote, to help uphold one account per person. Nothing you see changes, and a fingerprint
  never stops you voting. It is kept about 4 months at most and goes with your account; the Privacy Policy's
  [Device Evidence](/privacy#device-evidence) section says exactly what is kept.
- **Your data** — the Privacy Policy explains how to get a copy of your data, and its **Delete your
  account** link opens the Profile page's delete dialog: type DELETE to confirm. Your account, sessions, bookmarks and the
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
  Tags, Choices, View, How to vote, and When to vote. **Save** keeps your answers so you can
  finish later; **Publish**, available once every step has been visited and the poll is complete,
  sends the poll to be reviewed. New polls are public and let voters change their vote unless
  you choose otherwise.
- **Notes** — Title & Tags has a **Notes** field after Subtitle: up to 6000 characters of text with
  **bold**, *italic* and underline (the toolbar, or Ctrl/⌘+B, I, U) and line breaks; pasted text
  keeps no formatting. **... edit ⌄** opens the editor in place; **Done** keeps the notes in the
  wizard, **Cancel** or **Escape** drops the change (asking first), and **Next >>** or a step circle
  keeps it. The notes are saved with **Save**, **Publish** or **Save changes**, are screened with the
  title, subtitle and choices, and on a poll with votes wait for review like a changed subtitle.
  The read-only card shows their first two lines after the summary. Duplicates and both exports
  carry them.
- **View** — on the View step, the poll's creator or an administrator can choose a color for
  each choice from a fixed palette of eighteen, shown as a grid of named swatches. An administrator
  also sees **Show the line graph** at the top of this step; it is off by default, on every poll,
  new or existing. Only an administrator can change it: for anyone else the step has no checkbox
  and the poll's summary says whether the graph is shown. Changing it on a poll with votes does not
  send the poll to be reviewed, and it can be changed on a closed poll, but not while the poll is
  awaiting approval. A choice left
  on **Automatic** is colored as before, and choosing a color for one choice never changes the
  color of another that was left on Automatic. Colors can also be changed after voting has
  started, while the choices themselves stay locked; changing only colors does not send the poll
  to be reviewed again. The poll's summary says "Bar colors are assigned automatically." or how many colors have
  been set manually, with a swatch for each.
- **Voters may add choices** — on a Private poll, the How to vote step has a **Voters may add
  choices** switch, off by default, which can be changed at any time, even after votes; the summary
  says "Voters may add choices: Yes" or "No". A choice a voter adds is an ordinary choice: you can
  rename, recolor or delete it. On a poll that shows who voted for what, the Choices step lists
  **Added by** with the voter's name for each choice a voter added; nothing is recorded on an
  anonymous poll, and the name goes when that account is deleted. Saving the wizard keeps any
  choice a voter added while it was open; only the choices you removed are deleted. A duplicate keeps
  the switch as it was, and its choices, but not who added them.
- **Editing a poll** — select the part of the summary you want to change and the wizard opens
  at that step. Only what the poll's state allows can change: everything until the poll has
  votes. Once it has votes, the title, subtitle, notes, choices, dates and bar colors stay editable,
  a private poll can switch between *Anyone you send the link to* and *Only people you
  invite* (both ways), a single-choice poll can become
  multiple-choice (never back), and whether voters may change their vote switches both ways.
  Visibility (public/private), anonymity and keywords stay frozen. Editing never interrupts an
  open poll: voters keep voting while the wizard is open. **Save changes** applies everything
  except a changed title, subtitle, notes or choice list at once; those four wait as *changes pending
  review* — the poll stays open and unchanged until the review approves them — and the card says
  so until it resolves (or shows *changes rejected* with the reason). Choices change by label:
  a kept line keeps its votes, a new line is added, and a removed line's votes are released —
  the card asks before you delete a choice that has votes, and those voters may vote again.
  Changing only colors on a poll that has votes is applied without review.
- **Keywords** — a public poll can carry search keywords (lower-case words separated by
  commas); home search finds the poll by them.
- A poll's voter count limit and banned voter list keep their stored values, but cannot be
  changed on the admin page for now; the invitation list is managed from the Invitees panel.

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
*Accepted* (they opened the poll) or *Voted* — and its menu can **Resend invitation** once, `ENV_INVITATION_RESEND_WAIT` (a day by default) or more after the last
email, while the poll is open, or **Remove** them (and, after a confirmation, their vote). You can invite and remove at any
time until the poll closes, without pausing voting. You may send at most `ENV_MAX_INVITATIONS_PER_DAY` invitation emails a
day across all your polls; the rest go out as the day's allowance frees up. Dates in the email are in your time zone. Someone
who logs in with a differently written form of the invited address (a Gmail address with or without dots, or a `+tag`)
is matched to their invitation.

**Custom Email Message.** While Step 1 is set to *Only people you invite*, the wizard shows a **Custom Email Message**
field directly under that answer. It works like the Notes field — "... edit" opens the same
editor, with line breaks, bold, italic and underline — and holds up to 1000 characters, formatting marks included. The
message appears in a shaded box under the "… invited you to vote …" paragraph of every invitation and reminder, as it
stands when each email is sent, and the Settings Summary says *A Custom Invitation Email Message has been entered.*, a
link back to the field. It is reviewed with the title, subtitle and notes: on a poll that already has votes a change
waits for approval, and emails carry the approved message until then. Switching the poll to another *Who can vote*
answer hides the field and stops sending the message but keeps it, so switching back restores it. Only you and
administrators see it; voters never do, and Duplicate copies it.

The invitation's **Open the poll** button can also sign the invitee in, once, without a second email: it opens a
confirmation card naming the invited address, where one press of **Continue** signs them in and lands them on the poll,
maximized — a new address just ticks the Terms of Service box first, and a browser logged in as someone else offers
**Log out and continue** in one press. Each email's link works until the poll ends or for 30 days, whichever comes
first, and only the newest email's link logs in, once; any link that no longer logs in still leads to the poll's
ordinary login flow, so old invitation emails never dead-end. Opening the link writes nothing by itself, which keeps
corporate mail scanners from using it up.

There is no page for changing grants yet. To change one, edit the `permissions` column of the
`user` table (any of `View Polls`, `Vote on Polls`, `Create Poll`). The change takes effect when
the user next logs in, or once their cached session expires (`ENV_SESSION_CACHE_TTL`).

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
npm run fcaptcha     # runs the FCaptcha server locally on port 3001, for the human check (see The FCaptcha service)
npm run deploy       # starts a production deployment of main and follows it (needs DIGITALOCEAN_TOKEN)
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

Every branch folder shares one development database, so after a branch with a new migration is merged a server can
refuse to start with `Migration check failed: corrupted migrations: …`. From that folder, `npm run fix-migrations` shows
what it would change and writes nothing; `npm run fix-migrations -- --apply` renames, rolls back or applies migrations in
one transaction until the record matches the folder. It repairs only a database on this machine; see
`devScripts/MIGRATIONS-HOWTO.md`.

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

CrowdPoll sends six messages: the login link, the create-account invitation, the email-change verification, the
notice to the old address after a change, the notice that an account was deleted, and a poll creator's invitation to a
private poll (with its one reminder). The four with a link also link
the Privacy Policy and the Terms of Service; the two notices carry no link at all. The create-account invitation, sent
when someone asks to log in with an address that has no account, carries a one-time link (15 minutes, the newest one
only): it opens Create Account for that address, and ticking the Terms and pressing Create Account creates the account
and logs in, with no second email; a link that can no longer be used falls back to the ordinary Create Account form.
They share one branded layout (`src/email/templates.ts`), come from
`CrowdPoll <no-reply@mail.crowdpoll.vote>`, and name `support@crowdpoll.vote` for questions.

- **Production** sends through Amazon SES (`ca-central-1`) over HTTPS, since DigitalOcean blocks outbound SMTP. The SES,
  DNS (SPF, DKIM, DMARC), inbound forwarding and alarm setup is a one-time task done by hand by the operator.
- **Development** sends through SES too, from `us-east-1` as `no-reply@dev.mail.crowdpoll.vote`, with a separate key that can
  send nowhere else; that region stays in the SES sandbox, so it only mails inboxes you have verified. The setup, including verifying a test inbox, is in
  `specs/20261019-153514-PRODUCTION-EMAIL/quickstart.md` §6.
  The SMTP (Mailtrap) path and the console fallback remain in the code for reference; the tests capture messages and send none.
- Each send logs its type, a masked recipient (`j•••@gmail.com`) and the provider's message id, never the link.
- A login link logs in at once only in the browser that asked for it (a short-lived `signin_binding` cookie);
  opened anywhere else, a page names the account and asks for one click to confirm.
- Before launch, `ENV_ALLOWED_EMAILS` limits account creation and login to the listed addresses (and the administrators);
  anyone else is told CrowdPoll hasn't launched yet, and nothing is sent. In production it comes from `allowed_emails` in the
  git-ignored `infra/secrets.auto.tfvars`, as an encrypted variable, and is required there; at launch, remove its check from
  `infra/variables.tf` and leave it empty.
  An entry may be a pattern holding `*`, which stands for any characters except `@`: `*@crowdpoll.vote` admits every
  address at that domain, `qa-*@gmail.com` every Gmail address starting `qa-`, `*@*.crowdpoll.vote` its subdomains.
  A pattern admits everyone with a matching mailbox, so a pattern on a public mail domain opens sign-up to its users.
  Patterns are compared with the address as Gmail reads it (dots and `+tag` dropped), so `john.*@gmail.com` matches
  nothing; write `john*@gmail.com`. An entry without an `@` (`*.crowdpoll.vote`) stops the app. Start-up logs the count
  of each kind and of the administrators, who are always allowed,
  `[auth] Sign-up allowlist on (2 addresses, 1 pattern; 3 administrators always allowed)`.
- The three forms that send email carry a hidden field; a request that fills it sends nothing.
- `privacy@crowdpoll.vote` is an ImprovMX alias set up by hand, like `support@`.
- A new account or email change that is a `+tag` (or, for Gmail, dotted) variant of an existing address creates no
  second account.

## Login with Google, Apple, Microsoft and Amazon

- `ENV_SIGNIN_METHOD` is `native` (the email link, the default), `oauth` (the providers only) or `both` (the provider
  buttons above the email form). A provider is on when all its `ENV_OAUTH_*` values are set; some but not all stops the
  app, and `oauth` or `both` with no provider stops it too. Start-up logs the mode and the providers, never a value.
- Every redirect address is built from `ENV_PUBLIC_ORIGIN` (required): `<origin>/api/auth/callback/google`, `…/apple`,
  `…/microsoft`, and `<origin>/api/auth/oauth2/callback/amazon` (Amazon goes through BetterAuth's generic OAuth plugin).
  Only those provider routes are mounted, so the email routes stay CrowdPoll's own in `both`.
- A provider address with the same email key as an existing account logs in to that account and links the provider to
  it, if the account has logged in before and the provider vouches for the address; an Apple Hide My Email address gets
  an account of its own. A new provider account accepts the Terms on its first page.
- Logging in with Google shows your Google profile picture where the default avatar appears, in the header and on the
  Profile card; it follows the picture at Google each time you log in with Google, and goes when the account is deleted.
  Amazon, Apple and Microsoft accounts keep the default avatar. It needs Spaces: without `ENV_SPACES_*`, every account
  keeps the default avatar. A failure to fetch or store the picture never stops the login.
- The Login card is the one way in for new and returning people alike: it has no Create account link, and under its email
  field says "New to CrowdPoll? Enter your email and we'll send you a link to create your account." An address with no
  account is emailed the create-account link (see Email). The Create Account page stays, for those links and for anyone
  who opens `/create-account`.
- **Stay logged in** applies to every way of logging in. On the Login card it sits above the provider buttons when there
  are any, and a provider login with it ticked lasts as long as an emailed link's (30 days by default). Left clear, a
  login lasts until the browser closes, or 24 hours at most.
- The Login card says under each provider's button what that provider shares, and the invitation card says it under its
  buttons. After a login, by a provider or an emailed link, "Logged in as" and the address appear on the Accept Terms card, or for 7 seconds on the first page, beside an
  hourglass whose sand runs out as the message goes.
- Apple's client secret is a JWT the app signs with the Sign in with Apple key (`node:crypto`, ES256) at start-up and
  every 30 days; `GET /.well-known/apple-developer-domain-association.txt` serves the file Apple asks for, once committed
  to `src/public/.well-known/`.
- A refused login lands on `/login?error=<code>` with a message. A provider login sets the `oauth_state` cookie
  for 5 minutes, listed in the Privacy Policy's Cookie Use table.
- Registering the four apps and their secrets is a one-time task for the operator; the redirect addresses above are what
  each provider needs.

## Deploying to DigitalOcean App Platform

The hosting is described in one place, the Terraform configuration under `infra/`: the app `crowdpoll` (the `web` and
`fcaptcha` services, the `/fcaptcha` ingress and the `crowdpoll.vote` domain), the PostgreSQL 18 cluster
`db-pgsql-tor1-crowdpoll` and the Valkey 9 cluster `valkey-tor1-crowdpoll` (each open only to the app), and the Spaces
bucket `crowdpoll-cdn` with its CDN, all in `tor1`. The plugins are pinned exactly (`digitalocean/digitalocean` 2.106.0,
`hashicorp/random` 3.9.1) and `infra/.terraform.lock.hcl` is committed, so every plan uses the same ones.

`web` runs on dedicated 1 vCPU / 2 GiB instances, health-checked at `/healthz`, with a 30-second termination grace
period so a retiring instance finishes writing the votes it holds. Its Valkey is shared by the fleet for sessions,
refresh floors, the request budget, live vote counters, the Live Results registry and the vote queue. The trending and
newest sweeps each publish two objects to the bucket every minute and `npm run publish-assets` uploads the static
assets; the pages then reference all of them through the CDN. OpenSearch is not provisioned: the home search uses
PostgreSQL full-text search.

**What you need.**

- Terraform ≥ 1.6, or OpenTofu ≥ 1.6 if Windows Application Control blocks `terraform.exe`; `terraform version` must
  print a version.
- A DigitalOcean custom-scoped token with create, read, update and delete on apps, databases, CDN and domains, expiring
  in 30 days, set in the session only: `$env:DIGITALOCEAN_TOKEN = "<token>"` (PowerShell). Never write it to a file.
- A Spaces key pair and an SES access key for the sending user.

**The secrets file.** Copy `infra/secrets.auto.tfvars.example` to `infra/secrets.auto.tfvars` (git-ignored) and fill in
`better_auth_secret` (`openssl rand -hex 32`), the SES key, the Spaces key pair, `admins` and `allowed_emails`; a login
provider's `oauth_*` values are set together or left empty, and an empty one adds no setting. A required value left
empty stops `terraform plan` with `<name> must be set in infra/secrets.auto.tfvars.` FCaptcha's two secrets are
generated by Terraform. The cluster sizes default to `db-s-1vcpu-1gb` and can be set in the same file.

**Plan and apply.** In `infra/`: `terraform init`, `terraform fmt -check`, `terraform validate`, then `terraform plan`
to review every change (secrets show as `(sensitive value)`), and `terraform apply` to make them. A second `plan` right
after an apply should report `No changes.` A change to the hosting is a change to `infra/`, reviewed in a plan; nothing
is changed in the console.

**The state.** Terraform keeps its record of the resources in `infra/terraform.tfstate` (git-ignored). It holds every
secret in plain text: back it up in encrypted form (for example as a password-manager attachment) after each apply, and
keep it and `infra/secrets.auto.tfvars` out of cloud-synced folders. A lost state is restored from that backup.

**The one-time switch-over** from the hand-made stack: note the old clusters' sizes; fill the secrets file and check
the plan; in the console delete the old app, the two clusters, the bucket's CDN endpoint and then the emptied bucket,
and remove any A/AAAA or CNAME record the old app left in the `crowdpoll.vote` zone (keep the SES records); run
`terraform apply`, fixing and applying again after a failure; check the site, the human check, a login email and the
CDN assets; then revoke the old SES and Spaces keys. The Spaces key has Full Access (all buckets): Terraform reads the bucket's
own settings when it plans, which a key limited to the bucket may not do. The old data is not kept.

**Releasing a new version.** Autodeploy is off on both services: pushing `main` deploys nothing. Merge to `main`, then
run `npm run deploy` (`npm run deploy -- --app <name>` for another app) with `DIGITALOCEAN_TOKEN` set. It starts a
deployment of the branch's latest commit, prints each phase, and exits 0 when it is `ACTIVE`, 1 when it ends in
`ERROR` (naming the failed step), `CANCELED` or `SUPERSEDED`, after 30 minutes, or on an API error, and 2 without a
token. The build runs `npm ci --include=dev && npm run build && npm run publish-assets && npm prune --omit=dev` and
then `npm start`; `NODE_ENV=production` is set at build and run time, and the custom build command prunes
devDependencies itself at the end. `tsx` is a dependency, so `npm run reconcile` still works from the console.

**A second plan that is not clean.** App Platform returns secret settings encrypted. If a `plan` right after an apply
keeps showing changes limited to the secret settings, that is a gap in the provider, not a change: it is recorded here,
and any other difference is a real one. Recorded outcome: not yet checked against the live app.

**The FCaptcha service.** The second service, `fcaptcha`, is built from `fcaptcha-server/` (FCaptcha
`@webdecoy/fcaptcha` 1.46.1 in its standalone Node.js server mode, started by `start.js`), one instance (autoscaling 1–1) and
health-checked at `/health`. The app's ingress sends `/fcaptcha/*` to it, prefix removed, and everything else to `web`,
so the widget and its calls stay on the site's own domain. It keeps its short-lived state in the same Valkey, database 1.
Its settings carry the `ENV_FCAPTCHA_` prefix, which `start.js` maps to FCaptcha's own names (FCaptcha's names set
directly stop it). Terraform generates `ENV_FCAPTCHA_SECRET` and `ENV_FCAPTCHA_VERIFY_SECRET` (64 random characters
each) and gives the verify secret to both services; `ENV_FCAPTCHA_SITE_KEYS` includes `web`'s `ENV_FCAPTCHA_SITE_KEY`,
`ENV_FCAPTCHA_ALLOWED_HOSTNAMES` is built from the app's domains, `ENV_FCAPTCHA_REDIS_URL` points at Valkey
database 1 and `ENV_FCAPTCHA_TRUSTED_PROXIES` adds App Platform's proxy range, so FCaptcha sees each visitor's address. The human check is on in production (`ENV_FCAPTCHA_ENABLED=1`). To run it locally:
`npm run fcaptcha` from the repository root (it installs `fcaptcha-server/`'s packages on first use, serves site key `dev`
for `localhost` on port 3001, and prints a verify secret unless `ENV_FCAPTCHA_VERIFY_SECRET` is already set), and set the four
`ENV_FCAPTCHA_*` values (commented out in the launch templates) with that verify secret; with `ENV_PUBLIC_ORIGIN` on `localhost` the web app forwards
`/fcaptcha/*` to `ENV_FCAPTCHA_URL` itself, standing in for the ingress, so the widget appears locally. Passes are not yet tied to the visitor's address: that is turned on
once the address header App Platform passes on has been confirmed on a deployed app.

**Search engines.** `/robots.txt` lets crawlers read the home page, `/poll/*`, `/privacy` and `/terms` and keeps them off
the API and the account pages, which also carry `noindex`. `/sitemap.xml` lists the home page and every public open or
closed poll with its last change, rebuilt at most every 5 minutes and split into `/sitemap-<n>.xml` parts above 50,000
addresses. Submit `https://crowdpoll.vote/sitemap.xml` in each search engine's webmaster console.
**Link previews.** A poll's link pasted into Google Messages, WhatsApp, iMessage, Slack, Facebook Messenger or
Instagram previews as a card: the poll's title, a one-line description and the site's brand image (the logo's speech
bubble and figures on white, 1200 × 630), whether the poll is public or private, because the login page a private poll's link
leads to carries them in its head. The description is the subtitle, a dash, then the message of the poll's sharing
mode with its line breaks turned into spaces: the **Link Preview Message** of an *Anyone you send the link to* poll
(Step 1, under the Copy Link block, up to 100 characters, reviewed like the notes), or the Custom Email Message of an
*Only people you invite* poll; a poll with neither subtitle nor message shows
"You have been invited to vote in this poll." (`ENV_DEFAULT_LINK_PREVIEW_MESSAGE`). Anyone holding the link can
read those fields, and so can the apps' preview servers; a card an app has already stored for a link shared earlier is
not refreshed. Facebook Messenger and Instagram obey `/robots.txt`, which admits Meta's preview crawler to the login
page, and show the card once that crawler has re-read the site, up to a day after a deployment.

Operational notes:

- `/healthz` always answers `200` (so the load balancer never removes an overloaded instance)
  and reports whether the cache answered, how many requests the instance shed by kind,
  how many votes were refused for exceeding the per-address cap, and how many logins went
  ahead without a human check because FCaptcha could not be reached (`humanCheckSkipped`).
- `[human-check]` log lines mark each refused login start and each one let through while
  FCaptcha was unreachable, with the address masked; a rising skip count means the service is down.
- An instance that cannot reach the cache answers every vote, search, refresh and Live
  Results request with `503` and a `Retry-After`, keeps serving pages, and pauses its sweeps
  until the cache is back.
- Every sweep (screening, schedule, counter flush, trending, newest, search index, bookmark
  expiry, nightly reconcile, budget controller, profile picture removal) runs on one instance at a time; the vote writer
  runs on every instance.
- `[abuse]` log lines mark addresses that exceeded `ENV_MAX_VOTES_PER_IP_PER_MINUTE`;
  `[controller]` lines show the request rate against the budget and the current multipliers.

## Configuration

All settings are `ENV_*` environment variables. Intervals are in milliseconds unless noted.
At start-up the server prints `[config] <NAME> was not found, using default value: <VALUE>.` for each setting it left at
its default, `none (…)` naming the fallback for one with no value; the SMTP settings appear only with `smtp`, the
provider settings only with `oauth` or `both`, and administrator addresses are masked.

| Variable | Default | Description |
|---|---|---|
| `ENV_PORT` | `8080` | HTTP port |
| `ENV_PUBLIC_ORIGIN` | — (required) | The site's origin, no path (`https://crowdpoll.vote`; `http://localhost:8080` in the templates); every provider redirect address is built from it |
| `ENV_DATABASE_URL` | `postgres://localhost:5432/app01` | PostgreSQL connection string |
| `ENV_DATABASE_CA_CERT` | unset | PEM of the CA that signed the database server's certificate (on DigitalOcean the database component's `CA_CERT`); the connection is then verified against it. Unset on a local database |
| `ENV_VALKEY_URL` | unset | Valkey/Redis URL; unset → in-process cache and queue |
| `ENV_OPENSEARCH_URL` | unset | OpenSearch endpoint; unset → PostgreSQL full-text search |
| `ENV_SPACES_BUCKET`, `ENV_SPACES_REGION`, `ENV_SPACES_KEY`, `ENV_SPACES_SECRET`, `ENV_SPACES_CDN_URL` | unset | Spaces bucket for the TRENDING and Newest objects, the assets and Google profile pictures; all five or none |
| `ENV_BETTER_AUTH_SECRET` | — (required, ≥ 32 chars) | Session signing secret |
| `ENV_ADMINS` | unset | Comma-separated administrator addresses. Unset: no administrators. Production: `admins` in the git-ignored `infra/secrets.auto.tfvars` |
| `ENV_SIGNIN_METHOD` | `native` | `native` (email login link), `oauth` (login providers only) or `both` |
| `ENV_MAX_SIGNIN_COOKIE_DURATION` | `2592000000` | Longest stay-logged-in session (30 days) |
| `ENV_STAY_SIGNED_IN` | `0` | `1` → the login page's "Stay logged in" box starts ticked; anything else leaves it clear |
| `ENV_EMAIL_TRANSPORT` | `smtp` | `smtp` (development) or `ses` (production); `ses` requires the three `ENV_SES_*` values |
| `ENV_SES_REGION` / `ENV_SES_ACCESS_KEY_ID` / `ENV_SES_SECRET_ACCESS_KEY` | — | Amazon SES region and sending key |
| `ENV_SMTP_HOST` / `ENV_SMTP_PORT` / `ENV_SMTP_USER` / `ENV_SMTP_PASS` | Mailtrap sandbox / `2525` / — / — | Development mail; without user and password each message is logged to the console |
| `ENV_EMAIL_FROM` | `CrowdPoll <no-reply@mail.crowdpoll.vote>` | Sender of every message |
| `ENV_DEFAULT_LINK_PREVIEW_MESSAGE` | `You have been invited to vote in this poll.` | Shown under a poll's shared link in messaging apps when the poll has neither a subtitle nor a message; blank or over 300 characters stops the site |
| `ENV_EMAIL_SEND_TIMEOUT` | `10000` | Longest one send may take before it counts as failed |
| `ENV_EMAIL_ASSET_ORIGIN` | unset | Origin the email logo is loaded from (development: `https://crowdpoll.vote`, since mail apps cannot reach `localhost`); unset → the link's origin |
| `ENV_ALLOWED_EMAILS` | unset | Comma-separated addresses, or patterns with `*` (`*@crowdpoll.vote`), allowed to create an account and log in before launch; administrators always are. Unset or empty: everyone. An invalid entry stops the app. Production: `allowed_emails` in the git-ignored `infra/secrets.auto.tfvars`, set as an encrypted variable |
| `ENV_OAUTH_GOOGLE_*`, `ENV_OAUTH_MICROSOFT_*`, `ENV_OAUTH_AMAZON_*` (`CLIENT_ID`, `CLIENT_SECRET`) | — | Login provider credentials; a provider is on when both are set |
| `ENV_OAUTH_APPLE_CLIENT_ID` / `_TEAM_ID` / `_KEY_ID` / `_PRIVATE_KEY` | — | Sign in with Apple: the Services ID, team, key id and the key's PEM (`\n` pairs read as line breaks) |
| `ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES` / `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW` | `15` / `2` | Email-sending rate limit (window in **minutes**) |
| `ENV_SCREENING_CALL_TIMEOUT` | `10000` | Bound on one screening call |
| `ENV_POLL_APPROVAL_SWEEP_INTERVAL` | `5000` | Screening sweep interval |
| `ENV_POLL_DATE_CHECK_SWEEP_INTERVAL` | `60000` | Schedule sweep interval |
| `ENV_POLL_EDIT_HEARTBEAT_INTERVAL` | `10000` | Editing-page heartbeat |
| `ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS` | `10` | Screening attempts before a poll is rejected |
| `ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL` | `5000` | Admin list refresh |
| `ENV_PARTICIPANTS_VIEWPORT_SIZE` | `10` | Rows per page in the admin card's Invitees list |
| `ENV_MAX_INVITATIONS_PER_DAY` | `200` | Invitation and reminder emails per poll creator in any rolling 24 hours; the rest wait |
| `ENV_MAX_PRIVATE_POLL_VOTERS` | `100` | Voter ceiling on a private poll |
| `ENV_MIN_CHOICES` / `ENV_MAX_CHOICES` | `2` / `50` | Choices a poll may be published with |
| `ENV_SESSION_CACHE_TTL` | `300000` | How long a session lookup is served from the cache |
| `ENV_MAX_POLLS_SEARCH_RESULTS` | `200` | Cap on search results, personal-tab rows and overlay ids |
| `ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS` | `200` | Cap on admin search results and the unfiltered admin list |
| `ENV_MAX_TRENDING_POLLS` | `200` | Polls on the TRENDING tab |
| `ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL` | `60000` | TRENDING recompute and publication interval; the published lifetime (`max-age`) is the smaller of it and 10 s |
| `ENV_MAX_NEWEST_POLLS` | `50` | Polls on the Newest tab; at most `ENV_MAX_POLLS_SEARCH_RESULTS` |
| `ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL` | `60000` | Newest recompute and publication interval (at least 1000); the published lifetime is the smaller of it and 10 s |
| `ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE` | `1` | Current share (whole percent) a choice needs to be drawn on the vote history graph; `0` draws every choice |
| `ENV_LINE_GRAPH_REFRESH_INTERVAL` | `60000` | How often an open vote history graph refreshes, and how long the server keeps one poll's graph (ms); never below `ENV_MIN_LIVE_REFRESH_INTERVAL` |
| `ENV_MIN_LIVE_REFRESH_INTERVAL` | `2000` | Floor between two Live Results refreshes per visitor |
| `ENV_MIN_MANUAL_REFRESH_INTERVAL` | `5000` | Floor between two manual refreshes per visitor |
| `ENV_MIN_SEARCH_REFRESH_INTERVAL` | `2000` | Floor between two searches per visitor |
| `ENV_MIN_VOTE_REFRESH_INTERVAL` | `2000` | Floor between two votes per session |
| `ENV_MANUAL_REFRESH_BURST` | `5` | Manual requests a visitor may make back to back before the floor applies |
| `ENV_SEARCH_BURST` | `3` | Searches a visitor may make back to back before the floor applies |
| `ENV_MAX_VOTES_PER_IP_PER_MINUTE` | `600` | Votes per address per minute before refusal |
| `ENV_MAX_LIVE_RESULTS_PER_USER` | `5` | Polls in the Live Results tab |
| `ENV_LIVE_RESULTS_MAX_IDLE_TIME` | `1800000` | Idle time before Live Results asks whether to continue |
| `ENV_SERVER_MAX_REQUESTS_PER_INSTANCE_PER_SECOND` | `1250` | Dynamic requests per second each live instance adds to the budget |
| `ENV_SERVER_MAX_REQUESTS_PER_SECOND` | `15000` | Cap on the fleet's budget |
| `ENV_SERVER_MAX_SEARCH_PER_SECOND` | `2000` | Search-engine queries per second before searches are stretched |
| `ENV_SERVER_MAX_SEARCH_FALLBACK_PER_SECOND` | `200` | The same while PostgreSQL full-text search serves |
| `ENV_BUDGET_CONTROLLER_SWEEP_INTERVAL` | `1000` | Controller tick; must not exceed the smallest floor |
| `ENV_MAX_REFRESH_AND_SEARCH_STRETCH` | `8` | Largest multiplier on the search and manual floors |
| `ENV_BUDGET_LOWER_THRESHOLD_PERCENT` | `80` | Load below this share of the budget relaxes the multipliers |
| `ENV_INSTANCE_MAX_INFLIGHT` | `200` | Requests in flight on one instance before it sheds |
| `ENV_INSTANCE_MAX_EVENT_LOOP_LAG` | `100` | Event-loop lag (ms) before an instance sheds |
| `ENV_SHED_RETRY_AFTER` | `2000` | `Retry-After` handed out with a `503` |
| `ENV_COUNTER_FLUSH_SWEEP_INTERVAL` | `10000` | How often live vote counters are written to poll rows |
| `ENV_INVITATION_SWEEP_INTERVAL` | `30000` | How often pending invitation emails of open polls are picked up |
| `ENV_INVITATION_RESEND_WAIT` | `86400000` | How long after an invitation email its one reminder may be sent (ms; 24 hours) |
| `ENV_VOTE_BATCH_SIZE` | `500` | Votes written per batch |
| `ENV_VOTE_QUEUE_LAG_NOTICE` | `2000` | Writer lag above which a vote is reported as queued |
| `ENV_SEARCH_CACHE_TTL` | `10000` | How long identical searches are answered from the cache |
| `ENV_OUTBOX_DRAIN_SWEEP_INTERVAL` | `15000` | How often changed polls are pushed to the search index |
| `ENV_MAX_BOOKMARKS_PER_USER` | `200` | Bookmarks per visitor |
| `ENV_BOOKMARK_EXPIRY_MONTHS` | `6` | Months of closure or inactivity before a bookmark is removed |
| `ENV_PAGE_LOADS_PER_MINUTE` | `120` | Page loads per session (or address) per minute before a notice |
| `ENV_DEVICE_EVENTS_ENABLED` | `false` | `true` records a device fingerprint at each login and vote, once the current Terms are accepted; any other value but `false` stops the app. To turn it on in production, confirm every account is a test user and tell them what is recorded, then set it in `infra/app.tf`, apply and deploy |
| `ENV_DEVICE_EVENTS_KEY` | unset | The key fingerprints are hashed with, at least 32 characters, required when collection is on (`device_events_key` in `infra/secrets.auto.tfvars`, which Terraform requires even while collection is off). Never logged or published |
| `ENV_FCAPTCHA_ENABLED` | unset | `1` turns on the human check before login (the self-hosted FCaptcha service); anything else leaves it off. When on, the three below are required |
| `ENV_FCAPTCHA_URL` | unset | Where the web service reaches FCaptcha, server to server (`${fcaptcha.PRIVATE_URL}` in `infra/app.tf`) |
| `ENV_FCAPTCHA_SITE_KEY` | unset | The site key the widget is drawn with (public; one of the FCaptcha service's `ENV_FCAPTCHA_SITE_KEYS`) |
| `ENV_FCAPTCHA_VERIFY_SECRET` | unset | The credential for FCaptcha's token check; the same name and value on the FCaptcha service. Production: an encrypted variable |
| `ENV_FCAPTCHA_PORT` | unset | Set on the FCaptcha service, not on `web`: the port it listens on (`8080` in `infra/app.tf`, `3001` locally) |
| `ENV_FCAPTCHA_SECRET` | unset | FCaptcha service only: the key passes are signed with, at least 32 random bytes. Production: an encrypted variable |
| `ENV_FCAPTCHA_SITE_KEYS` | unset | FCaptcha service only: comma-separated site keys it accepts (`crowdpoll`) |
| `ENV_FCAPTCHA_ALLOWED_HOSTNAMES` | unset | FCaptcha service only: the page hosts passes may be minted for (`crowdpoll.vote`) |
| `ENV_FCAPTCHA_REDIS_URL` | unset | FCaptcha service only: its shared state, Valkey database 1; unset → in memory, one instance |
| `ENV_FCAPTCHA_TRUSTED_PROXIES` | unset | FCaptcha service only: CIDRs whose forwarding headers are believed; production adds App Platform's `100.64.0.0/10`; unset → loopback and private ranges |
| `ENV_FCAPTCHA_INSECURE_DEV_MODE` | unset | FCaptcha service only: `1` signs with a public key so it starts without `ENV_FCAPTCHA_SECRET`; local use only |

## Poll visibility settings

An administrator sets who may see and vote on a poll in the first step of the poll card's
wizard, **Who can vote**. Its three options store these settings:

| Setting | Options | Meaning |
|---|---|---|
| **Poll Visibility** | `Public Poll` / `Private Poll` | A public poll can appear on TRENDING and in search results for everyone. A private poll reaches only the people it is shared with, through their My PRIVATE POLLS tab |
| **Sharing Mode** (private polls only) | `Anyone With The Link` / `Invitation Only` | Whether anyone holding the poll's link may take part, or only the addresses on its invited list |
| **Anonymous Votes** (private polls only) | `Yes` / `No` | `Yes` (the default) hides who voted for which choice from everyone but administrators: the creator's results and JSON export list who took part and the counts, but not their choices, and the voting side of the card says "Votes are anonymous." `No` reveals the choices to the creator, and shows the names, without addresses, in the **Who voted** panel of the maximized poll to everyone who may see its results — its creator, its invitees, people it was shared with by link — and to administrators. Administrators always see who voted for what. A public poll never shows names |

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

`GET /api/me/polls/:pid/voters` is the only answer that carries voters' names: signed in, `private, no-store`,
and `404` unless the poll is a published private poll with **Anonymous Votes** `No` that the caller may see the
results of (or the caller is an administrator).
