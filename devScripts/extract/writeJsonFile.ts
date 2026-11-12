import { writeFileAtomically } from "./writeFileAtomically.js";

export function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}

export function writeJsonFile(outputPath: string, value: unknown): Promise<void> {
  return writeFileAtomically(outputPath, formatJson(value));
}
