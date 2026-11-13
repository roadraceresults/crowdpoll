Start a new spec for these requirements called `20261112-191252-SEMANTIC-COLOR-WORDS`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

Currently, there are semantic color assigned to Poll bars,  
such that when the bar label indicates a positive response, it is displayed in a color associated with positivity,  
and when it indicates a negative response, it is displayed in a color associated with negativity.  

Here is a description of the logic:
---------------
The rules are in `src/public/pollCard.js:96-119` (`semanticColorFor`). A positive label gets dark green `#006120`, a negative one gets red `#F91010`. Any other label gets the next color from the poll's palette. Letter case doesn't matter for any of them.

**Positive (green):**
- **The word anywhere in the label:** `yes`, `true`, `correct`, `agree`, `yay`
- **The whole label only:** `y`, `yup`

**Negative (red):**
- **The word anywhere in the label:** `no`, `false`, `incorrect`, `disagree`, `nay`
- **The whole label only:** `n`, `nope`

How a match works:
- **Whole words only.** A word matches only when no letter touches it on either side. A space, hyphen, digit or underscore all count as a break.
  - "Yes, definitely", "Agree2" and "yes_please" match.
  - "Yesterday", "Incorrect" (for `correct`) and "Notable" (for `no`) don't.
- **Short tokens need the whole label.** `y`, `n`, `yup` and `nope` count only when they are the entire label, trimmed. "Y" matches, but "Option Y" doesn't.
- **Positive wins a tie.** A label that matches both lists, such as "Yes and no", is green.
- **A hand-picked color wins.** A color chosen for a choice in the poll's colors step overrides the green or red. A green or red choice doesn't use up a palette color.
- **"Disagree" is red.** It contains "agree", but a letter comes right before it, so it doesn't count as positive; "disagree" is on the negative list.


------------------

Add to the list of positive words:
- approve
- approved
- approval

Add to the list of negative words:
- disapprove
- disapproved
- disapproval

Are there other labels that should be added to the positive or negative lists?


## Decisions (from requirements-report.md, 2026-11-12)

- **More words** (RS1, Recommendation A):  
  also add the positive words `support`, `favor`, `favour`, `accept`, `yeah`, `yep`, `aye`, and the negative words `oppose`, `against`, `reject`, `nah`.  
  They follow the same whole-word rule as the other words.  
  Considered and left out: `sure` (would turn "Not sure" green), `for`, `like`, `good`, `bad`, `right`, `wrong`, `ok`.  
- **Neutral answers** (UA1, Recommendation A):  
  a neutral list is tested before the positive and negative lists;  
  a label that matches it gets the next palette color, never green or red.  
  The neutral words are `neither`, `neutral`, `undecided`, `unsure`, and the phrases `no opinion`, `no preference`, `don't know`, `do not know` (straight or curly apostrophe), matched as whole words in any case, like the other word rules.  
  So "Neither agree nor disagree", "Neither approve nor disapprove" and "No opinion" get palette colors.  
  A hand-picked color still wins over every list.  
- **Word forms** (UA2, Recommendation A):  
  only the forms listed match;  
  `approves`, `approving`, `disapproves`, `disapproving`, `agrees`, `agreed` and the like are not added.  
