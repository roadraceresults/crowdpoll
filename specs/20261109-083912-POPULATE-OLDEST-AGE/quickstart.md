# Quickstart: Populate Oldest Age

## Prerequisites

- A migrated development database named by `ENV_DATABASE_URL`, and the server's other `ENV_*` variables.
- The account `devadmin01@crowdpoll.vote` (the creator in the sample data files).

## Automated checks

```
npx vitest run tests/populate-poll.test.ts
npx tsc --noEmit
```

## Manual checks

1. **A limit that drops points.** Copy `polldata/france-president-emmanuel-macrons-approval-rating.json` to a scratch
   folder, add `"oldest_age_in_days": 30`, and run `npm run populate-poll <copy>`.
   Expect `[populate] Kept 31 of … data points (oldest_age_in_days 30)` after the `Target:` line, 31 dated vote lines
   from today − 30 days to today, and no 12-month note. The poll's line graph starts 30 days ago.
2. **No limit.** Run the original file. Expect no kept-points line and a replay from 2017 (moved), as before.
3. **Refusals** (contract D2). Set the key to `-1`, `2.5`, `"30"` and `null` in turn. Expect the error line, exit
   status 1, and no change to the poll.
4. **Folder run.** Populate the scratch folder with `npm run populate-all-polls <folder>`, change the limit in the copy,
   and run it again. Expect only that file to be repopulated.
