# Feature Specification: Email Logo With Speech Bubble

**Feature Branch**: `20261112-175743-EMAIL-LOGO`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "requirements/20261112-175743-email-logo/requirements.md": the logo in the header of
CrowdPoll's emails shows only the two figures, the mark the favicon uses. Give it the brand's speech bubble around the
figures, drawn the same way as the link-preview logo, at high quality and a slightly larger size.

## User Scenarios & Testing *(mandatory)*

Every email CrowdPoll sends opens with a green header bar holding the logo and the word "CrowdPoll". The logo there is
the favicon's mark, the two figures without the speech bubble that the site header and the link previews show. After
this feature the email logo is the full brand mark, so a recipient sees the same logo in the email as on the site and in
a shared link's preview. The developer who maintains the brand images makes the new image with the same hand-run
command that already makes the favicon and the link-preview image.

### User Story 1 - A recipient sees the full brand logo in an email (Priority: P1)

A person receives a poll invitation (or any other CrowdPoll email), opens it, and sees in the header the two figures
inside the white speech bubble, as on the site, crisp on a high-density phone screen.

**Why this priority**: It is the visible outcome the feature exists for.

**Independent Test**: Render or send an invitation email and open it in a mail client on a 3× screen: the header shows
the figures inside the speech bubble at 56 × 56 px, with sharp edges, beside the word "CrowdPoll".

**Acceptance Scenarios**:

1. **Given** the new logo is deployed, **When** a recipient opens a poll invitation, **Then** the header shows the
   figures inside the speech bubble, 56 × 56 px, to the left of the word "CrowdPoll".
2. **Given** the new logo is deployed, **When** a recipient opens a login-link, create-account, email-change
   verification, email-change notice, account-deleted or invitation-reminder email, **Then** its header shows the same
   logo at the same size.
3. **Given** a mail client that shows images at 3× density, **When** the email is opened, **Then** the logo's outline
   and figures are drawn from a 168 × 168 px image, not enlarged from a smaller one.
4. **Given** a mail client that blocks images, **When** the email is opened, **Then** the alternative text "CrowdPoll"
   shows in the logo's place, as today.

---

### User Story 2 - The developer regenerates the email logo with the existing brand-image command (Priority: P2)

The developer runs the hand-run command that makes the favicon and the link-preview image. It now also draws the email
logo from the link-preview logo's master drawing, checks it, and writes it; the developer reviews it in a rendered
invitation and commits it.

**Why this priority**: The image of Story 1 is made this way; without it the logo cannot be changed again later.

**Independent Test**: Run the command; the email logo is written as a 168 × 168 px image with a transparent background,
drawing the figures and the speech bubble, and the favicon and link-preview image come out as before.

**Acceptance Scenarios**:

1. **Given** the link-preview logo's master drawing, **When** the developer runs the command, **Then** the email logo
   is written from that drawing, 168 × 168 px, transparent outside the bubble.
2. **Given** a rendering that comes out the wrong size or with an opaque background, **When** the command checks it,
   **Then** it stops with a message naming the problem and does not write the email logo.
3. **Given** the command has run, **When** the developer compares the favicon images with the previous ones, **Then**
   they still show the figures only, without the speech bubble.

---

### User Story 3 - The OAuth set-up instructions describe the logo they upload (Priority: P3)

The developer setting up Google or Microsoft sign-in follows the provider set-up instructions, which tell them to upload
the email logo as the app's square logo; the instructions now describe it as the figures with the speech bubble,
168 × 168 px.

**Why this priority**: Documentation only; the logos already uploaded keep working.

**Independent Test**: Read the provider set-up instructions: the logo they name is described as it now is.

**Acceptance Scenarios**:

1. **Given** the updated instructions, **When** the developer reads the logo step, **Then** it names the email logo and
   describes it as the figures with the speech bubble, 168 × 168 px.

---

### Edge Cases

- An email sent before the deploy is opened after it: it loads the logo from the same address, so it shows the new
  logo.
- Development mail loads the logo from the production site: it shows the new logo only after the next deploy.
- A mail service's image proxy has cached the old logo: it may keep showing it for a while; nothing in the email
  changes to force a refresh.
- A mail client in dark mode recolours the green bar: the bubble's dark outline still separates it from the background.
- The browser used by the command is missing or fails: the command stops before writing anything, as it does today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every email built from the shared email layout (login link, create account, email-change verification,
  email-change notice, account deleted, poll invitation, invitation reminder) MUST show the new logo; no email keeps the
  figures-only logo.
- **FR-002**: The email logo MUST draw the two figures inside the brand's speech bubble, with the bubble's colours and
  shape as the site header and the link-preview logo draw them: a near-white (`#FAFAFA`) fill and a black outline with
  rounded joins.
- **FR-003**: The email logo MUST be drawn from the link-preview logo's existing master drawing, unchanged; no new
  master drawing is created.
- **FR-004**: The email header MUST show the logo at 56 × 56 px (it is 48 × 48 today), keeping its alternative text
  "CrowdPoll", its vertical alignment and the gap before the word mark.
- **FR-005**: The email logo image MUST be 168 × 168 px (3× its displayed size), with a transparent background outside
  the bubble.
- **FR-006**: The email logo MUST keep its current file name and web address, loaded from the configured email asset
  origin as today.
- **FR-007**: The hand-run brand-image command MUST write the email logo from the link-preview master and MUST refuse,
  with a message and without writing it, an image that is not 168 × 168 px, is not an RGBA image, or whose top-left pixel is not transparent.
- **FR-008**: The favicon images and the link-preview image MUST be unchanged by the feature; the favicon keeps the
  figures-only mark.
- **FR-009**: The provider set-up instructions MUST describe the email logo as the figures with the speech bubble,
  168 × 168 px, and say that logos already uploaded stay as they are until re-uploaded.
- **FR-010**: The project's architecture and developer documentation MUST describe the email logo's new source, size
  and resolution, and the deploy-time visibility of FR-006.
- **FR-011**: Before committing the new image, the developer MUST review the logo in a rendered invitation email, in a
  light and a dark mail theme.

### Key Entities

- **Email logo**: the square image in every email's header; drawn from the link-preview master; displayed 56 × 56 px,
  stored 168 × 168 px, transparent background; also the square logo given to OAuth providers.
- **Link-preview master drawing**: the standalone drawing of the brand logo, figures and speech bubble, already used for
  the link-preview image; now the source of two images.
- **Favicon master drawing**: the figures-only drawing; no longer the source of the email logo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the seven email kinds show the logo with the speech bubble, at 56 × 56 px, after the deploy.
- **SC-002**: On a 3× screen the logo shows no visible blur: its image has at least 3 pixels for every displayed pixel.
- **SC-003**: A side-by-side look at the email header, the site header and a shared link's preview shows the same mark
  in all three.
- **SC-004**: Regenerating all brand images takes one command, as today, with no manual image editing.
- **SC-005**: The feature changes no favicon file: the committed favicon images are the same before and after it.

## Assumptions

- The recipient's mail client loads remote images, or shows the alternative text when it does not.
- Gmail and similar image proxies may cache the old logo for a while after the deploy; no cache-busting address is
  added.
- The 8 px taller logo makes the header bar 8 px taller; nothing else in the layout moves.
- The email tests and the stored expected emails change only in the logo's width and height.
- The link-preview logo's master leaves a small margin around the bubble inside its square; the mark fills slightly less
  of the 56 px square than a cropped drawing would, which is accepted (requirements UA1).
- The brand-image command stays a hand-run developer step, outside the build.
