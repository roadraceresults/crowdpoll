# Data Model: Semantic Color Words

Nothing is stored or migrated. Colors are worked out in the browser each time a card is drawn.

## Choice (existing, unchanged)

| Field | Use here |
|---|---|
| `label` | text tested against the three lists |
| `color` | optional hand-picked `#RRGGBB`; when valid it wins over every list |

## Semantic lists (browser constants in `src/public/pollCard.js`)

| Constant | Kind | Content | Result |
|---|---|---|---|
| `NEUTRAL_WORDS` (new) | whole word / phrase, any case | neither, neutral, undecided, unsure, no opinion, no preference, don't know (' or ’), do not know | `null` → next palette color |
| `AFFIRMATIVE_WORDS` | whole word, any case | yes, true, correct, agree, yay, approve, approved, approval, support, favor, favour, accept, yeah, yep, aye | `#006120` |
| `AFFIRMATIVE_EXACT` | whole trimmed label, lower case | y, yup | `#006120` |
| `NEGATIVE_WORDS` | whole word, any case | no, false, incorrect, disagree, nay, disapprove, disapproved, disapproval, oppose, against, reject, nah | `#F91010` |
| `NEGATIVE_EXACT` | whole trimmed label, lower case | n, nope | `#F91010` |

Boundary: only a letter (`[a-z]`, any case) on either side stops a word matching. Words of a phrase are separated by one
or more spaces.

## Color decision (per choice, in display order)

1. Valid hand-picked color → that color (uses a palette slot only when the label is not green or red, as today).
2. Neutral match → next palette color.
3. Positive word or exact → green, no palette slot.
4. Negative word or exact → red, no palette slot.
5. Otherwise → next palette color.
