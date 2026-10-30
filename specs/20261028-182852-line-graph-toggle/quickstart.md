# Quickstart: Per-Poll Line Graph Toggle

Validation guide for the feature. Each step names the story or requirement it proves.

## Prerequisites

- Node ≥ 22, PostgreSQL reachable through `ENV_DATABASE_URL`.
- `ENV_ADMINS` includes an address you can sign in with, and a second address that is not an administrator.
- `ENV_SIGNIN_METHOD=native` and the development email settings from the launch template.

## 1. Migration (FR-001, R1)

```text
npm run dev
```

Start-up runs the migrations. Then confirm the column:

```text
psql "$ENV_DATABASE_URL" -c "select column_name, data_type, column_default, is_nullable from information_schema.columns where table_name = 'polls' and column_name = 'line_graph_enabled';"
```

Expect `boolean`, default `false`, not nullable. Existing rows read `false`.

## 2. Automated suites

```text
npx vitest run tests/line-graph-setting.test.ts
npx vitest run tests/client-admin-wizard.test.ts
npx vitest run tests/line-graph-ui.test.ts
npx vitest run tests/line-graph-route.test.ts
npm test
```

Expect all to pass. The full `npm test` run is the final gate.

## 3. Administrator turns the graph on (US1, FR-004–FR-007)

1. Sign in as an administrator and open a poll on the card.
2. Go to step 4. The circle and heading read "View". The checkbox "Show the line graph" is above the color pickers.
3. Tick it and save.
4. Expect the poll's state unchanged (for a poll with votes, no review and no pause).
5. On a poll with no choices yet, expect step 4 to show the checkbox first, with "Add your choices first, then come back to choose their colors." in place of the color pickers.

## 4. Viewer sees the graph only when on (US2, FR-010, FR-011)

1. Maximize the poll in a second browser. Expect the graph beside the card.
2. Request `GET /api/polls/<pid>/line-graph` directly for a poll with the setting off. Expect `404`.
3. Maximize a poll with the setting off. Expect no graph and no request to the graph route (browser network panel). The right-hand space may stay empty.

## 5. Creator cannot change it (US3, FR-002, FR-003)

1. Sign in as a creator who is not an administrator. Open a poll's step 4.
2. Expect no checkbox; the color pickers are as before.
3. Read the Settings Summary "View" line on a poll whose graph is on. Expect "The line graph is shown."
4. Send a save that carries `lineGraphEnabled` from that account (for example with `curl` and the session cookie). Expect `403`, nothing changed, and one server log line with no address.

## 6. Switched off while open (US4, FR-014)

1. Keep a maximized poll with the graph drawn in the second browser.
2. As an administrator, switch the setting off and save.
3. In the second browser, wait for the next refresh. Expect the graph's "Results are not available yet" note, and the graph area stays until the view is closed.

## 7. Existing and new polls (SC-003)

1. Create a new poll. Expect the setting off.
2. Confirm the test polls from `devScripts/populate/populate-poll.ts` show no graph until switched on.

## 8. Documentation

After implementation: update `README.md` (user-facing behavior of the View step) and `ARCHITECTURE.md`, and `postman/openapi.json` (per `contracts/api.md`).
