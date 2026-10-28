# Quickstart: validating Manual Bar Colors

A run guide that proves the feature end to end. It uses the contracts in [contracts/api.md](contracts/api.md) and [contracts/ui-contracts.md](contracts/ui-contracts.md); it does not repeat them. Commands are for a Bash-compatible shell (Git Bash on Windows).

## Prerequisites

- Node 22 or later and the repository's dependencies: `npm ci`.
- A running server for the manual scenarios: `npm run dev` with the `ENV_*` settings from `devScripts/launch-dev.ps1` (or `./devScripts/launch-dev.ps1`), signed in as an administrator (an address in `ENV_ADMINS`).
- The automated checks need nothing running; they use the embedded database.

## 1. Automated checks

```bash
npx vitest run tests/bar-palette.test.ts tests/polls-colors.test.ts tests/client-bar-colours.test.ts tests/client-admin-wizard.test.ts tests/polls-admin-wizard.test.ts tests/openapi-contract.test.ts tests/refresh-deltas.test.ts
npm test
```

Expect every suite green. The first command starts the project's embedded PostgreSQL once, so allow a minute; `npm test` must finish with no failure and the earlier files unchanged in count.

## 2. Colour a new poll (US1, US2)

1. Open `/admin`, press **Create New Poll**, answer steps 1 to 3 with the choices `Republican` and `Democratic`.
2. Press Next: the step is `Step 4 · Colors`, the circle row shows six circles, both choices read **Automatic** with an empty ring.
3. Press Republican's button: a grid opens with **Automatic** and 18 named swatches, four to a row. Choose **red**: the grid closes, focus is on the button, the dot is red and the name reads red. Choose **blue** for Democratic. Time this step from opening the Colors step to leaving it: under 30 seconds with a pointer, under 60 with the keyboard alone (SC-001).
4. Press Next through How and When, then Publish. When the poll is approved and open, vote in it from the home page and open the results: the Republican bar is red and the Democratic bar blue, with legible text in light and dark mode.
5. Open a poll that has no colours: its bars look exactly as before.

## 3. The automatic colours do not move (US2)

On a poll of five choices with no colours, note the five bar colours. Give only the **top** choice a colour and republish: the other four bars keep their colours. Repeat with a choice that reads as yes or no.

## 4. After votes (US3)

1. On a poll that has votes, press its pen: the circles show `Colors` open and `Choices` locked.
2. Change one colour and press Save. Expect the card to return at once, the poll back in the state it had (`OPEN`), no review (the state never reads `AWAITING APPROVAL`), and the colour on the bar after the next refresh. Voting works again immediately.
3. Change a colour **and** the title: the poll is published as for any change.
4. Try the same on a closed poll: accepted.

## 5. The picker (US4)

- With the keyboard only: Tab to a colour button, Enter opens the grid, arrow keys, Home and End move, Space chooses, Escape closes with focus back on the button.
- With a screen reader: a swatch is announced with its colour's name and whether it is chosen.
- Switch the system to dark mode: black and gainsboro swatches still show an outline.
- On a 320 px wide window the grid fits without scrolling sideways.
- Open Colors on a poll with no choices yet: the step shows the one-line "Add your choices first, then come back to choose their colors." and no buttons.

## 6. Colours follow labels (US5)

Set red on `Republican`. In step 3 reorder the lines: red stays with Republican in step 4. Rename the line: the colour is gone. Remove it: gone. Duplicate a coloured poll from its actions menu: the copy has the same colours.

## 7. Contract and refusals

```bash
curl -s -X POST http://localhost:8080/api/admin/polls/<pid>/colors -H "Content-Type: application/json" \
  -b "<session cookie>" -d '{"clientGuid":"nope","colors":["#F91010",null]}'
```

Expect `409` without the session, `404` for a signed-in user who is not the creator, `400` for a list of the wrong length and for `"#123456"` (not in the palette), and `200 {"pollState": ..., "choices": [...]}` with the right guid. `npm test` includes these cases.

## 8. Clean up

Delete the polls you created from `/admin` (Delete Poll). No file or setting was changed by these steps.
