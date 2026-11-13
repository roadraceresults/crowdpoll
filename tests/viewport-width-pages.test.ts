/**
 * Every page's head carries what the viewport rule needs: the static viewport declaration, and viewportWidth.js
 * loaded synchronously before the first stylesheet.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicDir = path.resolve("src/public");
const pages = readdirSync(publicDir).filter((name) => name.endsWith(".html"));

const VIEWPORT_META = '<meta name="viewport" content="width=device-width, initial-scale=1">';
const VIEWPORT_SCRIPT = '<script src="/viewportWidth.js"></script>';
const COLOR_SCHEME_SCRIPT = '<script src="/colorScheme.js"></script>';

describe("the viewport rule in every page's head", () => {
  it("covers all 13 pages", () => {
    expect(pages).toHaveLength(13);
  });

  it.each(pages)("%s keeps the static viewport declaration", (name) => {
    expect(readFileSync(path.join(publicDir, name), "utf8")).toContain(VIEWPORT_META);
  });

  it.each(pages)("%s loads viewportWidth.js once, synchronously, on the line after colorScheme.js", (name) => {
    const lines = readFileSync(path.join(publicDir, name), "utf8").split(/\r?\n/).map((line) => line.trim());
    const scriptLines = lines.filter((line) => line.includes("viewportWidth.js"));
    expect(scriptLines).toEqual([VIEWPORT_SCRIPT]);
    expect(lines[lines.indexOf(VIEWPORT_SCRIPT) - 1]).toBe(COLOR_SCHEME_SCRIPT);
  });

  it.each(pages)("%s loads it after the viewport declaration and before the first stylesheet", (name) => {
    const html = readFileSync(path.join(publicDir, name), "utf8");
    const script = html.indexOf(VIEWPORT_SCRIPT);
    expect(script).toBeGreaterThan(html.indexOf(VIEWPORT_META));
    expect(script).toBeLessThan(html.indexOf('<link rel="stylesheet"'));
  });
});
