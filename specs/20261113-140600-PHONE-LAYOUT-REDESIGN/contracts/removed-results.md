# Contract: what is removed with Poll Results

## X1. Addresses (FR-035, FR-036)

| Request | Before | After |
|---|---|---|
| `GET /admin/poll/results?PID=<pid>` | the creator's results page | 404 |
| `GET /api/admin/polls/<pid>/results` | `PollResults` JSON | 404 |
| `GET /api/admin/polls/<pid>/export.json` | attachment `<pid>.json` | 404 |
| `GET /api/admin/polls/<pid>/export.md` | attachment `<pid>.md` | 404 |

For any caller: owner, administrator, other user, guest.

## X2. Interface

- `src/public/` holds 12 `.html` pages; `admin-results.html` and `adminResults.js` are absent.
- An admin card's header has three icon buttons (Duplicate, Copy link, Delete) and the menu button; the menu has no
  "View Results"; `admin.html` has no `icon-results` symbol.
- `postman/openapi.json` has none of the three API paths, and no `PollResults` or `Participant` schema.

## X3. Tests removed or edited

| File | Change |
|---|---|
| `tests/polls-admin-participants.test.ts` | remove the results and export cases (`:131`, `:152`, `:169`, `:188`, `:227`, `:290`, `:520-531`, `:564`); keep the card and edit-session ceiling cases |
| `tests/polls-admin-crud.test.ts` | drop `/results`, `/export.json`, `/export.md` from `:113`, `:140-142`; remove the export half of `:487` |
| `tests/polls-discovery.test.ts` | drop the export calls at `:202-203` and "export" from the title |
| `tests/who-voted-route.test.ts` | `:153`: assert through the voters route and the database instead of the results route |
| `tests/client-delete-account.test.ts` | remove the describe at `:177` |
| `tests/pages.test.ts` | remove the describe at `:81`; `ADMIN_PAGES` is `["/admin"]`; drop the row at `:259` |
| `tests/poll-card-assets.test.ts` | `icon-results` out of `SYMBOLS` (`:305`); the tooltip check at `:338`; the `.admin-field input` check at `:363-366` |
| `tests/m3-assets.test.ts` | `PAGES["admin-results.html"]` removed; the "six pages" title corrected |
| `tests/viewport-width-pages.test.ts` | 12 pages |
| new: `tests/removed-results.test.ts` | X1's four 404s for an owner and an administrator |

## X4. Kept (FR-038)

`computeResults`; `GET /api/me/polls/:pid/voters` and the Who voted report; the admin card's counts and invitee panel;
`withinDisplayLimit`; `devScripts/extract/*`.
