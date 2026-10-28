import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export type FileGroup = "tracked" | "untracked" | "ignored";

export interface ListedFile {
  path: string;
  group: FileGroup;
}

export interface SkippedEntry {
  path: string;
  reason: string;
}

export type Measure =
  | { kind: "text"; lines: number; commentLines?: number }
  | { kind: "binary"; bytes: number };

export interface MeasuredFile {
  path: string;
  group: FileGroup;
  fileType: string;
  topDirectory: string;
  measure: Measure;
}

export type Cell = string | number | undefined;

const EXCLUDED_TOP_LEVEL_FOLDERS = new Set(["node_modules", "node-modules", "manifests"]);
const BINARY_SNIFF_BYTES = 8000;
const NO_EXTENSION_TYPE = "(none)";
const TOTAL_LABEL = "**Total**";

export function isExcludedPath(relativePath: string): boolean {
  const firstSlash = relativePath.indexOf("/");
  return firstSlash > 0 && EXCLUDED_TOP_LEVEL_FOLDERS.has(relativePath.slice(0, firstSlash));
}

export function extensionOf(relativePath: string): string {
  const fileName = relativePath.slice(relativePath.lastIndexOf("/") + 1);
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === fileName.length - 1) return NO_EXTENSION_TYPE;
  return fileName.slice(lastDot).toLowerCase();
}

export function isBinary(bytes: Uint8Array): boolean {
  return bytes.subarray(0, BINARY_SNIFF_BYTES).includes(0);
}

export function countLines(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0;
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let newlines = 0;
  for (let index = buffer.indexOf(10); index !== -1; index = buffer.indexOf(10, index + 1)) newlines++;
  return buffer[buffer.length - 1] === 10 ? newlines : newlines + 1;
}

interface BlockComment {
  open: string;
  close: string;
}

export interface CommentSyntax {
  lineMarkers: string[];
  blocks: BlockComment[];
}

const C_BLOCK: BlockComment = { open: "/*", close: "*/" };
const C_FAMILY: CommentSyntax = { lineMarkers: ["//"], blocks: [C_BLOCK] };
const HASH_ONLY: CommentSyntax = { lineMarkers: ["#"], blocks: [] };

const COMMENT_SYNTAX_BY_EXTENSION = new Map<string, CommentSyntax>();

function registerSyntax(extensions: string[], syntax: CommentSyntax): void {
  for (const extension of extensions) COMMENT_SYNTAX_BY_EXTENSION.set(extension, syntax);
}

registerSyntax([".css"], { lineMarkers: [], blocks: [C_BLOCK] });
registerSyntax(
  [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".scss", ".java", ".c", ".h", ".cpp", ".cs", ".go", ".rs", ".kt", ".swift"],
  C_FAMILY
);
registerSyntax([".sql"], { lineMarkers: ["--"], blocks: [C_BLOCK] });
registerSyntax([".lua"], { lineMarkers: ["--"], blocks: [{ open: "--[[", close: "]]" }] });
registerSyntax([".ps1"], { lineMarkers: ["#"], blocks: [{ open: "<#", close: "#>" }] });
registerSyntax([".py", ".sh", ".rb", ".toml", ".yml", ".yaml"], HASH_ONLY);
registerSyntax([".html", ".xml"], { lineMarkers: [], blocks: [{ open: "<!--", close: "-->" }] });

export function commentSyntaxFor(fileType: string): CommentSyntax | undefined {
  return COMMENT_SYNTAX_BY_EXTENSION.get(fileType);
}

export function countCommentLines(text: string, syntax: CommentSyntax): number {
  const lines = text.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  let closer: string | undefined;
  let commentLines = 0;
  for (const line of lines) {
    let hasCode = false;
    let hasComment = closer !== undefined;
    let position = 0;
    while (position < line.length) {
      if (closer !== undefined) {
        const closerAt = line.indexOf(closer, position);
        position = closerAt === -1 ? line.length : closerAt + closer.length;
        if (closerAt !== -1) closer = undefined;
        continue;
      }
      if (/\s/.test(line.charAt(position))) {
        position++;
        continue;
      }
      const block = syntax.blocks.find((candidate) => line.startsWith(candidate.open, position));
      if (block) {
        hasComment = true;
        closer = block.close;
        position += block.open.length;
        continue;
      }
      if (syntax.lineMarkers.some((marker) => line.startsWith(marker, position))) {
        hasComment = true;
        break;
      }
      hasCode = true;
      position++;
    }
    if (hasComment && !hasCode) commentLines++;
  }
  return commentLines;
}

export function measureFile(bytes: Uint8Array, fileType?: string): Measure {
  if (isBinary(bytes)) return { kind: "binary", bytes: bytes.length };
  const lines = countLines(bytes);
  const syntax = fileType === undefined ? undefined : commentSyntaxFor(fileType);
  if (!syntax) return { kind: "text", lines };
  const text = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("utf8");
  return { kind: "text", lines, commentLines: countCommentLines(text, syntax) };
}

interface Totals {
  files: number;
  lines?: number;
  commentLines?: number;
  bytes?: number;
}

function addToTotals(totals: Totals, measure: Measure): void {
  totals.files++;
  if (measure.kind === "binary") {
    totals.bytes = (totals.bytes ?? 0) + measure.bytes;
    return;
  }
  totals.lines = (totals.lines ?? 0) + measure.lines;
  if (measure.commentLines !== undefined) totals.commentLines = (totals.commentLines ?? 0) + measure.commentLines;
}

function compareText(left: string, right: string): number {
  const leftFolded = left.toLowerCase();
  const rightFolded = right.toLowerCase();
  if (leftFolded !== rightFolded) return leftFolded < rightFolded ? -1 : 1;
  return left < right ? -1 : left > right ? 1 : 0;
}

function totalsRow(rows: Totals[]): Required<Totals> {
  const total = { files: 0, lines: 0, commentLines: 0, bytes: 0 };
  for (const row of rows) {
    total.files += row.files;
    total.lines += row.lines ?? 0;
    total.commentLines += row.commentLines ?? 0;
    total.bytes += row.bytes ?? 0;
  }
  return total;
}

export function renderTable(header: string[], rows: Cell[][]): string {
  const cell = (value: Cell) => (value === undefined ? "" : String(value).replace(/\|/g, "\\|"));
  const lines = [
    `| ${header.join(" | ")} |`,
    `|${header.map(() => "---").join("|")}|`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`)
  ];
  return `${lines.join("\n")}\n`;
}

const TYPE_TABLE_HEADER = ["File type", "Files", "Lines", "Comment lines", "Size (bytes)"];

export function summarizeByType(files: MeasuredFile[]): string {
  const byType = new Map<string, Totals>();
  for (const file of files) {
    const totals = byType.get(file.fileType) ?? { files: 0 };
    addToTotals(totals, file.measure);
    byType.set(file.fileType, totals);
  }
  const rows = [...byType.entries()].sort(([left], [right]) => compareText(left, right));
  const total = totalsRow(rows.map(([, totals]) => totals));
  return renderTable(TYPE_TABLE_HEADER, [
    ...rows.map(([fileType, totals]) => [fileType, totals.files, totals.lines, totals.commentLines, totals.bytes]),
    [TOTAL_LABEL, total.files, total.lines, total.commentLines, total.bytes]
  ]);
}

const STATUS_BY_GROUP: Record<FileGroup, string> = {
  ignored: ".gitignored",
  tracked: "committed",
  untracked: "untracked"
};

const DIRECTORY_TABLE_HEADER = ["Directory", ".gitignored", "File type", "Files", "Lines", "Comment lines", "Size (bytes)"];

export function topDirectoryOf(relativePath: string): string {
  const firstSlash = relativePath.indexOf("/");
  return firstSlash === -1 ? "." : relativePath.slice(0, firstSlash);
}

export function summarizeByDirectory(files: MeasuredFile[]): string {
  const groups = new Map<string, { directory: string; status: string; fileType: string; totals: Totals }>();
  for (const file of files) {
    const status = STATUS_BY_GROUP[file.group];
    const key = [file.topDirectory, status, file.fileType].join("\0");
    const group = groups.get(key) ?? { directory: file.topDirectory, status, fileType: file.fileType, totals: { files: 0 } };
    addToTotals(group.totals, file.measure);
    groups.set(key, group);
  }
  const rows = [...groups.values()].sort(
    (left, right) =>
      compareText(left.directory, right.directory) || compareText(left.status, right.status) || compareText(left.fileType, right.fileType)
  );
  const total = totalsRow(rows.map((row) => row.totals));
  return renderTable(DIRECTORY_TABLE_HEADER, [
    ...rows.map((row) => [row.directory, row.status, row.fileType, row.totals.files, row.totals.lines, row.totals.commentLines, row.totals.bytes]),
    [TOTAL_LABEL, "", "", total.files, total.lines, total.commentLines, total.bytes]
  ]);
}

const FOLDER_REPORTS: ReadonlyArray<{ name: string; prefix: string }> = [
  { name: "dist.md", prefix: "dist/" },
  { name: "public.md", prefix: "dist/public/" },
  { name: "assets.md", prefix: "dist/public/assets/" },
  { name: "src.md", prefix: "src/" },
  { name: "tests.md", prefix: "tests/" }
];

export function buildReports(files: MeasuredFile[]): Map<string, string> {
  const reports = new Map<string, string>();
  reports.set("overall.md", summarizeByType(files));
  reports.set("not-gitignored.md", summarizeByType(files.filter((file) => file.group !== "ignored")));
  reports.set("gitignored.md", summarizeByType(files.filter((file) => file.group === "ignored")));
  reports.set("directories.md", summarizeByDirectory(files));
  for (const { name, prefix } of FOLDER_REPORTS) {
    const inside = files.filter((file) => file.path.startsWith(prefix));
    if (inside.length > 0) reports.set(name, summarizeByType(inside));
  }
  return reports;
}

const GIT_LISTINGS: ReadonlyArray<{ group: FileGroup; args: string[] }> = [
  { group: "tracked", args: ["ls-files", "-z"] },
  { group: "untracked", args: ["ls-files", "-z", "-o", "--exclude-standard"] },
  { group: "ignored", args: ["ls-files", "-z", "-o", "-i", "--exclude-standard"] }
];
const GIT_OUTPUT_LIMIT_BYTES = 1024 * 1024 * 1024;

export function listProjectFiles(projectDir: string): ListedFile[] {
  const listed: ListedFile[] = [];
  for (const { group, args } of GIT_LISTINGS) {
    const output = execFileSync("git", args, {
      cwd: projectDir,
      encoding: "utf8",
      maxBuffer: GIT_OUTPUT_LIMIT_BYTES,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const paths = new Set(output.split("\0").filter((entry) => entry !== ""));
    for (const entry of paths) if (!isExcludedPath(entry)) listed.push({ path: entry, group });
  }
  return listed;
}

const DUPLICATE_SPELLING_REASON = "duplicate (differs only in letter case)";

function swapLetterCase(value: string): string {
  return Array.from(value, (character) => (character === character.toLowerCase() ? character.toUpperCase() : character.toLowerCase())).join("");
}

export function detectCaseInsensitive(paths: string[], pathExists: (relativePath: string) => boolean): boolean {
  const listed = new Set(paths);
  for (const candidate of paths) {
    const swapped = swapLetterCase(candidate);
    if (swapped === candidate || listed.has(swapped) || !pathExists(candidate)) continue;
    return pathExists(swapped);
  }
  return false;
}

export function dedupeAndFold(
  files: ListedFile[],
  caseInsensitive: boolean,
  topLevelNames: string[]
): { files: ListedFile[]; skipped: SkippedEntry[] } {
  if (!caseInsensitive) return { files, skipped: [] };
  const spellingOnDisk = new Map(topLevelNames.map((name) => [name.toLowerCase(), name]));
  const seen = new Set<string>();
  const kept: ListedFile[] = [];
  const skipped: SkippedEntry[] = [];
  for (const file of files) {
    const firstSlash = file.path.indexOf("/");
    const topLevel = firstSlash === -1 ? file.path : file.path.slice(0, firstSlash);
    const rest = firstSlash === -1 ? "" : file.path.slice(firstSlash);
    const folded = `${spellingOnDisk.get(topLevel.toLowerCase()) ?? topLevel}${rest}`;
    const key = folded.toLowerCase();
    if (seen.has(key)) {
      skipped.push({ path: file.path, reason: DUPLICATE_SPELLING_REASON });
      continue;
    }
    seen.add(key);
    kept.push({ ...file, path: folded });
  }
  return { files: kept, skipped };
}

function errorCode(error: unknown): string {
  return (error as NodeJS.ErrnoException).code ?? "unknown";
}

function skipReasonFor(absolutePath: string): string | undefined {
  try {
    const stats = lstatSync(absolutePath);
    if (stats.isSymbolicLink()) return "symlink";
    if (stats.isDirectory()) return "directory";
    return stats.isFile() ? undefined : "not a file";
  } catch (error) {
    const code = errorCode(error);
    return code === "ENOENT" || code === "ENOTDIR" ? "missing" : `unreadable (${code})`;
  }
}

export function readAndMeasure(projectDir: string, listed: ListedFile[]): { measured: MeasuredFile[]; skipped: SkippedEntry[] } {
  const measured: MeasuredFile[] = [];
  const skipped: SkippedEntry[] = [];
  for (const file of listed) {
    const absolutePath = path.join(projectDir, file.path);
    const reason = skipReasonFor(absolutePath);
    if (reason) {
      skipped.push({ path: file.path, reason });
      continue;
    }
    try {
      measured.push({
        path: file.path,
        group: file.group,
        fileType: extensionOf(file.path),
        topDirectory: topDirectoryOf(file.path),
        measure: measureFile(readFileSync(absolutePath), extensionOf(file.path))
      });
    } catch (error) {
      skipped.push({ path: file.path, reason: `unreadable (${errorCode(error)})` });
    }
  }
  return { measured, skipped };
}

export function formatRunFolderName(date: Date): string {
  const twoDigits = (value: number) => String(value).padStart(2, "0");
  const day = `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
  return `${day}_${twoDigits(date.getHours())}-${twoDigits(date.getMinutes())}-${twoDigits(date.getSeconds())}`;
}

export function createRunFolder(projectDir: string, startedAt: Date): string {
  const manifestsFolder = path.join(projectDir, "manifests");
  mkdirSync(manifestsFolder, { recursive: true });
  const baseName = formatRunFolderName(startedAt);
  for (let attempt = 1; ; attempt++) {
    const runFolder = path.join(manifestsFolder, attempt === 1 ? baseName : `${baseName}-${attempt}`);
    try {
      mkdirSync(runFolder);
      return runFolder;
    } catch (error) {
      if (errorCode(error) !== "EEXIST") throw error;
    }
  }
}

export class ManifestWriteError extends Error {}

function writing<T>(target: string, action: () => T): T {
  try {
    return action();
  } catch (error) {
    throw new ManifestWriteError(`ERROR: Could not write ${target}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export interface ManifestResult {
  runFolder: string;
  listed: number;
  counted: number;
  skipped: SkippedEntry[];
  written: string[];
}

export function generateManifest(options: { projectDir: string; startedAt: Date }): ManifestResult {
  const listed = listProjectFiles(options.projectDir);
  const caseInsensitive = detectCaseInsensitive(
    listed.map((file) => file.path),
    (relativePath) => existsSync(path.join(options.projectDir, relativePath))
  );
  const unique = dedupeAndFold(listed, caseInsensitive, readdirSync(options.projectDir));
  const { measured, skipped: unreadable } = readAndMeasure(options.projectDir, unique.files);
  const skipped = [...unique.skipped, ...unreadable];
  const reports = buildReports(measured);
  const runFolder = writing(path.join(options.projectDir, "manifests"), () => createRunFolder(options.projectDir, options.startedAt));
  for (const [name, text] of reports) writing(path.join(runFolder, name), () => writeFileSync(path.join(runFolder, name), text));
  return { runFolder, listed: listed.length, counted: measured.length, skipped, written: [...reports.keys()] };
}

const USAGE = "Usage: npm run file-manifest -- <project>";

export function parseArguments(
  argv: string[],
  initCwd: string | undefined,
  cwd: string
): { projectDir: string } | { error: string } {
  const [project, ...extra] = argv;
  if (project === undefined) return { error: `ERROR: <project> is required. ${USAGE}` };
  if (extra.length > 0) return { error: `ERROR: Unrecognized argument(s): ${extra.join(", ")}. ${USAGE}` };
  return { projectDir: path.resolve(initCwd ?? cwd, project) };
}

export function validateProject(projectDir: string): string | undefined {
  let isFolder = false;
  try {
    isFolder = statSync(projectDir).isDirectory();
  } catch {
    isFolder = false;
  }
  if (!isFolder) return `ERROR: Not a folder: ${projectDir}. ${USAGE}`;
  let insideWorkTree = false;
  try {
    const answer = execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: projectDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    insideWorkTree = answer.trim() === "true";
  } catch {
    insideWorkTree = false;
  }
  return insideWorkTree ? undefined : `ERROR: Not a git repository: ${projectDir}. ${USAGE}`;
}

export interface CliOutput {
  log(message: string): void;
  error(message: string): void;
}

const SKIPPED_PATHS_SHOWN = 5;

export function runCli(
  argv: string[],
  environment: { initCwd?: string; cwd: string },
  output: CliOutput,
  now: () => Date = () => new Date()
): number {
  const parsed = parseArguments(argv, environment.initCwd, environment.cwd);
  if ("error" in parsed) {
    output.error(parsed.error);
    return 1;
  }
  const invalid = validateProject(parsed.projectDir);
  if (invalid) {
    output.error(invalid);
    return 1;
  }
  try {
    const result = generateManifest({ projectDir: parsed.projectDir, startedAt: now() });
    output.log(`Manifest written to ${result.runFolder}`);
    output.log(`Files counted: ${result.counted}`);
    output.log(`Files skipped: ${result.skipped.length}`);
    for (const entry of result.skipped.slice(0, SKIPPED_PATHS_SHOWN)) output.log(`  ${entry.path}: ${entry.reason}`);
    output.log(`Reports: ${result.written.join(", ")}`);
    return 0;
  } catch (error) {
    output.error(error instanceof ManifestWriteError ? error.message : `ERROR: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

export function main(): void {
  process.exit(runCli(process.argv.slice(2), { initCwd: process.env.INIT_CWD, cwd: process.cwd() }, console));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
