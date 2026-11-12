import path from "node:path";

export function toOutputPath(inputPath: string): string {
  const extension = path.extname(inputPath);
  return inputPath.slice(0, inputPath.length - extension.length) + ".json";
}

export function outputWouldOverwriteInput(inputPath: string): boolean {
  return path.extname(inputPath).toLowerCase() === ".json";
}

function comparablePath(filePath: string): string {
  const resolved = path.resolve(filePath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function isSamePath(a: string, b: string): boolean {
  return comparablePath(a) === comparablePath(b);
}
