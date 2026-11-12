import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { vi } from "vitest";

const fixturesDir = fileURLToPath(new URL("../fixtures/", import.meta.url));

export function createWorkDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "htmlparser-"));
}

export async function copyFixture(workDir: string, name: string): Promise<string> {
  const copyPath = path.join(workDir, name);
  await fs.copyFile(path.join(fixturesDir, name), copyPath);
  return copyPath;
}

export function removeWorkDir(workDir: string): Promise<void> {
  return fs.rm(workDir, { recursive: true, force: true });
}

export function captureConsole(): { stdout: string[]; stderr: string[]; restore(): void } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const logSpy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    stdout.push(args.join(" "));
  });
  const errorSpy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    stderr.push(args.join(" "));
  });
  return {
    stdout,
    stderr,
    restore() {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    },
  };
}
