# Overview: `specs/20261102-154952-FIELD-LENGTH-LIMITS`

## Document History

| Record | Value |
|---|---|
| Feature directory | `specs/20261102-154952-FIELD-LENGTH-LIMITS` |
| Tweak file created | 2026-11-02 17:49 |
| Last updated | 2026-11-02 21:03 |

Legend: `[ ]` open · `[X]` Resolved · `[-]` Resolved (manually)  
(or accepted as-is) by the developer.
Tick `Run Tests` to have this tweak's automated tests written and run; leave it empty (the default) to postpone the run.

"Next" always returns the first `[ ]` item below.

The developer is expected to create the individual tweak requirements in this file, and then run the `/speckit-tweak` command to have the AI implement them, one at a time.  
Each tweak requirement initially carries an empty checkbox; tick it when the item is resolved or consciously accepted.  


# Tweaks

## TWEAK01 Choices Counter Reads As Characters  
[X] Resolved  
[ ] Run Tests  

On the Edit Poll Card Step 3, the message says:
"Choices are capped at 35 characters.         1 / 50".

Should says:
"Choices are capped at 35 characters.         1 / 35".

![choice-length](dontTrack/choice-length.jpg)

### RECOMMENDATION

The counter on Step 3 does not count characters: it counts choices.  
`adminCard.js:1371` writes `choiceLines().length + " / " + runtime.maxChoices`, and `runtime.maxChoices` is `ENV_MAX_CHOICES` (50).  
So "1 / 50" means one choice of at most fifty, and showing "1 / 35" would say that a poll may have only 35 choices.  
The real problem is that, next to "capped at 35 characters", a bare "1 / 50" reads as a character count.  

- **Option A** _(recommended)_: name the unit in the counter, "1 / 50 choices".  
  - Change only line 1371 in `src/public/adminCard.js`;  
    no other field's counter changes, and the Add-choice dialog keeps "35 / 35".  
  - Test: a `client-admin-wizard.test.ts` case that Step 3's `.m3-field-counter` reads "1 / 50 choices" after one line.  
- **Option B**: make the counter count the characters of the line holding the caret, "35 / 35", like the Add-choice dialog;  
  and move the choice count into the supporting text ("1 of 50 choices").  
  - Matches what the tweak asks for literally, but the counter changes meaning as the caret moves between lines, and the supporting text is already two sentences long.  
- **Option C**: write "1 / 35" as asked.  
  - Not recommended: the number would be the choice count over the character limit, which is wrong for every poll.  

No spec, plan or contract change for A;  
`contracts/ui-contracts.md` C2 (the wizard's choices box, which C3 builds on) gains one line naming the counter's text.

### ACCEPTED RECOMMENDATION

Option A, chosen by the developer and implemented by "Tweak" on 2026-11-02 21:03.  
The Step 3 counter now reads "1 / 50 choices".  

- `src/public/adminCard.js`: Step 3's `update()` appends " choices" to the counter, with a comment saying why.  
- `tests/client-admin-wizard.test.ts`: new test "counts choices, not characters, under the Choices box (TWEAK01)", checking "1 / 50 choices" after one line and "2 / 50 choices" after two.  
- `specs/20261102-154952-FIELD-LENGTH-LIMITS/contracts/ui-contracts.md`: C2 gains a line naming the counter's text.  
- `spec.md`, `plan.md`, `tasks.md` and `quickstart.md` unchanged: none of them names the counter.  

Tests: written, not run, since `Run Tests` is empty.  

## TWEAK02 <short title here>  
[ ] Resolved  
[ ] Run Tests  
tweak requirements...  


