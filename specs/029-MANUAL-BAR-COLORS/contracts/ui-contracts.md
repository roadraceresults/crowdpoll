# Contract: the Colors step and the bar colours

## C1. The numbered circles

Six circles, in this order, each with the short name above it: `Who`, `Title`, `Choices`, `Colors`, `How`, `When`. `Colors` is step 4. The row is six equal columns, the joining line runs from the first circle's centre to the last's (8.333% inset each side). Next on `Choices` leads to `Colors`; Publish still needs every step visited.

## C2. The step's body

| Part | Content |
|---|---|
| heading | `Step 4 · Colors` |
| help line | "Optional. Leave a choice on Automatic to color it for you." |
| list | one row per choice line of the Choices box (unsaved lines included) |
| empty state | with no choice line: "Add your choices first, then come back to choose their colors.", and no rows |
| locks | none after votes (the `Choices` step stays locked) |

## C3. A row

| Part | Rule |
|---|---|
| label | the choice, ellipsis when long, the whole label as a tooltip |
| button | at least 48 dp tall; `aria-haspopup="true"`, `aria-expanded`, accessible name "Color for <choice>" |
| dot | 24 dp; a filled circle of the chosen colour, or for Automatic an empty ring (outline, no fill) |
| name | the colour's name, or "Automatic"; a stored colour not in the palette shows its hex |
| arrow | drop-down arrow, trailing |

## C4. The popover

One per step, placed under the pressed button (above it when there is no room below). A `role="radiogroup"` labelled "Color for <choice>", holding 19 `role="radio"` buttons: **Automatic** first, then the palette in order.

| Rule | Value |
|---|---|
| grid | 4 columns, 48 dp targets, 8 dp gaps (216 px) |
| swatch | filled with its colour via `--swatch`; 1 dp outline in the outline token in light and dark mode; accessible name and tooltip = the colour's name |
| chosen | `aria-checked="true"` and a check mark (never colour alone) |
| keyboard | Tab enters at the chosen swatch (or Automatic); arrow keys move by one, Home and End jump, Enter or Space chooses, Escape closes |
| after choosing | the popover closes, focus returns to the button, the dot and name update |
| outside press | closes, focus returns to the button |
| a stored colour not in the palette | an extra, selected swatch shows it, labelled with its hex |

## C5. The bars

A choice's `color`, when a valid `#RRGGBB`, is the bar's fill. The track, the text colours on the track and on the fill, and the dark-mode colours are derived from it by the existing derivation. A choice without a valid `color` is coloured as today. The palette index advances for every choice that is not a yes or no choice (R6 of the research), so Automatic bars never change when another choice is coloured.

## C6. Requests the card makes

| Case | Request |
|---|---|
| new poll, Save | `POST /save` with `wizardFields()` including `labels` and `colors` |
| new poll, Publish | `POST /publish`, the same |
| existing poll, labels changed | `POST /publish` with `labels` **and** `colors`, plus the other changed fields |
| existing poll without votes, only colours changed | `POST /publish` with `colors` |
| existing poll with votes, only colours changed | `POST /colors` |
| existing poll with votes, colours and something else | `POST /publish` with `colors` and the other changed fields |
