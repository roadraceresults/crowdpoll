Start a new spec for these requirements called `20261029-154817-READABLE-FINDING-LAYOUT`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

Update the skill at `.claude\skills\speckit-requirements` with the high-level requirements described here.  

The goals is to make the plain Maarkdown text to be more readable and easier for the user  
to see which Findings have not been Resolved yet and  
to Accept a recommendation in teh file.  

The new template for a finding before it has been resolved is:

```markdown
**FINDING1. Short Title For Finding**  

    Multi-line explanation of the finding goes here.
    Line 2
    line 3

❌ NOT Resolved 

  - **Recommendation A** _(recommended)_: **short description of recommendation A**  
     
    [ ] ➡️ **Accept** (To Accept, you may: mark <b>[X]</b> on this line, save the file, then Type/Say "<b>next</b>" in the CC CLI terminal, OR Type/Say "<b>Accept FINDING1, A</b>" in CC CLI)

    Details go here if applicable.
    - <u>Pros</u>: pros go here.
    - <u>Cons</u>: cons go here.


  - **Recommendation B**: **short description of recommendation B**  

    [ ] ➡️ **Accept** (To Accept, you may: mark <b>[X]</b> on this line, save the file, then Type/Say "<b>next</b>" in the CC CLI terminal, OR Type/Say "<b>Accept FINDING1, B</b>" in CC CLI)

    Details go here if applicable.
    - <u>Pros</u>: pros go here.
    - <u>Cons</u>: cons go here.


  - **Developer Resolution C**:  

    [ ] ➡️ **Accept** (To Accept, you may: mark <b>[X]</b> on this line, save the file, then Type/Say "<b>next</b>" in the CC CLI terminal, OR Type/Say "<b>Accept FINDING1, C</b>" in CC CLI)
    
    - you may enter your own resolution here

```

And the template for a  resolved finding is:  

```markdown
**FINDING1. Short Title For Finding**  
<span style="font-size:large" ><b>
✅ Resolved</b></span>  
✅ Requirements File Updated: 2026-10-29 3:05 PM  

    Multi-line explanation of the finding goes here.
    Line 2
    line 3

  - **Recommendation A** _(recommended)_: **short description of recommendation A**  
     
    [x] ➡️ **Accepted**

    Details go here if applicable.
    - <u>Pros</u>: pros go here.
    - <u>Cons</u>: cons go here.


  - **Recommendation B**: **short description of recommendation B**  

    [ ] ➡️ **Not Accept**

    Details go here if applicable.
    - <u>Pros</u>: pros go here.
    - <u>Cons</u>: cons go here.


  - **Developer Resolution C**:  

    [ ] ➡️ **Not Accept**
    
    - you may enter your own resolution here


```

Notice that the text after ➡️ has been changed to "Accepted" or "Not Accept" depending on the status of the recommendation.  
Also, the instructions after "Accept" have been removed.  
The blank lines in the markdown are important for readability even if they do not affect the rendered output.  



## Decisions (from requirements-report.md, 2026-10-29)

Scope and compatibility:  
- **Only `.claude/skills/speckit-requirements` changes** in this feature; `speckit-analyze-findings` and `speckit-clarify-findings` keep the old layout and are a follow-up (NC1).  
- **Old reports keep the old form.** The skill reads both forms; a report keeps the form it was created in, so APPEND and resolving an old-form finding write the old form (NC2).  

The layout:  
- **The explanation is a block quote**: each line of a finding's explanation starts with `> `, instead of the four-space indent, so links and formatting still render (AM1).  
- **Options not chosen read `[ ] ➡️ **Not Accepted**`**, parallel with `[X] ➡️ **Accepted**` (AM2).  
- **A resolved finding holds no instructions**: the Accept lines' instructions and the Developer Resolution's instruction line are removed, keeping any text the developer wrote there (AM3).  
- **The resolved form keeps the `**Notes**:` line** under `✅ Resolved` and `✅ Requirements File Updated` (UA1), and writes `✅ Requirements File Unchanged (no edit needed): <date>` instead when the accepted option needed no edit (UA2).  
- **A single recommendation stays `**Recommendation**`, unlettered**; its Accept line says `Accept <ID>`, and `Accept <ID>, A` means the same (UA3).  
- **Blank lines are rules**: one blank line after the title block, after the explanation, after the `❌ NOT Resolved` line, after each option's label and after each Accept line; two blank lines between options; a blank line is empty, never spaces (UA7).  

The checkbox:  
- **A box is ticked when it holds `x` or `X`**, in either case, with any number of spaces before or after it (`[x]`, `[ X ]`, `[  x]`, `[x ]`); the skill always writes `[X]` (IN1).  

Open and resolved:  
- **The `✅ Resolved` line alone decides whether a finding is resolved**; `❌ NOT Resolved` is for reading only, and "Next" restores it on an open finding that lacks it and removes it from a resolved one (UA4).  

Commands:  
- **`Accept <ID>[,] [<LETTER>]`**, case-insensitive, the comma optional; the id alone takes the single or recommended option; "Accept" and "Accept X" keep acting on the current finding (AM4).  
- **Any open finding may be named**, in any order; a resolved or unknown id, an unknown letter, or an empty Developer Resolution is reported and nothing changes; after resolving, "Next" runs and shows the first open finding (UA5).  
- **The command list and the prompts teach the new form**: *Resolution of Findings* adds `Accept <ID>, <LETTER>`, and the terminal prompts show the current finding's id in their Accept lines, e.g. `Type/Say 👉 "Accept AM2, B"` (UA6).  
