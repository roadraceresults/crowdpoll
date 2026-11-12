import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatJson, writeJsonFile } from "../../../devScripts/extract/writeJsonFile.js";

let workDir: string;

beforeEach(async () => {
  workDir = await fs.mkdtemp(path.join(os.tmpdir(), "htmlparser-"));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(workDir, { recursive: true, force: true });
});

async function tmpFilesIn(dir: string): Promise<string[]> {
  return (await fs.readdir(dir)).filter((name) => name.endsWith(".tmp"));
}

describe("formatJson", () => {
  it("pretty-prints with 2-space indentation and a trailing newline", () => {
    expect(formatJson({ titles: [{ title: "A", headings: ["b"] }] })).toBe(
      "{\n  \"titles\": [\n    {\n      \"title\": \"A\",\n      \"headings\": [\n        \"b\"\n      ]\n    }\n  ]\n}\n",
    );
  });

  it("writes non-ASCII characters directly", () => {
    const json = formatJson({ titles: [{ title: "Café 🚀", headings: ["x"] }] });
    expect(json).toContain("Café 🚀");
    expect(json).not.toContain("\\u");
  });
});

describe("writeJsonFile", () => {
  it("writes the formatted JSON as UTF-8", async () => {
    const outputPath = path.join(workDir, "page.json");
    const value = { titles: [{ title: "Café", headings: ["é"] }] };
    await writeJsonFile(outputPath, value);
    expect(await fs.readFile(outputPath, "utf8")).toBe(formatJson(value));
  });

  it("replaces an existing file", async () => {
    const outputPath = path.join(workDir, "page.json");
    await fs.writeFile(outputPath, "old", "utf8");
    await writeJsonFile(outputPath, { titles: [] });
    expect(await fs.readFile(outputPath, "utf8")).toBe(formatJson({ titles: [] }));
  });

  it("leaves the previous file and no temp file when the rename fails", async () => {
    const outputPath = path.join(workDir, "page.json");
    await fs.writeFile(outputPath, "old", "utf8");
    vi.spyOn(fs, "rename").mockRejectedValueOnce(new Error("rename failed"));
    await expect(writeJsonFile(outputPath, { titles: [] })).rejects.toThrow("rename failed");
    expect(await fs.readFile(outputPath, "utf8")).toBe("old");
    expect(await tmpFilesIn(workDir)).toEqual([]);
  });

  it("leaves no temp file when writing fails", async () => {
    const outputPath = path.join(workDir, "page.json");
    vi.spyOn(fs, "writeFile").mockRejectedValueOnce(new Error("disk full"));
    await expect(writeJsonFile(outputPath, { titles: [] })).rejects.toThrow("disk full");
    expect(await tmpFilesIn(workDir)).toEqual([]);
  });

  it("leaves no temp file after a successful write", async () => {
    await writeJsonFile(path.join(workDir, "page.json"), { titles: [] });
    expect(await tmpFilesIn(workDir)).toEqual([]);
  });
});
