# Quickstart: Home Tab

## Prerequisites

- Node ≥ 22, `npm install`; development needs PostgreSQL only (in-process cache stands in for Valkey).
- Optional: `ENV_HOME_TAB_REFRESH_INTERVAL=60000` to watch a rebuild within a minute.

## Automated checks

```text
npx tsc --noEmit
npx vitest run tests/home-tab.test.ts tests/config.test.ts
npx vitest run tests/client-home-tab.test.ts tests/client-home-menu-item.test.ts
npm test
```

## Manual scenarios

| # | Story | Steps | Expected |
|---|---|---|---|
| 1 | US1 | Sign in as a user invited to a private poll, with one poll of their own, a vote and a watch, all current; open `/` | Home is selected and first in the bar; the cards come in rule order, each once; trending polls follow |
| 2 | US1 | Close one listed poll; set its `closed_at` 8 days back in the database; wait past the interval | It leaves Home at the next rebuild; one closed 6 days ago stays |
| 3 | US1 | Look at the reason line of an invited-and-watched, an own and a trending-only card | "You were invited · You are watching", "Your poll", "Trending" |
| 4 | US2 | Refresh Home several times within the interval | `stats:home:reused` grows, `stats:home:rebuilt` does not (A1) |
| 5 | US2 | Watch a poll from the Trending tab, then select Home | The poll is in the Watching group |
| 6 | US2 | On Home, vote on a trending card; wait for the timed refresh | The card stays in place; select another tab and Home again: it is in the voted group |
| 7 | US2 | As the poll's creator, make a Home-listed public poll private by invitation, without inviting the user; refresh the user's Home | The poll disappears at the next refresh |
| 8 | US2 | Start with `ENV_HOME_TAB_REFRESH_INTERVAL=1000` | The app stops with "Invalid ENV_HOME_TAB_REFRESH_INTERVAL: 1000 — must be at least 60000." |
| 9 | US3 | On `/settings`, open the avatar menu, choose Home | Home is the first item; `/` opens with Home selected |
| 10 | US3 | On `/` with Trending selected, choose Home in the avatar menu | Home is selected with no reload |
| 11 | US4 | As a guest, open `/` and `/?tab=home`; open the "All tabs" menu | No Home tab anywhere; Trending is selected |
| 12 | US4 | Signed in on Home, log out in another window | Home disappears from this window; Trending is selected |
| 13 | Edge | Restart the app (empty cache) and open Home before the trending sweep runs | Rules 1–4 only; trending polls appear within a minute |
| 14 | SC-007 | Switch Site Settings between Light and Dark | The Home icons and reason line keep the audited contrast |

References: [contracts/api.md](contracts/api.md) A1, [contracts/ui-contracts.md](contracts/ui-contracts.md) C1–C6, [data-model.md](data-model.md).
