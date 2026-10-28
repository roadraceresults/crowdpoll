/**
 * Copies src/public into dist/public and adds a content-addressed copy of every
 * asset under dist/public/assets/<hash>/<name>, with a manifest the page routes
 * use to rewrite asset references. Run by `npm run build`.
 */
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const source = path.resolve("src/public");
const target = path.resolve("dist/public");
const ASSET_EXTENSIONS = new Set([".js", ".css", ".svg", ".png", ".jpg", ".ico", ".woff2"]);

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });

const manifest: Record<string, string> = {};
for (const name of readdirSync(source)) {
  if (!ASSET_EXTENSIONS.has(path.extname(name))) continue;
  const bytes = readFileSync(path.join(source, name));
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  const dir = path.join(target, "assets", hash);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, name), bytes);
  manifest[`/${name}`] = `${hash}/${name}`;
}
writeFileSync(path.join(target, "asset-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`[build] ${Object.keys(manifest).length} fingerprinted asset(s) written to dist/public/assets`);
