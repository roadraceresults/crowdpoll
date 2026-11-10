# Quickstart: Who Voted Report

## Automated

```
npx tsc --noEmit
npx vitest run tests/who-voted-route.test.ts tests/client-who-voted.test.ts tests/m3-assets.test.ts tests/openapi-contract.test.ts tests/terms-gate.test.ts
npm test
```

Expected: all pass. The route test covers [A1](contracts/api.md) case by case; the client test covers
[C2–C3](contracts/ui-contracts.md).

## Manual (development server, PostgreSQL only)

1. Start the app (`devScripts/launch-dev.ps1`); lower `ENV_MAX_PRIVATE_POLL_VOTERS` if you want a small poll.
2. As a creator, make a **multiple-choice** private poll (*Anyone you send the link to*) with
   **Users can see who voted for what** on; publish it.
3. From three accounts (Alice, Bob, Carol) open the link and vote; Bob picks three choices.
   Shortcut for steps 2–3: `npm run populate-test-poll` makes such a poll for `devadmin01@crowdpoll.vote` with ten
   voters and random picks (`devScripts/populate/test-poll.json`; see `README-populate-poll-and-seed-poll.md`).
4. As Alice, maximize the poll. Expect: `Who voted` under the notes (or at the top), above the line graph;
   Sort by Voter selected; Alice, Bob, Carol in order; Bob's group three lines, name once; banding per group.
5. Select **Sort by Choice**. Expect: groups in the bar order, a choice nobody picked absent, voters A→Z.
6. Turn Live Results on; vote as a fourth account. Expect: the bars move, then the table gains the voter within a few
   seconds; Sort by Choice stays selected.
7. Close and reopen the maximized view. Expect: Sort by Voter selected again.
8. Repeat step 4 on an anonymous private poll and on a public poll. Expect: no panel; in DevTools no
   `/voters` request for the public poll and a `404` for the anonymous one, not repeated on later count changes.
9. Narrow the window to phone width. Expect: card, Notes, Who voted, line graph, one under another; no inner scroll.
10. Switch to dark mode and use a screen reader on a line of Bob's group. Expect: legible banding; "Bob" announced.
11. Hover a date. Expect: the full date and time in your time zone.
