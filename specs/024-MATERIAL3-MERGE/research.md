# Research: Material 3 Merge (024)

Every decision here was settled either by the source requirements
(`designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`, after its architecture pass), by the
prototypes in `prototypes/POLL-CARD-MATERIAL3/` (the design source of truth), by the two spec
clarifications, or by the current code in `src/public`. The Technical Context has no open unknowns.
This file records why each choice stands, and where a prototype is ported differently.

## R1. Layers, not rewrites

- **Decision**: production sheets stay as they are, apart from the named fixes (R14). Each page
  loads `m3-tokens.css` before its other sheets and the area layers after them. A layer only adds
  rules and reads tokens. It never edits or restates a production rule.
- **Rationale**: this is how every prototype was built and verified. The compliance review found
  every copied production file identical to `src/public` apart from the marked edits (checked again
  on 2026-10-01: `pollCard.js` differs by the two edits only, `pollCard.css` and `cardShell.js` are
  identical, and the prototypes' `site.css` and `tabs.css` are extracts). Porting layers keeps each
  step reviewable against its prototype. It also leaves light mode on today's token values by
  construction (FR-002).
- **Alternatives considered**: folding M3 rules into `tabs.css`, `site.css` and `pollCard.css`
  (large diffs against files other features touch, and no one-to-one check against the
  prototypes); one combined `m3.css` (every page would ship every area's rules, and the steps could
  not merge independently).

## R2. What a port keeps and drops

- **Decision**: each layer is ported from its prototype with four mechanical changes:
  1. Its token sections are removed, because `m3-tokens.css` now holds them (R3). These are: §1–3
     of `pollCard-m3.css`; §1 of `header-tab-bar-m3.css`, `card-shell-m3.css` and
     `tooltip-m3.css`; and the `:root` blocks at the top of `tabs-modal-m3.css`,
     `live-idle-prompt-m3.css` and `discard-dialog-m3.css`.
  2. Its `@media (prefers-color-scheme: dark)` blocks are left out until Step 5 (R13).
  3. Its literal font sizes become `--md-sys-typescale-*` variables (Step 2 for
     `header-tab-bar-m3.css`, Step 4 for the field labels in `card-shell-m3.css`).
  4. Its comments follow Constitution VI (R15).
- **Rationale**: the result keeps every selector and value the prototypes verified, minus the
  duplication and the history.
- **Alternatives considered**: byte-identical copies (they would duplicate the tokens six times,
  and switch dark on before Step 5).

## R3. `m3-tokens.css`

- **Decision**: one new sheet, linked first on all seven pages (Step 1). It holds, in order:
  - the light colour roles from `pollCard-m3.css` §1, with surfaces anchored to the site
    (`surface #FFFFFF`, `surface-container-low #F1F3EE`, `on-surface #1E2422`);
  - the inverse roles (`#2C322D` / `#EDF2EB` / `#94D5A8`) and the scrim;
  - the dark roles, with the production tokens (`--ink`, `--paper`, `--paper-raised`, `--moss`,
    `--line`, `--track`, `--choice-*`, `--muted`, `--shadow`) restated as roles, under
    `:root[data-theme="dark"]` only until Step 5;
  - the type scale (Roboto, with Headline Small added for the Not Saved dialog);
  - the shape tokens (full, 28, 12, 8 and 4px), the state-layer opacities (8 / 10 / 10%),
    elevations 2 and 3, and the emphasized-decelerate easing;
  - the `.m3-ripple` and `.m3-ripple-host` rules, their keyframes, and their reduced-motion rule
    (from `pollCard-m3.css` §7).
- **Rationale**: one source for each value. The ripple rules sit here because the header ripples
  of Step 2 need them before `pollCard-m3.css` arrives in Step 3. A ripple without its animation
  never fires `animationend`, so its spans would never be removed (architecture AMB-3).
- **Alternatives considered**: a separate `m3-ripple.css` (an eighth link on every page, for about
  fifteen lines).

## R4. `m3-ripple.js` and its registration API

- **Decision**: `window.M3Ripple = { add(selector) }` keeps a list of selectors and installs one
  delegated `pointerdown` listener on `document`. The listener:
  - ignores a press that is not the primary button, and every press under reduced motion;
  - ignores a target that is `disabled`, `[aria-disabled="true"]` or `.is-inert`;
  - sizes and places the ripple from the press point, as all five prototype copies do;
  - for `.vote-row`, hosts the ripple in a clipping box over the row inside `.bar-scroll-inner`,
    because the click that follows rebuilds the row.

  Callers register with `window.M3Ripple?.add(…)`:
  - `app.js`: the header, tab bar, search, avatar menu and cookie banner;
  - `tabs.js`: `.tab-notice-close` (which `notice()` creates) and `.modal .modal-ok`;
  - `liveResults.js`: the idle prompt's actions;
  - `adminCard.js`: `.modal .modal-action`;
  - `pollCard.js`: the card targets and `.maximized-card-close`.

  `m3-ripple.js` is the first `<script>` on each page, so the object exists before the deferred
  scripts after it run.
- **Rationale**: one listener instead of five copies (Simplicity). Registering per area keeps each
  step's ripples in that step's diff. The optional call means a page or a jsdom test that does not
  load `m3-ripple.js` still works (Constitution V: fail safely). Existing client tests evaluate
  only the scripts they list (`tests/helpers/browser.ts:89`).
- **Alternatives considered**: a static selector list inside `m3-ripple.js` (every step would edit
  the shared file, and ripples would appear on controls whose layer has not merged yet);
  registration from CSS (not possible).

## R5. Tooltips (`tooltip-m3.css`, `tooltip-m3.js`), Step 2

- **Decision**: port the prototypes' shared tooltip files to all seven pages in Step 2:
  - The script adopts every `title`, now and later (a `MutationObserver` on `title`), into
    `data-tooltip`, and removes it. An empty `title` clears the tooltip.
  - One `aria-hidden`, `position:fixed` tooltip element hangs off `<body>`.
  - Timings: 500 ms to show on hover and 150 ms to hide; at once on keyboard focus.
  - Touch: a 500 ms press shows the tooltip for 1.5 s, with the click and the context menu
    suppressed.
  - Escape, a press, scrolling and resizing hide it.
  - Placement: centred 4px below the control, flipped above when there is no room, and kept 8px
    inside the viewport.
  - A `.result-row` or `.vote-row` shows its tooltip only while its label's `scrollWidth` exceeds
    its `clientWidth`.
- **Rationale**: Step 2 is where the guest tabs become `aria-disabled` (R8), without which their
  tooltip could not show. It also keeps Step 1 invisible (architecture INC-1). Production keeps
  writing `title`, so no other script changes.
- **Testing**: the default jsdom script list stays as it is, so the existing assertions on `title`
  (`client-maximized.test.ts:145, 456`, `client-home.test.ts:405`) hold. The tooltip tests load
  `tooltip-m3.js` through `options.scripts`, and stub `scrollWidth` / `clientWidth` for the
  cut-off case, since jsdom has no layout.
- **Alternatives considered**: CSS-only tooltips from `data-tooltip` (they would be clipped by the
  cards' `overflow:hidden`, and give no touch behaviour); editing every `title` writer (more than
  ten call sites, against Surgical Changes).

## R6. The header behaviour script is split

- **Decision**: the prototype's `header-tab-bar-m3.js` does three jobs. They land in two places:
  - `app.js` registers the header ripples and runs the `--cookie-banner-offset` watcher: a
    `ResizeObserver` on `#cookie-banner` and a `MutationObserver` for the banner coming and going.
  - `tabs.js` sets `role="status"` on `#tabNotice`, beside `notice()`.
- **Rationale**: `app.js` is the one script on all seven pages, and Step 4's profile snackbar also
  needs the offset. `#tabNotice` exists only on `index.html`, whose notice `tabs.js` owns.
- **Alternatives considered**: a ninth file, `header-m3.js` (another script on every page, for
  about forty lines).

## R7. The avatar becomes a button

- **Decision**: `app.js` builds `<button type="button" class="avatar-btn" aria-haspopup="menu"
  aria-expanded="false">` around the existing `<img class="avatar">`. The image keeps its `alt`
  ("Profile avatar — open menu"), which names the button.
  - A click toggles the menu and `aria-expanded`.
  - Escape, while the menu is open, closes it and focuses the button.
  - A document click still closes it.
  - `header-tab-bar-m3.css` §7 and §10 move the avatar's hover, state layer and focus ring from
    `.header-user .avatar` to `.avatar-btn`, which keeps the 32px circle.
- **Rationale**: the smallest change that makes the menu keyboard-operable and announced
  (FR-013). The prototype styled an `<img>`, so the button wrapper is the one header markup change.
- **Alternatives considered**: `tabindex="0"` with a key handler on the `<img>` (an image with a
  button role is still not a button); a full menu-button pattern with arrow keys (not required).

## R8. Guest tabs use `aria-disabled`

- **Decision**:
  - `applyGuestState()` sets `aria-disabled="true"` for a guest and removes it otherwise, instead
    of `btn.disabled`.
  - The click handler's guard becomes `btn.getAttribute("aria-disabled") === "true"` and sends the
    guest to `/login` before `select()`. A focused tab activated by Enter or Space produces a
    `click`, so the keyboard takes the same path.
  - `tabs.css`'s `.tab:hover:not(.is-active):not(:disabled)` gains
    `:not([aria-disabled="true"])`.
  - `header-tab-bar-m3.css` already styles `[aria-disabled="true"]` (the disabled colours, the
    `not-allowed` cursor, no state layer).
- **Rationale**: a disabled `<button>` fires no click and gets no pointer or focus events, so today
  the `/login` path never runs and the tooltip "Sign in to use this tab" could never show
  (FR-014).
- **Alternatives considered**: keeping `disabled` and wrapping each tab in a span to catch clicks
  (more markup, and still not focusable).

## R9. The notice's Close control

- **Decision**: `notice(text, ms)` appends `.tab-notice-close` (`aria-label="Close"`, the ×
  icon) only when `ms` is omitted. Close hides the notice. A new `notice()` call replaces the
  content (the control included). If Close has focus when the notice hides, focus moves to the
  Refresh control. Showing a notice never moves focus; `role="status"` announces it.
- **Rationale**: the prototype harness shows the control's markup. The focus rule keeps keyboard
  focus from being lost when the element is hidden (FR-007).

## R10. The three dialogs

- **`Tabs.modal`** (`tabs.js`): the prototype's two edits. The text gets `id="modal-text"` and the
  box `aria-labelledby` pointing at it, and `Tab` / `Shift+Tab` are cancelled and refocus OK. The
  look is `tabs-modal-m3.css`.
- **The idle prompt** (`liveResults.js`): the prototype's edits.
  - `IDLE_PROMPT` loses "for this poll".
  - There is no `aria-modal`, so the Escape guard in `tabs.js` (which skips while an
    `[aria-modal="true"]` is open) lets Escape close the maximized view.
  - The prompt is named by its text.
  - Focus moves to Yes, and returns after Yes when the opener is still connected.
- **The Not Saved dialog** (`adminCard.js`): `confirmDiscard()` becomes the prototype's
  `Promise<boolean>` dialog.
  - It is an `alertdialog` with the headline "Discard changes?" and the text "Your edits will be
    lost.", and the actions Keep editing and Discard. It reuses `.modal-backdrop` / `.modal` /
    `.modal-actions`.
  - One dialog at a time: a second call returns the pending promise.
  - Keep editing, Escape and the scrim answer `false`. Tab cycles the two actions, and focus
    returns to the opener.
  - Callers:
    - Cancel: `if (!dirty || await confirmDiscard()) void cancelEdit();` inside an `async`
      handler.
    - `guardNavigation()` keeps `event.preventDefault()` first, then awaits
      `controller.confirmDiscard()`.
  - `admin.html` links `tabs-modal-m3.css` and `discard-dialog-m3.css`. Its `tabs.css` already
    serves `.modal`. `admin.html` does not load `tabs.js`, so the dialog is built in
    `adminCard.js`.
- **Rationale**: these are verified prototype functions, ported with their marked edits
  (FR-011, FR-012, FR-022).
- **Alternatives considered**: `<dialog>.showModal()` (a different focus and backdrop model from
  the one `Tabs.modal` and its tests rely on).

## R11. Bar colours and the multi-choice checkbox (`pollCard.js`)

- **Decision**: the two prototype edits, plus the ripple registration (R4):
  1. After `BAR_COLORS`, add `RESULTS_DARK_SURFACE` (`#181D19`), `mixWith`, `lightShadeFor`,
     `darkBarColorsFor` and `BAR_COLORS_DARK`. Each dark track is mixed toward the dark surface by
     the light tint amount, and its ink climbs in lightness from 0.75 until it reaches 7:1.
     `applyBarColors` sets `--bar-track`, `--bar-ink`, `--bar-track-dark` and `--bar-ink-dark` on
     each row, instead of `row.style.background` and the text's `style.color`.
     `pollCard-m3.css` maps them per scheme.
  2. `render()` toggles `is-multi` on `.voting-list` when `poll.choiceMode !== "Single-Choice
     Poll"`.
- **Rationale**: the light values are 022's exactly (SC-001). A scheme change needs no re-render.
  The edit and `pollCard-m3.css` merge in one pull request, since the rows lose their tints without
  the layer.
- **Testing**: `client-bar-colours.test.ts` reads the four properties. The light pair is pinned to
  022's values, and each dark ink is asserted at ≥ 7:1 against its dark track, computed in the
  test from the two properties. `client-maximized.test.ts` is updated where it reads inline
  colours. A new case covers `is-multi` on multi-choice polls only.

## R12. Card-shell pages and the profile snackbar

- **Decision**:
  - `card-shell-m3.css` (Profile, Login, Create Account, Not Authorized; §9–12 for the login
    checkbox, the OAuth buttons, the field error and the empty body) and `profile-editor-m3.css`
    (Profile's current values and section error) are ported per R2.
  - `profileCard.js` creates one `.profile-snackbar` (`role="status"`, `hidden`) on first use. On
    `r.res.ok` after `PATCH /api/me`, it shows "User name saved" for 4000 ms; a further success
    replaces the text and restarts the timer.
  - Its bottom offset reads `--cookie-banner-offset` (R6).
  - The status line's "Saved." and its FR-018 clearing are unchanged.
  - A refusal, a 429 or a network failure shows no snackbar.
- **Rationale**: this follows the prototype harness's `showSnackbar` (FR-021).

## R13. Dark mode: off until Step 5, then follow the device

- **Decision**:
  - Steps 1–4 write dark rules only under `:root[data-theme="dark"]`. An asset test asserts that
    no sheet in `src/public` contains `prefers-color-scheme: dark`.
  - Step 5 adds the `@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]) … }`
    twin of every dark block, in `m3-tokens.css` and in every layer, and reverses that assertion.
  - `admin.html` and `admin-results.html` carry `<html lang="en" data-theme="light">` from Step 5,
    with a page test that the other five do not (FR-026, architecture NC-1 Option A).
- **Rationale**: no user sees a partly dark site before release (FR-027). Admins see one coherent
  light page until the admin feature ports theirs.

## R14. The CSS fixes

- **The 640px rule** (`tabs.css` line 223): the comment's `btn-header-*/` closes the comment
  early. The rest of the comment, the `@media (max-width:639.98px)` block included, then parses as
  one invalid rule and is dropped. Reword the comment without `*/` inside it.
- **The `.tab-notice, .tab-empty` group** (`tabs.css` 170–181): split it, since `.tab-notice`
  becomes a snackbar in `header-tab-bar-m3.css`, and delete FIX029's Search-only centring.
  `empty-tab-line-m3.css` centres the line on every tab.
- **The 021 hover rule** (`site.css` 785–787): add `:not(.card-shell-viewport)` to
  `.card-viewport:not(.maximized-card-viewport)` in the rule and its `.subtitle` and cursor
  siblings, since `cardShell.js:45` builds `card-viewport card-shell-viewport` (Step 3).

## R15. Comments and the `M3:` markers

- **Decision**: production code carries no `M3:` markers and no references to requirements,
  clarifications, prototypes or feature numbers. Ported comments are kept only where they point
  to external documentation, for example the Material 3 pages for tooltips, state layers, dialogs
  and snackbars. Section headings that only name a section (`/* ---------- 3. Tab bar ---------- */`)
  may stay. The markers remain in the prototypes, which are where the merge is traced.
- **Rationale**: Constitution VI forbids comments that record change history or cite
  requirements. Where the requirements say "edits marked `M3:`", they describe the prototypes,
  not what production must contain.

## R16. Fonts

- **Decision**: in Step 1, `Roboto:wght@400;500;700` is appended to each page's existing Google
  Fonts URL (one request, `display=swap`). Fraunces and Inter stay. `index.html` and the
  card-shell pages already have `preconnect`; the admin pages, which lack it, are left as they
  are.
- **Rationale**: these are the weights every prototype loads, in one request with no new origin.

## R17. Tests per step

| Step | New or changed tests |
|---|---|
| 1 | New `tests/m3-assets.test.ts`: <ul><li>every page links `m3-tokens.css` before its other sheets, and `m3-ripple.js` as its first script;</li><li>the font URL includes Roboto;</li><li>no other change to the served HTML;</li><li>no `prefers-color-scheme: dark` in `src/public`.</li></ul> |
| 2 | <ul><li>`tab-bar-assets.test.ts` (icon fills now in CSS; the new sheets);</li><li>the page × file matrix for Step 2;</li><li>client tests: the notice's Close and `role="status"`; the avatar button and its menu by keyboard; a guest's click and Enter on a personal tab going to `/login`; `Tabs.modal`'s name and Tab trap; the idle prompt's text, name and focus, and Escape closing the maximized view; the tooltip (no `title` left, hover and focus, a long press that does not click, rows only when cut off); the Not Saved dialog (no edits, edits, each answer, focus return);</li><li>`client-home.test.ts`: guest tabs read `aria-disabled`, and the idle-prompt text loses "for this poll".</li></ul> |
| 3 | <ul><li>`client-bar-colours.test.ts`: four properties, light pinned, dark ≥ 7:1;</li><li>`is-multi`;</li><li>`client-maximized.test.ts` updated where it reads inline colours;</li><li>`site.css` scope.</li></ul> |
| 4 | <ul><li>Profile snackbar: shown on success, restarted on a second success, absent after a refusal, a 429 or a network failure;</li><li>the existing profile and page tests re-run unchanged.</li></ul> |
| 5 | <ul><li>Every dark block has its `@media` twin;</li><li>`data-theme="light"` is on the two admin pages only;</li><li>the browser checklist (manual, `quickstart.md`).</li></ul> |

---

# Step 6: the admin cards (added 2026-10-03)

Step 6's decisions come from the requirements' Step 6, the second architecture pass (UNS-1 … UNS-4,
NC-1 Option A), the spec's 2026-10-03 clarifications (keywords saveable; new polls stay Public),
the prototype `prototypes/POLL-CARD-MATERIAL3/ADMIN-CARDS/`, and the current server code. Three
facts found while planning are recorded here as R21–R22: the server never reads or writes
`keywords` outside search, and the new poll's Save posts drafts that today's validation refuses.

## R18. Porting the admin cards

- **Decision**: a normal port, as in Steps 2–4.
  - `src/public/admin-card-m3.css` is `ADMIN-CARDS/admin-card-m3.css` through R2's recipe. It
    has no dark blocks to drop. Its section 1 goes: Title Medium, Label Medium and Label Small
    move into `m3-tokens.css` (beside the existing type roles); Title Small, Body Large and
    elevation 2 are already there and are not restated. `admin.html` links it last, after
    `discard-dialog-m3.css`.
  - `src/public/adminCard.js` becomes `ADMIN-CARDS/adminCard.js` with the R15 comment rule
    applied: its 71 `M3:` / REQUIREMENT markers are removed or reduced to plain descriptions.
    It already holds the Step 2 edits (`confirmDiscard()` as a page dialog, ripple
    registrations); `ADMIN-CARDS/admin-card-m3.js`'s target list becomes
    `window.M3Ripple?.add(…)` calls in `adminCard.js`, and the file is not ported.
  - `src/public/admin.css` becomes `ADMIN-CARDS/admin.css` (production's sheet plus the cards'
    layout block), with its 9 markers removed.
  - Not ported: `harness.js`, the Theme picker, and the prototype's `cardType` fixture flag
    (R19).
- **Rationale**: the prototype is verified against byte-identical copies of the production
  sheets (architecture A1), so a port keeps what was reviewed.
- **Alternatives considered**: re-implementing the wizard inside today's `adminCard.js` (rejected:
  the prototype's file already replaces the edit face, and two versions would drift).

## R19. When a poll is "in its wizard"

- **Decision**: `isWizardPoll()` becomes `wordedState() === "INITIALIZED"`. `wordedState()` already
  reads an EDITING poll as `pollStateBeforeEditUpdate` (C13 puts that field on the list row).
  `isNewCard()` and every `cardType` read are removed.
- The saved progress (`wizardSaved`) stays in the card instance. `adminList.js` keeps its
  controllers across refreshes, so progress survives a list refresh; a page reload reopens an
  INITIALIZED poll at Step 1 with its stored answers (`wizardBase()`'s fallback).
- **Rationale**: the stored state is the truth; a flag only the harness sets would send every
  production poll down the existing-poll path (architecture UNS-2).
- **Alternatives considered**: a new `isNew` column (rejected: a database change).

## R20. `adminList.js`

- **Decision**: two edits.
  - Create New Poll calls `controller.openWizard()`, which `adminCard.js`'s controller exposes as
    `() => requestEdit(1)`, in place of `querySelector(".card-pen")?.click()` (line 470).
  - The refresh's focus call becomes `controller.focusSummary()` in place of `focusPen()`
    (line 391).

  The Create New Poll button stays disabled while any card is editing (`createBtn.disabled =
  editingPid !== null`, unchanged). `deps.origin` is not passed; the card falls back to
  `location.origin`.
- **Rationale**: the pen is gone (A30.3); these are the only two places the list reaches into the
  old face.

## R21. `POST /api/admin/polls/:pid/save`

- **Decision**: a route beside `/publish` in `src/routes/pollsApi.ts`, `requireAdmin`.
  1. `findPoll`; 404 if missing.
  2. `resolveEditContext(poll, clientGuid, hasEverVoted)`, as `/publish`. A refusal → 409 with
     its message.
  3. The effective state (`pollStateBeforeEditUpdate` when the caller holds the lock, else
     `pollState`) must be INITIALIZED; otherwise 409 "Only a poll that has not been published can
     be saved without publishing."
  4. The body is validated with `validatePollFields` and `replaceChoices`, as `/publish`, with
     two draft allowances, because Save is offered before the poll is complete:
     - a title that is empty after trimming is dropped, so the stored title stays (the wizard
       treats the default title as no title);
     - the choice list may hold fewer than `ENV_MIN_CHOICES` real choices: an empty list is
       dropped (the stored starter choices stay, which the wizard reads as none), and one or
       more are stored. `replaceChoices` is called with `minChoices: 1`. Publish keeps the full
       rule.
     Every other rule holds: lengths, exact duplicates (409), enumerations, the schedule
     (`startAt must be before endAt.`), keywords (R22).
  5. `updatePoll(store, pid, { ...$set, pollState: "INITIALIZED", ...CLEAR_SESSION })`. No
     approval is requested, and `isAllDefaults` is not consulted.
  6. Responds `200` with `buildAdminPollDetail(…)` and `message: "Saved: you can finish later."`;
     logs `[admin] Saved poll <pid> without publishing` (Constitution V, server side).
- **Rationale**: the card already posts this body (`postWizard("/save")`) and shows the
  response's `message`; reusing the publish validators keeps one rule set (architecture NC-1 A).
- **Alternatives considered**: a `draft` flag on `/publish` (rejected: one route would then both
  publish and not publish, and the 011 tests pin `/publish`'s meaning).

## R22. Keywords become a stored poll setting

- **Decision**: the `keywords` column exists (migration 002) and feeds both search engines (the
  generated `search` column, weight D; `searchText` / `toDocument` for OpenSearch), but the
  domain `Poll` never carries it. Step 6 threads it through:
  - `Poll.keywords: string` in `src/polls/store.ts`; `rowToPoll`, `newRow` and
    `FIELD_TO_COLUMN` map it. A content change already bumps `content_version` and writes
    `search_outbox`, so OpenSearch receives it with no search change.
  - `createDefaultPoll` sets `keywords: ""`; `duplicatePoll` copies the source's keywords, as it
    copies the other settings; `tests/helpers/poll-fixtures.ts`' `makePoll` defaults to `""`.
  - `validatePollFields` accepts `body.keywords` through a new `validateKeywords(value)`:
    - a string; `""` is allowed;
    - split on commas, each keyword matches `^[a-z0-9]+( [a-z0-9]+)*$`;
    - no keyword repeats;
    - the whole string is at most `KEYWORDS_MAX = 200` characters;
    - otherwise 400 `Keywords must be lower-case letters, digits and single spaces, separated by
      commas, with no repeats, and at most 200 characters in total.`;
    - with votes, 409 `keywords cannot be changed after the poll has received a vote.`, as the
      other settings (unreachable through `/publish`'s UPDATE filter, kept for the same reason
      `choiceMode`'s is).
  - When the resulting visibility is `Private Poll`, `$set.keywords = ""` (sent or not), so a
    private poll never keeps keywords.
  - `adminListRow` returns `keywords`; `buildAdminPollDetail` already spreads the poll.
  - `postman/openapi.json` describes `keywords` on the publish and save bodies, the admin poll
    detail and the admin list row.
- **Rationale**: without the read side, a saved public poll would reopen with no keywords and the
  next Publish would send `""` and erase them.
- **Alternatives considered**: lower-casing on the server (rejected: the wizard already
  normalises as it types; refusing keeps the stored value exactly what the admin saw).

## R23. New-poll defaults

- **Decision**: `createDefaultPoll` changes `voteMutability` to `Dynamic-Vote Poll` and adds
  `keywords: ""`. `pollVisibility` stays `Public Poll` and `pollSharingMode` `Anyone With The
  Link` (spec Q2 B), so `whoFromPoll` opens Step 1 on "Everyone on CrowdPoll".
- **Tests changed**: `tests/polls-service.test.ts:217` and `tests/polls-admin-crud.test.ts:41`
  expect `Dynamic-Vote Poll`; `polls-service.test.ts:218` (`Public Poll`) is unchanged.

## R24. `adminListRow` additions

- **Decision**: `pollStateBeforeEditUpdate: p.poll_state_before_edit_update` and
  `keywords: p.keywords`, on both `GET /api/admin/polls` and `GET /api/admin/polls/search` (one
  function serves both). Additive; no client reads them except `adminCard.js`.

## R25. Comments and the remaining prototype-only behaviour

- **Decision**: R15 applies. Comments that explain a rule keep the rule and lose the requirement
  name ("// Save keeps the answers; the poll stays unpublished."). The when-line, the summary
  link rule and the date rule keep one-line explanations because they are not obvious from the
  code.
- The help text of the anonymity switch says voters see names when on; production shows them to
  admins only (accepted in Step 6, spec FR-035).

## R26. Tests for Step 6

| Kind | Tests |
|---|---|
| New server | `tests/polls-admin-wizard.test.ts`: <ul><li>`/save` stores the fields and leaves the poll INITIALIZED with its session cleared, and never requests approval;</li><li>`/save` allows an empty title (keeps the stored one) and fewer than `ENV_MIN_CHOICES` choices (none keeps the starters);</li><li>`/save` refuses: a poll that is not effectively INITIALIZED, a poll locked by another `clientGuid`, invalid fields, an inverted schedule;</li><li>keywords: stored on publish and save for a public poll, cleared for a private one, refused when malformed, repeated or over 200, refused with votes;</li><li>`pollStateBeforeEditUpdate` and `keywords` on the admin list and search rows;</li><li>a keyword makes a public poll findable by home search (PostgreSQL full-text).</li></ul> |
| Changed server | `polls-service.test.ts` and `polls-admin-crud.test.ts`: the `Dynamic-Vote Poll` default. |
| New client | `tests/client-admin-wizard.test.ts` (jsdom on `admin.html`): <ul><li>Create New Poll opens Step 1 (`openWizard`), Step 1 on "Everyone on CrowdPoll";</li><li>the circles: current, visited, inert; Next; no Next on Step 5;</li><li>Publish blocked (`aria-disabled`, a click sends nothing, the tooltip names what is missing) until all five steps are visited and the poll is complete;</li><li>a duplicate choice blocks Next, Save and Publish;</li><li>Save posts to `/save`, returns to the read-only face, and a summary tap reopens at that step with the progress;</li><li>an EDITING-from-INITIALIZED poll takes the new-poll wizard;</li><li>every Cancel through "Discard changes?";</li><li>the anonymity switch;</li><li>the when-line in each state;</li><li>existing polls: links per state with and without votes, the wizard at the tapped step, locked steps with their reason, Save changes' enabling and its changed-fields-only body;</li><li>the read-only face's panels and the focus after Save, Cancel and a lost session.</li></ul> |
| Rewritten | <ul><li>`client-admin-discard.test.ts`: opens the wizard from the Summary Text, uses the wizard's Cancel and the back link;</li><li>`client-home.test.ts` "the date fields on an admin card": Launched in the Date Related Panel; Start/End move to the when-line (covered by the new tests);</li><li>`client-home.test.ts`'s FIX010 view test: Create New Poll opens the new poll's wizard.</li></ul> |
| Retired, with a note naming Step 6 | <ul><li>`poll-card-assets.test.ts`: the 012 and 014 sections that read the edit face's source (Mechanics radio groups, Save and Publish availability, participant edits, the voter count limit field and its presentation, editing form spacing, default choice selection, the voter ceiling) and any other section the full run shows to read the removed face;</li><li>`polls-editing-eligibility.test.ts`: the client-source sections on the editing face ("offers Save and Publish, then Cancel…", its neighbours, and the sections that slice `adminCard.js` at `focusPen`), keeping every server section.</li></ul> |
| Page | `m3-assets.test.ts`: `admin.html` links `admin-card-m3.css` last; the three type roles are in `m3-tokens.css`. |

The rule for anything the list misses: run the whole suite after the port; a failure that reads
the removed edit face or the old two-column read-only fields is rewritten when the behaviour
still exists, and retired with a note when it does not.

---

# After Step 6: three follow-ups (added 2026-10-03)

The spec's "Session 2026-10-03 (after building Step 6)" added three changes found while building
Step 6: FR-040 tightened (progress kept across admin views), FR-049 (the starter-choices hold
applies only to unpublished polls) and FR-050 (the rules nothing on the admin pages uses removed).

## R27. Keeping a new poll's progress across admin views (FR-040)

- **Finding**: the progress lives in the card instance (`wizardSaved` in `adminCard.js`).
  `adminList.js` `loadList()` deletes the controller of every poll that is not in the view just
  loaded (`if (!seen.has(pid) && pid !== editingPid) controllers.delete(pid)`, and
  `controllers.clear()` for the Search view before a search), so switching views loses it.
- **Decision**: the card reports whether it holds progress, and the list keeps such a card.
  - `adminCard.js`'s controller gains `hasSavedProgress: () => wizardSaved !== null`.
  - `loadList()` deletes a controller only when it is not seen, not being edited, and has no
    saved progress; the empty Search view's `controllers.clear()` keeps those controllers the
    same way.
  - A kept controller that comes back into a view is reused as today (`controller.update(poll)`),
    so its wizard reopens with the progress.
  - Publish already clears `wizardSaved`; a poll published or deleted elsewhere leaves a kept
    controller that is never shown again, which costs one card's memory until the page closes.
- **Rationale**: the smallest change that makes the existing promise true; no new state outside
  the card.
- **Alternatives considered**: a pid → progress map in `adminList.js` passed back through `deps`
  (rejected: a second copy of state the card already owns); never deleting controllers (rejected:
  every poll ever listed would stay in memory, and deleted polls would linger).

## R28. The starter-choices hold applies only to unpublished polls (FR-049)

- **Finding**: `/publish` (`src/routes/pollsApi.ts`) holds back any poll for which
  `isAllDefaults(merged)` is true and stores it as INITIALIZED with the session cleared, whatever
  its state. `isAllDefaults` is true whenever the choices are still "Choice 1 / Choice 2", so a
  published poll with those choices (old data, fixtures) is returned to INITIALIZED, even with
  votes.
- **Decision**: compute the effective state as `/save` does (`pollStateBeforeEditUpdate` when the
  caller holds the lock, else `pollState`) and apply the hold only when it is INITIALIZED:
  `if (effectiveState === "INITIALIZED" && isAllDefaults(merged))`. Every other poll takes the
  normal path to AWAITING APPROVAL. `isAllDefaults` itself is unchanged.
- **Tests**: in `tests/polls-admin-wizard.test.ts`, a published poll (OPEN, with and without a
  vote) that still has the starter choices is sent to AWAITING APPROVAL by `/publish`; an
  INITIALIZED one is still held back with "This poll still has its default values and cannot be
  published.".
- **Rationale**: the hold exists to stop an unfinished new poll being published; a published poll
  has been screened already.

## R29. Removing the rules nothing on the admin pages uses (FR-050)

- **Finding**: these classes and ids in `src/public/admin.css` appear in no file that the two
  pages loading it use (`admin.html`, `admin-results.html`, `adminCard.js`, `adminList.js`,
  `adminResults.js`, `app.js`, `tabs.js`), and none is built from string pieces:
  `admin-field--inline`, `admin-field--tight`, `admin-field-error`, `admin-field-hint`,
  `admin-field-row--mechanics`, `admin-icon-cell`, `admin-publish-bar`,
  `admin-rejection-reason`, `admin-row-error`, `admin-screening-line`, `admin-subtitle-line`,
  `admin-title-line`, `admin-title-link`, `card-body`, `card-choice-list`, `card-choices`,
  `card-column`, `card-counts`, `card-dates`, `card-field--stacked`, `card-mechanics`,
  `card-pen`, `card-rosters`, `card-schedule`, `choices-count`, `choices-editor`,
  `choices-gutter`, `choices-hint`, `is-frozen`, `mechanics-group`, `mechanics-radios`,
  `mechanics-static`, `#pollTitle`, `radio-option`, `roster-*` (12 classes),
  `#voterCountLimit`, `#voterCountLimitField`.
- **Decision**:
  - Delete each rule whose selectors all name only these; in a rule that lists several
    selectors, delete only the unused selectors. Delete a comment that described only a deleted
    rule.
  - Keep every rule a used class or element reaches, including `.admin-field` and its children
    (the admin search form) and `.admin-create-btn:disabled`.
  - Check by re-running the scan above (no unused class left), by brace balance, and by
    comparing the computed style of the rendered admin page's cards before and after in jsdom
    (the page must not change, FR-050).
- **Tests retired with the rules** (`tests/poll-card-assets.test.ts`): "Mechanics radio groups
  survive the shared .admin-field rules" (its first `it` asserts `.admin-field input`'s width,
  which stays, so that `it` is kept) and "Frozen mechanics show their value on the editing card".
  "Admin buttons that drop the global fill also set their own colour" stays: it scans whatever
  rules remain.
- **Rationale**: Constitution III removes what a change made unused; the editing face went in
  Step 6.
