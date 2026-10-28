# Data Model: Poll Choices Editor

No new fields, collections, or indexes. This feature changes *how* an existing field
(`Poll.choices`) is edited — one bulk replace instead of three per-choice operations — and,
as a direct consequence (research.md R1), changes how aggressively `Poll.currentVotes` gets
reset when that happens.

## Poll (existing — `src/polls/store.ts`)

Fields relevant to this feature (unchanged shape):

| Field | Type | Relevance to this feature |
|---|---|---|
| `choices` | `Choice[]` | FR-001/002/006: entirely replaced (active portion only — see below) by `replaceChoices()` on every "Save Choices" |
| `currentVotes` | `VoteEntry[]` | FR-007: every entry with a non-empty `choiceIds` is reset (`choiceIds: []`, `removed: true`) on every "Save Choices" — not just entries tied to a specifically-removed choice (research.md R1) |

## Choice (existing — `src/polls/store.ts`)

```ts
interface Choice {
  id: string;
  label: string;
  position: number;
  removed: boolean;
}
```

No shape change. What changes is how instances of it are produced:

- **Before this feature**: `addChoice()` appended one; `editChoiceLabel()` mutated one
  in place (same `id`, same `position`); `removeChoice()` either spliced one out (no votes)
  or flipped it to `removed: true` (had votes) — the entity's `id` was stable across an
  admin's edits unless the choice was literally deleted.
- **After this feature**: `replaceChoices(poll, labels)` discards every currently-active
  `Choice` and constructs an entirely new one per surviving label — fresh `id`
  (`randomUUID()`), `position` = its index in the saved list, `removed: false`. An existing
  choice's `id` never survives a save, even when its `label` text is unchanged (research.md
  R1) — active-choice identity is not a concept this feature preserves.
- Choices already `removed: true` from before this feature (or from a poll never edited
  with the new box) are left exactly as they are — `replaceChoices()` only ever touches the
  active subset (`!removed`), per FR-008.

## `replaceChoices(poll, labels)` (new — `src/polls/service.ts`)

Signature: `replaceChoices(poll: Poll, labels: unknown): Choice[]` — mirrors the existing
`addChoice(poll)`/`editChoiceLabel(poll, choiceId, label)` pattern (mutates `poll.choices`
and `poll.currentVotes` in place, returns the new active `Choice[]`; the caller —
`pollsApi.ts` — persists via `$set`).

**Validation** (throws `AdminError`, same status/message conventions as the functions it
replaces):

1. `labels` MUST be an array; each element, once trimmed, that is non-empty is kept
   (mirrors the client's own blank-line stripping — FR-010 — but re-validated server-side,
   never trusting client sanitization alone, consistent with every other field on this
   route).
2. Cleaned list length MUST be within `[MIN_CHOICES, MAX_CHOICES]` (2–50) → `400` if not
   (FR-004).
3. Every cleaned label MUST be `≤ CHOICE_LABEL_MAX` (100) chars → `400` if not (FR-004).
4. No two cleaned labels MUST be identical → `409` if a duplicate exists (FR-005).

**Effect**:

1. Existing active choices (`!removed`) are dropped; existing removed choices
   (`removed: true`) are kept as-is (FR-008).
2. One fresh `Choice` is built per cleaned label, in order (`position` = array index).
3. `poll.choices` becomes `[...freshActiveChoices, ...previouslyRemovedChoices]`.
4. Every `poll.currentVotes` entry with `choiceIds.length > 0` is reset: `choiceIds = []`,
   `removed = true` — the same shape `removeChoice()` already left a *singly*-affected voter
   in, applied here to every voter with any current vote (FR-007, research.md R1).

## Removed (superseded by `replaceChoices`)

- `addChoice(poll)`, `editChoiceLabel(poll, choiceId, label)`, `removeChoice(poll,
  choiceId)`, `markChoiceRemoved(choice)` — deleted from `src/polls/service.ts`
  (research.md R2). No other caller exists.
