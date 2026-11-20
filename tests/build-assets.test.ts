import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { SourceMap } from "node:module";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import * as cheerio from "cheerio";
import * as esbuild from "esbuild";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import {
  buildAssets,
  checkCompiles,
  checkCompressedSize,
  checkTransformed,
  loadBuildTools,
  transformScript,
  type BuildTools
} from "../devScripts/assetTransform.js";
import { createAssetServing } from "../src/routes/assets.js";

const FIXTURE = path.resolve("tests/fixtures/build-assets");
const SITE = path.resolve("src/public");
const PAGE_REFERENCE = /(href|src)="(\/[\w.-]+\.(?:js|css|svg|png|jpg|ico|woff2))"/g;
const SWITCH_MESSAGE = (value: string) => `ENV_OBFUSCATE_ASSETS must be "on" or "off" (got "${value}")`;

interface BuildRequest {
  env?: Record<string, string>;
  sourceMaps?: boolean;
  sourceDir?: string;
  loadTools?: () => Promise<BuildTools>;
}

interface Built {
  targetDir: string;
  mapsDir: string;
  lines: string[];
}

const perTest: string[] = [];
const perFile: string[] = [];

function temporaryDir(kept: string[] = perTest): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "build-assets-"));
  kept.push(dir);
  return dir;
}

function removeAll(dirs: string[]): void {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
}

afterEach(() => removeAll(perTest));
afterAll(() => removeAll(perFile));

async function buildInto(root: string, request: BuildRequest = {}): Promise<Built> {
  const targetDir = path.join(root, "public");
  const mapsDir = path.join(root, "maps");
  const lines: string[] = [];
  await buildAssets({
    sourceDir: request.sourceDir ?? FIXTURE,
    targetDir,
    mapsDir,
    env: request.env ?? {},
    sourceMaps: request.sourceMaps ?? false,
    log: (line) => lines.push(line),
    ...(request.loadTools ? { loadTools: request.loadTools } : {})
  });
  return { targetDir, mapsDir, lines };
}

function build(request: BuildRequest = {}): Promise<Built> {
  return buildInto(temporaryDir(), request);
}

async function rejectedBuild(request: BuildRequest): Promise<{ message: string; targetDir: string }> {
  const root = temporaryDir();
  const error = await buildInto(root, request).then(
    () => undefined,
    (reason: Error) => reason
  );
  if (!error) throw new Error("the build was expected to be rejected");
  return { message: error.message, targetDir: path.join(root, "public") };
}

function once<T>(make: () => Promise<T>): () => Promise<T> {
  let result: Promise<T> | undefined;
  return () => (result ??= make());
}

const fixtureBuild = once(() => buildInto(temporaryDir(perFile)));
const siteBuild = once(() => buildInto(temporaryDir(perFile), { sourceDir: SITE }));

function fixtureCopy(changes: Record<string, string>): string {
  const dir = path.join(temporaryDir(), "source");
  cpSync(FIXTURE, dir, { recursive: true });
  for (const [name, content] of Object.entries(changes)) writeFileSync(path.join(dir, name), content);
  return dir;
}

function filesUnder(dir: string, prefix = ""): string[] {
  return readdirSync(path.join(dir, prefix), { withFileTypes: true })
    .flatMap((entry) => {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      return entry.isDirectory() ? filesUnder(dir, relative) : [relative];
    })
    .sort();
}

function topLevel(dir: string, extension: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && path.extname(entry.name) === extension)
    .map((entry) => entry.name)
    .sort();
}

const text = (dir: string, name: string) => readFileSync(path.join(dir, name), "utf8");
const bytes = (dir: string, name: string) => readFileSync(path.join(dir, name));
const references = (html: string) => Array.from(html.matchAll(PAGE_REFERENCE), (match) => match[0]);
const foldedText = (html: string) => cheerio.load(html).root().text().replace(/\s+/g, " ").trim();

function mediaConditions(css: string): string[] {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const conditions = Array.from(withoutComments.matchAll(/@media([^{]+)\{/g), (match) => match[1]!.replace(/\s+/g, ""));
  return Array.from(new Set(conditions)).sort();
}

function expectTwoCopies(targetDir: string): void {
  const manifest: Record<string, string> = JSON.parse(text(targetDir, "asset-manifest.json"));
  expect(Object.keys(manifest).length).toBeGreaterThan(0);
  for (const [reference, fingerprinted] of Object.entries(manifest)) {
    const plain = bytes(targetDir, reference.slice(1));
    const copy = bytes(path.join(targetDir, "assets"), fingerprinted);
    expect(copy.equals(plain), reference).toBe(true);
    expect(fingerprinted, reference).toBe(`${createHash("sha256").update(plain).digest("hex").slice(0, 16)}/${reference.slice(1)}`);
  }
}

function expectSameFiles(one: string, other: string): void {
  const names = filesUnder(one);
  expect(filesUnder(other)).toEqual(names);
  for (const name of names) expect(bytes(other, name).equals(bytes(one, name)), name).toBe(true);
}

it("writes the same bytes to the plain and the fingerprinted address", async () => {
  const { targetDir } = await build({ env: { ENV_OBFUSCATE_ASSETS: "off" } });
  expectTwoCopies(targetDir);
});

describe("a transformed build", () => {
  it("says so", async () => {
    const { lines } = await fixtureBuild();
    expect(lines).toContain("[build] client files: transformed");
  });

  it("gives a script without comments, readable strings or inner names, that still publishes its names", async () => {
    const { targetDir } = await fixtureBuild();
    const built = text(targetDir, "sample.js");
    expect(built).not.toContain("This block comment must not survive");
    expect(built).not.toContain("this line comment must not survive");
    expect(built).toContain("sharedHelper");
    expect(built).not.toContain("localCounter");
    expect(built).not.toContain("A readable message for the visitor");
    expect(built).not.toContain("another-known-string");
    for (const forbidden of ["eval(", "new Function", "Function("]) expect(built).not.toContain(forbidden);
    expect(() => new vm.Script(built, { filename: "sample.js" })).not.toThrow();

    const context: { window: { Sample?: { greet: (visitor: object) => { line: string; marker: string; letters: number; polite: boolean } } } } = { window: {} };
    vm.runInNewContext(built, context);
    expect(typeof context.window.Sample?.greet).toBe("function");
    expect(context.window.Sample!.greet({ name: "Ada", town: "Leeds" })).toEqual({
      line: "A readable message for the visitor: Ada of Leeds",
      letters: 10,
      marker: "another-known-string",
      polite: true
    });
  });

  it("gives scripts that keep their own strings when they share a page", async () => {
    const tools = await loadBuildTools();
    const sample = await transformScript(tools, "sample.js", text(FIXTURE, "sample.js"));
    const other = await transformScript(tools, "other.js", 'function otherLine() { return ["a line", "from the other script"].join(" "); }\nwindow.Other = { otherLine };\n');
    const context: { window: { Sample?: { farewell: (visitor: object) => string }; Other?: { otherLine: () => string } } } = { window: {} };
    vm.createContext(context);
    vm.runInContext(sample, context);
    vm.runInContext(other, context);
    expect(context.window.Other!.otherLine()).toBe("a line from the other script");
    expect(context.window.Sample!.farewell({ name: "Ada", town: "Leeds" })).toBe(
      "Thank you for calling, and a safe journey home. The door at the end of the corridor is the way out. Ada of Leeds"
    );
  });

  it("refuses two scripts whose names would give their decoders the same prefix", async () => {
    const { message, targetDir } = await rejectedBuild({ sourceDir: fixtureCopy({ "a-b.js": "window.A = 'first';\n", "a_b.js": "window.B = 'second';\n" }) });
    expect(message).toContain("a-b.js");
    expect(message).toContain("a_b.js");
    expect(existsSync(targetDir)).toBe(false);
  });

  it("gives a sheet without comments that keeps its selectors and breakpoints", async () => {
    const { targetDir } = await fixtureBuild();
    const built = text(targetDir, "sample.css");
    expect(built).not.toContain("must not survive");
    expect(built).toContain(".sample-card");
    expect(built).toContain("#sample-id");
    expect(mediaConditions(built)).toEqual(["(max-width:640px)", "notalland(max-width:640px)"]);
  });

  it("gives a page without comments that keeps its markers, references and text", async () => {
    const { targetDir } = await fixtureBuild();
    const source = text(FIXTURE, "sample.html");
    const built = text(targetDir, "sample.html");
    expect(built).not.toContain("must not survive");
    expect(built).toContain("{{PRIVACY_UPDATED}}");
    expect(built).toContain("{{TERMS_UPDATED}}");
    expect(built).toContain("</head>");
    expect(references(built)).toEqual(references(source));
    expect(references(built)).toHaveLength(3);
    expect(foldedText(built)).toBe(foldedText(source));
  });

  it("leaves images and vendor files alone", async () => {
    const { targetDir } = await fixtureBuild();
    expect(bytes(targetDir, "pixel.png").equals(bytes(FIXTURE, "pixel.png"))).toBe(true);
    expect(bytes(targetDir, "vendor/lib.min.js").equals(bytes(FIXTURE, "vendor/lib.min.js"))).toBe(true);
  });

  it("writes the transformed bytes to both addresses", async () => {
    const { targetDir } = await fixtureBuild();
    expectTwoCopies(targetDir);
  });

  it("leaves nothing readable and no map in the built folder", async () => {
    const { targetDir } = await fixtureBuild();
    for (const name of filesUnder(targetDir)) {
      expect(name.endsWith(".map"), name).toBe(false);
      expect(text(targetDir, name), name).not.toContain("sourceMappingURL");
    }
    for (const name of ["sample.js", "sample.css", "sample.html"]) {
      expect(bytes(targetDir, name).equals(bytes(FIXTURE, name)), name).toBe(false);
    }
    expect(bytes(targetDir, "empty.js")).toHaveLength(0);
  });
});

describe("the site's own files", () => {
  it("are all transformed, and the scripts compile and keep their top-level names", async () => {
    const { targetDir } = await siteBuild();
    for (const extension of [".js", ".css", ".html"]) {
      for (const name of topLevel(SITE, extension)) {
        const source = bytes(SITE, name);
        if (source.length > 0) expect(bytes(targetDir, name).equals(source), name).toBe(false);
      }
    }
    for (const name of topLevel(SITE, ".js")) {
      expect(() => new vm.Script(text(targetDir, name), { filename: name }), name).not.toThrow();
    }
    const pollCard = text(targetDir, "pollCard.js");
    expect(pollCard).toContain("essentialChoices");
    expect(pollCard).toContain("fittingChoices");
  });

  it("leave vendor, oauth and font files alone", async () => {
    const { targetDir } = await siteBuild();
    for (const folder of ["vendor", "oauth", "fonts"]) {
      const names = filesUnder(SITE, folder);
      expect(names.length, folder).toBeGreaterThan(0);
      for (const name of names) expect(bytes(targetDir, name).equals(bytes(SITE, name)), name).toBe(true);
    }
  });

  it("keep every sheet's breakpoints", async () => {
    const { targetDir } = await siteBuild();
    for (const name of topLevel(SITE, ".css")) {
      expect(mediaConditions(text(targetDir, name)), name).toEqual(mediaConditions(text(SITE, name)));
    }
  });

  it("keep every page's markers, head and references", async () => {
    const { targetDir } = await siteBuild();
    for (const name of topLevel(SITE, ".html")) {
      const source = text(SITE, name);
      const built = text(targetDir, name);
      for (const marker of ["{{PRIVACY_UPDATED}}", "{{TERMS_UPDATED}}"]) {
        expect(built.split(marker).length, `${name} ${marker}`).toBe(source.split(marker).length);
      }
      expect(built, name).toContain("</head>");
      expect(references(built), name).toEqual(references(source));
    }
  });

  it("are served with their dates filled in and their references fingerprinted", async () => {
    const { targetDir } = await siteBuild();
    const serving = createAssetServing(targetDir, { spaces: undefined });
    expect(serving.pageHtml("privacy.html")).not.toContain("{{");
    expect(serving.pageHtml("terms.html")).not.toContain("{{");

    const expected = references(text(targetDir, "index.html")).length;
    const served = serving.pageHtml("index.html");
    const fingerprinted = Array.from(served.matchAll(/(?:href|src)="\/assets\/([0-9a-f]{16}\/[\w.-]+)"/g), (match) => match[1]!);
    expect(expected).toBeGreaterThan(0);
    expect(fingerprinted).toHaveLength(expected);
    expect(references(served)).toEqual([]);
    for (const name of fingerprinted) expect(existsSync(path.join(targetDir, "assets", name)), name).toBe(true);
  });
});

describe("the not-transformed check", () => {
  it("refuses a file that equals its source, unless it is empty", () => {
    const content = Buffer.from(".a{color:red}");
    expect(() => checkTransformed("a.css", content, Buffer.from(content))).toThrow("a.css was not transformed");
    expect(() => checkTransformed("empty.js", Buffer.alloc(0), Buffer.alloc(0))).not.toThrow();
    expect(() => checkTransformed("a.css", content, Buffer.from(".a{color:blue}"))).not.toThrow();
  });
});

describe("the build's checks", () => {
  it("report the compressed size before and after", async () => {
    const { lines } = await fixtureBuild();
    expect(lines.filter((line) => /^\[build\] compressed size: \d+ → \d+ bytes \(-?\d+(\.\d)?%\)$/.test(line))).toHaveLength(1);
  });

  it("find the site's own files no larger after than before", async () => {
    const { lines } = await siteBuild();
    const sizes = lines.join("\n").match(/compressed size: (\d+) → (\d+) bytes/);
    expect(sizes).not.toBeNull();
    expect(Number(sizes![2])).toBeLessThanOrEqual(Number(sizes![1]));
  });

  it("refuse a script that does not compile", () => {
    expect(() => checkCompiles("x.js", "function (")).toThrow(/^x\.js does not compile/);
    expect(() => checkCompiles("x.js", "var a = 1;")).not.toThrow();
  });

  it("stop the build for a page that refers to an asset that was not built", async () => {
    const page = text(FIXTURE, "sample.html").replace("</head>", '<script src="/missing.js"></script></head>');
    const { message, targetDir } = await rejectedBuild({ sourceDir: fixtureCopy({ "sample.html": page }) });
    expect(message).toContain("sample.html");
    expect(message).toContain("/missing.js");
    expect(existsSync(targetDir)).toBe(false);
  });

  it("stop the build for a script that cannot be transformed", async () => {
    const { message, targetDir } = await rejectedBuild({ sourceDir: fixtureCopy({ "sample.js": "function (" }) });
    expect(message.startsWith("sample.js")).toBe(true);
    expect(existsSync(targetDir)).toBe(false);
  });

  it("refuse a compressed total that grew", () => {
    expect(() => checkCompressedSize(100, 101)).toThrow(/100.*101/);
    expect(() => checkCompressedSize(100, 100)).not.toThrow();
  });

  it("find every script unchanged by the pinned language level", async () => {
    for (const name of topLevel(SITE, ".js")) {
      const source = text(SITE, name);
      const shorten = (target: string) => esbuild.transform(source, { loader: "js", minify: true, target, legalComments: "none", charset: "utf8" });
      const [pinned, newest] = await Promise.all([shorten("es2020"), shorten("esnext")]);
      expect(pinned.code === newest.code, `${name} uses syntax newer than ES2020: the pinned level must be raised`).toBe(true);
    }
  });

  it("only shorten a lighter script", async () => {
    const built = await transformScript(await loadBuildTools(), "sample.js", text(FIXTURE, "sample.js"), { lighter: true });
    expect(() => new vm.Script(built, { filename: "sample.js" })).not.toThrow();
    expect(built).not.toContain("must not survive");
    expect(built).not.toContain("localCounter");
    expect(built).toContain("A readable message for the visitor");
  });
});

describe("a repeated build", () => {
  it("gives the same files with the same bytes", async () => {
    const first = await fixtureBuild();
    const second = await build();
    expectSameFiles(first.targetDir, second.targetDir);

    const site = await siteBuild();
    const again = await build({ sourceDir: SITE });
    expectSameFiles(site.targetDir, again.targetDir);
  });
});

describe("the running site", () => {
  it("never reads the switch", () => {
    for (const name of filesUnder(path.resolve("src"))) {
      expect(readFileSync(path.join("src", name), "latin1").includes("ENV_OBFUSCATE_ASSETS"), name).toBe(false);
    }
  });

  it("gets no build package", () => {
    const manifest: { dependencies: Record<string, string>; devDependencies: Record<string, string> } = JSON.parse(readFileSync("package.json", "utf8"));
    for (const name of ["esbuild", "javascript-obfuscator", "html-minifier-terser", "@jridgewell/remapping"]) {
      expect(manifest.devDependencies[name], name).toMatch(/^\d+\.\d+\.\d+$/);
      expect(manifest.dependencies[name], name).toBeUndefined();
    }
  });
});

describe("the switch", () => {
  it("set to on gives the default build", async () => {
    const byDefault = await fixtureBuild();
    const on = await build({ env: { ENV_OBFUSCATE_ASSETS: "on" } });
    expect(on.lines).toContain("[build] client files: transformed");
    expectSameFiles(byDefault.targetDir, on.targetDir);
  });

  it("set to off gives the files as written", async () => {
    const { targetDir, lines } = await build({ env: { ENV_OBFUSCATE_ASSETS: "off" } });
    const names = filesUnder(targetDir).filter((name) => !name.startsWith("assets/") && name !== "asset-manifest.json");
    expect(names).toEqual(filesUnder(FIXTURE));
    for (const name of names) expect(bytes(targetDir, name).equals(bytes(FIXTURE, name)), name).toBe(true);
    expect(lines).toContain("[build] client files: readable (ENV_OBFUSCATE_ASSETS=off)");
    expect(lines.some((line) => line.includes("compressed size"))).toBe(false);
  });

  it.each(["On", "OFF", "1", "true", "", " off"])("set to %j stops the build", async (value) => {
    const { message, targetDir } = await rejectedBuild({ env: { ENV_OBFUSCATE_ASSETS: value } });
    expect(message).toBe(SWITCH_MESSAGE(value));
    expect(existsSync(targetDir)).toBe(false);
  });

  it("set to off still checks the page references", async () => {
    const page = text(FIXTURE, "sample.html").replace("</head>", '<script src="/missing.js"></script></head>');
    const { message } = await rejectedBuild({ sourceDir: fixtureCopy({ "sample.html": page }), env: { ENV_OBFUSCATE_ASSETS: "off" } });
    expect(message).toContain("/missing.js");
  });

  it("set to on names a build tool that is not installed", async () => {
    const missing = Object.assign(new Error("Cannot find package 'javascript-obfuscator' imported from /app/devScripts/assetTransform.ts"), { code: "ERR_MODULE_NOT_FOUND" });
    const { message, targetDir } = await rejectedBuild({ loadTools: () => Promise.reject(missing) });
    expect(message).toBe("ENV_OBFUSCATE_ASSETS is on but javascript-obfuscator is not installed; run npm ci --include=dev");
    expect(existsSync(targetDir)).toBe(false);
  });

  it("set to off loads no build tool", async () => {
    const { lines } = await build({
      env: { ENV_OBFUSCATE_ASSETS: "off" },
      loadTools: () => {
        throw new Error("a readable build must not load the build tools");
      }
    });
    expect(lines).toContain("[build] client files: readable (ENV_OBFUSCATE_ASSETS=off)");
  });
});

describe("source maps", () => {
  it("are written beside the build, which they do not change, and lead back to the source", async () => {
    const plain = await fixtureBuild();
    const { targetDir, mapsDir } = await build({ sourceMaps: true });
    expect(readdirSync(mapsDir)).toEqual(["sample.js.map"]);
    expectSameFiles(plain.targetDir, targetDir);
    expect(filesUnder(targetDir).filter((name) => name.endsWith(".map"))).toEqual([]);

    const built = text(targetDir, "sample.js");
    const offset = built.indexOf("sharedHelper");
    const before = built.slice(0, offset).split("\n");
    const entry = new SourceMap(JSON.parse(text(mapsDir, "sample.js.map"))).findEntry(before.length - 1, before.at(-1)!.length);
    const declaredOn = text(FIXTURE, "sample.js").split("\n").findIndex((line) => line.startsWith("function sharedHelper"));
    expect(path.basename((entry as { originalSource: string }).originalSource)).toBe("sample.js");
    expect((entry as { originalLine: number }).originalLine).toBe(declaredOn);
    expect(JSON.parse(text(mapsDir, "sample.js.map")).sourcesContent).toEqual([text(FIXTURE, "sample.js")]);
  });

  it("are removed by a build that does not ask for them", async () => {
    const root = temporaryDir();
    const withMaps = await buildInto(root, { sourceMaps: true });
    expect(existsSync(withMaps.mapsDir)).toBe(true);
    const without = await buildInto(root);
    expect(existsSync(without.mapsDir)).toBe(false);
  });

  it("are not written by a readable build", async () => {
    const { mapsDir } = await build({ env: { ENV_OBFUSCATE_ASSETS: "off" }, sourceMaps: true });
    expect(existsSync(mapsDir)).toBe(false);
  });
});
