# Overview: `specs/20261112-191252-SEMANTIC-COLOR-WORDS`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261112-191252-SEMANTIC-COLOR-WORDS` |
| Tweak file created | 2026-11-12 22:06 |
| Last updated | 2026-11-12 22:10 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Trending And Newest Served From The App  
[X] Resolved  
[ ] Run Tests  
In production the Trending tab showed nothing: the pages fetch `trending-counts.json` and `trending.json` from the Spaces CDN (`trendingBaseUrl` in `/api/config`), a cross-origin read the browser blocks without an `Access-Control-Allow-Origin` header.  
A CORS rule on the bucket (infra/spaces.tf) fixes the bucket, but the CDN caches one copy whatever the request's `Origin`, so a copy cached from a request without `Origin` (a crawler, `curl`) still lacks the header, for up to an hour on `trending.json`.  
Option (a), chosen by the developer: the pages read TRENDING and Newest from the app's own origin, `/api/trending`, which needs no CORS, also when Spaces is configured.  

### RECOMMENDATION

- `src/routes/api.ts`: `/api/config` sends `trendingBaseUrl: "/api/trending"` always, not the CDN address when Spaces is configured.  
  `assetsBaseUrl` keeps the CDN (scripts, styles and images load without CORS).  
- Leave the publisher alone: the sweeps still put the four objects in Spaces, so pointing the pages back at the CDN stays a one-line change.  
- The instances already serve the four objects (`/api/trending/*.json`, ETag and 304, the same `max-age`, the page-load bucket), so no route changes.  
- `infra/spaces.tf`: keep the applied CORS rule, with its comment saying the pages no longer depend on it.  
- Test, in `tests/trending.test.ts`: a context with `ENV_SPACES_*` set still answers `/api/config` with `trendingBaseUrl` `/api/trending` and `assetsBaseUrl` on the CDN (written; the run is postponed, as `Run Tests` is not ticked).  
- Documentation: `ARCHITECTURE.md` (the deployment and refresh diagrams, the load table, the max-age paragraph and the TRENDING diagram) and the `trendingBaseUrl` and listing-route descriptions in `postman/openapi.json`.  
- The cost: each Trending or Newest refresh is now an instance request (a cache read, or a 304) within the page-load bucket, instead of a CDN request.  
- This feature's `spec.md`, `plan.md` and `tasks.md` are not about listings and need no change.  

2026-11-12 22:08  

### ACCEPTED RECOMMENDATION

- `src/routes/api.ts`: `/api/config` sends `trendingBaseUrl: "/api/trending"` always.  
  `assetsBaseUrl` still names the CDN when Spaces is configured.  
  The sweeps still publish the four objects to Spaces.  
- `tests/trending.test.ts`: new test "points the pages at the app's own /api/trending, while assets still load from the CDN", in a context with `ENV_SPACES_*` set.  
  Tests postponed (Run Tests not ticked); the new test was written but not run.  
  `npx tsc --noEmit` passes.  
- `infra/spaces.tf`: the CORS rule's comment now says the pages read the objects from the app.  
  The rule itself stays (already applied).  
- `ARCHITECTURE.md`: the deployment diagram (browser → CDN for assets and avatars only), the refresh diagram (Trending / Newest → `tabsApi`), the load table row, the `max-age` paragraph, the TRENDING diagram and the Newest paragraph.  
- `postman/openapi.json`: the `trendingBaseUrl` description and the four listing-route descriptions.  
- This feature's `spec.md`, `plan.md` and `tasks.md`: no change needed (they are not about listings).  
- The change reaches production only with the next `npm run deploy`.  

2026-11-12 22:10  

## TWEAK02 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  
