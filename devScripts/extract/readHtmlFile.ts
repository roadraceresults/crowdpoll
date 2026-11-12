import fs from "node:fs/promises";

const BYTE_ORDER_MARK = 0xfeff;

export async function readHtmlFile(filePath: string): Promise<string> {
  // https://nodejs.org/api/fs.html#fspromisesreadfilepath-options
  const text = await fs.readFile(filePath, "utf8");
  return text.charCodeAt(0) === BYTE_ORDER_MARK ? text.slice(1) : text;
}
