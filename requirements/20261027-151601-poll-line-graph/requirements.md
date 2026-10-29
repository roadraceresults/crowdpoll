Start a new spec for these requirements called `20261027-151601-POLL-LINE-GRAPH`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

The objective of this requirement is to add a line graph to the right column of the Maximized Poll page.

An example of the kind of line graph is shown in the image:  
![Line Graph Example](line-graph-example.jpg)

This is adapted from:
https://polymarket.com/event/which-company-has-best-ai-model-end-of-2026

The line graph will map the percentage of votes at discrete time point on the X-axis.  
The choices for XAxis scale are:
- 1 Year (one control, always labelled "1 Year" — data older than one year is purged, so an "ALL" scale could never show more; AM2)
- 1 month
- 1 week
- 1 day

One Year
- x axis discrete points are day
- the max is one year even if the data spans more. (currently the data is purged greater than 1 year)
- if the data spans less than a month then 1 Year is not available

1 Month
- if the data spans less than 1 week, then 1 Month is not available
- x axis discrete points are day


1 Week
- if the data spans less than 1 day, then 1 Week is not available
- x axis discrete points are hour

1 Day
- x axis discrete points are hour


Y Axis is Percentage of vote at the corresponding time point on the X-axis.

The percentage at a time point is the cumulative standing (AM1): each voter's latest vote as of that time, with the bar graph's percentage formula (single-choice: count / voters who voted;  
multiple-choice: count / total selections);  
the newest point therefore always equals the bar graph.  

The lines are the choices that have great than 1% of the vote (this is an ENV variable, e.g., ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE)

The threshold is evaluated on the current standing (AM3): a choice whose current share exceeds it is drawn across the whole window;  
other choices are omitted entirely.  
`ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE` defaults to `1`, in whole percent;  
`0` disables the filter (UA5).  

Each line is assigned a color coreesponging to the color used on the bar graph.  
This ensures consistency between the bar graph and the line graph, making it easier for users to associate each choice with its corresponding line.  

Poll title and subtitle are rendered.

There will be the same # votes displayed on the line graph as on the bar graph, ensuring consistency in the representation of voting data.  

The line graph will be rendered to occupy the full width of the right column container of the maximized poll page (IN1).  

Mosuing ove the graph will render the Choice corresponding to the line at the hovered time point, along with the percentage of votes it has received,  
and the date, or date/hour, depending on the X-axis scale.  

Hover is a vertical crosshair at the hovered time (AM4): a tooltip lists every drawn line's choice and percentage (colour dot, label, %), with the date (or date and hour) shown once.  

Research: how should these graphs be cached so that they can be efficiently rendered without repeatedly fetching and processing the same data.  
The can be a refresh interval that is appropriate for updating the graph with the latest voting data without causing excessive load on the server.  
The refresh interval should be configurable, allowing adjustments based on the expected frequency of voting activity and server capacity.
Environment variable ENV_LINE_GRAPH_REFRESH_INTERVAL will define the refresh interval for updating the graph with the latest voting data.

Resolved (RS1): the series is cached read-through, keyed by (poll id, scale), with TTL = `ENV_LINE_GRAPH_REFRESH_INTERVAL`;  
the browser refetches the current scale on the same interval while the card is maximized.  
`ENV_LINE_GRAPH_REFRESH_INTERVAL` defaults to `60000` ms, floored at `ENV_MIN_LIVE_REFRESH_INTERVAL`, and both new settings are sent to the browser in `/api/config` (UA5).  

## Resolved Details (added by /speckit-requirements, 2026-10-27)

- **Data source and transport (UA1)**: one new read-only endpoint, `GET /api/polls/:pid/line-graph?scale=1d|1w|1m|1y`, answering `{ scale, availableScales, totalVoted, buckets, series }`, computed on the server from `vote_history` (the browser never sees voter emails);  
  the endpoint is documented in `postman/openapi.json`.  
- **Span and default scale (UA2)**: "data spans" is measured from the poll's first `vote_history` row to now;  
  the default scale on a freshly maximized card is the largest available one.  
- **Time zone (UA8)**: buckets are computed on the server in UTC and the response carries UTC timestamps;  
  the browser formats the axis and crosshair labels in the viewer's local time.  
- **Sparse data (UA3)**: with fewer than two time points on every available scale, the right column renders the title, subtitle and a quiet placeholder ("Not enough voting data to graph yet") instead of axes.  
- **Dark mode (UA4)**: lines use the choice's assigned bar-fill hex in both themes;  
  axes, gridlines, labels, crosshair and tooltip use the existing Material 3 tokens.  
- **Narrow viewports (UA6)**: the existing maximized-grid wrap is kept — below the 767.98 px container width the graph renders below the card at full width, and a tap places the crosshair.  
- **Legend (UA7)**: a legend above the graph shows one entry per drawn line (colour dot, choice label, current percentage) plus the total vote count;  
  entries wrap on narrow columns.  
- **Rendering (NC1)**: a hand-rolled inline-SVG module (`lineGraph.js`), no new dependency.  
- **Visibility (NC2)**: the graph renders exactly when the maximized card may show its results face to this viewer, and the endpoint enforces the same server-side access rule;  
  otherwise the right column shows the title, subtitle and a note that results are not available yet.  





