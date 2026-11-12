import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readHtmlFile } from "../../../devScripts/extract/readHtmlFile.js";

let workDir: string;

beforeEach(async () => {
  workDir = await fs.mkdtemp(path.join(os.tmpdir(), "htmlparser-"));
});

afterEach(async () => {
  await fs.rm(workDir, { recursive: true, force: true });
});

describe("readHtmlFile", () => {
  it("returns the UTF-8 text of the file", async () => {
    const filePath = path.join(workDir, "page.html");
    const html = "<p>Café – ✓ 🚀</p>";
    await fs.writeFile(filePath, html, "utf8");
    expect(await readHtmlFile(filePath)).toBe(html);
  });

  it("ignores a leading byte-order mark", async () => {
    const filePath = path.join(workDir, "bom.html");
    await fs.writeFile(filePath, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("<p>é</p>", "utf8")]));
    expect(await readHtmlFile(filePath)).toBe("<p>é</p>");
  });

  it("keeps a byte-order mark that is not the first character", async () => {
    const filePath = path.join(workDir, "inner-bom.html");
    const html = `<p>a${String.fromCharCode(0xfeff)}b</p>`;
    await fs.writeFile(filePath, html, "utf8");
    expect(await readHtmlFile(filePath)).toBe(html);
  });

  it("rejects for a missing file", async () => {
    await expect(readHtmlFile(path.join(workDir, "missing.html"))).rejects.toThrow();
  });
});
