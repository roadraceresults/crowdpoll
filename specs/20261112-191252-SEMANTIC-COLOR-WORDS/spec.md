# Feature Specification: Semantic Color Words

**Feature Branch**: `20261112-191252-SEMANTIC-COLOR-WORDS`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "requirements/20261112-191252-semantic-color-words/requirements.md": add `approve`,
`approved`, `approval` to the positive words and `disapprove`, `disapproved`, `disapproval` to the negative words of the
poll bars' semantic colors, and decide which other labels should be added. The resolved requirements also add the common
poll-scale words (RS1), a neutral list for middle answers (UA1), and keep to the listed word forms only (UA2).

## User Scenarios & Testing *(mandatory)*

The users are poll viewers (voters and anyone reading results) and poll authors. Today a choice whose label reads as yes
(for example "Agree") is drawn dark green, one that reads as no ("Disagree") is drawn red, and every other choice takes
the next color of the poll's palette, unless the author picked the choice's color by hand. Polls that use approve,
support or favor scales, and the middle answers of such scales, do not read correctly today. After this feature the
common answer scales show green for yes, red for no and a palette color for the neutral middle, without the author
picking any color.

### User Story 1 - Approve / disapprove answers are green and red (Priority: P1)

A viewer opens a poll whose choices are "Approve" and "Disapprove" (or "Strongly approve", "Somewhat disapprove", …)
and sees the approving bars in green and the disapproving bars in red.

**Why this priority**: It is the change the requirements ask for by name.

**Independent Test**: With a poll whose choices are "Approve", "Disapprove", "Approved", "Disapproved", "Approval" and
"Disapproval", none with a hand-picked color: the first, third and fifth bars are dark green, the others red.

**Acceptance Scenarios**:

1. **Given** a choice labelled "Approve", "Strongly approve", "Approved" or "Approval rating up" with no hand-picked
   color, **When** the poll is shown, **Then** its bar is dark green.
2. **Given** a choice labelled "Disapprove", "Somewhat disapprove", "Disapproved" or "Disapproval", **When** the poll is
   shown, **Then** its bar is red, not green.
3. **Given** a choice labelled "Approves" or "Approving", **When** the poll is shown, **Then** its bar takes a palette
   color.
4. **Given** an approving choice with a hand-picked color, **When** the poll is shown, **Then** the hand-picked color is
   used.

---

### User Story 2 - Other common scale words are green and red (Priority: P2)

A viewer opens a poll using a support/oppose, favor/oppose or accept/reject scale, or informal yes/no answers, and sees
the same green and red.

**Why this priority**: It extends the requested change to the scales pollsters use next most often (RS1).

**Independent Test**: With choices "Strongly support", "In favor", "In favour", "Accept", "Yeah", "Yep", "Aye", "Oppose",
"Against", "Reject" and "Nah", none with a hand-picked color: the first seven bars are dark green, the last four red.

**Acceptance Scenarios**:

1. **Given** a choice whose label holds the whole word support, favor, favour, accept, yeah, yep or aye, **When** the
   poll is shown, **Then** its bar is dark green.
2. **Given** a choice whose label holds the whole word oppose, against, reject or nah, **When** the poll is shown,
   **Then** its bar is red.
3. **Given** a choice labelled "Not sure", "Vote for Alice", "I like it" or "OK", **When** the poll is shown, **Then** its
   color is the same as today (no new rule applies to it).

---

### User Story 3 - Neutral middle answers take a palette color (Priority: P3)

A viewer opens a five-point poll ("Strongly agree" … "Neither agree nor disagree" … "Strongly disagree") and sees the
middle answer in a palette color, between the green and the red, instead of green.

**Why this priority**: It corrects how middle answers read today and with the new words (UA1).

**Independent Test**: With choices "Agree", "Neither agree nor disagree", "Disagree", "No opinion", "No preference",
"Neutral", "Undecided", "Unsure", "Don't know" and "Do not know": the first is green, the third red, every other one a
palette color.

**Acceptance Scenarios**:

1. **Given** a choice whose label holds the whole word neither, neutral, undecided or unsure, or the phrase no opinion,
   no preference, don't know or do not know, **When** the poll is shown, **Then** its bar takes the next palette color,
   even if the label also holds a positive or negative word.
2. **Given** a neutral choice with a hand-picked color, **When** the poll is shown, **Then** the hand-picked color is
   used.
3. **Given** a label matching both the positive and negative lists and no neutral word, such as "Yes and no", **When**
   the poll is shown, **Then** its bar is green, as today.

---

### Edge Cases

- "Don't know" written with a curly apostrophe (’) is neutral, as with a straight one.
- The new words follow the existing whole-word rule: a letter touching a word on either side stops it matching, so
  "approve" inside "Disapprove" and "support" inside "Unsupported" do not match, while "Approve2" and "support_it" do.
- Letter case never matters ("APPROVE", "neutral").
- A neutral phrase matches only with its words in order, separated by spaces: "No opinion" is neutral; "Opinion: no" is
  red (the word "no").
- A label that is a word on its own ("No", "Yes", "N", "Y") keeps today's color.
- A choice such as "Customer support" in a poll that is not a yes/no poll turns green; the author can override it with a
  hand-picked color (accepted trade-off of RS1).
- Neutral choices take palette colors like any other unmatched choice, in choice order; green and red choices use no
  palette color, as today.
- Existing polls change color on their next display without being edited, since nothing is stored: a choice holding a
  new word turns green or red, a neutral choice that was green or red takes a palette color, and the other automatic
  choices of the same poll shift palette colors accordingly.
- The line graph's lines follow the bars' colors.
- An empty or missing label takes a palette color, as today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The positive word list MUST be: yes, true, correct, agree, yay, approve, approved, approval, support,
  favor, favour, accept, yeah, yep, aye.
- **FR-002**: The negative word list MUST be: no, false, incorrect, disagree, nay, disapprove, disapproved, disapproval,
  oppose, against, reject, nah.
- **FR-003**: A neutral list MUST be added: the words neither, neutral, undecided, unsure and the phrases no opinion, no
  preference, don't know, do not know.
- **FR-004**: Every word and phrase of the three lists MUST match as a whole word anywhere in the label, in any letter
  case, with today's boundary rule: only a letter on either side stops a match; a space, hyphen, digit, underscore,
  punctuation or the label's start or end does not.
- **FR-005**: Inside a phrase, the words MUST be separated by one or more spaces; in "don't", the apostrophe MAY be
  straight (') or curly (’).
- **FR-006**: A choice's color MUST be decided in this order: its hand-picked color; else a palette color when the
  label matches the neutral list; else dark green (`#006120`) when it matches the positive list or is exactly y or yup;
  else red (`#F91010`) when it matches the negative list or is exactly n or nope; else the next palette color.
- **FR-007**: Only the forms listed MUST match; no other forms (approves, approving, agreed, …) are added.
- **FR-008**: The whole-label rules (y, yup, n, nope), the two colors, the palette and hand-picked colors MUST be
  unchanged.
- **FR-009**: A green or red choice MUST NOT use a palette color; a neutral choice MUST take the next palette color like
  any unmatched choice.
- **FR-010**: Every place that colors a poll's choices (results bars, voting bars and line graph) MUST use the same rule,
  so they never disagree.
- **FR-011**: Automated tests MUST check the color of each label named in the user stories and edge cases, including the
  unchanged cases ("Not sure", "Yes and no", "No", "Disapprove" not green, "Approves" palette).
- **FR-012**: The project documentation that describes the semantic colors MUST list the new words and the neutral list.

### Key Entities

- **Choice**: has a label and, when picked by hand, a color.
- **Semantic word lists**: positive, negative and (new) neutral; each word or phrase matched as a whole word in a label.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the labels in the user stories and edge cases show the color stated for them.
- **SC-002**: Every label that holds none of the added words or phrases shows the same color as before the feature.
- **SC-003**: An approve, support, favor or accept scale poll shows its yes answers green, its no answers red and its
  middle answer in a palette color with no color picked by the author.
- **SC-004**: No stored poll data changes; reverting the feature restores every poll's previous colors.

## Assumptions

- Colors are worked out each time a poll is shown, so no stored data or migration is involved.
- The colors themselves, the palette, the colors step and hand-picked colors are unchanged.
- Words in other languages are out of scope.
- Words left out on purpose: sure, for, like, good, bad, right, wrong, ok (RS1).
- No server behaviour, setting, cookie or browser storage key changes.
