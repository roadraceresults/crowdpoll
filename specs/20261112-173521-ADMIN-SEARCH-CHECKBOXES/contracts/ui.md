# Contract: the admin Search form's checkbox row

- **U1**: directly after the vote mutability radio group (`role="radiogroup"`, `aria-label="Vote mutability"`), a
  `div.admin-checkbox-row` with `role="group"` and `aria-label="Poll features"` holds two `label.admin-checkbox`, in
  this order:
  - `input[type=checkbox][name=lineGraphEnabled][value=true]`, text "Line graph enabled";
  - `input[type=checkbox][name=customColors][value=true]`, text "Custom colors set".
- **U2**: both unticked when the page loads; nothing about them is stored in the browser.
- **U3**: a search sends `lineGraphEnabled=true` / `customColors=true` only for a ticked box; with both unticked the
  query string is the one sent today.
- **U4**: Clear unticks both (`form.reset()`).
- **U5**: each label is at least 48 px tall, has a visible focus ring on the input, and the row uses the radio groups'
  three-column grid, one column below 360 px; styles use M3 tokens only.
- **U6**: the controls' order (`[name]` attributes in the form) is `q, state, visibility, choiceMode, voteMutability,
  lineGraphEnabled, customColors, createdBy, …`.
