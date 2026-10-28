# Data Model: Single Row Header

There is no stored data, no schema change and no migration. The only state is in the page, and it is recomputed, never stored.

## Header fit (in memory, per page load)

| Item | Where | Values |
|---|---|---|
| `data-header-fit` | attribute on `<html>` | absent, or a space-separated list of tokens, in the order applied: `no-name`, `no-search` |
| `--header-search-min-width` | CSS custom property in `header-single-row-m3.css` | `200px` |

### Rules

- **Absent** means the full header (and is the only state below 640 px, where feature 030 applies).
- **Each token implies the ones before it.**
- **Recomputed from nothing** on every measurement; no token is remembered between two measurements.
- **Never written** to storage, a cookie, a URL or the server.

### State transitions

```text
(absent) → no-name → no-name no-search                    each step only while the row overflows
any list → (absent)                                                  when the viewport is a phone, or when the row fits
```

### What a token hides

| Token | Hidden |
|---|---|
| `no-name` | `#header-username` |
| `no-search` | `.header-search` (and the Search tab field is shown) |

The word mark, the avatar and the guest buttons are never hidden above 640 px.

## Search terms

The header box and the Search tab field each hold a string in the page; while `no-search` is set, edits to the field are copied to the header box through `SiteSearch.set`. Nothing outlives the page.
