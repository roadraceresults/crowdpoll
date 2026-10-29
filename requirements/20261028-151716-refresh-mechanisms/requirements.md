Start a new spec for these requirements called `20261028-151716-REFRESH-MECHANISMS`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

This is a Research Request requirement.  

The developers of the CrowdPoll webapp are having a difficult time determining the logic around the various Refreshes:
- the background swepps that are done on a schedule
- the Refresh button that the user can click on demand

Please generate the architecture around these refresh mechanisms.  

Explain the load impact various refresh mechanisms have on the system.  
Explain what clicking the Refresh button does and how it differs from the background sweeps.  
What are the limit on what the Refresh button does for the user. 
## Research Results and Decisions

Recorded from `requirements-report.md` (accepted 2026-10-28).  

- **The refresh mechanisms (RS1).**  
  There are five: the server sweeps, the vote path and its consumer, the Refresh button, the implicit refreshes the user causes (a tab click when the tab's copy is older than the manual floor or empty, returning to the window, a bookmark change in this or another window), and the Live Results timer.  
  Sweeps write on a schedule on one instance per tick;  
  the browser-initiated refreshes read through one version-keyed delta protocol;  
  they are joined only through stored data (the cache, PostgreSQL, the CDN objects and the search index).  
- **The load model (RS2), at the default settings.**  
  The fleet budget is 1,250 dynamic requests per second per live instance, capped at 15,000 (5,000 at 4 instances, 15,000 at 12).  
  Sweeps are a fixed background cost that does not grow with visitors.  
  Live Results is the largest variable cost: 0.5 requests per second per open, visible, non-idle tab, from the cache alone (10,000 active tabs use the whole 4-instance budget).  
  A personal-tab refresh is one indexed PostgreSQL query plus cache reads, at most a burst of 5 then 0.2 per second per visitor;  
  Search refreshes answer from the 10 s search cache or one engine query;  
  Trending and Newest refreshes go to the CDN and cost the fleet nothing in production.  
  Over budget the controller stretches search, then manual refresh (up to 8×), then Live Results, never votes.  
- **What Refresh does, and how it differs from the sweeps (RS3).**  
  Refresh sends what the tab holds and receives only what moved (`304`, counters, cards or a new order);  
  it only reads what the sweeps and the vote path have already produced;  
  it never runs a sweep, and a sweep never pushes to a browser.  
- **The limits of Refresh (RS4), as both rate limits and freshness limits (AM3).**  
  How often: a burst of 5 then one per 5 s per session (per address for a guest), shared by every refresh-kind request of the session across its windows;  
  stretched up to 40 s under load;  
  `429 too-soon` or `503 busy` with `retryAfterMs`;  
  120 page loads per minute on the instance-served Trending and Newest objects;  
  no Refresh on Live Results, which refreshes itself.  
  How fresh: counts are always live;  
  Trending and Newest are never newer than their last publish (up to 60 s plus 60 s of CDN `max-age`);  
  Search is cached for 10 s and the index lags by up to 15 s;  
  Your Votes waits for the vote consumer;  
  scheduled starts and ends wait for the schedule sweep (up to 60 s);  
  at most 200 polls per tab (Newest 50);  
  the personal tabs need a signed-in session with `View Polls`.  
- **Units of the load explanation (UA1).**  
  Load is explained per request and per visitor at the default settings, with the fleet budget at 4 and at 12 instances, naming the setting that bounds each mechanism.  
- **Glossary (RS5).**  
  - *Overlay call*: `GET /api/me/polls?pids=…`, a signed-in viewer's own state (voted, choices, watching, may watch) on the shared cards of Trending, Newest and Live Results; a refresh-kind request.  
  - *Personal tab*: Your Polls, Shared With You, Your Votes and Watching, whose lists depend on the signed-in viewer.  
  - *Fleet*: all the web instances running at a moment (4 to 12), sharing one PostgreSQL, Valkey, OpenSearch and CDN.  
  - *Stretch multiplier* (`k`): a per-kind whole number ≥ 1 set every second by the budget controller; the browser waits `floor × k`; `k:search` and `k:refresh` stop at `ENV_MAX_STRETCH` (8), `k:live` has no cap.  
  - *Shedding*: one overloaded instance refusing requests at once with `503 busy`, search first and votes last.  
  - *Dirty poll*: a poll whose live counters a vote has moved since they were last written to its row; flushed within 2 s, and recounted from `votes` the following night.  
- **Ordering between intervals (RS6).**  
  The counter flush and the screening sweep are independent: different data, their own timers and locks, and `loadConfig` does not compare them.  
  The only enforced interval rules are `ENV_BUDGET_CONTROLLER_INTERVAL` ≤ the smallest floor and `ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL` ≥ 1000;  
  `ENV_MIN_MANUAL_REFRESH_INTERVAL` ≥ `ENV_COUNTER_FLUSH_INTERVAL` is stated in `CLAUDE.md` only, and breaking it changes nothing a tab shows.  
- **The interval settings (RS7).**  
  Sweeps: `ENV_BUDGET_CONTROLLER_INTERVAL` (1000), `ENV_COUNTER_FLUSH_INTERVAL` (2000), `ENV_POLL_APPROVAL_POLLING_INTERVAL` (5000), `ENV_OUTBOX_DRAIN_INTERVAL` (15000), 2 × `ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL` (20000), `ENV_POLL_DATE_CHECK_POLLING_INTERVAL` (60000), `ENV_TRENDING_POLLS_RECOMPUTE_INTERVAL` and `ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL` (60000);  
  the invitation sweep (`INVITATION_SWEEP_INTERVAL_MS`, 5000) and the three daily sweeps (`DAY_MS`) have no setting.  
  Refreshes: `ENV_MIN_MANUAL_REFRESH_INTERVAL` (5000, burst `ENV_MANUAL_REFRESH_BURST` 5), `ENV_MIN_LIVE_REFRESH_INTERVAL` (2000), `ENV_MIN_SEARCH_INTERVAL` (2000, burst `ENV_SEARCH_BURST` 3), `ENV_MIN_VOTE_INTERVAL` (2000), stretched up to `ENV_MAX_STRETCH` (8).  
  Also bounding what a refresh shows: `ENV_SEARCH_CACHE_TTL` (10000), `ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL` (5000), `ENV_MAX_IDLE_TIME` (1800000), `ENV_SHED_RETRY_AFTER` (2000).  
- **What "the Refresh button" covers (AM1).**  
  The button and every implicit refresh that spends the same bucket: a tab click with a stale copy, a return to the window, and a bookmark change.  
- **What counts as a "background sweep" (AM2).**  
  The twelve server sweeps; the vote consumer and the Live Results timer are explained beside them as the other two things that run without a click.  

## Scope and Changes to Make

- **Scope (IN1, NC1).**  
  This feature is no longer research only.  
  It delivers: the documentation (this report, and `ARCHITECTURE.md`'s *Refresh model* and *Sweeps* sections updated with the five mechanisms, the load table, the freshness limits and the TD2 correction);  
  the RS8 and RS9 changes below;  
  and the technical-debt fixes below (AM5).  
- **Technical-debt fixes (AM5).**  
  - **TD1, the stretched interval is advisory only:** `floors.ts` takes tokens at `floor × k` (`budget.nextRefreshMs(kind)`) instead of `config.floors[kind]`, so a client that ignores `nextRefreshMs` is held to the stretched interval; browsers that obey it see no difference. It needs a load test of its own.  
  - **TD2, `ARCHITECTURE.md` says only Live Results refreshes on its own:** corrected in the documentation above.  
  - **TD3, the Trending and Newest floor is browser-only:** not changed; recorded in `ARCHITECTURE.md` as by design, since the objects come from the CDN.  
  - **TD4, refreshing Shared With You writes:** `adoptInvitations` and `markAccepted` run only when the per-user tab version (UA2) shows a change, or its key is missing.  
  - **TD5, the floors are shorter than the data:** on Trending and Newest the Refresh button stays disabled until the copy is older than the CDN `max-age` (10 s, UA5); Search keeps its 10 s cache; no floor setting changes.  
- **Sweep intervals (RS8, AM4).**  
  `counterFlushSweep` 2 s → 10 s: the `ENV_COUNTER_FLUSH_INTERVAL` code default, `.do/app.yaml`, `launch.json.example`, `devScripts.example/launch-dev.ps1`, and every document that states 2 s (`CLAUDE.md`, `README.md`, `ARCHITECTURE.md`).  
  `invitationSweep` 5 s → 30 s: the constant `INVITATION_SWEEP_INTERVAL_MS`, no new setting.  
  `outboxDrainSweep` stays at 15 s; the other sweeps are unchanged.  
- **The manual-floor rule (IN2).**  
  The sentence "Must not be below `ENV_COUNTER_FLUSH_INTERVAL`" is removed from `CLAUDE.md`'s `ENV_MIN_MANUAL_REFRESH_INTERVAL` row; `loadConfig` gains no check.  
- **Refresh improvements (RS9).** Server push (Server-Sent Events or WebSockets) is not in scope.  
  1. **Per-user tab version (UA2).**  
     A per-user relations version in the cache (`tabs:v:<emailKey>`), deleted after commit at every `user_polls` write and every ban or invitation change for that email key.  
     A personal-tab refresh reads it plus the cached projections' `contentVersion`s for the user's listed polls; when all match what the browser holds, it answers from the live counts alone, without touching PostgreSQL.  
     A missing key means "changed" (a full answer).  
  2. **Projection writes (UA3).**  
     The routes write only the projections missing from the cache or stale (cached content version differs from the poll's), found with one multi-key read and written in one pipelined call; the store's writes stay as they are.  
  3. **Live Results back-off (UA4).**  
     The wait doubles after each `304` from `nextRefreshMs` up to 10 s, never below `nextRefreshMs`;  
     any `200`, a vote, an add or remove in the tab, and the page becoming visible (`visibilitychange`) reset it to `nextRefreshMs`;  
     no server change.  
  4. **CDN `max-age` (UA5).**  
     Trending and Newest are published with `max-age` = the smaller of the recompute interval and 10 s, a constant in `publish.ts`;  
     the browser copy keeps its lifetime (the recompute interval);  
     the two settings' descriptions are updated.  
  5. **The Refresh button's wait (UA6).**  
     While the button is disabled, its tooltip reads "Refresh available in N s", updated each second while shown; nothing else changes visibly.  

## Additional Requirements (2026-10-28 4:15 PM)

Research request — questions related to terminology:  
1. what is the "overlay call"?  
2. what is the "personal tab"?  
3. what is the "fleet".  
4. what is the "stretch multiplier"?  
5. what is "shedding"?  
6. what makes a poll dirty? regarding: "yesterday's dirty polls recounted from votes"  

## Additional Requirements (2026-10-28 6:34 PM)

Question 1 : Is it true that the counterFlushSweep interval must be lower than pollsAwaitingApprovalSweep interval?  

Question 2: Please provide the ENV_ variable names that define the intevals.  

## Additional Requirements (2026-10-28 7:08 PM)

Question: in your opinion, which sweeps could be less frequent and not be noticeable to the user?  

## Additional Requirements (2026-10-28 7:17 PM)

Question: can the Refreshes be improved to cause less load and not be so noticeably slow for the user?  

## Additional Requirements (2026-10-28 8:56 PM)

Implement RS8 and RS9.  
