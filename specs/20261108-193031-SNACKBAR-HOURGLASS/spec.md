# Feature Specification: Snackbar Hourglass

**Feature Branch**: `snackbar-hourglass`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "requirements/20261108-193031-snackbar-hourglass/requirements.md"

## Clarifications

### Session 2026-11-08

- Q: Should the hourglass's sand drain smoothly, or tick down in 14 steps like the reference GIF? → A: smoothly and continuously over 7 s: the top bulb empties as the bottom fills, with a thin falling stream between them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A member sees how long the "Logged in as" notice will stay (Priority: P1)

A member logs in, with Google, Apple, Microsoft or Amazon or with an emailed link, and lands back on CrowdPoll.
As today, a notice slides in at the top of the screen saying "Logged in as" and their email address.
At the right end of the notice, after the text, a small hourglass now appears, full of sand at the top.
The sand runs down while the notice is on screen and has just run out when the notice fades away, 7 seconds later.
The member can tell at a glance that the message is temporary and how much longer it will stay.

The look follows the supplied mockup (`requirements/20261108-193031-snackbar-hourglass/snackbar.jpg`) and the supplied animation (`snackbar_hourglass_7_seconds.gif` beside it), which is the reference for the drawing.

**Why this priority**: It is the whole feature: the hourglass, its place, its timing and its look.

**Independent Test**: Log in with a provider on an account that has accepted the current Terms; confirm the notice shows the email address with an hourglass after it, the sand runs down once over the notice's 7 seconds, and the notice fades as the sand runs out.

**Acceptance Scenarios**:

1. **Given** a member who has accepted the current Terms, **When** they return from a provider login or an emailed login link, **Then** the notice "Logged in as `<email>`" appears at the top of the screen with an hourglass at its right end, after the text.
2. **Given** the notice has just appeared, **When** the member watches it, **Then** the hourglass starts full at the top and its sand runs down smoothly into the bottom bulb, with a thin stream falling between the bulbs, once, without starting over.
3. **Given** the notice appeared 7 seconds ago, **When** the sand has run out, **Then** the notice fades away.
4. **Given** the notice is showing, **When** the member compares it with the mockup, **Then** the hourglass is about two-thirds of the notice's height, the notice is no taller than a notice without it (48 px), and there is clear space between the text and the hourglass.
5. **Given** a phone-width screen and a long email address, **When** the notice appears, **Then** the text wraps onto more lines while the hourglass keeps its full size.

---

### User Story 2 - The hourglass is clear in both themes and for every reader (Priority: P2)

A member who uses the dark theme sees the notice in its dark-theme colours (a light bar with dark text), and the hourglass is drawn in matching colours, so it stays clearly visible.
A member who has asked their device for reduced motion sees the hourglass standing still, full at the top, for the same 7 seconds.
A member using a screen reader hears only "Logged in as" and their email address; the hourglass is not announced.

**Why this priority**: Without it the hourglass would vanish in the dark theme, move for readers who asked it not to, or add noise for screen-reader users; but the light-theme hourglass of Story 1 stands without it.

**Independent Test**: Repeat Story 1's login in the dark theme, then with reduced motion on, then with a screen reader; confirm the hourglass is visible against the bar, still under reduced motion, and silent to the screen reader.

**Acceptance Scenarios**:

1. **Given** the light theme, **When** the notice appears, **Then** the hourglass's outline is drawn in the notice's text colour and its sand in a contrasting accent colour, as in the mockup.
2. **Given** the dark theme (the site's own theme choice), **When** the notice appears, **Then** the hourglass is drawn in the dark theme's notice colours and is as clearly visible as in the light theme.
3. **Given** a member whose device asks for reduced motion, **When** the notice appears, **Then** the hourglass is shown still, full at the top, and the notice leaves after 7 seconds as usual.
4. **Given** a screen-reader user, **When** the notice appears, **Then** exactly "Logged in as `<email>`" is announced, with nothing for the hourglass.

---

### Edge Cases

- **A reload or an ordinary page load**: no notice appears, so no hourglass (FR-009).
- **The account has not yet accepted the current Terms**: the Accept Terms card says "Logged in as" itself, with no notice and no hourglass, as today.
- **The page is in a background tab when it loads**: the hourglass and the notice keep the same 7-second clock, so the sand never runs out before or after the notice leaves.
- **The other notices** ("Link copied", "Choices pasted", the profile page's notices): unchanged, with no hourglass (FR-010).
- **Very narrow screen**: the text wraps; the hourglass is never squeezed or cut off.
- **Development without the CDN**: the hourglass looks and behaves the same; it is part of the page's own script and stylesheet wherever those are served from.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The "Logged in as `<email>`" notice shown after a login MUST show an hourglass at its right end, after the text.
- **FR-002**: The notice MUST stay on screen for 7 seconds (up from 6), then fade away as before.
- **FR-003**: The hourglass MUST start full at the top when the notice appears, and its sand MUST run down once, smoothly and continuously (not in steps), over the notice's 7 seconds, the top bulb emptying as the bottom bulb fills, with a thin stream of sand falling between them while it runs, ending with the top bulb empty as the notice begins to fade; it MUST NOT loop or start over.
- **FR-004**: The hourglass MUST be drawn in the notice's own colours: its outline in the notice's text colour and its sand in the theme's contrasting accent colour, so it is clearly visible in both the light and the dark theme (the dark theme being the site's own theme choice).
- **FR-005**: The hourglass MUST be shown 32 px tall and 22 px wide, keeping the reference drawing's proportions; the notice MUST stay 48 px tall on one line of text, with 12 px between the text and the hourglass.
- **FR-006**: On a screen too narrow for the text on one line, the text MUST wrap and the hourglass MUST keep its full size.
- **FR-007**: When the device asks for reduced motion, the hourglass MUST be shown still, full at the top with no falling stream, and the notice MUST still leave after 7 seconds.
- **FR-008**: The hourglass MUST be decorative: assistive technologies MUST announce only "Logged in as `<email>`".
- **FR-009**: The notice MUST appear only on the first page after a login, by a provider or by an emailed link (the login link, its confirmation page, the create-account link or an invitation's Continue), never on a reload, and not while the account still has to accept the current Terms.
- **FR-010**: Other notices and other parts of the site MUST NOT change; the Accept Terms card's "Logged in as" line MUST NOT gain an hourglass.
- **FR-011**: The hourglass MUST NOT need any extra download: it is drawn by the page's own script and stylesheet, delivered as they are today (from the content delivery network in production), with no separate image file and no third-party request.
- **FR-012**: The look of the hourglass MUST follow the supplied reference animation and mockup: a two-bulb hourglass with an outline and sand that drains from the top bulb into the bottom one; the reference's 14 half-second steps are not reproduced, the drain is continuous (FR-003).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After every login, by a provider or an emailed link, on an account that has accepted the Terms, the notice shows the hourglass, in 100% of logins in both themes.
- **SC-002**: The sand runs out within 0.2 seconds of the moment the notice begins to fade.
- **SC-003**: The notice is the same height with the hourglass as without it (48 px for one line of text), at every screen width from 320 px up.
- **SC-004**: In both themes, the hourglass's outline and sand each have a contrast ratio of at least 3:1 against the notice's background.
- **SC-005**: With reduced motion on, nothing in the notice moves; screen readers announce the same words as before the feature.
- **SC-006**: Pages that can show the notice make no more network requests than before the feature.

## Assumptions

- The "notice" is the sign-in snackbar (`m3-snackbar`); the plan, tasks and contracts call it the snackbar.
- The notice's position at the top centre, fade and wording are unchanged; its duration (6 → 7 seconds) and its contents change, and an emailed-link login now shows it too, through the same `signedIn=1` mark on the address it lands on.
- The supplied animated image is the reference for the look and not the file served; the hourglass is redrawn so it can follow the theme's colours and stand still for reduced motion (requirements report UA2, RS2).
- "Contrasting accent colour" is the colour scheme's inverse-primary tone, the accent designed to sit on the notice's background; the outline uses the notice's text colour.
- The notice cannot be dismissed and has no action today; this feature adds none, so the hourglass never needs to stop early.
- No setting, route, cookie, browser storage key, stylesheet or dependency is added; the existing test of the notice's duration follows the new 7 seconds.
- Breaking changes: none. Technical debt noted in the requirements report (three snackbar implementations; the sign-in notice left hidden in the page after it fades) is not addressed here.
