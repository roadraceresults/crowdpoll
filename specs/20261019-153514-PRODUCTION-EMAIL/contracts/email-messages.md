# Email Messages: Draft Wording

**Status**: Approved 2026-10-20 by the developer (spec Assumptions, clarify O1).
Each message uses the layout in `ui-contracts.md` C4. `<…>` marks inserted values; every one is escaped in the HTML part.
Sender for all four: `CrowdPoll <no-reply@mail.crowdpoll.vote>`.

## M1. Your sign-in link (`login-link`)

- **Subject**: Your CrowdPoll sign-in link
- **Preheader**: Use this link within 15 minutes to sign in to CrowdPoll.
- **Heading**: Sign in to CrowdPoll
- **Body**: "Use the button below to sign in. The link works once, for 15 minutes."
- **Action**: Sign in → `<sign-in URL>`
- **After the action**: "If you didn't ask to sign in, you can ignore this email; nobody can sign in without this link."

## M2. Create your account (`create-account`)

- **Subject**: Finish creating your CrowdPoll account
- **Preheader**: Someone asked to sign in to CrowdPoll with this address, but it has no account yet.
- **Heading**: Create your CrowdPoll account
- **Body**: "Someone asked to sign in to CrowdPoll with this address, but there's no account for it yet. If it was you, create your account to continue."
- **Action**: Create account → `<create-account URL>`
- **After the action**: "If it wasn't you, you can ignore this email; no account is created unless you finish."

## M3. Verify your new email address (`email-change-verification`)

- **Subject**: Confirm your new CrowdPoll email address
- **Preheader**: Confirm this address within 15 minutes to finish changing your CrowdPoll email.
- **Heading**: Confirm your new email address
- **Body**: "You asked to change your CrowdPoll account's email address to this one. Use the button below to confirm it. The link works once, for 15 minutes."
- **Action**: Confirm new address → `<verification URL>`
- **After the action**: "If you didn't ask for this change, you can ignore this email; your account's address stays as it is."

## M4. Your account email address was changed (`email-change-notice`)

- **Subject**: Your CrowdPoll email address was changed
- **Preheader**: Your CrowdPoll account now uses a different email address.
- **Heading**: Your email address was changed
- **Body**: "The email address on your CrowdPoll account was changed to `<new address>`. This address no longer receives sign-in links."
  "If you didn't make this change, write to support@crowdpoll.vote straight away."
- **Action**: none (FR-010: no action link).
