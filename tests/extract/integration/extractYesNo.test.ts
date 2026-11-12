import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runExtractYesNo } from "../../../devScripts/extract/extractAllCli.js";
import { captureConsole, copyFixture, createWorkDir, removeWorkDir } from "./helpers.js";

const TITLE = "Dancing with the Stars S35: Winner?";
const URL = "https://polymarket.com/event/who-will-win-dancing-with-the-stars-season-35";
const OLD_OUTPUT = "{\"old\":true}\n";

let workDir: string;
let output: ReturnType<typeof captureConsole>;
let fetchSpy: ReturnType<typeof vi.fn>;

function inWorkDir(name: string): string {
  return path.join(workDir, name);
}

async function writeConfig(extra: string[] = [], name = "run.yaml"): Promise<string> {
  const lines = [`graph_title: "${TITLE}"`, "input_html: page.html", "output_json: out.json", ...extra];
  await fs.writeFile(inWorkDir(name), lines.join("\n") + "\n", "utf8");
  return inWorkDir(name);
}

async function readOutput(): Promise<Record<string, unknown>> {
  return JSON.parse(await fs.readFile(inWorkDir("out.json"), "utf8")) as Record<string, unknown>;
}

async function expectFailure(args: string[], message: string): Promise<void> {
  await fs.writeFile(inWorkDir("out.json"), OLD_OUTPUT, "utf8");
  expect(await runExtractYesNo(args)).toBe(1);
  expect(output.stderr).toEqual([message]);
  expect(await fs.readFile(inWorkDir("out.json"), "utf8")).toBe(OLD_OUTPUT);
  output.stderr.length = 0;
}

beforeEach(async () => {
  workDir = await createWorkDir();
  await fs.copyFile(await copyFixture(workDir, "polymarket-yes-no.html"), inWorkDir("page.html"));
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-08T15:00:00Z"));
  fetchSpy = vi.fn(() => {
    throw new Error("network access");
  });
  vi.stubGlobal("fetch", fetchSpy);
  output = captureConsole();
});

afterEach(async () => {
  output.restore();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  await removeWorkDir(workDir);
});

describe("extract-polymarket-yes-no", () => {
  it("prints the usage unless given exactly one argument", async () => {
    await expectFailure([], "Usage: npm run extract-polymarket-yes-no <config.yaml>");
    await expectFailure(["a.yaml", "b.yaml"], "Usage: npm run extract-polymarket-yes-no <config.yaml>");
  });

  it("reads the page and writes one choice per outcome with one data point", async () => {
    const configPath = await writeConfig([`url: ${URL}`]);
    expect(await runExtractYesNo([configPath])).toBe(0);
    expect(output.stdout).toEqual([
      `Read config ${configPath}`,
      `Read page ${inWorkDir("page.html")}`,
      `Found graph "${TITLE}": Ezra Frech, Connor Wood, Taylor Hanson, Tyler Cameron; 1 data point`,
      `Wrote ${inWorkDir("out.json")}`,
    ]);
    expect(output.stderr).toEqual([]);
    const file = await readOutput();
    expect(Object.keys(file)).toEqual([
      "title", "subtitle", "poll_creator_email", "vote_count", "type", "url", "oldest_age_in_days",
      "choice_a", "choice_b", "choice_c", "choice_d", "data_points",
    ]);
    expect(file).toMatchObject({
      title: TITLE,
      subtitle: "Poll for Demonstration",
      type: "polymarket yes no",
      url: URL,
      oldest_age_in_days: 365,
      choice_a: "Ezra Frech",
      choice_d: "Tyler Cameron",
      data_points: [{ date: "11/08/26", choice_a: 63, choice_b: 7.5, choice_c: 0.1, choice_d: 0 }],
    });
    expect(file).not.toHaveProperty("poll creator email");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("writes the config title and subtitle", async () => {
    const configPath = await writeConfig(["title: \"Who wins DWTS?\"", "subtitle: Demo"]);
    expect(await runExtractYesNo([configPath])).toBe(0);
    expect(output.stdout).toContain("Found graph \"Who wins DWTS?\": Ezra Frech, Connor Wood, Taylor Hanson, Tyler Cameron; 1 data point");
    expect(await readOutput()).toMatchObject({ title: "Who wins DWTS?", subtitle: "Demo" });
  });

  it("never opens input_history", async () => {
    expect(await runExtractYesNo([await writeConfig(["input_history: missing.har"])])).toBe(0);
  });

  it("accepts its own type in any case", async () => {
    expect(await runExtractYesNo([await writeConfig(["type: \" Polymarket Yes No \""])])).toBe(0);
    expect(output.stdout.some((line) => line.startsWith("Using type") || line.startsWith("Detected"))).toBe(false);
  });

  it("refuses another type, an unsupported type and a url off polymarket.com", async () => {
    await expectFailure(
      [await writeConfig(["type: cnn line graph"])],
      "Error: type \"cnn line graph\" is not supported by extract-polymarket-yes-no; it extracts \"polymarket yes no\"; use extract-all for other types",
    );
    await expectFailure(
      [await writeConfig(["type: bar chart"])],
      "Error: unsupported type \"bar chart\"; supported: polymarket yes no, polymarket line graph, cnn line graph, politico line graph",
    );
    await expectFailure(
      [await writeConfig(["url: https://www.cnn.com/polling"])],
      "Error: url host www.cnn.com does not match type \"polymarket yes no\"; expected polymarket.com",
    );
  });

  it("reports an event title that does not match", async () => {
    const configPath = inWorkDir("other.yaml");
    await fs.writeFile(configPath, "graph_title: Something else\ninput_html: page.html\noutput_json: out.json\n", "utf8");
    await expectFailure(
      [configPath],
      `Error: graph "Something else" not found in ${inWorkDir("page.html")}; the page's event is "${TITLE}"`,
    );
  });

  it("never prints the creator email", async () => {
    expect(await runExtractYesNo([await writeConfig()])).toBe(0);
    expect([...output.stdout, ...output.stderr].join("\n")).not.toContain("devadmin01@crowdpoll.vote");
  });

  it("writes the event a page was saved on after moving to it within Polymarket", async () => {
    await fs.copyFile(await copyFixture(workDir, "polymarket-yes-no-navigated.html"), inWorkDir("page.html"));
    const lines = ["graph_title: \"NBA: 2027 Champion\"", "input_html: page.html", "output_json: out.json"];
    await fs.writeFile(inWorkDir("nba.yaml"), lines.join("\n") + "\n", "utf8");
    expect(await runExtractYesNo([inWorkDir("nba.yaml")])).toBe(0);
    expect(output.stdout).toContain("Found graph \"NBA: 2027 Champion\": San Antonio Spurs, Philadelphia 76ers, Milwaukee Bucks; 1 data point");
    expect(await readOutput()).toMatchObject({
      title: "NBA: 2027 Champion",
      choice_a: "San Antonio Spurs",
      choice_c: "Milwaukee Bucks",
      data_points: [{ choice_a: 22, choice_b: 13.4, choice_c: 0 }],
    });
  });
});
