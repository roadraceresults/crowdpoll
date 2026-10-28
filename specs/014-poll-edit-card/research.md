# Phase 0 Research: Poll Edit Card

Eleven decisions. Each records what was chosen, why, and what was rejected. No
`[NEEDS CLARIFICATION]` items remained from the specification, so nothing here resolves an unknown —
these are the design choices the implementation would otherwise have to make ad hoc.

---

## R1 — Where the card lives

**Decision**: two client modules. `adminList.js` keeps the list: loading, the periodic refresh, the
actions menu, the create control, and the page-local editing latch. A new `adminCard.js` owns one
card: rendering both forms, the draft, the editing session, the choices editor and the two roster
sections. `adminList.js` depends on `adminCard.js`; the dependency does not run the other way.

**Rationale**: the two existing files total roughly 1,400 lines and all of it survives in some form.
One module would be the largest file in the project by a wide margin and would mix two lifetimes — the
page's and one card's. The split falls on the natural seam: the list owns *which* cards exist, the card
owns *what one card does*. Constitution Principle V asks for single-purpose modules, and this is the
only division that gives each file one purpose.

**Alternatives considered**: a single `adminList.js` carrying everything — rejected on size and on
mixing the two lifetimes. A module per concern (session, draft, roster, choices) — rejected as
speculative decomposition under Principle II; those pieces have exactly one consumer each.

---

## R2 — The list response, and where the roster cap is enforced

**Decision**: `GET /api/admin/polls` gains seven fields — `voteCount`, `invitationCount`,
`bannedVoterCount`, `choices`, `choiceMode`, `voteMutability`, `voterCountLimit`. The roster size cap
is enforced in two places: `buildAdminPollDetail()` in `pollsApi.ts`, and the
`GET /api/admin/polls/:pid/results` handler.

**Rationale**: the list handler already loads whole documents (`find({}).sort({ createdAt: -1 })`, no
MongoDB projection) and already runs one `voteHistory.distinct` for the whole page, so all seven fields
are in memory — widening the response costs payload only. For the cap, `buildAdminPollDetail()` is the
single shaper behind five endpoints (`edit-session`, both outcomes of `publish`,
`GET /api/admin/polls/:pid`, `PATCH /api/admin/polls/:pid`), so one edit there covers all five and any
endpoint later built on it.

**Alternatives considered**: capping only the two endpoints the card reads — rejected because `publish`
and `PATCH` return the same rosters to the same browser, and the publish response arrives immediately
after saving a card that may hold a large list. Capping the export endpoints too — rejected: an export
exists to hand over what the screen withholds, and one that silently dropped `participants` would
produce a file that looked complete. `export.md` carries no roster at all and needs no change.

---

## R3 — Order of operations for the constant rename

**Decision**: rename in two passes. First the declarations in `store.ts` — `POLL_VISIBILITIES`,
`ChoiceMode`, `VoteMutability` — and let `tsc` enumerate every typed use across `src/` and `tests/`.
Then, separately and by explicit enumeration, the untyped occurrences the compiler cannot see: string
literals in `admin.html`, `pollCard.js`, `postman/openapi.json`, and any test that compares against a
literal rather than the exported constant.

**Rationale**: roughly 180 occurrences across 20 files is too many to hold in working memory, and a
half-applied rename produces a system that compiles and misbehaves. Splitting compiler-visible from
compiler-invisible turns most of the work into a task the toolchain drives, leaving a short explicit
list for the rest.

**Two sites fail silently rather than loudly**, and both need a test that would catch them:

- `src/public/pollCard.js:1123` — `poll.choiceMode === 'SINGLE-CHOICE-POLL'` decides whether picking a
  choice deselects the previous one. This is the only voter-facing site. A miss turns a single-choice
  poll into a multiple-choice one with no error anywhere.
- `isInvitationOnly()` in `store.ts` is a **substring** test (`v.includes("INVITATION ONLY")`), not an
  equality test. It survives only if the substring is re-cased to `"Invitation Only"`. A miss makes
  every invitation-only poll behave as though it were not one, which changes who may vote.

**Alternatives considered**: a compatibility layer accepting both spellings — rejected outright; it is
the code-to-label mapping the requirements exist to prevent, and it would make the old values
permanent.

---

## R4 — Disposing of incompatible stored data

**Decision**: drop the `polls` and `voteHistory` collections as a release step. Leave `user`,
`session`, `verification` and `email_change_requests` untouched.

**Rationale**: the renamed values are stored verbatim, so every existing poll document holds three
invalid values. The failure is silent — `isPublicVisibility()` returns false, `isInvitationOnly()`'s
substring misses, `homeGridFilter` matches nothing, and pre-existing polls quietly vanish from the home
grid rather than erroring. `voteHistory` holds none of the renamed constants but references polls by
`pid`, so it is orphaned once `polls` is emptied. The auth collections contain no renamed value; dropping
them would destroy every account for a change that does not touch them.

Deployment is by autodeploy from `dev`, so there is no later moment at which this decision is revisited.

**Alternatives considered**: a rename migration (five `updateMany` calls) — a legitimate option,
rejected because the project's Exclusions section states the model is still evolving and old poll data
is disposable. Dropping "all collections" as the requirements originally read — rejected as far broader
than the rename requires.

---

## R5 — The editing latch and the refresh exemption

**Decision**: `adminList.js` holds a module-level `editingPid` (null or one poll id). While it is set,
every other card's pen control is disabled and the create control is disabled. The periodic refresh
continues, but for the editing poll it neither replaces the DOM node nor reads that poll's row from the
response.

**Rationale**: both halves are needed and each fails alone. Not re-rendering protects the draft — the
current `loadList()` ends in `body.replaceChildren(...)` and would discard the text being typed, the
caret, the focus, and both sections' expansion and page state. Ignoring the row is needed because a poll
being edited is in `EDITING`, so its row returns with every capability flag false; a card repainted from
it would render as a locked poll with everything greyed.

**Alternatives considered**: suspending the refresh entirely while editing — rejected, because the
sweeps drive most state changes here and freezing the list for the length of an edit is the staleness the
refresh exists to prevent. Rebuild-and-restore — rejected as more fragile: the choices box runs input
through a sanitiser, and replaying a saved value through it is where this goes subtly wrong.

---

## R6 — Focus management across a mode change

**Decision**: entering editing form moves focus to the title field. Leaving it — by save, by cancel, or
by a lost session — returns focus to that card's pen control.

**Rationale**: FR-047 requires focus not be lost to the top of the page, and a mode change replaces the
DOM the user's focus was sitting in, so focus *will* be lost unless it is placed deliberately. Returning
to the pen is the element the user came from and the one they would use to re-enter, so it also gives
the keyboard user somewhere sensible to continue from after an involuntary exit.

**Alternatives considered**: focusing the card container — rejected as it gives a screen-reader user no
starting point inside the form. Leaving focus where the browser puts it — that is the defect FR-047
exists to prevent.

---

## R7 — Roster pagination

**Decision**: client-side slicing over the arrays already held. Each section keeps its own page index,
independent of the other section and of every other card. `GET /api/admin/polls/:pid/results` is fetched
once per editing session, on the first expansion of either section, and reused thereafter.

**Rationale**: the lists are already in the browser — the invited and banned lists arrive with the
edit-session response, and the voted set is one request. Both are bounded at 500 entries by the cap, so
slicing is trivial and no server paging is warranted. Fetching once per session rather than per expansion
avoids re-fetching on every collapse and re-expand.

**Alternatives considered**: server-side paging — rejected as unnecessary work against a bounded list.
Re-fetching per expansion — rejected as needless traffic with no correctness benefit; a ban applied in
the same session is a local edit and would be undone by a re-fetch.

---

## R8 — The choices editor

**Decision**: port `sanitizeChoicesText()` and its wiring from `adminPoll.js` unchanged, including the
caret arithmetic, the blank-line rule, the per-line and line-count caps, and the select-the-defaults
behaviour on first focus.

**Rationale**: this code is load-bearing and hard-won — it was ported once already from
`designDocs/smart-textbox.html` and carries fixes from 006 and 012. It has test coverage that will move
with it. Rewriting it while also relocating it would confound two changes in one diff, against
Principle III.

**Alternatives considered**: simplifying it during the move — rejected; if it needs simplifying that is
its own change with its own verification.

---

## R9 — Test impact

**Decision**: treat the suites in three groups.

| Group | Suites | Action |
|---|---|---|
| Break on deleted files | `poll-card-assets.test.ts`, `polls-editing-eligibility.test.ts` | 13 `readFileSync` assertions name `adminPoll.js`/`admin-poll.html`; three assert the `/admin/poll` ↔ `/admin/poll/update` redirect. Rewrite against the card, or delete where the behaviour is gone |
| Break on renamed constants | `poll-fixtures.ts`, `polls-admin-crud`, `polls-vote`, `polls-service`, `polls-discovery`, `polls-admin-participants`, `polls-state-machine`, `polls-editing-lock`, `polls-screening`, `openapi-contract` | Mechanical. Prefer importing the exported constant over repeating a literal, so the next rename is compiler-driven |
| New coverage required | — | The list response's seven new fields; the roster cap at, below and above the ceiling; the count definitions, especially `voteCount` against a poll with unused invitations; the two silent-failure sites from R3 |

**Rationale**: the fixtures file is the highest-leverage edit — most literals reach the suites through
it.

---

## R10 — API contract

**Decision**: update `postman/openapi.json` in the same commit as each server change:
`GET /api/admin/polls` (seven fields), `GET /api/config` (`participantsViewportSize`), the five
enumerations carrying the renamed values, and a note on the roster responses that may return an empty
array.

**Rationale**: `openapi-contract.test.ts` guards this, and CLAUDE.md states the contract is used to
generate docs and client SDKs. Deferring it produces a failing suite and a contract that lies.

---

## R11 — Comment policy for the ported code

**Decision**: code written or moved for this feature carries no comments that explain what the code
does, record history, or cite requirement, feature or task identifiers. Comments are used only to point
at external documentation. Pre-existing comments in files being modified are corrected only inside the
regions being changed for another reason — they are not swept.

**Rationale**: constitution v1.1.0 Principle VI, with the scope clause from its Governance section.
This matters more here than in most features because the code being ported from `adminPoll.js` carries
`012 T053 (FR-015):`-style comments on nearly every function, and moving a function is exactly the
moment its comment would otherwise travel with it.

**Also from the constitution**: rosters contain email addresses, and Principle V forbids logging
sensitive information to the browser console. No roster content, no invited or banned address, and no
participant email may be logged client-side.

**Alternatives considered**: sweeping all pre-existing comments to match the new principle — rejected;
Principle III forbids exactly that kind of unrelated edit, and the Governance scope clause says so
explicitly.
