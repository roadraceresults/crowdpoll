---
name: "speckit-file-remote"
description: "Put the session in file-remote mode: every reply shown at the console is also appended to an output file, and typing 'remote input' at the prompt reads the next input from an input file. 'remote off' ends the mode."
argument-hint: "[IN=<input-path-to-file>] [OUT=<output-path-to-file>]  (defaults: fileRemote/in.md, fileRemote/out.md)"
allowed-tools: Read, Write, Bash
user-invocable: true
disable-model-invocation: true
metadata:
    - author: "David Brooks"
---

# Skill Name / Purpose

This speckit-file-remote skill puts the Claude Code session in **file-remote mode**, so the session can be
driven and watched through two files instead of only the console:

- **Output file (`OUT`)** — everything you show the developer at the console is also appended to this
  file, and the file is saved after every append.
- **Input file (`IN`)** — when the developer types `remote input` at the prompt, the contents of this file
  are taken as the developer's next input, exactly as if they had been typed.

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

1. **Parse and resolve the arguments.** `IN=<path>` and `OUT=<path>` are both optional and may come in
   either order; a path containing spaces may be quoted (`IN="C:\my dir\in.md"`). Resolve each one by
   the first rule that applies:

   | Argument as given | Resolves to |
   |---|---|
   | Not given | the default: `IN` → `fileRemote/in.md`, `OUT` → `fileRemote/out.md` |
   | A filename only, with no `/` or `\` in it (`IN=next.md`) | that file in the default folder: `fileRemote/next.md` |
   | A path (`IN=dontTrack/in.md`, `OUT=C:\logs\out.md`) | that path, as given |

   Relative results, defaults included, are relative to the current working directory. Keep the
   absolute paths for the rest of the session.
   - If both resolve to the same file, do not start the mode: say so, show the usage line
     `/speckit-file-remote [IN=<input-path-to-file>] [OUT=<output-path-to-file>]`, and stop.
   - Anything else in the arguments that is not `IN=` or `OUT=` is an error handled the same way.
2. **Prepare the output file.** Create it, and any missing parent directories (the default `fileRemote/`
   folder included), if it does not exist. Never
   truncate or rewrite an existing output file — file-remote mode only ever appends.
3. **Prepare the input file.** If it does not exist, create it empty, along with any missing parent
   directories. Then make sure it is writable, so the developer can put the next input in it:

   ```bash
   in="<absolute input path, forward slashes>"
   mkdir -p "$(dirname "$in")" && touch "$in"
   [ -w "$in" ] || chmod u+w "$in"   # on Windows this clears the read-only attribute
   [ -w "$in" ] && echo writable || echo NOT-WRITABLE
   ```

   `touch` on an existing file changes only its timestamp, never its contents. If the file still is not
   writable (a permissions or ownership problem chmod cannot fix), do not start the mode: say so, with the
   path, and stop. Beyond creating it and making it writable, never modify or delete the input file — its
   contents belong to the developer.
4. **Confirm.** Reply with a short confirmation that starts with the resolved files, set apart so the
   developer can see at a glance which files are in use, and says where each came from:

   ```text
   File-remote mode is on.
     IN:  fileRemote/in.md   (C:\code\project\fileRemote\in.md) — default; created just now
     OUT: fileRemote/out.md  (C:\code\project\fileRemote\out.md) — default
   Type `remote input` to run the contents of IN; type `remote off` to stop.
   ```

   Show each path relative to the working directory and in full, and mark it `default`, `default
   folder` (a filename only was given) or `as given`; add `created just now` to a file this step
   created. Append the same confirmation to the output file as the first entry, under a session header
   (see *Entry format*).

## While the mode is on

These rules hold for every turn after the mode starts, until `remote off`, and they take precedence over
the habit of simply replying at the console.

### Each turn

1. **Work out the input.**
   - If the developer's message is exactly `remote input` (ignore case and surrounding whitespace), read
     the input file with the Read tool and treat its full contents as the developer's message for this
     turn. Follow them exactly as you would typed input — including a slash command such as
     `/speckit-fix What's next`, which you run by invoking that skill.
     - If the input file is empty, do not guess an input: reply that there is nothing to read (naming the
       path), log that reply, and wait. If it has gone missing since the mode started, recreate it empty
       and writable as in *Starting the mode*, step 3, and reply the same way.
     - The input file is read fresh on every `remote input`; the same contents typed twice run twice.
       Do not try to detect or skip repeated input.
   - If the message is exactly `remote off`, go to *Ending the mode*.
   - Otherwise the typed message is the input, as usual.
2. **Do the work** the input asks for, with whatever tools it needs.
3. **Log, then show.** Compose your reply in full, append it to the output file (see *Appending*), and
   then write the same text to the console. The console text and the logged text must match; don't
   shorten one of them.
   - Updates you write between tool calls during a long turn are console output too: append each one to
     the output file just before you write it, so someone watching the file can follow progress.
   - If you ask the developer a question (including through a question tool), log the question and its
     options, and log the answer you receive as the next turn's input.

### Entry format

Append Markdown, one entry per turn, so the file reads as a transcript:

```markdown
---

## <full time stamp> — user input (remote: <relative-path-to-file-remote-input.md>)

<exact contents of the user input>

### Reply

<exact contents of the reply as displayed in the CC CLI terminal>
```

- **Full time stamp** — local date, time to the second, and UTC offset, e.g. `2026-10-08 09:47:12 -07:00`.
  Take it from the clock at the moment of the append (`date '+%Y-%m-%d %H:%M:%S %:z'`), never estimate it.
- **Relative path** — the input file's path relative to the working directory, with forward slashes
  (e.g. `dontTrack/remote-in.md`). If the input file is outside the working directory, use its absolute
  path instead.
- **Typed input** — when the input was typed at the prompt rather than read from the file, the heading
  ends `— user input (typed)` instead.
- **User input** — exactly what was read from the input file (or typed), unchanged: no trimming,
  reformatting or summarizing.
- **Reply** — exactly the text shown in the terminal for that turn, unchanged.

Updates written between tool calls are appended under the turn's `### Reply` heading as they happen, and
the final reply follows them. The session header written when the mode starts is:

```markdown
# File-remote session — started <full time stamp>

IN:  <absolute input path>
OUT: <absolute output path>
```

### Appending

Append with the Bash tool and a quoted heredoc, so nothing in the text is expanded or interpreted, and
pick a delimiter that cannot appear in the text:

```bash
cat >> "<absolute output path>" <<'__FILE_REMOTE_END_7f3a__'
<entry text>
__FILE_REMOTE_END_7f3a__
```

Use forward slashes in the path for Bash (`C:/dir/out.md` or `/c/dir/out.md`). The append writes and
closes the file, so it is saved as soon as the command returns. Do not use the Write tool on the output
file — it replaces the whole file. If an append fails, say so at the console with the error, and keep
going; do not drop out of the mode over one failed write.

## Ending the mode

When the developer types `remote off`:

1. Append a final entry — the input `remote off` and the reply
   `File-remote mode is off. Output was logged to <absolute output path>.` — followed by the line
   `# File-remote session — ended <full time stamp>`.
2. Show the same reply at the console.
3. From the next turn on, stop logging and treat `remote input` as ordinary text again (if it is typed,
   say the mode is off and how to start it).

Starting the skill again while the mode is on replaces the paths: log `remote off` to the old output file
as above, then start afresh with the new arguments.

## Notes

- **Context compaction.** The mode lives in the conversation. If the conversation is summarized, carry
  forward that file-remote mode is on and both absolute paths, so the rules keep applying.
- **Sensitive output.** Everything shown at the console lands in the output file in plain text. If a reply
  would show a secret (a token, a password, an `ENV_*` secret), redact it in both places.
- **No other files.** The mode creates (if needed) and reads only the input file, and appends only to
  the output file; it keeps no state file of its own.
