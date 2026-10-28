# Quickstart: validating Admin Search, Material 3

## Prerequisites
`npm install`. The automated checks need nothing else. For a browser run use `devScripts/launch-dev.ps1` and
sign in as an administrator (`ENV_ADMINS`).

## Automated
```
npm run build && npx tsc --noEmit
npx vitest run tests/m3-assets.test.ts tests/admin-search-assets.test.ts tests/client-admin-search.test.ts \
  tests/client-tabs-026.test.ts tests/client-home.test.ts
npm test
```
Expected: green, with the suite count above the 904 passing before this feature.

## Manual scenarios (map to the spec's stories)
1. **US1.** On `/admin` choose Search. At a wide window the panel is exactly as wide as a card, centred under
   the tabs; narrow the window to 320 px: it fills the width with no sideways scroll; compare corners, border,
   shadow and padding with a card at each size. Newest, Awaiting Approval and Rejected show no panel.
2. **US2.** Every field shows a visible label, worded as in C3 (for example "Created on", "Vote count", "Banned users count", none cut off); the order matches `contracts/ui-contracts.md` C3; Created, Starts,
   Ends, Votes, Invited and Banned pair operator and value side by side, stacking under 320 px; run a search with
   a state and a text and confirm the same polls as before; at a 320px window the Search view has no sideways scroll.
3. **Radio groups.** Visibility, choice mode and vote mutability are each one row of three radios with Any
   chosen; pick Public, Single Choice and First vote is final, run a search and confirm only matching polls
   return; press Clear and confirm each group is back on Any. No More filters control is shown.
4. **US3.** Trigger "Only the newest 200 polls are shown…", "No polls match." and an error: each is
   centred supporting text; a screen reader announces each change.
5. **Created By.** On a read-only card the first lines of the dates panel read Created By, Created, Launched, with
   Created By as `<username> (<email>)`; a seeded poll with no creator shows no Created By line; the same card in a
   search result matches. Before any search the Search view shows no message, and the form contains no stray text
   such as "div>".
6. **Collapse.** Above the panel a **Collapse Search** button collapses it and reads **Expand Search**; run a search
   with results and the panel collapses by itself; a search with no results leaves it open; expand it and wait for
   the list's refresh: it stays expanded. After a search collapses the panel, click Newest and then **Search**, and
   click **Search** again while collapsed: each time the panel opens.
7. **Edge.** A creator who is not an administrator sees
   no Search view, no panel and no button.

References: `contracts/ui-contracts.md`, `data-model.md`.
