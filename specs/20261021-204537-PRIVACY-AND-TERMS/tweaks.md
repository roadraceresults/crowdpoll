# Overview: `specs/20261021-204537-PRIVACY-AND-TERMS`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261021-204537-PRIVACY-AND-TERMS` |
| Tweak file created | 2026-10-22 03:30 |
| Last updated | 2026-10-22 12:38 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAKS01 Check The Self-Hosted Font Files  
[X] Resolved  
[X] Run Tests  
for R11 is this correct?

    Directory: C:\code\UI-UX-PRIVATE-POLLS\crowdpoll02\src\public\fonts

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a---          2026-10-21 10:22 PM           2256 fonts.css
-a---          2026-10-21 10:22 PM          59388 fraunces-latin-ext.woff2
-a---          2026-10-21 10:22 PM          67304 fraunces-latin.woff2
-a---          2026-10-21 10:22 PM          85068 inter-latin-ext.woff2
-a---          2026-10-21 10:22 PM          48256 inter-latin.woff2
-a---          2026-10-21 10:22 PM           4391 OFL-fraunces.txt
-a---          2026-10-21 10:22 PM           4377 OFL-inter.txt
-a---          2026-10-21 10:22 PM           4394 OFL-roboto.txt
-a---          2026-10-21 10:22 PM          29392 roboto-latin-ext.woff2
-a---          2026-10-21 10:22 PM          43136 roboto-latin.woff2

### RECOMMENDATION

Yes, the folder is what research R11 specifies; no change is needed.  
- Six variable `woff2` files: Fraunces, Inter and Roboto, each in the Latin and Latin Extended subsets, which cover English and the accented Latin letters.  
- The three OFL licence texts, one per family; the SIL Open Font License requires them to travel with the fonts.  
- `fonts.css`: six `@font-face` rules, each `font-weight: 400 700`, `font-display: swap` and the subset's `unicode-range`, all pointing at `/fonts/<file>.woff2`.  
  It sits in `fonts/` rather than the site root on purpose: the page rewrite fingerprints only root-level references, so `/fonts/fonts.css` and the fonts are always served by the instance, never by the Spaces CDN, where `/fonts/` does not exist (R11, last paragraph).  
- Every weight the stylesheets use (400, 500, 600, 700, and Fraunces' 440 from the old Google request) is within 400–700.  
  One rule asks for `font-weight:1000`; the browser draws it at 700, exactly as it did with the Google files, which also stopped at 700.  

Verify with the tests that already cover it (`Run Tests` is ticked): `tests/no-third-party.test.ts` (every page links `/fonts/fonts.css`, nothing names Google, every file `fonts.css` names exists), `tests/m3-assets.test.ts` (each page loads the font sheet first) and `tests/legal-pages.test.ts`.  
No artifact changes.  
2026-10-22 03:35  

### TWEAKS ACCEPTED

No code change: the folder matches research R11 (six variable `woff2` files, three OFL licences, `fonts/fonts.css` with six `@font-face` rules).  
Tests run (Run Tests ticked): `tests/no-third-party.test.ts`, `tests/m3-assets.test.ts`, `tests/legal-pages.test.ts`: 3 files, 81 tests passed.  
No test was added: those suites already assert what the question asks.  
Artifacts: none needed.  
2026-10-22 03:35

## TWEAKS02 Readable Terms Agreement Dialog  
[X] Resolved  
[] Run Tests  
Please make the Terms of Service dialog look more readable.
A screenshot is shown below for reference.
![Terms of Service dialog](dontTrack/terms-of-service-dialog.jpg)

### RECOMMENDATION

The screenshot shows three problems on the accept page (`/accept-terms`); the first and second also affect the Create Account and Login cards, which use the same box.  
1. The agreement sentence is broken into columns.  
   `.card-shell-body label.checkbox` is a flex row, and `CardShell.termsBox` put five text nodes and two links straight into the label, so each became a flex item.  
   Fix: `src/public/cardShell.js` wraps the sentence in one `<span class="terms-box-text">`, so the label holds two items, the box and the sentence, and the sentence wraps as a paragraph.  
2. The links are the browser's default blue.  
   Fix: `src/public/card-shell-m3.css` gives `.terms-box` and `.login-terms-line` links the primary colour, aligns the box with the first line of text and spaces it 12px from it.  
3. Accept and Sign Out are two identical filled buttons stacked on top of each other.  
   Fix: `src/public/acceptTermsCard.js` marks Sign Out `btn-text`; `card-shell-m3.css` draws it outlined in the primary colour and places the two side by side, Accept on the right, as Material 3 dialogs do.  

Tests: `tests/client-terms-box.test.ts`, the label holds exactly the box and one `.terms-box-text` span with the full sentence, and Sign Out (only) carries `btn-text`.  
Written but not run, since `Run Tests` is not ticked.  
Artifacts: `contracts/ui-contracts.md` C5.  
2026-10-22 04:02  

### TWEAKS ACCEPTED

- `src/public/cardShell.js`: `termsBox` puts the sentence and its two links in one `.terms-box-text` span.  
- `src/public/card-shell-m3.css`: section 10 (agreement box layout and primary-coloured links) and section 11 (an outlined `btn-text` secondary action beside the main one).  
- `src/public/acceptTermsCard.js`: Sign Out carries `btn-text`.  
- Tests: `tests/client-terms-box.test.ts` extended (label structure, Sign Out style); tests postponed (Run Tests not ticked), not run, so the change is unverified by a run.  
- Artifacts: `specs/20261021-204537-PRIVACY-AND-TERMS/contracts/ui-contracts.md` C5.  
2026-10-22 04:02

## TWEAKS03 Terms of Service Line Break
[X] Resolved  
[x] Run Tests  

On the Terms of Service Dialog,
make the lines Terms of Service line break after "Terms of Service" and read as follows:
I agree to the Terms of Service 
and have read the Privacy Policy.

### RECOMMENDATION

Break the agreement sentence after "Terms of Service" with a `<br>`, so it reads on two lines:  
"I agree to the Terms of Service" / "and have read the Privacy Policy."  
- `src/public/cardShell.js`: `termsBox` inserts a `<br>` after the Terms link and starts the second text node with "and".  
  The box is shared, so the Create Account card and the OAuth Login card change the same way.  
- Test: `tests/client-terms-box.test.ts` asserts the two lines (the `<br>` read as a line break).  
  Run Tests is ticked, so the agreement-box suites are run.  
- Artifact: `contracts/ui-contracts.md` C3 wording.  
2026-10-22 11:14  

### TWEAKS ACCEPTED

- `src/public/cardShell.js`: a `<br>` after the "Terms of Service" link; the second line reads "and have read the Privacy Policy.".  
- Test: `tests/client-terms-box.test.ts` updated to assert the two lines.  
- Tests run (Run Tests ticked): `client-terms-box`, `client-login-pid`, `client-honeypot`, `legal-pages`, `accept-terms`: 5 files, 28 tests passed; `tsc` passes.  
- Artifact: `specs/20261021-204537-PRIVACY-AND-TERMS/contracts/ui-contracts.md` C3.  
2026-10-22 11:14

## TWEAKS04 Login Page Agreement Line Break  
[X] Resolved  
[x] Run Tests  
 On the   login page

 By signing in you agree to the Terms of Service
 and Privacy Policy.

### RECOMMENDATION

Break the Login card's agreement line after "Terms of Service" with a `<br>`, so it reads:  
"By signing in you agree to the Terms of Service" / "and Privacy Policy."  
- `src/public/cardShell.js`: `termsLine` inserts a `<br>` after the Terms link and starts the second line with "and".  
- Test: `tests/client-terms-box.test.ts` asserts the two lines.  
  Run Tests is ticked, so the Login card suites are run.  
- Artifact: `contracts/ui-contracts.md` C4 wording.  
2026-10-22 11:17  

### TWEAKS ACCEPTED

- `src/public/cardShell.js`: a `<br>` after the "Terms of Service" link in `termsLine`; the second line reads "and Privacy Policy.".  
- Test: `tests/client-terms-box.test.ts` updated to assert the two lines.  
- Tests run (Run Tests ticked): `client-terms-box`, `client-login-pid`, `client-not-launched`, `login-stay-duration`: 4 files, 26 tests passed; `tsc` passes.  
- Artifact: `specs/20261021-204537-PRIVACY-AND-TERMS/contracts/ui-contracts.md` C4.  
2026-10-22 11:17  

## TWEAKS05 Digital Ocean Log Retention
[X] Resolved  
[x] Run Tests  

Question: What is the retention period for DigitalOcean App Platform runtime logs?  
Is this something that I determine?

### RECOMMENDATION

Answer: no, you do not set it, unless you add log forwarding.  
App Platform keeps no runtime logs: they are shown live in the console, and "To retain runtime logs, configure log forwarding to an external provider" ([How to View Logs in App Platform](https://docs.digitalocean.com/products/app-platform/how-to/view-logs/), [How to Forward Logs](https://docs.digitalocean.com/products/app-platform/how-to/forward-logs/)).  
CrowdPoll forwards no logs, so none are stored.  
Build and deploy logs are kept for 90 days, but they hold no personal data.  
The managed PostgreSQL backups, the other `[TO CONFIRM]` cell in the same table, are taken daily and kept for 7 days; DigitalOcean sets that, not you ([Restore PostgreSQL from backups](https://docs.digitalocean.com/products/databases/postgresql/how-to/restore-from-backups)).  

Change:  
- `src/public/privacy.html` and `contracts/privacy-policy.md`, retention table: Server logs → "not stored: DigitalOcean shows them live and keeps none, and we forward them nowhere"; Database backups → "7 days, after which deleted data is gone from backups too".  
- `spec.md` FR-020 and `research.md` R14: the two facts, with their sources; adding log forwarding later would change the policy row.  
- Test: `tests/legal-pages.test.ts` asserts no `[TO CONFIRM` remains and the backup row says 7 days.  
2026-10-22 11:41  

### TWEAKS ACCEPTED

- Answered: App Platform retains no runtime logs (only live viewing; retention needs log forwarding, which CrowdPoll does not use); PostgreSQL backups are kept 7 days; neither is set by you.  
- `src/public/privacy.html`, `contracts/privacy-policy.md`: both `[TO CONFIRM]` cells filled.  
- `spec.md` FR-020, `research.md` R14 updated.  
- Test: `tests/legal-pages.test.ts`, one test added.  
- Tests run (Run Tests ticked): `legal-pages`, `cookie-use-list`, `no-third-party`: all passed (`legal-pages` 8 tests after the addition).  
- This also answers question 1 of TWEAKS06's clarifications.  
2026-10-22 11:41  


## TWEAKS06 Confirm The Quickstart Steps  
[X] Resolved  
[x] Run Tests  
 As a confirmation of quickstart.md steps.
 Everything has been complted except the lawyer review. 
 The Prod site is still restricted to test users only.

### CLARIFICATIONS

Before T049 and T052 in `tasks.md` are marked done, three things do not match "everything has been completed":  
1. `src/public/privacy.html` still has two `[TO CONFIRM]` cells in the retention table (lines 110 and 111): the App Platform runtime-log retention and the managed PostgreSQL backup window (quickstart §5 step 2).  
   What should they say?  
   For example "7 days" for backups, if that is what the DigitalOcean console shows; I will not guess the values.  
2. Nothing from this feature is committed or pushed yet: the last commit is `2b8ae57` (the allowlist), with 77 files changed or new.  
   So production cannot yet show `/privacy`, `/terms` or the agreement box, and the after-push checks in quickstart §4 cannot have run against it.  
   Did you mean the local checks (§3) and the ImprovMX `privacy` alias are done, with the push still to come?  
3. The ImprovMX row's "Where" cell (`privacy.html` line 90) now reads "@gmail.com addresses.".  
   That describes where mail is forwarded, not where ImprovMX processes it.  
   Should it name ImprovMX's location instead, or should the row be reworded, e.g. "forwards it to a Gmail inbox" in the middle column and the location in "Where"?  

Answer here or in chat, then Type or Say "Next".  
2026-10-22 11:36

Follow-up (2026-10-22 11:46):  
- Question 1 is answered by TWEAKS05 (both retention cells are filled).  
- Question 2, suggested answer: "the local checks and the ImprovMX alias are done; the push is still to come".  
  Then T049 is marked done for §3 and the alias, and §4's production check stays with the push.  
- Question 3, suggested answer: ImprovMX's privacy policy says it may process data "in the United States and Europe" ([ImprovMX privacy policy](https://improvmx.com/privacy-policy/)).  
  So the row would read: "mail you send to our @crowdpoll.vote addresses, which it forwards to our Gmail inbox" | "United States and Europe".  
Reply "yes" to take both suggestions, or give your own answers.

Answer to question 2 (2026-10-22, in chat): the suggestion is accepted; the local checks and the ImprovMX alias are done, and the push is still to come.  
Question 3 is still open.

### RECOMMENDATION

With the three clarifications answered (question 1 by TWEAKS05, questions 2 and 3 in chat):  
- `src/public/privacy.html` and `contracts/privacy-policy.md`, the ImprovMX row: "mail you send to our @crowdpoll.vote addresses, which it forwards to our Gmail inbox" | "United States and Europe" ([ImprovMX privacy policy](https://improvmx.com/privacy-policy/)).  
- `tasks.md`: T049 marked done (local checks and the ImprovMX alias); T052 stays open for the lawyer review, with a note that the placeholders, retention facts and ImprovMX location are done.  
- Test: `tests/legal-pages.test.ts` asserts the ImprovMX row.  
2026-10-22 11:47  

### TWEAKS ACCEPTED

- `src/public/privacy.html`, `contracts/privacy-policy.md`: the ImprovMX row now says what it forwards and where it processes mail.  
- `tasks.md`: T049 [X]; T052 open for the lawyer review only.  
- Quickstart status as confirmed by the developer: the local checks (§3) and the ImprovMX `privacy` alias are done; the push is still to come, and with it the production check (§4); before public launch, only the lawyer review remains (§5 step 3).  
- Test: `tests/legal-pages.test.ts` asserts the ImprovMX row.  
- Tests run (Run Tests ticked): `legal-pages` (8 tests), `cookie-use-list`, `no-third-party`: all passed.  
2026-10-22 11:47  

## TWEAKS07 Footer Coloured Like The Email Header  
[X] Resolved  
[ ] Run Tests  

Make the footer have the background color that is the same color as the header in the emails.
The font color is white.
The footer extends the same width as the header.

### RECOMMENDATION

The requirement can be read two ways: "the footer" may be the site's footer (coloured like the emails' green header band), or the emails' own footer.  
The emails' header is `#2C6A46` with white text, which is the site's light-theme primary colour (`--md-sys-color-primary` / `--md-sys-color-on-primary`).  

- **Option A** _(recommended)_: the site footer becomes a green band like the email header.  
  `src/public/footer-m3.css`: `.site-footer` gets `background:var(--md-sys-color-primary)`, `color:var(--md-sys-color-on-primary)`, links in the same white, rounded corners like the cards; it keeps the header's column width (it already sits in the page's centred column, as wide as the header).  
  In dark mode the tokens switch to the dark primary (light green with dark text), so it stays readable.  
  Test: `tests/client-footer.test.ts` (or a sheet test) asserts the footer rule uses the primary and on-primary tokens.  
  - <u>Pros</u>: the footer reads as a deliberate band that matches the brand colour the emails use; uses existing tokens, no literal colour.  
  - <u>Cons</u>: a strong colour at the foot of every page.  
- **Option B**: the emails' footer gets the header's background.  
  `src/email/templates.ts`: the footer `<td>` takes `background:#2C6A46` and white text and links, the same 600px row as the header; `tests/mailer.test.ts` asserts it.  
  - <u>Pros</u>: the emails look framed top and bottom.  
  - <u>Cons</u>: the muted footer text (support address, "you received this email because…") becomes heavier; the site is unchanged.  

Which one?  
2026-10-22 12:29

### TWEAKS ACCEPTED

Option A, chosen by the developer in chat ("a").  
- `src/public/footer-m3.css`: the site footer is a band in the primary colour (`#2C6A46` in the light theme, the emails' header colour) with on-primary (white) text and links, rounded corners, and the header column's width: `min(100% − 40px, --max-width − 40px)`, centred (100% − 28px on a phone, matching the container's 14px sides).  
  Links are underlined, thicker on hover, with a white focus outline; the bottom margin still clears the cookie banner.  
  In dark mode the tokens switch to the dark-theme primary and on-primary.  
- Test: `tests/client-footer.test.ts`, "the footer's look": asserts the background, text colour, width, margin and phone rule; tests postponed (Run Tests not ticked), not run, so the change is unverified by a run; `tsc` passes.  
- Artifact: `specs/20261021-204537-PRIVACY-AND-TERMS/contracts/ui-contracts.md` C1.  
2026-10-22 12:38  

## TWEAKS08 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  
