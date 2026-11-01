Start a new spec for these requirements called `20261101-042151-CONCISE-CLAUDE-MD`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

In CC CLI, when we run /usage, we see a suggestion:
```
  37%  Trim C:\crowdPoll\editing-poll-available\CLAUDE.md · 21k tokens per request
```

Please make suggestions for reducing the size of CLAUDE.md.  

Currently, CLAUDE,md give a complete description of how the Crowdpoll webapp works internally, as well as the various features and functionalities it provides.  

We could like to maintain that complete version in a file called CLAUDE_COMPLETE.md, that is to be used by developers.   

Then we would like CLAUDE.md to be a consise version that is sent with almost every request sent to the AI model.  
REducing the token count is important to improve performance and efficiency when interacting with the AI model, as well as reduce costs associated with token usage.  
The concise version should focus on the key aspects of the Crowdpoll webapp, including its main features, core functionalities, and essential internal workings, while omitting detailed explanations and less critical information.  

## Additional Requirements (2026-11-01 10:04 AM)

Here are some new requirements after reviewing some of the findings.  
We do not want to change the /speckit skills that are shipped from GitHub.  
This could break if any changes are made to the /speckit skills that are shipped from GitHub.  
Therefore, any modifications to the /speckit skills will not be part of the resolution.  

The requirement is that there is a custom /speckit skill, that will be used manually by the developer, after a feature is implemented, before it is committed or merged into the main codebase.  
This skill will analyze the CLAUDE.md file and add new content in order to transfer some of it to CLAUDE_COMPLETE.md, ensuring that the concise version remains focused on essential information while preserving the full details in the complete version.  

The custom /speckit skill will be called `/speckit-concise-claudemd`.

Remove the existing Findings, and start again by analyzing the CLAUDE.md file to identify content that can be moved to CLAUDE_COMPLETE.md while keeping the concise version focused on essential information.

## Resolutions (2026-11-01 10:49 AM)

Decisions recorded from the requirements report's findings:

- **RS1**: The concise `CLAUDE.md` names `CLAUDE_COMPLETE.md` only in backticks, never as an `@` import. No line limit is set: a project may need a longer `CLAUDE.md`, and the developer watches its size. Each run of `/speckit-concise-claudemd` prints: 1. the lines and tokens of `CLAUDE.md` before the run, 2. after it, 3. the lines and tokens of `CLAUDE_COMPLETE.md` before the run, 4. after it (tokens estimated at about 4 characters per token).
- **RS2**: The skill treats whatever lies between the `<!-- SPECKIT START -->` and `<!-- SPECKIT END -->` markers as input, whatever its form; it never assumes one format.
- **AM1**: A run works by difference: anything in `CLAUDE.md` not yet in `CLAUDE_COMPLETE.md` is added to the complete file in its matching section, a new feature summary on top of the chain; then `CLAUDE.md` is condensed.
- **AM2**: `CLAUDE_COMPLETE.md` is kept up to date by every run, holding every feature's full summary, newest first.
- **AM3**: `CLAUDE_COMPLETE.md` is never sent as context to the AI: it is not imported, not loaded automatically, and `CLAUDE.md` does not tell the AI to read it. `CLAUDE.md` names it once, in backticks, for developers.
- **UA1**: No size limit is enforced or tested, and the skill names no line counts; it keeps `CLAUDE.md` concise and reports the sizes (RS1) at the end of each run.
- **UA2**: The concise `CLAUDE.md` keeps a *Cross-feature invariants* section of rules a change elsewhere could break; no bullet count is tested or named in the skill.
- **UA3**: Between the SPECKIT markers the skill leaves the current plan's path and its "Decisions that are easy to get wrong", concise, with no line count; the full summary and every earlier feature go to `CLAUDE_COMPLETE.md`.
- **UA4**: The Environment Variables table moves to a path-scoped rule, `.claude/rules/environment.md`, whose `paths:` cover `src/config.ts`, `.do/app.yaml`, `launch.json.example`, `devScripts.example/**` and `tests/config.test.ts`; it stays in `CLAUDE_COMPLETE.md` too, and the skill keeps the rule file in step.
- **UA5**: The skill's first run makes the split: with no `CLAUDE_COMPLETE.md`, it copies `CLAUDE.md` to it verbatim, then condenses `CLAUDE.md`; implementing this feature ends with that first run on `main`.
- **UA6**: The change is made on `main`; a branch gets it by merging `main`. On a conflict, keep both chain entries in `CLAUDE_COMPLETE.md` (newest first) and the side of `CLAUDE.md` whose SPECKIT block names the branch's own plan, then run `/speckit-concise-claudemd` again; the skill's instructions carry this recipe.
- **UA7**: The skill is `.claude/skills/speckit-concise-claudemd/SKILL.md`, user-invocable, with `disable-model-invocation: true`. The *Spec Kit Workflow* list moves to `CLAUDE_COMPLETE.md` only; the concise file keeps one line saying Spec Kit uses the PowerShell scripts. The new-feature journey message of `/speckit-requirements` becomes:
  ```
  ⚪ A new feature journey has started taking you through the following skills:
  ⚪ /speckit-requirements
  ⚪ /speckit-specify
  ⚪ /speckit-clarify
  ⚪ /speckit-plan
  ⚪ /speckit-tasks
  ⚪ /speckit-analyze
  ⚪ /speckit-analyze-findings (recommended)
  ⚪ (or /speckit-plan-thru-analyze, which runs /speckit-plan through /speckit-analyze-findings in one go)
  ⚪ /speckit-implement
  ⚪ /speckit-tweak (optional)
  ⚪ /speckit-concise-claudemd (recommended)
  ```
- **UA8**: The skill writes both files at once, then prints what moved (per section), what was condensed, and the sizes (RS1); it commits and stages nothing, and the developer reviews with `git diff` before committing.
- **NC1**: `/speckit-tweak` reminds the developer: its "All tweaks resolved" message becomes
  ```
  All tweaks resolved.
  Add TWEAK### to <tweaks_file_directory>/<tweaks_file_name> if there are more tweaks.
  `CLAUDE.md` has grown as this feature has been implemented.
  Execute `/speckit-concise-claudemd` to trim it and transfer important details to `CLAUDE_COMPLETE.md`.
  ```
  When the last two lines are shown is open (finding UA9).
- **UA9**: The two `CLAUDE.md` lines of the NC1 message are shown every time `/speckit-tweak` reports "All tweaks resolved"; no state is kept.
