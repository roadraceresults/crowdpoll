# UI Contracts: Privacy Policy, Terms of Service and Account Deletion

All new styling uses Material 3 tokens only, in layer sheets; no literal font sizes (`m3-assets.test.ts`).

## C1. The site footer (every page)

- Rendered by `app.js` (`renderSiteFooter()`), appended to `<body>` once; never fixed; below all content.
- Markup:
  ```html
  <footer class="site-footer">
    <nav aria-label="Legal">
      <a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Service</a> · <a href="/privacy#cookies">Cookie Use</a>
    </nav>
    <p>Privacy: <a href="mailto:privacy@crowdpoll.vote">privacy@crowdpoll.vote</a> · Other questions: <a href="mailto:support@crowdpoll.vote">support@crowdpoll.vote</a></p>
    <p>© 2026 CrowdPoll</p>
  </footer>
  ```
  The year is the current year.
- `footer-m3.css` (TWEAKS07): a band in the primary colour with on-primary (white) text and links, like the emails'
  header; `body-small` type, centred, rounded corners, as wide as the header's column (`--max-width` less the
  container's 20px sides, 14px on a phone); its bottom margin is `calc(16px + var(--cookie-banner-offset, 0px))` so the
  banner never covers it.

## C2. The cookie banner (changed)

- Same sentence, then a link: `Cookie Use` → `/privacy#cookies`, before the "I Understand" button.

## C3. The Create Account card (changed)

- Below the email field: an unticked checkbox, label
  "I agree to the <a href="/terms">Terms of Service</a><br>and have read the <a href="/privacy">Privacy Policy</a>."
  (two lines, broken after "Terms of Service", TWEAKS03)
  (links open in the same tab; the form keeps what was typed when the person comes back).
- Create Account is enabled only when the field holds text **and** the box is ticked.
- The request carries `acceptedTerms` and `termsVersion` (from `/api/config`).
- A `terms-required` error shows in the action's status line.

## C4. The Login card (changed)

- Native mode: a line under the action, broken after "Terms of Service" (TWEAKS04): "By signing in you agree to the
  Terms of Service" / "and Privacy Policy.", with both linked.
- OAuth mode: the C3 checkbox above the provider buttons; the buttons are `aria-disabled` and inert until it is ticked.

## C5. The accept page (`/accept-terms`, new)

- Card Shell, title "Updated Terms of Service", subtitle "Please read and accept the Terms of Service to continue.".
- The C3 checkbox; actions **Accept** (enabled once ticked, filled) and **Sign Out** (outlined, `btn-text`), side by side
  with Accept on the right.
- The checkbox's label is the box and one `.terms-box-text` span, so the sentence wraps as one paragraph beside the box;
  its links use the primary colour (TWEAKS02).
- Accept → `POST /api/legal/accept-terms`, then `location.href = redirect`. Sign Out → `POST /api/auth/logout`, then `/`.
- A page that receives `403 terms-required`, or a `/api/me` with `termsAccepted: false`, sends the browser to
  `/accept-terms?next=<current path>` (one shared helper in `app.js`).

## C6. The Profile page "Your Data" section (new)

- A third section after the user name and email sections, heading "Your Data":
  - text: "To get a copy of the data CrowdPoll holds about you, write to privacy@crowdpoll.vote. We answer within 30 days."
  - a link "Read the Privacy Policy" → `/privacy`;
  - an action **Delete Account** (error-coloured outline button).

## C7. The delete dialog (new)

- A modal dialog (`aria-modal="true"`, focus trapped, Escape and Cancel close it), title "Delete your account?", text:
  - "This deletes your account, your sessions, your bookmarks and the polls you created, with their votes."
  - "Your votes on other people's polls stay counted, but show as "Deleted user"."
  - "If you were banned from a poll, the ban stays."
  - "This cannot be undone."
- A field labelled "Type DELETE to confirm"; **Delete Account** is enabled only when the field is exactly `DELETE`.
- On success: `location.href = "/"`. On failure: the error in the dialog's status line; the dialog stays open.

## C8. The documents' layout

- `privacy.html` and `terms.html`: the header, a `<main class="legal-doc">` holding the `<h1>`, a line
  "Version 2026-11-01 · Last updated 1 November 2026", the text, then the footer.
- `legal-m3.css`: readable measure (max-width 72ch), Material 3 type roles for headings and body; the Cookie Use and
  Retention tables use the `outline-variant` border.
- The Privacy Policy starts with an "In short" box (`surface-container` background) listing the five points of
  `contracts/privacy-policy.md`.

## C9. Anonymized voters (changed: `adminResults.js`)

- Any address ending `@deleted.invalid` is shown as "Deleted user" on the results page (`/admin/poll/results`), the only
  place a voter's address is shown; the placeholder itself is never shown. The rosters keep no placeholder: the deleted
  account's invitations are deleted and its bans keep the real address.
- The JSON and Markdown exports carry no voter address (they hold counts only, `computeResults`).
