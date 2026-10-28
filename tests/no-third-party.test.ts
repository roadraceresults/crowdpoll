import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicDir = path.resolve("src/public");
const pages = readdirSync(publicDir).filter((name) => name.endsWith(".html"));
const sheets = readdirSync(publicDir).filter((name) => name.endsWith(".css"));
const ABSOLUTE = /^(https?:)?\/\//;

describe("no page loads anything from another origin (FR-023, SC-005)", () => {
  for (const name of pages) {
    it(`${name} loads only CrowdPoll's own resources, fonts included`, () => {
      const html = readFileSync(path.join(publicDir, name), "utf8");
      const loaded = [
        ...[...html.matchAll(/<link\b[^>]*\bhref="([^"]+)"/g)].map((m) => m[1]!),
        ...[...html.matchAll(/<(?:script|img)\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]!)
      ];
      expect(loaded.filter((ref) => ABSOLUTE.test(ref))).toEqual([]);
      expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
      expect(html).toContain('<link rel="stylesheet" href="/fonts/fonts.css">');
    });
  }

  for (const name of [...sheets, "fonts/fonts.css"]) {
    it(`${name} imports nothing from another origin`, () => {
      const css = readFileSync(path.join(publicDir, name), "utf8");
      const refs = [...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)|@import\s+["']([^"']+)["']/g)].map((m) => (m[1] ?? m[2])!);
      expect(refs.filter((ref) => ABSOLUTE.test(ref))).toEqual([]);
    });
  }

  it("serves every font the font sheet names", () => {
    const css = readFileSync(path.join(publicDir, "fonts", "fonts.css"), "utf8");
    const files = [...css.matchAll(/url\("\/fonts\/([^"]+)"\)/g)].map((m) => m[1]!);
    expect(files.length).toBeGreaterThanOrEqual(6);
    for (const file of files) expect(existsSync(path.join(publicDir, "fonts", file)), file).toBe(true);
  });
});
