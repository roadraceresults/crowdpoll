# Quickstart: Privacy Policy, Terms of Service and Account Deletion

## 1. One-time: fetch the fonts (developer)

The three families are committed as files (research R11). To fetch them, ask the Google Fonts CSS API for `woff2`
with a modern browser's user agent, then download each `latin` and `latin-ext` file it lists:

```sh
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
curl -s -A "$UA" "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Inter:wght@400..700&family=Roboto:wght@400..700&display=swap" > scratch-fonts.css
```

Save each file as `src/public/fonts/<family>-<subset>.woff2` (e.g. `inter-latin.woff2`), write `src/public/fonts/fonts.css`
from the `@font-face` rules with the URLs changed to `/fonts/<file>.woff2`, and add each family's `OFL.txt` to
`src/public/fonts/`. This is the only time anything is fetched from Google.

## 2. Automated checks

```sh
npm test
npm run build
```

Expected: the suite passes, including the new tests for the gate, create-account agreement, accept-terms, account
deletion, the retention sweep, session IP clearing, masked log lines, the footer, the Cookie Use list and "no
third-party request" on every page.

## 3. Local checks (`npm run dev`, `devScripts/launch-dev.ps1`)

1. As a guest, open `/`, `/login`, `/create-account`, `/privacy`, `/terms`: each ends with the footer; each footer link
   works; Cookie Use lands on the cookie table.
2. With the browser's network panel open, reload `/`: every request goes to `localhost` (no `fonts.googleapis.com`).
3. Create Account: the button stays disabled until the address is typed **and** the box is ticked; create the account;
   in `psql`, `select terms_version, terms_accepted_at from "user" where email = '…'` shows `2026-11-01` and a time.
4. In `psql`, set `terms_version = null` for that account; reload `/`: you land on `/accept-terms?next=%2F`; Accept
   brings you back to `/`.
5. In `psql`, `select "ipAddress", "userAgent" from session` shows nulls.
6. On Profile → Your Data → Delete Account: the button stays disabled until `DELETE` is typed; delete; you are a guest
   on `/`, and the "account deleted" email arrives. A vote you cast on another account's poll now shows "Deleted user"
   and the counts are unchanged; your own polls are gone.
7. Trigger the create-account rate limit: the log line shows `client …x`, never the full address.

## 4. Production (operator, after the push)

1. In ImprovMX, add the alias `privacy` → the operator's Gmail inbox (as for `support`); send a test message to
   `privacy@crowdpoll.vote` and see it arrive.
2. The migration runs at start-up; the existing tester accounts are asked to accept the Terms on their next visit.

## 5. Before public launch (operator)

1. Replace `[OPERATOR NAME]`, `[MAILING ADDRESS]` and `[PROVINCE]` in both pages.
2. In the DigitalOcean console, read the App Platform runtime-log retention and the managed PostgreSQL backup window,
   and replace the two `[TO CONFIRM]` cells in the retention table; confirm where ImprovMX processes mail.
3. Have a lawyer review both documents; if the wording changes after accounts have accepted, raise `TERMS_VERSION`
   so they accept again.
4. Remove `ENV_ALLOWED_EMAILS` (the pre-launch allowlist) only after 1–3.
