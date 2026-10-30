# UI Contract Changes: Per-Poll Line Graph Toggle

## C1. Wizard step 4 is "View"

- **Circle and heading**: "View" (was "Colors"). The number stays 4.
- **Settings Summary link**: still goes to step 4.
- **Color picker popover**: keeps its accessible name "Colors".

## C2. The "View" step for an Administrator

- **Checkbox**: labelled "Show the line graph", above the color pickers, in the wizard's checkbox style. Checked when the card's `lineGraphEnabled` is true.
- **No choices yet**: the checkbox is still shown first. The note "Add your choices first, then come back to choose their colors." takes the place of the color pickers below it.
- **Save**: the field is sent only from an Administrator's card.

## C3. The "View" step for anyone else

- **Checkbox**: absent.
- **Color pickers**: as today; with no choices, the note as today.

## C4. Settings Summary, "View" line

- **Graph on**: adds "The line graph is shown." to the line, for everyone who can see the card.
- **Graph off**: adds nothing about the graph.

## C5. Maximized view

- **Graph on**: the graph is mounted in the right-hand space and refreshed as the graph feature specifies.
- **Graph off**: no graph, no graph request; the right-hand space beside the card may stay reserved and empty.
- **Switched off while open**: the graph stays until the view is closed. Its next refresh receives `404` and shows the graph's existing "Results are not available yet" note.

## C6. Errors

- **Refused save from a non-Administrator** (`403`): shown with the message from the response, through the card's existing error display.
