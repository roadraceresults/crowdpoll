/**
 * Runs the FCaptcha server in fcaptcha-server/ for local development, installing its packages on first use.
 * Usage: npm run fcaptcha   (from the repository root)
 * Settings already in the session win; the rest default to the site key "dev", host localhost and port 3001.
 * The web app's ENV_FCAPTCHA_VERIFY_SECRET must equal this server's; when the session has none, one is generated and
 * printed for the web app. The signing secret never leaves the server, so a missing one is generated silently.
 */
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SERVER_DIR = path.resolve("fcaptcha-server");

/** The environment the server starts with, and the verify secret when it was generated here. */
export function devEnv(env: NodeJS.ProcessEnv, randomHex: () => string): { env: NodeJS.ProcessEnv; generatedVerifySecret?: string } {
  const out: NodeJS.ProcessEnv = {
    ...env,
    ENV_FCAPTCHA_SITE_KEYS: env.ENV_FCAPTCHA_SITE_KEYS || "dev",
    ENV_FCAPTCHA_ALLOWED_HOSTNAMES: env.ENV_FCAPTCHA_ALLOWED_HOSTNAMES || "localhost",
    ENV_FCAPTCHA_PORT: env.ENV_FCAPTCHA_PORT || "3001",
    ENV_FCAPTCHA_SECRET: env.ENV_FCAPTCHA_SECRET || randomHex()
  };
  if (env.ENV_FCAPTCHA_VERIFY_SECRET) return { env: out };
  const generatedVerifySecret = randomHex();
  return { env: { ...out, ENV_FCAPTCHA_VERIFY_SECRET: generatedVerifySecret }, generatedVerifySecret };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!existsSync(path.join(SERVER_DIR, "node_modules"))) {
    const install = spawnSync("npm", ["ci"], { cwd: SERVER_DIR, stdio: "inherit", shell: true });
    if (install.status !== 0) process.exit(install.status ?? 1);
  }
  const { env, generatedVerifySecret } = devEnv(process.env, () => randomBytes(32).toString("hex"));
  if (generatedVerifySecret) {
    console.log(`Set the web app's ENV_FCAPTCHA_VERIFY_SECRET to ${generatedVerifySecret}`);
    console.log("(or set ENV_FCAPTCHA_VERIFY_SECRET in this session first, to keep one value across runs)");
  }
  console.log(`FCaptcha at http://localhost:${env.ENV_FCAPTCHA_PORT}, site key ${env.ENV_FCAPTCHA_SITE_KEYS}`);
  const server = spawn(process.execPath, ["start.js"], { cwd: SERVER_DIR, env, stdio: "inherit" });
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => server.kill(signal));
  server.on("exit", (code) => process.exit(code ?? 0));
}
