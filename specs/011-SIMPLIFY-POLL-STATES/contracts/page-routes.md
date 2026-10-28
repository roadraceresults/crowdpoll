# Contract: Page Routes

**Feature**: `011-SIMPLIFY-POLL-STATES` | **Date**: 2026-08-28

## Routes

| Route | Page | Guard | Change |
|---|---|---|---|
| `/admin` | Poll list | `requireAdmin` | Adds interval refresh, a rejection-reason column, state-driven action menus |
| `/admin/poll?PID=` | Full edit | `requireAdmin` + never-voted-on + state eligible | Autosave replaced by explicit publish; session and heartbeat added |
| `/admin/poll/update?PID=` | Reduced update | `requireAdmin` + has-been-voted-on + state eligible | **New route** |
| `/admin/poll/results?PID=` | Results | `requireAdmin` | Unchanged |

## Access rules

Both editing routes are refused unless the poll's state is outside `EDITING`, `AWAITING APPROVAL`
and `ARCHIVED`, and the vote history matches the route:

| Condition | `/admin/poll` | `/admin/poll/update` |
|---|---|---|
| Never voted on | **granted** | redirect to `/admin/poll` |
| Has ever been voted on | redirect to `/admin/poll/update` | **granted** |
| State is `EDITING` | refused — locked | refused — locked |
| State is `AWAITING APPROVAL` | refused | refused |
| State is `ARCHIVED` | refused | refused |

Redirecting rather than refusing when the wrong route is requested means an administrator following a
stale bookmark, or a link from before the poll's first vote, lands on the right page instead of an
error.

**The page guard is a convenience, not the enforcement.** The session endpoint re-checks every
condition server-side and makes no change when it refuses (FR-019). A page that loads is not
permission to edit; the granted session is.

## Refusal behaviour

A refused page redirects to `/admin` carrying a reason the list renders as a message:

- locked → "This poll is currently being edited. Please try again shortly."
- awaiting approval → "This poll is awaiting approval and cannot be edited."
- archived → "This poll is archived and cannot be changed."

## Session lifecycle on the editing pages

1. **On load** — generate a fresh identifier for this tab, then request a session. A refusal
   redirects to `/admin` with the message above. **A new identifier on every load is deliberate**: it
   is what makes a refresh, a second tab, or a reconnect fail to reclaim the lock (FR-023).
2. **While open** — heartbeat at the configured interval. On any non-alive answer, stop the
   heartbeat, show a message, navigate to `/admin`, and write nothing.
3. **On clean exit** — release the session. On publish, the publish endpoint clears the session
   fields itself, so no separate release is sent.
4. **On abrupt loss** — nothing is sent. The stale-lock sweep restores the poll within twice the
   heartbeat interval plus one sweep interval (FR-022, SC-005).
