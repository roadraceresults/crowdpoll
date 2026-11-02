# Quickstart: Voters Add Choices

## Prerequisites

- Local PostgreSQL and `devScripts/launch-dev.ps1`; `npm run dev`. Migration `015-voters-add-choices` runs at start-up.
- Two browsers (or one normal and one private window): **Creator** and **Voter**, each signed in.
- For a quick ceiling check, start with `ENV_MAX_CHOICES=5`.
- In development the live vote counters live in the server's memory and are written to the poll row every 10 s. A
  restart of `npm run dev` (`tsx watch` restarts on every server file change) can drop the counts of votes cast in the
  10 s before it: the card's front and the Edit Poll Card's Voter Count then disagree with the results page, and the
  voting side may show a choice count with no voter total (TWEAK03). Repair: stop the server, `npm run reconcile`, start
  it again.

## Automated

```
npx vitest run tests/add-choice.test.ts tests/client-add-choice.test.ts
npm test
npx tsc --noEmit
```

## Scenarios

1. **Off by default (US3, SC-006)**: open any existing Private poll as Voter → no Add Choice button.
2. **Turn it on (US3)**: as Creator, Edit Poll Card → How → `Voters may add choices` on → Publish/Save. As Voter, the
   button appears on the voting face, centred between the back arrow and `Submit vote` (C1). On a Public poll the
   switch is absent.
3. **Add (US1)**: Voter → Add Choice → dialog with `0 / 40`, focus in the field → type `Tacos` → Enter. The dialog
   closes, `Tacos` is last and unselected, earlier selections kept. Select it and Submit vote at once → accepted
   (Q2, A1's own bucket). Creator's tab shows `Tacos` after its next refresh.
4. **Refusals (US2, SC-003)**: try `   ` (Save disabled), 41 characters (field stops at 40), `tacos` (duplicate), a
   pasted text with a tab or U+200B, a deny-listed term → each message under the field, text kept, nothing added
   (contracts A1).
5. **Full poll (Edge Cases)**: with `ENV_MAX_CHOICES=5` and 5 choices, press Add Choice → message, no dialog.
6. **States (FR-003)**: Creator opens the Edit Poll Card (edit session) → Voter's Save answers `The poll's choices are
   being edited. Try again shortly.`; close the card → the next Save succeeds.
7. **Final vote (UA2)**: on a Final-Vote poll, Voter votes → the button disappears; Creator keeps it after voting.
8. **Added by (US5, Q1)**: on a non-anonymous poll, Creator's Step 3 shows `Added by <Voter's name>`; on an anonymous
   poll nothing is shown and the stored choice has no `addedBy` (check `polls.choices` in psql).
9. **Creator's save keeps it (US4, R10)**: Creator saves an unrelated change after Voter's addition → `Tacos` and its
   vote remain.
10. **Account deletion (US5)**: Voter deletes their account → the choice stays, `addedBy` is gone.
