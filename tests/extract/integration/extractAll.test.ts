import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runExtract } from "../../../devScripts/extract/extractCli.js";
import { runExtractAll, runExtractYesNo } from "../../../devScripts/extract/extractAllCli.js";
import type { GraphFile } from "../../../devScripts/extract/extractLineGraph.js";
import { GRAPH_TYPES, type GraphType } from "../../../devScripts/extract/graphTypes.js";
import { runExtractPolitico } from "../../../devScripts/extract/politicoCli.js";
import { runExtractPolymarket } from "../../../devScripts/extract/polymarketCli.js";
import { MACRON_TITLE_TYPED, macronChart, politicoPage } from "../politicoFixture.js";
import { captureConsole, copyFixture, createWorkDir, removeWorkDir } from "./helpers.js";

const POLITICO_URL = "https://www.politico.eu/europe-poll-of-polls/france/";

let workDir: string;
let output: ReturnType<typeof captureConsole>;
let fetchSpy: ReturnType<typeof vi.fn>;

async function writeConfig(lines: string[], name = "run.yaml"): Promise<string> {
  const configPath = path.join(workDir, name);
  await fs.writeFile(configPath, lines.join("\n") + "\n", "utf8");
  return configPath;
}

function readOutput(name = "out.json"): Promise<string> {
  return fs.readFile(path.join(workDir, name), "utf8");
}

function inWorkDir(name: string): string {
  return path.join(workDir, name);
}

function cnnConfig(outputJson = "out.json", extra: string[] = []): string[] {
  return ["graph_title: \"Approval over time\"", "input_html: line-graphs.html", `output_json: ${outputJson}`, ...extra];
}

function polymarketConfig(outputJson = "out.json", extra: string[] = []): string[] {
  return ["graph_title: \"AI race\"", "input_html: polymarket-page.html", "input_history: polymarket.har", `output_json: ${outputJson}`, ...extra];
}

function politicoConfig(outputJson = "out.json", inputHtml = "france.html"): string[] {
  return [
    `url: ${POLITICO_URL}`,
    `graph_title: ${JSON.stringify(MACRON_TITLE_TYPED)}`,
    `input_html: ${inputHtml}`,
    "input_history: missing.har",
    `output_json: ${outputJson}`,
  ];
}

function withoutExtractAllKeys(text: string): unknown {
  const { type: _type, url: _url, oldest_age_in_days: _oldest, ...rest } = JSON.parse(text) as Record<string, unknown>;
  return rest;
}

beforeEach(async () => {
  workDir = await createWorkDir();
  await copyFixture(workDir, "line-graphs.html");
  await copyFixture(workDir, "polymarket.har");
  const polymarketPage = await fs.readFile(await copyFixture(workDir, "polymarket-chart.html"), "utf8");
  await fs.writeFile(inWorkDir("polymarket-page.html"), polymarketPage.replace("<title>AI race | Polymarket", "<title>Polymarket | AI race"), "utf8");
  const france = politicoPage([macronChart()]).replace("<head>", `<head><link rel="canonical" href="${POLITICO_URL}">`);
  await fs.writeFile(inWorkDir("france.html"), france, "utf8");
  fetchSpy = vi.fn(() => {
    throw new Error("network access");
  });
  vi.stubGlobal("fetch", fetchSpy);
  output = captureConsole();
});

afterEach(async () => {
  output.restore();
  vi.unstubAllGlobals();
  await removeWorkDir(workDir);
});

describe("extract-all: one command for each page type", () => {
  it("detects a CNN page and writes the same graph as extract-cnn", async () => {
    const configPath = await writeConfig(cnnConfig());
    expect(await runExtractAll([configPath])).toBe(0);
    expect(output.stdout).toEqual([
      `Read config ${configPath}`,
      `Read page ${inWorkDir("line-graphs.html")}`,
      "Detected CNN page",
      "Found graph \"Approval over time\": Approve, Disapprove; 3 data points",
      `Wrote ${inWorkDir("out.json")}`,
    ]);
    expect(output.stderr).toEqual([]);

    expect(await runExtract([await writeConfig(cnnConfig("dedicated.json"), "dedicated.yaml")])).toBe(0);
    expect(withoutExtractAllKeys(await readOutput())).toEqual(JSON.parse(await readOutput("dedicated.json")));
  });

  it("detects a Polymarket page and writes the same graph as extract-polymarket", async () => {
    const configPath = await writeConfig(polymarketConfig());
    expect(await runExtractAll([configPath])).toBe(0);
    expect(output.stdout).toEqual([
      `Read config ${configPath}`,
      `Read page ${inWorkDir("polymarket-page.html")}`,
      "Detected Polymarket page",
      `Read price history ${inWorkDir("polymarket.har")}`,
      "Found graph \"AI race\": Alpha, Beta, Gamma; 2 data points",
      `Wrote ${inWorkDir("out.json")}`,
    ]);
    expect(output.stderr).toEqual([]);

    expect(await runExtractPolymarket([await writeConfig(polymarketConfig("dedicated.json"), "dedicated.yaml")])).toBe(0);
    expect(withoutExtractAllKeys(await readOutput())).toEqual(JSON.parse(await readOutput("dedicated.json")));
  });

  it("detects a Politico page, prints its warnings and writes the same graph as extract-politico", async () => {
    const configPath = await writeConfig(politicoConfig());
    expect(await runExtractAll([configPath])).toBe(0);
    expect(output.stdout).toEqual([
      `Read config ${configPath}`,
      `Read page ${inWorkDir("france.html")}`,
      "Detected Politico page",
      `Found graph "${MACRON_TITLE_TYPED}": Approve, Disapprove; 3 data points`,
      `Wrote ${inWorkDir("out.json")}`,
    ]);
    expect(output.stderr).toEqual(["Warning: line \"No Opinion\" has 1 point(s); left out"]);

    expect(await runExtractPolitico([await writeConfig(politicoConfig("dedicated.json"), "dedicated.yaml")])).toBe(0);
    expect(withoutExtractAllKeys(await readOutput())).toEqual(JSON.parse(await readOutput("dedicated.json")));
  });

  it("writes an identical file on a second run and makes no network request", async () => {
    for (const lines of [cnnConfig(), polymarketConfig(), politicoConfig()]) {
      const configPath = await writeConfig(lines);
      expect(await runExtractAll([configPath])).toBe(0);
      const first = await readOutput();
      expect(await runExtractAll([configPath])).toBe(0);
      expect(await readOutput()).toBe(first);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never opens an input_history given for a CNN page", async () => {
    const configPath = await writeConfig(cnnConfig("out.json", ["input_history: missing.har"]));
    expect(await runExtractAll([configPath])).toBe(0);
  });
});

describe("extract-all: yes/no polls", () => {
  const YES_NO_TITLE = "Dancing with the Stars S35: Winner?";

  function yesNoConfig(outputJson = "out.json", extra: string[] = []): string[] {
    return [`graph_title: "${YES_NO_TITLE}"`, "input_html: yes-no.html", `output_json: ${outputJson}`, ...extra];
  }

  beforeEach(async () => {
    await fs.copyFile(await copyFixture(workDir, "polymarket-yes-no.html"), inWorkDir("yes-no.html"));
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-08T15:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs the yes/no extraction for type \"polymarket yes no\" and writes the same file as extract-polymarket-yes-no", async () => {
    const configPath = await writeConfig(yesNoConfig("out.json", ["type: polymarket yes no"]));
    expect(await runExtractAll([configPath])).toBe(0);
    expect(output.stdout).toEqual([
      `Read config ${configPath}`,
      `Read page ${inWorkDir("yes-no.html")}`,
      "Using type polymarket yes no",
      `Found graph "${YES_NO_TITLE}": Ezra Frech, Connor Wood, Taylor Hanson, Tyler Cameron; 1 data point`,
      `Wrote ${inWorkDir("out.json")}`,
    ]);
    expect(output.stderr).toEqual([]);

    expect(await runExtractYesNo([await writeConfig(yesNoConfig("dedicated.json", ["type: polymarket yes no"]), "dedicated.yaml")])).toBe(0);
    expect(await readOutput()).toBe(await readOutput("dedicated.json"));
  });

  it("detects the same page as a Polymarket line graph without type", async () => {
    const configPath = await writeConfig(yesNoConfig());
    await fs.writeFile(inWorkDir("out.json"), "{\"old\":true}\n", "utf8");
    expect(await runExtractAll([configPath])).toBe(1);
    expect(output.stdout).toContain("Detected Polymarket page");
    expect(output.stderr).toEqual([`Error: invalid config ${configPath}: missing key "input_history"`]);
    expect(await readOutput()).toBe("{\"old\":true}\n");
  });
});

describe("extract-all: poll shape", () => {
  const FIXED = { subtitle: "Poll for Demonstration", poll_creator_email: "devadmin01@crowdpoll.vote", vote_count: 1000 };

  function textOf(value: unknown): string {
    return JSON.stringify(value, null, 2) + "\n";
  }

  it("writes type after vote_count and no url for a config without one", async () => {
    expect(await runExtractAll([await writeConfig(cnnConfig())])).toBe(0);
    expect(await readOutput()).toBe(
      textOf({
        title: "Approval over time",
        ...FIXED,
        type: "cnn line graph",
        oldest_age_in_days: 365,
        choice_a: "Approve",
        choice_b: "Disapprove",
        data_points: [
          { date: "02/07/25", choice_a: 48, choice_b: 49 },
          { date: "04/21/26", choice_a: 37, choice_b: 62 },
          { date: "10/21/26", choice_a: 33, choice_b: 65 },
        ],
      }),
    );

    expect(await runExtractAll([await writeConfig(polymarketConfig())])).toBe(0);
    expect(await readOutput()).toBe(
      textOf({
        title: "AI race",
        ...FIXED,
        type: "polymarket line graph",
        oldest_age_in_days: 365,
        choice_a: "Alpha",
        choice_b: "Beta",
        choice_c: "Gamma",
        data_points: [
          { date: "06/05/26", choice_a: 60, choice_b: 12, choice_c: 9 },
          { date: "06/07/26", choice_a: 62, choice_b: 12, choice_c: 1.3 },
        ],
      }),
    );
  });

  it("writes the config url after type", async () => {
    expect(await runExtractAll([await writeConfig(politicoConfig())])).toBe(0);
    expect(await readOutput()).toBe(
      textOf({
        title: MACRON_TITLE_TYPED,
        ...FIXED,
        type: "politico line graph",
        url: POLITICO_URL,
        oldest_age_in_days: 365,
        choice_a: "Approve",
        choice_b: "Disapprove",
        data_points: [
          { date: "09/01/26", choice_a: 17, choice_b: 80 },
          { date: "09/02/26", choice_a: 18, choice_b: 79 },
          { date: "09/03/26", choice_a: 19, choice_b: 78 },
        ],
      }),
    );
  });

  it("never prints the creator email", async () => {
    for (const lines of [cnnConfig(), polymarketConfig(), politicoConfig()]) {
      expect(await runExtractAll([await writeConfig(lines)])).toBe(0);
    }
    expect([...output.stdout, ...output.stderr].join("\n")).not.toContain("devadmin01@crowdpoll.vote");
  });
});

describe("extract-all: failures", () => {
  const OLD_OUTPUT = "{\"old\":true}\n";
  const CNN_STATE = "{&quot;title&quot;:&quot;Approval&quot;}";

  async function expectFailure(args: string[], message: string | { prefix: string }): Promise<void> {
    await fs.writeFile(inWorkDir("out.json"), OLD_OUTPUT, "utf8");
    expect(await runExtractAll(args)).toBe(1);
    expect(output.stderr).toHaveLength(1);
    if (typeof message === "string") expect(output.stderr[0]).toBe(message);
    else expect(output.stderr[0]!.startsWith(message.prefix)).toBe(true);
    expect(await readOutput()).toBe(OLD_OUTPUT);
    output.stderr.length = 0;
  }

  async function writePage(name: string, html: string): Promise<string> {
    await fs.writeFile(inWorkDir(name), html, "utf8");
    return inWorkDir(name);
  }

  it("prints the usage unless given exactly one argument", async () => {
    await expectFailure([], "Usage: npm run extract-all <config.yaml>");
    await expectFailure(["a.yaml", "b.yaml"], "Usage: npm run extract-all <config.yaml>");
  });

  it("reports a config that cannot be read or holds an unknown key", async () => {
    const missing = inWorkDir("missing.yaml");
    await expectFailure([missing], { prefix: `Error: cannot read config ${missing}: ` });
    const unknown = await writeConfig(cnnConfig("out.json", ["graph_type: cnn"]));
    await expectFailure([unknown], `Error: invalid config ${unknown}: unknown key "graph_type"`);
  });

  it("rejects a url that is not an absolute http or https address", async () => {
    for (const url of ["politico.eu/france", "ftp://x"]) {
      const configPath = await writeConfig(cnnConfig("out.json", [`url: ${url}`]));
      await expectFailure([configPath], `Error: invalid config ${configPath}: "url" must be an absolute http or https address`);
    }
  });

  it("refuses an output path that is the page, the HAR or the config", async () => {
    await expectFailure(
      [await writeConfig(["graph_title: T", "input_html: line-graphs.html", "output_json: line-graphs.html"])],
      `Error: output would overwrite the input file ${inWorkDir("line-graphs.html")}`,
    );
    await expectFailure(
      [await writeConfig(["graph_title: T", "input_html: line-graphs.html", "input_history: polymarket.har", "output_json: polymarket.har"])],
      `Error: output would overwrite the history file ${inWorkDir("polymarket.har")}`,
    );
    const configPath = await writeConfig(["graph_title: T", "input_html: line-graphs.html", "output_json: run.yaml"]);
    await expectFailure([configPath], `Error: output would overwrite the config file ${configPath}`);
    expect(output.stdout).toEqual([]);
  });

  it("rejects an unsupported url host before reading the page", async () => {
    const configPath = await writeConfig(["url: https://example.com/x", "graph_title: T", "input_html: missing.html", "output_json: out.json"]);
    await expectFailure([configPath], "Error: unsupported url host example.com; supported: cnn.com, polymarket.com, politico.eu");
  });

  it("rejects a page that does not match the url", async () => {
    const cnnPage = inWorkDir("line-graphs.html");
    await expectFailure(
      [await writeConfig([`url: ${POLITICO_URL}`, "graph_title: T", "input_html: line-graphs.html", "output_json: out.json"])],
      `Error: page ${cnnPage} does not match url www.politico.eu: it looks like a CNN page`,
    );
    const blank = await writePage("blank.html", "<html><head><title>Hello</title></head><body></body></html>");
    await expectFailure(
      [await writeConfig(["url: https://www.cnn.com/polling", "graph_title: T", "input_html: blank.html", "output_json: out.json"])],
      `Error: page ${blank} does not match url www.cnn.com: it looks like no known page type`,
    );
  });

  it("reports a page whose type cannot be detected, with the markers found", async () => {
    const blank = await writePage("blank.html", "<html><head><title>Hello</title></head><body></body></html>");
    await expectFailure(
      [await writeConfig(["graph_title: T", "input_html: blank.html", "output_json: out.json"])],
      `Error: cannot detect the graph type of ${blank}; markers found: none`,
    );
    const both = await writePage("both.html", `<html><head><title>Polymarket | X</title></head><body><div data-state="${CNN_STATE}"></div></body></html>`);
    await expectFailure(
      [await writeConfig(["graph_title: T", "input_html: both.html", "output_json: out.json"])],
      `Error: cannot detect the graph type of ${both}; markers found: CNN chart data, Polymarket title`,
    );
  });

  it("requires input_history for a Polymarket page", async () => {
    const configPath = await writeConfig(["graph_title: \"AI race\"", "input_html: polymarket-page.html", "output_json: out.json"]);
    await expectFailure([configPath], `Error: invalid config ${configPath}: missing key "input_history"`);
  });

  it("reports the type's own error for a supported page without the chart", async () => {
    const article = await writePage("article.html", "<html><head><link rel=\"canonical\" href=\"https://www.cnn.com/2026/article\"></head><body></body></html>");
    await expectFailure(
      [await writeConfig(["graph_title: T", "input_html: article.html", "output_json: out.json"])],
      `Error: graph "T" not found in ${article}; graphs found: none`,
    );
  });
});

describe("extract-all: type in the config", () => {
  const OLD_OUTPUT = "{\"old\":true}\n";
  const UNSUPPORTED = "supported: polymarket yes no, polymarket line graph, cnn line graph, politico line graph";

  async function expectFailure(configPath: string, message: string | { prefix: string }): Promise<void> {
    await fs.writeFile(inWorkDir("out.json"), OLD_OUTPUT, "utf8");
    expect(await runExtractAll([configPath])).toBe(1);
    expect(output.stderr).toHaveLength(1);
    if (typeof message === "string") expect(output.stderr[0]).toBe(message);
    else expect(output.stderr[0]!.startsWith(message.prefix)).toBe(true);
    expect(await readOutput()).toBe(OLD_OUTPUT);
  }

  it("runs the named line-graph extraction and writes the same file as without type", async () => {
    const cases: [string[], string, string][] = [
      [cnnConfig(), "cnn line graph", "Detected CNN page"],
      [polymarketConfig(), "polymarket line graph", "Detected Polymarket page"],
      [politicoConfig(), "politico line graph", "Detected Politico page"],
    ];
    for (const [lines, type, detected] of cases) {
      expect(await runExtractAll([await writeConfig(lines, "detected.yaml")])).toBe(0);
      const withoutType = await readOutput();
      output.stdout.length = 0;
      expect(await runExtractAll([await writeConfig([...lines, `type: ${type}`])])).toBe(0);
      expect(await readOutput()).toBe(withoutType);
      expect(output.stdout).toContain(`Using type ${type}`);
      expect(output.stdout).not.toContain(detected);
      output.stdout.length = 0;
    }
  });

  it("accepts a type written with other capitals and surrounding spaces", async () => {
    expect(await runExtractAll([await writeConfig(cnnConfig("out.json", ["type: \"CNN Line Graph \""]))])).toBe(0);
    expect(output.stdout).toContain("Using type cnn line graph");
  });

  it("skips detection when type is given", async () => {
    const page = await fs.readFile(inWorkDir("line-graphs.html"), "utf8");
    await fs.writeFile(inWorkDir("both.html"), page.replace(/<head[^>]*>/, "$&<title>Polymarket | X</title>"), "utf8");
    const lines = ["graph_title: \"Approval over time\"", "input_html: both.html", "output_json: out.json"];
    expect(await runExtractAll([await writeConfig(lines)])).toBe(1);
    output.stderr.length = 0;
    expect(await runExtractAll([await writeConfig([...lines, "type: cnn line graph"])])).toBe(0);
  });

  it("reports the named extraction's own error for the wrong kind of page", async () => {
    await expectFailure(await writeConfig(polymarketConfig("out.json", ["type: cnn line graph"])), {
      prefix: `Error: graph "AI race" not found in ${inWorkDir("polymarket-page.html")}`,
    });
  });

  it("requires the url to be on the type's site, before reading the page", async () => {
    const configPath = await writeConfig(["url: https://www.cnn.com/polling", "type: politico line graph", "graph_title: T", "input_html: missing.html", "output_json: out.json"]);
    await expectFailure(configPath, "Error: url host www.cnn.com does not match type \"politico line graph\"; expected politico.eu");
    expect(output.stdout).toEqual([]);
  });

  it("rejects an unsupported type before reading the page", async () => {
    await expectFailure(await writeConfig(cnnConfig("out.json", ["type: bar chart"])), `Error: unsupported type "bar chart"; ${UNSUPPORTED}`);
    expect(output.stdout).toEqual([]);
  });

  it("requires input_history for type \"polymarket line graph\", whatever the page", async () => {
    const configPath = await writeConfig(cnnConfig("out.json", ["type: polymarket line graph"]));
    await expectFailure(configPath, `Error: invalid config ${configPath}: missing key "input_history"`);
  });

  it("refuses an empty type", async () => {
    const configPath = await writeConfig(cnnConfig("out.json", ["type: \"\""]));
    await expectFailure(configPath, `Error: invalid config ${configPath}: "type" must be a non-empty string`);
  });
});

describe("extract-all: a fourth graph type", () => {
  const FAKE_GRAPH = { graph_title: "Fake", label_a: "Yes", data_points: [{ date: "01/02/26", a: 1 }] } as GraphFile;
  const fakeType: GraphType = {
    id: "fake",
    name: "Fake",
    hosts: ["example.org"],
    signature: "Fake meta",
    matchesPage: ($) => $("meta[name=\"fake-graph\"]").length > 0,
    needsHistory: false,
    detected: true,
    extract: async () => ({ graph: FAKE_GRAPH, warnings: [] }),
  };
  const TYPES = [...GRAPH_TYPES, fakeType];

  beforeEach(async () => {
    await fs.writeFile(inWorkDir("fake.html"), "<html><head><meta name=\"fake-graph\"></head><body></body></html>", "utf8");
  });

  it("detects the extra type by its url host and writes its graph", async () => {
    const configPath = await writeConfig(["url: https://www.example.org/x", "graph_title: Fake", "input_html: fake.html", "output_json: out.json"]);
    expect(await runExtractAll([configPath], TYPES)).toBe(0);
    expect(output.stdout).toContain("Detected Fake page");
    const graph = JSON.parse(await readOutput());
    expect(graph.type).toBe("fake");
    expect(graph.url).toBe("https://www.example.org/x");
    expect(graph.data_points).toEqual([{ date: "01/02/26", choice_a: 1 }]);
  });

  it("detects the extra type by its page signature without a url", async () => {
    const configPath = await writeConfig(["graph_title: Fake", "input_html: fake.html", "output_json: out.json"]);
    expect(await runExtractAll([configPath], TYPES)).toBe(0);
    expect(output.stdout).toContain("Detected Fake page");
    expect(JSON.parse(await readOutput()).type).toBe("fake");
  });
});

describe("extract-all: polldata reference samples", () => {
  const SAMPLES = [
    {
      name: "generic_midterm_ballot_over_time",
      detected: "Detected CNN page",
      files: ["generic_midterm_ballot_over_time.html"],
      settings: ["graph_title: \"CNN Poll of Polls: Generic midterm ballot over time\"", "input_html: generic_midterm_ballot_over_time.html"],
      runDedicated: runExtract,
    },
    {
      name: "best_ai_model",
      detected: "Detected Polymarket page",
      files: ["best_ai_model.html", "best_ai_model.har"],
      settings: ["graph_title: \"Which company has best AI model end of 2026?\"", "input_html: best_ai_model.html", "input_history: best_ai_model.har"],
      runDedicated: runExtractPolymarket,
    },
    {
      name: "france-president-emmanuel-macrons-approval-rating",
      detected: "Detected Politico page",
      files: ["france-president-emmanuel-macrons-approval-rating.html", "france-president-emmanuel-macrons-approval-rating.har"],
      settings: [
        `url: ${POLITICO_URL}`,
        `graph_title: "France — President Emmanuel Macron's approval rating"`,
        "input_html: france-president-emmanuel-macrons-approval-rating.html",
        "input_history: france-president-emmanuel-macrons-approval-rating.har",
      ],
      runDedicated: runExtractPolitico,
    },
  ];

  function choicesAndPoints(text: string): unknown {
    const file = JSON.parse(text) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(file).filter(([key]) => key.startsWith("choice_") || key === "data_points"));
  }

  for (const sample of SAMPLES) {
    const present = sample.files.every((file) => existsSync(path.resolve("polldata", file)));
    it.skipIf(!present)(`detects ${sample.name} and matches the dedicated command`, { timeout: 30000 }, async () => {
      for (const file of sample.files) await fs.copyFile(path.resolve("polldata", file), inWorkDir(file));
      expect(await runExtractAll([await writeConfig([...sample.settings, "output_json: all.json"], "all.yaml")])).toBe(0);
      expect(output.stdout).toContain(sample.detected);
      expect(await sample.runDedicated([await writeConfig([...sample.settings, "output_json: dedicated.json"], "dedicated.yaml")])).toBe(0);
      expect(choicesAndPoints(await readOutput("all.json"))).toEqual(choicesAndPoints(await readOutput("dedicated.json")));
    });
  }
});
