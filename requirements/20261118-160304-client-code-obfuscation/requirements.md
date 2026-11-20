Start a new spec for these requirements called `20261118-160304-CLIENT-CODE-OBFUSCATION`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

The CrowdPoll webapp is getting closer to its initial release.  
It is still restricted to a limited set of users for initial testing and feedback collection.  

The purpose of this feature journey is to obfuscate the client-side code, include js, and css and html if possible.  

Requirement 1: research the methods available.   

Requirement 2: evaluate the effectiveness and limitations of each method.  

Requirement 3: implement the chosen obfuscation method for the client-side code, including js, css, and html if possible.

Requirement 4: verify that the obfuscated code functions correctly and does not break the webapp's functionality.

Requirement 5: document the obfuscation process, including the chosen method, configuration, and any limitations or considerations for future maintenance.

Requirement 6: ensure that the obfuscation process is repeatable and can be integrated into the build or deployment pipeline for future updates.

Requirement 7: assess the performance impact of the obfuscation on the webapp and optimize if necessary to maintain a smooth user experience.

Requirement 8: ensure that the obfuscation does not compromise the security of the webapp, and that sensitive information is adequately protected.

Requirement 9: provide a mechanism to easily revert the obfuscation if issues arise, allowing for quick debugging and maintenance.

Requirement 10: ensure that the obfuscation process is compatible with all major browsers and does not introduce cross-browser issues.

## Resolved Requirements (2026-11-18 4:21 PM)

These decisions were accepted in `requirements-report.md`, and complete the requirements above.  

**Goal** (NC1)  

- The goal is to deter casual reading and copying of the client code.  
- One setting serves every script, the anti-abuse scripts (`deviceEvidence.js`, `humanCheck.js`) included;  
  the server keeps deciding whether a vote or an account is accepted.  

**Requirement 1: the methods researched** (RS1)  

- Minify and mangle the JavaScript (Terser, esbuild).  
- Obfuscate the JavaScript (`javascript-obfuscator`, `js-confuser`).  
- Commercial protection (Jscrambler, the paid tier of obfuscator.io).  
- Minify the CSS (Lightning CSS, esbuild, cssnano).  
- Rename CSS classes and ids (`postcss-rename`, `postcss-mangle-css-class`).  
- Minify the HTML (`html-minifier-terser`).  
- Bundle the scripts into one file (esbuild).  

**Requirements 2 and 3: the method chosen** (RS2, AM1, UA1, UA3)  

- JavaScript: every first-party script is minified and mangled, then passed through `javascript-obfuscator` at its light setting, with an encoded string table.  
- Control-flow flattening, dead code, self-defending, debug protection and domain lock stay off.  
- No method prevents reading, since the browser must run the code;  
  public tools undo the string table, leaving minified code, and this limit is accepted.  
- CSS and HTML are minified (comments and white space removed);  
  class names and ids stay.  
- Transformed: every first-party `.js`, `.css` and `.html` file at the top level of `src/public/`, and nothing else.  
- Copied as they are: `vendor/fingerprintjs-5.3.0.min.js`, images, SVG files, fonts and `favicon.ico`.  
- The legal pages are minified like the other pages;  
  their text, headings and anchors (`/privacy#cookies`) do not change.  
- The `{{PRIVACY_UPDATED}}` and `{{TERMS_UPDATED}}` markers, `</head>`, and the `href="/name.ext"` and `src="/name.ext"` forms the page routes rewrite survive the HTML step unchanged.  
- The build transforms each file once and writes the same transformed bytes to `dist/public/<name>` and to `dist/public/assets/<hash>/<name>`;  
  the fingerprint is the hash of the transformed bytes.  
- No readable copy and no source map is written under `dist/public`.  
- A test of the build asserts that, with the switch on, no file of the types in scope under `dist/public` equals its source.  

**Requirement 4: verification** (UA4)  

All three checks are made on the built output.  

- The jsdom client suites (`client-*.test.ts`) can be run against `dist/public` as well as `src/public`, and pass on both.  
- Every built script parses, and every page's references resolve to a file in the manifest.  
- A manual checklist in the quickstart, on the built app, with the browser console free of errors:  
  sign in, vote, change a vote, add a choice, open the maximized view, the line graph, Who voted, search, the admin editor, the settings and profile pages, and the legal pages.  

**Requirement 5: documentation** (UA7)  

- The method, its settings, the switch, the limits and how to trace an error are described in `ARCHITECTURE.md` and `CLAUDE_COMPLETE.md`.  
- The switch is listed in `.claude/rules/environment.md`, and `CLAUDE.md` gets a short entry.  

**Requirement 6: where it runs** (UA2)  

- The transformation runs only in `npm run build` (`devScripts/build-assets.ts`), so it is part of every release.  
- `npm run dev` and the existing test suites keep the readable source in `src/public/`.  

**Requirement 7: performance** (UA5)  

- Size: the compressed (gzip) total of the built scripts, sheets and pages is no larger than that of the source;  
  the build prints both totals.  
- Speed: on the home page with a full tab of cards, the first usable card and the drawing of the line graph are not noticeably slower in use than on the readable build, on a phone and on a desktop.  
- A script that fails either limit is given a lighter setting or left at minification, and the exception is documented.  

**Requirement 8: security** (AM2)  

- The client files are reviewed once for keys, tokens, addresses and internal notes that should not be public;  
  any found are removed from the source, not hidden.  
- Every rule the server enforces today stays enforced on the server;  
  no check moves to the client or relies on the code being unreadable.  
- The transformed code makes no third-party request and builds no code from strings at run time (no `eval`, no `Function`), so a Content-Security-Policy can be added later.  
- The new packages are development dependencies with exact versions;  
  the feature adds no package to what the running app installs, and the running app never loads a build tool.  

**Requirement 9: reverting and debugging** (AM3, UA7)  

- A build-time switch (AM4): the environment variable `ENV_OBFUSCATE_ASSETS`, read by `build-assets.ts`, with the values `on` and `off`, and `on` when it is unset.  
- It applies to every run of `npm run build`, local or on App Platform;  
  there is no second kind of build.  
- Any other value stops the build with a message naming the variable.  
- The build reads it and the app does not, so it is not added to `loadConfig`;  
  it is listed in `.claude/rules/environment.md` as a build-time setting.  
- It is left unset in `infra/app.tf`, and the build log says which mode was used.  
- Setting it to `off` in `infra/app.tf` and running `npm run deploy` releases the readable files;  
  the same switch builds a readable copy locally.  
- The same commit always builds the same bytes (a fixed seed, no time or random input), so a release can be rebuilt locally.  
- A local option of the build writes source maps to a git-ignored folder outside `dist/public`;  
  they are never published.  

**Requirement 10: browsers** (UA6)  

- The output uses no syntax newer than the source does;  
  the tools keep the source's language level, neither raising nor lowering it.  
- The Requirement 4 checklist is run once on the current versions of Chrome, Edge, Firefox and Safari on the desktop, Safari on iOS and Chrome on Android.  
