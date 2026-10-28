# Contract: UI Behaviour

**Feature**: `011-SIMPLIFY-POLL-STATES` | **Date**: 2026-08-28

## Editing and updating pages

### Controls, in this order, at the top left below the header

`Back Arrow` · `Save and Publish` · `Cancel`

Both `Save and Publish` and `Cancel` start **disabled** and enable on the first change to any field
(FR-013). There is no autosave: nothing reaches the server until publish (FR-012).

### Field availability

| Field | Full edit | Update |
|---|---|---|
| Title, subtitle | editable | editable |
| Start, end | editable | editable |
| Choices | editable — saved list replaces stored list | **not shown** |
| Access mode, mechanics, invited list, voter limit | editable | **not shown** |
| Participant list, banned voter list | editable | **editable** |

**Participants are split deliberately.** The invited list is poll configuration and follows FR-009,
so the update surface hides it. Removing and banning a voter is *moderation*, not editing, and is
needed precisely when a poll has votes — hiding it there would make banning impossible in the only
case that matters. Both actions are refused while a poll is `EDITING`, `AWAITING APPROVAL` or
`ARCHIVED`: the first two are locked or in flight, and an archived poll's history must not change.

The update page also prevents a start later than an end (FR-047), as does the full edit page.

### Rejection reason

When the poll is `REJECTED`, its reason is shown at the top of both pages (FR-030).

### Exit routes — all four warn (FR-014)

| Route | Mechanism |
|---|---|
| `Cancel` or `Back Arrow` | In-application dialog: "Any edits will be lost. Continue?" — `No` returns to editing with changes intact; `Yes` discards and returns to `/admin` |
| Browser back button | Browser's unsaved-changes prompt, armed by a history entry pushed on first edit |
| Tab or window close | Browser's unsaved-changes prompt |
| Navigating to another URL | Browser's unsaved-changes prompt |

Returning to `/admin` uses in-application navigation, never browser history (FR-016).

Discarding writes no field change and restores the stashed state (FR-015).

## Poll list

### Refresh

Re-fetches at the configured interval and re-renders **changed rows in place** — never a full page
reload, never a list rebuild. Scroll position and any open action menu survive a refresh (FR-048,
SC-010).

### Columns

State (verbatim, as stored — FR-005) · waiting time, shown while `AWAITING APPROVAL` and derived
from the approval timestamp (FR-032) · rejection reason, shown for **every** poll that has one
regardless of state (FR-030).

### Action menu, per state

| State | Edit Poll | Update Poll | Delete Poll | Re-screen | Archive |
|---|---|---|---|---|---|
| `INITIALIZED` | ✓¹ | — | ✓ | — | — |
| `EDITING` | — | — | — | — | — |
| `AWAITING APPROVAL` | — | — | — | — | — |
| `REJECTED` | ✓¹ | ✓¹ | ✓ | ✓² | — |
| `WAITING TO OPEN` | ✓¹ | ✓¹ | — | — | — |
| `OPEN` | ✓¹ | ✓¹ | — | — | — |
| `CLOSED` | ✓¹ | ✓¹ | — | — | ✓ |
| `ARCHIVED` | — | — | ✓ | — | — |

¹ Exactly one of Edit or Update is offered, chosen by whether the poll has ever been voted on —
never both.
² Only once attempts have reached the maximum (FR-040).

For `INITIALIZED`, every action other than Edit and Delete is disabled (FR-054). For `ARCHIVED`,
neither Edit nor Update appears at all (FR-052).

The menu renders from the server-supplied `canEdit` / `canUpdate` / `canDelete` / `canRescreen`
booleans rather than re-deriving these rules client-side.

### Delete confirmation

"Are you sure you want to delete this poll?" — destructive, and offered only for the three states
above (FR-053).

## Public surfaces

A poll appears in public listings only when its state is `WAITING TO OPEN`, `OPEN` or `CLOSED`
(FR-003).

Listing visibility is **not** the vote gate. A poll card reached from an already-open page or a
direct link still submits to an endpoint that refuses unless the state is exactly `OPEN`, and the
card shows "This poll is not open for voting." on refusal (FR-004).

State wording shown to voters is the stored value verbatim; friendlier wording is a later feature.
