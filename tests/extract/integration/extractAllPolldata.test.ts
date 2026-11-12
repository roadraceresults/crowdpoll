import { realpathSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runExtractAll } from "../../../devScripts/extract/extractAllCli.js";
import { extractAllPolldata, type History, type RunOptions } from "../../../devScripts/extract/extract-all-polldata.js";
import { captureConsole, copyFixture, createWorkDir, removeWorkDir } from "./helpers.js";

let workDir: string;
let dataDir: string;
let historyPath: string;
let output: ReturnType<typeof captureConsole>;

async function writeConfig(name: string, outputJson: string, inputHtml = "line-graphs.html", extra: string[] = [], dir = dataDir): Promise<string> {
  const configPath = path.join(dir, name);
  const lines = ["graph_title: \"Approval over time\"", `input_html: ${inputHtml}`, `output_json: ${outputJson}`, ...extra];
  await fs.writeFile(configPath, lines.join("\n") + "\n", "utf8");
  return configPath;
}

async function addPage(name: string, dir = dataDir): Promise<void> {
  await fs.copyFile(path.join(workDir, "line-graphs.html"), path.join(dir, name));
}

async function run(argv: string[] = [dataDir], options: Partial<RunOptions> = {}): Promise<{ status: number; lines: string[]; errors: string[] }> {
  const lines: string[] = [];
  const errors: string[] = [];
  const status = await extractAllPolldata({
    argv,
    env: {},
    historyPath,
    projectRoot: workDir,
    runExtract: (configPath) => runExtractAll([configPath]),
    log: (line) => lines.push(line),
    logError: (line) => errors.push(line),
    ...options,
  });
  return { status, lines, errors };
}

async function readHistoryFile(): Promise<History> {
  return JSON.parse(await fs.readFile(historyPath, "utf8")) as History;
}

beforeEach(async () => {
  workDir = realpathSync.native(await createWorkDir());
  await copyFixture(workDir, "line-graphs.html");
  dataDir = path.join(workDir, "polldata");
  await fs.mkdir(dataDir);
  historyPath = path.join(workDir, "history.json");
  output = captureConsole();
});

afterEach(async () => {
  output.restore();
  await removeWorkDir(workDir);
});

async function threeConfigs(): Promise<void> {
  for (const name of ["c", "a", "b"]) {
    await addPage(`${name}.html`);
    await writeConfig(`${name}.yaml`, `${name}.json`, `${name}.html`);
  }
}

describe("extract-all-polldata: one command for the folder (US1)", () => {
  it("extracts every configuration in name order, as extract-all does", async () => {
    await threeConfigs();
    const { status, lines, errors } = await run();

    expect(status).toBe(0);
    expect(errors).toEqual([]);
    expect(lines).toEqual([
      "[extract-all-polldata] a.yaml: extracting",
      "[extract-all-polldata] b.yaml: extracting",
      "[extract-all-polldata] c.yaml: extracting",
      "[extract-all-polldata] Done: 3 extracted, 0 skipped, 0 failed",
    ]);
    expect(output.stdout).toContain(`Wrote ${path.join(dataDir, "a.json")}`);

    expect(await runExtractAll([await writeConfig("direct.yaml", "direct.json", "a.html")])).toBe(0);
    expect(await fs.readFile(path.join(dataDir, "a.json"))).toEqual(await fs.readFile(path.join(dataDir, "direct.json")));
  });

  it("records one history entry per configuration", async () => {
    await threeConfigs();
    await run();

    const { entries } = await readHistoryFile();
    expect(entries.map((entry) => entry.file)).toEqual(["a.yaml", "b.yaml", "c.yaml"]);
    const [first] = entries;
    expect(first).toEqual({
      directory: dataDir,
      file: "a.yaml",
      sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      outputJson: path.join(dataDir, "a.json"),
      extractedAt: expect.stringMatching(/^\d{4}-\d\d-\d\dT/),
    });
  });

  it("uses the project root's polldata folder when no directory is given", async () => {
    await writeConfig("a.yaml", "a.json");
    await copyFixture(dataDir, "line-graphs.html");

    const { status, lines } = await run([], { env: { INIT_CWD: path.join(workDir, "elsewhere") } });
    expect(status).toBe(0);
    expect(lines.at(-1)).toBe("[extract-all-polldata] Done: 1 extracted, 0 skipped, 0 failed");
  });

  it("resolves a relative directory from the folder the command was typed in", async () => {
    await writeConfig("a.yaml", "a.json");
    await copyFixture(dataDir, "line-graphs.html");

    const { status, lines } = await run(["polldata"], { env: { INIT_CWD: workDir } });
    expect(status).toBe(0);
    expect(lines.at(-1)).toBe("[extract-all-polldata] Done: 1 extracted, 0 skipped, 0 failed");
  });
});

describe("extract-all-polldata: skip what was extracted, redo what changed (US2)", () => {
  it("skips every configuration on a second run", async () => {
    await threeConfigs();
    await run();
    const { status, lines } = await run();

    const { entries } = await readHistoryFile();
    expect(status).toBe(0);
    expect(lines).toEqual([
      ...entries.map((entry) => `[extract-all-polldata] Skipped ${entry.file} (extracted ${entry.extractedAt})`),
      "[extract-all-polldata] Done: 0 extracted, 3 skipped, 0 failed",
    ]);
  });

  it("extracts again only the configuration whose page changed", async () => {
    await threeConfigs();
    await run();
    await fs.appendFile(path.join(dataDir, "b.html"), "<!-- saved again -->");

    const { lines } = await run();
    expect(lines.filter((line) => line.endsWith(": extracting"))).toEqual(["[extract-all-polldata] b.yaml: extracting"]);
    expect(lines.at(-1)).toBe("[extract-all-polldata] Done: 1 extracted, 2 skipped, 0 failed");
  });

  it("extracts again only the configuration whose configuration changed", async () => {
    await threeConfigs();
    await run();
    await writeConfig("c.yaml", "c.json", "c.html", ["subtitle: \"Changed\""]);

    const { lines } = await run();
    expect(lines.filter((line) => line.endsWith(": extracting"))).toEqual(["[extract-all-polldata] c.yaml: extracting"]);
  });

  it("extracts again a configuration whose history entry was removed", async () => {
    await threeConfigs();
    await run();
    const history = await readHistoryFile();
    history.entries = history.entries.filter((entry) => entry.file !== "a.yaml");
    await fs.writeFile(historyPath, JSON.stringify(history), "utf8");

    const { lines } = await run();
    expect(lines.filter((line) => line.endsWith(": extracting"))).toEqual(["[extract-all-polldata] a.yaml: extracting"]);
  });

  it("leaves the history alone when extract-all runs on its own", async () => {
    await threeConfigs();
    await run();
    const before = await fs.readFile(historyPath, "utf8");

    expect(await runExtractAll([path.join(dataDir, "a.yaml")])).toBe(0);
    expect(await fs.readFile(historyPath, "utf8")).toBe(before);
  });

  it("records a same-named configuration in another folder separately", async () => {
    const otherDir = path.join(workDir, "other");
    await fs.mkdir(otherDir);
    await writeConfig("a.yaml", "a.json");
    await copyFixture(dataDir, "line-graphs.html");
    await writeConfig("a.yaml", "a.json", "line-graphs.html", [], otherDir);
    await copyFixture(otherDir, "line-graphs.html");

    await run();
    const { lines } = await run([otherDir]);
    expect(lines).toEqual(["[extract-all-polldata] a.yaml: extracting", "[extract-all-polldata] Done: 1 extracted, 0 skipped, 0 failed"]);
    expect((await readHistoryFile()).entries.map((entry) => entry.directory)).toEqual([dataDir, otherDir]);
  });

  it("matches the same folder given through ..", async () => {
    await threeConfigs();
    await run();

    const { lines } = await run([path.join(dataDir, "..", "polldata")]);
    expect(lines.at(-1)).toBe("[extract-all-polldata] Done: 0 extracted, 3 skipped, 0 failed");
  });

  it.runIf(process.platform === "win32")("matches the same folder given in another letter case", async () => {
    await threeConfigs();
    await run();

    const { lines } = await run([dataDir.toUpperCase()]);
    expect(lines.at(-1)).toBe("[extract-all-polldata] Done: 0 extracted, 3 skipped, 0 failed");
    expect((await readHistoryFile()).entries).toHaveLength(3);
  });
});

describe("extract-all-polldata: one bad configuration does not stop the others (US3)", () => {
  it("reports each failure, extracts the others and lists the failures again", async () => {
    await threeConfigs();
    await writeConfig("bad-key.yaml", "bad-key.json", "a.html", ["graph_subtitle: \"Unknown\""]);
    await writeConfig("bad-page.yaml", "bad-page.json", "missing.html");

    const { status, lines, errors } = await run();
    expect(status).toBe(1);
    expect(lines.at(-1)).toBe("[extract-all-polldata] Done: 3 extracted, 0 skipped, 2 failed");
    const keyError = `invalid config ${path.join(dataDir, "bad-key.yaml")}: unknown key "graph_subtitle"`;
    expect(output.stderr).toContain(`Error: ${keyError}`);
    expect(errors).toEqual([
      `[extract-all-polldata] Error: bad-key.yaml: ${keyError}`,
      expect.stringMatching(/^\[extract-all-polldata\] Error: bad-page\.yaml: cannot read .*missing\.html/),
      "[extract-all-polldata] Failed files:",
      `[extract-all-polldata]   bad-key.yaml: ${keyError}`,
      expect.stringMatching(/^\[extract-all-polldata\] {3}bad-page\.yaml: cannot read .*missing\.html/),
    ]);
    expect((await readHistoryFile()).entries.map((entry) => entry.file)).toEqual(["a.yaml", "b.yaml", "c.yaml"]);
  });

  it("keeps the earlier entry of a configuration that fails later, and tries it again", async () => {
    await threeConfigs();
    await run();
    const [earlier] = (await readHistoryFile()).entries;
    await writeConfig("a.yaml", "a.json", "a.html", ["graph_subtitle: \"Unknown\""]);

    expect((await run()).status).toBe(1);
    expect((await readHistoryFile()).entries.find((entry) => entry.file === "a.yaml")).toEqual(earlier);
    const { lines } = await run();
    expect(lines).toContain("[extract-all-polldata] a.yaml: extracting");
  });

  it("treats a thrown extraction as a failure and goes on", async () => {
    await threeConfigs();
    const runExtract = (configPath: string): Promise<number> => {
      if (configPath.endsWith("b.yaml")) throw new Error("boom");
      return runExtractAll([configPath]);
    };

    const { status, lines, errors } = await run([dataDir], { runExtract });
    expect(status).toBe(1);
    expect(lines.at(-1)).toBe("[extract-all-polldata] Done: 2 extracted, 0 skipped, 1 failed");
    expect(errors).toEqual(["[extract-all-polldata] Error: b.yaml: boom", "[extract-all-polldata] Failed files:", "[extract-all-polldata]   b.yaml: boom"]);
  });
});

describe("extract-all-polldata: arguments, folder and history errors", () => {
  it("refuses two or more arguments", async () => {
    await threeConfigs();
    const { status, lines, errors } = await run(["a", "b"]);
    expect(status).toBe(1);
    expect(lines).toEqual([]);
    expect(errors).toEqual(["[extract-all-polldata] Error: Usage: npm run extract-all-polldata [<directory>]"]);
  });

  it("refuses a missing folder", async () => {
    const missing = path.join(workDir, "nowhere");
    const { status, errors } = await run([missing]);
    expect(status).toBe(1);
    expect(errors).toEqual([expect.stringMatching(new RegExp(`^\\[extract-all-polldata\\] Error: cannot read the directory ${missing.replace(/\\/g, "\\\\")}: `))]);
  });

  it("says so when the folder holds no configuration", async () => {
    const { status, lines } = await run();
    expect(status).toBe(0);
    expect(lines).toEqual([`[extract-all-polldata] No .yaml or .yml files in ${dataDir}`]);
  });

  it.each([
    ["not JSON", "{ entries"],
    ["without an entries list", "{}"],
  ])("stops before extracting when the history is %s", async (_case, text) => {
    await threeConfigs();
    await fs.writeFile(historyPath, text, "utf8");
    const { status, lines, errors } = await run();
    expect(status).toBe(1);
    expect(lines).toEqual([]);
    expect(errors).toEqual([expect.stringMatching(/^\[extract-all-polldata\] Error: cannot read .*history\.json: /)]);
  });

  it("takes .yml and upper-case extensions, and not a subfolder's configurations", async () => {
    await copyFixture(dataDir, "line-graphs.html");
    await writeConfig("a.yml", "a.json");
    await writeConfig("B.YAML", "b.json");
    await fs.mkdir(path.join(dataDir, "sub"));
    await writeConfig("c.yaml", "c.json", "../line-graphs.html", [], path.join(dataDir, "sub"));

    const { lines } = await run();
    expect(lines).toEqual([
      "[extract-all-polldata] a.yml: extracting",
      "[extract-all-polldata] B.YAML: extracting",
      "[extract-all-polldata] Done: 2 extracted, 0 skipped, 0 failed",
    ]);
  });

  it("saves the history after each success", async () => {
    await threeConfigs();
    let seenBySecond: History | undefined;
    let calls = 0;
    const runExtract = async (configPath: string): Promise<number> => {
      if (++calls === 2) seenBySecond = await readHistoryFile();
      return runExtractAll([configPath]);
    };

    await run([dataDir], { runExtract });
    expect(seenBySecond?.entries.map((entry) => entry.file)).toEqual(["a.yaml"]);
  });
});
