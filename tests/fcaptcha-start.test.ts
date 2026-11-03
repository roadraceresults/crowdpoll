import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { describe, expect, it } from "vitest";

const serverDir = path.resolve("fcaptcha-server");
const FCAPTCHA_NAMES = ["FCAPTCHA_SECRET", "FCAPTCHA_VERIFY_SECRET", "FCAPTCHA_SITE_KEYS", "FCAPTCHA_ALLOWED_HOSTNAMES", "FCAPTCHA_INSECURE_DEV_MODE", "REDIS_URL"];

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => resolve(port));
    });
  });
}

async function healthy(port: number): Promise<boolean> {
  try {
    return (await fetch(`http://127.0.0.1:${port}/health`)).ok;
  } catch {
    return false;
  }
}

/** Starts the launcher with only the given settings beyond the inherited environment's unrelated ones. */
function launch(settings: Record<string, string>) {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const name of [...FCAPTCHA_NAMES, "PORT", "ENV_FCAPTCHA_PORT"]) delete env[name];
  return spawn(process.execPath, ["start.js"], { cwd: serverDir, env: { ...env, ...settings }, stdio: ["ignore", "ignore", "pipe"] });
}

describe.skipIf(!existsSync(path.join(serverDir, "node_modules")))("the FCaptcha launcher", () => {
  it("starts from the ENV_FCAPTCHA_ settings alone, listening on ENV_FCAPTCHA_PORT rather than PORT", async () => {
    const [port, other] = [await freePort(), await freePort()];
    const child = launch({ ENV_FCAPTCHA_INSECURE_DEV_MODE: "1", ENV_FCAPTCHA_SITE_KEYS: "dev", ENV_FCAPTCHA_PORT: String(port), PORT: String(other) });
    try {
      let up = false;
      for (let i = 0; i < 50 && !up; i++) {
        up = await healthy(port);
        if (!up) await new Promise((r) => setTimeout(r, 200));
      }
      expect(up).toBe(true);
      expect(await healthy(other)).toBe(false);
    } finally {
      child.kill();
    }
  }, 20000);

  it("refuses to start when one of FCaptcha's own names is set", async () => {
    const child = launch({ ENV_FCAPTCHA_INSECURE_DEV_MODE: "1", ENV_FCAPTCHA_PORT: String(await freePort()), FCAPTCHA_SECRET: "x".repeat(40) });
    let stderr = "";
    child.stderr!.on("data", (chunk) => (stderr += chunk));
    const code = await new Promise<number | null>((resolve) => child.on("exit", resolve));
    expect(code).toBe(1);
    expect(stderr).toContain("FCAPTCHA_SECRET is no longer read; set ENV_FCAPTCHA_SECRET instead.");
  }, 20000);
});
