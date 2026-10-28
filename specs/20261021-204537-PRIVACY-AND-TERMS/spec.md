# Feature Specification: Privacy Policy, Terms of Service and Account Deletion

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "" (empty; taken to be `requirements/20261021-204537-privacy-and-terms/requirements.md`, the requirements document completed just before this command)

**Source requirements**: `requirements/20261021-204537-privacy-and-terms/requirements.md` (the requirements document, with every finding of the requirements review folded in under Decisions).
**Requirements report**: `requirements/20261021-204537-privacy-and-terms/requirements-report.md` (4 diagrams, 3 research results and 21 findings, all resolved).

## Clarifications

### Session 2026-10-21

- Q: How is an account that has not accepted the current Terms stopped? → A: Every signed-in page load redirects to an `/accept-terms` card (Accept or Sign Out); signed-in API calls answer `403 terms-required`, except accepting, signing out, reading one's own profile and reading the site configuration

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Anyone can read how CrowdPoll treats their data (Priority: P1)

A visitor, signed in or not, wants to know what CrowdPoll keeps about them before trusting it with an email address.
Every page ends with a footer linking the Privacy Policy, the Terms of Service and Cookie Use, and naming the privacy and support addresses.
The Privacy Policy opens with a short "In short" summary, then the full sections; Cookie Use is one of its sections.
The cookie banner links to Cookie Use.

**Why this priority**: Both the law and the requirements make this information a precondition of collecting any data; without it the site cannot launch.

**Independent Test**: As a guest, open each page of the site, follow each footer link, and check that the Privacy Policy and Terms open without signing in and that Cookie Use lands on the cookie section.

**Acceptance Scenarios**:

1. **Given** a guest on any page, **When** they scroll to the end, **Then** they see links to Privacy Policy, Terms of Service and Cookie Use, and the addresses `privacy@crowdpoll.vote` and `support@crowdpoll.vote`.
2. **Given** a guest, **When** they open the Privacy Policy, **Then** it loads without a sign-in, shows its version and "Last updated" date, and starts with the "In short" summary.
3. **Given** the cookie banner is showing, **When** the visitor follows its Cookie Use link, **Then** they land on the Privacy Policy's cookie section, which lists every cookie and browser storage item the site uses, with purpose and lifetime.
4. **Given** a visitor with JavaScript disabled, **When** they open the Privacy Policy or Terms, **Then** the full text is readable.

---

### User Story 2 - A new person agrees to the Terms before an account is created (Priority: P1)

On the Create Account card a person sees an unticked box "I agree to the Terms of Service and have read the Privacy Policy", with both documents linked.
Create Account stays unavailable until the box is ticked, and the service refuses an account request that does not carry the agreement.
The agreement is recorded with the version of the Terms and the time.
An account that has not agreed to the current Terms (the testers' accounts today, and every account after a later change of terms) is asked to accept them on its next visit before using any signed-in page.

**Why this priority**: The requirements make agreement a condition of creating an account; recording it is what makes it worth anything.

**Independent Test**: Try to create an account without ticking the box (refused, nothing created), then with it (account created with the version and time recorded); sign in with an older account and see the accept prompt.

**Acceptance Scenarios**:

1. **Given** the Create Account card, **When** the box is not ticked, **Then** Create Account is unavailable.
2. **Given** a request to create an account without the agreement, or with a Terms version that is not the current one, **When** it reaches the service, **Then** it is refused, no account is created and no email is sent.
3. **Given** the box is ticked and an address entered, **When** the person creates the account, **Then** the account records the current Terms version and the time of agreement.
4. **Given** a signed-in account whose recorded Terms version is missing or older than the current one, **When** it opens any page while signed in, **Then** it is redirected to the `/accept-terms` card, any signed-in action it attempts is refused (`403 terms-required`), and after Accept it returns to the page it asked for (or it may Sign Out).
5. **Given** the OAuth sign-in phase, **When** a person is on the Login card, **Then** the same agreement box is shown above the provider buttons and must be ticked before they can be used; an account the provider creates can do nothing until it accepts the current Terms.

---

### User Story 3 - A user deletes their account (Priority: P2)

A signed-in user opens their Profile page and, in a "Your Data" section, chooses Delete Account.
A dialog states what will be deleted and what will be kept, and the delete button becomes available only after they type DELETE.
The account is deleted at once; every session ends, the person is a guest on the home page, and an email confirms the deletion.

**Why this priority**: The requirements ask for it, and the Privacy Policy promises it; it follows the documents themselves.

**Independent Test**: Create an account, create a poll, vote on another user's poll, bookmark a poll; delete the account and check what remains.

**Acceptance Scenarios**:

1. **Given** the dialog is open, **When** DELETE has not been typed exactly, **Then** the delete button is unavailable.
2. **Given** the user confirms, **When** the deletion completes, **Then** their account, sessions, pending sign-in and email-change links, bookmarks, linked polls, the polls they created (with those polls' votes and search entries) and invitations naming their address are gone.
3. **Given** the user had voted on another user's poll, **When** their account is deleted, **Then** the vote still counts, but carries no address and shows as "Deleted user"; the poll's counts and results are unchanged.
4. **Given** the user was banned from a poll, **When** their account is deleted, **Then** the ban remains.
5. **Given** the deletion completed, **When** the user's other browser makes its next request, **Then** it is signed out.
6. **Given** the deletion completed, **When** the same address later creates an account, **Then** it is a new, empty account.

---

### User Story 4 - CrowdPoll keeps only what it needs, and only as long as it says (Priority: P2)

The policy's promises are true of the site: no visitor's browser contacts a third party to show a page, sessions do not keep an IP address or browser description, log lines never show a full IP address or email address, and expired records are removed on schedule.

**Why this priority**: A published policy that the site does not keep is worse than none.

**Independent Test**: Load each page and confirm every request goes to CrowdPoll's own origins; sign in and confirm the session holds no IP address or browser description; trigger a rate limit and read the log line; let records expire and run the daily removal.

**Acceptance Scenarios**:

1. **Given** any page, **When** it loads, **Then** its fonts and every other resource come from CrowdPoll itself, with no request to a font or analytics service.
2. **Given** a new session, **When** it is stored, **Then** it holds no IP address and no browser description; sessions stored before this feature have theirs cleared.
3. **Given** a sign-in or create-account rate limit is hit, **When** it is logged, **Then** the line shows a masked IP address.
4. **Given** sessions, sign-in links, email-change links and rate-limit records that have expired, **When** the daily removal runs, **Then** they are deleted.
5. **Given** vote history older than 12 months, **When** the daily removal runs, **Then** it is deleted.

---

### User Story 5 - A user knows how to reach CrowdPoll about their data (Priority: P3)

The Profile page's "Your Data" section explains how to ask for a copy of one's data (by writing to `privacy@crowdpoll.vote`, answered within 30 days) and links the Privacy Policy.
Mail to `privacy@crowdpoll.vote` reaches the operator.

**Why this priority**: Needed by law, but a rare request that needs no code beyond the explanation.

**Independent Test**: Open the Profile page, read the section, send a message to `privacy@crowdpoll.vote` and see it arrive.

**Acceptance Scenarios**:

1. **Given** a signed-in user on the Profile page, **When** they look at "Your Data", **Then** they see Delete Account, how to ask for a copy of their data, and a link to the Privacy Policy.
2. **Given** a message sent to `privacy@crowdpoll.vote`, **When** it is delivered, **Then** it arrives in the operator's inbox.

---

### Edge Cases

- A person ticks the box, then unticks it: Create Account becomes unavailable again.
- A person's account creation request is replayed by a script with an old Terms version: refused (FR-006).
- A user deletes their account while another of their tabs is mid-vote: the vote either completes before deletion (and is anonymized) or is refused as signed out; it is never stored with the address after deletion.
- A user who is an administrator deletes their account: it is deleted like any other; admin rights come from the operator's settings, so a later account with the same address is again an administrator.
- A user deletes an account whose polls other people bookmarked or have open: those polls disappear for them as a deleted poll does today.
- A user deletes their account while one of their polls is awaiting approval or being edited: the poll is deleted all the same.
- Deletion fails part-way (e.g. the database is unavailable): nothing is deleted, the user stays signed in and is told to try again.
- A user accepts the updated Terms in one tab while another tab shows the prompt: the second tab continues once reloaded.
- The cookie banner was already acknowledged: the footer's Cookie Use link still reaches the section.
- The policy's version changes while a person has the Create Account card open: their request carries the old version and is refused with a message asking them to reload.

## Requirements *(mandatory)*

### Functional Requirements

**The documents**

- **FR-001**: The site MUST publish a Privacy Policy at `/privacy` and Terms of Service at `/terms`, readable by anyone without signing in and without JavaScript, in the site's style with its header and footer.
- **FR-002**: Each document MUST show its version and its "Last updated" date; the version is a single value shared by the page and the agreement check (FR-006).
- **FR-003**: The Privacy Policy MUST open with an "In short" summary and then contain, as sections with stable anchors (at least `#cookies`, `#retention`, `#rights`, `#contact`):
  1. who operates CrowdPoll and how to reach them (`privacy@crowdpoll.vote` and a mailing address);
  2. what is collected and why, including that the email address is used to sign the person in, to send the emails they ask for and to identify them on polls they create, are invited to or vote in, never for marketing and never shown to other users (poll creators and site administrators see it), and that a poll creator may enter someone's address to invite them;
  3. the legal basis (providing the service asked for; keeping it secure);
  4. cookies and browser storage (Cookie Use): both cookies and every browser storage item, each with purpose and lifetime, all strictly necessary or functional;
  5. the service providers that process data on CrowdPoll's behalf, what each receives and where, and that data is never sold or shared for anyone else's purposes, with no advertiser, data broker or analytics company receiving anything;
  6. "no tracking" defined as no analytics, no advertising, no profiling and nothing that follows a person to other sites, with IP addresses used briefly to stop abuse;
  7. retention, as the table in FR-020;
  8. the person's rights (access, correction, deletion, complaint to the Office of the Privacy Commissioner of Canada or a local authority) and how to use them;
  9. children: accounts are for people 16 or older;
  10. future poll update emails: may be offered later, off unless turned on, each with a one-click way to stop, announced by an update to the policy first;
  11. changes to the policy.
- **FR-004**: The Terms of Service MUST contain: who may use CrowdPoll (16 or older, one account per person); the person's content (they own their polls and let CrowdPoll show them; no unlawful, hateful, harassing, sexual, spam or impersonating polls); votes and invitations (invite only people who would expect it; no manipulating results); what CrowdPoll may do (review, reject, close or remove polls, ban voters, suspend accounts); the service "as is" and limitation of liability; ending (delete the account at any time; CrowdPoll may end the service with notice); changes, governing law (the operator's province and Canada) and contact.
- **FR-005**: Until the operator supplies them, the documents MUST show the placeholders `[OPERATOR NAME]`, `[MAILING ADDRESS]` and `[PROVINCE]` visibly; the drafts are reviewed by the operator, and by a lawyer before public launch.

**Agreement**

- **FR-006**: Creating an account MUST require agreement to the current Terms version: the Create Account card shows an unticked "I agree to the Terms of Service and have read the Privacy Policy" box linking both documents, Create Account is unavailable until it is ticked, and the service refuses a request without the agreement or with another version, creating nothing and sending nothing.
- **FR-007**: The service MUST record, on the account, the Terms version agreed to and the time of agreement.
- **FR-008**: For an account whose recorded version is missing or not current, every page load while signed in MUST redirect to an `/accept-terms` card offering Accept (which records FR-007 and returns the person to the page they asked for) or Sign Out; the Privacy Policy and Terms pages stay readable. Until it accepts, every signed-in request MUST be refused with `403 terms-required`, except accepting, signing out, reading one's own profile and reading the site configuration. The check applies to existing sessions on their next request, not only to new sign-ins.
- **FR-009**: In the OAuth sign-in phase, the Login card MUST show the same agreement box above the provider buttons, which stay unavailable until it is ticked; the account may be created by the provider, but it can do nothing until it accepts the current Terms (FR-008).
- **FR-010**: The Login card MUST show a one-line link to the Terms and the Privacy Policy.

**Where the links appear**

- **FR-011**: Every page MUST end with a footer, below the content and not fixed, holding: Privacy Policy · Terms of Service · Cookie Use · `privacy@crowdpoll.vote` · `support@crowdpoll.vote` · © year CrowdPoll; it MUST stay clear of the cookie banner and wrap on a phone.
- **FR-012**: The cookie banner MUST link to Cookie Use (`/privacy#cookies`).
- **FR-013**: The footer of every email CrowdPoll sends with an action link (sign-in, create account, email-change verification) MUST link the Privacy Policy and Terms; notices (email changed, account deleted) carry no link at all.

**Account deletion**

- **FR-014**: The Profile page MUST have a "Your Data" section with Delete Account, how to ask for a copy of one's data (write to `privacy@crowdpoll.vote`; answered within 30 days), and a link to the Privacy Policy.
- **FR-015**: Delete Account MUST open a dialog stating what is deleted, anonymized and kept, whose delete button is available only once DELETE is typed exactly.
- **FR-016**: Confirming MUST, all or nothing: delete the account, its sessions, its pending sign-in and email-change links, bookmarks, linked polls, the polls it created (with their votes, history and search entries) and invitations naming its address; anonymize its votes and vote history on other people's polls (address and name replaced by a random placeholder shown as "Deleted user") so counts and results are unchanged; and keep bans naming its address.
- **FR-017**: After deletion, every session of the account MUST be ended at once (including any cached copy), the browser's session cookie cleared, the person shown the home page as a guest, and a "Your account was deleted" email sent to the address.
- **FR-018**: If deletion cannot complete, nothing MUST be deleted, and the person MUST be told to try again.
- **FR-019**: Each deletion MUST be logged with the masked address and the counts deleted and anonymized.

**Keeping only what is needed**

- **FR-020**: Data MUST be kept no longer than this, with a daily removal making it true:
  - account and profile: until deleted;
  - sessions: until signed out or expired (30 days at most);
  - sign-in and email-change links: 15 minutes;
  - rate-limit records: 15 minutes;
  - polls and votes: as long as the poll exists;
  - vote history: 12 months;
  - bookmarks: 6 months after the poll closes;
  - server logs: not stored (App Platform shows runtime logs live and retains none; no log forwarding is configured);
  - database backups: 7 days (the managed database's daily backups);
  - mail sent to CrowdPoll: until the matter is closed, at most 2 years.
- **FR-021**: Sessions MUST NOT store an IP address or browser description; those stored before this feature MUST be cleared.
- **FR-022**: Log lines MUST NOT contain a full IP address (rate-limit lines show it masked) or a full email address.
- **FR-023**: Pages MUST NOT make any request to a third party to display: the fonts are served by CrowdPoll.
- **FR-024**: The cookies and browser storage items the site uses MUST match the list in Cookie Use; an automated check fails when they differ.

**Contact**

- **FR-025**: `privacy@crowdpoll.vote` MUST deliver to the operator, as `support@crowdpoll.vote` does; there is no contact form.

### Key Entities *(include if feature involves data)*

- **Terms agreement**: on each account, the Terms version agreed to and when; missing for accounts created before this feature.
- **Document version**: one value naming the current Privacy Policy and Terms version (a date such as `2026-11-01`).
- **Anonymized vote**: a vote whose voter address and name are replaced by a random placeholder, shown as "Deleted user", still counted.
- **Retention rule**: a kind of record and the age after which the daily removal deletes it (FR-020).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From every page of the site, a guest reaches the Privacy Policy, the Terms and Cookie Use in one click, without signing in.
- **SC-002**: 100% of accounts created after launch have a recorded Terms version and time; no account can use a signed-in page without agreeing to the current Terms.
- **SC-003**: A user can delete their account in under one minute from the Profile page, and afterwards no record holds their current address except the bans that name it; rows written under an address the account had before an email change are removed on request to `privacy@crowdpoll.vote`.
- **SC-004**: Deleting an account leaves the counts and results of every other user's poll exactly as they were.
- **SC-005**: Loading any page makes zero requests to a third-party origin.
- **SC-006**: After a daily removal, no session, sign-in link, email-change link or rate-limit record older than its stated period exists, and no vote history older than 12 months.
- **SC-007**: Every item in the Cookie Use list matches what the site actually sets, checked automatically.

## Assumptions

- The audience is mainly Canadian (hosting and email in Canada), so the documents are written for PIPEDA and also meet GDPR Articles 12 and 13.
- The documents are in English only.
- The pre-launch allowlist keeps the site closed until the documents have been reviewed; nothing in this feature depends on that review.
- The operator name, mailing address and province are supplied by the developer; until then the placeholders show.
- The 16-or-older age is stated and agreed to, not verified.
- Requests for a copy of one's data are rare and answered by hand within 30 days.
- The opt-in poll update emails are not built; only the policy paragraph is.
- Adding `privacy@crowdpoll.vote` to the mail forwarding service is a manual operator step, as for `support@crowdpoll.vote`.
- The hosting provider's log retention and the database backup window are confirmed by the operator and written into the policy; the 7-day backup window is the documented default, to be verified.
