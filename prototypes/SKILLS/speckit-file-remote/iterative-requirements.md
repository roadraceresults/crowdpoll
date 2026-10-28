# Overview

Build a .claude SKILL called speckit-file-remote.md.  
Place the working copy in "prototypes\SKILLS\speckit-file-remote\SKILL.md"  

The skill will put CC CLI in a mode where everything logged to the console will also be appended to a file,   
and input to the CC CLI can be read from a file.  
This mode will be referred to as "file-remote mode".  

The path to the input and output file will be specified as arguments to the skill as follows:  
`speckit-file-remote IN=<input-path-to-file> OUT=<output-path-to-file>`  
  
In file-remote mode,  
all console output should also be captured and written to the <input-path-to-file> file  
and console input can be read from the <input-path-to-file> file.  

When in file-remote mode, the CC CLI will "know" to get the next input from the <input-path-to-file> file  
when the user types `remote input` at the CLI prompt.  

After logging to the file, the file will be saved.

The mode can be turned off by entering "remote off" at the CLI prompt.  

# Updated Requirement
[X] Resolved

Create the input file if it doesn't exist, and ensure it is writable.

# Updated Requirement 002
[X] Resolved


The format of the 
```
## <full time stamp> — user input (remote: <relative-path-to-file-remote-input.md>)

<exact contents of the user input>

### Reply

<exact contents of the reply as displayed in the CC CLI terminal>
```

# Updated Requirement 003 - Default Input and Output Path and Filenames
[ ] Resolved

If the `IN` and `OUT` arguments are not provided when starting the skill, use the following default paths and filenames:
- Input file: `fileRemote/in.md`
- Output file: `fileRemote/out.md`

If the `IN` and `OUT` arguments are provided, but no path is included (i.e., only the filenames are given), 
the skill will use the default path of `fileRemote/`.  

When the skill starts the resolved IN and OUT will be logged clearly to the console, so the user knows which files are being used for input and output.

