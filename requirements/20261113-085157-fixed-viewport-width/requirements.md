Start a new spec for these requirements called `20261113-085157-FIXED-VIEWPORT-WIDTH`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

We did some research into how developers handle responsive design and viewport settings on websites,  
and found this technique:  
```
Site-side choices. Developers can set the viewport meta tag to a fixed width such as 640, and the browser will scale that to fit. Most sites use width=device-width and let responsive CSS handle the rest.
```

We would like to try this approach in our project to see if it improves the responsive design and overall user experience. 

## Resolved Requirements

- **The trial is the feature branch (AM1).**  
  The pages are changed on the feature branch;  
  the branch is the trial, kept by merging it or dropped by not merging it.  
  There is no setting and no switch.  
- **How the result is judged (AM2).**  
  A manual before/after checklist, the feature's quickstart, at 320, 360, 390 and 430 px portrait, one phone in landscape and one 768 px tablet.  
  It is run in a browser's device emulation and on at least one real phone.  
  Each width is checked on the home page, a maximized card, the admin wizard and a legal page.  
  It passes when: the page never scrolls sideways;  
  the layout is the same at all four phone widths apart from its size;  
  every control can still be tapped without zooming;  
  and the developer prefers the result to `main` at the same width.  
  The outcome (kept, kept with a different width, or dropped) is recorded in the quickstart.  
- **Pages (UA1).**  
  All 13 pages in `src/public/*.html` take one identical viewport rule.  
  `tests/pages.test.ts` keeps checking that every page carries the same line.  
- **Fixed width (NC1).**  
  The fixed width is 640 px, as in the quoted example.  
  On a phone the site's phone layout (the rules under `max-width: 639.98px`, and `headerFit.js`'s phone mode) therefore does not apply:  
  phones show two card columns and the single-row header, scaled to fit.  
- **Which devices (UA2).**  
  Only devices narrower than the fixed width get it;  
  wider ones keep `width=device-width`.  
  The static meta line stays `width=device-width, initial-scale=1`, and a small same-origin script in each page's head rewrites it on a narrow device.  
  Without JavaScript the page behaves as it does today.  
- **Landscape (UA3).**  
  The rule follows the current orientation: the width of the screen as it is held decides, and it is decided again when the phone is turned.  
  A phone in landscape that is as wide as the fixed width or wider shows today's `device-width` layout;  
  turned back to portrait it returns to the fixed width.  
- **Zoom (UA4).**  
  When the fixed width applies, the viewport content is `width=640` alone.  
  No `initial-scale`, `user-scalable=no`, `minimum-scale` or `maximum-scale` is written with it, so pinch-zoom is never restricted.  
- **Smaller text and touch targets (NC2).**  
  The reduction is accepted for the trial, with no numeric floor (IN1).  
  The quickstart records the size at which 16 px text and a 48 px control show at each device width;  
  at 640 px a 360 px phone shows them at 9 px and 27 px.  
  Readability is judged by the checklist above.  



