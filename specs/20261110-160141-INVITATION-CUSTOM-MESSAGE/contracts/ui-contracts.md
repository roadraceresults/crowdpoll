# UI and Email Contracts: Invitation Custom Message

## C1. Step 1 field (`adminCard.js`)

Shown only while `wizard.who === "invite"`, inside the radio group directly under the "Only people you invite" row and
before the next option. Each option section is preceded, except the first, by a decorative `div.wizard-who-divider`
(`aria-hidden="true"`, a 1px `outline-variant` top border in `admin-card-m3.css`); the voters switch keeps its own top
line (TWEAK01).

```text
Custom Email Message                                   (label)
┌──────────────────────────────────────────────────────┐
│ <rendered message, or empty>              ... edit ⌄ │  preview; "... edit" button, aria-label "Edit custom email message"
└──────────────────────────────────────────────────────┘
Optional. Added to the invitation email we send to      (support text)
the people you invite.                        n / 1000  (counter)
```

- Same M3 field shell, classes and preview as the Notes field (`m3-field--notes`, `wizard-notes*`); id
  `pollInvitationMessage-<pid>`.
- "... edit" opens `NotesEditor.open(host, { html, max: 1000, label: "Custom Email Message", … })`: heading
  `Custom Email Message`, editor `aria-label` `Custom Email Message`, counter `n / 1000`, Done refused above 1000.
- Switching Who to another answer removes the field from the DOM; the wizard keeps the value; switching back shows it.
- No new stylesheet: the Notes field's rules apply, plus the one `.wizard-who-divider` rule; `m3-assets.test.ts` is unchanged.

## C2. Settings Summary line

- A `p.wizard-summary-text.wizard-summary-invitation-message` directly after `p.wizard-summary-who`, present only when
  `who === "invite"` and the message has visible text.
- Text: `A Custom Invitation Email Message has been entered.`; the sentence without its period is one summary part for Step 1; once Step 1
  is answered it is tappable (`role="button"`, `aria-label` "Custom Email Message: change in Step 1"), and activating it
  opens Step 1 and focuses the field's "... edit" button.
- The read-only card shows the same line from the admin list row's `hasInvitationMessage` (TWEAK02).
- `refreshSummaryLine`'s class list learns the new class so a single-line refresh keeps it in place.

## C3. NotesEditor options (`notesEditor.js`)

| Option | Default | Effect |
|---|---|---|
| `max` | `NOTES_MAX` (6000) | counter denominator, `is-error`, Done `aria-disabled` |
| `label` | `"Notes"` | heading text, editor region and text box `aria-label`s |

Existing callers pass neither and behave as today.

## C4. Invitation email

HTML, inside the existing body cell, between the first paragraph and "It's an Invitation Only private poll …":

```html
<div style="margin:0 0 16px;padding:12px 16px;background:#F1F3EC;border-radius:8px;font-family:…;font-size:16px;line-height:1.5;color:…;overflow-wrap:anywhere;">…renderNotesHtml…</div>
```

Plain text: the message's `notesPlainText` as its own paragraph at the same place (blank line before and after).

- No message → the email is byte-for-byte today's.
- The subject, preheader, heading and every other paragraph are unchanged; reminders carry the same box.
- TWEAK04: the first paragraph ends at "… on CrowdPoll." (no "That's why we're writing to you."), and the sign-in line
  under the button reads "This button signs you in to CrowdPoll as <address>. Do not forward this email."
