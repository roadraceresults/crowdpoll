# Quickstart: Email Logo With Speech Bubble

Prerequisites: Node ≥ 22, `npm install` done, Microsoft Edge (or `FAVICON_BROWSER` set to a Chromium-based browser).

## 1. Regenerate the brand images

```
npx tsx devScripts/favicon-ico.ts
```

Expected: three `[favicon] wrote …` lines, the email logo's reading `(168 px, <n> bytes)` (contract C2).
`git status` shows `src/public/email-logo.png` changed. `favicon.ico` and `og-image.png` should also be unchanged; if
the browser's output varies by a byte, restore them (`git checkout -- src/public/favicon.ico src/public/og-image.png`),
since the feature changes neither (SC-005).

## 2. Run the tests

```
npx tsc --noEmit
npm test
```

Expected: all pass; `email-layout.test.ts` checks the 56 × 56 `<img>` and that every other byte of the six stored
messages is unchanged (research R4).

## 3. Review the logo in a rendered invitation

```
npx tsx devScripts/render-invitation-email.ts <scratch folder> --force
```

Open `<scratch folder>/invitation-email.html` and check, in a light and a dark colour scheme and at 300 % zoom:

- the figures sit inside the white speech bubble with its black outline, beside "CrowdPoll", 56 px tall;
- the edges are sharp at 300 % (no blur from enlarging);
- the area outside the bubble shows the green bar, not white.

## 4. Deploy and see it in real mail

The emails load the logo from `ENV_EMAIL_ASSET_ORIGIN` (`https://crowdpoll.vote`, also in development), so real mail
shows the new logo only after `npm run deploy`. Send yourself an invitation and a login link: both headers show the
new logo. Gmail's image proxy may keep the old one for a while.

## 5. OAuth consoles (optional)

The Google and Microsoft consent logos are uploaded copies and stay as they are. To match, re-upload
`src/public/email-logo.png` as `provider-setup.md` describes.
