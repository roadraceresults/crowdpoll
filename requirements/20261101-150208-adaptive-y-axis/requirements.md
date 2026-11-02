Start a new spec for these requirements called `20261101-150208-ADAPTIVE-Y-AXIS`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

The Y-axis of the Line Graph that appears on the Maximized Poll page,  
should be adjusted to avoid having a large part of the graph appear empty or unused.  

Here are the rules:
If every datapoint is 25% or less, the max of the Y-axis will be 25%.  
else if every datapoint is 50% or less, the max of the Y-axis will be 50%.  
else if every datapoint is 75% or less, the max of the Y-axis will be 75%.  
else 
the max of the Y-axis will be 100%.     

## Resolutions

- **The points that decide the top** (AM1): every point of every line drawn, in the time scale shown;  
  a choice that is not drawn does not count, and the top may change when the viewer switches the time scale.  
- **Gridlines and labels** (UA1): five equal steps up to a 25%, 50% or 75% top (every 5%, 10% or 15%), and today's
  25% steps up to 100%;  
  so a 25% top shows 0, 5, 10, 15, 20 and 25%, and a 100% top looks exactly as today.  
- **The axis is chosen on every draw** (UA2): after each refresh, scale switch and resize, so it can rise or fall
  after a refresh;  
  the crosshair stays where it is, as today, and the change is not animated.  
- **No line, or every point at 0%** (UA3): the rule applies as written, so the top is 25%;  
  the sparse-data note is unchanged.  
- **Chosen in the browser** (UA4): in `src/public/lineGraph.js` `renderSvg()`;  
  no server, response, cache or API change.  
