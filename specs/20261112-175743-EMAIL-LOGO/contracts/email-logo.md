# Contracts: Email Logo

## C1. The email header's logo (`layout()` in `src/email/templates.ts`)

Every message built by `layout()` (login link, create account, email-change verification and notice, account deleted,
poll invitation and reminder) opens its header cell with exactly:

```html
<img src="<origin>/email-logo.png" width="56" height="56" alt="CrowdPoll" style="vertical-align:middle;border:0;">
```

- `<origin>` is unchanged: the configured `ENV_EMAIL_ASSET_ORIGIN`, else the link's own origin.
- The word mark `<span>` after it, the cell's `#2C6A46` background and padding, and the plain-text part are unchanged.

## C2. `npx tsx devScripts/favicon-ico.ts`

Outputs, in this order (the first two unchanged):

| Output | Source | Check | Log line |
|---|---|---|---|
| `src/public/favicon.ico` | `favicon.svg` at 16, 32, 48 px | each PNG its own size | `[favicon] wrote src/public/favicon.ico (16, 32, 48 px, <n> bytes)` |
| `src/public/email-logo.png` | `og-logo.svg`, 56 px window at 3× | 168 × 168; RGBA 8-bit; top-left alpha 0 | `[favicon] wrote src/public/email-logo.png (168 px, <n> bytes)` |
| `src/public/og-image.png` | `og-logo.svg` on white | 1200 × 630; ≤ 300 000 bytes | unchanged |

Refusals (exit status 1, the email logo not written, `og-image.png` not reached):

- `[favicon] Rendered <w>x<h> for size 56 at 3x`
- `[favicon] The email logo is not an 8-bit RGBA PNG`
- `[favicon] The email logo's background is not transparent`

A missing or failing browser stops it as today.
