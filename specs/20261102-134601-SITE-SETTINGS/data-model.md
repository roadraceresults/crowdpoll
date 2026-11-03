# Data Model: Site Settings and Color Scheme

## `user.color_scheme` (migration `016-color-scheme`)

| Column | Type | Null | Default | Constraint |
|---|---|---|---|---|
| `color_scheme` | `text` | yes | `NULL` | `check (color_scheme in ('light', 'dark'))` |

- `NULL`: never chosen; shown and answered as `"light"` (FR-010, FR-017).
- `'light'`, `'dark'`: the user's choice, written only by `PATCH /api/me` (contracts A2).
- No backfill: every existing user starts at `NULL`.
- Deleted with the row by `deleteAccount` (FR-019).
- `down()` drops the column.
- Schema: `UserTable.color_scheme: string | null` (`src/db/schema.ts`).
- Session: `sessionCache.ts` `lookup()` selects it beside `permissions` and `terms_version` and sets
  `session.user.colorScheme` to `"dark"` or `"light"`. `forgetUserSessions` after each PATCH keeps the cached copy
  current (research R1, R2).

## Device copy: `localStorage.colorScheme`

| Key | Values | Written by | Removed when |
|---|---|---|---|
| `colorScheme` | `"dark"` only | `ColorScheme.apply("dark")` | Light is applied: a Light choice, Logout, or a page load that finds no session |

- Never authoritative: the account's value overwrites it on every page load (FR-012).
- Absent or unreadable means Light until the account is read.
- Listed in `privacy.html` Cookie Use (FR-013).

## State on the page: `<html data-theme>`

| Shown | Attribute |
|---|---|
| Light | absent |
| Dark | `data-theme="dark"` |

`data-theme="light"` is no longer written anywhere: the admin pages' pin is removed (research R8).

## Transitions

```text
page load ──► head script: copy "dark" ? Dark : Light
          └─► GET /api/me
                ├─ 200, colorScheme "dark"  ─► Dark, copy = "dark"
                ├─ 200, colorScheme "light" ─► Light, copy removed
                ├─ 401                      ─► Light, copy removed
                └─ network error            ─► unchanged

Settings radio change ─► apply at once ─► PATCH (serialized)
                ├─ 200 ─► lastSaved = choice; Session.refresh() ─► other tabs apply
                ├─ 401 ─► /login
                └─ other failure ─► apply lastSaved, reselect it, show the message
```
