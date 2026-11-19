import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { gzipSync } from "node:zlib";

const ASSET_EXTENSIONS = new Set([".js", ".css", ".svg", ".png", ".jpg", ".ico", ".woff2"]);
const TRANSFORMED_EXTENSIONS = new Set([".js", ".css", ".html"]);
const PAGE_REFERENCE = /(?:href|src)="(\/[\w.-]+\.(?:js|css|svg|png|jpg|ico|woff2))"/g;
const SWITCH = "ENV_OBFUSCATE_ASSETS";

export const LIGHTER_SCRIPTS: ReadonlySet<string> = new Set();

type MinifyHtml = (html: string, options: Record<string, boolean>) => Promise<string>;
type JoinMaps = (maps: string[], loader: () => null) => { toString(): string };

export interface BuildTools {
  esbuild: typeof import("esbuild");
  obfuscator: typeof import("javascript-obfuscator").default;
  minifyHtml: MinifyHtml;
}

export interface BuildOptions {
  sourceDir: string;
  targetDir: string;
  mapsDir: string;
  env: NodeJS.ProcessEnv;
  sourceMaps: boolean;
  log: (line: string) => void;
  loadTools?: () => Promise<BuildTools>;
}

interface TransformedScript {
  code: string;
  map?: string;
}

interface ScriptOptions {
  lighter?: boolean;
  joinMaps?: JoinMaps;
}

const OBFUSCATOR_OPTIONS = {
  compact: true,
  simplify: true,
  identifierNamesGenerator: "mangled",
  target: "browser-no-eval",
  seed: 1,
  stringArray: true,
  stringArrayThreshold: 1,
  stringArrayEncoding: ["base64"],
  stringArrayWrappersCount: 0,
  stringArrayRotate: false,
  stringArrayShuffle: false,
  stringArrayIndexShift: false,
  stringArrayCallsTransform: false,
  splitStrings: false,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  selfDefending: false,
  debugProtection: false,
  disableConsoleOutput: false,
  numbersToExpressions: false,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
  renameGlobals: false,
  renameProperties: false,
  domainLock: []
} as const;

export async function loadBuildTools(): Promise<BuildTools> {
  const esbuild = await import("esbuild");
  const obfuscator = (await import("javascript-obfuscator")).default;
  const { minify } = (await import("html-minifier-terser")) as { minify: MinifyHtml };
  return { esbuild, obfuscator, minifyHtml: minify };
}

export function decoderPrefix(name: string): string {
  return `_${path.basename(name, ".js").replace(/[^A-Za-z0-9]/g, "_")}_`;
}

function checkDecoderPrefixes(scripts: string[]): void {
  const owners = new Map<string, string>();
  for (const name of scripts) {
    const prefix = decoderPrefix(name);
    const owner = owners.get(prefix);
    if (owner !== undefined) throw new Error(`${owner} and ${name} would share the decoder prefix ${prefix}; rename one of them`);
    owners.set(prefix, name);
  }
}

async function loadJoinMaps(): Promise<JoinMaps> {
  return ((await import("@jridgewell/remapping")) as unknown as { default: JoinMaps }).default;
}

async function namingTheFile<T>(name: string, work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw new Error(`${name}: ${(error as Error).message}`);
  }
}

async function transformScriptWithMap(tools: BuildTools, name: string, source: string, options: ScriptOptions = {}): Promise<TransformedScript> {
  if (source === "") return { code: "" };
  const wantsMap = options.joinMaps !== undefined;
  return namingTheFile(name, async () => {
    const shortened = await tools.esbuild.transform(source, {
      loader: "js",
      minify: true,
      target: "es2020",
      legalComments: "none",
      charset: "utf8",
      ...(wantsMap ? { sourcemap: "external" as const, sourcefile: name, sourcesContent: false } : {})
    });
    if (options.lighter) return { code: shortened.code, ...(wantsMap ? { map: shortened.map } : {}) };
    const encoded = tools.obfuscator.obfuscate(shortened.code, {
      ...OBFUSCATOR_OPTIONS,
      identifiersPrefix: decoderPrefix(name),
      stringArrayEncoding: [...OBFUSCATOR_OPTIONS.stringArrayEncoding],
      domainLock: [...OBFUSCATOR_OPTIONS.domainLock],
      ...(wantsMap ? { sourceMap: true, sourceMapMode: "separate" as const, inputFileName: name } : {})
    });
    const code = encoded.getObfuscatedCode();
    if (!options.joinMaps) return { code };
    return { code, map: options.joinMaps([encoded.getSourceMap(), shortened.map], () => null).toString() };
  });
}

export async function transformScript(tools: BuildTools, name: string, source: string, options: { lighter?: boolean } = {}): Promise<string> {
  return (await transformScriptWithMap(tools, name, source, { lighter: options.lighter })).code;
}

export function transformSheet(tools: BuildTools, name: string, source: string): Promise<string> {
  return namingTheFile(name, async () => (await tools.esbuild.transform(source, { loader: "css", minify: true, legalComments: "none", charset: "utf8" })).code);
}

export function transformPage(tools: BuildTools, name: string, source: string): Promise<string> {
  return namingTheFile(name, () =>
    tools.minifyHtml(source, {
      collapseWhitespace: true,
      conservativeCollapse: true,
      removeComments: true,
      keepClosingSlash: true,
      removeAttributeQuotes: false,
      removeOptionalTags: false,
      minifyCSS: false,
      minifyJS: false
    })
  );
}

export function readObfuscateSwitch(env: NodeJS.ProcessEnv): boolean {
  const value = env[SWITCH];
  if (value === undefined || value === "on") return true;
  if (value === "off") return false;
  throw new Error(`${SWITCH} must be "on" or "off" (got "${value}")`);
}

export function checkTransformed(name: string, source: Buffer, built: Buffer): void {
  if (source.length > 0 && source.equals(built)) throw new Error(`${name} was not transformed`);
}

export function checkCompressedSize(before: number, after: number): void {
  if (after > before) throw new Error(`compressed size grew: ${before} → ${after} bytes`);
}

export function checkCompiles(name: string, code: string): void {
  try {
    new vm.Script(code, { filename: name });
  } catch (error) {
    throw new Error(`${name} does not compile: ${(error as Error).message}`);
  }
}

function checkReferences(page: string, html: string, manifest: Record<string, string>): void {
  for (const [, reference] of html.matchAll(PAGE_REFERENCE)) {
    if (!(reference! in manifest)) throw new Error(`${page} refers to ${reference}, which is not a built asset`);
  }
}

function gzipSize(bytes: Buffer): number {
  return gzipSync(bytes, { level: 9 }).length;
}

function topLevelFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

async function loadInstalledTools(loadTools: () => Promise<BuildTools>): Promise<BuildTools> {
  try {
    return await loadTools();
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === "ERR_MODULE_NOT_FOUND" && /Cannot find package '([^']+)'/.exec((error as Error).message);
    if (!missing) throw error;
    throw new Error(`${SWITCH} is on but ${missing[1]} is not installed; run npm ci --include=dev`);
  }
}

async function transformFiles(options: BuildOptions, tools: BuildTools, joinMaps: JoinMaps | undefined): Promise<void> {
  const { targetDir, mapsDir, log } = options;
  let before = 0;
  let after = 0;
  const names = topLevelFiles(targetDir);
  checkDecoderPrefixes(names.filter((name) => path.extname(name) === ".js"));
  for (const name of names) {
    const extension = path.extname(name);
    if (!TRANSFORMED_EXTENSIONS.has(extension)) continue;
    const file = path.join(targetDir, name);
    const source = readFileSync(file);
    const text = source.toString("utf8");
    let built: string;
    if (extension === ".js") {
      const script = await transformScriptWithMap(tools, name, text, { lighter: LIGHTER_SCRIPTS.has(name), joinMaps });
      built = script.code;
      if (script.map !== undefined) {
        mkdirSync(mapsDir, { recursive: true });
        writeFileSync(path.join(mapsDir, `${name}.map`), script.map);
      }
    } else if (extension === ".css") {
      built = await transformSheet(tools, name, text);
    } else {
      built = await transformPage(tools, name, text);
    }
    const bytes = Buffer.from(built, "utf8");
    checkTransformed(name, source, bytes);
    writeFileSync(file, bytes);
    before += gzipSize(source);
    after += gzipSize(bytes);
  }
  checkCompressedSize(before, after);
  const change = before === 0 ? 0 : ((after - before) / before) * 100;
  log("[build] client files: transformed");
  log(`[build] compressed size: ${before} → ${after} bytes (${change.toFixed(1)}%)`);
}

function fingerprintAssets(targetDir: string): Record<string, string> {
  const manifest: Record<string, string> = {};
  for (const name of topLevelFiles(targetDir)) {
    if (!ASSET_EXTENSIONS.has(path.extname(name))) continue;
    const bytes = readFileSync(path.join(targetDir, name));
    const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
    const dir = path.join(targetDir, "assets", hash);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, name), bytes);
    manifest[`/${name}`] = `${hash}/${name}`;
  }
  return manifest;
}

function checkBuiltFiles(targetDir: string, manifest: Record<string, string>): void {
  for (const name of topLevelFiles(targetDir)) {
    const extension = path.extname(name);
    if (extension === ".js") checkCompiles(name, readFileSync(path.join(targetDir, name), "utf8"));
    if (extension === ".html") checkReferences(name, readFileSync(path.join(targetDir, name), "utf8"), manifest);
  }
}

export async function buildAssets(options: BuildOptions): Promise<void> {
  const { sourceDir, targetDir, mapsDir, log } = options;
  const transformed = readObfuscateSwitch(options.env);
  const tools = transformed ? await loadInstalledTools(options.loadTools ?? loadBuildTools) : undefined;
  const joinMaps = transformed && options.sourceMaps ? await loadJoinMaps() : undefined;

  rmSync(mapsDir, { recursive: true, force: true });
  rmSync(targetDir, { recursive: true, force: true });
  cpSync(sourceDir, targetDir, { recursive: true });
  try {
    if (tools) await transformFiles(options, tools, joinMaps);
    else log(`[build] client files: readable (${SWITCH}=off)`);
    const manifest = fingerprintAssets(targetDir);
    checkBuiltFiles(targetDir, manifest);
    writeFileSync(path.join(targetDir, "asset-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    log(`[build] ${Object.keys(manifest).length} fingerprinted asset(s) written to dist/public/assets`);
  } catch (error) {
    rmSync(targetDir, { recursive: true, force: true });
    rmSync(mapsDir, { recursive: true, force: true });
    throw error;
  }
}
