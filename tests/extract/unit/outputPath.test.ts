import path from "node:path";
import { describe, expect, it } from "vitest";
import { isSamePath, outputWouldOverwriteInput, toOutputPath } from "../../../devScripts/extract/outputPath.js";

describe("toOutputPath", () => {
  it("replaces the extension with .json", () => {
    expect(toOutputPath("page.html")).toBe("page.json");
  });

  it("replaces only the last extension", () => {
    expect(toOutputPath(path.join("dir", "a.b.html"))).toBe(path.join("dir", "a.b.json"));
  });

  it("appends .json when there is no extension", () => {
    expect(toOutputPath("page")).toBe("page.json");
  });

  it("ignores dots in folder names", () => {
    expect(toOutputPath(path.join("dir.v2", "page"))).toBe(path.join("dir.v2", "page.json"));
  });

  it("keeps the separators of the input path", () => {
    expect(toOutputPath("tests/fixtures/page.html")).toBe("tests/fixtures/page.json");
  });
});

describe("outputWouldOverwriteInput", () => {
  it.each(["page.json", "PAGE.JSON", path.join("dir", "a.Json")])("is true for %s", (inputPath) => {
    expect(outputWouldOverwriteInput(inputPath)).toBe(true);
  });

  it.each(["page.html", "page", "page.json.html"])("is false for %s", (inputPath) => {
    expect(outputWouldOverwriteInput(inputPath)).toBe(false);
  });
});

describe("isSamePath", () => {
  it.each([
    ["a.html", "a.html"],
    ["dir/../a.html", "a.html"],
    ["a.html", path.resolve("a.html")],
  ])("is true for %s and %s", (a, b) => {
    expect(isSamePath(a, b)).toBe(true);
  });

  it("is false for different files", () => {
    expect(isSamePath("a.html", "b.html")).toBe(false);
  });

  it("ignores letter case only on Windows", () => {
    expect(isSamePath("A.HTML", "a.html")).toBe(process.platform === "win32");
  });
});
