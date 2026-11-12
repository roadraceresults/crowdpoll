import path from "node:path";
import { describe, expect, it } from "vitest";
import { OUTPUT_KEYS, parseGraphConfig, parseSettings } from "../../../devScripts/extract/graphConfig.js";

const configPath = path.join("cfg", "run.yaml");

describe("parseGraphConfig", () => {
  it("resolves relative paths from the config folder", () => {
    const text = "graph_title: \"Approval over time\"\ninput_html: page.html\noutput_json: out.json\n";
    expect(parseGraphConfig(text, configPath)).toEqual({
      graphTitle: "Approval over time",
      inputHtml: path.resolve("cfg", "page.html"),
      outputJson: path.resolve("cfg", "out.json"),
    });
  });

  it("keeps absolute paths", () => {
    const inputHtml = path.resolve("elsewhere", "page.html");
    const outputJson = path.resolve("elsewhere", "out.json");
    const text = `graph_title: T\ninput_html: ${JSON.stringify(inputHtml)}\noutput_json: ${JSON.stringify(outputJson)}\n`;
    expect(parseGraphConfig(text, configPath)).toEqual({ graphTitle: "T", inputHtml, outputJson });
  });
});

describe("parseGraphConfig errors", () => {
  const VALID = { graph_title: "T", input_html: "page.html", output_json: "out.json" };

  function yamlOf(record: Record<string, unknown>): string {
    return Object.entries(record)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join("\n");
  }

  it("rejects text that is not YAML", () => {
    expect(() => parseGraphConfig("graph_title: [unclosed", configPath)).toThrow();
  });

  it("rejects a document that is not a mapping", () => {
    for (const text of ["just text", "", "null"]) {
      expect(() => parseGraphConfig(text, configPath)).toThrow("expected a mapping");
    }
  });

  it("names a missing key", () => {
    for (const key of Object.keys(VALID)) {
      const { [key as keyof typeof VALID]: _, ...rest } = VALID;
      expect(() => parseGraphConfig(yamlOf(rest), configPath)).toThrow(`missing key "${key}"`);
    }
  });

  it("names a key whose value is empty or not a string", () => {
    for (const value of ["", 5, ["a"]]) {
      expect(() => parseGraphConfig(yamlOf({ ...VALID, input_html: value }), configPath)).toThrow(
        "\"input_html\" must be a non-empty string",
      );
    }
  });

  it("names an unknown key", () => {
    expect(() => parseGraphConfig(yamlOf({ ...VALID, input_htm: "x" }), configPath)).toThrow("unknown key \"input_htm\"");
  });
});

describe("parseGraphConfig list form", () => {
  const MAPPING = "graph_title: \"Approval over time\"\ninput_html: page.html\noutput_json: out.json\n";

  it("reads the requirements example, a list of single settings, like the mapping", () => {
    const list = "- graph_title: \"Approval over time\"\n- input_html: page.html\n- output_json: out.json\n";
    expect(parseGraphConfig(list, configPath)).toEqual(parseGraphConfig(MAPPING, configPath));
  });

  it("accepts the settings in any order", () => {
    const list = "- output_json: out.json\n- graph_title: \"Approval over time\"\n- input_html: page.html\n";
    expect(parseGraphConfig(list, configPath)).toEqual(parseGraphConfig(MAPPING, configPath));
  });

  it("rejects a setting given twice", () => {
    const list = "- graph_title: A\n- graph_title: B\n- input_html: page.html\n- output_json: out.json\n";
    expect(() => parseGraphConfig(list, configPath)).toThrow("repeated key \"graph_title\"");
  });

  it("names an entry that is not a single setting", () => {
    expect(() => parseGraphConfig("- graph_title: A\n- just text\n", configPath)).toThrow(
      "list entry 2 must be a single \"key: value\" setting",
    );
    expect(() => parseGraphConfig("- { graph_title: A, input_html: b }\n", configPath)).toThrow(
      "list entry 1 must be a single \"key: value\" setting",
    );
  });

  it("reports a missing key for an empty list", () => {
    expect(() => parseGraphConfig("[]", configPath)).toThrow("missing key \"graph_title\"");
  });
});

describe("parseSettings", () => {
  const KEYS = ["graph_title", "input_html", "input_history", "output_json"];
  const SETTINGS = { graph_title: "T", input_html: "page.html", input_history: "page.har", output_json: "out.json" };

  it("reads four keys from a mapping", () => {
    const text = "graph_title: T\ninput_html: page.html\ninput_history: page.har\noutput_json: out.json\n";
    expect(parseSettings(text, KEYS)).toEqual(SETTINGS);
  });

  it("reads four keys from a list of single settings", () => {
    const text = "- graph_title: T\n- input_html: page.html\n- input_history: page.har\n- output_json: out.json\n";
    expect(parseSettings(text, KEYS)).toEqual(SETTINGS);
  });

  it("names a missing fourth key", () => {
    expect(() => parseSettings("graph_title: T\ninput_html: page.html\noutput_json: out.json\n", KEYS)).toThrow(
      "missing key \"input_history\"",
    );
  });

  it("names an unknown key", () => {
    const text = "graph_title: T\ninput_html: page.html\ninput_histroy: page.har\noutput_json: out.json\n";
    expect(() => parseSettings(text, KEYS)).toThrow("unknown key \"input_histroy\"");
  });

  it("lists the four keys when the document is not a mapping", () => {
    expect(() => parseSettings("just text", KEYS)).toThrow(
      "expected a mapping with the keys \"graph_title\", \"input_html\", \"input_history\" and \"output_json\"",
    );
  });

  it("lists three keys as before", () => {
    expect(() => parseSettings("just text", ["graph_title", "input_html", "output_json"])).toThrow(
      "expected a mapping with the keys \"graph_title\", \"input_html\" and \"output_json\"",
    );
  });
});

describe("parseSettings optional keys", () => {
  const KEYS = ["url", "graph_title", "input_html", "input_history", "output_json"];
  const OPTIONAL = ["url", "input_history"];

  it("accepts a config without the optional keys", () => {
    const text = "graph_title: T\ninput_html: page.html\noutput_json: out.json\n";
    expect(parseSettings(text, KEYS, OPTIONAL)).toEqual({ graph_title: "T", input_html: "page.html", output_json: "out.json" });
  });

  it("reads the optional keys when they are given", () => {
    const text = "url: https://x.org/\ngraph_title: T\ninput_html: page.html\ninput_history: page.har\noutput_json: out.json\n";
    expect(parseSettings(text, KEYS, OPTIONAL)).toEqual({
      url: "https://x.org/",
      graph_title: "T",
      input_html: "page.html",
      input_history: "page.har",
      output_json: "out.json",
    });
  });

  it("still names a missing required key", () => {
    expect(() => parseSettings("graph_title: T\ninput_html: page.html\n", KEYS, OPTIONAL)).toThrow("missing key \"output_json\"");
  });

  it("still rejects an unknown key, a repeated key and an empty optional value", () => {
    expect(() => parseSettings("graph_title: T\ninput_html: p\noutput_json: o\nurl2: x\n", KEYS, OPTIONAL)).toThrow("unknown key \"url2\"");
    expect(() => parseSettings("- graph_title: T\n- url: a\n- url: b\n", KEYS, OPTIONAL)).toThrow("repeated key \"url\"");
    expect(() => parseSettings("graph_title: T\ninput_html: p\noutput_json: o\nurl: \"\"\n", KEYS, OPTIONAL)).toThrow(
      "\"url\" must be a non-empty string",
    );
  });

  it("treats every key as required when no optional keys are given", () => {
    expect(() => parseSettings("graph_title: T\ninput_html: p\noutput_json: o\n", KEYS)).toThrow("missing key \"url\"");
  });
});

describe("parseSettings output keys", () => {
  const KEYS = ["graph_title", "input_html", "output_json", ...OUTPUT_KEYS];
  const REQUIRED = "graph_title: T\ninput_html: page.html\noutput_json: out.json\n";

  it("accepts a config without type, title and subtitle", () => {
    expect(parseSettings(REQUIRED, KEYS, OUTPUT_KEYS)).toEqual({ graph_title: "T", input_html: "page.html", output_json: "out.json" });
  });

  it("reads type, title and subtitle when given", () => {
    const text = `${REQUIRED}type: cnn line graph\ntitle: Who wins?\nsubtitle: Demo\n`;
    expect(parseSettings(text, KEYS, OUTPUT_KEYS)).toMatchObject({ type: "cnn line graph", title: "Who wins?", subtitle: "Demo" });
  });

  it("rejects an empty type, title or subtitle", () => {
    for (const key of OUTPUT_KEYS) {
      expect(() => parseSettings(`${REQUIRED}${key}: ""\n`, KEYS, OUTPUT_KEYS)).toThrow(`"${key}" must be a non-empty string`);
    }
  });
});
