import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { RequestHandler } from "express";
import express from "express";
import type { AppConfig } from "../config.js";

export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

/**
 * Serves the HTML pages with their asset references rewritten to the fingerprinted
 * copies (from the CDN when Spaces is configured, from this instance otherwise) and
 * with a validator, so a reload costs nothing when nothing changed.
 */
export function createAssetServing(publicDir: string, config: Pick<AppConfig, "spaces">) {
  const manifestPath = path.join(publicDir, "asset-manifest.json");
  const manifest: Record<string, string> = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
  const cdn = config.spaces ? `${config.spaces.cdnUrl.replace(/\/$/, "")}/assets` : "/assets";
  const pages = new Map<string, { html: string; etag: string }>();

  function assetUrl(reference: string): string {
    const fingerprinted = manifest[reference];
    return fingerprinted ? `${cdn}/${fingerprinted}` : reference;
  }

  function render(name: string): { html: string; etag: string } {
    const cached = pages.get(name);
    if (cached) return cached;
    const raw = readFileSync(path.join(publicDir, name), "utf8");
    const html = raw.replace(/(href|src)="(\/[\w.-]+\.(?:js|css|svg|png|jpg|ico|woff2))"/g, (_m, attr, ref) => `${attr}="${assetUrl(ref)}"`);
    const rendered = { html, etag: `"${createHash("sha256").update(html).digest("hex").slice(0, 32)}"` };
    pages.set(name, rendered);
    return rendered;
  }

  const sendPage = (name: string, status = 200, cacheControl = "no-cache"): RequestHandler => (req, res) => {
    const { html, etag } = render(name);
    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", cacheControl);
    if (status === 200 && req.headers["if-none-match"] === etag) {
      res.status(304).end();
      return;
    }
    res.status(status).type("html").send(html);
  };

  const fingerprinted: RequestHandler = express.static(path.join(publicDir, "assets"), {
    index: false,
    immutable: true,
    maxAge: "365d",
    setHeaders: (res) => res.setHeader("Cache-Control", IMMUTABLE_CACHE)
  });

  return { sendPage, fingerprinted, assetUrl, assetsBaseUrl: config.spaces ? cdn : "" };
}
