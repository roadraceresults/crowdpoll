# UI Contracts: Social Sign-In

## C1. The Login card

- **`native`**: unchanged (email form, the terms line).
- **`oauth`**: one button per enabled provider, then the line "By signing in you agree to the Terms of Service and
  Privacy Policy."; no email form.
- **`both`**: the provider buttons, a divider "or", then the email form and its terms line.
- No Terms box (TWEAKS06): an account that has not accepted the current Terms is sent to `/accept-terms` after the
  sign-in, as the terms gate already did; that card reads "Welcome to CrowdPoll" / "Before you continue, please accept the
  Terms of Service." when `GET /api/me` reports `termsFirstAcceptance`, and "Updated Terms of Service" otherwise, with
  the lock badge either way.
- Each provider button: the provider's official logo (`/oauth/<provider>.svg`) and wording — "Sign in with Google",
  "Sign in with Apple", "Sign in with Microsoft", "Login with Amazon" — full width, in that order, following each
  provider's button guidelines (Apple: black button with white logo, or white with black in dark mode; Google: white
  button with the four-colour G; Microsoft: white with the four-square logo; Amazon: its yellow button).
- Pressing a button shows a spinner on it and disables the others while the start request runs.
- `?error=<code>` shows its message (research R8) in the card's status line.
- Above the title, a lock badge (a 40 px circle in `--md-sys-color-primary-container`), with the close control beside
  it (TWEAKS05).
- The subtitle is lines, then "We do not store passwords." in 12 px: in `both`, "Sign in with a provider," / "or we
  email you a one-time sign-in link."; in `native`, "We email you a one-time sign-in link."; in `oauth`, "Sign in with
  your Google, Apple, Microsoft or Amazon account.".
- "Stay signed in…" and the terms line are 14 px.
- In `native` and `both` the card ends with "Don't have an account? Create account", linking to `/create-account`
  (with `?PID=` when the page has one); `oauth` has no such line.

## C1a. The Create Account card and the header (TWEAKS05)

- The Login card's lock badge and 14 px Terms box; the subtitle "Enter your email address." / "We will create your
  account and email your first sign-in link.", then "We do not store passwords." in 12 px; the card ends with
  "Already have an account? Log in", linking to `/login` (with `?PID=` when the page has one).
- The header offers a guest Log In only, in every mode; there is no "Create Account To Vote" button. An account is
  created from the Login card's Create account line.

## C2. Errors

| `?error=` | Message |
|---|---|
| `not-launched` | the existing "CrowdPoll hasn't launched yet…" |
| `access_denied` | Sign-in was cancelled. |
| `account_not_linked` | An account already uses this email address. Sign in the way you usually do. |
| `email_not_found` | CrowdPoll needs your email address to sign you in; try another way. |
| anything else | Sign-in with that provider failed. Please try again. |

## C3. Profile page

- In `both`, the email section stays; in `oauth`, it stays hidden (unchanged).
