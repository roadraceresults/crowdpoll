import fs from "node:fs/promises";

export async function writeFileAtomically(filePath: string, data: string | Uint8Array): Promise<void> {
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  try {
    await fs.writeFile(tmpPath, data);
    // https://nodejs.org/api/fs.html#fspromisesrenameoldpath-newpath
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    await fs.rm(tmpPath, { force: true }).catch(() => {});
    throw error;
  }
}
