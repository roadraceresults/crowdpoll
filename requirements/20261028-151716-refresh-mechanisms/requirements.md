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
