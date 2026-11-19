/**
 * Builds dist/public from src/public: the site's own scripts, style sheets and pages
 * transformed (unless ENV_OBFUSCATE_ASSETS=off), and a content-addressed copy of every
 * asset under dist/public/assets/<hash>/<name>, with a manifest the page routes use to
 * rewrite asset references. `--source-maps` also writes private maps to dist-maps/.
 * Run by `npm run build`.
 */
import path from "node:path";
import { buildAssets } from "./assetTransform.js";

buildAssets({
  sourceDir: path.resolve("src/public"),
  targetDir: path.resolve("dist/public"),
  mapsDir: path.resolve("dist-maps"),
  env: process.env,
  sourceMaps: process.argv.includes("--source-maps"),
  log: console.log
}).catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
