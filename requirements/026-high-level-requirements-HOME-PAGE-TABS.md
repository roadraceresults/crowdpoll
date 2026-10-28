# New Spec
Start a new spec for these requirements called `026-HOME-PAGE-TABS`.

# Home Page Tabs Refactor

## 1. Accepted

### A1. Goal

The site must make it clear that its most important part is the user's **private polls**:
the polls they created, and the private polls friends, colleagues and family have
invited them to or shared a link to.

### A2. Tab: **Your Polls**

- Lists the polls the user created.
- It is the **first** tab on the tab bar.
- The name started as "My Polls" and changed to "Your Polls" under A4.

### A3. Tab: **Shared With You**

- A single tab that lists **both** kinds of private poll someone else created:
  - polls the user has been **invited** to (Invitation Only), and
  - polls whose **link** was shared with the user (Anyone With The Link).
- The name started as "Shared With Me" and changed to "Shared With You" under A4.

### A4. Pronouns: "Your" and "You", never "My" and "Me"

- Every tab name, label, heading, button and message addresses the user as **"you"**:
  "Your Polls", "Shared With You", "Your vote is counted", "Check your inbox",
  "Your email address".
- No first-person labels ("My …", "… Me") anywhere in the UI, including in future
  tabs, menus and headings.
- Reasons: "Your" is the current trend on the web (YouTube, Amazon, Microsoft, Google
  Account). Using it throughout gives one consistent voice. The app's messages already
  say "your". Apple's "Shared with You" has made that phrase widely familiar.
- The app is still in development, so relabeling costs nothing. Tab length on phones
  will be handled by separate research, since more tabs are coming.
- The current **My Private Polls** tab (`src/public/index.html:40`) is replaced. The
  code comments that call it "My PRIVATE POLLS" (`tabs.js`, `pollCard.js`,
  `deltaClient.js`) are updated to match.

### A5. The Favorites tab's contents narrow

The tab now called Favorites (renamed Watching under A6) **no longer** lists:

- polls the user was invited to or had a link shared with them (they belong in
  **Shared With You**), or
- polls the user voted in.

It lists only the polls the user chose to watch (today's bookmark action).

### A6. Favorites is renamed **Watching**

- These polls aren't the user's *favorites*. They are polls the user wants to **keep
  an eye on**.
- A future feature may **email the user the results** of the polls they are watching
  from time to time. The name must still fit once that feature exists.
- **Watching** was chosen over **Following** because it has a natural icon (an eye)
  and Following does not. The usual "Follow" icons all mean something else: a person
  with a plus means following a person, a bell means notifications, a star means
  favorite, and a bookmark means saved.

### A7. The Watching icon is an eye

Two SVGs have been created in the ./dontTrack folder:

| File | State | Drawing |
|---|---|---|
| `watching-icon.svg` | Not watching (also the tab icon) | Outline eye: outline, iris ring and pupil dot in grey `#9AA197`, 1.8 line width, 24×24 viewBox. It uses the same size, line width and colour as the Favorites star it replaces. |
| `watching-icon-active.svg` | Watching | The same eye shape in ink `#1E2422` with a **filled** iris and a small highlight cut out by a mask, so the card shows through it in any theme. |

- The active state follows how the Favorites button already works: grey outline when
  off, ink when on.
- **No red** in the active state, because a red eye looks like an alarm.
- On the card button, the two states are switched by `aria-pressed="true"`, as
  `.bookmark-btn` does today.
- Implementation note: the active SVG's mask has a named id (`watching-catchlight`).
  If the icon is pasted into the page more than once, give each copy its own id, or
  define it once as a shared `<symbol>`.

### A8. The Watch button and its states

- The card button is labelled **Watch**, then **Watching** once pressed. Tapping it
  again stops watching. The tooltip for that is "Stop watching this poll".
- The states are shown by **outline versus filled**, never by an eye with a slash
  through it (that means "hidden" or "hide password").
- No bare number beside the eye, because it reads as a view count. If a count is ever
  shown, it carries a word ("12 watching").
- The **bell** icon is kept free for the future results-email setting.

### A9. A **Your Votes** tab

- Lists **every** poll the user voted in, public and private.
- Without it, a public poll the user voted in has no personal tab, because A5 takes
  voted polls out of Watching. The user could only find it again through Trending,
  Newest or Search.
- The server query already supports a "voted" relation (`personalTabQuery`,
  `src/polls/userPolls.ts`), and the tab would use the existing result cap
  (`ENV_MAX_POLLS_SEARCH_RESULTS`).
- Rejected names: "Voted On" (sounds like a status), "History" and "Activity" (too
  vague), "Participated" (clumsy).

### A10. Tab order: the private tabs come first, together

**Your Polls · Shared With You · Your Votes · …**

### A11. Voting in a poll does not automatically watch it

Automatically watching on a vote would fill Watching with polls the user never chose,
which undoes A5.

### A12. The rename is UI-only

Routes, tables and identifiers keep the word `bookmark`, as FIX026 did for Favorites.

### A13. Title Case for labels

Follows 018, so "Shared **W**ith You", not "Shared with you".

### A14. Each tab is defined by one relation, and a poll may appear in more than one tab

| Tab | Lists polls the user… |
|---|---|
| Your Polls | created |
| Shared With You | was invited to, or reached through a shared link (private polls only) |
| Your Votes | voted in |
| Watching | chose to watch |

Each tab is then explained by its name alone, the way a Google Drive file can be both
Starred and in "Shared with me".

### A15. Opening a shared link adds the poll to Shared With You (answers Q1)

A user may want to keep track of a poll someone sent them a link to before they vote in
it. Keeping it in Shared With You makes it more likely they will come back and vote. So
**opening** the link is enough to list the poll. No vote or watch is needed.

#### A15.1 Prerequisite: the link must open the poll

- A poll link has the form `/?PID=<pid>`, the form the admin page's **Copy Poll Link**
  button produces (`src/public/adminList.js:116`).
- Today the home page route **redirects `/?PID=…` to `/`** and drops the id
  (`src/routes/pages.ts:56-60`). The link lands on Trending and the poll is never
  shown. Opening a link must instead show that poll to the visitor, subject to A15.3.
- Presentation (A24.1): the visitor lands on the poll's own tab with the poll shown as
  the maximized card from 021.

#### A15.2 When a view is recorded

A **view** is recorded when all of these are true:

1. The visitor is **signed in**.
2. They arrived through the poll's **link** (`/?PID=<pid>`). Opening the poll from a
   tab, a search result or Live Results is not a view.
3. The poll is a **Private Poll** whose sharing mode is **Anyone With The Link**.
4. The visitor **did not create** the poll.
5. The poll was actually shown to them (A15.3), **or** it is not published yet and
   the visitor is told so (A23).

In addition:

- **Opening the link again** refreshes the view's time, so the poll moves to the top of
  Shared With You. The tab is ordered by most recent activity, as the personal tabs are
  today.
- **Invitation Only** polls need no view. The existing `invited` relation already puts
  them in Shared With You, before the user opens anything.
- **Public polls** opened by link record no view. Shared With You lists private polls
  only (A14), and public polls can be found through Trending, Newest and Search.
- **The view is recorded on the server** while it serves the linked poll, not by a
  separate call from the browser, so a view is never lost and cannot be faked for a
  poll that was not shown.

#### A15.3 When the poll is not shown and no view is recorded

| Case | Result |
|---|---|
| Unknown or deleted poll id | Not shown. No view. Every "not shown" case gives the same notice (A24.3). |
| Poll **not published yet** (Initialized, Awaiting Approval, Rejected, or Editing before its first launch) | Not shown, but the visitor is told it is not published yet, and the view **is** recorded, so it waits in Shared With You (A23). |
| Poll **Archived** | Not shown to a non-creator. No view. (A creator opening their own link sees it in Your Polls, A24.2.) |
| Invitation Only poll and the visitor is not invited | Not shown. No view. |
| Visitor is banned from the poll | Not shown. No view. |
| Visitor is a **guest** | Not shown. The link goes **straight to sign-in**, and after signing in the user returns to the link, where the rules above apply and the view is recorded (A22). |

#### A15.4 Shared With You membership

Shared With You lists a Private Poll the user did not create when:

- **Invitation Only:** the user is **currently on its invite list** (`invited`, checked
  against `poll_invitations`). A `viewed` row never lists an Invitation Only poll.
- **Anyone With The Link:** the user holds `viewed` (opened its link, A15.2) **or**
  `invited` (explicitly invited earlier, for example before the creator switched the
  poll from Invitation Only).

The poll stays listed
after the user votes in it or watches it. It then also appears in Your Votes or
Watching (A14).

#### A15.5 Database: a new `viewed` relation, no new table or column

The relations that place a poll in a personal tab already live in one table,
`user_polls`, created in `src/db/migrations/003-participation.ts`:

| Column | Type | Notes |
|---|---|---|
| `email` | `text not null` | The user |
| `poll_id` | `text not null`, references `polls(id)` **on delete cascade** | The poll |
| `relation` | `text not null` | Today `created`, `invited`, `voted` or `bookmarked` |
| `updated_at` | `timestamptz not null default now()` | When the relation was last written |
| | primary key (`email`, `poll_id`, `relation`) | One row per user, poll and relation |

The view is stored as **one more `relation` value, `viewed`**:

- **No new table, column or index.** `relation` is plain `text` with no check
  constraint, so no migration is needed. The existing
  `user_polls_email_updated (email, updated_at desc)` index already serves the
  personal-tab query.
- **One row per user per poll**, however often the link is opened. The primary key
  makes the write an upsert (`upsertUserPolls`, `src/polls/store.ts`), and
  `updated_at` holds the **most recent** open.
- **Deleting a poll** removes its views through the existing `on delete cascade`.
- **Code changes** (not schema changes):
  - add `"viewed"` to the `UserPollRelation` type (`src/db/schema.ts:151`) and to the
    `relation` union in `upsertUserPolls`;
  - build the Shared With You query from `personalTabQuery` with visibility
    `Private Poll`, relations `invited` and `viewed`, and the user's own polls
    excluded;
  - record the view in the route that serves the linked poll (A15.1), and describe
    that route in `postman/openapi.json`.
- **Not needed:** a "first opened" timestamp. Only the latest open is kept, because
  that is what orders the tab. If a "Shared with you on …" date is wanted later, it
  would need a separate `created_at` column on `user_polls`.

### A16. Your Polls lists every poll the user created, private and public (answers Q2)

The user created both kinds of poll, so both are "yours".

#### A16.1 Context: every user will be able to create polls

- Since 025, every user holding the **`Create Poll`** and **`View Polls`** permissions
  (granted by default) can create polls, public and private, through the admin routes
  (`canReachAdmin`, `canActOnPoll`), and the header's **Create Poll** link is live for
  them. `ENV_ADMINS` accounts can always create. The **next spec** changes where users
  create polls, not who may.
- Public polls will probably need moderation. That is a **separate issue** and is not
  decided here. Your Polls shows whatever state moderation leaves a poll in (A16.3).
- Your Polls works unchanged when that spec lands. It lists the polls the user
  created, whoever they are; it is empty for a user who has created none.

#### A16.2 Membership

- Your Polls lists every poll the user **created**, whether it is a **Private Poll** or
  a **Public Poll**. Visibility and sharing mode are **not** filtered.
- It lists **only** polls the user created. A poll the user voted in, watches, was
  invited to or opened by link belongs in Your Votes, Watching or Shared With You
  (A14), unless the user also created it.
- A poll stays in Your Polls whatever else the user does with it. Voting in their own
  poll also lists it in Your Votes, and watching it also lists it in Watching (A14).
- A poll stays listed however its visibility, sharing mode or state changes. It leaves
  only when it is **deleted**, through the existing `on delete cascade` on
  `user_polls`.
- An admin's Your Polls lists only the polls **that admin** created. The admin page
  keeps listing every poll.

#### A16.3 Every state is listed, because Your Polls is where a creator follows their poll

Once users create their own polls, Your Polls is the only place they can see a poll
before it launches. So it lists the user's polls in **every** state.

| States | What the card shows |
|---|---|
| Initialized, Editing, Awaiting Approval, Rejected | The poll with its **state** clearly shown (and the rejection reason when Rejected), and no voting. Whatever editing or resubmitting the creator can do from here belongs to the poll-creation spec. |
| Waiting To Open, Open, Closed | The ordinary poll card: vote (when open), results, Live Results and Watch (A8). |
| Archived | Read-only results, with the state shown. |

- Other users never see the **content** of a poll in the states in the first row. It
  appears in full only in its creator's Your Polls (and on the admin page). A user who
  opened its link, or was invited, sees only a "Not published yet" placeholder in
  Shared With You (A23). `isPubliclyListable`
  (`src/polls/store.ts`) and `PUBLIC_STATES` remain the rule for every other tab.
- Showing a state uses the stored enumeration verbatim (017: stored enumerations stay
  verbatim), shown in Title Case on the card (A13).

#### A16.4 Order and size

- **Newest created first.** The `created` row's `updated_at` is set to the poll's
  creation time and never changes, so this is the order the existing query already
  produces.
- Capped at `ENV_MAX_POLLS_SEARCH_RESULTS`, like the other personal tabs. A user with
  more polls than the cap sees their newest polls. Paging or a separate cap is for the
  poll-creation spec to decide, if needed.

#### A16.5 Presentation

- **Label:** `Your Polls` (A2, A4, A13). **Position:** first on the tab bar (A2, A10).
- **Icon:** the person silhouette that the My Private Polls tab uses today
  (`src/public/index.html:39`). It already means "you", and that tab is being
  replaced.
- **Guests:** Your Polls is a personal tab, so it asks guests to sign in, as the
  personal tabs do today.
- **Empty state:** addressed to the user (A4), for example "You haven't created any
  polls yet." For a user who `canReachAdmin` (025), it also offers the way to create one:
  the same link as the header's **Create Poll**.
- The card's "listed because" line (FIX020, `src/public/deltaClient.js`) would say
  "created" on every card in this tab. It is **not** shown in Your Polls.

#### A16.6 Database

**No schema change.** The existing `created` relation in `user_polls` already records
this:

- `insertPoll` (`src/polls/store.ts`) writes one `created` row for the creator's email,
  stamped with `poll.createdAt`, **when a creator is passed in**. The user
  poll-creation route in the next spec **must pass the creator**, as
  `POST /api/admin/polls` does, or the poll will not appear in Your Polls.
- Nothing about visibility is stored on the relation, so dropping the visibility filter
  is enough to include public polls.
- `polls.created_by_id` / `created_by_name` stay as they are. Membership comes from
  `user_polls`, like every other personal tab.

#### A16.7 Implementation

**Server**

- `src/polls/userPolls.ts`:
  - Make the `visibility` argument of `personalTabQuery` / `personalTab` optional, so
    that omitting it applies no `poll_visibility` filter.
  - Add `yourPollsTab(db, email, cap)`: `personalTab(db, email, cap, undefined,
    ["created"])`. No state filter, per A16.3.
  - `privateTab` and `favouritesTab` are replaced by the new tabs' queries (A5, A9,
    A15.4, A16). Each tab is one relation set (A14).
- `src/routes/tabsApi.ts`:
  - Add `POST /api/tabs/your-polls/refresh` (`requireSession`, the same
    `dynamic("refresh")` load and floor handling, and `personalListing` for counts,
    overlay and vote blocks), shaped like `/api/tabs/private/refresh`. That route is
    retired when My Private Polls is replaced.
  - The poll projection sent to the card (`projectPoll`, `src/polls/versions.ts`)
    already carries `pollState`. Add the **rejection reason**, sent only in the
    creator's Your Polls listing. Vote requests on unlaunched polls are refused as
    they are today.
- `postman/openapi.json`: describe the new route and remove the retired one.

**Client**

- `src/public/index.html`: a `<button class="tab" data-tab="your-polls">` first in
  `#tabBar`, labelled `Your Polls`, with the person icon.
- `src/public/tabs.js`:
  - add `your-polls` to `PERSONAL_TABS` and `KIND_OF` (`"refresh"`);
  - register its controller with `createDeltaTab("your-polls",
    "/api/tabs/your-polls/refresh", { showVote: true, showLive: true, tab:
    "your-polls" })`;
  - `placeBookmark` no longer routes a watched poll by visibility into private or
    favourites. It goes to Watching only (A5, A6). Your Polls is never affected by a
    watch, because its membership is `created` alone.
- `src/public/pollCard.js`: render the state (and rejection reason) and suppress
  voting for the unlaunched and Archived states (A16.3).

**Tests**

- Server:
  - Your Polls lists the user's private **and** public polls.
  - It excludes polls the user only voted in, watched, was invited to or viewed.
  - It excludes other users' polls, including for an admin.
  - It lists unlaunched polls to their creator only. Another user's tabs and search
    never include them.
  - It is ordered newest created first and respects the cap.
  - A poll whose visibility, sharing mode or state changes stays listed.
  - A deleted poll leaves.
- Browser (jsdom):
  - `Your Polls` is the first tab.
  - A guest is asked to sign in.
  - The empty state reads as in A16.5.
  - An Awaiting Approval or Rejected card shows its state (and reason) and no vote
    control.

### A17. Polls in Shared With You can be watched (answers Q3)

A future requirement will probably email the user their **watched** polls from time to
time (Q5). The polls that matter most to users are the ones friends and family sent
them, so a user must be able to watch a poll they were **invited to** or **opened from
a link**, like any other poll.

#### A17.1 Where the Watch control appears

- The **Watch** control (A8) appears on the card in **every** tab, including Shared With
  You. Today the My Private Polls tab hides it (`showBookmark: false`, 017 FIX024:
  "a private poll never reaches Favourites, so the icon there would mislead"). That
  reason no longer holds, because Watching lists private polls too (A5, A14).
- Watching a poll from Shared With You **adds** it to Watching and leaves it in Shared
  With You. A poll may be in both tabs (A14).
- **Stop watching** removes it from Watching only. It stays in Shared With You, because
  its `invited` or `viewed` relation is untouched.
- The control is shown only when the user **may watch** the poll (A17.2). Otherwise it
  is hidden, never shown disabled. Example: on an unlaunched poll in Your Polls
  (A16.3).

#### A17.2 Who may watch a poll

Watching a poll gives the user a copy of it in their Watching tab, and later possibly
in email. So the server must allow it only for a poll the user is allowed to see.
**Today it does not check this.** `POST /api/polls/:pid/bookmark`
(`src/routes/pollsApi.ts`, `addBookmark` in `src/polls/bookmarks.ts`) accepts any
existing poll id from any signed-in user. That was harmless while Favorites listed
public polls only. Now that Watching lists private polls, it would expose an
Invitation Only poll to anyone who learned its id.

A signed-in user **may watch** a poll when all of these are true:

1. The poll is in a state voters can see (`PUBLIC_STATES`: Waiting To Open, Open,
   Closed; `isPubliclyListable` for a poll in Editing).
2. The user is **not banned** from it.
3. It is a **Public Poll**, **or** a **Private Poll** the user can reach:
   - **Invitation Only:** the user is on its invite list, or created it.
   - **Anyone With The Link:** the user created it, or holds a `viewed`, `voted` or
     `invited` relation to it. In other words, it already reached them through a
     link, a vote or an invitation.

A request that fails this is refused with **`404 Not found`**, the same answer as an
unknown poll, so the refusal does not reveal that a private poll exists.

#### A17.3 Access can end after the user started watching

A user can lose access to a poll they are watching: they are removed from the invite
list, they are banned, or the poll changes from Anyone With The Link to Invitation Only
without inviting them.

- **Watching** lists a watched poll only while the user **still may watch it**
  (A17.2), checked when the tab is served. A poll the user can no longer reach is
  not shown, and its card and results are not sent.
- The watch row is **kept, not deleted**, so the poll comes back if access returns
  (for example, the user is invited again). Ordinary expiry still removes it
  (`removeExpiredBookmarks`, `ENV_BOOKMARK_EXPIRY_MONTHS`).
- The same check will govern the future results email. A poll the user can no longer
  reach is never emailed.

#### A17.4 Limits and expiry apply as they do today

- Private watched polls count toward `ENV_MAX_BOOKMARKS_PER_USER`, like public ones.
  At the cap the refusal is `409 bookmark-cap`, and the existing dialog names the
  limit (017 FIX027). The dialog's wording follows A4 and A6 ("watching").
- The daily expiry (`removeExpiredBookmarks`) covers private watched polls unchanged.
  It removes the watch on archived polls, on polls closed longer than the expiry, and
  on open polls with no activity for longer than the expiry.

#### A17.5 Database

**No schema change.**

- A watch is still stored twice, as today: a row in `bookmarks` (`email`, `poll_id`,
  `created_at`), which carries the cap and expiry, and a `bookmarked` relation in
  `user_polls`, which places the poll in Watching. Both are removed together.
- The access check in A17.2 and A17.3 reads tables that already exist:
  - `poll_invitations` (invite list);
  - `poll_bans` (bans);
  - `polls.poll_visibility`, `poll_sharing_mode`, `poll_state` and `created_by_id`;
  - `user_polls` (the `created`, `invited`, `viewed` and `voted` relations).
- The identifiers keep the word `bookmark` (A12).
- `bookmarks.created_at` is the "watching since" time a future results email can
  use.

#### A17.6 Implementation

**Server**

- Add `mayWatch(db, email, userId, pid)` next to the vote-block rules
  (`voteBlocks` in `src/routes/tabsApi.ts`, which already tests bans and the invite
  list, and `isPubliclyListable` in `src/polls/store.ts`). It returns whether A17.2
  holds.
- `POST /api/polls/:pid/bookmark`: call `mayWatch` before `addBookmark`, and answer
  `404 Not found` when it fails.
- `DELETE /api/polls/:pid/bookmark` stays unchecked, so a user can always stop
  watching.
- The Watching tab's query (from `personalTabQuery`, relation `bookmarked`, no
  visibility filter, per A5 and A14) drops rows that fail A17.2. The check is done in
  the query, or on the returned rows before `personalListing`, so that a hidden poll's
  card and counts are never sent.
- The personal-tab overlay reports `mayWatch` for each poll, so the card knows whether
  to show the control (A17.1).
- `postman/openapi.json`: document the new `404` on the bookmark `POST`.

**Client**

- `src/public/tabs.js`: register the Shared With You controller **without**
  `showBookmark: false`.
- `placeBookmark` puts a newly watched poll first in Watching, whatever its
  visibility, and leaves Shared With You and Your Polls unchanged (A16.7).
  Stopping watching removes it from Watching only.
- `src/public/pollCard.js`:
  - hide the Watch control when the overlay says the user may not watch the poll;
  - update the comment above `updateActionButtons`, which cites FIX024 and "My
    PRIVATE POLLS" (A4).

**Tests**

- Server:
  - A user can watch an Invitation Only poll they were invited to, and an Anyone With
    The Link poll they viewed or voted in.
  - Those polls then appear in Watching and stay in Shared With You.
  - Watching refuses with `404`:
    - an Invitation Only poll the user is not invited to;
    - an Anyone With The Link poll the user never reached;
    - a poll the user is banned from;
    - an unlaunched poll.
  - After an uninvite, a ban or a change to Invitation Only, the poll leaves Watching
    and its card is not sent. After re-inviting, it returns.
  - Stopping watching always succeeds, and leaves the poll in Shared With You.
  - Private watched polls count toward the cap and are covered by expiry.
- Browser (jsdom):
  - The Watch control is shown on Shared With You cards, and toggles Watch /
    Watching.
  - Watching a poll there places it first in Watching.
  - The control is hidden where the overlay says the user may not watch.

### A18. Fitting the tabs on a phone is deferred to separate research (answers Q4)

How the tab bar fits a phone is **not** decided in this work. It is the subject of
separate research, already planned, because more tabs are coming. This work only
changes which tabs exist and what they are called.

#### A18.1 What this work does

- The tab bar keeps today's behaviour on narrow screens. `.tab-bar`
  (`src/public/tabs.css`) is a single row that **scrolls sideways** when it is wider
  than the screen (`overflow-x:auto`, scrollbar hidden). No new layout, menu, "More"
  overflow or icon-only mode is added here.
- The tab bar after this work has **eight tabs**:

  **Your Polls · Shared With You · Your Votes · Trending · Newest · Watching ·
  Live Results · Search**

  - A10 fixes the first three.
  - The rest keep today's relative order (`src/public/index.html`), with My Private
    Polls removed and **Watching in Favorites' place**.
- Because the private tabs come first (A10), they are the tabs visible without
  scrolling on a phone. This supports the goal in A1 even before the layout research
  is done.

#### A18.2 Constraints the tab-fit research must respect

Decisions already made in this file that the layout research must keep, or explicitly
revisit:

- **Labels are fixed** (A2, A3, A6, A9, A13). Shortening or abbreviating a label to
  make it fit (for example "Shared") is not a fit strategy. The names were chosen to be
  self-explanatory.
- **The first three tabs are fixed** (A10): Your Polls, Shared With You, Your Votes.
  Where Watching and the other tabs sit may be revisited by the layout research.
- **Icons:**
  - Your Polls uses the person icon (A16.5).
  - Watching uses the eye (A7).
  - Shared With You and Your Votes have **no icon yet**. If the layout research needs
    icon-only or icon-first tabs, those two icons must be designed as part of it.
- **The bell icon stays free** for the future results email (A8).
- Short labels were a reason for several choices in this file, but length was
  explicitly **not** treated as a constraint (A4). The research may assume the labels
  above as they are.

### A19. A user cannot remove a poll from Shared With You, for now (answers Q6)

#### A19.1 No removal control

- Shared With You cards have **no** remove, hide or dismiss control. The only
  removal control on a card is the Live Results tab's own `.live-link` in remove form
  (020), which stays on the Live Results tab alone.
- No "hidden" marker is stored, and no route is added to remove a `viewed` or
  `invited` relation on the user's request.
- Stopping watching a poll (A17.1) does not remove it from Shared With You.
- This may be revisited later. If it is, the design noted in Q6 still applies:
  - for a link-shared poll, deleting the `viewed` row is enough;
  - for an invited poll, a separate "hidden" marker is needed, because the invitation
    itself must stay.

#### A19.2 When a poll does leave Shared With You

Because the user cannot remove a poll, it leaves only when one of these happens:

| Event | Why it leaves |
|---|---|
| The poll is **deleted** | Its `user_polls` rows go with it (`on delete cascade`). |
| The user is **removed from the invite list** of an Invitation Only poll | A15.4 lists an Invitation Only poll only while the user is on its invite list. |
| The poll changes to **Invitation Only** and the user is not invited | Same rule. A `viewed` relation does not reach an Invitation Only poll. |

A **ban** does not remove the poll from Shared With You. As today, the card stays
listed and says "You have been removed from this poll and cannot vote in it"
(`voteBlocks`, `src/routes/tabsApi.ts`). The Watch control is hidden (A17.2).

#### A19.3 A current gap: removing an invitation leaves the relation behind

Today, removing someone from a poll's invite list **does not** delete their
`invited` relation:

- `updatePoll` (`src/polls/store.ts`) rewrites `poll_invitations` and **upserts**
  `invited` rows for the new list, but never deletes the rows of emails that were
  taken off it.
- Today such a poll stays in My Private Polls with "You are not invited to this poll."
- With no removal control (A19.1), it would stay in Shared With You **forever**.

So one of these is required. The first is preferred:

1. When the invite list changes, **delete** the `invited` relation for every email
   removed from it, in the same transaction as the roster rewrite. The relation then
   always matches `poll_invitations`.
2. Or, when Shared With You is served, list an `invited`-only poll only if the user is
   still in `poll_invitations` (the check A17.3 already makes for Watching).

**Decision: do both.** Option 1 stops new stale rows; option 2 covers rows already left
by earlier uninvites, without a data migration (A24.4).

With (1), a user who is invited again gets a fresh `invited` row, and the poll
returns to the top of Shared With You.

#### A19.4 Implementation and tests

- No UI change beyond not adding a control. The Shared With You controller is
  registered without an `onClose` or remove option.
- Server: A19.3 option 1 in `updatePoll`. When `$set.invitedVoterList` is present,
  delete the `user_polls` rows with relation `invited` for this poll whose email is no
  longer on the list. Seeding in `insertPoll` is unchanged.
- The Shared With You query applies A15.4: an Invitation Only poll is listed
  through `invited` only, never through `viewed`.
- Tests:
  - a Shared With You card has no remove control;
  - uninviting a user removes the poll from their Shared With You;
  - re-inviting brings it back, first;
  - changing a viewed Anyone With The Link poll to Invitation Only removes it for a
    user who is not invited;
  - a banned user still sees the poll, with the ban message and no Watch control;
  - deleting the poll removes it.

### A20. Periodic results emails for watched polls are a future feature (answers Q5)

Emailing users the results of the polls they watch is **not part of this work**. It
is recorded because it shaped decisions here, and so this work does not close it off.

#### A20.1 Decisions this future feature already shaped

- The tab is named **Watching**, a name that still fits once watched polls are also
  emailed (A6).
- The **bell** icon is kept free for the future email setting (A8, A18.2).
- Polls in Shared With You can be watched, so the polls friends and family sent can
  be emailed too (A17).
- The **access check** that decides who may watch a poll (A17.2, A17.3) is the one the
  email must use. A poll the user can no longer reach is never emailed.

#### A20.2 What this work does and does not add

- **Adds nothing for email.** No email is sent, and there is no email setting, no
  schedule, no unsubscribe, no new `ENV_*` variable, and no new table or column.
- **Keeps what the feature will need.** The watch is stored as today, and
  `bookmarks.created_at` records when the user started watching (A17.5). The access
  check is one function, `mayWatch` (A17.6), that the email job can call.
- **No wording promises email.** The Watch control, its tooltip ("Stop watching this
  poll"), the Watching tab and its empty state must not mention email or
  notifications until the feature exists.

#### A20.3 Notes for the future spec (not decided here)

These were not discussed, and are listed only so the future spec starts from them:

- how often results are sent, and whether the user chooses;
- whether it is opt-in per poll (the bell) or for all watched polls;
- what one email contains, for example one digest of every watched poll;
- unsubscribing;
- sending through the existing mail path (`src/email/`, nodemailer);
- the effect of the watch cap (`ENV_MAX_BOOKMARKS_PER_USER`) and expiry
  (`ENV_BOOKMARK_EXPIRY_MONTHS`) on who is emailed.

### A21. Views do not expire (answers Q7)

#### A21.1 The rule

- A `viewed` relation (A15) is **never removed by time**. No sweep, no expiry setting,
  and no new `ENV_*` variable.
- It is **not** covered by the bookmark expiry. `removeExpiredBookmarks`
  (`src/polls/bookmarks.ts`) keeps deleting only `bookmarks` rows and the
  `bookmarked` relation, and must not be widened to other relations.
- Invitations do not expire either, so Shared With You as a whole has no time-based
  removal.

#### A21.2 What this means for Shared With You

- A poll stays in Shared With You after it **closes**, and however long it has been
  inactive. Together with A19 (no user removal), a poll leaves **only** for the reasons
  in A19.2:
  - the poll is deleted;
  - the user is removed from the invite list;
  - the poll becomes Invitation Only and the user is not invited.
- **Watching and Shared With You can differ over time.** A watched poll in Shared With
  You loses its watch under the bookmark expiry (A17.4), and so leaves Watching, but it
  stays in Shared With You.
- **The listing cap still applies.** Shared With You shows the most recent
  `ENV_MAX_POLLS_SEARCH_RESULTS` polls (ordered by latest activity, A15.2). A user
  with more than that sees the most recent ones, and older rows stay stored but
  unlisted. Opening an older poll's link again brings it back to the top.

#### A21.3 Database and implementation

- **No schema change and no code for expiry.** A `viewed` row is written by the link
  route (A15.5) and deleted only by `on delete cascade`. The Invitation Only rule in
  A19.2 hides the poll from the listing but leaves the row, so the poll returns if it
  goes back to Anyone With The Link.
- Storage grows by at most one row per user per link-shared poll they opened. The
  upsert (A15.5) never adds a second row.
- Tests:
  - the daily bookmark expiry leaves `viewed` and `invited` rows untouched;
  - a Shared With You poll that has been closed longer than
    `ENV_BOOKMARK_EXPIRY_MONTHS` is still listed;
  - it leaves Watching at expiry but stays in Shared With You.

### A22. A guest opening a poll link goes straight to sign-in (answers Q8)

#### A22.1 The rule

- A **guest** (no session) who opens a poll link `/?PID=<pid>` is sent **straight to
  sign-in**. The poll, its title and its results are **not** shown first.
- This applies to **every** poll link, whatever the poll's visibility or sharing
  mode, and whether or not the poll exists. The redirect happens **before** the poll is
  looked up, so it never reveals whether a poll exists, is private, or is Invitation
  Only.
  - Public polls stay visible to guests through Trending, Newest and Search as
    today. Only the *link* route signs them in first.
- After signing in, the user lands back on the **same link**. The link route then
  applies A15.1–A15.3 as for any signed-in visitor: it shows the poll or refuses it,
  and records the view.

#### A22.2 The poll id must survive the whole sign-in round trip

**Today nothing returns a user to where they started:**

- `/api/auth/verify` always redirects to `/`, and the magic link's `callbackURL` is
  `/` (`src/routes/api.ts`).
- A signed-in visitor to `/login` is sent to `/` (`src/routes/pages.ts`).
- The card's `requireSignIn()` (`src/public/pollCard.js`) goes to a bare `/login`.

**The magic link is often opened in a different browser** from the one that asked for
it: a phone's mail app, or its in-app browser (`src/routes/pages.ts:88-90`). So the
poll id must travel **in the URLs and in the emailed link**, not in browser storage.
It also cannot travel in a cookie, because `session_token` is the only cookie the
system may set (cookie policy).

| Step | Today | Required |
|---|---|---|
| Guest opens `/?PID=<pid>` | Redirect to `/` | Redirect to `/login?PID=<pid>` |
| Signed-in user opens `/login?PID=<pid>` | Redirect to `/` | Redirect to `/?PID=<pid>` |
| Login card requests a link | `POST /api/auth/request-login-link { email, staySignedIn }` | Also sends `pid` taken from its own `?PID=` |
| Magic link in the email | `/api/auth/verify?token=…&stay=…` | Also carries `&PID=<pid>` (through the magic-link `metadata`, as `origin` and `stay` are today, `src/auth/auth.ts:150-156`) |
| Verify succeeds | Redirect to `/` | Redirect to `/?PID=<pid>` |
| Verify fails (expired, used, superseded) | `/login?error=invalid-link` | `/login?error=invalid-link&PID=<pid>`, so a new link can be requested for the same poll |
| **Unknown address** asks for a link | Email invites them to `/create-account` | The invitation links to `/create-account?PID=<pid>` |
| Create-account card submits | `POST /api/auth/create-account { email }` | Also sends `pid`. The login link it emails carries `&PID=` as above |
| **OAuth** (`ENV_SIGNIN_METHOD=oauth`) | Callback to `/` | The provider's callback URL is `/?PID=<pid>` |

A family member sent a link will often have **no account yet**. The create-account
steps above are what bring them back to the poll after their first sign-in.

#### A22.3 Safety of the carried id

- The id is accepted only if it is a **UUID** (poll ids are `randomUUID()`,
  `src/polls/service.ts`). Anything else is dropped, and the user lands on `/` as
  today.
- The server builds every redirect itself as `/?PID=<encoded uuid>`. It never
  redirects to a URL or path taken from the request, so this adds **no open
  redirect**.
- The id is not checked for existence or access during sign-in. That happens only
  at the link route after sign-in (A15.3), so sign-in reveals nothing about the poll.

#### A22.4 What the guest sees

- The ordinary sign-in page (or create-account page), with one added line addressed
  to the user (A4), such as **"Sign in to see the poll that was shared with you."**
- The line is **generic**. It never shows the poll's title or anything else about the
  poll, for the reason in A22.1.
- Everything else about sign-in is unchanged:
  - **Stay signed in** is still honoured;
  - the email **rate limits** (`ENV_EMAIL_RATE_LIMIT_*`) are unchanged;
  - the **account-existence privacy** of `request-login-link` / `create-account` is
    unchanged: the same response, whether or not the address is registered.

#### A22.5 Implementation

**Server**

- `src/routes/pages.ts`:
  - `GET /`: when `PID` is present and there is **no session**, redirect to
    `/login?PID=<pid>`. With a session, serve the link route of A15.1 instead of
    today's redirect to `/`.
  - `GET /login` (and `GET /create-account`): a signed-in visitor with a valid `PID`
    goes to `/?PID=<pid>`, not `/`.
- `src/routes/api.ts`:
  - `request-login-link` and `create-account` accept an optional `pid` (UUID, A22.3).
  - `issueLoginLink(req, email, stay, pid?)` passes it in the magic-link
    `metadata`.
  - `/api/auth/verify` reads `PID`, and redirects to `/?PID=<pid>` on success and to
    `/login?error=invalid-link&PID=<pid>` on failure.
- `src/auth/auth.ts`: `sendMagicLink` appends `&PID=<pid>` to the verify URL when
  `metadata.pid` is present. The OAuth sign-in sets the provider's callback URL to
  `/?PID=<pid>`.
- `src/email/`: `sendCreateAccountInvitation` receives `/create-account?PID=<pid>`
  when a pid was supplied. The email wording is unchanged.
- One shared helper validates the id and builds the target URL, used by all of the
  above.
- `postman/openapi.json`:
  - the optional `pid` on `request-login-link` and `create-account`;
  - the optional `PID` on `/api/auth/verify`;
  - the new redirects of `GET /` and `GET /login`.

**Client**

- `src/public/loginCard.js`:
  - read `PID` from `location.search` and send it as `pid` with the link request;
  - show the A22.4 line when it is present;
  - keep it on the `invalid-link` notice path.
- `src/public/createAccountCard.js`: the same for its request.
- `src/public/pollCard.js`: `requireSignIn()` is unchanged. It is for actions on
  cards already shown, not for links.

**Tests**

- Guest routing:
  - A guest on `/?PID=<uuid>` is redirected to `/login?PID=<uuid>`, for an existing
    private poll, a public poll and an unknown id alike. The response gives no sign of
    which.
  - A signed-in user on `/login?PID=<uuid>` goes to `/?PID=<uuid>`.
- Magic link:
  - A login link requested with a pid emails a verify URL carrying it.
  - Verifying it redirects to `/?PID=<uuid>`, and the view is then recorded (A15.2).
  - An expired link keeps the pid on `/login?error=invalid-link`.
- New user: an unknown address gets an invitation to `/create-account?PID=<uuid>`, and
  completing it returns the user to the poll.
- Invalid ids: a non-UUID `PID` is dropped at every step, and every redirect stays on
  this site.
- Unchanged behaviour: stay-signed-in, rate limits and account-existence privacy.
- Browser (jsdom): the login and create-account cards send `pid` and show the A22.4
  line when `?PID=` is present, and are unchanged without it.

*
### A23. A link to a poll that is not published yet (from NON-ADMIN-POLL-EDITING REQUIREMENT005)

The guided new-poll card offers **Copy link** in Step 1, before the poll is published,
with the note "Your link will work once the poll is published." A creator may share
that link straight away, so the link must do something sensible before launch. This
item **changes A15.2 condition 5, A15.3 and A16.3**, which previously said such a poll
is not shown and records no view.

#### A23.1 When it applies

- "**Not published yet**" means a poll that has never been launched. Its state is
  `INITIALIZED`, `AWAITING APPROVAL` or `REJECTED`, or it is `EDITING` without having
  been in a public state first (`isPubliclyListable` is false).
- **Archived** polls are not covered. A15.3 is unchanged for them.
- A **guest** is first sent to sign in or create an account (A22), as for any link.
  The steps below then apply once they are signed in.
- A15.2 conditions 1–4 still apply:
  - the poll is a **Private Poll**, **Anyone With The Link**;
  - the visitor **did not create** it (a creator opening their own link records
    nothing);
  - bans and invitations work as for any link (A15.3).

#### A23.2 What happens

1. The **view is recorded**: the `viewed` relation, upserted as in A15.5. The poll is
   then in the visitor's **Shared With You**.
2. The visitor lands on **Shared With You**, with a message addressed to them (A4):
   **"This poll hasn't been published yet. It's waiting in Shared With You, and you
   can vote once it's published."**
3. In Shared With You the poll is a **"Not published yet" placeholder card**:
   - It says **who shared it**: "**Shared by <creator's name>**". The name comes from
     `polls.created_by_name`, the creator's profile name when the poll was made. It is
     the creator's name even when someone else forwarded the link. If the creator has
     no name set, the line reads just "**Shared with you**". Their email address is
     never shown in its place.
   - It shows **no** title, subtitle, choices, counts or results. The draft may
     still change, and it is not the creator's to show yet.
   - It has **no** Vote, Live Results or Watch control. A17.2 condition 1 is
     unchanged, so an unpublished poll cannot be watched, and votes are refused as
     today.
4. When the poll is **published**, the placeholder becomes the ordinary poll card on
   the tab's next refresh. The visitor does nothing, and the poll keeps its place,
   ordered by the view's time.

**Invited users of an unpublished Invitation Only poll** see the same placeholder,
because their `invited` relation already lists the poll in Shared With You. This
covers invitations added before the poll is published.

#### A23.3 When the placeholder leaves Shared With You

It leaves on the same events as any Shared With You poll (A19.2):
- the poll is deleted;
- the user is uninvited;
- the poll becomes Invitation Only without them.

It also leaves if the creator makes the poll **Public** before publishing, because
Shared With You lists private polls only. Views do not expire (A21), so a poll that is
never published stays as a placeholder until it is deleted.

#### A23.4 Database and implementation

- **No schema change.** It uses the `viewed` relation (A15.5) and the existing state
  columns.
- **Link route** (A15.1): for a signed-in non-creator on an unpublished Private /
  Anyone With The Link poll:
  - record the view;
  - redirect to the Shared With You tab with the message in A23.2;
  - never send the poll's content.
- **Shared With You listing** (`personalListing`, `src/routes/tabsApi.ts`): for a poll
  that is not published yet and not the user's own:
  - send a **redacted projection**: the pid, a `notPublished: true` flag, the
    creator's name (`createdByName`, empty when unset) and the view's time only;
  - send no counts, no overlay choices and no `mayWatch`.

  This must happen on the server; hiding it in the browser is not enough.
- **Card** (`pollCard.js`): render the placeholder when `notPublished` is set, and the
  ordinary card otherwise.
- **Tests:**
  - A signed-in non-creator opening an unpublished link gets the message, and the
    poll appears in Shared With You as a placeholder.
  - The listing response carries none of the poll's title, choices or counts, but
    does carry the creator's name.
  - The placeholder reads "Shared by <name>", or "Shared with you" when the creator
    has no name, and never shows an email address.
  - Watch and vote are refused.
  - After publishing, the ordinary card replaces the placeholder.
  - The creator opening their own link records no view.
  - A guest is signed in first, then gets the same result.
  - An Archived poll's link still records nothing.

### A24. Resolutions from the architecture review

Recorded from `architecture/026-home-page-tabs/architecture.md`; they complete the items
above.

#### A24.1 Presentation of a linked, published poll (NC1)

The visitor lands on the poll's own tab, with the poll shown as the **maximized card**
(021): **Shared With You** for a non-creator of a private poll, **Your Polls** for the
creator, **Trending** for a public poll. Closing the card returns to that tab.

A linked **public** poll is often not among the tab's rows (Trending holds
`ENV_MAX_TRENDING_POLLS`). The link route therefore passes the poll id to the page. The
client fetches that one poll through the existing poll projection and mounts it as a
**retained card** (021: `patchRetained` / `retainMaximized`), then maximizes it. It is
**not** added to the tab's list, so votes and Watch keep working through the retained
card, and closing the card removes it.

#### A24.2 Creator opening their own link (Am1)

No view is recorded. The creator lands on Your Polls with the poll maximized, in any
state including Archived.

#### A24.3 One notice when a linked poll is not shown (U2)

For an unknown poll, an Archived poll (non-creator), an Invitation Only poll the visitor
is not invited to, and a ban, the visitor lands on `/` with the identical notice
**"That poll isn't available."** Nothing reveals which case applied. A23's placeholder is
the only exception.

#### A24.4 Shared With You and old invitation rows (Am2, Am3)

See A15.4 and A19.3. `invited` still lists and still permits watching an Anyone With The
Link poll. Option 2 of A19.3 applies to Invitation Only polls at serve time.

#### A24.5 Permissions from 025 (NC2)

`mayWatch` also requires the **`View Polls`** permission (the bookmark route already
checks it first). The new tabs stay visible to every signed-in user; the Watch control is
hidden for a user lacking `View Polls`. Vote controls follow `Vote on Polls` as today.

#### A24.6 Your Votes after access is lost (NC3)

Your Votes applies Watching's access rule without the state test: a private poll the user
can no longer reach (uninvited, or Anyone With The Link changed to Invitation Only) is
not listed; its row is kept, so it returns with access. A **ban** keeps the card, with
the ban message and no Watch control, as in Shared With You (A19.2).

#### A24.7 Smaller decisions

- **Default tab (U1):** Trending stays the default for everyone. Revisit with A18.
- **State and order (U3):** Shared With You and Your Votes show published states
  (Archived read-only) plus the A23 placeholder, ordered by `updated_at` descending and
  capped at `ENV_MAX_POLLS_SEARCH_RESULTS`. Your Votes orders by the latest vote.
- **View write cost (U4):** no throttle beyond `ENV_PAGE_LOADS_PER_MINUTE`; the write is
  skipped when the existing `viewed` row is under one minute old.
- **Icons (U5):** Shared With You (people silhouette) and Your Votes (check mark) ship
  with neutral placeholder icons in the existing circle style, for the tab-fit research
  to replace.
- **Empty states (U6):** "Nothing has been shared with you yet." · "You haven't voted in
  any polls yet." · "You aren't watching any polls yet." None mentions email (A20.2).
- **"Listed because" line (U7):** "You opened the link", "You were invited", "You voted",
  "You are watching"; never shown in Your Polls (A16.5).
- **Identifiers (U8):** tab ids `your-polls`, `shared-with-you`, `your-votes`,
  `watching`; refresh routes `/api/tabs/<id>/refresh`. `private` and `favourites`, with
  their routes, are retired together.
