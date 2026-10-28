# Quickstart: Validating the Tab Bar

Runnable scenarios that prove the feature works end to end, one section per user story. Details
live in [data-model.md](./data-model.md) and [contracts/ui-contracts.md](./contracts/ui-contracts.md)
rather than being repeated here.

## Prerequisites

```
npm install
npm test                # all suites on an embedded PostgreSQL; no local services needed
npm run build           # tsc + devScripts/build-assets.ts
```

For manual validation you need a running server and one ordinary account (an admin identity is
not needed — the feature has no admin surface). Regenerate the git-ignored dev tooling from the
checked-in templates (`launch.json.example`, `devScripts.example/`), then:

```
npm run dev             # needs ENV_*; use devScripts/launch-dev.ps1 on Windows
```

Settings worth lowering while validating:

| Setting | Set to | Why |
|---|---|---|
| `ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW` / `…_MAX_REQUESTS_PER_WINDOW` | `1` / `20` | You sign in and out more than twice below |
| `ENV_MIN_MANUAL_REFRESH_INTERVAL` | `1000` | Tab clicks in US2 are not held by the manual floor |

Have a few public polls seeded so TRENDING has cards to compare icons against
(`devScripts/populate/`).

## Automated checks

```
npx vitest run tests/client-home.test.ts tests/tab-bar-assets.test.ts
npm test
```

Expected: the home-page suite passes with its new tests (six tabs in order with Title Case
labels; icons `aria-hidden`; Newest for a guest and a member — no redirect, no request, Refresh
disabled, empty panel, no message); the new asset suite passes (six `.tab-icon`s in
`index.html`; the Favorites path equals `pollCard.js`'s `.bookmark-star`; the Search glyph equals
`app.js`'s; `tabs.css` carries the `::after` rule and `.page { overflow-x:clip }`;
`avatar-default.svg` carries its note); every pre-existing suite passes unchanged (SC-003).

## US1 — Recognise every tab at a glance

Open `/` as a guest in a desktop browser at least 1400px wide.

1. The bar reads, left to right: **Trending · Newest · My Private Polls · Favorites · Live
   Results · Search** — Title Case, each with an icon before its label (FR-001, FR-002, FR-005).
2. Trending is highlighted in the same rounded pill as before; its arrow icon is the same dark
   green as its label. Hover Search: its magnifying glass stays muted grey with the label
   (FR-004, FR-013).
3. A one-pixel grey line runs under the row from the **left edge of the window to the right
   edge**, while the tabs sit in the centred column. Resize the window to 2000px and to 900px: the
   line still meets both edges; the pill and the Refresh control are above it (FR-017–FR-019).
4. With the window narrow enough to show a vertical scrollbar (add polls or shrink the height):
   **no horizontal scrollbar** appears (FR-020).
5. Compare icons with their sources on the same page: the Favorites star against a card's "Add
   to Favorites" star (same shape, no tag); the Live Results bars against a card's "Live Results"
   link (same three colours, same bounce); the My Private Polls silhouette against the header's
   avatar area after you sign in below (same shapes); the Search glass against the header's search
   box (same drawing) (FR-008–FR-012).
6. As a guest the Live Results bars are **still** — in the bar and on every card; My Private
   Polls, Favorites and Live Results are dimmed, icons dimmed with them (FR-011, FR-016). Sign in:
   the bars start bouncing at once, on every tab; sign out: they stop.
7. Signed in, turn on "reduce motion" in the OS and reload: the bars in the bar are still, as they
   are on the cards (FR-011).
8. Measure with the browser's element inspector: the icon box is 16 × 16, the gap to the label is
   6px, the line is 2px thick with its top edge 5px below the tab buttons and 5px below the Refresh
   control alike
   (FR-005, FR-017, FR-019).

## US2 — Every existing tab still does what it did

Sign in.

1. My Private Polls, Favorites and Live Results are now enabled; click each: it opens with the
   same content and the same Refresh behaviour as before (FR-003).
2. Bookmark a card on Trending: it appears on Favorites at once, as before.
3. Press a card's "Live Results": the Live Results tab opens (it is now fifth, before Search),
   the Refresh control is hidden there as before, and the tab refreshes on its own.
4. Type a word in the header's search box and press Enter: the Search tab (now last) opens with
   results; load `/?q=word` directly: Search opens on arrival (FR-003).
5. Sign out: the three personal tabs dim again and Trending is selected.
6. Narrow the window to phone width (≈ 375px): the bar is one row that scrolls sideways with no
   visible scrollbar and no wrapping; the grey line does not move as you scroll the tabs; the
   icons scroll with their labels (FR-021, FR-022).
7. Open the browser's network panel and reload: no request for any icon image — six inline
   drawings, zero fetches (FR-015, SC-005).

## US3 — The Newest tab is there, and empty

1. As a **guest**, click Newest: it highlights, the panel shows an empty grid — no polls, no
   text, no placeholder — and you are **not** sent to sign in (FR-023, FR-024).
2. The Refresh control is disabled while Newest is open (FR-026).
3. Watch the network panel: no request was made on the click; wait 30 s, switch away and back,
   switch browser tabs and return: still nothing (FR-025).
4. Sign in with Newest open: it stays open and empty; no request. Click another tab and back:
   the same (edge case).
5. With a screen reader (Windows Narrator / macOS VoiceOver), tab through the bar: each button is
   announced as its label only — "Newest, button" — no icon description, no "exclamation mark"
   (FR-014, SC-007).

## Done when

- The two automated commands above pass, and `npm test` reports every suite green.
- Every numbered step in US1–US3 is observed as written, including the four geometry checks
  (line to both edges, no horizontal scrollbar, 16px icons, one-row scroll on a phone) that only
  a real browser can show.
- `README.md` and `ARCHITECTURE.md` at the project root describe six tabs and no longer say a
  sixth Live Results poll evicts the oldest (see the plan's Documentation Deliverables gate).
