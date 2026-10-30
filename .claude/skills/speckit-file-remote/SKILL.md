---
name: "speckit-file-remote"
description: "Put the session in file-remote mode: every reply shown at the console is also written to an output file (newest first by default; oldest first with APPEND), and typing 'remote input' at the prompt reads the next input from an input file. 'remote off' ends the mode."
argument-hint: "[IN=<input-path-to-file>] [OUT=<output-path-to-file>] [APPEND]  (defaults: fileRemote/IN-<timestamp>.md, fileRemote/OUT-<timestamp>.md, newest first)"
allowed-tools: Read, Write, Bash
user-invocable: true
disable-model-invocation: true
metadata:
    - author: "David Brooks"
---

# Skill Name / Purpose

This speckit-file-remote skill puts the Claude Code session in **file-remote mode**, so the session can be
driven and watched through two files instead of only the console:

- **Output file (`OUT`)** — everything you show the developer at the console is also written to this
  file, **newest first** by default: each turn's entry is prepended at the top, so the developer always sees the
  most recent reply without scrolling. With the `APPEND` argument, entries are appended at the end instead (oldest
  first). The file is saved after every write.
- **Input file (`IN`)** — when the developer types `remote in` (or `remote input`) at the prompt, the prompt
  written in this file — everything above its `# CLIPBOARD` line — is taken as the developer's next input,
  exactly as if it had been typed. The `# CLIPBOARD` section below it is the developer's scratch area and is
  never sent.

The mode lasts until the developer types `remote off`.

What "console output" means here: you cannot hook the terminal itself, so file-remote mode mirrors what
*you* write to the console — your text replies, including the short updates you write between tool calls
— together with the input that prompted each turn. Tool calls, their raw results and the CLI's own
chrome (permission prompts, spinners) are not mirrored; summarize in your reply anything from them the
developer needs to see, and it reaches the file with the reply.

## User Input

```text
$ARGUMENTS
```

## Starting the mode

1. **Parse and resolve the arguments.** `IN=<path>`, `OUT=<path>` and `APPEND` are all optional and may come in
   any order. `APPEND` (case-insensitive) sets `WRITE_MODE` to **append**; without it `WRITE_MODE` is **prepend**,
   the default. Keep `WRITE_MODE` for the rest of the session. For `IN` and `OUT`, a path containing spaces may be quoted (`IN="C:\my dir\in.md"`). Resolve each one by
   the first rule that applies:

   | Argument as given | Resolves to |
   |---|---|
   | Not given | the default: `IN` → `fileRemote/IN-<TIMESTAMP>.md`, `OUT` → `fileRemote/OUT-<TIMESTAMP>.md` |
   | A filename only, with no `/` or `\` in it (`IN=next.md`) | that file in the default folder: `fileRemote/next.md` |
   | A path (`IN=dontTrack/in.md`, `OUT=C:\logs\out.md`) | that path, as given |

   `<TIMESTAMP>` is the local time when the mode starts, from the shell, in the form `YYYYMMDD-HHMMSS-XM`
   (`date '+%Y%m%d-%H%M%S-%p'`, e.g. `fileRemote/IN-20261020-143502-PM.md`), where `XM` is `AM` or `PM`. The
   hour is on the 24-hour clock, so the files sort by name in time order. Take it once, so a session's two default
   files share the same timestamp; each new session gets new files.

   Relative results, defaults included, are relative to the current working directory. Keep the
   absolute paths for the rest of the session.
   - If both resolve to the same file, do not start the mode: say so, show the usage line
     `/speckit-file-remote [IN=<input-path-to-file>] [OUT=<output-path-to-file>] [APPEND]`, and stop.
   - Anything else in the arguments that is not `IN=`, `OUT=` or `APPEND` is an error handled the same way.
2. **Prepare the output file.** Create it, and any missing parent directories (the default `fileRemote/`
   folder included), if it does not exist. Never lose what an existing output file holds: every write adds new
   text (at the top, or at the end with `APPEND`; see *Writing the output file*) and keeps everything already
   there, byte for byte.
3. **Prepare the input file.** If it does not exist, create it, along with any missing parent directories,
   from the template in *Input file template* (its commands never touch an existing file), with
   `<OUTPUT-FILE-PATH-AND-NAME>` replaced by the output file's path relative to the working directory (absolute if
   it is outside it), and, when `WRITE_MODE` is append, `at the top of` replaced by `at the end of`. Then make sure
   the file is writable, so the developer can put the next input in it:

   ```bash
   [ -w "<absolute input path>" ] || chmod u+w "<absolute input path>"   # on Windows this clears the read-only attribute
   [ -w "<absolute input path>" ] && echo writable || echo NOT-WRITABLE
   ```

   If the file still is not writable (a permissions or ownership problem chmod cannot fix), do not start the mode:
   say so, with the path, and stop. Beyond creating it and making it writable, never modify or delete the input
   file — its contents belong to the developer.
4. **Confirm.** Reply with this confirmation, with `<PATH-TO-INPUT-FILE>` and `<PATH-TO-OUTPUT-FILE>` replaced
   by the files' paths relative to the working directory (absolute when a file is outside it).

   In the default mode (newest first, at the top of the output file):

   ```text
   ⚪
   ℹ️ /speckit-file-remote allows you to interact with the ▶️ CC CLI Terminal
   ℹ️ through your IDE (or text editor).
   ℹ️ This gives you the power of your IDE when editing prompts and reading responses:
   ℹ️ ✅ auto-complete/auto-correct
   ℹ️ ✅ a better overall editing experience, including quicker copy/paste
   ℹ️ ✅ quicker re-use of prompts
   ℹ️ ✅ formatted responses that are much easier to read
   ℹ️ ✅ a complete history of your sessions
   ⚪
   ⚪ File Remote mode is ✅ ON
   ⚪
   ⚪ Enter your prompts for the CC CLI terminal at the top of the input file:
   🟩 👉 <PATH-TO-INPUT-FILE>
   ⚪ Save the file and then Type or Say:
   🟩 👉 remote in
   ⚪ Typically, all you need to do is hit the TAB key.
   ⚪
   ⚪ The responses from the CC CLI will be found at the top of the output file:
   🟩 👉 <PATH-TO-OUTPUT-FILE>
   ⚪
   ⚪ To exit File Remote mode, Type or Say:
   🟩 👉 remote off
   ⚪
   ```

   In APPEND mode (oldest first, at the end of the output file), the same, except that the response is found at
   the **bottom**:

   ```text
   ⚪
   ℹ️ /speckit-file-remote allows you to interact with the ▶️ CC CLI Terminal
   ℹ️ through your IDE (or text editor).
   ℹ️ This gives you the power of your IDE when editing prompts and reading responses:
   ℹ️ ✅ auto-complete/auto-correct
   ℹ️ ✅ a better overall editing experience, including quicker copy/paste
   ℹ️ ✅ quicker re-use of prompts
   ℹ️ ✅ formatted responses that are much easier to read
   ℹ️ ✅ a complete history of your sessions
   ⚪
   ⚪ File Remote mode is ✅ ON
   ⚪
   ⚪ Enter your prompts for the CC CLI terminal at the top of the input file:
   🟩 👉 <PATH-TO-INPUT-FILE>
   ⚪ Save the file and then Type or Say:
   🟩 👉 remote in
   ⚪ Typically, all you need to do is hit the TAB key.
   ⚪
   ⚪ The responses from the CC CLI will be found at the bottom of the output file:
   🟩 👉 <PATH-TO-OUTPUT-FILE>
   ⚪
   ⚪ To exit File Remote mode, Type or Say:
   🟩 👉 remote off
   ⚪
   ```

   Write the session header to the output file, then the same confirmation as the session's first entry: above
   the header when prepending, below it when appending (see *Entry format* and *Writing the output file*).

### Input file template

Create a missing input file exactly as below, unindented, with `<OUTPUT-FILE-PATH-AND-NAME>` and (with `APPEND`)
`at the top of` replaced as described in *Starting the mode*, step 3. It starts with two empty lines, where the
developer writes the prompt; the two trailing spaces after `OUTPUT file:` are a Markdown line break and are kept.

```bash
mkdir -p "<absolute input folder, forward slashes>"
[ -e "<absolute input path>" ] || cat > "<absolute input path>" <<'__FILE_REMOTE_IN_7f3a__'


# CLIPBOARD - everything below this line is not sent to the CC CLI with your prompt above

** Getting Started **
1. Enter your prompt above this CLIPBOARD section.
2. Save the file.
3. At the CC CLI prompt, type or say: remote in
   In most cases, all you need to do is hit the TAB key since "remote in" will usually be the suggested next prompt while in "fileRemote mode".
4. The response from CC CLI will appear at the top of the OUTPUT file:  
   <OUTPUT-FILE-PATH-AND-NAME>

__FILE_REMOTE_IN_7f3a__
```

## While the mode is on

These rules hold for every turn after the mode starts, until `remote off`, and they take precedence over
the habit of simply replying at the console.

### Each turn

1. **Work out the input.**
   - If the developer's message is exactly `remote in` or `remote input` (ignore case and surrounding
     whitespace), read the input file with the Read tool and take **the prompt**: everything above the first line
     that starts with `# CLIPBOARD` (case-insensitive, ignoring leading spaces), or the whole file when it has no such line. That line and
     everything below it are never sent, logged or acted on. Treat the prompt as the developer's message for this
     turn. Follow them exactly as you would typed input — including a slash command such as
     `/speckit-tweaks Next`, which you run by invoking that skill.
     - If the prompt is empty or only whitespace, do not guess an input: reply that there is nothing above the
       `# CLIPBOARD` line to read (naming the path), log that reply, and wait. If the file has gone missing since
       the mode started, recreate it from the template as in *Starting the mode*, step 3, and reply the same way.
     - The input file is read fresh on every `remote in`; the same prompt sent twice runs twice.
       Do not try to detect or skip repeated input.
   - If the message is exactly `remote off`, go to *Ending the mode*.
   - Otherwise the typed message is the input, as usual.
2. **Do the work** the input asks for, with whatever tools it needs.
3. **Log, then show.** Compose your reply in full, write it to the output file (see *Writing the output file*), and
   then write the same text to the console. The console text and the logged text must match; don't
   shorten one of them.
   - Updates you write between tool calls during a long turn are console output too: add each one to the
     current turn's entry just before you write it, so someone watching the file can follow progress (see
     *Writing the output file*).
   - If you ask the developer a question (including through a question tool), log the question and its
     options, and log the answer you receive as the next turn's input.

### Entry format

Write Markdown, one entry per turn, so the file reads as a transcript — newest at the top when prepending, oldest at
the top when appending:

```markdown
## <full time stamp> — user input (remote: <relative-path-to-file-remote-input.md>)

<exact contents of the user input>

### Reply

<exact contents of the reply as displayed in the CC CLI terminal>

<!-- file-remote: end of entry -->

---

```

- **End-of-entry marker** — every entry ends with the line `<!-- file-remote: end of entry -->` (invisible in
  the Markdown preview), followed by the `---` rule that separates it from the older entry below. The first marker
  in the file always closes the current turn's entry; that is where its updates are inserted.

- **Full time stamp** — local date, time to the second, and UTC offset, e.g. `2026-10-08 09:47:12 -07:00`.
  Take it from the clock at the moment of the write (`date '+%Y-%m-%d %H:%M:%S %:z'`), never estimate it.
- **Relative path** — the input file's path relative to the working directory, with forward slashes
  (e.g. `dontTrack/remote-in.md`). If the input file is outside the working directory, use its absolute
  path instead.
- **Typed input** — when the input was typed at the prompt rather than read from the file, the heading
  ends `— user input (typed)` instead.
- **User input** — exactly the prompt read from the input file (above its `# CLIPBOARD` line), or what was typed,
  unchanged: no trimming,
  reformatting or summarizing.
- **Reply** — exactly the text shown in the terminal for that turn, unchanged.

Updates written between tool calls are added under the turn's `### Reply` heading as they happen, just above its
end-of-entry marker, and the final reply follows them. The session header written when the mode starts (it ends
up below the session's first entry, since everything newer goes above it) is:

```markdown
# File-remote session — started <full time stamp>

IN:  <absolute input path>
OUT: <absolute output path>

---

```

### Writing the output file

**When `WRITE_MODE` is append** (the `APPEND` argument), add everything at the end of the file with `cat >>`, in
the order it happens: the session header first, then each entry, its updates and final reply, then its end-of-entry
marker and `---` rule when the turn is over, and finally the closing line. Nothing is ever inserted above:

```bash
cat >> "<absolute output path>" <<'__FILE_REMOTE_END_7f3a__'
<text>
__FILE_REMOTE_END_7f3a__
```

**When `WRITE_MODE` is prepend** (the default), use the commands below.

Write with the Bash tool and a quoted heredoc, so nothing in the text is expanded or interpreted, and pick a
delimiter that cannot appear in the text. Spell out the real paths (forward slashes, e.g. `C:/dir/out.md` or
`/c/dir/out.md`); do not build them from shell variables.

- **A new entry** (or the session header, or the closing line) goes at the very top: write it to a temporary file
  beside the output file, add the existing output after it, and replace the output file with the result:

  ```bash
  cat > "<absolute output path>.tmp" <<'__FILE_REMOTE_END_7f3a__'
  <entry text>
  __FILE_REMOTE_END_7f3a__
  cat "<absolute output path>" >> "<absolute output path>.tmp" && mv -f -- "<absolute output path>.tmp" "<absolute output path>"
  ```

- **An update during the current turn** goes into the top entry, just above the first end-of-entry marker:

  ```bash
  cat > "<absolute output path>.add" <<'__FILE_REMOTE_END_7f3a__'
  <update text>
  __FILE_REMOTE_END_7f3a__
  awk -v add="<absolute output path>.add" '!done && $0 == "<!-- file-remote: end of entry -->" { while ((getline l < add) > 0) print l; print ""; done = 1 } { print }' "<absolute output path>" > "<absolute output path>.tmp" && mv -f -- "<absolute output path>.tmp" "<absolute output path>" && rm -f -- "<absolute output path>.add"
  ```

  The final reply of the turn is inserted the same way.

`mv` replaces the output file only after the new copy is complete, so the file is never left half written, and it
is saved as soon as the command returns. Do not use the Write tool on the output file. If a write fails, say so at
the console with the error, delete the temporary file if it was left behind, and keep going; do not drop out of the
mode over one failed write.

## Ending the mode

When the developer types `remote off`:

1. Write a final entry — the input `remote off` and the reply below, with `<PATH-TO-OUTPUT-FILE>` replaced by the
   output file's path relative to the working directory (absolute when it is outside it):

   ```text
   ⚪
   🟩 File Remote mode is ❌ OFF
   🟩 Output was logged to:
   👉 <PATH-TO-OUTPUT-FILE>
   ⚪
   ```

   — and the line
   `# File-remote session — ended <full time stamp>`: above the entry, at the very top, when prepending; after it,
   at the very end, when appending.
2. Show the same reply at the console.
3. From the next turn on, stop logging and treat `remote in` and `remote input` as ordinary text again (if one is typed,
   say the mode is off and how to start it).

Starting the skill again while the mode is on replaces the paths: log `remote off` to the old output file
as above, then start afresh with the new arguments.

## Notes

- **Context compaction.** The mode lives in the conversation. If the conversation is summarized, carry
  forward that file-remote mode is on and both absolute paths, so the rules keep applying.
- **Sensitive output.** Everything shown at the console lands in the output file in plain text. If a reply
  would show a secret (a token, a password, an `ENV_*` secret), redact it in both places.
- **No other files.** The mode creates (if needed) and reads only the input file, and writes only to
  the output file (through its short-lived `.tmp` and `.add` files beside it); it keeps no state file of its own.
