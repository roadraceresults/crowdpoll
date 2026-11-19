# Contract: the build of the client files

The interface is the command `npm run build` (its asset step, `devScripts/build-assets.ts`), its environment, its
output folder, its messages and its exit code. Each item is covered by `tests/build-assets.test.ts` unless marked
*by hand*.

## B1. Default: transformed

With `ENV_OBFUSCATE_ASSETS` unset or `on`, every top-level `.js`, `.css` and `.html` file of `src/public/` is
written to `dist/public/` transformed, and the build prints `[build] client files: transformed`.

## B2. Off: readable

With `ENV_OBFUSCATE_ASSETS=off`, every file of `dist/public/` (outside `assets/` and the manifest) equals its source
byte for byte, and the build prints `[build] client files: readable (ENV_OBFUSCATE_ASSETS=off)`.

## B3. Any other value stops the build

The build prints `ENV_OBFUSCATE_ASSETS must be "on" or "off" (got "<value>")`, writes nothing and exits with code 1.
`On`, `OFF`, `1`, `true` and the empty string are all refused.

## B4. What a transformed script is

- It holds no comment of its source.
- Its top-level names and the names it puts on `window` are its source's (FR-007), beside the decoder's two
  functions, which are named after the script so that no two scripts share them.
- No string literal of its source that is longer than three characters appears in it as plain text. *(The test uses
  a fixture script with known strings.)*
- It contains no `eval(`, `new Function` or `Function(` that its source does not (FR-025).
- It compiles.

## B5. What a transformed sheet or page is

- It holds no comment of its source.
- A sheet's set of selectors' class names, ids and media conditions is its source's.
- A page's `{{PRIVACY_UPDATED}}` and `{{TERMS_UPDATED}}` markers, its `</head>`, and its list of
  `href="/name.ext"` and `src="/name.ext"` references are its source's, in order, with their double quotes.
- A page's text content, read with an HTML parser and with runs of spacing folded, is its source's.

## B6. Untouched files

Every file under `vendor/`, `oauth/` and `fonts/`, and every top-level file that is not `.js`, `.css` or `.html`,
equals its source.

## B7. Two copies, one content

For every manifest entry `"/<name>": "<hash>/<name>"`, `dist/public/<name>` and
`dist/public/assets/<hash>/<name>` are the same bytes, and `<hash>` is the first 16 hex digits of their SHA-256.

## B8. Nothing readable, no map, in the built site

In a transformed build, no `.js`, `.css` or `.html` file in scope equals its source (an empty file is excused), and
no `*.map` file and no `sourceMappingURL` text exists anywhere under `dist/public/`.

## B9. The checks stop the build

Each of these prints its cause, removes `dist/public/` and exits with code 1:

| Cause | Message names |
|---|---|
| a file in scope cannot be transformed | the file and the tool's error |
| a non-empty file in scope equals its source after transformation | the file |
| the compressed total after is larger than before | both totals |
| a built script does not compile | the file |
| a page refers to a top-level asset missing from the manifest | the page and the reference |
| a build tool is not installed while the switch is on | the setting, the missing package and `npm ci --include=dev` |

A missing tool is found before `dist/public/` is touched, as an invalid switch value is (B3); with the switch off no
build tool is loaded, so a readable build needs none.

## B10. The language level is pinned

For every script, shortening with the pinned level gives the same bytes as shortening with no limit. A difference
fails the test and names the script: the source has started using newer syntax, and the level is raised on purpose.

## B11. The report

A successful build prints the compressed totals,
`[build] compressed size: <before> → <after> bytes (<percent>%)`, and the existing line with the number of
fingerprinted assets.

## B12. Repeatable

Two builds of the same source produce the same set of files with the same bytes, manifest included.

## B13. Source maps on request only

- With `--source-maps`: one `dist-maps/<name>.js.map` per transformed script; every file under `dist/public/` equals
  the same build without the flag; a position in a built fixture script resolves through its map to the right source
  line.
- Without it: `dist-maps/` does not exist after the build, even if an earlier build left one.

## B14. Lighter scripts

A script named in `LIGHTER_SCRIPTS` is shortened only: it compiles, holds no comment, and holds its source's string
literals as plain text.

## B15. Development and tests are unchanged

- `npm run dev` serves `src/public/` as written. *By hand.*
- `npm test` passes without a build, and no existing suite is changed except `tests/helpers/browser.ts` taking its
  folder from `TEST_PUBLIC_DIR`, default `src/public`.
- `npm run test:built` builds, then runs `tests/client-*.test.ts` against `dist/public`, and passes.

## B16. The running site does not read the switch

`src/` contains no reference to `ENV_OBFUSCATE_ASSETS`, and the four build packages are `devDependencies` with exact
versions.
