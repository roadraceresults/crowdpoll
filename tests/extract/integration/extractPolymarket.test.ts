import { existsSync, readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runExtractPolymarket } from "../../../devScripts/extract/polymarketCli.js";
import { captureConsole, copyFixture, createWorkDir, removeWorkDir } from "./helpers.js";

const REFERENCE_PAGE = path.resolve("polldata", "best_ai_model.html");
const REFERENCE_HAR = path.resolve("polldata", "best_ai_model.har");
const NETFLIX_PAGE = path.resolve("polldata", "netflix_show.html");
const NETFLIX_HAR = path.resolve("polldata", "netflix_show.har");
const AI_RACE_GRAPH = {
  title: "AI race",
  subtitle: "Poll for Demonstration",
  poll_creator_email: "devadmin01@crowdpoll.vote",
  vote_count: 1000,
  choice_a: "Alpha",
  choice_b: "Beta",
  choice_c: "Gamma",
  data_points: [
    { date: "06/05/26", choice_a: 60, choice_b: 12, choice_c: 9 },
    { date: "06/07/26", choice_a: 62, choice_b: 12, choice_c: 1.3 },
  ],
};
const AI_RACE_TEXT = JSON.stringify(AI_RACE_GRAPH, null, 2) + "\n";

let workDir: string;
let output: ReturnType<typeof captureConsole>;

function hasPriceHistory(harPath: string): boolean {
  return existsSync(harPath) && readFileSync(harPath, "utf8").includes("/prices-history?");
}

async function writeConfig(lines: string[], name = "run.yaml"): Promise<string> {
  const configPath = path.join(workDir, name);
  await fs.writeFile(configPath, lines.join("\n") + "\n", "utf8");
  return configPath;
}

function mappingConfig(
  graphTitle = "AI race",
  inputHtml = "polymarket-chart.html",
  inputHistory = "polymarket.har",
  outputJson = "out.json",
): string[] {
  return [
    `graph_title: ${JSON.stringify(graphTitle)}`,
    `input_html: ${inputHtml}`,
    `input_history: ${inputHistory}`,
    `output_json: ${outputJson}`,
  ];
}

function readOutput(name = "out.json"): Promise<string> {
  return fs.readFile(path.join(workDir, name), "utf8");
}

beforeEach(async () => {
  workDir = await createWorkDir();
  await copyFixture(workDir, "polymarket-chart.html");
  await copyFixture(workDir, "polymarket.har");
  output = captureConsole();
});

afterEach(async () => {
  output.restore();
  await removeWorkDir(workDir);
});

describe("extract-polymarket: success", () => {
  it("writes the chart as JSON", async () => {
    const configPath = await writeConfig(mappingConfig());
    expect(await runExtractPolymarket([configPath])).toBe(0);
    expect(await readOutput()).toBe(AI_RACE_TEXT);
  });

  it("reads a list of single settings like the mapping", async () => {
    const list = mappingConfig().map((line) => `- ${line}`);
    const configPath = await writeConfig(list);
    expect(await runExtractPolymarket([configPath])).toBe(0);
    expect(await readOutput()).toBe(AI_RACE_TEXT);
  });

  it("writes byte-identical output on a second run", async () => {
    const configPath = await writeConfig(mappingConfig());
    await runExtractPolymarket([configPath]);
    const first = await readOutput();
    await runExtractPolymarket([configPath]);
    expect(await readOutput()).toBe(first);
  });

  it("replaces an existing output file", async () => {
    await fs.writeFile(path.join(workDir, "out.json"), "{\"old\":true}\n", "utf8");
    const configPath = await writeConfig(mappingConfig());
    expect(await runExtractPolymarket([configPath])).toBe(0);
    expect(await readOutput()).toBe(AI_RACE_TEXT);
  });

  it("prints one progress line per step, nothing on stderr, and nothing from the HAR", async () => {
    const configPath = await writeConfig(mappingConfig());
    await runExtractPolymarket([configPath]);
    expect(output.stdout).toEqual([
      `Read config ${configPath}`,
      `Read page ${path.join(workDir, "polymarket-chart.html")}`,
      `Read price history ${path.join(workDir, "polymarket.har")}`,
      "Found graph \"AI race\": Alpha, Beta, Gamma; 2 data points",
      `Wrote ${path.join(workDir, "out.json")}`,
    ]);
    expect(output.stderr).toEqual([]);
    expect([...output.stdout, await readOutput()].join("\n")).not.toContain("secret-cookie");
  });
});

describe("extract-polymarket: poll shape and title", () => {
  it("matches a title typed with extra spaces and writes it as typed", async () => {
    const configPath = await writeConfig(mappingConfig("AI  race"));
    expect(await runExtractPolymarket([configPath])).toBe(0);
    expect(output.stdout).toContain("Found graph \"AI  race\": Alpha, Beta, Gamma; 2 data points");
    expect(await readOutput()).toBe(JSON.stringify({ ...AI_RACE_GRAPH, title: "AI  race" }, null, 2) + "\n");
  });

  it("writes no graph_type or url and never prints the creator email", async () => {
    const configPath = await writeConfig(mappingConfig());
    expect(await runExtractPolymarket([configPath])).toBe(0);
    const graph = JSON.parse(await readOutput());
    expect(graph).not.toHaveProperty("graph_type");
    expect(graph).not.toHaveProperty("url");
    expect([...output.stdout, ...output.stderr].join("\n")).not.toContain("devadmin01@crowdpoll.vote");
  });
});

describe.skipIf(!existsSync(REFERENCE_HAR))("extract-polymarket: reference page", () => {
  beforeEach(async () => {
    await fs.copyFile(REFERENCE_PAGE, path.join(workDir, "best_ai_model.html"));
    await fs.copyFile(REFERENCE_HAR, path.join(workDir, "best_ai_model.har"));
  });

  it("extracts the four lines in under 5 seconds, near the hover values", { timeout: 30000 }, async () => {
    const configPath = await writeConfig(
      mappingConfig(
        "Which company has best AI model end of 2026?",
        "best_ai_model.html",
        "best_ai_model.har",
        "best_ai_model.json",
      ),
    );
    const started = performance.now();
    expect(await runExtractPolymarket([configPath])).toBe(0);
    expect(performance.now() - started).toBeLessThan(5000);

    const graph = JSON.parse(await readOutput("best_ai_model.json"));
    expect([graph.choice_a, graph.choice_b, graph.choice_c, graph.choice_d]).toEqual([
      "Anthropic",
      "Google",
      "OpenAI",
      "Meta",
    ]);
    expect(graph.data_points).toHaveLength(144);
    const first = graph.data_points[0];
    expect(first.date).toBe("06/04/26");
    for (const [letter, hover] of [["choice_a", 59], ["choice_b", 11], ["choice_c", 9.0], ["choice_d", 6.5]] as const) {
      expect(Math.abs(first[letter] - hover)).toBeLessThanOrEqual(0.5);
    }
    const byDate = new Map(graph.data_points.map((point: { date: string }) => [point.date, point]));
    expect(byDate.get("08/15/26")).toEqual({ date: "08/15/26", choice_a: 66.5, choice_b: 9, choice_c: 11, choice_d: 1.8 });
    expect(byDate.get("10/24/26")).toEqual({ date: "10/24/26", choice_a: 49.5, choice_b: 40.5, choice_c: 5.9, choice_d: 1.3 });
  });
});

describe.skipIf(!hasPriceHistory(NETFLIX_HAR))("extract-polymarket: Netflix reference page", () => {
  const DAY_MS = 86_400_000;

  beforeEach(async () => {
    await fs.copyFile(NETFLIX_PAGE, path.join(workDir, "netflix_show.html"));
    await fs.copyFile(NETFLIX_HAR, path.join(workDir, "netflix_show.har"));
  });

  async function extractNetflix(): Promise<string> {
    const configPath = await writeConfig(
      mappingConfig(
        "What will be the top US Netflix show this week? (October 27)",
        "netflix_show.html",
        "netflix_show.har",
        "netflix_show.json",
      ),
    );
    expect(await runExtractPolymarket([configPath])).toBe(0);
    return readOutput("netflix_show.json");
  }

  function utcTimeOf(date: string): number {
    const [month, day, year] = date.split("/").map(Number);
    return Date.UTC(2000 + year!, month! - 1, day);
  }

  it("extracts the four lines, one point per day from 10/21/26, in under 5 seconds", { timeout: 30000 }, async () => {
    const started = performance.now();
    const graph = JSON.parse(await extractNetflix());
    expect(performance.now() - started).toBeLessThan(5000);

    expect(graph.title).toBe("What will be the top US Netflix show this week? (October 27)");
    expect([graph.choice_a, graph.choice_b, graph.choice_c, graph.choice_d]).toEqual([
      "Nobody Wants This: Season 3",
      "FROM: Season 1",
      "Love Is Blind: Boston",
      "The Diplomat: Season 4",
    ]);
    expect(graph).not.toHaveProperty("choice_e");

    const points: Record<string, string | number>[] = graph.data_points;
    expect(points.length).toBeGreaterThanOrEqual(5);
    expect(points[0]!.date).toBe("10/21/26");
    for (let i = 1; i < points.length; i++) {
      expect(utcTimeOf(points[i]!.date as string) - utcTimeOf(points[i - 1]!.date as string)).toBe(DAY_MS);
    }
    for (const point of points) {
      expect(Object.keys(point)).toEqual(["date", "choice_a", "choice_b", "choice_c", "choice_d"]);
      for (const letter of ["choice_a", "choice_b", "choice_c", "choice_d"]) {
        const value = point[letter] as number;
        expect(typeof value).toBe("number");
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
        expect(value).toBe(Math.round(value * 10) / 10);
      }
    }

    expect(points).toHaveLength(6);
    expect(points.at(-1)?.date).toBe("10/26/26");
    expect(points[0]).toEqual({ date: "10/21/26", choice_a: 49.5, choice_b: 49.5, choice_c: 49.5, choice_d: 49.5 });
    expect(points[3]).toEqual({ date: "10/24/26", choice_a: 23, choice_b: 4.5, choice_c: 60, choice_d: 2.3 });
  });

  it("writes byte-identical output on a second run", { timeout: 30000 }, async () => {
    const first = await extractNetflix();
    output.stdout.length = 0;
    expect(await extractNetflix()).toBe(first);
  });
});

describe("extract-polymarket: failures", () => {
  const OLD_OUTPUT = "{\"old\":true}\n";

  async function expectFailure(args: string[], message: string | { prefix: string }): Promise<void> {
    expect(await runExtractPolymarket(args)).toBe(1);
    expect(output.stderr).toHaveLength(1);
    if (typeof message === "string") expect(output.stderr[0]).toBe(message);
    else expect(output.stderr[0]!.startsWith(message.prefix)).toBe(true);
  }

  async function writeOldOutput(): Promise<void> {
    await fs.writeFile(path.join(workDir, "out.json"), OLD_OUTPUT, "utf8");
  }

  async function expectOldOutput(): Promise<void> {
    expect(await readOutput()).toBe(OLD_OUTPUT);
  }

  it("prints the usage for zero or two arguments", async () => {
    await expectFailure([], "Usage: npm run extract-polymarket <config.yaml>");
    output.stderr.length = 0;
    await expectFailure(["a.yaml", "b.yaml"], "Usage: npm run extract-polymarket <config.yaml>");
  });

  it("reports a config that cannot be read", async () => {
    const configPath = path.join(workDir, "missing.yaml");
    await expectFailure([configPath], { prefix: `Error: cannot read config ${configPath}: ` });
  });

  it("reports an invalid config", async () => {
    const badYaml = await writeConfig(["graph_title: [unclosed"], "bad.yaml");
    await expectFailure([badYaml], { prefix: `Error: invalid config ${badYaml}: ` });
    output.stderr.length = 0;
    const missingKey = await writeConfig(mappingConfig().filter((line) => !line.startsWith("input_history")), "short.yaml");
    await expectFailure([missingKey], `Error: invalid config ${missingKey}: missing key "input_history"`);
  });

  it("refuses an output path that is the page, the HAR or the config", async () => {
    const page = path.join(workDir, "polymarket-chart.html");
    const har = path.join(workDir, "polymarket.har");
    const pageText = await fs.readFile(page, "utf8");
    const harText = await fs.readFile(har, "utf8");

    await expectFailure([await writeConfig(mappingConfig(undefined, undefined, undefined, "polymarket-chart.html"))], `Error: output would overwrite the input file ${page}`);
    output.stderr.length = 0;
    await expectFailure([await writeConfig(mappingConfig(undefined, undefined, undefined, "polymarket.har"))], `Error: output would overwrite the price history file ${har}`);
    output.stderr.length = 0;
    const configPath = await writeConfig(mappingConfig(undefined, undefined, undefined, "run.yaml"));
    const configText = await fs.readFile(configPath, "utf8");
    await expectFailure([configPath], `Error: output would overwrite the config file ${configPath}`);

    expect(await fs.readFile(page, "utf8")).toBe(pageText);
    expect(await fs.readFile(har, "utf8")).toBe(harText);
    expect(await fs.readFile(configPath, "utf8")).toBe(configText);
    expect(output.stdout).toEqual([]);
  });

  it("reports a page or a HAR that cannot be read", async () => {
    await writeOldOutput();
    const missingPage = path.join(workDir, "missing.html");
    await expectFailure([await writeConfig(mappingConfig(undefined, "missing.html"))], { prefix: `Error: cannot read ${missingPage}: ` });
    output.stderr.length = 0;
    const missingHar = path.join(workDir, "missing.har");
    await expectFailure([await writeConfig(mappingConfig(undefined, undefined, "missing.har"))], { prefix: `Error: cannot read ${missingHar}: ` });
    await expectOldOutput();
  });

  it("names the page's graph when the title differs", async () => {
    await writeOldOutput();
    const page = path.join(workDir, "polymarket-chart.html");
    await expectFailure([await writeConfig(mappingConfig("Nope"))], `Error: graph "Nope" not found in ${page}; the page's graph is "AI race"`);
    await expectOldOutput();
  });

  it("reports a page without a Polymarket chart", async () => {
    await writeOldOutput();
    await fs.writeFile(path.join(workDir, "cnn.html"), "<html><body><h1>CNN</h1></body></html>", "utf8");
    const page = path.join(workDir, "cnn.html");
    await expectFailure([await writeConfig(mappingConfig("CNN", "cnn.html"))], `Error: page ${page}: no Polymarket chart found`);
    await expectOldOutput();
  });

  it("reports a HAR without a drawn line's history", async () => {
    await writeOldOutput();
    const har = JSON.parse(await fs.readFile(path.join(workDir, "polymarket.har"), "utf8"));
    har.log.entries = har.log.entries.filter((entry: { request: { url: string } }) => !entry.request.url.includes("token_id=333&"));
    await fs.writeFile(path.join(workDir, "other.har"), JSON.stringify(har), "utf8");
    const harPath = path.join(workDir, "other.har");
    await expectFailure([await writeConfig(mappingConfig(undefined, undefined, "other.har"))], `Error: price history ${harPath}: has no price history for "Gamma"`);
    await expectOldOutput();
  });

  it("says how to save a HAR that holds no price-history request", async () => {
    await writeOldOutput();
    const har = JSON.parse(await fs.readFile(path.join(workDir, "polymarket.har"), "utf8"));
    har.log.entries = [
      har.log.entries.find((entry: { request: { method: string } }) => entry.request.method === "OPTIONS"),
      { request: { method: "POST", url: "https://polymarket.com/~partytown/proxytown" }, response: { content: { mimeType: "text/plain", text: "" } } },
    ];
    await fs.writeFile(path.join(workDir, "analytics.har"), JSON.stringify(har), "utf8");
    const harPath = path.join(workDir, "analytics.har");
    await expectFailure(
      [await writeConfig(mappingConfig(undefined, undefined, "analytics.har"))],
      `Error: price history ${harPath}: has no price-history responses; save the HAR with DevTools open on the Network tab before the page loads`,
    );
    await expectOldOutput();
  });

  it("reports an output file that cannot be written", async () => {
    const outPath = path.join(workDir, "missing-folder", "out.json");
    await expectFailure([await writeConfig(mappingConfig(undefined, undefined, undefined, "missing-folder/out.json"))], { prefix: `Error: cannot write ${outPath}: ` });
  });
});

describe("extract-polymarket: type, title and subtitle", () => {
  const OLD_OUTPUT = "{\"old\":true}\n";

  async function expectFailure(lines: string[], message: string | ((configPath: string) => string)): Promise<void> {
    const configPath = await writeConfig(lines);
    await fs.writeFile(path.join(workDir, "out.json"), OLD_OUTPUT, "utf8");
    expect(await runExtractPolymarket([configPath])).toBe(1);
    expect(output.stderr).toEqual([typeof message === "string" ? message : message(configPath)]);
    expect(await fs.readFile(path.join(workDir, "out.json"), "utf8")).toBe(OLD_OUTPUT);
    output.stderr.length = 0;
  }

  it("accepts its own type and writes no type, graph_type or url", async () => {
    expect(await runExtractPolymarket([await writeConfig([...mappingConfig(), "type: \" Polymarket Line Graph \""])])).toBe(0);
    const file = JSON.parse(await fs.readFile(path.join(workDir, "out.json"), "utf8")) as Record<string, unknown>;
    expect(file).not.toHaveProperty("type");
    expect(file).not.toHaveProperty("graph_type");
    expect(file).not.toHaveProperty("url");
  });

  it("refuses another command's type and an unsupported type", async () => {
    await expectFailure(
      [...mappingConfig(), "type: polymarket yes no"],
      "Error: type \"polymarket yes no\" is not supported by extract-polymarket; it extracts \"polymarket line graph\"; use extract-all for other types",
    );
    await expectFailure(
      [...mappingConfig(), "type: bar chart"],
      "Error: unsupported type \"bar chart\"; supported: polymarket yes no, polymarket line graph, cnn line graph, politico line graph",
    );
    expect(output.stdout).toEqual([]);
  });

  it("writes the config title and subtitle, and finds the graph by graph_title", async () => {
    expect(await runExtractPolymarket([await writeConfig([...mappingConfig(), "title: \"Who wins?\"", "subtitle: Demo"])])).toBe(0);
    expect(output.stdout.some((line) => line.startsWith("Found graph \"Who wins?\": "))).toBe(true);
    const file = JSON.parse(await fs.readFile(path.join(workDir, "out.json"), "utf8")) as Record<string, unknown>;
    expect(file.title).toBe("Who wins?");
    expect(file.subtitle).toBe("Demo");
  });

  it("writes graph_title and the fixed subtitle without them", async () => {
    expect(await runExtractPolymarket([await writeConfig(mappingConfig())])).toBe(0);
    const file = JSON.parse(await fs.readFile(path.join(workDir, "out.json"), "utf8")) as Record<string, unknown>;
    expect(file.title).toBe("AI race");
    expect(file.subtitle).toBe("Poll for Demonstration");
  });

  it("refuses an empty title", async () => {
    await expectFailure([...mappingConfig(), "title: \"\""], (configPath) => `Error: invalid config ${configPath}: "title" must be a non-empty string`);
  });
});
