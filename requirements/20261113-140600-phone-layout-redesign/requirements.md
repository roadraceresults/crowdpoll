Start a new spec for these requirements called `20261113-140600-PHONE-LAYOUT-REDESIGN`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

This feature is a redesign of the UI/UX at 480px.  
We are challenging the AI to propose a great solution.  
We are using Fable 5.2 for this challenging problem.

**REQUIREMENTS**

- The UI/UX must be redesigned specifically for a viewport width of 480px, using FIXED_WIDTH = 480 in `src/public/viewportWidth.js` and the CSS Pixel technique from "specs\20261113-085157-FIXED-VIEWPORT-WIDTH"
- The layout should be optimized for readability and usability on phones at this width.
- All controls must be easily tappable without requiring zoom.
- The design should use the Material 3 design principles followed in the existing CrowdPoll webapp
- the color pallette will be consistent with the existing CrowdPoll webapp
- The implementation will be manually validated on real devices and through BrowserStack to ensure proper rendering and functionality

The single card layout will be used for Poll Cards and for Admin Poll Cards in the Poll Administration section.  
The Maximized Poll layout will be single column.  

The height of Poll Cards will be kept to a minimum for Poll Cards not in Maximized view.  
This could be accomplished by minimizing the number of bars shown when those bars are not essential for the immediate understanding of the poll's results.  

The Maximized Poll layout will also minimize the number of non-essential bars and elements, focusing on the immediate understanding of the poll's results.  
Then the user can have a way of expanding the Maximized Poll Card to view additional details and bars as needed.  
The preference is not to use scrolling within the Poll Cards, as is done now with a top bar and bottom bar that shown "^" and "V" respectively.  We have found that this approach can be cumbersome for users.  

We would like to make the MAXIMIZED Poll Card the view that the user can easily switch to when the standard Poll Card (that appears in all home page tabs by default) does not provide the user with a sufficient view to Vote or see results. This is typically the case when there are too many choices.  

We still want to continue to use the two-sided Poll Card with voting on the back side.   
This has received great feedback from users as a quick way to cast votes, whether in the standard view or the Maximized view.  

This redesign will target every page of the CrowdPoll webapp, ensuring a consistent and optimized experience for users on devices with a viewport width of 480px.  
Fortunately, there is a small finite number of pages, and they are already quite consistent in their layout and design patterns.  
If there are ways to make the design of pages even more consistent then that should be pursued.  

The one current page that is an outlier is what is called the Poll Results page which can be navigated to from the Admin Poll Card by clicking the Report icon, or selecting "View Results" from the Admin Poll Card kebab menu.  That page, the Results page, can be removed from the webapp.  Along with it, the Export JSON and Export Markdown features.  
It is a leftover from the first days of development and no longer aligns with the primary goals of the system.

## Resolved Requirements

- **One card frame (AM1).**
  Cards are one per row.
  Poll cards, admin cards and card-shell cards share one frame in the phone layout: 448 px wide, a 16 px page gutter, 20 px padding and a 20 px corner radius.
  The cards' contents stay their own.
- **Essential bars on the compact card (AM2).**
  The compact poll card shows the four leading choices by share;
  all of them when the poll has five or fewer;
  the viewer's own choice or choices are always shown.
  The choices left out are one last row giving their count and combined share, such as "7 more choices · 18%", which opens the maximized view.
- **Touch targets (UA1).**
  Every control has a touch target of at least 64 × 64 layout px.
  Its visible shape may be smaller: 48 px for buttons, chips and icon buttons.
  Neighbouring targets do not overlap.
- **Type sizes (UA2).**
  The phone layout uses the Material 3 type scale multiplied by 1.25 (body 18 and 20 px, labels 15 to 18 px, card title 25 px), applied as one override of the type tokens.
  No text is smaller than 15 px.
  The 0.75 shrink rules are not part of the phone layout.
- **Bars in the maximized view (UA3).**
  The maximized view shows the ten leading choices;
  all of them when the poll has twelve or fewer;
  the viewer's own choice always.
  One row, "Show all N choices", opens the rest in place and becomes "Show fewer".
  Nothing scrolls inside the card.
- **Extras in the maximized view (UA4).**
  Under the card there is one expandable row per extra, in the order Notes, Who voted, Vote history.
  Each is a 64 px header that opens its content in place;
  all are closed when the view opens;
  a row is absent when the poll has no such content.
  The Who voted report and the graph are fetched when their row is first opened.
  A card's notes line opens the view with Notes already open.
- **Submit while voting (UA5).**
  While the maximized view's voting face is showing, Back and Submit stay in a bar at the bottom of the screen, which shows how many choices are selected.
  The bar sits above the cookie banner and replaces the Back-to-top button while it is shown.
  On the compact card they stay in the card.
- **What goes with the Poll Results page (UA6).**
  Removed: `admin-results.html`, `adminResults.js`, the page route `GET /admin/poll/results`, the routes `GET /api/admin/polls/:pid/results`, `/export.json` and `/export.md`, the service functions left without a caller (`exportPollData`, `exportPollMarkdown`, `hidesChoicesFrom`), the admin card's results icon and "View Results" menu item, and their tests, OpenAPI entries and documentation.
  Kept: `computeResults`.
  Nothing is added in their place.
- **Validation (UA7).**
  A written checklist, the feature's quickstart, is run on phones 320, 360, 375, 390 to 393, 412 and 430 to 440 CSS px wide, in Safari on iOS, Chrome on Android and Samsung Internet, in both color schemes;
  one phone in landscape and one tablet confirm they are unchanged.
  Each page is checked for: no sideways scrolling; every control tappable at first try; no text under the minimum;
  the compact card, the maximized view, a vote on a short poll and on a 50-choice poll; the admin wizard from start to Publish.
  The checklist records the device, the browser and the result of each run.
  It also checks whether iOS zooms into a focused text field, and whether a visitor's own text-size setting still takes effect.
- **Where the phone layout applies (NC1).**
  The new phone layout applies only at 480 px and narrower.
  Today's phone layout stays as it is for 481 to 639 px.
  640 px and wider is unchanged, bar scrolling included.
- **Vote on the compact card (NC2).**
  When every choice is on the card, Vote flips it in place.
  When choices are left out, Vote opens the maximized view already on its voting face.
- **Windows narrower than 480 px (UA8).**
  The phone layout has a minimum page width of 480 px, so a desktop window narrower than that scrolls sideways.
  The rules for under 480, 360 and 320 px are deleted, since the new layout replaces everything in their range.
  The width thresholds are then 900, 768, 640, 560 and the new 480.
- **The phone's Back and the maximized view (NC3).**
  Opening the maximized view adds one history entry, so the phone's Back button or gesture closes the view and returns to the list.
  The on-screen Back arrow does the same.
- **Where the history entry applies (NC4).**
  At every width, a maximized view opened from a card adds one history entry, and Back closes it.
  A poll opened from a link (`/?PID=…`) adds none, so Back leaves as it does today;
  the on-screen arrow closes that view to the list.
