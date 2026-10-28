# Quickstart: validating Home Page Tabs

## Prerequisites
`npm install`; `npm test` runs on embedded PostgreSQL, no services needed. For a browser run, use
`devScripts/launch-dev.ps1`; lower `ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW` and raise
`ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW` so sign-in testing is not blocked. Two accounts: A (creator, holds
`Create Poll` + `View Polls`) and B (plain user).

## Automated
```
npm run build && tsc --noEmit
npm test
```
Expected: all suites green, including the new files in `research.md` R12 and `openapi-contract.test.ts`.

## Manual scenarios (map to the spec's user stories)

1. **Story 4 — tab bar.** Signed out: eight tabs in order, Trending active; Your Polls prompts sign-in.
2. **Story 1 — guest link.** As A, publish a private Anyone With The Link poll and copy its link. Signed out, open it:
   lands on `/login?PID=…` with the "shared with you" line. Request a link for B's *new* address, open the emailed
   link in a *different* browser: after sign-in the poll is shown maximized over Shared With You.
3. **Story 1 — notices.** Open an unknown id, an Archived poll's link, and an Invitation Only link as an uninvited
   user: all land on `/` with "That poll isn't available." Open a public draft's link: same notice.
4. **Story 2.** B's Shared With You lists the poll; open the link again later and it moves to the top. Invite B to an
   Invitation Only poll: it appears with no link opened. Remove B from the list: it leaves; re-invite: it returns first.
5. **Story 3.** A copies the link of an unpublished poll. B opens it: message + placeholder with "Shared by A's name"
   and no content (check the network response). Publish: next refresh shows the card.
6. **Story 5.** A's Your Polls lists public and private polls newest first with states; the rejected one shows its
   reason and no vote control. B sees none of A's unlaunched polls anywhere.
7. **Story 6.** Vote in a public poll: it is in Your Votes, not Watching. Watch a poll from Shared With You: it is in
   both tabs; Stop watching leaves it in Shared With You. Remove B's access: it leaves Watching; restore: it returns.
   A direct `POST /api/polls/<pid>/bookmark` for an unreachable private poll answers `404`.
8. **Wording.** Search the UI for "My " and "Me": none. Tooltips and empty states match `contracts/ui-contracts.md`.

References: `contracts/api.md`, `contracts/ui-contracts.md`, `data-model.md`.
