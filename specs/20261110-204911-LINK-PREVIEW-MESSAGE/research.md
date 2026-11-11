# Research: Link Preview Message

The external research — how Google Messages, WhatsApp and iMessage build a link preview — was done in the requirements
phase (`requirements/20261110-202128-link-preview-message/requirements-report.md`, RS1) and is summarized in R1. The
rest comes from reading the code paths `/poll/:pid` already uses. Each item gives the decision, the reason and the
alternatives considered.

## R1. The page the fetchers read is the login page; give it the tags

- **Decision**: `GET /login` (`src/routes/pages.ts`) keeps its session redirect, then, when `parsePid(req.query.PID)`
  names a poll and `isPublished(row)` holds, answers `renderLoginPage(…)` instead of `page("login.html")`. Nothing
  changes on `GET /`, `/invite`, `/poll/:pid` or in the sign-in flow.
- **Rationale**: the preview fetchers send no cookies, run no JavaScript and follow HTTP redirects (Google's
  user-triggered fetchers doc; 24ways "Microbrowsers are everywhere"; Apple's preview notes via third-party
  summaries), so a guest's `302 /?PID=… → /login?PID=…` already lands them on the login page — the requirements'
  screenshot shows Google Messages reading `<title>Login</title>` from it. Rendering that page is the only change
  needed; a person tapping the link sees exactly today's page (FR-006). Google's fetchers "generally ignore
  robots.txt", so `Disallow: /login` stays.
- **Alternatives**: an interstitial landing page on `/?PID=` with `meta refresh` (a visible flash, slower than a 302,
  a second guest response type on `/`; RS1 B); serving a tags-only page to known fetcher user agents (a list that goes
  stale, cloaking, spoofable; RS1 C). Both rejected in the requirements.

## R2. One renderer beside `pollPage.ts`, sharing its tag builder

- **Decision**: `src/seo/pollPage.ts` exports `previewHeadTags({ title, description, url })` — the lines it already
  emits for `<title>`, `<meta name="description">`, `og:type`, `og:site_name`, `og:title`, `og:description`,
  `og:url` and `twitter:card` — and `headTags` calls it, adding the canonical link and the JSON-LD as today. New
  `src/seo/loginPage.ts` exports `renderLoginPage(loginHtml, poll, message, origin)`: it replaces
  `<title>Login</title>` with `previewHeadTags(...)`, nothing else. `login.html` keeps its `noindex` and every
  stylesheet, so `m3-assets.test.ts` is unaffected.
- **Rationale**: the same tags for the same readers, built once (requirements Technical Debt 1). The login page gets no
  `<link rel="canonical">` (it is `noindex`) and no JSON-LD (nothing to index), so the shared builder is the common
  subset. `assets.pageHtml("login.html")` supplies the fingerprinted HTML as `seo.ts` does for `index.html`.
- **Alternatives**: a second copy of the tag list in `loginPage.ts` (two lists to keep in step); rendering through
  `sendPage` with a template hook (a larger change to `assets.ts` for one page).

## R3. The description: subtitle, blank line, plain-text message, 300 characters

- **Decision**: `linkPreviewDescription(poll, message)` in `loginPage.ts`:
  `[poll.subtitle.trim(), notesPlainText(message).trim()].filter(Boolean).join("\n\n")`, or
  `Vote and see live results: ${poll.title}` when both are empty; then, above `LINK_PREVIEW_DESCRIPTION_MAX = 300`,
  `text.slice(0, 299).trimEnd() + "…"` — the ellipsis counts within the 300, the convention `describe()` in
  `pollPage.ts` uses at 160. The value is attribute-escaped by `previewHeadTags` (`escapeHtml`), so a newline survives
  inside the attribute and the apps collapse it.
- **Rationale**: FR-003 and UA2; `notesPlainText` is the one text path for notes markup (CLAUDE.md invariant), so no
  `**` or `__` marks and no HTML reach the page (FR-004, US2 scenario 5). The empty-case fallback keeps the card's
  description non-empty, as `/poll/<pid>` does.
- **Alternatives**: the 160 cap of `/poll` (cuts most messages before the app does; rejected in UA2); no cap (a 1 KB
  attribute; rejected in UA2); joining with a space (loses the "under the subtitle" intent).

## R4. The canonical address is the shared link; the title gets the site suffix

- **Decision**: `og:url` is `${origin}/?PID=${pid}` — the address people copy from the admin card — never
  `/login?PID=…` (clarification Q1). `<title>` is `${title} · CrowdPoll`, `og:title` the bare title, as on
  `/poll/<pid>` (AM1).
- **Rationale**: apps that display, re-fetch or cache by the canonical address then use the link that goes through the
  same redirect for everyone; the login page never appears as "the link". The suffix convention is already the site's.
- **Alternatives**: `og:url` = the login page (an app could show "crowdpoll.vote/login…" and re-fetch it directly);
  no `og:url` (some apps then key the card on the first URL they saw, which is the redirect target).

## R5. Published polls only, approved columns only

- **Decision**: the `/login` branch selects the row (`selectAll`, as `seo.ts` does) and renders when
  `isOpenOrClosed(row)` (`src/polls/access.ts`: OPEN or CLOSED, or EDITING from one of those; the state rule
  `isIndexable` already applied, now exported on its own) — public or private (clarification Q2). The plan first
  named `isPublished` (`store.ts`), but that gate also admits WAITING TO OPEN, which the spec keeps on the plain
  page ("a link shared before the poll opens"); implementation's state tests caught the difference. Title and subtitle come from `projectPoll(row)`, which publishes the stashed state of an
  EDITING poll; the message is `row.invitation_message`, the approved column (never `pending_update`), as the
  invitation emails read it. Anything else — unpublished, unknown or malformed PID, no PID — falls through to
  `page("login.html")` unchanged (FR-005).
- **Rationale**: US3 and UA3; the same rule `/poll/:pid` applies minus the public-visibility test, and the message rule
  of the custom-message feature (its R4). An ever-voted poll's title, subtitle and message edits wait in
  `pending_update`, so the row holds the approved values.
- **Alternatives**: `isIndexable` (excludes private polls, the whole point); a projection-cache read (the projection
  carries no `invitationMessage`, by design — it must stay out of voter payloads).

## R6. `Cache-Control: no-cache`, Express's weak ETag

- **Decision**: the rendered login page is sent with `res.setHeader("Cache-Control", "no-cache")` and
  `res.type("html").send(html)`, as `/poll/:pid` is; `res.send` adds Express's weak ETag of the body, so a
  revalidation can answer 304. The plain login page keeps `sendPage`'s own ETag and 304.
- **Rationale**: FR-007 — the page varies with the poll, so a browser or intermediary revalidates; `no-cache` is what
  `sendPage` sends anyway. (The plan first said "no ETag"; implementation showed `res.send` always sets a weak one,
  on `/poll/:pid` too, and that is the revalidation FR-007 asks for, so it is kept rather than suppressed.)
- **Alternatives**: `no-store` (needless; the page holds nothing private beyond what the preview shows).

## R7. The support text names the preview

- **Decision**: `src/public/adminCard.js` (~1141), the Custom Email Message field's `support`, becomes
  `Optional. Added to the invitation email we send to the people you invite, and shown in the link preview when the poll's link is shared.`
  `tests/client-admin-wizard.test.ts` (~2019) pins the new string.
- **Rationale**: FR-008 and NC1: the creator learns, where they write it, that the message is readable by anyone
  holding the link.
- **Alternatives**: a line in the Settings Summary (not where the text is written); a privacy-page sentence (no cookie
  or storage change, so no new row is due).

## R8. Tests

- **Decision**: `tests/seo.test.ts` gains `describe("the login page of a published poll")`, with guest (cookie-less)
  requests:
  - a private open "Anyone With The Link" poll with subtitle: `<title>… · CrowdPoll</title>`, `og:title`,
    `og:description` = subtitle, `og:url` = `${ORIGIN}/?PID=…`, `<meta name="description">`, `noindex` still present,
    `Cache-Control: no-cache`, and `/loginCard.js` still referenced (the page is the login page);
  - an Invitation Only poll with subtitle and message: description = subtitle, blank line, message words without
    marks; without subtitle: the message alone; without both: `Vote and see live results: <title>`;
  - a 300+ character subtitle-and-message: 300 characters ending in `…`;
  - a voted poll with a pending message change: the approved message, not the pending one;
  - a message `<b>x</b> & "q"`: escaped in the attribute, no raw `<`;
  - draft, pending-approval, rejected, archived, unknown and malformed PIDs, and no PID: `<title>Login</title>`;
  - a public open poll: the same tags (Q2), while `GET /?PID=` still goes to `/poll/<pid>`;
  - a logged-in visitor: `302 /?PID=…` as before.
  - `tests/client-admin-wizard.test.ts`: the support text (R7).
  `tests/shared-link.test.ts`, `tests/pages.test.ts` and `tests/client-login-pid.test.ts` must pass unchanged
  (SC-003).
- **Rationale**: IV. Goal-Driven Execution; every FR and scenario has a check, and the fetcher is modelled by what it
  is — a request without cookies that follows the redirect.
- **Alternatives**: an integration test against a real messaging app (not automatable; the quickstart's manual step
  covers it).

## R9. Logging

- **Decision**: one server line per render, `[login] Poll preview rendered: <pid>`; none for the plain page. No title,
  message, link or token in the log.
- **Rationale**: constitution V (server-side observability) and the logging invariant (no link or token); the pid
  already appears in `[link] Poll link opened` lines.
- **Alternatives**: a metric (nothing reads it today).
