# Quickstart: Field Length Limits

## Prerequisites

- Node ≥ 22 and the project's dependencies (`npm install`); the tests need nothing else (embedded PostgreSQL).
- For the manual checks, the local dev server (`devScripts/launch-dev.ps1`, from its `.example`) and a signed-in
  account that owns a poll.

## Automated checks

```
npx tsc --noEmit
npx vitest run tests/field-limits.test.ts            # browser copies equal the server's (research R5)
npx vitest run tests/polls-admin-crud.test.ts tests/polls-service.test.ts tests/polls-pending-update.test.ts
npx vitest run tests/add-choice.test.ts tests/client-add-choice.test.ts tests/client-admin-wizard.test.ts
npx vitest run tests/populate-poll.test.ts tests/migration-title-lengths.test.ts
npm test
```

Expected: all pass; `migration-title-lengths` passes unchanged.

## Manual checks

1. **Title and subtitle** ([C1](contracts/ui-contracts.md), [A2](contracts/api.md)): create a poll, type 61
   characters into the title and 41 into the subtitle; the 61st and 41st are not accepted. Publish.
2. **Views at 360 px** ([C5](contracts/ui-contracts.md)): in the browser's device mode at 360 px width, look at the
   poll card, the maximized card with its line graph, the admin card and a search for the poll; nothing runs past
   its card.
3. **New choices** ([C2](contracts/ui-contracts.md)): in a new poll's Choices box, paste a 50-character line; it is
   cut to 35 with "Choices are capped at 35 characters."
4. **Add Choice** ([C4](contracts/ui-contracts.md), [A3](contracts/api.md)): on an open poll that allows voters to
   add choices, the dialog's counter reads "0 / 35" and stops at 35.
5. **Stored long choice** ([C3](contracts/ui-contracts.md), [data-model](data-model.md)): with SQL, give a voted
   poll a 72-character choice label; open it in the wizard — the line shows whole; add a short line and save — the
   long choice keeps its votes. Open it again, type one character into the long line — it is cut to 35; leave
   without saving — the stored choice is unchanged.
6. **Config** ([A1](contracts/api.md)): `GET /api/config` has `choiceLabelMax: 35` and no `wizardChoiceMax`.
