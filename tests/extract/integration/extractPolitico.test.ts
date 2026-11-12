import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runExtractPolitico } from "../../../devScripts/extract/politicoCli.js";
import { MACRON_TITLE_TYPED, macronChart, politicoPage } from "../politicoFixture.js";
import { captureConsole, createWorkDir, removeWorkDir } from "./helpers.js";

const MACRON_GRAPH = {
  title: MACRON_TITLE_TYPED,
  subtitle: "Poll for Demonstration",
  poll_creator_email: "devadmin01@crowdpoll.vote",
  vote_count: 1000,
  choice_a: "Approve",
  choice_b: "Disapprove",
  data_points: [
    { date: "09/01/26", choice_a: 17, choice_b: 80 },
    { date: "09/02/26", choice_a: 18, choice_b: 79 },
    { date: "09/03/26", choice_a: 19, choice_b: 78 },
  ],
};
const MACRON_TEXT = JSON.stringify(MACRON_GRAPH, null, 2) + "\n";

let workDir: string;
let output: ReturnType<typeof captureConsole>;

async function writeConfig(lines: string[], name = "run.yaml"): Promise<string> {
  const configPath = path.join(workDir, name);
  await fs.writeFile(configPath, lines.join("\n") + "\n", "utf8");
  return configPath;
}

function mappingConfig(
  graphTitle = MACRON_TITLE_TYPED,
  inputHtml = "france.html",
  inputHistory = "missing.har",
  outputJson = "out.json",
): string[] {
  return [
    "url: https://www.politico.eu/europe-poll-of-polls/france/",
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
  await fs.writeFile(path.join(workDir, "france.html"), politicoPage([macronChart()]), "utf8");
  output = captureConsole();
});

afterEach(async () => {
  output.restore();
  await removeWorkDir(workDir);
});

describe("extract-politico: success", () => {
  it("writes no graph_type or url and never prints the creator email", async () => {
    const configPath = await writeConfig(mappingConfig());
    expect(await runExtractPolitico([configPath])).toBe(0);
    const graph = JSON.parse(await readOutput());
    expect(graph).not.toHaveProperty("graph_type");
    expect(graph).not.toHaveProperty("url");
    expect([...output.stdout, ...output.stderr].join("\n")).not.toContain("devadmin01@crowdpoll.vote");
  });

  it("writes the chart as JSON without ever opening the recorded traffic file", async () => {
    // input_history names a file that does not exist, so a read of it would fail the run
    const configPath = await writeConfig(mappingConfig());
    expect(await runExtractPolitico([configPath])).toBe(0);
    expect(await readOutput()).toBe(MACRON_TEXT);
  });

  it("reads a list of single settings like the mapping", async () => {
    const list = mappingConfig().map((line) => `- ${line}`);
    const configPath = await writeConfig(list);
    expect(await runExtractPolitico([configPath])).toBe(0);
    expect(await readOutput()).toBe(MACRON_TEXT);
  });

  it("prints one progress line per step and the omitted-line warning", async () => {
    const configPath = await writeConfig(mappingConfig());
    expect(await runExtractPolitico([configPath])).toBe(0);
    expect(output.stdout).toEqual([
      `Read config ${configPath}`,
      `Read page ${path.join(workDir, "france.html")}`,
      `Found graph "${MACRON_TITLE_TYPED}": Approve, Disapprove; 3 data points`,
      `Wrote ${path.join(workDir, "out.json")}`,
    ]);
    expect(output.stderr).toEqual(["Warning: line \"No Opinion\" has 1 point(s); left out"]);
  });

  it("warns about a legend text without a drawn line and still writes the output", async () => {
    const page = politicoPage([macronChart()]).replace(
      "</svg>",
      "<text class=\"trend-ov-name-ghost\">Ghost</text></svg>",
    );
    await fs.writeFile(path.join(workDir, "france.html"), page, "utf8");
    const configPath = await writeConfig(mappingConfig());
    expect(await runExtractPolitico([configPath])).toBe(0);
    expect(output.stderr).toEqual([
      "Warning: legend \"Ghost\" has no drawn line; left out",
      "Warning: line \"No Opinion\" has 1 point(s); left out",
    ]);
    expect(await readOutput()).toBe(MACRON_TEXT);
  });

  it("writes byte-identical output on a second run", async () => {
    const configPath = await writeConfig(mappingConfig());
    await runExtractPolitico([configPath]);
    const first = await readOutput();
    await runExtractPolitico([configPath]);
    expect(await readOutput()).toBe(first);
  });
});

describe("extract-politico: failures", () => {
  async function expectFailure(args: string[], message: string | { prefix: string }): Promise<void> {
    expect(await runExtractPolitico(args)).toBe(1);
    expect(output.stderr).toHaveLength(1);
    if (typeof message === "string") expect(output.stderr[0]).toBe(message);
    else expect(output.stderr[0]!.startsWith(message.prefix)).toBe(true);
    expect(existsSync(path.join(workDir, "out.json"))).toBe(false);
    output.stderr.length = 0;
  }

  it("prints the usage for zero or two arguments", async () => {
    await expectFailure([], "Usage: npm run extract-politico <config.yaml>");
    await expectFailure(["a.yaml", "b.yaml"], "Usage: npm run extract-politico <config.yaml>");
  });

  it("reports a config missing a key, with an extra key, or with an empty value", async () => {
    const missingKey = await writeConfig(mappingConfig().filter((line) => !line.startsWith("url")), "short.yaml");
    await expectFailure([missingKey], `Error: invalid config ${missingKey}: missing key "url"`);
    const extraKey = await writeConfig([...mappingConfig(), "extra: yes"], "extra.yaml");
    await expectFailure([extraKey], `Error: invalid config ${extraKey}: unknown key "extra"`);
    const emptyValue = await writeConfig(mappingConfig().map((line) => (line.startsWith("graph_title") ? "graph_title: \"\"" : line)), "empty.yaml");
    await expectFailure([emptyValue], `Error: invalid config ${emptyValue}: "graph_title" must be a non-empty string`);
  });

  it("refuses an output path that is the page, the HAR or the config, before reading anything", async () => {
    const page = path.join(workDir, "france.html");
    await expectFailure(
      [await writeConfig(mappingConfig(undefined, undefined, undefined, "france.html"))],
      `Error: output would overwrite the input file ${page}`,
    );
    const har = path.join(workDir, "missing.har");
    await expectFailure(
      [await writeConfig(mappingConfig(undefined, undefined, undefined, "missing.har"))],
      `Error: output would overwrite the recorded traffic file ${har}`,
    );
    const configPath = await writeConfig(mappingConfig(undefined, undefined, undefined, "run.yaml"));
    await expectFailure([configPath], `Error: output would overwrite the config file ${configPath}`);
    expect(output.stdout).toEqual([]);
  });

  it("reports a page that cannot be read", async () => {
    const missingPage = path.join(workDir, "missing.html");
    await expectFailure(
      [await writeConfig(mappingConfig(undefined, "missing.html"))],
      { prefix: `Error: cannot read ${missingPage}: ` },
    );
  });

  it("reports a matched chart without its drawing", async () => {
    await fs.writeFile(path.join(workDir, "france.html"), politicoPage([macronChart({ svg: false })]), "utf8");
    const page = path.join(workDir, "france.html");
    await expectFailure(
      [await writeConfig(mappingConfig())],
      `Error: page ${page}: chart "France — President Emmanuel Macron’s approval rating" has no drawing (svg)`,
    );
  });

  it("reports a chart with too few axis ticks", async () => {
    await fs.writeFile(path.join(workDir, "france.html"), politicoPage([macronChart({ xTicks: [[50, "Sep"]] })]), "utf8");
    const page = path.join(workDir, "france.html");
    await expectFailure(
      [await writeConfig(mappingConfig())],
      `Error: page ${page}: the chart has 1 date axis tick(s); at least 2 are needed`,
    );
  });
});

describe("extract-politico: wrong title", () => {
  it("fails naming the headings found, writing nothing", async () => {
    const configPath = await writeConfig(mappingConfig("No Such Chart"));
    expect(await runExtractPolitico([configPath])).toBe(1);
    expect(output.stderr).toHaveLength(1);
    expect(output.stderr[0]).toBe(
      `Error: page ${path.join(workDir, "france.html")}: graph "No Such Chart" not found; ` +
        "chart headings found: \"France — President Emmanuel Macron’s approval rating\"",
    );
    expect(existsSync(path.join(workDir, "out.json"))).toBe(false);
  });
});

const FRANCE_PAGE = path.resolve("polldata", "france-president-emmanuel-macrons-approval-rating.html");

describe.skipIf(!existsSync(FRANCE_PAGE))("extract-politico: reference page", () => {
  it("extracts the full Macron approval history in under 5 seconds", { timeout: 30000 }, async () => {
    await fs.copyFile(FRANCE_PAGE, path.join(workDir, "macron.html"));
    const configPath = await writeConfig(mappingConfig(MACRON_TITLE_TYPED, "macron.html", "macron.har", "macron.json"));
    const started = performance.now();
    expect(await runExtractPolitico([configPath])).toBe(0);
    expect(performance.now() - started).toBeLessThan(5000);
    expect(output.stderr).toEqual(["Warning: line \"No Opinion\" has 1 point(s); left out"]);

    const graph = JSON.parse(await readOutput("macron.json"));
    expect(graph.title).toBe(MACRON_TITLE_TYPED);
    expect([graph.choice_a, graph.choice_b]).toEqual(["Approve", "Disapprove"]);
    expect(graph).not.toHaveProperty("choice_c");
    expect(graph.data_points).toHaveLength(3446);
    expect(graph.data_points[0]).toEqual({ date: "05/17/17", choice_a: 45.1, choice_b: 46.1 });
    // 17.0 serializes as 17: values compare numerically, not as JSON text
    expect(graph.data_points.at(-1)).toEqual({ date: "10/22/26", choice_a: 17, choice_b: 81.1 });
  });
});

const SPAIN_PAGE = path.resolve("polldata", "spain-national-parliament-voting-intention.html");

describe.skipIf(!existsSync(SPAIN_PAGE))("extract-politico: Spain reference page", () => {
  it("extracts every party era, warning about the undrawn \"AR\" legend", { timeout: 30000 }, async () => {
    await fs.copyFile(SPAIN_PAGE, path.join(workDir, "spain.html"));
    const configPath = await writeConfig(
      mappingConfig("Spain — National parliament voting intention", "spain.html", "spain.har", "spain.json"),
    );
    expect(await runExtractPolitico([configPath])).toBe(0);
    expect(output.stderr).toEqual(["Warning: legend \"AR\" has no drawn line; left out"]);

    const graph = JSON.parse(await readOutput("spain.json"));
    expect([graph.choice_a, graph.choice_b, graph.choice_u]).toEqual(["PP", "PSOE", "FA"]);
    expect(graph.data_points).toHaveLength(5430);
    // The first date predates most parties, so the point carries only the lines alive then.
    expect(graph.data_points[0]).toEqual({ date: "12/15/11", choice_a: 44.9, choice_b: 28.4 });
    expect(graph.data_points.at(-1)).toMatchObject({ date: "10/26/26", choice_a: 31.5, choice_u: 5.8 });
    expect(graph.data_points.at(-1)).not.toHaveProperty("f"); // PDeCAT ended in 2019
  });
});

const UK_PAGE = path.resolve("polldata", "united-kingdom-parliament-voting-intention.html");

describe.skipIf(!existsSync(UK_PAGE))("extract-politico: UK reference page", () => {
  it("reads the focus date from the focus group, not the event annotation", { timeout: 30000 }, async () => {
    await fs.copyFile(UK_PAGE, path.join(workDir, "uk.html"));
    const configPath = await writeConfig(
      mappingConfig("United Kingdom — Parliament voting intention", "uk.html", "uk.har", "uk.json"),
    );
    expect(await runExtractPolitico([configPath])).toBe(0);
    expect(output.stderr).toEqual([]);

    const graph = JSON.parse(await readOutput("uk.json"));
    expect([graph.choice_a, graph.choice_b, graph.choice_j]).toEqual(["Con", "Lab", "RB"]);
    expect(graph.data_points).toHaveLength(6018);
    expect(graph.data_points[0]).toEqual({ date: "05/06/10", choice_a: 36.9, choice_b: 29.7, choice_c: 23.6, choice_d: 3.1, choice_e: 1, choice_f: 1.7, choice_i: 0.6 });
    // Dated by the g.focus date (Oct 26, 2026), not the "Andy Burnham new PM" event label.
    expect(graph.data_points.at(-1)).toMatchObject({ date: "10/26/26", choice_b: 27.3, choice_g: 20.4 });
  });
});

describe("extract-politico: type, title and subtitle", () => {
  const OLD_OUTPUT = "{\"old\":true}\n";

  async function expectFailure(lines: string[], message: string | ((configPath: string) => string)): Promise<void> {
    const configPath = await writeConfig(lines);
    await fs.writeFile(path.join(workDir, "out.json"), OLD_OUTPUT, "utf8");
    expect(await runExtractPolitico([configPath])).toBe(1);
    expect(output.stderr).toEqual([typeof message === "string" ? message : message(configPath)]);
    expect(await fs.readFile(path.join(workDir, "out.json"), "utf8")).toBe(OLD_OUTPUT);
    output.stderr.length = 0;
  }

  it("accepts its own type and writes no type, graph_type or url", async () => {
    expect(await runExtractPolitico([await writeConfig([...mappingConfig(), "type: \" Politico Line Graph \""])])).toBe(0);
    const file = JSON.parse(await fs.readFile(path.join(workDir, "out.json"), "utf8")) as Record<string, unknown>;
    expect(file).not.toHaveProperty("type");
    expect(file).not.toHaveProperty("graph_type");
    expect(file).not.toHaveProperty("url");
  });

  it("refuses another command's type and an unsupported type", async () => {
    await expectFailure(
      [...mappingConfig(), "type: cnn line graph"],
      "Error: type \"cnn line graph\" is not supported by extract-politico; it extracts \"politico line graph\"; use extract-all for other types",
    );
    await expectFailure(
      [...mappingConfig(), "type: bar chart"],
      "Error: unsupported type \"bar chart\"; supported: polymarket yes no, polymarket line graph, cnn line graph, politico line graph",
    );
    expect(output.stdout).toEqual([]);
  });

  it("writes the config title and subtitle, and finds the graph by graph_title", async () => {
    expect(await runExtractPolitico([await writeConfig([...mappingConfig(), "title: \"Who wins?\"", "subtitle: Demo"])])).toBe(0);
    expect(output.stdout.some((line) => line.startsWith("Found graph \"Who wins?\": "))).toBe(true);
    const file = JSON.parse(await fs.readFile(path.join(workDir, "out.json"), "utf8")) as Record<string, unknown>;
    expect(file.title).toBe("Who wins?");
    expect(file.subtitle).toBe("Demo");
  });

  it("writes graph_title and the fixed subtitle without them", async () => {
    expect(await runExtractPolitico([await writeConfig(mappingConfig())])).toBe(0);
    const file = JSON.parse(await fs.readFile(path.join(workDir, "out.json"), "utf8")) as Record<string, unknown>;
    expect(file.title).toBe(MACRON_TITLE_TYPED);
    expect(file.subtitle).toBe("Poll for Demonstration");
  });

  it("refuses an empty title", async () => {
    await expectFailure([...mappingConfig(), "title: \"\""], (configPath) => `Error: invalid config ${configPath}: "title" must be a non-empty string`);
  });
});
