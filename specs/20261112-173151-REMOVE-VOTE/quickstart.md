# Quickstart: Remove Vote

## Automated

```
npx tsc --noEmit
npx vitest run tests/polls-vote.test.ts tests/votes-path.test.ts
npx vitest run tests/tabs-your-votes.test.ts tests/line-graph-tally.test.ts tests/who-voted-route.test.ts
npx vitest run tests/client-remove-vote.test.ts tests/client-home.test.ts tests/poll-card-assets.test.ts
npm test
```

## Manual (development server, two accounts: a creator and a voter)

1. **The button** (C1): as the creator, publish a public **Dynamic-Vote**, single-choice poll with choices A and B. As
   the voter, press **Vote**, pick A, **Submit vote**. Press Vote again: A is selected; click A to un-set it. The button
   stays enabled and reads **Remove vote**. Click B: it reads **Submit vote** again. Click B to un-set it: **Remove vote**.
2. **The widths** (C3): with the ballot open, compare the back button's width while it says "Submit vote" and "Remove
   vote": it does not move. Flip back: the front **Vote** button is the same width as the back button was.
3. **The removal** (C2, A2): click **Remove vote**. The card flips to its results: A shows one fewer, the total one fewer,
   "You voted" is gone, the notice says *Your vote was removed.*; the Vote button is held for a few seconds. Open the
   Your Votes tab: the poll is gone (refresh if it is still there). Open the ballot again: nothing is selected, the button
   is disabled.
4. **Vote again** (FR-014): pick B, Submit vote: the total is back up by one, "You voted" returns, Your Votes lists the
   poll.
5. **Who Voted** (C4): as the creator, open the poll's Who Voted report before and after step 3: the voter is listed,
   then not, then listed again after step 4. On a private Invitation Only poll, the removed voter counts as *not yet
   voted*.
6. **Multiple choice** (FR-006): on a Dynamic-Vote multiple-choice poll, vote A and B; open the ballot, un-set A: the
   button still reads **Submit votes** and submitting records B alone; un-set B too: **Remove vote**.
7. **No vote held** (FR-003): as a third account that never voted, open the ballot and leave nothing selected: the button
   is disabled and reads Submit vote.
8. **Final-Vote** (FR-009): on a Final-Vote poll the voter voted on, the Vote button is not offered. In the browser
   console, `fetch('/api/polls/<pid>/vote', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{"choiceIds":[]}'}).then(r => r.json()).then(console.log)`
   answers 409 "You have already voted on this poll and cannot change your vote."
9. **Editing** (FR-010): as the creator, put an open Dynamic-Vote poll the voter voted on into editing (open its editor
   and change the title without publishing). As the voter, open the ballot, un-set the choice, click **Remove vote**: the
   poll serves its pre-edit state, so the removal goes through as a vote would. On a poll that was closed before the
   edit, the same click is refused with the closed message and the vote still counts.
10. **Line graph** (FR-011): on a Dynamic-Vote poll with the line graph on, remove a vote and open the maximized card: the
    next point shows the lower count and the lower voter line.
11. **Double removal** (edge case): open the same poll in two tabs with the ballot open and empty in both; click Remove
    vote in each. The first succeeds; the second shows "Select at least one choice." and the counts moved once.

## Documentation

`README.md` (Vote bullet) and `ARCHITECTURE.md` (The vote path, Cache keys) describe the removal (R8).
