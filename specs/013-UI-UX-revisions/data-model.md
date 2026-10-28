# Phase 1 Data Model: UI/UX Revisions

**Feature**: 013-UI-UX-revisions | **Date**: 2026-09-07 | **Plan**: [plan.md](./plan.md)

## Persisted model: unchanged

This feature adds, removes and alters **no** MongoDB collection, field, index or validation rule.
No migration is required and no deploy-time data step exists.

Two existing shapes are read in a way they were not read before, and both are already on the wire:

| Existing shape | Where it comes from | What changes |
|---|---|---|
| `voted` (`emailAddress`, `userName`, `choiceIds`) | results endpoint | Now loaded for invitation-only polls too, where the client previously skipped the fetch |
| `notYetVoted` (`emailAddress`, `userName`) | results endpoint, invitation-only polls only | Newly *noticed*. Not consumed — see R11; it is the server's own reconciliation, and the invited list remains the row source |

The reconciliation that makes those two a partition happens on save in `service.ts:550-563` and is
also unchanged.

---

## Client-side structures

These live in browser memory for the life of a page. None is persisted; one leaves a transient
trace in `localStorage` that carries no personal data.

### Session snapshot

The parsed body of `GET /api/me`, or `null` for a 401. Owned by `app.js`, one per page.

| Field | Type | Notes |
|---|---|---|
| `userName` | string | Display name |
| `emailAddress` | string | Current address |
| `profileAvatar` | string | Avatar URL or absent |
| `status` | string | `pending` \| `active`. Cannot change within a session (R5) |
| `isAdmin` | boolean | A rendering hint only; every admin route re-checks server-side |

**Identity**: one snapshot per page. Every module reads it rather than fetching independently.

**Validation**: none applied client-side — the body is the server's, taken as given. A 401 is an
answer (`null`), not a failure; a network error is a failure and leaves the held value in place.

**Transitions**:

```
        load / adopt signed-in            401 on re-check, or adopted null
  null ──────────────────────────► signed-in ──────────────────────────► null
   │                                    │
   └── identical or failed: hold ───────┴── any field differs: adopt, re-render in place
```

Adoption re-renders and does not navigate, with two exceptions: a page whose only purpose is to
obtain a session goes home once one exists; a page requiring a session goes to sign-in once one
does not.

**Sources**, all of which are published to other windows except the last: page load;
`visibilitychange` to visible; `pageshow` with `persisted`; the page's own successful
`PATCH /api/me`; a successful sign-out (published as `null` before navigating); and a snapshot
*received* from another window, which is never re-published.

### Cross-window signal

| Transport | Payload | Lifetime |
|---|---|---|
| `BroadcastChannel("auth-state")` | The snapshot itself, or `null` | The page |
| `localStorage["authStateChangedAt"]` (fallback only) | A value differing from the last written — no session data | Removed when the session ends |

The fallback is write-and-notify only: no page reads the key to learn who is signed in.

### Participant row

Assembled per render in `adminPoll.js`. Not a server shape.

| Field | Source | Notes |
|---|---|---|
| `emailAddress` | invited list (draft state) | The row key, and the sort key |
| `userName` | `voted` entry, when present | Absent for an invited address that has not voted |
| `invited` | membership of the invited list | True on every row of an invitation-only poll |
| `voted` | membership of `voted` | Adds the second suffix |

**Row source by visibility**: invitation-only → the invited list held in the editor, including
unsaved invitations; link-only and public → `voted`.

**Rendering**: `emailAddress <userName>` where a name is known, then ` - Invited` and/or
` - Voted`. Sorted by code-point order on the lower-cased address.

**Excluded**: banned addresses. Banning removes the invitation and deletes the vote on save, so a
banned address is by construction neither invited nor a voter; the banned list renders it
separately, unlabelled, under the same sort.

### Verification result

Derived from the query string of a `/profile` request, never from a body.

| Value | Meaning |
|---|---|
| `changed=1` | The address was updated |
| `error=invalid-link` | The link was refused — expired, used, superseded, or the address is now in use |

Matched **exactly**; any other value is treated as absent (R9). Carries no address and no identity,
so it is meaningful with or without a session, and stays accurate when the browser holds a session
for a different account.
