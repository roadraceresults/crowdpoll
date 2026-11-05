# Feature Specification: Legal Page Updates

**Feature Branch**: `legal-page-updates`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "requirements/20261104-180032-legal-page-updates/requirements.md"

## Clarifications

### Session 2026-11-04

- Q: Does a legal page opened from CrowdPoll in a new tab show the Back arrow? → A: no: the new tab has no earlier page to return to, so no arrow is shown.
- Q: On a wide screen, is the Back arrow aligned with the window's left edge or the header's content? → A: with the left edge of the header's content, under the logo, as in the mockup.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A reader learns that the check stops bots and AI agents (Priority: P1)

A visitor reads the Privacy Policy, either from a footer link or from the human check's "What this safeguard checks." link.
The section that describes the check is now called **Bot and AI Agent Detection**.
It says the check confirms the visitor is not a bot or an AI agent, and that its purpose is to stop bots and AI agents from creating accounts, sending sign-in emails and voting on polls.
What it measures, where it runs, how long it is kept and the absence of cookies are described as before.
The policy's summary and retention table use the new name, and the policy carries a new version and date, which every account accepts once.

**Why this priority**: The policy must describe the check truthfully; it is the one change with a legal effect, and it stands alone.

**Independent Test**: Open `/privacy`; confirm the section's heading and text read as in FR-001 to FR-003, the "In short" line and the retention row use the new name, the human check's link still lands on the section, and the version and date at the top are the release date. Sign in with an account that accepted the earlier version and confirm it is asked to accept the new one.

**Acceptance Scenarios**:

1. **Given** a guest on the Login page's human check, **When** they follow "What this safeguard checks.", **Then** the Privacy Policy opens at the section titled "Bot and AI Agent Detection", below the fixed header.
2. **Given** the Privacy Policy, **When** a reader reads the section, **Then** it says the check confirms "you are not a bot or an AI agent" and gives the purpose "to prevent bots and AI agents from creating accounts, sending sign-in emails, and voting on polls."
3. **Given** the Privacy Policy, **When** a reader reads "In short" and the retention table, **Then** both name the check by its new name, and the "In short" line still links to the section.
4. **Given** a signed-in account that accepted the previous version, **When** it next opens a page, **Then** it is asked to accept the new version once, as for any new version, and no advance email is sent.
5. **Given** the Privacy Policy and the Terms of Service, **When** a reader looks at the top of either page, **Then** both show the new version; the Privacy Policy's "Last updated" date is the release date.

---

### User Story 2 - A reader goes back to the CrowdPoll page they came from (Priority: P2)

A visitor who opened the Privacy Policy or the Terms of Service from another CrowdPoll page sees a **Back** arrow just under the header, lined up under the logo.
It looks like the back arrow on the Poll Administration page: a round, tinted button with a left arrow.
It stays in view while they scroll.
Pressing it returns them to the page they came from, as it was, even if they followed links within the policy (for example to "Cookies") before pressing it.
A visitor who arrived from anywhere else (an email, a search result, a bookmark, a typed address) sees no Back arrow, because there is no CrowdPoll page to return to.

**Why this priority**: It saves readers from losing their place, most of all a visitor reading the policy in the middle of signing in; but the pages work without it.

**Independent Test**: From `/login`, follow the Privacy Policy link, follow an in-page link, press Back; confirm `/login` returns. Open `/privacy` by typing its address; confirm no arrow.

**Acceptance Scenarios**:

1. **Given** a visitor on any CrowdPoll page, **When** they follow a link to `/privacy` or `/terms`, **Then** the Back arrow is shown under the header, lined up under the logo.
2. **Given** a visitor who followed two in-page links on the policy, **When** they press Back once, **Then** they return to the CrowdPoll page they came from, not to an earlier position on the policy.
3. **Given** a visitor who went from the Privacy Policy to the Terms of Service, **When** they press Back on the Terms, **Then** they return to the Privacy Policy, where the arrow is shown again.
4. **Given** a visitor who opened `/privacy` from an email, a search result, a bookmark or a typed address, **When** the page loads, **Then** no Back arrow is shown and nothing takes its place.
5. **Given** a keyboard user, **When** they press Tab after the header, **Then** the Back arrow takes focus with a visible focus ring, is announced as "Back", and Enter or Space presses it.
6. **Given** a phone-width screen, **When** the visitor scrolls the policy, **Then** the arrow stays in view and never covers the text.

---

### User Story 3 - The Up arrow sits in the centre (Priority: P3)

On every page that has the existing Up arrow (the button that appears after scrolling down and returns to the top), it now sits at the bottom centre of the window instead of the bottom right.
When it appears, how it disappears, what it does and how it moves above the cookie notice stay as before.

**Why this priority**: A visual change that matches the mockup; the button works either way.

**Independent Test**: On the Privacy Policy and on the home page, scroll down until the Up arrow appears; confirm it is centred horizontally at the bottom, and returns to the top when pressed.

**Acceptance Scenarios**:

1. **Given** any page with the Up arrow, **When** the visitor scrolls far enough for it to appear, **Then** it appears at the bottom centre of the window.
2. **Given** the cookie notice is showing, **When** the Up arrow appears, **Then** it sits above the notice, as before.
3. **Given** the Up arrow is showing, **When** the visitor presses it, **Then** the page returns to the top, smoothly unless the visitor prefers reduced motion.

---

### Edge Cases

- **Reload**: a reloaded legal page keeps the same decision about the Back arrow as when it was first opened from that page.
- **Opened in a new tab from a CrowdPoll page** (middle-click, Ctrl+click, "Open link in new tab"): the tab has no earlier page to return to, so no Back arrow is shown, even though the visitor came from CrowdPoll (clarification Q1).
- **The previous page is no longer kept by the browser**: Back reloads it, as the browser's own Back button would.
- **A previous page that needed the human check**: when the browser keeps the page as it was left, a check already passed is still passed; otherwise the check is shown again, as on any fresh visit.
- **Arriving at an anchor** (for example `/privacy#bot-check` from the human check): Back returns to the page the visitor came from, not to the top of the policy.
- **Both arrows at once**: on a narrow screen the Back arrow (top left) and the Up arrow (bottom centre) never overlap each other or the text.
- **Signed-out visitors and accounts that have not yet accepted the new version** can read both pages, with the Back arrow, as they can today.

## Requirements *(mandatory)*

### Functional Requirements

**Bot and AI Agent Detection section (Privacy Policy)**

- **FR-001**: The section's heading MUST read "Bot and AI Agent Detection".
- **FR-002**: The section's first sentence MUST read "Before a sign-in starts, on the Login, Create Account and invitation pages, you tick a box that checks you are not a bot or an AI agent."
- **FR-003**: The section's **Why** item MUST read "to prevent bots and AI agents from creating accounts, sending sign-in emails, and voting on polls."
  Its **What it measures**, **Where**, **How long** and **Cookies** items MUST keep their current text.
- **FR-004**: Within sentences, "bot", "bots", "AI agent" and "AI agents" MUST be written in lower case; only the heading uses capitals.
- **FR-005**: The "In short" line MUST read "Before you sign in, a quick check on our own servers detects bots and AI agents. It sets no cookie.", with "check" linking to the section.
- **FR-006**: The retention table's row MUST read "Bot and AI agent detection measurements", with its period unchanged ("in memory, one hour at most").
- **FR-007**: The section MUST keep its current address (`/privacy#bot-check`), so the human check's link and links already shared still land on it; the human check's link text stays "What this safeguard checks.".

**Version**

- **FR-008**: The policies' shared version MUST become the release date, shown at the top of both the Privacy Policy and the Terms of Service; the Privacy Policy's "Last updated" date MUST become the same date.
- **FR-009**: Every account that accepted an earlier version MUST be asked to accept the new version once, through the existing acceptance step; no advance email is sent, since the change clarifies the check and collects nothing new.

**Back arrow (Privacy Policy and Terms of Service)**

- **FR-010**: Both legal pages MUST show a Back arrow when, and only when, the page was opened from another page of the same site (same address origin as the page) and the tab has an earlier page to return to.
  Otherwise it MUST NOT be shown, and MUST take no space.
- **FR-011**: The decision MUST be made once, when the page loads.
- **FR-012**: Pressing the Back arrow MUST return the visitor to the page they came from, using the browser's history, past any in-page link steps taken on the legal page, so one press always leaves the legal page.
- **FR-013**: The Back arrow MUST look like the back arrow on the Poll Administration page: a 40 px round button in the tonal secondary colour, with a left arrow and the same hover, focus and pressed states.
- **FR-014**: The Back arrow MUST stay fixed under the header while the page scrolls, on every screen width, lined up with the left edge of the header's content (under the logo), not with the window's edge (clarification Q2).
- **FR-015**: On screens too narrow for the arrow to sit beside the text column, the text MUST get a left gutter wide enough (about 56 px) that the arrow never covers it.
- **FR-016**: The Back arrow MUST be a button named "Back", with the tooltip "Back", reachable by Tab as the first control after the header, pressed with Enter or Space, with the Poll Administration back arrow's focus ring.
- **FR-017**: The Back arrow MUST work for signed-out visitors and for accounts that have not yet accepted the current version.
- **FR-018**: The Back arrow MUST NOT add any cookie or browser storage, and MUST NOT load anything from another site.

**Up arrow (every page that has it)**

- **FR-019**: The Up arrow MUST sit at the bottom centre of the window on every page that has it, instead of the bottom right.
- **FR-020**: Its appearance thresholds, its return to the top (smooth unless reduced motion is preferred), its keyboard use and its rise above the cookie notice MUST stay as they are.

**Documentation and checks**

- **FR-021**: The automated checks that pin the legal pages' text, version, page assets and the Up arrow's position MUST be updated to the new text, version, assets and position, and MUST cover the Back arrow's shown and hidden cases.

### Key Entities

- **Policy version**: the single version shared by the Privacy Policy and the Terms of Service; each account records the version it accepted, and a newer one asks it to accept again.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Privacy Policy's section, summary line and retention row read exactly as FR-001 to FR-006, and the old name "Bot check" appears nowhere on the page.
- **SC-002**: From each of the CrowdPoll pages that link to the legal pages (the footer of any page, the sign-in cards, the human check, the cookie notice, Profile, and each legal page to the other), one press of Back returns to that page in 100% of tries, whatever in-page links were followed first.
- **SC-003**: A legal page opened from outside the site, by a typed address, a bookmark or in a new tab shows no Back arrow in 100% of tries.
- **SC-004**: At every width from 320 px up, neither arrow covers any of the legal pages' text.
- **SC-005**: On every page that has the Up arrow, its centre is within 1 px of the window's horizontal centre.
- **SC-006**: Every account that accepted the previous version is asked to accept the new one on its next visit, and none is asked twice.
- **SC-007**: A keyboard-only visitor can reach and press the Back arrow, and a screen reader announces it as "Back".

## Assumptions

- "The Admin Poll page" is Poll Administration (`/admin`); only the look of its back arrow is copied, not its behaviour (it always goes to the home page).
- The Up arrow is on 13 pages today; all of them change (requirements AM1, Recommendation B), including the home page, where it now sits over the middle column of poll cards.
- "The previous page is on the same site" is decided from the address the browser reports as the previous page; when the browser reports none (an email, a bookmark, a typed address), the arrow is hidden (requirements UA2). A page opened in a new tab has no earlier page in that tab, so it is treated the same way (clarification Q1).
- The Terms of Service's text and its "Last updated" date do not change; only its version does, because the two documents share one version.
- The release date is the day the change goes live; it is set when the feature ships.
- The FCaptcha software does look for AI agents (it flags self-declared AI-agent browsers and pointer patterns typical of automation), so the new wording describes it truthfully.
- No change to the human check itself, to the rest of either policy, or to any other page's layout beyond the Up arrow's position.
- The decisions behind this specification are recorded in `requirements/20261104-180032-legal-page-updates/requirements-report.md` (10 findings, all resolved).
