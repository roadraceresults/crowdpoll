# Quickstart: Phone Layout Redesign

This is the validation checklist (FR-039). It is run on real phones and on BrowserStack; each run adds a row to §9.

Prerequisites: Node ≥ 22, `npm install` done, the development server running from this branch, a signed-in account
that may create polls, and three polls to look at: one of 4 choices, one of 12, one of 50 (the populate script makes
them). Phones reach the development server through a tunnel that passes the `Host` header, as described in
`specs/20261113-085157-FIXED-VIEWPORT-WIDTH/quickstart.md` ("Reaching the development server from a phone").

## 1. Automated tests

```
npx tsc --noEmit
npm test
```

Expected: all pass, including `essential-choices.test.ts`, `client-phone-card.test.ts`, `client-phone-view.test.ts`,
`client-maximized-history.test.ts`, `phone-sheets.test.ts` and `removed-results.test.ts`.

## 2. Devices

Run §3 to §6 on each, in the light and the dark scheme:

| Width (CSS px) | Example | Browsers |
|---|---|---|
| 320 | iPhone SE (1st generation) | Safari |
| 360 | Galaxy S series | Chrome, Samsung Internet |
| 375 | iPhone SE (2nd, 3rd), iPhone 13 mini | Safari |
| 390 to 393 | iPhone 14 to 16, Pixel 8 | Safari, Chrome |
| 412 | Pixel 8 Pro, Galaxy S Ultra | Chrome, Samsung Internet |
| 430 to 440 | iPhone Pro Max | Safari |

## 3. Every page (contract P1 to P5)

For each of the 12 pages (`/`, `/login`, `/create-account`, the confirm-sign-in page, an invitation link, the
accept-terms page, the not-authorized page, `/profile`, `/settings`, `/privacy`, `/terms`, `/admin`):

- [ ] the page does not scroll sideways;
- [ ] the header, the 448 px column and the footer are the same as on the home page;
- [ ] every card is 448 px wide with the same padding and corners;
- [ ] no text is smaller than the footer's small text (15 px in the layout);
- [ ] every control is hit at the first tap, without zooming.

## 4. The compact card and voting (contract C1 to C3)

- [ ] The 4-choice poll's card shows four bars and no "more" row.
- [ ] The 12-choice poll's card shows four bars and "More choices · N%" (or "More choices" if it is
      multiple-choice).
- [ ] After voting for a choice outside the first four, that choice is a fifth bar above the "More choices" row.
- [ ] The first card of a tab is wholly visible below the tab bar without scrolling, with the next card starting
      (SC-001).
- [ ] The 12-choice and 50-choice cards are no taller than 500 px in the layout when their titles take two lines
      (SC-002).
- [ ] Tapping the title, a bar, the "more" row or Maximize opens the maximized view.
- [ ] Vote on the 4-choice card flips it in place; a vote is submitted from the card.
- [ ] Vote on the 12-choice and 50-choice cards opens the maximized view on its voting side.
- [ ] On the 50-choice ballot, the last choice is selected and submitted without scrolling back; the bar shows the
      count; the cookie notice, when shown, is below the bar and covers nothing.

## 5. The maximized view and Back (contract C4, C5, H)

- [ ] The 50-choice poll shows the bars that render greater than 2%, and no more than ten bars, and "Show all 50 choices · N%"; it expands in place and reads "Show few choices".
- [ ] Opened from a card's "More choices" row, the view shows every choice at 1% or more, then "Remaining choices · 0%" when any is left; that row shows them all and reads "Show few choices" (TWEAK07).
- [ ] A poll of twelve or fewer choices shows the bars that render greater than 0%, and "Show all N choices" when any is left out (TWEAK05, on trial).
- [ ] Under the card a tab bar reads Read More, Polling History and Who Voted, styled as the Home tab bar; the leftmost
      one the poll has is selected and shown, the ones it lacks are greyed out, and one section shows at a time.
- [ ] The card is no taller than the side showing (no blank area under a short results side).
- [ ] The phone's Back closes the view and the list is where it was; ten times out of ten (SC-007).
- [ ] The on-screen Back arrow and Minimize close it; one more Back then leaves the site as it would have before.
- [ ] A poll opened from a shared link: Back leaves; the on-screen arrow goes to the list.
- [ ] Open a view, tap another tab: the view closes; Back does not reopen it.

## 6. Administration (contract P3, X2)

- [ ] The admin card has three icons and the menu; no results icon, no "View Results".
- [ ] A poll is created from "Create New Poll" through the six steps to Publish without zooming (SC-008).
- [ ] The search form has each operator beside its value (TWEAK20), each group of three radio buttons in one row (TWEAK13) and the two checkboxes side by side (TWEAK14), and searches.
- [ ] An invitee is added, its menu opened, and removed.

## 7. Unchanged elsewhere, and the two open questions

- [ ] One phone in landscape and one tablet show every page as on `origin/main`, apart from Back closing the
      maximized view.
- [ ] iOS: focusing a text field (login email, wizard title) does or does not zoom the page: ______
- [ ] Android and iOS: with the system or browser text size raised, the site's text does or does not grow: ______

## 8. Measured in an emulated phone (T041, 2026-11-13)

Headless Chromium with mobile emulation at 320, 360, 390 and 430 px, against a seeded copy of the site. This is not
a device run; it checks sizes, not how a tap or the scaled text feels.

| Check | Result |
|---|---|
| Layout width on `/`, `/login`, `/create-account`, `/confirm-signin`, `/profile`, `/settings`, `/privacy`, `/terms`, `/admin` | 480 px at all four widths |
| Sideways scroll | none at 320 and 360 px; at 390 and 430 px the browser reports a 481 px scroll width because its own viewport rounds to 481 px, with no element wider than 480 px (the same reading as in the fixed-viewport feature; to confirm on devices in §3) |
| Text under 15 px | none on any of those pages, nor in the maximized view, the ballot, the admin search form and the six wizard steps |
| Controls under 64 × 64 px | none, apart from links inside a sentence (legal text, the sign-in terms line, the admin card's settings summary), which keep their line and get a taller hit area; since TWEAK02 the footer's links are among them, on lines 32 px apart (not measured again) |
| Compact card height, 50 and 12 choices, three-line title | 522 px; 487 px for the four-choice card. A two-line title is one 35 px line less: 487 px (SC-002: 500 px) |
| First card on a 390 × 844 phone | top at 212 px, bottom at 734 px, second card from 750 px, in a layout viewport 1,039 px tall before the browser's own bars (SC-001) |
| Maximized view | the bars above 2%, ten at most, and "Show all 50 choices"; the Read More, Polling History and Who Voted tab bar with one section shown; the Submit bar on the voting side; the flip keeps its rotation |
| Both color schemes | home, maximized view, ballot, menus and the admin page render in each |
| 1280 px desktop | every bar in the maximized view, no extras rows, no Submit bar; Back closes the view |

Not reached in this run, so to check on devices: the invitation, accept-terms and not-authorized pages (they share
the sign-in card's rules), the pager and the remove-confirmation strip of the invitee list, and the tabs dialog.

## 9. Runs

| Date | Device | Width | Browser | Scheme | §3 | §4 | §5 | §6 | Notes |
|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | |
