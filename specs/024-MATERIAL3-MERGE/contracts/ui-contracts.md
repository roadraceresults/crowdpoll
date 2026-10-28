# UI Contracts: Material 3 Merge (024)

These are client contracts. Steps 1–5 change no HTTP route, payload or `postman/openapi.json`
entry; Step 6's server changes are in [admin-api.md](admin-api.md). Each contract states what a
page or script exposes and what tests may rely on.

## C1. `window.M3Ripple`

```text
window.M3Ripple.add(selector: string): void
```

- Defined by `m3-ripple.js`, the first script on all seven pages.
- A primary-button `pointerdown` on an element matching any registered selector appends
  `<span class="m3-ripple" aria-hidden="true">`. For a `.vote-row`, it is wrapped in a
  `.m3-ripple-host` inside the row's `.bar-scroll-inner`. The span is removed on `animationend`.
- There is no ripple under `prefers-reduced-motion: reduce`, or on `disabled`,
  `[aria-disabled="true"]` or `.is-inert` targets.
- Callers use `window.M3Ripple?.add(…)`, so a page without the script works unchanged.

## C2. Tooltips

- Any element given a `title`, now or later, loses it and gains `data-tooltip` with the same
  text. An empty `title` removes `data-tooltip`.
- One `<div class="m3-tooltip" aria-hidden="true">` on `<body>` shows the text:
  - 500 ms after `pointerenter`, at once on `focus` (keyboard);
  - hidden 150 ms after the pointer leaves both the control and the tooltip;
  - hidden at once on Escape, `pointerdown`, `scroll` and `resize`.
- Touch: a 500 ms press shows the tooltip for 1500 ms. The click that follows is cancelled, and
  `contextmenu` is prevented on tooltip targets.
- `.result-row` and `.vote-row` show their tooltip only while the label's `scrollWidth` is greater
  than its `clientWidth`.
- Accessible names are unchanged: they come from `aria-label` or text, never from the tooltip.

## C3. `Tabs.notice(text, ms?)`

| Call | Result |
|---|---|
| `notice(text, ms)` | `#tabNotice` (`role="status"`) shows `text` and hides after `ms` |
| `notice(text)` | as above, with no timeout, plus `<button class="tab-notice-close" aria-label="Close">` |
| `notice("")` / Close | hidden. If focus was on Close, it moves to the Refresh control |

A new call replaces the content. Showing a notice never moves focus.

## C4. `Tabs.modal(text)`

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby="modal-text"` (the `<p class="modal-text">`).
- Focus starts on OK. `Tab` and `Shift+Tab` keep it there.
- OK, Escape and a backdrop click close the dialog, and focus returns to the opener (unchanged).

## C5. Live Results idle prompt

- Text: `Do you want to continue to receive Live Results updates?`
- `role="dialog"`, with **no** `aria-modal`, and `aria-labelledby="live-idle-text"`.
- On show, focus moves to Yes. After Yes, focus returns to the element focused before, if it is
  still connected. Cancel closes the tab, as today.
- While the prompt shows, Escape still closes an open maximized view.

## C6. `confirmDiscard(): Promise<boolean>` (`adminCard.js`)

- `role="alertdialog"`, `aria-modal="true"`, labelled by the headline "Discard changes?" and
  described by "Your edits will be lost.".
- Actions, in order: **Keep editing** (`.modal-action.modal-keep`) and **Discard**
  (`.modal-action.modal-discard`).
- It resolves `false` on Keep editing, Escape or a backdrop click, and `true` on Discard.
- Focus starts on Keep editing, and Tab and Shift+Tab alternate between the two actions. Focus
  returns to the opener.
- A call while a dialog is open returns the same promise.
- Callers:
  - Cancel: proceeds only when not dirty, or when the answer is `true`.
  - The back link: `preventDefault()` is called synchronously, and the link navigates only when
    not dirty or when the answer is `true`.

## C7. Guest personal tabs

- For a guest: `aria-disabled="true"` and `title="Sign in to use this tab"`, with **no**
  `disabled` attribute.
- A click (and so Enter or Space) goes to `/login`.
- When signed in: neither attribute, and the title is cleared.

## C8. Avatar menu button

- `<button type="button" class="avatar-btn" aria-haspopup="menu" aria-expanded="false|true">`
  wraps `<img class="avatar" alt="Profile avatar — open menu">`.
- A click toggles `.avatar-menu` and `aria-expanded`. Escape closes the menu and focuses the
  button. A document click closes it.

## C9. Result rows and vote list (`pollCard.js`)

- Each `.result-row` carries the inline custom properties `--bar-track`, `--bar-ink`,
  `--bar-track-dark` and `--bar-ink-dark`, and no inline `background` or label/percentage
  `color`.
- `.voting-list` has the class `is-multi` exactly when the poll is not a single-choice poll.

## C10. Profile snackbar

- `.profile-snackbar[role="status"]` shows "User name saved" for 4000 ms after a `PATCH /api/me`
  answered `2xx`. A further success restarts the 4000 ms.
- It is not shown after a non-`2xx` answer or a network failure.

## C11. Scheme selection

- `<html data-theme="dark">` forces dark, and `data-theme="light"` forces light.
- Without the attribute: light in Steps 1–4, and the device preference from Step 5.
- From Step 5, `admin.html` and `admin-results.html` ship `data-theme="light"`.

## C12. Page assets

The page × file matrix in `data-model.md` §4 is the contract that the asset tests assert, step by
step. From Step 6, `m3-tokens.css` also declares Title Medium, Label Medium and Label Small.

## C13. `AdminCard.create(poll, deps)` controller (Step 6)

```text
{ element, pid, isEditing(), isDirty(), confirmDiscard(), update(poll), showStatus(text),
  focusSummary(), openWizard(), hasSavedProgress(), releaseSession() }
```

- `openWizard()` requests an edit session and opens the wizard at Step 1 (`requestEdit(1)`);
  `adminList.js`'s Create New Poll calls it.
- `focusSummary()` replaces `focusPen()`: focus goes to the card's first summary link, if any.
- `hasSavedProgress()` is true while the card holds a new poll's saved wizard progress;
  `adminList.js` keeps such a card's controller when its poll leaves the view (FR-040, R27).
- `deps` is unchanged; `deps.origin` is optional (default `location.origin`).
- There is no `.card-pen`, `.card-header--editing` or two-column read-only field list.

## C14. The admin card's faces (Step 6)

- **Read-only face**: `.card-readonly` holding the state header, the icon buttons and ⋮ menu,
  the Date Related Panel (Open, Close, Archive; Created, Launched), the Counts Panel and the
  Settings Summary `.wizard-summary`.
- **Summary Text links** (the Settings Summary's tappable parts): `.wizard-summary-link`, `role="button"`, `tabindex="0"`, Enter and Space
  activate; present exactly where `data-model.md` §6.3 allows and no other card is editing.
  While the edit request is out the summary is `aria-busy="true"` and ignores taps.
- **Wizard**: the summary, the Named Circles (current `aria-current="step"`; visited buttons;
  not-yet-visited inert), one step panel, `.wizard-next` (absent on Step 5), and the footer:
  - new poll (worded state INITIALIZED): Cancel, Save, Publish;
  - existing poll: the line "Saving sends your poll to be reviewed again.", Cancel, Save changes.
- **Blocked buttons**: Publish, Save and Save changes use `aria-disabled="true"` (never
  `disabled`), keep focus, ignore clicks, and carry the reason in `title` (adopted by C2).
- **Requests**: Save → `POST …/save`; Publish → `POST …/publish` with every wizard field;
  Save changes → `POST …/publish` with `clientGuid` and only the fields that changed and may
  change. Each Cancel awaits `confirmDiscard()` (C6) when dirty.

## C15. The when-line (Step 6)

The Settings Summary's last line, by worded state first, then dates (A31):
opening "as soon as your poll is published" / "as soon as your poll is approved" / "is open now" /
"on [date] at [time]" / "opened on [date] at [time]" / "opened when your poll was published";
closing "stays open until you close it" / "closes on …" / "closed on …" / "has closed". Dates read
"Sat, Oct 3 at 9:00 AM", with the year when it is not the current year.

## Amended records

- `specs/021-MAXIMIZED-POLL-CARD/contracts/ui-contracts.md` and `ARCHITECTURE.md`: where they say
  the bar colours are inline `background` / `color`, add that from 024 they are the four custom
  properties of C9, applied by `pollCard-m3.css`.
