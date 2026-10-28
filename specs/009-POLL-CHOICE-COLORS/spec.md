# Feature Specification: Poll Choice Colors

> **Superseded in part by 021-MAXIMIZED-POLL-CARD.** The 50-colour palette, the Yes/No colours
> (`#43F781` / `#FC9E9E`) and the black-or-white label ink chosen by luminance (the 0.40 threshold)
> are replaced by 021's rule: a light 50-colour palette, text in a dark shade of each bar's own
> fill, and Yes/No in `#018826` / `#CF0234` on a pale tint, with white text clipped to the fill.
> See `specs/021-MAXIMIZED-POLL-CARD/contracts/ui-contracts.md` (C5). The word and exact-match
> rules that decide which labels are Yes or No, and the fill's trailing edge, still stand.

**Feature Branch**: `dev`

**Created**: 2026-08-14

**Status**: Draft

**Input**: User description: "using ./designDocs/009-high-level-requirements-POLL-CHOICE-COLORS.md"

Source requirements: `designDocs/009-high-level-requirements-POLL-CHOICE-COLORS.md`

## Overview

Today every result bar on the front of a poll card takes its color purely from its
position in the results list — the highest-percentage choice gets the first palette
color, the next gets the second, and so on. An affirmative choice is just as likely to
be blue, purple, or maroon as a negative one, so viewers get no visual cue about which
side of a yes/no question a bar represents.

This feature adds **semantic coloring** for affirmative and negative choices: a choice
whose label reads as a "yes" gets a consistent green, a choice whose label reads as a
"no" gets a consistent red, and every remaining choice keeps drawing from the existing
ordered palette in display order.

Scope is the **front face only**. The card's back (voting) face keeps its existing
Selected/Unselected coloring untouched.

## Clarifications

### Session 2026-08-15

- Q: Should the 4.5:1 text-contrast target apply only to the two new semantic colors, or to every palette color — given that 7 palette entries already failed it? → A: Apply to every color. The 7 failing entries (teal green, emerald, dark gold, clover, turquoise, pear, lagoon) were recolored ahead of this feature so all 50 now pass; the palette is a compliant baseline this feature must not regress.
- Q: How should text be made legible on `#FC9E9E`, which falls just below the card's light/dark ink threshold and would otherwise render white text at 2.00:1? → A: Lower the ink-selection luminance threshold from 0.55 to 0.40, keeping it a single general rule rather than a per-color exception.
- Q: What counts as a word boundary for whole-word matching — do digits and underscores delimit a word? → A: Standard word-boundary semantics: letters, digits, and underscores are all word characters. "Agree2", "No1", and "yes_please" do not match; "Yes!", "(true)", and "Don't agree" do. **Superseded 2026-08-19, see below.**
- Q: How is the color-assignment logic verified? → A: Follow the precedent set by feature 008 — automated coverage is limited to asserting that the shipped assets still carry the required color values and ink threshold, and the assignment behavior itself is validated manually against the quickstart guide.
- Q: `#43F781` sits at 1.06:1 against the unfilled track, so the fill boundary that conveys a bar's percentage nearly vanishes. Recolor, or make the boundary independent of fill color? → A: Keep the specified colors and draw a trailing edge on the fill (`inset -2px 0 0 rgba(0,0,0,0.55)` in `site.css`), which clears 3:1 against both fill and track for all 52 colors.

### Session 2026-08-19

- Q: Manual verification of Q6 surfaced that `yes_please` doesn't match the affirmative rule, because digits and underscores count as word characters under the 2026-08-15 answer above — is that the intended behavior? → A: No. Narrow the boundary to letters only: a space, hyphen, underscore, or digit now all delimit a word. "Agree2", "No1", "yes_please", and "option_no" now match (previously they did not); "Agreement", "Disagreement", "Yesterday", "November", and "Nobody" are unaffected, since a trailing *letter* still blocks the match. This supersedes the 2026-08-15 answer to the word-boundary question.
- Q: Should digits stop delimiting specifically for the negative word list, since "No1"/"No2" plausibly read as numbered-choice labels ("Number 1"/"Number 2") rather than negation? → A: No — keep one general boundary rule for both lists rather than an asymmetric one. "No1"/"No2" match the negative rule like any other digit-delimited case; the numbered-choice collision is an accepted tradeoff, not a special case.
- Q: Add "Yay" and "Nay" as trigger words? → A: Yes. "Yay" joins the affirmative word list (→ `#43F781`); "Nay" joins the negative word list (→ `#FC9E9E`). Both are ordinary word-rule entries — case-insensitive, subject to the same letters-only boundary as the rest of the list (so "Naysayer" does not match).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Affirmative and negative choices are instantly recognizable (Priority: P1)

A viewer opens a poll card for a yes/no question ("Should the club move its race to
Sunday?" with choices "Yes" and "No"). The "Yes" bar renders green and the "No" bar
renders red, regardless of which one is currently winning or where each sits in the
list. The viewer understands the balance of opinion before reading a single word.

**Why this priority**: This is the point of the feature — semantic color on
affirmative/negative choices is what delivers at-a-glance readability. Everything else
exists to keep the remaining choices sensible around it.

**Independent Test**: Create a poll with choices "Yes" and "No", cast votes so each
choice leads at different times, and confirm the "Yes" bar is always green and the "No"
bar always red in both orderings.

**Acceptance Scenarios**:

1. **Given** a poll with choices "Yes" and "No", **When** results are displayed,
   **Then** the "Yes" bar is `#43F781` and the "No" bar is `#FC9E9E`.
2. **Given** a poll with choices "I agree" and "I disagree", **When** results are
   displayed, **Then** "I agree" is `#43F781` and "I disagree" is `#FC9E9E`.
3. **Given** a poll with choices "TRUE" and "false", **When** results are displayed,
   **Then** "TRUE" is `#43F781` and "false" is `#FC9E9E` (matching ignores case).
4. **Given** a poll with choices "Correct" and "Incorrect", **When** results are
   displayed, **Then** "Correct" is `#43F781` and "Incorrect" is `#FC9E9E` —
   "Incorrect" does not match the affirmative rule, because whole-word matching means
   the word "correct" inside "Incorrect" is not a match.
5. **Given** a poll with choices "Y" and "N", **When** results are displayed, **Then**
   "Y" is `#43F781` and "N" is `#FC9E9E` via the exact-label rules.
6. **Given** a poll with choices "Yup" and "Nope", **When** results are displayed,
   **Then** "Yup" is `#43F781` and "Nope" is `#FC9E9E` via the exact-label rules.
7. **Given** a poll where two different choices both read as affirmative (e.g. "Yes,
   definitely" and "Yes, with reservations"), **When** results are displayed, **Then**
   both bars are `#43F781` — sharing a color between choices is allowed.
8. **Given** a poll with an affirmative or negative choice, **When** vote counts change
   and the bars re-sort, **Then** each affirmative/negative bar keeps its semantic
   color in its new position.

---

### User Story 2 - Remaining choices keep distinct, stable palette colors (Priority: P2)

A viewer opens a poll card for a multi-option question ("Which race distance do you
prefer?" with choices "5K", "10K", "Half marathon", "Marathon"). No label reads as
affirmative or negative, so each bar takes the next color from the existing results
palette in display order — exactly as it does today.

**Why this priority**: Most polls are not yes/no questions, so the non-semantic path is
the common case and must not regress. P2 because it preserves existing behavior rather
than adding new value.

**Independent Test**: Create a poll with four neutral labels and confirm the bars render
in the first four palette colors, top to bottom.

**Acceptance Scenarios**:

1. **Given** a poll where no label reads as affirmative or negative, **When** results
   are displayed, **Then** bars use palette colors in order from the first entry, top
   bar first.
2. **Given** a poll with choices "Yes", "No", "Maybe", and "Undecided", **When** results
   are displayed, **Then** "Yes" is `#43F781`, "No" is `#FC9E9E`, and "Maybe" and
   "Undecided" take the **first** and **second** palette colors — the semantic choices
   do not consume palette entries.
3. **Given** a poll whose choices re-sort after new votes arrive, **When** results are
   redisplayed, **Then** palette colors are reassigned by the new display order (a
   bar's palette color may change as it moves) while semantic colors stay fixed to
   their labels.
4. **Given** a poll with more non-semantic choices than the palette has entries,
   **When** results are displayed, **Then** assignment continues from the start of the
   palette (colors repeat) rather than failing or leaving bars unstyled.

---

### Edge Cases

- **A label matching both word lists** ("Yes and no", "No, I agree"): the affirmative
  rule is evaluated first and wins — the bar is `#43F781`.
- **A negation of an affirmative word** ("Not true", "Not correct", "Never agree"):
  these contain a whole affirmative word and therefore render **green**, which is the
  opposite of their plain meaning. This follows directly from the stated rules and the
  stated affirmative-wins precedence; it is a known and accepted limitation of
  word-list matching, not a defect. See Assumptions.
- **A word appearing only inside a longer word** ("November", "Nobody", "Notation",
  "Agreement", "Disagreement", "Yesterday", "Incorrect"): whole-word matching means
  these do **not** match on the contained word. "Disagree" still matches the negative
  rule because it is itself the whole word "disagree".
- **A short token inside a longer label** ("Y or N", "Answer N please"): the "Y", "Yup",
  "N", and "Nope" rules are exact-label rules, not word-containment rules, so these
  labels match neither and take palette colors.
- **An exact-rule word used in a longer phrase** ("Nope, never"): not exactly equal to
  "Nope", and does not contain the whole word "no", so it takes a palette color.
- **A matching word attached to punctuation** ("Yes!", "No.", "(true)", "Yes/No",
  "agree — strongly", "Don't agree"): punctuation delimits words, so the word rules
  still match.
- **A matching word attached to a digit or underscore** ("Agree2", "No1",
  "yes_please", "option_no"): digits and underscores delimit a word just like spaces
  and hyphens do — only a letter on either side keeps a word attached to its neighbor
  — so these **do** match: "Agree2" and "yes_please" render `#43F781`, "No1" and
  "option_no" render `#FC9E9E`.
- **Surrounding whitespace on an exact-rule label** (`"  Y  "`): leading and trailing
  whitespace is ignored when testing exact equality, so this matches "Y".
- **Text legibility on the semantic colors**: `#FC9E9E` (luminance 0.476) sits just
  below the card's existing 0.55 light/dark ink threshold, so the unmodified rule would
  choose white text at 2.00:1 — unreadable. Lowering the threshold to 0.40 gives it
  dark ink at 8.72:1. `#43F781` (0.693) already receives dark ink correctly at 12.32:1.
  See FR-011a.
- **Maximum choice count**: a poll may have up to 50 choices; every one must receive a
  color.

## Requirements *(mandatory)*

### Functional Requirements

#### Color assignment rules

- **FR-001**: The system MUST assign the color `#43F781` to any choice whose label
  contains the whole word "Yes", "True", "Correct", "Agree", or "Yay", or whose label is
  exactly equal to "Y" or "Yup".
- **FR-002**: The system MUST assign the color `#FC9E9E` to any choice whose label
  contains the whole word "No", "False", "Incorrect", "Disagree", or "Nay", or whose
  label is exactly equal to "N" or "Nope" — **unless** that choice already matched
  FR-001, which is evaluated first and takes precedence.
- **FR-003**: All matching under FR-001 and FR-002 MUST be case-insensitive.
- **FR-004**: "Contains the whole word" MUST mean the word is delimited at both ends by
  the start of the label, the end of the label, or a character that is not a letter —
  a word appearing as a substring of a longer token MUST NOT match. Consequently
  `"Yes!"`, `"(true)"`, `"I agree"`, `"Don't agree"`, `"Agree2"`, `"No1"`, and
  `"yes_please"` all match, while `"Agreement"` (a letter immediately follows the
  matched word) does not. *(Amended 2026-08-19 — see Clarifications: digits and
  underscores now delimit a word, same as spaces and hyphens; only a letter on either
  side keeps a word attached to its neighbor.)*
- **FR-005**: "Exactly equal to" MUST mean the entire label matches the given token,
  ignoring leading and trailing whitespace — a token appearing anywhere inside a longer
  label MUST NOT match.
- **FR-006**: The system MUST allow the same color to be assigned to more than one
  choice within a poll; duplicate colors are not an error and MUST NOT be deduplicated
  or adjusted.
- **FR-007**: Every choice not assigned a color by FR-001 or FR-002 MUST be assigned a
  color from the existing ordered results palette, consumed in sequence: the first such
  choice in display order takes the first palette entry, the second takes the second,
  and so on. Choices colored by FR-001 or FR-002 MUST NOT consume a palette entry.
- **FR-008**: The results palette MUST contain at least as many entries as a poll may
  have choices, so no poll can exhaust it and every bar receives a distinct palette
  color. The palette holds 50 entries and a poll allows at most 50 choices, so the two
  are currently **exactly equal** — raising the choice limit without extending the
  palette would break this. Index arithmetic wraps modulo the palette length so the
  expression stays total, but that path is unreachable by design and is not a specified
  behavior.
- **FR-009**: Semantic colors MUST be stable for a given label — a choice matching
  FR-001 or FR-002 shows the same color regardless of its position, its vote share, or
  how many other choices the poll has.
- **FR-010**: Palette colors assigned under FR-007 MAY change for a given choice when
  the display order changes; the system MUST NOT attempt to pin a palette color to a
  particular choice across reorderings.

#### Presentation and scope

- **FR-011**: Choice label and percentage text MUST remain legible on every assigned
  color, including both semantic colors, whether the text sits over the filled portion
  of a bar or over the unfilled track.
- **FR-011a**: The rule that selects dark versus light label ink MUST treat `#FC9E9E`
  as a light background and give it dark ink. This MUST be achieved by lowering the
  rule's luminance threshold from `0.55` to `0.40`, so the behavior remains a single
  general rule rather than a per-color exception. No color other than `#FC9E9E` may
  change its ink as a result: all 50 palette entries sit at or below `0.163` luminance,
  well clear of the new threshold.
- **FR-012**: A bar's filled portion MUST reach at least 3:1 contrast against the
  unfilled track behind it (`#DDE1D6`), so the fill boundary — which is what conveys the
  percentage — stays visible without relying on hue alone. All 50 palette entries satisfy
  this unaided (3.71:1 minimum); the two semantic colors do not (`#43F781` at 1.06:1,
  `#FC9E9E` at 1.50:1), so a trailing edge is drawn on the fill to establish the boundary
  independently of fill color.
- **FR-012a**: Every fill's boundary MUST be established by **either** mechanism: the fill
  itself reaching 3:1 against the track, **or** the trailing edge reaching 3:1 against
  both the fill and the track. Both are not required of any single color — the 50 palette
  entries qualify on fill contrast alone and the 2 semantic colors qualify via the edge.
  The edge is nonetheless applied uniformly to all bars, as one unconditional rule rather
  than a conditional one.
- **FR-013**: This color assignment MUST apply **only** to the results bars on the front
  face of the poll card. The back (voting) face MUST continue to color its rows by
  Selected/Unselected state exactly as it does today, and MUST NOT adopt any part of
  this assignment logic.

### Key Entities

- **Poll Choice**: One selectable option on a poll. Relevant attributes here are its
  display label (matched against the affirmative and negative rules) and its position
  in display order (used to consume palette entries).
- **Semantic Color Rule**: A pairing of a word list plus an exact-label list with a
  fixed color — the affirmative rule ("Yes", "True", "Correct", "Agree", "Yay"; exactly
  "Y", "Yup" → `#43F781`) and the negative rule ("No", "False", "Incorrect", "Disagree",
  "Nay"; exactly "N", "Nope" → `#FC9E9E`) — evaluated in that order.
- **Results Palette**: The existing ordered list of distinct bar colors, consumed in
  sequence by choices that no semantic rule matched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a poll whose choices are "Yes" and "No", 100% of displays show the
  affirmative bar green and the negative bar red, across every possible ordering.
- **SC-002**: For a poll with no affirmative or negative labels, 100% of bars receive
  palette colors in display order — the same position-based assignment behavior as
  before this feature, drawing from the current (recolored) palette.
- **SC-003**: In a mixed poll containing both semantic and neutral choices, the neutral
  choices occupy the first N palette entries with no gaps — verifiable by comparing
  rendered colors against the palette sequence.
- **SC-004**: Label and percentage text meets at least a 4.5:1 contrast ratio against
  its bar color, for both semantic colors and all 50 palette colors. The palette
  currently satisfies this (lowest entry: moss at 4.93:1), so this criterion is both a
  requirement on the two new colors and a no-regression guard on the existing ones.
- **SC-005**: 100% of choices in a poll with the maximum supported number of choices
  (50) render with a color; no bar is left uncolored or transparent.
- **SC-006**: The back face of the poll card renders identically before and after this
  feature, for every poll — including polls whose labels match the semantic rules.
- **SC-007**: A viewer shown a yes/no poll card can identify which bar is the
  affirmative choice from color alone, without reading the labels.
- **SC-008**: Every bar's fill boundary is visible against the track at all fill
  percentages, for all 52 colors — verified by computing fill-vs-track and edge contrast
  rather than by eye.

## Assumptions

- **Scope is display-only**: this feature changes how choice colors are chosen when a
  poll's results are displayed. It does not add a stored color attribute to polls or
  choices, and it gives authors no way to pick or override a choice's color.
- **The listed trigger words are exhaustive**: only the ten word-rule entries and four
  exact-label entries in FR-001/FR-002 trigger semantic colors (added 2026-08-19: "Yay"
  and "Nay", see Clarifications Session 2026-08-19). Other synonyms ("Affirmative",
  "Nah", "Never", "Aye"), abbreviations, and non-English equivalents are out of scope.
- **Affirmative-before-negative precedence is intentional**, including for labels that
  negate an affirmative word ("Not true" → green). The source requirements state this
  precedence explicitly with the "Yes and no" example. Refining it would require
  sentiment analysis rather than word matching, which is out of scope.
- **The results palette is a fixed, compliant baseline**: seven entries (teal green,
  emerald, dark gold, clover, turquoise, pear, lagoon) were recolored immediately before
  this feature so that all 50 now meet the 4.5:1 target in SC-004. That recoloring is a
  completed prerequisite, not part of this feature. This feature does not add, remove,
  reorder, or further recolor palette entries, and does not drop a palette color merely
  because it resembles one of the two semantic colors.
- **Existing bar layout, sizing, sorting, scrolling, and truncation behavior are
  unchanged** — only the fill color of each results bar changes.
- **Verification follows the precedent set by feature 008**: this is a presentation
  change, so the color-assignment behavior and every edge case in this spec are
  validated by manual walkthrough against the feature's quickstart guide. Automated
  coverage is limited to guarding that the shipped assets still carry the required
  color values and the ink threshold — the edits a future change is most likely to
  undo. Accepted tradeoff: a defect in the word-matching or palette-skip logic would
  not be caught automatically, so the manual walkthrough MUST exercise the full edge-
  case list under Edge Cases rather than only the "Yes"/"No" happy path.
- **The back face is untouched**: voting rows keep their current two-tone
  Selected/Unselected treatment, their round selection button, and all current
  interaction behavior. A choice may therefore appear in one color on the front face
  and in the neutral/selected tones on the back face; this is intended.

## Out of Scope

- Any change to the back (voting) face of the poll card.
- Author-configurable or per-poll color overrides.
- Any further change to the results palette — adding, removing, reordering, or
  recoloring entries. (The recolor bringing all 50 entries to 4.5:1 was completed as a
  prerequisite before this feature; see Assumptions.)
- Extending semantic matching to additional words, synonyms, or other languages, or to
  any form of sentiment analysis.
- Applying choice colors to exports, admin listings, or the poll grid.
- Any change to how choices are sorted or how percentages are calculated.
