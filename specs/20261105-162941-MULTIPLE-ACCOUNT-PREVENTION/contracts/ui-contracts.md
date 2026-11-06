# UI Contracts

No visible control changes. C1–C3 are the browser's behaviour; C4–C6 are the pages' words.

## C1. `deviceEvidence.js`

Loaded with `defer` by `index.html`, `profile.html`, `settings.html`, `admin.html` and `admin-results.html`, before `voteClient.js` where both appear.

It exposes `window.DeviceEvidence.headers()`, which returns `{ "X-Device-Fingerprint": value }` when the value is ready and `{}` otherwise.

At page idle (`requestIdleCallback`, or a timeout where that is absent), it computes **only when all of these hold**:

1. `SiteConfig.deviceEventsEnabled` is true;
2. the session snapshot is signed in, with the Terms accepted;
3. the page can vote, or `/api/me` answered `X-Device-Login-Due: 1`.

It computes at most once per page load, injects `/vendor/fingerprintjs-5.3.0.min.js`, calls `FingerprintJS.load({ monitoring: false })`, and builds the value of contract A1 as `research.md` R3 describes.

**Any failure** (a blocked script, an exception, a value of the wrong shape) leaves `headers()` returning `{}`, with no message to the user and nothing logged in the browser console.

It writes no cookie or storage key of its own, and its value stays in page memory.

## C2. Reporting a sign-in

When `/api/me` answered `X-Device-Login-Due: 1`, then once the value is ready or computing has failed, the page sends one `POST /api/me/device-login` with `headers()`.
A failure of that request is ignored.

`app.js`'s `fetchMe` makes the header available to the script, for example as `window.DeviceSignInDue`. The session snapshot, and so `sameSnapshot`, does not change.

## C3. Voting

`voteClient.js`'s `post` adds `DeviceEvidence.headers()` to its fetch, when that script is present.
It never waits for the value.

## C4. Privacy Policy: corrected statements

| Where | Now | Becomes |
|---|---|---|
| "In short" | No tracking: no analytics, no advertising, no profiling, nothing that follows you to other sites. | No analytics, no advertising, nothing that follows you to other sites. We do record a [fingerprint of your device and browser](#device-evidence) when you sign in and vote, to help uphold one account per person. |
| Section 6, closing line | We do not use analytics, advertising, profiling, or anything that follows you to other sites. We do not record which pages you look at. | We do not use analytics, advertising, or anything that follows you to other sites. We do not record which pages you look at. |
| Bot and AI Agent Detection, **How long** | held in memory for at most one hour, then gone. It is not stored with your account. | The same, then: "This is separate from the [device evidence](#device-evidence) described below." |
| Section 7, retention table | | A new row: "Device evidence: 3 months, removed once a month, so about 4 months at most; deleted at once with your account, and a vote's record is deleted with its poll" |
| "See your data" | | Unchanged; the copy includes these records |

`id="bot-check"` stays. The word "profiling" no longer appears as something we promise not to do, since the later analysis of these records may be profiling.

## C5. Privacy Policy: the new section

`<section id="device-evidence">`, placed after the bot and AI agent detection section, titled **Device Evidence**:

- **What it records**: when you sign in and each time you vote, your account, the time, which poll for a vote, and two scrambled codes made from characteristics of your browser and device (such as how it draws graphics, and your screen, processor count, time zone and platform). It never records how you voted.
- **Why**: CrowdPoll's rule is one account per person. These records let us look for one device voting from several accounts. A shared device is normal, so a match alone does not mean anyone broke the rule. It is never used for advertising.
- **Where**: on CrowdPoll's own servers, using the open-source FingerprintJS software. It is never sent to or shared with a third party. The codes are scrambled with a secret key, so they mean nothing outside CrowdPoll, and the characteristics themselves are not kept.
- **Who sees it**: only CrowdPoll's operators. Poll creators and other users cannot.
- **How long**: 3 months, removed once a month, so about 4 months at most. It is deleted at once with your account, and a vote's record is deleted with its poll.
- **Cookies**: it keeps no cookie and stores nothing in your browser. The software checks whether your browser accepts cookies by setting a test cookie and removing it at once.

A lawyer reviews this wording before the public opening (FR-028).

## C6. Terms of Service, and the version

- After "One account per person; do not create accounts for others or share yours.", add: "To help uphold this, we record a fingerprint of your device and browser when you sign in and vote, as our [Privacy Policy](/privacy#device-evidence) explains."
- `TERMS_VERSION` and the dates on both pages take the release date.
- No page claims that one vote per person is ensured or guaranteed.
