# Feature Specification: Client Code Obfuscation

**Feature Branch**: `obfuscate`

**Created**: 2026-11-18

**Status**: Draft

**Input**: User description: "requirements/20261118-160304-client-code-obfuscation/requirements.md": make the code a
visitor's browser receives hard to read, by transforming the site's own scripts, style sheets and pages when a release
is built, while the source the developers work on stays readable; verify that the site works and performs as before,
keep the process repeatable and documented, and keep a simple way to release the readable files again.

## Clarifications

### Session 2026-11-18

- Q: When do the tests against the built files run? → A: By a separate command, run by hand before a release; the
  usual test command stays source-only and needs no build.
- Q: What does the build do when one of its own checks fails? → A: Both stop the build: no release goes out with an
  untransformed file in scope or with a compressed total larger than the source's.

## User Scenarios & Testing *(mandatory)*

In this document the **source** is the site's client files as the developers write them: its own scripts, style sheets
and pages. The **built site** is what a release serves to visitors. A **readable build** is a built site whose files
are the source, unchanged, as every release is today. The **transformation** is the step this feature adds to building a
release. The **switch** is the setting that turns the transformation off.

The goal is to deter casual reading and copying. No method can prevent reading: a browser must be able to run what it
receives, so a determined person can always recover what the code does. That limit is accepted.

### User Story 1 - A person inspecting the site cannot simply read its code (Priority: P1)

Someone curious about how CrowdPoll works opens the browser's developer tools on the live site. Today they find every
script, style sheet and page exactly as the developers wrote it, with its comments, its names and its explanatory
notes. After this feature they find scripts with no comments, on as few lines as possible, whose internal names are
meaningless letters and whose text strings are not readable in place; and style sheets and pages with their comments
and spacing removed.

**Why this priority**: It is the purpose of the feature.

**Independent Test**: Build a release, open any of the site's own scripts, style sheets and pages as served, and compare
each with its source: no comment survives, the scripts' internal names and text strings cannot be read in place, and no
file of these kinds is served as written.

**Acceptance Scenarios**:

1. **Given** a built site, **When** a person opens one of the site's own scripts as served, **Then** it holds no
   comments, its internal names are not the source's, and its text strings are not readable in place.
2. **Given** a built site, **When** a person opens one of the site's style sheets or pages as served, **Then** it holds
   no comments and no spacing beyond what it needs, and its class names, ids, text and structure are the source's.
3. **Given** a built site, **When** a person asks for a script, style sheet or page by its plain address rather than
   the address the pages refer to, **Then** they receive the same transformed file, never the source.
4. **Given** a built site, **When** a person looks for a file that maps the transformed code back to the source,
   **Then** none is served.
5. **Given** a built site, **When** a person opens the third-party library the site ships, an image, a font or an
   icon, **Then** it is the file as it is in the source.

---

### User Story 2 - Visitors notice no difference (Priority: P1)

A visitor uses the site after the release that introduces the transformation. Everything works as it did: signing in,
voting, changing a vote, adding a choice, the maximized view, the line graph, the Who voted report, search, the admin
editor, settings, the profile and the legal pages. Pages load at least as fast, and nothing feels slower, on a phone or
on a desktop, in any of the browsers people use.

**Why this priority**: A transformation that breaks or slows the site is worse than readable code; this is the
condition for releasing Story 1 at all.

**Independent Test**: On a built site, go through the checklist of the site's functions in each supported browser with
the developer tools' console open: every function works and the console shows no error; compare total download size
and two timed actions against a readable build.

**Acceptance Scenarios**:

1. **Given** a built site, **When** a visitor goes through sign in, vote, change a vote, add a choice, the maximized
   view, the line graph, Who voted, search, the admin editor, the settings and profile pages and the legal pages,
   **Then** each behaves as on a readable build and the browser reports no error.
2. **Given** a built site, **When** the same checklist is run on the current versions of Chrome, Edge, Firefox and
   Safari on a desktop, Safari on an iPhone and Chrome on an Android phone, **Then** the result is the same on all six.
3. **Given** a built site and a readable build of the same source, **When** the compressed size of all scripts, style
   sheets and pages is totalled for each, **Then** the built site's total is no larger.
4. **Given** the home page with a full tab of poll cards, on a mid-range phone and on a desktop, **When** the time to
   the first usable card and the time to draw a line graph are measured on both builds, **Then** the built site is no
   more than 10% slower on either.
5. **Given** a script that fails the size or the speed limit, **When** the release is prepared, **Then** that script is
   given a lighter transformation, and the exception is written down in the documentation.
6. **Given** the legal pages on a built site, **When** a visitor or a search engine reads them, **Then** their text,
   headings, dates and in-page links (such as the link to the cookie section) are as on a readable build.
7. **Given** a visitor who used the site before the release, **When** they return after it, **Then** their browser
   fetches the new files without any action from them and without showing a mix of old and new files.

---

### User Story 3 - Developers keep working on readable code (Priority: P2)

A developer changes a script, runs the site locally and runs the tests. Nothing about that changes: the files they
edit are readable, the local site serves them as written, and the existing tests read them as written. The
transformation happens only when a release is built, with no extra step for the developer to remember.

**Why this priority**: The feature must not make everyday development slower or harder; it is what keeps the feature
maintainable after its first release.

**Independent Test**: With the feature in place, start the local development site and open a script in the browser: it
is the source, comments included. Run the existing test suites: they pass without building anything. Build a release
with the usual command and nothing else: the built site is transformed.

**Acceptance Scenarios**:

1. **Given** the feature is in place, **When** a developer runs the local development site, **Then** every file is
   served as written.
2. **Given** the feature is in place, **When** a developer runs the existing test suites, **Then** they run against the
   source and need no build.
3. **Given** a developer builds a release with the usual command, **When** the build finishes, **Then** the built site
   is transformed without any further command, and the build reports that it was and the compressed totals before and
   after.
4. **Given** a release is deployed with the usual deploy command, **When** it goes live, **Then** it serves the
   transformed files; the transformation needs no step of its own in a release.
5. **Given** a built site, **When** a developer runs the separate command that tests the site's client behaviour
   against the built files, **Then** the tests pass as they do against the source.
6. **Given** the source has not changed, **When** it is built twice, **Then** the two built sites are identical, file
   for file.

---

### User Story 4 - Release the readable files again when something goes wrong (Priority: P2)

After a release, something misbehaves in production and the transformation is suspected, or a problem needs to be
examined in a visitor's browser with readable code. The person responsible for releases turns the switch off and
deploys again. The site now serves the readable files, with no change to any code, and turning the switch back on and
deploying restores the transformation.

**Why this priority**: It is the safety net that makes the first release low-risk, but it is used only when something
has already gone wrong.

**Independent Test**: Set the switch to off, build and deploy: every served file equals its source. Remove the
setting, build and deploy: the files are transformed again.

**Acceptance Scenarios**:

1. **Given** the switch is not set, **When** a release is built, **Then** the transformation is applied.
2. **Given** the switch is set to `off`, **When** a release is built, **Then** the built site is a readable build and
   the build reports that the transformation was off.
3. **Given** the switch is set to `on`, **When** a release is built, **Then** the transformation is applied.
4. **Given** the switch is set to anything else, **When** a release is built, **Then** the build stops with a message
   naming the switch and its accepted values, and nothing is released.
5. **Given** a release with the switch off follows a release with it on, or the reverse, **When** visitors return,
   **Then** their browsers fetch the other set of files without any action from them.
6. **Given** a developer wants a readable build on their own machine, **When** they build with the switch off,
   **Then** they get one.

---

### User Story 5 - Trace a production error back to the source (Priority: P3)

A visitor reports an error, and the browser's message points to a position in transformed code. A developer rebuilds
the same version of the site on their own machine, asking the build for its private mapping files, and uses them to
find the line of source the error came from. The mapping files stay on the developer's machine.

**Why this priority**: It is needed only when a production error occurs and cannot be reproduced on the readable
source; Story 4 is the fallback.

**Independent Test**: Build a released version locally with the mapping option: the built files are identical to the
released ones, mapping files appear in a folder outside the built site that is excluded from version control, and a
position in a built script resolves to the right source line.

**Acceptance Scenarios**:

1. **Given** a released version of the source, **When** a developer builds it locally, **Then** the built files are
   identical to the released ones.
2. **Given** a local build made with the mapping option, **When** it finishes, **Then** mapping files exist outside the
   built site, in a folder excluded from version control, and none exists inside the built site.
3. **Given** a build made without the mapping option, **When** it finishes, **Then** no mapping file is written
   anywhere.
4. **Given** a release build, **When** it is deployed, **Then** no mapping file is published.

---

### Edge Cases

- **A script cannot be transformed** (for example, it uses a construct the transformation does not handle): the build
  stops and names the file; a release never mixes transformed and readable files of the kinds in scope.
- **The tools the transformation needs are not installed** when a release is built with the switch on: the build stops
  with a message saying so; it does not fall back silently to a readable build.
- **A file whose transformed form equals its source**: the build stops and names the file; the only file excused is an
  empty one, which has nothing to transform.
- **The compressed total of a transformed build is larger than the source's**: the build stops and reports both totals;
  the remedy is a lighter transformation for the scripts that grew most (FR-020), or, to release at once, the switch.
- **The pages' placeholders**: the legal pages' "last updated" dates and each page's references to its scripts, style
  sheets, icons and images are filled in when a page is served; they must be filled in on a built site exactly as on a
  readable build.
- **Names other files rely on**: the names scripts share with each other, with the pages and with the server's
  responses are the same on a built site as in the source, so every script works with every other whatever order they
  were built in.
- **Class names and ids built while the page runs**: because class names and ids are not changed, a name a script
  assembles from parts still matches its style rule.
- **Poll notes and invitation messages**: user-written text reaches the page through the same safe paths as before;
  the transformation changes how the code reads, not what it does.
- **The third-party library** the site ships is already compact and is another project's code: it is served unchanged.
- **The first release with the feature**: every script and style sheet is fetched once more by every returning
  visitor; this is expected and happens once.
- **A stricter content policy added later**: the built site must keep working when the site later forbids code created
  from text while the page runs.

## Requirements *(mandatory)*

### Functional Requirements

**What is transformed**

- **FR-001**: Building a release MUST transform every one of the site's own scripts, style sheets and pages that sit at
  the top level of the client folder, and nothing else.
- **FR-002**: Each of the site's own scripts MUST be served with its comments and unneeded spacing removed, its
  internal names replaced by short meaningless ones, and its text strings moved out of place into an encoded table.
- **FR-003**: The transformation of scripts MUST NOT rearrange the order in which a script's steps run into an
  artificial form, add code that does nothing, add code that resists being formatted or inspected, add code that
  interferes with the developer tools, or tie the code to a web address.
- **FR-004**: Every script MUST receive the same transformation, the scripts that support the human check and the
  detection of multiple accounts included; the only exception is a script given a lighter one under FR-020.
- **FR-005**: Each style sheet and each page MUST be served with its comments and unneeded spacing removed; class names,
  ids, text, headings, links and structure MUST NOT change.
- **FR-006**: The third-party library the site ships, and every image, icon, font and vector graphic, MUST be served
  unchanged.
- **FR-007**: Names that scripts share with other scripts, with the pages or with the server's responses MUST be the
  same on a built site as in the source.
- **FR-008**: The placeholders a page carries until it is served (the legal pages' dates, and each page's references to
  its scripts, style sheets, icons and images) MUST be filled in on a built site exactly as on a readable build.

**What is served**

- **FR-009**: Each file MUST be transformed once, and the same transformed content MUST be served at the file's plain
  address and at the versioned address the pages refer to.
- **FR-010**: The versioned address of a file MUST be derived from its transformed content, so that a change in the
  transformation, like a change in the source, gives the file a new address.
- **FR-011**: A built site MUST NOT contain a readable copy of any transformed file, or any file that maps transformed
  code back to the source.
- **FR-012**: The build MUST check, when the transformation is on, that no script, style sheet or page of the kinds in
  scope in the built site is identical to its source; if one is, the build MUST stop and name it. An empty file is
  excused.

**When it runs**

- **FR-013**: The transformation MUST run as part of the usual command that builds a release, with no separate step, so
  that every release made the usual way is transformed.
- **FR-014**: The local development site and the existing test suites MUST keep using the source as written.
- **FR-015**: Building the same source twice MUST produce identical built files.
- **FR-016**: The build MUST report whether the transformation was applied, and the compressed total size of the
  scripts, style sheets and pages before and after. When the transformation is on and the total after is larger than
  the total before, the build MUST stop.
- **FR-017**: If any file in scope cannot be transformed, the tools the transformation needs are missing while it is
  on, or a check of FR-012 or FR-016 fails, the build MUST stop with a message naming the cause, and MUST NOT produce a
  partly transformed site; a stopped build releases nothing.

**Verification**

- **FR-018**: The tests of the site's client behaviour MUST be runnable against the built files as well as the source,
  and MUST pass on both. The run against the built files MUST be a separate command, run by hand before a release; the
  usual test command MUST stay source-only and need no build, and the release build MUST NOT run tests.
- **FR-019**: The build's output MUST be checked so that every built script is valid and every reference in every page
  resolves to a file of the built site.
- **FR-020**: A script whose transformation makes the site miss the size limit (SC-003) or the speed limit (SC-004)
  MUST be given a lighter transformation, down to the removal of comments, spacing and internal names only, and the
  exception MUST be recorded in the documentation.
- **FR-021**: A written checklist MUST exist for checking a built site by hand: sign in, vote, change a vote, add a
  choice, the maximized view, the line graph, Who voted, search, the admin editor, the settings and profile pages and
  the legal pages, with no error reported by the browser; it MUST be run on the current versions of Chrome, Edge,
  Firefox and Safari on a desktop, Safari on an iPhone and Chrome on an Android phone.
- **FR-022**: The built files MUST use no language feature newer than the source uses, and none older by conversion:
  the transformation neither raises nor lowers the level of the language.

**Security**

- **FR-023**: The source MUST be reviewed once for keys, tokens, addresses and internal notes that should not be
  public; anything found MUST be removed from the source, not left for the transformation to hide.
- **FR-024**: Every rule the server enforces today MUST stay enforced by the server; no check may move to the browser
  or depend on the code being hard to read.
- **FR-025**: A built site MUST make no request to a third party that a readable build does not make, and MUST NOT
  create code from text while a page runs.
- **FR-026**: The tools the transformation uses MUST be installed for building only, at exact recorded versions: the
  feature MUST add no package to what the running site installs, and the running site MUST never load a build tool.
  (One of them is already present beside the running site because an existing run-time package brings it; that does
  not change.)

**Reverting and debugging**

- **FR-027**: A single setting, `ENV_OBFUSCATE_ASSETS`, MUST control the transformation, for every build wherever it is
  made: `on` or not set applies it, `off` produces a readable build.
- **FR-028**: Any other value of the setting MUST stop the build with a message naming the setting and its accepted
  values.
- **FR-029**: The setting MUST be read only when a release is built; the running site MUST NOT read it or depend on it.
- **FR-030**: The setting MUST be left unset in the production configuration, so that releases are transformed unless
  someone deliberately sets it to `off`.
- **FR-031**: Reverting MUST need nothing more than setting the switch to `off` and deploying the usual way; restoring
  MUST need nothing more than removing the setting and deploying.
- **FR-032**: A developer MUST be able to ask a local build for mapping files that relate transformed code to the
  source; they MUST be written to a folder outside the built site that is excluded from version control, and MUST
  never be written by a build that did not ask for them, or published.

**Documentation**

- **FR-033**: The project's architecture and developer documents MUST describe the method, its settings, the switch,
  its limits (including that it deters and does not prevent reading), any script given a lighter transformation, and
  how to trace a production error back to the source.
- **FR-034**: The switch MUST be listed with the project's other settings, marked as one read when a release is built.

### Key Entities

- **Source file**: one of the site's own scripts, style sheets or pages as written; readable, kept under version
  control, never altered by the transformation.
- **Built file**: the form of a source file a release serves; reachable at a plain address and at a versioned address
  derived from its content.
- **Readable build / transformed build**: the two forms a built site can take, chosen by the switch.
- **The switch** (`ENV_OBFUSCATE_ASSETS`): `on`, `off` or not set; read when a release is built.
- **Mapping file**: relates positions in a built script to the source; exists only on a developer's machine, only on
  request.
- **Exception**: a script given a lighter transformation because of the size or the speed limit, recorded in the
  documentation with its reason.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a transformed build, 100% of the site's own scripts, style sheets and pages in scope differ from their
  source, none contains a comment from its source, and no file relating built code to the source is served.
- **SC-002**: Every item of the function checklist passes, with no error reported by the browser, in each of the six
  supported browsers, on a transformed build.
- **SC-003**: The compressed total size of the scripts, style sheets and pages of a transformed build is no larger than
  that of a readable build of the same source.
- **SC-004**: On the home page with a full tab of cards, the time to the first usable card and the time to draw a line
  graph are each no more than 10% slower on a transformed build than on a readable build, on a mid-range phone and on a
  desktop.
- **SC-005**: Every automated test that passes against the source passes against the built files.
- **SC-006**: A release is switched between transformed and readable by changing one setting and deploying once, with
  no change to any code, in the time one deployment takes.
- **SC-007**: Two builds of the same source are identical in every file.
- **SC-008**: A developer who has only the documentation can build a readable copy, build a transformed copy, and
  resolve a position in a built script to its source line, without help.
- **SC-009**: A developer's everyday loop is unchanged: starting the local site takes no additional step or time, and
  the existing test suites are unchanged and need no build. The new suite that checks the build is part of the usual
  test run, builds the site's own files at most twice (the second to show that builds are identical), and adds
  no more than 20 seconds to it.
- **SC-010**: The one-time review of the source finds no key, token or private address left in any file served to
  visitors.

## Assumptions

- The requirements document and its report (`requirements/20261118-160304-client-code-obfuscation/`) are the source of
  the decisions here; its 14 findings are resolved, and where this specification is silent, they apply.
- The method chosen there for scripts is to shorten them and rename their internal names, then apply the open-source
  tool `javascript-obfuscator` at its lightest setting (an encoded table of text strings). Planning measured that the
  table with the tool's usual wrapper, rotation and shuffling makes the compressed total 1.9% larger than the source,
  which the size limit forbids; the table is therefore used without them (8.3% smaller than the source), which still
  meets FR-002 and FR-003. The choice of the tools that shorten scripts, style sheets and pages is left to planning.
- Public tools can undo the encoded table of strings, leaving the shortened code; the lost comments and internal names
  cannot be recovered. This is the accepted level of protection, and stronger or commercial protection is out of scope.
- Renaming class names and ids, and combining the scripts into one file, are out of scope.
- "Top level of the client folder" matches what a release gives versioned addresses to today; files in its subfolders
  (the third-party library, the sign-in providers' logos, the fonts) are served unchanged.
- The server code, the service's interface for other programs, the database, cookies and stored values do not change,
  and no setting other than the switch is added.
- The existing tests that read the source text of style sheets and scripts (for example, the ones that pin the order of
  the style sheets) keep reading the source; they are not among the tests run against the built files.
- "Mid-range phone" and "desktop" are the devices the earlier features' device checklists used; the timed comparison is
  made by hand, once before the first release and again whenever the transformation's settings change.
- Releases keep being built by the hosting platform from the main branch and started with the usual deploy command; the
  platform makes the setting available while it builds, as it already does for the other settings the build reads.
- The site is still limited to invited testers, so the one extra download of every file after the first transformed
  release affects few people.
- The documentation is written after the implementation, in the project's existing documents, as the project's rules
  require; the README is touched only if how to build or run the site changes for its readers.
