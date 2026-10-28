# Quickstart: Validating the Poll Edit Card

Runnable scenarios that prove the feature works end to end, one section per user story. Details live in
[data-model.md](./data-model.md) and [contracts/](./contracts/) rather than being repeated here.

## Prerequisites

```
npm install
npm test                # all suites, no local MongoDB needed
npm run build           # tsc + copy src/public -> dist/public
```

For manual validation you need a running server with an admin identity. Regenerate the git-ignored dev
tooling from the checked-in templates (`launch.json.example`, `devScripts.example/`), then:

```
npm run dev             # needs ENV_*; use devScripts/launch-dev.ps1 on Windows
```

Settings worth lowering while validating, so the interesting states are reachable in minutes rather
than hours:

| Setting | Set to | Why |
|---|---|---|
| `ENV_PARTICIPANTS_VIEWPORT_SIZE` | `3` | Paging is visible with a handful of participants |
| `ENV_PRIVATE_VOTER_LIMIT_DEFAULT` | `5` | The over-cap state is reachable with six voters, not 501 |
| `ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL` | `2000` | Refresh behaviour is observable without waiting |
| `ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL` | `3000` | A stale session is reclaimed in seconds |
| `ENV_EMAIL_RATE_LIMIT_*` | window `1`, max `20` | The defaults lock you out after two sign-in links |

**Before first run**: drop the `polls` and `voteHistory` collections. Existing poll documents hold the
old constant spellings and will silently misbehave rather than error (research R3, R4). Leave the auth
collections alone — dropping them signs everyone out for no reason.

## US1 — Administer every poll from one page (P1)

1. Sign in as an address in `ENV_ADMINS` and open `/admin`.
2. **Expect**: one card per poll, single column, newest first. Each card shows title, subtitle, choices,
   schedule, choice mode, vote mutability, visibility, state, created, and three counts — with no
   further interaction.
3. Narrow the browser to a phone width. **Expect**: the page never scrolls sideways.
4. On a closed poll: **expect** archive available, open and close not — matching the old table's rules.
5. Compare the counts against the poll: `Vote Count` counts only participants who actually voted. On an
   invitation-only poll with unused invitations, it is **lower** than the number of rows the Invitations
   section will show.

## US2 — Edit a poll without leaving the page (P2)

1. Click the pen on a card. **Expect**: it indicates it is working, then the card becomes editable in
   place. The address bar does not change.
2. **Expect**: every other card's pen and the create control are now disabled.
3. Change the title and expand the Participants section. In a second tab, change another poll's state
   so the list has something to update. Wait through at least three refresh intervals. **Expect**: your
   text, your caret position and the expanded section are all untouched — *and* the other poll's card
   shows its new state, proving the refresh is running rather than suspended.
4. In a second tab on `/admin`, find the same poll. **Expect**: it shows as being edited, with its
   controls unavailable. Click its pen. **Expect**: a refusal on that card, and no navigation.
5. In the second tab, edit a *different* poll. **Expect**: allowed.
6. Back in the first tab, click cancel. **Expect**: a warning, then the card returns to read-only form.
7. In the second tab, refresh. **Expect**: the first poll is immediately editable again — the session
   was released by cancel, not left for the sweep.

**Held-back publish** — the branch most often missed:

8. Create a poll, give it a title, but leave the `Choice 1` / `Choice 2` defaults. Save and publish.
9. **Expect**: the title is saved, the poll is **not** published, the card returns to read-only form
   showing `INITIALIZED`, and the reason appears on the card. The card must not remain in editing form.

**Lost session**:

10. Enter editing form, then clear the session server-side — release the lock the way the stale
    sweep does, so the next heartbeat no longer matches. In `mongosh` against the dev database:

    ```
    use app01
    db.polls.updateOne({ pollState: "EDITING" }, [{ $set: {
      pollState: { $ifNull: ["$pollStateBeforeEditUpdate", "INITIALIZED"] },
      pollStateBeforeEditUpdate: null, pollEditUpdateHeartbeatTimestamp: null,
      pollEditUpdateClientGUID: null } }])
    ```

    Stopping the server does **not** exercise this step: the card deliberately ignores a heartbeat
    that fails at the network level (an outage must not cost the admin their draft), the lock is in
    MongoDB so a restart keeps it, and the first stale sweep runs 2 x heartbeat interval after startup,
    by which time the tab's heartbeat has already refreshed the lock. A second browser showing the
    poll as `EDITING` throughout an outage is the correct behaviour.
11. **Expect**: within a heartbeat interval the card returns to read-only form with a message. Focus
    lands on that card's pen, not at the top of the page. A second browser on `/admin` shows the poll
    editable again on its next refresh.

## US3 — Participants and banned voters (P3)

1. Create an invitation-only poll, invite more addresses than `ENV_PARTICIPANTS_VIEWPORT_SIZE`, and
   have some of them vote.
2. Enter editing form. **Expect**: both sections present and collapsed; the first labelled
   `Invitations`.
3. Expand it. **Expect**: rows read `email <name> - Invited - Voted`, sorted by address; names appear
   only for those who voted.
4. Page to the last page. **Expect**: the range's upper bound never exceeds the total — with 5 items at
   a page size of 3, the last page reads `4 - 5 (5 items)`, not `4 - 6`.
5. Type a page number past the end and press Enter. **Expect**: the last page, and the box corrected to
   match.
6. **Expect**: the card's height does not change as you page.
7. Ban someone, then cancel. **Expect**: the ban is discarded and they can still vote.
8. Ban someone, then save. **Expect**: the ban applies, and the card's counts reflect it on return to
   read-only form.
9. Expand `Banned Voter List` on a poll with no bans. **Expect**: "No banned voters." and no pager.
10. On a **public** poll, add more voters than `ENV_PRIVATE_VOTER_LIMIT_DEFAULT` and expand
    `Participants`. **Expect**: no rows, no pager, and a message naming the true count. The card's
    `Vote Count` still shows the true number.

## US4 — Create a poll into an editable card (P4)

1. With no card being edited, click create. **Expect**: a new card at the top, already editable and
   scrolled into view, with no navigation.
2. **Expect**: the create control is now disabled until you save or cancel.
3. Cancel without editing. **Expect**: an unstarted poll remains in the list and can be deleted.

## US5 — Setting names (P5)

1. On a poll with no votes: **expect** the mechanics options read `Single-Choice Poll`,
   `Multiple-Choice Poll`, `Final-Vote Poll`, `Dynamic-Vote Poll`, and the visibility options read as
   full title-case phrases.
2. On a poll **with** votes, where those settings are frozen: **expect** exactly the same words. Not an
   abbreviation, not the old upper-case form.
3. **Voter-facing check — the silent one.** Open a single-choice poll as an ordinary voter, select a
   choice, then select another. **Expect**: the first deselects. If both stay selected, the rename was
   missed at `pollCard.js:1123` and a single-choice poll is behaving as multiple-choice (research R3).
4. Sign in as an invited voter on an invitation-only poll and confirm it appears on the home grid. If it
   does not, `isInvitationOnly()`'s substring was not re-cased — the other silent failure.

## Accessibility pass

Do this with the pointing device unplugged.

1. Reach and operate every control on a card by keyboard: pen, actions, state controls, expand and
   collapse, pager, per-row ban and un-ban.
2. Enter editing form. **Expect**: focus lands in the title field. Leave by cancel. **Expect**: focus
   returns to that card's pen.
3. With a screen reader: each control names its action *and* its poll; expanded/collapsed state and
   current/total page are announced; a refusal message is announced when it appears.
4. Complete every task in US1–US4 without a pointing device (SC-011).

## Scale measurement (SC-012)

The decision not to page the card list rests on an assumption of roughly 100 polls. This measures it.

1. Seed a scratch database with 100 polls in assorted states, several carrying the full 50 choices —
   the choice list is the part of the payload that grows with the card, so a page of minimal polls does
   not exercise the case.
2. Load `/admin` as an administrator with the browser's network throttling set to a typical broadband
   profile and its cache disabled.
3. Record time from navigation start to the page being usable — every card painted and the first pen
   control responding.
4. **Expect**: under 3 seconds (SC-012).
5. Scroll to the last card. **Expect**: no additional request, because one request paints every card.

Record the number whether or not it passes. A failure here is not a defect in the cards — it is
evidence that the no-paging assumption needs revisiting, which is precisely what the assumption in
`spec.md` says it is subject to.

## Automated checks

```
npm test
```

New coverage this feature requires (research R9): the list response's seven fields; the roster cap at,
below and above the ceiling; `voteCount` on a poll with unused invitations; and both silent-failure
sites from R3. Suites naming `adminPoll.js` or `admin-poll.html`, or asserting the
`/admin/poll` ↔ `/admin/poll/update` redirect, are rewritten or deleted — those files and routes are
gone.
