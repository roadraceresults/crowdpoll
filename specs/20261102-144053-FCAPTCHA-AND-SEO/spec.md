# Feature Specification: Human Check Before Sign-In, and Search Engine Indexing of Public Polls

**Feature Branch**: `fcaptcha`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "requirements/20261102-144053-fcaptcha-and-seo/requirements.md"

## Clarifications

### Session 2026-11-02

- Q: How is the pass carried from the check page to the sign-in page? → A: in page memory only: the check and the sign-in form are one page that switches views (check first, then the form); no browser storage, no new cookie. This replaces the separate check page of the requirements' AM1 decision.
- Q: What does a pass entitle the visitor to? → A: a pass names the page it was issued on (sign-in, create-account, invitation) and is valid for any request that page can make (link email, provider sign-in, account creation from that page), refused for the others.
- Q: What does the visitor see when the check itself cannot load? → A: after 10 seconds without the check loading, or on its error, the page says "The human check is unavailable right now" and shows the form; the submission goes without a pass and the server accepts it only if it cannot reach the check service either, otherwise it answers "human check required" and the check is tried again.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A person passes the human check before signing in (Priority: P1)

A visitor who wants to sign in, create an account or accept an invitation is first shown a short human check: the sign-in page opens showing only the check.
They tick "I am human"; the check runs in the background for a moment and, once passed, the same page switches to its sign-in form, where they sign in as today.
The check is self-hosted: it is served from CrowdPoll's own domain and sends nothing to any third party.
It appears in light or dark mode, as the rest of the site does on their device.

**Why this priority**: This is the feature's purpose: no sign-in begins without a passed check.

**Independent Test**: With the check turned on, open the sign-in page as a guest, confirm only the check is shown first, pass it, and confirm the sign-in form appears and a sign-in email can be requested.

**Acceptance Scenarios**:

1. **Given** the check is on and a guest, **When** they open the sign-in page, the create-account page or an invitation link, **Then** the page shows the human check and none of its sign-in form or provider buttons.
2. **Given** the human check is shown, **When** the visitor ticks the box and passes, **Then** the same page, at the same address (the poll to return to, the invitation kept), switches to its sign-in form, which is usable.
3. **Given** a visitor has passed, **When** they request a sign-in email, create an account or choose a sign-in provider within the pass's lifetime, **Then** the request is accepted and handled exactly as today.
4. **Given** the visitor's device prefers a dark appearance, **When** the human check is shown, **Then** it is drawn dark; with a light preference, light.
5. **Given** a visitor who is already signed in, **When** they use the site, **Then** they are never shown the human check.
6. **Given** a visitor uses only a keyboard or a screen reader, **When** they reach the check, **Then** they can find it, operate it and hear its result.

---

### User Story 2 - An automated client cannot start a sign-in without passing the check (Priority: P1)

A script that skips the pages and calls the sign-in requests directly, or replays an old or used pass, gets nothing: no email is sent, no account is created, no provider sign-in begins.

**Why this priority**: A check that lives only on a page can be walked around; without this story the feature protects nothing.

**Independent Test**: With the check on, send a sign-in email request, an account creation request and a provider sign-in request with no pass, an expired pass, a used pass and a pass made for another site, and confirm each is refused and no email is sent.

**Acceptance Scenarios**:

1. **Given** the check is on, **When** a request to send a sign-in email, create an account, accept an invitation or start a provider sign-in carries no pass, **Then** it is refused with a "human check required" answer, and no email is sent.
2. **Given** a pass that has been used once, **When** it is sent again, **Then** the request is refused.
3. **Given** a pass older than its lifetime, **When** it is sent, **Then** the request is refused.
4. **Given** a pass issued for another hostname, or on a page that cannot make the request it is sent with (for example a pass from the sign-in page sent to create an account), **When** it is sent, **Then** the request is refused.
5. **Given** the site offers both the email link and sign-in providers, **When** a visitor passes the check on the sign-in page, **Then** that pass is accepted for either the link email or a provider sign-in.
6. **Given** a refused request, **When** the browser page receives the refusal, **Then** the page switches back to the human check.
7. **Given** a sign-in already begun with a valid pass, **When** the emailed link is opened, the sign-in is confirmed in another browser, or a sign-in provider returns, **Then** no further check is asked for.

---

### User Story 3 - A person who fails the check is told plainly and can try again (Priority: P2)

The check sometimes takes a real person for a program, or a pass expires while the person is on the sign-in page.
They are told so in plain words and can try again; nobody is locked out.

**Why this priority**: Without this, a false positive leaves a real person unable to sign in with no explanation.

**Independent Test**: Force a failed check and an expired pass, and confirm the message, the retry and, after repeated failures, the support address.

**Acceptance Scenarios**:

1. **Given** the check fails, **When** the result is shown, **Then** the visitor sees "We couldn't confirm you're a person. Please try again." with a Try again control, announced to screen readers.
2. **Given** the visitor has failed several times in a row, **When** the message is shown again, **Then** it also gives the support address, `support@crowdpoll.vote`.
3. **Given** a pass expired or was refused when the visitor submitted the sign-in form, **When** the page switches back to the check, **Then** passing it returns them to the same form with what they had typed.

---

### User Story 4 - A search engine finds and indexes public polls (Priority: P2)

A search engine's crawler is told which parts of the site to visit, is given a list of every public published poll, and can read each poll's question, description and choices as page text, without signing in and without meeting the human check.

**Why this priority**: The requirements ask that polls be indexed; today a crawler following a poll link lands on the sign-in page and indexes nothing.

**Independent Test**: As an anonymous client, fetch the site's crawler rules and poll list, then fetch a listed poll's page and confirm its title, description and choices are present in the page text, together with its description, canonical address and link-preview details.

**Acceptance Scenarios**:

1. **Given** the site is running, **When** a crawler asks for the crawler rules, **Then** it is allowed the home page, poll pages, the Privacy Policy and the Terms, is kept out of the account, admin, sign-in and programming-interface areas, and is told where the poll list is.
2. **Given** public published polls exist, **When** a crawler asks for the poll list, **Then** it receives the home page and the address of every public poll that is open or closed, each with the time it last changed, and no other poll.
3. **Given** a public published poll, **When** a crawler opens its page, **Then** the page text holds the poll's question, description, choices and the results a guest may see, with a descriptive title, a page description, its canonical address, link-preview details and a machine-readable description of the question and its choices.
4. **Given** a private, unpublished, rejected, deleted or unknown poll, **When** its poll page is requested, **Then** the answer is "not found", the same for every such case.
5. **Given** a public poll turns private or is deleted, **When** the poll list or its page is next requested, **Then** it is no longer listed and its page answers "not found".
6. **Given** the sign-in, account, admin and profile pages, **When** a crawler reads them, **Then** each asks not to be indexed.

---

### User Story 5 - A guest opening a public poll's link sees the poll (Priority: P2)

A guest who opens a shared link to a public, published poll sees that poll at once, as guests already can from Trending, Newest and search, instead of being sent to sign in.

**Why this priority**: It is the same address a search engine indexes; a searcher who clicks a result must land on the poll.

**Independent Test**: As a guest, open a public published poll's shared link and its poll page, and confirm the poll is shown maximized; open a private poll's link and confirm the guest is still sent to sign in.

**Acceptance Scenarios**:

1. **Given** a guest and a public, published poll, **When** they open its shared link, **Then** they are taken to the poll's page and see the live poll maximized, without signing in.
2. **Given** a guest and a private or unpublished poll, **When** they open its shared link, **Then** they are sent to sign in as today, and return to the poll afterwards.
3. **Given** a signed-in user, **When** they open any poll's shared link, **Then** they land exactly as today.

---

### User Story 6 - Visitors can read what the human check measures (Priority: P3)

The Privacy Policy gains a short "Bot check" section saying what the check reads from the browser, why, where it is kept, for how long, and that it is never sent elsewhere.

**Why this priority**: The check reads device characteristics; the site's privacy promise requires saying so plainly.

**Independent Test**: Open the Privacy Policy and confirm the section exists, is linked from the human check, and states each point.

**Acceptance Scenarios**:

1. **Given** the Privacy Policy, **When** a visitor reads it, **Then** a "Bot check" section lists what is measured (device and browser characteristics such as graphics, audio and font measurements, pointer and typing timing, and connection details), that it is used only to tell people from programs on the sign-in pages, kept by CrowdPoll for at most one hour and never shared.
2. **Given** the human check is shown, **When** a visitor wants to know more, **Then** a link takes them to that section.
3. **Given** the check and the pass, **When** the Cookie Use list is read, **Then** it is unchanged: the check sets no cookie and uses no browser storage.

---

### User Story 7 - The operator runs the human check and sees when it is unavailable (Priority: P3)

The operator deploys the human check as a separate service of the same application, on the site's own domain, and turns it on by configuration.
If it becomes unreachable, sign-in carries on under the existing limits, and the outage is visible in the logs and the health report.

**Why this priority**: The check must not become a way to take sign-in down, and an outage must not go unnoticed.

**Independent Test**: Stop the human check service and confirm a sign-in email can still be requested, that the skipped check is logged and counted in the health report, and that a pass the running service refuses is still refused.

**Acceptance Scenarios**:

1. **Given** the check is turned off by configuration (as in development and tests), **When** a visitor signs in, **Then** no check is shown and no pass is asked for.
2. **Given** the check is turned on but its configuration is incomplete, **When** the application starts, **Then** it stops with a message naming the missing setting.
3. **Given** the check service cannot be reached, **When** a visitor opens the sign-in page, **Then** after at most 10 seconds the page says "The human check is unavailable right now" and shows the sign-in form.
4. **Given** the check service cannot be reached, **When** a sign-in request arrives without a pass, **Then** it is handled without a check, under the sign-in email rate limit, the allowlist and the browser binding, and the skipped check is logged and counted.
5. **Given** the check service answers that a pass is invalid, **When** a sign-in request carries it, **Then** the request is refused, whatever the service's other state.
6. **Given** several instances of the check service, **When** a pass is used on one, **Then** no instance accepts it again.

---

### Edge Cases

- A visitor passes the check and then waits more than five minutes before submitting: the submission is refused, the page switches back to the check, and after passing it the form returns with what they typed.
- A visitor passes the check and then reloads the page, opens it in another tab, or goes back to it: the pass lives only in that page's memory, so the check is shown again.
- The emailed sign-in link is opened in another browser: no check is asked there (it finishes a sign-in already begun).
- The check service is down when a visitor opens the sign-in page, but back up when they submit: the submission is refused with "human check required", and the page shows the check again.
- A visitor with scripts turned off: the check cannot run, and the page says scripts are needed to sign in.
- The device switches between light and dark while the check is shown: the check keeps the mode it was drawn in until shown again.
- A crawler that identifies itself as a search engine is treated like any guest: it can read public pages and never receives a pass or a sign-in.
- The number of public published polls exceeds what one poll list may hold (50,000 addresses): the list is split, with an index of the parts.
- A poll's question or description contains characters that are special in page markup: they appear as text, never as markup.
- A public poll's address is requested with a different letter case or extra parameters: the canonical address names one form.
- The site is reached by an address other than the production domain: canonical addresses and the poll list still name the production domain.

## Requirements *(mandatory)*

### Functional Requirements

**Human check**

- **FR-001**: When the human check is turned on, the sign-in page, the create-account page and the invitation page MUST each open showing only the human check, with none of their form or provider buttons, in every sign-in method the site is configured for (email link, providers, or both).
- **FR-002**: Passing the check MUST switch the same page, at the same address and keeping its parameters (poll to return to, invitation details), to its sign-in form; there is no separate check page and no redirect.
- **FR-003**: The check MUST be a box the visitor ticks (not an invisible check), MUST be operable by keyboard and screen reader, and MUST be drawn in light or dark to match the device's preference.
- **FR-004**: The check, its script and all its requests MUST be served from the site's own domain; no page may make a request to a third party.
- **FR-005**: The pass MUST be held only in the page's memory until the form is submitted: never in a page address, a log, a cookie or browser storage. Reloading the page, opening it in another tab or returning to it MUST show the check again. The Cookie Use list is unchanged.
- **FR-006**: Every request that sends a sign-in email, creates an account, accepts an invitation, or starts a provider sign-in MUST carry a pass and MUST be refused, with no email sent and no account or session created, when the pass is missing, expired (older than five minutes), already used, issued for another hostname, or issued on a page that cannot make that request. A pass names the page it was issued on (sign-in, create-account or invitation) and is valid for every request that page can make: the link email and provider sign-ins from the sign-in page, accepting the invitation and provider sign-ins from the invitation page, account creation (and provider sign-ins) from the create-account page. The check MUST happen before the allowlist, the rate limit and any email.
- **FR-007**: A refusal under FR-006 MUST be a distinct "human check required" answer that the page understands and turns into a switch back to the check, keeping what the visitor typed in the form.
- **FR-008**: Requests that finish a sign-in already begun (opening the emailed link, confirming a sign-in in another browser, a provider returning) MUST NOT require a pass; a signed-in visitor MUST NOT be shown the check.
- **FR-009**: A failed check MUST show "We couldn't confirm you're a person. Please try again." with a Try again control, announced to assistive technology; after three failures in a row in the same page visit the message MUST also give `support@crowdpoll.vote`. There MUST be no lock-out.
- **FR-010**: Outcomes MUST be logged with a masked client address and the reasons the check gives, never an email address, a full address or a pass.
- **FR-011**: The check MUST run with its full set of signals (including device and browser measurements), restricted to the production hostname, with each pass bound to the client's real address as reported by the hosting platform's edge once a deployment check has confirmed which header carries that address (until then, binding stays off); its experimental blocking and its per-visitor verdict log MUST be off, and its insecure development mode MUST never be on in production.
- **FR-012**: When the check service cannot be reached, a sign-in request MUST go ahead without a check, under the existing sign-in email rate limit, allowlist and browser binding; each skipped check MUST be logged and counted in the health report. A pass the service answers as invalid MUST always be refused, and a request without a pass MUST be refused with "human check required" whenever the service is reachable.
- **FR-012a**: When the check has not loaded within 10 seconds, or reports an error, the page MUST say "The human check is unavailable right now" and show its sign-in form; a submission without a pass that the server refuses with "human check required" MUST switch the page back to the check and try loading it again.
- **FR-013**: The check service MUST run as its own service of the same application on the hosting platform, reached by browsers under a path of the site's domain, and reached by the web service privately to verify passes with a secret the browser never sees.
- **FR-014**: The check service MUST keep its short-lived state (challenges, used passes) in the site's existing shared cache, so a pass used on one instance is refused by every other; it MUST scale from one to three instances.
- **FR-015**: The check MUST be off unless configured; turning it on without its service address, site key or verification secret MUST stop the application at start-up with a message naming the missing setting. The secret MUST be kept as an encrypted setting, never in the committed deployment description.
- **FR-016**: The check's server and browser components MUST be pinned to the same exact version, the browser component MUST be served by the check service itself (never from a content network), and the two services MUST be deployed together when either changes.
- **FR-017**: The Privacy Policy MUST gain a "Bot check" section describing what is measured, why, where it is kept, for how long (at most one hour) and that it is never shared; the human check view MUST link to it.
- **FR-018**: The programming-interface description MUST show the pass field and the "human check required" refusal on each affected request.

**Search engine indexing**

- **FR-019**: Each public poll that has been published (open or closed) MUST have a poll page, readable without signing in, whose page text (without running scripts) holds the poll's question, description, choices and the results a guest may see; in a browser, the page MUST then show the live poll maximized, as a guest opening it from Trending sees it.
- **FR-020**: The poll page MUST answer "not found" for a private, draft, pending, rejected, deleted or unknown poll, identically in each case, by the site's existing access rules.
- **FR-021**: The poll page MUST NOT show who created the poll, who added a choice or who voted.
- **FR-022**: A guest opening the shared link of a public, published poll MUST be taken to its poll page; for any other poll, a guest MUST still be sent to sign in, and signed-in users MUST land as today.
- **FR-023**: The site MUST serve crawler rules allowing the home page, poll pages, the Privacy Policy and the Terms, disallowing the programming interface, admin, profile, sign-in, create-account, invitation, sign-in confirmation and terms-acceptance pages, and naming the poll list.
- **FR-024**: The site MUST serve a poll list holding the home page and every indexable poll's canonical address with its last change time, built from current data and at most 5 minutes stale; above 50,000 addresses it MUST be split into parts under an index.
- **FR-025**: Every public page MUST carry a descriptive title, a page description and a canonical address on the production domain.
- **FR-026**: Each poll page MUST carry link-preview details (title, description, address; no image, or a site image served by the site) and a machine-readable description of the question and its choices.
- **FR-027**: Sign-in, create-account, invitation, admin, profile, sign-in confirmation and terms-acceptance pages MUST ask not to be indexed.
- **FR-028**: Poll text placed in page markup MUST be escaped so it always appears as text.
- **FR-029**: Crawlers MUST never be shown the human check on any page they are allowed to visit.

### Key Entities

- **Human check pass**: proof that a browser passed the check. It names the hostname and the page it was issued on (sign-in, create-account or invitation), which decides the requests it is valid for; it lasts five minutes, may be used once, and is bound to the client's address. It is never stored by the web service.
- **Indexable poll**: a poll that is public and has been published (open or closed). Its poll page and its entry in the poll list exist only while it stays so.
- **Poll list**: the list of indexable poll addresses and the home page, each with a last change time, given to crawlers.
- **Human check service**: the separate, self-hosted service that issues challenges and passes and verifies them; it keeps only short-lived state, for at most an hour, in the site's shared cache.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of sign-in email, account creation and provider sign-in requests made without a valid pass are refused while the check service is reachable, measured by an automated test of every case in User Story 2.
- **SC-002**: A person passes the check and reaches the sign-in form in under 10 seconds in at least 95% of attempts.
- **SC-003**: No page of the site makes a request to any domain other than its own, verified on the sign-in pages (check and form) and a poll page.
- **SC-004**: An anonymous client can read the question, description and choices of 100% of public published polls from their poll pages without running scripts, and 0 private or unpublished polls.
- **SC-005**: Every indexable poll appears in the poll list within five minutes of being published, and disappears within five minutes of turning private or being deleted.
- **SC-006**: Within eight weeks of release, the search engines' own consoles report public poll pages as indexed (target: at least half of the public published polls at that time).
- **SC-007**: When the check service is stopped, sign-in still succeeds, and every skipped check appears in the logs and the health report.
- **SC-008**: The human check view passes the site's accessibility checks (keyboard operation, focus visibility, contrast, screen-reader announcement of the result) in both light and dark.

## Assumptions

- The check is friction, not a guarantee: no CAPTCHA reliably stops current AI browser agents (the chosen check's own open issue shows a stealth agent passing), so it is kept alongside the existing defences (sign-in email rate limit, pre-launch allowlist, browser binding cookie), never in their place.
- The measurements the check takes are treated as strictly necessary for security; the developer confirms that legal basis before release.
- The chosen check is FCaptcha (`@webdecoy/fcaptcha`, MIT, version 1.46.1), run in its standalone Node.js server mode, not Docker or Kubernetes.
- The site has no colour setting of its own; "matching the site's colour scheme" means the same light or dark mode as the device preference.
- Guests keep what they have today: Trending, Newest, search and opening a poll maximized, without a check.
- Votes and other signed-in actions keep their own defences (rate buckets, load shedding); the check guards only the start of a sign-in.
- Development and the automated tests run with the check off and the verification stubbed; one integration test runs against a real check service when its address is given, and skips otherwise.
- Search console registration and monitoring are done by the developer outside the site.
- The hosting platform's edge reports the real client address in a header of its own; the plan confirms which.
