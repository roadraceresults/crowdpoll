# Research: Poll Choices Editor

## R1 — Save Choices as a full-replace endpoint, and its vote-clearing consequence

**Decision**: Replace the three existing per-choice admin endpoints —
`POST /api/admin/polls/:pid/choices` (add one), `PATCH
/api/admin/polls/:pid/choices/:choiceId` (edit one label), `DELETE
/api/admin/polls/:pid/choices/:choiceId` (remove one) — with a single
`PUT /api/admin/polls/:pid/choices` that takes the full list of labels and replaces the
poll's entire *active* choice set in one call, per spec.md FR-006. A new pure function,
`replaceChoices(poll, labels)` in `src/polls/service.ts`, alongside the existing
`addChoice()`/`editChoiceLabel()`/`removeChoice()` it supersedes:

1. Validates `labels` is an array of strings; trims each, drops blanks.
2. Enforces `MIN_CHOICES`/`MAX_CHOICES`/`CHOICE_LABEL_MAX` against the cleaned list
   (same constants, same error messages as today — FR-004).
3. Rejects a list containing two identical (post-trim) labels (FR-005).
4. Builds a fresh `Choice[]` — new `id` via `randomUUID()`, `position` = array index,
   `removed: false` — for every surviving/edited/new label. **Every choice gets a new id on
   every save, including one whose label text is byte-identical to before** — this is the
   direct, unavoidable consequence of spec.md FR-006's resolved decision ("no attempt to
   preserve an existing choice's identity... because its line was edited, reordered, or
   removed" — there is no case where a line "wasn't touched," from the function's point of
   view, because it receives only the final flat list, not a diff).
5. Preserves any *already*-removed (`removed: true`) choices already on the poll, unchanged
   and untouched, per FR-008 — `poll.choices` becomes `[...newActiveChoices,
   ...previouslyRemovedChoices]`.
6. **Every `currentVotes` entry with a non-empty `choiceIds` is reset** — `choiceIds: []`,
   `removed: true` — mirroring the exact pattern `removeChoice()` already uses for a single
   voter whose sole vote was on the choice being removed. Under full-replace this pattern
   applies unconditionally to every vote, not just ones tied to a specifically-deleted line,
   because no previous choice id survives a save (FR-007). Every voter is left "not yet
   voted" and can vote again immediately.

**Rationale**: This is the literal, load-bearing consequence of the reconciliation strategy
chosen in `/speckit-specify` (spec.md FR-006, "Full replace, no reconciliation" — selected
over two alternatives that would have kept an unchanged choice's id/votes by matching on
position or on exact label text). It was explained in those terms before being chosen, but
is restated here in full because it is easy to under-read from the spec's prose alone: **any
click of "Save Choices," even one that only fixes a typo in a single line, clears every
current vote on the poll.** This is a materially different (and more aggressive) behavior
than today's single-choice "Remove," which only resets voters affected by the *one* choice
being removed and leaves everyone else's vote untouched. No confirmation step is introduced
(spec.md Edge Cases already rules this out) — the save proceeds directly.

**Alternatives considered** (both already weighed and rejected during `/speckit-specify`,
recorded here only because a plan-phase implementer needs the *reason* they're not being
built, not just that they weren't chosen):
- *Position-based matching* (line N = the Nth existing active choice; an edited line renames
  that choice in place, preserving its id/votes). Would have scoped vote-clearing to only
  the specific line(s) genuinely removed. Rejected: the user's explicit choice was to match
  the reference component's own behavior exactly, which has no position-identity concept at
  all — every save is a fresh array.
- *Label-based matching* (a line matching an existing active choice's exact text keeps that
  choice's id/votes, regardless of new position). Would have preserved votes for any
  unchanged wording even across a save. Rejected for the same reason.

**Consequence carried into data-model.md/tasks.md**: because this diverges sharply from the
prior single-choice behavior, the existing `MongoDB` update for this route must `$set` both
`choices` and `currentVotes` in the same call (matching the existing DELETE
`/choices/:choiceId` route's pattern) — a save is only meaningful if both are updated
atomically together.

## R2 — Removing the three per-choice endpoints and their service functions

**Decision**: `addChoice()`, `editChoiceLabel()`, and `removeChoice()` (and
`markChoiceRemoved()`, which only `removeChoice()` called) are deleted from
`src/polls/service.ts`, along with their three routes in `src/routes/pollsApi.ts` and their
`postman/openapi.json` entries. Their existing tests in `tests/polls-admin-crud.test.ts`
(add-choice, edit-choice, single-remove/soft-remove, and the 409-at-cap/floor cases) are
replaced by equivalent tests against the new `PUT /choices` endpoint.

**Rationale**: The admin UI is these functions' only caller (grep confirms no other route,
script, or test fixture depends on them beyond the routes and tests being replaced in the
same change) — spec.md FR-001 explicitly retires the "Remove" buttons and "+ Add Choice"
button they backed. Leaving them in place after the client stops calling them would be
orphaned code the project's own conventions (constitution.md Principle III, "remove orphaned
... code your change creates") direct against keeping. `markChoiceRemoved()` becomes unused
the moment `removeChoice()` is deleted, since no other caller marks a choice removed anymore
(new removals happen via `replaceChoices()`'s full-array replace, which never marks a choice
`removed: true` — that state now only exists as history from before this feature, FR-008).

**Alternatives considered**:
- *Keep the three endpoints alongside the new one, unused by the shipped UI but available
  for some hypothetical future/API caller.* Rejected — no such caller exists or is asked
  for; speculative surface area the constitution's Simplicity First principle rules out
  ("No features beyond what was asked").

## R3 — Porting the reference component's client-side behavior

**Decision**: Port `designDocs/smart-textbox.html`'s `sanitize()`/`lineStartAt()`/
`isBlank()`/`currentLines()`/`refresh()` functions and its `keydown`/`input`/`blur` event
wiring into `src/public/adminPoll.js` nearly verbatim (same algorithm, same constants —
`MAX_CHOICES=50`, `MIN_CHOICES=2`, `CHOICE_LABEL_MAX=100`, which already match this app's
existing server-side limits exactly), adapted to:
- Read from `document.getElementById("choicesBox")` etc. instead of the reference's
  hardcoded ids, following `adminPoll.js`'s existing per-field wiring-function convention
  (`wireVoterCountLimitField()`, `wireSelectField()`, etc.).
- Seed (`populate()`) from `poll.choices.filter(c => !c.removed).sort((a,b) =>
  a.position - b.position).map(c => c.label)` instead of a local `savedChoices` array.
- Replace the reference's messaging no-op (`function say(message, isSuccess) {}`) with
  writes to the page's existing `#choiceError` element — the same element the old
  add/edit/remove-choice handlers already used for feedback (spec.md Assumptions).
- Replace the reference's `document.dispatchEvent(new CustomEvent("choices:saved", ...))`
  with a `fetch` `PUT` to the new endpoint (R1), followed by the existing `load()` re-fetch
  pattern every other successful action on this page already uses to resync the whole form.

**Rationale**: FR-001 asks for the reference component to be ported, not redesigned; the
sanitize-while-typing algorithm is the entire substance of User Story 2 and has no
project-specific logic worth rewriting from scratch. Keeping it structurally close to the
source is also what makes `designDocs/smart-textbox.html` a useful reference to diff against
later, rather than a one-time inspiration that immediately diverges.

**Alternatives considered**:
- *Rewrite the sanitize logic against the existing `renderChoices()`/per-`<li>` DOM
  structure instead of a single `<textarea>`.* Rejected — contradicts FR-001's explicit
  instruction to replace the row-per-choice structure with the reference's single text box.
- *Port the reference's own placeholder-seeding fallback* (pads a stored list below
  `MIN_CHOICES` with `"Enter the poll choices here"` / `"Choice N"` placeholder lines).
  Omitted: this app's polls can never legitimately have fewer than 2 active choices when the
  editor loads (`createDefaultPoll()` always creates exactly 2; every choice-removing path,
  old or new, enforces the same floor — R1/R2), so the fallback can never trigger. Porting
  unreachable code contradicts Simplicity First ("no error handling for impossible
  scenarios").

## R4 — Styling: reuse existing page rules, add only what's missing

**Decision**: The Choices section stays inside its existing `<section class="admin-field
admin-field--tight">` wrapper (`005-admin-page-improvements`), so the new `<textarea
id="choicesBox">` automatically inherits the page's standard textarea styling (border,
padding, font, background — `admin.css`'s existing `.admin-field textarea, .admin-field
input, .admin-field select` rule) with no new CSS needed for the box's base appearance. New,
minimal `admin.css` additions cover only what that shared rule doesn't already provide: a
side-by-side textarea+gutter layout, a taller box (multi-line content needs more room than
the shared `min-height:44px`), and the small muted hint/count text. The "Save Choices"
button reuses the page's existing `.btn-header-ghost` class (already used for "+ Add
Choice," "Ban from Voting," "Un-ban," etc.) instead of the reference component's own button
styling.

**Rationale**: Directly satisfies FR-014 ("match the poll editor page's existing look...
rather than the reference implementation's own styling") with the smallest possible diff —
reusing already-shared rules is both less code and a guarantee of visual consistency that
hand-matching colors/fonts one property at a time can't offer.

**Alternatives considered**:
- *Port `smart-textbox.html`'s `<style>` block as-is (scoped to the Choices section).*
  Rejected — directly contradicts FR-014; would visually clash with the rest of the page
  (different font stack, border color, border-radius, focus ring).

## Out of scope / no change

- **Voter-facing pages** (`pollCard.js`, the public poll view): unaffected. `replaceChoices`
  produces the same `Choice` shape (`id`/`label`/`position`/`removed`) `computeResults()`
  and the voter-facing card already consume; nothing there needs to know how the choice list
  was edited.
- **`resultsVisibility`/`accessMode`/`voterCountLimit`** and every other poll field: untouched
  by this feature, no interaction with `005-admin-page-improvements`'s work on them.
