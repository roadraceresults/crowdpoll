# Quickstart: Validating Admin Revisions

**Feature**: 012-ADMIN-REVISIONS | **Plan**: [plan.md](./plan.md)

A run guide, not an implementation guide. Every check below maps to a success criterion in
[spec.md](./spec.md); details live in [data-model.md](./data-model.md) and
[contracts/](./contracts/).

---

## Prerequisites

```powershell
npm install          # no new dependency is added by this feature
npm test             # full Vitest suite — no local MongoDB needed
npm run build        # tsc + copy src/public → dist/public
```

For the manual passes, start the dev server with the local launcher (git-ignored; regenerate from
`devScripts.example/launch-dev.ps1` if absent):

```powershell
.\devScripts\launch-dev.ps1        # sets every ENV_* and runs npm run dev
```

Then sign in at `http://localhost:9999` as an address listed in `ENV_ADMINS`.

> **Destructive step.** This feature ships no migration. Before the first run against any
> environment, drop both collections — `polls` and `voteHistory`. Documents carrying `accessMode`
> or `resultsVisibility` are not read and not converted; existing polls and vote history are
> **permanently lost**. This is authorised by the source requirements
> ([research R13](./research.md#r13--migration-or-the-absence-of-one)) but is irreversible, so
> confirm the target database before running it.

```javascript
// mongosh, against the target database
db.polls.drop(); db.voteHistory.drop();
```

---

## Automated checks

```powershell
npm test
```

The suites that carry this feature's evidence:

| Suite | Covers |
|---|---|
| `polls-admin-crud.test.ts` | visibility values, voter-limit rules, publish carrying `labels` |
| `polls-admin-participants.test.ts` | the three lock-aware participant routes |
| `polls-state-machine.test.ts` | OPEN / CLOSE / ARCHIVE guards and schedule writes |
| `polls-schedule-sweep.test.ts` | convergence — a manual state survives a sweep tick |
| `polls-discovery.test.ts` | conditional `EDITING` admission to the public listings |
| `polls-vote.test.ts` | `POLL_EDITING` refusal; voter limit across all four private values |
| `polls-service.test.ts` | `capabilitiesFor`, `isAdminEmail` |
| `profile.test.ts` | `isAdmin` on `/api/me` |
| `openapi-contract.test.ts` | `postman/openapi.json` matches the routes |

Model-collapse completeness is a grep, not a query — no document survives the deploy:

```powershell
# Both MUST return nothing.
Select-String -Path src\**\*.ts,src\public\*.js,src\public\*.html -Pattern 'accessMode'
Select-String -Path src\**\*.ts,src\public\*.js,src\public\*.html -Pattern 'resultsVisibility'
```

---

## Manual validation

### SC-001 — Participant moderation works (US1)

1. Create a poll, set visibility to `PRIVATE POLL - INVITATION ONLY - DO NOT SHOW WHO VOTED`,
   publish, and let it open.
2. Reopen it for editing. **Add a participant** → the address appears in the list, with **no**
   "currently being edited" message.
3. **Ban** a participant → they leave the participant list and appear in the banned list.
4. Repeat step 3 on a `PUBLIC POLL` that has a vote → the ban applies, and any failure message is
   **visible** (it must not land in the hidden invite-row error slot).
5. Open the same poll in a second tab, then act in the first (now stale) tab → refused with an
   explanatory message, poll unchanged.
6. On a poll that has votes (so it opens on the *update* page): the participant section is present
   and usable, and for an invitation-only poll the add-participant row is present too.
7. Un-ban someone who had been invited → they leave the banned list and do **not** reappear in the
   invited list; their earlier vote is not restored.

### SC-002 — One visibility setting, nothing silently rewritten (US2)

1. On a poll with no votes, confirm three radio groups (choice mode, vote mutability, poll
   visibility), all options visible without opening a menu.
2. Select each of the five visibility values in turn, save, reopen → the stored value is the one
   chosen, displayed with identical wording, and **no other setting changed**.
3. Set a private visibility and a limit of 25 → switch to `PUBLIC POLL` → the field is disabled,
   greyed, and blank.
4. Switch back to a private value → the field is enabled and **empty**, not pre-filled with 500.
5. On a poll with a vote, open the update page → all three render as static labels.

### SC-010 — The 500 ceiling holds by every path (US2)

1. Private poll, limit left **blank** → the 500th voter is accepted, the 501st refused.
2. Enter `501` → rejected as typed *and* rejected by the server if the client check is bypassed.

### SC-003 / SC-004 — One-click state control that sticks (US3)

1. Poll in `WAITING TO OPEN` → **Open** → state `OPEN`, `startAt` cleared.
2. Poll in `OPEN` → **Close** → state `CLOSED`, `endAt` = now.
3. Poll in `CLOSED` with a past `endAt` → **Open** → state `OPEN`, and `endAt` cleared, so the
   End column reads `does not end`.
4. **Wait past `ENV_POLL_DATE_CHECK_POLLING_INTERVAL` (60 s by default), then refresh.** Each poll
   is still in the state chosen. *This is the check that proves the schedule rules work; skipping
   the wait skips the point.*
5. Note a closed poll's End value, then **Archive** it → the End value is **unchanged** (SC-004).
   Confirm the JSON export carries the original date.
6. On any row, confirm all three buttons are rendered, with only the available ones enabled.

### SC-005 — One save action (US4)

1. Open a poll for editing, change **only** the choices → Save and Publish becomes enabled.
2. Save → the choices persist along with everything else.
3. Confirm no separate "Save Choices" control exists anywhere.
4. Force a rejection (for example, a title that fails validation) while the choices are also
   changed → **neither** is persisted.
5. Cancel is enabled immediately on page load; clicking it with unsaved changes prompts first, and
   the poll leaves `EDITING` at once rather than after the stale-lock timeout.

### SC-006 — The list reads at a glance (US5)

With polls in a spread of states, confirm: shading alternates once per poll regardless of row
height; the pen icon sits left of the title and both link to the right page (or are disabled and
plain for an archived poll); the subtitle sits directly beneath in smaller italics; a rejected poll
shows the bold screening line, with `[Re-attempt Screening]` only once attempts are exhausted;
empty dates read `started` and `does not end`; all four action icons render with tooltips, delete
greyed unless deletable and confirming before it destroys; the kebab still lists every action in
words.

### SC-007 — No vote lands against a poll being edited (US6)

Open the home grid as a signed-in voter in one browser, and the admin poll list in another.

1. Select choices on a card, leaving it turned over. In the admin browser, open that poll for
   editing.
2. **W3** — submit the vote → the message appears, nothing is recorded, and the card turns to its
   front face.
3. **W1** — with a different card left turned over and untouched, wait one refresh → it turns to
   its front face showing the message.
4. **W2** — click Vote on an editing poll immediately → the message appears and the card does not
   turn over.
5. Confirm the front face shows neither a Vote nor a Live Results control while editing.
6. **W5** — cancel the edit. At the next refresh the Vote control returns **and the earlier
   selection is still there**.
7. Put a **closed** poll into editing → the card shows the editing message, not the closed-poll
   message. End the edit → the closed message returns.
8. Put an `INITIALIZED` poll into editing → it stays absent from the grid, and `/?PID=` still
   returns not-found.

### SC-008 — The grid keeps itself current (US6)

1. With the grid open, publish and open a new public poll → its card appears within one polling
   interval, no reload.
2. Close a listed poll → its card leaves within one interval.
3. Watch the network panel: **one** `/api/polls` request per interval regardless of card count —
   not one per card.

### SC-009 — Administration reachable from the menu (US7)

1. Signed in as an `ENV_ADMINS` address → the avatar menu shows `Poll Administration` between
   `Edit Profile` and `Logout`, and it opens `/admin`.
2. Signed in as anyone else → the entry is **absent**, not disabled.
3. Signed out → absent.
4. Force `isAdmin: true` in devtools as a non-admin → the entry appears, and `/admin` still
   refuses with 403.
5. Add an admin address to `ENV_ADMINS` with odd casing and surrounding spaces, restart, sign in →
   still recognised.

---

## Done when

- `npm test` passes and `npm run build` is clean.
- Both greps for `accessMode` and `resultsVisibility` return nothing.
- Every SC pass above completes, including the timed wait in SC-003 step 4.
- `postman/openapi.json` matches [contracts/api-endpoints.md](./contracts/api-endpoints.md), as
  `openapi-contract.test.ts` asserts.
