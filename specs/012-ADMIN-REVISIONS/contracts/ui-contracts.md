# UI Contract: Admin Revisions

**Feature**: 012-ADMIN-REVISIONS | **Plan**: [../plan.md](../plan.md)

Three surfaces change: the admin poll list, the two poll editing pages, and the public poll card.
Wording given in quotes is exact and testable.

**Terminology**: "editing surface" and "editing page" are the same thing, as are "update surface"
and "update page". The spec uses *page*; this document and the existing source comments use
*surface*. Both are kept rather than renamed, because the code already reads that way.

---

## 1. Admin poll list (`admin.html` / `adminList.js`)

### Column order

| # | Column | Contents |
|---|---|---|
| 1 | Title block | pen icon + title, subtitle, optional screening line — see below |
| 2 | State | `pollState` verbatim |
| 3 | Open | button, enabled iff `canOpen` |
| 4 | Close | button, enabled iff `canClose` |
| 5 | Archive | button, enabled iff `canArchive` |
| 6 | Created | `createdAt`, localised |
| 7 | Launched | `launchedAt`; absent → `not launched` (019 FIX03) |
| 8 | Start | `startAt`; absent → `started` while OPEN, else `not scheduled` |
| 9 | End | `endAt`, or `does not end` |
| 10 | Action icons | duplicate · copy link · view results · delete |
| 11 | Actions menu | the existing kebab, wording unchanged |

`Subtitle`, `Waiting` and `Rejection reason` cease to be columns.

### Row shape

One `<tr>` per poll, so `tbody tr:nth-child(even)` stripes per poll rather than per line
([research R12](../research.md#r12--zebra-striping-with-variable-height-rows)). Colours come from
existing `admin.css` surface tokens.

### Title block (column 1)

```
[✎] Which venue for the September meet-up?      ← pen icon + title, title is a link
    Pick one — we book on Friday                 ← subtitle: italic, one step smaller, tight
    REJECTED: names a private individual  [Re-attempt Screening]   ← only when applicable
```

| Element | Rule |
|---|---|
| Pen icon | Enabled iff `canEdit \|\| canUpdate`. Links to `/admin/poll?PID=` when `canEdit`, `/admin/poll/update?PID=` when `canUpdate`. |
| Title | A link to the same target when the pen is enabled; plain text otherwise (FR-034). |
| Subtitle | Directly below the title, italic, slightly smaller, minimal spacing. Omitted when empty. |
| Screening line | Rendered **only** when `pollState` is `AWAITING APPROVAL` or `REJECTED`. Title's font, bold. |

Screening line contents:

- `AWAITING APPROVAL` → `AWAITING APPROVAL — <elapsed>`, where `<elapsed>` is measured from
  `pollApprovalTimestamp` and reads `queued` before the first attempt is claimed (existing
  `waitingFor` behaviour, relocated).
- `REJECTED` → `REJECTED: <reason>`, preceded by a `[Re-attempt Screening]` button **only** when
  `canRescreen` (FR-037).

### State buttons (columns 3–5)

Always rendered; greyed when their capability is false, which is what keeps columns aligned across
rows. Each issues `PATCH /api/admin/polls/:pid` with the corresponding `pollState`. Archive keeps
its existing irreversibility warning. A 409 is shown inline on the row, and the next refresh
reconciles (FR-029).

### Action icons (column 10)

Inline SVG via `<symbol>`/`<use>`, each in a `<button>` with a `title` tooltip
([research R11](../research.md#r11--icons-without-an-icon-library)).

| Icon | Tooltip | Enabled | Action |
|---|---|---|---|
| duplicate | `Duplicate Poll` | always | `POST …/duplicate` |
| link | `Copy Poll Link` | always | copies `/?PID=…` to the clipboard |
| chart | `View Results` | always | opens the admin results page |
| trash | `Delete Poll` | iff `canDelete` | confirms, then `DELETE …/:pid` |

All four are always rendered, disabled ones greyed (FR-039). Delete keeps its confirmation
(FR-040).

### Empty dates

`startAt` absent → `started` while the poll is OPEN, `not scheduled` in every other state
(019 FIX02 — the Close transition leaves the cleared `startAt` alone, so a hand-opened poll that
has closed used to read "started" beside its end date). `endAt` absent → `does not end`. All
lower case, replacing the current em-dash (FR-038). Both become common after this feature, since
the Open transition always clears `startAt`.

### Kebab menu (column 11)

Unchanged wording, unchanged position. It is a second affordance for the same capability set — the
icons and the menu items dispatch the same handlers and never encode different rules (FR-041).

---

## 2. Editing surfaces (`admin-poll.html` / `adminPoll.js`)

### Mechanics controls

`choiceMode`, `voteMutability` and `pollVisibility` become single-select radio groups, replacing
three `<select>` elements. Labels are the stored values verbatim — no label map (FR-002).

| Page | Rendering |
|---|---|
| Edit (`/admin/poll`, poll never voted on) | Three radio groups |
| Update (`/admin/poll/update`, poll has votes) | All three as static read-only labels (FR-004) |

The update page renders all three as labels, which aligns the surface with the publish endpoint —
no field appears editable that the server would refuse to write.

### Voter count limit

| Visibility | Field |
|---|---|
| `PUBLIC POLL` | Disabled, visibly greyed, value cleared to blank |
| any private value | Enabled, blank by default, accepts an integer 1–500 |

Blank on a private poll means 500 (FR-008). Changing to public clears any stored value (FR-006);
changing away from public leaves the field empty rather than pre-filling 500 (FR-007). Invalid
entry is rejected as typed and again on save (FR-009).

### Save and Cancel

| Control | Rule |
|---|---|
| Save and Publish | Enabled iff the page is dirty. **The choices textarea feeds the same dirty flag as every other field** (FR-012). |
| Save Choices | **Removed** (FR-011). |
| Cancel | Enabled from page load, before any change (FR-015). Returns to the poll list, releases the editing session, and confirms first when the page is dirty (FR-016). |

Cancel is now the most likely way an editing session ends, so releasing the lock on the way out is
what keeps polls from sitting in `EDITING` until the stale-lock sweep reclaims them.

### Participant section

Rendered on **both** the editing page and the update page (FR-019a).

| Element | Shown when |
|---|---|
| Participant list, banned list, ban / un-ban | Every visibility value, both pages (FR-021) |
| Add-invited-participant row | Only the two `INVITATION ONLY` values — on the update page too, so late invitations remain possible (FR-020) |

Failure messages must render in an element visible for **every** visibility value — not the invite
row's error slot, which is hidden unless the poll is invitation-only. That hidden slot is why the
ban failure currently looks like nothing happening at all (FR-022).

All three actions send `clientGuid`.

---

## 3. Public poll card (`pollCard.js` / `pollGrid.js`)

### The one message

Exactly one string, used on the card face and on every refusal:

> **"This poll is momentarily unavailable to cast a vote. Please try again shortly."**

### Front face while a poll is being edited

The vote control and the live-results control are not rendered; the message takes their place
(FR-043). **The editing message takes precedence over the closed-poll message** for as long as the
poll is being edited; the closed message returns when editing ends (FR-042a).

### The four windows

| # | Trigger | Behaviour |
|---|---|---|
| W1 | Grid refreshes while the poll is being edited | Card forced to the front face, message shown |
| W2 | Visitor clicks Vote just after the poll enters editing | Message shown; the card does **not** turn over |
| W3 | Visitor submits from the back face | Message shown, nothing recorded, card turns to the front face |
| W4 | Poll enters editing between click and handler | Server refuses with `code: "POLL_EDITING"`; card shows the front face and the message |
| W5 | Poll returns to open | Next refresh restores the vote control **and the visitor's earlier selection** |

Summary rule, and the single invariant to test: *any visitor action on a card, or any refresh, with
the poll in `EDITING`, ends on the front face carrying the message* (FR-042).

### Selection preservation

The in-progress selection is held per card, independent of the flip state, so it survives a flip
the system forced and is restored at W5 (FR-045). This replaces the current keep-only-while-flipped
rule ([research R9](../research.md#r9--preserving-a-selection-across-a-forced-flip)).

### Grid membership

`GET /api/polls` is re-fetched every `ENV_POLLING_INTERVAL` and diffed by `pid`:

| Diff | Action |
|---|---|
| present, card exists | Update in place — keep flip state and selection (FR-049) |
| present, no card | Mount a card |
| absent, card exists | Unmount and stop its timer |

Cards render from the list payload; the per-card polling loop is removed
([research R8](../research.md#r8--grid-membership-polling-without-an-n--1)).

---

## 4. Header avatar menu (`app.js`)

When `GET /api/me` returns `isAdmin: true`:

```
Edit Profile
Poll Administration      ← new, links to /admin
Logout                   ← stays last
```

Absent entirely when `isAdmin` is false or missing — **not rendered-and-disabled** (FR-052).
Guests receive a 401 from `/api/me`, so the flag is absent and the entry never renders.
