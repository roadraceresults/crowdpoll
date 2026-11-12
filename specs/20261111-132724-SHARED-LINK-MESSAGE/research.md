# Research: Shared Link Message

The external research — Meta's crawler and robots.txt, WhatsApp's one-line description and image rules — was done in
the requirements phase (`requirements/20261111-122415-shared-link-message/requirements-report.md`, RS1–RS3). The rest
comes from reading how the Custom Email Message (`invitation_message`, feature `20261110-160141`) and the login-page
preview (`20261110-204911`) are built. Each item gives the decision, the reason and the alternatives considered.

## R1. The new field mirrors `invitation_message` in every rule

- **Decision**: migration `021-link-preview-message` adds `polls.link_preview_message text not null default ''`
  (`src/db/schema.ts`: `link_preview_message: Generated<string>`; `PendingUpdateJson.linkPreviewMessage?`).
  `src/polls/notes.ts` exports `LINK_PREVIEW_MESSAGE_MAX = 100`. `store.ts`: `Poll.linkPreviewMessage`,
  `PendingUpdate.linkPreviewMessage`, `rowToPoll`, `FIELD_TO_COLUMN`, `pollToRow`, `NON_CONTENT_FIELDS`, and the
  approval write (`if (pending.linkPreviewMessage !== undefined) columns.link_preview_message = …`). `service.ts`:
  the new poll's `linkPreviewMessage: ""`; `validatePollFields` does
  `normalizeNotes(validateFieldLength(body.linkPreviewMessage, LINK_PREVIEW_MESSAGE_MAX, "Link preview message"))`;
  `LIMITS` gains it; `duplicatePoll` copies it. `screening.ts`: `ScreeningInput.linkPreviewMessage`, joined into the
  screened text, and the rejection sentence names ", link preview message" when it is non-empty (after the custom
  email message clause). `sweeps.ts`: both `screenWithTimeout` calls pass `notesPlainText(pending.linkPreviewMessage ??
  claimed.linkPreviewMessage)`. `pollsApi.ts`: `UPDATE_FIELDS` gains it; the pending block parks a changed value in
  `pending.linkPreviewMessage`; `buildAdminPollDetail` adds `linkPreviewMessageHtml: renderNotesHtml(…)`; the admin
  list row adds `hasLinkPreviewMessage: p.link_preview_message !== ""`; the choice-screening call passes `""`.
  `tests/helpers/poll-fixtures.ts`'s `makePoll` defaults it to `""`. `postman/openapi.json` documents it beside each
  `invitationMessage` entry (detail, pendingUpdate, save and publish bodies, the list row's flag).
- **Rationale**: spec FR-002–FR-004 and requirements UA2/UA3: the twin of the Custom Email Message for the other
  sharing mode, so every reader of one rule finds the other beside it. The projection (`projectPoll`) does not carry
  either message, so card, tab, delta and SEO payloads stay as they are without a test change.
- **Alternatives**: reusing `invitation_message` for both modes (the defect the feature fixes); a JSON column holding
  both messages (a new shape for one field; rejected for Simplicity).

## R2. The preview picks the message of the poll's sharing mode

- **Decision**: `src/seo/loginPage.ts` exports
  `previewMessageOf(row: Pick<PollRow, "poll_visibility" | "poll_sharing_mode" | "invitation_message" | "link_preview_message">): string`:
  `""` for a public poll, `invitation_message` when `poll_sharing_mode === "Invitation Only"`, else
  `link_preview_message`. `routes/pages.ts` calls
  `renderLoginPage(assets.pageHtml("login.html"), projectPoll(row), previewMessageOf(row), config.publicOrigin, config.defaultLinkPreviewMessage)`.
  The columns are read from the row as today (`selectAll`), never from `pending_update`.
- **Rationale**: FR-006 and requirements AM2: what the creator sees in Step 1 is what the card shows. Keeping the
  choice in `loginPage.ts` (requirements Technical Debt 2) puts the rule beside the description it feeds; the route
  stays a one-liner.
- **Alternatives**: choosing in the route (the rule would live apart from its tests); passing the whole row into
  `renderLoginPage` (a wider signature for the same three facts).

## R3. One line: line breaks become spaces

- **Decision**: in `linkPreviewDescription(poll, message, fallback)`, each part is
  `oneLine(text) = text.replace(/\s+/g, " ").trim()`, applied to the subtitle and to `notesPlainText(message)`; the
  non-empty parts are joined by `" - "`, the fallback is the `fallback` argument, and the 300-character cut
  (`LINK_PREVIEW_DESCRIPTION_MAX`, ellipsis inside) is unchanged.
- **Rationale**: FR-007 and RS2: WhatsApp renders the first line only; Google Messages, Slack and iMessage already
  collapse white space, so they show the same text as before. `\s+` also removes the double spaces a line break
  between words would leave.
- **Alternatives**: replacing only `\n` (leaves `\r` and runs of spaces); flattening in `notesPlainText` (changes the
  email's plain-text part and the screening input; rejected).

## R4. `ENV_DEFAULT_LINK_PREVIEW_MESSAGE`

- **Decision**: `src/config.ts`, with the other text settings:
  `const defaultLinkPreviewMessage = read.text("ENV_DEFAULT_LINK_PREVIEW_MESSAGE", "You have been invited to vote in this poll.").trim();`
  then `ConfigError` when it is empty (`Invalid ENV_DEFAULT_LINK_PREVIEW_MESSAGE: it must not be blank.`) or longer
  than 300 (`… must be at most 300 characters.`); `AppConfig.defaultLinkPreviewMessage: string`. `read.text` records
  the default in `defaultsUsed`, so the start-up log lists it with the others. The limit is the literal `300` beside
  a reference to `LINK_PREVIEW_DESCRIPTION_MAX` in the test, not an import of `src/seo` into `src/config.ts`.
  Documented in `.claude/rules/environment.md`, the README settings table and `CLAUDE_COMPLETE.md`'s table; no entry
  in `.vscode/launch.json.example`, `devScripts.example/launch-dev.ps1` or `infra/app.tf`, so the default is used
  everywhere until an operator sets it.
- **Rationale**: FR-008 and UA5; the site's configuration rule (every setting validated once, an invalid value stops
  the app). The sentence is used as given (AM3: no placeholder), escaped by `previewHeadTags` like any description.
- **Alternatives**: a `{title}` placeholder (AM3 B, rejected); applying it to `/poll/<pid>` too (AM1 B, rejected:
  `describe()` in `pollPage.ts` keeps `Vote and see live results: ${title}`).

## R5. `robots.txt`: a group for Meta's preview crawlers

- **Decision**: `ROBOTS` in `src/routes/seo.ts` becomes two groups built from one list of disallowed paths:

  ```text
  User-agent: *
  Allow: /
  Allow: /poll/
  Allow: /privacy
  Allow: /terms
  Disallow: /api/
  Disallow: /admin
  Disallow: /profile
  Disallow: /login
  Disallow: /create-account
  Disallow: /invite
  Disallow: /confirm-signin
  Disallow: /accept-terms

  User-agent: facebookexternalhit
  User-agent: meta-externalfetcher
  Allow: /
  Allow: /login
  Disallow: /api/
  Disallow: /admin
  Disallow: /profile
  Disallow: /create-account
  Disallow: /invite
  Disallow: /confirm-signin
  Disallow: /accept-terms
  Sitemap: <origin>/sitemap.xml
  ```

  `/login` is simply absent from the second group's disallows, so no parser has to rank `Allow: /login` against
  `Disallow: /login`. `meta-externalagent` (AI training) and `meta-webindexer` are not named, so they fall under `*`.
  The login page keeps `<meta name="robots" content="noindex">`.
- **Rationale**: FR-010 and RS1: Meta's crawler documentation says a disallow in robots.txt blocks it, and a
  user-agent group is the documented way to address one crawler; a crawler uses the most specific group that names
  it, so the group must repeat the other disallows.
- **Alternatives**: removing `Disallow: /login` for everyone (search engines would crawl the login page); serving a
  different page to Meta's user agents (cloaking; rejected in the previous feature).

## R6. The brand image: a static `og-image.png` rendered by the existing script

- **Decision**: `devScripts/favicon-ico.ts` gains a third output, `src/public/og-image.png`, 1200 × 630: it writes a
  temporary HTML page (white background, `og-logo.svg` — the brand logo with its speech bubble, TWEAK02; first
  `favicon.svg` — centred at 480 px tall) into its work directory and screenshots
  it with the same headless Chromium invocation at `--window-size=1200,630`, checking the PNG's dimensions as it does
  for the icons; the file is committed. `previewHeadTags({ title, headline, description, url, origin })` emits, after
  `og:url`, `<meta property="og:image" content="${origin}/og-image.png">`, `og:image:width` `1200`,
  `og:image:height` `630`, `og:image:type` `image/png`; `twitter:card` stays `summary`. `renderPollPage` and
  `renderLoginPage` both already receive `origin`. The file is served by `express.static(publicDir)` like
  `email-logo.png`, and `build-assets` copies `src/public` to `dist/public`, so the absolute address resolves in
  production without a CDN step.
- **Rationale**: FR-011 and RS3: WhatsApp's rules (≥ 300 px wide, ≤ 4:1, under 600 KB) and Meta's (1200 × 630
  recommended, width/height tags let the crawler render at once). The script already rasterizes an SVG with a
  browser the developer has, so no package is needed; a mostly white 1200 × 630 PNG is a few tens of KB.
  The spec's clarification Q1 and FR-011 were amended (analysis I1) to name this existing script; no package is added.
- **Alternatives**: a new `devScripts/og-image.ts` with a rasterizer package (a dependency for one render);
  generating the image at run time (CPU on every fetch, a cache to add); `twitter:card: summary_large_image` (changes
  X's and iMessage's layout; out of scope, the spec names no card type).

## R7. The wizard: the editor, the lists, the summary line

- **Decision**: `src/public/adminCard.js`:
  - `buildStep1`: directly under the `link` option (TWEAK03 removed `buildCopyLink()`), when `wizard.who === "link"`,
    `m3RichTextField({ key: "linkPreviewMessage", htmlKey: "linkPreviewMessageHtml", idPrefix: "pollLinkPreviewMessage-", label: "Link Preview Message", support: "Optional. Shown under the poll's title when its link is shared in a messaging app.", max: 100, editLabel: "Edit link preview message" })`;
  - the five field lists gain the pair: `storedNotes` (from the admin detail's `linkPreviewMessage` /
    `linkPreviewMessageHtml`), `wizardBase`/the snapshot copy, `wizardDirty`, `keepWizardProgress`, `wizardFields`
    (`fields.linkPreviewMessage = s.linkPreviewMessage`), `reviewNeeded`'s name list, and `canChange`'s always-editable
    text fields;
  - the summary: `linkPreviewMessagePart` with the text "A Link Preview Message has been entered", the aria label
    "Link Preview Message: change in Step 1", focusing `#pollLinkPreviewMessage-<pid>`; a line with class
    `wizard-summary-link-preview-message` after the Who line when `who === "link"` and the message has visible text
    (`s.hasLinkPreviewMessage` from the list row, else `hasVisibleText(s.linkPreviewMessageHtml)`); the line-order
    regex gains `link-preview-message`; `readOnlyAnswers` carries `hasLinkPreviewMessage`.
- **Rationale**: FR-001, FR-005, UA1, UA4: the twin of the Custom Email Message's wiring (R7 of feature
  `20261110-160141`), so each piece sits beside its twin. The message is kept when hidden because the wizard always
  sends every field it holds.
- **Alternatives**: a plain `m3TextField` (UA1 B, rejected); one shared list of text fields (the technical debt the
  requirements record; a refactor outside this feature).

## R8. Tests

- **Decision**:
  - `tests/seo.test.ts`: the robots expectation becomes the two groups (R5); the login-page describe gains an
    "Anyone With The Link" poll with `linkPreviewMessage` → `subtitle - message`; a message with line breaks and
    double spaces → one line; an "Anyone With The Link" poll holding an `invitation_message` → not shown; an
    Invitation Only poll holding a `link_preview_message` → not shown; neither subtitle nor message → the config
    default (`ctx` started with the default) and, in one test with `ENV_DEFAULT_LINK_PREVIEW_MESSAGE` set on a
    second app instance or via a config override, the operator's sentence; a public poll's login page → subtitle or
    the default; `expectPollTags` and the poll-page test assert the four `og:image*` tags with `${ORIGIN}/og-image.png`,
    and the `not.toContain("og:image")` assertion is dropped.
  - `tests/pages.test.ts`: `src/public/og-image.png` exists, its PNG header reads 1200 × 630, its size is under
    300 000 bytes, and `GET /og-image.png` is `200 image/png`.
  - `tests/config.test.ts`: the default sentence in `defaultsUsed`; a set value is trimmed and used; blank and
    301 characters throw `ConfigError` naming the setting.
  - `tests/field-limits.test.ts`: `LINK_PREVIEW_MESSAGE_MAX` is 100; save and publish accept 100 and refuse 101
    with "Link preview message must be at most 100 characters."; whitespace-only is stored as "".
  - `tests/polls-pending-update.test.ts`: a voted "Anyone With The Link" poll's change waits in `pending_update`,
    the approved column unchanged.
  - `tests/polls-screening.test.ts`: `localScreener` screens it and names "link preview message".
  - `tests/polls-admin-crud.test.ts`: Duplicate copies it; the detail returns `linkPreviewMessage` and
    `linkPreviewMessageHtml`.
  - `tests/polls-discovery.test.ts`: the secret-text sweep covers `linkPreviewMessage` too.
  - `tests/client-admin-wizard.test.ts`: the field under "Anyone you send the link to" (label, support, counter
    "n / 100"), absent under the other options; typing a message, switching to "Only people you invite" and back
    keeps it; `/save` sends `linkPreviewMessage`; the summary line and its tap; `hasLinkPreviewMessage` from the list.
- **Rationale**: IV. Goal-Driven Execution; every FR has a check that fails before the change.
- **Alternatives**: none; the manual quickstart covers what only real apps show.

## R9. Documentation

- **Decision**: `README.md` (the link-preview paragraph: the Link Preview Message, the default sentence and its
  setting, the image, Meta's apps; the settings table row), `ARCHITECTURE.md` (the Link previews bullet: mode rule,
  one line, setting, robots group, image), `.claude/rules/environment.md` (the row), `CLAUDE_COMPLETE.md` (the
  feature's block and the settings table), `CLAUDE.md` (the feature's decisions), `postman/openapi.json` (R1).
- **Rationale**: the constitution's documentation deliverables and the repository's rule that `openapi.json` follows
  the routes.

## R10. Logging

- **Decision**: unchanged: `[login] Poll preview rendered: <pid>`; the start-up settings log lists
  `ENV_DEFAULT_LINK_PREVIEW_MESSAGE` with its default through `defaultsUsed`. No title, message, link or token.
- **Rationale**: constitution V and the logging invariant.
