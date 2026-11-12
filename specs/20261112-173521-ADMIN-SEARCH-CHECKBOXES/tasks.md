# Tasks: Admin Search Checkboxes

**Input**: Design documents from `specs/20261112-173521-ADMIN-SEARCH-CHECKBOXES/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R7), data-model.md, contracts/api.md, contracts/ui.md, quickstart.md

**Tests**: requested (FR-011). Each story writes its test cases first; they fail before the implementation task that
follows.

**Organization**: by user story; every task names its file.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1, US2 (spec.md)

---

## Phase 1: Setup

None: no dependency, setting or script is added.

---

## Phase 2: Foundational (blocks every story)

- [X] T001 Create `src/db/migrations/022-admin-search-flags.ts` with `up` creating `polls_line_graph_created` (`("created_at" desc) where "line_graph_enabled"`) and `polls_custom_colors_created` (`("created_at" desc) where jsonb_path_exists("choices", '$[*] ? (@.color != null)')`), and `down` dropping both, in the form of `021-link-preview-message.ts` (data-model.md, R3)
- [X] T002 Register `"022-admin-search-flags"` in `src/db/migrations/index.ts`, after `021-link-preview-message`
- [X] T003 [P] Add the checkbox row to `src/public/admin.html` directly after the vote mutability radio group: `div.admin-checkbox-row[role=group][aria-label="Poll features"]` holding two `label.admin-checkbox`, `name="lineGraphEnabled" value="true"` "Line graph enabled" then `name="customColors" value="true"` "Custom colors set" (contracts/ui.md U1, R4)
- [X] T004 [P] Add the "Checkbox row" section to `src/public/admin-search-m3.css` after the radio groups: `.admin-checkbox-row` on the radio groups' grid (three columns, one below 360 px), `.admin-checkbox` like `.admin-radio` (48 px minimum height, body-medium tokens), the input an `appearance:none` 18 px square with `--md-sys-shape-corner-extra-small`, `on-surface-variant` outline, `primary` fill and `on-primary` check mark when checked, a 2 px `primary` focus ring, no transition under reduced motion; M3 tokens only (R5, U5)
- [X] T006 [P] Add the two query parameters to `GET /api/admin/polls/search` in `postman/openapi.json`, after `voteMutability`: `schema { type: string, enum: ["true"] }` with descriptions "true: only polls whose line graph is on" and "true: only polls with at least one choice whose color was picked by hand" (contracts/api.md A6)
- [X] T007 [P] In `tests/client-admin-search.test.ts`: `ORDER` gains `lineGraphEnabled, customColors` after `voteMutability`; the labels test names them "Line graph enabled" and "Custom colors set"; a new test checks the row sits directly after the vote mutability radio group with `role="group"`, holds the two checkboxes unticked, and that Clear unticks them after they were ticked (U1, U2, U4, U6)

**Checkpoint**: `npx tsc --noEmit` passes; `npx vitest run tests/client-admin-search.test.ts tests/m3-assets.test.ts` passes.

---

## Phase 3: User Story 1 - Find the polls that show a line graph (Priority: P1) 🎯 MVP

**Goal**: ticking "Line graph enabled" lists only polls with the line graph on.

**Independent Test**: with polls with and without the line graph, `lineGraphEnabled=true` returns exactly the first.

- [X] T008 [US1] In `tests/search-admin.test.ts`: `parseAdminSearch` gives `lineGraphEnabled: true` for `"true"`, `undefined` for `""` or missing, and throws `Invalid lineGraphEnabled "false"; expected true.` for `"false"`; a route test where `lineGraphEnabled=true` returns only the line-graph polls newest first, with `voteMutability` returns their intersection, no parameter returns what it did before, and `lineGraphEnabled=1` answers `400` (A1, A2, A4, A5)
- [X] T009 [US1] In `src/search/adminSearch.ts`: `AdminSearchFilters` gains `lineGraphEnabled?: true`; a `flag(raw, name)` parser returns `true` for `"true"`, `undefined` for a missing or blank value, and throws `AdminSearchError(\`Invalid ${name} "${raw}"; expected true.\`)` otherwise; `parseAdminSearch` reads `lineGraphEnabled`; `adminSearchQuery` adds `where("line_graph_enabled", "=", true)` when it is set (R1, R2)
- [X] T010 [US1] In `tests/client-admin-search.test.ts`: ticking "Line graph enabled" and searching requests `lineGraphEnabled=true`, and searching with it unticked sends no such parameter (U3)
- [X] T005 [US1] Add `"lineGraphEnabled"` and `"customColors"` after `"voteMutability"` in the plain-control list of `readSearchForm` in `src/public/adminList.js`; placed after its test T010 (test first), keeping its id (R4, U3)

**Checkpoint**: User Story 1 works on its own.

---

## Phase 4: User Story 2 - Find the polls with hand-picked choice colors (Priority: P2)

**Goal**: ticking "Custom colors set" lists only polls with at least one hand-picked choice color.

**Independent Test**: of a poll with no color, one with one color and one with every color, `customColors=true`
returns the last two.

- [X] T011 [US2] In `tests/search-admin.test.ts`: parsing `customColors` as for `lineGraphEnabled`; a route test with a poll whose choices have no `color`, one with a color on one choice beside a voter-added choice without one, one with every choice colored, and one whose only colors are in `pending_update`: `customColors=true` returns the second and third, both parameters together return only those of them with the line graph on (A3, A4)
- [X] T012 [US2] In `src/search/adminSearch.ts`: `AdminSearchFilters` gains `customColors?: true`, read by `parseAdminSearch` with `flag`; `adminSearchQuery` adds ``where(sql<boolean>`jsonb_path_exists(choices, '$[*] ? (@.color != null)')`)`` with a one-line comment that it matches the partial index of migration 022 (R2, R3)
- [X] T013 [US2] In `tests/search-admin.test.ts` "every filter combination is answered from an index": add `{ lineGraphEnabled: true }` and `{ customColors: true }` to `controls`, with a few of the 200 polls given the line graph and a colored choice (R3)
- [X] T014 [US2] In `tests/client-admin-search.test.ts`: ticking both boxes requests `lineGraphEnabled=true&customColors=true`, and after unticking them without searching again, the list's periodic refresh still sends both submitted parameters (U3; spec Edge Cases)
- [X] T015 [P] [US2] In `tests/openapi-contract.test.ts`: `GET /api/admin/polls/search` documents `lineGraphEnabled` and `customColors` (A6)

**Checkpoint**: both stories work; `npx vitest run tests/search-admin.test.ts tests/client-admin-search.test.ts tests/openapi-contract.test.ts` passes.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T016 [P] Update `README.md`: the administrator Search paragraph lists the two checkboxes and what they match (unticked means any)
- [X] T017 [P] Update `ARCHITECTURE.md`: the admin search section names the two filters, their parameters and the two partial indexes of migration 022
- [X] T018 Run `npx tsc --noEmit` and `npm test`; walk through `quickstart.md` Manual steps 2–7 (step 6 verifies FR-009: the 48 px targets, focus ring and narrow-screen stacking, which jsdom cannot measure)

---

## Dependencies & Execution Order

- Phase 2 first: T001 → T002; T003, T004, T006 and T007 are independent of each other and of T001/T002.
- US1 (T008 → T009 → T010 → T005) needs T002 (the index migration runs in the test database) and T003 for T010.
- US2 (T011 → T012 → T013, T014, T015) needs T009 (the `flag` parser) and T006 for T015.
- Polish after both stories.

## Parallel Example

```text
After T002: T003, T004, T006, T007 together (different files).
In US2: T015 beside T013/T014.
Polish: T016 and T017 together, then T018.
```

## Implementation Strategy

- **MVP**: Phase 2 + US1 gives the row with a working "Line graph enabled" box.
- **Then** US2 adds "Custom colors set" on the same parser and its index.
- Each checkpoint runs only the affected test files; T018 runs everything once.
