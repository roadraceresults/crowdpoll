Start a new spec for these requirements called `20261103-120521-HOME-TAB`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

Add a Tab Bar item for a new tab called "Home".
The icon will be created from the icon below:  
![home icon](home-icon.jpg)

The Avatar menu will also include a new menu item for the Home tab page.  
This item will be added to the menu as the first item.  

The Polls that populate the Home page are according to the following rules:

1. Up to 10 polls that have are "Shared With You", but not launched more than 2 months ago, and not closed more than 1 week ago.  
2. Up to 10 polls that the user has created but launched more than 2 months ago, and not closed more than 1 week ago, and havent' already been included by the previous rules.  
3. Up to 10 polls that the user has participated in but not launched more than 2 months ago, and not closed more than 1 week ago, and havent' already been included by the previous rules.  
4. all the polls the user is "Watching", but not launched more than 2 months ago, and not closed more than 1 week ago, and havent' already been included by the previous rules.  
5. Up to 10 polls that are trending, and havent' already been included by the previous rules.  

This only needs to be refreshed periodically, rather than in real-time, to reduce server load.  
The period could be every two hours. (or specified by a new environment variable ENV_HOME_TAB_REFRESH_INTERVAL, or if a sweep ENV_HOMETAB_SWEEP_INTERVAL)

First, do the research to determine how this can be done efficiently without excessive load on the server.  
If this can't be done efficiently, consider alternative approaches such as caching or precomputing the poll lists.  

Create new Findings if the research yields any questions that need to be answered by the development team.  
Additionally, document any assumptions made during the research and any potential trade-offs identified.  

After the research questions are resolved,  
begin the implementation of the efficient mechanism for populating the Home tab with polls according to the rules specified above.  
Ensure that the implementation respects the refresh interval and any caching or precomputation strategies identified during the research.  

The deliverable of this feature culminated with the successful implementation of the Home tab.

## Decisions

Recorded by `/speckit-requirements` from the findings in `requirements-report.md`, 2026-11-03.  

- **RS1 (mechanism)**: Home is built on demand, per user, and cached for the interval.  
  Rules 1–4 come from one grouped query over `user_polls` (index `(email, updated_at desc)`) joined to `polls`;  
  rule 5 reads the cached TRENDING listing (`listing:trending:cards`), with no database read.  
  The ordered list is cached in Valkey as `home:<emailKey>`, with the `tabs:v:<emailKey>` list version it was built under, TTL = the interval;  
  it is rebuilt when missing, expired, or when the list version changed.  
  No sweep, advisory lock or new table.  
- **IN1 (rule 2)**: rule 2 reads "Up to 10 polls the user has created, not launched more than 2 months ago and not closed more than 1 week ago, not already included", the same window as rules 1, 3 and 4.  
- **IN2 (setting)**: `ENV_HOME_TAB_REFRESH_INTERVAL`, in ms, default `7200000` (2 hours), minimum `60000`;  
  added to `loadConfig`, `.claude/rules/environment.md` and the `.example` launch templates.  
  `ENV_HOMETAB_SWEEP_INTERVAL` is not used.  
- **AM1 (rule 4)**: all Watching polls in the date window, bounded by `ENV_MAX_BOOKMARKS_PER_USER`.  
- **AM2 (rule 3)**: "participated in" means voted: the polls the Your Votes tab lists (relation `voted`), with the same access narrowing (`reachableMany`).  
- **AM3 (date window)**: each state is judged by the date it has: OPEN by `launched_at` within 2 months, CLOSED by `closed_at` within 1 week, WAITING TO OPEN always eligible;  
  EDITING is judged by its stashed state.  
  No migration.  
- **AM4 (states)**: published polls only: WAITING TO OPEN, OPEN and CLOSED (EDITING by its stashed state);  
  never INITIALIZED, AWAITING APPROVAL, REJECTED or ARCHIVED polls.  
- **AM5 (rule 1)**: the same polls the Shared With You tab lists, by the same rule (`sharedWithYouKept`);  
  Home never marks invitations accepted nor adopts invitations.  
- **AM6 (refresh)**: only the membership (which polls, in which order) is rebuilt each interval;  
  the cards' content and live counts refresh like any other tab's, on the refresh floor.  
- **AM7 (order)**: one list in rule order, with no headings;  
  within rules 1–4 the most recent relation first (`user_polls.updated_at`), within rule 5 TRENDING's rank.  
- **UA1 (icon image)**: the image is kept beside these requirements as `home-icon.jpg`.  
- **UA2 (icon drawing)**: an inline SVG house outline, `viewBox="0 0 24 24"`, stroked in `currentColor` like Search, in the tab bar;  
  a `HOME_GLYPH` filled circle with the house in `var(--paper)` in the avatar menu.  
  No image file is shipped.  
- **UA3 (guests, developer resolution)**: Home is a personal tab: hidden from guests, a guest's landing tab stays Trending.  
  The Home Tab Bar icon is not shown and the Avatar menu does not show a Home item for guests.  
- **UA4 (avatar menu item)**: labelled "Home", it links to `/?tab=home`;  
  on `/` it selects the Home tab without reloading;  
  `home` joins `LANDING_TABS`;  
  it is shown to every signed-in user, whatever their permissions.  
- **UA5 (empty Home)**: "Nothing here yet. Polls shared with you, your polls, your votes, the polls you watch and what's trending will appear here.", in the existing empty-line style.  
- **UA6 (own changes)**: a change of the user's own relations (any write that calls `forgetTabs`) rebuilds their Home at the next refresh;  
  the interval bounds only what time and TRENDING change.  
  A poll that becomes unavailable to the user is dropped by the per-refresh access narrowing.  
- **UA7 (rule 5)**: the first 10 polls of the current TRENDING listing, in its order, that rules 1–4 did not list;  
  when the listing is not ready, Home lists rules 1–4 alone, and that list is cached for one trending interval (`ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL`) instead of the Home interval.  
- **NC1 (tab position)**: Home is the first tab in the tab bar, and the landing tab for signed-in users;  
  guests still land on Trending, and a link landing (`/?tab=…&open=…`) still wins.  
