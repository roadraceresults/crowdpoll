# UI Contract: label → bar color

The feature has no API change. Its contract is the color a choice's bar takes, in the results bars, the vote bars and
the line graph alike (FR-010). "palette" means the next palette color in display order; green is `#006120`, red is
`#F91010`. None of the labels below has a hand-picked color unless stated.

## U1. New positive words → green

Approve · Strongly approve · Approved · Approval rating up · Strongly support · In favor · In favour · Accept · Yeah ·
Yep · Aye · Approve2 · APPROVE · support_it · Customer support (accepted trade-off)

## U2. New negative words → red

Disapprove · Somewhat disapprove · Disapproved · Disapproval · Oppose · Against · Reject · Nah

## U3. Neutral → palette

Neither agree nor disagree · Neither approve nor disapprove · No opinion · No  opinion (two spaces) · No preference ·
Neutral · Undecided · Unsure · Don't know · Don’t know (curly) · Do not know · NEUTRAL

## U4. Unchanged colors

| Label | Color |
|---|---|
| Yes · Agree · Y · yup | green |
| No · Disagree · N · nope | red |
| Yes and no | green |
| Opinion: no | red |
| Not sure · Maybe · Vote for Alice · I like it · OK | palette |
| Approves · Approving · Agreed | palette |
| Unsupported · Unacceptable | palette |
| (empty label) | palette |

## U5. Hand-picked color wins

A choice from U1, U2 or U3 with a valid hand-picked color shows that color.

## U6. Palette slots

A green or red choice uses no palette slot; a neutral choice uses one, like any unmatched choice. Example, in display
order with palette entries P0, P1, …: "Agree" → green, "Neither agree nor disagree" → P0, "Disagree" → red,
"Other" → P1.
