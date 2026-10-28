
**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Coding Principles

- Write minimal, readable, simple code
- Functions should be single-purpose
- the program will be designed to be robust, ensuring that it can handle various edge cases and unexpected inputs without crashing or producing incorrect output, for example by implementing appropriate error handling and input validation throughout the codebase
- the program will be designed to be efficient, 
- the program will be designed to be maintainable, with code that follows best practices for software development, making it easy for other developers to understand and contribute to the project in the future
- the program will be designed to be as lightweight as possible, minimizing CPU and memory usage while running in the background
- the program will be designed to handle errors gracefully
- the program will log an appropriate error message to the console without crashing
- the program will be designed with modularity in mind, allowing for easy addition of new features in the future
- the program will be designed to be user-friendly, with informative logging to the server-side console about what the program is doing 
- if the system has a client-side that runs in the browser, it will perform minimal logging in the browser console, and will not log any sensitive information to the console
- the program will be designed to respect the user's privacy, 
- the program will be designed to be secure, ensuring that it does not expose any vulnerabilities or security risks to the user's system, for example by ensuring that it does not allow for arbitrary code execution or access to sensitive data on the user's computer
- third-party code libraries may be used when necessary to prevent writing code that already exists in a mature, popular library

### Documentation
#### Internal Documentation
Comments in the code will only be used to refer to external documentation, which could be a third-party library's documentation, or a resource on the web that explains a particular concept or technique used in the code.  
Comments will not be used to explain what the code is doing, as this should be clear from the code itself.  
The program will be designed to be self-documenting, with clear and descriptive variable and function names that convey their purpose and functionality.  
Comments will never be used to document when a function has been changed and what the previous implementation was.  
Commments will not be used to reference the reqirements or specs that are the source of the implementation of code, as these are not necessary for the reader to understand what the code is doing.


a design document that explains the reasoning behind a particular implementation. Comments will not be used to explain what the code is doing, as this should be clear from the code itself. The program will be designed to be self-documenting, with clear and descriptive variable and function names that convey their purpose and functionality. The program will also include a comprehensive set of unit tests that serve as both documentation and verification of the program's behavior.

#### Documentation Files
**The following documentation files will always be generated AFTER the implementation phase of each feature or requirement.**   

The documentation files will be written in Markdown format with embedded Mermaid diagrams where appropriate.
The documentation files will be stored in the root directory of the project.
The documentation files will not contain any sensitive information, such as passwords or API keys, and will be safe to share publicly if necessary.
If a documentation file does not exist, it will be created.  
If the file already exists, when the documentation files are generated, an attempt will be made to update it with the new content, and any existing content that is still relevant will be preserved. However, if the existing content is considerably outdated, it will be acceptable, and even necessary, to completely regenerate a new file.

##### README.md
- The program will include a README.md file that provides an overview of the program, its purpose, and how to use it.  
- The primary consumers of the README.md file will be the devops who need to understand how to deploy the program, and the end user who needs to understand how to use the program.
- The README.md file will include instructions for installing and running the program, as well as any dependencies or prerequisites that are required.   
- The README.md will not reference other project docs, such as requirements, specification, architectures docs or design docs, as these are not necessary for the user to understand how to use the program. In addition, references to most up-to-date external docs tends to become stale over time, and the README.md should be self-contained and provide all necessary information for the user to get started with the program.    

##### ARCHITECTURE.md
- The program will include an ARCHITECTURE.md file in the root directory of the project, that provides a high-level overview of the program's architecture, including but not limited to:
    - deployment components, modules, and their interactions
    - runtime components, modules, and their interactions
    - standard software development diagrams
    - standard software development patterns such as MVC, MVVM, or microservices architecture, and how they are implemented in the program
    - modules, and their interactions
    - prose , if necessary, to describe aspects of the software architecture that are not easily captured in diagrams or patterns
- the primary consumers of the ARCHITECTURE.md file will be  
    - developers who need to understand how the program is structured and how its components interact with each other  
    - devops who need to understand how to deploy the program  
    - technical stakeholders who need to review and understand the program's architecture and design decisions
 

