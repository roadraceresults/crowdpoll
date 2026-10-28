# Research: Admin Page Improvements

## R1 — Duplicate-poll title uniqueness

**Decision**: Add a pure helper in `src/polls/service.ts`,
`nextAvailableCopyTitle(baseTitle: string, existingTitles: string[]): string`, that returns
`baseTitle + " Copy"` if that string isn't in `existingTitles`, otherwise the first
`baseTitle + " Copy " + N` (N starting at 1) not in `existingTitles`. The `POST
/api/admin/polls/:pid/duplicate` handler in `pollsApi.ts` fetches every existing title
matching `^<escaped baseTitle> Copy( \d+)?$` (a single regex query over the `polls`
collection, projecting only `title`, across every `pollState` — no filter on state at all),
passes the results to `nextAvailableCopyTitle`, sets the computed title on the object
`duplicatePoll()` already builds, and inserts it. To close the race window where two
duplicate requests for the same source poll are computed concurrently, the handler re-counts
documents with the chosen title immediately after insert; if more than one now exists (lost
the race), it recomputes against the latest state and renames its own new document, bounded
at 5 attempts. If a collision still exists after 5 attempts (the bound exists only as a
defensive cap — reaching it requires two truly simultaneous requests), the handler appends a
short disambiguator derived from the new poll's own `_id` (its first 8 hex characters) to the
computed title. This is unique by construction, since `_id` is a freshly generated UUID — so
FR-004's uniqueness guarantee holds unconditionally rather than only up to the retry bound.

**Rationale**: `duplicatePoll()` stays a pure, synchronous, trivially-unit-testable function
(unchanged from today) — only the title field is overwritten by the new IO-touching logic in
the route handler, keeping pure/impure code separated per the existing `service.ts` pattern
(`computeResults`, `deriveState`, etc. are all pure). A single regex query bounded by 004's
own stated scale (≤1,000 active polls, and archived/closed polls only grow slowly since
there's no purge) is trivial to run and answers FR-002/003 in one round trip regardless of
how many numbered copies already exist (the "many numbered copies" edge case). The
`polls` collection has no unique index on `title` today and none is added — general
title uniqueness across manually-created polls was never a requirement, only that the
*duplicate* action's output doesn't collide at creation time.

**Alternatives considered**:
- *Attempt-insert-and-retry-on-conflict via a unique DB index on `title`.* Rejected: would
  make ALL poll titles globally unique (including manually-created ones), which is not a
  stated requirement and would surprise admins creating a poll with a normal, non-duplicate
  title that happens to collide.
- *No concurrency guard at all.* Rejected: FR-004 explicitly requires the guarantee to hold
  under concurrent duplicate requests; the bounded recheck/rename loop closes the gap at
  negligible cost for what is, in practice, an admin clicking a button — not a high-throughput
  path.

## R2 — Actions menu implementation

**Decision**: A native `<button>` trigger per row with `aria-haspopup="true"` and
`aria-expanded`, toggling a `role="menu"` container with four `role="menuitem"` children
("Edit Poll", "Duplicate Poll", "Copy Poll Link", "View Results" — unchanged
hrefs/handlers). Built as hand-rolled DOM/vanilla JS inside `adminList.js` (extending its
existing `document.createElement` style), styled by new rules in `admin.css`. Keyboard
handling (Tab to trigger, Enter/Space to open, Arrow Up/Down to move between items, Escape or
item-activation to close with focus returning to the trigger) and click-outside-to-close are
implemented directly, extending the click-outside pattern `app.js`'s avatar-menu already uses
(`document.addEventListener("click", ...)`), which today has no keyboard support to model
against. Viewport-edge clipping (FR-009) is handled with a simple post-open check: if the
menu's bounding rect would overflow the viewport bottom/right, flip it up/left via a CSS
class toggle.

**Rationale**: The codebase has zero client-side dependencies anywhere in `src/public/` —
everything is hand-rolled vanilla JS/CSS with no bundler. A 4-item static menu doesn't
warrant introducing one. Reusing the existing avatar-menu's click-outside idiom keeps the
new code recognizable rather than inventing a second, different open/close convention on the
same page family.

**Alternatives considered**:
- *A third-party menu/dropdown/positioning library.* Rejected per Simplicity First — no
  existing dependency to build on, and the interaction surface (4 static items, one open at a
  time) is small enough that a library would add more weight than it saves.
- *Native HTML `<details>`/`<summary>` or the Popover API.* Considered for less hand-rolled
  JS, but neither gives straightforward roving `Arrow Up/Down` focus between items or a
  natural `role="menu"`/`role="menuitem"` mapping without still hand-rolling the keyboard
  layer on top — so the DOM/ARIA approach above is not meaningfully simpler with either as a
  base, and `<details>`'s built-in disclosure triangle doesn't match the kebab-icon design
  reference.

## R3 — Site-wide identical header

**Decision**: Make `site.css` the one canonical stylesheet for the full header (brand
mark + wordmark, primary nav, search box, `#header-actions` slot, avatar/menu), loaded by
all 7 pages. The header-related selectors currently in `pollGrid.css`
(`.site-header`, `.brand*`, `.header-nav*`, `.header-search*`, `.header-actions`,
`.btn-header-*`) move into `site.css`, along with the small set of `:root` custom-property
tokens (`--ink`, `--paper`, `--moss`, `--moss-dark`, `--line`, `--muted`, `--max-width`, etc.)
those selectors depend on. `pollGrid.css` keeps only the card-grid/filter-bar layout rules
that solely `index.html` still needs. The now-superseded legacy header rules in `styles.css`
(`#site-header`, `#site-header nav`, `#site-header a`, `.header-user`, `.avatar-menu`) are
removed, since `site.css`'s versions now apply everywhere and the ID-selector rules would
otherwise out-specificity the class-selector ones once both stylesheets are loaded together
on the same page. `login.html`, `profile.html`, and `create-account.html` gain the same
`.page-decor`/`.page`/`.container`/`.layout` wrapper structure `index.html`/`admin*.html`
already use around `<header id="site-header"></header>`, plus `<link>` tags for `site.css`
(and `pollGrid.css`/`pollCard.css` stay **off** those three pages — see rejected alternative).
`app.js`'s `renderHeader()` and `renderHeaderActions()` merge into one function,
`renderSiteHeader(me, config)`, producing the exact markup currently hardcoded in
`index.html` (including its two inline brand SVGs) and mounting it into `#site-header` on
every page; `init()` calls it once. `index.html`/`admin.html`/`admin-poll.html`/
`admin-results.html` swap their current hardcoded/reduced header markup for the same empty
`<header id="site-header"></header>` shell `login.html`/`profile.html`/`create-account.html`
already use.

**Rationale**: The home page's header contains two inline SVGs (brand mark + wordmark) that
serialize to roughly 40KB of markup combined. Copying that literally into 6 more HTML files
would bloat every page for no benefit and reintroduce exactly the kind of drift this feature
exists to fix (any future header tweak would need repeating in 7 places). A single
JS-rendered function mounted into an empty shell — the pattern 3 of the 7 pages already use —
guarantees byte-identical output because there is only one code path, and is a smaller diff
than inventing a new templating mechanism. Investigating the stylesheets surfaced a concrete
correctness risk (see rejected alternative) that made "just add the existing sheets
everywhere" unsafe as-is.

**Alternatives considered**:
- *Load `pollGrid.css` + `pollCard.css` + `site.css` unmodified onto `login.html`/
  `profile.html`/`create-account.html`, in addition to their existing `styles.css`.*
  Rejected: `pollGrid.css`/`pollCard.css` set unscoped `html,body{ background:var(--paper);
  font-family:'Inter'... }` and their own `:root` palette, which would silently override
  `styles.css`'s `body{ background:var(--bg) }` and system-font stack for the *entire* page,
  not just the header — an unintended visual change beyond what User Story 3 asks for. Their
  `.site-header`-class rules would also collide with `styles.css`'s existing `#site-header`
  ID-selector rules (higher specificity, so the old rules would keep partially winning)
  unless `styles.css` is edited anyway — so this "simpler" option still requires the same
  `styles.css` cleanup while additionally risking the unscoped background/font bleed.
- *Keep per-page hardcoded header markup, copy it into the 3 currently-empty-shell pages and
  hand-edit `admin.html`/`admin-poll.html`/`admin-results.html`'s existing headers to match.*
  Rejected for the duplication reasons above, and because 4 independent copies are 4 places
  that can silently drift apart again after this feature ships — the opposite of what "every
  page must have the same header" is asking for.

## Out of scope / no change

- **`postman/openapi.json`**: `POST /api/admin/polls/:pid/duplicate`'s request/response shape
  is unchanged (still no body, still `201 { pid }}`) — only the server-computed `title` value
  differs internally. No contract update needed.
- **MongoDB schema**: `Poll.title` already exists as a plain string; no new fields, no new
  collections, no new indexes.
