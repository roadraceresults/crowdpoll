# Research: Admin Search Checkboxes

All decisions below follow the requirements report (`requirements/20261112-173521-admin-search-checkboxes/
requirements-report.md`, AM1, AM2, UA1–UA4) and the code as it stands. No NEEDS CLARIFICATION remained.

## R1. The query parameters

- **Decision**: `GET /api/admin/polls/search` takes two optional parameters, `lineGraphEnabled` and `customColors`. The
  value `true` turns the filter on; a missing or blank value leaves it off; any other value is refused by
  `parseAdminSearch` with an `AdminSearchError` (`Invalid lineGraphEnabled "<value>"; expected true.`), which the route
  already answers with `400 { error }`. `AdminSearchFilters` gains `lineGraphEnabled?: true` and `customColors?: true`.
- **Rationale**: UA2. Only "on" is meaningful (AM1 A: unticked means no filter), so a single accepted value keeps the
  parser strict like the operator checks; blanks are ignored like every other control.
- **Alternatives**: accepting `1`/`on`/`yes` (rejected: more than one spelling for one state, and nothing sends them);
  `false` meaning "without" (rejected: AM1 B was not accepted).

## R2. The SQL conditions

- **Decision**: in `adminSearchQuery`, ANDed with the others (UA1):
  - `lineGraphEnabled` → `where("line_graph_enabled", "=", true)`;
  - `customColors` → ``where(sql<boolean>`jsonb_path_exists(choices, '$[*] ? (@.color != null)')`)``.
- **Rationale**: AM2 A: a poll matches when at least one element of `polls.choices` (jsonb) has a non-null `color`.
  Colors are written only through `checkedColor`/`normalizeColor` as `#RRGGBB`, and Automatic choices carry no `color`
  key; the `!= null` test also leaves out a stray `"color": null`. Two-argument `jsonb_path_exists` is immutable, so
  it can define a partial index (R3).
- **Stored values only (UA4)**: both columns are the poll row as saved; `pending_update` is a separate column and is not
  read, as no other search filter reads it.
- **Alternatives**: `choices @> '[{"color": …}]'` (rejected: containment needs a value, not "any value"); an
  `exists (select 1 from jsonb_array_elements(choices) …)` subquery (rejected: cannot back a partial index).

## R3. Indexes

- **Decision**: a migration `022-admin-search-flags` adds two partial indexes, in the pattern of the existing
  per-filter indexes (`polls_vote_mutability_created` and the others in `002-polls.ts`):
  - `polls_line_graph_created on polls (created_at desc) where line_graph_enabled`;
  - `polls_custom_colors_created on polls (created_at desc) where jsonb_path_exists(choices, '$[*] ? (@.color != null)')`.
  The query's predicates are written exactly as the index predicates so the planner can match them.
- **Rationale**: `tests/search-admin.test.ts` "every filter combination is answered from an index" requires that no
  filter or pair of filters scans `polls` sequentially; each existing filter has its own index, and these keep that
  rule. It also removes the JSON-scan concern recorded as Technical Debt in the requirements report. Partial indexes
  hold only the matching rows, so they stay small.
- **Spec impact**: the spec's Assumptions say "no database change"; the migration adds indexes only (no column, no data
  change), which `/speckit-analyze` should reconcile.
- **Alternatives**: no index, relying on the `polls_created` index walk (rejected: passes the test only by scanning the
  whole index, unlike every other filter); a generated `has_custom_colors` column (rejected: a schema change for what a
  partial index gives).

## R4. The form and its reader

- **Decision**: in `src/public/admin.html`, directly after the vote mutability radio group:

  ```html
  <div class="admin-checkbox-row" role="group" aria-label="Poll features">
    <label class="admin-checkbox"><input type="checkbox" name="lineGraphEnabled" value="true"><span>Line graph enabled</span></label>
    <label class="admin-checkbox"><input type="checkbox" name="customColors" value="true"><span>Custom colors set</span></label>
  </div>
  ```

  `readSearchForm` in `src/public/adminList.js` adds `"lineGraphEnabled", "customColors"` to its list of plain controls
  after `"voteMutability"`; `FormData` holds `true` for a ticked box and nothing for an unticked one, so a parameter is
  sent only when ticked. Clear already calls `searchForm.reset()`, which unticks them. Nothing is stored in browser
  storage (FR-010), so no Cookie Use row is needed.
- **Rationale**: UA3 and FR-001/FR-002; the smallest change that reuses the existing reader.

## R5. Style

- **Decision**: `src/public/admin-search-m3.css` gains a section "Checkbox row": `.admin-checkbox-row` uses the radio
  groups' grid (three columns, one under 360 px), and `.admin-checkbox` copies `.admin-radio` (48 px minimum height,
  body-medium type tokens); the input is an `appearance:none` 18 px square with
  `--md-sys-shape-corner-extra-small`, an `on-surface-variant` outline, `primary` fill when checked, an `on-primary`
  check mark drawn by `::before`, a 2 px `primary` focus ring, and no transition under reduced motion.
- **Rationale**: FR-009; `m3-assets.test.ts` allows only M3 tokens, no literal font sizes, in M3 layers. The admin page's
  stylesheet list is unchanged, so `LAYER_ORDER` needs no update.

## R6. Contract and tests

- **Decision**:
  - `postman/openapi.json`: two query parameters on `GET /api/admin/polls/search`, `{ type: "string", enum: ["true"] }`
    with a description.
  - `tests/search-admin.test.ts`: parse (true, blank, refused value), each filter alone, together, with
    `voteMutability`, a voter-added choice with no color beside a colored one, a `pending_update` holding colors that
    does not match, and both controls added to the index-combination test.
  - `tests/client-admin-search.test.ts`: labels, order (`ORDER` gains the two names after `voteMutability`), the row
    under the vote mode group, unticked by default, a parameter only for a ticked box, Clear unticks them.
  - `tests/openapi-contract.test.ts`: the two parameters are documented.
- **Rationale**: FR-008, FR-011, and the cross-feature rule that `postman/openapi.json` follows the routes.

## R7. Documentation

- **Decision**: README's administrator search paragraph lists the two checkboxes; ARCHITECTURE's admin search section
  names the two filters and their partial indexes.
- **Rationale**: the constitution's Documentation Deliverables.
