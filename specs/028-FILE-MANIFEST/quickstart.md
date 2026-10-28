# Quickstart: validating the File Manifest Script

A run guide that proves the feature end to end. It uses the contracts in [contracts/cli.md](contracts/cli.md)
and [contracts/reports.md](contracts/reports.md); it does not repeat them. Commands are for a Bash-compatible
shell. On Windows 11 use Git Bash, which installs with Git for Windows, so the same commands work there.

## Prerequisites

- Node 22 or later, `git`, and the repository's dependencies: `npm ci`.
- A clean working tree is not required. The run only reads the project and writes under `manifests/`.

## 1. Run on this repository

```bash
npm run file-manifest -- .
```

Expect: exit code 0; the console prints `Manifest written to <repo>/manifests/<YYYY-MM-DD_HH-mm-ss>`, a
files-counted figure close to 880 (it varies as the working tree changes), a small skipped figure (four on
a case-sensitive file system, because of the `designdocs`/`designDocs` index entries), and the report names.

```bash
run=$(ls -d manifests/*/ | tail -1); ls "$run"
```

Expect `overall.md`, `not-gitignored.md`, `gitignored.md`, `directories.md`, `dist.md`, `public.md`,
`assets.md`, `src.md` and `tests.md` (the last five because this repository has those folders, and `dist/`
exists after `npm run build`). In this repository `git status` must not list `manifests/` (`/manifests/` is ignored).

## 2. Check the identities (SC-002 to SC-004)

```bash
run=$(ls -d manifests/*/ | tail -1)
tail -n 1 "$run/overall.md" "$run/not-gitignored.md" "$run/gitignored.md" "$run/directories.md"
```

- The `**Total**` Files cell of `overall.md` equals the sum of the same cell in `not-gitignored.md` and
  `gitignored.md`.
- Every cell of the `directories.md` `**Total**` row equals the same column of `overall.md`'s.
- In any report, add a column by hand (for example `awk -F'|' 'NR>2 && $2 !~ /Total/ {s+=$3} END {print s}'
  "$run/src.md"`) and compare it with the `**Total**` row.
- Counted plus skipped equals `git ls-files`, plus untracked, plus ignored, minus the three excluded
  folders:

```bash
( git ls-files -z; git ls-files -z -o --exclude-standard; git ls-files -z -o -i --exclude-standard ) \
  | tr '\0' '\n' | grep -v -E '^(node_modules|node-modules|manifests)/' | wc -l
```

## 2b. Timing (SC-001)

```bash
time npm run file-manifest -- .
```

Expect under 2 seconds in total on this repository, runner start-up included. For the large case, build a
fixture of 10,000 small untracked files and time the run:

```bash
d=$(mktemp -d) && cd "$d" && git init -q
for i in $(seq 1 100); do mkdir "d$i"; for j in $(seq 1 100); do echo "line $i $j" > "d$i/f$j.txt"; done; done
cd - >/dev/null
time npm run file-manifest -- "$d"
```

Expect under 10 seconds, and `Files counted: 10000` on the console.

## 3. A fixture repository with hand-worked counts (SC-005)

```bash
d=$(mktemp -d) && cd "$d" && git init -q
printf 'a\nb'              > no-newline.txt     # 2 lines, text
printf 'a\nb\n'            > newline.txt        # 2 lines
: > empty.txt                                   # 0 lines
printf 'a\r\nb\r\n'        > crlf.txt           # 2 lines
printf 'x\0y'              > binary.dat         # binary, 3 bytes
printf '/* one\n\n two */\nlet a = 1; // note\n// only\n' > code.ts   # 5 lines, 4 comment lines
printf 'dist/\n'           > .gitignore
mkdir dist && printf 'x\n' > dist/out.js        # ignored
printf 'u\n'               > untracked.md       # untracked
git add no-newline.txt newline.txt empty.txt crlf.txt binary.dat code.ts .gitignore
cd - >/dev/null
npm run file-manifest -- "$d"
```

Expect in `<d>/manifests/<run>/overall.md`:

| File type | Files | Lines | Comment lines | Size (bytes) |
|---|---|---|---|---|
| (none) | 1 | 1 |  |  |
| .dat | 1 |  |  | 3 |
| .js | 1 | 1 | 0 |  |
| .md | 1 | 1 |  |  |
| .ts | 1 | 5 | 4 |  |
| .txt | 4 | 6 |  |  |
| **Total** | 9 | 14 | 4 | 3 |

(`(none)` is the `.gitignore` file: one line. `.txt` is `no-newline`, `newline`, `empty` and `crlf`, with
2 + 2 + 0 + 2 = 6 lines. `.js` shows `0` comment lines because `.js` has a comment syntax.)

`gitignored.md` must hold one `.js` row; `not-gitignored.md` must have 8 files; `directories.md` must show
`dist` as `.gitignored`, `.` rows as `committed` and the `untracked.md` row as `untracked`.

## 4. Skipped entries and exclusions

```bash
cd "$d" && rm newline.txt && ln -s no-newline.txt link.txt && git add -f link.txt && mkdir node_modules \
  && echo x > node_modules/skip.js && mkdir -p manifests/old && cd - >/dev/null
npm run file-manifest -- "$d"
```

Expect: the console reports 2 skipped (`newline.txt: missing`, `link.txt: symlink`), the first five paths
shown; no report mentions `node_modules` or `old`; the earlier `manifests/<run>` is untouched.

## 5. A second run in the same second (SC-006)

```bash
npm run file-manifest -- "$d" & npm run file-manifest -- "$d"; wait; ls "$d/manifests"
```

Expect two new folders, one ending `-2` when both started in the same second. No file outside
`$d/manifests/` is created or changed (`git -C "$d" status --short` shows only the changes you made above).

## 6. Failures (SC-007)

Each command must finish within 3 seconds, runner start-up included.

```bash
npm run file-manifest;                         echo "exit $?"
npm run file-manifest -- "$d" extra;           echo "exit $?"
npm run file-manifest -- package.json;         echo "exit $?"
npm run file-manifest -- "$(mktemp -d)";       echo "exit $?"
```

Expect, in order: the usage error, the unrecognized-argument error, the not-a-folder error, the
not-a-git-repository error; each with exit 1 and no `manifests` folder created. From a subfolder, a relative
path resolves from there:

```bash
cd src && npm run file-manifest -- public; cd ..      # manifests/ appears under src/public/
```

## 7. Automated tests and type check

```bash
npx vitest run tests/file-manifest.test.ts
npx tsc --noEmit --strict --target ES2023 --module NodeNext --moduleResolution NodeNext --skipLibCheck devScripts/file-manifest.ts
```

The first runs the unit tests of the pure functions and the throwaway-repository test (the project's global
Vitest setup still starts its embedded PostgreSQL first, so allow a minute). The second is the one-off type
check the script gets because `tsconfig.json` does not cover `devScripts/` (R16). Both must pass before the
feature is done; `npm test` must stay green.

## 8. Clean up

```bash
rm -rf manifests "$d"
```

In this repository `manifests/` is ignored by git, so removing it changes nothing tracked.
