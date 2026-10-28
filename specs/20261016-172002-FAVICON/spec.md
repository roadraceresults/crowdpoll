# Feature Specification: Site Favicon

**Feature Branch**: `dev` (no dedicated branch created for this feature)

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "designDocs/20261016-172002-high-level-requirements-FAVICON.md"

**Source requirements**: `requirements/20261016-172002-site-favicon/requirements.md` (the requirements document, with every finding of the architecture review folded in).
**Architecture**: `architecture/20261016-172002-site-favicon/architecture.md` (11 findings, all resolved).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recognize the site's tab (Priority: P1)

A visitor has several browser tabs open. Today the site's tab shows the browser's blank page icon, so it looks like any other untitled page. With this feature the tab shows the site's own mark — the green figure standing in front of the red one, as in the header's brand logo but without its speech bubble — so the visitor finds the site's tab at a glance.

**Why this priority**: It is the whole point of the feature: every visitor sees it on every page.

**Independent Test**: Open each of the seven pages in a browser and look at the tab: each shows the two-figure mark instead of the blank page icon.

**Acceptance Scenarios**:

1. **Given** a visitor opens the home page, **When** the page loads, **Then** its tab shows the two-figure mark.
2. **Given** a visitor opens the sign-in, account-creation, profile, poll administration, poll results or not-authorized page, **When** it loads, **Then** its tab shows the same mark.
3. **Given** a browser tab strip in light mode or in dark mode, **When** the site's tab is shown, **Then** both figures are distinguishable against the tab background.

---

### User Story 2 - The mark stays sharp at every size (Priority: P2)

The same mark appears small in a tab, larger in a bookmark list or a history view, and at twice the pixel density on high-resolution screens. It looks crisp in each of these places rather than blurred or pixelated.

**Why this priority**: A blurry or distorted icon looks broken; it matters once the icon exists at all.

**Independent Test**: View the site's tab on a standard and a high-density screen, and in the bookmarks list: the mark is crisp in each and fills its square without distortion.

**Acceptance Scenarios**:

1. **Given** a browser that draws scalable icons, **When** it shows the site's icon at any size, **Then** the mark is crisp.
2. **Given** an older browser that only reads the traditional icon file, **When** it shows the icon at 16, 32 or 48 pixels, **Then** it uses an image made for that size.
3. **Given** the mark itself is wider than tall, **When** it is shown in the icon's square, **Then** it is centred, fills the square's width, and the background around it is transparent.

---

### User Story 3 - Responses that are not pages show it too (Priority: P3)

Some of the site's responses are not one of its seven pages: error replies, the plain-text "Not found" replies and the prototype pages. When a visitor's tab shows one of these, the browser still finds the site's icon in its usual place at the site root, instead of showing a blank page icon and logging a missing-file error.

**Why this priority**: These responses are rarely seen; the icon there is a finishing touch.

**Independent Test**: Request the icon at the site root address: it is returned successfully as an icon.

**Acceptance Scenarios**:

1. **Given** the site is running, **When** the icon is requested at `/favicon.ico`, **Then** it is returned successfully with an icon content type instead of "not found".
2. **Given** a visitor opens an address that answers with a plain-text "Not found", **When** the browser looks for an icon, **Then** it finds the site's icon at the site root.

---

### Edge Cases

- **A browser that understands both icon kinds**: it uses the scalable one; the traditional icon file is only a fallback, so the mark never appears in two different renderings on one browser.
- **The icon at its smallest (16 pixels)**: the mark keeps at most 1 pixel of space around it, so the figures stay as large as possible; the speech bubble is left out because at this size its outline would take a third of the pixels.
- **The icon file is cached**: the icons the pages link to are served under a name that changes whenever their content changes, so a new version of the mark reaches visitors on their next page load; only the root-address copy follows normal caching.
- **The mark changes later**: the traditional icon file is regenerated from the scalable mark by the same procedure, so the two never drift apart.
- **Tools that open the icon file directly** (an image viewer, a file browser): the scalable icon carries the title "CrowdPoll".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST provide its icon as two files: a scalable icon (`favicon.svg`) and a traditional icon file (`favicon.ico`). No separate single-size images are provided.
- **FR-002**: The traditional icon file MUST hold exactly three images: 16 × 16, 32 × 32 and 48 × 48 pixels.
- **FR-003**: Each of the seven pages — home, sign-in, account creation, profile, poll administration, poll results and not-authorized — MUST reference both icons in its document head, right after the viewport declaration: the scalable icon declared as such, and the traditional icon file declared with its three sizes.
- **FR-004**: The traditional icon file MUST also be available at the site root address `/favicon.ico`, so responses that do not reference it (error replies, the plain-text "Not found" replies, the prototype pages) still show the icon.
- **FR-005**: The icon MUST show the two figures of the header's brand logo — the green figure (`#3FB34F`) in front of the red figure (`#E04A4A`) — and MUST NOT include the logo's speech bubble.
- **FR-006**: The figures MUST be centred in a square, scaled to fill its width, on a transparent background, with no more than 1 pixel of space around them at 16 pixels.
- **FR-007**: The icon MUST carry no alt text; the scalable icon MUST carry the title "CrowdPoll". The pages' existing titles MUST NOT change.
- **FR-008**: The traditional icon file MUST be producible from the scalable icon by one repeatable, documented procedure, run by hand whenever the scalable icon changes, that adds no dependency and no step to the site's build. Both icon files are kept with the site's source.
- **FR-009**: The header's brand logo MUST remain unchanged.
- **FR-010**: Automated checks MUST confirm that each of the seven pages, as served, references both icons; that the root address answers successfully with an icon content type; and that the traditional icon file holds exactly the 16, 32 and 48 pixel images.

### Key Entities

- **Scalable icon**: the master drawing of the mark — the two figures in the brand colours on a transparent square, titled "CrowdPoll".
- **Traditional icon file**: a container with three fixed-size renderings (16, 32, 48 pixels) of the scalable icon, for older browsers and for the site-root address.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 7 pages show the site's mark in the browser tab; 0 pages show the blank page icon.
- **SC-002**: A request for the icon at the site root succeeds (0 "not found" responses for it), where today every such request fails.
- **SC-003**: The traditional icon file holds exactly 3 images, at 16, 32 and 48 pixels.
- **SC-004**: At 16 pixels both figures are distinguishable on a light and on a dark tab strip, judged by eye in one light-mode and one dark-mode browser.
- **SC-005**: Regenerating the traditional icon file after a change to the mark takes one documented step.
- **SC-006**: No existing page's title, layout or header logo changes; all existing automated checks still pass.

## Assumptions

- The browsers in use draw scalable icons (all current major desktop and mobile browsers do); the traditional icon file serves older ones.
- The two icon files are served the same way as the site's other static images, so the pages' references reach the versioned, long-cached copies; the root-address copy needs no new route.
- No dark-mode variant of the icon: the two brand colours read on both light and dark tab strips.
- An Apple home-screen icon (180 pixels), a web app manifest, and 192 or 512 pixel icons are out of scope; making the site installable as an app is a separate decision.
- The traditional icon file is produced with a Chromium-based browser already installed on the developer's machine (Microsoft Edge here), as the architecture review decided (finding U5); the procedure is kept with the site's development scripts.
- The mockup the appearance follows is `requirements/20261016-172002-site-favicon/favicon-mockup.jpg`.
