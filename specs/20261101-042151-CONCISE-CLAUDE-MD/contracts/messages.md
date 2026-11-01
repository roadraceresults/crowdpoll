# Contract: Messages in the Project Skills

## M1 — `/speckit-tweak`: "All tweaks resolved"

This replaces the one-line message everywhere `.claude/skills/speckit-tweak/SKILL.md` gives its text: the
definition (line 324 as read), the summary (465) and the example table (507). It is shown every time it is
reported, and no state is kept (UA9 B):

```text
All tweaks resolved.
Add TWEAK### to <tweaks_file_directory>/<tweaks_file_name> if there are more tweaks.
`CLAUDE.md` has grown as this feature has been implemented.
Execute `/speckit-concise-claudemd` to trim it and transfer important details to `CLAUDE_COMPLETE.md`.
```

The definition keeps its own style: bold, with the placeholders written as `tweaks_file_directory`/`tweaks_file_name`
in backticks. Each of the four lines ends with two spaces so each renders on its own line. The example at 507 fills
in `specs/018-TAB-BAR/tweaks.md`.

## M2 — `/speckit-requirements`: the new-feature journey message

This replaces the skill list in step 4 of *Starting a new feature (NEW)* (lines 158–170 as read). The format of the
lines (`⚪ **/skill**`, two trailing spaces) is unchanged:

```text
⚪ A new feature journey has started taking you through the following **skills**:
⚪ **/speckit-requirements**
⚪ **/speckit-specify**
⚪ **/speckit-clarify**
⚪ **/speckit-plan**
⚪ **/speckit-tasks**
⚪ **/speckit-analyze**
⚪ **/speckit-analyze-findings** (recommended)
⚪ (or **/speckit-plan-thru-analyze**, which runs /speckit-plan through /speckit-analyze-findings in one go)
⚪ **/speckit-implement**
⚪ **/speckit-tweak**  (optional)
⚪ **/speckit-concise-claudemd** (recommended)
```

`/speckit-tweaks` is corrected to `/speckit-tweak`, the skill's real name (analyze finding I3). `/speckit-clarify-findings` is no longer listed. The skill itself is not removed.
