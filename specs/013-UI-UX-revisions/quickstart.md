# Quickstart Validation: UI/UX Revisions

**Feature**: 013-UI-UX-revisions | **Date**: 2026-09-07 | **Plan**: [plan.md](./plan.md)

Automated coverage proves the two page-route deltas and the asset migration. Everything else in
this feature is presentation and cross-window behaviour, which is verified by hand here — the same
split 008 used for the poll card.

## Prerequisites

```
npm install
npm test                 # all suites green before starting
npm run dev              # needs ENV_* — use devScripts/launch-dev.ps1
```

Set these before the manual scenarios, or they will take far longer than they need to:

| Variable | Suggested | Why |
|---|---|---|
| `ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW` | `1` | The default locks you out for 15 minutes after two links |
| `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW` | `20` | You will request many links |
| `ENV_PRIVATE_VOTER_LIMIT_DEFAULT` | `10` | Fills a test poll in a few votes |
| `ENV_ADMINS` | your address | Needed for S8–S10 |

Mailtrap holds the sign-in and verification emails.

---

## Automated

```
npm test
```

Must include, all passing:

- `tests/session.test.ts` — a session-less `GET /profile` still redirects to `/login`; a
  session-less `GET /profile?changed=1` and `GET /profile?error=invalid-link` each return `200`
  and HTML.
- `tests/pages.test.ts` — `/admin` still answers `403` to a signed-in non-administrator and to a
  guest, and the body is now HTML; a guest's `GET /login` still contains `login-form`.
- `tests/poll-card-assets.test.ts` — `site.css` carries the promoted `.error` rule; `styles.css`
  no longer carries `main.narrow`; `login.html`, `create-account.html` and `profile.html` no
  longer link `styles.css`.

See [contracts/page-routes.md](./contracts/page-routes.md) for the full route tables.

---

## Manual scenarios

### S1 — The cards render and submit (US4)

Visit `/login`, `/create-account` and `/profile`. Each is one centred card in the poll card's
style, with a title, a close control at the top right, and right-justified actions.

- Open `/login` and touch nothing: the action and the "Stay signed in on this device" checkbox and
  its label are all dimmed and unusable (FR-048). Type one character → all three become usable.
  Clear the field → all three are unavailable again.
- The same on `/create-account`, for its one action.
- On `/profile`: both actions start **unavailable** — each "new value" field starts empty. Typing
  enables the action beneath it; clearing disables it again. Typing the value the person already
  has leaves the action **unavailable**, since that is not a change. The two current values sit in
  read-only boxes, lighter than their labels, and each "new" field shows its grey prompt until
  something is typed. Each button sits **inside its own section**, directly under the field it
  acts on — not both together at the foot of the card — and the gap between the two sections is
  visibly wider than the gap between a label and its field.
- Submit a login request with a valid address → the card stays and reads "Check your inbox — click
  the link we sent you to sign in". The button is now **visibly** dimmed and clicking it does
  nothing — check both, since a disabled button that is not styled as one looks live and still
  invites the click.
- Repeat on `/create-account` → the same, reading "…to activate your account".
- Use each card's × → the home page.

**Expected**: no card scrolls internally; no card is padded out with empty space; the Profile card
is at least 640 px tall.

**A refused submission (400) — the easy one.** Type `not-an-email` and click the action. The card
stays, the status line reads "Please enter a valid email address (max 200 characters)", and the
button **returns to available**: a refusal does not settle the action, because there is a real
reason to try again. Clicking the button bypasses the field's own `type="email"` check, which is
what lets the server answer here at all.

**A rate-limited submission (429) — needs setting up.** A successful submission settles its action,
so this cannot be produced by clicking twice on one page load; each attempt needs its own reload.
And with `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW` at the 20 suggested above you would need 21
of them. For this check only:

1. Set `ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW=1` and restart.
2. Submit a valid address → success, action settles.
3. Reload, submit again → refused, and the status line reads "Too many requests. You can try again
   at HH:MM:SS."
4. Put the value back to 20 before continuing, or the rest of the pass will lock you out.

**Unsaved text is discarded (FR-047, T058)**: on `/profile`, type a new display name and a new
address without submitting either, then use the ×. No confirmation is asked for. Return to
`/profile` — both boxes show what the system holds, not what you typed. Repeat using the header's
product mark instead of the ×; same result.

### S2 — Verification result with no session (US1) — the headline scenario

1. Sign in. On `/profile`, request a change to a new address.
2. Copy the verification link out of Mailtrap.
3. Open it in a **private window** or a different browser.

**Expected**: a card reading "Email Address Changed" with a Log In action — *not* a redirect to the
sign-in form. Before this feature the confirmation was discarded and the person was told nothing.

Repeat with a link you have already used → "Link No Longer Valid".

**The same link in the same browser (FR-007, T027)**: request another change and open its link in
the window that is already signed in. The Profile card renders as usual, with the outcome reported
in the Change Email Address group's status line and the Email Address value already showing the new
address. This is the path most people will actually take; S2's private window is the one that used
to lose the confirmation entirely.

**Read the message, do not just check that one appeared.** The two audiences need different
sentences, and reusing one for both is the natural mistake:

| Where | `changed=1` must read | `error=invalid-link` must read |
|---|---|---|
| Session-less result card | "…updated. **Sign in with your new address to continue.**" | "…**Start the change again from your Profile page.**" |
| Profile card status line | "Your email address has been updated." — **and nothing about signing in** | "…**You can start the change again.**" |

An email change does not end a session, so a signed-in visitor told to sign in has been handed the
session-less wording; and telling them to go to their Profile page is odd when they are looking at
it. Check the refusal wording too, by re-opening a link you have already used.

Then visit `/profile` in that same private window with no parameters → still redirected to
`/login`. This is the check that the guard was relaxed narrowly.

### S3 — The requesting window keeps up, same browser (US2)

1. Open two tabs, both signed out.
2. In tab A request a login link; tab A goes to `/`.
3. Open the link — a third window opens signed in.

**Expected**: tabs A and B show the signed-in header **without a reload**, and poll cards drop
their guest gating.

### S4 — The requesting window keeps up, different browser (US2)

1. In browser 1, signed in, open `/profile` and note the address.
2. Request an address change; open the link in browser 2.
3. Return to browser 1 and click into its window.

**Expected**: on regaining focus, `/profile` shows the new address, the change-address box is
empty, **and the "Verification sent to …" line is gone** — it described a change that has now
completed, so leaving it would tell the person to do something they have already done. Nothing happens while the window is in the background — that is correct; the re-check is
event-driven.

### S5 — Sign-out reaches every window (US2)

Open three windows signed in, one on `/profile`. Sign out in one.

**Expected**: the others show the signed-out header at once; the `/profile` window goes to
`/login`.

**Signing out under someone mid-edit (FR-014, T039)**: repeat with the `/profile` window part-way
through typing a new address. It still goes to `/login` immediately — it does not wait for that
person to act, and the typed text is gone, exactly as when they navigate away themselves. This is
the one case in the feature where text is lost by something other than the person's own action, so
confirm it behaves as decided rather than leaving them on a page whose every action would now fail.

### S6 — Name change propagates (US2)

Two windows signed in, one on `/profile`. Save a new display name.

**Expected**: the Profile card stays put and shows the new name; the other window's header updates
without a reload.

### S7 — Back/forward cache (US2, edge case)

Open `/`, navigate away, sign out in another window, then use the browser's Back button.

**Expected**: the restored page shows the signed-out state rather than the state it was frozen in.

### S8 — Participant labels (US3)

On an invitation-only poll: invite three addresses, save, have one vote, reopen the editor.

**Expected**: every row reads `emailAddress - Invited`; the voter's row reads
`emailAddress <userName> - Invited - Voted`; rows are ordered by address. Invite a fourth address
**without saving** — it appears immediately as ` - Invited`.

On a public poll and a link-only poll: every row reads `emailAddress <userName> - Voted`.

The invite button reads **"Invite"**. The banned list is unlabelled and separately sorted.

### S9 — Header and navigation (US5, US6)

**Expected**: on a wide window, brand and search at the left, create-poll link and avatar at the
right. Clicking the icon or wordmark goes to `/`. Narrow the window below 768 px — the arrangement
is unchanged from before this feature. `/admin` has a back arrow above "Create New Poll" leading
to `/`.

### S10 — The refusal page (US7)

Remove your address from `ENV_ADMINS`, restart, and visit `/admin`, `/admin/poll?PID=…` and
`/admin/poll/results?PID=…`. Then sign out and visit them again.

**Expected**: all six visits show the "Not Authorized" card with the standard header and a control
home — never raw JSON, and the same page whether signed out or signed in.

Then confirm the API is untouched:

```
curl -i http://localhost:9999/api/admin/polls
```

**Expected**: `403` with `{"error":"Not authorized"}` and `Content-Type: application/json`. If this
returns HTML, `createRequireAdmin` was edited instead of parameterised — see
[research.md](./research.md) R10.

---

## Accessibility pass

- Tab into each card: the close control is first, and its focus is visible.
- A screen reader announces a refusal when it arrives in a status line; the Not Authorized and
  verification-result pages are announced as page content, not as updates.
- Each card's title is the page's `<h1>`, and the browser tab of a verification result does not
  read "Profile".
- Escape on a card does nothing.

## Rollback

Every change is additive or confined to files this feature owns. Reverting the commit restores the
previous pages; no data written under this feature needs undoing, because none is.
