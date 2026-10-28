# Quickstart: validating Material 3 Merge (024)

## Prerequisites

- Node 22, `npm install`.
- For the browser checks: a dev server (`npm run dev` through `devScripts/launch-dev.ps1`, with
  the `ENV_*` defaults) and the prototypes, served from `prototypes/POLL-CARD-MATERIAL3/` by any
  static server (for example `npx serve prototypes/POLL-CARD-MATERIAL3`).

## Automated, after each step

```bash
npm test            # the whole suite; each step adds the tests in research.md R17
npm run build       # tsc + build-assets: the new .css/.js are fingerprinted with no build change
```

Expected:
- Step 1: `tests/m3-assets.test.ts` passes, and every existing test passes unchanged.
- Steps 2–4: the new and updated tests in R17 pass.
- Step 5: the dark-twin and `data-theme="light"` assertions pass.
- Step 6: `tests/polls-admin-wizard.test.ts` and `tests/client-admin-wizard.test.ts` pass, with
  the rewritten and retired tests of research R26; `npm run build` also type-checks the new
  `Poll.keywords`.
- At every step, `dist/public/assets/` holds a fingerprinted copy of each new file.

## Manual, while Steps 1–4 are in progress

Dark mode can be forced in the browser console with
`document.documentElement.dataset.theme = "dark"` (and `"light"` to go back). A device set to
dark must still show the light site until Step 5.

| # | Check | Expected |
|---|---|---|
| Q1 | After Step 1, compare every page with `dev` at desktop and 375px | No visible difference |
| Q2 | After Step 2, as a guest: click, Tab plus Enter, and hover Favorites | `/login`; then the tooltip "Sign in to use this tab" |
| Q3 | Trigger "You are refreshing too quickly." (refresh Trending twice quickly) | A snackbar with Close, announced by a screen reader; Close hides it |
| Q4 | Avatar: Tab to it, press Enter, then Escape | The menu opens with `aria-expanded="true"`; Escape closes it and focus is back on the avatar |
| Q5 | At 375px | Narrow padding, one card per row |
| Q6 | Admin page: edit a title, then Cancel; repeat with the back link | "Discard changes?" with focus on Keep editing; each answer as in spec US5 |
| Q7 | After Step 3, reduced motion on (OS setting) | No ripple or entrance animation; hover tints and the focus ring still show |
| Q8 | After Step 4, Profile: save a new user name with the cookie banner showing | "User name saved" above the banner for 4 s |

## Step 6: the admin cards

On the dev server, signed in as an `ENV_ADMINS` address, on `/admin` (light only: the page keeps
`data-theme="light"`). Compare with `prototypes/POLL-CARD-MATERIAL3/ADMIN-CARDS/admin-cards.html`.

| # | Check | Expected |
|---|---|---|
| Q9 | Create New Poll | The new card opens its wizard at Step 1 with "Everyone on CrowdPoll" selected; Create New Poll is disabled while it is open |
| Q10 | Walk Steps 1–5 with Next; hover Publish before Step 5 | Circles turn to check marks; Publish is greyed, focusable, and its tooltip names what is missing |
| Q11 | Answer Steps 1–3 only, then Save | Back on the read-only face, still INITIALIZED; the summary shows the answered steps; a tap on its choices reopens Step 3 with the progress; after a reload it reopens at Step 1 with the same answers |
| Q12 | Public poll with keywords `bake sale, school`; Publish; once approved, search the home page for "bake" | The card shows AWAITING APPROVAL; the poll is found by the keyword |
| Q13 | Switch a saved poll to "Anyone you send the link to" and Save | Its keywords line disappears and the stored keywords are cleared |
| Q14 | An OPEN poll with votes | Only the title, subtitle and end are links; the wizard opens at the tapped step with the other steps greyed and the review line; Save changes is greyed until an edit; saving sends it to AWAITING APPROVAL |
| Q15 | Edit, then Cancel and the back link, in both wizards | "Discard changes?" each time; Keep editing keeps the edits |
| Q16 | Each state's when-line (INITIALIZED, AWAITING APPROVAL, WAITING TO OPEN, OPEN, CLOSED, ARCHIVED) | Worded as `contracts/ui-contracts.md` C15 |
| Q17 | 320px and 360px windows | The wizard fits without sideways scrolling; cards are capped at 420px elsewhere |
| Q18 | Create a poll, answer Steps 1–3, Save; switch to Awaiting and back to Newest; tap its choices | The wizard reopens at Step 3 with Steps 1–3 visited (FR-040) |
| Q19 | An OPEN poll still holding "Choice 1 / Choice 2" (old data): change its title and Save changes | The card shows AWAITING APPROVAL, not INITIALIZED (FR-049) |
| Q20 | Compare the admin page with the Step 6 build, light and at 360px | No visible difference after the unused rules are removed (FR-050) |

## Before 024 merges to `dev` (after Step 6)

Run the browser checklist in the source requirements (Step 5 of
`designDocs/024-high-level-requirements-MATERIAL3-MERGE.md`).
- Check each prototype with Theme set to Light and to Dark, then the same surface on the merged
  page.
- Use 320px, 640px, 768px and desktop widths, with the device in light and in dark.
- Additionally:
  - each admin page with the device set to dark stays fully light;
  - every bar's text on a dark card reads clearly (≥ 7:1 is asserted by the tests).

Every item must pass (SC-006), including the checklist's `ADMIN-CARDS/admin-cards.html` entry on
the prototype and then on the merged admin page, before the feature branch's one pull request
into `dev` is opened.
