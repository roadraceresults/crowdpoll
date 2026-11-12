# Quickstart: Admin Search Checkboxes

Validation scenarios; the contracts are [contracts/api.md](contracts/api.md) and [contracts/ui.md](contracts/ui.md),
the data in [data-model.md](data-model.md).

## Automated

```
npx vitest run tests/search-admin.test.ts tests/client-admin-search.test.ts tests/openapi-contract.test.ts tests/m3-assets.test.ts
npx tsc --noEmit
```

## Manual (development server, signed in as an administrator)

1. Have at least: one poll with the line graph on, one with a hand-picked color on one choice, one with neither
   (`npm run populate-all-polls` gives line-graph polls; set a color in a poll's View step).
2. Open `/admin`, the Search view: the row "Line graph enabled" / "Custom colors set" sits under the vote mode radios,
   both unticked.
3. Tick "Line graph enabled", Search: only line-graph polls are listed. Untick it, tick "Custom colors set", Search:
   only polls with a picked color. Tick both: only polls with both.
4. Tick a box together with "First vote is final": only polls meeting both.
5. Click Clear: both boxes are unticked and the results are emptied.
6. Narrow the window below 360 px: the two checkboxes stack. Tab to them: each shows a focus ring; Space ticks it.
7. `GET /api/admin/polls/search?lineGraphEnabled=false` → `400` with the error message.
