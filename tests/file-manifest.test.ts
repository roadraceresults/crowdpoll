import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  commentSyntaxFor,
  countCommentLines,
  countLines,
  dedupeAndFold,
  detectCaseInsensitive,
  extensionOf,
  formatRunFolderName,
  generateManifest,
  isBinary,
  isExcludedPath,
  measureFile,
  parseArguments,
  renderTable,
  runCli,
  summarizeByType,
  type ListedFile,
  type MeasuredFile
} from "../devScripts/file-manifest.js";

const bytesOf = (text: string) => new TextEncoder().encode(text);

function measuredText(path: string, fileType: string, lines: number, commentLines?: number): MeasuredFile {
  return { path, group: "tracked", fileType, topDirectory: ".", measure: { kind: "text", lines, commentLines } };
}

function measuredBinary(path: string, fileType: string, bytes: number): MeasuredFile {
  return { path, group: "tracked", fileType, topDirectory: ".", measure: { kind: "binary", bytes } };
}

describe("isExcludedPath", () => {
  it("excludes anything under a top-level node_modules, node-modules or manifests folder", () => {
    expect(isExcludedPath("node_modules/a/b.js")).toBe(true);
    expect(isExcludedPath("node-modules/a.js")).toBe(true);
    expect(isExcludedPath("manifests/2026-10-08_10-00-00/overall.md")).toBe(true);
  });

  it("keeps lookalike and nested folders, and root files with those names", () => {
    expect(isExcludedPath("node_modules_x/a.js")).toBe(false);
    expect(isExcludedPath("src/node_modules/a.js")).toBe(false);
    expect(isExcludedPath("manifests")).toBe(false);
    expect(isExcludedPath("src/manifests/a.md")).toBe(false);
  });
});

describe("extensionOf", () => {
  it("lower-cases the extension and keeps its dot", () => {
    expect(extensionOf("src/App.TS")).toBe(".ts");
    expect(extensionOf("a.tar.gz")).toBe(".gz");
  });

  it("groups names without an extension, dotfiles and trailing dots as (none)", () => {
    expect(extensionOf("Makefile")).toBe("(none)");
    expect(extensionOf(".gitignore")).toBe("(none)");
    expect(extensionOf("docs/.registry")).toBe("(none)");
    expect(extensionOf("file.")).toBe("(none)");
  });

  it("ignores dots in folder names", () => {
    expect(extensionOf("v1.2/README")).toBe("(none)");
  });
});

describe("isBinary", () => {
  it("is true when a zero byte is within the first 8,000 bytes", () => {
    const bytes = new Uint8Array(9000).fill(65);
    bytes[7999] = 0;
    expect(isBinary(bytes)).toBe(true);
  });

  it("is false when the first zero byte is at index 8,000", () => {
    const bytes = new Uint8Array(9000).fill(65);
    bytes[8000] = 0;
    expect(isBinary(bytes)).toBe(false);
  });

  it("is false for the empty file", () => {
    expect(isBinary(new Uint8Array())).toBe(false);
  });
});

describe("countLines", () => {
  it.each([
    ["a\nb", 2],
    ["a\nb\n", 2],
    ["", 0],
    ["\n", 1],
    ["a\r\nb\r\n", 2],
    ["a\r\nb", 2],
    ["\n\n\n", 3]
  ])("counts %j as %i lines", (text, expected) => {
    expect(countLines(bytesOf(text))).toBe(expected);
  });
});

describe("measureFile", () => {
  it("measures a binary file by its size and a text file by its lines", () => {
    expect(measureFile(new Uint8Array([120, 0, 121]))).toEqual({ kind: "binary", bytes: 3 });
    expect(measureFile(bytesOf("a\nb\n"))).toEqual({ kind: "text", lines: 2 });
  });
});

describe("renderTable", () => {
  it("renders a header, a separator and rows, ending in one newline and no byte-order mark", () => {
    const table = renderTable(["A", "B"], [["x", 1]]);
    expect(table).toBe("| A | B |\n|---|---|\n| x | 1 |\n");
    expect(table.charCodeAt(0)).not.toBe(0xfeff);
  });

  it("leaves undefined cells empty and escapes a literal pipe", () => {
    expect(renderTable(["A", "B", "C"], [["a|b", undefined, 3]])).toBe("| A | B | C |\n|---|---|---|\n| a\\|b |  | 3 |\n");
  });
});

describe("summarizeByType", () => {
  it("sorts types with (none) first and ends in a Total row that sums every column", () => {
    const table = summarizeByType([
      measuredText("b.ts", ".ts", 10, 2),
      measuredText("a.md", ".md", 5),
      measuredBinary("c.jpg", ".jpg", 100),
      measuredText("Makefile", "(none)", 3),
      measuredText("d.ts", ".ts", 4, 1)
    ]);
    expect(table).toBe(
      [
        "| File type | Files | Lines | Comment lines | Size (bytes) |",
        "|---|---|---|---|---|",
        "| (none) | 1 | 3 |  |  |",
        "| .jpg | 1 |  |  | 100 |",
        "| .md | 1 | 5 |  |  |",
        "| .ts | 2 | 14 | 3 |  |",
        "| **Total** | 5 | 22 | 3 | 100 |",
        ""
      ].join("\n")
    );
  });

  it("shows a Total row of zeros when there are no files", () => {
    expect(summarizeByType([])).toBe(
      "| File type | Files | Lines | Comment lines | Size (bytes) |\n|---|---|---|---|---|\n| **Total** | 0 | 0 | 0 | 0 |\n"
    );
  });

  it("shows both a line count and a size for a type that mixes text and binary files", () => {
    const table = summarizeByType([measuredText("a.dat", ".dat", 2), measuredBinary("b.dat", ".dat", 7)]);
    expect(table).toContain("| .dat | 2 | 2 |  | 7 |");
  });

  it("sorts case-insensitively so the order is the same on every machine", () => {
    const table = summarizeByType([measuredText("a.Z", ".z", 1), measuredText("a.a", ".a", 1), measuredText("a.B", ".b", 1)]);
    expect(table.indexOf("| .a |")).toBeLessThan(table.indexOf("| .b |"));
    expect(table.indexOf("| .b |")).toBeLessThan(table.indexOf("| .z |"));
  });
});

function commentLinesIn(extension: string, text: string): number | undefined {
  const syntax = commentSyntaxFor(extension);
  return syntax ? countCommentLines(text, syntax) : undefined;
}

describe("countCommentLines", () => {
  it("counts a three-line block comment with a blank line inside and a //-only line, but not code with a trailing comment", () => {
    const text = "/* one\n\n two */\nlet a = 1; // note\n// only\n";
    expect(commentLinesIn(".ts", text)).toBe(4);
  });

  it("treats a line that closes a block and then has code as code", () => {
    expect(commentLinesIn(".ts", "/* a\n*/ run();\n")).toBe(1);
  });

  it("lets code followed by a block opener open the block for the following lines", () => {
    expect(commentLinesIn(".ts", "run(); /* start\ninside\nend */\n")).toBe(2);
  });

  it("counts a line holding two block comments", () => {
    expect(commentLinesIn(".ts", "/* a */ /* b */\n")).toBe(1);
  });

  it("does not treat // as a comment in CSS, which has only block comments", () => {
    expect(commentLinesIn(".css", "// not a comment\n/* one */\n")).toBe(1);
  });

  it("counts -- and block comments in SQL", () => {
    expect(commentLinesIn(".sql", "-- one\nSELECT 1;\n/* two\nthree */\n")).toBe(3);
  });

  it("reads --[[ as a Lua block opener before -- as a line marker", () => {
    expect(commentLinesIn(".lua", "--[[ one\ntwo ]]\n-- three\nprint(1)\n")).toBe(3);
  });

  it("counts # and <# #> in PowerShell", () => {
    expect(commentLinesIn(".ps1", "# one\n<# two\nthree #>\nGet-Item\n")).toBe(3);
  });

  it("counts a #! first line in a shell script", () => {
    expect(commentLinesIn(".sh", "#!/bin/sh\necho hi\n")).toBe(1);
  });

  it("counts a multi-line HTML comment but not script or style bodies", () => {
    expect(commentLinesIn(".html", "<!-- one\ntwo -->\n<script>\n// code\n</script>\n")).toBe(2);
  });

  it("counts a Python docstring as code", () => {
    expect(commentLinesIn(".py", '"""doc\nmore"""\n# real\n')).toBe(1);
  });

  it("counts an unterminated block through to the last line without a phantom line after the final newline", () => {
    expect(commentLinesIn(".ts", "/* open\nstill open\n")).toBe(2);
  });

  it("returns 0 for a recognised file with no comments", () => {
    expect(commentLinesIn(".ts", "let a = 1;\n")).toBe(0);
  });

  it("has no syntax for Markdown, JSON, SVG, text or unknown extensions", () => {
    for (const extension of [".md", ".json", ".svg", ".txt", ".unknown", "(none)"]) {
      expect(commentSyntaxFor(extension)).toBeUndefined();
    }
  });

  it("counts comments in a CRLF file", () => {
    expect(commentLinesIn(".ts", "// one\r\ncode();\r\n// two\r\n")).toBe(2);
  });
});

describe("measureFile with a file type", () => {
  it("adds a comment count only for a recognised language", () => {
    expect(measureFile(bytesOf("// a\nb\n"), ".ts")).toEqual({ kind: "text", lines: 2, commentLines: 1 });
    expect(measureFile(bytesOf("// a\nb\n"), ".md")).toEqual({ kind: "text", lines: 2 });
    expect(measureFile(new Uint8Array([1, 0, 2]), ".ts")).toEqual({ kind: "binary", bytes: 3 });
  });
});

const temporaryFolders: string[] = [];

afterAll(() => {
  for (const folder of temporaryFolders) rmSync(folder, { recursive: true, force: true });
});

function runGit(directory: string, ...args: string[]): void {
  execFileSync("git", args, { cwd: directory, stdio: "ignore" });
}

function writeInto(directory: string, name: string, content: string | Uint8Array): void {
  mkdirSync(path.dirname(path.join(directory, name)), { recursive: true });
  writeFileSync(path.join(directory, name), content);
}

function buildFixtureRepository(extraIgnoreLines: string[] = []): string {
  const directory = mkdtempSync(path.join(os.tmpdir(), "file-manifest-"));
  temporaryFolders.push(directory);
  runGit(directory, "init", "-q");
  writeInto(directory, "no-newline.txt", "a\nb");
  writeInto(directory, "newline.txt", "a\nb\n");
  writeInto(directory, "empty.txt", "");
  writeInto(directory, "crlf.txt", "a\r\nb\r\n");
  writeInto(directory, "binary.dat", new Uint8Array([120, 0, 121]));
  writeInto(directory, "code.ts", "/* one\n\n two */\nlet a = 1; // note\n// only\n");
  writeInto(directory, ".gitignore", `${["dist/", ...extraIgnoreLines].join("\n")}\n`);
  runGit(directory, "add", "no-newline.txt", "newline.txt", "empty.txt", "crlf.txt", "binary.dat", "code.ts", ".gitignore");
  writeInto(directory, "dist/out.js", "x\n");
  writeInto(directory, "untracked.md", "u\n");
  writeInto(directory, "node_modules/skip.js", "x\n");
  writeInto(directory, "manifests/old/overall.md", "old\n");
  return directory;
}

function buildMinimalRepository(): string {
  const directory = mkdtempSync(path.join(os.tmpdir(), "file-manifest-"));
  temporaryFolders.push(directory);
  runGit(directory, "init", "-q");
  writeInto(directory, "only.txt", "one\n");
  runGit(directory, "add", "only.txt");
  return directory;
}

const startedAt = new Date(2026, 9, 8, 10, 11, 12);

function readReport(runFolder: string, name: string): string {
  return readFileSync(path.join(runFolder, name), "utf8");
}

function totalRow(table: string): string[] {
  const lastRow = table.trimEnd().split("\n").pop() ?? "";
  return lastRow.split("|").slice(1, -1).map((cell) => cell.trim());
}

describe("generateManifest: the four always-written reports", () => {
  it("writes overall.md, not-gitignored.md, gitignored.md and directories.md into manifests/<run>/", () => {
    const directory = buildFixtureRepository();
    const result = generateManifest({ projectDir: directory, startedAt });
    expect(path.dirname(result.runFolder)).toBe(path.join(directory, "manifests"));
    expect(path.basename(result.runFolder)).toBe("2026-10-08_10-11-12");
    for (const name of ["overall.md", "not-gitignored.md", "gitignored.md", "directories.md"]) {
      expect(readdirSync(result.runFolder)).toContain(name);
    }
  });

  it("counts everything by file type, excluding node_modules and manifests", () => {
    const result = generateManifest({ projectDir: buildFixtureRepository(), startedAt });
    expect(readReport(result.runFolder, "overall.md")).toBe(
      [
        "| File type | Files | Lines | Comment lines | Size (bytes) |",
        "|---|---|---|---|---|",
        "| (none) | 1 | 1 |  |  |",
        "| .dat | 1 |  |  | 3 |",
        "| .js | 1 | 1 | 0 |  |",
        "| .md | 1 | 1 |  |  |",
        "| .ts | 1 | 5 | 4 |  |",
        "| .txt | 4 | 6 |  |  |",
        "| **Total** | 9 | 14 | 4 | 3 |",
        ""
      ].join("\n")
    );
  });

  it("splits files not ignored from files ignored", () => {
    const result = generateManifest({ projectDir: buildFixtureRepository(), startedAt });
    expect(totalRow(readReport(result.runFolder, "not-gitignored.md"))).toEqual(["**Total**", "8", "13", "4", "3"]);
    expect(readReport(result.runFolder, "gitignored.md")).toBe(
      [
        "| File type | Files | Lines | Comment lines | Size (bytes) |",
        "|---|---|---|---|---|",
        "| .js | 1 | 1 | 0 |  |",
        "| **Total** | 1 | 1 | 0 | 0 |",
        ""
      ].join("\n")
    );
  });

  it("groups by top-level folder and status, with root files under . and committed, untracked and .gitignored kept apart", () => {
    const result = generateManifest({ projectDir: buildFixtureRepository(), startedAt });
    expect(readReport(result.runFolder, "directories.md")).toBe(
      [
        "| Directory | .gitignored | File type | Files | Lines | Comment lines | Size (bytes) |",
        "|---|---|---|---|---|---|---|",
        "| . | committed | (none) | 1 | 1 |  |  |",
        "| . | committed | .dat | 1 |  |  | 3 |",
        "| . | committed | .ts | 1 | 5 | 4 |  |",
        "| . | committed | .txt | 4 | 6 |  |  |",
        "| . | untracked | .md | 1 | 1 |  |  |",
        "| dist | .gitignored | .js | 1 | 1 | 0 |  |",
        "| **Total** |  |  | 9 | 14 | 4 | 3 |",
        ""
      ].join("\n")
    );
  });

  it("satisfies the totals identities", () => {
    const result = generateManifest({ projectDir: buildFixtureRepository(), startedAt });
    const overall = totalRow(readReport(result.runFolder, "overall.md"));
    const notIgnored = totalRow(readReport(result.runFolder, "not-gitignored.md"));
    const ignored = totalRow(readReport(result.runFolder, "gitignored.md"));
    expect(Number(overall[1])).toBe(Number(notIgnored[1]) + Number(ignored[1]));
    expect(totalRow(readReport(result.runFolder, "directories.md")).slice(3)).toEqual(overall.slice(1));
    expect(result.counted + result.skipped.length).toBe(result.listed);
  });

  it("still writes a report whose set is empty, as a header row and a Total row of zeros", () => {
    const result = generateManifest({ projectDir: buildMinimalRepository(), startedAt });
    expect(readReport(result.runFolder, "gitignored.md")).toBe(
      "| File type | Files | Lines | Comment lines | Size (bytes) |\n|---|---|---|---|---|\n| **Total** | 0 | 0 | 0 | 0 |\n"
    );
  });
});

function buildFolderRepository(options: { dist?: string[]; emptySource?: boolean } = {}): string {
  const directory = mkdtempSync(path.join(os.tmpdir(), "file-manifest-"));
  temporaryFolders.push(directory);
  runGit(directory, "init", "-q");
  writeInto(directory, ".gitignore", "dist/\n");
  const tracked = [".gitignore"];
  if (options.emptySource) {
    mkdirSync(path.join(directory, "src"));
  } else {
    writeInto(directory, "src/a.ts", "// a\nlet a = 1;\n");
    writeInto(directory, "src/b.ts", "let b = 2;\n");
    tracked.push("src/a.ts", "src/b.ts");
  }
  writeInto(directory, "tests/a.test.ts", "it();\n");
  tracked.push("tests/a.test.ts");
  runGit(directory, "add", ...tracked);
  for (const name of options.dist ?? []) writeInto(directory, name, "x\n");
  return directory;
}

function filesTotal(table: string): number {
  return Number(totalRow(table)[1]);
}

function sumOfRows(table: string, column: number): number {
  const rows = table.trimEnd().split("\n").slice(2, -1);
  return rows.reduce((sum, row) => sum + Number(row.split("|")[column]?.trim() || 0), 0);
}

describe("generateManifest: the folder reports", () => {
  it("writes src.md and tests.md, and no dist reports, when there is no dist folder", () => {
    const result = generateManifest({ projectDir: buildFolderRepository(), startedAt });
    const names = readdirSync(result.runFolder);
    expect(names).toEqual(expect.arrayContaining(["src.md", "tests.md"]));
    for (const absent of ["dist.md", "public.md", "assets.md"]) expect(names).not.toContain(absent);
    expect(filesTotal(readReport(result.runFolder, "src.md"))).toBe(2);
    expect(filesTotal(readReport(result.runFolder, "tests.md"))).toBe(1);
  });

  it("writes dist.md, public.md and assets.md from the ignored build output", () => {
    const projectDir = buildFolderRepository({ dist: ["dist/y.js", "dist/public/index.html", "dist/public/assets/x.js"] });
    const result = generateManifest({ projectDir, startedAt });
    expect(filesTotal(readReport(result.runFolder, "dist.md"))).toBe(3);
    expect(filesTotal(readReport(result.runFolder, "public.md"))).toBe(2);
    expect(filesTotal(readReport(result.runFolder, "assets.md"))).toBe(1);
    expect(result.written).toEqual(
      expect.arrayContaining(["overall.md", "not-gitignored.md", "gitignored.md", "directories.md", "dist.md", "public.md", "assets.md", "src.md", "tests.md"])
    );
  });

  it("writes dist.md only when dist has no public folder", () => {
    const result = generateManifest({ projectDir: buildFolderRepository({ dist: ["dist/y.js"] }), startedAt });
    const names = readdirSync(result.runFolder);
    expect(names).toContain("dist.md");
    expect(names).not.toContain("public.md");
    expect(names).not.toContain("assets.md");
  });

  it("writes no report for a folder that holds no counted file", () => {
    const result = generateManifest({ projectDir: buildFolderRepository({ emptySource: true }), startedAt });
    expect(readdirSync(result.runFolder)).not.toContain("src.md");
  });

  it("ends every folder report in a Total row equal to the sum of the rows above it", () => {
    const result = generateManifest({ projectDir: buildFolderRepository({ dist: ["dist/y.js", "dist/public/index.html"] }), startedAt });
    for (const name of ["src.md", "tests.md", "dist.md", "public.md"]) {
      const table = readReport(result.runFolder, name);
      expect(Number(totalRow(table)[1])).toBe(sumOfRows(table, 2));
      expect(Number(totalRow(table)[2])).toBe(sumOfRows(table, 3));
    }
  });
});

const DUPLICATE_REASON = "duplicate (differs only in letter case)";

function caseInsensitiveDisk(...existing: string[]): (relativePath: string) => boolean {
  const folded = new Set(existing.map((entry) => entry.toLowerCase()));
  return (relativePath) => folded.has(relativePath.toLowerCase());
}

function caseSensitiveDisk(...existing: string[]): (relativePath: string) => boolean {
  const exact = new Set(existing);
  return (relativePath) => exact.has(relativePath);
}

describe("detectCaseInsensitive", () => {
  it("is true when a case-swapped spelling of a listed file that is not itself listed exists", () => {
    const paths = ["src/A.ts"];
    expect(detectCaseInsensitive(paths, caseInsensitiveDisk(...paths))).toBe(true);
  });

  it("is false when the case-swapped spelling does not exist", () => {
    const paths = ["src/A.ts"];
    expect(detectCaseInsensitive(paths, caseSensitiveDisk(...paths))).toBe(false);
  });

  it("is false with no files, and with names that have no letters", () => {
    expect(detectCaseInsensitive([], caseInsensitiveDisk())).toBe(false);
    expect(detectCaseInsensitive(["1/2.3"], caseInsensitiveDisk("1/2.3"))).toBe(false);
  });

  it("skips a path whose swapped spelling is itself listed, and tests the next one", () => {
    const paths = ["a/x.md", "A/X.MD", "b/y.md"];
    expect(detectCaseInsensitive(paths, caseInsensitiveDisk(...paths))).toBe(true);
  });

  it("skips a listed path that is missing from disk", () => {
    expect(detectCaseInsensitive(["gone.md", "there.md"], caseInsensitiveDisk("there.md"))).toBe(true);
  });
});

describe("dedupeAndFold", () => {
  const listed = (path: string, group: ListedFile["group"] = "tracked"): ListedFile => ({ path, group });

  it("keeps the first spelling, skips the other with the duplicate reason, and takes the top-level spelling from the folder listing", () => {
    const result = dedupeAndFold([listed("docs/a.md"), listed("Docs/a.md"), listed("src/x.ts")], true, ["Docs", "src"]);
    expect(result.files.map((file) => file.path)).toEqual(["Docs/a.md", "src/x.ts"]);
    expect(result.skipped).toEqual([{ path: "Docs/a.md", reason: DUPLICATE_REASON }]);
  });

  it("keeps the earlier group when a file is listed as both tracked and ignored under two spellings", () => {
    const result = dedupeAndFold([listed("a/b.md", "tracked"), listed("A/B.md", "ignored")], true, ["a"]);
    expect(result.files).toEqual([{ path: "a/b.md", group: "tracked" }]);
    expect(result.skipped).toHaveLength(1);
  });

  it("folds root file names too", () => {
    const result = dedupeAndFold([listed("readme.md"), listed("README.md")], true, ["README.md"]);
    expect(result.files.map((file) => file.path)).toEqual(["README.md"]);
    expect(result.skipped).toHaveLength(1);
  });

  it("changes nothing on a case-sensitive file system", () => {
    const files = [listed("docs/a.md"), listed("Docs/a.md")];
    expect(dedupeAndFold(files, false, ["Docs", "docs"])).toEqual({ files, skipped: [] });
  });

  it("leaves a top-level name that is not in the folder listing as it was listed", () => {
    const result = dedupeAndFold([listed("gone/a.md")], true, ["src"]);
    expect(result.files.map((file) => file.path)).toEqual(["gone/a.md"]);
  });
});

describe("generateManifest: entries that cannot be counted", () => {
  function buildSkippableRepository(): { directory: string; symlinkCreated: boolean } {
    const directory = buildFixtureRepository();
    writeInto(directory, "gone.txt", "x\n");
    writeInto(directory, "swapped.txt", "x\n");
    runGit(directory, "add", "gone.txt", "swapped.txt");
    rmSync(path.join(directory, "gone.txt"));
    rmSync(path.join(directory, "swapped.txt"));
    writeInto(directory, "swapped.txt/inner.txt", "y\n");
    let symlinkCreated = true;
    try {
      symlinkSync("newline.txt", path.join(directory, "link.txt"));
      runGit(directory, "add", "link.txt");
    } catch {
      symlinkCreated = false;
    }
    return { directory, symlinkCreated };
  }

  it("skips a missing file, a file replaced by a folder and a symlink, with a reason for each", () => {
    const { directory, symlinkCreated } = buildSkippableRepository();
    const result = generateManifest({ projectDir: directory, startedAt });
    expect(result.skipped).toEqual(
      expect.arrayContaining([
        { path: "gone.txt", reason: "missing" },
        { path: "swapped.txt", reason: "directory" }
      ])
    );
    if (symlinkCreated) expect(result.skipped).toContainEqual({ path: "link.txt", reason: "symlink" });
  });

  it("keeps counted plus skipped equal to listed, and writes none of it into a report", () => {
    const { directory } = buildSkippableRepository();
    const result = generateManifest({ projectDir: directory, startedAt });
    expect(result.counted + result.skipped.length).toBe(result.listed);
    for (const name of result.written) {
      const report = readReport(result.runFolder, name);
      expect(report).not.toContain("gone.txt");
      expect(report).not.toContain("missing");
    }
  });
});

function snapshotOutsideManifests(directory: string): string[] {
  const entries: string[] = [];
  const walk = (relativeFolder: string) => {
    for (const entry of readdirSync(path.join(directory, relativeFolder), { withFileTypes: true })) {
      const relativePath = path.posix.join(relativeFolder, entry.name);
      if (relativePath === "manifests" || relativePath === ".git") continue;
      if (entry.isDirectory()) walk(relativePath);
      else {
        const stats = statSync(path.join(directory, relativePath));
        entries.push(`${relativePath}:${stats.size}:${stats.mtimeMs}`);
      }
    }
  };
  walk("");
  return entries.sort();
}

describe("run folders", () => {
  it("names the folder for the local start time as YYYY-MM-DD_HH-mm-ss", () => {
    expect(formatRunFolderName(new Date(2026, 0, 2, 3, 4, 5))).toBe("2026-01-02_03-04-05");
    expect(formatRunFolderName(new Date(2026, 11, 31, 23, 59, 59))).toBe("2026-12-31_23-59-59");
  });

  it("adds -2 for a second run in the same second and leaves the first untouched", () => {
    const directory = buildMinimalRepository();
    const first = generateManifest({ projectDir: directory, startedAt });
    const firstReports = readdirSync(first.runFolder).map((name) => readReport(first.runFolder, name));
    const second = generateManifest({ projectDir: directory, startedAt });
    expect(path.basename(first.runFolder)).toBe("2026-10-08_10-11-12");
    expect(path.basename(second.runFolder)).toBe("2026-10-08_10-11-12-2");
    expect(readdirSync(first.runFolder).map((name) => readReport(first.runFolder, name))).toEqual(firstReports);
  });

  it("creates -3 when the base folder and -2 already exist", () => {
    const directory = buildMinimalRepository();
    mkdirSync(path.join(directory, "manifests", "2026-10-08_10-11-12"), { recursive: true });
    mkdirSync(path.join(directory, "manifests", "2026-10-08_10-11-12-2"));
    const result = generateManifest({ projectDir: directory, startedAt });
    expect(path.basename(result.runFolder)).toBe("2026-10-08_10-11-12-3");
  });

  it("creates nothing outside manifests, and leaves the project clean when its own ignore file lists /manifests/", () => {
    const directory = buildFixtureRepository(["/manifests/"]);
    const before = snapshotOutsideManifests(directory);
    generateManifest({ projectDir: directory, startedAt });
    expect(snapshotOutsideManifests(directory)).toEqual(before);
    const status = execFileSync("git", ["status", "--porcelain"], { cwd: directory, encoding: "utf8" });
    expect(status).not.toContain("manifests/");
  });
});

const USAGE_LINE = "Usage: npm run file-manifest -- <project>";

function collectOutput(): { log: (message: string) => void; error: (message: string) => void; logged: string[]; errors: string[] } {
  const logged: string[] = [];
  const errors: string[] = [];
  return { log: (message) => logged.push(message), error: (message) => errors.push(message), logged, errors };
}

function emptyTemporaryFolder(): string {
  const directory = mkdtempSync(path.join(os.tmpdir(), "file-manifest-"));
  temporaryFolders.push(directory);
  return directory;
}

describe("parseArguments", () => {
  it("requires exactly one argument and names the extras otherwise", () => {
    expect(parseArguments([], undefined, "/work")).toEqual({ error: `ERROR: <project> is required. ${USAGE_LINE}` });
    expect(parseArguments(["a", "b", "c"], undefined, "/work")).toEqual({
      error: `ERROR: Unrecognized argument(s): b, c. ${USAGE_LINE}`
    });
  });

  it("resolves a relative path from INIT_CWD, not from the working folder", () => {
    expect(parseArguments(["proj"], "/typed/here", "/package/root")).toEqual({ projectDir: path.resolve("/typed/here", "proj") });
  });

  it("falls back to the working folder without INIT_CWD, and keeps an absolute path", () => {
    expect(parseArguments(["proj"], undefined, "/work")).toEqual({ projectDir: path.resolve("/work", "proj") });
    expect(parseArguments([path.resolve("/abs/proj")], "/typed/here", "/work")).toEqual({ projectDir: path.resolve("/abs/proj") });
  });
});

describe("runCli", () => {
  it("writes the manifest and prints the folder, counts, skipped paths and report names", () => {
    const directory = buildFixtureRepository();
    const output = collectOutput();
    const code = runCli([directory], { cwd: "/elsewhere" }, output, () => startedAt);
    expect(code).toBe(0);
    expect(output.logged[0]).toBe(`Manifest written to ${path.join(directory, "manifests", "2026-10-08_10-11-12")}`);
    expect(output.logged).toContain("Files counted: 9");
    expect(output.logged).toContain("Files skipped: 0");
    expect(output.logged.at(-1)).toMatch(/^Reports: overall\.md, not-gitignored\.md, gitignored\.md, directories\.md/);
    expect(output.errors).toEqual([]);
  });

  it("fails with the usage message and writes nothing when the argument is missing", () => {
    const working = emptyTemporaryFolder();
    const output = collectOutput();
    expect(runCli([], { cwd: working }, output)).toBe(1);
    expect(output.errors).toEqual([`ERROR: <project> is required. ${USAGE_LINE}`]);
    expect(readdirSync(working)).toEqual([]);
  });

  it("fails when the path is a file", () => {
    const working = emptyTemporaryFolder();
    writeInto(working, "package.json", "{}");
    const output = collectOutput();
    expect(runCli(["package.json"], { cwd: working, initCwd: working }, output)).toBe(1);
    expect(output.errors).toEqual([`ERROR: Not a folder: ${path.join(working, "package.json")}. ${USAGE_LINE}`]);
    expect(readdirSync(working)).toEqual(["package.json"]);
  });

  it("fails when the folder is not a git work tree", () => {
    const working = emptyTemporaryFolder();
    const output = collectOutput();
    expect(runCli([working], { cwd: working }, output)).toBe(1);
    expect(output.errors).toEqual([`ERROR: Not a git repository: ${working}. ${USAGE_LINE}`]);
    expect(readdirSync(working)).toEqual([]);
  });

  it("fails on extra arguments without writing", () => {
    const directory = buildMinimalRepository();
    const output = collectOutput();
    expect(runCli([directory, "extra"], { cwd: directory }, output)).toBe(1);
    expect(output.errors).toEqual([`ERROR: Unrecognized argument(s): extra. ${USAGE_LINE}`]);
    expect(readdirSync(directory)).not.toContain("manifests");
  });

  it("treats a subfolder of a repository as the project, with its own manifests folder and top-level names", () => {
    const directory = buildMinimalRepository();
    writeInto(directory, "sub/inner/a.ts", "// a\n");
    runGit(directory, "add", "sub/inner/a.ts");
    const output = collectOutput();
    expect(runCli(["sub"], { cwd: "/package/root", initCwd: directory }, output, () => startedAt)).toBe(0);
    expect(output.logged).toContain("Files counted: 1");
    expect(readdirSync(path.join(directory, "sub", "manifests"))).toEqual(["2026-10-08_10-11-12"]);
    expect(readdirSync(directory)).not.toContain("manifests");
    expect(readReport(path.join(directory, "sub", "manifests", "2026-10-08_10-11-12"), "directories.md")).toContain("| inner | committed | .ts | 1 | 1 | 1 |  |");
  });

  it("names the path and the system message when the manifests folder cannot be created", () => {
    const directory = buildMinimalRepository();
    writeInto(directory, "manifests", "a file in the way");
    const output = collectOutput();
    expect(runCli([directory], { cwd: directory }, output, () => startedAt)).toBe(1);
    expect(output.errors).toHaveLength(1);
    expect(output.errors[0]).toMatch(new RegExp(`^ERROR: Could not write ${path.join(directory, "manifests").replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")}: `));
  });
});
