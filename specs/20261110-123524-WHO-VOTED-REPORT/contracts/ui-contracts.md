# UI Contracts: Who Voted Report

## C1. Placement (`index.html`, template `maximizedCardGrid`)

```html
<div class="maximized-space-right">
  <section class="maximized-notes" aria-label="Notes" hidden></section>
  <section class="maximized-voters" aria-labelledby="maximizedVotersHeading" hidden></section>
  <div class="maximized-graph"></div>
</div>
```

The template is cloned once per grid; `whoVoted.js` gives the heading id a per-section suffix so ids stay unique.
Order in both layouts: Notes, Who voted, line graph. The section never scrolls on its own.

## C2. Panel content (built by `whoVoted.js` with DOM methods only)

```html
<section class="maximized-voters">
  <h2 class="who-voted-heading" id="…">Who voted</h2>
  <div class="who-voted-sort" role="group" aria-label="Sort">
    <button type="button" class="who-voted-segment" aria-pressed="true">Sort by Voter</button>
    <button type="button" class="who-voted-segment" aria-pressed="false">Sort by Choice</button>
  </div>
  <table class="who-voted-table">
    <thead><tr><th scope="col">Voter</th><th scope="col">Choice</th><th scope="col">Date</th></tr></thead>
    <tbody>
      <tr><th scope="rowgroup" rowspan="2">Bob</th><td>Option 2</td><td><time datetime="…" title="…">Jun 10, 2024</time></td></tr>
      <tr><td>Option 4</td><td><time …>Jun 10, 2024</time></td></tr>
    </tbody>
  </table>
</section>
```

- Sort by Choice: headers `Choice`, `Voter`, `Date`; the row-group header holds the choice label.
- No voters: the heading, then `<p class="who-voted-empty">No votes yet.</p>`; no sort control, no table.
- The selected segment shows the M3 check icon (inline SVG, `aria-hidden`) and `aria-pressed="true"`.

## C3. Behaviour (`window.WhoVoted`)

| Call | Effect |
|---|---|
| `show(section, pid, detail)` | when `detail.pollVisibility` is `Private Poll` and `detail.pollState` is `OPEN` or `CLOSED`, and the pid's `refusedVersion` is not `detail.contentVersion`: fetch A1 and redraw; otherwise `hide`. A different pid resets the sort to Sort by Voter. |
| `hide(section)` | empties and hides the section, clears the pid, sort, timer and pending request |
| segment click | sets the sort and redraws from the held report; no request |

- `tabs.js` calls `show` from `maximize`, and from `render` for the maximized pid when its `countsVersion` or
  `contentVersion` differs from the last `show`; it calls `hide` from `restore`.
- A reply whose request is no longer the latest, or arriving after `hide`, is dropped.
- `settleMs` in a reply: one refetch after it. `429`: one refetch after `retryAfterMs`. At most one retry pending; a
  `429` answering a retry schedules it again once. Any other failure: keep the last table (or stay hidden) and log
  nothing sensitive.
- `tabs.js` also calls `show` from `reapply` (the viewer's own vote) and from `patchRetained` (a maximized poll no tab
  list holds), with the same version check.
- `404`: `hide`, and remember `refusedVersion = detail.contentVersion`.

## C4. Look (`who-voted-m3.css`, last in `LAYER_ORDER`)

- Section: as `.maximized-notes` — `surface-container-low`, `corner-small`, padding 12px 16px, margin-bottom 16px.
- Heading: `title-medium` tokens, `on-surface`.
- Segmented control: 40 px high, `outline` border, `corner-full` ends, selected segment `secondary-container` /
  `on-secondary-container`, state layers per the M3 segmented-button spec.
- Table: full width, `body-medium` tokens; `thead` in `label-large` / `on-surface-variant`;
  `tbody:nth-of-type(even)` on `surface-container`; row-group headers left-aligned, `font-weight` from `title-small`.
- Light and dark from the token sheet; no literal colours or font sizes.
