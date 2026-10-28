# Accepted Recommendations — UI/UX for Private Polls

A summary of the naming and icon decisions made in the 2026-09-25 research
conversation (the running record is `iterative-requirements.md`). It is the input for
writing the UI/UX requirements for private polls. Items A23 onward come from the
new-poll card prototype's record, `NON-ADMIN-POLL-EDITING/iterative-requirements.md`
(REQUIREMENT001–020).

Items are split into three groups:

1. **Accepted** — the developer stated or confirmed the decision.
2. **Recommended, not yet confirmed** — proposed in the conversation and not rejected,
   but never explicitly accepted. Confirm or reject each before requirements are written.
3. **Open questions** — raised in the conversation and still undecided.

---

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
- A separate "Invited" tab was considered and **rejected**. Users think of both kinds
  as "a friend sent me a poll", and Google Drive's "Shared with me" covers both in the
  same way.
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
- Also rejected: **Favorites** (means "I like this"), **Saved** (passive storage, with
  no sense of updates), **Watchlist** (streaming services use it to mean "to watch
  later"), **Tracking** (sounds like ad tracking).

### A7. The Watching icon is an eye

Two SVGs have been created in this folder:

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
- How the linked poll is presented (for example, the maximized card from 021 over the
  Shared With You tab) is left to the requirements.

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
| Unknown or deleted poll id | Not shown. No view. |
| Poll **not published yet** (Initialized, Awaiting Approval, Rejected, or Editing before its first launch) | Not shown, but the visitor is told it is not published yet, and the view **is** recorded, so it waits in Shared With You (A23). |
| Poll **Archived** | Not shown. No view. |
| Invitation Only poll and the visitor is not invited | Not shown. No view. |
| Visitor is banned from the poll | Not shown. No view. |
| Visitor is a **guest** | Not shown. The link goes **straight to sign-in**, and after signing in the user returns to the link, where the rules above apply and the view is recorded (A22). |

#### A15.4 Shared With You membership

Shared With You lists a Private Poll when the user holds **either** relation to it:

- `invited`: the poll is Invitation Only and the user is on its invite list.
- `viewed`: the user opened its link (A15.2).

In both cases the poll must be one **the user did not create**. The poll stays listed
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

- The **next spec** will let every signed-in user create polls, public and private,
  **by default**.
- Today only `ENV_ADMINS` accounts can: `POST /api/admin/polls` is `requireAdmin`, and
  the header's **Create Poll** link is disabled for everyone (004 FR-035).
- Public polls will probably need moderation. That is a **separate issue** and is not
  decided here. Your Polls shows whatever state moderation leaves a poll in (A16.3).
- Your Polls is built so that it works unchanged once that spec lands. Until then it is
  empty for everyone except admins, who see the polls they created.

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
  polls yet." Once users can create polls, it also offers the way to create one.
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


### A24. New polls are set up in a guided wizard inside the card (from NON-ADMIN-POLL-EDITING REQUIREMENT004–008, 011–012, 014)

Every user will be able to create polls (A16.1), so the new-poll card must guide a
user who does not know the system's settings. The prototype is
`NON-ADMIN-POLL-EDITING/admin-cards.html`.

#### A24.1 The method

- A **step-by-step wizard (stepper)** inside the card, for a **new** poll while it is
  unpublished (`INITIALIZED`). On a published poll, a tap on the Summary Text opens
  the edit face (A30; there is no pen), which a later requirement redesigns (A24.6).
- **Phone-first:** one step fills the card at a time.
- **Plain-language labels.** The wizard may relabel settings ("Who can vote?" for
  Visibility and Sharing Mode). The **stored enumerations stay verbatim**.
- **"Your poll", never "This poll"** in every message the creator sees on the card
  (REQUIREMENT011), and the present tense ("is", not "will be"). "Any edits will be
  lost. Continue?" is about the edits, and stays.
- **Public polls are offered** ("Everyone on CrowdPoll"). They are reviewed before
  they appear. How moderation works for non-admin creators is a later requirement.
- **Invitations are added after the poll is created.** The wizard only asks who can
  vote, never for the invite list.
- **Techniques:**
  - inline help ("What does this mean?") inside the card, never a separate page;
  - validation as the user types, in every field that allows it;
  - one clear finish: **Publish**, enabled only when the poll is publishable.

#### A24.2 The five steps

| # | Step (heading) | Short name | Designed in |
|---|---|---|---|
| 1 | Who can vote | Who | A25 |
| 2 | Title & Tags | Title | A26 |
| 3 | Choices | Choices | A27 |
| 4 | How to vote | How | A28 |
| 5 | When to vote | When | A29 |

The heading reads "Step N · \<name\>".

#### A24.3 The card, top to bottom

1. **Settings Summary Section**, holding the **Summary Text** (REQUIREMENT011):
   - a heading of the poll's **Title and Subtitle, exactly as on a Poll Card** (the
     Poll Card's own `.question` / `.subtitle` styles, no quotation marks; no Subtitle
     line when it is empty), shown from the start;
   - then plain-language text describing the settings so far, starting from the
     defaults, with **one line per aspect of the poll**; its height follows its text;
   - it speaks in the present: "Your poll **is** a Private Poll", never "will be";
   - a part is **underlined and tappable only once its step is answered** (Next
     pressed on it), and tapping it opens that step;
   - a tappable part **wraps like the words around it** (inline text with a button's
     role, keyboard-operable with Enter and Space), so a long keyword list or title
     stays one sentence (REQUIREMENT012);
   - before then the parts are plain text.
2. **Named Circles**, the step indicator:
   - five equal columns joined by a line, each with its **short name above** the
     circle;
   - **current:** an outlined number with a thick moss ring and a bold short name;
   - **visited:** a filled ink circle with ✓, tappable to go back;
   - **not yet visited:** a grey outlined number, **inert**.
3. **The step panel:**
   - only the current step is shown;
   - a filled moss **Next >>** is the only way forward, and **Step 5 has none**;
   - Next is **always enabled**, whatever is missing, except while Step 3 has a
     **duplicate choice** (A27.2). Missing or invalid settings disable Publish
     instead;
   - there is **no Back button**: the Named Circles go back.
4. **Footer:** **[Cancel]** on the left, **[Save] [Publish]** on the right:
   - rounded buttons in the main webapp's styles;
   - Cancel and Save are outlined (`btn-header-ghost`);
   - Publish is filled ink (`btn-header-primary`).

**Colours:** CrowdPoll's palette, not Material's purple. Moss `#3D5A46` for the current
step, filled step buttons and selected controls; ink for completed steps. The controls
imitate Material 3 (radio list, tonal and filled buttons, input chips, snackbar), and
the text fields imitate Samsung One UI (A26.1), with hand-written CSS, and no component library.

#### A24.4 Save, Cancel and Publish

- **Save** keeps the answers and the progress (current step, visited and answered
  steps), and returns to the read-only card, still `INITIALIZED`. A tap on its
  Summary Text then **reopens the wizard**, at the tapped part's step, with the saved
  progress (A30.3). Save is available while the poll is
  unpublished.
- **Cancel** discards the answers since the last Save and returns to the read-only
  card, with the poll unchanged. If anything changed, it first asks "Any edits will be
  lost. Continue?". The poll already exists (Create New Poll made it), so Cancel never
  deletes it. On a published poll, Cancel discards the unsaved setting changes the
  same way.
- **Publish** is enabled only when:
  - the poll has not been published;
  - **all five steps have been visited**;
  - every setting is valid (so far: the title is set, A26.2, and the choices are
    real and at least 2, A27.2, and the schedule is valid, A29.3).

  Its tooltip names what is missing. Publishing sends the poll to screening, so the
  card shows `AWAITING APPROVAL`, as the server does today.
- The wizard holds an **edit session** like the edit face, so the heartbeat, the
  unsaved-changes guard and the **one-card-at-a-time** rule apply to it.

#### A24.5 Width of every admin card

- **Fluid, capped at 420px and centred** (`width: 100%; max-width: 420px;
  margin: 0 auto`), like the Poll Card. All admin cards are the same width on any one
  screen: 332px on a 360px phone, up to 412px on the largest phones, 420px elsewhere.
- **The wizard works down to a 320px window** (WCAG 2.1 *Reflow*, and phones set to
  large text):
  - it stops shrinking at 292px (`min-width`), and below a 320px window the page
    scrolls sideways;
  - below 360px its spacing tightens: 12px padding, 12px footer-button padding, 32px
    circles, and 11px circle labels.
- The read-only card will be redesigned, not just narrowed (A24.6). Until then it has
  no minimum width.

#### A24.6 Deferred to later requirements

- The **redesigned read-only card**.
- **Editing after publishing:** the few settings that may change after publishing.
  Each is validated as it changes, and an invalid value blocks saving until corrected.
- The invitation email (A25.3).

### A25. Wizard Step 1: Who can vote (from NON-ADMIN-POLL-EDITING REQUIREMENT005–006, 011, 020)

#### A25.1 The choices

**One flat list** of three Material-style radio options, **private first**, each with
one line of supporting text:

| Option | Supporting text | `pollVisibility` | `pollSharingMode` |
|---|---|---|---|
| **Anyone you send the link to** (default) | Private. Only people with the link can find and vote in your poll. | `Private Poll` | `Anyone With The Link` |
| **Only people you invite** | Private. You'll add their email addresses after the poll is created. | `Private Poll` | `Invitation Only` |
| **Everyone on CrowdPoll** | Public. Anyone can find it in Trending, Newest and Search. Public polls are reviewed before they appear. | `Public Poll` | unchanged (not used while public) |

- A single **"What does this mean?"** disclosure explains all three:

  | Option | Help text |
  |---|---|
  | Anyone you send the link to | Your poll is private: it is listed only in the Shared With You tab for the people you share it with, and is not listed in Trending, Newest or Search. Anyone who has the link can open it and vote. |
  | Only people you invite | Your poll is private: it is listed only in the Shared With You tab for the people you share it with, and is not listed in Trending, Newest or Search. Only the people whose email addresses you add can vote. You add them after the poll is created. |
  | Everyone on CrowdPoll | Your poll is public: anyone on CrowdPoll can find it and vote. Public polls are reviewed before they appear. |
- A radio list always holds a valid answer, so no validation is needed.

#### A25.2 Copy link

- A tonal **Copy link** button under "Anyone you send the link to", shown only while
  that option is selected.
- It copies `<site>/?PID=<pid>` (A15.1) and confirms with a **"Link copied"**
  snackbar. If the browser refuses the clipboard, the link is shown selected in a
  box to copy by hand.
- It is available **before publishing**, with the note **"Your link will work once
  the poll is published."** What the link does before then is A23.

#### A25.3 Summary Text line

| Answer | Line (tappable parts in __underline__, once Step 1 is answered) |
|---|---|
| Anyone you send the link to | Your poll is a __Private Poll__. __Anyone you send the link to__ can vote. __Votes are anonymous.__ |
| Only people you invite | Your poll is a __Private Poll__. __Only people you invite__ by email can vote. __Votes are anonymous.__ |
| Everyone on CrowdPoll | Your poll is a __Public Poll__. __Everyone on CrowdPoll__ can find it and vote. |

"by email" is **plain text**: invitees will receive an invitation email in a future
requirement.

On a private poll the last sentence follows the switch (A25.4): **"Votes are
anonymous."** when off, or **"Users can see who voted for what."** when on. A public
poll's line has neither, since its votes are always anonymous.

#### A25.4 "Users can see who voted for what" (REQUIREMENT020)

- **A Material 3 on-off switch**, in one row **after the radio list**, shown while
  either **private** option is selected. The label is on the left and the switch on
  the right, and the whole row is tappable.
  - It is a native checkbox with `role="switch"`.
  - A supporting line under the label follows its state: "Off: votes are anonymous."
    / "On: voters' names are shown with their choices."
- **Stored in `voteAnonymity`** (`vote_anonymity`):
  - off, the **default**, is `"Yes"` (anonymous), as `createDefaultPoll` has it;
  - on is `"No"`;
  - a public poll hides the switch and saves `"Yes"`;
  - a value set while private is kept in the wizard if the user switches to public
    and back.
- **"What does this mean?"**, while a private option is selected, adds:

  > **Users can see who voted for what**: Off (the default): votes are anonymous.
  > Everyone sees how many votes each choice has, but not who cast them. On: the names
  > of voters are shown next to the choices they picked. Turn it on only if your
  > voters expect it, and tell them. It can't be changed once your poll has votes.

- **Rule change for the real app:**
  - `designDocs/016-high-level-requirements-POLL-SETTINGS-CHANGE.md` says voters who
    did not create the poll can never see who voted for which choice. With this
    switch **on**, **voters as well as the creator** see who voted for what.
  - Admins still always can, and anonymous polls are unchanged.
  - **How** they see it is deferred to a later requirement.
- As today, the setting cannot change once the poll has a vote.

### A26. Wizard Step 2: Title & Tags (from NON-ADMIN-POLL-EDITING REQUIREMENT009–012, 016)

#### A26.1 Android-style fields (Samsung One UI)

**Samsung One UI underlined text fields** (REQUIREMENT010, `androidEditFields.jpg`):
- **no box**: a 1px ink underline, 2px moss while focused;
- the **label always above** the input, 14px, in **moss** on every field;
- the input at 17px;
- the **instructions (supporting text) below** the field on the left, never beside the
  label;
- a **character counter below on the right**;
- an **error replaces the supporting text** in the site's red `#B0242E`, and turns
  the label and the underline (2px) red;
- 24px between fields.

| Field | Supporting text | Counter |
|---|---|---|
| **Title** (required) | Required. Emoji are welcome. (on a computer: Required. For emoji press \<shortcut\>, A27.3) | `n / 100` |
| **Subtitle** (optional) | Optional. Shown under the title. | `n / 50` |
| **Keywords** (public polls only) | Comma separates keywords (keyword1, keyword 2). Letters, numbers and spaces. Used for search. | `n / 200` |

Lengths count UTF-16 units, as `maxLength` and the server do, so most emoji count as
**2**.

#### A26.2 Title and Subtitle

- **Title:** default "New Poll \<date time\>", which **must be changed**. It opens
  **selected**, so typing replaces it. Up to **100** characters (`TITLE_MAX`, unchanged).
- **Subtitle:** up to **50** characters (REQUIREMENT011). The server needs a separate
  `SUBTITLE_MAX = 50`; today `service.ts` checks the Subtitle against `TITLE_MAX`.
  **Existing subtitles of 51–100 characters are kept** until the poll is next
  edited, and must then be shortened before it can be saved.
- **No newlines** in either field. They wrap and grow, but **Enter moves to the next
  field** (`enterkeyhint="next"`, the Android keyboard's Next key), and pasted
  newlines become spaces. An Android keyboard offers Next *or* newline, never both,
  and the Poll Card does not show newlines anyway.
- The Subtitle's Enter moves to Keywords on a public poll, and is **Done** on a
  private poll.
- An empty or default title shows **"Give your poll a title."** once the field has
  been left. It does not stop **Next >>**; it disables **Publish**.

#### A26.3 Keywords

- **Public polls only.** The field is not shown unless Step 1 is "Everyone on
  CrowdPoll". Keywords entered before switching to private are kept in the wizard but
  hidden, and are **not saved with a private poll**.
- Entered as **input chips**, each with a × after its word. **Enter or comma** makes a
  chip, and so does **leaving the field** (Tab, Next, a click elsewhere, Save,
  Publish), so the last keyword needs no comma (REQUIREMENT012). **Backspace** in the
  empty field removes the last one.
- Text that **cannot** become a chip (a duplicate, or over the limit) keeps its error
  while the user is on Step 2, and is **dropped** when they leave the step, save or
  publish. Nothing is blocked by it.
- **Characters:** lower case a-z, digits 0-9, and spaces. Capitals are lowered as they
  are typed, and other characters are not accepted. Leading and trailing spaces are
  trimmed, and runs of spaces become one ("christmas  party " → "christmas party").
- **No duplicates** (compared after trimming): "Already added."
- **Limit, the way YouTube limits tags:** **200 characters in total**, counting every
  keyword's characters (spaces included) plus **one comma between each pair**, which
  is the length of the stored value. There is **no limit on the number of keywords**
  and **no limit per keyword**. A keyword that would pass 200 is refused with
  "Keywords can total at most 200 characters.", and the typed text stays.
- **Stored** as one comma-separated value in a **new poll column**, used for searching
  and filtering public polls. This supersedes REQUIREMENT005's "up to 10 keywords,
  1 to 20 characters each".

#### A26.4 Summary Text

The Title and Subtitle are the heading from the start (A24.3), and become tappable
(opening Step 2) once Step 2 is answered. A public poll's keywords then get a line of
their own, also opening Step 2:

> **__Where should we get together for Christmas?__**
> __2026 - Can't Wait__
> Your poll is a __Public Poll__. __Everyone on CrowdPoll__ can find it and vote.
> It can be found by searching for __christmas party, 2026__.



### A27. Wizard Step 3: Choices (from NON-ADMIN-POLL-EDITING REQUIREMENT013–014, 016)

#### A27.1 The field

The admin edit face's **choices box and its rules are reused**, restyled as Step 2's
One UI underlined field (A26.1):
- **no label**: the step heading names it. The box shows the placeholder **"Enter your
  choices here"** and has the accessible name "Choices";
- it **starts empty**. A new poll is still stored with "Choice 1 / Choice 2", and the
  wizard treats exactly those as no choices;
- the supporting text is **"One choice per line. Press Enter after each choice."**
  followed by the emoji instruction (A27.3), for example "… For emoji press Win + ."
  (REQUIREMENT016);
- **one choice per line**, in a box at least four lines tall that grows with its
  content, with no inner scroll bar;
- **Enter starts a new line** (`enterkeyhint="enter"`), because each line is a choice;
- the supporting text below on the left, and the counter **`n / 50`** (non-blank
  lines against `maxChoices`) on the right;
- errors replace the supporting text in red.

#### A27.2 Rules

| Rule | Behaviour |
|---|---|
| Choice length | At most **40** characters (REQUIREMENT014): "Choices are capped at 40 characters." The admin edit face keeps 100 until it is redesigned. |
| Duplicates | Two choices that differ only in capitals or spaces are the same ("Taco Town", "taco  town "). As soon as one repeats, the field shows **"“Taco Town” is already a choice."** and the counter turns red. While it remains, **Next >>, Save and Publish are disabled** ("Remove the duplicate choice first."), and the Named Circles and summary parts do not leave Step 3. Cancel still works. This is the only rule that stops Next. |
| Blank lines | Enter on an empty line is refused ("Type a choice before starting a new line."). Blank lines are removed ("Blank lines were removed."). |
| Most choices | `maxChoices` (50): "That's the limit — 50 choices maximum." / "Only the first 50 choices were kept." |
| Not publishable | Once the field has been left: **"Add at least 2 choices."** under `minChoices`. It disables **Publish** ("Add at least 2 choices to publish."). It does not stop **Next >>**. |

Choices may contain any character, including emoji. They are saved as `labels`.

**For the real app:**
- the server's `CHOICE_LABEL_MAX` (`src/polls/service.ts`, 100) becomes **40** for
  polls set up this way;
- **existing choices over 40 characters are kept** until the poll is next edited, and
  must then be shortened (as for subtitles, A26.2);
- the server already **trims** each choice and refuses **exact** duplicates
  (`replaceChoices`: `409 "Choice labels must be unique."`). That rule should be
  **extended** to ignore capitals and inner spaces, as the wizard does, so it cannot
  be bypassed (corrected under REQUIREMENT017);
- leading and trailing spaces left in the box are harmless: they are trimmed wherever
  the choices are used (the summary, the duplicate check, Save / Publish, and the
  server), so the box itself is not trimmed as the user types (REQUIREMENT017,
  rejected).

#### A27.3 Paste choices and emoji instructions

- **Paste choices**, a tonal button under the field (REQUIREMENT005's "Copy Choices
  from Clipboard"):
  - it reads the clipboard, one choice per line, and **adds** the lines after any
    choices already in the box;
  - it goes through the same rules and messages;
  - **any paste**, whether the button, Ctrl+V or a long-press, **drops repeated choices**,
    keeping the first, and says so in a snackbar ("2 duplicates were removed.");
  - if the browser refuses the clipboard: "Paste into the box instead", and the field
    is focused;
  - a grey caption under the button, like Copy link's note, reads **"Adds choices
    copied from another app, one per line. Repeats are removed."** It is the button's
    description (`aria-describedby`) and its tooltip (REQUIREMENT016).
- **Emoji instructions on computers**, chosen from the user agent, in the Choices
  field and in the Title's supporting text (A26.1):

  | Platform | Wording |
  |---|---|
  | Windows | For emoji press **Win + .** |
  | macOS | For emoji press **Ctrl + Cmd + Space** |
  | ChromeOS | For emoji press **Search + Shift + Space** |
  | Phone, tablet, Linux or unknown | Emoji are welcome. |

#### A27.4 Summary Text line

Once Step 3 is answered:

> Voters choose from __Pizza Palace, Taco Town, Burger Barn 🍔__.

- The list is one tappable part, opening Step 3.
- It wraps as text (A24.3).
- It comes after the Step 1 line and the keywords line.


### A28. Wizard Step 4: How to vote (from NON-ADMIN-POLL-EDITING REQUIREMENT015–016)

#### A28.1 The questions

Two Material radio lists, as on Step 1, each option with one line of supporting
text:

| Question | Option | Supporting text | Stored |
|---|---|---|---|
| How many choices can each voter pick? | **One choice** (default) | Voters pick a single choice. | `Single-Choice Poll`, 1 / 1 |
| | **More than one** | Voters pick several choices. | `Multiple-Choice Poll`, and the range below |
| Can voters change their vote? | **Yes, as often as they like while the poll is open** (default, listed first) | Voters can change their vote until the poll closes. | `Dynamic-Vote Poll` |
| | **No, their first vote is final** | Once a vote is cast, it cannot be changed. | `Final-Vote Poll` |

"What does this mean?" explains all four, in the same order, as on Step 1.

**The default comes from the poll** (REQUIREMENT016): `createDefaultPoll`
(`src/polls/service.ts`) changes from `Final-Vote Poll` to **`Dynamic-Vote Poll`** for
**every** new poll, admin-created ones included, so there is one default everywhere. **Vote Anonymity** is not on
this step. It is the switch on Step 1 (A25.4, REQUIREMENT020), which supersedes
REQUIREMENT015's "leave it out of the wizard".

#### A28.2 More than one: a range or an exact number

While "More than one" is selected, two indented options appear:
- **From [a] to [b] choices**, the default, **from 1 to N** (today's behaviour). "From"
  offers 1 to N−1, and "to" offers a+1 to N.
- **Exactly [k] choices**, offering 2 to N−1. "Exactly 1" is One choice, and
  "Exactly N" would force every choice.

The numbers are **dropdowns**, the phone's own picker, so there is no typing to
validate. N is Step 3's number of choices, and "to N" follows N as choices are added.

**When Step 3 changes after Step 4 is answered**, the numbers are clamped to the new
N:
- the step shows "Adjusted to your N choices.";
- with 2 choices, "Exactly" is not offered;
- under 2 choices, "More than one" is disabled ("Add at least 2 choices in Step 3
  first.") and the poll is saved as One choice.

This can never make the poll unpublishable, so Step 4 adds **no Publish rule**.

#### A28.3 Summary Text line

Once Step 4 is answered, after the choices line, tappable to Step 4:
> Each voter picks __one choice__ / __from 1 to 3 choices__ / __exactly 2 choices__, and
> __can change their vote__ (the default) / __their vote is final__.

#### A28.4 For the real app

- **New poll fields `minSelections` / `maxSelections`:**
  - Single-Choice is 1 / 1;
  - existing Multiple-Choice polls become 1 / (their number of choices), which is
    today's behaviour;
  - the server checks 1 ≤ min ≤ max ≤ choices.
- **Vote validation** (`validateVoteChoicesAndState`) refuses a vote with fewer than
  min or more than max choices.
- **The Poll Card tells voters what to pick** ("Pick 2", "Pick 1 to 3"), and enforces
  it before sending. This is a later requirement.
- **Choices are locked once votes exist**, as `choiceMode` already is, so the range
  cannot become invalid under voters.


### A29. Wizard Step 5: When to vote (from NON-ADMIN-POLL-EDITING REQUIREMENT018)

#### A29.1 The questions

Two radio lists, as on Steps 1 and 4:

| Question | Option | Supporting text | Stored |
|---|---|---|---|
| When does voting start? | **Poll starts immediately** (default) | Voting opens as soon as your poll is published. | `startAt` null |
| | **Poll starts on [date and time]** | Voting opens at the date and time you choose. | `startAt` |
| When does voting end? | **Poll has no end date** (default) | Your poll stays open until you close it. | `endAt` null |
| | **Poll ends on [date and time]** | Voting closes at the date and time you choose. | `endAt` |

- **The date control** is the edit face's `datetime-local` input: the phone's date
  picker, then its time picker. It sits inline in its radio row, underlined like
  Step 4's dropdowns, and picking a date selects its option.
- **Pre-filled** when "starts on" or "ends on" is first chosen:
  - start: **tomorrow at 9:00**;
  - end: **7 days after the start**, or after now if the poll starts immediately.

  A date chosen before is kept if the user switches away and back.
- **The time zone line** under both: "Times are in your time zone (\<zone\>).", from
  the browser.
- Step 5 is the last step, so it has no Next.

#### A29.2 Help text ("What does this mean?")

| Term | Help |
|---|---|
| Poll starts immediately | Voting opens as soon as your poll is published. Public polls open once they have been reviewed. |
| Poll starts on | Your poll waits until this date and time, then opens for voting. Until then, anyone who opens it sees that it hasn't started yet. |
| Poll has no end date | Your poll stays open until you close it from its card. |
| Poll ends on | Voting closes at this date and time. The results stay available after it closes. |
| Time zone | Dates and times are in your time zone. Voters see them in their own. |

The "close it from its card" wording assumes non-admin creators can close their own
poll, as admins can today.

#### A29.3 Validation

| Case | Shown | Effect |
|---|---|---|
| Start not before End (both set) | **"Start must be before End."** under the end question, and the end control's underline turns red | Disables **Publish** ("… to publish.") |
| End in the past | **"The end must be in the future."** New, wizard only: the poll would otherwise publish already closed | Disables **Publish** |
| Start in the past | Note: **"This is in the past: voting opens as soon as it is published."** | None |

The server keeps today's rule (`startAt must be before endAt`). A real-app requirement
may add "end in the future" on publish, so the rule cannot be bypassed.

#### A29.4 Summary Text line

Step 5 counts as **answered on its first change** (or on Publish), since it has no
Next. From then on, a last line, tappable to Step 5:

> Voting opens __as soon as your poll is published__ / __on Sat, Oct 3 at 9:00 AM__ and
> __stays open until you close it__ / closes __on Sat, Oct 10 at 9:00 AM__.

Dates are formatted with the browser's locale. The year is added when it is not the
current year ("on Sat, Oct 3, 2027 at 9:00 AM"; A31).

### A30. The poll card's read-only face (from NON-ADMIN-POLL-EDITING REQUIREMENT021)

The same face for **every** poll card: the owner's card and the admin page's cards.
It replaces the admin card's two-column read-only face. The editing face is
unchanged. The mockup is `NON-ADMIN-POLL-EDITING/pollCardNonEdit.jpg`.

#### A30.1 Layout (one column at every width)

| Part | Content |
|---|---|
| Header | **Poll State Is:** `<state>`, with the approval wait, the rejection reason or **Re-attempt Screening** beside it as today. Then Duplicate, Copy Link, View Results, Delete, and the ⋮ menu (unchanged). **No pen.** |
| Date Related Panel | **Open**, **Close**, **Archive** (each enabled by `canOpen` / `canClose` / `canArchive`), then **Created** and **Launched** ("not launched", dimmed, when absent). |
| Counts Panel | **Vote Count**, **Invitation Count** (Invitation Only polls), **Banned Voter Count** (every poll; banning on public polls is a future requirement). |
| Summary Text | Exactly the wizard's (A24–A29), built from the stored poll. |

- **Material 3:** the panels are outlined cards (12 px corners). Open/Close/Archive
  are outlined buttons. The icons are standard icon buttons (40 px targets).
- **Removed from the read-only face:** Title, Subtitle and Choices (now in the
  summary's heading and lines), Start, End, Choice Mode, Vote Mutability, Poll
  Visibility, Sharing Mode, Anonymous Votes and **Voter Count Limit**.
- The 292 px minimum width (REQUIREMENT007) now applies to every card.

#### A30.2 The Summary Text on a saved poll

- **A poll still in its wizard** (`INITIALIZED`) reads as the wizard would reopen:
  - the default "Choice 1 / Choice 2" count as no choices;
  - only the answered steps have lines.
- **Any other poll** has every step answered.
- **The when-line** is worded by the poll's state (A31).

#### A30.3 The Summary Text replaces the pen

- **Tappable parts:** a part is tappable (underlined, a button role, Enter/Space)
  exactly when the pen would have been enabled: the poll can be edited or updated, and
  no other card is being edited. Otherwise every part is plain text.
- **One card at a time:** while any card is in its wizard or edit face, every other
  card's summary loses its underlines. They return when that editor closes.
- **A tap:**
  - on an `INITIALIZED` poll, it opens the wizard at that part's step (the heading →
    Step 2);
  - on a published poll, it opens the edit face.
- **While the edit request is out,** the summary is `aria-busy` and ignores taps. A
  refusal shows the status line, as before.
- **After Save, Cancel or a lost session,** focus goes to the first tappable part.

**Real app:**
- `src/public/adminCard.js` takes the prototype's read-only face.
- `adminList.js` calls `focusSummary` where it called `focusPen` (line 391).
- `adminList.js` opens a new poll's editor through the summary's Step 1 part, not
  `.card-pen` (line 470).
- The browser tests that find `.card-pen` or the old read-only fields are rewritten,
  including `polls-editing-eligibility.test.ts`, which slices the source at
  `function focusPen`.
- No server, route or contract change.

### A31. The when-line follows the poll's state (from NON-ADMIN-POLL-EDITING REQUIREMENT022)

The Summary Text's last line is worded by the **poll state first**, then the dates:
- "opened" is used only once the poll is OPEN, CLOSED or ARCHIVED;
- "closed" is used only once it is CLOSED or ARCHIVED.

The clock alone never decides, for two reasons:
- The schedule sweep can lag.
- A poll awaiting approval can have a start date that has already passed.

`launchedAt` does not decide either, because the server clears it on every close.

**Opening phrase**

| State | Start date | Text |
|---|---|---|
| INITIALIZED (wizard or saved) | none | Voting opens **as soon as your poll is published** |
| INITIALIZED | set | Voting opens **on [date] at [time]** |
| AWAITING APPROVAL, REJECTED | none or past | Voting opens **as soon as your poll is approved** |
| AWAITING APPROVAL, REJECTED, WAITING TO OPEN | future | Voting opens **on [date] at [time]** |
| OPEN | none | Voting **is open now** |
| OPEN, CLOSED, ARCHIVED | set | Voting opened **on [date] at [time]** |
| CLOSED, ARCHIVED | none | Voting opened **when your poll was published** |

**Closing phrase**

| State | End date | Text |
|---|---|---|
| not CLOSED/ARCHIVED | none | and **stays open until you close it**. |
| not CLOSED/ARCHIVED | set | and closes **on [date] at [time]**. |
| CLOSED, ARCHIVED | set | and closed **on [date] at [time]**. |
| CLOSED, ARCHIVED | none (old data only: a Close sets `endAt`) | and **has closed**. |

- **Dates:** "on Sat, Oct 3 at 9:00 AM", with the year when it is not the current year,
  in the wizard too.
- **A poll being edited** (EDITING) is worded as `pollStateBeforeEditUpdate`. Without
  that field, it is worded as OPEN when `launchedAt` is set, and as unpublished
  otherwise.
- **Manual Open and Close stay truthful:**
  - Open clears `startAt`, so the poll reads "is open now".
  - Close sets `endAt` to now.

**Real app:** `adminCard.js` takes `whenPhrases` and the new `whenText`. The admin list
row should carry `pollStateBeforeEditUpdate` so an EDITING poll is worded exactly. No
server rule changes.

---

## 3. Open questions
