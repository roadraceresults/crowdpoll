# Feature Specification: Social Login Avatar

**Feature Branch**: `social-login-avatar`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "requirements/20261105-161242-social-login-avatar/requirements.md"

## Clarifications

### Session 2026-11-05

- Q: How should the "Logged in as" message behave? → A: A snackbar at the top of the screen (moved from the bottom by TWEAK06) for about 6 seconds, announced politely to screen readers, with no action.
- Q: When should the Accept Terms page show "Logged in as"? → A: Always, with the address, however the person logged in.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See my Google profile picture (Priority: P1)

A person who logs in with Google sees their own Google profile picture where the default avatar appears today: the header button and the Profile card. They do nothing extra, and CrowdPoll asks Google for no permission beyond what it asks for now.

**Why this priority**: It is the purpose of the feature, and the only story that changes what a logged-in user sees all the time.

**Independent Test**: Log in with a Google account that has a photo, and confirm that the photo appears in the header and on the Profile card, and that the page requests nothing from any Google address.

**Acceptance Scenarios**:

1. **Given** a new person with a Google photo, **When** they log in with Google, **Then** their photo appears in the header button and on the Profile card.
2. **Given** an existing account still showing the default avatar, **When** its owner next logs in with Google, **Then** their photo replaces the default avatar.
3. **Given** a person whose photo has changed at Google, **When** they next log in with Google, **Then** the new photo appears.
4. **Given** a person whose Google picture has not changed, **When** they log in with Google, **Then** the stored picture is left as it is.
5. **Given** a Google account with no photo of its own, **When** its owner logs in, **Then** whatever Google supplies, including its coloured letter, is shown.
6. **Given** a person logged in with Amazon, Apple, Microsoft or an emailed link who has never logged in with Google, **When** a page shows their avatar, **Then** it is the default avatar.

---

### User Story 2 - Know what is shared before logging in (Priority: P2)

A person about to log in with a provider can read, with the provider buttons, what that provider shares with CrowdPoll, and can follow a link to the Privacy Policy. This matters most for Amazon, whose own screen did not list what is shared.

**Why this priority**: People should be told before their data is shared, and CrowdPoll can neither tell in advance whether this is someone's first login nor rely on Amazon's screen to say it.

**Independent Test**: Open the Login page with Google and Amazon configured, and read the sentence under each button. Remove one provider's configuration, and confirm it is no longer named.

**Acceptance Scenarios**:

1. **Given** Google and Amazon are configured, **When** a person opens a page with provider buttons, **Then** they read that Google shares their name, email address and profile picture, and that Amazon shares their name and email address, and the page links to the Privacy Policy.
2. **Given** a provider is not configured, **When** the page is shown, **Then** the page does not name that provider.
3. **Given** a returning person, **When** they open the page, **Then** it is shown to them as well.
4. **Given** login by emailed link only, **When** the page is shown, **Then** nothing about what is shared appears.

---

### User Story 3 - Know which account I logged in with (Priority: P2)

A person who has just logged in with a provider is told the email address of the account in use, so someone with several accounts can see at once if they picked the wrong one. Amazon's dialog cannot be changed by CrowdPoll, so this appears on CrowdPoll's own pages after the provider answers.

**Why this priority**: Amazon's dialog shows only a name, and today the address is visible only by opening the avatar menu or the Profile page.

**Independent Test**: Log in with Amazon, first with a new account and then with an account that has already accepted the Terms, and confirm the address is shown each time. Log in with an emailed link as an account that has not accepted the Terms, and confirm the Accept Terms page shows it too.

**Acceptance Scenarios**:

1. **Given** a logged-in person who has not accepted the current Terms, however they logged in, **When** the Accept Terms page opens, **Then** it shows "Logged in as" and their email address.
2. **Given** a person logging in with a provider who has accepted the current Terms, **When** the first page opens, **Then** a snackbar at the top of the screen shows "Logged in as" and their email address for about 6 seconds, is announced politely to screen readers, and offers no action.
3. **Given** that message has been shown, **When** the person reloads or moves to another page, **Then** it does not appear again.
4. **Given** a person logging in with an emailed link, **When** the first page opens, **Then** the message does not appear.

---

### User Story 4 - An honest Privacy Policy, accepted once (Priority: P3)

The Privacy Policy states that CrowdPoll keeps the profile picture Google shares, replacing its promise that no picture is kept. Every account accepts the new version once.

**Why this priority**: It is required before release, since the feature reverses an explicit promise, but it does not depend on the other stories' behaviour.

**Independent Test**: Read the Privacy Policy, and log in with an account that accepted the previous version.

**Acceptance Scenarios**:

1. **Given** the released site, **When** a person reads the Privacy Policy, **Then** "We keep no picture" is gone, and it states that CrowdPoll keeps the profile picture Google shares.
2. **Given** the released site, **When** a person reads the list of service providers, **Then** Google's row names the name, email address and profile picture.
3. **Given** an account that accepted the previous version, **When** its owner next visits, **Then** they are asked to accept the new version once, and no 30-day notice email is sent.
4. **Given** the released site, **When** a person reads the sentence on the avatar being shown with polls and votes, **Then** it is unchanged.

---

### User Story 5 - My picture goes when my account goes (Priority: P3)

A person who deletes their account, or whose picture is replaced, leaves no copy behind, even if the removal fails at first.

**Why this priority**: It keeps the Privacy Policy's promise on deletion. It happens rarely, but nobody could find a photograph left behind in order to remove it.

**Independent Test**: Delete an account that has a picture, and confirm that the picture's address stops working once any cached copy expires. Repeat with the storage failing at first, and confirm that the removal succeeds later.

**Acceptance Scenarios**:

1. **Given** an account with a stored picture, **When** it is deleted, **Then** the picture is removed from storage.
2. **Given** a picture replaced by a newer one, **When** the replacement is complete, **Then** the older picture is removed from storage.
3. **Given** storage cannot be reached at the time of removal, **When** it can be reached again, **Then** the removal is retried until it succeeds, with no action from anyone.

---

### Edge Cases

- A Google login supplies no picture: the account keeps what it has.
- The picture cannot be fetched in time, is too large, is of a refused type or comes from an unexpected address: the login completes normally and the account keeps what it has.
- File storage fails while saving the picture: the login completes normally and the account keeps what it has.
- File storage is not configured, as in development: the account keeps the default avatar and the login is unaffected.
- A person logs in with Amazon or an emailed link after Google: the stored picture stays, however long ago the Google login was.
- A person chose the wrong Amazon account: they see the address after logging in, and can sign out and change account at Amazon. CrowdPoll cannot offer a choice of account on Amazon's page.
- A session is already open when the picture changes: it shows the new picture the next time it reads the profile.
- A refused or failed fetch appears in the logs without the picture's address.

## Requirements *(mandatory)*

### Functional Requirements

**Retrieving and showing the picture**

- **FR-001**: The system MUST, at every login with Google that supplies a picture, fetch that picture on the server. No new permission is requested from Google.
- **FR-002**: The system MUST replace the stored picture only when the fetched image differs from it.
- **FR-003**: The system MUST show the stored picture wherever the default avatar is shown to its owner today: the header button and the Profile card. Those are the only places it is shown in this feature.
- **FR-004**: The system MUST show the default avatar to any account with no stored picture, including accounts using only Amazon, Apple, Microsoft or an emailed link.
- **FR-005**: The system MUST NOT change a stored picture on any login other than a Google login that supplies a picture.
- **FR-006**: The system MUST store and show whatever Google supplies for an account with no photo of its own, without trying to detect it.
- **FR-007**: Pages MUST NOT request the picture from Google or from any address outside CrowdPoll's own hosting.

**Limits and failure**

- **FR-008**: The system MUST fetch a picture only over a secure connection from Google's picture host, and MUST NOT follow a redirect elsewhere.
- **FR-009**: The system MUST give up on fetching and storing a picture after about 3 seconds in all.
- **FR-010**: The system MUST accept only a PNG, JPEG or WebP image of at most about 256 KB, judged by the file's contents and not by what it is labelled, and MUST refuse SVG.
- **FR-011**: A failure at any step of retrieving or storing a picture MUST NOT stop or fail the login, and MUST leave the account's current avatar in place.
- **FR-012**: Logs MUST NOT contain the address the picture was fetched from.

**Storage**

- **FR-013**: The system MUST store the image in the site's file storage and serve it through its content delivery network, with the account holding a reference to it.
- **FR-014**: Each stored image MUST have a new address that cannot be guessed, and storage MUST NOT allow its contents to be listed.
- **FR-015**: When file storage is not configured, the account MUST keep the default avatar, and the application MUST run normally.
- **FR-016**: The profile information given to the logged-in user MUST carry the address their pages use to show the picture, so that the existing pages keep working without a change in how they display it.
- **FR-017**: A change of an account's picture MUST take effect on that account's open sessions the next time they read the profile.

**Removal**

- **FR-018**: Deleting an account, or replacing its picture, MUST record the image for removal as part of the same change, so that it cannot be lost.
- **FR-019**: The system MUST remove recorded images from storage in the background, retrying until it succeeds.

**Informing the user**

- **FR-020**: Wherever provider buttons appear, the system MUST show, to every visitor, what each configured provider shares, and a link to the Privacy Policy. The Login card MUST show it per FR-035, and the invitation card as one short line under its buttons. Google: name, email address and profile picture. Amazon, Apple and Microsoft: name and email address.
- **FR-021**: The Accept Terms page MUST always show "Logged in as" and the account's email address, however the person logged in.
- **FR-022**: After a provider login that does not reach the Accept Terms page, the first page MUST show a snackbar at the top of the screen, over the header if need be, with "Logged in as" and the email address, once only, for about 6 seconds, announced politely to screen readers and with no action.
- **FR-023**: The message of FR-022 MUST NOT appear after a login by emailed link.

**Privacy Policy**

- **FR-024**: The Privacy Policy MUST replace "We keep no picture" with a statement that CrowdPoll keeps the profile picture Google shares, naming Google alone as the source of a picture. It MUST also say that the copy is at an address that cannot be guessed and is given only to its owner, though anyone holding that address could load it; that on deleting the account it is removed within minutes, while a cached copy can last up to a day; and that cached copies may be held outside Canada.
- **FR-025**: The Privacy Policy's list of service providers MUST say that Google shares the name, email address and profile picture. No new provider row is added.
- **FR-026**: The Privacy Policy's sentence on the avatar being shown with polls and votes MUST stay as written.
- **FR-029**: The Profile page MUST have no Your Data section. The Privacy Policy's "Delete your account" MUST be a link that opens the delete dialog on the Profile page.
- **FR-030**: A logged-in user's avatar in the header MUST show a down icon to its right, to indicate that it opens a menu.
- **FR-031**: On every page, the Back to top button MUST sit at the bottom left of the site's container, with the background `#3A8C5D`.
- **FR-032**: The site's footer MUST show logged-in users a Delete Account link that opens the delete dialog, on every page, and MUST NOT show it to guests.
- **FR-033**: The Stay logged in choice MUST apply to every way of logging in, including a provider login, and MUST be available before a provider button is used, with no address typed.
- **FR-034**: The site MUST say "Log in" in place of "Sign in", except in the provider-set button wording of contract C12.
- **FR-035**: On the Login card with provider buttons, each provider's sentence on what it shares MUST sit directly under its own button, with no link, and the Stay logged in choice and the "By logging in" line MUST sit above the buttons.
- **FR-036**: The notice asking an existing account to accept again MUST name the documents whose date is later than the version that account accepted: the Terms of Service, the Privacy Policy, or both.
- **FR-037**: A page reload MUST be enough to accept a newly changed document, with no wait and no new login.
- **FR-038**: The Accept Terms card's agreement MUST also name Cookie Use, with a link to the Privacy Policy's Cookie Use section, and MUST show the logged-in address in bold.
- **FR-039**: Every "delete your account" in the Privacy Policy MUST be a link that opens the delete dialog, and the Privacy Policy and Terms of Service MUST show only "Last Updated YYYY-MM-DD" at the top, from one source for each document's date.
- **FR-040**: The Privacy Policy MUST make the statements of contract C14 on cookies, poll update emails, invited users, the basis for using data, mail, and advertisers.
- **FR-041**: The Terms of Service MUST make the statements of contract C15 on liability, stopping the service and changes to the Terms.
- **FR-027**: The release MUST take a new Terms version, its release date, so that every account accepts once. No 30-day notice email is sent.

**Verification**

- **FR-028**: The feature's quickstart MUST include a manual check: remove CrowdPoll's access at Amazon and at Google, delete the test account on CrowdPoll, log in again, and record what each provider's screen shows.

### Key Entities *(include if feature involves data)*

- **Profile picture**: an image belonging to one account, with its type and a way to tell whether a newly fetched image differs. It is reachable by an address that cannot be guessed. An account has at most one current picture.
- **Account**: already exists; it gains a reference to its current picture, or keeps the default avatar.
- **Picture awaiting removal**: a record of an image no longer in use, because the account was deleted or the picture replaced. It exists until the image has been removed from storage.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a Google login, a person with a Google picture sees it on the first page they reach, in 100% of logins where the picture could be fetched and stored.
- **SC-002**: A failure to retrieve a picture causes 0 failed logins, and delays a login by no more than about 3 seconds.
- **SC-003**: Pages showing a picture make 0 requests to any address outside CrowdPoll's own hosting.
- **SC-004**: Every person who reaches a page with provider buttons can read what each configured provider shares without opening anything.
- **SC-005**: A person logging in with a provider sees the address of the account in use on the first page they reach, without opening a menu, in 100% of provider logins.
- **SC-006**: After an account is deleted, its picture is no longer available once any cached copy has expired, even if storage was unavailable at the time of deletion.
- **SC-007**: Every account accepts the new Terms version exactly once.

## Assumptions

- The decisions behind this specification are recorded in `requirements/20261105-161242-social-login-avatar/requirements-report.md` (20 findings, all resolved), with the Decisions section of the requirements overriding that report's sections 1, 2 and 3 and its TD3 where they differ.
- Amazon's login supplies no picture, so Amazon accounts keep the default avatar. CrowdPoll applies separately to Amazon's Data Portability programme, and nothing for it is built in this feature.
- Apple and Microsoft are out of scope for pictures, and adding them later is not precluded.
- Showing avatars to other users, on polls and votes, is a future requirement; until then the Privacy Policy's sentence overstates who sees the picture. A picture's address works for anyone who holds it, and this feature gives it only to the picture's owner.
- There is no control for removing or uploading a picture: it changes when changed at Google, and goes when the account is deleted.
- A cached copy of a removed picture lasts until it expires; one day is the chosen limit, and how the content delivery network honours it is checked before release.
- Deleting a CrowdPoll account does not withdraw its permission at the provider, as today.
- Google's picture host is not documented, so it is checked against a real login before release; how a login of an existing account exposes the picture was confirmed at plan time.
- The picture cannot be seen in development without file storage configured; automated tests stand in for the storage.
