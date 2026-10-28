/**
 * Uploads the fingerprinted assets of dist/public/assets to the Spaces bucket
 * with a one-year immutable cache policy. Skipped when ENV_SPACES_BUCKET is unset,
 * in which case the server serves them itself with the same headers.
 * Usage: npx tsx devScripts/publish-assets.ts   (after `npm run build`)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadConfig } from "../src/config.js";
import { createSpacesStore } from "../src/trending/publish.js";

const CONTENT_TYPES: Record<string, string> = {
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

async function main(): Promise<void> {
  const config = loadConfig();
  if (!config.spaces) {
    console.log("[assets] ENV_SPACES_BUCKET is unset; the server serves dist/public itself");
    return;
  }
  const publicDir = path.resolve("dist/public");
  const manifest = JSON.parse(readFileSync(path.join(publicDir, "asset-manifest.json"), "utf8")) as Record<string, string>;
  const store = createSpacesStore(config.spaces);
  for (const relative of Object.values(manifest)) {
    const body = readFileSync(path.join(publicDir, "assets", relative));
    await store.put(`assets/${relative}`, body, {
      contentType: CONTENT_TYPES[path.extname(relative)] ?? "application/octet-stream",
      cacheControl: "public, max-age=31536000, immutable"
    });
    console.log(`[assets] published assets/${relative}`);
  }
}

main().catch((err) => {
  console.error("[assets] failed:", err);
  process.exit(1);
});
