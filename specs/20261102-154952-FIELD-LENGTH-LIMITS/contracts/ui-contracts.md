# UI Contracts: Field Length Limits

## C1. Wizard title and subtitle

- The title field's `maxLength` is 60 and the subtitle field's 40, for new and existing polls.

## C2. Wizard Choices box — a new poll

- Every line is cut to `runtime.choiceLabelMax` (35, from `/api/config`, falling back to 35) as it is typed or
  pasted, with "Choices are capped at 35 characters." shown, as today with 40.
- The counter under the box counts choices and names its unit, "1 / 50 choices" (`runtime.maxChoices`), so it is
  not read as a character count beside the 35-character message (TWEAK01).

## C3. Wizard Choices box — an existing poll

- A line whose trimmed text equals one of the poll's stored labels is shown and kept whole, whatever its length.
- Any other line is cut to 35.
- A stored line whose text is changed (a character typed, deleted or pasted in it) stops being a stored label and is
  cut to 35 at once, with the same message (clarification Q1).
- Leaving the wizard without saving changes nothing stored.

## C4. Add Choice dialog

- The input's `maxLength` is the `choiceLabelMax` the page was given (35, falling back to 35); the counter reads
  "n / 35".

## C5. Views showing a title or subtitle

- The poll card, maximized card, admin card, search results and line-graph subtitle show a 60-character title and a
  40-character subtitle at 360 px width without horizontal overflow, with today's wrapping and styling.
