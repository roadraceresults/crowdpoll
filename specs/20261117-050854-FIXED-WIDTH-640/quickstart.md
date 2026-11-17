# Quickstart: checking Fixed Width 640

The device checklist of the feature. Contracts: [viewport.md](contracts/viewport.md) (V1–V5),
[breakpoints.md](contracts/breakpoints.md) (B1–B6).

## Prerequisites

- The site running locally (`devScripts/launch-dev.ps1`, PostgreSQL only) with a few polls, one of them with more
  than twelve choices and one with notes; an account that owns a poll.
- Chrome DevTools device mode (it honours the viewport meta when a device with "mobile" type is chosen), and where
  available a real small tablet or folding phone, and an iPhone for §4.
- Screenshots of the site **before** the feature (branch `481-640px` as it is before the boundary moves, not `main`) at 320, 360, 390, 430, 479, 768 and 1280 px, home
  page and admin page, for §5.

## 1. Automated checks

```
npx tsc --noEmit
npm test
npx vitest run tests/client-viewport-width.test.ts tests/phone-sheets.test.ts
```

Expected: all pass; the viewport test covers V1–V5, the sheet tests B1–B4.

## 2. The 640 px page (Stories 1 and 3; B5)

In device mode set custom mobile devices 481 × 900, 540 × 720, 600 × 960 and 639 × 900. On each:

a. [ ] `document.documentElement.clientWidth` is 640 and the meta's content is `width=640`.  
b. [ ] Home page: compact header (no navigation links, no search box, the search button shown), the scrolling tab bar,
      one column of compact cards, each 608 px wide; no sideways scrolling.  
c. [ ] The four devices show the same arrangement, differing only in size.  
d. [ ] A card with more than five choices shows four leaders and the "more" line; Vote opens the maximized view on its
      voting side with every choice; Back closes it, also from the voting side, and leaves the card on its results
      side with no blank space under the "more" line.  
e. [ ] The maximized view shows ten leaders (all if twelve or fewer) and the notes in full; the compact card shows one
      line of notes. On a card with many bars, "Show more" on the notes line opens the view scrolled so that
      the Vote button is at the top and the Read More tab with the notes is under it.  
f. [ ] Scrolling leaves the header and the tab bar fixed.  
g. [ ] Smallest text is 15 layout px (inspect a `label-small` element); buttons are 48 px high.  
h. [ ] Each of: privacy, terms, login, create account, confirm sign-in, accept terms, not authorized, invite, profile,
      settings: the phone layout, content 608 px wide, the same header, no sideways scrolling.  
i. [ ] Admin page: search form, result rows and an opened admin card 608 px wide; the wizard shows its phone footer
      and brief summary.  
j. [ ] Both color schemes.  

## 3. Turning (Story 2; V2)

a. [ ] 320 × 568: portrait `width=480` → landscape `width=640` → portrait `width=480`, no reload; a maximized view
      opened before turning is still open.  
b. [ ] 390 × 844: portrait `width=480` → landscape device width, wide layout → portrait `width=480`.  
c. [ ] 600 × 960: portrait `width=640` → landscape device width, wide layout → portrait `width=640`.  
d. [ ] A wizard in progress survives each turn.  

## 4. iOS (V4)

On an iPhone that is 568 px long (or the simulator), in landscape:

a. [ ] the meta's content is `width=640, maximum-scale=0.8875`;  
b. [ ] focusing the search field, the login email field and a wizard field does not zoom the page;  
c. [ ] pinch zoom still works.  

## 5. Unchanged widths (Story 2; B6)

a. [ ] 320, 360, 390, 430 and 479 px portrait: identical to the "before" screenshots, home and admin.  
b. [ ] 480 × 900: device content, phone layout, as before.  
c. [ ] 768 and 1280 px: identical to the "before" screenshots.  

## 6. Desktop window (Story 4)

In a desktop browser without device mode:

a. [ ] drag the width from 700 to 481 px: wide layout above 640, phone layout at 640 and below, fitted to the window,
      no sideways scrollbar;  
b. [ ] at exactly 640 px: phone layout; at 641 px: wide layout;  
c. [ ] below 480 px: as before (the page keeps its 480 px minimum).  

## 7. After the pruning (B4)

Repeat §2's home and admin checks at 600 × 960, and §5's 390 px check, comparing screenshots taken just before the
pruning phase with ones taken just after: no difference.

## Outcome

| Check | Result | Date |
|---|---|---|
| §1 | Pass: `npx tsc --noEmit` and `npm test` | 2026-11-17 |
| §2 | Partly checked, by headless Chrome screenshots of a 560 and a 640 px frame (not device mode): home (guest and signed in), privacy, login and the admin page show the phone layout, content 608 px wide at 640, no sideways scroll; no defect found. Not checked: `clientWidth` and the meta on an emulated device, the maximized view, Vote, the wizard, the other pages, the dark scheme, pinch zoom | 2026-11-17 |
| §3 | Not done by hand; the three sequences pass in `client-viewport-width.test.ts` (jsdom) only | 2026-11-17 |
| §4 | Not available (no iPhone or simulator); the `maximum-scale=0.8875` value is covered by the jsdom test only | 2026-11-17 |
| §5 | Partly checked: a 480 px frame and 641, 768 and 1280 px, same pages as §2, pixel-compared before and after: identical except the tab bar's animated scroll hint and the Live Results icon, which also differ between two runs of the same code. 320 to 479 px devices not checked (they are laid out at 480 px) | 2026-11-17 |
| §6 | Partly checked: 480, 560, 640 and 641 px frames as above (phone layout at 640, wide layout at 641, no sideways scroll); no dragging by hand | 2026-11-17 |
| §7 | Same pages at 480, 560, 640, 641, 768 and 1280 px pixel-compared before and after the pruning: admin, login and privacy identical; home differs only in the animated regions named in §5 | 2026-11-17 |

Seen and left alone, because it is the same before the feature: at 480 px a compact card whose subtitle is longer
than the card grows wider than the page (the subtitle does not wrap).
