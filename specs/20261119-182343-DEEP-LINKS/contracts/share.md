# Contract: The Share Button

| # | Rule | Spec |
|---|---|---|
| S1 | Each face of a poll card has a `.share-btn` in its `.question-row`, before Watch and Maximize, in the grid and maximized, for guests too. | FR-020 |
| S2 | It is shown only when the card's `pollState` is `WAITING TO OPEN`, `OPEN` or `CLOSED` (a published poll); otherwise, including the creator's own card while `EDITING`, it is hidden (not disabled). | FR-020, FR-021 |
| S3 | Its accessible name is `Share poll: <title>`; its tooltip is `Share poll`; its icon is three joined circles, `aria-hidden`. | FR-025 |
| S4 | The link it offers is `SharePoll.link(pid)` = `<origin>/?PID=<pid>`, the same function `adminCard.js` uses for "Copy poll link". | FR-022 |
| S5 | A press calls `navigator.share({ title, url })` first thing when `navigator.share` exists; otherwise it writes the link to the clipboard first thing. | FR-023 |
| S6 | After a clipboard write the snackbar says `Link copied`; after a failed write, `Could not copy the link`. | FR-023 |
| S7 | A share sheet the visitor cancels (`AbortError`) shows nothing; any other refusal of `navigator.share` falls back to S5's clipboard write and S6. | FR-023, FR-024 |
| S8 | In the phone layout it is a 48 px control with the 64 px halo, like Watch and Maximize; the title keeps clear of it. In the wide layout it is 32 px like them. | FR-025 |
| S9 | Pressing Share does not maximize, flip or select the card, and changes no data. | — |
