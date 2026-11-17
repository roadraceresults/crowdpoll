Start a new spec for these requirements called `20261117-050854-FIXED-WIDTH-640`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

This feature will implement the UI/UX for viewports from 481px-640px.  

Currently, the UI/UX for 480px and less is already implemented and optimized for smaller screens.  

All the following requirements apply to viewports from 481px-640px.  

The UI/UX must be redesigned specifically for a viewport width of 640px, using FIXED_WIDTH = 640   
and the CSS Pixel technique from "specs\20261113-085157-FIXED-VIEWPORT-WIDTH"
Similar to how the 480px and under viewports are handled, the UI/UX for 481px-640px will follow the fixed width and CSS Pixel technique.

All the CSS and layout and controls will be the same as those used for 480px and less. 

Every page uses the same frame at 640 px:
- Poll Cards
- legal pages
- Poll Administration section: Admin Card, Admin Page, Admin Wizard

Assumptions
- Material 3 stays the design language: its components, shape and state layers, with sizes raised for the scaled phone rather than new components invented.
- Both color schemes keep their palettes; every new element takes its colors from the existing tokens.
- Bars stay ordered by share, largest first, on both faces, as today.
- A poll's notes show one line on the compact card and in full in the maximized view.
- The home page keeps its scrolling tab bar at the top; no bottom navigation is introduced.
- The fixed header and tab bar stay fixed while the page scrolls.
- Text is never smaller than 15 layout px in the phone layout.

## Resolved Findings (2026-11-17 5:20 AM)

These decisions come from the findings of `requirements-report.md` and take precedence where the text above can be read otherwise.  

- **No new design (IN2).**  
  "Redesigned specifically for 640px" means the existing phone layout is reused as it is, laid out in a 640 px frame;  
  no arrangement, component or control is designed for 640 px alone.  
- **Two fixed widths (AM1).**  
  `viewportWidth.js` keeps 480 and adds 640:  
  - a device held narrower than 480 px gets `width=480`, unchanged;  
  - a device held 481–639 px wide gets `width=640`;  
  - a device held exactly 480 px wide, or 640 px and wider, keeps its own width.  
  The rest of the technique (held width by orientation, `text-size-adjust: 100%`, the iOS `maximum-scale` computed from the width in force, applying again on `resize`, `pageshow` and an orientation change) is the same for both widths.  
- **One phone layout up to 640 px (AM2).**  
  The query of the phone layers (`phone-m3.css`, `phone-card-m3.css`, `phone-admin-m3.css`) and of the phone type scale in `m3-tokens.css` is widened from `max-width: 480px` to `max-width: 640px`.  
  The `max-width: 639.98px` blocks also apply at 480 px and less, and the phone layout depends on part of them, so they are re-labelled `max-width: 640px` and kept, in `single-column-m3.css` and `header-single-column-m3.css` too.  
  What is deleted is what the widened query makes dead: the declarations in those blocks that a phone layer overrides, the `--single-column` marker, `isSingleColumn()` and `singleColumnBarLayout()`.  
- **Exactly 640 px is the phone layout (AM4).**  
  The phone layout applies up to and including 640 px (`max-width: 640px`);  
  the wide layout starts above it (`min-width: 640.02px`, `not all and (max-width: 640px)`).  
  Every remaining `639.98px` query, the one in `headerFit.js` included, moves to 640 px.  
- **Desktop windows (AM3).**  
  A desktop browser window between 481 and 640 px wide, which the viewport meta cannot fix, gets the phone layout, fluid at the window's own width, without sideways scrolling.  
- **The content fills the frame (UA1).**  
  In the 640 px frame the page keeps its 16 px gutters, and the poll cards, the legal text, the admin list, the admin card and the wizard are 608 px wide.  
- **Scripts (UA2).**  
  Every phone behaviour applies up to 640 px:  
  `PollCard.isPhoneLayout()`, its copy in `adminCard.js` and `headerFit.js` ask `(max-width: 640px)`.  
  The limits of `essentialChoices` are the same in both frames, and Back is unchanged.  
- **Sizes (NC1).**  
  Both frames use the same sizes: the type scale × 1.25 (`label-small` held at 15 px), 48 px controls with a 64 px halo, 64 px rows, and no text under 15 layout px.  
- **Verification (UA3).**  
  - Held widths checked on devices or emulation: 481, 540, 600 and 639 px in portrait, 568 px in landscape, and rotation between a fixed 480, a fixed 640 and the device's own width.  
  - On each, every page (the home tabs, a maximized poll, privacy, terms, login, profile, settings, the admin page, the admin card and the wizard) shows the phone layout with no sideways scrolling and no text under 15 layout px.  
  - A device held under 480 px and a viewport over 640 px render exactly as before the feature.  
  - A focused field does not zoom the page on iOS.  
  - `npm test` and `npx tsc --noEmit` pass, with the viewport table of the fixed-viewport-width contract (V2) extended by the new rows.  
