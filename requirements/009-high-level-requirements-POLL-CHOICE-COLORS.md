Start a new spec for these requirements called 009-POLL-CHOICE-COLORS  
These requirements are for how the colors of the "Poll Choice" bars will be selected.  
First, if a "Choice" label:
- includes the word "Yes", "True", "Correct", "Agree" or "Yay" (case insensitive)    
- is exactly equal to "Y", "Yup" (case insensitive) 
then the color assigned will be #43F781

Next, if a "Choice" label:
- includes the word "No", "False", "Incorrect", "Disagree" or "Nay" (case insensitive)    
- is exactly equal to "N", "Nope" (case insensitive)
then the color assigned will be #FC9E9E

When the "includes the word" condition is used, this means that the word must be a complete word and not a substring of a word. A complete word is delimited by a non-letter character (space, punctuation, digit, or underscore) or the start/end of the label — so "Agree2" and "No1" count as complete-word matches, but "Agreement" and "Incorrect" (matched against "correct") do not, since a letter follows/precedes the trigger word there.
When the "exactly equal to" condition is used, this means that the label must be the complete label string and not a substring of the label string. 

It is worth noting, in a Yes/No/Maybe/Undecided poll, "Maybe" gets palette color 1, not color 3.
The positive and negative color assignments do not count towards the order. The other choices will be assigned colors from the RESULTS_PALETTE_ENTRIES array in pollCard.js.

A label matching both lists gets the green color #43F781. So "Yes and no" is #43F781.

It is okay if the same color is assigned to more than one "Choice".  
The rest of the "Choices" will be assigned colors in order from RESULTS_PALETTE_ENTRIES in pollCard.js.
The colors will be assigned in order. i.e. first bar that hasn't been assigned will get the first element in the RESULTS_PALETTE_ENTRIES array. Next bar gets the next color etc.
It is okay if the colors assigned to  a "Choice" bar changes as the order of the bars change.

This color assignment logic applies to the results bars on the front side of the Poll Card.
The backside will still maintain the logic related to "Selected" and "Unselected" colors. The backside will not use the color assignment logic described above. 

Let me know if there any clarifications required.
