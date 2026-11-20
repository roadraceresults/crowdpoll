# Overview: `specs/20261119-182343-DEEP-LINKS`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261119-182343-DEEP-LINKS` |
| Tweak file created | 2026-11-19 22:01 |
| Last updated | 2026-11-20 12:08 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Linked Poll's Card First After Minimize  
[X] Resolved  
[ ] Run Tests  
From quickstart step 2:  
```
Minimize each: that tab
   shows, with the poll's card first in it (L10).
```  

The poll's card isn't first in the tab after minimizing,  
but I didn't expect it to be first.  
It would be nice if it were though,  
for Home, Trending and Newest.    

### RECOMMENDATION

Today a linked poll closed on its tab is put first only when the tab's list does not hold it (`keptPid` in `src/public/tabs.js`, contract L10);  
a poll the list holds goes back to its place in the list.  
The change makes the linked poll's card first in both cases, until the tab's next server answer, as for the kept card today.  
A card maximized from the grid still returns to its own place.  

- **Option A** _(recommended)_: on every tab.  
  - <u>Pros</u>: one rule, the same for every tab, including the Search results and the lists you named.  
  - <u>Cons</u>: Your Polls, Your Votes and Watching also show it first, out of their own order, until their next refresh.  
- **Option B**: only on Home, Trending and Newest.  
  - <u>Pros</u>: exactly what you asked for;  
    the personal lists keep their order.  
  - <u>Cons</u>: two rules, and a per-tab setting in `createGrid`'s options.  

The change, for either option:  

- `src/public/tabs.js`, `createGrid`:  
  - `maximize` notes the landing's poll (`linkedPid`) when it is called with neither `fromCard` nor `viaHistory`, or for the kept card;  
  - `restore` puts that card first and sets `keptPid`, as it does for a retained card (a close by leaving the tab still removes an unlisted one);  
  - `keptCard()` no longer requires that the list lacks the poll;  
    `render` leaves the kept card out of the list's ordering, and `restore`'s position count does not count it twice.  
  - Option B only: the grids of Home, Trending and Newest pass `keepLinkedFirst: true`.  
- Tests (written, not run: Run Tests is not ticked):  
  - `tests/client-landing.test.ts`: a landing on a poll that Trending lists second;  
    Escape puts its card first with focus on its Maximize button;  
    a Watch keeps it first;  
    the next refresh returns it to second.  
  - Option B: a landing on Your Votes keeps the list's order.  
- Artifacts: `spec.md` FR-012, `contracts/links.md` L10, `research.md` R4, `tasks.md` (a new T048), `README.md` (Maximize bullet), `ARCHITECTURE.md` (the kept-card paragraph) and the `CLAUDE.md` decision line.  

2026-11-20 11:18  

### ACCEPTED RECOMMENDATION

Option A, accepted by "accept a": on every tab, the card of a poll a link opened is first in the grid once closed, whether or not the tab's list holds it, until the tab's next server answer.  

- `src/public/tabs.js`, `createGrid`:  
  - a new `linkedPid`, set by `maximize` for a landing (neither `fromCard` nor `viaHistory`) and for the kept card;  
    the kept card gets `retainedDetail`/`pinnedPid` only when the list lacks it;  
  - `restore` puts a linked card first as `keptPid`, unless the close left the tab, and clears `linkedPid`;  
  - `keptCard()` no longer requires the list to lack the poll;  
    `render` and `restore`'s position count leave `keptPid` out of the list's ordering.  
- `tests/client-landing.test.ts` (imports `newestSweep`):  
  - "puts a listed poll's card first when it closes, through a Watch, until the tab's next server answer" (Newest);  
  - "returns a card maximized from the grid to its own place".  
- Tests postponed (Run Tests not ticked): both new tests written, not run, so the tweak is unverified by a run;  
  `npx tsc --noEmit` passes.  
  The earlier landing tests whose poll the list already holds may now see it first; the next run will show it.  
- Artifacts: `spec.md` FR-012, `contracts/links.md` L10, `research.md` R4, `tasks.md` T048 (added), `README.md` (Share bullet), `ARCHITECTURE.md` (the kept-card paragraph), `CLAUDE.md` (the "Opening a link" decision line).  
  FR-012 now says "first card", a change to the requirement;  
  the requirements report's matching finding may need the same wording.  

2026-11-20 11:20  

## TWEAK02 Quickstart Manual Walk Passed  
[X] Resolved  
[ ] Run Tests  
 All manual tests from quickstart have passed

### RECOMMENDATION

The walk through `quickstart.md` steps 1–8 is task T043, the one task left open in `tasks.md`.  
Mark T043 `[X]`;  
no code, test or other artifact changes.  

2026-11-20 12:06  

### ACCEPTED RECOMMENDATION

Recommendation accepted automatically (a single recommendation): `tasks.md` T043 marked `[X]` on the developer's report that every manual quickstart step passed.  
No code changed, so no test was written or run: the walk itself is the check.  

2026-11-20 12:06  

## TWEAK03 Commit And Push The Branch  
[X] Resolved  
[ ] Run Tests  
commit and push, do not run full test suite, that will be done on the main branch after merging

### RECOMMENDATION

Commit every change on `deep-links` (the code, tests, documents, `.specify` records, `requirements/20261119-182343-deep-links/` and `specs/20261119-182343-DEEP-LINKS/`, this file included) as one commit, and push it to `origin/deep-links`.  
No test suite is run;  
the full suite runs on `main` after the merge.  

2026-11-20 12:08  

### ACCEPTED RECOMMENDATION

Recommendation accepted automatically (a single recommendation): the branch was committed as one commit "DEEP-LINKS: poll links name the tab, the address names the maximized poll, a Share button" and pushed to `origin/deep-links`.  
No test was written or run, as asked: the full suite runs on `main` after the merge.  

2026-11-20 12:08  

## TWEAK04 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  





