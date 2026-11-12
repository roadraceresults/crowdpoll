import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runExtract } from "../../../devScripts/extract/extractCli.js";
import { captureConsole, copyFixture, createWorkDir, removeWorkDir } from "./helpers.js";

const REFERENCE_PAGE = path.resolve("polldata", "testhtml.html");
const APPROVAL_GRAPH = {
  title: "Approval over time",
  subtitle: "Poll for Demonstration",
  poll_creator_email: "devadmin01@crowdpoll.vote",
  vote_count: 1000,
  choice_a: "Approve",
  choice_b: "Disapprove",
  data_points: [
    { date: "02/07/25", choice_a: 48, choice_b: 49 },
    { date: "04/21/26", choice_a: 37, choice_b: 62 },
    { date: "10/21/26", choice_a: 33, choice_b: 65 },
  ],
};

interface GraphFile {
  title: string;
  choice_a: string;
  choice_b: string;
  data_points: { date: string; choice_a: number; choice_b: number }[];
}

let workDir: string;
let output: ReturnType<typeof captureConsole>;

async function writeConfig(lines: string[], name = "run.yaml"): Promise<string> {
  const configPath = path.join(workDir, name);
  await fs.writeFile(configPath, lines.join("\n") + "\n", "utf8");
  return configPath;
}

function mappingConfig(graphTitle: string, inputHtml = "line-graphs.html", outputJson = "out.json"): string[] {
  return [`graph_title: ${JSON.stringify(graphTitle)}`, `input_html: ${inputHtml}`, `output_json: ${outputJson}`];
}

async function readGraph(name = "out.json"): Promise<GraphFile> {
  return JSON.parse(await fs.readFile(path.join(workDir, name), "utf8")) as GraphFile;
}

beforeEach(async () => {
  workDir = await createWorkDir();
  await copyFixture(workDir, "line-graphs.html");
  output = captureConsole();
});

afterEach(async () => {
  output.restore();
  await removeWorkDir(workDir);
});

describe("extract: success", () => {
  it("writes the matched graph as JSON", async () => {
    const configPath = await writeConfig(mappingConfig("Approval over time"));
    expect(await runExtract([configPath])).toBe(0);
    const text = await fs.readFile(path.join(workDir, "out.json"), "utf8");
    expect(JSON.parse(text)).toEqual(APPROVAL_GRAPH);
    expect(text).toBe(JSON.stringify(APPROVAL_GRAPH, null, 2) + "\n");
  });

  it("prints one progress line per step and nothing on stderr", async () => {
    const configPath = await writeConfig(mappingConfig("Approval over time"));
    await runExtract([configPath]);
    expect(output.stdout).toEqual([
      `Read config ${configPath}`,
      `Read page ${path.join(workDir, "line-graphs.html")}`,
      "Found graph \"Approval over time\": Approve, Disapprove; 3 data points",
      `Wrote ${path.join(workDir, "out.json")}`,
    ]);
    expect(output.stderr).toEqual([]);
  });

  it("replaces an existing output file", async () => {
    await fs.writeFile(path.join(workDir, "out.json"), "{\"old\":true}\n", "utf8");
    const configPath = await writeConfig(mappingConfig("Approval over time"));
    expect(await runExtract([configPath])).toBe(0);
    expect(await readGraph()).toEqual(APPROVAL_GRAPH);
  });
});

describe("extract: poll shape and title", () => {
  it("matches a title typed with extra spaces and writes it as typed", async () => {
    const configPath = await writeConfig(mappingConfig("Approval  over  time"));
    expect(await runExtract([configPath])).toBe(0);
    expect(output.stdout).toContain("Found graph \"Approval  over  time\": Approve, Disapprove; 3 data points");
    expect(await fs.readFile(path.join(workDir, "out.json"), "utf8")).toBe(
      JSON.stringify({ ...APPROVAL_GRAPH, title: "Approval  over  time" }, null, 2) + "\n",
    );
  });

  it("writes no graph_type or url and never prints the creator email", async () => {
    const configPath = await writeConfig(mappingConfig("Approval over time"));
    expect(await runExtract([configPath])).toBe(0);
    const graph = await readGraph();
    expect(graph).not.toHaveProperty("graph_type");
    expect(graph).not.toHaveProperty("url");
    expect([...output.stdout, ...output.stderr].join("\n")).not.toContain("devadmin01@crowdpoll.vote");
  });
});

describe.skipIf(!existsSync(REFERENCE_PAGE))("extract: reference page", () => {
  beforeEach(async () => {
    await fs.copyFile(REFERENCE_PAGE, path.join(workDir, "testhtml.html"));
  });

  it("extracts the approval graph, one point per date, in under 5 seconds", { timeout: 30000 }, async () => {
    const configPath = await writeConfig(
      mappingConfig("CNN Poll of Polls: Trump approval rating over time", "testhtml.html"),
    );
    const start = performance.now();
    expect(await runExtract([configPath])).toBe(0);
    expect(performance.now() - start).toBeLessThan(5000);

    const graph = await readGraph();
    const byDate = (date: string) => graph.data_points.filter((point) => point.date === date);
    expect([graph.choice_a, graph.choice_b]).toEqual(["Approve", "Disapprove"]);
    expect(graph.data_points).toHaveLength(119);
    expect(graph.data_points[0]).toEqual({ date: "02/07/25", choice_a: 48, choice_b: 49 });
    expect(graph.data_points.at(-1)).toEqual({ date: "10/21/26", choice_a: 33, choice_b: 66 });
    expect(byDate("11/12/25")).toEqual([{ date: "11/12/25", choice_a: 39, choice_b: 60 }]);
    expect(byDate("08/31/26")).toEqual([{ date: "08/31/26", choice_a: 35, choice_b: 64 }]);
    expect(byDate("04/21/26")).toEqual([{ date: "04/21/26", choice_a: 37, choice_b: 62 }]);
  });

  it("extracts the midterm ballot graph", { timeout: 30000 }, async () => {
    const configPath = await writeConfig(
      mappingConfig("CNN Poll of Polls: Generic midterm ballot over time", "testhtml.html"),
    );
    expect(await runExtract([configPath])).toBe(0);
    const graph = await readGraph();
    expect([graph.choice_a, graph.choice_b]).toEqual(["Democrats", "Republicans"]);
    expect(graph.data_points).toHaveLength(6);
    expect(graph.data_points[0]).toEqual({ date: "08/15/26", choice_a: 50, choice_b: 43 });
  });
});

describe("extract: failures", () => {
  const OLD_OUTPUT = "{\"old\":true}\n";

  async function writeOldOutput(): Promise<void> {
    await fs.writeFile(path.join(workDir, "out.json"), OLD_OUTPUT, "utf8");
  }

  async function expectFailure(args: string[], message: string | { prefix: string }): Promise<void> {
    expect(await runExtract(args)).toBe(1);
    expect(output.stderr).toHaveLength(1);
    if (typeof message === "string") expect(output.stderr[0]).toBe(message);
    else expect(output.stderr[0]!.startsWith(message.prefix)).toBe(true);
  }

  async function expectOldOutputUnchanged(): Promise<void> {
    expect(await fs.readFile(path.join(workDir, "out.json"), "utf8")).toBe(OLD_OUTPUT);
  }

  it("prints the usage line unless given exactly one argument", async () => {
    await expectFailure([], "Usage: npm run extract-cnn <config.yaml>");
    output.stderr.length = 0;
    await expectFailure(["a.yaml", "b.yaml"], "Usage: npm run extract-cnn <config.yaml>");
    expect(existsSync(path.join(workDir, "out.json"))).toBe(false);
  });

  it("reports a config that cannot be read", async () => {
    const configPath = path.join(workDir, "missing.yaml");
    await expectFailure([configPath], { prefix: `Error: cannot read config ${configPath}: ` });
  });

  it("reports a config that is not valid", async () => {
    await writeOldOutput();
    const configPath = await writeConfig(["graph_title: [unclosed"]);
    await expectFailure([configPath], { prefix: `Error: invalid config ${configPath}: ` });
    await expectOldOutputUnchanged();
  });

  it("refuses to overwrite the input page or the config", async () => {
    const pagePath = path.join(workDir, "line-graphs.html");
    const before = await fs.readFile(pagePath, "utf8");
    const intoPage = await writeConfig(mappingConfig("Approval over time", "line-graphs.html", "line-graphs.html"));
    await expectFailure([intoPage], `Error: output would overwrite the input file ${pagePath}`);
    expect(await fs.readFile(pagePath, "utf8")).toBe(before);

    output.stderr.length = 0;
    const intoConfig = await writeConfig(mappingConfig("Approval over time", "line-graphs.html", "self.yaml"), "self.yaml");
    await expectFailure([intoConfig], `Error: output would overwrite the config file ${intoConfig}`);
  });

  it("reports a page that cannot be read", async () => {
    await writeOldOutput();
    const configPath = await writeConfig(mappingConfig("Approval over time", "missing.html"));
    await expectFailure([configPath], { prefix: `Error: cannot read ${path.join(workDir, "missing.html")}: ` });
    await expectOldOutputUnchanged();
  });

  it("names the graphs found when the title is not on the page, after two progress lines", async () => {
    await writeOldOutput();
    const configPath = await writeConfig(mappingConfig("Nope"));
    const pagePath = path.join(workDir, "line-graphs.html");
    await expectFailure(
      [configPath],
      `Error: graph "Nope" not found in ${pagePath}; graphs found: "Latest approval rating", "Approval over time", "Ballot over time"`,
    );
    expect(output.stdout).toEqual([`Read config ${configPath}`, `Read page ${pagePath}`]);
    await expectOldOutputUnchanged();
  });

  it("reports a graph with no data points", async () => {
    await writeOldOutput();
    const configPath = await writeConfig(mappingConfig("Latest approval rating"));
    await expectFailure(
      [configPath],
      `Error: graph "Latest approval rating" in ${path.join(workDir, "line-graphs.html")}: has no data points`,
    );
    await expectOldOutputUnchanged();
  });

  it("reports an output file that cannot be written", async () => {
    const configPath = await writeConfig(mappingConfig("Approval over time", "line-graphs.html", "no-such-dir/out.json"));
    await expectFailure([configPath], { prefix: `Error: cannot write ${path.join(workDir, "no-such-dir", "out.json")}: ` });
    expect(existsSync(path.join(workDir, "no-such-dir"))).toBe(false);
  });
});

describe("extract: config shapes", () => {
  it("writes byte-identical output from the dashed list and the mapping, run after run", async () => {
    const listConfig = await writeConfig(
      ["- graph_title: \"Approval over time\"", "- input_html: line-graphs.html", "- output_json: list.json"],
      "list.yaml",
    );
    const mappingConfigPath = await writeConfig(mappingConfig("Approval over time", "line-graphs.html", "map.json"), "map.yaml");
    expect(await runExtract([listConfig])).toBe(0);
    expect(await runExtract([mappingConfigPath])).toBe(0);
    const listText = await fs.readFile(path.join(workDir, "list.json"), "utf8");
    expect(await fs.readFile(path.join(workDir, "map.json"), "utf8")).toBe(listText);

    expect(await runExtract([listConfig])).toBe(0);
    expect(await fs.readFile(path.join(workDir, "list.json"), "utf8")).toBe(listText);
  });
});

describe("extract: type, title and subtitle", () => {
  const OLD_OUTPUT = "{\"old\":true}\n";

  async function expectFailure(lines: string[], message: string | ((configPath: string) => string)): Promise<void> {
    const configPath = await writeConfig(lines);
    await fs.writeFile(path.join(workDir, "out.json"), OLD_OUTPUT, "utf8");
    expect(await runExtract([configPath])).toBe(1);
    expect(output.stderr).toEqual([typeof message === "string" ? message : message(configPath)]);
    expect(await fs.readFile(path.join(workDir, "out.json"), "utf8")).toBe(OLD_OUTPUT);
    output.stderr.length = 0;
  }

  it("accepts its own type and writes no type, graph_type or url", async () => {
    expect(await runExtract([await writeConfig([...mappingConfig("Approval over time"), "type: \" CNN Line Graph \""])])).toBe(0);
    const file = JSON.parse(await fs.readFile(path.join(workDir, "out.json"), "utf8")) as Record<string, unknown>;
    expect(file).not.toHaveProperty("type");
    expect(file).not.toHaveProperty("graph_type");
    expect(file).not.toHaveProperty("url");
  });

  it("refuses another command's type and an unsupported type", async () => {
    await expectFailure(
      [...mappingConfig("Approval over time"), "type: polymarket line graph"],
      "Error: type \"polymarket line graph\" is not supported by extract-cnn; it extracts \"cnn line graph\"; use extract-all for other types",
    );
    await expectFailure(
      [...mappingConfig("Approval over time"), "type: bar chart"],
      "Error: unsupported type \"bar chart\"; supported: polymarket yes no, polymarket line graph, cnn line graph, politico line graph",
    );
    expect(output.stdout).toEqual([]);
  });

  it("writes the config title and subtitle, and finds the graph by graph_title", async () => {
    expect(await runExtract([await writeConfig([...mappingConfig("Approval over time"), "title: \"Who wins?\"", "subtitle: Demo"])])).toBe(0);
    expect(output.stdout.some((line) => line.startsWith("Found graph \"Who wins?\": "))).toBe(true);
    const file = JSON.parse(await fs.readFile(path.join(workDir, "out.json"), "utf8")) as Record<string, unknown>;
    expect(file.title).toBe("Who wins?");
    expect(file.subtitle).toBe("Demo");
  });

  it("writes graph_title and the fixed subtitle without them", async () => {
    expect(await runExtract([await writeConfig(mappingConfig("Approval over time"))])).toBe(0);
    const file = JSON.parse(await fs.readFile(path.join(workDir, "out.json"), "utf8")) as Record<string, unknown>;
    expect(file.title).toBe("Approval over time");
    expect(file.subtitle).toBe("Poll for Demonstration");
  });

  it("refuses an empty title", async () => {
    await expectFailure([...mappingConfig("Approval over time"), "title: \"\""], (configPath) => `Error: invalid config ${configPath}: "title" must be a non-empty string`);
  });
});
