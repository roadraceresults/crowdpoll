import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeFileAtomically } from "../../../devScripts/extract/writeFileAtomically.js";

let workDir: string;

beforeEach(async () => {
  workDir = await fs.mkdtemp(path.join(os.tmpdir(), "htmlparser-"));
});

afterEach(async () => {
  await fs.rm(workDir, { recursive: true, force: true });
});

async function tmpFilesIn(dir: string): Promise<string[]> {
  return (await fs.readdir(dir)).filter((name) => name.endsWith(".tmp"));
}

describe("writeFileAtomically", () => {
  it("writes a string as UTF-8", async () => {
    const filePath = path.join(workDir, "page.html");
    await writeFileAtomically(filePath, "Café");
    expect(await fs.readFile(filePath, "utf8")).toBe("Café");
  });

  it("writes bytes byte for byte", async () => {
    const filePath = path.join(workDir, "page.html");
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x3c, 0x00, 0xff]);
    await writeFileAtomically(filePath, bytes);
    expect(new Uint8Array(await fs.readFile(filePath))).toEqual(bytes);
  });

  it("replaces an existing file", async () => {
    const filePath = path.join(workDir, "page.html");
    await fs.writeFile(filePath, "old", "utf8");
    await writeFileAtomically(filePath, "new");
    expect(await fs.readFile(filePath, "utf8")).toBe("new");
  });

  it("rejects and leaves no temp file when the target is a directory", async () => {
    const filePath = path.join(workDir, "page.html");
    await fs.mkdir(filePath);
    await expect(writeFileAtomically(filePath, "new")).rejects.toThrow();
    expect(await tmpFilesIn(workDir)).toEqual([]);
  });
});
